import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Rarity } from '../engine'
import { AppError, isConflict, toAppError } from './errors'
import { useCurrentHousehold } from './household'
import { newId } from './ids'
import { queryKeys } from './keys'
import { pb } from './pb'

export type Item = {
  id: string
  household: string
  setKey: string
  groupKey: string
  name: string
  rarity: Rarity
  tags: string[]
  attrs: unknown
  seedKey: string
  deleted: boolean
  /** Tên file ảnh đã upload, rỗng nếu chưa có. */
  imageFile: string
  collectionId: string
  updated: string
}

type ItemRecord = Omit<Item, 'imageFile'> & { image: string }

function toItem(r: ItemRecord): Item {
  return {
    id: r.id,
    household: r.household,
    setKey: r.setKey,
    groupKey: r.groupKey,
    name: r.name,
    rarity: r.rarity,
    tags: Array.isArray(r.tags) ? r.tags : [],
    attrs: r.attrs,
    seedKey: r.seedKey ?? '',
    deleted: !!r.deleted,
    imageFile: r.image ?? '',
    collectionId: r.collectionId,
    updated: r.updated,
  }
}

/** Phần của Bộ mà lớp data cần để nạp seed (feature truyền SetDefinition vào). */
export type SeedSource = {
  setKey: string
  seed: readonly {
    seedKey: string
    groupKey: string
    name: string
    rarity: Rarity
    tags: readonly string[]
    attrs: unknown
  }[]
}

const SEED_CONCURRENCY = 6

async function mapLimit<T>(list: readonly T[], limit: number, fn: (x: T) => Promise<void>) {
  let next = 0
  const worker = async () => {
    while (next < list.length) await fn(list[next++])
  }
  await Promise.all(Array.from({ length: Math.min(limit, list.length) }, worker))
}

/**
 * Nạp các món seed mà household chưa có bản ghi nào (kể cả đã xoá mềm).
 * Nhờ vậy lần nạp bị ngắt giữa chừng sẽ được nạp tiếp, còn món người dùng đã xoá thì không quay lại.
 * Trùng seedKey (máy khác nạp trước) thì bỏ qua êm; trùng ID (hiếm) thì sinh ID mới.
 */
export async function seedSet(
  householdId: string,
  { setKey, seed }: SeedSource,
  existingSeedKeys: ReadonlySet<string> = new Set(),
) {
  const missing = seed.filter((d) => !existingSeedKeys.has(d.seedKey))
  let failed = false
  await mapLimit(missing, SEED_CONCURRENCY, async (d) => {
    // Một món lỗi thì dừng các món còn lại, để lần thử lại không chồng lên
    if (failed) return
    for (let attempt = 0; ; attempt++) {
      try {
        await pb.collection('items').create({
          id: newId(),
          household: householdId,
          setKey,
          groupKey: d.groupKey,
          name: d.name,
          rarity: d.rarity,
          tags: d.tags,
          attrs: d.attrs,
          seedKey: d.seedKey,
          deleted: false,
        })
        return
      } catch (err) {
        if (isConflict(err, 'seedKey')) return
        if (isConflict(err, 'id') && attempt < 2) continue
        failed = true
        throw err
      }
    }
  })
}

async function fetchAll(householdId: string, setKey: string): Promise<Item[]> {
  const records = await pb.collection('items').getFullList<ItemRecord>({
    filter: pb.filter('household = {:h} && setKey = {:s}', { h: householdId, s: setKey }),
    sort: '-updated',
    batch: 500,
  })
  return records.map(toItem)
}

export type ItemsResult = {
  data: Item[] | undefined
  error: AppError | null
  isPending: boolean
  isError: boolean
  /** Thử lại đúng bước bị lỗi (household hoặc danh sách món). */
  refetch: () => Promise<unknown>
}

/** Món đang dùng (`deleted=false`) của Bộ, mới sửa trước. Món seed chưa có bản ghi thì nạp. */
export function useItems(set: SeedSource): ItemsResult {
  const { setKey } = set
  const household = useCurrentHousehold()
  const householdId = household.data?.id
  const query = useQuery<Item[], AppError>({
    queryKey: queryKeys.items(householdId ?? '', setKey),
    enabled: !!householdId,
    queryFn: async () => {
      if (!householdId) throw new AppError('no-household')
      try {
        let all = await fetchAll(householdId, setKey)
        const existing = new Set(all.map((item) => item.seedKey).filter(Boolean))
        if (set.seed.some((d) => !existing.has(d.seedKey))) {
          await seedSet(householdId, set, existing)
          all = await fetchAll(householdId, setKey)
        }
        return all.filter((item) => !item.deleted)
      } catch (err) {
        throw toAppError(err)
      }
    },
  })

  // Chưa có household: lỗi (nếu có) và nút thử lại thuộc về bước household
  if (!householdId) {
    return {
      data: undefined,
      error: household.error,
      isPending: !household.error,
      isError: !!household.error,
      refetch: () => household.refetch(),
    }
  }
  return {
    data: query.data,
    error: query.error,
    isPending: query.isPending,
    isError: query.isError,
    refetch: () => query.refetch(),
  }
}

/** Nguồn ảnh theo thứ tự ưu tiên (AD-9): thumb ảnh upload → ảnh seed tĩnh. */
export function itemImageSources(item: Item, fileToken?: string, size: 'thumb' | 'full' = 'thumb'): string[] {
  const sources: string[] = []
  if (item.imageFile) {
    sources.push(
      pb.files.getURL({ id: item.id, collectionId: item.collectionId }, item.imageFile, {
        thumb: size === 'thumb' ? '400x300' : undefined,
        token: fileToken,
      }),
    )
  }
  if (item.seedKey) sources.push(`/seed/${item.seedKey}.webp`)
  return sources
}

export type NewItemInput = {
  /** ID sinh một lần khi mở form; thử lại dùng lại (AD-4). */
  id: string
  groupKey: string
  name: string
  rarity: Rarity
  tags: string[]
  attrs: unknown
  /** Ảnh đã xử lý (cắt 4:3, nén) — gửi multipart. */
  image?: File | null
}

/** Tạo món mới của Bộ. Trùng ID (lần gửi trước đã tới server) coi là thành công. */
export function useCreateItem(setKey: string) {
  const household = useCurrentHousehold()
  const queryClient = useQueryClient()
  const householdId = household.data?.id
  const mutation = useMutation<void, AppError, NewItemInput>({
    mutationFn: async (input) => {
      if (!householdId) throw new AppError('no-household')
      const fields = {
        groupKey: input.groupKey,
        name: input.name.trim(),
        rarity: input.rarity,
        tags: input.tags,
        attrs: input.attrs,
        // SDK tự gửi multipart khi có File
        ...(input.image ? { image: input.image } : {}),
      }
      try {
        await pb.collection('items').create({ ...fields, id: input.id, household: householdId, setKey, seedKey: '', deleted: false })
      } catch (err) {
        if (!isConflict(err, 'id')) throw toAppError(err)
        // Lần gửi trước đã tới server (mất phản hồi) mà người dùng sửa thêm rồi thử lại:
        // cập nhật bản ghi đó để giữ đúng nội dung mới nhất
        try {
          // Bỏ ảnh sau lần gửi trước: xoá ảnh đã lên server (image = null)
          await pb.collection('items').update(input.id, { ...fields, image: input.image ?? null })
        } catch (updateErr) {
          throw toAppError(updateErr)
        }
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.items(householdId ?? '', setKey) }),
  })
  // Chưa biết household thì chưa lưu được (đang tải, không phải lỗi)
  return Object.assign(mutation, { ready: !!householdId })
}

export type UpdateItemInput = {
  id: string
  groupKey: string
  name: string
  rarity: Rarity
  tags: string[]
  /** undefined: giữ nguyên công thức đang lưu. */
  attrs?: unknown
  /** File: thay ảnh; null: bỏ ảnh; undefined: giữ nguyên. */
  image?: File | null
}

/** Sửa món (không đổi Bộ, seedKey, household — rule cũng chặn). */
export function useUpdateItem(setKey: string) {
  const household = useCurrentHousehold()
  const queryClient = useQueryClient()
  const householdId = household.data?.id
  const mutation = useMutation<void, AppError, UpdateItemInput>({
    mutationFn: async ({ id, image, ...rest }) => {
      try {
        await pb.collection('items').update(id, {
          groupKey: rest.groupKey,
          name: rest.name.trim(),
          rarity: rest.rarity,
          tags: rest.tags,
          ...(rest.attrs !== undefined ? { attrs: rest.attrs } : {}),
          ...(image !== undefined ? { image } : {}),
        })
      } catch (err) {
        throw toAppError(err)
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.items(householdId ?? '', setKey) }),
  })
  return Object.assign(mutation, { ready: !!householdId })
}

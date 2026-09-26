import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Rarity, RecentDraw } from '../engine'
import { ClientResponseError } from 'pocketbase'
import { AppError, isConflict, toAppError } from './errors'
import { useCurrentHousehold } from './household'
import { queryKeys } from './keys'
import { pb } from './pb'

export type DrawEntry = {
  itemId: string
  groupKey: string
  name: string
  rarity: Rarity
  order: number
}

export type Draw = RecentDraw & {
  id: string
  entries: DrawEntry[]
}

const DAY_MS = 86_400_000

/** PocketBase trả ngày dạng "2026-09-26 10:11:12.345Z"; Safari không parse được dấu cách. */
export function toIsoDate(pbDate: string): string {
  return pbDate.includes('T') ? pbDate : pbDate.replace(' ', 'T')
}

type DrawRecord = { id: string; chosenAt: string; entries: DrawEntry[] }

function toDraw(r: DrawRecord): Draw {
  const entries = Array.isArray(r.entries)
    ? r.entries
        .filter((e) => e && typeof e.itemId === 'string')
        .map((e, i) => ({
          ...e,
          name: typeof e.name === 'string' ? e.name : '',
          order: typeof e.order === 'number' && Number.isFinite(e.order) ? e.order : i,
        }))
    : []
  return { id: r.id, chosenAt: toIsoDate(r.chosenAt), entries }
}

/**
 * Draw của Bộ trong cửa sổ tránh trùng. Lấy rộng `cooldownDays + 1` ngày theo giờ thật,
 * engine lọc chính xác theo ngày lịch giờ máy.
 */
export function useRecentDraws(setKey: string, cooldownDays: number) {
  const household = useCurrentHousehold()
  const householdId = household.data?.id
  return useQuery<Draw[], AppError>({
    queryKey: [...queryKeys.draws(householdId ?? '', setKey), 'recent', cooldownDays],
    enabled: !!householdId && cooldownDays > 0,
    queryFn: async () => {
      try {
        const since = new Date(Date.now() - (cooldownDays + 1) * DAY_MS)
        const records = await pb.collection('draws').getFullList<DrawRecord>({
          filter: pb.filter('household = {:h} && setKey = {:s} && chosenAt >= {:since}', {
            h: householdId,
            s: setKey,
            since,
          }),
          sort: '-chosenAt',
          batch: 200,
        })
        return records.map(toDraw)
      } catch (err) {
        throw toAppError(err)
      }
    },
  })
}

const HISTORY_PAGE_SIZE = 20

/** Lịch sử mâm đã chốt của Bộ, mới nhất trước, tải từng trang. */
export function useDrawHistory(setKey: string) {
  const household = useCurrentHousehold()
  const householdId = household.data?.id
  return useInfiniteQuery({
    queryKey: [...queryKeys.draws(householdId ?? '', setKey), 'history'],
    enabled: !!householdId,
    initialPageParam: 1,
    queryFn: async ({ pageParam }): Promise<{ items: Draw[]; page: number; totalPages: number }> => {
      try {
        const list = await pb.collection('draws').getList<DrawRecord>(pageParam, HISTORY_PAGE_SIZE, {
          filter: pb.filter('household = {:h} && setKey = {:s}', { h: householdId, s: setKey }),
          sort: '-chosenAt,-created',
        })
        return { items: list.items.map(toDraw), page: list.page, totalPages: list.totalPages }
      } catch (err) {
        throw toAppError(err)
      }
    },
    getNextPageParam: (last) => (last.page < last.totalPages ? last.page + 1 : undefined),
  })
}

/** Đã từng chốt mâm nào của Bộ chưa (để ẩn gợi ý lần đầu). */
export function useHasDraws(setKey: string) {
  const household = useCurrentHousehold()
  const householdId = household.data?.id
  return useQuery<boolean, AppError>({
    queryKey: [...queryKeys.draws(householdId ?? '', setKey), 'any'],
    enabled: !!householdId,
    queryFn: async () => {
      try {
        const list = await pb.collection('draws').getList(1, 1, {
          filter: pb.filter('household = {:h} && setKey = {:s}', { h: householdId, s: setKey }),
          skipTotal: true,
          fields: 'id',
        })
        return list.items.length > 0
      } catch (err) {
        throw toAppError(err)
      }
    },
  })
}

export type CommitInput = {
  /** ID do client sinh một lần; thử lại phải dùng lại đúng ID này (AD-4). */
  id: string
  entries: DrawEntry[]
  /**
   * Lần chốt trước (ID khác) lỗi mà không rõ đã tới server chưa, rồi mâm bị đổi:
   * xoá bản ghi đó (nếu có) để không thành hai mâm.
   */
  replaceId?: string | null
}

/** Chốt mâm: tạo đúng một draw. Trùng ID (lần gửi trước đã tới server) coi là thành công. */
export function useCommitTray(setKey: string, onCommitted?: () => void) {
  const household = useCurrentHousehold()
  const queryClient = useQueryClient()
  const householdId = household.data?.id
  return useMutation<void, AppError, CommitInput>({
    mutationFn: async ({ id, entries, replaceId }) => {
      if (!householdId) throw new AppError('no-household')
      try {
        if (replaceId && replaceId !== id) {
          try {
            await pb.collection('draws').delete(replaceId)
          } catch (err) {
            // 404: lần trước chưa tới server — không có gì để xoá
            if (!(err instanceof ClientResponseError && err.status === 404)) throw err
          }
        }
        await pb.collection('draws').create({
          id,
          household: householdId,
          setKey,
          chosenAt: new Date().toISOString(),
          entries,
        })
      } catch (err) {
        if (isConflict(err, 'id')) return
        throw toAppError(err)
      }
    },
    // Callback ở cấp hook (không phải cấp lần gọi) nên vẫn chạy khi màn đã rời đi
    onSuccess: (_data, { id, entries }) => {
      const key = queryKeys.draws(householdId ?? '', setKey)
      // Cập nhật ngay cache để luật tránh trùng có hiệu lực kể cả khi tải lại lỗi
      const draw: Draw = { id, chosenAt: new Date().toISOString(), entries }
      queryClient.setQueriesData<Draw[]>({ queryKey: [...key, 'recent'] }, (old) =>
        old ? [draw, ...old.filter((d) => d.id !== id)] : old,
      )
      queryClient.setQueryData([...key, 'any'], true)
      void queryClient.invalidateQueries({ queryKey: key })
      onCommitted?.()
    },
  })
}

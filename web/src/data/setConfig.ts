import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AppError, isConflict, toAppError } from './errors'
import { useCurrentHousehold } from './household'
import { newId } from './ids'
import { queryKeys } from './keys'
import { pb } from './pb'

type ConfigRecord = { id: string; cooldownDays: number }

async function findConfig(householdId: string, setKey: string): Promise<ConfigRecord | null> {
  const list = await pb.collection('set_configs').getList<ConfigRecord>(1, 1, {
    filter: pb.filter('household = {:h} && setKey = {:s}', { h: householdId, s: setKey }),
  })
  return list.items[0] ?? null
}

/** Cấu hình của household cho Bộ (null = chưa có, dùng mặc định của Bộ). */
export function useSetConfig(setKey: string) {
  const household = useCurrentHousehold()
  const householdId = household.data?.id
  return useQuery<{ cooldownDays: number | null }, AppError>({
    queryKey: queryKeys.setConfig(householdId ?? '', setKey),
    enabled: !!householdId,
    queryFn: async () => {
      try {
        const rec = await findConfig(householdId!, setKey)
        return { cooldownDays: rec && typeof rec.cooldownDays === 'number' ? rec.cooldownDays : null }
      } catch (err) {
        throw toAppError(err)
      }
    },
  })
}

/** Lưu số ngày tránh trùng (upsert theo household + Bộ). */
export function useSaveCooldown(setKey: string) {
  const household = useCurrentHousehold()
  const queryClient = useQueryClient()
  const householdId = household.data?.id
  const mutation = useMutation<void, AppError, number>({
    mutationFn: async (days) => {
      if (!householdId) throw new AppError('no-household')
      try {
        const existing = await findConfig(householdId, setKey)
        if (existing) {
          await pb.collection('set_configs').update(existing.id, { cooldownDays: days })
          return
        }
        try {
          await pb.collection('set_configs').create({ id: newId(), household: householdId, setKey, cooldownDays: days })
        } catch (err) {
          if (!isConflict(err)) throw err
          // Máy khác vừa tạo: cập nhật bản đó
          const now = await findConfig(householdId, setKey)
          if (!now) throw err
          await pb.collection('set_configs').update(now.id, { cooldownDays: days })
        }
      } catch (err) {
        throw toAppError(err)
      }
    },
    onSuccess: (_d, days) => {
      queryClient.setQueryData(queryKeys.setConfig(householdId ?? '', setKey), { cooldownDays: days })
      // Cửa sổ tránh trùng đổi: lấy lại mâm gần đây
      void queryClient.invalidateQueries({ queryKey: queryKeys.draws(householdId ?? '', setKey) })
    },
  })
  return Object.assign(mutation, { ready: !!householdId })
}

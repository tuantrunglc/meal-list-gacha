import { useQuery } from '@tanstack/react-query'
import { ClientResponseError } from 'pocketbase'
import { useAuth } from './auth'
import { AppError, toAppError } from './errors'
import { queryKeys } from './keys'
import { pb } from './pb'

export type Household = {
  id: string
  name: string
}

/** Household của người đang đăng nhập (v1: mỗi người một household). */
export function useCurrentHousehold() {
  const { isAuthenticated, userId } = useAuth()
  return useQuery<Household, AppError>({
    queryKey: [...queryKeys.household(), userId],
    enabled: isAuthenticated,
    queryFn: async () => {
      try {
        // API rule chỉ trả household mà mình là thành viên
        const record = await pb.collection('households').getFirstListItem('', { sort: 'created' })
        return { id: record.id, name: record.name as string }
      } catch (err) {
        // getFirstListItem trả 404 khi không có household nào mình là thành viên
        if (err instanceof ClientResponseError && err.status === 404) throw new AppError('no-household', err)
        throw toAppError(err)
      }
    },
  })
}

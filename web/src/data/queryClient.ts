import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query'
import { AppError } from './errors'
import { pb } from './pb'

// Server báo hết phiên ở bất kỳ query/mutation nào thì đăng xuất luôn (AppGate hiện màn đăng nhập).
function onError(err: unknown) {
  if (err instanceof AppError && err.code === 'unauthorized' && pb.authStore.token) pb.authStore.clear()
}

// Online-only (AD-6): cache chỉ trong bộ nhớ, không persist.
export const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError }),
  mutationCache: new MutationCache({ onError }),
  defaultOptions: {
    queries: {
      // Lỗi quyền truy cập thì thử lại cũng vô ích
      retry: (count, err) => !(err instanceof AppError && err.code === 'unauthorized') && count < 2,
    },
  },
})

// Đăng xuất (tự tay hay do hết phiên) thì bỏ hết dữ liệu của phiên cũ
pb.authStore.onChange((token) => {
  if (!token) queryClient.clear()
})

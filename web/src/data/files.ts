import { useQuery } from '@tanstack/react-query'
import { getTokenPayload } from 'pocketbase'
import { useCallback } from 'react'
import { useAuth } from './auth'
import { itemImageSources, type Item } from './items'
import { queryKeys } from './keys'
import { pb } from './pb'

const MIN_REFRESH_MS = 60_000
// Làm mới trước khi hết hạn một khoảng, để ảnh vừa hiện không bị 403
const EARLY_MS = 5 * 60_000

/** Còn bao lâu nên làm mới token (theo `exp` trong token). */
export function refreshDelay(token: string | undefined, nowMs = Date.now()): number {
  if (!token) return MIN_REFRESH_MS
  const exp = getTokenPayload(token).exp
  if (typeof exp !== 'number') return MIN_REFRESH_MS
  return Math.max(MIN_REFRESH_MS, exp * 1000 - nowMs - EARLY_MS)
}

/**
 * Token để xem ảnh `protected` (mọi dữ liệu sau đăng nhập, NFR4). Server cấp token 12 giờ;
 * chỉ lấy lại khi gần hết hạn để URL ảnh (chứa token) không đổi, trình duyệt dùng lại cache.
 */
export function useFileToken() {
  const { isAuthenticated, userId } = useAuth()
  return useQuery<string>({
    queryKey: [...queryKeys.fileToken(), userId],
    enabled: isAuthenticated,
    queryFn: () => pb.files.getToken(),
    staleTime: (q) => refreshDelay(q.state.data),
    refetchInterval: (q) => refreshDelay(q.state.data),
    refetchOnWindowFocus: false,
    // ảnh chỉ là phụ: lỗi thì dùng ảnh seed/đĩa trống, không làm phiền
    retry: 1,
  })
}

/**
 * Hàm lấy nguồn ảnh của món (thumb cho lưới/mâm, full cho chi tiết).
 * Chưa có token thì bỏ ảnh upload (sẽ bị 403), chỉ dùng ảnh seed/đĩa trống.
 */
export function useItemImages() {
  const token = useFileToken().data
  return useCallback(
    (item: Item, size: 'thumb' | 'full' = 'thumb') =>
      token ? itemImageSources(item, token, size) : itemImageSources({ ...item, imageFile: '' }, undefined, size),
    [token],
  )
}

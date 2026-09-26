import { useMutation } from '@tanstack/react-query'
import { ClientResponseError, getTokenPayload } from 'pocketbase'
import { useSyncExternalStore } from 'react'
import { toAppError, type AppError } from './errors'
import { pb } from './pb'
import { queryClient } from './queryClient'

export type AuthState = {
  isAuthenticated: boolean
  userId: string | null
}

let snapshot: AuthState = readState()

function readState(): AuthState {
  return { isAuthenticated: pb.authStore.isValid, userId: pb.authStore.record?.id ?? null }
}

function subscribe(onChange: () => void) {
  return pb.authStore.onChange(() => {
    snapshot = readState()
    onChange()
  })
}

function getSnapshot() {
  // Token hết hạn trong lúc app mở thì phản ánh ngay ở lần render kế tiếp
  if (snapshot.isAuthenticated !== pb.authStore.isValid) snapshot = readState()
  return snapshot
}

export function useAuth(): AuthState {
  return useSyncExternalStore(subscribe, getSnapshot)
}

export function useLogin() {
  return useMutation<void, AppError, { email: string; password: string }>({
    mutationFn: async ({ email, password }) => {
      try {
        await pb.collection('users').authWithPassword(email.trim(), password)
      } catch (err) {
        throw toAppError(err, 'auth')
      }
    },
    onSuccess: () => queryClient.clear(),
  })
}

// Tăng mỗi lần đăng xuất: refresh đang bay mà gặp đăng xuất thì không được đăng nhập lại
let logoutEpoch = 0

export function logout() {
  logoutEpoch++
  pb.authStore.clear()
}

export function useLogout() {
  return logout
}

const ONE_DAY_SECONDS = 86_400

/** Token còn dưới 1 ngày (hoặc không đọc được hạn) thì nên làm mới. */
export function shouldRefresh(token: string, nowSeconds = Date.now() / 1000): boolean {
  const exp = getTokenPayload(token).exp
  return typeof exp !== 'number' || exp - nowSeconds < ONE_DAY_SECONDS
}

/**
 * Làm mới token. Server từ chối (401/403/404) thì đăng xuất;
 * mất mạng hay lỗi server thì giữ phiên để thử lại sau.
 */
export async function refreshSession(force = false): Promise<void> {
  if (!pb.authStore.isValid) {
    // Token đã hết hạn mà vẫn nằm trong store: xoá để UI về màn đăng nhập
    if (pb.authStore.token) pb.authStore.clear()
    return
  }
  if (!force && !shouldRefresh(pb.authStore.token)) return
  const epoch = logoutEpoch
  try {
    await pb.collection('users').authRefresh()
    if (epoch !== logoutEpoch) pb.authStore.clear()
  } catch (err) {
    // 404: tài khoản không còn
    if (err instanceof ClientResponseError && [401, 403, 404].includes(err.status)) {
      pb.authStore.clear()
    }
  }
}

import { ClientResponseError } from 'pocketbase'

export type AppErrorCode = 'invalid-credentials' | 'network' | 'unauthorized' | 'conflict' | 'server'

// Lời nhắn theo giọng Nồi Thần; UI hiện `message`, không bao giờ hiện lỗi thô của PocketBase.
const messages: Record<AppErrorCode, string> = {
  'invalid-credentials': 'Sai email hoặc mật khẩu rồi, thử lại nhé.',
  network: 'Mất mạng rồi, kiểm tra wifi rồi thử lại nhé.',
  unauthorized: 'Phiên đăng nhập hết hạn rồi, đăng nhập lại nhé.',
  conflict: 'Cái này có rồi nè.',
  server: 'Nồi đang trục trặc chút xíu, thử lại sau nhé.',
}

export class AppError extends Error {
  readonly code: AppErrorCode

  constructor(code: AppErrorCode, cause?: unknown) {
    super(messages[code], { cause })
    this.name = 'AppError'
    this.code = code
  }
}

type Context = 'auth' | 'default'

/** Chuyển mọi lỗi từ SDK/fetch thành `AppError`. */
export function toAppError(err: unknown, context: Context = 'default'): AppError {
  if (err instanceof AppError) return err
  if (err instanceof ClientResponseError) {
    if (err.status === 0) return new AppError('network', err)
    if (context === 'auth' && err.status === 400) return new AppError('invalid-credentials', err)
    if (err.status === 401 || err.status === 403) return new AppError('unauthorized', err)
    return new AppError('server', err)
  }
  if (err instanceof TypeError) return new AppError('network', err)
  return new AppError('server', err)
}

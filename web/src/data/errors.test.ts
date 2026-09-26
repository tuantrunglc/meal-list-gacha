import { ClientResponseError } from 'pocketbase'
import { describe, expect, it } from 'vitest'
import { AppError, toAppError } from './errors'

function pbError(status: number) {
  return new ClientResponseError({ status, response: { message: 'raw pocketbase message' } })
}

describe('toAppError', () => {
  it('mất mạng', () => {
    expect(toAppError(pbError(0)).code).toBe('network')
    expect(toAppError(new TypeError('Failed to fetch')).code).toBe('network')
  })

  it('sai thông tin đăng nhập chỉ trong ngữ cảnh auth', () => {
    expect(toAppError(pbError(400), 'auth').code).toBe('invalid-credentials')
    expect(toAppError(pbError(400)).code).toBe('server')
  })

  it('401/403 là hết phiên, còn lại là lỗi server', () => {
    expect(toAppError(pbError(401)).code).toBe('unauthorized')
    expect(toAppError(pbError(403)).code).toBe('unauthorized')
    expect(toAppError(pbError(500)).code).toBe('server')
    expect(toAppError(new Error('x')).code).toBe('server')
  })

  it('không lộ lỗi thô, giữ nguyên AppError', () => {
    const e = toAppError(pbError(400), 'auth')
    expect(e.message).not.toContain('raw pocketbase')
    expect(e.message).toBe('Sai email hoặc mật khẩu rồi, thử lại nhé.')
    expect(toAppError(e)).toBe(e)
    expect(e).toBeInstanceOf(AppError)
  })
})

import { ClientResponseError } from 'pocketbase'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { logout, refreshSession, shouldRefresh } from './auth'
import { pb } from './pb'

const token = (exp: number) => `x.${btoa(JSON.stringify({ exp }))}.y`
const nowSec = () => Math.floor(Date.now() / 1000)
const record = { id: 'u1', collectionId: 'c', collectionName: 'users' }
const pbError = (status: number) => new ClientResponseError({ status, response: {} })

describe('refreshSession', () => {
  let authRefresh: ReturnType<typeof vi.fn>

  beforeEach(() => {
    pb.authStore.save(token(nowSec() + 3600), record)
    authRefresh = vi.fn()
    vi.spyOn(pb, 'collection').mockReturnValue({ authRefresh } as unknown as ReturnType<typeof pb.collection>)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    pb.authStore.clear()
  })

  it.each([401, 403, 404])('server trả %i thì đăng xuất', async (status) => {
    authRefresh.mockRejectedValue(pbError(status))
    await refreshSession(true)
    expect(pb.authStore.isValid).toBe(false)
  })

  it.each([
    ['mất mạng (status 0)', pbError(0)],
    ['lỗi server 500', pbError(500)],
    ['TypeError fetch', new TypeError('Failed to fetch')],
  ])('%s thì giữ phiên', async (_, err) => {
    authRefresh.mockRejectedValue(err)
    await refreshSession(true)
    expect(pb.authStore.isValid).toBe(true)
  })

  it('token còn hơn 1 ngày và không ép thì không gọi server', async () => {
    pb.authStore.save(token(nowSec() + 3 * 86400), record)
    await refreshSession()
    expect(authRefresh).not.toHaveBeenCalled()
  })

  it('token còn dưới 1 ngày thì làm mới', async () => {
    authRefresh.mockResolvedValue({})
    await refreshSession()
    expect(authRefresh).toHaveBeenCalledOnce()
  })

  it('token hết hạn nằm trong store thì xoá, không gọi server', async () => {
    pb.authStore.save(token(nowSec() - 10), record)
    await refreshSession(true)
    expect(pb.authStore.token).toBe('')
    expect(authRefresh).not.toHaveBeenCalled()
  })

  it('đăng xuất trong lúc đang làm mới thì không bị đăng nhập lại', async () => {
    authRefresh.mockImplementation(async () => {
      logout()
      // SDK lưu token mới khi làm mới thành công
      pb.authStore.save(token(nowSec() + 7 * 86400), record)
      return {}
    })
    await refreshSession(true)
    expect(pb.authStore.isValid).toBe(false)
  })
})

describe('shouldRefresh', () => {
  it('còn hơn 1 ngày thì chưa cần, dưới 1 ngày thì cần', () => {
    expect(shouldRefresh(token(1000 + 3 * 86400), 1000)).toBe(false)
    expect(shouldRefresh(token(1000 + 3600), 1000)).toBe(true)
  })

  it('không đọc được hạn thì làm mới', () => {
    expect(shouldRefresh(`x.${btoa(JSON.stringify({}))}.y`, 1000)).toBe(true)
  })
})

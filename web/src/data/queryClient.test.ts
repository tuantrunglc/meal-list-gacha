import { afterEach, describe, expect, it } from 'vitest'
import { AppError } from './errors'
import { pb } from './pb'
import { queryClient } from './queryClient'

const token = `x.${btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 86400 }))}.y`

describe('queryClient', () => {
  afterEach(() => {
    pb.authStore.clear()
    queryClient.clear()
  })

  it('query gặp lỗi hết phiên thì đăng xuất và bỏ cache', async () => {
    pb.authStore.save(token, { id: 'u1', collectionId: 'c', collectionName: 'users' })
    queryClient.setQueryData(['cu'], 1)
    await queryClient
      .fetchQuery({ queryKey: ['x'], queryFn: () => Promise.reject(new AppError('unauthorized')), retry: false })
      .catch(() => {})
    expect(pb.authStore.isValid).toBe(false)
    expect(queryClient.getQueryData(['cu'])).toBeUndefined()
  })

  it('lỗi khác không đăng xuất', async () => {
    pb.authStore.save(token, { id: 'u1', collectionId: 'c', collectionName: 'users' })
    await queryClient
      .fetchQuery({ queryKey: ['y'], queryFn: () => Promise.reject(new AppError('network')), retry: false })
      .catch(() => {})
    expect(pb.authStore.isValid).toBe(true)
  })
})

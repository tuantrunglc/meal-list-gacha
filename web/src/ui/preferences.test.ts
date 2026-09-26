import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useSoundEnabled } from './preferences'

afterEach(() => {
  vi.restoreAllMocks()
  window.localStorage.clear()
})

describe('useSoundEnabled', () => {
  it('mặc định tắt; bật thì lưu vào localStorage và mọi nơi dùng đều thấy', () => {
    const a = renderHook(() => useSoundEnabled())
    const b = renderHook(() => useSoundEnabled())
    expect(a.result.current[0]).toBe(false)
    act(() => a.result.current[1](true))
    expect(window.localStorage.getItem('noi-than:sound')).toBe('on')
    expect(a.result.current[0]).toBe(true)
    expect(b.result.current[0]).toBe(true)
    act(() => a.result.current[1](false))
    expect(b.result.current[0]).toBe(false)
  })

  it('tab khác đổi thì cập nhật theo (storage event)', () => {
    const { result } = renderHook(() => useSoundEnabled())
    act(() => {
      window.localStorage.setItem('noi-than:sound', 'on')
      window.dispatchEvent(new StorageEvent('storage', { key: 'noi-than:sound', newValue: 'on' }))
    })
    expect(result.current[0]).toBe(true)
  })

  it('localStorage bị chặn: không lỗi, vẫn bật/tắt được trong phiên', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    const { result } = renderHook(() => useSoundEnabled())
    expect(result.current[0]).toBe(false)
    act(() => result.current[1](true))
    expect(result.current[0]).toBe(true)
    act(() => result.current[1](false))
    expect(result.current[0]).toBe(false)
  })
})

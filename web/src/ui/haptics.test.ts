import { afterEach, describe, expect, it, vi } from 'vitest'
import { vibrateRarity } from './haptics'

afterEach(() => vi.unstubAllGlobals())

describe('vibrateRarity', () => {
  it('rung nhẹ / vừa / mạnh 2 nhịp theo bậc', () => {
    const vibrate = vi.fn(() => true)
    vi.stubGlobal('navigator', { vibrate })
    vibrateRarity(1)
    vibrateRarity(2)
    vibrateRarity(3)
    expect(vibrate.mock.calls).toEqual([[15], [35], [[60, 80, 60]]])
  })

  it('không có navigator.vibrate (iPhone) hoặc bị chặn: bỏ qua, không lỗi', () => {
    vi.stubGlobal('navigator', {})
    expect(() => vibrateRarity(3)).not.toThrow()
    vi.stubGlobal('navigator', {
      vibrate: () => {
        throw new Error('blocked')
      },
    })
    expect(() => vibrateRarity(2)).not.toThrow()
  })
})

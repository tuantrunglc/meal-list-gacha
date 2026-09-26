import { afterEach, describe, expect, it, vi } from 'vitest'
import { rarityFeedback } from './feedback'

const play = vi.hoisted(() => vi.fn())
vi.mock('./sound', () => ({ playRaritySound: play }))

afterEach(() => {
  vi.unstubAllGlobals()
  play.mockClear()
})

describe('rarityFeedback', () => {
  it('luôn rung theo bậc; chỉ phát tiếng khi âm thanh bật', () => {
    const vibrate = vi.fn(() => true)
    vi.stubGlobal('navigator', { vibrate })
    rarityFeedback(3, false)
    expect(vibrate).toHaveBeenCalledWith([60, 80, 60])
    expect(play).not.toHaveBeenCalled()
    rarityFeedback(1, true)
    expect(vibrate).toHaveBeenLastCalledWith(15)
    expect(play).toHaveBeenCalledWith(1)
  })
})

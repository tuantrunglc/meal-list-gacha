import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LATE_MS, playRaritySound, preloadSounds, resetSoundForTest, unlockAudio } from './sound'

type FakeSource = { buffer: unknown; connect: ReturnType<typeof vi.fn>; start: ReturnType<typeof vi.fn> }
let sources: FakeSource[]
let decode: ReturnType<typeof vi.fn>
let resume: ReturnType<typeof vi.fn>
let fetchMock: ReturnType<typeof vi.fn>

let ctxState = 'suspended'
class FakeAudioContext {
  get state() {
    return ctxState
  }
  destination = {}
  resume = resume
  decodeAudioData = decode
  createBufferSource() {
    const s = { buffer: null, connect: vi.fn(), start: vi.fn() }
    sources.push(s)
    return s
  }
}

const flush = () => new Promise((r) => setTimeout(r, 0))

beforeEach(() => {
  resetSoundForTest()
  ctxState = 'suspended'
  sources = []
  decode = vi.fn(async (data: ArrayBuffer) => ({ decoded: data.byteLength }))
  resume = vi.fn(async () => {})
  fetchMock = vi.fn(async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) }))
  vi.stubGlobal('AudioContext', FakeAudioContext)
  vi.stubGlobal('fetch', fetchMock)
})
afterEach(() => vi.unstubAllGlobals())

describe('sound', () => {
  it('chưa unlock (âm thanh tắt / chưa chạm) thì không tải, không phát', async () => {
    playRaritySound(2)
    preloadSounds()
    await flush()
    expect(fetchMock).not.toHaveBeenCalled()
    expect(sources).toHaveLength(0)
  })

  it('unlock: resume AudioContext; phát đúng file theo bậc, tải một lần rồi dùng lại', async () => {
    unlockAudio()
    expect(resume).toHaveBeenCalled()
    playRaritySound(1)
    playRaritySound(1)
    playRaritySound(3)
    await flush()
    await flush()
    const urls = fetchMock.mock.calls.map((c) => c[0] as string)
    expect(urls).toEqual(['/sounds/bup.wav', '/sounds/ting-ting-tinh.wav'])
    expect(sources).toHaveLength(3)
    expect(sources.every((s) => s.start.mock.calls.length === 1)).toBe(true)
  })

  it('preload tải cả 3 file', async () => {
    unlockAudio()
    preloadSounds()
    await flush()
    expect(fetchMock.mock.calls.map((c) => c[0])).toEqual(['/sounds/bup.wav', '/sounds/ting.wav', '/sounds/ting-ting-tinh.wav'])
  })

  it('tải lỗi / decode lỗi: im lặng; lần sau thử tải lại', async () => {
    unlockAudio()
    fetchMock.mockResolvedValueOnce({ ok: false, status: 404, arrayBuffer: async () => new ArrayBuffer(0) })
    playRaritySound(2)
    await flush()
    await flush()
    expect(sources).toHaveLength(0)
    decode.mockRejectedValueOnce(new Error('bad'))
    playRaritySound(2)
    await flush()
    await flush()
    expect(sources).toHaveLength(0)
    playRaritySound(2)
    await flush()
    await flush()
    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(sources).toHaveLength(1)
  })

  it('không có Web Audio: im lặng, không lỗi', async () => {
    vi.stubGlobal('AudioContext', undefined)
    expect(() => unlockAudio()).not.toThrow()
    playRaritySound(3)
    await flush()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("iOS 'interrupted' (sau cuộc gọi / chạy nền): phát lại thì resume", async () => {
    unlockAudio()
    ctxState = 'interrupted'
    resume.mockClear()
    playRaritySound(1)
    expect(resume).toHaveBeenCalled()
    ctxState = 'running'
    resume.mockClear()
    playRaritySound(1)
    expect(resume).not.toHaveBeenCalled()
  })

  it('Safari cũ: decodeAudioData dạng callback (không trả Promise) vẫn phát được', async () => {
    decode.mockImplementation((data: ArrayBuffer, ok: (b: unknown) => void) => {
      ok({ decoded: data.byteLength })
      return undefined
    })
    unlockAudio()
    playRaritySound(2)
    await flush()
    await flush()
    expect(sources).toHaveLength(1)
  })

  it('tải xong quá muộn so với lúc gọi thì không phát (không lệch nhịp)', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    try {
      let finish!: (v: unknown) => void
      fetchMock.mockImplementationOnce(() => new Promise((r) => (finish = r)))
      unlockAudio()
      playRaritySound(3)
      vi.setSystemTime(Date.now() + LATE_MS + 1)
      finish({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) })
      await flush()
      await flush()
      await flush()
      expect(sources).toHaveLength(0)
    } finally {
      vi.useRealTimers()
    }
  })
})

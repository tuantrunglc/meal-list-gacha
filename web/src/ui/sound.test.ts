import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LATE_MS, playPotBoom, playRaritySound, preloadSounds, resetSoundForTest, startPotRumble, unlockAudio } from './sound'

type FakeSource = { buffer: unknown; loop: boolean; gain?: FakeGain; connect: ReturnType<typeof vi.fn>; start: ReturnType<typeof vi.fn>; stop: ReturnType<typeof vi.fn> }
type FakeGain = { gain: { setTargetAtTime: ReturnType<typeof vi.fn> }; connect: ReturnType<typeof vi.fn> }
let sources: FakeSource[]
let gains: FakeGain[]
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
  currentTime = 5
  createGain() {
    const g = { gain: { setTargetAtTime: vi.fn() }, connect: vi.fn() }
    gains.push(g)
    return g
  }
  createBufferSource() {
    const s = { buffer: null, loop: false, connect: vi.fn(), start: vi.fn(), stop: vi.fn() }
    sources.push(s)
    return s
  }
}

const flush = () => new Promise((r) => setTimeout(r, 0))

beforeEach(() => {
  resetSoundForTest()
  ctxState = 'suspended'
  sources = []
  gains = []
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

  it('preload tải cả 5 file, tiếng nồi trước', async () => {
    unlockAudio()
    preloadSounds()
    await flush()
    expect(fetchMock.mock.calls.map((c) => c[0])).toEqual([
      '/sounds/soi.wav',
      '/sounds/bum.wav',
      '/sounds/bup.wav',
      '/sounds/ting.wav',
      '/sounds/ting-ting-tinh.wav',
    ])
  })

  it('nồi rung: phát lặp tới khi dừng; dừng nhiều lần vô hại; "bùm" phát một lần', async () => {
    unlockAudio()
    const stop = startPotRumble()
    await flush()
    await flush()
    expect(sources).toHaveLength(1)
    expect(sources[0].loop).toBe(true)
    expect(sources[0].start).toHaveBeenCalledTimes(1)
    // đi qua GainNode, dừng êm: hạ nhỏ rồi dừng sau đó chút
    expect(sources[0].connect).toHaveBeenCalledWith(gains[0])
    stop()
    stop()
    expect(gains[0].gain.setTargetAtTime).toHaveBeenCalledWith(0, 5, expect.any(Number))
    expect(sources[0].stop).toHaveBeenCalledTimes(1)
    expect(sources[0].stop.mock.calls[0][0]).toBeGreaterThan(5)
    playPotBoom()
    await flush()
    await flush()
    expect(sources).toHaveLength(2)
    expect(sources[1].loop).toBe(false)
    expect(fetchMock.mock.calls.map((c) => c[0])).toEqual(['/sounds/soi.wav', '/sounds/bum.wav'])
  })

  it('nồi rung tải chậm: bắt đầu khi tải xong; đã dừng trước đó thì không phát', async () => {
    let finish!: (v: unknown) => void
    fetchMock.mockImplementationOnce(() => new Promise((r) => (finish = r)))
    unlockAudio()
    const stop = startPotRumble()
    stop()
    finish({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) })
    await flush()
    await flush()
    await flush()
    expect(sources).toHaveLength(0)
    // lần sau: file đã có, phát ngay
    startPotRumble()
    await flush()
    expect(sources).toHaveLength(1)
  })

  it('chưa unlock: nồi rung/bùm im lặng, không tải', async () => {
    expect(() => startPotRumble()()).not.toThrow()
    playPotBoom()
    await flush()
    expect(fetchMock).not.toHaveBeenCalled()
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

  it('nồi rung tải lỗi: im lặng, dừng vô hại', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 404, arrayBuffer: async () => new ArrayBuffer(0) })
    unlockAudio()
    const stop = startPotRumble()
    await flush()
    await flush()
    expect(sources).toHaveLength(0)
    expect(() => stop()).not.toThrow()
  })

  it('phát thử (`late`): vẫn phát dù tải chậm hơn LATE_MS, nhưng quá 3 giây thì bỏ', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    try {
      let finish!: (v: unknown) => void
      fetchMock.mockImplementationOnce(() => new Promise((r) => (finish = r)))
      unlockAudio()
      playRaritySound(3, { late: true })
      vi.setSystemTime(Date.now() + 3001)
      finish({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) })
      await flush()
      await flush()
      await flush()
      expect(sources).toHaveLength(0)
    } finally {
      vi.useRealTimers()
    }
  })

  it('phát thử (`late`): vẫn phát dù tải chậm hơn LATE_MS', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    try {
      let finish!: (v: unknown) => void
      fetchMock.mockImplementationOnce(() => new Promise((r) => (finish = r)))
      unlockAudio()
      playRaritySound(2, { late: true })
      vi.setSystemTime(Date.now() + LATE_MS + 1000)
      finish({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) })
      await flush()
      await flush()
      await flush()
      expect(sources).toHaveLength(1)
    } finally {
      vi.useRealTimers()
    }
  })
})

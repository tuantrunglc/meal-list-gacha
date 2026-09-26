/**
 * Âm thanh mở nồi qua Web Audio. File chỉ được tải khi gọi (âm thanh đang bật) — mặc định không tải gì.
 * Mọi lỗi (không có Web Audio, tải/decode lỗi, bị chặn tự phát) đều im lặng.
 */
type Rarity = 1 | 2 | 3
type Sound = 'bup' | 'ting' | 'ting-ting-tinh' | 'soi' | 'bum'

const SOUNDS: readonly Sound[] = ['soi', 'bum', 'bup', 'ting', 'ting-ting-tinh']
const BY_RARITY: Record<Rarity, Sound> = { 1: 'bup', 2: 'ting', 3: 'ting-ting-tinh' }
/** Tải xong quá muộn so với lúc thẻ bật thì bỏ, không phát lệch nhịp. */
export const LATE_MS = 400

let ctx: AudioContext | null = null
const buffers = new Map<Sound, Promise<AudioBuffer | null>>()

function url(name: Sound) {
  return `${import.meta.env.BASE_URL}sounds/${name}.wav`
}

/** Tạo/resume AudioContext — gọi trong thao tác chạm của người dùng (iOS chỉ cho phát sau đó). */
export function unlockAudio() {
  try {
    if (!ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!Ctor) return
      ctx = new Ctor()
    }
    resume(ctx)
  } catch {
    ctx = null
  }
}

// 'suspended' khi chưa chạm, 'interrupted' trên iOS sau cuộc gọi / chạy nền
function resume(audio: AudioContext) {
  if ((audio.state as string) !== 'running') void audio.resume().catch(() => {})
}

// Safari cũ chỉ có dạng callback; bản mới trả Promise — hỗ trợ cả hai, kết quả rỗng coi là lỗi
function decode(audio: AudioContext, data: ArrayBuffer): Promise<AudioBuffer> {
  return new Promise((resolve, reject) => {
    const ok = (b: AudioBuffer | null | undefined) => (b ? resolve(b) : reject(new Error('decode')))
    try {
      const p = audio.decodeAudioData(data, ok, reject) as Promise<AudioBuffer> | undefined
      p?.then?.(ok, reject)
    } catch (err) {
      reject(err)
    }
  })
}

function load(name: Sound): Promise<AudioBuffer | null> {
  const cached = buffers.get(name)
  if (cached) return cached
  const audio = ctx
  if (!audio) return Promise.resolve(null)
  const p = fetch(url(name))
    .then((res) => {
      if (!res.ok) throw new Error(`sound ${res.status}`)
      return res.arrayBuffer()
    })
    .then((data) => decode(audio, data))
    .catch(() => {
      // lần sau thử tải lại
      buffers.delete(name)
      return null
    })
  buffers.set(name, p)
  return p
}

/** Tải sẵn mọi âm thanh (sau `unlockAudio`) — tiếng nồi trước vì phát sớm nhất. */
export function preloadSounds() {
  for (const name of SOUNDS) void load(name)
}

function startSource(audio: AudioContext, buffer: AudioBuffer, loop = false) {
  try {
    const src = audio.createBufferSource()
    src.buffer = buffer
    src.loop = loop
    // tiếng lặp đi qua GainNode để dừng êm (không "tách"); trình duyệt thiếu GainNode thì nối thẳng
    const gain = loop ? audio.createGain?.() : undefined
    if (gain) {
      src.connect(gain)
      gain.connect(audio.destination)
    } else {
      src.connect(audio.destination)
    }
    src.start()
    return { src, gain }
  } catch {
    return null
  }
}

/** Phát thử ở Cài đặt được chờ tải lâu hơn, nhưng quá mức này thì bỏ (người dùng có thể đã tắt / rời màn). */
const PREVIEW_LATE_MS = 3000

/** Phát một lần; tải xong quá `LATE_MS` thì bỏ (`late`: phát thử, không cần khớp nhịp — chờ tới `PREVIEW_LATE_MS`). */
function play(name: Sound, late = false) {
  const audio = ctx
  if (!audio) return
  resume(audio)
  const asked = Date.now()
  void load(name).then((buffer) => {
    if (!buffer || Date.now() - asked > (late ? PREVIEW_LATE_MS : LATE_MS)) return
    startSource(audio, buffer)
  })
}

/** Phát âm thanh theo bậc: ⭐ "bụp", ⭐⭐ "ting", ⭐⭐⭐ "ting-ting-tinh". `late`: vẫn phát dù tải chậm (phát thử ở Cài đặt). */
export function playRaritySound(r: Rarity, { late = false }: { late?: boolean } = {}) {
  play(BY_RARITY[r], late)
}

/** Nồi nổ "bùm" lúc nắp bật. */
export function playPotBoom() {
  play('bum')
}

/**
 * Nồi sôi rung (lặp) cho tới khi gọi hàm dừng trả về. Tải chậm thì bắt đầu khi tải xong nếu chưa bị dừng.
 * Gọi dừng nhiều lần vô hại.
 */
export function startPotRumble(): () => void {
  const audio = ctx
  if (!audio) return () => {}
  resume(audio)
  let stopped = false
  let playing: ReturnType<typeof startSource> = null
  void load('soi').then((buffer) => {
    if (!buffer || stopped) return
    playing = startSource(audio, buffer, true)
  })
  return () => {
    stopped = true
    if (!playing) return
    const { src, gain } = playing
    playing = null
    try {
      if (gain) {
        // hạ nhỏ ~40ms rồi mới dừng
        gain.gain.setTargetAtTime(0, audio.currentTime, 0.015)
        src.stop(audio.currentTime + 0.08)
      } else {
        src.stop()
      }
    } catch {
      // đã dừng
    }
  }
}

/** Chỉ cho test. */
export function resetSoundForTest() {
  ctx = null
  buffers.clear()
}

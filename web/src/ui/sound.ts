/**
 * Âm thanh mở nồi qua Web Audio. File chỉ được tải khi gọi (âm thanh đang bật) — mặc định không tải gì.
 * Mọi lỗi (không có Web Audio, tải/decode lỗi, bị chặn tự phát) đều im lặng.
 */
type Rarity = 1 | 2 | 3

const FILES: Record<Rarity, string> = { 1: 'bup.wav', 2: 'ting.wav', 3: 'ting-ting-tinh.wav' }
/** Tải xong quá muộn so với lúc thẻ bật thì bỏ, không phát lệch nhịp. */
export const LATE_MS = 400

let ctx: AudioContext | null = null
const buffers = new Map<Rarity, Promise<AudioBuffer | null>>()

function url(r: Rarity) {
  return `${import.meta.env.BASE_URL}sounds/${FILES[r]}`
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

function load(r: Rarity): Promise<AudioBuffer | null> {
  const cached = buffers.get(r)
  if (cached) return cached
  const audio = ctx
  if (!audio) return Promise.resolve(null)
  const p = fetch(url(r))
    .then((res) => {
      if (!res.ok) throw new Error(`sound ${res.status}`)
      return res.arrayBuffer()
    })
    .then((data) => decode(audio, data))
    .catch(() => {
      // lần sau thử tải lại
      buffers.delete(r)
      return null
    })
  buffers.set(r, p)
  return p
}

/** Tải sẵn cả 3 âm thanh (sau `unlockAudio`). */
export function preloadSounds() {
  for (const r of [1, 2, 3] as const) void load(r)
}

/** Phát âm thanh theo bậc: ⭐ "bụp", ⭐⭐ "ting", ⭐⭐⭐ "ting-ting-tinh". */
export function playRaritySound(r: Rarity) {
  const audio = ctx
  if (!audio) return
  resume(audio)
  const asked = Date.now()
  void load(r).then((buffer) => {
    if (!buffer || Date.now() - asked > LATE_MS) return
    try {
      const src = audio.createBufferSource()
      src.buffer = buffer
      src.connect(audio.destination)
      src.start()
    } catch {
      // bỏ qua
    }
  })
}

/** Chỉ cho test. */
export function resetSoundForTest() {
  ctx = null
  buffers.clear()
}

import { useCallback, useSyncExternalStore } from 'react'

// Tuỳ chọn theo máy (AD-3): không lên server
const SOUND_KEY = 'noi-than:sound'
const listeners = new Set<() => void>()
// localStorage không dùng được thì nhớ trong phiên
let memory: boolean | null = null

function read(): boolean {
  if (memory !== null) return memory
  try {
    return window.localStorage.getItem(SOUND_KEY) === 'on'
  } catch {
    // chế độ riêng tư / bị chặn: mặc định tắt
    return false
  }
}

function subscribe(onChange: () => void) {
  listeners.add(onChange)
  // tab khác đổi
  const onStorage = (e: StorageEvent) => {
    if (e.key === SOUND_KEY) onChange()
  }
  window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(onChange)
    window.removeEventListener('storage', onStorage)
  }
}

/** Âm thanh mở nồi (mặc định tắt). Dùng chung cho màn Cài đặt và hiệu ứng Epic 4. */
export function useSoundEnabled(): [boolean, (on: boolean) => void] {
  const enabled = useSyncExternalStore(subscribe, read, () => false)
  const set = useCallback((on: boolean) => {
    try {
      window.localStorage.setItem(SOUND_KEY, on ? 'on' : 'off')
      memory = null
    } catch {
      // không lưu được: vẫn đổi trong phiên này
      memory = on
    }
    for (const l of listeners) l()
  }, [])
  return [enabled, set]
}

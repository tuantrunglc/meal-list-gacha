/** Rung theo bậc sao (UX-DR13). Không có `navigator.vibrate` (iPhone) hoặc bị chặn thì bỏ qua êm. */
type Rarity = 1 | 2 | 3

export const VIBRATION: Record<Rarity, number | number[]> = {
  1: 15,
  2: 35,
  // mạnh 2 nhịp
  3: [60, 80, 60],
}

export function vibrateRarity(r: Rarity) {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') navigator.vibrate(VIBRATION[r])
  } catch {
    // bỏ qua
  }
}

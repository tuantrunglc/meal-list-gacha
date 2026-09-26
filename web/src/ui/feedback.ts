import { vibrateRarity } from './haptics'
import { playRaritySound } from './sound'

/** Phản hồi khi một món bật ra: rung (nếu máy có) + âm thanh (nếu đang bật). */
export function rarityFeedback(rarity: 1 | 2 | 3, sound: boolean) {
  vibrateRarity(rarity)
  if (sound) playRaritySound(rarity)
}

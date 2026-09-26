const ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789'
// 252 = 7 × 36: bỏ các byte ≥ 252 để mỗi ký tự có xác suất đều nhau
const LIMIT = 252

/** ID theo định dạng PocketBase (15 ký tự `[a-z0-9]`), do client sinh trước khi tạo (AD-4). */
export function newId(): string {
  let id = ''
  const buf = new Uint8Array(32)
  while (id.length < 15) {
    crypto.getRandomValues(buf)
    for (const b of buf) {
      if (b < LIMIT && id.length < 15) id += ALPHABET[b % 36]
    }
  }
  return id
}

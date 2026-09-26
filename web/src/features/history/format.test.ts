import { describe, expect, it } from 'vitest'
import { formatChosenAt } from './format'

describe('formatChosenAt', () => {
  it('thứ viết hoa chữ đầu, ngày/tháng, giờ:phút theo giờ máy', () => {
    expect(formatChosenAt('2026-09-26T10:30:00.000Z')).toBe('Thứ Bảy, 26/09 · 17:30')
  })
  it('ngày không hợp lệ thì chuỗi rỗng, không crash', () => {
    expect(formatChosenAt('')).toBe('')
    expect(formatChosenAt('rác')).toBe('')
  })
})

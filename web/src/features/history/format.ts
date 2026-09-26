/** Ngày giờ chốt mâm theo giờ máy, ví dụ "Thứ Bảy, 26/09 · 17:30". */
export function formatChosenAt(iso: string, locale = 'vi-VN'): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const day = new Intl.DateTimeFormat(locale, { weekday: 'long', day: '2-digit', month: '2-digit' }).format(d)
  const time = new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit', hour12: false }).format(d)
  // "thứ bảy, 26/09" → viết hoa chữ đầu
  return `${day.charAt(0).toUpperCase()}${day.slice(1)} · ${time}`
}

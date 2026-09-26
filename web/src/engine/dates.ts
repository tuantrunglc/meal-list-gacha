const MS_PER_DAY = 86_400_000

function localDayNumber(d: Date): number {
  // Date.UTC trên các thành phần ngày giờ máy: tránh lệch do đổi giờ mùa hè
  return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / MS_PER_DAY)
}

/** Số ngày lịch (giờ máy) từ `iso` tới `now`. 0 = cùng ngày, 1 = hôm qua. */
export function calendarDayDiff(now: Date, iso: string): number {
  return localDayNumber(now) - localDayNumber(new Date(iso))
}

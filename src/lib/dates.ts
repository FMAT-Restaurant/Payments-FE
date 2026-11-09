const dateTimeFormatter = new Intl.DateTimeFormat('es-MX', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

/** "29/09/2026 14:32" in the browser's time zone. Returns the raw value when it is not a valid date. */
export function formatDateTime(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  const parts = Object.fromEntries(dateTimeFormatter.formatToParts(date).map((part) => [part.type, part.value]))
  return `${parts.day}/${parts.month}/${parts.year} ${parts.hour}:${parts.minute}`
}

const timeFormatter = new Intl.DateTimeFormat('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false })

/** "08:00" in the browser's time zone. Returns the raw value when it is not a valid date. */
export function formatTime(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return timeFormatter.format(date)
}

const pad = (value: number): string => String(value).padStart(2, '0')

/** "2026-09-08" (value of an `<input type="date">`) -> local midnight, or null when it is not a real date. */
export function parseDateInput(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return null
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])]
  const date = new Date(year, month - 1, day)
  const isReal = date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
  return isReal ? date : null
}

/** ISO-8601 with the browser's UTC offset: "2026-09-08T00:00:00-06:00". */
function toIsoWithOffset(date: Date): string {
  const offset = -date.getTimezoneOffset()
  const sign = offset >= 0 ? '+' : '-'
  const absolute = Math.abs(offset)
  const local = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  return `${local}${sign}${pad(Math.floor(absolute / 60))}:${pad(absolute % 60)}`
}

/** Start of the chosen day (00:00) in the browser's time zone (PMC-24 AC2). */
export function rangeStartIso(day: string): string | undefined {
  const date = parseDateInput(day)
  return date ? toIsoWithOffset(date) : undefined
}

/** Exclusive end: the day AFTER the chosen one at 00:00, so the Backend covers it until 23:59:59 (PMC-24 AC2). */
export function rangeEndExclusiveIso(day: string): string | undefined {
  const date = parseDateInput(day)
  return date ? toIsoWithOffset(new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1)) : undefined
}

/** Calendar days between two inputs, both included (08 to 29 = 22). Immune to daylight saving changes. */
export function inclusiveDays(startDay: string, endDay: string): number | null {
  const start = parseDateInput(startDay)
  const end = parseDateInput(endDay)
  if (!start || !end) return null
  const utc = (date: Date) => Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  return Math.round((utc(end) - utc(start)) / 86_400_000) + 1
}

const longMonthFormatter = new Intl.DateTimeFormat('es-MX', { month: 'short' })

/** "08 Sep 2026, 14:30" in the browser's time zone (PMC-24 AC3). Returns the raw value when it is not a date. */
export function formatLongDateTime(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  const month = longMonthFormatter.format(date).replace('.', '')
  return `${pad(date.getDate())} ${month.charAt(0).toUpperCase()}${month.slice(1)} ${date.getFullYear()}, ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

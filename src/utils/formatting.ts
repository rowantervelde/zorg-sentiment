export const DEFAULT_LOCALE = 'nl-NL'
export const DEFAULT_TIME_ZONE = 'Europe/Amsterdam'
export const FALLBACK_PLACEHOLDER = '–'

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

export function formatNumber(value: number, locale: string = DEFAULT_LOCALE): string {
  if (!isFiniteNumber(value)) {
    return FALLBACK_PLACEHOLDER
  }

  return new Intl.NumberFormat(locale).format(value)
}

export function formatCompactNumber(
  value: number,
  locale: string = DEFAULT_LOCALE,
  maximumFractionDigits: number = 1,
): string {
  if (!isFiniteNumber(value)) {
    return FALLBACK_PLACEHOLDER
  }

  return new Intl.NumberFormat(locale, {
    notation: 'compact',
    maximumFractionDigits,
  }).format(value)
}

export function formatPercentage(
  value: number,
  locale: string = DEFAULT_LOCALE,
  fractionDigits: number = 0,
): string {
  if (!isFiniteNumber(value)) {
    return FALLBACK_PLACEHOLDER
  }

  const formatter = new Intl.NumberFormat(locale, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  })

  return `${formatter.format(value)}%`
}

export function formatAgeMinutes(ageMinutes: number): string {
  if (!isFiniteNumber(ageMinutes) || ageMinutes < 0) {
    return FALLBACK_PLACEHOLDER
  }

  if (ageMinutes < 1) {
    return 'just now'
  }

  if (ageMinutes < 60) {
    return `${Math.round(ageMinutes)}m ago`
  }

  const hours = ageMinutes / 60
  if (hours < 24) {
    const rounded = Math.round(hours)
    return `${rounded}h ago`
  }

  const days = ageMinutes / (60 * 24)
  const roundedDays = Math.round(days)
  return `${roundedDays}d ago`
}

export function formatIsoTime(
  iso: string,
  locale: string = DEFAULT_LOCALE,
  options: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' },
): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) {
    return FALLBACK_PLACEHOLDER
  }

  const finalOptions: Intl.DateTimeFormatOptions = { timeZone: DEFAULT_TIME_ZONE, ...options }

  return new Intl.DateTimeFormat(locale, finalOptions).format(date)
}

export function formatTimestampWithAge(
  iso: string,
  now: Date = new Date(),
  locale: string = DEFAULT_LOCALE,
): string {
  const timestamp = new Date(iso)
  if (Number.isNaN(timestamp.getTime()) || Number.isNaN(now.getTime())) {
    return FALLBACK_PLACEHOLDER
  }

  const ageMinutes = Math.max(0, (now.getTime() - timestamp.getTime()) / (1000 * 60))
  const timePart = formatIsoTime(iso, locale)
  const agePart = formatAgeMinutes(ageMinutes)

  if (timePart === FALLBACK_PLACEHOLDER || agePart === FALLBACK_PLACEHOLDER) {
    return FALLBACK_PLACEHOLDER
  }

  return `${timePart} (${agePart})`
}

export function formatHourRange(
  startIso: string,
  endIso: string,
  locale: string = DEFAULT_LOCALE,
): string {
  const startFormatted = formatIsoTime(startIso, locale)
  const endFormatted = formatIsoTime(endIso, locale)

  if ([startFormatted, endFormatted].includes(FALLBACK_PLACEHOLDER)) {
    return FALLBACK_PLACEHOLDER
  }

  return `${startFormatted} – ${endFormatted}`
}

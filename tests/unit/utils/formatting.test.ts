import { describe, expect, it } from 'vitest'
import {
  FALLBACK_PLACEHOLDER,
  formatAgeMinutes,
  formatCompactNumber,
  formatHourRange,
  formatIsoTime,
  formatNumber,
  formatPercentage,
  formatTimestampWithAge,
} from '../../../src/utils/formatting'

describe('formatting utilities', () => {
  describe('formatNumber', () => {
    it('formats integers according to locale', () => {
      expect(formatNumber(12345)).toBe('12.345')
    })

    it('returns fallback for invalid inputs', () => {
      expect(formatNumber(Number.NaN)).toBe(FALLBACK_PLACEHOLDER)
    })
  })

  describe('formatCompactNumber', () => {
    it('formats large numbers with compact notation', () => {
      expect(formatCompactNumber(5230)).toBe('5,2K')
    })

    it('returns fallback when value is not finite', () => {
      expect(formatCompactNumber(Number.POSITIVE_INFINITY)).toBe(FALLBACK_PLACEHOLDER)
    })
  })

  describe('formatPercentage', () => {
    it('appends percent sign with fixed fraction digits', () => {
      expect(formatPercentage(42.5, 'nl-NL', 1)).toBe('42,5%')
    })

    it('returns fallback for invalid values', () => {
      expect(formatPercentage(Number.NaN)).toBe(FALLBACK_PLACEHOLDER)
    })
  })

  describe('formatAgeMinutes', () => {
    it('provides human-friendly strings for various ages', () => {
      expect(formatAgeMinutes(0.4)).toBe('just now')
      expect(formatAgeMinutes(12)).toBe('12m ago')
      expect(formatAgeMinutes(90)).toBe('2h ago')
  expect(formatAgeMinutes(60 * 24 * 30)).toBe('30d ago')
    })

    it('returns fallback for negative ages', () => {
      expect(formatAgeMinutes(-5)).toBe(FALLBACK_PLACEHOLDER)
    })
  })

  describe('formatIsoTime', () => {
    it('formats ISO strings to local Amsterdam time', () => {
      expect(formatIsoTime('2024-04-01T10:15:00Z')).toBe('12:15')
    })

    it('returns fallback for invalid ISO values', () => {
      expect(formatIsoTime('not-a-date')).toBe(FALLBACK_PLACEHOLDER)
    })
  })

  describe('formatTimestampWithAge', () => {
    it('combines formatted time with age descriptor', () => {
      const now = new Date('2024-04-01T10:20:00Z')
      const iso = '2024-04-01T10:05:00Z'
      expect(formatTimestampWithAge(iso, now)).toBe('12:05 (15m ago)')
    })

    it('returns fallback when timestamp invalid', () => {
      const now = new Date('2024-04-01T10:20:00Z')
      expect(formatTimestampWithAge('invalid', now)).toBe(FALLBACK_PLACEHOLDER)
    })
  })

  describe('formatHourRange', () => {
    it('formats start and end window boundaries', () => {
      const label = formatHourRange('2024-04-01T08:00:00Z', '2024-04-01T09:00:00Z')
      expect(label).toBe('10:00 – 11:00')
    })

    it('returns fallback if any boundary invalid', () => {
      expect(formatHourRange('invalid', '2024-04-01T09:00:00Z')).toBe(FALLBACK_PLACEHOLDER)
    })
  })
})

import { describe, expect, it } from 'vitest'
import type { SentimentLabel } from '../../../src/utils/types'
import {
  SCORE_MAX,
  SCORE_MIN,
  SENTIMENT_BANDS,
  clampScore,
  compareToHistory,
  determineTrend,
  getBandByLabel,
  getBandForScore,
  getLabelForScore,
} from '../../../src/utils/scoring'

describe('scoring utilities', () => {
  it('clamps scores to the valid range', () => {
    expect(clampScore(-10)).toBe(SCORE_MIN)
    expect(clampScore(150)).toBe(SCORE_MAX)
    expect(clampScore(Number.NaN)).toBe(SCORE_MIN)
    expect(clampScore(63.456)).toBe(63.46)
  })

  it('maps score boundaries to the correct labels', () => {
    const cases: Array<[number, SentimentLabel]> = [
      [0, 'Bleak'],
      [19, 'Bleak'],
      [20, 'Tense'],
      [39, 'Tense'],
      [40, 'Mixed'],
      [59, 'Mixed'],
      [60, 'Upbeat'],
      [79, 'Upbeat'],
      [80, 'Sunny'],
      [100, 'Sunny'],
    ]

    cases.forEach(([score, expected]) => {
      expect(getLabelForScore(score)).toBe(expected)
    })
  })

  it('provides descriptive metadata for each label', () => {
    SENTIMENT_BANDS.forEach((band) => {
      const lookup = getBandByLabel(band.label)
      expect(lookup).toStrictEqual(band)
    })
  })

  it('returns the correct band for arbitrary scores', () => {
    const band = getBandForScore(72)
    expect(band.label).toBe('Upbeat')
    expect(band.tone).toBe('positive')
  })

  it('analyses score relative to history', () => {
    const analysis = compareToHistory(70, 40, 90)

    expect(analysis.relativePosition).toBeCloseTo(0.6, 4)
    expect(analysis.isRecordLow).toBe(false)
    expect(analysis.isRecordHigh).toBe(false)
  })

  it('handles degenerate history where max equals min', () => {
    const analysis = compareToHistory(50, 50, 50)

    expect(analysis.relativePosition).toBeNull()
    expect(analysis.isRecordLow).toBe(true)
    expect(analysis.isRecordHigh).toBe(true)
  })

  it('handles non-finite history inputs', () => {
    const analysis = compareToHistory(70, Number.NaN, 90)

    expect(analysis.relativePosition).toBeNull()
    expect(analysis.isRecordLow).toBe(false)
    expect(analysis.isRecordHigh).toBe(false)
  })

  it('determines trend compared to previous score', () => {
    expect(determineTrend(60, 55)).toBe('up')
    expect(determineTrend(40, 45)).toBe('down')
    expect(determineTrend(50, 50.3)).toBe('steady')
  })

  it('treats invalid inputs as steady trend', () => {
    expect(determineTrend(Number.NaN, 50)).toBe('steady')
    expect(determineTrend(50, 50, -1)).toBe('steady')
  })
})

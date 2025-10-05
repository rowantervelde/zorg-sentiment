import { describe, expect, it } from 'vitest'
import {
  DEFAULT_PERCENT_TOLERANCE,
  DEFAULT_SPIKE_STD_MULTIPLIER,
  calculateNetPolarity,
  detectSentimentSpike,
  percentSumWithinTolerance,
  validateTopicPercentages,
} from '../../../src/utils/validation'

const closeTo = (value: number, places = 2) => Number(value.toFixed(places))

describe('validation utilities', () => {
  describe('percentSumWithinTolerance', () => {
    it('accepts sums within the default tolerance', () => {
      const result = percentSumWithinTolerance(40, 30, 30)
      expect(result).toBe(true)
    })

    it('rejects sums outside tolerance', () => {
      const result = percentSumWithinTolerance(50, 30, 25)
      expect(result).toBe(false)
    })

    it('uses the provided tolerance override', () => {
      const result = percentSumWithinTolerance(50, 30, 21, 2)
      expect(result).toBe(true)
    })

    it('rejects non-finite inputs', () => {
      const result = percentSumWithinTolerance(40, Number.NaN, 60)
      expect(result).toBe(false)
    })
  })

  describe('validateTopicPercentages', () => {
    it('validates topic percentage triplet against default tolerance', () => {
      const result = validateTopicPercentages({ positivePct: 34, neutralPct: 33, negativePct: 33 })
      expect(result).toBe(true)
    })

    it('allows custom tolerance overrides', () => {
      const result = validateTopicPercentages(
        { positivePct: 34, neutralPct: 33, negativePct: 35 },
        DEFAULT_PERCENT_TOLERANCE + 1,
      )
      expect(result).toBe(true)
    })
  })

  describe('calculateNetPolarity', () => {
    it('computes difference between positive and negative percentages', () => {
      const polarity = calculateNetPolarity(62.4, 21.1)
      expect(closeTo(polarity)).toBe(closeTo(41.3))
    })

    it('caps computed polarity between -100 and 100', () => {
      const high = calculateNetPolarity(220, 40)
      const low = calculateNetPolarity(10, 250)

      expect(high).toBe(100)
      expect(low).toBe(-100)
    })

    it('throws when supplied non-finite values', () => {
      expect(() => calculateNetPolarity(Number.NaN, 10)).toThrowError(TypeError)
    })
  })

  describe('detectSentimentSpike', () => {
    it('returns false when no prior scores exist', () => {
      expect(detectSentimentSpike(80, [])).toBe(false)
    })

    it('returns true when current exceeds mean plus multiplier times std dev', () => {
      const prior = [50, 52, 48, 49, 51]
      const mean = prior.reduce((sum, value) => sum + value, 0) / prior.length
      const variance = prior.reduce((total, value) => total + (value - mean) ** 2, 0) / prior.length
      const stdDev = Math.sqrt(variance)
      const threshold = mean + DEFAULT_SPIKE_STD_MULTIPLIER * stdDev

      expect(detectSentimentSpike(threshold + 0.1, prior)).toBe(true)
    })

    it('returns false when current score does not exceed threshold', () => {
      const prior = [60, 59, 62, 61]
      expect(detectSentimentSpike(62, prior)).toBe(false)
    })

    it('requires current to be greater than mean when prior std dev is zero', () => {
      const prior = [55, 55, 55]
      expect(detectSentimentSpike(55, prior)).toBe(false)
      expect(detectSentimentSpike(56, prior)).toBe(true)
    })

    it('ignores non-finite prior scores', () => {
      const prior = [50, Number.NaN, 51]
      expect(detectSentimentSpike(80, prior)).toBe(true)
    })
  })
})

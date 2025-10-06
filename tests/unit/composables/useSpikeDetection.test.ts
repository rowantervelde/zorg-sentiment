import { describe, expect, it } from 'vitest'
import { ref } from 'vue'
import { useSpikeDetection } from '../../../src/composables/useSpikeDetection'
import type { SentimentSnapshot } from '../../../src/utils/types'

describe('useSpikeDetection', () => {
  it('derives spike state and analytics from snapshot data', () => {
    const snapshot = ref<SentimentSnapshot | null>({
      windowStart: '2025-10-05T03:00:00Z',
      windowEnd: '2025-10-05T04:00:00Z',
      positiveCount: 120,
      neutralCount: 60,
      negativeCount: 30,
      compositeScore: 72,
      min30Day: 30,
      max30Day: 92,
      prior12hScores: [50, 52, 51, 49, 48, 50, 51, 52, 53, 55, 54, 53],
      spikeFlag: true,
    })

    const { isSpike, deltaFromMean, thresholdScore, zScore } = useSpikeDetection(snapshot)

    expect(isSpike.value).toBe(true)
    expect(deltaFromMean.value).toBeCloseTo(20.5, 1)
  expect(thresholdScore.value).toBeCloseTo(55.46, 2)
    expect(zScore.value).toBeGreaterThan(1)
  })

  it('recomputes spike flag when snapshot flag is false', () => {
    const snapshot = ref<SentimentSnapshot | null>({
      windowStart: '2025-10-05T03:00:00Z',
      windowEnd: '2025-10-05T04:00:00Z',
      positiveCount: 120,
      neutralCount: 60,
      negativeCount: 30,
  compositeScore: 70,
      min30Day: 30,
      max30Day: 92,
      prior12hScores: [70, 69, 71, 70, 71, 69, 70, 70, 69, 71, 70, 69],
      spikeFlag: false,
    })

    const { isSpike } = useSpikeDetection(snapshot)

    expect(isSpike.value).toBe(false)

    snapshot.value = {
      ...snapshot.value!,
      compositeScore: 80,
    }

    expect(isSpike.value).toBe(true)
  })

  it('provides evaluate helper for arbitrary scores', () => {
    const snapshot = ref<SentimentSnapshot | null>(null)

    const { evaluate } = useSpikeDetection(snapshot)

    expect(evaluate(65, [50, 51, 52, 49, 50, 51, 52, 53, 50, 51, 52, 49])).toBe(true)
    expect(evaluate(52, [50, 51, 52, 49, 50, 51, 52, 53, 50, 51, 52, 49])).toBe(false)
  })
})

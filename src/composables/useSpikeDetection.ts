import { computed } from 'vue'
import { detectSentimentSpike, DEFAULT_SPIKE_STD_MULTIPLIER } from '../utils/validation'
import type { SentimentSnapshot } from '../utils/types'

import type { ComputedRef, Ref } from 'vue'

export interface UseSpikeDetectionOptions {
  stdMultiplier?: number
}

export interface UseSpikeDetectionReturn {
  isSpike: ComputedRef<boolean>
  deltaFromMean: ComputedRef<number | null>
  thresholdScore: ComputedRef<number | null>
  zScore: ComputedRef<number | null>
  evaluate: (currentScore: number, priorScores: readonly number[]) => boolean
}

interface SpikeStats {
  mean: number
  stdDev: number
}

function computeStats(priorScores: readonly number[]): SpikeStats | null {
  const finiteScores = priorScores.filter(Number.isFinite) as number[]

  if (finiteScores.length === 0) {
    return null
  }

  const mean = finiteScores.reduce((sum, value) => sum + value, 0) / finiteScores.length
  const variance =
    finiteScores.reduce((total, value) => {
      const diff = value - mean
      return total + diff * diff
    }, 0) / finiteScores.length
  const stdDev = Math.sqrt(variance)

  return { mean, stdDev }
}

export function useSpikeDetection(
  snapshotRef: Ref<SentimentSnapshot | null>,
  options: UseSpikeDetectionOptions = {},
): UseSpikeDetectionReturn {
  const stdMultiplier = options.stdMultiplier ?? DEFAULT_SPIKE_STD_MULTIPLIER

  const stats = computed(() => {
    const snapshot = snapshotRef.value
    if (!snapshot) {
      return null
    }

    return computeStats(snapshot.prior12hScores)
  })

  const isSpike = computed(() => {
    const snapshot = snapshotRef.value
    if (!snapshot) {
      return false
    }

    if (snapshot.spikeFlag) {
      return true
    }

    return detectSentimentSpike(snapshot.compositeScore, snapshot.prior12hScores, stdMultiplier)
  })

  const deltaFromMean = computed(() => {
    const snapshot = snapshotRef.value
    const currentStats = stats.value

    if (!snapshot || !currentStats) {
      return null
    }

    return Number((snapshot.compositeScore - currentStats.mean).toFixed(2))
  })

  const thresholdScore = computed(() => {
    const snapshot = snapshotRef.value
    const currentStats = stats.value

    if (!snapshot || !currentStats) {
      return null
    }

    if (currentStats.stdDev === 0) {
      return Number(currentStats.mean.toFixed(2))
    }

    const threshold = currentStats.mean + stdMultiplier * currentStats.stdDev
    return Number(threshold.toFixed(2))
  })

  const zScore = computed(() => {
    const snapshot = snapshotRef.value
    const currentStats = stats.value

    if (!snapshot || !currentStats) {
      return null
    }

    if (currentStats.stdDev === 0) {
      return null
    }

    const score = (snapshot.compositeScore - currentStats.mean) / currentStats.stdDev
    return Number(score.toFixed(2))
  })

  const evaluate = (currentScore: number, priorScores: readonly number[]): boolean => {
    return detectSentimentSpike(currentScore, priorScores, stdMultiplier)
  }

  return {
    isSpike,
    deltaFromMean,
    thresholdScore,
    zScore,
    evaluate,
  }
}

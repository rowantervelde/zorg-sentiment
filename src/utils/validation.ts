import type { Topic } from './types'

export const PERCENT_SUM_TARGET = 100
export const DEFAULT_PERCENT_TOLERANCE = 1
export const DEFAULT_SPIKE_STD_MULTIPLIER = 2

export function percentSumWithinTolerance(
  positivePct: number,
  neutralPct: number,
  negativePct: number,
  tolerance: number = DEFAULT_PERCENT_TOLERANCE,
): boolean {
  if (![positivePct, neutralPct, negativePct, tolerance].every(Number.isFinite)) {
    return false
  }

  const total = positivePct + neutralPct + negativePct
  return Math.abs(total - PERCENT_SUM_TARGET) <= Math.abs(tolerance)
}

export function validateTopicPercentages(
  topic: Pick<Topic, 'positivePct' | 'neutralPct' | 'negativePct'>,
  tolerance: number = DEFAULT_PERCENT_TOLERANCE,
): boolean {
  return percentSumWithinTolerance(topic.positivePct, topic.neutralPct, topic.negativePct, tolerance)
}

export function calculateNetPolarity(positivePct: number, negativePct: number): number {
  if (![positivePct, negativePct].every(Number.isFinite)) {
    throw new TypeError('Percentages must be finite numbers')
  }

  const polarity = positivePct - negativePct
  return Math.max(-100, Math.min(100, Number(polarity.toFixed(2))))
}

export function detectSentimentSpike(
  currentScore: number,
  priorScores: readonly number[],
  stdMultiplier: number = DEFAULT_SPIKE_STD_MULTIPLIER,
): boolean {
  if (!Number.isFinite(currentScore) || !Number.isFinite(stdMultiplier) || stdMultiplier < 0) {
    return false
  }

  const finitePrior = priorScores.filter(Number.isFinite)
  if (finitePrior.length === 0) {
    return false
  }

  const mean = finitePrior.reduce((sum, value) => sum + value, 0) / finitePrior.length
  const variance =
    finitePrior.reduce((total, value) => {
      const diff = value - mean
      return total + diff * diff
    }, 0) / finitePrior.length
  const stdDev = Math.sqrt(variance)

  const threshold = mean + stdMultiplier * stdDev
  if (stdDev === 0) {
    return currentScore > mean
  }

  return currentScore >= threshold
}

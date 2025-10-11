import { defineEventHandler } from 'h3'

export default defineEventHandler(() => {
  const now = new Date()
  const hourAgo = new Date(now.getTime() - 60 * 60 * 1000)

  return {
    windowStart: hourAgo.toISOString(),
    windowEnd: now.toISOString(),
    positiveCount: 842,
    neutralCount: 312,
    negativeCount: 198,
    compositeScore: 72,
    min30Day: 38,
    max30Day: 91,
    prior12hScores: Array.from({ length: 12 }, (_, index) => 60 + index),
    spikeFlag: false,
  }
})

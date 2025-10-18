import type { SentimentLabel } from './types'

export const SCORE_MIN = 0
export const SCORE_MAX = 100

export type SentimentTone = 'negative' | 'wary' | 'balanced' | 'positive'

export interface SentimentBand {
  label: SentimentLabel
  minInclusive: number
  maxInclusive: number
  tone: SentimentTone
  headline: string
  description: string
}

export const SENTIMENT_BANDS: SentimentBand[] = [
  {
    label: 'Bleak',
    minInclusive: 0,
    maxInclusive: 19,
    tone: 'negative',
    headline: 'Bleak outlook',
    description: 'Public mood is strongly negative; conversations are dominated by worry or frustration.',
  },
  {
    label: 'Tense',
    minInclusive: 20,
    maxInclusive: 39,
    tone: 'wary',
    headline: 'Tension in the air',
    description: 'Sentiment leans negative with cautious optimism in short supply.',
  },
  {
    label: 'Mixed',
    minInclusive: 40,
    maxInclusive: 59,
    tone: 'balanced',
    headline: 'Mixed feelings',
    description: 'Audience is split; positive and negative reactions are near parity.',
  },
  {
    label: 'Upbeat',
    minInclusive: 60,
    maxInclusive: 79,
    tone: 'positive',
    headline: 'Upbeat energy',
    description: 'Conversation trends positively and optimism outweighs tension.',
  },
  {
    label: 'Sunny',
    minInclusive: 80,
    maxInclusive: 100,
    tone: 'positive',
    headline: 'Sunny skies',
    description: 'Mood is bright and confident; praise and enthusiasm dominate.',
  },
] as const

const SENTIMENT_BAND_BY_LABEL = new Map<SentimentLabel, SentimentBand>(
  SENTIMENT_BANDS.map((band) => [band.label, band]),
)

export function clampScore(score: number): number {
  if (!Number.isFinite(score)) {
    return SCORE_MIN
  }

  if (score < SCORE_MIN) {
    return SCORE_MIN
  }

  if (score > SCORE_MAX) {
    return SCORE_MAX
  }

  return Number(score.toFixed(2))
}

export function getBandForScore(score: number): SentimentBand {
  const normalized = clampScore(score)

  const band = SENTIMENT_BANDS.find(
    ({ minInclusive, maxInclusive }) => normalized >= minInclusive && normalized <= maxInclusive,
  )

  if (!band) {
    // Safety fallback; in practice all 0–100 values map to a band
    return SENTIMENT_BANDS[SENTIMENT_BANDS.length - 1]
  }

  return band
}

export function getLabelForScore(score: number): SentimentLabel {
  return getBandForScore(score).label
}

export function getBandByLabel(label: SentimentLabel): SentimentBand {
  const band = SENTIMENT_BAND_BY_LABEL.get(label)
  if (!band) {
    throw new Error(`Unknown sentiment label: ${label}`)
  }

  return band
}

export interface HistoricalComparison {
  relativePosition: number | null
  isRecordLow: boolean
  isRecordHigh: boolean
}

export function compareToHistory(
  currentScore: number,
  minScore: number,
  maxScore: number,
): HistoricalComparison {
  if (![currentScore, minScore, maxScore].every(Number.isFinite)) {
    return { relativePosition: null, isRecordLow: false, isRecordHigh: false }
  }

  const clampedCurrent = clampScore(currentScore)
  const clampedMin = clampScore(minScore)
  const clampedMax = clampScore(maxScore)

  if (clampedMax <= clampedMin) {
    return {
      relativePosition: null,
      isRecordLow: clampedCurrent <= clampedMin,
      isRecordHigh: clampedCurrent >= clampedMax,
    }
  }

  const range = clampedMax - clampedMin
  const relative = (clampedCurrent - clampedMin) / range
  const relativeClamped = Math.min(Math.max(relative, 0), 1)

  return {
    relativePosition: Number(relativeClamped.toFixed(4)),
    isRecordLow: clampedCurrent <= clampedMin,
    isRecordHigh: clampedCurrent >= clampedMax,
  }
}

export type ScoreTrend = 'up' | 'down' | 'steady'

export function determineTrend(
  currentScore: number,
  previousScore: number,
  epsilon: number = 0.5,
): ScoreTrend {
  if (![currentScore, previousScore, epsilon].every(Number.isFinite) || epsilon < 0) {
    return 'steady'
  }

  const current = clampScore(currentScore)
  const previous = clampScore(previousScore)
  const delta = current - previous

  if (delta > epsilon) {
    return 'up'
  }

  if (delta < -epsilon) {
    return 'down'
  }

  return 'steady'
}

export type SentimentLabel = 'Bleak' | 'Tense' | 'Mixed' | 'Upbeat' | 'Sunny'

export interface SentimentSnapshot {
  windowStart: string
  windowEnd: string
  positiveCount: number
  neutralCount: number
  negativeCount: number
  compositeScore: number
  min30Day: number
  max30Day: number
  prior12hScores: number[]
  spikeFlag: boolean
}

export interface Topic {
  name: string
  currentMentions3h: number
  prevMentions3h: number
  growthPercent: number | null
  positivePct: number
  neutralPct: number
  negativePct: number
  netPolarity: number
  polarizingFlag: boolean
  firstSeen: string
  lastSeen: string
}

export type CommentaryStatus = 'success' | 'fallback' | 'stale'

export interface Commentary {
  text: string | null
  createdAt: string | null
  includesTopics: string[]
  sentimentLabel: SentimentLabel | null
  status: CommentaryStatus
  lengthChars: number
}

export type RefreshPartialFlag = 'topicsMissing' | 'commentaryMissing'

export interface RefreshMetadata {
  lastRefreshAt: string
  ageMinutes: number
  partialFlags: RefreshPartialFlag[]
  staleFlag: boolean
}

export interface DashboardPayload {
  snapshot: SentimentSnapshot
  topics: Topic[]
  commentary: Commentary
  refresh: RefreshMetadata
}

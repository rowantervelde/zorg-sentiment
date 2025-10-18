export interface SentimentFeedResponse {
  windowStart: string
  windowEnd: string
  positiveCount: number
  neutralCount: number
  negativeCount: number
  compositeScore: number
  min30Day: number
  max30Day: number
  prior12hScores: number[]
  spikeFlag?: boolean
}

export interface TopicFeedEntry {
  name: string
  currentMentions3h: number
  prevMentions3h: number
  positivePct: number
  neutralPct: number
  negativePct: number
  firstSeen: string
  lastSeen: string
}

export interface TopicsFeedResponse {
  topics: TopicFeedEntry[]
}

export type CommentaryFeedResponse =
  | {
      status: 'success' | 'stale'
      text: unknown
      createdAt: unknown
      sentimentLabel: unknown
      includesTopics?: unknown
    }
  | {
      status: 'fallback'
      text?: unknown
      createdAt?: unknown
      sentimentLabel?: unknown
      includesTopics?: unknown
    }

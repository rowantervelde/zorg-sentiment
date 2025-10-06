import { getSentimentSnapshot } from './sentiment-service'
import { getTrendingTopics } from './topics-service'
import { getCommentary } from './commentary-service'
import type { FetchJsonOptions } from './api-client'
import type {
  Commentary,
  DashboardPayload,
  RefreshPartialFlag,
  SentimentSnapshot,
  Topic,
} from '../utils/types'

export const STALE_THRESHOLD_MINUTES = 30

export interface RefreshRequestOptions {
  sentiment?: FetchJsonOptions
  topics?: FetchJsonOptions
  commentary?: FetchJsonOptions
}

export interface RefreshServiceOptions {
  requests?: RefreshRequestOptions
  now?: () => Date
}

function createFallbackCommentary(): Commentary {
  return {
    text: null,
    createdAt: null,
    sentimentLabel: null,
    includesTopics: [],
    status: 'fallback',
    lengthChars: 0,
  }
}

function pushFlag(flags: Set<RefreshPartialFlag>, flag: RefreshPartialFlag): void {
  flags.add(flag)
}

function parseTimestamp(value: string | null | undefined): number | null {
  if (!value || typeof value !== 'string') {
    return null
  }

  const time = Date.parse(value)
  if (Number.isNaN(time)) {
    return null
  }

  return time
}

function gatherCandidateTimestamps(
  snapshot: SentimentSnapshot,
  topics: Topic[],
  commentary: Commentary,
): number[] {
  const candidates: number[] = []

  const snapshotTime = parseTimestamp(snapshot.windowEnd)
  if (snapshotTime !== null) {
    candidates.push(snapshotTime)
  }

  for (const topic of topics) {
    const lastSeen = parseTimestamp(topic.lastSeen)
    if (lastSeen !== null) {
      candidates.push(lastSeen)
    }
  }

  const commentaryTime = parseTimestamp(commentary.createdAt)
  if (commentaryTime !== null) {
    candidates.push(commentaryTime)
  }

  return candidates
}

function computeLastRefresh(now: Date, snapshot: SentimentSnapshot, topics: Topic[], commentary: Commentary): {
  lastRefreshAt: string
  ageMinutes: number
  staleFlag: boolean
} {
  const candidates = gatherCandidateTimestamps(snapshot, topics, commentary)
  let latest = candidates.length > 0 ? Math.max(...candidates) : null

  if (latest === null || !Number.isFinite(latest)) {
    latest = now.getTime()
  }

  const lastRefreshDate = new Date(latest)
  const diffMs = Math.max(0, now.getTime() - lastRefreshDate.getTime())
  const ageMinutes = Math.floor(diffMs / 60000)
  const staleFlag = ageMinutes > STALE_THRESHOLD_MINUTES

  return {
    lastRefreshAt: lastRefreshDate.toISOString(),
    ageMinutes,
    staleFlag,
  }
}

export async function getDashboardPayload(options: RefreshServiceOptions = {}): Promise<DashboardPayload> {
  const now = options.now?.() ?? new Date()
  const requestOptions = options.requests ?? {}

  const snapshot = await getSentimentSnapshot(requestOptions.sentiment)

  const [topicsResult, commentaryResult] = await Promise.allSettled([
    getTrendingTopics(requestOptions.topics),
    getCommentary(requestOptions.commentary),
  ])

  const partialFlags = new Set<RefreshPartialFlag>()

  let topics: Topic[] = []
  if (topicsResult.status === 'fulfilled') {
    topics = topicsResult.value
    if (topics.length === 0) {
      pushFlag(partialFlags, 'topicsMissing')
    }
  } else {
    topics = []
    pushFlag(partialFlags, 'topicsMissing')
  }

  let commentary: Commentary
  if (commentaryResult.status === 'fulfilled') {
    commentary = commentaryResult.value
    if (commentary.status !== 'success') {
      pushFlag(partialFlags, 'commentaryMissing')
    }
  } else {
    commentary = createFallbackCommentary()
    pushFlag(partialFlags, 'commentaryMissing')
  }

  const refresh = computeLastRefresh(now, snapshot, topics, commentary)

  return {
    snapshot,
    topics,
    commentary,
    refresh: {
      ...refresh,
      partialFlags: Array.from(partialFlags),
    },
  }
}

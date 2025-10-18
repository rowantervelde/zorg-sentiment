import { getSentimentSnapshot } from './sentiment-service'
import { getTrendingTopics } from './topics-service'
import { getCommentary } from './commentary-service'
import type { FetchJsonOptions } from './api-client'
import type {
  Commentary,
  DashboardPayload,
  RefreshPartialFlag,
  Topic,
} from '../utils/types'
import { computeRefreshRecency } from '../utils/refresh'

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

  const refresh = computeRefreshRecency({
    snapshot,
    topics,
    commentary,
    now,
    staleThresholdMinutes: STALE_THRESHOLD_MINUTES,
  })

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

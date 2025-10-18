import type { Commentary, SentimentSnapshot, Topic } from './types'

export interface RefreshRecencyInput {
  snapshot: SentimentSnapshot
  topics: ReadonlyArray<Topic>
  commentary: Commentary
  now?: Date
  staleThresholdMinutes: number
}

export interface RefreshRecencyResult {
  lastRefreshAt: string
  ageMinutes: number
  staleFlag: boolean
}

function parseTimestamp(candidate: string | null | undefined): number | null {
  if (!candidate) {
    return null
  }

  const parsed = Date.parse(candidate)
  return Number.isNaN(parsed) ? null : parsed
}

function gatherCandidateTimes(snapshot: SentimentSnapshot, topics: ReadonlyArray<Topic>, commentary: Commentary): number[] {
  const candidates: number[] = []

  const snapshotEnd = parseTimestamp(snapshot.windowEnd)
  if (snapshotEnd !== null) {
    candidates.push(snapshotEnd)
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

export function computeRefreshRecency({
  snapshot,
  topics,
  commentary,
  now = new Date(),
  staleThresholdMinutes,
}: RefreshRecencyInput): RefreshRecencyResult {
  const candidates = gatherCandidateTimes(snapshot, topics, commentary)
  const fallbackTime = now.getTime()
  const latest = candidates.length > 0 ? Math.max(...candidates) : fallbackTime

  const lastRefreshDate = new Date(Number.isFinite(latest) ? latest : fallbackTime)
  const diffMs = Math.max(0, now.getTime() - lastRefreshDate.getTime())
  const ageMinutes = Math.floor(diffMs / 60000)

  return {
    lastRefreshAt: lastRefreshDate.toISOString(),
    ageMinutes,
    staleFlag: ageMinutes > staleThresholdMinutes,
  }
}

import type { Commentary, DashboardPayload, Topic } from './types'
import { formatNumber, formatPercentage, formatAgeMinutes } from './formatting'
import { getBandForScore } from './scoring'

const MAX_TOPIC_SUMMARY = 3

function describeTopic(topic: Topic, index: number): string {
  const position = index + 1
  const polarityText = formatPercentage(topic.netPolarity)
  const positive = formatPercentage(topic.positivePct)
  const negative = formatPercentage(topic.negativePct)
  const growth = topic.growthPercent == null ? 'steady volume' : `${topic.growthPercent.toFixed(1)}% growth`
  const polarizing = topic.polarizingFlag ? 'polarizing' : 'balanced'

  return `${position}. ${topic.name}: ${growth}, positive ${positive}, negative ${negative}, net polarity ${polarityText}, ${polarizing}.`
}

export function buildSnapshotSummary(payload: DashboardPayload): string {
  const {
    snapshot: {
      compositeScore,
      positiveCount,
      neutralCount,
      negativeCount,
      spikeFlag,
      prior12hScores,
      min30Day,
      max30Day,
    },
    refresh: { ageMinutes, staleFlag },
  } = payload

  const band = getBandForScore(compositeScore)
  const refreshAge = formatAgeMinutes(ageMinutes)

  const lines: string[] = []
  lines.push(`Composite sentiment ${compositeScore} (${band.label}).`)
  lines.push(`Counts — positive ${formatNumber(positiveCount)}, neutral ${formatNumber(neutralCount)}, negative ${formatNumber(negativeCount)}.`)

  if (staleFlag) {
    lines.push('Snapshot flagged as stale; consider data provisional.')
  } else {
    lines.push(`Data refreshed ${refreshAge}.`)
  }

  if (spikeFlag) {
    const previous = prior12hScores.slice(-3).map((score) => score.toFixed(1)).join(', ')
    lines.push(`Spike detected compared to previous trend (recent scores ${previous}).`)
  }

  lines.push(`30-day range ${min30Day} to ${max30Day}.`)
  return lines.join(' ')
}

function summarizeCommentary(commentary: Commentary): string {
  if (!commentary.text) {
    return 'Commentary unavailable.'
  }

  const label = commentary.sentimentLabel ?? 'unknown'
  const topicSnippet = commentary.includesTopics.length
    ? `Mentions topics: ${commentary.includesTopics.join(', ')}.`
    : 'No topics referenced.'

  return `Commentary (${label}): ${commentary.text} ${topicSnippet}`
}

export interface AccessibilitySummaryOptions {
  topicLimit?: number
}

export function buildAccessibilitySummary(
  payload: DashboardPayload,
  options: AccessibilitySummaryOptions = {},
): string {
  const topicLimit = options.topicLimit ?? MAX_TOPIC_SUMMARY

  const topicSummaries: string[] = []
  payload.topics.slice(0, topicLimit).forEach((topic, index) => {
    topicSummaries.push(describeTopic(topic, index))
  })

  if (topicSummaries.length === 0) {
    topicSummaries.push('No active topics in current window.')
  }

  const snapshotSummary = buildSnapshotSummary(payload)
  const commentarySummary = summarizeCommentary(payload.commentary)

  return [snapshotSummary, commentarySummary, 'Topics:', ...topicSummaries].join(' ')
}

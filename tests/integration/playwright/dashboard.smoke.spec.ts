import { expect, test } from '@playwright/test'

const SENTIMENT_ENDPOINT = '**/api/sentiment'
const TOPICS_ENDPOINT = '**/api/topics/trending'
const COMMENTARY_ENDPOINT = '**/api/commentary/current'

function buildSentimentPayload(now: Date) {
  // Build payload matching new SentimentSnapshot structure (Feature 002)
  const hourlyBuckets = Array.from({ length: 24 }, (_, i) => ({
    bucket_id: `2025-10-18-${i}`,
    start_time: new Date(now.getTime() - (24 - i) * 60 * 60 * 1000).toISOString(),
    end_time: new Date(now.getTime() - (23 - i) * 60 * 60 * 1000).toISOString(),
    posts: [],
    aggregate_score: 0.36 + (i * 0.01), // Gradually increasing
    post_count: 30 + i,
  }))

  return {
    overall_score: 0.30, // Maps to display score of 65 via formula: ((0.30 + 1) / 2) * 100 = 65 (Upbeat range: 55-69)
    trend: 'stable' as const,
    spike_detected: false,
    age_minutes: 5,
    is_stale: false,
    data_quality: {
      confidence: 'high' as const,
      sample_size: 1352, // positiveCount + neutralCount + negativeCount
      staleness_minutes: 5,
      language_filter_rate: 0.1,
    },
    hourly_buckets: hourlyBuckets,
    sources: [
      {
        source_id: 'twitter',
        status: 'available' as const,
        last_success: now.toISOString(),
        last_error: null,
        posts_contributed: 842,
      },
      {
        source_id: 'reddit',
        status: 'available' as const,
        last_success: now.toISOString(),
        last_error: null,
        posts_contributed: 510,
      },
    ],
  }
}

function buildTopicsPayload(now: Date) {
  const firstSeen = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString()
  const lastSeen = now.toISOString()

  return {
    topics: [
      {
        name: 'Premium relief pilot',
        currentMentions3h: 128,
        prevMentions3h: 64,
        positivePct: 48,
        neutralPct: 27,
        negativePct: 25,
        firstSeen,
        lastSeen,
      },
      {
        name: 'Pharmacy wait times',
        currentMentions3h: 96,
        prevMentions3h: 48,
        positivePct: 18,
        neutralPct: 33,
        negativePct: 49,
        firstSeen,
        lastSeen,
      },
    ],
  }
}

function buildCommentaryPayload(now: Date) {
  return {
    status: 'success',
    text: 'Upbeat vibe: citizens are cheering a relief pilot while keeping an eye on pharmacy wait times.',
    createdAt: now.toISOString(),
    sentimentLabel: 'Upbeat',
    includesTopics: ['Premium relief pilot', 'Pharmacy wait times'],
  }
}

test.beforeEach(async ({ page }) => {
  const now = new Date()

  await page.addInitScript(() => {
    window.localStorage.removeItem('zs_onboard_v1')
  })

  await page.route(SENTIMENT_ENDPOINT, async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      json: buildSentimentPayload(now),
    })
  })

  await page.route(TOPICS_ENDPOINT, async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      json: buildTopicsPayload(now),
    })
  })

  await page.route(COMMENTARY_ENDPOINT, async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      json: buildCommentaryPayload(now),
    })
  })
})

test('dashboard renders headline metrics, topics, and commentary', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { name: 'Zorg-sentiment dashboard' })).toBeVisible()
  await expect(page.getByTestId('score-value')).toHaveText(/65/)
  await expect(page.getByTestId('score-label')).toHaveText('Upbeat')
  await expect(page.getByTestId('freshness-timestamp').first()).not.toHaveText('Last updated: unavailable')

  await expect(page.getByTestId('topic-item')).toHaveCount(2)
  await expect(page.getByTestId('topic-item').first()).toContainText('Premium relief pilot')
  await expect(page.getByTestId('topic-item').nth(1)).toContainText('Pharmacy wait times')

  await expect(page.getByTestId('commentary-text')).toContainText('Upbeat vibe')
  await expect(page.getByTestId('commentary-tag')).toBeVisible()

  await expect(page.getByRole('button', { name: 'Refresh now' })).toBeEnabled()
  await expect(page.getByRole('heading', { name: 'Quick tour' })).toBeVisible()
})

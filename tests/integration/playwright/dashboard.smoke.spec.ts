import { expect, test } from '@playwright/test'

const SENTIMENT_ENDPOINT = '**/api/sentiment/snapshot'
const TOPICS_ENDPOINT = '**/api/topics/trending'
const COMMENTARY_ENDPOINT = '**/api/commentary/current'

function buildSentimentPayload(now: Date) {
  const windowEnd = now.toISOString()
  const windowStart = new Date(now.getTime() - 60 * 60 * 1000).toISOString()

  return {
    windowStart,
    windowEnd,
    positiveCount: 842,
    neutralCount: 312,
    negativeCount: 198,
    compositeScore: 72,
    min30Day: 38,
    max30Day: 91,
    prior12hScores: Array.from({ length: 12 }, (_, index) => 60 + index),
    spikeFlag: false,
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
  await expect(page.getByTestId('score-value')).toHaveText(/72/)
  await expect(page.getByTestId('score-label')).toHaveText('Upbeat')
  await expect(page.getByTestId('score-tooltip')).toBeVisible()
  await expect(page.getByTestId('freshness-timestamp')).not.toHaveText('Last updated: unavailable')

  await expect(page.getByTestId('topic-item')).toHaveCount(2)
  await expect(page.getByTestId('topic-item').first()).toContainText('Premium relief pilot')
  await expect(page.getByTestId('topic-item').nth(1)).toContainText('Pharmacy wait times')

  await expect(page.getByTestId('commentary-text')).toContainText('Upbeat vibe')
  await expect(page.getByTestId('commentary-tag')).toBeVisible()

  await expect(page.getByRole('button', { name: 'Refresh now' })).toBeEnabled()
  await expect(page.getByRole('heading', { name: 'Quick tour' })).toBeVisible()
})

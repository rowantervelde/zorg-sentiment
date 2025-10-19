# Quickstart: Sentiment Snapshot Service

**Feature**: 002-sentiment-snapshot-service  
**Audience**: Developers implementing the sentiment aggregation service  
**Time**: ~30 minutes to read, 4-8 hours to implement MVP

---

## Overview

Build a sentiment aggregation service that:

1. Collects Dutch healthcare discussions from 5+ public sources
2. Analyzes sentiment using a Dutch lexicon
3. Calculates composite scores (0-100) and detects spikes (2σ from 12-hour mean)
4. Exposes data via `/api/sentiment` endpoint
5. Refreshes every 15 minutes with graceful degradation

**Architecture**: Nuxt 3 server API route + file-based storage + in-memory caching

---

## Prerequisites

### Knowledge

- TypeScript fundamentals
- Nuxt 3 server routes (`/server/api/` directory)
- REST API design patterns
- Basic statistics (mean, standard deviation)

### Tools

- Node.js 20+
- npm 10+
- Nuxt 3.12+ (already in project)
- VS Code or preferred editor

### Access

- **Twitter/X API**: Bearer token (apply at [developer.twitter.com](https://developer.twitter.com))
- **Reddit API**: OAuth2 client ID + secret (create app at [reddit.com/prefs/apps](https://www.reddit.com/prefs/apps))
- **Mastodon**: No auth required (public API)
- **Nu.nl/Google News**: No auth (public RSS feeds)
- **Tweakers**: No auth (public JSON API)

---

## Project Structure

```
src/
├── server/
│   └── api/
│       └── sentiment/
│           ├── index.get.ts              # Main endpoint (START HERE)
│           └── _lib/                      # Service layer
│               ├── aggregator.ts          # Orchestrates collection + analysis
│               ├── sources/               # Source adapters
│               │   ├── base.ts            # Abstract interface
│               │   ├── twitter.ts         # Implement 1st
│               │   ├── reddit.ts          # Implement 2nd
│               │   └── [others].ts        # Implement after
│               ├── sentiment/
│               │   ├── analyzer.ts        # Dutch sentiment classifier
│               │   └── lexicon.ts         # Lexicon loader
│               ├── storage/
│               │   ├── buckets.ts         # Hourly bucket management
│               │   └── cache.ts           # In-memory cache
│               ├── spike-detector.ts      # Statistical analysis
│               ├── rate-limiter.ts        # Bottleneck setup
│               └── logger.ts              # Structured logging
├── types/
│   └── sentiment.ts                       # TypeScript interfaces
└── composables/
    └── useSentimentSnapshot.ts            # Already exists (may need updates)

tests/
├── contract/
│   └── sentiment-feed.test.ts             # API contract validation
├── integration/
│   └── sentiment-aggregation.test.ts      # End-to-end flow
└── unit/
    └── services/sentiment/                # Module tests
```

---

## Implementation Phases

### Phase 0: Setup (30 minutes)

#### 1. Install Dependencies

```bash
npm install sentiment p-retry p-queue bottleneck simple-statistics franc-min
```

#### 2. Create Type Definitions

**File**: `src/types/sentiment.ts`

```typescript
export type SentimentLabel = 'Bleak' | 'Tense' | 'Mixed' | 'Upbeat' | 'Sunny'
export type SourceId = 'twitter' | 'reddit' | 'mastodon' | 'rss' | 'tweakers'

export interface SentimentSnapshot {
  timestamp: string
  windowStart: string
  windowEnd: string
  positiveCount: number
  neutralCount: number
  negativeCount: number
  totalMentions: number
  compositeScore: number
  sentimentLabel: SentimentLabel
  isSpikeDetected: boolean
  spikeDirection: 'positive' | 'negative' | null
  min30Day: number
  max30Day: number
  hourlyBuckets: HourlySentimentBucket[]
  sourcesUsed: string[]
  sourcesUnavailable: string[]
  isStale: boolean
  ageMinutes: number
}

export interface HourlySentimentBucket {
  hour: string
  positive: number
  neutral: number
  negative: number
  composite: number
}

// ... (copy full types from data-model.md)
```

#### 3. Set Up Environment Variables

**File**: `.env.local` (create if doesn't exist)

```bash
# Twitter/X API
TWITTER_BEARER_TOKEN=your_token_here

# Reddit API
REDDIT_CLIENT_ID=your_client_id
REDDIT_CLIENT_SECRET=your_secret

# Monitoring (optional)
ALERT_WEBHOOK_URL=https://your-webhook.com/alerts

# Node environment
NODE_ENV=development
```

**Add to `.gitignore`**:

```
.env.local
```

#### 4. Create Data Directory

```bash
mkdir -p src/server/data/sentiment
```

**File**: `src/server/data/sentiment/.gitkeep`

```
# Sentiment data files stored here
# .gitignore: *.json (except config.json)
```

**Update `.gitignore`**:

```gitignore
# Sentiment data (exclude generated files, keep config)
src/server/data/sentiment/*.json
!src/server/data/sentiment/config.json
```

---

### Phase 1: Core Aggregator (2 hours)

#### Step 1: Create Base Source Adapter

**File**: `src/server/api/sentiment/_lib/sources/base.ts`

```typescript
import type { RawMention } from '~/types/sentiment'

export abstract class SourceAdapter {
  abstract readonly id: string
  abstract readonly name: string

  /**
   * Fetch raw mentions from source
   * @param query Healthcare keywords query
   * @returns Array of raw mentions
   */
  abstract fetch(query: string): Promise<RawMention[]>

  /**
   * Check if rate limit allows request
   */
  abstract respectsRateLimit(): Promise<boolean>

  /**
   * Get current status
   */
  abstract getStatus(): { available: boolean; error?: string }
}
```

#### Step 2: Implement Twitter Adapter (simplest first)

**File**: `src/server/api/sentiment/_lib/sources/twitter.ts`

```typescript
import Bottleneck from 'bottleneck'
import pRetry from 'p-retry'
import { SourceAdapter } from './base'
import type { RawMention } from '~/types/sentiment'

const limiter = new Bottleneck({
  reservoir: 450,
  reservoirRefreshAmount: 450,
  reservoirRefreshInterval: 15 * 60 * 1000, // 15 minutes
  maxConcurrent: 1,
})

export class TwitterAdapter extends SourceAdapter {
  readonly id = 'twitter'
  readonly name = 'Twitter/X'
  private lastError: string | null = null

  async fetch(query: string): Promise<RawMention[]> {
    try {
      const data = await limiter.schedule(() => this.fetchWithRetry(query))
      this.lastError = null
      return data
    } catch (error: any) {
      this.lastError = error.message
      throw error
    }
  }

  private async fetchWithRetry(query: string): Promise<RawMention[]> {
    return pRetry(
      async () => {
        const token = process.env.TWITTER_BEARER_TOKEN
        if (!token) throw new Error('Twitter token not configured')

        const url = new URL('https://api.twitter.com/2/tweets/search/recent')
        url.searchParams.set('query', `${query} lang:nl -is:retweet`)
        url.searchParams.set('max_results', '100')
        url.searchParams.set('tweet.fields', 'created_at,public_metrics')

        const response = await fetch(url.toString(), {
          headers: { Authorization: `Bearer ${token}` },
          signal: AbortSignal.timeout(10000),
        })

        if (!response.ok) {
          throw new Error(`Twitter API error: ${response.status}`)
        }

        const json = await response.json()
        return this.transformTweets(json.data || [])
      },
      {
        retries: 3,
        factor: 2,
        minTimeout: 1000,
      },
    )
  }

  private transformTweets(tweets: any[]): RawMention[] {
    return tweets.map((tweet) => ({
      sourceId: 'twitter' as const,
      text: tweet.text,
      timestamp: tweet.created_at,
      engagement: {
        likes: tweet.public_metrics?.like_count || 0,
        shares: tweet.public_metrics?.retweet_count || 0,
        replies: tweet.public_metrics?.reply_count || 0,
      },
    }))
  }

  async respectsRateLimit(): Promise<boolean> {
    const counts = limiter.counts()
    return counts.RECEIVED < 400 // Leave buffer
  }

  getStatus() {
    return {
      available: !this.lastError,
      error: this.lastError || undefined,
    }
  }
}
```

#### Step 3: Create Aggregator Skeleton

**File**: `src/server/api/sentiment/_lib/aggregator.ts`

```typescript
import type { SentimentSnapshot, RawMention, ProcessedMention } from '~/types/sentiment'
import { TwitterAdapter } from './sources/twitter'
// Import other adapters as you build them

const sources = [
  new TwitterAdapter(),
  // new RedditAdapter(),
  // ... add others
]

export async function generateSnapshot(): Promise<SentimentSnapshot> {
  // 1. Collect from all sources (parallel)
  const mentions = await collectFromSources()

  // 2. Process sentiment
  const processed = await analyzeSentiment(mentions)

  // 3. Aggregate into buckets
  const buckets = aggregateIntoBuckets(processed)

  // 4. Calculate composite score
  const composite = calculateComposite(buckets[buckets.length - 1])

  // 5. Detect spikes
  const spike = detectSpike(composite, buckets)

  // 6. Build snapshot
  return buildSnapshot(composite, buckets, spike)
}

async function collectFromSources(): Promise<RawMention[]> {
  const query = 'zorg OR zorgverzekering OR gezondheidszorg'

  const results = await Promise.allSettled(sources.map((source) => source.fetch(query)))

  const successful = results
    .filter((r): r is PromiseFulfilledResult<RawMention[]> => r.status === 'fulfilled')
    .flatMap((r) => r.value)

  if (successful.length < 2) {
    throw new Error('Insufficient sources available')
  }

  return successful
}

// Implement other functions step-by-step...
```

---

### Phase 2: Sentiment Analysis (1 hour)

#### Step 1: Load Dutch Lexicon

**File**: `src/server/api/sentiment/_lib/sentiment/lexicon.ts`

```typescript
// Simple Dutch sentiment words (expand with full lexicon)
export const dutchLexicon: Record<string, number> = {
  // Positive
  goed: 0.8,
  geweldig: 1.0,
  uitstekend: 0.9,
  tevreden: 0.7,
  blij: 0.8,

  // Negative
  slecht: -0.8,
  verschrikkelijk: -1.0,
  teleurgesteld: -0.7,
  boos: -0.8,
  ontevreden: -0.9,

  // Healthcare-specific
  zorgkosten: -0.3,
  wachttijd: -0.4,
  'eigen risico': -0.5,
  kwaliteit: 0.6,
  toegankelijk: 0.7,

  // ... add more from Pattern.nl or custom corpus
}

export function loadLexicon(): Record<string, number> {
  return dutchLexicon
}
```

#### Step 2: Implement Analyzer

**File**: `src/server/api/sentiment/_lib/sentiment/analyzer.ts`

```typescript
import Sentiment from 'sentiment'
import { franc } from 'franc-min'
import { loadLexicon } from './lexicon'
import type { RawMention, ProcessedMention } from '~/types/sentiment'
import crypto from 'crypto'

const analyzer = new Sentiment()
const lexicon = loadLexicon()

// Register custom Dutch lexicon
analyzer.registerLanguage('nl', lexicon)

export function analyzeSentiment(mentions: RawMention[]): ProcessedMention[] {
  return mentions.filter(isDutchHealthcare).map(processMention)
}

function isDutchHealthcare(mention: RawMention): boolean {
  // Language check (skip if too short)
  if (mention.text.length > 50) {
    const lang = franc(mention.text)
    if (lang !== 'nld') return false
  }

  // Keyword check
  const keywords = /\b(zorg|zorgverzekering|gezondheidszorg|zorgkosten|ziekenhuis)\b/i
  return keywords.test(mention.text)
}

function processMention(mention: RawMention): ProcessedMention {
  const result = analyzer.analyze(mention.text, { language: 'nl' })

  // Calculate confidence (0-1 based on word count)
  const wordCount = mention.text.split(/\s+/).length
  const confidence = Math.min(wordCount / 20, 1.0) // Max confidence at 20 words

  // Normalize score to [-1, 1]
  const score = Math.max(-1, Math.min(1, result.score / 10))

  // Classify sentiment
  let sentiment: 'positive' | 'neutral' | 'negative'
  if (score > 0.1 && confidence > 0.6) {
    sentiment = 'positive'
  } else if (score < -0.1 && confidence > 0.6) {
    sentiment = 'negative'
  } else {
    sentiment = 'neutral'
  }

  // Calculate engagement weight
  const weight = calculateWeight(mention.engagement)

  return {
    sourceId: mention.sourceId,
    sentiment,
    sentimentScore: score,
    confidence,
    weight,
    timestamp: mention.timestamp,
    contentHash: hashContent(mention.text),
  }
}

function calculateWeight(engagement: any): number {
  const total =
    (engagement.likes || 0) +
    (engagement.shares || 0) +
    (engagement.replies || 0) +
    (engagement.upvotes || 0)
  return 1.0 * (1 + Math.log10(total + 1))
}

function hashContent(text: string): string {
  return crypto.createHash('md5').update(text.toLowerCase().trim()).digest('hex')
}
```

---

### Phase 3: API Endpoint (30 minutes)

#### Create Main Endpoint

**File**: `src/server/api/sentiment/index.get.ts`

```typescript
import type { SentimentSnapshot } from '~/types/sentiment'
import { generateSnapshot } from './_lib/aggregator'
import { getFromCache, setInCache } from './_lib/storage/cache'

let isRefreshing = false // Prevent duplicate refreshes (FR-023)

export default defineEventHandler(async (event): Promise<SentimentSnapshot> => {
  try {
    // Check cache first (15-minute TTL)
    const cached = getFromCache()
    if (cached) {
      return cached
    }

    // Prevent duplicate refreshes
    if (isRefreshing) {
      // Wait for current refresh to complete
      await new Promise((resolve) => {
        const check = setInterval(() => {
          const updated = getFromCache()
          if (updated) {
            clearInterval(check)
            resolve(updated)
          }
        }, 100)
      })
      return getFromCache()!
    }

    // Generate new snapshot
    isRefreshing = true
    try {
      const snapshot = await generateSnapshot()
      setInCache(snapshot)
      return snapshot
    } finally {
      isRefreshing = false
    }
  } catch (error: any) {
    console.error('Sentiment generation error:', error)

    // Return error response (503)
    throw createError({
      statusCode: 503,
      statusMessage: 'Service Unavailable',
      message: 'Unable to aggregate sentiment data. Please try again in a few minutes.',
      data: {
        error: 'InsufficientData',
        retryAfter: 300,
      },
    })
  }
})
```

#### Implement Cache

**File**: `src/server/api/sentiment/_lib/storage/cache.ts`

```typescript
import type { SentimentSnapshot } from '~/types/sentiment'

let cachedSnapshot: SentimentSnapshot | null = null
let cacheTimestamp: number = 0
const CACHE_TTL = 15 * 60 * 1000 // 15 minutes

export function getFromCache(): SentimentSnapshot | null {
  const now = Date.now()

  if (cachedSnapshot && now - cacheTimestamp < CACHE_TTL) {
    return cachedSnapshot
  }

  return null
}

export function setInCache(snapshot: SentimentSnapshot): void {
  cachedSnapshot = snapshot
  cacheTimestamp = Date.now()
}

export function clearCache(): void {
  cachedSnapshot = null
  cacheTimestamp = 0
}
```

---

### Phase 4: Testing (1 hour)

#### Contract Test

**File**: `tests/contract/sentiment-feed.test.ts`

```typescript
import { describe, it, expect } from 'vitest'
import type { SentimentSnapshot } from '~/types/sentiment'

describe('Sentiment Feed Contract', () => {
  it('returns valid snapshot structure', async () => {
    const response = await $fetch<SentimentSnapshot>('/api/sentiment')

    expect(response).toHaveProperty('timestamp')
    expect(response).toHaveProperty('compositeScore')
    expect(response).toHaveProperty('sentimentLabel')
    expect(response.compositeScore).toBeGreaterThanOrEqual(0)
    expect(response.compositeScore).toBeLessThanOrEqual(100)
    expect(response.hourlyBuckets).toHaveLength(24)
  })

  it('responds within 3 seconds', async () => {
    const start = Date.now()
    await $fetch('/api/sentiment')
    const duration = Date.now() - start

    expect(duration).toBeLessThan(3000)
  })

  // Add more tests from contract...
})
```

---

## Development Workflow

### 1. Local Development

```bash
# Start dev server
npm run dev

# Server runs at http://localhost:3000
# API endpoint: http://localhost:3000/api/sentiment
```

### 2. Test Endpoint

```bash
# cURL
curl http://localhost:3000/api/sentiment | jq

# Or open in browser
# http://localhost:3000/api/sentiment
```

### 3. Run Tests

```bash
# Unit tests
npm run test:unit

# Integration tests
npm run test:integration

# Contract tests
npm run test:unit -- tests/contract
```

### 4. Debugging

**Enable verbose logging**:

```typescript
// In aggregator.ts
console.log(
  'Collecting from sources:',
  sources.map((s) => s.id),
)
console.log('Mentions collected:', mentions.length)
console.log('After filtering:', filtered.length)
console.log('Composite score:', composite)
```

**Check Netlify Functions logs** (after deployment):

```bash
netlify dev # Local Netlify simulation
```

---

## Common Issues & Solutions

### Issue 1: Twitter API 429 (Rate Limit)

**Symptom**: `TwitterAdapter` throws "Too Many Requests"

**Solution**:

```typescript
// Check limiter status before fetch
const counts = limiter.counts()
console.log('Twitter rate limit:', counts)

// Adjust reservoir if needed
const limiter = new Bottleneck({
  reservoir: 300, // Lower limit
  // ...
})
```

### Issue 2: No Dutch content found

**Symptom**: All mentions filtered out

**Solution**:

```typescript
// Relax language detection for short text
function isDutchHealthcare(mention: RawMention): boolean {
  const hasKeywords = /\b(zorg|zorgverzekering)\b/i.test(mention.text)

  if (mention.text.length < 50) {
    return hasKeywords // Skip lang detection for short text
  }

  const lang = franc(mention.text)
  return lang === 'nld' && hasKeywords
}
```

### Issue 3: Spike detection not working

**Symptom**: `isSpikeDetected` always false

**Solution**:

```typescript
// Need 12+ hours of history
if (hourlyBuckets.length < 12) {
  console.warn('Not enough data for spike detection (need 12 hours)')
  return { isSpike: false }
}

// Check stddev isn't zero (flat data)
if (stdDev < 0.1) {
  console.warn('Standard deviation too low (flat sentiment)')
  return { isSpike: false }
}
```

### Issue 4: Cache not clearing

**Symptom**: Old data served after >15 minutes

**Solution**:

```typescript
// Add manual cache clear endpoint (dev only)
export default defineEventHandler(async (event) => {
  if (process.env.NODE_ENV === 'development') {
    clearCache()
    return { cleared: true }
  }
  throw createError({ statusCode: 404 })
})
```

---

## Deployment Checklist

### Pre-Deployment

- [ ] All environment variables set in Netlify UI
- [ ] Twitter/Reddit API keys tested
- [ ] Dutch lexicon file included
- [ ] Data directory initialized
- [ ] Tests passing (`npm run test:unit && npm run test:integration`)
- [ ] Build succeeds (`npm run generate`)

### Netlify Configuration

**File**: `netlify.toml` (update if needed)

```toml
[build]
  command = "npm run generate"
  publish = "dist"
  functions = "dist/server"

[functions]
  node_bundler = "esbuild"

[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/:splat"
  status = 200
```

### Environment Variables (Netlify Dashboard)

1. Go to Site Settings → Environment Variables
2. Add:
   - `TWITTER_BEARER_TOKEN`
   - `REDDIT_CLIENT_ID`
   - `REDDIT_CLIENT_SECRET`
   - `ALERT_WEBHOOK_URL` (optional)
   - `NODE_ENV=production`

### Deploy

```bash
# Via Netlify CLI
netlify deploy --prod

# Or push to main branch (auto-deploy configured)
git push origin 002-sentiment-snapshot-service
```

---

## Next Steps

1. **Implement Remaining Sources** (Reddit, Mastodon, RSS, Tweakers)
   - Follow TwitterAdapter pattern
   - Add rate limiters per source
   - Test each individually

2. **Add Spike Detection Logic**
   - Implement 12-hour rolling mean calculation
   - Use `simple-statistics` library
   - Write unit tests with synthetic data

3. **Persist Historical Data**
   - Create bucket rotation script
   - Implement daily aggregation
   - Set up cron job (GitHub Actions or Netlify scheduled functions)

4. **Set Up Monitoring**
   - Configure alert webhook
   - Add Sentry or LogRocket for error tracking
   - Create Grafana dashboard (optional)

5. **Optimize Performance**
   - Profile slow queries
   - Add Redis cache if file-based is too slow
   - Implement parallel source fetching

---

## Resources

### Documentation

- [Nuxt 3 Server Routes](https://nuxt.com/docs/guide/directory-structure/server)
- [Netlify Functions](https://docs.netlify.com/functions/overview/)
- [Sentiment npm package](https://www.npmjs.com/package/sentiment)
- [Bottleneck rate limiter](https://www.npmjs.com/package/bottleneck)

### Dutch Sentiment Resources

- [Pattern.nl Sentiment Lexicon](https://github.com/clips/pattern/wiki/Sentiment) (Python, port to JS)
- [DutchSemCor](https://github.com/cltl/DutchSemCor) (Dutch semantic corpus)
- [VADER-NL](https://github.com/Basvdlouw/vader-dutch) (VADER adapted for Dutch)

### API Documentation

- [Twitter API v2 Docs](https://developer.twitter.com/en/docs/twitter-api)
- [Reddit API Docs](https://www.reddit.com/dev/api/)
- [Mastodon API Docs](https://docs.joinmastodon.org/api/)

---

## Support

- **Questions**: Post in project Slack channel or GitHub Discussions
- **Bugs**: File issue with label `002-sentiment-snapshot-service`
- **Spec Clarifications**: Refer to [spec.md](./spec.md) or [data-model.md](./data-model.md)

---

**Estimated Total Time**: 6-8 hours for MVP (1 source + basic aggregation + endpoint)

**Full Feature Complete**: 16-24 hours (5 sources + spike detection + monitoring + tests)

**Good luck!** 🚀

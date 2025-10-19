# Research: Sentiment Snapshot Service

**Feature**: 002-sentiment-snapshot-service  
**Date**: 2025-10-11  
**Purpose**: Resolve technical unknowns and establish implementation patterns

## Research Questions

### 1. Dutch Sentiment Analysis Library

**Question**: What library should be used for Dutch language sentiment analysis with 85%+ accuracy requirement?

**Decision**: Use `sentiment` npm package with custom Dutch lexicon

**Rationale**:

- **sentiment** (npm): Lightweight (~10KB), lexicon-based analyzer that supports custom dictionaries
- Allows loading Dutch sentiment lexicons (e.g., Pattern.nl Dutch wordlist, or Dutch VADER adaptation)
- No external API calls (privacy-compliant, no PII exposure)
- Deterministic results (testable, reproducible)
- Works in Node.js serverless environment (Netlify Functions compatible)

**Alternatives Considered**:

- **compromise** + **compromise-sentences**: English-focused, poor Dutch support
- **Google Cloud Natural Language API**: Requires external API calls, cost concerns, PII exposure risk
- **Azure Text Analytics**: Similar concerns to Google, plus authentication complexity
- **spaCy (Python)**: Excellent Dutch support but requires Python runtime (project is TypeScript/Node)
- **Hugging Face Transformers**: High accuracy but too heavy for serverless (<50MB limit), cold start latency

**Implementation Notes**:

- Download Dutch sentiment lexicon (e.g., from Pattern.nl or create custom from DutchSemCor)
- Lexicon format: `{ "word": score }` where score is -1.0 (negative) to +1.0 (positive)
- Fallback: If custom lexicon unavailable, use translated VADER lexicon as baseline

**Dependency**:

```json
{
  "sentiment": "^5.0.2"
}
```

**Size**: ~10KB (meets <200KB per Constitution)

---

### 2. HTTP Client for Source Fetching

**Question**: What HTTP client should be used for fetching data from multiple public sources with retry logic and rate limiting?

**Decision**: Use native `fetch` (Node 18+) with `p-retry` and `p-queue` for orchestration

**Rationale**:

- **Native fetch**: Built into Node.js 18+, no additional dependency, standard API
- **p-retry**: Exponential backoff retry logic (3 attempts per FR-022), <5KB
- **p-queue**: Rate limiting and concurrency control (respect source limits per FR-016), ~10KB
- Combined solution <15KB total vs axios (~100KB) or got (~200KB)
- Supports AbortController for timeout handling
- Works seamlessly in Netlify Functions

**Alternatives Considered**:

- **axios**: Popular but heavyweight (~100KB), more than needed for simple REST/RSS calls
- **got**: Powerful but heavy (~200KB), overkill for this use case
- **node-fetch**: Polyfill no longer needed (Node 18+ has native fetch)
- **undici**: Fast but adds complexity, native fetch sufficient

**Implementation Pattern**:

```typescript
import pRetry from 'p-retry'
import PQueue from 'p-queue'

const queue = new PQueue({ concurrency: 3 }) // 3 sources max parallel

async function fetchWithRetry(url: string) {
  return pRetry(
    async () => {
      const response = await fetch(url, { signal: AbortSignal.timeout(10000) })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      return response.json()
    },
    {
      retries: 3,
      factor: 2, // 1s, 2s, 4s backoff
      onFailedAttempt: (error) => {
        console.warn(`Attempt ${error.attemptNumber} failed. Retrying...`)
      },
    },
  )
}
```

**Dependencies**:

```json
{
  "p-retry": "^6.2.0",
  "p-queue": "^8.0.1"
}
```

**Combined Size**: ~15KB

---

### 3. Data Persistence Strategy

**Question**: How should hourly buckets, 30-day history, and daily aggregates be persisted with <3s read performance requirement (SC-001)?

**Decision**: File-based JSON storage with in-memory caching (15-minute TTL)

**Rationale**:

- **File-based JSON**: Simple, no external database needed, version-controlled data possible
- **In-memory cache**: Serves 100 concurrent users (SC-010) from RAM, <3s load time (SC-001)
- **Netlify Functions**: Can read from filesystem (read-only deployment)
- **Storage location**: `/server/data/sentiment/` committed to repo for simplicity (aggregates only, no PII)
- **Rotation strategy**: Hourly buckets in `buckets-YYYY-MM-DD.json`, daily aggregates in `daily-YYYY-MM.json`

**Alternatives Considered**:

- **SQLite**: Adds ~1MB dependency, requires write access (Functions are read-only after deploy)
- **PostgreSQL/MySQL**: Overkill for volume (<10K records), adds cost, operational complexity
- **Redis**: Requires external service, cost, Netlify doesn't provide built-in Redis
- **Netlify Blobs**: New feature, but overkill for append-only time-series data
- **KV stores (Vercel KV, Cloudflare KV)**: Platform-specific, vendor lock-in

**Implementation Pattern**:

```typescript
// In-memory cache
let cachedSnapshot: SentimentSnapshot | null = null
let cacheTimestamp: number = 0
const CACHE_TTL = 15 * 60 * 1000 // 15 minutes

export async function getSnapshot(): Promise<SentimentSnapshot> {
  const now = Date.now()

  if (cachedSnapshot && now - cacheTimestamp < CACHE_TTL) {
    return cachedSnapshot // <10ms response
  }

  // Cache miss: regenerate
  const snapshot = await aggregateFromSources()
  cachedSnapshot = snapshot
  cacheTimestamp = now

  return snapshot
}
```

**File Structure**:

```
server/data/sentiment/
├── buckets-2025-10-11.json     # Today's 24 hourly buckets
├── buckets-2025-10-10.json     # Yesterday (for backfill)
├── daily-2025-10.json          # October daily aggregates (30 days retained)
└── config.json                 # Source configs, rate limits
```

**Rotation Script**: Cron job or GitHub Action to aggregate hourly→daily after 30 days

**Trade-offs**:

- **Pros**: Zero infrastructure, fast reads, simple debugging (inspect JSON files)
- **Cons**: Write operations require redeployment (acceptable for append-only aggregates)
- **Mitigation**: Netlify build hooks triggered every 15 minutes during active hours (6 AM-midnight CET)

---

### 4. Source Rate Limit Handling Patterns

**Question**: How should rate limits be enforced across 5+ sources with different limit schemes (per-second, per-minute, per-15-min)?

**Decision**: Per-source `Bottleneck` rate limiters with quota tracking

**Rationale**:

- **Bottleneck** library: Industry-standard rate limiter, supports complex rules (~20KB)
- Per-source configuration: Each source gets own limiter instance
- Quota tracking: Count requests, pause when approaching limit
- Graceful degradation: Skip source if quota exhausted (FR-010 allows 2/5 minimum)

**Implementation Pattern**:

```typescript
import Bottleneck from 'bottleneck'

const limiters = {
  twitter: new Bottleneck({
    reservoir: 450, // 450 requests
    reservoirRefreshAmount: 450,
    reservoirRefreshInterval: 15 * 60 * 1000, // per 15 minutes
    maxConcurrent: 1,
  }),
  reddit: new Bottleneck({
    minTime: 1000, // 1 request per second (60/min)
    maxConcurrent: 1,
  }),
  mastodon: new Bottleneck({
    reservoir: 300,
    reservoirRefreshInterval: 5 * 60 * 1000, // 300 per 5 minutes
    maxConcurrent: 1,
  }),
}

async function fetchFromTwitter(query: string) {
  return limiters.twitter.schedule(() =>
    fetchWithRetry(`https://api.twitter.com/2/tweets/search/recent?query=${query}`),
  )
}
```

**Alternatives Considered**:

- **p-throttle**: Simpler but less flexible for complex quota schemes
- **Manual tracking**: Error-prone, reinventing the wheel
- **rate-limiter-flexible**: Designed for Redis backends (overkill)

**Dependency**:

```json
{
  "bottleneck": "^2.19.5"
}
```

**Size**: ~20KB

---

### 5. Statistical Spike Detection Implementation

**Question**: How to efficiently calculate 2 standard deviations from 12-hour rolling mean for spike detection (FR-005)?

**Decision**: Use `simple-statistics` library for mean and standard deviation calculations

**Rationale**:

- **simple-statistics**: Pure JS, tree-shakeable, <10KB for mean/stddev functions
- Accurate implementations of statistical functions
- No native Math equivalent for std dev in JavaScript
- Works in serverless environment

**Implementation Pattern**:

```typescript
import { mean, standardDeviation } from 'simple-statistics'

function detectSpike(
  currentScore: number,
  last12Hours: number[],
): { isSpike: boolean; direction?: 'positive' | 'negative' } {
  if (last12Hours.length < 12) {
    return { isSpike: false } // Need 12 hours of data
  }

  const avg = mean(last12Hours)
  const stdDev = standardDeviation(last12Hours)
  const threshold = 2 * stdDev
  const deviation = currentScore - avg

  if (Math.abs(deviation) >= threshold) {
    return {
      isSpike: true,
      direction: deviation > 0 ? 'positive' : 'negative',
    }
  }

  return { isSpike: false }
}
```

**Alternatives Considered**:

- **math.js**: Comprehensive but heavy (~500KB), overkill
- **stdlib**: Accurate but large bundle (~2MB)
- **Manual implementation**: Prone to floating-point errors, not worth risk

**Dependency**:

```json
{
  "simple-statistics": "^7.8.3"
}
```

**Size**: ~10KB (tree-shaken)

---

### 6. Logging and Monitoring Strategy

**Question**: How to implement diagnostic logging (FR-019) and critical alerts (FR-020) in Netlify Functions?

**Decision**: Use Netlify's built-in logging + structured console output, external alerting via webhook to monitoring service

**Rationale**:

- **Console logging**: Captured automatically by Netlify Functions logs
- **Structured format**: JSON logs for parsing by external tools
- **Log levels**: DEBUG, INFO, WARN, ERROR
- **Alerts**: POST to Netlify webhook or external service (e.g., PagerDuty, Slack) for critical failures

**Implementation Pattern**:

```typescript
enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

function log(level: LogLevel, message: string, meta?: Record<string, any>) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...meta,
  }
  console.log(JSON.stringify(entry))

  // Critical alert conditions (FR-020)
  if (level === LogLevel.ERROR && meta?.critical) {
    sendAlert(entry)
  }
}

async function sendAlert(entry: any) {
  if (process.env.ALERT_WEBHOOK_URL) {
    await fetch(process.env.ALERT_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry),
    })
  }
}

// Usage
log(LogLevel.ERROR, 'All sources failed', {
  critical: true,
  sources: ['twitter', 'reddit', 'mastodon', 'rss', 'tweakers'],
})
```

**Alert Triggers** (FR-020):

1. All 5 sources unavailable for >5 minutes
2. Data staleness >60 minutes
3. Rate limit violation detected (e.g., 429 response)

**Alternatives Considered**:

- **Winston/Bunyan**: Overkill for serverless, large bundles
- **Pino**: Fast but adds complexity
- **console.log**: Simple but unstructured (chosen with JSON wrapper)

**No additional dependencies needed** (native console + fetch)

---

### 7. Dutch Healthcare Keyword Filtering

**Question**: How to efficiently filter content for healthcare keywords ("zorg", "zorgverzekering", "gezondheidszorg") across sources?

**Decision**: Regex-based matching with word boundaries, case-insensitive

**Implementation Pattern**:

```typescript
const HEALTHCARE_KEYWORDS_REGEX =
  /\b(zorg|zorgverzekering|gezondheidszorg|zorgkosten|ziekenhuis|huisarts|verzekering|premie|eigen\s?risico)\b/i

function containsHealthcareKeywords(text: string): boolean {
  return HEALTHCARE_KEYWORDS_REGEX.test(text)
}

// For API query strings (Twitter, Reddit)
const QUERY_KEYWORDS = '(zorg OR zorgverzekering OR gezondheidszorg OR zorgkosten)'
```

**Keywords**:

- Primary: zorg, zorgverzekering, gezondheidszorg
- Secondary: zorgkosten, ziekenhuis, huisarts, verzekering, premie, eigen risico

**Rationale**:

- Regex is fast for keyword matching (~microseconds per text)
- Word boundaries prevent false matches (e.g., "verzorging" doesn't match "zorg")
- Case-insensitive to catch "Zorg", "ZORG", etc.
- No NLP needed for simple keyword detection

---

### 8. Language Detection for Dutch Content

**Question**: How to ensure 90%+ accuracy filtering for Dutch language content (SC-012)?

**Decision**: Use `franc-min` for lightweight language detection

**Rationale**:

- **franc-min**: Minimal language detector (~50KB), 50+ languages including Dutch
- Fast (~1ms per text)
- Accuracy >90% for texts >50 characters
- Works offline (no API calls)

**Implementation Pattern**:

```typescript
import { franc } from 'franc-min'

function isDutch(text: string): boolean {
  const lang = franc(text)
  return lang === 'nld' // ISO 639-3 code for Dutch
}

function filterDutchContent(items: Array<{ text: string }>): typeof items {
  return items.filter((item) => {
    const isDutchText = item.text.length > 50 ? isDutch(item.text) : true // Skip detection for short text
    const hasKeywords = containsHealthcareKeywords(item.text)
    return isDutchText && hasKeywords
  })
}
```

**Alternatives Considered**:

- **langdetect** (Python port): Requires Python, not compatible
- **cld** (Compact Language Detector): Native addon, deployment complexity
- **Google Cloud Translation API**: External service, cost, latency
- **Manual heuristics**: Unreliable (e.g., checking for "de", "het", "een")

**Dependency**:

```json
{
  "franc-min": "^6.2.0"
}
```

**Size**: ~50KB

---

## Technology Stack Summary

### Production Dependencies

| Package             | Purpose                                 | Size  | Justification                                           |
| ------------------- | --------------------------------------- | ----- | ------------------------------------------------------- |
| `sentiment`         | Dutch sentiment analysis                | ~10KB | Lexicon-based analyzer, custom Dutch dictionary support |
| `p-retry`           | Retry logic with exponential backoff    | ~3KB  | Source failure handling (FR-022)                        |
| `p-queue`           | Rate limiting and concurrency           | ~10KB | Parallel source fetching with limits                    |
| `bottleneck`        | Per-source rate limit enforcement       | ~20KB | Complex quota tracking (FR-016)                         |
| `simple-statistics` | Statistical calculations (mean, stddev) | ~10KB | Spike detection (FR-005)                                |
| `franc-min`         | Dutch language detection                | ~50KB | Content filtering (SC-012)                              |

**Total**: ~103KB (well under 200KB per-dependency Constitution limit)

### DevDependencies (Testing)

Already in project:

- `vitest` (unit/integration tests)
- `@playwright/test` (e2e tests)
- `@vue/test-utils` (component tests)

### Alternatives Rejected

Documented in individual research sections above. Key theme: Avoided heavy ML/NLP libraries (transformers, spaCy) due to serverless cold-start constraints and bundle size limits.

---

## Best Practices

### 1. Source Adapter Pattern

**Pattern**: Abstract base class for all source adapters

```typescript
abstract class SourceAdapter {
  abstract name: string
  abstract fetch(query: string): Promise<RawMention[]>
  abstract respectsRateLimit(): boolean
}

class TwitterAdapter extends SourceAdapter {
  name = 'twitter'
  // ... implementation
}
```

**Benefits**:

- Testable in isolation
- Easy to add new sources
- Consistent error handling

### 2. Graceful Degradation

**Pattern**: Continue with partial data when sources fail (FR-010)

```typescript
async function aggregateFromSources(): Promise<SentimentSnapshot> {
  const results = await Promise.allSettled([
    fetchFromTwitter(),
    fetchFromReddit(),
    fetchFromMastodon(),
    fetchFromRSS(),
    fetchFromTweakers(),
  ])

  const successful = results.filter((r) => r.status === 'fulfilled')
  const failed = results.filter((r) => r.status === 'rejected')

  if (successful.length < 2) {
    throw new InsufficientDataError('At least 2 sources required')
  }

  // Log warnings for failed sources
  failed.forEach((f) => log(LogLevel.WARN, `Source failed: ${f.reason}`))

  return aggregate(successful.map((s) => s.value))
}
```

### 3. Content Deduplication

**Pattern**: Hash-based duplicate detection (FR-015)

```typescript
import crypto from 'crypto'

function hashContent(text: string): string {
  return crypto.createHash('md5').update(text.toLowerCase().trim()).digest('hex')
}

function deduplicateMentions(mentions: RawMention[]): RawMention[] {
  const seen = new Set<string>()
  return mentions.filter((m) => {
    const hash = hashContent(m.text)
    if (seen.has(hash)) return false
    seen.add(hash)
    return true
  })
}
```

### 4. Engagement Weighting

**Pattern**: Logarithmic scaling for engagement metrics (FR-013)

```typescript
function calculateWeight(engagement: { likes: number; shares: number }): number {
  const baseWeight = 1.0
  const engagementScore = engagement.likes + engagement.shares
  return baseWeight * (1 + Math.log10(engagementScore + 1))
}
```

**Rationale**: Logarithmic scaling prevents viral posts from dominating sentiment (100K likes ≈ 5x weight vs 100 likes ≈ 2x weight)

---

## Security Considerations

1. **No PII Storage** (FR-017): Never persist usernames, @mentions, email addresses
   - Strip before storage: `text.replace(/@\w+/g, '[mention]')`

2. **Rate Limit Compliance** (FR-016): Use `Bottleneck` per source, monitor quota usage

3. **Input Sanitization**: Validate all API responses before processing

   ```typescript
   const schema = z.object({
     text: z.string(),
     timestamp: z.string().datetime(),
     engagement: z.object({
       likes: z.number().nonnegative(),
     }),
   })
   ```

4. **Environment Variables**: Store API keys securely
   ```
   TWITTER_BEARER_TOKEN=...
   REDDIT_CLIENT_ID=...
   ALERT_WEBHOOK_URL=...
   ```

---

## Performance Optimizations

1. **Parallel Source Fetching**: Use `Promise.all` with `p-queue` to fetch from sources concurrently (max 3 parallel)

2. **In-Memory Caching**: Cache snapshot for 15 minutes (CACHE_TTL), serve from RAM for <10ms response

3. **Lazy Loading**: Only load sentiment lexicon once at module initialization

4. **JSON Streaming**: For large bucket files, consider using streaming JSON parser (not needed for current scale)

---

## Testing Strategy

### Unit Tests (Vitest)

- Source adapters (mock HTTP responses)
- Sentiment analyzer (Dutch test corpus)
- Spike detector (synthetic time-series data)
- Engagement weighting (known input/output pairs)

### Integration Tests (Vitest)

- End-to-end aggregation with mock sources
- Partial source failure scenarios
- Rate limit handling
- Cache TTL behavior

### Contract Tests

- API endpoint schema validation
- Response time <3s (SC-001)
- Error response formats

### E2E Tests (Playwright)

- Dashboard loads with sentiment data
- Stale data indicator appears
- Spike visualization displays

---

## Deployment Considerations

### Netlify Build Configuration

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

### Environment Variables (Netlify UI)

```
TWITTER_BEARER_TOKEN=<token>
REDDIT_CLIENT_ID=<id>
REDDIT_CLIENT_SECRET=<secret>
ALERT_WEBHOOK_URL=<url>
NODE_ENV=production
```

### Scheduled Refresh

**Option 1**: Netlify Build Hooks (triggered by cron service)

```bash
# External cron calls webhook every 15 minutes
curl -X POST https://api.netlify.com/build_hooks/<hook_id>
```

**Option 2**: GitHub Actions workflow

```yaml
on:
  schedule:
    - cron: '*/15 6-23 * * *' # Every 15 min, 6 AM-11 PM CET
```

---

## Open Questions / Future Research

1. **Dutch Sentiment Lexicon Source**: Need to identify or create high-quality Dutch sentiment dictionary
   - Consider Pattern.nl lexicon (open source)
   - Alternative: Translate VADER lexicon to Dutch
   - Validate accuracy with labeled Dutch healthcare tweets

2. **Historical Data Migration**: How to handle schema changes in bucket JSON files?
   - Versioning strategy for file format
   - Migration scripts for breaking changes

3. **Cost Monitoring**: Track API quota usage and Netlify Function invocation costs
   - Set up billing alerts
   - Monitor rate limit consumption

---

## Conclusion

All technical unknowns from the plan's Technical Context have been resolved. The stack is lightweight (~103KB dependencies), serverless-friendly (Netlify Functions), and Constitution-compliant (static-first, simple, modular). Ready to proceed to Phase 1 (data model and contracts).

**Next Step**: Generate `data-model.md` and API contracts in `contracts/sentiment-feed.md`.

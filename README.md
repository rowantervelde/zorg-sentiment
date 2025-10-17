# Zorg-sentiment dashboard

A Nuxt 3 static dashboard that tracks the national mood around Dutch healthcare insurance. It fuses live sentiment feeds, topic spikes, and AI-crafted commentary into a playful, accessible single-page experience.

## Quick start

```cmd
npm install
npm run dev
```

Key scripts:

- `npm run generate` – build the static site for deployment.
- `npm run analyze:bundle` – check the JS budget (≤180 KB uncompressed).
- `npm run test:unit` / `npm run test:integration` – run the Vitest suites.
- `npm run test:playwright` – smoke-test the generated site in Playwright.
- `npm run test:accessibility` – execute the Axe-based accessibility sweep.

For the full workflow (including data stubs and API contract details), see `specs/001-a-playful-web/quickstart.md`.

## API Endpoint

The dashboard consumes sentiment data from a server API endpoint:

### `GET /api/sentiment`

Returns aggregated sentiment data with current score, 24-hour trend, spike detection, topic breakdown, and data quality metrics.

**Response (200 OK)**:

```json
{
  "current_score": 45.2,
  "trend_24h": {
    "direction": "up",
    "change_percentage": 3.5,
    "buckets": [...] // 24 hourly buckets
  },
  "spike": {
    "is_spike": false,
    "direction": null
  },
  "topics": {
    "insurance": { "sentiment": 42.0, "mention_count": 156 },
    "waiting-times": { "sentiment": 38.5, "mention_count": 203 },
    "quality": { "sentiment": 55.3, "mention_count": 98 },
    "accessibility": { "sentiment": 48.7, "mention_count": 67 }
  },
  "historical_context": {
    "max_30d": 78.9,
    "min_30d": 32.1
  },
  "data_quality": {
    "source_count": 5,
    "total_posts": 524,
    "staleness_minutes": 12,
    "confidence": "high",
    "language_filter_rate": 8.5
  },
  "data_sources": [
    {
      "source_id": "twitter",
      "status": "available",
      "last_success": "2025-10-17T14:30:00Z"
    }
    // ... more sources
  ]
}
```

**Performance SLOs**:

- Response time: p95 < 3 seconds
- Availability: 99.5% during active hours (6 AM - midnight CET)
- Cache TTL: 15 minutes

**Error Responses**:

- `500 Internal Server Error`: All data sources unavailable
- `503 Service Unavailable`: Temporary failure, retry with exponential backoff

## Environment Variables

The sentiment snapshot service requires API credentials for data sources:

```bash
# Twitter/X API (required)
TWITTER_BEARER_TOKEN=your_twitter_bearer_token_here

# Reddit API (optional - provides additional coverage)
REDDIT_CLIENT_ID=your_reddit_client_id
REDDIT_CLIENT_SECRET=your_reddit_client_secret

# Mastodon instance (optional)
MASTODON_ACCESS_TOKEN=your_mastodon_token
MASTODON_INSTANCE_URL=https://mastodon.social

# Monitoring & Alerts (optional)
ALERT_WEBHOOK_URL=https://your-monitoring-service/webhook
```

**Rate Limits** (enforced per source):

- Twitter: 100 requests/hour
- Reddit: 60 requests/hour
- Mastodon: 300 requests/hour
- RSS feeds: No authentication required

**Security Notes**:

- All credentials stored in environment variables (never committed to git)
- No PII (personally identifiable information) is stored
- Content is anonymized (author IDs hashed, not displayed publicly)

## Sentiment methodology

Sentiment scores arrive as 0–100 composites derived from weighted social chatter, news, and direct feedback. We classify each score into a tone band that drives UI messaging and color tokens.

| Label  | Score range | Tone     | Voice guidelines                              |
| ------ | ----------- | -------- | --------------------------------------------- |
| Bleak  | 0–19        | Negative | Urgent, empathetic, focus on mitigation       |
| Tense  | 20–39       | Negative | Cautiously concerned, acknowledge friction    |
| Mixed  | 40–59       | Neutral  | Matter-of-fact, highlight mixed perspectives  |
| Upbeat | 60–79       | Positive | Optimistic but grounded, encourage engagement |
| Sunny  | 80–100      | Positive | Celebratory, emphasise momentum               |

Additional rules:

- **Spike detection** – a spike flag surfaces when the latest score deviates by ≥2 standard deviations from the prior 12 hours.
- **Polarising topics** – we mark a topic when both positive and negative shares exceed 25% of mentions.
- **Freshness** – data older than 30 minutes is flagged as stale and called out in the UI and accessibility summary.

## Data Sources

The sentiment engine aggregates data from multiple sources:

1. **Twitter/X** - Dutch healthcare discussions (`#zorg`, `ziekenhuis`, `verzekering`, etc.)
2. **Reddit** - r/Netherlands, r/thenetherlands healthcare threads
3. **Mastodon** - Dutch healthcare social network posts
4. **RSS Feeds** - Major Dutch news outlets (NOS, NU.nl)
5. **Tweakers** - Tech-savvy Dutch community healthcare discussions

**Source Availability Tracking**:

- Each source reports health status every 15 minutes
- Dashboard shows degraded mode if 2+ sources are unavailable
- Critical alert triggered if all sources fail for >5 minutes

**Content Filtering**:

- Dutch language detection (filters out non-NL content)
- Healthcare keyword matching (13 healthcare-specific terms)
- Duplicate detection via content hashing
- Topic extraction (insurance, waiting-times, quality, accessibility)

## Architecture highlights

- **Nuxt 3 static** build with server API routes for sentiment aggregation
- **Nitro server** powers API endpoints with 15-minute response caching
- **Tailwind CSS** powers the design system; no additional component libraries
- **TypeScript everywhere** with strict linting via ESLint 9
- **Testing pyramid**:
  - Contract tests (API schema validation)
  - Unit tests (utilities, services, composables, components) - 90+ tests
  - Integration tests (end-to-end scenarios) - 19 tests
  - Playwright smoke tests (UI verification)
- **Rate limiting** via Bottleneck for API compliance
- **Retry logic** with exponential backoff (p-retry)
- **Sentiment analysis** using `sentiment` library with Dutch language support

**File Structure**:

```
src/server/api/sentiment/
  index.get.ts              # Main API endpoint
  _lib/
    aggregator.ts           # Multi-source aggregation
    analyzer.ts             # Sentiment scoring & topic extraction
    spike-detector.ts       # 2σ statistical spike detection
    rate-limiter.ts         # Source-specific rate limiting
    logger.ts               # Structured logging
    sources/
      base.ts               # IDataSource interface
      twitter.ts            # Twitter adapter
      reddit.ts             # Reddit adapter
      mastodon.ts           # Mastodon adapter
      rss.ts                # RSS feed adapter
      tweakers.ts           # Tweakers adapter
  data/sentiment/
    buckets-*.json          # Hourly aggregated data
```

## Deployment

The site is optimised for static hosting (e.g. Netlify). Deploy `.output/public` from `npm run generate`. A CI workflow in `.github/workflows/ci.yml` installs dependencies, lints, executes unit/integration tests, runs Playwright, builds the static bundle, and enforces performance and accessibility budgets.

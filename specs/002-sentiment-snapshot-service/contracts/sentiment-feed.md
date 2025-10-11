# API Contract: Sentiment Feed

**Feature**: 002-sentiment-snapshot-service  
**Endpoint**: `GET /api/sentiment`  
**Purpose**: Retrieve current sentiment snapshot with 24-hour trend data  
**Contract Version**: 1.0.0

---

## Endpoint Details

### GET /api/sentiment

**Description**: Returns the current aggregated sentiment snapshot for Dutch healthcare discussions, including the composite score (0-100), mood label, 24-hour trend data, spike detection, and 30-day historical context.

**Authentication**: None required (public endpoint)

**Rate Limiting**:

- 100 requests per minute per IP
- Cached response (15-minute TTL), so frequent polling returns same data

**Performance SLA**:

- Response time: <3 seconds (SC-001)
- Availability: 99.5% during active hours (6 AM - midnight CET)

---

## Request

### HTTP Method

```
GET
```

### URL

```
/api/sentiment
```

### Query Parameters

None (future: may add `?date=YYYY-MM-DD` for historical snapshots)

### Headers

| Header   | Required | Value              | Description               |
| -------- | -------- | ------------------ | ------------------------- |
| `Accept` | No       | `application/json` | Response format (default) |

### Request Example

```http
GET /api/sentiment HTTP/1.1
Host: zorg-sentiment.netlify.app
Accept: application/json
```

```bash
curl https://zorg-sentiment.netlify.app/api/sentiment
```

---

## Response

### Success Response (200 OK)

**Content-Type**: `application/json`

**Schema**: See [data-model.md](../data-model.md#1-sentimentsnapshot) for complete `SentimentSnapshot` interface

**Response Body**:

```json
{
  "timestamp": "2025-10-11T14:30:00.000Z",
  "windowStart": "2025-10-11T14:00:00.000Z",
  "windowEnd": "2025-10-11T15:00:00.000Z",
  "positiveCount": 45.2,
  "neutralCount": 30.1,
  "negativeCount": 24.7,
  "totalMentions": 100.0,
  "compositeScore": 60,
  "sentimentLabel": "Upbeat",
  "isSpikeDetected": false,
  "spikeDirection": null,
  "min30Day": 35,
  "max30Day": 78,
  "hourlyBuckets": [
    {
      "hour": "2025-10-10T14:00:00.000Z",
      "positive": 38.5,
      "neutral": 32.0,
      "negative": 29.5,
      "composite": 54
    },
    {
      "hour": "2025-10-10T15:00:00.000Z",
      "positive": 42.1,
      "neutral": 28.3,
      "negative": 29.6,
      "composite": 56
    }
    // ... 22 more buckets (24 total)
  ],
  "sourcesUsed": ["twitter", "reddit", "mastodon", "rss", "tweakers"],
  "sourcesUnavailable": [],
  "isStale": false,
  "ageMinutes": 2
}
```

**Field Descriptions**:

| Field                       | Type              | Description                                               | Validation                                           |
| --------------------------- | ----------------- | --------------------------------------------------------- | ---------------------------------------------------- |
| `timestamp`                 | string (ISO 8601) | When snapshot was generated                               | Valid datetime                                       |
| `windowStart`               | string (ISO 8601) | Start of current hourly aggregation window                | Valid datetime                                       |
| `windowEnd`                 | string (ISO 8601) | End of current hourly window                              | Valid datetime, > windowStart                        |
| `positiveCount`             | number            | Weighted count of positive mentions                       | ≥ 0                                                  |
| `neutralCount`              | number            | Weighted count of neutral mentions                        | ≥ 0                                                  |
| `negativeCount`             | number            | Weighted count of negative mentions                       | ≥ 0                                                  |
| `totalMentions`             | number            | Sum of positive + neutral + negative                      | ≥ 0                                                  |
| `compositeScore`            | number            | Normalized sentiment (0=most negative, 100=most positive) | 0-100 integer                                        |
| `sentimentLabel`            | string            | Human-readable mood label                                 | "Bleak" \| "Tense" \| "Mixed" \| "Upbeat" \| "Sunny" |
| `isSpikeDetected`           | boolean           | True if current sentiment deviates ≥2σ from 12-hour mean  | true \| false                                        |
| `spikeDirection`            | string \| null    | Direction of spike if detected                            | "positive" \| "negative" \| null                     |
| `min30Day`                  | number            | Minimum composite score in past 30 days                   | 0-100 integer                                        |
| `max30Day`                  | number            | Maximum composite score in past 30 days                   | 0-100 integer                                        |
| `hourlyBuckets`             | array             | 24-hour trend data (hourly buckets)                       | Length = 24                                          |
| `hourlyBuckets[].hour`      | string (ISO 8601) | Hour timestamp                                            | Valid datetime                                       |
| `hourlyBuckets[].positive`  | number            | Weighted positive count for that hour                     | ≥ 0                                                  |
| `hourlyBuckets[].neutral`   | number            | Weighted neutral count for that hour                      | ≥ 0                                                  |
| `hourlyBuckets[].negative`  | number            | Weighted negative count for that hour                     | ≥ 0                                                  |
| `hourlyBuckets[].composite` | number            | Composite score for that hour                             | 0-100 integer                                        |
| `sourcesUsed`               | array             | IDs of sources that contributed data                      | ["twitter", "reddit", etc.]                          |
| `sourcesUnavailable`        | array             | IDs of sources that failed                                | ["twitter", etc.] or []                              |
| `isStale`                   | boolean           | True if data is >30 minutes old                           | true \| false                                        |
| `ageMinutes`                | number            | Minutes since last refresh                                | ≥ 0 integer                                          |

**Headers**:

| Header                | Value                             | Description                        |
| --------------------- | --------------------------------- | ---------------------------------- |
| `Content-Type`        | `application/json; charset=utf-8` | Response format                    |
| `Cache-Control`       | `public, max-age=900`             | Cache for 15 minutes (900 seconds) |
| `X-Sentiment-Version` | `1.0.0`                           | API contract version               |
| `X-Sentiment-Age`     | `120`                             | Age of data in seconds             |

---

### Partial Data Response (200 OK, degraded)

**Scenario**: Some sources are unavailable but minimum 2 sources succeeded (FR-010)

**Response**: Same structure as success, but:

- `sourcesUnavailable` array contains failed source IDs
- `totalMentions` may be lower than typical
- Client should display warning: "Partial data available"

**Example**:

```json
{
  "timestamp": "2025-10-11T14:30:00.000Z",
  "windowStart": "2025-10-11T14:00:00.000Z",
  "windowEnd": "2025-10-11T15:00:00.000Z",
  "positiveCount": 28.4,
  "neutralCount": 18.2,
  "negativeCount": 15.1,
  "totalMentions": 61.7,
  "compositeScore": 57,
  "sentimentLabel": "Mixed",
  "isSpikeDetected": false,
  "spikeDirection": null,
  "min30Day": 35,
  "max30Day": 78,
  "hourlyBuckets": [
    /* 24 buckets */
  ],
  "sourcesUsed": ["twitter", "reddit"],
  "sourcesUnavailable": ["mastodon", "rss", "tweakers"],
  "isStale": false,
  "ageMinutes": 3
}
```

**Client Handling**:

- Display sentiment data normally
- Show warning badge: "⚠️ Based on partial data (2 of 5 sources)"
- Log warning for diagnostics

---

### Stale Data Response (200 OK, warning)

**Scenario**: Data is >30 minutes old (FR-009)

**Response**: Same structure, but `isStale: true` and `ageMinutes > 30`

**Example**:

```json
{
  "timestamp": "2025-10-11T13:45:00.000Z",
  "windowStart": "2025-10-11T13:00:00.000Z",
  "windowEnd": "2025-10-11T14:00:00.000Z",
  "positiveCount": 42.0,
  "neutralCount": 28.0,
  "negativeCount": 30.0,
  "totalMentions": 100.0,
  "compositeScore": 56,
  "sentimentLabel": "Mixed",
  "isSpikeDetected": false,
  "spikeDirection": null,
  "min30Day": 35,
  "max30Day": 78,
  "hourlyBuckets": [
    /* 24 buckets */
  ],
  "sourcesUsed": ["twitter", "reddit", "mastodon", "rss", "tweakers"],
  "sourcesUnavailable": [],
  "isStale": true,
  "ageMinutes": 45
}
```

**Client Handling**:

- Grey out timestamp display
- Show "⏱️ Stale" badge
- Display age: "Last updated 45 minutes ago"

---

### Error Response (503 Service Unavailable)

**Scenario**: Insufficient data sources (< 2 sources available) or all sources failed

**Content-Type**: `application/json`

**Response Body**:

```json
{
  "error": "InsufficientData",
  "message": "Unable to aggregate sentiment data. At least 2 sources required, but only 1 is currently available.",
  "attemptedSources": ["twitter", "reddit", "mastodon", "rss", "tweakers"],
  "sourcesAvailable": ["twitter"],
  "sourcesUnavailable": ["reddit", "mastodon", "rss", "tweakers"],
  "timestamp": "2025-10-11T14:30:00.000Z",
  "retryAfter": 300
}
```

**Field Descriptions**:

| Field                | Type   | Description                                                               |
| -------------------- | ------ | ------------------------------------------------------------------------- |
| `error`              | string | Error code: "InsufficientData" \| "AllSourcesFailed" \| "ProcessingError" |
| `message`            | string | Human-readable explanation                                                |
| `attemptedSources`   | array  | All sources that were attempted                                           |
| `sourcesAvailable`   | array  | Sources that succeeded (< 2 for this error)                               |
| `sourcesUnavailable` | array  | Sources that failed                                                       |
| `timestamp`          | string | When error occurred                                                       |
| `retryAfter`         | number | Suggested retry delay in seconds                                          |

**HTTP Status**: `503 Service Unavailable`

**Headers**:

| Header         | Value                        |
| -------------- | ---------------------------- |
| `Content-Type` | `application/json`           |
| `Retry-After`  | `300` (5 minutes in seconds) |

**Client Handling** (FR-011, FR-018):

- Display error message: "Data temporarily unavailable"
- Show friendly explanation: "We're having trouble collecting sentiment data from our sources. Please check back in 5 minutes."
- Do NOT show broken UI or stack traces
- Retry after 5 minutes automatically

---

### Error Response (500 Internal Server Error)

**Scenario**: Unexpected processing error (e.g., sentiment analysis failure, file I/O error)

**Response Body**:

```json
{
  "error": "ProcessingError",
  "message": "An unexpected error occurred while processing sentiment data. Our team has been notified.",
  "timestamp": "2025-10-11T14:30:00.000Z",
  "retryAfter": 300
}
```

**HTTP Status**: `500 Internal Server Error`

**Client Handling**:

- Display generic error: "Something went wrong"
- Suggest retry after 5 minutes
- Log error details to client-side error tracking (if configured)

---

## Contract Tests

**File**: `tests/contract/sentiment-feed.test.ts`

### Test Cases

1. **Success Response Schema** ✅
   - Verify all required fields present
   - Validate types (string, number, boolean, array)
   - Check ranges (compositeScore 0-100, ageMinutes ≥ 0)
   - Ensure `hourlyBuckets.length === 24`
   - Verify `totalMentions = positiveCount + neutralCount + negativeCount`

2. **Response Time** ✅ (SC-001)
   - Assert response time < 3 seconds
   - Measure from request start to response received

3. **Sentiment Label Mapping** ✅ (FR-003)
   - Score 0-19 → "Bleak"
   - Score 20-39 → "Tense"
   - Score 40-59 → "Mixed"
   - Score 60-79 → "Upbeat"
   - Score 80-100 → "Sunny"

4. **Spike Detection Consistency** ✅
   - If `isSpikeDetected === true`, then `spikeDirection !== null`
   - If `isSpikeDetected === false`, then `spikeDirection === null`

5. **Staleness Flag** ✅ (FR-009)
   - If `ageMinutes > 30`, then `isStale === true`
   - If `ageMinutes ≤ 30`, then `isStale === false`

6. **Source Availability** ✅ (FR-010)
   - `sourcesUsed.length ≥ 2` (minimum required)
   - `sourcesUsed.length + sourcesUnavailable.length ≤ 6` (max sources)
   - No overlap between `sourcesUsed` and `sourcesUnavailable`

7. **Error Response Format** ✅
   - 503 status when insufficient sources
   - Error object contains required fields
   - `retryAfter` present and reasonable (300-900 seconds)

8. **Cache Headers** ✅
   - `Cache-Control` present with `max-age=900`
   - `X-Sentiment-Age` header matches `ageMinutes * 60`

9. **Hourly Buckets Chronological Order** ✅
   - Buckets sorted oldest to newest
   - Each bucket timestamp is 1 hour apart

10. **Historical Context Validity** ✅
    - `min30Day ≤ max30Day`
    - Both in range [0, 100]

---

## Consumer Examples

### Dashboard Composable (`useSentimentSnapshot`)

```typescript
// src/composables/useSentimentSnapshot.ts
import type { SentimentSnapshot } from '~/types/sentiment'

export function useSentimentSnapshot(options: { immediate?: boolean } = {}) {
  const snapshot = ref<SentimentSnapshot | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetch() {
    loading.value = true
    error.value = null

    try {
      const response = await $fetch<SentimentSnapshot>('/api/sentiment')
      snapshot.value = response
    } catch (e: any) {
      error.value = e.data?.message || 'Failed to load sentiment data'
      console.error('Sentiment fetch error:', e)
    } finally {
      loading.value = false
    }
  }

  // Auto-refresh every 5 minutes
  const interval = setInterval(fetch, 5 * 60 * 1000)
  onUnmounted(() => clearInterval(interval))

  if (options.immediate) {
    fetch()
  }

  return {
    snapshot: readonly(snapshot),
    loading: readonly(loading),
    error: readonly(error),
    refresh: fetch,
  }
}
```

### Component Usage

```vue
<script setup lang="ts">
const { snapshot, loading, error } = useSentimentSnapshot({ immediate: true })

const displayClass = computed(() => {
  if (!snapshot.value) return ''
  if (snapshot.value.isStale) return 'text-gray-500'
  return 'text-black'
})

const warningMessage = computed(() => {
  if (!snapshot.value) return null
  if (snapshot.value.sourcesUnavailable.length > 0) {
    return `Based on partial data (${snapshot.value.sourcesUsed.length} of 5 sources)`
  }
  if (snapshot.value.isStale) {
    return `Last updated ${snapshot.value.ageMinutes} minutes ago`
  }
  return null
})
</script>

<template>
  <div v-if="loading" class="loading">Loading sentiment data...</div>

  <div v-else-if="error" class="error">
    <p>{{ error }}</p>
    <p class="text-sm">Check back in a few minutes</p>
  </div>

  <div v-else-if="snapshot" :class="displayClass">
    <div class="score">{{ snapshot.compositeScore }}</div>
    <div class="label">{{ snapshot.sentimentLabel }}</div>

    <div v-if="warningMessage" class="warning">⚠️ {{ warningMessage }}</div>

    <div v-if="snapshot.isSpikeDetected" class="spike">
      🔔 Sentiment spike detected ({{ snapshot.spikeDirection }})
    </div>

    <!-- Trend chart using hourlyBuckets -->
    <SentimentTrend :buckets="snapshot.hourlyBuckets" />

    <!-- Historical context -->
    <p class="context">30-day range: {{ snapshot.min30Day }}–{{ snapshot.max30Day }}</p>
  </div>
</template>
```

---

## Versioning Strategy

### Current Version: 1.0.0

**Breaking Changes** (require major version bump):

- Removing required fields
- Changing field types
- Renaming fields
- Changing URL path

**Non-Breaking Changes** (minor version):

- Adding optional fields
- Adding query parameters
- Adding response headers

**Version Header**: `X-Sentiment-Version: 1.0.0`

**Deprecation Process**:

1. Announce deprecation 30 days in advance
2. Add `X-Deprecated-Version` header with sunset date
3. Update documentation
4. Remove after sunset date

---

## Performance Benchmarks

**Target** (SC-001): <3 seconds response time

**Measured** (expected with 15-minute cache):

- Cache hit: <50ms (in-memory read)
- Cache miss: 2-5 seconds (full aggregation)
- 99th percentile: <3 seconds
- Timeout: 10 seconds (server-side)

**Load Testing** (SC-010):

- 100 concurrent requests: all served from cache
- Average response time under load: <200ms

---

## Rate Limiting

**Limit**: 100 requests per minute per IP

**Headers on limit exceeded** (429 Too Many Requests):

```http
HTTP/1.1 429 Too Many Requests
Content-Type: application/json
Retry-After: 60
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1696089600

{
  "error": "RateLimitExceeded",
  "message": "Too many requests. Please try again in 60 seconds.",
  "retryAfter": 60
}
```

---

## Monitoring & SLOs

**Service Level Objectives** (based on FR-019, FR-020):

| Metric                          | Target            | Alert Threshold                 |
| ------------------------------- | ----------------- | ------------------------------- |
| Response time (p95)             | <3s               | >5s for 5 minutes               |
| Availability (6AM-midnight CET) | 99.5%             | <99% over 1 hour                |
| Error rate                      | <1%               | >5% over 15 minutes             |
| Stale data incidents            | <3% of requests   | >10% over 1 hour                |
| Source failures                 | <60% sources down | All sources down for >5 minutes |

**Alerting Channels**:

- Critical: PagerDuty / SMS
- Warning: Slack / Email
- Info: Logs only

---

## Security Considerations

1. **No Authentication Required**: Public endpoint (dashboard is public)

2. **No Sensitive Data**: Only aggregated counts, no PII (FR-017)

3. **CORS**: Allow all origins (public API)

   ```
   Access-Control-Allow-Origin: *
   ```

4. **Rate Limiting**: Prevent abuse (100 req/min per IP)

5. **Input Validation**: No user input (GET only, no query params in v1.0.0)

6. **DDoS Protection**: Handled by Netlify CDN

---

## Future Enhancements (Out of Scope for v1.0.0)

1. **Historical Snapshots**: `GET /api/sentiment?date=YYYY-MM-DD`
2. **WebSocket Live Updates**: Real-time streaming (currently polling)
3. **Granular Filters**: Query by source, time range
4. **GraphQL Endpoint**: Alternative to REST
5. **Compression**: Gzip/Brotli response bodies

---

## Changelog

### v1.0.0 (2025-10-11)

- Initial release
- GET /api/sentiment endpoint
- 24-hour trend data
- Spike detection
- 30-day historical context
- Graceful degradation support

---

## Appendix: cURL Examples

### Basic Request

```bash
curl -X GET https://zorg-sentiment.netlify.app/api/sentiment \
  -H "Accept: application/json"
```

### With Verbose Output

```bash
curl -v https://zorg-sentiment.netlify.app/api/sentiment
```

### Check Cache Age

```bash
curl -I https://zorg-sentiment.netlify.app/api/sentiment | grep X-Sentiment-Age
```

### Simulate Client with Retry

```bash
#!/bin/bash
response=$(curl -s -w "%{http_code}" https://zorg-sentiment.netlify.app/api/sentiment)
status="${response: -3}"

if [ "$status" == "503" ]; then
  echo "Service unavailable, retrying in 5 minutes..."
  sleep 300
  curl https://zorg-sentiment.netlify.app/api/sentiment
else
  echo "$response"
fi
```

---

## Contract Compliance Checklist

- [x] Response schema matches `SentimentSnapshot` interface (data-model.md)
- [x] Response time <3 seconds (SC-001)
- [x] Minimum 2 sources required (FR-010)
- [x] Hourly buckets = 24 items (FR-004)
- [x] Staleness flag when age >30 minutes (FR-009)
- [x] Spike detection included (FR-005, FR-006)
- [x] 30-day context provided (FR-007)
- [x] Error responses include retry guidance (FR-011, FR-018)
- [x] Cache headers set (15-minute TTL)
- [x] Version header included
- [x] All fields documented with validation rules
- [x] Contract tests defined
- [x] Consumer examples provided

---

**Contract Status**: ✅ READY FOR IMPLEMENTATION

**Next Step**: Create quickstart.md for developer onboarding.

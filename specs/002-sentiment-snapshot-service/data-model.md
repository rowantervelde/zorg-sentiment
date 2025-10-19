# Data Model: Sentiment Snapshot Service

**Feature**: 002-sentiment-snapshot-service  
**Date**: 2025-10-11  
**Source**: Extracted from spec.md Key Entities section

## Overview

This document defines the data structures for sentiment aggregation, storage, and API responses. All entities are designed for JSON serialization and follow TypeScript type safety principles.

---

## Core Entities

### 1. SentimentSnapshot

**Purpose**: Represents the current state of public sentiment at a specific point in time

**Lifecycle**: Generated every 15 minutes, cached for 15 minutes, served to dashboard

**Storage**: In-memory cache (15-min TTL) + file persistence (`server/data/sentiment/snapshot-latest.json`)

**Fields**:

| Field                | Type                               | Required | Validation          | Description                     |
| -------------------- | ---------------------------------- | -------- | ------------------- | ------------------------------- |
| `timestamp`          | `string` (ISO 8601)                | ✅       | Valid datetime      | When snapshot was created       |
| `windowStart`        | `string` (ISO 8601)                | ✅       | Valid datetime      | Start of current hourly window  |
| `windowEnd`          | `string` (ISO 8601)                | ✅       | Valid datetime      | End of current hourly window    |
| `positiveCount`      | `number` (float)                   | ✅       | ≥ 0                 | Weighted positive mentions      |
| `neutralCount`       | `number` (float)                   | ✅       | ≥ 0                 | Weighted neutral mentions       |
| `negativeCount`      | `number` (float)                   | ✅       | ≥ 0                 | Weighted negative mentions      |
| `totalMentions`      | `number` (float)                   | ✅       | ≥ 0, = sum of above | Total weighted mentions         |
| `compositeScore`     | `number` (int)                     | ✅       | 0-100               | Normalized sentiment score      |
| `sentimentLabel`     | `SentimentLabel`                   | ✅       | Enum value          | Mood descriptor                 |
| `isSpikeDetected`    | `boolean`                          | ✅       | -                   | True if 2σ deviation detected   |
| `spikeDirection`     | `'positive' \| 'negative' \| null` | ✅       | Set only if spike   | Direction of spike              |
| `min30Day`           | `number` (int)                     | ✅       | 0-100               | Lowest score in last 30 days    |
| `max30Day`           | `number` (int)                     | ✅       | 0-100               | Highest score in last 30 days   |
| `hourlyBuckets`      | `HourlySentimentBucket[]`          | ✅       | Length = 24         | Past 24 hours trend data        |
| `sourcesUsed`        | `string[]`                         | ✅       | Min 2, Max 6        | IDs of sources that contributed |
| `sourcesUnavailable` | `string[]`                         | ✅       | -                   | IDs of sources that failed      |
| `isStale`            | `boolean`                          | ✅       | -                   | True if age > 30 minutes        |
| `ageMinutes`         | `number` (int)                     | ✅       | ≥ 0                 | Minutes since last refresh      |

**Enums**:

```typescript
type SentimentLabel = 'Bleak' | 'Tense' | 'Mixed' | 'Upbeat' | 'Sunny'
```

**Label Mapping** (from FR-003):

- `Bleak`: 0-19
- `Tense`: 20-39
- `Mixed`: 40-59
- `Upbeat`: 60-79
- `Sunny`: 80-100

**Composite Score Calculation** (from original spec):

```
compositeScore = ((positiveCount - negativeCount) / totalMentions) * 50 + 50
```

Clamped to [0, 100]

**Example**:

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
    /* 24 buckets */
  ],
  "sourcesUsed": ["twitter", "reddit", "mastodon", "rss", "tweakers"],
  "sourcesUnavailable": [],
  "isStale": false,
  "ageMinutes": 2
}
```

**State Transitions**: None (immutable snapshot)

---

### 2. HourlySentimentBucket

**Purpose**: Aggregated sentiment for a specific hour

**Lifecycle**: Created every hour, retained for 30 days at hourly granularity, then aggregated to daily

**Storage**: File-based (`server/data/sentiment/buckets-YYYY-MM-DD.json`), one file per day containing 24 buckets

**Fields**:

| Field       | Type                | Required | Validation                 | Description             |
| ----------- | ------------------- | -------- | -------------------------- | ----------------------- |
| `hour`      | `string` (ISO 8601) | ✅       | Hour start (e.g., "14:00") | Hour timestamp          |
| `positive`  | `number` (float)    | ✅       | ≥ 0                        | Weighted positive count |
| `neutral`   | `number` (float)    | ✅       | ≥ 0                        | Weighted neutral count  |
| `negative`  | `number` (float)    | ✅       | ≥ 0                        | Weighted negative count |
| `composite` | `number` (int)      | ✅       | 0-100                      | Hour composite score    |

**Example**:

```json
{
  "hour": "2025-10-11T14:00:00.000Z",
  "positive": 45.2,
  "neutral": 30.1,
  "negative": 24.7,
  "composite": 60
}
```

**Aggregation to Daily** (after 30 days):

```json
{
  "date": "2025-09-11",
  "avgComposite": 58,
  "minComposite": 42,
  "maxComposite": 72,
  "totalMentions": 2400.0
}
```

---

### 3. SentimentSpikeEvent

**Purpose**: Detected significant deviation from recent sentiment patterns

**Lifecycle**: Detected during aggregation, persisted to log file, exposed in snapshot as boolean flag

**Storage**: Log file (`server/data/sentiment/spikes.jsonl`), append-only

**Fields**:

| Field          | Type                       | Required | Validation     | Description                   |
| -------------- | -------------------------- | -------- | -------------- | ----------------------------- |
| `timestamp`    | `string` (ISO 8601)        | ✅       | Valid datetime | When spike detected           |
| `currentScore` | `number` (int)             | ✅       | 0-100          | Score that triggered spike    |
| `mean12Hour`   | `number` (float)           | ✅       | 0-100          | Rolling 12-hour mean          |
| `stdDev12Hour` | `number` (float)           | ✅       | ≥ 0            | Standard deviation            |
| `direction`    | `'positive' \| 'negative'` | ✅       | -              | Spike direction               |
| `magnitude`    | `number` (float)           | ✅       | ≥ 2.0          | Number of standard deviations |

**Detection Logic** (from clarification):

```
isSpike = |currentScore - mean12Hour| >= 2 * stdDev12Hour
```

**Example**:

```json
{
  "timestamp": "2025-10-11T14:30:00.000Z",
  "currentScore": 78,
  "mean12Hour": 55.3,
  "stdDev12Hour": 8.2,
  "direction": "positive",
  "magnitude": 2.8
}
```

---

### 4. DataSourceStatus

**Purpose**: Availability and health of each public data source

**Lifecycle**: Updated every 15 minutes during aggregation

**Storage**: In-memory (ephemeral) + included in snapshot

**Fields**:

| Field            | Type                                             | Required | Validation     | Description                   |
| ---------------- | ------------------------------------------------ | -------- | -------------- | ----------------------------- |
| `id`             | `SourceId`                                       | ✅       | Enum value     | Source identifier             |
| `status`         | `'available' \| 'unavailable' \| 'rate_limited'` | ✅       | -              | Current status                |
| `lastSuccess`    | `string` (ISO 8601) \| `null`                    | ✅       | Valid datetime | Last successful fetch         |
| `lastError`      | `string` \| `null`                               | ✅       | -              | Error message if failed       |
| `quotaRemaining` | `number` \| `null`                               | ⚠️       | ≥ 0            | API quota left (if trackable) |

**Enums**:

```typescript
type SourceId = 'twitter' | 'reddit' | 'mastodon' | 'rss' | 'tweakers'
```

**Example**:

```json
{
  "id": "twitter",
  "status": "available",
  "lastSuccess": "2025-10-11T14:28:00.000Z",
  "lastError": null,
  "quotaRemaining": 420
}
```

---

### 5. HistoricalContextRange

**Purpose**: 30-day minimum and maximum sentiment scores

**Lifecycle**: Recalculated daily from 30-day bucket history

**Storage**: Cached in-memory, persisted in `server/data/sentiment/context.json`

**Fields**:

| Field          | Type                | Required | Validation     | Description             |
| -------------- | ------------------- | -------- | -------------- | ----------------------- |
| `startDate`    | `string` (ISO 8601) | ✅       | Date only      | Start of 30-day window  |
| `endDate`      | `string` (ISO 8601) | ✅       | Date only      | End of 30-day window    |
| `min`          | `number` (int)      | ✅       | 0-100          | Minimum composite score |
| `max`          | `number` (int)      | ✅       | 0-100          | Maximum composite score |
| `minTimestamp` | `string` (ISO 8601) | ✅       | Valid datetime | When min occurred       |
| `maxTimestamp` | `string` (ISO 8601) | ✅       | Valid datetime | When max occurred       |

**Example**:

```json
{
  "startDate": "2025-09-11",
  "endDate": "2025-10-11",
  "min": 35,
  "max": 78,
  "minTimestamp": "2025-09-22T08:00:00.000Z",
  "maxTimestamp": "2025-10-05T18:00:00.000Z"
}
```

---

## Internal Data Structures

### RawMention (intermediate)

**Purpose**: Unprocessed mention from a source before sentiment analysis

**Lifecycle**: Ephemeral (never persisted)

**Fields**:

| Field        | Type                | Required | Description                 |
| ------------ | ------------------- | -------- | --------------------------- |
| `sourceId`   | `SourceId`          | ✅       | Origin source               |
| `text`       | `string`            | ✅       | Content (max 5000 chars)    |
| `timestamp`  | `string` (ISO 8601) | ✅       | When posted                 |
| `engagement` | `EngagementMetrics` | ✅       | Likes, shares, etc.         |
| `url`        | `string`            | ⚠️       | Link to original (optional) |

**EngagementMetrics**:

```typescript
interface EngagementMetrics {
  likes?: number
  shares?: number
  replies?: number
  upvotes?: number
  downvotes?: number
}
```

**Weight Calculation** (FR-013):

```typescript
function calculateWeight(engagement: EngagementMetrics): number {
  const baseWeight = 1.0
  const total =
    (engagement.likes || 0) +
    (engagement.shares || 0) +
    (engagement.replies || 0) +
    (engagement.upvotes || 0)
  return baseWeight * (1 + Math.log10(total + 1))
}
```

---

### ProcessedMention (intermediate)

**Purpose**: Mention after sentiment analysis and weighting

**Lifecycle**: Ephemeral (aggregated into buckets immediately)

**Fields**:

| Field            | Type                                    | Required | Description                |
| ---------------- | --------------------------------------- | -------- | -------------------------- |
| `sourceId`       | `SourceId`                              | ✅       | Origin source              |
| `sentiment`      | `'positive' \| 'neutral' \| 'negative'` | ✅       | Classified sentiment       |
| `sentimentScore` | `number` (float)                        | ✅       | Raw score [-1.0, +1.0]     |
| `confidence`     | `number` (float)                        | ✅       | Confidence [0.0, 1.0]      |
| `weight`         | `number` (float)                        | ✅       | Engagement weight          |
| `timestamp`      | `string` (ISO 8601)                     | ✅       | Original timestamp         |
| `contentHash`    | `string`                                | ✅       | MD5 hash for deduplication |

**Classification Rules** (from original spec):

- `positive` if `sentimentScore > +0.1` AND `confidence > 0.6`
- `negative` if `sentimentScore < -0.1` AND `confidence > 0.6`
- `neutral` otherwise

---

## Validation Rules

### Cross-Entity Constraints

1. **Snapshot Consistency**:
   - `totalMentions = positiveCount + neutralCount + negativeCount`
   - `hourlyBuckets.length === 24`
   - `sourcesUsed.length + sourcesUnavailable.length ≤ 6` (max sources)
   - `sourcesUsed.length ≥ 2` (FR-010 minimum)

2. **Temporal Ordering**:
   - `windowEnd > windowStart`
   - `windowEnd - windowStart = 1 hour`
   - `hourlyBuckets` sorted chronologically (oldest first)

3. **Score Ranges**:
   - All `compositeScore` fields: [0, 100]
   - All `sentimentScore` fields: [-1.0, +1.0]
   - All `confidence` fields: [0.0, 1.0]

4. **Spike Detection**:
   - `isSpikeDetected = true` requires `spikeDirection !== null`
   - `isSpikeDetected = false` requires `spikeDirection === null`

5. **Staleness**:
   - `isStale = true` when `ageMinutes > 30`
   - `ageMinutes = (now - timestamp) / 60000` (milliseconds to minutes)

---

## Data Relationships

```
SentimentSnapshot
├── contains 24 × HourlySentimentBucket
├── references DataSourceStatus[] (5-6 sources)
├── embeds HistoricalContextRange (min30Day, max30Day)
└── may reference SentimentSpikeEvent (via isSpikeDetected flag)

HourlySentimentBucket
└── aggregates many ProcessedMention (ephemeral)

ProcessedMention
└── derived from RawMention (ephemeral)

DataSourceStatus
└── tracked per SourceId

HistoricalContextRange
└── computed from 30 days × 24 HourlySentimentBucket
```

---

## Storage Schema

### File Structure

```
server/data/sentiment/
├── snapshot-latest.json              # Current cached snapshot (SentimentSnapshot)
├── context.json                      # 30-day min/max (HistoricalContextRange)
├── buckets-2025-10-11.json          # Today's 24 hourly buckets
├── buckets-2025-10-10.json          # Yesterday
├── buckets-2025-10-09.json          # 2 days ago
├── ... (30 files for 30 days)
├── daily-2025-10.json               # October daily aggregates
├── daily-2025-09.json               # September daily aggregates
└── spikes.jsonl                      # Spike events log (append-only)
```

### File Formats

**buckets-YYYY-MM-DD.json**:

```json
{
  "date": "2025-10-11",
  "buckets": [
    /* 24 HourlySentimentBucket objects */
  ]
}
```

**daily-YYYY-MM.json**:

```json
{
  "month": "2025-10",
  "days": [
    {
      "date": "2025-10-01",
      "avgComposite": 58,
      "minComposite": 42,
      "maxComposite": 72,
      "totalMentions": 2400.0
    }
    // ... up to 31 days
  ]
}
```

**spikes.jsonl** (newline-delimited JSON):

```json
{"timestamp":"2025-10-11T14:30:00.000Z","currentScore":78,"mean12Hour":55.3,"stdDev12Hour":8.2,"direction":"positive","magnitude":2.8}
{"timestamp":"2025-10-11T16:45:00.000Z","currentScore":42,"mean12Hour":58.1,"stdDev12Hour":6.5,"direction":"negative","magnitude":2.5}
```

---

## TypeScript Interfaces

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

export interface SentimentSpikeEvent {
  timestamp: string
  currentScore: number
  mean12Hour: number
  stdDev12Hour: number
  direction: 'positive' | 'negative'
  magnitude: number
}

export interface DataSourceStatus {
  id: SourceId
  status: 'available' | 'unavailable' | 'rate_limited'
  lastSuccess: string | null
  lastError: string | null
  quotaRemaining: number | null
}

export interface HistoricalContextRange {
  startDate: string
  endDate: string
  min: number
  max: number
  minTimestamp: string
  maxTimestamp: string
}

// Internal structures
export interface RawMention {
  sourceId: SourceId
  text: string
  timestamp: string
  engagement: EngagementMetrics
  url?: string
}

export interface EngagementMetrics {
  likes?: number
  shares?: number
  replies?: number
  upvotes?: number
  downvotes?: number
}

export interface ProcessedMention {
  sourceId: SourceId
  sentiment: 'positive' | 'neutral' | 'negative'
  sentimentScore: number
  confidence: number
  weight: number
  timestamp: string
  contentHash: string
}
```

---

## Data Volume Estimates

### Daily Volume

- **Raw mentions**: ~100-500/day (SC-004 minimum)
- **Hourly buckets**: 24 objects/day (FR-004)
- **Snapshots**: ~96/day (every 15 minutes)

### Storage Size

- **Single snapshot**: ~2KB JSON
- **Daily buckets file**: ~1KB (24 × ~40 bytes)
- **30 days buckets**: ~30KB
- **Daily aggregates (1 year)**: ~5KB
- **Spike log (1 year)**: <10KB

**Total**: <50KB for all persisted data (excluding in-memory cache)

---

## Migration Strategy

### Schema Versioning

Add `schemaVersion` field to all JSON files:

```json
{
  "schemaVersion": "1.0.0",
  "data": {
    /* actual data */
  }
}
```

### Breaking Changes

If entity structure changes:

1. Update `schemaVersion`
2. Write migration script in `server/data/migrations/`
3. Run migration before deployment

Example migration:

```typescript
// migrate-1.0.0-to-2.0.0.ts
export function migrate(oldData: any): any {
  return {
    schemaVersion: '2.0.0',
    ...oldData,
    newField: computeNewField(oldData),
  }
}
```

---

## Conclusion

Data model extracted from specification and optimized for:

- JSON serialization (web API friendly)
- File-based storage (Netlify Functions compatible)
- TypeScript type safety
- Low storage footprint (<50KB)
- Fast reads (in-memory caching)

All entities map directly to functional requirements (FR-001 through FR-023) and success criteria (SC-001 through SC-017).

**Next Step**: Define API contract in `contracts/sentiment-feed.md`.

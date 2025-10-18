# Data Model: Zorg-sentiment Dashboard

## Entities

### SentimentSnapshot

| Field          | Type         | Constraints | Notes                                 |
| -------------- | ------------ | ----------- | ------------------------------------- |
| windowStart    | ISO datetime | required    | Inclusive start of hour bucket range  |
| windowEnd      | ISO datetime | required    | Exclusive end                         |
| positiveCount  | integer      | ≥0          | Raw count                             |
| neutralCount   | integer      | ≥0          | Raw count                             |
| negativeCount  | integer      | ≥0          | Raw count                             |
| compositeScore | integer      | 0–100       | Derived normalized sentiment          |
| min30Day       | integer      | 0–100       | Historical min context                |
| max30Day       | integer      | 0–100       | Historical max context                |
| spikeFlag      | boolean      | derived     | True if current hour spike rule holds |

### Topic

| Field             | Type         | Constraints     | Notes                                |
| ----------------- | ------------ | --------------- | ------------------------------------ |
| name              | string       | 2–60 chars      | Human-readable label                 |
| currentMentions3h | integer      | ≥0              | Volume in active window              |
| prevMentions3h    | integer      | ≥0              | Prior window volume                  |
| growthPercent     | number       | can be negative | (current - prev)/prev \*100 (prev≥5) |
| positivePct       | number       | 0–100           | Rounded percentage                   |
| neutralPct        | number       | 0–100           | Rounded percentage                   |
| negativePct       | number       | 0–100           | Rounded percentage                   |
| netPolarity       | number       | -100–100        | positivePct - negativePct            |
| polarizingFlag    | boolean      | derived         | positivePct≥35 AND negativePct≥35    |
| firstSeen         | ISO datetime | required        | Earliest detection                   |
| lastSeen          | ISO datetime | required        | Latest detection                     |

### Commentary

| Field          | Type         | Constraints                      | Notes                          |
| -------------- | ------------ | -------------------------------- | ------------------------------ |
| text           | string       | ≤400 chars                       | User-visible summary           |
| createdAt      | ISO datetime | required                         | Generation timestamp           |
| includesTopics | string[]     | ≤2 items                         | Names referenced               |
| sentimentLabel | enum         | {Bleak,Tense,Mixed,Upbeat,Sunny} | From mapping table             |
| status         | enum         | {success,fallback,stale}         | fallback if generation failure |
| lengthChars    | integer      | 0–400                            | Computed                       |

### RefreshMetadata

| Field         | Type         | Constraints                              | Notes               |
| ------------- | ------------ | ---------------------------------------- | ------------------- |
| lastRefreshAt | ISO datetime | required                                 | Data last updated   |
| ageMinutes    | integer      | ≥0                                       | Now - lastRefreshAt |
| partialFlags  | string[]     | subset {topicsMissing,commentaryMissing} | Empty if complete   |
| staleFlag     | boolean      | derived                                  | ageMinutes>30       |

## Derived Calculations

- compositeScore: Implementation-specific weighted normalization (external scope)
- growthPercent: If prevMentions3h <5 → treat as undefined (exclude from ranking)
- spikeFlag: currentHourScore ≥ mean(prior12hScores) + 2\*stddev(prior12hScores)

## Validation Rules Summary

- Percent triplet (positivePct+neutralPct+negativePct) must be 100±1 rounding tolerance
- includesTopics in Commentary must reference existing Topic names in the same payload
- netPolarity = positivePct - negativePct (double-check invariants in tests)

## State Transitions

- Topic lifecycle: unseen → firstSeen set → subsequent windows update lastSeen → if volume 0 for N windows (N TBD, out-of-scope) could be pruned (not required for MVP)

## Open Future Extensions

- Add sentiment confidence intervals
- Add topic clustering group_id
- Add language detection field (if multilingual later)

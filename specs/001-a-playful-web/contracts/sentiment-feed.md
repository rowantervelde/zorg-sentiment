# Contract: Sentiment Feed

## Endpoint (Reference)

`GET /api/sentiment/snapshot`

(External provider shape definition; this project consumes only.)

## Response (200)

```jsonc
{
  "windowStart": "2025-10-04T07:00:00Z",
  "windowEnd": "2025-10-04T08:00:00Z",
  "positiveCount": 123,
  "neutralCount": 456,
  "negativeCount": 78,
  "compositeScore": 61,
  "min30Day": 34,
  "max30Day": 83,
  "prior12hScores": [55, 57, 58, 56, 54, 53, 60, 61, 59, 58, 57, 56]
}
```

## Validation Rules

- Counts non-negative integers
- 0 ≤ compositeScore ≤ 100
- prior12hScores length = 12

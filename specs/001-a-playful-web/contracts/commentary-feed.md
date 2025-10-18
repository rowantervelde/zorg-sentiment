# Contract: Commentary Feed

`GET /api/commentary/current`

## Response (200)

```jsonc
{
  "text": "Mood is Mixed edging Upbeat; 'premie' and 'dekking' dominate chatter.",
  "createdAt": "2025-10-04T07:58:12Z",
  "sentimentLabel": "Mixed",
  "includesTopics": ["premie", "dekking"],
  "status": "success"
}
```

## Failure (Fallback Trigger)

```jsonc
{
  "status": "fallback"
}
```

## Rules

- `text` required only when status = success
- includesTopics length ≤2
- sentimentLabel must match label scale

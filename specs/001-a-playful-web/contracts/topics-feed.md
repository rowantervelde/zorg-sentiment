# Contract: Topics Feed

`GET /api/topics/trending`

## Response (200)

```jsonc
{
  "windowStart": "2025-10-04T05:00:00Z",
  "windowEnd": "2025-10-04T08:00:00Z",
  "topics": [
    {
      "name": "premie",
      "currentMentions3h": 42,
      "prevMentions3h": 10,
      "positivePct": 40,
      "neutralPct": 35,
      "negativePct": 25,
      "firstSeen": "2025-09-30T10:00:00Z",
      "lastSeen": "2025-10-04T07:55:00Z"
    }
  ]
}
```

## Derived Client Fields

- growthPercent = (current - prev)/prev \*100 (if prev ≥5 else undefined)
- netPolarity = positivePct - negativePct
- polarizingFlag = positivePct ≥35 AND negativePct ≥35

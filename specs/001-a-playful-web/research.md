# Research: Zorg-sentiment Dashboard

## Decisions

### Topic Growth Ranking

- Decision: Use percentage growth over previous 3h window with baseline ≥5 mentions.
- Rationale: Balances stability and responsiveness; avoids noise from very low-volume spikes.
- Alternatives: Absolute delta (biased toward high-volume topics), z-score (requires longer historical window), exponential smoothing (added complexity for MVP).

### Spike Detection Threshold

- Decision: Mark spike if current hour composite ≥ mean + 2 \* std dev of prior 12 hours.
- Rationale: Simple, explainable, low false positive rate for moderately variable data.
- Alternatives: Median absolute deviation (robust but higher implementation effort), percentile threshold (needs larger sample).

### Polarizing Threshold

- Decision: Positive ≥35% AND negative ≥35% in 3h window.
- Rationale: Ensures meaningful dual-polarity engagement; prevents small minor polarity from triggering flag.
- Alternatives: Entropy-based divergence (opaque to users), symmetric difference >30% (less intuitive).

### Sentiment Label Bins

- Decision: 0–19 Bleak, 20–39 Tense, 40–59 Mixed, 60–79 Upbeat, 80–100 Sunny.
- Rationale: Even quintile-like segmentation; readable adjectives; aligns with emotional gradient.
- Alternatives: 7-bin granular scale (overly fine), 3-bin coarse scale (loss of nuance).

### Staleness Threshold

- Decision: >30 minutes since last refresh marks data as stale.
- Rationale: Provides tolerance for periodic ingestion while signaling data aging promptly.
- Alternatives: 15 minutes (may label too often), 60 minutes (less timely).

### Commentary Length Limit

- Decision: ≤400 chars.
- Rationale: Scannable, fits above fold on mobile, supports humor without verbosity.
- Alternatives: 280 chars (too restrictive), 500 chars (risks truncation on small screens).

### Accessibility of Charts

- Decision: Provide textual summary and table fallback for core metrics; ensure color contrast and ARIA labels.
- Rationale: Supports screen readers and users with color vision deficiencies.
- Alternatives: Rely solely on canvas ARIA roles (less explicit), purely decorative alt text (non-informative).

### Performance Budgets

- Decision: Initial JS ≤180KB uncompressed; LCP <2.5s; TTI <3s.
- Rationale: Aligns with target mobile performance and constitution performance principle.
- Alternatives: Stricter 150KB (higher refactor risk), looser 220KB (less disciplined growth).

## Assumptions Confirmed

- No server rendering required; all dynamic fetches optional for first paint.
- External data ingestion handled by separate system (out of scope).
- Only anonymous public interaction—no personalization beyond onboarding dismissal.

## Open Follow-ups (Future Iteration)

- Evaluate adoption of web worker for large transforms if growth causes main-thread jank.
- Consider adding progressive enhancement for offline cached last snapshot.
- Explore fine-grained topic clustering (embedding-based) after MVP.

## Alternatives Rejected Summary Table

| Area             | Chosen             | Rejected         | Reason Rejected                   |
| ---------------- | ------------------ | ---------------- | --------------------------------- |
| Growth metric    | % growth           | Absolute delta   | Bias to high volume               |
| Spike detection  | 2σ                 | MAD              | More impl complexity for low gain |
| Polarizing       | Dual ≥35%          | Entropy score    | Less transparent                  |
| Labels           | 5 bins             | 7 bins           | Overly granular                   |
| Stale threshold  | 30m                | 60m              | Too sluggish                      |
| Commentary limit | 400                | 500              | Layout risk                       |
| Chart a11y       | Text summary+table | Canvas-only ARIA | Less accessible                   |

## Ready for Design

All research questions resolved; proceed to Phase 1 artifacts.

# Release notes

## Version 0.1.0 – Playful national mood dashboard

**Release date:** 2025-10-08

### Highlights

- 🌤️ **Dashboard core** – Single-page Nuxt 3 app showing composite sentiment score, hourly trend, trending topics, and playful commentary with graceful fallbacks.
- 🔄 **Live refresh loop** – Manual refresh button plus 5-minute auto-refresh covering sentiment snapshot, topics, and commentary; freshness badge surfaces staleness at >30 minutes.
- 🚨 **Insight signals** – Spike detection (2σ rule) and polarising topic badges highlight notable swings; partial flags warn when data sources degrade.
- 🦾 **Accessibility & UX** – Skip link, semantic landmarks, ARIA live regions, Axe CI gate, and automated Playwright smoke tests ensure inclusive behaviour.
- ⚡ **Performance guardrails** – JS bundle trimmed to 163.9 KB (≤180 KB budget); static generation ready for Netlify with size and accessibility checks wired into CI.

### Testing

- `npm run test:unit` (Vitest) – 104 passing tests.
- `npm run test:integration` – Contract scaffolds present (pending future implementation for full UI scenarios).
- `npm run test:playwright` – Dashboard smoke spec passes.
- `npm run test:accessibility` – Axe-based audit passes (JSDOM canvas warning acknowledged).
- CI workflow runs lint, tests, generate, bundle analysis, accessibility, and Playwright.

### Known follow-ups

- Flesh out Vitest integration scenarios currently stubbed with “Integration scaffold not implemented” placeholders.
- Add visual charts and ensure they reuse existing accessibility fallbacks.
- Extend performance docs with real-device Lighthouse captures once deployed to staging.

### Deployment

Run:

```cmd
npm run generate
```

Deploy the contents of `.output/public` to Netlify (build command already defined in `netlify.toml`).

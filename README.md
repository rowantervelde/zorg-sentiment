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

## Architecture highlights

- **Nuxt 3 static** build with client-side composables for live refreshes.
- **Tailwind CSS** powers the design system; no additional component libraries.
- **TypeScript everywhere** with strict linting via ESLint 9.
- **Testing pyramid**: contract (API schemas), unit (utilities, services, composables, components), integration (Vitest scenarios), and Playwright smoke.

## Deployment

The site is optimised for static hosting (e.g. Netlify). Deploy `.output/public` from `npm run generate`. A CI workflow in `.github/workflows/ci.yml` installs dependencies, lints, executes unit/integration tests, runs Playwright, builds the static bundle, and enforces performance and accessibility budgets.

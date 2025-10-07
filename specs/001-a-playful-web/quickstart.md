# Quickstart: Zorg-sentiment Dashboard

## Purpose

Spin up the static Nuxt dashboard, run tests, and generate the production build with constitutional gates (performance, accessibility) in mind.

## Prerequisites

- Node.js LTS (>=20)
- pnpm or npm (choose one; examples use npm)
- Git

## Install

```
npm install
```

## Dev Server

```
npm run dev
```

Open http://localhost:3000

## Unit Tests (Vitest)

```
npm run test:unit
```

## Integration/UI Tests (Playwright)

```
npm run test:playwright
```

Runs the Chromium-based smoke suite after generating the static build and serving `.output/public`.

## Accessibility Audit (Axe)

```
npm run test:accessibility
```

Executes the axe-core audit against the server-rendered dashboard using the SSR harness.

## Build (Static Generation)

```
npm run generate
```

Output: `./dist` (Netlify publish directory)

## Preview Static Output

```
npm run preview
```

## Performance Budget Verification

```
npm run analyze:bundle
```

Fails if the uncompressed initial JS bundle exceeds 180&nbsp;KB; run after `npm run generate`.

## Environment Variables

Expose only public ones with `NUXT_PUBLIC_` prefix.

## Onboarding Dismissal

Stored key: `zs_onboard_v1` (value `dismissed`). Removal resets hint.

## Commentary Fallback

If fetch/generation fails, UI shows neutral placeholder and logs via `useCommentary` composable.

## Deployment (Netlify)

Netlify configuration file `netlify.toml` (planned) will specify:

```
[build]
  command = "npm run generate"
  publish = "dist"
```

## Troubleshooting

| Symptom               | Action                                                                 |
| --------------------- | ---------------------------------------------------------------------- |
| Blank trend chart     | Check API response shape matches contracts/sentiment-feed.md           |
| Commentary missing    | Confirm fallback showing; inspect console for error tag `[commentary]` |
| Stale badge always on | Verify refresh timestamp updating; check system clock drift            |

## Next Steps

Run `/tasks` workflow to produce `tasks.md` and begin TDD implementation.

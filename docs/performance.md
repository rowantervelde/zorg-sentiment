# Performance report

Date: 2025-10-08

## Budgets and outcomes

| Metric                           | Budget              | Latest result             | Source                                            |
| -------------------------------- | ------------------- | ------------------------- | ------------------------------------------------- |
| Initial JS bundle (uncompressed) | ≤ 180 KB            | **163.9 KB**              | `npm run analyze:bundle` (scripts/size-check.mjs) |
| Static generation time           | ≤ 10 s              | ~8 s (`npm run generate`) | Nuxt build logs                                   |
| Playwright smoke                 | N/A (informational) | 1 test, 7.8 s             | `npm run test:playwright`                         |

## Notes

- The dominant client chunk (`C8bdiv1o.js`) weighs 151 KB and contains the dashboard layout plus composables. Future enhancements should monitor this file for regressions.
- Disabling Nuxt’s automatic pages directory and consolidating the dashboard in `src/app.vue` removed ~42 KB from the initial bundle.
- Asset loading remains CSS-only (no web fonts or images), keeping render-blocking requests minimal.

## Recommended manual checks

Although automated budgets pass, schedule periodic real-device spot checks:

1. **Lighthouse / PageSpeed** against `.output/public` hosted locally via `npx serve` to validate LCP and TTI on emulated Moto G4 (Fast 3G).
2. **Chrome Performance recording** during the refresh flow to confirm setInterval updates do not trigger long tasks.
3. **Network throttling** verification that API fallbacks display within 2 s on Slow 4G.

Track new metrics here as features evolve.

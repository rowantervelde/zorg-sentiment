# Accessibility audit

Date: 2025-10-08

## Automated checks

- `npm run test:accessibility` (axe-core script) – **PASS**.
- The axe harness logs a warning about the HTML canvas context API because we run in JSDOM without a real canvas implementation. This is expected and does not affect the audit outcome.
- Playwright smoke test (`npm run test:playwright`) verifies focus management, skip links, and primary ARIA landmarks.

## Manual checklist

- **Keyboard navigation**: Skip link is focusable, dashboard sections provide headings, refresh button is reachable. No keyboard traps observed.
- **ARIA & semantics**: `FreshnessBadge` uses `aria-live` to announce staleness; loading placeholders marked as `role="status"`. Charts expose textual fallback via `SentimentTrend` summary.
- **Color contrast**: Tailwind palette uses WCAG AA compliant colours (`slate` shades for text, `emerald` accent for indicators). Checked via design tokens during component implementation.
- **Dynamic content announcements**: Refresh button toggles `aria-busy`; onboarding hint and partial flags use polite live regions.

## Follow-ups

- When introducing a real chart library, ensure it exposes hidden data tables or aria descriptions.
- If additional pages appear, replicate skip link and landmark structure.

# Zorg Sentiment Web App Constitution

Minimal, enforceable rules for the static Nuxt 3 sentiment UI deployed on Netlify.

## Core Principles

### 1. Static-First Delivery

The site MUST be generated statically (`npx nuxi generate`) with zero required server runtime. All dynamic data access occurs via client-side fetch to approved APIs. Any feature that forces SSR or server functions requires explicit justification in PR description.

### 2. Accessibility & Semantics

All interactive elements keyboard reachable. Color contrast WCAG AA. Each page has one <h1>. Axe (or `@nuxtjs/a11y` module if added) must report no critical violations in CI before merge.

### 3. Simplicity & Modular Components

UI logic isolated in composables (`/composables`) and presentational components remain prop‑driven & stateless where feasible. Avoid premature abstraction: duplicate once is acceptable; abstract only on the third usage.

## Architecture & Constraints

1. Framework: Nuxt 3 (latest minor) in strict static mode (`nitro: preset: 'static'` or default generate).
2. Deployment: Netlify using `netlify.toml` with build command `npm run generate` and publish directory `dist/`.
3. Routing: File-based. Dynamic routes require an accompanying comment describing prerender strategy or fallback.
4. Styling: Use a single utility system Tailwind OR minimal scoped CSS; mixing multiple utility frameworks is prohibited.
5. State: Prefer per-component state + composables. Global stores (Pinia) only when shared across ≥3 distinct route components.
6. Assets: Images optimized (modern formats) and under 200KB each; larger require lazy loading.
7. Dependencies: Adding a dependency requires listing: purpose, size (bundlephobia), and alternatives considered in PR.

## Governance

1. This constitution overrides ad-hoc preferences; conflicts resolved in favor of explicit statements herein.
2. Amendments: Open PR labeled `constitution` including: proposed change, rationale, migration/retrofit steps, effective date.
3. Acceptance: Requires approval from ≥2 maintainers OR (if single maintainer project) a 24h cooling period before merging.
4. Drift Handling: If code diverges from a principle, first duty is to restore compliance or file an amendment PR before adding new features to that area.
5. Violations: CI enforces measurable gates; reviewers enforce qualitative gates. Repeated violation commits may be squashed with explanatory summary.

**Version**: 0.1.0 | **Ratified**: 2025-10-04 | **Last Amended**: 2025-10-04

Change Log: Initial minimal Nuxt + Netlify constitution established.

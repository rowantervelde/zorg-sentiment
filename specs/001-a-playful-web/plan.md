# Implementation Plan: Zorg-sentiment Playful National Mood Dashboard

**Branch**: `001-a-playful-web` | **Date**: 2025-10-04 | **Spec**: specs/001-a-playful-web/spec.md  
**Input**: Feature specification from `/specs/001-a-playful-web/spec.md`

## Execution Flow (/plan command scope)

```
1. Load feature spec from Input path ✔
2. Fill Technical Context (scan for NEEDS CLARIFICATION) ✔ (none remain)
3. Fill the Constitution Check section based on the content of the constitution document. ✔
4. Evaluate Constitution Check section below ✔ (no violations)
5. Execute Phase 0 → research.md (created) ✔
6. Execute Phase 1 → contracts/, data-model.md, quickstart.md ✔
7. Re-evaluate Constitution Check section ✔ (still compliant)
8. Plan Phase 2 → Describe task generation approach ✔
9. STOP - Ready for /tasks command
```

## Summary

Public, static Nuxt-generated dashboard (Netlify) presenting a composite 0–100 sentiment score, 24h hourly trend, top 10 growth topics, spike & polarizing detection, and playful AI commentary (≤400 chars) with graceful fallbacks; design emphasizes static-first delivery, accessibility (WCAG AA), performance budgets, and no server-side state or databases.

## Technical Context

**Language/Version**: TypeScript (Nuxt 3, latest minor)  
**Primary Dependencies**: Nuxt 3 core, single CSS utility (Tailwind) (no additional UI frameworks), lightweight charting lib (e.g., Chart.js or ECharts – final pick deferred to tasks)  
**Storage**: None (no databases); client only localStorage for onboarding dismissal  
**Testing**: Vitest (unit), Playwright (later for integration/UI), Axe CI scan  
**Target Platform**: Static web (modern evergreen browsers + responsive mobile)  
**Project Type**: single (frontend-only static site)  
**Performance Goals**: LCP <2.5s Fast 3G, JS initial bundle ≤180KB uncompressed, TTI <3s on mid-tier mobile  
**Constraints**: Static generation only, zero server functions, images <200KB (lazy if larger), accessibility WCAG AA  
**Scale/Scope**: Single public dashboard (anticipated low concurrency impact due to static hosting); 1 core page + supportive modular components

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle / Constraint          | Plan Alignment                                                         | Risk / Mitigation                                           |
| ------------------------------- | ---------------------------------------------------------------------- | ----------------------------------------------------------- |
| Static-First Delivery           | All content pre-generated + client fetch                               | Keep any dynamic data fetch optional; fallback placeholders |
| Accessibility & Semantics       | Labels, ARIA for charts, color contrast enforced, Axe gate             | Add accessibility checklist to tasks                        |
| Simplicity & Modular Components | Composables for data & formatting; presentational components stateless | Avoid premature abstraction until 3rd reuse                 |
| Framework (Nuxt 3 static)       | Confirmed `nuxi generate` only                                         | No SSR-specific features introduced                         |
| Deployment (Netlify)            | netlify.toml build = `npm run generate` publish `dist/`                | Add build validation in tasks                               |
| Styling single utility          | Tailwind only                                                          | Prevent adding second utility via dependency review step    |
| State strategy                  | Local component state + composables; no Pinia yet                      | Pinia gate only when ≥3 routes need shared store            |
| Assets optimized                | Budget + lazy load >200KB                                              | Add asset lint script (future)                              |
| Dependency governance           | Each new dep requires PR justification                                 | Template for PR description in repo contributing guidelines |

Result: PASS (no deviations → empty Complexity Tracking)

## Project Structure

### Documentation (this feature)

```
specs/001-a-playful-web/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
└── tasks.md (future)
```

### Source Code (repository root)

```
src/
├── components/
│   ├── sentiment/
│   ├── topics/
│   ├── layout/
│   └── shared/
├── composables/
│   ├── useSentimentSnapshot.ts
│   ├── useTopics.ts
│   ├── useCommentary.ts
│   ├── useSpikeDetection.ts
│   └── useOnboardingHint.ts
├── services/
│   ├── api-client.ts
│   ├── transforms/
│   └── mappers/
├── utils/
│   ├── scoring.ts
│   ├── formatting.ts
│   └── accessibility.ts
├── pages/
│   └── index.vue
└── assets/
    ├── styles/
    └── images/

tests/
├── unit/
│   ├── composables/
│   └── utils/
├── contract/
└── integration/
```

**Structure Decision**: Adopt single static frontend with Nuxt 3; no backend directory introduced; composables boundary ensures logic reuse while avoiding premature global store.

## Phase 0: Outline & Research (research.md)

Focus areas resolved from specification (no remaining NEEDS CLARIFICATION):

- Topic growth ranking method vs alternatives
- Spike detection statistical threshold justification
- Polarizing threshold selection rationale
- Performance budget rationale & trade-offs
- Accessibility approach for data visualizations

`research.md` includes Decision/Rationale/Alternatives for each above.

## Phase 1: Design & Contracts

Artifacts created:

- `data-model.md`: Field definitions for SentimentSnapshot, Topic, Commentary, RefreshMetadata; validation rules (range checks, freshness timing, label mapping table).
- `contracts/`: Placeholder OpenAPI-style markdown stubs (even though client-only, we define expected external API shapes for integration reference) — sentiment feed, topics feed, commentary endpoint schema references.
- `quickstart.md`: Steps to install deps, run generation, execute tests & accessibility scan locally.
- Agent context file update deferred until tasks phase (will run update-agent-context script then) per instruction gating; not required to finalize plan.

## Phase 2: Task Planning Approach (Preview)

Tasks will map:

- Each FR (001–020) → at least one test-first task
- Entities → model & validation util creation tasks
- Accessibility & performance budgets → lint/check tasks
- Constitution gates → CI pipeline tasks
  Parallelizable tasks flagged [P] (independent composables, utility modules, contract schema stubs).

## Phase 3+: Future Implementation

Deferred to /tasks and subsequent execution.

## Complexity Tracking

(No constitutional violations – table intentionally empty)

## Progress Tracking

**Phase Status**:

- [x] Phase 0: Research complete (/plan command)
- [x] Phase 1: Design complete (/plan command)
- [ ] Phase 2: Task planning complete (/plan command - describe approach only)
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:

- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS
- [x] All NEEDS CLARIFICATION resolved
- [ ] Complexity deviations documented (none required)

---

_Based on Constitution v0.1.0 - See `/memory/constitution.md`_

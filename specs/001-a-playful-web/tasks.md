# Tasks: Zorg-sentiment Playful National Mood Dashboard

**Input**: Design documents from `/specs/001-a-playful-web/`
**Prerequisites**: plan.md (required), research.md, data-model.md, contracts/, quickstart.md

## Execution Flow (main)

```
1. Loaded plan.md → extracted tech + structure
2. Loaded research.md → decisions inform performance & a11y tasks
3. Loaded data-model.md → entities → model & validation tasks
4. Loaded contracts/ → 3 contract test tasks
5. Loaded quickstart.md → build & script tasks
6. Generated ordered task list (setup → tests → models → services → composables → UI → polish)
7. Applied parallel [P] markers for independent files
8. Validated: all contracts mapped, all entities mapped, tests precede implementation
9. SUCCESS
```

## Phase 3.1: Setup

- [x] T001 Initialize Nuxt 3 project skeleton (static mode) in root (create `package.json`, `nuxt.config.ts`, `pages/index.vue`) referencing performance & accessibility goals.
- [x] T002 Add Tailwind CSS setup (single utility) and base styles under `assets/styles/`.
- [x] T003 Configure scripts in `package.json`: `dev`, `generate`, `preview`, `test:unit`, `test:integration`, `test:accessibility`, `analyze:bundle` (placeholder), `lint`.
- [x] T004 Add `netlify.toml` with build command `npm run generate` and publish `dist/`.
- [x] T005 Configure ESLint + Prettier + TypeScript strict mode.
- [x] T006 [P] Add performance budget check placeholder script (`scripts/size-check.mjs`) failing if >180KB (stub logic initially).
- [x] T007 [P] Add accessibility test placeholder script (axe run stub) under `tests/accessibility/`.
- [x] T008 Add GitHub Action (or CI config) running: install, lint, unit tests, generate, size check, accessibility script.

## Phase 3.2: Tests First (TDD) ⚠️

Contract & integration tests must FAIL before implementation.

- [x] T009 [P] Contract test sentiment feed schema in `tests/contract/sentiment-feed.test.ts` validating required fields & ranges.
- [x] T010 [P] Contract test topics feed schema in `tests/contract/topics-feed.test.ts` including derived calculations (growthPercent conditions, polarizing flag formula).
- [x] T011 [P] Contract test commentary feed schema in `tests/contract/commentary-feed.test.ts` (success + fallback cases).
- [x] T012 [P] Integration test overall dashboard load in `tests/integration/dashboard-load.test.ts` (renders score, trend placeholder, topics placeholder, commentary placeholder).
- [x] T013 [P] Integration test stale data indicator in `tests/integration/stale-indicator.test.ts` (age >30m triggers stale badge).
- [x] T014 [P] Integration test polarizing topic badge in `tests/integration/polarizing-topic.test.ts`.
- [x] T015 [P] Integration test spike detection marker in `tests/integration/spike-detection.test.ts` (mock prior scores + current spike).
- [x] T016 [P] Integration test onboarding hint dismissal in `tests/integration/onboarding-hint.test.ts`.

## Phase 3.3: Core Models & Utilities

- [x] T017 [P] Implement TypeScript interfaces/types for entities in `src/utils/types.ts` (SentimentSnapshot, Topic, Commentary, RefreshMetadata).
- [x] T018 [P] Implement validation helpers in `src/utils/validation.ts` (percent sum tolerance, polarity calc, spike rule helper).
- [x] T019 [P] Implement label mapping & range logic in `src/utils/scoring.ts` with tests in `tests/unit/utils/scoring.test.ts`.
- [x] T020 [P] Implement formatting utilities (time age, number formatting) in `src/utils/formatting.ts` with tests.
- [x] T021 Implement accessibility utilities in `src/utils/accessibility.ts` (generate table summary text for snapshot + topics) with tests.

## Phase 3.4: Services & API Abstraction

- [x] T022 Create API client base in `src/services/api-client.ts` (fetch wrapper, error normalization) with unit test.
- [x] T023 [P] Add sentiment fetch service in `src/services/sentiment-service.ts` converting raw response to SentimentSnapshot + spikeFlag.
- [x] T024 [P] Add topics fetch service in `src/services/topics-service.ts` computing growthPercent, netPolarity, polarizingFlag.
- [x] T025 [P] Add commentary fetch service in `src/services/commentary-service.ts` including fallback handling.
- [x] T026 Add refresh orchestrator in `src/services/refresh-service.ts` calling three services and producing cohesive payload (marks partial flags).

## Phase 3.5: Composables (Data + State)

- [x] T027 Implement `useSentimentSnapshot` in `src/composables/useSentimentSnapshot.ts` (fetch + reactive state + error state) with unit test.
- [x] T028 [P] Implement `useTopics` in `src/composables/useTopics.ts` (fetch, deduplicate heuristic, derived polarizing filter) with unit test.
- [x] T029 [P] Implement `useCommentary` in `src/composables/useCommentary.ts` (single attempt, fallback text) with unit test.
- [x] T030 [P] Implement `useSpikeDetection` (wrap scoring helpers, mark spike for UI) with unit test.
- [x] T031 Implement `useOnboardingHint` using localStorage key `zs_onboard_v1` with unit + integration test.

## Phase 3.6: UI Components

- [x] T032 Build sentiment score component in `src/components/sentiment/SentimentScore.vue` (label + tooltip) with unit test.
- [x] T033 [P] Build sentiment trend component `src/components/sentiment/SentimentTrend.vue` (hourly buckets; textual fallback if no chart lib yet) with unit test.
- [x] T034 [P] Build topics list component `src/components/topics/TopicsList.vue` (ranking, polarizing badges) with unit test.
- [x] T035 [P] Build commentary panel `src/components/sentiment/CommentaryPanel.vue` (AI Generated tag, fallback) with unit test.
- [x] T036 Build freshness indicator `src/components/shared/FreshnessBadge.vue` with unit test.
- [x] T037 Assemble layout & index page `src/pages/index.vue` wiring all components + onboarding hint.

## Phase 3.7: Integration Wiring & Finalization

- [x] T038 Implement data refresh loop (interval or on-demand + manual refresh button) in `src/pages/index.vue` constrained to client-only.
- [ ] T039 Add accessibility pass: ensure ARIA labels, tab order, color contrast; update `tests/accessibility/` assertions.
- [ ] T040 Add performance budget check logic to `scripts/size-check.mjs` (count uncompressed JS bundle size) and fail CI if >180KB.
- [ ] T041 Add Playwright initial smoke tests (dashboard loads, elements visible) under `tests/integration/playwright/`.
- [ ] T042 Update CI pipeline to include Playwright run (skip on draft PRs possibly).

## Phase 3.8: Polish & Documentation

- [ ] T043 [P] Refactor duplicate logic (if any) after initial green tests (enforce “rule of three”).
- [ ] T044 [P] Add README section summarizing sentiment methodology & label bins.
- [ ] T045 [P] Add bundle analysis report generation script (`analyze:bundle`).
- [ ] T046 Review dependency list; document justifications for any added packages in `docs/dependencies.md`.
- [ ] T047 Final accessibility audit and fix remaining issues.
- [ ] T048 Final performance measurement (LCP, TTI) documentation in `docs/performance.md`.
- [ ] T049 Prepare release notes (VERSION 0.1.0) summarizing MVP scope.

## Dependencies Overview

- Setup (T001–T008) precedes all.
- Contract & integration tests (T009–T016) must exist & fail before implementations (T017+).
- Utilities (T017–T021) precede services (T022–T026).
- Services precede composables (T027–T031).
- Composables precede UI components (T032–T037).
- UI assembled before refresh loop & accessibility/performance hardening (T038–T042).
- Polish tasks (T043–T049) after core green.

## Parallel Execution Guidance

Example initial parallel test batch:

```
Run in parallel: T009 T010 T011 T012 T013 T014 T015 T016
```

Example utilities parallel batch:

```
Run in parallel: T017 T018 T019 T020
```

Example services parallel batch:

```
Run in parallel: T023 T024 T025
```

Example composables parallel batch:

```
Run in parallel: T028 T029 T030
```

Example component parallel batch:

```
Run in parallel: T033 T034 T035
```

## Validation Checklist

- [x] All contracts mapped to contract test tasks (T009–T011)
- [x] All entities mapped to model/utility tasks (T017, T018, T019)
- [x] Tests precede implementation for each functional area
- [x] Parallel tasks do not share files
- [x] Each task specifies or implies exact file path
- [x] Performance & accessibility tasks included (T039, T040, T048)

## SUCCESS

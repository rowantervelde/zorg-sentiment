# Tasks: Sentiment Snapshot Service

**Feature**: `002-sentiment-snapshot-service`  
**Input**: Design documents from `/specs/002-sentiment-snapshot-service/`  
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/sentiment-feed.md ✅

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and dependency installation

- [x] **T001** Install production dependencies: `npm install sentiment p-retry p-queue bottleneck simple-statistics franc-min` ✅
- [x] **T002** [P] Create TypeScript interfaces in `src/types/sentiment.ts` with SentimentSnapshot, HourlySentimentBucket, SentimentSpikeEvent, DataSourceStatus, HistoricalContextRange, RawMention, ProcessedMention ✅
- [x] **T003** [P] Create data directory structure: `mkdir -p src/server/data/sentiment` and add `.gitkeep` file ✅
- [x] **T004** [P] Update `.gitignore` to exclude `src/server/data/sentiment/*.json` but keep `config.json` ✅
- [x] **T005** Configure environment variables in `.env.local` for TWITTER_BEARER_TOKEN, REDDIT_CLIENT_ID, REDDIT_CLIENT_SECRET, ALERT_WEBHOOK_URL ✅

**Checkpoint**: Dependencies installed, project structure ready ✅

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] **T006** Create base source adapter abstract class in `src/server/api/sentiment/_lib/sources/base.ts` with abstract methods: `fetch()`, `respectsRateLimit()`, `getStatus()` ✅
- [x] **T007** Create logger utility in `src/server/api/sentiment/_lib/logger.ts` with structured console logging (DEBUG, INFO, WARN, ERROR) and alert webhook integration (FR-019, FR-020) ✅
- [x] **T008** Create Dutch sentiment lexicon loader in `src/server/api/sentiment/_lib/sentiment/lexicon.ts` with healthcare-specific terms ✅
- [x] **T009** Implement sentiment analyzer in `src/server/api/sentiment/_lib/sentiment/analyzer.ts` using `sentiment` npm package with Dutch lexicon, language detection (franc-min), healthcare keyword filtering ✅
- [x] **T010** Create engagement weighting utility function in `src/server/api/sentiment/_lib/sentiment/analyzer.ts` using logarithmic scaling formula: `weight = 1.0 * (1 + log10(engagement + 1))` ✅
- [x] **T011** Create content deduplication utility in `src/server/api/sentiment/_lib/sentiment/analyzer.ts` using MD5 hashing for contentHash generation ✅
- [x] **T012** Implement in-memory cache in `src/server/api/sentiment/_lib/storage/cache.ts` with 15-minute TTL (getFromCache, setInCache, clearCache functions) ✅
- [x] **T013** Create hourly bucket storage manager in `src/server/api/sentiment/_lib/storage/buckets.ts` for reading/writing `server/data/sentiment/buckets-YYYY-MM-DD.json` files ✅
- [x] **T014** Implement spike detector in `src/server/api/sentiment/_lib/spike-detector.ts` using `simple-statistics` library for 2σ calculation from 12-hour rolling mean (FR-005) ✅
- [x] **T015** Create rate limiter configurations in `src/server/api/sentiment/_lib/rate-limiter.ts` using `bottleneck` for per-source rate limits (Twitter: 450/15min, Reddit: 60/min, Mastodon: 300/5min) ✅

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel ✅

---

## Phase 3: User Story 1 - View Current Public Sentiment (Priority: P1) 🎯 MVP

**Goal**: Display current sentiment score (0-100) and mood label within 3 seconds to give users immediate insight into public healthcare sentiment

**Independent Test**: Load dashboard and verify sentiment score (0-100) + mood label displayed within 3 seconds (SC-001)

### Implementation for User Story 1

- [x] **T016** [P] [US1] Implement Twitter source adapter in `src/server/api/sentiment/_lib/sources/twitter.ts` extending base.ts, using p-retry for exponential backoff (3 retries), bottleneck rate limiter (450 req/15min), fetch Dutch healthcare tweets with Twitter API v2 search endpoint ✅
- [x] **T017** [P] [US1] Implement Reddit source adapter in `src/server/api/sentiment/_lib/sources/reddit.ts` extending base.ts, using OAuth2 authentication, bottleneck rate limiter (60 req/min), search r/Netherlands and healthcare subreddits for Dutch content ✅
- [x] **T018** [P] [US1] Implement Mastodon source adapter in `src/server/api/sentiment/_lib/sources/mastodon.ts` extending base.ts, using public API (no auth), bottleneck rate limiter (300 req/5min), search federated timeline for Dutch healthcare posts ✅
- [x] **T019** [P] [US1] Implement RSS source adapter in `src/server/api/sentiment/_lib/sources/rss.ts` extending base.ts, fetch from Nu.nl and Google News RSS feeds, parse XML to RawMention objects ✅
- [x] **T020** [P] [US1] Implement Tweakers source adapter in `src/server/api/sentiment/_lib/sources/tweakers.ts` extending base.ts, fetch from Tweakers forum JSON API for healthcare discussions ✅
- [x] **T021** [US1] Create aggregator service in `src/server/api/sentiment/_lib/aggregator.ts` with collectFromSources() using Promise.allSettled for parallel fetching (p-queue max 3 concurrent), analyzeSentiment() to classify mentions, aggregateIntoBuckets() to create HourlySentimentBucket objects, calculateComposite() using formula `((positive - negative) / total) * 50 + 50`, buildSnapshot() to construct SentimentSnapshot (FR-001, FR-002, FR-003, FR-010) ✅
- [x] **T021b** [US1] Implement source recovery backfill logic in `src/server/api/sentiment/_lib/aggregator.ts` to detect when DataSourceStatus transitions from unavailable to available, fetch last 24 hours of missing data from recovered source, merge into existing hourly buckets without duplicates (FR-022) ✅
- [x] **T022** [US1] Implement main API endpoint in `src/server/api/sentiment/index.get.ts` with cache check (getFromCache), duplicate request prevention (FR-023), call generateSnapshot() from aggregator, handle errors with 503 status for insufficient data, return SentimentSnapshot with Cache-Control headers (max-age=900) ✅
- [x] **T023** [US1] Update existing composable `src/composables/useSentimentSnapshot.ts` to fetch from /api/sentiment endpoint, handle loading/error states, implement auto-refresh every 5 minutes, return readonly refs for snapshot, loading, error ✅
- [x] **T024** [US1] Create SentimentScore component in `src/components/sentiment/SentimentScore.vue` to display compositeScore (0-100) and sentimentLabel with appropriate styling per mood (Bleak/Tense/Mixed/Upbeat/Sunny)
- [x] **T025** [US1] Update dashboard page in `src/pages/index.vue` to integrate SentimentScore component with useSentimentSnapshot composable, display loading state, show error message if service unavailable (FR-011, FR-018)

**Checkpoint**: User Story 1 complete - Dashboard displays current sentiment score and label within 3 seconds ✅

---

## Phase 4: User Story 2 - Understand Sentiment Trends (Priority: P2)

**Goal**: Show 24-hour hourly sentiment trend to help users identify sentiment patterns over time

**Independent Test**: View dashboard and verify 24 hourly data points are displayed in trend visualization

**⚠️ Note**: Tasks T026, T029, T033, T035, T038 modify aggregator.ts sequentially - complete T021/T021b before starting these updates

### Implementation for User Story 2

- [ ] **T026** [US2] Update aggregator in `src/server/api/sentiment/_lib/aggregator.ts` to read last 24 hours from buckets storage using readBuckets() from storage/buckets.ts, append current hour bucket to array, ensure hourlyBuckets array length = 24 (FR-004) - Sequential update to aggregator, not parallelizable with T021
- [ ] **T027** [US2] Create SentimentTrend component in `src/components/sentiment/SentimentTrend.vue` accepting hourlyBuckets prop, render line chart or sparkline showing composite scores over 24 hours, highlight positive vs negative hours with color coding
- [ ] **T028** [US2] Update dashboard page in `src/pages/index.vue` to pass snapshot.hourlyBuckets to SentimentTrend component below SentimentScore

**Checkpoint**: User Story 2 complete - Dashboard shows 24-hour sentiment trend with hourly granularity ✅

---

## Phase 5: User Story 3 - Detect Significant Mood Shifts (Priority: P2)

**Goal**: Alert users to dramatic sentiment changes by detecting spikes (2σ from 12-hour mean)

**Independent Test**: Simulate spike scenario (inject synthetic data with >2σ deviation) and verify spike indicator appears

### Implementation for User Story 3

- [ ] **T029** [US3] Update aggregator in `src/server/api/sentiment/_lib/aggregator.ts` to call spike detector with current composite score and last 12 hourly bucket scores, set isSpikeDetected and spikeDirection in SentimentSnapshot based on detector response (FR-005, FR-006) - Sequential update to aggregator after T026
- [ ] **T030** [US3] Update SentimentScore component in `src/components/sentiment/SentimentScore.vue` to display spike indicator (icon/badge) when snapshot.isSpikeDetected is true, show direction (positive 🔼 / negative 🔽), use attention-grabbing styling
- [ ] **T031** [US3] Log spike events to `src/server/data/sentiment/spikes.jsonl` in append-only format when detected, include timestamp, currentScore, mean12Hour, stdDev12Hour, direction, magnitude

**Checkpoint**: User Story 3 complete - Dashboard highlights sentiment spikes with directional indicator ✅

---

## Phase 6: User Story 4 - Assess Sentiment in Context (Priority: P3)

**Goal**: Display 30-day min/max context so users can evaluate if current sentiment is typical or unusual

**Independent Test**: View dashboard and verify 30-day minimum and maximum scores are displayed below current score

### Implementation for User Story 4

- [ ] **T032** [US4] Create historical context calculator in `src/server/api/sentiment/_lib/storage/context.ts` that reads 30 days of bucket files from `server/data/sentiment/buckets-*.json`, computes min/max composite scores, tracks timestamps of when min/max occurred, generates HistoricalContextRange object
- [ ] **T033** [US4] Update aggregator in `src/server/api/sentiment/_lib/aggregator.ts` to call context calculator and populate min30Day, max30Day fields in SentimentSnapshot (FR-007) - Sequential update to aggregator after T029
- [ ] **T034** [US4] Update SentimentScore component in `src/components/sentiment/SentimentScore.vue` to display "30-day range: [min]–[max]" below current score, use subdued styling for context info

**Checkpoint**: User Story 4 complete - Dashboard shows 30-day historical context for sentiment interpretation ✅

---

## Phase 7: User Story 5 - Verify Data Freshness (Priority: P3)

**Goal**: Show timestamp and stale data warning so users trust data recency

**Independent Test**: View dashboard and verify "Last updated X minutes ago" is displayed; wait >30 minutes and verify stale indicator appears

### Implementation for User Story 5

- [ ] **T035** [US5] Update aggregator in `src/server/api/sentiment/_lib/aggregator.ts` to calculate ageMinutes as `(now - timestamp) / 60000`, set isStale to true when ageMinutes > 30 (FR-009) - Sequential update to aggregator after T033
- [ ] **T036** [US5] Create FreshnessBadge component in `src/components/shared/FreshnessBadge.vue` (already exists, may need updates) accepting ageMinutes and isStale props, display "Updated X min ago" in normal style, show "⏱️ Stale" warning when isStale is true with grey/muted styling
- [ ] **T037** [US5] Update dashboard page in `src/pages/index.vue` to display FreshnessBadge with snapshot.ageMinutes and snapshot.isStale props near sentiment score

**Checkpoint**: User Story 5 complete - Dashboard shows data age and stale warnings ✅

---

## Phase 8: User Story 6 - Handle Data Unavailability Gracefully (Priority: P3)

**Goal**: Display helpful error messages instead of broken UI when sources fail

**Independent Test**: Simulate all sources failing (mock 503 response) and verify friendly error message appears

### Implementation for User Story 6

- [ ] **T038** [US6] Update aggregator in `src/server/api/sentiment/_lib/aggregator.ts` to throw InsufficientDataError when fewer than 2 sources succeed, populate sourcesUsed and sourcesUnavailable arrays in SentimentSnapshot (FR-010, FR-011) - Sequential update to aggregator after T035
- [ ] **T039** [US6] Update API endpoint in `src/server/api/sentiment/index.get.ts` to catch InsufficientDataError and return 503 response with error object containing message "At least 2 sources required", attemptedSources, sourcesAvailable, sourcesUnavailable, retryAfter: 300 (FR-018)
- [ ] **T040** [US6] Update dashboard page in `src/pages/index.vue` to handle error response from useSentimentSnapshot, display friendly message "Data temporarily unavailable. We're having trouble collecting sentiment data from our sources. Please check back in 5 minutes." instead of raw error, implement auto-retry after 5 minutes
- [ ] **T041** [US6] Update SentimentScore component in `src/components/sentiment/SentimentScore.vue` to show "⚠️ Partial data" warning badge when snapshot.sourcesUnavailable.length > 0, display count "Based on X of 5 sources"

**Checkpoint**: User Story 6 complete - Dashboard handles source failures with graceful error messages ✅

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] **T042** [P] Add contract tests in `tests/contract/sentiment-feed.test.ts` covering: schema validation (all required fields present), response time <3s (SC-001), sentiment label mapping (FR-003), spike detection consistency, staleness flag logic (FR-009), source availability constraints (FR-010), error response formats, cache headers, hourly buckets chronological order, historical context validity
- [ ] **T043** [P] Add integration tests in `tests/integration/sentiment-aggregation.test.ts` covering: end-to-end aggregation with mock sources, partial source failure scenarios (2/5 sources), rate limit handling, cache TTL behavior (15-minute expiry), spike detection with synthetic time-series
- [ ] **T044** [P] Add unit tests in `tests/unit/services/sentiment/aggregator.test.ts` for aggregation logic, composite score calculation formula, mention weighting with engagement metrics
- [ ] **T045** [P] Add unit tests in `tests/unit/services/sentiment/analyzer.test.ts` for sentiment classification (positive/neutral/negative), Dutch language detection accuracy, healthcare keyword filtering, content deduplication
- [ ] **T046** [P] Add unit tests in `tests/unit/services/sentiment/spike-detector.test.ts` for 2σ calculation, 12-hour rolling mean computation, spike direction determination
- [ ] **T047** [P] Add unit tests for each source adapter in `tests/unit/services/sentiment/sources/` testing: HTTP retry logic, rate limit enforcement, response parsing, error handling
- [ ] **T048** Implement data rotation script (cron job or GitHub Actions workflow) to aggregate hourly→daily buckets after 30 days (FR-021), triggered nightly, reads buckets-YYYY-MM-DD.json files older than 30 days, computes daily aggregates (avgComposite, minComposite, maxComposite, totalMentions), writes to daily-YYYY-MM.json, deletes old hourly files
- [ ] **T049** Setup Netlify build hook trigger for 15-minute refresh cadence during active hours (6 AM - midnight CET) using external cron service or GitHub Actions workflow (FR-015)
- [ ] **T050** Configure alert webhook integration in `src/server/api/sentiment/_lib/logger.ts` to send critical alerts (all sources down >5 min, staleness >60 min, rate limit violations) to monitoring service (FR-020)
- [ ] **T051** Add monitoring dashboard configuration or documentation for tracking SLOs: p95 response time <3s, 99.5% availability 6AM-midnight CET, error rate <1%, source failure tracking
- [ ] **T052** [P] Update documentation in `README.md` with feature overview, API endpoint documentation (`GET /api/sentiment`), environment variable requirements
- [ ] **T053** [P] Performance optimization: profile aggregator.ts for slow queries, optimize bucket file reads, verify cache hit performance <50ms, ensure aggregation completes <45s (SC-016)
- [ ] **T054** Security review: verify no PII storage (FR-017), validate rate limit compliance (FR-016), ensure API keys stored securely in environment variables
- [ ] **T055** Run quickstart.md validation by following setup instructions end-to-end, test Twitter adapter first, verify contract tests pass, confirm dashboard displays sentiment data

**Checkpoint**: All polish tasks complete - Feature ready for production deployment ✅

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion (T001-T005) - BLOCKS all user stories
- **User Stories (Phase 3-8)**: All depend on Foundational phase completion (T006-T015)
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order: US1 (P1) → US2 (P2) → US3 (P2) → US4 (P3) → US5 (P3) → US6 (P3)
- **Polish (Phase 9)**: Depends on desired user stories being complete (minimum US1 for MVP)

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (T015) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after US1 aggregator complete (T021/T021b) - Sequential modification to aggregator.ts
- **User Story 3 (P2)**: Can start after US2 aggregator complete (T026) - Sequential modification to aggregator.ts, extends US1's SentimentScore component
- **User Story 4 (P3)**: Can start after US3 aggregator complete (T029) - Sequential modification to aggregator.ts, adds context calculator
- **User Story 5 (P3)**: Can start after US4 aggregator complete (T033) - Sequential modification to aggregator.ts, extends US1's display logic
- **User Story 6 (P3)**: Can start after US5 aggregator complete (T035) - Sequential modification to aggregator.ts, extends US1's error handling

**⚠️ Important**: While user stories are conceptually independent, tasks T026, T029, T033, T035, T038 all modify the same aggregator.ts file and must be done sequentially to avoid merge conflicts.

### Within Each User Story

**US1 Critical Path**:

1. Source adapters (T016-T020) in parallel → Aggregator (T021) → Backfill logic (T021b) → API endpoint (T022) → Composable (T023) → Component (T024) → Dashboard integration (T025)

**US2 Critical Path**:

1. Update aggregator (T026) → Create trend component (T027) → Dashboard integration (T028) - **Depends on T021 completion**

**US3 Critical Path**:

1. Update aggregator (T029) → Update component (T030) → Add logging (T031) - **Depends on T026 completion**

**US4 Critical Path**:

1. Create context calculator (T032) → Update aggregator (T033) → Update component (T034) - **T033 depends on T029**

**US5 Critical Path**:

1. Update aggregator (T035) → Create badge component (T036) → Dashboard integration (T037) - **T035 depends on T033**

**US6 Critical Path**:

1. Update aggregator (T038) → Update endpoint (T039) → Dashboard error handling (T040) → Component warning (T041) - **T038 depends on T035**

### Parallel Opportunities

**Phase 1 Setup**: All tasks T001-T005 can run in parallel

**Phase 2 Foundational**:

- T006 (base adapter) must complete before source adapters
- T007 (logger), T008-T011 (sentiment), T012-T013 (storage), T014 (spike), T015 (rate limiting) can run in parallel after T006

**Phase 3 User Story 1**:

- T016-T020 (all 5 source adapters) can run in parallel (different files)
- T024 (SentimentScore component) can run in parallel with T023 (composable)

**Phase 9 Polish**:

- All test tasks (T042-T047) can run in parallel (different test files)
- T052 (README updates) can run in parallel with testing tasks

---

## Parallel Example: User Story 1 Source Adapters

```bash
# Launch all source adapters together (Phase 3, User Story 1):
Task T016: "Implement Twitter adapter in src/server/api/sentiment/_lib/sources/twitter.ts"
Task T017: "Implement Reddit adapter in src/server/api/sentiment/_lib/sources/reddit.ts"
Task T018: "Implement Mastodon adapter in src/server/api/sentiment/_lib/sources/mastodon.ts"
Task T019: "Implement RSS adapter in src/server/api/sentiment/_lib/sources/rss.ts"
Task T020: "Implement Tweakers adapter in src/server/api/sentiment/_lib/sources/tweakers.ts"

# All 5 adapters extend the same base class (T006) but operate on independent files
# Can be developed by 5 different team members simultaneously
```

---

## Implementation Strategy

### MVP First (User Story 1 Only) - Fastest Path to Value

**Estimated Time**: 6-8 hours

1. ✅ Complete Phase 1: Setup (T001-T005) - **30 minutes**
2. ✅ Complete Phase 2: Foundational (T006-T015) - **2 hours**
3. ✅ Complete Phase 3: User Story 1 (T016-T025, includes T021b) - **3-4 hours**
4. **STOP and VALIDATE**: Test dashboard displays sentiment score + label within 3 seconds
5. **DEPLOY MVP**: Netlify deployment with single user story functional
6. Optional: Add T042-T047 (contract/integration tests) for production confidence - **1 hour**

**MVP Delivers**:

- Current sentiment score (0-100) ✅
- Mood label (Bleak/Tense/Mixed/Upbeat/Sunny) ✅
- Data from 5 sources ✅
- 24-hour backfill when sources recover (FR-022) ✅
- <3 second load time ✅
- Error handling for source failures ✅

### Full Feature (All User Stories) - Complete Experience

**Estimated Time**: 16-24 hours

1. Complete Setup + Foundational (T001-T015) - **2.5 hours**
2. Complete User Story 1 (T016-T025) - **4 hours**
3. Complete User Story 2 (T026-T028) - **1 hour**
4. Complete User Story 3 (T029-T031) - **1 hour**
5. Complete User Story 4 (T032-T034) - **1.5 hours**
6. Complete User Story 5 (T035-T037) - **1 hour**
7. Complete User Story 6 (T038-T041) - **1.5 hours**
8. Complete Polish (T042-T055) - **4-6 hours** (tests, monitoring, docs)

**Full Feature Delivers**:

- All MVP features ✅
- 24-hour trend visualization ✅
- Spike detection alerts ✅
- 30-day historical context ✅
- Data freshness indicators ✅
- Graceful error handling ✅
- Comprehensive test coverage ✅
- Production monitoring ✅

### Incremental Delivery (Recommended)

**Week 1**: MVP (US1 only)

- Deploy basic sentiment display
- Validate with real users
- Gather feedback

**Week 2**: Add Trends + Spikes (US2 + US3)

- Enable pattern recognition
- Add spike alerts

**Week 3**: Context + Polish (US4 + US5 + US6)

- Historical context
- Data quality indicators
- Full test coverage

**Week 4**: Production Hardening (Phase 9)

- Monitoring setup
- Performance optimization
- Documentation finalization

### Parallel Team Strategy (3 Developers)

**After Foundational Phase Completes**:

- **Developer A**: User Story 1 (T016-T025) - Core functionality
- **Developer B**: User Story 2 + 3 (T026-T031) - Trends + Spikes
- **Developer C**: User Story 4 + 5 + 6 (T032-T041) - Context + Polish

Stories integrate independently without conflicts.

---

## Task Count Summary

- **Phase 1 (Setup)**: 5 tasks
- **Phase 2 (Foundational)**: 10 tasks (BLOCKING)
- **Phase 3 (US1 - View Current Sentiment)**: 11 tasks (includes T021b for FR-022 backfill)
- **Phase 4 (US2 - Understand Trends)**: 3 tasks
- **Phase 5 (US3 - Detect Spikes)**: 3 tasks
- **Phase 6 (US4 - Historical Context)**: 3 tasks
- **Phase 7 (US5 - Data Freshness)**: 3 tasks
- **Phase 8 (US6 - Error Handling)**: 4 tasks
- **Phase 9 (Polish)**: 14 tasks

**Total**: 56 tasks

**Parallel Opportunities Identified**:

- 5 tasks in Phase 1 (all [P])
- 9 tasks in Phase 2 (after T006)
- 6 tasks in Phase 3 US1 (5 source adapters + 1 component)
- 6 test tasks in Phase 9 (all [P])
- 3+ user stories can run in parallel after Foundational

**MVP Scope** (US1 only): 26 tasks (Phases 1-3, includes T021b for FR-022)

**Production Ready** (All US): 56 tasks (All phases)

---

## Notes

- **[P]** tasks = different files, no dependencies within phase
- **[Story]** label maps task to specific user story for traceability (US1-US6)
- Each user story is independently completable and testable
- Tests are included in Phase 9 (not TDD approach per requirements - implementation first)
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Critical path: Setup → Foundational (BLOCKS) → US1 → Deploy MVP
- Source adapters (T016-T020) are highest parallelism opportunity (5 files, same interface)
- Avoid: modifying aggregator.ts in parallel (used by multiple stories)

---

## References

- **Specification**: [spec.md](./spec.md) - User stories and requirements
- **Implementation Plan**: [plan.md](./plan.md) - Tech stack and project structure
- **Research**: [research.md](./research.md) - Technology decisions and patterns
- **Data Model**: [data-model.md](./data-model.md) - Entity definitions and schemas
- **API Contract**: [contracts/sentiment-feed.md](./contracts/sentiment-feed.md) - Endpoint specification
- **Developer Guide**: [quickstart.md](./quickstart.md) - Implementation walkthrough with code examples

---

**Status**: ✅ READY FOR IMPLEMENTATION

**Recommended Start**: Complete MVP (Phases 1-3, 25 tasks) in first sprint, then iterate with additional user stories.

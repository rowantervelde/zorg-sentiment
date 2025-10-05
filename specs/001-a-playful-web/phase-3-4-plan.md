# Phase 3.4 Services Implementation Plan

## Goals

- Transform external API responses into internal `DashboardPayload` entities.
- Preserve TDD flow by writing unit tests for each service before implementation.
- Ensure graceful degradation and normalized error handling across feeds.

## Tasks Overview

1. **T022 – API Client Base**
   - Write tests under `tests/unit/services/api-client.test.ts` covering:
     - Successful JSON fetch with typed return.
     - HTTP error normalization (status, message).
     - Network failure fallback.
   - Implement `src/services/api-client.ts` with:
     - `fetchJson<T>(endpoint: string, init?: RequestInit)` returning `Promise<T>`.
     - Custom `ApiError` including `status`, `endpoint`, `retryable` flag.
     - Timeout support via `AbortController` (default 8s) to guard against hanging requests.

2. **T023 – Sentiment Service**
   - Tests in `tests/unit/services/sentiment-service.test.ts` ensuring:
     - Contract fields mapped to `SentimentSnapshot` with validation checks.
     - `spikeFlag` computed using `detectSentimentSpike` helper when missing.
     - Invalid payload triggers descriptive `ApiError`.
   - Implementation in `src/services/sentiment-service.ts`:
     - Use `fetchJson` from API client.
     - Apply `clampScore`, `calculateNetPolarity`, etc., as needed.
     - Handle optional `prior12hScores` fallbacks.

3. **T024 – Topics Service**
   - Tests verifying:
     - Growth percent calculation with baseline guard (`prevMentions3h < 5 ⇒ null`).
     - `netPolarity` & `polarizingFlag` reuse validation helpers.
     - Duplicate topic suppression delegated to formatting/composables (service only normalizes data).
   - Implementation outlines `mapTopic` converting raw feed to `Topic` array sorted by growth.

4. **T025 – Commentary Service**
   - Tests for:
     - Handling `status: fallback` and `status: stale` gracefully.
     - Text length enforcement + `lengthChars` derivation.
     - Topic references limited to existing topic names (defer to composable if needed).
   - Implementation handles null text, ensures label matches defined sentiment bands.

5. **T026 – Refresh Orchestrator**
   - Tests confirming:
     - Parallel execution of service calls with error isolation.
     - `RefreshMetadata` partial flags set when topics/commentary fetch fails.
     - Returned payload passes validation helpers.
   - Implementation composes services, aggregates results, and computes age/stale flag.

## Sequencing Rationale

- Start with API client (T022) as dependency for all services.
- Implement sentiment (T023) first to unlock scoring/comparison logic for later composables.
- Topics (T024) next, enabling commentary to cross-reference names and prepare for polarizing badge tests.
- Commentary (T025) before orchestrator to support fallback messaging.
- Orchestrator (T026) final step, wiring all pieces and preparing data for composables and integration tests.

## Testing Strategy

- Unit tests for each service using mocked fetch responses (Vitest + `vi.stubGlobal('fetch', ...)`).
- Ensure error cases throw typed errors consumed by composables later.
- After services implemented, run targeted unit suites plus `npm run test:unit` for regression.
- Integration tests (Phase 3.2) will stay red until composables/UI implemented.

## Risks & Mitigations

- **Inconsistent API schemas**: Guard with validation helpers and clear error messages.
- **Network instability**: Using timeouts and retryable error flags for future retry logic.
- **Data drift**: Keep transformation functions pure and unit-tested for ease of updates.

## Next Steps

1. Scaffold unit tests for API client (fail red).
2. Implement API client until tests pass.
3. Repeat test-first flow for sentiment, topics, commentary services.
4. Conclude with refresh orchestrator and comprehensive payload test.
5. Update todo/task tracking and inform stakeholders of progress.

# Implementation Plan: Sentiment Snapshot Service

**Branch**: `002-sentiment-snapshot-service` | **Date**: 2025-10-11 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-sentiment-snapshot-service/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Build a sentiment aggregation service that collects Dutch healthcare discussions from 5+ public sources, calculates normalized sentiment scores (0-100), detects statistical spikes (2σ from 12-hour mean), and provides hourly trend data for the past 24 hours. The service exposes sentiment snapshots via a server API endpoint consumed by the existing Nuxt 3 static dashboard, refreshing every 15 minutes during active hours with graceful degradation when sources fail.

## Technical Context

**Language/Version**: TypeScript 5.9+ / Node.js 20  
**Primary Dependencies**: Nuxt 3.12 (static mode), Nitro server API routes, sentiment (10KB Dutch NLP), p-retry (3KB) + p-queue (10KB) for HTTP resilience, bottleneck (20KB rate limiting), simple-statistics (10KB spike detection), franc-min (50KB language detection) - total 103KB (see research.md for rationale)  
**Storage**: File-based JSON with in-memory caching (15-minute TTL) - see research.md for decision rationale  
**Testing**: Vitest (unit), Vitest (integration), Playwright (e2e), contract tests  
**Target Platform**: Netlify static hosting + Netlify Functions (serverless API endpoints)  
**Project Type**: Web application (Nuxt 3 frontend + server API routes)  
**Performance Goals**: <3s dashboard load (SC-001), <45s sentiment aggregation (SC-016), 100 concurrent users (SC-010), 15-minute refresh cadence (FR-015)  
**Constraints**: Zero server runtime for UI (static-first), no PII storage (FR-017), respect API rate limits (FR-016), 30-day data retention (FR-021)  
**Scale/Scope**: 5+ data sources (FR-001), 100+ mentions/day (SC-004), 24-hour hourly buckets + 30-day history (FR-004, FR-007)

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

### Static-First Delivery ✅ PASS

- Dashboard UI remains static (`nuxt generate`)
- Sentiment aggregation logic runs in Nitro server API routes (Netlify Functions)
- Client-side fetch to `/api/sentiment` endpoint
- **Justification**: Server API routes are explicitly allowed for dynamic data access per Constitution §1

### Accessibility & Semantics ⚠️ DEFER TO UI IMPLEMENTATION

- No UI changes in this service layer
- Accessibility verification deferred to dashboard UI feature (001-a-playful-web)

### Simplicity & Modular Components ✅ PASS

- Service logic isolated in `/server/api/sentiment/` directory
- Composable `useSentimentSnapshot()` consumes API (already exists in codebase)
- No premature abstractions: implement source adapters on third usage

### Architecture Constraints ✅ PASS

- **Framework**: Nuxt 3.12 in static mode (Constitution §2.1) - existing setup
- **Deployment**: Netlify with `npm run generate` (Constitution §2.2) - no changes
- **Routing**: File-based API routes (`/server/api/sentiment/index.get.ts`) (Constitution §2.3)
- **Styling**: No styling changes (dashboard UI handled separately)
- **State**: Per-component state in composables (Constitution §2.5) - `useSentimentSnapshot` already present
- **Assets**: No new images
- **Dependencies**: Will document new dependencies in Phase 0 research (Constitution §2.7)

### Violations Requiring Justification

**None** - All constitution requirements satisfied by design.

## Project Structure

### Documentation (this feature)

```
specs/002-sentiment-snapshot-service/
├── spec.md              # Feature specification
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   └── sentiment-feed.md
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```
src/
├── composables/
│   ├── useSentimentSnapshot.ts        # Existing: API client wrapper
│   └── useSpikeDetection.ts          # Existing: Spike visualization logic
├── server/
│   └── api/
│       └── sentiment/
│           ├── index.get.ts           # NEW: Main sentiment snapshot endpoint
│           ├── [id].get.ts           # FUTURE: Historical snapshots (out of scope)
│           └── _lib/                  # NEW: Service layer
│               ├── aggregator.ts      # Sentiment aggregation logic
│               ├── sources/           # Data source adapters
│               │   ├── base.ts        # Abstract source interface
│               │   ├── twitter.ts     # Twitter/X API adapter
│               │   ├── reddit.ts      # Reddit API adapter
│               │   ├── mastodon.ts    # Mastodon API adapter
│               │   ├── rss.ts         # Nu.nl/Google News RSS adapter
│               │   └── tweakers.ts    # Tweakers forum adapter
│               ├── sentiment/         # Sentiment analysis
│               │   ├── analyzer.ts    # Dutch sentiment classification
│               │   └── lexicon.ts     # Sentiment lexicon loader
│               ├── storage/           # Data persistence
│               │   ├── buckets.ts     # Hourly bucket management
│               │   └── cache.ts       # Snapshot caching
│               ├── spike-detector.ts  # Statistical spike detection
│               ├── rate-limiter.ts    # Source rate limit handling
│               └── logger.ts          # Diagnostic logging
├── services/
│   └── sentiment-service.ts          # Existing: Service abstraction (may need updates)
└── types/
    └── sentiment.ts                   # NEW: TypeScript interfaces for entities

tests/
├── contract/
│   └── sentiment-feed.test.ts        # Contract tests for API endpoint
├── integration/
│   ├── sentiment-aggregation.test.ts # End-to-end aggregation tests
│   └── spike-detection.test.ts       # Existing: Spike detection tests
└── unit/
    ├── services/
    │   └── sentiment/
    │       ├── aggregator.test.ts     # Aggregation logic tests
    │       ├── analyzer.test.ts       # Sentiment analysis tests
    │       ├── spike-detector.test.ts # Statistical tests
    │       └── sources/               # Source adapter tests
    │           ├── twitter.test.ts
    │           ├── reddit.test.ts
    │           └── [others].test.ts
    └── composables/
        └── useSentimentSnapshot.test.ts # Existing: Composable tests
```

**Structure Decision**: Web application structure selected (Nuxt 3 frontend + server API routes). The sentiment aggregation service runs as Netlify Functions via Nuxt server routes, while the static-generated dashboard consumes the `/api/sentiment` endpoint. This maintains the Constitution's static-first requirement while enabling dynamic data aggregation on the server side.

## Complexity Tracking

_No constitution violations requiring justification_

This feature maintains compliance with all constitution principles:

- Static-first delivery preserved (UI remains static, only server routes added)
- No accessibility changes (service layer only)
- Modular design with clear separation of concerns
- Standard Nuxt 3 patterns followed
- Netlify deployment unchanged

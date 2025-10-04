# Feature Specification: Zorg-sentiment Playful National Mood Dashboard

**Feature Branch**: `001-a-playful-web`  
**Created**: 2025-10-04  
**Status**: Draft  
**Input**: User description: "A playful web app that visualizes how the Netherlands feels about healthcare insurance in real-time what: Zorg-sentiment collects and analyzes public conversations about Dutch healthcare insurance from social media and news sources. It translates this data into an interactive “national mood” dashboard showing sentiment trends, trending topics, and AI-generated commentary. The goal is to make the serious world of healthcare insurance more engaging and human through humor, data, and visual storytelling. why: Healthcare insurance is a serious, data-heavy topic that often feels distant from people’s emotions. Zorg-sentiment bridges that gap by using real-world data to reflect the collective public mood — turning dry sentiment into something visual, relatable, and fun. This app demonstrates how multiple open APIs can combine to create engaging insights from complex, regulated domains. key_features: - Real-time sentiment tracking of Dutch healthcare topics. - Playful AI-generated commentary summarizing the national mood. - Visualization of positive, neutral, and negative trends over time. - Interactive dashboard that invites exploration and conversation."

## Execution Flow (main)

```
1. Parse user description from Input
   → If empty: ERROR "No feature description provided"
2. Extract key concepts from description
   → Identify: actors, actions, data, constraints
3. For each unclear aspect:
   → Mark with [NEEDS CLARIFICATION: specific question]
4. Fill User Scenarios & Testing section
   → If no clear user flow: ERROR "Cannot determine user scenarios"
5. Generate Functional Requirements
   → Each requirement must be testable
   → Mark ambiguous requirements
6. Identify Key Entities (if data involved)
7. Run Review Checklist
   → If any [NEEDS CLARIFICATION]: WARN "Spec has uncertainties"
   → If implementation details found: ERROR "Remove tech details"
8. Return: SUCCESS (spec ready for planning)
```

---

## ⚡ Quick Guidelines

- ✅ Focus on WHAT users need and WHY
- ❌ Avoid HOW to implement (no tech stack, APIs, code structure)
- 👥 Written for business stakeholders, not developers

### Section Requirements

- **Mandatory sections**: Must be completed for every feature
- **Optional sections**: Include only when relevant to the feature
- When a section doesn't apply, remove it entirely (don't leave as "N/A")

### For AI Generation

When creating this spec from a user prompt:

1. **Mark all ambiguities**: Use [NEEDS CLARIFICATION: specific question] for any assumption you'd need to make
2. **Don't guess**: If the prompt doesn't specify something (e.g., "login system" without auth method), mark it
3. **Think like a tester**: Every vague requirement should fail the "testable and unambiguous" checklist item
4. **Common underspecified areas**:
   - User types and permissions
   - Data retention/deletion policies
   - Performance targets and scale
   - Error handling behaviors
   - Integration requirements
   - Security/compliance needs

---

## User Scenarios & Testing _(mandatory)_

### Primary User Story

A curious resident (or journalist) visits the dashboard to quickly understand the current national mood around Dutch healthcare insurance and explore what topics are driving sentiment, while also being entertained by a light, witty AI-generated summary.

### Acceptance Scenarios

1. **Given** the user lands on the homepage, **When** the current national sentiment is available, **Then** they see an at-a-glance mood indicator (overall sentiment score 0–100 plus playful label) and a short AI commentary.
2. **Given** sentiment trend data exists for the last 24 hours, **When** the user views the trend section, **Then** they see a timeline with hourly buckets showing positive, neutral, and negative counts.
3. **Given** topic extraction identifies trends, **When** the user views the topics panel, **Then** they see the top 10 topics ranked by 3‑hour growth rate.
4. **Given** fresh data (<30 min old) is unavailable, **When** the user loads the dashboard, **Then** they see a fallback notice: "Data may be stale — last updated <timestamp>." and existing historical metrics.
5. **Given** AI commentary generation fails, **When** other data loads, **Then** system displays placeholder: "Mood summary unavailable — data still live." and no error artifact.

### Edge Cases

- Data gap (no new sources in last hour) → Display last updated timestamp and a subtle notice about staleness.
- Extreme skew (≥90% negative OR ≥90% positive in last 6 hours) → Commentary uses neutral tone (no sarcasm, no amplification of panic) and inserts a balancing phrase (e.g., "Conversation is strongly negative right now; context may evolve.").
- Conflicting topic signals (topic has both positive and negative proportions each ≥35%) → Mark with a “polarizing” badge.
- Rate-limited upstream sources → Partial data labeled “incomplete snapshot” near refresh timestamp.
- Zero topics extracted → Hide topics section and show "No active topic clusters — check back soon." message.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST present an overall current sentiment score (0–100 composite; 0 all negative, 100 all positive) with a label (e.g., "Bleak", "Tense", "Mixed", "Upbeat", "Sunny").
- **FR-002**: System MUST display a time-based sentiment trend with 24 hourly buckets (rolling 24h window) for positive, neutral, and negative counts.
- **FR-003**: System MUST list top 10 trending topics ranked by percentage growth over the previous equivalent 3‑hour window (minimum baseline volume ≥5 mentions to qualify).
- **FR-004**: System MUST show for each trending topic: name, % share of total mentions (current 3h), sentiment distribution (positive/neutral/negative %), and net polarity score (positive minus negative percentage).
- **FR-005**: System MUST generate a playful commentary (≤400 characters) that: (a) references overall sentiment label, (b) optionally mentions 1–2 top topics, (c) avoids sarcasm about illness, politics, or vulnerable groups, (d) excludes profanity.
- **FR-006**: System MUST degrade gracefully if commentary generation fails: show fixed neutral text and log the failure internally.
- **FR-007**: System MUST visibly display last refresh timestamp in ISO local time plus “age” (e.g., "Updated 07:20 (12m ago)").
- **FR-008**: System MUST indicate partial data (missing commentary OR missing topics) with contextual inline notices without blocking core sentiment score.
- **FR-009**: System MUST label a topic as “polarizing” if positive ≥35% AND negative ≥35% of that topic’s mentions in current 3h window.
- **FR-010**: System MUST show historical min and max composite sentiment scores computed over trailing 30 days to contextualize current value.
- **FR-011**: System MUST still render sentiment score & trend if topics list is empty (no empty panels displayed).
- **FR-012**: System MUST provide an info tooltip explaining the composite score calculation at a high level (e.g., “Aggregated normalized sentiment of recent public discussions”).
- **FR-013**: System MUST show an onboarding hint (dismissible) on first visit ONLY (tracked via local persistence ≤90 days) summarizing “Score • Trend • Topics • Commentary”.
- **FR-014**: System MUST label commentary with a visible "AI Generated" tag.
- **FR-015**: System MUST avoid any PII: no usernames, no direct quotes unless fully anonymized (remove handles, names, personal identifiers). If quotes are later added they MUST pass redaction rules (drop tokens matching known personal name or handle patterns).
- **FR-016**: System MUST suppress duplicate topic entries using a similarity heuristic: if lowercase topic strings have Levenshtein distance ≤2 or one contains the other as a whole word, only the higher-volume variant remains.
- **FR-017**: System MUST detect sentiment spikes: mark current hour as “spike” if composite deviates ≥2 standard deviations from prior 12-hour rolling mean.
- **FR-018**: System MUST mark data “Stale” if last refresh age >30 minutes; stale state triggers greyed timestamp styling.
- **FR-019**: System MUST cap commentary generation attempts to 1 per refresh cycle (no user retry loop) to avoid inconsistent messaging.
- **FR-020**: System MUST provide a stable set of sentiment labels mapped to score ranges (0–19 Bleak, 20–39 Tense, 40–59 Mixed, 60–79 Upbeat, 80–100 Sunny) displayed consistently across UI elements.

### Assumptions & Derived Defaults

- Composite sentiment score normalization method is pre-defined outside scope of this spec.
- Data ingestion cadence assumed at least every 15 minutes; if slower, staleness logic still applies.
- User base is anonymous public viewers; no authentication flows required in this feature.
- Only aggregated Dutch healthcare-related public data sources are included (enumeration handled in separate ingestion specification).
- Local storage acceptable for onboarding dismissal (no sensitive data stored).

### Key Entities

- **Sentiment Snapshot**: Aggregated metrics for a rolling window; includes: windowStart, windowEnd, positiveCount, neutralCount, negativeCount, compositeScore, min30Day, max30Day, spikeFlag.
- **Topic**: name, currentMentions3h, prevMentions3h, growthPercent, positivePct, neutralPct, negativePct, netPolarity, polarizingFlag, firstSeen, lastSeen.
- **Commentary**: text, createdAt, includesTopics (array), sentimentLabel, status (success|fallback|stale), lengthChars.
- **Refresh Metadata**: lastRefreshAt, ageMinutes, partialFlags (topicsMissing|commentaryMissing), staleFlag.

---

## Review & Acceptance Checklist

_GATE: Automated checks run during main() execution_

### Content Quality

- [x] No implementation details (languages, frameworks, APIs) — VERIFIED
- [x] Focused on user value and business needs — VERIFIED
- [x] Written for non-technical stakeholders — VERIFIED
- [x] All mandatory sections completed — VERIFIED

### Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable (explicit thresholds, ranges, counts)
- [x] Scope is clearly bounded (24h trend window, 30-day context, growth method defined)
- [x] Dependencies and assumptions identified (see Assumptions & Derived Defaults)

---

## Execution Status

_Updated by main() during processing_

- [x] User description parsed
- [x] Key concepts extracted
- [x] Ambiguities marked
- [x] User scenarios defined
- [x] Requirements generated
- [x] Entities identified
- [x] Review checklist passed (clarifications resolved)

---

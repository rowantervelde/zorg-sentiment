# Feature Specification: Sentiment Snapshot Service

**Feature Branch**: `002-sentiment-snapshot-service`  
**Created**: 2025-10-11  
**Status**: Draft  
**Input**: User description: "Sentiment Snapshot Service - Real-time Dutch healthcare public opinion tracking"

## Clarifications

### Session 2025-10-11

- Q: What monitoring and alerting capabilities should the system provide to ensure operational health and enable troubleshooting? → A: Alert on critical failures (all sources down, staleness >60min, compliance violations), log detailed diagnostics for all operations
- Q: How long should hourly sentiment buckets be retained before aggregation or deletion? → A: Retain 30 days hourly, aggregate to daily after
- Q: When a failed data source recovers, how far back should the system backfill missing data? → A: Backfill up to 24 hours when recovered
- Q: What statistical threshold should trigger a spike detection alert to users? → A: 2 standard deviations from 12-hour mean
- Q: How should the system handle multiple simultaneous refresh requests? → A: Drop duplicate requests - ignore new refresh if one is already running

## User Scenarios & Testing _(mandatory)_

### User Story 1 - View Current Public Sentiment (Priority: P1)

As a citizen interested in Dutch healthcare policy, I want to see the current public mood about healthcare ("zorg") at a glance, so I can understand whether public opinion is positive, negative, or mixed right now.

**Why this priority**: This is the core value proposition - giving users immediate insight into public sentiment. Without this, the feature provides no value.

**Independent Test**: Can be fully tested by loading the dashboard and verifying that a sentiment score (0-100) and mood label (e.g., "Mixed", "Upbeat") are displayed within 3 seconds, using real aggregated data from public sources.

**Acceptance Scenarios**:

1. **Given** I visit the dashboard, **When** the page loads, **Then** I see a sentiment score between 0-100 and a mood label describing current sentiment
2. **Given** public sentiment data is available, **When** I view the score, **Then** the data reflects mentions from the last hour across multiple sources
3. **Given** I view the sentiment display, **When** I read the mood label, **Then** it uses clear, relatable terms (e.g., "Sunny", "Tense", "Bleak") that match the numeric score

---

### User Story 2 - Understand Sentiment Trends (Priority: P2)

As a healthcare policy analyst, I want to see how public sentiment has changed over the past 24 hours, so I can identify emerging issues or shifts in public opinion that may require attention.

**Why this priority**: Trends provide crucial context - a single score could be misleading without seeing whether sentiment is improving, declining, or stable.

**Independent Test**: Can be tested by viewing a 24-hour trend visualization showing hourly sentiment scores, verifying that at least 12 hours of historical data are displayed.

**Acceptance Scenarios**:

1. **Given** I'm viewing the dashboard, **When** I look at the trend section, **Then** I see hourly sentiment scores for the past 24 hours
2. **Given** sentiment has changed significantly, **When** I view the trend, **Then** I can clearly see upward or downward patterns in the visualization
3. **Given** I'm analyzing the trend, **When** sentiment varies throughout the day, **Then** I can identify which hours had positive vs negative sentiment

---

### User Story 3 - Detect Significant Mood Shifts (Priority: P2)

As a communications professional at a healthcare organization, I want to be alerted when public sentiment spikes dramatically (either positively or negatively), so I can investigate the cause and respond appropriately.

**Why this priority**: Sudden changes often indicate breaking news or emerging issues that require timely response. This prevents users from missing important shifts.

**Independent Test**: Can be tested by simulating a sentiment spike scenario and verifying that a visual indicator appears on the dashboard highlighting the unusual change.

**Acceptance Scenarios**:

1. **Given** sentiment has spiked significantly from recent averages, **When** I view the dashboard, **Then** I see a clear indicator (e.g., icon, highlight) marking the spike
2. **Given** a spike has occurred, **When** I view the spike indicator, **Then** I can tell whether it's a positive or negative shift
3. **Given** sentiment is stable, **When** I view the dashboard, **Then** no spike indicator is shown to avoid false alarms

---

### User Story 4 - Assess Sentiment in Context (Priority: P3)

As a researcher tracking healthcare sentiment over time, I want to see how today's sentiment compares to the past 30 days (minimum and maximum), so I can understand whether current sentiment is unusually high, low, or typical.

**Why this priority**: Historical context prevents misinterpretation - a score of 45 might be concerning if typical scores are 70+, but normal if they usually range from 30-50.

**Independent Test**: Can be tested by displaying the 30-day minimum and maximum scores alongside the current score, verifying the range is accurate.

**Acceptance Scenarios**:

1. **Given** I'm viewing current sentiment, **When** I see the score, **Then** I also see the 30-day minimum and maximum for context
2. **Given** current sentiment is near the 30-day low, **When** I compare the values, **Then** I can recognize this as unusually negative
3. **Given** current sentiment is near the 30-day high, **When** I compare the values, **Then** I can recognize this as unusually positive

---

### User Story 5 - Verify Data Freshness (Priority: P3)

As a user relying on this data for decision-making, I want to know when the sentiment data was last updated, so I can trust that I'm seeing current information and not stale data.

**Why this priority**: Trust in data quality is essential for user confidence, but this is secondary to actually displaying the data itself.

**Independent Test**: Can be tested by displaying a timestamp showing when data was last refreshed, and verifying it updates every 15-30 minutes.

**Acceptance Scenarios**:

1. **Given** I'm viewing sentiment data, **When** I check the timestamp, **Then** I see how many minutes ago the data was updated
2. **Given** data is more than 30 minutes old, **When** I view the dashboard, **Then** I see a "stale data" indicator warning me the information may be outdated
3. **Given** data is less than 30 minutes old, **When** I view the dashboard, **Then** no stale data warning appears

---

### User Story 6 - Handle Data Unavailability Gracefully (Priority: P3)

As a dashboard user, when sentiment data cannot be collected from sources, I want to see a clear explanation of the issue rather than broken functionality, so I understand the situation and know when to check back.

**Why this priority**: Error handling is important for user experience but doesn't provide primary value - it's a fallback scenario.

**Independent Test**: Can be tested by simulating source failures and verifying that an appropriate error message appears instead of broken UI elements.

**Acceptance Scenarios**:

1. **Given** multiple data sources are unavailable, **When** I visit the dashboard, **Then** I see a message explaining data is temporarily unavailable
2. **Given** some but not all sources are unavailable, **When** I view sentiment data, **Then** I see data from available sources with a note about partial data
3. **Given** all sources have failed, **When** I view the dashboard, **Then** I see a helpful message suggesting when to check back rather than error codes

---

### Edge Cases

- What happens when fewer than 50 mentions are found in an hour? (System should display sentiment but may show lower confidence indicator)
- How does the system handle sudden source API outages? (Graceful degradation with partial data from remaining sources; backfill up to 24 hours when source recovers)
- What if sentiment is exactly neutral (50.0 score)? (Display "Mixed" label consistently)
- How are duplicate posts across sources handled? (Count each mention once, not multiple times for cross-posted content)
- What happens during low-traffic hours (2-6 AM)? (Display data with note about lower volume if mentions drop below typical levels)
- How does the system handle spam or bot-generated content? (Filter out obvious spam patterns to maintain data quality)
- What if a major news event causes extreme sentiment (0-10 or 90-100)? (Display accurately without artificial dampening, rely on 30-day context to show it's unusual)
- What happens if multiple refresh requests are triggered simultaneously? (Ignore duplicate requests while a refresh is already in progress to ensure data consistency)

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST aggregate sentiment data from at least 5 distinct public Dutch sources discussing healthcare topics
- **FR-002**: System MUST calculate a composite sentiment score between 0 (most negative) and 100 (most positive) for the current hour
- **FR-003**: System MUST classify sentiment into clear mood labels: "Bleak" (0-19), "Tense" (20-39), "Mixed" (40-59), "Upbeat" (60-79), "Sunny" (80-100)
- **FR-004**: System MUST provide hourly sentiment scores for the past 24 hours to enable trend visualization
- **FR-005**: System MUST detect when current sentiment deviates significantly from recent averages (2 standard deviations from 12-hour rolling mean)
- **FR-006**: System MUST indicate the direction of sentiment spikes (positive or negative shift)
- **FR-007**: System MUST provide 30-day minimum and maximum sentiment scores for historical context
- **FR-008**: System MUST timestamp all sentiment data with when it was calculated
- **FR-009**: System MUST flag data as "stale" when it has not been refreshed for more than 30 minutes
- **FR-010**: System MUST continue operating with partial data when some sources are unavailable (minimum 2 sources required)
- **FR-011**: System MUST clearly communicate to users when data is unavailable or only partially available
- **FR-012**: System MUST filter collected data to only Dutch language content about healthcare topics ("zorg", "zorgverzekering", "gezondheidszorg")
- **FR-013**: System MUST weight sentiment based on engagement levels (popular posts carry more weight than low-engagement posts)
- **FR-014**: System MUST normalize sentiment signals from different source types (social media, news, forums) into consistent positive/neutral/negative classifications
- **FR-015**: System MUST refresh sentiment data at least every 15 minutes during active hours (6 AM - midnight CET)
- **FR-016**: System MUST ensure collected data respects source terms of service and rate limits
- **FR-017**: System MUST aggregate data only (no storage of individual posts or user identities)
- **FR-018**: System MUST provide clear error messages when all sources fail, indicating when users should retry
- **FR-019**: System MUST log detailed diagnostics for all data collection operations, sentiment calculations, and source interactions to enable troubleshooting
- **FR-020**: System MUST alert operators when critical failures occur: all sources unavailable, data staleness exceeds 60 minutes, or terms of service compliance violations detected
- **FR-021**: System MUST retain hourly sentiment buckets for 30 days, then aggregate them into daily summaries for longer-term historical reference
- **FR-022**: System MUST backfill up to 24 hours of missing data when a previously failed source recovers, to fill gaps in the trend visualization
- **FR-023**: System MUST ignore duplicate refresh requests when a refresh operation is already in progress, preventing concurrent updates and ensuring data consistency

### Key Entities _(include if feature involves data)_

- **Sentiment Snapshot**: Represents the current state of public sentiment at a specific point in time, including the composite score, mood label, timestamp, trend data, and data quality indicators

- **Hourly Sentiment Bucket**: Represents aggregated sentiment for a specific hour, containing positive/neutral/negative mention counts and a composite score for that hour. Retained at hourly granularity for 30 days, then aggregated into daily summaries.

- **Sentiment Spike Event**: Represents a detected significant deviation from recent sentiment patterns, including the direction (positive/negative) and magnitude of the shift

- **Data Source Status**: Represents the availability and health of each public data source (available, unavailable, partially available), used to communicate data quality to users

- **Historical Context Range**: Represents the 30-day minimum and maximum sentiment scores used to contextualize current sentiment

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Users can view current sentiment score and mood label within 3 seconds of loading the dashboard
- **SC-002**: Dashboard displays sentiment data that reflects public mentions from at least 5 different Dutch sources
- **SC-003**: Sentiment scores update at least every 15 minutes during active hours (6 AM - midnight CET)
- **SC-004**: System successfully aggregates sentiment data from at least 100 mentions per day across all sources
- **SC-005**: Users can view 24 hours of hourly sentiment trend data showing how sentiment has evolved
- **SC-006**: Significant sentiment spikes (deviating substantially from recent averages) are visually highlighted within 15 minutes of occurrence
- **SC-007**: System continues operating with at least partial data when up to 3 of 5 sources are unavailable
- **SC-008**: Users see clear "stale data" indicators when sentiment information is more than 30 minutes old
- **SC-009**: Dashboard displays 30-day minimum and maximum sentiment scores for historical context
- **SC-010**: System handles 100 concurrent dashboard viewers without performance degradation
- **SC-011**: When all sources fail, users see a helpful error message within 5 seconds (not a broken interface)
- **SC-012**: Sentiment analysis excludes non-Dutch content and non-healthcare topics with 90%+ accuracy
- **SC-013**: Data collection respects all source rate limits and terms of service (zero violations)
- **SC-014**: System stores only aggregated counts, never individual user posts or identities (100% compliance)
- **SC-015**: Duplicate content from cross-posted sources is counted only once
- **SC-016**: Sentiment aggregation completes within 45 seconds even when collecting from all sources
- **SC-017**: Operators receive alerts within 5 minutes when critical failures occur (all sources down, staleness >60 minutes, compliance violations)

## Assumptions

- Public Dutch sources discussing healthcare will have sufficient volume (100+ mentions/day aggregate) to provide meaningful sentiment signals
- Users understand that sentiment reflects public discussion, not scientific polling or official statistics
- A 15-minute refresh cadence is sufficient for users' needs (real-time streaming is not required)
- Hourly aggregation provides adequate granularity for trend analysis
- Statistical spike detection using 2 standard deviations from a 12-hour rolling mean effectively identifies significant sentiment shifts while minimizing false positives
- Users accessing the dashboard are primarily Dutch speakers or understand Dutch healthcare context
- Public data sources will maintain generally consistent APIs and access policies over time
- Sentiment lexicon-based analysis provides sufficient accuracy for Dutch healthcare content (85%+ correct classification)
- Engagement metrics (likes, shares, upvotes) are reasonable proxies for content importance
- 30-day historical context is sufficient for users to assess whether current sentiment is typical or unusual
- Daily aggregation beyond 30 days provides adequate granularity for longer-term trend analysis without requiring hourly precision

## Dependencies

- Availability and stability of public Dutch data sources (social media APIs, RSS feeds, public forums)
- Continued free-tier or public access to identified data sources
- Dutch language sentiment analysis capabilities (lexicons, classification models)
- Existing dashboard infrastructure for displaying sentiment visualizations
- Users have internet access to view the dashboard
- Source APIs and websites maintain their current terms of service allowing this type of data aggregation

## Out of Scope

- Individual post or comment storage/display (only aggregated metrics)
- User identity tracking or profiling of social media accounts
- Sentiment prediction or forecasting beyond current snapshot
- Real-time streaming updates (batch refresh is sufficient)
- Language translation (all sources must be Dutch or filtered to Dutch)
- Geographic breakdown of sentiment by region
- Multi-language support for dashboard interface
- User-submitted sentiment voting or surveys
- Sentiment analysis for topics other than healthcare
- Detailed topic extraction or theme analysis (covered by separate Topics Feed feature)
- Commentary or explanations for sentiment scores (covered by separate Commentary Feed feature)

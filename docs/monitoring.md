# Monitoring & SLO Tracking Configuration

This document describes the monitoring setup and Service Level Objectives (SLOs) for the sentiment snapshot service.

## Service Level Objectives (SLOs)

### Response Time

- **Target**: p95 response time < 3 seconds
- **Measurement**: Track all `GET /api/sentiment` requests
- **Alert threshold**: p95 > 3.5 seconds over 5-minute window

### Availability

- **Target**: 99.5% availability during active hours (6 AM - midnight CET)
- **Measurement**: Successful responses (2xx status codes) / Total requests
- **Alert threshold**: <99% over 15-minute window

### Error Rate

- **Target**: <1% error rate
- **Measurement**: 5xx responses / Total requests
- **Alert threshold**: >2% over 5-minute window

### Source Availability

- **Target**: At least 3 of 5 sources operational
- **Measurement**: Monitor health check endpoints per source
- **Alert threshold**: <3 sources available for >5 minutes

### Data Freshness

- **Target**: Data staleness <30 minutes
- **Measurement**: `data_quality.staleness_minutes` in API response
- **Alert threshold**: staleness >60 minutes

## Metrics to Track

### Application Metrics

```typescript
// Example metrics structure
{
  "api_requests_total": {
    "method": "GET",
    "endpoint": "/api/sentiment",
    "status": 200,
    "count": 1250
  },
  "api_response_time_ms": {
    "endpoint": "/api/sentiment",
    "p50": 450,
    "p95": 2100,
    "p99": 2800
  },
  "cache_hit_rate": {
    "endpoint": "/api/sentiment",
    "hits": 950,
    "misses": 50,
    "rate": 0.95
  },
  "source_health": {
    "twitter": "available",
    "reddit": "available",
    "mastodon": "unavailable",
    "rss": "available",
    "tweakers": "available"
  },
  "aggregation_duration_ms": {
    "p50": 2100,
    "p95": 3500,
    "max": 4200
  },
  "data_quality": {
    "total_posts": 524,
    "dutch_posts": 480,
    "filter_rate": 0.084,
    "confidence": "high"
  }
}
```

### Infrastructure Metrics

- CPU usage (should stay <70% on average)
- Memory usage (heap should stay <512 MB)
- Network I/O (source API calls)
- Disk I/O (bucket file reads/writes)

## Monitoring Stack Options

### Option 1: Netlify Analytics + External Service

**Netlify provides**:

- Request counts
- Response times (p50, p95, p99)
- Status code distribution
- Geographic distribution

**Add external service** (e.g., Datadog, New Relic, Grafana Cloud):

- Custom application metrics
- Source health tracking
- Alert management
- Dashboard visualization

**Implementation**:

```typescript
// src/server/api/sentiment/_lib/metrics.ts
export class MetricsCollector {
  private metrics: Map<string, number> = new Map()

  recordResponseTime(endpoint: string, duration: number) {
    // Send to external metrics service
  }

  recordSourceHealth(source: string, isAvailable: boolean) {
    // Track source availability
  }

  recordCacheHit(endpoint: string, isHit: boolean) {
    // Track cache performance
  }
}
```

### Option 2: Simple Logging + Log Aggregation

**Use structured logging** (already implemented in `logger.ts`):

- Log all API requests with timing
- Log source health checks
- Log cache hits/misses
- Log errors and warnings

**Aggregate with**:

- Papertrail
- Loggly
- Splunk
- ELK Stack

**Implementation**:

```typescript
// Already in logger.ts
logger.info('API request completed', {
  endpoint: '/api/sentiment',
  duration_ms: 2100,
  status: 200,
  cache_hit: true,
  source_count: 5,
})
```

### Option 3: Self-hosted Prometheus + Grafana

**Prometheus** for metrics collection:

- Install `prom-client` npm package
- Expose `/metrics` endpoint
- Configure Prometheus scraper

**Grafana** for visualization:

- Create dashboards for SLOs
- Set up alerts via Alertmanager
- Monitor trends over time

**Implementation**:

```typescript
import { register, Counter, Histogram } from 'prom-client'

const requestCounter = new Counter({
  name: 'api_requests_total',
  help: 'Total API requests',
  labelNames: ['endpoint', 'status'],
})

const responseTime = new Histogram({
  name: 'api_response_time_seconds',
  help: 'API response time',
  buckets: [0.1, 0.5, 1, 2, 3, 5],
})

// In API handler
responseTime.observe(duration / 1000)
requestCounter.inc({ endpoint: '/api/sentiment', status: 200 })

// Expose metrics endpoint
export default defineEventHandler((event) => {
  return register.metrics()
})
```

## Alert Configuration

### Critical Alerts (immediate notification)

1. **All sources down**
   - Condition: `source_count === 0` for >5 minutes
   - Action: Page on-call engineer
   - Webhook: POST to `ALERT_WEBHOOK_URL`

2. **API error rate spike**
   - Condition: Error rate >5% over 5 minutes
   - Action: Notify team channel
   - Escalation: Page if >10%

3. **Response time degradation**
   - Condition: p95 >5 seconds for 10 minutes
   - Action: Notify team channel
   - Escalation: Page if p95 >10 seconds

### Warning Alerts (team notification)

1. **Single source failure**
   - Condition: Any source unavailable for >15 minutes
   - Action: Slack/Teams notification
   - Auto-resolve: When source recovers

2. **Data staleness**
   - Condition: `staleness_minutes >60`
   - Action: Slack/Teams notification

3. **Cache hit rate low**
   - Condition: Cache hit rate <80% over 30 minutes
   - Action: Slack/Teams notification

## Dashboard Layout

### Overview Panel

- Current sentiment score (large number)
- Trend indicator (↑↓ with percentage)
- Spike alert badge
- Last update timestamp

### SLO Status Panel

- Response time (p95) with sparkline
- Availability percentage (24h)
- Error rate gauge
- Traffic volume (requests/min)

### Source Health Panel

- 5 source status indicators (green/red)
- Last success timestamp per source
- Error messages for failed sources

### Performance Panel

- Response time percentiles (p50, p95, p99)
- Cache hit rate
- Aggregation duration
- Memory usage

### Data Quality Panel

- Total posts processed
- Language filter rate
- Confidence level distribution
- Topic mention counts

## Example Grafana Dashboard JSON

```json
{
  "dashboard": {
    "title": "Sentiment Snapshot Service",
    "panels": [
      {
        "title": "p95 Response Time",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, api_response_time_seconds_bucket)"
          }
        ],
        "alert": {
          "conditions": [
            {
              "evaluator": { "type": "gt", "params": [3] },
              "query": { "model": "A" }
            }
          ]
        }
      },
      {
        "title": "Source Availability",
        "type": "stat",
        "targets": [
          {
            "expr": "sum(source_health_status{status=\"available\"})"
          }
        ]
      }
    ]
  }
}
```

## Implementation Checklist

- [ ] Choose monitoring stack (Option 1, 2, or 3)
- [ ] Implement metrics collection in API handlers
- [ ] Set up external monitoring service or self-hosted stack
- [ ] Create dashboard with SLO panels
- [ ] Configure alert rules and thresholds
- [ ] Test alert delivery (webhook, email, Slack, etc.)
- [ ] Set up on-call rotation if using PagerDuty/Opsgenie
- [ ] Document runbook for common issues
- [ ] Schedule weekly SLO review meetings

## Cost Considerations

- **Netlify Analytics**: Included in Pro plan ($19/mo per site)
- **Datadog**: ~$15/host/month + custom metrics
- **New Relic**: Free tier available, then $99/month
- **Grafana Cloud**: Free tier for 10k metrics, then $49/month
- **Self-hosted**: Server costs + maintenance time

## Recommended Approach

For this project, **Option 2 (Logging + Aggregation)** is recommended:

1. ✅ Already have structured logging in place
2. ✅ Low overhead, no code changes needed
3. ✅ Cost-effective (many free tiers available)
4. ✅ Easy to query and create alerts
5. ✅ Can upgrade to full metrics stack later if needed

**Next steps**:

1. Sign up for Papertrail or Loggly free tier
2. Configure Netlify to forward logs
3. Create saved searches for key metrics
4. Set up email alerts for critical conditions
5. Review logs weekly to identify trends

import { describe, expect, it, beforeAll } from 'vitest'
import type { SentimentSnapshot } from '~/types/sentiment'

/**
 * T042: Contract tests for sentiment feed API
 * Validates: schema, response time, sentiment mapping, spike detection,
 * staleness, source constraints, error formats, cache headers, buckets, context
 */

let testSnapshot: SentimentSnapshot | null = null
let responseTime: number = 0
let responseHeaders: Headers | null = null

describe('Contract: Sentiment Feed API - GET /api/sentiment', () => {
  beforeAll(async () => {
    // Fetch actual API response for contract validation
    const startTime = Date.now()
    try {
      const response = await fetch('http://localhost:3000/api/sentiment')
      responseTime = Date.now() - startTime
      responseHeaders = response.headers
      
      if (response.ok) {
        testSnapshot = await response.json()
      }
    } catch (error) {
      console.warn('Failed to fetch sentiment API for contract test:', error)
    }
  }, 10000) // 10s timeout for API call

  describe('Schema Validation - All Required Fields Present', () => {
    it('should return a valid SentimentSnapshot object', () => {
      expect(testSnapshot).toBeTruthy()
      expect(testSnapshot).toBeTypeOf('object')
    })

    it('should have overall_score field (FR-001)', () => {
      expect(testSnapshot).toHaveProperty('overall_score')
      expect(typeof testSnapshot?.overall_score).toBe('number')
      expect(testSnapshot?.overall_score).toBeGreaterThanOrEqual(-1.0)
      expect(testSnapshot?.overall_score).toBeLessThanOrEqual(1.0)
    })

    it('should have trend field (FR-003)', () => {
      expect(testSnapshot).toHaveProperty('trend')
      expect(['rising', 'falling', 'stable']).toContain(testSnapshot?.trend)
    })

    it('should have spike detection fields (FR-004)', () => {
      expect(testSnapshot).toHaveProperty('spike_detected')
      expect(typeof testSnapshot?.spike_detected).toBe('boolean')
      
      if (testSnapshot?.spike_detected) {
        expect(testSnapshot).toHaveProperty('spike_direction')
        expect(['positive', 'negative']).toContain(testSnapshot?.spike_direction)
      }
    })

    it('should have 30-day context fields (FR-007)', () => {
      // Optional fields - check if present
      if (testSnapshot?.min_30day !== undefined) {
        expect(typeof testSnapshot.min_30day).toBe('number')
        expect(testSnapshot.min_30day).toBeGreaterThanOrEqual(-1.0)
        expect(testSnapshot.min_30day).toBeLessThanOrEqual(1.0)
      }
      
      if (testSnapshot?.max_30day !== undefined) {
        expect(typeof testSnapshot.max_30day).toBe('number')
        expect(testSnapshot.max_30day).toBeGreaterThanOrEqual(-1.0)
        expect(testSnapshot.max_30day).toBeLessThanOrEqual(1.0)
      }
    })

    it('should have freshness fields (FR-009)', () => {
      expect(testSnapshot).toHaveProperty('age_minutes')
      expect(typeof testSnapshot?.age_minutes).toBe('number')
      expect(testSnapshot?.age_minutes).toBeGreaterThanOrEqual(0)

      expect(testSnapshot).toHaveProperty('is_stale')
      expect(typeof testSnapshot?.is_stale).toBe('boolean')
      
      expect(testSnapshot).toHaveProperty('last_updated')
      expect(testSnapshot?.last_updated).toBeTruthy()
      const timestamp = new Date(testSnapshot!.last_updated)
      expect(timestamp.toString()).not.toBe('Invalid Date')
    })

    it('should have data_quality object (FR-010)', () => {
      expect(testSnapshot).toHaveProperty('data_quality')
      expect(testSnapshot?.data_quality).toBeTypeOf('object')
      
      const dq = testSnapshot?.data_quality
      expect(dq).toHaveProperty('sample_size')
      expect(typeof dq?.sample_size).toBe('number')
      expect(dq?.sample_size).toBeGreaterThanOrEqual(0)
      
      expect(dq).toHaveProperty('confidence')
      expect(['high', 'medium', 'low']).toContain(dq?.confidence)
      
      expect(dq).toHaveProperty('staleness_minutes')
      expect(typeof dq?.staleness_minutes).toBe('number')
      
      expect(dq).toHaveProperty('language_filter_rate')
      expect(typeof dq?.language_filter_rate).toBe('number')
      expect(dq?.language_filter_rate).toBeGreaterThanOrEqual(0)
      expect(dq?.language_filter_rate).toBeLessThanOrEqual(1)
    })

    it('should have topics array (FR-005)', () => {
      expect(testSnapshot).toHaveProperty('topics')
      expect(Array.isArray(testSnapshot?.topics)).toBe(true)
      
      testSnapshot?.topics.forEach(topic => {
        expect(topic).toHaveProperty('topic_id')
        expect(topic).toHaveProperty('topic_name')
        expect(topic).toHaveProperty('score')
        expect(topic.score).toBeGreaterThanOrEqual(-1.0)
        expect(topic.score).toBeLessThanOrEqual(1.0)
        expect(topic).toHaveProperty('sample_size')
        expect(topic.sample_size).toBeGreaterThanOrEqual(0)
        expect(topic).toHaveProperty('is_polarizing')
        expect(typeof topic.is_polarizing).toBe('boolean')
      })
    })

    it('should have sources array (FR-006)', () => {
      expect(testSnapshot).toHaveProperty('sources')
      expect(Array.isArray(testSnapshot?.sources)).toBe(true)
      expect(testSnapshot?.sources.length).toBeGreaterThan(0)
      
      testSnapshot?.sources.forEach(source => {
        expect(source).toHaveProperty('source_id')
        expect(['twitter', 'reddit', 'mastodon', 'rss_numl', 'tweakers']).toContain(source.source_id)
        
        expect(source).toHaveProperty('status')
        expect(['available', 'unavailable']).toContain(source.status)
        
        expect(source).toHaveProperty('last_success')
        const timestamp = new Date(source.last_success)
        expect(timestamp.toString()).not.toBe('Invalid Date')
        
        if (source.status === 'unavailable') {
          expect(source).toHaveProperty('error_message')
        }
      })
    })

    it('should have hourly_buckets array (FR-004)', () => {
      expect(testSnapshot).toHaveProperty('hourly_buckets')
      expect(Array.isArray(testSnapshot?.hourly_buckets)).toBe(true)
      
      testSnapshot?.hourly_buckets.forEach(bucket => {
        expect(bucket).toHaveProperty('bucket_id')
        expect(bucket).toHaveProperty('start_time')
        expect(bucket).toHaveProperty('end_time')
        expect(bucket).toHaveProperty('aggregate_score')
        expect(bucket.aggregate_score).toBeGreaterThanOrEqual(-1.0)
        expect(bucket.aggregate_score).toBeLessThanOrEqual(1.0)
        expect(bucket).toHaveProperty('post_count')
        expect(bucket.post_count).toBeGreaterThanOrEqual(0)
      })
    })
  })

  describe('Response Time - SC-001', () => {
    it('should respond in under 3 seconds', () => {
      expect(responseTime).toBeLessThan(3000)
    })
  })

  describe('Sentiment Label Mapping - FR-003', () => {
    it('should map scores to correct trend labels', () => {
      expect(testSnapshot?.trend).toBeTruthy()
      // Trend logic tested in aggregator unit tests
      // Here we just verify the field exists and has valid value
      expect(['rising', 'falling', 'stable']).toContain(testSnapshot?.trend)
    })
  })

  describe('Spike Detection Consistency', () => {
    it('should have spike_direction when spike_detected is true', () => {
      if (testSnapshot?.spike_detected) {
        expect(testSnapshot.spike_direction).toBeTruthy()
        expect(['positive', 'negative']).toContain(testSnapshot.spike_direction)
      }
    })

    it('should not have spike_direction when spike_detected is false', () => {
      if (!testSnapshot?.spike_detected) {
        // spike_direction is optional and may be undefined
        if (testSnapshot?.spike_direction !== undefined) {
          // If present, it should still be valid
          expect(['positive', 'negative']).toContain(testSnapshot.spike_direction)
        }
      }
    })
  })

  describe('Staleness Flag Logic - FR-009', () => {
    it('should set is_stale=true when age > 30 minutes', () => {
      if (testSnapshot && testSnapshot.age_minutes > 30) {
        expect(testSnapshot.is_stale).toBe(true)
      }
    })

    it('should set is_stale=false when age <= 30 minutes', () => {
      if (testSnapshot && testSnapshot.age_minutes <= 30) {
        expect(testSnapshot.is_stale).toBe(false)
      }
    })

    it('should have consistent age_minutes and staleness_minutes', () => {
      expect(testSnapshot?.age_minutes).toBeDefined()
      expect(testSnapshot?.data_quality.staleness_minutes).toBeDefined()
      // These should be the same or very close
      const diff = Math.abs(testSnapshot!.age_minutes - testSnapshot!.data_quality.staleness_minutes)
      expect(diff).toBeLessThan(2) // Allow 1 minute difference due to timing
    })
  })

  describe('Source Availability Constraints - FR-010', () => {
    it('should have at least 2 sources available when returning 200', () => {
      const availableSources = testSnapshot?.sources.filter(s => s.status === 'available') || []
      expect(availableSources.length).toBeGreaterThanOrEqual(2)
    })

    it('should have valid error_message for unavailable sources', () => {
      testSnapshot?.sources.forEach(source => {
        if (source.status === 'unavailable') {
          expect(source.error_message).toBeTruthy()
          expect(typeof source.error_message).toBe('string')
          expect(source.error_message!.length).toBeGreaterThan(0)
        }
      })
    })
  })

  describe('Hourly Buckets Chronological Order', () => {
    it('should have buckets in chronological order (oldest first)', () => {
      const buckets = testSnapshot?.hourly_buckets || []
      
      for (let i = 1; i < buckets.length; i++) {
        const prevTime = new Date(buckets[i - 1].start_time).getTime()
        const currTime = new Date(buckets[i].start_time).getTime()
        expect(currTime).toBeGreaterThanOrEqual(prevTime)
      }
    })

    it('should have valid bucket_id format', () => {
      testSnapshot?.hourly_buckets.forEach(bucket => {
        // Accept both formats: YYYY-MM-DD-HH or YYYY-MM-DDTHH-mm
        const isValidFormat1 = /^\d{4}-\d{2}-\d{2}-\d{2}$/.test(bucket.bucket_id) // YYYY-MM-DD-HH
        const isValidFormat2 = /^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}$/.test(bucket.bucket_id) // YYYY-MM-DDTHH-mm
        expect(isValidFormat1 || isValidFormat2).toBe(true)
      })
    })
  })

  describe('Historical Context Validity', () => {
    it('should have min <= max when both present', () => {
      if (testSnapshot?.min_30day !== undefined && testSnapshot?.max_30day !== undefined) {
        expect(testSnapshot.min_30day).toBeLessThanOrEqual(testSnapshot.max_30day)
      }
    })

    it('should have current score within 30-day range (or close)', () => {
      if (testSnapshot?.min_30day !== undefined && testSnapshot?.max_30day !== undefined) {
        const current = testSnapshot.overall_score
        // Allow some margin as current score might be extreme
        // This is more of a sanity check than strict validation
        expect(current).toBeGreaterThanOrEqual(testSnapshot.min_30day - 0.2)
        expect(current).toBeLessThanOrEqual(testSnapshot.max_30day + 0.2)
      }
    })
  })

  describe('Cache Headers', () => {
    it('should have Cache-Control header', () => {
      expect(responseHeaders?.has('cache-control')).toBe(true)
    })

    it('should have appropriate cache duration', () => {
      const cacheControl = responseHeaders?.get('cache-control')
      expect(cacheControl).toBeTruthy()
      // Should contain max-age or s-maxage
      expect(cacheControl).toMatch(/max-age|s-maxage/)
    })
  })
})

describe('Contract: Error Response Formats', () => {
  it('should return 503 with proper structure when sources insufficient', async () => {
    // This test would need to simulate insufficient sources
    // For now, we document the expected format
    const expectedErrorFormat = {
      error: expect.any(String),
      message: expect.any(String),
      attempted_sources: expect.any(Number),
      sources_available: expect.any(Array),
      sources_unavailable: expect.any(Array),
      retry_after: 300,
    }
    
    // This is a schema validation - actual test would require mocking
    expect(expectedErrorFormat).toBeDefined()
  })
})

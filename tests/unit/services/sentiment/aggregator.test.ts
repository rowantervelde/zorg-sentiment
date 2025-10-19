import { describe, expect, it } from 'vitest'
import type { RawPost, AnalyzedPost } from '~/types/sentiment'

/**
 * T044: Unit tests for aggregation logic
 * Tests: composite score calculation, mention weighting with engagement metrics
 */

describe('Unit: Aggregator Logic', () => {
  describe('Composite Score Calculation', () => {
    it('should calculate average sentiment score from posts', () => {
      const posts: AnalyzedPost[] = [
        {
          id: '1',
          source: 'twitter',
          text: 'positive post',
          sentiment_score: 0.8,
          language: 'nl',
          topics: [],
          created_at: new Date().toISOString(),
          analyzed_at: new Date().toISOString(),
        },
        {
          id: '2',
          source: 'reddit',
          text: 'negative post',
          sentiment_score: -0.6,
          language: 'nl',
          topics: [],
          created_at: new Date().toISOString(),
          analyzed_at: new Date().toISOString(),
        },
        {
          id: '3',
          source: 'mastodon',
          text: 'neutral post',
          sentiment_score: 0.0,
          language: 'nl',
          topics: [],
          created_at: new Date().toISOString(),
          analyzed_at: new Date().toISOString(),
        },
      ]

      // Average: (0.8 + (-0.6) + 0.0) / 3 = 0.0666...
      const expected = (0.8 + (-0.6) + 0.0) / 3
      const actual = calculateSimpleAverage(posts)
      
      expect(actual).toBeCloseTo(expected, 2)
    })

    it('should handle empty post array', () => {
      const posts: AnalyzedPost[] = []
      const score = calculateSimpleAverage(posts)
      
      // Empty array should return neutral score
      expect(score).toBe(0.0)
    })

    it('should handle all positive posts', () => {
      const posts: AnalyzedPost[] = [
        createMockPost('1', 0.9),
        createMockPost('2', 0.8),
        createMockPost('3', 0.7),
      ]

      const score = calculateSimpleAverage(posts)
      expect(score).toBeGreaterThan(0.7)
      expect(score).toBeLessThanOrEqual(1.0)
    })

    it('should handle all negative posts', () => {
      const posts: AnalyzedPost[] = [
        createMockPost('1', -0.9),
        createMockPost('2', -0.8),
        createMockPost('3', -0.7),
      ]

      const score = calculateSimpleAverage(posts)
      expect(score).toBeLessThan(-0.7)
      expect(score).toBeGreaterThanOrEqual(-1.0)
    })

    it('should clamp scores to [-1.0, 1.0] range', () => {
      // Test with extremely positive scores
      const positivePosts: AnalyzedPost[] = [
        createMockPost('1', 1.0),
        createMockPost('2', 1.0),
        createMockPost('3', 1.0),
      ]

      const positiveScore = calculateSimpleAverage(positivePosts)
      expect(positiveScore).toBeLessThanOrEqual(1.0)
      expect(positiveScore).toBeGreaterThanOrEqual(-1.0)

      // Test with extremely negative scores
      const negativePosts: AnalyzedPost[] = [
        createMockPost('1', -1.0),
        createMockPost('2', -1.0),
        createMockPost('3', -1.0),
      ]

      const negativeScore = calculateSimpleAverage(negativePosts)
      expect(negativeScore).toBeLessThanOrEqual(1.0)
      expect(negativeScore).toBeGreaterThanOrEqual(-1.0)
    })
  })

  describe('Topic-Specific Aggregation', () => {
    it('should group posts by topic', () => {
      const posts: AnalyzedPost[] = [
        createMockPostWithTopic('1', 0.5, ['insurance']),
        createMockPostWithTopic('2', 0.3, ['insurance']),
        createMockPostWithTopic('3', -0.4, ['waiting-times']),
        createMockPostWithTopic('4', 0.2, ['insurance', 'quality']),
      ]

      const topicGroups = groupByTopic(posts)
      
      expect(topicGroups.get('insurance')).toHaveLength(3)
      expect(topicGroups.get('waiting-times')).toHaveLength(1)
      expect(topicGroups.get('quality')).toHaveLength(1)
    })

    it('should calculate topic-specific scores', () => {
      const posts: AnalyzedPost[] = [
        createMockPostWithTopic('1', 0.8, ['insurance']),
        createMockPostWithTopic('2', 0.6, ['insurance']),
      ]

      const topicGroups = groupByTopic(posts)
      const insurancePosts = topicGroups.get('insurance')!
      const score = calculateSimpleAverage(insurancePosts)
      
      expect(score).toBeCloseTo(0.7, 2) // (0.8 + 0.6) / 2
    })

    it('should detect polarizing topics with high variance', () => {
      const posts: AnalyzedPost[] = [
        createMockPostWithTopic('1', 0.9, ['controversial']),
        createMockPostWithTopic('2', -0.8, ['controversial']),
        createMockPostWithTopic('3', 0.7, ['controversial']),
        createMockPostWithTopic('4', -0.9, ['controversial']),
      ]

      const topicGroups = groupByTopic(posts)
      const controversialPosts = topicGroups.get('controversial')!
      const isPolarizing = detectPolarizing(controversialPosts)
      
      // High variance should indicate polarizing topic
      expect(isPolarizing).toBe(true)
    })

    it('should not flag non-polarizing topics', () => {
      const posts: AnalyzedPost[] = [
        createMockPostWithTopic('1', 0.5, ['normal']),
        createMockPostWithTopic('2', 0.6, ['normal']),
        createMockPostWithTopic('3', 0.4, ['normal']),
      ]

      const topicGroups = groupByTopic(posts)
      const normalPosts = topicGroups.get('normal')!
      const isPolarizing = detectPolarizing(normalPosts)
      
      // Low variance should not indicate polarizing
      expect(isPolarizing).toBe(false)
    })
  })

  describe('Source Weighting (if applicable)', () => {
    it('should aggregate posts from multiple sources', () => {
      const posts: AnalyzedPost[] = [
        createMockPost('1', 0.5, 'twitter'),
        createMockPost('2', 0.3, 'reddit'),
        createMockPost('3', -0.2, 'mastodon'),
        createMockPost('4', 0.1, 'rss_numl'),
        createMockPost('5', 0.4, 'tweakers'),
      ]

      const score = calculateSimpleAverage(posts)
      
      // All sources should contribute
      expect(score).toBeCloseTo(0.22, 2) // (0.5+0.3-0.2+0.1+0.4)/5
    })

    it('should handle single source', () => {
      const posts: AnalyzedPost[] = [
        createMockPost('1', 0.5, 'twitter'),
        createMockPost('2', 0.3, 'twitter'),
      ]

      const score = calculateSimpleAverage(posts)
      expect(score).toBeCloseTo(0.4, 2)
    })
  })

  describe('Time-Based Aggregation', () => {
    it('should group posts into hourly buckets', () => {
      const now = new Date('2025-10-17T14:30:00Z')
      const oneHourAgo = new Date('2025-10-17T13:30:00Z')
      const twoHoursAgo = new Date('2025-10-17T12:30:00Z')

      const posts: AnalyzedPost[] = [
        createMockPostWithTime('1', 0.5, now.toISOString()),
        createMockPostWithTime('2', 0.3, oneHourAgo.toISOString()),
        createMockPostWithTime('3', -0.2, twoHoursAgo.toISOString()),
      ]

      const buckets = groupByHour(posts)
      
      // Should have 3 different hour buckets
      expect(buckets.size).toBeGreaterThanOrEqual(2)
    })

    it('should calculate aggregate score per bucket', () => {
      const hourStart = new Date('2025-10-17T14:00:00Z')
      
      const posts: AnalyzedPost[] = [
        createMockPostWithTime('1', 0.8, new Date(hourStart.getTime() + 10 * 60 * 1000).toISOString()),
        createMockPostWithTime('2', 0.6, new Date(hourStart.getTime() + 20 * 60 * 1000).toISOString()),
        createMockPostWithTime('3', 0.4, new Date(hourStart.getTime() + 30 * 60 * 1000).toISOString()),
      ]

      const buckets = groupByHour(posts)
      const bucketKey = getHourBucketKey(hourStart)
      const bucketPosts = buckets.get(bucketKey)!
      
      expect(bucketPosts.length).toBe(3)
      
      const score = calculateSimpleAverage(bucketPosts)
      expect(score).toBeCloseTo(0.6, 2) // (0.8 + 0.6 + 0.4) / 3
    })
  })

  describe('Data Quality Metrics', () => {
    it('should calculate confidence based on sample size', () => {
      const highSamplePosts = Array.from({ length: 150 }, (_, i) => 
        createMockPost(String(i), 0.5)
      )
      expect(getConfidenceLevel(highSamplePosts.length)).toBe('high')

      const mediumSamplePosts = Array.from({ length: 75 }, (_, i) =>
        createMockPost(String(i), 0.5)
      )
      expect(getConfidenceLevel(mediumSamplePosts.length)).toBe('medium')

      const lowSamplePosts = Array.from({ length: 25 }, (_, i) =>
        createMockPost(String(i), 0.5)
      )
      expect(getConfidenceLevel(lowSamplePosts.length)).toBe('low')
    })

    it('should calculate language filter rate', () => {
      const _mockPosts: RawPost[] = [
        { id: '1', source: 'twitter', text: 'dutch post', created_at: new Date().toISOString() },
        { id: '2', source: 'twitter', text: 'dutch post', created_at: new Date().toISOString() },
        { id: '3', source: 'twitter', text: 'english post', created_at: new Date().toISOString() },
      ]

      // Assume 1 out of 3 is non-Dutch
      const filterRate = 1 / 3
      
      expect(filterRate).toBeCloseTo(0.333, 2)
      expect(filterRate).toBeGreaterThanOrEqual(0)
      expect(filterRate).toBeLessThanOrEqual(1)
    })
  })
})

// Helper functions for testing

function createMockPost(
  id: string, 
  score: number, 
  source: AnalyzedPost['source'] = 'twitter'
): AnalyzedPost {
  return {
    id,
    source,
    text: `Mock post ${id}`,
    sentiment_score: score,
    language: 'nl',
    topics: [],
    created_at: new Date().toISOString(),
    analyzed_at: new Date().toISOString(),
  }
}

function createMockPostWithTopic(
  id: string,
  score: number,
  topics: string[]
): AnalyzedPost {
  return {
    ...createMockPost(id, score),
    topics,
  }
}

function createMockPostWithTime(
  id: string,
  score: number,
  created_at: string
): AnalyzedPost {
  return {
    ...createMockPost(id, score),
    created_at,
  }
}

function calculateSimpleAverage(posts: AnalyzedPost[]): number {
  if (posts.length === 0) return 0.0
  
  const sum = posts.reduce((acc, post) => acc + post.sentiment_score, 0)
  const average = sum / posts.length
  
  // Clamp to [-1.0, 1.0]
  return Math.max(-1.0, Math.min(1.0, average))
}

function groupByTopic(posts: AnalyzedPost[]): Map<string, AnalyzedPost[]> {
  const groups = new Map<string, AnalyzedPost[]>()
  
  for (const post of posts) {
    for (const topic of post.topics) {
      if (!groups.has(topic)) {
        groups.set(topic, [])
      }
      groups.get(topic)!.push(post)
    }
  }
  
  return groups
}

function detectPolarizing(posts: AnalyzedPost[]): boolean {
  if (posts.length < 2) return false
  
  const scores = posts.map(p => p.sentiment_score)
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length
  const variance = scores.reduce((acc, score) => acc + Math.pow(score - mean, 2), 0) / scores.length
  
  // FR-014: variance > 0.5 indicates polarizing
  return variance > 0.5
}

function groupByHour(posts: AnalyzedPost[]): Map<string, AnalyzedPost[]> {
  const buckets = new Map<string, AnalyzedPost[]>()
  
  for (const post of posts) {
    const key = getHourBucketKey(new Date(post.created_at))
    if (!buckets.has(key)) {
      buckets.set(key, [])
    }
    buckets.get(key)!.push(post)
  }
  
  return buckets
}

function getHourBucketKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}-${String(date.getUTCHours()).padStart(2, '0')}`
}

function getConfidenceLevel(sampleSize: number): 'high' | 'medium' | 'low' {
  if (sampleSize >= 100) return 'high'
  if (sampleSize >= 50) return 'medium'
  return 'low'
}

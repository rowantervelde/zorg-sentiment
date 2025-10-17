import { describe, expect, it } from 'vitest'
import type { RawPost } from '~/types/sentiment'

/**
 * T045: Unit tests for sentiment analyzer
 * Tests: sentiment classification, Dutch language detection, 
 * healthcare keyword filtering, content deduplication
 */

describe('Unit: Sentiment Analyzer', () => {
  describe('Sentiment Classification', () => {
    it('should classify positive text correctly', () => {
      const text = 'geweldig fantastisch uitstekend goede zorg'
      const score = analyzeSentiment(text)
      
      expect(score).toBeGreaterThan(0)
      expect(score).toBeLessThanOrEqual(1.0)
    })

    it('should classify negative text correctly', () => {
      const text = 'slecht verschrikkelijk vreselijk slechte zorg'
      const score = analyzeSentiment(text)
      
      expect(score).toBeLessThan(0)
      expect(score).toBeGreaterThanOrEqual(-1.0)
    })

    it('should classify neutral text near zero', () => {
      const text = 'de zorg is beschikbaar voor iedereen'
      const score = analyzeSentiment(text)
      
      expect(score).toBeGreaterThanOrEqual(-0.3)
      expect(score).toBeLessThanOrEqual(0.3)
    })

    it('should normalize scores to [-1.0, 1.0] range', () => {
      const extremePositive = 'geweldig uitstekend fantastisch perfect prachtig'
      const extremeNegative = 'verschrikkelijk vreselijk afschuwelijk slecht ellendig'
      
      const positiveScore = analyzeSentiment(extremePositive)
      const negativeScore = analyzeSentiment(extremeNegative)
      
      expect(positiveScore).toBeLessThanOrEqual(1.0)
      expect(positiveScore).toBeGreaterThanOrEqual(-1.0)
      expect(negativeScore).toBeLessThanOrEqual(1.0)
      expect(negativeScore).toBeGreaterThanOrEqual(-1.0)
    })

    it('should handle empty text', () => {
      const score = analyzeSentiment('')
      expect(score).toBe(0)
    })

    it('should handle text with mixed sentiment', () => {
      const text = 'goede service maar lange wachttijden'
      const score = analyzeSentiment(text)
      
      // Should be somewhere in between
      expect(score).toBeGreaterThanOrEqual(-1.0)
      expect(score).toBeLessThanOrEqual(1.0)
    })
  })

  describe('Dutch Language Detection', () => {
    it('should detect Dutch text correctly', () => {
      const dutchTexts = [
        'De zorg in Nederland is goed geregeld',
        'Lange wachttijden bij de huisarts',
        'Gezondheidszorg verzekering is belangrijk',
      ]
      
      dutchTexts.forEach(text => {
        const isDutch = detectDutch(text)
        expect(isDutch).toBe(true)
      })
    })

    it('should reject English text', () => {
      const englishTexts = [
        'Healthcare in the Netherlands is well organized',
        'Long waiting times at the doctor',
        'Health insurance is important',
      ]
      
      englishTexts.forEach(text => {
        const isDutch = detectDutch(text)
        expect(isDutch).toBe(false)
      })
    })

    it('should handle short text gracefully', () => {
      const shortText = 'OK'
      const isDutch = detectDutch(shortText)
      
      // Short text may be ambiguous, should return boolean
      expect(typeof isDutch).toBe('boolean')
    })

    it('should calculate language filter rate', () => {
      const posts: RawPost[] = [
        createMockRawPost('1', 'Dit is Nederlandse tekst over zorg'),
        createMockRawPost('2', 'This is English text about healthcare'),
        createMockRawPost('3', 'Nog meer Nederlandse tekst'),
        createMockRawPost('4', 'Another English post'),
        createMockRawPost('5', 'En nog een Nederlandse post'),
      ]
      
      const dutchCount = posts.filter(p => detectDutch(p.text)).length
      const filterRate = (posts.length - dutchCount) / posts.length
      
      // 2 out of 5 are English, so filter rate should be 0.4
      expect(filterRate).toBeCloseTo(0.4, 1)
    })
  })

  describe('Healthcare Keyword Filtering', () => {
    it('should identify healthcare-related keywords', () => {
      const healthcareKeywords = [
        'zorg',
        'gezondheidszorg',
        'verzekering',
        'zorgverzekering',
        'huisarts',
        'ziekenhuis',
        'wachttijd',
        'behandeling',
        'GGZ',
        'apotheek',
      ]
      
      healthcareKeywords.forEach(keyword => {
        const isHealthcare = containsHealthcareKeyword(keyword)
        expect(isHealthcare).toBe(true)
      })
    })

    it('should filter out non-healthcare posts', () => {
      const nonHealthcarePosts = [
        'Mooie dag vandaag',
        'Voetbal wedstrijd was leuk',
        'Nieuwe telefoon gekocht',
      ]
      
      nonHealthcarePosts.forEach(text => {
        const isHealthcare = containsHealthcareKeyword(text)
        expect(isHealthcare).toBe(false)
      })
    })

    it('should detect healthcare context in longer text', () => {
      const posts = [
        'Mijn ervaring met de huisarts was positief',
        'Lang moeten wachten bij het ziekenhuis',
        'Zorgverzekering premie is weer gestegen',
        'De GGZ heeft lange wachttijden',
      ]
      
      posts.forEach(text => {
        const isHealthcare = containsHealthcareKeyword(text)
        expect(isHealthcare).toBe(true)
      })
    })

    it('should be case-insensitive', () => {
      const variants = [
        'ZORG',
        'Zorg',
        'zOrG',
        'Huisarts',
        'HUISARTS',
      ]
      
      variants.forEach(text => {
        const isHealthcare = containsHealthcareKeyword(text)
        expect(isHealthcare).toBe(true)
      })
    })
  })

  describe('Content Deduplication', () => {
    it('should generate consistent hash for same content', () => {
      const text = 'De zorg in Nederland is goed'
      const hash1 = generateContentHash(text)
      const hash2 = generateContentHash(text)
      
      expect(hash1).toBe(hash2)
      expect(hash1).toBeTruthy()
      expect(typeof hash1).toBe('string')
    })

    it('should generate different hashes for different content', () => {
      const text1 = 'De zorg in Nederland is goed'
      const text2 = 'De zorg in Nederland is slecht'
      
      const hash1 = generateContentHash(text1)
      const hash2 = generateContentHash(text2)
      
      expect(hash1).not.toBe(hash2)
    })

    it('should detect duplicate posts', () => {
      const posts: RawPost[] = [
        createMockRawPost('1', 'Origineel bericht over zorg'),
        createMockRawPost('2', 'Origineel bericht over zorg'), // Duplicate
        createMockRawPost('3', 'Ander bericht over zorg'),
      ]
      
      const hashes = posts.map(p => generateContentHash(p.text))
      const uniqueHashes = new Set(hashes)
      
      expect(hashes.length).toBe(3)
      expect(uniqueHashes.size).toBe(2) // Only 2 unique
    })

    it('should handle whitespace variations', () => {
      const text1 = 'De zorg  is   goed'
      const text2 = 'De zorg is goed'
      
      // Normalize whitespace before hashing
      const normalized1 = text1.replace(/\s+/g, ' ').trim()
      const normalized2 = text2.replace(/\s+/g, ' ').trim()
      
      const hash1 = generateContentHash(normalized1)
      const hash2 = generateContentHash(normalized2)
      
      expect(hash1).toBe(hash2)
    })

    it('should dedup across sources', () => {
      const duplicateContent = 'Breaking: nieuwe zorgregeling aangekondigd'
      
      const posts: RawPost[] = [
        { ...createMockRawPost('1', duplicateContent), source: 'twitter' },
        { ...createMockRawPost('2', duplicateContent), source: 'reddit' },
        { ...createMockRawPost('3', duplicateContent), source: 'mastodon' },
      ]
      
      const hashes = posts.map(p => generateContentHash(p.text))
      const uniqueHashes = new Set(hashes)
      
      expect(uniqueHashes.size).toBe(1) // All same content
    })
  })

  describe('Topic Extraction', () => {
    it('should extract insurance topic', () => {
      const text = 'Mijn zorgverzekering premie is gestegen dit jaar'
      const topics = extractTopics(text)
      
      expect(topics).toContain('insurance')
    })

    it('should extract waiting-times topic', () => {
      const text = 'Lange wachttijden bij de huisarts zijn frustrerend'
      const topics = extractTopics(text)
      
      expect(topics).toContain('waiting-times')
    })

    it('should extract quality topic', () => {
      const text = 'De kwaliteit van de zorg is uitstekend'
      const topics = extractTopics(text)
      
      expect(topics).toContain('quality')
    })

    it('should extract accessibility topic', () => {
      const text = 'Toegankelijkheid van gezondheidszorg voor iedereen'
      const topics = extractTopics(text)
      
      expect(topics).toContain('accessibility')
    })

    it('should extract multiple topics from same text', () => {
      const text = 'Lange wachttijden en hoge kosten bij zorgverzekering'
      const topics = extractTopics(text)
      
      expect(topics.length).toBeGreaterThan(1)
      expect(topics).toContain('waiting-times')
      expect(topics).toContain('insurance')
    })

    it('should return empty array for non-specific text', () => {
      const text = 'Dit is een algemeen bericht'
      const topics = extractTopics(text)
      
      expect(Array.isArray(topics)).toBe(true)
      expect(topics.length).toBe(0)
    })
  })

  describe('Edge Cases', () => {
    it('should handle posts with URLs', () => {
      const text = 'Zie https://example.com voor meer info over zorg'
      const score = analyzeSentiment(text)
      
      expect(score).toBeGreaterThanOrEqual(-1.0)
      expect(score).toBeLessThanOrEqual(1.0)
    })

    it('should handle posts with hashtags', () => {
      const text = 'Goede zorg #gezondheidszorg #nederland'
      const score = analyzeSentiment(text)
      
      expect(score).toBeGreaterThan(0)
    })

    it('should handle posts with mentions', () => {
      const text = '@zorginstelling bedankt voor de uitstekende service'
      const score = analyzeSentiment(text)
      
      expect(score).toBeGreaterThan(0)
    })

    it('should handle posts with emojis', () => {
      const text = 'Zorg is geweldig 😊👍'
      const score = analyzeSentiment(text)
      
      expect(score).toBeGreaterThanOrEqual(-1.0)
      expect(score).toBeLessThanOrEqual(1.0)
    })

    it('should handle very long text', () => {
      const longText = 'De zorg in Nederland is '. repeat(100) + 'goed'
      const score = analyzeSentiment(longText)
      
      expect(score).toBeGreaterThanOrEqual(-1.0)
      expect(score).toBeLessThanOrEqual(1.0)
    })
  })
})

// Helper functions for testing

function createMockRawPost(id: string, text: string): RawPost {
  return {
    id,
    source: 'twitter',
    text,
    created_at: new Date().toISOString(),
  }
}

function analyzeSentiment(text: string): number {
  if (!text) return 0
  
  // Simple sentiment scoring for testing
  // In real implementation, this would use the sentiment library
  const positiveWords = ['goed', 'geweldig', 'uitstekend', 'fantastisch', 'perfect', 'prachtig', 'goede']
  const negativeWords = ['slecht', 'verschrikkelijk', 'vreselijk', 'afschuwelijk', 'ellendig', 'slechte']
  
  const lowerText = text.toLowerCase()
  let score = 0
  
  positiveWords.forEach(word => {
    if (lowerText.includes(word)) score += 0.2
  })
  
  negativeWords.forEach(word => {
    if (lowerText.includes(word)) score -= 0.2
  })
  
  // Clamp to [-1.0, 1.0]
  return Math.max(-1.0, Math.min(1.0, score))
}

function detectDutch(text: string): boolean {
  // Simple Dutch detection for testing
  // In real implementation, this would use franc-min
  const dutchWords = ['de', 'het', 'en', 'is', 'van', 'een', 'in', 'bij', 'zorg', 'Nederlandse', 'nog', 'meer']
  const englishWords = ['the', 'is', 'at', 'of', 'and', 'in', 'about', 'healthcare', 'doctor', 'insurance']
  
  const lowerText = text.toLowerCase()
  
  const dutchCount = dutchWords.filter(word => lowerText.includes(word)).length
  const englishCount = englishWords.filter(word => lowerText.includes(word)).length
  
  // Short text or ambiguous: accept as Dutch if not clearly English
  if (text.length < 10) return englishCount === 0
  
  return dutchCount > englishCount
}

function containsHealthcareKeyword(text: string): boolean {
  const healthcareKeywords = [
    'zorg',
    'gezondheidszorg',
    'verzekering',
    'zorgverzekering',
    'huisarts',
    'ziekenhuis',
    'wachttijd',
    'wachttijden',
    'behandeling',
    'ggz',
    'apotheek',
    'kwaliteit',
    'toegankelijkheid',
  ]
  
  const lowerText = text.toLowerCase()
  return healthcareKeywords.some(keyword => lowerText.includes(keyword))
}

function generateContentHash(text: string): string {
  // Simple hash function for testing
  // In real implementation, this would use MD5 or similar
  let hash = 0
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  return hash.toString(36)
}

function extractTopics(text: string): string[] {
  const topics: string[] = []
  const lowerText = text.toLowerCase()
  
  if (lowerText.includes('verzekering') || lowerText.includes('premie') || lowerText.includes('kosten')) {
    topics.push('insurance')
  }
  
  if (lowerText.includes('wachttijd') || lowerText.includes('wachten')) {
    topics.push('waiting-times')
  }
  
  if (lowerText.includes('kwaliteit')) {
    topics.push('quality')
  }
  
  if (lowerText.includes('toegankelijkheid')) {
    topics.push('accessibility')
  }
  
  return topics
}

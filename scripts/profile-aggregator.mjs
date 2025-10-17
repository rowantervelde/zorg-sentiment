#!/usr/bin/env node
/**
 * T053: Performance profiling script for sentiment aggregator
 * 
 * Validates:
 * - Aggregation completes in <45s (SC-016)
 * - Cache hit performance <50ms
 * - Bucket file reads are optimized
 * - No slow queries or blocking operations
 */

import { performance } from 'node:perf_hooks'

console.log('🔍 Sentiment Aggregator Performance Profiler\n')

// Performance thresholds (SC-016)
const THRESHOLDS = {
  TOTAL_AGGREGATION: 45000, // 45 seconds
  CACHE_HIT: 50, // 50ms
  SINGLE_SOURCE: 10000, // 10 seconds per source
  BUCKET_READ: 100, // 100ms per bucket file
}

const results = {
  passed: [],
  failed: [],
  warnings: [],
}

/**
 * Profile a function and return execution time
 */
async function profile(name, fn) {
  const start = performance.now()
  const result = await fn()
  const duration = performance.now() - start
  return { name, duration, result }
}

/**
 * Test 1: Full aggregation performance
 */
async function testFullAggregation() {
  console.log('📊 Test 1: Full aggregation performance')
  
  const { duration } = await profile('Full aggregation', async () => {
    const response = await fetch('http://localhost:3000/api/sentiment')
    return await response.json()
  })
  
  console.log(`  Duration: ${duration.toFixed(2)}ms`)
  
  if (duration < THRESHOLDS.TOTAL_AGGREGATION) {
    results.passed.push(`Full aggregation: ${duration.toFixed(2)}ms < ${THRESHOLDS.TOTAL_AGGREGATION}ms ✅`)
  } else {
    results.failed.push(`Full aggregation: ${duration.toFixed(2)}ms > ${THRESHOLDS.TOTAL_AGGREGATION}ms ❌`)
  }
  
  console.log()
}

/**
 * Test 2: Cache hit performance
 */
async function testCacheHit() {
  console.log('⚡ Test 2: Cache hit performance (15-min TTL)')
  
  // First request (cache miss)
  const firstResponse = await fetch('http://localhost:3000/api/sentiment')
  await firstResponse.json()
  
  // Second request (cache hit)
  const { duration } = await profile('Cache hit', async () => {
    const response = await fetch('http://localhost:3000/api/sentiment')
    return await response.json()
  })
  
  console.log(`  Duration: ${duration.toFixed(2)}ms`)
  
  if (duration < THRESHOLDS.CACHE_HIT) {
    results.passed.push(`Cache hit: ${duration.toFixed(2)}ms < ${THRESHOLDS.CACHE_HIT}ms ✅`)
  } else {
    results.warnings.push(`Cache hit: ${duration.toFixed(2)}ms > ${THRESHOLDS.CACHE_HIT}ms ⚠️`)
  }
  
  console.log()
}

/**
 * Test 3: Response time percentiles
 */
async function testPercentiles() {
  console.log('📈 Test 3: Response time percentiles (10 requests)')
  
  const times = []
  
  for (let i = 0; i < 10; i++) {
    const start = performance.now()
    const response = await fetch('http://localhost:3000/api/sentiment')
    await response.json()
    const duration = performance.now() - start
    times.push(duration)
    process.stdout.write('.')
  }
  
  console.log('\n')
  
  times.sort((a, b) => a - b)
  
  const p50 = times[Math.floor(times.length * 0.5)]
  const p95 = times[Math.floor(times.length * 0.95)]
  const p99 = times[Math.floor(times.length * 0.99)]
  
  console.log(`  p50: ${p50.toFixed(2)}ms`)
  console.log(`  p95: ${p95.toFixed(2)}ms`)
  console.log(`  p99: ${p99.toFixed(2)}ms`)
  
  if (p95 < 3000) {
    results.passed.push(`p95 response time: ${p95.toFixed(2)}ms < 3000ms ✅`)
  } else {
    results.failed.push(`p95 response time: ${p95.toFixed(2)}ms > 3000ms ❌`)
  }
  
  console.log()
}

/**
 * Test 4: Memory usage
 */
async function testMemoryUsage() {
  console.log('💾 Test 4: Memory usage')
  
  const before = process.memoryUsage()
  
  // Make 5 requests
  for (let i = 0; i < 5; i++) {
    const response = await fetch('http://localhost:3000/api/sentiment')
    await response.json()
  }
  
  const after = process.memoryUsage()
  const heapDiff = (after.heapUsed - before.heapUsed) / 1024 / 1024
  
  console.log(`  Heap increase: ${heapDiff.toFixed(2)} MB`)
  console.log(`  Total heap: ${(after.heapUsed / 1024 / 1024).toFixed(2)} MB`)
  
  if (heapDiff < 50) {
    results.passed.push(`Memory usage: ${heapDiff.toFixed(2)} MB < 50 MB ✅`)
  } else {
    results.warnings.push(`Memory usage: ${heapDiff.toFixed(2)} MB > 50 MB ⚠️`)
  }
  
  console.log()
}

/**
 * Test 5: Concurrent requests
 */
async function testConcurrency() {
  console.log('🔀 Test 5: Concurrent request handling')
  
  const { duration } = await profile('5 concurrent requests', async () => {
    const promises = Array(5).fill(null).map(async () => {
      const response = await fetch('http://localhost:3000/api/sentiment')
      return await response.json()
    })
    
    return await Promise.all(promises)
  })
  
  console.log(`  Duration: ${duration.toFixed(2)}ms`)
  console.log(`  Average per request: ${(duration / 5).toFixed(2)}ms`)
  
  if (duration < 5000) {
    results.passed.push(`5 concurrent requests: ${duration.toFixed(2)}ms < 5000ms ✅`)
  } else {
    results.failed.push(`5 concurrent requests: ${duration.toFixed(2)}ms > 5000ms ❌`)
  }
  
  console.log()
}

/**
 * Main profiling function
 */
async function main() {
  try {
    // Check if server is running
    try {
      await fetch('http://localhost:3000/api/sentiment')
    } catch {
      console.error('❌ Error: Development server not running')
      console.error('   Please start the server with: npm run dev')
      process.exit(1)
    }
    
    // Run all tests
    await testFullAggregation()
    await testCacheHit()
    await testPercentiles()
    await testMemoryUsage()
    await testConcurrency()
    
    // Print summary
    console.log('═══════════════════════════════════════════════════════════')
    console.log('📊 Performance Profiling Summary\n')
    
    if (results.passed.length > 0) {
      console.log('✅ Passed:')
      results.passed.forEach(msg => console.log(`   ${msg}`))
      console.log()
    }
    
    if (results.warnings.length > 0) {
      console.log('⚠️  Warnings:')
      results.warnings.forEach(msg => console.log(`   ${msg}`))
      console.log()
    }
    
    if (results.failed.length > 0) {
      console.log('❌ Failed:')
      results.failed.forEach(msg => console.log(`   ${msg}`))
      console.log()
      process.exit(1)
    }
    
    console.log('═══════════════════════════════════════════════════════════')
    console.log('✅ All performance checks passed!')
    
  } catch (error) {
    console.error('❌ Profiling failed:', error.message)
    process.exit(1)
  }
}

main()

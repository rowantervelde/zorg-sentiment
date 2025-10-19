#!/usr/bin/env node
/**
 * T048: Data Rotation Script
 * 
 * Aggregates hourly buckets into daily summaries after 30 days (FR-021)
 * Run nightly via cron or GitHub Actions
 * 
 * Process:
 * 1. Find bucket files older than 30 days
 * 2. Compute daily aggregates (avg, min, max, total mentions)
 * 3. Write to daily-YYYY-MM.json
 * 4. Delete old hourly files
 */

import { readdir, readFile, writeFile, unlink } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Configuration
const RETENTION_DAYS = 30
const BUCKETS_DIR = join(__dirname, '../src/server/data/sentiment')
const DRY_RUN = process.argv.includes('--dry-run')

/**
 * Parse bucket filename to extract date
 * @param {string} filename 
 * @returns {Date | null}
 */
function parseBucketFilename(filename) {
  // Format: buckets-YYYY-MM-DD.json
  const match = filename.match(/^buckets-(\d{4})-(\d{2})-(\d{2})\.json$/)
  if (!match) return null
  
  const [, year, month, day] = match
  return new Date(`${year}-${month}-${day}T00:00:00Z`)
}

/**
 * Check if a date is older than retention period
 * @param {Date} date 
 * @param {number} days 
 * @returns {boolean}
 */
function isOlderThan(date, days) {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)
  return date < cutoff
}

/**
 * Aggregate hourly buckets into daily summary
 * @param {Array} buckets 
 * @param {string} date 
 * @returns {Object}
 */
function aggregateToDaily(buckets, date) {
  if (buckets.length === 0) {
    throw new Error(`No buckets found for date ${date}`)
  }
  
  const scores = buckets.map(b => b.aggregate_score)
  const totalMentions = buckets.reduce((sum, b) => sum + b.post_count, 0)
  
  return {
    date,
    avg_composite: scores.reduce((a, b) => a + b, 0) / scores.length,
    min_composite: Math.min(...scores),
    max_composite: Math.max(...scores),
    total_mentions: totalMentions,
    hourly_buckets: buckets.length,
  }
}

/**
 * Load daily aggregates file or create new one
 * @param {string} yearMonth 
 * @returns {Promise<Map>}
 */
async function loadDailyFile(yearMonth) {
  const filename = `daily-${yearMonth}.json`
  const filepath = join(BUCKETS_DIR, filename)
  
  try {
    const content = await readFile(filepath, 'utf-8')
    const data = JSON.parse(content)
    
    const map = new Map()
    data.forEach(agg => map.set(agg.date, agg))
    
    return map
  } catch {
    // File doesn't exist yet
    return new Map()
  }
}

/**
 * Save daily aggregates to file
 * @param {string} yearMonth 
 * @param {Map} aggregates 
 * @returns {Promise<void>}
 */
async function saveDailyFile(yearMonth, aggregates) {
  const filename = `daily-${yearMonth}.json`
  const filepath = join(BUCKETS_DIR, filename)
  
  // Convert map to sorted array
  const data = Array.from(aggregates.values()).sort((a, b) => 
    a.date.localeCompare(b.date)
  )
  
  const content = JSON.stringify(data, null, 2)
  
  if (DRY_RUN) {
    console.log(`  [DRY RUN] Would write ${filepath}`)
    console.log(`  Content: ${data.length} daily aggregates`)
  } else {
    await writeFile(filepath, content, 'utf-8')
    console.log(`  ✅ Written ${filepath} (${data.length} days)`)
  }
}

/**
 * Main rotation logic
 */
async function rotateData() {
  console.log('🔄 Data Rotation Script')
  console.log(`   Retention: ${RETENTION_DAYS} days`)
  console.log(`   Directory: ${BUCKETS_DIR}`)
  console.log(`   Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}\n`)
  
  let processedFiles = 0
  let deletedFiles = 0
  let totalBuckets = 0
  
  try {
    // Get all bucket files
    const files = await readdir(BUCKETS_DIR)
    const bucketFiles = files.filter(f => f.startsWith('buckets-') && f.endsWith('.json'))
    
    console.log(`📁 Found ${bucketFiles.length} bucket files\n`)
    
    // Group files by age
    const oldFiles = []
    
    for (const filename of bucketFiles) {
      const date = parseBucketFilename(filename)
      if (!date) {
        console.log(`⚠️  Skipping invalid filename: ${filename}`)
        continue
      }
      
      if (isOlderThan(date, RETENTION_DAYS)) {
        oldFiles.push({ filename, date })
      }
    }
    
    if (oldFiles.length === 0) {
      console.log('✨ No files older than retention period')
      return
    }
    
    console.log(`📊 Processing ${oldFiles.length} old files...\n`)
    
    // Group by year-month for daily aggregation
    const byYearMonth = new Map()
    
    for (const file of oldFiles) {
      const yearMonth = file.date.toISOString().substring(0, 7) // YYYY-MM
      if (!byYearMonth.has(yearMonth)) {
        byYearMonth.set(yearMonth, [])
      }
      byYearMonth.get(yearMonth).push(file)
    }
    
    // Process each month
    for (const [yearMonth, files] of byYearMonth) {
      console.log(`📅 Processing ${yearMonth} (${files.length} files)`)
      
      // Load existing daily aggregates for this month
      const dailyAggregates = await loadDailyFile(yearMonth)
      
      // Group files by date
      const byDate = new Map()
      for (const { filename, date } of files) {
        const dateStr = date.toISOString().substring(0, 10) // YYYY-MM-DD
        if (!byDate.has(dateStr)) {
          byDate.set(dateStr, [])
        }
        byDate.get(dateStr).push(filename)
      }
      
      // Aggregate each date
      for (const [dateStr, filenames] of byDate) {
        // Skip if already aggregated
        if (dailyAggregates.has(dateStr)) {
          console.log(`  ⏭️  ${dateStr} already aggregated`)
          continue
        }
        
        // Load all hourly buckets for this date
        const allBuckets = []
        
        for (const filename of filenames) {
          const filepath = join(BUCKETS_DIR, filename)
          try {
            const content = await readFile(filepath, 'utf-8')
            const buckets = JSON.parse(content)
            allBuckets.push(...buckets)
          } catch (error) {
            console.log(`  ⚠️  Error reading ${filename}: ${error}`)
          }
        }
        
        if (allBuckets.length === 0) {
          console.log(`  ⚠️  No buckets found for ${dateStr}`)
          continue
        }
        
        // Create daily aggregate
        const daily = aggregateToDaily(allBuckets, dateStr)
        dailyAggregates.set(dateStr, daily)
        
        console.log(`  ✅ Aggregated ${dateStr}: ${daily.hourly_buckets} buckets, ${daily.total_mentions} mentions`)
        totalBuckets += daily.hourly_buckets
        processedFiles += filenames.length
      }
      
      // Save updated daily aggregates
      await saveDailyFile(yearMonth, dailyAggregates)
      
      // Delete old hourly files
      for (const { filename } of files) {
        const filepath = join(BUCKETS_DIR, filename)
        
        if (DRY_RUN) {
          console.log(`  [DRY RUN] Would delete ${filename}`)
        } else {
          await unlink(filepath)
          console.log(`  🗑️  Deleted ${filename}`)
        }
        
        deletedFiles++
      }
      
      console.log()
    }
    
    // Summary
    console.log('═════════════════════════════════════════════════')
    console.log('📊 Data Rotation Summary\n')
    console.log(`   Processed files: ${processedFiles}`)
    console.log(`   Deleted files: ${deletedFiles}`)
    console.log(`   Total buckets aggregated: ${totalBuckets}`)
    console.log(`   Mode: ${DRY_RUN ? '🔍 DRY RUN (no changes made)' : '✅ LIVE (changes applied)'}`)
    console.log('═════════════════════════════════════════════════')
    
  } catch (error) {
    console.error('❌ Data rotation failed:', error)
    process.exit(1)
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  rotateData()
}

export { rotateData, aggregateToDaily }

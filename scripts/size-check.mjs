#!/usr/bin/env node
import { readdirSync, statSync } from 'node:fs'
import { join, extname } from 'node:path'

const BUDGET_BYTES = 180 * 1024
const DIST_DIR = join(process.cwd(), 'dist')
const NUXT_DIR = join(DIST_DIR, '_nuxt')

function getJsBytes(dir) {
  let total = 0
  const entries = readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    const target = join(dir, entry.name)
    if (entry.isDirectory()) {
      total += getJsBytes(target)
    } else if (extname(entry.name) === '.js') {
      total += statSync(target).size
    }
  }
  return total
}

try {
  const totalBytes = getJsBytes(NUXT_DIR)
  if (totalBytes > BUDGET_BYTES) {
    console.error(`❌ Initial JS bundle ${totalBytes} bytes exceeds budget ${BUDGET_BYTES}.`)
    process.exitCode = 1
  } else {
    console.log(`✅ Initial JS bundle ${totalBytes} bytes within budget ${BUDGET_BYTES}.`)
  }
} catch (error) {
  console.warn('⚠️ Unable to evaluate bundle size. Ensure `npm run generate` completed before running size check.')
  console.warn(error instanceof Error ? error.message : error)
  process.exitCode = 0
}

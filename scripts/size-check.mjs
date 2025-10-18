#!/usr/bin/env node
import { existsSync, readdirSync, statSync } from 'node:fs'
import { join, extname, relative } from 'node:path'

const DEFAULT_BUDGET_KB = 180
const budgetKb = Number.parseFloat(process.env.PERF_BUDGET_KB || `${DEFAULT_BUDGET_KB}`)
const budgetBytes = Math.round(Number.isFinite(budgetKb) ? budgetKb * 1024 : DEFAULT_BUDGET_KB * 1024)

const candidateRoots = [
  join(process.cwd(), 'dist', '_nuxt'),
  join(process.cwd(), '.output', 'public', '_nuxt')
]

const bundleRoot = candidateRoots.find(path => existsSync(path) && statSafe(path)?.isDirectory())

if (!bundleRoot) {
  console.error('❌ No bundle output found. Run `npm run generate` (static) or `nuxt build` before invoking the size check.')
  process.exit(1)
}

const jsFiles = collectJsFiles(bundleRoot)

if (jsFiles.length === 0) {
  console.error('❌ Bundle directory located but contains no JavaScript files. Ensure the build succeeded.')
  process.exit(1)
}

const totalBytes = jsFiles.reduce((sum, file) => sum + file.size, 0)
const sortedBySize = [...jsFiles].sort((a, b) => b.size - a.size)
const largestFiles = sortedBySize.slice(0, 5)

report(totalBytes, budgetBytes, bundleRoot, largestFiles)

if (totalBytes > budgetBytes) {
  process.exitCode = 1
}

function statSafe (path) {
  try {
    return statSync(path)
  } catch {
    return undefined
  }
}

function collectJsFiles (dir) {
  const entries = readdirSync(dir, { withFileTypes: true })
  const results = []

  for (const entry of entries) {
    const target = join(dir, entry.name)
    if (entry.isDirectory()) {
      results.push(...collectJsFiles(target))
    } else if (extname(entry.name) === '.js') {
      const stats = statSafe(target)
      if (stats) {
        results.push({
          path: target,
          size: stats.size
        })
      }
    }
  }

  return results
}

function formatBytes (bytes) {
  const kb = bytes / 1024
  return `${kb.toFixed(1)} KB (${bytes.toLocaleString()} bytes)`
}

function report (total, budget, root, topFiles) {
  const relativeRoot = relative(process.cwd(), root)
  const statusEmoji = total > budget ? '❌' : '✅'
  const summary = `${statusEmoji} Initial JS bundle total ${formatBytes(total)} — budget ${formatBytes(budget)}`
  console[total > budget ? 'error' : 'log'](summary)
  console.log(`📦 Analyzed directory: ${relativeRoot}`)

  if (topFiles.length > 0) {
    console.log('Top JS assets:')
    for (const file of topFiles) {
      console.log(`  • ${relative(process.cwd(), file.path)} — ${formatBytes(file.size)}`)
    }
  }
}

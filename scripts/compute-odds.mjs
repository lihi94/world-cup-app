/**
 * Manual full refresh of odds. Uses the same core logic as /api/odds.
 *
 * Run:  node scripts/compute-odds.mjs
 */

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { runOdds } from '../lib/odds-core.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
loadDotEnv(join(__dirname, '..', '.env.local'))

console.log(`🎲 Odds refresh — ${new Date().toLocaleString('he-IL')}\n`)

const result = await runOdds({
  // No limit — full refresh
  log: console.log,
}).catch(err => {
  console.error('\n❌', err.message)
  process.exit(1)
})

console.log(`\n✅ ${result.refreshed} refreshed · ${result.failed} failed · ${result.queued_total} total\n`)

function loadDotEnv(path) {
  try {
    for (const line of readFileSync(path, 'utf8').split('\n')) {
      const t = line.trim()
      if (!t || t.startsWith('#')) continue
      const eq = t.indexOf('=')
      if (eq < 0) continue
      const k = t.slice(0, eq).trim()
      let v = t.slice(eq + 1).trim()
      if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1)
      if (!process.env[k]) process.env[k] = v
    }
  } catch (e) { console.warn(`⚠️ Could not load ${path}: ${e.message}`) }
}

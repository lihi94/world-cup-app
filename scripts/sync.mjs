/**
 * Manual sync runner. Uses the same core logic as the Vercel /api/sync endpoint.
 *
 * Run:  node scripts/sync.mjs
 */

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { runSync } from '../lib/sync-core.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
loadDotEnv(join(__dirname, '..', '.env.local'))

console.log(`🔄 Sync started — ${new Date().toLocaleString('he-IL')}\n`)

runSync({ log: console.log })
  .then(result => {
    console.log('\n✅ Done')
    console.log(`   ${JSON.stringify(result, null, 2)}\n`)
  })
  .catch(err => {
    console.error('\n❌ Sync failed:', err.message)
    process.exit(1)
  })

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

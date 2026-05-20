/**
 * One-time setup for the two bot participants:
 *   • יאני 🤖   — smart AI bot (tier-weighted xG predictions)
 *   • הקוף 🐒   — random monkey
 *
 * Run:  node scripts/setup-bots.mjs
 * Safe to re-run (idempotent).
 */

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
loadDotEnv(join(__dirname, '..', '.env.local'))

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY

const BOTS = [
  { email: 'yani-bot@league.local',   username: 'רובט A.I', avatar: '🤖', password: rand(24) },
  { email: 'monkey-bot@league.local', username: 'הקוף',     avatar: '🐒', password: rand(24) },
]

async function sb(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation,resolution=merge-duplicates',
      ...options.headers,
    },
  })
  if (!res.ok) {
    const txt = await res.text()
    throw new Error(`supabase ${res.status}: ${txt}`)
  }
  return res.status === 204 ? null : res.json()
}

async function adminApi(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })
  const body = res.status === 204 ? null : await res.json()
  return { ok: res.ok, status: res.status, body }
}

async function main() {
  console.log('🤖 Setting up bots...\n')

  // 1. Add bot emails to allowlist
  console.log('📝 Adding bots to allowlist...')
  for (const bot of BOTS) {
    await sb('/allowed_emails?on_conflict=email', {
      method: 'POST',
      body: JSON.stringify({ email: bot.email }),
    })
  }
  console.log('   ✓ Allowlist updated')

  // 2. Create or fetch auth users
  console.log('\n👤 Creating bot users...')
  for (const bot of BOTS) {
    // Try create
    const r = await adminApi('/admin/users', {
      method: 'POST',
      body: JSON.stringify({
        email: bot.email,
        password: bot.password,
        email_confirm: true,
        user_metadata: { username: bot.username },
      }),
    })

    let userId
    if (r.ok) {
      userId = r.body.id
      console.log(`   ✓ Created: ${bot.username}  (${userId})`)
    } else if (r.body?.msg?.includes('already') || r.body?.message?.includes('already') || r.status === 422 || r.status === 400) {
      // Already exists — fetch user
      const list = await adminApi(`/admin/users?email=${encodeURIComponent(bot.email)}`)
      const found = list.body?.users?.find(u => u.email === bot.email)
      if (!found) {
        console.error(`   ⚠ Could not find existing user ${bot.email}:`, r.body)
        continue
      }
      userId = found.id
      console.log(`   • Already exists: ${bot.username}  (${userId})`)
    } else {
      console.error(`   ❌ Failed for ${bot.email}:`, r.body)
      continue
    }

    // 3. Update profile — set username, avatar, and is_bot
    await sb(`/profiles?id=eq.${userId}`, {
      method: 'PATCH',
      body: JSON.stringify({ username: bot.username, avatar: bot.avatar, is_bot: true }),
    })
    console.log(`     ↳ profile updated (${bot.avatar} ${bot.username})`)
  }

  console.log('\n✅ Done. Next: run "node scripts/run-bots.mjs" to generate their predictions.\n')
}

function rand(n) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  let s = ''
  for (let i = 0; i < n; i++) s += chars[Math.floor(Math.random() * chars.length)]
  return s
}

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

main().catch(err => { console.error('❌', err.message); process.exit(1) })

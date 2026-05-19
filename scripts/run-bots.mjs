/**
 * Generates predictions for the two bots on every upcoming match that
 * still has open prediction window AND known teams (group stage today).
 *
 *  • יאני 🤖   — tier-weighted Poisson model (heuristic but football-ish)
 *  • הקוף 🐒   — random uniform-ish (weighted to realistic football scores)
 *
 * Safe to re-run: skips matches that already have a prediction for the bot.
 *
 * Run:  node scripts/run-bots.mjs
 */

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
loadDotEnv(join(__dirname, '..', '.env.local'))

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY

// Rough team strength scores (0-100). Used by Yani only.
// Calibration: Argentina/Brazil/France ~95, mid-tier ~75, minnows ~60.
const TEAM_STRENGTH = {
  // Elite
  Argentina: 95, Brazil: 95, France: 94, England: 92, Spain: 92,
  Portugal: 91, Germany: 90, Netherlands: 90, Belgium: 89, Italy: 88,
  Croatia: 86,
  // Strong
  Uruguay: 84, Switzerland: 83, Denmark: 82, Morocco: 84,
  Colombia: 83, Senegal: 82, 'United States': 82, USA: 82, Mexico: 82,
  Japan: 81, 'Korea Republic': 81, 'South Korea': 81, Serbia: 81,
  Poland: 80, Ecuador: 78, 'Ivory Coast': 77, Norway: 77,
  'Czech Republic': 76, Wales: 75, Scotland: 75,
  // Mid
  Chile: 75, Australia: 75, Iran: 75, Algeria: 75,
  Egypt: 74, Nigeria: 75, Ghana: 74, Tunisia: 73,
  Peru: 73, 'Saudi Arabia': 73, Cameroon: 72, Qatar: 72,
  Canada: 72, Sweden: 76, Turkey: 75, Austria: 76,
  // Lower
  'Costa Rica': 68, Paraguay: 70, Bolivia: 65, Venezuela: 68,
  'New Zealand': 65, Jordan: 64, Uzbekistan: 67, 'United Arab Emirates': 65,
  'Cape Verde': 64, 'Cabo Verde': 64, Curaçao: 63, Haiti: 64,
  'South Africa': 70, Mali: 70, 'DR Congo': 70,
}
const DEFAULT_STRENGTH = 68

const YANI_USERNAME = 'יאני 🤖'
const MONKEY_USERNAME = 'הקוף 🐒'

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

// === Yani's brain ===
// xG model: expected goals scale with strength differential.
// Then sample a Poisson value with that mean.
function yaniPredict(nameA, nameB) {
  const sA = TEAM_STRENGTH[nameA] ?? DEFAULT_STRENGTH
  const sB = TEAM_STRENGTH[nameB] ?? DEFAULT_STRENGTH
  const diff = sA - sB
  const base = 1.35
  const xgA = Math.max(0.15, base + diff * 0.035)
  const xgB = Math.max(0.15, base - diff * 0.035)
  return {
    scoreA: capScore(poisson(xgA)),
    scoreB: capScore(poisson(xgB)),
  }
}

// Box-Muller-ish Poisson sampler (Knuth's algorithm)
function poisson(lambda) {
  const L = Math.exp(-lambda)
  let k = 0, p = 1
  do { k++; p *= Math.random() } while (p > L)
  return k - 1
}

function capScore(n) { return Math.min(n, 6) }

// === Monkey's brain — weighted random (mimics real football distribution) ===
const SCORE_WEIGHTS = [0.32, 0.34, 0.20, 0.09, 0.04, 0.01]
function monkeyPredict() {
  return { scoreA: weightedPick(SCORE_WEIGHTS), scoreB: weightedPick(SCORE_WEIGHTS) }
}
function weightedPick(weights) {
  const r = Math.random()
  let cum = 0
  for (let i = 0; i < weights.length; i++) {
    cum += weights[i]
    if (r <= cum) return i
  }
  return weights.length - 1
}

async function main() {
  console.log('🎲 Generating bot predictions...\n')

  // 1. Find bot user IDs
  const bots = await sb('/profiles?is_bot=eq.true&select=id,username')
  const yani = bots.find(b => b.username === YANI_USERNAME)
  const monkey = bots.find(b => b.username === MONKEY_USERNAME)
  if (!yani || !monkey) {
    console.error('❌ Bots not found. Run "node scripts/setup-bots.mjs" first.')
    process.exit(1)
  }
  console.log(`   ✓ Yani:   ${yani.id}`)
  console.log(`   ✓ Monkey: ${monkey.id}`)

  // 2. Fetch all SCHEDULED matches with known teams
  const nowIso = new Date(Date.now() + 60_000).toISOString() // 1 min in future
  const matches = await sb(
    `/matches?status=eq.SCHEDULED&start_time=gt.${nowIso}` +
    `&team_a_id=not.is.null&team_b_id=not.is.null` +
    `&select=id,stage,start_time,team_a:teams!team_a_id(name),team_b:teams!team_b_id(name)`
  )
  console.log(`\n⚽ ${matches.length} bettable matches\n`)

  if (matches.length === 0) {
    console.log('Nothing to predict. Exiting.')
    return
  }

  // 3. Fetch existing bot predictions to skip duplicates
  const existing = await sb(`/predictions?user_id=in.(${yani.id},${monkey.id})&select=user_id,match_id`)
  const has = new Set(existing.map(p => `${p.user_id}|${p.match_id}`))

  // 4. Generate predictions
  const newPreds = []
  for (const m of matches) {
    const nameA = m.team_a?.name ?? '?'
    const nameB = m.team_b?.name ?? '?'

    const isKnockout = m.stage !== 'GROUP'
    // For knockouts we'd also pick a qualifier — but we skip knockouts
    // since right now they have no teams (TBD). The script will pick them
    // up after groups end and the API fills in matchups.

    if (!has.has(`${yani.id}|${m.id}`)) {
      const p = yaniPredict(nameA, nameB)
      newPreds.push({
        user_id: yani.id,
        match_id: m.id,
        pred_score_a: p.scoreA,
        pred_score_b: p.scoreB,
        pred_qualifier_id: isKnockout
          ? (p.scoreA >= p.scoreB ? m.team_a?.id : m.team_b?.id) ?? null
          : null,
      })
    }
    if (!has.has(`${monkey.id}|${m.id}`)) {
      const p = monkeyPredict()
      newPreds.push({
        user_id: monkey.id,
        match_id: m.id,
        pred_score_a: p.scoreA,
        pred_score_b: p.scoreB,
        pred_qualifier_id: null,
      })
    }
  }

  console.log(`💾 Inserting ${newPreds.length} new predictions...`)
  if (newPreds.length === 0) {
    console.log('   (Both bots already have predictions for every open match.)')
    return
  }

  // Insert in batches
  const BATCH = 100
  let done = 0
  for (let i = 0; i < newPreds.length; i += BATCH) {
    const batch = newPreds.slice(i, i + BATCH)
    await sb('/predictions', {
      method: 'POST',
      body: JSON.stringify(batch),
    })
    done += batch.length
    process.stdout.write(`   ${done}/${newPreds.length}\r`)
  }
  console.log(`\n   ✓ Done\n`)

  // Quick sanity dump — first 3 of each
  const sampleY = newPreds.filter(p => p.user_id === yani.id).slice(0, 3)
  const sampleM = newPreds.filter(p => p.user_id === monkey.id).slice(0, 3)
  console.log('📊 Sample predictions:')
  console.log('   Yani:  ', sampleY.map(p => `${p.pred_score_a}-${p.pred_score_b}`).join(', '))
  console.log('   Monkey:', sampleM.map(p => `${p.pred_score_a}-${p.pred_score_b}`).join(', '))
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

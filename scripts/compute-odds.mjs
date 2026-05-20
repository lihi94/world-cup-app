/**
 * Asks Gemini for win-probabilities for every upcoming SCHEDULED match with
 * known teams, and stores them in matches.odds_a/draw/b.
 *
 * Run:  node scripts/compute-odds.mjs
 *
 * Re-runnable: only fetches odds for matches that are missing them or stale.
 */

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
loadDotEnv(join(__dirname, '..', '.env.local'))

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY
const GEMINI_API_KEY = process.env.GEMINI_API_KEY
const GEMINI_MODEL = 'gemini-2.0-flash'  // fast + free tier friendly

// Stale window — re-fetch odds older than this many days
const STALE_DAYS = 7

const STAGE_LABEL = {
  GROUP: 'Group Stage',
  R32:   'Round of 32',
  R16:   'Round of 16',
  QF:    'Quarter-final',
  SF:    'Semi-final',
  THIRD: 'Third-place playoff',
  FINAL: 'Final',
}

async function sb(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...options.headers,
    },
  })
  if (!res.ok) throw new Error(`supabase ${res.status}: ${await res.text()}`)
  return res.status === 204 ? null : res.json()
}

async function gemini(prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.4,
        topP: 0.95,
        topK: 40,
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'object',
          required: ['team_a', 'draw', 'team_b'],
          properties: {
            team_a: { type: 'integer' },
            draw:   { type: 'integer' },
            team_b: { type: 'integer' },
          },
        },
      },
    }),
  })
  if (!res.ok) throw new Error(`gemini ${res.status}: ${await res.text()}`)
  const data = await res.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) throw new Error('No text in Gemini response')
  return JSON.parse(text)
}

function buildPrompt(teamA, teamB, stage) {
  return `You are a football betting analyst. Estimate win probabilities for this upcoming FIFA World Cup 2026 match:

Match: ${teamA} vs ${teamB}
Stage: ${STAGE_LABEL[stage] ?? stage}

Consider:
- Current form (2025-2026 season)
- FIFA rankings
- Head-to-head history
- Squad quality

Provide probabilities (0-100, summing to 100) for:
- team_a: ${teamA} wins in regular 90 min
- draw: match ends in a draw after 90 min
- team_b: ${teamB} wins in regular 90 min

For knockout stages, "draw" means score level after 90 min (would go to ET/pens).`
}

function normalize(odds) {
  const total = odds.team_a + odds.draw + odds.team_b
  if (total === 0) return { team_a: 33, draw: 34, team_b: 33 }
  return {
    team_a: Math.round((odds.team_a / total) * 100),
    draw:   Math.round((odds.draw   / total) * 100),
    team_b: Math.round((odds.team_b / total) * 100),
  }
}

async function main() {
  console.log('🎲 Computing match odds with Gemini...\n')

  if (!GEMINI_API_KEY) {
    console.error('❌ GEMINI_API_KEY missing from .env.local')
    process.exit(1)
  }

  const staleCutoff = new Date(Date.now() - STALE_DAYS * 86400_000).toISOString()
  const now = new Date().toISOString()

  // Pull SCHEDULED matches with known teams, where odds are missing or stale
  const matches = await sb(
    `/matches?status=eq.SCHEDULED&start_time=gt.${now}` +
    `&team_a_id=not.is.null&team_b_id=not.is.null` +
    `&or=(odds_a.is.null,odds_updated_at.lt.${staleCutoff})` +
    `&select=id,stage,team_a:teams!team_a_id(name,name_he),team_b:teams!team_b_id(name,name_he)` +
    `&order=start_time.asc`
  )

  console.log(`📋 ${matches.length} matches needing odds`)
  if (matches.length === 0) {
    console.log('   All up to date — nothing to do.')
    return
  }

  let done = 0, failed = 0
  for (const m of matches) {
    const nameA = m.team_a?.name ?? '?'
    const nameB = m.team_b?.name ?? '?'
    process.stdout.write(`   ${nameA} vs ${nameB} ... `)

    try {
      const odds = normalize(await gemini(buildPrompt(nameA, nameB, m.stage)))
      await sb(`/matches?id=eq.${m.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          odds_a: odds.team_a,
          odds_draw: odds.draw,
          odds_b: odds.team_b,
          odds_source: 'gemini',
          odds_updated_at: new Date().toISOString(),
        }),
      })
      console.log(`${odds.team_a}/${odds.draw}/${odds.team_b}`)
      done++
    } catch (e) {
      console.log(`❌ ${e.message}`)
      failed++
    }

    // Gentle rate limit — Gemini free tier is ~15 RPM
    await new Promise(r => setTimeout(r, 4500))
  }

  console.log(`\n✅ Done. ${done} updated, ${failed} failed.\n`)
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

/**
 * Bootstrap script — fetches all WC 2026 teams + matches from football-data.org
 * and upserts them into Supabase.
 *
 * Run with:  node scripts/bootstrap.mjs
 *
 * Idempotent: safe to re-run; uses upsert on external_id.
 */

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
loadDotEnv(join(__dirname, '..', '.env.local'))

const FOOTBALL_API_KEY = process.env.FOOTBALL_API_KEY
const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY

if (!FOOTBALL_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing env vars. Check .env.local')
  process.exit(1)
}

const FB_BASE = 'https://api.football-data.org/v4'
const COMPETITION = 'WC'   // FIFA World Cup
const SEASON = 2026

// Hebrew translations for country names
const HE_NAMES = {
  'Argentina': 'ארגנטינה',
  'Australia': 'אוסטרליה',
  'Austria': 'אוסטריה',
  'Belgium': 'בלגיה',
  'Brazil': 'ברזיל',
  'Cameroon': 'קמרון',
  'Canada': 'קנדה',
  'Chile': 'צ׳ילה',
  'Colombia': 'קולומביה',
  'Costa Rica': 'קוסטה ריקה',
  'Croatia': 'קרואטיה',
  'Czech Republic': 'צ׳כיה',
  'Denmark': 'דנמרק',
  'Ecuador': 'אקוודור',
  'Egypt': 'מצרים',
  'England': 'אנגליה',
  'France': 'צרפת',
  'Germany': 'גרמניה',
  'Ghana': 'גאנה',
  'Iran': 'איראן',
  'Italy': 'איטליה',
  'Ivory Coast': 'חוף השנהב',
  'Japan': 'יפן',
  'Korea Republic': 'דרום קוריאה',
  'South Korea': 'דרום קוריאה',
  'Mexico': 'מקסיקו',
  'Morocco': 'מרוקו',
  'Netherlands': 'הולנד',
  'New Zealand': 'ניו זילנד',
  'Nigeria': 'ניגריה',
  'Norway': 'נורבגיה',
  'Paraguay': 'פרגוואי',
  'Peru': 'פרו',
  'Poland': 'פולין',
  'Portugal': 'פורטוגל',
  'Qatar': 'קטר',
  'Saudi Arabia': 'ערב הסעודית',
  'Scotland': 'סקוטלנד',
  'Senegal': 'סנגל',
  'Serbia': 'סרביה',
  'Spain': 'ספרד',
  'Sweden': 'שבדיה',
  'Switzerland': 'שוויץ',
  'Tunisia': 'תוניסיה',
  'Turkey': 'טורקיה',
  'United States': 'ארה״ב',
  'USA': 'ארה״ב',
  'Uruguay': 'אורוגוואי',
  'Wales': 'ויילס',
  'Algeria': 'אלג׳יריה',
  'Slovakia': 'סלובקיה',
  'Slovenia': 'סלובניה',
  'Hungary': 'הונגריה',
  'Romania': 'רומניה',
  'Greece': 'יוון',
  'Iceland': 'איסלנד',
  'Finland': 'פינלנד',
  'Ireland': 'אירלנד',
  'Northern Ireland': 'צפון אירלנד',
  'Ukraine': 'אוקראינה',
  'Russia': 'רוסיה',
  'Bosnia and Herzegovina': 'בוסניה והרצגובינה',
  'Albania': 'אלבניה',
  'Honduras': 'הונדורס',
  'Panama': 'פנמה',
  'Jamaica': 'ג׳מייקה',
  'Trinidad and Tobago': 'טרינידד וטובגו',
  'Bolivia': 'בוליביה',
  'Venezuela': 'ונצואלה',
  'South Africa': 'דרום אפריקה',
  'Mali': 'מאלי',
  'Congo': 'קונגו',
  'DR Congo': 'הרפובליקה הדמוקרטית של קונגו',
  'Burkina Faso': 'בורקינה פאסו',
  'Zambia': 'זמביה',
  'Uzbekistan': 'אוזבקיסטן',
  'Jordan': 'ירדן',
  'United Arab Emirates': 'איחוד האמירויות',
  'Iraq': 'עיראק',
  'China PR': 'סין',
  'China': 'סין',
  'Indonesia': 'אינדונזיה',
  'Thailand': 'תאילנד',
  'Curaçao': 'קוראסאו',
  'Haiti': 'האיטי',
  'New Caledonia': 'קלדוניה החדשה',
  'Cape Verde': 'כף ורדה',
  'Cabo Verde': 'כף ורדה',
  'Israel': 'ישראל',
}

// Map football-data.org stage codes → our DB enum
const STAGE_MAP = {
  'GROUP_STAGE':              'GROUP',
  'LAST_32':                  'R32',    // new for 2026 (48 teams)
  'PLAYOFFS':                 'R32',
  'LAST_16':                  'R16',
  'QUARTER_FINALS':           'QF',
  'SEMI_FINALS':              'SF',
  'THIRD_PLACE':              'SF',     // treat as semi-level
  'FINAL':                    'FINAL',
}

// Map football-data.org status → our DB enum
const STATUS_MAP = {
  'SCHEDULED':         'SCHEDULED',
  'TIMED':             'SCHEDULED',
  'IN_PLAY':           'IN_PLAY',
  'PAUSED':            'IN_PLAY',
  'HALF_TIME':         'IN_PLAY',
  'EXTRA_TIME':        'IN_PLAY',
  'PENALTY_SHOOTOUT':  'IN_PLAY',
  'FINISHED':          'FINISHED',
  'AWARDED':           'FINISHED',
  'POSTPONED':         'SCHEDULED',
  'SUSPENDED':         'SCHEDULED',
  'CANCELLED':         'SCHEDULED',
}

// === football-data.org client (with rate limit awareness) ===
async function fb(endpoint) {
  const url = `${FB_BASE}${endpoint}`
  const res = await fetch(url, {
    headers: { 'X-Auth-Token': FOOTBALL_API_KEY },
  })

  // Rate-limit handling
  const remaining = res.headers.get('X-Requests-Available-Minute')
  if (remaining !== null && parseInt(remaining) < 2) {
    console.log('   ⏸  Rate limit low, waiting 60s...')
    await new Promise(r => setTimeout(r, 60_000))
  }

  if (!res.ok) {
    const txt = await res.text()
    throw new Error(`football-data ${res.status}: ${txt}`)
  }
  return res.json()
}

// === Supabase REST client ===
async function sb(path, options = {}) {
  const url = `${SUPABASE_URL}/rest/v1${path}`
  const res = await fetch(url, {
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

// === Main flow ===
async function main() {
  console.log('🏆 Bootstrap WC 2026 — fetching from football-data.org\n')

  // 1. Fetch matches (this also gives us teams via the home/away nested objects)
  console.log('📥 Fetching matches...')
  const matchData = await fb(`/competitions/${COMPETITION}/matches?season=${SEASON}`)
  const apiMatches = matchData.matches ?? []
  console.log(`   ✓ ${apiMatches.length} matches received`)

  if (apiMatches.length === 0) {
    console.error('❌ No matches in API response. WC 2026 schedule may not be published yet.')
    console.log('   Response preview:', JSON.stringify(matchData).slice(0, 300))
    process.exit(1)
  }

  // 2. Collect unique teams from matches
  const teamMap = new Map()
  for (const m of apiMatches) {
    for (const t of [m.homeTeam, m.awayTeam]) {
      if (t?.id && !teamMap.has(t.id)) {
        teamMap.set(t.id, {
          external_id: t.id,
          name: t.name ?? t.shortName ?? `Team ${t.id}`,
          name_he: HE_NAMES[t.name] ?? null,
          crest_url: t.crest ?? null,
        })
      }
    }
  }
  console.log(`\n🇺🇳 Unique teams: ${teamMap.size}`)

  // 3. Upsert teams
  console.log('💾 Upserting teams to Supabase...')
  const teamsArray = [...teamMap.values()]
  const insertedTeams = await sb('/teams?on_conflict=external_id', {
    method: 'POST',
    body: JSON.stringify(teamsArray),
  })
  console.log(`   ✓ ${insertedTeams.length} teams stored`)

  // Build map external_id → uuid for matches
  const teamUuid = new Map()
  for (const t of insertedTeams) teamUuid.set(t.external_id, t.id)

  // 4. Prepare matches for upsert
  console.log('\n📅 Preparing matches...')
  const matchesArray = apiMatches.map(m => {
    const stage = STAGE_MAP[m.stage] ?? 'GROUP'
    const status = STATUS_MAP[m.status] ?? 'SCHEDULED'

    // winner: only meaningful when finished — use score.winner field
    let winnerId = null
    if (status === 'FINISHED' && m.score?.winner) {
      if (m.score.winner === 'HOME_TEAM') winnerId = teamUuid.get(m.homeTeam?.id) ?? null
      else if (m.score.winner === 'AWAY_TEAM') winnerId = teamUuid.get(m.awayTeam?.id) ?? null
    }

    return {
      external_id: m.id,
      team_a_id: m.homeTeam?.id ? teamUuid.get(m.homeTeam.id) : null,
      team_b_id: m.awayTeam?.id ? teamUuid.get(m.awayTeam.id) : null,
      start_time: m.utcDate,
      stage,
      status,
      score_a: m.score?.fullTime?.home ?? null,
      score_b: m.score?.fullTime?.away ?? null,
      winner_id: winnerId,
    }
  })

  console.log('💾 Upserting matches...')
  // Insert in batches of 100 to avoid huge payloads
  const BATCH = 100
  let totalInserted = 0
  for (let i = 0; i < matchesArray.length; i += BATCH) {
    const batch = matchesArray.slice(i, i + BATCH)
    const inserted = await sb('/matches?on_conflict=external_id', {
      method: 'POST',
      body: JSON.stringify(batch),
    })
    totalInserted += inserted.length
    process.stdout.write(`   ${totalInserted}/${matchesArray.length}\r`)
  }
  console.log(`\n   ✓ ${totalInserted} matches stored`)

  // Summary
  const byStage = matchesArray.reduce((acc, m) => {
    acc[m.stage] = (acc[m.stage] ?? 0) + 1
    return acc
  }, {})

  console.log('\n📊 Summary:')
  console.log(`   Teams:    ${teamsArray.length}`)
  console.log(`   Matches:  ${matchesArray.length}`)
  console.log(`   By stage: ${JSON.stringify(byStage)}`)

  const firstMatch = matchesArray.sort((a, b) => a.start_time.localeCompare(b.start_time))[0]
  if (firstMatch) {
    console.log(`   First kickoff: ${firstMatch.start_time}`)
  }

  console.log('\n✅ Done! Refresh the app to see matches.\n')
}

// === Minimal dotenv loader ===
function loadDotEnv(path) {
  try {
    const lines = readFileSync(path, 'utf8').split('\n')
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eq = trimmed.indexOf('=')
      if (eq < 0) continue
      const key = trimmed.slice(0, eq).trim()
      let val = trimmed.slice(eq + 1).trim()
      if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1)
      if (!process.env[key]) process.env[key] = val
    }
  } catch (e) {
    console.warn(`⚠️ Could not load ${path}: ${e.message}`)
  }
}

main().catch(err => {
  console.error('\n❌ Bootstrap failed:', err.message)
  process.exit(1)
})

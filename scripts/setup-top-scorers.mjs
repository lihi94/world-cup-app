/**
 * Seeds the top-20 most-likely top-scorer candidates into the `players`
 * table, so they show up in the Golden Bets dropdown.
 *
 * Run:  node scripts/setup-top-scorers.mjs
 * Idempotent: clears prior list and re-inserts.
 */

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
loadDotEnv(join(__dirname, '..', '.env.local'))

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY

// 20 reasonable top-scorer candidates. Order by rough betting-odds favoritism.
// `team` matches one of the team names already in our DB (English).
// If a team didn't qualify for WC 2026 the entry is silently skipped.
const CANDIDATES = [
  { name: 'Kylian Mbappé',    name_he: 'קיליאן אמבפה',     team: 'France' },
  { name: 'Harry Kane',       name_he: 'הארי קיין',         team: 'England' },
  { name: 'Erling Haaland',   name_he: 'ארלינג הולאנד',     team: 'Norway' },
  { name: 'Lionel Messi',     name_he: 'ליונל מסי',          team: 'Argentina' },
  { name: 'Vinícius Júnior',  name_he: 'ויניסיוס ג׳וניור',  team: 'Brazil' },
  { name: 'Lautaro Martínez', name_he: 'לאוטרו מרטינס',    team: 'Argentina' },
  { name: 'Cristiano Ronaldo',name_he: 'כריסטיאנו רונאלדו', team: 'Portugal' },
  { name: 'Jude Bellingham',  name_he: 'ג׳וד בלינגהאם',     team: 'England' },
  { name: 'Julián Álvarez',   name_he: 'חוליאן אלברס',     team: 'Argentina' },
  { name: 'Raphinha',         name_he: 'רפיניה',            team: 'Brazil' },
  { name: 'Bukayo Saka',      name_he: 'בוקאיו סאקה',       team: 'England' },
  { name: 'Phil Foden',       name_he: 'פיל פודן',           team: 'England' },
  { name: 'Antoine Griezmann',name_he: 'אנטואן גריזמן',     team: 'France' },
  { name: 'Romelu Lukaku',    name_he: 'רומלו לוקאקו',      team: 'Belgium' },
  { name: 'Robert Lewandowski', name_he: 'רוברט לבנדובסקי', team: 'Poland' },
  { name: 'Memphis Depay',    name_he: 'ממפיס דפאי',         team: 'Netherlands' },
  { name: 'Cody Gakpo',       name_he: 'קודי חאקפו',        team: 'Netherlands' },
  { name: 'Jamal Musiala',    name_he: 'ג׳מאל מוסיאלה',     team: 'Germany' },
  { name: 'Bruno Fernandes',  name_he: 'ברונו פרננדס',      team: 'Portugal' },
  { name: 'Rodrygo',          name_he: 'רודריגו',           team: 'Brazil' },
]

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

async function main() {
  console.log('👟 Seeding top-scorer candidates...\n')

  // 1. Fetch team UUIDs by name
  const teams = await sb('/teams?select=id,name')
  const teamByName = new Map(teams.map(t => [t.name.toLowerCase(), t.id]))
  console.log(`   📂 ${teams.length} teams loaded\n`)

  // 2. Resolve candidates to (name, name_he, team_id) rows
  const rows = []
  const skipped = []
  for (const c of CANDIDATES) {
    const teamId = teamByName.get(c.team.toLowerCase())
    if (!teamId) {
      skipped.push(`${c.name} (${c.team})`)
      continue
    }
    rows.push({
      name: c.name,
      name_he: c.name_he,
      team_id: teamId,
    })
  }

  console.log(`✅ ${rows.length} candidates matched`)
  if (skipped.length) {
    console.log(`⚠️  Skipped (team not in DB): ${skipped.join(', ')}`)
  }

  // 3. Wipe old players. First clear any golden_bets references so the
  //    FK doesn't block the delete.
  console.log('\n🗑   Clearing existing player references in golden_bets...')
  await sb('/golden_bets?top_scorer_id=not.is.null', {
    method: 'PATCH',
    body: JSON.stringify({ top_scorer_id: null }),
  })
  console.log('🗑   Deleting old players...')
  await sb('/players?id=not.is.null', { method: 'DELETE' })

  // 4. Insert fresh set
  console.log('💾  Inserting candidates...')
  const inserted = await sb('/players', {
    method: 'POST',
    body: JSON.stringify(rows),
  })
  console.log(`   ✓ ${inserted.length} players stored\n`)

  console.log('📋 Final list:')
  for (const r of rows) {
    const t = teams.find(t => t.id === r.team_id)
    console.log(`   • ${r.name_he}  (${r.name}, ${t?.name})`)
  }
  console.log('\n✅ Done. Open the Golden Bets page to see them.\n')
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

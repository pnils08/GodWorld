/**
 * bayTribuneRoster.js — canonical journalist roster adapter (S259 engine.35 Phase 2)
 *
 * Builds the byline candidate pool for engine-emergent story seeds from the LIVE
 * `Bay_Tribune_Oakland` sheet (the clean, POPID-linked Tribune journalist ledger,
 * NEW S105) instead of the embedded `utilities/rosterLookup.js` hardcode. Mike's
 * S259 steer: "we have a very clean Bay Tribune Oakland ledger … it's separate and
 * can be edited to fit any model as it's not tied to anything." This wires it.
 *
 * Why the ledger beats the embedded roster for SEED COVERAGE:
 *   - every journalist carries a canonical POPID → seed coverage is real attribution
 *     (a covering citizen), not a bare name string;
 *   - RoleType IS the beat → maps straight to story domains (Health Desk → HEALTH,
 *     Economics & Labor → ECONOMIC, Transit & Infrastructure → INFRASTRUCTURE …);
 *   - it's canonical + editable in-sheet — change the beat, change the routing.
 *
 * Output shape feeds `utilities/bylineEngine.scoreAllBylines_(seed, state)` directly:
 *   roster[name] = { desk, role, themes, popid, beat, beatDomain }
 * Theme profiles are enriched from rosterLookup by name-match where available
 * (22/31 overlap), else synthesized from the beat so the theme axis still scores.
 *
 * Pool excludes non-writers (masthead, photo). Sports writers are IN the writing
 * pool with beatDomain SPORTS (Mike-direct 2026-08-07: Paulson owns long-form /
 * interview depth, NOT M–F cron exclusion — crons are the life, including sports).
 * City-seed engine_audit patterns remain non-sports; sports seats still tag
 * lane:'sports' for desk-signal WHO-assist via LANE_BY_DOMAIN.
 *
 * Runtime: Node only (engine-auditor lane). Reads live sheet via lib/sheets.
 */

const { getRawSheetData } = require('../../lib/sheets');

let _rl = null;
function richThemesFor_(name) {
  if (_rl === null) {
    try { _rl = require('../../utilities/rosterLookup.js').getRoster_().journalists || {}; }
    catch (e) { _rl = {}; }
  }
  const j = _rl[name];
  return (j && Array.isArray(j.themes) && j.themes.length) ? { themes: j.themes, desk: j.desk || null, tone: j.tone || null } : null;
}

// ─────────────────────────────────────────────────────────────────────────────
// BEAT_RULES — ordered. First rule whose `match` (regex on RoleType) hits wins.
// `domain` is the deck/priority domain the beat covers; `themes` are synthesized
// fallback theme keywords for bylineEngine's theme axis when rosterLookup has no
// rich profile for that name. `exclude:true` drops the seat from the city-seed
// writing pool (masthead, photo desk, Paulson's sports domain).
// ─────────────────────────────────────────────────────────────────────────────
const BEAT_RULES = [
  { match: /editor-in-chief/i,                exclude: true,  reason: 'masthead' },
  { match: /copy chief/i,                     exclude: true,  reason: 'masthead/copy' },
  { match: /photographer|photo assistant/i,   exclude: true,  reason: 'photo desk' },
  // Sports writers (S336 lane tag; 2026-08-07 Mike-direct: INCLUDE in fanout).
  // Was exclude reason 'sports (Paulson domain)' — wrong for M–F crons. Paulson
  // gate is long-form interviews / depth, not daily wakes. Fan columnist,
  // beat, sideline, etc. route to SPORTS domain → sports fanout quota.
  { match: /\bA's\b|sideline|gridiron|\bsports\b|fan columnist|statistical support|speculative internet/i,
                                              domain: 'SPORTS',
                                              themes: ['sports', 'athletics', "a's", 'fan', 'roster', 'coliseum', 'standings'],
                                              lane: 'sports' },

  // Data Desk (S334) — Marbury's citywide seat. Matched narrowly on "data desk",
  // NOT /data analyst/, because Rhea Morgan is "Data Analyst / Copy Chief" and must
  // stay excluded by the copy-chief masthead rule above (first match wins, and that
  // rule sits earlier in this array — verify that ordering before editing either).
  // Cross-beat by nature, so GENERAL domain with data-shaped themes rather than a
  // single domain. Before S334 his RoleType read "…Statistical Support", which the
  // sports exclusion above matched verbatim — that string, not the rosterLookup desk
  // field, is why he was never routed in any cycle.
  { match: /data desk/i,                      domain: 'GENERAL',        themes: ['data', 'analysis', 'records', 'trends', 'verification'] },

  { match: /civic affairs/i,                  domain: 'CIVIC',          themes: ['council', 'initiative', 'policy', 'city hall', 'vote'] },
  { match: /civic.*opinion|opinion.*civic/i,  domain: 'CIVIC',          themes: ['opinion', 'civic', 'accountability', 'editorial'] },
  { match: /investigation/i,                  domain: 'CIVIC',          themes: ['investigation', 'accountability', 'records', 'oversight'] },
  { match: /accountability/i,                 domain: 'CIVIC',          themes: ['accountability', 'watchdog', 'gaps', 'contradiction'] },
  { match: /health/i,                         domain: 'HEALTH',         themes: ['health', 'medical', 'hospital', 'illness', 'care'] },
  { match: /public safety|safety|police/i,    domain: 'SAFETY',         themes: ['safety', 'crime', 'police', 'incident', 'response'] },
  { match: /econom|labor/i,                   domain: 'ECONOMIC',       themes: ['economy', 'jobs', 'labor', 'business', 'workforce'] },
  { match: /transit|infrastructure|infastructure/i, domain: 'INFRASTRUCTURE', themes: ['transit', 'infrastructure', 'construction', 'transportation'] },
  { match: /education/i,                       domain: 'EDUCATION',      themes: ['education', 'schools', 'students', 'youth'] },
  { match: /weather|environment/i,            domain: 'ENVIRONMENT',    themes: ['weather', 'environment', 'climate', 'green space'] },
  // UNDOCKED show beat (pipeline.60) — Nia Rook's solo recap seat. Matched
  // before the generic arts/entertainment rule so the show routes to its own
  // themes; her fanout desk is 'undocked' (own quota), not the culture rota.
  { match: /undocked/i,                       domain: 'CULTURE',        themes: ['undocked', 'show', 'pilots', 'episode', 'watch party', 'fandom'] },
  { match: /arts|entertainment|cultural lia/i, domain: 'CULTURE',       themes: ['arts', 'culture', 'entertainment', 'community'] },
  { match: /lifestyle|food|hospitality|social trends/i, domain: 'CULTURE', themes: ['lifestyle', 'food', 'community', 'trends', 'neighborhood'] },
  { match: /ethics|faith/i,                   domain: 'COMMUNITY',      themes: ['faith', 'ethics', 'community', 'values'] },
  { match: /historian/i,                      domain: 'GENERAL',        themes: ['history', 'legacy', 'retrospective', 'memory'] },
  { match: /wire reporter/i,                  domain: 'GENERAL',        themes: ['wire', 'breaking', 'general', 'roundup'] },
  { match: /field reporter|lead journalist/i, domain: 'GENERAL',        themes: ['general', 'reporting', 'neighborhood', 'community'] }
];

function classifyBeat_(roleType) {
  const rt = String(roleType || '');
  for (let i = 0; i < BEAT_RULES.length; i++) {
    if (BEAT_RULES[i].match.test(rt)) return BEAT_RULES[i];
  }
  // Unmatched → keep as GENERAL (forward-safe; a new beat string routes somewhere
  // rather than vanishing — silent-skip is the G-S6 failure class).
  return { domain: 'GENERAL', themes: ['general', 'reporting'], unmatched: true };
}

/**
 * Build the byline roster from the live Bay_Tribune_Oakland sheet.
 * @returns {Promise<{roster:Object, byPopid:Object, excluded:Array, included:Array}>}
 */
async function buildBylineRoster() {
  const data = await getRawSheetData('Bay_Tribune_Oakland');
  if (!data || data.length < 2) throw new Error('Bay_Tribune_Oakland empty or unreadable');

  const header = data[0].map((h) => String(h).trim());
  const iPop = header.indexOf('POPID');
  const iFirst = header.indexOf('First');
  const iLast = header.indexOf('Last');
  const iTier = header.indexOf('Tier');
  const iRole = header.indexOf('RoleType');
  if (iPop < 0 || iFirst < 0 || iLast < 0 || iRole < 0) {
    throw new Error('Bay_Tribune_Oakland header missing expected columns: ' + header.join(','));
  }

  const roster = {};
  const byPopid = {};
  const included = [];
  const excluded = [];

  for (let r = 1; r < data.length; r++) {
    const row = data[r];
    const popid = String(row[iPop] || '').trim();
    const name = (String(row[iFirst] || '').trim() + ' ' + String(row[iLast] || '').trim()).replace(/\s+/g, ' ').trim();
    const roleType = String(row[iRole] || '').trim();
    const tier = String(row[iTier] || '').trim();
    if (!name || !popid) continue;

    const beat = classifyBeat_(roleType);
    if (beat.exclude) {
      const ex = { name, popid, roleType, reason: beat.reason };
      if (beat.lane) ex.lane = beat.lane; // S336 W5h2 — sports seats carry their desk lane
      excluded.push(ex);
      continue;
    }

    const rich = richThemesFor_(name);
    roster[name] = {
      desk: (rich && rich.desk) || beat.domain.toLowerCase(),
      role: roleType,
      tone: (rich && rich.tone) || null,
      themes: (rich && rich.themes) || beat.themes,
      popid: popid,
      tier: tier,
      beat: roleType,
      beatDomain: beat.domain,
      themeSource: rich ? 'rosterLookup' : 'synthesized'
    };
    byPopid[popid] = name;
    included.push({ name, popid, roleType, beatDomain: beat.domain, themeSource: roster[name].themeSource });
  }

  return { roster, byPopid, included, excluded };
}

// ─────────────────────────────────────────────────────────────────────────────
// S336 engine.76 W5h2 — desk-signal lane pools for the byline WHO-assist.
// beatDomain → desk_signal lane ('*' = eligible for any lane; the generals are
// the rotation's reach into never-routed staff). Lane names match
// emitDeskSignal's partition {civic, sports, culture, business} and
// REPORTER_DESK_INDEX.md routing (HEALTH/SAFETY/INFRASTRUCTURE → civic-desk,
// EDUCATION/ENVIRONMENT/COMMUNITY → culture-desk).
// ─────────────────────────────────────────────────────────────────────────────
const LANE_BY_DOMAIN = {
  CIVIC: 'civic',
  SAFETY: 'civic',
  HEALTH: 'civic',
  INFRASTRUCTURE: 'civic',
  ECONOMIC: 'business',
  CULTURE: 'culture',
  COMMUNITY: 'culture',
  EDUCATION: 'culture',
  ENVIRONMENT: 'culture',
  SPORTS: 'sports',
  GENERAL: '*'
};

/**
 * Per-lane byline candidate pools from the live roster.
 * @returns {Promise<{pools:Object, generals:Array, unmapped:Array}>}
 *   pools    — { civic:[{name,popid,beat}], sports:[…], culture:[…], business:[…] }
 *   generals — beat-agnostic writers eligible for any lane (beatDomain GENERAL)
 *   unmapped — non-writer seats (masthead/photo), listed with reason
 */
async function buildLanePools() {
  const { included, excluded } = await buildBylineRoster();
  const pools = { civic: [], sports: [], culture: [], business: [] };
  const generals = [];
  const unmapped = [];

  for (const j of included) {
    const lane = LANE_BY_DOMAIN[j.beatDomain];
    const entry = { name: j.name, popid: j.popid, beat: j.roleType };
    if (lane === '*') generals.push(entry);
    else if (pools[lane]) pools[lane].push(entry);
    else unmapped.push({ name: j.name, popid: j.popid, reason: 'no lane for domain ' + j.beatDomain });
  }
  for (const e of excluded) {
    if (e.lane && pools[e.lane]) pools[e.lane].push({ name: e.name, popid: e.popid, beat: e.roleType });
    else unmapped.push({ name: e.name, popid: e.popid, reason: e.reason });
  }
  return { pools, generals, unmapped };
}

module.exports = { buildBylineRoster, buildLanePools, classifyBeat_, BEAT_RULES, LANE_BY_DOMAIN };

// CLI smoke: `node scripts/engine-auditor/bayTribuneRoster.js`
if (require.main === module) {
  require('../../lib/env');
  buildBylineRoster().then(({ roster, included, excluded }) => {
    console.log('=== Bay_Tribune_Oakland byline pool ===');
    console.log('INCLUDED (' + included.length + ' writers):');
    included.forEach((j) => console.log('  ' + j.beatDomain.padEnd(14) + j.name.padEnd(20) + j.popid + '  [' + j.themeSource + ']  ' + j.roleType));
    console.log('EXCLUDED (' + excluded.length + '):');
    excluded.forEach((j) => console.log('  ' + j.reason.padEnd(24) + j.name.padEnd(20) + j.roleType));
    const domains = {};
    included.forEach((j) => { domains[j.beatDomain] = (domains[j.beatDomain] || 0) + 1; });
    console.log('domain coverage:', JSON.stringify(domains));
  }).catch((e) => { console.error('FAILED:', e.message); process.exit(1); });
}

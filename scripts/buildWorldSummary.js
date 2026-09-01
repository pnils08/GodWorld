#!/usr/bin/env node
/**
 * scripts/buildWorldSummary.js — deterministic world-summary writer.
 *
 * Pipeline.25 (S231 engine-sheet). Replaces the model-assembled /build-world-summary
 * skill body for the file-writing step. Reads sheets + engine_audit JSON,
 * emits output/world_summary_c{XX}.md with NO LLM in the writer loop.
 *
 * Closes G-S6 / G-S7 / G-PREP4 structurally:
 *  - sports rows render StoryAngle column VERBATIM (no paraphrasing, no fabrication)
 *  - drops "(Mike's entries verbatim)" header claim — replaced with literal column
 *    citation that names the actual source field
 *  - Civic Decisions section becomes a pointer to the city-hall production log
 *    (no LLM extraction)
 *  - Engine Review Findings renders structured pattern fields from engine_audit JSON
 *    (no editorial gloss like "Editorial pivot: this is buried good news")
 *
 * G-S17 (Kelley career-stat fabrication) closes by adjacency: the slate inflation
 * is sift-side discipline (pipeline.24 sift v2 reads canon roster for career stats),
 * not a world_summary content vector. This script ensures career stats never enter
 * world_summary in the first place — sports section emits per-row Stats column
 * verbatim, no per-citizen career-stat lookup.
 *
 * Usage:
 *   node scripts/buildWorldSummary.js <cycle> [--output <path>] [--dry-run]
 *
 * Determinism rules baked in:
 *  - Sentiment / RetailVitality / impactScore: round to 2 decimals
 *  - Neighborhood table sorted by RetailVitality desc, ties broken by name asc
 *  - Sports rows ordered by sheet appearance (top-to-bottom)
 *  - Approval table filtered to MAYOR-* + COUNCIL-D* rows, sorted by OfficeId
 *  - Missing engine_audit JSON: FAIL LOUD (non-zero exit)
 *  - Missing prior-cycle Riley_Digest: trend section degrades gracefully (notes gap)
 *  - Missing city-hall production log: Civic Decisions section says so explicitly
 */

'use strict';

require('/root/GodWorld/lib/env');
const fs = require('fs');
const path = require('path');
const sheets = require('/root/GodWorld/lib/sheets');
// W5h2 (S336 engine.76): roster lane pools for the byline WHO-assist
const { buildLanePools } = require('./engine-auditor/bayTribuneRoster');

const REPO_ROOT = path.resolve(__dirname, '..');
const SCRIPT_VERSION = '2.2.0';

// ============================================================================
// PURE HELPERS (testable without sheet access)
// ============================================================================

function round2(n) {
  if (n === '' || n === null || n === undefined) return null;
  const x = Number(n);
  if (!Number.isFinite(x)) return null;
  return Math.round(x * 100) / 100;
}

function fmtSentiment(n) {
  const r = round2(n);
  if (r === null) return '—';
  if (r === 0) return '0';
  return (r > 0 ? '+' : '') + r.toFixed(2);
}

function fmtNum(n, decimals = 2) {
  const x = Number(n);
  if (!Number.isFinite(x)) return '—';
  return x.toFixed(decimals);
}

// G-BWS6 (S246 ES-6): World_Population.totalPopulation carries accumulator drift
// (e.g. 375985.0135). Round to a whole-person integer with thousands separators
// for human display; the raw sheet cell keeps its precision (render-side fix per
// the gap — durable upstream Math.round is a separate phase03 follow-up).
function fmtPopulation(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return (n == null || n === '') ? '—' : String(n);
  return Math.round(x).toLocaleString('en-US');
}

function parseJsonField(s, fallback = null) {
  if (s === undefined || s === null || s === '') return fallback;
  if (typeof s !== 'string') return s;
  try { return JSON.parse(s); } catch (_e) { return fallback; }
}

function formatWeatherLine(weather) {
  if (!weather || typeof weather !== 'object') return '— (no weather data)';
  const parts = [];
  if (Number.isFinite(weather.temp)) parts.push(`${weather.temp}°F ${weather.type || 'unknown'}`);
  if (weather.windDirection && Number.isFinite(weather.windSpeed)) {
    parts.push(`${weather.windDirection} ${weather.windSpeed} mph`);
  }
  if (weather.frontState) parts.push(`${String(weather.frontState).toLowerCase()} (frontState ${weather.frontState})`);
  if (Number.isFinite(weather.humidity)) parts.push(`humidity ${weather.humidity}`);
  if (Number.isFinite(weather.visibility)) parts.push(`visibility ${weather.visibility}`);
  return parts.join(', ');
}

function sortNeighborhoods(rows) {
  return rows.slice().sort((a, b) => {
    const ra = Number(a.RetailVitality);
    const rb = Number(b.RetailVitality);
    const aValid = Number.isFinite(ra);
    const bValid = Number.isFinite(rb);
    if (aValid && bValid && ra !== rb) return rb - ra;
    if (aValid && !bValid) return -1;
    if (!aValid && bValid) return 1;
    return String(a.Neighborhood).localeCompare(String(b.Neighborhood));
  });
}

// G-BWS1 (S246 ES-6): include `recovering` seats, not just `active`. A
// recovering councilmember (D6 Elliott Crane, CRC) is a real seat — dropping it
// silently understated the faction split (5/2/2 vs the true 5/2/3) and hid a CRC
// vote from /sift orientation. Status is rendered per-row so recovering seats are
// visible-but-flagged. Vacant seats (no holder) stay excluded from the roster.
const ROSTER_STATUSES = ['active', 'recovering'];
function filterApprovalRows(allOffices) {
  return allOffices
    .filter(r => ROSTER_STATUSES.includes(r.Status))
    .filter(r => /^MAYOR-/.test(r.OfficeId) || /^COUNCIL-D/.test(r.OfficeId))
    .sort((a, b) => {
      // Mayor first, then council by district number
      if (a.OfficeId.startsWith('MAYOR-') && !b.OfficeId.startsWith('MAYOR-')) return -1;
      if (b.OfficeId.startsWith('MAYOR-') && !a.OfficeId.startsWith('MAYOR-')) return 1;
      return a.OfficeId.localeCompare(b.OfficeId);
    });
}

function classifyDelta(curr, prev) {
  if (curr == null || prev == null) return '—';
  const diff = Number(curr) - Number(prev);
  if (!Number.isFinite(diff)) return '—';
  if (Math.abs(diff) < 0.0001) return 'flat';
  return diff > 0 ? `+${round2(diff)}` : `${round2(diff)}`;
}

// ============================================================================
// SECTION EMITTERS
// ============================================================================

// The engine's S.sportsSeason is NOT a season — it is an atmosphere off-switch
// that happens to be spelled "off-season" (applySportsSeason.js:77 forces it
// whenever the feed HAS entries, so ~40 downstream files stop synthesizing
// playoff texture; the companion boolean sportsAtmosphereEnabled carries the
// same signal honestly). Printing that sentinel here told every reader of this
// document — including every citizen-voice prompt via lib/mags.loadWorldState —
// that there is no baseball, while the Sports section of the SAME file showed
// the A's two games from the end of the year. Read the real label off the feed
// rows this script already loads.
// PER TEAM, never one global string. Oakland runs two franchises on separate
// calendars — at C104 the A's are late-season while the Oaks are in preseason.
// A single world-wide "sports season" value is wrong for at least one of them
// by construction, which is how a sim built on sports ended up announcing that
// sports were not happening.
function realSeasonLabel_(sportsRows, cycle) {
  const byTeam = new Map();
  for (const r of sportsRows || []) {
    if (parseInt(r.Cycle, 10) !== cycle) continue;
    const team = String(r.TeamsUsed || '').trim();
    const type = String(r.SeasonType || '').trim();
    if (!team || !type) continue;
    // TeamsUsed can carry several teams on one row; the SeasonType applies to each.
    for (const t of team.split(/[,/]| and /).map(s => s.trim()).filter(Boolean)) {
      if (!byTeam.has(t)) byTeam.set(t, []);
      if (byTeam.get(t).indexOf(type) === -1) byTeam.get(t).push(type);
    }
  }
  if (byTeam.size === 0) return '';
  return [...byTeam.entries()]
    .map(([team, types]) => `${team} ${types.join('/')}`)
    .join(', '); // not ' | ' — the calendar line already uses | as its field divider
}

function emitHeader(cycle, rileyCurr, calendar, sportsRows) {
  const weather = parseJsonField(rileyCurr.Weather, {});
  const calRow = calendar.find(r => r && r.length >= 4 && r[0] && r[1]);
  const simYear = calRow ? calRow[0] : '—';
  const simMonth = calRow ? calRow[1] : '—';
  const simDay = calRow ? calRow[2] : '—';
  const season = calRow ? calRow[3] : '—';
  const holiday = calRow ? calRow[4] : 'none';

  const nightlife = parseJsonField(rileyCurr.NightLife, {});
  const sportsSeason = realSeasonLabel_(sportsRows, cycle)
    || nightlife.calendarContext?.sportsSeason || '—';
  const firstFriday = nightlife.calendarContext?.isFirstFriday ? 'true' : 'false';

  const lines = [
    `# World Summary — Cycle ${cycle}`,
    '',
    `**Season:** ${season} | **Weather:** ${formatWeatherLine(weather)}`,
    `**Cycle Weight:** ${rileyCurr.CycleWeight || '—'} | **Pattern:** ${rileyCurr.PatternFlag || '—'} | **Shock:** ${rileyCurr.ShockFlag || '—'} | **Civic Load:** ${rileyCurr.CivicLoad || '—'}`,
    `**Cycle Weight Reason:** ${rileyCurr.CycleWeightReason || '—'}`,
    `**Calendar context:** SimYear ${simYear}, Month ${simMonth}, Day ${simDay}, ${season}, holiday=${holiday} | Sports season: ${sportsSeason} | First Friday: ${firstFriday}`,
    '',
    '---',
    ''
  ];
  return lines;
}

// One-line world-state snapshot (S313). Stable `Snapshot:` prefix — /post-publish
// Step 2c greps this line out and ingests it as a standalone wd-snapshot memory
// (cheap "where are we now" anchor; full doc chunks stay under wd-summary).
function emitSnapshotLine(cycle, rileyCurr, worldPop, hospitalCensus) {
  const parts = [
    `Snapshot: Cycle ${cycle}`,
    `Pop ${fmtPopulation(worldPop.totalPopulation)}`,
    `Illness ${fmtNum(Number(worldPop.illnessRate) * 100, 1)}%`,
    `Employment ${fmtNum(Number(worldPop.employmentRate) * 100, 1)}%`,
    `Sentiment ${fmtSentiment(rileyCurr.CitySentiment)}`,
    `Weight ${rileyCurr.CycleWeight || '—'}`,
    `Pattern ${rileyCurr.PatternFlag || '—'}`,
    `Shock ${rileyCurr.ShockFlag || '—'}`,
    `Load ${rileyCurr.CivicLoad || '—'}`
  ];
  if (hospitalCensus) {
    parts.push(`Hospital ${hospitalCensus.inCare} in care (${hospitalCensus.loadPct}% load)`);
  }
  return parts.join(' | ');
}

// ── W1 compile-layer rebuild (S328, Mike-approved consumer-first design) ────
// WHAT MOVED — the Ripple_Ledger attribution digest. The compile layer never
// surfaced ripples (frozen at the ~engine.50 signal set while the engine
// reached .75); this is the one place every media reader (sift, desk-slice,
// deep-dispatch, city-hall-prep) inherits causeType attribution for free.
// Verbatim from the ledger, grouped by causeType, POPIDs/hood/magnitude on
// every line — an LLM lands on the chain in one grep.
function emitWhatMoved(rippleRows, cycle) {
  const rows = (rippleRows || []).filter(r => String(r.Cycle) === String(cycle));
  const lines = [`## What Moved (Ripple_Ledger, cycle ${cycle} — ${rows.length} ripples)`, ''];
  if (!rows.length) {
    lines.push('_No ripples recorded this cycle._', '');
    return lines;
  }
  const byType = {};
  for (const r of rows) {
    const t = r.CauseType || 'untyped';
    (byType[t] = byType[t] || []).push(r);
  }
  for (const [t, group] of Object.entries(byType).sort((a, b) => b[1].length - a[1].length)) {
    lines.push(`### ${t} (${group.length})`);
    for (const r of group) {
      const bits = [r.EffectType, r.CauseDetail, r.Neighborhood, `mag ${r.Magnitude}`];
      if (r.TargetIds && String(r.TargetIds).trim()) bits.push(`targets ${r.TargetIds}`);
      lines.push(`- ${bits.filter(Boolean).join(' | ')}`);
    }
    lines.push('');
  }
  return lines;
}

// WHO LIVED IT — the cycle's citizen milestones with POPIDs, straight from
// LifeHistory_Log (milestone tags only — composite texture tags carry '|'
// and stay in the log), plus household formations (incl. engine.73 solo
// establishments). Universal protagonism: names drive fates; the summary
// names them.
const WHO_LIVED_IT_TAGS = ['Promotion', 'Wedding', 'Birth', 'Death', 'Retirement',
  'Graduation', 'Health', 'Recovering', 'Stabilized', 'Relationship', 'Household'];
const WHO_LIVED_IT_CAP = 15; // per tag class — "+N more" past this

function emitWhoLivedIt(lhlRows, householdRows, cycle) {
  const lines = [`## Who Lived It (cycle ${cycle})`, ''];
  const byTag = {};
  for (const r of (lhlRows || [])) {
    if (String(r.Cycle) !== String(cycle)) continue;
    const tag = String(r.EventTag || '').trim();
    if (!WHO_LIVED_IT_TAGS.includes(tag)) continue;
    (byTag[tag] = byTag[tag] || []).push(r);
  }
  let any = false;
  for (const tag of WHO_LIVED_IT_TAGS) {
    const group = byTag[tag];
    if (!group || !group.length) continue;
    any = true;
    lines.push(`### ${tag} (${group.length})`);
    for (const r of group.slice(0, WHO_LIVED_IT_CAP)) {
      const hood = r.Neighborhood ? ` (${r.Neighborhood})` : '';
      lines.push(`- ${r.POPID} ${r.Name} — ${String(r.EventText || '').trim()}${hood}`);
    }
    if (group.length > WHO_LIVED_IT_CAP) lines.push(`- _+${group.length - WHO_LIVED_IT_CAP} more — LifeHistory_Log cycle ${cycle}, tag ${tag}_`);
    lines.push('');
  }
  const formed = (householdRows || []).filter(r => String(r.FormedCycle) === String(cycle));
  if (formed.length) {
    any = true;
    const t = {};
    formed.forEach(r => { t[r.HouseholdType] = (t[r.HouseholdType] || 0) + 1; });
    lines.push(`### Households formed (${formed.length}: ${Object.entries(t).map(([k, n]) => `${k} ${n}`).join(', ')})`);
    for (const r of formed.slice(0, WHO_LIVED_IT_CAP)) {
      lines.push(`- ${r.HouseholdId} | ${r.HouseholdType} | head ${r.HeadOfHousehold} | ${r.Neighborhood}`);
    }
    if (formed.length > WHO_LIVED_IT_CAP) lines.push(`- _+${formed.length - WHO_LIVED_IT_CAP} more — Household_Ledger FormedCycle ${cycle}_`);
    lines.push('');
  }
  if (!any) lines.push('_No citizen milestones recorded this cycle._', '');
  return lines;
}

function emitCityState(rileyCurr, worldPop, neighborhoodsC, prevRileyCount, hospitalCensus) {
  const nightlife = parseJsonField(rileyCurr.NightLife, {});
  const worldEvents = parseJsonField(rileyCurr.WorldEvents, []);
  const domainCounts = {};
  for (const ev of worldEvents) {
    const d = ev.domain || 'UNKNOWN';
    domainCounts[d] = (domainCounts[d] || 0) + 1;
  }
  const domainStr = Object.entries(domainCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([d, c]) => `${d} ${c}`)
    .join(', ');

  const seedDelta = prevRileyCount.storySeedCount != null
    ? ` (prior-cycle ${prevRileyCount.storySeedCount})`
    : '';
  const eventsDelta = prevRileyCount.eventsGenerated != null
    ? ` (prior-cycle ${prevRileyCount.eventsGenerated})`
    : '';

  const lines = [
    '## City State',
    '',
    `- **Population:** ${fmtPopulation(worldPop.totalPopulation)} | Illness rate ${fmtNum(Number(worldPop.illnessRate) * 100, 1)}% | Employment ${fmtNum(Number(worldPop.employmentRate) * 100, 1)}% | Economy ${worldPop.economy || '—'}${hospitalCensus ? ` | Hospital: ${hospitalCensus.inCare} in care (${hospitalCensus.loadPct}% load)` : ''}`,
    `- **Migration:** ${worldPop.migration || '—'} (MigrationDrift ${rileyCurr.MigrationDrift || '—'} this cycle)`,
    `- **Events generated:** ${rileyCurr.EventsGenerated || '—'}${eventsDelta} | **Citizens aged:** ${rileyCurr.CitizensAged || '—'} | **Intake processed:** ${rileyCurr.IntakeProcessed || '0'}`,
    `- **Story seed count:** ${rileyCurr.StorySeedCount || '—'}${seedDelta}`,
    `- **Traffic load:** ${fmtNum(nightlife.trafficLoad, 2)} | **Economic influence:** ${nightlife.economicInfluence || '—'}`,
    `- **Nightlife volume:** ${nightlife.volume ?? '—'} | **Vibe:** ${nightlife.vibe || '—'} | **Movement:** ${nightlife.movement || '—'}`,
    `- **City sentiment (Riley_Digest.CitySentiment):** ${fmtSentiment(rileyCurr.CitySentiment)}`,
    `- **Domain event counts (${worldEvents.length} total):** ${domainStr || '—'}`,
    '',
    `### Neighborhood snapshot (Neighborhood_Map cycle ${rileyCurr.Cycle})`,
    '',
    '| Neighborhood | Sentiment | RetailVitality | EventAttractiveness | CrimeIndex |',
    '|---|---:|---:|---:|---:|',
  ];
  for (const n of sortNeighborhoods(neighborhoodsC)) {
    lines.push(`| ${n.Neighborhood} | ${fmtSentiment(n.Sentiment)} | ${fmtNum(n.RetailVitality, 2)} | ${n.EventAttractiveness || '—'} | ${n.CrimeIndex || '—'} |`);
  }
  lines.push('');
  return lines;
}

function emitCivicDecisions(cycle) {
  // Unified one-true-cycle log (pipeline.32): civic decisions are the `## /city-hall`
  // section of production_log_c{XX}.md, not a separate production_log_city_hall file.
  // This skill runs before /city-hall in the chain, so the section is normally not yet
  // present — check section-presence, not mere file-existence (the file may be opened by
  // /city-hall-prep before /city-hall writes the section).
  const logPath = `output/production_log_c${cycle}.md`;
  const absPath = path.join(REPO_ROOT, logPath);
  const hasCivicSection = fs.existsSync(absPath)
    && fs.readFileSync(absPath, 'utf8').includes('## /city-hall');

  const lines = ['## Civic Decisions', ''];
  if (hasCivicSection) {
    lines.push(`Civic decisions for this cycle are in the **\`## /city-hall\`** section of **\`${logPath}\`** (produced by \`/city-hall\` at the civic terminal).`);
    lines.push('');
    lines.push('This section deliberately does not extract or summarize that log — sift consumes the civic section directly. Renaming/summarizing here risks the G-S6/G-S7-class fabrication that motivated the deterministic builder (pipeline.25).');
  } else {
    lines.push(`**No city-hall section for this cycle yet.** The \`## /city-hall\` section of \`${logPath}\` is not present (city-hall runs after this skill in the chain).`);
    lines.push('');
    lines.push('When city-hall runs, this section will point at its civic section. Sift should not attempt to derive civic decisions in its absence — fail loud upstream instead.');
  }
  lines.push('');
  return lines;
}

function emitSports(sportsRows, cycle) {
  const lines = [
    '## Sports (literal `Oakland_Sports_Feed.StoryAngle` column per row — current cycle + 2 prior)',
    ''
  ];

  const byCycle = new Map();
  for (const r of sportsRows) {
    const c = parseInt(r.Cycle, 10);
    if (!Number.isFinite(c)) continue;
    if (c < cycle - 2 || c > cycle) continue;
    if (!byCycle.has(c)) byCycle.set(c, []);
    byCycle.get(c).push(r);
  }

  for (let c = cycle; c >= cycle - 2; c--) {
    const rows = byCycle.get(c) || [];
    lines.push(`### C${c} (${rows.length} entries)`);
    lines.push('');
    for (const r of rows) {
      const teams = r.TeamsUsed || '—';
      const eventType = r.EventType || '—';
      const seasonType = r.SeasonType || '—';
      const names = r.NamesUsed || '—';
      const storyAngle = r.StoryAngle || '(no story angle on sheet row)';
      const notes = r.Notes || '';
      const stats = r.Stats || '';
      const record = r['Team Record'] || '—';
      const streak = r.Streak || '—';
      const mood = r.PlayerMood || '—';
      const sentiment = r.FanSentiment || '—';
      const neighborhood = r.HomeNeighborhood || '—';

      lines.push(`- **${teams} — ${eventType} (${seasonType}):** ${names}`);
      lines.push(`  - StoryAngle: ${storyAngle}`);
      if (notes) lines.push(`  - Notes: ${notes}`);
      if (stats) lines.push(`  - Stats: ${stats}`);
      lines.push(`  - Record ${record}, Streak ${streak}, Mood ${mood}, FanSentiment ${sentiment}, Neighborhood ${neighborhood}`);
    }
    lines.push('');
  }
  return lines;
}

function emitEveningTexture(rileyCurr) {
  const eveningMedia = parseJsonField(rileyCurr.EveningMedia, {});
  const eveningFood = parseJsonField(rileyCurr.EveningFood, {});
  const nightlife = parseJsonField(rileyCurr.NightLife, {});

  const restaurants = (eveningFood.restaurantDetails || []).map(r => `**${r.name}** (${r.neighborhood})`).join(', ') || '—';
  const fastFoodLine = (eveningFood.fastDetails || []).map(r => `**${r.name}** (${r.neighborhood})`).join(', ') || '—';
  const nightSpots = (nightlife.spotDetails || []).map(r => `**${r.name}** (${r.neighborhood})`).join(', ') || '—';
  const tvList = (eveningMedia.tv || []).map(s => `**${s}**`).join(', ') || '—';
  const moviesList = (eveningMedia.movies || []).map(s => `**${s}**`).join(', ') || '—';

  const lines = [
    `## Evening Texture (Riley_Digest cycle ${rileyCurr.Cycle})`,
    '',
    `- **Famous people spotted:** ${rileyCurr.FamousPeople || '—'}`,
    `- **Restaurants:** ${restaurants}`,
    `- **Fast food:** ${fastFoodLine}`,
    `- **Nightlife:** ${nightSpots}. Volume ${nightlife.volume ?? '—'}, vibe ${nightlife.vibe || '—'}, movement ${nightlife.movement || '—'}. Weather impact ${fmtNum(nightlife.weatherImpact, 2)}.`,
    `- **City events:** ${rileyCurr.CityEvents || '—'}`,
    `- **Evening media TV:** ${tvList}`,
    `- **Evening media movies:** ${moviesList}`,
    `- **Sports broadcast:** ${eveningMedia.sportsBroadcast || '—'}`,
    `- **Streaming trend:** ${eveningMedia.streaming || '—'}`,
    `- **Food trend:** ${eveningFood.trend || '—'}`,
    ''
  ];
  return lines;
}

function emitWorldEvents(rileyCurr) {
  const events = parseJsonField(rileyCurr.WorldEvents, []);
  const lines = [`## World Events (cycle ${rileyCurr.Cycle} — ${events.length} total)`, ''];

  const high = events.filter(e => e.severity === 'high');
  const med = events.filter(e => e.severity === 'medium');
  const low = events.filter(e => e.severity === 'low');

  function renderEvent(e) {
    const domain = e.domain || 'UNKNOWN';
    const sub = e.subdomain || e.subtype || '';
    const nbhd = e.neighborhood || '(no neighborhood)';
    const desc = e.description || `${domain} event`;
    const impact = e.impactScore != null ? ` (impactScore ${e.impactScore})` : '';
    return `- **${domain}${sub ? ' — ' + sub : ''} — ${nbhd}:** ${desc}${impact}`;
  }

  if (high.length) {
    lines.push('**High-severity:**');
    for (const e of high) lines.push(renderEvent(e));
    lines.push('');
  }
  if (med.length) {
    lines.push('**Medium-severity:**');
    for (const e of med) lines.push(renderEvent(e));
    lines.push('');
  }
  if (low.length) {
    lines.push('**Low-severity:**');
    for (const e of low) lines.push(renderEvent(e));
    lines.push('');
  }
  if (events.length === 0) {
    lines.push('_(no world events recorded for this cycle)_');
    lines.push('');
  }
  return lines;
}

// ES-3 (governance.46 T5): Chaos_Cars fired live from C100 (engine.11) but no
// read-side consumer ingested it — world summary, sift inputs, and anomaly
// greps all returned zero for "chaos". Engine-numbers table per the sift
// orientation contract (no narrative content).
function emitChaosCars(chaosAll, cycle) {
  const rows = (chaosAll || []).filter(r => String(r.CycleId) === String(cycle));
  const lines = [`## Chaos Events (Chaos_Cars, cycle ${cycle} — ${rows.length} total)`, ''];

  if (rows.length === 0) {
    lines.push('_(no chaos-car events recorded for this cycle)_');
    lines.push('');
    return lines;
  }

  lines.push('| Vehicle | Outcome | Target | Metric | Magnitude | Floor fired |');
  lines.push('|---|---|---|---|---|---|');
  for (const r of rows) {
    const target = `${r.TargetScope || '?'} ${r.TargetId || ''}`.trim() + (r.TargetTier ? ` (T${r.TargetTier})` : '');
    lines.push(`| ${r.VehicleType || '?'} | ${r.DiceOutcome || '?'} | ${target} | ${r.PrimaryMetric || '—'} | ${r.MetricMagnitude || '—'} | ${r.ConsequenceFloorFired || 'FALSE'} |`);
  }
  lines.push('');

  const seeds = rows.filter(r => (r.ChaosNarrativeSeed || '').trim());
  if (seeds.length) {
    lines.push('**Narrative seeds:**');
    for (const r of seeds) lines.push(`- ${r.VehicleType} → ${r.TargetId}: ${r.ChaosNarrativeSeed}`);
    lines.push('');
  }
  return lines;
}

function emitThreeCycleTrends(currRow, prev1Row, prev2Row) {
  const cycle = currRow.Cycle;
  const lines = [`## Three-Cycle Trends (C${cycle - 2}–C${cycle})`, ''];

  function trendLine(label, fieldName) {
    const c0 = currRow[fieldName];
    const c1 = prev1Row ? prev1Row[fieldName] : null;
    const c2 = prev2Row ? prev2Row[fieldName] : null;
    return `- **${label}:** C${cycle - 2} ${c2 ?? '—'} → C${cycle - 1} ${c1 ?? '—'} → C${cycle} ${c0 ?? '—'}`;
  }

  lines.push(trendLine('Cycle weight', 'CycleWeight'));
  lines.push(trendLine('Civic load', 'CivicLoad'));
  lines.push(trendLine('Pattern flag', 'PatternFlag'));
  lines.push(trendLine('Shock flag', 'ShockFlag'));
  lines.push(trendLine('Migration drift', 'MigrationDrift'));
  lines.push(trendLine('Events generated', 'EventsGenerated'));
  lines.push(trendLine('Story seed count', 'StorySeedCount'));
  lines.push(trendLine('City sentiment', 'CitySentiment'));

  if (!prev1Row || !prev2Row) {
    lines.push('');
    lines.push('_Some prior-cycle Riley_Digest rows missing — degraded comparison above._');
  }
  lines.push('');
  return lines;
}

function emitEngineReviewFindings(cycle, auditJson) {
  const lines = [`## Engine Review Findings (from \`output/engine_audit_c${cycle}.json\`)`, ''];

  const summary = auditJson.summary || {};
  // G-BWS5 (S246 ES-6): the severity total counts ALL patterns (improvement +
  // incoherence patterns carry severities too), so "Ailment total N | Improvements
  // X | Incoherence Y" read ambiguously — does N include X+Y or not? It does.
  // Rename to "Total patterns" and split By-type into the same trichotomy with
  // subtotals so a reader of world_summary alone can reconcile (ailments +
  // improvements + incoherence = total).
  const totalPatterns = (summary.highSeverity || 0) + (summary.mediumSeverity || 0) + (summary.lowSeverity || 0);
  lines.push(`**Total patterns:** ${totalPatterns} (${summary.highSeverity || 0} high, ${summary.mediumSeverity || 0} medium, ${summary.lowSeverity || 0} low)`);
  lines.push('');

  if (summary.byType) {
    const entries = Object.entries(summary.byType).sort((a, b) => b[1] - a[1]);
    const fmt = arr => arr.map(([t, n]) => `${t} ${n}`).join(', ');
    const sum = arr => arr.reduce((s, [, n]) => s + n, 0);
    const improvements = entries.filter(([t]) => t === 'improvement');
    const incoherence = entries.filter(([t]) => t === 'incoherence');
    const ailments = entries.filter(([t]) => t !== 'improvement' && t !== 'incoherence');
    lines.push(`**Ailments (${sum(ailments)}):** ${fmt(ailments) || '—'}`);
    lines.push(`**Improvements (${sum(improvements)}):** ${fmt(improvements) || '—'}`);
    lines.push(`**Incoherence (${sum(incoherence)}):** ${fmt(incoherence) || '—'}`);
    lines.push('');
  }

  const patterns = Array.isArray(auditJson.patterns) ? auditJson.patterns : [];
  const highSev = patterns.filter(p => p.severity === 'high');
  const medSev = patterns.filter(p => p.severity === 'medium');

  if (highSev.length) {
    lines.push('### High-Severity Patterns');
    lines.push('');
    for (const p of highSev) {
      lines.push(`**${p.type || 'unknown-type'}** — ${p.description || '(no description)'}`);
      if (p.cyclesInState != null) lines.push(`- cyclesInState: ${p.cyclesInState}`);
      const inits = p.affectedEntities?.initiatives || [];
      const nbhds = p.affectedEntities?.neighborhoods || [];
      if (inits.length) lines.push(`- Initiatives: ${inits.join(', ')}`);
      if (nbhds.length) lines.push(`- Neighborhoods: ${nbhds.join(', ')}`);
      const m = p.mitigatorState;
      if (m && Array.isArray(m.mitigators) && m.mitigators.length) {
        for (const mit of m.mitigators) {
          const fld = mit.effectEvidence?.expectedField || '—';
          const obs = mit.effectEvidence?.observedDelta;
          const verdict = mit.effectEvidence?.verdict || '—';
          lines.push(`- Mitigator ${mit.initiativeId || ''} phase=${mit.implementationPhase || '—'} effectsFiring=${mit.effectsFiring} field=${fld} observedDelta=${obs} verdict=${verdict}`);
        }
      }
      if (p.evidence?.sheet) {
        lines.push(`- Evidence: ${p.evidence.sheet} row(s) ${(p.evidence.rows || []).join(',')}`);
      }
      lines.push('');
    }
  }

  if (medSev.length) {
    lines.push(`### Medium-Severity Patterns (${medSev.length})`);
    lines.push('');
    const typeCounts = {};
    for (const p of medSev) {
      const t = p.type || 'unknown';
      typeCounts[t] = (typeCounts[t] || 0) + 1;
    }
    lines.push('| Type | Count |');
    lines.push('|---|---:|');
    for (const [t, n] of Object.entries(typeCounts).sort((a, b) => b[1] - a[1])) {
      lines.push(`| ${t} | ${n} |`);
    }
    lines.push('');
    lines.push('_(Medium-severity patterns rendered as type-count table. For per-pattern detail consult `output/engine_review_c' + cycle + '.md` — that file is the LLM-assembled review and may carry editorial gloss not present in the source JSON.)_');
    lines.push('');
  }

  return lines;
}

// Normalize a stored Approval to a common 0-100 point scale. Approval is stored
// 0-1 or 0-100 depending on cycle/store; the live sheet and audit snapshots were
// both 0-100 empirically at S249, but per-value normalize is defense for a future
// scale migration so a delta never subtracts 0.62 − 62 and emits plausible garbage.
// SYNC: keep the >1.5 boundary in lockstep with the approval-flip scale heuristic
// in scripts/engine-auditor/detectAnomalies.js.
function normApprovalPts(v) {
  const n = parseFloat(v);
  if (!Number.isFinite(n)) return null;
  return Math.abs(n) > 1.5 ? n : n * 100;
}

// Prior-cycle (cycle-1) Mayor/Council approvals from the engine_audit snapshot —
// the same source detectAnomalies trusts. Returns a not-present marker when the
// prior audit is missing so emitApprovalRatings degrades gracefully (no fabricated
// deltas) rather than failing the build. (G-PREP7, civic.13.)
function loadPriorApprovals(cycle) {
  const priorCycle = cycle - 1;
  const p = path.join(REPO_ROOT, `output/engine_audit_c${priorCycle}.json`);
  if (!fs.existsSync(p)) return { present: false, priorCycle, map: new Map() };
  let snap = null;
  try {
    const j = JSON.parse(fs.readFileSync(p, 'utf-8'));
    snap = j && j.snapshots && j.snapshots.Civic_Office_Ledger;
  } catch (_) { snap = null; }
  if (!Array.isArray(snap)) return { present: false, priorCycle, map: new Map() };
  const map = new Map();
  for (const r of snap) {
    if (!r.OfficeId || !/^(MAYOR|COUNCIL-D)/.test(r.OfficeId)) continue;
    map.set(r.OfficeId, { approval: r.Approval, holder: r.Holder });
  }
  return { present: map.size > 0, priorCycle, map };
}

// Signed point-delta cell for one office vs prior cycle. Raw signed number only —
// the >5pt escalation judgment (S215 G-6) is the operator's, not the builder's;
// baking a threshold here is the fabrication-adjacent move the no-LLM ethos rejects.
// Guards: prior absent, office not in prior, holder changed (would compare two
// different people — annotate, don't mislead), non-numeric either side.
function approvalDeltaCell(r, prior) {
  if (!prior || !prior.present) return '—';
  const prev = prior.map.get(r.OfficeId);
  if (!prev) return '—';
  if ((prev.holder || '') !== (r.Holder || '')) return '— *(new holder)*';
  const a1 = normApprovalPts(r.Approval);
  const a0 = normApprovalPts(prev.approval);
  if (a1 == null || a0 == null) return '—';
  const d = Math.round(a1 - a0);
  return d > 0 ? `+${d}` : `${d}`;
}

function emitApprovalRatings(approvalRows, prior) {
  const p = prior || { present: false, priorCycle: null, map: new Map() };
  const deltaHead = p.priorCycle ? `Δ vs C${p.priorCycle}` : 'Δ vs prior';
  const lines = [
    '## Approval Ratings (Civic_Office_Ledger, Status ∈ {active, recovering}, Mayor + Council)',
    '',
    `_${deltaHead}: raw signed point delta from the prior-cycle engine_audit snapshot, surfaced for the S215 G-6 approval-shift gate. The column reports the number; the >5pt escalation call is the operator's, not the builder's._`,
    '',
    `| Office | Holder | Faction | Status | Approval | ${deltaHead} |`,
    '|---|---|---|---|---:|---:|'
  ];
  for (const r of approvalRows) {
    const office = r.Title || r.OfficeId;
    const districtTag = r.District && r.District !== 'citywide' ? ` (${r.District})` : '';
    // G-BWS1 — flag non-active seats so recovering members are visible.
    const statusTag = r.Status === 'active' ? 'active' : `**${r.Status || '—'}**`;
    lines.push(`| ${office}${districtTag} | ${r.Holder || '—'} | ${r.Faction || '—'} | ${statusTag} | ${r.Approval || '—'} | ${approvalDeltaCell(r, p)} |`);
  }
  lines.push('');
  if (!p.present) {
    lines.push(`_Prior-cycle approvals (\`engine_audit_c${p.priorCycle ?? '—'}.json\`) unavailable — deltas omitted; the approval-shift gate cannot compute from this summary this cycle._`);
    lines.push('');
  }

  const factionCount = {};
  for (const r of approvalRows) {
    const f = r.Faction || 'UNKNOWN';
    factionCount[f] = (factionCount[f] || 0) + 1;
  }
  const factionStr = Object.entries(factionCount).sort((a, b) => b[1] - a[1]).map(([f, n]) => `${n} ${f}`).join(' / ');
  const recovering = approvalRows.filter(r => r.Status === 'recovering');
  lines.push(`**Faction split (Mayor + Council, active + recovering):** ${factionStr}`);
  if (recovering.length > 0) {
    lines.push(`**Recovering seats:** ${recovering.map(r => `${r.OfficeId} ${r.Holder || ''} (${r.Faction || '—'})`).join('; ')}`);
  }
  lines.push('');
  return lines;
}

// ============================================================================
// DESK SIGNAL PARTITION (engine.76 W5 half 1, Mike S329)
// ============================================================================
// Sorts the cycle's signal by desk lane as POINTERS ONLY — feeds /desk-slice
// (fork path) and the research.25 Phase 2 daily writer-wakes. Locked charge
// rule: pointers + verbatim labels, never pre-assembled data. Engine assists
// WHO/WHERE-to-look, never WHAT — so sports entries carry teams/names but NOT
// StoryAngle (the desk reads the angle itself at the pointer), and no entry
// carries magnitudes or stats.
//
// Lane spec (ROLLOUT engine.76 row): civic=anomalies/votes/initiatives,
// sports=feed/roster deltas, culture=hoods/faith, business=ripples. Ripples
// route by CauseType (map below, verified against live c102 — 9 live types);
// unmapped types default to business.
//
// Ordering is deterministic: fixed lane order, fixed kind order per lane,
// source order (sheet appearance / patterns index) within kind.

const RIPPLE_LANE_MAP = {
  'initiative-implementation': 'civic',
  'approval-shift': 'civic',
  'sports': 'sports',
  'faith-event': 'culture',
  'fame-event': 'culture',
  'lifestyle-sighting': 'culture',
  'trajectory': 'business',
  'migration': 'business',
  'edition-coverage': 'business'
};
const RIPPLE_DEFAULT_LANE = 'business';
const DESK_SIGNAL_VERSION = '1.2';

// ── Open-thread lane (S407) ────────────────────────────────────────────────
// The reporter's INTAKE tail asks for a storyline slug and one of
// advanced/opened/closed/referenced (cron-desk-run.js), and the Saturday cron
// accumulates those slugs into Storyline_Ledger. Nothing ever read that tab
// back, so every writer met the cycle blind: a fresh slug each week, `closed`
// never used once across 23 threads, and no story with a way to end. This lane
// is the return path — the desk sees what is already running on its beat.
//
// SHOWING IS NOT VALIDATING. The 2026-08-05 anti-pigeonhole contract holds:
// slugs stay reporter-authored free-form kebab, checked against no list. A
// thread here is a continuation CANDIDATE, never a required key.
//
// Dormancy is derived here, never stored — the ledger tab deliberately carries
// no IsStale column (that is what rotted the retired Storyline_Tracker). The
// windows match the tracker's tuning so the semantics carry over: live under 5
// cycles since coverage, dormant 5–14, dropped at 15+.
const THREAD_DORMANT_AFTER = 5;
const THREAD_STALE_AFTER = 15;
const THREAD_LANE_CAP = 12;

// One-line label hygiene: single line, no table-breaking pipes doubled up.
function signalLabel(...bits) {
  return bits.filter(b => b !== null && b !== undefined && String(b).trim() !== '')
    .map(b => String(b).replace(/\s+/g, ' ').trim())
    .join(' | ');
}

// S361 — sports feed names arrive hand-typed ("Ernesto Quitero", "Isely Kelley")
// and were passed downstream as bare strings: the writer copied the typo, Rhea
// couldn't match it, and a correctly-reported real player killed the draft as an
// invented person. Worse, no POPID meant collectQuoteAsks had nothing to ask —
// the sports desk ran ZERO interviews on a lane made entirely of citizens.
// Resolve at entry: exact first, then a single-edit near-miss against the ledger
// (unique candidate only — an ambiguous near-miss stays unresolved and is noted).
// Semantics deliberately match the dashboard's sports write path
// (dashboard/sportsRoutes.js `resolveNames`): EXACT match or refuse. That path
// already rejects a bad row at entry — "NamesUsed does not resolve to an existing
// citizen" / "is ambiguous" — and captures the POPID. This is the read side of the
// same contract, not a second opinion: no fuzzy matching, no near-miss guessing.
// A name that does not resolve is surfaced as a note so the feed row gets fixed,
// which is the only place it CAN be fixed. (S361 first draft had an edit-distance
// matcher here — a fourth name-resolution implementation in this repo and the only
// one that invented an answer. Removed.)
// Adjacent transposition ("Isely"/"Isley") is ONE typing slip — Damerau, not plain
// Levenshtein, which scores it 2 and misses the most common feed typo.
function editDistance1_(a, b) {
  if (a === b) return true;
  const la = a.length, lb = b.length;
  if (la === lb) {
    for (let k = 0; k < la - 1; k++) {
      if (a[k] !== b[k] && a[k] === b[k + 1] && a[k + 1] === b[k] &&
          a.slice(0, k) === b.slice(0, k) && a.slice(k + 2) === b.slice(k + 2)) return true;
    }
  }
  if (Math.abs(la - lb) > 1) return false;
  let i = 0, j = 0, edits = 0;
  while (i < la && j < lb) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (++edits > 1) return false;
    if (la > lb) i++; else if (lb > la) j++; else { i++; j++; }
  }
  return edits + (la - i) + (lb - j) <= 1;
}

function resolveFeedNames_(namesUsed, notes, ctxLabel) {
  const empty = { popids: [], names: [] };
  const raw = String(namesUsed || '')
    .split(/[,;]/)
    .map(s => s.replace(/\([^)]*\)/g, '').replace(/\s+/g, ' ').trim())
    .filter(n => /^[A-Z]/.test(n) && n.split(' ').length >= 2);
  if (!raw.length) return empty;
  let resolver;
  try { resolver = require('./canon-name-check'); } catch (e) { return empty; }
  const where = ctxLabel ? ' [' + ctxLabel + ']' : '';
  const popids = [];
  const names = [];
  const seen = new Set();
  const add = (name, popid) => {
    if (!popid || seen.has(popid)) return;
    seen.add(popid);
    popids.push(popid);
    if (name) names.push(name);
  };
  const exact = resolver.resolveCitizens(raw);
  let index = null;
  for (let i = 0; i < exact.length; i++) {
    if (exact[i].popid) { add(exact[i].name, exact[i].popid); continue; }
    if (exact[i].ambiguous) {
      notes.push(`sports feed name "${raw[i]}" is AMBIGUOUS against the ledger — not resolved${where}`);
      continue;
    }
    // Legacy rows already carry typos the dashboard would now refuse. Rescue them
    // so the desk can still interview a real player, but say so loudly: a rescued
    // name is a feed row that needs fixing at source, not a silent pass.
    if (!index) {
      index = [];
      try { for (const n of resolver.loadCanonNames()) index.push(n); } catch (e) { index = []; }
    }
    const want = String(raw[i]).toLowerCase();
    const hits = index.filter(n => editDistance1_(String(n).toLowerCase(), want));
    if (hits.length === 1) {
      const back = resolver.resolveCitizens([hits[0]])[0];
      if (back && back.popid) {
        add(hits[0], back.popid);
        notes.push(`sports feed name "${raw[i]}" MISSPELLED — rescued to "${hits[0]}" (${back.popid}); fix the feed row${where}`);
        continue;
      }
    }
    notes.push(`sports feed name "${raw[i]}" does NOT resolve${hits.length > 1 ? ` (${hits.length} near-misses, ambiguous)` : ''} — desk cannot interview them${where}`);
  }
  return { popids, names };
}

function extractPopids(...sources) {
  const ids = new Set();
  for (const s of sources) {
    if (!s) continue;
    const text = Array.isArray(s) ? s.join(' ') : String(s);
    for (const m of text.match(/POP-\d{5}/g) || []) ids.add(m);
  }
  return [...ids].sort();
}

function rippleEntry(r, cycle) {
  const t = r.CauseType || 'untyped';
  const e = {
    kind: 'ripple',
    causeType: t,
    ref: `Ripple_Ledger cycle ${cycle} (CauseType ${t}); rendered: world_summary_c${cycle}.md "## What Moved" > "### ${t}"`,
    label: signalLabel(r.EffectType, r.CauseDetail)
  };
  if (r.Neighborhood) e.hood = String(r.Neighborhood).trim();
  const popids = extractPopids(r.TargetIds, r.CauseDetail);
  if (popids.length) e.popids = popids;
  return e;
}

// ─────────────────────────────────────────────────────────────────────────────
// W5 half 2 (S336 engine.76): per-lane byline candidate — the engine assists
// WHO writes, never WHAT (Mike-direct S329). Emits a name + POPID per lane;
// no angle, no story, no subject. Candidates draw from the Bay_Tribune_Oakland
// lane pools (bayTribuneRoster.buildLanePools), weighted down by recent use
// across the byline_shadow_log history so rotation reaches never-routed staff.
// ─────────────────────────────────────────────────────────────────────────────
const BYLINE_USAGE_WINDOW = 3;      // shadow logs consulted (cycles strictly before N)
const BYLINE_USAGE_PENALTY_CAP = 4; // capped — the uncapped penalty produced the C105 35/35 blank blackout (S329)
const BYLINE_BASE_BEAT = 2;         // lane's own beat writers
const BYLINE_BASE_GENERAL = 1;      // beat-agnostic generals, eligible in every lane

/** Recent-use tally from the last BYLINE_USAGE_WINDOW shadow logs before this
 *  cycle. finalAssignment only — a candidate the desk overrode was not used,
 *  so it carries no penalty. Fail-soft {} (missing dir / unreadable log). */
function loadBylineUsage(cycle, dir) {
  const usage = {};
  const logDir = dir || path.join(REPO_ROOT, 'output');
  let files = [];
  try { files = fs.readdirSync(logDir); } catch (e) { return usage; }
  const logs = files
    .map(f => { const m = f.match(/^byline_shadow_log_c(\d+)\.json$/); return m ? { f, c: parseInt(m[1], 10) } : null; })
    .filter(x => x && x.c < cycle)
    .sort((a, b) => b.c - a.c)
    .slice(0, BYLINE_USAGE_WINDOW);
  for (const { f } of logs) {
    try {
      const j = JSON.parse(fs.readFileSync(path.join(logDir, f), 'utf-8'));
      for (const e of j.entries || []) {
        const n = String(e.finalAssignment || '').trim();
        if (n) usage[n] = (usage[n] || 0) + 1;
      }
    } catch (e) { /* unreadable log — skip it, the tally degrades gracefully */ }
  }
  return usage;
}

/** Pure, deterministic: one candidate per lane. Score = beat/general base minus
 *  capped recent-use penalty; argmax always emits (no blank lanes while a pool
 *  has anyone) — ties break least-used then name. A name takes at most one lane
 *  per cycle (cross-lane spread; lane order fixed for determinism). */
function selectBylineCandidates(lanePools, usage) {
  if (!lanePools || !lanePools.pools) return null;
  const use = usage || {};
  const picked = {};
  const taken = {};
  for (const lane of ['civic', 'sports', 'culture', 'business']) {
    const scored = (lanePools.pools[lane] || []).map(j => ({ j, basis: 'beat' }))
      .concat((lanePools.generals || []).map(j => ({ j, basis: 'general' })))
      .filter(c => !taken[c.j.name])
      .map(c => ({
        name: c.j.name,
        popid: c.j.popid,
        basis: c.basis,
        recentUse: use[c.j.name] || 0,
        score: (c.basis === 'beat' ? BYLINE_BASE_BEAT : BYLINE_BASE_GENERAL)
          - Math.min(use[c.j.name] || 0, BYLINE_USAGE_PENALTY_CAP)
      }))
      .sort((a, b) => b.score - a.score || a.recentUse - b.recentUse || a.name.localeCompare(b.name));
    if (!scored.length) continue; // pool exhausted — caller notes the omission
    const top = scored[0];
    taken[top.name] = true;
    picked[lane] = { name: top.name, popid: top.popid, basis: top.basis, recentUse: top.recentUse };
  }
  return picked;
}

// A pattern's per-desk story handle, normalized for the lane (Phase 2.5 Task
// 2.5.1). generateTribuneFraming already writes angle + hookLine + the engine's
// own affected citizens per desk; this is the shape reporters read.
function handleEntry(h) {
  const out = {};
  const clean = s => String(s).replace(/\s+/g, ' ').trim();
  if (h.angle) out.angle = clean(h.angle);
  if (h.hookLine) out.hookLine = clean(h.hookLine);
  const cits = (Array.isArray(h.citizens) ? h.citizens : []).filter(Boolean).map(clean);
  if (cits.length) out.citizens = cits;
  return out;
}

// Pure: builds the desk-signal object from the same loaded cycle data the
// summary emitters consume. No sheet reads of its own.
// Pure: Storyline_Ledger rows -> per-lane open-thread entries. Rows carry the
// desk that filed them (`Desks`, a comma list written from the article sidecar),
// so routing is a direct lane match; an unrouted thread falls to civic rather
// than being dropped, on the same bug-is-event reachability rule the anomaly
// lane uses above. Closed threads and threads stale past THREAD_STALE_AFTER are
// omitted — a closed story is finished, and a 15-cycle silence is the honest
// reading that the retired tracker called `abandoned`.
function openThreadEntries(ledgerRows, cycle, lanes, notes) {
  const rows = Array.isArray(ledgerRows) ? ledgerRows : [];
  if (!rows.length) {
    notes.push('no Storyline_Ledger rows — open-thread entries omitted from every lane');
    return;
  }
  const num = v => { const n = parseInt(v, 10); return Number.isFinite(n) ? n : 0; };
  const staged = [];
  let unrouted = 0;
  for (const r of rows) {
    const slug = String(r.StorylineId || '').trim();
    if (!slug) continue;
    if (String(r.Status || '').trim().toLowerCase() === 'closed') continue;
    const last = num(r.LastCycle);
    const age = cycle - last;
    if (age >= THREAD_STALE_AFTER) continue;
    const desks = String(r.Desks || '').split(',').map(d => d.trim().toLowerCase()).filter(Boolean);
    let targets = desks.filter(d => Object.prototype.hasOwnProperty.call(lanes, d));
    if (!targets.length) { targets = ['civic']; unrouted++; }
    const hood = String(r.Hoods || '').trim();
    const popids = String(r.Citizens || '').split(',').map(x => x.trim()).filter(Boolean);
    const moves = signalLabel(
      num(r.Advanced) ? `advanced ${num(r.Advanced)}` : null,
      num(r.Opened) ? `opened ${num(r.Opened)}` : null,
      num(r.Referenced) ? `referenced ${num(r.Referenced)}` : null
    ).replace(/ \| /g, ', ');
    const entry = {
      kind: 'thread',
      slug,
      ref: `Storyline_Ledger (StorylineId ${slug})`,
      label: signalLabel(
        slug,
        `C${num(r.FirstCycle)}\u2192C${last}`,
        `${num(r.Articles)} article(s)`,
        moves || null,
        age >= THREAD_DORMANT_AFTER ? `DORMANT — ${age} cycle(s) since coverage` : null
      ),
      lastCycle: last,
      articles: num(r.Articles)
    };
    if (hood) entry.hood = hood;
    if (popids.length) entry.popids = popids;
    for (const t of targets) staged.push({ lane: t, entry, age });
  }
  // Freshest first, then most-covered — a thread the desk touched last cycle
  // outranks one it left three cycles ago.
  staged.sort((a, b) => a.age - b.age || b.entry.articles - a.entry.articles);
  const perLane = {};
  for (const s of staged) {
    perLane[s.lane] = (perLane[s.lane] || 0) + 1;
    if (perLane[s.lane] > THREAD_LANE_CAP) continue;
    lanes[s.lane].push(s.entry);
  }
  if (unrouted) notes.push(`${unrouted} Storyline_Ledger thread(s) carried no known desk — routed to civic`);
}

function emitDeskSignal(cycle, data) {
  // Degraded-input guards: never throw on missing pieces — emit what exists.
  const { auditJson = {}, rippleAll, sportsAll = [], neighborhoodsC = [], rileyCurr = {},
    storylineLedger = [] } = data;
  const notes = [];
  const lanes = { civic: [], sports: [], culture: [], business: [] };

  // ── civic: anomalies (every audit pattern — bug-is-event: they must be
  // reachable from some desk; /desk-slice curates cover-as-story placement) ──
  const patterns = Array.isArray(auditJson.patterns) ? auditJson.patterns : [];
  patterns.forEach((p, i) => {
    const ev = p.evidence || {};
    const ref = `output/engine_audit_c${cycle}.json patterns[${i}]`
      + (ev.sheet ? `; evidence: ${ev.sheet} row(s) ${(ev.rows || []).join(',')}` : '');
    const ae = p.affectedEntities || {};
    const popids = extractPopids(ae.citizens);
    const hood = (Array.isArray(ae.neighborhoods) && ae.neighborhoods.length)
      ? ae.neighborhoods.join(', ') : null;
    const handles = (p.tribuneFraming || {}).storyHandles || {};

    const entry = {
      kind: 'anomaly',
      ref,
      label: signalLabel(`${p.type || 'unknown-type'} (${p.severity || '—'})`, p.description)
    };
    if (popids.length) entry.popids = popids;
    if (hood) entry.hood = hood;
    if (handles.civic) entry.handle = handleEntry(handles.civic);
    lanes.civic.push(entry);

    // Task 2.5.1: a pattern reaches business/culture/sports only where the
    // engine framed an angle for that desk. Civic keeps every pattern above
    // (bug-is-event reachability); these are additive, so no lane loses rows.
    for (const desk of ['business', 'culture', 'sports']) {
      const h = handles[desk];
      if (!h || !(h.angle || h.hookLine)) continue;
      const deskEntry = {
        kind: 'anomaly',
        ref,
        label: signalLabel(h.angle, h.hookLine),
        handle: handleEntry(h)
      };
      const handlePopids = extractPopids(h.citizens);
      const carried = handlePopids.length ? handlePopids : popids;
      if (carried.length) deskEntry.popids = carried;
      if (hood) deskEntry.hood = hood;
      lanes[desk].push(deskEntry);
    }
  });

  // ── civic: initiatives + votes (audit snapshot — same-cycle, zero extra reads) ──
  const snapIT = auditJson.snapshots && auditJson.snapshots.Initiative_Tracker;
  const initiatives = Array.isArray(snapIT) ? snapIT : [];
  if (!initiatives.length) notes.push('no Initiative_Tracker snapshot in engine_audit — initiative/vote entries omitted');
  for (const it of initiatives) {
    lanes.civic.push({
      kind: 'initiative',
      ref: `Initiative_Tracker (InitiativeID ${it.InitiativeID}); snapshot: engine_audit_c${cycle}.json snapshots.Initiative_Tracker`,
      label: signalLabel(it.Name, `Status ${it.Status || '—'}`, it.ImplementationPhase ? `phase ${it.ImplementationPhase}` : null),
      hood: it.AffectedNeighborhoods || undefined
    });
    // Upcoming action = vote signal. Cycle indices are pointers, not figures.
    const nextCycle = parseInt(it.NextActionCycle, 10);
    const voteCycle = parseInt(it.VoteCycle, 10);
    const overrideCycle = parseInt(it.OverrideVoteCycle, 10);
    const pending = [
      Number.isFinite(nextCycle) && nextCycle >= cycle ? `${it.NextScheduledAction || 'next action'} C${nextCycle}` : null,
      Number.isFinite(voteCycle) && voteCycle >= cycle ? `vote C${voteCycle}` : null,
      Number.isFinite(overrideCycle) && overrideCycle >= cycle ? `override vote C${overrideCycle}` : null
    ].filter(Boolean);
    if (pending.length) {
      lanes.civic.push({
        kind: 'vote',
        ref: `Initiative_Tracker (InitiativeID ${it.InitiativeID})`,
        label: signalLabel(it.Name, pending.join('; '))
      });
    }
  }

  // ── civic: city-hall log pointer (section written AFTER this build) ──
  lanes.civic.push({
    kind: 'civic-log',
    ref: `output/production_log_c${cycle}.md "## /city-hall"`,
    label: 'Council decisions, votes, voices — written by /city-hall after this build; read at consume time'
  });

  // ── sports: feed rows, current cycle. NO StoryAngle — WHAT stays desk-side. ──
  for (const r of sportsAll) {
    if (String(r.Cycle) !== String(cycle)) continue;
    // engine.125: label names from the resolved set only. Raw NamesUsed
    // shipped unresolved strings onto the sports desk with no POPID — writers
    // copied them and Rhea killed the draft as invented people.
    const resolved = resolveFeedNames_(r.NamesUsed, notes, `${r.TeamsUsed || 'sports'} C${cycle}`);
    const feedEntry = {
      kind: 'feed',
      ref: `Oakland_Sports_Feed cycle ${cycle}; rendered: world_summary_c${cycle}.md "## Sports" C${cycle} (StoryAngle at the pointer)`,
      label: signalLabel(r.TeamsUsed, r.EventType, r.SeasonType ? `(${r.SeasonType})` : null, resolved.names.length ? resolved.names.join(', ') : null)
    };
    if (resolved.popids.length) feedEntry.popids = resolved.popids;
    lanes.sports.push(feedEntry);
  }

  // ── culture: hoods with world-event signal this cycle + texture index ──
  // Texture file is produced at run-cycle Step 5.5, AFTER this Step 5 build —
  // pointers name the promised path; /desk-slice and writer-wakes run later.
  const texturePath = `output/neighborhood_texture_c${cycle}.md`;
  if (!fs.existsSync(path.join(REPO_ROOT, texturePath))) {
    notes.push(`${texturePath} not present at build time (produced at Step 5.5) — hood refs are forward pointers`);
  }
  const worldEvents = parseJsonField(rileyCurr.WorldEvents, []);
  const evByHood = {};
  for (const ev of Array.isArray(worldEvents) ? worldEvents : []) {
    const h = ev && ev.neighborhood;
    if (h) evByHood[h] = (evByHood[h] || 0) + 1;
  }
  for (const h of Object.keys(evByHood).sort()) {
    lanes.culture.push({
      kind: 'hood',
      ref: `${texturePath} "### ${h}"; events: world_summary_c${cycle}.md "## World Events"`,
      label: signalLabel(h, `${evByHood[h]} world event(s) this cycle`),
      hood: h
    });
  }
  lanes.culture.push({
    kind: 'hood-index',
    ref: `${texturePath}`,
    label: `Per-hood texture blocks, all ${neighborhoodsC.length} neighborhoods (quiet hoods carry a quiet-week line)`
  });
  lanes.culture.push({
    kind: 'evening',
    ref: `output/world_summary_c${cycle}.md "## Evening Texture"`,
    label: 'Named venues that moved — restaurants, fast food, nightlife spots, city events, media'
  });
  lanes.culture.push({
    kind: 'milestones',
    ref: `output/world_summary_c${cycle}.md "## Who Lived It"; source: LifeHistory_Log cycle ${cycle}`,
    label: 'Citizen milestones with POPIDs — weddings, births, graduations, retirements, households formed'
  });
  lanes.culture.push({
    kind: 'faith-registry',
    ref: 'Faith_Organizations tab (LeaderPOPID-linked)',
    label: 'Faith org registry — congregations, leaders, neighborhood, character'
  });

  // ── ripples: route by CauseType; unmapped → business (the row's default lane) ──
  const cycleRipples = (rippleAll || []).filter(r => String(r.Cycle) === String(cycle));
  for (const r of cycleRipples) {
    // hasOwnProperty guard: a CauseType like "toString" must not resolve an
    // inherited Object.prototype member as the lane name.
    const lane = Object.prototype.hasOwnProperty.call(RIPPLE_LANE_MAP, r.CauseType)
      ? RIPPLE_LANE_MAP[r.CauseType]
      : RIPPLE_DEFAULT_LANE;
    lanes[lane].push(rippleEntry(r, cycle));
  }
  if (!cycleRipples.length) notes.push('no Ripple_Ledger rows this cycle — ripple entries empty across lanes');

  // ── open threads: what is already running on this desk's beat ──
  openThreadEntries(storylineLedger, cycle, lanes, notes);

  // Drop undefined optional fields for a clean artifact.
  for (const lane of Object.keys(lanes)) {
    lanes[lane] = lanes[lane].map(e => {
      const clean = {};
      for (const [k, v] of Object.entries(e)) if (v !== undefined) clean[k] = v;
      return clean;
    });
  }

  // ── W5h2: per-lane byline candidate (WHO-assist, name + POPID only) ──
  let bylineCandidates = null;
  if (data.bylinePools) {
    bylineCandidates = selectBylineCandidates(data.bylinePools, data.bylineUsage);
    const missing = Object.keys(lanes).filter(l => !bylineCandidates || !bylineCandidates[l]);
    if (missing.length) notes.push('byline candidate pool exhausted for lane(s): ' + missing.join(', '));
  } else {
    notes.push('Bay_Tribune_Oakland roster unavailable — byline candidates omitted');
  }

  return {
    meta: {
      cycle,
      script: `buildWorldSummary.js v${SCRIPT_VERSION} (deskSignal v${DESK_SIGNAL_VERSION})`,
      builtAt: new Date().toISOString(),
      laneRule: 'civic=anomalies/votes/initiatives, sports=feed, culture=hoods/faith, business=ripples-default; ripples route by CauseType (rippleLaneMap); threads route by Storyline_Ledger.Desks',
      threadContract: 'kind:"thread" entries are OPEN STORYLINES from Storyline_Ledger — continuation CANDIDATES, not a controlled vocabulary. Reuse the slug verbatim to advance or close a thread; mint a new one freely when the piece is new. Counts are verbatim ledger columns; dormancy is derived from LastCycle age and never stored.',
      rippleLaneMap: RIPPLE_LANE_MAP,
      counts: Object.fromEntries(Object.entries(lanes).map(([k, v]) => [k, v.length])),
      contract: 'POINTERS ONLY — labels are verbatim source strings (they may embed source-native deltas); no derived stats, no career numbers, no angles. The desk reaches the raw material itself.',
      bylineContract: 'bylineCandidates is a WHO-assist HINT — one name + POPID per lane, usage-rotated off the Bay_Tribune_Oakland roster. The desk still assigns; no angle, no story, no subject rides here (engine.76 W5h2 locked rule).',
      notes
    },
    lanes,
    ...(bylineCandidates ? { bylineCandidates } : {})
  };
}

function emitFooter(cycle) {
  return [
    '---',
    '',
    `_Generated by \`scripts/buildWorldSummary.js\` v${SCRIPT_VERSION} from Riley_Digest + Ripple_Ledger + LifeHistory_Log + Household_Ledger + Oakland_Sports_Feed + Civic_Office_Ledger + Neighborhood_Map + World_Population + Simulation_Calendar + \`output/engine_audit_c${cycle}.json\` (+ \`engine_audit_c${cycle - 1}.json\` for approval deltas, optional). No LLM in the writer loop — all content is verbatim from named sources. Supermemory ingest deferred to \`/post-publish\`._`
  ];
}

// ============================================================================
// ORCHESTRATION
// ============================================================================

// Load everything the emitters (summary + desk signal) need, once. W5: split
// out of buildWorldSummary so main() can feed both artifacts from one pull.
async function loadCycleData(cycle) {
  if (!Number.isInteger(cycle) || cycle < 1) {
    throw new Error(`buildWorldSummary: cycle must be a positive integer, got ${cycle}`);
  }

  // Fail loud on missing engine_audit JSON
  const auditPath = path.join(REPO_ROOT, `output/engine_audit_c${cycle}.json`);
  if (!fs.existsSync(auditPath)) {
    throw new Error(`buildWorldSummary: engine_audit_c${cycle}.json not found at ${auditPath} — run /engine-review first`);
  }
  const auditJson = JSON.parse(fs.readFileSync(auditPath, 'utf-8'));

  // Pull sheets
  const [
    rileyAll,
    sportsAll,
    civicOfficesAll,
    neighborhoodsAll,
    worldPopAll,
    calendarAll,
    chaosAll,
    hospitalAll,
    rippleAll,
    lhlAll,
    householdAll,
    storylineLedger
  ] = await Promise.all([
    sheets.getSheetAsObjects('Riley_Digest'),
    sheets.getSheetAsObjects('Oakland_Sports_Feed'),
    sheets.getSheetAsObjects('Civic_Office_Ledger'),
    sheets.getSheetAsObjects('Neighborhood_Map'),
    sheets.getSheetAsObjects('World_Population'),
    sheets.getSheetData('Simulation_Calendar'),
    // ES-3: tolerate copies/sandboxes without the Chaos_Cars tab
    sheets.getSheetAsObjects('Chaos_Cars').catch(() => []),
    // engine.52 D2: Hospital_Ledger is lazy-created — tolerate absence
    sheets.getSheetAsObjects('Hospital_Ledger').catch(() => []),
    // W1 (S328): attribution + milestone sources — tolerant like the others
    sheets.getSheetAsObjects('Ripple_Ledger').catch(() => []),
    sheets.getSheetAsObjects('LifeHistory_Log').catch(() => []),
    sheets.getSheetAsObjects('Household_Ledger').catch(() => []),
    // S407: the newsroom's own open threads, read back into the desk signal.
    // Tolerant like the others — a bench without the tab still ships a signal.
    sheets.getSheetAsObjects('Storyline_Ledger').catch(() => [])
  ]);

  const rileyCurr = rileyAll.find(r => String(r.Cycle) === String(cycle));
  if (!rileyCurr) {
    throw new Error(`buildWorldSummary: no Riley_Digest row for cycle ${cycle}`);
  }
  const rileyPrev1 = rileyAll.find(r => String(r.Cycle) === String(cycle - 1));
  const rileyPrev2 = rileyAll.find(r => String(r.Cycle) === String(cycle - 2));

  const worldPopCurr = worldPopAll.find(r => String(r.cycle) === String(cycle))
    || worldPopAll[worldPopAll.length - 1]
    || {};

  const neighborhoodsC = neighborhoodsAll.filter(r => String(r.Cycle) === String(cycle));
  const approvalRows = filterApprovalRows(civicOfficesAll);
  const priorApprovals = loadPriorApprovals(cycle);

  // W5h2: byline WHO-assist inputs. Roster fetch is fail-soft (emitDeskSignal
  // notes the omission and the artifact still ships); usage tally is local fs.
  let bylinePools = null;
  try { bylinePools = await buildLanePools(); } catch (e) { /* roster unreachable — candidates omitted */ }
  const bylineUsage = loadBylineUsage(cycle);

  return {
    auditJson,
    rileyCurr, rileyPrev1, rileyPrev2,
    sportsAll, calendarAll, chaosAll, hospitalAll,
    rippleAll, lhlAll, householdAll, storylineLedger,
    worldPopCurr, neighborhoodsC, approvalRows, priorApprovals,
    bylinePools, bylineUsage
  };
}

async function buildWorldSummary(cycle, preloaded) {
  const data = preloaded || await loadCycleData(cycle);
  const {
    auditJson, rileyCurr, rileyPrev1, rileyPrev2,
    sportsAll, calendarAll, chaosAll, hospitalAll,
    rippleAll, lhlAll, householdAll,
    worldPopCurr, neighborhoodsC, approvalRows, priorApprovals
  } = data;

  // Build sections
  const out = [];
  out.push(...emitHeader(cycle, rileyCurr, calendarAll.slice(1), sportsAll));
  // engine.52 D2 — hospital census from open Hospital_Ledger rows (capacity 40,
  // matches persistHospitalLedger_); null when the tab is absent or empty.
  const hospitalOpen = hospitalAll.filter(r => r.POPID && String(r.DischargeCycle ?? '').trim() === '');
  const hospitalCensus = hospitalAll.length
    ? { inCare: hospitalOpen.length, loadPct: Math.round((hospitalOpen.length / 40) * 100) }
    : null;

  out.push(emitSnapshotLine(cycle, rileyCurr, worldPopCurr, hospitalCensus), '');
  out.push(...emitCityState(rileyCurr, worldPopCurr, neighborhoodsC, {
    storySeedCount: rileyPrev1?.StorySeedCount ?? null,
    eventsGenerated: rileyPrev1?.EventsGenerated ?? null
  }, hospitalCensus));
  // W1 (S328): media-priority sections — attribution + named milestones ride
  // directly under the city state, ahead of civic/sports.
  out.push(...emitWhatMoved(rippleAll, cycle));
  out.push(...emitWhoLivedIt(lhlAll, householdAll, cycle));
  out.push(...emitCivicDecisions(cycle));
  out.push(...emitSports(sportsAll, cycle));
  out.push(...emitEveningTexture(rileyCurr));
  out.push(...emitWorldEvents(rileyCurr));
  out.push(...emitChaosCars(chaosAll, cycle));
  out.push(...emitThreeCycleTrends(rileyCurr, rileyPrev1, rileyPrev2));
  out.push(...emitEngineReviewFindings(cycle, auditJson));
  out.push(...emitApprovalRatings(approvalRows, priorApprovals));
  out.push(...emitFooter(cycle));

  return out.join('\n') + '\n';
}

// ============================================================================
// CLI
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  const cycleStr = args[0];
  const cycle = parseInt(cycleStr, 10);
  if (!Number.isInteger(cycle)) {
    console.error('Usage: node scripts/buildWorldSummary.js <cycle> [--output <path>] [--dry-run]');
    process.exit(1);
  }
  const outIdx = args.indexOf('--output');
  const outputPath = outIdx >= 0 && args[outIdx + 1]
    ? args[outIdx + 1]
    : path.join('output', `world_summary_c${cycle}.md`);
  const dryRun = args.includes('--dry-run');

  const data = await loadCycleData(cycle);
  const body = await buildWorldSummary(cycle, data);

  // W5: desk-signal partition rides the same load — sibling artifact.
  const deskSignal = emitDeskSignal(cycle, data);
  const signalPath = path.join('output', `desk_signal_c${cycle}.json`);
  const signalJson = JSON.stringify(deskSignal, null, 2) + '\n';

  if (dryRun) {
    process.stdout.write(body);
    console.error(`\n[dry-run] would write to ${outputPath}`);
    console.error(`[dry-run] would write ${signalJson.length} bytes to ${signalPath} — lanes: ${JSON.stringify(deskSignal.meta.counts)}`);
  } else {
    const absOut = path.isAbsolute(outputPath) ? outputPath : path.join(REPO_ROOT, outputPath);
    fs.mkdirSync(path.dirname(absOut), { recursive: true });
    fs.writeFileSync(absOut, body);
    console.log(`Wrote ${body.length} bytes to ${outputPath}`);
    fs.writeFileSync(path.join(REPO_ROOT, signalPath), signalJson);
    console.log(`Wrote ${signalJson.length} bytes to ${signalPath} — lanes: ${JSON.stringify(deskSignal.meta.counts)}`
      + (deskSignal.meta.notes.length ? `\nnotes:\n  - ${deskSignal.meta.notes.join('\n  - ')}` : ''));
  }
}

module.exports = {
  buildWorldSummary,
  loadCycleData,
  // W5 desk-signal partition (pure — testable without sheet access)
  emitDeskSignal,
  openThreadEntries,
  rippleEntry,
  signalLabel,
  extractPopids,
  resolveFeedNames: resolveFeedNames_,
  RIPPLE_LANE_MAP,
  DESK_SIGNAL_VERSION,
  // W5h2 byline WHO-assist (pure selection + fs-only usage tally)
  selectBylineCandidates,
  loadBylineUsage,
  // Pure helpers exported for testing
  round2,
  fmtSentiment,
  fmtNum,
  parseJsonField,
  formatWeatherLine,
  sortNeighborhoods,
  filterApprovalRows,
  classifyDelta,
  normApprovalPts,
  loadPriorApprovals,
  approvalDeltaCell,
  // Section emitters exported for testing
  emitHeader,
  emitSnapshotLine,
  emitCityState,
  emitWhatMoved,
  emitWhoLivedIt,
  emitCivicDecisions,
  emitSports,
  emitEveningTexture,
  emitWorldEvents,
  emitThreeCycleTrends,
  emitEngineReviewFindings,
  emitApprovalRatings,
  emitFooter,
  SCRIPT_VERSION
};

if (require.main === module) {
  main().catch(err => {
    console.error('buildWorldSummary FAILED:', err.message);
    process.exit(1);
  });
}

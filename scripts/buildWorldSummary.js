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

const REPO_ROOT = path.resolve(__dirname, '..');
const SCRIPT_VERSION = '1.0.0';

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

function emitHeader(cycle, rileyCurr, calendar) {
  const weather = parseJsonField(rileyCurr.Weather, {});
  const calRow = calendar.find(r => r && r.length >= 4 && r[0] && r[1]);
  const simYear = calRow ? calRow[0] : '—';
  const simMonth = calRow ? calRow[1] : '—';
  const simDay = calRow ? calRow[2] : '—';
  const season = calRow ? calRow[3] : '—';
  const holiday = calRow ? calRow[4] : 'none';

  const nightlife = parseJsonField(rileyCurr.NightLife, {});
  const sportsSeason = nightlife.calendarContext?.sportsSeason || '—';
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

function emitCityState(rileyCurr, worldPop, neighborhoodsC, prevRileyCount) {
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
    `- **Population:** ${fmtPopulation(worldPop.totalPopulation)} | Illness rate ${fmtNum(Number(worldPop.illnessRate) * 100, 1)}% | Employment ${fmtNum(Number(worldPop.employmentRate) * 100, 1)}% | Economy ${worldPop.economy || '—'}`,
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

function emitApprovalRatings(approvalRows) {
  const lines = [
    '## Approval Ratings (Civic_Office_Ledger, Status ∈ {active, recovering}, Mayor + Council)',
    '',
    '| Office | Holder | Faction | Status | Approval |',
    '|---|---|---|---|---:|'
  ];
  for (const r of approvalRows) {
    const office = r.Title || r.OfficeId;
    const districtTag = r.District && r.District !== 'citywide' ? ` (${r.District})` : '';
    // G-BWS1 — flag non-active seats so recovering members are visible.
    const statusTag = r.Status === 'active' ? 'active' : `**${r.Status || '—'}**`;
    lines.push(`| ${office}${districtTag} | ${r.Holder || '—'} | ${r.Faction || '—'} | ${statusTag} | ${r.Approval || '—'} |`);
  }
  lines.push('');

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

function emitFooter(cycle) {
  return [
    '---',
    '',
    `_Generated by \`scripts/buildWorldSummary.js\` v${SCRIPT_VERSION} from Riley_Digest + Oakland_Sports_Feed + Civic_Office_Ledger + Neighborhood_Map + World_Population + Simulation_Calendar + \`output/engine_audit_c${cycle}.json\`. No LLM in the writer loop — all content is verbatim from named sources. Supermemory ingest deferred to \`/post-publish\`._`
  ];
}

// ============================================================================
// ORCHESTRATION
// ============================================================================

async function buildWorldSummary(cycle) {
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
    calendarAll
  ] = await Promise.all([
    sheets.getSheetAsObjects('Riley_Digest'),
    sheets.getSheetAsObjects('Oakland_Sports_Feed'),
    sheets.getSheetAsObjects('Civic_Office_Ledger'),
    sheets.getSheetAsObjects('Neighborhood_Map'),
    sheets.getSheetAsObjects('World_Population'),
    sheets.getSheetData('Simulation_Calendar')
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

  // Build sections
  const out = [];
  out.push(...emitHeader(cycle, rileyCurr, calendarAll.slice(1)));
  out.push(...emitCityState(rileyCurr, worldPopCurr, neighborhoodsC, {
    storySeedCount: rileyPrev1?.StorySeedCount ?? null,
    eventsGenerated: rileyPrev1?.EventsGenerated ?? null
  }));
  out.push(...emitCivicDecisions(cycle));
  out.push(...emitSports(sportsAll, cycle));
  out.push(...emitEveningTexture(rileyCurr));
  out.push(...emitWorldEvents(rileyCurr));
  out.push(...emitThreeCycleTrends(rileyCurr, rileyPrev1, rileyPrev2));
  out.push(...emitEngineReviewFindings(cycle, auditJson));
  out.push(...emitApprovalRatings(approvalRows));
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

  const body = await buildWorldSummary(cycle);

  if (dryRun) {
    process.stdout.write(body);
    console.error(`\n[dry-run] would write to ${outputPath}`);
  } else {
    const absOut = path.isAbsolute(outputPath) ? outputPath : path.join(REPO_ROOT, outputPath);
    fs.mkdirSync(path.dirname(absOut), { recursive: true });
    fs.writeFileSync(absOut, body);
    console.log(`Wrote ${body.length} bytes to ${outputPath}`);
  }
}

module.exports = {
  buildWorldSummary,
  // Pure helpers exported for testing
  round2,
  fmtSentiment,
  fmtNum,
  parseJsonField,
  formatWeatherLine,
  sortNeighborhoods,
  filterApprovalRows,
  classifyDelta,
  // Section emitters exported for testing
  emitHeader,
  emitCityState,
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

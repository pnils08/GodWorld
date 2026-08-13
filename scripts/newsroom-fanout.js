#!/usr/bin/env node
/**
 * Newsroom fan-out rotation — scripts/newsroom-fanout.js
 *
 * Phase 2.3 fan-out (Mike-direct 2026-07-25): the three-wake cadence runs as a
 * daily ROTA, not one hardcoded desk. The rota selects six active wake packages
 * at the declared desk quotas. Selection inside each desk is least-recently-used,
 * computed from prior fanout files, while the downstream package-only gate
 * rejects stale or unchecked assignments without adding seats.
 *
 * grok 2026-08-06 — stink force-slot (research 2026-08-06-jax-caldera-sim-stink-audit):
 * when the deterministic stink scanner scores ≥ threshold and no firebrand force
 * landed in the last 7 days, one civic assignment becomes Jax Caldera
 * (freelance-firebrand) seeded from the top stink, with firebrand approach text.
 * Cap 1/week. Scanner failure is non-fatal (rota still builds).
 *
 * The 06:15 angle wake builds today's file if missing; report/write consume it.
 *
 * Usage:
 *   node scripts/newsroom-fanout.js [--date YYYY-MM-DD] [--force]
 *   const { buildFanout, writeFanout, loadFanout } = require('./newsroom-fanout');
 */

require('/root/GodWorld/lib/env');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const COMPARE = path.join(ROOT, 'output', 'cron-compare');

// Daily desk quotas (sum = 6). Package expansion grows the eligible pool, never
// the number of scheduled seats.
const DAILY_QUOTAS = { civic: 2, sports: 2, culture: 1, business: 1 };

function arg(flag, def) {
  const i = process.argv.indexOf(flag);
  if (i !== -1 && process.argv[i + 1]) return process.argv[i + 1];
  const eq = process.argv.find(a => a.startsWith(flag + '='));
  return eq ? eq.slice(flag.length + 1) : def;
}

// name -> {count, last} across prior fanout files (least-recently-used rotation)
function usageHistory() {
  const hist = {};
  let files = [];
  try {
    files = fs.readdirSync(COMPARE).filter(f => /^fanout-\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort();
  } catch (_) {}
  for (const f of files) {
    let j; try { j = JSON.parse(fs.readFileSync(path.join(COMPARE, f), 'utf8')); } catch (_) { continue; }
    const date = f.slice(7, 17);
    for (const a of (j.assignments || [])) {
      const h = hist[a.name] || { count: 0, last: null };
      h.count++;
      if (!h.last || date > h.last) h.last = date;
      hist[a.name] = h;
    }
  }
  return hist;
}

// Submission budget (headless plan "What's left" #2, S339): tally gate-cleared
// articles for a cycle from staged/*.staged.json — the probation wall is the
// source of truth for "cleared this cycle-week". Returns { total, byByline }.
// `dir` override is for tests only.
function stagedTally(cycle, dir) {
  const stagedDir = dir || path.join(COMPARE, 'staged');
  const out = { total: 0, byByline: {} };
  let files = [];
  try { files = fs.readdirSync(stagedDir).filter(f => f.endsWith('.staged.json')); } catch (_) { return out; }
  for (const f of files) {
    let j; try { j = JSON.parse(fs.readFileSync(path.join(stagedDir, f), 'utf8')); } catch (_) { continue; }
    if (String(j.cycle) !== String(cycle)) continue;
    out.total++;
    if (j.byline) out.byByline[j.byline] = (out.byByline[j.byline] || 0) + 1;
  }
  return out;
}

// Rotation preference (S339 soft no-repeat, Mike-direct): a byline who already
// cleared an article this cycle-week drops behind fresh bylines; ties break by
// least-recently-worked, then name. SOFT by construction — when every candidate
// has filed (heavy civic cycle: 12 weekly civic slots vs 9 civic bylines), the
// sort degrades to least-staged + LRU instead of dropping the article.
function bylinePreference(stagedBy, hist) {
  return (a, b) => {
    const sa = stagedBy[a.name] || 0, sb = stagedBy[b.name] || 0;
    if (sa !== sb) return sa - sb;
    const ha = hist[a.name], hb = hist[b.name];
    const la = ha && ha.last ? ha.last : '0000-00-00';   // never-worked first
    const lb = hb && hb.last ? hb.last : '0000-00-00';
    return la.localeCompare(lb) || a.name.localeCompare(b.name);
  };
}

// ---------------------------------------------------------------------------
// Task 2.5.2 (Mike-direct S344) — EIC assignment at rota build. Mags's EIC
// function is this deterministic step: each rota entry carries an ASSIGNED
// story seed from the desk_signal lane (engine handles first — the angle the
// engine itself framed) plus the desk's research-approach prompt. The wakes
// never pick or invent the angle; the journalist creates the story FROM it.
// ---------------------------------------------------------------------------

function loadApproachMap() {
  try { return JSON.parse(fs.readFileSync(path.join(__dirname, 'desk-approach-map.json'), 'utf8')); }
  catch (_) { return {}; }
}

// Story refs assigned in prior fanout files for the SAME cycle — a handle
// assigned earlier this cycle-week cannot reassign (assignment dedup,
// plan pressure-test #1). Old files without a cycle field never block.
function assignedStoryRefs(cycle) {
  const taken = new Set();
  let files = [];
  try {
    files = fs.readdirSync(COMPARE).filter(f => /^fanout-\d{4}-\d{2}-\d{2}\.json$/.test(f));
  } catch (_) {}
  for (const f of files) {
    let j; try { j = JSON.parse(fs.readFileSync(path.join(COMPARE, f), 'utf8')); } catch (_) { continue; }
    if (String(j.cycle) !== String(cycle)) continue;
    for (const a of (j.assignments || [])) if (a.story && a.story.ref) taken.add(a.story.ref);
  }
  return taken;
}

// Per-desk seed queue from the desk_signal lane: entries the engine framed a
// handle for lead (they carry angle + hookLine + affected citizens); the rest
// of the lane follows so every desk assigns across ALL kinds (anomalies,
// datawakes, initiatives, sports-feed rows), not audit patterns only.
// Weekday arc cadence (plan pressure-test #2): Mon/Tue assignments lead with
// cycle events (engine handles); Wed/Thu lead with FOLLOW-UPS — datawakes,
// decisions, initiatives, reactions ("what's happened since"), second-day
// journalism. Other days keep the handle-first default.
const FOLLOWUP_KINDS = new Set(['civic-datawake', 'decision', 'initiative', 'vote']);
function laneSeeds(lane, taken, date) {
  const withHandle = [], followups = [], rest = [];
  for (const e of (lane || [])) {
    if (!e || !e.ref || taken.has(e.ref)) continue;
    if (e.handle) withHandle.push(e);
    else if (FOLLOWUP_KINDS.has(e.kind)) followups.push(e);
    else rest.push(e);
  }
  const dow = date ? new Date(date + 'T12:00:00Z').getUTCDay() : 0;
  return (dow === 3 || dow === 4)                       // Wed/Thu: follow-ups lead
    ? followups.concat(withHandle, rest)
    : withHandle.concat(followups, rest);
}

function storyFromSeed(e) {
  const h = e.handle || {};
  const story = { ref: e.ref, label: e.label || null, kind: e.kind || null };
  if (h.angle) story.angle = h.angle;
  if (h.hookLine) story.hookLine = h.hookLine;
  if (Array.isArray(h.citizens) && h.citizens.length) story.citizens = h.citizens;
  if (Array.isArray(e.popids) && e.popids.length) story.popids = e.popids;
  if (e.hood) story.hood = e.hood;
  return story;
}

// Approach: persona slug key (freelance-firebrand) beats desk key so civic
// process framing cannot dilute a firebrand force/LRU slot.
function approachFor(approachMap, desk, personaSlug) {
  if (personaSlug && approachMap[personaSlug]) return approachMap[personaSlug];
  return approachMap[desk] || approachMap._default || null;
}

// ADR-0017 package-only gate. A scheduled journalist must own an active wake
// package; the old generic prompt is not a fallback. The rota builder owns seat
// selection and quotas. This gate only normalizes selected package identities
// and rejects stale/unchecked seats, so package growth can never expand a day.
function applyWakePackageGate(assignments, approachMap, packagesOverride) {
  const packagesApi = require('./newsroomWakePackages');
  const packages = packagesOverride || packagesApi.loadPackages();
  const work = (assignments || []).map(row => Object.assign({}, row));
  const active = packagesApi.activePackages(packages);
  const matchesPackage = (row, key, value) => Boolean(row) && (
    row.persona === key ||
    row.popid === value.assignment.popid ||
    row.name === value.assignment.name
  );
  for (let index = 0; index < work.length; index++) {
    const matched = active.find(({ key, value }) => matchesPackage(work[index], key, value));
    if (!matched) continue;
    const { key, value } = matched;
    work[index] = Object.assign({}, work[index], value.assignment, {
      persona: key,
      approach: approachFor(approachMap, value.assignment.desk, key),
    });
  }

  const gated = packagesApi.gateAssignments(work, packages);
  return {
    policy: 'package-only',
    assignments: gated.eligible,
    skipped: gated.skipped,
    pinned: [],
  };
}

// `requiredDaily` marks an active package as eligible for the daily rota. It no
// longer means every eligible package runs every day; DAILY_QUOTAS and LRU own
// that decision.
function activeRotaCandidates(packagesOverride) {
  const packagesApi = require('./newsroomWakePackages');
  const packages = packagesOverride || packagesApi.loadPackages();
  return packagesApi.activePackages(packages)
    .filter(({ value }) => value.requiredDaily)
    .map(({ key, value }) => Object.assign({}, value.assignment, { persona: key }));
}

// Backstop for fanout files written before the fixed-capacity package rota.
// Within a desk, a source-assigned seat outranks an approach-only seat; stable
// input order breaks ties. Unknown desks have no capacity and fail closed.
function boundDailyAssignments(assignments, quotasOverride) {
  const quotas = quotasOverride || DAILY_QUOTAS;
  const indexed = (assignments || []).map((row, index) => ({ row, index }));
  const selected = [];
  const dropped = [];
  for (const [desk, quota] of Object.entries(quotas)) {
    const deskRows = indexed.filter(item => item.row && item.row.desk === desk)
      .sort((a, b) => Number(Boolean(b.row.story)) - Number(Boolean(a.row.story)) ||
        a.index - b.index);
    selected.push(...deskRows.slice(0, quota).map(item => item.row));
    dropped.push(...deskRows.slice(quota).map(item => item.row));
  }
  const knownDesks = new Set(Object.keys(quotas));
  dropped.push(...indexed.filter(item => !item.row || !knownDesks.has(item.row.desk))
    .map(item => item.row));
  return { assignments: selected, dropped };
}

function loadFirebrandPersona() {
  try {
    const map = JSON.parse(fs.readFileSync(path.join(__dirname, 'persona-map.json'), 'utf8'));
    const p = map['freelance-firebrand'];
    if (!p || !p.popid || !p.name) return null;
    return { slug: 'freelance-firebrand', name: p.name, popid: p.popid, beatDomain: p.beatDomain || 'CIVIC' };
  } catch (_) { return null; }
}

/**
 * If stink scanner says force and cooldown is clear, pin one civic slot to Jax
 * with the top stink story + firebrand approach. Mutates assignments in place.
 * Never throws — scanner/IO failures log and leave the LRU rota intact.
 */
function applyStinkForce(assignments, cycle, date, approachMap, takenRefs) {
  const out = { attempted: false, forced: false, reason: null, top: null, reportPath: null };
  if (cycle == null) {
    out.reason = 'no-cycle';
    return out;
  }
  out.attempted = true;
  let scanner;
  try {
    scanner = require(path.join(__dirname, 'stink-scanner'));
  } catch (e) {
    out.reason = 'scanner-load-failed: ' + e.message;
    console.error('[fanout] stink force skipped — ' + out.reason);
    return out;
  }
  let report;
  try {
    report = scanner.scanCycle(cycle);
    out.reportPath = scanner.writeReport(cycle, report);
  } catch (e) {
    out.reason = 'scan-failed: ' + e.message;
    console.error('[fanout] stink force skipped — ' + out.reason);
    return out;
  }
  out.top = report.top ? { score: report.top.score, className: report.top.className, label: report.top.label } : null;
  if (!report.shouldForce || !report.top) {
    out.reason = 'below-threshold maxScore=' + report.maxScore;
    return out;
  }
  // Exclude `date` so fanout --force same day can re-seed; other days in window block.
  const recent = scanner.recentForceCount(COMPARE, scanner.FORCE_COOLDOWN_DAYS, date, date);
  if (recent.count > 0) {
    out.reason = 'cooldown recentForce=' + recent.dates.join(',');
    return out;
  }
  const persona = loadFirebrandPersona();
  if (!persona) {
    out.reason = 'persona-map missing freelance-firebrand';
    console.error('[fanout] stink force skipped — ' + out.reason);
    return out;
  }
  // Prefer full Jax slice (citizens + scene pack) over bare stink label.
  let story = report.top.story || {
    ref: report.top.ref,
    label: report.top.label,
    kind: report.top.kind,
    angle: report.top.label,
    hood: report.top.hood
  };
  let firebrandApproach = approachFor(approachMap, 'civic', persona.slug);
  let stinkMeta = {
    className: report.top.className,
    score: report.top.score,
    label: report.top.label,
    ref: report.top.ref
  };
  try {
    const { buildJaxSlice, writeJaxSlice, assignmentFromSlice } = require(path.join(__dirname, 'buildJaxSlice'));
    const slice = buildJaxSlice(cycle, { report });
    writeJaxSlice(cycle, slice);
    const fromSlice = assignmentFromSlice(slice);
    if (fromSlice && fromSlice.story) {
      story = fromSlice.story;
      firebrandApproach = fromSlice.approach || firebrandApproach;
      stinkMeta = fromSlice.stink || stinkMeta;
    }
  } catch (e) {
    console.error('[fanout] jax slice enrich skipped: ' + e.message);
  }
  if (story.ref) takenRefs.add(story.ref);

  const forceFields = {
    desk: 'civic',
    name: persona.name,
    popid: persona.popid,
    beatDomain: 'CIVIC',
    persona: persona.slug,
    approach: firebrandApproach,
    story,
    stinkForce: true,
    stink: stinkMeta,
    jaxSlice: true
  };

  // Prefer upgrading an existing Jax slot; else replace the first civic slot;
  // else push (should not happen if civic quota filled).
  const jaxIdx = assignments.findIndex(a => a.popid === persona.popid || a.persona === persona.slug);
  if (jaxIdx >= 0) {
    const prev = assignments[jaxIdx];
    assignments[jaxIdx] = Object.assign({}, prev, forceFields, { desk: prev.desk || 'civic' });
  } else {
    const civicIdx = assignments.findIndex(a => a.desk === 'civic');
    if (civicIdx >= 0) {
      assignments[civicIdx] = forceFields;
    } else {
      assignments.unshift(forceFields);
    }
  }
  // Drop duplicate Jax if upgrade path left two (shouldn't, but fail-safe).
  const seenJax = new Set();
  for (let i = assignments.length - 1; i >= 0; i--) {
    const a = assignments[i];
    if (a.popid === persona.popid || a.persona === persona.slug) {
      if (seenJax.has(persona.popid)) assignments.splice(i, 1);
      else seenJax.add(persona.popid);
    }
  }
  out.forced = true;
  out.reason = 'forced score=' + report.top.score + ' class=' + report.top.className;
  console.error('[fanout] STINK FORCE — ' + persona.name + ' on ' +
    String(report.top.label).slice(0, 100) + ' (score ' + report.top.score + ')');
  return out;
}

async function buildFanout(date) {
  const { buildBylineRoster } = require(path.join(ROOT, 'scripts', 'engine-auditor', 'bayTribuneRoster'));
  const roster = await buildBylineRoster();
  const pool = activeRotaCandidates();
  if (!pool.length) throw new Error('active wake-package rota is empty — cannot fan out');
  const rosterPopids = new Set((roster.included || []).map(row => row.popid));
  const absent = pool.filter(row => !rosterPopids.has(row.popid));
  if (absent.length) {
    throw new Error('active wake package absent from canonical byline roster: ' +
      absent.map(row => row.persona + '/' + row.popid).join(', '));
  }
  const hist = usageHistory();
  const getCurrentCycle = require(path.join(ROOT, 'lib', 'getCurrentCycle'));
  const cycle = getCurrentCycle({ soft: true, noArgv: true });
  const stagedBy = cycle === null ? {} : stagedTally(cycle).byByline;
  // Task 2.5.2: the day's seed material. A missing desk_signal degrades to
  // approach-only assignments — the rota never blocks on the signal file —
  // but LOUDLY: seedless days are a pipeline break upstream (/run-cycle →
  // build-world-summary didn't run for this cycle), not a normal state.
  const signal = cycle === null ? null
    : (() => { try { return JSON.parse(fs.readFileSync(path.join(ROOT, 'output', 'desk_signal_c' + cycle + '.json'), 'utf8')); } catch (_) { return null; } })();
  if (!signal) {
    console.error('[fanout] WARNING: no output/desk_signal_c' + cycle + '.json — every assignment goes out '
      + 'APPROACH-ONLY (no assigned angle, no seed citizens). Upstream: run /engine-review + /build-world-summary for c' + cycle + '.');
  }
  const lanes = (signal && signal.lanes) || {};
  const takenRefs = cycle === null ? new Set() : assignedStoryRefs(cycle);
  const approachMap = loadApproachMap();
  const assignments = [];
  const shortfalls = [];
  const usedToday = new Set();

  for (const [desk, quota] of Object.entries(DAILY_QUOTAS)) {
    const candidates = pool.filter(j => j.desk === desk);
    candidates.sort(bylinePreference(stagedBy, hist));
    const seeds = laneSeeds(lanes[desk], takenRefs, date);
    let taken = 0;
    for (const j of candidates) {
      if (taken >= quota) break;
      if (usedToday.has(j.name)) continue;
      usedToday.add(j.name);
      const a = {
        desk, name: j.name, popid: j.popid, beatDomain: j.beatDomain,
        persona: j.persona,
        approach: approachFor(approachMap, desk, j.persona)
      };
      // EIC assignment: hand this reporter the next unassigned seed. Seed pool
      // exhausted -> approach-only open beat (never drops the slot).
      const seed = seeds.shift();
      if (seed) { a.story = storyFromSeed(seed); takenRefs.add(seed.ref); }
      assignments.push(a);
      taken++;
    }
    if (taken < quota) shortfalls.push({ desk, wanted: quota, got: taken });
  }

  // grok: after LRU rota is built, optionally force one firebrand stink slot.
  const stinkForce = applyStinkForce(assignments, cycle, date, approachMap, takenRefs);

  // grok: enrich any P Slayer sports seat with fan-pulse slice (charge bag + prior takes).
  let pslayerEnrich = { enriched: false, reason: 'none' };
  if (cycle != null) {
    try {
      const { enrichAssignment, buildPSlayerSlice, writePSlayerSlice } =
        require(path.join(__dirname, 'buildPSlayerSlice'));
      const before = assignments.map(a => a.persona || a.popid);
      for (let i = 0; i < assignments.length; i++) {
        const next = enrichAssignment(assignments[i], cycle);
        if (next && next.pslayerSlice) {
          assignments[i] = next;
          pslayerEnrich = {
            enriched: true,
            reason: 'pulse=' + (next.pulse && next.pulse.className) +
              ' score=' + (next.pulse && next.pulse.score) +
              ' charge=' + (next.charge && next.charge.fanCharge)
          };
        }
      }
      // Always materialize slice artifact when sports rota ran (even if no p-slayer slot today)
      try {
        const slice = buildPSlayerSlice(cycle);
        writePSlayerSlice(cycle, slice);
      } catch (_) { /* non-fatal */ }
      if (!pslayerEnrich.enriched) {
        pslayerEnrich.reason = 'no p-slayer assignment in rota (before=' + before.join(',') + ')';
      } else {
        console.error('[fanout] P SLAYER FAN-HEAT — ' + pslayerEnrich.reason);
      }
    } catch (e) {
      pslayerEnrich = { enriched: false, reason: 'error: ' + e.message };
      console.error('[fanout] pslayer slice enrich skipped: ' + e.message);
    }
  }

  // grok pipeline.52: enrich Anthony analytic sports seat with board pulse.
  let anthonyEnrich = { enriched: false, reason: 'none' };
  if (cycle != null) {
    try {
      const {
        enrichAssignment: enrichAnthony,
        buildAnthonySlice,
        writeAnthonySlice
      } = require(path.join(__dirname, 'buildAnthonySlice'));
      for (let i = 0; i < assignments.length; i++) {
        const next = enrichAnthony(assignments[i], cycle);
        if (next && next.anthonySlice) {
          assignments[i] = next;
          anthonyEnrich = {
            enriched: true,
            reason: 'pulse=' + (next.pulse && next.pulse.className) +
              ' score=' + (next.pulse && next.pulse.score) +
              ' foil=' + (next.pulse && next.pulse.foilNumber)
          };
        }
      }
      try {
        const slice = buildAnthonySlice(cycle);
        writeAnthonySlice(cycle, slice);
      } catch (_) { /* non-fatal */ }
      if (!anthonyEnrich.enriched) {
        anthonyEnrich.reason = 'no anthony-raines assignment in rota';
      } else {
        console.error('[fanout] ANTHONY ANALYTIC — ' + anthonyEnrich.reason);
      }
    } catch (e) {
      anthonyEnrich = { enriched: false, reason: 'error: ' + e.message };
      console.error('[fanout] anthony slice enrich skipped: ' + e.message);
    }
  }

  // grok pipeline.52: enrich Hal historian sports seat with archive pulse.
  let halEnrich = { enriched: false, reason: 'none' };
  if (cycle != null) {
    try {
      const {
        enrichAssignment: enrichHal,
        buildHalSlice,
        writeHalSlice
      } = require(path.join(__dirname, 'buildHalSlice'));
      for (let i = 0; i < assignments.length; i++) {
        const next = enrichHal(assignments[i], cycle);
        if (next && next.halSlice) {
          assignments[i] = next;
          halEnrich = {
            enriched: true,
            reason: 'pulse=' + (next.pulse && next.pulse.className) +
              ' score=' + (next.pulse && next.pulse.score) +
              ' close=' + (next.pulse && next.pulse.closingNote)
          };
        }
      }
      try {
        const slice = buildHalSlice(cycle);
        writeHalSlice(cycle, slice);
      } catch (_) { /* non-fatal */ }
      if (!halEnrich.enriched) {
        halEnrich.reason = 'no hal-richmond assignment in rota';
      } else {
        console.error('[fanout] HAL ARCHIVE — ' + halEnrich.reason);
      }
    } catch (e) {
      halEnrich = { enriched: false, reason: 'error: ' + e.message };
      console.error('[fanout] hal slice enrich skipped: ' + e.message);
    }
  }

  // grok pipeline.52: enrich business desk with economic / storefront pack.
  let economicEnrich = { enriched: false, reason: 'none' };
  if (cycle != null) {
    try {
      const {
        enrichAssignment: enrichEconomic,
        buildEconomicSlice,
        writeEconomicSlice,
        isBusinessDesk
      } = require(path.join(__dirname, 'buildEconomicSlice'));
      for (let i = 0; i < assignments.length; i++) {
        if (!isBusinessDesk(assignments[i])) continue;
        const next = enrichEconomic(assignments[i], cycle);
        if (next && next.economicSlice) {
          assignments[i] = next;
          economicEnrich = {
            enriched: true,
            reason: 'pulse=' + (next.pulse && next.pulse.className) +
              ' score=' + (next.pulse && next.pulse.score) +
              ' hood=' + (next.pulse && next.pulse.hood)
          };
        }
      }
      try {
        const slice = buildEconomicSlice(cycle);
        writeEconomicSlice(cycle, slice);
      } catch (_) { /* non-fatal */ }
      if (!economicEnrich.enriched) {
        economicEnrich.reason = 'no business desk assignment in rota';
      } else {
        console.error('[fanout] ECONOMIC STOREFRONT — ' + economicEnrich.reason);
      }
    } catch (e) {
      economicEnrich = { enriched: false, reason: 'error: ' + e.message };
      console.error('[fanout] economic slice enrich skipped: ' + e.message);
    }
  }

  // grok pipeline.52: enrich culture evening consumers with evening-life pack.
  let eveningEnrich = { enriched: false, reason: 'none', seats: [] };
  if (cycle != null) {
    try {
      const {
        enrichAssignment: enrichEvening,
        buildEveningSlice,
        writeEveningSlice,
        isEveningConsumer
      } = require(path.join(__dirname, 'buildEveningSlice'));
      for (let i = 0; i < assignments.length; i++) {
        if (!isEveningConsumer(assignments[i])) continue;
        const next = enrichEvening(assignments[i], cycle);
        if (next && next.eveningSlice) {
          assignments[i] = next;
          eveningEnrich.enriched = true;
          eveningEnrich.seats.push({
            persona: next.persona || next.popid,
            bag: next.bag,
            pulse: next.pulse && next.pulse.className,
            score: next.pulse && next.pulse.score
          });
        }
      }
      try {
        const slice = buildEveningSlice(cycle);
        writeEveningSlice(cycle, slice);
      } catch (_) { /* non-fatal */ }
      if (!eveningEnrich.enriched) {
        eveningEnrich.reason = 'no evening-consumer assignment in rota';
      } else {
        eveningEnrich.reason = 'seats=' + eveningEnrich.seats.length;
        console.error('[fanout] EVENING LIFE — ' + eveningEnrich.reason +
          ' ' + eveningEnrich.seats.map(s => s.persona + '/' + s.bag + ':' + s.pulse).join(', '));
      }
    } catch (e) {
      eveningEnrich = { enriched: false, reason: 'error: ' + e.message, seats: [] };
      console.error('[fanout] evening slice enrich skipped: ' + e.message);
    }
  }

  // pipeline.52 Task 6: one shared civic substrate, then a named solo-seat
  // packet for Carmen, Luis, Trevor, Lila, Noah, or Angela. Rachel remains on
  // her completed standalone safety slice.
  let civicDomainEnrich = { enriched: false, reason: 'none', seats: [] };
  if (cycle != null) {
    try {
      const {
        enrichAssignment: enrichCivicDomain,
        buildCivicDomainSlice,
        writeCivicDomainSlice,
        isCivicDomainPersona
      } = require(path.join(__dirname, 'buildCivicDomainSlice'));
      for (let i = 0; i < assignments.length; i++) {
        if (!isCivicDomainPersona(assignments[i])) continue;
        const next = enrichCivicDomain(assignments[i], cycle);
        if (next && next.civicDomainSlice) {
          assignments[i] = next;
          civicDomainEnrich.enriched = true;
          civicDomainEnrich.seats.push({
            persona: next.persona,
            domain: next.pulse && next.pulse.className,
            label: next.pulse && next.pulse.label
          });
        }
      }
      // Materialize once per cycle even when no eligible civic seat made today's rota.
      try {
        const slice = buildCivicDomainSlice(cycle);
        writeCivicDomainSlice(cycle, slice);
      } catch (_) { /* non-fatal */ }
      if (!civicDomainEnrich.enriched) {
        civicDomainEnrich.reason = 'no civic-domain persona assignment in rota';
      } else {
        civicDomainEnrich.reason = 'seats=' + civicDomainEnrich.seats.length;
        console.error('[fanout] CIVIC DOMAIN — ' + civicDomainEnrich.reason + ' ' +
          civicDomainEnrich.seats.map(seat => seat.persona + '/' + seat.domain).join(', '));
      }
    } catch (e) {
      civicDomainEnrich = { enriched: false, reason: 'error: ' + e.message, seats: [] };
      console.error('[fanout] civic-domain slice enrich skipped: ' + e.message);
    }
  }

  const packageGate = applyWakePackageGate(assignments, approachMap);
  assignments.splice(0, assignments.length, ...packageGate.assignments);
  const packageShortfalls = Object.entries(DAILY_QUOTAS).map(([desk, wanted]) => ({
    desk, wanted, got: assignments.filter(a => a.desk === desk).length,
  })).filter(row => row.got < row.wanted);
  const seedless = assignments.filter(a => !a.story).length;
  return { date, cycle, quotas: DAILY_QUOTAS, assignments, shortfalls: packageShortfalls,
    rotationShortfalls: shortfalls,
    seedless, signalMissing: !signal,   // loud in the file too — the 06:00 digest and any reader sees a seedless day
    packageGate: {
      policy: packageGate.policy,
      pinned: packageGate.pinned,
      skipped: packageGate.skipped,
      activeAssignments: assignments.map(a => ({ name: a.name, persona: a.persona, wakePackage: a.wakePackage })),
    },
    stinkForce,
    pslayerEnrich,
    anthonyEnrich,
    halEnrich,
    economicEnrich,
    eveningEnrich,
    civicDomainEnrich,
    builtAt: new Date().toISOString() };
}

function fanoutPath(date) { return path.join(COMPARE, 'fanout-' + date + '.json'); }

function loadFanout(date) {
  try { return JSON.parse(fs.readFileSync(fanoutPath(date), 'utf8')); } catch (_) { return null; }
}

async function writeFanout(date, force) {
  const p = fanoutPath(date);
  if (fs.existsSync(p) && !force) return JSON.parse(fs.readFileSync(p, 'utf8'));   // idempotent: today's file stands
  const fanout = await buildFanout(date);
  fs.mkdirSync(COMPARE, { recursive: true });
  fs.writeFileSync(p, JSON.stringify(fanout, null, 2));
  return fanout;
}

if (require.main === module) {
  const date = arg('--date', new Date().toISOString().slice(0, 10));
  const force = process.argv.includes('--force');
  writeFanout(date, force)
    .then(f => {
      console.log('fanout ' + f.date + ' — ' + f.assignments.length + ' assignments' +
        (f.shortfalls && f.shortfalls.length ? ' (SHORTFALL: ' + f.shortfalls.map(s => s.desk + ' ' + s.got + '/' + s.wanted).join(', ') + ')' : ''));
      for (const a of f.assignments) {
        console.log('  ' + a.desk.padEnd(9) + a.name.padEnd(18) + (a.popid || '-').padEnd(11) + a.beatDomain + (a.persona ? '  [persona: ' + a.persona + ']' : ''));
        if (a.story) console.log('           assigned: ' + String(a.story.angle || a.story.label || a.story.ref).slice(0, 110));
      }
      console.log('→ ' + path.relative(ROOT, fanoutPath(f.date)));
    })
    .catch(e => { console.error('fanout failed: ' + e.message); process.exit(1); });
}

module.exports = { buildFanout, writeFanout, loadFanout, usageHistory, stagedTally, bylinePreference,
  assignedStoryRefs, laneSeeds, storyFromSeed, approachFor, applyStinkForce, loadFirebrandPersona,
  applyWakePackageGate, activeRotaCandidates, boundDailyAssignments, DAILY_QUOTAS };

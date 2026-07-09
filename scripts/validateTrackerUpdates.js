#!/usr/bin/env node
// Pre-assembly Initiative_Tracker validator (S265 civic.14 Phase 2, engine-sheet).
//
// Runs BEFORE assembleDecisions / applyTrackerUpdates write the tracker. Catches
// the C98 trackerUpdates-conformance failures at the pipeline layer, independent
// of agent compliance:
//   - G-R1: a trackerUpdates-bearing statement with NO resolvable InitiativeID →
//     assembleDecisions can't attribute it and the write is dropped → HARD.
//   - G-R1: a non-canonical ImplementationPhase the contract can't resolve at all
//     → the engine silently zeroes it (initiative goes dark) → HARD.
//   - mappable phase drift (variant / partial) → WARNING (the write-normalization
//     gate in applyTrackerUpdates fixes it; surfaced so it's not silent).
//   - G-PREP1: phase advances to vote-scheduled but no VoteCycle emitted → STAMP
//     flag (the gate stamps VoteCycle + NextActionCycle so the vote-trigger is
//     deterministic, not Mara-inferred).
//   - G-R2: a voice file emitted as a flat top-level array (envelope drift) →
//     WARNING (assembleDecisions tolerates it; flagged for the agent-side fix).
//
// Fail-loud: exits non-zero when HARD violations exist so the operator resolves
// them pre-write rather than shipping a dark / dropped initiative. Normalizable
// drift never blocks — the gate handles it.

'use strict';

const fs = require('fs');
const path = require('path');
const C = require('../lib/initiativePhaseContract');
// Reuse the pipeline's own attribution so the validator can NEVER resolve an
// InitiativeID differently than assembleDecisions does (S265 review fix: a
// 2-signal local resolver false-flagged 26 real C94-C98 statements the pipeline's
// 4-signal attributeInitiative resolves cleanly — topic-keyword + project-file
// fallbacks). assembleDecisions is require.main-guarded; importing is side-effect-free.
const { attributeInitiative } = require('./assembleDecisions');

const ROOT = path.resolve(__dirname, '..');
const DECISIONS_DIR = path.join(ROOT, 'output/city-civic-database/initiatives');
const VOICE_DIR = path.join(ROOT, 'output/civic-voice');

// Resolve an InitiativeID from a record's trackerUpdates / envelope, mirroring
// the resolution order in applyTrackerUpdates + auditVoiceStatementSchema.
function resolveInitiativeId(tu, envelope) {
  envelope = envelope || {};
  return (tu && (tu.InitiativeID || tu.initiative))
    || envelope.initiative || envelope.initiativeId
    || (envelope.relatedInitiatives || [])[0]
    || null;
}

function hasTrackerWork(tu) {
  return tu && typeof tu === 'object' && Object.keys(tu).length > 0;
}

// Mirror of applyTrackerUpdates WRITEBACK_FIELDS — the only columns that reach
// the sheet. Keep in sync (S304 G-INIT1).
const WRITEBACK_FIELDS = ['ImplementationPhase', 'MilestoneNotes', 'NextScheduledAction', 'NextActionCycle', 'VoteCycle'];

function hasWritableField(tu) {
  return WRITEBACK_FIELDS.some(f => tu && tu[f] != null && String(tu[f]).trim() !== '');
}

// Core: validate a list of normalized records. Each record:
//   { source, shape:'object'|'flat-array-element', initiativeId, trackerUpdates }
// Returns { violations[], warnings[], stamps[] } (each entry { source, code, detail }).
function validateRecords(records) {
  const violations = [], warnings = [], stamps = [];
  for (const rec of records) {
    const tu = rec.trackerUpdates;
    if (!hasTrackerWork(tu)) continue;
    const src = rec.source;

    // G-R2 — envelope drift
    if (rec.shape === 'flat-array-element') {
      warnings.push({ source: src, code: 'envelope-flat-array',
        detail: 'voice file is a flat top-level array; canonical shape is {office, cycle, statements:[]} (assembleDecisions tolerates it)' });
    }

    // G-R1 — attribution
    if (!rec.initiativeId) {
      violations.push({ source: src, code: 'missing-initiative-attribution',
        detail: 'trackerUpdates present but no resolvable InitiativeID (trackerUpdates.initiative / InitiativeID / relatedInitiatives) — the write would be dropped' });
    }

    // G-INIT1 — nested-fields schema drift (C100 INIT-001 signature): agent
    // wrapped its payload in trackerUpdates.fields{} with free-form names.
    // assembleDecisions reads only flat canonical keys, so the entire update
    // silently evaporates → HARD.
    if (tu.fields && typeof tu.fields === 'object') {
      violations.push({ source: src, code: 'nested-fields-schema',
        detail: 'trackerUpdates wraps its payload in a nested "fields" object — the pipeline reads only flat canonical keys (' + WRITEBACK_FIELDS.join(', ') + '); the update would be silently dropped. Flatten to the RULES.md schema.' });
    }

    // ImplementationPhase canonicalization
    if (tu.ImplementationPhase != null && String(tu.ImplementationPhase).trim() !== '') {
      const res = C.canonicalizePhase(tu.ImplementationPhase);
      if (res.how === 'none') {
        violations.push({ source: src, code: 'phase-unresolvable',
          detail: `ImplementationPhase "${res.original}" is not canonical and not mappable — the engine would zero it (initiative goes dark). Emit a §2 value or propose adding it.` });
      } else if (res.how === 'variant' || res.how === 'partial') {
        warnings.push({ source: src, code: 'phase-drift-' + res.how,
          detail: `ImplementationPhase "${res.original}" → "${res.canonical}" (${res.how}); the write-normalization gate will canonicalize it` });
      }
      // G-PREP1 — vote-scheduled needs a VoteCycle
      if (res.canonical === 'vote-scheduled') {
        const vc = tu.VoteCycle || tu.voteCycle;
        if (!vc || String(vc).trim() === '' || String(vc).trim() === '-') {
          stamps.push({ source: src, code: 'votecycle-needed',
            detail: 'advanced to vote-scheduled with no VoteCycle — the gate will stamp VoteCycle + NextActionCycle so the vote-trigger is deterministic' });
        }
      }
    }
  }

  // G-INIT1 — initiative-dark (per-initiative aggregate): the initiative has
  // tracker-bearing statements this cycle, but NONE carries a writable field,
  // so it receives no tracker write at all and silently sits on stale data
  // (C100: INIT-001 stuck on C99 while every other initiative advanced).
  // Per-statement zero-writable is fine (advisory/secondary voices); the HARD
  // condition is the whole initiative going dark. Empirical grain check:
  // C97-C99 post-conformance cycles produce zero hits; C100 flags exactly
  // INIT-001.
  const byInitiative = {};
  for (const rec of records) {
    if (!rec.initiativeId || !hasTrackerWork(rec.trackerUpdates)) continue;
    (byInitiative[rec.initiativeId] = byInitiative[rec.initiativeId] || []).push(rec);
  }
  for (const [initId, recs] of Object.entries(byInitiative)) {
    if (recs.some(r => hasWritableField(r.trackerUpdates))) continue;
    violations.push({ source: recs.map(r => r.source).join(' + '), code: 'initiative-dark',
      detail: `${initId}: ${recs.length} trackerUpdates-bearing record(s) but zero writable fields (${WRITEBACK_FIELDS.join(', ')}) across all of them — the initiative would receive NO tracker write this cycle and go dark on stale data` });
  }

  return { violations, warnings, stamps };
}

// Disk loader: gather records from decision files + voice files for a cycle.
function loadRecords(cycle) {
  const records = [];
  // decision files: output/city-civic-database/initiatives/<agent>/decisions_c<cycle>.json
  if (fs.existsSync(DECISIONS_DIR)) {
    for (const agent of fs.readdirSync(DECISIONS_DIR)) {
      const ap = path.join(DECISIONS_DIR, agent);
      if (!fs.statSync(ap).isDirectory()) continue;
      const f = path.join(ap, `decisions_c${cycle}.json`);
      if (!fs.existsSync(f)) continue;
      let data; try { data = JSON.parse(fs.readFileSync(f, 'utf-8')); } catch (e) {
        records.push({ source: `decision:${agent}`, shape: 'unparseable', initiativeId: null, trackerUpdates: {}, parseError: e.message }); continue;
      }
      records.push({ source: `decision:${agent}`, shape: 'object',
        initiativeId: resolveInitiativeId(data.trackerUpdates, data), trackerUpdates: data.trackerUpdates || {} });
    }
  }
  // voice files: output/civic-voice/*_c<cycle>.json
  if (fs.existsSync(VOICE_DIR)) {
    for (const f of fs.readdirSync(VOICE_DIR).filter(x => x.endsWith(`_c${cycle}.json`))) {
      const fp = path.join(VOICE_DIR, f);
      const basename = f.replace(`_c${cycle}.json`, ''); // PROJECT_FILE_TO_INIT key
      let data; try { data = JSON.parse(fs.readFileSync(fp, 'utf-8')); } catch (e) {
        records.push({ source: `voice:${f}`, shape: 'unparseable', initiativeId: null, trackerUpdates: {}, parseError: e.message }); continue;
      }
      const flat = Array.isArray(data);
      const statements = flat ? data : (data.statements || []);
      for (const s of statements) {
        if (!s || !hasTrackerWork(s.trackerUpdates)) continue;
        records.push({ source: `voice:${f}#${s.statementId || s.office || '?'}`,
          shape: flat ? 'flat-array-element' : 'object',
          // attributeInitiative = the pipeline's 4-signal resolver (topic-keyword +
          // project-file fallback) so the validator mirrors assembleDecisions exactly.
          initiativeId: attributeInitiative(s, basename), trackerUpdates: s.trackerUpdates });
      }
    }
  }
  return records;
}

function validateCycle(cycle) {
  const records = loadRecords(cycle);
  const res = validateRecords(records);
  return Object.assign({ cycle, recordCount: records.length }, res);
}

function printReport(r) {
  console.log(`\n=== Initiative_Tracker validation — cycle ${r.cycle} ===`);
  console.log(`${r.recordCount} trackerUpdates-bearing records | ${r.violations.length} violation(s) | ${r.warnings.length} warning(s) | ${r.stamps.length} stamp-flag(s)\n`);
  if (r.violations.length) {
    console.log('VIOLATIONS (HARD — resolve before write):');
    r.violations.forEach(v => console.log(`  ✗ [${v.code}] ${v.source}\n      ${v.detail}`));
    console.log('');
  }
  if (r.warnings.length) {
    console.log('WARNINGS (gate auto-normalizes; surfaced, not silent):');
    r.warnings.forEach(w => console.log(`  ! [${w.code}] ${w.source} — ${w.detail}`));
    console.log('');
  }
  if (r.stamps.length) {
    console.log('STAMP-FLAGS (gate will fill):');
    r.stamps.forEach(s => console.log(`  + [${s.code}] ${s.source} — ${s.detail}`));
    console.log('');
  }
  if (!r.violations.length && !r.warnings.length && !r.stamps.length) console.log('Clean — all trackerUpdates conform.\n');
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const ci = args.indexOf('--cycle');
  const cycle = ci >= 0 && args[ci + 1] ? parseInt(args[ci + 1], 10) : require('../lib/getCurrentCycle')();
  const r = validateCycle(cycle);
  printReport(r);
  process.exit(r.violations.length > 0 ? 1 : 0);
}

module.exports = { validateRecords, validateCycle, loadRecords, resolveInitiativeId };

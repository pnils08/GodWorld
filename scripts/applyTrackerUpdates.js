#!/usr/bin/env node
/**
 * applyTrackerUpdates.js — Write initiative agent decisions back to Google Sheets
 *
 * Reads decisions_c{XX}.json from each initiative agent directory, extracts
 * trackerUpdates, and writes them to the Initiative_Tracker sheet. This closes
 * the feedback loop: agent decisions actually change the world.
 *
 * S215 (civic.9b) — additionally walks voice statement JSONs under
 * output/civic-voice/*_c{XX}.json and enforces the trackerOwner schema
 * (`primary` / `secondary` / `advisory`) from
 * docs/plans/2026-05-11-civic-tracker-collision-schema.md. During the
 * deprecation window (C94-C95), missing `trackerOwner` defaults to `primary`
 * with a per-statement deprecation warning and collisions downgrade to
 * warnings (not failures). Strict enforcement engages once voice agents
 * migrate to carry the field; until then the existing decisions-JSON write
 * path remains authoritative.
 *
 * Usage:
 *   node scripts/applyTrackerUpdates.js [cycle]           # Dry run (default)
 *   node scripts/applyTrackerUpdates.js [cycle] --apply    # Write to sheet
 *
 * Reads from:
 *   output/city-civic-database/initiatives/{agent}/decisions_c{XX}.json  (write source)
 *   output/civic-voice/{office}_c{XX}.json                               (schema layer)
 *
 * Writes to:
 *   Initiative_Tracker sheet — columns: ImplementationPhase, MilestoneNotes,
 *   NextScheduledAction, NextActionCycle, LastUpdated
 *   output/civic_sentiment_c{XX}.json (apply-only post-S215)
 *
 * Run AFTER: initiative agents produce decisions
 * Run BEFORE: next cycle's buildInitiativePackets.js
 */

require('/root/GodWorld/lib/env');
const fs = require('fs');
const path = require('path');
const sheets = require('../lib/sheets');
// G-R3 (S246 ES-5) — reuse assembleDecisions' canonical voice-statement
// attribution (3-signal fallback incl. project-file + topic) so cascade
// sentiment counts every initiative the cascade touched, not just the subset
// whose statements carry an explicit InitiativeID. Safe to import: its main run
// is require.main-guarded.
const assemble = require('./assembleDecisions');

const ROOT = path.resolve(__dirname, '..');
const DECISIONS_DIR = path.join(ROOT, 'output/city-civic-database/initiatives');
const VOICE_DIR = path.join(ROOT, 'output/civic-voice');
const SHEET_NAME = 'Initiative_Tracker';
const APPLY = process.argv.includes('--apply');

// Columns we write back — must exist on Initiative_Tracker
const WRITEBACK_FIELDS = [
  'ImplementationPhase',
  'MilestoneNotes',
  'NextScheduledAction',
  'NextActionCycle'
];

// RB-4/ES-5 trackerOwner contract (S246; audit reconciled engine.20e, S256):
// trackerOwner names the INITIATIVE a statement owns (e.g. "INIT-002"), or
// "none"/absent — it is NOT the stale S215 primary/secondary/advisory role enum.
// A well-formed INIT-XXX or "none"/absent is valid; anything else (e.g. an
// office name like "okoro" leaking into the field) is a real schema violation.
const OWNER_FORM = /^INIT-\d+$/i;
const isValidOwnerForm = (v) => !v || v === 'none' || OWNER_FORM.test(v);
const SECONDARY_FOLD_CAP = 3;

const getCurrentCycle = require('../lib/getCurrentCycle');
const CYCLE = getCurrentCycle();

function findDecisionFiles(cycle) {
  const files = [];
  if (!fs.existsSync(DECISIONS_DIR)) return files;

  const agents = fs.readdirSync(DECISIONS_DIR).filter(d =>
    fs.statSync(path.join(DECISIONS_DIR, d)).isDirectory()
  );

  for (const agent of agents) {
    const decFile = path.join(DECISIONS_DIR, agent, `decisions_c${cycle}.json`);
    if (fs.existsSync(decFile)) {
      try {
        const data = JSON.parse(fs.readFileSync(decFile, 'utf-8'));
        if (data.trackerUpdates && Object.keys(data.trackerUpdates).length > 0) {
          files.push({
            agent,
            initiativeId: data.initiative || data.initiativeId,
            cycle: data.cycle,
            trackerUpdates: data.trackerUpdates,
            file: decFile
          });
        }
      } catch (e) {
        console.warn(`  WARNING: Could not parse ${decFile}: ${e.message}`);
      }
    }
  }
  return files;
}

// ─────────────────────────────────────────────────────────────────────────────
// Voice-statement schema audit (S215, civic.9b)
//
// Walks voice JSONs, surfaces trackerOwner-schema violations + collisions
// before the write phase runs. Returns { collisions, deprecation, byInitiative }.
// Side effects: prints schema state per statement; never blocks the write path
// during the deprecation window.
// ─────────────────────────────────────────────────────────────────────────────
function auditVoiceStatementSchema(cycle) {
  const byInitiative = {};
  let totalStatements = 0;
  let missingOwnerCount = 0;
  const deprecation = [];
  const collisions = [];

  if (!fs.existsSync(VOICE_DIR)) {
    return { collisions, deprecation, byInitiative, totalStatements };
  }

  const voiceFiles = fs.readdirSync(VOICE_DIR)
    .filter(f => f.endsWith(`_c${cycle}.json`));

  for (const f of voiceFiles) {
    const fp = path.join(VOICE_DIR, f);
    let data;
    try {
      data = JSON.parse(fs.readFileSync(fp, 'utf-8'));
    } catch (e) {
      console.warn(`  WARNING: Could not parse voice file ${f}: ${e.message}`);
      continue;
    }
    const statements = Array.isArray(data) ? data : (data.statements || []);
    for (const s of statements) {
      if (!s || !s.trackerUpdates || Object.keys(s.trackerUpdates).length === 0) continue;
      totalStatements++;
      // Resolve initiative ID from trackerUpdates first; fall back to first
      // relatedInitiatives entry; final fallback to UNKNOWN (caught downstream).
      const initId = s.trackerUpdates.InitiativeID
        || s.trackerUpdates.initiative
        || (s.relatedInitiatives || [])[0]
        || 'UNKNOWN';

      const rawOwner = s.trackerOwner;
      const ownerNorm = (rawOwner || '').toUpperCase(); // '' | 'NONE' | 'INIT-002' | malformed
      if (!rawOwner) {
        // No trackerOwner stamped. Under the RB-4/ES-5 contract the owning
        // project agent MUST carry its INIT-XXX or assembleDecisions can't pick
        // it as primary — the root of the G-R2 phase-drop (owned by civic.14).
        // Record as missing; it is NOT a violation and gets no default role.
        missingOwnerCount++;
        deprecation.push({
          office: s.office,
          statementId: s.statementId,
          initiative: initId,
          topic: s.topic,
        });
      } else if (!isValidOwnerForm(rawOwner)) {
        // Malformed value (office name, stale S215 role token, etc.). THIS is
        // the real schema violation the audit exists to surface — e.g. okoro
        // emitting trackerOwner="okoro" instead of "none".
        console.warn(`  SCHEMA VIOLATION: ${s.statementId} on ${initId} has trackerOwner="${rawOwner}" — expected an INIT-XXX id or "none".`);
      }
      // A statement OWNS its touched initiative iff trackerOwner names that init.
      const ownsInit = OWNER_FORM.test(rawOwner || '') && ownerNorm === String(initId).toUpperCase();

      if (!byInitiative[initId]) byInitiative[initId] = [];
      byInitiative[initId].push({
        office: s.office,
        statementId: s.statementId,
        topic: s.topic,
        owner: ownerNorm,
        ownsInit,
        trackerUpdates: s.trackerUpdates,
        ownerMissing: !rawOwner,
      });
    }
  }

  // Collision detection — >1 statement claiming ownership (trackerOwner===INIT)
  // of the SAME initiative. Under the contract each initiative has exactly one
  // owning project agent; two explicit owner-claims is always strict.
  for (const initId of Object.keys(byInitiative)) {
    const owners = byInitiative[initId].filter(s => s.ownsInit);
    if (owners.length > 1) {
      collisions.push({
        initiative: initId,
        primaries: owners.map(s => ({
          office: s.office,
          statementId: s.statementId,
          topic: s.topic,
          explicitField: true,
        })),
        strict: true,
      });
    }
  }

  return {
    collisions,
    deprecation,
    byInitiative,
    totalStatements,
    allMissing: missingOwnerCount === totalStatements && totalStatements > 0,
  };
}

function summarizeSchemaAudit(audit) {
  if (audit.totalStatements === 0) {
    console.log('  Voice schema: 0 statements with trackerUpdates — schema audit skipped.\n');
    return;
  }
  console.log(`  Voice schema: ${audit.totalStatements} statements with trackerUpdates across ${Object.keys(audit.byInitiative).length} initiatives.`);
  if (audit.allMissing) {
    console.log(`  MISSING-OWNER: 0 of ${audit.totalStatements} statements carry trackerOwner — ` +
      `owner-dispatch is dark; assembleDecisions falls back to priority weighting ` +
      `(G-R2 phase-drop risk; owned by civic.14).`);
  } else if (audit.deprecation.length > 0) {
    console.log(`  MISSING-OWNER: ${audit.deprecation.length} of ${audit.totalStatements} statements lack trackerOwner; their initiatives can't be owner-dispatched (civic.14):`);
    for (const d of audit.deprecation.slice(0, 8)) {
      console.log(`    - ${d.statementId} (${d.office}) on ${d.initiative}: ${d.topic}`);
    }
    if (audit.deprecation.length > 8) {
      console.log(`    ... ${audit.deprecation.length - 8} more`);
    }
  }
  if (audit.collisions.length > 0) {
    console.log('');
    for (const c of audit.collisions) {
      console.log(`  OWNER COLLISION on ${c.initiative} (cycle ${CYCLE}): ${c.primaries.length} statements claim trackerOwner==="${c.initiative}":`);
      for (let i = 0; i < c.primaries.length; i++) {
        const p = c.primaries[i];
        console.log(`    Owner claim ${i + 1}: ${p.office} — ${p.statementId} (topic: "${p.topic}")`);
      }
      console.log(`    Resolution: exactly one project agent owns an initiative — clear trackerOwner on the non-owning statement(s).`);
    }
  }
  console.log('');
}

async function main() {
  console.log(`\n=== applyTrackerUpdates.js — Cycle ${CYCLE} ${APPLY ? '(LIVE WRITE)' : '(DRY RUN)'} ===\n`);

  // S215 civic.9b — voice schema audit. Surface collisions + deprecation
  // pre-flight; non-blocking during the C94-C95 transition.
  const audit = auditVoiceStatementSchema(CYCLE);
  summarizeSchemaAudit(audit);

  // Find all decision files with tracker updates (existing write path)
  const decisions = findDecisionFiles(CYCLE);

  if (decisions.length === 0) {
    // Try previous cycle if current has none
    const prevDecisions = findDecisionFiles(CYCLE - 1);
    if (prevDecisions.length > 0) {
      console.log(`No decisions for C${CYCLE}. Found ${prevDecisions.length} from C${CYCLE - 1}.`);
      decisions.push(...prevDecisions);
    } else {
      console.log('No decision files with trackerUpdates found.');
      process.exit(0);
    }
  }

  console.log(`Found ${decisions.length} initiative decisions with tracker updates:\n`);

  // Read current tracker state from sheet
  let trackerRows;
  try {
    trackerRows = await sheets.getSheetAsObjects(SHEET_NAME);
  } catch (e) {
    console.error(`ERROR: Could not read ${SHEET_NAME}: ${e.message}`);
    process.exit(1);
  }

  console.log(`Initiative_Tracker: ${trackerRows.length} rows\n`);

  let updatedCount = 0;
  let skippedCount = 0;

  for (const dec of decisions) {
    console.log(`--- ${dec.agent} (${dec.initiativeId}) ---`);
    console.log(`  File: ${path.basename(dec.file)}`);

    // S215 civic.9b — secondary fold-in. NOTE (engine.20e, S256): under the
    // RB-4/ES-5 contract `owner` is now a normalized INIT-XXX, never the S215
    // role token 'secondary', so this filter yields [] and the fold-in is inert
    // — left intact (zero change to sheet writes); its redesign belongs to
    // civic.14, which owns the ownership contract end-to-end.
    const voiceStmts = audit.byInitiative[dec.initiativeId] || [];
    const secondaries = voiceStmts.filter(s => s.owner === 'secondary');
    const folded = secondaries.slice(0, SECONDARY_FOLD_CAP);
    const overflow = secondaries.slice(SECONDARY_FOLD_CAP);
    if (folded.length > 0) {
      const baseNote = (dec.trackerUpdates.MilestoneNotes || '').trim();
      const appended = folded
        .map(s => {
          const note = (s.trackerUpdates.MilestoneNotes || '').trim();
          return note ? `Also weighed in: ${s.office} — ${note}` : null;
        })
        .filter(Boolean);
      if (appended.length > 0) {
        dec.trackerUpdates.MilestoneNotes = baseNote
          ? `${baseNote} | ${appended.join(' | ')}`
          : appended.join(' | ');
        console.log(`  Folded ${appended.length} secondary note(s): ${folded.map(s => s.office).join(', ')}`);
      }
    }
    if (overflow.length > 0) {
      console.log(`  Demoted ${overflow.length} overflow secondary/secondaries to advisory: ${overflow.map(s => s.office + ' (' + s.statementId + ')').join(', ')}`);
    }

    // Find matching row by InitiativeID
    const rowIndex = trackerRows.findIndex(r =>
      r.InitiativeID === dec.initiativeId ||
      r.ID === dec.initiativeId ||
      r.id === dec.initiativeId
    );

    if (rowIndex === -1) {
      console.log(`  SKIP: No matching row for ${dec.initiativeId} in ${SHEET_NAME}`);
      skippedCount++;
      continue;
    }

    // Row number on the sheet (1-indexed, +2 for header row and 0-index offset)
    const sheetRow = rowIndex + 2;
    const currentRow = trackerRows[rowIndex];

    // Build the update fields — only write fields that exist in WRITEBACK_FIELDS
    const updates = {};
    for (const field of WRITEBACK_FIELDS) {
      if (dec.trackerUpdates[field] !== undefined) {
        const newVal = String(dec.trackerUpdates[field]);
        const oldVal = currentRow[field] || '';
        if (newVal !== oldVal) {
          updates[field] = newVal;
          console.log(`  ${field}: "${oldVal}" → "${newVal}"`);
        }
      }
    }

    // Always update LastUpdated
    const today = new Date().toLocaleDateString('en-US');
    if (Object.keys(updates).length > 0) {
      updates['LastUpdated'] = today;
    }

    if (Object.keys(updates).length === 0) {
      console.log('  No changes needed (already current)');
      skippedCount++;
      continue;
    }

    if (APPLY) {
      try {
        await sheets.updateRowFields(SHEET_NAME, sheetRow, updates);
        console.log(`  WRITTEN to row ${sheetRow} (${Object.keys(updates).length} fields)`);
        updatedCount++;
      } catch (e) {
        console.error(`  ERROR writing row ${sheetRow}: ${e.message}`);
      }
    } else {
      console.log(`  WOULD WRITE to row ${sheetRow} (${Object.keys(updates).length} fields)`);
      updatedCount++;
    }
    console.log('');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CIVIC VOICE SENTIMENT — aggregate across the whole cascade (S137b; G-R3 S246)
  // ═══════════════════════════════════════════════════════════════════════════
  // G-R3 (S246 ES-5): pre-fix sentiment scored only the `decisions` that hit the
  // tracker-write path (C95: 2 of 4, because (a) it iterated decisions not the
  // cascade and (b) brittle substring matching missed phase variants like
  // `design-development-active` / `active-construction-phase-2-planning`). With
  // 40 voice statements across 11 agents, deriving city temperature from 2
  // decisions undercounts the cascade by an order of magnitude. Fix: score EVERY
  // initiative that drew voice activity (audit.byInitiative), weight by statement
  // count (volume = cascade weight), and match phases by KEYWORD TOKEN so name
  // variants resolve. Engine Phase 2 reads civicVoiceSentiment.

  const PHASE_SENTIMENT = {
    'disbursement-active': 0.8, 'dispatch-live': 0.8, 'operational': 0.7,
    'construction-active': 0.6, 'implementation-active': 0.6, 'pilot-active': 0.5,
    'pilot_evaluation': 0.5, 'complete': 0.5, 'design-phase': 0.2,
    'visioning-complete': 0.1, 'legislation-filed': 0.1, 'vote-ready': 0.3,
    'vote-scheduled': 0, 'announced': 0, 'visioning': 0,
    'stalled': -0.6, 'blocked': -0.8, 'suspended': -0.7, 'defunded': -1.0
  };
  // Token fallback (checked in order) — resolves phase-name variants the exact
  // table misses. e.g. 'design-development-active' → design 0.3;
  // 'active-construction-phase-2-planning' → construction 0.6.
  const PHASE_TOKENS = [
    [/defund/, -1.0], [/block/, -0.8], [/suspend/, -0.7], [/stall/, -0.6],
    [/disburs/, 0.8], [/dispatch|live/, 0.8], [/operational/, 0.7],
    [/construction/, 0.6], [/implementation/, 0.6], [/pilot/, 0.5],
    [/complete/, 0.5], [/vote-ready|vote_ready/, 0.3], [/design/, 0.3],
    [/legislation|visioning/, 0.1], [/announce|vote-sched/, 0.0],
  ];
  function phaseScore(phase) {
    if (!phase) return undefined;
    if (PHASE_SENTIMENT[phase] !== undefined) return PHASE_SENTIMENT[phase];
    for (const pk of Object.keys(PHASE_SENTIMENT)) if (phase.indexOf(pk) >= 0) return PHASE_SENTIMENT[pk];
    for (const [re, s] of PHASE_TOKENS) if (re.test(phase)) return s;
    return undefined;
  }
  function phaseForInitiative(initId) {
    const dec = decisions.find(d => d.initiativeId === initId);
    let phase = dec ? (dec.trackerUpdates.ImplementationPhase || '').toLowerCase() : '';
    if (!phase) {
      const row = trackerRows.find(r => r.InitiativeID === initId || r.ID === initId || r.id === initId);
      if (row) phase = (row.ImplementationPhase || '').toLowerCase();
    }
    return phase;
  }

  // Cascade attribution via assembleDecisions' 3-signal grouping (project-file +
  // topic fallbacks) — the audit's narrower InitiativeID-only resolution drops
  // owner statements (no explicit InitiativeID) to UNKNOWN, which is what
  // undercounted sentiment to 2. Fall back to the audit if the grouping is empty.
  let cascadeCounts = {};
  try {
    const groups = assemble.buildGroups(assemble.loadVoiceFiles(CYCLE));
    for (const [initId, grp] of groups.entries()) cascadeCounts[initId] = grp.length;
  } catch (e) {
    console.warn(`  WARN: cascade grouping failed (${e.message}); falling back to audit attribution`);
    for (const k of Object.keys(audit.byInitiative)) cascadeCounts[k] = audit.byInitiative[k].length;
  }

  // Score across every initiative the cascade touched, weighted by statement count.
  const initiativesWithActivity = Object.keys(cascadeCounts).filter(k => k && k !== 'UNKNOWN');
  let weightedSum = 0, weightTotal = 0, initiativesScored = 0;
  const unscored = [];
  for (const initId of initiativesWithActivity) {
    const weight = cascadeCounts[initId]; // statement count
    const score = phaseScore(phaseForInitiative(initId));
    if (score === undefined) { unscored.push(initId); continue; }
    weightedSum += score * weight;
    weightTotal += weight;
    initiativesScored++;
  }
  const civicSentiment = weightTotal > 0 ? weightedSum / weightTotal : 0;
  const statementsScored = initiativesWithActivity
    .filter(k => unscored.indexOf(k) === -1)
    .reduce((n, k) => n + cascadeCounts[k], 0);
  const sentimentFile = path.join(ROOT, 'output', `civic_sentiment_c${CYCLE}.json`);

  const sentimentData = {
    cycle: CYCLE,
    civicVoiceSentiment: parseFloat(civicSentiment.toFixed(3)),
    statementsScored,
    initiativesScored,
    decisionsScored: initiativesScored, // back-compat field name
    derivation: 'statement-weighted across cascade (G-R3 S246)',
    timestamp: new Date().toISOString()
  };

  // S215 civic.9b (G-R15) — sentiment write is APPLY-gated (dry-run contract).
  console.log(`\nCivic Voice Sentiment: ${civicSentiment.toFixed(3)} (statement-weighted across ${initiativesScored} initiatives / ${statementsScored} statements)`);
  if (unscored.length > 0) console.log(`  (unscored — no resolvable phase: ${unscored.join(', ')})`);
  if (APPLY) {
    fs.writeFileSync(sentimentFile, JSON.stringify(sentimentData, null, 2));
    console.log(`Written to: ${path.basename(sentimentFile)}`);
  } else {
    console.log(`(dry-run — sentiment file NOT written; use --apply to persist)`);
  }

  console.log(`\n=== Summary ===`);
  console.log(`Updated: ${updatedCount} | Skipped: ${skippedCount} | Total: ${decisions.length}`);
  if (audit.collisions.length > 0) {
    const strictCount = audit.collisions.filter(c => c.strict).length;
    if (strictCount > 0) {
      console.log(`Schema collisions (strict, post-migration): ${strictCount} — fix upstream voice agents and re-run.`);
    } else {
      console.log(`Schema collisions (deprecation-warning): ${audit.collisions.length} — pre-migration default-primary expected.`);
    }
  }
  if (!APPLY && updatedCount > 0) {
    console.log(`\nDry run — use --apply to write to ${SHEET_NAME}`);
  }
  console.log('');
}

main().catch(e => { console.error(e); process.exit(1); });

#!/usr/bin/env node
/**
 * checkLetterEligibility.js — ES-2 step 1 (C97 G-W-C97-1), S257
 *
 * Deterministic engine backstop for the letters-candidate pool. The marquee C97
 * failure was NOT "Lucia Polito (POP-00004) got used" — she lives in the world.
 * It was that she got MISCAST: written as an ordinary 64-yo aura-wellness
 * practitioner penning a letter. She is an ENGINE FIELD-ACTOR — a continuous
 * positive presence-field ("Aura"/Codex-Linked; her card: "the city does not
 * know what she is. The newsroom has never written about her"). Her proper
 * context is unseen presence/texture, NOT a voiced citizen-source. Her affect
 * (presence → metrics) is genuinely uncoded today — the field-actor engine build
 * (autonomy-roadmap §2, sibling to chaos-cars engine.11) is the real root fix;
 * this gate is the stopgap that keeps field-actors out of citizen-SOURCE surfaces
 * (letters, quoted cameos) until their role is modeled. It does NOT remove them
 * from the world. ES-2 exists because the operator is the contamination source,
 * so the LLM-instruction screen (RB-2 sift Step 10 + letters-desk RULES) cannot
 * be the only gate — this is the mechanical, fail-loud half.
 *
 * INELIGIBLE (for citizen-source surfaces) =
 *   (a) on the explicit FIELD_ACTOR_ENTITIES canon list, OR
 *   (b) CitizenBio carries an unambiguous field-actor / metaphysical-entity marker.
 * A candidate whose POPID cannot be resolved on the ledger ALSO fails
 * (can't-verify == ineligible — never let an unresolvable name through).
 *
 * RECALL NOTE (verified S257 against live Simulation_Ledger): the field-actor
 * class has no dedicated column. Live scan found exactly ONE citizen carrying any
 * entity bio-marker (POP-00004). POP-00789 Elias Varek is Tier-1/ENGINE but has
 * an EMPTY bio — proof that a bio-regex alone has a hole: a future marker-free
 * field-actor would slip through. Therefore the explicit list is the authoritative
 * key (add field-actors here as canon defines them); the regex is the secondary
 * net for marker-carrying drift. Tier-1 is deliberately NOT the gate — Tier-1
 * includes the A's dynasty core + Mayor, who are voiced every cycle.
 *
 * USAGE:
 *   node scripts/checkLetterEligibility.js <cycle>            # screen output/letters/c<cycle>_candidates.md
 *   node scripts/checkLetterEligibility.js --file <path>      # screen a specific candidates file
 *   node scripts/checkLetterEligibility.js --popids POP-x,..  # screen an explicit POPID list
 * Exit 0 = all eligible; exit 1 = one or more ineligible/unresolvable (HALT).
 *
 * pipeline.70 seam 4 (2026-10-03): a file-based pool is ALSO screened for a page stance — each
 * candidate line must cite the citizen's own reflection doc `[cp-POP-xxxxx-c<N>-<slot>]` from
 * output/citizen_pages/index.jsonl (screenPageStance). No stance, no letter.
 *
 * SCOPE: letters-candidate pool. "Incidental cameos" (the gap's secondary ask)
 * are NOT screened here — that needs a compile-time byline→POPID map and is
 * explicitly DEFERRED (flagged, not silently dropped).
 */

'use strict';

const fs = require('fs');
const path = require('path');

// ── Canon field-actor list — authoritative gate key ────────────────────────
// Field-actors are citizens whose ROLE is a presence-field affect, not citizen
// sourcing — they belong in the world as texture, but must not be cast as a
// voiced letter-writer / quoted source. Seed: POP-00004 Lucia Polito ("Saint
// Lucia" / "The Gentle State of Balance"), the Codex-Linked Aura entity whose
// card states "the newsroom has never written about her." Extend when canon
// defines another field-actor whose bio may not carry a detectable marker (see
// RECALL NOTE). This is a STOPGAP — the durable fix is coding the affect
// (autonomy-roadmap §2 field-actor engine, sibling to engine.11).
const FIELD_ACTOR_ENTITIES = new Set(['POP-00004']);

// ── Secondary net — unambiguous field-actor / metaphysical bio phrasings ────
// Tightened to canon entity language (not generic flattery): a match almost
// certainly means a Codex/Aura field-actor. Catches marker-carrying entities not
// yet on the list; surfaces them so the list can be extended.
const ENTITY_BIO_MARKERS = /codex.?linked|in human form|earthly manifestation|the city does not know what (?:she|he|they) (?:is|are)|gentle state of balance/i;

const POPID_RE = /POP-\d{4,5}/g;

// Build the ineligible map from raw Simulation_Ledger rows.
// Returns Map<POPID, reason>.
function buildIneligibleMap(rows) {
  const out = new Map();
  if (!rows || !rows.length) return out;
  const headers = rows[0] || [];
  const popI = headers.indexOf('POPID');
  const bioI = headers.indexOf('CitizenBio');
  for (const popId of FIELD_ACTOR_ENTITIES) out.set(popId, 'field-actor entity (presence-role, not a citizen-source; affect not yet engine-coded)');
  if (popI === -1) return out;
  for (const row of rows.slice(1)) {
    const pop = String(row[popI] || '').trim();
    if (!pop) continue;
    const bio = bioI === -1 ? '' : String(row[bioI] || '');
    if (ENTITY_BIO_MARKERS.test(bio) && !out.has(pop)) {
      out.set(pop, 'bio entity-marker: "' + (bio.match(ENTITY_BIO_MARKERS) || [''])[0] + '"');
    }
  }
  return out;
}

// Set of all POPIDs present on the ledger (for unresolvable detection).
function buildLedgerPopIdSet(rows) {
  const set = new Set();
  if (!rows || !rows.length) return set;
  const popI = (rows[0] || []).indexOf('POPID');
  if (popI === -1) return set;
  for (const row of rows.slice(1)) {
    const pop = String(row[popI] || '').trim();
    if (pop) set.add(pop);
  }
  return set;
}

// Extract candidate POPIDs from a candidates.md file body.
// G-S4 (C99): scope extraction to the "## Candidate pool" section when present,
// so POPIDs named in an editorial header / "hard exclusions" line or the Notes
// section don't trip a false-positive HALT (a POPID *listed as excluded* is not
// a candidate). Falls back to the whole string for --popids lists and any file
// without the heading, so existing callers are unaffected.
function extractCandidatePopIds(text) {
  let scope = String(text || '');
  const m = scope.match(/^##\s+Candidate pool\s*$/im);
  if (m) {
    const rest = scope.slice(m.index + m[0].length);
    const next = rest.search(/^##\s+/im);
    scope = next === -1 ? rest : rest.slice(0, next);
  }
  const ids = scope.match(POPID_RE) || [];
  return [...new Set(ids)];
}

// pipeline.70 seam 4 (builder ruling 2026-10-03 02:05): a letter-writer is a citizen whose own
// page carries a stance on the topic, or there is no letter on that topic. The topic half is the
// LLM first line (sift Step 10 draws the pool from output/slices/c{N}/pulse.md and cites the page
// doc); this is the mechanical backstop: every candidate line must cite a page doc
// `[cp-POP-xxxxx-c<N>-<slot>]` that exists in output/citizen_pages/index.jsonl, belongs to that
// POPID, and is a `reflection` (a tension doc is the question they carry, not their words).
// Missing index = can't-verify = HALT, with the dump command named.
const PAGE_CITE_RE = /\[(cp-(POP-\d{5})-c\d+-[A-Za-z-]+)\]/;
function extractCandidateLines(text) {
  let scope = String(text || '');
  const m = scope.match(/^##\s+Candidate pool\s*$/im);
  if (m) {
    const rest = scope.slice(m.index + m[0].length);
    const next = rest.search(/^##\s+/im);
    scope = next === -1 ? rest : rest.slice(0, next);
  }
  const one = new RegExp(POPID_RE.source); // POPID_RE is /g — a stateful .test() would skip every other line
  return scope.split(/\r?\n/).filter((l) => one.test(l));
}
// screenPageStance(lines, index) -> { ok: [popId], failed: [{ popId, reason }] }
//   index: rows from scanCitizenPages.loadIndex() (or a test fixture); null = no index on disk.
function screenPageStance(lines, index) {
  const ok = [], failed = [];
  if (!Array.isArray(index)) {
    for (const l of lines) for (const pop of new Set(l.match(POPID_RE) || [])) failed.push({ popId: pop, reason: 'no page index on disk — run `node scripts/scanCitizenPages.js --dump` (can\'t-verify = ineligible)' });
    return { ok, failed };
  }
  const byId = new Map(index.map((r) => [r.customId, r]));
  for (const l of lines) {
    // One writer per line: every POPID on the line is a candidate and is screened; two POPIDs on one
    // line is ambiguous and fails both (codex review 2026-10-03: a second POPID used to ride unscreened).
    const popsOnLine = [...new Set(l.replace(PAGE_CITE_RE, '').match(POPID_RE) || [])];
    if (!popsOnLine.length) continue;
    if (popsOnLine.length > 1) { for (const pop of popsOnLine) failed.push({ popId: pop, reason: 'more than one POPID on a candidate line (' + popsOnLine.join(', ') + ') — one writer per line, each with their own page citation' }); continue; }
    const pop = popsOnLine[0];
    const cite = l.match(PAGE_CITE_RE);
    if (!cite) { failed.push({ popId: pop, reason: 'no page citation [cp-POP-…-c<N>-<slot>] on the candidate line — a letter-writer has a stance on their own page, or no letter' }); continue; }
    const doc = byId.get(cite[1]);
    if (!doc) { failed.push({ popId: pop, reason: 'cited page ' + cite[1] + ' is not in the index' }); continue; }
    if (cite[2] !== pop || doc.popId !== pop) { failed.push({ popId: pop, reason: 'cited page ' + cite[1] + ' belongs to ' + doc.popId + ', not ' + pop }); continue; }
    if (doc.type !== 'reflection') { failed.push({ popId: pop, reason: 'cited page ' + cite[1] + ' is a ' + doc.type + ' doc (the question they carry), not their words' }); continue; }
    ok.push(pop);
  }
  return { ok, failed };
}

// Screen a list of candidate POPIDs. Returns { eligible, ineligible, unresolvable }.
//   ineligible:  [{ popId, reason }]
//   unresolvable: [popId] — present in the pool but not on the ledger (can't-verify)
function screenCandidates(candidatePopIds, ineligibleMap, ledgerPopIds) {
  const eligible = [], ineligible = [], unresolvable = [];
  for (const pop of candidatePopIds) {
    if (ineligibleMap.has(pop)) ineligible.push({ popId: pop, reason: ineligibleMap.get(pop) });
    else if (ledgerPopIds && ledgerPopIds.size && !ledgerPopIds.has(pop)) unresolvable.push(pop);
    else eligible.push(pop);
  }
  return { eligible, ineligible, unresolvable };
}

async function main() {
  require('dotenv').config({ path: path.join(require('os').homedir(), '.config/godworld/.env') });
  const args = process.argv.slice(2);
  let filePath = null, popidArg = null, cycle = null;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--file') filePath = args[++i];
    else if (args[i] === '--popids') popidArg = args[++i];
    else if (/^\d+$/.test(args[i])) cycle = args[i];
  }

  let candidateIds;
  let source;
  if (popidArg) {
    candidateIds = extractCandidatePopIds(popidArg);
    source = '--popids';
  } else {
    if (!filePath) {
      if (!cycle) {
        console.error('Usage: node scripts/checkLetterEligibility.js <cycle> | --file <path> | --popids POP-x,...');
        process.exit(2);
      }
      filePath = path.join(__dirname, '..', 'output', 'letters', 'c' + cycle + '_candidates.md');
    }
    if (!fs.existsSync(filePath)) {
      console.error('Error: candidates file not found at ' + filePath);
      process.exit(2);
    }
    candidateIds = extractCandidatePopIds(fs.readFileSync(filePath, 'utf8'));
    source = filePath;
  }

  if (candidateIds.length === 0) {
    console.error('Error: no POPIDs found in ' + source + ' — a letters candidate pool with no resolvable POPIDs cannot be verified.');
    process.exit(1);
  }

  const sheets = require('../lib/sheets');
  const rows = await sheets.getSheetData('Simulation_Ledger');
  const ineligibleMap = buildIneligibleMap(rows);
  const ledgerPopIds = buildLedgerPopIdSet(rows);
  const { eligible, ineligible, unresolvable } = screenCandidates(candidateIds, ineligibleMap, ledgerPopIds);

  console.log('Letter-eligibility gate — ' + source);
  console.log('  candidates: ' + candidateIds.length + ' | eligible: ' + eligible.length +
              ' | INELIGIBLE: ' + ineligible.length + ' | unresolvable: ' + unresolvable.length);
  ineligible.forEach((x) => console.error('  ✗ INELIGIBLE ' + x.popId + ' — ' + x.reason));
  unresolvable.forEach((p) => console.error('  ✗ UNRESOLVABLE ' + p + ' — not on Simulation_Ledger (can\'t-verify = ineligible)'));

  // pipeline.70 seam 4 — the page-stance backstop (file-based pools only; --popids has no lines to cite from).
  let pageFailed = [];
  if (!popidArg) {
    const pages = require('./scanCitizenPages');
    const index = fs.existsSync(pages.INDEX_PATH) ? pages.loadIndex() : null;
    const stance = screenPageStance(extractCandidateLines(fs.readFileSync(filePath, 'utf8')), index);
    pageFailed = stance.failed;
    const okSet = new Set(stance.ok);
    for (const pop of candidateIds) if (!okSet.has(pop) && !pageFailed.some((f) => f.popId === pop)) pageFailed.push({ popId: pop, reason: 'in the pool but on no screened candidate line' });
    console.log('  page stance (pipeline.70): cited ' + stance.ok.length + ' | NO STANCE: ' + pageFailed.length);
    pageFailed.forEach((x) => console.error('  ✗ NO PAGE STANCE ' + x.popId + ' — ' + x.reason));
  }

  if (ineligible.length > 0 || unresolvable.length > 0 || pageFailed.length > 0) {
    console.error('\nHALT: letters candidate pool contains ineligible/unresolvable/no-stance entries. Remove them before letters-desk selection.');
    process.exit(1);
  }
  console.log('  ✓ all candidates eligible.');
  process.exit(0);
}

module.exports = {
  PAGE_CITE_RE,
  extractCandidateLines,
  screenPageStance,
  FIELD_ACTOR_ENTITIES,
  ENTITY_BIO_MARKERS,
  buildIneligibleMap,
  buildLedgerPopIdSet,
  extractCandidatePopIds,
  screenCandidates,
};

if (require.main === module) {
  main().catch((e) => { console.error('[FATAL]', e.message); process.exit(2); });
}

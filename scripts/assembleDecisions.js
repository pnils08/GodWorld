#!/usr/bin/env node
/**
 * assembleDecisions.js — Bridge civic-voice JSONs → decisions_c<XX>.json
 *
 * [engine/sheet] — S197 BUNDLE-D (closes G-R14)
 *
 * /city-hall Step 6 used to require ~15 min of hand-assembly per cycle:
 * read every output/civic-voice/*_c<XX>.json, group statements by
 * trackerUpdates.initiative, identify a primary voice, concatenate
 * MilestoneNotes, write the per-initiative decisions file. This script
 * does the assembly mechanically.
 *
 * Voice priority for primary determination (highest wins):
 *   1. Mayor
 *   2. Project owner (the project agent for that specific initiative)
 *   3. Faction spokesperson (OPP / CRC) on bloc-relevant statements
 *   4. IND swing (Vega / Tran) when they sponsor or amend
 *   5. Department head (Chief / DA) on operational statements
 *   6. Any other statement attached to the initiative
 *
 * Initiative attribution falls back through three signals when
 * `trackerUpdates.initiative` is empty (S193 G-R8 surfaced this — Transit
 * Hub statements had empty trackerUpdates because the agent didn't echo
 * the INIT-ID; the assembly still needs to attribute them to INIT-003):
 *   1. statement.trackerUpdates.initiative (when present)
 *   2. statement.relatedInitiatives[0] (when array has one entry)
 *   3. Project-file name → canonical INIT- ID (when the voice file is the
 *      project owner — e.g., transit_hub_c93.json statements default to
 *      INIT-003 unless explicitly tagged with another initiative)
 *
 * Usage:
 *   node scripts/assembleDecisions.js <cycle> [--apply]
 *   node scripts/assembleDecisions.js 93                # dry-run (default)
 *   node scripts/assembleDecisions.js 93 --apply        # writes the 6 files
 *
 * Default --dry-run prints per-initiative summaries to stdout. --apply
 * writes output/city-civic-database/initiatives/<slug>/decisions_c<XX>.json
 * for every initiative that has at least one attributed statement.
 *
 * Acceptance (BUNDLE-D): C93 voice JSONs produce 6 decisions files
 * matching the manual hand-assembly outputs already filed.
 */

const fs = require('fs');
const path = require('path');

// ────────────────────────────────────────────────────────────────────────────
// Config — initiative + voice metadata
// ────────────────────────────────────────────────────────────────────────────

// INIT-XXX → directory slug. Add new initiatives here as the canon expands.
const INIT_TO_SLUG = {
  'INIT-001': 'stabilization-fund',
  'INIT-002': 'oari',
  'INIT-003': 'transit-hub',
  'INIT-005': 'health-center',
  'INIT-006': 'baylight',
  'INIT-007': 'youth-apprenticeship',
};

// Project-owner voice file (without _c<XX>.json) → INIT-XXX. Used for
// fallback attribution when statement.trackerUpdates.initiative is empty.
const PROJECT_FILE_TO_INIT = {
  'stabilization_fund': 'INIT-001',
  'oari': 'INIT-002',
  'transit_hub': 'INIT-003',
  'health_center': 'INIT-005',
  'baylight_authority': 'INIT-006',
};

// Topic-keyword → INIT-XXX inferrer. C93 surfaced bad relatedInitiatives
// data on Vega's statement (claimed INIT-006, actually about INIT-003 per
// the topic 'transit-nov-8-vote'). When trackerUpdates.initiative is
// empty, this map overrides relatedInitiatives if the topic signals a
// different initiative — better signal-to-noise than trusting potentially-
// stale array fields. Patterns are checked in declaration order.
//
// Regex discipline: hyphens are LITERAL not wildcards. Topics are kebab-
// case (`transit-nov-8-vote`); use `\b` word boundaries with explicit
// keywords. Avoid broad tokens that match unrelated topics — e.g.
// "crisis-response" is OARI-adjacent but appears in Mayor grief statements
// that aren't OARI-coded; use `oari` alone instead.
const TOPIC_KEYWORD_TO_INIT = [
  { re: /\b(transit-hub|fruitvale-transit|transit-nov|cba-deliverables?)\b/i, init: 'INIT-003' },
  { re: /\b(oari|alternative-response-initiative)\b/i, init: 'INIT-002' },
  { re: /\b(stabilization-fund|stab-fund|stab-fnd|fund-clearance)\b/i, init: 'INIT-001' },
  { re: /\b(health-center|temescal-clinic|hcai)\b/i, init: 'INIT-005' },
  { re: /\b(baylight|phase-ii|phase-2-rfp)\b/i, init: 'INIT-006' },
  { re: /\b(apprenticeship|youth-apprentice)\b/i, init: 'INIT-007' },
];

// Voice priority weight (higher = more authoritative for "primary voice").
// Tie-break: earliest statementId in the input ordering wins.
const VOICE_PRIORITY = {
  mayor: 100,
  project_owner: 80,
  ind_swing: 60,           // Vega / Tran sponsorships often define the floor
  opp_faction: 50,
  crc_faction: 50,
  district_attorney: 45,
  police_chief: 45,
  baylight_authority: 80,  // also project owner; resolved via voiceFor()
  health_center: 80,
  oari: 80,
  stabilization_fund: 80,
  transit_hub: 80,
};

// Voice-file basename → display label for `consolidatedFrom` rendering.
const VOICE_LABEL = {
  mayor: 'Mayor',
  police_chief: 'Chief',
  district_attorney: 'DA',
  opp_faction: 'OPP',
  crc_faction: 'CRC',
  ind_swing: 'IND',
  baylight_authority: 'Ramos',
  health_center: 'Chen-Ramirez',
  oari: 'Tran-Muñoz',
  stabilization_fund: 'Webb',
  transit_hub: 'Soria Dominguez',
};

// ────────────────────────────────────────────────────────────────────────────
// CLI
// ────────────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const cycleArg = args.find(a => /^\d+$/.test(a));
const apply = args.includes('--apply');
if (!cycleArg) {
  console.error('Usage: node scripts/assembleDecisions.js <cycle> [--apply]');
  process.exit(2);
}
const cycle = parseInt(cycleArg, 10);

// ────────────────────────────────────────────────────────────────────────────
// Load + normalize voice JSONs
// ────────────────────────────────────────────────────────────────────────────
function loadVoiceFiles(cycle) {
  const dir = path.resolve(__dirname, '..', 'output', 'civic-voice');
  if (!fs.existsSync(dir)) {
    console.error('[ERROR] civic-voice directory not found: ' + dir);
    process.exit(1);
  }
  const files = fs.readdirSync(dir)
    .filter(f => f.endsWith(`_c${cycle}.json`))
    .map(f => ({ filename: f, path: path.join(dir, f), basename: f.replace(`_c${cycle}.json`, '') }));

  const voices = [];
  for (const f of files) {
    const raw = JSON.parse(fs.readFileSync(f.path, 'utf8'));
    // S193 G-R9 fix produced two shapes — flat array OR { statements: [...] }
    const statements = Array.isArray(raw) ? raw
      : (Array.isArray(raw && raw.statements) ? raw.statements : []);
    voices.push({ basename: f.basename, filename: f.filename, statements });
  }
  return voices;
}

// ────────────────────────────────────────────────────────────────────────────
// Initiative attribution per statement (3-signal fallback)
// ────────────────────────────────────────────────────────────────────────────
function attributeInitiative(statement, voiceBasename) {
  const tu = statement.trackerUpdates || {};
  if (tu.initiative && /^INIT-\d{3}$/.test(tu.initiative)) return tu.initiative;

  // Topic-keyword check happens BEFORE relatedInitiatives because that
  // field has surfaced as data-buggy in C93 (Vega INIT-006 → topic clearly
  // INIT-003). Topic strings are written by the voice agent and tend to
  // be reliable; relatedInitiatives is a manually-set array that drifts.
  const topic = (statement.topic || '').toString();
  if (topic) {
    for (const { re, init } of TOPIC_KEYWORD_TO_INIT) {
      if (re.test(topic)) return init;
    }
  }

  const ri = statement.relatedInitiatives || [];
  if (ri.length === 1 && /^INIT-\d{3}$/.test(ri[0])) return ri[0];
  // Project-file fallback: statement on a project agent's file, no explicit
  // initiative attribution — assume it's about the project's own initiative.
  if (PROJECT_FILE_TO_INIT[voiceBasename]) return PROJECT_FILE_TO_INIT[voiceBasename];
  return null;
}

// ────────────────────────────────────────────────────────────────────────────
// Voice classification — used for priority weighting + project-owner check
// ────────────────────────────────────────────────────────────────────────────
function voiceFor(basename, init) {
  // The project-owner-for-this-initiative gets the project_owner weight;
  // a project agent speaking about a different initiative gets its own weight.
  if (PROJECT_FILE_TO_INIT[basename] === init) return 'project_owner';
  return basename;
}

function priorityFor(basename, init, statement) {
  let score = VOICE_PRIORITY[voiceFor(basename, init)] ?? 10;
  // Vote-position boost: when a statement is a council vote stance (YES /
  // NO / ABSTAIN / "procedural-affirmation-and-vote" / etc.), the voting
  // voice is more authoritative than the project owner's operational
  // status. Closes the INIT-003 manual-vs-script primary mismatch — Vega
  // (vote stance) wins over Soria Dominguez (operational) for transit-hub.
  // Only fires for council-aligned voices (IND/OPP/CRC); project agents
  // don't carry vote stances.
  if (statement && /ind|opp|crc/.test(basename)) {
    const pos = (statement.position || '').toString().toLowerCase();
    const votey = /\b(vote|yes|no|abstain|amendment.sponsor|affirmation)\b/.test(pos);
    if (votey) score = Math.max(score, 90);
  }
  // Explicit-tu-init tiebreaker (+0.5): when two same-priority statements
  // collide (two Mayor statements both attributed to INIT-001), prefer the
  // one with explicit `trackerUpdates.initiative` set over a statement
  // attributed via the relatedInitiatives or topic-keyword fallback. Keeps
  // operational-directive statements ahead of contextual mentions.
  // Closes the INIT-001 MAYOR-002-vs-MAYOR-003 manual-vs-script mismatch.
  const tu = (statement && statement.trackerUpdates) || {};
  if (tu.initiative && /^INIT-\d{3}$/.test(tu.initiative)) score += 0.5;
  return score;
}

// ────────────────────────────────────────────────────────────────────────────
// Build per-initiative groups
// ────────────────────────────────────────────────────────────────────────────
function buildGroups(voices) {
  const groups = new Map(); // initId → [{ statement, voiceBasename }, ...]
  for (const voice of voices) {
    for (const stmt of voice.statements) {
      const init = attributeInitiative(stmt, voice.basename);
      if (!init) continue;
      if (!groups.has(init)) groups.set(init, []);
      groups.get(init).push({ statement: stmt, voiceBasename: voice.basename });
    }
  }
  return groups;
}

// ────────────────────────────────────────────────────────────────────────────
// Pick primary voice for an initiative
// ────────────────────────────────────────────────────────────────────────────
function pickPrimary(group, init) {
  let best = null;
  let bestScore = -1;
  for (let i = 0; i < group.length; i++) {
    const score = priorityFor(group[i].voiceBasename, init, group[i].statement);
    if (score > bestScore) {
      best = group[i];
      bestScore = score;
    }
  }
  return best;
}

// ────────────────────────────────────────────────────────────────────────────
// Render consolidatedFrom strings
// ────────────────────────────────────────────────────────────────────────────
function renderConsolidatedFrom(group) {
  return group.map(({ statement, voiceBasename }) => {
    const stmtId = statement.statementId || '<no-id>';
    const label = VOICE_LABEL[voiceBasename] || voiceBasename;
    const summary = (statement.position || statement.topic || statement.subject || '').toString().trim();
    const trimmedSummary = summary.length > 80 ? summary.slice(0, 77) + '...' : summary;
    return trimmedSummary
      ? `${stmtId} (${label} — ${trimmedSummary})`
      : `${stmtId} (${label})`;
  });
}

// ────────────────────────────────────────────────────────────────────────────
// Concatenate MilestoneNotes (primary first, then others in group order)
// ────────────────────────────────────────────────────────────────────────────
function concatMilestoneNotes(group, primary, cycle) {
  const ordered = [primary, ...group.filter(g => g !== primary)];
  const notes = ordered
    .map(g => (g.statement.trackerUpdates || {}).MilestoneNotes)
    .filter(n => n && typeof n === 'string' && n.trim());
  if (notes.length === 0) return '';
  // Strip any leading "C<cycle>: " that would duplicate after merge
  const head = notes[0].trim();
  const tail = notes.slice(1)
    .map(n => n.trim().replace(new RegExp(`^C${cycle}:\\s*`), ''))
    .filter(Boolean);
  return tail.length > 0
    ? head + ' / ' + tail.join(' / ')
    : head;
}

// ────────────────────────────────────────────────────────────────────────────
// Build decisions object for one initiative
// ────────────────────────────────────────────────────────────────────────────
function buildDecisions(init, group, cycle) {
  const primary = pickPrimary(group, init);
  const primaryTU = (primary.statement.trackerUpdates) || {};
  const slug = INIT_TO_SLUG[init] || init.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const primaryLabel = VOICE_LABEL[voiceFor(primary.voiceBasename, init)]
    || VOICE_LABEL[primary.voiceBasename]
    || primary.voiceBasename;
  const stmtIdShort = (primary.statement.statementId || '')
    .replace(/^STMT-\d+-/, '');

  const out = {
    initiative: init,
    initiativeId: init,
    cycle,
    primaryVoice: stmtIdShort
      ? `${primaryLabel} (${stmtIdShort})`
      : primaryLabel,
    consolidatedFrom: renderConsolidatedFrom(group),
    trackerUpdates: {
      InitiativeID: init,
    },
  };

  // Take primary's structural fields when present
  if (primaryTU.ImplementationPhase) out.trackerUpdates.ImplementationPhase = primaryTU.ImplementationPhase;
  const merged = concatMilestoneNotes(group, primary, cycle);
  if (merged) out.trackerUpdates.MilestoneNotes = merged;
  if (primaryTU.NextScheduledAction) out.trackerUpdates.NextScheduledAction = primaryTU.NextScheduledAction;
  if (primaryTU.NextActionCycle) out.trackerUpdates.NextActionCycle = primaryTU.NextActionCycle;

  return { slug, payload: out };
}

// ────────────────────────────────────────────────────────────────────────────
// Main
// ────────────────────────────────────────────────────────────────────────────
const voices = loadVoiceFiles(cycle);
const groups = buildGroups(voices);

console.log(`assembleDecisions C${cycle} — ${voices.length} voice files, ${groups.size} initiatives attributed`);
console.log(`Mode: ${apply ? 'APPLY (writes)' : 'DRY-RUN (preview)'}`);
console.log('');

const baseDir = path.resolve(__dirname, '..', 'output', 'city-civic-database', 'initiatives');
const writes = [];

for (const [init, group] of [...groups.entries()].sort()) {
  const { slug, payload } = buildDecisions(init, group, cycle);
  const targetDir = path.join(baseDir, slug);
  const targetFile = path.join(targetDir, `decisions_c${cycle}.json`);

  console.log(`${init} → ${slug}/decisions_c${cycle}.json`);
  console.log(`  primary: ${payload.primaryVoice}`);
  console.log(`  contributing statements: ${group.length}`);
  console.log(`  trackerUpdates fields: ${Object.keys(payload.trackerUpdates).join(', ')}`);

  if (apply) {
    if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
    fs.writeFileSync(targetFile, JSON.stringify(payload, null, 2));
    writes.push(targetFile);
  }
  console.log('');
}

if (apply) {
  console.log(`Wrote ${writes.length} decisions files.`);
} else {
  console.log('Re-run with --apply to write the files.');
}

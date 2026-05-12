#!/usr/bin/env node
/**
 * cascadeMayorDecisions.js — Mayor → downstream-voices targeted cascade
 * [engine/sheet] — closes civic.9b (S215) along with applyTrackerUpdates.js
 * refactor + CASCADE_ROUTING.md seed.
 *
 * Pre-fix (G-R1): city-hall Step 4 hand-built one cascade block summarizing
 * all Mayor decisions and appended it to ALL 10 downstream voices'
 * pending_decisions.md. Noisy + over-inclusive (~3 min/cycle of operator
 * time + each downstream voice received cascade context irrelevant to its
 * portfolio).
 *
 * Post-fix: this script reads `output/civic-voice/mayor_c{XX}.json` +
 * `.claude/skills/city-hall/CASCADE_ROUTING.md` and writes targeted
 * append-blocks to each routed downstream voice's pending_decisions.md.
 * Missing routing entry → broadcast fallback (cascade to all 10) AND log a
 * missing-route warning, so incomplete routing tables don't block cycle
 * execution.
 *
 * Idempotent: re-running with the same mayor_c{XX}.json strips any
 * pre-existing `## Mayor cascade — C{XX}` block from the target before
 * appending the new one. Re-runs don't stack.
 *
 * Usage:
 *   node scripts/cascadeMayorDecisions.js --cycle 93
 *   node scripts/cascadeMayorDecisions.js --cycle 93 --dry-run
 *
 * Flags:
 *   --cycle N          Required. The cycle whose Mayor JSON drives the cascade.
 *   --dry-run          Print what would be appended without writing the files.
 *   --routing PATH     Override the routing-table path (default:
 *                      .claude/skills/city-hall/CASCADE_ROUTING.md).
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DEFAULT_ROUTING = path.join(ROOT, '.claude/skills/city-hall/CASCADE_ROUTING.md');
const VOICE_DIR = path.join(ROOT, 'output/civic-voice');
const WORKSPACE_DIR = path.join(ROOT, 'output/civic-voice-workspace');

// Full broadcast fallback — every downstream voice listed in the routing
// table at least once. Kept in sync with VOICE_DIR conventions; if a new
// agent comes online, add it here so missing-route fallback covers them too.
const ALL_DOWNSTREAM_VOICES = [
  'civic-office-okoro',
  'civic-office-police-chief',
  'civic-office-district-attorney',
  'civic-office-opp-faction',
  'civic-office-crc-faction',
  'civic-office-ind-swing',
  'civic-office-baylight-authority',
  'civic-project-stabilization-fund',
  'civic-project-oari',
  'civic-project-transit-hub',
  'civic-project-health-center',
];

function parseArg(name) {
  const i = process.argv.indexOf('--' + name);
  if (i === -1 || i === process.argv.length - 1) return null;
  return process.argv[i + 1];
}

function parseCycle() {
  const raw = parseArg('cycle');
  if (!raw) {
    console.error('[ERROR] --cycle N is required');
    process.exit(1);
  }
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) {
    console.error('[ERROR] --cycle must be a positive integer');
    process.exit(1);
  }
  return n;
}

const cycle = parseCycle();
const dryRun = process.argv.includes('--dry-run');
const routingPath = path.resolve(parseArg('routing') || DEFAULT_ROUTING);

// ─────────────────────────────────────────────────────────────────────────────
// PARSE ROUTING TABLE
// ─────────────────────────────────────────────────────────────────────────────
// Format: `## INIT-NNN — <name>` sections, each followed by
// `- Cascade to: <agent-directory-name>` bullets. Other bullet text within a
// section is ignored. Top-level non-INIT sections are ignored.

function parseRoutingTable(text) {
  const routes = {};
  const lines = text.split('\n');
  let currentInit = null;
  for (const rawLine of lines) {
    const line = rawLine.trim();
    const sectionMatch = line.match(/^##\s+(INIT-\d+)(?:\s+—.*)?$/);
    if (sectionMatch) {
      currentInit = sectionMatch[1];
      routes[currentInit] = [];
      continue;
    }
    // Reset on top-level non-INIT section header (e.g., `## Adding a new...`).
    const otherSection = line.match(/^##\s+(?!INIT-\d+)/);
    if (otherSection) {
      currentInit = null;
      continue;
    }
    if (!currentInit) continue;
    const routeMatch = line.match(/^[-*]\s*Cascade to:\s*([\w-]+)/i);
    if (routeMatch) {
      const target = routeMatch[1].trim();
      if (routes[currentInit].indexOf(target) === -1) {
        routes[currentInit].push(target);
      }
    }
  }
  return routes;
}

// ─────────────────────────────────────────────────────────────────────────────
// GROUP MAYOR STATEMENTS BY INITIATIVE
// ─────────────────────────────────────────────────────────────────────────────

function groupStatementsByInitiative(statements) {
  const groups = {};
  for (const s of statements) {
    if (!s) continue;
    const ids = new Set();
    if (s.trackerUpdates) {
      const idsFromUpdates = s.trackerUpdates.InitiativeID
        || s.trackerUpdates.initiative;
      if (idsFromUpdates) ids.add(idsFromUpdates);
    }
    if (Array.isArray(s.relatedInitiatives)) {
      for (const id of s.relatedInitiatives) {
        if (id) ids.add(id);
      }
    }
    if (ids.size === 0) {
      // Mayor statement without an initiative anchor — skip cascade routing.
      // (Statements like emergency-response or city-mood positioning don't
      // need initiative-keyed cascade; they reach voices via Step 4 prose.)
      continue;
    }
    for (const id of ids) {
      if (!groups[id]) groups[id] = [];
      groups[id].push(s);
    }
  }
  return groups;
}

// ─────────────────────────────────────────────────────────────────────────────
// BUILD APPEND BLOCK
// ─────────────────────────────────────────────────────────────────────────────

function formatStatementBlock(s) {
  const lines = [];
  const topic = s.topic || '(no topic)';
  const position = s.position || '';
  lines.push(`- **${s.statementId || '(no ID)'}** — ${topic}` +
    (position ? ` (position: ${position})` : ''));
  if (s.quote) {
    lines.push(`  > "${s.quote.replace(/\s+/g, ' ').trim()}"`);
  }
  if (s.trackerUpdates) {
    const phase = s.trackerUpdates.ImplementationPhase;
    const next = s.trackerUpdates.NextScheduledAction;
    const nextCycle = s.trackerUpdates.NextActionCycle;
    if (phase) lines.push(`  - Phase: ${phase}`);
    if (next) lines.push(`  - Next action: ${next}` + (nextCycle ? ` (C${nextCycle})` : ''));
  }
  return lines.join('\n');
}

function buildCascadeBlock(initiative, mayorStatements, sourceCycle) {
  const lines = [];
  lines.push(`## Mayor cascade — C${sourceCycle}`);
  lines.push('');
  lines.push(`*Auto-generated by \`scripts/cascadeMayorDecisions.js\` — Mayor's C${sourceCycle} statements relevant to your portfolio.*`);
  lines.push('');
  lines.push(`### ${initiative}`);
  lines.push('');
  for (const s of mayorStatements) {
    lines.push(formatStatementBlock(s));
    lines.push('');
  }
  return lines.join('\n').trimEnd() + '\n';
}

// ─────────────────────────────────────────────────────────────────────────────
// APPEND TO TARGET (idempotent)
// ─────────────────────────────────────────────────────────────────────────────
// Strip any pre-existing `## Mayor cascade — C{cycle}` block from the target
// before appending the new one. Block ends at next `## ` heading or EOF.

function stripExistingBlock(text, sourceCycle) {
  const marker = `## Mayor cascade — C${sourceCycle}`;
  const startIdx = text.indexOf(marker);
  if (startIdx === -1) return text;
  // Find the next `## ` heading after the marker, or EOF.
  const after = text.slice(startIdx + marker.length);
  const nextHeading = after.search(/\n## [^M]/);
  const endIdx = nextHeading >= 0
    ? startIdx + marker.length + nextHeading + 1
    : text.length;
  // Trim trailing newline that bordered the stripped block.
  return (text.slice(0, startIdx).replace(/\n+$/, '\n') + text.slice(endIdx)).trimEnd() + '\n';
}

function appendCascade(targetDir, blocks, sourceCycle) {
  const pendingPath = path.join(WORKSPACE_DIR, targetDir, 'current', 'pending_decisions.md');
  let existing = '';
  if (fs.existsSync(pendingPath)) {
    existing = fs.readFileSync(pendingPath, 'utf-8');
    existing = stripExistingBlock(existing, sourceCycle);
  } else {
    // Workspace dir not initialized for this agent — create minimal stub.
    existing = `# Pending Decisions — ${targetDir} — Cycle ${sourceCycle}\n`;
  }
  // Combine multi-initiative blocks: deduplicate the leading `## Mayor
  // cascade` header so a single target gets ONE cascade block with multiple
  // `### INIT-NNN` subsections.
  const headerBlock = blocks[0].split('\n').slice(0, 4).join('\n');  // first 4 lines = the cascade header
  const bodyBlocks = blocks.map(b => {
    const lines = b.split('\n');
    return lines.slice(4).join('\n').trimEnd();  // strip the duplicate header
  }).join('\n\n');
  const combined = `${headerBlock}\n${bodyBlocks}\n`;

  const newContent = existing.trimEnd() + '\n\n' + combined;

  if (dryRun) {
    console.log(`[DRY] Would write ${pendingPath} (+${combined.length} chars)`);
    return;
  }

  if (!fs.existsSync(path.dirname(pendingPath))) {
    fs.mkdirSync(path.dirname(pendingPath), { recursive: true });
  }
  fs.writeFileSync(pendingPath, newContent);
  console.log(`  Wrote cascade to ${path.relative(ROOT, pendingPath)}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────

function main() {
  console.log(`\n=== cascadeMayorDecisions.js — Cycle ${cycle} ${dryRun ? '(DRY RUN)' : '(LIVE WRITE)'} ===\n`);

  // Load routing table.
  if (!fs.existsSync(routingPath)) {
    console.error(`[ERROR] Routing table not found: ${routingPath}`);
    process.exit(1);
  }
  const routingText = fs.readFileSync(routingPath, 'utf-8');
  const routes = parseRoutingTable(routingText);
  const routedInits = Object.keys(routes);
  console.log(`Routing table: ${routedInits.length} initiatives mapped (${routedInits.join(', ')})\n`);

  // Load Mayor JSON.
  const mayorPath = path.join(VOICE_DIR, `mayor_c${cycle}.json`);
  if (!fs.existsSync(mayorPath)) {
    console.error(`[ERROR] Mayor voice JSON not found: ${mayorPath}`);
    process.exit(1);
  }
  const mayorData = JSON.parse(fs.readFileSync(mayorPath, 'utf-8'));
  const statements = Array.isArray(mayorData) ? mayorData : (mayorData.statements || []);

  // Group by initiative.
  const groups = groupStatementsByInitiative(statements);
  const initiatives = Object.keys(groups).sort();
  console.log(`Mayor C${cycle}: ${statements.length} statements, ${initiatives.length} initiative(s) anchored:\n`);
  for (const init of initiatives) {
    console.log(`  ${init}: ${groups[init].length} Mayor statement(s)`);
  }
  console.log('');

  // Resolve cascades per initiative.
  const cascadesByTarget = {};  // target -> [block, ...]
  const fallbackInitiatives = [];
  for (const init of initiatives) {
    let targets = routes[init];
    if (!targets || targets.length === 0) {
      console.warn(`  WARNING: no routing entry for ${init} — falling back to broadcast.`);
      targets = ALL_DOWNSTREAM_VOICES.slice();
      fallbackInitiatives.push(init);
    }
    const block = buildCascadeBlock(init, groups[init], cycle);
    for (const t of targets) {
      if (!cascadesByTarget[t]) cascadesByTarget[t] = [];
      cascadesByTarget[t].push(block);
    }
  }

  // Write to each target.
  console.log(`\nWriting cascade blocks (${Object.keys(cascadesByTarget).length} targets):`);
  for (const target of Object.keys(cascadesByTarget).sort()) {
    appendCascade(target, cascadesByTarget[target], cycle);
  }

  console.log(`\n=== Summary ===`);
  console.log(`Initiatives cascaded: ${initiatives.length}`);
  console.log(`Targets routed: ${Object.keys(cascadesByTarget).length}`);
  if (fallbackInitiatives.length > 0) {
    console.log(`Broadcast-fallback initiatives: ${fallbackInitiatives.length} (${fallbackInitiatives.join(', ')}) — fill in CASCADE_ROUTING.md to remove fallback.`);
  }
  if (dryRun) {
    console.log(`\nDry run — no files written. Use without --dry-run to write.`);
  }
  console.log('');
}

main();

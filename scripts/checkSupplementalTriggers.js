#!/usr/bin/env node
/**
 * checkSupplementalTriggers.js v1.0
 *
 * Analyzes initiative decisions and voice agent statements to identify
 * candidates for auto-triggered civic supplementals. Zero tokens — pure
 * data analysis. Runs after voice agents, before desk agents.
 *
 * Trigger types:
 *   - Initiative Spotlight: initiative agent made 3+ decisions
 *   - Civic Dispatch: Mayor issued authorization/executive order, or
 *     cross-faction disagreement on same topic
 *   - Neighborhood Report: neighborhood had 5+ citizen events in engine
 *
 * Usage: node scripts/checkSupplementalTriggers.js [cycleNumber]
 *
 * Reads:
 *   output/city-civic-database/initiatives/*/decisions_c{XX}.json
 *   output/civic-voice/mayor_c{XX}.json
 *   output/civic-voice/{faction}_c{XX}.json
 *   output/desk-packets/base_context.json
 *
 * Writes:
 *   output/supplemental-triggers/triggers_c{XX}.json
 */

const fs = require('fs');
const path = require('path');

const CYCLE = parseInt(process.argv[2]) || 87;
const ROOT = path.resolve(__dirname, '..');
const OUTPUT_DIR = path.join(ROOT, 'output/supplemental-triggers');
const CIVIC_DB = path.join(ROOT, 'output/city-civic-database/initiatives');
const VOICE_DIR = path.join(ROOT, 'output/civic-voice');
const PACKETS_DIR = path.join(ROOT, 'output/desk-packets');

const INITIATIVES = ['stabilization-fund', 'oari', 'transit-hub', 'health-center', 'baylight'];
const FACTIONS = [
  { file: 'opp_faction', name: 'OPP' },
  { file: 'crc_faction', name: 'CRC' },
  { file: 'ind_swing', name: 'IND' }
];

// ─── HELPERS ─────────────────────────────────────────────

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return null;
  }
}

function getStatements(data) {
  if (!data) return [];
  return Array.isArray(data) ? data : (data.statements || []);
}

// ─── TRIGGER: INITIATIVE SPOTLIGHT ──────────────────────

function checkInitiativeSpotlights() {
  const triggers = [];

  for (const init of INITIATIVES) {
    const decisions = readJson(path.join(CIVIC_DB, init, `decisions_c${CYCLE}.json`));
    if (!decisions) continue;

    // Count substantive decisions (not just status updates)
    const allDecisions = [
      ...(decisions.decisions || []),
      ...(decisions.pendingAuthorizations || []),
      ...(decisions.escalations || [])
    ];

    if (allDecisions.length >= 3) {
      triggers.push({
        type: 'initiative_spotlight',
        initiative: init,
        reason: `${allDecisions.length} decisions this cycle`,
        decisionCount: allDecisions.length,
        hasPendingAuth: (decisions.pendingAuthorizations || []).length > 0,
        hasEscalation: (decisions.escalations || []).length > 0,
        priority: allDecisions.length >= 5 ? 'high' : 'medium',
        suggestedAngle: decisions.pendingAuthorizations?.length > 0
          ? `Pending authorization: ${decisions.pendingAuthorizations[0].topic || init}`
          : `${init} activity surge — ${allDecisions.length} decisions in one cycle`
      });
    }
  }

  return triggers;
}

// ─── TRIGGER: CIVIC DISPATCH ────────────────────────────

function checkCivicDispatches() {
  const triggers = [];

  // Check Mayor for authorization_response or executive_order
  const mayorData = readJson(path.join(VOICE_DIR, `mayor_c${CYCLE}.json`));
  const mayorStmts = getStatements(mayorData);
  const mayorDecisions = mayorStmts.filter(s =>
    ['authorization_response', 'executive_order', 'appointment'].includes(s.type)
  );

  for (const d of mayorDecisions) {
    triggers.push({
      type: 'civic_dispatch',
      subtype: d.type,
      topic: d.topic,
      reason: `Mayor issued ${d.type.replace(/_/g, ' ')}`,
      priority: d.type === 'executive_order' ? 'high' : 'medium',
      decision: d.decision || null,
      amount: d.amount || null,
      initiative: d.initiative || null,
      suggestedAngle: d.type === 'authorization_response'
        ? `Mayor ${d.decision || 'responds to'} ${d.topic}`
        : `Mayor issues executive order: ${d.topic}`
    });
  }

  // Check for cross-faction disagreement on the same topic
  const allFactionStmts = [];
  for (const { file, name } of FACTIONS) {
    const data = readJson(path.join(VOICE_DIR, `${file}_c${CYCLE}.json`));
    const stmts = getStatements(data);
    for (const s of stmts) {
      allFactionStmts.push({ ...s, faction: name });
    }
  }

  // Group by topic (lowercase, trimmed)
  const topicMap = {};
  for (const s of [...mayorStmts.map(s => ({ ...s, faction: 'MAYOR' })), ...allFactionStmts]) {
    if (!s.topic) continue;
    const key = s.topic.toLowerCase().trim();
    if (!topicMap[key]) topicMap[key] = [];
    topicMap[key].push({ faction: s.faction, position: s.position, type: s.type, speaker: s.speaker });
  }

  for (const [topic, entries] of Object.entries(topicMap)) {
    const factions = [...new Set(entries.map(e => e.faction))];
    const positions = [...new Set(entries.filter(e => e.position).map(e => e.position))];

    // Cross-faction disagreement: 2+ factions with different positions
    if (factions.length >= 2 && positions.length >= 2) {
      triggers.push({
        type: 'civic_dispatch',
        subtype: 'cross_faction_disagreement',
        topic: entries[0] ? topic : topic,
        reason: `${factions.join(' vs ')} on "${topic}" — positions: ${positions.join(', ')}`,
        priority: factions.length >= 3 ? 'high' : 'medium',
        factions: factions,
        positions: positions,
        suggestedAngle: `Political divide: ${factions.join(' and ')} split on ${topic}`
      });
    }
  }

  return triggers;
}

// ─── TRIGGER: NEIGHBORHOOD REPORT ───────────────────────

function checkNeighborhoodReports() {
  const triggers = [];
  const baseContext = readJson(path.join(PACKETS_DIR, 'base_context.json'));
  if (!baseContext || !baseContext.events) return triggers;

  // Count events by neighborhood
  const nhoodCounts = {};
  for (const event of baseContext.events) {
    const nhood = event.neighborhood || event.location || null;
    if (!nhood) continue;
    nhoodCounts[nhood] = (nhoodCounts[nhood] || 0) + 1;
  }

  for (const [nhood, count] of Object.entries(nhoodCounts)) {
    if (count >= 5) {
      triggers.push({
        type: 'neighborhood_report',
        neighborhood: nhood,
        reason: `${count} citizen events this cycle`,
        eventCount: count,
        priority: count >= 8 ? 'high' : 'medium',
        suggestedAngle: `Life in ${nhood}: ${count} events shaping the neighborhood this cycle`
      });
    }
  }

  return triggers;
}

// ─── MAIN ───────────────────────────────────────────────

function main() {
  console.log(`\n=== checkSupplementalTriggers.js v1.0 — Cycle ${CYCLE} ===\n`);

  const spotlights = checkInitiativeSpotlights();
  const dispatches = checkCivicDispatches();
  const neighborhoods = checkNeighborhoodReports();

  const allTriggers = [...spotlights, ...dispatches, ...neighborhoods]
    .sort((a, b) => {
      const pri = { high: 3, medium: 2, low: 1 };
      return (pri[b.priority] || 0) - (pri[a.priority] || 0);
    });

  console.log(`Initiative Spotlights: ${spotlights.length}`);
  for (const t of spotlights) {
    console.log(`  [${t.priority}] ${t.initiative} — ${t.reason}`);
  }

  console.log(`Civic Dispatches: ${dispatches.length}`);
  for (const t of dispatches) {
    console.log(`  [${t.priority}] ${t.subtype} — ${t.topic}`);
  }

  console.log(`Neighborhood Reports: ${neighborhoods.length}`);
  for (const t of neighborhoods) {
    console.log(`  [${t.priority}] ${t.neighborhood} — ${t.eventCount} events`);
  }

  console.log(`\nTotal triggers: ${allTriggers.length}`);

  // Write output
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const output = {
    cycle: CYCLE,
    generatedAt: new Date().toISOString(),
    triggerCount: allTriggers.length,
    triggers: allTriggers
  };
  const outPath = path.join(OUTPUT_DIR, `triggers_c${CYCLE}.json`);
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
  console.log(`\nWritten: ${outPath}\n`);
}

main();

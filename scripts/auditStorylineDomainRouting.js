#!/usr/bin/env node
/**
 * auditStorylineDomainRouting.js — engine.23 regression audit (S226)
 * ====================================================================
 *
 * Live audit of Storyline_Tracker against applyStorySeeds.js
 * STORYLINE_TYPE_DOMAINS to surface content-domain mismatches.
 *
 * Backstory: C94 byline_shadow_log showed Maria Keen scoring theme:8 on
 * S1 Kelley + S2 Let-Walks + QT2 Rockridge + C2 West Oakland. Empirical
 * trace landed at applyStorySeeds.js STORYLINE_TYPE_DOMAINS['thread'] =
 * 'COMMUNITY'. Of 30 live thread rows, 23 carried sports/civic/culture/
 * business/health content. v3.14 re-routes 'thread' → 'GENERAL'; this
 * script is the persistent regression check that the routing stays clean.
 *
 * Output:
 *   - Distribution of StorylineType across active rows
 *   - Per-type mapping vs. heuristic content classification
 *   - Flagged rows: explicit content-domain mismatches (sports content
 *     in COMMUNITY-routed types, civic content in CULTURE-routed types,
 *     etc.) — these are the seeds that will mis-weight byline scoring.
 *
 * Usage:
 *   node scripts/auditStorylineDomainRouting.js [--all|--mismatches]
 *     --all          (default) print full per-type table + mismatch list
 *     --mismatches   print only flagged rows (CI-friendly)
 *     --json         emit JSON to stdout (audit-aware downstream tooling)
 *
 * Read-only — no sheet writes. Service account via lib/sheets.js.
 */

require('dotenv').config({ path: '/root/.config/godworld/.env' });
const { getSheetData } = require('/root/GodWorld/lib/sheets');

// Mirror of applyStorySeeds.js STORYLINE_TYPE_DOMAINS (v3.14, S226 engine.23).
// Sync this table if the engine map changes — drift here means the audit
// reports the wrong baseline.
const STORYLINE_TYPE_DOMAINS = {
  'arc': 'GENERAL',
  'question': 'CIVIC',
  'thread': 'GENERAL',
  'mystery': 'CIVIC',
  'developing': 'GENERAL',
  'seasonal': 'CULTURE',
  'festival': 'CULTURE',
  'sports': 'SPORTS'
};

// Content-domain heuristics. Keywords selected to catch the failure mode
// engine.23 was filed against — sports content disguised by narrative shape.
// Order matters: first match wins, so the most-specific domains go first.
const CONTENT_HEURISTICS = [
  { domain: 'SPORTS', keywords: [
    // A's / baseball
    "a's ", "as:", " a's", "athletics", "baseball", "homer", "shutout",
    "rbi", "era", "war ", "h/", "hr/", "fa 2042", "fa 2043", "free-agent",
    "contract-year", "extension decision", "all-star", "all star",
    "draft", "ballpark", "ballplayer",
    // Bulls / Warriors / NBA Chicago
    "bulls", "warriors", "nba", "trepagnier", "donovan", "buzelis",
    "giddey", "dosunmu", "curry", "butler", "giannis",
    // Roster names commonly typed
    "kelley", "keane", "aitken", "richards", "quintero", "reyna",
    "coles", "rosado", "rosada", "horn ", "dillon", "franco",
    "davis", "taveras", "mesa", "seymour", "paulson",
    // Coverage tells
    "tribune coverage", "youth movement", "rookie", "veteran",
    "season win", "season loss", "win streak", "hitting streak",
    "wiffleball", "olympics", "espn"
  ] },
  { domain: 'CIVIC', keywords: [
    "ordinance", "council vote", "ballot", "elections", "city council",
    "ashford", "crane", "vega ", "tran ", "carter ", "chen ",
    "mayor santana", "santana ", "okoro", "osei", "webb ",
    "oari", "stab fund", "stabilization fund", "transit hub",
    "baylight", "deir", "veto", "supplement", "appropriation",
    "vote tally", "8-0", "5-4", "yes/no", "abstain", "absent vote",
    "policy", "compliance", "mou ", "regulatory", "fiscal"
  ] },
  { domain: 'HEALTH', keywords: [
    "health center", "health crisis", "health fair", "permitting",
    "hcai", "epidemiolog", "containment", "outbreak", "mezran"
  ] },
  { domain: 'INFRASTRUCTURE', keywords: [
    "infrastructure", "potholes", "shortfall", "maintenance backlog",
    "$60m shortfall", "$140m budget", "transformer", "outage"
  ] },
  { domain: 'CULTURE', keywords: [
    "first friday", "arts scene", "anchor restaurant", "pastry chef",
    "tablecloth", "open kitchen", "gallery", "nightlife", "evening corridor"
  ] },
  { domain: 'BUSINESS', keywords: [
    "housing market", "appreciation", "retail corridor", "retail vitality",
    "business owner", "commercial surge", "tech expo", "ipo", "valuation"
  ] },
  { domain: 'COMMUNITY', keywords: [
    "faith institutions", "faith community", "interfaith", "congregation",
    "obon", "ramadan", "easter", "thanksgiving", "memorial service",
    "neighborhood rhythm", "block club", "family dinner", "potluck",
    "community support"
  ] }
];

function classifyContent(text) {
  if (!text) return null;
  const lower = String(text).toLowerCase();
  for (const rule of CONTENT_HEURISTICS) {
    for (const kw of rule.keywords) {
      if (lower.includes(kw)) return rule.domain;
    }
  }
  return null; // no heuristic hit — caller treats as GENERAL/ambiguous
}

function inferredDomainFor(storylineType) {
  return STORYLINE_TYPE_DOMAINS[storylineType] || 'GENERAL';
}

function isMismatch(routedDomain, contentDomain) {
  if (!contentDomain) return false;          // ambiguous — not a mismatch
  if (routedDomain === 'GENERAL') return false; // GENERAL bypasses themeAxis, harmless
  return routedDomain !== contentDomain;
}

(async () => {
  const args = new Set(process.argv.slice(2));
  const wantJson = args.has('--json');
  const onlyMismatches = args.has('--mismatches');

  const rows = await getSheetData('Storyline_Tracker');
  if (!rows || rows.length < 2) {
    console.error('Storyline_Tracker empty or unreachable');
    process.exit(1);
  }
  const header = rows[0];
  const idx = name => header.indexOf(name);
  const tIdx = idx('StorylineType');
  const dIdx = idx('Description');
  const nhIdx = idx('Neighborhood');
  const sIdx = idx('Status');
  const cIdx = idx('CycleAdded');
  const idIdx = idx('StorylineId');
  if (tIdx < 0 || dIdx < 0) {
    console.error('Storyline_Tracker missing StorylineType or Description column');
    process.exit(1);
  }

  const data = rows.slice(1);
  const summary = {
    totalRows: data.length,
    typeDistribution: {},
    perTypeContentMix: {},
    mismatches: []
  };

  data.forEach((r, i) => {
    const type = String(r[tIdx] || '').trim() || '(blank)';
    const desc = String(r[dIdx] || '');
    const routed = inferredDomainFor(type);
    const content = classifyContent(desc);

    summary.typeDistribution[type] = (summary.typeDistribution[type] || 0) + 1;

    if (!summary.perTypeContentMix[type]) summary.perTypeContentMix[type] = {};
    const bucket = content || '(no-heuristic-hit)';
    summary.perTypeContentMix[type][bucket] =
      (summary.perTypeContentMix[type][bucket] || 0) + 1;

    if (isMismatch(routed, content)) {
      summary.mismatches.push({
        row: i + 2, // sheet row, accounting for header
        storylineId: r[idIdx] || null,
        storylineType: type,
        routedDomain: routed,
        contentDomain: content,
        neighborhood: r[nhIdx] || null,
        status: r[sIdx] || null,
        cycleAdded: r[cIdx] || null,
        description: desc.slice(0, 160)
      });
    }
  });

  if (wantJson) {
    process.stdout.write(JSON.stringify(summary, null, 2) + '\n');
    return;
  }

  if (!onlyMismatches) {
    console.log('Storyline_Tracker — domain-routing audit');
    console.log('=========================================');
    console.log(`Total rows: ${summary.totalRows}`);
    console.log('');
    console.log('Type distribution (n=count, → routedDomain):');
    Object.entries(summary.typeDistribution)
      .sort((a, b) => b[1] - a[1])
      .forEach(([t, n]) => {
        const routed = inferredDomainFor(t);
        console.log(`  ${t.padEnd(16)} n=${String(n).padStart(3)}  → ${routed}`);
      });
    console.log('');
    console.log('Per-type content classification (heuristic):');
    Object.entries(summary.perTypeContentMix)
      .sort((a, b) => Object.values(b[1]).reduce((s,n)=>s+n,0) -
                      Object.values(a[1]).reduce((s,n)=>s+n,0))
      .forEach(([t, mix]) => {
        const total = Object.values(mix).reduce((s, n) => s + n, 0);
        const parts = Object.entries(mix)
          .sort((a, b) => b[1] - a[1])
          .map(([d, n]) => `${d}:${n}`)
          .join('  ');
        console.log(`  ${t.padEnd(16)} (${total})  ${parts}`);
      });
    console.log('');
  }

  console.log(`Mismatches (heuristic content vs. routed domain): ${summary.mismatches.length}`);
  if (summary.mismatches.length === 0) {
    console.log('  (clean — no flagged rows under current heuristics)');
  } else {
    console.log('  These rows will mis-weight bylineEngine themeAxis_ if the routed');
    console.log('  domain is non-GENERAL and matches the journalist\'s signature.');
    console.log('');
    summary.mismatches.forEach(m => {
      console.log(`  [row ${m.row}] type=${m.storylineType}  routed=${m.routedDomain}  content=${m.contentDomain}`);
      console.log(`              nh=${m.neighborhood || '-'}  status=${m.status}  added=C${m.cycleAdded}`);
      console.log(`              ${m.description}`);
    });
  }

  process.exit(summary.mismatches.length > 0 ? 2 : 0);
})().catch(e => {
  console.error('ERR', e.message);
  process.exit(1);
});

#!/usr/bin/env node
/**
 * rheaTwoPass.js — Phase 39.3 (S147)
 *
 * Two-pass hallucination detection inside Rhea's Sourcing Lane.
 *
 * Pattern adapted from Microsoft UV §3.4 (docs/research/papers/Microsoftpaper.pdf p.5):
 *   - Pass A (text-only): extract every checkable claim from the article
 *     using only the article's own text.
 *   - Pass B (text + canon): with canon sources available, verify each
 *     Pass-A claim against world-data / bay-tribune / sheet snapshots.
 *   Divergence = hallucination flag.
 *
 * Output: output/rhea_hallucinations_c{XX}.json with a hallucinationFlags[]
 * array. Shape documented in PHASE_39_PLAN §14.3:
 *   { claim, passABasis, passBSearch, verdict, article }
 *
 * This emits a sidecar file; scripts/rheaJsonReport.js can merge the
 * hallucinationFlags[] into Rhea's main rhea_report_c{XX}.json when both
 * have run for the cycle (see mergeIntoRheaReport() export).
 *
 * Cost estimate per PHASE_39_PLAN §14.2: ~$0.02–0.04/cycle (Haiku 4.5,
 * ~9 articles × 2 passes, with prompt caching on the canon-context block).
 *
 * Usage:
 *   node scripts/rheaTwoPass.js 91           # run against edition 91
 *   node scripts/rheaTwoPass.js --edition path/to/edition.txt --cycle 91
 *   node scripts/rheaTwoPass.js 91 --dry     # skip API calls, print what would happen
 */

require('/root/GodWorld/lib/env');
const fs = require('fs');
const path = require('path');
const Anthropic = require('@anthropic-ai/sdk');

const { parse, extractNameCandidates } = require('./capability-reviewer/parseEdition');

const OUTPUT_DIR = path.join(__dirname, '..', 'output');
const EDITIONS_DIR = path.join(__dirname, '..', 'editions');
const MODEL = 'claude-haiku-4-5-20251001';
const MAX_TOKENS = 1024;

// Age-reference convention: the A's roster is set in 2041, so every citizen age
// across the project is computed as (2041 - BirthYear). The simulation itself is
// not "in" 2041 — this is a reference anchor only, applied uniformly so ages
// align with the sports roster. See mem: user_research-behavior, S147.
const AGE_REFERENCE_YEAR = 2041;

function resolveArgs() {
  const args = process.argv.slice(2);
  const dry = args.includes('--dry');
  let editionPath = null;
  let cycle = null;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--edition') editionPath = args[i + 1];
    else if (args[i] === '--cycle') cycle = parseInt(args[i + 1], 10);
    else if (/^\d+$/.test(args[i]) && cycle === null) cycle = parseInt(args[i], 10);
  }
  if (cycle === null && editionPath) {
    const m = editionPath.match(/_(\d+)\.txt$/);
    if (m) cycle = parseInt(m[1], 10);
  }
  if (cycle === null) throw new Error('Cycle required — pass as argv[2] or via --cycle');
  if (!editionPath) editionPath = path.join(EDITIONS_DIR, `cycle_pulse_edition_${cycle}.txt`);
  return { cycle, editionPath: path.resolve(editionPath), dry };
}

function normalizeName(s) {
  return (s || '').toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
}

function computeAge(birthYear) {
  const yr = parseInt(birthYear, 10);
  if (isNaN(yr)) return null;
  return AGE_REFERENCE_YEAR - yr;
}

async function prefetchAuthoritativeCanon(edition) {
  // Read SL/Civic/Initiative/Roster sheets and extract authoritative rows for
  // every citizen/initiative/official that appears (by name match) in the
  // edition. This data is the ground truth the detector checks against —
  // derived summaries (world_summary etc.) come later as secondary context.
  const sheets = require('../lib/sheets');

  // Collect every name candidate from the edition so we know who to pre-fetch.
  const allNames = new Set();
  for (const section of edition.sections) {
    for (const cand of extractNameCandidates(section.body || '')) allNames.add(normalizeName(cand));
  }

  const [sl, council, initiatives, roster] = await Promise.all([
    sheets.getSheetAsObjects('Simulation_Ledger').catch(() => []),
    sheets.getSheetAsObjects('Civic_Office_Ledger').catch(() => []),
    sheets.getSheetAsObjects('Initiative_Tracker').catch(() => []),
    sheets.getSheetAsObjects('As_Roster').catch(() => []),
  ]);

  // Match SL rows by joined First/Last name against edition candidates.
  const citizens = [];
  for (const row of sl) {
    const first = (row.First || '').trim();
    const last = (row.Last || '').trim();
    const full = normalizeName(`${first} ${last}`);
    if (!full || full.length < 4) continue;
    const lastOnly = normalizeName(last);
    const matches = allNames.has(full) || [...allNames].some((n) => n.includes(full)) || (lastOnly.length > 3 && [...allNames].some((n) => n.includes(` ${lastOnly}`) || n.endsWith(` ${lastOnly}`)));
    if (!matches) continue;
    citizens.push({
      popid: row.POPID,
      name: `${first} ${last}`.trim(),
      age: computeAge(row.BirthYear),
      birthYear: row.BirthYear,
      neighborhood: row.Neighborhood,
      gender: row.Gender,
      tier: row.Tier,
      roleType: row.RoleType,
      careerStage: row.CareerStage,
      educationLevel: row.EducationLevel,
      maritalStatus: row.MaritalStatus,
    });
  }

  // Council — always include all 9 seats regardless of whether names appear in edition.
  const councilRows = council.map((r) => ({
    name: r.Name || r.OfficialName,
    district: r.District,
    faction: r.Faction || r.Party,
    status: r.Status,
    role: r.Role,
  })).filter((r) => r.name);

  // Initiatives — include all rows; they're the civic state check.
  const initiativeRows = initiatives.map((r) => ({
    id: r.InitiativeID || r.ID,
    name: r.Name || r.InitiativeName,
    status: r.Status,
    phase: r.Phase,
    currentCycle: r.CurrentCycle,
    cyclesInState: r.CyclesInState,
    budget: r.Budget,
    leadNeighborhood: r.LeadNeighborhood,
  })).filter((r) => r.id || r.name);

  // Roster — include all players with age computed from BirthYear.
  const rosterRows = roster.map((r) => ({
    name: `${r.First || ''} ${r.Last || ''}`.trim(),
    popid: r.POPID,
    team: r.Team,
    position: r.Position,
    age: computeAge(r.BirthYear),
    birthYear: r.BirthYear,
    overall: r.Overall,
  })).filter((r) => r.name);

  return { citizens, council: councilRows, initiatives: initiativeRows, roster: rosterRows };
}

function formatAuthoritativeBlock(canon, cycle) {
  const lines = [];
  lines.push(`# AUTHORITATIVE CANON (cycle ${cycle})`);
  lines.push('');
  lines.push(`**Age convention**: every citizen and player age below is computed as ${AGE_REFERENCE_YEAR} − BirthYear. This is the project's canonical anchor (driven by the A's 2041 roster). If the article's age matches this value, it is correct; if it differs, the article is wrong — not this canon.`);
  lines.push('');
  lines.push(`## Citizens referenced in this edition (from Simulation_Ledger)`);
  for (const c of canon.citizens) {
    const bits = [c.popid, c.name, c.age != null ? `age ${c.age} (born ${c.birthYear})` : null, c.neighborhood, c.roleType, c.careerStage].filter(Boolean).join(' | ');
    lines.push(`- ${bits}`);
  }
  if (canon.citizens.length === 0) lines.push('- (no name matches found in Simulation_Ledger — edition may reference only non-SL entities)');
  lines.push('');
  lines.push(`## Oakland City Council (from Civic_Office_Ledger)`);
  for (const m of canon.council) {
    lines.push(`- ${m.name} | ${m.district || '(no district)'} | ${m.faction || '(no faction)'} | ${m.status || 'active'}${m.role ? ` | ${m.role}` : ''}`);
  }
  lines.push('');
  lines.push(`## Initiatives (from Initiative_Tracker)`);
  for (const i of canon.initiatives.slice(0, 60)) {
    lines.push(`- ${i.id || '(no id)'} | ${i.name || '(no name)'} | phase ${i.phase || '?'} | status ${i.status || '?'} | cyclesInState ${i.cyclesInState || '?'}${i.budget ? ` | budget ${i.budget}` : ''}${i.leadNeighborhood ? ` | lead ${i.leadNeighborhood}` : ''}`);
  }
  lines.push('');
  lines.push(`## A's Roster (from As_Roster)`);
  for (const p of canon.roster) {
    lines.push(`- ${p.name} | ${p.position || '?'} | age ${p.age ?? '?'} | overall ${p.overall || '?'}${p.popid ? ` | ${p.popid}` : ''}`);
  }
  lines.push('');
  return lines.join('\n');
}

async function loadCanonContext(cycle, edition) {
  // Two-tier canon context:
  //   Tier 1 — AUTHORITATIVE: sheet-derived rows with computed ages. Pass B treats
  //            this as ground truth.
  //   Tier 2 — DERIVED: world_summary, engine_review, etc. Useful for cycle-level
  //            narrative context but known to drift (S147: world_summary had
  //            Varek at 31 while ledger/MCP/published canon all had 38).
  let authoritativeBlock = '';
  try {
    const canon = await prefetchAuthoritativeCanon(edition);
    authoritativeBlock = formatAuthoritativeBlock(canon, cycle);
  } catch (err) {
    authoritativeBlock = `# AUTHORITATIVE CANON\n\n[prefetch failed: ${err.message} — Pass B has derived context only]\n`;
  }

  const derivedParts = [];
  const derivedSources = [
    [`output/world_summary_c${cycle}.md`, 'WORLD SUMMARY'],
    [`output/engine_review_c${cycle}.md`, 'ENGINE REVIEW'],
    [`output/desk-packets/base_context.json`, 'BASE CONTEXT'],
    [`output/desk-packets/truesource_reference.json`, 'TRUESOURCE REFERENCE'],
  ];
  for (const [rel, label] of derivedSources) {
    const p = path.join(__dirname, '..', rel);
    if (!fs.existsSync(p)) continue;
    const body = fs.readFileSync(p, 'utf8');
    const trimmed = body.length > 50_000 ? body.slice(0, 50_000) + '\n[...truncated]' : body;
    derivedParts.push(`## ${label} (${rel})\n\n${trimmed}`);
  }
  const derivedBlock = derivedParts.length > 0
    ? `# DERIVED CONTEXT (may drift — prefer the authoritative block above on any conflict)\n\n${derivedParts.join('\n\n---\n\n')}`
    : '';

  return [authoritativeBlock, derivedBlock].filter(Boolean).join('\n\n===\n\n');
}

const PASS_A_SYSTEM = `You are Rhea Morgan, Copy Chief at the Bay Tribune. You are running Pass A of a two-pass hallucination check. You see ONLY the article text — no canon sources. Your task: extract every CHECKABLE factual claim that would need external verification. Checkable claims include:
- Numerical stats ("78% of residents")
- Named-citizen quotes presented as interviews
- Vote tallies ("the council voted 6-3")
- Dollar amounts attributed to specific initiatives or people
- Team records, player stats, game outcomes
- Dates or cycle counts attached to specific events

Do NOT extract opinions, atmospheric details, or obvious rhetorical flourishes. Only claims that can be verified against canon data.

Respond with JSON in this exact shape:
{
  "claims": [
    { "id": "c1", "verbatim": "the exact text of the claim", "category": "stat|quote|vote|dollar|sports|date", "whoOrWhat": "the subject of the claim" }
  ]
}`;

const PASS_B_SYSTEM = `You are Rhea Morgan running Pass B of a two-pass hallucination check. Canon sources are provided in two tiers.

TIER 1 — AUTHORITATIVE CANON (sheet-derived). This is ground truth. Ages are computed as 2041 − BirthYear (the project's anchor; the simulation is not "in" 2041, but every age uses this reference year so the A's 2041 roster stays consistent with citizen ages). If the authoritative block says age 38, age 38 is canon.

TIER 2 — DERIVED CONTEXT (world summaries, engine reviews, desk packets). Useful for narrative cycle state but known to drift. ON ANY CONFLICT between Tier 1 and Tier 2, trust Tier 1.

For each Pass A claim, issue a verdict:
- "grounded": Tier 1 confirms the claim (or Tier 2 confirms and Tier 1 is silent).
- "contradicted": Tier 1 says something different from the claim. Always cite Tier 1, not Tier 2, when you see a Tier 1 value.
- "unsupported": Neither tier records the claim (fabricated stat, invented biography, unverifiable quote).
- "ambiguous": canon is silent but the claim is plausible given adjacent facts.

Respond with JSON:
{
  "verdicts": [
    { "id": "c1", "verdict": "grounded|contradicted|unsupported|ambiguous", "basis": "one-sentence citation — specify 'authoritative canon' or 'derived context' and which row/field" }
  ]
}`;

function buildArticlePrompt(article) {
  const headline = article.headline || '(no headline)';
  const byline = article.byline || '(no byline)';
  return `Headline: ${headline}\nBy: ${byline}\n\n${(article.body || '').slice(0, 4000)}`;
}

async function callHaiku(client, system, messages, useCache) {
  const params = {
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: useCache
      ? [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }]
      : system,
    messages,
  };
  const resp = await client.messages.create(params);
  const text = resp.content.map((b) => (b.type === 'text' ? b.text : '')).join('');
  return { text, usage: resp.usage };
}

function parseJsonSafely(text) {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    return JSON.parse(m[0]);
  } catch {
    return null;
  }
}

async function processArticle(client, article, canonContext, dry) {
  const articleBlock = buildArticlePrompt(article);
  const passAMessages = [{ role: 'user', content: `ARTICLE:\n\n${articleBlock}\n\nExtract checkable claims.` }];

  let passA, passB;
  if (dry) {
    return { passA: null, passB: null, hallucinations: [], skipped: true };
  }

  const a = await callHaiku(client, PASS_A_SYSTEM, passAMessages, false);
  passA = parseJsonSafely(a.text) || { claims: [] };

  if (!passA.claims || passA.claims.length === 0) {
    return { passA, passB: { verdicts: [] }, hallucinations: [], usage: { passA: a.usage, passB: null } };
  }

  const passBMessages = [
    {
      role: 'user',
      content: [
        { type: 'text', text: `CANON SOURCES:\n\n${canonContext}`, cache_control: { type: 'ephemeral' } },
        { type: 'text', text: `ARTICLE:\n\n${articleBlock}\n\nPASS A CLAIMS:\n${JSON.stringify(passA.claims, null, 2)}\n\nFor each claim, verify against canon.` },
      ],
    },
  ];
  const b = await callHaiku(client, PASS_B_SYSTEM, passBMessages, false);
  passB = parseJsonSafely(b.text) || { verdicts: [] };

  const hallucinations = [];
  for (const claim of passA.claims) {
    const v = (passB.verdicts || []).find((x) => x.id === claim.id);
    if (!v) continue;
    if (v.verdict === 'contradicted' || v.verdict === 'unsupported') {
      hallucinations.push({
        claim: claim.verbatim,
        category: claim.category,
        passABasis: `Pass A extracted from article: "${claim.verbatim}" (whoOrWhat: ${claim.whoOrWhat})`,
        passBSearch: v.basis || 'canon search returned no match',
        verdict: v.verdict,
      });
    }
  }

  return { passA, passB, hallucinations, usage: { passA: a.usage, passB: b.usage } };
}

async function main() {
  const { cycle, editionPath, dry } = resolveArgs();
  if (!fs.existsSync(editionPath)) throw new Error(`Edition not found: ${editionPath}`);

  console.log(`Rhea Two-Pass — Cycle ${cycle}${dry ? ' (DRY RUN)' : ''}`);
  console.log(`  edition: ${editionPath}`);

  const edition = parse(editionPath);
  const articles = [];
  for (const section of edition.sections) {
    if (['LETTERS', 'LETTERS TO THE EDITOR', 'PODCAST', 'WEATHER', 'CLASSIFIEDS'].includes(section.title)) continue;
    for (const article of section.articles) {
      if (!article.body || article.body.trim().length < 200) continue;
      articles.push({ section: section.title, ...article });
    }
  }
  console.log(`  articles to check: ${articles.length}`);

  if (dry) {
    for (const a of articles) console.log(`    - [${a.section}] ${a.headline || '(no headline)'}`);
    console.log(`  DRY — no API calls made. Exit.`);
    return;
  }

  if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY not set in env');
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const canonContext = await loadCanonContext(cycle, edition);
  console.log(`  canon context: ${Math.round(canonContext.length / 1024)} KB (Tier 1 authoritative + Tier 2 derived, cached after first article)`);

  const startTime = Date.now();
  const allFlags = [];
  const perArticle = [];
  for (let i = 0; i < articles.length; i++) {
    const article = articles[i];
    const label = `${article.section}: ${article.headline || '(no headline)'}`.slice(0, 70);
    process.stdout.write(`  [${i + 1}/${articles.length}] ${label} ... `);
    try {
      const r = await processArticle(client, article, canonContext, false);
      for (const flag of r.hallucinations) {
        flag.article = `${article.section}: ${article.headline || '(no headline)'}`;
        allFlags.push(flag);
      }
      perArticle.push({ article: `${article.section}: ${article.headline || '(no headline)'}`, claimsExtracted: (r.passA?.claims || []).length, hallucinations: r.hallucinations.length });
      console.log(`${r.hallucinations.length} flag(s)`);
    } catch (err) {
      console.log(`ERROR: ${err.message}`);
      perArticle.push({ article: label, error: err.message });
    }
  }
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  const output = {
    cycle,
    generatedAt: new Date().toISOString(),
    model: MODEL,
    edition: path.basename(editionPath),
    articlesChecked: articles.length,
    hallucinationFlags: allFlags,
    perArticle,
    elapsedSeconds: parseFloat(elapsed),
  };

  const outputPath = path.join(OUTPUT_DIR, `rhea_hallucinations_c${cycle}.json`);
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));

  console.log(`\nDone in ${elapsed}s.`);
  console.log(`  total hallucination flags: ${allFlags.length}`);
  console.log(`  output: ${outputPath}`);
}

/**
 * Merge the sidecar hallucinationFlags[] into an existing Rhea report JSON.
 * Called by rheaJsonReport.js when both outputs exist for a cycle.
 */
function mergeIntoRheaReport(rheaReport, hallucinationSidecar) {
  const flags = hallucinationSidecar?.hallucinationFlags || [];
  rheaReport.hallucinationFlags = flags;
  if (flags.length > 0) {
    // Hallucinations land in the sourcing lane's canon-continuity or quote-attribution
    // check depending on category. Simplest rollup: if any flags exist, the article
    // has sourcing issues worth recording.
    if (!rheaReport.checks['canon-continuity'].issues) rheaReport.checks['canon-continuity'].issues = [];
    for (const flag of flags) {
      rheaReport.checks['canon-continuity'].issues.push({
        article: flag.article,
        claim: flag.claim,
        canonValue: flag.passBSearch,
        severity: flag.verdict === 'contradicted' ? 'CRITICAL' : 'WARNING',
        fix: `${flag.verdict === 'contradicted' ? 'Contradicts canon' : 'Unsupported by canon'} — verify or remove the claim`,
        source: 'rheaTwoPass',
      });
    }
    rheaReport.checks['canon-continuity'].pass = false;
  }
  return rheaReport;
}

if (require.main === module) {
  main().catch((err) => {
    console.error('Rhea two-pass failed:', err.message);
    if (err.stack) console.error(err.stack);
    process.exit(1);
  });
}

module.exports = { mergeIntoRheaReport, loadCanonContext };

#!/usr/bin/env node
/**
 * bindStorylineReporters.js — Storyline → reporter auto-bind evidence logger.
 *
 * Plan: docs/plans/2026-05-07-engine-routing-foundation.md §T3.5b
 * Resolution: option (ii) refined — evidence-logger first (this), sheet-writer
 * second (deferred until 2-3 cycles of validated evidence accumulate).
 *
 * What it does:
 *   1. Reads `editions/cycle_pulse_edition_<cycle>.txt` Article Table (for
 *      reporter full names + headlines) + Citizen Usage Log (canonical
 *      citizen ↔ reporter shortname annotations).
 *   2. Reads live `Storyline_Tracker` (active+dormant rows only) for
 *      RelatedCitizens per storyline.
 *   3. Matches Citizen-Log tuples to storylines via citizen-name overlap.
 *      Reporter shortname (e.g. "Mezran") is resolved against the Article
 *      Table full name (e.g. "Dr. Lila Mezran") via last-name match.
 *   4. Writes `output/storyline_binding_evidence_c<cycle>.md` (human eyeball)
 *      + `output/storyline_binding_evidence_c<cycle>.json` (consolidator-
 *      consumable).
 *
 * What it does NOT do:
 *   - Write `Storyline_Tracker.AssignedReporter`. That's the consolidator
 *     step — waits for 2+ cycles of consistent evidence before writing.
 *     Manual review fallback during shadow phase preserves editorial integrity
 *     (Fork 2 = Mags' picks).
 *
 * Hook: invoke from `/post-publish` skill after edition .txt finalizes.
 * Idempotent — overwrites cycle output on each run.
 *
 * Companion ROLLOUT row tracks the upstream Press_Drafts.LinkedStoryline gap
 * (engine-sheet); this script bypasses that gap by reading edition .txt
 * directly. If/when the intake parser gets fixed, an engine-side path can
 * replace this one without changing T3.5b's contract.
 */

require('/root/GodWorld/lib/env');

const fs = require('fs');
const path = require('path');
const { getRawSheetData } = require('../lib/sheets');

const STORYLINE_SHEET = 'Storyline_Tracker';
const EDITIONS_DIR = path.join(__dirname, '..', 'editions');
const OUTPUT_DIR = path.join(__dirname, '..', 'output');

function parseArgs() {
  const args = process.argv.slice(2);
  const out = { cycle: null };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--cycle' || args[i] === '-c') out.cycle = parseInt(args[++i], 10);
  }
  return out;
}

function findEditionFile(cycle) {
  const candidate = path.join(EDITIONS_DIR, `cycle_pulse_edition_${cycle}.txt`);
  return fs.existsSync(candidate) ? candidate : null;
}

function findLatestEditionCycle() {
  if (!fs.existsSync(EDITIONS_DIR)) return null;
  const cycles = fs.readdirSync(EDITIONS_DIR)
    .map((f) => f.match(/^cycle_pulse_edition_(\d+)\.txt$/))
    .filter(Boolean)
    .map((m) => parseInt(m[1], 10))
    .sort((a, b) => b - a);
  return cycles[0] || null;
}

/**
 * Parse Article Table block. Returns [{ id, section, headline, reporter, words }].
 * IDs may be 'FRONT' or numeric — kept as strings.
 */
function parseArticleTable(text) {
  const start = text.indexOf('ARTICLE TABLE');
  if (start < 0) return [];
  const block = text.slice(start);
  const lines = block.split('\n');
  const articles = [];
  let inTable = false;
  for (const line of lines) {
    if (/^\|\s*#\s*\|\s*Section\s*\|/i.test(line)) { inTable = true; continue; }
    if (inTable && /^\|\s*-+\s*\|/.test(line)) continue;
    if (inTable && /^\|/.test(line)) {
      const parts = line.split('|').map((s) => s.trim());
      if (parts.length < 6) continue;
      const id = parts[1];
      const section = parts[2];
      const headline = parts[3];
      const reporter = parts[4];
      if (!id || !reporter) continue;
      articles.push({ id: id, section: section, headline: headline, reporter: reporter, words: parts[5] });
    } else if (inTable && line.trim() === '') {
      break;
    }
  }
  return articles;
}

/**
 * Parse Citizen Usage Log entries directly into (citizen, reporter, sifId)
 * tuples. The annotation `(SiftId / Reporter)` at end of line ties a citizen
 * to an article via sift-internal ID + reporter shortname (last-name only).
 *
 * Example:
 *   "- Patricia Nolan, 55, retired teacher, Temescal (POP-00729) (S1 / Mezran)"
 *   → { citizen: 'patricia nolan', sifId: 'S1', reporter: 'Mezran' }
 *
 * Multiple sift-IDs ("S1 + S2") and multiple reporters ("Mezran + Maria")
 * fan out into separate tuples. Lines without trailing annotation skipped
 * (those are role-only references, not article-bound).
 */
function parseCitizenUsageLog(text) {
  const start = text.indexOf('CITIZEN USAGE LOG');
  if (start < 0) return [];
  const end = text.indexOf('BUSINESSES NAMED', start);
  const block = text.slice(start, end > 0 ? end : undefined);

  const tuples = [];
  const lines = block.split('\n');
  const idAttrRe = /\(([^()]*?)\s*\/\s*([^()]+?)\)\s*$/;
  const idTokenRe = /\b(?:S(\d+[a-z]?)|FRONT|L(\d+))\b/g;
  const reporterSplitRe = /\s*[+&,]\s*/;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line.startsWith('-')) continue;
    const idMatch = idAttrRe.exec(line);
    if (!idMatch) continue;
    const idTokenStr = idMatch[1];
    const reporterStr = idMatch[2].trim();

    let nameField = line.replace(/^-+\s*/, '');
    nameField = nameField.replace(/\s*\(.*$/, '');
    nameField = nameField.split(',')[0].trim();
    if (!nameField) continue;
    const citizen = nameField.toLowerCase();

    const ids = [];
    let m;
    idTokenRe.lastIndex = 0;
    while ((m = idTokenRe.exec(idTokenStr)) !== null) {
      if (m[1]) ids.push('S' + m[1]);
      else if (m[2]) ids.push('L' + m[2]);
      else if (m[0] === 'FRONT') ids.push('FRONT');
    }
    if (ids.length === 0) continue;

    const reporters = reporterStr.split(reporterSplitRe).map((s) => s.trim()).filter(Boolean);
    for (const id of ids) {
      for (const rep of reporters) {
        tuples.push({ citizen: citizen, sifId: id, reporter: rep });
      }
    }
  }
  return tuples;
}

/**
 * Resolve a reporter shortname against the Article Table's full names.
 * Tries: exact match, last-name match, first-name match, "M. Corliss" pattern.
 * Returns full name when found, shortname otherwise.
 */
function resolveReporterName(shortName, articles) {
  if (!shortName) return shortName;
  const short = shortName.toLowerCase().trim();
  for (const a of articles) {
    const full = String(a.reporter || '').toLowerCase().trim();
    if (!full) continue;
    if (full === short) return a.reporter;
    const tokens = full.split(/\s+/);
    if (tokens[tokens.length - 1] === short) return a.reporter;
    if (tokens[0] === short) return a.reporter;
    if (short.indexOf('.') > 0) {
      const sParts = short.split(/\s+/);
      const initial = sParts[0].replace('.', '');
      const lastShort = sParts.slice(1).join(' ');
      if (tokens[0].charAt(0) === initial && tokens[tokens.length - 1] === lastShort) return a.reporter;
    }
  }
  return shortName;
}

/**
 * Match Citizen-Usage-Log tuples against active+dormant storylines via
 * citizen-name overlap. Returns [{ storylineId, storylineRowNumber,
 * storylineTitle, sifId, reporter, matchedCitizen, articleSection,
 * articleHeadline, score }].
 *
 * Score = 1 per tuple match. Multiple tuples for same (storyline, reporter)
 * pair surface as separate rows; the consolidator/eyeball decides.
 */
function matchCitizensToStorylines(articles, citizenTuples, storylineRows) {
  const headers = storylineRows[0];
  const idIdx = headers.indexOf('StorylineId');
  const titleIdx = headers.indexOf('Title');
  const descIdx = headers.indexOf('Description');
  const citizensIdx = headers.indexOf('RelatedCitizens');
  const statusIdx = headers.indexOf('Status');

  // Build sifId → article index for context (headline, section)
  const articleById = {};
  for (const a of articles) articleById[a.id] = a;

  const matches = [];
  for (let i = 1; i < storylineRows.length; i++) {
    const row = storylineRows[i];
    const status = statusIdx >= 0 ? String(row[statusIdx] || '').toLowerCase().trim() : '';
    if (status === 'resolved' || status === 'abandoned') continue;
    const storylineId = idIdx >= 0 ? String(row[idIdx] || '').trim() : '';
    const title = titleIdx >= 0 ? String(row[titleIdx] || '').trim() : '';
    const description = descIdx >= 0 ? String(row[descIdx] || '').trim() : '';
    const relatedRaw = citizensIdx >= 0 ? String(row[citizensIdx] || '') : '';
    if (!relatedRaw.trim()) continue;

    const relatedSet = new Set(
      relatedRaw.split(/[,;]/).map((s) => s.trim().toLowerCase()).filter(Boolean)
    );
    if (relatedSet.size === 0) continue;

    for (const tuple of citizenTuples) {
      let overlap = false;
      for (const rc of relatedSet) {
        if (tuple.citizen === rc || tuple.citizen.indexOf(rc) >= 0 || rc.indexOf(tuple.citizen) >= 0) {
          overlap = true;
          break;
        }
      }
      if (!overlap) continue;
      const fullReporter = resolveReporterName(tuple.reporter, articles);
      const article = articleById[tuple.sifId] || null;
      matches.push({
        storylineId: storylineId,
        storylineRowNumber: i + 1,
        storylineTitle: title || description.slice(0, 60),
        sifId: tuple.sifId,
        reporter: fullReporter,
        reporterShort: tuple.reporter,
        matchedCitizen: tuple.citizen,
        articleSection: article ? article.section : '',
        articleHeadline: article ? article.headline : '',
        score: 1
      });
    }
  }
  return matches;
}

/**
 * Aggregate raw matches into (storylineId, reporter) pairs with counts.
 */
function aggregatePairs(matches) {
  const pairs = {};
  for (const m of matches) {
    const key = `${m.storylineId || 'row' + m.storylineRowNumber}::${m.reporter}`;
    if (!pairs[key]) {
      pairs[key] = {
        storylineId: m.storylineId,
        storylineRowNumber: m.storylineRowNumber,
        storylineTitle: m.storylineTitle,
        reporter: m.reporter,
        articles: [],
        matchedCitizens: new Set()
      };
    }
    pairs[key].matchedCitizens.add(m.matchedCitizen);
    if (m.sifId && pairs[key].articles.indexOf(m.sifId) < 0) pairs[key].articles.push(m.sifId);
  }
  return Object.values(pairs).map((p) => ({
    ...p,
    matchedCitizens: Array.from(p.matchedCitizens),
    articleCount: p.articles.length,
    citizenCount: p.matchedCitizens.size
  }));
}

function renderEvidenceMarkdown(cycle, articles, matches, pairs) {
  const lines = [];
  lines.push(`# Storyline Binding Evidence — C${cycle}`);
  lines.push('');
  lines.push(`**Generated:** ${new Date().toISOString()}`);
  lines.push(`**Source:** \`editions/cycle_pulse_edition_${cycle}.txt\``);
  lines.push(`**Articles parsed:** ${articles.length}`);
  lines.push(`**Citizen-log tuples:** total ${matches.length} matched against active storylines`);
  lines.push(`**Candidate bindings:** ${pairs.length} unique (storyline, reporter) pairs`);
  lines.push('');
  lines.push('Plan T3.5b option (ii) refined: evidence-logger only this commit. Sheet writer waits for 2+ cycles of consistent evidence before writing `Storyline_Tracker.AssignedReporter`. Mike-eyeball or future consolidator drives the actual write.');
  lines.push('');

  if (pairs.length === 0) {
    lines.push('## No candidate bindings');
    lines.push('');
    lines.push('Citizen-Usage-Log annotations did not overlap any active+dormant storyline\'s `RelatedCitizens`. Possible causes: (1) edition has no canon-bound articles whose citizens appear on storylines, (2) Storyline_Tracker.RelatedCitizens is stale (most populated rows are old; recent storylines often empty), (3) annotation pattern in this edition deviates from `(SiftId / Reporter)` shape.');
    lines.push('');
    return lines.join('\n');
  }

  pairs.sort((a, b) => (b.articleCount + b.citizenCount * 0.1) - (a.articleCount + a.citizenCount * 0.1));

  lines.push('## Candidate (storyline, reporter) bindings');
  lines.push('');
  lines.push('Sorted by article count (consensus signal). Pairs with multiple articles same cycle are higher-confidence — the reporter is repeatedly drawn to the storyline within one edition.');
  lines.push('');
  lines.push('| StorylineId | Title (excerpt) | Reporter | Articles | Citizens matched |');
  lines.push('|-------------|-----------------|----------|----------|------------------|');
  for (const p of pairs) {
    const t = (p.storylineTitle || '').slice(0, 50).replace(/\|/g, '\\|');
    const cz = p.matchedCitizens.slice(0, 3).join(', ').replace(/\|/g, '\\|');
    const arts = p.articles.join(' + ');
    lines.push(`| ${p.storylineId || '(no id)'} | ${t} | ${p.reporter} | ${arts} | ${cz} |`);
  }
  lines.push('');

  const repeats = pairs.filter((p) => p.articleCount > 1);
  if (repeats.length > 0) {
    lines.push('## Within-edition reporter consensus (≥2 articles per storyline + same reporter)');
    lines.push('');
    lines.push('Strong same-cycle signal — these are the highest-confidence binding candidates.');
    lines.push('');
    for (const p of repeats) {
      lines.push(`- **${p.storylineId || 'row' + p.storylineRowNumber}** (${(p.storylineTitle || '').slice(0, 60)}) ↔ **${p.reporter}** (${p.articleCount} articles: ${p.articles.join(' + ')})`);
    }
    lines.push('');
  }

  lines.push('## Per-tuple raw matches');
  lines.push('');
  lines.push('| StorylineId | Citizen | Sift ID | Reporter | Article |');
  lines.push('|-------------|---------|---------|----------|---------|');
  for (const m of matches) {
    const headline = (m.articleHeadline || '').slice(0, 40).replace(/\|/g, '\\|');
    lines.push(`| ${m.storylineId || '(no id)'} | ${m.matchedCitizen} | ${m.sifId} | ${m.reporter} | ${headline} |`);
  }
  lines.push('');

  lines.push('---');
  lines.push('');
  lines.push('**Next step:** consolidator reads multiple cycle evidence files, finds (storylineId, reporter) pairs in 2+ recent cycles, writes to `Storyline_Tracker.AssignedReporter`. Until consolidator ships (T3.5b Phase 2), bindings are advisory only.');
  return lines.join('\n');
}

async function main() {
  const args = parseArgs();
  const cycle = args.cycle != null ? args.cycle : findLatestEditionCycle();
  if (!cycle) {
    throw new Error('No edition .txt files found and no --cycle provided');
  }

  const editionPath = findEditionFile(cycle);
  if (!editionPath) {
    throw new Error(`editions/cycle_pulse_edition_${cycle}.txt not found`);
  }
  const editionText = fs.readFileSync(editionPath, 'utf8');

  const articles = parseArticleTable(editionText);
  const citizenTuples = parseCitizenUsageLog(editionText);
  const storylineRows = await getRawSheetData(STORYLINE_SHEET);

  const matches = matchCitizensToStorylines(articles, citizenTuples, storylineRows);
  const pairs = aggregatePairs(matches);

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const mdPath = path.join(OUTPUT_DIR, `storyline_binding_evidence_c${cycle}.md`);
  const jsonPath = path.join(OUTPUT_DIR, `storyline_binding_evidence_c${cycle}.json`);
  fs.writeFileSync(mdPath, renderEvidenceMarkdown(cycle, articles, matches, pairs));
  fs.writeFileSync(jsonPath, JSON.stringify({
    cycle: cycle,
    generatedAt: new Date().toISOString(),
    articleCount: articles.length,
    citizenTupleCount: citizenTuples.length,
    matchCount: matches.length,
    pairCount: pairs.length,
    matches: matches,
    pairs: pairs
  }, null, 2));

  console.log(`Wrote ${mdPath}`);
  console.log(`Wrote ${jsonPath}`);
  console.log(`Cycle: C${cycle}`);
  console.log(`Articles: ${articles.length}`);
  console.log(`Citizen-log tuples: ${citizenTuples.length}`);
  console.log(`Storyline rows scanned: ${storylineRows.length - 1}`);
  console.log(`Raw matches: ${matches.length}`);
  console.log(`Unique (storyline, reporter) pairs: ${pairs.length}`);
}

main().catch((err) => {
  console.error(err.stack || err.message);
  process.exit(1);
});

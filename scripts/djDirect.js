#!/usr/bin/env node
/**
 * ============================================================================
 * DJ Direct — Photo Direction Bundler v1.0
 * ============================================================================
 *
 * Stage 1 of the rebuilt photo pipeline (Phase 21.3, S188).
 *
 * Bundles editorial inputs for DJ Hartley (the photo-direction subagent) so
 * he can produce 5-8 storyline-tied image specs without burning context on
 * the entire edition. Reads three sources, composes a focused bundle, and
 * prints the next-step instruction telling Claude to invoke dj-hartley.
 *
 * The DJ subagent invocation itself happens in-session via the Agent tool
 * (Claude Code primitive). This script is the deterministic-glue half.
 *
 * Usage:
 *   node scripts/djDirect.js 92                                       (edition)
 *   node scripts/djDirect.js 92 --top-n 5                             (edition, custom N)
 *   node scripts/djDirect.js 92 --type dispatch --slug <slug>         (dispatch)
 *   node scripts/djDirect.js 92 --type interview --slug <slug>        (interview)
 *   node scripts/djDirect.js 92 --type supplemental --slug <slug>     (supplemental)
 *
 * Flags:
 *   --type T     One of edition (default) | dispatch | interview | supplemental.
 *   --slug S     Required for non-edition types. Matches the published .txt slug.
 *   --top-n N    (edition only) Number of top-scored proposals to feature in
 *                full body. Default 6. Remaining proposals appear in §EDITION INDEX.
 *
 * Inputs (edition):
 *   editions/cycle_pulse_edition_<XX>.txt
 *   output/sift_proposals_c<XX>.json
 *   output/world_summary_c<XX>.md
 *
 * Inputs (non-edition):
 *   editions/cycle_pulse_<type>_<XX>_<slug>.txt
 *   output/world_summary_c<XX>.md          (optional — used for atmospheric)
 *
 * Output (edition):
 *   output/photos/e<XX>/dj_input_bundle.md
 *
 * Output (non-edition):
 *   output/photos/<type>_c<XX>_<slug>/dj_input_bundle.md
 *
 * ============================================================================
 */

var fs = require('fs');
var path = require('path');
var editionParser = require('../lib/editionParser');

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

var ALLOWED_TYPES = ['edition', 'dispatch', 'interview', 'supplemental'];

function parseArgs() {
  var args = process.argv.slice(2);
  if (args.length < 1) {
    console.error('Usage: node scripts/djDirect.js <cycle> [--type T] [--slug S] [--top-n N]');
    process.exit(1);
  }
  var cycle = parseInt(args[0], 10);
  if (Number.isNaN(cycle) || cycle < 1) {
    console.error('Error: cycle must be a positive integer');
    process.exit(1);
  }
  var topN = 6;
  var type = 'edition';
  var slug = null;
  for (var i = 1; i < args.length; i++) {
    if (args[i] === '--top-n' && args[i + 1]) {
      topN = parseInt(args[i + 1], 10);
      if (Number.isNaN(topN) || topN < 1) {
        console.error('Error: --top-n must be a positive integer');
        process.exit(1);
      }
      i++;
    } else if (args[i] === '--type' && args[i + 1]) {
      type = args[i + 1];
      if (ALLOWED_TYPES.indexOf(type) === -1) {
        console.error('Error: --type must be one of: ' + ALLOWED_TYPES.join(', '));
        process.exit(1);
      }
      i++;
    } else if (args[i] === '--slug' && args[i + 1]) {
      slug = args[i + 1];
      i++;
    }
  }
  if (type !== 'edition' && !slug) {
    console.error('Error: --slug is required for --type ' + type);
    process.exit(1);
  }
  return { cycle: cycle, topN: topN, type: type, slug: slug };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function pad(cycle) {
  return String(cycle);
}

function existsOrDie(filePath, label) {
  if (!fs.existsSync(filePath)) {
    console.error('Error: missing ' + label + ' at ' + filePath);
    process.exit(1);
  }
}

function priorityRank(p) {
  if (p === 'HIGH') return 3;
  if (p === 'MEDIUM') return 2;
  if (p === 'LOW') return 1;
  return 0;
}

// Sort proposals: score desc, then frontPage true first, then priority HIGH > MED > LOW
function sortProposals(proposals) {
  var copy = proposals.slice();
  copy.sort(function (a, b) {
    var sa = a.score || 0;
    var sb = b.score || 0;
    if (sb !== sa) return sb - sa;
    var fa = a.frontPage ? 1 : 0;
    var fb = b.frontPage ? 1 : 0;
    if (fb !== fa) return fb - fa;
    return priorityRank(b.priority) - priorityRank(a.priority);
  });
  return copy;
}

// Extract last name(s) from byline string ("By Carmen Delaine | Bay Tribune Civic Ledger")
function bylineMatchesReporter(byline, reporter) {
  if (!byline || !reporter) return false;
  var nameOnly = byline.replace(/^By\s+/i, '').split('|')[0].trim().toLowerCase();
  return nameOnly.indexOf(reporter.toLowerCase()) !== -1 ||
         reporter.toLowerCase().indexOf(nameOnly) !== -1;
}

// Best-match an article in the parsed edition for a sift proposal
function findArticleForProposal(parsed, proposal) {
  var sectionBeat = editionParser.guessBeat(proposal.section || '');
  var candidates = [];
  for (var s = 0; s < parsed.sections.length; s++) {
    var sec = parsed.sections[s];
    if (sectionBeat !== 'general' && sec.beat !== sectionBeat) continue;
    for (var a = 0; a < sec.articles.length; a++) {
      var art = sec.articles[a];
      if (bylineMatchesReporter(art.byline, proposal.reporter)) {
        candidates.push({ article: art, section: sec });
      }
    }
  }
  // If no section-beat match, fall back to byline match across all sections
  if (candidates.length === 0) {
    for (var s2 = 0; s2 < parsed.sections.length; s2++) {
      var sec2 = parsed.sections[s2];
      for (var a2 = 0; a2 < sec2.articles.length; a2++) {
        var art2 = sec2.articles[a2];
        if (bylineMatchesReporter(art2.byline, proposal.reporter)) {
          candidates.push({ article: art2, section: sec2 });
        }
      }
    }
  }
  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];
  // Multiple matches — prefer one whose headline shares words with proposal title
  var titleWords = (proposal.title || '').toLowerCase().split(/\W+/).filter(function (w) { return w.length > 3; });
  var best = candidates[0];
  var bestHits = 0;
  for (var c = 0; c < candidates.length; c++) {
    var headline = (candidates[c].article.headline || '').toLowerCase();
    var hits = 0;
    for (var w = 0; w < titleWords.length; w++) {
      if (headline.indexOf(titleWords[w]) !== -1) hits++;
    }
    if (hits > bestHits) { best = candidates[c]; bestHits = hits; }
  }
  return best;
}

// Flatten parsed edition into a list of all articles for the index
function buildArticleIndex(parsed) {
  var rows = [];
  for (var s = 0; s < parsed.sections.length; s++) {
    var sec = parsed.sections[s];
    if (sec.beat === 'meta') continue;
    for (var a = 0; a < sec.articles.length; a++) {
      var art = sec.articles[a];
      if (!art.headline && !art.byline) continue;
      rows.push({
        section: sec.name,
        headline: art.headline || '(untitled)',
        byline: art.byline || ''
      });
    }
  }
  return rows;
}

// ---------------------------------------------------------------------------
// Bundle composition
// ---------------------------------------------------------------------------

function composeBundle(opts) {
  var cycle = opts.cycle;
  var topN = opts.topN;
  var siftRaw = opts.siftRaw;
  var worldSummary = opts.worldSummary;
  var matches = opts.matches;
  var unmatched = opts.unmatched;
  var indexRows = opts.indexRows;

  var lines = [];
  lines.push('# DJ Hartley Input Bundle — Cycle ' + cycle);
  lines.push('');
  lines.push('Generated: ' + new Date().toISOString());
  lines.push('Top-N featured: ' + topN + ' (ranked by sift score, frontPage, priority)');
  lines.push('');
  lines.push('Source files:');
  lines.push('- editions/cycle_pulse_edition_' + cycle + '.txt');
  lines.push('- output/sift_proposals_c' + cycle + '.json');
  lines.push('- output/world_summary_c' + cycle + '.md');
  lines.push('');
  lines.push('---');
  lines.push('');

  // §SIFT WEIGHT
  lines.push('## §SIFT WEIGHT');
  lines.push('');
  lines.push('Editorial ranking from `/sift`. Higher score = higher editorial weight.');
  lines.push('Use this to decide what deserves a hero shot vs secondary scene vs atmospheric frame.');
  lines.push('');
  lines.push('```json');
  lines.push(siftRaw.trim());
  lines.push('```');
  lines.push('');
  lines.push('---');
  lines.push('');

  // §FEATURED ARTICLES
  lines.push('## §FEATURED ARTICLES');
  lines.push('');
  lines.push('Top ' + matches.length + ' articles by sift score. Full body included.');
  lines.push('');
  for (var m = 0; m < matches.length; m++) {
    var entry = matches[m];
    var prop = entry.proposal;
    var match = entry.match;
    lines.push('### ' + (m + 1) + '. ' + prop.title);
    lines.push('');
    lines.push('- **Section:** ' + prop.section);
    lines.push('- **Reporter:** ' + (prop.reporter || '(unknown)'));
    lines.push('- **Sift score:** ' + (prop.score || 'n/a') +
               '  |  **Priority:** ' + (prop.priority || 'n/a') +
               '  |  **Front page:** ' + (prop.frontPage ? 'yes' : 'no'));
    if (prop.layers && prop.layers.length) {
      lines.push('- **Layers:** ' + prop.layers.join(', '));
    }
    if (prop.sourceSignal) {
      lines.push('- **Source signal:** ' + prop.sourceSignal);
    }
    lines.push('');
    if (match && match.article) {
      lines.push('**Headline (as published):** ' + (match.article.headline || '(no headline)'));
      if (match.article.byline) {
        lines.push('**Byline:** ' + match.article.byline);
      }
      lines.push('');
      lines.push(match.article.text);
    } else {
      lines.push('*[No matching article body found in compiled edition. ' +
                 'Reporter: ' + (prop.reporter || 'unknown') + '. ' +
                 'Use proposal source signal as direction context.]*');
    }
    lines.push('');
    lines.push('---');
    lines.push('');
  }

  // §EDITION INDEX
  lines.push('## §EDITION INDEX');
  lines.push('');
  lines.push('All articles in this edition. Use to orient — these stories exist even ');
  lines.push('if not featured in full above. Atmospheric frames may reference them.');
  lines.push('');
  lines.push('| # | Section | Headline | Byline |');
  lines.push('|---|---------|----------|--------|');
  for (var r = 0; r < indexRows.length; r++) {
    var row = indexRows[r];
    var bl = (row.byline || '').replace(/\|/g, '\\|');
    var hl = (row.headline || '').replace(/\|/g, '\\|');
    var sn = (row.section || '').replace(/\|/g, '\\|');
    lines.push('| ' + (r + 1) + ' | ' + sn + ' | ' + hl + ' | ' + bl + ' |');
  }
  lines.push('');
  lines.push('---');
  lines.push('');

  // §WORLD SNAPSHOT
  lines.push('## §WORLD SNAPSHOT');
  lines.push('');
  lines.push('Neighborhood mood and atmospheric context for this cycle. Use for ');
  lines.push('atmospheric Oakland frames per LENS §Vantage Points.');
  lines.push('');
  lines.push(worldSummary.trim());
  lines.push('');
  lines.push('---');
  lines.push('');

  // §INSTRUCTION FOR DJ
  lines.push('## §INSTRUCTION FOR DJ');
  lines.push('');
  lines.push('You are the photo art director for Cycle Pulse Edition ' + cycle + '.');
  lines.push('');
  lines.push('Produce **5–8 image specs** covering this distribution:');
  lines.push('- 1 hero shot for the front-page lead');
  lines.push('- 2–3 secondary article scenes (drawn from §FEATURED ARTICLES)');
  lines.push('- 1–2 atmospheric Oakland frames per LENS §Vantage Points');
  lines.push('  (Heinold\'s, ferry terminal, Coliseum tunnel, Lake Merritt pergola, etc.)');
  lines.push('- 0–1 portrait if a citizen profile anchors the edition');
  lines.push('');
  lines.push('Output a **single JSON array**. Each spec follows the §Worked Example shape ');
  lines.push('from `docs/plans/2026-04-25-photo-pipeline-rebuild.md`:');
  lines.push('');
  lines.push('```json');
  lines.push('{');
  lines.push('  "slug": "lowercase_underscore_separated",');
  lines.push('  "thesis": "one sentence — what the photo argues",');
  lines.push('  "mood": "one sentence — emotional register",');
  lines.push('  "motifs": "comma-separated visual elements",');
  lines.push('  "composition": "framing + camera + eye level",');
  lines.push('  "credit": "Photographer Name / Bay Tribune",');
  lines.push('  "section": "FRONT PAGE | CIVIC AFFAIRS | SPORTS | CULTURE | BUSINESS | etc. — match the parsed section name in the compiled edition for any shot tied to a storyline. Use \\"ATMOSPHERIC\\" for vantage-point frames not tied to a specific article.",');
  lines.push('  "image_prompt": "100-220 words. Include: specific cross-street + time-of-day, ');
  lines.push('    explicit subject (age, role, what they wear, what they carry), ');
  lines.push('    photojournalism camera language (35mm equivalent, eye-level), ');
  lines.push('    AND a closing negative-frame paragraph: \\"NOT in frame: tents, boarded ');
  lines.push('    storefronts, barred windows, broken glass, anyone in distress, decorative grit. ');
  lines.push('    NO text artifacts, NO logos, NO recognizable real-world brand identification.\\""');
  lines.push('}');
  lines.push('```');
  lines.push('');
  lines.push('**Slug must be snake_case ONLY** — underscores between words, no dashes, no hyphens, ');
  lines.push('no kebab-case. The validator at `generate-edition-photos.js:122` enforces ');
  lines.push('`^[a-z0-9_]+$` and rejects every spec with a dash. (G-PR8, S196.)');
  lines.push('');
  lines.push('**Word band 100-220** matches validator constants. Aim 140-180 for working comfort; ');
  lines.push('rolls outside 100-220 hard-fail. (G-PR9, S196.)');
  lines.push('');
  lines.push('**Negative-frame is mandatory** (S170 root cause). Every prompt closes with ');
  lines.push('explicit NOT-in-frame instructions to override FLUX-defaults-to-blight.');
  lines.push('');
  lines.push('**Suppress signage by COMPOSITION, not by negative-frame instruction.** When a scene ');
  lines.push('contains institutional or commercial signage (stadium walls, fence signs, placards, ');
  lines.push('vests, badges), FLUX renders plausible text in the visual environment regardless of ');
  lines.push('"NO text" negative-frame paragraphs (G-PR10/13, S196). The negative frame is a soft ');
  lines.push('suggestion to the model, not a hard constraint. Suppress text legibility through ');
  lines.push('composition: depth-of-field that blurs the sign, extreme angle that crops it out, ');
  lines.push('distance that puts it out of focus, frame crop that excludes it. ATLAS BAY PASS in ');
  lines.push('C93 (atlas_bay_fence_sarah_huang) modeled this — wide-angle with subject in foreground ');
  lines.push('and fence as middle ground naturally blurred environmental text. Use that pattern when ');
  lines.push('signage is part of the scene but text legibility is canon-forbidden.');
  lines.push('');
  lines.push('**Credit assignment:** Apply LENS team rules from `.claude/agents/dj-hartley/LENS.md`.');
  lines.push('Use only Tribune photographer names defined there. Do NOT confuse photographers ');
  lines.push('with reviewer/audit agents (Mara Vance is canon audit, not a photographer).');
  lines.push('');
  lines.push('### Canon-Allowed Brand Identification');
  lines.push('');
  lines.push('The negative-frame "NO recognizable real-world commercial identification" line is a ');
  lines.push('default. The following overrides apply — these brands ARE canon and belong in scenes.');
  lines.push('When a shot involves any of them, write the negative-frame to FORBID generic real-world ');
  lines.push('chains while ALLOWING the canon brand by name.');
  lines.push('');
  lines.push('**Oakland Athletics (A\'s) branding — ALLOWED.** Uniforms, "Athletics" wordmark, ');
  lines.push('elephant logo, green/gold color scheme are canon. Photos at the Coliseum, training ');
  lines.push('facility, or any A\'s-context shot SHOULD show them. Don\'t fight the canon.');
  lines.push('');
  lines.push('**Jersey numbers — MUST match the 2041 roster** (`docs/media/2041_athletics_roster.md`). ');
  lines.push('Two valid approaches per shot:');
  lines.push('- Name a specific roster player and specify their canon jersey number in the prompt');
  lines.push('  (e.g., "Darrin Davis #25 at the plate"). Read the roster before writing the prompt.');
  lines.push('- Specify "no legible jersey numbers" or "players framed from behind / at distance ');
  lines.push('  so jersey numbers are not readable" — anonymity through composition.');
  lines.push('NEVER let the generator render arbitrary numbers. FLUX will fabricate plausible-but-wrong ');
  lines.push('numbers (#20, #18, #12 — none of which may be on the canon roster).');
  lines.push('');
  lines.push('**Canon-allowed Oakland landmarks — REAL names allowed.** See ');
  lines.push('`docs/canon/INSTITUTIONS.md` §Arts, Culture & Landmarks for the full Tier-1 list ');
  lines.push('(Fox Theater, Paramount, Heinold\'s, OMCA, Lake Merritt pergola, Jack London Square, ');
  lines.push('Coliseum, ferry terminal, OACC, Malonga Center, etc.). Real signage and identifying ');
  lines.push('marks belong in these frames — write the venue name into the positive frame, not the ');
  lines.push('negative frame. DJ LENS §Vantage Points carries the same list.');
  lines.push('');
  lines.push('**Tier-1 canon institutions** (per `docs/canon/INSTITUTIONS.md`) — use the real name ');
  lines.push('(Temescal Community Health Center, Alameda Health System, Lake Merritt, etc.).');
  lines.push('');
  lines.push('**Tier-2 canon-substitute institutions** (per `docs/canon/INSTITUTIONS.md`) — use the ');
  lines.push('substitute name only (Atlas Bay Architects, NOT the real firm). NEVER the real-world ');
  lines.push('name. This is the canon-fidelity rollout from S174/S175.');
  lines.push('');
  lines.push('### Storefronts and Businesses Not in Any Canon List');
  lines.push('');
  lines.push('When a shot includes background storefronts or businesses that aren\'t on the canon list, ');
  lines.push('two valid approaches:');
  lines.push('- Use a clearly invented fictional name (e.g., "Buena Vista Hardware", "El Niño ');
  lines.push('  Tortillería", "Lake Pharmacy" — invented, plausible, Oakland-flavored)');
  lines.push('- Specify "no legible storefront text" or "storefront window with generic awning, no ');
  lines.push('  brand visible" if a clean frame fits the shot.');
  lines.push('');
  lines.push('NEVER let the generator render real-world chain names. Your negative-frame paragraph ');
  lines.push('must explicitly list and forbid the most likely defaults — "NO Walgreens, NO Safeway, ');
  lines.push('NO Starbucks, NO Target, NO real-world chain branding" — adapt to the shot context.');
  lines.push('');

  // Provenance footer
  if (unmatched.length > 0) {
    lines.push('---');
    lines.push('');
    lines.push('## §BUNDLE NOTES');
    lines.push('');
    lines.push('The following sift proposals had no matching article body in the compiled ');
    lines.push('edition (likely cut at edit time, or reporter byline shifted). Direction can ');
    lines.push('still draw on their source signal:');
    lines.push('');
    for (var u = 0; u < unmatched.length; u++) {
      lines.push('- ' + unmatched[u].id + ' · ' + unmatched[u].title +
                 ' (reporter: ' + (unmatched[u].reporter || 'unknown') + ')');
    }
    lines.push('');
  }

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

// Per-type photo budget — emitted in §INSTRUCTION FOR DJ
var PHOTO_BUDGET = {
  edition: { min: 5, max: 8, label: '5-8 specs', distribution: '1 hero shot for the front-page lead, 2-3 secondary article scenes, 1-2 atmospheric Oakland frames per LENS §Vantage Points, 0-1 portrait if a citizen profile anchors' },
  dispatch: { min: 1, max: 3, label: '1-3 specs', distribution: '1 hero scene for the dispatch storyline, 0-2 supporting frames (alternate angle, atmospheric beat, or detail shot)' },
  interview: { min: 1, max: 3, label: '1-3 specs', distribution: '1 portrait of the interview subject, 1-2 supporting frames (their workplace, the neighborhood referenced, an atmospheric beat tied to the conversation)' },
  supplemental: { min: 1, max: 3, label: '1-3 specs', distribution: '1 hero scene that anchors the supplemental topic, 0-2 supporting frames (secondary scene, atmospheric, or detail)' }
};

function deriveOutDir(type, cycle, slug) {
  if (type === 'edition') return path.join('output', 'photos', 'e' + pad(cycle));
  return path.join('output', 'photos', type + '_c' + pad(cycle) + '_' + slug);
}

function deriveSourcePath(type, cycle, slug) {
  if (type === 'edition') return path.join('editions', 'cycle_pulse_edition_' + pad(cycle) + '.txt');
  return path.join('editions', 'cycle_pulse_' + type + '_' + pad(cycle) + '_' + slug + '.txt');
}

function gatherEdition(opts) {
  var cycle = opts.cycle;
  var topN = opts.topN;
  var sourcePath = deriveSourcePath('edition', cycle);
  var siftPath = path.join('output', 'sift_proposals_c' + pad(cycle) + '.json');
  var worldPath = path.join('output', 'world_summary_c' + pad(cycle) + '.md');

  existsOrDie(sourcePath, 'compiled edition');
  existsOrDie(siftPath, 'sift proposals');
  existsOrDie(worldPath, 'world summary');

  var siftRaw = fs.readFileSync(siftPath, 'utf-8');
  var sift = JSON.parse(siftRaw);
  var worldSummary = fs.readFileSync(worldPath, 'utf-8');
  var parsed = editionParser.parseEdition(sourcePath);

  if (!sift.proposals || sift.proposals.length === 0) {
    console.error('Error: sift proposals JSON has no proposals[] array');
    process.exit(1);
  }

  var ranked = sortProposals(sift.proposals);
  var topProposals = ranked.slice(0, topN);

  var matches = [];
  var unmatched = [];
  for (var p = 0; p < topProposals.length; p++) {
    var prop = topProposals[p];
    var match = findArticleForProposal(parsed, prop);
    if (match) {
      matches.push({ proposal: prop, match: match });
    } else {
      matches.push({ proposal: prop, match: null });
      unmatched.push(prop);
    }
  }

  var indexRows = buildArticleIndex(parsed);

  return {
    siftRaw: siftRaw,
    worldSummary: worldSummary,
    matches: matches,
    unmatched: unmatched,
    indexRows: indexRows
  };
}

function gatherNonEdition(opts) {
  var cycle = opts.cycle;
  var type = opts.type;
  var slug = opts.slug;
  var sourcePath = deriveSourcePath(type, cycle, slug);
  var worldPath = path.join('output', 'world_summary_c' + pad(cycle) + '.md');

  existsOrDie(sourcePath, type + ' source artifact');
  // World summary is optional for non-edition (not all cycles produce it pre-publish)
  var worldSummary = fs.existsSync(worldPath) ? fs.readFileSync(worldPath, 'utf-8') : '';

  var parsed = editionParser.parseEdition(sourcePath);

  // Non-meta sections carry the dispatch/interview/supplemental body.
  // Pick the first non-meta section's first article — that's the piece.
  var article = null;
  var section = null;
  for (var s = 0; s < parsed.sections.length; s++) {
    if (parsed.sections[s].beat === 'meta') continue;
    if (!parsed.sections[s].articles || parsed.sections[s].articles.length === 0) continue;
    article = parsed.sections[s].articles[0];
    section = parsed.sections[s];
    break;
  }

  if (!article) {
    console.error('Error: no article body found in ' + sourcePath +
                  ' (expected first non-meta section to carry the piece)');
    process.exit(1);
  }

  return {
    article: article,
    section: section,
    worldSummary: worldSummary,
    parsed: parsed
  };
}

function composeNonEditionBundle(opts) {
  var cycle = opts.cycle;
  var type = opts.type;
  var slug = opts.slug;
  var article = opts.article;
  var section = opts.section;
  var worldSummary = opts.worldSummary;
  var budget = PHOTO_BUDGET[type];

  var lines = [];
  lines.push('# DJ Hartley Input Bundle — ' + type.charAt(0).toUpperCase() + type.slice(1) +
             ' c' + cycle + ' / ' + slug);
  lines.push('');
  lines.push('Generated: ' + new Date().toISOString());
  lines.push('Type: ' + type);
  lines.push('Photo budget: ' + budget.label);
  lines.push('');
  lines.push('Source: editions/cycle_pulse_' + type + '_' + cycle + '_' + slug + '.txt');
  lines.push('');
  lines.push('---');
  lines.push('');

  // §SOURCE ARTIFACT
  lines.push('## §SOURCE ARTIFACT');
  lines.push('');
  lines.push('The full ' + type + ' piece. Direct DJ from this — no sift weighting needed; it\'s a single piece.');
  lines.push('');
  lines.push('**Section:** ' + (section ? section.name : '(unknown)'));
  lines.push('**Headline (as published):** ' + (article.headline || '(no headline)'));
  if (article.byline) lines.push('**Byline:** ' + article.byline);
  if (article.namesIndex) lines.push('**Names Index:** ' + article.namesIndex);
  lines.push('');
  lines.push(article.text);
  lines.push('');
  lines.push('---');
  lines.push('');

  // §WORLD SNAPSHOT (optional)
  if (worldSummary && worldSummary.trim().length > 0) {
    lines.push('## §WORLD SNAPSHOT');
    lines.push('');
    lines.push('Neighborhood mood and atmospheric context for this cycle. Use for atmospheric ');
    lines.push('frames per LENS §Vantage Points where relevant.');
    lines.push('');
    lines.push(worldSummary.trim());
    lines.push('');
    lines.push('---');
    lines.push('');
  }

  // §INSTRUCTION FOR DJ
  lines.push('## §INSTRUCTION FOR DJ');
  lines.push('');
  lines.push('You are the photo art director for this ' + type + ' (' + slug + ', cycle ' + cycle + ').');
  lines.push('');
  lines.push('Produce **' + budget.label + '** covering this distribution:');
  lines.push('- ' + budget.distribution);
  lines.push('');
  lines.push('Each spec follows the same shape as edition photo specs (slug, thesis, mood, ');
  lines.push('motifs, composition, credit, section, image_prompt). For section: use the parsed ');
  lines.push('section name "' + (section ? section.name : 'BODY') + '" or "ATMOSPHERIC" for ');
  lines.push('atmospheric vantage frames.');
  lines.push('');
  appendCanonAndOutputBlock(lines);

  return lines.join('\n');
}

function appendCanonAndOutputBlock(lines) {
  // Shared output schema + canon-allowed-brand block — used by both edition and non-edition bundles
  lines.push('Output a **single JSON array**. Each spec follows this shape:');
  lines.push('');
  lines.push('```json');
  lines.push('{');
  lines.push('  "slug": "lowercase_underscore_separated",');
  lines.push('  "thesis": "one sentence — what the photo argues",');
  lines.push('  "mood": "one sentence — emotional register",');
  lines.push('  "motifs": "comma-separated visual elements",');
  lines.push('  "composition": "framing + camera + eye level",');
  lines.push('  "credit": "Photographer Name / Bay Tribune",');
  lines.push('  "section": "FRONT PAGE | CIVIC | SPORTS | CULTURE | BUSINESS | ATMOSPHERIC | etc. — match the parsed section name where possible",');
  lines.push('  "image_prompt": "100-220 words. Specific cross-street + time-of-day, explicit subject (age, role, what they wear, what they carry), photojournalism camera language (35mm equivalent, eye-level), AND a closing negative-frame paragraph: NOT in frame: tents, boarded storefronts, barred windows, broken glass, anyone in distress, decorative grit. NO text artifacts, NO logos, NO recognizable real-world brand identification."');
  lines.push('}');
  lines.push('```');
  lines.push('');
  lines.push('**Slug must be snake_case ONLY** — underscores between words, no dashes, no hyphens, ');
  lines.push('no kebab-case. The validator at `generate-edition-photos.js:122` enforces ');
  lines.push('`^[a-z0-9_]+$` and rejects every spec with a dash. (G-PR8, S196.)');
  lines.push('');
  lines.push('**Word band 100-220** matches validator constants. Aim 140-180 for working comfort; ');
  lines.push('rolls outside 100-220 hard-fail. (G-PR9, S196.)');
  lines.push('');
  lines.push('**Negative-frame is mandatory** (S170 root cause). Every prompt closes with ');
  lines.push('explicit NOT-in-frame instructions to override FLUX-defaults-to-blight.');
  lines.push('');
  lines.push('**Suppress signage by COMPOSITION, not by negative-frame instruction.** When a scene ');
  lines.push('contains institutional or commercial signage, FLUX renders plausible text regardless ');
  lines.push('of "NO text" paragraphs (G-PR10/13, S196). Suppress text legibility through composition: ');
  lines.push('depth-of-field, extreme angle, distance, frame crop. Wide-angle with subject in foreground ');
  lines.push('and signage as middle ground (atlas_bay_fence_sarah_huang C93) is the modeled pattern.');
  lines.push('');
  lines.push('**Credit assignment:** Apply LENS team rules from `.claude/agents/dj-hartley/LENS.md`.');
  lines.push('Use only Tribune photographer names defined there. Do NOT confuse photographers ');
  lines.push('with reviewer/audit agents (Mara Vance is canon audit, not a photographer).');
  lines.push('');
  lines.push('### Canon-Allowed Brand Identification');
  lines.push('');
  lines.push('The negative-frame "NO recognizable real-world commercial identification" line is a ');
  lines.push('default. The following overrides apply — these brands ARE canon and belong in scenes.');
  lines.push('');
  lines.push('**Oakland Athletics (A\'s) branding — ALLOWED.** Uniforms, "Athletics" wordmark, ');
  lines.push('elephant logo, green/gold are canon. A\'s in Coliseum/sports shots SHOULD show them.');
  lines.push('');
  lines.push('**Jersey numbers — MUST match the 2041 roster** (`docs/media/2041_athletics_roster.md`). ');
  lines.push('Either name a specific roster player with their canon number, OR specify "no legible ');
  lines.push('jersey numbers" / "framed from behind / at distance." NEVER let FLUX fabricate.');
  lines.push('');
  lines.push('**Canon-allowed Oakland landmarks — REAL names allowed.** See ');
  lines.push('`docs/canon/INSTITUTIONS.md` §Arts, Culture & Landmarks (Fox Theater, Paramount, ');
  lines.push('Heinold\'s, OMCA, Lake Merritt pergola, Jack London Square, Coliseum, ferry terminal, ');
  lines.push('OACC, Malonga Center, etc.). Real signage/identifying marks belong in these frames — ');
  lines.push('write the venue name into the positive frame, not the negative frame.');
  lines.push('');
  lines.push('**Tier-1 canon institutions** — use the real name (Temescal Community Health Center, ');
  lines.push('Alameda Health System, etc., per `docs/canon/INSTITUTIONS.md`).');
  lines.push('');
  lines.push('**Tier-2 canon-substitute institutions** — use the substitute (Atlas Bay Architects ');
  lines.push('not the real firm). NEVER the real-world name.');
  lines.push('');
  lines.push('### Storefronts and Businesses Not in Any Canon List');
  lines.push('');
  lines.push('- Use a clearly invented fictional name (e.g., "Buena Vista Hardware", "El Niño ');
  lines.push('  Tortillería"), OR specify "no legible storefront text."');
  lines.push('- NEVER let the generator render real-world chains. Negative-frame must explicitly ');
  lines.push('  forbid common defaults — "NO Walgreens, NO Safeway, NO Starbucks, NO Target, NO ');
  lines.push('  real-world chain branding" — adapt to shot context.');
  lines.push('');
}

function main() {
  var argv = parseArgs();
  var cycle = argv.cycle;
  var topN = argv.topN;
  var type = argv.type;
  var slug = argv.slug;

  var outDir = deriveOutDir(type, cycle, slug);
  var outPath = path.join(outDir, 'dj_input_bundle.md');

  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  var bundle;
  var summary = {};

  if (type === 'edition') {
    var data = gatherEdition({ cycle: cycle, topN: topN });
    bundle = composeBundle({
      cycle: cycle,
      topN: topN,
      siftRaw: data.siftRaw,
      worldSummary: data.worldSummary,
      matches: data.matches,
      unmatched: data.unmatched,
      indexRows: data.indexRows
    });
    var unmatchedDetail = data.unmatched.length === 0
      ? '0 proposals'
      : data.unmatched.length + ' proposals (no article body): ' +
        data.unmatched.map(function (u) {
          return (u.id || '?') + ' "' + (u.title || 'untitled').slice(0, 40) + '"';
        }).join(', ');
    summary = {
      featured: data.matches.length + ' articles (top ' + topN + ' by sift)',
      sectionsParsed: data.indexRows.length + ' edition rows (raw section/heading count — not unique-article count; see ARTICLE TABLE)',
      unmatched: unmatchedDetail,
      worldSummary: 'included'
    };
  } else {
    var nedata = gatherNonEdition({ cycle: cycle, type: type, slug: slug });
    bundle = composeNonEditionBundle({
      cycle: cycle,
      type: type,
      slug: slug,
      article: nedata.article,
      section: nedata.section,
      worldSummary: nedata.worldSummary
    });
    summary = {
      headline: nedata.article.headline || '(no headline)',
      byline: nedata.article.byline || '(no byline)',
      section: nedata.section ? nedata.section.name : '(unknown)',
      worldSummary: nedata.worldSummary ? 'included' : 'not found (optional, skipped)'
    };
  }

  fs.writeFileSync(outPath, bundle, 'utf-8');
  var bundleBytes = Buffer.byteLength(bundle, 'utf-8');
  var bundleKB = (bundleBytes / 1024).toFixed(1);
  var budget = PHOTO_BUDGET[type];

  console.log('');
  console.log('='.repeat(72));
  console.log('DJ Direct — ' + type + ' c' + cycle + (slug ? ' / ' + slug : '') + ' bundle ready');
  console.log('='.repeat(72));
  console.log('');
  console.log('  Bundle:        ' + outPath);
  console.log('  Size:          ' + bundleKB + ' KB');
  console.log('  Type:          ' + type + ' (' + budget.label + ')');
  Object.keys(summary).forEach(function (k) {
    console.log('  ' + (k + ':').padEnd(14) + ' ' + summary[k]);
  });
  console.log('');
  console.log('-'.repeat(72));
  console.log('Next step (Claude in this session):');
  console.log('-'.repeat(72));
  console.log('');
  console.log('  1. Read the bundle: ' + outPath);
  console.log('  2. Invoke Agent tool with subagent_type="dj-hartley"');
  console.log('     Pass the bundle content as the agent prompt context.');
  console.log('  3. DJ produces a single JSON array of ' + budget.label + '.');
  console.log('  4. Write returned JSON to:');
  console.log('     ' + path.join(outDir, 'dj_direction.json'));
  console.log('  5. Verify each spec has: slug, thesis, mood, motifs, composition,');
  console.log('     credit, section, image_prompt (120-180 words with negative-frame).');
  console.log('');
}

main();

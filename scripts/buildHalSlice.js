#!/usr/bin/env node
/**
 * buildHalSlice.js — Grok-owned sports historian heat slice (pipeline.52 Task 5)
 *
 * Shared sports substrate (sportsSubstrate.js) + HAL_ARCHIVE_BAG overlay.
 * NOT fan heat (P Slayer). NOT board architecture (Anthony). NOT business desk.
 *
 * Present fact first (feed-true), then era echo. Closing palette required.
 *
 * Sources (disk-first):
 *   output/world_summary_c{N}.md  ## Sports
 *   output/desk_signal_c{N}.json  lanes.sports (fallback)
 *   output/simulation_ledger_snapshot.jsonl  name → POPID (optional)
 *   output/reporters/hal-richmond/articles  prior filings (optional)
 *
 * Artifacts:
 *   output/slices/c{N}/hal.md
 *   output/cron-compare/hal_slice_c{N}.json
 *
 * Usage:
 *   node scripts/buildHalSlice.js --cycle 102
 *   node scripts/buildHalSlice.js --cycle 102 --json
 */

'use strict';

const fs = require('fs');
const path = require('path');
const sports = require('./sportsSubstrate');

const ROOT = path.join(__dirname, '..');

const HAL_APPROACH =
  'Historian approach (Hal Richmond): first-person reflective — literary, not wire, not bleacher rage. ' +
  'Present fact first (feed-true: StoryAngle, Stats, record), then era echo. ' +
  'An era echo may name a person, place, team, event, season, or statistic only when the Packet supplies it; otherwise mark the echo missing. ' +
  'Pick 1–2 archive-bag modes. Spell weighty numbers as poetry of time, not scouting grades. ' +
  'End on the closing palette note in this slice (continuity, break, quiet pride, unease, elegy, threshold, city remembers). ' +
  'FORBIDDEN: fan "we" charge, Anthony salary–value architecture as spine, inventing seasons/x-stats, ' +
  'FO bullet strategy, business-desk storefront assignment, multi-voice sports-desk average.';

/** Archive bag modes (docs/media/HAL_ARCHIVE_BAG.md) */
const BAG_MODES = {
  1: 'Era Comparison',
  2: 'Quiet Road After Parade',
  3: 'Predecessor Ghost',
  4: 'Paper Cuts vs Percentiles',
  5: 'Crossing the Threshold',
  6: 'What the City Remembers',
  7: 'Metrics as Poetry',
  8: 'Legacy Guarantee Piece',
  9: 'Season Tide',
  10: 'Desk at Dawn'
};

const CLOSING_PALETTE = [
  'continuity',
  'break of continuity',
  'quiet pride',
  'unease',
  'elegy',
  'threshold crossed',
  'the city remembers'
];

function arg(flag, def) {
  const i = process.argv.indexOf(flag);
  if (i !== -1 && process.argv[i + 1]) return process.argv[i + 1];
  const eq = process.argv.find(a => a.startsWith(flag + '='));
  return eq ? eq.slice(flag.length + 1) : def;
}

/**
 * Classify feed row for historian archive heat (not fan charge, not board memo).
 */
function classifyArchive(row) {
  const angle = String(row.storyAngle || '').toLowerCase();
  const event = String(row.eventKind || '').toLowerCase();
  const notes = String(row.notes || '').toLowerCase();
  const blob = [event, angle, notes, row.team, row.seasonType].join(' ');
  const hasStats = sports.hasUsableStats(row);

  const classes = [];

  // Farewell / resign / era door
  if (/resign|re-sign|farewell|aging star|era|dont close the door|don't close the door|last chapter|legacy/.test(angle + ' ' + notes) ||
      /re-?sign|extension/.test(event)) {
    classes.push('era-door');
  }

  if (/trade|traded|deadline|pillar|unthinkable|shaken|genius/.test(blob) &&
      !/kids are|call.?up/.test(angle)) {
    classes.push('break-continuity');
  }

  if (/call[- ]?up|called up|debut|prospect|kids are alright|kids are|threshold|first time/.test(angle + ' ' + event)) {
    classes.push('threshold');
  }

  if (/award|mvp|cy young|batting title|all.?time|pace|leading the al|elite/.test(blob)) {
    classes.push('metrics-poetry');
  }

  if (hasStats && (/player-feature|season-state/.test(event) || /\d/.test(row.stats || ''))) {
    classes.push('present-line');
  }

  if (/\bW\d+\b/.test(row.streak) || /win streak|straight wins|dynasty|dominate|sweep/.test(blob)) {
    classes.push('season-tide');
  }

  if (/\bL\d+\b/.test(row.streak) || /loss|hangover|defeat|quiet after/.test(angle)) {
    classes.push('quiet-road');
  }

  if (/injur|return from injury|returning from|out for/.test(blob)) {
    classes.push('quiet-road');
  }

  if (/fan-civic|charity|gala|celebration|autograph|youth|community|city/.test(event + ' ' + angle)) {
    classes.push('city-remembers');
  }

  // Stadium / franchise chapter (historian OK; not business desk)
  if (/stadium|arena|naming rights|franchise|expansion/.test(blob) &&
      !/garbage|podcast|dont respect|don't respect/.test(blob)) {
    classes.push('franchise-chapter');
  }

  // Insult / FO noise — soft for Hal unless it has a human present fact
  if (/garbage|podcast|call.?out|dont respect|don't respect/.test(blob)) {
    classes.push('noise-at-edge');
  }

  if (!classes.length) classes.push(hasStats ? 'present-line' : 'desk-dawn');

  const priority = [
    'era-door', 'threshold', 'metrics-poetry', 'break-continuity',
    'quiet-road', 'season-tide', 'city-remembers', 'present-line',
    'franchise-chapter', 'noise-at-edge', 'desk-dawn'
  ];

  if (/kids are alright|kids are|call.?ups?/.test(angle) && classes.includes('threshold')) {
    return { primary: 'threshold', all: classes, hasStats };
  }
  if (/resign|re-sign|aging star|era|farewell/.test(angle) && classes.includes('era-door')) {
    return { primary: 'era-door', all: classes, hasStats };
  }
  if (hasStats && /mvp|all.?time|pace|leading/.test(angle) && classes.includes('metrics-poetry')) {
    return { primary: 'metrics-poetry', all: classes, hasStats };
  }

  const primary = priority.find(c => classes.includes(c)) || classes[0];
  return { primary, all: classes, hasStats };
}

function scoreArchiveRow(row, cycle, priorHits) {
  const cls = classifyArchive(row);
  let score = 0;
  const weights = {
    'era-door': 32,
    'threshold': 26,
    'metrics-poetry': 24,
    'break-continuity': 22,
    'quiet-road': 18,
    'season-tide': 16,
    'city-remembers': 14,
    'present-line': 14,
    'franchise-chapter': 12,
    'noise-at-edge': 4,
    'desk-dawn': 3
  };
  score += weights[cls.primary] || 5;
  for (const c of cls.all) {
    if (c !== cls.primary) score += Math.floor((weights[c] || 0) / 5);
  }

  if (row.cycle === Number(cycle)) score += 16;
  else if (row.cycle === Number(cycle) - 1) score += 8;
  else if (row.cycle === Number(cycle) - 2) score += 4;
  else score -= 3;

  // Present facts: stats / clear story angle
  if (cls.hasStats) score += 10;
  if (row.storyAngle && row.storyAngle.length > 20) score += 4;

  // A's is Hal's river; Oaks OK as franchise chapter
  if (/a'?s/i.test(row.team)) score += 5;
  else if (/oaks/i.test(row.team)) score += 3;

  // Prior filing hook (continuity of desk memory)
  if (priorHits) score += 8 + Math.min(priorHits, 3) * 2;

  // Soft-penalize pure insult without human line
  if (cls.primary === 'noise-at-edge' && !cls.hasStats) score -= 6;

  // Literary keywords
  if (/era|legacy|remember|history|aging|kids are|all.?time|farewell|parade|quiet/.test(
    (row.storyAngle + ' ' + row.notes).toLowerCase()
  )) score += 5;

  return { score, cls };
}

function pickBagModes(cls, row, priorHits) {
  const modes = new Set();
  const p = cls.primary;

  if (p === 'era-door') {
    modes.add(1); // Era Comparison
    modes.add(8); // Legacy Guarantee
    if (/aging|farewell|resign/.test((row.storyAngle || '').toLowerCase())) modes.add(3);
  } else if (p === 'threshold') {
    modes.add(5);
    modes.add(1);
  } else if (p === 'metrics-poetry') {
    modes.add(7);
    modes.add(4);
  } else if (p === 'break-continuity') {
    modes.add(1);
    modes.add(8);
  } else if (p === 'quiet-road') {
    modes.add(2);
    modes.add(10);
  } else if (p === 'season-tide') {
    modes.add(9);
    if (cls.hasStats) modes.add(7);
  } else if (p === 'city-remembers') {
    modes.add(6);
    modes.add(2);
  } else if (p === 'franchise-chapter') {
    modes.add(1);
    modes.add(6);
  } else if (p === 'present-line') {
    modes.add(7);
    modes.add(10);
  } else {
    modes.add(10);
    modes.add(1);
  }

  if (priorHits) modes.add(1); // era comparison with own prior filing

  return [...modes].slice(0, 2).sort((a, b) => a - b);
}

function pickClosing(cls, row) {
  const p = cls.primary;
  if (p === 'era-door' || p === 'break-continuity') {
    if (/resign|farewell|aging/.test((row.storyAngle || '').toLowerCase())) return 'elegy';
    return 'break of continuity';
  }
  if (p === 'threshold') return 'threshold crossed';
  if (p === 'metrics-poetry' || p === 'season-tide') return 'quiet pride';
  if (p === 'quiet-road') return 'unease';
  if (p === 'city-remembers' || p === 'franchise-chapter') return 'the city remembers';
  if (p === 'noise-at-edge') return 'unease';
  return 'continuity';
}

function pickHistoricalAnchor(cls, row) {
  const p = cls.primary;
  if (p === 'era-door') return 'era door — living chapter vs the age it closes or extends';
  if (p === 'threshold') return 'threshold — arrival of youth as history happening';
  if (p === 'metrics-poetry') return 'one feed number as poetry of time (not a grade)';
  if (p === 'break-continuity') return 'trade / roster break — what the river lost';
  if (p === 'quiet-road') return 'quiet road after parade (or after injury silence)';
  if (p === 'season-tide') return 'season tide — this stretch of the calendar as sailor knows water';
  if (p === 'city-remembers') return 'what the city remembers — civic/athlete act on record only';
  if (p === 'franchise-chapter') return 'franchise chapter — stadium / expansion / naming as place-memory';
  return 'desk at dawn — one present fact, one echo';
}

function buildHistorianClaim(row, cls, foil, closing) {
  const angle = row.storyAngle || row.rawHeader || 'the feed beat';
  const present = foil
    ? 'Present fact: ' + foil + ' on the feed.'
    : (row.storyAngle
      ? 'Present fact: ' + String(row.storyAngle).slice(0, 140)
      : 'Present fact: the feed names this chapter.');
  return present + ' Archive claim: place this against time — ' + angle +
    ' Close toward ' + closing + '.';
}

function loadHalPriorColumns(root) {
  const dirs = [
    path.join(root, 'output', 'reporters', 'hal-richmond', 'articles'),
    path.join(root, 'output', 'reporters', 'hal_richmond', 'articles'),
    path.join(root, 'output', 'desks', 'sports', 'articles')
  ];
  const seen = new Set();
  const cols = [];
  for (const dir of dirs) {
    let files;
    try { files = fs.readdirSync(dir); } catch (_) { continue; }
    for (const f of files) {
      if (!/\.md$/i.test(f)) continue;
      if (dir.includes('desks') && !/hal/i.test(f)) continue;
      const full = path.join(dir, f);
      if (seen.has(full)) continue;
      seen.add(full);
      let text;
      try { text = fs.readFileSync(full, 'utf8'); } catch (_) { continue; }
      const headline = (text.match(/^#\s+(.+)$/m) || text.match(/^HEADLINE:\s*(.+)$/mi) || [, ''])[1].trim();
      const cycleM = f.match(/c(\d+)/i) || text.match(/[Cc]ycle\s*(\d+)/);
      const snippet = text.replace(/^#.*$/m, '').replace(/\*\*[^*]+\*\*/g, '')
        .replace(/\s+/g, ' ').trim().slice(0, 280);
      cols.push({
        file: path.relative(root, full),
        cycle: cycleM ? Number(cycleM[1]) : null,
        headline: headline || path.basename(f, '.md'),
        snippet,
        names: sports.extractPlayerNames(headline + ' ' + snippet.slice(0, 400))
      });
    }
  }
  cols.sort((a, b) => (b.cycle || 0) - (a.cycle || 0));
  return cols;
}

function matchPriorFilings(row, priorCols, limit) {
  const names = sports.extractPlayerNames(
    [row.namesUsed, row.storyAngle, row.notes].join(' ')
  ).map(n => n.toLowerCase());
  const keywords = (row.storyAngle + ' ' + row.notes).toLowerCase();
  const hits = [];
  for (const col of priorCols) {
    let why = null;
    for (const pn of col.names || []) {
      const pl = pn.toLowerCase();
      if (names.some(n => n.includes(pl) || pl.includes(n) || n.split(' ').pop() === pl.split(' ').pop())) {
        why = 'named overlap: ' + pn;
        break;
      }
    }
    if (!why && /kelley|horn|keane|taveras|davis|era|farewell|legacy|parade/i.test(col.headline + ' ' + col.snippet)) {
      const token = (col.headline + ' ' + col.snippet).match(/Kelley|Horn|Keane|Taveras|Davis|farewell|legacy|parade/i);
      if (token && keywords.includes(token[0].toLowerCase())) why = 'theme: ' + token[0];
    }
    if (why) {
      hits.push({
        file: col.file,
        cycle: col.cycle,
        headline: col.headline,
        snippet: (col.snippet || '').slice(0, 200),
        why
      });
    }
    if (hits.length >= (limit || 4)) break;
  }
  return hits;
}

function buildPresentFacts(row, cycle) {
  const facts = [];
  if (row.storyAngle) facts.push('StoryAngle (feed): ' + row.storyAngle);
  if (sports.hasUsableStats(row)) facts.push('Stats (feed): ' + String(row.stats).slice(0, 180));
  if (row.record && /\d/.test(row.record)) {
    facts.push('Record/Streak (feed): ' + row.record + (row.streak ? ' · ' + row.streak : ''));
  }
  if (row.eventKind) {
    facts.push('Event (feed): ' + row.team + ' — ' + row.eventKind +
      (row.seasonType ? ' (' + row.seasonType + ')' : ''));
  }
  if (row.namesUsed) facts.push('NamesUsed: ' + row.namesUsed.slice(0, 120));
  facts.push('Cycle: C' + (row.cycle != null ? row.cycle : cycle));
  // Ensure min 2
  while (facts.length < 2) facts.push('Feed present: ' + (row.rawHeader || 'sports row'));
  return facts.slice(0, 6);
}

function buildPublishablePresentFacts(row, players, cycle) {
  const resolved = new Map((players || []).filter(player => player.popid)
    .map(player => [player.name.toLowerCase(), player.name]));
  const facts = [];
  for (const part of sports.parseStatsLine(row.stats || '')) {
    const canonical = resolved.get(String(part.name || '').toLowerCase());
    if (canonical && part.line) facts.push(canonical + ' line (feed): ' + part.line);
  }
  if (row.record && /\d/.test(row.record)) {
    facts.push('Team record (feed): ' + row.record + (row.streak ? ' · streak ' + row.streak : ''));
  }
  if (row.eventKind) {
    facts.push('Event (feed): ' + row.team + ' — ' + row.eventKind +
      (row.seasonType ? ' (' + row.seasonType + ')' : ''));
  }
  facts.push('Cycle: C' + (row.cycle != null ? row.cycle : cycle));
  return facts.slice(0, 6);
}

function buildHalSlice(cycle, opts) {
  const o = opts || {};
  const root = o.root || ROOT;
  const cyc = Number(cycle);
  const rows = sports.loadSportsRows(cyc, {
    root,
    summaryMd: o.summaryMd,
    signal: o.signal
  });
  const ledger = o.ledger || sports.loadLedgerNameIndex(root);
  const priorCols = o.priorColumns || loadHalPriorColumns(root);

  if (!rows.length) {
    return {
      empty: true,
      cycle: cyc,
      kind: 'hal-archive',
      reason: 'no-sports-feed-rows',
      journalist: { name: 'Hal Richmond', popid: 'POP-00007', persona: 'hal-richmond' },
      desk: 'sports' // never business
    };
  }

  const scored = rows.map(row => {
    const priors = matchPriorFilings(row, priorCols, 4);
    const { score, cls } = scoreArchiveRow(row, cyc, priors.length);
    return { row, score, cls, priors };
  });
  scored.sort((a, b) => b.score - a.score);

  let top = scored[0];
  for (const cand of scored) {
    if (cand.score < top.score - 12) break;
    if (cand.row.cycle === cyc &&
        (cand.cls.hasStats ||
         ['era-door', 'threshold', 'metrics-poetry'].includes(cand.cls.primary))) {
      top = cand;
      break;
    }
  }

  const { row, score, cls, priors } = top;
  const bagModes = pickBagModes(cls, row, priors.length);
  const closing = pickClosing(cls, row);
  const historicalAnchor = pickHistoricalAnchor(cls, row);
  const foil = sports.extractFoilNumber(row.stats, row.notes);
  const players = sports.resolveFeedPlayers(row, ledger, 10);
  const presentFacts = buildPublishablePresentFacts(row, players, cyc);
  const claim = buildHistorianClaim(row, cls, foil, closing);

  const safeLabel = (row.team || 'Sports') + ' — ' + (row.eventKind || 'feed') +
    ' — supplied C' + cyc + ' line card';
  const story = {
    angle: 'What the supplied C' + cyc + ' line card establishes, and what history remains unsupplied.',
    label: safeLabel,
    hookLine: safeLabel,
    hood: row.neighborhood || null,
    pulseClass: cls.primary,
    team: row.team,
    eventKind: row.eventKind,
    closingNote: closing,
    citizens: players.filter(p => p.popid).map(p => p.name + ' (' + p.popid + ')'),
    popids: players.filter(p => p.popid).map(p => p.popid),
    ref: 'world_summary_c' + cyc + '.md ## Sports',
    cycle: row.cycle != null ? row.cycle : cyc
  };

  const prewrite = {
    reporter: 'Hal Richmond',
    bagModes: bagModes.map(id => ({ id, name: BAG_MODES[id] })),
    historicalAnchor,
    presentFacts,
    dossierFacts: ['NONE — offline slice; use packet TrueSource only if wake supplies'],
    closingNote: closing,
    priorFiling: priors.length
      ? priors[0].headline + ' (' + priors[0].file + ')'
      : 'NONE — wall may still inject at wake',
    claim,
    foilNumber: foil,
    missing: [
      'Historical people, places, teams, events, seasons, and statistics are unsupplied unless named in the packet',
      'No invented seasons or franchise history beyond packet + feed',
      'No x-stats / barrel% / invented OPS+',
      'Not a business-desk storefront assignment',
      'Not P Slayer charge; not Anthony board architecture as spine'
    ]
  };

  return {
    empty: false,
    cycle: cyc,
    kind: 'hal-archive',
    desk: 'sports', // hard lock — never business
    journalist: {
      name: 'Hal Richmond',
      popid: 'POP-00007',
      persona: 'hal-richmond',
      bagDoc: 'docs/media/HAL_ARCHIVE_BAG.md'
    },
    pulse: {
      className: cls.primary,
      score,
      label: story.label,
      team: row.team,
      eventKind: row.eventKind,
      seasonType: row.seasonType || null,
      storyAngle: row.storyAngle,
      hasStats: cls.hasStats,
      record: row.record || null,
      streak: row.streak || null,
      foilNumber: foil,
      closingNote: closing,
      feedCycle: row.cycle
    },
    bag: {
      modes: prewrite.bagModes,
      historicalAnchor,
      closingNote: closing,
      claim
    },
    friction: {
      a: 'Present feed fact: ' + (row.storyAngle || row.rawHeader),
      b: 'Wire copy / FO strategy / bleacher heat that skips time',
      frame: 'Present first, then echo — end on ' + closing + '.'
    },
    prewrite,
    priorTakes: priors,
    story,
    approach: HAL_APPROACH,
    players,
    scene: {
      neighborhood: row.neighborhood || null,
      record: row.record || null,
      streak: row.streak || null,
      colorRoom:
        'An unnamed desk or quiet archive transition; literary texture may carry no witnessed event. ' +
        'People, places, teams, seasons, events, and statistics only from the packet. Not a business storefront beat.'
    },
    candidates: scored.slice(0, 10).map(s => ({
      score: s.score,
      cycle: s.row.cycle,
      team: s.row.team,
      primary: s.cls.primary,
      hasStats: s.cls.hasStats,
      angle: String(s.row.storyAngle || s.row.rawHeader || '').slice(0, 100),
      priorHits: (s.priors || []).length
    })),
    pointers: [
      'output/world_summary_c' + cyc + '.md ## Sports',
      'docs/media/HAL_ARCHIVE_BAG.md',
      'scripts/sportsSubstrate.js',
      'docs/plans/2026-08-08-journalist-heat-slice-packs.md Task 5'
    ]
  };
}

function formatHalSliceMarkdown(slice) {
  if (!slice || slice.empty) {
    return '# SLICE — archive (Hal Richmond) EMPTY\n\n_No sports feed rows for this cycle._\n';
  }
  const L = [];
  L.push('# SLICE — archive (Hal Richmond)');
  L.push('');
  L.push('Cycle **C' + slice.cycle + '** · kind `' + slice.kind + '` · POP-00007 · desk **sports** (never business)');
  L.push('');
  L.push('## TOP PULSE');
  L.push('- **Class:** ' + slice.pulse.className);
  L.push('- **Score:** ' + slice.pulse.score);
  L.push('- **Team / event:** ' + slice.pulse.team + ' — ' + slice.pulse.eventKind);
  L.push('- **Label:** ' + slice.pulse.label);
  if (slice.pulse.foilNumber) L.push('- **Receipt (feed only):** ' + slice.pulse.foilNumber);
  L.push('- **Closing note:** ' + slice.pulse.closingNote);
  L.push('');
  L.push('## PREWRITE (archive bag)');
  L.push('- **BagModes:** ' + slice.prewrite.bagModes.map(t => t.id + ' ' + t.name).join('; '));
  L.push('- **HistoricalAnchor:** ' + slice.prewrite.historicalAnchor);
  L.push('- **ClosingNote:** ' + slice.prewrite.closingNote);
  L.push('- **PriorFiling:** ' + slice.prewrite.priorFiling);
  L.push('- **Claim:** ' + slice.prewrite.claim);
  L.push('**PresentFacts** (min 2, feed only):');
  for (const f of slice.prewrite.presentFacts || []) L.push('  - ' + f);
  L.push('**DossierFacts:**');
  for (const f of slice.prewrite.dossierFacts || []) L.push('  - ' + f);
  L.push('**Missing** (do not invent):');
  for (const f of slice.prewrite.missing || []) L.push('  - ' + f);
  L.push('');
  L.push('## APPROACH');
  L.push(slice.approach);
  L.push('');
  L.push('## FRAME');
  if (slice.friction) {
    L.push('A: ' + slice.friction.a);
    L.push('B: ' + slice.friction.b);
    L.push('→ ' + slice.friction.frame);
  }
  L.push('');
  L.push('## PRIOR FILINGS (disk — hook for continuity)');
  if (slice.priorTakes && slice.priorTakes.length) {
    for (const p of slice.priorTakes) {
      L.push('- C' + (p.cycle != null ? p.cycle : '?') + ' **' + p.headline + '**');
      L.push('  ' + p.file + ' · ' + p.why);
    }
  } else {
    L.push('_No on-disk prior matched — wall may still inject at wake._');
  }
  L.push('');
  L.push('## PLAYERS (feed names — do not invent)');
  for (const p of slice.players || []) {
    L.push('- ' + p.name +
      (p.popid ? ' (' + p.popid + ')' : ' (no POPID on snapshot)') +
      (p.role ? ' — ' + p.role : ''));
  }
  if (!(slice.players || []).length) L.push('_No parseable names — use NamesUsed only._');
  L.push('');
  L.push('## SCENE');
  if (slice.scene.neighborhood) L.push('HOOD: ' + slice.scene.neighborhood);
  if (slice.scene.record) L.push('RECORD/STREAK: ' + slice.scene.record + ' / ' + (slice.scene.streak || '—'));
  L.push(slice.scene.colorRoom);
  L.push('');
  L.push('## OTHER CANDIDATES');
  for (const c of slice.candidates || []) {
    L.push('- [' + c.score + '] C' + c.cycle + ' ' + c.team + ' · ' + c.primary +
      (c.hasStats ? ' · stats' : '') +
      (c.priorHits ? ' · priors=' + c.priorHits : '') +
      ' — ' + c.angle);
  }
  L.push('');
  L.push('## POINTERS');
  for (const p of slice.pointers || []) L.push('- ' + p);
  L.push('');
  L.push('_Generated by scripts/buildHalSlice.js — no LLM. Shared sports substrate + archive bag. Not fan heat. Not business desk._');
  return L.join('\n') + '\n';
}

function slicePaths(cycle, root) {
  const r = root || ROOT;
  return {
    md: path.join(r, 'output', 'slices', 'c' + cycle, 'hal.md'),
    json: path.join(r, 'output', 'cron-compare', 'hal_slice_c' + cycle + '.json')
  };
}

function writeHalSlice(cycle, slice, root) {
  const paths = slicePaths(cycle, root);
  fs.mkdirSync(path.dirname(paths.md), { recursive: true });
  fs.mkdirSync(path.dirname(paths.json), { recursive: true });
  fs.writeFileSync(paths.json, JSON.stringify(slice, null, 2));
  fs.writeFileSync(paths.md, formatHalSliceMarkdown(slice));
  return paths;
}

function loadHalSlice(cycle, root) {
  const paths = slicePaths(cycle, root);
  const j = sports.loadJson(paths.json);
  if (j && !j.empty) return j;
  const slice = buildHalSlice(cycle, { root: root || ROOT });
  if (!slice.empty) writeHalSlice(cycle, slice, root);
  return slice.empty ? null : slice;
}

function assignmentFromSlice(slice) {
  if (!slice || slice.empty) return null;
  return {
    desk: 'sports', // never business
    name: 'Hal Richmond',
    popid: 'POP-00007',
    beatDomain: 'SPORTS',
    persona: 'hal-richmond',
    approach: slice.approach,
    story: slice.story,
    halSlice: true,
    historian: true,
    pulse: slice.pulse,
    bag: slice.bag,
    prewrite: slice.prewrite
  };
}

function enrichAssignment(assign, cycle, root) {
  if (!assign) return assign;
  const isH =
    assign.persona === 'hal-richmond' ||
    assign.popid === 'POP-00007' ||
    /hal\s*richmond/i.test(assign.name || '');
  if (!isH) return assign;
  try {
    const slice = loadHalSlice(cycle, root);
    if (!slice || slice.empty) return assign;
    const from = assignmentFromSlice(slice);
    return Object.assign({}, assign, {
      desk: 'sports', // force sports if mis-tagged
      beatDomain: 'SPORTS',
      approach: from.approach,
      story: from.story,
      halSlice: true,
      historian: true,
      pulse: from.pulse,
      bag: from.bag,
      prewrite: from.prewrite
    });
  } catch (_) {
    return assign;
  }
}

if (require.main === module) {
  const cycle = arg('--cycle', null) || (() => {
    try {
      return require(path.join(ROOT, 'lib', 'getCurrentCycle'))({ soft: true, noArgv: true });
    } catch (_) { return null; }
  })();
  if (cycle == null) {
    console.error('buildHalSlice: pass --cycle N');
    process.exit(1);
  }
  const slice = buildHalSlice(cycle);
  const paths = writeHalSlice(cycle, slice);
  if (process.argv.includes('--json')) {
    console.log(JSON.stringify(slice, null, 2));
  } else {
    console.log('hal slice c' + cycle +
      (slice.empty ? ' EMPTY' :
        ' pulse=' + slice.pulse.className +
        ' score=' + slice.pulse.score +
        ' close=' + slice.pulse.closingNote +
        ' modes=' + slice.bag.modes.map(m => m.id).join(',') +
        ' priors=' + (slice.priorTakes || []).length +
        ' players=' + (slice.players || []).length));
    if (!slice.empty) {
      console.log('  ' + String(slice.pulse.storyAngle || slice.pulse.label).slice(0, 120));
      console.log('  close: ' + slice.pulse.closingNote);
    }
    console.log('→ ' + path.relative(ROOT, paths.md));
    console.log('→ ' + path.relative(ROOT, paths.json));
  }
}

module.exports = {
  buildHalSlice,
  writeHalSlice,
  loadHalSlice,
  formatHalSliceMarkdown,
  assignmentFromSlice,
  enrichAssignment,
  slicePaths,
  classifyArchive,
  scoreArchiveRow,
  pickBagModes,
  pickClosing,
  HAL_APPROACH,
  BAG_MODES,
  CLOSING_PALETTE,
  buildPublishablePresentFacts
};

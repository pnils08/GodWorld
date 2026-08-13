#!/usr/bin/env node
/**
 * buildAnthonySlice.js — Grok-owned analytic sports heat slice (pipeline.52 Task 4)
 *
 * Shared sports substrate (sportsSubstrate.js) + Anthony analysis-bag overlay.
 * NOT fan heat (P Slayer). NOT historian elegy (Hal). Third-person board read.
 *
 * Sources (disk-first):
 *   output/world_summary_c{N}.md  ## Sports
 *   output/desk_signal_c{N}.json  lanes.sports (fallback)
 *   output/simulation_ledger_snapshot.jsonl  name → POPID (optional)
 *   Feed Stats lines only for numbers — no invented x-stats / As_Roster sheet required offline
 *
 * Artifacts:
 *   output/slices/c{N}/anthony.md
 *   output/cron-compare/anthony_slice_c{N}.json
 *
 * Usage:
 *   node scripts/buildAnthonySlice.js --cycle 102
 *   node scripts/buildAnthonySlice.js --cycle 102 --json
 */

'use strict';

const fs = require('fs');
const path = require('path');
const sports = require('./sportsSubstrate');

const ROOT = path.join(__dirname, '..');

const ANTHONY_APPROACH =
  'Analytic approach (Anthony Raines): third-person only — never fan "we." ' +
  'One evaluative claim built on verifiable feed line numbers (Stats / record / StoryAngle). ' +
  'Open from the board (roster fact, contract on the feed, season line) — not the bleachers. ' +
  'Pick 1–2 tools from the analysis bag in this slice. Spell weighty numbers in prose. ' +
  'FORBIDDEN: inventing x-stats, barrel%, launch angle, contracts, or salaries not on the feed; ' +
  'P Slayer charge; Hal elegy as spine; multi-voice sports-desk average.';

/** Analysis bag tool ids → names (docs/media/ANTHONY_ANALYSIS_BAG.md) */
const BAG_TOOLS = {
  1: 'Box-Card Read',
  2: 'Role-Fit Architecture',
  3: 'Salary–Value Tension',
  4: 'TrueSource Arc',
  5: 'Repertoire vs Results',
  6: 'Feed Delta',
  7: 'Is-It-Real (ledger PANDAS)',
  8: 'Breakout / Fade Diagnostic',
  9: 'Board Scan',
  10: 'Paper Cuts vs Percentiles'
};

function arg(flag, def) {
  const i = process.argv.indexOf(flag);
  if (i !== -1 && process.argv[i + 1]) return process.argv[i + 1];
  const eq = process.argv.find(a => a.startsWith(flag + '='));
  return eq ? eq.slice(flag.length + 1) : def;
}

/**
 * Classify feed row for analytic board heat (not fan charge).
 */
function classifyAnalytic(row) {
  const angle = String(row.storyAngle || '').toLowerCase();
  const event = String(row.eventKind || '').toLowerCase();
  const notes = String(row.notes || '').toLowerCase();
  const blob = [event, angle, notes, row.team, row.seasonType].join(' ');
  const hasStats = sports.hasUsableStats(row);

  const classes = [];

  if (/re-?sign|contract|signing|extension/.test(angle + ' ' + event) ||
      (/trade|traded|deadline/.test(angle + ' ' + event) && !/kids are|call.?up|prospect/.test(angle))) {
    classes.push('roster-architecture');
  } else if (/trade|traded|deadline/.test(blob) && /pillar|unthinkable|shaken|farewell|genius/.test(blob)) {
    classes.push('roster-architecture');
  }

  if (/award|mvp|cy young|batting title|all.?star|6th man|player of the year/.test(blob)) {
    classes.push('award-board');
  }

  if (/call[- ]?up|called up|debut|prospect|kids are alright|kids are/.test(angle + ' ' + event) ||
      (/call[- ]?up|prospect/.test(blob) && /player-feature/.test(event))) {
    classes.push('prospect-fit');
  }

  if (hasStats && (/player-feature|season-state|game-result/.test(event) ||
      /\d+\s*(?:ab|ip|hr|era|avg|war)/i.test(row.stats))) {
    classes.push('line-card');
  }

  if (/front-office|gm |owner|stadium|arena|naming rights|roster construction/.test(angle + ' ' + event + ' ' + notes) ||
      (/front-office/.test(event) && !/garbage|dont respect|don't respect/.test(blob))) {
    classes.push('board-memo');
  }

  if (/\bW\d+\b/.test(row.streak) || /win streak|straight wins|dominate|sweep/.test(angle + ' ' + blob)) {
    classes.push('feed-delta');
  }

  if (/injur|out for|disabled list|return from injury|returning from/.test(blob)) {
    classes.push('load-health');
  }

  // Insult / podcast heat is FO-process only for Anthony if no numbers — still low priority
  if (/garbage|podcast|call.?out|dont respect|don't respect/.test(blob)) {
    classes.push('process-noise');
  }

  if (/fan-civic|charity|gala|celebration|autograph/.test(event + ' ' + angle)) {
    classes.push('soft-context');
  }

  if (!classes.length) classes.push(hasStats ? 'line-card' : 'quiet-board');

  const priority = [
    'roster-architecture', 'award-board', 'line-card', 'prospect-fit',
    'board-memo', 'feed-delta', 'load-health', 'process-noise', 'soft-context', 'quiet-board'
  ];
  if (/kids are alright|kids are|call.?ups? for the/.test(angle) && classes.includes('prospect-fit')) {
    return { primary: 'prospect-fit', all: classes, hasStats };
  }
  if (/resign|re-sign|resigns|signing|trade/.test(angle) && classes.includes('roster-architecture')) {
    return { primary: 'roster-architecture', all: classes, hasStats };
  }
  // Prefer line-card when stats are rich and class is ambient
  if (hasStats && classes.includes('line-card') &&
      !['roster-architecture', 'award-board'].some(c => classes.includes(c))) {
    // MVP / pace claims → award-board elevates
    if (/mvp|all.?time|pace|leading the al/.test(angle)) {
      if (!classes.includes('award-board')) classes.push('award-board');
      return { primary: 'award-board', all: classes, hasStats };
    }
    return { primary: 'line-card', all: classes, hasStats };
  }
  const primary = priority.find(c => classes.includes(c)) || classes[0];
  return { primary, all: classes, hasStats };
}

function scoreAnalyticRow(row, cycle) {
  const cls = classifyAnalytic(row);
  let score = 0;
  const weights = {
    'roster-architecture': 30,
    'award-board': 26,
    'line-card': 22,
    'prospect-fit': 20,
    'board-memo': 16,
    'feed-delta': 14,
    'load-health': 12,
    'process-noise': 6,
    'soft-context': 3,
    'quiet-board': 2
  };
  score += weights[cls.primary] || 5;
  for (const c of cls.all) {
    if (c !== cls.primary) score += Math.floor((weights[c] || 0) / 5);
  }

  if (row.cycle === Number(cycle)) score += 18;
  else if (row.cycle === Number(cycle) - 1) score += 7;
  else if (row.cycle === Number(cycle) - 2) score += 2;
  else score -= 4;

  // Real line stats are Anthony's oxygen
  if (cls.hasStats) score += 14;
  else score -= 4;

  // A's spine slightly above Oaks for default board (both valid)
  if (/a'?s/i.test(row.team)) score += 4;
  else if (/oaks/i.test(row.team)) score += 2;

  // Contract / dollar tokens on feed only
  if (/\$\d|year\s*\$|\d+-year/i.test([row.notes, row.storyAngle, row.stats].join(' '))) score += 8;

  // Multi-player stats line → board scan fuel
  const statParts = sports.parseStatsLine(row.stats);
  if (statParts.length >= 2) score += 5;

  // Soft civic noise demote for analytic seat
  if (cls.primary === 'soft-context') score -= 6;
  if (cls.primary === 'process-noise' && !cls.hasStats) score -= 4;

  // Dense angle keywords that are board-relevant
  if (/right move|architecture|fit|worth|redundan|hole|production|WAR|ERA/i.test(
    row.storyAngle + ' ' + row.notes
  )) score += 4;

  return { score, cls };
}

function pickBagTools(cls, row) {
  const tools = new Set();
  const p = cls.primary;
  const hasStats = cls.hasStats;

  if (p === 'roster-architecture') {
    tools.add(2); // Role-Fit
    if (hasStats) tools.add(1);
    else tools.add(9); // Board Scan
    if (/\$\d|\d+-year/i.test(row.notes + row.storyAngle)) tools.add(3);
  } else if (p === 'award-board') {
    tools.add(1);
    tools.add(7); // Is-It-Real
    if (hasStats) tools.add(10);
  } else if (p === 'line-card') {
    tools.add(1);
    if (/\d+\s*ip|\d+\.\d{2}\s*era/i.test(row.stats || '')) tools.add(5);
    else tools.add(7);
  } else if (p === 'prospect-fit') {
    tools.add(2);
    tools.add(8);
    if (hasStats) tools.add(1);
  } else if (p === 'board-memo') {
    tools.add(9);
    tools.add(2);
  } else if (p === 'feed-delta') {
    tools.add(6);
    if (hasStats) tools.add(1);
  } else if (p === 'load-health') {
    tools.add(1);
    tools.add(6);
  } else if (p === 'process-noise') {
    tools.add(9);
    tools.add(6);
  } else {
    tools.add(6);
    if (hasStats) tools.add(1);
  }

  return [...tools].slice(0, 2).sort((a, b) => a - b);
}

function buildClaim(row, cls, foil) {
  const angle = row.storyAngle || row.rawHeader || 'the feed beat';
  const team = row.team || 'the club';
  if (cls.primary === 'roster-architecture') {
    return 'The ' + team + ' move on the feed is a board-architecture question first: ' +
      'does the fit close a hole or stack redundancy — ' + angle;
  }
  if (cls.primary === 'award-board' || (cls.hasStats && /mvp|pace|leading/i.test(row.storyAngle || ''))) {
    return (foil
      ? 'The season line (' + foil + ') has to carry the claim before the narrative does: '
      : 'The season line has to carry the claim before the narrative does: ') + angle;
  }
  if (cls.primary === 'line-card' && foil) {
    return 'One line anchors the board read — ' + foil + ' — and the evaluative question is whether that production is architecture or variance: ' + angle;
  }
  if (cls.primary === 'prospect-fit') {
    return 'Call-up / youth production is a role-fit problem, not a eulogy: ' + angle;
  }
  if (cls.primary === 'board-memo') {
    return 'Front-office texture on the feed is only as strong as the roster facts under it: ' + angle;
  }
  if (cls.primary === 'feed-delta') {
    return 'What the feed says happened this cycle has to sit against the season line, not replace it: ' + angle;
  }
  return 'One board claim from the feed only — no invented receipts: ' + angle;
}

function buildMissingList(row, cls, players) {
  const missing = [
    'x-stats / barrel% / launch angle / OAA not on feed',
    'contracts or salaries not printed on this feed row',
    'As_Roster sheet cells (offline pack uses feed Stats only — do not invent WAR/ERA beyond feed)'
  ];
  if (!cls.hasStats) missing.push('no usable Stats line on this pulse — do not invent box numbers');
  if (!/TrueSource|dossier/i.test(row.notes || '')) {
    missing.push('TrueSource dossier lines not loaded offline — DossierFacts: NONE unless packet supplies');
  }
  for (const player of players || []) {
    if (!player.popid) {
      missing.push(player.name + ' has no Simulation_Ledger POPID in the local snapshot — do not invent or interview');
    }
  }
  return missing;
}

function alignStatSubject(name, players) {
  if (!name) return null;
  const raw = String(name).replace(/\s+/g, ' ').trim();
  const rawParts = raw.toLowerCase().split(' ');
  const matches = (players || []).filter(player => {
    const parts = String(player.name || '').toLowerCase().split(' ');
    if (parts.length !== rawParts.length || parts[0] !== rawParts[0]) return false;
    const rawLast = rawParts[rawParts.length - 1];
    const last = parts[parts.length - 1];
    return rawLast === last || rawLast.startsWith(last) || last.startsWith(rawLast);
  });
  return matches.length === 1 ? matches[0].name : raw;
}

function buildLineFacts(row, players) {
  const facts = [];
  const parts = sports.parseStatsLine(row.stats);
  for (const p of parts) {
    const subject = alignStatSubject(p.name, players);
    facts.push(subject ? (subject + ' line (feed): ' + p.line) : ('Feed line: ' + p.line));
  }
  if (row.record && /\d/.test(row.record)) {
    facts.push('Team record (feed): ' + row.record + (row.streak ? ' · ' + row.streak : ''));
  }
  if (row.eventKind) {
    facts.push('Event kind (feed): ' + row.team + ' — ' + row.eventKind +
      (row.seasonType ? ' (' + row.seasonType + ')' : ''));
  }
  if (row.namesUsed) facts.push('NamesUsed (feed): ' + row.namesUsed.slice(0, 120));
  // Contract tokens from notes only when present
  const money = String(row.notes || '').match(/(\d+-year[^.]{0,40}|\$\d+M[^.]{0,20})/i);
  if (money) facts.push('Money/term on feed notes: ' + money[1].trim());
  // Ensure min 3 when possible from anchors
  const anchors = sports.buildFeedAnchorFacts(row, row.cycle);
  for (const a of anchors) {
    if (facts.length >= 6) break;
    if (!facts.includes(a)) facts.push(a);
  }
  return facts.slice(0, 6);
}

function buildAnthonySlice(cycle, opts) {
  const o = opts || {};
  const root = o.root || ROOT;
  const cyc = Number(cycle);
  const rows = sports.loadSportsRows(cyc, {
    root,
    summaryMd: o.summaryMd,
    signal: o.signal
  });
  const ledger = o.ledger || sports.loadLedgerNameIndex(root);

  if (!rows.length) {
    return {
      empty: true,
      cycle: cyc,
      kind: 'anthony-analytic',
      reason: 'no-sports-feed-rows',
      journalist: { name: 'Anthony Raines', popid: 'POP-00017', persona: 'anthony-raines' }
    };
  }

  const scored = rows.map(row => {
    const { score, cls } = scoreAnalyticRow(row, cyc);
    return { row, score, cls };
  });
  scored.sort((a, b) => b.score - a.score);

  // Prefer current-cycle row with stats when near top score
  let top = scored[0];
  for (const cand of scored) {
    if (cand.score < top.score - 12) break;
    if (cand.row.cycle === cyc && (cand.cls.hasStats || cand.cls.primary === 'roster-architecture')) {
      top = cand;
      break;
    }
  }

  const { row, score, cls } = top;
  const bagTools = pickBagTools(cls, row);
  const foil = sports.extractFoilNumber(row.stats, row.notes);
  const players = sports.resolveFeedPlayers(row, ledger, 10);
  const lineFacts = buildLineFacts(row, players);
  const claim = buildClaim(row, cls, foil);
  const missing = buildMissingList(row, cls, players);

  const story = {
    kind: 'sports-analytics',
    angle: claim,
    label: (row.team || '') + ' · ' + (row.eventKind || 'feed') + ' — ' +
      String(row.storyAngle || row.rawHeader || '').slice(0, 120),
    hookLine: row.storyAngle || claim,
    hood: row.neighborhood || null,
    pulseClass: cls.primary,
    team: row.team,
    eventKind: row.eventKind,
    citizens: players.filter(p => p.popid).map(p => p.name + ' (' + p.popid + ')'),
    popids: players.filter(p => p.popid).map(p => p.popid),
    ref: 'world_summary_c' + cyc + '.md ## Sports',
    cycle: row.cycle != null ? row.cycle : cyc
  };

  const prewrite = {
    reporter: 'Anthony Raines',
    bagTools: bagTools.map(id => ({ id, name: BAG_TOOLS[id] })),
    lineFacts: lineFacts.slice(0, 6),
    dossierFacts: ['NONE — offline slice; use packet TrueSource only if wake supplies'],
    feedFacts: [
      row.storyAngle ? 'StoryAngle: ' + row.storyAngle : null,
      row.notes ? 'Notes: ' + String(row.notes).slice(0, 200) : null,
      row.record && /\d/.test(row.record) ? 'Record/Streak: ' + row.record + ' / ' + (row.streak || '—') : null
    ].filter(Boolean),
    claim,
    missing,
    foilNumber: foil,
    anchorFacts: lineFacts.slice(0, 4)
  };

  const candidates = scored.slice(0, 10).map(s => ({
    score: s.score,
    cycle: s.row.cycle,
    team: s.row.team,
    primary: s.cls.primary,
    hasStats: s.cls.hasStats,
    angle: String(s.row.storyAngle || s.row.rawHeader || '').slice(0, 100)
  }));

  return {
    empty: false,
    cycle: cyc,
    kind: 'anthony-analytic',
    journalist: {
      name: 'Anthony Raines',
      popid: 'POP-00017',
      persona: 'anthony-raines',
      bagDoc: 'docs/media/ANTHONY_ANALYSIS_BAG.md'
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
      feedCycle: row.cycle
    },
    charge: null, // deliberately not fan charge
    bag: {
      tools: prewrite.bagTools,
      claim,
      foilNumber: foil
    },
    friction: {
      a: 'Feed present fact: ' + (row.storyAngle || row.rawHeader),
      b: 'Soft FO language or bleacher heat that skips the line',
      frame: 'Evaluate fit and process with numbers — one claim, third person.'
    },
    prewrite,
    story,
    approach: ANTHONY_APPROACH,
    players,
    scene: {
      neighborhood: row.neighborhood || null,
      record: row.record || null,
      streak: row.streak || null,
      colorRoom:
        'Press-box / clubhouse quiet. Numbers from feed Stats only. No invented Savant cards. ' +
        'RoleType from ledger when present — never invent careers.'
    },
    candidates,
    pointers: [
      'output/world_summary_c' + cyc + '.md ## Sports',
      'docs/media/ANTHONY_ANALYSIS_BAG.md',
      'scripts/sportsSubstrate.js',
      'docs/plans/2026-08-08-journalist-heat-slice-packs.md Task 4'
    ]
  };
}

function formatAnthonySliceMarkdown(slice) {
  if (!slice || slice.empty) {
    return '# SLICE — analytic (Anthony Raines) EMPTY\n\n_No sports feed rows for this cycle._\n';
  }
  const L = [];
  L.push('# SLICE — analytic (Anthony Raines)');
  L.push('');
  L.push('Cycle **C' + slice.cycle + '** · kind `' + slice.kind + '` · POP-00017');
  L.push('');
  L.push('## TOP PULSE');
  L.push('- **Class:** ' + slice.pulse.className);
  L.push('- **Score:** ' + slice.pulse.score);
  L.push('- **Team / event:** ' + slice.pulse.team + ' — ' + slice.pulse.eventKind);
  L.push('- **Label:** ' + slice.pulse.label);
  if (slice.pulse.foilNumber) L.push('- **Foil (feed only):** ' + slice.pulse.foilNumber);
  if (slice.pulse.hasStats) L.push('- **Has Stats line:** yes');
  L.push('');
  L.push('## PREWRITE (analysis bag)');
  L.push('- **BagTools:** ' + slice.prewrite.bagTools.map(t => t.id + ' ' + t.name).join('; '));
  L.push('- **Claim:** ' + slice.prewrite.claim);
  L.push('**LineFacts** (feed only):');
  for (const f of slice.prewrite.lineFacts || []) L.push('  - ' + f);
  L.push('**DossierFacts:**');
  for (const f of slice.prewrite.dossierFacts || []) L.push('  - ' + f);
  L.push('**FeedFacts:**');
  for (const f of slice.prewrite.feedFacts || []) L.push('  - ' + f);
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
      (c.hasStats ? ' · stats' : '') + ' — ' + c.angle);
  }
  L.push('');
  L.push('## POINTERS');
  for (const p of slice.pointers || []) L.push('- ' + p);
  L.push('');
  L.push('_Generated by scripts/buildAnthonySlice.js — no LLM. Shared sports substrate + analysis bag. Not fan heat._');
  return L.join('\n') + '\n';
}

function slicePaths(cycle, root) {
  const r = root || ROOT;
  return {
    md: path.join(r, 'output', 'slices', 'c' + cycle, 'anthony.md'),
    json: path.join(r, 'output', 'cron-compare', 'anthony_slice_c' + cycle + '.json')
  };
}

function writeAnthonySlice(cycle, slice, root) {
  const paths = slicePaths(cycle, root);
  fs.mkdirSync(path.dirname(paths.md), { recursive: true });
  fs.mkdirSync(path.dirname(paths.json), { recursive: true });
  fs.writeFileSync(paths.json, JSON.stringify(slice, null, 2));
  fs.writeFileSync(paths.md, formatAnthonySliceMarkdown(slice));
  return paths;
}

function loadAnthonySlice(cycle, root) {
  const paths = slicePaths(cycle, root);
  const j = sports.loadJson(paths.json);
  if (j && !j.empty) return j;
  const slice = buildAnthonySlice(cycle, { root: root || ROOT });
  if (!slice.empty) writeAnthonySlice(cycle, slice, root);
  return slice.empty ? null : slice;
}

function assignmentFromSlice(slice) {
  if (!slice || slice.empty) return null;
  return {
    desk: 'sports',
    name: 'Anthony Raines',
    popid: 'POP-00017',
    beatDomain: 'SPORTS',
    persona: 'anthony-raines',
    approach: slice.approach,
    story: slice.story,
    anthonySlice: true,
    analytic: true,
    pulse: slice.pulse,
    bag: slice.bag,
    prewrite: slice.prewrite
  };
}

function enrichAssignment(assign, cycle, root) {
  if (!assign) return assign;
  const isA =
    assign.persona === 'anthony-raines' ||
    assign.popid === 'POP-00017' ||
    /anthony\s*raines/i.test(assign.name || '');
  if (!isA) return assign;
  try {
    const slice = loadAnthonySlice(cycle, root);
    if (!slice || slice.empty) return assign;
    const from = assignmentFromSlice(slice);
    return Object.assign({}, assign, {
      approach: from.approach,
      story: from.story,
      anthonySlice: true,
      analytic: true,
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
    console.error('buildAnthonySlice: pass --cycle N');
    process.exit(1);
  }
  const slice = buildAnthonySlice(cycle);
  const paths = writeAnthonySlice(cycle, slice);
  if (process.argv.includes('--json')) {
    console.log(JSON.stringify(slice, null, 2));
  } else {
    console.log('anthony slice c' + cycle +
      (slice.empty ? ' EMPTY' :
        ' pulse=' + slice.pulse.className +
        ' score=' + slice.pulse.score +
        ' foil=' + (slice.pulse.foilNumber || '—') +
        ' tools=' + slice.bag.tools.map(t => t.id).join(',') +
        ' players=' + (slice.players || []).length));
    if (!slice.empty) {
      console.log('  ' + String(slice.pulse.storyAngle || slice.pulse.label).slice(0, 120));
      console.log('  claim: ' + String(slice.bag.claim).slice(0, 140));
    }
    console.log('→ ' + path.relative(ROOT, paths.md));
    console.log('→ ' + path.relative(ROOT, paths.json));
  }
}

module.exports = {
  buildAnthonySlice,
  writeAnthonySlice,
  loadAnthonySlice,
  formatAnthonySliceMarkdown,
  assignmentFromSlice,
  enrichAssignment,
  slicePaths,
  classifyAnalytic,
  scoreAnalyticRow,
  pickBagTools,
  ANTHONY_APPROACH,
  BAG_TOOLS
};

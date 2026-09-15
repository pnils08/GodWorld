#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const sports = require('./sportsSubstrate');

const ROOT = path.join(__dirname, '..');

const SIMON_APPROACH =
  'Long-view approach (Simon Leary): third-person essayist. Treat supplied sports facts as present structure, not as proof of history or collective memory. ' +
  'A metaphor about continuity, load, or change may interpret the Packet but may not add a person, place, institution, event, season, statistic, cause, organizational intention, or citywide belief. ' +
  'Do not write a game recap, Hal elegy, P Slayer fan heat, or Anthony board memo.';

function score(row, cycle) {
  const blob = [row.eventKind, row.storyAngle, row.notes].join(' ').toLowerCase();
  let value = row.cycle === Number(cycle) ? 30 : 0;
  if (/bullpen|rotation|role|remainder of the season|move|transition/.test(blob)) value += 28;
  if (row.record && /\d/.test(row.record)) value += 14;
  if (/^w\d+$/i.test(row.streak || '')) value += 12;
  if (/no.?no|no hitter|499|debut|inaugural|claps back|podcast/.test(blob)) value -= 18;
  return value;
}

function publicFacts(row, players) {
  const resolved = (players || []).filter(player => player.popid);
  const facts = [];
  const dillon = resolved.find(player => /dillon$/i.test(player.name));
  const blob = [row.storyAngle, row.notes].join(' ');
  if (dillon && /mov(?:e|es|ed|ing).{0,40}bullpen/i.test(blob)) {
    facts.push(dillon.name + ' is moving to the bullpen for the remainder of the season.');
  }
  if (row.record && /\d/.test(row.record)) {
    facts.push('The ' + row.team + ' record is ' + row.record + '.');
  }
  const streak = String(row.streak || '').match(/^W(\d+)$/i);
  if (streak) facts.push('The ' + row.team + ' have won ' + streak[1] + ' straight.');
  return facts.slice(0, 6);
}

function buildSimonSlice(cycle, opts) {
  const o = opts || {};
  const root = o.root || ROOT;
  const rows = sports.loadSportsRows(Number(cycle), {
    root, summaryMd: o.summaryMd, signal: o.signal,
  });
  if (!rows.length) {
    return { empty: true, cycle: Number(cycle), kind: 'simon-longview', reason: 'no-sports-feed-rows' };
  }
  // Engine beat decks — COLOUR/POINTERS only, never facts (no merge into anchorFacts)
  const decks = sports.loadBeatDecks(root, Number(cycle));
  const hooks = sports.sportsHooks(decks, Number(cycle), 'Simon Leary');
  const seeds = sports.sportsSeeds(decks, Number(cycle), 'Simon Leary');
  // Raw civic-architecture columns the world-summary distillation drops
  // (beat: sports as civic architecture — franchise/stadium economics).
  const civicFacts = [];
  for (const rawRow of sports.loadRawFeedRows(root, 'Oakland_Sports_Feed', Number(cycle))) {
    if (Number(rawRow.Cycle) !== Number(cycle)) continue;
    const label = String(rawRow.Team || rawRow.Franchise || rawRow.EventKind || 'sports feed').trim() || 'sports feed';
    for (const col of ['FranchiseStability', 'EconomicFootprint', 'EventTrigger', 'HomeNeighborhood']) {
      const v = String(rawRow[col] == null ? '' : rawRow[col]).trim();
      if (!v || v === '-' || v === '—') continue;
      civicFacts.push(col + ' (feed): ' + v + ' — ' + label);
      if (civicFacts.length >= 6) break;
    }
    if (civicFacts.length >= 6) break;
  }
  const ledger = o.ledger || sports.loadLedgerNameIndex(root);
  const ranked = rows.map(row => ({ row, score: score(row, cycle) }))
    .sort((a, b) => b.score - a.score);
  const top = ranked.find(item => publicFacts(item.row, sports.resolveFeedPlayers(item.row, ledger, 8)).length >= 2);
  if (!top) {
    return { empty: true, cycle: Number(cycle), kind: 'simon-longview', reason: 'no-publishable-structural-row' };
  }
  const row = top.row;
  const players = sports.resolveFeedPlayers(row, ledger, 8).filter(player => player.popid);
  const anchorFacts = publicFacts(row, players);
  const moveFact = anchorFacts.find(fact => /bullpen/.test(fact));
  const recordFact = anchorFacts.find(fact => /record is/.test(fact));
  const label = [recordFact, moveFact].filter(Boolean).join(' ');
  const story = {
    angle: label,
    label,
    hookLine: label,
    kind: 'long-view-signal',
    hood: row.neighborhood || null,
    popids: players.map(player => player.popid),
    citizens: players.map(player => player.name + ' (' + player.popid + ')'),
    ref: 'world_summary_c' + cycle + '.md ## Sports',
    cycle: Number(cycle),
  };
  return {
    empty: false,
    cycle: Number(cycle),
    kind: 'simon-longview',
    desk: 'sports',
    journalist: { name: 'Simon Leary', popid: 'POP-00016', persona: 'simon-leary' },
    pulse: { className: 'role-change-under-continuity', score: top.score, label },
    prewrite: {
      bagModes: [
        { id: 2, name: 'Keystone Player' },
        { id: 4, name: 'Load-Bearing Continuity' },
      ],
      anchorFacts,
      claim: 'A role change inside a sustained team record can support a structural interpretation; it does not establish franchise history, organizational intent, or citywide meaning.',
      missing: [
        'why the role change was made',
        'historical comparison or franchise precedent',
        'organizational intention or future plan',
        'citywide, clubhouse, or fan interpretation',
      ],
      hooks,
    },
    hooks,
    seeds,
    civicFacts,
    story,
    approach: SIMON_APPROACH,
    players,
    scene: {
      colorRoom: 'No witnessed room or scene is supplied. Structure and continuity may appear only as clearly interpretive metaphor grounded in the approved present facts.',
    },
    candidates: ranked.slice(0, 8).map(item => ({
      score: item.score,
      cycle: item.row.cycle,
      team: item.row.team,
      label: item.row.storyAngle || item.row.rawHeader,
    })),
    pointers: [
      'output/world_summary_c' + cycle + '.md ## Sports',
      'scripts/sportsSubstrate.js',
      'docs/media/SIMON_LONGVIEW_BAG.md',
    ].concat(
      (hooks.length || seeds.length)
        ? ['output/beats/Story_Hook_Deck.jsonl + Story_Seed_Deck.jsonl (sports, this cycle)']
        : []),
  };
}

function formatSimonSliceMarkdown(slice) {
  if (!slice || slice.empty) {
    return '# SLICE — long-view (Simon Leary) EMPTY\n\n_No publishable structural sports row for this cycle._\n';
  }
  const L = [];
  L.push('# SLICE — long-view (Simon Leary), Cycle ' + slice.cycle);
  L.push('JOURNALIST: Simon Leary (POP-00016) · persona simon-leary');
  L.push('');
  L.push('## PULSE');
  L.push('CLASS: ' + slice.pulse.className + ' · SCORE: ' + slice.pulse.score);
  L.push('LABEL: ' + slice.pulse.label);
  L.push('');
  L.push('## PREWRITE');
  L.push('- Claim: ' + slice.prewrite.claim);
  L.push('**AnchorFacts**:');
  for (const f of slice.prewrite.anchorFacts || []) L.push('  - ' + f);
  L.push('**Missing** (do not invent):');
  for (const f of slice.prewrite.missing || []) L.push('  - ' + f);
  L.push('');
  if (slice.civicFacts && slice.civicFacts.length) {
    L.push('## FRANCHISE / CIVIC COLUMNS (raw feed)');
    L.push('_Raw Oakland_Sports_Feed columns the world-summary distillation drops — colour, not fact._');
    for (const f of slice.civicFacts) L.push('- ' + f);
    L.push('');
  }
  if ((slice.hooks && slice.hooks.length) || (slice.seeds && slice.seeds.length)) {
    L.push('## ENGINE HOOKS / SEEDS (colour, not fact)');
    L.push('_Colour and pointers only — never merge into anchorFacts._');
    for (const h of slice.hooks || []) {
      L.push('- HOOK: ' + h.text + (h.angle ? ' — angle: ' + h.angle : '') +
        (h.hood ? ' [' + h.hood + ']' : ''));
    }
    for (const s of slice.seeds || []) {
      L.push('- SEED: ' + (s.seedId || 'seed') + (s.angle ? ' — ' + s.angle : '') +
        (s.hood ? ' [' + s.hood + ']' : '') +
        (s.citizens && s.citizens.length ? ' · citizens: ' + s.citizens.join(', ') : '') +
        (s.businesses && s.businesses.length ? ' · businesses: ' + s.businesses.join(', ') : ''));
    }
    L.push('');
  }
  L.push('## POINTERS');
  for (const p of slice.pointers || []) L.push('- ' + p);
  L.push('');
  L.push('_Generated by scripts/buildSimonSlice.js — no LLM. Civic columns + engine hooks/seeds are colour, not fact._');
  return L.join('\n') + '\n';
}

function slicePath(cycle, root) {
  return path.join(root || ROOT, 'output', 'cron-compare', 'simon_slice_c' + cycle + '.json');
}

function loadSimonSlice(cycle, root) {
  const file = slicePath(cycle, root);
  const existing = sports.loadJson(file);
  if (existing && !existing.empty) return existing;
  const slice = buildSimonSlice(cycle, { root: root || ROOT });
  if (!slice.empty) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(slice, null, 2));
  }
  return slice.empty ? null : slice;
}

if (require.main === module) {
  const i = process.argv.indexOf('--cycle');
  const eq = process.argv.find(value => value.startsWith('--cycle='));
  const cycle = i >= 0 ? process.argv[i + 1] : (eq ? eq.slice(8) : null);
  if (!cycle) throw new Error('pass --cycle N');
  console.log(JSON.stringify(buildSimonSlice(cycle), null, 2));
}

module.exports = { buildSimonSlice, loadSimonSlice, formatSimonSliceMarkdown, score, publicFacts, SIMON_APPROACH };

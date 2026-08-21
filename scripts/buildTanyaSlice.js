#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const sports = require('./sportsSubstrate');
const ROOT = path.join(__dirname, '..');

const TANYA_APPROACH =
  'Sideline approach (Tanya Cruz): you file from the clubhouse. That SET is yours — the Packet will never list a clubhouse event. ' +
  'Paint what the supplied sports line predicts. Packet player quotes and numbers only. New in-world spots go on INTAKE BIZ. ' +
  'No real-world Oakland venues. Unresolved feed names keep their supplied label and receive no identity, role, quote, or interview.';

function score(row, cycle) {
  const blob = [row.eventKind, row.storyAngle, row.notes].join(' ').toLowerCase();
  let value = row.cycle === Number(cycle) ? 30 : 0;
  if (/clubhouse|press|manager|locker|sideline|injur|debut|return/.test(blob)) value += 20;
  if (sports.hasUsableStats(row)) value += 12;
  if (row.namesUsed) value += 8;
  return value;
}

function publishableAnchorFacts(row, players, cycle) {
  const resolved = new Map((players || []).filter(player => player.popid)
    .map(player => [player.name.toLowerCase(), player.name]));
  const facts = [];
  for (const part of sports.parseStatsLine(row.stats || '')) {
    const canonical = resolved.get(String(part.name || '').toLowerCase());
    if (canonical && part.line) {
      const line = String(part.line)
        .replace(/(\d+)\s*pt\b/gi, '$1 points')
        .replace(/(\d+)\s*asst\b/gi, '$1 assists')
        .replace(/(\d+)\s*ast\b/gi, '$1 assists')
        .replace(/(\d+)\s*reb\b/gi, '$1 rebounds')
        .replace(/(\d+)\s*stl\b/gi, '$1 steals')
        .replace(/(\d+)\s*blk\b/gi, '$1 blocks')
        .replace(/\s*\/\s*/g, ' and ');
      facts.push(canonical + ' recorded ' + line + '.');
    }
  }
  if (row.record && /\d/.test(row.record)) {
    facts.push('The ' + row.team + (row.seasonType ? ' ' + row.seasonType : '') +
      ' record is ' + row.record + '.');
  }
  return facts.slice(0, 8);
}

function buildTanyaSlice(cycle, opts) {
  const o = opts || {};
  const root = o.root || ROOT;
  const rows = sports.loadSportsRows(Number(cycle), { root, summaryMd: o.summaryMd, signal: o.signal });
  if (!rows.length) return { empty: true, cycle: Number(cycle), kind: 'tanya-sideline', reason: 'no-sports-feed-rows' };
  const ranked = rows.map(row => ({ row, score: score(row, cycle) })).sort((a, b) => b.score - a.score);
  const top = ranked[0];
  const row = top.row;
  const players = sports.resolveFeedPlayers(row, o.ledger || sports.loadLedgerNameIndex(root), 8);
  const anchorFacts = publishableAnchorFacts(row, players, cycle);
  const storyLabel = [
    row.team + (row.seasonType ? ' ' + row.seasonType : '') +
      (row.record ? ' update: ' + row.record : ' update'),
    anchorFacts.find(fact => !fact.startsWith('The ' + row.team)) || null,
  ].filter(Boolean).join(' — ');
  const story = {
    angle: storyLabel,
    label: storyLabel,
    hookLine: storyLabel,
    kind: 'sideline-signal', hood: row.neighborhood || null,
    popids: players.filter(p => p.popid).map(p => p.popid),
    citizens: players.filter(p => p.popid).map(p => p.name + ' (' + p.popid + ')'),
    ref: 'world_summary_c' + cycle + '.md ## Sports', cycle: Number(cycle)
  };
  return {
    empty: false, cycle: Number(cycle), kind: 'tanya-sideline', desk: 'sports',
    journalist: { name: 'Tanya Cruz', popid: 'POP-00014', persona: 'tanya-cruz' },
    pulse: { className: 'record-only-sideline', score: top.score, label: story.label },
    prewrite: {
      bagModes: [{ id: 10, name: 'Inference Close' }],
      anchorFacts,
      claim: 'The supplied sports record is the weather. The clubhouse SET is allotted hallucination fitted to that line.',
      accessEvidence: { state: 'ALLOTTED', facts: ['clubhouse/sideline SET is the reporter\'s room'] },
      quoteEvidence: { state: 'NOT_SUPPLIED', quotes: [] },
      observationEvidence: { state: 'ALLOTTED', facts: [] },
      missing: ['Packet player quotes', 'injury or team-response facts beyond the supplied record']
    },
    story, approach: TANYA_APPROACH, players,
    scene: { colorRoom: 'Clubhouse SET is authorized. Invented player quotes and real-world venues are not.' },
    candidates: ranked.slice(0, 8).map(item => ({ score: item.score,
      label: item.row.storyAngle || item.row.rawHeader, cycle: item.row.cycle })),
    pointers: ['output/world_summary_c' + cycle + '.md ## Sports', 'scripts/sportsSubstrate.js',
      'docs/media/TANYA_SIDELINE_BAG.md']
  };
}

function slicePaths(cycle, root) {
  const r = root || ROOT;
  return { json: path.join(r, 'output', 'cron-compare', 'tanya_slice_c' + cycle + '.json') };
}

function loadTanyaSlice(cycle, root) {
  const paths = slicePaths(cycle, root);
  const existing = sports.loadJson(paths.json);
  if (existing && !existing.empty) return existing;
  const slice = buildTanyaSlice(cycle, { root: root || ROOT });
  if (!slice.empty) {
    fs.mkdirSync(path.dirname(paths.json), { recursive: true });
    fs.writeFileSync(paths.json, JSON.stringify(slice, null, 2));
  }
  return slice.empty ? null : slice;
}

if (require.main === module) {
  const i = process.argv.indexOf('--cycle');
  const eq = process.argv.find(v => v.startsWith('--cycle='));
  const cycle = i >= 0 ? process.argv[i + 1] : (eq ? eq.slice(8) : null);
  if (!cycle) throw new Error('pass --cycle N');
  console.log(JSON.stringify(buildTanyaSlice(cycle), null, 2));
}

module.exports = { buildTanyaSlice, loadTanyaSlice, score, publishableAnchorFacts, TANYA_APPROACH };

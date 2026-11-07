// engine.332 bench helpers on SANDBOX 1004 (run 2 on the codex fold reads the contract carry too) (no token echoed). Bench-only Edition_Coverage_Ratings rows,
// Reporter marker E332-BENCH NON-CANON (the tab has no Notes column).
//   node 2026-11-07-e332-bench.js plant <N>          fire 1 ratings: HEALTH -4, ENVIRONMENT +5, SPORTS +3, CIVIC +2 at N-1;
//                                                    ENVIRONMENT +3 at N (a same-beat pair across two rating Cycles)
//   node 2026-11-07-e332-bench.js read <label> <N>   readback, one JSON line appended to 2026-11-07-e332-reads.jsonl
require('/root/GodWorld/lib/env');
const fs = require('fs');
const LIVE = process.env.GODWORLD_SHEET_ID;
const BENCH = '1tByPpT8QIgJppabjpEdAqPlTjcq2RBSkL_QDrGk8YcA', BENCH_TITLE = 'Sandox_104_c109-live_Simulation_Narrative';
const OUT = '/root/GodWorld/output/engine-sheet/2026-11-07-e332-reads.jsonl';
const MARK = 'E332-BENCH NON-CANON';
const sh = require('/root/GodWorld/lib/sheets');
const num = v => { const n = Number(String(v).replace(/^C/, '').trim()); return isFinite(n) ? n : null; };
const obj = d => { const h = (d[0] || []).map(x => String(x).trim()); return { h, rows: d.slice(1).map(r => Object.fromEntries(h.map((k, i) => [k, r[i] === undefined ? '' : r[i]]))) }; };

function ratingRows(N) {
  const R = (cycle, Domain, Rating, ArticleCount, Tone) => ({ Cycle: cycle, Domain, Rating, ArticleCount, Reporter: MARK, Tone, Processed: 'FALSE' });
  return [
    R(N - 1, 'HEALTH', -4, 1, 'negative'),
    R(N - 1, 'ENVIRONMENT', 5, 2, 'positive'),
    R(N - 1, 'SPORTS', 3, 1, 'mixed'),
    R(N - 1, 'CIVIC', 2, 1, 'positive'),
    R(N, 'ENVIRONMENT', 3, 1, 'positive')
  ];
}

(async () => {
  const [cmd, a1, a2] = process.argv.slice(2);
  process.env.GODWORLD_SHEET_ID = BENCH;
  if (BENCH === LIVE) throw new Error('bench = live');
  const client = await sh.getClient();
  const title = (await client.spreadsheets.get({ spreadsheetId: BENCH, fields: 'properties.title' })).data.properties.title;
  if (title !== BENCH_TITLE) throw new Error('title check failed: ' + title);

  if (cmd === 'plant') {
    const N = Number(a1);
    const ecr = obj(await sh.getSheetData('Edition_Coverage_Ratings'));
    if (ecr.rows.some(r => String(r.Reporter) === MARK)) throw new Error('bench already has E332 rating rows — stop');
    const inWindow = ecr.rows.filter(r => (num(r.Cycle) === N || num(r.Cycle) === N - 1) && !/^(true|yes|1)$/i.test(String(r.Processed).trim()));
    if (inWindow.length) console.log('note: ' + inWindow.length + ' unprocessed rows already in the window (live data, ride along): ' + inWindow.map(r => r.Cycle + ':' + r.Domain + ':' + r.Rating).join(', '));
    const rows = ratingRows(N);
    await sh.appendRows('Edition_Coverage_Ratings', rows.map(o => ecr.h.map(k => (o[k] === undefined ? '' : o[k]))));
    const back = obj(await sh.getSheetData('Edition_Coverage_Ratings')).rows.filter(r => String(r.Reporter) === MARK);
    console.log('planted ' + back.length + '/' + rows.length + ' rating rows: ' + back.map(r => 'C' + r.Cycle + ' ' + r.Domain + ' ' + r.Rating).join(', '));
    process.exit(back.length === rows.length ? 0 : 1);
  }

  if (cmd === 'read') {
    const label = a1, N = Number(a2);
    const ecr = obj(await sh.getSheetData('Edition_Coverage_Ratings')).rows
      .filter(r => num(r.Cycle) === N || num(r.Cycle) === N - 1)
      .map(r => ({ cycle: num(r.Cycle), domain: r.Domain, rating: num(r.Rating), reporter: r.Reporter, processed: r.Processed }));
    const rip = obj(await sh.getSheetData('Ripple_Ledger'));
    const ripN = rip.rows.filter(r => num(r.Cycle) === N);
    const reactions = ripN.filter(r => r.CauseType === 'coverage-reaction')
      .map(r => ({ causeId: r.CauseId, effect: r.EffectType, mag: r.Magnitude, scope: r.TargetScope, src: r.SourceEngine, detail: r.CauseDetail }));
    const editionCoverage = ripN.filter(r => r.CauseType === 'edition-coverage').map(r => r.CauseId + ' mag ' + r.Magnitude);
    const deck = obj(await sh.getSheetData('Story_Seed_Deck')).rows.filter(r => num(r.Cycle) === N);
    const reactionSeeds = deck.filter(r => / coverage reaction /.test(String(r.What) + ' '))
      .map(r => ({ seedId: r.SeedID, desk: r.Desk, cls: r.Class, domain: r.Domain, hood: r.Neighborhood, what: r.What, why: r.Why,
        mag: r.Magnitude, citizens: String(r.Citizens).slice(0, 160), journalist: r.SuggestedJournalist }));
    const aggSeeds = deck.filter(r => /Edition coverage lifted the city/.test(String(r.Why)))
      .map(r => ({ desk: r.Desk, cls: r.Class, what: r.What }));
    // the desk signal's own lane function over this Cycle's real bench rows (emitDeskSignal routes ripples with it)
    const ws = require('/root/GodWorld/scripts/buildWorldSummary.js');
    const lanes = reactions.map(x => ({ causeId: x.causeId, lane: ws.rippleLane({ CauseType: 'coverage-reaction', CauseId: x.causeId }) }));
    const sig = ws.emitDeskSignal ? ws.emitDeskSignal(N, { rippleAll: rip.rows }) : null;
    const sigLanes = sig ? Object.fromEntries(Object.entries(sig.lanes).map(([k, v]) => [k, v.filter(e => e.causeType === 'coverage-reaction').map(e => e.label)])) : null;
    // codex F1 fold: the contract carry Phase 9 saved at N holds every deck row with a What but the coverage reactions
    const cfs = obj(await sh.getSheetData('Carry_Forward_Store')).rows.filter(r => r.Key === 'PREV_CONTRACT_SEEDS_JSON' && num(r.Cycle) === N);
    let carry = null;
    if (cfs.length) { try { const j = JSON.parse(cfs[cfs.length - 1].JSON); carry = { cycle: j.cycle, count: j.count, seeds: (j.seeds || []).length,
      citywide: (j.seeds || []).filter(x => /^citywide$/i.test(x.n)).length }; } catch (e) { carry = { parseError: e.message }; } }
    const deckWithWhat = deck.filter(r => String(r.What).trim()).length;
    const carryCheck = carry && !carry.parseError ? { expectCount: deckWithWhat - reactionSeeds.length, ok: carry.count === deckWithWhat - reactionSeeds.length } : null;
    const ee = obj(await sh.getSheetData('Engine_Errors'));
    const eeN = ee.rows.filter(r => num(r.Cycle) === N).map(r => [r.Phase, r.Error].join(' | ').slice(0, 220));
    const wk = obj([['Key', 'Value'], ...(await sh.getSheetData('World_Config')).slice(1)]).rows;
    const out = { label, N, at: new Date().toISOString(), cycleCount: (wk.find(r => r.Key === 'cycleCount') || {}).Value,
      ratingsInWindow: ecr, reactionRipples: reactions, editionCoverageRipples: editionCoverage,
      deckRowsAtN: deck.length, reactionSeeds, contractCarry: carry, contractCarryCheck: carryCheck, aggregateSeeds: aggSeeds, rippleLanes: lanes, deskSignalCoverageReaction: sigLanes,
      engineErrorsAtN: eeN };
    fs.appendFileSync(OUT, JSON.stringify(out) + '\n');
    console.log(JSON.stringify(out, null, 1));
    return;
  }
  throw new Error('usage: plant <N> | read <label> <N>');
})().catch(e => { console.error('ERR ' + e.message); process.exit(1); });

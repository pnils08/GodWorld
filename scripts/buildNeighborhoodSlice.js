#!/usr/bin/env node
/**
 * buildNeighborhoodSlice.js — Maria Keen's neighborhood slice (the culture lane,
 * builder-directed 2026-09-10 program; pipeline.68 shape). Rides ALONGSIDE the
 * shared evening pack. First-person witness; one block one truth.
 *
 * Sources:
 *   Community_Programs (Name, Founder_POPID, Neighborhood, Type, Status,
 *     Founded_Cycle) — the block's actual institutions. The dump comment has
 *     named her for this tab since Task 1; until now only Graye's slice read it.
 *   Neighborhood_Demographics vs output/beats/prev/ — population movement in
 *     the focus hood (who is moving in; the number that actually drifts).
 *   Story_Hook_Deck — hooks addressed to Maria by name (the COMMUNITY
 *     demographic hooks already match her), plus this cycle's
 *     NEIGHBORHOOD_BOOM / NEIGHBORHOOD_RISING / NEIGHBORHOOD_COOLING /
 *     CITIZEN_RELOCATED / RENT_BURDEN_CRISIS rows by domain — those are
 *     raw-carried with no desk and no journalist engine-side (cut filed).
 * Focus hood rotates by cycle through hoods with an active program.
 * Artifacts: output/slices/c{N}/maria-keen.md · output/cron-compare/neighborhood_slice_c{N}.json
 */
'use strict';
const K = require('./beatSliceKit');

const SEAT = {
  slug: 'maria-keen', name: 'Maria Keen', popid: 'POP-00013', desk: 'culture',
  kind: 'beat-neighborhood', domain: 'neighborhood', artifact: 'neighborhood', builder: 'buildNeighborhoodSlice.js',
  version: 'HOOD-SLICE-1', nameRe: /maria\s*keen/i,
  tabs: ['Community_Programs', 'Neighborhood_Demographics', 'Story_Hook_Deck'],
  approach: 'Neighborhood approach: this slice is one block\'s record — its community programs and their founders, who is moving in or out, and the engine\'s neighborhood hooks this cycle. First-person witness, one block one truth. The programs, founders and movement numbers are real; the stoop conversations, the mailboxes, the dog everyone knows are yours.',
  roomIsYours: 'the stoop, the corner store counter, who moved in last month and who is thinking about leaving, what the block argues about',
  build
};

function build(cycle, { root, beats, profiles }) {
  const programs = (beats.Community_Programs || []).filter(pr => pr.Name && /active/i.test(String(pr.Status || '')));
  if (!programs.length) return K.emptySlice(SEAT, cycle, 'no active Community_Programs rows');
  const hoods = [...new Map(programs.map(pr => [K.hoodKey(pr.Neighborhood), pr.Neighborhood])).values()].filter(Boolean).sort();
  const hood = hoods[cycle % hoods.length];
  const here = programs.filter(pr => K.hoodKey(pr.Neighborhood) === K.hoodKey(hood));
  const progSrc = 'output/beats/Community_Programs.jsonl @C' + cycle;

  const facts = [];
  const people = [];
  for (const pr of here.slice(0, 6)) {
    const founder = pr.Founder_POPID ? K.personFromProfile(profiles, pr.Founder_POPID, 'founded ' + pr.Name + ' (Community_Programs)', hood) : null;
    facts.push({
      text: pr.Name + (pr.Type ? ' (' + pr.Type + ')' : '') + ', ' + hood + (founder ? ' — founded by ' + founder.name : '') +
        (pr.Founded_Cycle ? ', since C' + pr.Founded_Cycle : ''),
      src: progSrc + ' ' + (pr.Program_ID || pr.Name)
    });
    if (founder && !people.some(p => p.popid === founder.popid)) people.push(founder);
  }

  // Population movement in the focus hood — the number that actually drifts.
  const demo = (beats.Neighborhood_Demographics || []).find(r => K.hoodKey(r.Neighborhood) === K.hoodKey(hood));
  const prev = K.prevTabRows(root, 'Neighborhood_Demographics');
  const prevDemo = prev.rows.find(r => K.hoodKey(r.Neighborhood) === K.hoodKey(hood));
  if (demo) {
    const bits = [hood + ' this cycle: ' + K.fmtInt(K.num(demo.Students)) + ' students, ' +
      K.fmtInt(K.num(demo.Adults)) + ' adults, ' + K.fmtInt(K.num(demo.Seniors)) + ' seniors'];
    if (prevDemo) {
      const moves = [];
      for (const [col, label] of [['Students', 'students'], ['Adults', 'adults'], ['Seniors', 'seniors']]) {
        const d = K.num(demo[col]) != null && K.num(prevDemo[col]) != null ? K.num(demo[col]) - K.num(prevDemo[col]) : null;
        if (d) moves.push((d > 0 ? '+' : '') + d + ' ' + label);
      }
      if (moves.length) bits.push('moved vs C' + prev.vs + ': ' + moves.join(', '));
    }
    facts.push({ text: bits.join(' — '), src: 'output/beats/Neighborhood_Demographics.jsonl @C' + cycle +
      (prevDemo ? ' vs prev/' : '') });
  }

  const hooks = K.domainHooks(beats, cycle, SEAT.name,
    /^(NEIGHBORHOOD_BOOM|NEIGHBORHOOD_RISING|NEIGHBORHOOD_COOLING|CITIZEN_RELOCATED|RENT_BURDEN_CRISIS|COMMUNITY)$/).slice(0, 8);

  const label = hood + ': ' + here.length + ' active program' + (here.length === 1 ? '' : 's') + ' on the record';
  return K.makeSlice(SEAT, cycle, beats, {
    ref: progSrc, hood, label,
    angle: hood + ' — the programs that hold the block and the people who founded them',
    hookLine: people.length
      ? here.length + ' active programs in ' + hood + '; ' + people.map(p => p.name).slice(0, 2).join(' and ') +
        (people.length > 2 ? ' and ' + (people.length - 2) + ' more' : '') + ' founded ' + (people.length === 1 ? 'one' : 'them') + '.'
      : here.length + ' active programs in ' + hood + '; no founder is on the ledger — the block is yours.',
    facts, people,
    deltas: { state: prev.state, vs: prev.vs },
    hooks,
    note: people.length ? null : 'no program founder in ' + hood + ' resolves on the ledger',
    extra: { programs: here.map(pr => pr.Name), rotation: { index: cycle % hoods.length, of: hoods.length } }
  });
}

const W = K.wire(SEAT);
if (require.main === module) W.main();
module.exports = { SEAT, loadSlice: W.load, buildNeighborhoodSlice: W.build, writeNeighborhoodSlice: W.write, loadNeighborhoodSlice: W.load,
  isNeighborhoodSeat: W.isSeat, assignmentFromSlice: W.assignmentFromSlice, enrichAssignment: W.enrichAssignment, slicePaths: W.paths };

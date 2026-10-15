'use strict';
/**
 * engine.290 move 6 — the transit commute lines for Event_Content_Ledger.
 *
 * Two PoolKeys:
 *   occupation.transit  — Conditions `transitdisrupted`: the citizen's gate passed this
 *                         cycle (a disruption, or a chaos-train hit on their hood; 0.30 in
 *                         an affected hood, 0.12 elsewhere — generateCitizensEvents_). The
 *                         four lines that were inline in the generator move here verbatim,
 *                         plus authored delays, crowding and the platform wait. The pool's
 *                         mass is held to the old single line's 1.15 (transitCommuteMass_),
 *                         so more rows mean more variety, never more exposure.
 *   occupation.bartCrew — the crew's own week, keyed by exact title through the
 *                         `occupation` scope. Fires only once the builder's Intake mints
 *                         land; no row here authors a citizen.
 * Text is a LifeHistory verb phrase (lowercase, no final period), like the moved lines.
 * No `$` (the loader reads it as a fragment slot).
 *
 *   node scripts/transitEclPool.js                              # validate + print
 *   node scripts/undockedEclPoolApply.js --pool transit --poolkey occupation.transit          # dry-run vs live
 *   node scripts/undockedEclPoolApply.js --pool transit --poolkey occupation.transit --apply  # plan §Sequencing step 2
 *   (occupation.bartCrew waits on the builder's title ruling; the transit pool never applies without --poolkey)
 */
const U = require('./undockedEclPool');
const HDR = U.HDR;
const FOURTH_WALL = /videogame|video game|commander|get_action_log|mcp__|openrouter|spacemolt-lib|FameScore|UsageCount|DialState|World_Config|POP-\d|Tier \d/i;
const COMMUTE = 'occupation.transit';
const CREW = 'occupation.bartCrew';
const KEYS = [COMMUTE, CREW];
const CREW_TITLES = ['BART Train Conductor', 'BART Train Operator', 'BART Rail Dispatcher', 'BART Track Maintenance Technician'];

function commute(texts) {
  return texts.map(function (t) {
    return { Kind: 'line', PoolKey: COMMUTE, Slot: '', Text: t, Weight: '1.15', Conditions: 'transitdisrupted', Tags: 'source:occupation,transit:disruption', Grain: 'citizen', Active: 'yes' };
  });
}
function crew(title, texts) {
  return texts.map(function (t) {
    return { Kind: 'line', PoolKey: CREW, Slot: '', Text: t, Weight: '1', Conditions: 'occupation=' + title, Tags: 'source:occupation,transit:crew', Grain: 'citizen', Active: 'yes' };
  });
}

const ROWS = [].concat(
  // moved verbatim from generateCitizensEvents.js (engine.70 T-2)
  commute([
    'lost an hour of the morning to the transit shutdown',
    'waited out the delays with everyone else on the platform',
    'gave up on the train and found another way in to work',
    'was late to a shift when the line went down'
  ]),
  // authored: delays, crowding, the platform wait
  commute([
    'stood on the platform watching the arrival board add minutes instead of taking them away',
    'got wedged against the doors for three stops when the delayed train finally came in packed',
    'texted the boss a photo of the platform crowd instead of an excuse',
    'shared a rideshare with two strangers from the same stalled platform',
    'walked the last stretch to work after the train held between stations',
    'learned the name of the regular who always stands by the same pillar, waiting out the same delay'
  ]),
  crew('BART Train Conductor', [
    'made the same calm announcement six times on a run that would not stay on schedule',
    'walked the cars at the end of the line and found a lost lunchbox with a name on it'
  ]),
  crew('BART Train Operator', [
    'brought the first train of the morning out of the yard right on the minute',
    'held the train at the platform an extra beat so a running commuter could make it'
  ]),
  crew('BART Rail Dispatcher', [
    'spent the rush rerouting trains around a signal fault before most riders noticed',
    'watched the whole line on one board and kept it moving through the evening crush'
  ]),
  crew('BART Track Maintenance Technician', [
    'worked the overnight window on a stretch of track the morning trains would run on in hours',
    'traced a switch fault down to one worn part and had it replaced before the first train'
  ])
);

function norm(t) { return String(t || '').replace(/\s+/g, ' ').trim().toLowerCase(); }

function validateRows(rows) {
  const errors = [];
  const seen = {};
  const list = rows || ROWS;
  list.forEach(function (r, i) {
    const t = String(r.Text || '');
    if (r.Kind !== 'line') errors.push(i + ': Kind');
    if (KEYS.indexOf(r.PoolKey) < 0) errors.push(i + ': PoolKey ' + r.PoolKey);
    if (!t) errors.push(i + ': empty Text');
    if (/\$/.test(t)) errors.push(i + ': `$` in Text — the loader drops it');
    if (/[.!?]$/.test(t) || /^[A-Z]/.test(t)) errors.push(i + ': LifeHistory verb phrase — lowercase, no final period');
    if (FOURTH_WALL.test(t) || FOURTH_WALL.test(r.Tags)) errors.push(i + ': fourth-wall');
    if (U.firstTag(r.Tags) !== 'source:occupation') errors.push(i + ': first tag must be source:occupation (work class gate)');
    if (r.Tags.indexOf(';') >= 0) errors.push(i + ': tags must be comma-split');
    if (r.PoolKey === COMMUTE && r.Conditions !== 'transitdisrupted') errors.push(i + ': commute rows draw only under transitdisrupted');
    if (r.PoolKey === CREW && CREW_TITLES.indexOf(String(r.Conditions).replace(/^occupation=/, '')) < 0) errors.push(i + ': crew rows key an exact BART crew title');
    if (!(Number(r.Weight) > 0)) errors.push(i + ': Weight');
    const n = norm(t);
    if (seen[n]) errors.push(i + ': duplicate Text — ' + t);
    seen[n] = true;
  });
  if (list.filter(function (r) { return r.PoolKey === COMMUTE; }).length < 10) errors.push('commute pool needs the 4 moved + >= 6 authored rows');
  return { valid: !errors.length, errors: errors, count: list.length };
}

function toSheetValues(rows) {
  return (rows || ROWS).map(function (r) { return HDR.map(function (h) { return r[h] == null ? '' : r[h]; }); });
}

function counts(rows) {
  const c = {};
  (rows || ROWS).forEach(function (r) { c[r.PoolKey] = (c[r.PoolKey] || 0) + 1; });
  return c;
}

if (require.main === module) {
  const v = validateRows(ROWS);
  const c = counts(ROWS);
  KEYS.forEach(function (k) { console.log(k + ' ' + (c[k] || 0)); });
  console.log(v.valid ? ('OK ' + v.count + ' rows') : ('INVALID\n' + v.errors.join('\n')));
  process.exit(v.valid ? 0 : 1);
}

module.exports = { HDR, KEYS, ROWS, CREW_TITLES, validateRows, toSheetValues, counts, firstTag: U.firstTag };

#!/usr/bin/env node
// engine.310 offline fixtures (codex plan review step 3). Loads the working-tree
// writer's eventAttractBase_ and the HEAD-at-plan writer's inline substring block
// (old rule, exact code) and checks: (a) each of the 104 named city events alone,
// (b) the 10 tapped C113 contributor lines, (c) false / admitted words, (d) the
// B2 analytical fixture, (e) double count + empty entries.
// Usage: node output/engine-sheet/2026-10-21-e310-fixtures.js [oldRef=50d433b7]
'use strict';
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const ROOT = path.resolve(__dirname, '../..');
const WRITER = 'phase08-v3-chicago/v3NeighborhoodWriter.js';
const oldRef = process.argv[2] || '50d433b7';

const cur = new Function(fs.readFileSync(path.join(ROOT, WRITER), 'utf8') +
  '\nreturn { eventAttractBase_ };')();

// Old rule: the exact pre-fix lines, cut from the old ref by marker.
const oldSrc = execSync(`git -C ${ROOT} show ${oldRef}:${WRITER}`, { encoding: 'utf8' });
const cut = (from, to) => { const a = oldSrc.indexOf(from), b = oldSrc.indexOf(to, a); if (a < 0 || b < 0) throw new Error('marker ' + from); return oldSrc.slice(a, b); };
const oldBody =
  cut('  var worldEvents = S.worldEvents || [];', '  var eventArcs') +
  cut('  function eventText(ev) {', '  // engine.72 G-EC56') +
  cut('  var baseEventAttract = 0;', '  // Retail vitality from dynamics') +
  '  return baseEventAttract;';
const oldBase = new Function('S', oldBody);
const newBase = S => cur.eventAttractBase_(S).base;

const fails = [];
const check = (label, got, want) => { if (got !== want) fails.push(`${label}: got ${got} want ${want}`); };
const out = {};

// (a) each named city event alone — new: counted once via S.cityEvents; old: as its seed
const evSrc = fs.readFileSync(path.join(ROOT, 'phase04-events/buildCityEvents.js'), 'utf8');
const names = [...new Set([...evSrc.matchAll(/name: *"([^"]+)"/g)].map(m => m[1]))];
check('names found', names.length, 104);
out.names = names.map(n => {
  const nb = newBase({ cityEvents: [n] });
  const ob = oldBase({ storySeeds: [{ text: '[CITY EVENT] ' + n, seedType: 'city-event' }] });
  check('name ' + n, nb, 1);
  return { name: n, old: ob, new: nb };
});
out.namesOldCount = out.names.filter(x => x.old).length;

// (b) the 10 tapped C113 contributor lines (eadiag Contrib: domain|priority|hood|text)
const tapped = [];
for (const leg of ['A2t', 'B2t']) {
  const d = JSON.parse(fs.readFileSync(path.join(__dirname, `2026-10-21-e306-eadiag-${leg}-c113.json`), 'utf8'));
  for (const [kind, idx, , term, ident] of JSON.parse(d.rows[0][2])) {
    const text = ident.split('|').slice(3).join('|');
    const S = kind === 'seed'
      ? { storySeeds: [{ text, seedType: text.indexOf('[CITY EVENT] ') === 0 ? 'city-event' : 'signal' }] }
      : { storyHooks: [{ text }] };
    const want = /\bcommunity\b/.test(text) ? 1 : 0;   // the two community lines per leg are the only real words
    const nb = newBase(S);
    check(`${leg} ${kind}${idx}`, nb, want);
    check(`${leg} ${kind}${idx} old`, oldBase(S), 1);
    tapped.push({ leg, kind, idx, term, text, old: 1, new: nb });
  }
}
check('tapped lines', tapped.length, 10);
out.tapped = tapped;

// (c) words: false catches → 0, admitted forms → 1, in the story loop and the event loop
const falseWords = ['party', 'parties', 'start', 'starting', 'participated', 'article', 'partner', 'department',
  'apartment', 'apartments', 'bart', 'macarthur', 'heart', 'sweetheart', 'smart', 'carter', 'arturo', 'martinez',
  'artist', 'artists', 'artistic', 'artwork', 'marketing', 'supermarket', 'communitylife', 'agriculture', 'concerted'];
const storyWords = ['art', 'arts', 'Art', 'art-walk', 'community', 'culture', 'cultures', 'festival', 'festivals'];
const eventWords = ['festival', 'festivals', 'concert', 'concerts', 'art', 'arts', 'celebration', 'celebrations',
  'parade', 'parades', 'market', 'markets', 'Night Market'];
out.words = {};
for (const w of falseWords) {
  const s = newBase({ storyHooks: [{ text: 'x ' + w + ' y' }] });
  const e = newBase({ worldEvents: [{ description: 'x ' + w + ' y' }] });
  check('false story ' + w, s, 0); check('false event ' + w, e, 0);
  out.words[w] = { story: s, event: e };
}
for (const w of storyWords) check('story ' + w, newBase({ storyHooks: [{ text: 'x ' + w + ' y' }] }), 1);
for (const w of eventWords) check('event ' + w, newBase({ worldEvents: [{ description: 'x ' + w + ' y' }] }), 1);
check('event domain only', newBase({ worldEvents: [{ domain: 'CULTURE', description: 'quiet' }] }), 1);
check('event domain + word', newBase({ worldEvents: [{ domain: 'festival', title: 'Lantern Parade' }] }), 2);

// (d) B2 analytical fixture: digest col Q + the tapped hits (every untapped line had
// no substring hit, so no whole-word hit — whole-word hits are a subset)
const b2 = JSON.parse(fs.readFileSync(path.join(__dirname, '2026-10-21-e306-step0-B2-c113.json'), 'utf8'));
const b2Raw = JSON.stringify(b2);
const B2_CITY = ['Jack London Neighborhood Stabilization Panel', 'Jack London Cozy Nights Film Series', 'The Dillon Family Block Party'];
check('B2 col Q carries the three names', b2Raw.indexOf(B2_CITY.join(', ')) >= 0, true);
const b2S = {
  cityEvents: B2_CITY,
  storySeeds: [
    { text: 'Cluster of city events sparking broader community reactions. Pattern emerging?', seedType: 'signal' },
    { text: 'Colder evenings influence community activity', seedType: 'signal' }
  ].concat(B2_CITY.map(n => ({ text: '[CITY EVENT] ' + n, seedType: 'city-event' }))),
  storyHooks: [{ text: 'Denise Carter has not advanced in 56 years' }],
  worldEvents: []
};
const b2New = cur.eventAttractBase_(b2S);
check('B2 old base (tap said 4)', oldBase(b2S), 4);
check('B2 new base', b2New.base, 5);
check('B2 city', b2New.hits.city, 3);
check('B2 seed', b2New.hits.seed, 2);
check('B2 hook', b2New.hits.hook, 0);
out.b2 = { old: oldBase(b2S), new: b2New };

// (e) double count + empty entries
check('city event + its seed → once', newBase({ cityEvents: ['Temescal Harvest Fair'],
  storySeeds: [{ text: '[CITY EVENT] Temescal Harvest Fair', seedType: 'city-event' }] }), 1);
check('city-event seed alone → 0', newBase({ storySeeds: [{ text: '[CITY EVENT] Fruitvale Community Bloom Festival', seedType: 'city-event' }] }), 0);
check('empty entries skipped', newBase({ cityEvents: ['', null, 'Lake Merritt Lantern Parade', undefined] }), 1);
check('empty S', newBase({}), 0);

out.fails = fails;
fs.writeFileSync(path.join(__dirname, '2026-10-21-e310-fixtures.json'), JSON.stringify(out, null, 1));
console.log(`names ${names.length} (old rule counted ${out.namesOldCount}) | tapped ${tapped.length} | ` +
  `false words ${falseWords.length} | B2 old ${out.b2.old} → new ${b2New.base} | ${fails.length ? 'FAIL' : 'PASS'}`);
fails.forEach(f => console.log('  ' + f));
process.exit(fails.length ? 1 : 0);

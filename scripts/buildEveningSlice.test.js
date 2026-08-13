#!/usr/bin/env node
/**
 * buildEveningSlice tests — offline (grok 2026-08-08 pipeline.52 Task 1).
 */
'use strict';

const fs = require('fs');
const path = require('path');
const {
  buildEveningSlice,
  formatEveningSliceMarkdown,
  assignmentFromSlice,
  writeEveningSlice,
  parseEveningTexture,
  parseCultureSignals,
  applyFaithCanonForward,
  emitPulses,
  recommendConsumer,
  pickPulseForPersona,
  isEveningConsumer,
  EVENING_APPROACH
} = require('./buildEveningSlice');

let failures = 0;
function ok(label, cond) {
  if (cond) { console.log('  ok — ' + label); return; }
  failures++;
  console.error('  FAIL — ' + label);
}

const FIXTURE_TEXTURE = `
## Evening Texture (Riley_Digest cycle 99)

- **Famous people spotted:** Mark Aitken, Vinnie Keane
- **Restaurants:** **The 44th Table** (Downtown), **Uptown Eats** (Uptown)
- **Fast food:** **SpeedyBurger** (Downtown)
- **Nightlife:** **KONO Cocktails** (KONO). Volume 3, vibe quiet, movement restricted. Weather impact 1.03.
- **City events:** Downtown Cultural Festival, KONO Arts District Celebration
- **Evening media TV:** **Cultural Spotlight**, **Crisis Desk**
- **Evening media movies:** **Art House Pick**
- **Sports broadcast:** Oakland Sports Tonight
- **Streaming trend:** indie film showcase
- **Food trend:** High mobility / civic-tension food trend

## World Events
`;

console.log('parseEveningTexture fixture:');
{
  const t = parseEveningTexture(FIXTURE_TEXTURE);
  ok('not empty', !t.empty);
  ok('44th Table restaurant', t.restaurants.some(v => v.name === 'The 44th Table' && v.hood === 'Downtown'));
  ok('KONO Cocktails nightlife', t.nightlife.some(v => /KONO Cocktails/i.test(v.name)));
  ok('quiet volume 3', t.nightlifeMeta.volume === 3 && /quiet/i.test(t.nightlifeMeta.vibe));
  ok('city events named', t.cityEvents.includes('Downtown Cultural Festival'));
  ok('tv slate', t.tv.includes('Cultural Spotlight'));
  ok('famous names', t.famous.includes('Vinnie Keane'));
}

console.log('emitPulses + recommend:');
{
  const t = parseEveningTexture(FIXTURE_TEXTURE);
  const signals = parseCultureSignals({
    lanes: {
      culture: [
        {
          kind: 'ripple',
          causeType: 'lifestyle-sighting',
          label: 'sighting | Mark Aitken spotted at Foothill Builders',
          hood: 'Fruitvale'
        },
        {
          kind: 'evening',
          ref: 'output/world_summary_c99.md "## Evening Texture"',
          label: 'Named venues that moved'
        }
      ]
    }
  });
  ok('parsed one sighting', signals.sightings.length === 1 && signals.sightings[0].venue === 'Foothill Builders');
  const pulses = emitPulses(t, signals, 99);
  ok('has pulses', pulses.length >= 4);
  ok('has quiet-nightlife or nightlife', pulses.some(p => /nightlife/i.test(p.className)));
  ok('has named-restaurant', pulses.some(p => p.className === 'named-restaurant' && /44th Table/i.test(p.named)));
  ok('has fame-sighting with venue', pulses.some(p => p.className === 'fame-sighting' && p.venue === 'Foothill Builders'));
  ok('never invents venue', !pulses.some(p =>
    /Fake Bar|Unreal Lounge/i.test(p.named || '') ||
    /Fake Bar|Unreal Lounge/i.test(p.venue || '')
  ));
  const quietPulse = pulses.find(p => p.className === 'quiet-nightlife');
  const publicQuiet = JSON.stringify({
    angle: quietPulse && quietPulse.angle,
    hookLine: quietPulse && quietPulse.hookLine,
    sceneBits: quietPulse && quietPulse.sceneBits,
  });
  ok('quiet pulse keeps raw scoring fields out of public copy',
    !/VOLUME|WEATHER IMPACT|1\.03|restricted movement/i.test(publicQuiet));
  ok('quiet pulse uses public prose instead of source scaffolding',
    !/supplied (?:evening )?record/i.test(publicQuiet) && /is open and quiet/i.test(publicQuiet));
  ok('quiet pulse retains machine scoring metadata internally',
    quietPulse && quietPulse.nightlifeMeta && quietPulse.nightlifeMeta.weatherImpact === 1.03);
  const rec = recommendConsumer(pulses);
  ok('recommend has bag', !!(rec && rec.bag));
  const masonPulse = pickPulseForPersona(pulses, 'mason-ortega');
  ok('mason prefers kitchen-ish', masonPulse &&
    ['named-restaurant', 'fast-food', 'food-trend', 'quiet-nightlife'].includes(masonPulse.className));
}

console.log('faith canon-forward boundary:');
{
  const corrected = applyFaithCanonForward('Claire Ashford at Beth Jacob Congregation');
  ok('real faith institution is replaced from the authoritative map',
    corrected === "Claire Ashford at B'nai Tikvah Synagogue");
  const texture = parseEveningTexture(FIXTURE_TEXTURE.replace(
    'Downtown Cultural Festival, KONO Arts District Celebration',
    'Beth Jacob Congregation gathering, KONO Arts District Celebration'));
  const signals = parseCultureSignals({ lanes: { culture: [{
    causeType: 'lifestyle-sighting',
    label: 'sighting | Claire Ashford spotted at Beth Jacob Congregation',
    hood: 'Piedmont Ave'
  }] } });
  const publicBoundary = JSON.stringify({ texture, signals });
  ok('blocked real faith name cannot survive typed evening input',
    !/Beth Jacob Congregation/i.test(publicBoundary));
  ok('canon substitute survives typed evening input',
    /B'nai Tikvah Synagogue/i.test(publicBoundary));
}

console.log('isEveningConsumer:');
ok('mason persona', isEveningConsumer({ persona: 'mason-ortega' }));
ok('kai popid', isEveningConsumer({ popid: 'POP-00158' }));
ok('not p-slayer', !isEveningConsumer({ persona: 'p-slayer' }));

// Live c102 when present
const summaryPath = path.join(__dirname, '..', 'output', 'world_summary_c102.md');
const signalPath = path.join(__dirname, '..', 'output', 'desk_signal_c102.json');

console.log('buildEveningSlice c102 (live artifacts if present):');
if (!fs.existsSync(summaryPath)) {
  console.log('  skip — no world_summary_c102.md');
} else {
  const slice = buildEveningSlice(102);
  ok('not empty on c102', slice && !slice.empty);
  ok('has pulse class', !!(slice.pulse && slice.pulse.className));
  ok('has score', typeof slice.pulse.score === 'number' && slice.pulse.score > 0);
  ok('has approach', typeof slice.approach === 'string' && /Evening-life/i.test(slice.approach));
  ok('has candidates', Array.isArray(slice.candidates) && slice.candidates.length >= 1);
  ok('recommend bag', !!(slice.recommend && slice.recommend.bag));

  const namesBlob = JSON.stringify(slice.texture) + JSON.stringify(slice.candidates);
  ok('names The 44th Table', /The 44th Table/i.test(namesBlob));
  ok('names KONO Cocktails', /KONO Cocktails/i.test(namesBlob));
  ok('Uptown Eats present', /Uptown Eats/i.test(namesBlob));

  const mdOut = formatEveningSliceMarkdown(slice);
  ok('markdown header', /^# SLICE — evening life/m.test(mdOut));
  ok('markdown has TOP PULSE', /## TOP PULSE/.test(mdOut));
  ok('markdown has PREWRITE', /## PREWRITE/.test(mdOut));
  ok('markdown mentions 44th or KONO', /44th Table|KONO Cocktails/i.test(mdOut));

  const a = assignmentFromSlice(slice, 'mason-ortega');
  ok('assignment persona mason', a && a.persona === 'mason-ortega');
  ok('assignment desk culture', a && a.desk === 'culture');
  ok('assignment eveningSlice', a && a.eveningSlice === true);
  ok('assignment story has angle', a && a.story && (a.story.angle || a.story.label));

  const kai = assignmentFromSlice(slice, 'kai-marston');
  ok('kai assignment arts-ish approach', kai && /arts bag|Kai/i.test(kai.approach));

  const live = writeEveningSlice(102, slice);
  ok('wrote md', fs.existsSync(live.md));
  ok('wrote json', fs.existsSync(live.json));

  // signal sightings if present
  if (fs.existsSync(signalPath)) {
    const sig = JSON.parse(fs.readFileSync(signalPath, 'utf8'));
    const parsed = parseCultureSignals(sig);
    ok('culture evening pointer or sightings',
      !!(parsed.eveningPointer || parsed.sightings.length || parsed.fame.length));
  }
}

ok('EVENING_APPROACH exported', typeof EVENING_APPROACH === 'string' && EVENING_APPROACH.length > 40);

if (failures) {
  console.error('\nbuildEveningSlice tests: ' + failures + ' FAILURE(S)');
  process.exit(1);
}
console.log('\nbuildEveningSlice tests: PASS');

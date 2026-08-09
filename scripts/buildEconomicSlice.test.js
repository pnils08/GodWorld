#!/usr/bin/env node
/**
 * buildEconomicSlice tests — offline (grok 2026-08-09 pipeline.52 Task 2).
 */
'use strict';

const fs = require('fs');
const path = require('path');
const {
  buildEconomicSlice,
  formatEconomicSliceMarkdown,
  assignmentFromSlice,
  writeEconomicSlice,
  parseNeighborhoodSnapshot,
  parseTrajectories,
  parseNamedVenuesFromEvening,
  loadBusinessLedger,
  isBusinessDesk,
  ECONOMIC_APPROACH
} = require('./buildEconomicSlice');

let failures = 0;
function ok(label, cond) {
  if (cond) { console.log('  ok — ' + label); return; }
  failures++;
  console.error('  FAIL — ' + label);
}

const FIXTURE = `
# World Summary — Cycle 99

## City State

### Neighborhood snapshot (Neighborhood_Map cycle 99)

| Neighborhood | Sentiment | RetailVitality | EventAttractiveness | CrimeIndex |
|---|---:|---:|---:|---:|
| Fruitvale | +0.11 | 11.35 | 12.47 | 3 |
| West Oakland | +0.08 | 5.50 | 8.24 | 2.98 |
| Downtown | +0.23 | 10.07 | 14.75 | 1.95 |

## What Moved (Ripple_Ledger, cycle 99)

### trajectory (3)
- NEIGHBORHOOD_RISING | Downtown turning upward: retail busy, events drawing crowds, people moving in | Downtown | mag 5 | targets Downtown
- NEIGHBORHOOD_COOLING | West Oakland cooling off: foot traffic down, storefronts quieter than the rest of the city | West Oakland | mag 6 | targets West Oakland
- NEIGHBORHOOD_RISING | Fruitvale turning upward: retail busy | Fruitvale | mag 5 | targets Fruitvale

### initiative-implementation (1)
- retail/sentiment/nightlife | West Oakland Stabilization Fund is disbursement-active — ongoing economic effects in West Oakland | West Oakland | mag 1 | targets West Oakland

## Evening Texture (Riley_Digest cycle 99)

- **Restaurants:** **The 44th Table** (Downtown), **Crisis Coffee Co.** (West Oakland)
- **Nightlife:** **KONO Cocktails** (KONO)

## Engine Review Findings

**math-imbalance** — Downtown: decay [Sentiment -0.250, RetailVitality -1.04, HousingPressure +0.500] with no matching active initiative
`;

console.log('parsers:');
{
  const hoods = parseNeighborhoodSnapshot(FIXTURE);
  ok('hood table', hoods.length >= 3 && hoods.some(h => h.name === 'Fruitvale' && h.retail === 11.35));
  const traj = parseTrajectories(FIXTURE);
  ok('rising + cooling', traj.some(t => t.kind === 'rising' && t.hood === 'Downtown') &&
    traj.some(t => t.kind === 'cooling' && t.hood === 'West Oakland'));
  const ven = parseNamedVenuesFromEvening(FIXTURE);
  ok('evening venues', ven.some(v => v.name === 'The 44th Table' && v.hood === 'Downtown'));
}

console.log('ledger load (live if present):');
{
  const { businesses, sourceFile } = loadBusinessLedger(path.join(__dirname, '..'));
  if (!businesses.length) {
    console.log('  skip — no business ledger on disk');
  } else {
    ok('parsed BIZ rows', businesses.length >= 10);
    ok('has names', businesses.every(b => b.name && b.bizId));
    ok('no invented headcount field when present is number or null',
      businesses.every(b => b.headcount == null || typeof b.headcount === 'number'));
    ok('source file recorded', !!sourceFile);
  }
}

console.log('isBusinessDesk:');
ok('business desk', isBusinessDesk({ desk: 'business', beatDomain: 'GENERAL' }));
ok('not sports', !isBusinessDesk({ desk: 'sports', persona: 'p-slayer' }));

console.log('buildEconomicSlice fixture:');
{
  const slice = buildEconomicSlice(99, {
    summaryMd: FIXTURE,
    signal: {
      lanes: {
        business: [{
          kind: 'anomaly',
          label: 'economic ailment — workforce impact in West Oakland',
          handle: {
            angle: 'economic ailment — economic footprint in West Oakland',
            hookLine: 'Business conditions in West Oakland track the economic picture.',
            citizens: ['Elias Varek (POP-00789)']
          },
          hood: 'West Oakland',
          popids: ['POP-00789']
        }]
      }
    },
    ledger: [
      { bizId: 'BIZ-00094', name: 'West Oakland Stabilization Fund', sector: 'Community Development', hood: 'West Oakland', headcount: 14, headcountSource: 'test' },
      { bizId: 'BIZ-X', name: 'Fake should not appear unless hood matches', sector: 'x', hood: 'Montclair', headcount: 999 }
    ],
    root: path.join(__dirname, '..')
  });
  ok('not empty', slice && !slice.empty);
  ok('has pulse', !!(slice.pulse && slice.pulse.className));
  ok('approach economic', /storefront|Economic/i.test(slice.approach));
  ok('forbidden invent employees', (slice.prewrite.forbidden || []).some(f => /Employee_Count/i.test(f)));
  // named businesses only from sources for matched hoods
  const blob = JSON.stringify(slice);
  ok('Crisis Coffee or Stabilization Fund may appear',
    /Crisis Coffee|Stabilization Fund|44th Table/i.test(blob));
  ok('Montclair Fake ledger row not attached to West Oakland/Downtown pulses',
    !(slice.candidates || []).some(c =>
      /West Oakland|Downtown/i.test(c.hood || c.label || '') &&
      (c.namedBusinesses || []).some(n => /Fake should not appear/i.test(n))
    ) &&
    !(slice.pulse.namedBusinesses || []).some(n => /Fake should not appear/i.test(n)));
  ok('no invented Key_Personnel field', !/"keyPersonnel"|Key_Personnel:\s*[A-Z]/i.test(blob));
}

console.log('buildEconomicSlice c102 live:');
const summaryPath = path.join(__dirname, '..', 'output', 'world_summary_c102.md');
if (!fs.existsSync(summaryPath)) {
  console.log('  skip — no world_summary_c102.md');
} else {
  const slice = buildEconomicSlice(102);
  ok('not empty c102', slice && !slice.empty);
  ok('score > 0', slice.pulse.score > 0);
  ok('has candidates', Array.isArray(slice.candidates) && slice.candidates.length >= 1);
  ok('has approach', /never invent/i.test(slice.approach));
  const md = formatEconomicSliceMarkdown(slice);
  ok('md header', /economic \/ storefront/i.test(md));
  ok('md PREWRITE', /## PREWRITE/.test(md));

  const a = assignmentFromSlice(slice, { name: 'Test Biz', popid: 'POP-TEST', desk: 'business' });
  ok('assignment economicSlice', a && a.economicSlice === true);
  ok('assignment desk business', a && a.desk === 'business');
  ok('assignment story', a && a.story && a.story.angle);

  const live = writeEconomicSlice(102, slice);
  ok('wrote md', fs.existsSync(live.md));
  ok('wrote json', fs.existsSync(live.json));

  // if ledger present, some candidate should carry named businesses for a cooling/rising hood
  if ((slice.texture && slice.texture.ledgerCount) > 0) {
    ok('some named businesses across candidates',
      slice.candidates.some(c => (c.namedBusinesses || []).length > 0) ||
      (slice.pulse.namedBusinesses || []).length > 0);
  }
}

ok('ECONOMIC_APPROACH', typeof ECONOMIC_APPROACH === 'string' && ECONOMIC_APPROACH.length > 40);

if (failures) {
  console.error('\nbuildEconomicSlice tests: ' + failures + ' FAILURE(S)');
  process.exit(1);
}
console.log('\nbuildEconomicSlice tests: PASS');

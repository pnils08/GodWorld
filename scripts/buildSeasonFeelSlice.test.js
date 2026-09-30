'use strict';
const assert = require('assert');
const { parseSeasonFeel } = require('./buildSeasonFeelSlice');

const md = `# World Summary — Cycle 999

**Season:** Winter | **Weather:** 49°F overcast, NW 11 mph, overcast (frontState OVERCAST)
**Calendar context:** Y2C51, Winter, holiday=Christmas | Sports season: off-season

- **Illness rate 10.1%**

## Who Lived It (cycle 999)

### Relationship (1)
- POP-00186 Ray Samson — relied on familiar social circles during cold period (Laurel)

### Health (1)
- POP-00238  — recovered from a winter illness

## Evening Texture

- **Nightlife:** **Nightline Station** (West Oakland). Volume 3, vibe quiet, movement restricted. Weather impact 1.05.
- **City events:** Jack London Holiday Market
`;

const profiles = new Map([
  ['POP-00186', { Name: 'Ray Samson', Neighborhood: 'Laurel', POPID: 'POP-00186' }],
  ['POP-00238', { Name: 'Test Recovered', Neighborhood: 'Temescal', POPID: 'POP-00238' }],
]);
const feel = parseSeasonFeel(md, 999, { profiles });
assert.strictEqual(feel.context.holiday, true, 'Christmas label from the engine.273 world-summary line reads as the holiday');
assert.strictEqual(parseSeasonFeel(md.replace('holiday=Christmas', 'holiday=Holiday'), 999, { profiles }).context.holiday, true, 'pre-wave-1 flag still reads');
assert.strictEqual(parseSeasonFeel(md.replace('holiday=Christmas', 'holiday=none'), 999, { profiles }).context.holiday, false, 'none is not a holiday');
assert.equal(feel.context.season, 'Winter');
assert.ok(!/frontState/.test(feel.context.weather));
assert.ok(feel.moved.some(row => row.popids[0] === 'POP-00186'));
assert.ok(feel.moved.some(row => /Nightline Station/.test(row.text)));
assert.equal(feel.topLived.popids[0], 'POP-00186');
assert.ok(!/^Cycle \d+ opened in winter/i.test(feel.topLived.text));
console.log('buildSeasonFeelSlice.test.js ok');

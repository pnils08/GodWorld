#!/usr/bin/env node
'use strict';

/**
 * engine.131 — the city reads the real sports phase again.
 *
 * Guards the seam S302 lost: Mike's recorded season phase reaches the ~92
 * dial-class branch sites in the engine's own vocabulary, while the invented-
 * atmosphere licence (sportsAtmosphereEnabled) stays OFF on every feed-sourced
 * cycle. Both halves matter — restoring the phase without keeping the licence
 * shut is how C122 comes back.
 *
 * Plan: docs/plans/2026-08-27-sports-coupling-restore.md
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const sourcePath = path.join(
  __dirname,
  '..',
  'phase02-world-state',
  'applySportsSeason.js'
);

const logs = [];
const sandbox = {
  Logger: {
    log(message) {
      logs.push(String(message));
    },
  },
};

vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(sourcePath, 'utf8'), sandbox, {
  filename: sourcePath,
});

const canonical = sandbox.canonicalSportsPhase_;
const deepest = sandbox.deepestSportsPhase_;
const applySportsSeason = sandbox.applySportsSeason_;

// Objects minted inside the VM carry the sandbox's Object.prototype, so
// deepStrictEqual rejects them against host-realm literals even when every key
// and value matches. Re-home them before comparing.
const plain = (o) => Object.assign({}, o);
const byTeam = (entries) => plain(sandbox.deriveSeasonByTeamFromFeed_(entries));

assert.strictEqual(typeof canonical, 'function');
assert.strictEqual(typeof byTeam, 'function');
assert.strictEqual(typeof deepest, 'function');

// ── canonicalization is alias-only ─────────────────────────────────────────
// Every label Mike actually writes must survive the trip. Counts are from the
// live 206-row Oakland_Sports_Feed at C104; if one of these silently became
// "off-season" the sites that branch on it would go dark exactly the way the
// S302 sentinel made them go dark.
const FEED_VOCABULARY_PASSTHROUGH = [
  'off-season',
  'early-season',
  'late-season',
  'spring-training',
  'preseason',
  'mid-season',
  'post-season',
  'regular-season',
  'championship',
  'playoffs',
];
for (const label of FEED_VOCABULARY_PASSTHROUGH) {
  assert.strictEqual(
    canonical(label),
    label,
    `feed label "${label}" must reach downstream branches unchanged`
  );
}

// The only two live feed labels with no downstream reader.
assert.strictEqual(canonical('world-series'), 'championship');
assert.strictEqual(canonical('summer league'), 'preseason');

assert.strictEqual(canonical('  Late-Season  '), 'late-season', 'trim + lowercase');

// Fail CLOSED. An unknown string reaching the ~13 `!== "off-season"` sites
// would read as in-season and quietly turn the whole city on.
assert.strictEqual(canonical('interplanetary-cup'), 'off-season');
assert.strictEqual(canonical(''), 'off-season');
assert.strictEqual(canonical(null), 'off-season');
assert.strictEqual(canonical(undefined), 'off-season');

// ── per-team derivation ────────────────────────────────────────────────────
const c104Entries = [
  { teamsUsed: "A's", seasonType: 'late-season' },
  { teamsUsed: 'Oaks', seasonType: 'preseason' },
];
assert.deepStrictEqual(byTeam(c104Entries), {
  "A's": 'late-season',
  Oaks: 'preseason',
});

// Legacy team aliases still resolve (NBA/Warriors are historical Oaks cells).
assert.deepStrictEqual(
  byTeam([{ teamsUsed: 'NBA legacy label', seasonType: 'playoffs' }]),
  { Oaks: 'playoffs' }
);

// Within one cycle, later rows override earlier ones for the same team —
// established Phase 2 law (docs/OAKLAND_SPORTS_FEED §Current flow).
assert.deepStrictEqual(
  byTeam([
    { teamsUsed: "A's", seasonType: 'late-season' },
    { teamsUsed: "A's", seasonType: 'post-season' },
  ]),
  { "A's": 'post-season' }
);

// Rows with no SeasonType, or an unreadable team, contribute nothing.
assert.deepStrictEqual(byTeam([{ teamsUsed: "A's", seasonType: '' }]), {});
assert.deepStrictEqual(byTeam([]), {});

// ── deepest phase wins the city ────────────────────────────────────────────
// Mike-direct 2026-08-27: the seasons never overlap, and whichever club is
// deeper in its postseason takes the city's attention.
assert.strictEqual(
  deepest({ "A's": 'late-season', Oaks: 'preseason' }),
  'late-season',
  'C104 live shape: the A\'s late-season run sets the city, not Oaks preseason'
);
assert.strictEqual(
  deepest({ "A's": 'spring-training', Oaks: 'championship' }),
  'championship',
  'a club in the finals sets the temperature even if the other is in camp'
);
assert.strictEqual(deepest({ "A's": 'post-season', Oaks: 'playoffs' }), 'post-season');
assert.strictEqual(deepest({}), 'off-season');
assert.strictEqual(deepest({ "A's": 'nonsense' }), 'off-season');

// Depth ordering is total and monotonic — no two adjacent tiers inverted.
const ORDER = [
  'off-season',
  'preseason',
  'early-season',
  'mid-season',
  'late-season',
  'post-season',
  'championship',
];
for (let i = 1; i < ORDER.length; i++) {
  assert.strictEqual(
    deepest({ a: ORDER[i - 1], b: ORDER[i] }),
    ORDER[i],
    `${ORDER[i]} must outrank ${ORDER[i - 1]}`
  );
}

// ── end-to-end through applySportsSeason_ ──────────────────────────────────
function runWithFeed(rows) {
  const ctx = {
    summary: { cycleId: 104 },
    config: {},
    ss: {
      getSheetByName(name) {
        if (name !== 'Oakland_Sports_Feed') return null;
        return {
          getDataRange: () => ({
            getValues: () => [
              ['Cycle', 'SeasonType', 'EventType', 'TeamsUsed'],
              ...rows,
            ],
          }),
        };
      },
    },
  };
  applySportsSeason(ctx);
  return ctx.summary;
}

const live = runWithFeed([
  [104, 'late-season', 'player-feature', "A's"],
  [104, 'preseason', 'game-result', 'Oaks'],
]);

assert.strictEqual(
  live.sportsSeason,
  'late-season',
  'THE REGRESSION THIS FILE EXISTS FOR: a feed-sourced cycle must no longer ' +
    'report the "off-season" sentinel (applySportsSeason.js:77, S302)'
);
assert.deepStrictEqual(plain(live.sportsSeasonByTeam), {
  "A's": 'late-season',
  Oaks: 'preseason',
});
assert.strictEqual(live.sportsSeasonOakland, 'late-season');
assert.strictEqual(live.sportsSource, 'oakland-feed');

// The other half of the seam. The feed is a game log, never a licence to
// invent sports atmosphere — this stays false no matter how deep the run.
assert.strictEqual(
  live.sportsAtmosphereEnabled,
  false,
  'C122 guard: a feed-sourced cycle never licenses invented sports atmosphere'
);
assert.strictEqual(
  runWithFeed([[104, 'championship', 'game-result', "A's"]]).sportsAtmosphereEnabled,
  false,
  'not even in the championship'
);

// Raw feed label still parked for metadata consumers.
assert.strictEqual(live.sportsFeedSeasonType, 'preseason');

// No row for this cycle means no game was played. Quiet is the normal case,
// and here "off-season" masks no recorded fact.
const quiet = runWithFeed([[103, 'championship', 'game-result', "A's"]]);
assert.strictEqual(quiet.sportsSeason, 'off-season');
assert.deepStrictEqual(plain(quiet.sportsSeasonByTeam), {});
assert.strictEqual(quiet.sportsSource, 'oakland-feed-empty');

// Maker override still outranks the feed, and it alone licenses atmosphere.
const overridden = (() => {
  const ctx = { summary: { cycleId: 104 }, config: { sportsState_Oakland: 'championship' }, ss: null };
  applySportsSeason(ctx);
  return ctx.summary;
})();
assert.strictEqual(overridden.sportsSeason, 'championship');
assert.strictEqual(overridden.sportsSource, 'config-override');
assert.strictEqual(overridden.sportsAtmosphereEnabled, true);
assert.deepStrictEqual(plain(overridden.sportsSeasonByTeam), {});

console.log('sportsSeasonPhase.test.js: all assertions passed');

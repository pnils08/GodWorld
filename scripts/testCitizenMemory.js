/**
 * testCitizenMemory.js — offline proving-ground for the bounded-memory core
 * (engine.31 Phase 1). Traces synthetic citizens across ~60 cycles (>1 simYear)
 * with a seeded deterministic rng, then asserts the DF behaviors:
 *   - R is never erased (cores persist across cycles)
 *   - memory stays bounded (<= 2 slots per category)
 *   - reinforced patterns promote to core; one-off events never do
 *   - a sustained transgression pattern locks a dark Outlaw core; one petty act does not
 *
 * Run: node scripts/testCitizenMemory.js
 */

var M = require('../utilities/citizenMemory.js');

// deterministic seeded rng (LCG) — stands in for ctx.rng
function makeRng(seed) {
  var s = seed >>> 0;
  return function () {
    s = (1103515245 * s + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

// run a scripted life: events[cycle] = [ {tag, gist, intensity} ]
function runLife(citizen, script, cycles, seed) {
  var rng = makeRng(seed);
  var state = M.newMemoryState_();
  var trace = [];
  for (var c = 1; c <= cycles; c++) {
    var evs = script(c);
    state = M.mergeCycle_(state, evs, citizen, c, rng);
    if (c % 13 === 0 || c === cycles) {
      trace.push({ cycle: c, profile: M.deriveTraitProfile_(state, c) });
    }
  }
  return { state: state, trace: trace };
}

var results = [];
var failures = [];
function check(name, cond, detail) {
  results.push({ name: name, pass: !!cond, detail: detail });
  if (!cond) failures.push(name + (detail ? ' — ' + detail : ''));
}

function maxSlots(state) {
  var mx = 0;
  for (var i = 0; i < M.CATEGORIES.length; i++) {
    var n = state.slots[M.CATEGORIES[i]].length;
    if (n > mx) mx = n;
  }
  return mx;
}
function hasCore(state, category, tag) {
  var arr = state.slots[category] || [];
  for (var i = 0; i < arr.length; i++) {
    if (arr[i].tier === 'core' && (!tag || arr[i].tag === tag)) return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Citizen A — the Striver: a promotion every ~8 cycles. Work core should lock.
// ---------------------------------------------------------------------------
var striver = { CareerStage: 'Rising', CareerMobility: 3, Age: 34 };
var A = runLife(striver, function (c) {
  if (c % 8 === 0) return [{ tag: 'Promotion', gist: 'made senior' }];
  if (c % 3 === 0) return [{ tag: 'Career', gist: 'good week at work' }];
  return [{ tag: 'Weather', gist: 'foggy morning' }]; // texture — never a slot
}, 60, 101);
check('Striver: bounded <=2/cat', maxSlots(A.state) <= 2, 'max=' + maxSlots(A.state));
check('Striver: Work core locked', hasCore(A.state, 'Work'), A.state.archetype);
check('Striver: archetype is Striver', A.state.archetype === 'Striver', A.state.archetype);

// ---------------------------------------------------------------------------
// Citizen B — the Family-builder: marriage, then recurring births/household.
// ---------------------------------------------------------------------------
var family = { MaritalStatus: 'Married', NumChildren: 2, Age: 31 };
var B = runLife(family, function (c) {
  if (c === 2) return [{ tag: 'Wedding', gist: 'married Tomas' }];
  if (c % 10 === 0) return [{ tag: 'Birth', gist: 'new baby' }];
  if (c % 4 === 0) return [{ tag: 'Household', gist: 'dinner with the kids' }];
  return [];
}, 60, 202);
check('Family: bounded <=2/cat', maxSlots(B.state) <= 2, 'max=' + maxSlots(B.state));
check('Family: Family core locked', hasCore(B.state, 'Family'), B.state.archetype);

// ---------------------------------------------------------------------------
// Citizen C — the Quiet one: almost all texture. No cores, stays Drifter-ish.
// ---------------------------------------------------------------------------
var quiet = { Age: 40 };
var C = runLife(quiet, function (c) {
  if (c % 20 === 0) return [{ tag: 'Neighborhood', gist: 'chatted at the corner store' }];
  return [{ tag: 'Weather', gist: 'rain' }];
}, 60, 303);
check('Quiet: bounded <=2/cat', maxSlots(C.state) <= 2, 'max=' + maxSlots(C.state));
check('Quiet: no cores at all', totalCores(C.state) === 0, 'cores=' + totalCores(C.state));
check('Quiet: not Outlaw', C.state.archetype !== 'Outlaw', C.state.archetype);

// ---------------------------------------------------------------------------
// Citizen D — the slow slide: a transgression every ~7 cycles across a year.
// Dark core should lock -> Outlaw. The "no one is safe" case.
// ---------------------------------------------------------------------------
var sliding = { Age: 27 };
var D = runLife(sliding, function (c) {
  if (c % 7 === 0) return [{ tag: 'Transgression-Serious', gist: 'skimmed the register' }];
  if (c % 5 === 0) return [{ tag: 'Neighborhood', gist: 'around the block' }];
  return [{ tag: 'Weather', gist: 'clear' }];
}, 60, 404);
check('Slide: bounded <=2/cat', maxSlots(D.state) <= 2, 'max=' + maxSlots(D.state));
check('Slide: dark Conduct core locked', hasCore(D.state, 'Conduct'), 'dark=' + D.state.conduct.dark);
check('Slide: archetype is Outlaw', D.state.archetype === 'Outlaw', D.state.archetype);

// ---------------------------------------------------------------------------
// Citizen E — one bad day: a single petty transgression, then nothing.
// Must NOT lock a core. The "no one damned by one roll" guarantee.
// ---------------------------------------------------------------------------
var oneBadDay = { Age: 45 };
var E = runLife(oneBadDay, function (c) {
  if (c === 3) return [{ tag: 'Transgression-Petty', gist: 'took the stapler' }];
  if (c % 6 === 0) return [{ tag: 'Community', gist: 'volunteered' }];
  return [{ tag: 'Weather', gist: 'mild' }];
}, 60, 505);
check('OneBadDay: NOT Outlaw', E.state.archetype !== 'Outlaw', E.state.archetype);
check('OneBadDay: no dark core', !hasCore(E.state, 'Conduct'), 'archetype=' + E.state.archetype);

// ---------------------------------------------------------------------------
// Cross-cutting: R never erased — cores survive a final empty cycle.
// ---------------------------------------------------------------------------
var preArchetype = A.state.archetype;
var rng2 = makeRng(999);
var after = M.mergeCycle_(A.state, [], striver, 61, rng2);
check('Persistence: core survives empty cycle',
  hasCore(after, 'Work') && after.archetype === preArchetype,
  'before=' + preArchetype + ' after=' + after.archetype);

// JSON round-trip
var round = M.parseMemoryState_(M.serializeMemoryState_(A.state));
check('Round-trip: JSON state survives serialize/parse',
  JSON.stringify(round) === JSON.stringify(A.state));

function totalCores(state) {
  var n = 0;
  for (var i = 0; i < M.CATEGORIES.length; i++) n += M.countCores_(state, M.CATEGORIES[i], false);
  return n;
}

// ---------------------------------------------------------------------------
// REPORT
// ---------------------------------------------------------------------------
console.log('\n=== Bounded-memory proving ground (engine.31 Phase 1) ===\n');
function show(label, r) {
  console.log(label + ':');
  for (var i = 0; i < r.trace.length; i++) {
    console.log('  c' + r.trace[i].cycle + '  ' + r.trace[i].profile);
  }
  console.log('');
}
show('A Striver', A);
show('B Family-builder', B);
show('C Quiet', C);
show('D Slow-slide', D);
show('E One-bad-day', E);

console.log('--- assertions ---');
for (var i = 0; i < results.length; i++) {
  console.log((results[i].pass ? '  PASS  ' : '  FAIL  ') + results[i].name
    + (results[i].detail ? '   [' + results[i].detail + ']' : ''));
}
console.log('\n' + (failures.length ? (failures.length + ' FAILURE(S)') : 'ALL PASS')
  + '  (' + (results.length - failures.length) + '/' + results.length + ')\n');
process.exit(failures.length ? 1 : 0);

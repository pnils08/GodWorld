/**
 * neighborhoodPulseMap.test.js — engine.33 Task 2 (plain-node, lib/*.test.js pattern).
 * Run: node utilities/neighborhoodPulseMap.test.js  -> exit 0 on pass.
 */

var m = require('./neighborhoodPulseMap.js');

var failures = 0;
function check(name, cond) {
  if (cond) { console.log('  PASS ' + name); }
  else { failures++; console.error('  FAIL ' + name); }
}

// 1. Every PULSE_MAP key produces bounded, non-empty deltas.
(function () {
  var BOUND = 10;
  var ok = true;
  for (var tag in m.PULSE_MAP) {
    if (!m.PULSE_MAP.hasOwnProperty(tag)) continue;
    var fx = m.pulseForEvent_(tag, [], '');
    var any = false;
    for (var k in fx) {
      if (!fx.hasOwnProperty(k)) continue;
      any = true;
      if (Math.abs(fx[k]) > BOUND) { ok = false; console.error('    unbounded: ' + tag + '.' + k + '=' + fx[k]); }
      if (['sentiment', 'crime', 'vitality', 'attractiveness'].indexOf(k) < 0) { ok = false; console.error('    bad metric key: ' + tag + '.' + k); }
    }
    if (!any) { ok = false; console.error('    empty fx for mapped tag: ' + tag); }
  }
  check('every PULSE_MAP key -> non-empty bounded deltas on the 4 metric keys', ok);
})();

// 2. Transgression severity ordering: Grave > Serious > Petty on crime.
(function () {
  var p = m.pulseForEvent_('Transgression-Petty', [], '').crime;
  var s = m.pulseForEvent_('Transgression-Serious', [], '').crime;
  var g = m.pulseForEvent_('Transgression-Grave', [], '').crime;
  check('transgression severity ordering (Grave ' + g + ' > Serious ' + s + ' > Petty ' + p + ')', g > s && s > p && p > 0);
})();

// 3. Resisted reduces crime.
check('Resisted -> crime < 0', m.pulseForEvent_('Resisted', [], '').crime < 0);

// 4. Unknown tag = no-op (sparse-by-design, opposite of dial map).
(function () {
  var fx = m.pulseForEvent_('Daily', [], 'had a quiet moment at home');
  var any = false;
  for (var k in fx) { if (fx.hasOwnProperty(k)) any = true; }
  check('private-life tag (Daily) -> no pulse', !any);
  var S = {};
  m.recordPulse_(S, 'Temescal', 'Daily', [], 'had a quiet moment at home');
  check('recordPulse_ on non-pulsing event -> S.neighborhoodPulse not created', !S.neighborhoodPulse);
})();

// 5. Empty / missing hood = no-op.
(function () {
  var S = {};
  m.recordPulse_(S, '', 'Wedding', [], '');
  m.recordPulse_(S, null, 'Wedding', [], '');
  m.recordPulse_(S, '   ', 'Wedding', [], '');
  check('empty hood -> no-op', !S.neighborhoodPulse);
})();

// 6. Accumulation across multiple events + events counter.
(function () {
  var S = {};
  m.recordPulse_(S, 'Temescal', 'Wedding', [], '');
  m.recordPulse_(S, 'Temescal', 'Cultural', [], '');
  m.recordPulse_(S, 'Fruitvale', 'Transgression-Serious', [], '');
  var t = S.neighborhoodPulse['Temescal'];
  var f = S.neighborhoodPulse['Fruitvale'];
  check('accumulation: Temescal sentiment>0 attractiveness>0 events=2', t && t.sentiment > 0 && t.attractiveness > 0 && t.events === 2);
  check('isolation: Fruitvale crime>0 sentiment<0 events=1, no cross-bleed', f && f.crime > 0 && f.sentiment < 0 && f.events === 1 && t.crime === 0);
})();

// 7. TAG_RULES marker fires regardless of primary tag (T8 attend).
(function () {
  var fx = m.pulseForEvent_('PrevEvening', ['source:prevEvening', 'evening:cityEventAttend', 'nh:Uptown'], 'joined the crowd');
  check('evening:cityEventAttend marker -> attractiveness>0', (fx.attractiveness || 0) > 0);
})();

// 8. Content rule: business venture prose pulses vitality (no mapped tag needed).
(function () {
  var open = m.pulseForEvent_('Untagged', [], 'started a small catering venture');
  var close = m.pulseForEvent_('Untagged', [], 'the corner shop closed after years');
  check('venture prose -> vitality>0', (open.vitality || 0) > 0);
  check('closure prose -> vitality<0', (close.vitality || 0) < 0);
})();

// 9. Additive stages: mapped tag + marker both contribute.
(function () {
  var solo = m.pulseForEvent_('Cultural', [], '');
  var both = m.pulseForEvent_('Cultural', ['evening:cityEventAttend'], '');
  check('tag + marker additive (attractiveness ' + both.attractiveness + ' > ' + solo.attractiveness + ')', both.attractiveness > solo.attractiveness);
})();

// 10. Faith keys present (Task 10 dependency).
check('Faith + Faith-Crisis mapped, crisis negative',
  m.pulseForEvent_('Faith', [], '').sentiment > 0 && m.pulseForEvent_('Faith-Crisis', [], '').sentiment < 0);

if (failures) { console.error(failures + ' failure(s)'); process.exit(1); }
console.log('neighborhoodPulseMap.test.js: all green');

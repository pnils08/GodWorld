/**
 * pipeline.62 — reporter→domain resolution + the domain-resolution gate.
 *
 * Context: the C104 edition format dropped section headers entirely, so every
 * article resolved to `(unknown)` and fell to the COMMUNITY default — 7
 * articles, one bogus COMMUNITY rating, exit 0. The v2.1 fail-loud gate did not
 * catch it because it guards `articles === 0`, the symptom of the PREVIOUS
 * incident (S196 G-P6), not the cause both share: a format the detector no
 * longer follows.
 *
 * The script is a top-to-bottom CLI (it reads argv and calls process.exit), so
 * these drive it as a subprocess against fixture editions rather than importing.
 *
 * Run: node scripts/rateEditionCoverage.test.js
 *
 * G-PF14 (S409) — the "intermittent under the full suite" was a coin flip in
 * this file, not the suite: fixtures carried `CYCLE 900`, not the real
 * `THE CYCLE PULSE — EDITION 900` header, so cycle detection fell to the
 * rater's path fallback, which only found a digit when mkdtemp's random
 * six-char suffix happened to contain one (~65%). Reproduced 2/5 in
 * isolation. Fixtures now carry the real header; the rater's fallback now
 * reads the basename only.
 */
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const SCRIPT = path.join(__dirname, 'rateEditionCoverage.js');
let pass = 0, fail = 0;
function check(name, cond, detail) {
  if (cond) { pass++; console.log('  ok   ' + name); }
  else { fail++; console.log('  FAIL ' + name + (detail ? ' — ' + detail : '')); }
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'rateedition-'));
function fixture(name, body) {
  const p = path.join(tmp, name);
  fs.writeFileSync(p, body);
  return p;
}

// Runs the rater; returns { code, out }. Never throws on non-zero exit.
function run(file) {
  try {
    const out = execFileSync('node', [SCRIPT, file, '--dry-run'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    return { code: 0, out };
  } catch (e) {
    return { code: e.status, out: (e.stdout || '') + (e.stderr || '') };
  }
}

// Articles must clear the 50-char substantive threshold, and a byline is
// "By <Name>" on its own line.
const body = t => t + ' ' + 'This is body prose that carries the article past the substantive length threshold used by the parser. '.repeat(2);

console.log('reporter -> domain resolution:');

// 1. No section headers anywhere — the C104 shape. Each byline must land on
//    its OWN beat, not collapse into one default bucket.
const headerless = fixture('headerless.txt', [
  'THE CYCLE PULSE — EDITION 900', '',
  '============================================================', '',
  'Late-Season Push', 'By Tanya Cruz', body('The club took the series and the room felt it.'), '',
  '============================================================', '',
  'The Quiet Sighting', 'By Sharon Okafor', body('The congregation gathered before dawn to mark the day.'), '',
  '============================================================', '',
  'Storm Line', 'By Noah Tan', body('The rain arrived early and the corner flooded again.'), '',
].join('\n'));

let r = run(headerless);
check('headerless edition exits 0', r.code === 0, 'exit ' + r.code);
check('all three resolve by reporter beat', /by reporter beat:\s+3/.test(r.out), r.out.slice(-400));
check('none unresolved', /unresolved:\s+0/.test(r.out));
check('sports byline -> SPORTS', /SPORTS: .*Tanya Cruz|SPORTS:/.test(r.out), r.out.slice(-400));
check('faith/culture byline -> CULTURE', /CULTURE:/.test(r.out));
check('weather byline -> ENVIRONMENT', /ENVIRONMENT:/.test(r.out));
check('does NOT collapse everything into COMMUNITY', !/COMMUNITY: /.test(r.out), r.out.slice(-400));

// 2. A title in the byline ("Dr. Lila Mezran") must still match the roster.
const titled = fixture('titled.txt', [
  'THE CYCLE PULSE — EDITION 900', '',
  'Clinic Hours', 'By Dr. Lila Mezran', body('The clinic extended its hours through the month.'), '',
].join('\n'));
r = run(titled);
check('titled byline resolves to its beat (HEALTH)', r.code === 0 && /HEALTH:/.test(r.out), r.out.slice(-300));

console.log('\nsection headers still win (backward compatibility):');

// 3. When a section header IS present it takes precedence over the byline —
//    a sports reporter filed under CIVIC rates CIVIC. Older editions must
//    re-rate exactly as they always did.
const sectioned = fixture('sectioned.txt', [
  'THE CYCLE PULSE — EDITION 900', '',
  'CIVIC', '',
  'Council Vote', 'By Anthony Raines', body('The council took the vote after a long hearing.'), '',
].join('\n'));
r = run(sectioned);
check('section header beats the reporter beat', r.code === 0 && /CIVIC:/.test(r.out) && !/SPORTS:/.test(r.out), r.out.slice(-300));
check('counted as section-resolved', /by section header:\s+1/.test(r.out));

console.log('\ndomain-resolution gate:');

// 4. Articles found but nothing resolvable — the failure the old gate missed.
//    Unknown bylines, no section headers: must FAIL, not emit one COMMUNITY row.
const unresolvable = fixture('unresolvable.txt', [
  'THE CYCLE PULSE — EDITION 900', '',
  'Something Happened', 'By Gwendolyn Fairweather', body('An unknown byline filed copy from somewhere.'), '',
  '============================================================', '',
  'Another Thing', 'By Bartholomew Quist', body('A second unknown byline filed more copy.'), '',
].join('\n'));
r = run(unresolvable);
check('unresolvable edition FAILS (does not write a bogus rating)', r.code === 2, 'exit ' + r.code);
check('failure names the resolution problem', /0 resolved to a domain/.test(r.out), r.out.slice(-300));
check('failure lists the bylines it could not place', /Gwendolyn Fairweather/.test(r.out));

// 5. The pre-existing zero-article gate must still fire.
const empty = fixture('empty.txt', 'THE CYCLE PULSE — EDITION 900\n\nNo bylines here at all.\n');
r = run(empty);
check('zero-article gate still fires', r.code === 2 && /found 0 articles/.test(r.out), 'exit ' + r.code);

// 6. Partial resolution is NOT a failure — one good byline carries the run,
//    and the unresolved one is reported rather than silently bucketed.
const mixed = fixture('mixed.txt', [
  'THE CYCLE PULSE — EDITION 900', '',
  'Late Push', 'By Tanya Cruz', body('The club took the series in front of a full house.'), '',
  '============================================================', '',
  'Stray Copy', 'By Gwendolyn Fairweather', body('An unknown byline filed alongside a known one.'), '',
].join('\n'));
r = run(mixed);
check('partial resolution still runs', r.code === 0, 'exit ' + r.code);
check('unresolved article is reported, not hidden', /unresolved:\s+1/.test(r.out) && /Gwendolyn Fairweather/.test(r.out), r.out.slice(-400));

fs.rmSync(tmp, { recursive: true, force: true });
console.log('\n' + pass + '/' + (pass + fail) + ' passed');
process.exit(fail ? 1 : 0);

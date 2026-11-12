'use strict';
// civic.46 Task A1 (freeze half) — the frozen C113 civic evidence stays what it
// was, and it still shows the gaps the autonomy plan is built on. Hashes guard
// the copies; the fact checks guard the reading. No model call, no Sheet read.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const F = path.join(__dirname, '__fixtures__', 'civic', 'c113-autonomy-baseline');
const manifest = JSON.parse(fs.readFileSync(path.join(F, 'manifest.json'), 'utf8'));
const read = f => fs.readFileSync(path.join(F, f));
const json = f => JSON.parse(read(f).toString('utf8'));
const sha = buf => crypto.createHash('sha256').update(buf).digest('hex');

let failed = 0;
function check(name, cond, detail) {
  if (cond) console.log('  ok  ' + name);
  else { failed++; console.error('  FAIL ' + name + (detail ? ': ' + detail : '')); }
}

// 1. every fixture file matches its recorded hash
for (const [f, rec] of Object.entries(manifest.files)) {
  const buf = read(f);
  check('hash ' + f, sha(buf) === rec.sha256 && buf.length === rec.bytes, 'fixture changed since the freeze');
}
check('manifest names the cycle', manifest.canonCycle === 113);

// 2. F3 / F10 — D2: the answer stood, the proposal fell as a second move
const d2 = json('civic-office-council-d2_2026-10-28.json');
check('D2 accepted exactly one move, an answer', d2.moves.length === 1 && d2.moves[0].type === 'answer');
check('D2 proposal rejected as second consequential move',
  d2.movesRejected.some(m => m.type === 'propose' && /second-consequential-move/.test(m.reason)));
check('D2 numberMoved is not a count of executed actions', String(d2.numberMoved) === '2' && d2.moves.length === 1);

// 3. F1 — D9: healthy district, no board, no turn
const d9 = json('COUNCIL-D9_c113.json');
const d9w = json('civic-office-council-d9_2026-10-29.json');
check('D9 pack is empty', d9.empty === true);
check('D9 pack says no due action', (d9.prewrite.missing || []).some(s => /no due action/.test(s)));
check('D9 wake made no move', Array.isArray(d9w.moves) && d9w.moves.length === 0);

// 4. F5 — mayor: all board IDs survive, the board text does not
const mayor = json('MAYOR-01_c113.json');
const g = mayor.game || {};
const idsInText = new Set((g.boardText || '').match(/INIT-\d+/g) || []);
check('mayor board carries 12 IDs', Array.isArray(g.boardIds) && g.boardIds.length === 12);
check('mayor board text is clipped under 600', (g.boardText || '').length <= 600);
check('mayor board text drops rows whose IDs remain valid targets',
  g.boardIds.some(id => !idsInText.has(id)), 'every ID is in the text — clipping did not bite');

// 5. F4 / F10 — mayor wake: an answer that says an event is scheduled, and nothing else
const mw = json('civic-office-mayor_2026-10-26.json');
check('mayor wake accepted an answer only', mw.moves.length === 1 && mw.moves[0].type === 'answer');
check('mayor answer claims an event is scheduled', /scheduled/i.test(mw.moves[0].payload.text));

// 6. F9 — D2 Sunday hearing: a YES with no tracker write
const hearing = json('council_d2_c113.json');
const hearingText = JSON.stringify(hearing);
check('D2 hearing says YES on INIT-008', /INIT-008/.test(hearingText) && /\bYES\b/.test(hearingText));

// 7. F11 — the parade is a C111 note, Downtown, carried in the C113 summary
const parade = read('parade-c111-from-world-summary-c113.md').toString('utf8');
check('parade note is filed under C111', /^### C111/m.test(parade));
check('parade note names Downtown', /Downtown/.test(parade));
check('parade note is a sports editorial note', /editorial-note/.test(parade));

// 8. close applied, fold folded
const close = json('close_c113.json');
const fold = json('fold_c113.json');
check('C113 close applied', JSON.stringify(close).includes('"applied":true') || close.applied === true);
const workIds = Object.values(fold.work || {}).reduce((n, a) => n + a.length, 0);
check('C113 fold folded five work records and one proposal', workIds === 5 && (fold.candidates || []).length === 1,
  'work=' + workIds + ' candidates=' + (fold.candidates || []).length);
check('C113 fold is of the C112 move week', fold.cycle === 113 && fold.moveCycle === 112);

if (failed) { console.error(failed + ' check(s) failed'); process.exit(1); }
console.log('civicAutonomyBaseline: all checks pass');

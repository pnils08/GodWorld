// scripts/cronDeskGaps.test.js — pipeline.89 "what the writers couldn't find":
// the detector lifts absence sentences and empty tool calls into the cycle's
// production log under its own header; the wire reader never sees them.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { absenceLines, thinToolCalls, formatGapsEntry, appendGapsEntry, GAPS_HEADER } = require('./cron-desk-run');

// Sentences the C113 pieces actually printed (2026-10-27) — every one must lift.
const positives = [
  "If there is, the tracker doesn't show it.",
  "It means the registry doesn't hold one, so I can't describe one.",
  "The record does not say yet what came next for her.",
  "The number in it is hers too, and the ledger does not carry it.",
  "The records searched do not say how the trend field is calculated.",
  "What the sheet does not say is whether that is a spike or a new baseline.",
  "I looked for a statement from the office and found nothing on the record.",
  "The paper has never printed her name before this cycle.",
];
// Sentences that assert presence, or ordinary prose — none may lift.
const negatives = [
  "The record shows Kerkering was already on those blocks before the move.",
  "The tracker lists the vote as passed in Cycle 83 with a review set for Cycle 115.",
  "Patricia Nolan stands where she has stood for thirty years, across from the school building.",
  "Eastlake's clearance rate is 22 percent, the same as Fruitvale's.",
  "She did not say whether she would run again.",   // a person declining, not a record gap
  "Okafor still can't get her blood pressure checked without taking two buses.",   // a person's inability
  "'I mean, we talk about it, but not in numbers like that,' she says.",
  "So Eastlake is not the slowest neighborhood, and its clearance is not uniquely low on the table.",
  "A 14-homer spike in 164 at-bats is the kind of number that does not necessarily hold when the sample doubles.",
];
const draft = '# A headline that does not say much\n\n' + positives.join(' ') + ' ' + positives[1] + '\n\n' + negatives.join(' ') +
  '\n\n<!-- SELF-SCORE: the record does not say 9/10 -->\n';
const got = absenceLines(draft);
for (const p of positives) assert.ok(got.some(g => g.startsWith(p.slice(0, 40))), 'missed: ' + p);
for (const n of negatives) assert.ok(!got.some(g => g.startsWith(n.slice(0, 40))), 'false positive: ' + n);
assert.ok(!got.some(g => /SELF-SCORE|9\/10/.test(g)), 'footer leaked');
assert.ok(!got.some(g => /headline/.test(g)), 'heading leaked');
assert.strictEqual(absenceLines(draft, 3).length, 3, 'max cap');
assert.strictEqual(got.filter(g => g.startsWith(positives[1].slice(0, 30))).length, 1, 'dedupe');
assert.deepStrictEqual(absenceLines(''), []);

// Tool trace: empty / thin / failed calls lift; a full result does not.
const calls = [
  { tool: 'canon_search', input: { query: 'Eastlake clearance' }, resultChars: 1039, resultHead: '160 file(s) matched on disk for ...' },
  { tool: 'canon_search', input: { query: 'Maren Johns' }, resultChars: 32, resultHead: "No disk hits for 'Maren Johns'." },
  { tool: 'sheet_read', input: { tab: 'Community_Programs', match: 'Lakeshore' }, resultChars: 61, resultHead: 'Program_ID | Name | Founder_POPID | Neighborhood | Type' },
  { tool: 'citizen_lookup', input: { name: 'Nobody Real' }, resultChars: 0, resultHead: '' },
  { tool: 'dossier_read', input: { popid: 'POP-00051' }, resultChars: 4000, resultHead: 'Desmond Morton — ...' },
  { tool: 'canon_search', input: { query: 'x' }, resultChars: 500, resultHead: '(search failed: spawn ENOENT)' },
];
const thin = thinToolCalls(calls);
assert.deepStrictEqual(thin.map(t => t.tool + ':' + t.input), [
  'canon_search:Maren Johns', 'sheet_read:Community_Programs Lakeshore', 'citizen_lookup:Nobody Real', 'canon_search:x']);
assert.deepStrictEqual(thinToolCalls(undefined), []);

// Entry shape + append under its own header; the wire header stays untouched.
assert.strictEqual(formatGapsEntry(113, 'civic', 'Luis Navarro', 'staged', [], []), null);
const entry = formatGapsEntry(113, 'civic', 'Luis Navarro', 'staged', [positives[0]], [thin[0]]);
assert.ok(entry.startsWith('- c113 civic | Luis Navarro (staged)\n  - said: "'), entry);
assert.ok(/\n  - tool: canon_search 'Maren Johns' → No disk hits/.test(entry.replace(/"/g, "'")), entry);

const tmp = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'gaps-')), 'production_log_c999.md');
fs.writeFileSync(tmp, '# Production log — C999\n\n## Newsroom wire (AUTO — cron-desk-run.js)\n- c999 civic | A: "x" (staged)\n');
assert.strictEqual(appendGapsEntry(999, null, tmp), false);
assert.strictEqual(appendGapsEntry(999, entry, tmp), true);
assert.strictEqual(appendGapsEntry(999, formatGapsEntry(999, 'sports', 'B', 'flagged', ['The roster does not list him.'], []), tmp), true);
const log = fs.readFileSync(tmp, 'utf8');
assert.strictEqual(log.split(GAPS_HEADER).length, 2, 'one gaps header');
const wireIdx = log.indexOf('## Newsroom wire'), gapsIdx = log.indexOf(GAPS_HEADER);
assert.ok(wireIdx < gapsIdx, 'gaps section sits after the wire');
assert.ok(log.indexOf('- c999 sports | B (flagged)') < log.indexOf('- c113 civic | Luis Navarro'), 'newest first under the header');
assert.ok(/- c999 civic \| A: "x" \(staged\)\n\n## What/.test(log), 'wire list intact and closed by the gaps header');
fs.rmSync(path.dirname(tmp), { recursive: true, force: true });

console.log('cronDeskGaps: ' + positives.length + ' lifts, ' + negatives.length + ' non-lifts, 4 thin calls, append + ordering ok');

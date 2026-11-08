// C114 notebook swap (builder 2026-11-07: "you can swap the notebook copy"). The printed C114 edition went into the
// permanent NotebookLM notebook at 16:03 (source fcf9410a-…, "The Cycle Pulse — Y3C10") with four of the seven
// Duet-fixed articles in their old text. This builds a corrected copy of the edition (the same old/new pairs as
// 2026-11-07-c114-refile-corrections.js, the four printed pieces only), adds it under the same title, then deletes the
// old source and moves the canon source policy entry to the new id. editions/cycle_pulse_c114.txt stays as printed.
//   node output/engine-sheet/2026-11-07-c114-notebook-swap.js          build + diff only
//   node output/engine-sheet/2026-11-07-c114-notebook-swap.js --apply  add, verify, delete the old, update the policy
const fs = require('fs'), path = require('path');
const ROOT = '/root/GodWorld';
const APPLY = process.argv.includes('--apply');
const OLD_ID = 'fcf9410a-3056-437c-82e6-84b8fd080fa5';
const TITLE = 'The Cycle Pulse — Y3C10';
const SRC = path.join(ROOT, 'editions', 'cycle_pulse_c114.txt');
const OUT = path.join(ROOT, 'output', 'corrections', 'c114', 'cycle_pulse_c114.corrected.txt');
const { nlm } = require(path.join(ROOT, 'scripts', 'notebooklmPush'));
const config = JSON.parse(fs.readFileSync(path.join(ROOT, 'config', 'notebooklm.json'), 'utf8'));

// [old, new, count in the printed edition] — the printed four: P Slayer, Raines, Kai Marston, Maria Keen
const EDITS = [
  ["The A's storming back from 20 down was thrilling, but that final score... it's tough.",
   "The Oaks storming back from 20 down was thrilling, but that final score... it's tough.", 1],
  ['We started 4-1. Now the streak is snapped', 'We started 4-0. Now the streak is snapped and we sit at 4-1', 1],
  ['still ended up exactly here.\n',
   'still ended up exactly here.\n\nTwo nights later the Oaks answered in Toronto, 135-75, then opened their NBA Cup run at home by beating Oklahoma City, 101-95. They close the cycle 6-1, 1-0 in the Cup.\n', 1],
  ['Sorted that way, the four separate into one clear case, one good case with a caveat, one case that leans on a record, and one with a gap in the file.',
   'Sorted that way, the four separate into one clear case, one good case with a caveat, one case that leans on a record, and one with two full seasons that disagree.', 1],
  ["**Gonzalez.** Vladimir Gonzalez's feed line is the most expensive of the four at $2.7M, and it reads .306, 28 home runs and 4.7 WAR. His TrueSource card stops at 2039, when he hit .271 with 14 home runs in 506 at-bats, one home run every 36.1 at-bats. Nothing on the card explains how that became 28 home runs. The 2041 line may be real, but the file offered here does not let it be tested. Of the four, his extension case has the least supporting record.",
   "**Gonzalez.** Vladimir Gonzalez's feed line is the most expensive of the four at $2.7M, and it reads .306, 28 home runs and 4.7 WAR. The roster has that as his 2041 season: 527 at-bats, 161 hits, 76 RBI and 17 steals, one home run every 18.8 at-bats. His TrueSource card stops at 2039, when he hit .271 with 14 home runs in 506 at-bats, one every 36.1. Two full seasons, two very different power rates. The 2041 line is the bigger sample and the better one, but it is one year old, and his case rests on whether the next season repeats it.", 1],
  ['The third is a fuller season-by-season card for Gonzalez from 2040 on, so his .306 can be compared with his 2039 baseline instead of floating above it.',
   "The third is another full season of Gonzalez near 2041's power rate, so it reads as his level rather than a jump over 2039.", 1],
  ["\"I've seen Benji Dillon's name popping up more often around the A's, and it's clear he's gaining traction. To be honest, I'm not super close to him, but you can tell when someone's rising through the ranks. I've been around long enough to recognize the buzz. It's like when I was breaking in – everyone's curious, and you're getting more attention. I think it's great for the team to have fresh talent making waves.\"",
   "\"I've seen Benji Dillon's name popping up more often around the A's. To be honest, I'm not super close to him, but I've been around long enough to recognize the buzz.\"", 1],
  ["Davis hears the buzz as a thing that happened to him once, and he's gentle about it.",
   "Davis knows the buzz when he hears it, and he's gentle about it. Dillon is no newcomer to it either: he's an A's legend a year removed from a top-five Cy Young finish, and he still hasn't said whether he's coming back.", 1],
  ["I've seen him around the clubhouse, he's a talented kid, but I don't know him well enough", "I've seen him around the clubhouse, but I don't know him well enough", 1],
  ["I founded it, but I've been focused on the A's and family stuff lately.", "I founded it, but I've been focused on the Oaks and family stuff lately.", 2]
];

const count = (t, s) => t.split(s).length - 1;
let text = fs.readFileSync(SRC, 'utf8');
for (const [o, n, want] of EDITS) {
  const got = count(text, o);
  if (got !== want) { console.log('STOP: want ' + want + ' got ' + got + ' :: ' + o.slice(0, 80)); process.exit(1); }
  text = text.split(o).join(n);
}
fs.writeFileSync(OUT, text);
console.log('corrected copy: ' + EDITS.length + ' edits applied → ' + path.relative(ROOT, OUT) + ' (' + text.length + ' chars; printed ' + fs.statSync(SRC).size + ' bytes)');
if (!APPLY) { console.log('dry run: nothing sent'); process.exit(0); }

const list = () => { const r = nlm(['source', 'list', config.notebookId, '--json'], { timeoutMs: 180 * 1000 }); if (!r.ok) throw new Error('source list failed: ' + r.out.slice(0, 200)); return r.out; };
if (list().indexOf(OLD_ID) < 0) { console.log('STOP: the old source ' + OLD_ID + ' is not in the notebook'); process.exit(1); }
const add = nlm(['source', 'add', config.notebookId, '--file', OUT, '--title', TITLE, '--wait'], { timeoutMs: 600 * 1000 });
if (!add.ok) { console.log('STOP: source add failed: ' + String(add.out).slice(0, 300)); process.exit(1); }
const m = String(add.out || '').match(/Source ID:\s*(\S+)/);
const NEW_ID = m ? m[1] : null;
if (!NEW_ID) { console.log('STOP: added but no Source ID in the output — old source kept; read the notebook by hand:\n' + add.out.slice(0, 400)); process.exit(1); }
console.log('added ' + NEW_ID);
if (list().indexOf(NEW_ID) < 0) { console.log('STOP: new source not listed — old source kept'); process.exit(1); }
const del = nlm(['source', 'delete', OLD_ID, '--confirm'], { timeoutMs: 300 * 1000 });
if (!del.ok) { console.log('STOP: old source delete failed (both now in the notebook): ' + String(del.out).slice(0, 300)); process.exit(1); }
const after = list();
console.log('old source ' + (after.indexOf(OLD_ID) < 0 ? 'gone' : 'STILL LISTED') + '; new source ' + (after.indexOf(NEW_ID) >= 0 ? 'listed' : 'MISSING'));
// the fail-closed canon source policy: the new id takes the old one's place
const policyPath = path.join(ROOT, 'scripts', 'notebooklmCanonSources.json');
const policy = JSON.parse(fs.readFileSync(policyPath, 'utf8'));
const b = policy.allowedPublishedSourceIds, i = b.indexOf(OLD_ID);
if (i >= 0) b.splice(i, 1, NEW_ID); else b.push(NEW_ID);
policy.decisions = policy.decisions || {};
delete policy.decisions[OLD_ID];
policy.decisions[NEW_ID] = { title: TITLE, classification: 'published',
  reason: 'Published Cycle Pulse edition C114, corrected copy (builder 2026-11-07: the Claude Duet\'s desk-draft fixes to four printed articles, checked on the live sheet); replaces ' + OLD_ID + ', added by the Saturday run.',
  evidence: ['editions/cycle_pulse_c114.txt', 'output/corrections/c114/cycle_pulse_c114.corrected.txt'] };
fs.writeFileSync(policyPath, JSON.stringify(policy, null, 2) + '\n');
fs.writeFileSync(path.join(ROOT, 'output', 'corrections', 'c114', 'notebook-swap.json'), JSON.stringify({ at: new Date().toISOString(), notebookId: config.notebookId, title: TITLE, oldId: OLD_ID, newId: NEW_ID }, null, 1));
console.log('policy: ' + OLD_ID + ' → ' + NEW_ID);

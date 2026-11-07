// C114 desk-draft corrections (builder 2026-11-07, from the Claude Duet's c114-desk-draft-fixes.md, Drive
// 12kKNi0suhTt40Eu7ns3yoXM31F8AIsEw; every claim checked against the live Oakland_Sports_Feed, As_Roster and
// Simulation_Ledger first). The Saturday compile ran at 16:00, before the fixes arrived, and the sweep filed all
// seven pieces into canon with the old text. This re-files corrected copies under the SAME canon customIds (an
// upsert replaces the content, no duplicates). The staged .md files, their Rhea seals and the printed edition
// are not touched; corrected copies are kept in output/corrections/c114/.
//   node output/engine-sheet/2026-11-07-c114-refile-corrections.js            dry run: apply edits in memory, diff, read the live doc
//   node output/engine-sheet/2026-11-07-c114-refile-corrections.js --apply    also upsert, then read each doc back
//   node output/engine-sheet/2026-11-07-c114-refile-corrections.js --replace  PATCH each doc's content to the corrected copy
// --apply was the first run (17:40 CST): a POST under an existing customId APPENDS (Supermemory's incremental
// update), so each doc held the old text then the corrected text. A full replace is PATCH /v3/documents/{id}
// (Supermemory docs, "Replace entire document"); --replace does that. The PATCH lands a moment after its 200, so
// the immediate read-back here can still show the old content; the settled read-back is output/corrections/c114/verify.txt.
require('/root/GodWorld/lib/env');
const fs = require('fs'), path = require('path'), https = require('https');
const sat = require('/root/GodWorld/scripts/cron-saturday-run.js');
const APPLY = process.argv.includes('--apply');
const REPLACE = process.argv.includes('--replace');
const { readerCopy } = require('/root/GodWorld/lib/articleIntake');
const CYCLE = 114;
const OUT = '/root/GodWorld/output/corrections/c114';
const KEY = process.env.SUPERMEMORY_CC_API_KEY;

// [old, new, expected count]; old must appear exactly that many times (every occurrence replaced)
const EDITS = {
  'sports_c114_p-slayer': [
    ["The A's storming back from 20 down was thrilling, but that final score... it's tough.",
     "The Oaks storming back from 20 down was thrilling, but that final score... it's tough.", 1],
    ['We started 4-1. Now the streak is snapped', 'We started 4-0. Now the streak is snapped and we sit at 4-1', 1],
    ['still ended up exactly here.\n',
     'still ended up exactly here.\n\nTwo nights later the Oaks answered in Toronto, 135-75, then opened their NBA Cup run at home by beating Oklahoma City, 101-95. They close the cycle 6-1, 1-0 in the Cup.\n', 1]
  ],
  'sports_c114_simon-leary': [
    ["The record sits there at 5-1 and it doesn't care who's carrying it.", "The record sits there at 6-1 and it doesn't care who's carrying it.", 2],
    ['The Oaks are 5-1, and they have won one straight.', 'The Oaks are 6-1, and they have won two straight.', 1],
    ['Five wins against one loss sits cleanly on the page. One straight win adds another small piece of forward pressure.',
     'Six wins against one loss sits cleanly on the page. Two straight wins add another small piece of forward pressure.', 1],
    // the staged text carries a curly apostrophe here; same sentence otherwise
    ['The Oaks’ 5-1 record establishes a present condition, not a legacy.', 'The Oaks’ 6-1 record establishes a present condition, not a legacy.', 1]
  ],
  'sports_c114_hal-richmond': [
    ["His awards also include an MVP, and the career reference prints it. The year is cut off in the copy I have, so I won't guess at it.",
     'His 2041 season carries the awards too: the MVP, the Hank Aaron Award, the batting title, the home run title and a Silver Slugger.', 1],
    ["Horn's career reference holds one MVP that I can read and cannot date, and a 2041 line that stands next to the other two men's best seasons.",
     "Horn's MVP is the 2041 one, and his 2041 line stands next to the other two men's best seasons.", 1]
  ],
  'sports_c114_elliot-marbury': [
    ['# Vladimir Gonzalez, 506 At-Bats: One Home Run Every 36.1', '# Vladimir Gonzalez, 527 At-Bats: One Home Run Every 18.8', 1],
    ['This memo treats that season as the only one in his record with enough at-bats to carry a rate. It reads the two shorter seasons and one peer against it.',
     'His 2041 season on the A\'s roster is larger: 527 at-bats, 161 hits, 28 home runs, 76 RBI and a .306 average. This memo reads the two full seasons against each other, then the two short ones and one peer against both.', 1],
    ['|---|---|---|---|---|---|---|\n', '|---|---|---|---|---|---|---|\n| 2041 | n/a | 527 | 28 | 18.8 | 8.8 | .306 / n/a / n/a |\n', 1],
    ['**A feed figure the line does not match**\n\nThis cycle\'s off-season feed lists Gonzalez at .306 average, 28 home runs, 4.7 WAR and $2.7M. The dossier\'s 2039 line shows .271 and 14 home runs. The feed does not name the season those figures belong to, and the dossier holds no WAR or salary cell for any of his three seasons. Both cells are blank here. This memo does not reconcile the two sources, and it rests on the dossier\'s lines and the rates already worked from them.',
     '**The 2041 line**\n\nThis cycle\'s off-season feed lists Gonzalez at .306, 28 home runs, 4.7 WAR and $2.7M. The A\'s roster puts those figures on his 2041 season, over 527 at-bats, with 161 hits, 76 RBI, 17 steals and 60 strikeouts. That is one home run every 18.8 at-bats and one strikeout every 8.8, against 36.1 and 6.5 in 2039. The roster holds no walk, on-base or slugging figure for 2041, so those cells stay blank.', 1],
    ['**The claim**\n\nOn the evidence on file, Gonzalez is a roughly one-in-36 at-bat power hitter, with a .335 on-base percentage and a strikeout about every 6.5 at-bats. That is a mid-range profile, and it comes from 506 at-bats. The two earlier seasons total 181 at-bats between them and cannot overturn it.',
     '**The claim**\n\nGonzalez now has two full seasons on file, and they disagree. The 2041 season is the larger and the better one: nearly twice the 2039 power rate, with fewer strikeouts. The 2039 season reads as the floor, not the identity.', 1],
    ['**What would disprove it**\n\nThe next season on his dossier would need to span roughly 500 at-bats to test this. If it shows a home-run rate better than 30.5 at-bats per homer, the 2037 mark, or worse than 60.0, the 2038 mark, then 2039 was variance and not identity. A shorter season would settle nothing. The open question for the Athletics front office is whether it reads 2039 as the real Gonzalez or as a season a larger sample will correct. The record does not say.',
     '**What would disprove it**\n\nThe next full season would need to land near one home run every 18.8 at-bats to show 2041 was his level. A season back near 36.1 would make 2041 the outlier. The open question for the Athletics front office is which of the two full seasons the next one repeats.', 1]
  ],
  'sports_c114_anthony-raines': [
    ['Sorted that way, the four separate into one clear case, one good case with a caveat, one case that leans on a record, and one with a gap in the file.',
     'Sorted that way, the four separate into one clear case, one good case with a caveat, one case that leans on a record, and one with two full seasons that disagree.', 1],
    ["**Gonzalez.** Vladimir Gonzalez's feed line is the most expensive of the four at $2.7M, and it reads .306, 28 home runs and 4.7 WAR. His TrueSource card stops at 2039, when he hit .271 with 14 home runs in 506 at-bats, one home run every 36.1 at-bats. Nothing on the card explains how that became 28 home runs. The 2041 line may be real, but the file offered here does not let it be tested. Of the four, his extension case has the least supporting record.",
     "**Gonzalez.** Vladimir Gonzalez's feed line is the most expensive of the four at $2.7M, and it reads .306, 28 home runs and 4.7 WAR. The roster has that as his 2041 season: 527 at-bats, 161 hits, 76 RBI and 17 steals, one home run every 18.8 at-bats. His TrueSource card stops at 2039, when he hit .271 with 14 home runs in 506 at-bats, one every 36.1. Two full seasons, two very different power rates. The 2041 line is the bigger sample and the better one, but it is one year old, and his case rests on whether the next season repeats it.", 1],
    ['The third is a fuller season-by-season card for Gonzalez from 2040 on, so his .306 can be compared with his 2039 baseline instead of floating above it.',
     "The third is another full season of Gonzalez near 2041's power rate, so it reads as his level rather than a jump over 2039.", 1]
  ],
  'culture_c114_kai-marston': [
    ["\"I've seen Benji Dillon's name popping up more often around the A's, and it's clear he's gaining traction. To be honest, I'm not super close to him, but you can tell when someone's rising through the ranks. I've been around long enough to recognize the buzz. It's like when I was breaking in – everyone's curious, and you're getting more attention. I think it's great for the team to have fresh talent making waves.\"",
     "\"I've seen Benji Dillon's name popping up more often around the A's. To be honest, I'm not super close to him, but I've been around long enough to recognize the buzz.\"", 1],
    ["Davis hears the buzz as a thing that happened to him once, and he's gentle about it.",
     "Davis knows the buzz when he hears it, and he's gentle about it. Dillon is no newcomer to it either: he's an A's legend a year removed from a top-five Cy Young finish, and he still hasn't said whether he's coming back.", 1],
    ["I've seen him around the clubhouse, he's a talented kid, but I don't know him well enough", "I've seen him around the clubhouse, but I don't know him well enough", 1]
  ],
  'culture_c114_maria-keen': [
    ["I founded it, but I've been focused on the A's and family stuff lately.", "I founded it, but I've been focused on the Oaks and family stuff lately.", 2]
  ]
};

function sm(method, p, body) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const headers = { 'Authorization': 'Bearer ' + KEY };
    if (payload) { headers['Content-Type'] = 'application/json'; headers['Content-Length'] = Buffer.byteLength(payload); }
    const req = https.request({ hostname: 'api.supermemory.ai', path: p, method, headers }, res => {
      let d = ''; res.on('data', c => { d += c; });
      res.on('end', () => { let j = null; try { j = JSON.parse(d); } catch (_) {} resolve({ status: res.statusCode, json: j, body: d }); });
    });
    req.on('error', reject); if (payload) req.write(payload); req.end();
  });
}
const count = (t, s) => t.split(s).length - 1;

(async () => {
  if (!KEY) throw new Error('SUPERMEMORY_CC_API_KEY missing');
  const set = sat.loadStagedSet(CYCLE);
  fs.mkdirSync(OUT, { recursive: true });
  const log = [];
  let bad = 0;
  for (const [prefix, edits] of Object.entries(EDITS)) {
    const hits = set.filter(e => e.stem.startsWith(prefix + '_'));
    if (hits.length !== 1) { console.log('STOP ' + prefix + ': ' + hits.length + ' staged entries'); bad++; continue; }
    const e = hits[0];
    let text = e.text, ok = true;
    for (const [o, n, want] of edits) {
      const got = count(text, o);
      if (got !== want) { console.log('MISMATCH ' + prefix + ': want ' + want + ' got ' + got + ' :: ' + o.slice(0, 80)); ok = false; break; }
      text = text.split(o).join(n);
    }
    if (!ok) { bad++; continue; }
    const doc = sat.articleDoc(CYCLE, Object.assign({}, e, { text }));
    fs.writeFileSync(path.join(OUT, e.stem + '.md'), text);
    const before = await sm('GET', '/v3/documents/' + encodeURIComponent(doc.customId));
    const live = before.json && (before.json.content || '');
    const liveIsOld = live ? live.indexOf(edits[0][0].split('\n')[0].slice(0, 60)) >= 0 : null;
    console.log((REPLACE ? 'REPLACE ' : APPLY ? 'APPLY ' : 'DRY   ') + doc.customId + ' | ' + edits.length + ' edits ok | live GET ' + before.status +
      ' holds old text: ' + liveIsOld + ' | tags ' + doc.containerTags.join(','));
    const rec = { stem: e.stem, customId: doc.customId, edits: edits.length, liveBefore: before.status, liveHeldOld: liveIsOld };
    if (REPLACE) {
      const id = before.json && before.json.id;
      if (!id) { console.log('  no live doc id — stop'); bad++; log.push(rec); continue; }
      const want = readerCopy(text);
      const r = await sm('PATCH', '/v3/documents/' + encodeURIComponent(id), { content: want });
      rec.patch = r.status; rec.id = id;
      if (r.status < 200 || r.status >= 300) { console.log('  PATCH FAILED ' + r.status + ' ' + r.body.slice(0, 200)); bad++; log.push(rec); continue; }
      const back = await sm('GET', '/v3/documents/' + encodeURIComponent(doc.customId));
      const got = (back.json && back.json.content) || '';
      const oldGone = edits.every(([o]) => got.indexOf(o) < 0);
      rec.exact = got === want; rec.oldGone = oldGone; rec.len = got.length;
      console.log('  patched ' + r.status + ' | read back: exact ' + rec.exact + ', old lines gone ' + oldGone + ', len ' + got.length + '/' + want.length);
      if (!oldGone) bad++;
      log.push(rec);
      continue;
    }
    if (APPLY) {
      const r = await sm('POST', '/v3/documents', doc);
      rec.post = r.status;
      if (r.status < 200 || r.status >= 300) { console.log('  POST FAILED ' + r.status + ' ' + r.body.slice(0, 200)); bad++; log.push(rec); continue; }
      console.log('  upserted ' + r.status);
    }
    log.push(rec);
  }
  fs.writeFileSync(path.join(OUT, (REPLACE ? 'replace' : APPLY ? 'apply' : 'dry') + '-log.json'), JSON.stringify(log, null, 1));
  console.log((bad ? 'HOLD ' + bad + ' problem(s)' : 'all seven clean') + (APPLY || REPLACE ? '' : ' (dry run)'));
  process.exit(bad ? 1 : 0);
})().catch(e => { console.error('ERR ' + e.message); process.exit(1); });

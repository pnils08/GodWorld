/**
 * mediaRoomIntake.test.js — engine.163: the Citizen_Media_Usage Context (an
 * ops key: the writer-wake packet stem, model id and all) never reaches a
 * citizen's life record verbatim. describeUsageContext_ turns a stem into an
 * in-world sentence and leaves human contexts untouched.
 *
 * Run: node scripts/mediaRoomIntake.test.js
 */
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const sandbox = vm.createContext({ Logger: { log() {} }, SpreadsheetApp: {}, Utilities: {} });
vm.runInContext(fs.readFileSync(path.join(ROOT, 'phase07-evening-media/mediaRoomIntake.js'), 'utf8'), sandbox, { filename: 'mediaRoomIntake.js' });
const describe = sandbox.describeUsageContext_;

let n = 0;
function eq(a, b, msg) { assert.strictEqual(a, b, msg); n++; }

// the three live stem shapes (C105 Citizen_Media_Usage)
eq(describe('sports_c103_anthony-raines_packet-v2_deepseek-deepseek-chat'), 'a Bay Tribune sports desk piece, C103', 'packet-v2 + model id');
eq(describe('sports_c104_anthony-raines_packet-v2_deepseek-deepseek-chat-almanzar-debut'), 'a Bay Tribune sports desk piece, C104', 'featured suffix');
eq(describe('business_c102_jordan-velez_deepseek-deepseek-chat'), 'a Bay Tribune business desk piece, C102', 'near-miss stem without _packet');
eq(describe('civic_c105_trevor-shimizu_packet-v2_anthropic-claude-sonnet-4'), 'a Bay Tribune civic desk piece, C105', 'provider id');
eq(describe('undocked_c105_nia-rook_packet-v2_meta-llama-llama-3-3-70b-instruct'), 'an UNDOCKED show segment, C105', 'undocked is a show, not a desk');

// human contexts pass through unchanged
for (const human of ['47, Lake Merritt, principal of OUASA', 'Gridiron Analytics co-founder', 'business desk reporter',
  'journalist, culture desk, first published byline in education supplemental', 'civic', 'E102 S2: Elliot Abraham: The Architecture of Quiet Leadership', '']) {
  eq(describe(human), human, 'pass-through: ' + human);
}
eq(describe(null), '', 'null → empty');

// no model / provider / filename token survives any stem
for (const stem of ['sports_c103_x_packet-v2_deepseek-deepseek-chat', 'civic_c105_y_packet-v2_meta-llama-llama-3-3-70b-instruct', 'culture_c105_z_packet-v2_anthropic-claude-sonnet-4']) {
  assert.ok(!/deepseek|llama|anthropic|packet|_c\d+_/i.test(describe(stem)), 'leak survived: ' + describe(stem)); n++;
}
// engine.285 (4/6): routing writes ONE block per target, then the Routed marks — and a
// timed-out-but-landed block is rewritten in place under retry, never doubled.
{
  const box = vm.createContext({ Logger: { log() {} }, SpreadsheetApp: {}, Utilities: { sleep() {} } });
  for (const rel of ['phase07-evening-media/mediaRoomIntake.js', 'phase05-citizens/processAdvancementIntake.js', 'utilities/writeIntents.js', 'phase10-persistence/persistenceExecutor.js']) {
    vm.runInContext(fs.readFileSync(path.join(ROOT, rel), 'utf8'), box, { filename: rel });
  }
  box.requireTab_ = (ss, name) => ss.getSheetByName(name);
  const sheet = (rows, opts = {}) => {
    const s = { rows, calls: [], lostAck: !!opts.lostAck,
      getLastRow: () => rows.length,
      getLastColumn: () => Math.max(0, ...rows.map((r) => r.length)),
      getDataRange: () => ({ getValues: () => rows.map((r) => r.slice()) }),
      appendRow: (r) => { s.calls.push('appendRow'); rows.push(r.slice()); },
      getRange: (r, c, nr, nc) => ({
        getValues: () => rows.slice(r - 1, r - 1 + (nr || 1)).map((x) => { const o = []; for (let j = 0; j < (nc || 1); j++) o.push(x[c - 1 + j] === undefined ? '' : x[c - 1 + j]); return o; }),
        setValue: (v) => { s.calls.push('setValue'); (rows[r - 1] = rows[r - 1] || [])[c - 1] = v; },
        setValues: (vals) => {
          s.calls.push('setValues');
          for (let i = 0; i < vals.length; i++) { rows[r - 1 + i] = rows[r - 1 + i] || []; for (let j = 0; j < vals[i].length; j++) rows[r - 1 + i][c - 1 + j] = vals[i][j]; }
          if (s.lostAck) { s.lostAck = false; throw new Error('Service Spreadsheets timed out while accessing document'); }
        }
      }) };
    return s;
  };
  const run = (opts) => {
    const usage = sheet([['Timestamp', 'Cycle', 'CitizenName', 'UsageType', 'Context', 'Reporter', 'Routed'],
      ['C111', 111, 'Vinnie Keane', 'quoted', 'dugout', 'Tanya Cruz', 'Y'],      // already routed
      ['C111', 111, 'Vinnie Keane', 'mentioned', 'farewell', 'Hal Richmond', ''],
      ['C111', 111, 'Briar Soto', 'mentioned', 'electrician', 'Nia Rook', ''],
      ['C111', 111, 'Ora Waiting', 'mentioned', 'corner', 'Maria Keen', ''],      // Generic_Citizens → mark only
      ['C111', 111, 'Neve Newcomer', 'mentioned', 'block party', 'Maria Keen', '']]);
    const adv = sheet([['First', 'Middle', 'Last', 'RoleType', 'Tier', 'ClockMode', 'CIV', 'MED', 'UNI', 'Notes']], { lostAck: opts && opts.lostAck });
    const intake = sheet([['First', 'Last', 'Age', 'Neighborhood', 'RoleType', 'Category', 'Family', 'Notes', 'IntakeStatus', 'Relation']]);
    if (opts && opts.intakeFails) intake.getRange = () => ({ setValues() { throw new Error('Exception: You do not have permission'); } });
    const gc = sheet([['First', 'Last'], ['Ora', 'Waiting']]);
    const tabs = { Citizen_Media_Usage: usage, Advancement_Intake1: adv, Intake: intake, Generic_Citizens: gc };
    const ctx = { ledger: { headers: ['POPID', 'First', 'Last'], rows: [['POP-00001', 'Vinnie', 'Keane'], ['POP-00926', 'Briar', 'Soto']] } };
    let res, err;
    try { res = box.routeCitizenUsageToIntake_(ctx, { getSheetByName: (n) => tabs[n] || null }, 112, {}); } catch (e) { err = e; }
    return { res, err, usage, adv, intake };
  };
  const a = run();
  eq(a.adv.rows.length, 3, 'two existing citizens land on Advancement_Intake1');
  eq(a.adv.calls.join(), 'setValues', 'as ONE block write (was an appendRow each)');
  eq(a.intake.rows.length, 2, 'the newcomer lands on Intake');
  eq(a.intake.calls.join(), 'setValues', 'Intake: one block write');
  eq(a.usage.rows.slice(1).map((r) => r[6]).join(), 'Y,Y,Y,Y,Y', 'every landed row (and the GC mark-only row) is marked Routed');
  eq(a.usage.calls.join(), 'setValues,setValues', 'marks per target group: Advancement + GC rows (one run), then Intake');
  eq([a.res.routed, a.res.existingCitizens, a.res.newCitizens, a.res.gcSkipped].join(), '4,2,1,1', 'counters');
  eq(/^Media usage C112 \(mentioned\): farewell$/.test(a.adv.rows[1][9]), true, 'notes unchanged');
  const b = run({ lostAck: true });
  eq(b.adv.rows.length, 3, 'lost acknowledgement on the block: rewritten in place under retry, not doubled');
  eq(b.adv.calls.join(), 'setValues,setValues', 'the retry rewrote the same rows');
  // Intake's block fails outright: the Advancement rows that landed are already marked
  const c = run({ intakeFails: true });
  eq(!!c.err && c.usage.rows.slice(1).map((r) => r[6]).join(), 'Y,Y,Y,Y,', 'a failed Intake block leaves only the newcomer unmarked');

  // the two intake readers (dormant since E89, engine.285): output first, then the processed mark —
  // a kill on the output leaves the intake rows unmarked for the next run (was: marked, output lost)
  const killed = () => ({ rows: [], getLastRow: () => 1, getLastColumn: () => 13, appendRow() { throw new Error('killed'); },
    getRange: () => ({ getValues: () => [['Timestamp', 'Cycle', 'CitizenName', 'UsageType', 'Context', 'Reporter', 'Season', 'Holiday', 'HolidayPriority', 'IsFirstFriday', 'IsCreationDay', 'SportsSeason', 'Source']],
      setValue() {}, setValues() { throw new Error('killed'); } }) });
  const cui = sheet([['CitizenName', 'UsageType', 'Context', 'Reporter', 'Status'], ['Vinnie Keane', 'mentioned', 'x', 'Hal Richmond', ''], ['Briar Soto', 'quoted', 'y', 'Nia Rook', '']]);
  let threw = false;
  try { box.processCitizenUsageIntake_({ getSheetByName: (n) => n === 'Citizen_Usage_Intake' ? cui : n === 'Citizen_Media_Usage' ? killed() : null }, 112, {}); } catch (e) { threw = true; }
  eq(threw && cui.rows.slice(1).every((r) => r[4] === ''), true, 'usage intake: a kill on the Citizen_Media_Usage write leaves both rows unprocessed');
  const cmu = sheet([['Timestamp']]);
  box.processCitizenUsageIntake_({ getSheetByName: (n) => n === 'Citizen_Usage_Intake' ? cui : n === 'Citizen_Media_Usage' ? cmu : null }, 112, {});
  eq(cmu.rows.length === 3 && cui.rows.slice(1).every((r) => r[4] === 'processed') && cui.calls.filter((x) => x === 'setValues').length === 1, true, 'the re-run lands both, then marks them in one run');
  // engine.312 R2.1(a): the media-room copy has no print check — every row it lands names its source, so it scores no fame
  eq(cmu.rows[0][12] === 'Source' && cmu.rows.slice(1).every((r) => r.length === 13 && r[12] === 'media-room' && r[2] !== ''), true, 'engine.312: the Source header self-arms after the 12 written columns and each landed row reads media-room');
  eq(cmu.calls.filter((x) => x === 'setValues').length, 1, 'engine.312: still one block write for the batch');
  // engine.318: the intake reads and marks its columns by header name. Live carries
  // CitizenName, POPID, UsageType, Context, Reporter, Status — the positional read took the
  // POPID (a blank one → 'mentioned') for the type and marked Reporter processed.
  const liveCui = () => sheet([['CitizenName', 'POPID', 'UsageType', 'Context', 'Reporter', 'Status'],
    ['Vinnie Keane', 'POP-00001', 'quoted', 'dugout', 'Tanya Cruz', ''],
    ['Briar Soto', '', 'mentioned', 'electrician', 'Nia Rook', ''],
    ['Ora Waiting', '', 'mentioned', 'corner', 'Maria Keen', 'processed']]);
  const lc = liveCui(), lcmu = sheet([['Timestamp']]);
  eq(box.processCitizenUsageIntake_({ getSheetByName: (n) => n === 'Citizen_Usage_Intake' ? lc : n === 'Citizen_Media_Usage' ? lcmu : null }, 112, {}), 2, 'engine.318: two pending rows under the live header');
  eq(lcmu.rows.slice(1).map((r) => r.slice(2, 6).join('|')).join(), 'Vinnie Keane|quoted|dugout|Tanya Cruz,Briar Soto|mentioned|electrician|Nia Rook', 'engine.318: type / context / reporter from their own columns (was POPID / blank → mentioned, shifted)');
  eq(lc.rows.slice(1).map((r) => r[5]).join(), 'processed,processed,processed', 'engine.318: the mark lands in Status');
  eq(lc.rows.slice(1).map((r) => r[4]).join(), 'Tanya Cruz,Nia Rook,Maria Keen', 'engine.318: Reporter untouched');
  // the 105 live rows the old reader marked in Reporter only: by name they read pending (the data step marks them first)
  const legacy = sheet([['CitizenName', 'POPID', 'UsageType', 'Context', 'Reporter', 'Status'], ['Briar Soto', '', 'letter_writer', 'E89 Letters', 'processed', '']]);
  const lgmu = sheet([['Timestamp']]);
  eq(box.processCitizenUsageIntake_({ getSheetByName: (n) => n === 'Citizen_Usage_Intake' ? legacy : n === 'Citizen_Media_Usage' ? lgmu : null }, 112, {}), 1, 'engine.318: a Reporter cell reading processed is not the mark — Status alone decides');
  const noStatus = sheet([['CitizenName', 'POPID', 'UsageType', 'Context', 'Reporter'], ['Vinnie Keane', '', 'quoted', 'dugout', '']]);
  const nsmu = sheet([['Timestamp']]);
  threw = false;
  try { box.processCitizenUsageIntake_({ getSheetByName: (n) => n === 'Citizen_Usage_Intake' ? noStatus : n === 'Citizen_Media_Usage' ? nsmu : null }, 112, {}); } catch (e) { threw = /Status/.test(e.message); }
  eq(threw && nsmu.rows.length === 1 && noStatus.calls.length === 0 && nsmu.calls.length === 0, true, 'engine.318: a missing Status column throws before any write');
  // the writer (manual paste path) lays its rows by header name too: POPID blank, the round trip reads true
  const pbox = vm.createContext({ Logger: { log() {} }, SpreadsheetApp: {}, Utilities: {} });
  for (const rel of ['phase07-evening-media/mediaRoomIntake.js', 'phase07-evening-media/parseMediaRoomMarkdown.js']) {
    vm.runInContext(fs.readFileSync(path.join(ROOT, rel), 'utf8'), pbox, { filename: rel });
  }
  const pasted = sheet([['CitizenName', 'POPID', 'UsageType', 'Context', 'Reporter', 'Status']]);
  eq(pbox.parseCitizenUsage_({ getSheetByName: (n) => n === 'Citizen_Usage_Intake' ? pasted : null }, 'CITIZENS\n— Briar Soto (electrician)\n— Ora Waiting'), 2, 'engine.318: the parser lands two rows');
  eq(JSON.stringify(pasted.rows.slice(1)), JSON.stringify([['Briar Soto', '', 'mentioned', 'electrician', '', ''], ['Ora Waiting', '', 'mentioned', 'CITIZEN', '', '']]), 'engine.318: written under their own headers, POPID and Status blank (was: the type under POPID)');
  const rtmu = sheet([['Timestamp']]);
  box.processCitizenUsageIntake_({ getSheetByName: (n) => n === 'Citizen_Usage_Intake' ? pasted : n === 'Citizen_Media_Usage' ? rtmu : null }, 112, {});
  eq(rtmu.rows.slice(1).map((r) => r.slice(2, 5).join('|')).join(), 'Briar Soto|mentioned|electrician,Ora Waiting|mentioned|CITIZEN', 'engine.318: written by the parser, read back true by the intake');
  const fresh = sheet([['CitizenName', 'UsageType', 'Context', 'Reporter', 'Status']]);
  pbox.parseCitizenUsage_({ getSheetByName: (n) => n === 'Citizen_Usage_Intake' ? fresh : null }, '— Briar Soto (electrician)');
  eq(JSON.stringify(fresh.rows[1]), JSON.stringify(['Briar Soto', 'mentioned', 'electrician', '', '']), 'engine.318: the five-column fresh header still takes the row by name');
  // codex engine.318 §1: a shuffled header, so a reader or writer hardcoded for the five / six-column layouts cannot pass
  const shuffled = sheet([['Status', 'Reporter', 'Context', 'POPID', 'UsageType', 'CitizenName'], ['', 'Nia Rook', 'electrician', '', 'quoted', 'Briar Soto'], ['processed', 'Tanya Cruz', 'dugout', 'POP-00001', 'quoted', 'Vinnie Keane']]);
  const shmu = sheet([['Timestamp']]);
  eq(box.processCitizenUsageIntake_({ getSheetByName: (n) => n === 'Citizen_Usage_Intake' ? shuffled : n === 'Citizen_Media_Usage' ? shmu : null }, 112, {}), 1, 'engine.318: shuffled header — only the Status-blank row is pending');
  eq(shmu.rows.slice(1).map((r) => r.slice(2, 6).join('|')).join() + ' / ' + shuffled.rows.slice(1).map((r) => r[0] + ':' + r[1]).join(), 'Briar Soto|quoted|electrician|Nia Rook / processed:Nia Rook,processed:Tanya Cruz', 'engine.318: shuffled header — fields from their own columns, the mark in Status, Reporter untouched');
  pbox.parseCitizenUsage_({ getSheetByName: (n) => n === 'Citizen_Usage_Intake' ? shuffled : null }, '— Ora Waiting (corner)');
  eq(JSON.stringify(shuffled.rows[3]), JSON.stringify(['', '', 'corner', '', 'mentioned', 'Ora Waiting']), 'engine.318: shuffled header — the parser lays each value under its own name');
  const noType = sheet([['CitizenName', 'POPID', 'Context', 'Reporter', 'Status']]);
  threw = false;
  try { pbox.parseCitizenUsage_({ getSheetByName: (n) => n === 'Citizen_Usage_Intake' ? noType : null }, '— Briar Soto (electrician)'); } catch (e) { threw = /UsageType/.test(e.message); }
  eq(threw && noType.rows.length === 1, true, 'engine.318: the parser throws on a missing UsageType column, nothing written');
  const mi = sheet([['Reporter', 'StoryType', 'SignalSource', 'Headline', 'ArticleText', 'CulturalMentions', 'Status'], ['Kai Marston', 'arts', 'edition', 'h', '', 'Oakland Ballet', '']]);
  threw = false;
  try { box.processArticleIntake_({ getSheetByName: (n) => n === 'Media_Intake' ? mi : n === 'Media_Ledger' ? killed() : null }, 112, {}); } catch (e) { threw = true; }
  eq(threw && mi.rows[1][6], '', 'article intake: a kill on the Media_Ledger mention leaves the article unprocessed');
}
console.log('mediaRoomIntake.test.js: ' + n + '/' + n + ' passed');

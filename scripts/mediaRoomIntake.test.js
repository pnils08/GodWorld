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
console.log('mediaRoomIntake.test.js: ' + n + '/' + n + ' passed');

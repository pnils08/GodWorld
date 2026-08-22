'use strict';

/**
 * extractSpoken — the C103/C104 PRESS envelope leak.
 *
 * In evidence mode a citizen is told to return ONLY the CITIZEN_INTERVIEW JSON, so
 * the generation is an envelope. citizenVoice.js's record path stored that envelope
 * verbatim: page doc, affect classifier, and Reflection_Intake all got the fence
 * instead of the sentence. Measured on the live sheet 2026-08-22 — 177 of 401 PRESS
 * rows, 124 of them already drained into dials (Applied=yes) before it was caught.
 *
 * The fixtures below are the real leaked excerpts off Reflection_Intake, restored to
 * full envelopes (the sheet only keeps slice(0,180), so the tail is reconstructed in
 * the verified schema shape).
 */

const assert = require('assert');
const { extractSpoken } = require('./newsroomInterviewContract');

// --- the leak, as it actually arrived --------------------------------------

{
  // POP-00170, C103. Fenced, pretty-printed, real newline-collapsed spacing.
  const envelope = '```json {   "answer": "quote",   "quote": "Winter\'s always tough on the starter'
    + '—keeps it sluggish. Makes my mornings longer, but that\'s the job.",   "fact_ids": ["F-b0e302e4edcf"],'
    + '   "basis": "lived-context",   "unverifiedLead": [],   "abstain_reason": null } ```';
  const got = extractSpoken(envelope);
  assert.strictEqual(got.abstain, false);
  assert.strictEqual(got.spoken,
    "Winter's always tough on the starter—keeps it sluggish. Makes my mornings longer, but that's the job.");
  assert.ok(!got.spoken.includes('```'), 'no fence may survive');
  assert.ok(!got.spoken.includes('"answer"'), 'no envelope key may survive');
}

{
  // Same shape, curly quotes, unfenced bare object.
  const got = extractSpoken('{"answer":"quote","quote":"Winter conditions mean I’ll be bundling up more on my way to work."}');
  assert.strictEqual(got.spoken, 'Winter conditions mean I’ll be bundling up more on my way to work.');
  assert.strictEqual(got.abstain, false);
}

{
  // Leading prose before the object — the model narrating before complying.
  const got = extractSpoken('Sure, here you go:\n```json\n{"answer":"quote","quote":"The block is quieter than it was."}\n```');
  assert.strictEqual(got.spoken, 'The block is quieter than it was.');
}

{
  // Whitespace around the quote is the model's, not the citizen's.
  assert.strictEqual(extractSpoken('{"answer":"quote","quote":"   padded   "}').spoken, 'padded');
}

// --- abstention records NOTHING --------------------------------------------

{
  const got = extractSpoken('{"answer":"abstain","quote":null,"abstain_reason":"no_lived_basis"}');
  assert.strictEqual(got.abstain, true);
  assert.strictEqual(got.spoken, '');
  assert.strictEqual(got.reason, 'no_lived_basis');
}
{
  // Claims a quote, carries none — an abstention in practice, never an empty page doc.
  const got = extractSpoken('{"answer":"quote","quote":null}');
  assert.strictEqual(got.abstain, true);
  assert.strictEqual(got.reason, 'empty_quote');
}
{
  assert.strictEqual(extractSpoken('{"answer":"quote","quote":"   "}').abstain, true);
}
{
  // Case must not decide whether a citizen's day gets recorded.
  assert.strictEqual(extractSpoken('{"answer":"ABSTAIN","quote":null}').abstain, true);
}

// --- plain prose must pass through untouched (the wake path) ---------------

{
  const prose = 'That bench by the water, the one with the chipped paint near the boat dock. '
    + "That's where I go when the kitchen's finally quiet.";
  const got = extractSpoken(prose);
  assert.strictEqual(got.spoken, prose, 'free-prose reflections must not be altered');
  assert.strictEqual(got.abstain, false);
}
{
  // Prose that merely mentions braces or the word answer is still prose.
  const prose = 'I keep turning the answer over: { what if the shop never reopens }';
  assert.strictEqual(extractSpoken(prose).spoken, prose);
}
{
  // A JSON object with no `answer` key is not our envelope — pass through, do not guess.
  const other = '{"mood":"tired","note":"long shift"}';
  assert.strictEqual(extractSpoken(other).spoken, other);
  assert.strictEqual(extractSpoken(other).abstain, false);
}
{
  // "filed:" reporter self-records go through the same path verbatim.
  const filed = 'filed: Grand Lake storefronts cool as retail vitality slips';
  assert.strictEqual(extractSpoken(filed).spoken, filed);
}

// --- degenerate input ------------------------------------------------------

assert.strictEqual(extractSpoken('').spoken, '');
assert.strictEqual(extractSpoken('').abstain, false);
assert.strictEqual(extractSpoken(null).spoken, '');
assert.strictEqual(extractSpoken(undefined).spoken, '');
assert.strictEqual(extractSpoken('```json { not valid json ```').spoken, '```json { not valid json ```',
  'unparseable input passes through rather than vanishing — never silently drop a citizen\'s words');

console.log('newsroomInterviewContract.extract-spoken.test.js — all assertions passed');

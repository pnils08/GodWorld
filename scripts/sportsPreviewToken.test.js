#!/usr/bin/env node
'use strict';

const assert = require('assert');
const {
  createPreviewToken,
  verifyPreviewToken,
} = require('./sportsPreviewToken.js');

const secret = 'synthetic-preview-secret-32-bytes-minimum';
const actor = 'synthetic-builder';
const preview = {
  requestHash: 'synthetic-request-hash',
  row: ['404', 'regular-season', 'game-result'],
};
const issued = createPreviewToken({
  secret,
  actor,
  preview,
  csrfToken: 'synthetic-csrf-token',
  nowMs: 1_000,
});

assert.deepStrictEqual(
  verifyPreviewToken({
    secret,
    actor,
    token: issued.token,
    csrfToken: issued.csrfToken,
    nowMs: 2_000,
  }),
  preview,
  'a new verifier with the same secret must accept a token after restart'
);

assert.throws(
  () => verifyPreviewToken({
    secret,
    actor,
    token: issued.token,
    csrfToken: 'wrong-csrf',
    nowMs: 2_000,
  }),
  (error) => error.code === 'sports_csrf_invalid'
);

assert.throws(
  () => verifyPreviewToken({
    secret,
    actor: 'different-actor',
    token: issued.token,
    csrfToken: issued.csrfToken,
    nowMs: 2_000,
  }),
  (error) => error.code === 'sports_preview_actor_mismatch'
);

assert.throws(
  () => verifyPreviewToken({
    secret,
    actor,
    token: issued.token,
    csrfToken: issued.csrfToken,
    nowMs: 15 * 60 * 1000 + 1_000,
  }),
  (error) => error.code === 'sports_preview_expired'
);

console.log('sportsPreviewToken.test.js: all assertions passed');

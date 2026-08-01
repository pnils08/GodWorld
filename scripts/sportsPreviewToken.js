#!/usr/bin/env node
'use strict';

const crypto = require('crypto');

const PREVIEW_TOKEN_VERSION = 1;
const DEFAULT_PREVIEW_TTL_MS = 15 * 60 * 1000;

class SportsPreviewTokenError extends Error {
  constructor(code, message, status) {
    super(message);
    this.name = 'SportsPreviewTokenError';
    this.code = code;
    this.status = status;
  }
}

function base64url(value) {
  return Buffer.from(value).toString('base64url');
}

function hash(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

function actorHash(actor) {
  const value = String(actor || '').trim();
  if (!value) {
    throw new SportsPreviewTokenError(
      'sports_actor_required',
      'An authenticated dashboard actor is required',
      401
    );
  }
  return hash(value);
}

function assertSecret(secret) {
  if (typeof secret !== 'string' || Buffer.byteLength(secret, 'utf8') < 32) {
    throw new SportsPreviewTokenError(
      'sports_preview_secret_unavailable',
      'Sports preview signing is not configured',
      503
    );
  }
}

function signature(secret, encodedPayload) {
  return crypto
    .createHmac('sha256', secret)
    .update(encodedPayload)
    .digest('base64url');
}

function safeEqual(left, right) {
  const a = Buffer.from(String(left || ''));
  const b = Buffer.from(String(right || ''));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function createPreviewToken(options) {
  const secret = options && options.secret;
  assertSecret(secret);
  const nowMs = Number(options.nowMs);
  const issuedAt = Number.isFinite(nowMs) ? nowMs : Date.now();
  const ttlMs = Number.isFinite(options.ttlMs)
    ? options.ttlMs
    : DEFAULT_PREVIEW_TTL_MS;
  if (ttlMs <= 0 || ttlMs > DEFAULT_PREVIEW_TTL_MS) {
    throw new SportsPreviewTokenError(
      'sports_preview_ttl_invalid',
      'Sports preview lifetime is invalid',
      500
    );
  }

  const csrfToken = options.csrfToken ||
    crypto.randomBytes(24).toString('base64url');
  const payload = {
    version: PREVIEW_TOKEN_VERSION,
    issuedAt,
    expiresAt: issuedAt + ttlMs,
    actorHash: actorHash(options.actor),
    csrfHash: hash(csrfToken),
    preview: options.preview,
  };
  const encodedPayload = base64url(JSON.stringify(payload));
  return {
    token: `${encodedPayload}.${signature(secret, encodedPayload)}`,
    csrfToken,
    expiresAt: new Date(payload.expiresAt).toISOString(),
  };
}

function verifyPreviewToken(options) {
  const secret = options && options.secret;
  assertSecret(secret);
  const token = String(options.token || '');
  const parts = token.split('.');
  if (parts.length !== 2 || !parts[0] || !parts[1] ||
      !safeEqual(parts[1], signature(secret, parts[0]))) {
    throw new SportsPreviewTokenError(
      'sports_preview_invalid',
      'The sports preview token is invalid',
      400
    );
  }

  let payload;
  try {
    payload = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
  } catch {
    throw new SportsPreviewTokenError(
      'sports_preview_invalid',
      'The sports preview token is unreadable',
      400
    );
  }
  if (!payload || payload.version !== PREVIEW_TOKEN_VERSION ||
      !payload.preview || !Number.isFinite(payload.expiresAt)) {
    throw new SportsPreviewTokenError(
      'sports_preview_invalid',
      'The sports preview token has an invalid shape',
      400
    );
  }

  const nowMs = Number(options.nowMs);
  const checkedAt = Number.isFinite(nowMs) ? nowMs : Date.now();
  if (checkedAt >= payload.expiresAt) {
    throw new SportsPreviewTokenError(
      'sports_preview_expired',
      'This sports preview expired; build a fresh preview before appending',
      410
    );
  }
  if (payload.actorHash !== actorHash(options.actor)) {
    throw new SportsPreviewTokenError(
      'sports_preview_actor_mismatch',
      'This sports preview belongs to a different dashboard actor',
      403
    );
  }
  if (!safeEqual(payload.csrfHash, hash(options.csrfToken || ''))) {
    throw new SportsPreviewTokenError(
      'sports_csrf_invalid',
      'The sports confirmation token is invalid',
      403
    );
  }
  return payload.preview;
}

module.exports = {
  DEFAULT_PREVIEW_TTL_MS,
  SportsPreviewTokenError,
  actorHash,
  createPreviewToken,
  hash,
  safeEqual,
  verifyPreviewToken,
};

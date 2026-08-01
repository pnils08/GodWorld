const CONTRACT_VERSION = 1;

export class SportsApiError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = 'SportsApiError';
    this.status = details.status || 0;
    this.code = details.code || 'sports_request_failed';
    this.retryable = Boolean(details.retryable);
  }
}

async function requestEnvelope(path, options) {
  let response;
  try {
    response = await fetch(path, options);
  } catch {
    throw new SportsApiError('The sports desk could not reach the dashboard service.', {
      code: 'sports_network_error',
      retryable: true,
    });
  }

  let body;
  try {
    body = await response.json();
  } catch {
    throw new SportsApiError('The sports desk received an unreadable response.', {
      status: response.status,
      code: 'sports_invalid_response',
      retryable: response.status >= 500,
    });
  }

  if (body?.contractVersion !== CONTRACT_VERSION) {
    throw new SportsApiError('The sports desk and API contract versions do not match.', {
      status: response.status,
      code: 'sports_contract_mismatch',
    });
  }
  if (!response.ok || body.error) {
    throw new SportsApiError(
      body?.error?.message || 'The Oakland sports workspace could not load.',
      {
        status: response.status,
        code: body?.error?.code,
        retryable: body?.error?.retryable,
      },
    );
  }
  return body;
}

function query(path, values) {
  const params = new URLSearchParams();
  Object.entries(values || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value));
  });
  const suffix = params.toString();
  return suffix ? `${path}?${suffix}` : path;
}

export function getSportsOverview(cycle) {
  return requestEnvelope(query('/api/sports/overview', { cycle }));
}

export function getSportsWorkspace(cycle, team) {
  return requestEnvelope(query('/api/sports/workspace', { cycle, team }));
}

export function getSportsNotebook(limit = 3) {
  return requestEnvelope(query('/api/sports/notebook', { limit }));
}

export function previewSportsEntry(draft, provenance) {
  return requestEnvelope('/api/sports/preview', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ draft, provenance }),
  });
}

export function createSportsIdempotencyKey() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('');
}

export function confirmSportsEntry({
  previewToken,
  csrfToken,
  capability,
  idempotencyKey,
  confirmation,
}) {
  return requestEnvelope('/api/sports/entries', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-GW-CSRF': csrfToken,
      'X-Sports-Write-Capability': capability,
      'Idempotency-Key': idempotencyKey,
    },
    body: JSON.stringify({ previewToken, confirmation }),
  });
}

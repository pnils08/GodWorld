/**
 * Shared Supermemory search transport — engine.92 consolidation (S349).
 *
 * One HTTPS client behind the 12 per-file searchSupermemory copies the S349
 * caller-map audit found (docs/SEARCH_FUNCTIONS.md §Consolidation queue).
 * Supports both live API shapes so every repoint is a zero-behavior-change
 * delegate:
 *   - containerTags (array)    → POST /v3/search  (mags.js / bot / archive-context lineage)
 *   - containerTag  (singular) → POST /v4/search with searchMode (card-builder lineage)
 *
 * Fail-soft by design: network error, timeout, bad JSON, or missing API key
 * all resolve to [] — no copy of this function has ever thrown to its caller,
 * and consumers (bot tool-loop, cron reflections, card-builder dedup) depend
 * on that.
 *
 * Callers keep their own result-shaping (text-joining, filtering); this module
 * owns transport only.
 */

const https = require('https');

const API_HOST = 'api.supermemory.ai';

/**
 * Search Supermemory. Returns the parsed results array, or [] on any failure.
 *
 * @param {string} query
 * @param {Object} opts
 * @param {Array<string>} [opts.containerTags] - v3 shape (array). Wins if both given.
 * @param {string} [opts.containerTag] - v4 shape (singular).
 * @param {number} [opts.limit=5]
 * @param {number} [opts.timeoutMs=10000]
 * @param {string} [opts.searchMode] - v4 only (e.g. 'hybrid').
 * @param {string} [opts.apiVersion] - explicit 'v3' | 'v4' override.
 * @param {string} [opts.apiKey] - defaults to SUPERMEMORY_CC_API_KEY.
 * @returns {Promise<Array>} results array, [] on failure
 */
function search(query, opts) {
  opts = opts || {};
  const apiKey = opts.apiKey || process.env.SUPERMEMORY_CC_API_KEY || '';
  if (!apiKey) return Promise.resolve([]);

  const useV3 = opts.apiVersion === 'v3' ||
    (opts.apiVersion !== 'v4' && Array.isArray(opts.containerTags));

  const body = { q: query, limit: opts.limit || 5 };
  if (useV3) {
    body.containerTags = opts.containerTags || [];
  } else {
    body.containerTag = opts.containerTag || '';
    if (opts.searchMode) body.searchMode = opts.searchMode;
  }

  const payload = JSON.stringify(body);
  const timeoutMs = opts.timeoutMs || 10000;

  return new Promise(function (resolve) {
    const req = https.request({
      hostname: API_HOST,
      path: useV3 ? '/v3/search' : '/v4/search',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + apiKey,
        'Content-Length': Buffer.byteLength(payload)
      }
    }, function (res) {
      let data = '';
      res.on('data', function (chunk) { data += chunk; });
      res.on('end', function () {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed.results || []);
        } catch (e) {
          resolve([]);
        }
      });
    });
    req.on('error', function () { resolve([]); });
    req.setTimeout(timeoutMs, function () { req.destroy(); resolve([]); });
    req.write(payload);
    req.end();
  });
}

/**
 * Search and shape results into joined context text — the v3-lineage pattern
 * (mags.js / bot / archive-context all shipped this identical shaper):
 * relevant chunks per result joined by newline, results joined by '\n\n---\n\n'.
 *
 * @param {string} query
 * @param {Object} opts - same as search()
 * @returns {Promise<string>} joined context, '' on none/failure
 */
function searchContext(query, opts) {
  return search(query, opts).then(function (results) {
    if (!results || !results.length) return '';
    return results.map(function (r) {
      var chunks = (r.chunks || []).filter(function (c) { return c.isRelevant; });
      return chunks.map(function (c) { return c.content; }).join('\n');
    }).filter(Boolean).join('\n\n---\n\n');
  });
}

module.exports = { search, searchContext };

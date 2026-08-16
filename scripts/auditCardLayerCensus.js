#!/usr/bin/env node
/**
 * auditCardLayerCensus.js — READ-ONLY census of the wd-* card layer
 * [engine/sheet] — engine.111 (S376)
 *
 * Counts documents vs unique entity keys per world-data domain tag, so the
 * one-card-per-entity invariant is measurable instead of assumed. Writes
 * nothing, deletes nothing — safe to run any time, including against
 * production mid-cycle.
 *
 * Why this exists: wd-cultural held 95 documents for 46 figures and wd-business
 * held 435 for 99 businesses, both accumulating since 2026-04-28, and nothing
 * surfaced it for nearly four months. The builders reported success the whole
 * time (see governance.48 — writer-fixed, artifact-persists). A ratio is the
 * cheapest signal that a projection has drifted; this makes it a one-liner.
 *
 * Reading the output:
 *   ratio 1.00              — one card per KEY. NOT the same as one card per
 *                             entity — see the cross-key check below.
 *   ratio > 1.00            — surplus cards; run that builder's --reconcile
 *   no-key > 0              — documents the builders' PATCH map cannot see,
 *                             so they can never be refreshed in place
 *   alias > 0               — one real-world entity holding cards under two
 *                             DIFFERENT keys; invisible to ratio, see below
 *   orphan > 0              — keys with no row in the source sheet (--check-source)
 *
 * THE RATIO HAS A BLIND SPOT, and it produced a false all-clear on its first
 * real use (S376). A key-grouped count cannot see one entity filed under two
 * keys: wd-business reported a clean 1.00 while five businesses each held two
 * cards under mismatched BIZ_IDs — Atlas Bay Architects as both BIZ-00089
 * (the ledger's row) and BIZ-00099 (stale). Every per-key group was size 1, so
 * the ratio was satisfied and the duplicates were still there. Two checks close
 * it: a normalised-title pass that groups across keys, and --check-source, which
 * compares keys against the owning sheet — the definitive test, since a stale
 * key is precisely one the source no longer carries.
 *
 * Usage:
 *   node scripts/auditCardLayerCensus.js              # all projections
 *   node scripts/auditCardLayerCensus.js --tag wd-business
 *   node scripts/auditCardLayerCensus.js --check-source   # + sheet comparison
 *   node scripts/auditCardLayerCensus.js --json       # machine-readable
 *
 * Pointer: docs/plans/2026-08-16-writer-fixed-artifact-persists-audit.md §Census
 */

require('/root/GodWorld/lib/env');
var https = require('https');

var API_KEY = process.env.SUPERMEMORY_CC_API_KEY;
var API_HOST = 'api.supermemory.ai';

if (!API_KEY) {
  console.error('[ERROR] SUPERMEMORY_CC_API_KEY not set');
  process.exit(1);
}

var tagArg = process.argv.indexOf('--tag');
var TAG_FILTER = tagArg > 0 ? process.argv[tagArg + 1] : null;
var AS_JSON = process.argv.includes('--json');
var CHECK_SOURCE = process.argv.includes('--check-source');

// Each projection's key is the metadata field its builder writes and its
// PATCH-if-exists map reads. Keep in step with the build*Cards.js writeMemory
// meta blocks — a mismatch here reports false surplus.
// sheet/idHeader drive --check-source: a key absent from the source sheet is a
// stale card the builder will never touch again (it PATCHes only keys the sheet
// still yields), so it persists indefinitely.
var PROJECTIONS = [
  { tag: 'wd-citizens', key: 'popid', builder: 'buildCitizenCards.js', sheet: 'Simulation_Ledger', idHeader: 'POPID' },
  { tag: 'wd-business', key: 'biz_id', builder: 'buildBusinessCards.js', sheet: 'Business_Ledger', idHeader: 'BIZ_ID' },
  { tag: 'wd-cultural', key: 'cul_id', builder: 'buildCulturalCards.js', sheet: 'Cultural_Ledger', idHeader: 'CUL-ID' },
  { tag: 'wd-faith', key: 'organization', builder: 'buildFaithCards.js', sheet: 'Faith_Organizations', idHeader: 'Organization' },
  { tag: 'wd-neighborhood', key: 'neighborhood', builder: 'buildNeighborhoodCards.js', sheet: 'Neighborhood_Map', idHeader: 'Neighborhood' },
  // Initiative_Tracker's column is InitiativeID, not INIT_ID — the card metadata
  // field is init_id, so the two names differ and a guess reads as "inconclusive".
  { tag: 'wd-initiative', key: 'init_id', builder: 'buildInitiativeCards.js', sheet: 'Initiative_Tracker', idHeader: 'InitiativeID' }
];

// Normalise a card title so the same business reads the same under two keys.
// Strips the trade-suffix noise that made "Blue Lantern" and "Blue Lantern Bar"
// look like different entities. Deliberately loose: this check is a FLAG for a
// human to confirm, never an automatic delete input.
function normTitle(t) {
  return String(t == null ? '' : t).toLowerCase()
    .replace(/\b(bar|lounge|cafe|café|inc|llc|ltd|co|company|the|restaurant|grill)\b/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function smRequest(method, apiPath, body) {
  return new Promise(function (resolve, reject) {
    var payload = body ? JSON.stringify(body) : null;
    var headers = { Authorization: 'Bearer ' + API_KEY, Accept: 'application/json' };
    if (payload) {
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(payload);
    }
    var req = https.request({
      hostname: API_HOST, path: apiPath, method: method, headers: headers
    }, function (res) {
      var data = '';
      res.on('data', function (c) { data += c; });
      res.on('end', function () {
        var parsed = null;
        try { parsed = data ? JSON.parse(data) : null; } catch (e) { parsed = data; }
        resolve({ status: res.statusCode, body: parsed });
      });
    });
    req.on('error', reject);
    req.setTimeout(25000, function () { req.destroy(); reject(new Error('Timeout')); });
    if (payload) req.write(payload);
    req.end();
  });
}

function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

async function census(proj) {
  var all = [];
  var page = 1;
  while (true) {
    var r = await smRequest('POST', '/v3/documents/list', {
      containerTags: [proj.tag], limit: 200, page: page
    });
    if (r.status !== 200) throw new Error(proj.tag + ' list page ' + page + ' → HTTP ' + r.status);
    var mems = (r.body && r.body.memories) || [];
    all = all.concat(mems);
    if (mems.length < 200) break;
    page++;
    if (page > 30) throw new Error(proj.tag + ' pagination overflow (>30 pages)');
    await sleep(150);
  }

  var byKey = {};
  var noKey = 0;
  all.forEach(function (m) {
    var k = m.metadata && m.metadata[proj.key];
    if (!k) { noKey++; return; }
    (byKey[k] = byKey[k] || []).push(m);
  });

  var keys = Object.keys(byKey);
  var dupKeys = keys.filter(function (k) { return byKey[k].length > 1; });
  var surplus = dupKeys.reduce(function (n, k) { return n + byKey[k].length - 1; }, 0);

  // Cross-key alias check — the ratio's blind spot. Groups by normalised title
  // instead of key, so one entity holding cards under two keys surfaces even
  // when every per-key group is size 1.
  var byTitle = {};
  all.forEach(function (m) {
    var t = normTitle(m.metadata && m.metadata.title);
    if (!t) return;
    (byTitle[t] = byTitle[t] || []).push({
      key: (m.metadata && m.metadata[proj.key]) || '(none)',
      title: (m.metadata && m.metadata.title) || '',
      createdAt: m.createdAt
    });
  });
  var aliasGroups = Object.keys(byTitle)
    .filter(function (t) {
      var distinct = {};
      byTitle[t].forEach(function (d) { distinct[d.key] = true; });
      return Object.keys(distinct).length > 1;
    })
    .map(function (t) { return { title: t, cards: byTitle[t] }; });
  var aliasSurplus = aliasGroups.reduce(function (n, g) { return n + g.cards.length - 1; }, 0);

  // Source-membership check — the definitive one. A key the sheet no longer
  // carries is a card no rebuild will ever revisit.
  var orphans = [];
  if (CHECK_SOURCE && proj.sheet) {
    var sheets = require('../lib/sheets');
    var rows = await sheets.getSheetData(proj.sheet);
    if (rows && rows.length > 1) {
      var idc = rows[0].indexOf(proj.idHeader);
      if (idc < 0) {
        orphans = null; // header not found — report unknown rather than false-clean
      } else {
        var live = {};
        for (var ri = 1; ri < rows.length; ri++) {
          var v = String(rows[ri][idc] == null ? '' : rows[ri][idc]).trim();
          if (v) live[v] = true;
        }
        keys.forEach(function (k) {
          if (!live[k]) {
            orphans.push({ key: k, title: (byKey[k][0].metadata || {}).title || '' });
          }
        });
      }
    }
  }

  // Oldest surviving duplicate answers "how long has this been drifting?" —
  // the wd-cultural and wd-business piles both dated to 2026-04-28.
  var oldestDup = null;
  dupKeys.forEach(function (k) {
    byKey[k].forEach(function (m) {
      if (!oldestDup || new Date(m.createdAt) < new Date(oldestDup)) oldestDup = m.createdAt;
    });
  });

  return {
    tag: proj.tag,
    builder: proj.builder,
    key: proj.key,
    docs: all.length,
    entities: keys.length,
    surplus: surplus,
    multiCarded: dupKeys.length,
    noKey: noKey,
    oldestDup: oldestDup,
    ratio: keys.length ? Number((all.length / keys.length).toFixed(2)) : 0,
    aliasGroups: aliasGroups,
    aliasSurplus: aliasSurplus,
    orphans: orphans
  };
}

async function main() {
  var targets = TAG_FILTER
    ? PROJECTIONS.filter(function (p) { return p.tag === TAG_FILTER; })
    : PROJECTIONS;

  if (targets.length === 0) {
    console.error('[ERROR] unknown --tag "' + TAG_FILTER + '". Known: ' +
      PROJECTIONS.map(function (p) { return p.tag; }).join(', '));
    process.exit(1);
  }

  var rows = [];
  var failed = [];
  for (var i = 0; i < targets.length; i++) {
    try {
      rows.push(await census(targets[i]));
    } catch (e) {
      // Degrade per-projection: one unreachable tag must not blank the report.
      failed.push({ tag: targets[i].tag, error: e.message });
      console.error('[' + targets[i].tag + '] CENSUS FAILED: ' + e.message);
    }
    await sleep(300);
  }

  if (AS_JSON) {
    console.log(JSON.stringify({ projections: rows, failed: failed }, null, 2));
  } else {
    console.log('\nprojection        docs  entities  surplus  multi  alias  orphan  ratio  oldest-dup');
    rows.forEach(function (r) {
      console.log(
        r.tag.padEnd(18) +
        String(r.docs).padEnd(6) +
        String(r.entities).padEnd(10) +
        String(r.surplus).padEnd(9) +
        String(r.multiCarded).padEnd(7) +
        String(r.aliasSurplus).padEnd(7) +
        (r.orphans === null ? '?' : (CHECK_SOURCE ? String(r.orphans.length) : '—')).padEnd(8) +
        String(r.ratio).padEnd(7) +
        (r.oldestDup ? String(r.oldestDup).slice(0, 10) : '—'));
    });

    var totalSurplus = rows.reduce(function (n, r) { return n + r.surplus; }, 0);
    var totalAlias = rows.reduce(function (n, r) { return n + r.aliasSurplus; }, 0);
    var totalNoKey = rows.reduce(function (n, r) { return n + r.noKey; }, 0);
    console.log('\nTOTAL SURPLUS (same key): ' + totalSurplus +
      ' | CROSS-KEY ALIAS SURPLUS: ' + totalAlias +
      ' | docs with no key: ' + totalNoKey);

    rows.filter(function (r) { return r.surplus > 0; }).forEach(function (r) {
      console.log('  → ' + r.tag + ': node scripts/' + r.builder + ' --reconcile');
    });

    // Alias + orphan detail. These are NOT reconcile-able — --reconcile groups by
    // key, so it cannot see or fix either class. They need a human ruling on
    // which key is canonical, which is why they print in full rather than as a
    // count with a suggested command.
    rows.forEach(function (r) {
      if (r.aliasGroups && r.aliasGroups.length) {
        console.log('\n[' + r.tag + '] ONE ENTITY, MULTIPLE KEYS — invisible to ratio, not fixed by --reconcile:');
        r.aliasGroups.forEach(function (g) {
          console.log('  "' + g.title + '"');
          g.cards.forEach(function (c) {
            console.log('     ' + c.key + '  "' + c.title + '"  ' + String(c.createdAt).slice(0, 10));
          });
        });
      }
      if (CHECK_SOURCE && r.orphans && r.orphans.length) {
        console.log('\n[' + r.tag + '] KEYS ABSENT FROM ' + (
          PROJECTIONS.filter(function (p) { return p.tag === r.tag; })[0] || {}
        ).sheet + ' — no rebuild will revisit these:');
        r.orphans.forEach(function (o) {
          console.log('     ' + o.key + '  "' + o.title + '"');
        });
      }
      if (CHECK_SOURCE && r.orphans === null) {
        console.log('\n[' + r.tag + '] source check INCONCLUSIVE — id header not found in sheet');
      }
    });

    if (!CHECK_SOURCE) {
      console.log('\n(orphan column needs --check-source; ratio alone cannot certify a layer clean)');
    }
  }

  // Non-zero on a failed enumeration only. Surplus is a finding to report, not
  // a script error — gating on it would make the audit unusable in a pipeline
  // whose whole job is to surface the number.
  if (failed.length > 0) process.exit(1);
}

main().catch(function (e) { console.error('[FATAL]', e); process.exit(1); });

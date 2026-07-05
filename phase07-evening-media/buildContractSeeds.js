/**
 * buildContractSeeds.js — Seed contract v2 builder (Phase 7, in-cycle).
 *
 * [engine/sheet] Mike's seed contract (verbatim source: docs/research/2026-07-05-mike-seed-contract.md):
 * a seed = an engine event. The packet says "here's what happened and to whom —
 * search canon to support and write an article." Exact citizens / neighborhoods /
 * businesses attached at generation. No JSON carries logic; sheets are the world.
 * The row directs nothing (no voice, no angle, no byline).
 *
 * Runs at Phase 7 AFTER all Phase 2-5 effect computes + event generators:
 *  - causes come from S.rippleEvents (accumulated by recordRipple_ at compute sites)
 *  - citizens come from THIS CYCLE's LifeHistory_Log rows (the engine's own event
 *    writes, phases 4-5) — joined by exact POPID target first, neighborhood second.
 *    Read-only sheet access (reads are unrestricted; writes stay Phase-10 intents).
 *
 * Promotion rule (T5 fold, sign-aware): a seed is class "major" when
 * |magnitude| >= MAJOR_MAG or when >= CLUSTER_N same-family causes hit the same
 * neighborhood family this cycle (merged into one seed). Everything else is
 * class "texture" — available, not promoted. Counts logged, no silent caps.
 *
 * Output: S.contractSeeds — persisted by saveV3Seeds_ v4 (Phase 10) to
 * Story_Seed_Deck contract columns. No JSON artifact anywhere.
 *
 * Apps Script global style (clasped). Dual-use module guard for the Node test.
 */

var CONTRACT_SEED_MAJOR_MAG = 3;      // |magnitude| at/above → major (crime shifts, hood deltas)
var CONTRACT_SEED_MAJOR_MAG_FRAC = 0.05; // fractional magnitudes (sentiment 0-1 scale)
var CONTRACT_SEED_CLUSTER_N = 3;      // same cause family + hood family count → merged major
var CONTRACT_SEED_MAX_CITIZENS = 6;   // exact-participant cap per seed row
var CONTRACT_SEED_DOMAIN = {
  'initiative': 'CIVIC',
  'economic-event': 'ECONOMIC',
  'edition-coverage': 'COMMUNITY',
  'gentrification': 'COMMUNITY',
  'migration': 'COMMUNITY',
  'sports': 'SPORTS',
  'crime': 'SAFETY'
};

function contractSeedHash_(input) {
  // Deterministic short id — same shape as computeShortHash_ but self-contained
  // so the Node test doesn't need the engine core loaded.
  var h = 0;
  var s = String(input);
  for (var i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return ('00000000' + (h >>> 0).toString(16)).slice(-8);
}

function contractSeedTrend_(r) {
  var dur = Number(r.duration) || 1;
  var rem = (r.remainingStrength === '' || r.remainingStrength === null || r.remainingStrength === undefined)
    ? null : Number(r.remainingStrength);
  if (dur <= 1) return 'single-cycle';
  if (rem === null || isNaN(rem)) return 'multi-cycle (' + dur + ')';
  return 'carrying, ' + rem.toFixed(2) + ' strength left of ' + dur + '-cycle run';
}

function contractSeedIsMajor_(magnitude, clusterSize) {
  var m = Math.abs(Number(magnitude) || 0);
  if (clusterSize >= CONTRACT_SEED_CLUSTER_N) return true;
  if (m >= CONTRACT_SEED_MAJOR_MAG) return true;
  if (m > 0 && m < 1 && m >= CONTRACT_SEED_MAJOR_MAG_FRAC) return true;
  return false;
}

/**
 * Read THIS cycle's citizen events from LifeHistory_Log.
 * Returns [] on any failure — the seed still ships with cause data (fail-soft,
 * same discipline as recordRipple_).
 */
function contractSeedCycleEvents_(ctx, cycle) {
  var out = [];
  try {
    if (!ctx || !ctx.ss || typeof ctx.ss.getSheetByName !== 'function') return out;
    var log = ctx.ss.getSheetByName('LifeHistory_Log');
    if (!log || log.getLastRow() < 2) return out;
    var vals = log.getDataRange().getValues();
    var h = vals[0];
    var iPop = h.indexOf('POPID');
    var iName = h.indexOf('Name');
    var iTag = h.indexOf('EventTag');
    var iText = h.indexOf('EventText');
    var iHood = h.indexOf('Neighborhood');
    var iCyc = h.indexOf('Cycle');
    if (iPop < 0 || iCyc < 0) return out;
    for (var r = 1; r < vals.length; r++) {
      if (String(vals[r][iCyc]) !== String(cycle)) continue;
      out.push({
        popId: String(vals[r][iPop] || ''),
        name: String(iName >= 0 ? (vals[r][iName] || '') : ''),
        tag: String(iTag >= 0 ? (vals[r][iTag] || '') : ''),
        text: String(iText >= 0 ? (vals[r][iText] || '') : ''),
        hood: String(iHood >= 0 ? (vals[r][iHood] || '') : '')
      });
    }
  } catch (err) {
    try { if (typeof Logger !== 'undefined') Logger.log('contractSeedCycleEvents_ read failed: ' + err); } catch (ignored) {}
  }
  return out;
}

function contractSeedNormHood_(name) {
  return String(name || '').toLowerCase().replace(/[^a-z]/g, '');
}

/**
 * Phase-7 entry. Joins S.rippleEvents (causes) with this cycle's LifeHistory
 * events (people) into S.contractSeeds. Clusters same-family causes per T5.
 */
function buildContractSeeds_(ctx) {
  var S = ctx.summary || (ctx.summary = {});
  var cycle = S.cycleId || S.cycle || (ctx.config && ctx.config.cycleCount) || 0;
  var ripples = S.rippleEvents || [];
  var events = contractSeedCycleEvents_(ctx, cycle);

  // Index citizen events: by POPID and by neighborhood.
  var byPop = {};
  var byHood = {};
  for (var i = 0; i < events.length; i++) {
    var ev = events[i];
    if (ev.popId) {
      if (!byPop[ev.popId]) byPop[ev.popId] = [];
      byPop[ev.popId].push(ev);
    }
    var hk = contractSeedNormHood_(ev.hood);
    if (hk) {
      if (!byHood[hk]) byHood[hk] = [];
      byHood[hk].push(ev);
    }
  }

  // Cluster ripples by causeType + neighborhood (T5 family grouping).
  var clusters = {};
  var order = [];
  for (var j = 0; j < ripples.length; j++) {
    var r = ripples[j];
    var key = (r.causeType || 'unknown') + '|' + contractSeedNormHood_(r.neighborhood || 'citywide');
    if (!clusters[key]) { clusters[key] = []; order.push(key); }
    clusters[key].push(r);
  }

  var seeds = [];
  var majorCount = 0;
  var textureCount = 0;

  for (var k = 0; k < order.length; k++) {
    var group = clusters[order[k]];
    var lead = group[0];
    var totalMag = 0;
    var causeLines = [];
    var citizenSet = {};
    var picked = [];
    var businesses = [];
    var otherEntities = [];

    for (var g = 0; g < group.length; g++) {
      var rp = group[g];
      totalMag += Number(rp.magnitude) || 0;
      var line = (rp.causeDetail || (rp.causeType + (rp.causeId ? ' ' + rp.causeId : '')));
      if (causeLines.indexOf(line) < 0) causeLines.push(line);

      var tids = rp.targetIds || [];
      for (var t = 0; t < tids.length; t++) {
        var tid = String(tids[t]);
        if (rp.targetScope === 'citizen' && byPop[tid] && !citizenSet[tid]) {
          citizenSet[tid] = true;
          picked = picked.concat(byPop[tid]);
        } else if (rp.targetScope === 'business' && businesses.indexOf(tid) < 0) {
          businesses.push(tid);
        } else if (rp.targetScope !== 'citizen' && rp.targetScope !== 'business' &&
                   rp.targetScope !== 'neighborhood' && rp.targetScope !== 'citywide' &&
                   otherEntities.indexOf(tid) < 0) {
          otherEntities.push(tid);
        }
      }
    }

    // No exact-target citizens → the engine's own events in that neighborhood
    // this cycle are the participants (still engine-generated, never inferred
    // from residence alone — these citizens HAD events here this cycle).
    if (!picked.length && lead.neighborhood) {
      picked = (byHood[contractSeedNormHood_(lead.neighborhood)] || []).slice(0, CONTRACT_SEED_MAX_CITIZENS);
    }
    if (picked.length > CONTRACT_SEED_MAX_CITIZENS) picked = picked.slice(0, CONTRACT_SEED_MAX_CITIZENS);

    var isMajor = contractSeedIsMajor_(totalMag, group.length);
    if (isMajor) majorCount++; else textureCount++;

    seeds.push({
      seedId: contractSeedHash_(cycle + '|' + order[k] + '|' + lead.causeId),
      cycle: cycle,
      domain: CONTRACT_SEED_DOMAIN[lead.causeType] || 'GENERAL',
      neighborhood: lead.neighborhood || 'Citywide',
      what: (lead.effectType || lead.causeType) +
            (totalMag ? ' ' + (totalMag > 0 ? '+' : '') + (Math.round(totalMag * 100) / 100) : '') +
            (group.length > 1 ? ' (' + group.length + ' related effects this cycle)' : ''),
      why: causeLines.join(' | '),
      citizens: picked.map(function (p) { return p.popId + ' ' + p.name; }).join('; '),
      citizenEvents: picked.map(function (p) { return p.text; }).join(' | '),
      businesses: businesses.join('; '),
      otherEntities: otherEntities.join('; '),
      magnitude: Math.round(totalMag * 100) / 100,
      trend: contractSeedTrend_(lead),
      seedClass: isMajor ? 'major' : 'texture'
    });
  }

  S.contractSeeds = seeds;
  try {
    if (typeof Logger !== 'undefined') {
      Logger.log('buildContractSeeds_: ' + seeds.length + ' seeds (' + majorCount +
        ' major / ' + textureCount + ' texture) from ' + ripples.length +
        ' ripples + ' + events.length + ' citizen events, cycle ' + cycle);
    }
  } catch (ignored) {}
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    buildContractSeeds_: buildContractSeeds_,
    contractSeedCycleEvents_: contractSeedCycleEvents_,
    contractSeedIsMajor_: contractSeedIsMajor_,
    contractSeedTrend_: contractSeedTrend_,
    contractSeedHash_: contractSeedHash_,
    CONTRACT_SEED_DOMAIN: CONTRACT_SEED_DOMAIN
  };
}

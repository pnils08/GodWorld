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

// Cause family → what a thematically-relevant citizen event looks like.
// Used to PREFER matching citizens/events; generic hood events remain the fallback.
var CONTRACT_SEED_EVENT_HINTS = {
  'crime': /crime|theft|break-?in|incident|police|patrol|safe|robber|vandal|siren/i,
  'initiative': /council|initiative|program|civic|vote|clinic|transit|fund|meeting/i,
  'sports': /game|playoff|team|stadium|ballpark|fan|score|inning/i,
  'economic-event': /work|job|shift|business|market|shop|hire|wage|customer|vendor/i,
  'gentrification': /rent|landlord|lease|moving|displac|evict|housing|develop/i,
  'migration': /moving|leave|leaving|goodbye|arriv|relocat|farewell/i,
  'edition-coverage': /read|paper|article|news|tribune|coverage/i
};

/** One citizen object per POPID: {popId, name, events:[{tag,text,hood}]} */
function contractSeedCitizenIndex_(events) {
  var byPop = {};
  var hoodCitizens = {}; // hoodKey → [citizen] unique, insertion order
  for (var i = 0; i < events.length; i++) {
    var ev = events[i];
    if (!ev.popId) continue;
    var c = byPop[ev.popId];
    if (!c) {
      c = byPop[ev.popId] = { popId: ev.popId, name: ev.name, events: [] };
      var hk = contractSeedNormHood_(ev.hood);
      if (hk) {
        if (!hoodCitizens[hk]) hoodCitizens[hk] = [];
        hoodCitizens[hk].push(c);
      }
    }
    c.events.push(ev);
  }
  return { byPop: byPop, hoodCitizens: hoodCitizens };
}

/** The citizen's single most cause-relevant event line. */
function contractSeedPickEvent_(citizen, causeType) {
  var hint = CONTRACT_SEED_EVENT_HINTS[causeType];
  if (hint) {
    for (var i = 0; i < citizen.events.length; i++) {
      var ev = citizen.events[i];
      if (hint.test(ev.tag) || hint.test(ev.text)) return ev;
    }
  }
  return citizen.events[0];
}

/**
 * Pick up to max citizens for a seed: exact targets first, then hood citizens
 * ranked (cause-relevant event > not yet used by another seed > order). Marks
 * picks in usedPop so consecutive seeds in the same hood name different people.
 */
function contractSeedPickCitizens_(index, targetPops, hood, causeType, usedPop, max) {
  var picked = [];
  var seen = {};
  for (var i = 0; i < targetPops.length && picked.length < max; i++) {
    var c = index.byPop[targetPops[i]];
    if (c && !seen[c.popId]) { seen[c.popId] = true; picked.push(c); }
  }
  if (!picked.length && hood) {
    var pool = index.hoodCitizens[contractSeedNormHood_(hood)] || [];
    var hint = CONTRACT_SEED_EVENT_HINTS[causeType];
    var scored = [];
    for (var j = 0; j < pool.length; j++) {
      var cand = pool[j];
      var relevant = false;
      if (hint) {
        for (var k = 0; k < cand.events.length; k++) {
          if (hint.test(cand.events[k].tag) || hint.test(cand.events[k].text)) { relevant = true; break; }
        }
      }
      scored.push({ c: cand, score: (relevant ? 2 : 0) + (usedPop[cand.popId] ? 0 : 1), order: j });
    }
    scored.sort(function (a, b) { return b.score - a.score || a.order - b.order; });
    for (var m = 0; m < scored.length && picked.length < max; m++) {
      if (!seen[scored[m].c.popId]) { seen[scored[m].c.popId] = true; picked.push(scored[m].c); }
    }
  }
  for (var p = 0; p < picked.length; p++) usedPop[picked[p].popId] = true;
  return picked;
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

  // Index citizen events: one citizen object per POPID, hood pools for fallback.
  var index = contractSeedCitizenIndex_(events);
  var usedPop = {}; // cross-seed spread — same hood's seeds name different people

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
    var targetPops = [];
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
        if (rp.targetScope === 'citizen' && targetPops.indexOf(tid) < 0) {
          targetPops.push(tid);
        } else if (rp.targetScope === 'business' && businesses.indexOf(tid) < 0) {
          businesses.push(tid);
        } else if (rp.targetScope !== 'citizen' && rp.targetScope !== 'business' &&
                   rp.targetScope !== 'neighborhood' && rp.targetScope !== 'citywide' &&
                   otherEntities.indexOf(tid) < 0) {
          otherEntities.push(tid);
        }
      }
    }

    // Exact-target citizens first; else the engine's own events in that
    // neighborhood this cycle (cause-relevant events preferred, citizens not
    // already named by another seed preferred — never invented).
    var picked = contractSeedPickCitizens_(
      index, targetPops, lead.neighborhood, lead.causeType, usedPop, CONTRACT_SEED_MAX_CITIZENS);

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
      citizenEvents: picked.map(function (p) {
        var ev = contractSeedPickEvent_(p, lead.causeType);
        return p.name + ' — ' + ev.text;
      }).join(' | '),
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
      var containerId = '';
      try { containerId = (ctx.ss && typeof ctx.ss.getId === 'function') ? ctx.ss.getId() : ''; } catch (ig2) {}
      Logger.log('buildContractSeeds_: ' + seeds.length + ' seeds (' + majorCount +
        ' major / ' + textureCount + ' texture) from ' + ripples.length +
        ' ripples + ' + events.length + ' citizen events, cycle ' + cycle +
        (containerId ? ' | container=' + containerId : ''));
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

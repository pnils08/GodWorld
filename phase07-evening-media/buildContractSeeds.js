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
var CONTRACT_SEED_FILL_N = 4;         // Grade 1: fill Citizens to this count via neighborhood draw
var CONTRACT_SEED_FILL_BIZ = 2;       // S313: fill Businesses to this count via neighborhood draw
var CONTRACT_SEED_FILL_OTHER = 1;     // S313: fill OtherEntities to this count via neighborhood draw
var CONTRACT_SEED_DOMAIN = {
  'initiative': 'CIVIC',
  'economic-event': 'ECONOMIC',
  'edition-coverage': 'COMMUNITY',
  'gentrification': 'COMMUNITY',
  'migration': 'COMMUNITY',
  'sports': 'SPORTS',
  'crime': 'SAFETY'
};

// Desk routing (T4 purpose, in-sheet): which desk's packet this row belongs to.
// Letters desk additionally reads ANY row with a non-empty Citizens column —
// its writers are the named citizens, no separate slice needed.
var CONTRACT_SEED_DESK = {
  'CIVIC': 'civic',
  'SAFETY': 'civic',
  'ECONOMIC': 'business',
  'SPORTS': 'sports',
  'COMMUNITY': 'culture',
  'GENERAL': 'civic'
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
 * Exact targets first, then a neighborhood draw (Grade 1 — Mike-direct
 * 2026-07-06, supersedes the earlier exact-only rule): a citizen does NOT
 * need to have received the event to testify — attach POPIDs from the seed's
 * neighborhood and the voice speaks from that citizen's own LifeHistory. The
 * event is disposable; the testimony is the asset. Exact engine targets
 * (targetScope 'citizen') still lead and are never displaced; the draw only
 * fills behind them up to CONTRACT_SEED_FILL_N (cap CONTRACT_SEED_MAX_CITIZENS).
 * Citywide / unknown-hood seeds draw across all citizens with events this
 * cycle. Draw order: unused-by-other-seeds first (cross-seed spread), via
 * ctx.rng when provided (deterministic replay), insertion order otherwise.
 * Exposure weighting is Grade 2; participation events are Grade 3 — see
 * docs/research/2026-07-06-city-citizen-seam-audit.md.
 */
function contractSeedPickCitizens_(index, targetPops, hood, causeType, usedPop, max, roll) {
  var picked = [];
  var seen = {};
  for (var i = 0; i < targetPops.length && picked.length < max; i++) {
    var c = index.byPop[targetPops[i]];
    if (c && !seen[c.popId]) { seen[c.popId] = true; picked.push(c); }
  }

  if (picked.length < CONTRACT_SEED_FILL_N) {
    var hk = contractSeedNormHood_(hood);
    var pool = (hk && hk !== 'citywide' && index.hoodCitizens[hk]) ? index.hoodCitizens[hk] : null;
    if (!pool) {
      pool = [];
      for (var pid in index.byPop) pool.push(index.byPop[pid]);
    }
    var unused = [];
    var reused = [];
    for (var u = 0; u < pool.length; u++) {
      if (seen[pool[u].popId]) continue;
      (usedPop[pool[u].popId] ? reused : unused).push(pool[u]);
    }
    var candidates = unused.concat(reused);
    while (picked.length < CONTRACT_SEED_FILL_N && candidates.length) {
      var at = (typeof roll === 'function') ? Math.floor(roll() * candidates.length) : 0;
      var drawn = candidates.splice(at, 1)[0];
      seen[drawn.popId] = true;
      picked.push(drawn);
    }
  }

  for (var p = 0; p < picked.length; p++) usedPop[picked[p].popId] = true;
  return picked;
}

/**
 * Backdrop entity index (S313, Mike-direct): Business_Ledger + Faith_Organizations
 * keyed by neighborhood, so a neighborhood seed can attach the entities that are
 * ALSO in that neighborhood — backdrop available to the story, canon built through
 * usage (same Grade-1 move as the citizen draw). Fail-soft per sheet, same
 * discipline as contractSeedCycleEvents_ — a missing tab never blocks the seed.
 */
function contractSeedBackdropIndex_(ctx) {
  var idx = { bizByHood: {}, bizById: {}, faithByHood: {} };
  if (!ctx || !ctx.ss || typeof ctx.ss.getSheetByName !== 'function') return idx;
  try {
    var bs = ctx.ss.getSheetByName('Business_Ledger');
    if (bs && bs.getLastRow() > 1) {
      var bv = bs.getDataRange().getValues();
      var bh = bv[0];
      var iBid = bh.indexOf('BIZ_ID');
      var iBname = bh.indexOf('Name');
      var iBhood = bh.indexOf('Neighborhood');
      if (iBid >= 0 && iBname >= 0 && iBhood >= 0) {
        for (var r = 1; r < bv.length; r++) {
          var bid = String(bv[r][iBid] || '');
          var bname = String(bv[r][iBname] || '');
          if (!bid && !bname) continue;
          var biz = { key: bid || bname, id: bid, name: bname };
          if (bid) idx.bizById[bid] = biz;
          var bhk = contractSeedNormHood_(bv[r][iBhood]);
          if (bhk) {
            if (!idx.bizByHood[bhk]) idx.bizByHood[bhk] = [];
            idx.bizByHood[bhk].push(biz);
          }
        }
      }
    }
  } catch (e1) {
    try { if (typeof Logger !== 'undefined') Logger.log('contractSeedBackdropIndex_ Business_Ledger read failed: ' + e1); } catch (ig1) {}
  }
  try {
    var fsh = ctx.ss.getSheetByName('Faith_Organizations');
    if (fsh && fsh.getLastRow() > 1) {
      var fv = fsh.getDataRange().getValues();
      var fh = fv[0];
      var iOrg = fh.indexOf('Organization');
      var iFhood = fh.indexOf('Neighborhood');
      var iStatus = fh.indexOf('ActiveStatus');
      if (iOrg >= 0 && iFhood >= 0) {
        for (var f = 1; f < fv.length; f++) {
          var org = String(fv[f][iOrg] || '');
          if (!org) continue;
          if (iStatus >= 0 && /inactive|closed|defunct/i.test(String(fv[f][iStatus] || ''))) continue;
          var fhk = contractSeedNormHood_(fv[f][iFhood]);
          if (fhk) {
            if (!idx.faithByHood[fhk]) idx.faithByHood[fhk] = [];
            idx.faithByHood[fhk].push({ key: org, name: org });
          }
        }
      }
    }
  } catch (e2) {
    try { if (typeof Logger !== 'undefined') Logger.log('contractSeedBackdropIndex_ Faith_Organizations read failed: ' + e2); } catch (ig2) {}
  }
  return idx;
}

/**
 * Backdrop draw (S313): fill behind exact targets from the seed's neighborhood
 * pool, up to fillN entries. Real-neighborhood pools only — the caller passes no
 * pool for citywide seeds (an arbitrary citywide business has no story
 * connection; citizens differ because they carry their own event lines).
 * Unused-by-other-seeds first (cross-seed spread), ctx.rng when provided
 * (deterministic replay), insertion order otherwise. Never displaces exacts.
 */
function contractSeedBackdropDraw_(pool, excludeKeys, used, fillN, roll) {
  var out = [];
  if (!pool || !pool.length || fillN <= 0) return out;
  var unused = [];
  var reused = [];
  for (var i = 0; i < pool.length; i++) {
    var p = pool[i];
    if (excludeKeys[p.key]) continue;
    (used[p.key] ? reused : unused).push(p);
  }
  var candidates = unused.concat(reused);
  while (out.length < fillN && candidates.length) {
    var at = (typeof roll === 'function') ? Math.floor(roll() * candidates.length) : 0;
    var drawn = candidates.splice(at, 1)[0];
    used[drawn.key] = true;
    out.push(drawn);
  }
  return out;
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

  // S313 backdrop entities: businesses + faith orgs keyed by neighborhood.
  var backdrop = contractSeedBackdropIndex_(ctx);
  var usedBiz = {};   // cross-seed spread, same as usedPop
  var usedFaith = {};

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
      index, targetPops, lead.neighborhood, lead.causeType, usedPop, CONTRACT_SEED_MAX_CITIZENS,
      (typeof ctx.rng === 'function') ? ctx.rng : null);

    var isMajor = contractSeedIsMajor_(totalMag, group.length);
    if (isMajor) majorCount++; else textureCount++;

    // S313 backdrop fill — same Grade-1 move as citizens: the entities that are
    // ALSO in the seed's neighborhood attach as backdrop the story can use.
    // Exact ripple targets lead (name-resolved via Business_Ledger when known,
    // passed through verbatim otherwise) and are never displaced; the draw only
    // fills behind them. Citywide / unknown-hood seeds get no backdrop draw.
    var hoodKey = contractSeedNormHood_(lead.neighborhood || '');
    var isRealHood = hoodKey && hoodKey !== 'citywide';
    var rollFn = (typeof ctx.rng === 'function') ? ctx.rng : null;

    var bizLabels = [];
    var seenBizKeys = {};
    for (var xb = 0; xb < businesses.length; xb++) {
      var exactBiz = backdrop.bizById[businesses[xb]];
      seenBizKeys[businesses[xb]] = true;
      if (exactBiz) {
        seenBizKeys[exactBiz.key] = true;
        bizLabels.push((exactBiz.id ? exactBiz.id + ' ' : '') + exactBiz.name);
      } else {
        bizLabels.push(businesses[xb]);
      }
    }
    if (isRealHood) {
      var bizFill = contractSeedBackdropDraw_(
        backdrop.bizByHood[hoodKey], seenBizKeys, usedBiz,
        CONTRACT_SEED_FILL_BIZ - bizLabels.length, rollFn);
      for (var db = 0; db < bizFill.length; db++) {
        bizLabels.push((bizFill[db].id ? bizFill[db].id + ' ' : '') + bizFill[db].name);
      }
    }

    var otherLabels = otherEntities.slice(); // exact non-biz scopes pass through
    var seenOtherKeys = {};
    for (var xo = 0; xo < otherEntities.length; xo++) seenOtherKeys[otherEntities[xo]] = true;
    if (isRealHood) {
      var faithFill = contractSeedBackdropDraw_(
        backdrop.faithByHood[hoodKey], seenOtherKeys, usedFaith,
        CONTRACT_SEED_FILL_OTHER - otherLabels.length, rollFn);
      for (var df = 0; df < faithFill.length; df++) {
        otherLabels.push(faithFill[df].name + ' (faith)');
      }
    }

    var seedDomain = CONTRACT_SEED_DOMAIN[lead.causeType] || 'GENERAL';
    seeds.push({
      seedId: contractSeedHash_(cycle + '|' + order[k] + '|' + lead.causeId),
      cycle: cycle,
      desk: CONTRACT_SEED_DESK[seedDomain] || 'civic',
      domain: seedDomain,
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
      businesses: bizLabels.join('; '),
      otherEntities: otherLabels.join('; '),
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

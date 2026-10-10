/**
 * ============================================================================
 * Civic Role Engine v3.0
 * ============================================================================
 *
 * STANDING RULES (builder 2026-10-10, verbatim in the plan) — anything added to
 * this engine follows them:
 *   1. The sign skews up over down: civicRoleUpChance sits above 0.5.
 *   2. The heavier the event, the rarer it is: P(S) >= P(M) >= P(L) at EVERY
 *      aura. civicRoleBands_ enforces the order structurally and
 *      civicRoleConfig_ rejects largeOdds > mediumOdds, so no knob setting
 *      can invert it.
 *   3. It fires less than once per citizen per Cycle: civicRoleFireChance is a
 *      flat per-citizen gate (aura drives size, never frequency).
 *
 * v3.1 (engine.286 Task 6 / builder rules 2026-10-10): fire gate, ordered bands,
 *   up skew. v3.0 (builder rulings 2026-10-09):
 * - A weighted event per Active CIV citizen that passes the fire gate, drawn
 *   from what is happening in the citizen's own hood this Cycle — never a
 *   re-narration of what the city-hall crons or civic-mode already carry.
 * - The roll is sign (up / down) then weight band (S / M / L). The hood premise
 *   leans the sign; aura (office Approval as the week opened, Tier, Famous)
 *   raises the odds of the M and L bands. A down draw is the cron's obstacle.
 * - Non-canon-altering: writes only the LifeHistory line + LastUpdated, the
 *   LifeHistory_Log intent, and (public premises) the hood pulse. Dials move
 *   downstream through the graded CivicRole tags in citizenDialMap.js.
 * - Text: ECL pools `civicRole.<premise>.<up|down>` (unconditioned, slot-free
 *   lines) when authored, the hardcoded pools below otherwise.
 * - Retired/resigned/scandal status lines removed — office facts belong to
 *   civic-mode and approval. Called after Phase5-BusinessDynamics so the
 *   business premise is this Cycle's.
 * Plan: docs/plans/2026-10-08-engine-286-game-of-life-events.md Task 6 (T6-1..T6-7).
 *
 * v2.3 (S204 B2 / 2026-05-06): LifeHistory_Log appendRow → queueAppendIntent_.
 * ============================================================================
 */

// World_Config keys (engine94SheetContract.js ENGINE286_CONFIG_SEEDS) — a missing one throws.
var CIVIC_ROLE_REQUIRED_KEYS = [
  'civicRoleFireChance',    // per-citizen chance an event fires at all this Cycle (rule 3)
  'civicRoleUpChance',      // base chance the draw is up, before the premise lean (rule 1)
  'civicRolePremiseLean',   // how far a good / bad hood premise moves the up chance
  'civicRoleMediumOdds',    // base odds of a medium-weight event (aura 1)
  'civicRoleLargeOdds'      // base odds of a large-weight event (aura 1); <= mediumOdds (rule 2)
];

// Aura — a general citizen is 1.0; every CIV citizen sits above that. Ceiling 3.1.
var CIVIC_ROLE_AURA_BASE_ = 1.2;
var CIVIC_ROLE_AURA_APPROVAL_ = 0.8;   // × Approval / 100 (when the office row has one)
var CIVIC_ROLE_AURA_TIER_ = { 1: 0.6, 2: 0.4, 3: 0.2, 4: 0 };
var CIVIC_ROLE_AURA_FAMOUS_ = 0.5;

// Premise texts; {hood} is the citizen's neighborhood. Hood obstacles and lifts —
// never a vote, scandal, resignation, construction completion or office action.
var CIVIC_ROLE_TEXT_ = {
  business: {
    up: [
      "Merchants on the {hood} corridor stopped them to say business is picking up.",
      "A shop owner in {hood} pulled them aside to talk about a good run of weeks.",
      "Busy sidewalks in {hood} — a few business owners wanted them to see it."
    ],
    down: [
      "Shop owners in {hood} pressed them about slow weeks on the corridor.",
      "A merchant in {hood} cornered them about rent and thin foot traffic.",
      "Quiet registers on the {hood} corridor; a business owner asked them what the city sees coming."
    ]
  },
  // A business actually closed in the hood this Cycle (S.businessClosures). Always a down lean,
  // so an up draw renders as everyday (no up pool).
  closure: {
    up: [],
    down: [
      "Walked past a storefront that just closed in {hood}; a neighbor wanted to know what comes next for the block.",
      "A shop on the {hood} corridor shut its doors this week, and people stopped them to talk about it.",
      "Neighbors in {hood} were still talking about the business that closed down the street."
    ]
  },
  safety: {
    up: [
      "Neighbors in {hood} mentioned the blocks have felt calmer lately.",
      "A resident in {hood} said they walk home at night without thinking twice now.",
      "Parents in {hood} told them the park feels safe again."
    ],
    down: [
      "A resident in {hood} stopped them about break-ins on their street.",
      "Neighbors in {hood} wanted answers about the trouble on the block this week.",
      "A shop owner in {hood} showed them the damage from a rough night."
    ]
  },
  initiative: {
    up: [
      "Residents in {hood} noticed the city project moving forward and said so.",
      "A neighbor in {hood} asked them about the city project and liked what they heard.",
      "People in {hood} were talking about the city work nearby — mostly good."
    ],
    down: [
      "People in {hood} complained the city project nearby is making the block harder to live with.",
      "A resident in {hood} wanted to know why the city work nearby keeps dragging on.",
      "Got an earful in {hood} about how the city project is landing on the block."
    ]
  },
  mood: {
    up: [
      "A good week on the {hood} blocks — people waved them down just to chat.",
      "The mood in {hood} was easy this week; conversations ran long.",
      "{hood} felt warm this week; neighbors were glad to see them."
    ],
    down: [
      "Tension on the {hood} blocks this week; conversations ran short and sharp.",
      "{hood} felt on edge this week, and people let them know it.",
      "A sour week in {hood}; a neighbor said nobody at the city is listening."
    ]
  },
  everyday: {
    up: [
      "A neighbor in {hood} thanked them for showing up around the block.",
      "Someone in {hood} recognized them at the corner store and said keep going.",
      "An old acquaintance in {hood} stopped them to say they are doing right by the neighborhood."
    ],
    down: [
      "Got an earful from a neighbor in {hood} who feels nobody listens.",
      "A resident in {hood} told them flatly they had not seen them around enough.",
      "A neighbor in {hood} brought up an old promise they felt was never kept."
    ]
  }
};

// Premises that have a public footprint pulse the hood; mood / everyday do not.
var CIVIC_ROLE_PUBLIC_ = { business: true, closure: true, safety: true, initiative: true };

function civicRoleConfig_(ctx) {
  var cfg = (ctx && ctx.config) || {};
  var out = {}, missing = [];
  for (var i = 0; i < CIVIC_ROLE_REQUIRED_KEYS.length; i++) {
    var k = CIVIC_ROLE_REQUIRED_KEYS[i];
    var v = cfg[k];
    var n = (typeof v === 'boolean' || v === null || v === undefined || String(v).trim() === '') ? NaN : Number(v);
    if (!isFinite(n) || n < 0 || n > 1) missing.push(k);
    else out[k] = n;
  }
  if (missing.length) throw new Error('runCivicRoleEngine_: World_Config missing or out of 0..1: ' + missing.join(', ') + ' (engine.286 keys — ensureEngine286Config_ self-arms them at open)');
  if (out.civicRoleLargeOdds > out.civicRoleMediumOdds) throw new Error('runCivicRoleEngine_: civicRoleLargeOdds (' + out.civicRoleLargeOdds + ') above civicRoleMediumOdds (' + out.civicRoleMediumOdds + ') — the heavier event must be the rarer one (builder rule 2026-10-10)');
  return out;
}

// Band odds at this aura. Rule 2: P(S) >= P(M) >= P(L) always. Aura scales M and L
// together; if small would fall under medium, both are squeezed by one factor so
// small lands exactly on medium (the M:L ratio, and so M >= L, is kept).
function civicRoleBands_(cfg, aura) {
  var pL = cfg.civicRoleLargeOdds * aura;
  var pM = cfg.civicRoleMediumOdds * aura;
  if (1 - pL - pM < pM) { var k = 1 / (2 * pM + pL); pL *= k; pM *= k; }
  return { pL: pL, pM: pM, pS: 1 - pL - pM };
}

// POPID -> highest office Approval as the week opened (pre-queue sheet value). Missing = absent key.
function civicRoleApprovalByPop_(ctx) {
  var out = {};
  var sheet = ctx.ss ? ctx.ss.getSheetByName('Civic_Office_Ledger') : null;
  if (!sheet) throw new Error('runCivicRoleEngine_: Civic_Office_Ledger not found');
  var v = sheet.getDataRange().getValues();
  if (!v || v.length < 2) return out;
  var h = v[0], iPop = -1, iAppr = -1;
  for (var c = 0; c < h.length; c++) {
    var hn = String(h[c]).trim().toLowerCase();
    if (hn === 'popid') iPop = c;
    else if (hn === 'approval') iAppr = c;
  }
  if (iPop < 0 || iAppr < 0) throw new Error('runCivicRoleEngine_: Civic_Office_Ledger has no PopId / Approval header');
  for (var r = 1; r < v.length; r++) {
    var pop = String(v[r][iPop] || '').trim();
    var raw = String(v[r][iAppr] === null || v[r][iAppr] === undefined ? '' : v[r][iAppr]).trim();
    if (!pop || raw === '') continue;
    var a = Number(raw);
    if (!isFinite(a)) continue;
    if (!out.hasOwnProperty(pop) || a > out[pop]) out[pop] = a;
  }
  return out;
}

function civicRoleAura_(approval, tier, famous) {
  var aura = CIVIC_ROLE_AURA_BASE_;
  if (approval !== null && approval !== undefined) aura += CIVIC_ROLE_AURA_APPROVAL_ * Math.max(0, Math.min(100, approval)) / 100;
  aura += CIVIC_ROLE_AURA_TIER_[tier] || 0;
  if (famous) aura += CIVIC_ROLE_AURA_FAMOUS_;
  return aura;
}

// Each hood's place among all hoods this Cycle — top third / bottom third of the city's own
// spread (SIM_DOCTRINE §15: relative to the city's middle, never an absolute bar a prosperous
// city clears everywhere). Returns { hood: 1 | -1 } for the outer thirds; middle hoods absent.
function civicRoleThirds_(byHood, field) {
  var vals = [];
  for (var h in byHood) {
    if (!byHood.hasOwnProperty(h) || !byHood[h]) continue;
    var v = Number(byHood[h][field]);
    if (!isNaN(v)) vals.push({ h: h, v: v });
  }
  var out = {};
  if (vals.length < 3) return out;
  vals.sort(function(a, b) { return a.v - b.v; });
  var third = Math.floor(vals.length / 3);
  for (var i = 0; i < third; i++) out[vals[i].h] = -1;
  for (var j = vals.length - third; j < vals.length; j++) out[vals[j].h] = 1;
  return out;
}

// Candidate premises for one hood this Cycle: [{ key, lean }] — lean +1 good, -1 bad, 0 neutral.
// `bands` = { business: civicRoleThirds_(momentum, 'growth'), mood: civicRoleThirds_(dynamics, 'sentiment') }.
// Everyday life is always a candidate, so the week is not only the hood's headline.
function civicRolePremises_(S, hood, bands) {
  var out = [];
  var closedHere = 0, cl = S.businessClosures || [];
  for (var i = 0; i < cl.length; i++) if (cl[i] && cl[i].hood === hood) closedHere++;
  if (closedHere > 0) out.push({ key: 'closure', lean: -1 });
  else if (bands.business[hood]) out.push({ key: 'business', lean: bands.business[hood] });

  var crime = S.crimeMetrics && S.crimeMetrics.context && S.crimeMetrics.context.byHood && S.crimeMetrics.context.byHood[hood];
  if (crime && crime.trend === 'rising') out.push({ key: 'safety', lean: -1 });
  else if (crime && crime.trend === 'falling') out.push({ key: 'safety', lean: 1 });

  var ie = S.initiativeNeighborhoodEffects && S.initiativeNeighborhoodEffects[hood];
  if (ie && ie.advanced > 0) out.push({ key: 'initiative', lean: 1 });
  else if (ie && ie.sentiment < 0) out.push({ key: 'initiative', lean: -1 });

  if (bands.mood[hood]) out.push({ key: 'mood', lean: bands.mood[hood] });

  out.push({ key: 'everyday', lean: 0 });
  return out;
}

// ECL lines for civicRole.<premise>.<dir>: slot-free and unconditioned only (no evaluator here).
function civicRoleEclLines_(S, premise, dir) {
  var cl = S.contentLedger && S.contentLedger.lines;
  var lines = cl && cl['civicRole.' + premise + '.' + dir];
  var out = [];
  if (!lines) return out;
  for (var i = 0; i < lines.length; i++) {
    var e = lines[i];
    if (!e || !e.text || String(e.text).indexOf('$') >= 0) continue;
    if (e.conditions && e.conditions.length) continue;
    out.push({ text: String(e.text), weight: Number(e.weight) > 0 ? Number(e.weight) : 1 });
  }
  return out;
}

function civicRolePickText_(rng, S, premise, dir) {
  var pool = civicRoleEclLines_(S, premise, dir);
  if (!pool.length) {
    var hard = CIVIC_ROLE_TEXT_[premise][dir];
    if (!hard || !hard.length) hard = CIVIC_ROLE_TEXT_.everyday[dir];
    for (var i = 0; i < hard.length; i++) pool.push({ text: hard[i], weight: 1 });
  }
  var total = 0;
  for (var j = 0; j < pool.length; j++) total += pool[j].weight;
  var roll = rng() * total;
  for (var k = 0; k < pool.length; k++) {
    roll -= pool[k].weight;
    if (roll < 0) return pool[k].text;
  }
  return pool[pool.length - 1].text;
}

function runCivicRoleEngine_(ctx) {

  var rng = safeRand_(ctx);
  // Phase 42 §5.6: SL read/mutate via shared ctx.ledger; commit at Phase 10.
  if (!ctx.ledger) {
    throw new Error('runCivicRoleEngine_: ctx.ledger not initialized');
  }
  var header = ctx.ledger.headers;
  var rows = ctx.ledger.rows;
  if (!rows.length) return;

  var cfg = civicRoleConfig_(ctx);
  var idx = function(n) { return header.indexOf(n); };

  var iPopID = idx('POPID');
  var iFirst = idx('First');
  var iLast = idx('Last');
  var iCIV = idx('CIV (y/n)');
  var iStatus = idx('Status');
  var iLife = idx('LifeHistory');
  var iLastUpd = idx('LastUpdated');
  var iNeighborhood = idx('Neighborhood');
  var iTier = idx('Tier');
  var iFamous = idx('Famous');
  var required = { POPID: iPopID, First: iFirst, Last: iLast, 'CIV (y/n)': iCIV, Status: iStatus, LifeHistory: iLife,
                   LastUpdated: iLastUpd, Neighborhood: iNeighborhood, Tier: iTier, Famous: iFamous };
  var absent = [];
  for (var rk in required) if (required.hasOwnProperty(rk) && required[rk] < 0) absent.push(rk);
  if (absent.length) throw new Error('runCivicRoleEngine_: Simulation_Ledger missing ' + absent.join(', '));
  var skipped = [];

  var S = ctx.summary;
  var cycle = S.absoluteCycle || S.cycleId || ctx.config.cycleCount || 0;
  var approvalByPop = civicRoleApprovalByPop_(ctx);
  var bands = {
    business: civicRoleThirds_(S.hoodBusinessMomentum || {}, 'growth'),
    mood: civicRoleThirds_(S.neighborhoodDynamics || {}, 'sentiment')
  };
  var events = 0;

  for (var r = 0; r < rows.length; r++) {
    var row = rows[r];
    var civFlag = (row[iCIV] || "").toString().trim().toLowerCase();
    if (civFlag !== "y" && civFlag !== "yes" && civFlag !== "true") continue;
    var status = (row[iStatus] || "").toString().trim().toLowerCase();
    if (status !== "active") continue;

    var pop = String(row[iPopID] || '').trim();
    var name = (row[iFirst] + " " + row[iLast]).trim();
    var neighborhood = String(row[iNeighborhood] || '').trim();
    var tier = Number(row[iTier]);
    if (!pop || !neighborhood || !CIVIC_ROLE_AURA_TIER_.hasOwnProperty(tier)) { skipped.push(pop || ('row ' + (r + 2))); continue; }
    var famousCell = String(row[iFamous] || '').trim().toLowerCase();
    var famous = famousCell === 'y' || famousCell === 'yes' || famousCell === 'true';
    var approval = approvalByPop.hasOwnProperty(pop) ? approvalByPop[pop] : null;

    // Fire gate (rule 3): flat per citizen — a quiet week is the default.
    if (rng() >= cfg.civicRoleFireChance) continue;

    // Premise → sign → band (aura) → text.
    var premises = civicRolePremises_(S, neighborhood, bands);
    var premise = premises[Math.floor(rng() * premises.length)];
    var upChance = cfg.civicRoleUpChance + premise.lean * cfg.civicRolePremiseLean;
    upChance = Math.max(0.05, Math.min(0.95, upChance));
    var dir = rng() < upChance ? 'up' : 'down';

    var odds = civicRoleBands_(cfg, civicRoleAura_(approval, tier, famous));
    var bandRoll = rng();
    var band = bandRoll < odds.pL ? 'L' : (bandRoll < odds.pL + odds.pM ? 'M' : 'S');

    var tag = 'CivicRole-' + (dir === 'up' ? 'Up' : 'Down') + '-' + band;
    // A draw against the premise (a down week where crime is falling) stays true to the hood:
    // the text is an everyday moment and the hood is not pulsed against its own fact.
    var against = premise.lean !== 0 && (dir === 'up' ? -1 : 1) === premise.lean;
    var textKey = against ? 'everyday' : premise.key;
    var text = civicRolePickText_(rng, S, textKey, dir).replace(/\{hood\}/g, neighborhood);

    var stamp = inWorldStamp_(ctx);
    var existing = row[iLife] ? row[iLife].toString() : "";
    var finalLine = stamp + " — [" + tag + "] " + text;
    row[iLife] = existing ? existing + "\n" + finalLine : finalLine;
    row[iLastUpd] = ctx.now;

    queueAppendIntent_(
      ctx,
      'LifeHistory_Log',
      [ctx.now, row[iPopID], name, tag, text, neighborhood, cycle],
      'civic role event',
      'citizens'
    );

    // Public premises nudge the hood on the graded primary only (no prose / tag rules — T6-3).
    if (!against && CIVIC_ROLE_PUBLIC_[premise.key] && typeof recordPulse_ === 'function') {
      recordPulse_(S, neighborhood, tag, null, '');
    }

    rows[r] = row;
    S.eventsGenerated = (S.eventsGenerated || 0) + 1;
    events++;
  }

  if (skipped.length) Logger.log('runCivicRoleEngine_: skipped ' + skipped.length + ' Active CIV row(s) with no POPID, hood or Tier 1-4: ' + skipped.join(', '));

  // Phase 42 §5.6: flip ctx.ledger.dirty; consolidated commit at Phase 10.
  if (events > 0) {
    ctx.ledger.dirty = true;
  }
  ctx.summary = S;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    runCivicRoleEngine_: runCivicRoleEngine_,
    civicRolePremises_: civicRolePremises_,
    civicRoleThirds_: civicRoleThirds_,
    civicRoleAura_: civicRoleAura_,
    civicRoleBands_: civicRoleBands_,
    civicRoleConfig_: civicRoleConfig_,
    CIVIC_ROLE_REQUIRED_KEYS: CIVIC_ROLE_REQUIRED_KEYS,
    CIVIC_ROLE_TEXT_: CIVIC_ROLE_TEXT_
  };
}

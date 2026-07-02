/**
 * ============================================================================
 * compressLifeHistory.js v2.0 — citizen dial engine (engine.31 Phase 2, S253)
 * ============================================================================
 *
 * Scans LifeHistory and ACCRETES it into a per-citizen 7-dial trait profile.
 * TraitProfile is now the DERIVED readable face; the machine state (base+streak)
 * lives in the DialState column.
 *
 * v2.0 — STATEFUL inversion (the spine): the old behavior recomputed TraitProfile
 * from scratch every run (erase-and-rebuild — identity wiped each cycle). v2.0
 * never erases. It folds events LEAVING the raw-20 window into permanent `base`
 * dials (fold-on-trim — each event folded exactly once by construction, no
 * watermark / no double-count), runs the harden-on-streak mechanic, and derives
 * the readable face (Archetype + dials + Conduct seam) from `base`. Crime =
 * erosion of the integrity dial. Dial logic lives in citizenMemory.js +
 * citizenDialMap.js (globals in Apps Script; injected by the Node test).
 * REQUIRES a DialState column — inert no-op without it (never wipes; the column
 * is added at deploy alongside Phase 3 back-dating, which seeds `base` for all).
 * The v1.x trait-axis machinery below (TAG_TRAIT_MAP/computeProfile_/ARCHETYPES/
 * assignArchetype_/getModifiers_/extractMotifs_) is now DEAD — retained for a
 * separate measure-twiced cleanup commit, not wired into the v2.0 path.
 *
 * Scans LifeHistory and compresses accumulated events into a personality profile
 * stored in TraitProfile (or OriginVault fallback).
 *
 * v1.4 Upgrades (additive, ES5 safe):
 * - CivicRole space bug fix: 'Civic Role' (with space) added alongside 'CivicRole'
 * - 7 milestone tags: Graduation, Wedding, Birth, Promotion, Retirement, Health, Divorce
 * - 2 named-citizen tags: Lifestyle, Reputation
 * - 1 cultural tag: Cultural (written by 3 engines)
 * - 7 Education/Household subtags matching Career subtag pattern
 * - 12 dead mappings removed (source:*, relationship:*, arc:generic, qol:low/high)
 * - Compression frequency reduced 10→5 cycles (aligns with KEEP_RAW_ENTRIES window)
 *
 * v1.3 Upgrades (additive, ES5 safe):
 * - LifeHistory alignment: 14 missing tags added to TAG_TRAIT_MAP
 * - PostCareer cluster (10 variants) for retirement personality
 * - CivicRole + Civic Perception for civic service visibility
 * - GAME-Micro for sports integration, Quoted for journalist observations
 *
 * v1.2 Upgrades (additive, ES5 safe):
 * - Career Engine integration: TAG_TRAIT_MAP includes Career tags
 * - CareerState lines protected from trim (persist across compression)
 *
 * v1.1 Upgrades (additive, ES5 safe):
 * - Robust parsing (timestamps optional; supports [Tag] without timestamp)
 * - Detects and respects existing [Compressed: ...] blocks
 * - Optional time-aware decay via cycle timestamps (Basis:cycle) when present
 * - Adds metadata tokens: V, Basis, Hash (no schema changes)
 * - Motif extraction safer + slightly smarter
 * - Profile formatting more consistent, still pipe-delimited
 *
 * v1.0 Features (retained):
 * - Tag counting with 0.95 decay
 * - 7 archetypes: Connector, Watcher, Striver, Anchor, Catalyst, Caretaker, Drifter
 * - 5 trait axes: social, reflective, driven, grounded, volatile
 * - History trimming (keeps last 20 entries)
 *
 * Output example:
 * Archetype:Watcher|Mods:curious,steady|reflective:0.73|social:0.45|TopTags:Neighborhood,Weather,Arc|Motifs:coffee,gallery|Entries:47|Basis:entries|V:1.1|Hash:8f2c1a|Updated:c47
 *
 * @version 1.4
 * @phase utilities
 * ============================================================================
 */

// ============================================================================
// CONSTANTS
// ============================================================================

var COMPRESS_VERSION = '2.0';

// Decay per unit (entry or cycle depending on basis)
var TAG_DECAY_RATE = 0.95;

// Keep last N raw entries in LifeHistory
var KEEP_RAW_ENTRIES = 20;

// Minimum cycles between compression runs per citizen
var MIN_CYCLES_BETWEEN_COMPRESS = 5;

// --- Reflection write-back drain (citizen-loop research.14, S269) ---------------
// Wake reflections land a frozen dual tag in Reflection_Intake; the drain (composed
// INTO this compressor's per-row RMW — NOT a Phase-9 sibling, which would re-read
// pre-Phase-10 DialState and clobber the objective fold) accretes a small bounded
// fraction of the composed dual-tag deltas DIRECTLY into base (mood evaporates each
// compress; base is the only durable axis). REFLECTION_MULT discounts a subjective
// reflection below an objective event; REFLECTION_ACCRETION_FRAC sets how much of that
// reaches durable base per wake. Net per-dial base move = mapDelta x MULT x FRAC.
// Both are TUNABLE against the population composure distribution (S262 baseline:
// 0 volatile / 86% neutral / positive-skew) — a lone reflection must be a fraction of a
// band; a sustained run over N wakes a band move. Calibrate at smoke, not from theory.
var REFLECTION_INTAKE_TAB = 'Reflection_Intake';
var REFLECTION_MULT = 0.45;
var REFLECTION_ACCRETION_FRAC = 0.5;
// Reflection_Intake column layout (1-based): A ts | B popId | C cycle | D wake |
// E event | F snippet | G applied | H affect. (citizen-wake.js writer, S262.)
var RI_COL_POPID = 2, RI_COL_EVENT = 5, RI_COL_SNIPPET = 6, RI_COL_APPLIED = 7, RI_COL_AFFECT = 8;

// Default decay basis
var DEFAULT_DECAY_BASIS = 'entries';

// Stopwords for motif extraction
var MOTIF_STOPWORDS = {
  'the': true, 'and': true, 'with': true, 'from': true, 'into': true,
  'again': true, 'today': true, 'tonight': true, 'around': true, 'near': true
};

// Tag → Trait axis mappings
var TAG_TRAIT_MAP = {
  // Relationship-oriented
  'Relationship': { social: 0.8, reflective: 0.2 },
  'Alliance': { social: 0.8, driven: 0.3 },
  'Rivalry': { volatile: 0.6, driven: 0.4 },
  'Mentorship': { social: 0.5, reflective: 0.5 },

  // Community/Neighborhood
  'Neighborhood': { grounded: 0.7, social: 0.3 },
  'Community': { social: 0.7, grounded: 0.4 },

  // Reflective/Internal
  'Daily': { grounded: 0.5, reflective: 0.3 },
  'Background': { grounded: 0.4, reflective: 0.2 },
  'Household': { grounded: 0.6, social: 0.2 },
  'Education': { reflective: 0.7, driven: 0.4 },

  // Work/Achievement
  'Work': { driven: 0.8, grounded: 0.3 },
  'Arc': { driven: 0.5, volatile: 0.3 },

  // External/Reactive
  'Weather': { reflective: 0.4, grounded: 0.3 },
  'Media': { reflective: 0.5, volatile: 0.2 },

  // Calendar/Cultural
  'Holiday': { social: 0.5, grounded: 0.4 },
  'FirstFriday': { social: 0.6, reflective: 0.3 },
  'CreationDay': { grounded: 0.7, reflective: 0.3 },
  'Sports': { social: 0.5, volatile: 0.3 },

  // QoL
  'QoL': { grounded: 0.4, volatile: 0.3 },

  // Continuity
  'Continuity': { driven: 0.4, reflective: 0.3 },

  // Career (v1.2: Career Engine integration)
  'Career': { driven: 0.6, grounded: 0.3 },
  'Career-Transition': { volatile: 0.5, driven: 0.4 },
  'Career-Training': { driven: 0.5, reflective: 0.3 },
  'Career-FirstFriday': { social: 0.4, reflective: 0.3 },
  'Career-CreationDay': { grounded: 0.5, reflective: 0.4 },
  'Career-Holiday': { social: 0.4, grounded: 0.3 },

  // PostCareer / Retirement Lifestyle (v1.3)
  'PostCareer': { reflective: 0.5, grounded: 0.4 },
  'PostCareer-FirstFriday': { social: 0.6, reflective: 0.3 },
  'PostCareer-CreationDay': { grounded: 0.7, reflective: 0.3 },
  'PostCareer-Holiday': { social: 0.5, grounded: 0.4 },
  'PostCareer-Sports': { social: 0.5, volatile: 0.3 },
  'PostCareer-Travel': { reflective: 0.6, driven: 0.2 },
  'PostCareer-Fundraiser': { social: 0.7, driven: 0.4 },
  'PostCareer-Community': { social: 0.7, grounded: 0.4 },
  'PostCareer-Influence': { driven: 0.6, social: 0.3 },
  'PostCareer-Wellness': { grounded: 0.6, reflective: 0.4 },

  // Civic & Public Role (v1.3 + v1.4 space bug fix)
  'CivicRole': { driven: 0.6, social: 0.5 },
  'Civic Role': { driven: 0.6, social: 0.5 },
  'Civic Perception': { social: 0.6, reflective: 0.3 },

  // Media & Sports Integration (v1.3)
  'GAME-Micro': { social: 0.4, volatile: 0.3 },
  'Quoted': { reflective: 0.7, grounded: 0.3 },

  // Milestone Events (v1.4: from generationalEventsEngine.js)
  'Graduation': { driven: 0.7, reflective: 0.4 },
  'Wedding': { social: 0.8, grounded: 0.5 },
  'Birth': { grounded: 0.7, social: 0.5 },
  'Promotion': { driven: 0.8, grounded: 0.3 },
  'Retirement': { reflective: 0.6, grounded: 0.5 },
  'Health': { grounded: 0.4, volatile: 0.4 },
  'Divorce': { volatile: 0.6, reflective: 0.4 },

  // Named-Citizen Tags (v1.4; source generateNamedCitizensEvents.js DELETED
  // engine.38 — now emitted by generateCitizensEvents_ via source:fame ->
  // Reputation and nbhd-state -> Lifestyle/Community routing)
  'Lifestyle': { grounded: 0.5, social: 0.4 },
  'Reputation': { social: 0.5, driven: 0.4 },

  // Cultural Events (v1.4: written by 3 engines)
  'Cultural': { reflective: 0.5, social: 0.4 },

  // Education Subtags (v1.4: matching Career subtag pattern)
  'Education-FirstFriday': { social: 0.5, reflective: 0.3 },
  'Education-CreationDay': { grounded: 0.5, reflective: 0.4 },
  'Education-Holiday': { social: 0.4, reflective: 0.3 },
  'Education-Cultural': { reflective: 0.6, social: 0.3 },

  // Household Subtags (v1.4: matching Career subtag pattern)
  'Household-FirstFriday': { social: 0.5, grounded: 0.3 },
  'Household-CreationDay': { grounded: 0.6, social: 0.3 },
  'Household-Holiday': { social: 0.5, grounded: 0.4 },

  // Previous Evening carry-forward (v1.5: citizens reacting to last night's city)
  'PrevEvening': { social: 0.4, grounded: 0.3 }
};

// Archetypes
var ARCHETYPES = {
  'Connector': { social: 0.7, grounded: 0.4 },
  'Watcher': { reflective: 0.7, grounded: 0.3 },
  'Striver': { driven: 0.7, volatile: 0.3 },
  'Anchor': { grounded: 0.8, social: 0.3 },
  'Catalyst': { volatile: 0.6, social: 0.4 },
  'Caretaker': { social: 0.5, grounded: 0.5, reflective: 0.3 },
  'Drifter': { reflective: 0.4, volatile: 0.4 }
};

// Modifiers
var TRAIT_MODIFIERS = {
  social: ['warm', 'outgoing', 'connected'],
  reflective: ['thoughtful', 'observant', 'curious'],
  driven: ['ambitious', 'focused', 'determined'],
  grounded: ['steady', 'reliable', 'rooted'],
  volatile: ['restless', 'reactive', 'intense']
};

// ============================================================================
// MAIN FUNCTION
// ============================================================================

// Read unprocessed (applied != 'yes') Reflection_Intake rows, grouped by popId.
// Apps-Script-only sheet read (ctx.ss). Returns {} when ss/tab is absent (Node tests,
// fresh spreadsheet) so the objective compress path is byte-identical without reflections.
// NOTE: reads the full tab each cycle; the unprocessed set is small (~1k rows/yr at 3
// wakes/day) — a periodic prune of applied='yes' rows is a future hygiene item.
function readPendingReflections_(ctx) {
  var out = {};
  if (!ctx || !ctx.ss || typeof ctx.ss.getSheetByName !== 'function') return out;
  var sh = ctx.ss.getSheetByName(REFLECTION_INTAKE_TAB);
  if (!sh) return out;
  var values = sh.getDataRange().getValues();
  for (var r = 1; r < values.length; r++) {           // row 0 = header
    var vrow = values[r];
    var popId = vrow[RI_COL_POPID - 1];
    if (!popId) continue;
    if (String(vrow[RI_COL_APPLIED - 1] || '').toLowerCase() === 'yes') continue;
    var event = vrow[RI_COL_EVENT - 1];
    var affect = vrow[RI_COL_AFFECT - 1];
    if (!event && !affect) continue;                   // nothing composable
    if (!out[popId]) out[popId] = [];
    out[popId].push({
      rowNum: r + 1,                                   // 1-based sheet row
      event: event,
      affect: affect,
      text: vrow[RI_COL_SNIPPET - 1] || ''
    });
  }
  return out;
}

function compressLifeHistory_(ctx, options) {
  // DRY-RUN FIX: Skip direct sheet writes in dry-run mode
  var isDryRun = ctx.mode && ctx.mode.dryRun;
  if (isDryRun) {
    Logger.log('compressLifeHistory_: Skipping (dry-run mode)');
    return;
  }

  options = options || {};
  var trimHistory = options.trimHistory !== false;
  var forceAll = options.forceAll || false;

  // Phase 42 §5.6 (A3): SL read/mutate via shared ctx.ledger; commit at Phase 10.
  // Phase 9 — runs after all phase05 mutations; reads + writes route through
  // ctx.ledger. Phase 10 commit captures compress's mutations along with
  // every other writer's.
  if (!ctx.ledger) {
    throw new Error('compressLifeHistory_: ctx.ledger not initialized');
  }
  var S = ctx.summary || {};
  var cycle = S.absoluteCycle || S.cycleId || 0;

  var header = ctx.ledger.headers;
  var rows = ctx.ledger.rows;
  if (!rows.length) return;

  function idx(n) { return header.indexOf(n); }

  var iPopID = idx('POPID');
  var iLifeHistory = idx('LifeHistory');
  var iTraitProfile = idx('TraitProfile');
  if (iTraitProfile < 0) iTraitProfile = idx('OriginVault');
  var iDialState = idx('DialState');
  var iMemoryRegisters = idx('MemoryRegisters'); // engine.38 B1 (S283) — bias/unlived registers, col AX

  if (iPopID < 0 || iLifeHistory < 0) {
    Logger.log('compressLifeHistory_: Missing required columns');
    return;
  }
  if (iTraitProfile < 0) {
    Logger.log('compressLifeHistory_: No TraitProfile or OriginVault column found');
    return;
  }
  // v2.0 stateful accretion REQUIRES a persistence column. Without it the dial
  // engine cannot carry `base` across runs — re-deriving from neutral every cycle
  // would silently WIPE back-dated identity. Inert no-op until DialState exists
  // (added at deploy alongside Phase 3 back-dating). Fail-safe: never wipe.
  if (iDialState < 0) {
    Logger.log('compressLifeHistory_ v' + COMPRESS_VERSION + ': DialState column absent — inert (no-op) until added (deploy w/ back-dating).');
    return;
  }

  var updated = 0;
  var skipped = 0;

  // Reflection write-back drain (research.14 S269): one cheap read of the intake tab,
  // grouped by popId. {} when ss/tab absent — keeps the objective path byte-identical.
  var pendingByPop = readPendingReflections_(ctx);
  // composer is an Apps Script global; typeof-guard keeps the objective path alive in any
  // harness where the reflection surface isn't loaded (drain simply stays dormant).
  var reflectionDialMap = (typeof nudgesForReflection_ !== 'undefined') ? { nudgesForReflection_: nudgesForReflection_ } : null;
  var reflectionsMoved = 0, reflectionCitizens = 0;

  // engine.38 B1 (S283): bias-intent drain. Phase-5 generators tally drawn
  // opinion events into S.biasIntents {popId: [{t,s,o}]}; the tally is
  // cycle-scoped (dies with ctx.summary), so it drains HERE unconditionally —
  // same shape as the reflection drain: a compress-skipped or cadence-gated
  // citizen must not lose intents. Inert when the MemoryRegisters column is
  // absent (fail-safe, never wipe — the DialState precedent).
  var biasIntentsByPop = (iMemoryRegisters >= 0 && S.biasIntents) ? S.biasIntents : {};
  if (iMemoryRegisters < 0 && S.biasIntents) {
    Logger.log('compressLifeHistory_: MemoryRegisters column absent — bias intents dropped this cycle.');
  }
  var biasApplied = 0, biasCitizens = 0;
  var unlivedApplied = 0; // engine.38 B3 (S283) — branch events captured at fold

  for (var r = 0; r < rows.length; r++) {
    var row = rows[r];
    var popId = row[iPopID];
    if (!popId) continue;

    var lifeHistory = row[iLifeHistory] ? String(row[iLifeHistory]) : '';
    var existingProfile = row[iTraitProfile] ? String(row[iTraitProfile]) : '';
    var existingDialState = row[iDialState] ? String(row[iDialState]) : '';
    var pending = pendingByPop[popId] || [];
    var biasPending = biasIntentsByPop[popId] || [];

    // Compress eligibility — gates ONLY the objective fold/face/trim, NOT the reflection
    // drain. A sparsely-active (<3 entries) or cadence-skipped citizen still accretes
    // pending reflections into base, else the sparsest-woken — the ones the loop exists
    // to reach — would never durably register a reflection (S269 finding 2).
    var compressEligible = !!lifeHistory;
    if (compressEligible && !forceAll && existingProfile) {
      // cadence guard: at most once per MIN_CYCLES_BETWEEN_COMPRESS (reads Updated:cN off the face)
      var lastUpdate = parseLastUpdateCycle_(existingProfile);
      if (lastUpdate > 0 && (cycle - lastUpdate) < MIN_CYCLES_BETWEEN_COMPRESS) compressEligible = false;
    }
    var entries = null;
    if (compressEligible) {
      entries = parseLifeHistoryEntries_(lifeHistory).entries;
      if (!entries || entries.length < 3) compressEligible = false;
    }

    if (!compressEligible && !pending.length && !biasPending.length) { skipped++; continue; }

    // Load persisted dial state (base + streak); neutral if absent/corrupt. `mood`
    // is NOT persisted — base is the permanent self, mood is a re-derivable swing.
    var c = deserialize_(parseDialState_(existingDialState));

    // engine.42 chaos-trauma (S275): chaos-free time heals. Lazily fade the persisted
    // chaos accumulator (and lift the labeled break) so positive folds + quiet weeks recover
    // a citizen instead of locking trauma — the symmetric counterpart to chaos-cars accrual.
    // Gap-based, so a citizen compressed every few cycles still decays at the right rate.
    decayChaosExposure_(c, cycle);

    // engine.38 B1+B3 (S283): ONE parse of the register cell serves both the
    // unlived capture (fold-time, below) and the bias drain; written back only
    // when a fold actually changed it — blank cells stay blank, no churn.
    var regs = (iMemoryRegisters >= 0 && (compressEligible || biasPending.length))
      ? parseMemoryRegisters_(row[iMemoryRegisters]) : null;
    var regsDirty = false;

    if (compressEligible) {
      // FOLD-ON-TRIM (the stateful spine): events LEAVING the raw-20 window accrete
      // into base + streak, each folded exactly once by construction (the window
      // physically removes them on trim). No watermark, no double-count. Inert tags
      // (Compressed / CareerState / edition citations) map to {} -> no movement.
      // B3 rides the same walk: branch-tagged aged-out events -> regs.unlived.
      var unlivedCaptured = foldAgedOutEntries_(c, entries, KEEP_RAW_ENTRIES, regs);
      if (unlivedCaptured > 0) { unlivedApplied += unlivedCaptured; regsDirty = true; }
      zeroMood_(c); // aged-out events leave no lingering mood; base carries the permanent mark
    }

    // Accrete pending reflections into base BEFORE deriving the face, so the readable
    // face and DialState agree in-cycle. Mark each drained row applied='yes' via a
    // Phase-10 cell intent — idempotent ACROSS cycles (next cycle skips applied='yes').
    // NOT atomic with the DialState (ledger) write: the two land in separate per-tab
    // executeSheetIntents_ passes, so a mid-Phase-10 crash leaves a bounded sub-point
    // single-dial double-/under-count window — accepted (see header note + plan).
    if (pending.length) {
      reflectionsMoved += accreteReflectionsIntoBase_(c, pending, reflectionDialMap, REFLECTION_MULT, REFLECTION_ACCRETION_FRAC);
      reflectionCitizens++;
      for (var p = 0; p < pending.length; p++) {
        queueCellIntent_(ctx, REFLECTION_INTAKE_TAB, pending[p].rowNum, RI_COL_APPLIED, 'yes',
          'reflection-drain accreted (citizen-loop)', 'citizens', 100);
      }
    }

    // engine.38 B1 (S283): fold this citizen's bias intents into the register.
    // Sentiment lives in MemoryRegisters.biases ONLY — it never touches `c`
    // (dials): opinion is not identity. Fold-once by construction: the tally
    // is drained exactly once per cycle and dies with ctx.summary.
    if (biasPending.length && regs) {
      var biasN = foldBiasIntents_(regs, biasPending, cycle);
      if (biasN > 0) { biasApplied += biasN; regsDirty = true; }
      biasCitizens++;
    }

    if (regsDirty) row[iMemoryRegisters] = JSON.stringify(regs);

    if (compressEligible) {
      // derive the readable face from BASE (stable identity, no run-to-run flicker)
      row[iTraitProfile] = formatDialFace_(c, entries, cycle);
      if (trimHistory && entries.length > KEEP_RAW_ENTRIES) {
        row[iLifeHistory] = trimLifeHistory_(entries, KEEP_RAW_ENTRIES, dialFaceShim_(c), cycle);
      }
    }

    row[iDialState] = serializeDialState_(c);
    rows[r] = row;
    updated++;
  }

  // Phase 42 §5.6: flip ctx.ledger.dirty; consolidated commit at Phase 10.
  if (updated > 0) {
    ctx.ledger.dirty = true;
  }

  S.lifeHistoryCompression = {
    cycle: cycle,
    updated: updated,
    skipped: skipped,
    reflectionsMoved: reflectionsMoved,
    reflectionCitizens: reflectionCitizens,
    biasApplied: biasApplied,
    biasCitizens: biasCitizens,
    unlivedApplied: unlivedApplied,
    version: COMPRESS_VERSION
  };

  ctx.summary = S;
  Logger.log('compressLifeHistory_ v' + COMPRESS_VERSION + ': Updated ' + updated + ', skipped ' + skipped +
    ', reflections ' + reflectionsMoved + '/' + reflectionCitizens + ' citizens' +
    ', biases ' + biasApplied + '/' + biasCitizens + ' citizens' +
    ', unlived ' + unlivedApplied);
}

// ============================================================================
// PARSING
// ============================================================================

function parseLifeHistoryEntries_(historyStr) {
  var entries = [];
  var lines = String(historyStr || '').split('\n');
  var hasCycleMarkers = false;

  for (var i = 0; i < lines.length; i++) {
    var line = String(lines[i] || '').trim();
    if (!line) continue;

    var entry = parseHistoryLine_(line);
    if (entry) {
      if (entry.cycle !== null && entry.cycle !== undefined) hasCycleMarkers = true;
      entries.push(entry);
    }
  }

  return { entries: entries, hasCycleMarkers: hasCycleMarkers };
}

function parseHistoryLine_(line) {
  // Existing compressed block
  if (line.indexOf('[Compressed:') === 0) {
    return {
      timestamp: null,
      cycle: null,
      tag: 'Compressed',
      text: line,
      raw: line
    };
  }

  // Standard: "YYYY-MM-DD HH:MM — [Tag] text"
  var standardMatch = line.match(/^(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2})\s*[—-]\s*\[([^\]]+)\]\s*(.*)$/);
  if (standardMatch) {
    var cycleNum = extractCycleNumber_(standardMatch[3]);
    return {
      timestamp: standardMatch[1],
      cycle: cycleNum,
      tag: standardMatch[2],
      text: standardMatch[3],
      raw: line
    };
  }

  // In-world stamps: "Y2C48 — [Tag] text" / "C100 — [Tag] text" / "C? — [Tag] text"
  // — inWorldStamp_ (advanceSimulationCalendar.js) formats used by EVERY Phase 4/5
  // LifeHistory writer since S264 ES-1. Without this branch these lines parsed as
  // Untagged: fold tag-routing degraded to content-regex fallback, TopTags filled
  // with Untagged, and the B3 unlived capture would never fire (S283 measure-twice
  // find). Cycle comes from the stamp itself: absolute for "C100"; "Y2C48" converts
  // via the calendar canon absolute = (year-1)*52 + cycleOfYear; "C?" -> null.
  var inWorldMatch = line.match(/^(?:Y(\d+))?C(\d+|\?)\s*[—-]\s*\[([^\]]+)\]\s*(.*)$/);
  if (inWorldMatch) {
    var inWorldCycle = null;
    if (inWorldMatch[2] !== '?') {
      inWorldCycle = parseInt(inWorldMatch[2], 10);
      if (inWorldMatch[1]) inWorldCycle = (parseInt(inWorldMatch[1], 10) - 1) * 52 + inWorldCycle;
    }
    return {
      timestamp: null,
      cycle: inWorldCycle,
      tag: inWorldMatch[3],
      text: inWorldMatch[4],
      raw: line
    };
  }

  // Alternate: "[Tag] text" (no timestamp)
  var tagOnly = line.match(/^\[([^\]]+)\]\s*(.*)$/);
  if (tagOnly) {
    var cycleNum2 = extractCycleNumber_(tagOnly[2]);
    return {
      timestamp: null,
      cycle: cycleNum2,
      tag: tagOnly[1],
      text: tagOnly[2],
      raw: line
    };
  }

  // Engine event format
  var engineMatch = line.match(/^Engine\s+Event:\s*(.*)$/i);
  if (engineMatch) {
    return {
      timestamp: null,
      cycle: extractCycleNumber_(engineMatch[1]),
      tag: 'EngineEvent',
      text: engineMatch[1],
      raw: line
    };
  }

  // Birth line
  if (/^Born\s+into\s+population/i.test(line)) {
    return { timestamp: null, cycle: extractCycleNumber_(line), tag: 'Birth', text: line, raw: line };
  }

  // Arrival format
  if (/^Arrived\s+in\s+Oakland/i.test(line)) {
    return { timestamp: null, cycle: extractCycleNumber_(line), tag: 'Arrival', text: line, raw: line };
  }

  // Fallback: untagged
  return {
    timestamp: null,
    cycle: extractCycleNumber_(line),
    tag: 'Untagged',
    text: line,
    raw: line
  };
}

function extractCycleNumber_(text) {
  if (!text) return null;
  var m = String(text).match(/Cycle\s+(\d+)/i);
  if (m && m[1]) return parseInt(m[1], 10);
  return null;
}

function parseLastUpdateCycle_(profileStr) {
  var match = String(profileStr || '').match(/Updated:c(\d+)/);
  if (match) return parseInt(match[1], 10);
  return 0;
}

// ============================================================================
// PROFILE COMPUTATION
// ============================================================================

function computeProfile_(entries, currentCycle, basis) {
  var tagCounts = {};
  var traitScores = { social: 0, reflective: 0, driven: 0, grounded: 0, volatile: 0 };
  var motifCounts = {};

  for (var i = 0; i < entries.length; i++) {
    var entry = entries[i];

    var weight = 1;
    if (basis === 'cycle') {
      var entryCycle = (entry.cycle !== null && entry.cycle !== undefined) ? entry.cycle : null;
      var ageCycles = (entryCycle !== null) ? Math.max(0, currentCycle - entryCycle) : (entries.length - i);
      weight = Math.pow(TAG_DECAY_RATE, ageCycles);
    } else {
      var ageEntries = (entries.length - i);
      weight = Math.pow(TAG_DECAY_RATE, ageEntries);
    }

    var tag = String(entry.tag || 'Untagged');
    tagCounts[tag] = (tagCounts[tag] || 0) + weight;

    applyTagToTraits_(tag, weight, traitScores);
    extractMotifs_(entry.text, weight, motifCounts);
  }

  // Normalize trait scores
  var maxTrait = 0;
  for (var t in traitScores) {
    if (traitScores.hasOwnProperty(t) && traitScores[t] > maxTrait) maxTrait = traitScores[t];
  }
  if (maxTrait > 0) {
    for (var t2 in traitScores) {
      if (!traitScores.hasOwnProperty(t2)) continue;
      traitScores[t2] = round2_(traitScores[t2] / maxTrait);
    }
  }

  var archetype = assignArchetype_(traitScores);
  var modifiers = getModifiers_(traitScores, archetype);

  var topTags = getTopN_(tagCounts, 5);
  var topMotifs = getTopN_(motifCounts, 3);

  return {
    archetype: archetype,
    modifiers: modifiers,
    traitScores: traitScores,
    topTags: topTags,
    topMotifs: topMotifs,
    entryCount: entries.length
  };
}

function applyTagToTraits_(tag, weight, traitScores) {
  var mapping = TAG_TRAIT_MAP[tag];
  if (!mapping) return;
  for (var trait in mapping) {
    if (!mapping.hasOwnProperty(trait)) continue;
    traitScores[trait] = (traitScores[trait] || 0) + (mapping[trait] * weight);
  }
}

function extractMotifs_(text, weight, motifCounts) {
  if (!text) return;
  var lower = String(text).toLowerCase();

  var venuePatterns = [
    'corner store', 'local park', 'coffee', 'cafe', 'gallery',
    'library', 'church', 'school', 'downtown', 'waterfront',
    'lake', 'lakeside', 'bart', 'theater', 'fox theater',
    'community', 'neighborhood'
  ];

  for (var i = 0; i < venuePatterns.length; i++) {
    var p = venuePatterns[i];
    if (lower.indexOf(p) >= 0) {
      motifCounts[p] = (motifCounts[p] || 0) + weight;
    }
  }

  var actionPatterns = [
    'reached out', 'quiet moment', 'reflected', 'noticed', 'adjusted',
    'tension', 'pressure', 'unwinding', 'supportive', 'collaborated'
  ];
  for (var j = 0; j < actionPatterns.length; j++) {
    var a = actionPatterns[j];
    if (lower.indexOf(a) >= 0) {
      motifCounts[a] = (motifCounts[a] || 0) + weight;
    }
  }

  var nearMatch = lower.match(/\b(near|at)\s+([a-z0-9'\s]{3,24})/i);
  if (nearMatch && nearMatch[2]) {
    var phrase = sanitizeMotif_(nearMatch[2]);
    if (phrase && !MOTIF_STOPWORDS[phrase]) {
      motifCounts[phrase] = (motifCounts[phrase] || 0) + (weight * 0.6);
    }
  }
}

function sanitizeMotif_(s) {
  if (!s) return null;
  var out = String(s).replace(/[^\w'\s]/g, '').trim();
  if (out.length < 3) return null;
  if (out.length > 24) out = out.substring(0, 24).trim();
  out = out.replace(/\s+/g, ' ');
  return out;
}

function assignArchetype_(traitScores) {
  var best = 'Drifter';
  var bestScore = -1;

  for (var a in ARCHETYPES) {
    if (!ARCHETYPES.hasOwnProperty(a)) continue;

    var req = ARCHETYPES[a];
    var score = 0;
    var matches = 0;

    for (var trait in req) {
      if (!req.hasOwnProperty(trait)) continue;
      var required = req[trait];
      var actual = traitScores[trait] || 0;
      if (actual >= required * 0.7) {
        score += actual;
        matches++;
      }
    }

    if (matches > 0 && score > bestScore) {
      bestScore = score;
      best = a;
    }
  }

  return best;
}

function getModifiers_(traitScores, archetype) {
  var sorted = [];
  for (var trait in traitScores) {
    if (!traitScores.hasOwnProperty(trait)) continue;
    sorted.push({ trait: trait, score: traitScores[trait] });
  }
  sorted.sort(function(a, b) { return b.score - a.score; });

  // Traits defining each archetype (don't repeat as modifiers)
  var archetypeCore = {
    Connector: { social: true },
    Watcher: { reflective: true },
    Striver: { driven: true },
    Anchor: { grounded: true },
    Catalyst: { volatile: true },
    Caretaker: { social: true, grounded: true },
    Drifter: {}
  };

  var skip = archetypeCore[archetype] || {};
  var modifiers = [];

  for (var i = 0; i < sorted.length && modifiers.length < 2; i++) {
    var tr = sorted[i].trait;
    var sc = sorted[i].score;
    if (sc < 0.3) continue;
    if (skip[tr]) continue;

    var words = TRAIT_MODIFIERS[tr];
    if (!words || !words.length) continue;

    var idx = (sc >= 0.7) ? 0 : (sc >= 0.5 ? 1 : 2);
    idx = Math.min(idx, words.length - 1);
    modifiers.push(words[idx]);
  }

  return modifiers;
}

function getTopN_(counts, n) {
  var items = [];
  for (var key in counts) {
    if (!counts.hasOwnProperty(key)) continue;
    items.push({ key: key, count: counts[key] });
  }
  items.sort(function(a, b) { return b.count - a.count; });

  var out = [];
  for (var i = 0; i < Math.min(n, items.length); i++) out.push(items[i].key);
  return out;
}

function round2_(n) {
  return Math.round(n * 100) / 100;
}

// ============================================================================
// OUTPUT FORMATTING
// ============================================================================

function formatProfileString_(profile, cycle, basis) {
  var parts = [];

  parts.push('Archetype:' + profile.archetype);

  if (profile.modifiers && profile.modifiers.length) {
    parts.push('Mods:' + profile.modifiers.join(','));
  }

  for (var trait in profile.traitScores) {
    if (!profile.traitScores.hasOwnProperty(trait)) continue;
    var score = profile.traitScores[trait];
    if (score >= 0.3) {
      parts.push(trait + ':' + score.toFixed(2));
    }
  }

  if (profile.topTags && profile.topTags.length) parts.push('TopTags:' + profile.topTags.join(','));
  if (profile.topMotifs && profile.topMotifs.length) parts.push('Motifs:' + profile.topMotifs.join(','));

  parts.push('Entries:' + profile.entryCount);
  parts.push('Basis:' + (basis || 'entries'));
  parts.push('V:' + COMPRESS_VERSION);
  parts.push('Hash:' + shortHash_(parts.join('|')));
  parts.push('Updated:c' + cycle);

  return parts.join('|');
}

function shortHash_(s) {
  s = String(s || '');
  var h = 5381;
  for (var i = 0; i < s.length; i++) {
    h = ((h << 5) + h) + s.charCodeAt(i);
    h = h & 0xFFFFFFFF;
  }
  var hex = (h >>> 0).toString(16);
  while (hex.length < 6) hex = '0' + hex;
  return hex.substring(0, 6);
}

// ============================================================================
// TRIMMING
// ============================================================================

function trimLifeHistory_(entries, keepCount, profile, cycle) {
  // Extract CareerState lines - these must persist (Career Engine reads them back)
  var careerStateEntry = null;
  var filteredEntries = [];
  for (var k = 0; k < entries.length; k++) {
    if (entries[k].tag === 'CareerState') {
      careerStateEntry = entries[k]; // Keep most recent CareerState
    } else {
      filteredEntries.push(entries[k]);
    }
  }

  if (filteredEntries.length <= keepCount) {
    var lines = [];
    if (careerStateEntry) lines.push(careerStateEntry.raw);
    for (var i = 0; i < filteredEntries.length; i++) lines.push(filteredEntries[i].raw);
    return lines.join('\n');
  }

  var oldCount = filteredEntries.length - keepCount;
  var oldEntries = filteredEntries.slice(0, oldCount);
  var recentEntries = filteredEntries.slice(oldCount);

  var compressedLine = createCompressedBlock_(oldEntries, profile, cycle);

  var newLines = [];
  if (careerStateEntry) newLines.push(careerStateEntry.raw);
  newLines.push(compressedLine);
  for (var j = 0; j < recentEntries.length; j++) newLines.push(recentEntries[j].raw);

  return newLines.join('\n');
}

function createCompressedBlock_(oldEntries, profile, cycle) {
  var tagCounts = {};
  for (var i = 0; i < oldEntries.length; i++) {
    var tag = oldEntries[i].tag;
    tagCounts[tag] = (tagCounts[tag] || 0) + 1;
  }

  var topTags = getTopN_(tagCounts, 3);

  var firstDate = '?';
  var lastDate = '?';
  for (var a = 0; a < oldEntries.length; a++) {
    if (oldEntries[a].timestamp) { firstDate = oldEntries[a].timestamp; break; }
  }
  for (var b = oldEntries.length - 1; b >= 0; b--) {
    if (oldEntries[b].timestamp) { lastDate = oldEntries[b].timestamp; break; }
  }

  var mods = (profile.modifiers && profile.modifiers.length) ? (' | Mods:' + profile.modifiers.join(',')) : '';
  var motifs = (profile.topMotifs && profile.topMotifs.length) ? (' | Motifs:' + profile.topMotifs.join(',')) : '';

  return '[Compressed: ' + oldEntries.length +
    ' entries | ' + firstDate + ' → ' + lastDate +
    ' | Dominant:' + topTags.join(',') +
    ' | Archetype:' + profile.archetype +
    mods + motifs +
    ' | AsOf:c' + cycle + ']';
}

// ============================================================================
// ACCESSOR (for event generation)
// ============================================================================

function getCitizenArchetype_(ctx, popId) {
  if (ctx._archetypeCache && ctx._archetypeCache[popId]) return ctx._archetypeCache[popId];
  if (!ctx._archetypeCache) ctx._archetypeCache = {};

  var citizen = ctx.citizenLookup && ctx.citizenLookup[popId];
  if (!citizen || !citizen.TraitProfile) return null;

  var profile = parseProfileString_(citizen.TraitProfile);
  ctx._archetypeCache[popId] = profile;
  return profile;
}

// engine.31 Phase 5 — the event-bias SEAM engine.32 reads.
// Reads the AUTHORITATIVE DialState (machine truth), NOT the derived TraitProfile
// face string, and returns the band surface generators consume. Cached per ctx
// like the archetype. Returns null when DialState is absent/empty (pre-deploy, or
// a never-seeded citizen) — engine.32 generators treat null as "use base rates."
// Contract (criterion 8): Integrity low band -> crime reachable; Drive band ->
// career-event frequency; Family band -> birth/marriage frequency. Generation
// itself lives in engine.32; this only EXPOSES the read surface.
// dialStrOpt (engine.32 T5): generators that iterate ledger rows directly
// (phase04 + the phase05 life engines run before citizenLookup is built) pass
// the row's DialState cell — citizenLookup stays the lookup of record when
// present, the override fills the phase-order gap. Same cache either way.
function getCitizenDialBands_(ctx, popId, dialStrOpt) {
  if (!ctx._dialBandCache) ctx._dialBandCache = {};
  if (ctx._dialBandCache.hasOwnProperty(popId)) return ctx._dialBandCache[popId];

  var citizen = ctx.citizenLookup && ctx.citizenLookup[popId];
  var dialStr = (citizen && citizen.DialState) || dialStrOpt;
  if (!dialStr) { ctx._dialBandCache[popId] = null; return null; }

  var parsed = parseDialState_(dialStr);
  if (!parsed.base) { ctx._dialBandCache[popId] = null; return null; }

  var c = deserialize_(parsed);
  var bands = {}, mult = {};
  for (var i = 0; i < DIALS.length; i++) {
    var d = DIALS[i];
    bands[d] = band_(c, d);            // signed -2..+2 (readable / engine.32)
    mult[d] = bandMultiplier_(c, d);   // 0.5..1.5 event-probability multiplier
  }
  var result = {
    bands: bands,
    mult: mult,
    crimeReachable: bandIndex_(current_(c, 'integrity')) <= 0, // low band gates crime at all
    careerFreq: mult.drive,                                    // Drive -> career events
    familyFreq: mult.family                                    // Family-oriented -> birth/marriage
  };
  ctx._dialBandCache[popId] = result;
  return result;
}

function parseProfileString_(profileStr) {
  if (!profileStr) return null;

  var result = { archetype: 'Drifter', modifiers: [], traits: {}, meta: {} };
  var parts = String(profileStr).split('|');

  for (var i = 0; i < parts.length; i++) {
    var part = parts[i];
    var colonIdx = part.indexOf(':');
    if (colonIdx < 0) continue;

    var key = part.substring(0, colonIdx);
    var value = part.substring(colonIdx + 1);

    if (key === 'Archetype') result.archetype = value;
    else if (key === 'Mods') result.modifiers = value ? value.split(',') : [];
    else if (key === 'TopTags' || key === 'Motifs' || key === 'Entries' || key === 'Updated' || key === 'Basis' || key === 'V' || key === 'Hash' || key === 'Conduct') {
      result.meta[key] = value;
    } else {
      result.traits[key] = parseFloat(value) || 0;
    }
  }
  return result;
}

// ============================================================================
// DIAL ENGINE BRIDGE (v2.0 — engine.31 Phase 2, S253)
// ----------------------------------------------------------------------------
// Pure-logic dial functions live in citizenMemory.js (newCitizen_/deserialize_/
// applyEvent_/band_/bandIndex_/describe_/DIALS) + citizenDialMap.js
// (nudgesForEvent_). In Apps Script all are globals (same project scope); in
// Node the test injects them onto global before requiring this file.
// ============================================================================

// DialState cell (JSON {base, streak}) -> object; corrupt/empty -> {} (neutral
// seed; back-dating re-seeds, so a parse failure degrades gracefully not loudly).
function parseDialState_(str) {
  if (!str) return {};
  try {
    var o = JSON.parse(str);
    return (o && typeof o === 'object') ? o : {};
  } catch (e) { return {}; }
}

// persist base + streak ONLY (mood is a re-derivable window swing, never stored).
// chaosExposure (engine.42 chaos-trauma, S275) rides along when present — additive,
// backward-compatible; old rows lack it and deserialize to no exposure.
function serializeDialState_(c) {
  var o = { base: c.base, streak: c.streak };
  if (c.chaosExposure) o.chaosExposure = c.chaosExposure;
  return JSON.stringify(o);
}

function zeroMood_(c) {
  for (var i = 0; i < DIALS.length; i++) c.mood[DIALS[i]] = 0;
}

// MemoryRegisters cell (JSON {biases:[], unlived:[]}) -> object; corrupt/empty
// -> fresh registers (DialState-pattern degrade: graceful, never loud). Additive:
// unknown top-level fields survive the round-trip untouched (engine.38 B3's
// unlived array shares this cell — B1 only ever writes .biases).
function parseMemoryRegisters_(str) {
  var o = null;
  if (str) {
    try { o = JSON.parse(String(str)); } catch (e) { o = null; }
  }
  if (!o || typeof o !== 'object' || Array.isArray(o)) o = {};
  if (!Array.isArray(o.biases)) o.biases = [];
  if (!Array.isArray(o.unlived)) o.unlived = [];
  return o;
}

// Design B1 asymmetric-bias fold (seams plan 2026-07-01). Record shape:
// {t: target, s: -3..3 sentiment, o: origin, r: reinforce-count,
//  c: challenge-count, cy: last-touched cycle}. Rules:
//   same sign (or undecided s==0) -> r++, s steps 0.5 toward the pole, |s|<=3
//   opposite sign -> c++, s steps 1.0 toward 0 — challenge OUTWEIGHS
//     reinforcement (the asymmetry); reaching/crossing 0 resets r/c to 0/0,
//     crossing flips allegiance
//   new target -> insert at intent sign; cap 5, evict lowest |s| oldest first
// Sentiment is bias-local — NEVER written to dials (opinion is not identity).
var BIAS_CAP = 5;
var BIAS_S_MAX = 3;
function foldBiasIntents_(regs, intents, cycle) {
  var applied = 0;
  for (var i = 0; i < intents.length; i++) {
    var it = intents[i];
    if (!it || !it.t) continue;
    var s = (Number(it.s) > 0) ? 1 : -1;
    var rec = null;
    for (var b = 0; b < regs.biases.length; b++) {
      if (regs.biases[b] && regs.biases[b].t === it.t) { rec = regs.biases[b]; break; }
    }
    if (!rec) {
      regs.biases.push({ t: String(it.t), s: s, o: String(it.o || ''), r: 0, c: 0, cy: cycle });
      applied++;
      continue;
    }
    var old = Number(rec.s) || 0;
    if (old === 0 || (old > 0) === (s > 0)) {
      rec.r = (Number(rec.r) || 0) + 1;
      rec.s = Math.max(-BIAS_S_MAX, Math.min(BIAS_S_MAX, old + 0.5 * s));
    } else {
      rec.c = (Number(rec.c) || 0) + 1;
      var next = old + 1.0 * s;
      if (old * next < 0 || next === 0) { rec.r = 0; rec.c = 0; } // hit/crossed zero: counters reset (flip on cross)
      rec.s = next;
    }
    rec.cy = cycle;
    applied++;
  }
  // cap: evict lowest |s|, oldest (smallest cy) breaking ties
  while (regs.biases.length > BIAS_CAP) {
    var evict = 0;
    for (var e = 1; e < regs.biases.length; e++) {
      var aAbs = Math.abs(Number(regs.biases[e].s) || 0);
      var wAbs = Math.abs(Number(regs.biases[evict].s) || 0);
      if (aAbs < wAbs || (aAbs === wAbs && (Number(regs.biases[e].cy) || 0) < (Number(regs.biases[evict].cy) || 0))) evict = e;
    }
    regs.biases.splice(evict, 1);
  }
  return applied;
}

// Fold events LEAVING the raw window into base+streak. Mirrors the EXACT
// oldEntries split trimLifeHistory_ uses (CareerState excluded + persisted), so
// fold and trim always agree on what ages out — each aged-out event folds once.
//
// engine.38 B3 (seams Task 8, S283): the same walk captures branch-shaped events
// into regs.unlived — paths not taken, persisted as the ACTUAL recorded event
// ({tag, txt, cy}), never a counterfactual (the vague voice is composed at read
// time — lib/resonanceRecall.unlivedCandidates). Capture rides the fold-once
// trim path by construction: an event leaves the window exactly once. Cap 3,
// oldest evicted (captures append chronologically — entries fold oldest-first).
// regs is optional: null (column absent / caller predates B3) -> fold-only.
// Returns the number of unlived entries captured (0 when regs is null).
var UNLIVED_CAP = 3;
var UNLIVED_TXT_MAX = 120;
var UNLIVED_BRANCH_TAGS = { careershift: 1, relocation: 1, divorce: 1, retirement: 1, businessclose: 1, displacementmove: 1 };
function foldAgedOutEntries_(c, entries, keepCount, regs) {
  var filtered = [];
  for (var k = 0; k < entries.length; k++) {
    if (entries[k].tag !== 'CareerState') filtered.push(entries[k]);
  }
  if (filtered.length <= keepCount) return 0; // nothing ages out -> nothing folds
  var oldCount = filtered.length - keepCount;
  var captured = 0;
  for (var i = 0; i < oldCount; i++) {
    var e = filtered[i];
    applyEvent_(c, { label: e.tag, effects: nudgesForEvent_(e.tag, 1, e.text) }); // structural markers -> {} no-op
    if (regs && UNLIVED_BRANCH_TAGS[String(e.tag || '').toLowerCase()]) {
      regs.unlived.push({
        tag: String(e.tag),
        txt: String(e.text || '').slice(0, UNLIVED_TXT_MAX),
        cy: (e.cycle != null ? e.cycle : 0)
      });
      while (regs.unlived.length > UNLIVED_CAP) regs.unlived.shift();
      captured++;
    }
  }
  return captured;
}

// Map the 7 dial bands -> one of the readable archetypes the 6 readers expect.
// Low integrity -> Outlaw (dark endpoint); low composure -> Catalyst; else the
// strongest HIGH-band dial wins; a neutral citizen is a Drifter (old default).
function deriveArchetypeFromBands_(c) {
  var b = c.base;
  if (bandIndex_(b.integrity) <= 0) return 'Outlaw';
  if (bandIndex_(b.composure) <= 0) return 'Catalyst';
  var cand = [
    { a: 'Striver',   v: b.drive },
    { a: 'Connector', v: b.sociability },
    { a: 'Caretaker', v: (b.warmth + b.family) / 2 },
    { a: 'Watcher',   v: b.openness },
    { a: 'Anchor',    v: b.composure },
    { a: 'Regular',   v: b.outabout }   // a fixture at the city's events
  ];
  var best = null;
  for (var i = 0; i < cand.length; i++) {
    if (bandIndex_(cand[i].v) >= 3 && (best === null || cand[i].v > best.v)) best = cand[i];
  }
  return best ? best.a : 'Drifter';
}

// Build the readable face from BASE. Holds the format contract: pipe-delimited +
// Archetype: token (the 6 readers parse only Archetype:/the whole string). Adds a
// Conduct: token (signed integrity band) as the engine.32 read-seam.
function formatDialFace_(c, entries, cycle) {
  var faceCitizen = newCitizen_(c.base); // mood 0 -> current == base
  var parts = [];
  parts.push('Archetype:' + deriveArchetypeFromBands_(c));
  var desc = describe_(faceCitizen);
  if (desc) parts.push('Mods:' + desc.split(', ').join(','));
  for (var i = 0; i < DIALS.length; i++) {
    parts.push(DIALS[i] + ':' + Math.round(c.base[DIALS[i]]));
  }
  parts.push('Conduct:b' + band_(faceCitizen, 'integrity'));
  // TopTags retained for desk texture (from the parsed window)
  var tagCounts = {};
  for (var t = 0; t < entries.length; t++) {
    var tg = entries[t].tag || 'Untagged';
    tagCounts[tg] = (tagCounts[tg] || 0) + 1;
  }
  var topTags = getTopN_(tagCounts, 5);
  if (topTags.length) parts.push('TopTags:' + topTags.join(','));
  parts.push('Entries:' + entries.length);
  parts.push('V:' + COMPRESS_VERSION);
  parts.push('Hash:' + shortHash_(parts.join('|')));
  parts.push('Updated:c' + cycle);
  return parts.join('|');
}

// minimal profile shim so trimLifeHistory_'s [Compressed:] block keeps working
function dialFaceShim_(c) {
  var mods = describe_(newCitizen_(c.base));
  return {
    archetype: deriveArchetypeFromBands_(c),
    modifiers: mods ? mods.split(', ') : [],
    topMotifs: []
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    compressLifeHistory_: compressLifeHistory_,
    parseLifeHistoryEntries_: parseLifeHistoryEntries_,
    parseLastUpdateCycle_: parseLastUpdateCycle_,
    parseDialState_: parseDialState_,
    serializeDialState_: serializeDialState_,
    parseMemoryRegisters_: parseMemoryRegisters_,
    foldBiasIntents_: foldBiasIntents_,
    foldAgedOutEntries_: foldAgedOutEntries_,
    deriveArchetypeFromBands_: deriveArchetypeFromBands_,
    formatDialFace_: formatDialFace_,
    parseProfileString_: parseProfileString_,
    getCitizenDialBands_: getCitizenDialBands_,
    readPendingReflections_: readPendingReflections_,
    COMPRESS_VERSION: COMPRESS_VERSION,
    KEEP_RAW_ENTRIES: KEEP_RAW_ENTRIES,
    MIN_CYCLES_BETWEEN_COMPRESS: MIN_CYCLES_BETWEEN_COMPRESS,
    REFLECTION_MULT: REFLECTION_MULT,
    REFLECTION_ACCRETION_FRAC: REFLECTION_ACCRETION_FRAC
  };
}


/**
 * ============================================================================
 * COMPRESS LIFE HISTORY REFERENCE v1.4
 * ============================================================================
 *
 * v1.4 CHANGES:
 * - 18 new tag mappings (milestones, Lifestyle, Reputation, Cultural, subtags)
 * - 12 dead mappings removed (source:*, relationship:*, arc:generic, qol:*)
 * - CivicRole space bug fixed
 * - Compression frequency: 10 → 5 cycles
 *
 * v1.2 CHANGES:
 * - Career tag mappings: Career, Career-Transition, Career-Training, etc.
 * - CareerState lines protected from trim (always preserved in output)
 *
 * v1.1 CHANGES:
 * - Cycle-aware decay option (Basis:cycle when "Cycle N" markers present)
 * - Robust parsing (handles [Tag] without timestamp, [Compressed:] blocks)
 * - Metadata tokens: V:1.1, Basis, Hash for debugging
 * - Smarter modifier selection (avoids duplicating archetype-defining traits)
 * - Better motif extraction with stopword filtering
 *
 * OUTPUT FORMAT:
 * Archetype:Watcher|Mods:curious,steady|reflective:0.73|social:0.45|TopTags:...|Motifs:...|Entries:47|Basis:entries|V:1.1|Hash:8f2c1a|Updated:c47
 *
 * ARCHETYPES:
 * - Connector: High social, moderate grounded
 * - Watcher: High reflective, moderate grounded
 * - Striver: High driven, moderate volatile
 * - Anchor: High grounded, moderate social
 * - Catalyst: High volatile, moderate social
 * - Caretaker: Balanced social/grounded/reflective
 * - Drifter: Default/balanced
 *
 * TRAITS:
 * - social, reflective, driven, grounded, volatile (0-1 normalized)
 *
 * DECAY: 0.95 per unit (entry or cycle)
 * COMPRESS: Every 5 cycles (was 10 in v1.3)
 * TRIM: Keeps last 20 raw entries, compresses older into summary block
 *
 * ACCESSOR:
 * getCitizenArchetype_(ctx, popId) → { archetype, modifiers, traits, meta }
 * parseProfileString_(str) → { archetype, modifiers, traits, meta }
 *
 * ============================================================================
 */

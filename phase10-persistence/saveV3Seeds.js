/**
 * ============================================================================
 * V4.0 STORY SEEDS WRITER — Seed Contract v2 (Mike-direct, 2026-07-05)
 * ============================================================================
 *
 * Writes contract seed rows to Story_Seed_Deck via write-intents.
 *
 * Contract (verbatim source: docs/research/2026-07-05-mike-seed-contract.md):
 * the packet says "here's what happened and to whom — search canon to support
 * and write an article." Exact citizens / businesses / entities attached at
 * generation. The row directs NOTHING — the v3.x voice/angle/byline/priority
 * columns are gone. Sheets are the world; no JSON logic anywhere in the path.
 *
 * Input: S.contractSeeds — built at Phase 7 by buildContractSeeds.js from
 * S.rippleEvents (causes, accumulated at compute sites) joined with this
 * cycle's LifeHistory_Log citizen events (people, engine-generated).
 *
 * v4.0 (S296): full column replacement. v3.x columns and the S.storySeeds
 * deck write are RETIRED — S.storySeeds still exists in ctx for the UI
 * renderer, it just no longer reaches the deck. Old deck rows migrate to
 * Story_Seed_Deck_Archive at the sandbox rollout window (ensureSheet_ does
 * not rewrite headers of an existing tab; the tab is re-created with v4
 * headers at migration).
 *
 * ============================================================================
 */

var SEED_DECK_HEADERS = [
  'Cycle',          // A  engine cycle
  'SeedID',         // B  deterministic id
  'Class',          // C  major | texture (promotion rule, sign-aware)
  'Domain',         // D  CIVIC / ECONOMIC / SAFETY / SPORTS / COMMUNITY / GENERAL
  'Neighborhood',   // E  where (or Citywide)
  'What',           // F  the event, engine's real numbers
  'Why',            // G  the cause the engine applied when it computed the effect
  'Citizens',       // H  exact POPIDs + names the engine touched
  'CitizenEvents',  // I  those citizens' actual event lines from this cycle
  'Businesses',     // J  exact business entities affected
  'OtherEntities',  // K  cultural events / shows / famous people / venues
  'Magnitude',      // L  size, signed
  'Trend',          // M  single-cycle / carrying + strength remaining
  'CycleStamp'      // N  in-world Y{n}C{m} stamp
];

/**
 * One-time v3→v4 deck migration (schema-setup carve-out, Phase 42 §1.1 class —
 * fires at most once per spreadsheet lifetime). The v3 deck keeps ALL rows
 * under a legacy name; ensureSheet_ then creates the fresh v4 tab. Idempotent:
 * a tab already carrying v4 headers is left untouched. Fail-soft: on any
 * error the migration is skipped and rows append misaligned rather than the
 * cycle throwing — the verify step reads the deck either way.
 */
function migrateSeedDeckV4_(ss) {
  try {
    var sheet = ss.getSheetByName('Story_Seed_Deck');
    if (!sheet) return; // fresh spreadsheet — ensureSheet_ creates v4 directly
    if (sheet.getLastRow() < 1 || sheet.getLastColumn() < 1) return;
    var first = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    if (String(first[0]) === 'Cycle' && String(first[2]) === 'Class') return; // already v4
    var base = 'Story_Seed_Deck_v3_legacy';
    var name = base;
    var n = 2;
    while (ss.getSheetByName(name)) { name = base + '_' + n; n++; }
    sheet.setName(name);
    if (typeof Logger !== 'undefined') Logger.log('migrateSeedDeckV4_: v3 deck parked as ' + name + ' (' + sheet.getLastRow() + ' rows kept)');
  } catch (err) {
    try { if (typeof Logger !== 'undefined') Logger.log('migrateSeedDeckV4_ skipped: ' + err); } catch (ignored) {}
  }
}

function saveV3Seeds_(ctx) {
  var ss = ctx.ss;
  var S = ctx.summary;
  var seeds = S.contractSeeds || [];

  if (!seeds.length) {
    Logger.log('saveV3Seeds_ v4.0: 0 contract seeds for cycle ' + (S.cycleId || '?') + ' — nothing written');
    return;
  }

  if (!ctx.persist) {
    initializePersistContext_(ctx);
  }

  migrateSeedDeckV4_(ss);
  ensureSheet_(ss, 'Story_Seed_Deck', SEED_DECK_HEADERS);

  var cycle = ctx.config.cycleCount || S.cycleId;
  var stamp = inWorldStamp_(ctx);

  var rows = [];
  for (var i = 0; i < seeds.length; i++) {
    var s = seeds[i];
    rows.push([
      cycle,                    // A  Cycle
      s.seedId || '',           // B  SeedID
      s.seedClass || 'texture', // C  Class
      s.domain || 'GENERAL',    // D  Domain
      s.neighborhood || '',     // E  Neighborhood
      s.what || '',             // F  What
      s.why || '',              // G  Why
      s.citizens || '',         // H  Citizens
      s.citizenEvents || '',    // I  CitizenEvents
      s.businesses || '',       // J  Businesses
      s.otherEntities || '',    // K  OtherEntities
      (s.magnitude === undefined || s.magnitude === null) ? '' : s.magnitude, // L  Magnitude
      s.trend || '',            // M  Trend
      stamp                     // N  CycleStamp
    ]);
  }

  queueBatchAppendIntent_(
    ctx,
    'Story_Seed_Deck',
    rows,
    'Save ' + rows.length + ' contract seeds for cycle ' + cycle,
    'media',
    100
  );

  Logger.log('saveV3Seeds_ v4.0: Queued ' + rows.length + ' contract seeds for cycle ' + cycle);
}

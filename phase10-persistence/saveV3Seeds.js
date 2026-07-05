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
  'Desk',           // C  v4.1 — which desk's packet this row is (letters desk also reads any row with Citizens)
  'Class',          // D  major | texture (promotion rule, sign-aware)
  'Domain',         // E  CIVIC / ECONOMIC / SAFETY / SPORTS / COMMUNITY / GENERAL
  'Neighborhood',   // F  where (or Citywide)
  'What',           // G  the event, engine's real numbers
  'Why',            // H  the cause the engine applied when it computed the effect
  'Citizens',       // I  exact POPIDs + names the engine touched
  'CitizenEvents',  // J  those citizens' actual event lines from this cycle
  'Businesses',     // K  exact business entities affected
  'OtherEntities',  // L  cultural events / shows / famous people / venues
  'Magnitude',      // M  size, signed
  'Trend',          // N  single-cycle / carrying + strength remaining
  'CycleStamp'      // O  in-world Y{n}C{m} stamp
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
    if (String(first[0]) === 'Cycle' && String(first[2]) === 'Desk') return; // already v4.1
    // v4.0 (no Desk col) and v3.x both park; v4.1 re-creates with current headers.
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
      s.desk || 'civic',        // C  Desk (v4.1)
      s.seedClass || 'texture', // D  Class
      s.domain || 'GENERAL',    // E  Domain
      s.neighborhood || '',     // F  Neighborhood
      s.what || '',             // G  What
      s.why || '',              // H  Why
      s.citizens || '',         // I  Citizens
      s.citizenEvents || '',    // J  CitizenEvents
      s.businesses || '',       // K  Businesses
      s.otherEntities || '',    // L  OtherEntities
      (s.magnitude === undefined || s.magnitude === null) ? '' : s.magnitude, // M  Magnitude
      s.trend || '',            // N  Trend
      stamp                     // O  CycleStamp
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

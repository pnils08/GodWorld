/**
 * civic.22-style DROP-IN for engine-sheet — UNDOCKED 2.3 ECL wiring.
 * Do not clasp this file. Do not write Event_Content_Ledger from this lane.
 *
 * Land in the same change as the 9 culture.spacemolt-show rows
 * (scripts/undockedEclPool.js TSV):
 *
 * 1. phase02-world-state/loadEventContentLedger.js
 *    CONTENT_LEDGER_DSL_FIELDS.undocked = { kind: 'flag' };
 *
 * 2. phase05-citizens/generateCitizensEvents.js condScopes
 *    undocked: !!(S.undockedFeedEntries && S.undockedFeedEntries.length)
 *
 * 3. Load approved feed into S.undockedFeedEntries (disk
 *    output/spacemolt-show/feed/c{N}.json after 2.2 --approve, or the
 *    sheet tab once that exists). Applied=no rows must NOT set the flag.
 *
 * 4. Optional later: ECL_EXCLUSIVE_DOMAIN_BY_POOL['culture.spacemolt-show']
 *    and World_Config eclExclusivePools. Not required for first draw.
 *
 * Until (1)+(2)+(3) land, the drafted rows fail-closed (unknown `undocked`
 * field → loader skip). That is the intended interim.
 */

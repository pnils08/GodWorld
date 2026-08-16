/**
 * civic.22-style DROP-IN for engine-sheet — UNDOCKED 2.3 ECL wiring.
 * Do not clasp this file. Do not write Event_Content_Ledger from this lane.
 *
 * Land with the culture.spacemolt-show TSV from scripts/undockedEclPool.js:
 *
 * 1. loadEventContentLedger.js CONTENT_LEDGER_DSL_FIELDS
 *    undocked: { kind: 'flag' }
 *    warmth:   { kind: 'num' }   // DialState current 0–100
 *    drive:    { kind: 'num' }   // same
 *
 * 2. generateCitizensEvents.js condScopes
 *    undocked: !!(S.undockedFeedEntries && S.undockedFeedEntries.length)
 *    warmth / drive: from DialState via the same currentDials math as
 *    lib/citizenDials.js (base+mood, clamp 0–100). Missing DialState
 *    stays null so warmth/drive terms fail-closed (watch/lottery still fire).
 *
 * 3. Load approved feed only into S.undockedFeedEntries
 *    (output/spacemolt-show/feed/c{N}.json after 2.2 --approve).
 *    Applied=no must not set the flag.
 *
 * 4. Keep ONE PoolKey. A second key would double citywide UNDOCKED mass
 *    (balanceContentLedgerPoolWeights_). Exclusive-pool later.
 *
 * Until (1) lands, every drafted row fails closed on undocked=1.
 */

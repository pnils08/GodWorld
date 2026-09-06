/**
 * archiveCitizenExits.js — engine.90 Citizen Archive (clasp-deployed).
 *
 * Simulation_Ledger is the active Oakland cohort. Citizen_Archive is the cold
 * full-row home for citizens who have left it: an exact positional snapshot of
 * the Simulation_Ledger row at exit (same headers, same order) plus seven
 * metadata columns. Uniqueness of a snapshot is (POPID, ExitCycle,
 * ArchiveReason). Simulation_Ledger column adds are append-only for as long
 * as this archive exists; SchemaVersion records the snapshot width so a
 * restore can pad on the right.
 *
 * Commit 3 (S428): the header contract. The Phase-11 mover and the restore
 * land in later commits of docs/plans/2026-08-21-citizen-archive.md.
 */

var CITIZEN_ARCHIVE_META_HEADERS = ['ArchiveReason', 'ExitCycle', 'SourceEventId', 'LastActiveStatus', 'ReturnEligible', 'SchemaVersion', 'ArchiveNote'];

/** Archive header row = the live Simulation_Ledger header + the metadata columns. */
function citizenArchiveHeaders_(slHeader) {
  return (slHeader || []).slice().concat(CITIZEN_ARCHIVE_META_HEADERS);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    CITIZEN_ARCHIVE_META_HEADERS: CITIZEN_ARCHIVE_META_HEADERS,
    citizenArchiveHeaders_: citizenArchiveHeaders_
  };
}

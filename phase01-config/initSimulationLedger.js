/**
 * ============================================================================
 * INIT SIMULATION LEDGER (Phase 42 §5.6)
 * ============================================================================
 *
 * Reads Simulation_Ledger once at cycle start and exposes it on ctx.ledger
 * as shared in-memory state. All cycle-path writers and post-phase05 readers
 * route through ctx.ledger.rows instead of re-reading or directly writing
 * to the sheet. Phase 10's commitSimulationLedger_ persists the final state
 * via a single queueRangeIntent_.
 *
 * Why: collision class is read-staleness, not write-overlap. Multiple engines
 * doing read-mutate-write on the same range either clobber each other (intent
 * semantics) or rely on sheet-as-IPC (direct writes). Shared memory is the
 * minimal change that matches what these engines are semantically doing —
 * a chain of mutations on a shared array.
 *
 * Init must precede Phase 4 — first phase04 writer is generateGenericCitizen-
 * MicroEvents_ (godWorldEngine2.js Phase4-GenericMicroEvents block in v3.x);
 * see PHASE_42_PATTERNS.md §5.6 A2.
 *
 * Shape:
 *   ctx.ledger = {
 *     sheet: 'Simulation_Ledger',
 *     headers: <header row, immutable>,
 *     rows: <body rows — index 0 maps to sheet data row 2>,
 *     dirty: <boolean, flipped true by any mutating writer>
 *   };
 *
 * If init fails (sheet missing, empty), ctx.ledger is left undefined and
 * downstream writers/readers throw — fail-loud per engine.md no-silent-
 * fallback rule.
 *
 * ============================================================================
 */

function initSimulationLedger_(ctx) {
  var sheet = ctx.ss.getSheetByName('Simulation_Ledger');
  if (!sheet) {
    throw new Error('initSimulationLedger_: Simulation_Ledger sheet not found');
  }

  var values = sheet.getDataRange().getValues();
  if (values.length < 1) {
    throw new Error('initSimulationLedger_: Simulation_Ledger is empty');
  }

  ctx.ledger = {
    sheet: 'Simulation_Ledger',
    headers: values[0],
    rows: values.slice(1),
    dirty: false
  };
}

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

  // engine.349: each citizen's DialState as the Cycle opens. The Phase-9 fold compares against it to
  // write Dial_Moves, so a move made anywhere in the Cycle (a chaos break in Phase 4, wear, a
  // reflection, a line) is in the difference. A copy of strings; nothing reads it but that recorder.
  var iOpenPop = values[0].indexOf('POPID');
  var iOpenDial = values[0].indexOf('DialState');
  ctx.dialOpen = null;
  if (iOpenPop >= 0 && iOpenDial >= 0) {
    ctx.dialOpen = {};
    for (var r = 1; r < values.length; r++) {
      var openPop = String(values[r][iOpenPop] || '').trim().toUpperCase();
      if (openPop) ctx.dialOpen[openPop] = values[r][iOpenDial] ? String(values[r][iOpenDial]) : '';
    }
  }
}

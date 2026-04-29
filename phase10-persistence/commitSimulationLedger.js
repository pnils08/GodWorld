/**
 * ============================================================================
 * COMMIT SIMULATION LEDGER (Phase 42 §5.6)
 * ============================================================================
 *
 * Phase 10 commit handler for the shared in-memory Simulation_Ledger
 * established by initSimulationLedger_. Queues a single consolidated range
 * intent if any writer flipped ctx.ledger.dirty during the cycle.
 *
 * Last-writer-wins semantics now apply only to "this consolidated final
 * state vs whatever else queued an intent on Simulation_Ledger" — which
 * should be nothing else by design. Any other writer is a bug surfaced
 * by the §5.6.6 audit (PHASE_42_PATTERNS.md).
 *
 * Runs BEFORE executePersistIntents_ so the consolidated intent is in
 * the queue when execution flushes.
 *
 * setValues auto-extends the sheet, so new rows appended to ctx.ledger.rows
 * during the cycle (processAdvancementIntake_'s appendRow path) land via
 * the same single intent — no separate append intent needed.
 *
 * ============================================================================
 */

function commitSimulationLedger_(ctx) {
  if (!ctx.ledger || !ctx.ledger.dirty) return;

  queueRangeIntent_(
    ctx,
    ctx.ledger.sheet,
    2,
    1,
    ctx.ledger.rows,
    'phase05-ledger consolidated commit',
    'citizens',
    100
  );
}

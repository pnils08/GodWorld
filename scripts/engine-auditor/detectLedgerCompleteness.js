/**
 * detectLedgerCompleteness (Phase 38.9) — substrate-health detector for
 * current-cycle ledger completeness. G-ER9 (S246 ES-3).
 *
 * Mike (S239) named ledgers that "don't fully fill out per cycle." Before this
 * detector the auditor was structurally blind to data-substrate health: it read
 * these sheets, derived ailment patterns from their content, but had no class
 * for "did this cycle's row(s) actually populate?" Downstream detectors (and
 * especially Phase 38.5 measureRemedies' expected-vs-observed deltas) read
 * against partial rows as if authoritative and produce noise.
 *
 * SHAPE-AWARE BY DESIGN (verified against live sheet structure S246, NOT the
 * gap's naive "flag every blank column" framing — that would flood false
 * positives):
 *
 *   - append-log sheets (WorldEvents_V3/_Ledger, Event_Arc_Ledger,
 *     Texture_Trigger_Log, Transit_Metrics) carry SEMANTIC blanks by design —
 *     a non-holiday event row legitimately leaves Holiday/FirstFriday blank; an
 *     unresolved arc legitimately leaves CycleResolved/ResolutionType blank. A
 *     per-column completeness check on these would be permanent noise. So they
 *     get ROW-PRESENCE only: did this cycle produce any rows? Zero rows on a
 *     sheet a cycle phase is supposed to write = the phase silently didn't run.
 *
 *   - cycle-row sheets (one-or-few authoritative rows per cycle) get
 *     row-presence PLUS a per-sheet requiredColumns whitelist — but ONLY columns
 *     whose writer was verified live-but-failing. World_Population's 6 load /
 *     sentiment columns have a live writer (finalizeWorldPopulation.js:163-184,
 *     queueCellIntent_ each, value `D.<load> || ''`); when the load computation
 *     produces an empty D the writer lands blanks every one of them — a genuine
 *     "the load pass didn't populate" substrate gap worth surfacing. Whitelisting
 *     a column on blank=gap WITHOUT verifying the writer is the trap this
 *     codebase punishes (phantom Population_Stats, dead appendPopulationHistory_,
 *     header-guard-zeroed CycleWeightScore) — so the whitelist holds exactly the
 *     columns confirmed by writer-grep, nothing speculative.
 *
 * DELIBERATELY EXCLUDED — Neighborhood_Demographics: its 5 education columns
 * (SchoolQualityIndex/GraduationRate/CollegeReadinessRate/TeacherQuality/Funding)
 * are blank across ALL 17 rows, and the sheet is not cycle-keyed. That is a
 * never-populated STATIC gap, not a current-cycle-completeness signal — flagging
 * it every cycle would be permanent noise dressed as coverage. Tracked as a
 * separate follow-up (writer wiring / dead-column triage), not here.
 *
 * Emits `ledger-completeness` patterns (routed not-applicable by checkMitigators
 * — these are internal engineering signals for /engine-review, not council
 * ailments or Tribune stories) and stashes a `ctx.ledgerCompleteness` summary
 * the orchestrator writes into the audit JSON.
 */

const VERSION = '1.0.0';

// Per-sheet completeness config. `requiredColumns` holds ONLY columns with a
// writer verified live (writer-grep S246) — empty for append-logs (row-presence
// only). `zeroRowSeverity` reflects how anomalous a zero-row cycle is: a
// single-row authoritative table missing its row every-cycle is high; an event
// log can be legitimately quiet some cycles → medium.
const LEDGER_CONFIG = [
  {
    sheet: 'World_Population',
    cycleColumn: 'cycle',
    zeroRowSeverity: 'high',
    // Verified live writer: phase03-population/finalizeWorldPopulation.js:163-184
    requiredColumns: ['trafficLoad', 'retailLoad', 'tourismLoad', 'nightlifeLoad', 'publicSpacesLoad', 'sentiment'],
  },
  { sheet: 'WorldEvents_V3_Ledger', cycleColumn: 'Cycle', zeroRowSeverity: 'medium', requiredColumns: [] },
  { sheet: 'WorldEvents_Ledger', cycleColumn: 'Cycle', zeroRowSeverity: 'medium', requiredColumns: [] },
  { sheet: 'Event_Arc_Ledger', cycleColumn: 'Cycle', zeroRowSeverity: 'medium', requiredColumns: [] },
  { sheet: 'Texture_Trigger_Log', cycleColumn: 'Cycle', zeroRowSeverity: 'medium', requiredColumns: [] },
  { sheet: 'Transit_Metrics', cycleColumn: 'Cycle', zeroRowSeverity: 'medium', requiredColumns: [] },
];

function isBlank(v) {
  return v == null || String(v).trim() === '';
}

function cycleOf(row, col) {
  const raw = row[col];
  if (raw == null || raw === '') return null;
  const m = String(raw).match(/\d+/);
  return m ? parseInt(m[0], 10) : null;
}

function currentCycleRows(rows, cycleColumn, cycle) {
  return rows.filter(r => cycleOf(r, cycleColumn) === cycle);
}

function makePattern(severity, sheet, gap, description, extraEvidence) {
  return {
    type: 'ledger-completeness',
    severity,
    affectedEntities: { citizens: [], neighborhoods: [], initiatives: [], councilSeats: [] },
    evidence: {
      sheet,
      gap,
      ...extraEvidence,
    },
    description,
    detectorVersion: VERSION,
  };
}

function detect(ctx) {
  const { cycle, snapshot = {} } = ctx;
  const out = [];
  const summary = {
    cycle,
    sheetsChecked: 0,
    zeroRow: [],          // sheets with no current-cycle rows
    partialColumns: [],   // { sheet, blankColumns } cycle-row sheets missing required cols
    ok: [],               // sheets that passed
    notLoaded: [],        // configured sheets absent from the snapshot (read-layer concern)
  };

  for (const cfg of LEDGER_CONFIG) {
    const rows = snapshot[cfg.sheet];
    if (!Array.isArray(rows)) {
      // Absent from snapshot → a read-layer concern surfaced by loadSnapshot's
      // failure summary, not a completeness gap. Record but don't flag.
      summary.notLoaded.push(cfg.sheet);
      continue;
    }
    summary.sheetsChecked++;

    const curRows = currentCycleRows(rows, cfg.cycleColumn, cycle);

    if (curRows.length === 0) {
      out.push(makePattern(
        cfg.zeroRowSeverity,
        cfg.sheet,
        'no-current-cycle-rows',
        `${cfg.sheet} produced no C${cycle} rows — the cycle phase that writes it did not populate this cycle.`,
        { cycle, cycleColumn: cfg.cycleColumn, totalRows: rows.length },
      ));
      summary.zeroRow.push(cfg.sheet);
      continue;
    }

    if (cfg.requiredColumns && cfg.requiredColumns.length) {
      // Flag a required column only when blank on EVERY current-cycle row —
      // conservative: a column populated on any current row is not a gap.
      const blankColumns = cfg.requiredColumns.filter(col => curRows.every(r => isBlank(r[col])));
      if (blankColumns.length) {
        out.push(makePattern(
          'medium',
          cfg.sheet,
          'blank-required-columns',
          `${cfg.sheet} C${cycle} row(s) left required column(s) blank: ${blankColumns.join(', ')} — the writer fired but its source data was empty this cycle.`,
          { cycle, blankColumns, requiredColumns: cfg.requiredColumns, currentCycleRows: curRows.length },
        ));
        summary.partialColumns.push({ sheet: cfg.sheet, blankColumns });
        continue;
      }
    }

    summary.ok.push(cfg.sheet);
  }

  ctx.ledgerCompleteness = summary;
  return out;
}

module.exports = { detect, version: VERSION, LEDGER_CONFIG, currentCycleRows, isBlank };

#!/usr/bin/env node
'use strict';

/**
 * Close the wake → essence loop.
 *
 * citizen-wake writes Reflection_Intake with applied='no'. Phase 9 compress
 * is supposed to accrete those tags into DialState.base and stamp applied=yes.
 * That only runs when an engine Cycle fires. C103 has already run; every wake
 * since then is sitting unapplied. An undrained intake is not a loop.
 *
 * This drain is the same math Phase 9 uses:
 *   accreteReflectionsIntoBase_ × REFLECTION_MULT × REFLECTION_ACCRETION_FRAC
 * Then it writes DialState and marks the intake row applied=yes.
 * Phase 9 still runs later; applied=yes rows are skipped, so no double hit.
 *
 *   node scripts/drainReflectionIntake.js --dry-run
 *   Not called from citizen-wake.js.
 */

const mem = require('/root/GodWorld/utilities/citizenMemory');
const dialMap = require('/root/GodWorld/utilities/citizenDialMap');

// Locked to utilities/compressLifeHistory.js — test asserts the source still matches.
const REFLECTION_MULT = 0.45;
const REFLECTION_ACCRETION_FRAC = 0.5;

const RI_POP = 1;
const RI_EVENT = 4;
const RI_SNIPPET = 5;
const RI_APPLIED = 6;
const RI_AFFECT = 7;

function parseDialState(str) {
  if (!str) return {};
  try {
    const o = JSON.parse(str);
    return (o && typeof o === 'object') ? o : {};
  } catch (e) { return {}; }
}

function serializeDialState(c) {
  const o = { base: c.base, streak: c.streak };
  if (c.chaosExposure) o.chaosExposure = c.chaosExposure;
  return JSON.stringify(o);
}

function pendingFromIntake(rows) {
  const out = [];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r] || [];
    const popId = String(row[RI_POP] || '').trim().toUpperCase();
    if (!popId) continue;
    if (String(row[RI_APPLIED] || '').toLowerCase() === 'yes') continue;
    const event = row[RI_EVENT] || '';
    const affect = row[RI_AFFECT] || '';
    if (!event && !affect) continue;
    out.push({
      sheetRow: r + 1,
      popId,
      event,
      affect,
      text: row[RI_SNIPPET] || ''
    });
  }
  return out;
}

function accretePending(dialJson, reflections) {
  const c = mem.deserialize_(parseDialState(dialJson));
  const before = {};
  for (const d of mem.DIALS) before[d] = c.base[d];
  const moved = mem.accreteReflectionsIntoBase_(
    c,
    reflections,
    { nudgesForReflection_: dialMap.nudgesForReflection_ },
    REFLECTION_MULT,
    REFLECTION_ACCRETION_FRAC
  );
  const deltas = {};
  for (const d of mem.DIALS) {
    const delta = c.base[d] - before[d];
    if (delta) deltas[d] = Math.round(delta * 1000) / 1000;
  }
  return { moved, deltas, json: serializeDialState(c), before, after: Object.assign({}, c.base) };
}

function planDrain(intakeRows, ledgerRows, popFilter) {
  const pending = pendingFromIntake(intakeRows).filter((p) =>
    !popFilter || p.popId === String(popFilter).toUpperCase());
  if (!pending.length) return { plans: [], skipped: 0 };

  const h = ledgerRows[0] || [];
  const find = (n) => h.findIndex((x) => String(x).toLowerCase() === n.toLowerCase());
  const iPop = find('POPID');
  const iDial = find('DialState');
  if (iPop < 0 || iDial < 0) throw new Error('Simulation_Ledger missing POPID or DialState');

  const byPop = new Map();
  for (let i = 1; i < ledgerRows.length; i++) {
    const id = String(ledgerRows[i][iPop] || '').trim().toUpperCase();
    if (id) byPop.set(id, { sheetRow: i + 1, dial: ledgerRows[i][iDial] || '', col: iDial });
  }

  const grouped = new Map();
  for (const p of pending) {
    if (!grouped.has(p.popId)) grouped.set(p.popId, []);
    grouped.get(p.popId).push(p);
  }

  const plans = [];
  let skipped = 0;
  for (const [popId, refs] of grouped) {
    const led = byPop.get(popId);
    if (!led) { skipped += refs.length; continue; }
    const result = accretePending(led.dial, refs);
    plans.push({
      popId,
      ledgerRow: led.sheetRow,
      dialCol: led.col,
      intakeRows: refs.map((r) => r.sheetRow),
      moved: result.moved,
      deltas: result.deltas,
      nextDial: result.json
    });
  }
  return { plans, skipped };
}

async function applyPlans(plans, sheetsApi) {
  const sheets = sheetsApi || require('/root/GodWorld/lib/sheets');
  const applied = [];
  for (const p of plans) {
    if (p.moved) {
      await sheets.updateRangeByPosition('Simulation_Ledger', p.ledgerRow, p.dialCol, [[p.nextDial]]);
    }
    for (const row of p.intakeRows) {
      await sheets.updateRangeByPosition('Reflection_Intake', row, RI_APPLIED, [['yes']]);
    }
    applied.push(p);
  }
  return applied;
}

async function drain(opts) {
  const o = opts || {};
  const sheets = o.sheets || require('/root/GodWorld/lib/sheets');
  const intake = o.intakeRows || await sheets.getRawSheetData('Reflection_Intake');
  const ledger = o.ledgerRows || await sheets.getRawSheetData('Simulation_Ledger');
  const { plans, skipped } = planDrain(intake, ledger, o.popId);
  if (o.dryRun || !plans.length) {
    return { dryRun: !!o.dryRun, plans, skipped, applied: [] };
  }
  const applied = await applyPlans(plans, sheets);
  return { dryRun: false, plans, skipped, applied };
}

module.exports = {
  REFLECTION_MULT, REFLECTION_ACCRETION_FRAC,
  pendingFromIntake, accretePending, planDrain, applyPlans, drain,
  parseDialState, serializeDialState
};

if (require.main === module) {
  const dry = process.argv.includes('--dry-run');
  drain({ dryRun: dry }).then((r) => {
    console.log(JSON.stringify({
      dryRun: r.dryRun,
      pendingCitizens: r.plans.length,
      skipped: r.skipped,
      applied: r.applied.length,
      moves: r.plans.map((p) => ({ popId: p.popId, moved: p.moved, deltas: p.deltas }))
    }, null, 2));
  }).catch((e) => {
    console.error('drainReflectionIntake FATAL ' + e.message);
    process.exit(1);
  });
}

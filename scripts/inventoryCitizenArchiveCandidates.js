#!/usr/bin/env node
/**
 * scripts/inventoryCitizenArchiveCandidates.js — engine.90 Commit 7: dry-run
 * inventory of the rows the Phase-11 mover would move. READ-ONLY, no sheet writes.
 *
 * Eligibility is not re-implemented here: the script calls the mover's own
 * `citizenArchiveCandidates_` over the live header + body, so what it lists is
 * exactly what `archiveCitizenExits_` would move at the next fire with the flag on.
 *
 * Per candidate: POPID, name, Status, ClockMode, Tier, RoleType, ArchiveReason,
 * ReturnEligible, the measured defect classes from
 * docs/plans/2026-08-17-ledger-trueup-sweep.md §Batch shape (SchoolQuality unusable,
 * CareerStage spelling outside the enum, NetWorth blank, EmployerBizId blank with a
 * role, MigrationIntent still set, BirthYear out of range), and the relational
 * fields the archive must not orphan (LineageId, Heritage_Ledger membership,
 * SpouseId / ParentIds / ChildrenIds with each pointer's state on the ledger,
 * HouseholdId). Also the terminal-looking statuses the mover deliberately skips.
 *
 * Usage: node scripts/inventoryCitizenArchiveCandidates.js [--json=<path>]
 *   Reads GODWORLD_SHEET_ID (live). Writes output/citizen_archive_inventory_c<N>.json
 *   unless --json names another path. Age anchor = 2041 − BirthYear (project convention).
 */
require('../lib/env');
const fs = require('fs');
const path = require('path');
const sheets = require('../lib/sheets');
const { citizenArchiveCandidates_, CITIZEN_ARCHIVE_RETURN_ELIGIBLE } = require('../utilities/archiveCitizenExits');

const AGE_ANCHOR = 2041;
const CAREER_STAGE_ENUM = new Set(['student', 'entry-level', 'mid-career', 'senior', 'retired']);
const args = process.argv.slice(2);
const opt = (k) => { const a = args.find((x) => x.startsWith('--' + k + '=')); return a ? a.split('=').slice(1).join('=') : null; };

const idsOf = (v) => String(v || '').split(/[,;|\s]+/).map((s) => s.trim().toUpperCase()).filter((s) => /^POP-\d+$/.test(s));

async function main() {
  const [sl, heritage, wc] = await Promise.all([
    sheets.getRawSheetData('Simulation_Ledger'),
    sheets.getRawSheetData('Heritage_Ledger'),
    sheets.getRawSheetData('World_Config'),
  ]);
  const header = sl[0] || [];
  const body = sl.slice(1);
  const col = (name) => { const i = header.indexOf(name); if (i < 0) throw new Error('Simulation_Ledger has no column ' + name); return i; };
  const C = {};
  ['POPID', 'First', 'Last', 'Status', 'ClockMode', 'Tier', 'RoleType', 'BirthYear', 'SpouseId', 'ParentIds', 'ChildrenIds', 'HouseholdId',
    'NetWorth', 'Income', 'EmployerBizId', 'SchoolQuality', 'CareerStage', 'MigrationIntent', 'MigrationDestination', 'LineageId', 'HealthCause', 'StatusStartCycle']
    .forEach((n) => { C[n] = col(n); });
  const cfg = {};
  for (const r of wc) if (r && r[0]) cfg[String(r[0]).trim()] = r[1];
  const cycle = Number(cfg.cycleCount || 0);

  // ledger index: POPID → { status, rowIndex }
  const byPop = new Map();
  body.forEach((r, i) => { const p = String(r[C.POPID] || '').trim().toUpperCase(); if (p) byPop.set(p, { status: String(r[C.Status] || '').trim(), i }); });
  const stateOf = (p) => { const h = byPop.get(p); return h ? h.status : 'not-on-ledger'; };

  // Heritage_Ledger membership: FounderPopId + MembersList
  const hh = heritage[0] || [];
  const hFounder = hh.indexOf('FounderPopId'), hMembers = hh.indexOf('MembersList'), hLin = hh.indexOf('LineageId');
  const heritageOf = new Map();
  for (const r of heritage.slice(1)) {
    const lin = String(r[hLin] || '').trim();
    for (const p of idsOf(r[hFounder]).concat(idsOf(r[hMembers]))) { if (!heritageOf.has(p)) heritageOf.set(p, []); heritageOf.get(p).push(lin); }
  }

  const cand = citizenArchiveCandidates_(header, body);
  const rows = cand.rows.map(({ q, popId, reason }) => {
    const r = body[q];
    const g = (n) => String(r[C[n]] == null ? '' : r[C[n]]).trim();
    const by = Number(g('BirthYear')) || 0;
    const age = by ? AGE_ANCHOR - by : null;
    const sq = g('SchoolQuality');
    const cs = g('CareerStage');
    const defects = [];
    if (sq === '' || sq === '5') defects.push('schoolQualityUnusable');
    if (cs && !CAREER_STAGE_ENUM.has(cs.toLowerCase())) defects.push('careerStageSpelling');
    if (!cs) defects.push('careerStageBlank');
    if (g('NetWorth') === '') defects.push('netWorthBlank');
    if (g('RoleType') && !g('EmployerBizId')) defects.push('employerBlankWithRole');
    if (g('MigrationIntent')) defects.push('migrationIntentSet');
    if (age === null || age < 0 || age > 110) defects.push('birthYearOOB');
    if (g('Income') === '') defects.push('incomeBlank');
    const ptr = (n) => idsOf(g(n)).map((p) => ({ popId: p, state: stateOf(p) }));
    return {
      popId, name: (g('First') + ' ' + g('Last')).trim(), status: g('Status'), clockMode: g('ClockMode'), tier: g('Tier'), roleType: g('RoleType'),
      archiveReason: reason, returnEligible: !!CITIZEN_ARCHIVE_RETURN_ELIGIBLE[reason],
      statusStartCycle: g('StatusStartCycle') || null, healthCause: g('HealthCause') || null, migrationDestination: g('MigrationDestination') || null,
      birthYear: by || null, age, schoolQuality: sq, careerStage: cs, netWorth: g('NetWorth'), income: g('Income'), employerBizId: g('EmployerBizId'), migrationIntent: g('MigrationIntent'),
      lineageId: g('LineageId') || null, heritageLineages: heritageOf.get(popId) || [],
      spouse: ptr('SpouseId'), parents: ptr('ParentIds'), children: ptr('ChildrenIds'), householdId: g('HouseholdId') || null,
      defects,
    };
  });

  // statuses the mover does not treat as an exit — listed so nobody assumes they move
  const skippedStatus = {};
  for (const r of body) {
    const st = String(r[C.Status] || '').trim();
    if (/^(active)$/i.test(st) && st !== 'Active') skippedStatus[st] = (skippedStatus[st] || 0) + 1;
    else if (!/^active$/i.test(st) && !/^(traded|deceased)$/i.test(st)) skippedStatus[st] = (skippedStatus[st] || 0) + 1;
  }

  const tally = (key) => rows.reduce((m, x) => { const k = Array.isArray(x[key]) ? x[key] : [x[key]]; for (const v of k) m[v] = (m[v] || 0) + 1; return m; }, {});
  const defectTally = tally('defects');
  const clean = rows.filter((x) => !x.defects.length).length;
  const relational = rows.filter((x) => x.lineageId || x.heritageLineages.length || x.spouse.length || x.parents.length || x.children.length);
  const summary = {
    generatedAt: new Date().toISOString(), generatedBy: 'scripts/inventoryCitizenArchiveCandidates.js', cycle, ledgerRows: body.length,
    candidates: rows.length, byReason: tally('archiveReason'), byClockMode: tally('clockMode'), byTier: tally('tier'),
    moverSkipped: cand.skipped, moverSkippedWhy: cand.skippedWhy, notExitStatuses: skippedStatus,
    defectTally, rowsWithAnyDefect: rows.length - clean, rowsClean: clean,
    relationalRows: relational.length, heritageMembers: rows.filter((x) => x.heritageLineages.length).length, withLineageId: rows.filter((x) => x.lineageId).length,
    popIdHighWater: cfg.popIdHighWater == null ? null : Number(cfg.popIdHighWater), citizenArchiveEnabled: cfg.citizenArchiveEnabled == null ? null : Number(cfg.citizenArchiveEnabled),
  };
  const out = { summary, rows };
  const outPath = opt('json') || path.join(__dirname, '..', 'output', 'citizen_archive_inventory_c' + cycle + '.json');
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2));

  console.log(`[inventory] C${cycle} Simulation_Ledger ${body.length} rows — mover candidates ${rows.length} (${JSON.stringify(summary.byReason)}), mover skips ${cand.skipped} ${JSON.stringify(cand.skippedWhy)}`);
  console.log(`[inventory] not exits (stay on the ledger): ${JSON.stringify(skippedStatus)} | flag citizenArchiveEnabled=${summary.citizenArchiveEnabled} mark=${summary.popIdHighWater}`);
  console.log(`[inventory] defects: ${JSON.stringify(defectTally)} — ${summary.rowsWithAnyDefect} rows carry ≥1, ${clean} clean`);
  console.log(`[inventory] relational: ${relational.length} rows with any pointer; LineageId ${summary.withLineageId}; on Heritage_Ledger ${summary.heritageMembers}`);
  for (const x of rows) {
    const rel = [].concat(x.spouse.map((p) => 'sp:' + p.popId + '/' + p.state), x.parents.map((p) => 'pa:' + p.popId + '/' + p.state), x.children.map((p) => 'ch:' + p.popId + '/' + p.state), x.lineageId ? ['lin:' + x.lineageId] : [], x.heritageLineages.map((l) => 'her:' + l));
    console.log(`  ${x.popId} ${x.name.padEnd(24)} ${x.status.padEnd(8)} ${x.clockMode.padEnd(6)} T${x.tier} ${x.archiveReason.padEnd(11)} ${x.defects.join(',') || 'clean'}${rel.length ? '  [' + rel.join(' ') + ']' : ''}`);
  }
  console.log(`[inventory] wrote ${path.relative(process.cwd(), outPath)}`);
}

main().catch((e) => { console.error('[inventory] FATAL', e.message); process.exit(1); });

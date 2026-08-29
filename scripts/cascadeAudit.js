#!/usr/bin/env node
/**
 * cascadeAudit.js — W1 per-metric cascade consistency audit (engine.102 Task 1)
 *
 * Read-only pulls from World_Population, Neighborhood_Map, Neighborhood_Demographics,
 * World_Config, Simulation_Ledger, Hospital_Ledger, and Relationship_Bonds.
 * Emits a human-readable Markdown report plus machine-readable JSON.
 *
 * Usage:
 *   node scripts/cascadeAudit.js
 *
 * Output:
 *   output/audit-reports/cascade-audit-2026-08-08.md
 *   output/audit-reports/cascade-audit-2026-08-08.json
 */

'use strict';

const path = require('path');
require('dotenv').config({ path: path.join(require('os').homedir(), '.config/godworld/.env') });

const fs = require('fs');
const sheets = require('../lib/sheets.js');

const OUT_DIR = path.join(__dirname, '..', 'output', 'audit-reports');
const DATE = '2026-08-08';
const OUT_MD = path.join(OUT_DIR, `cascade-audit-${DATE}.md`);
const OUT_JSON = path.join(OUT_DIR, `cascade-audit-${DATE}.json`);

const EXPECTED_TABS = [
  'World_Population',
  'Neighborhood_Map',
  'Neighborhood_Demographics',
  'World_Config',
  'Simulation_Ledger',
  'Hospital_Ledger',
  'Relationship_Bonds'
];

const ND_PEOPLE_COLUMNS = ['Students', 'Adults', 'Seniors'];
const ND_RATE_NUMERATOR_COLUMNS = ['Unemployed', 'Sick'];
const ND_MIGRATION_COLUMNS = ['Migration', 'NetMigration', 'Inflow', 'Outflow', 'MigrationFlow', 'MigrationDelta'];

function findColumn(headers, variants) {
  const normHeaders = headers.map((h, i) => ({
    raw: h,
    norm: String(h || '').trim().toLowerCase(),
    idx: i
  }));

  for (const v of variants) {
    const nv = String(v).trim().toLowerCase();
    const found = normHeaders.find(h => h.norm === nv);
    if (found) return { index: found.idx, name: found.raw, found: true };
  }

  for (const v of variants) {
    const nv = String(v).trim().toLowerCase();
    const found = normHeaders.find(h => h.norm.includes(nv));
    if (found) return { index: found.idx, name: found.raw, found: true };
  }

  return { index: -1, name: '', found: false };
}

function num(row, idx) {
  if (idx < 0 || idx >= row.length) return NaN;
  const v = String(row[idx] || '').replace(/,/g, '').trim();
  const n = Number(v);
  return isNaN(n) ? NaN : n;
}

function fmtN(n, digits) {
  digits = digits === undefined ? 2 : digits;
  if (Number.isFinite(n)) return n.toFixed(digits);
  return 'n/a';
}

function fmtPct(n, digits) {
  digits = digits === undefined ? 2 : digits;
  if (Number.isFinite(n)) return (n * 100).toFixed(digits) + '%';
  return 'n/a';
}

function ratioText(small, large) {
  if (!Number.isFinite(small) || !Number.isFinite(large) || small === 0) return 'n/a';
  return '1:' + (large / small).toFixed(1).replace(/\.0$/, '');
}

async function safeGetSheetData(tab) {
  try {
    const data = await sheets.getSheetData(tab);
    return { present: true, data };
  } catch (err) {
    return { present: false, data: [], error: err.message };
  }
}

async function computeCascadeAudit() {
  const report = {
    generatedAt: new Date().toISOString(),
    date: DATE,
    source: 'scripts/cascadeAudit.js',
    readOnly: true,
    tabs: {},
    missingTabs: [],
    missingColumns: {},
    scaleTable: {},
    metrics: {},
    hoodSetDiff: {},
    worldConfigKeys: [],
    invariants: []
  };

  const raw = {};
  for (const tab of EXPECTED_TABS) {
    const res = await safeGetSheetData(tab);
    raw[tab] = res;
    report.tabs[tab] = { present: res.present, rows: res.data.length };
    if (!res.present) report.missingTabs.push(tab);
  }

  // ── World_Population ──
  const wp = {};
  if (raw.World_Population.present) {
    const data = raw.World_Population.data;
    const headers = data[0] || [];
    const cols = {
      totalPopulation: findColumn(headers, ['totalPopulation', 'total population', 'population']),
      illnessRate: findColumn(headers, ['illnessRate', 'illness rate', 'illness']),
      employmentRate: findColumn(headers, ['employmentRate', 'employment rate', 'employment']),
      migration: findColumn(headers, ['migration', 'migrationCount', 'migration count'])
    };
    for (const [key, col] of Object.entries(cols)) {
      if (!col.found) {
        report.missingColumns[`World_Population.${key}`] = key;
      }
    }
    const latest = data.length > 1 ? data[data.length - 1] : [];
    wp.totalPopulation = num(latest, cols.totalPopulation.index);
    wp.illnessRate = num(latest, cols.illnessRate.index);
    wp.employmentRate = num(latest, cols.employmentRate.index);
    wp.migration = num(latest, cols.migration.index);
    const cycleCol = findColumn(headers, ['cycle', 'Cycle']);
    wp.cycle = cycleCol.found ? String(latest[cycleCol.index] || '') : '';
  }

  // ── Neighborhood_Map ──
  let nmHoods = [];
  if (raw.Neighborhood_Map.present) {
    const data = raw.Neighborhood_Map.data;
    const headers = data[0] || [];
    const col = findColumn(headers, ['Neighborhood', 'Neighbourhood', 'Hood', 'Name']);
    if (!col.found) {
      report.missingColumns['Neighborhood_Map.Neighborhood'] = 'Neighborhood/Neighbourhood';
    } else {
      for (const row of data.slice(1)) {
        const h = String(row[col.index] || '').trim();
        if (h) nmHoods.push(h);
      }
    }
  }

  // ── Neighborhood_Demographics ──
  const nd = { hoods: [], peopleCols: [], migrationCols: [] };
  if (raw.Neighborhood_Demographics.present) {
    const data = raw.Neighborhood_Demographics.data;
    const headers = data[0] || [];
    const hoodCol = findColumn(headers, ['Neighborhood', 'Neighbourhood', 'Hood', 'Name']);
    if (!hoodCol.found) {
      report.missingColumns['Neighborhood_Demographics.Neighborhood'] = 'Neighborhood/Neighbourhood';
    }

    for (const v of ND_PEOPLE_COLUMNS) {
      const c = findColumn(headers, [v]);
      if (c.found) {
        nd.peopleCols.push({ header: v, index: c.index, sheetName: c.name });
      } else {
        report.missingColumns[`Neighborhood_Demographics.${v}`] = v;
      }
    }

    nd.rateNumeratorCols = [];
    for (const v of ND_RATE_NUMERATOR_COLUMNS) {
      const c = findColumn(headers, [v]);
      if (c.found) {
        nd.rateNumeratorCols.push({ header: v, index: c.index, sheetName: c.name });
      } else {
        report.missingColumns[`Neighborhood_Demographics.${v}`] = v;
      }
    }

    for (const v of ND_MIGRATION_COLUMNS) {
      const c = findColumn(headers, [v]);
      if (c.found) nd.migrationCols.push({ header: v, index: c.index, sheetName: c.name });
    }

    for (const row of data.slice(1)) {
      const hood = hoodCol.found ? String(row[hoodCol.index] || '').trim() : '';
      const r = { hood };
      let people = 0;
      for (const pc of nd.peopleCols) {
        const n = num(row, pc.index);
        r[pc.header] = n;
        if (Number.isFinite(n)) people += n;
      }
      for (const rc of nd.rateNumeratorCols) {
        const n = num(row, rc.index);
        r[rc.header] = n;
      }
      let migration = 0;
      let hasMigration = false;
      for (const mc of nd.migrationCols) {
        const n = num(row, mc.index);
        r[mc.header] = n;
        if (Number.isFinite(n)) {
          migration += n;
          hasMigration = true;
        }
      }
      r.totalPeople = people;
      r.migrationSum = hasMigration ? migration : null;
      nd.hoods.push(r);
    }

    nd.totalPeople = nd.hoods.reduce((s, h) => s + h.totalPeople, 0);
    nd.totalSick = nd.hoods.reduce((s, h) => s + (Number.isFinite(h.Sick) ? h.Sick : 0), 0);
    nd.totalUnemployed = nd.hoods.reduce((s, h) => s + (Number.isFinite(h.Unemployed) ? h.Unemployed : 0), 0);
    nd.totalMigration = nd.hoods.reduce((s, h) => s + (Number.isFinite(h.migrationSum) ? h.migrationSum : 0), 0);
  }

  // ── Simulation_Ledger ──
  const sl = { rows: 0, active: 0, sick: 0, sickStatuses: {}, healthCauseCount: 0, employment: {} };
  if (raw.Simulation_Ledger.present) {
    const data = raw.Simulation_Ledger.data;
    const headers = data[0] || [];
    sl.rows = data.length - 1;
    const statusCol = findColumn(headers, ['Status']);
    const healthCauseCol = findColumn(headers, ['HealthCause', 'Health Cause', 'healthCause']);
    const employerCol = findColumn(headers, ['EmployerBizId', 'Employer', 'EmployerID']);
    if (!statusCol.found) report.missingColumns['Simulation_Ledger.Status'] = 'Status';
    if (!healthCauseCol.found) report.missingColumns['Simulation_Ledger.HealthCause'] = 'HealthCause';
    if (!employerCol.found) report.missingColumns['Simulation_Ledger.EmployerBizId'] = 'EmployerBizId';

    for (const row of data.slice(1)) {
      const status = statusCol.found ? String(row[statusCol.index] || '').trim() : '';
      if (status === 'Active') sl.active++;
      sl.sickStatuses[status] = (sl.sickStatuses[status] || 0) + 1;

      const healthCause = healthCauseCol.found ? String(row[healthCauseCol.index] || '').trim() : '';
      if (healthCause) sl.healthCauseCount++;

      const isSickStatus = /sick|hospital|injured|serious|ill|unwell/i.test(status);
      if (isSickStatus || healthCause) sl.sick++;

      const employer = employerCol.found ? String(row[employerCol.index] || '').trim() : '';
      if (employer === '') {
        sl.employment.empty = (sl.employment.empty || 0) + 1;
      } else if (employer.toUpperCase() === 'UNTRACKED') {
        sl.employment.untracked = (sl.employment.untracked || 0) + 1;
      } else {
        sl.employment.nonEmpty = (sl.employment.nonEmpty || 0) + 1;
      }
    }
  }

  // ── Scale table ──
  const cityDenom = Number.isFinite(wp.totalPopulation) ? wp.totalPopulation : NaN;
  const hoodDenom = nd.totalPeople;
  const ledgerDenom = sl.rows;
  report.scaleTable = {
    cityModelPop: cityDenom,
    hoodDemoTotal: hoodDenom,
    ledgerSampleRows: ledgerDenom,
    ledgerActiveCount: sl.active,
    cityToHoodRatio: ratioText(hoodDenom, cityDenom),
    cityToLedgerRatio: ratioText(ledgerDenom, cityDenom),
    hoodToLedgerRatio: ratioText(ledgerDenom, hoodDenom)
  };

  // ── Per-metric values ──
  const wpIllRate = wp.illnessRate;
  const hoodSickRate = hoodDenom > 0 ? nd.totalSick / hoodDenom : NaN;
  const ledgerSickRate = ledgerDenom > 0 ? sl.sick / ledgerDenom : NaN;

  const wpEmpRate = wp.employmentRate;
  const hoodUnempRate = hoodDenom > 0 ? nd.totalUnemployed / hoodDenom : NaN;
  const ledgerUnempRate = ledgerDenom > 0 ? (sl.employment.empty || 0) / ledgerDenom : NaN;

  const wpMigration = wp.migration;
  const hoodMigration = nd.migrationCols.length > 0 ? nd.totalMigration : null;

  report.metrics = {
    illness: {
      cityDial: { value: wpIllRate, display: fmtPct(wpIllRate) },
      hoodLayer: { value: hoodSickRate, display: fmtPct(hoodSickRate), numerator: nd.totalSick, denominator: hoodDenom },
      ledgerLayer: { value: ledgerSickRate, display: fmtPct(ledgerSickRate), numerator: sl.sick, denominator: ledgerDenom }
    },
    employment: {
      cityDial: { value: wpEmpRate, display: fmtPct(wpEmpRate) },
      hoodLayer: { value: hoodUnempRate, display: fmtPct(hoodUnempRate), numerator: nd.totalUnemployed, denominator: hoodDenom },
      ledgerLayer: { value: ledgerUnempRate, display: fmtPct(ledgerUnempRate), numerator: sl.employment.empty || 0, denominator: ledgerDenom }
    },
    migration: {
      cityDial: { value: wpMigration, display: Number.isFinite(wpMigration) ? String(Math.round(wpMigration)) : 'n/a' },
      hoodLayer: { value: hoodMigration, display: hoodMigration !== null ? String(Math.round(hoodMigration)) : 'n/a (no migration column)' }
    }
  };

  // ── Hood-set diff ──
  const nmSet = new Set(nmHoods.map(h => h.toLowerCase()));
  const ndNames = nd.hoods.map(h => h.hood).filter(Boolean);
  const ndSet = new Set(ndNames.map(h => h.toLowerCase()));
  report.hoodSetDiff = {
    inNeighborhoodMapNotDemographics: nmHoods.filter(h => !ndSet.has(h.toLowerCase())).sort(),
    inDemographicsNotNeighborhoodMap: ndNames.filter(h => !nmSet.has(h.toLowerCase())).sort()
  };

  // ── World_Config keys ──
  if (raw.World_Config.present) {
    const data = raw.World_Config.data;
    const headers = data[0] || [];
    const keyCol = findColumn(headers, ['Key', 'key', 'Name', 'name']);
    if (keyCol.found) {
      report.worldConfigKeys = data.slice(1)
        .map(row => String(row[keyCol.index] || '').trim())
        .filter(Boolean)
        .sort();
    } else {
      report.missingColumns['World_Config.Key'] = 'Key';
    }
  }

  // ── Invariants ──
  // 1. Migration sum ±10%
  if (hoodMigration === null) {
    report.invariants.push({
      id: 'migration-sum',
      label: 'Σ hood migration deltas ≈ city migration ±10%',
      result: 'SKIP',
      note: 'No migration column in Neighborhood_Demographics'
    });
  } else if (!Number.isFinite(wpMigration) || !Number.isFinite(hoodMigration)) {
    report.invariants.push({
      id: 'migration-sum',
      label: 'Σ hood migration deltas ≈ city migration ±10%',
      result: 'SKIP',
      note: 'Missing numerator/denominator'
    });
  } else {
    const diff = Math.abs(hoodMigration - wpMigration);
    const pct = Math.abs(wpMigration) > 0 ? diff / Math.abs(wpMigration) : 0;
    const pass = pct <= 0.10;
    report.invariants.push({
      id: 'migration-sum',
      label: 'Σ hood migration deltas ≈ city migration ±10%',
      result: pass ? 'PASS' : 'FAIL',
      city: wpMigration,
      hoodSum: hoodMigration,
      diffPct: pct,
      note: pass ? undefined : `off by ${(pct * 100).toFixed(1)}%`
    });
  }

  // 2. Sick-rate band (≥25-cycle convergence)
  if (!Number.isFinite(wpIllRate) || !Number.isFinite(hoodSickRate)) {
    report.invariants.push({
      id: 'sick-rate-band',
      label: 'Hood Sick/pop within ±2pp of WP illnessRate (≥25-cycle convergence)',
      result: 'SKIP',
      note: 'Missing data'
    });
  } else {
    // engine.133: the city rate is an ENVELOPE — the hood aggregate sits on it
    // (or under it, when a health initiative is delivering), never above it
    // once converged. Convergence is 25%/cycle of the gap (engine.132), so a
    // ~5-cycle lag after a city-rate move is expected, hence the 2pp band.
    const diff = hoodSickRate - wpIllRate;
    const pass = diff <= 0.02 && diff >= -0.03;
    report.invariants.push({
      id: 'sick-rate-band',
      label: 'Hood Σ Sick / Σ pop inside the WP illnessRate envelope (−3pp relief … +2pp lag)',
      result: pass ? 'PASS' : 'FAIL',
      wpRate: wpIllRate,
      hoodRate: hoodSickRate,
      diffPp: diff,
      note: pass ? 'inside the envelope (≤5-cycle convergence lag applies)' : `aggregate ${diff > 0 ? 'above' : 'below'} envelope by ${(Math.abs(diff) * 100).toFixed(2)}pp`
    });
  }

  // 2b. Sick-rate spread (engine.133) — the envelope is filled UNEVENLY from
  // each hood's own canon (age mix × density × income); a flat copy is the
  // pre-engine.133 shape and fails here. Max/min hood rate ≥ 1.3 on the live
  // C104 fixture the weights were calibrated on (2.08 at convergence).
  {
    const hoodRates = nd.hoods
      .filter(h => h.totalPeople > 0 && Number.isFinite(h.Sick))
      .map(h => h.Sick / h.totalPeople)
      .filter(v => v > 0);
    if (hoodRates.length < 5) {
      report.invariants.push({ id: 'sick-rate-spread', label: 'Hood Sick rates uneven (max/min ≥ 1.3)', result: 'SKIP', note: 'fewer than 5 hoods with Sick > 0' });
    } else {
      const ratio = Math.max(...hoodRates) / Math.min(...hoodRates);
      const pass = ratio >= 1.3;
      report.invariants.push({
        id: 'sick-rate-spread',
        label: 'Hood Sick rates uneven (max/min ≥ 1.3) — envelope filled from hood canon, not copied',
        result: pass ? 'PASS' : 'FAIL',
        ratio,
        note: pass ? `max/min ${ratio.toFixed(2)}` : `flat: max/min ${ratio.toFixed(2)} — pre-engine.133 residue or <5 cycles since deploy`
      });
    }
  }

  // 3. Unemployment band
  if (!Number.isFinite(wpEmpRate) || !Number.isFinite(hoodUnempRate)) {
    report.invariants.push({
      id: 'unemployment-band',
      label: 'Hood Unemployed/pop within ±2pp of 1 − employmentRate',
      result: 'SKIP',
      note: 'Missing data'
    });
  } else {
    const target = 1 - wpEmpRate;
    const diff = Math.abs(hoodUnempRate - target);
    const pass = diff <= 0.02;
    report.invariants.push({
      id: 'unemployment-band',
      label: 'Hood Unemployed/pop within ±2pp of 1 − employmentRate',
      result: pass ? 'PASS' : 'FAIL',
      targetRate: target,
      hoodRate: hoodUnempRate,
      diffPp: diff,
      note: pass ? undefined : `gap ${(diff * 100).toFixed(2)}pp`
    });
  }

  // 4. Sample-support rule
  if (!Number.isFinite(wpIllRate)) {
    report.invariants.push({
      id: 'sample-support',
      label: 'illnessRate ≥ 8% sustained 3+ cycles ⇒ ≥1 ledger sick status/HealthCause',
      result: 'SKIP',
      note: 'Missing WP illnessRate'
    });
  } else if (wpIllRate < 0.08) {
    report.invariants.push({
      id: 'sample-support',
      label: 'illnessRate ≥ 8% sustained 3+ cycles ⇒ ≥1 ledger sick status/HealthCause',
      result: 'PASS',
      note: `WP illnessRate ${fmtPct(wpIllRate)} below 8% threshold`
    });
  } else {
    const pass = sl.sick >= 1;
    report.invariants.push({
      id: 'sample-support',
      label: 'illnessRate ≥ 8% sustained 3+ cycles ⇒ ≥1 ledger sick status/HealthCause',
      result: pass ? 'PASS' : 'FAIL',
      wpIllnessRate: wpIllRate,
      ledgerSick: sl.sick,
      note: pass ? undefined : `WP illnessRate ${fmtPct(wpIllRate)} ≥ 8% but ledger shows ${sl.sick} sick/HealthCause rows`
    });
  }

  // 5. Migration sign preservation
  if (hoodMigration === null || !Number.isFinite(wpMigration)) {
    report.invariants.push({
      id: 'migration-sign',
      label: 'Sign(city migration) preserved in aggregate hood migration',
      result: 'SKIP',
      note: hoodMigration === null ? 'No hood migration column' : 'Missing city migration'
    });
  } else {
    const pass = Math.sign(wpMigration) === Math.sign(hoodMigration) || wpMigration === 0 || hoodMigration === 0;
    report.invariants.push({
      id: 'migration-sign',
      label: 'Sign(city migration) preserved in aggregate hood migration',
      result: pass ? 'PASS' : 'FAIL',
      citySign: Math.sign(wpMigration),
      hoodSign: Math.sign(hoodMigration)
    });
  }

  // ── Markdown output ──
  return { report, raw, nd, sl };
}

function renderMarkdown({ report, raw, nd, sl }) {
  const cityDenom = report.scaleTable.cityModelPop;
  const hoodDenom = report.scaleTable.hoodDemoTotal;
  const ledgerDenom = report.scaleTable.ledgerSampleRows;
  const md = [];
  md.push(`# Cascade Consistency Audit — ${DATE}`);
  md.push('');
  md.push('> **Read this first:** This is a read-only snapshot of the three city scales (World_Population city face, Neighborhood_Demographics hood layer, Simulation_Ledger citizen sample). It measures the current gap between the city dials and the ground layers that should support them, per the invariants in `docs/research/2026-08-07-city-neighborhood-cascade-team-review.md` §8 (with Kimi\'s amendment: the sick-rate convergence window is ≥25 cycles, not 10).');
  md.push('');
  md.push(`- **Generated:** ${report.generatedAt}`);
  md.push(`- **Source:** \`${report.source}\``);
  md.push(`- **Tabs read:** ${EXPECTED_TABS.join(', ')}`);
  md.push(`- **Missing tabs:** ${report.missingTabs.length ? report.missingTabs.join(', ') : 'none'}`);
  md.push(`- **Missing columns:** ${Object.keys(report.missingColumns).length ? Object.entries(report.missingColumns).map(([k, v]) => `${k} (expected ${v})`).join('; ') : 'none'}`);
  md.push('');

  md.push('## Three-denominator scale table');
  md.push('');
  md.push('| Scale | Denominator | Ratio to city |');
  md.push('|---|---|---|');
  md.push(`| City model (World_Population) | ${fmtN(cityDenom, 1)} | — |`);
  md.push(`| Hood demo (Neighborhood_Demographics people columns) | ${fmtN(hoodDenom, 0)} | ${ratioText(hoodDenom, cityDenom)} |`);
  md.push(`| Ledger sample (Simulation_Ledger rows) | ${ledgerDenom} (Active: ${sl.active}) | ${ratioText(ledgerDenom, cityDenom)} |`);
  md.push('');

  md.push('## Per-metric cascade table');
  md.push('');
  md.push('### Illness');
  md.push('');
  md.push('| Layer | Value | Numerator | Denominator |');
  md.push('|---|---|---|---|');
  md.push(`| City dial (WP illnessRate) | ${report.metrics.illness.cityDial.display} | — | ${fmtN(cityDenom, 1)} |`);
  md.push(`| Hood layer (Σ Sick / Σ people) | ${report.metrics.illness.hoodLayer.display} | ${nd.totalSick} | ${fmtN(hoodDenom, 0)} |`);
  md.push(`| Ledger layer (sick Status / HealthCause) | ${report.metrics.illness.ledgerLayer.display} | ${sl.sick} | ${ledgerDenom} |`);
  md.push('');
  md.push(`Ledger sick-status breakdown: \`${JSON.stringify(sl.sickStatuses)}\`; HealthCause non-empty: ${sl.healthCauseCount}.`);
  md.push('');

  md.push('### Employment');
  md.push('');
  md.push('| Layer | Value | Numerator | Denominator |');
  md.push('|---|---|---|---|');
  md.push(`| City dial (WP employmentRate) | ${report.metrics.employment.cityDial.display} | — | — |`);
  md.push(`| Hood layer (Σ Unemployed / Σ people) | ${report.metrics.employment.hoodLayer.display} | ${nd.totalUnemployed} | ${fmtN(hoodDenom, 0)} |`);
  md.push(`| Ledger layer (empty EmployerBizId / sample) | ${report.metrics.employment.ledgerLayer.display} | ${sl.employment.empty || 0} | ${ledgerDenom} |`);
  md.push('');
  md.push(`Ledger employer breakdown: \`${JSON.stringify(sl.employment)}\` (UNTRACKED is intentional feedstock, not WP unemployment).`);
  md.push('');

  md.push('### Migration');
  md.push('');
  md.push('| Layer | Value | Note |');
  md.push('|---|---|---|');
  md.push(`| City dial (WP migration) | ${report.metrics.migration.cityDial.display} | — |`);
  md.push(`| Hood layer (Σ per-hood migration) | ${report.metrics.migration.hoodLayer.display} | ${nd.migrationCols.length ? `columns used: ${nd.migrationCols.map(c => c.sheetName).join(', ')}` : 'no migration column found'} |`);
  md.push('');

  md.push('## Invariant checks');
  md.push('');
  md.push('| Invariant | Result | Detail |');
  md.push('|---|---|---|');
  for (const inv of report.invariants) {
    const detail = inv.note || `citySign=${inv.citySign}, hoodSign=${inv.hoodSign}`;
    md.push(`| ${inv.label} | **${inv.result}** | ${detail} |`);
  }
  md.push('');

  md.push('## Hood-set diff (Neighborhood_Map vs Neighborhood_Demographics)');
  md.push('');
  md.push(`- **In Neighborhood_Map but not Neighborhood_Demographics:** ${report.hoodSetDiff.inNeighborhoodMapNotDemographics.join(', ') || '(none)'}`);
  md.push(`- **In Neighborhood_Demographics but not Neighborhood_Map:** ${report.hoodSetDiff.inDemographicsNotNeighborhoodMap.join(', ') || '(none)'}`);
  md.push('');

  md.push('## World_Config keys present');
  md.push('');
  md.push(report.worldConfigKeys.length ? report.worldConfigKeys.map(k => `- ${k}`).join('\n') : '(tab missing or no keys)');
  md.push('');

  md.push('## Notes');
  md.push('');
  md.push('- This audit is read-only; no sheet was modified.');
  md.push(`- Hospital_Ledger: ${raw.Hospital_Ledger.present ? `${raw.Hospital_Ledger.data.length - 1} rows` : 'tab absent'}; Relationship_Bonds: ${raw.Relationship_Bonds.present ? `${raw.Relationship_Bonds.data.length - 1} rows` : 'tab absent'}.`);
  md.push('- The sick-rate band is intentionally soft: the hood chase is designed to lag the city dial by many cycles, so a ≥25-cycle convergence window is expected before failing.');
  md.push('- Migration invariant is currently SKIP because Neighborhood_Demographics has no migration/inflow column; the known `/17` over-allocation bug is latent in the code, not visible in this sheet layout.');
  md.push('');
  return md.join('\n');
}

async function main() {
  const audit = await computeCascadeAudit();
  const md = renderMarkdown(audit);
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_MD, md, 'utf8');
  fs.writeFileSync(OUT_JSON, JSON.stringify(audit.report, null, 2), 'utf8');

  console.log(`Wrote ${OUT_MD}`);
  console.log(`Wrote ${OUT_JSON}`);
}

module.exports = { computeCascadeAudit, renderMarkdown };

if (require.main === module) {
  main().catch(e => { console.error(e); process.exit(1); });
}

#!/usr/bin/env node
'use strict';

/**
 * engine.82 one-time CareerStage column repair (S366).
 * Run: node repairCareerStage.js [--apply]
 * Without --apply: dry-run — reports class counts, writes nothing.
 * With --apply: snapshots pre-image to output/, writes the repaired column,
 * reads it back and verifies.
 *
 * Rules (mirror deriveCareerStage_ in educationCareerEngine.js — vm-loaded
 * from the engine file itself so repair and engine cannot drift):
 *   - spelling-normalize every value to student|entry|mid|senior|retired
 *   - active RoleType + stage class STUDENT/RETIRED/blank → re-derive
 *   - inactive role (blank/'student'/'Retired X') → full re-derive
 *   - coherent entry/mid/senior on an active role → keep (preserves
 *     promotion history; only the spelling converges)
 *   - Age = 2041 − BirthYear (never trust derived Age fields)
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const REPO = '/root/GodWorld';
require(path.join(REPO, 'lib', 'env'));
const sheets = require(path.join(REPO, 'lib', 'sheets.js'));

const sandbox = { Logger: { log() {} }, Math, Number, String, Array, Object, JSON, Date, console };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(REPO, 'phase05-citizens', 'educationCareerEngine.js'), 'utf8'), sandbox);

const CANON = new Set(['student', 'entry', 'mid', 'senior', 'retired', '']);

function normalizeSpelling(v) {
  const cls = sandbox.careerStageClass_(v);
  const raw = String(v || '').trim();
  if (!raw) return '';
  return { ENTRY: 'entry', MID: 'mid', SENIOR: 'senior', STUDENT: 'student', RETIRED: 'retired' }[cls];
}

(async () => {
  const apply = process.argv.includes('--apply');
  const data = await sheets.getSheetData('Simulation_Ledger');
  const headers = data[0];
  const idx = (n) => headers.indexOf(n);
  const iPop = idx('POPID'), iStage = idx('CareerStage'), iRole = idx('RoleType'),
        iStatus = idx('Status'), iBirth = idx('BirthYear'), iYears = idx('YearsInCareer');
  if (iStage < 0 || iRole < 0 || iBirth < 0) throw new Error('missing columns: ' + [iStage, iRole, iBirth]);

  const counts = { unchanged: 0, normalizeOnly: 0, rederivedActiveRole: 0, rederivedInactiveRole: 0, deceasedSkipped: 0 };
  const changes = [];
  const preimage = [];
  const newCol = [];

  for (let r = 1; r < data.length; r++) {
    const row = data[r];
    const cur = String(row[iStage] || '').trim();
    const status = String(row[iStatus] || 'active').trim().toLowerCase();
    const role = row[iRole];
    const birth = Number(row[iBirth]) || 0;
    const age = birth > 1900 ? 2041 - birth : 40;
    const years = Number(row[iYears]) || 0;
    preimage.push({ popid: row[iPop], stage: cur });

    let next;
    if (status === 'deceased') {
      // don't churn the dead — spelling-normalize only
      next = normalizeSpelling(cur);
      if (next !== cur) counts.normalizeOnly++; else counts.deceasedSkipped++;
    } else {
      const roleActive = sandbox.roleIsActive_(role);
      const cls = cur ? sandbox.careerStageClass_(cur) : '';
      if (roleActive && (cls === 'STUDENT' || cls === 'RETIRED' || !cur)) {
        next = sandbox.deriveCareerStage_(status, role, age, years);
        counts.rederivedActiveRole++;
      } else if (!roleActive) {
        next = sandbox.deriveCareerStage_(status, role, age, years);
        if (next === normalizeSpelling(cur) && cur) { counts.normalizeOnly += (next !== cur ? 1 : 0); if (next === cur) counts.unchanged++; }
        else counts.rederivedInactiveRole++;
      } else {
        next = normalizeSpelling(cur);
        if (next !== cur) counts.normalizeOnly++; else counts.unchanged++;
      }
    }
    if (!CANON.has(next)) throw new Error('non-canonical output "' + next + '" at row ' + (r + 1));
    if (next !== cur) changes.push({ row: r + 1, popid: row[iPop], role: String(role || ''), status, age, years, from: cur, to: next });
    newCol.push([next]);
  }

  console.log('rows:', data.length - 1);
  console.log('counts:', JSON.stringify(counts));
  console.log('changes:', changes.length);
  const byTransition = {};
  for (const c of changes) { const k = (c.from || '∅') + '→' + (c.to || '∅'); byTransition[k] = (byTransition[k] || 0) + 1; }
  console.log('transitions:', JSON.stringify(byTransition, null, 1));
  // spot checks: the audit's named cases
  for (const p of ['POP-00034', 'POP-00025', 'POP-00533', 'POP-00053', 'POP-01046', 'POP-00115', 'POP-00594']) {
    const c = changes.find(x => x.popid === p);
    const pre = preimage.find(x => x.popid === p);
    console.log('spot', p, pre ? ('"' + pre.stage + '"') : 'NOT FOUND', c ? ('→ "' + c.to + '"') : '(unchanged)');
  }

  if (!apply) { console.log('\nDRY RUN — no writes. Re-run with --apply.'); return; }

  fs.writeFileSync(path.join(REPO, 'output', 'careerstage_preimage_c103.json'),
    JSON.stringify({ ts: new Date().toISOString(), sheet: 'Simulation_Ledger', column: 'CareerStage', preimage, changes }, null, 1));
  console.log('pre-image saved: output/careerstage_preimage_c103.json');

  // one column write, rows 2..N
  await sheets.updateRangeByPosition('Simulation_Ledger', 2, iStage, newCol); // 0-INDEXED col (S366 incident: +1 wrote col AI/YearsInCareer)
  console.log('column written (' + newCol.length + ' cells)');

  // read-back verify
  const back = await sheets.getSheetData('Simulation_Ledger');
  let mismatches = 0, nonCanon = 0;
  for (let r = 1; r < back.length; r++) {
    const v = String(back[r][iStage] || '').trim();
    if (v !== String(newCol[r - 1][0])) mismatches++;
    if (!CANON.has(v)) nonCanon++;
  }
  console.log('read-back: mismatches=' + mismatches + ' nonCanonical=' + nonCanon);
  if (mismatches || nonCanon) process.exit(1);
  console.log('VERIFIED');
})().catch(e => { console.error(e); process.exit(1); });

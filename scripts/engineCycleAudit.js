#!/usr/bin/env node
/**
 * engineCycleAudit.js — Mechanical baseline for /run-cycle gap log
 *
 * Usage: node scripts/engineCycleAudit.js <cycle> [--write]
 *
 * Reads the cycle's audit artifacts in output/, runs mechanical checks per the
 * 8-class taxonomy, and emits gap-log entries to:
 *   output/production_log_run_cycle_c<XX>_gaps.md
 *
 * Default is dry-run (prints to stdout). --write replaces the file
 * (idempotent re-run; judgment-layer entries that engine-sheet appends after
 * the mechanical pass are preserved by writing them BELOW the mechanical
 * footer marker — re-run keeps anything below the marker).
 *
 * Classes implemented in V1 (data already exists in repo):
 *   - writeback-drift    (engine_audit_c<XX>.json type=writeback-drift)
 *   - math-anomaly       (engine_audit_c<XX>.json type=math-imbalance)
 *   - cross-cycle-debt   (engine_audit_c<XX>.json type=stuck-initiative >= 2 cycles)
 *   - determinism-break  (grep engine source for Math.random/Date.now leaks)
 *
 * Classes pending engine-run-log ingest (V2 — Apps Script log capture):
 *   - phase-skip
 *   - cohort-collision
 *   - phase-ordering
 *   - silent-fail
 *
 * Plan: docs/plans/2026-05-03-run-cycle-gap-log-surface.md
 * Surfaced: SESSION_CONTEXT.md S197 meta-gap on run-cycle observation surface
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const MECHANICAL_FOOTER = '<!-- end mechanical pass — judgment entries below this line are preserved across re-runs -->';

function main() {
  const cycle = parseInt(process.argv[2], 10);
  const writeMode = process.argv.includes('--write');
  if (!cycle || isNaN(cycle)) {
    console.error('Usage: node scripts/engineCycleAudit.js <cycle> [--write]');
    process.exit(1);
  }

  const findings = [];
  let auditJson = null;

  // V1 classes — data already in repo
  try {
    auditJson = loadAuditJson(cycle);
    findings.push(...auditWritebackDrift(auditJson));
    findings.push(...auditMathAnomaly(auditJson));
    findings.push(...auditCrossCycleDebt(auditJson, cycle));
  } catch (err) {
    findings.push({
      class: 'audit-input',
      severity: 'HIGH',
      title: `engine_audit_c${cycle}.json missing or unreadable — V1 classes degraded`,
      diagnosis: `Cannot read output/engine_audit_c${cycle}.json: ${err.message}. /engine-review must run before /engineCycleAudit. writeback-drift, math-anomaly, cross-cycle-debt classes skipped this pass.`,
    });
  }
  findings.push(...auditDeterminismBreak());

  // V2-pending classes — need engine-run-log ingest path
  for (const cls of ['phase-skip', 'cohort-collision', 'phase-ordering', 'silent-fail']) {
    findings.push({
      class: cls,
      severity: 'INFO',
      pending: true,
      title: `${cls} — V2-pending (engine-run-log ingest path not yet built)`,
      diagnosis: `Detection requires Apps Script execution-log capture into the local repo. /run-cycle Step 3 currently runs engine in Google's cloud and does not persist execution logs locally. When that ingest path lands, this class becomes mechanically detectable.`,
    });
  }

  emit(cycle, findings, auditJson, writeMode);
}

// ---------------------------------------------------------------------------
// Loaders
// ---------------------------------------------------------------------------

function loadAuditJson(cycle) {
  const p = path.join(ROOT, 'output', `engine_audit_c${cycle}.json`);
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function loadPriorGapLog(cycle) {
  const p = path.join(ROOT, 'output', `production_log_run_cycle_c${cycle - 1}_gaps.md`);
  if (!fs.existsSync(p)) return null;
  return fs.readFileSync(p, 'utf8');
}

// ---------------------------------------------------------------------------
// V1 detectors
// ---------------------------------------------------------------------------

function auditWritebackDrift(audit) {
  const out = [];
  for (const p of audit.patterns || []) {
    if (p.type !== 'writeback-drift') continue;
    out.push({
      class: 'writeback-drift',
      severity: severityFromAudit(p.severity),
      title: trimTitle(p.description || 'Writeback drift detected'),
      diagnosis: buildDiagnosis(p),
      sourceRef: `output/engine_audit_c${audit.cycle}.json (pattern type=writeback-drift)`,
    });
  }
  return out;
}

function auditMathAnomaly(audit) {
  const out = [];
  for (const p of audit.patterns || []) {
    if (p.type !== 'math-imbalance') continue;
    out.push({
      class: 'math-anomaly',
      severity: severityFromAudit(p.severity),
      title: trimTitle(p.description || 'Math imbalance detected'),
      diagnosis: buildDiagnosis(p),
      sourceRef: `output/engine_audit_c${audit.cycle}.json (pattern type=math-imbalance)`,
    });
  }
  return out;
}

function auditCrossCycleDebt(audit, cycle) {
  const out = [];
  // Stuck-initiative patterns where cyclesInState >= 2 are debt rolling forward.
  // Higher cyclesInState = more compounded debt; map to severity.
  for (const p of audit.patterns || []) {
    if (p.type !== 'stuck-initiative') continue;
    const cycles = p.cyclesInState || 0;
    if (cycles < 2) continue;
    const sev = cycles >= 30 ? 'HIGH' : cycles >= 5 ? 'MED' : 'LOW';
    out.push({
      class: 'cross-cycle-debt',
      severity: sev,
      title: `${trimTitle(p.description || 'Stuck initiative')} (${cycles} cycles)`,
      diagnosis: buildDiagnosis(p),
      sourceRef: `output/engine_audit_c${audit.cycle}.json (pattern type=stuck-initiative, cyclesInState=${cycles})`,
    });
  }
  // Compare against prior cycle's gap log if present — repeat-pattern signal.
  const prior = loadPriorGapLog(cycle);
  if (prior) {
    const priorOpen = (prior.match(/^### G-EC\d+.*$/gm) || []).length;
    if (priorOpen > 0) {
      out.push({
        class: 'cross-cycle-debt',
        severity: 'INFO',
        title: `Prior cycle's gap log (C${cycle - 1}) had ${priorOpen} entries — manual review for repeats recommended`,
        diagnosis: `Cross-cycle pattern detection beyond stuck-initiative is judgment-layer work. Read output/production_log_run_cycle_c${cycle - 1}_gaps.md OPEN entries and flag any that recur in this cycle's findings.`,
      });
    }
  }
  return out;
}

function auditDeterminismBreak() {
  const out = [];
  // Engine-rule: phase*/**/*.js must use ctx.rng, never Math.random.
  // Date.now is allowed for ctx.now / timestamps; flag only suspicious usage
  // (in conditional or seed contexts). For V1 we just count Math.random
  // occurrences in phase files; pre-commit hook should catch edits, but a
  // mechanical sweep here catches drift between hook bypasses or hook misses.
  const phaseDirs = fs.readdirSync(ROOT)
    .filter(d => /^phase\d+/.test(d))
    .map(d => path.join(ROOT, d));

  let hits = 0;
  const examples = [];
  for (const dir of phaseDirs) {
    walkJs(dir, (file, content) => {
      // Allow comments + throw blocks + utilities/v2DeprecationGuide-style
      // throw-on-call patterns; flag bare invocations.
      const lines = content.split('\n');
      lines.forEach((line, i) => {
        if (!/Math\.random\s*\(/.test(line)) return;
        if (/\/\//.test(line.split('Math.random')[0] || '')) return; // comment before usage
        if (/throw/.test(line)) return; // throw-guard pattern
        hits++;
        if (examples.length < 5) {
          examples.push(`${path.relative(ROOT, file)}:${i + 1}`);
        }
      });
    });
  }

  if (hits > 0) {
    out.push({
      class: 'determinism-break',
      severity: hits >= 3 ? 'HIGH' : 'MED',
      title: `Math.random() usage in engine phase files (${hits} occurrence${hits === 1 ? '' : 's'})`,
      diagnosis: `Engine rule (.claude/rules/engine.md): phase*/**/*.js must use ctx.rng. Pre-commit hook flags edits, but mechanical sweep caught bare invocation${hits === 1 ? '' : 's'} that bypass${hits === 1 ? '' : ''} the hook (or pre-date it). Examples: ${examples.join(', ')}${hits > examples.length ? ` (and ${hits - examples.length} more)` : ''}.`,
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function walkJs(dir, fn) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walkJs(p, fn);
    else if (e.isFile() && p.endsWith('.js')) {
      fn(p, fs.readFileSync(p, 'utf8'));
    }
  }
}

function severityFromAudit(s) {
  if (!s) return 'MED';
  const v = s.toString().toLowerCase();
  if (v === 'high') return 'HIGH';
  if (v === 'low') return 'LOW';
  return 'MED';
}

function trimTitle(s) {
  return (s || '').toString().trim().replace(/\s+/g, ' ').slice(0, 140);
}

function buildDiagnosis(p) {
  const ev = p.evidence || {};
  const parts = [];
  if (ev.sheet) parts.push(`Sheet: \`${ev.sheet}\``);
  if (ev.rows && ev.rows.length) parts.push(`Rows: ${ev.rows.slice(0, 5).join(', ')}${ev.rows.length > 5 ? '…' : ''}`);
  if (ev.fields) {
    const f = Object.entries(ev.fields).slice(0, 4).map(([k, v]) => `${k}=${JSON.stringify(v)}`).join(', ');
    parts.push(`Fields: ${f}`);
  }
  if (p.mitigatorState && p.mitigatorState.exists === false) parts.push(`Mitigator: none (no-mitigator)`);
  if (p.affectedEntities) {
    const a = p.affectedEntities;
    const tags = [];
    if (a.initiatives && a.initiatives.length) tags.push(`init=${a.initiatives.join(',')}`);
    if (a.neighborhoods && a.neighborhoods.length) tags.push(`nbhd=${a.neighborhoods.slice(0, 3).join(',')}${a.neighborhoods.length > 3 ? '…' : ''}`);
    if (tags.length) parts.push(`Affected: ${tags.join(' / ')}`);
  }
  return parts.join(' • ') || (p.description || 'See source artifact for details.');
}

// ---------------------------------------------------------------------------
// Emit
// ---------------------------------------------------------------------------

function emit(cycle, findings, auditJson, writeMode) {
  const target = path.join(ROOT, 'output', `production_log_run_cycle_c${cycle}_gaps.md`);

  // Sort: HIGH > MED > LOW > INFO; then by class
  const sevRank = { HIGH: 0, MED: 1, LOW: 2, INFO: 3 };
  findings.sort((a, b) => (sevRank[a.severity] ?? 9) - (sevRank[b.severity] ?? 9) || a.class.localeCompare(b.class));

  const summary = countBySeverity(findings);
  const realCount = findings.filter(f => !f.pending && f.class !== 'audit-input').length;

  let md = '';
  md += `# /run-cycle Gap Log — Cycle ${cycle}\n\n`;
  md += `**Generated:** ${new Date().toISOString()}\n`;
  md += `**Script:** \`scripts/engineCycleAudit.js\` (mechanical V1)\n`;
  md += `**Plan:** \`docs/plans/2026-05-03-run-cycle-gap-log-surface.md\`\n\n`;

  if (auditJson && auditJson.summary) {
    const s = auditJson.summary;
    md += `**Cycle headline metrics:** ${s.highSeverity || 0} HIGH / ${s.mediumSeverity || 0} MED / ${s.lowSeverity || 0} LOW patterns flagged by engineAuditor; ${s.improvements || 0} improvements; ${s.incoherence || 0} incoherence findings. Pattern types: ${Object.entries(s.byType || {}).map(([k, v]) => `${k}=${v}`).join(', ')}.\n\n`;
  }

  md += `**Mechanical pass:** ${realCount} entr${realCount === 1 ? 'y' : 'ies'} (HIGH ${summary.HIGH}, MED ${summary.MED}, LOW ${summary.LOW}). 4 V2-pending classes appended below.\n\n`;
  md += `**Taxonomy** (8 classes per plan): \`phase-skip\` \`writeback-drift\` \`cohort-collision\` \`math-anomaly\` \`determinism-break\` \`phase-ordering\` \`silent-fail\` \`cross-cycle-debt\`.\n\n`;
  md += `---\n\n`;

  if (realCount === 0 && findings.every(f => f.pending || f.severity === 'INFO')) {
    md += `## 0 mechanical gaps observed\n\n`;
    md += `Engine audit clean for V1 detector classes. V2-pending classes (phase-skip, cohort-collision, phase-ordering, silent-fail) require engine-run-log ingest before they can be mechanically checked.\n\n`;
    md += `Engine-sheet judgment-layer review still recommended — append entries below the footer marker.\n\n`;
    md += `---\n\n`;
  } else {
    findings.forEach((f, i) => {
      const num = `G-EC${i + 1}`;
      const tags = [`[mechanical]`, `[${f.class}]`, `[${f.severity}]`];
      md += `### ${num} — ${f.title} ${tags.join(' ')}\n\n`;
      if (f.sourceRef) md += `- **Source:** ${f.sourceRef}\n`;
      md += `- **Diagnosis:** ${f.diagnosis}\n`;
      md += `- **Status:** ${f.pending ? 'V2-PENDING' : 'OPEN'}\n\n`;
    });
  }

  md += `${MECHANICAL_FOOTER}\n\n`;
  md += `## Judgment-layer entries (engine-sheet appends here)\n\n`;
  md += `*Coder voice: terse, mechanical, commit-message style. Tag each entry \`[judgment]\`. Use G-EC{N+} numbering continuing from the mechanical pass.*\n\n`;

  if (writeMode) {
    // Preserve any existing judgment entries below the footer marker on re-run.
    let preserved = '';
    if (fs.existsSync(target)) {
      const existing = fs.readFileSync(target, 'utf8');
      const idx = existing.indexOf(MECHANICAL_FOOTER);
      if (idx >= 0) {
        const after = existing.slice(idx + MECHANICAL_FOOTER.length);
        // Strip the default judgment-layer header if it's the only thing after
        const stripped = after.replace(/^\s*## Judgment-layer entries \(engine-sheet appends here\)\s*\n\n\*[^*]+\*\n\n/m, '').trim();
        if (stripped) preserved = '\n' + stripped + '\n';
      }
    }
    md = md.replace(MECHANICAL_FOOTER, MECHANICAL_FOOTER + preserved);
    fs.writeFileSync(target, md);
    process.stdout.write(`Wrote ${path.relative(ROOT, target)} — ${realCount} mechanical entries (${summary.HIGH} HIGH / ${summary.MED} MED / ${summary.LOW} LOW)`);
    if (realCount === 0) process.stdout.write(' [0 gaps observed]');
    process.stdout.write('\n');
  } else {
    process.stdout.write(md);
    process.stderr.write(`\n[dry-run] Would write to: ${path.relative(ROOT, target)}\n`);
    process.stderr.write(`[dry-run] Pass --write to persist.\n`);
  }
}

function countBySeverity(findings) {
  const c = { HIGH: 0, MED: 0, LOW: 0, INFO: 0 };
  for (const f of findings) {
    if (f.pending) continue;
    c[f.severity] = (c[f.severity] || 0) + 1;
  }
  return c;
}

main();

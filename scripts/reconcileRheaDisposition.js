#!/usr/bin/env node
'use strict';

/**
 * Reconcile standalone Rhea verdicts into the weekday probation wall.
 *
 * pass=true  -> output/cron-compare/staged/<stem>.staged.{md,json}
 * pass=false -> output/cron-compare/flagged/<stem>.{md,flags.json}
 *
 * Saturday remains the only canon door. This script is local-only: it never
 * calls a model or writes Sheets, Drive, Supermemory, byline credit, or canon.
 * Dry-run is the default; pass --apply to mutate local output artifacts.
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const articleContamination = require('./articleContamination');

const ROOT = path.resolve(__dirname, '..');

function arg(args, flag, def = null) {
  const i = args.indexOf(flag);
  if (i !== -1 && args[i + 1]) return args[i + 1];
  const eq = args.find(value => value.startsWith(flag + '='));
  return eq ? eq.slice(flag.length + 1) : def;
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function sha256File(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function within(parent, child) {
  const rel = path.relative(parent, child);
  return rel && !rel.startsWith('..' + path.sep) && rel !== '..' && !path.isAbsolute(rel);
}

function ensureDir(dir, apply) {
  if (apply) fs.mkdirSync(dir, { recursive: true });
}

function uniqueArchivePath(historyDir, filename) {
  const parsed = path.parse(filename);
  let candidate = path.join(historyDir, filename);
  let n = 2;
  while (fs.existsSync(candidate)) {
    candidate = path.join(historyDir, parsed.name + '-' + n + parsed.ext);
    n++;
  }
  return candidate;
}

function archiveFile(file, historyDir, label, stamp, actions, apply) {
  if (!fs.existsSync(file)) return null;
  ensureDir(historyDir, apply);
  const parsed = path.parse(file);
  const target = uniqueArchivePath(historyDir,
    parsed.name + '.' + label + '.' + stamp + parsed.ext);
  actions.push('archive ' + file + ' -> ' + target);
  if (apply) fs.renameSync(file, target);
  return target;
}

function writeJsonAtomic(file, value) {
  const temp = file + '.tmp-' + process.pid;
  fs.writeFileSync(temp, JSON.stringify(value, null, 2));
  fs.renameSync(temp, file);
}

function quotesFromState(state) {
  return (((state || {}).exposure || {}).sources || [])
    .filter(row => row && row.name && row.pop)
    .map(row => ({ name: row.name, pop: row.pop, quote: row.quote || null }));
}

function validateReviewedDraft(verdict, draftAbs) {
  const actualHash = sha256File(draftAbs);
  if (verdict.draftSha256) {
    if (verdict.draftSha256 !== actualHash) {
      throw new Error('stale Rhea verdict: draft SHA-256 no longer matches');
    }
    return actualHash;
  }
  const reviewedAt = Date.parse(verdict.ranAt || '');
  const modifiedAt = fs.statSync(draftAbs).mtimeMs;
  if (!Number.isFinite(reviewedAt) || modifiedAt > reviewedAt + 1000) {
    throw new Error('legacy Rhea verdict has no draftSha256 and the draft is newer than the verdict');
  }
  return actualHash;
}

function reconcileVerdict({ root = ROOT, verdictPath, apply = false, now = new Date() }) {
  const compare = path.join(root, 'output', 'cron-compare');
  const staged = path.join(compare, 'staged');
  const flagged = path.join(compare, 'flagged');
  const history = path.join(flagged, 'history');
  const verdictAbs = path.isAbsolute(verdictPath)
    ? path.resolve(verdictPath)
    : path.resolve(root, verdictPath);
  if (!within(compare, verdictAbs) || path.dirname(verdictAbs) !== compare ||
      !verdictAbs.endsWith('.rhea.json')) {
    throw new Error('verdict must be a root output/cron-compare/*.rhea.json file');
  }

  const verdict = readJson(verdictAbs);
  if (typeof verdict.pass !== 'boolean') throw new Error('Rhea verdict pass must be boolean');
  const draftAbs = path.resolve(root, String(verdict.draft || ''));
  if (!within(compare, draftAbs) || path.dirname(draftAbs) !== compare ||
      path.extname(draftAbs) !== '.md' || !fs.existsSync(draftAbs)) {
    throw new Error('Rhea verdict draft must resolve to an existing root cron-compare Article');
  }
  const base = path.basename(draftAbs, '.md');
  if (path.basename(verdictAbs) !== base + '.rhea.json') {
    throw new Error('Rhea verdict filename does not match its draft');
  }
  const draftSha256 = validateReviewedDraft(verdict, draftAbs);

  const wakePath = path.join(compare, base + '.wake.json');
  if (!fs.existsSync(wakePath)) throw new Error('missing wake record for ' + base);
  const wake = readJson(wakePath);
  const statePath = path.join(compare, base + '.state.json');
  const state = fs.existsSync(statePath) ? readJson(statePath) : null;
  const cycle = String(verdict.cycle || wake.cycle || '');
  if (!cycle || (wake.cycle != null && String(wake.cycle) !== cycle)) {
    throw new Error('verdict/wake cycle mismatch for ' + base);
  }
  const byline = wake.byline || (state && state.actor) || {};
  if (!wake.desk || !byline.name || !/^POP-\d{5}$/.test(String(byline.popid || byline.id || ''))) {
    throw new Error('wake record lacks desk or stable byline identity for ' + base);
  }
  const contamination = articleContamination.scanFile(draftAbs, { desk: wake.desk });
  const effectivePass = verdict.pass && !contamination.fail;

  const stamp = now.toISOString().replace(/\D/g, '').slice(0, 14);
  const stagedArticle = path.join(staged, base + '.staged.md');
  const stagedSidecar = path.join(staged, base + '.staged.json');
  const flaggedArticle = path.join(flagged, base + '.md');
  const flaggedSidecar = path.join(flagged, base + '.flags.json');
  const actions = [];

  if (effectivePass) {
    archiveFile(flaggedArticle, history, 'cleared', stamp, actions, apply);
    archiveFile(flaggedSidecar, history, 'cleared', stamp, actions, apply);
    if (fs.existsSync(stagedArticle) && sha256File(stagedArticle) !== draftSha256) {
      archiveFile(stagedArticle, history, 'superseded-stage', stamp, actions, apply);
      archiveFile(stagedSidecar, history, 'superseded-stage', stamp, actions, apply);
    }
    ensureDir(staged, apply);
    actions.push('stage ' + draftAbs + ' -> ' + stagedArticle);
    if (apply) fs.copyFileSync(draftAbs, stagedArticle);

    const { buildIntakeSidecar } = require('./cron-desk-run');
    const intake = buildIntakeSidecar(fs.readFileSync(draftAbs, 'utf8'), quotesFromState(state));
    if (!intake) throw new Error('reviewed Article has no parseable INTAKE block');
    let priorSidecar = null;
    if (fs.existsSync(stagedSidecar)) {
      try { priorSidecar = readJson(stagedSidecar); } catch (_) { /* replace invalid local sidecar */ }
    }
    const sidecar = {
      status: 'staged',
      desk: wake.desk,
      cycle,
      persona: wake.persona || null,
      byline: byline.name,
      bylinePopid: byline.popid || byline.id,
      article: path.relative(root, stagedArticle),
      bylineUsage: {
        recorded: false,
        reason: 'local Rhea reconciliation; no external byline write performed'
      },
      intake,
      ...(priorSidecar && priorSidecar.approval ? { approval: priorSidecar.approval } : {}),
      rhea: {
        pass: true,
        model: verdict.model || null,
        manifestId: verdict.reviewProfile && verdict.reviewProfile.manifestId || null,
        draftSha256,
        verdict: path.relative(root, verdictAbs),
        ranAt: verdict.ranAt || null
      },
      note: 'Rhea-cleared weekday probation stage; not canon until the Saturday gate.',
      stagedAt: now.toISOString()
    };
    actions.push('write ' + stagedSidecar);
    if (apply) writeJsonAtomic(stagedSidecar, sidecar);
    wake.disposition = 'staged';
    wake.rheaPass = true;
    wake.rheaFlagCount = Number.isInteger(verdict.flagCount) ? verdict.flagCount : (verdict.flags || []).length;
    wake.gateModel = verdict.model || wake.gateModel;
    wake.article = path.relative(root, stagedArticle);
  } else {
    archiveFile(stagedArticle, history, 'failed-rereview', stamp, actions, apply);
    archiveFile(stagedSidecar, history, 'failed-rereview', stamp, actions, apply);
    archiveFile(flaggedArticle, history, 'superseded-failure', stamp, actions, apply);
    archiveFile(flaggedSidecar, history, 'superseded-failure', stamp, actions, apply);
    ensureDir(flagged, apply);
    actions.push('flag ' + draftAbs + ' -> ' + flaggedArticle);
    if (apply) fs.copyFileSync(draftAbs, flaggedArticle);
    const flags = {
      draft: path.basename(draftAbs),
      draftSha256,
      verdict: path.relative(root, verdictAbs),
      flags: Array.isArray(verdict.flags) ? verdict.flags : [],
      contamination: contamination.findings,
      summary: contamination.fail ? 'deterministic world-contamination blocker failed' :
        verdict.summary || 'Rhea did not pass this Article',
      reviewedAt: verdict.ranAt || null
    };
    actions.push('write ' + flaggedSidecar);
    if (apply) writeJsonAtomic(flaggedSidecar, flags);
    wake.disposition = 'flagged';
    wake.rheaPass = verdict.pass;
    wake.contamination = contamination;
    wake.rheaFlagCount = Number.isInteger(verdict.flagCount) ? verdict.flagCount : flags.flags.length;
    wake.gateModel = verdict.model || wake.gateModel;
    wake.article = path.relative(root, flaggedArticle);
  }

  wake.dispositionReconciledAt = now.toISOString();
  actions.push('update ' + wakePath);
  if (apply) writeJsonAtomic(wakePath, wake);
  return { base, cycle, disposition: effectivePass ? 'staged' : 'flagged', actions };
}

function verdictsForCycle(root, cycle) {
  const compare = path.join(root, 'output', 'cron-compare');
  if (!fs.existsSync(compare)) return [];
  return fs.readdirSync(compare).filter(file => file.endsWith('.rhea.json')).sort()
    .map(file => path.join(compare, file))
    .filter(file => {
      try { return String(readJson(file).cycle) === String(cycle); } catch (_) { return false; }
    });
}

function main(argv = process.argv.slice(2)) {
  const apply = argv.includes('--apply');
  const cycle = arg(argv, '--cycle');
  const one = arg(argv, '--verdict');
  if (!cycle && !one) throw new Error('pass --cycle N or --verdict <output/cron-compare/*.rhea.json>');
  const verdicts = one ? [one] : verdictsForCycle(ROOT, cycle);
  if (!verdicts.length) {
    console.log('no Rhea verdicts found' + (cycle ? ' for c' + cycle : ''));
    return;
  }
  let failures = 0;
  for (const verdictPath of verdicts) {
    try {
      const result = reconcileVerdict({ root: ROOT, verdictPath, apply });
      console.log((apply ? 'APPLIED' : 'DRY-RUN') + ' ' + result.base + ' -> ' + result.disposition);
      for (const action of result.actions) console.log('  ' + action);
    } catch (error) {
      failures++;
      console.error('BLOCKED ' + path.basename(verdictPath) + ': ' + error.message);
    }
  }
  if (failures) process.exitCode = 1;
}

if (require.main === module) {
  try { main(); } catch (error) { console.error('Fatal: ' + error.message); process.exit(1); }
}

module.exports = {
  sha256File,
  validateReviewedDraft,
  reconcileVerdict,
  verdictsForCycle,
  main
};

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

// pipeline.78 (codex #1): every staged pair of this base — plain X.staged.md or the S492
// suffix X.staged-HHMM.md a second filing in the Cycle takes. Each is a distinct filing.
function stagedPairsFor(stagedDir, base) {
  if (!fs.existsSync(stagedDir)) return [];
  const out = [];
  for (const f of fs.readdirSync(stagedDir).sort()) {
    const m = /^(.+)\.staged(?:-\d{3,4})?\.md$/.exec(f);
    if (!m || m[1] !== base) continue;
    const md = path.join(stagedDir, f);
    out.push({ md, json: md.replace(/\.md$/, '.json'), sha: sha256File(md) });
  }
  return out;
}

// The plain name when free, else the writer's uniqueDest form (-HHMM, stepped past any taken).
function freeStagedName(stagedDir, base, now) {
  const plain = path.join(stagedDir, base + '.staged.md');
  if (!fs.existsSync(plain)) return plain;
  for (let n = Number(now.toISOString().slice(11, 16).replace(':', '')); ; n++) {
    const q = path.join(stagedDir, base + '.staged-' + String(n).padStart(4, '0') + '.md');
    if (!fs.existsSync(q)) return q;
  }
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
  // groundedBy support (articleContamination.js, 2026-09-17 Chinatown/Caldera
  // false-positive fix) needs the same facts the writer packet carried. pipeline.78:
  // scan against the whole wake-3 state, as the write (cron-desk-run) and Saturday do —
  // manifest alone dropped the Packet provenance the invented-voice wall reads, and
  // flagged C111 Carmen's office-record quote that her write had staged clean.
  const contamination = articleContamination.scanFile(draftAbs, { desk: wake.desk, packet: state });
  const effectivePass = verdict.pass && !contamination.fail;

  const stamp = now.toISOString().replace(/\D/g, '').slice(0, 14);
  const pairs = stagedPairsFor(staged, base);
  const filed = effectivePass ? pairs.find(p => p.sha === draftSha256) : null;
  const stagedArticle = filed ? filed.md : freeStagedName(staged, base, now);
  const stagedSidecar = stagedArticle.replace(/\.md$/, '.json');
  const packetDir = path.join(compare, 'staged-packets');
  const packetFile = path.join(packetDir, require('../lib/articleIntake').stagedPacketName(stagedArticle));
  const flaggedArticle = path.join(flagged, base + '.md');
  const flaggedSidecar = path.join(flagged, base + '.flags.json');
  const actions = [];

  // A draft archived as superseded-stage (a rerun replaced it, builder ruling) stays retired;
  // its root verdict still reads PASS, and re-staging it would resurrect the replaced piece.
  const retired = effectivePass && !filed && fs.existsSync(history) && fs.readdirSync(history)
    .filter(f => f.startsWith(base + '.staged') && /\.superseded-stage\.[^.]+\.md$/.test(f))
    .some(f => sha256File(path.join(history, f)) === draftSha256);

  if (retired) {
    actions.push('superseded filing stays retired (history holds these bytes)');
    return { base, cycle, disposition: 'superseded', actions };
  }
  if (effectivePass && filed) {
    // Already staged under some name (plain or suffixed): nothing to re-file. A different
    // staged pair of this base is a separate filing and is left where it is.
    archiveFile(flaggedArticle, history, 'cleared', stamp, actions, apply);
    archiveFile(flaggedSidecar, history, 'cleared', stamp, actions, apply);
    actions.push('already staged as ' + path.relative(root, stagedArticle));
    wake.disposition = 'staged';
    wake.rheaPass = true;
    wake.article = path.relative(root, stagedArticle);
  } else if (effectivePass) {
    archiveFile(flaggedArticle, history, 'cleared', stamp, actions, apply);
    archiveFile(flaggedSidecar, history, 'cleared', stamp, actions, apply);
    ensureDir(staged, apply);
    actions.push('stage ' + draftAbs + ' -> ' + stagedArticle);
    if (apply) fs.copyFileSync(draftAbs, stagedArticle);
    // The filing's own Packet, for Saturday's contamination re-scan (see cron-saturday-run).
    if (state) {
      actions.push('bind packet ' + path.relative(root, packetFile));
      if (apply) { ensureDir(packetDir, apply); writeJsonAtomic(packetFile, state); }
    }

    const { buildIntakeSidecar, storylineTagFor } = require('./cron-desk-run');
    // engine.270: the storyline is resolved from the assignment's ref, which the
    // wake-3 state carries as signal.src.
    const storyRef = state && state.signal && state.signal.src;
    let intake = buildIntakeSidecar(fs.readFileSync(draftAbs, 'utf8'), quotesFromState(state),
      storyRef ? storylineTagFor({ ref: storyRef }, cycle) : null);
    if (!intake) throw new Error('reviewed Article has no parseable INTAKE block');
    // research.27: the weekly digest's pilot credit is injected after buildIntakeSidecar in the
    // write stage; a rebuild here dropped it (Sat 2026-10-03: three printed pilots, names [], no
    // Citizen_Media_Usage row). Same call, same slice.
    if (wake.desk === 'undocked-digest') {
      const { injectWeeklyPilotCredit } = require('./cron-desk-run');
      const { loadNiaWeeklySlice } = require('./buildNiaSlice');
      const weekly = loadNiaWeeklySlice(cycle, root);
      intake = injectWeeklyPilotCredit(intake, fs.readFileSync(draftAbs, 'utf8'), weekly && weekly.pilots);
    }
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
        ranAt: verdict.ranAt || null,
        ...(verdict.contractScore && Number.isInteger(verdict.contractScore.score) ? { contractScore: verdict.contractScore } : {})
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
    // Only a staged pair holding these exact bytes fails with this verdict; another filing of
    // the base carries its own proof and stays staged.
    for (const p of pairs.filter(p => p.sha === draftSha256)) {
      archiveFile(p.md, history, 'failed-rereview', stamp, actions, apply);
      archiveFile(p.json, history, 'failed-rereview', stamp, actions, apply);
    }
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

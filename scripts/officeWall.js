#!/usr/bin/env node
/**
 * officeWall.js — official position continuity for civic office-holders (civic.16)
 *
 * When a holder speaks (Sunday cascade or Mon–Thu datawake), append to their
 * citizen page (cp-POP-*) with daypart CIVIC. Not bay-tribune canon, not
 * Initiative_Tracker authority. Hard-inject prior positions on next civic run.
 *
 * Faction multi-seat agents: always key by map holder POPID (spokesperson
 * district for OPP/CRC/IND), never the agentDir slug alone.
 *
 * Usage:
 *   node scripts/officeWall.js --pop POP-00034
 *   const { resolveHolder, recordPosition, formatPositionWall, loadPositionWall } = require('./officeWall');
 */

'use strict';

require('/root/GodWorld/lib/env');
const path = require('path');
const fs = require('fs');
const ROOT = path.join(__dirname, '..');

/** Faction agentDir → spokesperson district (matches cron-civic-run BLOC_SPOKESPERSON). */
const BLOC_SPOKESPERSON_DISTRICT = {
  'civic-office-opp-faction': 'D5',
  'civic-office-crc-faction': 'D7',
  'civic-office-ind-swing': 'D4',
};

function loadOfficeMap() {
  return JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts', 'civic-office-map.json'), 'utf8'));
}

/**
 * Resolve the human holder row for an agent dir (one POPID for the wall).
 * @returns {{ holder, popid, title, agentDir, officeId?, district? } | null}
 */
function resolveHolder(officeMap, agentDir) {
  if (!agentDir) return null;
  const map = officeMap || loadOfficeMap();
  const civicSeat = require('./civicSeat');
  const byKey = civicSeat.resolveOfficeRow(map, agentDir);
  const rows = byKey && byKey.popid
    ? [byKey]
    : [...(map.offices || []), ...(map.projects || [])].filter(
      (o) => o.agentDir === agentDir && o.popid
    );
  if (!rows.length) return null;
  const want = BLOC_SPOKESPERSON_DISTRICT[agentDir];
  const row = (rows.length > 1 && want) ? (rows.find((r) => r.district === want) || rows[0]) : rows[0];
  return {
    holder: row.holder,
    popid: String(row.popid).toUpperCase(),
    title: row.title || row.projectId || agentDir,
    agentDir,
    officeId: row.officeId || row.projectId || null,
    district: row.district || null,
  };
}

async function ensurePositionWall(popId) {
  if (!popId) return { error: 'no-popid' };
  try {
    const { ensurePagePointer_, pageTagFor } = require(path.join(ROOT, 'lib', 'citizenPage'));
    const tag = pageTagFor(popId);
    const ptr = await ensurePagePointer_(popId);
    return { tag, pointer: ptr, error: ptr.error || null };
  } catch (e) {
    return { error: e.message };
  }
}

// pipeline.112: the page holds the holder's own words; the topic, the speaker, the action and the signal ride the
// doc's metadata. A reader is shown the line as it always read ("stated: [topic] Name — words",
// "datawake: words | action: … | signal: …"), built by lib/pageLabels.js wallLine. An entry stored before, label and
// all, is shown as it is.
const { wallLine, OFFICE_LABEL_RE: WALL_LABEL_RE } = require(path.join(ROOT, 'lib', 'pageLabels'));

async function loadPositionWall(popId, limit) {
  const n = limit == null ? 6 : limit;
  if (!popId) return { tag: null, posts: [], error: 'no-popid' };
  try {
    const { pageTagFor, recentPage_ } = require(path.join(ROOT, 'lib', 'citizenPage'));
    const tag = pageTagFor(popId);
    const r = await recentPage_(popId, Math.max(n * 2, 12)); // oversample; filter CIVIC
    if (r.error) return { tag, posts: [], error: r.error };
    const all = (r.results || []).map((d) => ({
      content: wallLine(d.content, d.metadata),
      createdAt: d.createdAt || null,
      customId: d.customId || null,
      metadata: d.metadata || {},
    })).filter((p) => p.content);
    // Prefer CIVIC daypart posts; fall back to any recent if none yet tagged
    const civic = all.filter((p) => {
      const dp = String((p.metadata && p.metadata.daypart) || '');
      return dp === 'CIVIC' || WALL_LABEL_RE.test(p.content);
    });
    const posts = (civic.length ? civic : all).slice(0, n);
    return { tag, posts };
  } catch (e) {
    return { tag: null, posts: [], error: e.message };
  }
}

/**
 * Hard-inject block for civic user prompts.
 * Not city canon — position continuity only.
 */
function formatPositionWall(wall, opts) {
  const o = opts || {};
  const name = o.name || o.holder || 'you';
  const title = o.title || 'office-holder';
  const tag = (wall && wall.tag) || 'cp-?';
  const L = [];
  L.push('### YOUR OFFICIAL POSITION WALL (Supermemory ' + tag + ' — continuity only, NOT Initiative_Tracker canon)');
  L.push('You are ' + name + ' (' + title + '). Past public positions you took are below.');
  L.push('HOOK them for continuity — do not amnesia a stance you already put on the record.');
  L.push('These lines are NOT tracker authority. Clerk + Initiative_Tracker remain the source of truth for phases and votes.');
  L.push('Do NOT invent new numbers or citizens to match a past wall line.');
  if (!wall || wall.error) {
    L.push('_Position wall unread' + (wall && wall.error ? ' (' + wall.error + ')' : '') + ' — speak from packet only._');
    return L.join('\n');
  }
  if (!wall.posts.length) {
    L.push('_No prior CIVIC positions on this page yet — first save lands after this run._');
    return L.join('\n');
  }
  L.push('RECENT POSITIONS (newest first):');
  wall.posts.forEach((p, i) => {
    const meta = p.metadata || {};
    const when = [meta.cycle != null ? 'c' + meta.cycle : null, meta.daypart, meta.kind]
      .filter(Boolean).join(' · ');
    L.push((i + 1) + '. ' + (when ? '[' + when + '] ' : '') + p.content.slice(0, 420));
  });
  return L.join('\n');
}

/**
 * Append one official position to the holder's page.
 * @param {string} popId
 * @param {string} text - the holder's own words, no label in front (pipeline.112)
 * @param {{ cycle, key, kind, office, holder, extra }} opts - extra: topic / speaker / action / signal
 */
async function recordPosition(popId, text, opts) {
  const o = opts || {};
  if (!popId) return { recorded: false, error: 'no-popid' };
  const body = String(text || '').replace(/\s+/g, ' ').trim();
  if (!body) return { recorded: false, error: 'empty' };
  try {
    const page = require(path.join(ROOT, 'lib', 'citizenPage'));
    const ptr = await page.ensurePagePointer_(popId);
    if (ptr.error) return { recorded: false, error: ptr.error };
    // maxChars: a worker's statement lands whole (pipeline.110 Task 10); every other caller keeps the 1,200 cut
    const appended = await page.appendReflection_(popId, body.slice(0, o.maxChars || 1200), {
      cycle: o.cycle,
      daypart: 'CIVIC',
      key: o.key || 'position',
      extra: {
        type: 'office-position',
        kind: o.kind || 'stated',
        office: o.office || null,
        holder: o.holder || null,
        ...(o.extra || {}),
      },
    });
    if (appended.error) return { recorded: false, error: appended.error, tag: ptr.tag };
    return { recorded: true, tag: ptr.tag, id: appended.id, customId: appended.customId };
  } catch (e) {
    return { recorded: false, error: e.message };
  }
}

/** Build the cascade page entries from the voice JSON statements array: text = the words, extra = topic + speaker. */
function linesFromCascadeStatements(statements, speaker) {
  const out = [];
  const list = Array.isArray(statements) ? statements : [];
  list.forEach((st, i) => {
    const topic = String(st.topic || st.type || '').trim();
    const quote = String(st.quote || '').trim();
    const full = String(st.fullStatement || st.decision || '').trim();
    const core = quote || full || topic;
    if (!core) return;
    const id = st.statementId || String(i);
    const said = (quote || full).slice(0, 500);
    // text: what the page holds — the holder's own words (a statement that is only a topic holds the topic).
    // said: the same words for the caller's Reflection_Intake queue (engine.347 Task 5); '' when there are none.
    out.push({ key: 'cascade-' + String(id).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40), text: said || topic.slice(0, 80), said,
      extra: { topic: said && topic ? topic.slice(0, 80) : null, speaker: speaker ? String(speaker).slice(0, 80) : null } });
  });
  return out;
}

// a model can hand back an object where a sentence belongs; String() of it is "[object Object]" (two holders' pages,
// C103 and C105). Take its text, or leave the part off.
const asText = (v) => (v == null ? '' : typeof v === 'object'
  ? String(v.text || v.summary || v.description || v.what || v.statement || '') : String(v)).trim();

/** The holder's own statement from a datawake rec, whole — the words, not the page line built around them. */
function statementOf(rec) {
  return asText(rec && rec.statement);
}

/** Build the datawake page entry from rec { statement, action, numberMoved }: text = the statement, extra = action + signal. */
function lineFromDatawake(rec) {
  const statement = statementOf(rec);
  if (!statement) return null;
  const action = asText(rec.action), moved = asText(rec.numberMoved);
  const date = (rec && rec.date) || new Date().toISOString().slice(0, 10);
  return { key: 'datawake-' + date, text: statement.slice(0, 600),
    extra: { action: action ? action.slice(0, 200) : null, signal: moved ? moved.slice(0, 160) : null } };
}

/**
 * Load + format inject block for a holder (non-throwing).
 */
async function injectBlockForHolder(holderRow, limit) {
  if (!holderRow || !holderRow.popid) return '';
  try {
    await ensurePositionWall(holderRow.popid);
    const wall = await loadPositionWall(holderRow.popid, limit == null ? 6 : limit);
    return formatPositionWall(wall, {
      name: holderRow.holder,
      holder: holderRow.holder,
      title: holderRow.title,
    });
  } catch (e) {
    return '### YOUR OFFICIAL POSITION WALL\n_Load failed (' + e.message + ') — speak from packet only._';
  }
}

/**
 * Record cascade voice JSON for an agentDir (non-throwing summary).
 */
async function recordCascadeForDir(officeMap, agentDir, voiceJson, cycle) {
  const holder = resolveHolder(officeMap, agentDir);
  if (!holder) return { recorded: false, error: 'no-holder', agentDir };
  const speaker = (voiceJson && (voiceJson.statements && voiceJson.statements[0] && voiceJson.statements[0].speaker))
    || holder.holder;
  const lines = linesFromCascadeStatements((voiceJson && voiceJson.statements) || [], speaker);
  const results = [];
  for (const L of lines) {
    const r = await recordPosition(holder.popid, L.text, {
      cycle,
      key: L.key,
      kind: 'cascade',
      office: agentDir,
      holder: holder.holder,
      extra: L.extra,
    });
    results.push(r);
  }
  // said: the words of the lines that reached the page, for the caller's Reflection_Intake queue (engine.347 Task 5)
  const said = lines.filter((L, i) => results[i] && results[i].recorded === true && L.said).map((L) => L.said);
  return { holder, results, recorded: results.some((r) => r.recorded), said };
}

/**
 * Backfill CIVIC positions from disk artifacts (datawake JSON + civic-voice cascade).
 * Idempotent via customId keys. Safe to re-run.
 */
async function backfillFromDisk(opts) {
  const o = opts || {};
  const map = loadOfficeMap();
  const dry = !!o.dry;
  const datawakeDir = path.join(ROOT, 'output', 'cron-civic', 'datawake');
  const voiceDir = path.join(ROOT, 'output', 'civic-voice');
  const summary = { datawake: 0, cascade: 0, errors: [], dry };

  // Prefer latest date per agentDir for datawakes
  const byDir = {};
  if (fs.existsSync(datawakeDir)) {
    for (const f of fs.readdirSync(datawakeDir)) {
      const m = f.match(/^(.+)_(\d{4}-\d{2}-\d{2})\.json$/);
      if (!m) continue;
      const prev = byDir[m[1]];
      if (!prev || prev.date < m[2]) byDir[m[1]] = { date: m[2], file: f };
    }
  }
  for (const { file } of Object.values(byDir)) {
    try {
      const rec = JSON.parse(fs.readFileSync(path.join(datawakeDir, file), 'utf8'));
      if (!rec.popid || !rec.statement) continue;
      if (dry) {
        summary.datawake++;
        continue;
      }
      const r = await (async () => {
        const line = lineFromDatawake(rec);
        if (!line) return { recorded: false };
        return recordPosition(rec.popid, line.text, {
          cycle: rec.cycle,
          key: line.key,
          kind: 'datawake',
          office: rec.agentDir || rec.office,
          holder: rec.holder,
          extra: line.extra,
        });
      })();
      if (r.recorded) summary.datawake++;
      else if (r.error) summary.errors.push(file + ': ' + r.error);
    } catch (e) {
      summary.errors.push(file + ': ' + e.message);
    }
  }

  // Latest cascade cycle: prefer --cycle or max cN in voice dir
  let cycle = o.cycle;
  if (cycle == null && fs.existsSync(voiceDir)) {
    let max = 0;
    for (const f of fs.readdirSync(voiceDir)) {
      const m = f.match(/_c(\d+)\.json$/);
      if (m) max = Math.max(max, Number(m[1]));
    }
    cycle = max || null;
  }
  if (cycle != null && fs.existsSync(voiceDir)) {
    const slugToDir = {};
    for (const row of [...(map.offices || []), ...(map.projects || [])]) {
      if (!row.agentDir) continue;
      const slug = row.agentDir.replace(/^civic-office-/, '').replace(/^civic-project-/, '').replace(/-/g, '_');
      // voiceSlug in cron: baylight_authority style — rebuild from agentDir
      const vs = row.agentDir.replace(/^civic-(office|project)-/, '').replace(/-/g, '_');
      slugToDir[vs] = row.agentDir;
    }
    // common aliases from writeVoiceJson(slug)
    slugToDir.mayor = 'civic-office-mayor';
    slugToDir.opp_faction = 'civic-office-opp-faction';
    slugToDir.crc_faction = 'civic-office-crc-faction';
    slugToDir.ind_swing = 'civic-office-ind-swing';
    slugToDir.okoro = 'civic-office-okoro';
    slugToDir.police_chief = 'civic-office-police-chief';
    slugToDir.baylight_authority = 'civic-office-baylight-authority';
    slugToDir.stabilization_fund = 'civic-project-stabilization-fund';
    slugToDir.oari = 'civic-project-oari';
    slugToDir.health_center = 'civic-project-health-center';
    slugToDir.transit_hub = 'civic-project-transit-hub';
    slugToDir.district_attorney = 'civic-office-district-attorney';

    for (const f of fs.readdirSync(voiceDir)) {
      const m = f.match(/^(.+)_c(\d+)\.json$/);
      if (!m || Number(m[2]) !== Number(cycle)) continue;
      const slug = m[1];
      const agentDir = slugToDir[slug];
      if (!agentDir) continue;
      try {
        const j = JSON.parse(fs.readFileSync(path.join(voiceDir, f), 'utf8'));
        if (dry) {
          summary.cascade += (j.statements || []).length;
          continue;
        }
        const r = await recordCascadeForDir(map, agentDir, j, cycle);
        if (r.recorded) summary.cascade += (r.results || []).filter((x) => x.recorded).length;
        else if (r.error) summary.errors.push(f + ': ' + r.error);
      } catch (e) {
        summary.errors.push(f + ': ' + e.message);
      }
    }
  }
  summary.cycle = cycle;
  return summary;
}

if (require.main === module) {
  const pop = process.argv.includes('--pop')
    ? process.argv[process.argv.indexOf('--pop') + 1]
    : 'POP-00034';
  Promise.resolve()
    .then(async () => {
      if (process.argv.includes('--resolve')) {
        const dir = process.argv[process.argv.indexOf('--resolve') + 1] || 'civic-office-mayor';
        console.log(JSON.stringify(resolveHolder(null, dir), null, 2));
        return;
      }
      if (process.argv.includes('--backfill')) {
        const dry = process.argv.includes('--dry-run');
        const ci = process.argv.indexOf('--cycle');
        const cycle = ci !== -1 ? process.argv[ci + 1] : null;
        const s = await backfillFromDisk({ dry, cycle: cycle != null ? Number(cycle) : null });
        console.log(JSON.stringify(s, null, 2));
        if (s.errors && s.errors.length) process.exitCode = 1;
        return;
      }
      await ensurePositionWall(pop);
      const wall = await loadPositionWall(pop, 6);
      console.log(formatPositionWall(wall, { name: pop }));
      if (wall.error) process.exitCode = 1;
    })
    .catch((e) => { console.error(e); process.exit(1); });
}

module.exports = {
  BLOC_SPOKESPERSON_DISTRICT,
  resolveHolder,
  ensurePositionWall,
  loadPositionWall,
  formatPositionWall,
  recordPosition,
  linesFromCascadeStatements,
  lineFromDatawake,
  wallLine,
  statementOf,
  injectBlockForHolder,
  recordCascadeForDir,
  loadOfficeMap,
  backfillFromDisk,
};

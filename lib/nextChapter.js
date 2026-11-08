'use strict';
/**
 * lib/nextChapter.js — engine.338 Task 3: a former player's next chapter, the cron half.
 *
 * The builder asks on the sports feed (`question` trigger → a bare `Question` log row and a `[Question] <text>` life
 * line, applyGameNightMoments_); the owed wake carries the question; the citizen answers in his reflection and closes
 * with ONE structured line against a closed vocabulary:
 *
 *     MOVE: role=<one of the pool's exact catalog titles | none> | where=<a business name, or blank>
 *
 * This module is pure: it finds the question on the citizen's own life lines, frames it for the prompt, parses the
 * MOVE line (never a regex over his prose — agy F6), resolves the employer by the role's category, and shapes the
 * Advancement_Intake1 row and the move-ledger line. scripts/citizen-wake.js does the reads and writes.
 *
 * Vocabulary: the six pool titles are catalog entries (data/economic_parameters.json, engine.338 Task 2d). Off the
 * vocabulary → refused loudly, nothing filed. `none` → declined, nothing filed.
 */

// role → { clock, employer rule, tierGate }. employer: 'club' = his club of record (the A's / the Oaks) else the A's;
// 'media' = the business he names, else a Media & Journalism business in his hood, else any, else SELF_EMPLOYED;
// 'named-or-untracked' = the business he names on the ledger, else UNTRACKED (a college is rarely a tracked row);
// 'named-or-self' = the business he names, else SELF_EMPLOYED (his own academy is a ledger row he can name).
// tierGate (plan §The post-sports pool, the builder's draft; codex F1): the lowest Tier a title is offered to — a Tier-1
// name may be offered everything, a Tier-3 the academy. The frame lists only his eligible titles; a MOVE naming an
// ineligible one is refused before anything is filed. The academy is open at every Tier (the plan's "own academy at any
// tier", codex re-review F1): the builder decides who is asked, and a Tier-4 citizen asked about an academy is its owner.
const POOL = {
  'Sports Broadcaster / Color Analyst': { clock: 'MEDIA', employer: 'media', tierGate: 1 },
  'Sports Analyst (Front Office)':      { clock: 'ENGINE', employer: 'club', tierGate: 2 },
  'Club Coach / Instructor':            { clock: 'GAME', employer: 'club', tierGate: 2 },
  'Scout':                              { clock: 'ENGINE', employer: 'club', tierGate: 2 },
  'College Coach':                      { clock: 'ENGINE', employer: 'named-or-untracked', tierGate: 2 },
  'Youth Academy Director':             { clock: 'ENGINE', employer: 'named-or-self', tierGate: 4 },
};
const ROLES = Object.keys(POOL);
// A closed alias list derived from the titles themselves: each half of a slashed title, and the title without its
// parenthetical, names the full title ("Color Analyst" → Sports Broadcaster / Color Analyst; "Sports Analyst" → Sports
// Analyst (Front Office)). The bench's first dry wake answered `role=Color Analyst` and was refused; a voice model shortens
// a long title, and a shortened EXACT half is still the closed vocabulary — never a regex over his prose.
const ROLE_ALIASES = (() => {
  const m = {};
  for (const r of ROLES) {
    m[r.toLowerCase()] = r;
    for (const part of r.split('/')) { const p = part.trim().toLowerCase(); if (p && !m[p]) m[p] = r; }
    const noParen = r.replace(/\s*\([^)]*\)\s*$/, '').trim().toLowerCase();
    if (noParen && !m[noParen]) m[noParen] = r;
  }
  return m;
})();
// The titles a citizen of this Tier may be offered. A blank / unreadable Tier reads as 4 (the ledger's floor): nothing.
function rolesFor(tier) {
  const t = Number(tier);
  const T = Number.isFinite(t) && t >= 1 ? t : 4;
  return ROLES.filter((r) => POOL[r].tierGate >= T);
}
const CLUBS = { 'BIZ-00005': "the A's", 'BIZ-00074': 'the Oaks' }; // the franchise employers of record (applyGameNightMoments_ SPORTS_FRANCHISE_EMPLOYER_)
const DEFAULT_CLUB = 'BIZ-00005';
const MEDIA_SECTOR = /journalism|news|broadcast|media/i;

// The question on the citizen's own life lines — the line the owed entry pins (any of its stamps, `[Question] ` body).
function questionFromLines(lifeLines, owedEntry) {
  if (!owedEntry || !owedEntry.pin) return '';
  const pin = owedEntry.pin;
  const stamps = Array.isArray(pin.stamps) && pin.stamps.length ? pin.stamps : [pin.stamp];
  let found = '';
  for (const line of lifeLines || []) {
    const stamp = stamps.find((s) => line.startsWith(s + ' — '));
    if (stamp == null) continue;
    const body = line.slice(stamp.length + 3);
    const m = body.match(/^\[Question\]\s*(.*)$/);
    if (m) found = m[1].trim(); // newest wins when a Cycle asked twice
  }
  return found;
}

// The user-prompt block: the question as the builder wrote it, then the one closed line the citizen ends with — the
// titles his Tier may be offered (rolesFor), or `none` alone when his Tier is offered nothing.
function questionFrame(question, tier) {
  const offered = rolesFor(tier);
  const choice = offered.length ? `<one of: ${offered.join(' | ')} | none>` : '<none — say so in your own words above>';
  return `Someone asked you this week, and it has stayed with you: "${question}"\n\n` +
    `Think it through on the page the way you actually would — private, honest, first person, 4-5 sentences. ` +
    `Then, on its own last line, answer with exactly this shape and nothing else — copy one title exactly as written here:\n` +
    `MOVE: role=${choice} | where=<the name of the place you'd do it, or leave blank>`;
}

// One MOVE line, the last in the reply decides. → { move: { role, where } | null, reason, text } — text is the reflection
// with EVERY structured MOVE line removed (codex F8: an earlier, changed-mind line is not his prose either; the page and
// Reflection_Intake carry his words, never the structured line). tier, when given, refuses a title his Tier is not offered.
function parseMove(reflection, tier) {
  const lines = String(reflection || '').split('\n');
  let idx = -1;
  for (let i = lines.length - 1; i >= 0; i--) { if (/^\s*MOVE:/i.test(lines[i])) { idx = i; break; } }
  if (idx < 0) return { move: null, reason: 'no-move-line', text: String(reflection || '').trim() };
  const text = lines.filter((l) => !/^\s*MOVE:/i.test(l)).join('\n').trim();
  const body = lines[idx].replace(/^\s*MOVE:\s*/i, '').trim();
  const fields = {};
  for (const part of body.split('|')) {
    const m = part.match(/^\s*(role|where)\s*=\s*(.*?)\s*$/i);
    if (m) fields[m[1].toLowerCase()] = m[2].replace(/^["'<]+|[>"'.]+$/g, '').trim();
  }
  if (fields.role == null) return { move: null, reason: 'move-missing-role', text };
  const roleRaw = fields.role;
  if (/^none$/i.test(roleRaw)) return { move: { role: 'none', where: '' }, reason: null, text };
  const role = ROLE_ALIASES[roleRaw.toLowerCase().replace(/\s+/g, ' ').trim()];
  if (!role) return { move: null, reason: 'off-vocabulary-role(' + roleRaw.slice(0, 60) + ')', text };
  if (tier !== undefined && rolesFor(tier).indexOf(role) < 0) return { move: null, reason: 'tier-gated(' + role + ' at Tier ' + String(tier) + ')', text };
  return { move: { role, where: String(fields.where || '').trim() }, reason: null, text };
}

// bizRows: Business_Ledger as objects ({ BIZ_ID, Name, Sector, Neighborhood }). citizen: { nh, employerBizId }.
// → { employerBizId, named: the ledger row he named | null, rule }
function resolveEmployer(role, where, citizen, bizRows) {
  const rule = POOL[role] ? POOL[role].employer : null;
  if (!rule) return { employerBizId: '', named: null, rule: null };
  const rows = Array.isArray(bizRows) ? bizRows : [];
  const norm = (s) => String(s || '').trim().toLowerCase().replace(/^the\s+/, '');
  const named = where ? rows.find((b) => norm(b.Name) === norm(where)) || null : null;
  if (named && named.BIZ_ID) return { employerBizId: String(named.BIZ_ID).trim(), named, rule };
  if (rule === 'club') {
    const own = String(citizen && citizen.employerBizId || '').trim();
    return { employerBizId: CLUBS[own] ? own : DEFAULT_CLUB, named: null, rule };
  }
  if (rule === 'media') {
    const media = rows.filter((b) => MEDIA_SECTOR.test(String(b.Sector || '')) && String(b.BIZ_ID || '').indexOf('BIZ-') === 0);
    const inHood = media.find((b) => norm(b.Neighborhood) === norm(citizen && citizen.nh));
    const pick = inHood || media[0];
    return { employerBizId: pick ? String(pick.BIZ_ID).trim() : 'SELF_EMPLOYED', named: null, rule };
  }
  if (rule === 'named-or-untracked') return { employerBizId: 'UNTRACKED', named: null, rule };
  return { employerBizId: 'SELF_EMPLOYED', named: null, rule };
}

// The Advancement_Intake1 row, aligned to the tab's own header: First, Last, RoleType (the exact title), ClockMode by
// category, EmployerBizId, Notes = his words. Tier and the flags stay blank (the door never lowers a Tier). The header
// must carry the six cells or the row is refused (a row filed into the wrong column is a wrong life).
const INTAKE_CELLS = ['First', 'Last', 'RoleType', 'ClockMode', 'EmployerBizId', 'Notes'];
function intakeRowFor(header, m) {
  const H = (header || []).map((h) => String(h || '').trim());
  const missing = INTAKE_CELLS.filter((c) => H.indexOf(c) < 0);
  if (missing.length) throw new Error('Advancement_Intake1 header lacks ' + missing.join(', ') + ' — no row filed');
  if (!POOL[m.role]) throw new Error('not a pool title: ' + m.role);
  const row = H.map(() => '');
  row[H.indexOf('First')] = m.first;
  row[H.indexOf('Last')] = m.last;
  row[H.indexOf('RoleType')] = m.role;
  row[H.indexOf('ClockMode')] = POOL[m.role].clock;
  row[H.indexOf('EmployerBizId')] = m.employerBizId;
  row[H.indexOf('Notes')] = m.notes;
  return row;
}

// One queue row per citizen: a row already on Advancement_Intake1 by this First + Last means nothing is filed.
function hasQueuedRow(rows, header, first, last) {
  const H = (header || []).map((h) => String(h || '').trim());
  const iF = H.indexOf('First'), iL = H.indexOf('Last');
  if (iF < 0 || iL < 0) return false;
  const key = (a, b) => (String(a || '').trim() + ' ' + String(b || '').trim()).toLowerCase();
  const want = key(first, last);
  return (rows || []).some((r) => key(r[iF], r[iL]) === want);
}

// His words for the Notes cell: the reflection, one line, cut at a sentence end inside the cap.
function notesFrom(text, cap) {
  const one = String(text || '').replace(/\s+/g, ' ').trim();
  const max = cap || 300;
  if (one.length <= max) return one;
  const cut = one.slice(0, max);
  const end = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('! '), cut.lastIndexOf('? '));
  return (end > max / 2 ? cut.slice(0, end + 1) : cut.replace(/\s+\S*$/, '') + '…');
}

// The ledger folded, last line wins per citizen: has this citizen already answered a question in this Cycle's ledger
// (queued or declined)? Codex re-review R1: a row that landed before a failed page must not be asked again — the next wake
// is an ordinary wake (the owed pin still shows the line and spends), never a second answer beside the first row.
// lines: parsed ledger lines (objects). → { answered: bool, last: line | null }
function answeredFor(lines, pop) {
  let last = null;
  for (const l of lines || []) if (l && String(l.pop || '').toUpperCase() === String(pop || '').toUpperCase()) last = l;
  return { answered: !!last && (last.status === 'queued' || last.status === 'declined'), last };
}

// Append-only move ledger line (the civic ledger's contract: one id, status lines, a reader folds last-line-wins).
// status: queued (row filed) | declined (none) | refused (off vocabulary / no line) | held (a dedup or read failure).
function moveLedgerLine(o) {
  return {
    moveId: 'NC-' + o.cycle + '-' + o.pop + '-' + o.date,
    cycle: Number(o.cycle), date: o.date, pop: o.pop, name: o.name || '',
    question: o.question || '', role: o.role || null, where: o.where || '', employerBizId: o.employerBizId || '',
    status: o.status, reason: o.reason || null, at: new Date().toISOString(),
  };
}

module.exports = { POOL, ROLES, ROLE_ALIASES, CLUBS, DEFAULT_CLUB, MEDIA_SECTOR, INTAKE_CELLS, rolesFor,
  questionFromLines, questionFrame, parseMove, resolveEmployer, intakeRowFor, hasQueuedRow, notesFrom, moveLedgerLine, answeredFor };

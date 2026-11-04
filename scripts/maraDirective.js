'use strict';

// civic.47 M1 — one parser for Mara's directive text, shared by the directive
// stage (validation), Sunday prep (per-seat section), the weekday reader
// (confrontations) and the initiative-packet copy. A directive is a header,
// zero or more addressee blocks ("## Name — Role" with an **Agent:** line) and
// an optional "## Not directing" section that names offices in plain text.

const NOT_DIRECTING_RE = /^## Not directing\b/i;
const AGENT_LINE_RE = /\*\*Agent:\*\*[^\n]*\.claude\/agents\/([a-z0-9-]+)\/?/i;
const OFFICE_ID_RE = /\b(?:civic-office|civic-project)-[a-z0-9-]+/i;

function stripFence(text) {
  return String(text || '').replace(/^```(?:markdown)?\s*/i, '').replace(/\s*```\s*$/, '');
}

// Sections are the "## " chunks; the header is whatever precedes the first.
function sections(text) {
  const parts = stripFence(text).split(/\n(?=## )/);
  const header = /^## /.test(parts[0] || '') ? '' : parts.shift();
  return { header, parts: parts.filter(p => /^## /.test(p)) };
}

function agentDirOf(block) {
  const m = String(block).match(AGENT_LINE_RE);
  return m ? m[1] : null;
}

// { header, blocks, notDirecting } — blocks keep every non-Not-directing
// section (the stage validates them); notDirecting is the section text or null.
function splitDirective(text) {
  const { header, parts } = sections(text);
  const nd = parts.filter(p => NOT_DIRECTING_RE.test(p));
  return {
    header,
    blocks: parts.filter(p => !NOT_DIRECTING_RE.test(p)),
    notDirecting: nd.length ? nd.join('\n').trim() : null,
  };
}

// A Not directing section must name offices by person and title only; an
// agent id or an Agent line would let a reader mistake it for a block.
function notDirectingProblem(section) {
  if (!section) return null;
  if (AGENT_LINE_RE.test(section) || /\*\*Agent:\*\*/.test(section)) return 'Not directing section carries an Agent line';
  if (OFFICE_ID_RE.test(section)) return 'Not directing section carries an office id';
  if (!section.split('\n').slice(1).some(l => l.trim())) return 'Not directing section is empty';
  return null;
}

// Every addressee block whose Agent line names this seat exactly.
function blocksFor(text, agentDir) {
  return splitDirective(text).blocks.filter(b => agentDirOf(b) === agentDir);
}

// The directive without its Not directing section; null when no block is left.
function withoutNotDirecting(text) {
  const { header, blocks } = splitDirective(text);
  if (!blocks.length) return null;
  return (header ? header.replace(/\s*$/, '\n') : '') + blocks.map(b => b.replace(/\s*$/, '')).join('\n\n') + '\n';
}

function confrontationId(cycle, agentDir) {
  return 'CONF-' + Number(cycle) + '-' + agentDir;
}

// "**Promise:** P-…" lines in a block: the promise ids Mara put in front of
// the office in that block (status relation (b), plan M1 item 4).
function promiseIdsIn(block) {
  const out = [];
  const re = /\*\*Promise:\*\*\s*([^\n]+)/g;
  let m;
  while ((m = re.exec(String(block)))) {
    for (const id of m[1].match(/P-[0-9a-f]{12,}/g) || []) out.push(id);
  }
  return [...new Set(out)];
}

module.exports = { splitDirective, notDirectingProblem, blocksFor, withoutNotDirecting, agentDirOf, confrontationId, promiseIdsIn, NOT_DIRECTING_RE };

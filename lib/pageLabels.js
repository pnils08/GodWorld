/* pageLabels — the code-written labels that used to sit in front of a citizen's page entry (pipeline.112).
 *
 * Builder 2026-11-16: "check the citizens memory save stores, make sure no code it sending build logic as an
 * event" / "yes strip the labels". A page entry holds what the citizen said or what happened to them; what the
 * label said rides the doc's key and metadata:
 *
 *   was on the page                              the page holds          key / metadata
 *   TENSION[c<N>]: <question>                    <question>              …-tension, type tension, kind open
 *   TENSION-RESOLVED[c<N>]: <question>           <question>              …-tension-resolved, type tension, kind resolved
 *   TALK[c<N>]: <line>                           <line>                  …-talk-<stamp>, type talk
 *   stated: [<topic>] <speaker> — <words>        <words>                 …-CIVIC-cascade-<id>, kind cascade, topic, speaker
 *   datawake: <words> | action: … | signal: …    <words>                 …-CIVIC-datawake-<date>, kind datawake, action, signal
 *   filed: <headline>                            <headline>              kind filed
 *   graded: <n>/<max> — <what fell short>        <n>/<max> — <…>         …-PRESS-graded[-persona], kind graded
 *
 * Two jobs, one source:
 *   - readers show an entry the way it always read (wallLine, recordLine) from its words and its metadata;
 *   - the stored-entry rewrite split each old entry into its words and its metadata (splitLabelled, cleanContent).
 * The store holds no labelled entry since the rewrite (scan 2026-11-19: 0 of 4,276), so a reader no longer reads the
 * old shape; the rewrite tool's --restore puts labelled entries back that these readers would label a second time.
 * Pure — no I/O.
 */
'use strict';

const RECORD_KINDS = ['filed', 'graded'];
const APPEND_SEP = '\n\n---\n\n';   // the store's own join when a write lands on a key already taken (lib/citizenPage.js)
const str = (v) => String(v == null ? '' : v).trim();

// An office position as a holder is shown it.
// An entry holding several writes (the store joins them with APPEND_SEP) is shown write by write, each as it read.
function wallLine(content, metadata) {
  const m = metadata || {};
  const one = (part) => {
    const text = String(part == null ? '' : part).replace(/\s+/g, ' ').trim();
    if (!text || m.type !== 'office-position') return text;
    if (m.kind === 'datawake') {
      return 'datawake: ' + text + (str(m.action) ? ' | action: ' + str(m.action) : '') + (str(m.signal) ? ' | signal: ' + str(m.signal) : '');
    }
    return 'stated: ' + (str(m.topic) ? '[' + str(m.topic) + '] ' : '') + (str(m.speaker) ? str(m.speaker) + ' — ' : '') + text;
  };
  return String(content == null ? '' : content).split(APPEND_SEP).map(one).filter(Boolean).join(' --- ');
}

// A reporter's self-record as the reporter is shown it ("filed: <headline>", "graded: 3/3 — …").
function recordLine(content, metadata) {
  const text = String(content == null ? '' : content);
  const kind = metadata && metadata.kind;
  if (!RECORD_KINDS.includes(kind)) return text;
  // write by write: each part shown with its kind in front
  return text.split(APPEND_SEP).map((part) => kind + ': ' + part).join(APPEND_SEP);
}

// One stored line -> { label, text, meta } when it opens with a label, null when it is already plain.
// `known` = the doc's own metadata (holder, kind): a speaker is taken out of a stated: line only when the
// name in front of the dash is the doc's holder or reads as a name, so a dash inside the words is left alone.
const NAME_RE = /^[A-Z][A-Za-z.'’-]*(?: (?:[A-Z(][A-Za-z.'’()-]*|de|del|la|van|von|of|the)){0,6}$/;
function splitLabelled(line, known) {
  const s = String(line == null ? '' : line);
  const lead = s.match(/^\s*/)[0];
  const t = s.slice(lead.length);
  let m;
  if ((m = t.match(/^TENSION-RESOLVED\[c\d+\]:\s*([\s\S]*)$/))) return { label: 'TENSION-RESOLVED', text: m[1], meta: { kind: 'resolved' } };
  if ((m = t.match(/^TENSION\[c\d+\]:\s*([\s\S]*)$/))) return { label: 'TENSION', text: m[1], meta: { kind: 'open' } };
  if ((m = t.match(/^TALK\[c\d+\]:\s*([\s\S]*)$/))) return { label: 'TALK', text: m[1], meta: {} };
  if ((m = t.match(/^filed: ([\s\S]*)$/))) return { label: 'filed', text: m[1], meta: { kind: 'filed' } };
  if ((m = t.match(/^graded: ([\s\S]*)$/))) return { label: 'graded', text: m[1], meta: { kind: 'graded' } };
  if ((m = t.match(/^datawake:\s*([\s\S]*)$/i))) {
    let body = m[1];
    const meta = {};
    const sig = body.match(/^([\s\S]*?) \| signal: ([\s\S]*)$/);
    if (sig) { body = sig[1]; meta.signal = sig[2].trim(); }
    const act = body.match(/^([\s\S]*?) \| action: ([\s\S]*)$/);
    if (act) { body = act[1]; meta.action = act[2].trim(); }
    return { label: 'datawake', text: body, meta };
  }
  if ((m = t.match(/^stated:\s*([\s\S]*)$/i))) {
    let body = m[1];
    const meta = {};
    const top = body.match(/^\[([^\]]*)\] ?([\s\S]*)$/);
    if (top) { if (top[1].trim()) meta.topic = top[1].trim(); body = top[2]; }
    const sp = body.match(/^([^—]{1,80}?) — ?([\s\S]*)$/);
    if (sp) {
      const who = sp[1].trim();
      const holder = str(known && known.holder);
      if ((holder && who === holder) || NAME_RE.test(who)) { meta.speaker = who; body = sp[2]; }
    }
    // a statement that was only a topic ("stated: [topic] Name — ") holds its topic
    if (!body.trim() && meta.topic) { body = meta.topic; delete meta.topic; }
    return { label: 'stated', text: body, meta };
  }
  return null;
}

// A whole stored doc (several writes joined by the store's separator) -> its plain content and the metadata to add.
// labels: what was taken off, in order. changed false = nothing to rewrite (a rerun changes nothing).
function cleanContent(content, known) {
  const parts = String(content == null ? '' : content).split(APPEND_SEP);
  const labels = [];
  let meta = {};
  const out = parts.map((part) => {
    const hit = splitLabelled(part, known);
    if (!hit) return part;
    labels.push(hit.label);
    meta = Object.assign({}, meta, hit.meta);   // the newest part's values stand, as the store's own merge does
    return hit.text.trim();
  });
  return { changed: labels.length > 0, content: out.join(APPEND_SEP), meta, labels };
}

module.exports = { RECORD_KINDS, APPEND_SEP, wallLine, recordLine, splitLabelled, cleanContent };

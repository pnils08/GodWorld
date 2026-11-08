'use strict';
/**
 * lib/feedPrivacy.js — engine.338 (builder 2026-11-08: "private until he answers").
 *
 * A `question` row on Oakland_Sports_Feed is the builder's word to ONE citizen: the Notes cell is the question, NamesUsed
 * the person asked. The engine routes it to that citizen's life page and nowhere else (applyGameNightMoments_;
 * feedMoments_ keeps it from the hook table). The Node side has a dozen readers of the feed's Notes — the beats dump,
 * the world summary, the wake's shared sports slice, the desk slices — and every one of them is a public surface. This
 * is the one predicate they share: a private row never renders, never reaches a desk, never reaches another citizen.
 * The row itself stays on the sheet (it is the engine's input and the builder's record).
 *
 * Codex diff review 2026-11-08 F2.
 */
const PRIVATE_TRIGGERS = { question: true };

function triggerWord(v) { return String(v == null ? '' : v).trim().toLowerCase().replace(/\s+/g, '-'); }

// row: an object with an EventTrigger key (beats / getSheetAsObjects shape), or a raw array + header index.
function isPrivateFeedRow(row, iTrigger) {
  if (row == null) return false;
  const v = Array.isArray(row) ? (iTrigger >= 0 ? row[iTrigger] : '') : (row.EventTrigger != null ? row.EventTrigger : row.eventTrigger);
  return PRIVATE_TRIGGERS[triggerWord(v)] === true;
}
function publicFeedRows(rows) { return (rows || []).filter((r) => !isPrivateFeedRow(r)); }

module.exports = { PRIVATE_TRIGGERS, isPrivateFeedRow, publicFeedRows, triggerWord };

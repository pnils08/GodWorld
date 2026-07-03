/**
 * ============================================================================
 * loadEventContentLedger_ v1 (engine.38 Design A — seams Task 10)
 * ============================================================================
 *
 * Reads Event_Content_Ledger (operator-authored content tab) into
 * S.contentLedger so the phase05 generator can draw sheet-resident pool
 * lines and slot fragments instead of only hardcoded pools. Additive
 * rollout: missing tab or empty tab => S.contentLedger stays empty and
 * every generator falls back to its hardcoded pools (byte-identical cycles).
 *
 * S.contentLedger = {
 *   lines:     { poolKey: [entry] },   // Kind=line  — complete pool lines, may carry $SLOT tokens
 *   fragments: { slot:    [entry] },   // Kind=fragment — fills one $SLOT
 *   skipped:   N                       // rows rejected fail-closed (see rules below)
 * }
 * entry = { text, tags, weight, conditions, grain }
 *   conditions = compiled predicate terms (parsed ONCE here, evaluated
 *   per-citizen in phase05 — never re-parse strings across 900+ rows).
 *
 * Fail-closed row rules (S289 critique — a typo must NARROW, never widen):
 *   - Kind not line|fragment                          => skip + count
 *   - line without PoolKey / fragment without Slot    => skip + count
 *   - empty Text                                      => skip + count
 *   - line whose FIRST tag is not a recognized source => skip + count
 *     (primaryFromTags falls through to 'Daily' on unknown sources; a new
 *     source needs its primaryFromTags branch in the SAME commit that seeds
 *     the pool — keep SOURCE_WHITELIST below in sync with that switch)
 *   - Conditions term with unknown field/op/enum      => skip + count
 *   - Active = 'no'                                   => skip silently (kill
 *     switch, not an authoring error — NOT counted in skipped)
 *
 * Read-only — no sheet writes, no intents. ES5-safe.
 * Plan: docs/plans/2026-07-01-persistence-seams-content-ledger.md Design A + §Pool injection.
 * ============================================================================
 */

// Mirror of the source: branches in generateCitizensEvents.js primaryFromTags().
// A ledger line routes dials through its source tag; unknown source would
// silently route 'Daily', so unknown => row rejected at load (S289 rule 2).
var CONTENT_LEDGER_SOURCE_WHITELIST = {
  'source:qol': 1, 'source:media': 1, 'source:weather': 1, 'source:fame': 1,
  'source:prevEvening': 1, 'source:nbhdState': 1, 'source:faith': 1,
  'source:neighborhood': 1, 'source:firstFriday': 1, 'source:creationDay': 1,
  'source:holiday': 1, 'source:sports': 1, 'source:occupation': 1,
  'source:continuity': 1, 'source:homeLife': 1, 'source:reflection': 1,
  'source:identity': 1, 'source:listening': 1, 'source:groove': 1,
  'source:civicNews': 1, 'source:bias': 1, 'source:retirement': 1,
  'source:curiosity': 1, 'source:communityLife': 1
};

// Conditions micro-DSL (S289 resolver table — vocab locked to code enums).
// field -> { kind: 'num'|'flag'|'enum', values: {..} for enums }
var CONTENT_LEDGER_DSL_FIELDS = {
  wealth:       { kind: 'num' },     // citizen row WealthLevel
  children:     { kind: 'num' },     // citizen row children count
  displacement: { kind: 'num' },     // S.neighborhoodState[hood].displacementPressure
  married:      { kind: 'flag' },    // citizen row marital == 'married'
  retired:      { kind: 'flag' },    // citizen row status == 'retired'
  ageband:      { kind: 'enum', values: { youth: 1, youngAdult: 1, adult: 1, senior: 1 } },
  hood:         { kind: 'str' },     // citizen row neighborhood (exact match)
  season:       { kind: 'str' }      // cycle ctx season
};

/**
 * Parse one Conditions cell into compiled terms, or null if any term is
 * invalid (fail-closed: the caller skips the whole row).
 * Grammar: ';'-joined AND terms. Term = flag name, or field op value
 * with op in <= >= < > = !=.
 */
function parseContentConditions_(raw) {
  var s = (raw == null ? '' : String(raw)).trim();
  if (!s) return [];
  var parts = s.split(';');
  var terms = [];
  for (var i = 0; i < parts.length; i++) {
    var t = parts[i].trim();
    if (!t) continue;
    var m = t.match(/^([A-Za-z]+)\s*(<=|>=|!=|<|>|=)\s*(.+)$/);
    if (!m) {
      // bare flag form
      var spec0 = CONTENT_LEDGER_DSL_FIELDS[t];
      if (!spec0 || spec0.kind !== 'flag') return null;
      terms.push({ f: t, op: 'flag' });
      continue;
    }
    var field = m[1];
    var op = m[2];
    var valRaw = m[3].trim();
    var spec = CONTENT_LEDGER_DSL_FIELDS[field];
    if (!spec) return null;
    if (spec.kind === 'flag') return null;               // flags take no operator
    if (spec.kind === 'num') {
      var n = Number(valRaw);
      if (isNaN(n)) return null;
      terms.push({ f: field, op: op, v: n });
      continue;
    }
    // enum / str take only equality ops
    if (op !== '=' && op !== '!=') return null;
    if (spec.kind === 'enum' && !spec.values[valRaw]) return null;
    terms.push({ f: field, op: op, v: valRaw });
  }
  return terms;
}

function loadEventContentLedger_(ctx) {
  var S = ctx.summary || (ctx.summary = {});
  S.contentLedger = { lines: {}, fragments: {}, skipped: 0 };

  var sheet = ctx.ss.getSheetByName('Event_Content_Ledger');
  if (!sheet) return;

  var values = sheet.getDataRange().getValues();
  if (values.length < 2) return;

  var header = values[0];
  function idx(n) { return header.indexOf(n); }

  var iKind = idx('Kind');
  var iPool = idx('PoolKey');
  var iSlot = idx('Slot');
  var iText = idx('Text');
  var iWeight = idx('Weight');
  var iCond = idx('Conditions');
  var iTags = idx('Tags');
  var iGrain = idx('Grain');
  var iActive = idx('Active');

  if (iKind < 0 || iText < 0) return;

  function cell(row, i) { return i >= 0 ? String(row[i] == null ? '' : row[i]).trim() : ''; }

  var rows = values.slice(1);
  var loadedLines = 0, loadedFragments = 0;

  for (var r = 0; r < rows.length; r++) {
    var row = rows[r];
    var kind = cell(row, iKind).toLowerCase();
    var text = cell(row, iText);
    if (!kind && !text) continue;                        // blank spacer row — ignore silently

    if (cell(row, iActive).toLowerCase() === 'no') continue;  // kill switch, not an error

    if (kind !== 'line' && kind !== 'fragment') { S.contentLedger.skipped++; continue; }
    if (!text) { S.contentLedger.skipped++; continue; }

    var conditions = parseContentConditions_(cell(row, iCond));
    if (conditions === null) { S.contentLedger.skipped++; continue; }

    var tags = [];
    var tagsRaw = cell(row, iTags);
    if (tagsRaw) {
      var tp = tagsRaw.split(',');
      for (var ti = 0; ti < tp.length; ti++) {
        var tag = tp[ti].trim();
        if (tag) tags.push(tag);
      }
    }

    var wRaw = cell(row, iWeight);
    var weight = wRaw === '' ? 1 : Number(wRaw);
    if (isNaN(weight)) weight = 1;

    var entry = {
      text: text,
      tags: tags,
      weight: weight,
      conditions: conditions,
      grain: cell(row, iGrain).toLowerCase()
    };

    if (kind === 'line') {
      var poolKey = cell(row, iPool);
      if (!poolKey) { S.contentLedger.skipped++; continue; }
      // S289 rule 2: first tag must be a recognized source: tag or the line
      // would silently route 'Daily' via primaryFromTags fall-through.
      if (!tags.length || !CONTENT_LEDGER_SOURCE_WHITELIST[tags[0]]) { S.contentLedger.skipped++; continue; }
      if (!S.contentLedger.lines[poolKey]) S.contentLedger.lines[poolKey] = [];
      S.contentLedger.lines[poolKey].push(entry);
      loadedLines++;
    } else {
      var slot = cell(row, iSlot);
      if (!slot) { S.contentLedger.skipped++; continue; }
      if (!S.contentLedger.fragments[slot]) S.contentLedger.fragments[slot] = [];
      S.contentLedger.fragments[slot].push(entry);
      loadedFragments++;
    }
  }

  S.contentLedger.lineCount = loadedLines;
  S.contentLedger.fragmentCount = loadedFragments;
}

/**
 * ============================================================================
 * Article INTAKE Parser v1.0 — pipeline.45 Phase 1 Task 2
 * ============================================================================
 *
 * Deterministic parser for the `## INTAKE` block that ends every wake-3
 * article (spec: docs/plans/2026-08-04-newsroom-canon-flow.md §Phase 1).
 * One home, three consumers: the Rhea gate pre-check, the Saturday run
 * (sheets + Supermemory sweep), and the EIC accuracy audit. Downstream
 * consumers read the parsed object from the `.staged.json` sidecar
 * (`intake:` key, written by the gate on pass) — never re-parse prose.
 *
 * Line grammar (strict; enums are closed sets):
 *   ## INTAKE
 *   NAMES: Lucia Polito | POP-00654 | quoted-source
 *   BIZ: Rico's Auto | BIZ-0112 | mentioned
 *   STORYLINE: fruitvale-transit-hub | advanced
 *   HOOD: Fruitvale
 *   CLAIM: Transit Hub Phase II is a $230M visioning process | world_summary_c102 §initiatives
 *
 * Parse-layer contract: grammar + format validity only. Ledger RESOLUTION
 * (does POP-00654 exist, does the quoted-source trace to §3 INTERVIEWS) is
 * the gate's job via canon-name-check machinery — this module never touches
 * a sheet or the filesystem.
 *
 * BIZ id field: `BIZ-####`/`BIZ-#####`, or `-` for a named org with no BIZ
 * row ("IDs where they exist" — plan §Phase 1). `-` parses to bizId: null;
 * whether a null id clears is the gate's call.
 *
 * Usage:
 *   const intake = require('./lib/articleIntake');
 *   const result = intake.parse(articleText);
 *   // result = { found, names[], businesses[], storylines[], hoods[],
 *   //            claims[], errors[] }
 *   // Clean parse ⇔ result.found === true && result.errors.length === 0
 *
 * Run tests: node lib/articleIntake.test.js
 * ============================================================================
 */

'use strict';

// Closed enums — exported so consumers bind to these, not string literals.
var NAME_ROLES = ['quoted-source', 'subject', 'mentioned'];
var STORYLINE_VERBS = ['advanced', 'opened', 'closed', 'referenced'];

var POPID_RE = /^POP-\d{5}$/;
var BIZID_RE = /^BIZ-\d{4,5}$/;
var HEADING_RE = /^##\s+/;
var INTAKE_HEADING_RE = /^##\s+INTAKE\s*$/i;

/**
 * Locate the INTAKE block: lines after the `## INTAKE` heading up to the
 * next `## ` heading, an HTML comment line (self-score footer), or EOF.
 * Returns { startIndex, lines: [{ text, lineNumber }] } or null.
 */
function findIntakeBlock(allLines) {
  var start = -1;
  for (var i = 0; i < allLines.length; i++) {
    if (INTAKE_HEADING_RE.test(allLines[i])) { start = i; break; }
  }
  if (start === -1) return null;

  var lines = [];
  for (var j = start + 1; j < allLines.length; j++) {
    var text = allLines[j];
    if (HEADING_RE.test(text)) break;
    if (/^\s*<!--/.test(text)) break; // self-score footer sits beside INTAKE
    lines.push({ text: text, lineNumber: j + 1 });
  }
  return { startIndex: start, lines: lines };
}

function splitFields(rest) {
  return rest.split('|').map(function (s) { return s.trim(); });
}

/**
 * Parse article text for its INTAKE block.
 * @param {string} text - Full article markdown.
 * @returns {{found: boolean, names: Array, businesses: Array,
 *            storylines: Array, hoods: Array, claims: Array, errors: Array}}
 */
function parse(text) {
  var result = {
    found: false,
    names: [],
    businesses: [],
    storylines: [],
    hoods: [],
    claims: [],
    errors: []
  };

  function err(code, message, lineNumber) {
    result.errors.push({ code: code, message: message, lineNumber: lineNumber || null });
  }

  if (typeof text !== 'string' || !text.trim()) {
    err('missing-intake', 'empty input — no INTAKE block');
    return result;
  }

  var allLines = text.split(/\r?\n/);
  var block = findIntakeBlock(allLines);
  if (!block) {
    err('missing-intake', 'no `## INTAKE` heading found');
    return result;
  }
  result.found = true;

  // A second INTAKE heading after the first is a malformed draft.
  for (var d = block.startIndex + 1; d < allLines.length; d++) {
    if (INTAKE_HEADING_RE.test(allLines[d])) {
      err('duplicate-intake', 'more than one `## INTAKE` heading', d + 1);
      break;
    }
  }

  block.lines.forEach(function (entry) {
    var raw = entry.text;
    var n = entry.lineNumber;
    if (!raw.trim()) return; // blank lines fine

    var m = raw.match(/^(NAMES|BIZ|STORYLINE|HOOD|CLAIM):\s*(.*)$/);
    if (!m) {
      err('unknown-line', 'unrecognized INTAKE line: ' + JSON.stringify(raw.trim()), n);
      return;
    }
    var kind = m[1];
    var rest = m[2];
    var fields = splitFields(rest);

    if (kind === 'NAMES') {
      if (fields.length !== 3) {
        err('bad-field-count', 'NAMES needs `Name | POPID | role`, got ' + fields.length + ' field(s)', n);
        return;
      }
      var name = fields[0], popid = fields[1], role = fields[2];
      if (!name) { err('empty-field', 'NAMES with empty name', n); return; }
      if (!POPID_RE.test(popid)) {
        err('bad-popid', 'NAMES POPID malformed: ' + JSON.stringify(popid), n);
        return;
      }
      if (NAME_ROLES.indexOf(role) === -1) {
        err('bad-role', 'NAMES role must be one of ' + NAME_ROLES.join('/') + ', got ' + JSON.stringify(role), n);
        return;
      }
      result.names.push({ name: name, popid: popid, role: role, lineNumber: n });

    } else if (kind === 'BIZ') {
      if (fields.length !== 3) {
        err('bad-field-count', 'BIZ needs `Name | BIZ-ID | role`, got ' + fields.length + ' field(s)', n);
        return;
      }
      var bizName = fields[0], bizIdRaw = fields[1], bizRole = fields[2];
      if (!bizName) { err('empty-field', 'BIZ with empty name', n); return; }
      var bizId = null;
      if (bizIdRaw === '-') {
        bizId = null; // named org with no BIZ row — gate decides clearance
      } else if (BIZID_RE.test(bizIdRaw)) {
        bizId = bizIdRaw;
      } else {
        err('bad-bizid', 'BIZ id must be BIZ-#### / BIZ-##### or `-`, got ' + JSON.stringify(bizIdRaw), n);
        return;
      }
      if (NAME_ROLES.indexOf(bizRole) === -1) {
        err('bad-role', 'BIZ role must be one of ' + NAME_ROLES.join('/') + ', got ' + JSON.stringify(bizRole), n);
        return;
      }
      result.businesses.push({ name: bizName, bizId: bizId, role: bizRole, lineNumber: n });

    } else if (kind === 'STORYLINE') {
      if (fields.length !== 2) {
        err('bad-field-count', 'STORYLINE needs `slug | verb`, got ' + fields.length + ' field(s)', n);
        return;
      }
      var slug = fields[0], verb = fields[1];
      if (!slug) { err('empty-field', 'STORYLINE with empty slug', n); return; }
      if (STORYLINE_VERBS.indexOf(verb) === -1) {
        err('bad-verb', 'STORYLINE verb must be one of ' + STORYLINE_VERBS.join('/') + ', got ' + JSON.stringify(verb), n);
        return;
      }
      result.storylines.push({ slug: slug, verb: verb, lineNumber: n });

    } else if (kind === 'HOOD') {
      if (fields.length !== 1) {
        err('bad-field-count', 'HOOD takes a single neighborhood name, got pipes', n);
        return;
      }
      if (!fields[0]) { err('empty-field', 'HOOD with empty name', n); return; }
      result.hoods.push({ name: fields[0], lineNumber: n });

    } else if (kind === 'CLAIM') {
      // Source ref is the LAST pipe segment; claim text may itself contain
      // pipes, so everything before the final pipe is the claim.
      if (fields.length < 2) {
        err('bad-field-count', 'CLAIM needs `claim text | source ref`', n);
        return;
      }
      var sourceRef = fields[fields.length - 1];
      var claim = fields.slice(0, fields.length - 1).join(' | ');
      if (!claim) { err('empty-field', 'CLAIM with empty claim text', n); return; }
      if (!sourceRef) { err('empty-field', 'CLAIM with empty source ref', n); return; }
      result.claims.push({ claim: claim, sourceRef: sourceRef, lineNumber: n });
    }
  });

  return result;
}

module.exports = {
  parse: parse,
  NAME_ROLES: NAME_ROLES,
  STORYLINE_VERBS: STORYLINE_VERBS
};

#!/usr/bin/env node
'use strict';
// BENCH-ONLY diag219 overlay (S461): emits the 22 hood economic moods into the fire JSON.
// Applied to a staged tree AFTER output/codex/engine217-diag-overlay.patch. Never ships to PROD.
// usage: node output/engine-sheet/engine219-diag-overlay.js <stageDir>
const fs = require('fs'); const path = require('path');
const dir = process.argv[2]; if (!dir) { console.error('usage: engine219-diag-overlay.js <stageDir>'); process.exit(2); }
function sub(rel, old, neu) { const p = path.join(dir, rel); let s = fs.readFileSync(p, 'utf8'); if (s.split(old).length !== 2) throw new Error('anchor not unique in ' + rel + ': ' + old.slice(0, 60)); fs.writeFileSync(p, s.replace(old, neu)); }
const moods = "(function(ne){var o={};for(var h in ne){if(ne.hasOwnProperty(h)&&ne[h])o[h]=ne[h].mood;}return o;})";
sub('phase06-analysis/economicRippleEngine.js', "var ENGINE217_DIAG = null;", "var ENGINE219_DIAG = { phase2Hoods: null, afterEconomy: null, afterMigration: null }; // S461 bench-only diag219\nvar ENGINE217_DIAG = null;");
sub('phase06-analysis/economicRippleEngine.js', "  S.neighborhoodEconomies = nhEconomies;\n}", "  S.neighborhoodEconomies = nhEconomies;\n  if (typeof ENGINE219_DIAG !== 'undefined' && ENGINE219_DIAG) ENGINE219_DIAG.afterEconomy = " + moods + "(nhEconomies);\n}");
sub('phase06-analysis/applyMigrationDrift.js', "    S.neighborhoodEconomyFeedback = neighborhoodEconomyFeedback;", "    S.neighborhoodEconomyFeedback = neighborhoodEconomyFeedback;\n    if (typeof ENGINE219_DIAG !== 'undefined' && ENGINE219_DIAG) ENGINE219_DIAG.afterMigration = " + moods + "(S.neighborhoodEconomies);");
sub('phase02-world-state/applyCityDynamics.js', "  var neighborhoodEconomies = S.neighborhoodEconomies || {};\n", "  var neighborhoodEconomies = S.neighborhoodEconomies || {};\n  if (typeof ENGINE219_DIAG !== 'undefined' && ENGINE219_DIAG) ENGINE219_DIAG.phase2Hoods = " + moods + "(neighborhoodEconomies);\n");
sub('utilities/webTrigger.js', "          if (typeof ENGINE217_DIAG !== 'undefined' && ENGINE217_DIAG) out.diag217 = ENGINE217_DIAG; // S459 diag-emit", "          if (typeof ENGINE217_DIAG !== 'undefined' && ENGINE217_DIAG) out.diag217 = ENGINE217_DIAG; // S459 diag-emit\n          if (typeof ENGINE219_DIAG !== 'undefined' && ENGINE219_DIAG) out.diag219 = ENGINE219_DIAG; // S461 bench-only diag-emit");
console.log('diag219 overlay applied to ' + dir);

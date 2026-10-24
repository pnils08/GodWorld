#!/usr/bin/env node
/**
 * claude-mem redact gate — patches the installed claude-mem worker so slurs and
 * self-harm / distress sentences are dropped before anything is stored.
 * Two seams: Yo() (every prompt, tool input/response and assistant message is
 * stripped through it before save) and storeObservations/storeSummary (the
 * observer's own write-ups). Idempotent; re-run after a plugin update (the
 * session-start hook does). Exit 1 if an anchor moved upstream.
 * Usage: node scripts/claude-mem-patch/redact-gate.js [--check]
 */
const fs = require('fs');
const path = require('path');
const os = require('os');

const MARK = '/*GW_REDACT_GATE v1*/';
const GATE = MARK + `var GWR_SL=/\\b(?:nigg(?:er|a|uh)s?|fagg?(?:ot)?s?|retard(?:ed|s)?|trann(?:y|ies)|spics?|chinks?|kikes?|wetbacks?|gooks?|honk(?:e)?ys?|cunts?)\\b/i,GWR_HA=/\\bkill(?:ing)? my ?self\\b|\\bkms\\b|\\bsuicid(?:e|al)\\b|\\bend(?:ing)? (?:my|his|their|your) (?:own )?life\\b|\\bend it all\\b|\\bwant(?:s|ed)? to die\\b|\\bself[- ]harm|\\bhurt(?:ing)? my ?self\\b|\\bideation\\b/i,GWR_DI=/\\bbipolar\\b|\\bmanic\\b|\\b988\\b|\\blifeline\\b|\\bhotlines?\\b|\\bmental health\\b|\\bdistress(?:ed)?\\b|\\bcrisis (?:intervention|pattern|resources|mode)\\b|\\bin crisis\\b/i,GWR_PE=/\\b(?:user|mike|builder|he|his|him|i'?m|my|me)\\b/i;function GWR_bad(p){return GWR_SL.test(p)||GWR_HA.test(p)||(GWR_DI.test(p)&&GWR_PE.test(p))}function GWR_txt(s){if(!s||!(GWR_SL.test(s)||GWR_HA.test(s)||GWR_DI.test(s)))return s;var ps=s.split(/(?<=[.!?])\\s+|\\n+/).filter(Boolean),k=ps.filter(function(p){return!GWR_bad(p)});if(k.length===ps.length)return s;return k.join(s.indexOf("\\n")>=0?"\\n":" ")}function GWR_walk(v){if(typeof v==="string")return GWR_txt(v);if(Array.isArray(v))return v.map(GWR_walk).filter(function(x){return x!==""});if(v&&typeof v==="object"){var o={};for(var k in v){o[k]=GWR_walk(v[k]);if(k==="title"&&o[k]===""&&v[k])o[k]="[removed]"}return o}return v}function GWR(v){try{if(typeof v==="string"){if(!v)return v;var t=v.trim();if(t[0]==="{"||t[0]==="["){try{return JSON.stringify(GWR_walk(JSON.parse(v)))}catch(e){}}var n=GWR_txt(v);return n.trim()||!v.trim()?n:"[removed]"}return GWR_walk(v)}catch(e){return v}}`;

const EDITS = [
  ['function Yo(t){return kWe(t).stripped}', GATE + 'function Yo(t){return GWR(kWe(t).stripped)}'],
  ['storeObservations(e,r,n,s,i,o=0,a,c){', 'storeObservations(e,r,n,s,i,o=0,a,c){n=GWR(n);s=s&&GWR(s);'],
  ['storeSummary(e,r,n,s,i=0,o){', 'storeSummary(e,r,n,s,i=0,o){n=GWR(n);'],
];

function workers() {
  const root = path.join(os.homedir(), '.claude/plugins/cache/thedotmack/claude-mem');
  if (!fs.existsSync(root)) return [];
  return fs.readdirSync(root).map(v => path.join(root, v, 'scripts/worker-service.cjs')).filter(f => fs.existsSync(f));
}

let failed = 0;
for (const f of workers()) {
  let s = fs.readFileSync(f, 'utf8');
  if (s.includes(MARK)) { console.log('patched   ' + f); continue; }
  const missing = EDITS.filter(([a]) => s.split(a).length !== 2);
  if (missing.length) { failed++; console.log('ANCHOR MOVED ' + f + ' :: ' + missing.map(m => m[0].slice(0, 30)).join(' | ')); continue; }
  if (process.argv.includes('--check')) { failed++; console.log('unpatched ' + f); continue; }
  for (const [a, b] of EDITS) s = s.replace(a, () => b);
  fs.writeFileSync(f, s);
  console.log('applied   ' + f + ' (restart the worker to load it)');
}
process.exit(failed ? 1 : 0);

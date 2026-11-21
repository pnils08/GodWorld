#!/usr/bin/env node
'use strict';
/**
 * deadBranchScan.js — /health Scan 4 (S441, SIM_DOCTRINE §15).
 *
 * "A gate that can't fire is a trick." Signature: a bare numeric threshold
 * compared against a sheet-derived metric whose LIVE range never crosses it.
 * NEVER-FIRES = the branch has no way to run. ALWAYS-TRUE = a constant wearing
 * a gate's clothes. Both keep the output plausible while the mechanism is inert
 * — the defect class that hid 62 dead sentiment branches and a shock gate true
 * 19 of 19 cycles.
 *
 * Read-only. Defaults to the live sheet (what production runs against);
 * --sheet-id=<id> targets a bench (set AFTER lib/env, per DEPLOY.md trap 2b).
 * Exit 0 always — this reports, it does not gate.
 */
const fs=require('fs'), path=require('path'), cp=require('child_process');
let sheets;

// Tabs whose numeric columns engines gate on.
const TABS=['Neighborhood_Map','World_Population','Riley_Digest','Crime_Metrics',
            'Transit_Metrics','Neighborhood_Demographics','Hospital_Ledger'];

const norm=s=>String(s).toLowerCase().replace(/[^a-z0-9]/g,'');

async function scan4() {
  // 1. Live range per column.
  const ranges={};   // normalizedName -> {tab, col, min, max, n}
  for(const t of TABS){
    let d; try{ d=await sheets.getSheetData(t); }catch(e){ continue; }
    if(!d||d.length<2) continue;
    const hdr=d[0].map(x=>String(x).trim());
    for(let c=0;c<hdr.length;c++){
      if(!hdr[c]) continue;
      const vals=d.slice(1).map(r=>Number(r[c])).filter(Number.isFinite);
      if(vals.length<3) continue;
      const key=norm(hdr[c]);
      // first tab wins; Neighborhood_Map is listed first deliberately
      if(!ranges[key]) ranges[key]={tab:t,col:hdr[c],min:Math.min(...vals),max:Math.max(...vals),n:vals.length};
    }
  }
  console.log(`target ${process.env.GODWORLD_SHEET_ID.slice(0,12)}… | indexed ${Object.keys(ranges).length} numeric columns across ${TABS.length} tabs\n`);

  // 2. Scan engine sources for bare-number comparisons.
  const files=cp.execSync(
    "find phase* utilities -name '*.js' -not -name '*.test.js' 2>/dev/null || true",
    {cwd:'/root/GodWorld',encoding:'utf8'}).trim().split('\n').filter(Boolean);

  const RE=/([A-Za-z_$][A-Za-z0-9_$.]*)\s*(>=|<=|>|<)\s*(-?\d+(?:\.\d+)?)\b/g;
  const findings=[];
  for(const f of files){
    const src=fs.readFileSync(path.join('/root/GodWorld',f),'utf8').split('\n');
    src.forEach((line,idx)=>{
      const code=line.replace(/\/\/.*$/,'');
      if(/^\s*[*/]/.test(line)) return;            // comment block
      let m;
      RE.lastIndex=0;
      while((m=RE.exec(code))){
        const [ ,ident,op,numS]=m; const num=Number(numS);
        const leaf=ident.split('.').pop();
        const k=norm(leaf);
        // STRICT matching. Loose substring matching produced nonsense like
        // `col >= 1` binding to CollegeReadinessRate. A hit requires either an
        // exact normalized name match, or the identifier to END with the full
        // column name (nhSentiment -> Sentiment, hoodCrimeIndex -> CrimeIndex).
        const STOP=new Set(['length','index','count','row','col','idx','size','len','n','i','j','c','r','x','y','id','rowidx','colidx','total','num','max','min','sum']);
        if(k.length<6||STOP.has(k)) continue;
        let hit=ranges[k];
        if(!hit){
          for(const rk of Object.keys(ranges)){
            if(rk.length>=7 && k.endsWith(rk) && k.length-rk.length<=6){ hit=ranges[rk]; break; }
          }
        }
        if(!hit) continue;
        // A column whose live values are all identical carries no information —
        // every comparison against it is trivially always/never. Skip.
        if(hit.min===hit.max) continue;
        // can this branch ever fire given the live range?
        let fires;
        if(op==='>=') fires=hit.max>=num; else if(op==='>') fires=hit.max>num;
        else if(op==='<=') fires=hit.min<=num; else fires=hit.min<num;
        // always-true is the mirror defect: a constant, not a gate
        let always;
        if(op==='>=') always=hit.min>=num; else if(op==='>') always=hit.min>num;
        else if(op==='<=') always=hit.max<=num; else always=hit.max<num;
        if(!fires||always) findings.push({f,line:idx+1,ident,op,num,hit,verdict:fires?'ALWAYS-TRUE':'NEVER-FIRES',text:line.trim().slice(0,105)});
      }
    });
  }
  const never=findings.filter(x=>x.verdict==='NEVER-FIRES');
  const always=findings.filter(x=>x.verdict==='ALWAYS-TRUE');
  const show=(title,arr)=>{
    console.log(`\n===== ${title} (${arr.length}) =====`);
    const byFile={}; arr.forEach(x=>{(byFile[x.f]=byFile[x.f]||[]).push(x);});
    for(const f of Object.keys(byFile).sort()){
      console.log('\n'+f);
      for(const x of byFile[f]) console.log(`  :${String(x.line).padEnd(5)} ${x.ident} ${x.op} ${x.num}   [${x.hit.col} live ${x.hit.min}..${x.hit.max}]`);
    }
  };
  show('NEVER FIRES — threshold outside the metric\'s live range',never);
  show('ALWAYS TRUE — a constant wearing a gate\'s clothes',always);
  console.log(`\nTOTAL: ${never.length} never-fire, ${always.length} always-true, across ${new Set(findings.map(x=>x.f)).size} files`);
}

// engine.299 Task 2: report only. Importing this file performs no I/O.
const EMITTERS = [
  'phase04-events/generateGenericCitizenMicroEvent.js',
  'phase05-citizens/runNeighborhoodEngine.js',
  'phase05-citizens/generateMediaModeEvents.js',
  'phase05-citizens/generateCivicModeEvents.js',
  'phase04-events/generateGameModeMicroEvents.js',
  'phase05-citizens/generateCitizensEvents.js'
];
const OWNERS = new Set(['householdFormationEngine', 'runCareerEngine', 'checkForPromotions',
  'bondEngine', 'judicialLifecycle', 'migrationTrackingEngine']);
const PREMISE = /gentrif|displace(d|ment)|priced out|encampment|blight|crime rank|urban decay/i;
const LIFE = /\b(divorced?|promot\w*|laid off|layoff|married|wedding|gave birth|newborn|died|passed away|funeral|hospitaliz\w*|moved (out|away))\b/i;
// Narrow, visible exceptions. These annotate matches; they never remove them.
const ALLOWLIST = [
  { file: 'phase07-evening-media/buildContractSeeds.js', kind: 'comment', re: /never displaced/i,
    reason: 'Code-sense ordering comment, not citizen displacement (settled A1 context).' },
  { file: 'phase03-population/updateCrimeMetrics.js', re: /displacement/i,
    reason: 'Enforcement spillover between areas, not a displacement premise.' },
  { file: 'utilities/tier1EssenceEvents.js', re: /^Reads the anti-displacement and workforce mechanics end to end\.$/,
    reason: 'Elena POP-00791 published essence, held for the builder (A2).' },
  { file: 'utilities/tier1EssenceEvents.js', re: /^Promotion$/,
    reason: 'Authored Tier-1 essence tag, not a color-pool promotion.' },
  { file: 'phase05-citizens/generateCitizensEvents.js', re: /^handled a logistics call with an ex$/,
    reason: 'Reads MaritalStatus for register; does not create a divorce.' },
  // engine.299 Task 7 item 5: displacementmove → incomefitmove. The three read-alias sites keep the old key
  // so registers already stored on citizens still resolve; no stored value is rewritten.
  { file: 'utilities/compressLifeHistory.js', re: /^displacementmove$/,
    reason: 'History read alias: stored registers carry the old key (engine.299 Task 7).' },
  { file: 'phase05-citizens/generateCitizensEvents.js', re: /^displacementmove$/,
    reason: 'History read alias: stored registers carry the old key (engine.299 Task 7).' },
  { file: 'lib/resonanceRecall.js', re: /^displacementmove$/,
    reason: 'History read alias: stored registers carry the old key (engine.299 Task 7).' },
  { file: 'lib/coverageAnchorRetirements.js', re: /^displacement intake$/,
    reason: 'An avoidFramings entry: tells the desks NOT to use this framing (anti-premise).' },
  { file: 'phase05-citizens/generateCitizensEvents.js', re: /^displacement$/,
    reason: 'UNLIVED_RHYME keyword matched against tags already stored in a citizen\'s history; never written as text.' },
  { file: 'phase05-citizens/migrationTrackingEngine.js', re: /^displaced$/,
    reason: 'MIGRATION_REASONS enum value — builder 2026-10-18 kept the enum ("engine words are not gates").' },
  { file: 'phase06-analysis/applyMigrationDrift.js', re: /^(severe-weather|chaos|high-chaos)-displacement$/,
    reason: 'Drift factor label; humanizeDriver_ maps it to weather / instability before any readable text.' }
];
function annotate(hit) {
  const rule = ALLOWLIST.find(r => r.file === hit.file && (!r.kind || r.kind === hit.kind) && r.re.test(hit.text));
  return rule ? { ...hit, allowed: true, reason: rule.reason } : hit;
}

// Use the tokenizer already installed with the repository's ESLint dependency.
// Lexical classification is exact; tag/data-flow and pool membership are heuristic.
function fragments(source) {
  const tokens = require('espree').tokenize(source, { ecmaVersion: 'latest', loc: true, range: true, comment: true });
  return [...tokens.filter(t => t.type === 'String' || t.type === 'Template'), ...tokens.comments]
    .sort((a,b) => a.range[0] - b.range[0]).map(t => ({ line: t.loc.start.line,
      text: t.type === 'String' ? t.value.slice(1, -1) : t.type === 'Template' ? t.value.replace(/^[`}]|(?:`|\$\{)$/g, '') : t.value,
      kind: ['String', 'Template'].includes(t.type) ? 'string' : 'comment', offset: t.range[0] }));
}
function table(data, required, name) {
  if (!Array.isArray(data) || !Array.isArray(data[0])) throw new Error(name + ': missing header');
  const headers = data[0].map(x => String(x).trim());
  for (const col of required) if (headers.filter(x => x === col).length !== 1) throw new Error(name + ': missing/duplicate ' + col);
  return data.slice(1).map((r, i) => ({ row: i + 2, ...Object.fromEntries(headers.map((h, c) => [h, r[c] == null ? '' : r[c]])) }))
    .filter(r => headers.some(h => String(r[h]).trim()));
}
function readSources(root) {
  const result = {};
  function walk(dir) {
    for (const entry of fs.readdirSync(path.join(root, dir), { withFileTypes: true }).sort((a,b) => a.name.localeCompare(b.name))) {
      if (entry.name === 'node_modules' || entry.name === 'output' || entry.isSymbolicLink()) continue;
      const file = path.posix.join(dir, entry.name);
      if (entry.isDirectory()) walk(file);
      else if (file.endsWith('.js') && !file.endsWith('.test.js')) result[file] = fs.readFileSync(path.join(root, file), 'utf8');
    }
  }
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    if (entry.isDirectory() && (/^phase/.test(entry.name) || ['utilities', 'lib'].includes(entry.name))) walk(entry.name);
  }
  return result;
}
function buildOffenders({ log, ecl, sources, resolver, cycle, sheet = 'live', generatedAt = new Date().toISOString() }) {
  const rows = table(log, ['Cycle', 'EventTag', 'EventText'], 'LifeHistory_Log');
  const cycleOf = r => /^\d+$/.test(String(r.Cycle).trim()) && Number(r.Cycle) > 0 ? Number(r.Cycle) : NaN;
  if (rows.some(r => !Number.isSafeInteger(cycleOf(r)))) throw new Error('LifeHistory_Log: invalid Cycle');
  const selected = cycle === undefined ? rows.reduce((n,r) => Math.max(n, cycleOf(r)), 0) : Number(cycle);
  if (!Number.isSafeInteger(selected) || selected <= 0) throw new Error('No valid scanned Cycle');
  const scanned = rows.filter(r => cycleOf(r) === selected);
  if (!scanned.length) throw new Error('Requested Cycle has no log rows');
  const loggedTags = new Set(scanned.map(r => String(r.EventTag).split('|')[0].trim()));
  const tokens = Object.fromEntries(Object.entries(sources).map(([f,s]) => [f, fragments(s)]));
  const emitters = new Set(EMITTERS);
  const scanEmitters = new Set(EMITTERS);
  // Include every discovered log writer as well as engines explicitly named by
  // a future source column. Current LifeHistory_Log has no engine column.
  for (const [f,s] of Object.entries(sources)) {
    if (/LifeHistory_Log/.test(s) && /queue(?:Batch)?AppendIntent_|logRows\.push|logSheet\.(?:appendRow|getRange)/.test(s)) emitters.add(f);
  }
  for (const r of scanned) {
    const engine = String(r.SourceEngine || r.Engine || '').replace(/_$/, '').replace(/\.js$/, '');
    if (engine) for (const f of Object.keys(sources)) if (path.basename(f, '.js') === engine || f === engine + '.js') {
      emitters.add(f); scanEmitters.add(f);
    }
  }
  const inert = { total: 0, share: 0, byTag: {}, byEngine: {}, codeSites: [] };
  // engine.299: a bookkeeping marker (an exact bare REPORT_MARKERS tag that moves nothing) is a record of state,
  // not a lived day; it is reported here with its rows, never hidden, and does not count as inert texture.
  const structural = { total: 0, byTag: {}, rows: [] };
  // The scan's OWN list of bookkeeping markers (codex 2026-10-18: never via the resolver, whose fold must not change).
  // Exact bare tags only — a graded variant (Death-Composure-Down-S) is not a marker and stays visible as inert.
  const REPORT_MARKERS = { Compressed: 1, CareerState: 1, Advancement: 1, Death: 1 };
  const bump = (obj,k) => { Object.defineProperty(obj, k, { value: (Object.hasOwn(obj,k) ? obj[k] : 0) + 1, enumerable: true, configurable: true, writable: true }); };
  for (const r of scanned) {
    // Generator logs primaryTag|context; only the first part is the cell tag.
    const tag = String(r.EventTag).split('|')[0].trim();
    if (Object.keys(resolver.nudgesForEvent_(tag, 1, String(r.EventText))).length) continue;
    if (Object.hasOwn(REPORT_MARKERS, tag)) {
      structural.total++; bump(structural.byTag, tag);
      structural.rows.push({ tag, text: String(r.EventText).slice(0, 120), popId: String(r.POPID || '') });
      continue;
    }
    inert.total++; bump(inert.byTag, tag || '(blank)');
    let engine = String(r.SourceEngine || r.Engine || '').trim();
    if (!engine) {
      // A unique exact prose literal is a pointer, never claimed as provenance.
      const candidates = [...emitters].filter(f => (tokens[f] || []).some(t => t.kind === 'string' && t.text.length >= 20 && t.text === r.EventText));
      engine = candidates.length === 1 ? 'inferred:' + candidates[0] : 'unknown:no unique source evidence';
      if (candidates.length === 1) scanEmitters.add(candidates[0]);
    }
    bump(inert.byEngine, engine);
  }
  inert.share = inert.total / scanned.length;
  const premise = [], lifeVerbs = [];
  for (const [file, list] of Object.entries(tokens)) {
    const owner = OWNERS.has(path.basename(file, '.js'));
    for (const t of list) {
      const hit = { where: 'code', file, line: t.line, text: t.text, kind: t.kind };
      // engine.299 (codex 2026-10-18): a string is PROSE unless it is a single token in an identifier position —
      // a call argument, a comparison operand, an array/list or map entry, a case label, a key. Comments are never prose.
      let prose = false;
      if (t.kind === 'string') {
        const pre = sources[file].slice(Math.max(0, t.offset - 12), t.offset).replace(/\s+$/, '');
        const post = sources[file].slice(t.offset + t.text.length + 2, t.offset + t.text.length + 6).replace(/^\s+/, '');
        const singleToken = !/\s/.test(t.text.trim());
        // KNOWN identifier uses only (codex 2026-10-18 re-review 2): a column/sheet lookup argument, a comparison or
        // case operand, an object KEY. Array entries, object values and call arguments are where event text lives, so an
        // unknown position is prose. Shape: camelCase / PascalCase compound / snake / dotted path (a trailing period is
        // sentence punctuation, not a dotted identifier).
        const lookupArg = /\b(?:idx|indexOf|col|tcol|hj|idxG|idxL|getSheetByName|getSheetData|getSheetAsObjects|headerIndex|has|hasOwnProperty|hasOwn)\s*\($/.test(pre);
        const comparison = /(?:===?|!==?|\bcase)$/.test(pre) || /^(?:===?|!==?)/.test(post);
        const objectKey = /^:/.test(post);
        const identCtx = lookupArg || comparison || objectKey;
        const tt = t.text.trim();
        const identShape = /[a-z][A-Z]|^[A-Z][a-z]+[A-Z]|_|\.[A-Za-z]/.test(tt);
        prose = !singleToken || !(identCtx || identShape);
      }
      t.text.split('\n').forEach((text, n) => {
        if (PREMISE.test(text)) premise.push(annotate({ ...hit, text, line: t.line + n, prose }));
      });
      // Candidate prose in writer files, not proof the branch fires. Comments
      // are kept separate; metadata false positives remain reviewable.
      if (!owner && scanEmitters.has(file) && t.kind === 'string' && /\s/.test(t.text) && LIFE.test(t.text)) lifeVerbs.push(annotate(hit));
      if (file === 'utilities/tier1EssenceEvents.js' && t.kind === 'string' && t.text === 'Promotion') lifeVerbs.push(annotate(hit));
      if (file === 'phase05-citizens/generateCitizensEvents.js' && t.text === 'handled a logistics call with an ex') lifeVerbs.push(annotate(hit));
      if (!scanEmitters.has(file) || t.kind !== 'string') continue;
      const before = sources[file].slice(Math.max(0, t.offset - 100), t.offset);
      // Map keys (especially the deliberately inert historical DIAL_MAP) are
      // definitions, not written tags. Do not report them as emitter sites.
      const after = sources[file].slice(t.offset + t.text.length + 2);
      if (/^\s*:/.test(after)) continue;
      const known = Object.hasOwn(resolver.DIAL_MAP, t.text) || loggedTags.has(t.text);
      const tagContext = /\b(?:tag|eventTag|primaryTag|primary|category)\s*[:=]\s*$/i.test(before);
      const inline = /(?:^|— )\[([A-Za-z][A-Za-z -]*)\] /.exec(t.text);
      const tag = inline ? inline[1] : t.text;
      if ((known || tagContext || inline) && !Object.keys(resolver.nudgesForEvent_(tag, 1, '')).length) {
        inert.codeSites.push({ file, line: t.line, tag });
      }
    }
  }
  for (const r of table(ecl, ['Text', 'Active'], 'Event_Content_Ledger')) {
    if (String(r.Active).trim().toLowerCase() !== 'yes') continue;
    const pool = String(r.PoolKey || '');
    const hit = { where: 'live:Event_Content_Ledger', row: r.row, line: r.row, text: String(r.Text), kind: 'string', pool, prose: true };   // authored text, whatever its length
    if (PREMISE.test(hit.text)) premise.push(hit);
    if (LIFE.test(hit.text)) {
      // engine.299: owner-engine pools are excluded here exactly as owner-engine FILES are above — lifeEvent.* is the
      // promotion/home dice's own text, civicRole.* is what an official hears from a constituent (the event is theirs).
      const owner = /^(lifeEvent|civicRole)\./.test(pool);
      lifeVerbs.push(owner ? { ...hit, allowed: true, reason: 'Owner-engine pool (' + pool.split('.')[0] + '.*): the life event belongs to its own engine, not a color pool.' } : hit);
    }
  }
  // engine.299 (builder 2026-10-18: no engine-words gate): premise acceptance counts PROSE that can reach a citizen
  // or a desk — every ledger text, and any code string not sitting in an identifier position. Comments and identifiers
  // (a column name, an enum value, a DSL field) are code words: reported with prose:false, never hidden, never blocking.
  for (const h of premise) if (h.prose === undefined) h.prose = false;
  return { generatedAt, sheet, cycle: selected, scannedLines: scanned.length, inert, structural, premise, lifeVerbs,
    acceptanceEmpty: inert.total === 0 && !premise.some(h => !h.allowed && h.prose) && !lifeVerbs.some(h => !h.allowed) };
}
async function offenders(root, liveId, benchId, cycle) {
  let report;
  try {
    const log = await sheets.getSheetData('LifeHistory_Log');
    // ECL is explicitly LIVE even when the log comes from the bench.
    process.env.GODWORLD_SHEET_ID = liveId;
    const ecl = await sheets.getSheetData('Event_Content_Ledger');
    report = buildOffenders({ log, ecl, sources: readSources(root), resolver: require(path.join(root, 'utilities/citizenDialMap.js')),
      sheet: benchId ? 'bench' : 'live', cycle });
  } catch (e) {
    // Exit 0 is the report contract, not permission to turn missing data into 0.
    report = { generatedAt: new Date().toISOString(), sheet: benchId ? 'bench' : 'live', cycle: cycle || null,
      inert: { total: null, share: null, byTag: {}, byEngine: {}, codeSites: [] }, premise: [], lifeVerbs: [],
      acceptanceEmpty: false, incomplete: true, error: 'Offender scan incomplete: ' + (e.code || (e.response ? 'Sheet read failed' : e.message)) };
  } finally { process.env.GODWORLD_SHEET_ID = benchId || liveId; }
  const dest = path.join(root, 'output/engine299/offenders.json');
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ sheet: report.sheet, cycle: report.cycle, scannedLines: report.scannedLines,
    inert: report.inert.total, share: report.inert.share, structural: report.structural ? report.structural.total : 0, premise: report.premise.length, lifeVerbs: report.lifeVerbs.length,
    acceptanceEmpty: report.acceptanceEmpty, incomplete: !!report.incomplete }));
}
module.exports = { buildOffenders, fragments, readSources, ALLOWLIST };
if (require.main === module) {
  require('/root/GodWorld/lib/env');
  const liveId = process.env.GODWORLD_SHEET_ID;
  const sid = (process.argv.find(a => a.startsWith('--sheet-id=')) || '').split('=')[1];
  if (sid) process.env.GODWORLD_SHEET_ID = sid;
  sheets = require('/root/GodWorld/lib/sheets');
  if (process.argv.includes('--offenders')) {
    const cycleArg = process.argv.find(a => a.startsWith('--cycle='));
    offenders(path.resolve(__dirname, '..'), liveId, sid, cycleArg === undefined ? undefined : cycleArg.slice(8))
      .catch(() => { console.error('Offender report could not be written'); });
  } else scan4();
}

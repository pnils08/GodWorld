'use strict';

// Derived pack evidence only. No registry, ledger writes, engine effects or
// reflection-to-signature conversion. Counter field names own problem identity.
const { countPetition, buildHoodResolver } = require('./civicPetitions');
const CONDITIONS = {
  health: { inCareCitizens: 'citizens in care', sickResidents: 'sick residents' },
  safety: { aboveMedianHoods: 'hoods above city violent-level median' },
};
const identity = (hood, conditionKey) => JSON.stringify([hood, conditionKey]);
const accepted = m => ['pending', 'applied', 'failed'].includes(m.status);
const landed = m => m.status === 'applied' || (m.status === 'pending' && ['answer', 'canvass'].includes(m.type));
const escapeRE = text => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function moveHoods(move, resolver, trackerRows, directives, neighborhoodRows) {
  const p = move.payload || {};
  let names = [];
  if (move.type === 'propose') names = Array.isArray(p.hoods) ? p.hoods : [];
  if (move.type === 'canvass') names = [p.hood];
  if (move.type === 'work') {
    names = trackerRows.filter(r => r.InitiativeID === p.initiativeId)
      .flatMap(r => String(r.AffectedNeighborhoods || '').split(','));
  }
  if (move.type === 'answer') {
    const directive = directives.find(d => d.id === p.confrontationId && d.agentDir === move.agentDir && d.cycle <= Number(move.cycle));
    if (directive) {
      // Bind geography to the directive's recorded subject, never model-supplied
      // answer.hoods or a guess that every hood in the district was addressed.
      const text = directive.sourceText || directive.demand || '';
      names = neighborhoodRows.flatMap(r => [r.Neighborhood, ...String(r.ChildAreas || '').split(',')])
        .map(n => String(n || '').trim()).filter(n => n && new RegExp('(^|[^A-Za-z0-9])' + escapeRE(n) + '($|[^A-Za-z0-9])','i').test(text));
    }
  }
  return new Set(names.map(n => resolver.resolve(n)).filter(Boolean));
}

function deriveProblemContinuity({ data, hoods, previousPacks, moves, trackerRows, directives, closedLedgerCycles, agentDir, cap = 600 }) {
  const cycle = Number(data.cycle), resolver = buildHoodResolver(data.Neighborhood_Map);
  const targets = [...new Set((hoods.length ? hoods : resolver.hoods).map(h => {
    const hood = resolver.resolve(h);
    if (!hood) throw new Error('Unknown reading territory: ' + h);
    return hood;
  }))].sort();
  const readings = new Map(), problems = [], issues = [];
  for (const hood of targets) for (const [domain, keys] of Object.entries(CONDITIONS)) {
    let result;
    try { result = countPetition({policyDomain:domain,hoods:[hood]},data); }
    catch (e) { issues.push(hood + '/' + domain + ': ' + e.message); continue; }
    for (const [field,label] of Object.entries(keys)) {
      const conditionKey = domain + '.' + field, id = identity(hood,conditionKey), count = result.counts[field];
      if (count == null || !Number.isFinite(count)) { issues.push(id + ': count unavailable'); continue; }
      readings.set(id,count);
      if (count > 0) problems.push({id,hood,conditionKey,label,count,cycle});
    }
  }
  const relevantMoves = moves.filter(m => m.agentDir === agentDir && Number(m.cycle) <= cycle && accepted(m))
    .map(m => {
      const pack = previousPacks.find(p => Number(((p.game || {}).problemContinuity || {}).cycle) === Number(m.cycle));
      const workRows = Number(m.cycle) === cycle ? trackerRows : (((pack || {}).game || {}).board || [])
        .map(b => ({InitiativeID:b.id,AffectedNeighborhoods:(b.hoods || []).join(',')}));
      const touches = moveHoods(m,resolver,workRows,directives,data.Neighborhood_Map);
      const unknownWork = m.type === 'work' && !touches.size;
      if (unknownWork) issues.push('Work geography unavailable for ' + m.moveId);
      return {...m,touches,unknownWork};
    });
  const passed = new Map(), missingFolds = new Set();
  let exposurePacks = 0;
  for (const pack of previousPacks) {
    const evidence = pack.game && pack.game.problemContinuity;
    if (!evidence) continue; // legacy packs prove no displayed condition key
    if (!Array.isArray(evidence.visibleProblems)) throw new Error('Prior pack condition evidence is malformed');
    exposurePacks++;
    const seenCycle = Number(evidence.cycle);
    if (!Number.isInteger(seenCycle) || seenCycle < 1 || seenCycle >= cycle) throw new Error('Prior pack condition Cycle is invalid');
    for (const old of evidence.visibleProblems) {
      if (!old || !(Number(old.count) > 0)) throw new Error('Prior shown reading has no positive count');
      const hood = resolver.resolve(old.hood), id = identity(hood,old.conditionKey);
      if (!hood || !readings.has(id)) continue; // unknown is not proof of persistence or resolution
      if (!(readings.get(id) > 0)) continue;
      if (relevantMoves.some(m => Number(m.cycle) >= seenCycle && landed(m) && m.touches.has(hood))) continue;
      if (relevantMoves.some(m => Number(m.cycle) >= seenCycle && m.unknownWork)) continue;
      if (!closedLedgerCycles.has(seenCycle)) { missingFolds.add(seenCycle); continue; }
      if (relevantMoves.some(m => Number(m.cycle) === seenCycle && m.touches.has(hood))) continue;
      if (!passed.has(id)) passed.set(id,{...problems.find(p => p.id === id),passedOverCycle:seenCycle});
    }
  }
  // Builder 2026-11-02: the seat sees plain readings, not a list of problems
  // it failed. Every count above zero and every above-median hood is normal
  // in a living city; the passed-over record stays in the return value only.
  const passedOver = [...passed.values()], visibleProblems = [];
  const reading = p => p.conditionKey === 'safety.aboveMedianHoods' ? 'violence above the city middle'
    : p.conditionKey === 'health.sickResidents' ? p.count + ' residents sick'
    : p.conditionKey === 'health.inCareCitizens' ? p.count + ' in care'
    : p.label + ' ' + p.count;
  const byHood = new Map();
  for (const p of problems) { if (!byHood.has(p.hood)) byHood.set(p.hood, []); byHood.get(p.hood).push(p); }
  let text = 'Health and safety readings this week (C' + cycle + ').';
  const note = (issues.length ? '\n' + issues.length + (issues.length === 1 ? ' reading unavailable.' : ' readings unavailable.') : '') +
    (missingFolds.size ? '\n' + (missingFolds.size === 1 ? 'Move record unavailable for 1 earlier week.' : 'Move records unavailable for ' + missingFolds.size + ' earlier weeks.') : '');
  let shown = 0;
  for (const [hood, list] of byHood) {
    const line = '\n- ' + hood + ': ' + list.map(reading).join('; ');
    if (text.length + line.length + note.length + 45 > cap) break;
    text += line;
    visibleProblems.push(...list);
    shown++;
  }
  if (shown < byHood.size) text += '\n' + (byHood.size - shown) + ' more hoods not shown.';
  text += note;
  return {available:!issues.length && !missingFolds.size,cycle,problems,visibleProblems,passedOver,
    issues,missingFoldCycles:[...missingFolds],text:text.slice(0,cap)};
}

module.exports = { deriveProblemContinuity, moveHoods };

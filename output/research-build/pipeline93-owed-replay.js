require('/root/GodWorld/lib/env');
const wp = require('/root/GodWorld/lib/wakePerception');
const getCurrentCycle = require('/root/GodWorld/lib/getCurrentCycle');
const { VEHICLE_CONFIGS } = require('/root/GodWorld/utilities/chaosCarsConfig');
(async () => {
  const cycle = getCurrentCycle();
  const pool = (await wp.buildPool({ shapedMin: 0, lifeMinChars: 0 })).filter((p) => !(typeof p.age === 'number' && p.age < 7));
  const rec = await wp.loadOwedRecords();
  if (rec.errors.length) console.log('READ ERRORS:', rec.errors);
  const lived = await wp.loadLivedEvents(cycle);
  if (lived.error) throw new Error('lived: ' + lived.error);
  console.log(`cycle ${cycle}; pool ${pool.length}; rows chaos ${rec.chaos.length - 1} casino ${rec.casino.length - 1} hospital ${rec.hospital.length - 1} judicial ${rec.judicial.length - 1}`);
  const { owed, skipped } = wp.owedFrom(rec, cycle, wp.chaosOutcomeIndex(VEHICLE_CONFIGS));
  console.log('skipped:', skipped.length ? skipped : 'none');
  console.log('\nowed in window:'); for (const e of owed) console.log(`  ${e.id}  ${e.pop}  ${e.kind}  tier ${e.tier}  c${e.cycle}`);
  const oc = wp.owedCandidates(pool, owed, {}, lived);
  console.log(`\nsevere cycles: [${oc.severeCycles}]  not in pool: ${oc.notInPool.map((e) => e.id + ' ' + e.pop).join(', ') || 'none'}  nothing to show: ${oc.unshowable.map((e) => e.id + ' ' + e.pop).join(', ') || 'none'}`);
  console.log('wake order:'); oc.ready.forEach((e, i) => console.log(`  ${i + 1}. ${e.pop} ${e.kind} tier ${e.tier} c${e.cycle} mag ${e.mag.toFixed(2)}`));
  for (const e of oc.ready) {
    const c = pool.find((p) => p.popId === e.pop);
    const pins = wp.owedFor(e.pop, owed, {}).map((x) => x.pin).filter(Boolean);
    const pinned = pins.length ? wp.lifeTailOf(c.lifeLines, pins) : c.life;
    const hit = pins.length ? c.lifeLines.find((l) => pins.some((p) => l.startsWith(p.stamp + ' — ') && (p.body != null ? l.slice(p.stamp.length + 3) === p.body : p.re.test(l.slice(p.stamp.length + 3))))) : null;
    const shown = wp.owedFor(e.pop, owed, {}).filter((x) => wp.owedShown(x, pinned, wp.livedFor(e.pop, lived, {}, x.kind === 'hospital' ? wp.owedLivedPrefer(x) : undefined)));
    console.log(`\n== ${c.name} (${e.pop}) — ${e.kind}; event line ${hit ? 'found' : 'NOT FOUND'}; in the unpinned block: ${hit ? c.life.includes(hit) : 'n/a'}; shown (would be spent): ${shown.map((x) => x.id).join(',') || 'none'}`);
    console.log(pinned.split('\n').map((l) => '   ' + l).join('\n'));
  }
})().catch((e) => { console.error('FATAL', e.message); process.exit(1); });

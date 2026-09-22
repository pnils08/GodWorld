// Noise floor vs signal from burden_series.json: per-hood ratio (hood median / city median) deltas per cycle.
const fs = require('fs'); const series = JSON.parse(fs.readFileSync(process.argv[2], 'utf8')).sort((a, b) => a.cycle - b.cycle);
const treated = 'West Oakland';
const hoods = [...new Set(series.flatMap(s => Object.keys(s.ratios)))].sort();
console.log('cycles:', series.map(s => s.cycle).join(','), '| city medians:', series.map(s => s.city).join(','));
console.log('hood'.padEnd(18), series.map(s => ('C' + s.cycle).padStart(7)).join(''), '  n(first→last)');
for (const h of hoods) console.log(h.padEnd(18), series.map(s => (s.ratios[h] == null ? '   —   ' : s.ratios[h].toFixed(3).padStart(7))).join(''), '  ', series[0].counts[h], '→', series[series.length - 1].counts[h], h === treated ? '  <= treated' : '');
// one-cycle deltas for untreated hoods
const deltas = [];
for (let i = 1; i < series.length; i++) for (const h of hoods) if (h !== treated && series[i].ratios[h] != null && series[i - 1].ratios[h] != null) deltas.push({ h, from: series[i - 1].cycle, to: series[i].cycle, d: series[i].ratios[h] - series[i - 1].ratios[h] });
const abs = deltas.map(x => Math.abs(x.d)).sort((a, b) => a - b);
const q = p => abs.length ? abs[Math.min(abs.length - 1, Math.floor(p * abs.length))] : NaN;
console.log('\nuntreated one-step |Δratio|: n', abs.length, '| median', q(0.5).toFixed(3), '| p75', q(0.75).toFixed(3), '| p90', q(0.9).toFixed(3), '| max', abs.length ? abs[abs.length - 1].toFixed(3) : '—');
// cumulative drift from the first cycle (what a hold streak would see)
const first = series[0];
for (const s of series.slice(1)) {
  const cum = hoods.filter(h => h !== treated && s.ratios[h] != null && first.ratios[h] != null).map(h => s.ratios[h] - first.ratios[h]);
  const down = cum.filter(d => d < 0).map(d => -d).sort((a, b) => b - a);
  console.log('C' + first.cycle + '→C' + s.cycle, 'untreated cumulative: improved(down) share', (down.length / cum.length).toFixed(2), '| largest luck improvement', down.length ? down[0].toFixed(3) : '—', '| ≥0.10:', down.filter(d => d >= 0.10).length, '≥0.20:', down.filter(d => d >= 0.20).length, '| treated Δ', s.ratios[treated] != null && first.ratios[treated] != null ? (s.ratios[treated] - first.ratios[treated]).toFixed(3) : '—');
}

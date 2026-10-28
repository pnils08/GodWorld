// lib/mags.searchDisk.test.js — the writers' disk search must never serve the
// compare sandbox as the record. Only a gate-passed draft in staged/ is canon
// (builder 2026-10-20); packets, A/B arms, samples, flagged drafts, sidecars and
// wake state stay out (pipeline.89 first-run read, 2026-10-27).
const assert = require('assert');
const { isCanonSearchPath, searchDisk } = require('./mags');

const keep = [
  'editions/cycle_pulse_edition_92.txt',
  'archive/articles/c69_general_unknown_oakland-tribune.txt',
  'archive/non-articles/truesource_pop-00126.txt',
  'output/simulation_ledger_snapshot.jsonl',
  'output/world_summary_c113.md',
  'output/cron-compare/staged/civic_c112_luis-navarro_packet-v2_anthropic-claude-sonnet-5-5.staged.md',
];
const drop = [
  'output/cron-compare/staged-packets/civic_c113_trevor-shimizu_packet-v2_openai-gpt-5-6-luna.staged.packet.json',
  'output/cron-compare/sm-canon-test/civic_c113_trevor-shimizu_packet-v2_openai-gpt-5-6-luna.b.state.json',
  'output/cron-compare/samples/culture_c100_ungated.md',
  'output/cron-compare/flagged/civic_c111_rachel-torres_packet-v2.md',
  'output/cron-compare/civic_c113_luis-navarro_packet-v2_anthropic-claude-sonnet-5-5.md',
  'output/cron-compare/civic_c113_luis-navarro_packet-v2_anthropic-claude-sonnet-5-5.rhea.json',
  'output/cron-compare/civic_c113_luis-navarro_packet-v2_story.md',
  'output/cron-compare/staged/not-a-draft.packet.json',
  'output/cron-compare/staged/nested/x.staged.md',
];
for (const p of keep) assert.strictEqual(isCanonSearchPath(p), true, 'should keep ' + p);
for (const p of drop) assert.strictEqual(isCanonSearchPath(p), false, 'should drop ' + p);

// Live repo check: the exact query that leaked on 2026-10-27 returns no sandbox path.
const out = searchDisk('Baylight District final council vote', 10);
const paths = out.split('\n').slice(1).map(l => (l.match(/^— (\S+)/) || [])[1]).filter(Boolean);
for (const p of paths) assert.ok(isCanonSearchPath(p), 'leaked sandbox path in live search: ' + p);
assert.ok(!/cron-compare\/(staged-packets|sm-canon-test|samples|flagged)/.test(out), 'sandbox dir in output');

console.log('mags.searchDisk: ' + (keep.length + drop.length) + ' path rules ok; live query returned ' + paths.length + ' canon paths, 0 sandbox');

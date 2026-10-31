// lib/mags.searchDisk.test.js — the in-world disk search must never serve the
// compare sandbox as the record. Only a gate-passed draft in staged/ is canon
// (builder 2026-10-20); packets, A/B arms, samples, flagged drafts, sidecars and
// wake state stay out (pipeline.89 first-run read, 2026-10-27). pipeline.91: it
// reads the city's named shelves only — docs/, the lanes' output folders and the
// project papers filed in the archive stay out, and a new folder starts closed.
const assert = require('assert');
const { isCanonSearchPath, searchDisk } = require('./mags');

const keep = [
  'editions/cycle_pulse_edition_92.txt',
  'archive/articles/c69_general_unknown_oakland-tribune.txt',
  'archive/non-articles/truesource_pop-00126.txt',
  'output/simulation_ledger_snapshot.jsonl',
  'output/world_summary_c113.md',
  'output/engine_audit_c113.json',
  'output/cron-compare/staged/civic_c112_luis-navarro_packet-v2_anthropic-claude-sonnet-5-5.staged.md',
  'archive/editions/Cycle_1-69_The_Cycle_Pulse_Text_Mirror_Full_2026-01-01.txt',
  'archive/non-articles/unknown/INVESTIGATIONS _ Luis Navarro.txt',
  'archive/non-articles/data/A_S UNIVERSE STATCAST PLAYER CARD v1.0 BENJI DILLON.txt',
  'archive/articles/cXX_sports_unknown_mike-paulson-part-i-the-carpenter-s-line-finalized.txt',
  'output/beats/Business_Ledger.jsonl',
  'output/citizen_pages/index.jsonl',
  'output/city-civic-database/initiatives/baylight/decisions_c105.json',
  'output/civic-voice/council_d9_c105.json',
  'output/civis-journal/civis_journal_c110.md',
  'output/desk-packets/base_context.json',
  'output/exchanges/exchange_c103_2026-08-11_interview.md',
  'output/slices/c108/civic-domain.md',
  'output/spacemolt-show/feed/c113.json',
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
  // pipeline.91: the build's papers, wherever they sit
  'docs/plans/2026-09-21-care-and-justice-system.md',
  'docs/mags-corliss/NOTES_TO_SELF.md',
  'docs/canon/INSTITUTIONS.md',
  'output/kimi/2026-09-19-engine240-review.md',
  'output/engine-sheet/2026-10-30-r31-bench.log.txt',
  'output/codex/HANDOFF.md',
  'output/antigravity/2026-10-19-review-engine214-prod-candidate.md',
  'output/grok/media-audit-c104-proposed-fixes.md',
  'output/audit-reports/cascade-audit-2026-08-08.md',
  'output/notebooklm/daily/c113/fa4b7b5e9fff/source-pack.md',
  'output/desk-briefings/business_archive_c105.md',
  'output/production_log_c113.md',
  'output/execution_log_c112.txt',
  'output/engine_review_c112.md',
  'output/agent_engine-wiring_2026-10-01T00-00-00.md',
  'output/spacemolt-show/episodes/undocked-pop00775-Y3C8.log',
  'output/spacemolt-show/missions/undocked-pop00775.txt',
  'output/cron-civic/packets/civic-office-mayor_pending_decisions_c111.md',
  'output/initiative-packets/baylight_c109.json',
  'output/a-new-lane-nobody-named-yet/notes.md',
  'output/world_summary_c113.md.bak',
  'output/simulation_ledger_snapshot.meta.json',
  'archive/ARTICLE_INDEX.jsonl',
  'archive/drive-manifest.json',
  'archive/articles/cXX_general_unknown_godworld-realism-audit-report.txt',
  'archive/articles/cXX_general_unknown_autogen-integration-plan-for-godworld.txt',
  'archive/articles/cXX_general_unknown_story-narrative-enhancement-plan-godworld-v3.txt',
  'archive/articles/cXX_general_unknown_es5-write-intent-migration-status.txt',
  'archive/articles/cXX_chicago_unknown_archived-critical-issues-fixed-remaining-tech-debt.txt',
  'archive/articles/cXX_civic_unknown_archived-open-items-moved-to-docs-engine-project-s.txt',
  'archive/non-articles/unknown/WEEK1_DEPLOY.md',
  'archive/non-articles/unknown/OPENCLAW_INTEGRATION.md',
  'archive/non-articles/templates/CYCLE_PULSE_TEMPLATE.md',
  'editions/SUPPLEMENTAL_TEMPLATE.md',
  'editions/CYCLE_PULSE_TEMPLATE.md',
];
for (const p of keep) assert.strictEqual(isCanonSearchPath(p), true, 'should keep ' + p);
for (const p of drop) assert.strictEqual(isCanonSearchPath(p), false, 'should drop ' + p);

// Live repo check: the exact query that leaked on 2026-10-27 returns no sandbox path.
const out = searchDisk('Baylight District final council vote', 10);
const paths = out.split('\n').slice(1).map(l => (l.match(/^— (\S+)/) || [])[1]).filter(Boolean);
for (const p of paths) assert.ok(isCanonSearchPath(p), 'leaked sandbox path in live search: ' + p);
assert.ok(!/cron-compare\/(staged-packets|sm-canon-test|samples|flagged)/.test(out), 'sandbox dir in output');

// pipeline.91 live replay: the searches that served the build's papers on 2026-10-30
// and the writers' recorded searches return only shelf paths; the deep record stays.
const pathsOf = (q) => {
  const res = searchDisk(q, 30);
  return { res, paths: res.split('\n').slice(1).map(l => (l.match(/^— ([^:]+?)(?::| \[AGE|$)/) || [])[1]).filter(Boolean) };
};
const leakQueries = ['Claude', 'the builder', 'KONO clinic', 'KONO health', 'Laney College', 'sandbox', 'Eric Taveras UNDOCKED leaderboard', 'Jax Caldera Chinatown', 'Father Miguel UNDOCKED'];
for (const q of leakQueries) {
  const { paths: ps } = pathsOf(q);
  for (const p of ps) assert.ok(isCanonSearchPath(p), 'off-shelf path for "' + q + '": ' + p);
  assert.ok(!ps.some(p => /^docs\//.test(p)), 'docs/ served for "' + q + '"');
}
const held = [
  ['STATCAST PLAYER CARD Desmond Morton', /^archive\/non-articles\/data\//],
  ['PANDAS', /^(archive|editions)\//],
  ['Paper Cuts', /^(archive|editions)\//],
  ['Vinnie Keane', /^output\/simulation_ledger_snapshot\.jsonl$/],
  ['Baylight District final council vote', /^output\/(civic-voice|city-civic-database)\//],
];
for (const [q, want] of held) {
  const { paths: ps } = pathsOf(q);
  assert.ok(ps.some(p => want.test(p)), 'the record dropped for "' + q + '": ' + JSON.stringify(ps));
}

console.log('mags.searchDisk: ' + (keep.length + drop.length) + ' path rules ok; live query returned ' + paths.length + ' canon paths, 0 sandbox; ' + leakQueries.length + ' leak queries on-shelf, ' + held.length + ' record queries held');

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
  'output/exchanges/exchange_c103_2026-08-11_interview.md',
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
  'output/desk-packets/base_context.json',
  'output/desk-packets/citizen_archive.json',
  'output/slices/c108/hal.md',
  'output/slices/c108/civic-domain.md',
  'output/beats/meta.json',
  'output/beats/prev/meta.json',
  'output/citizen_pages/meta.json',
  'output/city-civic-database/clerk_audit_c105.json',
  'output/city-civic-database/initiatives/_candidates/candidates_c108.json',
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

// pipeline.91 live replay against the corpus. A search that broke and returned
// nothing must fail here, so every case states what comes back, not only what does not.
const BUILD_SNIPPET = /Auditor: Claude Code|Generated by scripts\/|docs\/plans\/|\.claude\/agents\//;
const search = (q) => {
  const res = searchDisk(q, 30);
  return { res, paths: res.split('\n').slice(1).map(l => (l.match(/^— (.+?\.(?:jsonl?|md|txt))(?::| \[AGE|$)/) || [])[1]).filter(Boolean) };
};
// Served the build's papers on 2026-10-30; each still answers, from the shelves only.
const leakQueries = ['Claude', 'the builder', 'KONO clinic', 'KONO health', 'Eric Taveras UNDOCKED leaderboard', 'Jax Caldera Chinatown', 'Father Miguel UNDOCKED', 'tracker updates use only contract phases'];
for (const q of leakQueries) {
  const { res, paths: ps } = search(q);
  assert.ok(/^\d+ file\(s\) matched/.test(res) && ps.length, 'no answer for "' + q + '": ' + res.slice(0, 120));
  for (const p of ps) assert.ok(isCanonSearchPath(p), 'off-shelf path for "' + q + '": ' + p);
  assert.ok(!BUILD_SNIPPET.test(res), 'build text served for "' + q + '"');
}
// Strings only the build holds: no shelf answers them.
const goneQueries = ['Auditor: Claude Code', 'Generated by scripts/buildHalSlice.js', 'sports_c108_anthony-raines_packet-v2_deepseek-deepseek-chat', 'MV-108-civic-office-council-d2-2026-09-21'];
for (const q of goneQueries) assert.strictEqual(searchDisk(q, 30), "No disk hits for '" + q + "'.");
// What the seats' frames promise canon_search will find, by exact path.
const held = [
  ['STATCAST PLAYER CARD Desmond Morton', 'archive/non-articles/data/A_S UNIVERSE STATCAST PLAYER CARD v1.0 DESMOND MORTON.txt'],
  ['PANDAS', 'archive/articles/cXX_sports_unknown_pandas.txt'],
  ['Paper Cuts', 'archive/articles/cXX_sports_unknown_paper-cuts-vs-percentiles.txt'],
  ['Vinnie Keane', 'output/simulation_ledger_snapshot.jsonl'],
  ['Baylight District final council vote', 'output/city-civic-database/initiatives/baylight/decisions_c105.json'],
  ['Heat Shield', 'archive/articles/c100_opinion_heat-shield_jax-caldera.txt'],
];
for (const [q, want] of held) {
  const { paths: ps } = search(q);
  assert.ok(ps.includes(want), 'the record dropped for "' + q + '", want ' + want + ': ' + JSON.stringify(ps.slice(0, 8)));
}

// A search term is text, never a pattern: a bracket is a character to find, not a miss.
assert.ok(/^\d+ file\(s\) matched/.test(searchDisk('Keane [', 5)), 'a stray bracket read as absence');

// grep outcomes, stubbed. A file vanishing mid-walk costs that file, never the other
// hits. Any other grep error stays a visible error, on every stage.
const cp = require('child_process');
const realExec = cp.execFileSync;
const stubGrep = (stage, stderr, stdout) => {
  cp.execFileSync = function (cmd, args) {
    if (args[0] === stage) { const e = new Error('grep failed'); e.status = 2; e.stdout = stdout; e.stderr = stderr; throw e; }
    return realExec.apply(this, arguments);
  };
};
const HIT = 'editions/cycle_pulse_edition_100.txt\n';
stubGrep('-rIliF', 'grep: output/beats/x.jsonl: No such file or directory\n', HIT);
const partial = searchDisk('Keane', 5);
stubGrep('-rIliF', 'grep: output/beats: Permission denied\n', HIT);
const unread = searchDisk('Keane', 5);
stubGrep('-IliF', 'grep: editions/x.txt: Input/output error\n', '');
const andError = searchDisk('Vinnie Keane zzqxunmatched', 5);
cp.execFileSync = realExec;
assert.ok(/^1 file\(s\) matched/.test(partial) && partial.includes(HIT.trim()), 'vanished file lost the other hits: ' + partial.slice(0, 120));
assert.ok(/^\(disk search error/.test(unread), 'an unreadable shelf read as a full answer: ' + unread.slice(0, 120));
assert.ok(/^\(disk search error/.test(andError), 'an AND-stage error read as absence: ' + andError.slice(0, 120));

console.log('mags.searchDisk: ' + (keep.length + drop.length) + ' path rules ok; live query returned ' + paths.length + ' canon paths, 0 sandbox; ' + leakQueries.length + ' leak queries on-shelf, ' + goneQueries.length + ' build strings gone, ' + held.length + ' records held, grep outcomes ok');

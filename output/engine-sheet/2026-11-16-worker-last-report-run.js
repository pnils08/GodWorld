// pipeline.110 — one lean weekly report made against the worker's last report (builder 2026-11-16: "2"), dated as the
// next weekly wake so Monday's record is the last one. Runner settings; under scripts/guard/nowrite.js, nothing saved.
// node output/engine-sheet/2026-11-16-worker-last-report-run.js CHIEF-FIRE 2026-11-23
require('/root/GodWorld/lib/env');
const fs = require('fs');
const ROOT = '/root/GodWorld';
const ww = require(ROOT + '/scripts/workerWake.js');
const dw = require(ROOT + '/scripts/cron-desk-writer.js');
const civic = require(ROOT + '/scripts/cron-civic-run.js');
const om = require(ROOT + '/scripts/civic-office-map.json');
const [id, date] = process.argv.slice(2);
(async () => {
  const office = om.offices.concat(om.projects || []).find((x) => (x.officeId || x.projectId) === id);
  const model = office.model || 'deepseek/deepseek-v4.1-flash-1017';
  const w = await ww.buildWake({ officeId: id, cycle: 116, officeMap: om, date });
  const r = await dw.openRouterToolLoop({ model, system: w.system, user: w.user, toolset: ww.toolsFor(id, { records: w.records }),
    exec: ww.toolExecutor({ popid: office.popid, cycle: 116, stage: { patrol: [] }, records: w.records, dw }),
    maxToolCalls: 6, maxTokens: 2400, timeoutMs: 180000, keepResults: true, answerLateToolCalls: 'No more reads this wake.',
    body: /^deepseek\/deepseek-v4/.test(model) ? { reasoning: { enabled: false } } : {} });
  const out = ['# ' + office.holder + ' — weekly report against the last one (as of ' + date + ')', '',
    '- last report handed: ' + (w.last ? w.last.date + ', Cycle ' + w.last.cycle + ', ' + w.last.statement.length + ' chars' : 'none'),
    '- handed: system ' + w.system.length + ' + user ' + w.user.length + '; verdict **' + civic.workerReplyVerdict(r) + '**; $' + r.billedUsd,
    '- reads: ' + (r.trace.map((t) => t.tool + '(' + JSON.stringify(t.input) + ')').join('; ') || 'none'), '', '## Task as handed', '', w.user.slice(w.user.lastIndexOf('\n\n') + 2), '', '## Reply', '', r.text || '(none)', ''].join('\n');
  fs.writeFileSync(ROOT + '/output/engine-sheet/2026-11-16-worker-last-report-run.' + id + '.md', out);
  console.log(out);
})().catch((e) => { console.error(e); process.exit(1); });

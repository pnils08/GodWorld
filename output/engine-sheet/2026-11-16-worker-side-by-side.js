// pipeline.110 — side by side (builder 2026-11-16: "do a side by side test run, will lean with tools and more given plus
// tools"): each lean worker wakes twice on the same job, task and tools — once on the lean pack (this Cycle), once with
// every record handed whole — on its scheduled report and on one question from the Mayor. Same model, loop and settings
// as cron-civic-run.js runWorkerDatawake. Run under scripts/guard/nowrite.js: nothing is saved to a page, sheet or ledger.
// node output/engine-sheet/2026-11-16-worker-side-by-side.js CHIEF-FIRE EMERG-DIR
require('/root/GodWorld/lib/env');
const fs = require('fs');
const ROOT = '/root/GodWorld';
const ww = require(ROOT + '/scripts/workerWake.js');
const dw = require(ROOT + '/scripts/cron-desk-writer.js');
const civic = require(ROOT + '/scripts/cron-civic-run.js');
const om = require(ROOT + '/scripts/civic-office-map.json');
const CYCLE = 116;
const QUESTIONS = {
  'CHIEF-FIRE': 'What happened with the fire in KONO this week, and who did it touch?',
  'EMERG-DIR': 'Is the Downtown transit snarl still a crisis, or is it behind us?',
};
const ASKER = 'Avery Santana, Mayor of Oakland,';
const OUT = ROOT + '/output/engine-sheet/2026-11-16-worker-side-by-side.md';

function fullUser(w, cycle, question) {
  const i = w.user.indexOf('What you have decided and said on the record:');
  const tail = w.user.slice(i);   // their decisions and the task, as the lean wake has them
  return Object.entries(w.records).map(([t, v]) => t + ':\n' + v).join('\n\n') + '\n\n' + tail;
}

(async () => {
  const lines = ['# Worker side by side — Cycle ' + CYCLE + ', 2026-11-16', '', 'Same job sentence, task, tools, model and loop; the only difference is what is handed: **lean** (this Cycle of each record) or **full** (every record whole). No write.', ''];
  for (const id of process.argv.slice(2)) {
    const office = om.offices.concat(om.projects || []).find((x) => (x.officeId || x.projectId) === id);
    const model = office.model || 'deepseek/deepseek-v4.1-flash-1017';
    for (const mode of ['report', 'asked']) {
      const q = mode === 'asked' ? { question: QUESTIONS[id], askerLine: ASKER } : {};
      const w = await ww.buildWake({ officeId: id, cycle: CYCLE, officeMap: om, ...q });
      for (const pack of ['lean', 'full']) {
        const user = pack === 'lean' ? w.user : fullUser(w, CYCLE);
        const stage = { patrol: [] };
        const r = await dw.openRouterToolLoop({ model, system: w.system, user, toolset: ww.toolsFor(id, { records: w.records }),
          exec: ww.toolExecutor({ popid: office.popid, cycle: CYCLE, stage, records: w.records, dw }),
          maxToolCalls: 6, maxTokens: 2400, timeoutMs: 180000, keepResults: true, answerLateToolCalls: 'No more reads this wake.',
          body: /^deepseek\/deepseek-v4/.test(model) ? { reasoning: { enabled: false } } : {} });
        const verdict = civic.workerReplyVerdict(r);
        let loose = [];
        try { loose = [...civic.ungroundedNumbers(w.system + '\n' + user + '\n' + r.trace.map((t) => t.result || '').join('\n'), [r.text], { cycle: CYCLE })]; } catch (e) { loose = ['check failed: ' + e.message]; }
        lines.push('## ' + office.holder + ', ' + office.title + ' — ' + mode + ' — ' + pack.toUpperCase(), '',
          '- handed: system ' + w.system.length + ' + user ' + user.length + ' chars; model ' + model + '; verdict **' + verdict + '**; cost $' + r.billedUsd,
          '- reads: ' + (r.trace.length ? r.trace.map((t) => t.tool + '(' + JSON.stringify(t.input) + ') → ' + t.resultChars).join('; ') : 'none'),
          '- figures not in what was handed or read: ' + (loose.length ? loose.join(', ') : 'none'),
          ...(mode === 'asked' ? ['- asked: ' + ASKER + ' "' + QUESTIONS[id] + '"'] : []), '', r.text || '(no reply)', '');
        console.log(id, mode, pack, verdict, r.trace.length + ' reads', '$' + r.billedUsd);
      }
    }
  }
  fs.writeFileSync(OUT, lines.join('\n'));
  console.log('written ' + OUT);
})().catch((e) => { console.error(e); process.exit(1); });

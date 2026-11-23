// governance.62: the engine-review drafter (run-cycle Step 4). Reads the C117 files on disk; no sheet read.
const assert = require('assert');
const fs = require('fs'), path = require('path'), os = require('os');
const d = require('./draftEngineReview');
let pass = 0, fail = 0;
const t = async (name, fn) => { try { await fn(); pass++; console.log('  ok   ' + name); } catch (e) { fail++; console.log('  FAIL ' + name + ' — ' + e.message); } };
(async () => {
  const audit = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'output', 'engine_audit_c117.json'), 'utf8'));
  const text = await d.draft(117, { noSheet: true });
  await t('carries the CALLS-PENDING marker Step 4.1 refuses on', () => assert(text.includes(d.MARKER) && /CALLS-PENDING/.test(text)));
  await t('every non-improvement finding is a row with its finding id', () => {
    audit.patterns.forEach((p, i) => { if (p.type !== 'improvement') assert(text.includes(`| C117-${i} | ${p.type} |`), 'missing C117-' + i); });
  });
  await t('every improvement is listed by id', () => {
    audit.patterns.forEach((p, i) => { if (p.type === 'improvement') assert(text.includes(`- C117-${i}: `), 'missing improvement C117-' + i); });
  });
  await t('the scoreboard and the fire are drafted', () => assert(/## Scoreboard[\s\S]*married 2/.test(text) && /## Fire[\s\S]*phases/.test(text)));
  await t('a pipe in a record is escaped inside the table', () => assert(!/\| [^|\n]*[^\\]\|[^ ][^|\n]* \| _call_ \|/.test(text.split('## Improvements')[0].split('| Call |')[1] || '')));
  await t('an audit for another Cycle is refused', async () => {
    let threw = false; try { await d.draft(99999, { noSheet: true }); } catch (_) { threw = true; } assert(threw);
  });
  console.log(pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0);
})();

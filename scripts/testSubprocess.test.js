const { spawnCapture, spawnSyncCapture } = require('./testSubprocess');

let passed = 0;
let failed = 0;
function assert(label, cond) {
  if (cond) { console.log(`  ok   ${label}`); passed++; }
  else { console.error(`  FAIL ${label}`); failed++; }
}

console.log('Test 1: synchronous file-descriptor capture');
{
  const result = spawnSyncCapture(process.execPath, [
    '-e',
    "process.stdout.write('sync-out'); process.stderr.write('sync-err'); process.exit(3);",
  ]);
  assert('non-zero status preserved', result.status === 3);
  assert('stdout preserved', result.stdout === 'sync-out');
  assert('stderr preserved', result.stderr === 'sync-err');
}

console.log('\nTest 2: asynchronous file-descriptor capture');
(async () => {
  const result = await spawnCapture(process.execPath, [
    '-e',
    "process.stdout.write('async-out'); process.stderr.write('async-err');",
  ]);
  assert('zero status preserved', result.status === 0);
  assert('stdout preserved', result.stdout === 'async-out');
  assert('stderr preserved', result.stderr === 'async-err');

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed === 0 ? 0 : 1);
})().catch(err => {
  console.error(err.stack || err.message);
  process.exit(1);
});

'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const H = require('./undockedHealthcheck');

let failed = 0;
function check(name, cond, detail) {
  if (cond) console.log('  ok  ' + name);
  else { failed++; console.error('  FAIL ' + name + (detail ? ': ' + detail : '')); }
}

check('200 -> ok', H.classifyKeyStatus(200) === 'ok');
check('401 -> key-dead', H.classifyKeyStatus(401) === 'key-dead');
check('403 -> key-dead', H.classifyKeyStatus(403) === 'key-dead');
check('500 -> server-error', H.classifyKeyStatus(500) === 'server-error');

const now = Date.now();
check('fresh episode passes', H.episodeFresh(now - 3600000, now) === true);
check('27h old passes', H.episodeFresh(now - 27 * 3600000, now) === true);
check('29h old fails', H.episodeFresh(now - 29 * 3600000, now) === false);
check('no episodes fails', H.episodeFresh(null, now) === false);

// newestEpisodeMtime against a temp dir: newest .json wins, logs/dirs ignored.
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'undocked-health-'));
fs.writeFileSync(path.join(dir, 'a-2026-09-07.json'), '{}');
fs.writeFileSync(path.join(dir, 'a-2026-09-07.log'), 'not a sidecar');
const past = now - 7200000;
fs.utimesSync(path.join(dir, 'a-2026-09-07.json'), past / 1000, past / 1000);
const got = H.newestEpisodeMtime(dir);
check('newest sidecar mtime found, .log ignored', Math.abs(got - past) < 2000, 'got ' + got);
check('missing dir -> null', H.newestEpisodeMtime(path.join(dir, 'nope')) === null);
fs.rmSync(dir, { recursive: true, force: true });

if (failed) { console.error('undockedHealthcheck: ' + failed + ' FAIL'); process.exit(1); }
console.log('undockedHealthcheck: ok');

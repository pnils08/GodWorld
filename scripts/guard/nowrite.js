/**
 * scripts/guard/nowrite.js — write guard for dry runs (builder 2026-11-13: "its imperative dry runs dont enter
 * canon"; 2026-11-14: "Put in the repo").
 *
 * A --require preload. Loaded ahead of any script, it refuses and logs every file write outside the allowed
 * folders, every network call that is not a known read or the model call itself, and every child process other
 * than node or grep. A refused call throws (code EACCES); a script that does not catch it stops there, and the
 * log names what was refused. It guards node only: the bash parts of a shell script are not guarded.
 *
 * Usage:
 *   NOWRITE_ALLOW=<dir>[:<dir>...] NOWRITE_LOG=<file inside an allowed dir> \
 *   NODE_OPTIONS="--require /root/GodWorld/scripts/guard/nowrite.js" node scripts/<any>.js --dry-run ...
 *   (node children inherit NODE_OPTIONS, so a script that spawns node stays guarded)
 *
 * Allowed network: OpenRouter chat completions (POST); Supermemory search, list and GET; Google APIs GET and the
 * token call. To let another read through, add it to netOk below; never widen it for a write.
 * Self-test: node scripts/guard/nowrite.selftest.js
 * With scripts/guard/bootswap.js (in-memory file swap) this is how boot tests run without touching a live file:
 * docs/research/2026-11-13-boot-templates-test-runs.md §Run 2.
 */
const fs = require('fs'), path = require('path'), http = require('http'), https = require('https'), cp = require('child_process');
const ALLOW = String(process.env.NOWRITE_ALLOW || '').split(':').filter(Boolean).map((d) => path.resolve(d));
const LOG = process.env.NOWRITE_LOG;
const rawAppend = fs.appendFileSync.bind(fs), rawExists = fs.existsSync.bind(fs), rawStat = fs.statSync.bind(fs);
const note = (kind, verdict, what) => { try { rawAppend(LOG, [new Date().toISOString(), process.pid, kind, verdict, what].join('\t') + '\n'); } catch (e) {} };
const inside = (p) => { const r = path.resolve(String(p)); return r === '/dev/null' || ALLOW.some((d) => r === d || r.startsWith(d + path.sep)); };
const deny = (kind, what) => { note(kind, 'BLOCKED', what); const e = new Error('NOWRITE guard blocked ' + kind + ': ' + what); e.code = 'EACCES'; return e; };
const isPath = (a) => typeof a === 'string' || Buffer.isBuffer(a) || a instanceof URL;
const str = (a) => (a instanceof URL ? a.pathname : String(a));

function guardFs(obj, name, pathArgs, opts) {
  const real = obj[name]; if (typeof real !== 'function') return;
  obj[name] = function (...args) {
    for (const i of pathArgs) {
      if (!isPath(args[i])) continue;
      const p = str(args[i]);
      if (opts && opts.mkdir && rawExists(p)) return opts.async ? Promise.resolve(undefined) : undefined; // already there: nothing changes
      if (opts && opts.open) { const fl = args[1] == null ? 'r' : args[1]; if (fl === 'r' || fl === 'rs' || fl === fs.constants.O_RDONLY) continue; }
      if (!inside(p)) {
        const err = deny('fs.' + name, path.resolve(p));
        if (opts && opts.async) return Promise.reject(err);
        const cb = args[args.length - 1];
        if (opts && opts.cb && typeof cb === 'function') return process.nextTick(cb, err);
        throw err;
      }
    }
    return real.apply(this, args);
  };
}
for (const n of ['writeFileSync', 'appendFileSync', 'truncateSync', 'unlinkSync', 'rmSync', 'rmdirSync', 'createWriteStream', 'chmodSync', 'utimesSync', 'symlinkSync']) guardFs(fs, n, [0]);
for (const n of ['renameSync', 'copyFileSync', 'linkSync']) guardFs(fs, n, [0, 1].slice(n === 'copyFileSync' ? 1 : 0));
guardFs(fs, 'mkdirSync', [0], { mkdir: true });
guardFs(fs, 'openSync', [0], { open: true });
for (const n of ['writeFile', 'appendFile', 'truncate', 'unlink', 'rm', 'rmdir']) guardFs(fs, n, [0], { cb: true });
for (const n of ['rename']) guardFs(fs, n, [0, 1], { cb: true });
guardFs(fs, 'copyFile', [1], { cb: true });
guardFs(fs, 'mkdir', [0], { cb: true, mkdir: true });
guardFs(fs, 'open', [0], { cb: true, open: true });
for (const n of ['writeFile', 'appendFile', 'truncate', 'unlink', 'rm', 'rmdir']) guardFs(fs.promises, n, [0], { async: true });
guardFs(fs.promises, 'rename', [0, 1], { async: true });
guardFs(fs.promises, 'copyFile', [1], { async: true });
guardFs(fs.promises, 'mkdir', [0], { async: true, mkdir: true });
guardFs(fs.promises, 'open', [0], { async: true, open: true });

// ---- network: reads and the model call only
function netOk(host, method, p) {
  host = String(host || '').toLowerCase(); method = String(method || 'GET').toUpperCase(); p = String(p || '/').split('?')[0];
  if (host === 'openrouter.ai') return method === 'POST' && p === '/api/v1/chat/completions';
  if (host.endsWith('supermemory.ai')) return method === 'GET' || (method === 'POST' && ['/v3/search', '/v4/search', '/v3/documents/list'].includes(p));
  if (host.endsWith('googleapis.com') || host === 'accounts.google.com') return method === 'GET' || (method === 'POST' && /\/token$/.test(p));
  return false;
}
function wrapReq(mod, name, scheme) {
  const real = mod[name];
  mod[name] = function (...args) {
    let host, method, p;
    const a0 = args[0], a1 = typeof args[1] === 'object' && args[1] ? args[1] : {};
    if (typeof a0 === 'string' || a0 instanceof URL) { const u = new URL(String(a0)); host = u.hostname; p = u.pathname; method = a1.method || (name === 'get' ? 'GET' : 'GET'); }
    else { host = a0.hostname || a0.host; p = a0.path; method = a0.method || 'GET'; }
    const what = method + ' ' + scheme + '://' + host + String(p || '').split('?')[0];
    if (!netOk(host, method, p)) throw deny('net', what);
    note('net', 'allowed', what);
    return real.apply(this, args);
  };
}
wrapReq(https, 'request', 'https'); wrapReq(https, 'get', 'https'); wrapReq(http, 'request', 'http'); wrapReq(http, 'get', 'http');
if (typeof globalThis.fetch === 'function') {
  const realFetch = globalThis.fetch;
  globalThis.fetch = function (input, init) {
    const url = new URL(typeof input === 'string' || input instanceof URL ? String(input) : input.url);
    const method = (init && init.method) || (input && input.method) || 'GET';
    const what = String(method).toUpperCase() + ' https://' + url.hostname + url.pathname;
    if (!netOk(url.hostname, method, url.pathname)) return Promise.reject(deny('net', what));
    note('net', 'allowed', what);
    return realFetch.call(this, input, init);
  };
}
// ---- child processes: a guarded node child, or a read-only grep/git/ls/date/sed/find/cp-into-allowed; nothing else
const SAFE = new Set(['grep', 'node', '/usr/bin/node', process.execPath]);
for (const n of ['spawn', 'spawnSync', 'execFile', 'execFileSync']) {
  const real = cp[n];
  cp[n] = function (cmd, ...rest) {
    if (!SAFE.has(String(cmd))) throw deny('child', String(cmd) + ' ' + (Array.isArray(rest[0]) ? rest[0].join(' ').slice(0, 160) : ''));
    note('child', 'allowed', String(cmd) + ' ' + (Array.isArray(rest[0]) ? rest[0].slice(0, 3).join(' ').slice(0, 160) : ''));
    return real.call(this, cmd, ...rest);
  };
}
for (const n of ['exec', 'execSync']) { const real = cp[n]; cp[n] = function (cmd) { throw deny('child', String(cmd).slice(0, 200)); }; }
note('guard', 'loaded', process.argv.slice(1, 4).join(' ') + ' | allow=' + ALLOW.join(','));

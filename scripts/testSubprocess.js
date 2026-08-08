/**
 * Capture a test subprocess through temporary files instead of OS pipes.
 *
 * Some managed shells preserve child exit status but return empty piped
 * stdout/stderr for nested Node processes. File descriptors keep the test
 * boundary deterministic without weakening assertions or changing the
 * command under test.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn, spawnSync } = require('child_process');

function openCapture_() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'godworld-test-subprocess-'));
  const stdoutPath = path.join(dir, 'stdout');
  const stderrPath = path.join(dir, 'stderr');
  return {
    dir,
    stdoutPath,
    stderrPath,
    stdoutFd: fs.openSync(stdoutPath, 'w'),
    stderrFd: fs.openSync(stderrPath, 'w'),
  };
}

function finishCapture_(capture) {
  fs.closeSync(capture.stdoutFd);
  fs.closeSync(capture.stderrFd);
  const stdout = fs.readFileSync(capture.stdoutPath, 'utf8');
  const stderr = fs.readFileSync(capture.stderrPath, 'utf8');
  fs.rmSync(capture.dir, { recursive: true, force: true });
  return { stdout, stderr };
}

function spawnSyncCapture(command, args, options) {
  const capture = openCapture_();
  let result;
  try {
    result = spawnSync(command, args || [], Object.assign({}, options, {
      stdio: ['ignore', capture.stdoutFd, capture.stderrFd],
    }));
  } finally {
    const output = finishCapture_(capture);
    if (result) Object.assign(result, output);
  }
  return result;
}

function spawnCapture(command, args, options) {
  const capture = openCapture_();
  const opts = Object.assign({}, options);
  const timeout = opts.timeout;
  delete opts.timeout;

  return new Promise(resolve => {
    const child = spawn(command, args || [], Object.assign(opts, {
      stdio: ['ignore', capture.stdoutFd, capture.stderrFd],
    }));
    let spawnError = null;
    let timer = null;

    if (timeout) {
      timer = setTimeout(() => child.kill('SIGTERM'), timeout);
    }
    child.on('error', err => { spawnError = err; });
    child.on('close', (status, signal) => {
      if (timer) clearTimeout(timer);
      const output = finishCapture_(capture);
      resolve(Object.assign({ status, signal, error: spawnError }, output));
    });
  });
}

module.exports = { spawnSyncCapture, spawnCapture };

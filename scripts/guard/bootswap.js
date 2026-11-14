/**
 * scripts/guard/bootswap.js — in-memory file swap for dry runs (builder 2026-11-14: "Put in the repo").
 *
 * A --require preload. While it is loaded, a read of a named file returns another file's content, or behaves as
 * if the file were absent. Nothing on disk changes. Used to wake an agent on a different boot text than the one
 * in its folder, through the real wake script.
 *
 * Usage:
 *   BOOT_SWAP=<map.json> NODE_OPTIONS="--require /root/GodWorld/scripts/guard/nowrite.js --require /root/GodWorld/scripts/guard/bootswap.js" ...
 *   map.json: { "<absolute path>": "<replacement file>" | null }   (null = the file is absent)
 * Covers fs.readFileSync and fs.existsSync, which is what the wake scripts use for agent files.
 */
const fs = require('fs');
const path = require('path');
const mapFile = process.env.BOOT_SWAP;
if (mapFile) {
  const map = JSON.parse(fs.readFileSync(mapFile, 'utf8'));
  const key = (p) => { try { return path.resolve(String(p)); } catch (e) { return null; } };
  const realRead = fs.readFileSync, realExists = fs.existsSync;
  fs.readFileSync = function (p, ...rest) {
    const k = typeof p === 'string' || Buffer.isBuffer(p) ? key(p) : null;
    if (k && Object.prototype.hasOwnProperty.call(map, k)) {
      if (map[k] === null) { const e = new Error("ENOENT: no such file or directory, open '" + k + "'"); e.code = 'ENOENT'; throw e; }
      return realRead.call(fs, map[k], ...rest);
    }
    return realRead.call(fs, p, ...rest);
  };
  fs.existsSync = function (p) {
    const k = typeof p === 'string' ? key(p) : null;
    if (k && Object.prototype.hasOwnProperty.call(map, k)) return map[k] !== null;
    return realExists.call(fs, p);
  };
}

// Regression test for S265 ES-5 (C98 G-PR-C98-3).
//
// QA drop verdicts were written only to <slug>.meta.json sidecars; manifest.photos[]
// kept dropped:false / editorialFlag absent, so any manifest-only consumer treated
// dropped photos as live. syncDropStateToManifest() reconciles the two at QA close.

var fs = require('fs');
var os = require('os');
var path = require('path');
var { syncDropStateToManifest } = require('./generate-edition-photos');

var pass = 0, fail = 0;
function ok(cond, label) { if (cond) { pass++; console.log('  PASS  ' + label); } else { fail++; console.log('  FAIL  ' + label); } }

console.log('=== S265 ES-5 manifest/sidecar drop-state sync (C98 G-PR-C98-3) ===');

var dir = fs.mkdtempSync(path.join(os.tmpdir(), 'es5_sync_'));
// dropped photo sidecar
fs.writeFileSync(path.join(dir, 'a_dropped.meta.json'), JSON.stringify({
  dropped: true, editorialFlag: true, droppedReason: 'jersey-back text after 3 attempts', droppedAfterAttempts: 3,
}));
// live photo sidecar
fs.writeFileSync(path.join(dir, 'b_live.meta.json'), JSON.stringify({ dropped: false }));
// (c_nosidecar intentionally has no sidecar file)

var manifest = { photos: [
  { slug: 'a_dropped', file: 'a_dropped.png' },
  { slug: 'b_live', file: 'b_live.png' },
  { slug: 'c_nosidecar', file: 'c_nosidecar.png', dropped: true },
] };

syncDropStateToManifest(manifest, dir);

var a = manifest.photos[0], b = manifest.photos[1], c = manifest.photos[2];
ok(a.dropped === true && a.editorialFlag === true, 'dropped photo: manifest entry now dropped:true + editorialFlag:true');
ok(a.droppedReason === 'jersey-back text after 3 attempts' && a.droppedAfterAttempts === 3, 'dropped photo: reason + attempt count copied');
ok(b.dropped === false && b.editorialFlag === false, 'live photo: manifest entry explicitly dropped:false');
ok(c.dropped === true, 'missing-sidecar photo: prior manifest state left untouched');

// idempotency — second run yields same result
syncDropStateToManifest(manifest, dir);
ok(manifest.photos[0].dropped === true && manifest.photos[1].dropped === false, 'idempotent on re-run');

fs.rmSync(dir, { recursive: true, force: true });
console.log((fail === 0 ? 'ALL ' + pass + ' ASSERTIONS PASS' : fail + ' FAILURES / ' + pass + ' pass'));
process.exit(fail === 0 ? 0 : 1);

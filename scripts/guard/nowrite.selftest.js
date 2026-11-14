#!/usr/bin/env node
/**
 * scripts/guard/nowrite.selftest.js — proves the write guard refuses what it must and lets reads through.
 * Run: node scripts/guard/nowrite.selftest.js   (exits 1 on any failure; every refused call stops before it leaves)
 */
const { execFileSync } = require('child_process');
const fs = require('fs'), os = require('os'), path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nowrite-selftest-'));
const child = `
const fs=require('fs'),https=require('https'),cp=require('child_process'),path=require('path');
const R=process.env.SELFTEST_ROOT,D=process.env.SELFTEST_DIR;
const out=[];const t=(n,want,f)=>{let got='allowed';try{f();}catch(e){got=/NOWRITE guard blocked/.test(e.message)?'blocked':'error:'+e.message;}out.push([n,want,got]);};
t('append to a live log','blocked',()=>fs.appendFileSync(path.join(R,'logs','zz-selftest.log'),'x'));
t('write a repo file','blocked',()=>fs.writeFileSync(path.join(R,'output','zz-selftest.txt'),'x'));
t('mkdir an existing folder','allowed',()=>fs.mkdirSync(path.join(R,'output'),{recursive:true}));
t('mkdir a new live folder','blocked',()=>fs.mkdirSync(path.join(R,'output','zz-selftest-dir')));
t('write inside the allowed folder','allowed',()=>fs.writeFileSync(path.join(D,'ok.txt'),'x'));
t('open a live file for append','blocked',()=>fs.openSync(path.join(R,'logs','zz-selftest.log'),'a'));
t('open a file for read','allowed',()=>fs.closeSync(fs.openSync(path.join(R,'package.json'),'r')));
t('memory store add','blocked',()=>https.request({hostname:'api.supermemory.ai',path:'/v3/documents',method:'POST'}));
t('sheet append','blocked',()=>https.request({hostname:'sheets.googleapis.com',path:'/v4/spreadsheets/x/values/A1:append',method:'POST'}));
t('sheet update','blocked',()=>https.request({hostname:'sheets.googleapis.com',path:'/v4/spreadsheets/x/values/A1',method:'PUT'}));
t('webhook post','blocked',()=>https.request({hostname:'discord.com',path:'/api/webhooks/x',method:'POST'}));
t('shell command','blocked',()=>cp.execSync('true'));
t('other child process','blocked',()=>cp.execFileSync('touch',[path.join(R,'output','zz-selftest2')]));
console.log(JSON.stringify(out));
`;
const res = execFileSync(process.execPath, ['--require', path.join(__dirname, 'nowrite.js'), '-e', child], {
  env: { ...process.env, NOWRITE_ALLOW: dir, NOWRITE_LOG: path.join(dir, 'guard.log'), SELFTEST_DIR: dir, SELFTEST_ROOT: ROOT, NODE_OPTIONS: '' }, encoding: 'utf8' });
const rows = JSON.parse(res.trim().split('\n').pop());
let bad = 0;
for (const [name, want, got] of rows) { const ok = want === got; if (!ok) bad++; console.log((ok ? 'ok   ' : 'FAIL ') + name + ' -> ' + got + (ok ? '' : ' (wanted ' + want + ')')); }
const leaked = ['logs/zz-selftest.log', 'output/zz-selftest.txt', 'output/zz-selftest-dir', 'output/zz-selftest2'].filter((p) => fs.existsSync(path.join(ROOT, p)));
if (leaked.length) { bad++; console.log('FAIL files appeared: ' + leaked.join(', ')); }
for (const f of ['ok.txt', 'guard.log']) { try { fs.unlinkSync(path.join(dir, f)); } catch (e) {} }   // files only; the empty temp folder is left
console.log(bad ? 'nowrite.selftest: ' + bad + ' FAILED' : 'nowrite.selftest: all ' + rows.length + ' checks passed');
process.exit(bad ? 1 : 0);

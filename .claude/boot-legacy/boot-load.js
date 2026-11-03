#!/usr/bin/env node
// SessionStart hook (builder 2026-11-01): the boot MDs load in full at every boot.
// CLAUDE.md, MEMORY.md and TERMINAL.md (the stubs under .claude/terminals/) go into context as text.
const fs = require('fs');
const ROOT = '/root/GodWorld';

function bootFiles() {
  const f = [ROOT + '/CLAUDE.md', '/root/.claude/projects/-root-GodWorld/memory/MEMORY.md'];
  const tdir = ROOT + '/.claude/terminals';
  for (const d of fs.readdirSync(tdir).sort()) {
    const p = `${tdir}/${d}/TERMINAL.md`;
    if (fs.existsSync(p)) f.push(p);
  }
  return f;
}

let raw = '';
process.stdin.on('data', d => raw += d).on('end', () => {
  const parts = [];
  for (const f of bootFiles()) {
    try { parts.push(`===== BOOT FILE (loaded by hook, read in full): ${f} =====\n${fs.readFileSync(f, 'utf8')}`); }
    catch (e) { parts.push(`===== BOOT FILE UNREADABLE: ${f} (${e.message}) =====`); }
  }
  process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: parts.join('\n\n') } }));
});

#!/usr/bin/env node
// spend-scan — called by spend-guard.sh on every Bash tool call (builder 2026-11-21: "yes add, no call openrouter to
// spend in a cli session either"). Refuses, without Mike's unlock:
//   1. a hand-run of a cron or wake script (scripts/cron-*, *wake*) — dry-run flags included;
//   2. any command that runs code reaching a paid model endpoint: the script it names, anything that script
//      requires (followed file to file), inline node -e / python -c / heredoc code, or curl/wget to the endpoint.
// Reading such a file (cat, grep, sed -n, git) stays free. Crons are not tool calls and never pass through here.
// stdin: the hook payload JSON. exit 0 = allow; exit 3 = refuse, reason on stdout. A crash while a command is
// running code refuses (fail closed); the unlock is the way through.
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = '/root/GodWorld';
const SPEND_RE = /openrouter\.ai|OPENROUTER_API_KEY|api\.anthropic\.com|api\.openai\.com|api\.deepseek\.com|api\.together\.xyz|generativelanguage\.googleapis\.com|api\.x\.ai|api\.groq\.com|api\.mistral\.ai|['"]@anthropic-ai\/sdk['"]|require\(\s*['"]openai['"]\s*\)|from\s+['"]openai['"]|['"]@google\/generative-ai['"]/;
const NAME_RE = /(^|\/)cron-[^\/]*\.(js|mjs|cjs|sh)$|(^|\/)[^\/]*wake[^\/]*\.(js|mjs|cjs|sh)$/i;
const TEST_RE = /\.(test|spec)\.(js|mjs|cjs|ts)$/;
const RUNNERS = new Set(['node', 'nodejs', 'bash', 'sh', 'zsh', 'dash', 'python', 'python3', 'bun', 'deno', 'tsx', 'ts-node', 'npx', 'source', '.']);
const WRAPPERS = new Set(['timeout', 'nohup', 'env', 'sudo', 'time', 'nice', 'xargs', 'exec', 'command', 'setsid', 'stdbuf', 'flock']);
const FETCHERS = new Set(['curl', 'wget', 'http', 'https', 'httpie']);
const SCRIPT_EXT = /\.(js|mjs|cjs|sh|py|ts)$/;
const MAX_FILES = 800;

function refuse(why) { process.stdout.write(why); process.exit(3); }

function resolveFile(p, bases) {
  const cands = [];
  for (const b of bases) {
    const abs = path.isAbsolute(p) ? p : path.resolve(b, p);
    cands.push(abs, abs + '.js', abs + '.mjs', abs + '.cjs', path.join(abs, 'index.js'));
    if (path.isAbsolute(p)) break;
  }
  for (const c of cands) { try { if (fs.statSync(c).isFile()) return c; } catch (e) {} }
  return null;
}

// file -> the files it pulls in (require / import / a shell wrapper's node|bash lines)
function edges(file, text) {
  const out = [];
  const dir = path.dirname(file);
  if (/\.(sh)$/.test(file) || /^#!.*\b(ba|z|da)?sh\b/.test(text.slice(0, 80))) {
    const re = /(?:^|[\s;&|(])(?:node|nodejs|bash|sh|python3?|source|\.)\s+(?:-[^\s]+\s+)*["']?([^\s"';&|)]+\.(?:js|mjs|cjs|sh|py))/g;
    let m; while ((m = re.exec(text))) out.push(m[1].replace(/\$\{?[A-Za-z_]+\}?/g, ROOT));
  } else {
    const re = /(?:require\(\s*|import\(\s*|from\s+|import\s+)["']([^"']+)["']/g;
    let m; while ((m = re.exec(text))) { const s = m[1]; if (s.startsWith('.') || s.startsWith('/')) out.push(s); }
  }
  return out.map((s) => resolveFile(s, [dir, ROOT, path.join(ROOT, 'scripts')])).filter(Boolean);
}

// walk from the roots; the first file holding a paid endpoint ends it
function reach(roots) {
  const seen = new Map(); const q = [];
  for (const r of roots) if (!seen.has(r)) { seen.set(r, null); q.push(r); }
  while (q.length && seen.size <= MAX_FILES) {
    const f = q.shift();
    if (/\/node_modules\//.test(f) || f.startsWith(ROOT + '/.claude/hooks/')) continue; // the guards name the endpoints they block
    let text = ''; try { text = fs.readFileSync(f, 'utf8'); } catch (e) { continue; }
    const hit = text.match(SPEND_RE);
    if (hit) { const chain = []; for (let c = f; c; c = seen.get(c)) chain.unshift(path.relative(ROOT, c)); return { chain, marker: hit[0] }; }
    for (const n of edges(f, text)) if (!seen.has(n)) { seen.set(n, f); q.push(n); }
  }
  return null;
}

function words(seg) { return seg.match(/"[^"]*"|'[^']*'|[^\s]+/g) || []; }
function unq(w) { return w.replace(/^["']|["']$/g, ''); }

function main() {
  let payload = {}; try { payload = JSON.parse(fs.readFileSync(0, 'utf8') || '{}'); } catch (e) { process.exit(0); }
  if (payload.tool_name !== 'Bash') process.exit(0);
  const cmd = String((payload.tool_input && payload.tool_input.command) || '');
  if (!cmd.trim()) process.exit(0);
  const cwd = payload.cwd && typeof payload.cwd === 'string' ? payload.cwd : ROOT;
  let dirNow = cwd;
  const roots = []; let runsCode = false; let inline = false; let fetches = false;
  const segs = cmd.split(/\n|;|&&|\|\||\||\$\(|`/);
  for (let seg of segs) {
    const ws = words(seg.trim().replace(/^[({\s]+/, ''));
    let i = 0;
    while (i < ws.length && /^[A-Za-z_][A-Za-z0-9_]*=/.test(ws[i])) i++;                 // VAR=x prefixes
    if (ws[i] === 'cd' && ws[i + 1]) { dirNow = path.resolve(dirNow, unq(ws[i + 1])); continue; }
    while (i < ws.length && WRAPPERS.has(path.basename(unq(ws[i])))) {                    // timeout 30 node x.js
      i++; while (i < ws.length && (/^-/.test(ws[i]) || /^\d+[smhd]?$/.test(ws[i]) || /^[A-Za-z_][A-Za-z0-9_]*=/.test(ws[i]))) i++;
    }
    if (i >= ws.length) continue;
    const head = unq(ws[i]); const base = path.basename(head);
    if (FETCHERS.has(base)) { fetches = true; continue; }
    if (RUNNERS.has(base)) {
      const rest = ws.slice(i + 1);
      if (/^node(js)?$/.test(base) && rest.includes('--check')) continue;                  // a syntax check runs nothing
      runsCode = true;
      if (rest.some((w) => /^(-e|--eval|-p|--print|-c)$/.test(w)) || /<<-?\s*['"]?\w+/.test(seg)) inline = true;
      const first = rest.find((w) => !/^-/.test(w));
      for (const w of rest) { const u = unq(w); if (SCRIPT_EXT.test(u)) { const f = resolveFile(u, [dirNow, ROOT]); if (f) roots.push(f); else if (NAME_RE.test(u)) roots.push(u); } }
      if (first && !SCRIPT_EXT.test(unq(first))) { const f = resolveFile(unq(first), [dirNow, ROOT]); if (f && !fs.statSync(f).isDirectory()) roots.push(f); }
    } else if (SCRIPT_EXT.test(head) || /^\.{1,2}\//.test(head)) {
      const f = resolveFile(head, [dirNow, ROOT]);
      if (f) { runsCode = true; roots.push(f); }
    }
  }
  if (!runsCode && !fetches) process.exit(0);                                              // cat / grep / git / sed: free
  if (fetches && SPEND_RE.test(cmd)) refuse('this command calls a paid model endpoint (' + cmd.match(SPEND_RE)[0] + ').');
  if (!runsCode) process.exit(0);
  // code written into the command itself (node -e, python -c, heredoc, a file written then run)
  if (inline || /<<-?\s*['"]?\w+/.test(cmd)) {
    if (SPEND_RE.test(cmd)) refuse('this command runs inline code that calls a paid model endpoint (' + cmd.match(SPEND_RE)[0] + ').');
    const re = /(?:require\(\s*|import\(\s*|from\s+)\\?["']([^"'\\]+)\\?["']/g; let m;
    while ((m = re.exec(cmd))) { const s = m[1]; if (s.startsWith('.') || s.startsWith('/')) { const f = resolveFile(s, [dirNow, ROOT]); if (f) roots.push(f); } }
  }
  for (const r of roots) {
    const rel = path.isAbsolute(r) ? path.relative(ROOT, r) : r;
    if (NAME_RE.test(rel) && !TEST_RE.test(rel)) refuse("'" + rel + "' is a cron or wake script; a hand-run in a session is refused (dry-run included).");
  }
  const hit = reach(roots.filter((r) => path.isAbsolute(r)));
  if (hit) refuse('this command runs code that reaches a paid model endpoint (' + hit.marker + '): ' + hit.chain.join(' -> ') + '.');
  process.exit(0);
}
try { main(); } catch (e) { refuse('spend-scan could not read this command (' + (e && e.message) + '); refused rather than guessed.'); }

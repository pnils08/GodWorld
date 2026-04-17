#!/usr/bin/env node
// S154 OpenRouter migration test — runs the existing business-desk prompt
// + an existing briefing through DeepSeek V3 via OpenRouter, saves output
// for side-by-side comparison with the Claude-produced equivalent.
//
// Usage: node scripts/testOpenRouterDesk.js [desk] [cycle]
// Defaults: desk=business, cycle=88 (most recent paired briefing+output).

require('/root/GodWorld/lib/env');
const fs = require('fs');
const path = require('path');

const DESK = process.argv[2] || 'business';
const CYCLE = process.argv[3] || '88';
const MODEL = process.env.OPENROUTER_MODEL || 'moonshotai/kimi-k2-0905';

const ROOT = path.resolve(__dirname, '..');
const AGENT_DIR = path.join(ROOT, '.claude', 'agents', `${DESK}-desk`);
const BRIEFING = path.join(ROOT, 'output', 'desk-briefings', `${DESK}_briefing_c${CYCLE}.md`);
const ARCHIVE = path.join(ROOT, 'output', 'desk-briefings', `${DESK}_archive_c${CYCLE}.md`);
const CLAUDE_OUT = path.join(ROOT, 'output', 'desk-output', `${DESK}_c${CYCLE}.md`);
const DEEPSEEK_OUT = path.join(ROOT, 'output', 'desk-output', `${DESK}_c${CYCLE}_deepseek.md`);

if (!process.env.OPENROUTER_API_KEY) {
  console.error('OPENROUTER_API_KEY missing from .env');
  process.exit(1);
}

const read = (f) => { try { return fs.readFileSync(f, 'utf8'); } catch { return null; } };

const identity = read(path.join(AGENT_DIR, 'IDENTITY.md')) || '';
const skill = read(path.join(AGENT_DIR, 'SKILL.md')) || '';
const rules = read(path.join(AGENT_DIR, 'RULES.md')) || '';
const systemPrompt = [identity, skill, rules].filter(Boolean).join('\n\n---\n\n');

const briefing = read(BRIEFING);
const archive = read(ARCHIVE);
if (!briefing) { console.error(`Briefing not found: ${BRIEFING}`); process.exit(1); }

const userMessage = archive
  ? `# Briefing\n\n${briefing}\n\n# Archive context\n\n${archive}`
  : briefing;

console.log(`desk=${DESK} cycle=c${CYCLE} model=${MODEL}`);
console.log(`system prompt: ${systemPrompt.length} chars`);
console.log(`user message: ${userMessage.length} chars`);
console.log(`claude reference output: ${fs.existsSync(CLAUDE_OUT) ? CLAUDE_OUT : 'none — single-model run'}`);
console.log(`will save deepseek output to: ${DEEPSEEK_OUT}`);
console.log('');

(async () => {
  const start = Date.now();
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://godworld.local',
      'X-Title': 'GodWorld desk migration test',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 4000,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
    }),
  });

  if (!res.ok) {
    console.error(`OpenRouter error ${res.status}: ${await res.text()}`);
    process.exit(1);
  }

  const data = await res.json();
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  const output = data.choices?.[0]?.message?.content || '';
  const usage = data.usage || {};

  fs.writeFileSync(DEEPSEEK_OUT, output);
  console.log(`wrote ${DEEPSEEK_OUT}`);
  console.log(`runtime: ${elapsed}s`);
  console.log(`input tokens: ${usage.prompt_tokens ?? '?'}`);
  console.log(`output tokens: ${usage.completion_tokens ?? '?'}`);
  console.log(`total tokens: ${usage.total_tokens ?? '?'}`);
  if (fs.existsSync(CLAUDE_OUT)) {
    console.log('');
    console.log(`compare:  diff ${CLAUDE_OUT} ${DEEPSEEK_OUT}`);
  }
})().catch((err) => { console.error('failed:', err); process.exit(1); });

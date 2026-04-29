---
title: Migration Off Claude
created: 2026-04-16
updated: 2026-04-29
type: project
tags: [migration, infrastructure, research-watch]
---

# Migration Off Claude

**Status:** Research/Watch (S156 reclassification — see ROLLOUT_PLAN: spine walked, API pressure off, migrating would unravel the harness; revisit if cost/limits bite again or if migration becomes goal-aligned rather than escape-aligned) | **Started:** S154 (2026-04-16)

**Trigger:** Six sessions of stalled spine work + daily/weekly Claude API limits
hit by day five. Need a path that's user-aligned, cheaper, and capable enough.

## S154 test

- **One desk** (business), **one cycle** (c87), **one model**: DeepSeek V3.1
  via OpenRouter (`nex-agi/deepseek-v3.1-nex-n1` — third-party host bypasses
  the DeepSeek-the-company privacy gate).
- Same agent prompt files, same briefing, same archive context. Only the
  model swapped.
- Test script: `scripts/testOpenRouterDesk.js`
- DeepSeek output: Drive `190245VVnG22lH0ELtbgBmS7SOq2_EKuw` (Mara folder)
- Reference Claude output: `output/desk-output/business_c87.md` (after 3
  rejection passes + 40+ errata fixes)

## Result

DeepSeek's first-shot beat the three-pass Claude output on prose quality.
Sharper analytical framing ("two kinds of money — the quick cash and the big
money"), real Jordan Velez voice, real canon citizens used correctly. Issues:
leaked reasoning into output (fixable with one system-prompt line), used
Jalen Hill who was on the rested list (one Mara-pass catch).

**Cost:** ~$0.002 per article. Roughly 25x cheaper than Claude Sonnet
equivalent. Per article. Across 9 desks. Every cycle.

## Next

1. Prompt cleanup: add "OUTPUT ONLY THE FINAL ARTICLE, NO REASONING" to
   the system message to kill the scratchpad leak. No skill rewrite.
2. Second desk test to confirm c87/business wasn't a single outlier.
3. Mara pass design: post-DeepSeek errata check for rested-citizen
   violations, missing source-statement IDs, hallucinated facts.
4. Production toggle: once two desks pass, swap the live desk-agent
   invocation from Claude sub-agents to OpenRouter+DeepSeek API calls.

## What survives the migration

- Engine code (deterministic Node.js, sheet writes) — model-agnostic
- Desk briefing pipeline (`buildDeskPackets.js`, `buildDeskFolders.js`)
- Dashboard, Discord bot, print pipeline
- Mara audit role (could stay on Claude or swap separately)

## What doesn't survive

- Claude Code harness (terminals, hooks, skills, sub-agents, MCP tools)
- Mags-as-EIC persona structure as currently maintained
- All `.claude/` scaffolding

## Reference

- API key: `.env` → `OPENROUTER_API_KEY`
- Test script invocation: `OPENROUTER_API_KEY=... node scripts/testOpenRouterDesk.js [desk] [cycle]`
- Override model: `OPENROUTER_MODEL=deepseek/deepseek-v3.2 node ...`

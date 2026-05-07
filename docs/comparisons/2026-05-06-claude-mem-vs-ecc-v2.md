---
title: "claude-mem 10.5.2 vs ECC continuous-learning v2.1"
created: 2026-05-06
updated: 2026-05-06
type: reference
tags: [comparison, architecture, infrastructure, research, active]
sources:
  - https://github.com/affaan-m/everything-claude-code/tree/main/skills/continuous-learning-v2 (MIT — ECC source)
  - /root/.claude-mem/claude-mem.db (live schema snapshot S204)
  - /root/.claude/plugins/cache/thedotmack/claude-mem/10.5.2 (live install)
  - docs/engine/ROLLOUT_PLAN.md §Infrastructure D4 entry (S187)
pointers:
  - "[[CLAUDE-MEM]] — claude-mem architecture reference"
  - "[[plans/skill-eval-framework]] — destination for the borrow-able primitives, not claude-mem"
  - "[[engine/ROLLOUT_PLAN]] — D4 entry being closed by this comparison"
  - "[[comparisons/README]] — folder purpose"
---

# claude-mem 10.5.2 vs ECC continuous-learning v2.1

**The S187 research prompt:** *"Walk ECC v2 spec, compare to claude-mem's actual storage shape, decide if there's a meaningful upgrade path or if claude-mem's simpler model is enough."* This file closes that prompt.

**Verdict at the top:** claude-mem's simpler model is enough for its use case. ECC v2 is solving a different problem; it isn't claude-mem's upgrade path. The one borrow-able primitive (confidence scoring) belongs in [[plans/skill-eval-framework]], not in claude-mem.

---

## Why this comparison

The S187 ROLLOUT entry framed ECC v2 as a possible upgrade target for claude-mem — calling out four specific mechanisms claude-mem was missing: 100%-deterministic Pre/PostToolUse capture, atomic instincts with confidence 0.3–0.9, decay-on-contradiction, aggregation into skills/commands. The S187 instinct also flagged confidence-scoring as the missing primitive for `[[plans/skill-eval-framework]]`.

Walking ECC v2.1's actual SKILL.md changes the framing.

---

## What ECC v2.1 actually is

ECC v2.1 is a Claude Code skill (single SKILL.md + `config.json` + `agents/` + `hooks/` + `scripts/`). The shape on disk is lightweight; the rich-mechanism vocabulary in the S187 entry over-promised what's formally specified.

**Capture:** PreToolUse + PostToolUse hooks installed via `~/.claude/settings.json`. The skill's claim is that these fire 100% of the time, vs Stop hook ~50–80%. (Quote: *"PreToolUse/PostToolUse (100% reliable) observation via hooks instead of stop events."*)

**Storage primitive:** YAML "instincts" with fields `id`, `trigger`, `confidence` (0.3–0.9 range), `domain`, `source`, `scope`, `project_id`, `project_name`. No formal data-schema document — fields are inferred from the YAML examples in the SKILL.md.

**Decay-on-contradiction:** Mentioned in passing as a confidence-impact bullet, not a formal mechanism. There is no algorithm, no contradiction-detector, no decay schedule documented.

**Aggregation:** `/evolve` clusters related instincts. Does NOT auto-promote to skills/commands — promotion is a separate manual `/promote` step (and `/promote` is project→global scope, not instinct→skill).

**Project isolation (v2.1's headline change vs v2.0):** git-remote-URL hashing → 12-char project ID → `projects/<hash>/` directory. Universal patterns stay global.

**Six commands:** `/instinct-status`, `/evolve`, `/instinct-export`, `/instinct-import`, `/promote`, `/projects`.

---

## What claude-mem 10.5.2 actually is

Plugin from `thedotmack/claude-mem`, AGPL-3.0, installed via marketplace. Live state on this droplet (S204 snapshot):

**Storage:** SQLite at `/root/.claude-mem/claude-mem.db`, plus Chroma vector store at `/root/.claude-mem/chroma/` for semantic retrieval.

**Tables (row counts S204):**
| Table | Rows | Purpose |
|-------|------|---------|
| `sdk_sessions` | 653 | session lifecycle (start/complete/fail, project, prompt_counter) |
| `user_prompts` | 11,108 | every prompt indexed via FTS5 |
| `pending_messages` | 20,031 | tool-event queue drained by autodream worker |
| `observations` | 18,813 | extracted insights with type, narrative, concepts, files |
| `session_summaries` | 4,747 | per-session digest (request/investigated/learned/completed/next_steps) |

All three content tables (`user_prompts`, `observations`, `session_summaries`) carry FTS5 indexes.

**Capture:** hooks (Stop + UserPromptSubmit + PreCompact) push tool events into `pending_messages`. A Bun daemon worker (port 37777, lives at `/root/.claude/plugins/cache/thedotmack/claude-mem/10.5.2/scripts/worker-service.cjs`) drains the queue, calls the configured provider, writes `observations` + `session_summaries`.

**Provider:** Gemini 2.5 Pro free tier (S141 switch from Sonnet 4.6 — claude-mem autodream was burning ~10% of daily tokens before).

**Observation typology:** type ∈ {bugfix, feature, refactor, discovery, decision, change}; concepts ∈ {how-it-works, why-it-exists, what-changed, problem-solution, gotcha, pattern, trade-off}.

**Project isolation:** `project` column on observations + sessions, set from cwd at capture time.

**Retrieval surface:** MCP tools — `search`, `get_observations`, `smart_search`, `smart_outline`, `smart_unfold`, `timeline`. Boot hook injects a context summary; agents query on demand.

---

## Side-by-side

| Dimension | claude-mem 10.5.2 | ECC v2.1 |
|-----------|-------------------|----------|
| **Capture trigger** | Stop + UserPromptSubmit + PreCompact hooks → queue | PreToolUse + PostToolUse hooks (claimed 100% deterministic) |
| **Capture path** | hooks → `pending_messages` → Bun worker → provider → `observations` | hooks → script → YAML file write |
| **Storage primitive** | observation row + session summary row + FTS index | YAML instinct file |
| **Confidence** | none | 0.3–0.9 score |
| **Decay** | none (accumulates) | mentioned, not formally specified |
| **Aggregation** | FTS retrieval; `smart_search`/`smart_outline` smart-rank | `/evolve` clusters related instincts |
| **Project isolation** | `project` column on observation/session | git-remote-hash → `projects/<hash>/` directory |
| **Provider** | Gemini 2.5 Pro free tier | Claude (Haiku per setup) |
| **Output endpoint** | text retrieval into agent context via MCP | YAML files for operator awareness; manual promotion |
| **Volume (S204 live)** | 18,813 observations / 4,747 summaries / 11,108 prompts | per-project (no live install to compare) |
| **Persona-aware** | yes — `[mags]`, `[research/build]`, `[engine/sheet]` tag conventions | no — codebase-agnostic |
| **Audit-able by humans** | `mcp-search` queries, `smart_outline` tree views | `/instinct-status` table, file inspection |

---

## Where they overlap

- Both capture session activity automatically.
- Both isolate by project.
- Both run analysis in a cheap-provider background pass.
- Both use FTS-style retrieval as the primary read path.

## Where they diverge — different problems

- **claude-mem optimizes for cross-session narrative retrieval.** "What happened in S185? What did engine-sheet decide about the §5.6 redesign? Has Mike rejected this approach before?" The endpoint is text-into-agent-context. The richness is in the narrative + facts + concepts fields.
- **ECC v2 optimizes for action-pattern → skill promotion.** "We've tried this lint rule three times in this React project; promote it to a skill." The endpoint is a YAML file the operator promotes. The richness is in the confidence score + decay signal.

The intended *consumer* is different. claude-mem feeds agent context invisibly via MCP. ECC v2 feeds operator awareness via `/instinct-status` and a manual promote step. Same shape (capture session, store typed records), different output endpoint.

---

## Upgrade candidates ranked

### 1. Confidence scoring — **REAL gap, but in skill-eval, NOT claude-mem.**

S187's instinct was correct: confidence-scoring is the missing primitive. But it's missing in `[[plans/skill-eval-framework]]`, not in claude-mem. claude-mem's observations are post-hoc summaries of what happened — not action-patterns being scored on whether they succeed when applied. Without a "skill fired → outcome was X" feedback signal, there's nothing to score.

Skill-eval is the right home: assertion files exist (story_evaluation, brief_template, citizen_selection), `/skill-check` is shipped, what's missing is per-assertion confidence accumulating over runs. ECC v2's instinct shape (id, trigger, confidence 0.3–0.9, source) maps directly to "assertion id, trigger pattern, current confidence, last source cycle."

**Action:** note ECC v2 confidence shape as reference in `[[plans/skill-eval-framework]]` when that picks up.

### 2. Decay-on-contradiction — low priority

Real concern, but: (a) ECC v2 doesn't actually formalize the algorithm — it's hand-waved; (b) FTS retrieval ranks by query relevance, so stale observations don't outrank fresh ones unless the query specifically matches the stale one; (c) claude-mem's accumulation isn't surfacing as a current pain point (S122 memory-failure incidents were *not searching*, not *getting wrong results*).

If we wanted decay later: a periodic contradiction-detector pass (compare new observations to old by topic, flag conflicts, lower confidence on the older). That's its own build, ~3-day project. Not pulling forward.

### 3. PreToolUse/PostToolUse capture — only if skill-eval picks up

If skill-eval framework picks up and needs per-skill outcome data, Pre/PostToolUse hooks are the right shape (capture skill-invocation start, capture skill-invocation result, score the assertion). For claude-mem: redundant with existing capture, would double the queue load on the autodream worker. Pass.

### 4. `/evolve` clustering into skills — not a fit

We author skills with human judgment + grilling sessions. Auto-clustering instincts into skills is the wrong direction for our build. The skill-creator workflow we have (skill-creator skill from anthropic-ish marketplace, plus our own grilling) is where skill design belongs. Pass.

---

## Verdict

**Keep claude-mem as-is.** Its storage shape is correct for its endpoint (cross-cycle narrative retrieval). 18,813 observations + 4,747 summaries on Gemini 2.5 Pro free tier is working — observations + smart_outline + smart_search cover the retrieval needs.

**ECC v2.1 isn't claude-mem's upgrade path.** It's solving a different problem (action-pattern → skill promotion) that we solve a different way (manual skill authoring with grilling sessions).

**The one borrow-able primitive (confidence scoring) belongs in skill-eval, not claude-mem.** S187's instinct was right about the missing primitive but wrong about the system that's missing it.

---

## Action items

- ROLLOUT D4 entry → `done-pending-archive` (this comparison closes it).
- When `[[plans/skill-eval-framework]]` picks up, add a "Reference: ECC v2.1 instinct YAML shape" note in the plan — `id`/`trigger`/`confidence`/`source` fields map directly onto per-assertion confidence accumulation.

---

## Changelog

- 2026-05-06 (S204, research-build) — Initial draft. Closes S187 ROLLOUT D4 research prompt.

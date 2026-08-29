---
title: Boot-Doc Consolidation — rule-only boot docs under a size ceiling, memory dedup
created: 2026-08-29
updated: 2026-08-29
type: plan
tags: [governance, boot, memory, active]
sources:
  - Builder direction 2026-08-29 (engine-sheet session, tree-clean handoff) — captured the turn it was said
  - claude-mem S14564–S14587 (2026-08-28 boot-doc cleanup session, ended early; edits deferred)
  - docs/engine/ROLLOUT_PLAN.md governance.51
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — parent rollout (governance.51)"
  - "[[../adr/0018-ai-to-ai-doc-register]] — Tier A/B register the rewritten docs must keep"
  - "[[../../.claude/hooks/boot-doc-guard.sh]] — the behaviour gate on these files (unlock: `touch .claude/.boot-doc-unlock`)"
  - "[[index]] — registered here, same commit"
---

# Boot-Doc Consolidation

## Direction (builder, 2026-08-29 — the why, protected)

Boot docs are not being gated for **access**; they are gated for **behaviour**. The behaviour: a session finds a rule that changed, leaves the old rule in place, and appends a change-log paragraph stating the new one — with a session number. Over many sessions the file becomes a stack of notes nobody removes. The same habit is why ROLLOUT rows, plan change-logs and SESSION_CONTEXT are gated. A lesson learned in context very rarely outweighs a new session simply knowing what the current rule **is**.

Boot docs must be **wham-bam**: read once, know the job. Each one carries only what every session needs, and the whole boot load must stay under the size the harness will actually read (MEMORY.md is already truncated past 200 lines; the builder cites an Anthropic-stated ceiling for CLAUDE.md-class files — confirm the number from the Claude Code docs before setting the budget, do not guess it).

Boot docs may be **self-evolving** for the terminal's growth — but evolving means *replace the rule*, never *stack a note on the rule*.

## What a boot doc contains (the builder's list)

1. What the project is.
2. The persona the builder prefers to work with.
3. The connective tissue in the sim — Mike Paulson and Mags Corliss.
4. The key memories every session needs.
5. Measure twice, pay once.
6. The senior-engineer approach to this codebase: responsible for everything being wired; engine-sheet is the only terminal that deploys and every other lane adheres to that.
7. The tools — the searches (GodWorld MCP → claude-mem → Supermemory), claude-mem always saving, key memories saved to the shared brain (`sl-godworld`).

Nothing else. Rules, identity, terminal files must not state the same thing multiple ways.

## Measured state at capture (2026-08-29)

| File | Bytes |
|---|---|
| `CLAUDE.md` | 6,357 |
| `.claude/rules/identity.md` | 3,155 |
| `.claude/rules/engine.md` | 24,785 |
| `.claude/terminals/engine-sheet/TERMINAL.md` | 18,057 |
| `memory/MEMORY.md` | 21,193 (harness truncates past 200 lines) |
| **Boot load, engine-sheet** | **73,547** |
| `memory/*.md` files | 121 |

`engine.md` and `TERMINAL.md` are the two that grew by the stacking habit (the write-intents exceptions list alone is ~40 lines of per-file session archaeology; TERMINAL.md carries S165/S218/S250/S282/S329 provenance paragraphs for rules that could each be one line).

## Tasks

| # | Task | Owner | Status |
|---|---|---|---|
| T1 | Confirm the harness size ceiling for CLAUDE.md-class files from the Claude Code docs (`claude-code-guide` agent). Set the per-file and total budget from that number. **Confirmed 2026-08-29** (code.claude.com/docs/en/memory): MEMORY.md loads "the first 200 lines … or the first 25KB, whichever comes first"; CLAUDE.md "target under 200 lines … longer files consume more context and reduce adherence"; 4 MiB hard skip; `.claude/rules/*.md` has no separate documented limit. **Budget set:** every boot file ≤200 lines and ≤25KB; engine-sheet total boot load (CLAUDE.md + identity.md + engine.md + TERMINAL.md + MEMORY.md) target ≤40KB. | engine-sheet | done |
| T2 | Rewrite each boot doc to rule-only, current-rule-only, against the 7-item list above. Provenance (session numbers, "supersedes S…", why-paragraphs) moves out: engine truth → the `docs/engine/` file that owns it; session record → claude-mem; anything else → deleted. Each file is one commit, `CLAUDE_CTL=1`, unlocked by the builder (`touch .claude/.boot-doc-unlock`) per file. **Landed 2026-08-29:** engine.md 25.2→4.9KB (c3b58c06), TERMINAL.md 18.1→5.0KB (49c7b6e8), identity.md deduped + T4 line. CLAUDE.md unchanged by design (builder's own text, already rule-shaped). Engine-sheet boot load 73.5→~40.5KB; the remainder is MEMORY.md (T3). | engine-sheet | done |
| T3 | Memory consolidation — **batch candidate** (`/batch`, 50% off). For all 121 `memory/*.md`: cluster duplicates / near-duplicates / superseded facts; propose merge-or-delete per file; MEMORY.md index rebuilt to fit the 200-line read window with substance on the line, not just links. Builder reviews the proposal before any delete. **Submitted 2026-08-29** via OpenRouter batch (the Anthropic batch path bills API credits, now exhausted; it never ran on the subscription): `node scripts/orBatch.js status batch-1787993745-Cj7RIFVUfwQD7z5thsYj`, then `fetch` → `output/or-batch_<id>.md` is the proposal for builder review. Sonnet 5 at the 50% batch rate, 24h window. | engine-sheet → batch | submitted |
| T4 | Standing rule for every lane: **check before adding a memory** — search MEMORY.md + `memory/` for the fact first; update the existing file or do nothing. Lands as one line in the rewritten identity/CLAUDE.md, not as a new memory file. **Landed** in identity.md §Accuracy (ba53d143). | engine-sheet | done |
| T5 | Re-check the boot-doc-guard after T2: the gate stays (behaviour gate), but the message and the unlock flow should match the rewritten docs. **Checked 2026-08-29:** message still true (session record → claude-mem, work → git, engine truth → owning doc); unlock flow unchanged. One friction, left as-is: the Bash branch flags any write-shaped command whose *text* names a boot doc (heredoc bodies, commit messages with `->`), not just the write target. Workaround: route content through a scratchpad file, commit with `-F`. | engine-sheet | done |
| T6 | **The Mags brain is one container, and every lane knows it.** Builder direction 2026-08-29: name the container in AGENTS.md and in both terminals' boot docs (engine-sheet + research-build) as item 7 of the list above, with the behaviour: every session makes a *deliberate* save there about what it did, so a later session can be handed what it needs on demand. Measured 2026-08-29 — today it is three names, not one: lanes hand-write `sl-godworld`; `sessionSummaryToSupermemory.js` auto-mirrors to `session-logs`; `mags-discord-bot.js` RAG reads `world-data` + `bay-tribune` (L322) and `mags` (L337/396) and never `sl-godworld`. **Decided 2026-08-29 (builder):** the CLI brain is `sl-godworld` — every CLI lane saves and searches there. `world-data` / `bay-tribune` / `mags` are world-canon containers read by the Discord bot; no CLI touches them except to repair them — they are not brains and are not repointed. `session-logs` stays as-is: it is the zero-LLM auto-mirror of each session's claude-mem summary, run by `sessionEndMechanical.js` at every close (verified live — results exist); it is history, not the brain. Boot-doc line: "brain = `sl-godworld`". | engine-sheet | decided |
| T7 | **One search that hits both memories.** A single script (`scripts/brainSearch.js` or a `/brain` skill) that queries claude-mem and the T6 container in one call and returns merged, dated, source-labelled hits. Becomes the boot-order search in CLAUDE.md ("GodWorld MCP → brain → …") so persistence is on demand rather than boot-loaded. Behaviour rule alongside it: search the brain before asserting what a prior session decided. **Script landed 2026-08-29:** `node scripts/brainSearch.js "<query>" [--limit N] [--days D] [--json]` — claude-mem via FTS5 direct on the sqlite DB (no worker), `sl-godworld` via the supermemory CLI, one list newest-first with a pointer per hit (`get_observations([id])` / container id). CLAUDE.md search-order paragraph landed same day (builder-unlocked). | engine-sheet | done |

## Acceptance

- Every boot doc reads as current rules only; no session numbers, no change-log paragraphs, no "supersedes" text.
- Boot load for each terminal is under the confirmed ceiling; MEMORY.md is under 200 lines with no truncation.
- No two boot files state the same rule.
- Memory file count materially reduced, with a builder-reviewed delete list — never an unreviewed sweep.

## Changelog

- 2026-08-29 (engine-sheet) — Created from builder direction during the tree-clean session; governance.51 row opened.
- 2026-08-29 (engine-sheet) — T1 done; T2 prep landed (carve-outs → SHEETS_MANIFEST §9), drafts await unlock; T3 rerouted to OpenRouter batch (`scripts/orBatch.js`), packet submitted; T6 decided (`sl-godworld`).

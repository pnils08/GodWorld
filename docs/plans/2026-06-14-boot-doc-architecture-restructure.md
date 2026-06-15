---
title: Boot Doc Architecture Restructure — base / worker / on-demand + self-evolve
created: 2026-06-14
updated: 2026-06-14
type: plan
tags: [architecture, infrastructure, boot-arch, governance, draft]
sources:
  - "[[2026-05-09-boot-load-audit]] — the S210 data dump this builds on (duplication + bleed maps, what each file carries)"
  - "[[../research/2026-06-04-boot-orientation-cleanup]] — S252 direction (governing-core-in-CLAUDE.md; reverses governance.5)"
  - "[[../research/2026-06-05-anthropic-skills-blog]] — passive boot-pointers fail; triggered-skill pointers work; skill-local gotchas"
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — governance.36 (this); absorbs governance.32 (MEMORY.md split); siblings governance.26 + governance.35"
  - "[[../adr/0009-session-context-on-demand]] — the precedent (SESSION_CONTEXT already de-auto-loaded)"
  - "[[../index]] — registered same commit"
  - "../../docs/archive/CLAUDE_pointer-only_governance5_2026-06-14_archive.md — the old pointer-only CLAUDE.md, preserved"
---

# Boot Doc Architecture Restructure

**Goal:** Restructure the always-load boot stack into three clean layers — **base** (CLAUDE.md, grounding), **worker** (per-terminal TERMINAL.md, the job), **on-demand** (MEMORY / ROLLOUT / SESSION_CONTEXT, available but not auto-loaded) — plus a **self-evolve** mechanism so a terminal can write a learned gotcha to a home its next instance loads. Reverses governance.5 (CLAUDE.md pointer-only) for the governing-core content. Mike-directed S259.

**Status: DESIGN. Nothing deployed.** The grounded CLAUDE.md is written to the working tree as a worked draft but the commit is **held**; no commit ships until this plan is settled + sequenced.

---

## The empirical finding that drives it

At S259 boot, research-build followed **zero** of CLAUDE.md's outbound pointers (BOOT_ARCHITECTURE, SUPERMEMORY, CANON_RULES, CONTEXT, PRODUCT_VISION, GodWorld_My_Oakland, the ADRs). The boot sequence was driven entirely by the SessionStart hook's injected reads, not by CLAUDE.md. The pointers were inert.

Corroborates the S252 research: **passive boot-pointers fail; the model honors CLAUDE.md itself but skips what it points to.** So the fix is not a better pointer — it's putting the grounding *in* the one file that's auto-loaded and actually read.

**Change vs add (the mechanism, exactly):** CLAUDE.md was *already* auto-loaded every boot. We are not adding a load mechanism — we are **changing the body** of an already-loaded file from pointers-away to grounding-in-place. The grounding now rides the guaranteed-read surface. Zero new boot cost; the de-auto-loads below *reduce* cost.

---

## The three layers

| Layer | File(s) | Loads | Carries |
|-------|---------|-------|---------|
| **Base** | `CLAUDE.md` + `.claude/rules/identity.md` | auto (every terminal, every boot) | Grounding (what this is / who we are) + behavioral non-negotiables. No work-logic. Hands off to the worker. |
| **Worker** | `.claude/terminals/<t>/TERMINAL.md` | hook-injected per terminal | The terminal's job, scope, turf — and the content the base sheds that *only that terminal* needs (e.g. canon facts → media/civic). |
| **On-demand** | `MEMORY.md`, `ROLLOUT_PLAN.md`, `SESSION_CONTEXT.md`, `CONTEXT.md`, `SUPERMEMORY.md`, `CANON_RULES.md`, … | pulled when needed | Reference + working state + feedback corpus. Available, not auto-loaded. |

**Auto-load reality check (don't re-plan what's already done):**
- `SESSION_CONTEXT.md` — already on-demand (ADR-0009, governance.26).
- `ROLLOUT_PLAN.md` — never auto-loaded.
- `MEMORY.md` — **currently auto-loads, ~5,860 tokens, every boot, every terminal.** This is *the* de-auto-load change in this plan. Redistribute: project-grounding facts → CLAUDE.md (done in the draft); role/terminal-specific rules → that TERMINAL.md; skill-specific gotchas → the skill (per anthropic-skills-blog); non-critical → drop. Absorbs **governance.32**.

---

## Worked example — the grounded CLAUDE.md (base layer)

Six grounded sections, no pointer-dump: **The project** / **The handle** (Mags as communication tool) / **The partnership** (Mike is a vibe coder learning; "approved" = trust not sign-off) / **Where you boot** (handoff only — work-logic to be trimmed per Mike S259) / **Search before you guess** / reserved notes-doc line. Behavioral non-negotiables stay in `identity.md` (the seam: this file = what/who, identity.md = how you act).

Draft lives in the working tree (`/root/GodWorld/CLAUDE.md`, uncommitted). Old pointer-only version preserved at `docs/archive/CLAUDE_pointer-only_governance5_2026-06-14_archive.md`.

---

## The cascade — and the orphan-gap constraint

**Do not strip the base before the worker layer catches the content** — top-down stripping orphans content that's loaded nowhere. Concretely: the grounded CLAUDE.md drops the **canon facts** (Mayor Santana she/her, OPP not "People's Party," CRC, IND, population ~1,366) and the **operating-loop pointer** (GodWorld_My_Oakland before any cycle run). Those exist to stop **media/civic** drifting; their TERMINAL.md does not carry them today, and MEMORY.md doesn't either. So:

**Sequence bottom-up:**
1. Worker layers (media/civic TERMINAL.md) absorb the content the base sheds (canon facts, cycle-loop pointer) — *before* the lean base ships to those terminals.
2. MEMORY.md redistribution (governance.32) — split feedback-rules-universal from project-state-and-role-specific; move the latter to TERMINAL.md / skills; de-auto-load the remainder.
3. Base CLAUDE.md deploy (commit the grounded file + archive) only once 1–2 leave nothing orphaned.
4. Self-evolve mechanism (below) — the actual point.

Engine-sheet / research-build can run on the lean base now (they don't generate canon content). media/civic are gated on step 1.

---

## Open questions (this is the editable part)

1. **The seam.** "CLAUDE.md = what/who, identity.md = how you act" is fuzzy at the partnership line (it's behavioral). Does partnership-behavior consolidate to one side, or do we accept a soft boundary? Risk: re-create the CLAUDE.md-duplicates-identity.md problem the audit flagged.
2. **The self-evolve mechanism (the unsolved 80%).** Where does a terminal's learned gotcha land so the next instance loads it? Candidates: a per-terminal notes doc loaded by the worker layer; skill-local gotchas (anthropic-skills-blog pattern); both. Reconcile with existing half-precedents: media JOURNAL, `NOTES_TO_SELF.md`, vestigial per-agent `agent-memory/MEMORY.md` scratchpads. This is what the S259 query-guess proved missing.
3. **What exactly de-auto-loads from MEMORY.md**, and what stays universal (the feedback-discipline core). Needs the per-entry pass governance.32 scoped.
4. **Work-logic trim** of CLAUDE.md "Where you boot" — reduce to the handoff fact per Mike S259.
5. **Validation — how do we know it worked?** Only real test is a fresh boot acting more grounded / guessing less / less trust-friction. Define the success signal before deploying; a prior CLAUDE.md rewrite was reverted (no approval — closed; this one is Mike-directed).

---

## Absorbs / siblings

- **Absorbs governance.32** (MEMORY.md role-scoped split) — becomes step 2 of this cascade.
- **Sibling governance.26** (SESSION_CONTEXT on-demand — the precedent; ADR-0009) + **governance.35** (SESSION_CONTEXT header mechanization).
- Builds on the **boot-load-audit** (don't redo the duplication/bleed maps — they're the substrate).

---

## Changelog

- 2026-06-14 (S259, research-build) — Plan opened as the editable container per Mike "plan, not deploy." Grounded CLAUDE.md written to working tree (commit held) + old archived. Captures: empirical finding, change-vs-add mechanism, three-layer model, orphan-gap bottom-up sequencing, 5 open questions. No deploy until sequenced.

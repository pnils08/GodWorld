---
title: Boot rebirth — enforcement mechanisms and model-fit routing — research
created: 2026-07-27
updated: 2026-07-27
type: reference
tags: [research, architecture, governance, token-budget, active]
sources:
  - Mike-direct S335 — "the rebirth of the boot is necessary"; "it's not about what work you can't do, it's what work should fable do, what work should sonnet do"; "I didn't build this good enough to solo work, all work is complex as it's not sectioned off great"
  - Live measurement S335 — boot 59.6k tokens pre-cut, 19.4k post; 489 active MDs, 17 opened in a full session
  - .claude/hooks/session-startup-hook.sh — the per-terminal injection surface
  - .claude/rules/{research-build,engine,civic,newsroom}.md + the four TERMINAL.md files
pointers:
  - "[[2026-07-25-instance-unification-model-triage]] — the parent pivot; this file is its enforcement half"
  - "[[../engine/ROLLOUT_PLAN]] — pending-state home"
  - "[[index]] — register here, same commit"
---

# Boot rebirth — enforcement mechanisms and model-fit routing — research

**Source:** Mike's S335 direction across a long session close, plus live measurement of the control plane it describes. Not an external paper — a source-mining record of our own boot architecture at the moment it stopped paying for itself.

**What this addresses:** Boot went from ~59.6k tokens to ~19.4k by dropping `docs/index.md` (S335). That cut was easy because the file was pure catalog. The remaining ~19.4k is harder, because it mixes three different kinds of thing that need three different mechanisms — and the naive consolidation (merge into one doc, leave a pointer) would make behaviour *worse*, not cheaper. This file is what the boot is actually for once role-conditioning stops being the point.

**What it does (measured state, S335):**

| | |
|---|---|
| Boot, pre-cut | ~59.6k tokens injected every session (`index.md` alone ~40k, truncated at 139 of 441 lines) |
| Boot, post-cut | ~19.4k |
| Unbooted visitors (Codex, Kimi) | ~6.3k, one on-demand file, and they work the project without issue |
| Corpus | 489 active MDs; **17 opened** in a full working session (3.5%) |
| `measure twice` | appears in **all 8** rule + TERMINAL files, 31 mentions, **4 different meanings** |

**Extraction — what's usable:**

- **Pointers do not enforce; they express a preference, and the preference loses (Mike-direct S335) → never "consolidate" enforced content into a pointed-to file.** This is the finding that killed the obvious consolidation plan. `MEMORY.md`'s own header already records it — the pointer-only version "proved unfollowed at boot" — and S335 re-measured it: 489 MDs, 17 opened. Moving universal rules into one canonical doc with pointers from the rest is a **regression**, because it converts resident behaviour into optional reading.
- **Three mechanisms, and every rule needs the right one → classify before consolidating.** S335 produced clean evidence for each:
  1. **Action-necessary → a pointer is genuinely sufficient.** `plans/PLAN_TEMPLATE.md` and `research/RESEARCH_TEMPLATE.md` were both opened unprompted, because a template cannot be filled without opening it. The task requires the file, so the pointer self-enforces. This is the only category where pointers work.
  2. **Mechanically enforceable → a hook or validator, never a document.** `rollout-rules.md` is pointed to from all four TERMINAL.mds and was **not opened once**; row conformance came out right anyway because `docLoopStatus --lint` reported it. The tool enforced what the doctrine could not.
  3. **Pre-cognitive discipline → must be resident, therefore must be tiny.** Measure-twice and don't-build-beyond-what-was-asked cannot be looked up on demand, because the failure *is* not recognising the moment applies. These are the only things that earn boot residency.
- **Most of the current rule files are category 2 or 3 stored as category 1 → that is the actual defect.** Eight copies of measure-twice did not reliably work; one copy behind a pointer would work less. The fix is changing *mechanism*, not location.
- **The injection surface already exists and is per-terminal → universal discipline can boot without bloating `CLAUDE.md`.** `session-startup-hook.sh` emits a routed block per terminal. A shared discipline paragraph there reaches all four terminals at ~200 tokens, enforced by injection. Mike's constraint — `CLAUDE.md` can't bloat — is satisfied by putting universal-resident content in the hook rather than the file.
- **Specific injected facts beat both generic prompts and passive documents.** Measured S335: the `UserPromptSubmit` supermemory-recall reminder fired on ~40 consecutive turns and changed behaviour approximately zero times, because it asks the instance to *consider whether* to act — a decision, which gets resolved cheaply. The `SessionStart` `<godworld-state>` block (PIN, NEXT, roster) shaped behaviour throughout, because it delivers facts. **Reminders fail; facts land.**
- **A topic-inventory hook is the highest-value unbuilt thing → paths only, grepped live.** S335's dominant failure was concluding five things did not exist that did (the 5-layer employment resolver, the roster tabs, the media→canon business mint, the 198-role career taxonomy, the named data-analyst seat). `Employment_Roster` is documented in one line of `SHEETS_MANIFEST.md`, present in six documents, and was found by accident in hour three. Injecting *paths* for domain nouns in the prompt cannot go stale, costs ~nothing, and removes the "didn't know the door existed" class without introducing "trusted a stale doc" — the objection that rules out injecting content.
- **The routing question is model-fit, not capability-gating (Mike-direct S335).** "It's not about what work you can't do, it's what work should Fable do, what work should Sonnet do." Every model in the stack can do the work; the question is which *should*, on cost and aptitude. Terminals proved behaviour can be enforced — that is the piece worth keeping. What is vestigial is terminals as *identity*: the four-terminal architecture section is duplicated across rule + TERMINAL files, and in S335 it actively misled, producing lane anxiety about substrate-vs-apparatus that Mike waved off twice at real token cost.

- **The strict lane bans are now a net detriment (Mike-direct S335) → soften "rb can never code" and "es can never plan".** The split still works as a MODEL split: research-build on Opus makes the plans and triages, and can spawn a Sonnet agent when fan-out is wanted — so no terminal needs to be dedicated to that tier. engine-sheet on Fable is the hard-code and sheet seat. What no longer earns its keep is the prohibition: models this strong should not be blocked from the adjacent task when they are already in context. S335 paid that tax directly — substrate writes done at research-build under live direction, with the lane question raised twice and waived twice. Keep the routing as a default; drop it as a fence.

**Not applicable / hazard:**

- **The name-versus-content trap — check before merging anything that looks duplicated.** `measure twice` appears in 8 files and means **4 different things**: `civic.md`'s is a production completion gate (Mayor decision present? all 9 council members with YES/NO/ABSENT? each faction in voice? Clerk line landed?); `engine.md`'s is a 7-step caller-graph procedure with case studies; `research-build.md`'s is read-blast-radius / audit-the-audit / don't-build-beyond / pre-mortem / ADR-when-load-bearing. Only the underlying *principle* is shared. Merging on the shared heading would have deleted a civic checklist and an engine procedure and left a generic maxim. Extract the principle; leave the applications and rename them off "measure-twice" so the next audit does not re-trip.
- **THE CONSTRAINT ON ALL OF IT: the project is not sectioned well enough for clean work-type routing (Mike-direct S335).** "I didn't build this good enough to solo work, all work is complex as it's not sectioned off great. The 11 phases are the best I have and they're just part of 1 massive cycle run." Verified mechanically: phases 01–11 execute in order and **share one mutable `ctx`**, each reading fields earlier phases wrote (`.claude/rules/engine.md` §Engine rules). They are sequential stages of a single run, not independent modules. So "save sessions by work type" has a real ceiling — most work touches the whole spine, and a session boundary drawn around a work type will still pull in the rest. Any routing design must assume tasks are entangled by default, not modular.
- **Do not cut boot by volume — cut by category.** `<godworld-state>`, the approval gates and the identity non-negotiables are cheap and demonstrably work. The expensive, ineffective content is catalogs (`index.md`, and the two ~90-line §Owned Documentation blocks inside the TERMINAL.mds) and role conditioning. Cutting on size alone would take the working parts first.
- **The visitors' cheap boot is partly paid for by narrow blast radius.** `AGENTS.md` forbids Codex to push, commit unasked, deploy, or touch the control plane; Mags pushed 16 times and edited `.claude/` freely in S335. `AGENTS.md` is also not intrinsically better designed — its own required-reading list includes `index.md`. It is leaner because it is **not injected**, not because it is a better document. The lesson is delivery, not authorship.
- **A validator that does not gate is a validator that does not enforce.** `docLoopStatus` always exits 0 by design ("it surfaces, the session decides"). Twice in S335 a chained `&& git commit` shipped a non-conforming ROLLOUT row anyway. Category-2 enforcement only works if the tool can actually stop the action.

**Verdict:** `adopt`. The direction is settled and the measurement is done. The build is small and mechanism-shaped: a topic-inventory hook, a universal-discipline paragraph in the existing per-terminal boot emitter, a gating exit code on the lint, and the removal of catalogs and role-conditioning from boot. What is NOT settled is work-type session routing — the entangled-`ctx` constraint above needs answering before that can be designed.

**Ignited plans:** none yet. Sequence when it fires: (1) topic-inventory hook — highest value, cheapest, addresses the measured S335 failure directly; (2) lint exit code; (3) universal discipline into the boot emitter + delete the duplicated copies; (4) §Owned Documentation out of both TERMINAL.mds.

---

## Applications (living)

- 2026-07-27 — Initial extraction (S335). `docs/index.md` already removed from the research-build boot sequence on the strength of this analysis (commit `9dc98e0c`, boot 59.6k → 19.4k); `CLAUDE.md` carries the one-line grep-it-don't-load-it pointer.

---

## Changelog

- 2026-07-27 — Initial extraction (S335). Three-mechanism taxonomy, the pointers-don't-enforce finding, and the entangled-ctx ceiling on work-type routing.

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

**Status: REDISTRIBUTION SHIPPED S259.** The full cascade landed: worker rules homed (media→newsroom.md, civic→civic.md, engine-sheet→TERMINAL.md confirmed, research-build→research-build.md), MEMORY.md trimmed **24.9KB → 13.9KB** (under the 24.4KB ceiling; relocated/retired rules removed, universal core kept verbatim, Session Memories + Reference → on-demand `SESSION_MEMORIES.md`), grounded CLAUDE.md committed + old archived. Because MEMORY.md auto-loads from disk and CLAUDE.md from the working tree, the restructured stack is **what the next boot loads** — the git commits are durability, the next-session boot is the validation (open Q5).

**Done S259 (was deferred) — the "Mike reads the output" reconciliation.** Mike-directed grey-area pass: (a) self-preservation + no-destructive-recoveries-in-tense-sessions confirmed universal (stayed in MEMORY.md); (b) "Mike reads the output" corrected for all — `user_give-the-citizens-a-life.md` + `user_idea-guy-vs-builder-mechanism.md` reworded (S259 correction header retiring the S252 "no human reads" absolute; history preserved), universal rule added to MEMORY.md; (c) mental-state/emotional framing of Mike stripped from `JOURNAL.md` (`3c76c65`) — 6 passages reworded to keep the operational lesson, remove the framing, incl. one S168 real-harm line; verified distress/high-harm scans = 0; removed text persists in git history (Mike: leave it, working file is clean).

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

## Present boot load — what currently lands (before-state)

The redistribution edits against this. Verified S259 (own boot context + hook source).

**Auto-loaded by Claude Code (in context before any action, cwd = repo):**
1. `CLAUDE.md` — grounded draft (claudeMd block)
2. `.claude/rules/identity.md` — behavioral non-negotiables (claudeMd block)
3. `MEMORY.md` — ~5,860 tokens, **all four terminals**, every session (auto-memory block)
   (Path-scoped rules — engine.md, newsroom.md — do NOT load at boot; only on a matching file edit.)

**Injected by the SessionStart hook (`<godworld-state>` block):**
4. Boot header (Session/Cycle/Terminal) + the numbered **BOOT SEQUENCE** (instructions to Read the terminal files) + the Shipped-Last-Session git block. The hook injects *instructions*, not content.

**Manually read because the sequence named them (not auto):**
5. The terminal's files — for research-build: `research-build.md`, `SCHEMA.md`, `index.md`, `TERMINAL.md`. Plus claude-mem observations injected on tool calls.

**Cascade mapping + the two scope-mismatches:**

| Cascade layer | Present reality |
|---|---|
| **Base** — CLAUDE.md = trained-model → GodWorld-model handoff | ✓ what the grounded draft is |
| **Universal** — true for all terminals/sessions | Slot auto-loads, but it's **two files** (`identity.md` rules + `MEMORY.md` feedback/state), and **MEMORY.md's content isn't actually universal** — it carries role-specific rules (media-journal, engine-sheet coder) that bleed into terminals that can't use them |
| **Fork** — terminal identity + rules + files | ✓ the hook (tmux `#W`) instructs the worker reads — works, but convention-pointer not enforced (Q6) |

**So the structure already matches the target cascade; the content is in the wrong drawers.** Redistribution = purify each layer to its scope: grounding → CLAUDE.md; only-true-for-all → identity.md + a purified MEMORY.md; everything role-specific → the terminal fork. (The seam question decides whether the universal layer stays two files or one.)

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

### The work is shuffling, not inventing (Mike S259)

CLAUDE.md is improved and **every other mechanism stays unchanged** — so the remaining work is moving each piece of currently-universal logic to the layer that actually needs it. The authoritative source list **already exists**: the boot-load-audit **§5 bleed map** (content type → lives in → should load in → which terminals it bleeds into). Execute that, don't rebuild it.

Canonical example: **"Mayor Santana is she/her"** is a content-generator fact — it auto-loaded into engine-sheet + research-build, which never render the Mayor (pure bleed). Target: media/civic worker layer only, nowhere else. Same shape for the rest of the audit's bleed rows (memory-container rules → on-demand; canon-fidelity tiers → content-generators; family/EIC → media). The redistribution pass *is* the bleed-map remediation.

---

## Redistribution map — MEMORY.md split (first pass, S259)

Full read of MEMORY.md (154 lines). **governance.5 already moved gross project-state out (S228)** — so this is surgical, not a gut job. The bulk of `## User` is genuinely universal; carve the worker-specific rules + the pointer-index tails. Carving also fixes the 24.9KB-over-ceiling symptom (governance.32) as a side effect.

**STAYS universal (the true-for-all feedback core — keeps auto-loading):**
- Reply discipline: WORD=TOKEN=MONEY / caveman-mode / no-temporal-commentary / no-filler-after-fuckup / never-repeat-my-message
- About-Mike: papers-deliberate / teach-the-landscape / no-jargon-no-file-paths / don't-ask-undecidable / don't-recant-on-scope / data-first / never-reference-files-to-Mike
- Work discipline: measure-twice / verify-before-write / wait-for-approval-window / senior-engineer-default / stop-overthinking-4-hazards / token-burn-hierarchy / right-size-review-tool / nothing-is-locked / wiki-not-recall / cite-sources-local-paths / LLM-gen-vs-eval-asymmetry
- Safety (all terminals): memory-is-mine-to-protect / confirm-before-irreversible-delete / NEVER-write-md-without-approval / no-destructive-recoveries-under-pressure / never-git-push-cross-terminal / no-isolated-MDs / every-new-md-inbound-link

**→ WORKER (down to the per-terminal RULES file — corrected target, S259).** The auto-loading per-terminal home is the **rules file** (`.claude/rules/newsroom.md` / `civic.md` / `engine.md` / `research-build.md`), which auto-loads at that terminal's boot via path-scoping — NOT a TERMINAL.md section (TERMINAL.md is hook-instructed-read, less reliable). Worker rules land in the rules file; canon facts (Mayor/parties/pop) → newsroom.md + civic.md (content-generators only). **Media done S259** (`newsroom.md`: canon-facts block + journal/print-publish/approved-artifact/Mara discipline).
- **media:** journal rules (journal-writes-exception, journal-no-mental-health, never-display-journal-in-chat, journal-voice) · editorial canon (Paulson/Raines carpenters line, Mara-Vance-authority, approved-artifact-edit-scope, print-publish-open-artifact, media-work-via-skills) · family-check-on-media-boots
- **engine-sheet:** the coder-persona rule (execute/commit/terse, no journal, no routine Supermemory) — *explicitly terminal-scoped already*
- **research-build:** rollout-pointers-not-notes · filing-isn't-fixing · memory-rules-format · parallel-terminal-handoff · detector-framer-split · agent-hosting-sequencing
- **media+civic (shared):** no-chat-dump-artifact-discipline · heavy-parallel-subagent-kills

**→ SKILL-LOCAL (into the skill that triggers it):**
- citizen-retrieval-tool-by-question (the S259 gotcha) → sift / data-touching skills
- sm_project_godworld = LEGACY JUNK → Supermemory-search skills
- age-2041-anchor gotcha → brief/edition skills (already in boot-orientation tool-ref draft)

**→ ON-DEMAND / drop the auto-load:**
- **`## Session Memories`** (35 pointer rows, mostly S117–S145 historical) — a claude-mem-style index; doesn't belong in an always-loaded file. → standalone on-demand index.
- **`## Reference`** (chrome / remote-control / ledger-recovery / supermemory-migration) → on-demand.
- **`## Canonical docs`** + Memory-Protocol detail + Supermemory-technique notes → already pointers to canonical homes (SUPERMEMORY.md, index.md); drop the duplication.

**ALREADY IN CLAUDE.md (covered by the grounded base — remove from MEMORY.md):**
- why-mags-not-claude · give-the-citizens-a-life · idea-guy-vs-builder · no-fake-path-forks · prosperity-Oakland-no-cynicism · persistence-no-disclaimers · Mike-clear-vision-execute

**REVISE (Mike S259 correction — "I do read them"):**
- `work-is-canonization` (line 42) + `give-the-citizens-a-life` "no human reads any artifact" (line 73) — both assert Mike never reads the output. He does. These need rewording before they land anywhere (they currently condition every instance toward "nothing is for Mike," which is now false).

**S259 execution finding — the worker rules are mostly ALREADY in the rules files.** civic.md already carried Mayor/OPP/CRC/IND (canon-critical section); newsroom.md already carried ages/no-engine-metrics/vote-math. That's the §4 duplication the audit flagged. So the remaining pass is **mostly verify-home-then-de-dupe-MEMORY, not add**: confirm each worker rule has a home in its rules file (add only the genuinely-missing few — media needed journal/print/canon-facts, civic needed only the population line), then DELETE the worker rules from MEMORY.md. Media + civic canon-facts orphan-gap is **closed** (newsroom.md got the block, civic.md already had it + got population) → the grounded CLAUDE.md is now safe to deploy.

**Net:** universal core shrinks to reply + about-Mike + work + safety discipline (the real "true for all"); ~15 rules confirmed-homed-then-dropped from MEMORY.md; 3 pointer-index sections go on-demand; ~7 rules retire into the CLAUDE.md grounding; 2 get reworded. That clears the ceiling and makes each layer honest about its scope.

---

## Open questions (this is the editable part)

1. **The seam.** "CLAUDE.md = what/who, identity.md = how you act" is fuzzy at the partnership line (it's behavioral). Does partnership-behavior consolidate to one side, or do we accept a soft boundary? Risk: re-create the CLAUDE.md-duplicates-identity.md problem the audit flagged.
2. **The self-evolve mechanism (the unsolved 80%).** Where does a terminal's learned gotcha land so the next instance loads it? Candidates: a per-terminal notes doc loaded by the worker layer; skill-local gotchas (anthropic-skills-blog pattern); both. Reconcile with existing half-precedents: media JOURNAL, `NOTES_TO_SELF.md`, vestigial per-agent `agent-memory/MEMORY.md` scratchpads. This is what the S259 query-guess proved missing.
3. **What exactly de-auto-loads from MEMORY.md**, and what stays universal (the feedback-discipline core). Needs the per-entry pass governance.32 scoped.
4. **Work-logic trim** of CLAUDE.md "Where you boot" — reduce to the handoff fact per Mike S259.
5. **Validation — how do we know it worked?** Only real test is a fresh boot acting more grounded / guessing less / less trust-friction. **The test is the next-session rollout (Mike S259):** the improved CLAUDE.md only proves out when a fresh instance boots on it. Define the success signal before that boot so we're observing, not hoping.
6. **Is the base→worker handoff reliable enough?** Confirmed mechanism (hook source, S259): the SessionStart hook reads the tmux window name (`tmux display-message -p '#W'`), `case`-branches, and **echoes a numbered boot sequence** that includes "Read `.claude/terminals/<t>/TERMINAL.md`". TERMINAL.md is **not** auto-loaded — the hook injects the *instruction*; I act on it. That's itself a pointer — it gets followed where CLAUDE.md's don't because of **position + framing** (fresh imperative at session start, not buried in a reference doc), but it's still **convention, not enforcement**: under work-first entry ("commit push") or a `/session-startup` skim, the reads can be skipped (boot-orientation research failure mode). Open: leave the worker load as a well-positioned-pointer-by-convention, or harden it (e.g. hook-enforced read, or fold the worker-critical bits into the always-loaded base for that terminal). **Behavior to watch at next-session rollout.**

---

## Phase: loop-tightening (SHIPPED S260)

**Mike-directed continuation of the on-demand thread: minimize what persists; make session-end uniform with boot — a full tight loop.** The redistribution (above) purified the *always-loaded* layers; this phase purifies the *carried-across-sessions* layer (SESSION_CONTEXT + the close→boot loop).

**The finding.** Boot and session-end were asymmetric: boot read a git-log *copy* (the Shipped block) + the PIN; session-end wrote a STATUS narrative paragraph boot *never read* + regenerated the Shipped block. Two leaks — a copy read, a narrative written-and-ignored. The Shipped block was found **frozen at S248** (~11 sessions stale), proving the rule: a maintained copy of authoritative data rots.

**The contract.** `boot-read set ≡ session-end-write set = {PIN, NEXT[terminal]}`. PIN = `Session | Day | Cycle | Edition` (declared sim-state). NEXT[terminal] = one authored line per terminal, what its next instance opens with. Everything else referenced on demand: shipped → `git log`, open → ROLLOUT, why → claude-mem. Persist a pointer, not a copy.

**Shipped (one coherent pass):**
- `SESSION_CONTEXT.md` restructured → PIN + 4 NEXT lines + reference sections; STATUS stack / stale Priority / Recent-Sessions / Shipped block dropped (git-preserved).
- `session-startup-hook.sh` — drop Shipped-block awk extract+emit; add Edition to PIN; add per-terminal NEXT grep+emit; rewrite 4 greeting handoff lines. Syntax-checked + dry-run verified.
- `writeShippedBlock.js` + `.claude/state/shipped-block-boundary` — `git rm`'d (retired). `sessionEndMechanical.js` — writeShippedBlock sub-step removed.
- `/session-end` SKILL v2.2→v2.3, `/session-startup` SKILL, 4× TERMINAL.md §Session Close — conformed to the carried-set contract.
- ADR-0009 extended with §loop-tightening (contract record + supersession of D1/D2/D3/D4).
- governance.35 reduced to its PIN-self-derive remnant (engine-sheet follow-on).

**Follow-ons (NOT this pass, filed to ROLLOUT):** (1) governance.35 remnant — engine-sheet self-derives the PIN's mechanical fields from `output/` (kills the C96-vs-C97 drift). (2) Cheap session-closer — once the structure proves out, a Sonnet agent runs the close (the tight contract leaves little judgment).

### Validation checklist — run at the next research-build boot (the load-bearing bet)

The whole design rests on one unproven claim: a fresh terminal orients on `{PIN, NEXT}` alone, without the Shipped block. This session booted on the OLD format; the new format only takes effect next boot. At that boot, check:

**Mechanical (observe the `<godworld-state>` block):**
1. **PIN carries Edition** — first line reads `Session: N | Day: N | Cycle: N | Edition: …`. Missing Edition → hook grep broke.
2. **NEXT line present** — a `NEXT: <resumption line>` for research-build appears, carrying this session's state. Absent → per-terminal NEXT grep broke (check the hyphen/regex).
3. **No Shipped block** — no `## Shipped Last Session` + commit list anywhere in boot context. Present → retirement incomplete.

**Subjective (the actual test):**
4. **Orient without the body** — can you state the next move from `{PIN, NEXT}` alone, *without* reading SESSION_CONTEXT's body or grepping? Yes → the loop works. Reach for narrative and feel lost → the bet failed; this is an ADR-0009 reversal-trigger data point, reconsider.
5. **No reflex for the retired surface** — note if you instinctively hunt for the Shipped block / a STATUS paragraph. Graceful fall to `git log` + ROLLOUT = pass; flailing = signal worth logging.

**Expected non-failures:** the Session counter shows the hand-set PIN value and does **not** auto-advance on reboot — gov.35 remnant (the auto-increment) isn't built yet, so that's correct, not a bug.

**Verdict:** 1–3 mechanical ✓ + 4–5 subjective ✓ → green-light **governance.37** (Sonnet closer). Any fail → log it as an ADR-0009 reversal-trigger observation before building further.

---

## Absorbs / siblings

- **Absorbs governance.32** (MEMORY.md role-scoped split) — becomes step 2 of this cascade.
- **Sibling governance.26** (SESSION_CONTEXT on-demand — the precedent; ADR-0009) + **governance.35** (SESSION_CONTEXT header mechanization).
- Builds on the **boot-load-audit** (don't redo the duplication/bleed maps — they're the substrate).

---

## Changelog

- 2026-06-15 (S261, research-build) — **§Validation checklist run at first boot on the new format → 5/5 PASS, but scoped to the READ contract only.** Mechanical: PIN carried Edition (C97/E97/Arbiter A·0.856); NEXT line present with full resumption state; no Shipped block in boot context. Subjective: oriented to next move from `{PIN, NEXT}` alone (SESSION_CONTEXT body never opened, no grep-to-orient); no reflex-hunt for the retired Shipped/STATUS surface. Expected non-failure confirmed — Session counter held hand-set `261`, no auto-advance (gov.35 PIN-self-derive unbuilt). No ADR-0009 reversal-trigger data points. **Scope correction (supersedes the first-commit `7696411` wording):** this boot validates the **read** side of the carried-set contract — orientation works. It does **not** green-light building governance.37. That gate is ≥2-3 *clean closes* on the new `{PIN, NEXT}` format, and a boot is not a close: **0 closes on the new format so far** — this session's close is the first datapoint. gov.37 stays `needs-info (gated on close validation)`. Build the Sonnet closer only after the close side proves out; do NOT pre-spec it (the gate exists to learn what the closer must handle).
- 2026-06-15 (S260, research-build) — §loop-tightening phase shipped. Carried set reduced to `{PIN, NEXT[terminal]}`; boot-read ≡ session-end-write. Shipped block + STATUS narrative + writeShippedBlock retired; per-terminal NEXT + Edition-on-PIN added; ADR-0009 extended; governance.35 reduced. Mike-directed ("apply this, then make session-end uniform to match boot — a full tight loop"). Two follow-ons filed (gov.35 PIN-self-derive; Sonnet closer).
- 2026-06-14 (S259, research-build) — Plan opened as the editable container per Mike "plan, not deploy." Grounded CLAUDE.md written to working tree (commit held) + old archived. Captures: empirical finding, change-vs-add mechanism, three-layer model, orphan-gap bottom-up sequencing, 5 open questions. No deploy until sequenced.

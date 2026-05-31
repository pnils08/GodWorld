---
title: Citizen-Autonomous PoC — narration-only life-loop (Layer 3 toe-dip)
created: 2026-05-31
updated: 2026-05-31
type: plan
tags: [research, citizens, autonomy, ready]
sources:
  - "[[2026-05-31-autonomy-roadmap]] — Layer 3 (citizen-autonomous); this is its executable first step"
  - "[[../RESEARCH]] §S172 — research.9 inter-agent design (4 measured questions lifted from here)"
  - "S248/S249 Mike-direct — 'autonomous citizen', 'ran them continuous', 'automate 10 for a full day'; S249 'them being aware of the sports in the city is a tweak to pull that in'"
  - "Emergence World (Emergence AI continuous-governance sim) — [[../RESEARCH]] §S248; Drive 1jHIkac1TuXaBBp2d3SuwfsnCAbMc7YYe (the Grok 183-crimes failure is the cheap-and-early signal this PoC is built to catch)"
  - "scripts/spacemolt-miner.js — in-repo existence proof of the wake→act→save→sleep loop"
pointers:
  - "[[2026-05-31-autonomy-roadmap]] — umbrella (research.12); Layer 3 section back-links here"
  - "[[../engine/ROLLOUT_PLAN]] — research.13 row (this PoC); research.9 row (the interview build, stays blocked on 40.2)"
  - "[[index]] — registered here in the same commit"
  - "[[../engine/PHASE_40_PLAN]] §40.2 — the reporter-cattle refactor that gates the interview build but NOT this loop"
  - "lib/neighborhoodSlice.js — the context assembler reused for wake-piece #2"
  - "[[2026-05-30-citizen-lifecycle-fame-system]] (engine.29) + [[../engine/LEDGER_REPAIR_HOUSEHOLDS]] (engine.5) — the engine the *real* build (action menu) would plug into; out of scope here"
---

# Citizen-Autonomous PoC — narration-only life-loop (Layer 3 toe-dip)

## Context

The autonomy roadmap ([[2026-05-31-autonomy-roadmap]], research.12, S248) **points** at Layer 3 — citizens as live agent loops — but never spells out the executable first step. research.9 ([[../RESEARCH]] §S172) holds a related design, but it was scoped as a **reporter-interviews-citizen** exchange. Mike's S248/S249 direction — "autonomous citizen," "ran them continuous," "automate 10 for a full day," plus the Emergence-World experiment he shared — names a different shape: a citizen who **lives**, not one who's interviewed. This spec resolves that seam toward the **life-loop**, and folds in Mike's S249 tweak: citizens must be **sports-aware** (an Oaklander knows the A's are 23-5).

The honest first test is the cheapest one: **does an autonomous citizen produce usable life, or noise?** Everything past that — mutating the world, ten-for-a-day — is wasted effort if the paragraphs are garbage. So the PoC is deliberately small: 1–2 citizens, ~1 hour, narration-only, throwaway output, nobody publishes. If it reads like a life, that earns the real build. If it breaks, it breaks fast and cheap.

**Intended outcome:** a recorded answer to the four measured questions (below) and a go/no-go signal on whether to scope the real Layer-3 build (the engine action menu).

## Scope

**In:** a standalone timed loop that wakes 1–2 citizens, assembles a sports-aware wake-context, has each narrate one cycle of life, appends to a throwaway file, sleeps, repeats for ~1 hour; then a read-through against the four questions.

**Out:** any ledger mutation; any reporter/interview agent; any publish or ingest path; any at-scale (ten-for-a-day) run; the engine **action menu** (the real Layer-3 build — scoped separately, only if this PoC says go).

## The build

### Shape — a standalone timed loop (spacemolt-miner pattern)
Model on `scripts/spacemolt-miner.js` — the in-repo existence proof of the loop: `loadState` → act → `saveState` → `logRun` → `sleep`, pm2-able. New script `scripts/citizenLifePoC.js`:

```
for ~1 hour, on a timer:
  for each of 1–2 chosen citizens:
    wake-context = assembleContext(citizen)            # the heart of it (below)
    entry = <one Anthropic API call: "you are <citizen>; this cycle of your life, what happened?">
    append entry to output/poc_citizen_life/<citizen>_<ts>.md
    saveState(citizen, entry)                          # feeds wake-piece #5 next loop
  sleep(interval)
```

- **Agent mechanism:** **direct Anthropic API call** per wake — not Claude-Code `Task` subagents. A standalone timed loop (the spacemolt shape, the thing that scales to ten) can't drive subagents; it calls the API directly. Citizen persona + wake-context = the prompt.
- **Hard turn cap** so a runaway can't rack up a bill — mirror spacemolt's `MAX_*_ATTEMPTS` / `TOOL_TIMEOUT` guards.

### The wake-context bundle — and the sports tweak (the heart)
The engine throws off a lot of state each cycle; the design question Mike's tweak surfaces is **which slice** a citizen carries into a decision. Per citizen, assemble **five** compact pieces:

1. **Who I am** — the citizen's own `Simulation_Ledger` row (name, age, job, family, neighborhood).
2. **Where I live** — reuse `lib/neighborhoodSlice.js` `createSlicer().slice(nbhd)` + `.describe()` — the same assembler the voice agents already use; it keeps metrics + displacement/income facts explicit so nothing gets invented against them.
3. **What's happening** — a compact slice of the cycle's `output/world_summary_cXX.md` (the city digest).
4. **Sports** — the `## Sports (Oakland_Sports_Feed)` section of the world-summary (A's record, recent games, Bulls), logged as "Mike's entries verbatim." This is the S249 tweak — it hands Mike's sports world to the inhabitants; a citizen who doesn't know the A's are 23-5 isn't living in Oakland.
5. **What I did recently** — a short rolling memory of the citizen's own prior entries, fed back via `saveState`. **Load-bearing, not optional:** the engine is *frozen* during the one-hour run (no cycle advances), so pieces 1–4 are identical at every wake. The citizen's own accumulating history is the **only** thing that changes wake-to-wake. Without it, every wake is turn-1 — the same paragraph regenerated, not a life — and "drift by turn 3" (Q1) has no turn 3.

Keeping this bundle compact **is** the answer to the token-bill question (Q3).

### Output — isolated, throwaway
`output/poc_citizen_life/` — one append-only file per citizen. **Zero ingest path** to bay-tribune / world-data / editions (S172 lock, re-confirmed here). Clearly marked throwaway; not for publication, not for Supermemory.

### What this is NOT — the gap to the real build
PoC citizens **narrate**; they do **not** mutate the ledger. A clean run proves **generation quality** (character-hold + cost) — **necessary, not sufficient.** It does NOT prove Layer 3. The real Layer-3 build is the **action menu**: a vocabulary of engine-understood moves (take a job, move neighborhood, start a business) that plug into `engine.5` / `engine.29`. That integration is where the real cost and work live; it is scoped separately, only after this PoC says the narration is worth building on.

### Precondition finding (verified against [[../engine/PHASE_40_PLAN]] §40.2)
The `research.9` ROLLOUT row is blocked on **Phase 40.2 — the reporter-as-cattle refactor** (split reporter voice files from disposable, restartable brief-execution state, so a reporter can crash mid-article and reboot from the production log). That gates the **interview** build, because you don't drop a stateful "pet" reporter into a live multi-turn loop. **This citizen life-loop has no reporter** — it's a solo citizen narrating — so 40.2 does **not** gate it. (Injection defense, the layer that would matter for any ingest path, is Phase 40.6, already DONE S156 — and moot here anyway since there's no publish path.) So this PoC is a separate, **unblocked** sub-thread (`research.13`); the interview build (`research.9`) stays blocked on 40.2. Re-confirm at build time.

## Design refinements (S249, post-smoke — Mike-direct, validated against research + engine data)

The smoke held on free-text Bio, but two findings reshape the wake-context for the real (Tier-2/3) build:

- **Voice = the TraitProfile, not the Bio.** What gives a citizen a stable voice is the structured `TraitProfile` column — `{Archetype, Tone, Motifs, Traits}` (~342 of ~685 rows carry one; per [[../RESEARCH]] TraitProfile design + research4_1 numeric-trait note). The PoC fed Bio + LifeHistory (free text) and skipped TraitProfile — fine for Tier-1 notables who *have* a rich bio, but **Tier-2/3 citizens (the retargeted audience) mostly don't have a bio; they have a TraitProfile.** So TraitProfile is the *scalable* voice anchor → add it to wake-piece #1.
- **The "8 details" = bounded MEMORY, not identity.** Mike's recalled "8 details a sim bot can carry" traces to **Dwarf Fortress's 8 short-term memory slots, grouped Social/Work/Family/Health** (`docs/research4_1.md:196`) — keep the strongest per slot, promote to long-term on a schedule, prevents *emotional runaway*. It is **not** a cap on identity facts. This is the **drift-control mechanism for the untested Q1 (horizon character-hold)**, and it was already earmarked for our citizen sentiment/media-impact system (`research4_1.md:209`). It replaces wake-piece #5's naive "last 3 raw entries."
- **Net wake-context shape:** voice = TraitProfile (+ role + neighborhood); memory = 8 bounded slots (the citizen's event-memory). Two different fields; don't conflate them.
- **Memory-slot mechanism (where it lives + how maintained):** OPEN design as of S249 — leaning Layer-1/engine-maintained (deterministic, all citizens, distilled from the `LifeHistory_Log` event stream; promotes to TraitProfile shifts on a schedule), with the Layer-3 agent *reading* it, not owning it. Spec to be recorded once settled. Substrate confirmed: `LifeHistory_Log` is the live append-only per-citizen event stream (written by Phase 4/5 engines); no bounded-memory structure exists yet.

## Acceptance criteria

The build go-ahead is complete when the run answers the four questions (lifted from research.9 / S172):

1. **Character-hold** — does the citizen stay in voice across the full ~1-hour window, or drift by turn 3?
2. **Canon-sync at wake** — does it correctly know its own life + city + sports each wake (no invented facts against the slice)?
3. **Token bill** — measured cost = N wakes × context-reload; the real cost question and the reason it's 1–2 citizens, not 1,366.
4. **Output usability** — is what it produces usable raw material (engine signal / newsroom source) or noise needing a post-processor?

Plus a recorded **go/no-go**: do the paragraphs read like a life worth building the action menu for?

## Scale guardrail

**1–2 Tier-1 citizens with full ledger rows** (per research.9 — Tier-1 is lower canon risk and has the richest row to stay in voice against), ~1 hour, hard turn cap. Failure shows up fast (the Grok run hit 183 crimes in 4 days) — break cheap, learn early. No ten-for-a-day run until this PoC says go **and** the action menu is scoped.

## Files

- **New (future build):** `scripts/citizenLifePoC.js` — the loop.
- **Reuse:** `lib/neighborhoodSlice.js` (`createSlicer`); `scripts/spacemolt-miner.js` (loop pattern reference).
- **Read:** `Simulation_Ledger` (citizen rows), `output/world_summary_cXX.md` (city digest + sports section).
- **Write:** `output/poc_citizen_life/` (throwaway entries) + a small state file for wake-piece #5.

## Verification (of the PoC, at build go-ahead)

- Run the loop with 1 Tier-1 citizen for a short window; open the output file; confirm entries build on each other (piece #5 working) rather than regenerating turn-1.
- Run with 2 citizens for the full ~1 hour; read against Q1–Q4; record the token bill from API usage.
- Confirm zero ingest path: nothing from `output/poc_citizen_life/` reaches editions / bay-tribune / world-data / Supermemory.
- Write the go/no-go to the changelog and update the `research.13` ROLLOUT row.

## Changelog

- 2026-05-31 (S249, research-build) — **BUILT; mechanism smoke-validated (NOT the full PoC).** `scripts/citizenLifePoC.js` written (dry-run + live modes, `--citizens/--turns/--interval/--memory/--max-tokens/--model/--dry-run/--force`, hard turn cap, cost guard, per-citizen state snapshot for crash-resume). Reuses `lib/neighborhoodSlice.js`; reads `Simulation_Ledger` + `Neighborhood_Map` + latest `output/world_summary_cXX.md`; writes throwaway `output/poc_citizen_life/` (git-ignored — isolation confirmed at the git layer). **Smoke run: 2 Tier-1 ENGINE citizens (Lucia Polito / Elias Varek) × 2 turns, c95 context.**
  - **What the smoke PROVED (mechanism):** context assembly (all 5 wake-pieces populate from real data, age computed 2041−BirthYear), memory threading (turn 2 builds on turn 1, forward motion not repetition), token bill, and isolation all work end-to-end.
  - **Early read on the four questions (NOT a full answer):** *usability* = strong — usable raw material (Division-III texture + three-layer threads; Varek's Civis-Systems-meets-KONO-inflow-strain angle is publishable source), not noise. *Token bill* ≈ 2,770 tok/wake (~2,500 input context-reload + ~270 output) → 10 citizens × ~24 wakes/day ≈ **~665K tok/day, tractable at Sonnet rates** (and ~2,500 of that is the static digest+sports, identical every wake — **prompt caching would cut it ~80–90%** if scaled). *Canon-sync (external)* = clean: grounded in slice + digest + real co-residents + verbatim sports feed (32-6, Quintero interview, team cleanup), zero invented contradictions; Varek cited his slice's −0.04 sentiment.
  - **⚠ STILL UNTESTED — needs the full ~1hr / multi-turn run:** (Q1) **character-hold over horizon** — 2 turns CANNOT answer "drifts by turn 3?"; the Emergence/Grok drift risk is the whole reason the question exists. (Q2) **self-fidelity** — the smoke checked citizens didn't contradict *external* state, but never asked "did the citizen honor its OWN canon row?" Lucia's defining trait (Codex-Linked entity) was dropped — *arguably* correct since her bio says she passes as ordinary ("the city does not know what she is"), but the eval didn't test for it. Add a self-fidelity dimension to Q2 before the full run. Also untested: multi-citizen-at-scale, long-horizon cost.
  - **Verdict: GO on scoping the real Layer-3 build (the engine action menu)** — usability + cost justify it. This is NOT "PoC passed / Layer 3 proven"; the full-horizon run still owes Q1 + Q2-self-fidelity.
  - **Finding:** Tier-1 ENGINE citizens skew *notable/special* (Lucia = metaphysical "Codex-Linked" entity; Varek has no bio) — a plain everyday-worker test would draw from Tier-2/3.
- 2026-05-31 (S249, research-build) — Initial spec. Mike-direct: plan the autonomous-citizen layer. Resolves the roadmap's interview-vs-life-loop seam toward the life-loop (Mike's words); folds in the S249 sports-awareness tweak as wake-piece #4. Advisor review caught two corrections folded in before filing: (a) the real research.9 blocker is Phase 40.2 *cattle refactor* (reporter restructure), not injection defense (40.6, done) — and it doesn't gate a reporterless loop; (b) wake-context needs a fifth piece, the citizen's own rolling memory, because the engine is frozen across the run and self-history is the only wake-to-wake change. Filed as `research.13`, status ready (unblocked). Building the PoC is a separate Mike go-ahead.

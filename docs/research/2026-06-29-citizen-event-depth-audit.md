---
title: Citizen event depth — live audit (coverage solved, depth is the residual)
created: 2026-06-29
updated: 2026-06-29
type: reference
tags: [research, engine, citizens, events, depth, active]
sources:
  - "Live audit S277 (Mike-direct): Simulation_Ledger + LifeHistory_Log read via lib/sheets.js — per-citizen + per-cycle event distribution C92–C100. Scripts in scratchpad (eventdist.js / percycle.js / micro.js)."
  - "[[../plans/2026-06-19-living-city-full-population-coverage]] — engine.38 (the coverage plan; Phase A deployed live C99)"
  - "[[../plans/2026-05-31-life-event-generation]] — engine.32 (traits→events + Conduct generator; deployed)"
  - "[[../plans/2026-05-31-compression-tag-triage]] — engine.31 (dial engine; seeded live S256, code deployed S273)"
  - "SESSION_CONTEXT.md PIN (S273) — clasp deploy-state: full manifest pushed, 'Script is already up to date'"
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — pending-state home (engine.32 / engine.38 rows)"
  - "[[index]] — registered here, same commit"
  - "[[../SCHEMA]] — doc conventions"
---

# Citizen event depth — live audit

**Source:** Live read of `Simulation_Ledger` (922 rows / 874 active) + `LifeHistory_Log` (6,078 rows) via `lib/sheets.js`, S277. Per-citizen and per-cycle event distribution C92–C100, cross-referenced against the engine.31/.32/.38 plan stack and the S273 clasp deploy record.

**What this addresses:** Mike's S277 report — "not all citizens generate events; the events are shallow / filler; most citizens get barely any; a fake half-built loop." This audit establishes which of those is true *against the live sheet*, separates the solved from the broken, and names the recurring failure pattern so the plan that ignites from it targets the real residual instead of re-solving a fixed problem.

## The verified live state

**1. ~25% of citizens are STRUCTURALLY UNWIRED from the stakes engines (the headline).** The career, household, and conduct engines — the ones that produce real life events — all open with the same three-line gate:

```
if (mode !== "ENGINE") continue;        // GAME / MEDIA / CIVIC mode citizens dropped (185 active)
if (tier !== 3 && tier !== 4) continue; // Tier-1/2/5 dropped
if (isUNI || isMED || isCIV) continue;  // Universe / Media / Civic flagged dropped (198 active)
```

Live count against the ledger (874 active):

| Excluded from… | Count | % |
|---|---|---|
| Household / Career / Conduct (stakes engines) | **232** | **26.5%** |
| Generic Micro-Event engine | 199 | 22.8% |

ClockMode dist: ENGINE 689 / GAME 92 / CIVIC 50 / MEDIA 43. Flags: UNI(Universe)=y 99, MED=y 44, CIV=y 56. **The excluded set is the named, the sports-universe, the media, and the civic citizens — the most story-important people in the world get the *least* life.** They are never passed into the engines that generate career moves, household events, or conduct; they fall through to the shared filler pool only. This is "not wired at all," and it is structural, not a coverage-tuning miss.

**2. Coverage (of *any* row) is up, but it masks #1 and #3.** Per-cycle distinct active-citizen coverage:

| Cycle | Rows | Distinct active covered |
|---|---|---|
| C92–C98 | 73–155 | **8–15%** (Micro-Event pinned at exactly 25/cycle = the old LIMIT=25 throttle) |
| C99 | 859 | **82.7%** |
| C100 | 877 | **84.8%** |

The jump at C99 is engine.38 Phase A deploying live (dial-weighted participation replacing the LIMIT=25 cap; orphan named-generator deleted). The throttle is **gone**. BUT "covered" here means *any row fired*, including pure filler — and that is the trap. **The moment you count only substantive events (strip the Daily / Neighborhood / CreationDay / Holiday / PrevEvening / Micro-Event / Weather floor), the city is mostly living blank weeks:**

| Zero-event rate among 874 active | % zero |
|---|---|
| Any event, single cycle (C100) | 15% |
| Any event, last 3 cycles | 10% |
| **Substantive event, single cycle (C100)** | **90%** |
| Substantive event, last 3 cycles | 78% |
| Substantive event, **lifetime** | **48%** |
| Non-pure-floor event (Micro/Nbhd kept), single cycle | 63% |

(Mike's measured ~25% zero is inside this band — exact denominator/cycle not reproduced from the log; the conclusion is denominator-independent.) The raw-coverage win is real but it **masks** the failure: Phase A bought 84% "coverage" by firing a generic floor line at everyone. Under any definition where an event must *say something*, a quarter to nine-tenths of the population gets nothing. **The 18-citizen "0 lifetime events" residual is the footnote; the 48–90% "0 substantive events" rate is the headline.**

**3. The loop is deployed, not dangling.** S273 clasp push deployed the full manifest (engine.31 dial code, engine.32 traits→events + Conduct, B3 vocab, drain) — "Script is already up to date." Conduct/Reputation events fire **live** C97–C100. There is **no undeployed dial→event arc**. (An earlier hypothesis this session that the dial-reading code was never pushed was **wrong** — see Hazard below.)

**4. Every engine is a participation *router*, not a life *generator* — the payload is hollow.** Code inspection (claude-mem #34926) confirms: citizen-specific logic (dial bands, bonds, arc phase, age/occupation) affects only the *chance* a citizen participates — never the *content* of what they get. Once past the gate, the event is drawn from ~200 shared templates filtered by context (neighborhood QoL, weather, holiday), identical for everyone. The "traits→events back-arc" (engine.32, whose entire purpose was *traits shape events*) only nudges probability. So the sophistication is all in *who* and *how often*; *what actually happens to this person* was never built. Coverage was bought by flooding the population with the *shallowest* event classes. C100 top tags: Daily:389, Neighborhood:235, CreationDay:114. Every generator draws from a small fixed bank of vague, citizen-agnostic, consequence-free strings:

- **Daily/Neighborhood (the coverage floor):** "had a quiet moment at home" · "took small steps toward self-development" · "completed a small personal task" · "noticed the weather felt significant somehow."
- **Micro-Event (NOT the rich generator — assumed, then read):** "enjoyed a calm, uneventful day" · "felt a slight shift in background mood" · "felt a quiet sense of belonging."
- **Conduct/Resisted (the *newest, deepest* generator) is a ~4-string bank recycled verbatim:** "found a wallet full of cash and turned it in untouched" appears **C98, C99, C100** across three different citizens; "talked a friend out of a bad idea instead of joining in" — C98/C99/C100; "had every chance to take credit for someone's work and didn't" — C97/C98/C100.

Across all of it: **no event references the citizen** (job, family, name, history), **nothing has a consequence**, **nothing is remembered next cycle**. Dials may bias *which* template fires; the templates themselves are interchangeable mood-noise. Also: `EventTag` is polluted with pipeline metadata crammed into the tag string (`Daily|source:daily|source:base|holiday:CreationDay|...`) instead of structured columns; 36 exact-duplicate rows (same PID+text+cycle) exist.

## Extraction — the real diagnosis

- **Two distinct defects, not one. (a) Structural exclusion (wiring):** ~25% of citizens are gated out of the stakes engines entirely — Universe/Media/Civic citizens and Tier-1/2/5 fall through the `mode/tier/flag` gates. **(b) Hollow payload (content):** for the ~75% who *are* wired, the event is a shared-template draw with zero individuation. The plan must fix both — widening the gate without building the payload just floods the named citizens with the same filler.
- **The recurring failure is the acceptance test → "everything half-built" decoded.** Every plan in the stack (engine.31/.32/.38) was built to a gate that *passed* — coverage %, tag distribution, suite green, dry-run clean. **No gate ever tested "is this event specific to this citizen and does it matter," and none tested "does every citizen reach the stakes engines."** So the engine optimizes the measured thing and the unmeasured things (depth, full wiring) rot. Make both the bar: a specificity/consequence acceptance gate AND a no-citizen-structurally-excluded gate.
- **The substrate is real but it is only scaffolding.** Coverage machinery, dial seeding, deploy path, the traits→events accessor (`getCitizenArchetype_` / `getCitizenDialBands_`) all run — but they route and seed; they do not produce a life. The build target is the **event-generation content layer that does not exist**: events constructed from each citizen's actual ledger facts (job, employer, household, neighborhood state, recent history) carrying consequence and memory — plus rewiring the gates so all citizens reach it.
- **No engine documentation of the event path exists → the plan should leave one.** Stub-maps + graphify give call-graphs, not "how an event gets made, who gets reached, what's deployed." This audit + the plan that follows should produce that missing how-it-works artifact (the thing whose absence let junk stack on junk).

## Not applicable / hazard

- **HAZARD (caught this session): the "dial code never deployed" hypothesis was false.** It was a negative deploy-state claim — the class most easily wrong — and counter-evidence (`Resisted` firing live, S273 "already up to date" clasp record) refuted it on a measure-twice check before it reached this doc. Any future depth plan must NOT assume a deploy gap; the gap is in content design, not wiring.
- **Do not re-solve coverage.** engine.38 Phase A is live and working; a plan that adds participation-volume aims at the wrong residual and risks more filler.
- **Phase B / valence is gated elsewhere.** engine.38 Phase B (ordinary-bad event supply) and research.14 affect re-audit are separate, already-tracked, and gated — depth-of-content work should coordinate with them, not duplicate.

## Verdict

`adopt` — ignites a plan: **citizen-grounded event depth + full wiring**. Two tracks: **(a) rewire** the stakes-engine gates so no citizen class is structurally excluded (~25% currently are); **(b) build the missing content layer** — events constructed from the citizen's ledger facts, carrying consequence and memory — gated by a 4-part acceptance test (Mike, S277): *names the life · has a consequence · is remembered · no recycled phrasing*. Plus the missing how-events-work doc. Raw per-cycle coverage and deploy-state are NOT the residual (already solved/live). Plan doc + ROLLOUT pointer to follow.

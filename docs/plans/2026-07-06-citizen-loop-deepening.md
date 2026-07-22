---
title: Citizen-Loop Deepening Plan
created: 2026-07-06
updated: 2026-07-06
type: plan
tags: [citizens, citizen-loop, voice-agents, engine, media, active]
sources:
  - docs/research/2026-07-06-citizen-loop-deepening.md — the S298 audit this plan executes
  - docs/engine/archive/ROLLOUT_PLAN.md — engine.48 + pipeline.41 rows
  - scripts/citizen-wake.js — the loop all wake-side tasks modify (read end-to-end S298)
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — parent rollout"
  - "[[2026-07-04-voice-dial-sync-contract-build]] — sibling engine.43 plan (amended S298, same research basis)"
  - "[[SCHEMA]] — doc conventions"
  - "[[index]] — add entry in same commit"
---

# Citizen-Loop Deepening Plan

**Goal:** The wake loop reaches the whole shaped pool instead of a 55-citizen orbit, citizens perceive the Bay Tribune and each other, and bonded citizens can hold an actual conversation that both of them carry afterward.

**Architecture:** Four additions to the existing loop, no new subsystem class. Selection gets seeded-weighted sampling + reserved voiced-citizen slots (same `hash53_` determinism as the provocation bank). Perception gains two slices: the published edition (canon→subjective, safe direction) and a cross-citizen ripple register (grounded in `Reflection_Intake` tags + `Relationship_Bonds`). The conversation engine is a bounded two-persona exchange script reusing the wake's perception assembly, writing only to pages + the gated intake — the same canon exit every surface uses. One media-terminal task lets `/sift` mine the tension register for story seeds.

**Terminal:** research-build (this plan) → engine-sheet (Tasks 1–7, 9) + media (Task 8 + Task 9 skill wiring)

**Pointers:**
- Research basis: [[../research/2026-07-06-citizen-loop-deepening]] (all measurements: 55/212 orbit, disposition monotony, voiced starvation, Discord half-wiring)
- Related plan: [[2026-07-04-voice-dial-sync-contract-build]] (engine.43 — Discord/interview write-back; independent, no ordering dependency)
- Seeded-RNG pattern to reuse: `lib/provocationBank.js:_hash53` (cyrb53, no Math.random — perception stays seeded)
- Edition source of truth: `editions/cycle_pulse_edition_{cycle}.txt`, NAMES INDEX rows shaped `POP-XXXXX | Name | context line` (verified against c100)

**Acceptance criteria:**
1. 30 consecutive sandbox wakes produce ≥20 distinct citizens (baseline behavior: ~12 — measured orbit S298).
2. Each of the 4 voiced citizens present in the shaped pool wakes at least once per 20 wakes; the log line marks `slot=voiced`.
3. A citizen named in the latest edition's NAMES INDEX perceives "the Tribune wrote about you" + their context line; a citizen whose neighborhood is covered perceives the hood-tier line; an uncovered citizen perceives nothing (empty slice, no filler).
4. Wake A naming a bonded citizen B writes one ripple entry; B's next wake renders the crossed-paths line once; the entry is consumed (a second B wake shows nothing).
5. One conversation run produces: a bounded transcript printed, each citizen's own lines appended to their own page (`daypart='CONVO'`), exactly one `Reflection_Intake` row per participant (`applied='no'`), zero LifeHistory/dial/ledger writes, and `compressLifeHistory.dial.test.js` passing untouched.
6. `/sift` output includes a story-seed candidates section listing open tensions (popId + question + cycle opened) when the register is non-empty.

---

## Tasks

### Task 1: Seeded-weighted selection + wider rotation memory

- **Files:**
  - `scripts/citizen-wake.js` — modify (`ROTATION_MEMORY`, `selectCitizen`)
- **Steps:**
  1. Raise `ROTATION_MEMORY` from 25 to 100 (pool is 212; 100 forces reach past the orbit while still allowing re-wakes within ~3 weeks at 5/day).
  2. Replace the deterministic `sort(...)[0]` pick in `selectCitizen` with a seeded weighted draw: weight each candidate `w = 1 + eventMag * 2 + deviation(cur) / 50`, draw via cumulative-weight walk using `require('../lib/provocationBank')._hash53('select:' + cycle + ':' + WAKE, 0x5eed)` mod total-weight. Same (cycle, wake) → same pick; high-delta citizens stay favored but mid-pool citizens get real probability mass.
  3. Keep `--pop` override and the everyone-recently-woken pool-reset exactly as they are.
- **Verify:** `node scripts/citizen-wake.js --dry-run --cycle=101 --wake=morning` run twice → identical pick (determinism); across `--wake=morning|midday|afternoon|evening|night` on one cycle → ≥3 distinct citizens.
- **Status:** [x] shipped S312 — verified: same (cycle,wake) → identical pick; 3 distinct citizens across 5 wakes at c101; --pop + pool-reset untouched.

### Task 2: Reserved voiced-citizen wake slot

- **Files:**
  - `scripts/citizen-wake.js` — modify (`selectCitizen`)
- **Steps:**
  1. Enumerate voiced POPIDs by reading `POP ID:` out of each `.claude/agents/citizen-voice-*/IDENTITY.md` (identical enumeration to engine.43 Task 1 — agent-count-agnostic).
  2. Before the weighted draw: if `_hash53('voiced:' + cycle + ':' + WAKE, 0x5eed) % 5 === 0`, pick the least-recently-woken voiced citizen that passes the existing pool filters (shaped floor + lived history); if none qualifies, fall through to the normal draw and log why.
  3. Extend the `woke ...` log line with `slot=voiced|rotation` so coverage is grep-able.
- **Verify:** sandbox loop over 25 (cycle, wake) pairs → ~5 voiced slots hit, round-robin across the eligible voiced citizens; ineligible voiced citizens logged, never crash.
- **Status:** [x] shipped S312 — verified: voiced slot fired ~1-in-5 (seeded), round-robin confirmed (Benji-in-recent → Deacon picked), slot=voiced|rotation|forced in wake log.

### Task 3: Edition read-back slice — the flywheel

- **Files:**
  - `scripts/citizen-wake.js` — modify (new `loadEditionSlice`, wired into `buildVoicePrompts`)
- **Steps:**
  1. New function `loadEditionSlice(popId, name, nh)`: find the highest-cycle `editions/cycle_pulse_edition_*.txt` whose cycle ≤ current cycle (fs glob + numeric sort; graceful `''` if none).
  2. **Named tier:** parse the NAMES INDEX section (rows `POP-XXXXX | Name | context`); on POPID match return `The Tribune wrote about you this week: <context line>.` (cap 200 chars).
  3. **Neighborhood tier** (only when not named): scan article body for the citizen's neighborhood name (word-boundary, case-insensitive); on hit return `The Tribune ran a piece touching <nh> this week.` No hit → `''` — no filler, same omit-rule as `loadNeighborhoodTexture`.
  4. Wire into `buildVoicePrompts` as its own block `\n\nIn the paper: ...`, placed after the sports line (world-larger-than-self group).
- **Verify:** `--dry-run --pop=POP-00034` (Mayor Santana, named in c100 NAMES INDEX) → named-tier line in the printed system prompt; a Rockridge non-named citizen with Rockridge coverage → hood line; a citizen in an uncovered hood → no `In the paper` block.
- **Status:** [x] shipped S312 — verified: POP-00034 named-tier line from c100 NAMES INDEX; Benji self-row named-tier; Chinatown citizen correctly omitted (0 mentions); hood tier reads body-only slice.

### Task 4: Cross-citizen ripple register

- **Files:**
  - `scripts/citizen-wake.js` — modify (write side after classification, read side in perception assembly)
- **Steps:**
  1. Write side (live runs, after step 4 intake persist): for each bond fed to this wake (`loadBonds` already resolves name + POPID), if the reflection text contains the bonded citizen's first or full name (word-boundary match), upsert `{to: bondPopId, from: c.popId, fromName: c.name, affect: cls.affect || '', cy: cycle}` into `logs/citizen-ripple-state.json` keyed `from->to` (one live entry per pair; overwrite refreshes it).
  2. Read side (perception assembly): entries with `to === woken POPID` and age < 12 cycles render one line — `You crossed paths with <fromName> recently; they seemed <affect lowercased or 'preoccupied'>.` — appended after the bonds block. Consume (delete) rendered entries on live runs; dry runs leave state untouched (same discipline as tension state).
  3. Expiry: silent drop of entries older than 12 cycles at load, mirroring `TENSION_EXPIRY_CYCLES`.
- **Verify:** sandbox: force-wake A (`--pop`) with a reflection naming bonded B (seed via test intake), confirm state entry; force-wake B → line renders, entry consumed; second B wake → absent.
- **Status:** [x] shipped S312 — verified: read side renders + consumes live (POP-00001→POP-00018 trace, state emptied), dry runs leave state untouched, 12-cycle expiry at load; write side (bond-name match → upsert) fires organically, grep cron log for "ripple <-". Activates engine.53 conversations.

### Task 5: Extract shared perception assembly to `lib/wakePerception.js`

- **Files:**
  - `lib/wakePerception.js` — create (extraction only, zero behavior change)
  - `scripts/citizen-wake.js` — modify (require the lib, delete the moved bodies)
- **Steps:**
  1. Move the pure perception functions — `buildPool`, `recentEventMagnitude`, `loadLifeArc`, `loadSportsSlice`, `loadNeighborhoodTexture`, `loadBonds`, `loadOwnPageReadback`, `dialTrajectory`, `coResidents`, plus Task 3's `loadEditionSlice` and the constants they carry — into `lib/wakePerception.js`, exported by name. No logic edits; `citizen-wake.js` requires and destructures.
  2. Keep wake-only concerns (rotation state, tension state, prompt framing, cron entry, provocation call) in `citizen-wake.js`.
- **Verify:** `node scripts/citizen-wake.js --dry-run` before/after extraction → byte-identical system prompt for the same forced `--pop`/`--cycle`/`--wake`; `grep -c "function buildPool" scripts/citizen-wake.js` → 0.
- **Status:** [x] built S300 (engine-sheet). Both verifies pass (prompt diff byte-identical on (c100, morning); buildPool grep → 0; wake 512→253 lines). One addition beyond spec: `buildPool(opts)` takes `{shapedMin, lifeMinChars}` overrides (defaults = wake constants, zero behavior change) so edition voicing can reach below the shaped floor.

### Task 6: Conversation engine — `scripts/citizen-conversation.js`

> **AMENDED S312 — build lands in [[2026-07-11-agent-exchange-engine]] instead.** The spec below
> is adopted verbatim as that engine's conversation format (its Task 1); the file ships as
> `scripts/citizen-exchange.js` (same single-file authorization) with interview + debate formats
> beside it. Task 7's cron likewise moves there (its Task 5). Do not build this task standalone.

- **Files:**
  - `scripts/citizen-conversation.js` — create
- **Steps:**
  1. CLI: `node scripts/citizen-conversation.js [--dry-run] [--popA=... --popB=...] [--cycle=N]`. Without explicit pops: scan `logs/citizen-ripple-state.json` for the freshest un-consumed entry whose pair holds an active `Relationship_Bonds` row; no eligible pair → clean exit 0 ("no conversation today"). Cadence cap: `logs/citizen-conversation-state.json` stores last-run date; max 1 live conversation per day.
  2. Build each side's system prompt from `lib/wakePerception.js` (Task 5) — same slices as a wake — plus a conversation frame: `You are talking with <other name>, <bond phrase from loadBonds>. Speak as yourself, plainly, 2-4 sentences per turn.` If a ripple entry triggered the run, the initiator's frame carries it: `You've been thinking about <name> lately.`
  3. Dialogue: 3 turns per side, alternating DeepSeek calls (same model/params as `generateVoice`), each side receiving the running transcript as alternating user/assistant messages from its own point of view.
  4. Live writes per participant, wake-parity: append their OWN lines to their OWN page (`daypart='CONVO'`, via `lib/citizenPage.appendReflection_`); classify their own lines via `classifyTripleReflection_` with their open tensions; apply tension open/resolve to `logs/citizen-tension-state.json` + typed page lines (mirror `citizen-wake.js` step 3); append one `Reflection_Intake` row (`daypart='CONVO'`, `applied='no'`). Consume the triggering ripple entry.
  5. Canon guard, stated in the file header like the wake's PHASE-1 GATE: page + intake + local state ONLY — never LifeHistory, never dials, never ledger writes.
- **Verify:** `--dry-run --popA=POP-00001 --popB=POP-00210` prints both system prompts + full transcript, writes nothing; live sandbox run → 2 page docs, 2 intake rows, ripple consumed, cadence stamp written; `compressLifeHistory.dial.test.js` untouched passes.
- **Status:** [ ] not started

### Task 7: Conversation cron wiring

- **Files:**
  - PM2/cron config (wherever `citizen-wake.js`'s five daily fires live) — modify
- **Steps:**
  1. Add one daily fire for `scripts/citizen-conversation.js` at 17:00 (between the afternoon and evening wakes — a conversation lands before the evening reflection can reference it).
  2. No-op days cost one scan and exit 0 — confirm the cron treats exit 0 silently.
- **Verify:** cron/PM2 list shows the entry; forced run on an empty ripple state logs "no conversation today" and exits 0.
- **Status:** [ ] not started

### Task 8: Tensions → /sift story seeds *(media terminal)*

- **Files:**
  - `.claude/skills/sift/SKILL.md` — modify
- **Steps:**
  1. Add a sourcing step: read `logs/citizen-tension-state.json`; for each OPEN tension, emit a story-seed candidate line — `popId | citizen question ("...") | opened c<N>` — into the sift working set, flagged `source=tension-register`.
  2. Scope note in the skill text: tensions are SUBJECTIVE material — a reporter can knock on the door (interview/dispatch), but the tension text itself is never publishable as fact (subjective→canon wall).
- **Verify:** dry `/sift` pass on a non-empty register lists the candidates section; empty register → section absent.
- **Status:** [ ] not started

### Task 9: Edition voicing offload — `scripts/citizenVoice.js` *(engine-sheet; Mike-direct S300)*

Added S300, Mike-direct: "when citizens get used, we use OpenRouter to ask them instead of
the letters skill's one LLM voicing them all — they voice themselves cheaper on OpenRouter."
The first edition-run offload agent, and the assembly Task 6's conversations reuse.

- **Files:**
  - `scripts/citizenVoice.js` — create (thin consumer of Task 5's `lib/wakePerception`)
- **Steps:**
  1. CLI: `--pop=POP-XXXXX --ask="..."` (or `--stdin`) `[--cycle=N] [--dry-run] [--json] [--max-tokens]`. Assemble the wake-parity system prompt (dials→disposition, LifeHistory tail, co-residents, bonds, sports, texture, fenced page memory); user prompt = the desk's ask (sanitized via memoryFence) + a plain-speech guard. DeepSeek call, same model/params family as `generateVoice`.
  2. Voicing floor: `buildPool({shapedMin:0, lifeMinChars:0})` — an edition-named citizen speaks even at mild deviation; no DialState at all → exit 2 (caller falls back to desk-voiced).
  3. **Canon guard:** READ-ONLY — no page docs, no intake, no dials/LifeHistory, no state, no markRecalled. A voiced line becomes canon only via edition publication (existing wall).
- **Media handoff (letters/interview skills call this per citizen — media terminal wires it, same split as Task 8):** desk builds the ask from the story context, calls once per citizen, formats the returned text.
- **AMENDED S312 — handoff executes via [[2026-07-11-citizen-voice-quote-supply]] (pipeline.43, Mike-direct priority avenue).** That plan wires the /write-edition quote-supply pre-pass + letters, and its Task 1 amends the canon guard above: READ-ONLY becomes the *default*; a new opt-in `--record` flag runs the wake write block (page `daypart='PRESS'` + gated `Reflection_Intake`) so the citizen records the speaking at quote time. Dials stay behind the cycle drain.
- **Verify:** dry-run prints wake-parity prompts; live call returns in-voice text grounded in the citizen's real bonds/texture; `--pop` with no dials exits 2.
- **Status:** [x] built S300 (engine-sheet). Verified: dry-run assembly correct (POP-00022 — dials, life tail, co-residents, bond, texture all present); live DeepSeek letter grounded in his actual bond + hood texture; media wiring open (handoff above).

### Task 10: Card-anchor slice — the wake reads the wd-card *(engine-sheet; added S312)*

S312 finding (Mike-direct): cron-Vinnie's prompt carried temperament but not the facts of his
life — no farewell season, no wife, no gala. The facts already live in his wd-citizen card
(compiled by `scripts/buildCitizenCards.js`, kept fresh by `wdCardsDaemon` + /post-publish
rebuilds, derived-never-authored per ADR-0007) — the wake just never reads it.

- **Files:**
  - `lib/wakePerception.js` — modify (new `loadCardAnchor(popId)`)
  - `scripts/citizen-wake.js` — modify (wire into `buildVoicePrompts` as a `Who you are:` block)
- **Steps:**
  1. `loadCardAnchor(popId)`: fetch the citizen's wd-citizens docs by `metadata.popid` (Supermemory API, same auth as `buildCitizenCards.js`); deterministic template-distill — bio line + 2–3 newest appearance lines + fame line + marital line, cap ~600 chars, NO LLM in the distill. Graceful `''` on miss/timeout (wake never blocks on the card).
  2. Fence it (`memoryFence.wrap`, tag `citizen-card:<popId>`) and place it first in the system prompt — identity anchor precedes perception. Anchor lines are canon; they never compete with page recall.
  3. Dry-run flag prints the block; cache per-run only (no state file).
- **Verify:** `--dry-run --pop=POP-00001` → prompt opens with farewell-season/rings/academy facts from the live card; a thin-card citizen degrades to no block, no crash.
- **Status:** [x] shipped S312 — loadCardAnchor (list→GET route per S272 v4-search-miss finding), deterministic distill (Bio/Life/Fame + 3 appearance lines, cap 600), fenced `citizen-card:<pop>`, placed before perception. Verified: Vinnie's prompt opens with farewell-season/436-homers/rings/academy facts; miss degrades to no block.

### Task 11: Voiced speech-texture slice *(engine-sheet; added S312)*

- **Files:**
  - `lib/wakePerception.js` — modify (new `loadVoiceTexture(popId)`)
- **Steps:**
  1. For citizens with a `.claude/agents/citizen-voice-*/IDENTITY.md` whose `POP ID:` matches (same enumeration as Task 2): extract ONLY the speech/voice section (cadence, verbal habits, motifs — no biography, no dial claims; those flow via card + dials so the authored file can't fight live drift, ADR-0014).
  2. Append to the system prompt as `How you talk:` (~300 chars cap). Non-voiced citizens: no block.
- **Verify:** Vinnie's dry-run carries his cadence lines; a non-voiced citizen's prompt is unchanged byte-identical.
- **Status:** [x] shipped S312 — loadVoiceTexture extracts '## Your Voice' bolded leads + tone range only (no biography/dial claims, ADR-0014), 300-char cap, 'How you talk:' block. Verified: Vinnie carries cadence; non-voiced citizen has zero block.

### Task 12: Salience-weighted life tail *(engine-sheet; added S312)*

S312 finding: Vinnie's "recently" block was five atmospheric dailies ("unwinding in the
evening", "noticed more masks") — milestone events get evicted by texture volume, then
reflections ground on mush and the page's center of gravity drifts generic (the flattening
loop). Sibling of the S281 persistence-seams Task-1 finding.

- **Files:**
  - `lib/wakePerception.js` — modify (the LifeHistory tail selection feeding `c.life`)
- **Steps:**
  1. Split the recent window by tag class: milestone/high-salience tags (Wedding/Birth/Death/Health/Promotion/Retirement/Conduct + edition citations) vs texture tags (Daily/PrevEvening/atmospheric). Tail = up to 3 newest milestones (any age within the raw window) + 2 newest texture lines, newest-first — a wedding never loses its slot to a mask-count.
  2. Tag classes from [[../engine/TAG_REGISTRY]] — don't hand-list beyond what it defines.
- **Verify:** a citizen with a milestone 8 entries back + 7 newer dailies → milestone present in the dry-run prompt; all-texture citizens unchanged.
- **Status:** [x] shipped S312 — tail = up to 3 newest SALIENT_TAG lines (TAG_REGISTRY life-stage/health/conduct/advancement/E{n}) + texture fill to 5, chronological. Verified: wedding survives 7 newer dailies; all-texture citizens unchanged at 5 lines.

### Task 13: Spousal bond visibility — data gap *(engine-sheet; added S312)*

S312 finding: POP-00001 is `MaritalStatus=married` (Amara Keane = POP-00002, married) but
`Relationship_Bonds` holds ZERO rows for him — `loadBonds` correctly renders nothing. The
marriage exists only in the marital column, invisible to the wake, conversations, and voicing.

- **Files:**
  - `Relationship_Bonds` sheet + `scripts/` (audit query first — measure-twice)
- **Steps:**
  1. Audit: count married/partnered SL citizens with no `Relationship_Bonds` row linking the pair (match spouse by shared last name + household/ParentIds-ChildrenIds where present; ambiguous pairs listed, not auto-linked).
  2. Backfill unambiguous spousal bonds (`BondType='marriage'`, `Origin='S312 marital backfill'`, current cycle) via `lib/sheets` direct write with read-back verify. Ambiguous list → Mike.
- **Verify:** post-backfill `--dry-run --pop=POP-00001` renders Amara in "People you have history with"; audit re-run reports 0 unambiguous gaps.
- **Status:** [x] shipped S312 (scoped down on evidence) — audit showed surname+marital matching CANNOT distinguish spouse from sibling/parent (Zaniya Adams matched to 2 men; Cabrera 49↔24 likely mother-daughter; only 1 of 16 'clean' pairs had household corroboration). Backfilled ONLY the 2 externally-corroborated pairs: POP-00001↔POP-00002 (IDENTITY canon) + POP-00005↔POP-00594 (same HouseholdId + canon), BondType='romantic' (engine wedding-path vocab; plan's 'marriage' kept as BOND_PHRASE alias), read-back verified; Vinnie's wake now renders 'Amara Keane, your partner in life'. Remaining 14 speculative pairs + 28 ambiguous → §T13 handoff below, Mike's call. Side-finding: Relationship_Bonds was MIXED-KEYED — FIXED same session S312 (6 prod + 8 sandbox rows repaired to POPIDs; normalizeBondCitizenId_ at makeBond_ + persist boundary; dual-shape membership map preserves Row-33 intensity updates; desk-packet filter matches both).

---


## T13 handoff — RESOLVED (Mike-direct S312): do NOT link the speculative pairs

**Ruling:** the ledger is the TRACKED sample (Tier 1–4, ~1:448 of a ~300k city); spouses and
kids are usually Tier-5 off-sample by design. A married ledger citizen with no on-ledger
spouse is CORRECT, not a gap. Same-surname married pairs are coincidence (siblings, cousins,
parent-child) unless canon says otherwise. The 14 speculative pairs below are retired —
listed for the record only. On-ledger couples exist only when canon documents both sides
(Vinnie↔Amara, Mags↔Robert — the two S312 backfills stand).

**Mechanism note (verified in code):** the engine already enforces this. `checkWedding_`
(0.2–0.4%/cycle, 1–2 weddings/cycle cap) marries citizens to an IMPLICIT Tier-5 spouse —
`MaritalStatus` flips, no bond row. A tracked-couple bond forms only when a romantic bond
already exists between two ledger citizens (`spouseId` path), and none do outside the two
canon backfills — so tracked citizens will not chain-marry each other over time.

Retired list (record only): Rodriguez POP-00027/00104 | West POP-00064/00518 | Carter
POP-00066/00310 | Han POP-00151/00954 | Adams POP-00281/00942 | Carmichael POP-00469/00876 |
Nair POP-00531/00815 | Reed POP-00634/00938 | Choi POP-00807/00857 | Wu POP-00823/00867 |
Cabrera POP-00847/00891 | Morales POP-00852/00896 | Doan POP-00872/00921 | Zhou
POP-00877/00892 | Abebe POP-00918/00933. The 355 married citizens with no same-name
candidate have Tier-5 spouses — correct as-is.

## Open questions

- [ ] Task 6 turn count (3/side) and Task 7 cadence (1/day) are starting values — engine-sheet tunes at smoke-test against DeepSeek cost per conversation; not blockers.

---

## Changelog

- 2026-07-11 — **Tasks 10–13 added (S312, research-build, Mike-direct anti-flattening).** Card-anchor slice + voiced speech-texture + salience-weighted tail + spousal bond backfill; findings documented in each task's header note.
- 2026-07-11 — **Tasks 6+7 amended (S312, research-build, Mike-direct B+C design).** Conversation
  engine + cron generalized into the three-format exchange engine before first build —
  spec adopted verbatim as format 1 in [[2026-07-11-agent-exchange-engine]] (engine.53).
- 2026-07-06 — **Task 5 + Task 9 built (S300, engine-sheet, Mike-direct).** Perception assembly
  extracted to `lib/wakePerception.js` (byte-identical verify; wake 512→253 lines);
  `scripts/citizenVoice.js` shipped — first edition-run offload agent: per-citizen OpenRouter
  voicing from wake-parity perception, read-only canon guard. Task 6 conversations now have
  their assembly. Media wiring of the voice CLI into letters/interview skills = open handoff
  (Task 9 note). Tasks 1–4, 6–7 unstarted.
- 2026-07-06 — Initial draft (S298, research-build). Executes [[../research/2026-07-06-citizen-loop-deepening]] lanes 2+3; conversation engine upgraded from feasibility to build per Mike-direct S298.

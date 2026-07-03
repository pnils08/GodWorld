---
title: Persistence Seams + Event-Content Ledger Design
created: 2026-07-01
updated: 2026-07-01
type: plan
tags: [engine, citizen-loop, active]
sources:
  - docs/engine/ROLLOUT_PLAN.md §engine.38 (research-build design-pass tag, S280)
  - docs/plans/2026-06-30-central-generator-atmospheric-expansion.md §Depth step (seam specs, Mike direction S280)
  - docs/plans/2026-06-04-mags-citizen-loop.md (research.14 — wake loop, salience deferral)
  - utilities/compressLifeHistory.js, utilities/citizenMemory.js, utilities/citizenDialMap.js (substrate reads, S281)
  - scripts/citizen-wake.js, phase05-citizens/generateCitizensEvents.js, phase01-config/godWorldEngine2.js (substrate reads, S281)
pointers:
  - "[[engine/ROLLOUT_PLAN]] — parent rollout (engine.38 depth step)"
  - "[[2026-06-30-central-generator-atmospheric-expansion]] — sibling plan; depth build order lives there"
  - "[[SCHEMA]] — doc conventions"
  - "[[index]] — add entry in same commit"
---

# Persistence Seams + Event-Content Ledger Design

**Goal:** Build-ready specs for the shared event-content ledger and the four persistence seams (bias ledger / tension register / unlived-life register / resonance-weighted recall) so engine-sheet and the loop scripts can build each as a gated slice without re-deriving design.

**Architecture:** One new sheet tab (`Event_Content_Ledger`) centralizes pool text with a fragment-pull composer; one new Simulation_Ledger column (`MemoryRegisters`, DialState-pattern JSON) holds the two durable per-citizen registers (biases, unlived), both written only by the Phase-9 compressor fold; the tension register and resonance recall live entirely loop-side (node scripts + citizen Supermemory page + `logs/` state), touching no engine schema. This is the "ledgers adapt" half of the north star — the engine keeps emitting lived events; these seams make what's already lived persist, resurface, and shape voice.

**Terminal:** research-build (this design) → engine-sheet (all engine + script builds) — engine-sheet is mid-session; nothing here lands until they pick it up in a clean window.

**Pointers:**
- Prior work: atmospheric expansion plan §Depth step (seam list + Mike's directions); research.14 plan §"Deferred: durable salience layer"
- Substrate contracts this design was verified against (S281 code reads):
  - Per-citizen durable record pattern: `DialState` JSON-in-cell — additive fields, defensive parse, never wiped (`utilities/compressLifeHistory.js:929-944`)
  - Intake/drain pattern: `Reflection_Intake` rows `applied='no'→'yes'`, drained once inside Phase-9 compressor (`compressLifeHistory.js:239`, `utilities/citizenMemory.js:126-143`)
  - Fold-once-by-construction: trim window physically removes what the fold consumes (`compressLifeHistory.js:950-964`)
  - Wake loop never writes dials/LifeHistory; writes citizen page + `Reflection_Intake` only (`scripts/citizen-wake.js:12-18,387-405`)
  - `base` write paths (closed set of 4): init / streak≥3 harden / bounded reflection accretion / chaos escalation (`utilities/citizenMemory.js:60-95,126-143`; S275 accrueChaos_)
  - Determinism: `ctx.rng` cycle-seeded, `ctx.rngFor(salt)` sub-streams, `Math.random` banned fail-loud (`generateCitizensEvents.js:119-126`, `utilities/cycleModes.js:160-179`)
  - Tab-loader pattern: fail-soft by-header resolution (`phase02-world-state/loadNeighborhoodState.js:23-87`)
  - Schema discipline: new tab/column ⇒ `docs/SIMULATION_LEDGER.md` + `SCHEMA_HEADERS` regen + `SHEETS_MANIFEST` same commit (`.claude/rules/engine.md`)

**Acceptance criteria:**
1. Each of the five designs below names: storage, write path, read path, caps, and the invariants it must not break — with no "TBD."
2. No design adds a fifth write path to dial `base`, writes composure outside the affect-only contract, or stores citizen specifics not derived from actual LifeHistory.
3. Every build task is a gated slice engine-sheet can execute standalone (exact files, verify step), sequenced against the C101 G-EC33 watch and the pending deliberate-clasp window.

---

## Design A — Event-Content Ledger + fragment composer

**Problem.** Pool text is hardcoded across `generateCitizensEvents.js` and the six mode engines — deepening means editing many files and a deploy; Baylight and Tribune content are already parked on this (atmospheric plan changelog 2026-07-01, items 5b/5c). Mike's direction (S280): sheet-resident content plus a compositional fragment randomizer generalizing the tone-slotter.

### Storage: new tab `Event_Content_Ledger`

| Col | Header | Notes |
|---|---|---|
| A | `Kind` | `line` (complete pool line, may contain `$SLOT` tokens) or `fragment` (fills one slot) |
| B | `PoolKey` | dot-namespaced pool: `baseDaily.family`, `chaos.reaction.heard`, `baylight.construction`, `tribune.readership`, `mode.civic.depth`… |
| C | `Slot` | fragments only: slot name this text can fill (`SENSORY`, `PLACE_DETAIL`, `TIME_OF_DAY`…). Empty for lines. |
| D | `Text` | the content. Fragments: lowercase clause, no terminal punctuation (grammar-safety rule below). |
| E | `Weight` | number, default 1 — feeds existing `pickWeighted_` shape |
| F | `Conditions` | eligibility micro-DSL (below); empty = always eligible |
| G | `Tags` | comma list — primary dial tag first (routes via DIAL_MAP primary-tag-first contract, byte-safe per S280 verification) |
| H | `Grain` | `heard` / `lived` / empty — reaction-grain rule (S280) |
| I | `Active` | `yes`/`no` — kill switch without row deletion |

**Conditions micro-DSL.** `;`-joined AND terms, `field op value`. Whitelisted fields only, mapping 1:1 to the S280 column gates already in code (S289 correction: gates live at `generateCitizensEvents.js:~1924-1960`, not 1824-1858): `wealth<=3`, `married`, `children>0`, `displacement>=7`, `hood=Temescal`, `season=summer`, `retired`, `ageband=senior`. Unknown field or unparseable term ⇒ row skipped and counted (fail-closed — a typo must not widen eligibility). Parser is one small function; no eval.

**DSL field-resolver table (S289 — vocab locked to code enums, not prose).** Fields resolve from three scopes; the evaluator needs all three:
| Field | Resolves from | Values |
|---|---|---|
| `wealth` | citizen row `iWealth` | number 1-10 |
| `married` | citizen row marital (lc) | flag |
| `children` | citizen row children count | number |
| `retired` | citizen row status | flag |
| `ageband` | `ageGroup_(birthYear)` | `youth`/`youngAdult`/`adult`/`senior` — **NOT `elder`**; fail-closed parsing means a wrong enum silently kills the row |
| `hood` | citizen row neighborhood | exact tab-name match |
| `season` / calendar | cycle ctx | engine season vocab |
| `displacement` | citizen row `DisplacementRisk` (S289 build correction: the code's own S280 gate reads the row column at ≥7, not hood-state — implemented to match) | number 0-10 |

Conditions parse **once at load** into predicate objects (Task 10 loader), never re-parsed per-citizen per-draw across 900+ rows.

### Loading

`phase02-world-state/loadEventContentLedger.js`, mirroring `loadNeighborhoodState.js` exactly: missing tab → return (generators fall back to hardcoded pools — additive rollout, zero risk); by-header column resolution; malformed rows skipped + counted. Produces `S.contentLedger = { lines: {poolKey: [entry]}, fragments: {slot: [entry]}, skipped: N }` where `entry = {text, tags, weight, conditions, grain}` — the existing `makeEntry` shape plus `conditions`. One added `getDataRange().getValues()` per cycle + one `safePhaseCall_` registration line (measured cost of the pattern; negligible).

### Composer: `composeContentLine_(ctx, entry, citizenCtx)`

Extends `renderTemplate_` (`generateCitizensEvents.js:687-695`): for each `$SLOT` token in a line's text, weighted-draw an eligible fragment from `S.contentLedger.fragments[SLOT]` (conditions checked against the same citizen row fields), substitute via the proven `split("$"+k).join(v)` mechanism, then capitalize first letter + add terminal period. All draws through `ctx.rng` — no `Math.random`, replay-identical per cycle.

- **Unfillable slot ⇒ drop the whole line + count (S289).** If a line's `$SLOT` has zero eligible fragments (all fail conditions, or slot pool empty), the line is skipped entirely — never emit raw `$SENSORY` into LifeHistory text. Same fail-closed family as the DSL rule.
- **Grammar safety** is structural, not checked: a slot defines a grammatical role; every fragment registered under that slot must fit it (authoring rule in the tab, enforced by the lowercase/no-punctuation convention + human read of `skipped` counts). No NLP validation pass.
- **Slot values already available in code** (`$VENUE`, `$CONTACT`, `$INSTITUTION`) keep their code-side resolvers (bonds, localEntities); the ledger adds *content* slots, it does not re-plumb the entity slots.
- **Dedup:** within-cycle per-citizen rendered-line hash (extends the S277 hard dedup). ~~Cross-cycle pool-walk offset~~ **deferred to v2 (S289):** `(popIdHash + cycle) % poolSize` offsets an *index*, but `pickWeighted_` walks cumulative weights — no index exists to offset, and rotating the array before a weighted draw changes nothing. v1 keeps plain weighted draw + within-cycle dedup; if cross-cycle repetition reads bad in practice, v2 specs a concrete mechanism (rotate-then-uniform-pick, weights forfeited for offset pools). Findings #5 (inert template cooldown) stays open, not superseded.
- **Determinism caveat (accepted, documented):** replay fidelity becomes seed × ledger-content — editing the tab between a cycle and its replay changes output. Same property the Neighborhood_Map already has; note it in `SHEETS_MANIFEST`.

### Pool injection — the draw-site bridge (S289 critique: was missing entirely)

The loader and composer alone leave ledger content with **no consumer**: the generator builds one per-citizen `pool` array by pushing entries from ~20 gated hardcoded blocks; nothing in the original Tasks 10-12 wired `S.contentLedger.lines[poolKey]` into that assembly — Task 12's verify could not pass as written. The bridge (Task 11 scope):

1. **Injection block** in the per-citizen pool assembly: for each poolKey, eval the row's (pre-parsed) conditions against the citizen/hood/cycle scopes; eligible `line` entries push into `pool` via `makeEntry` alongside the hardcoded blocks. Composer resolves `$SLOT`s only if the drawn entry came from the ledger.
2. **Routing is fail-closed on `source:` tag (S289).** Routing goes through `primaryFromTags()` (`generateCitizensEvents.js:589-632`), which switches on known `source:` tags — an unrecognized source falls through to `Daily` silently. Rule: every ledger line row MUST carry a recognized `source:` tag from the code's whitelist as its first tag; loader skips + counts rows whose source tag isn't recognized. New sources (e.g. `source:baylight`) require an explicit `primaryFromTags` branch in the same commit that seeds the pool.
3. **Collision rule — additive-only v1 (S289).** A ledger poolKey never replaces or suppresses a hardcoded pool; ledger entries only add. Migration of a hardcoded pool = delete the hardcoded block in a code commit, an explicit later step — never implicit shadowing.

### Disposition

New content lands ledger-native first: `baylight.construction` (canon-timeline content that must not drift hardcoded — parked item 5c) and `tribune.readership` (parked 5b; still needs its edition-headline ctx feed, separate seam). Existing hardcoded pools migrate opportunistically, never as a big-bang rewrite. The mode-engine depth-parity block (thin mode engines drawing from the same ledger) is the payoff milestone.

---

## Design B1 — Asymmetric bias ledger

**What it is.** Per-citizen opinions about people they may never have met — `target / sentiment / origin / reinforced / challenged`. *(Correction, S283: the texture version — bias-lite pool — did NOT ship in the S280 depth build as this design assumed; the atmospheric plan's changelog shows depth items 1–4/5a/6 shipped, bias-lite neither shipped nor deferred. Task 6 therefore built the pool AND its intent hook together.)* This design makes the opinion *persist and evolve*.

### Storage: new SL column `MemoryRegisters` (shared with B3)

One new Simulation_Ledger column holding `{"biases":[...],"unlived":[...]}` — DialState pattern exactly: additive fields, defensive parse (corrupt/empty → `{}`), never wiped, serialized only by the compressor. One schema change covers both registers (measure-twice + `SIMULATION_LEDGER.md` + `SCHEMA_HEADERS` regen + `SHEETS_MANIFEST`, same commit — same discipline Mike set for `HousingType`).

Bias record: `{t:"POP-00789"|name, s:-3..3, o:"tag|E103", r:0, c:0, cy:101}` (target / sentiment / origin / reinforce-count / challenge-count / last-touched cycle). **Cap 5 per citizen**; evict lowest `|s|`, oldest first. Sentiment is bias-local — it never touches dials.

### Write path: intent → Phase-9 fold (no new row-write phase)

Generators that emit opinion-bearing events (bias-lite pool, Tribune readership once built, shared-reaction density once built) also push `S.biasIntents[popId].push({t, s, o})` at emit time — cheap ctx tally, exact same shape as the reaction-density counter Mike directed for shared-reaction→arc. The Phase-9 compressor drains intents into `MemoryRegisters` inside the per-row read-modify-write it already does — the `Reflection_Intake` drain precedent (`compressLifeHistory.js:379-386`), fold-once by construction:

- same target, same sign → `r++`, `s` steps 0.5 toward its pole (max |3|)
- same target, opposite sign → `c++`, `s` steps 1.0 toward 0; on crossing 0, sign flips and `r/c` reset to 0/0 — challenge is stronger than reinforcement (asymmetry the source idea wanted)
- new target → insert (evict per cap)

### Read paths

1. **Wake loop:** if a perception slice mentions a bias target (name match), the bias record joins the prompt ("you have never trusted X since E103"). Hook: prompt assembly in `buildVoicePrompts` — one lookup, no scoring needed.
2. **Generators:** bias-conditioned reaction lines — a citizen with `s<=-2` toward the mayor draws from a different reaction register on mayor-tagged events. Conditions-DSL extension later (`bias(target)<=-2`), not v1.
3. **Story seeding:** desk agents query via the dashboard/queryLedger surface as with DialState.

**Invariant check:** biases never write dials — opinion is not identity. No composure, no base. ✓ Targets restricted to **named public figures and canon entities the citizen's own events reference** (origin field is mandatory) — derives from lived events, no invented relationships. ✓

---

## Design B2 — Tension register (loop-side only)

**What it is.** Unresolved questions a citizen carries between wakes, resurfaced until resolved or expired. The stateless texture version already rides baseDaily (Reflection/Identity domains); this is the persistent version. DeepSeek-sourced, adapted.

### Storage: loop-side, zero engine schema

- Typed line appended to the citizen's Supermemory page: `TENSION[c101]: <one open question in the citizen's voice>` — the page is already the wake's durable memory surface (`lib/citizenPage`).
- Small index in `logs/citizen-tension-state.json` (`{popId: [{q, cy, status}]}`) so the wake can load open tensions without a page search — precedent: `logs/citizen-wake-state.json` rotation state.

### Write path

Extend the dual classifier (`lib/reflectionClassifier.js`) with a third **optional, nullable** field: `TENSION` — "if this reflection leaves a question the citizen is still sitting with, state it in ≤120 chars; else NONE." Null preserved as-is (same drift-tripwire discipline as the affect tag). Written at wake time alongside the page append. **Not** written to `Reflection_Intake` — tensions never drain into dials; they are voice-memory, not dial input.

### Resolution + expiry

- Wake prompt includes the citizen's open tensions (cap **3**; oldest evicted).
- The same classifier pass answers: "does this reflection resolve any listed open tension? (index or NONE)" — resolved tensions flip `status:resolved` in the state file and get a `TENSION-RESOLVED[cN]` page line (the arc is itself story material).
- Unresolved tensions expire after **12 cycles** (tension fades; matches the archiver's retain window) — expiry is silent, no page line.

**Invariant check:** no dial writes, no sheet writes, no LifeHistory writes — pure voice-layer. Composure untouched. ✓ Tension text originates from the citizen's own reflection over lived events — no invented canon. ✓

---

## Design B3 — Unlived-life register

**What it is.** Paths not taken that resurface when the current life rhymes. Kimi-sourced; standing caution from the S280 grading: invented specifics = pseudo-canon — **every unlived entry must derive from a branch event actually recorded in LifeHistory, or stay vague.**

### Derivation rule (the whole design hangs on this)

An unlived entry is created **only** when a branch-shaped event leaves the raw-20 LifeHistory window — i.e., inside `foldAgedOutEntries_` (`compressLifeHistory.js:953-964`), where the compressor already walks exactly the entries being trimmed, fold-once by construction. Branch-tag whitelist (v1): `CareerShift`, `Relocation`, `Divorce`, `Retirement`, `BusinessClose`, `DisplacementMove`. The entry stores the *actual* event, not a counterfactual: `{tag:"CareerShift", txt:"<original EventText, ≤120 chars>", cy:87}`. The counterfactual is composed at read time in deliberately vague voice ("the job they didn't take", "the version of them that stayed") — nothing false is ever persisted. **Cap 3 per citizen**, oldest evicted.

Storage: the `unlived` array of the `MemoryRegisters` column (shared schema change with B1).

### Resurface — "when the life rhymes"

Rhyme = tag-family match, deterministic and cheap:
1. **Generator-side:** when a current-cycle event for the citizen carries a tag in the same family as a stored branch (career-family event + stored `CareerShift` → eligible), the atmospheric pool gains one unlived-echo line (`Reflection`/`Identity` domain, composure-light ambient routing, `chanceHit(0.3)` so it stays rare). Text composes vaguely from the stored entry.
2. **Wake-side:** resonance recall (B4) includes unlived entries as recall candidates; context match against the wake's perception slices.

**Invariant check:** written only by the compressor fold (rides the existing fold-once trim path — no new write phase, no double-fold). No dial writes; echo lines route ambient. ✓ Derives strictly from recorded events. ✓ Note: `LifeHistory_Archive` currently has no reader (Findings #2) — this design deliberately does *not* read it; the fold-time capture makes archive-darkness irrelevant for unlived.

---

## Design B4 — Resonance-weighted recall (loop-side only)

**What it is.** The wake's memory selection stops being recency-blind. research.14 explicitly deferred "the durable salience/memory layer" — this is that layer, scoped to the loop. GPT-sourced formula adapted: `resonance × time-since-recall × context-match × dial-affinity`.

### Hook points (verified S281)

1. `loadOwnPageReadback` (`scripts/citizen-wake.js:251-262`) — currently blind most-recent-3. Becomes: gather a wider candidate set (last ~15 page reflections + open tensions from B2 + unlived entries from B3 + latest milestone), score, take top 3.
2. `selectCitizen` (`citizen-wake.js:295-306`) — the `eventMag` sort input. **Repair before weighting** (Findings #3): `recentEventMagnitude` reads only the last LifeHistory line, which post-atmospheric-expansion is usually ambient filler — the selection signal is being diluted by the depth work. Fix: score `max` of per-line magnitudes across the 5-line tail, each damped by line age (`mag × 0.8^age`). Deterministic, no new data.

### Scoring (v1, deliberately no embeddings)

`score = w1·contextMatch + w2·staleness + w3·affectWeight`, seeded deterministic tiebreak (`popId+cycle+wake` — same discipline as `selectProvocation`).

- **contextMatch** — keyword/tag overlap between the candidate memory and today's perception slices (hood texture block, sports slice, top-bond names, wake frame). Plain token overlap; cheap, deterministic, debuggable. Embeddings are a v2 question only if v1 reads flat.
- **staleness** — cycles since this memory last fed a prompt; recall bookkeeping in `logs/citizen-recall-state.json` (`{popId: {memHash: lastCycle}}`). Not-recently-recalled scores higher — this is what stops the same three reflections looping forever.
- **affectWeight** — |affect-tag delta| magnitude at write time (reflections carry their AFFECT tag; tensions/unlived get a flat mid weight). Big-feeling memories resurface more.

All node-side: `lib/resonanceRecall.js` + edits to `scripts/citizen-wake.js`. No engine change, no schema change, no dial writes. Dry-runnable per-wake with `--dry-run` before it touches a live wake.

---

## Interlock + sequencing

```
A  content ledger        — independent; unblocks Baylight/Tribune/mode-parity content
B1 bias ledger      ┐
B3 unlived register ┴─ share the MemoryRegisters schema change + Phase-9 fold slice
B2 tension register — loop-side, independent, needs classifier extension
B4 resonance recall — loop-side; consumes B2+B3 output but ships v1 without them
                       (page reflections + milestone are enough candidates)
```

**Deploy-window rule:** A, B1, B3 are engine-side → they queue behind engine-sheet's pending deliberate clasp (A-continuation Tasks 6/7) and must not confound the C101 G-EC33 sentiment watch — but all three are sentiment-neutral (content storage + opinion records + fold bookkeeping; no sentiment writes), so they need a clean clasp window, not a watch-clear. B2/B4 are loop-side node scripts — deployable independently of clasp entirely; earliest shippable.

**Recommended build order:** B4-fix (the eventMag repair — small, urgent, signal actively degrading) → B4 v1 → B2 → schema slice (MemoryRegisters + SCHEMA regen) → B1 → B3 → A (largest; wants its own session).

---

## Tasks

Handoff slices — all builds are engine-sheet's (engine code and loop scripts both; per engine.38 Phase-C precedent, citizen-wake script work is engine-sheet's). Research-build executes none of these.

### Task 1: eventMag tail repair (B4-fix)
- **Files:** `scripts/citizen-wake.js` — modify `recentEventMagnitude` (L69-76)
- **Steps:** score all 5 tail lines via `dialMap.nudgesForEvent_`, take `max(mag × 0.8^lineAge)`; keep return shape.
- **Verify:** `node scripts/citizen-wake.js --dry-run` → selection log shows non-last-line events winning where expected.
- **Status:** [x] done (S282, engine-sheet) — synthetic harness (buried Divorce 8.32 vs old 1.00; last-line event unchanged; empty→0) + dry-run verified (POP-00286 selected on Wedding at age 2, eventMag=10.24)

### Task 2: recall state + scorer (B4 v1)
- **Files:** `lib/resonanceRecall.js` — create; `scripts/citizen-wake.js` — modify `loadOwnPageReadback` (L251-262)
- **Steps:** implement 3-term scorer + seeded tiebreak; candidate set = last 15 page reflections + latest milestone; recall bookkeeping read/write `logs/citizen-recall-state.json`.
- **Verify:** `--dry-run` on a shaped citizen → prompt memory block ≠ blind most-recent-3; state file updates.
- **Status:** [x] done (S282, engine-sheet) — unit harness (scorer terms + determinism + post-recall reshuffle) + dry-run on POP-00004 (scored fenced block renders; recall state untouched on dry). Also: classify moved before page append + affect/event now ride page-doc metadata (affectWeight input; pre-existing docs score flat-mid); `recentPage_` returns metadata. Live-write smoke = next cron fire.

### Task 3: TENSION classifier field (B2)
- **Files:** `lib/reflectionClassifier.js` — modify (third nullable field); `scripts/citizen-wake.js` — page append + `logs/citizen-tension-state.json` read/write
- **Steps:** extend dual prompt to triple; NONE-preserving; cap 3 open, 12-cycle expiry; resolution check against listed open tensions.
- **Verify:** `--dry-run` shows TENSION extraction on a reflective wake and NONE on a flat one; no `Reflection_Intake` column change.
- **Status:** [x] done (S282, engine-sheet) — `classifyTripleReflection_` (dual untouched for probes; parse never scans tension text for tags); dry-run showed extraction AND null AND a live resolves-hit vs a seeded open tension; 40/40 existing tests + 9/9 parse harness. Prompt-format defect caught by the null tripwire pre-commit (bare literal output line echoed verbatim — every line now carries a `<placeholder>`). Tension docs typed (`metadata.type='tension'`, customId key suffix) + filtered out of Task-2 recall candidates until Task 4 adds them from state.

### Task 4: tensions + unlived join recall candidates (B4×B2×B3)
- **Files:** `lib/resonanceRecall.js` — modify
- **Steps:** add open tensions (flat mid affectWeight) and unlived entries to the candidate set once B2/B3 exist.
- **Verify:** dry-run prompt shows an open tension resurfacing.
- **Status:** [x] done (S282, engine-sheet) — design reconciliation: OPEN tensions render only via B2's dedicated block (double-joining them as candidates would double-render; resolution detection depends on guaranteed visibility), so the candidate set gets **resolved** tensions (settled questions resurfacing when context rhymes) + unlived entries (wired now, dormant until Task 8 fills MemoryRegisters; vague-voice composition at read time per B3 rule, defensive parse). 9/9 harness (incl. corrupt-JSON, tag-phrase fallback, unlived winning a slot on context match) + dry-run: seeded resolved tension resurfaced in POP-00004's fenced memory block.

### Task 5: MemoryRegisters schema slice (B1+B3 substrate)
- **Files:** Simulation_Ledger (new column, manual measure-twice); `docs/SIMULATION_LEDGER.md`, `schemas/SCHEMA_HEADERS.md` (regen), `docs/engine/SHEETS_MANIFEST.md` — same commit
- **Steps:** add column; document; regen headers (`node scripts/regenSchemaHeaders.js`); no code reads it yet.
- **Verify:** regen diff shows the column; engine cycle unaffected (column unread).
- **Status:** [x] done (S282, engine-sheet) — grid was exactly 49 wide, resize→50 required (the documented gotcha); header at AX1 read-back verified, AW intact, data cells blank; SCHEMA_HEADERS regen diff shows `| AX | MemoryRegisters |`; audit script clean at 50 cols / 922 rows. Bonus fix surfaced by the regen: `Reflection_Intake` H header was blank (writer+drain both positional) — `Affect` written. SIMULATION_LEDGER.md + SHEETS_MANIFEST.md updated same commit.

### Task 6: bias intents + fold (B1)
- **Files:** `phase05-citizens/generateCitizensEvents.js` — bias-lite pool pushes `S.biasIntents`; `utilities/compressLifeHistory.js` — drain intents into `MemoryRegisters.biases` in the per-row RMW (reinforce/challenge/evict rules per Design B1)
- **Verify:** dry-run compressor test (pattern of Test 9): synthetic intents → expected JSON; opposite-sign challenge moderates then flips.
- **Status:** [x] done (S283, engine-sheet) — scope note: the bias-lite pool this task was to instrument had never shipped (see B1 correction above), so Task 6 built pool + hook together. Generator: `publicFigures` pre-scan (UsageCount≥8, cap 15, deceased excluded), per-citizen 15%-gated opinion entries (sign ±1 via ctx.rng, `source:bias` → Civic Perception {sociability:2}), intent push ONLY on actual draw (`biasTarget:`/`biasSign:` machine tags, `contactPopId:` pattern). Compressor: unconditional drain (reflection-drain shape — compress-skipped citizens keep intents), `parseMemoryRegisters_` defensive/additive, `foldBiasIntents_` (reinforce +0.5 capped |3|, challenge −1.0 w/ zero-reset + cross-flip, cap-5 lowest-|s|-oldest evict), column-absent inert. 25/25 `scripts/biasFold.test.js` + 49/49 existing dial tests. Dials never touched by sentiment (C4 asserts it).

### Task 7: bias readback in wake prompt (B1 read)
- **Files:** `scripts/citizen-wake.js` — `buildVoicePrompts` gains bias lookup on perception-slice name match
- **Verify:** dry-run with a seeded bias → prompt carries it.
- **Status:** [x] done (S283, engine-sheet) — helper lives in `lib/resonanceRecall.js` (`biasReadback`, beside its register-reading siblings `tensionCandidates`/`unlivedCandidates` — citizen-wake has no exports to test against; one-file deviation noted). Match text = UNfenced perception slices only (life tail, neighbor names, bonds, sports, texture, arc) — fenced page/tension prose deliberately excluded so recalled memory can't trigger opinion lines. Sentiment bands → second-person phrasing; c≥1 carries doubt, r≥2 certainty, doubt outranks; s==0 silent; cap 2. 18/18 `scripts/biasReadback.test.js`. Live verify: seeded POP-00269 AX with Danny Horn(−2,c1)+Mike Paulson(+2,r3) → dry-run rendered "Opinions you carry: You've never trusted Danny Horn — though lately you're less sure. You think highly of Mike Paulson — and nothing has changed your mind yet."; cell cleared to blank after. Observed honestly: the voice treats the opinion as context, not a script — temperament + provocation still dominate the reflection's stance.

### Task 8: unlived capture at fold (B3)
- **Files:** `utilities/compressLifeHistory.js` — in `foldAgedOutEntries_`, branch-tag whitelist capture → `MemoryRegisters.unlived` (cap 3)
- **Verify:** compressor test: aged-out `[CareerShift]` → unlived entry with original text; non-branch tags ignored.
- **Status:** [x] done (S283, engine-sheet) — WITH a prerequisite parser repair (Mike-approved): `parseHistoryLine_` had no branch for the in-world stamps every Phase 4/5 writer emits since S264 (`Y2C48 — [Tag]`, `C100 — [Tag]`, `C? — [Tag]`) — all parsed as **Untagged**, degrading fold tag-routing + TopTags live, and Task 8's whitelist would have captured nothing. Fixed: new stamp branch, cycle derived from the stamp (calendar canon `(Y−1)×52+C`); legacy datetime + bare-tag formats unchanged. Capture rides `foldAgedOutEntries_` (optional `regs` 4th param, fold-once by construction): whitelist {CareerShift, Relocation, Divorce, Retirement, BusinessClose, DisplacementMove} case-insensitive, entry = actual event `{tag, txt≤120, cy}`, cap 3 oldest-evicted. Register cell: ONE parse serves B1 drain + B3 capture, written only when dirty (blank cells stay blank). 23/23 `scripts/unlivedFold.test.js` (parser formats, capture mechanics, integration incl. biases-preserved + no-churn) + 49/49 dial + 25/25 biasFold + 18/18 biasReadback all green.

### Task 9: unlived echo line (B3 read, generator-side)
- **Files:** `phase05-citizens/generateCitizensEvents.js` — rhyme check (tag-family match) → one vague echo entry, Reflection/Identity routing, `chanceHit(0.3)`
- **Verify:** composer test with seeded register + rhyming event → echo line; no rhyme → none.
- **Status:** [x] done (S283, engine-sheet) — rhyme = tag-family match between the stored branch and the LifeHistory 5-line tail (per-branch substring families, e.g. CareerShift ↔ Work/Promotion/job/postcareer). Echo text is a per-tag vague line (mirrors `resonanceRecall.UNLIVED_PHRASE` register) — stored specifics never leak (harness asserts it). Route `source:identity` → Personal; weight 0.9; `chanceHit(0.3)` gate is data-gated (rng draw only on non-blank register, so pre-fill cycles replay byte-identical). 8/8 `scripts/unlivedEcho.test.js` — full-generator end-to-end (fame-test loader pattern): rhyme→drawn, no-rhyme→structural silence, blank/corrupt/non-branch/empty registers silent, [Personal] routing confirmed. Observed rate 6/1000 citizen-cycles — rare by design. Full regression green (fame 12, dial 49, biasFold 25, unlivedFold 23, biasReadback 18).

### Task 10: Event_Content_Ledger tab + loader (A)
- **Files:** new tab (manual, measure-twice); `phase02-world-state/loadEventContentLedger.js` — create; `godWorldEngine2.js` — **two** `safePhaseCall_` sites (S289: production ~L225 + cycle-phases ~L1568 — every phase registration in this engine comes in pairs); SCHEMA/SHEETS_MANIFEST same commit
- **Steps addendum (S289):** conditions compile to predicates at load; unknown field/enum/source-tag ⇒ row skipped + counted.
- **Verify:** cycle with empty tab = no-op; seeded rows appear in `S.contentLedger` counts.
- **Status:** [x] done (S289, engine-sheet) — tab created + header read-back verified (9 cols, existence-checked first); loader mirrors loadNeighborhoodState_ with fail-closed row rules (source whitelist mirrors primaryFromTags, DSL compiled to predicates at load); both safePhaseCall_ sites registered (L226/L1570); 14/14 `scripts/contentLedgerLoader.test.js`; SCHEMA_HEADERS regen (62 tabs) + SHEETS_MANIFEST S289 drift block + SPREADSHEET.md row, same commit. Cycle no-op verify rides the next live run (tab is empty).

### Task 11: fragment composer + pool injection (A)
- **Files:** `phase05-citizens/generateCitizensEvents.js` — `composeContentLine_` + **pool-injection block** (§Pool injection: per-citizen conditions eval, fail-closed source routing, additive-only) + rendered-line dedup (pool-walk offset deferred to v2 per S289)
- **Verify:** fixed seed → identical output across two runs; conditions typo → row skipped + counted; unfillable slot → line dropped, no raw `$SLOT` in output; ledger-sourced line lands in LifeHistory with correct primary routing.
- **Status:** [x] done (S289, engine-sheet) — injection block at end of per-citizen pool assembly (all gate vars in scope; data-gated: empty ledger = zero pushes, zero rng, byte-identical replay); slot-fillability checked at injection so unfillable lines never pool; composer fills fragment slots via `pickWeighted_` + entity slots code-side (VENUE/INSTITUTION/CONTACT mirror the template-fallback resolvers; `!chosenVenue` guard stops double-venue). Two build notes: (1) composer matches pool house style — lowercase clause, no capitalize/period (plan rule assumed standalone sentences; existing pools are clauses); (2) rendered-line dedup added at compose because the S277 filter compares skeleton text while `cycleSeen` stores rendered. 12/12 `scripts/contentLedgerCompose.test.js` (full loader→generator pipeline) + full regression green (loader 14, dial 49, biasFold 25, unlivedFold 23, biasReadback 18, unlivedEcho 8, fame 12, chaosCars 14).

### Task 12: first ledger-native pools (A payoff)
- **Files:** Event_Content_Ledger rows (content authoring): `baylight.construction`, then `tribune.readership` once its headline feed exists
- **Verify:** cycle run emits Baylight texture lines only for eligible hoods/conditions.
- **Status:** [ ] not started

---

## Findings ledger (S281 design pass — noted, not fixed)

1. **Atmospheric-expansion plan changelog self-contradiction** (engine-sheet's doc): 2026-07-01 entries disagree on whether depth items 4 (listening) and 6 (groove) shipped — one says "SHIPPED in-tree," the next lists them "still open." Reconcile before the next depth slice.
2. **`LifeHistory_Archive` has no active reader** (`docs/SPREADSHEET.md:124`) — rows trimmed at the 12k threshold go dark to every consumer. B3 sidesteps it (fold-time capture); a deliberate decision on archive-darkness is still owed.
3. **`recentEventMagnitude` reads only the last LifeHistory line** (`scripts/citizen-wake.js:69-76`) — post-atmospheric-expansion the last line is usually ambient filler, so wake selection signal is actively diluting as depth volume rises. Repair = Task 1. Highest-urgency finding.
4. **`LifeHistory_Log` header alias drift** (`EventTag`/`EventType`, `EventText`/`Description`) tolerated by scattered fuzzy lookups (`citizenContextBuilder.js:405-410`, `citizen-wake.js:101-104`) instead of one canonical accessor. Fragile, low urgency.
5. **Cross-cycle template cooldown is inert:** `TEMPLATE_COOLDOWN_CYCLES=3` state lives in `S.templateCooldowns` (`generateCitizensEvents.js:441-450`) but `ctx.summary` is rebuilt every `runWorldCycle` (`godWorldEngine2.js:184`) — the cooldown degrades to a within-cycle once-per-citizen guard. Design A's deterministic pool-walk offset supersedes it if adopted.

---

## Open questions

None — both resolved 2026-07-01 (Mike, S281):
- **One shared `MemoryRegisters` column.** Basis: column volume (ledger is 49 cols × 907 rows, HousingType already queued as +1; every read is full-width) + writer symmetry (both registers share the single Phase-9 compressor writer, so splitting buys no independent evolution — just a second parse and a second corrupt-cell surface; writes commit as whole-row ranges either way). LLM consumers get one coherent carried-memory object, the DialState precedent.
- **Bias targets v1 = named public figures only** (fame data exists; bond counterparts already carry their own intensity state on Relationship_Bonds).

---

## Changelog

- 2026-07-01 — Initial draft (S281, research-build). Substrate verified by three parallel code reads (compressor/memory, wake loop, slotter/ctx/determinism). Five designs specced; 12 handoff tasks; 5 findings logged.
- 2026-07-01 — Open questions resolved (Mike, S281): one shared `MemoryRegisters` column (volume + writer-symmetry basis); bias targets v1 public-figures-only. Plan ACTIVE; indexed + ROLLOUT back-linked same commit. Builds are engine-sheet's, gated per §Interlock.
- 2026-07-02 — Task 6 DONE (engine-sheet, S283). Measure-twice surfaced a false premise: Design B1's "texture version shipped in the depth build" claim was wrong (bias-lite pool never landed in S280 — changelog cross-check + code grep), so Task 6 built the pool and the intent hook together (Mike-approved scope). B1 §What-it-is corrected in place. `MemoryRegisters.biases` now has its live writer; `.unlived` awaits Task 8. Deploy: local-only, clasp push pending a clean window.
- 2026-07-02 — Task 7 DONE (engine-sheet, S283). B1 read path closed: seeded-bias dry-run on POP-00269 rendered the opinions block in the wake prompt; test cell cleared after. B1 is now end-to-end in code (pool → intents → fold → readback); the engine half (Tasks 6 generator+compressor) still queues for the clasp window — wake-side readback is loop-side and live immediately (reads blank registers as silence until the fold deploys and populates them). Next open: Task 8 (unlived capture at fold).
- 2026-07-02 — Task 8 DONE (engine-sheet, S283) + in-world-stamp parser repair shipped as its prerequisite (measure-twice find: `Y2C48/C100/C?` stamped lines — i.e. every Phase-4/5 event since S264 — parsed as Untagged in the compressor; fold tag-routing was silently degraded live and the B3 whitelist would have fired on nothing). Mike direction folded in: "no real world clocks" — writer audit confirmed all engine LifeHistory writers already stamp in-world; datetime lines in citizen histories are pre-S264 residue the parser still reads. B3 write path closed; `.unlived` fills once the clasp window deploys Tasks 6+8 and cycles trim branch events. Remaining: Task 9 (unlived echo line, generator-side read) + Tasks 10–12 (Design A content ledger).
- 2026-07-02 — Task 9 DONE (engine-sheet, S283). **All B-seams (B1–B4) now closed end-to-end in code** — Tasks 1–9 complete in three chained sessions (S282 Tasks 1–5, S283 Tasks 6–9). Engine-side stack awaiting one clean clasp window: Task 6 (bias pool+intents+fold), Task 8 (unlived capture + stamp-parser repair), Task 9 (unlived echo). Loop-side (Tasks 2/3/4/7) already live at cron wakes. Remaining in plan: Design A content ledger (Tasks 10–12) — wants its own session per §Interlock.
- 2026-07-02 — S289 pre-build critique of Design A folded into body: §Pool injection added (draw-site bridge was missing), fail-closed source routing, DSL resolver table + enum fix, unfillable-slot rule, offset deferred to v2, Task 10 = two safePhaseCall_ sites.
- 2026-07-02 — Tasks 10+11 DONE (engine-sheet, S289): tab live + loader + injection + composer, 26 new tests + full regression green. Design A engine-side complete in code, clasp pending. Remaining: Task 12 (seed first pools — after the deploy window smokes).

# LEP/2 active-package audit — Task 17 gates vs code reality

**Author:** kimi lane | **Date:** 2026-08-11 | **Scope:** static audit of the six
active wake packages against the six non-negotiable gates in
`docs/plans/2026-08-09-three-wake-lived-packet-pilot.md` Task 17, triggered by
the 2026-08-10 Jordan Velez write-wake production failure. Static only — no live
model calls, no attended proofs, no sheet reads (sandbox has no sheet
credentials; snapshot-based reasoning only).

**Method:** read `newsroomWakePackages.js` + `newsroom-wake-packages.json`,
`livedExperiencePacket.js` (v1 base), `livedExperiencePacketV2.js`,
`cron-desk-run.js` (angle/report/write packet path), `newsroom-fanout.js`;
ran `newsroomWakePackages.test.js`, `livedExperiencePacket.test.js`,
`livedExperiencePacketV2.test.js` (all PASS); S361 consistency sweep across
`scripts/`.

---

## Finding A — Jordan write-wake failure, root-caused (gate 4: aligned contracts)

**Production symptom (2026-08-10, C103 write wake, from the fanout failure
ping):** `invalid LEP/2 Packet: manifest quote speaker must be an approved
subject` (repeated per landed quote). Wake dies after angle+report spend.

**Chain:**

1. Jordan's selected storefront signal supplied **no citizen POPIDs**
   (recorded in the Task 13 status note). W1 `exposure.candidates` is therefore
   empty — `candidateRows(story, economicSlice)` returns nothing
   (`livedExperiencePacket.js:59-76`).
2. W2 `collectQuoteAsks` pools story popids first, then **falls back to lane
   entry popids** (`cron-desk-run.js:344-348`). With an empty story pool, all
   asks go to lane-fallback citizens. Each gets a W2 packet built on a
   **synthetic candidate stub** (`{pop, name: null, profile: null, why:
   'desk-signal candidate'}`, `cron-desk-run.js:319-323`) — outside the W1
   evidence world.
3. Interviews land, produce `publishableQuote`s. W3 `buildWritePacket` admits
   **every** interview with a publishable quote into `manifest.approvedQuotes`
   with `speakerId = row.pop` (`livedExperiencePacketV2.js:226-235`).
4. W3 `approvedSubjects`, however, is `W1 candidates ∩ (official targets ∪
   quoted pops)` (`livedExperiencePacket.js:368-380`) — the lane-fallback pops
   are not W1 candidates, so they are filtered out.
5. `assertBase` then throws for each quote whose speaker is not an approved
   subject (`livedExperiencePacketV2.js:101`). Deterministic, every time the
   story is candidate-free and any lane-fallback interview lands.

**Why Task 13 didn't catch it:** the 2026-08-10 hardening narrowed
model-added *targets* to an empty list for candidate-free packets
(W1/W2 side). The quote/subject path one layer down was not narrowed the same
way, and no test exercises a W3 build with an out-of-candidates interview
(Finding D).

**Fix options (both scripts-side, small):**

- **B (recommended): gate the lane fallback behind `!PACKET_ACTIVE`** in
  `collectQuoteAsks`. Under LEP/2 the packet world is the evidence world; a
  lane-fallback quote is unverifiable by the manifest by construction.
  Candidate-free angles then run quoteless — an explicitly supported path
  ("packet will be quoteless" log, empty `approvedQuotes` manifest) — instead
  of dying at W3 after interview spend. Non-packet seats keep the fallback
  unchanged (Task 2.5.4 behavior preserved). Matches the abstain-over-invent
  doctrine and the Task 13 precedent, one layer down.
- A: admit interview speakers into W3 subjects. Weaker — subjects would carry
  `profile: null` stubs and break the `src: 'packet.W1.exposure'` provenance
  claim; enlarges the canon-claim surface past the W1 evidence.

---

## Finding B — registry vs checklist drift (gates 1, 3, 6)

Task 17 (filed 08-10 10:23) records **four** active packages: JAX, CARMEN,
PSLAYER, JORDAN. The registry today has **six** active:

| Registry key | Seat | Active | In Task 17 table as |
|---|---|---|---|
| freelance-firebrand | Jax Caldera POP-00799 | true | [x] package |
| carmen-delaine | Carmen Delaine POP-00011 | true | [x] package |
| p-slayer | P Slayer POP-00008 | true | [x] package |
| business-desk | Jordan Velez POP-00153 | true | [x] package |
| kai-marston | Kai Marston POP-00158 | true | **pending** |
| rachel-torres | Sgt. Rachel Torres POP-00057 | true | **pending** |

Kai (`235ed68`) and Rachel (`d75bff7`) were activated hours after the checklist
was filed; the doc was never updated. By the checklist's own gates, activation
requires a recorded model benchmark (gate 3) and an attended three-wake proof
(gate 6) — neither is recorded for these two seats (nor for the original four:
all six are `[ ] proof`). `newsroomWakePackages.test.js` was updated to expect
six actives and passes, so code/tests/docs are two-against-one.

**Ask:** either backfill the checklist (status log entries + table flips with
whatever validation evidence exists) or set `active: false` for the two seats
until gates 3/6 are documented. Doc-side backfill is in-lane; flipping
`active` touches production behavior — Mike's call.

---

## Finding C — slice → packet chain gaps (gate 4)

The angle artifact carries **all seven** typed slices
(`cron-desk-run.js:1414-1478`: jax, pslayer, evening, anthony, hal, economic,
safety). The packet build sites consult **fewer**:

| Site | Slices consulted | Missing |
|---|---|---|
| W1 `buildAnglePacket` (`cron-desk-run.js:1374`) | jax, pslayer, economic, safety, evening | **anthony, hal** |
| W2 `collectQuoteAsks` (`cron-desk-run.js:304`) | jax, pslayer, economic | **anthony, hal, evening, safety** |

Impact on active seats:

- **Kai** (evening slice): W1 packet sees the slice; W2 quote packets do not —
  W2 candidates collapse to `story.citizens` only, and any slice-citizen quote
  is one fallback-step away from Finding A's mismatch.
- **Rachel** (safety slice): same — W1 yes, W2 no.
- **Anthony / Hal** (pending): their slices never reach any packet stage; the
  builders and artifact plumbing are live but the packet path is disconnected.

**Fix proposal:** one shared helper, e.g.
`packetSlice = angleArt.jaxSlice || angleArt.pslayerSlice || angleArt.economicSlice
|| angleArt.safetySlice || angleArt.eveningSlice || angleArt.anthonySlice || angleArt.halSlice`,
used by **both** sites (and any future W3 consumer), so seat #8 can't drift the
chains apart again. One-line-class change at two sites plus a test that every
slice key attached to the artifact is consumed by the packet chain.

---

## Finding D — test coverage vs gate 5

Existing (all PASS offline): package registry validation + active-set +
routes (`newsroomWakePackages.test.js`); v1 packet contract; v2 fact IDs, W2
packets, slice-shaped W1 candidates (sports, economic), and **no-candidate W1 →
empty targets** (Task 13).

Missing, per gate 5:

1. **W3 speaker/subject mismatch** — a `buildWritePacket` call whose interviews
   include a speaker outside W1 candidates must either throw the exact
   production error (current behavior) or, after Fix B, be unreachable. This
   test would have caught the Jordan failure before deploy.
2. **Slice-key alignment** — every key the artifact attaches is consumed by the
   packet chain (Finding C guard).
3. **Empty-candidate W3** — candidate-free angle → quoteless W3 packet builds
   clean (the supported path Fix B relies on).
4. **Malformed-output tests per package route** — `validateReportOutput` /
   `validateAngleOutput` rejection paths exist in the v2 suite for generic
   cases, but gate 5 asks for persona-specific fixtures; none exist for any of
   the six seats.
5. Gate 5 also asks for recorded "exact model route and expected failure
   behavior" per seat — routes are in the registry and asserted; failure
   behavior is only partially documented (Jordan's failure mode was discovered
   in production, not predicted).

---

## S361 sweep — raw-decimal ban retirement: CLEAN

No surviving enforcement of the retired blanket ban found in `scripts/`:

- `cron-rhea-gate.js` — deterministic raw-decimal scan dropped; both prompt
  sites now draw the S361 line (figures = Civis Systems published data,
  citable; engine *vocabulary* — status enums, table/column names, metric names
  in decimal form — still flagged). POP-id leak scan retained, correctly.
- `cron-desk-run.js` buildLaneState — writer instruction now "figures are Civis
  Systems city data and may be cited by name" (was "do not lead with raw
  decimals").
- `lintCivicPackets.js:48` (`metric-decimal`) — flags raw **decimal form**
  adjacent to metric words (`sentiment 0.708`-class). That is the vocabulary
  half of the rule (engine-internal representation leaking), not the figure
  half — consistent with S361. Civic-packet surface, not articles.
- `validateEdition.js` — vocabulary patterns only (`simulation`, `phase N`,
  `media intake`, `story seed`); no figure policing. Consistent.
- `livedExperiencePacketV2.auditArticle` `UNAPPROVED_NUMBER` — manifest-scoped
  (numbers must trace to approved packet facts). That is the evidence-bound
  contract, not the retired blanket ban. Consistent.

---

## What this audit could not cover

- **Gate 3 model benchmarks** — require live A/B calls on fixed fixtures; no
  API keys in sandbox, and none should run without approval anyway.
- **Gate 6 attended proofs** — by definition attended + live.
- **Live sheet state** — no credentials here; everything above is from code and
  repo-resident snapshots. (A fresh `dumpLedger` snapshot committed to the repo
  is the supported way to give any lane current ledger data offline.)

## Proposed build order (on Mike's go)

1. **Fix B** — `collectQuoteAsks` lane fallback gated behind `!PACKET_ACTIVE`
   + Finding D tests 1–3 (same PR-class change, stops the weekly Jordan-class
   write-wake death). scripts-only.
2. **Finding C helper** — shared slice-selection across W1/W2 (+ alignment
   test). scripts-only.
3. **Finding B** — checklist backfill (docs) or deactivation (registry) —
   Mike's call on which.
4. Then pending seats off Task 17, one at a time, gate-ordered.

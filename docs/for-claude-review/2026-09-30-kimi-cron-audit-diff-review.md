---
title: Adversarial review — cron-audit diff 2026-09-30 (five changes, uncommitted)
created: 2026-09-30
updated: 2026-09-30
type: research
tags: [review, newsroom, adversarial, kimi]
sources:
  - output/review-cron-audit-2026-09-30.diff (6 files, uncommitted working tree)
  - scripts/articleContamination.js, scripts/livedExperiencePacket.js, scripts/livedExperiencePacketV2.js,
    scripts/cron-desk-run.js, scripts/cron-desk-writer.js, scripts/cron-saturday-run.js (verified against code, not the summary)
---

# Adversarial review — output/review-cron-audit-2026-09-30.diff

Scope: the five changes as tasked. Verdicts verified against the code. Tests run:
`articleContamination.test.js` PASS, `livedExperiencePacket.test.js` PASS,
`livedExperiencePacketV2.test.js` PASS.

**Liveness check (done first, it changes the weight of everything):** the diff
patches V1 (`livedExperiencePacket.js`) but live wakes all run `packetContract:
v2` (`newsroomWakePackages.js:24` rejects anything else; every staged artifact in
`output/cron-compare/` is `packet-v2`). The V1 changes are still live, because V2
delegates: `buildAnglePacket`/`buildReportPacket` wrap `clone(v1.*)`
(`livedExperiencePacketV2.js:111,140`) and `validateAngleOutput` is re-exported
unchanged (`livedExperiencePacketV2.js:669`). So changes 1–3 reach production
through the wrapper. Confirmed, not assumed.

## Findings

1. **`corrected-article` widening blocks legitimate prose — no escape hatch.**
   `scripts/articleContamination.js:35` — severity: **medium**.
   Evidence: `scan('The council released the budget Tuesday. Here is the revised
   version of the transit plan as filed.', {desk:'civic'})` → finding
   `corrected-article` (probed live). The new `(?:corrected|revised|repaired)
   (?:article|draft|piece|version|[a-z]+ section)` matches any "here is the
   revised version of <anything>" anywhere in the prose. REPAIR_CHROME entries
   carry no `groundedBy`, the scan is whole-prose, and a finding is fatal at both
   doors: W3 skips Rhea (`cron-desk-run.js:2735`) and Saturday rejects the staged
   article (`cron-saturday-run.js:123-127`). Civic copy about revised ordinances
   or corrected public-records items is exactly the desk that will phrase a lede
   this way.

2. **`approved-quote-narration` over-blocks and under-covers asymmetrically.**
   `scripts/articleContamination.js:38` — severity: **medium-low**.
   Evidence: `scan('The mayor read his approved statement at the hall and took no
   questions.', ...)` → finding (probed live). Ordinary press-office narration is
   now fatal at both gates. Meanwhile the institution forms — "its approved
   statement", "the office's approved statement" — are not matched, so the actual
   repair-narration class survives whenever the subject is an office rather than a
   pronoun. Both directions are wrong at once.

3. **Saturday handoff packet is the W2 report packet, not the W3 write packet —
   parity is approximate, not exact.** `scripts/cron-saturday-run.js:106-112,123` —
   severity: **medium**.
   Evidence: W3 scanned `{ packet: writePacket }` (`cron-desk-run.js:2699`), whose
   blob includes `task.approach` and the full angleInput FACT list. Saturday now
   reads `<stem>packet.json`, which carries only `assignment.story` + `quotes` +
   `interviews` (`cron-desk-run.js:2457-2467`). The decay case this targets does
   work — the labeled anomaly form lives in `story.label`, verified against real
   artifacts (`output/cron-compare/civic_c106_freelance-firebrand_packet-v2_packet.json`:
   `"label": "Downtown: decay [Sentiment -0.400, ...]"`). But the other
   `groundedBy` entries (`falling-apart` on bare `/\bdecay\b/`,
   `real-life-struggles`, `isnt-safe`) can be grounded at W3 by approach-only
   vocabulary and ungrounded at Saturday — the exact W3-pass/Saturday-block
   divergence the change exists to kill survives for them. The packet W3 actually
   used sits on disk and is derivable from the staged basename:
   `<basename minus .staged.md>.state.json` (confirmed present, e.g.
   `business_c104_business-desk_packet-v2_deepseek-deepseek-chat.state.json`).
   Reading that gives exact parity; reading the report packet gives parity only
   where grounding vocabulary happens to live in `story.*` or quote text.

4. **Filename-coupling is a silent fail-closed.** `scripts/cron-saturday-run.js:107`
   — severity: **low**. The `_packet-v\d+_` infix is load-bearing; any stem-scheme
   change in `wakeStageStem` (`cron-desk-run.js:1290-1297`) silently reverts
   Saturday to packetless strict mode with no error. Direction is safe (strict),
   but invisibly so. Related, pre-existing, not this diff: the same article now
   faces three different grounding blobs at three doors — W3 writePacket,
   reconcile's manifest-only blob (`reconcileRheaDisposition.js:138`), Saturday's
   report packet. Worth one consolidation pass eventually.

5. **Team anchor: edge-case strictness flip.** `scripts/livedExperiencePacket.js:495`
   — severity: **low (practically unreachable)**. Old code returned "not replaced"
   whenever the blob yielded no ≥5-letter tokens; new code with a `signal.team`
   set blocks every chase that fails to name the team in that case. The blob
   always contains assignment + hood + known claims, so an empty token list needs
   a pathological assignment. Noting the behavior change, not objecting to it.

## Clean verdicts

- **Change 1 (team anchor)** — otherwise NONE. Whole-word match with correct
  escaping and both-side apostrophe normalization; `"A's"` and `Oaks` cases
  covered by test; a whole-word team mention passing the chase check is the
  design, not a leak. `story.team` is genuinely populated by the sports slices
  (`buildPSlayerSlice.js:537,563,580`, `buildAnthonySlice.js:386`,
  `buildHalSlice.js:459`, `buildSimonSlice.js:126`).
- **Change 2 (unverifiedLead coercion)** — NONE. The comment's "the W2 contract
  already accepts array or one string" is accurate — that's V2's W2 validator
  (`livedExperiencePacketV2.js:178-184`). The caller uses the return value
  (`cron-desk-run.js:1929-1932`), so the input-clone breaks no mutation
  dependency (none existed). Non-string non-null junk (`{a:1}`, numbers) still
  throws, per test.
- **Change 3 (planned question to target citizen)** — NONE. Officials keep the
  bounded accountability question (early return precedes the new branch, test
  covers it); the pop match is exact-string against the same candidate set the
  W1 validator enforced; untargeted candidates keep the stock question; the V2
  wrap does not touch `task.question`, so the planned question reaches the
  citizen prompt.
- **Legacy `runWake()` path** — NONE. It scans packetless
  (`cron-desk-run.js:2949`) and its stems carry no `_packet-v` infix, so Saturday
  stays packetless for it too. Consistent, no new divergence.
- **Regex/strip consistency** — `stripRepairChrome` (`cron-desk-writer.js:370`)
  and the scan pattern are the same widened regex; strip remains anchored to the
  first line, the scan is whole-prose. Consistent pair.
- **Change 5 mechanics** — the regex matches every real staged stem in
  `output/cron-compare/staged/` (all are the `_packet-v2_` underscore form; the
  dash form in `wakeStageStem`'s no-persona fanout branch is unreachable because
  `gateAssignments` attaches a persona to every eligible assignment); the
  `uniqueDest` `-HHMM` suffix lands after `.staged` and cannot break the prefix
  match; unreadable/missing packet → `null` → old strict behavior, fail-closed.

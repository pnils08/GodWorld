---
title: pipeline.70 adversarial diff review — seam 1 uncommitted diff + seam 3 commit 1d8486c2
status: complete
lane: kimi
date: 2026-10-03
scope: git diff (working tree) of scripts/newsroomSourcing.js, scripts/newsroomSourcing.test.js, scripts/livedExperiencePacket.js, scripts/livedExperiencePacket.test.js vs docs/plans/2026-10-03-citizen-pages-drive-canon.md §5; plus git show 1d8486c2 -- scripts/ (scanCitizenPages --dump, buildPulseSlice.js, beatSliceKit/buildTrendsSlice/cron-desk-run pageVoices)
---

# pipeline.70 diff review (kimi, adversarial, read-only)

**Verdict: SHIP-WITH-FIXES.** The canon posture is right everywhere I could attack it: page text never
becomes a FACT, the admission gate holds, GAME/MEDIA are excluded on every path, and W1/W2 pool
stability is structural, not a convention. One landing hazard (F1) must be resolved before this
lands, two small fixes (F2, F3) should ride with it. Both test files pass as run
(`node scripts/newsroomSourcing.test.js`, `node scripts/livedExperiencePacket.test.js` → PASS;
`node --check` clean on all six touched scripts).

## Findings

### F1 — BLOCKER AT LANDING: the reviewed diff is not self-contained; landing the four named files alone kills every street wake

`scripts/newsroomSourcing.js:291` does `citizenText = pages.citizenText;`. That export exists only
because `scripts/scanCitizenPages.js:112,242` carries an **uncommitted edit that is outside the
brief's file list** (§5: "Files you may touch: newsroomSourcing.js, newsroomSourcing.test.js,
livedExperiencePacket.js, livedExperiencePacket.test.js. Nothing else."). The working tree also
carries an uncommitted refactor of `scripts/buildPulseSlice.js` that *depends* on the new export
(it deleted its own `citizenText` and now calls `pages.citizenText`; committed 1d8486c2
`buildPulseSlice.js` exported `citizenText` itself).

If the four reviewed files land without the scanCitizenPages.js edit, `pages.citizenText` is
`undefined` — and assigning it does not throw. The crash comes later, at
`newsroomSourcing.js:315` (`citizenText(doc.content)`), **outside** the try/catch at 289–293,
whenever the index is non-empty — i.e. exactly when the feature is live. `street()` throws, the
street-mode seats (talia-finch, p-slayer, maria-keen, noah-tan) die at the angle wake. Hunt (d)
realized as a landing-shape hazard.

Repro: `git stash push scripts/scanCitizenPages.js && node -e "const s=require('./scripts/newsroomSourcing'); s.street({venue:'X',pulseClass:'nightlife-spot'},{pulse:{className:'nightlife-spot',venue:'X'}},109,'/root/GodWorld','talia-finch',{meta:{cycle:109},ledgerRows:[],pageIndex:[{popId:'POP-00001',cycle:109,type:'reflection',content:'I love X'}]})"` → `TypeError: citizenText is not a function`.

Fix (research-build's call, either is fine): land `scripts/scanCitizenPages.js` (and the coupled
`scripts/buildPulseSlice.js` refactor) with the set — the brief's "nothing else" was unworkable
because `citizenText` lived in buildPulseSlice and codex correctly homed it in the scan module —
or repoint `newsroomSourcing.js:291` at `require('./buildPulseSlice').citizenText` (exported at
1d8486c2) and revert the two extra files. Either way, harden the line:
`citizenText = pages.citizenText || citizenText;` so a future export shuffle degrades to the
identity fallback instead of a TypeError.

Note: the same uncommitted buildPulseSlice.js edit also fixes a real (f)-class over-match in
committed 1d8486c2 — ad-hoc themes matched a standalone surname ("Lena Cross" → any "Cross" in
anyone's page). The fix is correct and should land with the set, not be lost to the scope question.

### F2 — page excerpts reach the W3 write packet with a name attached and no inline guardrail in the JSON

`livedExperiencePacket.js:217` puts `pageVoices` into `creativeBrief`; `buildWritePacket` carries
the creative brief through to W3 (`:850–852`). The "colour and sourcing, never a number in print"
label exists only in the markdown/desk-state renderings (`beatSliceKit.js:229`,
`cron-desk-run.js:910–913` and the angle prompt at :1889ish) — the packet JSON is bare strings of
the form `rent — rising; dozens of citizens … Loudest: <Name> (<hood>), said at C109: "<excerpt>"`.
W3's limits ("Only exposure.sources contain attributable spoken words", :901) arguably cover it,
but the line hands the writer a named citizen plus their verbatim words outside exposure.sources;
an over-trusting model can print it as an interview quote. Hunt (a) residual.

Fix: one prefix in `voiceLines` (`buildPulseSlice.js:183`) — e.g. `(their own page, not an
interview — colour only)` — so the guardrail survives into the packet JSON.

### F3 — pulse leak guard is case-sensitive where its street() twin is not

`buildPulseSlice.js:56` `LEAK_RE` lacks the `/i` that `newsroomSourcing.js:302` has. A page
writing "supermemory" or "claude" lowercase passes the pulse voice guard and can be excerpted
into Celeste's slice; the same doc is dropped from the street pool.

Repro: `node -e "console.log(/\b(?:Claude|Codex|Anthropic|Supermemory|OpenRouter|Gemini)\b/.test('i read it on supermemory'))"` → `false` (admitted) vs the street guard → `true` (dropped).
Fix: add `/i`.

### F4 — observation (spec-conformant asymmetry): street page-line skips don't include RoleType athletes

`newsroomSourcing.js:311–312` skips ClockMode MEDIA/GAME + EconomicProfileKey SPORTS_OVERRIDE,
exactly as §5.1 specifies. The pulse additionally excludes RoleType-matched athletes via
`K.sportsSubject` (`beatSliceKit.js:340–345`, applied at `buildPulseSlice.js:110`). An ENGINE-clock
citizen with an athlete RoleType can be a street page-line source while being excluded from the
pulse. No GAME-clock citizen reaches any pool on either path (verified) — flagging the drift for
the plan owner, not demanding a code change.

### F5 — info: the index can legitimately hold dates and (uncapped) bench rows; consumers re-filter

The dump's admission gate (`scanCitizenPages.js:49–51,62`) is customId shape + type
{reflection,tension} + slot allowlist + cycle ≤ live. Office-position docs die on `type`;
NIGHTLY/deskwork/SIFT die on `slot` — verified closed. But the cycle cap is dropped entirely when
`liveCycle()` returns null (`:151` logs a warning and runs uncapped), so C119/C126 bench docs can
enter `index.jsonl`, and real-world dates always could (content leak-guards live in the consumers:
`newsroomSourcing.js:302`, `buildPulseSlice.js:151`). Nothing reaches a desk — street re-filters
`cycle > story cycle` (:300) and pulse re-filters the 8-cycle window (:107) — but the header's
"the leak guard lives HERE, not in the consumers" is inaccurate for the date/bench classes.
Doc-drift note; `meta.liveCycle: null` already marks an uncapped run for an outside check.

### F6 — verified safe: W1/W2 pool stability is structural

`refreshCitizenPages` runs once per angle fanout, before any pool is built
(`cron-desk-run.js:3209`, body :1395–1406), and never at the report stage. The W1 pool is frozen
into the angle artifact (:2008) and W2 reads the artifact's pool, keeping only candidates whose
`sourceKind`+`evidence` are byte-identical to W1's (:436–440). A second same-day angle fanout can
move `index.jsonl`, but an in-flight report stage reads its own artifact, never the live index —
a moved index degrades to a dropped quote, never a different one. No fix.

### F7 — per-spec residual (f): the first-person alternative admits non-stance entity mentions

`newsroomSourcing.js:306` is the brief's verbatim regex; "They told us Test Venue reopened" passes
on `us` without the citizen taking a stance. Mitigations hold: the claim is INTERPRETATION
(`livedExperiencePacket.js:735–736`) and the W2 question quotes the excerpt back to the citizen
(`:755–758`), so a misread self-corrects at interview. Plan-level note only.

### F8 — nits

- `livedExperiencePacket.js:756`: an excerpt ending in `.` yields `says: "…".` — double
  punctuation; the new test enshrines it.
- `buildPulseSlice.js:183`: `v.excerpt` can be null (theme matched raw content, `excerptFor`
  finds nothing in the cleaned text) → a voice line prints `“null”`.
- `scanCitizenPages.js` grep() fallback (~:218) scans list summaries of admission-rejected docs
  with `popId: null` — build-side diagnostics only, never desk-facing.

## What I verified clean (the hunts that came back empty)

- **(a) FACT path:** page text enters the W2 packet only as `refClaim('INTERPRETATION', excerpt,
  customId)` plus the ledger profile FACT (`livedExperiencePacket.js:735–740`); `validateReportOutput`
  builds publishable quotes only from INTERPRETATION/INTENTION parts; `EV-PAGE-` evidence ids are
  addressable. THE PAGES SAY is labeled "colour and sourcing, never a number in print" in all three
  human-facing renderings. Pulse voices ride Celeste's slice as *sources* (`buildTrendsSlice.js:115`),
  not facts.
- **(b) office / desk-journal / bench / dates:** admission gate verified (F5 for the two residual
  classes that stop at the index); both consumers re-filter.
- **(d) throw paths:** street()'s index load is wrapped and missing/empty → life-lines only
  (`newsroomSourcing.js:288–294`); both halves of `refreshCitizenPages` are individually try/caught
  (a Supermemory outage = yesterday's index, a pulse failure = a logged skip); `pulseSlice.load`
  returns null softly; `K.loadProfiles` never throws. The only uncaught throw found is F1, and it
  is a landing-shape bug, not a runtime one in the current tree.
- **(e) GAME/MEDIA:** excluded in the street page-line pass (:311–312), in the pulse count
  (`buildPulseSlice.js:110–111`), and re-checked when voices become people
  (`buildTrendsSlice.js:115`). Office holders are additionally excluded from the pulse
  (`OFFICIAL_RE`, :59/:112); street page-line relies on the downstream `quoteIneligibility`
  INSTITUTIONAL block, same as the pre-existing life-line path.

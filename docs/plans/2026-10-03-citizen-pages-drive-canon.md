---
title: The citizen pages drive canon — where to wire the citizens' own words into the newsroom
status: draft for builder review (ruling 2026-10-03 00:43 — the pages are not private; they should drive canon)
owner: research-build (plan); engine-sheet / codex (scripts); research-build (agent files, Rhea)
rollout: pipeline.70
parent: [[2026-09-07-beat-slices-from-sheets-plan]] §Design: sourcing modes
related: [[../research/2026-10-02-engine-208-fandom-dial-read-before]] (first use of the scan), `scripts/scanCitizenPages.js`
---

# The citizen pages drive canon

## 0. The ruling and the measured gap

**Builder, 2026-10-03 00:43:** there is no privacy concern with citizen data — the pages should be used to drive canon; he pays for every reflection and the world the citizens describe should make it to light.

**What exists, measured 2026-10-02 (`scripts/scanCitizenPages.js`):** 2,077 page docs across 369 citizens in the Supermemory container `citizen-pages`, written by the wakes since 2026-06-16 (customId `cp-POP-xxxxx-c<N>-<slot>`: PRESS 163 of the 604 sports-matching docs, morning 50, PRESS-tension 47, CONVO 46, midday 39, evening 33 — every doc is Cycle-addressable). **Readers today: none in the newsroom.** `SMPageId` reaches the pipeline only as a flag — `livedExperiencePacket.js:603` prefers a woken citizen for an interview; `buildCivicDomainSlice.js:457` excludes `NEVER_WOKEN`; `cron-rhea-gate.js:204` lists the column name as a system token to keep out of prose. The page *text* crosses no desk. The isolation was deliberate (`lib/citizenPage.js` header: the subjective layer must not leak into canon) — the ruling supersedes the isolation, not the two guards that stay: ledger facts are truth (canon ≠ truth), and names resolve by POPID.

**What the pages are, for the newsroom:** the only record of what a citizen *thinks* — the street record (`LifeHistory` consumption lines, sourcing-mode `street`) says what they did; the page says what they made of it. Bodhi Davis's page: "What the hell are they thinking over there at the Coliseum?" — three Cycles running. No slice carries that today.

## 1. Where it wires — six seams, in build order

| # | Seam | Today | Cut | Owner |
|---|---|---|---|---|
| 1 | **Sourcing: `street` pool, second evidence source** — `scripts/newsroomSourcing.js:242` `street()` | pool = Active citizens whose **current-Cycle LifeHistory line** carries a `STREET_TAGS` tag and names the slice's highlight; evidence `life-line` | add a `page-line` evidence kind: the citizen's most recent page doc (customId `-c<N>-`, Cycle stamped on the evidence) whose text names the highlight (same `phrase`/`verbSupports` test on the doc text). Pool order: life-line first (they were there), page-line second (they have been talking about it). Evidence record = `{ source: 'citizen-pages', docId, customId, cycle, excerpt }` — addressable, so Rhea can check it. The W1 question still goes to the citizen; the writer gets the excerpt as **colour the citizen already said**, quotable as what they have been saying. | codex builds, es lands (same lane as pipeline.68) |
| 2 | **Packet claim** — `scripts/livedExperiencePacket.js` (`CLAIM_TYPES` FACT/OBSERVATION/INTERPRETATION/INTENTION/LEAD) | a woken citizen is preferred; no page content | a `page-line` evidence row becomes an `INTERPRETATION` claim with `src` = the doc's customId. Known-claims section, not a FACT: the page is what the citizen believes, never what happened. | codex |
| 3 | **Celeste's beat — the city pulse** — new `scripts/buildPulseSlice.js` → `output/slices/c<N>/celeste-tran.md` section `PULSE:` | her slice is the `[Media]`/`[Sports]`/`[PrevEvening]` street lines | per Cycle: theme counts over this Cycle's page docs against a standing theme list (rent, debt, work, the A's, the Oaks, the clinic, transit, safety, faith, the council) **plus** the Cycle's slice highlights as ad-hoc themes; top five themes with doc count, citizen count, delta vs last Cycle, and the three citizens who said the most on each (POPID, name, hood, one excerpt). Aggregate is a **sourcing signal and colour**, never a published statistic — canon is colour, not a data echo; she writes "the block is talking about rent again", not "41% of pages mention rent". `scanCitizenPages.js` generalised: theme list in, per-theme table out. | research-build (deterministic Node, no LLM) |
| 4 | **Letters desk — author pool** — `.claude/agents/letters-desk/RULES.md` + the letters wake package | authors are picked from the people pool like any seat | authors = citizens whose page **this Cycle** carries a stance on the edition's lead topics (the pulse table's top citizens per theme). The letter is still voice-generated; the page supplies the stance so the letter is *that* person's. Rule line: a letter-writer is a citizen with a page line on the topic, or no letter on that topic. | research-build (agent file) after 3 lands |
| 5 | **Rhea — page-backed quote check** — `scripts/cron-rhea-gate.js` INTAKE backing | a quote's backing is the slice/packet record | a quote attributed to a POPID with a page: fetch their three most recent page docs; **contradiction** (the quote cheers what the page curses, same entity) = flag `PAGE_CONTRADICTION` — a held draft, not a fail; agreement is silent backing. Deterministic entity match + the existing sentiment words, no LLM. | research-build |
| 6 | **Canon** — no new path | editions → NotebookLM ingest; NotebookLM is the only canon source | **unchanged by design.** The pages reach canon through what the reporters publish (seams 1–4) — a page line a citizen said to a reporter is canon the day it prints. No direct copy of page text into bay-tribune; that would make the subjective layer canon without a witness. | — |

**Later, not this build (noted, no row):** the same scan as a dial cross-check — citizens whose pages say "leaving" against `MigrationIntent`, "can't make rent" against the pressure run — engine lane, engine.208's acceptance already proposes the pattern.

## 2. Rules that hold across every seam

- The page **selects and colours**; it is never pasted as a fact. The citizen's own voice (W1/W2) remains the quote path.
- A page line is evidence only when it **names the slice's entity** — the same positive test the `street` pool already enforces. "The city feels tense" matches nothing.
- **Window (builder 2026-10-03 00:49: wakes are uneven, two Cycles is too thin).** Measured: ~100 citizens write a page per Cycle (C102–C109: 97–125), 369 have one at all; at C109 a 2-Cycle window reaches 167 citizens, 4 → 226, 8 → 343, 12 → 365. So: **a citizen's evidence is their most recent page doc on the entity, whatever its age, stamped with its Cycle** — the writer sees "said at C104" and writes it as a standing view, not this week's reaction. The pulse (seam 3) counts over a **rolling 8-Cycle window** (343 of 369 citizens) with this Cycle's docs weighted highest, so a theme is "rising" or "fading" against the window, not against one thin week. Rhea (seam 5) checks the last three docs whatever their Cycle. (C119/C126 docs in the container are bench-run artefacts — the scan skips any Cycle above the live `cycleCount`.)
- Pool rule unchanged (09-30): only the mode's pool is asked; an empty pool files without a quote.
- `scanCitizenPages.js` and `buildPulseSlice.js` list with `/v3/documents/list` — v4 search is not coverage (`lib/citizenPage.js` S272).
- No builder name, no real-world date in anything that reaches a desk — the excerpt is the citizen's text as written.

## 3. Proof

1. Seam 1 bench: C109 snapshot + the C109 page docs; Talia's Oaks story pool gains Trenton Nawan / Dillon Trevor / Jessie Hess (pages: excited for the Oaks' season) where today it has only life-lines; P Slayer's A's pool gains Marky Beal and Bodhi Davis. Zero GAME-clock citizens in any pool (existing `sportsSubject` rule).
2. Seam 3: `buildPulseSlice.js --cycle 109` prints a five-theme table; every excerpt resolves to a POPID whose `SMPageId` is set.
3. Seam 5: a synthetic draft quoting Bodhi Davis praising the Coliseum front office is held with `PAGE_CONTRADICTION`; the same quote on a citizen with no page passes untouched.
4. Acceptance in the builder's words: the next NotebookLM daily reads the citizens saying what their pages say — the world he paid for shows up in the paper.

## 4. Sim calls for the builder

None open. The ruling is the design. The window question closed 00:49 (most recent page, age stamped; pulse over a rolling 8 Cycles).

## Changelog
- 2026-10-03 00:49 (research-build) — window rule reset on builder direction: most recent page whatever its age, Cycle-stamped; pulse over a rolling 8 Cycles. Measured 2-Cycle reach 167/369 vs 8-Cycle 343/369.
- 2026-10-03 (research-build, S522) — drafted from the 00:43 ruling; measured the zero-reader gap; six seams ordered.

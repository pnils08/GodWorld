---
title: Discord Voices Connected Plan
created: 2026-10-19
updated: 2026-10-19
type: plan
tags: [media, citizens, discord, active]
sources:
  - lib/personaProvider.js (buildVoiceBrief_, makeTalkBuffer_, drainConversationReflection_)
  - lib/mags.js (loadNewsroomWeek)
  - scripts/mags-discord-bot.js (searchEverything, forced first search_world round)
  - scripts/personaProviderBrief.test.js (18 assertions)
  - intake/bond-claims/paulson-cut-c112.json (Paulson canon bonds)
  - docs/plans/2026-06-16-tier1-character-voice-agents.md (research.16 — the four voice agents the bot hosts)
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — research.30"
  - "[[2026-06-16-tier1-character-voice-agents]] — the voice agents; research.16 archived"
  - "[[2026-10-19-bay-tribune-master-index]] — pipeline.84; the search gaps found here"
---

# Discord Voices Connected Plan

**Builder's words (2026-10-19):**
- "Take a look at the mags and Vinnie discord bots , what models are they , what tools and information do they have , what does me talking to them impact ? Mags has a decent handle of things , Vinnie is pretty disconnected."
- "these need to update somehow without me , they need the search everything tool as their first call and a notebookLM call , both could shape Their journal of me, feed to intake , could take mine for Paulson , drive their bonds with me."
- "The diety approach wouldn't be Mike Paulson if we ever made that. For a mayor or a high priest that is making sim level decisions it could be a neat addition at some point where they could ping me on discord for guidance , but not as Mike Paulson , as their guidance, to help With a decision, just a idea but first I'd want mags and Vinnie to work better and for their interactions with me to have a nudge to them"
- "Also keep in Mind how mags writes her cycle pulse now as Saturdays"
- "Yes seed Paulson relationship with , Vinnie Keane, mags Corliss , Elias Varek , Elliot Abraham from canon" · "Yes mags and Paulson dials should move" · "Yes the bots should be able to record to their wiki pages"

**Goal:** Mags and Vinnie answer from the current records, and a talk with the builder nudges them — dials, the bond with Paulson, the voice's page.

**Rows:** research.30 · **Owner:** research-build

## Measured 2026-10-19 (before the build)

| | Mags | Vinnie |
|---|---|---|
| Model | Haiku 5.5 via OpenRouter, thinking off, 1,000-token cap, 4 tool rounds (one pm2 process hosts both channels; her nightly reflection is Sonnet 5.5) | same |
| Per message | character file, last 2 page entries, world header, family data, notes to self, today's digest, speaker profile, automatic Supermemory pull, article-index pull, `search_world` | four agent files, world header, last 6 page docs, `search_world` |
| A talk wrote | speaker profile, daily log, 07/12/19:00 reflection onto her page, `[NOTE_TO_SELF]` | his replies -> one Reflection_Intake row after 30 min idle |
| Stale | no Saturday-run newsroom | file says six rings, farewell 2041, Laurel; the feed has the 7th title, ledger has Grand Lake |

## Tasks

| # | Task | Owner | Status |
|---|------|-------|--------|
| 1 | Cycle-fresh brief per citizen voice (ledger row, last days, sports feed, Tribune lines) — `buildVoiceBrief_` | rb | done `4cd74194` |
| 2 | Search first: round 0 forced to `search_world`; the tool fans out disk + Supermemory (`world-data`, `bay-tribune`) + article index | rb | done `4cd74194`, `2de11db8` |
| 3 | Mags' prompt carries the Saturday-run newsroom (`loadNewsroomWeek`) | rb | done `4cd74194` |
| 4 | A speaker named Mike is Paulson the GM in citizen prompts; builder never named | rb | done `4cd74194` |
| 5 | Paulson canon bonds: Vinnie professional 8, Mags professional 6 (Varek rivalry 10, Abraham mentorship 8.8 already canon C104) | rb | done `1c27f7fa`, live, read back |
| 6 | Talk recorder (`makeTalkBuffer_`): voice row, Paulson row with the voice as BondTarget (neutral snippet, no tension lines), one typed TALK line on a citizen voice's page; Mags row, no page line | rb | done `1c27f7fa` |
| 7 | NotebookLM as a per-Cycle brief query (30–48 s a call, never per message) | rb | not started |
| 8 | Per-speaker profile card — the profile call is container-wide, so every speaker gets one card that says nothing of the builder | rb | not started |
| 9 | Vinnie's agent files to current canon: seven rings (the seventh won in the farewell season), Grand Lake; the brief still carries the live state | rb | done (builder 2026-10-19) |
| 11 | TrueSource player cards go stale — Vinnie's record still says six-time champion, contract through 2042; the cards are static v1.0 pages (`archive/non-articles/data/`, `ingestPlayerTrueSource.js` loads them into `world-data`) and nothing updates them from the sim. Design how a card takes the season's facts (titles, retirement, contract) | rb + es | not started — builder raised 2026-10-19: "we will have to figure out how truesource cards update players bio stuff that goes stale" |
| 10 | Guidance voice (mayor / high priest) that pings the builder on Discord — not Paulson, not announced as the builder | rb | parked — later |

## Acceptance

1. After a Discord talk and 30 min idle, the bot log shows `voice buffer flushed … paulson=… page=written` — proven by the builder's next talk.
2. C113 (Sun 2026-10-25) Phase-9 drain moves DialState for POP-00527, POP-00005 and the voice, and the two Paulson bonds — proven by a readback after C113.
3. Vinnie asked about the championship answers from the feed, not 2031 / six rings — proven by the builder's next talk (live smoke 2026-10-19 passed).

## Reviews reconciled

| Review | Lane | Pointer | Result |
|---|---|---|---|
| none — rb test (18 assertions) and a live smoke only | rb | `scripts/personaProviderBrief.test.js` | read-only |

## Open questions

- Task 11 — how does a TrueSource card learn the season's facts (a new title, retirement, a contract change) without hand edits? Builder raised; design pass first, no build.
- Speaker label: the display name "Mike" stays the Paulson test (rb engineering call; the channel is private) — an owner id is a later hardening, not a block.

## Changelog

- 2026-10-19 (research-build) — Created. Phase 1 (brief, search first, Saturday newsroom) live `4cd74194`; Phase 2 (Paulson bonds, talk recorder) live `1c27f7fa`; search fan-out `2de11db8`. Section moved here from the Tier-1 voice plan.
- 2026-10-19 (research-build) — Task 9 done on the builder's answer: Vinnie's IDENTITY and RULES say seven rings and Grand Lake. Plan filed to the template; the section in the Tier-1 voice plan is now a pointer.
- 2026-10-19 (research-build) — Task 11 added on the builder's message: TrueSource player cards go stale; open design question.

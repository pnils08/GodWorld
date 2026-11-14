---
title: Boot templates — test runs and findings
created: 2026-11-13
updated: 2026-11-13
type: research
verdict: adopt
tags: [pipeline, wakes, citizens, boot, active]
sources:
  - scripts/citizen-wake.js, lib/wakePerception.js, scripts/cron-work-wake.js, scripts/work-wake-packages.json
  - scripts/cron-civic-run.js, scripts/civicSeat.js, scripts/buildCivicOfficeSlice.js, scripts/officeWall.js
  - scripts/cron-desk-writer.js, scripts/cron-desk-run.js, scripts/newsroom-wake-packages.json, scripts/testReporterWrite.sh
  - .claude/agents/*/IDENTITY.md, LENS.md, RULES.md; docs/media/voices/* (read 2026-11-13, C115)
pointers:
  - "[[../plans/2026-11-10-role-citizens-wake-as-themselves]] — pipeline.110 Task 9, the job this serves"
  - "[[../plans/2026-11-10-stop-puppeting-the-newsroom]] — pipeline.111 (research-build), owns the reporter harness"
  - "`output/engine-sheet/2026-11-13-boot-three-way.md` — Run 1 raw outputs, every version in full"
---

# Boot templates: test runs and findings

**Builder (2026-11-13):** "review the written agents, voices … ensure they boot the agent into its character … wake in their persona/identity, with access to their memory store … without being told what to say, having a template we know works is probably better than 40 different write ups. is less more? is more more?" · "the plan will be to figure out the template or templates needed, we dont have to make the mayor template be the same as citizen voice, there can be different templates depending on the cron type" · "save these findings and make sure the plan points to it as a test run and we can continue to notate the findings".

**Verdict: adopt** as the evidence behind pipeline.110 Task 9. **Ignited plans:** [[../plans/2026-11-10-role-citizens-wake-as-themselves]] Task 9.

**What this file is:** the log of boot test runs and what each showed. A run is added under §Runs; §Findings is rewritten to the current read, with the run that supports each line. No template is chosen here: the pick is the builder's.

## What each wake loads (code read, 2026-11-13)

| Wake | Schedule | Boot text the model gets | Size |
|---|---|---|---|
| Citizen daily | 07:30 / 12:30 / 21:30 daily | Built from the sheet each wake: name, age, role, hood, station line, temperament off the dials, life record, family, bonds, page memory (`citizen-wake.js` `buildVoicePrompts`). The four `citizen-voice-*` add ≤300 characters of bolded phrases from IDENTITY `## Your Voice` (`loadVoiceTexture`) | short |
| Work wake | Tue / Thu 20:18 | Registry `roleLine` + `voiceNotes` (11 registry packs), or for auto office packs ≤700 characters cut from IDENTITY (`agentIdentityNotes`: first paragraph of Who You Are, Decision signature, first paragraph of Voice); then page memory. User turn = the work blocks, nothing added (since bf938be9d) | short |
| City hall | Mon–Thu 05:45 datawake (3 seats a day: council, Mayor, police chief); Sunday chain (Mayor, hearing seats, project seats) | IDENTITY + LENS + RULES whole as the system turn (`readPersonaDir`); a council seat = shared seat LENS/RULES + its own IDENTITY | Mayor 20,959; project directors 37–46k; council seat ~5–6k |
| Reporter write | Mon–Fri 18:15; Sat/Sun for two seats | Harness text + IDENTITY + LENS + RULES + the package contract (`cron-desk-writer.js`) | varies |
| Reporter angle / report | Mon–Fri 06:15 / 13:15 | The citizen path (`citizenVoice.js`), not the agent folder | short |
| Varek journal | weekly | A directing preamble + his IDENTITY + LENS + RULES (`civisJournal.js` `promptFor`) | ~20k |

- `docs/media/voices/*` (30 files, 81k): loaded by no wake. The only script mentions are a preflight existence check and a pointer string.
- About 20 solo reporter folders (1–3k for the three files) hold a name, a beat and pointers to the voice file and a bag file. The cron writer's tools are canon_search, citizen_lookup, sheet_read, dossier_read, memory_recall, memory_note, canon_recall: none opens a path.
- CLI-era content in the files the city-hall wakes load whole (count of file paths / tool words / build notes in IDENTITY+LENS+RULES): the four project directors 23–27 / 12–15 / 16–33; Baylight 26 / 15 / 27; Mayor 6 / 13 / 0; council seat IDENTITY files 0 / 0 / 0–1.

## Findings (current read)

| Wake type | Read | Evidence | Not tested |
|---|---|---|---|
| Citizen daily | Works from the sheet as is; the written file adds nothing visible | Run 1: Vinnie Keane with and without his 300 characters, 2 runs each, the same man; Kai Marston's own daily wake reads as a person with no written file | More citizens; a low-record citizen |
| Work wake | The work is not defined: the wake hands project status and no moment, so the model picks its own genre | Run 1: 5 of 9 runs answer someone who is not there; sheet line alone gives three different things in three runs | Whether naming the moment (end of the workday, their own page) fixes it; the builder's call, the frame was removed 2026-11-13 |
| Work wake | A written line about what a person produces is acted out as an order | Run 1: "You write memos" → a formal memorandum to an invented committee 3 of 3, with invented dates | A written part holding only who they are and how they decide |
| City hall | The role is understood from one sheet line; the written files change nothing visible in the act | Run 1: Mayor, 20,959 characters / 175 / 701, the same `work` move on the same initiative, same statement shape; every figure she stated is in what she was handed | A council seat; the Sunday chain; more than one run; the live retry and evidence loop |
| City hall / offices | Stating a thing as done that the record holds only as a position | Not from this run: the Thursday 2026-11-12 work-wake read, 3 of 12 offices (plan §Acceptance) | Whether it follows the boot text or the data handed; no run here isolates it |
| Reporter write | The assignment and its quotes decide the piece; the written voice shows only at the edge | Run 1: Kai Marston, four versions, the same story and the same three quotes; sheet + written opens on a room | More than one run a version; a second reporter; the full harness with the written voice |
| Reporter write | The background written for a reporter never reaches them today | Code read above | — |

**Standing notes for any template:** the sheet owns age, home, role, temperament and current state (G-EC52: a written file gives Webb as 52, Laurel; the ledger says 42, Downtown). A written part, where one is kept, holds who the person is and how they decide; nothing the sheet or the engine moves, and nothing about the form of what they produce.

## Runs

### Run 1 — 2026-11-13, C115, engine-sheet

- **Versions:** A = what wakes today; B = the sheet line alone (name, age, role, hood, temperament); C = the sheet line + a short written who / how they decide (or work) / how they talk, drawn from the agent's own existing file. Reporter also run as A-light (today's files, lightest harness) so B and C compare against the same harness.
- **How:** real entry points in their no-write modes: `citizen-wake.js --dry-run --pop`, `cron-work-wake.js --dry-run --pack`, `scripts/testReporterWrite.sh` (live and light). Boot text swapped by a `--require` preload that substitutes named files in memory; no repo file changed. The Mayor's datawake has no model-calling dry mode: rebuilt from exported `buildPack` + `datawakeUserPrompt` + `officeWall.injectBlockForHolder`, one call on her own model, no retry or evidence loop.
- **Nothing written** to a page, a sheet or the live folders. Reporter pieces sit in `output/test-shell/20261113-21*`.
- **Raw outputs:** `output/engine-sheet/2026-11-13-boot-three-way.md`.

| Wake | Agent | Runs | A — today | B — sheet line | C — sheet + written |
|---|---|---|---|---|---|
| City hall datawake | Mayor Santana, kimi-k3.1-pro | 1 each | `work` on INIT-015; statement prints the raw readings; $0.051 | Same move; the plainest statement ("I am not going to govern by the prettier number"); $0.027 | Same move; prints one raw reading; $0.035 |
| Citizen daily | Vinnie Keane, deepseek-v4-flash | 2 each | The quiet after the game, Amara, the academy | The same | n/a — the loader takes bolded phrases only |
| Work wake | Marcus Webb, deepseek-v4-flash | 3 each | "From the desk of" memo; two replies opening "Understood" | One line ("Let me pull up the council calendar"); a private reflection; a speech to an unseen "you" | MEMORANDUM to an invented council committee, 3 of 3 |
| Reporter write | Kai Marston, haiku-5.5 | 1 each | 930 words, cites earlier coverage by cycle number; A-light 778 words, ends on the door | 765 words, first person, opens on a flyer, calls a fellow reporter a teammate | 783 words, opens in a room (toner, radiator, light) |

- **Gap log:** G-EC52 (written file contradicts the ledger), G-EC53 (a journalist told "not a writer"), G-EC54 (a wake question carrying the whole temperament list).

### Next runs (not started; each needs the builder's go)

- City hall: a council seat on the datawake and one Sunday-chain wake, A / B / C, three runs each.
- Work wake: the same three versions with the moment named, if the builder wants the moment named.
- Reporter: a second reporter and three runs a version; owned by pipeline.111.

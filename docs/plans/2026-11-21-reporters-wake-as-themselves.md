---
title: Reporters Wake As Themselves Plan
created: 2026-11-21
updated: 2026-11-21
type: plan
tags: [pipeline, newsroom, wakes, active]
sources:
  - scripts/cron-desk-run.js (beat slice leads the typed packet; evening pack as texture; STANCE lines; persona bag)
  - scripts/cron-desk-writer.js:1347-1420 (who block, system prompt, skill, packet contract, tool blocks)
  - scripts/reporterIdentity.js (sheet line + voice-file Essence)
  - scripts/newsroom-wake-packages.json "sharon-okafor" (reviewProfile, models)
  - scripts/testReporterDay.sh (pipeline.111 whole-day runner; free-rows / bare prompt)
  - output/slices/c112..c116/{evening,sharon-okafor}.md; output/cron-compare/staged/culture_c11[2-6]_sharon-okafor_*.staged.md
  - archive/non-articles/profiles/Name_ Sharon Okafor.txt
pointers:
  - "[[../engine/ROLLOUT_PLAN]] — pipeline.111"
  - "[[2026-11-10-role-citizens-wake-as-themselves]] — pipeline.110, §Reporter rulings (2026-11-17) still bind"
  - "[[../research/2026-11-17-reporter-records-roster]] — the approved records roster; Sharon's lead changes here"
---

# Reporters Wake As Themselves Plan

**Builder's words (2026-11-21):** "yeah i think we can work this group and curate the newer models we have been working on, we need to strip out build talk, notes on their files, CLI archectecture, we want to pull anything puppeting their output, they get told who they are , their canonized bio, their row details, then they get the beat of what they cover, ther tool list, and what we hand them via the engine output, we allow them to chase the angle they see fit, if their packer hands them a major event id rather trust it would chase that without being instructed too, may have some base canon on them in here , if not we will search the tribune files to see what we have on them"

Group named the same night: "Sharon Okafor , Maria keen , Kai marston, Mason Ortega , Celeste Tran".

On Sharon (2026-11-21): bio — "i like them both and love \"visits places she writes about\" thats connects great with the world-view build"; beat — "yes fame isnt her beat but she may she famous people crossover into her beat, but her tools will give her that context".

**Goal:** each of the five wakes with exactly: who they are (canon bio + ledger row), their beat, their tool list, and this Cycle's engine output on their records — no build talk, no code-written angle, stance, bag or opening; the reporter picks the story.

**Rows:** pipeline.111 · **Owner:** research-build. This job owns `.claude/agents/{sharon-okafor,maria-keen,kai-marston,mason-ortega,celeste-tran}/*` and `docs/media/voices/{sharon_okafor,maria_keen,kai_marston,mason_ortega,celeste_tran}.md`.

**Binding from 2026-11-17 (pipeline.110 plan §Reporter rulings):** reporters must not get worse; one reporter switches at a time, after the new piece is read beside the current one and the builder approves; the report and write steps stay; no model run without his word.

## Why (read 2026-11-21, C112–C116)

- Sharon's own slice (Cultural_Ledger fame) leads her typed packet by design (`cron-desk-run.js` "The slice leads the typed packet … the pack stays as texture"). Five cycles, five fame-fading pieces; in four the evening pack's top pulse was a quiet-nightlife venue marked for her.
- Kai, Celeste and Sharon all lead off Cultural_Ledger; nobody leads the evening record.
- Her writer prompt carries build talk (NotebookLM, paused edition pipeline, desk workspace, "Read IDENTITY/LENS/RULES", engine.102 W5) and coaching (code-written Angle/Hook/Approach, "room is yours", forbidden list, STANCE line, ten bag modes, reviewProfile opening/closing).
- Her reviewer's texture conditions bar first-person visits; the builder's bio keeps "visits the places she writes about".

## Sharon's wake (the shape the other four follow)

| Part | Source |
|---|---|
| Who she is | ledger row line (`reporterIdentity` sheet line: age, hood, family, temperament) + canon bio: archived profile ("Lifestyle & Social Dynamics Reporter. Psychology degree; writes about daily life, routines, behavior trends, local rituals; focuses on why people do what they do. Tone: warm, analytical, accessible.") + voice-file Essence, both kept |
| Her beat | nightlife and the city's evenings: the bars, the block parties, who was spotted where, what the city watched |
| Her tools | canon_recall, canon_search, citizen_lookup, sheet_read incl. Cultural_Ledger (fame crossover comes through here) |
| Her records | this Cycle's evening record (world summary Evening Texture + desk_signal culture lane), every row as the engine wrote it, event ids intact |
| Nothing else | no angle, hook, approach, stance, bag, opening, "room is yours", forbidden list in the writer prompt; the gate keeps its blockers |

## Tasks

| # | Task | Owner | Status |
|---|------|-------|--------|
| 1 | Print Sharon's new wake for C116 beside what she got (no model call); builder reads | rb | done `e57933b47`, `1c52b41cb` |
| 2 | Build her wake to the print: identity + bio, beat line, tool list, evening record leading; build talk and coaching off her writer prompt; reviewer allows her first-person visits | rb | done `982ca9ec6` — seat file on her package; record = evening texture + prevEvening lines |
| 3 | One test-shell day on C116 (`testReporterDay.sh`), his go; new piece beside her C116 piece | rb | done — run 3 approved ("Run 3 lock it in"); live path proven through the runner's today variant `982ca9ec6` |
| 4 | His approval → her live Friday wake switches; read the first live piece | rb | live 2026-11-21; read Fri 2026-11-27 after 18:15 (C117): her pick, tool calls, Rhea, grade |
| 5 | Maria: seat file, every-hood record, package, evening pack off | rb | live `1e0ac867b`, packet trim `7b5c99f55`, voice retry `aafcaff3f`; test day 'Before the Shuttles' meets his '2'; read Fri 11-27 |
| 6 | Kai: seat file, arts record, package, evening pack off | rb | live `11b50a52d`; test day C117 'Who Gets Through the Door'; read Fri 11-27 |
| 7 | Mason: seat file, own food record (buildFoodSlice), package | rb | live `f72796514`; test day C117 'Muscle Memory at the Rail'; read Fri 11-27 |
| 8 | Celeste: seat file, trends record (watching: shows, UNDOCKED, game night, shared moments) | rb | live `37ed5d76e`; read Fri 11-27 |
| 9 | Jordan (business desk): seat file, own economy record incl. the casino, Sonnet 5.5 | rb | live `7482c334d`; read Mon 11-23 (his day) |
| 10 | Tribune staff (MED) off the new-mold source lists | rb | done `37ed5d76e` |
| 11 | Morning tool loop (dig before picking) | rb | live `36f0eec26` |
| 12 | ask_worker: reporters ask the 14 city workers; answers become the worker's quote | rb | live `c3e678b80` |
| 13 | Elliot Graye: seat file, every-congregation faith record | rb | live `7109f6cf7`; read Thu 11-26 |
| 14 | Noah Tan: seat file, weather and environment record | rb | live `d08529a29`; read Wed 11-25 |
| 15 | Trevor Shimizu: seat file, transit record without the sports feed | rb | live; read Mon 11-30 |
| 16 | Lila Mezran: seat file, health record (every hood's hospital line, discharges said) | rb | live `72165640a`; read Mon 11-30 |
| 17 | Rachel Torres: seat file, every-hood safety record | rb | live; read Tue 11-24 |
| 18 | Angela Reyes: seat file, every-hood schools record, staff and students | rb | live; read Tue 11-24 |

## Acceptance

1. Sharon's live writer prompt holds only the five parts above — proven by the printed prompt of her first live wake after the switch.
2. Her first live piece after the switch opens from her own evening record or a crossover she chose — proven by reading the staged piece.

## Reviews reconciled

| Review | Lane | Pointer | Result |
|---|---|---|---|
| Six reporters, live | agy | [[../../output/antigravity/2026-11-23-review-pipeline111-reporters]] | HOLD — #1–#5 verified and fixed `36f0eec26`; #6–#8 held (low) |
| Morning tools, ask_worker, Graye, trims | agy | [[../../output/antigravity/2026-11-23-review-pipeline111-pass2]] | HOLD — #1–#5 verified and fixed `69f6adf70`; #1 proven through the live gate (PASS) |

### Agreed

| # | Item | Held by | Sources |
|---|---|---|---|
| A1 | A W1 pass must end the day cleanly at W3 | agy · rb | review #1; cron-desk-run.js runWrite |
| A2 | Empty record sits the seat out; casino people before movers' workers | agy · rb | review #3 |
| A3 | Own-record seats never take the evening pack; staff/self/cap gate on every person | agy · rb | review #4, #5 |

### Needs proof

| # | Claim | Held by | Proof that settles it | Sources |
|---|---|---|---|---|

### New concepts

| # | Concept | Origin | What it adds | Status |
|---|---|---|---|---|
| N1 | Missing world summary / texture file should throw in every builder, not drop sections | agy #6 | loud failure | held (low) |
| N2 | Cache keyed on version only; prev/ cycle not checked | agy #6 | stale-cache guard | held (low) |
| N3 | Fanout re-attaches approach; legacy --wake path skips the seat switch | agy #7, #8 | artifact hygiene | held (low; not in the live prompts) |

## Changelog

- 2026-11-23 (research-build) — Angela live. He noted a school superintendent worker is owed (no schools worker today).
- 2026-11-23 (research-build) — Rachel live. Arrests by hood are 1 or 2 everywhere (coarse, like hospital). Officials asked through the interview path decline; ask_worker reaches them.
- 2026-11-23 (research-build) — Lila live. Her hospital lines hid discharges and cut the census to five hoods (handoff, fixed); engine gaps for his call: StatusNow never flips on discharge; small hoods round to 0 admissions. `72165640a`
- 2026-11-23 (research-build) — Trevor live: game write-ups off ("he doesn't need sports outcomes"); morning worker answer carried to the manifest in a live-path run.
- 2026-11-23 (research-build) — Noah live, "Same approach as the rest"; engine models one weather row a Cycle (a fuller environment model is its own job). `d08529a29`
- 2026-11-23 (research-build) — agy pass 2 folded: a quoted worker now backs the gate's intake check (proven PASS on Jordan's Osei piece); worker asks capped per wake and never fatal. `69f6adf70`
- 2026-11-23 (research-build) — Workers on call ("media crons can call on worker crons"): ask_worker, 2 a wake, read-only on the worker's record. Graye live, seventh seat. `7109f6cf7`
- 2026-11-23 (research-build) — Morning tool loop live ("allow them to dig and and be journlists"); agy HOLD folded #1–#5. Jordan and Maria trimmed mornings. `36f0eec26`
- 2026-11-23 (research-build) — Celeste and Jordan live. Staff off source lists ("1 and 2 yes"); Celeste's Essence back (his allowance); Jordan on Sonnet 5.5 for morning and write ("be curius if sonnet 5.5 would be sufficient"). Gaps for him: a trending page (who watched which show); the engine's per-week business cause.
- 2026-11-22 (research-build) — Mason live, "mason next": trend = each business's move since last Cycle; the engine keeps no per-week cause (engine gap, his call on a row). Ages ride from the row after a 34-for-20 invention. `f72796514`
- 2026-11-22 (research-build) — Test-run pieces are not staged (builder: "3" — test runs stay tests; first live pieces Fri 11-27 take the full path). Kai live `11b50a52d`.
- 2026-11-22 (research-build) — Maria approved on "2" once packet-talk was out: writer Packet trimmed to facts/people/quotes/her plan; interviews retry a busy provider (Maverick flapped all evening). `aafcaff3f`
- 2026-11-22 (research-build) — Maria on the Sharon mold, "You got it": bio = voice Essence + traits, beat = neighborhoods and their people, evening pack off. Test day failed at W1: OpenRouter out of credits. `1e0ac867b`
- 2026-11-21 (research-build) — Tools: "Depending on how the Article is written perhaps the extra depth wasn't needed"; models differ on tool use — which media crons get a tool-calling model is his call per seat, not one model for all. Zero calls is not a defect.
- 2026-11-21 (research-build) — LIVE: "Run 3 lock it in and turn that live, loosen her reviewer to stick to facts about locations , citizens data points". Still graded (builder 10-15). `982ca9ec6`
- 2026-11-21 (research-build) — "her 3 wakes are the media Cron, pull out around Oakland": morning plan on her seat file; gate profile off the writer's Packet. Run 3 on the Kelley block party; no visit, 0 tool calls. `3fe3a575e`
- 2026-11-21 (research-build) — Game night on her beat: "Those onto stay if they are in context of the nightlife her best covers". Test run 1 filed on Aitken: her morning plan carries the city sports line.
- 2026-11-21 (research-build) — Opened on the builder's ruling; Sharon first: both bio pieces kept, she leads nightlife and evenings, fame through her tools.

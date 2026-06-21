# Angle Brief Template

**DEPRECATED (S228, 2026-05-23) — see [[brief_template_v2]].** This v1 template (S197/S222 line: prose-body + citizens-table + specific-data dump) is superseded by reporter-agency v2 (signal + voice-direction + canon-pointers). v1 stays in tree until SKILL.md v2.0 (pipeline.24 Task 6) removes the last reference; then v1 archives per [[SCHEMA]] §8. Do not author new briefs against this template.

---

**Follow this when writing angle briefs in /sift Step 5. Updated after each cycle based on what produced good articles.**

Last Updated: S197 (C93)

---

## What a Brief Is

A brief is the only thing a reporter reads before writing. It replaces the old desk packet. If the brief is wrong, the article is wrong. If the brief is thin, the reporter invents. If the brief is bloated, the reporter drowns.

Target: 800-1,200 words per single-story brief; 800-1,100 per story for multi-story consolidation (e.g., Carmen 2-story brief lands ~2,000-2,200 total). Hard cap 1,500 words / story. The S144 starter target of 300-500 produced voiceless civic copy that failed C92 review (skill-check A6); C92's Carmen front-page rewrite that worked was ~1,000 words. Enough to write from. Not enough to get lost in.

---

## Brief Structure

```markdown
# [Reporter Name] — C{XX} Assignment

## THE STORY
[2-3 sentences. What this article is about and why it matters this cycle. Not a topic — a story. Not "OARI expansion" but "Rivers and Tran are both pushing D2 expansion using the same pilot data to make opposite arguments."]

## THREE-LAYER FRAMING
- **Engine:** [what the code is producing — the ailment, the math, the trend]
- **Simulation:** [what citizens experience — lived consequences, neighborhood texture]
- **User actions:** [what was decided and whether it's working]
[The reporter doesn't need to explicitly name these layers. They thread them naturally. This framing tells them what to weave together.]

## CITIZENS TO USE
| Name | POP-ID | Role | Age | Gender | Neighborhood | Why in this story |
|------|--------|------|-----|--------|-------------|-------------------|
| | | | | | | |

[Every name verified via MCP. No invented citizens. Gender must be specified — it's not on the ledger, Mags determines from canon or assigns.]

## SPECIFIC DATA
[Only the data this reporter needs. Voice quotes from city-hall. Sports feed entries. Engine review excerpts. Numbers. Not the whole world summary — the slice relevant to this story.]

## WHAT NOT TO COVER
[Topics assigned to other reporters. "Transit Hub is Carmen's story. Don't mention it." Prevents overlap.]

## TONE GUIDANCE (optional)
[If this story needs a specific approach. "This is a celebration piece, not an investigation." Or "The numbers look good but something doesn't add up — Jax energy." Only include if the default reporter voice needs steering.]
```

---

## What Makes a Good Brief

- **Specific.** "Beverly Hayes, 58, home health aide, West Oakland, received $18,500 from the Stabilization Fund" — not "a resident who received funds."
- **Directional.** Tells the reporter what the story IS, not what topic to explore. The reporter writes, they don't research.
- **Bounded.** 1-2 stories max per reporter. Each story has clear citizens and clear data. No "also consider covering..."
- **Three-layered.** The framing section gives the reporter all three angles even if they only use two.
- **Grounded in data.** Every fact in the brief has a source — engine review, voice output, sports feed, MCP lookup. Nothing from memory or assumption.

## What Makes a Bad Brief

- **Topic without direction.** "Cover OARI this cycle" — that's an assignment, not a brief. The reporter will spend tokens figuring out the angle.
- **Data dump.** Pasting the full voice output or engine review into the brief. The reporter reads 2000 words of context and writes a generic summary.
- **Invented citizens.** Names not verified via MCP. The reporter writes about someone who doesn't exist.
- **No exclusions.** Without "what not to cover," two reporters write overlapping stories.
- **Gender missing.** Reporter invents or assumes. Include gender for every citizen.
- **Structural pre-prescription on civic pieces.** Briefs that stack official voice quotes + canon context + "use these quotes" produce officials-quoting-officials copy with zero non-official citizen voice. The reporter executes what's in front of them. If the brief is all official material, the article is all official material. C92 OARI coalition and Youth Apprenticeship pieces failed exactly this way (skill-check A6 fail, S170). See "Scene-First Brief Design" below.

## Scene-First Brief Design (civic/policy pieces)

Added S170 after C92. On civic or policy stories, do NOT open the brief with "Here are five official quotes, write a piece weaving them together." That prescription structurally forces officials-quoting-officials copy.

Instead:

1. **Open with a scene or a citizen.** Name a specific person in a specific place feeling the policy. "Patricia Nolan walks past the Temescal & 47th corner every morning" — THAT is the opening direction.
2. **Then widen to the decision or stakes.** Now the reporter knows the story is about a human first, a policy second.
3. **Officials come in as context, not as the story.** "Santana announced X; here is what that means for Nolan and Carter."
4. **Require at least one non-official citizen quote per civic/policy piece.** Beverly Hayes Standard — someone feeling the policy, not just officials making it.
5. **Trust reporter voice.** Do not include every voice-JSON quote. Pick the 1–2 that matter and let the reporter frame the rest from their beat.

The front-page Mayor's Day piece by Carmen (C92) worked because the rewritten brief opened on Nolan, not on five Mayor decisions. The first brief draft was a civic-affairs roll-call — the rewrite made it journalism.

---

## Reference: E91 Briefs That Worked

The C91 production log at `output/production_log_edition_c91.md` has the brief assignments from Step 3 that produced a 12-piece edition graded A- by Mara. Use as calibration — not template, but evidence of what worked.

---

## Evolving This File

After each edition:
1. Which briefs produced strong articles? What did they have that others didn't?
2. Which briefs produced weak articles? What was missing?
3. Did any reporter drift from the brief? Why — was the brief unclear or did the reporter ignore it?
4. Update this file with findings. The next sift reads the updated version.

---

## Changelog

_Updated by `/post-publish` Step 10 after each edition. What changed and why._

- S144: starter version created. No cycle data yet.
- S170 (C92): added "Scene-First Brief Design" section + a 6th bad-brief pattern ("structural pre-prescription on civic pieces"). Evidence: skill-check A6 fail — OARI and Youth Apprenticeship pieces had zero non-official citizen voice because briefs stacked official quotes + canon + directives. Front-page Carmen piece succeeded only after the first brief was rewritten scene-first on Patricia Nolan. Rule going forward: civic briefs open with a citizen/scene, not with official material.
- **S195 (C93): Mandatory `<established-canon>` 9-member council roster injection in civic-desk and freelance-firebrand briefs.** Evidence: write-edition G-W12+G-W14 — civic-desk Carmen S4 fabricated 6 non-canon council members + 6-3 vote outcome; same fabrication shape as S193 G-R6/R7/R10 (Transit Hub project agent invented James Tran D1, Carmen Delgado D3, Barbara Crane D2, Jennifer Chen D4, Alice Hahn D8, Arav Kumar D9). The S193 fix was promoted to ROLLOUT and never actioned, so the failure recurred in civic-desk this cycle. Canon roster (per Civic_Office_Ledger): D1 Carter (OPP), D2 Tran (IND), D3 Delgado (OPP), D4 Vega (IND, Council Pres), D5 Rivers (OPP, Progressive Caucus Lead), D6 Crane (CRC), D7 Ashford (CRC), D8 Chen (OPP), D9 Mobley (CRC). New rule: every civic-desk + freelance-firebrand + civic-project brief includes the 9-member roster as `ESTABLISHED CANON:` lines; agent RULES.md must hard-fail on naming any council member not in the roster. Scene-first rule from S170 held this cycle — Mezran S1 opened with Patricia Nolan workshop attendee, Maria S3 opened at the West Oakland gathering, both produced strong work.
- **S197 (C93 triage): Word target updated 300-500 → 800-1,200 per single-story brief.** Closes G-S14 (sift gap log). Evidence: the S144 starter spec was 300-500 but every brief that produced "real journalism" since C92 has trended 800-2,200 (Carmen 2,251, Hal 1,789, Jax 1,420, Maria 1,364, Anthony 1,305). Thin briefs produce voiceless copy (skill-check A6 fail S170); the rewritten C92 Carmen front-page that worked was ~1,000 words. Updated to reflect working practice with a 1,500-word hard cap per story so reporters don't drown. Per [[archive/plans/2026-05-03-c93-gap-triage-execution]] Wave 1 Task 1.3.
- **S241 (C95): 9 article + 3 quick-take brief generation under S239 sift cadence held. Word counts landed close to brief band: FP1 Carmen OARI ~2900, ED Mags 3-deadlines ~1100, C1 Carmen Okoro ~4200, C2 Mezran HCAI ~4200, QT1 Chen D8 ~750, CU1 Maria KONO ~5000, CU2 Maria faith ~5000, QT2 Velez Baylight ~700, QT3 Quiet Harbor ~2600 (atmospheric, no headline), O1 Jax Varek ~3900, S1 Anthony Cy Young ~4500, S2 P Slayer Richards ~4000. **Positive: Mike-E93 fatigue-cure framework embedded in CU1+CU2 briefs paid off** — Maria's stoop-stays-on-stoop on KONO + faith community textured pieces both shipped on-brief, neither drifted to council-vote scaffold. Jax O1 brief explicitly "not CRC vs Mayor" (front-office accountability frame) — held. **NEW BRIEF SHAPE RULE — print-pipeline format contract:** the .txt that /write-edition emits at Step 6 is the API between /write-edition and /edition-print parsing. After S235 commit 37aef8c to lib/editionParser.js changed format requirements (4-col ARTICLE TABLE with Slot column, ### H3 headlines, plain bylines), /write-edition's compile step lagged and continued emitting the old format (3-col table, # H1 headlines, **By X** bold bylines). First C95 PDF render came out broken (bylines as headlines, empty body divs). Brief template should now codify: the compile step MUST produce the parser-expected .txt shape — Slot column populated for every ARTICLE TABLE row (FP1, ED, C1, C2, C3, N1, N2, B1, O1, S1, S2, L1), ### markdown headlines (not # H1), plain `By Reporter | Bay Tribune Section` bylines (no `**` wrapping). Until /write-edition compile is updated, the .txt may need manual sed fixup post-Step 6 to satisfy the parser. **New cross-check at compile-time (closes G-PR-NEW1-3):** /write-edition Step 6 must run `node -e "require('./lib/editionParser').parseEdition('editions/cycle_pulse_edition_<XX>.txt').articleTable.canonicalShape"` and FAIL LOUD if false — same shape as the existing NAMES INDEX verifier gate. Surfaced when the rendered PDF is opened (S229 Mags-rule eyeball discipline) but should be caught at compile.
- **S222-S223 (C94): Brief-led mode (S215) validated — identity layer can override wrong brief constraints. New cross-check rule on letters-brief.** C94 word counts held the 800-1,200 trend with widening: FP1 Jordan ~440, ED Mags ~240, C1 Carmen ~520, C2 Maria ~370, N1 Maria ~290, S1 Hal ~1100, S2 P Slayer ~1100, S3 Anthony ~440, total ~5,160 words. Letters short by design. **Positive: brief-led mode preserved canon recall** — sports-desk identity layer self-pulled Danny Horn POP-00022 (Tier-1 CF) from prior coverage when S2 brief didn't name him; letters-desk LENS rest-cycle rule overrode brief's wrong Hutchins+Iglesias candidates (both due REST through C95) and substituted 3 NEW canon citizens correctly (Keisha Morris / Miguel Santos / David Okonkwo). **New rule (closes G-W39): /sift Step 5 letters-brief generation must cross-check `.claude/agent-memory/letters-desk/MEMORY.md §Rest Cycle Tracking` before suggesting candidates.** Until the cross-check is wired, agent identity layer is primary defense — but the sift brief is upstream waste when it suggests rest-cycled citizens. Evidence: write-edition gap log G-W39 + G-W41. **Mara vote-math forward rule cascades into brief shape:** vote-coverage briefs (council pieces) must include the 9-member roster in `ESTABLISHED CANON:` block AND require write-edition output to name all 9 + absentee — not just the tally. C94 Carmen C1 brief had roster but write phase dropped the per-member naming (G-W56). Brief template now explicitly: vote pieces ship roster-by-name, never just X-Y tally.
- **S256 (C97): all 12 briefs cleared context-injection pre-launch; word bands landed close. Two upstream brief failures, both caught downstream.** (1) Letters brief named ineligible writers — a Tier-1 codex-protected entity the newsroom must never write (POP-00004 Lucia Polito), a too-recently-used citizen, and role/age drift — caught by letters-desk LENS + MCP verification and rebuilt with 3 fresh verified writers (Soto/Rivera/Okafor), but the brief was upstream waste (recurrence of C94 G-W39 letters-eligibility gap). **Reinforces: sift letters-brief generation must cross-check codex-flag + `.claude/agent-memory/letters-desk/MEMORY.md` rest-cycle tracker BEFORE naming.** (2) FP1 brief seeded an invented front-page anchor (Rosario Vidal) → de-named at review. **NEW RULE — POP-ID-carry for freeform directors:** freeform NAMES INDEX rows for project directors (Dr. Vanessa Tran-Muñoz, Elena Soria Dominguez) must carry their POP-ID at brief/compile. The bare-name freeform entry is exactly what let post-publish truncate "Dr. Vanessa Tran-Muñoz" → "Dr. Tran-Muñoz" and mint duplicate POP-01021 over her existing POP-00781 (citizen_selection.md S256). Scene-first held across the slate; no structural drift in the briefs themselves.
- **S264 (C98): lean 5-feature slate briefs held; word bands landed; scene-first across the slate.** FP1 person-first open on Elijah Roberts (23-yr laborer), S2 P Slayer scene-first first-person — both A. **New brief-shape rule for accountability quick-takes (from Mara's QT1 byline-thin note):** a quick-take built on a number-correction (OARI $420→$2,807) must name the official who reset it or a citizen it lands on — the figure alone reads as a press-release delta, not news. Carries the "civic earns the page only when a citizen is voiced" doctrine down into the QT format. No structural drift in the briefs themselves this cycle. Evidence: mara_audit_c98.md QT1 note + sift_proposals_c98.json quickTakes block.
- **S265 (C99): 7-article + 3-QT + 2-letter slate; word bands held; one upstream brief failure caught downstream.** B1 (Baylight, Jordan Velez) shipped with a **fabricated Ramos quote** that survived to Step 2 review before being swapped for her real filed civic-log line ("The process is clean — and now it's documented") (G-W2). **Reinforces the standing rule and extends it to business/civic features, not just QTs: when a brief covers a civic voice who spoke on the record this cycle, the brief must carry that official's *filed quote verbatim from the civic production log* — never leave the reporter to supply the quote, which invites invention.** Also G-W5: a brief passed a raw engine metric ("+0.63 sentiment tracker") into body language → corrected to felt language at review; engine numbers don't belong in brief-seeded prose. Letters/QT bands fine; scene-first held. Evidence: production_log_c99.md §/write-edition (G-W2/G-W5) + run-cycle gap log.

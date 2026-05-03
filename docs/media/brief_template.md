# Angle Brief Template

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
- **S197 (C93 triage): Word target updated 300-500 → 800-1,200 per single-story brief.** Closes G-S14 (sift gap log). Evidence: the S144 starter spec was 300-500 but every brief that produced "real journalism" since C92 has trended 800-2,200 (Carmen 2,251, Hal 1,789, Jax 1,420, Maria 1,364, Anthony 1,305). Thin briefs produce voiceless copy (skill-check A6 fail S170); the rewritten C92 Carmen front-page that worked was ~1,000 words. Updated to reflect working practice with a 1,500-word hard cap per story so reporters don't drown. Per [[plans/2026-05-03-c93-gap-triage-execution]] Wave 1 Task 1.3.

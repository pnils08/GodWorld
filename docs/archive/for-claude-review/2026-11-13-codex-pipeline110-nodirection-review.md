# Review: pipeline.110 work wake stops directing

**Verdict: SHIP-WITH-FIXES**

The system/user split is implemented as claimed, and source inspection found no downstream sentence-count or first-person parser that breaks on a longer/differently shaped reflection. Two follow-ups remain: behavioral guidance is still supplied through voice notes, and the original work-wake plan still states the removed format contract.

## Findings

### F1 — The new prompt still includes behavioral direction through voice notes

`buildWorkPrompts` explicitly appends `pc.voiceNotes` to the system prompt (`scripts/cron-work-wake.js:421-429`). Registry entries contain instructions about what the citizen thinks or attends to, for example Marcus Webb’s “You think in queues, eligible households, and what the fund can actually move this week — not speeches” (`scripts/work-wake-packages.json:23-26`) and Keisha Ramos’s guidance to think in contracts and remediation calendars (`scripts/work-wake-packages.json:122-126`). Auto packs also construct voice guidance in `voiceNotesFor` from authored identity, including a `Decision signature` rendered as “How you decide: …” (`scripts/cron-work-wake.js:272-296`), plus generated “Your temperament” text.

So the old user-turn task directions are gone, but the prompt still contains behavior-steering text. That may be intended as characterization; it means the commit’s comment that there is “no instruction on how to think” (`scripts/cron-work-wake.js:422-424`) is not literally true. This is a scope/claim correction unless the intended change was to remove all such steering, in which case these inputs remain a gap.

### F2 — The work-wake plan still specifies the removed sentence-count contract

The package schema in `docs/plans/2026-09-16-work-wake-packs.md:48` still requires `promptContract.targetSentences`, and its voice step at line 88 still says “first-person work reflection, 4–5 sentences.” The loader no longer validates or consumes `targetSentences` (`scripts/workWakePackages.js:55-69`; `scripts/cron-work-wake.js:421-429`). A maintainer following the plan can reintroduce the removed field and output constraint, while believing it remains part of the current contract. The plan’s later change note does record the removal, but the earlier contract text was not reconciled.

## Requested checks

1. **Readers of removed prompt fields:** Repository search found no remaining production reader of `promptContract.frame`, `userFrame`, or `targetSentences` in `scripts`, `lib`, `dashboard`, `phase*`, or `utilities`. `workWakePackages.js` only requires `roleLine` and `voiceNotes`; no validation depends on the removed keys. References remain in the new test’s negative assertions, this review brief, and the stale work-wake plan clauses cited in F2. The plan also contains the old 4–5 sentence claim at line 88.

2. **Downstream shape assumptions:** `generateVoice` retains `max_tokens: 340` (`scripts/cron-work-wake.js:432-441`). `wakeOne` passes the returned string directly to `classifyTripleReflection_`, `appendReflection_`, and the `Reflection_Intake` row (`scripts/cron-work-wake.js:464-495`). The classifier interpolates arbitrary text into its `TEXT` field and parses classifier output, not reflection sentence structure (`lib/reflectionClassifier.js:302-319,347-374`). `appendReflection_` stores `String(text || '')` (`lib/citizenPage.js:159-182`), and the intake writer flattens newlines for the text cell. No first-person or 4–6 sentence dependency was found in this path. Longer replies remain bounded by the unchanged 340-token model cap.

3. **Text still sent to the model:** `buildWorkPrompts` makes the system turn role line + pack identity + voice notes + labeled page readback; the user turn is exactly `pack.blocks.join('\n\n')` (`scripts/cron-work-wake.js:421-429`). Thus work blocks are no longer surrounded by the prior user-frame/task instructions. `voiceNotesFor` and the registry’s authored `voiceNotes` still provide behavior-shaping text, as detailed in F1. Blocks themselves include descriptive labels and sometimes record wording such as “required” or “directed” from the source data; they are not prompt wrappers, but are still model input and can carry instruction-like content from those records.

4. **Test gaps:** The diff adds assertions for one generated office pack, no frame/userFrame/targetSentences, exact user content, memory label, and exclusion of the work block from system (`scripts/cron-work-wake.test.js:127-132`). It does not exercise a loaded registry package through the prompt builder, an auto player pack, empty memory, multiple blocks, or the actual generation call’s message array and token limit. There is no test that documents the intended boundary between allowed voice characterization and removed task-direction language. Source flow indicates no downstream shape break, but a test with a longer/multiline response through classify/persist shaping would guard against later assumptions in this caller.

## Scope and verification

Reviewed `git show bf938be9d -- scripts/` against current source, including prompt field readers, prompt assembly, reflection classification, page append, and intake construction. No code was edited. No tests or external calls were run.

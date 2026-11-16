# Brief: codex diff review — work wake stops directing (bf938be9d, after revert 2d3d343a0)

The Task 8 node change you reviewed (5634525f9) is reverted (2d3d343a0) — its review is moot. Review this instead: `git show bf938be9d -- scripts/`.

Claim: `buildWorkPrompts` in `scripts/cron-work-wake.js` now sends system = roleLine + identity + voiceNotes + "Your memory:" readback; user = the work blocks only. PRIVATE_FRAME, frame/userFrame/targetSentences removed from auto packs and from every entry in `scripts/work-wake-packages.json`.

Check:
1. Any reader of promptContract.frame / userFrame / targetSentences left anywhere (grep scripts lib dashboard phase* utilities), including `workWakePackages.js` validation and docs that claim them.
2. Anything downstream (classifier, page append, Reflection_Intake) that assumed the reply is 4-6 first-person sentences and now breaks on a longer or differently shaped reply (max_tokens 340 stays).
3. Directing text still reaching the model in this path (blocks, identity, voiceNotesFor).
4. Test gaps.

Findings to `docs/archive/for-claude-review/2026-11-13-codex-pipeline110-nodirection-review.md`. No code edits.

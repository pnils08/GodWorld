# agy brief — engine.356 cut A4, the part of the day on a line: adversarial diff read (engine-sheet, 2026-11-25)

**Read-only. Write only `output/antigravity/2026-11-25-review-e356-a4-when.md`.**

One commit on PROD stage 85 (`71fc2eb9d`): `0290dd9d2`. `git diff 71fc2eb9d 0290dd9d2 -- phase05-citizens phase01-config`. Plan: `docs/plans/2026-11-21-a-moment-has-a-place.md` §A4 read and the last changelog entries (the five rules the builder approved). Not benched, suites not run (test lock). Bench scripts, not yet run: `output/engine-sheet/2026-11-25-e356r/`.

What changed:
- `generateCitizensEvents.js` — `WHEN_PARTS_`, `whenByKind_` (parsed once from `ctx.config.momentWhenByKind`), `whenCount_`, `whenKindOf_`, `whenOfTags_`, `whenCountAdd_`, `whenTagged_`; one call in the emit loop just before `tagString`; two lines in `mirrorShared_` (the twin counts the same part); `when:` tags on six of the code's own lines.
- `engine94SheetContract.js` — one string seed, `momentWhenByKind`, on `ENGINE356_CONFIG_SEEDS`.
- Data, not yet written anywhere: `output/engine-sheet/2026-11-25-e356r/when-rows.json` — 56 Event_Content_Ledger rows that get their own `when:` tags (`apply-when.js bench|live`).

The claim: no line, dial or bond moves. The same week on stage 85 and on this commit is identical line for line (in order) and bond for bond once `when:` tags are stripped (`compare.js`). No roll is drawn; the part is the least-held of the allowed parts, a tie by `spotRank_`.

Attack:
1. The no-op claim. Any path where a `when:` tag (on a pooled code line, on a ledger row, or written by `whenTagged_`) changes control flow, a draw, a weight, dedup, `primaryFromTags`, `gradedTagFor_` / `kindMovesNothing_` / `gradedOnlyBySource_`, `eventClassFromTags_`, `remember`, the pulse, telemetry, or anything in `bondEngine.js` / `compressLifeHistory.js` / `citizenDialMap.js` that reads EventTag or the tags array. A reader anywhere (five dirs + `world-view/`) that splits EventTag and chokes on, or mis-keys from, an unknown prefix or a tag containing a second colon-free value.
2. `whenTagged_`: a line that leaves with two `when:` tags or an invalid one; a row tag like `when:Evening`, `when: evening`, `when:`; `own` non-empty but the config off (must write none); `allowed` from a prototype key (`whenByKind_['constructor']`, `__proto__`) — both maps are `Object.create(null)`, check `mine` / `theirs` (`{}` literals) with part names; `cycle` and `popIdNorm` in scope and the values I think they are at the call site; `text` = the rendered `pick` including the `[rivalry active]` / arc suffixes.
3. Order: lines dropped after admission but before the write (is there a `continue` after my call that leaves a count without a line?); the grief entry, a template line, a bond-called line, a compose-null — each either tagged once or not counted.
4. The twin: `mirrorShared_` early returns (the gates) versus my count — I count in `mirrorShared_` after the gates, and the drawer's pick reads the other person's count only for `shared:both`. A twin whose tags lose or duplicate `when:` through the `oTags` filter / `mergeTags`. Does the twin ever get a part its own row would not allow (it is the same row — confirm).
5. `whenKindOf_`: `act:game` + `at:` tags = youth-game; a line with two `act:` tags; `prog:youth` prefix catching a non-youth type; kinds in the seed that no line carries, kinds lines carry that the seed lacks.
6. The seed: `inspectEngine94Config_` with a `'string'` spec on this list (the other 29 are numeric — does any consumer of `ENGINE356_CONFIG_SEEDS` assume numbers: `loadBondDials_`, the test files that iterate the list, `scripts/`); `loadConfig_` parseFloat on the seed text (does any prefix parse as a number?); the first fire after deploy — seeded before `loadConfig_` reads; a hand-edited cell with spaces, capitals, a trailing `;`, an unknown part.
7. The six code lines and the 56 rows (`when-rows.json`): a row whose words say a different time than the tag I gave it; a kind-tagged row whose words pin a time I missed (scan the live tab's `act:` rows and every `$CONTACT` row); a row where two or three parts is too loose or one is too tight.
8. `read.js`, `compare.js`, `apply-when.js`, `run.sh`, `bench-push.sh`, `push.sh` in `2026-11-25-e356r/`: a check that cannot fail; the replay of the spread (log order = write order? other writers' rows interleaved; a twin found by text when the two share a name fragment); `lineRe` matching the wrong row; `compare.js` stripping more than `when:`; `apply-when.js` writing when a row moved; the push scripts' base (stage 85 = `e356q-prod.sha256`, files at `71fc2eb9d`) and the two-file count.
9. Any silent fallback or weakened check.

Each finding: file:line, the input, what breaks. Verdict: SHIP / SHIP-WITH-FIXES / HOLD.

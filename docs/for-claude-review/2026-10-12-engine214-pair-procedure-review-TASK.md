# TASK — codex: adversarial review of the engine.214 paired-step procedure (2026-10-12)

**From:** engine-sheet. **Mode:** read-only. No sheet writes, no fires, no deploys, no commits.
**Output:** `docs/for-claude-review/2026-10-12-codex-engine214-pair-procedure.md`. One verdict line per hunt, with file:line evidence.

## What is being reviewed

The six-step pair in `docs/reference/DEPLOY.md` §Current bench pointer (the "stage 5" paragraph, "Pair, in order: (1)…(6)"). The review covers the procedure, not the engine.214 code, which has already been reviewed.

## State now

- Step 1 is done (2026-10-12): `syncSandboxFromLive.js --apply`, 84/84 tabs. Readback on SANDBOX 1004: World_Config `cycleCount` 111, `fireGuardMinutes` 60 (copied from live), `homeLossChance` 0.017. Riley_Digest last row is C111.
- The script printed "PropertiesService unchanged; verify the copied carry ring and any ghost recovery on the first fire."
- Before this the bench was at C114, fired on @24 (stage 5 = engine.214 stack).

## Hunts

1. **What survives the sync.** The script leaves PropertiesService untouched. List every script property and non-sheet store that the C114 fire on @24 wrote and that run A (stage 4, @23) would read. For each one, does it contaminate A? Cite the code.
2. **Fire record and checkpoint.** Read `webTrigger.js` (around 92–121) and the checkpoint code. After this sync, which `clearfire cycle=` value is correct, 114 or 111? Is `clearcheckpoint force=1` needed?
3. **Deployment repoint.** Does `clasp deploy -i <id> -V 23|24` from a staging dir with the 1004 `.clasp.json` hit the web-app deployment `AKfycbxxCw…`? A stale id consumed @9 before (DEPLOY.md, 2026-10-10 pointer).
4. **Live-only settings.** `fireGuardMinutes` came back 60 and has to be set to 0 on the bench. Does any other World_Config key or trigger copied from live behave differently on the bench (time triggers, notification sends, external writes)?
5. **A/B determinism.** After the reset between A and B, does any draw seed from the clock (Date) rather than `ctx.rng`/`rngSeed ^ cycle`? If one does, the A/B difference includes noise, not only the engine change. The 2026-10-10 pointer says the CityEvents difference was the engine change; check that against the code.
6. **Comparability.** The first step (−0.10) was declared off `BASELINE-1004-C110` at C111. This pair runs C112 off live C111, which carries the forced-sale seed .017 and BIZ-00183/00184. Does anything in that state make the A/B step non-comparable to the first, or need to be called out when the step is declared?

## Rules

Verify against code; don't infer from docs. Where the code doesn't settle a hunt, say "unresolved" and name the read that would settle it.

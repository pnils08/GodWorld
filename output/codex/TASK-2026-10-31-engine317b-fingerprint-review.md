# TASK — review engine.317 fingerprint (engine-sheet, 2026-10-31)

Round 1 of at most 2. Candidate `5043d7f6`, one file over PROD: `utilities/webTrigger.js`. PROD stage 33 (@169) has the door but no read key: its settings page keeps nothing it saves, so the door takes the key by SHA-256 fingerprint in code. Your earlier rounds on the door: `docs/archive/for-claude-review/2026-10-30-codex-engine317-{review,rereview}.md`.

| # | Where | Claim to check |
|---|---|---|
| C1 | `readFireAdmission_` | a key matching the fingerprint reads the record and nothing else; any other key is `bad token`; dropping the "no key set" refusal opens nothing |
| C2 | `webKeysCollide_`, `doGet`, `doPost` | the read key cannot fire or POST; a fire key whose fingerprint matches shuts every door; PROD, with no fire key, still answers `CYCLE_TRIGGER_TOKEN script property not set`, so the `prod-nofire` probe holds |
| C3 | `webSha256Hex_` | the hex equals a standard SHA-256 of a UTF-8 string, given Apps Script's signed bytes |
| C4 | `output/engine-sheet/2026-10-31-push-e317b-prod.sh` | copied from `2026-10-30-push-e317-prod.sh`; base stage 33, manifest `stage34-e317b.sha256`; the before-push door read is impossible again (no key on stage 33), the after-pull-back, +8, +16 reads stand |
| C5 | `output/engine-sheet/stage34-e317b.sha256` vs `stage33-e317.sha256` | differs from PROD only at `utilities/webTrigger.js`, and that hash is `5043d7f6`'s blob |

Tests: `scripts/cycleCheckpointWiring.test.js` 115/0, `scripts/fireGuard.test.js` 114/0, `scripts/archiveCitizenExits.test.js` 15/0.

Bench on `5043d7f6` (@173): `output/engine-sheet/2026-10-30-e317b-bench.log` (two equal door reads with the real read key, cycleCount unchanged). That log's fire lost its local wrapper at session close; the fire finished C123 done. A receipt fire `e317b-fire2` is in `output/engine-sheet/2026-10-19-benchfires.jsonl` once it lands.

Report only what breaks: the read key firing, more than the record exposed, a Cycle disturbed, a push stop that no longer stops. A condition the schedule does not produce is a one-line ceiling, not a HOLD.

Scope: read-only plus your review file; no web-app call, Sheet, deploy or env read. Write `docs/for-claude-review/2026-10-31-codex-engine317b-review.md` (file:line + input → wrong output; SHIP / SHIP-WITH-FIXES / HOLD), commit it alone.

# Deploy to Apps Script

**Deploys are the engine-sheet terminal's function (S282).** The full checklist (pre-flight,
verification, bookkeeping) lives in `.claude/skills/deploy/SKILL.md` — this file is the
minimal manual procedure.

**Deploy gate (S282):** `clasp push` is blocked unless `CLAUDE_CTL=1` is set — an opt-in
speed bump so other agents can't deploy to the live engine (same pattern as the S274 git
control-plane gate). `npm install` re-arms the gate automatically via `postinstall`.

## From this repo (usual path)

```bash
cd /root/GodWorld
CLAUDE_CTL=1 npx clasp push
```

## From Cloud Shell (manual fallback)

```bash
cd ~/GodWorld
git pull
npm install          # also re-arms the deploy gate
CLAUDE_CTL=1 npx clasp push
```

## First time setup (only once)

```bash
cd ~
git clone https://github.com/pnils08/GodWorld.git
cd GodWorld
npm install
npx clasp login
CLAUDE_CTL=1 npx clasp push
```

## If Cloud Shell resets

Cloud Shell sometimes clears installed packages. If clasp fails, run `npm install` first.

## Sandbox (vetting environment — Mike-direct 2026-07-06)

**All upgrades are vetted on the sandbox before a new live cycle runs.** If something
accidentally deploys to live, Mike can cycle live back via its version history — but the
sandbox is the intended target for anything unverified.

**Bench proof IS the gate (Mike-direct S328):** nothing is gated on a live run — the synced
bench is the same state as live, so the bench fire + sheet verify is the smoke. Live runs
clear whenever Mike fires them; they confirm, they don't gate.

**CURRENT sandbox: `SANDBOX 0720` (S328 2026-07-20).** Copy of live at post-C102 canonical state (prod code engine.57-.71 incl. weather/transit/crisis coupling; C102 fired live by Mike, verify PASS). Purpose: vet the next engine wave (Row 24 career-unfreeze prod window, engine.72 triage fixes) before live carries it. Sheet name `SANDBOX_0720_Simulation_Narrative` (71 tabs).
- Spreadsheet ID `1SHlquj9iLCK129SQEcXcvFCNkuGMgwLItDPj_ERiofI`
- Bound Apps Script ID: `1ntl6YwpLt-KwIX7HWCU-swMk-cGQ8aZR0aKNh5qUjz93m4OPUVhIB5nV`
- Code pushed at S328 (HEAD 8ab5a591, temp-dir route, sandbox `.clasp.json` ID grep-verified). Service-account read access verified from Node.
- SIM_SSID Script Property set (Mike, S328).
- Web-app deployment `AKfycbztm3ZXPO-V43KICxyFGJKS63jkZQJqATBotcuynuL9yl4lty3kaaO1YpYW4WUIMStq` @1 (S328 initial: HEAD 8ab5a591). CYCLE_TRIGGER_TOKEN set (Mike, S328 — 0717/0716c lineage value; properties don't copy with the sheet).
- Staging dir `sandbox-0720` (recreated per-session in scratchpad via `git archive HEAD`).
- S328 proving fires C103–C105 (Row 24 release 25→17→13 promotions, crisis detection C104, faith-join, 0 errors ×3).

### Groundhog proving loop (Mike-direct S328 — how engine waves ship)

The trigger token exists so the TERMINAL runs the proving loop itself, no Mike in the loop until the live fire:

1. **Build** on main, commit as-you-go.
2. **Push to bench** via the temp-dir route (sandbox `.clasp.json` written LAST, ID grep-verified — S316 gotcha).
3. **Bump the deployment** — `CLAUDE_CTL=1 npx clasp deploy --deploymentId AKfycbztm3… --description "<change>"`. **⚠️ `clasp push` alone does NOT change what the web-app fires (S325 incident)** — the deployment serves a PINNED version.
4. **Fire:** GET `https://script.google.com/macros/s/<deploymentId>/exec?token=<CYCLE_TRIGGER_TOKEN>`. Returns `{ok, ranMs, diag…}` JSON. **WARNING: any valid-token GET fires a FULL cycle — no ping mode.** Ask Mike for the Apps Script execution log when the JSON isn't enough.
5. **Verify** against the sandbox sheet via service account (explicit sheet ID — env default points at PROD). Run as many groundhog cycles as the change needs; repeat 2–5 until clean.
6. **Deploy proven code to live** (repo-root `CLAUDE_CTL=1 npx clasp push`, /deploy pre-flight).
7. **Terminal syncs the bench from live** for the next build wave: `node scripts/syncSandboxFromLive.js <sandboxSheetId> --apply` (S328, Mike-approved — replaces the manual version-history revert, which lost any direct writes postdating the sandbox's copy snapshot; live is the complete truth since every sheet write replays there). Values-only, batched under API write quota, oversized Media_Briefing cells truncated (regenerated display artifacts), read-back verified on the 5 biggest tabs. Dry-run without `--apply`. Refuses to run against the live ID. Bench 0720 is the PERMANENT bench under this model — no more per-wave sandbox stand-ups.

**Sheet writes are a different animal (Mike-direct S328): anything not in CODE does not carry over.** A `clasp push` to live carries code only. Schema changes, new tabs, column adds, data migrations, backfills — anything written to the SANDBOX SHEET during proving — must be **replayed against the live sheet explicitly** (dry-run → apply → read-back verify, per protocol step 5). Track every bench-side sheet write during a wave and replay it at the live deploy, or live runs new code against old schema. Self-arming schema code (ensure*Schema_ patterns) re-arms itself on live's first fire and needs no replay — everything else does.

**PropertiesService is per-script (S328 finding):** prev-cycle state (PREV_EVENING_JSON etc.) does not copy with the sheet. A fresh bench's FIRST fire is a cold start — carry-dependent channels (hospital→crisis detection, streak-gated weather alerts, prevRate) only prove from the SECOND bench fire on. Don't read a quiet first fire as a failed channel.

**RETIRED: `SANDBOX 0717` — GROUNDHOG BENCH (S322→S327; retired S328, superseded by post-C102 live copy).** Served the C102 groundhog era: engine.64/.64b proving (93 households, 0 errors), engine.70/71 + Row-24 proving fires C112–C117, bench closed at abs C117 @31. Live C102 (2026-07-20) is the canonical continuation; this bench's state predates it.
- Spreadsheet ID `1ZP9kiwjXngDNqOtnRby9jGxFZnSahpP3T9SLnJoTwS8`
- Bound Apps Script ID: `1e9xNz0f13kRjk0XP0lUNwAsAOnLYI-uaLJTkJN5L2O43Mqv1q6g3UckT`
- Web-app deployment `AKfycbzlOhkYsWwP7wbyNAkaiHZqzwktwJc3THRKUnG8AAQhaRXDjpVHp9_mxGFqbuWf-TLC` @31; SIM_SSID + CYCLE_TRIGGER_TOKEN set (token in sl-engine-sheet). **WARNING: any valid-token GET still fires a FULL cycle on this retired bench.**

**RETIRED: `SANDBOX 0716c` — CONTAMINATED, NEVER TOUCH (S322).** Its S321 "canon" C102+C103 are VOID — heritage/marriage contamination; live was restored to canon C101 (2026-07-17 12:30 backup) and the heritage/marriage code fully reverted (442d1ca8).
- Spreadsheet ID `1erYtwSm8s6TczRTiLFbUQ302viC_MmVULWScITKRues`
- Bound Apps Script ID: `12W_j60_flC3rr6KyiWrRiU8AcpRY-GDbvGmuNbD-NmR059NFnJTHCwOv`

**RETIRED: `SANDBOX 0716b` — CONTAMINATED, NEVER TOUCH (S322)** (S321 — served engine.59/.60/.61 proving fires C102-C119; retired with 0716c, same contamination class)
- Spreadsheet ID `1reNGLnvimH5vmMs2opPylA1QRpNDKwiVRiN8aYXeAVU`
  URL: https://docs.google.com/spreadsheets/d/1reNGLnvimH5vmMs2opPylA1QRpNDKwiVRiN8aYXeAVU/edit
- Bound Apps Script ID: `1iA6aG5bk_KOC3QeAu_9P8blRMG7lbrRrL0t3hVmyNwl4-TuJbSQrFjSa`
- **SIM_SSID Script Property = the Spreadsheet ID above — Mike must set this before the first fire (protocol step 3; the 0714 incident step)**

**RETIRED: `SANDBOX 0716`** (S320 — proved engine.58 across 2 cycles + kill-list fixes: 48/48 family HH incomes true, 0 minor salaries, EducationLevel stable, full-ledger education fill)
- Spreadsheet `13Ri5mujcno19KGp4yF19ojQ8-TIVeATRWrxcfBnJJPw` / script `1fS4u4UWbH-FArX0CjFyetB37fcwHRLVkGQy5g9Z7enf5XsdOLze-lT1T`

**RETIRED: `SANDBOX 0715`** (S320 — served engine.58 proving run C102/Y2C52 + Y3C1: 21 emergence ticks, Isaac Green lottery promotion end-to-end; superseded by post-S320-live copy)
- Spreadsheet `1HgJPjcS4t6a5CGSOgDuQoRr8tTTc1OQfGfSS1wuuxgA` / script `18cODsLhYWoRojEoqinlqXxntFFjjrCdW38ca8ZWmyhuVkhwRGqYGJ7Kn`

**RETIRED: `SANDBOX 0714`** (S319 — served C102-C104 engine.57 proving run; superseded by post-go-live copy)
- Spreadsheet `1wmZTGqIbYL7eVYCplq3iCb2oOGDZ0Inq-pWCtnD1lzc` / script `1h523JicgvHOXoD-lTBCZxFyxybYnvMApgJDqHIfVH6jLq2SKcpL6hIiX`

**RETIRED: `SANDBOX_0702`** (S318 — broken col-Q incident C134; do not deploy or write)
- Spreadsheet `1syShVWfudY0eCC9rnR7AWZ8-b-fs5RpJW2bhn6nZtzs` / script `1bT3o5r6adZhSv20pa0ijoHv_HdeEbONtBT2bsw_8U-sHbWgyJz94ueIW`

### Standing up a NEW sandbox (protocol, S318)
1. **Mike:** in Drive, File → Make a copy of the live spreadsheet (the bound Apps
   Script copies with it — automatically bound to the copy).
2. **Mike:** open the copy → Extensions → Apps Script → Project Settings → copy the
   **Script ID** to the terminal.
3. **Mike (REQUIRED — every new copy):** same Project Settings page → **Script
   Properties** → Add script property: `SIM_SSID` = the copy's own spreadsheet ID.
   Script Properties do NOT copy with the spreadsheet; without this the script
   falls back to the hardcoded LIVE id (`DEFAULT_SIM_SSID`,
   `utilities/utilityFunctions.js:182`) and the AIM-GUARD blocks every run.
   (S319 incident: SANDBOX 0714's first C102 fire died on exactly this — step was
   missing from the S318 protocol.)
4. **Isolation is by construction** — verified S318: the engine contains zero
   `openById` calls; the bound script only ever touches its own container. No
   wrapper needed. (Node scripts are the only cross-container access and take
   explicit sheet IDs — never rely on env default when targeting a sandbox.)
5. **Terminal:** update THIS section (new IDs, retire the old ones), then clasp
   push via the temp-dir route below, then replay any pending data migrations
   against the new sheet ID (dry-run → apply → read-back verify).
6. Triggers do NOT copy — sandbox cycles are Mike-fired from the sheet, which is
   the intended mode.
- **Sandbox clasp deploy:** copy repo to a temp dir, drop a `.clasp.json` with the sandbox
  Script ID + the project `.claspignore`, `CLAUDE_CTL=1 npx clasp push -f`. The production
  `.clasp.json` at repo root is never touched. (Route defined in
  [[../plans/2026-07-04-ripple-ledger-attribution]] §Sandbox identity.)
  **⚠️ `.clasp.json` is GIT-TRACKED with the PRODUCTION script ID** — any repo-copy step
  (`git archive | tar -x`, `cp -r`, `rsync`) lands the production ID in the staging dir.
  Writing the sandbox `.clasp.json` must be the LAST step before push, and every sandbox
  push is preceded by verifying the staged file carries the sandbox ID
  (`grep 1bT3o5r6 .clasp.json`). S316 incident: a re-extract over an existing staging dir
  silently restored the production ID and one sandbox-intended push landed on the
  production script.
- **Node scripts against the sandbox:** `GODWORLD_SHEET_ID` in the env points at
  **production** — always pass the sandbox explicitly, e.g.
  `node scripts/draftContentRows.js --cycle {XX} --apply --sheet-id 1wmZTGqIbYL7eVYCplq3iCb2oOGDZ0Inq-pWCtnD1lzc`
- Cycle runs are Mike-fired from the sandbox sheet; SANDBOX 0714 starts at C102.

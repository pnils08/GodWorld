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

**CURRENT sandbox: `SANDBOX 0717` — GROUNDHOG BENCH (S322 2026-07-17).** Copy of live as restored to canon C101 (post-S322 rollback; prod code engine.57-.62b + .64/.64b). Groundhog protocol: re-fire C102 on this bench until the code proves clean, then live carries the proven code and **Mike fires the canonical cycle on LIVE from the sheet** (supersedes the 0716c-era "live never fires" model). C102 proven clean here across 3 runs (engine.64/.64b: 93 households formed, Traded/pending excluded, 0 errors/dupes).
- Spreadsheet ID `1ZP9kiwjXngDNqOtnRby9jGxFZnSahpP3T9SLnJoTwS8`
- Bound Apps Script ID: `1e9xNz0f13kRjk0XP0lUNwAsAOnLYI-uaLJTkJN5L2O43Mqv1q6g3UckT`
- Web-app deployment `AKfycbzlOhkYsWwP7wbyNAkaiHZqzwktwJc3THRKUnG8AAQhaRXDjpVHp9_mxGFqbuWf-TLC` @1; SIM_SSID + CYCLE_TRIGGER_TOKEN set (token in sl-engine-sheet). Staging dir `deploy0717`. **WARNING: any valid-token GET fires a FULL cycle — there is no ping mode.**

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

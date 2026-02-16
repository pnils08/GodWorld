# Drive Upload Guide

**Quick reference for saving files to Google Drive.**

Last Updated: 2026-02-16 | Session: 32

---

## Upload Command

```bash
node scripts/saveToDrive.js <local-file> <destination>
```

---

## Destinations

| Shortcut | Drive Path | What Goes Here |
|----------|-----------|----------------|
| `edition` | Publications Archive / 1_The_Cycle_Pulse / Y_001 | Cycle Pulse editions (text files) |
| `supplement` | Publications Archive / 2_Oakland_Supplementals | Oakland supplemental editions |
| `chicago` | Publications Archive / Chicago_Supplementals | Chicago supplemental editions |
| `mara` | Publications Archive / Mara_Vance | Mara Vance directives & audits |
| `briefing` | Publications Archive / Mara_Vance | (Alias for mara) |
| `presser` | Publications Archive / Mike_Paulson_Pressers | Paulson press conference transcripts |
| `player` | As Universe Database / Players / MLB_Roster_Data_Cards | A's player data cards |
| `prospect` | As Universe Database / Players / Top_Prospects_Data_Cards | A's prospect data cards |
| `bulls` | Bulls Universe Database / Player_Cards | Bulls player data cards |

You can also pass a raw Drive folder ID as the destination.

---

## Common Workflows

### After producing an edition
```bash
node scripts/saveToDrive.js editions/cycle_pulse_edition_82.txt edition
```

### After Mara audit
```bash
node scripts/saveToDrive.js output/mara_directive_c82.txt mara
```

### After creating a player card
```bash
node scripts/saveToDrive.js output/player_cards/POP_00001_Vinnie_Keane.txt player
```

### Oakland supplemental
```bash
node scripts/saveToDrive.js editions/oakland_supplemental_c82.txt supplement
```

### Chicago supplemental
```bash
node scripts/saveToDrive.js editions/chicago_supplemental_c82.txt chicago
```

---

## Setup (One-Time)

Drive write access requires OAuth2 credentials (the service account can read but not write).

### Step 1: Create OAuth Client
1. Go to https://console.cloud.google.com/apis/credentials
2. Select project: `godworld-486407`
3. Click **Create Credentials** > **OAuth client ID**
4. Application type: **Desktop app**
5. Name it: `Mags Drive Writer`
6. Copy the **Client ID** and **Client Secret**

### Step 2: Add to .env
```
GOOGLE_CLIENT_ID=your-client-id-here
GOOGLE_CLIENT_SECRET=your-client-secret-here
```

### Step 3: Authorize
```bash
node scripts/authorizeDriveWrite.js
```
This opens a URL — paste it in your browser, authorize, paste the code back. The refresh token saves to `.env` automatically.

### Step 4: Test
```bash
node scripts/saveToDrive.js --test
```
Creates a test file in Publications Archive, then deletes it. If you see "Drive write access confirmed!" you're good.

---

## After Uploading

Refresh the local mirror to pick up the new file:
```bash
node scripts/buildCombinedManifest.js        # re-crawl
node scripts/downloadDriveArchive.js --refresh  # download only new files
```

---

## Root Folders (Fallback)

If a shortcut isn't mapped, you can use root folder names:

| Root | Drive Folder |
|------|-------------|
| `tribune` | Tribune Media Archive (journalist desks) |
| `sports` | Sports Desk Archive (Hal, Anthony, P Slayer) |
| `publications` | Publications Archive (editions, supplementals) |
| `as_universe` | A's Universe Database (players, stats, rosters) |
| `bulls_universe` | Bulls Universe Database (player cards, contracts) |

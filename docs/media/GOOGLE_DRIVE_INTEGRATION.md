# Google Drive Integration for Citizen Narrative Memory

**Created:** 2026-02-12
**Status:** Active
**Access Level:** Read + Write

---

## Overview

Claude Code can now **read and write** to GodWorld Google Drive folders, enabling:
- Access to TrueSource DataPages (OCR-extracted game stats)
- Richmond Archive materials (origin stories)
- Visual assets (character portraits, screenshots)
- Canonical event documents (2040 returns, transactions)
- **POPID standardization** across all legacy documents

---

## Service Account Configuration

**Email:** maravance@godworld-486407.iam.gserviceaccount.com
**Credentials Path:** `process.env.GOOGLE_APPLICATION_CREDENTIALS`

### Scopes by Operation

**Read-Only Operations:**
- `https://www.googleapis.com/auth/drive.readonly` - Download files
- `https://www.googleapis.com/auth/drive.metadata.readonly` - List folders
- `https://www.googleapis.com/auth/spreadsheets.readonly` - Read Simulation_Ledger

**Write Operations:**
- `https://www.googleapis.com/auth/drive` - Update existing files
- `https://www.googleapis.com/auth/spreadsheets` - Update Google Sheets

---

## Scripts Created

### scripts/listDriveFolder.js
```bash
node scripts/listDriveFolder.js [folderId]
```
Lists all files in a Google Drive folder with metadata (name, ID, type, size).

**Example:**
```bash
node scripts/listDriveFolder.js 1QvSnDxyx0awhW9rWHz7ZNabwpVr7c3-H
# Returns: Benji Dillon TrueSource files
```

### scripts/downloadDriveFile.js
```bash
node scripts/downloadDriveFile.js [fileId] [outputPath]
```
Downloads a file from Google Drive to local filesystem.

**Example:**
```bash
node scripts/downloadDriveFile.js 1Q4kn6-reIYmjp7SSNSdRWGQaB0Ei46oE /tmp/benji_truesource.txt
```

### scripts/updateDriveFile.js (NEW)
```bash
node scripts/updateDriveFile.js [fileId] [localFilePath]
```
**Uploads updated content to existing Google Drive file.**

**Example:**
```bash
node scripts/updateDriveFile.js 1A6_3FQA7xIwM7eLhSx4ovCXT4Cbg2RKA /tmp/corrected_datapage.txt
# Updates POP-00006 → POP-00018
```

**Key Implementation:**
- Uses `https://www.googleapis.com/auth/drive` scope (full access)
- Updates existing files without creating duplicates
- Preserves file metadata (creation date, location, sharing settings)

---

## TrueSource DataPage System

### What is TrueSource?

**TrueSource DataPages** are OCR-extracted game statistics from MLB The Show/NBA 2K that serve as canonical performance data for Sports Clock characters.

**Format:**
```
Classification: Verified Core | Source: OCR Extraction (Refined)

Profile Summary
Name: [Player Name]
Age: [Current Age] | Height/Weight: [Physical Stats]
Position: [Role]
Overall: [Rating] (A/B/C Potential)
Service Time: [Years] MLB

Awards
[List of awards with years]

Career Totals
[Cumulative statistics]

Year-by-Year Stats
[Season-by-season performance table]
```

**Example Use Case: Benji Dillon**
- TrueSource showed 5× Cy Young (2028, 2032, 2033, 2034, 2037)
- Confirmed "The Golden Arm" dynasty status with actual game data
- 200 career wins validates Richmond Archive narrative
- Age 36 in 2039 aligns with 2006 birth year (Sports Clock 2041)

---

## POPID Standardization Workflow

**Problem:** Legacy documents created before Google Sheets system used different POPIDs.

**Solution:** Update all legacy POPIDs to match Simulation_Ledger canonical values.

### Process

1. **List folder contents**
   ```bash
   node scripts/listDriveFolder.js [folderId]
   ```

2. **Download legacy document**
   ```bash
   node scripts/downloadDriveFile.js [fileId] /tmp/legacy.txt
   ```

3. **Identify POPID discrepancy**
   - Legacy: POP-00006 (Benji Dillon)
   - Simulation_Ledger: POP-00018 (canonical)

4. **Create corrected version locally**
   - Edit file to replace old POPID
   - Add legacy reference section:
   ```
   --- LEGACY REFERENCE ---
   Previous POPID: POP-00006 (pre-Sheets system)
   Current POPID: POP-00018 (Simulation_Ledger canonical)
   ```

5. **Upload corrected version**
   ```bash
   node scripts/updateDriveFile.js [fileId] /tmp/corrected.txt
   ```

6. **Verify update**
   ```bash
   node scripts/downloadDriveFile.js [fileId] /tmp/verify.txt
   head -10 /tmp/verify.txt  # Confirm POPID changed
   ```

### Completed POPID Updates

| Character | Legacy POPID | Current POPID | Status |
|-----------|--------------|---------------|--------|
| Benji Dillon | POP-00006 | POP-00018 | ✅ Updated |

---

## Expanded Material Sourcing Capabilities

### Before Google Drive Integration
- Limited to Simulation_Ledger metadata
- Richmond Archive materials provided manually
- No access to TrueSource game stats
- Visual assets unavailable

### After Google Drive Integration
✅ **TrueSource DataPages** - OCR game stats for Sports Clock canon
✅ **Richmond Archive** - Origin stories, dynasty narratives
✅ **Visual Assets** - Character portraits, game screenshots
✅ **Canonical Events** - Transaction logs, return announcements
✅ **Legacy Documents** - Pre-Sheets materials now accessible
✅ **POPID Standardization** - Can update outdated references

### Searchability Enhancement

**All materials now searchable by POPID in supermemory:**
```bash
/super-search "POP-00018 Benji Dillon Cy Young"
# Returns: TrueSource stats, Richmond origins, 2040 return, visual description
```

**Cross-reference capability:**
- Game stats (TrueSource) + narrative origins (Richmond Archive)
- Career performance + personality/background
- Sports Clock events + City Clock neighborhood life
- Visual assets + written descriptions

---

## Integration with Citizen Narrative Memory

### Enhanced Save Structure

**Example: Benji Dillon (POP-00018)**

**Sources Integrated:**
1. **Simulation_Ledger** - Neighborhood (Rockridge), birth year (1988 game metadata), usage count (2)
2. **Richmond Archive** - Origin story (surfer's son, shark attack, Marine Biology)
3. **TrueSource DataPage** - Career stats (200 wins, 5× Cy Young, 2025-2039 seasons)
4. **2040 Return Document** - Canonical event (1yr/$24.07M, "Holy Toledo!")
5. **Visual Asset** - Portrait description (A's uniform, beard, green eyes)

**Result:** Comprehensive searchable profile combining game data + narrative context + visual reference.

### Workflow for New Characters

1. **Access Google Drive folder** for character
2. **Download all materials** (DataPage, returns, images, archives)
3. **Cross-reference Simulation_Ledger** for current POPID
4. **Update legacy POPIDs** in Drive files
5. **Extract key data:**
   - TrueSource: Career stats, awards, ratings
   - Richmond: Origins, personality, relationships
   - Events: Transactions, returns, milestones
   - Visual: Portrait descriptions
6. **Create supermemory save** with integrated data
7. **Tag with POPID** for searchability

---

## Dynasty Five TrueSource Processing Plan

**Remaining Characters:**

| POPID | Character | Status |
|-------|-----------|--------|
| POP-00018 | Benji Dillon | ✅ Complete (TrueSource + 2040 return integrated) |
| POP-00001 | Vinnie Keane | ⏳ Pending (check for TrueSource folder) |
| POP-00019 | Isley Kelley | ⏳ Pending (check for TrueSource folder) |
| POP-00020 | Mark Aitken | ⏳ Pending (check for TrueSource folder) |
| POP-00021 | Darrin Davis | ⏳ Pending (check for TrueSource folder) |

**Process for each:**
1. List Drive folder contents
2. Download TrueSource DataPage + event documents + images
3. Update legacy POPIDs to match Simulation_Ledger
4. Upload corrected versions to Drive
5. Create enhanced supermemory save
6. Document in CITIZEN_NARRATIVE_MEMORY.md

---

## Technical Notes

### Error Handling: "File not found"

**Issue:** `drive.file` scope only works for app-created files.
**Solution:** Use `drive` scope for full access to existing files.

**Before:**
```javascript
scopes: ['https://www.googleapis.com/auth/drive.file']  // ❌ Fails on existing files
```

**After:**
```javascript
scopes: ['https://www.googleapis.com/auth/drive']  // ✅ Works on all files
```

### File Update vs Upload

**Update (PATCH):**
- Preserves file ID, sharing settings, location
- Use for correcting existing documents
```javascript
drive.files.update({ fileId, media: { body: content } })
```

**Upload (POST):**
- Creates new file with new ID
- Use for new documents only
```javascript
drive.files.create({ requestBody: metadata, media: { body: content } })
```

---

## Security Considerations

**Service Account Access:**
- Read access: All GodWorld folders
- Write access: Controlled by Drive folder permissions
- Cannot delete files (safety measure)
- All operations logged via Google Cloud Console

**Scope Principle:**
- Use narrowest scope possible for each operation
- `drive.readonly` for downloads
- `drive` only when updates required

---

## Future Enhancements

**Potential Additions:**
1. **Batch POPID updater** - Process entire folder of legacy documents
2. **TrueSource parser** - Automated stat extraction to JSON
3. **Image uploader** - Save generated portraits to Drive
4. **Version control** - Track POPID update history
5. **Drive folder creator** - Organize new character materials

---

## Related Documentation

- [CITIZEN_NARRATIVE_MEMORY.md](CITIZEN_NARRATIVE_MEMORY.md) - Supermemory integration
- [TIME_CANON_ADDENDUM.md](TIME_CANON_ADDENDUM.md) - Dual-clock system
- [PAULSON_CARPENTERS_LINE.md](PAULSON_CARPENTERS_LINE.md) - Character background example

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| v1.0 | 2026-02-12 | Initial documentation, updateDriveFile.js created, Benji Dillon POPID updated, TrueSource integration documented |

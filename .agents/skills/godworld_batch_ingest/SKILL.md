---
name: godworld_batch_ingest
description: Safely fetch, deduplicate, and ingest an entire Google Drive folder of GodWorld canon files into Supermemory.
---

# GodWorld Batch Drive Ingestion

When the user asks to "batch ingest", "sweep", or "process" a Google Drive folder full of articles or canon files, use this skill to fetch, deduplicate, and ingest them automatically without creating duplicates.

### Step 1: Run the Batch Ingestion Script
Execute the batch script, passing the Google Drive Folder ID as the first argument.

```bash
node /root/GodWorld/.agents/skills/godworld_batch_ingest/scripts/batchIngestDriveFolder.js <FOLDER_ID>
```

**What the script does:**
1. Calls `listDriveFolder.js` to get all files in the directory.
2. Filters for `.txt` and `.md` files (ignoring subdirectories, PDFs, etc.).
3. Fetches each file locally using `fetchDriveFile.js`.
4. Checks `/v3/search` in Supermemory using the first 150 characters of the file to see if an identical chunk is already ingested (Score > 0.80).
5. If not a duplicate, runs `ingestEdition.js` to ingest the file into Supermemory.
6. Writes a detailed log to `changelog.md` in the current working directory.

### Step 2: Review Changelog
Read the generated `changelog.md` in your current working directory and summarize the results for the user (how many were skipped as duplicates, how many were newly ingested).

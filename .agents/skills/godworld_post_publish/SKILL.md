---
name: godworld_post_publish
description: The official 4-step intake pipeline for publishing and ingesting GodWorld pieces into the canon engine.
---

# GodWorld Post-Publish Pipeline

When the user asks to "post-publish" or ingest a finalized artifact, you must execute the following 4 steps in exact order. 

**Prerequisites:** 
- The artifact must clear all "Direct-Piece Canon Guardrails" (verified POP-IDs, correct NEW citizen freeform formatting, no real-world names).
- Ensure you are working with a `.txt` file (if the artifact is `.md`, the system often generates an identical `.txt` alongside it, or you must `cp` it to `.txt` for the wiki script).

### Step 1: Save to Drive
Upload the file to the target Google Drive folder.
```bash
node scripts/saveToDrive.js <absolute_path_to_file> <folder_id> --type <edition|supplemental|interview> --cycle <cycle_number>
```

### Step 2: Ingest Published Entities
Write any new citizens or businesses to the `Simulation_Ledger`. **Crucial:** You must use `--apply` to actually write to the sheets.
```bash
node scripts/ingestPublishedEntities.js <absolute_path_to_file> --cycle <cycle_number> --apply
```
*Check the output to see if new candidates were appended. Note their new POP-IDs (e.g., POP-01023).*

### Step 3: Build Citizen Cards
For EVERY new citizen successfully appended in Step 2, you must build their wiki card so they exist in the GodWorld Wiki.
```bash
node scripts/buildCitizenCards.js --name "<Citizen Full Name>" --apply
```

### Step 4: Ingest Edition Wiki
Extract the text memories and storylines and inject them into the engine. This script requires a `.txt` extension.
```bash
node scripts/ingestEditionWiki.js <absolute_path_to_file.txt> --type <edition|supplemental|interview> --cycle <cycle_number> --apply
```

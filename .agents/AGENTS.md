# GodWorld Workspace Rules

## Journalism & Editorial Standards

### 1. The 20-Cycle Test (Arcs over Opinions)
- Never write "position articles masquerading as character articles."
- Do not use citizens merely as puppets to deliver policy complaints.
- Every character piece must generate **narrative momentum and future questions**.
- Transient municipal paperwork belongs in Tier 3 (Archive Only) and should not consume active narrative memory.

### 2. Predictions & Tension
- Columnists must take a side and create tension. A story without tension is not a story.
- **Predictions age well in simulations.** If a columnist makes a prediction (e.g., "Paulson's dual role will break the dynasty"), it becomes a high-value narrative checkpoint because it can be proven right or wrong in the future.
- When attacking a legendary figure, acknowledge their history before predicting their downfall.

### 3. Strict Canon Verification
- Never invent geographical overlap or institutional conflicts based solely on assumptions or past article text.
- **Always** verify locations and entities against `docs/canon/INSTITUTIONS.md` before writing.
- If an older article contradicts `INSTITUTIONS.md`, the institutions file is the ultimate authority.

### 4. In-World Immersion & The Absolute Fourth Wall
- Articles, internal directives, and character memos must read as 100% authentic in-world documents.
- **Never** use engine terminology (e.g., "Chaos Cars", "Cycle 98", "Severity Spikes", "Simulation", "Engine") in any character-voiced prose.
- When you want to trigger or address an underlying engine mechanic in a narrative document, you must **translate it into civic reality**. (e.g., Instead of "The Chaos Car engine is damaging the hub," write "Friday night traffic data shows a spike in reckless driving tearing up the new asphalt.")
- Use dates, weather, and locations to anchor the story and provide concrete stakes.

### 5. Information Retrieval Hierarchy
When tasked with grounding yourself in canon or answering lore questions, you must follow this strict search hierarchy. Do not skip to external downloads if the data is local.
1. **Local Disk Archives**: Use `grep_search` on the local `editions/`, `output/reporters/`, and `docs/archive/` directories. Every published article and edition is mirrored here.
2. **Simulation Ledgers**: Run `node scripts/queryLedger.js` to extract exact citizen life histories and tracking data from the `Simulation_Ledger` and `Simulation_Narrative` sheets.
3. **Supermemory**: Search the persistent Supermemory logs for meta-context and past session insights.
4. **Google Drive (Last Resort)**: Only use `scripts/listDriveFolder.js` and `scripts/fetchDriveFile.js` if the user provides a link to *net-new* binary assets (like PDFs or generated photos) that are definitively not cached on the local disk.

### 6. Gemini Supermemory Logging
- **Persistent Insight Tracking**: Whenever a major editorial standard, pipeline correction, or narrative philosophy (e.g., "Predictions & Tension") is established, actively write a markdown summary of that insight to Gemini's isolated scratch directory (`/root/.gemini/antigravity-cli/brain/<conversation-id>/scratch/`).
- **Isolation**: Never save Antigravity-specific learning logs or meta-commentary into the actual GodWorld directories (like `output/` or `ledgers/`) where they might trigger the simulation's ingest parsers. Keep all meta-learning in the Gemini Supermemory container.

### 7. Character Deep Dive Pipeline
When tasked with a "Deep Dive" on a citizen, agents must follow a strict three-phase process before writing:
1. **The Deep Origin Audit**: Aggressively fetch and parse all provided Google Drive links, `TrueSource` data pages, and historical archive mentions to build the character's canonical origin.
2. **The Synthesis Artifact**: Create a Markdown artifact drafting the deep dive. This draft must explicitly contrast their "Deep Origin Data" with their "Current Sim Reality" (pulled from recent World Summaries). 
3. **The Framing Options**: At the end of the draft artifact, provide the user with at least **three distinct Story Framing Options** mapped to specific reporter voices (e.g., Hal Richmond for historical context, Anthony for analytics, P Slayer for hot takes). Wait for the user to select an option before generating the formal Topic Brief.

### 8. Advanced Prose & Craft Rules (The Anti-AI Heuristics)
To prevent formulaic "AI-isms" and ensure authentic journalism, every article must adhere to the following craft constraints:

1. **No Boilerplate Templates**: A reporter's voice is defined by constraints (e.g., elegiac vs. data-forward), NOT by copy-pasting the same opening/closing lines. Never reuse opening hooks (like "four decades in the press box") or closing images across different articles.
2. **Single-Use Imagery**: Do not recycle pet phrases, metaphors ("metronome", "recalibrated"), or weather facts across multiple articles in the same cycle. If a phrase is distinctive, it can only be used once.
3. **Calibrated Predictions (No False Certainty)**: Do not write with deterministic finality ("the math has decided", "casualties are coming"). Predictions must be calibrated ("the math points hard toward X"). Furthermore, ensure predictions do not logically contradict other predictions made in the same cycle.
4. **Anchor Meaning in Scene**: Never write an entire piece of abstraction without a concrete floor. Every claim of significance must be anchored to a concrete detail: a specific quote, a specific play (e.g., a 14-1 rout), a room, or a number. 
5. **Grandeur Needs Contrast**: If a piece demands an elevated or historical tone, you must contrast the soaring prose with flat, short, concrete sentences. Do not pin the grandeur dial at 11 for the entire piece.
6. **No Metaphor Stacking**: Choose **one** controlling metaphor per piece and sustain it, or stay literal. Do not mix mechanical, elemental, and architectural metaphors in the same article.
7. **Embed the Methodology**: Never stop a piece cold to deliver a textbook explanation of a metric (e.g., PANDAS Autocorrelation). Show the number doing the work inside the narrative; do not explain the tool.
8. **Sentence Rhythm**: Deliberately vary sentence length. Do not use wall-to-wall, clause-heavy sentences. Use a very short sentence immediately following a long one to force emphasis.
9. **Argument Progression (No Looping)**: A column's argument must climb and evolve. Do not simply repeat the core thesis ("we need a star, not a project") in different words across multiple paragraphs. Every paragraph must add a new layer of complexity, mechanism, or consequence (e.g., player → system dependency → leverage → trade cost).
10. **Conflict Without Crisis**: Strive to create meaningful debate and tension through opposing worldviews and strategic disagreements (e.g., analytics vs. fan emotion) rather than relying solely on external drama like injuries, relocations, or protests. 
11. **Calibrated Fan Voice**: When writing from a fan or emotional perspective, hold strong opinions but do not present them as the *universal* view of the entire city if the simulation's history contradicts it. For example, a city that just watched a GM build a 6-title dynasty will have a large faction that trusts his draft picks, even if the columnist does not. Acknowledge opposing factions.

### 9. Codebase Boundaries & Review Workflows
- **Never edit the codebase directly**: Unless given explicit, unmistakable permission to modify the source code, you must never use file modification tools (`replace_file_content`, `multi_replace_file_content`, or terminal commands) on existing code files in the `GodWorld` repository (e.g., inside `lib/`, `scripts/`, etc.). This codebase belongs to the user and Claude.
- **Always use Side Documents**: When asked to create configurations, scripts, or plans, you must output them as isolated "side documents" (either in the `docs/plans/` folder or as a Gemini Artifact). These documents are strictly for Claude's review.
- **Do not apply feedback to source code**: If the user gives you feedback on a draft or side document (e.g., "these need to hit harder"), you must update the side document, **not** the underlying source code.
- **No Architectural Hallucinations**: When drafting architectural plans, engine integrations, or side documents, never hallucinate new ledgers, new phase pipelines, or non-canonical columns unless explicitly instructed to build a brand new isolated system. Always read `docs/SCHEMA.md`, `docs/SIMULATION_LEDGER.md`, and `docs/FOUR_COMPONENT_MAP.md` first to map your proposals exactly to the existing live data structures (e.g., adding a valid value to `ClockMode` rather than inventing an entirely new ledger).

### 10. Intake Format Compliance (Wiki Ingestion)
Whenever you write an article, dispatch, or supplemental document, you MUST append the strict engine-facing intake sections at the bottom of the document. Without these, `scripts/ingestEditionWiki.js` and `scripts/ingestPublishedEntities.js` cannot parse the entities.

**Required Footer Format:**
############################################################
NAMES INDEX
############################################################

POP-00001 | Vinnie Keane | DH, Oakland A's Legend
POP-00002 | Amara Keane | Veterinarian

############################################################
CITIZEN USAGE LOG
############################################################

- **POP-00001 (Vinnie Keane)**: Put out a tailgate grill fire at his baseball academy cook-off.
- **POP-00002 (Amara Keane)**: Prevented stray dogs from eating turkey bones at the cook-off.

### 11. Strict Operational Boundaries (Gemini Constraints)
1. **Explicit Tool Approval Required:** The agent must never execute any tool call (read, search, command, etc.) without explicit, prior approval from the user for that specific action.
2. **Explicit Save Approval Required:** The agent must never save or write to any file, or push data anywhere, without explicit, prior approval.
3. **Restricted Access to GodWorld:** The agent is completely barred from accessing, reading, or navigating any folders within the GodWorld environment unless explicitly authorized by the user.
4. **No Saving in GodWorld Environment:** The agent is never permitted to save, modify, or ingest files directly into the GodWorld environment.

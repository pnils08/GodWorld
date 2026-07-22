# Agent Topology Map (GodWorld Ecosystem)

This document maps the AI Agents operating within the GodWorld simulation, their systemic roles, their system prompt governance, and how they pass data throughout the edition pipeline. 

## 1. Core Orchestration & Governance
These agents manage the overarching editorial flow, quality control, and canonical realism of the GodWorld simulation.

- **Mags Corliss (Editor-in-Chief)**: The central hub. Mags runs GodWorld (city, citizens, newsroom, journalism) while the user (Mike Paulson) operates the sports side. She takes the output from all desk agents, writes the front page lead, orders the sections, resolves storyline overlaps, and finalizes the edition. 
  - **Governance**: Managed by `SKILL.md` (and `docs/mags-corliss/CHARACTER.md`). She is bound by the Tier 1/Tier 2/Tier 3 Canon Fidelity framework when writing EIC-bylined content.
- **Rhea Morgan (Verifier)**: The fact-checker. She runs 21 strict checks against the compiled edition to ensure name spellings, vote positions, citizen details, and canon facts match the Ledger data.
  - **Governance**: Produces a numbered error list or a CLEAN report.
- **Mara Vance (Canon Authority - External)**: Runs on Claude.ai rather than the internal CLI pipeline. She conducts the post-edition canon audit.
  - **Governance**: Reads the finalized edition clean, with no engine context, to judge realism, canon advancement, and narrative quality.

## 2. Institutional & Citizen Voice Agents
Instead of journalists inventing quotes, these autonomous agents embody the civic institutions and citizens, creating an intermediate layer of "source material" (canonical statements) directly out of engine data. 
- **Governance (Four-File Persona Pattern)**: All Voice Agents use a standard four-file system for their prompt governance:
  1. `IDENTITY.md` (Who they are, traits, relationships, speech patterns)
  2. `LENS.md` (Tiered canon-fidelity rules)
  3. `RULES.md` (Guarding rails, formatting instructions, behaviors)
  4. `SKILL.md` (The boot sequence and tool invocation)

### The 7 Institutional Voice Agents
- **Mayor's Office (`civic-office-mayor`)**: Mayor Avery Santana. Progressive pragmatist. Generates public remarks and policy positions with concrete numbers and executive authority.
- **OPP Faction (`civic-office-opp-faction`)**: Janae Rivers and progressive bloc. Emphasize equity, community investment.
- **CRC Faction (`civic-office-crc-faction`)**: Warren Ashford and reform coalition. Focus on fiscal responsibility, audits, process.
- **IND Swing (`civic-office-ind-swing`)**: Ramon Vega and Leonard Tran. Swing voters with deliberate, pragmatic language.
- **Police Chief (`civic-office-police-chief`)**: Rafael Montez. 
- **Baylight Authority (`civic-office-baylight-authority`)**: Keisha Ramos. Handles stadium construction and economic updates.
- **District Attorney (`civic-office-district-attorney`)**: Clarissa Dane. Legal frameworks and prosecution.

### Citizen Voice Agents
Agents like **Deacon Seymour, Benji Dillon, Elias Varek, and Vinnie Keane** react to civic events, providing the ground-level community sentiment.

## 3. The 6 Desk Reporters (Journalists)
These 6 autonomous agents do not communicate directly with the Voice Agents; instead, they read the statements outputted by the Voice Agents, interpret them, and write journalism. 
- **Governance**: Each desk uses a three-file architecture (`SKILL.md`, `IDENTITY.md`, and `RULES.md`). They read from their own isolated `output/desks/{desk}/` workspace and are explicitly banned from seeing engine metrics or breaking canon.

- **Civic Desk (`civic-desk`)**: Led by Carmen Delaine (patient, precise, skeptical of timelines). Supported by Luis Navarro (investigations), Sgt. Rachel Torres (safety), Dr. Lila Mezran (health), and Trevor Shimizu (infrastructure).
- **Sports Desk (`sports-desk`)**: Anthony, P Slayer, Hal Richmond, Tanya Cruz, DJ Hartley. Covers the Oakland Athletics, roster moves, and local sports.
- **Culture Desk (`culture-desk`)**: Maria Keen, Kai Marston, Mason Ortega, Angela Reyes, Noah Tan. Covers community, festivals, weather, arts.
- **Business Desk (`business-desk`)**: Jordan Velez. Covers economic policy, nightlife, labor, retail.
- **Chicago Desk (`chicago-desk`)**: Selena Grant, Talia Finch. Covers the Chicago Bulls and Chicago sports feeds.
- **Letters Desk (`letters-desk`)**: Compiles citizen reactions and letters to the editor.

## 4. The Data Handoff Pipeline
How data moves between the engine, the agents, and the final publication:

1. **Engine Output**: GodWorld simulation processes the cycle, outputting raw events and ledger data.
2. **Generate Packets**: CLI scripts pull data from Google Sheets into local JSON packets for each desk.
3. **Build Workspaces**: Scripts distribute these packets into agent workspaces (`output/desks/`, `output/civic-voice-workspace/`) using zero LLM tokens.
4. **Voice Agents Run**: Mayor, factions, and citizens read their assigned workspaces and output JSON statements (`output/civic-voice/`).
5. **Desk Agents Launch**: Desk agents boot, read their desk packets along with the Voice Agent JSON statements, and output their respective news articles (`output/desk-output/`).
6. **Compile (Mags Corliss)**: Mags ingests all the desk outputs, merges them into a cohesive paper, orders sections, and curates the front page.
7. **Verify (Rhea Morgan)**: Rhea takes Mags' compiled edition and checks it against the raw ledgers for spelling and fact accuracy.
8. **Finalize & Publish**: Human editors apply Rhea's corrections and upload the final PDF to Drive.
9. **Canon Audit (Mara Vance)**: Mara reads the final published piece on claude.ai and judges narrative quality.
10. **Engine Intake**: Information from the edition (new citizens, storylines) is processed back into the GodWorld Google Sheets to seed the next cycle.

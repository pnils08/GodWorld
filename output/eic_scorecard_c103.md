# EIC Accuracy Scorecard — C103

**33.3% accurate** (6/18 clean; 11 corrections-needed; 1 canon-violation)

**56.7 points from the 90% autonomy bar.**

Trend: first scored week.

## Per-article
- **business_c103_business-desk_packet-v2_deepseek-deepseek-chat** (Jordan Velez): accurate
- **civic_c103_angela-reyes_packet-v2_deepseek-deepseek-chat** (Angela Reyes): corrections-needed
  - [engine-verbiage] Initiative_Tracker (InitiativeID INIT-007); snapshot: engine_audit_c103.json snapshots.Initiative_Tracker — The article leaks raw database table names, internal initiative IDs, and JSON file references in both the body text and the intake section.
- **civic_c103_carmen-delaine_packet-v2_deepseek-deepseek-chat** (Carmen Delaine): corrections-needed
  - [engine-verbiage] engine_audit_c103.json snapshots.Initiative_Tracker — The text leaks raw system file names, database paths, and technical identifiers ('engine_audit_c103.json snapshots.Initiative_Tracker', 'InitiativeID INIT-001') into the prose and intake notes.
- **civic_c103_lila-mezran_packet-v2_deepseek-deepseek-chat** (Dr. Lila Mezran): corrections-needed
  - [engine-verbiage] The article contains raw system/engine vocabulary and template text in its prose, such as 'The supplied record establishes', 'The supplied civic record', and 'engine_audit_c103.json snapshots.Initiative_Tracker'. — Raw system-level prompts, template instructions, and JSON file references leaked directly into the published article text.
- **civic_c103_luis-navarro_packet-v2_anthropic-claude-sonnet-5** (Luis Navarro): corrections-needed
  - [undefined] The article contains — undefined
- **civic_c103_noah-tan_packet-v2_deepseek-deepseek-chat** (Noah Tan): accurate
- **civic_c103_rachel-torres_packet-v2_deepseek-deepseek-chat** (Sgt. Rachel Torres): corrections-needed
  - [engine-verbiage] The article contains raw engine/system vocabulary and database references. — Phrases like 'listed as passed', 'supplied phase is operational', and references to 'Initiative_Tracker (InitiativeID INIT-002); snapshot: engine_audit_c103.json' leak system/engine vocabulary into the prose.
- **civic_c103_trevor-shimizu_packet-v2_deepseek-deepseek-chat** (Trevor Shimizu): corrections-needed
  - [undefined] The IN — undefined
- **culture_c103_elliot-graye_packet-v2_benchmark-llama-3-3_deepseek-deepseek-chat** (Elliot Graye): canon-violation
  - [data-misrepresentation] B'nai Tikvah Synagogue — The article claims Claire Ashford was spotted at B'nai Tikvah Synagogue, but the ground truth ledger states she was spotted at Beth Jacob Congregation.
- **culture_c103_kai-marston_packet-v2_meta-llama-llama-3-3-70b-instruct** (Kai Marston): corrections-needed
  - [engine-verbiage] The text contains raw system/engine vocabulary and template instructions. — The article includes template prose ('The supplied record establishes', 'EVENING RECORD: open and quiet', 'The record leaves one question open...') and raw intake metadata ('## INTAKE', 'HOOD: Chinatown', 'CLAIM: ...') which leaks system/engine vocabulary into the reader-facing text.
- **culture_c103_maria-keen_packet-v2_benchmark-natural-llama_deepseek-deepseek-chat** (Maria Keen): accurate
- **culture_c103_mason-ortega_packet-v2_benchmark-seat-deepseek_deepseek-deepseek-chat** (Mason Ortega): accurate
- **culture_c103_sharon-okafor_packet-v2_benchmark-benchmark-llama-3-3_deepseek-deepseek-chat** (Sharon Okafor): corrections-needed
  - [engine-verbiage] INTAKE block and HTML comment — The article includes raw system metadata, an intake block, and a self-score HTML comment at the end of the text.
- **sports_c103_anthony-raines_packet-v2_deepseek-deepseek-chat** (Anthony Raines): corrections-needed
  - [engine-verbiage] Event kind (feed), Team record (feed), Vinnie Keane line (feed), Pablo Almanzar line (feed) — The article includes raw database/feed labels like '(feed)' and 'Event kind' directly in the prose.
- **sports_c103_hal-richmond_packet-v2_benchmark-llama-3-3_deepseek-deepseek-chat** (Hal Richmond): corrections-needed
  - [engine-verbiage] engine-verbiage — The article contains system-level verbiage and meta-commentary ('supplied C103 line card', 'supplied record', 'supplied condition', and 'INTAKE') rather than a natural news narrative.
- **sports_c103_p-slayer_packet-v2_meta-llama-llama-3-3-70b-instruct** (P Slayer): corrections-needed
  - [engine-verbiage] Handoff feeling vs funeral feeling — pick a side. / The record leaves one question open: What additional record would explain the supplied condition? — System prompt instructions and template scaffolding leaked directly into the published article text.
- **sports_c103_simon-leary_packet-v2_deepseek-deepseek-chat** (Simon Leary): accurate
- **sports_c103_tanya-cruz_packet-v2_deepseek-deepseek-chat** (Tanya Cruz): accurate
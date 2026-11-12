# EIC Accuracy Scorecard — C111

**51.9% accurate** (14/27 clean; 8 corrections-needed; 5 canon-violation)

**38.1 points from the 90% autonomy bar.**

Trend: C103 75% → C104 62.5% → C105 76.5% → C106 55.6% → C107 68.8% → C108 60% → C109 33.3% → C110 39.1% → C111 51.9%

## Per-article
- **business_c111_business-desk_packet-v2_anthropic-claude-opus-5-5** (Jordan Velez): accurate
- **civic_c111_carmen-delaine_packet-v2_anthropic-claude-haiku-5-5** (Carmen Delaine): accurate
- **civic_c111_freelance-firebrand_packet-v2_anthropic-claude-sonnet-5-5** (Jax Caldera): accurate
- **civic_c111_lila-mezran_packet-v2_anthropic-claude-haiku-5-5** (Dr. Lila Mezran): canon-violation
  - [data-misrepresentation] Hospitalized citizens and hospital statistics — The article states that citywide the hospital had 37 admissions, held 75 patients in care, and that Yu Zen and Maurice Franklin are currently lying in hospital beds. However, the World Summary explicitly records 'Hospital: 0 in care (0% load)'.
- **civic_c111_luis-navarro_packet-v2_anthropic-claude-sonnet-5-5** (Luis Navarro): canon-violation
  - [citizen-bending] Janae Rivers is identified as representing District 5 and speaking for East Oakland. — Per the ledger and world summary, Janae Rivers is the City Council Member for Piedmont Ave (District 6), not District 5 or East Oakland.
- **civic_c111_noah-tan_packet-v2_x-ai-grok-4-3** (Noah Tan): accurate
- **civic_c111_rachel-torres_packet-v2_x-ai-grok-4-3** (Sgt. Rachel Torres): accurate
- **civic_c111_trevor-shimizu_packet-v2_openai-gpt-5-6-luna** (Trevor Shimizu): corrections-needed
  - [engine-verbiage] References to 'Cycle 111' in prose — The article uses the internal simulation term 'Cycle 111' multiple times in reporting prose rather than natural calendar framing.
- **culture_c111_elliot-graye_packet-v2_anthropic-claude-haiku-5-5** (Elliot Graye): accurate
- **culture_c111_kai-marston_packet-v2_anthropic-claude-haiku-5-5** (Kai Marston): corrections-needed
  - [engine-verbiage] Repeated explicit references to 'the ledger', 'cycle', 'surging flags', and 'where-are-they-now file' throughout the prose. — System architecture and engine terminology ('the ledger', 'this cycle', 'where-are-they-now file', 'flags her as surging') are treated as an in-world public registry rather than reporting on in-fiction civic and cultural events.
- **culture_c111_maria-keen_packet-v2_anthropic-claude-sonnet-5-5** (Maria Keen): canon-violation
  - [data-misrepresentation] The hospital census claims 4 people in care filling 4 beds Downtown with 2 admissions — The authoritative cycle snapshot and city state explicitly record 0 in care (0% load) across the entire city.
  - [unsupported-claim] Downtown First Friday Live Music event reference — The authoritative calendar context explicitly notes 'First Friday: false'.
- **culture_c111_mason-ortega_packet-v2_x-ai-grok-4-3** (Mason Ortega): accurate
- **culture_c111_sharon-okafor_packet-v2_openai-gpt-5-6-luna** (Sharon Okafor): corrections-needed
  - [engine-verbiage] References to 'Global-tier', 'Regional-tier', 'Iconic-tier', and 'the fame table' — System simulation terminology and ledger mechanics (fame tiers and 'fame table') leak directly into the journalistic prose.
- **sports_c111_anthony-raines_packet-v2_anthropic-claude-haiku-5-5** (Anthony Raines): accurate
- **sports_c111_elliot-marbury_packet-v2_anthropic-claude-sonnet-5-5** (Elliot Marbury): accurate
- **sports_c111_hal-richmond_packet-v2_anthropic-claude-sonnet-5-5** (Hal Richmond): accurate
- **sports_c111_p-slayer_packet-v2_x-ai-grok-4-3** (P Slayer): accurate
- **sports_c111_selena-grant_packet-v2_openai-gpt-5-6-luna** (Selena Grant): corrections-needed
  - [engine-verbiage] Engine tags, meta-commentary, and beat structure jargon in editorial text: 'in C111', 'The supplied record does not resolve which one this is', 'It is a player-feature in this cycle', 'Oaks’ season-state', and 'unstable franchise marker'. — The prose leaks simulation cycle numbering, data feed category labels ('player-feature', 'season-state'), and meta prompt phrasing ('The supplied record') directly into reader-facing copy.
- **sports_c111_simon-leary_packet-v2_openai-gpt-5-6-luna** (Simon Leary): canon-violation
  - [data-misrepresentation] Describing the A's 4-1 World Series victory as a '4-1 start' to an ongoing season with an active three-game run. — The 4-1 record and W3 streak from Cycle 110 reflect the A's winning the World Series over the Phillies (4 games to 1), not a regular-season start. Cycle 111 is the off-season championship celebration and parade, following Vinnie Keane's retirement.
- **sports_c111_talia-finch_packet-v2_openai-gpt-5-6-luna** (Talia Finch): accurate
- **sports_c111_tanya-cruz_packet-v2_x-ai-grok-4-3** (Tanya Cruz): accurate
- **undocked-digest_c111_nia-rook-weekly_packet-v2_x-ai-grok-4-3** (Nia Rook): corrections-needed
  - [engine-verbiage] UNDOCKED standings, flights, credits, and chair simulator framing — System-level minigame/engine simulation data (UNDOCKED flights, credits, combat/mishap tracking) has leaked directly into the narrative prose and dialogue framing.
- **undocked_c111_nia-rook_packet-v2_x-ai-grok-4-3-2316** (Nia Rook): corrections-needed
  - [engine-verbiage] References to 'sol and sirius', 'No combat, no mishaps', 'magnitude three', and 'credits' — Raw simulation engine terminology, undocked event mechanics, and sci-fi/test harness vocabulary leaked into the article prose.
- **undocked_c111_nia-rook_packet-v2_x-ai-grok-4-3-2317** (Nia Rook): canon-violation
  - [citizen-bending] Clarissa Dane — undefined
- **undocked_c111_nia-rook_packet-v2_x-ai-grok-4-3-2319** (Nia Rook): accurate
- **undocked_c111_nia-rook_packet-v2_x-ai-grok-4-3-2320** (Nia Rook): corrections-needed
  - [engine-verbiage] epsilon_eridani, magnitude sat at 2 out of 5, combat stayed at zero, mishaps stayed at zero — Raw snake_case game engine identifier ('epsilon_eridani') and literal simulation metric fields ('magnitude sat at 2 out of 5, combat stayed at zero, mishaps stayed at zero') leaked directly into the narrative prose.
- **undocked_c111_nia-rook_packet-v2_x-ai-grok-4-3** (Nia Rook): corrections-needed
  - [engine-verbiage] magnitude holding at the middle of the scale — Directly references the underlying simulation metric ('magnitude') in the descriptive prose.
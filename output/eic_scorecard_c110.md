# EIC Accuracy Scorecard — C110

**39.1% accurate** (9/23 clean; 8 corrections-needed; 6 canon-violation)

**50.9 points from the 90% autonomy bar.**

Trend: C103 75% → C104 62.5% → C105 76.5% → C106 55.6% → C107 68.8% → C108 60% → C109 33.3% → C110 39.1%

## Per-article
- **business_c110_business-desk_packet-v2_openai-gpt-5-6-luna** (Jordan Velez): corrections-needed
  - [undefined] Use of 'cycle' in article prose ('this cycle', 'This — undefined
- **civic_c110_angela-reyes_packet-v2_anthropic-claude-haiku-4-5** (Angela Reyes): corrections-needed
  - [engine-verbiage] the Packet — The phrase 'the Packet said something sharper this cycle' leaks simulation engine vocabulary into newsroom copy.
- **civic_c110_carmen-delaine_packet-v2_anthropic-claude-haiku-4-5** (Carmen Delaine): corrections-needed
  - [engine-verbiage] Initiative_Tracker — Direct engine/system vocabulary ('Initiative_Tracker') leaked into published prose twice.
- **civic_c110_freelance-firebrand_packet-v2_anthropic-claude-sonnet-5** (Jax Caldera): corrections-needed
  - [engine-verbiage] References to 'a pattern tagged strain, paired with one other signal', 'tracker posts the opposite story', and storyline tracker closure states. — The prose leaks internal simulation engine telemetry, intake audit tokens, and tracker lifecycle metadata directly into the news report.
- **civic_c110_lila-mezran_packet-v2_anthropic-claude-haiku-5-5** (Dr. Lila Mezran): canon-violation
  - [data-misrepresentation] Citywide and neighborhood hospital census data — The world summary explicitly states citywide hospital load is '1 in care (1% load)', directly contradicting the article's claims of 77 residents in care, 38 admissions, 76 occupied beds, and numerous neighborhood-level hospitalizations.
  - [citizen-bending] Yu Zen's status and quote context — The article depicts Yu Zen as currently confined to an active hospital bed, whereas the world summary records Yu Zen as recovered and 'got back into a morning walk routine' in Rockridge.
- **civic_c110_luis-navarro_packet-v2_anthropic-claude-sonnet-5** (Luis Navarro): accurate
- **civic_c110_noah-tan_packet-v2_openai-gpt-5-6-luna** (Noah Tan): corrections-needed
  - [undefined] Reference to raw cycle IDs 'C107', 'C108 — undefined
- **civic_c110_rachel-torres_packet-v2_x-ai-grok-4-3** (Sgt. Rachel Torres): corrections-needed
  - [engine-verbiage] all listed as other residents with none tracked — Directly leaks simulation data schema terminology differentiating tracked ledger citizens from background agent counts.
  - [engine-verbiage] twenty-two neighborhoods on the table / The table places KONO at the top — Exposes the underlying data table / ledger feed format directly in news reporting prose.
- **civic_c110_trevor-shimizu_packet-v2_openai-gpt-5-6-luna** (Trevor Shimizu): accurate
- **culture_c110_elliot-graye_packet-v2_anthropic-claude-haiku-5-5** (Elliot Graye): corrections-needed
  - [engine-verbiage] References to 'C104', 'C107', 'C108', and 'C109' in the body text — Raw cycle designators (C104, C107, C108, C109) leak simulation engine vocabulary directly into published newsroom prose instead of in-world temporal framing.
- **culture_c110_maria-keen_packet-v2_anthropic-claude-sonnet-5** (Maria Keen): canon-violation
  - [data-misrepresentation] Hospitalized count for Dimond (4 still in care / 4 beds occupied) contradicts citywide ledger — The world summary establishes citywide hospital occupancy at exactly 1 patient in care (1% load), making it impossible for Dimond alone to have 4 patients still in care / 4 beds occupied.
- **culture_c110_mason-ortega_packet-v2_x-ai-grok-4-3** (Mason Ortega): accurate
- **sports_c110_anthony-raines_packet-v2_anthropic-claude-haiku-4-5** (Anthony Raines): canon-violation
  - [data-misrepresentation] Ellis had stumbled in Game Two, the kind of early-series misstep that can seed doubt through a roster. — World Series Game 2 was started by Travis Coles, with bullpen appearances by Clark Sayran and Mariano Rosales; John Ellis did not pitch or stumble in Game 2.
- **sports_c110_elliot-marbury_packet-v2_anthropic-claude-sonnet-5** (Elliot Marbury): accurate
- **sports_c110_hal-richmond_packet-v2_anthropic-claude-sonnet-5** (Hal Richmond): corrections-needed
  - [engine-verbiage] an overall grade of ninety-three — Raw simulation stat/engine attribute ('overall grade of ninety-three') leaks directly into narrative sports prose.
- **sports_c110_p-slayer_packet-v2_x-ai-grok-4-3** (P Slayer): accurate
- **sports_c110_selena-grant_packet-v2_openai-gpt-5-6-luna** (Selena Grant): accurate
- **sports_c110_simon-leary_packet-v2_openai-gpt-5-6-luna** (Simon Leary): accurate
- **sports_c110_talia-finch_packet-v2_openai-gpt-5-6-luna** (Talia Finch): accurate
- **sports_c110_tanya-cruz_packet-v2_x-ai-grok-4-3** (Tanya Cruz): accurate
- **undocked-digest_c110_nia-rook-weekly_packet-v2_x-ai-grok-4-3** (Nia Rook): canon-violation
  - [citizen-bending] Clarissa Dane, Kato Rivers, and Simone Adesanya are framed as competitive pilots logging 'flights', 'episodes', and 'partial credits' on a public leaderboard. — Simone Adesanya is a school principal, Kato Rivers is a fitness trainer, and Aaliyah Brennan is a mobile clinic nurse. The article invents a fictional flight/pilot competition based on simulation runtime metrics ('episodes', 'partial credits', 'cycles led').
  - [engine-verbiage] Text incorporates raw simulation ledger/evaluation mechanics ('logged two episodes this cycle with no partial credits tallied yet', 'partial credits', 'cycles led'). — Simulation episode and credit evaluation data leaked directly into the narrative prose as in-world competition standings.
- **undocked_c110_nia-rook_packet-v2_x-ai-grok-4-3** (Nia Rook): canon-violation
  - [engine-verbiage] magnitude held at two out of five — System simulation telemetry ('magnitude') is leaking directly into prose.
  - [citizen-bending] Framing Aaliyah Brennan and Clarissa Dane as pilots in a combat/episodic broadcast show called 'UNDOCKED' — Aaliyah Brennan is an Oakland resident in Lake Merritt whose cycle event was simply keeping interactions brief during heavy fog, and Clarissa Dane relocated from Fruitvale to West Oakland; portraying them as pilots/competitors in a sci-fi/combat program invents roles entirely disconnected from the ledger.
- **wire_c110_celeste-tran_packet-v2_x-ai-grok-4-3** (Celeste Tran): canon-violation
  - [data-misrepresentation] Migration flow claims ('Downtown added ten residents', 'Temescal gaining ten people', 'Jack London nine, West Oakland seven') — Contradicts the cycle 110 migration ledger, where West Oakland is the overwhelming recipient of incoming relocations (over a dozen households moving in) while Temescal, Downtown, and Jack London are net out-migration origins.
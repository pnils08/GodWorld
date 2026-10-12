# EIC Accuracy Scorecard — C109

**33.3% accurate** (7/21 clean; 5 corrections-needed; 9 canon-violation)

**56.7 points from the 90% autonomy bar.**

Trend: C103 75% → C104 62.5% → C105 76.5% → C106 55.6% → C107 68.8% → C108 60% → C109 33.3%

## Per-article
- **business_c109_business-desk_packet-v2_openai-gpt-5-6-luna** (Jordan Velez): accurate
- **civic_c109_angela-reyes_packet-v2_anthropic-claude-haiku-4-5** (Angela Reyes): accurate
- **civic_c109_carmen-delaine_packet-v2_anthropic-claude-haiku-4-5** (Carmen Delaine): corrections-needed
  - [engine-verbiage] References to 'Initiative_Tracker records', 'the ledger's current problem', and 'where a ledger entry says "phase disbursement-active"' — Raw simulation engine terminology, database table names ('Initiative_Tracker'), and literal state labels ('phase disbursement-active', 'ledger entry') leak directly into the journalistic prose.
- **civic_c109_freelance-firebrand_packet-v2_anthropic-claude-sonnet-5** (Jax Caldera): canon-violation
  - [data-misrepresentation] Downtown Economic Revitalization and specific housing pressure rank/score data claims — The article invents an initiative called 'Downtown Economic Revitalization' not present in the ledger or world summary, and fabricates specific numerical metrics ('housing pressure number... landed at 6 — twentieth of twenty-two neighborhoods citywide') while claiming the map indicates decay, contradicting Downtown's sustained boom status (momentum 10/10).
- **civic_c109_lila-mezran_packet-v2_deepseek-deepseek-chat** (Dr. Lila Mezran): canon-violation
  - [data-misrepresentation] Depicting both Yu Zen and Maurice Franklin simultaneously hospitalized in adjacent beds — The world summary establishes a citywide hospital load of exactly 1 patient in care (1% load), making multiple concurrent hospitalizations in the same ward factually impossible under the simulation ledger.
- **civic_c109_luis-navarro_packet-v2_anthropic-claude-sonnet-5** (Luis Navarro): accurate
- **civic_c109_noah-tan_packet-v2_deepseek-deepseek-chat** (Noah Tan): accurate
- **civic_c109_rachel-torres_packet-v2_x-ai-grok-4-3** (Sgt. Rachel Torres): canon-violation
  - [data-misrepresentation] Cycle metrics record Chinatown at 8 incidents... Response time stood at 10.5 minutes with a 23 percent clearance rate. Laurel recorded the slowest average response at 10.8 minutes and an 18 percent clearance rate. Citywide, 138 incidents were logged... — These incident counts, response times, and clearance rates do not exist in the world summary and represent invented statistical data.
  - [engine-verbiage] Cycle metrics — The phrase 'Cycle metrics' uses engine/system vocabulary directly in the article prose.
- **civic_c109_trevor-shimizu_packet-v2_deepseek-deepseek-chat** (Trevor Shimizu): accurate
- **culture_c109_elliot-graye_packet-v2_anthropic-claude-haiku-4-5** (Elliot Graye): canon-violation
  - [citizen-] Manjit Singh / Bhai Manjit Singh — undefined
- **culture_c109_kai-marston_packet-v2_anthropic-claude-haiku-4-5** (Kai Marston): corrections-needed
  - [engine-verbiage] Repeated explicit references to 'the ledger', 'the cultural chart', and simulation tracking mechanics ('Media, the ledger says', 'The ledger is ruthless', 'city's arts ledger') — The narrative directly exposes internal database structures and simulation mechanics ('ledger', 'chart') as literal diegetic objects within the story prose.
- **culture_c109_maria-keen_packet-v2_anthropic-claude-sonnet-5** (Maria Keen): corrections-needed
  - [engine-verbiage] References to 'C83', 'C108', 'Twenty-six cycles later', 'last cycle', and 'a cycle' — Simulation cycle numbers and engine terminology ('C83', 'C108', 'cycles') leak directly into the journalistic prose instead of using in-world calendar framing.
- **culture_c109_mason-ortega_packet-v2_x-ai-grok-4-3** (Mason Ortega): canon-violation
  - [citizen-bending] Hazel Salazar is placed in Fruitvale — POP-00873 is established in Uptown according to the ledger profile, but the article relocates her to Fruitvale and frames her work and neighborhood context entirely around Fruitvale.
- **sports_c109_anthony-raines_packet-v2_deepseek-deepseek-chat** (Anthony Raines): corrections-needed
  - [engine-verbiage] the dossier lists his fastball sitting 92-94 mph — Reference to 'the dossier' is system/engine terminology leaking into published newsroom prose.
- **sports_c109_hal-richmond_packet-v2_anthropic-claude-sonnet-5** (Hal Richmond): canon-violation
  - [data-misrepresentation] The Athletics stand even in this postseason, one game won, one game lost... carries a single defeat on its back — Cycle 109 includes Game 3 of the World Series, in which the A's defeated the Phillies behind Pablo Almanzar to take a 2-1 series lead with a winning streak (W1), contradicting the claim that the series is tied 1-1 on a losing streak.
  - [engine-verbiage] an overall grade of ninety-three — Directly cites underlying simulation/OOTP numeric attribute ratings ('overall grade of ninety-three', 'ninety-three overall second baseman') in narrative text.
- **sports_c109_selena-grant_packet-v2_meta-llama-llama-3-3-70b-instruct** (Selena Grant): canon-violation
  - [citizen-bending] Ernesto Quintero quoted speaking as a member of the Oakland Oaks basketball team — Ernesto Quintero (POP-00050) is an infielder (3B/1B) for the Oakland A's baseball team, not an Oaks basketball player, but is quoted speaking about the team's struggles in first-person plural ('when we're not winning', 'we're all trying to stay focused', 'affecting us').
- **sports_c109_simon-leary_packet-v2_openai-gpt-5-6-luna** (Simon Leary): accurate
- **sports_c109_talia-finch_packet-v2_openai-gpt-5-6-luna** (Talia Finch): corrections-needed
  - [engine-verbiage] Explicit references to simulation concepts: 'in the feed’s running context', 'this cycle', and 'Those are feed words' — The article leaks internal simulation/engine vocabulary directly into the narrative prose rather than translating them into in-world journalistic reporting.
- **undocked-digest_c109_nia-rook-weekly_packet-v2_x-ai-grok-4-3** (Nia Rook): canon-violation
  - [unsupported-claim] The entire premise and reporting on 'UNDOCKED' pilot standings, flight episodes, credits, combat events, and rankings (Clarissa Dane, Otis Redd, Jackson Sift, Priya Narang) is entirely unsupported by the cycle record. — The world summary contains no record or data for 'UNDOCKED' standings, pilot flights, or credit scores.
  - [engine-verbiage] Engine metadata and intake annotations leaked into the published prose ('## INTAKE', 'CLAIM: UNDOCKED week-in-review c109', and self-score comment). — Raw system/engine intake scaffolding must not appear in reader-facing news prose.
- **undocked_c109_nia-rook_packet-v2_meta-llama-llama-3-3-70b-instruct** (Nia Rook): canon-violation
  - [citizen-bending] Jackson Sift framed as a contestant/feature of a competitive television show called 'UNDOCKED' — Jackson Sift is an Ex-Offender Reentry Counselor in West Oakland; the television show 'UNDOCKED', competition standings, and watch party storyline are entirely fabricated without grounding in the ledger or world summary.
- **undocked_c109_nia-rook_packet-v2_x-ai-grok-4-3** (Nia Rook): accurate
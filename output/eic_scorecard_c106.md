# EIC Accuracy Scorecard — C106

**55.6% accurate** (10/18 clean; 6 corrections-needed; 2 canon-violation)

**34.4 points from the 90% autonomy bar.**

Trend: C103 75% → C104 62.5% → C105 76.5% → C106 55.6%

## Per-article
- **business_c106_business-desk_packet-v2_deepseek-deepseek-chat** (Jordan Velez): accurate
- **civic_c106_angela-reyes_packet-v2_deepseek-deepseek-chat** (Angela Reyes): accurate
- **civic_c106_carmen-delaine_packet-v2_deepseek-deepseek-chat** (Carmen Delaine): corrections-needed
  - [engine-verbiage] disbursement-active — The article uses the raw engine state term 'disbursement-active' directly in prose rather than natural journalistic language describing the fund entering active disbursement.
- **civic_c106_freelance-firebrand_packet-v2_anthropic-claude-sonnet-5** (Jax Caldera): accurate
- **civic_c106_lila-mezran_packet-v2_deepseek-deepseek-chat** (Dr. Lila Mezran): canon-violation
  - [citizen-bending] Marcus Osei's age — The ledger establishes Marcus Osei was born in 1983 (approx. 40–41 years old), but the article describes him as a '67-year-old council member'.
- **civic_c106_luis-navarro_packet-v2_anthropic-claude-sonnet-5** (Luis Navarro): accurate
- **civic_c106_noah-tan_packet-v2_deepseek-deepseek-chat** (Noah Tan): accurate
- **culture_c106_elliot-graye_packet-v2_deepseek-deepseek-chat** (Elliot Graye): corrections-needed
  - [engine-verbiage] The terms 'this cycle' and 'cycle's end' appear in the article body prose ('where this cycle has seen faith organizations respond', 'doors stay unlocked through cycle's end'). — Simulation engine mechanics ('cycle') leaked directly into newsroom copy instead of using in-world temporal framing (such as 'this week', 'this winter', or 'these past days').
- **culture_c106_kai-marston_packet-v2_meta-llama-llama-3-3-70b-instruct** (Kai Marston): accurate
- **culture_c106_maria-keen_packet-v2_deepseek-deepseek-chat** (Maria Keen): accurate
- **culture_c106_mason-ortega_packet-v2_deepseek-deepseek-chat** (Mason Ortega): accurate
- **culture_c106_sharon-okafor_packet-v2_deepseek-deepseek-chat** (Sharon Okafor): corrections-needed
  - [engine-verbiage] Conversational AI preface ('Here's the corrected draft with only approved quotes:') included in the article text — The article text contains conversational preamble from the generation prompt that leaked into the published draft.
- **sports_c106_hal-richmond_packet-v2_deepseek-deepseek-chat** (Hal Richmond): corrections-needed
  - [engine-verbiage] Engine feed categories 'player features and roster moves' used as literal dialogue and in-universe tactical moves — Raw sports feed taxonomy ('player-feature', 'roster-move') leaked directly into dialogue across multiple sources ('excitement around the A's player features and roster moves') and into narrative prose describing player features as lineup moves made by the front office.
- **sports_c106_p-slayer_packet-v2_meta-llama-llama-3-3-70b-instruct** (P Slayer): corrections-needed
  - [engine-verbiage] with a streak of W0 — The raw engine token 'W0' leaked directly into the narrative prose instead of natural phrasing.
- **sports_c106_selena-grant_packet-v2_meta-llama-llama-3-3-70b-instruct** (Selena Grant): corrections-needed
  - [engine-verbiage] Repeated verbatim phrasing 'Oaks analysis' across multiple citizen quotes — The prompt/topic string 'Oaks analysis' leaks directly and unnaturally into dialogue attributed to AJ Dybantsa, Melton Neilon, Rick Walker, and Elio Perez.
- **sports_c106_simon-leary_packet-v2_deepseek-deepseek-chat** (Simon Leary): accurate
- **sports_c106_talia-finch_packet-v2_meta-llama-llama-3-3-70b-instruct** (Talia Finch): accurate
- **undocked_c106_nia-rook_packet-v2_meta-llama-llama-3-3-70b-instruct** (Nia Rook): canon-violation
  - [citizen-bending] Rick Walker described as an active line cook — Rick Walker's ledger profile lists his current occupation as K-8 Teacher and notes 'Former Line cook'.
  - [engine-verbiage] Leaked simulation/engine vocabulary in citizen dialogue and narration ('cast pilot', 'her lead, whatever that means for her') — The text includes engine/prompt artifact jargon ('cast pilot' and raw references to 'her lead').
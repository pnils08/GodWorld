# Rhea Morgan — Verification Memory

Last Updated: 2026-06-24 | Last verified edition: E100 | First verified: E85

---

## Standing Rules (apply every edition)

- **Vote math**: enumerate all 9 members, mark status, assign by faction, count, compare to stated outcome. Do not trust the stated count.
- **Davis position**: TrueSource asRoster says "Left Fielder" but POP-00021 is DH in-cycle whenever Davis returned from injury (C99+). ALWAYS override asRoster with current cycle sports feed. CRITICAL in E99 and E100 — recurring.
- **Quintero position**: When Davis-return roster shuffle active, Quintero=3B, DH=Davis. Verify against current cycle feed, not article inference.
- **Laila Cortez rule**: Cortez WITH POP-00035 + production-log voice authorization = canon. Cortez WITHOUT either = phantom CRITICAL. E100 is first authorized appearance.
- **Sift canonPointers = citizen-voice authorization**: No citizen in canonPointer = article runs without named civilian voices. POP-pending in Usage Log = self-reported CRITICAL if the citizen is a named quote source.
- **Faith/clergy**: Verify EVERY named clergy/faith leader against Faith_Organizations ledger + sift canonPointers individually. One confirmed name doesn't authorize others in the same article.
- **INSTITUTIONS.md Corrections Forward**: Check every named citizen against §Citizens corrections table (not just faith/council). "Elena Soria Dominguez" → "Eloise Soria-Dominguez (POP-00791)" for C94+.
- **Tier-2 TBD schools**: Any named individual OUSD school (McClymonds, Skyline, Castlemont, Oakland Tech, Fremont) = CRITICAL. Fix: "an OUSD high school in [neighborhood]."
- **Production log /city-hall = authoritative civic fallback** when dashboard API unavailable. More reliable than world_summary for specific figures.
- **Sports near-miss surnames**: Latin surnames with -as/-es, -ares/-eras endings are highest risk (Tavares/Taveras, Ramos/Ramirez). Read character-by-character.
- **Source-level typos**: world_summary can carry typos that propagate into article bodies. truesource_reference.json is the tie-breaker, not world_summary.
- **Names Index POP-IDs**: Check every Names Index entry has a POP-ID prefix. Council members frequently lose theirs in compilation.
- **Letter writers**: No surname collision with current-edition featured officials. Check authorized interviewCandidates/returning list. Require complete Name/Age/Neighborhood/Occupation in Usage Log.
- **Letters factual claims**: Writers react to past events only — no future vote dates or policy timelines without packet sourcing.
- **Injection scan**: Run `node scripts/rheaInjectionScan.js {XX}` — exit 0 = clean, exit 2 = BLOCK. Available again as of E100 (was Bash-blocked E96-E99).
- **Cycle language**: "cycles/cycle" in article body text is NOW CANON (S146 reversal) — do NOT flag. Still banned: "tension score," "severity level," "civic load," raw decimals, system metadata, "COMING NEXT CYCLE" headers.
- **Unverifiable stats**: Career totals absent from TrueSource = WARNING, not CRITICAL. Specific contract figures ($X/Xyr) without packet source = WARNING.
- **Disbursements vs authorizations**: Distinct Stab Fund metrics — edition may cite either without contradiction; match to correct canon source.

---

## Known Phantoms (never use without POP-ID + production-log authorization)

- **Elliot Graye**: Phantom reporter E86-E88, E90 pattern suppressed. Nine consecutive clean editions (E92-E100). Maria Keen = faith/community byline. Any new culture byline name is suspect.
- **Laila Cortez (unauthorized)**: Phantom E80-E87. Now has POP-00035 and was authorized in E100 via /city-hall Okoro voice decision. Check authorization every cycle.

---

## Edition Verdicts (E85–E100)

| Edition | Verdict | Score | Key failures |
|---|---|---|---|
| E85 | REVISE | — | 4x cycle language, Ramirez/Ramos, Edmonds letter order |
| E86 | REVISE | — | Elliot Graye, Laila Cortez phantom, Dante Nelson rest, vote math 6-3 w/7 YES, cross-desk 12/47 |
| E87 | REVISE | — | Elliot Graye, Laila Cortez, Kwame/Marcus Osei, cycle language, Dillon age 34 vs 38 |
| E88 | REVISE | 52/100 | Elliot Graye, Tavares/Taveras, cycle language in business ticker, COMING NEXT CYCLE header |
| E90 | REVISE | — | Deputy Mayor Vega (should be Council President), letters phantoms, Marcus Webb name collision |
| E93 | REVISE | — | Taveras/Tavares source contamination, Webb surname collision, Vivienne Torres age gap |
| E94 | PASS | — | Cleanest edition to that point; source typo JR Rojas/Rosado (edition got it right) |
| E96 | REVISE | 0.55 | Skipped-sift phantoms: Dara/Joyce Tanner/Thomas Reeves (POP-pending quote sources) |
| E97 | FAIL | 0.46 | 3 CRITICALs: Rosario Vidal (FP1), Bishop Vermeer + Fr. Solano (CU2 phantoms) |
| E98 | REVISE | 0.79 | McClymonds High School (Tier-2 TBD, no substitute) |
| E99 | REVISE | 0.67 | Davis "left fielder" (should be DH), Elena/Eloise Soria-Dominguez corrections-forward miss |
| E100 | PASS | 0.91 | Davis "left fielder" CRITICAL resolved; Quintero 3B/DH inconsistency WARNING resolved |

---

## Desk Risk Profile (current)

- **Sports**: Davis position always needs cycle-feed override. Quintero position tied to Davis roster state. Latin surname near-misses persistent risk. Player ages: use current cycle briefing, not truesource archive.
- **Civic (civic desk / quick-takes)**: Vote math must be proven. Vega = Council President (not Deputy Mayor). Check all Names Index titles against truesource.
- **Business (Velez)**: Derivative phantom risk — if civic piece invents an official, Velez echoes it. Cycle language in tickers. Stab Fund figures: specify which metric (disbursements vs authorizations).
- **Culture (Keen)**: Faith orgs must match INSTITUTIONS.md substitution table exactly — org name + neighborhood. No new clergy without sift + Faith_Organizations authorization.
- **Letters**: Phantom citizens recurring (E90, E93, E96, E97). Require full profiles. No surname collision with current-edition officials. Authorized returning writer list must be used.
- **Chicago**: Generally clean. Multi-game series averages are not in single-game summaries — soften or get full game log.

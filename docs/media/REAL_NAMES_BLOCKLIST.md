# Real-Names Blocklist

**Purpose:** Real-world sports figures whose names have leaked into GodWorld editions or agent output. Rhea Morgan reads this file before every verification run.

**How to use:** If any player name, citizen name, or new character in an edition matches a name on this list (first + last), flag as CRITICAL.

**Maintenance:** Add names as new leaks are caught. Remove only if a GodWorld citizen is intentionally given the same name (unlikely — avoid real names entirely).

---

## Known Leaks

### NBA Players
- Billy Donovan
- Jrue Holiday
- Josh Smith
- Jimmy Butler
- Ben Simmons

### MLB Players
(none yet — watch for real names in A's coverage)

**S175 sports-history carveout (see [[canon/CANON_RULES]]):** historical real-MLB figures are permitted as franchise context per Mike's sports-universe-laxer policy (e.g., Reggie Jackson, Rickey Henderson, the Bash Brothers era — Hal Richmond's archive references them legitimately). **Current real MLB players outside the canon roster remain Tier 3 / always-block.** When verifying, ask: is this a historical figure framing the dynasty's lineage, or a current player being inserted into 2041 canon? Former is allowed; latter is a leak.

### NFL Players
(none yet)

### Coaches / Executives
- Billy Donovan (also listed under NBA — he's a coach)

### Faith Organizations & Clergy (S195 expanded S218 — canon.2 plan complete)
**Always-block — no real churches, no real pastors, no exception.** Engine seeded `Faith_Organizations` + `Simulation_Ledger` faith-leader POPs with real Oakland faith institutions + their real clergy. Authoritative substitution table lives in `docs/canon/INSTITUTIONS.md` §Faith & Community; this section is the runtime block-list `lib/canonBlocklist.js` reads at `buildFaithCards.js` startup (P4 of `[[../plans/2026-05-12-canon-2-faith-scrub]]`).

#### Organizations (16)

- Acts Full Gospel Church → **New Covenant Pentecostal Assembly**
- Allen Temple Baptist Church → **Foothill Baptist Tabernacle**
- Cathedral of Christ the Light → **Cathedral of the Living Word**
- St. Columba Catholic Church → **St. Esperanza Parish**
- Lake Merritt United Methodist → **Adams Point United Methodist**
- First Presbyterian Church → **Telegraph Presbyterian Fellowship**
- Temple Sinai → **Temple Beth Or**
- Beth Jacob Congregation → **B'nai Tikvah Synagogue**
- Islamic Center of Oakland → **Temescal Islamic Center**
- Masjid Al-Islam → **Masjid An-Nur Oakland**
- Oakland Buddhist Temple → **Bay Pure Land Buddhist Temple**
- East Bay Meditation Center → **Lake Merritt Mindfulness Sangha**
- Shiva Vishnu Temple → **Bharat Mandir of the East Bay**
- Gurdwara Sahib of Oakland → **Gurdwara Singh Sabha Fruitvale**
- Kehilla Community Synagogue → **Or Hashalom Renewal Community**
- First Unitarian Church → **Lakeshore Unitarian Universalist Fellowship**

#### Clergy (16)

- Bishop Robert Jackson Sr. → **Bishop Robert Jaston**
- Dr. Jacqueline Thompson → **Dr. Ophelia Brenner**
- Bishop Michael Barber → **Bishop Antoine Vermeer**
- Fr. Ramon Torres → **Fr. Ramon Solano**
- Rev. David Park → **Rev. Daniel Han**
- Rev. Margaret Chen → **Rev. Eunice Marston**
- Rabbi Jacqueline Mates-Muchin → **Rabbi Naomi Sterling**
- Rabbi Yehuda Ferris → **Rabbi Yael Bauer**
- Imam Abdul Rahman → **Imam Idris Karim**
- Imam Faheem Shuaibe → **Imam Aziz Rahimi**
- Rev. Kodo Umezu → **Rev. Kenji Tanaka**
- Larry Yang → **Tao Lee**
- Pandit Venkatesh Sharma → **Pandit Anand Krishnamurthy**
- Bhai Gurpreet Singh → **Bhai Manjit Singh**
- Rabbi Dev Noily → **Rabbi Miriam Goldstein**
- Rev. Michelle Collins → **Rev. Eleanor Bishop**

#### Retired S195 interim substitutes (also blocked)

The original S195 substitution attempted Greater Hope Pentecostal Church + Bishop Calvin Reeves Sr. for the West Oakland Pentecostal row. Both flagged S217 as "too close to real" — they pattern-match real congregations/clergy. Retired S218; cannot be re-introduced.

- Greater Hope Pentecostal Church → **New Covenant Pentecostal Assembly** (S218 retired)
- Bishop Calvin Reeves Sr. → **Bishop Robert Jaston** (S218 retired)

#### Historical edition notes

Editions E78, E79, E80, E81, E85, E86, E89, E91, E93 contain unsubstituted real-world canon (paper-of-record per S217 — not retroactively edited). bay-tribune Supermemory container untouched by the canon.2 scrub. Agents reading those editions encounter the corrections-forward map in `INSTITUTIONS.md` §Faith Corrections Forward for substitution at read-time.

---

## Notes

- **Josh Smith** leaked in Edition 82 (Chicago desk). Was corrected to "Jalen Smith" but the real name should never appear.
- **Jrue Holiday** and **Ben Simmons** are currently in the Bulls roster hardcoded list in buildDeskPackets.js (`knownCurrent` array). These are intentional video game imports from NBA 2K, NOT leaks — but Rhea should still flag them if they appear as *citizens* rather than *players*.
- **Billy Donovan** appeared as Bulls coach in early editions. Real person — should be replaced with a fictional coach name.

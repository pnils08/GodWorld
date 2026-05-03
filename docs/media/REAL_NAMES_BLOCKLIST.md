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

### Faith Organizations & Clergy (S195 — added post-Mara C93 audit)
**Always-block — no real churches, no real pastors, no exception.** Engine seeded the Faith_Organizations ledger with real-world names; those are legacy contamination, not canon. Substitutes:

- Acts Full Gospel Church → **Greater Hope Pentecostal Church**
- Bishop Robert Jackson Sr. → **Bishop Calvin Reeves Sr.**
- Allen Temple Baptist Church → (pending substitute)
- St. Columba Catholic Church → (pending substitute)
- Lake Merritt United Methodist → (pending substitute)
- Temple Sinai → (pending substitute)
- Shiva Vishnu Temple → (pending substitute)

Full table maintained in `docs/canon/INSTITUTIONS.md` §Faith & Community. Editions E78, E79, E80, E81, E85, E86, E89, E91 contain unsubstituted real-world canon — flagged for retroactive correction sweep.

---

## Notes

- **Josh Smith** leaked in Edition 82 (Chicago desk). Was corrected to "Jalen Smith" but the real name should never appear.
- **Jrue Holiday** and **Ben Simmons** are currently in the Bulls roster hardcoded list in buildDeskPackets.js (`knownCurrent` array). These are intentional video game imports from NBA 2K, NOT leaks — but Rhea should still flag them if they appear as *citizens* rather than *players*.
- **Billy Donovan** appeared as Bulls coach in early editions. Real person — should be replaced with a fictional coach name.

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

### NFL Players
(none yet)

### Coaches / Executives
- Billy Donovan (also listed under NBA — he's a coach)

---

## Notes

- **Josh Smith** leaked in Edition 82 (Chicago desk). Was corrected to "Jalen Smith" but the real name should never appear.
- **Jrue Holiday** and **Ben Simmons** are currently in the Bulls roster hardcoded list in buildDeskPackets.js (`knownCurrent` array). These are intentional video game imports from NBA 2K, NOT leaks — but Rhea should still flag them if they appear as *citizens* rather than *players*.
- **Billy Donovan** appeared as Bulls coach in early editions. Real person — should be replaced with a fictional coach name.

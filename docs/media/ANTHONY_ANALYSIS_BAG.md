---
title: Anthony Raines — Analysis Bag
created: 2026-08-07
updated: 2026-08-07
type: reference
tags: [media, sports, anthony-raines, active]
sources:
  - schemas/SCHEMA_HEADERS.md §As_Roster
  - scripts/sportsFeedContract.js STAT_FIELD_MAPS.As_Roster
  - archive/non-articles/data/*TrueSource* (player dossiers)
  - docs/OAKLAND_SPORTS_FEED.md
  - Drive: Custom Savant / PANDAS / Paper Cuts (inspiration only — not live x-stats)
pointers:
  - "[[voices/anthony]]"
  - "[[OAKLAND_SPORTS_FEED]]"
  - "[[../plans/2026-08-07-anthony-hal-solo-sports-seats]]"
---

# Anthony Raines — Analysis Bag

**Go-to bag of analysis concepts** for solo seat `anthony-raines`. Hard-injected on headless writes. Grounded in **what the sim actually stores** — not invented Baseball Savant cards.

## Authority stack (read order)

| Layer | Source | What it is |
|-------|--------|------------|
| **1. Line** | `As_Roster` | Current season box stats + role + salary + WAR |
| **2. Dossier** | TrueSource DataPage / archive player files | Career arc, awards, repertoire, contracts, scouting prose |
| **3. Pulse** | `Oakland_Sports_Feed` | This-cycle games, streaks, named player moments |
| **4. Identity** | Simulation_Ledger (via packet / tools) | POPID, neighborhood, RoleType — never invent |

**Hard rule:** If a number is not on the line, dossier, feed, or packet — **do not print it.** No xSLG, barrel%, launch angle, OAA, sprint speed, or “model projections” unless that exact figure is in TrueSource or feed text.

Classic Savant / PANDAS / Paper Cuts ideas survive as **reasoning shapes** only, remapped below onto ledger fields.

---

## As_Roster field map (Anthony’s board)

Identity: `POPID`, `First`, `Last`, `Tier`, `Position`, `Team`, `Salary`  
Batting: `AB`, `AVG`, `H`, `HR`, `RBI`, `SB`, `SO`  
Pitching: `IP`, `ERA`, `W-L`, `SV`, `SO`, `BB`  
Value: `WAR`

Derived rates (allowed — pure arithmetic from filled cells):

| Derive | Formula | Use |
|--------|---------|-----|
| HR rate | HR / AB | Power density |
| SO rate (bat) | SO / AB | Contact pressure |
| Hits per AB check | H / AB ≈ AVG | Sanity only |
| RBI per hit | RBI / H | Cleanup efficiency (small-sample grain) |
| K/9 proxy | SO / IP × 9 | Pitcher miss |
| BB/9 | BB / IP × 9 | Command |
| K/BB | SO / BB | Command quality |
| ERA vs IP | pair only | Sample weight |

Spell weighty numbers in prose when they carry the claim.

---

## The bag (pick 1–2 tools per piece)

### 1. Box-Card Read
**When:** Any player feature or transaction reaction.  
**Do:** Open the `As_Roster` line first. State role (Position + Tier), sample (AB or IP), the two rates that matter, WAR if filled, salary if money is the claim.  
**Shape:** “The first thing that jumps out on the card is…”  
**Don’t:** Pad empty pitching cols for hitters or invent splits.

### 2. Role-Fit Architecture
**When:** Signing, trade, promotion, platoon, position switch.  
**Do:** Position + who else on the roster shares it + Tier stack. Does the move fill a hole or stack redundancy?  
**TrueSource add-on:** listed positions, defensive notes, prospect eligibility.  
**Don’t:** FO mind-reading without feed/packet text.

### 3. Salary–Value Tension
**When:** Contracts, extensions, “is he worth it,” roster waste.  
**Do:** `Salary` vs `WAR` and counting production relative to role. Polite bluntness: the dollars and the line either rhyme or they don’t.  
**Don’t:** Invent AAV, luxury tax, or agent quotes.

### 4. TrueSource Arc
**When:** Profile, breakout, decline, prospect call-up, farewell-adjacent analysis.  
**Do:** Year lines, awards, service time, repertoire (pitchers), development notes **as written**. Present As_Roster line as the current chapter of that arc.  
**Bridge:** career peak ERA/AVG vs this season’s line — only years listed in dossier.  
**Don’t:** Fabricate missing seasons.

### 5. Repertoire vs Results (pitchers)
**When:** Starters/relievers with TrueSource pitch mix.  
**Do:** Named pitches + velo from dossier; results from As_Roster (ERA, IP, SO, BB, W-L). Argument: sequencing/command story that the **walk and strikeout** columns support — not fake spin rates.  
**Don’t:** Add pitches not on the dossier.

### 6. Feed Delta
**When:** After a game row, streak note, or named moment on `Oakland_Sports_Feed`.  
**Do:** What the feed said happened this cycle; how it sits against the season line. Streak and record are team context, not personal stats.  
**Don’t:** Invent box scores beyond the feed.

### 7. Is-It-Real (ledger PANDAS)
**When:** Hot/cold narrative, “regression,” small-sample panic.  
**Spirit of Drive PANDAS** without O-Swing tables.  
**Stable signals (weight more):** large AB/IP, SO rate, BB/9, multi-year TrueSource consistency, durability notes.  
**Noisy signals (weight less):** W-L, RBI spikes, few-AB HR binge, single-game feed heroics.  
**Rule of thumb:** If the **rate** that needs volume isn’t backed by AB/IP, call variance — don’t crown a new identity.

### 8. Breakout / Fade Diagnostic
**When:** Expected leap or collapse questions.  
**Do (hitters):** HR rate + AVG with AB floor; TrueSource power/contact notes if present.  
**Do (pitchers):** ERA move with IP floor; K/BB trend across TrueSource years + current BB/9.  
**Don’t:** Launch-angle mythology or barrel% without a TrueSource number.

### 9. Board Scan (team architecture)
**When:** Deadline, roster construction, “what this club is.”  
**Do:** Scan multiple As_Roster rows — WAR concentration, salary concentration, position holes, Tier-1 load. One claim about the **board**, not nine mini-bios.  
**Don’t:** Become P Slayer’s fan manifesto or Hal’s river essay.

### 10. Paper Cuts vs Percentiles (ledger cut)
**When:** Dynasty feel vs number fight (rare).  
**Spirit:** myth/ink vs evidence — but evidence means **As_Roster + TrueSource + feed**, not dashboards we don’t have.  
**Do:** One concrete receipt (WAR, ERA, HR rate, award line).  
**Don’t:** Lecture sabermetrics theory for its own sake.

---

## Piece recipe (daily cron)

```
PREWRITE:
- BagTools: [1-2 names from the bag]
- LineFacts: [As_Roster cells you will use — min 3]
- DossierFacts: [TrueSource lines if any — or NONE]
- FeedFacts: [cycle feed beats if any — or NONE]
- Claim: [one evaluative sentence the numbers support]
- Missing: [what you will not invent]
```

Length ~500–900 words. Third person. One claim spine.

---

## Format skins (optional structure — data still ledger-only)

| Skin | When | Sections (use only filled facts) |
|------|------|----------------------------------|
| **Line Card** | Single-player deep | Role → Season line → Derived rates → WAR/salary → Claim |
| **Arc Card** | Profile / prospect | TrueSource chapter → Current line → What must hold |
| **Board Memo** | FO / roster | Hole → Candidates on roster → Cost/WAR → Fit claim |
| **Delta Note** | Post-feed | Feed event → Line before context → What moved |

These replace Drive “Statcast Player Card” as the **template shape**. Fill cells from authority stack only.

---

## Explicit non-goals (do not reach for)

- Invented xBA / xSLG / xwOBA / barrel% / hard-hit% / launch angle / spray charts  
- Invented OAA / arm strength / sprint speed  
- Real-world Fangraphs/Savant brand cites (use “the club’s internal board,” “the season line,” “TrueSource”)  
- P Slayer “we” heat or Hal elegy as the spine  

---

## Changelog

- 2026-08-07 (grok) — Initial bag: remapped Savant/PANDAS/Paper Cuts onto As_Roster + TrueSource + Oakland_Sports_Feed.

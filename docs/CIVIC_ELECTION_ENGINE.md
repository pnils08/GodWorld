# Civic Election Engine Reference

**Source:** `phase05-citizens/runCivicElectionsv1.js` v1.0

---

## Overview

The Civic Election Engine handles elections for GodWorld civic positions. Elections are designed as "dramatic promotions" — simple mechanics that generate rich storytelling opportunities for the Media Room rather than detailed vote simulations.

**Design Philosophy:** Generate story seeds, not spreadsheets.

---

## Election Window

Elections occur during a specific window each cycle year:

| Parameter | Value |
|-----------|-------|
| Window Cycles | 45-48 (November) |
| Trigger Cycle | 45 only (prevents duplicates) |
| Election Years | Even years only (Year 2, 4, 6, 8...) |

### Year Calculation

```javascript
cycleOfYear = ((absoluteCycle - 1) % 52) + 1   // 1-52
godWorldYear = Math.ceil(absoluteCycle / 52)    // 1, 2, 3...
```

---

## Election Groups (Staggered Terms)

Seats are divided into two groups with 4-year staggered terms:

### Group A (Years 2, 6, 10...)

- Council District 1
- Council District 3
- Council District 5
- Council District 7
- Council District 9

### Group B (Years 4, 8, 12...)

- Mayor
- District Attorney
- Public Defender
- Council District 2
- Council District 4
- Council District 6
- Council District 8

**Group Determination:**
```javascript
isGroupAYear = (godWorldYear % 4 === 2)  // Years 2, 6, 10...
isGroupBYear = (godWorldYear % 4 === 0)  // Years 4, 8, 12...
```

---

## Candidate Generation

### Challenger Pool Criteria

Challengers are drawn from the Simulation_Ledger with these filters:

| Criterion | Requirement |
|-----------|-------------|
| Tier | 2, 3, or 4 |
| CIV Flag | Not already `y` (unless journalist) |
| Status | `active` |

### Challenger Weighting

Candidates are weighted when selecting:

| Factor | Weight Bonus |
|--------|--------------|
| Tier 2 citizen | +3 weight |
| Tier 3 citizen | +2 weight |
| Tier 4 citizen | +1 weight (base) |
| Civic-adjacent role | +2 weight |

### Civic-Adjacent Roles

These roles grant the +2 weight bonus:

- `community` (leader, organizer)
- `advocate`
- `organizer`
- `business` (owner, leader)
- `attorney`
- `educator`

### District Preference

For non-citywide seats, candidates from the same neighborhood as the district are preferred. Citywide races (Mayor, DA, Public Defender) draw from the full pool.

---

## Outcome Calculation

### Base Score

Incumbents start with a base score of **50%**, then modifiers are applied:

### Incumbent Modifiers

| Factor | Effect | Range |
|--------|--------|-------|
| **Base Advantage** | +15% | Fixed |
| **Economic Mood** | `(econMood - 50) × 0.3` | -15% to +15% |
| **Public Sentiment** | `sentiment × 10` | -10% to +10% |
| **Scandal Status** | -25% | Fixed |
| **Injury/Illness** | -10% | Fixed |

### Challenger Modifiers

| Factor | Effect |
|--------|--------|
| Tier 2 challenger | -5% incumbent |
| Civic-adjacent role | -5% incumbent |

### Random Variance

```javascript
variance = (Math.random() * 20) - 10  // -10% to +10%
```

### Final Score Clamping

```javascript
incumbentScore = Math.max(25, Math.min(75, incumbentScore))
```

This ensures no race is ever a foregone conclusion (25-75% range).

### Victory Determination

```javascript
roll = Math.random() * 100
if (roll < incumbentScore) {
  winner = incumbent
  margin = incumbentScore
} else {
  winner = challenger
  margin = 100 - incumbentScore
}
```

---

## Margin Types

The win margin determines the narrative flavor:

| Margin Type | Point Spread | Description |
|-------------|--------------|-------------|
| `razor-thin` | < 3 points | "Decided by fewer than 3 points in a nail-biter finish." |
| `tight` | 3-7 points | "A competitive race that remained close throughout." |
| `comfortable` | 8-14 points | "A clear victory with solid margin." |
| `landslide` | 15+ points | "A decisive mandate from voters." |
| `unopposed` | No challenger | "Incumbent ran unopposed." |

**Point Spread Calculation:**
```javascript
winMargin = Math.abs(margin - 50)
```

---

## Special Cases

### Vacant Seats

When a seat has no incumbent:

- Challenger wins automatically
- Margin: 55-75% (random)
- Margin type: `comfortable`
- Narrative: "Open seat won without incumbent opposition."

### Unopposed Races

When no challenger is generated:

- Incumbent wins automatically
- Margin: 100%
- Margin type: `unopposed`
- Narrative: "Incumbent ran unopposed."

---

## Data Flow

### Input Sources

| Source | Data Used |
|--------|-----------|
| `Civic_Office_Ledger` | Seats, incumbents, election groups |
| `Simulation_Ledger` | Challenger pool |
| `ctx.summary.economicMood` | Economic factor |
| `ctx.summary.cityDynamics.sentiment` | Public sentiment |

### Output Targets

| Target | Data Written |
|--------|--------------|
| `Civic_Office_Ledger` | Winner, PopId, TermStart, TermEnd, Status |
| `Election_Log` | Full election record |
| `Simulation_Ledger` | CIV flag for new officeholders |
| `ctx.summary.electionResults` | Results for Media Briefing |

---

## Election Log Schema

| Column | Field | Description |
|--------|-------|-------------|
| A | Timestamp | When election was processed |
| B | Cycle | Absolute cycle number |
| C | GodWorldYear | Election year |
| D | OfficeId | Office identifier |
| E | Title | Office title |
| F | District | District or `citywide` |
| G | Incumbent | Previous holder name |
| H | Challenger | Challenger name |
| I | Winner | Election winner |
| J | Margin | Win percentage |
| K | MarginType | razor-thin/tight/comfortable/landslide/unopposed |
| L | IncumbentAdvantage | Whether incumbent ran |
| M | EconFactor | Economic mood at time |
| N | Narrative | Story seed for Media Room |

---

## Civic Office Ledger Updates

After an election, these fields are updated:

| Field | New Value |
|-------|-----------|
| Holder | Winner name |
| PopId | Winner's POPID |
| TermStart | Current cycle |
| TermEnd | Current cycle + 208 (4 years) |
| Status | `active` |
| LastElection | Current cycle |
| NextElection | `Cycles {TermEnd-3}-{TermEnd}` |

---

## Summary Output Structure

The engine outputs to `ctx.summary.electionResults`:

```javascript
{
  cycle: 45,
  year: 2,
  group: 'A',
  seatsContested: 5,
  results: [
    {
      office: 'Council District 1',
      district: 'West Oakland',
      incumbent: 'Maria Santos',
      challenger: 'James Chen',
      winner: 'Maria Santos',
      margin: 58,
      marginType: 'comfortable',
      narrative: 'A clear victory with solid margin.',
      upset: false
    },
    // ... more results
  ],
  upsets: 1
}
```

---

## Example Election Scenario

**Cycle:** 45 (Year 2, Group A election)

**Seat:** Council District 3

| Factor | Value | Effect |
|--------|-------|--------|
| Base | 50% | — |
| Incumbent advantage | +15% | 65% |
| Economic mood (35) | -4.5% | 60.5% |
| Public sentiment (-0.3) | -3% | 57.5% |
| Challenger Tier 2 | -5% | 52.5% |
| Civic-adjacent | -5% | 47.5% |
| Random variance | +6% | 53.5% |

**Final incumbent score:** 53.5%

**Roll:** 61 (> 53.5)

**Result:** Challenger wins with 46.5% → rounds to 47%

**Margin type:** `razor-thin` (3 points from 50)

**Narrative:** "Decided by fewer than 3 points in a nail-biter finish."

---

## Integration Points

| System | Integration |
|--------|-------------|
| **Phase 5** | Called after citizen processing, before analysis |
| **Media Room** | Receives `electionResults` for coverage generation |
| **Media Briefing** | Uses results for election night narratives |
| **Event Arc Engine** | Election outcomes can trigger political arcs |

---

## Edge Cases Handled

1. **No Civic_Office_Ledger** → Returns error in summary
2. **No seats up** → Returns message, no processing
3. **Empty candidate pool** → Incumbent runs unopposed
4. **Candidate already used** → Removed from pool (no multi-seat runs)
5. **Election_Log missing** → Auto-created with headers

---

## Comparison: Elections vs Initiative Votes

| Aspect | Elections | Initiative Votes |
|--------|-----------|------------------|
| Frequency | Even years, Nov | Any cycle |
| Participants | Citizens vote | Council votes |
| Outcome drivers | Mood, sentiment, scandal | Faction math, swing voters |
| Margin meaning | Narrative flavor | Pass/fail threshold |
| Randomness | Higher variance | Lower, more deterministic |

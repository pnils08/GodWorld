# Engine Review — Cycle 114

**Cycle:** 114 | **In-world:** Y3C10
**Source files:**
- `output/engine_audit_c114.json` — 18 patterns
- `output/engine_anomalies_c114.json` — 2 anomalies
- `output/baseline_briefs_c114.json` — 96 briefs

## Citizen Scoreboard

| Outcome | Citizens | Who |
|---|---|---|
| married | 0 | — |
| born | 1 | Mateo Salcedo (POP-01225) |
| promoted | 0 | — |
| laid off | 0 | — |
| hired | 3 | Brody Kale (POP-01059), Pixel Pete (POP-01064), GameGirl Gia (POP-01065) |
| bought a home | 1 | Kelvon Ochoa (POP-00481) |
| sold a home | 1 | Derek Obi (POP-00543) |
| forced sale | 0 | — |
| heritage step | 0 | — |

Since C113: tier up 8 — Maria Keen (POP-00013), Anthony Raines (POP-00017), Noah Tan (POP-00157), Elle Lilo (POP-00177), Yu Zen (POP-00194), Omar Amici (POP-00263), Nia Rook (POP-01076), Tamsin Pruitt (POP-01210) · tier down 0 · newly married 0 · new owners 1 (Kelvon Ochoa) · stopped owning 2 (Caleb Reyes POP-00146, Derek Obi POP-00543) · died 0 · new citizens 7 (POP-01225–POP-01231). Archived this Cycle: POP-00934 (deceased), POP-01025 (traded away).

## Ailments

### 1. Rockridge — sentiment, retail vitality and housing pressure all moved against it; no initiative targets Rockridge — **HIGH**
- **In-world symptom:** Felt in Rockridge. Sentiment 0.03 (17th of 22; city median 0.085), retail vitality 10.98 (8th of 22; median 8.265), housing pressure 5 (17th of 22; median 0).
- **What moved this Cycle:** sentiment −0.03, retail vitality −2.16, housing pressure +1.
- **Existing mitigators:** none on the Initiative_Tracker for Rockridge.
- **Remedy path:** a council seat proposes an initiative for Rockridge; the mayor's office names the gap in public remarks.
- **Tribune framing:** civic — who is accountable, what council has or has not done for Rockridge; letters — a Rockridge resident. Citizens: Brenda Okoro (POP-00037), Maya Torres-Dillon (POP-00742), Naomi Sterling (POP-00759). Rockridge carries 12 of this Cycle's 96 briefs.
- **Measure next Cycle:** Rockridge sentiment, retail vitality, housing pressure; any tracker row naming Rockridge.
- Coverage hooks: `covers Rockridge` · `cites a Rockridge resident` · `quotes Brenda Okoro (POP-00037)`

### 2. Laurel — retail vitality lowest of the 22 neighborhoods, sentiment 20th of 22; no initiative targets Laurel — medium
- **In-world symptom:** Felt in Laurel. Sentiment −0.03 (20th of 22), retail vitality 4.34 (22nd of 22; city median 8.265).
- **What moved this Cycle:** sentiment −0.03, retail vitality −3.00.
- **Existing mitigators:** none.
- **Remedy path:** a council seat proposes an initiative for Laurel; the mayor's office names the gap.
- **Tribune framing:** civic — the gap in Laurel; letters — a Laurel resident. Citizens: Maya Brooks (POP-00478), Rosalind Young (POP-00495), Rosa Simon (POP-00496).
- **Measure next Cycle:** Laurel retail vitality and sentiment.
- Coverage hooks: `covers Laurel` · `cites a Laurel resident` · `quotes Maya Brooks (POP-00478)`

### 3. Faith — five events this Cycle, no Tribune coverage the Cycle before — medium
- **In-world symptom:** City-wide; no citizens attached.
- **Existing mitigators:** not an initiative matter.
- **Remedy path:** desk pickup — the faith events threaded into a desk piece or roundup.
- **Tribune framing:** the faith beat.
- **Measure next Cycle:** faith coverage in the Cycle 115 read.

### 4. Oakland Youth Apprenticeship Pipeline — in effect; West Oakland and Fruitvale show no signal of their own yet — medium
- **In-world symptom:** Felt in West Oakland and Fruitvale. The initiative is in active implementation, second Cycle; retail vitality across its three neighborhoods (West Oakland, East Oakland, Fruitvale) rose a combined 2.92.
- **Existing mitigators:** the initiative itself, in effect.
- **Remedy path:** none — monitor.
- **Tribune framing:** civic — the responsible office and what West Oakland and Fruitvale are waiting on; letters — a West Oakland resident. Citizens: Tomas Renteria (POP-00744), Ramon Solano (POP-00756), Nina Reyes (POP-01057).
- **Measure next Cycle:** West Oakland and Fruitvale retail vitality on their own.
- Coverage hooks: `covers West Oakland` · `covers Fruitvale` · `mentions INIT-007` · `cites a West Oakland resident` · `quotes Tomas Renteria (POP-00744)`

## Anomalies

**Harry Hayward (POP-01223), KONO — income 100,000 → 4,500,000.** Oakland Oaks power forward, second-round pick, Tier 4 since C113.

**Trevor Henderson (POP-01224), Lake Merritt — income 100,000 → 1,400,000.** Oakland Oaks center, second-round pick, Tier 4 since C113.

## Improvements

**Initiatives that moved:** Downtown Economic Revitalization, legislation filed → vote scheduled. Commercial Stabilization for Grand Lake, legislation filed → announced. West Oakland Tenant Defense Fund, operational → announced. Temescal Community Health Center completed (Avery Santana +3; Warren Ashford −2, opposed).

**Sentiment rose 0.10 or more in nine neighborhoods:** KONO +0.17 (−0.01 → 0.16), West Oakland +0.16 (0.25 → 0.41), Uptown +0.15 (0.05 → 0.20), Downtown +0.11 (0.16 → 0.27), Piedmont Ave +0.11 (0.03 → 0.14), Eastlake +0.11 (−0.06 → 0.05), Jack London +0.10 (0.17 → 0.27), Grand Lake +0.10 (−0.03 → 0.07), Chinatown +0.10 (−0.06 → 0.04). Same Cycle: an Oaks win week, 35 named game-night moments, 4 fan lines; First Friday.

**Event attractiveness** rose 0.24 against an expected 0.02, carried from an earlier Cycle's finding.

## Baseline Briefs

- Total: 96 (world event 12, council vote 1, initiative milestone 3, citizen life event 80)
- With promotion hints: 54
- By neighborhood: West Oakland 14, Rockridge 12, Uptown 10, Lake Merritt 8, Jack London 7, Fruitvale 6, Piedmont Ave 6, Downtown 5, Grand Lake 4, Chinatown 3, Temescal 3; 4 unassigned.
- Source: `output/baseline_briefs_c114.json`

## Measurement Check (from previous review)

| Pattern | Affected | Prior remedy | Expected | Observed | Verdict |
|---|---|---|---|---|---|
| decay | Rockridge | — | — | — | new this Cycle |
| decay | Laurel | — | — | — | new this Cycle |
| coverage gap | faith | — | — | — | new this Cycle |
| cascade check | Oakland Youth Apprenticeship Pipeline / West Oakland, Fruitvale | none | retail vitality +0.02 | +1.83 | overshot |
| improvements ×14 | initiatives, neighborhood sentiment, event attractiveness | — | — | — | new this Cycle |

Win callout: none.

### Remedy-type track record

| Remedy type | Firing-as-expected | Firing-insufficient | Not-firing | Overshot |
|---|---|---|---|---|
| none | 0 | 0 | 0 | 1 |

## Summary

- Ailments: 4 (1 high, 3 medium)
- Anomalies: 2
- Improvements: 14
- Baseline briefs: 96 (54 with promotion hints)
- Measurements: 0 of 1 as expected; 1 overshot
- Scoreboard: married 0, born 1, promoted 0, laid off 0, hired 3, bought a home 1, sold a home 1

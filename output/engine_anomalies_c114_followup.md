# C114 anomalies — routed to engine-debug

Source: `output/engine_anomalies_c114.json` (detectAnomalies 1.2.0). Both `route-to-engine-debug`, confidence high. **CLOSED 2026-11-01 — builder: the salaries were set by hand (Oaks rookie contracts). World event. Nothing for engine-debug.**

| POPID | Name | Hood | Role | Income C113 → C114 | Ratio |
|---|---|---|---|---|---|
| POP-01223 | Harry Hayward | KONO | Oakland Oaks – Power Forward (Tier 4, 2nd-round pick, promoted C113) | 100,000 → 4,500,000 | ×45 |
| POP-01224 | Trevor Henderson | Lake Merritt | Oakland Oaks – Center (Tier 4, 2nd-round pick, promoted C113) | 100,000 → 1,400,000 | ×14 |

What to check: which writer set Income on these two rows this Cycle (sports contract path vs. the mint's placeholder being overwritten), whether 100,000 was ever a real value or the mint's seed, and whether the Oaks roster's other C113 picks carry the same shape. If it is the contract path landing on schedule, the fix is the anomaly detector's `peerShare` read (0% because no peer moved the same week), not the engine.

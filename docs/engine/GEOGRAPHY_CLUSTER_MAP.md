# Geography Cluster Map

This document outlines the canonical mapping of Oakland neighborhoods to economic clusters and City Council Districts, as well as the dynamic geographic ripple effects applied during Phase 2 world-state generation.

## 1. Clusters (Economic & Social Engines)

In Phase 2 (`applyCityDynamics.js`), 12 canonical neighborhoods are grouped into 5 interconnected clusters. These clusters act as engines for traffic, retail, tourism, nightlife, public spaces, cultural activity, and community engagement.

| Cluster Name | Neighborhoods | Capacity Sensitivity | Notes |
| :--- | :--- | :--- | :--- |
| **DOWNTOWN_CORE** | Downtown, Uptown, KONO, Chinatown | 1.4 | Arts walk epicenter; most sensitive to citywide congestion. High nightlife/traffic weights. |
| **WATERFRONT_WEST** | Jack London, West Oakland | 1.1 | High tourism weights; heavily impacted by marine weather fronts. |
| **LAKE_CORRIDOR** | Lake Merritt, Piedmont Ave | 0.9 | High public space weights; less affected by transit congestion. |
| **NORTH_HILLS** | Rockridge, Temescal | 0.7 | Retail-focused; experiences spillover from Downtown arts events. |
| **EAST_OAKLAND** | Fruitvale, Laurel | 0.6 | High community engagement; least affected by citywide congestion. |

## 2. City Council Districts

The `districtMap.js` assigns City Council Districts (D1-D9) to 21 broader mapped neighborhoods. Note the specific alignments (e.g., KONO was recently moved to D7 to conform to the locked canon).

* **D1 (Denise Carter):** West Oakland, Brooklyn
* **D2 (Leonard Tran):** Downtown, Chinatown, Jack London
* **D3 (Rose Delgado):** Fruitvale, San Antonio
* **D4 (Ramon Vega):** Glenview, Dimond, Ivy Hill
* **D5 (Janae Rivers):** East Oakland, Coliseum, Elmhurst
* **D6 (Elliott Crane):** Montclair, Piedmont Ave
* **D7 (Warren Ashford):** Temescal, Rockridge, KONO
* **D8 (Nina Chen):** Lake Merritt, Adams Point, Grand Lake, Eastlake
* **D9 (Terrence Mobley):** Laurel, Uptown

## 3. Geographic Adjacency & Ripple Effects

The dynamics engine calculates ripple effects where events, crime, weather, and sentiment bleed across geographic boundaries.

### A. Sentiment Bleed
Sentiment naturally diffuses across adjacent clusters. Each cycle, a cluster's baseline sentiment is pulled toward the average sentiment of its adjacent neighbors by a factor of 12% (`bleedFactor = 0.12`).

**Adjacency Map:**
* **DOWNTOWN_CORE** neighbors: WATERFRONT_WEST, LAKE_CORRIDOR, NORTH_HILLS
* **WATERFRONT_WEST** neighbors: DOWNTOWN_CORE, EAST_OAKLAND
* **LAKE_CORRIDOR** neighbors: DOWNTOWN_CORE, NORTH_HILLS, EAST_OAKLAND
* **NORTH_HILLS** neighbors: DOWNTOWN_CORE, LAKE_CORRIDOR
* **EAST_OAKLAND** neighbors: WATERFRONT_WEST, LAKE_CORRIDOR

### B. Crime Spillover
Crime from previous cycles affects entire clusters, heavily suppressing local activity and mood.
* **1+ Crimes in Cluster:** Nightlife drops to 97%; Sentiment drops by -0.04.
* **2+ Crimes in Cluster:** Nightlife drops to 92%; Tourism drops to 94%; Sentiment drops by -0.08.
* **3+ Crimes in Cluster:** Nightlife drops to 85%; Tourism drops to 88%; Public Spaces drop to 88%; Sentiment drops by -0.15.

### C. Weather Front Targeting
Specific weather fronts aggressively target designated clusters, suppressing outdoor metrics.
* **MARINE Front:**
  * WATERFRONT_WEST: Tourism (92%), Public Spaces (88%), Sentiment (-0.06).
  * LAKE_CORRIDOR: Public Spaces (94%).
* **HEAT Front:**
  * EAST_OAKLAND: Public Spaces (92%), Sentiment (-0.04).
* **COLD Front:**
  * NORTH_HILLS: Public Spaces (90%), Traffic (95%).

### D. Event & Sports Ripples
* **First Friday:** Generates a massive localized boost (nightlife x1.5, culture x1.6) centered in `DOWNTOWN_CORE` (KONO/Uptown), with moderate spillover to `NORTH_HILLS` (Temescal/Rockridge).
* **Creation Day:** Applies a citywide community and sentiment boost, with a specialized extra boost for `EAST_OAKLAND`.
* **Sports Postseason/Finals:** Coliseum activity cascades into `WATERFRONT_WEST`, `EAST_OAKLAND`, and `DOWNTOWN_CORE`, boosting traffic, nightlife, and community engagement in those areas.

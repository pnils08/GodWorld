# Crisis-Arc Engine Review (engine.243 / S474)

**Reviewer:** Antigravity (Adversarial Review Lane)  
**Date:** 2026-09-20  
**Scope:** `phase03-population/generateCrisisBuckets.js` v3.0, `phase09-digest/finalizeCycleState.js` (`compactCrisisArcs_`), `phase07-evening-media/storyHook.js` (lines 320–344).

---

### (1) BLAST RADIUS — Readers of `S.eventArcs` Rendering `arc.summary`

Every reader that renders `arc.summary` into text read by a human or agent:

1. **`phase07-evening-media/storyHook.js:329, 332, 335, 338` (in loop lines 320–344)**
   * **Context:** Arc-based hook generation across lifecycle phases (`early`, `rising`, `peak`, `decline`).
   * **Rendered Text:**
     * Line 329: `'Early signals in ' + (a.neighborhood || 'the city') + ': ' + (a.summary || 'Something is building.')`
     * Line 332: `'Rising tension in ' + (a.neighborhood || 'the city') + ': ' + (a.summary || 'Situation developing.') + ' Worth watching.'`
     * Line 335: `'PEAK: ' + (a.neighborhood || 'City') + ' facing acute pressure. ' + (a.summary || 'This is the moment.') + ' Immediate attention recommended.'`
     * Line 338: `'Cooling down in ' + (a.neighborhood || 'the city') + ': ' + (a.summary || 'Tension easing.') + ' Follow-up angle available.'`
   * **Destination:** `hook.text` → written to `Story_Hook_Deck` and desk packet hook collections. Read by newsroom LLM agents and human editors.
   * **Parsing:** **None** (string concatenation / print only).

2. **`phase10-persistence/buildCyclePacket.js:282`**
   * **Context:** Cycle packet assembly for active arcs (`lines 267–285`).
   * **Rendered Text:**
     * Line 282: `lines.push('- [' + a.type + '/' + a.phase + '/t=' + tension + '] ' + anh + ': ' + a.summary + age);`
   * **Destination:** `Cycle_Packet` under section `--- EVENT ARCS ---`. Read by prompt builders and human reviewers.
   * **Parsing:** **None** (string concatenation / print only).

3. **`phase05-citizens/citizenContextBuilder.js:909, 1028`**
   * **Context:** Reads `Event_Arc_Ledger` (which records `arc.summary` from `generateCrisisBuckets.js:204`) via `getWorldState_` (line 301).
   * **Rendered Text:**
     * Line 909: `concerns.push(arc.summary || arc.type);` (populates citizen profile concerns).
     * Line 1028: `lines.push('  - ' + (arc.summary || arc.type) + ' (' + arc.phase + ')');` (inside `LIVED THROUGH:` block).
   * **Destination:** System prompt for citizen voicing / quote generation. Read by LLM agent.
   * **Parsing:** **None** (array insertion and formatting).

4. **`scripts/buildDeskPackets.js:498–501, 734, 2617, 2789`**
   * **Context:** Newsroom desk packet generation (reads `Event_Arc_Ledger` populated by `arc.summary`).
   * **Rendered Text:**
     * Line 2789: `summary: a.Summary` in `packet.arcs` (written to `output/desk-packets/<desk>_c<N>.json`).
     * Line 734: `summary: a.summary` in `generateDeskSummary` (written to `output/desk-packets/<desk>_summary_c<N>.json`).
   * **PARSING FLAGS:**
     * **FLAG 1 — PARSES WITH REGEX (`scripts/buildDeskPackets.js:499`):**
       ```javascript
       var text = a.summary || a.Summary || '';
       var nameMatches = text.match(/[A-Z][a-z]+ [A-Z][a-z]+/g);
       if (nameMatches) nameMatches.forEach(function(n) { names[n] = true; });
       ```
       `getCitizenNamesFromDeskData` extracts capitalized word pairs from summary text. A title-cased name prefix (e.g., `The West Oakland Crime Spike`) causes "West Oakland" and "Crime Spike" to match `/[A-Z][a-z]+ [A-Z][a-z]+/g`.
     * **FLAG 2 — PARSES WITH INDEXOF (`scripts/buildDeskPackets.js:2617` calling `311–318`):**
       ```javascript
       var targetDesks = getDesksForDomain(a.DomainTag, a.Summary);
       ```
       In `getDesksForDomain` (`lines 312–314`): if `d === 'SPORTS'`, runs `description.toLowerCase().indexOf(kw) !== -1`.

5. **`dashboard/src/components/tabs/IntelTab.jsx:118`**
   * **Context:** Intel tab arc card component.
   * **Rendered Text:** Line 118: `<p className="text-sm text-text mb-2">{arc.summary}</p>`
   * **Destination:** Human-facing UI card.
   * **Parsing:** **None** (JSX string print).

6. **Truncation / Slice Constraint:**
   * **`phase09-digest/finalizeCycleState.js:249`**: `summary: String(a.summary || '').slice(0, 160)`
   * Slices summary to 160 characters. A name prefix consumes ~25–40 characters of this 160-char carry-over window.

---

### (2) CARRY INTEGRITY — Whitelist & Byte Budget

1. **Field Survival Audit:**
   The lifecycle re-evaluation loop at `generateCrisisBuckets.js:231–282` (plus helpers `emitRipple_` and `ledgerRow_`) references the following fields on carried arcs:
   * `arc.neighborhood` → Preserved (`finalizeCycleState.js:246`)
   * `arc.phase` → Preserved (`finalizeCycleState.js:244`)
   * `arc.consecutiveBad` → Preserved (`finalizeCycleState.js:251`)
   * `arc.consecutiveGood` → Preserved (`finalizeCycleState.js:257`)
   * `arc.tension` → Preserved (`finalizeCycleState.js:245`)
   * `arc.phaseStartCycle` → Preserved (`finalizeCycleState.js:259`)
   * `arc.citizens` → Preserved, capped at 6 (`finalizeCycleState.js:250`)
   * `arc.summary` → Preserved, sliced at 160 (`finalizeCycleState.js:249`)
   * `arc.arcId` → Preserved (`finalizeCycleState.js:242`)
   * `arc.type` → Preserved (`finalizeCycleState.js:243`)
   * `arc.domainTag` → Preserved (`finalizeCycleState.js:247`)
   * `arc.domain` → Preserved (`finalizeCycleState.js:248`)
   * `arc.cycleCreated` → Preserved (`finalizeCycleState.js:258`)
   * `arc.source` → Preserved (`finalizeCycleState.js:260`)

   **Result:** Every field currently required by the lifecycle loop survives the whitelist today.
   **Missing Field for Proposed Cut:** `arc.name` (and `arc.nameChannel` if tracked) is **absent** from `compactCrisisArcs_` at `finalizeCycleState.js:241–261`. Without updating `compactCrisisArcs_`, the name will be stripped on the first cycle carry.

2. **Byte Cost vs. 9KB PropertiesService Budget:**
   * **Budget:** 9,216 bytes (Google Apps Script `PropertiesService.setProperty` limit for `previousCycleState` JSON string).
   * **Per-Arc Cost of Name String:** Key `"name":` (7 B) + quotes (2 B) + value (20–35 B) + comma (1 B) = **~30–45 bytes per arc**.
   * **Cap:** `SNAPSHOT_CRISIS_ARC_CAP = 8` (`finalizeCycleState.js:233`).
   * **Total Cost:**
     * At 8 arcs: 8 × 40 bytes ≈ **320 bytes total** (or ≈ **520 bytes** if including `"nameChannel": "..."`).
   * **Budget Consumption:** 320 bytes is **~3.47%** of the 9,216-byte budget.

---

### (3) MISSING EMISSION — Verification of Asymmetric `worldEvents`

**Verification:** Confirmed. `S.worldEvents` receives an event push **only at onset**. Neither peak nor resolution transitions push to `S.worldEvents`.

* **Onset Push to `S.worldEvents` (`phase03-population/generateCrisisBuckets.js:318–328`):**
  ```javascript
  318:     S.worldEvents.push({
  319:       cycle: cycle,
  320:       domain: domain,
  321:       subdomain: 'neighborhood-crisis',
  322:       neighborhood: hood,
  323:       severity: severity,
  324:       description: newArc.summary,
  325:       impactScore: severity === 'high' ? 50 : severity === 'medium' ? 30 : 15,
  326:       source: 'DETECTED',
  327:       timestamp: ctx.now
  328:     });
  ```

* **Peak Transition: Ripple + Ledger only, NO `worldEvents` push (`lines 248–252`):**
  ```javascript
  248:         if (newPhase === 'peak') {
  249:           emitRipple_(arc, 'crisis-peak', CRISIS_DETECT.ONSET_RIPPLE,
  250:             arc.neighborhood + ' crisis at peak (' + arc.consecutiveBad + ' straight bad cycles): ' + ch.evidence.join('; '));
  251:           queueAppendIntent_(ctx, 'Event_Arc_Ledger', ledgerRow_(arc, 'peak'), 'crisis arc peak', 'events');
  252:         }
  ```

* **Resolved Transition: Ripple + Ledger only, NO `worldEvents` push (`lines 265–272`):**
  ```javascript
  265:       if (arc.consecutiveGood >= CRISIS_DETECT.RESOLVE_CYCLES) {
  266:         arc.phase = 'resolved';
  267:         arc.cycleResolved = cycle;
  268:         arc.summary = arc.neighborhood + ' crisis eased after ' +
  269:           arc.consecutiveGood + ' cycles back within city range';
  270:         emitRipple_(arc, 'crisis-resolved', CRISIS_DETECT.RESOLVED_RIPPLE, arc.summary);
  271:         queueAppendIntent_(ctx, 'Event_Arc_Ledger', ledgerRow_(arc, 'resolved'), 'crisis arc resolved', 'events');
  272:       }
  ```

**Impact on Newsroom:**
Resolved arcs are excluded from `liveArcs` (`line 281`), dropped from `buildCyclePacket.js:269`, dropped from `storyHook.js:322`, and never pushed to `S.worldEvents`. The newsroom never receives an event or hook signaling that a crisis has resolved.

---

### (4) FABRICATION RISK — Traceability Rule & Two-Channel Conflation

1. **Traceability Rule:**
   A generated name must be a deterministic 1:1 projection of the single dominant/highest-priority measured channel that triggered the detector in that neighborhood, anchored strictly to the neighborhood and the detected physical metric. If evidence does not match an authorized detected channel, the generator must fail closed by returning an empty string (`name = ''`), preserving raw metric text without falling back to thematic pools, canned descriptors, or random selection.

2. **The Specific Way a Two-Channel Detection Could Imply an Unestablished Causal Claim:**
   Crisis onset requires ≥ 2 independent channels crossing anomaly thresholds in the same neighborhood (`ONSET_CHANNELS: 2`). The detector establishes **spatial and temporal co-occurrence (correlation)**, but **no causal mechanism between the two channels**.
   If a naming layer synthesizes both channels into a single compound concept (e.g., compounding a `heat wave` and `hospitalizations` into a "heat sickness epidemic", or a `crime spike` and `retail drop` into "crime-driven retail collapse"), it fabricates a causal link that the simulation never modeled. The hospitalizations may be trauma or unrelated illness; the retail drop may be inventory or rent pressure. Compounding two concurrent signals into one name asserts causality from proximity, which is the exact failure mode of engine.106.

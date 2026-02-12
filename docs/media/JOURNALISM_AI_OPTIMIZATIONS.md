# Journalism AI Platform Optimizations

**Created:** 2026-02-12 | **Status:** Implementation in progress
**Source:** Agentic AI in Journalism white paper analysis + AP/Reuters/Bloomberg patterns

---

## Overview

Apply proven journalism AI platform patterns to GodWorld Media Room to improve:
1. Story prioritization (help desks find the best stories)
2. Transparency (show which engines detected what)
3. Quality control (catch contradictions before publication)
4. Subscriber value (behind-the-curtain content)

---

## Phase 1: Signal Intelligence (Immediate Implementation)

### 1.1 Anomaly Detection & Variance Scoring

**What it does:** Automatically flag unusual patterns that indicate newsworthy stories.

**Implementation:** `scripts/buildDeskPackets.js`

Add variance calculation to events, demographics, metrics:

```javascript
// For each event
event.variance = calculateVariance(event, historicalBaseline);
event.anomalyFlag = variance > 2.0 ? 'HIGH' : variance > 1.5 ? 'MEDIUM' : 'NORMAL';

// For demographics
demo.unemploymentVariance = (current - historical_avg) / historical_stddev;
demo.alertLevel = variance > 3.0 ? 'SPIKE' : 'NORMAL';
```

**Baseline sources:**
- Last 10 cycles for each metric
- Calculate mean + standard deviation
- Variance = (current - mean) / stddev

**Desk packet addition:**
```json
{
  "anomalies": [
    {
      "metric": "unemployment",
      "neighborhood": "Downtown",
      "current": 18.5,
      "baseline": 12.3,
      "variance": 3.2,
      "alertLevel": "SPIKE",
      "headline": "Downtown unemployment up 50% (3.2σ spike)"
    }
  ]
}
```

---

### 1.2 Story Priority Scoring

**What it does:** Auto-rank signals by newsworthiness to help desks prioritize.

**Formula:**
```
Priority Score = (severity × 10) + (citizen_count × 2) + (variance × 5) + neighborhood_weight

Where:
- severity: 1-5 (from engine output)
- citizen_count: number of citizens affected
- variance: statistical variance from baseline (0-5)
- neighborhood_weight: 0 (if GENERAL), 2 (if specific neighborhood - local matters)
```

**Implementation:** Add to each signal in desk packets

```javascript
function calculatePriorityScore(signal, variance) {
  var severity = signal.severity || 3;
  var citizenCount = (signal.relatedCitizens || []).length;
  var neighborhoodWeight = signal.neighborhood && signal.neighborhood !== 'GENERAL' ? 2 : 0;

  return (severity * 10) + (citizenCount * 2) + (variance * 5) + neighborhoodWeight;
}
```

**Desk packet addition:**
```json
{
  "signals": [
    {
      "type": "crisis",
      "headline": "Transit ridership drops 25%",
      "priorityScore": 47,
      "rank": 1,
      "variance": 2.8,
      "severity": 4
    }
  ]
}
```

Signals sorted by priorityScore descending, top 3 get `"priority": true` flag.

---

### 1.3 Signal Chain Tracking

**What it does:** Document which engines detected what, creating transparency for subscribers.

**Implementation:** Add signalChain to engine outputs

Each engine that generates a signal includes:
```javascript
{
  signalChain: [
    {
      agent: "Transit Correspondent",
      engine: "updateTransitMetrics_",
      detected: "ridership_drop",
      value: -25,
      timestamp: "Phase2"
    },
    {
      agent: "Story Editor",
      engine: "textureTriggerEngine_",
      detected: "irony",
      context: "transit_initiative_just_passed",
      timestamp: "Phase6"
    },
    {
      agent: "Managing Editor",
      engine: "godWorldEngine2.js",
      decision: "front_page_priority",
      rationale: "high_variance + civic_relevance",
      timestamp: "Compilation"
    }
  ]
}
```

**Where to add:**
- updateTransitMetrics_ getTransitStorySignals_() output
- faithEventsEngine_ getFaithStorySignals_() output
- textureTriggerEngine_ outputs
- storyHookEngine_ outputs
- Mags compilation step adds final decision

**Subscriber value:**
"Behind the Curtain" content shows exactly how stories emerged:
> "This transit crisis was flagged by the Transit Correspondent after ridership dropped 25%
> (2.8σ variance). The Story Editor detected irony - the city had approved a transit
> initiative just 2 cycles ago. I (Mags) prioritized it for front page because high variance
> + civic relevance."

---

## Phase 2: Validation & Quality Control

### 2.1 Phase 6.5: Pre-Publication Validation

**New phase:** Between Phase 6 (story signals) and Phase 7 (media output)

**Four validators:**

#### Tone Checker
Flags contradictions between events and world state.

```javascript
function checkToneContradictions_(ctx) {
  var issues = [];
  var weather = ctx.summary.weather;
  var events = ctx.summary.worldEvents;

  for (var i = 0; i < events.length; i++) {
    var evt = events[i];

    // Check weather contradictions
    if (weather === 'rainy' && evt.description.match(/outdoor|walk|picnic/i)) {
      issues.push({
        event: evt,
        issue: "outdoor_activity_during_rain",
        severity: "MEDIUM"
      });
    }

    // Check crisis contradictions
    if (ctx.summary.healthCrisis && evt.domain === 'CELEBRATION') {
      issues.push({
        event: evt,
        issue: "celebration_during_health_crisis",
        severity: "HIGH"
      });
    }
  }

  return issues;
}
```

#### Continuity Checker
Catches impossible situations (citizen in two places, status conflicts).

```javascript
function checkContinuity_(ctx) {
  var issues = [];
  var citizens = loadActiveCitizens_(ctx);

  // Check: Can't be at event if status=hospitalized
  // Check: Can't have multiple events same day different locations
  // Check: Age/lifecycle impossible (70-year-old giving birth)

  return issues;
}
```

#### Distribution Auditor
Ensures balanced coverage across neighborhoods and tiers.

```javascript
function checkDistribution_(ctx) {
  var events = ctx.summary.worldEvents;
  var byNeighborhood = {};
  var byTier = {};

  // Count events by neighborhood
  for (var i = 0; i < events.length; i++) {
    var hood = events[i].neighborhood || 'GENERAL';
    byNeighborhood[hood] = (byNeighborhood[hood] || 0) + 1;
  }

  // Flag if >60% in one neighborhood
  for (var hood in byNeighborhood) {
    if (byNeighborhood[hood] / events.length > 0.6) {
      return {
        issue: "coverage_imbalance",
        neighborhood: hood,
        percentage: Math.round(byNeighborhood[hood] / events.length * 100),
        recommendation: "Consider featuring other neighborhoods"
      };
    }
  }

  return null;
}
```

#### Sensitivity Filter
Flags potentially tone-deaf content during active crises.

```javascript
function checkSensitivity_(ctx) {
  var flags = [];

  // If health crisis active, flag trivial events
  if (ctx.summary.healthCrisis) {
    // Flag CELEBRATION events during crisis
    // Flag luxury/excess events during economic downturn
  }

  // If civic crisis, flag events that ignore it
  if (ctx.summary.civicLoad === 'load-strain') {
    // Flag if NO civic events generated
  }

  return flags;
}
```

**Output:** Validation report added to ctx.summary.validationReport

**Usage:** Rhea Morgan receives validation report, adds to her verification checklist.

---

### 2.2 Community Input Layer

**Implementation:** Add to media intake workflow

#### Letters to the Editor (Influence Coverage)
```javascript
// New sheet: Community_Input
// Columns: Cycle, InputType, Topic, CitizenName, Suggestion, Status

// During buildDeskPackets, include top-voted community suggestions
{
  "communityInput": [
    {
      "type": "story_request",
      "topic": "Baylight District vote",
      "votes": 12,
      "suggestion": "Interview swing voters before the council vote"
    }
  ]
}
```

#### Reader Polls (Arc Direction)
```javascript
// Substack poll results → media intake
// "Should the Mayor face recall?" → 67% Yes
// Civic Desk receives: "Strong subscriber interest in recall coverage"
```

---

## Phase 3: Framework Alignment

### 3.1 Terminology Update

Update documentation to use journalism AI industry terminology:

| Old Term | New Term | Where |
|----------|----------|-------|
| "worldEventsEngine_" | "City Desk Monitor Agent" | Docs, logs |
| "updateTransitMetrics_" | "Transit Correspondent Agent" | Docs, logs |
| "Desk agents" | "Beat Reporter Agents" | Media Room docs |
| "godWorldEngine2.js" | "Managing Editor Orchestrator" | Architecture docs |
| "Mags compilation" | "Editor-in-Chief Review" | Workflow docs |

**Why:** Makes GodWorld marketable to AI/journalism industry, not just simulation fans.

---

## Implementation Checklist

### Phase 1A: Anomaly Detection (buildDeskPackets.js) ✅ COMPLETE
- [x] Add getHistoricalBaseline_() - reads last 10 cycles
- [x] Add calculateVariance_() for metrics
- [x] Add anomalyFlag to events
- [x] Add anomalies[] array to desk packets
- [x] Test with real data
- **Commit:** be0d890 (2026-02-12)

### Phase 1B: Priority Scoring (buildDeskPackets.js) ✅ COMPLETE
- [x] Add calculatePriorityScore_() function
- [x] Add priorityScore to all signals
- [x] Sort signals by score descending
- [x] Flag top 3 as priority: true
- [x] Test scoring formula
- **Note:** Implemented in Phase 1A commit (be0d890)

### Phase 1C: Signal Chain Tracking ✅ COMPLETE
- [x] Add signalChain to updateTransitMetrics_ output
- [x] Add signalChain to faithEventsEngine_ output
- [x] Add signalChain to textureTriggerEngine_ output
- [x] Add signalChain to storyHookEngine_ output
- [x] Mags adds compilation decision to chain
- [x] Test full chain through pipeline
- **Commit:** 89669cd (2026-02-12)

### Phase 2: Validation (new file: phase06-analysis/prePublicationValidation.js) ✅ COMPLETE
- [x] Create validators file
- [x] Implement checkToneContradictions_()
- [x] Implement checkContinuity_()
- [x] Implement checkDistribution_()
- [x] Implement checkSensitivity_()
- [x] Wire into Phase 6.5 in godWorldEngine2.js
- [x] Add to Rhea Morgan verification checklist
- **Commit:** bd66adc (2026-02-12)

### Phase 3: Documentation Updates
- [ ] Update MEDIA_ROOM_STYLE_GUIDE.md with journalism AI terminology
- [ ] Update AGENT_NEWSROOM.md with agent role mappings
- [ ] Save optimizations to supermemory

---

## Success Metrics

**Before:**
- Desks receive 50-100 signals per cycle, unclear prioritization
- No variance detection - miss spike stories
- No transparency on how stories emerged
- No pre-publication quality checks

**After:**
- Top 3 priority signals auto-flagged
- Anomalies (>2σ variance) highlighted in red
- Signal chains show detection → prioritization → decision
- 4 validators catch contradictions before Rhea sees them
- "Behind the Curtain" subscriber content explains the AI

**Subscriber value:**
- Free: Riley Digest (same as before)
- Paid: "Behind the Curtain" shows signal chains - which agents detected what, why stories were prioritized
- Premium: Vote on which arcs to follow, suggest story angles

---

## Journalism AI Terminology Reference

For external documentation, use industry-standard journalism AI terminology:

| GodWorld Code | Journalism AI Term | Context |
|---------------|-------------------|---------|
| `worldEventsEngine_` | City Desk Monitor Agent | Generates city-wide events |
| `updateTransitMetrics_` | Transit Correspondent Agent | Tracks transit/traffic signals |
| `faithEventsEngine_` | Faith & Ethics Correspondent Agent | Monitors religious community |
| `textureTriggerEngine_` | Story Editor (Texture Detection) | Identifies narrative textures |
| `storyHookEngine_` | Story Editor (Hook Generation) | Generates story angles |
| `godWorldEngine2.js` | Managing Editor Orchestrator | Coordinates cycle execution |
| Desk agents (Carmen, Maria, etc.) | Beat Reporter Agents | Specialized coverage desks |
| Mags compilation | Editor-in-Chief Review | Final story prioritization |
| Phase 6.5 Validation | Pre-Publication Quality Control | Automated fact-checking |
| Signal chain | Detection Provenance Trail | Transparency for subscribers |

**Use this terminology when:**
- Writing about GodWorld for journalism/AI audiences
- Marketing "Behind the Curtain" subscriber features
- Explaining how the simulation generates stories
- Describing the agent architecture

**Keep code terminology when:**
- Writing technical documentation for developers
- Debugging or logging engine behavior
- Referencing specific functions or files

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| v1.1 | 2026-02-12 | Implementation complete: Phases 1-2, terminology guide added |
| v1.0 | 2026-02-12 | Initial design based on journalism AI platform analysis |

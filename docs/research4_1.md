# Research 4.1 — Engineering Patterns from Adjacent Systems

**Source:** 3 research PDFs from Mara (claude.ai), March 2026
**Context:** Mara doesn't know our architecture. She researched the problem space — persistent AI narrative simulation, multi-agent coordination, feedback loops — and found how other programmers solved the same problems we're hitting.
**Why this matters:** We've been building these concepts by feel. This is the programmer logic behind them — specific implementations, failure rates, named systems with proven solutions.

---

## PDF 1: Engineering Failures in Persistent AI Narrative Simulation

**What it covers:** Six technical problems in multi-agent narrative systems — agent hallucination, memory contamination, character drift, multi-agent coordination failure, game data extraction, and the no-code gap.

### Agents Ignore the Ledger — Why and How to Fix It

LLMs predict the most *fluent* token, not the most *factual* one. Three things make this worse with structured data like our citizen ledger:

**Lost in the middle:** Stanford/UC Berkeley study — LLM performance drops 30%+ when critical info sits in the middle of the context window. If the ledger is sandwiched between system instructions and task instructions, the model literally sees it less clearly.

**Attention dilution:** Structured tables lose their relational structure when flattened to tokens. The model mixes up which attributes belong to which character because "row X = entity Y" gets diluted.

**Training data override:** When the task feels familiar ("write a story about characters"), the model defaults to training patterns rather than the provided context.

**Three proven fixes (use together):**

1. **Forced function calling.** Don't put the ledger in the prompt — expose it as a callable tool: `get_character(name)`, `list_characters_in_neighborhood(neighborhood)`. Set `tool_choice: "required"` so the model MUST query the database before generating. A FunnelStory case study found agents still skipped function calls ~5% of the time, fixable with few-shot examples.

   → **Rollout connection:** This is exactly what the dashboard API (31 endpoints at localhost:3001) already does. The problem is agent access (S128 — agents can't make HTTP calls). Solving that access problem gives us forced function calling for free.

2. **Constrained decoding with enum constraints.** Define a schema where character names are an enumerated list of valid names from the ledger. The decoding engine masks out all tokens that would produce invalid names — makes it physically impossible to hallucinate a character name. Anthropic, OpenAI, and open-source engines (SGLang, XGrammar) all support this. Important: this guarantees *syntactic* validity (valid name) but not *semantic* fidelity (correct occupation for that name). Need both layers.

3. **Anthropic Citations API.** Pass the citizen ledger as a cited document with `"citations": {"enabled": true}`. Claude automatically cites specific entries. A financial firm reported source hallucinations dropped from 10% to 0% using this. For our scenario — passing the citizen ledger as a cited document — this is one of the most practical, code-minimal solutions available.

   → **Rollout connection:** Phase 31 (canon-grounded briefings) already has Mags doing the research and providing canon to agents. Adding citations to that handoff is a small change with a big accuracy improvement.

### Container Tags Are Soft Labels, Not Hard Boundaries

Supermemory's container tags are metadata filters on queries, not database-level isolation. A query missing the tag parameter returns cross-container results. A write missing `containerTags` goes to an unscoped global pool. Both return HTTP 200 (success) with no error.

**Fix options from the research:**
- **Collection-based or namespace-based isolation** — separate database collections where a query physically cannot return results from another collection. Mem0 does this with `user_id`, `session_id`, `agent_id` scoping. LangMem uses separate PostgresStore instances per context.
- **Hardcode container assignments per agent in the orchestration layer** — don't let the LLM choose which container to write to.
- **TTL-based expiration** and periodic cleanup jobs to catch misplaced entries.

→ **What we already did:** S122 container redesign hardcoded assignments. Stop hook → super-memory, /save-to-mags → mags, ingestEdition.js → bay-tribune. The soft-label issue is real but we've mitigated it through discipline in the orchestration layer.

### Character Drift Is Mathematically Inevitable After 89 Editions

ICML 2024 research measured significant persona drift within just 8 conversation turns in GPT-3.5 and LLaMA-70B. The mechanism: transformer attention to the system prompt naturally decreases as conversation length increases. After 89 editions — each generating multiple character interactions — drift isn't a bug, it's the expected behavior.

**The homogenization problem:** A 2025 *Trends in Cognitive Sciences* study found that temperature scaling and different prompting techniques do NOT solve homogenization. RLHF training creates a default voice — articulate, empathetic, slightly formal — and all characters trend toward it.

**What works — canonical external database + re-injection:**

- **NovelAI's lorebook system** — gold standard for keyword-triggered context injection. Each character entry has activation keywords. When those words appear in the generation context, the character's full profile (age, occupation, neighborhood, personality traits, speech patterns) auto-loads. Free, open-source alternative: **SillyTavern** — multiple simultaneous lorebooks, recursive scanning, configurable scan depth.

  → **Rollout connection:** This is basically what we want world-data to do. When a desk agent is writing about Darius Clark, his full profile auto-loads from world-data. Phase 31 does this manually (Mags does the lookup). Phase 21.2 automates it.

- **Character profiles re-injected into every generation call** — not relying on the AI's "memory" across sessions. The database remembers, not the model.

- **Separate generation calls per character** — context competition causes blending when multiple character definitions compete for attention in one call.

- **Negative constraints** per character — "Elena NEVER uses exclamation marks, NEVER speaks in complete sentences" — fight homogenization harder than positive descriptions alone.

- **A validation agent** that reviews each edition against the canonical database, flagging age inconsistencies, occupation changes, personality drift.

  → **What we already have:** Mara does this. She audits every edition against canon without ledger access and still catches errors. E89 got a B-.

### Multi-Agent Coordination Fails 41-87% of the Time

The MAST framework (Cemri et al., 2025, NeurIPS) analyzed 1,600+ failure traces across seven popular frameworks. Found failure rates between 41% and 86.7%, with 14 distinct failure modes. The three most relevant to our editor-agent model:

- **Reasoning-action mismatch** (13.2%) — the agent reasons correctly about what to do but then acts differently
- **Task derailment** (7.4%) — drifting from assigned direction
- **Wrong assumptions** (6.8%) — proceeding with its own interpretation rather than following instructions

Google DeepMind's December 2025 study of 180 configurations: unstructured multi-agent networks amplify errors up to 17.2x versus single-agent baselines. Centralized coordination (like our editor model) contains this to 4.4x, but for sequential reasoning tasks — which content production largely is — **every multi-agent variant degraded performance by 39-70%** compared to a single well-prompted agent.

**The compound reliability math:** Even at 99% per-step reliability, a 10-step pipeline has only 90.4% end-to-end reliability. At a realistic 95% per step, it drops to 59.9%.

**Cognition AI (Devin makers) published "Don't Build Multi-Agents" in 2025:** Multiple agents in collaboration "only results in fragile systems" because decision-making becomes too dispersed and context can't be shared thoroughly enough. A January 2026 paper proposed that a strong single agent can match multi-agent performance at lower cost.

**Practical fixes from the research:**
- Replace prose editorial instructions with **structured JSON schemas** defining exactly what each sub-agent must produce — the MAST study found treating specifications like API contracts causes 79% of coordination failures
- Add a **judge/critique agent** that validates the editor's task decomposition against original instructions before sub-agents execute
- Use **extended thinking/chain-of-thought** to make planning visible and auditable
- **Seriously consider whether a single well-prompted agent outperforms multi-agent** for content production that is largely sequential and context-dependent

→ **Rollout connection:** S131 already landed here — "You provide the canon, they provide the voice." One agent with full canon access writing better journalism than six agents with no access. The supplementals from claude.ai proved this. Phase 31 formalizes it.

---

## PDF 2: Feasibility Assessment — Is the Bay Tribune Novel and Buildable?

**What it covers:** Prior art survey, technology stack assessment, cost analysis, failure modes, and the game data bottleneck.

### Nobody Has Built This Before

The specific intersection — sports video game characters living full civic lives in a simulated city, covered by an AI newspaper that treats its world as real — has no precedent. Individual components all exist:

| Project | What it proved | What it lacks |
|---------|---------------|---------------|
| Stanford Generative Agents (2023) | 25 LLM agents form relationships, plan events, spread gossip autonomously | No journalism output, no sports, no narrative framing |
| Project Sid (Altera, 2024) | 1,000 agents in Minecraft with emergent governance, cultural transmission, religion | No journalism, no sports data, no creative narrative |
| OOTP Baseball / Figment Universe | Deep fictional sports worlds, rich player lives | Characters stay within the sport — no civic life, no neighborhoods, no families |
| Football Manager Stories | Fan-written multi-season narrative epics about simulated leagues | Human-written, not AI-generated |
| NBA 2K "The City" | Open-world urban environment with off-court activities | Players interact with the city, but NPCs don't have civic lives |
| ESPN AI Recaps | Automated sports journalism from real-world data | One-way (data in, text out), no simulation, no persistent characters |
| James Ryan / UC Santa Cruz | "Talk of the Town" simulated a small town day-by-day for 200 years. "Sheldon County" generated a podcast about a simulated place. "National Pastime" builds baseball on a social simulation | Academic proof-of-concept, predates modern LLMs, never scaled |

**The Ryan connection is worth knowing.** His PhD dissertation "Curating Simulated Storyworlds" (2014-2018) explicitly argues the hard problem isn't simulating worlds but automatically recognizing and recounting what happened in them — which is exactly what the Bay Tribune does. He came closest from the academic side.

### Cost Is Surprisingly Low

LLM API prices dropped ~80% between early 2025 and early 2026. Running the full Bay Tribune pipeline — citizen state updates, narrative generation, newspaper articles — costs approximately:

| Model tier | Cost per edition | 89-edition season |
|------------|-----------------|-------------------|
| DeepSeek V3.2 / GPT-5 Nano (batch) | $0.03-0.10 | Under $10 |
| Sonnet-class (standard) | $0.30-0.71 | $27-63 |
| Premium (Opus-class) | $1-3 | Under $100 |

→ **Context:** We currently run on Claude. These numbers suggest batch processing with cheaper models for routine desks (culture, business, letters) could cut costs dramatically without losing quality on the desks that matter most.

### The Tiered Simulation Maps to What We Have

| Their tier | Citizens | Update method | Our equivalent |
|------------|----------|--------------|----------------|
| Tier 1 (10-30 featured) | Full LLM narrative, in the paper | Rich generation calls | Our Tier 1-2 |
| Tier 2 (50-100 active) | Brief LLM updates from events | Short generation | Our Tier 3 |
| Tier 3 (500+ background) | Rule-based templates, no LLM | Formulas and flags | Our Tier 4 |

"This mirrors how real newspapers work. Not every resident gets a profile every day. The newspaper selects who matters this week. The simulation tracks everyone; the journalism focuses on who's interesting right now."

### The Newspaper Format Is an Engineering Advantage

"The journalistic frame turns a technical limitation into a narrative feature. The 'belief in its own world' isn't just a creative conceit — it's an engineering advantage."

If the AI generates a minor inconsistency, it can be reframed as a correction in the next edition, or as conflicting accounts from different citizens. Real newspapers do this. The format absorbs errors that would break other systems.

"The newspaper is a character too." Institutional voice — the Bay Tribune's style, recurring columns, editorial perspective — matters as much as individual character consistency.

### Game Data Is the Real Bottleneck

| Game | Data access | Status |
|------|------------|--------|
| **MLB The Show** | Community API at `mlb[year].theshow.com/apis/`, third-party tools like ShowZone | Best of the three. Diamond Dynasty (card mode) only, not franchise. JWDixon's Franchise Spreadsheet on Operation Sports is the manual workaround. |
| **Madden** | Companion App exported JSON to user-specified URL. Ecosystem: DaddyLeagues (paid, 2,000+ leagues), Snallabot (free Discord bot), MyMadden (free/paid), madden-franchise NodeJS library | EA may be degrading Companion App export (March 2026 forum posts). App is unreliable. |
| **NBA 2K** | No official API, no franchise export, no companion app. PC modding tools (Looyh's NBA2K Tools, NBA2K File Explorer) can extract roster data but not season statistics or game results | Worst of the three. |

**Cross-game solution:** GPT-4o Vision processing screenshots. Take systematic screenshots of standings, box scores, stat leaders after each simulated week. Send to vision API with consistent JSON schema. The `instructor` Python library makes this clean with Pydantic models. Cost: ~$2.50 per million input tokens. Handles tables well, occasionally hallucinates numbers, struggles with small text.

→ **Rollout connection:** This is the Phase 28 territory (Computer Use Integration) but the screenshot-to-JSON approach via vision API is simpler and more reliable than browser automation. Worth evaluating when game data integration becomes priority.

---

## PDF 3: Engineering a Closed-Loop AI Media Pipeline

**What it covers:** The closed loop — how articles feed back into the simulation engine as structured data. The thing nobody has built. This is the most technical of the three and the most directly useful for Phase 27 (Agent Autonomy & Feedback Loop).

### The Dual-Output Pattern

The central conversion problem: how do you turn an AI-written newspaper article about a failing city program into a numerical sentiment shift the engine can consume?

**The answer: don't parse the article at all. Make the LLM produce both the article AND the structured impact data simultaneously.**

When the LLM writes "Downtown crime surge raises alarms," it simultaneously outputs:
```json
{
  "headline": "Downtown crime surge raises alarms",
  "article_body": "...",
  "overall_sentiment": -0.3,
  "district_impacts": {"downtown": -0.15},
  "event_probability_modifiers": {"protest": 0.08},
  "citizen_mood_delta": -0.12
}
```

The same model that understands the narrative also understands its implications. One call, type-checked at generation time.

**Three implementation paths, ordered by reliability:**

| Path | Method | Reliability | Notes |
|------|--------|------------|-------|
| A (fastest) | Single call, composite Pydantic model with both narrative + impact fields | ~92% | OpenAI constrained decoding guarantees valid JSON. Anthropic tool-use pattern achieves same — define `publish_article` and `submit_impact_assessment` tools, model calls both. |
| B (most reliable) | Two sequential calls. Call 1: article as free text. Call 2: extract structured impact using strict Pydantic schema with `max_retries=3` | ~98% | Instructor library handles retry + validation automatically. |
| C (defense-in-depth) | Dual output + independent NLP cross-validation. VADER for sentiment, spaCy for entity extraction, compare against LLM's self-reported values | Highest | If discrepancy > 0.4, average the scores or flag for review. |

**Recommended stack:** Instructor + Pydantic for structured LLM output, VADER for fast sentiment cross-checks, spaCy for entity extraction validation, Guardrails AI for semantic validation (bias detection, factual grounding).

→ **Rollout connection:** This is Phase 27's feedback loop. When we get there, Path B (two calls) is probably the right starting point — write the article, then extract impact. It's more reliable and we can add Path C validation later.

### Game Engine Feedback Architectures

Four commercial games that solved pieces of the feedback puzzle. These are the most directly useful patterns in all three PDFs:

#### Dwarf Fortress — Bounded Memory Slots

Each dwarf has **8 short-term memory slots**, grouped by category (Social, Work, Family, Health). When a new memory arrives:
1. Check if one already exists in that group
2. Keep only the stronger emotion
3. This prevents redundant trauma stacking (seeing 50 corpses occupies one slot, not 50)

After roughly one in-game year, the 8 strongest memories promote to long-term storage. The dwarf periodically "relives" them with additional stress. At each reliving, there's a **1-in-3 chance** of promotion to core memory, which permanently alters personality traits.

A dwarf who repeatedly witnesses violence drifts toward "doesn't care about anything anymore" — built-in desensitization as a dampening mechanism.

**The engineering insight: bounded state space prevents emotional runaway.** No unbounded accumulators.

→ **Rollout connection:** Our citizen sentiment system could use bounded memory slots. Instead of accumulating every media impact forever, keep 8 recent impacts per citizen (grouped by category), promote the strongest to permanent trait shifts on a schedule. Prevents runaway and models real human psychology (people forget minor events, major ones shape character).

#### RimWorld — Adaptation Factor

The most explicit anti-death-spiral mechanism in commercial games:
- **"Days since last injury" counter** — when colonists die or are downed, days are subtracted. When the colony survives, days are added.
- The counter directly modulates raid difficulty
- **Population intent curve** — dramatically increases colonist-adding events when population drops below target
- **Wealth cap at 1 million** for raid calculations — prevents exponential difficulty scaling
- Design philosophy: **"balanced on the assumption that players will lose one pawn every 20-30 days."** The game expects damage and engineers recovery.

→ **Rollout connection:** Our engine should expect negative cycles and engineer recovery. If sentiment drops too far, the engine should increase positive events (new businesses, community celebrations, sports wins) — not as a cheat, but as the natural resilience of a real city.

#### Crusader Kings 3 — Temporal Decay

- Every opinion modifier (from "executed my kinsman" at -40 to "befriended" at +30) **expires after a set duration**
- Personality traits multiply how events affect characters, but **coping mechanism cooldowns** (3-5 year timers on stress-relief decisions) prevent gaming the system
- **Key pattern: time-decaying modifiers prevent permanent state shifts from single events**

→ **Rollout connection:** Media impact on citizens should decay over time. An article about downtown crime doesn't shift sentiment permanently — it fades over 3-5 cycles as newer events take over. This is natural and prevents accumulation.

#### Victoria 3 — Pressure Accumulation with Threshold Triggers

- Standard of Living scores route to Radicalism values
- Radicalism routes to Interest Group Approval
- Interest Group Approval routes to Political Movements
- Political Movements route to Law changes that restructure the economy
- **Multi-hop feedback chain** from economics → politics → structural change
- Victoria 2 had a literal newspaper system presenting world events as articles (purely cosmetic)
- The real feedback runs through **radicalism as a pressure accumulator** — past a threshold of 6+ militancy, it spawns rebels
- **Pattern: continuous sentiment accumulation with discrete event triggers at thresholds**

→ **Rollout connection:** This is exactly the pattern for Phase 27's feedback loop. Media coverage slowly shifts neighborhood sentiment. When sentiment crosses a threshold, it triggers discrete city events — protests, council meetings, business closures, community celebrations. Not a constant drip of micro-changes, but pressure building to tipping points.

### Preventing Death Spirals — The 10-Layer Defense

The nightmare scenario: negative AI coverage drops citizen sentiment → more negative events → more negative coverage → accelerating spiral. Control theory calls this an unstable system with loop gain greater than 1. The research on predictive policing (Ensign et al., 2018) demonstrated exactly this failure — algorithms repeatedly sent police to the same neighborhoods regardless of actual crime rate.

**The 10 layers, each targeting a different failure mode:**

| Layer | Mechanism | What it prevents |
|-------|-----------|-----------------|
| 1. Gain dampening | Only 30% of raw sentiment change applies to engine (α = 0.3) | Overreaction to single articles |
| 2. Rate limiting | Max 5% mood change per cycle, regardless of coverage | Catastrophic single-cycle shifts |
| 3. Mean reversion | Exponential decay toward baseline each cycle (λ = 0.1) | Permanent extreme states |
| 4. Bounded influence | Cap per article AND cap aggregate media impact per cycle | Any single piece dominating the system |
| 5. Circuit breakers | If sentiment velocity exceeds threshold over 5 cycles, temporarily zero out media feedback | Runaway spirals |
| 6. Multiple media sources | 3-5 outlets with different editorial biases (optimistic, critical, neutral) | Single voice dominating |
| 7. Gaussian noise | 5-15% noise injection to break deterministic cycles | Resonant frequency lock-in |
| 8. Historical smoothing | Exponentially weighted moving average (β = 0.2) instead of raw values | High-frequency oscillation |
| 9. Narrative diversity enforcement | Rotate topic requirements, vary LLM temperature, assign distinct editorial personas | Mode collapse (same type of article every cycle) |
| 10. Continuous monitoring | Track Shannon entropy of topics, sentiment velocity, cross-correlation between AI output and world state | Detecting problems before they compound |

**We don't need all 10.** But layers 1-5 are basic control engineering that should be in from day one. Layer 6 is interesting for the Product Vision (multiple outlets). Layers 7-10 are optimization.

**The stress test:** Introduce a deliberately destabilizing "tabloid" agent that writes maximally negative coverage every cycle. If the defense stack can absorb that without spiraling, it can handle normal LLM variance.

→ **Rollout connection:** Phase 27.2 (media impact rules) and 27.3 (feedback integration). When we build the feedback loop, these layers should be part of the initial design, not added after the first death spiral.

### The Complete Pipeline (Their Architecture)

```
SIMULATION ENGINE (deterministic)
    → Outputs: city state — population, districts, programs, events, citizen attributes
    ▼
LLM ARTICLE GENERATOR
    → Input: simulation JSON + editorial persona + topic assignment
    → Output: ArticleWithImpact (narrative text + sentiment scores + district impacts + event modifiers)
    ▼
VALIDATION LAYER
    → Schema validation, range checks [-1.0, 1.0], entity validation (districts/programs exist in sim)
    → Retry on failure (max 3)
    ▼
NLP CROSS-CHECK (optional)
    → VADER compound score vs. LLM self-reported sentiment
    → spaCy NER vs. LLM-reported affected entities
    → If discrepancy > 0.4: average or flag
    ▼
STABILITY FILTERS (the 10-layer defense)
    → Gain dampening, rate limiting, mean reversion, circuit breaker, bounded influence, EWMA smoothing
    ▼
SIMULATION ENGINE (next cycle)
    → Applies filtered modifiers to citizen mood, event probabilities, program effectiveness
    └── Loop repeats
```

→ **Rollout connection:** This maps to our pipeline: Engine (11 phases) → Desk packets → Agents → Edition → Validation (Mara) → Publish. The missing piece is the bottom half — edition impact flowing back into the engine for the next cycle. That's Phase 27.

---

## Cross-PDF Patterns — What Keeps Coming Up

These showed up independently across all three PDFs from different sources:

1. **The character database is the spine, not the AI agents.** Every successful long-running narrative AI system — NovelAI lorebooks, Inworld's Contextual Mesh, SillyTavern's World Info — grounds the AI against an external canonical data store. The database re-injected into every generation call with validation checking afterward matters more than any framework choice.

2. **Single well-prompted agent outperforms multi-agent for sequential content.** Cognition AI, DeepMind (December 2025, 180 configurations), and the MAST framework (NeurIPS) all converge on this. For content production that is largely sequential and context-dependent, multi-agent degrades performance 39-70%.

3. **Bound everything.** Dwarf Fortress bounds memory slots. RimWorld bounds difficulty scaling. CK3 bounds opinion duration. Victoria 3 bounds accumulation with threshold triggers. Every stable game system prevents unbounded accumulators. Our feedback loop needs the same.

4. **The newspaper format is an engineering advantage.** Errors become corrections. Inconsistencies become conflicting accounts. The journalistic frame absorbs AI failures that would break other systems.

5. **The closed loop is the novel piece.** Every existing sports-to-text system (AP, ESPN, OOTP) runs one-way. Every existing simulation (Generative Agents, Project Sid) has no journalism output. Nobody has closed the loop where media coverage feeds back into citizen sentiment and city events. That's what Phase 27 builds.

---

## Rollout Connections Summary

| Research finding | Rollout phase | Status |
|-----------------|---------------|--------|
| Forced function calling via character database tools | Phase 21.2 (Canon Grounding MCP) + dashboard API access fix | Dashboard built, agent access blocked (S128) |
| Citations API for grounded generation | Phase 31 enhancement | Not started — low effort, high impact |
| Canon re-injection on every generation call | Phase 31 (manual) → Phase 21.2 (automatic) | Phase 31 designed S131 |
| Single agent > multi-agent for sequential content | Phase 31 approach (Mags researches, one agent writes) | Validated by S131 supplementals |
| Dual-output pattern (article + structured impact) | Phase 27.2 (media impact rules) | Not started |
| Bounded memory slots / temporal decay for sentiment | Phase 27.3 (feedback integration) | Not started — design from these patterns |
| Death spiral prevention (10-layer defense) | Phase 27.3 (feedback integration) | Not started — build layers 1-5 from day one |
| Victoria 3 pressure accumulation → threshold events | Phase 27.2 (media impact rules) | Not started — strongest model for our feedback loop |
| NovelAI lorebook / keyword-triggered context injection | Phase 21.2 (Canon Grounding MCP) | Not started — design pattern for auto-loading citizen profiles |
| Game data extraction via vision API | Phase 28 (Computer Use) | Not started — simpler than browser automation |
| Tiered simulation (featured / active / background) | Already built | Engine tiers 1-4 map directly |
| Newspaper as engineering advantage (errors → corrections) | Already built | The Bay Tribune format inherently does this |

---

## Named Tools and Systems Worth Knowing

| Tool | What it does | Cost | Relevance |
|------|-------------|------|-----------|
| **Instructor** (Python) | Structured LLM output via Pydantic models. 11k+ GitHub stars. | Free | Dual-output pattern for Phase 27 |
| **Mem0** | Memory layer with user/session/agent scoping. 47.8k GitHub stars. | $19-249/mo | Alternative to Supermemory if isolation becomes critical |
| **Zep (Graphiti)** | Temporal knowledge graph — tracks when facts change and when they were superseded | Credit-based | Character state tracking across editions |
| **LangMem** | Free, namespace-based memory isolation backed by PostgresStore | Free | Hard container separation if needed |
| **SillyTavern** | Open-source lorebook system — keyword-triggered character profile injection, recursive scanning | Free | Design pattern for world-data → agent context injection |
| **NovelAI** | Commercial lorebook — gold standard for keyword-triggered context | Subscription | Design reference |
| **VADER** | Sentiment analysis — fast compound scores for cross-checking LLM sentiment | Free | NLP cross-check layer for Phase 27 |
| **spaCy** | NER — entity extraction for validating LLM-reported affected districts/citizens | Free | Validation layer for Phase 27 |
| **Guardrails AI** | Semantic validation — bias detection, factual grounding | Free | Defense-in-depth for feedback loop |
| **BreadBasket** | AI-powered screenshot extraction for sports box scores (bread2basket.com) | ? | Game data extraction alternative |

---

## Academic References Worth Reading

- **James Ryan**, UC Santa Cruz — "Curating Simulated Storyworlds" (PhD dissertation, 2014-2018). Talk of the Town, Sheldon County, National Pastime. Closest academic precedent.
- **Park et al.** — "Generative Agents: Interactive Simulacra of Human Behavior" (Stanford, 2023). The Smallville paper.
- **Cemri et al.** — MAST framework (NeurIPS 2025). 1,600+ multi-agent failure traces, 14 failure modes.
- **Li et al.** — Persona drift measurement (ICML 2024). Significant drift within 8 turns.
- **Ensign et al.** — Predictive policing feedback loops (2018). The death spiral in real-world systems.
- **Cognition AI** — "Don't Build Multi-Agents" (2025). Single agent matching multi-agent performance.

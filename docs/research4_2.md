# Research 4.2 — James Ryan, "Curating Simulated Storyworlds" (PhD Dissertation)

**Source:** James Ryan, UC Santa Cruz, December 2018. 700+ pages. Full dissertation.
**Why this matters:** Ryan spent his entire PhD building what GodWorld is building — simulated towns covered by media. His systems are the closest academic precedent to the Bay Tribune. Every problem we've hit, he documented. Every solution he tried, we can learn from. This predates LLMs — his text generation used grammars, not neural models — but the architecture and the problems are identical.

---

## The Core Thesis

**The hard problem isn't simulating worlds. It's curating the stories that emerge from them.**

Ryan calls his approach **curationist emergent narrative**. The argument:

1. **Emergent narrative** = stories arise bottom-up from simulation, not top-down from an author. Dwarf Fortress is the exemplar. The pleasure is that these stories *actually happened* in the simulation — they feel like nonfiction, not fiction.

2. **The pain** = raw simulation output is "just one damn thing after another" (Michael Mateas). It has no story structure. Running a simulation is not the same as producing a narrative.

3. **The fix is NOT intervention** (drama managers, plot planners that force story structure) — because intervention kills the nonfiction pleasure. Events no longer *emerge*, they *spawn* according to an external policy.

4. **The fix IS curation** — instead of intervening in the simulation to *impose* story structure, you curate the simulation output to *identify* stories that authentically emerged. "The only difference between interventionist procedural narrative and curationist emergent narrative is that authored story patterns do not modulate the storyworld itself, but rather the recounting of that world."

The tagline: **"Overgenerate and curate."** The simulation overproduces material (most boring, some interesting). Curation identifies the interesting parts and constructs actual narrative artifacts from them.

---

## The Curationist Architecture

Ryan proposes a general architecture with these components:

```
SIMULATED STORYWORLD
    → The simulation engine. Contains characters and events.
    ▼
CHRONICLER
    → Records emergent phenomena as they transpire.
    → Produces a chronicle. May be computational, human, or hybrid.
    ▼
CHRONICLE
    → The accumulated record of what happened.
    → A bundle of data, not a story. Distributed across multiple records.
    ▼
STORY SIFTER  ← "The heart of the architecture"
    → Sifts the chronicle to excavate narratively potent material.
    → Uses "sifting patterns" (pattern-matching, like regex over event sequences)
    → Uses "sifting heuristics" (abstract policies about what is interesting)
    ▼
MATERIAL
    → The subset of chronicle data that has narrative potential.
    → The "stuff" of a story — not yet a story.
    ▼
NARRATIVIZER
    → Constructs an actual narrative artifact from the material.
    → Key distinction: a narrativizer RECOUNTS stories, it does not INVENT them.
    ▼
STORY
    → The completed narrative artifact (prose, audio, podcast, newspaper).
    ▼
MEDIA EXPERIENCE
    → The full-fledged media work where the story is mounted for human encounter.
```

### Three Variants

- **Feedforward Curation:** Stories flow out of the simulation into a separate media experience. The media doesn't affect the simulation. **This is what the Bay Tribune currently does.**
- **Feedback Curation:** The generated narrative feeds back INTO the simulation, affecting future emergence. Ryan coins "meta-emergent narrative" — stories about emergent stories becoming events in subsequent emergent stories. **This is our Phase 27.**
- **Mental Curation:** The player/reader does all the curation in their head. This is what Dwarf Fortress players do when they tell stories about their gameplay. No computational curation at all.

### GodWorld Mapping

| Ryan's Component | GodWorld Equivalent |
|---|---|
| Simulated Storyworld | 11-phase deterministic engine (675 citizens, 46 columns) |
| Chronicler | Engine output — Simulation_Ledger, tracker updates, ctx.summary |
| Chronicle | Ledger state, desk packets (buildDeskPackets.js), tracker data |
| Story Sifter | **THE GAP** — desk agents currently do sifting and narrativizing simultaneously, which is where fabrication happens |
| Material | Should be: curated briefings with the interesting stuff pre-identified |
| Narrativizer | Desk agents writing articles |
| Story | Individual articles and compiled edition |
| Media Experience | The Bay Tribune PDF, Drive, Discord |

**The critical insight for GodWorld: we need a Story Sifter layer.** Right now desk agents receive raw desk packets and are expected to simultaneously find what's interesting AND write about it. They skip the sifting and fabricate because nothing told them what matters. Phase 31 (canon-grounded briefings where Mags does the research) is exactly this — Mags becomes the story sifter, identifying the interesting material, and agents become pure narrativizers.

---

## The Pain of Emergent Narrative (Chapter 4)

Ryan catalogs every problem. Here are the ones we share:

### Problems We Have

**1. No Curation Layer (his #1 problem)**
Many projects conflate running a simulation with producing narrative. Ryan: "raw simulation is the stuff of emergent narrative, not the shape of emergent narrative." A football match is events, not a story — it becomes one only when someone curates it into a retelling. Without deliberate curation, it's "just one damn thing after another."

→ This is our central architecture problem. Engine runs, produces tracker changes, desk agents write articles. No intermediate layer sifts for what's interesting. Agents get raw data and are expected to curate AND tell simultaneously. They skip curation and default to safe topics or fabricate.

**2. Poor Curation / Poor Selection**
Even when curation occurs, it can go wrong through selecting the wrong material or too much. Ryan's key concept: **kernel events** (causally linked events that form the plot skeleton) vs. **satellite events** (optional color that could be removed without changing the story). Good curation identifies kernels first.

→ Our desk agents exhibit exactly the poor-selection problem. They select material haphazardly or fabricate because nothing distinguishes what matters. No concept of kernel vs. satellite events. Every article gets equal weight.

**3. Coarse Granularity**
The simulation models at the wrong level of detail — too abstract for stories. Population-level changes instead of individual character actions.

→ Strong match. The engine runs civic programs that shift population-level numbers. Rich demographic data per citizen, but the engine does NOT model individual character actions, decisions, or relationship changes that produce the causal event chains Ryan identifies as the skeleton of narrative. Agents have coarse data (enrollment went up 3%, Quintero plays for the Oaks) but no character-level event sequences — so they invent to fill the void.

**4. Boringness / Low Tellability**
A simulation's domain may lack ingredients for compelling stories. Ryan identifies three drivers of "story interestingness" from cognitive science: unexpected events, personal relatedness, and "absolute interests" (danger, death, power, money, betrayal). A simulation about routine is inherently less tellable.

→ Partial match. Oakland has the raw ingredients (money, power, civic conflict, career arcs). But the engine emphasizes stability over disruption. It produces data about employment rates, program enrollment, fund balances — not betrayals, broken promises, or reversals of fortune. Editions repeat because the engine's possibility space gravitates toward equilibrium rather than toward the disruptions that make stories worth telling.

**5. Voice Homogenization (variant of his "Poor Presentation")**
Even well-curated material fails with bad prose. Ryan's era had stilted grammar output. Our era has fluent but generic LLM output — every desk agent writes in the same earnest institutional register.

### What We Got Right

**Mounting (his "Failure to Mount" problem) — we're actually strong here.** Ryan criticizes academic projects that generate prose and print it in a paper without completing the full media pipeline. The Bay Tribune IS a mounted media experience — newspaper with sections, photos, PDF layout, Drive distribution, Discord publication. Ryan would approve.

**The newspaper format is an engineering advantage.** Ryan might call it the best possible mounting medium for emergent narrative — errors become corrections, inconsistencies become conflicting accounts, and the journalistic frame ("we report what we know, sources may be unreliable") absorbs AI failures that would break other narrative forms.

---

## Talk of the Town — The Simulation (Chapter 9)

Ryan's small-town simulation. The closest system to GodWorld's engine.

### Character Modeling

Each character has:
- **Name** from census probability distributions by birth year (era-appropriate)
- **Appearance**: 24 heritable facial attributes
- **Personality**: Big Five model (openness, conscientiousness, extroversion, agreeableness, neuroticism), each -1.0 to 1.0. Inherited from parents with mutation. Static over lifetime.
- **Sex, sexuality** (probabilistic attraction), **fertility**, **memory** (float that decays)

### Social Simulation

Two nonreciprocal continuous values per character pair:
- **Charge** (platonic affinity) — evolves based on personality compatibility. Modulated by extroversion, agreeableness, sex, age, occupational status differences.
- **Spark** (romantic affinity) — evolves based on romantic attraction. Different formula from charge. Spark increments decay but spark itself persists — creating persistent romantic obsessions.

Relationships reconstruct from thresholds: acquaintance (default), friend (high charge), enemy (low charge), best friend (highest), worst enemy (lowest), love interest (highest spark).

**Key mechanic:** Character routines drive who meets who. Adults decide each half-day: work, home, or go out. Going out = visit a person (weighted by affinity, family, proximity) or visit a business (weighted by service utility — bakery by day, bar by night). This creates emergent neighborhoods around "third places." The spatial proximity + personality compatibility + interaction frequency creates feedback loops that generate complex social dynamics from simple rules.

### Character Knowledge System

This is the system's hallmark. Each character maintains a network of **mental models** — one per entity they know about. Each mental model contains **belief facets** (40 types) with: value, predecessor belief, evidence list, strength, and accuracy.

**12 types of evidence across 5 categories:**
- Reflection (self-observation), Observation (seeing others), Examination (reading gravestones/rings)
- Transference (unconsciously mixing up similar people), Confabulation (inventing beliefs from population averages), Lies (intentionally false)
- Statement (telling someone), Eavesdropping (overhearing)
- Declaration (retelling strengthens belief — a character who repeats a lie may come to believe it)
- Mutation (beliefs warp over time — "black hair" mutates to "brown" with 75% probability), Forgetting

**Knowledge propagation:** During social interactions, characters exchange beliefs about shared subjects. Subjects are ranked by salience. Number of subjects exchanged depends on relationship strength. Lies triggered probabilistically by negative affinity. Belief revision handles contradictions: stronger evidence displaces weaker.

### Emergent Phenomena — What Actually Happened

**Bar-Crossed Lovers.** Two families owned rival bars. Personality traits are inherited, creating family archetypes. The two families had incompatible personalities, generating multi-generational enmity. The scion of one fell in love with the daughter of the other. Never programmed. Emerged from: business competition + personality inheritance + personality-driven enmity + romantic attraction operating independently of platonic affinity.

**The Recluse with Green Hair.** An introverted hermit nobody had met was widely believed to have green hair. A popular child confabulated the belief (invented it from nothing), then it propagated through the school (all children 5-18 congregate daily — the knowledge nexus). Popular kids, with the most social interactions, drove misinformation.

**The Night Beat.** An extroverted/agreeable police officer paired with an introverted/disagreeable one on night shift. He considered her his best friend (time together); she considered him her worst enemy. Simultaneously, she was his love interest — romantic spark operates on different factors than platonic charge. Nonreciprocal feelings are the norm.

**The core lesson:** Emergent phenomena arise from feedback loops between subsystems. Simple mechanics compound into scenarios that feel authored. The simulation overproduces narratively interesting material.

---

## Hennepin — The Most Evolved System (Chapter 11)

Ryan's final and most sophisticated simulation. The character modeling depth here is what "fully realized citizens" looks like.

### Character Modeling: 50 Personality Traits

Adopted from Dwarf Fortress (replaced Big Five as too low-dimensional for narrative). Scale: -50 to 50 each. Only extreme values matter (~5 per character). Includes: `ambition`, `anger propensity`, `bravery`, `cruelty`, `curious`, `emotionally obsessive`, `envy propensity`, `greed`, `gregariousness`, `hate propensity`, `lust propensity`, `pride`, `trust`, `vengeful`, `violent`, and 35 more.

Heritable with noise. Makes a 50-trait profile behave like "pick five defining traits from eighty options."

### Character Modeling: 34 Values

Also from Dwarf Fortress. Scale: -50 to 50. Includes: `artwork`, `commerce`, `competition`, `cooperation`, `craftsmanship`, `cunning`, `family`, `friendship`, `hard work`, `independence`, `knowledge`, `law`, `loyalty`, `power`, `romance`, `tradition`, `truth`, and 17 more.

**Values change over time** via Labov's "incrementation model":
- Children inherit parents' values at birth
- During teens/twenties, values shift under influence of: (a) historical era "zeitgeist anchors" — authored distributions that shift across simulated American history (e.g., `decorum` declining, `diversity` rising), and (b) peer persuasion — characters perform actions like `extol-value` or `denounce-value` that shift listeners' values
- By early thirties, values freeze and pass to the next generation

Values drive aspirations. High `law` + `power` → aspires to become police officer.

### The Action System — Everything Is an Action

This is the fundamental architectural difference from GodWorld. In Hennepin, **every life event is a concrete, discrete, authored action** with:

- **Preconditions**: Python lambdas gating the action (e.g., `insulter.personality.cruelty >= 25`)
- **Role definitions**: who participates (initiator, recipient, bystander, hearer)
- **Effect definitions**: conditional production rules that change the world (update charge/spark, queue new actions, create artifacts, move characters)
- **Salience definitions**: how interesting this is to whom (being insulted = salience 750; being the insulter = salience 200)
- **Cooldown**: timesteps until repeatable

**Action selection uses satisficing** (Herbert Simon): randomly select a character, randomly target an action, check preconditions, assemble bindings, execute if all pass. Not optimization — randomness + constraints.

**Action queues create emergent storylines.** Effects of one action queue future actions with urgency levels, location constraints, expiration, and kill codes. Example chain: `lay-foundation` → queues `construct-frame`. Fight chain: `start-fight` → queues `fight-back` (violent characters), `flee` (cowardly), or `talk-it-out` (assertive) — kill codes ensure only the appropriate response fires.

**Causal bookkeeping** records contingency relations between actions (causes/caused lists), forming directed acyclic graphs — **emergent contingency structures** — that story sifters can traverse to extract coherent narratives.

### Character Internal Worlds

Characters take internal actions: `admire-the-sunset`, `contemplate-serial-mistreatment`, `cringe-over-past-action`, `fantasize-about-life-with-love-interest`, `obsess-over-love-interest`, `envy-more-successful-sibling`. These are modeled as regular actions with preconditions on personality/knowledge. The inner life is just another category of action.

### Character Knowledge

Structured as **knols** (units of knowledge), each pertaining to a specific past action. Each knol tracks: the action it concerns, its sources, tags (e.g., `embarrassing`), and salience (decays over time). Knowledge propagates through social actions like gossip. Characters build probability tables of where other characters tend to be.

Simplified from Talk of the Town — no belief fallibility (no misremembering). Deliberate tradeoff: easier to implement, loses the "green hair" type emergent misinformation.

### Artifacts

Physical objects produced by actions. Have: description, location, durability (decays), detectability, intrigue, inscriptions (actions encoded into the object), and transmissions (knowledge that transfers when examined). Artifacts serve as knowledge-transmission vectors across time and space. A gravestone carries the life history of the deceased — anyone who reads it updates their mental model.

### Emergent Storyline Example

A husband-wife pair (Julius and Marie Eckert), both high `cruelty`, independently ridiculed different targets for years. Both targets performed `contemplate-serial-mistreatment`. Both had high enough `vengeful` to trigger `hatch-revenge-scheme`. Both enacted revenge on the same night, both performing `set-fire-to` at the Eckert farmhouse while neither noticed the other. The building burned.

This emerged from: personality traits (cruelty, vengefulness) → action preconditions → queued actions → convergent timing. The improbable interlocking was not designed. Every step is traceable through the causal bookkeeping.

---

## Bad News — A Newspaper About a Simulated Town (Chapter 10)

**This is the most directly relevant chapter.** Bad News is literally someone building what we're building, six years before us with different technology.

### What It Is

A live installation built on Talk of the Town. A town resident has died alone. A player (the "mortician's assistant") must identify the deceased, find next of kin, and deliver the death notification. The town and its entire history are procedurally generated fresh for each performance.

### Three Roles = Three Architecture Layers

**The Wizard** (Ryan himself) — sits in a separate room with a Python console connected to the live simulation. Queries character histories, family trees, work records, romantic entanglements in real time. **His job is STORY SIFTING**: finding narratively potent material buried in the data. Before each performance, identifies 3-5 "emergent scenarios" connected to the deceased. Feeds material to the actor via private chat.

**The Actor** (Ben Samuel) — plays every character in the town. Has a hidden screen with each character's personality, appearance, beliefs, job history, family. **His job is NARRATIVIZING**: turning raw data into improvised conversational storytelling. Core constraint: **augment but do not contradict the simulation.**

**The Player** — navigates the town, talks to characters, takes notes.

### How Curation Works (Example)

The deceased is Ronald Zeise, a young deli cashier. The wizard's process:
1. Query deceased's job history — was a cook at "Zilencio" restaurant (1973-1975), then cashier at a deli.
2. Explore Zilencio — discovers it operated for 106 years, a multigenerational family business. A descendant, Douglas Salva, inherited it and drove it into the ground through overspending.
3. Package this as a narrative nugget and relay to the actor: a family restaurant saga, a character's fall from grace.

During gameplay, the player meets Douglas Salva (played by the actor, briefed on the backstory). The actor improvises a deeply personal conversation about business failure, family shame, ambition beyond one's station. The player proposes a plan to "redeem" Salva — which also serves as a cover story to identify the next of kin.

**None of the emotional content was in the simulation.** The simulation produced the facts (restaurant dates, owner names). The wizard sifted the potent material. The actor turned it into a story. The player co-authored through improvisation.

### What Worked

- Stories feel *discovered*, not *delivered*
- The simulation data feels like nonfiction — players report feeling they truly visited the town
- "Small miracles" — improbable serendipity between player actions and simulation data that feels scripted but is genuinely emergent
- Players were reduced to tears over "mere bundles of data"

### What Failed

**Curation was entirely human-powered.** The simulation produces material but has no recognition of its own narrative significance. Without the wizard and actor, there are "no computational mechanisms to fall back on."

Ryan attempted automatic story sifting but found it "essentially impossible" due to deficits in Talk of the Town's simulation — it doesn't model causation richly enough for a computer to recognize what's interesting.

**The human cover-up problem:** When humans are in the loop, simulation errors never surface. The wizard and actor fill modeling gaps and inject causal links that aren't there. This makes it hard to evaluate the simulation itself.

→ **GodWorld parallel:** Mags (the editor) currently fills the wizard role when writing canon-grounded briefings. Desk agents fill the actor role (narrativize from material). When Mags doesn't sift, agents fabricate — exactly Bad News without the wizard.

### "Augment But Do Not Contradict"

The actor's core rule: you can add color, emotion, dialogue, personality. You CANNOT contradict what the simulation says happened. If the simulation says Douglas Salva owned the restaurant from 1968-1975, that's canonical. The actor can make Salva remorseful, angry, or nostalgic — but the dates, the ownership, the closure are facts.

→ This is exactly the canon rule we use. Bay-tribune is the canon. Agents can write around the data but cannot contradict it. Mara audits for exactly these contradictions.

---

## Sheldon County — Automated Podcast from Simulation (Chapter 12)

Ryan's attempt to fully automate what was human-powered in Bad News. **A procedural podcast about life in a simulated county.** Our Phase 30 (Tribune Audio / Voicebox).

### The Pipeline

1. **Storyworld generation** — A Hennepin simulation instance runs to completion, producing a chronicle of millions of character actions
2. **Story sifting via nuggets** — Authored "sifting patterns" (Python classes) match against specific action sequences. Example: `ArsonRevenge` pattern matches when `set-fire` has a causal ancestor that is `hatch-revenge-scheme` with the same initiator. Extracts structured data into a **nugget** with **narration moves** (high-level goals like `recount-arson-revenge`)
3. **Episode spaces** — Context-free grammars with precondition tags (Python code evaluated against the storyworld) and effect tags. Grammar paths are gated by what's actually true in the simulation. If a precondition fails, it backtracks.
4. **Script generation** — Grammar traversal produces episode scripts. Each script bundles: title proposals, narration proposals (ideas for future episodes), and **bible updates** (recording what's been told, for cross-episode consistency)
5. **Audio** — Amazon Polly with SSML markup. "Narrative alibis" — framed as robot actors attempting to portray human life, so mechanical voices are diegetically correct.

### The "Show Bible" Concept

A record of what has already been told across episodes, referenced by precondition tags to maintain consistency. If Episode 3 mentioned that Douglas owns the restaurant, Episode 7's grammar checks the bible before mentioning it again — avoiding contradiction.

→ **GodWorld parallel:** This is exactly what bay-tribune Supermemory is. The canon archive that Mara checks against. The "show bible" is our published archive.

### Sifting Patterns

Each sifting pattern is a Python class that:
- Defines what action sequence to look for (e.g., `mistreatment → contemplation → revenge scheme → arson`)
- Extracts structured data when a match is found (who, what, where, when, why)
- Produces a nugget with narration moves
- Assigns interestingness scores

This is the computational story sifter that was missing from Bad News. Instead of a human wizard querying the simulation live, authored patterns automatically identify interesting material.

→ **GodWorld connection:** We could build sifting patterns for our engine output. Examples: "citizen lost job AND has family AND lives in gentrifying neighborhood" → displacement story. "Business opened by former employee of competitor" → rivalry story. "Council member voted against program that benefits their own neighborhood" → conflict-of-interest story. The sifting patterns would run on tracker data after each cycle, producing nuggets that become the basis for desk agent briefings.

---

## The Depth Gap — GodWorld vs. Hennepin

| Dimension | GodWorld | Hennepin |
|-----------|----------|---------|
| Citizens | 675 | ~200-500 per county |
| Personality | Biography text (unstructured) | 50 numeric traits (-50 to 50) |
| Values | Not modeled | 34 numeric values, change over lifetime |
| Aspirations | Not modeled | Procedural with trigger/fulfillment conditions |
| Actions | Phase-level column updates | Discrete authored actions with preconditions, effects, salience, causal bookkeeping |
| Knowledge | Not modeled (citizens don't "know" things) | Knols with salience, sources, tags, decay. Characters can be wrong. |
| Internal world | Not modeled | Internal actions (contemplate, fantasize, obsess, envy) |
| Relationships | SocialBonds column (unstructured) | Charge + Spark per pair, nonreciprocal, threshold-based discrete labels |
| Artifacts | Not modeled | Physical objects with inscriptions, transmissions, durability |
| Causality | Not tracked | Full DAG of action contingencies |
| Time resolution | Monthly cycles | Half-day timesteps (with level-of-detail modulation) |

**The fundamental difference:** GodWorld processes citizens through phases that update columns. Hennepin characters take discrete, personality-driven actions that contingently unlock further actions, forming traceable causal chains. GodWorld knows WHAT happened to a citizen. Hennepin knows WHY.

**This gap is not fatal.** GodWorld has things Hennepin doesn't — an actual media pipeline, published editions, a canon archive, visual output, audio plans, a live audience. Ryan never got past academic installations. The depth gap in character modeling is a long-term improvement path, not a blocker.

---

## What We Should Take From This

### Immediately Actionable

1. **Build the Story Sifter layer.** This is Phase 31. Mags does the sifting (searches world-data + bay-tribune for interesting material), produces curated briefings, agents narrativize from them. Ryan's entire dissertation says this is the most important and most neglected component.

2. **"Augment but do not contradict."** Formalize this as the desk agent rule. Agents can add voice, emotion, narrative structure. They cannot contradict what the simulation produced. The sifted material is the factual floor.

3. **Sifting patterns.** Even simple ones. After each cycle, run patterns against the tracker output: who lost a job? Who moved? Which program failed? Which neighborhood's sentiment shifted most? Produce structured nuggets that go into desk packets. This replaces "here's all the data, figure it out" with "here are the 5 most interesting things that happened."

### Medium-Term

4. **Show bible = bay-tribune.** Formalize this. Before writing, search bay-tribune for what's already been said about each citizen/topic. Prevent contradiction. This is Phase 31 + Mara's audit working together.

5. **Feedback curation = Phase 27.** Ryan identifies this as the unexplored frontier — "meta-emergent narrative" where stories about the simulation feed back into the simulation. The dual-output pattern from PDF #3 (research4_1.md) is the implementation mechanism.

6. **Kernel vs. satellite events.** Teach the sifting layer to distinguish between events that change the causal trajectory of a citizen's life (kernel) vs. routine updates (satellite). Lead with kernels. Satellites are color.

### Long-Term Inspiration

7. **Character action system.** The biggest depth gap. Citizens that take discrete personality-driven actions with traceable causal chains would give the sifter real material to work with. This is Phase 24 (Citizen Life Engine) territory — Ryan's work provides the design patterns.

8. **Character knowledge.** Citizens knowing things about each other — and sometimes being wrong — creates emergent misinformation, gossip, reputation. The "green hair" story is more interesting than any planned plot. This is beyond our current scope but it's where the engine could go.

9. **Personality traits from Dwarf Fortress.** Ryan switched from Big Five (too low-dimensional for narrative) to Dwarf Fortress's 50-trait system. Our Biography column has unstructured personality descriptions. Converting those to numeric traits that drive behavior would close the gap between "description" and "simulation."

---

## Key Quotes

> "At its heart, this dissertation is an art manifesto that promulgates a fiercely emergentist approach to procedural narrative."

> "Instead of treating the raw material of simulation as a story, in curationism that material is curated to construct an actual narrative artifact that is then mounted in a full-fledged media experience."

> "The only difference between interventionist procedural narrative and curationist emergent narrative is that authored story patterns do not modulate the storyworld itself, but rather the recounting of that world."

> "There is a ubiquitous tendency to misconstrue the raw transpiring of a simulation as being a narrative artifact, but such material will almost always lack story structure."

> "Without humans there are no computational mechanisms to fall back on." — Ben Samuel on Bad News

> "Overgenerate and curate."

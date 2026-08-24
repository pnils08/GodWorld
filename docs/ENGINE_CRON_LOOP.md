---
title: The engine/cron loop — who does the cheap work, who does the expensive work, and the edge that closes it
created: 2026-08-21
updated: 2026-08-23
type: doctrine
tags: [doctrine, engine, crons, bonds, ledgers, always-consult]
pointers:
  - "[[SIM_DOCTRINE]] — what makes GodWorld a sim, not a data system; consult alongside this"
  - "[[plans/2026-08-21-ctx-rng-attractor-collapse]] — engine.128, the defect that exposed the missing edge"
  - "[[engine/ENGINE_COUPLING_MAP]] — how an event becomes a dial; the mechanical layer under this doctrine"
  - "[[index]] — registered"
---

# The engine/cron loop (Mike-direct, 2026-08-21)

Captured the night it was articulated, so no future build has to rediscover it.
Stated while diagnosing why 104 cycles of published canon had produced zero
relationship bonds. **Consult before designing any engine↔cron mechanic.**

The short version: **everything in the engine is a loop.** Anything that only
runs one direction is half-built, and the missing half is almost always the
return edge from the expensive layer back to the cheap one.

---

## 1. The division of labor

**The engine does the cheap work for free.** It establishes the obvious:
this is your family, this is your household, these are your neighbors. Then it
throws a lottery in, because life is partly random. No tokens, no judgment, no
model call. Deterministic and nearly free.

**This is a feature, not a weakness.** A proximity lattice is the correct base
layer precisely *because* it is cheap. Do not read "73% of bonds are `neighbor`"
as a failure of the engine — the engine was asked for obvious-and-free and it
delivered obvious-and-free. The error is expecting it to have produced anything
else.

**The crons do the expensive work.** They hold judgment, voice, and narrative.
They magnify. A bond the engine recorded as `neighbor / intensity 4` becomes,
in a cron's hands, a storyline — a drift, a grudge, a debt. Civic bonds play out
in how the articles cover them. Warren Ashford is an ass, and every edition
makes that known; that characterisation lives in the cron layer, not in a
column.

**The ledgers are persistence, not story.** Most of the ledgers are the world's
state written down cycle by cycle — where citizens live, what they hold, what
changed. They record *where the world is*, not *what it means*. Asking a ledger
to carry meaning is a category error; asking it to carry state the crons can act
on is exactly right.

---

## 2. The loop

```
  ENGINE ──────────────▶ CRON ──────────────▶ CANON
   cheap, deterministic   expensive, judgment   editions, wiki pages
   family/household/      magnifies a bond      the published record
   neighbors + lottery    into a storyline
     ▲                                              │
     └──────────────────────────────────────────────┘
                    the return edge
             (MISSING as of 2026-08-21)
```

**Edge 1 — engine → cron: BUILT and working.** Crons have wiki pages. They see
their world's data. `lib/wakePerception.js:155` renders bonds into cron context:
`professional` → "someone you know through work", `rivalry` → "someone you butt
heads with". A cron knows who its people are before it writes a word. When two
crons talk one-on-one, both know they have history, because both read the same
ledger.

**Edge 2 — cron → canon: BUILT.** Editions and cron output publish the
magnification.

**Edge 3 — canon → engine: MISSING.** This is the whole finding. The
magnification evaporates at publication. Nothing carries a storyline back into
the state the engine and the next cron will read.

---

## 3. The crons are the detector

The crons report their own gaps, in character, without being asked. Two live
cases, both of which surfaced this problem before any script did:

- **Deacon Seymour ↔ Mike Paulson.** Seymour carries a negative relationship
  with Paulson grounded in *not having had time with him*. He knows a bond
  should exist and feels its absence. Players and Seymour are talking about it.
- **Benji Dillon ↔ Vinnie Keane.** Benji's cron is preoccupied with how he and
  Vinnie drifted apart — a full relational arc between two of the most-written
  citizens in the world.

Neither pair has a single row in `Relationship_Bonds`.

**This is the load-bearing observation: the sim works, and the crons tell us
what is wrong with it.** A cron expressing strain over a relationship the ledger
does not contain is the system filing a bug report in its own voice. Treat that
signal as a first-class diagnostic input, not as flavour. It found this defect
before the engineering did.

Corollary: a bond-shaped complaint from a cron is *evidence a bond belongs
there*. The detector doubles as the candidate generator.

---

## 4. Crons emit state, not just existence

The crons do not merely assert that a relationship exists. They report its
**movement**:

| cron signal | ledger meaning |
|---|---|
| Benji: "we drifted apart" | intensity decaying over cycles |
| Deacon: strain from absence | a negative bond that ought to exist |
| Ashford across many editions | a bond hardening cycle over cycle |

This is what answers the standing complaint that **bonds should grow or
deteriorate.** The seeder cannot do that — it is a one-shot lattice behind a
`>= 500` count cap (`phase05-citizens/seedRelationBondsv1.js:60`), and once the
graph crossed 500 rows it stopped acting entirely. Growth and decay are not the
seeder's job and never will be.

**The crons are the movement driver.** They already generate the deltas every
day. There is simply nowhere to write them.

---

## 4.5 The world runs OFF the engine, not IN it (Mike-direct, 2026-08-21)

Stated as the ruling on the bond-schema gaps, and it generalises past them.

The engine is the **substrate the world runs on**. It is not the container the
world lives in. Those are different jobs, and conflating them is what produces
the reflex to grow a column every time canon records something the ledger cannot
hold.

Applied to the three gaps in the canon→bond mint
([[plans/2026-08-21-published-canon-bond-mint]] §2):

- **Citizen ↔ institution** bonds, **3+ party** bonds, and the **nature** of a
  bond (a legally-forced recusal, a bipartisan marriage under deadline) are the
  world. They do **not** need to become engine columns to be real.
- The engine carries what it needs to **drive citizen life** cycle by cycle —
  the cheap, obvious, causal layer. Everything richer is legitimately held by
  canon and the crons, which is where it already lives and already works.
- So the default answer to "should the schema grow to hold this?" is **no**.
  Grow the engine only when the engine itself must *act* on the thing. If the
  crons are the only consumer, the crons are the right home.

**Test to apply:** does the engine need this to compute the next cycle? If yes,
it belongs in a ledger. If it only needs to be *known* — by a cron, a desk, a
reader — it belongs in the world, and the engine only needs a pointer to it, if
that.

This is why the proximity lattice is not embarrassing and why 379 married
citizens with no SpouseId is correct (see auto-memory
`feedback_empty-relational-field-is-design-not-defect`). The engine is not
trying to be a complete model of Oakland. It is trying to be the cheapest thing
that keeps Oakland moving.

## 4.6 Canon-source scope: not every memory space is canon (Mike-direct, 2026-08-21)

Supermemory holds both **curated canon** and **working brains**, and they must
not be searched as one corpus.

- **Canon sources** — `bay-tribune` (editions, dispatches, interviews),
  `wd-citizens` (citizen cards, appearance indexes), `cp-POP-#####` (per-citizen
  PRESS / CONVO / NIGHT / tension sheets — "the raw bonds instrument").
- **NOT a canon source** — `mags`. That is Mags's editorial brain: framing,
  working notes, EIC reasoning. It is not curated as canon and must be
  **excluded from canon retrieval**. It is not deleted and not deprecated — it
  is simply out of scope for anything that treats a result as a world fact.

**Why it matters:** a canon→engine intake that reads an uncurated working brain
will mint reasoning *about* the world as if it were the world. The engine cannot
tell the difference, and the next cron speaks from whatever landed.

**Apply:** any canon retrieval — the bond intake, entity minting, fact-checking a
draft — declares its source spaces explicitly and excludes uncurated ones. Scope
the search; do not filter the results afterwards.

## 4.7 Media reports the loop — it does not author it (Mike-direct, 2026-08-23)

Stated across the C104 week review, refined twice in the same session as the
first classification proved too strict against live cases. This is the final
form; the earlier "three provenance classes" draft of this section is
superseded.

**Articles are secondary to cron wakes and interviews.** Media is not the sim —
it is the mechanism reporting on it. The crons literally tell us what's wrong
with the logic in their world; *that* is the storyline. An article is a separate
layer: street-level delivery of what already happened. Storylines are born from
wakes and interviews, not from articles — an interview that happened opens a
thread even if no article publishes (Saturday's Storyline_Ledger reads arc
seeds, and it must stay that way).

**The worst contamination is manufactured citizen reaction:** a citizen made to
*speak* words no interview wake produced. "Putting words in Vinnie's mouth like
he doesn't exist is the worst contamination there is."

**What a gate may fail an article for — this list is exhaustive:**

1. **Fabricated speech** — a quote no interview record produced.
2. **Direct contradiction of recorded state** — the Temescal health center
   called a transit project; a stat that conflicts with the `As_Roster` line;
   a citizen placed in two places at the same recorded moment.
3. **Fourth-wall leakage** — "simulation" and its kin. The rejected word class
   is the frame-break, not the trade vocabulary.

**What a gate may never fail an article for:**

- **Presence and scenes.** "I don't care if they interview Keane on the moon —
  the crons run their world, not me." Keane can go to a bar. Aitken's one
  logged sighting this cycle does not exhaust his week — the tracked data is
  the 0.25% subset, and absence in a slice is NEVER evidence of falsity
  (auto-memory `feedback_empty-relational-field-is-design-not-defect`, applied
  to the media layer). Killing the club scene killed exactly the creativity a
  nightlife beat exists for.
- **Data citation and trade vocabulary.** All cities track data; in-world the
  "engine" reads as civic data systems (Civis Systems is canonically exactly
  this). "Packet" and "cycle" are journalist trade words. Civic, business,
  transit and crime reporters *need* to quote the tracked data — that is the
  beat. Banning data language kills half the journalism.

**Quality note, not a gate:** reciting the engine slice back is *lazy*, not
contamination — the slice is already canon in the world summary, so a color
journalist echoing it adds nothing (see auto-memory
`feedback_canon-is-color-not-data-echo`). Fact desks quote the data; color
desks earn their keep with what the slice does not contain. Handle echo as an
editorial quality signal, never a rejection.

**Rhea's verdicts are slice-scoped.** She checks a draft against the slice she
is handed, and she does that job correctly — she has no idea what the gates
built around her are. Her "invented" means "not in my slice." Enforcing that as
world-truth is the builder's error, in two directions: (a) never fail on
absence; (b) widen her slice where the truth exists but she cannot see it —
`As_Roster` carries current season stat lines (Mike-direct 2026-07-28) and
belongs in the sports ground truth, so a flipped digit surfaces as a
correction instead of the whole stat line being unjudgeable.

**On gates generally:** the only true gate is Mike. Rhea and the shape gates
are his preference instrumented, not a second editor. Where they zero real
reporting on trivia (a missing terminal question mark), the instrument is
over-tuned. Repair the draft; don't kill the wake. The C104 lesson: the best
articles of the week were the gated ones.

---

## 5. What this implies for any build

1. **Give the engine the obvious and the free.** Never spend a model call on
   something proximity and a dice roll can establish.
2. **Give the crons judgment, voice and magnification.** That is what the money
   buys.
3. **Always ask where the return edge is.** If the expensive layer produces
   something the cheap layer will never see, the loop is open and the work is
   being thrown away on every cycle.
4. **Read cron output as diagnostics.** When a cron acts on a relationship,
   preference, grudge or history the ledgers do not contain, that is a gap
   report — the most reliable one available, because it comes from the layer
   that actually consumes the data.
5. **Ledgers persist state; crons carry meaning.** Do not push narrative into a
   column, and do not expect a column to produce narrative.

---

## 6. Live application

The first build against this doctrine is the canon→bond intake: turning what the
crons and editions already say about relationships into bond rows with an
`origin` of published canon and an Edition pointer, on two feeds —

- **live** — cron output, daily and ongoing, closing the loop going forward;
- **backfill** — 104 cycles of editions, one expensive pass, setting the Tier
  1/2 graph.

Live first: backfill is the bigger prize but it can run at any time, whereas the
live edge is what stops the next 104 cycles from repeating the hole.

Gated behind the `engine.128` tail (BondId uniqueness guard + targeted restore
of the 53 colliding IDs) — canon bonds must not land in a table whose primary
key still collides. Codex's four hand-verified pairs are the **acceptance test**
for the intake, not the deliverable: if the intake is right, Deacon↔Paulson and
Benji↔Vinnie mint themselves out of what the crons are already saying, and no
pair is ever hand-curated again.

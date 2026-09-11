# Inactivity is a regression — the sim's one-way ratchet

**Status:** direction captured, mechanism verified, cuts not yet designed
**Filed:** S443 (2026-09-10), engine-sheet
**Rows:** engine.197 (dials hard-fail), engine.193 (generators make no depression), engine.194 (sports record channel quiet)
**Doctrine:** `docs/SIM_DOCTRINE.md` §15 (a gate that can't fire is a trick), §16 (drift over static backfill)

---

## The direction (builder, S443)

Captured as given, because it is the design ruling this plan exists to serve:

> Inactivity itself is a regression. Almost everything about this sim is getting
> attention — attention drives your success. The 30% wake is low; 70% of the sim
> has no chance to advance unless, for some almost impossible scenario, they get
> six media mentions. 70% of the sim is locked out of their cron reacting.
>
> The crons are the biggest ignored element. They are alive and writing back to
> the sheets all day. How is it all positive and not generating variety?
>
> Some of this may be that positive dials produce positive events — if a citizen
> is positive that tends to be who they are. So there is a gap of how good people
> experience bad events.
>
> I don't have the golden answer here that makes life happen to these citizens,
> and crons and not just an event machine, and crons only impacting the sim via
> media.

Bond systems likely feed this too. Mixture of engine events and cron activity.

**Every claim above checked out against code and live data. The 70% figure is
exact.** What follows is the mechanism.

---

## The closed loop, verified

Six links. Each one is fine alone; together they form a ratchet that only turns
one way.

**1. Three of eight dials have no downward vocabulary at all.**
`utilities/citizenDialMap.js` DIAL_MAP, tallied whole:

| dial | positive | negative |
|---|---|---|
| drive | +62 (18 entries) | −7 (3) |
| **sociability** | **+43 (14)** | **none** |
| warmth | +29 (8) | −5 (3) |
| **openness** | **+33 (13)** | **none** |
| composure | +47 (21) | −64 (20) |
| integrity | +12 (3) | −24 (3) |
| family | +34 (6) | −8 (1) |
| **outabout** | **+10 (8)** | **none** |

**2. The designed negative pole cannot reach them.** engine.176 introduced
pressure tags as the negative pole (`citizenDialMap.js:138-140`): Friction
`{composure:-2}`, Strain `{composure:-1}`, Stumble `{composure:-2, drive:-1}`.
They move **composure and drive only**.

**3. The other negative pole — cron affect — also cannot reach them.** The nine
affect tags are documented in `lib/reflectionClassifier.js:82` as "the
negative-pole mechanism". Five are negative (Frustrated, Irritable, Anxious,
Angry, Resentful), and every one of them moves **composure**, two also warmth.
**Not one affect tag touches sociability, openness, outabout, integrity or
family.**

The consequence, run through `nudgesForReflection_`:

```
Community + Angry   ->  { sociability: +4, warmth: 0, composure: -4 }
```

**A citizen can be furious at their own community and the engine makes them more
sociable for it.** The anger is charged entirely to composure. This is the
builder's "gap of how good people experience bad events", located exactly: the
event tag owns the identity dials and is unconditionally positive; the affect
tag owns only the mood.

**4. Event frequency is multiplied by the dials that can only rise.**
`phase05-citizens/generateCitizensEvents.js:2225`:

```js
chance *= (dmAct.drive + dmAct.outabout + dmAct.sociability) / 3;   // 0.5 .. 1.5
```

Shaped citizens get up to 3× the event rate of neutral ones. More events means
more upward tags means more events.

**5. The wake pool is a hard gate at deviation ≥ 60.**
`lib/wakePerception.js:26` `SHAPED_MIN = 60`, enforced at `:401`
(`if (!cur || dials.deviation(cur) < shapedMin) continue;`). Deviation is total
distance from neutral across all eight dials, so it can only be earned by dial
movement — which is almost entirely upward movement.

**6. Therefore the citizen loop is a closed aristocracy.** Measured on bench 0908
at C131, 1067 rows with a parsed DialState:

- wake-eligible (deviation ≥ 60): **32.7%** — the builder's 70% locked out, exact
- pins at 100: 32 across 30 citizens (sociability 27, drive 4, family 1)
- pins at 0: **none**
- population means, every dial at or above neutral: sociability **71.3**
  (116 citizens ≥ 90), composure 59.8, drive 58.7, openness 57.7, family 56.3,
  outabout 55.8, warmth 52.7, integrity 50.5
- **across 1067 citizens × 8 dials = 8536 values, ZERO sit at or below 10**

Nobody in this city is reclusive, closed off, or a shut-in, and under the current
vocabulary nobody can become one.

**The crons are not ignored by accident.** They are alive, they write back every
day, and their emotional content is real — it simply has nowhere to land except
composure. That is why the output is all positive and has no variety: the loop
strips the feeling out of the reflection and keeps the fact.

### One finding inside the finding

Composure has the best negative vocabulary in the table (net −17) and still lands
at a population mean of **59.8**, because `DEFAULT_AMBIENT {composure:+1}` fires on
every otherwise-unmapped event and outruns the entire negative tag set. A small
constant applied every cycle beats a large value applied rarely — the same
always-on shape engine.188 cut out of the sentiment vocabulary the same session.
Four systems, one disease.

---

## Why "inactivity is a regression" is the right cut

It breaks the ratchet at the only link that needs no new invention:

- **It needs no new event vocabulary.** Absence is already a measurable signal —
  cycles since last event, cycles since last wake, cycles since last bond touch.
  Nothing has to be authored per-tag.
- **It reaches the three monotonic dials**, which neither pressure tags nor affect
  tags can reach, without giving those dials a contrived negative event.
- **It un-freezes the 67%.** A neglected citizen accumulates *negative* deviation,
  crosses the 60 gate from below, and enters the wake pool as a shaped-downward
  citizen. The pool stops being a list of the city's happiest people.
- **It is self-balancing.** Attention pulls up, neglect pulls down, and the
  0.5–1.5 event multiplier becomes a real trade instead of a one-way subsidy.
- **It matches the world.** Someone who stops going out becomes someone who
  doesn't go out. That is not cynicism imported from real-world Oakland — it is
  how a life works, and §16 already ruled drift over static backfill.

---

## Open questions — builder's, not mechanism

1. **Rate and shape.** Linear decay per idle cycle, or accelerating after a
   threshold? Toward 50, or past it toward the low pole? A hermit should be able
   to exist, which argues for past-50.
2. ~~Which dials decay on inactivity.~~ **RULED (builder, S443): all of them.**
   "Why wouldn't they all decay?" There is no principled reason to exempt any —
   drive without work, family without household contact, warmth without people,
   integrity without being tested. The three-dial framing was timidity, not
   design.
3. **Floor.** engine.176 chose desensitization (`PRESSURE_ADAPT`) so chronic
   pressure never grinds a dial to zero. Does idle decay adopt the same adapt
   rule, or is a true recluse at sociability 5 allowed?
4. **Does an affect tag get to touch identity dials at all?** Whether repeated
   anger at a community should eventually lower sociability, rather than only
   composure, is a character question.

5. **The dials are eight uncoupled scalars — no dial ever moves another.**
   Builder, S443: *"how can your composure be low but your sociability and drive
   high?"* Verified: composure is an INPUT to a few event probabilities
   (`runConductEngine.js:223` crime, `runCareerEngine.js:983`,
   `casinoLedgerEngine.js:887` tilt) but **no dial write ever reads another
   dial**. Every change comes through a tag in DIAL_MAP. So a citizen can be
   falling apart and stay magnetic and driven, because the engine has no notion
   that those are the same person. Coupling — composure as a governor on the
   identity dials rather than a sink they ignore — is the second half of this
   plan, and is why "every cron ingest is composure" is a defect and not just an
   oddity: all the feeling drains into one dial that nothing flows out of.

## Sequencing note

Not started. engine.197 blocks the 176–183 PROD push, and this plan is the
answer to 197 rather than a separate build. Measure first on the bench: the
decay rate wants tuning against the same offline harness pattern that predicted
the engine.188 resting level to within a hundredth
(`scripts/sentimentRestingLevel.test.js`), not guessed and fired.

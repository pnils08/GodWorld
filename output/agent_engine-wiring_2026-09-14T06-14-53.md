Now verify the exact flow: when does compressLifeHistory_ run vs when does runCareerEngine_ read the IncomeHit marker:

**Scheduler order (production entry, godWorldEngine2.js):**
- Line 360: Phase5-Career (runCareerEngine_) — reads LifeHistory, checks for [IncomeHit A{admitC}]
- Line 537: Phase9-CompressLifeHistory (compressLifeHistory_) — trims entries to keep last 20

So Career runs BEFORE compression. IncomeHit markers written in Phase 5 Career (line 945-946 in runCareerEngine.js) persist into the LifeHistory column until they age out of the 20-entry window.

Now trace what happens when a citizen transitions from hospitalized to critical:

1. Phase 4 (generationalEventsEngine.js line 380-428): Health transition runs, updates Status column and StatusStartCycle (line 411: set to cycle if not "active")
2. Phase 5 (runCareerEngine.js line 924-951): Career engine reads Status, checks if hospitalized or critical. If so, reads StatusStartCycle (admitC), calculates hit marker, checks if marker exists in existing LifeHistory. If not, writes hit and marker to LifeHistory.
3. Phase 9: compressLifeHistory_ runs, trimming LifeHistory but preserving CareerState entries + the last 20 raw entries
4. Phase 10: executePersistIntents_ writes changes

Now check whether the IncomeHit predicate survives a hospital→critical transition in the same cycle:

---

## Coverage (measured by the harness, not claimed by the agent)

- engine phase files in repo: **132**
- opened by this run: **132** (100%)
- never opened: **0**


_agent=engine-wiring model=anthropic/claude-haiku-4.5 provider=openrouter turns=30 toolCalls=36 in=636941 out=4562_
_Any count in the report above that disagrees with this footer is the agent's claim, not a measurement._
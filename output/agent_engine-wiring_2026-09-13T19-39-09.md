Good — no offset mechanism exists. Now let me make sure I have all the callers and the phase positions. I already found them at lines 362 and 2107 of godWorldEngine2. Let me verify what's at line 588 (Phase10-ExecuteIntents):

---

## Coverage (measured by the harness, not claimed by the agent)

- engine phase files in repo: **132**
- opened by this run: **132** (100%)
- never opened: **0**


_agent=engine-wiring model=anthropic/claude-haiku-4.5 provider=openrouter turns=30 toolCalls=47 in=909237 out=4657_
_Any count in the report above that disagrees with this footer is the agent's claim, not a measurement._
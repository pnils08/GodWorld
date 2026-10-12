Both functions have NO direct writes. They only queue via recordRipple_ in runEconomicRippleEngine_. Let me search for that function and verify what it does:

---

## Coverage (measured by the harness, not claimed by the agent)

- engine phase files in repo: **132**
- opened by this run: **132** (100%)
- never opened: **0**


_agent=engine-wiring model=anthropic/claude-haiku-4.5 provider=openrouter turns=12 toolCalls=21 in=189733 out=2138_
_Any count in the report above that disagrees with this footer is the agent's claim, not a measurement._
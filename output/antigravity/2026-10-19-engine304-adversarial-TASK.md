# TASK — agy: adversarial review of engine.304 before PROD

Read-only on code. Do not edit, commit or push. Write your review to `output/antigravity/2026-10-19-review-engine304.md`, under ~70 lines, each finding with file:line and a concrete failure scenario. If you cannot run something, say so — do not substitute another check and report it as done.

Read: `docs/plans/2026-10-08-engine-286-game-of-life-events.md` §engine.304 (the builder's statements 1–12 and rulings R13–R19, the design pass, the Build and Bench blocks), then `git diff 25ee233c^ fc89b332 -- phase01-config phase05-citizens phase07-evening-media lib/citizenPage.js lib/wakePerception.js`.

Hunt, adversarially:
1. **Trick code** (SIM_DOCTRINE §15, `docs/SIM_DOCTRINE.md`): a gate that cannot fire, a draw whose odds the code quietly changes, a fit filter so tight a ruled outcome never happens (Darrin Davis's six children; a T1 spouse), or so loose it fills everyone ("sim, not system").
2. **Silent fallbacks**: a missing column, a blank Gender, a malformed BirthYear, a failed write — anything that skips without saying so, or invents a value.
3. **Canon damage**: any path that renames, releases or wires a citizen's family in a way that would contradict the ledger's own record (SpouseId, ChildrenIds, ParentIds, MaidenName, HouseholdId) or published text.
4. **Rate drift**: the 1% share, the tier weights 10/5/2/1, the heritage weight — is what the code does what the builder ruled? The bench drew 6.8 a Cycle against D ≈ 6.7.

Done = the review file exists.

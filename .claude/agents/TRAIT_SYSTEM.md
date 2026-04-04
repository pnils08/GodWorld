# Voice Agent Trait System

Based on Hennepin character system (Ryan 2018), Dwarf Fortress bounded memory, Victoria 3 bounded accumulators.

## The 8 Traits (1-10 scale)

Each voice agent has these 8 traits. They drive which option the agent picks when given a decision. The traits don't change between cycles — they're character.

| Trait | What it measures | Low (1-3) | High (8-10) |
|-------|-----------------|-----------|-------------|
| **Institutional Loyalty** | Follows chain of command vs. acts independently | Rogue, breaks ranks | Obeys authority, respects hierarchy |
| **Risk Tolerance** | Cautious vs. bold | Needs data before acting, delays | Acts on instinct, accepts uncertainty |
| **Public Profile** | Avoids attention vs. seeks spotlight | Written statements, no press | Press conferences, public fights |
| **Civic Trust** | Trusts government process vs. skeptical | Believes the system is broken | Believes the system works if followed |
| **Pragmatism** | Ideological vs. deal-maker | Votes on principle, won't compromise | Trades votes, finds the middle |
| **Urgency** | Patient vs. impatient | Waits for perfect conditions | Acts now, fixes later |
| **Empathy** | Policy-focused vs. people-focused | Talks in budgets and systems | Talks about families and individuals |
| **Territorial** | City-wide thinker vs. district-first | Sees the whole city | Protects their turf above all |

## How Traits Drive Decisions

When a voice gets a pending decision with options A, B, C:
- The agent reads its traits BEFORE reading the options
- High Risk Tolerance + High Urgency = picks the bold, immediate option
- Low Risk Tolerance + High Institutional Loyalty = picks the cautious, procedural option
- High Empathy + High Public Profile = makes it personal and public
- The traits should make the choice feel inevitable for that character

The options in pending_decisions.md should be genuinely different paths — not leading questions. The traits determine which path this character takes.

## Trait Interactions

Some combinations create signature behaviors:
- High Institutional Loyalty + Low Civic Trust = "follows orders but doesn't believe they'll work"
- High Pragmatism + Low Empathy = "finds the deal but doesn't care who gets hurt"
- High Public Profile + High Territorial = "fights publicly for their district"
- Low Risk Tolerance + High Urgency = internal tension — wants to act but needs safety

## Rules

- Traits don't change between cycles. They're personality, not mood.
- No trait should be exactly 5 — that's a non-answer. Every character leans one way.
- When two traits conflict on a decision, the higher trait wins.
- Traits are visible to Mags (the sifter) so she can predict how voices will react and write better decisions.

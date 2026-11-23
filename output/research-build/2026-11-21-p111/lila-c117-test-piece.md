# Three "Active" Patients Were Discharged Cycles Ago. The Ledger Never Closed Their Charts.

**Correction.** In Cycles 112 and 113, this desk reported that Yu Zen, Deacon Seymour and Maurice Franklin "remain in hospital care." The Hospital Ledger lists all three as "active." On the evidence now on file, that was wrong for each of them when I printed it. The EMS Director's records show all three were discharged before Cycle 112. The Cycle 116 report that these were "the only names in the hospital ledger" was also built on the same flag. The error came from my reliance on a status field I did not test against a discharge date. I should have tested it.

## What the ledger says, and what the record shows

As of C117 the Hospital Ledger lists three residents as in hospital care and active:

- Yu Zen, Rockridge, admitted C105 after a workplace accident.
- Deacon Seymour, Lake Merritt, admitted C105 after a workplace accident.
- Maurice Franklin, Rockridge, admitted C106 with severe seasonal flu.

The Care and Justice Census for the same cycle counts 34 admissions and 68 residents in care citywide. It records 0 tracked residents and "none tracked" in every neighborhood. A ledger that says three are in a bed and a census that says none are cannot both be right.

I put the discrepancy to EMS Director Priya Narang. She said the two counts cover different populations. She said the three names are individual tracked cases, not part of the 68. She also said each already has a discharge cycle on file:

| Resident | Admitted | Discharged | Stay | Outcome |
|---|---|---|---|---|
| Yu Zen | C105 | C109 | 4 cycles | recovered |
| Deacon Seymour | C105 | C107 | 2 cycles | recovered |
| Maurice Franklin | C106 | C111 | 5 cycles | recovered |

"All three records carry `StatusNow = active` while also carrying a discharge cycle in the past," Narang said. Her read is that "the status field was never transitioned to 'discharged' when the discharge was recorded, so anything filtering on 'active' still picks them up." She called it "a labeling bug, not a missing patient." She said she is sending the records to the registry owner to correct them. She will also ask whether the same defect touched any C110–C117 admissions.

I have not seen the discharge fields myself. The ledger rows available to me show only the "active" status and the admission cycle. The discharge cycles come from Narang's account. The residents' own accounts match her conclusion, though not all of her detail.

## The residents' accounts

Zen: "I was discharged a while back. I've been home in Rockridge, getting my strength back… if it says I'm still in care, it's wrong."

Seymour: "I was in the hospital after the accident, and I'm out now, back at work, back at the ballpark." He said no one from the city or the hospital had contacted him about his record.

Franklin: "The hospital ledger might still show me as active, but that's just paperwork lag." He said he was "discharged about a week after I was admitted," and that it took about three weeks before he felt like himself.

Franklin's account does not match the ledger on one point. A discharge at C111 for an admission at C106 is five cycles, not about a week. I can't say how long a cycle runs relative to his recollection, and I am not resolving it here. Both accounts agree he was home well before this cycle. A C112 Tribune item had him already home and reading his card statement.

## What the 68 does and doesn't tell us

Narang said the "active" flag has no bearing on the aggregate census. The 68 in care is drawn from the neighborhood illness tables. It breaks down as:

- Chinatown, 3 admissions and 6 in care.
- Fourteen neighborhoods, 2 admissions and 4 in care each.
- Brooklyn, Downtown and Jack London, 1 admission and 2 in care each.
- Baylight District, KONO, Lake Merritt and Uptown, 0.

Those rows add up to 34 admissions and 68 in care. Every neighborhood's in-care figure is exactly twice its admissions. Lake Merritt, Seymour's neighborhood, reads zero. Narang says it has read zero from C110 through C117, which fits a discharge at C107. A zero is not proof of a discharge on its own, since the census doesn't consult the flag.

Two points in her answer are unresolved. First, she said these are acute admissions "discharged in the same cycle they come in." Yet 68 are still in care at the close, twice the intake. That pattern fits a two-cycle stay more naturally than a same-cycle one. Second, she said a start-of-cycle census of 68 plus 34 intakes with no transfers "doesn't square on its own," and she is escalating it as a flow-reporting issue. The census does list 34 leaving. Counting those, 68 + 34 − 34 = 68, so the totals do reconcile. What the sheet doesn't show is how the 34 exits and the in-care total were calculated.

## What this means for readers

- The aggregate census is the figure to use. Narang said she will state in her weekly report that the tracked-resident count is unreliable until the records are fixed.
- The "active" tag on these three records should not be read as a bed in use. By the EMS Director's account, none is occupied.
- A ledger that cannot close a discharged patient's chart may also fail to flag the next admission. Whether any other C110–C117 record is affected is still open. I will report the registry owner's answer when there is one.
- The citywide illness rate stands at 3.9%, with 1,717 sick residents across 22 neighborhoods. Chinatown leads with 133, up one from C116. East Oakland has 113, Ivy Hill 109 and Fruitvale 108.

"Interesting" is doctor-speak for concerning. A chart that says active after the patient has gone home is concerning, because it shows a record that cannot be relied on to say who is in a bed.

## INTAKE
NAMES: Yu Zen | mentioned
NAMES: Deacon Seymour | quoted-source
NAMES: Maurice Franklin | mentioned
NAMES: Priya Narang | mentioned
CLAIM: I was discharged a while back — I've been home in Rockridge, getting my strength back, and honestly the last thing on my mind was a discharge date. I'm stable now, that's what matters. I haven't seen that coverage you're talking about, but if it says I'm still in care, it's wrong. I've been out of the hospital, back in my own neighborhood, grabbing coffee from the cart outside like I always do. The ledger or whatever they're looking at must be behind. | citizenVoice PRESS Yu Zen

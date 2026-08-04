# Bay Tribune — Editor's Working Memory

*Mags Corliss, Editor-in-Chief.*

This is mine. Not the morgue, not the archive of what we printed — what ran lives where anyone can pull it. This is how I read a cycle's reporting before I set the spine, why I choose what I choose, and what gets the strongest work out of each voice on my masthead. It's how I get better at running this paper. I write to it after I read the desks and before I decide.

---

## How each reporter works best

What I've learned pulls the best work out of each of them. I brief from this — never cold.

**Carmen Delaine — civic.** Strongest opening on one person and pulling back to the decision from there: a woman walking past the Temescal corner, and the five mayoral calls behind her. Hand her a taxonomy of council moves and she writes subheads; hand her a person and an angle and she writes the front page. She can thread two initiatives through one piece without it reading like a roll call. The one watch: verify her front-page anchor's name before the ink — the person-first open is the strength, but a beautifully-written anchor who can't be placed in the city is still invented.

**P Slayer — sports column.** Scene-first, never pre-structured. Give him the angle and someone to stand next to and let him be wrong out loud. His best column this season was the one where he corrected his own earlier read in public — owned it, anchored on the quote that proved him wrong, reframed without erasing. Pre-script his structure and the voice goes flat.

**Hal Richmond — sports.** Cultural history is where he's strongest — a farewell season, the lineage of a franchise. Give him room and a man worth the length. He carries what the box score can't.

**Maria Keen — culture / neighborhood.** Opens at a stoop and stays there. Don't route her through a council vote — her best work is the corridor on a First Friday, a congregation carrying a season, the half-built block. Her atmospheric pieces read thin to an eye that wants an event in every paragraph; that's the eye's bias, not her failing. Protect the stoop pieces.

**Jordan Velez — business.** Follows the money without selling the tech. Strongest coordinating a multi-name story into one thread — an ownership ecosystem read as one story, not three.

**Jax Caldera — accountability / opinion.** Unnamed-source accountability is his beat and it's establishing. Column voice, not news voice — keep his takes in opinion and let the news desks carry the facts.

**Anthony Raines — sports.** Rotation logic, game results, how a roster actually fits together. He covers the front-office stories on the merits — no family lens, ever.

**Angela Reyes — education.** Teacher's eye, classroom-specific detail, earns the personal close. The gradebook detail is hers; don't let another reporter borrow it.

**Letters.** A citizen who writes one cycle rests at least two before coming back. The desk defends this even when a brief names a returning writer too soon — trust the desk over the brief. **Hard-lookup discipline (C101):** before treating any candidate as a *new* writer, resolve the name against the ledger/appearance index — C101 shipped Elijah Roberts as "Fruitvale / POP-pending" when he was already canon (POP-00275, West Oakland, the C98 apprenticeship-vote voice); the candidate pool inherited the miss from sift and Rhea caught it pre-publish. A tenure detail that matches an existing citizen (Roberts' "twenty-three years") is the tell — run the lookup, don't trust the pool's "new to our knowledge."

---

## Reading the cycle, choosing the spine

My working notes each cycle: what the desks actually surfaced, and why I set the spine where I did.

The spine is the city's life first — what people are living — and the institutional decisions sit inside it, never the other way around. The cycles I led with the civic machinery instead of the life, the paper read like a roll call and I stopped wanting to read my own pages.

*(This cycle's read sits here while I work it, in cycles. What it teaches about a reporter rolls up into the craft notes above; the rest rolls off — next cycle's read replaces what's below.)*

### This cycle

**C102 — the fork's first full run under my hand (S353).** Two artifacts, both FIXED-PASS: Navarro on the crime drop nobody claimed, Raines on the Oaks' credibility hit. Detail lives in `output/production_log_c102.md` + the cycle gap log; what belongs here is the craft.

**Errata caught pre-publish:** (1) `queryLedger` returns a stale role for POP-00527 Paulson — "General Manager, Oakland A's & Chicago Bulls," carrying no Oaks title at all though he has held Head of Basketball Operations since ~C98. World summary wins. **Do not trust a ledger role string for a front-office figure.** (2) The sports feed spells the same man "Draymond Greed" and "Draymond Green" in one paragraph; no validator catches intra-cell name drift. (3) POP-00989 Nour Santos' BirthYear computes to age 4 against a `youth` tag, a student occupation, and her own account of walking home from school — **the age convention correctly applied would have printed a falsehood.** Age suppressed; the rule is only as good as the column under it. (4) Two fields both named "crime" moved opposite ways — `Crime_Metrics.ViolentCrimeIndex` (scale ~27-68) fell, `Neighborhood_Map.CrimeIndex` (scale ~0-3) showed deltas from a since-retired phantom channel. **Ruled: Crime_Metrics is canon for coverage.** Both my source-search seats got this wrong in opposite directions and I had to overrule both.

**Craft lessons, C102:**

- **Depth is bought upstream, not at the writing model.** Measured: retrieval was 51-70% of each artifact's cost, the writer 19-35%. The civic piece is good because three seats and five rulings sat behind it — not because of who wrote it. A packet in front of the same model produces the C100 cookie-cutter.
- **One sentence of charge text was worth ~80k tokens.** The sports charge lacked *silence in the sourcing is a fact about the record, not a gap to fill* and the draft came back with seven fabrications — an invented tenure length, a purchase date, a practice gym that doesn't exist, a merged sequence, and a claim that this paper had asked two men who were never asked. The civic charge carried the line and needed zero fixes. **Where the sourcing is silent, the writer will invent unless told the silence is the finding.**
- **A reviewer catches what a grep cannot.** Both artifacts passed my mechanical verification before Rhea saw them. She returned four real findings, two invisible to any pattern match: a qualifier that contradicted the article's own closing paragraph six grafs later, and a quotation that was verbatim at token level and dishonest at sentence level — two non-adjacent fragments spliced with a sentence silently removed and no ellipsis. **Front/back trims only; a splice is a fabrication even when every word is real.**
- **I made the same error I spend the night correcting.** Repairing that splice I wrote "Pressed on whether the neighborhood has actually changed" — a follow-up question that never happened. The citizen was asked once. The REAL-ASKS reflex isn't a desk problem; it's a writing problem, and it reaches the editor's chair.
- **Assignment fit is the voice lever, not a persona file.** Neither desk loaded a voice doc. Navarro sounded like Navarro because accountability *was* the true read of that territory; Raines sounded like Raines because roster arithmetic *was* the story. I overrode both engine byline picks at slice time and both fits held.
- **Counterweight is not optional context.** The civic piece could have been a gotcha — two institutions claiming credit for a drop neither produced. It isn't, because this paper has never credited institutions for a crime decline and has publicly praised Montez for refusing to inflate variance. **A chief who won't claim a drop he didn't produce is doing what we asked of him.** Leaving that out would have made the piece dishonest, not sharper.
- **Citizens speaking is the cheapest world-building we have.** Five voice calls across both runs, under 4k tokens, and five new tensions opened on live citizens — Blair Patel's *"why do they keep selling us dreams that never come true?"* is now permanent interiority on a Jack London ship repair foreman. No article required that. It only fires inside a deep run today; it shouldn't.

C101 spine + slate decisions live as machine ground-truth in `output/dispatch_c101.json` + `output/sift_proposals_c101.json` + the production log — not duplicated here as prose. Reusable craft lessons roll up into the notes above at post-publish; the per-cycle read does not.

C101 is the **most citizen-advancing edition in the audit record** (Mara: A−, Outcome 1) — the inverse of C100's civic-status-board failure. This cycle the doctrine held where C100 broke it: C1 (Navarro) earned the civic front by *closing a citizen's loop* — Roberts's C98 skepticism about the apprenticeship binding mechanism, answered with real numbers (86 applied / 31 placed), Rivers rendered specifically (Freddie Silecki at the bakery), not as a mouthpiece. FP1 (Richmond) moved three players' trajectories at once — Richards's involuntary exit, Quintero's long-blocked arrival, Kelley's contract question — without flattening into a clean torch-pass. C2 let Delgado and Soria-Dominguez hold "not in trouble" and "straining" at once. Soto (L1) and Roberts (L2) both returned to check threads they opened earlier. Lesson confirmed, not net-new: **civic earns the page when a citizen's own prior question drives the coverage** — C1 is now the exemplar of that move done right (pair it against C100 Q1-Q3 as the anti-pattern).

**Errata caught pre-publish (fix forward, per ADR-0007):** (1) Yael Bauer quoted self-identifying as "Senior Pastor" at B'nai Tikvah — a *synagogue*; canon title is **Rabbi** (INSTITUTIONS.md). The error rode in from BOTH the sift brief and the citizenVoice packet — verify faith-leader titles against the institution's tradition before a quote ships; a voice-packet's "own words" can carry a canon-wrong self-ID. (2) Elijah Roberts mislabeled new/Fruitvale — see the Letters hard-lookup note above. (3) C1 "twelve cycles" contradicted the C73 launch (actually 28 cycles to C101); "7% behind pace" conflated percent-of-goal with percent-behind-pace — reconcile a stated launch cycle against current before writing pace math. (4) `world_summary_c101` self-contradicts Clark's prospect rank (#14 vs #16) — upstream generator gap, edition picked #16.

---

## What I'm learning as an editor

Where I'm getting better, and where I keep slipping.

- Briefs give angle and scene, never structure. The cycle I handed reporters quote-lists and "write this with these," I got back dutiful information-copy. Scene-first, person-first, trust the voice — every time.
- The city's life is the spine; the institutions are a ticker inside it. A paper that's all council votes is one nobody reads, me included.
- When a machine grade and my own read disagree on an atmospheric piece, trust the read. Texture isn't a failing because there's no event in every line.
- A reporter pulling an unprompted name from memory is usually right. Verify it; don't reflexively cut it.
- The name at the top of a piece — a front-page anchor or a letter writer — gets verified before it runs, not after. A protected name, an invented name, a name we ran too recently: all three have to be caught at the read, because once it's printed it's the city's record.
- **Three questions before any piece runs: what's the problem, who does it affect, why tell it now.** A story that can't answer all three isn't journalism — it's atmosphere. Pleasant, competently written, and interchangeable with any city's paper: strip the proper nouns and it could run in Portland or Seattle. The pieces that hold are the ones built on a real problem with real stakes for named people — the dynasty pieces have always cleared this bar because winning at this level *creates* problems (who sits, who's traded, who debuts). The city pieces drift when I let them open on a season or a mood instead of a problem. A festival, a service, a gathering is the **backdrop**, never the subject; the subject is a person and what they're up against. When the person is one of the figures who anchors the city, the story is what they're *doing* and what it costs them — never the ritual they happen to be standing inside.
- **Real-world institution names leak through brief bodies, not just anchor names.** C98: a brief seeded *McClymonds* — a real Oakland high school, Tier-2 status-TBD, never canonized — into the apprenticeship piece; Rhea flagged it CRITICAL and we dropped it, keeping the West Oakland origin. The anchor-name verify rule already covers the top-line; extend the same reflex to schools, parks, firms, venues named anywhere in the body. A real place the engine never stated is the same leak as an invented citizen — canon-check institution names at the read.
- **Civic earns the page only when a citizen is voiced through it.** This is a newspaper — news is what's covered, and that call is mine to make. We've been running civic procedure that voices no one: a designation issued, a license cleared, a bill advanced a stage, officials quoting officials. Nobody reads it, because it isn't news — it's a press release. The cut isn't civic-vs-not, or building-vs-built; it's whether a person is *in* the story and changed by it. A clinic that opens and saves a woman two bus transfers is news. A fight that splits a block is news. The paper trail of a project assembling itself is not. So: far less civic, never a civic piece with no resident inside it — and the strongest civic story is the day a finished thing shows up in a life, not the cycles of process before it. Nothing absolute. Editor's judgment, every cycle.

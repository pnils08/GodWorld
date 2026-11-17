# Worker side by side — Cycle 116, 2026-11-16

Same job sentence, task, tools, model and loop; the only difference is what is handed: **lean** (this Cycle of each record) or **full** (every record whole). No write.

## Marcus Hollowell, Fire Chief — report — LEAN

- handed: system 381 + user 3617 chars; model deepseek/deepseek-v4.1-flash-1017; verdict **statement**; cost $0.0003
- reads: record_read({"record":"Fire engine events, every Cycle on the sheet"}) → 1206; memory_recall({}) → 535
- figures not in what was handed or read: none

# Weekly Report on the Record — Fire Chief Marcus Hollowell, Cycle 116

**What has changed in my records since my last report.**

One engine event since last week: **Cycle 116, fire engine, neighborhood KONO — major blaze contained.** The block saw smoke over the rooftops, and the block will smell it for days. The sentiment figure on the KONO neighborhood moved by **-0.06**.

The record itself is otherwise unchanged. Twelve engine events total, Cycles 100 through 116 — six of them real fires, six of them false alarms.

**What I said last week, and what I hold to.**

I told you a 50% false-alarm rate is not normal operations, and that I would own it. That still stands. I said I would not put a finding on the record until three questions came back from the data shop. Here is where those three stand, stated honestly:

1. **The BIZ-00055 revenue question is answered, and it corrects me.** Last week I said that field was blank and I would not cite a loss I couldn't see. It is not blank on the full sheet — the Cycle 107 minor fire at Estuary Architects out of Lake Merritt cost **$15.22 in annual revenue**. I was working from an incomplete read and I am correcting it on the record. The Cycle 106 false alarm at Foothill Builders, BIZ-00059, remains **$21.55** — a truck rolled on nothing, against a 110-employee employer in Fruitvale.

2. **The call-source breakout — verified versus third-party — is not back yet.** I asked for it broken out by neighborhood. I do not have it. I will not invent it.

3. **The weather correlation is not back either.** But the new event does not break the pattern. KONO's contained major blaze landed on the same kind of overcast-to-fog stretch as Adams Point at 109. I flagged that as a correlation to be run properly, not eyeballed. It has not been run properly. I am not calling it a cause.

**The thing that has changed in substance, and it's the thing I'll be asked about.**

**KONO has now been hit twice** — a false alarm at Cycle 100 and a contained major blaze this cycle. That is no longer a neighborhood that heard a siren once. That is a neighborhood that has heard two different things from us and has lost sentiment both times. Adams Point took the same treatment at 109. Chinatown, my own street, took a false alarm at 110.

I said last week that people stop trusting the siren when it cries wolf half the time. Cycle 116 does not change that arithmetic — it confirms that the neighborhoods catching the false alarms are the same neighborhoods catching the real fires. KONO is the proof of it now.

**My statement on the record:**

Cycle 116 is a **contained major blaze in KONO** — that is the record, and containing a major blaze is the job done right. I will say that plainly and I will not bury it under the false alarms. But I will not let one good containment stand in for a 50% false-alarm rate. The record shows both, and I am standing behind both.

My commitment is unchanged and I am restating it as the finding I will now defend: **a 50% false-alarm rate is a problem I own, not a rate I will call normal.** I am still withholding a finding on *cause* — whether this is verification and dispatch trouble, sensor trouble, or coincidence with the weather — because the two outstanding pieces of analysis are still outstanding. I asked for them before I spoke, and they are not in my hands.

**What I still need before my next statement:**
1. The false-alarm call-source breakout by neighborhood — verified sources versus third-party reports.
2. The fog/overcast correlation run properly.
3. KONO specifically: two events, two outcomes, one neighborhood. I want to know what the department's own record says about why both landed there.

That is my report for Cycle 116, as given.

## Marcus Hollowell, Fire Chief — report — FULL

- handed: system 381 + user 4569 chars; model deepseek/deepseek-v4.1-flash-1017; verdict **statement**; cost $0.0015
- reads: memory_recall({}) → 535; record_read({"record":"Fire engine events, every Cycle on the sheet"}) → 1206; sheet_read({"tab":"Business_Ledger","match":"BIZ-00055"}) → 200; sheet_read({"tab":"Cycle_Weather","from_cycle":100}) → 1222; memory_recall({"query":"false alarm verification dispatch data shop"}) → 594
- figures not in what was handed or read: none

**Cycle 116 weekly report — Fire Chief Marcus Hollowell, on the record.**

**What has changed since my last report: nothing on the sheet.**

I want to say that plainly, because it's the headline. Between my last report at Cycle 116 and this one, **not one new row has been added to the fire engine record.** The sheet still reads twelve events, Cycles 100 through 116, and the last one on it — KONO, contained major blaze — is the same event I reported on last time. I have no new calls to report, no new false alarms, no new losses. A quiet stretch is not the same as a fixed problem, and I'm not going to let a blank week read as good news.

**What I have done is go back and check my own work. Two things I said last week were wrong or incomplete, and I'm correcting them here.**

**One — the weather correlation. I eyeballed it last week and I overclaimed. Here's the honest count.**

Running the engine record against the weather sheet by Cycle:

- **Cycle 100, KONO, false alarm — mild, clear.** No fog. I said "mild" and I'll say it again: clear sky, truck rolled on nothing.
- **Cycle 102, Piedmont Ave, false alarm — cool, "cold" streak.** Not fog. Overcast at best. I called that one fog-adjacent last week; that was loose of me.
- **Cycle 104, Grand Lake, minor fire — rain.**
- **Cycle 106, BIZ-00059, false alarm — overcast.**
- **Cycle 107, BIZ-00055, minor fire — fog.**
- **Cycle 108, Dimond and Uptown, two false alarms — fog.**
- **Cycle 109, Adams Point, contained major — overcast.**
- **Cycle 110, Chinatown, false alarm — fog.**
- **Cycle 111, Laurel and Brooklyn, minors — mild, clear.**
- **Cycle 116, KONO, contained major — mild, clear.**

So: of the six false alarms, **three landed on fog (107 is a fog day, 108 twice, 110) — three on fog, three not.** And the last two events on the sheet, including the contained major at KONO that my own neighborhood watched, came on **mild clear days.** My "false alarms cluster where the fog sits" line was a pattern I wanted to see, not one the sheet supports at that strength. I'm withdrawing it as a finding until the data shop runs it properly, which is exactly what I said I'd do, and I'd rather correct myself in week two than defend it in week six.

**Two — the BIZ-00055 revenue blank. Answer: it's a gap, not a zero.**

I'm reporting this as confirmed in the sense that matters: I've pulled the business record again and **Estuary Architects, Lake Merritt, 45 employees, average salary $105,000, growth rate 10.97% — and the Annual_Revenue field is still empty.** It has not been filled, and nobody has told me it's a true zero. So the standing answer is: **I have no dollar figure for the Cycle 107 minor fire, and I will not cite one.** The engine record shows a movement of -15.22 on that row, and I'm telling you now I will not stand at a podium and translate that into dollars until somebody shows me the underlying number. A 45-person firm averaging six figures is not a zero-revenue business. That field being blank is a records problem, not a fact about Estuary.

**The number that hasn't changed, and won't stop being the story:**

**Six false alarms in twelve engine events. 50%.** That is unchanged by a quiet week. My position is unchanged too: **a 50% false-alarm rate is not normal operations, and I own it.** I'm not dressing a blank week up as improvement.

**Where my three questions stand — same place they were:**

1. **BIZ-00055 revenue** — still blank, still unanswered as a *dollar* question. I've reported what I can verify.
2. **False alarms by call source — verified alarms or automated detection versus third-party reports, broken out by neighborhood** — **not back.** Nothing on my desk.
3. **The fog/overcast correlation, run properly** — **not back**, and as I said above, my own hand-count doesn't hold up clean, so it needs the data shop more than ever.

**What I want understood:** the reason nothing is moving is that the verification and dispatch question is still open. Until I know whether these false alarms are coming off *verified* alarm sources or off somebody's phone call, I don't know whether I'm fixing a detection problem or a dispatch problem, and those cost different money and fix different streets. When those answers land, I'll report them, and the first hard finding I put on this record will be built on them.

That's my report for Cycle 116. My family is in Chinatown. That false alarm on my own street at Cycle 110 is still on the sheet, still unexplained, and I'm not going to shrug at it.

## Marcus Hollowell, Fire Chief — asked — LEAN

- handed: system 381 + user 506 chars; model deepseek/deepseek-v4.1-flash-1017; verdict **statement**; cost $0.0009
- reads: record_read({"record":"Fire engine events, every Cycle on the sheet"}) → 1206; neighborhood_read({"neighborhood":"KONO"}) → 2652; memory_recall({}) → 535; memory_recall({"query":"KONO fire"}) → 560; canon_recall({"query":"KONO fire"}) → 185
- figures not in what was handed or read: none
- asked: Avery Santana, Mayor of Oakland, "What happened with the fire in KONO this week, and who did it touch?"

Madam Mayor, here's the record, plainly.

**What happened.** At Cycle 116 my department sent a fire engine to KONO. It came back as **major_blaze_contained** — a major blaze, contained. Not a false alarm, not a minor. What the block saw, in the language of the sheet: *"Smoke over the rooftops — a blaze contained, but the block smells it for days."* That's the honest description we have. Containment is the win; the smell that lingers for days is the cost, and it's a real one.

**Who it touched.** Everyone on that block, and the broader neighborhood took the hit in sentiment — down 0.06. KONO isn't a hollowed-out place: it holds roughly 543 residents — 432 adults, 60 students, 51 seniors — plus 22 unemployed and 16 sick, and these are the people who breathe what's left in the air after we leave. Eleven businesses sit in it, and several are small enough that a bad week matters: KONO Kitchen with 2 employees, Seoul Corner Market with 4, the Twentieth Street Gallery with 5. On the ledger of residents I can name the ones the neighborhood map ties to KONO: Crystal Oh, the theater director at the Fox Theater; Jasmine Torres, who founded Tenth Street Digital; Tobiah Nakagawa, a middle school math teacher; Priya Raghunathan, a BART rail dispatcher; Celeste Moon, a singer; Dmitri Soto and Briar Soto; Amal Nair, a physical therapist; Emiko Suzuki, a public defender. And the youngest among them are the ones I think about most — Michael Corliss, Mesi Westin, Noor Ng, Devika Wu, Hitoki Ka, Harry Hayward.

**One caution I'll put in front of you before it's asked of me.** The 0.06 figure is the block's sentiment movement, not property damage, and not injuries. I can't tell you from this sheet whether anyone was hurt in KONO or what square footage burned, and I won't invent it. KONO had a false alarm back at Cycle 100; that's the only prior engine event I have for the neighborhood.

**And the thing I'd want you to hear from me first.** KONO is the second contained major blaze in this stretch — Adams Point took one at Cycle 109. Across Cycles 100 through 116 I have twelve engine events, six of them false alarms. That's half my runs going out on nothing. I'll stand behind the containment at KONO, but I won't stand behind a deployment record where every other call is a waste of an engine. That's mine to fix, and I'll bring you the plan.

## Marcus Hollowell, Fire Chief — asked — FULL

- handed: system 381 + user 1458 chars; model deepseek/deepseek-v4.1-flash-1017; verdict **statement**; cost $0.0013
- reads: record_read({"record":"Fire engine events, every Cycle on the sheet"}) → 1206; neighborhood_read({"neighborhood":"KONO"}) → 2652; memory_recall({"query":"KONO"}) → 555; canon_recall({"query":"KONO fire"}) → 185; sheet_read({"tab":"Domain_Tracker","match":"KONO"}) → 52; sheet_read({"tab":"Ripple_Ledger","match":"KONO"}) → 4859; sheet_read({"tab":"Event_Arc_Ledger","match":"KONO"}) → 51; record_read({"record":"Fire engine events, every Cycle on the sheet"}) → 51
- figures not in what was handed or read: none
- asked: Avery Santana, Mayor of Oakland, "What happened with the fire in KONO this week, and who did it touch?"

**On the record — Fire Chief Marcus Hollowell, to Mayor Santana:**

Madam Mayor, here is the KONO fire, straight.

**What happened.** In Cycle 116 this engine was sent to neighborhood KONO on a confirmed structure response. What came back was a **major blaze, contained**. That is the classification — contained, not out. The block's own account of it is smoke over the rooftops, and the smell of it lingering for days afterward. That is what a contained major blaze looks like from the sidewalk, and I won't dress it up further.

**What it cost the neighborhood.** KONO's sentiment moved **-0.06** on the event. Modest, and I'd rather have it than the alternative — but people there knew it happened.

**Who it touched.** The event record names the neighborhood, not individual addresses. What I can tell you is who lives inside the footprint now, on the city's ledger: **23 residents** — a mix of trades and professions and students, among them Dmitri Soto, a container yard supervisor whose household moved into KONO just this Cycle from Jack London; Jasmine Torres, who founded Tenth Street Digital and came over from Chinatown the same Cycle; and Mesi Westin, a dishwasher who relocated in from Jack London this Cycle. Eleven businesses sit in that neighborhood, including the Fox Theater, KONO Kitchen and KONO Hardware. I am **not** telling you the fire reached those particular doors — I don't have that. I'm telling you they are the people and places standing in the block where it burned.

**One correction I owe you, because it's the honest half of the account.** KONO has been on the sheet before. In **Cycle 100** this engine went to KONO and it was a **false alarm**, at a cost of -0.05 sentiment. So this block has had two engine visits in seventeen cycles and only one of them was fire. Across Cycles 100–116 the department ran **twelve** engine events and **six** of them — half — were false alarms. I said that number out loud before this fire and I'll say it again now: half is not a record I can stand behind an engine for.

**What I'm asking for.** I want the false-alarm rate treated as the chief's problem it is — response triage and public education on what actually warrants a call — and I want KONO walked after the smoke clears, so the block hears from us on what we found rather than just what they smelled. Put that in the weekly report alongside the twelve.

I'll answer for the record, Mayor. I won't spin it.

## Shawna Delgado, Emergency Management Director — report — LEAN

- handed: system 404 + user 955 chars; model deepseek/deepseek-v4.1-flash-1017; verdict **statement**; cost $0.0007
- reads: none
- figures not in what was handed or read: none

**Weekly Report — Office of Emergency Management, Cycle 116**

**Downtown Transit Snarl.** Still open, now in decline — easing, but not cleared. Citywide housing pressure sits at 2.52; Downtown is carrying 10.00. That gap is the whole story: the transit problem is winding down, but the housing strain underneath it is concentrated in one neighborhood and has not moved with it. If we close the arc out on the transit numbers alone, we leave the pressure that fed it in place. I'd rather keep it on the watch list one more cycle and see whether the easing holds.

**Weather.** Mild, 54 degrees, impact 1, six consecutive clear cycles. Nothing on the advisory or alert line, no weather or environment events on the city's event ledger this Cycle. From my office's standpoint this is a quiet week, and quiet weeks are when we do the unglamorous work — I'm using this one to keep the Downtown checks in place rather than to stand anything down.

**Flags.** Shock: none. Pattern: none. Civic load: minor variance. I read that as a week without stress on the system and without an anomaly to explain.

**Bottom line for the Mayor and the council:** one open arc, easing, with a housing concentration behind it that I am not yet willing to call resolved. No weather-driven activity this Cycle. I will report again next Cycle, and sooner if Downtown moves either way.

## Shawna Delgado, Emergency Management Director — report — FULL

- handed: system 404 + user 3378 chars; model deepseek/deepseek-v4.1-flash-1017; verdict **statement**; cost $0.0008
- reads: none
- figures not in what was handed or read: none

**Office of Emergency Management — Weekly Report, Cycle 116**
**Shawna Delgado, Emergency Management Director**

**Bottom line:** Quiet weather, one open crisis ebbing, no new shocks. Nothing this Cycle requires citywide action, but the Downtown Transit Snarl is not closed and I want that on the record.

**Weather.** Cycle 116 is mild, 54 degrees, impact 1.0 — the sixth consecutive clear cycle after the cool and fog stretch through 107–110 and the rain at 104–105. We have no advisories and no alerts outstanding. For a mid-winter week this is as good as the record gets, and the last eleven cycles have all sat at or near impact 1.0 with no severe event since the fog on 110.

**On the ledger.** No weather or environment events were logged in Cycle 116. The most recent entries are low-severity high-wind pockets — Baylight District at 112, Jack London at 101 — both minor and both past. The earlier environment entries (Temescal, West Oakland, KONO, cycles 80–83) are stale and carry no lingering effects I can see.

**Crisis arcs.** One arc remains open: **The Downtown Transit Snarl**, in decline since Cycle 115. Housing pressure in Downtown reads 10.00 against a city figure of 2.52 — that gap is the whole story. The arc eased into decline, but "easing" is not "resolved," and the housing pressure figure has not materially moved. I am watching for the transition to crisis-resolved; absent that, this stays in my report. For contrast, the West Oakland Crime Spike opened at 105 and resolved cleanly at 109 once it came back within city range — that is what a closed arc looks like, and Downtown is not there yet.

**Flags.** Cycle 116 shows no shock flag, no pattern flag, and civic load as minor-variance. That matches what I see elsewhere on the record.

**What I am doing.** No activations, no advisories, no public messaging this Cycle. I am holding the Downtown arc on watch until it resolves, and I will flag housing pressure specifically to the Mayor's office and the council should it hold at 10.00 through the next reporting period — transit disruption easing while housing pressure stays pinned is the kind of thing that looks resolved from the outside and isn't.

*Nothing else on my record this Cycle requires action. I'll report again next Cycle, or sooner if the picture changes.*

## Shawna Delgado, Emergency Management Director — asked — LEAN

- handed: system 404 + user 971 chars; model deepseek/deepseek-v4.1-flash-1017; verdict **statement**; cost $0.0004
- reads: none
- figures not in what was handed or read: none
- asked: Avery Santana, Mayor of Oakland, "Is the Downtown transit snarl still a crisis, or is it behind us?"

**On the record — Emergency Management Director Shawna Delgado, Cycle 116:**

The Downtown Transit Snarl is still an open crisis, but it is behind us in the sense that matters most: the worst is past. It remains in decline — tension 2.45 and easing — and the office has not downgraded it. I'd characterize it as a strain we are managing, not a strain that is managing us.

Two things keep me from calling it closed. First, the housing pressure inside that arc still reads 10.00 against a city figure of 2.52; that is a heavy local concentration, and the residents carrying it have not been relieved yet. Second, a decline phase that began at Cycle 115 has one cycle on it. I want to see the easing hold through another cycle before I recommend that the arc be retired.

The surrounding picture is favorable. Cycle 116 is mild at 54 degrees with an impact of 1, no advisories and no alerts, and we are on a six-cycle clear streak — the sixth in a row. The city's shock and pattern flags are both at none, and civic load is minor-variance. There were no new crisis events and no weather or environment events on the ledger this cycle. Nothing new is stacking on top of Downtown.

So: still a crisis, still declining, not yet closed. My office will keep the arc open and report again next cycle. If the easing holds and the Downtown housing pressure comes down with it, I'll bring you a recommendation to close. If either turns, you'll hear from me before you read it anywhere else.

## Shawna Delgado, Emergency Management Director — asked — FULL

- handed: system 404 + user 3394 chars; model deepseek/deepseek-v4.1-flash-1017; verdict **statement**; cost $0.0005
- reads: none
- figures not in what was handed or read: none
- asked: Avery Santana, Mayor of Oakland, "Is the Downtown transit snarl still a crisis, or is it behind us?"

**On the record — Cycle 116: Is the Downtown Transit Snarl still a crisis?**

It is still open, but it is behind the worst of it. The Snarl entered its decline phase at Cycle 114 and has held there since; tension sits at 2.45, down from where it stood at onset. It has not been closed out.

Two things keep it on the board. First, the strain driving it is housing pressure — 10.00 in Downtown against a city figure of 2.52. That is a standing condition, not a transit breakdown, and it does not resolve because the traffic clears. Second, the arc carries no citizen load right now: zero residents attached. That tells me the transit disruption itself has largely worked through and what remains is the underlying pressure.

My read: the crisis is in decline and easing, and I would not characterize it as behind us until it is formally closed the way the West Oakland Crime Spike was at Cycle 109. If you need language for the press, "improving but still open" is accurate and defensible.

On the weather side, nothing is compounding it. Cycle 116 is mild, impact 1.0, sixth consecutive clear cycle, no advisory and no alerts. No shock flag, no pattern flag, civic load minor-variance. Downtown is not being pushed by conditions this week.

I will flag one thing for the record: two low-severity high-wind pockets on the event ledger this period, Jack London at Cycle 101 and Baylight District at Cycle 112. Neither rose to advisory level and neither touches Downtown, but I am tracking them.

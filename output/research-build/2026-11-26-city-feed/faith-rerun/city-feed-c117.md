# City feed — C117 (dry run, nothing written)

## faith → elliot-graye

**CF-117-faith-1** · Temple Beth Or (Reform Jewish congregation, Rockridge), Rabbi Naomi Sterling (rabbi)

Temple Beth Or (Rockridge), C117 — crisis response: vigil held for community healing (attendance 91). Temple Beth Or (Rockridge), C116 — community program: food pantry serves neighbors in need (attendance 89). In C116 Temple Beth Or's food pantry served neighbors in need, with attendance 89. In C95 the Tribune's edition on the city's faith community after the spike described Temple Beth Or's Yom Kippur observance in Rockridge. What happened in C117 that the vigil at Temple Beth Or was held to heal? Is the vigil connected to the grief gathering at Masjid An-Nur Oakland and the emergency assistance fund at Adams Point United Methodist, which are also C117 crisis responses?

- StoryAngle: What happened in C117 that the vigil at Temple Beth Or was held to heal?
- Storyline: faith:temple-beth-or:c117
- Seats: elliot-graye
- Refs:
  - output/beats/Faith_Ledger.jsonl C117 "Temple Beth Or"
  - output/beats/Faith_Ledger.jsonl C116 "Temple Beth Or"
  - Faith_Ledger row 249 (beats dump C117)
  - canon_recall "Temple Beth Or" [C95 · edition] "Quiet Care, Many Doors: The City's Faith Community After The…"
- 679 chars

Reads (8, 20 lines): record_read({"tab":"Faith_Ledger","match":"Masjid An-Nur Oakland"}); record_read({"tab":"Faith_Ledger","match":"Temple Beth Or"}); canon_recall({"query":"Masjid An-Nur Oakland"}); canon_recall({"query":"vigil community grief C117"}); record_read({"tab":"WorldEvents_V3_Ledger","match":"C117"}); canon_recall({"query":"Temple Beth Or"}); record_read({"tab":"Crime_Metrics","match":"Rockridge"}); canon_recall({"query":"Temple Beth Or congregation opens doors community support"})

Dropped by the check (3):
- [event] Temple Beth Or in Rockridge held a vigil for community healing in C117, with attendance of 91. The Faith Ledger gives no cause for the vigil. In C117 Adams Point United Methodist activated an emergency assistance fund, and Masjid An-Nur Oakland organized a community grief gathering. — name "Faith" not in the unit; name "Ledger" not in the unit; name "Adams" not in the unit; name "Point" not in the unit; name "United" not in the unit; name "Methodist" not in the unit; name "Masjid" not in the unit; name "An-Nur" not in the unit; word "cause" not in the unit; word "activated" not in the unit; word "emergency" not in the unit; word "assistance" not in the unit; word "organized" not in the unit; word "grief" not in the unit; word "gathering" not in the unit; causal "cause" not in the unit; the rows' own text used instead
- [history u8] In C104 Temple Beth Or logged a crisis_response row, "congregation opens doors for community support," with attendance 104. — word "logged" not in the unit
- [question] Why does the ledger give no cause for any of the three C117 crisis responses? — count "three" not in the unit

Cost: $0.0624

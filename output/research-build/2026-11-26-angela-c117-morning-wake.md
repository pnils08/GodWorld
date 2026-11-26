# Angela Reyes — C117 morning wake, as the model received it

Rebuilt from scripts/cron-desk-run.js seatMorningPlan (system) and the saved W1 packet output/cron-compare/civic_c117_angela-reyes_packet-v2_angle.json (user). Identity block read live 2026-11-26.

## SYSTEM

```
You are Angela Reyes, 57, a Journalist, Education living in Jack London, Oakland. Your temperament: draws people in, deep with them; somewhat ambitious; casually interested in the teams.

You're married.

Former teacher who still has her gradebook from her last year in the classroom. Believes "regular" is the most important word in education reporting — when schools are stable, that IS the story. Empathetic, detail-rich. Interviews teachers by name, school, and years of experience. Finds the story in what teachers notice first — behavioral shifts, attendance patterns, classroom moments that signal something larger. Teacher's eye for detail applied to journalism.

Oakland Schools & Youth Programs Reporter, Bay Tribune. Former teacher; covers OUSD, charter schools, youth athletics, after-school programs; strong community relationships. Tone: empathetic, detail-rich.

Your job: you report on Oakland's schools and youth — the classrooms, the teachers, the programs after the bell, and the kids and families living it. Each cycle the engine's schools record is in front of you: every neighborhood's school numbers and enrollment, the schools, colleges and childcare and the people who work there, the youth programs, and the students and families whose week touched school. What you make of it is yours.

Your tools:
- canon_recall(query): what the Tribune has already published on a person, place or topic
- canon_search(query): prior coverage and city records
- citizen_lookup(name): one citizen's ledger profile
- sheet_read(tab, match?): a live city sheet — Neighborhood_Demographics, Community_Programs, Business_Ledger, Initiative_Tracker and the rest
- ask_worker(office, question): ask one of the city's workers — the Superintendent of Schools answers for the schools, the district and its staff and the youth programs; the Deputy Mayor for community development for the community programs and neighborhoods; the City Manager for the city's initiatives and money — about the record they keep; they answer in their own words and you may quote them

This is your morning. Read what you want with your tools, then answer with the plan the Packet asks for.
```

## USER

```
PACKET_JSON
{
 "v": "LEP/2",
 "wake": "W1",
 "actor": {
  "id": "POP-00156",
  "name": "Angela Reyes",
  "role": "desk reporter",
  "desk": "civic"
 },
 "task": {
  "goal": "Decide what, if anything, you want to write this cycle"
 },
 "signal": {
  "kind": "own-pick",
  "hood": null,
  "score": null,
  "src": "the record of C117"
 },
 "exposure": {
  "basis": [
   "own-pick"
  ],
  "candidates": [
   {
    "pop": "POP-00198",
    "name": "Rick Walker",
    "profile": "Rick Walker — K-8 Teacher,Former Line cook — Fruitvale — age 59 — K-8 Teacher,Former Line cook at Oakland City Schools; C117: argued the team's case at work and won",
    "role": "K-8 Teacher,Former Line cook",
    "hood": "Fruitvale",
    "mode": "named",
    "sourceKind": "slice-row",
    "evidence": {
     "source": "output/beats/Neighborhood_Demographics.jsonl @C117",
     "pop": "POP-00198",
     "rowName": "Rick Walker",
     "kind": "slice-row"
    }
   },
   {
    "pop": "POP-00287",
    "name": "Simone Adesanya",
    "profile": "Simone Adesanya — School Principal — Rockridge — age 56 — School Principal at Oakland City Schools; C117: started the application and closed the tab after the first page",
    "role": "School Principal",
    "hood": "Rockridge",
    "mode": "named",
    "sourceKind": "slice-row",
    "evidence": {
     "source": "output/beats/Neighborhood_Demographics.jsonl @C117",
     "pop": "POP-00287",
     "rowName": "Simone Adesanya",
     "kind": "slice-row"
    }
   },
   {
    "pop": "POP-00303",
    "name": "Lee Coo",
    "profile": "Lee Coo — School Psychologist — Piedmont Ave — age 45 — School Psychologist at Oakland City Schools; C117: spent the evening sorting a box of things that used to be someone's near a bench on the hospital grounds",
    "role": "School Psychologist",
    "hood": "Piedmont Ave",
    "mode": "named",
    "sourceKind": "slice-row",
    "evidence": {
     "source": "output/beats/Neighborhood_Demographics.jsonl @C117",
     "pop": "POP-00303",
     "rowName": "Lee Coo",
     "kind": "slice-row"
    }
   },
   {
    "pop": "POP-00305",
    "name": "Rico Fister",
    "profile": "Rico Fister — High School Science Teacher — Rockridge — age 69 — High School Science Teacher at Oakland City Schools; C117: attended a professional development session nearby",
    "role": "High School Science Teacher",
    "hood": "Rockridge",
    "mode": "named",
    "sourceKind": "slice-row",
    "evidence": {
     "source": "output/beats/Neighborhood_Demographics.jsonl @C117",
     "pop": "POP-00305",
     "rowName": "Rico Fister",
     "kind": "slice-row"
    }
   },
   {
    "pop": "POP-00312",
    "name": "Wiu Wiu",
    "profile": "Wiu Wiu — High School Science Teacher — Rockridge — age 70 — High School Science Teacher at Oakland City Schools; C117: felt quietly proud of how they handled something small",
    "role": "High School Science Teacher",
    "hood": "Rockridge",
    "mode": "named",
    "sourceKind": "slice-row",
    "evidence": {
     "source": "output/beats/Neighborhood_Demographics.jsonl @C117",
     "pop": "POP-00312",
     "rowName": "Wiu Wiu",
     "kind": "slice-row"
    }
   },
   {
    "pop": "POP-00317",
    "name": "Lila Bennington",
    "profile": "Lila Bennington — Oakland City Schools Elementary Teacher — Fruitvale — age 53 — Oakland City Schools Elementary Teacher at Oakland City Schools; C117: re-read an old journal page and didn't recognize the handwriting mood",
    "role": "Oakland City Schools Elementary Teacher",
    "hood": "Fruitvale",
    "mode": "named",
    "sourceKind": "slice-row",
    "evidence": {
     "source": "output/beats/Neighborhood_Demographics.jsonl @C117",
     "pop": "POP-00317",
     "rowName": "Lila Bennington",
     "kind": "slice-row"
    }
   },
   {
    "pop": "POP-00325",
    "name": "Isabel Lopes",
    "profile": "Isabel Lopes — ESL Teacher — Fruitvale — age 42 — ESL Teacher at Oakland City Schools; C117: noticed the calendar squares all look alike lately, and couldn't decide if that's peace",
    "role": "ESL Teacher",
    "hood": "Fruitvale",
    "mode": "named",
    "sourceKind": "slice-row",
    "evidence": {
     "source": "output/beats/Neighborhood_Demographics.jsonl @C117",
     "pop": "POP-00325",
     "rowName": "Isabel Lopes",
     "kind": "slice-row"
    }
   },
   {
    "pop": "POP-00352",
    "name": "Kaila Jordache",
    "profile": "Kaila Jordache — GED Program Instructor — Piedmont Ave — age 42 — GED Program Instructor at Oakland City Schools; C117: bought a new A's jersey and a sense of anticipation hangs in the air",
    "role": "GED Program Instructor",
    "hood": "Piedmont Ave",
    "mode": "named",
    "sourceKind": "slice-row",
    "evidence": {
     "source": "output/beats/Neighborhood_Demographics.jsonl @C117",
     "pop": "POP-00352",
     "rowName": "Kaila Jordache",
     "kind": "slice-row"
    }
   },
   {
    "pop": "POP-00499",
    "name": "Jalen Serf",
    "profile": "Jalen Serf — School Psychologist — Piedmont Ave — age 63 — School Psychologist at Oakland City Schools; C117: watched the finish from a packed bar and walked home in a crowd that didn't want to disperse",
    "role": "School Psychologist",
    "hood": "Piedmont Ave",
    "mode": "named",
    "sourceKind": "slice-row",
    "evidence": {
     "source": "output/beats/Neighborhood_Demographics.jsonl @C117",
     "pop": "POP-00499",
     "rowName": "Jalen Serf",
     "kind": "slice-row"
    }
   },
   {
    "pop": "POP-00532",
    "name": "Marcus Whitfield",
    "profile": "Marcus Whitfield — Youth Basketball Coach — Fruitvale — age 34 — Youth Basketball Coach at Oakland City Schools; C117: noticed the new streetlights went in before anyone had to ask near a taqueria patio",
    "role": "Youth Basketball Coach",
    "hood": "Fruitvale",
    "mode": "named",
    "sourceKind": "slice-row",
    "evidence": {
     "source": "output/beats/Neighborhood_Demographics.jsonl @C117",
     "pop": "POP-00532",
     "rowName": "Marcus Whitfield",
     "kind": "slice-row"
    }
   },
   {
    "pop": "POP-00623",
    "name": "Winston Clarke",
    "profile": "Winston Clarke — Retired Teacher — Laurel — age 65 — Retired Teacher at Oakland City Schools; C117: recognized a face from years ago across the street",
    "role": "Retired Teacher",
    "hood": "Laurel",
    "mode": "named",
    "sourceKind": "slice-row",
    "evidence": {
     "source": "output/beats/Neighborhood_Demographics.jsonl @C117",
     "pop": "POP-00623",
     "rowName": "Winston Clarke",
     "kind": "slice-row"
    }
   },
   {
    "pop": "POP-00631",
    "name": "Derry Webb",
    "profile": "Derry Webb — Youth Basketball Coach — Uptown — age 43 — Youth Basketball Coach at Oakland City Schools; C117: noticed the calendar squares all look alike lately, and couldn't decide if that's peace",
    "role": "Youth Basketball Coach",
    "hood": "Uptown",
    "mode": "named",
    "sourceKind": "slice-row",
    "evidence": {
     "source": "output/beats/Neighborhood_Demographics.jsonl @C117",
     "pop": "POP-00631",
     "rowName": "Derry Webb",
     "kind": "slice-row"
    }
   },
   {
    "pop": "POP-00659",
    "name": "Ripley Court",
    "profile": "Ripley Court — STEM Program Coordinator — Rockridge — age 46 — STEM Program Coordinator at Oakland City Schools; C117: weighed a weekend trip against the water heater and picked the water heater",
    "role": "STEM Program Coordinator",
    "hood": "Rockridge",
    "mode": "named",
    "sourceKind": "slice-row",
    "evidence": {
     "source": "output/beats/Neighborhood_Demographics.jsonl @C117",
     "pop": "POP-00659",
     "rowName": "Ripley Court",
     "kind": "slice-row"
    }
   },
   {
    "pop": "POP-00667",
    "name": "Lo Thoop",
    "profile": "Lo Thoop — Creative Writing Teacher — Jack London — age 68 — Creative Writing Teacher at Oakland City Schools; C117: the Oakland Alternative Response Initiative is making waves, with residents feeling safer and more connected than ever.",
    "role": "Creative Writing Teacher",
    "hood": "Jack London",
    "mode": "named",
    "sourceKind": "slice-row",
    "evidence": {
     "source": "output/beats/Neighborhood_Demographics.jsonl @C117",
     "pop": "POP-00667",
     "rowName": "Lo Thoop",
     "kind": "slice-row"
    }
   },
   {
    "pop": "POP-00739",
    "name": "Karem Asante",
    "profile": "Karem Asante — Youth Counselor — West Oakland — age 34 — Youth Counselor at Oakland City Schools; C117: Sat through a meeting at Oakland City Schools where every idea was theirs and none had their name on it.",
    "role": "Youth Counselor",
    "hood": "West Oakland",
    "mode": "named",
    "sourceKind": "slice-row",
    "evidence": {
     "source": "output/beats/Neighborhood_Demographics.jsonl @C117",
     "pop": "POP-00739",
     "rowName": "Karem Asante",
     "kind": "slice-row"
    }
   },
   {
    "pop": "POP-00728",
    "name": "DeShawn Avery",
    "profile": "DeShawn Avery — Community College Student — Fruitvale — age 35 — student, C117 in Fruitvale: found a quiet minute at a vendor by the transit stop and let the week's noise settle",
    "role": "Community College Student",
    "hood": "Fruitvale",
    "mode": "named",
    "sourceKind": "slice-row",
    "evidence": {
     "source": "output/beats/Neighborhood_Demographics.jsonl @C117",
     "pop": "POP-00728",
     "rowName": "DeShawn Avery",
     "kind": "slice-row"
    }
   },
   {
    "pop": "POP-00743",
    "name": "Rick Dillon",
    "profile": "Rick Dillon — Grade Schooler — Piedmont Ave — age 12 — student, C117: moved from Rockridge to Piedmont Ave — leaving Rockridge for a better fit",
    "role": "Grade Schooler",
    "hood": "Piedmont Ave",
    "mode": "named",
    "sourceKind": "slice-row",
    "evidence": {
     "source": "output/beats/Neighborhood_Demographics.jsonl @C117",
     "pop": "POP-00743",
     "rowName": "Rick Dillon",
     "kind": "slice-row"
    }
   },
   {
    "pop": "POP-00989",
    "name": "Nour Santos",
    "profile": "Nour Santos — student — West Oakland — age 5 — student, C117 in West Oakland: picked things back up with Simone Limone",
    "role": "student",
    "hood": "West Oakland",
    "mode": "named",
    "sourceKind": "slice-row",
    "evidence": {
     "source": "output/beats/Neighborhood_Demographics.jsonl @C117",
     "pop": "POP-00989",
     "rowName": "Nour Santos",
     "kind": "slice-row"
    }
   },
   {
    "pop": "POP-01014",
    "name": "Sadie Williams",
    "profile": "Sadie Williams — student — Chinatown — age 8 — student, C117 in Chinatown: had not really talked to Abraham Wright in a while",
    "role": "student",
    "hood": "Chinatown",
    "mode": "named",
    "sourceKind": "slice-row",
    "evidence": {
     "source": "output/beats/Neighborhood_Demographics.jsonl @C117",
     "pop": "POP-01014",
     "rowName": "Sadie Williams",
     "kind": "slice-row"
    }
   },
   {
    "pop": "POP-00983",
    "name": "Riya Wough",
    "profile": "Riya Wough — student — Downtown — age 10 — student, C117 in Downtown: picked things back up with Ally Scott",
    "role": "student",
    "hood": "Downtown",
    "mode": "named",
    "sourceKind": "slice-row",
    "evidence": {
     "source": "output/beats/Neighborhood_Demographics.jsonl @C117",
     "pop": "POP-00983",
     "rowName": "Riya Wough",
     "kind": "slice-row"
    }
   },
   {
    "pop": "POP-01002",
    "name": "Kwame Jumper",
    "profile": "Kwame Jumper — student — Downtown — age 17 — student, C117 in Downtown: had not really talked to Arman Gutierrez in a while",
    "role": "student",
    "hood": "Downtown",
    "mode": "named",
    "sourceKind": "slice-row",
    "evidence": {
     "source": "output/beats/Neighborhood_Demographics.jsonl @C117",
     "pop": "POP-01002",
     "rowName": "Kwame Jumper",
     "kind": "slice-row"
    }
   },
   {
    "pop": "POP-00975",
    "name": "Salma Navarro",
    "profile": "Salma Navarro — student — Temescal — age 13 — student, C117 in Temescal: had not really talked to Lo Thoop in a while",
    "role": "student",
    "hood": "Temescal",
    "mode": "named",
    "sourceKind": "slice-row",
    "evidence": {
     "source": "output/beats/Neighborhood_Demographics.jsonl @C117",
     "pop": "POP-00975",
     "rowName": "Salma Navarro",
     "kind": "slice-row"
    }
   },
   {
    "pop": "POP-01011",
    "name": "Layla Scott",
    "profile": "Layla Scott — student — Lake Merritt — age 3 — student, C117 in Lake Merritt: picked things back up with Brenda Okoro",
    "role": "student",
    "hood": "Lake Merritt",
    "mode": "named",
    "sourceKind": "slice-row",
    "evidence": {
     "source": "output/beats/Neighborhood_Demographics.jsonl @C117",
     "pop": "POP-01011",
     "rowName": "Layla Scott",
     "kind": "slice-row"
    }
   },
   {
    "pop": "POP-00237",
    "name": "Jerry Nelson",
    "profile": "Jerry Nelson — Janitor — Uptown — age 55 — C117 in Uptown: reflected on personal growth and understanding",
    "role": "Janitor",
    "hood": "Uptown",
    "mode": "named",
    "sourceKind": "slice-row",
    "evidence": {
     "source": "output/beats/Neighborhood_Demographics.jsonl @C117",
     "pop": "POP-00237",
     "rowName": "Jerry Nelson",
     "kind": "slice-row"
    }
   },
   {
    "pop": "POP-00242",
    "name": "Jaden Phillips",
    "profile": "Jaden Phillips — Barista — Uptown — age 62 — C117 in Uptown: sought more information due to recent city events",
    "role": "Barista",
    "hood": "Uptown",
    "mode": "named",
    "sourceKind": "slice-row",
    "evidence": {
     "source": "output/beats/Neighborhood_Demographics.jsonl @C117",
     "pop": "POP-00242",
     "rowName": "Jaden Phillips",
     "kind": "slice-row"
    }
   },
   {
    "pop": "POP-00244",
    "name": "Derlik Green",
    "profile": "Derlik Green — Delivery Driver — Downtown — age 42 — C117 in Downtown: felt renewed motivation to learn as the season shifted",
    "role": "Delivery Driver",
    "hood": "Downtown",
    "mode": "named",
    "sourceKind": "slice-row",
    "evidence": {
     "source": "output/beats/Neighborhood_Demographics.jsonl @C117",
     "pop": "POP-00244",
     "rowName": "Derlik Green",
     "kind": "slice-row"
    }
   },
   {
    "pop": "POP-00256",
    "name": "Brady Lopez",
    "profile": "Brady Lopez — Dishwasher — Piedmont Ave — age 59 — C117 in Piedmont Ave: reflected on personal growth and understanding",
    "role": "Dishwasher",
    "hood": "Piedmont Ave",
    "mode": "named",
    "sourceKind": "slice-row",
    "evidence": {
     "source": "output/beats/Neighborhood_Demographics.jsonl @C117",
     "pop": "POP-00256",
     "rowName": "Brady Lopez",
     "kind": "slice-row"
    }
   },
   {
    "pop": "POP-00297",
    "name": "Jorge Wusther",
    "profile": "Jorge Wusther — Nurse aide — Uptown — age 65 — C117 in Uptown: spent time learning new skills informally",
    "role": "Nurse aide",
    "hood": "Uptown",
    "mode": "named",
    "sourceKind": "slice-row",
    "evidence": {
     "source": "output/beats/Neighborhood_Demographics.jsonl @C117",
     "pop": "POP-00297",
     "rowName": "Jorge Wusther",
     "kind": "slice-row"
    }
   },
   {
    "pop": "POP-00320",
    "name": "Cee Lee",
    "profile": "Cee Lee — Autonomous Systems Engineer — Lake Merritt — age 62 — C117 in Lake Merritt: spent time learning new skills informally",
    "role": "Autonomous Systems Engineer",
    "hood": "Lake Merritt",
    "mode": "named",
    "sourceKind": "slice-row",
    "evidence": {
     "source": "output/beats/Neighborhood_Demographics.jsonl @C117",
     "pop": "POP-00320",
     "rowName": "Cee Lee",
     "kind": "slice-row"
    }
   },
   {
    "pop": "POP-00027",
    "name": "Philly Rodriguez",
    "profile": "Philly Rodriguez — Casino Manager — West Oakland — age 30 — C117 in West Oakland: felt energy from seasonal change near a campus quad",
    "role": "Casino Manager",
    "hood": "West Oakland",
    "mode": "named",
    "sourceKind": "slice-row",
    "evidence": {
     "source": "output/beats/Neighborhood_Demographics.jsonl @C117",
     "pop": "POP-00027",
     "rowName": "Philly Rodriguez",
     "kind": "slice-row"
    }
   }
  ]
 },
 "known": [
  {
   "t": "FACT",
   "text": "Current cycle: C117",
   "src": "cron-desk-run explicit cycle argument",
   "id": "F-c5606da08cb9"
  },
  {
   "t": "FACT",
   "text": "Enrollment moved: Piedmont Ave +3 students, East Oakland +2 students, Temescal +2 students, West Oakland +1 students, Laurel +1 students, Adams Point +1 students, Jack London +1 students, Fruitvale +1 students, Downtown +1 students, Grand Lake +1 students, Eastlake +1 students, Dimond +1 students, Glenview +1 students, Chinatown +1 students, Ivy Hill +1 students, San Antonio +1 students vs C116",
   "src": "output/beats/prev/Neighborhood_Demographics.jsonl vs current @C117",
   "id": "F-8f298785e744"
  },
  {
   "t": "FACT",
   "text": "Adams Point: school quality index 7.91 (was 7.92 at C116), graduation 89.48%, college-ready 62.53%, teacher quality 7.9, funding 13,000, 278 students",
   "src": "output/beats/Neighborhood_Demographics.jsonl @C117",
   "id": "F-3d99edee8e88"
  },
  {
   "t": "FACT",
   "text": "Baylight District: school quality index 8.33 (was 8.3 at C116), graduation 91.06%, college-ready 66.38%, teacher quality 8.2, funding 14,500, 65 students",
   "src": "output/beats/Neighborhood_Demographics.jsonl @C117",
   "id": "F-74e32f746215"
  },
  {
   "t": "FACT",
   "text": "Brooklyn: school quality index 8.22 (was 8.2 at C116), graduation 90.82%, college-ready 65.84%, teacher quality 8.2, funding 14,500, 351 students",
   "src": "output/beats/Neighborhood_Demographics.jsonl @C117",
   "id": "F-08f1741f46ad"
  },
  {
   "t": "FACT",
   "text": "Chinatown: school quality index 6.81 (was 6.82 at C116), graduation 85.32%, college-ready 52.47%, teacher quality 6.9, funding 12,000, 315 students",
   "src": "output/beats/Neighborhood_Demographics.jsonl @C117",
   "id": "F-1a3923635bc2"
  },
  {
   "t": "FACT",
   "text": "Dimond: school quality index 6.83 (was 6.84 at C116), graduation 85.32%, college-ready 52.49%, teacher quality 6.9, funding 12,000, 355 students",
   "src": "output/beats/Neighborhood_Demographics.jsonl @C117",
   "id": "F-38ee2cc149ff"
  },
  {
   "t": "FACT",
   "text": "Downtown: school quality index 7.2 (was 7.28 at C116), graduation 88.77%, college-ready 61.65%, teacher quality 8.2, funding 14,500, 245 students",
   "src": "output/beats/Neighborhood_Demographics.jsonl @C117",
   "id": "F-ee109c07faa7"
  },
  {
   "t": "FACT",
   "text": "East Oakland: school quality index 6.57 (was 6.61 at C116), graduation 84.09%, college-ready 49.79%, teacher quality 6.68, funding 11,000, 486 students",
   "src": "output/beats/Neighborhood_Demographics.jsonl @C117",
   "id": "F-6275c5cbd66d"
  },
  {
   "t": "FACT",
   "text": "Eastlake: school quality index 6.9 (was 6.91 at C116), graduation 85.48%, college-ready 52.87%, teacher quality 6.9, funding 12,000, 315 students",
   "src": "output/beats/Neighborhood_Demographics.jsonl @C117",
   "id": "F-693ce4ae7dd4"
  },
  {
   "t": "FACT",
   "text": "Fruitvale: school quality index 7.2 (was 7.3 at C116), graduation 88.2%, college-ready 59.5%, teacher quality 7.9, funding 13,000, 427 students",
   "src": "output/beats/Neighborhood_Demographics.jsonl @C117",
   "id": "F-6d63697f3443"
  },
  {
   "t": "FACT",
   "text": "Glenview: school quality index 6.81 (was 6.83 at C116), graduation 85.31%, college-ready 52.47%, teacher quality 6.9, funding 12,000, 388 students",
   "src": "output/beats/Neighborhood_Demographics.jsonl @C117",
   "id": "F-a713cdf7107a"
  },
  {
   "t": "FACT",
   "text": "Grand Lake: school quality index 7.09 (was 7.18 at C116), graduation 87.84%, college-ready 58.8%, teacher quality 7.9, funding 13,000, 319 students",
   "src": "output/beats/Neighborhood_Demographics.jsonl @C117",
   "id": "F-5150e1cb6c7e"
  },
  {
   "t": "FACT",
   "text": "Ivy Hill: school quality index 6.66 (was 6.69 at C116), graduation 84.26%, college-ready 50.21%, teacher quality 6.68, funding 11,000, 329 students",
   "src": "output/beats/Neighborhood_Demographics.jsonl @C117",
   "id": "F-e1c98943c04d"
  },
  {
   "t": "FACT",
   "text": "Jack London: school quality index 7.3 (was 7.39 at C116), graduation 89.09%, college-ready 62.1%, teacher quality 8.2, funding 14,500, 203 students",
   "src": "output/beats/Neighborhood_Demographics.jsonl @C117",
   "id": "F-b95726fa93bc"
  },
  {
   "t": "FACT",
   "text": "KONO: school quality index 6.85 (was 6.89 at C116), graduation 85.44%, college-ready 52.77%, teacher quality 6.9, funding 12,000, 60 students",
   "src": "output/beats/Neighborhood_Demographics.jsonl @C117",
   "id": "F-998aff65bcd0"
  },
  {
   "t": "FACT",
   "text": "Lake Merritt: school quality index 8.04 (was 8 at C116), graduation 90.2%, college-ready 64.32%, teacher quality 8.2, funding 14,500, 59 students",
   "src": "output/beats/Neighborhood_Demographics.jsonl @C117",
   "id": "F-1b269834dbce"
  },
  {
   "t": "FACT",
   "text": "Laurel: school quality index 7.91 (was 7.92 at C116), graduation 89.46%, college-ready 62.51%, teacher quality 7.9, funding 13,000, 339 students",
   "src": "output/beats/Neighborhood_Demographics.jsonl @C117",
   "id": "F-82c308264f76"
  },
  {
   "t": "FACT",
   "text": "Piedmont Ave: school quality index 8.3 (was 8.28 at C116), graduation 91.69%, college-ready 68.53%, teacher quality 8.2, funding 14,500, 256 students",
   "src": "output/beats/Neighborhood_Demographics.jsonl @C117",
   "id": "F-b3e4889f8764"
  },
  {
   "t": "FACT",
   "text": "Rockridge: school quality index 8.36 (was 8.4 at C116), graduation 93.61%, college-ready 73.53%, teacher quality 9.13, funding 15,000, 250 students",
   "src": "output/beats/Neighborhood_Demographics.jsonl @C117",
   "id": "F-d244ff2117b3"
  },
  {
   "t": "FACT",
   "text": "San Antonio: school quality index 6.6 (was 6.64 at C116), graduation 84.18%, college-ready 50.02%, teacher quality 6.68, funding 11,000, 392 students",
   "src": "output/beats/Neighborhood_Demographics.jsonl @C117",
   "id": "F-b6ceb918f6fa"
  },
  {
   "t": "FACT",
   "text": "Temescal: school quality index 6.21 (was 6.25 at C116), graduation 83.53%, college-ready 53%, teacher quality 6.8, funding 11,500, 316 students",
   "src": "output/beats/Neighborhood_Demographics.jsonl @C117",
   "id": "F-29ec39dc691f"
  },
  {
   "t": "FACT",
   "text": "Uptown: school quality index 7.03 (was 7.12 at C116), graduation 87.63%, college-ready 58.39%, teacher quality 7.9, funding 13,000, 63 students",
   "src": "output/beats/Neighborhood_Demographics.jsonl @C117",
   "id": "F-b4dfe152b4cd"
  },
  {
   "t": "FACT",
   "text": "West Oakland: school quality index 7.92 (was 8 at C116), graduation 90.5%, college-ready 65.07%, teacher quality 8.2, funding 14,500, 327 students",
   "src": "output/beats/Neighborhood_Demographics.jsonl @C117",
   "id": "F-3180bed6e475"
  },
  {
   "t": "FACT",
   "text": "Oakland City Schools (Education), City-wide — 5,201 employees, growing 7.2% a year",
   "src": "output/beats/Business_Ledger.jsonl BIZ-00016 @C117",
   "id": "F-cbba9716c14d"
  },
  {
   "t": "FACT",
   "text": "Oakland Community College District (Education), City-wide — 1,800 employees, growing 7.0% a year",
   "src": "output/beats/Business_Ledger.jsonl BIZ-00035 @C117",
   "id": "F-6777b5db3b99"
  },
  {
   "t": "FACT",
   "text": "Firehouse 29 West Oakland Baseball Academy (Sports), West Oakland — 20 employees, growing 5.0% a year",
   "src": "output/beats/Business_Ledger.jsonl BIZ-00103 @C117",
   "id": "F-e0d51554dfb5"
  },
  {
   "t": "FACT",
   "text": "Harrison Street Chinese School (Education), Chinatown — 15 employees, growing 2.0% a year",
   "src": "output/beats/Business_Ledger.jsonl BIZ-00207 @C117",
   "id": "F-822a124a026c"
  },
  {
   "t": "FACT",
   "text": "Hillside Preparatory (Private School), Rockridge — 15 employees, growing 3.3% a year",
   "src": "output/beats/Business_Ledger.jsonl BIZ-00226 @C117",
   "id": "F-ad25f201cf64"
  },
  {
   "t": "FACT",
   "text": "Early Shift Childcare (Preschool & Early Education), San Antonio — 15 employees, growing 0.6% a year",
   "src": "output/beats/Business_Ledger.jsonl BIZ-00261 @C117",
   "id": "F-c9b54a4ef520"
  },
  {
   "t": "FACT",
   "text": "MacArthur Tutoring Center (Tutoring), Laurel — 15 employees, growing 1.1% a year",
   "src": "output/beats/Business_Ledger.jsonl BIZ-00279 @C117",
   "id": "F-202a6f6063e9"
  },
  {
   "t": "FACT",
   "text": "Laurel Music School (Music School), Laurel — 9 employees, growing 2.4% a year",
   "src": "output/beats/Business_Ledger.jsonl BIZ-00281 @C117",
   "id": "F-b252526e93bf"
  },
  {
   "t": "FACT",
   "text": "Oakland City College — Laurel Campus (Education), Laurel — 15 employees, growing 0.9% a year",
   "src": "output/beats/Business_Ledger.jsonl BIZ-00284 @C117",
   "id": "F-8523cce1a779"
  },
  {
   "t": "FACT",
   "text": "Vinnie Keane Firehouse 29 West Oakland Baseball Academy (youth-sports), West Oakland — founded by Vinnie Keane, since C101",
   "src": "output/beats/Community_Programs.jsonl PRG-002 @C117",
   "id": "F-d8386c125a83"
  },
  {
   "t": "FACT",
   "text": "Mark Aitken Youth Baseball League (youth-sports), East Oakland — founded by Mark Aitken, since C101",
   "src": "output/beats/Community_Programs.jsonl PRG-003 @C117",
   "id": "F-5b7c0e4b71d6"
  },
  {
   "t": "FACT",
   "text": "Fruitvale Summer Speed Series (youth-sports), Fruitvale, since C101",
   "src": "output/beats/Community_Programs.jsonl PRG-004 @C117",
   "id": "F-ab145363d7b4"
  },
  {
   "t": "FACT",
   "text": "Eastside Hoopers Coalition (youth-sports), East Oakland — founded by Marcus Whitfield, since C101",
   "src": "output/beats/Community_Programs.jsonl PRG-005 @C117",
   "id": "F-15dd3d475266"
  },
  {
   "t": "FACT",
   "text": "Keane Auxiliary Flag Football League (youth-sports), West Oakland — founded by Vinnie Keane, since C101",
   "src": "output/beats/Community_Programs.jsonl PRG-006 @C117",
   "id": "F-73dfa42c0293"
  },
  {
   "t": "FACT",
   "text": "Oakland A's Alumni Youth Clinics (youth-sports), Dimond — founded by Mark Aitken, since C101",
   "src": "output/beats/Community_Programs.jsonl PRG-007 @C117",
   "id": "F-5ca0e8720ccc"
  },
  {
   "t": "FACT",
   "text": "Oakland Youth Apprenticeship Pipeline (economic), Baylight District, since C86",
   "src": "output/beats/Community_Programs.jsonl PRG-008 @C117",
   "id": "F-09d9ee8e7bdf"
  },
  {
   "t": "FACT",
   "text": "NeuroCity Youth Lab (tech-education), Downtown — founded by Priya Nair, since C101",
   "src": "output/beats/Community_Programs.jsonl PRG-017 @C117",
   "id": "F-4aff83ff48b4"
  },
  {
   "t": "FACT",
   "text": "Civis Systems Civic Fellows Program (tech-education), West Oakland — founded by Elias Varek, since C96",
   "src": "output/beats/Community_Programs.jsonl PRG-019 @C117",
   "id": "F-ff9b22910a2c"
  },
  {
   "t": "FACT",
   "text": "Foothill Baptist Tabernacle Academy (tech-education), East Oakland, since C88",
   "src": "output/beats/Community_Programs.jsonl PRG-030 @C117",
   "id": "F-4d4aa3997e40"
  },
  {
   "t": "FACT",
   "text": "Darrin Davis Youth Community Events (), City-wide — founded by Darrin Davis",
   "src": "output/beats/Community_Programs.jsonl PRG-033 @C117",
   "id": "F-7658af683162"
  }
 ],
 "limits": {
  "assert": [
   "FACT"
  ],
  "reason": [
   "INTERPRETATION",
   "INTENTION",
   "LEAD"
  ],
  "never": [
   "new named person",
   "new institution",
   "new event",
   "new date",
   "new number"
  ],
  "rule": "A reporter plan may form a hunch, but a hunch is not a fact."
 },
 "output": {
  "format": "json-only",
  "schema": {
   "pass": "true when nothing here is a piece you want to write this cycle; then give only why",
   "chase": "string — what you want to write this cycle and how you will go after it, in your own voice. Not JSON.",
   "focus": "string",
   "why": "string",
   "checks": [
    "string"
   ],
   "targets": [
    {
     "pop": "supplied non-empty candidate pop",
     "question": "string",
     "basis": "string"
    }
   ],
   "interpretation": "string",
   "unverifiedLead": [
    "string"
   ]
  },
  "rule": "A target is someone you want to hear from; each must use a supplied non-empty candidate pop. Do not invent people or identifiers. chase is the human story-doc slot. Do not serialize this plan object into chase."
 }
}
END_PACKET
Return only the output format requested by packet.output.

Return ONLY the JSON requested by packet.output.
```

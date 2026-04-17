# Google Sheets Manifest

**Generated:** 2026-04-17 (S156 refresh; timestamp bug in `crawlSheetsArchive.js` fixed same commit so next run auto-stamps)
**Spreadsheets:** 40 (up from 1 at 2026-02-19 — service account has Drive-archive spreadsheets it didn't previously have. Main engine sheet is `Simulation_Narrative`; others are intake/reference/archive sheets discovered by the crawler.)

**⚠️ S156 SECURITY FINDING:** The regen surfaced a live `ANTHROPIC_API_KEY` in the header cells of several personal Drive spreadsheets (`GitHub_token`, `z_Copy of GitHub_token`, `z_anthropotic jsn` — Mike's reference sheets for storing keys). GitHub secret-scanning blocked the first push. Two mitigations landed in the same commit: (1) all leaked-key occurrences below replaced with `[REDACTED-ANTHROPIC-API-KEY]`; (2) `scripts/crawlSheetsArchive.js` extended with `redactSecrets_()` — every header cell is scrubbed against regex patterns for Anthropic / OpenAI / Supermemory / GitHub / Google / Discord / Slack / Bearer tokens before emission. **Separate action still owed: the key is LIVE in Drive.** Move to `/root/.config/godworld/.env` and delete the Drive copies, or rotate the key.

---

## Bay Tribune

- **ID:** `1MVCJLpU1qs9IAJN6vyzMrzHkvRNl33pYwup_CDd-nGA`
- **Modified:** 2026-04-17T13:48:30.309Z
- **Tabs:** 8

| Tab | Data Rows | Columns | Headers (first 8) |
|-----|-----------|---------|-------------------|
| Feed | 16 | 5 | Date, Author, Title, Tags, SourceFile |
| Press_Pulse_Desk | 7 | 4 | When, Source, Headline, Notes |
| Intake | 7 | 7 | Timestamp, Checksum, Title, Slug, Author, Desk, Notes |
| Press_Drafts | 21 | 8 | Timestamp, Cycle, Reporter, StoryType, SignalSource, SummaryPrompt, DraftText, Status |
| Press_Reporter_Index | 16 | 2 | Beat, Reporter |
| References | 0 | 26 | , , , , , , , , ...(26 total) |
| Media_Packet | 0 | 0 |  |
| Sheet3 | 0 | 0 |  |

---

## Simulation_Narrative

- **ID:** `1-0GNeCzqrDmmOy1wOScryzdRd82syq0Z_wZ7dTH8Bjk`
- **Modified:** 2026-04-17T13:47:50.039Z
- **Tabs:** 66

| Tab | Data Rows | Columns | Headers (first 8) |
|-----|-----------|---------|-------------------|
| Dashboard | 0 | 0 |  |
| World_Population | 1 | 22 | timestamp, totalPopulation, illnessRate, employmentRate, migration, economy, cycle, cycleWeight, ...(22 total) |
| World_Drift_Report | 2 | 22 | Timestamp, totalPopulation, illnessRate, employmentRate, migration, economy, cycle, cycleWeight, ...(22 total) |
| Cycle_Weather | 16 | 11 | CycleID, Type, Temp, Impact, Advisory, Comfort, Mood, Alerts, ...(11 total) |
| Simulation_Calendar | 1 | 6 | SimYear, SimMonth, SimDay, Season, HolidayFlag, Notes |
| Health_Cause_Queue | 3 | 11 | POPID, Name, Status, StatusStartCycle, CyclesSick, Neighborhood, Tier, Age, ...(11 total) |
| Civic_Office_Ledger | 35 | 19 | OfficeId, Title, Type, District, Holder, PopId, TermStart, TermEnd, ...(19 total) |
| Initiative_Tracker | 6 | 28 | InitiativeID, Name, Type, Status, Budget, VoteRequirement, VoteCycle, Projection, ...(28 total) |
| Civic_Sweep_Report | 9 | 15 | Timestamp, CivicRoster, CivicCount, Scandals, Resignations, Retirements, CivicLoad, CycleWeight, ...(15 total) |
| WorldEvents_V3_Ledger | 221 | 29 | Timestamp, Cycle, EventDescription, EventType, Domain, Severity, Neighborhood, ImpactScore, ...(29 total) |
| WorldEvents_Ledger | 277 | 22 | Timestamp, Cycle, Description, Severity, Season, Holiday, WeatherType, WeatherImpact, ...(22 total) |
| Event_Arc_Ledger | 293 | 32 | Timestamp, Cycle, ArcId, Type, Phase, Tension, Neighborhood, DomainTag, ...(32 total) |
| Cultural_Ledger | 38 | 20 | Timestamp, CUL-ID, Name, RoleType, FameCategory, CulturalDomain, Status, UniverseLinks, ...(20 total) |
| Oakland_Sports_Feed | 84 | 20 | Cycle, SeasonType, EventType, TeamsUsed, NamesUsed, Notes, Stats, Team Record, ...(20 total) |
| Chicago_Feed | 56 | 22 | Timestamp, Cycle, GodWorldYear, CycleOfYear, SimMonth, CycleInMonth, Season, Holiday, ...(22 total) |
| Chicago_Sports_Feed | 87 | 20 | Cycle, SeasonType, EventType, TeamsUsed, NamesUsed, Notes, Stats, Team Record, ...(20 total) |
| Chicago_Citizens | 124 | 10 | CitizenId, Name, Age, Gender, Neighborhood, Occupation, Tier, CreatedCycle, ...(10 total) |
| Business_Ledger | 52 | 9 | BIZ_ID, Name, Sector, Neighborhood, Employee_Count,  Avg_Salary ,  Annual_Revenue , Growth_Rate, ...(9 total) |
| Faith_Organizations | 16 | 9 | Organization, FaithTradition, Neighborhood, Founded, Congregation, Leader, Character, ActiveStatus, ...(9 total) |
| Employment_Roster | 658 | 6 | BIZ_ID, POP_ID, CitizenName, RoleType, Status, MappingLayer |
| Faith_Ledger | 125 | 9 | Timestamp, Cycle, Organization, FaithTradition, EventType, EventDescription, Neighborhood, Attendance, ...(9 total) |
| Simulation_Ledger | 686 | 47 | POPID, First, Middle , Last, OriginGame, UNI (y/n), MED (y/n), CIV (y/n), ...(47 total) |
| Bay_Tribune_Oakland | 31 | 6 | POPID, First, Middle , Last, Tier, RoleType |
| As_Roster | 0 | 0 |  |
| LifeHistory_Log | 0 | 0 |  |
| Youth_Events | 0 | 0 |  |
| Generic_Citizens | 0 | 0 |  |
| Economic_Parameters | 0 | 0 |  |
| Neighborhood_Map | 0 | 0 |  |
| Neighborhood_Demographics | 0 | 0 |  |
| Crime_Metrics | 0 | 0 |  |
| Texture_Trigger_Log | 0 | 0 |  |
| Transit_Metrics | 0 | 0 |  |
| Household_Ledger | 529 | 14 | HouseholdId, HeadOfHousehold, HouseholdType, Members, Neighborhood, HousingType, MonthlyRent, HousingCost, ...(14 total) |
| Family_Relationships | 0 | 6 | RelationshipId, Citizen1, Citizen2, RelationshipType, SinceCycle, Status |
| Relationship_Bond_Ledger | 3275 | 19 | Timestamp, Cycle, BondId, CitizenA, CitizenB, BondType, Intensity, Status, ...(19 total) |
| Relationship_Bonds | 212 | 17 | BondId, CitizenA, CitizenB, BondType, Intensity, Status, Origin, DomainTag, ...(17 total) |
| Domain_Tracker | 50 | 31 | Timestamp, Cycle, CIVIC, CRIME, TRANSIT, ECONOMIC, EDUCATION, HEALTH, ...(31 total) |
| Riley_Digest | 89 | 28 | Timestamp, Cycle, IntakeProcessed, CitizensAged, EventsGenerated, Issues, CycleWeight, CycleWeightReason, ...(28 total) |
| Edition_Coverage_Ratings | 14 | 7 | Cycle, Domain, Rating, ArticleCount, Reporter, Tone, Processed |
| Media_Intake | 239 | 7 | Reporter, StoryType, SignalSource, Headline, ArticleText, CulturalMentions, Status |
| Storyline_Intake | 362 | 6 | StorylineType, Description, Neighborhood, RelatedCitizens, Priority, Status |
| Citizen_Usage_Intake | 912 | 6 | CitizenName, POPID, UsageType, Context, Reporter, Status |
| Cycle_Packet | 48 | 3 | Timestamp, Cycle, PacketText |
| Media_Briefing | 21 | 7 | Timestamp, Cycle, Holiday, HolidayPriority, SportsSeason, ElectionWindow, Briefing |
| Press_Drafts | 156 | 20 | Timestamp, Cycle, Reporter, StoryType, SignalSource, SummaryPrompt, DraftText, Status, ...(20 total) |
| Storyline_Tracker | 197 | 25 | Timestamp, CycleAdded, StorylineType, Description, Neighborhood, RelatedCitizens, Priority, Status, ...(25 total) |
| Media_Ledger | 55 | 25 | Timestamp, Cycle, Journalist, NameUsed, FameCategory, CulturalDomain, FameScore, TrendTrajectory, ...(25 total) |
| Citizen_Media_Usage | 546 | 15 | Timestamp, Cycle, CitizenName, UsageType, Context, Reporter, Season, Holiday, ...(15 total) |
| Story_Seed_Deck | 2228 | 19 | Timestamp, Cycle, SeedID, SeedType, Domain, Neighborhood, Priority, SeedText, ...(19 total) |
| Story_Hook_Deck | 393 | 28 | Timestamp, Cycle, HookId, HookType, Domain, Neighborhood, Priority, HookText, ...(28 total) |
| Cycle_Seeds | 14 | 8 | CycleID, Seed, Timestamp, Weather, Holiday, EventCount, PopulationDelta, Checksum |
| NBA_Game_Intake | 41 | 9 | Game, City, Cycle, GameDate, EventType, NamesUsed, RoleType, Details, ...(9 total) |
| MLB_Game_Intake | 76 | 9 | Game, City, Cycle, GameDate, EventType, NamesUsed, RoleType, Details, ...(9 total) |
| Arc_Ledger | 37 | 11 | Timestamp, Cycle, ArcID, ArcType, ArcPhase, ArcTension, Neighborhood, DomainTag, ...(11 total) |
| Engine_Index2 | 130 | 1 | Here are all the .gs files in this project (Simulation_Narrative): |
| Ledger_Index | 45 | 7 | Active, Ledger, Purpose, Cycle_Packet, Project_Document, Feeder , Engine_Notes |
| Engine_Errors | 22 | 5 | Timestamp, Cycle, Phase, Error, Stack |
| Sports_Calendar | 12 | 3 | Month, SeasonState, Notes |
| World_Config | 9 | 3 | Key, Value, Description |
| LifeHistory_Archive | 564 | 7 | Timestamp, POPID, Name, EventTag, EventText, Neighborhood, Cycle |
| /commands | 27 | 5 | claude/skills/, , , , claude
  |
| GitHub_token | 14 | 4 | [REDACTED-ANTHROPIC-API-KEY], Anthroptic API KEY, , curl https://api.anthropic.com/v1/messages \ |
| ToDo | 0 | 0 |  |
| GitHub_Templates | 0 | 0 |  |
| Engine_Index | 0 | 0 |  |

---

## Riley Integrity Dashboard

- **ID:** `19RCVQsDAVIAu0X41DUMyoi2YIAsm4XKqT-PqDTvkmas`
- **Modified:** 2026-04-17T11:27:58.239Z
- **Tabs:** 0

> Error: Quota exceeded for quota metric 'Read requests' and limit 'Read requests per minute per user' of service 'sheets.googleapis.com' for consumer 'project_number:559534329568'.

---

## TheMaker_GW3

- **ID:** `1LcgKRnq2S7lg53irurt6MkVB84OOMhOJ4Ig2nsb218s`
- **Modified:** 2026-04-17T06:58:09.466Z
- **Tabs:** 21

| Tab | Data Rows | Columns | Headers (first 8) |
|-----|-----------|---------|-------------------|
| Dashboard | 0 | 0 |  |
| terminals | 0 | 0 |  |
| Skills & Commands | 0 | 0 |  |
| Stack | 0 | 0 |  |
| md library | 0 | 0 |  |
| Agent Roster | 29 | 1 | AGENT ROSTER |
| Upgrade Guide | 34 | 1 | UPGRADE GUIDE |
| Git & Deploy | 30 | 1 | GIT & DEPLOY REFERENCE |
| Credentials Reference | 26 | 1 | CREDENTIALS REFERENCE |
| z_Basic /commands | 25 | 2 | AMXd^3vd2kHi-J, ?? |
| OpenRouter | 2 | 2 | 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, OpenRouter API |
| Sheet11 | 33 | 2 | AMXd^3vd2kHi-J, droplet |
| Sheet10 | 15 | 1 | ~/.bashrc — new godworld command + tg alias:                                                                                                       
  - Type godworld → creates 4 named tmux windows, attaches                                                                                           
  - Type tg → reattaches if you disconnect                                                                                                           
                                                                                                                                                     
  ~/.tmux.conf — status bar shows:                                                                                                                   
   godworld | 1:research-build | 2:engine-sheet | 3:media | 4:civic     18:42 Apr-05                                                                 
  Active window highlighted in green. Session name is dynamic — shows "mags" in the old session, "godworld" in the new one.                          
                                                                                                                                                     
  Quick reference from inside tmux: |
| SMem | 6 | 0 |  |
| z_Agents1 | 16 | 4 | Agent, Reporter(s), Section, Function |
| z_Sheet4 | 1 | 2 | 559534329568-an7vso0b0nnoij3eso8spj1e079suikq.apps.googleusercontent.com, googleID |
| z_Agents | 27 | 1 | claude/skills/ |
| z_/run-cycle-pulse? | 0 | 0 |  |
| z_Copy of GitHub_token | 19 | 2 | [REDACTED-ANTHROPIC-API-KEY], Anthroptic API KEY |
| z_anthropotic jsn | 12 | 2 | [REDACTED-ANTHROPIC-API-KEY], Anthroptic API KEY |
| z_Copy of GitHub_Templates | 36 | 2 |  , Github Token |

---

## Copy of Simulation_Narrative_City_Hall

- **ID:** `13rJXjDiNRug--Dmsp26GAh56tNZ8kf76VL7TQ7Wpsi4`
- **Modified:** 2026-03-26T03:05:17.934Z
- **Tabs:** 65

| Tab | Data Rows | Columns | Headers (first 8) |
|-----|-----------|---------|-------------------|
| Dashboard | 0 | 0 |  |
| World_Population | 1 | 22 | timestamp, totalPopulation, illnessRate, employmentRate, migration, economy, cycle, cycleWeight, ...(22 total) |
| World_Drift_Report | 1 | 22 | Timestamp, totalPopulation, illnessRate, employmentRate, migration, economy, cycle, cycleWeight, ...(22 total) |
| Cycle_Weather | 14 | 11 | CycleID, Type, Temp, Impact, Advisory, Comfort, Mood, Alerts, ...(11 total) |
| Simulation_Calendar | 1 | 6 | SimYear, SimMonth, SimDay, Season, HolidayFlag, Notes |
| Health_Cause_Queue | 3 | 11 | POPID, Name, Status, StatusStartCycle, CyclesSick, Neighborhood, Tier, Age, ...(11 total) |
| Civic_Office_Ledger | 35 | 19 | OfficeId, Title, Type, District, Holder, PopId, TermStart, TermEnd, ...(19 total) |
| Initiative_Tracker | 6 | 28 | InitiativeID, Name, Type, Status, Budget, VoteRequirement, VoteCycle, Projection, ...(28 total) |
| Civic_Sweep_Report | 8 | 15 | Timestamp, CivicRoster, CivicCount, Scandals, Resignations, Retirements, CivicLoad, CycleWeight, ...(15 total) |
| WorldEvents_V3_Ledger | 203 | 29 | Timestamp, Cycle, EventDescription, EventType, Domain, Severity, Neighborhood, ImpactScore, ...(29 total) |
| WorldEvents_Ledger | 259 | 22 | Timestamp, Cycle, Description, Severity, Season, Holiday, WeatherType, WeatherImpact, ...(22 total) |
| Event_Arc_Ledger | 221 | 32 | Timestamp, Cycle, ArcId, Type, Phase, Tension, Neighborhood, DomainTag, ...(32 total) |
| Cultural_Ledger | 35 | 20 | Timestamp, CUL-ID, Name, RoleType, FameCategory, CulturalDomain, Status, UniverseLinks, ...(20 total) |
| Oakland_Sports_Feed | 76 | 20 | Cycle, SeasonType, EventType, TeamsUsed, NamesUsed, Notes, Stats, Team Record, ...(20 total) |
| Chicago_Feed | 0 | 22 | Timestamp, Cycle, GodWorldYear, CycleOfYear, SimMonth, CycleInMonth, Season, Holiday, ...(22 total) |
| Chicago_Sports_Feed | 0 | 0 |  |
| Chicago_Citizens | 0 | 0 |  |
| Business_Ledger | 0 | 0 |  |
| Faith_Organizations | 0 | 0 |  |
| Employment_Roster | 0 | 0 |  |
| Faith_Ledger | 0 | 0 |  |
| Simulation_Ledger | 676 | 46 | POPID, First, Middle , Last, OriginGame, UNI (y/n), MED (y/n), CIV (y/n), ...(46 total) |
| Bay_Tribune_Oakland | 29 | 6 | POPID, First, Middle , Last, Tier, RoleType |
| As_Roster | 89 | 8 | POPID, First, Middle , Last, Tier, Position, Team, MLB Propspect Rank |
| LifeHistory_Log | 3372 | 7 | Timestamp, POPID, Name, EventTag, EventText, Neighborhood, Cycle |
| Youth_Events | 17 | 11 | Timestamp, Cycle, YouthName, YouthID, Age, EventType, EventDescription, School, ...(11 total) |
| Generic_Citizens | 282 | 10 | First, Last, Age, BirthYear, Neighborhood, Occupation, EmergenceCount, EmergedCycle, ...(10 total) |
| Economic_Parameters | 198 | 10 | Role, Category, IncomeMin, IncomeMax, MedianIncome, EffectiveTaxRate, EconomicOutputCategory, HousingBurdenPct, ...(10 total) |
| Neighborhood_Map | 17 | 27 | Timestamp, Cycle, Neighborhood, NightlifeProfile, NoiseIndex, CrimeIndex, RetailVitality, EventAttractiveness, ...(27 total) |
| Neighborhood_Demographics | 17 | 12 | Neighborhood, Students, Adults, Seniors, Unemployed, Sick, LastUpdated, SchoolQualityIndex, ...(12 total) |
| Crime_Metrics | 17 | 7 | Neighborhood, PropertyCrimeIndex, ViolentCrimeIndex, ResponseTimeAvg, ClearanceRate, IncidentCount, LastUpdated |
| Texture_Trigger_Log | 348 | 12 | Timestamp, Cycle, Domain, Neighborhood, TextureKey, Reason, Intensity, Holiday, ...(12 total) |
| Transit_Metrics | 216 | 8 | Timestamp, Cycle, Station, RidershipVolume, OnTimePerformance, TrafficIndex, Corridor, Notes |
| Household_Ledger | 529 | 14 | HouseholdId, HeadOfHousehold, HouseholdType, Members, Neighborhood, HousingType, MonthlyRent, HousingCost, ...(14 total) |
| Family_Relationships | 0 | 6 | RelationshipId, Citizen1, Citizen2, RelationshipType, SinceCycle, Status |
| Relationship_Bond_Ledger | 2845 | 19 | Timestamp, Cycle, BondId, CitizenA, CitizenB, BondType, Intensity, Status, ...(19 total) |
| Relationship_Bonds | 209 | 17 | BondId, CitizenA, CitizenB, BondType, Intensity, Status, Origin, DomainTag, ...(17 total) |
| Domain_Tracker | 48 | 31 | Timestamp, Cycle, CIVIC, CRIME, TRANSIT, ECONOMIC, EDUCATION, HEALTH, ...(31 total) |
| Media_Intake | 222 | 7 | Reporter, StoryType, SignalSource, Headline, ArticleText, CulturalMentions, Status |
| Storyline_Intake | 353 | 6 | StorylineType, Description, Neighborhood, RelatedCitizens, Priority, Status |
| Citizen_Usage_Intake | 877 | 6 | CitizenName, POPID, UsageType, Context, Reporter, Status |
| Cycle_Packet | 46 | 3 | Timestamp, Cycle, PacketText |
| Media_Briefing | 19 | 7 | Timestamp, Cycle, Holiday, HolidayPriority, SportsSeason, ElectionWindow, Briefing |
| Press_Drafts | 156 | 20 | Timestamp, Cycle, Reporter, StoryType, SignalSource, SummaryPrompt, DraftText, Status, ...(20 total) |
| Storyline_Tracker | 188 | 25 | Timestamp, CycleAdded, StorylineType, Description, Neighborhood, RelatedCitizens, Priority, Status, ...(25 total) |
| Media_Ledger | 45 | 25 | Timestamp, Cycle, Journalist, NameUsed, FameCategory, CulturalDomain, FameScore, TrendTrajectory, ...(25 total) |
| Citizen_Media_Usage | 511 | 15 | Timestamp, Cycle, CitizenName, UsageType, Context, Reporter, Season, Holiday, ...(15 total) |
| Story_Seed_Deck | 1793 | 19 | Timestamp, Cycle, SeedID, SeedType, Domain, Neighborhood, Priority, SeedText, ...(19 total) |
| Story_Hook_Deck | 347 | 28 | Timestamp, Cycle, HookId, HookType, Domain, Neighborhood, Priority, HookText, ...(28 total) |
| Cycle_Seeds | 12 | 8 | CycleID, Seed, Timestamp, Weather, Holiday, EventCount, PopulationDelta, Checksum |
| NBA_Game_Intake | 41 | 9 | Game, City, Cycle, GameDate, EventType, NamesUsed, RoleType, Details, ...(9 total) |
| MLB_Game_Intake | 76 | 9 | Game, City, Cycle, GameDate, EventType, NamesUsed, RoleType, Details, ...(9 total) |
| Arc_Ledger | 37 | 11 | Timestamp, Cycle, ArcID, ArcType, ArcPhase, ArcTension, Neighborhood, DomainTag, ...(11 total) |
| Engine_Index2 | 0 | 0 |  |
| Ledger_Index | 0 | 0 |  |
| Engine_Errors | 0 | 0 |  |
| Riley_Digest | 0 | 0 |  |
| Sports_Calendar | 0 | 0 |  |
| World_Config | 0 | 0 |  |
| LifeHistory_Archive | 0 | 0 |  |
| /commands | 27 | 5 | claude/skills/, , , , claude
  |
| GitHub_token | 14 | 4 | [REDACTED-ANTHROPIC-API-KEY], Anthroptic API KEY, , curl https://api.anthropic.com/v1/messages \ |
| ToDo | 1 | 1 | To Do |
| GitHub_Templates | 35 | 2 |  , Github Token |
| Engine_Index | 80 | 4 | FileName, ModuleGroup, Purpose, Version |

---

## Copy of TheMaker_GW3

- **ID:** `1mH262CVxKFHB2KlSAnLU5wpZnEvjjvCkvSgGrkAL6Lk`
- **Modified:** 2026-03-23T04:38:13.072Z
- **Tabs:** 17

| Tab | Data Rows | Columns | Headers (first 8) |
|-----|-----------|---------|-------------------|
| Dashboard | 37 | 1 | MAGS COMMUNICATION HUB |
| Skills & Commands | 40 | 1 | SKILLS REFERENCE |
| Stack | 36 | 1 | GODWORLD STACK — Service Inventory |
| md library | 568 | 1 | MD LIBRARY — 564 files | Session 105 | 2026-03-20 |
| Agent Roster | 20 | 1 | AGENT ROSTER |
| Upgrade Guide | 34 | 1 | UPGRADE GUIDE |
| Git & Deploy | 30 | 1 | GIT & DEPLOY REFERENCE |
| Credentials Reference | 26 | 1 | CREDENTIALS REFERENCE |
| z_Basic /commands | 28 | 2 | AMXd^3vd2kHi-J, ?? |
| z_Agents1 | 16 | 4 | Agent, Reporter(s), Section, Function |
| z_Sheet4 | 1 | 2 | 559534329568-an7vso0b0nnoij3eso8spj1e079suikq.apps.googleusercontent.com, googleID |
| z_Agents | 27 | 1 | claude/skills/ |
| z_/run-cycle-pulse? | 0 | 0 |  |
| z_Copy of GitHub_token | 19 | 2 | [REDACTED-ANTHROPIC-API-KEY], Anthroptic API KEY |
| SuperMemory | 40 | 1 | SUPERMEMORY ARCHITECTURE — Updated S105 (2026-03-20) |
| z_anthropotic jsn | 12 | 2 | [REDACTED-ANTHROPIC-API-KEY], Anthroptic API KEY |
| z_Copy of GitHub_Templates | 36 | 2 |  , Github Token |

---

## Copy of Simulation_Narrative_clean320

- **ID:** `1lCRkBY5uwDEtIjqTAL6H8Ff686T6cIRoxqqIvuVlymM`
- **Modified:** 2026-03-21T02:33:55.638Z
- **Tabs:** 65

| Tab | Data Rows | Columns | Headers (first 8) |
|-----|-----------|---------|-------------------|
| Dashboard | 0 | 0 |  |
| World_Population | 1 | 22 | timestamp, totalPopulation, illnessRate, employmentRate, migration, economy, cycle, cycleWeight, ...(22 total) |
| World_Drift_Report | 1 | 22 | Timestamp, totalPopulation, illnessRate, employmentRate, migration, economy, cycle, cycleWeight, ...(22 total) |
| Cycle_Weather | 12 | 11 | CycleID, Type, Temp, Impact, Advisory, Comfort, Mood, Alerts, ...(11 total) |
| Simulation_Calendar | 1 | 6 | SimYear, SimMonth, SimDay, Season, HolidayFlag, Notes |
| Health_Cause_Queue | 3 | 11 | POPID, Name, Status, StatusStartCycle, CyclesSick, Neighborhood, Tier, Age, ...(11 total) |
| Civic_Office_Ledger | 35 | 19 | OfficeId, Title, Type, District, Holder, PopId, TermStart, TermEnd, ...(19 total) |
| Initiative_Tracker | 7 | 28 | InitiativeID, Name, Type, Status, Budget, VoteRequirement, VoteCycle, Projection, ...(28 total) |
| Civic_Sweep_Report | 0 | 15 | Timestamp, CivicRoster, CivicCount, Scandals, Resignations, Retirements, CivicLoad, CycleWeight, ...(15 total) |
| WorldEvents_V3_Ledger | 0 | 0 |  |
| WorldEvents_Ledger | 0 | 0 |  |
| Event_Arc_Ledger | 0 | 0 |  |
| Cultural_Ledger | 33 | 20 | Timestamp, CUL-ID, Name, RoleType, FameCategory, CulturalDomain, Status, UniverseLinks, ...(20 total) |
| Oakland_Sports_Feed | 69 | 20 | Cycle, SeasonType, EventType, TeamsUsed, NamesUsed, Notes, Stats, Team Record, ...(20 total) |
| Chicago_Feed | 0 | 0 |  |
| Chicago_Sports_Feed | 0 | 0 |  |
| Chicago_Citizens | 0 | 0 |  |
| Business_Ledger | 51 | 9 | BIZ_ID, Name, Sector, Neighborhood, Employee_Count,  Avg_Salary ,  Annual_Revenue , Growth_Rate, ...(9 total) |
| Faith_Organizations | 16 | 9 | Organization, FaithTradition, Neighborhood, Founded, Congregation, Leader, Character, ActiveStatus, ...(9 total) |
| Employment_Roster | 658 | 6 | BIZ_ID, POP_ID, CitizenName, RoleType, Status, MappingLayer |
| Faith_Ledger | 105 | 9 | Timestamp, Cycle, Organization, FaithTradition, EventType, EventDescription, Neighborhood, Attendance, ...(9 total) |
| Simulation_Ledger | 675 | 46 | POPID, First, Middle , Last, OriginGame, UNI (y/n), MED (y/n), CIV (y/n), ...(46 total) |
| Bay_Tribune_Oakland | 29 | 6 | POPID, First, Middle , Last, Tier, RoleType |
| As_Roster | 89 | 8 | POPID, First, Middle , Last, Tier, Position, Team, MLB Propspect Rank |
| LifeHistory_Log | 3223 | 7 | Timestamp, POPID, Name, EventTag, EventText, Neighborhood, Cycle |
| Youth_Events | 8 | 11 | Timestamp, Cycle, YouthName, YouthID, Age, EventType, EventDescription, School, ...(11 total) |
| Generic_Citizens | 277 | 10 | First, Last, Age, BirthYear, Neighborhood, Occupation, EmergenceCount, EmergedCycle, ...(10 total) |
| Economic_Parameters | 198 | 10 | Role, Category, IncomeMin, IncomeMax, MedianIncome, EffectiveTaxRate, EconomicOutputCategory, HousingBurdenPct, ...(10 total) |
| Neighborhood_Map | 17 | 27 | Timestamp, Cycle, Neighborhood, NightlifeProfile, NoiseIndex, CrimeIndex, RetailVitality, EventAttractiveness, ...(27 total) |
| Neighborhood_Demographics | 17 | 12 | Neighborhood, Students, Adults, Seniors, Unemployed, Sick, LastUpdated, SchoolQualityIndex, ...(12 total) |
| Crime_Metrics | 17 | 7 | Neighborhood, PropertyCrimeIndex, ViolentCrimeIndex, ResponseTimeAvg, ClearanceRate, IncidentCount, LastUpdated |
| Texture_Trigger_Log | 295 | 12 | Timestamp, Cycle, Domain, Neighborhood, TextureKey, Reason, Intensity, Holiday, ...(12 total) |
| Transit_Metrics | 180 | 8 | Timestamp, Cycle, Station, RidershipVolume, OnTimePerformance, TrafficIndex, Corridor, Notes |
| Household_Ledger | 529 | 14 | HouseholdId, HeadOfHousehold, HouseholdType, Members, Neighborhood, HousingType, MonthlyRent, HousingCost, ...(14 total) |
| Family_Relationships | 0 | 6 | RelationshipId, Citizen1, Citizen2, RelationshipType, SinceCycle, Status |
| Relationship_Bond_Ledger | 2424 | 19 | Timestamp, Cycle, BondId, CitizenA, CitizenB, BondType, Intensity, Status, ...(19 total) |
| Relationship_Bonds | 211 | 17 | BondId, CitizenA, CitizenB, BondType, Intensity, Status, Origin, DomainTag, ...(17 total) |
| Domain_Tracker | 46 | 31 | Timestamp, Cycle, CIVIC, CRIME, TRANSIT, ECONOMIC, EDUCATION, HEALTH, ...(31 total) |
| Media_Intake | 222 | 7 | Reporter, StoryType, SignalSource, Headline, ArticleText, CulturalMentions, Status |
| Storyline_Intake | 346 | 6 | StorylineType, Description, Neighborhood, RelatedCitizens, Priority, Status |
| Citizen_Usage_Intake | 852 | 6 | CitizenName, POPID, UsageType, Context, Reporter, Status |
| Cycle_Packet | 44 | 3 | Timestamp, Cycle, PacketText |
| Media_Briefing | 17 | 7 | Timestamp, Cycle, Holiday, HolidayPriority, SportsSeason, ElectionWindow, Briefing |
| Press_Drafts | 156 | 20 | Timestamp, Cycle, Reporter, StoryType, SignalSource, SummaryPrompt, DraftText, Status, ...(20 total) |
| Storyline_Tracker | 170 | 25 | Timestamp, CycleAdded, StorylineType, Description, Neighborhood, RelatedCitizens, Priority, Status, ...(25 total) |
| Media_Ledger | 39 | 25 | Timestamp, Cycle, Journalist, NameUsed, FameCategory, CulturalDomain, FameScore, TrendTrajectory, ...(25 total) |
| Citizen_Media_Usage | 486 | 15 | Timestamp, Cycle, CitizenName, UsageType, Context, Reporter, Season, Holiday, ...(15 total) |
| Story_Seed_Deck | 1346 | 19 | Timestamp, Cycle, SeedID, SeedType, Domain, Neighborhood, Priority, SeedText, ...(19 total) |
| Story_Hook_Deck | 0 | 28 | Timestamp, Cycle, HookId, HookType, Domain, Neighborhood, Priority, HookText, ...(28 total) |
| Cycle_Seeds | 0 | 0 |  |
| NBA_Game_Intake | 0 | 0 |  |
| MLB_Game_Intake | 0 | 0 |  |
| Arc_Ledger | 0 | 0 |  |
| Engine_Index2 | 130 | 1 | Here are all the .gs files in this project (Simulation_Narrative): |
| Ledger_Index | 45 | 7 | Active, Ledger, Purpose, Cycle_Packet, Project_Document, Feeder , Engine_Notes |
| Engine_Errors | 21 | 5 | Timestamp, Cycle, Phase, Error, Stack |
| Riley_Digest | 85 | 28 | Timestamp, Cycle, IntakeProcessed, CitizensAged, EventsGenerated, Issues, CycleWeight, CycleWeightReason, ...(28 total) |
| Sports_Calendar | 12 | 3 | Month, SeasonState, Notes |
| World_Config | 9 | 3 | Key, Value, Description |
| LifeHistory_Archive | 564 | 7 | Timestamp, POPID, Name, EventTag, EventText, Neighborhood, Cycle |
| /commands | 27 | 5 | claude/skills/, , , , claude
  |
| GitHub_token | 14 | 4 | [REDACTED-ANTHROPIC-API-KEY], Anthroptic API KEY, , curl https://api.anthropic.com/v1/messages \ |
| ToDo | 1 | 1 | To Do |
| GitHub_Templates | 35 | 2 |  , Github Token |
| Engine_Index | 80 | 4 | FileName, ModuleGroup, Purpose, Version |

---

## Copy of Simulation_Narrative3_20

- **ID:** `1lz-pF1BGQhwEtSE9cSeaPasIGnrqIpKvZIsF_Tf7uzM`
- **Modified:** 2026-03-21T02:32:38.246Z
- **Tabs:** 65

| Tab | Data Rows | Columns | Headers (first 8) |
|-----|-----------|---------|-------------------|
| Dashboard | 0 | 0 |  |
| World_Population | 1 | 22 | timestamp, totalPopulation, illnessRate, employmentRate, migration, economy, cycle, cycleWeight, ...(22 total) |
| World_Drift_Report | 1 | 22 | Timestamp, totalPopulation, illnessRate, employmentRate, migration, economy, cycle, cycleWeight, ...(22 total) |
| Cycle_Weather | 12 | 11 | CycleID, Type, Temp, Impact, Advisory, Comfort, Mood, Alerts, ...(11 total) |
| Simulation_Calendar | 1 | 6 | SimYear, SimMonth, SimDay, Season, HolidayFlag, Notes |
| Health_Cause_Queue | 3 | 11 | POPID, Name, Status, StatusStartCycle, CyclesSick, Neighborhood, Tier, Age, ...(11 total) |
| Civic_Office_Ledger | 35 | 19 | OfficeId, Title, Type, District, Holder, PopId, TermStart, TermEnd, ...(19 total) |
| Initiative_Tracker | 7 | 28 | InitiativeID, Name, Type, Status, Budget, VoteRequirement, VoteCycle, Projection, ...(28 total) |
| Civic_Sweep_Report | 8 | 15 | Timestamp, CivicRoster, CivicCount, Scandals, Resignations, Retirements, CivicLoad, CycleWeight, ...(15 total) |
| WorldEvents_V3_Ledger | 183 | 29 | Timestamp, Cycle, EventDescription, EventType, Domain, Severity, Neighborhood, ImpactScore, ...(29 total) |
| WorldEvents_Ledger | 239 | 22 | Timestamp, Cycle, Description, Severity, Season, Holiday, WeatherType, WeatherImpact, ...(22 total) |
| Event_Arc_Ledger | 148 | 32 | Timestamp, Cycle, ArcId, Type, Phase, Tension, Neighborhood, DomainTag, ...(32 total) |
| Cultural_Ledger | 33 | 20 | Timestamp, CUL-ID, Name, RoleType, FameCategory, CulturalDomain, Status, UniverseLinks, ...(20 total) |
| Oakland_Sports_Feed | 69 | 20 | Cycle, SeasonType, EventType, TeamsUsed, NamesUsed, Notes, Stats, Team Record, ...(20 total) |
| Chicago_Feed | 52 | 22 | Timestamp, Cycle, GodWorldYear, CycleOfYear, SimMonth, CycleInMonth, Season, Holiday, ...(22 total) |
| Chicago_Sports_Feed | 72 | 20 | Cycle, SeasonType, EventType, TeamsUsed, NamesUsed, Notes, Stats, Team Record, ...(20 total) |
| Chicago_Citizens | 0 | 10 | CitizenId, Name, Age, Gender, Neighborhood, Occupation, Tier, CreatedCycle, ...(10 total) |
| Business_Ledger | 0 | 0 |  |
| Faith_Organizations | 0 | 0 |  |
| Employment_Roster | 0 | 0 |  |
| Faith_Ledger | 0 | 0 |  |
| Simulation_Ledger | 0 | 0 |  |
| Bay_Tribune_Oakland | 0 | 0 |  |
| As_Roster | 0 | 0 |  |
| LifeHistory_Log | 3223 | 7 | Timestamp, POPID, Name, EventTag, EventText, Neighborhood, Cycle |
| Youth_Events | 8 | 11 | Timestamp, Cycle, YouthName, YouthID, Age, EventType, EventDescription, School, ...(11 total) |
| Generic_Citizens | 277 | 10 | First, Last, Age, BirthYear, Neighborhood, Occupation, EmergenceCount, EmergedCycle, ...(10 total) |
| Economic_Parameters | 198 | 10 | Role, Category, IncomeMin, IncomeMax, MedianIncome, EffectiveTaxRate, EconomicOutputCategory, HousingBurdenPct, ...(10 total) |
| Neighborhood_Map | 17 | 27 | Timestamp, Cycle, Neighborhood, NightlifeProfile, NoiseIndex, CrimeIndex, RetailVitality, EventAttractiveness, ...(27 total) |
| Neighborhood_Demographics | 17 | 12 | Neighborhood, Students, Adults, Seniors, Unemployed, Sick, LastUpdated, SchoolQualityIndex, ...(12 total) |
| Crime_Metrics | 17 | 7 | Neighborhood, PropertyCrimeIndex, ViolentCrimeIndex, ResponseTimeAvg, ClearanceRate, IncidentCount, LastUpdated |
| Texture_Trigger_Log | 295 | 12 | Timestamp, Cycle, Domain, Neighborhood, TextureKey, Reason, Intensity, Holiday, ...(12 total) |
| Transit_Metrics | 180 | 8 | Timestamp, Cycle, Station, RidershipVolume, OnTimePerformance, TrafficIndex, Corridor, Notes |
| Household_Ledger | 529 | 14 | HouseholdId, HeadOfHousehold, HouseholdType, Members, Neighborhood, HousingType, MonthlyRent, HousingCost, ...(14 total) |
| Family_Relationships | 0 | 6 | RelationshipId, Citizen1, Citizen2, RelationshipType, SinceCycle, Status |
| Relationship_Bond_Ledger | 2424 | 19 | Timestamp, Cycle, BondId, CitizenA, CitizenB, BondType, Intensity, Status, ...(19 total) |
| Relationship_Bonds | 211 | 17 | BondId, CitizenA, CitizenB, BondType, Intensity, Status, Origin, DomainTag, ...(17 total) |
| Domain_Tracker | 46 | 31 | Timestamp, Cycle, CIVIC, CRIME, TRANSIT, ECONOMIC, EDUCATION, HEALTH, ...(31 total) |
| Media_Intake | 222 | 7 | Reporter, StoryType, SignalSource, Headline, ArticleText, CulturalMentions, Status |
| Storyline_Intake | 346 | 6 | StorylineType, Description, Neighborhood, RelatedCitizens, Priority, Status |
| Citizen_Usage_Intake | 852 | 6 | CitizenName, POPID, UsageType, Context, Reporter, Status |
| Cycle_Packet | 44 | 3 | Timestamp, Cycle, PacketText |
| Media_Briefing | 17 | 7 | Timestamp, Cycle, Holiday, HolidayPriority, SportsSeason, ElectionWindow, Briefing |
| Press_Drafts | 156 | 20 | Timestamp, Cycle, Reporter, StoryType, SignalSource, SummaryPrompt, DraftText, Status, ...(20 total) |
| Storyline_Tracker | 170 | 25 | Timestamp, CycleAdded, StorylineType, Description, Neighborhood, RelatedCitizens, Priority, Status, ...(25 total) |
| Media_Ledger | 39 | 25 | Timestamp, Cycle, Journalist, NameUsed, FameCategory, CulturalDomain, FameScore, TrendTrajectory, ...(25 total) |
| Citizen_Media_Usage | 486 | 15 | Timestamp, Cycle, CitizenName, UsageType, Context, Reporter, Season, Holiday, ...(15 total) |
| Story_Seed_Deck | 1346 | 19 | Timestamp, Cycle, SeedID, SeedType, Domain, Neighborhood, Priority, SeedText, ...(19 total) |
| Story_Hook_Deck | 288 | 28 | Timestamp, Cycle, HookId, HookType, Domain, Neighborhood, Priority, HookText, ...(28 total) |
| Cycle_Seeds | 10 | 8 | CycleID, Seed, Timestamp, Weather, Holiday, EventCount, PopulationDelta, Checksum |
| NBA_Game_Intake | 41 | 9 | Game, City, Cycle, GameDate, EventType, NamesUsed, RoleType, Details, ...(9 total) |
| MLB_Game_Intake | 76 | 9 | Game, City, Cycle, GameDate, EventType, NamesUsed, RoleType, Details, ...(9 total) |
| Arc_Ledger | 37 | 11 | Timestamp, Cycle, ArcID, ArcType, ArcPhase, ArcTension, Neighborhood, DomainTag, ...(11 total) |
| Engine_Index2 | 130 | 1 | Here are all the .gs files in this project (Simulation_Narrative): |
| Ledger_Index | 45 | 7 | Active, Ledger, Purpose, Cycle_Packet, Project_Document, Feeder , Engine_Notes |
| Engine_Errors | 21 | 5 | Timestamp, Cycle, Phase, Error, Stack |
| Riley_Digest | 0 | 0 |  |
| Sports_Calendar | 0 | 0 |  |
| World_Config | 0 | 0 |  |
| LifeHistory_Archive | 0 | 0 |  |
| /commands | 0 | 0 |  |
| GitHub_token | 0 | 0 |  |
| ToDo | 0 | 0 |  |
| GitHub_Templates | 0 | 0 |  |
| Engine_Index | 80 | 4 | FileName, ModuleGroup, Purpose, Version |

---

## Copy of Simulation_Narrative_3_14_repair_test1

- **ID:** `1EX3lBhcqnqyqXhbcjoNLLbjA2sx7gsENEVhEZdOmTN4`
- **Modified:** 2026-03-14T21:02:03.764Z
- **Tabs:** 63

| Tab | Data Rows | Columns | Headers (first 8) |
|-----|-----------|---------|-------------------|
| Dashboard | 0 | 0 |  |
| World_Population | 1 | 22 | timestamp, totalPopulation, illnessRate, employmentRate, migration, economy, cycle, cycleWeight, ...(22 total) |
| World_Drift_Report | 1 | 22 | Timestamp, totalPopulation, illnessRate, employmentRate, migration, economy, cycle, cycleWeight, ...(22 total) |
| Cycle_Weather | 11 | 11 | CycleID, Type, Temp, Impact, Advisory, Comfort, Mood, Alerts, ...(11 total) |
| Simulation_Calendar | 1 | 6 | SimYear, SimMonth, SimDay, Season, HolidayFlag, Notes |
| Health_Cause_Queue | 3 | 11 | POPID, Name, Status, StatusStartCycle, CyclesSick, Neighborhood, Tier, Age, ...(11 total) |
| Civic_Office_Ledger | 35 | 19 | OfficeId, Title, Type, District, Holder, PopId, TermStart, TermEnd, ...(19 total) |
| Initiative_Tracker | 7 | 28 | InitiativeID, Name, Type, Status, Budget, VoteRequirement, VoteCycle, Projection, ...(28 total) |
| Civic_Sweep_Report | 8 | 15 | Timestamp, CivicRoster, CivicCount, Scandals, Resignations, Retirements, CivicLoad, CycleWeight, ...(15 total) |
| WorldEvents_V3_Ledger | 174 | 29 | Timestamp, Cycle, EventDescription, EventType, Domain, Severity, Neighborhood, ImpactScore, ...(29 total) |
| WorldEvents_Ledger | 230 | 22 | Timestamp, Cycle, Description, Severity, Season, Holiday, WeatherType, WeatherImpact, ...(22 total) |
| Event_Arc_Ledger | 111 | 32 | Timestamp, Cycle, ArcId, Type, Phase, Tension, Neighborhood, DomainTag, ...(32 total) |
| Cultural_Ledger | 32 | 20 | Timestamp, CUL-ID, Name, RoleType, FameCategory, CulturalDomain, Status, UniverseLinks, ...(20 total) |
| Oakland_Sports_Feed | 69 | 20 | Cycle, SeasonType, EventType, TeamsUsed, NamesUsed, Notes, Stats, Team Record, ...(20 total) |
| Chicago_Feed | 51 | 22 | Timestamp, Cycle, GodWorldYear, CycleOfYear, SimMonth, CycleInMonth, Season, Holiday, ...(22 total) |
| Chicago_Sports_Feed | 72 | 20 | Cycle, SeasonType, EventType, TeamsUsed, NamesUsed, Notes, Stats, Team Record, ...(20 total) |
| Chicago_Citizens | 123 | 10 | CitizenId, Name, Age, Gender, Neighborhood, Occupation, Tier, CreatedCycle, ...(10 total) |
| Business_Ledger | 51 | 9 | BIZ_ID, Name, Sector, Neighborhood, Employee_Count,  Avg_Salary ,  Annual_Revenue , Growth_Rate, ...(9 total) |
| Faith_Organizations | 16 | 9 | Organization, FaithTradition, Neighborhood, Founded, Congregation, Leader, Character, ActiveStatus, ...(9 total) |
| Employment_Roster | 658 | 6 | BIZ_ID, POP_ID, CitizenName, RoleType, Status, MappingLayer |
| Faith_Ledger | 100 | 9 | Timestamp, Cycle, Organization, FaithTradition, EventType, EventDescription, Neighborhood, Attendance, ...(9 total) |
| Simulation_Ledger | 675 | 45 | POPID, First, Middle , Last, OriginGame, UNI (y/n), MED (y/n), CIV (y/n), ...(45 total) |
| LifeHistory_Log | 3167 | 7 | Timestamp, POPID, Name, EventTag, EventText, Neighborhood, Cycle |
| Youth_Events | 7 | 11 | Timestamp, Cycle, YouthName, YouthID, Age, EventType, EventDescription, School, ...(11 total) |
| Generic_Citizens | 274 | 10 | First, Last, Age, BirthYear, Neighborhood, Occupation, EmergenceCount, EmergedCycle, ...(10 total) |
| Economic_Parameters | 198 | 10 | Role, Category, IncomeMin, IncomeMax, MedianIncome, EffectiveTaxRate, EconomicOutputCategory, HousingBurdenPct, ...(10 total) |
| Neighborhood_Map | 17 | 27 | Timestamp, Cycle, Neighborhood, NightlifeProfile, NoiseIndex, CrimeIndex, RetailVitality, EventAttractiveness, ...(27 total) |
| Neighborhood_Demographics | 17 | 12 | Neighborhood, Students, Adults, Seniors, Unemployed, Sick, LastUpdated, SchoolQualityIndex, ...(12 total) |
| Crime_Metrics | 17 | 7 | Neighborhood, PropertyCrimeIndex, ViolentCrimeIndex, ResponseTimeAvg, ClearanceRate, IncidentCount, LastUpdated |
| Texture_Trigger_Log | 268 | 12 | Timestamp, Cycle, Domain, Neighborhood, TextureKey, Reason, Intensity, Holiday, ...(12 total) |
| Transit_Metrics | 162 | 8 | Timestamp, Cycle, Station, RidershipVolume, OnTimePerformance, TrafficIndex, Corridor, Notes |
| Household_Ledger | 0 | 14 | HouseholdId, HeadOfHousehold, HouseholdType, Members, Neighborhood, HousingType, MonthlyRent, HousingCost, ...(14 total) |
| Family_Relationships | 0 | 0 |  |
| Relationship_Bond_Ledger | 0 | 0 |  |
| Relationship_Bonds | 0 | 0 |  |
| Domain_Tracker | 0 | 0 |  |
| Media_Intake | 0 | 0 |  |
| Storyline_Intake | 0 | 0 |  |
| Citizen_Usage_Intake | 0 | 0 |  |
| Cycle_Packet | 0 | 0 |  |
| Media_Briefing | 16 | 7 | Timestamp, Cycle, Holiday, HolidayPriority, SportsSeason, ElectionWindow, Briefing |
| Press_Drafts | 156 | 20 | Timestamp, Cycle, Reporter, StoryType, SignalSource, SummaryPrompt, DraftText, Status, ...(20 total) |
| Storyline_Tracker | 170 | 25 | Timestamp, CycleAdded, StorylineType, Description, Neighborhood, RelatedCitizens, Priority, Status, ...(25 total) |
| Media_Ledger | 36 | 25 | Timestamp, Cycle, Journalist, NameUsed, FameCategory, CulturalDomain, FameScore, TrendTrajectory, ...(25 total) |
| Citizen_Media_Usage | 1200 | 15 | Timestamp, Cycle, CitizenName, UsageType, Context, Reporter, Season, Holiday, ...(15 total) |
| Story_Seed_Deck | 1145 | 19 | Timestamp, Cycle, SeedID, SeedType, Domain, Neighborhood, Priority, SeedText, ...(19 total) |
| Story_Hook_Deck | 260 | 28 | Timestamp, Cycle, HookId, HookType, Domain, Neighborhood, Priority, HookText, ...(28 total) |
| Cycle_Seeds | 9 | 8 | CycleID, Seed, Timestamp, Weather, Holiday, EventCount, PopulationDelta, Checksum |
| NBA_Game_Intake | 41 | 9 | Game, City, Cycle, GameDate, EventType, NamesUsed, RoleType, Details, ...(9 total) |
| MLB_Game_Intake | 76 | 9 | Game, City, Cycle, GameDate, EventType, NamesUsed, RoleType, Details, ...(9 total) |
| Arc_Ledger | 37 | 11 | Timestamp, Cycle, ArcID, ArcType, ArcPhase, ArcTension, Neighborhood, DomainTag, ...(11 total) |
| Engine_Index2 | 130 | 1 | Here are all the .gs files in this project (Simulation_Narrative): |
| Ledger_Index | 45 | 7 | Active, Ledger, Purpose, Cycle_Packet, Project_Document, Feeder , Engine_Notes |
| Engine_Errors | 21 | 5 | Timestamp, Cycle, Phase, Error, Stack |
| Riley_Digest | 84 | 28 | Timestamp, Cycle, IntakeProcessed, CitizensAged, EventsGenerated, Issues, CycleWeight, CycleWeightReason, ...(28 total) |
| Sports_Calendar | 12 | 3 | Month, SeasonState, Notes |
| World_Config | 9 | 3 | Key, Value, Description |
| LifeHistory_Archive | 564 | 7 | Timestamp, POPID, Name, EventTag, EventText, Neighborhood, Cycle |
| /commands | 27 | 5 | claude/skills/, , , , claude
  |
| GitHub_token | 14 | 4 | [REDACTED-ANTHROPIC-API-KEY], Anthroptic API KEY, , curl https://api.anthropic.com/v1/messages \ |
| ToDo | 1 | 1 | To Do |
| GitHub_Templates | 35 | 2 |  , Github Token |
| Engine_Index | 80 | 4 | FileName, ModuleGroup, Purpose, Version |

---

## Copy of Simulation_Narrative_3_14_prerecovery

- **ID:** `1Hq0Qf1AH6jZRXOS97q8qcYAKsm7rXwLE0ArdCH1sQu8`
- **Modified:** 2026-03-14T17:51:04.304Z
- **Tabs:** 63

| Tab | Data Rows | Columns | Headers (first 8) |
|-----|-----------|---------|-------------------|
| Dashboard | 0 | 0 |  |
| World_Population | 1 | 22 | timestamp, totalPopulation, illnessRate, employmentRate, migration, economy, cycle, cycleWeight, ...(22 total) |
| World_Drift_Report | 1 | 22 | Timestamp, totalPopulation, illnessRate, employmentRate, migration, economy, cycle, cycleWeight, ...(22 total) |
| Cycle_Weather | 11 | 11 | CycleID, Type, Temp, Impact, Advisory, Comfort, Mood, Alerts, ...(11 total) |
| Simulation_Calendar | 1 | 6 | SimYear, SimMonth, SimDay, Season, HolidayFlag, Notes |
| Health_Cause_Queue | 3 | 11 | POPID, Name, Status, StatusStartCycle, CyclesSick, Neighborhood, Tier, Age, ...(11 total) |
| Civic_Office_Ledger | 0 | 19 | OfficeId, Title, Type, District, Holder, PopId, TermStart, TermEnd, ...(19 total) |
| Initiative_Tracker | 0 | 0 |  |
| Civic_Sweep_Report | 0 | 0 |  |
| WorldEvents_V3_Ledger | 0 | 0 |  |
| WorldEvents_Ledger | 0 | 0 |  |
| Event_Arc_Ledger | 0 | 0 |  |
| Cultural_Ledger | 0 | 0 |  |
| Oakland_Sports_Feed | 0 | 0 |  |
| Chicago_Feed | 51 | 22 | Timestamp, Cycle, GodWorldYear, CycleOfYear, SimMonth, CycleInMonth, Season, Holiday, ...(22 total) |
| Chicago_Sports_Feed | 67 | 20 | Cycle, SeasonType, EventType, TeamsUsed, NamesUsed, Notes, Stats, Team Record, ...(20 total) |
| Chicago_Citizens | 123 | 10 | CitizenId, Name, Age, Gender, Neighborhood, Occupation, Tier, CreatedCycle, ...(10 total) |
| Business_Ledger | 51 | 9 | BIZ_ID, Name, Sector, Neighborhood, Employee_Count,  Avg_Salary ,  Annual_Revenue , Growth_Rate, ...(9 total) |
| Faith_Organizations | 16 | 9 | Organization, FaithTradition, Neighborhood, Founded, Congregation, Leader, Character, ActiveStatus, ...(9 total) |
| Employment_Roster | 658 | 6 | BIZ_ID, POP_ID, CitizenName, RoleType, Status, MappingLayer |
| Faith_Ledger | 100 | 9 | Timestamp, Cycle, Organization, FaithTradition, EventType, EventDescription, Neighborhood, Attendance, ...(9 total) |
| Simulation_Ledger | 667 | 45 | POPID, First, Middle , Last, OriginGame, UNI (y/n), MED (y/n), CIV (y/n), ...(45 total) |
| LifeHistory_Log | 3288 | 7 | Timestamp, POPID, Name, EventTag, EventText, Neighborhood, Cycle |
| Youth_Events | 7 | 11 | Timestamp, Cycle, YouthName, YouthID, Age, EventType, EventDescription, School, ...(11 total) |
| Generic_Citizens | 274 | 10 | First, Last, Age, BirthYear, Neighborhood, Occupation, EmergenceCount, EmergedCycle, ...(10 total) |
| Economic_Parameters | 198 | 10 | Role, Category, IncomeMin, IncomeMax, MedianIncome, EffectiveTaxRate, EconomicOutputCategory, HousingBurdenPct, ...(10 total) |
| Neighborhood_Map | 17 | 27 | Timestamp, Cycle, Neighborhood, NightlifeProfile, NoiseIndex, CrimeIndex, RetailVitality, EventAttractiveness, ...(27 total) |
| Neighborhood_Demographics | 17 | 12 | Neighborhood, Students, Adults, Seniors, Unemployed, Sick, LastUpdated, SchoolQualityIndex, ...(12 total) |
| Crime_Metrics | 17 | 7 | Neighborhood, PropertyCrimeIndex, ViolentCrimeIndex, ResponseTimeAvg, ClearanceRate, IncidentCount, LastUpdated |
| Texture_Trigger_Log | 268 | 12 | Timestamp, Cycle, Domain, Neighborhood, TextureKey, Reason, Intensity, Holiday, ...(12 total) |
| Transit_Metrics | 162 | 8 | Timestamp, Cycle, Station, RidershipVolume, OnTimePerformance, TrafficIndex, Corridor, Notes |
| Household_Ledger | 529 | 14 | HouseholdId, HeadOfHousehold, HouseholdType, Members, Neighborhood, HousingType, MonthlyRent, HousingCost, ...(14 total) |
| Family_Relationships | 0 | 6 | RelationshipId, Citizen1, Citizen2, RelationshipType, SinceCycle, Status |
| Relationship_Bond_Ledger | 2213 | 19 | Timestamp, Cycle, BondId, CitizenA, CitizenB, BondType, Intensity, Status, ...(19 total) |
| Relationship_Bonds | 209 | 17 | BondId, CitizenA, CitizenB, BondType, Intensity, Status, Origin, DomainTag, ...(17 total) |
| Domain_Tracker | 45 | 31 | Timestamp, Cycle, CIVIC, CRIME, TRANSIT, ECONOMIC, EDUCATION, HEALTH, ...(31 total) |
| Media_Intake | 210 | 7 | Reporter, StoryType, SignalSource, Headline, ArticleText, CulturalMentions, Status |
| Storyline_Intake | 339 | 6 | StorylineType, Description, Neighborhood, RelatedCitizens, Priority, Status |
| Citizen_Usage_Intake | 807 | 5 | CitizenName, UsageType, Context, Reporter, Status |
| Cycle_Packet | 43 | 3 | Timestamp, Cycle, PacketText |
| Media_Briefing | 16 | 7 | Timestamp, Cycle, Holiday, HolidayPriority, SportsSeason, ElectionWindow, Briefing |
| Press_Drafts | 156 | 20 | Timestamp, Cycle, Reporter, StoryType, SignalSource, SummaryPrompt, DraftText, Status, ...(20 total) |
| Storyline_Tracker | 170 | 25 | Timestamp, CycleAdded, StorylineType, Description, Neighborhood, RelatedCitizens, Priority, Status, ...(25 total) |
| Media_Ledger | 36 | 25 | Timestamp, Cycle, Journalist, NameUsed, FameCategory, CulturalDomain, FameScore, TrendTrajectory, ...(25 total) |
| Citizen_Media_Usage | 1200 | 15 | Timestamp, Cycle, CitizenName, UsageType, Context, Reporter, Season, Holiday, ...(15 total) |
| Story_Seed_Deck | 1145 | 19 | Timestamp, Cycle, SeedID, SeedType, Domain, Neighborhood, Priority, SeedText, ...(19 total) |
| Story_Hook_Deck | 260 | 28 | Timestamp, Cycle, HookId, HookType, Domain, Neighborhood, Priority, HookText, ...(28 total) |
| Cycle_Seeds | 9 | 8 | CycleID, Seed, Timestamp, Weather, Holiday, EventCount, PopulationDelta, Checksum |
| NBA_Game_Intake | 41 | 9 | Game, City, Cycle, GameDate, EventType, NamesUsed, RoleType, Details, ...(9 total) |
| MLB_Game_Intake | 76 | 9 | Game, City, Cycle, GameDate, EventType, NamesUsed, RoleType, Details, ...(9 total) |
| Arc_Ledger | 37 | 11 | Timestamp, Cycle, ArcID, ArcType, ArcPhase, ArcTension, Neighborhood, DomainTag, ...(11 total) |
| Engine_Index2 | 130 | 1 | Here are all the .gs files in this project (Simulation_Narrative): |
| Ledger_Index | 45 | 7 | Active, Ledger, Purpose, Cycle_Packet, Project_Document, Feeder , Engine_Notes |
| Engine_Errors | 21 | 5 | Timestamp, Cycle, Phase, Error, Stack |
| Riley_Digest | 84 | 28 | Timestamp, Cycle, IntakeProcessed, CitizensAged, EventsGenerated, Issues, CycleWeight, CycleWeightReason, ...(28 total) |
| Sports_Calendar | 12 | 3 | Month, SeasonState, Notes |
| World_Config | 9 | 3 | Key, Value, Description |
| LifeHistory_Archive | 564 | 7 | Timestamp, POPID, Name, EventTag, EventText, Neighborhood, Cycle |
| /commands | 27 | 5 | claude/skills/, , , , claude
  |
| GitHub_token | 14 | 4 | [REDACTED-ANTHROPIC-API-KEY], Anthroptic API KEY, , curl https://api.anthropic.com/v1/messages \ |
| ToDo | 1 | 1 | To Do |
| GitHub_Templates | 35 | 2 |  , Github Token |
| Engine_Index | 80 | 4 | FileName, ModuleGroup, Purpose, Version |

---

## Copy of Simulation_Narrative - February 25, 11:01 PM

- **ID:** `1ZbCj6sYM4oEQGmfGetmhe6_l1UoisThK9a-d0y678qo`
- **Modified:** 2026-03-13T06:40:14.715Z
- **Tabs:** 58

| Tab | Data Rows | Columns | Headers (first 8) |
|-----|-----------|---------|-------------------|
| Dashboard | 0 | 0 |  |
| World_Population | 1 | 22 | timestamp, totalPopulation, illnessRate, employmentRate, migration, economy, cycle, cycleWeight, ...(22 total) |
| Cycle_Packet | 41 | 3 | Timestamp, Cycle, PacketText |
| Riley_Digest | 82 | 28 | Timestamp, Cycle, IntakeProcessed, CitizensAged, EventsGenerated, Issues, CycleWeight, CycleWeightReason, ...(28 total) |
| WorldEvents_V3_Ledger | 157 | 29 | Timestamp, Cycle, EventDescription, EventType, Domain, Severity, Neighborhood, ImpactScore, ...(29 total) |
| Media_Briefing | 14 | 7 | Timestamp, Cycle, Holiday, HolidayPriority, SportsSeason, ElectionWindow, Briefing |
| Initiative_Tracker | 6 | 24 | InitiativeID, Name, Type, Status, Budget, VoteRequirement, VoteCycle, Projection, ...(24 total) |
| Civic_Office_Ledger | 35 | 19 | OfficeId, Title, Type, District, Holder, PopId, TermStart, TermEnd, ...(19 total) |
| Oakland_Sports_Feed | 56 | 15 | Cycle, SeasonType, EventType, TeamsUsed, NamesUsed, Notes, Stats, Team Record, ...(15 total) |
| Chicago_Sports_Feed | 59 | 15 | Cycle, SeasonType, EventType, TeamsUsed, NamesUsed, Notes, Stats, Team Record, ...(15 total) |
| Chicago_Feed | 49 | 22 | Timestamp, Cycle, GodWorldYear, CycleOfYear, SimMonth, CycleInMonth, Season, Holiday, ...(22 total) |
| Health_Cause_Queue | 3 | 11 | POPID, Name, Status, StatusStartCycle, CyclesSick, Neighborhood, Tier, Age, ...(11 total) |
| Press_Drafts | 156 | 20 | Timestamp, Cycle, Reporter, StoryType, SignalSource, SummaryPrompt, DraftText, Status, ...(20 total) |
| Storyline_Tracker | 170 | 25 | Timestamp, CycleAdded, StorylineType, Description, Neighborhood, RelatedCitizens, Priority, Status, ...(25 total) |
| Cycle_Weather | 9 | 11 | CycleID, Type, Temp, Impact, Advisory, Comfort, Mood, Alerts, ...(11 total) |
| Neighborhood_Demographics | 17 | 12 | Neighborhood, Students, Adults, Seniors, Unemployed, Sick, LastUpdated, SchoolQualityIndex, ...(12 total) |
| Neighborhood_Map | 17 | 27 | Timestamp, Cycle, Neighborhood, NightlifeProfile, NoiseIndex, CrimeIndex, RetailVitality, EventAttractiveness, ...(27 total) |
| Faith_Organizations | 16 | 8 | Organization, FaithTradition, Neighborhood, Founded, Congregation, Leader, Character, ActiveStatus |
| Crime_Metrics | 17 | 7 | Neighborhood, PropertyCrimeIndex, ViolentCrimeIndex, ResponseTimeAvg, ClearanceRate, IncidentCount, LastUpdated |
| Transit_Metrics | 126 | 8 | Timestamp, Cycle, Station, RidershipVolume, OnTimePerformance, TrafficIndex, Corridor, Notes |
| Simulation_Ledger | 630 | 43 | POPID, First, Middle , Last, OriginGame, UNI (y/n), MED (y/n), CIV (y/n), ...(43 total) |
| Generic_Citizens | 268 | 10 | First, Last, Age, BirthYear, Neighborhood, Occupation, EmergenceCount, EmergedCycle, ...(10 total) |
| Cultural_Ledger | 30 | 20 | Timestamp, CUL-ID, Name, RoleType, FameCategory, CulturalDomain, Status, UniverseLinks, ...(20 total) |
| Chicago_Citizens | 106 | 10 | CitizenId, Name, Age, Gender, Neighborhood, Occupation, Tier, CreatedCycle, ...(10 total) |
| Family_Relationships | 0 | 6 | RelationshipId, Citizen1, Citizen2, RelationshipType, SinceCycle, Status |
| Household_Ledger | 2 | 14 | HouseholdId, HeadOfHousehold, HouseholdType, Members, Neighborhood, HousingType, MonthlyRent, HousingCost, ...(14 total) |
| Relationship_Bond_Ledger | 1798 | 19 | Timestamp, Cycle, BondId, CitizenA, CitizenB, BondType, Intensity, Status, ...(19 total) |
| Relationship_Bonds | 179 | 17 | BondId, CitizenA, CitizenB, BondType, Intensity, Status, Origin, DomainTag, ...(17 total) |
| LifeHistory_Log | 3191 | 7 | Timestamp, POPID, Name, EventTag, EventText, Neighborhood, Cycle |
| Youth_Events | 0 | 0 |  |
| Faith_Ledger | 90 | 9 | Timestamp, Cycle, Organization, FaithTradition, EventType, EventDescription, Neighborhood, Attendance, ...(9 total) |
| Media_Ledger | 30 | 25 | Timestamp, Cycle, Journalist, NameUsed, FameCategory, CulturalDomain, FameScore, TrendTrajectory, ...(25 total) |
| Media_Intake | 0 | 0 |  |
| Storyline_Intake | 0 | 0 |  |
| Citizen_Usage_Intake | 0 | 0 |  |
| Citizen_Media_Usage | 0 | 0 |  |
| WorldEvents_Ledger | 0 | 0 |  |
| Story_Seed_Deck | 0 | 0 |  |
| Story_Hook_Deck | 0 | 0 |  |
| Cycle_Seeds | 7 | 8 | CycleID, Seed, Timestamp, Weather, Holiday, EventCount, PopulationDelta, Checksum |
| NBA_Game_Intake | 41 | 9 | Game, City, Cycle, GameDate, EventType, NamesUsed, RoleType, Details, ...(9 total) |
| MLB_Game_Intake | 76 | 9 | Game, City, Cycle, GameDate, EventType, NamesUsed, RoleType, Details, ...(9 total) |
| Domain_Tracker | 43 | 31 | Timestamp, Cycle, CIVIC, CRIME, TRANSIT, ECONOMIC, EDUCATION, HEALTH, ...(31 total) |
| Event_Arc_Ledger | 37 | 32 | Timestamp, Cycle, ArcId, Type, Phase, Tension, Neighborhood, DomainTag, ...(32 total) |
| Arc_Ledger | 37 | 11 | Timestamp, Cycle, ArcID, ArcType, ArcPhase, ArcTension, Neighborhood, DomainTag, ...(11 total) |
| Texture_Trigger_Log | 213 | 12 | Timestamp, Cycle, Domain, Neighborhood, TextureKey, Reason, Intensity, Holiday, ...(12 total) |
| Civic_Sweep_Report | 7 | 15 | Timestamp, CivicRoster, CivicCount, Scandals, Resignations, Retirements, CivicLoad, CycleWeight, ...(15 total) |
| Simulation_Calendar | 1 | 6 | SimYear, SimMonth, SimDay, Season, HolidayFlag, Notes |
| Engine_Index2 | 130 | 1 | Here are all the .gs files in this project (Simulation_Narrative): |
| Ledger_Index | 45 | 7 | Active, Ledger, Purpose, Cycle_Packet, Project_Document, Feeder , Engine_Notes |
| Sports_Calendar | 12 | 3 | Month, SeasonState, Notes |
| World_Config | 9 | 3 | Key, Value, Description |
| Engine_Errors | 21 | 5 | Timestamp, Cycle, Phase, Error, Stack |
| /commands | 27 | 5 | claude/skills/, , , , claude
  |
| GitHub_token | 12 | 4 | [REDACTED-ANTHROPIC-API-KEY], Anthroptic API KEY, , curl https://api.anthropic.com/v1/messages \ |
| GitHub_Templates | 35 | 2 |  , Github Token |
| Engine_Index | 80 | 4 | FileName, ModuleGroup, Purpose, Version |
| LifeHistory_Archive | 564 | 7 | Timestamp, POPID, Name, EventTag, EventText, Neighborhood, Cycle |

---

## Copy of Simulation_Narrative_3_13

- **ID:** `1FZ4I9rav7VDPOQmj48RXRsoNRI9zpE_xUoEZne8lwD0`
- **Modified:** 2026-03-13T06:35:54.869Z
- **Tabs:** 63

| Tab | Data Rows | Columns | Headers (first 8) |
|-----|-----------|---------|-------------------|
| Dashboard | 0 | 0 |  |
| World_Population | 1 | 22 | timestamp, totalPopulation, illnessRate, employmentRate, migration, economy, cycle, cycleWeight, ...(22 total) |
| World_Drift_Report | 1 | 22 | Timestamp, totalPopulation, illnessRate, employmentRate, migration, economy, cycle, cycleWeight, ...(22 total) |
| Cycle_Weather | 11 | 11 | CycleID, Type, Temp, Impact, Advisory, Comfort, Mood, Alerts, ...(11 total) |
| Simulation_Calendar | 1 | 6 | SimYear, SimMonth, SimDay, Season, HolidayFlag, Notes |
| Health_Cause_Queue | 3 | 11 | POPID, Name, Status, StatusStartCycle, CyclesSick, Neighborhood, Tier, Age, ...(11 total) |
| Civic_Office_Ledger | 35 | 19 | OfficeId, Title, Type, District, Holder, PopId, TermStart, TermEnd, ...(19 total) |
| Initiative_Tracker | 7 | 28 | InitiativeID, Name, Type, Status, Budget, VoteRequirement, VoteCycle, Projection, ...(28 total) |
| Civic_Sweep_Report | 8 | 15 | Timestamp, CivicRoster, CivicCount, Scandals, Resignations, Retirements, CivicLoad, CycleWeight, ...(15 total) |
| WorldEvents_V3_Ledger | 174 | 29 | Timestamp, Cycle, EventDescription, EventType, Domain, Severity, Neighborhood, ImpactScore, ...(29 total) |
| WorldEvents_Ledger | 0 | 22 | Timestamp, Cycle, Description, Severity, Season, Holiday, WeatherType, WeatherImpact, ...(22 total) |
| Event_Arc_Ledger | 0 | 0 |  |
| Cultural_Ledger | 0 | 0 |  |
| Oakland_Sports_Feed | 0 | 0 |  |
| Chicago_Feed | 0 | 0 |  |
| Chicago_Sports_Feed | 0 | 0 |  |
| Chicago_Citizens | 0 | 0 |  |
| Business_Ledger | 0 | 0 |  |
| Faith_Organizations | 16 | 9 | Organization, FaithTradition, Neighborhood, Founded, Congregation, Leader, Character, ActiveStatus, ...(9 total) |
| Employment_Roster | 658 | 6 | BIZ_ID, POP_ID, CitizenName, RoleType, Status, MappingLayer |
| Faith_Ledger | 100 | 9 | Timestamp, Cycle, Organization, FaithTradition, EventType, EventDescription, Neighborhood, Attendance, ...(9 total) |
| Simulation_Ledger | 667 | 45 | POPID, First, Middle , Last, OriginGame, UNI (y/n), MED (y/n), CIV (y/n), ...(45 total) |
| LifeHistory_Log | 3288 | 7 | Timestamp, POPID, Name, EventTag, EventText, Neighborhood, Cycle |
| Youth_Events | 7 | 11 | Timestamp, Cycle, YouthName, YouthID, Age, EventType, EventDescription, School, ...(11 total) |
| Generic_Citizens | 274 | 10 | First, Last, Age, BirthYear, Neighborhood, Occupation, EmergenceCount, EmergedCycle, ...(10 total) |
| Economic_Parameters | 198 | 10 | Role, Category, IncomeMin, IncomeMax, MedianIncome, EffectiveTaxRate, EconomicOutputCategory, HousingBurdenPct, ...(10 total) |
| Neighborhood_Map | 17 | 27 | Timestamp, Cycle, Neighborhood, NightlifeProfile, NoiseIndex, CrimeIndex, RetailVitality, EventAttractiveness, ...(27 total) |
| Neighborhood_Demographics | 17 | 12 | Neighborhood, Students, Adults, Seniors, Unemployed, Sick, LastUpdated, SchoolQualityIndex, ...(12 total) |
| Crime_Metrics | 17 | 7 | Neighborhood, PropertyCrimeIndex, ViolentCrimeIndex, ResponseTimeAvg, ClearanceRate, IncidentCount, LastUpdated |
| Texture_Trigger_Log | 268 | 12 | Timestamp, Cycle, Domain, Neighborhood, TextureKey, Reason, Intensity, Holiday, ...(12 total) |
| Transit_Metrics | 162 | 8 | Timestamp, Cycle, Station, RidershipVolume, OnTimePerformance, TrafficIndex, Corridor, Notes |
| Household_Ledger | 529 | 14 | HouseholdId, HeadOfHousehold, HouseholdType, Members, Neighborhood, HousingType, MonthlyRent, HousingCost, ...(14 total) |
| Family_Relationships | 0 | 6 | RelationshipId, Citizen1, Citizen2, RelationshipType, SinceCycle, Status |
| Relationship_Bond_Ledger | 2213 | 19 | Timestamp, Cycle, BondId, CitizenA, CitizenB, BondType, Intensity, Status, ...(19 total) |
| Relationship_Bonds | 209 | 17 | BondId, CitizenA, CitizenB, BondType, Intensity, Status, Origin, DomainTag, ...(17 total) |
| Domain_Tracker | 45 | 31 | Timestamp, Cycle, CIVIC, CRIME, TRANSIT, ECONOMIC, EDUCATION, HEALTH, ...(31 total) |
| Media_Intake | 210 | 7 | Reporter, StoryType, SignalSource, Headline, ArticleText, CulturalMentions, Status |
| Storyline_Intake | 339 | 6 | StorylineType, Description, Neighborhood, RelatedCitizens, Priority, Status |
| Citizen_Usage_Intake | 807 | 5 | CitizenName, UsageType, Context, Reporter, Status |
| Cycle_Packet | 43 | 3 | Timestamp, Cycle, PacketText |
| Media_Briefing | 16 | 7 | Timestamp, Cycle, Holiday, HolidayPriority, SportsSeason, ElectionWindow, Briefing |
| Press_Drafts | 156 | 20 | Timestamp, Cycle, Reporter, StoryType, SignalSource, SummaryPrompt, DraftText, Status, ...(20 total) |
| Storyline_Tracker | 170 | 25 | Timestamp, CycleAdded, StorylineType, Description, Neighborhood, RelatedCitizens, Priority, Status, ...(25 total) |
| Media_Ledger | 36 | 25 | Timestamp, Cycle, Journalist, NameUsed, FameCategory, CulturalDomain, FameScore, TrendTrajectory, ...(25 total) |
| Citizen_Media_Usage | 1200 | 15 | Timestamp, Cycle, CitizenName, UsageType, Context, Reporter, Season, Holiday, ...(15 total) |
| Story_Seed_Deck | 1145 | 19 | Timestamp, Cycle, SeedID, SeedType, Domain, Neighborhood, Priority, SeedText, ...(19 total) |
| Story_Hook_Deck | 260 | 28 | Timestamp, Cycle, HookId, HookType, Domain, Neighborhood, Priority, HookText, ...(28 total) |
| Cycle_Seeds | 9 | 8 | CycleID, Seed, Timestamp, Weather, Holiday, EventCount, PopulationDelta, Checksum |
| NBA_Game_Intake | 41 | 9 | Game, City, Cycle, GameDate, EventType, NamesUsed, RoleType, Details, ...(9 total) |
| MLB_Game_Intake | 76 | 9 | Game, City, Cycle, GameDate, EventType, NamesUsed, RoleType, Details, ...(9 total) |
| Arc_Ledger | 0 | 0 |  |
| Engine_Index2 | 0 | 0 |  |
| Ledger_Index | 0 | 0 |  |
| Engine_Errors | 0 | 0 |  |
| Riley_Digest | 84 | 28 | Timestamp, Cycle, IntakeProcessed, CitizensAged, EventsGenerated, Issues, CycleWeight, CycleWeightReason, ...(28 total) |
| Sports_Calendar | 12 | 3 | Month, SeasonState, Notes |
| World_Config | 9 | 3 | Key, Value, Description |
| LifeHistory_Archive | 564 | 7 | Timestamp, POPID, Name, EventTag, EventText, Neighborhood, Cycle |
| /commands | 27 | 5 | claude/skills/, , , , claude
  |
| GitHub_token | 14 | 4 | [REDACTED-ANTHROPIC-API-KEY], Anthroptic API KEY, , curl https://api.anthropic.com/v1/messages \ |
| ToDo | 1 | 1 | To Do |
| GitHub_Templates | 35 | 2 |  , Github Token |
| Engine_Index | 80 | 4 | FileName, ModuleGroup, Purpose, Version |

---

## Simulation_Narrative_BACKUP_2026-03-01

- **ID:** `1q_DRoRhy0IygEOXWeb0RvPlR2wocBGTPhp1NBnengFE`
- **Modified:** 2026-03-01T17:35:38.510Z
- **Tabs:** 61

| Tab | Data Rows | Columns | Headers (first 8) |
|-----|-----------|---------|-------------------|
| Dashboard | 0 | 0 |  |
| Simulation_Calendar | 1 | 6 | SimYear, SimMonth, SimDay, Season, HolidayFlag, Notes |
| World_Population | 1 | 22 | timestamp, totalPopulation, illnessRate, employmentRate, migration, economy, cycle, cycleWeight, ...(22 total) |
| Cycle_Weather | 9 | 11 | CycleID, Type, Temp, Impact, Advisory, Comfort, Mood, Alerts, ...(11 total) |
| Health_Cause_Queue | 3 | 11 | POPID, Name, Status, StatusStartCycle, CyclesSick, Neighborhood, Tier, Age, ...(11 total) |
| Civic_Office_Ledger | 35 | 19 | OfficeId, Title, Type, District, Holder, PopId, TermStart, TermEnd, ...(19 total) |
| Initiative_Tracker | 6 | 28 | InitiativeID, Name, Type, Status, Budget, VoteRequirement, VoteCycle, Projection, ...(28 total) |
| Civic_Sweep_Report | 7 | 15 | Timestamp, CivicRoster, CivicCount, Scandals, Resignations, Retirements, CivicLoad, CycleWeight, ...(15 total) |
| WorldEvents_V3_Ledger | 157 | 29 | Timestamp, Cycle, EventDescription, EventType, Domain, Severity, Neighborhood, ImpactScore, ...(29 total) |
| WorldEvents_Ledger | 213 | 22 | Timestamp, Cycle, Description, Severity, Season, Holiday, WeatherType, WeatherImpact, ...(22 total) |
| Event_Arc_Ledger | 37 | 32 | Timestamp, Cycle, ArcId, Type, Phase, Tension, Neighborhood, DomainTag, ...(32 total) |
| Cultural_Ledger | 30 | 20 | Timestamp, CUL-ID, Name, RoleType, FameCategory, CulturalDomain, Status, UniverseLinks, ...(20 total) |
| Oakland_Sports_Feed | 56 | 20 | Cycle, SeasonType, EventType, TeamsUsed, NamesUsed, Notes, Stats, Team Record, ...(20 total) |
| Chicago_Feed | 49 | 22 | Timestamp, Cycle, GodWorldYear, CycleOfYear, SimMonth, CycleInMonth, Season, Holiday, ...(22 total) |
| Chicago_Sports_Feed | 64 | 20 | Cycle, SeasonType, EventType, TeamsUsed, NamesUsed, Notes, Stats, Team Record, ...(20 total) |
| Chicago_Citizens | 123 | 10 | CitizenId, Name, Age, Gender, Neighborhood, Occupation, Tier, CreatedCycle, ...(10 total) |
| Business_Ledger | 11 | 9 | BIZ_ID, Name, Sector, Neighborhood, Employee_Count,  Avg_Salary ,  Annual_Revenue , Growth_Rate, ...(9 total) |
| Faith_Organizations | 16 | 8 | Organization, FaithTradition, Neighborhood, Founded, Congregation, Leader, Character, ActiveStatus |
| Faith_Ledger | 90 | 9 | Timestamp, Cycle, Organization, FaithTradition, EventType, EventDescription, Neighborhood, Attendance, ...(9 total) |
| Simulation_Ledger | 639 | 43 | POPID, First, Middle , Last, OriginGame, UNI (y/n), MED (y/n), CIV (y/n), ...(43 total) |
| LifeHistory_Log | 0 | 7 | Timestamp, POPID, Name, EventTag, EventText, Neighborhood, Cycle |
| Youth_Events | 0 | 0 |  |
| Generic_Citizens | 0 | 0 |  |
| Texture_Trigger_Log | 213 | 12 | Timestamp, Cycle, Domain, Neighborhood, TextureKey, Reason, Intensity, Holiday, ...(12 total) |
| Domain_Tracker | 43 | 31 | Timestamp, Cycle, CIVIC, CRIME, TRANSIT, ECONOMIC, EDUCATION, HEALTH, ...(31 total) |
| Neighborhood_Map | 17 | 27 | Timestamp, Cycle, Neighborhood, NightlifeProfile, NoiseIndex, CrimeIndex, RetailVitality, EventAttractiveness, ...(27 total) |
| Neighborhood_Demographics | 17 | 12 | Neighborhood, Students, Adults, Seniors, Unemployed, Sick, LastUpdated, SchoolQualityIndex, ...(12 total) |
| Crime_Metrics | 17 | 7 | Neighborhood, PropertyCrimeIndex, ViolentCrimeIndex, ResponseTimeAvg, ClearanceRate, IncidentCount, LastUpdated |
| Transit_Metrics | 126 | 8 | Timestamp, Cycle, Station, RidershipVolume, OnTimePerformance, TrafficIndex, Corridor, Notes |
| Household_Ledger | 2 | 14 | HouseholdId, HeadOfHousehold, HouseholdType, Members, Neighborhood, HousingType, MonthlyRent, HousingCost, ...(14 total) |
| Family_Relationships | 0 | 6 | RelationshipId, Citizen1, Citizen2, RelationshipType, SinceCycle, Status |
| Relationship_Bond_Ledger | 1798 | 19 | Timestamp, Cycle, BondId, CitizenA, CitizenB, BondType, Intensity, Status, ...(19 total) |
| Relationship_Bonds | 179 | 17 | BondId, CitizenA, CitizenB, BondType, Intensity, Status, Origin, DomainTag, ...(17 total) |
| Media_Intake | 207 | 7 | Reporter, StoryType, SignalSource, Headline, ArticleText, CulturalMentions, Status |
| Storyline_Intake | 318 | 6 | StorylineType, Description, Neighborhood, RelatedCitizens, Priority, Status |
| Citizen_Usage_Intake | 788 | 5 | CitizenName, UsageType, Context, Reporter, Status |
| Cycle_Packet | 41 | 3 | Timestamp, Cycle, PacketText |
| Media_Briefing | 14 | 7 | Timestamp, Cycle, Holiday, HolidayPriority, SportsSeason, ElectionWindow, Briefing |
| Press_Drafts | 156 | 20 | Timestamp, Cycle, Reporter, StoryType, SignalSource, SummaryPrompt, DraftText, Status, ...(20 total) |
| Storyline_Tracker | 170 | 25 | Timestamp, CycleAdded, StorylineType, Description, Neighborhood, RelatedCitizens, Priority, Status, ...(25 total) |
| Media_Ledger | 30 | 25 | Timestamp, Cycle, Journalist, NameUsed, FameCategory, CulturalDomain, FameScore, TrendTrajectory, ...(25 total) |
| Citizen_Media_Usage | 1200 | 15 | Timestamp, Cycle, CitizenName, UsageType, Context, Reporter, Season, Holiday, ...(15 total) |
| Story_Seed_Deck | 808 | 19 | Timestamp, Cycle, SeedID, SeedType, Domain, Neighborhood, Priority, SeedText, ...(19 total) |
| Story_Hook_Deck | 200 | 28 | Timestamp, Cycle, HookId, HookType, Domain, Neighborhood, Priority, HookText, ...(28 total) |
| Cycle_Seeds | 7 | 8 | CycleID, Seed, Timestamp, Weather, Holiday, EventCount, PopulationDelta, Checksum |
| NBA_Game_Intake | 41 | 9 | Game, City, Cycle, GameDate, EventType, NamesUsed, RoleType, Details, ...(9 total) |
| MLB_Game_Intake | 76 | 9 | Game, City, Cycle, GameDate, EventType, NamesUsed, RoleType, Details, ...(9 total) |
| Arc_Ledger | 37 | 11 | Timestamp, Cycle, ArcID, ArcType, ArcPhase, ArcTension, Neighborhood, DomainTag, ...(11 total) |
| Engine_Index2 | 130 | 1 | Here are all the .gs files in this project (Simulation_Narrative): |
| Ledger_Index | 45 | 7 | Active, Ledger, Purpose, Cycle_Packet, Project_Document, Feeder , Engine_Notes |
| Engine_Errors | 21 | 5 | Timestamp, Cycle, Phase, Error, Stack |
| Riley_Digest | 82 | 28 | Timestamp, Cycle, IntakeProcessed, CitizensAged, EventsGenerated, Issues, CycleWeight, CycleWeightReason, ...(28 total) |
| Sports_Calendar | 12 | 3 | Month, SeasonState, Notes |
| World_Config | 9 | 3 | Key, Value, Description |
| /commands | 27 | 5 | claude/skills/, , , , claude
  |
| GitHub_token | 14 | 4 | [REDACTED-ANTHROPIC-API-KEY], Anthroptic API KEY, , curl https://api.anthropic.com/v1/messages \ |
| LifeHistory_Archive | 0 | 7 | Timestamp, POPID, Name, EventTag, EventText, Neighborhood, Cycle |
| ToDo | 1 | 1 | To Do |
| GitHub_Templates | 35 | 2 |  , Github Token |
| Engine_Index | 0 | 4 | FileName, ModuleGroup, Purpose, Version |
| Economic_Parameters | 0 | 0 |  |

---

## Simulation_Narrative_BACKUP_2026-03-01

- **ID:** `17EJ8MpsWeMyQUms0d34utvjMBWYYwi5UQvIVk63gpO8`
- **Modified:** 2026-03-01T06:26:30.520Z
- **Tabs:** 60

| Tab | Data Rows | Columns | Headers (first 8) |
|-----|-----------|---------|-------------------|
| Dashboard | 0 | 0 |  |
| Simulation_Calendar | 1 | 6 | SimYear, SimMonth, SimDay, Season, HolidayFlag, Notes |
| World_Population | 1 | 22 | timestamp, totalPopulation, illnessRate, employmentRate, migration, economy, cycle, cycleWeight, ...(22 total) |
| Cycle_Weather | 9 | 11 | CycleID, Type, Temp, Impact, Advisory, Comfort, Mood, Alerts, ...(11 total) |
| Health_Cause_Queue | 3 | 11 | POPID, Name, Status, StatusStartCycle, CyclesSick, Neighborhood, Tier, Age, ...(11 total) |
| Civic_Office_Ledger | 35 | 19 | OfficeId, Title, Type, District, Holder, PopId, TermStart, TermEnd, ...(19 total) |
| Initiative_Tracker | 6 | 28 | InitiativeID, Name, Type, Status, Budget, VoteRequirement, VoteCycle, Projection, ...(28 total) |
| Civic_Sweep_Report | 7 | 15 | Timestamp, CivicRoster, CivicCount, Scandals, Resignations, Retirements, CivicLoad, CycleWeight, ...(15 total) |
| WorldEvents_V3_Ledger | 157 | 29 | Timestamp, Cycle, EventDescription, EventType, Domain, Severity, Neighborhood, ImpactScore, ...(29 total) |
| WorldEvents_Ledger | 213 | 22 | Timestamp, Cycle, Description, Severity, Season, Holiday, WeatherType, WeatherImpact, ...(22 total) |
| Event_Arc_Ledger | 37 | 32 | Timestamp, Cycle, ArcId, Type, Phase, Tension, Neighborhood, DomainTag, ...(32 total) |
| Cultural_Ledger | 30 | 20 | Timestamp, CUL-ID, Name, RoleType, FameCategory, CulturalDomain, Status, UniverseLinks, ...(20 total) |
| Oakland_Sports_Feed | 56 | 20 | Cycle, SeasonType, EventType, TeamsUsed, NamesUsed, Notes, Stats, Team Record, ...(20 total) |
| Chicago_Feed | 49 | 22 | Timestamp, Cycle, GodWorldYear, CycleOfYear, SimMonth, CycleInMonth, Season, Holiday, ...(22 total) |
| Chicago_Sports_Feed | 64 | 20 | Cycle, SeasonType, EventType, TeamsUsed, NamesUsed, Notes, Stats, Team Record, ...(20 total) |
| Chicago_Citizens | 122 | 10 | CitizenId, Name, Age, Gender, Neighborhood, Occupation, Tier, CreatedCycle, ...(10 total) |
| Business_Ledger | 11 | 9 | BIZ_ID, Name, Sector, Neighborhood, Employee_Count,  Avg_Salary ,  Annual_Revenue , Growth_Rate, ...(9 total) |
| Faith_Organizations | 16 | 8 | Organization, FaithTradition, Neighborhood, Founded, Congregation, Leader, Character, ActiveStatus |
| Faith_Ledger | 90 | 9 | Timestamp, Cycle, Organization, FaithTradition, EventType, EventDescription, Neighborhood, Attendance, ...(9 total) |
| Simulation_Ledger | 639 | 43 | POPID, First, Middle , Last, OriginGame, UNI (y/n), MED (y/n), CIV (y/n), ...(43 total) |
| LifeHistory_Log | 3191 | 7 | Timestamp, POPID, Name, EventTag, EventText, Neighborhood, Cycle |
| Youth_Events | 5 | 11 | Timestamp, Cycle, YouthName, YouthID, Age, EventType, EventDescription, School, ...(11 total) |
| Generic_Citizens | 268 | 10 | First, Last, Age, BirthYear, Neighborhood, Occupation, EmergenceCount, EmergedCycle, ...(10 total) |
| Texture_Trigger_Log | 213 | 12 | Timestamp, Cycle, Domain, Neighborhood, TextureKey, Reason, Intensity, Holiday, ...(12 total) |
| Domain_Tracker | 43 | 31 | Timestamp, Cycle, CIVIC, CRIME, TRANSIT, ECONOMIC, EDUCATION, HEALTH, ...(31 total) |
| Neighborhood_Map | 17 | 27 | Timestamp, Cycle, Neighborhood, NightlifeProfile, NoiseIndex, CrimeIndex, RetailVitality, EventAttractiveness, ...(27 total) |
| Neighborhood_Demographics | 17 | 12 | Neighborhood, Students, Adults, Seniors, Unemployed, Sick, LastUpdated, SchoolQualityIndex, ...(12 total) |
| Crime_Metrics | 17 | 7 | Neighborhood, PropertyCrimeIndex, ViolentCrimeIndex, ResponseTimeAvg, ClearanceRate, IncidentCount, LastUpdated |
| Transit_Metrics | 126 | 8 | Timestamp, Cycle, Station, RidershipVolume, OnTimePerformance, TrafficIndex, Corridor, Notes |
| Household_Ledger | 2 | 14 | HouseholdId, HeadOfHousehold, HouseholdType, Members, Neighborhood, HousingType, MonthlyRent, HousingCost, ...(14 total) |
| Family_Relationships | 0 | 6 | RelationshipId, Citizen1, Citizen2, RelationshipType, SinceCycle, Status |
| Relationship_Bond_Ledger | 1798 | 19 | Timestamp, Cycle, BondId, CitizenA, CitizenB, BondType, Intensity, Status, ...(19 total) |
| Relationship_Bonds | 0 | 17 | BondId, CitizenA, CitizenB, BondType, Intensity, Status, Origin, DomainTag, ...(17 total) |
| Media_Intake | 0 | 0 |  |
| Storyline_Intake | 0 | 0 |  |
| Citizen_Usage_Intake | 0 | 0 |  |
| Cycle_Packet | 0 | 0 |  |
| Media_Briefing | 0 | 0 |  |
| Press_Drafts | 0 | 0 |  |
| Storyline_Tracker | 0 | 0 |  |
| Media_Ledger | 30 | 25 | Timestamp, Cycle, Journalist, NameUsed, FameCategory, CulturalDomain, FameScore, TrendTrajectory, ...(25 total) |
| Citizen_Media_Usage | 1200 | 15 | Timestamp, Cycle, CitizenName, UsageType, Context, Reporter, Season, Holiday, ...(15 total) |
| Story_Seed_Deck | 808 | 19 | Timestamp, Cycle, SeedID, SeedType, Domain, Neighborhood, Priority, SeedText, ...(19 total) |
| Story_Hook_Deck | 200 | 28 | Timestamp, Cycle, HookId, HookType, Domain, Neighborhood, Priority, HookText, ...(28 total) |
| Cycle_Seeds | 7 | 8 | CycleID, Seed, Timestamp, Weather, Holiday, EventCount, PopulationDelta, Checksum |
| NBA_Game_Intake | 41 | 9 | Game, City, Cycle, GameDate, EventType, NamesUsed, RoleType, Details, ...(9 total) |
| MLB_Game_Intake | 76 | 9 | Game, City, Cycle, GameDate, EventType, NamesUsed, RoleType, Details, ...(9 total) |
| Arc_Ledger | 37 | 11 | Timestamp, Cycle, ArcID, ArcType, ArcPhase, ArcTension, Neighborhood, DomainTag, ...(11 total) |
| Engine_Index2 | 130 | 1 | Here are all the .gs files in this project (Simulation_Narrative): |
| Ledger_Index | 45 | 7 | Active, Ledger, Purpose, Cycle_Packet, Project_Document, Feeder , Engine_Notes |
| Engine_Errors | 21 | 5 | Timestamp, Cycle, Phase, Error, Stack |
| Riley_Digest | 82 | 28 | Timestamp, Cycle, IntakeProcessed, CitizensAged, EventsGenerated, Issues, CycleWeight, CycleWeightReason, ...(28 total) |
| Sports_Calendar | 12 | 3 | Month, SeasonState, Notes |
| World_Config | 9 | 3 | Key, Value, Description |
| /commands | 27 | 5 | claude/skills/, , , , claude
  |
| GitHub_token | 14 | 4 | [REDACTED-ANTHROPIC-API-KEY], Anthroptic API KEY, , curl https://api.anthropic.com/v1/messages \ |
| LifeHistory_Archive | 564 | 7 | Timestamp, POPID, Name, EventTag, EventText, Neighborhood, Cycle |
| ToDo | 1 | 1 | To Do |
| GitHub_Templates | 35 | 2 |  , Github Token |
| Engine_Index | 80 | 4 | FileName, ModuleGroup, Purpose, Version |

---

## Copy of Simulation_Narrative_84_3_01

- **ID:** `1gLLb480-kcU6YDmALUZ_xlIY8hVgJvhkwgXk-L86FLc`
- **Modified:** 2026-03-01T06:21:19.730Z
- **Tabs:** 60

| Tab | Data Rows | Columns | Headers (first 8) |
|-----|-----------|---------|-------------------|
| Dashboard | 0 | 0 |  |
| Simulation_Calendar | 1 | 6 | SimYear, SimMonth, SimDay, Season, HolidayFlag, Notes |
| World_Population | 1 | 22 | timestamp, totalPopulation, illnessRate, employmentRate, migration, economy, cycle, cycleWeight, ...(22 total) |
| Cycle_Weather | 9 | 11 | CycleID, Type, Temp, Impact, Advisory, Comfort, Mood, Alerts, ...(11 total) |
| Health_Cause_Queue | 3 | 11 | POPID, Name, Status, StatusStartCycle, CyclesSick, Neighborhood, Tier, Age, ...(11 total) |
| Civic_Office_Ledger | 35 | 19 | OfficeId, Title, Type, District, Holder, PopId, TermStart, TermEnd, ...(19 total) |
| Initiative_Tracker | 6 | 28 | InitiativeID, Name, Type, Status, Budget, VoteRequirement, VoteCycle, Projection, ...(28 total) |
| Civic_Sweep_Report | 7 | 15 | Timestamp, CivicRoster, CivicCount, Scandals, Resignations, Retirements, CivicLoad, CycleWeight, ...(15 total) |
| WorldEvents_V3_Ledger | 157 | 29 | Timestamp, Cycle, EventDescription, EventType, Domain, Severity, Neighborhood, ImpactScore, ...(29 total) |
| WorldEvents_Ledger | 0 | 22 | Timestamp, Cycle, Description, Severity, Season, Holiday, WeatherType, WeatherImpact, ...(22 total) |
| Event_Arc_Ledger | 0 | 0 |  |
| Cultural_Ledger | 0 | 0 |  |
| Oakland_Sports_Feed | 0 | 0 |  |
| Chicago_Feed | 0 | 0 |  |
| Chicago_Sports_Feed | 0 | 0 |  |
| Chicago_Citizens | 0 | 0 |  |
| Business_Ledger | 0 | 0 |  |
| Faith_Organizations | 16 | 8 | Organization, FaithTradition, Neighborhood, Founded, Congregation, Leader, Character, ActiveStatus |
| Faith_Ledger | 90 | 9 | Timestamp, Cycle, Organization, FaithTradition, EventType, EventDescription, Neighborhood, Attendance, ...(9 total) |
| Simulation_Ledger | 639 | 43 | POPID, First, Middle , Last, OriginGame, UNI (y/n), MED (y/n), CIV (y/n), ...(43 total) |
| LifeHistory_Log | 3191 | 7 | Timestamp, POPID, Name, EventTag, EventText, Neighborhood, Cycle |
| Youth_Events | 5 | 11 | Timestamp, Cycle, YouthName, YouthID, Age, EventType, EventDescription, School, ...(11 total) |
| Generic_Citizens | 268 | 10 | First, Last, Age, BirthYear, Neighborhood, Occupation, EmergenceCount, EmergedCycle, ...(10 total) |
| Texture_Trigger_Log | 213 | 12 | Timestamp, Cycle, Domain, Neighborhood, TextureKey, Reason, Intensity, Holiday, ...(12 total) |
| Domain_Tracker | 43 | 31 | Timestamp, Cycle, CIVIC, CRIME, TRANSIT, ECONOMIC, EDUCATION, HEALTH, ...(31 total) |
| Neighborhood_Map | 17 | 27 | Timestamp, Cycle, Neighborhood, NightlifeProfile, NoiseIndex, CrimeIndex, RetailVitality, EventAttractiveness, ...(27 total) |
| Neighborhood_Demographics | 17 | 12 | Neighborhood, Students, Adults, Seniors, Unemployed, Sick, LastUpdated, SchoolQualityIndex, ...(12 total) |
| Crime_Metrics | 17 | 7 | Neighborhood, PropertyCrimeIndex, ViolentCrimeIndex, ResponseTimeAvg, ClearanceRate, IncidentCount, LastUpdated |
| Transit_Metrics | 126 | 8 | Timestamp, Cycle, Station, RidershipVolume, OnTimePerformance, TrafficIndex, Corridor, Notes |
| Household_Ledger | 2 | 14 | HouseholdId, HeadOfHousehold, HouseholdType, Members, Neighborhood, HousingType, MonthlyRent, HousingCost, ...(14 total) |
| Family_Relationships | 0 | 6 | RelationshipId, Citizen1, Citizen2, RelationshipType, SinceCycle, Status |
| Relationship_Bond_Ledger | 1798 | 19 | Timestamp, Cycle, BondId, CitizenA, CitizenB, BondType, Intensity, Status, ...(19 total) |
| Relationship_Bonds | 179 | 17 | BondId, CitizenA, CitizenB, BondType, Intensity, Status, Origin, DomainTag, ...(17 total) |
| Media_Intake | 207 | 7 | Reporter, StoryType, SignalSource, Headline, ArticleText, CulturalMentions, Status |
| Storyline_Intake | 318 | 6 | StorylineType, Description, Neighborhood, RelatedCitizens, Priority, Status |
| Citizen_Usage_Intake | 788 | 5 | CitizenName, UsageType, Context, Reporter, Status |
| Cycle_Packet | 41 | 3 | Timestamp, Cycle, PacketText |
| Media_Briefing | 14 | 7 | Timestamp, Cycle, Holiday, HolidayPriority, SportsSeason, ElectionWindow, Briefing |
| Press_Drafts | 156 | 20 | Timestamp, Cycle, Reporter, StoryType, SignalSource, SummaryPrompt, DraftText, Status, ...(20 total) |
| Storyline_Tracker | 170 | 25 | Timestamp, CycleAdded, StorylineType, Description, Neighborhood, RelatedCitizens, Priority, Status, ...(25 total) |
| Media_Ledger | 30 | 25 | Timestamp, Cycle, Journalist, NameUsed, FameCategory, CulturalDomain, FameScore, TrendTrajectory, ...(25 total) |
| Citizen_Media_Usage | 1200 | 15 | Timestamp, Cycle, CitizenName, UsageType, Context, Reporter, Season, Holiday, ...(15 total) |
| Story_Seed_Deck | 808 | 19 | Timestamp, Cycle, SeedID, SeedType, Domain, Neighborhood, Priority, SeedText, ...(19 total) |
| Story_Hook_Deck | 200 | 28 | Timestamp, Cycle, HookId, HookType, Domain, Neighborhood, Priority, HookText, ...(28 total) |
| Cycle_Seeds | 7 | 8 | CycleID, Seed, Timestamp, Weather, Holiday, EventCount, PopulationDelta, Checksum |
| NBA_Game_Intake | 41 | 9 | Game, City, Cycle, GameDate, EventType, NamesUsed, RoleType, Details, ...(9 total) |
| MLB_Game_Intake | 76 | 9 | Game, City, Cycle, GameDate, EventType, NamesUsed, RoleType, Details, ...(9 total) |
| Arc_Ledger | 37 | 11 | Timestamp, Cycle, ArcID, ArcType, ArcPhase, ArcTension, Neighborhood, DomainTag, ...(11 total) |
| Engine_Index2 | 0 | 1 | Here are all the .gs files in this project (Simulation_Narrative): |
| Ledger_Index | 0 | 0 |  |
| Engine_Errors | 0 | 0 |  |
| Riley_Digest | 0 | 0 |  |
| Sports_Calendar | 0 | 0 |  |
| World_Config | 0 | 0 |  |
| /commands | 27 | 5 | claude/skills/, , , , claude
  |
| GitHub_token | 14 | 4 | [REDACTED-ANTHROPIC-API-KEY], Anthroptic API KEY, , curl https://api.anthropic.com/v1/messages \ |
| LifeHistory_Archive | 564 | 7 | Timestamp, POPID, Name, EventTag, EventText, Neighborhood, Cycle |
| ToDo | 1 | 1 | To Do |
| GitHub_Templates | 35 | 2 |  , Github Token |
| Engine_Index | 80 | 4 | FileName, ModuleGroup, Purpose, Version |

---

## Civic_Ledger

- **ID:** `1tlJKS7zRqfKSOuyWsuA9tgXelFXa3BZLd0hO2UyKKxo`
- **Modified:** 2025-12-03T21:30:35.981Z
- **Tabs:** 9

| Tab | Data Rows | Columns | Headers (first 8) |
|-----|-----------|---------|-------------------|
| References | 45 | 0 |  |
| Transparency_Log | 3 | 7 | 11/12/2025 6:12:04, Maria Keen, The Night Watchers, Bay Tribune, 93f65807-2d35-4606-99fd-4461819ac45d, /Civic/Media/Civic_Ledger/Maria_Keen_The_Night_Watchers.txt, Published |
| Cultural_Log | 0 | 0 |  |
| Main | 0 | 0 |  |
| Federation_Return | 0 | 4 | Timestamp, Source, Summary, Status |
| Federation_Inbox | 2 | 5 | Timestamp, Source, Summary, Origin, Status |
| Registry | 2 | 7 | ID, Name, Address, Contact, Status, Notes, Last Updated |
| Creative_Digest | 0 | 8 | timestamp, author, title, type, id, uuid, Registered, tags |
| Sheet6 | 0 | 0 |  |

---

## GodWorld IDs

- **ID:** `19FJZSoG_2u2PPTjIY9QKwz2xAKfLdJZhLloPia3eyX4`
- **Modified:** 2025-12-03T21:22:14.916Z
- **Tabs:** 4

| Tab | Data Rows | Columns | Headers (first 8) |
|-----|-----------|---------|-------------------|
| References | 0 | 0 |  |
| ID Master | 17 | 9 | Active Sheets (apps Scripts):, IDS, Sheet link, app Script link, Vaults:, , Active MASTER_Mirrors.txt and which Sheet contains the script NODE, Mirror file location, ...(9 total) |
| PDFtoText | 0 | 0 |  |
| Master_Mirrors | 0 | 0 |  |

---

## Franchise_Stats_Master

- **ID:** `1MVjJAPWr5pDzivMj04nHsHD8hwO5UlU5AIZBHSZ9Nss`
- **Modified:** 2025-12-03T18:36:04.934Z
- **Tabs:** 74

| Tab | Data Rows | Columns | Headers (first 8) |
|-----|-----------|---------|-------------------|
| References | 21 | 0 |  |
| Import_Staging | 1 | 5 | Player Name, Type, League, Lore, Level |
| Activity_Log | 6 | 2 | 11/4/2025 10:49:50, riley.steward.system@gmail.com |
| Active Season | 0 | 26 | , , , , , , , , ...(26 total) |
| Game_Summary_View | 162 | 13 | GameID, Date, SeasonID, Opponent, Result, Pitcher, Role, IP, ...(13 total) |
| Franchise_History_DB | 1 | 39 | PlayerID, PlayerName, SeasonID, Team, Role, G, PA, AB, ...(39 total) |
| Rotations_DB | 0 | 20 | GameID, Date, SeasonID, PitcherID, PitcherName, Role, IP, H, ...(20 total) |
| Pitching Summary | 162 | 15 | GameID, SeasonID, Date, Opponent, HomeAway, Result, Score, Attendance, ...(15 total) |
| Transactions_DB | 1 | 14 | TransactionID, Date, SeasonID, PlayerID, PlayerName, TeamFrom, TeamTo, Type, ...(14 total) |
| Feeds | 4 | 4 | Feed Name, Feed URL, Format, Notes |
| Player_Card_Master | 4 | 9 | PlayerName, Position, Season, Games, AB, H, HR, RBI, ...(9 total) |
| Hitter_Template | 6 | 1 | PlayerID |
| Pitcher_Template | 6 | 1 | PlayerID |
| Franchise_Roster_Index | 46 | 4 | Player Name, Type, league, lore |
| Template_Audit | 0 | 0 |  |
| Transactions_Summary | 0 | 0 |  |
| Coaches_DB | 0 | 0 |  |
| Coaches_Summary | 0 | 0 |  |
| Lineups_DB | 0 | 0 |  |
| Schedule_DB | 0 | 0 |  |
| Stats | 0 | 0 |  |
| Master | 0 | 0 |  |
| Roster_Dashboard | 5 | 3 | Roster Level, Player Count, Last Updated |
| MLB_Roster | 1 | 5 | PlayerName, Position, Level, Lore, Notes |
| TOP_PROSPECTS_Roster | 0 | 5 | PlayerName, Position, Level, Lore, Notes |
| AAA_Roster | 0 | 5 | PlayerName, Position, Level, Lore, Notes |
| AA_Roster | 0 | 5 | PlayerName, Position, Level, Lore, Notes |
| A_Roster | 0 | 5 | PlayerName, Position, Level, Lore, Notes |
| Martin Richards  | 6 | 1 | PlayerID |
| Mark Aitken  | 6 | 1 | PlayerID |
| Danny Horn  | 6 | 1 | PlayerID |
| Isley Kelley  | 6 | 1 | PlayerID |
| Vladimir Gonzalez  | 6 | 1 | PlayerID |
| José Colón  | 6 | 1 | PlayerID |
| Peter Busch  | 6 | 1 | PlayerID |
| Agustín Rodríguez  | 6 | 1 | PlayerID |
| Darrin Davis  | 6 | 1 | PlayerID |
| Vinnie Keane  | 6 | 1 | PlayerID |
| Jimmy Owens  | 6 | 1 | PlayerID |
| Demarcus Waite  | 6 | 1 | PlayerID |
| Antonio Casto  | 6 | 1 | PlayerID |
| Thomas Gaspar  | 6 | 1 | PlayerID |
| Henry Rivas | 6 | 1 | PlayerID |
| Arturo Ramos  | 6 | 1 | PlayerID |
| John Brever  | 6 | 1 | PlayerID |
| Allen Lopez | 6 | 1 | PlayerID |
| John Ellis  | 6 | 1 | PlayerID |
| Antone Bautista | 6 | 1 | PlayerID |
| Gary Robertson | 6 | 1 | PlayerID |
| Hitoki Ka  | 6 | 1 | PlayerID |
| Ian Devine  | 6 | 1 | PlayerID |
| Edmundo Peña  | 6 | 1 | PlayerID |
| David Sennet | 6 | 1 | PlayerID |
| Cy Newell | 6 | 1 | PlayerID |
| Ross Cabral | 0 | 1 | PlayerID |
| Sergio Aybar | 0 | 0 |  |
| Clark Saryan | 0 | 0 |  |
| Desmond Morton | 0 | 0 |  |
| Frank Reyna | 0 | 0 |  |
| Richie Ramiro | 0 | 0 |  |
| JR Rosada | 6 | 1 | PlayerID |
| Kevin Clark | 6 | 1 | PlayerID |
| Julio Valencia | 0 | 1 | PlayerID |
| Ernesto Quintero | 0 | 0 |  |
| Miguel Casillas | 6 | 1 | PlayerID |
| Tre Morgan | 6 | 1 | PlayerID |
| Orion Kerkering | 6 | 1 | PlayerID |
| Paul Skenes | 6 | 1 | PlayerID |
| Mason Miller | 6 | 1 | PlayerID |
| Carlos Chavez | 6 | 1 | PlayerID |
| Steve Conrad | 6 | 1 | PlayerID |
| Dalton Rushing | 6 | 1 | PlayerID |
| Kris Bubic | 6 | 1 | PlayerID |
| Buford Park | 6 | 1 | PlayerID |

---

## Population_Ledger

- **ID:** `1YYf3npmymXvSyeyw6oxRRmOy5KT7My64vXF2FyotzOo`
- **Modified:** 2025-11-24T04:36:29.513Z
- **Tabs:** 7

| Tab | Data Rows | Columns | Headers (first 8) |
|-----|-----------|---------|-------------------|
| References | 20 | 0 |  |
| Main | 7 | 1 | 📊 Population Ledger Analytics Dashboard |
| Population_Events | 0 | 5 | Timestamp, EventType, Entity, PopID, Details |
| Lineage | 0 | 11 | PopID, LineageID, Parent1_PopID, Parent2_PopID, Spouse_PopID, Children_PopIDs, Tier, Birth_Year, ...(11 total) |
| Registry | 0 | 7 | ID, Name, Address, Contact, Status, Notes, Last Updated |
| Population | 8 | 7 | PopID, Name, Address, Contact, Status, Notes, Last Updated |
| Issued_IDs | 8 | 8 | POPID, UNI, MED, CIV, Tier, #, Notes, Timestamp |

---

## Franchise_Stats_Master - References

- **ID:** `1CgvkdZ0dHwl_C4dTfAYOYKBhfOi4hkCHW5PD_WyOY58`
- **Modified:** 2025-11-14T17:14:08.606Z
- **Tabs:** 1

| Tab | Data Rows | Columns | Headers (first 8) |
|-----|-----------|---------|-------------------|
| Franchise_Stats_Master - References | 21 | 0 |  |

---

## Copy of GodWorld IDs

- **ID:** `1M8w7kCBjwtszeEeQxoB_vK-1pJL1pclqCdCzz1L-q9Y`
- **Modified:** 2025-11-13T18:43:29.932Z
- **Tabs:** 4

| Tab | Data Rows | Columns | Headers (first 8) |
|-----|-----------|---------|-------------------|
| References | 0 | 0 |  |
| ID Master | 17 | 9 | Active Sheets (apps Scripts):, IDS, Sheet link, app Script link, Vaults:, , Active MASTER_Mirrors.txt and which Sheet contains the script NODE, Mirror file location, ...(9 total) |
| PDFtoText | 0 | 0 |  |
| Master_Mirrors | 0 | 0 |  |

---

## GodWorld IDs

- **ID:** `1m2bCrCwxtn-lhaoG116TwdjmR9UnEudsN_JmD-Ajw3M`
- **Modified:** 2025-11-10T00:17:16.855Z
- **Tabs:** 4

| Tab | Data Rows | Columns | Headers (first 8) |
|-----|-----------|---------|-------------------|
| References | 0 | 0 |  |
| ID Master | 17 | 9 | Active Sheets (apps Scripts):, IDS, Sheet link, app Script link, Vaults:, , Active MASTER_Mirrors.txt and which Sheet contains the script NODE, Mirror file location, ...(9 total) |
| PDFtoText | 0 | 0 |  |
| Master_Mirrors | 0 | 0 |  |

---

## tempSheet

- **ID:** `1SDogEhif67y7HK4IBVyEhnMreIo4i-DF76OeszYk4MI`
- **Modified:** 2025-11-03T10:47:37.048Z
- **Tabs:** 1

| Tab | Data Rows | Columns | Headers (first 8) |
|-----|-----------|---------|-------------------|
| Sheet1 | 0 | 0 |  |

---

## Temp Auth Test

- **ID:** `11BGQ7MXCMyPLwocGKmujqkl3xXAPQvJn0Xy2var37bw`
- **Modified:** 2025-11-02T18:59:40.907Z
- **Tabs:** 1

| Tab | Data Rows | Columns | Headers (first 8) |
|-----|-----------|---------|-------------------|
| Sheet1 | 0 | 0 |  |

---

## Education_Civic

- **ID:** `1etkutvvzxQtgL5-Xq17avvn6_I-ihgQLsCSysPcOhR4`
- **Modified:** 2025-11-02T08:56:40.421Z
- **Tabs:** 0

> Error: Quota exceeded for quota metric 'Read requests' and limit 'Read requests per minute per user' of service 'sheets.googleapis.com' for consumer 'project_number:559534329568'.

---

## Governance_Civic

- **ID:** `1iXcxvwlBApvyzOY8vaKfiPKjmT8g3ASspTtHEv-eBQw`
- **Modified:** 2025-11-02T08:56:39.560Z
- **Tabs:** 0

> Error: Quota exceeded for quota metric 'Read requests' and limit 'Read requests per minute per user' of service 'sheets.googleapis.com' for consumer 'project_number:559534329568'.

---

## Faith_Civic

- **ID:** `1dDOsLq52ulfbR5ZoQvJhQaIb1JPhtsmq3iuGnD_l_Zg`
- **Modified:** 2025-11-02T08:56:38.628Z
- **Tabs:** 0

> Error: Quota exceeded for quota metric 'Read requests' and limit 'Read requests per minute per user' of service 'sheets.googleapis.com' for consumer 'project_number:559534329568'.

---

## Health_Civic

- **ID:** `1WQ6izTF-MMDPA9ztfmLSiYCMS72fL-arcJGKdc1stJE`
- **Modified:** 2025-11-02T08:56:37.609Z
- **Tabs:** 0

> Error: Quota exceeded for quota metric 'Read requests' and limit 'Read requests per minute per user' of service 'sheets.googleapis.com' for consumer 'project_number:559534329568'.

---

## Commerce_Civic

- **ID:** `1io-6wVuxLS8SYr2z9sEm2JX4cBEFq1tJURclbHf9ZvE`
- **Modified:** 2025-11-02T08:56:36.811Z
- **Tabs:** 0

> Error: Quota exceeded for quota metric 'Read requests' and limit 'Read requests per minute per user' of service 'sheets.googleapis.com' for consumer 'project_number:559534329568'.

---

## Universe_Ledger

- **ID:** `1fEmBG6aSYRbh0qlINS8tDCsUvbsT2pawRe9Repeo2c4`
- **Modified:** 2025-11-02T08:37:15.581Z
- **Tabs:** 0

> Error: Quota exceeded for quota metric 'Read requests' and limit 'Read requests per minute per user' of service 'sheets.googleapis.com' for consumer 'project_number:559534329568'.

---

## Population_Ledger

- **ID:** `1JyCoX2aAq1nzKNnpqDsLfyDASxO2grrZ2nUQ7KZ74gg`
- **Modified:** 2025-11-02T08:37:14.744Z
- **Tabs:** 0

> Error: Quota exceeded for quota metric 'Read requests' and limit 'Read requests per minute per user' of service 'sheets.googleapis.com' for consumer 'project_number:559534329568'.

---

## Universe_Ledger

- **ID:** `1_Ouwohu0n5K8KYMRcAjQgu12IO8jo_qYwDmFLUBnzm4`
- **Modified:** 2025-11-02T08:24:44.857Z
- **Tabs:** 0

> Error: Quota exceeded for quota metric 'Read requests' and limit 'Read requests per minute per user' of service 'sheets.googleapis.com' for consumer 'project_number:559534329568'.

---

## Population_Ledger

- **ID:** `1CNzDuuFJOOQZym8wUdvR4XvUhKGgLowPasfSHyN62VQ`
- **Modified:** 2025-11-02T08:24:44.063Z
- **Tabs:** 0

> Error: Quota exceeded for quota metric 'Read requests' and limit 'Read requests per minute per user' of service 'sheets.googleapis.com' for consumer 'project_number:559534329568'.

---

## Temp Ledger Auth Test

- **ID:** `1p9eLuaHvTRsVB_YknPoDRyEWZU3bexCIkOkoKhAXOIQ`
- **Modified:** 2025-11-02T07:42:09.644Z
- **Tabs:** 0

> Error: Quota exceeded for quota metric 'Read requests' and limit 'Read requests per minute per user' of service 'sheets.googleapis.com' for consumer 'project_number:559534329568'.

---

## Temp Ledger Auth Test

- **ID:** `1pOWVzFxvtW8hvS6MimKNPJnD1sr99OonyaJBjFhBUN8`
- **Modified:** 2025-11-02T07:40:38.835Z
- **Tabs:** 0

> Error: Quota exceeded for quota metric 'Read requests' and limit 'Read requests per minute per user' of service 'sheets.googleapis.com' for consumer 'project_number:559534329568'.

---

## Temp Auth Sheet

- **ID:** `1Rw8AFy9NaV93PTYYeYXGhmcnGlSJxp__fSkuyZ97xV8`
- **Modified:** 2025-11-02T06:20:44.372Z
- **Tabs:** 1

| Tab | Data Rows | Columns | Headers (first 8) |
|-----|-----------|---------|-------------------|
| Sheet1 | 0 | 0 |  |

---

## Weekly_Dashboard

- **ID:** `1CpJHAqCjyUsf-UcUzyfJpC-eyLoV-TaXBsl4bFXACio`
- **Modified:** 2025-11-02T01:13:14.085Z
- **Tabs:** 1

| Tab | Data Rows | Columns | Headers (first 8) |
|-----|-----------|---------|-------------------|
| Sheet1 | 0 | 5 | Date, Total Entries, Error Count, Check Count, Last Vault Sync |

---

## tempSheet

- **ID:** `1jGZJNYmVxaxnyKFhcVtWkxrMBKUyH2tND_2pEgnfgtQ`
- **Modified:** 2025-11-02T00:06:45.424Z
- **Tabs:** 1

| Tab | Data Rows | Columns | Headers (first 8) |
|-----|-----------|---------|-------------------|
| Sheet1 | 0 | 0 |  |

---

## Untitled spreadsheet

- **ID:** `1HG1BXERx7KaSA4XvK79S3Ea-Mx2NF6vNI5ErJEV4JqQ`
- **Modified:** 2025-10-27T06:51:17.168Z
- **Tabs:** 1

| Tab | Data Rows | Columns | Headers (first 8) |
|-----|-----------|---------|-------------------|
| Sheet1 | 0 | 0 |  |

---

## Oakland_Athletics_24_Player_List_v2.3_with_Batting

- **ID:** `1mOl7d2Zho4dKvoTPf32vBMnMWA28-rEpNrnzhu7kjXw`
- **Modified:** 2025-10-15T23:57:43.446Z
- **Tabs:** 1

| Tab | Data Rows | Columns | Headers (first 8) |
|-----|-----------|---------|-------------------|
| Sheet1 | 24 | 11 | Player, Pos, League, Age, Overall, Potential, AB, H, ...(11 total) |

---

**Totals:** 40 spreadsheets, 845 tabs, ~135664 data rows

*Use `lib/sheets.js` to query any tab: `sheets.getSheetData("TabName")`*
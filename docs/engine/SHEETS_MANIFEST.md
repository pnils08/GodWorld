# Google Sheets Manifest

**Generated:** 2026-02-19T20:51:36.855Z
**Spreadsheets:** 1

---

## Simulation_Narrative

- **ID:** `1-0GNeCzqrDmmOy1wOScryzdRd82syq0Z_wZ7dTH8Bjk`
- **Modified:** 2026-02-19T20:38:44.575Z
- **Tabs:** 79

| Tab | Data Rows | Columns | Headers (first 8) |
|-----|-----------|---------|-------------------|
| Dashboard | 0 | 0 |  |
| World_Population | 1 | 22 | timestamp, totalPopulation, illnessRate, employmentRate, migration, economy, cycle, cycleWeight, ...(22 total) |
| Sports_Feed | 2 | 18 | Team, League, Record, Wins, Losses, SeasonState, PlayoffRound, PlayoffStatus, ...(18 total) |
| Handoff_Output | 4 | 3 | Timestamp, Cycle, HandoffText |
| Cycle_Packet | 40 | 3 | Timestamp, Cycle, PacketText |
| Riley_Digest | 81 | 28 | Timestamp, Cycle, IntakeProcessed, CitizensAged, EventsGenerated, Issues, CycleWeight, CycleWeightReason, ...(28 total) |
| WorldEvents_V3_Ledger | 148 | 29 | Timestamp, Cycle, EventDescription, EventType, Domain, Severity, Neighborhood, ImpactScore, ...(29 total) |
| Media_Briefing | 13 | 7 | Timestamp, Cycle, Holiday, HolidayPriority, SportsSeason, ElectionWindow, Briefing |
| Initiative_Tracker | 6 | 24 | InitiativeID, Name, Type, Status, Budget, VoteRequirement, VoteCycle, Projection, ...(24 total) |
| Civic_Office_Ledger | 35 | 19 | OfficeId, Title, Type, District, Holder, PopId, TermStart, TermEnd, ...(19 total) |
| Oakland_Sports_Feed | 52 | 15 | Cycle, SeasonType, EventType, TeamsUsed, NamesUsed, Notes, Stats, Team Record, ...(15 total) |
| Chicago_Sports_Feed | 57 | 15 | Cycle, SeasonType, EventType, TeamsUsed, NamesUsed, Notes, Stats, Team Record, ...(15 total) |
| Chicago_Feed | 48 | 22 | Timestamp, Cycle, GodWorldYear, CycleOfYear, SimMonth, CycleInMonth, Season, Holiday, ...(22 total) |
| Health_Cause_Queue | 3 | 11 | POPID, Name, Status, StatusStartCycle, CyclesSick, Neighborhood, Tier, Age, ...(11 total) |
| Press_Drafts | 137 | 20 | Timestamp, Cycle, Reporter, StoryType, SignalSource, SummaryPrompt, DraftText, Status, ...(20 total) |
| Storyline_Tracker | 145 | 25 | Timestamp, CycleAdded, StorylineType, Description, Neighborhood, RelatedCitizens, Priority, Status, ...(25 total) |
| Cycle_Weather | 8 | 11 | CycleID, Type, Temp, Impact, Advisory, Comfort, Mood, Alerts, ...(11 total) |
| Neighborhood_Demographics | 17 | 12 | Neighborhood, Students, Adults, Seniors, Unemployed, Sick, LastUpdated, SchoolQualityIndex, ...(12 total) |
| Neighborhood_Map | 17 | 27 | Timestamp, Cycle, Neighborhood, NightlifeProfile, NoiseIndex, CrimeIndex, RetailVitality, EventAttractiveness, ...(27 total) |
| Faith_Organizations | 16 | 8 | Organization, FaithTradition, Neighborhood, Founded, Congregation, Leader, Character, ActiveStatus |
| Crime_Metrics | 17 | 7 | Neighborhood, PropertyCrimeIndex, ViolentCrimeIndex, ResponseTimeAvg, ClearanceRate, IncidentCount, LastUpdated |
| Transit_Metrics | 108 | 8 | Timestamp, Cycle, Station, RidershipVolume, OnTimePerformance, TrafficIndex, Corridor, Notes |
| Simulation_Ledger | 628 | 43 | POPID, First, Middle , Last, OriginGame, UNI (y/n), MED (y/n), CIV (y/n), ...(43 total) |
| Generic_Citizens | 265 | 10 | First, Last, Age, BirthYear, Neighborhood, Occupation, EmergenceCount, EmergedCycle, ...(10 total) |
| Cultural_Ledger | 29 | 20 | Timestamp, CUL-ID, Name, RoleType, FameCategory, CulturalDomain, Status, UniverseLinks, ...(20 total) |
| Chicago_Citizens | 106 | 10 | CitizenId, Name, Age, Gender, Neighborhood, Occupation, Tier, CreatedCycle, ...(10 total) |
| Family_Relationships | 0 | 6 | RelationshipId, Citizen1, Citizen2, RelationshipType, SinceCycle, Status |
| Household_Ledger | 2 | 14 | HouseholdId, HeadOfHousehold, HouseholdType, Members, Neighborhood, HousingType, MonthlyRent, HousingCost, ...(14 total) |
| Relationship_Bond_Ledger | 1619 | 19 | Timestamp, Cycle, BondId, CitizenA, CitizenB, BondType, Intensity, Status, ...(19 total) |
| Relationship_Bonds | 169 | 17 | BondId, CitizenA, CitizenB, BondType, Intensity, Status, Origin, DomainTag, ...(17 total) |
| LifeHistory_Log | 3686 | 7 | Timestamp, POPID, Name, EventTag, EventText, Neighborhood, Cycle |
| Youth_Events | 0 | 0 |  |
| Faith_Ledger | 85 | 9 | Timestamp, Cycle, Organization, FaithTradition, EventType, EventDescription, Neighborhood, Attendance, ...(9 total) |
| Migration_Events | 0 | 9 | EventId, POPID, EventType, FromNeighborhood, ToNeighborhood, Reason, Cycle, PushFactors, ...(9 total) |
| MediaRoom_Paste | 0 | 1 | Last parsed: 2/6/2026, 11:48:43 PM

Paste new Media Room output here. |
| Intake | 0 | 0 |  |
| Advancement_Intake1 | 0 | 0 |  |
| Media_Ledger | 27 | 25 | Timestamp, Cycle, Journalist, NameUsed, FameCategory, CulturalDomain, FameScore, TrendTrajectory, ...(25 total) |
| Media_Intake | 183 | 7 | Reporter, StoryType, SignalSource, Headline, ArticleText, CulturalMentions, Status |
| Storyline_Intake | 270 | 6 | StorylineType, Description, Neighborhood, RelatedCitizens, Priority, Status |
| Citizen_Usage_Intake | 684 | 5 | CitizenName, UsageType, Context, Reporter, Status |
| Citizen_Media_Usage | 1117 | 15 | Timestamp, Cycle, CitizenName, UsageType, Context, Reporter, Season, Holiday, ...(15 total) |
| WorldEvents_Ledger | 204 | 22 | Timestamp, Cycle, Description, Severity, Season, Holiday, WeatherType, WeatherImpact, ...(22 total) |
| Story_Seed_Deck | 661 | 19 | Timestamp, Cycle, SeedID, SeedType, Domain, Neighborhood, Priority, SeedText, ...(19 total) |
| Story_Hook_Deck | 183 | 28 | Timestamp, Cycle, HookId, HookType, Domain, Neighborhood, Priority, HookText, ...(28 total) |
| Cycle_Seeds | 6 | 8 | CycleID, Seed, Timestamp, Weather, Holiday, EventCount, PopulationDelta, Checksum |
| NBA_Game_Intake | 41 | 9 | Game, City, Cycle, GameDate, EventType, NamesUsed, RoleType, Details, ...(9 total) |
| MLB_Game_Intake | 76 | 9 | Game, City, Cycle, GameDate, EventType, NamesUsed, RoleType, Details, ...(9 total) |
| Domain_Tracker | 42 | 31 | Timestamp, Cycle, CIVIC, CRIME, TRANSIT, ECONOMIC, EDUCATION, HEALTH, ...(31 total) |
| Event_Arc_Ledger | 37 | 32 | Timestamp, Cycle, ArcId, Type, Phase, Tension, Neighborhood, DomainTag, ...(32 total) |
| Arc_Ledger | 37 | 11 | Timestamp, Cycle, ArcID, ArcType, ArcPhase, ArcTension, Neighborhood, DomainTag, ...(11 total) |
| //WorldEvents_V3_Ledger1 | 46 | 17 | Cycle, Timestamp, EventId, EventType, Domain, Subdomain, Neighborhood, Severity, ...(17 total) |
| Domain_Tracker_backup_1767050596364 | 29 | 16 |  , CIVIC, CRIME, TRANSIT, ECONOMIC, EDUCATION, HEALTH, WEATHER, ...(16 total) |
| Texture_Trigger_Log | 203 | 12 | Timestamp, Cycle, Domain, Neighborhood, TextureKey, Reason, Intensity, Holiday, ...(12 total) |
| WorldEvents_Ledger1 | 0 | 17 | Timestamp, Cycle, Description, Severity, Season, Holiday, WeatherType, WeatherImpact, ...(17 total) |
| Civic_Sweep_Report | 7 | 15 | Timestamp, CivicRoster, CivicCount, Scandals, Resignations, Retirements, CivicLoad, CycleWeight, ...(15 total) |
| World_Drift_Report | 7 | 22 | Timestamp, totalPopulation, illnessRate, employmentRate, migration, economy, cycle, cycleWeight, ...(22 total) |
| Simulation_Calendar | 1 | 6 | SimYear, SimMonth, SimDay, Season, HolidayFlag, Notes |
| Engine_Index2 | 130 | 1 | Here are all the .gs files in this project (Simulation_Narrative): |
| Ledger_Index | 45 | 7 | Active, Ledger, Purpose, Cycle_Packet, Project_Document, Feeder , Engine_Notes |
| Sports_Calendar | 12 | 3 | Month, SeasonState, Notes |
| World_Config | 9 | 3 | Key, Value, Description |
| Engine_Errors | 21 | 5 | Timestamp, Cycle, Phase, Error, Stack |
| Engine_ideas | 0 | 0 |  |
| /commands | 27 | 5 | claude/skills/, , , , claude
  |
| GitHub_token | 12 | 4 | [REDACTED — API KEY], Anthropic API KEY, , [REDACTED — CURL COMMAND] |
| GitHub_Templates | 35 | 2 |  , Github Token |
| Continuity_Doc | 10 | 3 | Section, Content, 12/01/2025 |
| Engine_Index | 0 | 4 | FileName, ModuleGroup, Purpose, Version |
| godWorldEngine2.5 | 0 | 0 |  |
| godWorldEngine2.5_v3build | 488 | 1 | /** |
| v3.0_Intergration_Engine | 22 | 1 | /** |
| Steward_Actions | 0 | 4 | Timestamp, Command, Status, Notes |
| //Intake// | 0 | 0 |  |
| Main | 0 | 0 |  |
| Advancement_Intake | 0 | 0 |  |
| ID_Counters | 0 | 0 |  |
| Narrative_Stories | 4 | 0 |  |
| Narrative_Bridge | 12 | 5 | Timestamp, Reporter, Title, Narrative, Source |

---

**Totals:** 1 spreadsheets, 79 tabs, ~12232 data rows

*Use `lib/sheets.js` to query any tab: `sheets.getSheetData("TabName")`*
# Graph Report - .  (2026-04-17)

## Corpus Check
- 170 files · ~344,490 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1178 nodes · 1791 edges · 170 communities detected
- Extraction: 56% EXTRACTED · 44% INFERRED · 0% AMBIGUOUS · INFERRED: 783 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## God Nodes (most connected - your core abstractions)
1. `runGenerationalEngine_()` - 19 edges
2. `generateMediaBriefing_()` - 16 edges
3. `buildCitizenContext()` - 15 edges
4. `getJournalist_()` - 15 edges
5. `loadHandoffData_()` - 14 edges
6. `updateCrimeMetrics_Phase3_()` - 13 edges
7. `processHouseholdFormation_()` - 13 edges
8. `saveV3Chicago_()` - 13 edges
9. `chance_()` - 12 edges
10. `runMediaFeedbackEngine_()` - 12 edges

## Surprising Connections (you probably didn't know these)
- None detected - all connections are within the same source files.

## Communities

### Community 0 - "Persistence #0"
Cohesion: 0.09
Nodes (32): buildHandoffHeader_(), buildSection01_EditorialHeader_(), buildSection02_FrontPage_(), buildSection08_ArcStatus_(), buildSection09_Calendar_(), buildSection12_SectionAssignments_(), buildSection14_CanonReference_(), buildSection15_SportsFeeds_() (+24 more)

### Community 1 - "Evening Media #1"
Cohesion: 0.12
Nodes (28): citizenExistsInLedger_(), ensureCitizenMediaUsage_(), ensureStorylineTracker_(), flagCitizenForTierReview_(), getCurrentCalendarContext_(), getCurrentCycle_(), logCulturalMention_(), parseCitizenEntry_() (+20 more)

### Community 2 - "Events #2"
Cohesion: 0.19
Nodes (26): applyMilestone_(), buildLogRowSchemaSafe_(), chance_(), checkBirth_(), checkDeath_(), checkGraduation_(), checkHealthEvent_(), checkPromotion_() (+18 more)

### Community 3 - "Citizens #3"
Cohesion: 0.16
Nodes (20): applyInitiativeConsequences_(), applyNeighborhoodRipple_(), calculateDemographicInfluence_(), calculateLeanProbability_(), calculateSwingProbability_(), checkMayoralVeto_(), createInitiativeTrackerSheet_(), generateOverrideStoryHook_() (+12 more)

### Community 4 - "Citizens #4"
Cohesion: 0.15
Nodes (19): applyAllianceBenefits_(), bondExists_(), buildBondKeySet_(), checkConfrontationTriggers_(), createBond_(), detectNewBonds_(), ensureBondEngineData_(), findColIndex_() (+11 more)

### Community 5 - "Utilities #5"
Cohesion: 0.17
Nodes (24): findJournalistsByTheme_(), formatJournalist_(), formatJournalistShort_(), getAllJournalistNames_(), getArcReporterFromRoster_(), getFullVoiceProfile_(), getJournalist_(), getJournalistBackground_() (+16 more)

### Community 6 - "Citizens #6"
Cohesion: 0.12
Nodes (10): asBool_(), getBondCalendarSummary_(), getBondCounts_(), getFestivalBonds_(), getOaklandHolidayBonds_(), getSportsRivalries_(), isLedgerSchema_(), loadRelationshipBonds_() (+2 more)

### Community 7 - "Citizens #7"
Cohesion: 0.18
Nodes (18): buildCitizenContext(), deriveConcerns_(), deriveSentiment_(), deriveVoice_(), findCitizenBase_(), findInGenericCitizens_(), findInSimulationLedger_(), formatCitizenForMediaRoom() (+10 more)

### Community 8 - "Evening Media #8"
Cohesion: 0.24
Nodes (19): categorizeArcs_(), determineFrontPage_(), extractAllJournalistNames_(), extractJournalistName_(), formatPercent_(), generateCitizenSpotlight_(), generateMediaBriefing_(), generateSectionAssignments_() (+11 more)

### Community 9 - "Persistence #9"
Cohesion: 0.25
Nodes (19): appendToMirror_(), exportContinuityLog(), exportCurrentCycleAll(), exportRileyDigest(), exportSimulationLedger(), exportSingleSheet_(), exportWorldPopulation(), formatMirrorEntry_() (+11 more)

### Community 10 - "Utilities #10"
Cohesion: 0.19
Nodes (19): applyTagToTraits_(), assignArchetype_(), compressLifeHistory_(), computeProfile_(), createCompressedBlock_(), extractCycleNumber_(), extractMotifs_(), formatProfileString_() (+11 more)

### Community 11 - "Lib #11"
Cohesion: 0.29
Nodes (19): appendColumns(), appendRows(), batchUpdate(), columnIndexToLetter(), createSheet(), deleteColumn(), deleteSheet(), getClient() (+11 more)

### Community 12 - "Config+Time #12"
Cohesion: 0.25
Nodes (17): advanceWorldTime_(), applyCycleWeightForLatestCycle_(), existsInLedger_(), getMaxPopId_(), loadConfig_(), logEngineError_(), nextPopIdSafe_(), padStart_() (+9 more)

### Community 13 - "Evening Media #13"
Cohesion: 0.18
Nodes (15): determineNoteType_(), ensureCitizenUsageIntakeSheet_(), ensureMediaIntakeSheet_(), ensureStorylineIntakeSheet_(), extractCitizenNames_(), extractSection_(), normalizeMarkdown_(), parseAllSections_() (+7 more)

### Community 14 - "World State #14"
Cohesion: 0.22
Nodes (17): applySportsFeedTriggers_(), applySportsSeason_(), buildActiveSportsFromOverride_(), deriveActiveSportsFromFeed_(), findColumnIndex_(), getColVal_(), inferFeedTrigger_(), mergeNeighborhoodEffects_() (+9 more)

### Community 15 - "Evening Media #15"
Cohesion: 0.25
Nodes (17): buildNameMap_(), calculateFameTrend_(), calculateMentionPoints_(), determineNotoriety_(), getUnprocessedMediaMentions_(), groupMentionsByCitizen_(), loadCitizenLedgers_(), markMentionsProcessed_() (+9 more)

### Community 16 - "World State #16"
Cohesion: 0.22
Nodes (16): avgOnTime_(), avgTraffic_(), calculateCorridorTraffic_(), calculateRidershipModLocal_(), calculateStationMetrics_(), calculateTrafficModLocal_(), countMajorEvents_(), createTransitSignalChain_() (+8 more)

### Community 17 - "Population #17"
Cohesion: 0.24
Nodes (14): buildCrimeAdjacencyGraph_(), calculateCityWideCategoriesFromMap_(), calculateCityWideFromMap_(), calculateCrimeHotspots_(), calculateNeighborhoodCrime_(), clamp01_(), computeCityEnforcementLoad_(), computeHotspotPressure_() (+6 more)

### Community 18 - "Citizens #18"
Cohesion: 0.24
Nodes (16): buildCitizenIncomeLookup_(), detectHouseholdStress_(), dissolveStressedHouseholds_(), estimateRent_(), formNewHouseholds_(), generateBirths_(), generateHouseholdDissolvedHook_(), generateHouseholdFormedHook_() (+8 more)

### Community 19 - "Utilities #19"
Cohesion: 0.21
Nodes (13): buildCycleChecksum_(), compareReplayOutput_(), hashInt32_(), hashString_(), initializeDryRunMode_(), initializeModeFlags_(), initializeProfileMode_(), initializeReplayMode_() (+5 more)

### Community 20 - "Evening Media #20"
Cohesion: 0.26
Nodes (15): assignCitizenRoles_(), autoAssignRoles_(), buildCitizenStorylineMap_(), detectAllianceOpportunities_(), detectCrossStorylineConflicts_(), detectRelationshipClashes_(), findMultiStorylineCitizens_(), findStorylineById_() (+7 more)

### Community 21 - "Evening Media #21"
Cohesion: 0.22
Nodes (12): amplifyArcsFromCoverage_(), analyzeCelebrityCoverage_(), analyzeEntertainmentSignals_(), analyzeWorldEventsCoverage_(), applyCalendarMediaModifiers_(), applyMediaToCityDynamics_(), applyNeighborhoodMediaEffects_(), calculateCoverageIntensity_() (+4 more)

### Community 22 - "Utilities #22"
Cohesion: 0.24
Nodes (15): buildContinuityHints_(), buildCycleContextPack_(), capManifestCycles_(), countDomains_(), ensureFolderByName_(), exportCycleArtifacts_(), inferKeyCitizens_(), normalizeSummarySnapshot_() (+7 more)

### Community 23 - "Citizens #23"
Cohesion: 0.26
Nodes (14): calculateCitizenIncomes_(), calculateCitizenWealth_(), calculateIncomeFromBand_(), deriveWealthLevel_(), distributeInheritance_(), extractIncomeBand_(), findHeirs_(), getCitizenWealth_() (+6 more)

### Community 24 - "World State #24"
Cohesion: 0.19
Nodes (6): applyWeatherModel_(), getBaseWeatherEvents_(), getFrontMediaName_(), getWeatherMediaBrief_(), mulberry32_(), normalizeWeatherType_()

### Community 25 - "V3 Chicago #25"
Cohesion: 0.38
Nodes (13): deriveChicagoEventsV24_(), deriveChicagoFeedV24_(), deriveChicagoSentimentV24_(), deriveChicagoTempV24_(), deriveChicagoTravelV24_(), deriveChicagoWeatherTypeV24_(), deriveComfortIndexV24_(), deriveWeatherImpactV24_() (+5 more)

### Community 26 - "Utilities #26"
Cohesion: 0.18
Nodes (5): batchRecordTransitMetrics_(), ensureTransitMetricsSchema_(), getTransitMetrics_(), getTransitSummary_(), recordTransitMetrics_()

### Community 27 - "Utilities #27"
Cohesion: 0.18
Nodes (6): getSimSpreadsheetId_(), identityMatch_(), maybePick_(), normalizeIdentity_(), openSimSpreadsheet_(), pickRandom_()

### Community 28 - "Utilities #28"
Cohesion: 0.29
Nodes (10): createWriteIntent_(), getIntentCountsByDomain_(), getIntentSummary_(), initializePersistContext_(), queueAppendIntent_(), queueBatchAppendIntent_(), queueCellIntent_(), queueLogIntent_() (+2 more)

### Community 29 - "Citizens #29"
Cohesion: 0.29
Nodes (11): adjustProbByCalendar_(), countYouthEventsByLevel_(), countYouthEventsByType_(), generateSchoolWideEvents_(), generateYouthEventForCitizen_(), getGenericYouth_(), getNamedYouth_(), getSchoolLevel_() (+3 more)

### Community 30 - "Analysis #30"
Cohesion: 0.33
Nodes (12): calculateEconomicMood_(), calculateNeighborhoodEconomies_(), createRipple_(), deriveEmploymentRate_(), detectCalendarRipples_(), detectCareerRipples_(), detectMigrationRipples_(), detectNewRipples_() (+4 more)

### Community 31 - "Utilities #31"
Cohesion: 0.21
Nodes (6): batchRecordFaithEvents_(), ensureFaithLedgerSchema_(), getFaithOrganizations_(), getFaithOrgsByNeighborhood_(), getFaithOrgsByTradition_(), recordFaithEvent_()

### Community 32 - "Lib #32"
Cohesion: 0.17
Nodes (2): getCentralDate(), loadTodayConversationDigest()

### Community 33 - "Utilities #33"
Cohesion: 0.2
Nodes (3): batchRecordYouthEvents_(), ensureYouthEventsSchema_(), recordYouthEvent_()

### Community 34 - "World State #34"
Cohesion: 0.2
Nodes (2): getSimHoliday_(), getSimHolidayDetails_()

### Community 35 - "Analysis #35"
Cohesion: 0.35
Nodes (10): advanceArcLifecycles_(), advanceArcPhase_(), checkResolutionTriggers_(), generatePhaseTransitionHook_(), generateResolutionHook_(), getNextPhase_(), loadEventArcLedger_(), processArcLifecycle_() (+2 more)

### Community 36 - "Analysis #36"
Cohesion: 0.35
Nodes (10): checkResolutionConditions_(), checkResolutionKeywords_(), detectFizzledStorylines_(), detectStaleStorylines_(), generateFizzledHook_(), generateStaleHook_(), generateWrapUpHook_(), loadActiveStorylines_() (+2 more)

### Community 37 - "Media Intake #37"
Cohesion: 0.31
Nodes (10): exportHealthCauseQueue_(), generateHealthCauseBriefing_(), isHealthStatusNeedingCause_(), normalizeHealthStatus_(), parseHealthCauseMarkdown_(), processHealthCauseIntake_(), runExportHealthCauseQueue(), runGenerateHealthBriefing() (+2 more)

### Community 38 - "Utilities #38"
Cohesion: 0.29
Nodes (8): batchUpdateCrimeMetrics_(), ensureCrimeMetricsSchema_(), getCityWideCrimeStats_(), getCrimeMetrics_(), getCrimeMetricsForNeighborhood_(), getHighCrimeNeighborhoods_(), seedCrimeMetricsFromProfiles_(), updateCrimeMetrics_()

### Community 39 - "Events #39"
Cohesion: 0.36
Nodes (9): countEventsByType_(), createFaithSignalChain_(), detectCrisisConditions_(), formatFaithEventDescription_(), generateInterfaithEvents_(), generateOrgEvents_(), getFaithStorySignals_(), runFaithEventsEngine_() (+1 more)

### Community 40 - "Citizens #40"
Cohesion: 0.44
Nodes (9): findColByName_(), getCurrentCycleFromConfig_(), isEmergenceUsage_(), markAsEmergedInGeneric_(), processAdvancementIntake_(), processAdvancementRows_(), processIntakeRows_(), processMediaUsage_() (+1 more)

### Community 41 - "Citizens #41"
Cohesion: 0.38
Nodes (9): createChicagoCitizensSheet_(), generateAge_(), generateChicagoCitizen_(), generateChicagoCitizens_(), generateId_(), generateTier_(), getChicagoOccupation_(), pickWeightedRandom_() (+1 more)

### Community 42 - "Persistence #42"
Cohesion: 0.31
Nodes (6): executePersistIntents_(), executeReplaceIntent_(), executeSheetIntents_(), getTotalIntentCount_(), groupIntentsBySheet_(), logIntentSummary_()

### Community 43 - "Media Intake #43"
Cohesion: 0.36
Nodes (8): cleanSectionName_(), determineNoteType_(), extractCitizens_(), isSectionHeader_(), parseContinuityNotes(), parseContinuityText(), parseLine_(), parseLines_()

### Community 44 - "Events #44"
Cohesion: 0.33
Nodes (6): attachCitizenToArc_(), citizenInActiveArc_(), eventArcEngine_(), generateNewArcs_(), getArcEventBoost_(), getCurrentCycle_()

### Community 45 - "Citizens #45"
Cohesion: 0.42
Nodes (8): assessDisplacementRisk_(), buildHouseholdRentBurdenMap_(), buildNeighborhoodPressureMap_(), checkForDisplacedCitizens_(), generateMigrationHooks_(), processMigrationEvents_(), processMigrationTracking_(), updateMigrationIntent_()

### Community 46 - "Utilities #46"
Cohesion: 0.33
Nodes (6): batchUpdateNeighborhoodDemographics_(), ensureNeighborhoodDemographicsSchema_(), getNeighborhoodDemographic_(), getNeighborhoodDemographics_(), seedNeighborhoodDemographicsFromLedger_(), updateSingleNeighborhoodDemographics_()

### Community 47 - "Citizens #47"
Cohesion: 0.46
Nodes (7): createBond_(), createRelationshipBondsSheet_(), findColumnIndex_(), generateBondId_(), makeBondKey_(), seedRelationshipBonds_(), testBondSeeding_()

### Community 48 - "Analysis #48"
Cohesion: 0.43
Nodes (6): archiveExpiredHooks_(), calculateHookAge_(), decayHookPriority_(), detectExpiredHooks_(), loadStoryHooks_(), manageHookLifecycle_()

### Community 49 - "Analysis #49"
Cohesion: 0.46
Nodes (7): calculateTensionDrift_(), checkConditionResolution_(), determinePhase_(), gatherWorldState_(), getResolutionText_(), processArcLifecycle_(), updateArcLedger_()

### Community 50 - "V3 Chicago #50"
Cohesion: 0.46
Nodes (7): calculateChicagoSentiment_(), chicagoSatelliteEngine_(), generateChicagoEvents_(), generateChicagoTravel_(), generateChicagoWeather_(), getBullsSentimentImpact_(), getMonthFromCycleInternal_()

### Community 51 - "Utilities #51"
Cohesion: 0.39
Nodes (6): generateDeprecationReport_(), scanForDeprecatedPatterns_(), v3Chance_(), v3PickRandom_(), v3Random_(), v3RandomInt_()

### Community 52 - "Utilities #52"
Cohesion: 0.43
Nodes (7): countRowsAfterCycle_(), deleteRowsAfterCycle_(), previewRollbackToCycle78(), resetCycleCounter_(), revertCivicOfficeUpdates_(), revertInitiativeVotes_(), rollbackToCycle78()

### Community 53 - "Lib #53"
Cohesion: 0.39
Nodes (5): buildPhotoPrompt(), extractScene(), generatePhoto(), generateWithTogether(), resolvePhotographer()

### Community 54 - "Digest #54"
Cohesion: 0.38
Nodes (3): compactMediaEffects_(), compactNeighborhoodDynamics_(), finalizeCycleState_()

### Community 55 - "Utilities #55"
Cohesion: 0.48
Nodes (5): applyDropdownValidation_(), setupChicagoFeedOnly(), setupFeedSheet_(), setupOaklandFeedOnly(), setupSportsFeedValidation()

### Community 56 - "Lib #56"
Cohesion: 0.52
Nodes (5): parseBlocks(), parseDateLoose(), readFileSafe(), readLast(), readSince()

### Community 57 - "Lib #57"
Cohesion: 0.29
Nodes (0): 

### Community 58 - "Citizens #58"
Cohesion: 0.6
Nodes (5): checkSchoolQuality_(), deriveEducationLevels_(), detectCareerMobility_(), processEducationCareer_(), updateCareerProgression_()

### Community 59 - "Analysis #59"
Cohesion: 0.6
Nodes (5): checkContinuity_(), checkDistribution_(), checkSensitivity_(), checkToneContradictions_(), runPrePublicationValidation_()

### Community 60 - "V3 Chicago #60"
Cohesion: 0.53
Nodes (4): deriveDomainPresenceV34_(), inferDomainFromTextV34_(), normalizeDomainV34_(), saveV3Domains_()

### Community 61 - "Utilities #61"
Cohesion: 0.73
Nodes (5): ensureExportsFolder_(), exportAllCitizenData_(), exportCitizensSnapshot_(), exportCivicOfficials_(), findCol_()

### Community 62 - "Lib #62"
Cohesion: 0.6
Nodes (5): excerptAround(), findLineNumber(), logBlock(), scan(), scanFile()

### Community 63 - "Citizens #63"
Cohesion: 0.7
Nodes (4): existsInLedgerValues_(), getMaxPopIdFromValues_(), padNumber_(), processIntakeV3_()

### Community 64 - "Citizens #64"
Cohesion: 0.7
Nodes (4): detectGentrificationPhase_(), generateGentrificationHooks_(), processGentrification_(), updateGentrificationPhases_()

### Community 65 - "Citizens #65"
Cohesion: 0.8
Nodes (4): citizenInActiveArc_(), getCitizenBonds_(), getCombinedEventBoost_(), runRelationshipEngine_()

### Community 66 - "Citizens #66"
Cohesion: 0.7
Nodes (4): findApprCol_(), isFailing_(), isPerforming_(), updateCivicApprovalRatings_()

### Community 67 - "Analysis #67"
Cohesion: 0.7
Nodes (4): findColByArray_(), generateStorylineBriefingSection_(), loadArcStatuses_(), updateStorylineStatus_()

### Community 68 - "Analysis #68"
Cohesion: 0.6
Nodes (3): applyMigrationDrift_(), createSeededRng_(), hashStringToUint32_()

### Community 69 - "Evening Media #69"
Cohesion: 0.6
Nodes (3): generateAngle_(), generateHeadline_(), renderStorySeedsForUI_()

### Community 70 - "V3 Chicago #70"
Cohesion: 0.7
Nodes (4): buildHolidayNeighborhoodMods_(), ensureNeighborhoodMapSchemaAppendOnly_(), getDemographicMarkerV35_(), saveV3NeighborhoodMap_()

### Community 71 - "V3 Chicago #71"
Cohesion: 0.4
Nodes (0): 

### Community 72 - "Persistence #72"
Cohesion: 0.5
Nodes (2): ensureCycleWeatherSheet_(), recordCycleWeather_()

### Community 73 - "Utilities #73"
Cohesion: 0.7
Nodes (4): columnToLetter_(), exportAllHeaders(), exportAndPushToGitHub(), exportSingleSheetHeaders()

### Community 74 - "Utilities #74"
Cohesion: 0.6
Nodes (3): ensureRelationshipBondLedgerSchema_(), ensureRelationshipBondSchemas_(), ensureRelationshipBondsSchema_()

### Community 75 - "World State #75"
Cohesion: 0.67
Nodes (2): applyInitiativeImplementationEffects_(), findImplCol_()

### Community 76 - "World State #76"
Cohesion: 0.5
Nodes (0): 

### Community 77 - "Population #77"
Cohesion: 0.5
Nodes (0): 

### Community 78 - "Events #78"
Cohesion: 0.83
Nodes (3): mulberry32_(), pickWeightedSafe_(), worldEventsEngine_()

### Community 79 - "Citizens #79"
Cohesion: 0.83
Nodes (3): buildOfficeLookup_(), generateCivicModeEvents_(), mulberry32CivicMode_()

### Community 80 - "Persistence #80"
Cohesion: 0.5
Nodes (0): 

### Community 81 - "Persistence #81"
Cohesion: 0.83
Nodes (3): buildCyclePacket_(), getCivicContextForPacket_(), getMonthName_Packet_()

### Community 82 - "Utilities #82"
Cohesion: 0.5
Nodes (0): 

### Community 83 - "Utilities #83"
Cohesion: 0.67
Nodes (2): applyInitiativeDropdown_(), setupInitiativeTrackerValidation()

### Community 84 - "Utilities #84"
Cohesion: 0.83
Nodes (3): deleteRowsAfterCycle_(), resetCycleCounter_(), rollbackToCycle80()

### Community 85 - "Lib #85"
Cohesion: 0.5
Nodes (0): 

### Community 86 - "Config+Time #86"
Cohesion: 0.67
Nodes (0): 

### Community 87 - "World State #87"
Cohesion: 0.67
Nodes (0): 

### Community 88 - "World State #88"
Cohesion: 1.0
Nodes (2): applyEditionCoverageEffects_(), findCoverageCol_()

### Community 89 - "Population #89"
Cohesion: 1.0
Nodes (2): buildNeighborhoodDemographicModifiers_(), updateNeighborhoodDemographics_()

### Community 90 - "Events #90"
Cohesion: 1.0
Nodes (2): buildCityEvents_(), mulberry32_()

### Community 91 - "Events #91"
Cohesion: 1.0
Nodes (2): generateCitizensEvents_(), mulberry32_()

### Community 92 - "Events #92"
Cohesion: 1.0
Nodes (2): generateGameModeMicroEvents_(), mulberry32GameMode_()

### Community 93 - "Events #93"
Cohesion: 1.0
Nodes (2): generateGenericCitizenMicroEvents_(), mulberry32_()

### Community 94 - "Citizens #94"
Cohesion: 0.67
Nodes (0): 

### Community 95 - "Citizens #95"
Cohesion: 1.0
Nodes (2): mulberry32_uni_(), runAsUniversePipeline_()

### Community 96 - "Citizens #96"
Cohesion: 1.0
Nodes (2): generateCitizensEvents_(), mulberry32_()

### Community 97 - "Citizens #97"
Cohesion: 1.0
Nodes (2): generateMediaModeEvents_(), mulberry32MediaMode_()

### Community 98 - "Analysis #98"
Cohesion: 0.67
Nodes (0): 

### Community 99 - "Evening Media #99"
Cohesion: 1.0
Nodes (2): mulberry32_(), textureTriggerEngine_()

### Community 100 - "Evening Media #100"
Cohesion: 1.0
Nodes (2): buildMediaPacket_(), populateMediaIntake_()

### Community 101 - "V3 Chicago #101"
Cohesion: 1.0
Nodes (2): loadActiveArcsFromLedger_(), v3PreloadContext_()

### Community 102 - "Digest #102"
Cohesion: 0.67
Nodes (0): 

### Community 103 - "Utilities #103"
Cohesion: 0.67
Nodes (0): 

### Community 104 - "Utilities #104"
Cohesion: 0.67
Nodes (0): 

### Community 105 - "Utilities #105"
Cohesion: 1.0
Nodes (2): crawlAllTxtFiles(), runTextCrawler()

### Community 106 - "Lib #106"
Cohesion: 0.67
Nodes (0): 

### Community 107 - "Lib #107"
Cohesion: 1.0
Nodes (2): guessBeat(), parseEdition()

### Community 108 - "Lib #108"
Cohesion: 1.0
Nodes (2): sanitize(), wrap()

### Community 109 - "Config+Time #109"
Cohesion: 1.0
Nodes (0): 

### Community 110 - "World State #110"
Cohesion: 1.0
Nodes (0): 

### Community 111 - "World State #111"
Cohesion: 1.0
Nodes (0): 

### Community 112 - "World State #112"
Cohesion: 1.0
Nodes (0): 

### Community 113 - "Population #113"
Cohesion: 1.0
Nodes (0): 

### Community 114 - "Population #114"
Cohesion: 1.0
Nodes (0): 

### Community 115 - "Population #115"
Cohesion: 1.0
Nodes (0): 

### Community 116 - "Population #116"
Cohesion: 1.0
Nodes (0): 

### Community 117 - "Population #117"
Cohesion: 1.0
Nodes (0): 

### Community 118 - "Population #118"
Cohesion: 1.0
Nodes (0): 

### Community 119 - "Events #119"
Cohesion: 1.0
Nodes (0): 

### Community 120 - "Citizens #120"
Cohesion: 1.0
Nodes (0): 

### Community 121 - "Citizens #121"
Cohesion: 1.0
Nodes (0): 

### Community 122 - "Citizens #122"
Cohesion: 1.0
Nodes (0): 

### Community 123 - "Citizens #123"
Cohesion: 1.0
Nodes (0): 

### Community 124 - "Citizens #124"
Cohesion: 1.0
Nodes (0): 

### Community 125 - "Citizens #125"
Cohesion: 1.0
Nodes (0): 

### Community 126 - "Citizens #126"
Cohesion: 1.0
Nodes (0): 

### Community 127 - "Citizens #127"
Cohesion: 1.0
Nodes (0): 

### Community 128 - "Citizens #128"
Cohesion: 1.0
Nodes (0): 

### Community 129 - "Citizens #129"
Cohesion: 1.0
Nodes (0): 

### Community 130 - "Citizens #130"
Cohesion: 1.0
Nodes (0): 

### Community 131 - "Analysis #131"
Cohesion: 1.0
Nodes (0): 

### Community 132 - "Analysis #132"
Cohesion: 1.0
Nodes (0): 

### Community 133 - "Analysis #133"
Cohesion: 1.0
Nodes (0): 

### Community 134 - "Analysis #134"
Cohesion: 1.0
Nodes (0): 

### Community 135 - "Analysis #135"
Cohesion: 1.0
Nodes (0): 

### Community 136 - "Evening Media #136"
Cohesion: 1.0
Nodes (0): 

### Community 137 - "Evening Media #137"
Cohesion: 1.0
Nodes (0): 

### Community 138 - "Evening Media #138"
Cohesion: 1.0
Nodes (0): 

### Community 139 - "Evening Media #139"
Cohesion: 1.0
Nodes (0): 

### Community 140 - "Evening Media #140"
Cohesion: 1.0
Nodes (0): 

### Community 141 - "Evening Media #141"
Cohesion: 1.0
Nodes (0): 

### Community 142 - "Evening Media #142"
Cohesion: 1.0
Nodes (0): 

### Community 143 - "Evening Media #143"
Cohesion: 1.0
Nodes (0): 

### Community 144 - "Evening Media #144"
Cohesion: 1.0
Nodes (0): 

### Community 145 - "Evening Media #145"
Cohesion: 1.0
Nodes (0): 

### Community 146 - "Evening Media #146"
Cohesion: 1.0
Nodes (0): 

### Community 147 - "Evening Media #147"
Cohesion: 1.0
Nodes (0): 

### Community 148 - "V3 Chicago #148"
Cohesion: 1.0
Nodes (0): 

### Community 149 - "V3 Chicago #149"
Cohesion: 1.0
Nodes (0): 

### Community 150 - "V3 Chicago #150"
Cohesion: 1.0
Nodes (0): 

### Community 151 - "V3 Chicago #151"
Cohesion: 1.0
Nodes (0): 

### Community 152 - "V3 Chicago #152"
Cohesion: 1.0
Nodes (0): 

### Community 153 - "Digest #153"
Cohesion: 1.0
Nodes (0): 

### Community 154 - "Digest #154"
Cohesion: 1.0
Nodes (0): 

### Community 155 - "Persistence #155"
Cohesion: 1.0
Nodes (0): 

### Community 156 - "Persistence #156"
Cohesion: 1.0
Nodes (0): 

### Community 157 - "Persistence #157"
Cohesion: 1.0
Nodes (0): 

### Community 158 - "Utilities #158"
Cohesion: 1.0
Nodes (0): 

### Community 159 - "Utilities #159"
Cohesion: 1.0
Nodes (0): 

### Community 160 - "Utilities #160"
Cohesion: 1.0
Nodes (0): 

### Community 161 - "Utilities #161"
Cohesion: 1.0
Nodes (0): 

### Community 162 - "Utilities #162"
Cohesion: 1.0
Nodes (0): 

### Community 163 - "Utilities #163"
Cohesion: 1.0
Nodes (0): 

### Community 164 - "Utilities #164"
Cohesion: 1.0
Nodes (0): 

### Community 165 - "Lib #165"
Cohesion: 1.0
Nodes (0): 

### Community 166 - "Lib #166"
Cohesion: 1.0
Nodes (0): 

### Community 167 - "Lib #167"
Cohesion: 1.0
Nodes (0): 

### Community 168 - "Lib #168"
Cohesion: 1.0
Nodes (0): 

### Community 169 - "Lib #169"
Cohesion: 1.0
Nodes (0): 

## Knowledge Gaps
- **Thin community `Config+Time #109`** (2 nodes): `advanceSimulationCalendar.js`, `advanceSimulationCalendar_()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `World State #110`** (2 nodes): `applySeasonWeights.js`, `applySeasonalWeights_()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `World State #111`** (2 nodes): `calendarChaosWeights.js`, `applyChaosCategoryWeights_()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `World State #112`** (2 nodes): `calendarStorySeeds.js`, `applySeasonalStorySeeds_()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Population #113`** (2 nodes): `updateCityTier.js`, `updateCityTier_()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Population #114`** (2 nodes): `generateCrisisSpikes.js`, `generateCrisisSpikes_()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Population #115`** (2 nodes): `deriveDemographicDrift.js`, `deriveDemographicDrift_()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Population #116`** (2 nodes): `generateCrisisBuckets.js`, `generateCrisisBuckets_()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Population #117`** (2 nodes): `generateMonthlyDriftReport.js`, `generateMonthlyDriftReport()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Population #118`** (2 nodes): `applyDemographicDrift.js`, `applyDemographicDrift_()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Events #119`** (2 nodes): `worldEventsLedger.js`, `ensureWorldEventsLedger_()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Citizens #120`** (2 nodes): `runEducationEngine.js`, `runEducationEngine_()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Citizens #121`** (2 nodes): `applyNamedCitizenSpotlight.js`, `applyNamedCitizenSpotlights_()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Citizens #122`** (2 nodes): `generateNamedCitizensEvents.js`, `generateNamedCitizenEvents_()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Citizens #123`** (2 nodes): `generateMonthlyCivicSweep.js`, `generateMonthlyCivicSweep()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Citizens #124`** (2 nodes): `checkForPromotions.js`, `checkForPromotions_()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Citizens #125`** (2 nodes): `runNeighborhoodEngine.js`, `runNeighborhoodEngine_()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Citizens #126`** (2 nodes): `generateGenericCitizens.js`, `generateGenericCitizens_()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Citizens #127`** (2 nodes): `runHouseholdEngine.js`, `runHouseholdEngine_()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Citizens #128`** (2 nodes): `runCivicRoleEngine.js`, `runCivicRoleEngine_()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Citizens #129`** (2 nodes): `runCareerEngine.js`, `runCareerEngine_()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Citizens #130`** (2 nodes): `runCivicElectionsv1.js`, `runCivicElections_()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Analysis #131`** (2 nodes): `applyShockMonitor.js`, `applyShockMonitor_()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Analysis #132`** (2 nodes): `applyPatternDetection.js`, `applyPatternDetection_()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Analysis #133`** (2 nodes): `prioritizeEvents.js`, `prioritizeEvents_()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Analysis #134`** (2 nodes): `filterNoiseEvents.js`, `filterNoiseEvents_()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Analysis #135`** (2 nodes): `computeRecurringCitizens.js`, `computeRecurringCitizens_()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Evening Media #136`** (2 nodes): `culturalLedger.js`, `registerCulturalEntity_()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Evening Media #137`** (2 nodes): `buildEveningFamous.js`, `buildEveningFamous_()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Evening Media #138`** (2 nodes): `domainTracker.js`, `domainTracker_()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Evening Media #139`** (2 nodes): `cityEveningSystems.js`, `buildCityEveningSystems_()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Evening Media #140`** (2 nodes): `sportsStreaming.js`, `buildEveningSportsAndStreaming_()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Evening Media #141`** (2 nodes): `parseMediaIntake.js`, `parseMediaIntake_()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Evening Media #142`** (2 nodes): `updateMediaSpread.js`, `updateMediaSpread_()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Evening Media #143`** (2 nodes): `updateTrendTrajectory.js`, `updateTrendTrajectory_()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Evening Media #144`** (2 nodes): `buildEveningFood.js`, `buildEveningFood_()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Evening Media #145`** (2 nodes): `buildEveningMedia.js`, `buildEveningMedia_()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Evening Media #146`** (2 nodes): `buildNightLife.js`, `buildNightlife_()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Evening Media #147`** (2 nodes): `storyHook.js`, `storyHookEngine_()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `V3 Chicago #148`** (2 nodes): `applyDomainCooldowns.js`, `applyDomainCooldowns_()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `V3 Chicago #149`** (2 nodes): `v3TextureWriter.js`, `saveV3Textures_()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `V3 Chicago #150`** (2 nodes): `v3StoryHookWriter.js`, `saveV3Hooks_()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `V3 Chicago #151`** (2 nodes): `applyCycleRecovery.js`, `applyCycleRecovery_()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `V3 Chicago #152`** (2 nodes): `v3LedgerWriter.js`, `saveV3ArcsToLedger_()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Digest #153`** (2 nodes): `applyCycleWeightForLatestCycle.js`, `applyCycleWeightForLatestCycle_()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Digest #154`** (2 nodes): `applyCompressionDigestSummary.js`, `applyCompressedDigestSummary_()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Persistence #155`** (2 nodes): `recordWorldEventsv3.js`, `recordWorldEventsv3_()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Persistence #156`** (2 nodes): `saveV3Seeds.js`, `saveV3Seeds_()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Persistence #157`** (2 nodes): `recordMediaLedger.js`, `recordMediaLedger_()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Utilities #158`** (2 nodes): `diagnoseDashboardData.js`, `diagnoseDashboardData()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Utilities #159`** (2 nodes): `ensureWorldEventsV3Ledger.js`, `ensureWorldEventsV3Ledger_()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Utilities #160`** (2 nodes): `sheetNames.js`, `getSheet_()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Utilities #161`** (2 nodes): `ensureCultureLedger.js`, `ensureCulturalLedger_()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Utilities #162`** (2 nodes): `godWorldMenu.js`, `onOpen()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Utilities #163`** (2 nodes): `ensureMediaLedger.js`, `ensureMediaLedger_()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Utilities #164`** (2 nodes): `safeRand.js`, `safeRand_()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Lib #165`** (2 nodes): `memoryFence.test.js`, `assert()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Lib #166`** (2 nodes): `contextScan.test.js`, `assert()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Lib #167`** (2 nodes): `pipelineLogger.js`, `createPipelineLog()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Lib #168`** (2 nodes): `getCurrentCycle.js`, `getCurrentCycle()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Lib #169`** (1 nodes): `env.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Are the 18 inferred relationships involving `runGenerationalEngine_()` (e.g. with `initRng_()` and `getSeasonalLimits_()`) actually correct?**
  _`runGenerationalEngine_()` has 18 INFERRED edges - model-reasoned connections that need verification._
- **Are the 15 inferred relationships involving `generateMediaBriefing_()` (e.g. with `getCivicContext_()` and `getHolidayZones_()`) actually correct?**
  _`generateMediaBriefing_()` has 15 INFERRED edges - model-reasoned connections that need verification._
- **Are the 14 inferred relationships involving `buildCitizenContext()` (e.g. with `getWorldState_()` and `findCitizenBase_()`) actually correct?**
  _`buildCitizenContext()` has 14 INFERRED edges - model-reasoned connections that need verification._
- **Are the 14 inferred relationships involving `getJournalist_()` (e.g. with `getRoster_()` and `getJournalistTone_()`) actually correct?**
  _`getJournalist_()` has 14 INFERRED edges - model-reasoned connections that need verification._
- **Are the 13 inferred relationships involving `loadHandoffData_()` (e.g. with `compileHandoff()` and `loadMediaBriefingRow_()`) actually correct?**
  _`loadHandoffData_()` has 13 INFERRED edges - model-reasoned connections that need verification._
- **Should `Persistence #0` be split into smaller, more focused modules?**
  _Cohesion score 0.09 - nodes in this community are weakly interconnected._
- **Should `Evening Media #1` be split into smaller, more focused modules?**
  _Cohesion score 0.12 - nodes in this community are weakly interconnected._
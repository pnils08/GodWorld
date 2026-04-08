# Graph Report - GodWorld Engine  (2026-04-08)

## Corpus Check
- 162 files · ~200,000 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1152 nodes · 1763 edges · 162 communities detected
- Extraction: 56% EXTRACTED · 44% INFERRED · 0% AMBIGUOUS · INFERRED: 773 edges (avg confidence: 0.5)
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

### Community 0 - "Community 0"
Cohesion: 0.09
Nodes (32): buildHandoffHeader_(), buildSection01_EditorialHeader_(), buildSection02_FrontPage_(), buildSection08_ArcStatus_(), buildSection09_Calendar_(), buildSection12_SectionAssignments_(), buildSection14_CanonReference_(), buildSection15_SportsFeeds_() (+24 more)

### Community 1 - "Community 1"
Cohesion: 0.12
Nodes (28): citizenExistsInLedger_(), ensureCitizenMediaUsage_(), ensureStorylineTracker_(), flagCitizenForTierReview_(), getCurrentCalendarContext_(), getCurrentCycle_(), logCulturalMention_(), parseCitizenEntry_() (+20 more)

### Community 2 - "Community 2"
Cohesion: 0.19
Nodes (26): applyMilestone_(), buildLogRowSchemaSafe_(), chance_(), checkBirth_(), checkDeath_(), checkGraduation_(), checkHealthEvent_(), checkPromotion_() (+18 more)

### Community 3 - "Community 3"
Cohesion: 0.16
Nodes (20): applyInitiativeConsequences_(), applyNeighborhoodRipple_(), calculateDemographicInfluence_(), calculateLeanProbability_(), calculateSwingProbability_(), checkMayoralVeto_(), createInitiativeTrackerSheet_(), generateOverrideStoryHook_() (+12 more)

### Community 4 - "Community 4"
Cohesion: 0.15
Nodes (19): applyAllianceBenefits_(), bondExists_(), buildBondKeySet_(), checkConfrontationTriggers_(), createBond_(), detectNewBonds_(), ensureBondEngineData_(), findColIndex_() (+11 more)

### Community 5 - "Community 5"
Cohesion: 0.17
Nodes (24): findJournalistsByTheme_(), formatJournalist_(), formatJournalistShort_(), getAllJournalistNames_(), getArcReporterFromRoster_(), getFullVoiceProfile_(), getJournalist_(), getJournalistBackground_() (+16 more)

### Community 6 - "Community 6"
Cohesion: 0.12
Nodes (10): asBool_(), getBondCalendarSummary_(), getBondCounts_(), getFestivalBonds_(), getOaklandHolidayBonds_(), getSportsRivalries_(), isLedgerSchema_(), loadRelationshipBonds_() (+2 more)

### Community 7 - "Community 7"
Cohesion: 0.18
Nodes (18): buildCitizenContext(), deriveConcerns_(), deriveSentiment_(), deriveVoice_(), findCitizenBase_(), findInGenericCitizens_(), findInSimulationLedger_(), formatCitizenForMediaRoom() (+10 more)

### Community 8 - "Community 8"
Cohesion: 0.24
Nodes (19): categorizeArcs_(), determineFrontPage_(), extractAllJournalistNames_(), extractJournalistName_(), formatPercent_(), generateCitizenSpotlight_(), generateMediaBriefing_(), generateSectionAssignments_() (+11 more)

### Community 9 - "Community 9"
Cohesion: 0.25
Nodes (19): appendToMirror_(), exportContinuityLog(), exportCurrentCycleAll(), exportRileyDigest(), exportSimulationLedger(), exportSingleSheet_(), exportWorldPopulation(), formatMirrorEntry_() (+11 more)

### Community 10 - "Community 10"
Cohesion: 0.29
Nodes (19): appendColumns(), appendRows(), batchUpdate(), columnIndexToLetter(), createSheet(), deleteColumn(), deleteSheet(), getClient() (+11 more)

### Community 11 - "Community 11"
Cohesion: 0.19
Nodes (19): applyTagToTraits_(), assignArchetype_(), compressLifeHistory_(), computeProfile_(), createCompressedBlock_(), extractCycleNumber_(), extractMotifs_(), formatProfileString_() (+11 more)

### Community 12 - "Community 12"
Cohesion: 0.25
Nodes (17): advanceWorldTime_(), applyCycleWeightForLatestCycle_(), existsInLedger_(), getMaxPopId_(), loadConfig_(), logEngineError_(), nextPopIdSafe_(), padStart_() (+9 more)

### Community 13 - "Community 13"
Cohesion: 0.18
Nodes (15): determineNoteType_(), ensureCitizenUsageIntakeSheet_(), ensureMediaIntakeSheet_(), ensureStorylineIntakeSheet_(), extractCitizenNames_(), extractSection_(), normalizeMarkdown_(), parseAllSections_() (+7 more)

### Community 14 - "Community 14"
Cohesion: 0.22
Nodes (17): applySportsFeedTriggers_(), applySportsSeason_(), buildActiveSportsFromOverride_(), deriveActiveSportsFromFeed_(), findColumnIndex_(), getColVal_(), inferFeedTrigger_(), mergeNeighborhoodEffects_() (+9 more)

### Community 15 - "Community 15"
Cohesion: 0.25
Nodes (17): buildNameMap_(), calculateFameTrend_(), calculateMentionPoints_(), determineNotoriety_(), getUnprocessedMediaMentions_(), groupMentionsByCitizen_(), loadCitizenLedgers_(), markMentionsProcessed_() (+9 more)

### Community 16 - "Community 16"
Cohesion: 0.22
Nodes (16): avgOnTime_(), avgTraffic_(), calculateCorridorTraffic_(), calculateRidershipModLocal_(), calculateStationMetrics_(), calculateTrafficModLocal_(), countMajorEvents_(), createTransitSignalChain_() (+8 more)

### Community 17 - "Community 17"
Cohesion: 0.24
Nodes (14): buildCrimeAdjacencyGraph_(), calculateCityWideCategoriesFromMap_(), calculateCityWideFromMap_(), calculateCrimeHotspots_(), calculateNeighborhoodCrime_(), clamp01_(), computeCityEnforcementLoad_(), computeHotspotPressure_() (+6 more)

### Community 18 - "Community 18"
Cohesion: 0.24
Nodes (16): buildCitizenIncomeLookup_(), detectHouseholdStress_(), dissolveStressedHouseholds_(), estimateRent_(), formNewHouseholds_(), generateBirths_(), generateHouseholdDissolvedHook_(), generateHouseholdFormedHook_() (+8 more)

### Community 19 - "Community 19"
Cohesion: 0.21
Nodes (13): buildCycleChecksum_(), compareReplayOutput_(), hashInt32_(), hashString_(), initializeDryRunMode_(), initializeModeFlags_(), initializeProfileMode_(), initializeReplayMode_() (+5 more)

### Community 20 - "Community 20"
Cohesion: 0.26
Nodes (15): assignCitizenRoles_(), autoAssignRoles_(), buildCitizenStorylineMap_(), detectAllianceOpportunities_(), detectCrossStorylineConflicts_(), detectRelationshipClashes_(), findMultiStorylineCitizens_(), findStorylineById_() (+7 more)

### Community 21 - "Community 21"
Cohesion: 0.22
Nodes (12): amplifyArcsFromCoverage_(), analyzeCelebrityCoverage_(), analyzeEntertainmentSignals_(), analyzeWorldEventsCoverage_(), applyCalendarMediaModifiers_(), applyMediaToCityDynamics_(), applyNeighborhoodMediaEffects_(), calculateCoverageIntensity_() (+4 more)

### Community 22 - "Community 22"
Cohesion: 0.24
Nodes (15): buildContinuityHints_(), buildCycleContextPack_(), capManifestCycles_(), countDomains_(), ensureFolderByName_(), exportCycleArtifacts_(), inferKeyCitizens_(), normalizeSummarySnapshot_() (+7 more)

### Community 23 - "Community 23"
Cohesion: 0.26
Nodes (14): calculateCitizenIncomes_(), calculateCitizenWealth_(), calculateIncomeFromBand_(), deriveWealthLevel_(), distributeInheritance_(), extractIncomeBand_(), findHeirs_(), getCitizenWealth_() (+6 more)

### Community 24 - "Community 24"
Cohesion: 0.19
Nodes (6): applyWeatherModel_(), getBaseWeatherEvents_(), getFrontMediaName_(), getWeatherMediaBrief_(), mulberry32_(), normalizeWeatherType_()

### Community 25 - "Community 25"
Cohesion: 0.38
Nodes (13): deriveChicagoEventsV24_(), deriveChicagoFeedV24_(), deriveChicagoSentimentV24_(), deriveChicagoTempV24_(), deriveChicagoTravelV24_(), deriveChicagoWeatherTypeV24_(), deriveComfortIndexV24_(), deriveWeatherImpactV24_() (+5 more)

### Community 26 - "Community 26"
Cohesion: 0.18
Nodes (5): batchRecordTransitMetrics_(), ensureTransitMetricsSchema_(), getTransitMetrics_(), getTransitSummary_(), recordTransitMetrics_()

### Community 27 - "Community 27"
Cohesion: 0.18
Nodes (6): getSimSpreadsheetId_(), identityMatch_(), maybePick_(), normalizeIdentity_(), openSimSpreadsheet_(), pickRandom_()

### Community 28 - "Community 28"
Cohesion: 0.29
Nodes (10): createWriteIntent_(), getIntentCountsByDomain_(), getIntentSummary_(), initializePersistContext_(), queueAppendIntent_(), queueBatchAppendIntent_(), queueCellIntent_(), queueLogIntent_() (+2 more)

### Community 29 - "Community 29"
Cohesion: 0.29
Nodes (11): adjustProbByCalendar_(), countYouthEventsByLevel_(), countYouthEventsByType_(), generateSchoolWideEvents_(), generateYouthEventForCitizen_(), getGenericYouth_(), getNamedYouth_(), getSchoolLevel_() (+3 more)

### Community 30 - "Community 30"
Cohesion: 0.33
Nodes (12): calculateEconomicMood_(), calculateNeighborhoodEconomies_(), createRipple_(), deriveEmploymentRate_(), detectCalendarRipples_(), detectCareerRipples_(), detectMigrationRipples_(), detectNewRipples_() (+4 more)

### Community 31 - "Community 31"
Cohesion: 0.17
Nodes (2): getCentralDate(), loadTodayConversationDigest()

### Community 32 - "Community 32"
Cohesion: 0.21
Nodes (6): batchRecordFaithEvents_(), ensureFaithLedgerSchema_(), getFaithOrganizations_(), getFaithOrgsByNeighborhood_(), getFaithOrgsByTradition_(), recordFaithEvent_()

### Community 33 - "Community 33"
Cohesion: 0.2
Nodes (3): batchRecordYouthEvents_(), ensureYouthEventsSchema_(), recordYouthEvent_()

### Community 34 - "Community 34"
Cohesion: 0.2
Nodes (2): getSimHoliday_(), getSimHolidayDetails_()

### Community 35 - "Community 35"
Cohesion: 0.35
Nodes (10): advanceArcLifecycles_(), advanceArcPhase_(), checkResolutionTriggers_(), generatePhaseTransitionHook_(), generateResolutionHook_(), getNextPhase_(), loadEventArcLedger_(), processArcLifecycle_() (+2 more)

### Community 36 - "Community 36"
Cohesion: 0.35
Nodes (10): checkResolutionConditions_(), checkResolutionKeywords_(), detectFizzledStorylines_(), detectStaleStorylines_(), generateFizzledHook_(), generateStaleHook_(), generateWrapUpHook_(), loadActiveStorylines_() (+2 more)

### Community 37 - "Community 37"
Cohesion: 0.31
Nodes (10): exportHealthCauseQueue_(), generateHealthCauseBriefing_(), isHealthStatusNeedingCause_(), normalizeHealthStatus_(), parseHealthCauseMarkdown_(), processHealthCauseIntake_(), runExportHealthCauseQueue(), runGenerateHealthBriefing() (+2 more)

### Community 38 - "Community 38"
Cohesion: 0.29
Nodes (8): batchUpdateCrimeMetrics_(), ensureCrimeMetricsSchema_(), getCityWideCrimeStats_(), getCrimeMetrics_(), getCrimeMetricsForNeighborhood_(), getHighCrimeNeighborhoods_(), seedCrimeMetricsFromProfiles_(), updateCrimeMetrics_()

### Community 39 - "Community 39"
Cohesion: 0.36
Nodes (9): countEventsByType_(), createFaithSignalChain_(), detectCrisisConditions_(), formatFaithEventDescription_(), generateInterfaithEvents_(), generateOrgEvents_(), getFaithStorySignals_(), runFaithEventsEngine_() (+1 more)

### Community 40 - "Community 40"
Cohesion: 0.44
Nodes (9): findColByName_(), getCurrentCycleFromConfig_(), isEmergenceUsage_(), markAsEmergedInGeneric_(), processAdvancementIntake_(), processAdvancementRows_(), processIntakeRows_(), processMediaUsage_() (+1 more)

### Community 41 - "Community 41"
Cohesion: 0.38
Nodes (9): createChicagoCitizensSheet_(), generateAge_(), generateChicagoCitizen_(), generateChicagoCitizens_(), generateId_(), generateTier_(), getChicagoOccupation_(), pickWeightedRandom_() (+1 more)

### Community 42 - "Community 42"
Cohesion: 0.31
Nodes (6): executePersistIntents_(), executeReplaceIntent_(), executeSheetIntents_(), getTotalIntentCount_(), groupIntentsBySheet_(), logIntentSummary_()

### Community 43 - "Community 43"
Cohesion: 0.36
Nodes (8): cleanSectionName_(), determineNoteType_(), extractCitizens_(), isSectionHeader_(), parseContinuityNotes(), parseContinuityText(), parseLine_(), parseLines_()

### Community 44 - "Community 44"
Cohesion: 0.33
Nodes (6): attachCitizenToArc_(), citizenInActiveArc_(), eventArcEngine_(), generateNewArcs_(), getArcEventBoost_(), getCurrentCycle_()

### Community 45 - "Community 45"
Cohesion: 0.42
Nodes (8): assessDisplacementRisk_(), buildHouseholdRentBurdenMap_(), buildNeighborhoodPressureMap_(), checkForDisplacedCitizens_(), generateMigrationHooks_(), processMigrationEvents_(), processMigrationTracking_(), updateMigrationIntent_()

### Community 46 - "Community 46"
Cohesion: 0.33
Nodes (6): batchUpdateNeighborhoodDemographics_(), ensureNeighborhoodDemographicsSchema_(), getNeighborhoodDemographic_(), getNeighborhoodDemographics_(), seedNeighborhoodDemographicsFromLedger_(), updateSingleNeighborhoodDemographics_()

### Community 47 - "Community 47"
Cohesion: 0.46
Nodes (7): createBond_(), createRelationshipBondsSheet_(), findColumnIndex_(), generateBondId_(), makeBondKey_(), seedRelationshipBonds_(), testBondSeeding_()

### Community 48 - "Community 48"
Cohesion: 0.43
Nodes (6): archiveExpiredHooks_(), calculateHookAge_(), decayHookPriority_(), detectExpiredHooks_(), loadStoryHooks_(), manageHookLifecycle_()

### Community 49 - "Community 49"
Cohesion: 0.46
Nodes (7): calculateTensionDrift_(), checkConditionResolution_(), determinePhase_(), gatherWorldState_(), getResolutionText_(), processArcLifecycle_(), updateArcLedger_()

### Community 50 - "Community 50"
Cohesion: 0.46
Nodes (7): calculateChicagoSentiment_(), chicagoSatelliteEngine_(), generateChicagoEvents_(), generateChicagoTravel_(), generateChicagoWeather_(), getBullsSentimentImpact_(), getMonthFromCycleInternal_()

### Community 51 - "Community 51"
Cohesion: 0.39
Nodes (5): buildPhotoPrompt(), extractScene(), generatePhoto(), generateWithTogether(), resolvePhotographer()

### Community 52 - "Community 52"
Cohesion: 0.39
Nodes (6): generateDeprecationReport_(), scanForDeprecatedPatterns_(), v3Chance_(), v3PickRandom_(), v3Random_(), v3RandomInt_()

### Community 53 - "Community 53"
Cohesion: 0.43
Nodes (7): countRowsAfterCycle_(), deleteRowsAfterCycle_(), previewRollbackToCycle78(), resetCycleCounter_(), revertCivicOfficeUpdates_(), revertInitiativeVotes_(), rollbackToCycle78()

### Community 54 - "Community 54"
Cohesion: 0.38
Nodes (3): compactMediaEffects_(), compactNeighborhoodDynamics_(), finalizeCycleState_()

### Community 55 - "Community 55"
Cohesion: 0.29
Nodes (0): 

### Community 56 - "Community 56"
Cohesion: 0.48
Nodes (5): applyDropdownValidation_(), setupChicagoFeedOnly(), setupFeedSheet_(), setupOaklandFeedOnly(), setupSportsFeedValidation()

### Community 57 - "Community 57"
Cohesion: 0.6
Nodes (5): checkSchoolQuality_(), deriveEducationLevels_(), detectCareerMobility_(), processEducationCareer_(), updateCareerProgression_()

### Community 58 - "Community 58"
Cohesion: 0.6
Nodes (5): checkContinuity_(), checkDistribution_(), checkSensitivity_(), checkToneContradictions_(), runPrePublicationValidation_()

### Community 59 - "Community 59"
Cohesion: 0.53
Nodes (4): deriveDomainPresenceV34_(), inferDomainFromTextV34_(), normalizeDomainV34_(), saveV3Domains_()

### Community 60 - "Community 60"
Cohesion: 0.73
Nodes (5): ensureExportsFolder_(), exportAllCitizenData_(), exportCitizensSnapshot_(), exportCivicOfficials_(), findCol_()

### Community 61 - "Community 61"
Cohesion: 0.7
Nodes (4): existsInLedgerValues_(), getMaxPopIdFromValues_(), padNumber_(), processIntakeV3_()

### Community 62 - "Community 62"
Cohesion: 0.7
Nodes (4): detectGentrificationPhase_(), generateGentrificationHooks_(), processGentrification_(), updateGentrificationPhases_()

### Community 63 - "Community 63"
Cohesion: 0.8
Nodes (4): citizenInActiveArc_(), getCitizenBonds_(), getCombinedEventBoost_(), runRelationshipEngine_()

### Community 64 - "Community 64"
Cohesion: 0.7
Nodes (4): findApprCol_(), isFailing_(), isPerforming_(), updateCivicApprovalRatings_()

### Community 65 - "Community 65"
Cohesion: 0.7
Nodes (4): findColByArray_(), generateStorylineBriefingSection_(), loadArcStatuses_(), updateStorylineStatus_()

### Community 66 - "Community 66"
Cohesion: 0.6
Nodes (3): applyMigrationDrift_(), createSeededRng_(), hashStringToUint32_()

### Community 67 - "Community 67"
Cohesion: 0.6
Nodes (3): generateAngle_(), generateHeadline_(), renderStorySeedsForUI_()

### Community 68 - "Community 68"
Cohesion: 0.7
Nodes (4): buildHolidayNeighborhoodMods_(), ensureNeighborhoodMapSchemaAppendOnly_(), getDemographicMarkerV35_(), saveV3NeighborhoodMap_()

### Community 69 - "Community 69"
Cohesion: 0.4
Nodes (0): 

### Community 70 - "Community 70"
Cohesion: 0.5
Nodes (2): ensureCycleWeatherSheet_(), recordCycleWeather_()

### Community 71 - "Community 71"
Cohesion: 0.7
Nodes (4): columnToLetter_(), exportAllHeaders(), exportAndPushToGitHub(), exportSingleSheetHeaders()

### Community 72 - "Community 72"
Cohesion: 0.6
Nodes (3): ensureRelationshipBondLedgerSchema_(), ensureRelationshipBondSchemas_(), ensureRelationshipBondsSchema_()

### Community 73 - "Community 73"
Cohesion: 0.67
Nodes (2): applyInitiativeImplementationEffects_(), findImplCol_()

### Community 74 - "Community 74"
Cohesion: 0.5
Nodes (0): 

### Community 75 - "Community 75"
Cohesion: 0.5
Nodes (0): 

### Community 76 - "Community 76"
Cohesion: 0.83
Nodes (3): mulberry32_(), pickWeightedSafe_(), worldEventsEngine_()

### Community 77 - "Community 77"
Cohesion: 0.83
Nodes (3): buildOfficeLookup_(), generateCivicModeEvents_(), mulberry32CivicMode_()

### Community 78 - "Community 78"
Cohesion: 0.5
Nodes (0): 

### Community 79 - "Community 79"
Cohesion: 0.83
Nodes (3): buildCyclePacket_(), getCivicContextForPacket_(), getMonthName_Packet_()

### Community 80 - "Community 80"
Cohesion: 0.5
Nodes (0): 

### Community 81 - "Community 81"
Cohesion: 0.5
Nodes (0): 

### Community 82 - "Community 82"
Cohesion: 0.67
Nodes (2): applyInitiativeDropdown_(), setupInitiativeTrackerValidation()

### Community 83 - "Community 83"
Cohesion: 0.83
Nodes (3): deleteRowsAfterCycle_(), resetCycleCounter_(), rollbackToCycle80()

### Community 84 - "Community 84"
Cohesion: 0.67
Nodes (0): 

### Community 85 - "Community 85"
Cohesion: 0.67
Nodes (0): 

### Community 86 - "Community 86"
Cohesion: 1.0
Nodes (2): applyEditionCoverageEffects_(), findCoverageCol_()

### Community 87 - "Community 87"
Cohesion: 1.0
Nodes (2): buildNeighborhoodDemographicModifiers_(), updateNeighborhoodDemographics_()

### Community 88 - "Community 88"
Cohesion: 1.0
Nodes (2): buildCityEvents_(), mulberry32_()

### Community 89 - "Community 89"
Cohesion: 1.0
Nodes (2): generateCitizensEvents_(), mulberry32_()

### Community 90 - "Community 90"
Cohesion: 1.0
Nodes (2): generateGameModeMicroEvents_(), mulberry32GameMode_()

### Community 91 - "Community 91"
Cohesion: 1.0
Nodes (2): generateGenericCitizenMicroEvents_(), mulberry32_()

### Community 92 - "Community 92"
Cohesion: 0.67
Nodes (0): 

### Community 93 - "Community 93"
Cohesion: 1.0
Nodes (2): mulberry32_uni_(), runAsUniversePipeline_()

### Community 94 - "Community 94"
Cohesion: 1.0
Nodes (2): generateCitizensEvents_(), mulberry32_()

### Community 95 - "Community 95"
Cohesion: 1.0
Nodes (2): generateMediaModeEvents_(), mulberry32MediaMode_()

### Community 96 - "Community 96"
Cohesion: 0.67
Nodes (0): 

### Community 97 - "Community 97"
Cohesion: 1.0
Nodes (2): mulberry32_(), textureTriggerEngine_()

### Community 98 - "Community 98"
Cohesion: 1.0
Nodes (2): buildMediaPacket_(), populateMediaIntake_()

### Community 99 - "Community 99"
Cohesion: 1.0
Nodes (2): loadActiveArcsFromLedger_(), v3PreloadContext_()

### Community 100 - "Community 100"
Cohesion: 0.67
Nodes (0): 

### Community 101 - "Community 101"
Cohesion: 1.0
Nodes (2): guessBeat(), parseEdition()

### Community 102 - "Community 102"
Cohesion: 0.67
Nodes (0): 

### Community 103 - "Community 103"
Cohesion: 0.67
Nodes (0): 

### Community 104 - "Community 104"
Cohesion: 1.0
Nodes (2): crawlAllTxtFiles(), runTextCrawler()

### Community 105 - "Community 105"
Cohesion: 1.0
Nodes (0): 

### Community 106 - "Community 106"
Cohesion: 1.0
Nodes (0): 

### Community 107 - "Community 107"
Cohesion: 1.0
Nodes (0): 

### Community 108 - "Community 108"
Cohesion: 1.0
Nodes (0): 

### Community 109 - "Community 109"
Cohesion: 1.0
Nodes (0): 

### Community 110 - "Community 110"
Cohesion: 1.0
Nodes (0): 

### Community 111 - "Community 111"
Cohesion: 1.0
Nodes (0): 

### Community 112 - "Community 112"
Cohesion: 1.0
Nodes (0): 

### Community 113 - "Community 113"
Cohesion: 1.0
Nodes (0): 

### Community 114 - "Community 114"
Cohesion: 1.0
Nodes (0): 

### Community 115 - "Community 115"
Cohesion: 1.0
Nodes (0): 

### Community 116 - "Community 116"
Cohesion: 1.0
Nodes (0): 

### Community 117 - "Community 117"
Cohesion: 1.0
Nodes (0): 

### Community 118 - "Community 118"
Cohesion: 1.0
Nodes (0): 

### Community 119 - "Community 119"
Cohesion: 1.0
Nodes (0): 

### Community 120 - "Community 120"
Cohesion: 1.0
Nodes (0): 

### Community 121 - "Community 121"
Cohesion: 1.0
Nodes (0): 

### Community 122 - "Community 122"
Cohesion: 1.0
Nodes (0): 

### Community 123 - "Community 123"
Cohesion: 1.0
Nodes (0): 

### Community 124 - "Community 124"
Cohesion: 1.0
Nodes (0): 

### Community 125 - "Community 125"
Cohesion: 1.0
Nodes (0): 

### Community 126 - "Community 126"
Cohesion: 1.0
Nodes (0): 

### Community 127 - "Community 127"
Cohesion: 1.0
Nodes (0): 

### Community 128 - "Community 128"
Cohesion: 1.0
Nodes (0): 

### Community 129 - "Community 129"
Cohesion: 1.0
Nodes (0): 

### Community 130 - "Community 130"
Cohesion: 1.0
Nodes (0): 

### Community 131 - "Community 131"
Cohesion: 1.0
Nodes (0): 

### Community 132 - "Community 132"
Cohesion: 1.0
Nodes (0): 

### Community 133 - "Community 133"
Cohesion: 1.0
Nodes (0): 

### Community 134 - "Community 134"
Cohesion: 1.0
Nodes (0): 

### Community 135 - "Community 135"
Cohesion: 1.0
Nodes (0): 

### Community 136 - "Community 136"
Cohesion: 1.0
Nodes (0): 

### Community 137 - "Community 137"
Cohesion: 1.0
Nodes (0): 

### Community 138 - "Community 138"
Cohesion: 1.0
Nodes (0): 

### Community 139 - "Community 139"
Cohesion: 1.0
Nodes (0): 

### Community 140 - "Community 140"
Cohesion: 1.0
Nodes (0): 

### Community 141 - "Community 141"
Cohesion: 1.0
Nodes (0): 

### Community 142 - "Community 142"
Cohesion: 1.0
Nodes (0): 

### Community 143 - "Community 143"
Cohesion: 1.0
Nodes (0): 

### Community 144 - "Community 144"
Cohesion: 1.0
Nodes (0): 

### Community 145 - "Community 145"
Cohesion: 1.0
Nodes (0): 

### Community 146 - "Community 146"
Cohesion: 1.0
Nodes (0): 

### Community 147 - "Community 147"
Cohesion: 1.0
Nodes (0): 

### Community 148 - "Community 148"
Cohesion: 1.0
Nodes (0): 

### Community 149 - "Community 149"
Cohesion: 1.0
Nodes (0): 

### Community 150 - "Community 150"
Cohesion: 1.0
Nodes (0): 

### Community 151 - "Community 151"
Cohesion: 1.0
Nodes (0): 

### Community 152 - "Community 152"
Cohesion: 1.0
Nodes (0): 

### Community 153 - "Community 153"
Cohesion: 1.0
Nodes (0): 

### Community 154 - "Community 154"
Cohesion: 1.0
Nodes (0): 

### Community 155 - "Community 155"
Cohesion: 1.0
Nodes (0): 

### Community 156 - "Community 156"
Cohesion: 1.0
Nodes (0): 

### Community 157 - "Community 157"
Cohesion: 1.0
Nodes (0): 

### Community 158 - "Community 158"
Cohesion: 1.0
Nodes (0): 

### Community 159 - "Community 159"
Cohesion: 1.0
Nodes (0): 

### Community 160 - "Community 160"
Cohesion: 1.0
Nodes (0): 

### Community 161 - "Community 161"
Cohesion: 1.0
Nodes (0): 

## Knowledge Gaps
- **Thin community `Community 105`** (2 nodes): `advanceSimulationCalendar.js`, `advanceSimulationCalendar_()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 106`** (2 nodes): `applySeasonWeights.js`, `applySeasonalWeights_()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 107`** (2 nodes): `calendarChaosWeights.js`, `applyChaosCategoryWeights_()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 108`** (2 nodes): `calendarStorySeeds.js`, `applySeasonalStorySeeds_()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 109`** (2 nodes): `updateCityTier.js`, `updateCityTier_()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 110`** (2 nodes): `generateCrisisSpikes.js`, `generateCrisisSpikes_()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 111`** (2 nodes): `deriveDemographicDrift.js`, `deriveDemographicDrift_()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 112`** (2 nodes): `generateCrisisBuckets.js`, `generateCrisisBuckets_()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 113`** (2 nodes): `generateMonthlyDriftReport.js`, `generateMonthlyDriftReport()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 114`** (2 nodes): `applyDemographicDrift.js`, `applyDemographicDrift_()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 115`** (2 nodes): `worldEventsLedger.js`, `ensureWorldEventsLedger_()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 116`** (2 nodes): `runEducationEngine.js`, `runEducationEngine_()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 117`** (2 nodes): `applyNamedCitizenSpotlight.js`, `applyNamedCitizenSpotlights_()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 118`** (2 nodes): `generateNamedCitizensEvents.js`, `generateNamedCitizenEvents_()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 119`** (2 nodes): `generateMonthlyCivicSweep.js`, `generateMonthlyCivicSweep()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 120`** (2 nodes): `checkForPromotions.js`, `checkForPromotions_()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 121`** (2 nodes): `runNeighborhoodEngine.js`, `runNeighborhoodEngine_()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 122`** (2 nodes): `generateGenericCitizens.js`, `generateGenericCitizens_()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 123`** (2 nodes): `runHouseholdEngine.js`, `runHouseholdEngine_()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 124`** (2 nodes): `runCivicRoleEngine.js`, `runCivicRoleEngine_()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 125`** (2 nodes): `runCareerEngine.js`, `runCareerEngine_()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 126`** (2 nodes): `runCivicElectionsv1.js`, `runCivicElections_()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 127`** (2 nodes): `applyShockMonitor.js`, `applyShockMonitor_()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 128`** (2 nodes): `applyPatternDetection.js`, `applyPatternDetection_()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 129`** (2 nodes): `prioritizeEvents.js`, `prioritizeEvents_()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 130`** (2 nodes): `filterNoiseEvents.js`, `filterNoiseEvents_()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 131`** (2 nodes): `computeRecurringCitizens.js`, `computeRecurringCitizens_()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 132`** (2 nodes): `culturalLedger.js`, `registerCulturalEntity_()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 133`** (2 nodes): `buildEveningFamous.js`, `buildEveningFamous_()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 134`** (2 nodes): `domainTracker.js`, `domainTracker_()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 135`** (2 nodes): `cityEveningSystems.js`, `buildCityEveningSystems_()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 136`** (2 nodes): `sportsStreaming.js`, `buildEveningSportsAndStreaming_()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 137`** (2 nodes): `parseMediaIntake.js`, `parseMediaIntake_()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 138`** (2 nodes): `updateMediaSpread.js`, `updateMediaSpread_()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 139`** (2 nodes): `updateTrendTrajectory.js`, `updateTrendTrajectory_()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 140`** (2 nodes): `buildEveningFood.js`, `buildEveningFood_()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 141`** (2 nodes): `buildEveningMedia.js`, `buildEveningMedia_()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 142`** (2 nodes): `buildNightLife.js`, `buildNightlife_()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 143`** (2 nodes): `storyHook.js`, `storyHookEngine_()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 144`** (2 nodes): `applyDomainCooldowns.js`, `applyDomainCooldowns_()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 145`** (2 nodes): `v3TextureWriter.js`, `saveV3Textures_()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 146`** (2 nodes): `v3StoryHookWriter.js`, `saveV3Hooks_()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 147`** (2 nodes): `applyCycleRecovery.js`, `applyCycleRecovery_()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 148`** (2 nodes): `v3LedgerWriter.js`, `saveV3ArcsToLedger_()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 149`** (2 nodes): `applyCycleWeightForLatestCycle.js`, `applyCycleWeightForLatestCycle_()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 150`** (2 nodes): `applyCompressionDigestSummary.js`, `applyCompressedDigestSummary_()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 151`** (2 nodes): `recordWorldEventsv3.js`, `recordWorldEventsv3_()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 152`** (2 nodes): `saveV3Seeds.js`, `saveV3Seeds_()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 153`** (2 nodes): `recordMediaLedger.js`, `recordMediaLedger_()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 154`** (2 nodes): `pipelineLogger.js`, `createPipelineLog()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 155`** (2 nodes): `getCurrentCycle.js`, `getCurrentCycle()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 156`** (2 nodes): `diagnoseDashboardData.js`, `diagnoseDashboardData()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 157`** (2 nodes): `ensureWorldEventsV3Ledger.js`, `ensureWorldEventsV3Ledger_()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 158`** (2 nodes): `sheetNames.js`, `getSheet_()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 159`** (2 nodes): `ensureCultureLedger.js`, `ensureCulturalLedger_()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 160`** (2 nodes): `godWorldMenu.js`, `onOpen()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 161`** (2 nodes): `ensureMediaLedger.js`, `ensureMediaLedger_()`
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
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.09 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.12 - nodes in this community are weakly interconnected._
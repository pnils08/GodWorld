# Graph Report - GodWorld engine (code-only)  (2026-06-28)

## Corpus Check
- 411 files · ~0 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 2897 nodes · 4654 edges · 410 communities detected
- Extraction: 53% EXTRACTED · 47% INFERRED · 0% AMBIGUOUS · INFERRED: 2167 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## God Nodes (most connected - your core abstractions)
1. `main()` - 43 edges
2. `main()` - 20 edges
3. `runGenerationalEngine_()` - 18 edges
4. `main()` - 17 edges
5. `generateMediaBriefing_()` - 16 edges
6. `runChaosCarsEngine_()` - 15 edges
7. `buildCitizenContext()` - 15 edges
8. `_runBylineSelfTests_()` - 15 edges
9. `getJournalist_()` - 15 edges
10. `loadHandoffData_()` - 14 edges

## Surprising Connections (you probably didn't know these)
- None detected - all connections are within the same source files.

## Communities

### Community 0 - "Community 0"
Cohesion: 0.07
Nodes (54): addPriorityScores(), allToObjects(), buildAsRoster(), buildBullsRoster(), buildCitizenArchive(), buildCitizenBondMap(), buildCitizenLifeContext(), buildCivicConsequences() (+46 more)

### Community 1 - "Community 1"
Cohesion: 0.09
Nodes (32): buildHandoffHeader_(), buildSection01_EditorialHeader_(), buildSection02_FrontPage_(), buildSection08_ArcStatus_(), buildSection09_Calendar_(), buildSection12_SectionAssignments_(), buildSection14_CanonReference_(), buildSection15_SportsFeeds_() (+24 more)

### Community 2 - "Community 2"
Cohesion: 0.14
Nodes (27): citizenExistsInLedger_(), ensureCitizenMediaUsage_(), ensureStorylineTracker_(), flagCitizenForTierReview_(), getCurrentCalendarContext_(), logCulturalMention_(), parseCitizenEntry_(), parseRawCitizenUsageLog_() (+19 more)

### Community 3 - "Community 3"
Cohesion: 0.14
Nodes (28): applyTagToTraits_(), assignArchetype_(), compressLifeHistory_(), computeProfile_(), createCompressedBlock_(), deriveArchetypeFromBands_(), dialFaceShim_(), extractCycleNumber_() (+20 more)

### Community 4 - "Community 4"
Cohesion: 0.19
Nodes (25): addDocument(), downloadTextFile(), extractPlayerNameFromFlatFilename(), extractPopIdFromContent(), extractPopIdFromFilename(), getDocWithRetry(), getDriveClient(), groupFilesByPlayer() (+17 more)

### Community 5 - "Community 5"
Cohesion: 0.16
Nodes (25): checkArticleTablePlacement(), checkCitizenNames(), checkCivicOfficeNames(), checkCouncilNames(), checkEngineLanguage(), checkFaithOrgNames(), checkInitiativeFacts(), checkInWorldLeaks() (+17 more)

### Community 6 - "Community 6"
Cohesion: 0.16
Nodes (24): accumulateBusinessEvent_(), accumulateNeighborhoodFold_(), chaosEventId_(), chaosEventText_(), flushBusinessFold_(), impactsForScope_(), loadBusinessRows_(), loadNeighborhoodNames_() (+16 more)

### Community 7 - "Community 7"
Cohesion: 0.16
Nodes (20): applyInitiativeConsequences_(), applyNeighborhoodRipple_(), calculateDemographicInfluence_(), calculateLeanProbability_(), calculateSwingProbability_(), checkMayoralVeto_(), createInitiativeTrackerSheet_(), generateOverrideStoryHook_() (+12 more)

### Community 8 - "Community 8"
Cohesion: 0.17
Nodes (24): approvalDeltaCell(), buildWorldSummary(), classifyDelta(), emitApprovalRatings(), emitCityState(), emitCivicDecisions(), emitEngineReviewFindings(), emitEveningTexture() (+16 more)

### Community 9 - "Community 9"
Cohesion: 0.17
Nodes (24): findJournalistsByTheme_(), formatJournalist_(), formatJournalistShort_(), getAllJournalistNames_(), getArcReporterFromRoster_(), getFullVoiceProfile_(), getJournalist_(), getJournalistBackground_() (+16 more)

### Community 10 - "Community 10"
Cohesion: 0.21
Nodes (23): authProbe(), buildCard(), buildPopidIdMap(), classify401Action(), clearStaleErrorGateDump(), dialEssence_(), emitErrorGateDump(), errorGateDumpPath() (+15 more)

### Community 11 - "Community 11"
Cohesion: 0.17
Nodes (21): appendBusinesses(), appendCitizens(), assertParserSanity(), deriveSlug(), detectGenderFromPronouns(), enrichCandidateWithProseSignals(), extractCycleFromFilename(), extractLetterFooterSignals() (+13 more)

### Community 12 - "Community 12"
Cohesion: 0.24
Nodes (22): applyMilestone_(), chance_(), checkBirth_(), checkDeath_(), checkGraduation_(), checkHealthEvent_(), checkPromotion_(), checkRetirement_() (+14 more)

### Community 13 - "Community 13"
Cohesion: 0.17
Nodes (18): applyAllianceBenefits_(), bondExists_(), buildBondKeySet_(), checkConfrontationTriggers_(), createBond_(), detectNewBonds_(), ensureBondEngineData_(), findColIndex_() (+10 more)

### Community 14 - "Community 14"
Cohesion: 0.12
Nodes (10): asBool_(), getBondCalendarSummary_(), getBondCounts_(), getFestivalBonds_(), getOaklandHolidayBonds_(), getSportsRivalries_(), isLedgerSchema_(), loadRelationshipBonds_() (+2 more)

### Community 15 - "Community 15"
Cohesion: 0.25
Nodes (21): ageBracket_(), buildLedgerFreqSnapshot_(), canonicalRolesSet_(), computeCareerStage_(), deriveCitizenProfile_(), deriveDebtLevel_(), deriveEducationLevel_(), deriveGender_() (+13 more)

### Community 16 - "Community 16"
Cohesion: 0.18
Nodes (17): buildCitizenContext(), deriveConcerns_(), deriveSentiment_(), deriveVoice_(), findCitizenBase_(), findInSimulationLedger_(), formatCitizenForMediaRoom(), getArcExposure_() (+9 more)

### Community 17 - "Community 17"
Cohesion: 0.18
Nodes (18): buildPersonaRegistry(), callClaude(), extractNotes(), fetchUserProfile(), getSystemPrompt(), isOnCooldown(), loadConversationHistory(), logConversation() (+10 more)

### Community 18 - "Community 18"
Cohesion: 0.29
Nodes (19): appendColumns(), appendRows(), batchUpdate(), columnIndexToLetter(), createSheet(), deleteColumn(), deleteSheet(), getClient() (+11 more)

### Community 19 - "Community 19"
Cohesion: 0.24
Nodes (19): categorizeArcs_(), determineFrontPage_(), extractAllJournalistNames_(), extractJournalistName_(), formatPercent_(), generateCitizenSpotlight_(), generateMediaBriefing_(), generateSectionAssignments_() (+11 more)

### Community 20 - "Community 20"
Cohesion: 0.25
Nodes (19): appendToMirror_(), exportContinuityLog(), exportCurrentCycleAll(), exportRileyDigest(), exportSimulationLedger(), exportSingleSheet_(), exportWorldPopulation(), formatMirrorEntry_() (+11 more)

### Community 21 - "Community 21"
Cohesion: 0.21
Nodes (19): copyIfExists(), ensureDir(), filterHooksByDomain(), formatCityEvents(), formatCivicLoad(), formatCrimeSnapshot(), formatDemographicShifts(), formatEconomicStatus() (+11 more)

### Community 22 - "Community 22"
Cohesion: 0.24
Nodes (19): appendCanonAndOutputBlock(), buildArticleIndex(), bylineMatchesReporter(), composeBundle(), composeNonEditionBundle(), deriveOutDir(), deriveSourcePath(), existsOrDie() (+11 more)

### Community 23 - "Community 23"
Cohesion: 0.29
Nodes (18): buildCard(), clean(), fmtMoney(), fmtThousands(), getDocWithRetry(), indexHeader(), listPageWithRetry(), loadBusinessesByNbh() (+10 more)

### Community 24 - "Community 24"
Cohesion: 0.25
Nodes (17): auditCoverageGap(), auditCrossCycleDebt(), auditDeterminismBreak(), auditHeaderDrift(), auditMathAnomaly(), auditWritebackDrift(), buildDiagnosis(), countBySeverity() (+9 more)

### Community 25 - "Community 25"
Cohesion: 0.26
Nodes (17): advanceWorldTime_(), computePhase42PerWriter_(), computeShortHash_(), existsInLedger_(), getMaxPopId_(), loadConfig_(), logEngineError_(), padStart_() (+9 more)

### Community 26 - "Community 26"
Cohesion: 0.22
Nodes (17): applySportsFeedTriggers_(), applySportsSeason_(), buildActiveSportsFromOverride_(), deriveActiveSportsFromFeed_(), findColumnIndex_(), getColVal_(), inferFeedTrigger_(), mergeNeighborhoodEffects_() (+9 more)

### Community 27 - "Community 27"
Cohesion: 0.28
Nodes (17): buildArticleHtml(), buildLettersHtml(), buildNewspaperHtml(), buildSectionHtml(), deriveNonEditionSlug(), escapeHtml(), findPhotoForSection(), findPhotosForSection() (+9 more)

### Community 28 - "Community 28"
Cohesion: 0.25
Nodes (17): askClaude(), buildMoltbookPrompt(), checkDashboard(), decideEngagement(), executeActions(), handleVerification(), loadCredentials(), loadState() (+9 more)

### Community 29 - "Community 29"
Cohesion: 0.18
Nodes (11): bar(), buildRotationBlock(), buildSteps(), main(), parseArgs(), parseStatuses(), printBanner(), readCurrentSession() (+3 more)

### Community 30 - "Community 30"
Cohesion: 0.13
Nodes (4): currentSimYear(), getCentralDate(), loadTodayConversationDigest(), searchDisk()

### Community 31 - "Community 31"
Cohesion: 0.22
Nodes (16): avgOnTime_(), avgTraffic_(), calculateCorridorTraffic_(), calculateRidershipModLocal_(), calculateStationMetrics_(), calculateTrafficModLocal_(), countMajorEvents_(), createTransitSignalChain_() (+8 more)

### Community 32 - "Community 32"
Cohesion: 0.24
Nodes (14): buildCrimeAdjacencyGraph_(), calculateCityWideCategoriesFromMap_(), calculateCityWideFromMap_(), calculateCrimeHotspots_(), calculateNeighborhoodCrime_(), clamp01_(), computeCityEnforcementLoad_(), computeHotspotPressure_() (+6 more)

### Community 33 - "Community 33"
Cohesion: 0.24
Nodes (15): assignCitizenRoles_(), autoAssignRoles_(), buildCitizenStorylineMap_(), detectAllianceOpportunities_(), detectCrossStorylineConflicts_(), detectRelationshipClashes_(), findMultiStorylineCitizens_(), findStorylineById_() (+7 more)

### Community 34 - "Community 34"
Cohesion: 0.24
Nodes (16): copyIfExists(), ensureDir(), extractMaraGuidance(), formatErrataMarkdown(), generateBriefing(), generateCanonSection(), generateCitizenCards(), generateFaithSection() (+8 more)

### Community 35 - "Community 35"
Cohesion: 0.14
Nodes (6): buildPool(), buildVoicePrompts(), dialTrajectory(), logLine(), recentEventMagnitude(), selectCitizen()

### Community 36 - "Community 36"
Cohesion: 0.24
Nodes (15): assembleContext(), ensureDir(), extractSection(), latestWorldSummary(), loadInputs(), main(), narrate(), parseArgs() (+7 more)

### Community 37 - "Community 37"
Cohesion: 0.21
Nodes (12): assert(), buildLedger(), closedLoopRun(), dialState(), log(), makeCtx(), memSheet(), memSS() (+4 more)

### Community 38 - "Community 38"
Cohesion: 0.31
Nodes (16): builderPath(), chunkArray(), diffIds(), dispatchProjection(), hashRows(), headerIndex(), loadState(), log() (+8 more)

### Community 39 - "Community 39"
Cohesion: 0.23
Nodes (14): accreteReflectionsIntoBase_(), applyEvent_(), applyReflectionDualTag_(), applyTaggedEvent_(), band_(), bandIndex_(), bandMultiplier_(), clamp100_() (+6 more)

### Community 40 - "Community 40"
Cohesion: 0.24
Nodes (15): buildCitizenIncomeLookup_(), detectHouseholdStress_(), dissolveStressedHouseholds_(), estimateRent_(), formNewHouseholds_(), generateBirths_(), generateHouseholdDissolvedHook_(), generateHouseholdFormedHook_() (+7 more)

### Community 41 - "Community 41"
Cohesion: 0.22
Nodes (12): amplifyArcsFromCoverage_(), analyzeCelebrityCoverage_(), analyzeEntertainmentSignals_(), analyzeWorldEventsCoverage_(), applyCalendarMediaModifiers_(), applyMediaToCityDynamics_(), applyNeighborhoodMediaEffects_(), calculateCoverageIntensity_() (+4 more)

### Community 42 - "Community 42"
Cohesion: 0.22
Nodes (12): buildInitiativeCitizenData(), buildInitiativePacket(), buildInitiativeRecord(), buildNeighborhoodContext(), getInitiativeBusinesses(), getInitiativeCitizens(), getRelevantOfficials(), listPreviousDocuments() (+4 more)

### Community 43 - "Community 43"
Cohesion: 0.25
Nodes (14): detectSupplemental(), evaluateEmpathyForArticles(), generateDeskCritique(), generateReporterCritique(), gradeEdition(), gradeFromValue(), loadPreviousGrades(), normalizeReporter() (+6 more)

### Community 44 - "Community 44"
Cohesion: 0.33
Nodes (15): arcBindingAxis_(), arcBindingScore_(), cadenceAxis_(), cadenceMultiplier_(), categorizeConfidence_(), filterRosterForByline_(), formatAxis_(), formatFitScore_() (+7 more)

### Community 45 - "Community 45"
Cohesion: 0.24
Nodes (15): buildContinuityHints_(), buildCycleContextPack_(), capManifestCycles_(), countDomains_(), ensureFolderByName_(), exportCycleArtifacts_(), inferKeyCitizens_(), normalizeSummarySnapshot_() (+7 more)

### Community 46 - "Community 46"
Cohesion: 0.26
Nodes (14): calculateCitizenIncomes_(), calculateCitizenWealth_(), calculateIncomeFromBand_(), deriveWealthLevel_(), distributeInheritance_(), extractIncomeBand_(), findHeirs_(), getCitizenWealth_() (+6 more)

### Community 47 - "Community 47"
Cohesion: 0.24
Nodes (12): ensureCitizenUsageIntakeSheet_(), ensureMediaIntakeSheet_(), ensureStorylineIntakeSheet_(), extractSection_(), normalizeMarkdown_(), parseAllSections_(), parseAndProcessMediaRoom(), parseArticleTable_() (+4 more)

### Community 48 - "Community 48"
Cohesion: 0.32
Nodes (14): buildBayTribuneNameIndex(), buildKeysToCheck(), candidateIsKnown(), extractCandidates(), isDenied(), loadSheetNameColumn(), loadSimLedgerNames(), main() (+6 more)

### Community 49 - "Community 49"
Cohesion: 0.26
Nodes (13): aggregateNeighborhoodMetrics(), buildCitizenSummary(), buildFactionPacket(), buildOfficePacket(), filterNeighborhoodData(), getCitizensInNeighborhoods(), getNeighborhoodsForDistricts(), getRecentLifeEvents() (+5 more)

### Community 50 - "Community 50"
Cohesion: 0.26
Nodes (14): appendToJournal(), buildSystemPrompt(), buildUserPrompt(), callClaude(), formatConversations(), formatMoltbookInteractions(), loadConversationsFromFile(), loadTodayConversations() (+6 more)

### Community 51 - "Community 51"
Cohesion: 0.3
Nodes (14): bracketOf(), buildDistribution(), buildNameCounts(), countNew(), djb2(), drawAge(), drawNeighborhood(), drawWithCap() (+6 more)

### Community 52 - "Community 52"
Cohesion: 0.28
Nodes (11): createWriteIntent_(), getIntentCountsByDomain_(), getIntentSummary_(), initializePersistContext_(), queueAppendIntent_(), queueBatchAppendIntent_(), queueCellIntent_(), queueEnsureTabIntent_() (+3 more)

### Community 53 - "Community 53"
Cohesion: 0.19
Nodes (6): applyWeatherModel_(), getBaseWeatherEvents_(), getFrontMediaName_(), getWeatherMediaBrief_(), mulberry32_(), normalizeWeatherType_()

### Community 54 - "Community 54"
Cohesion: 0.38
Nodes (13): deriveChicagoEventsV24_(), deriveChicagoFeedV24_(), deriveChicagoSentimentV24_(), deriveChicagoTempV24_(), deriveChicagoTravelV24_(), deriveChicagoWeatherTypeV24_(), deriveComfortIndexV24_(), deriveWeatherImpactV24_() (+5 more)

### Community 55 - "Community 55"
Cohesion: 0.27
Nodes (13): buildDeskQueries(), buildRheaQueries(), cacheKey(), detectCycle(), formatArchiveContext(), loadCache(), main(), readBaseContext() (+5 more)

### Community 56 - "Community 56"
Cohesion: 0.36
Nodes (13): buildCard(), clean(), getDocWithRetry(), indexHeader(), listPageWithRetry(), loadRecentLedgerEvents(), main(), orgFromContent() (+5 more)

### Community 57 - "Community 57"
Cohesion: 0.35
Nodes (13): buildCard(), clean(), getDocWithRetry(), indexHeader(), initIdFromContent(), listPageWithRetry(), main(), searchSupermemory() (+5 more)

### Community 58 - "Community 58"
Cohesion: 0.3
Nodes (13): buildPlayerIndex(), camelCase(), classifyFile(), extractPlayerStatus(), extractQuirks(), findFiles(), mergePlayer(), normalizeName() (+5 more)

### Community 59 - "Community 59"
Cohesion: 0.27
Nodes (13): assertNoForbiddenSeparator(), classifyNewCanonRow(), classifyOrgSubsection(), cli(), emitBusinessesNamed(), emitNamesIndex(), findSectionRange(), injectSections() (+5 more)

### Community 60 - "Community 60"
Cohesion: 0.27
Nodes (12): activeEditSet(), buildSourceIndex(), classify(), escapeRe(), extractDirectoryRefs(), gitMtime(), inboundReferrers(), isExcluded() (+4 more)

### Community 61 - "Community 61"
Cohesion: 0.33
Nodes (13): deriveStemForSupersede(), findOrCreateArchiveSubfolder(), findPriorVersions(), getAuth(), main(), mapSubfolders(), parseCycleFlag(), parseFlag() (+5 more)

### Community 62 - "Community 62"
Cohesion: 0.29
Nodes (13): buildCycleChecksum_(), compareReplayOutput_(), hashInt32_(), hashString_(), initializeDryRunMode_(), initializeModeFlags_(), initializeProfileMode_(), initializeReplayMode_() (+5 more)

### Community 63 - "Community 63"
Cohesion: 0.18
Nodes (5): batchRecordTransitMetrics_(), ensureTransitMetricsSchema_(), getTransitMetrics_(), getTransitSummary_(), recordTransitMetrics_()

### Community 64 - "Community 64"
Cohesion: 0.18
Nodes (6): getSimSpreadsheetId_(), identityMatch_(), maybePick_(), normalizeIdentity_(), openSimSpreadsheet_(), pickRandom_()

### Community 65 - "Community 65"
Cohesion: 0.28
Nodes (10): adjustProbByCalendar_(), countYouthEventsByLevel_(), countYouthEventsByType_(), generateSchoolWideEvents_(), generateYouthEventForCitizen_(), getNamedYouth_(), getSchoolLevel_(), recordYouthLifeHistory_() (+2 more)

### Community 66 - "Community 66"
Cohesion: 0.33
Nodes (12): calculateEconomicMood_(), calculateNeighborhoodEconomies_(), createRipple_(), deriveEmploymentRate_(), detectCalendarRipples_(), detectCareerRipples_(), detectMigrationRipples_(), detectNewRipples_() (+4 more)

### Community 67 - "Community 67"
Cohesion: 0.38
Nodes (12): buildCard(), clean(), culIdFromContent(), getDocWithRetry(), indexHeader(), listPageWithRetry(), main(), searchSupermemory() (+4 more)

### Community 68 - "Community 68"
Cohesion: 0.29
Nodes (12): buildSystemPrompt(), buildUserPrompt(), callClaude(), loadFamilyData(), loadFamilyHistory(), loadIdentity(), loadJournalTail(), logRun() (+4 more)

### Community 69 - "Community 69"
Cohesion: 0.31
Nodes (12): buildLedgerIndex(), extractSection(), inferNeighborhood(), inferSector(), lookupCitizen(), main(), parseBusinessMentions(), parseCitizenUsageLog() (+4 more)

### Community 70 - "Community 70"
Cohesion: 0.28
Nodes (11): buildArticlePrompt(), callHaiku(), computeAge(), formatAuthoritativeBlock(), loadCanonContext(), main(), normalizeName(), parseJsonSafely() (+3 more)

### Community 71 - "Community 71"
Cohesion: 0.21
Nodes (6): batchRecordFaithEvents_(), ensureFaithLedgerSchema_(), getFaithOrganizations_(), getFaithOrgsByNeighborhood_(), getFaithOrgsByTradition_(), recordFaithEvent_()

### Community 72 - "Community 72"
Cohesion: 0.36
Nodes (10): findColByName_(), getCurrentCycleFromConfig_(), isEmergenceUsage_(), markAsEmergedInGeneric_(), markUsageProcessed_(), processAdvancementIntake_(), processAdvancementRows_(), processIntakeRows_() (+2 more)

### Community 73 - "Community 73"
Cohesion: 0.3
Nodes (10): classify_(), consistency_(), extractTag_(), l1_(), missedBig_(), nudges_(), prompt_(), rawClassify_() (+2 more)

### Community 74 - "Community 74"
Cohesion: 0.39
Nodes (10): ageBracket(), deriveDebtLevel(), deriveMaritalStatus(), deriveNetWorth(), deriveNumChildren(), deriveYearsInCareer(), hashSeed(), main() (+2 more)

### Community 75 - "Community 75"
Cohesion: 0.32
Nodes (11): buildIndex(), classifyFile(), contentKey(), detectDesk(), extractAuthor(), extractCycle(), extractTitle(), findFiles() (+3 more)

### Community 76 - "Community 76"
Cohesion: 0.42
Nodes (11): bizIdFromContent(), buildCard(), clean(), getDocWithRetry(), listPageWithRetry(), main(), searchSupermemory(), smRequest() (+3 more)

### Community 77 - "Community 77"
Cohesion: 0.3
Nodes (11): assembleHoodSources(), assignCityEvents(), buildNeighborhoodTexture(), buildPrompt(), buildRealNameSweep(), generateTexture(), incomeBand(), main() (+3 more)

### Community 78 - "Community 78"
Cohesion: 0.23
Nodes (6): extractCycleFromContent(), findPriorCitizenRecords(), parseCycleFlag(), parseFlag(), parseType(), searchSupermemoryJSON()

### Community 79 - "Community 79"
Cohesion: 0.38
Nodes (11): deriveSinceDate(), enclosingFunction(), engineMdExceptionFiles(), isCommentLine(), listJsFiles(), loadKnownGaps(), main(), scanEngineChanges() (+3 more)

### Community 80 - "Community 80"
Cohesion: 0.39
Nodes (10): checkBaseContext(), checkBriefingExists(), checkFileExists(), checkJsonValid(), checkPacketSize(), checkTrueSource(), checkVoiceFiles(), critical() (+2 more)

### Community 81 - "Community 81"
Cohesion: 0.35
Nodes (11): callTool(), connect(), disconnect(), loadState(), logRun(), main(), miningRun(), saveState() (+3 more)

### Community 82 - "Community 82"
Cohesion: 0.2
Nodes (3): batchRecordYouthEvents_(), ensureYouthEventsSchema_(), recordYouthEvent_()

### Community 83 - "Community 83"
Cohesion: 0.2
Nodes (2): getSimHoliday_(), getSimHolidayDetails_()

### Community 84 - "Community 84"
Cohesion: 0.35
Nodes (10): checkResolutionConditions_(), checkResolutionKeywords_(), detectFizzledStorylines_(), detectStaleStorylines_(), generateFizzledHook_(), generateStaleHook_(), generateWrapUpHook_(), loadActiveStorylinesForHealth_() (+2 more)

### Community 85 - "Community 85"
Cohesion: 0.31
Nodes (10): exportHealthCauseQueue_(), generateHealthCauseBriefing_(), isHealthStatusNeedingCause_(), normalizeHealthStatus_(), parseHealthCauseMarkdown_(), processHealthCauseIntake_(), runExportHealthCauseQueue(), runGenerateHealthBriefing() (+2 more)

### Community 86 - "Community 86"
Cohesion: 0.35
Nodes (10): apiCall(), classify(), looksLikeCultural(), looksLikeNeighborhood(), looksLikePlayerTrueSource(), looksLikeRegistryOneLiner(), main(), pass1EnumerateWorldDataIds() (+2 more)

### Community 87 - "Community 87"
Cohesion: 0.35
Nodes (10): aggregatePairs(), findEditionFile(), findLatestEditionCycle(), main(), matchCitizensToStorylines(), parseArgs(), parseArticleTable(), parseCitizenUsageLog() (+2 more)

### Community 88 - "Community 88"
Cohesion: 0.44
Nodes (10): collectTargets(), doSeal(), doVerify(), loadManifest(), main(), manifestPath(), parseArgs(), relKey() (+2 more)

### Community 89 - "Community 89"
Cohesion: 0.35
Nodes (10): buildBlameAttribution(), checkProvenance(), laneRecord(), loadJson(), main(), quadrantFixPhrasing(), readMeasurementIntegrity(), resolveCycle() (+2 more)

### Community 90 - "Community 90"
Cohesion: 0.29
Nodes (8): batchUpdateCrimeMetrics_(), ensureCrimeMetricsSchema_(), getCityWideCrimeStats_(), getCrimeMetrics_(), getCrimeMetricsForNeighborhood_(), getHighCrimeNeighborhoods_(), seedCrimeMetricsFromProfiles_(), updateCrimeMetrics_()

### Community 91 - "Community 91"
Cohesion: 0.45
Nodes (10): computeArcMultiplier_(), computeCoverageMultiplier_(), computePriorityScore_(), isConsequenceFloor_(), loadCoverageStateForDomain_(), loadStorylineStateForSeed_(), normalizeCoverageDomain_(), parseCoverageRow_() (+2 more)

### Community 92 - "Community 92"
Cohesion: 0.36
Nodes (9): countEventsByType_(), createFaithSignalChain_(), detectCrisisConditions_(), formatFaithEventDescription_(), generateInterfaithEvents_(), generateOrgEvents_(), getFaithStorySignals_(), runFaithEventsEngine_() (+1 more)

### Community 93 - "Community 93"
Cohesion: 0.38
Nodes (9): createChicagoCitizensSheet_(), generateAge_(), generateChicagoCitizen_(), generateChicagoCitizens_(), generateId_(), generateTier_(), getChicagoOccupation_(), pickWeightedRandom_() (+1 more)

### Community 94 - "Community 94"
Cohesion: 0.36
Nodes (8): cleanSectionName_(), determineNoteType_(), extractCitizens_(), isSectionHeader_(), parseContinuityNotes(), parseContinuityText(), parseLine_(), parseLines_()

### Community 95 - "Community 95"
Cohesion: 0.36
Nodes (8): attributeInitiative(), buildDecisions(), buildGroups(), concatMilestoneNotes(), pickPrimary(), priorityFor(), renderConsolidatedFrom(), voiceFor()

### Community 96 - "Community 96"
Cohesion: 0.38
Nodes (9): apiCall(), classify(), detectCanonWrapper(), detectMastheadType(), detectWikiShape(), main(), pass1EnumerateBayTribuneIds(), pass2FetchAndClassify() (+1 more)

### Community 97 - "Community 97"
Cohesion: 0.36
Nodes (9): appendCascade(), buildCascadeBlock(), formatStatementBlock(), groupStatementsByInitiative(), main(), parseArg(), parseCycle(), parseRoutingTable() (+1 more)

### Community 98 - "Community 98"
Cohesion: 0.33
Nodes (7): findLatestClassified(), fmtBytes(), groupByTopDir(), main(), parseArgs(), renderTable(), topByBytes()

### Community 99 - "Community 99"
Cohesion: 0.42
Nodes (9): artifactMtimes(), escapeRe(), gapLogPath(), legPresent(), main(), readCycleFromSessionContext(), readSessionStartMs(), runSelfCheck() (+1 more)

### Community 100 - "Community 100"
Cohesion: 0.42
Nodes (9): addDocument(), extractCycle(), main(), parseCycleFlag(), parseFlag(), parseType(), splitEdition(), stripMetadataLeaks() (+1 more)

### Community 101 - "Community 101"
Cohesion: 0.39
Nodes (8): buildDualPrompt_(), buildPrompt_(), classifyDualReflection_(), classifyReflection_(), extractAffect_(), extractEvent_(), extractTag_(), parseDualRaw_()

### Community 102 - "Community 102"
Cohesion: 0.42
Nodes (8): assessDisplacementRisk_(), buildHouseholdRentBurdenMap_(), buildNeighborhoodPressureMap_(), checkForDisplacedCitizens_(), generateMigrationHooks_(), processMigrationEvents_(), processMigrationTracking_(), updateMigrationIntent_()

### Community 103 - "Community 103"
Cohesion: 0.47
Nodes (8): executeEnsureIntent_(), executePersistIntents_(), executeReplaceIntent_(), executeSheetIntents_(), getTotalIntentCount_(), groupIntentsBySheet_(), logIntentSummary_(), persistWithRetry_()

### Community 104 - "Community 104"
Cohesion: 0.56
Nodes (8): buildAsRoster(), buildBusinessRegistry(), buildChicagoRoster(), buildCitizenRoster(), buildFaithRegistry(), buildTribuneRoster(), main(), pad()

### Community 105 - "Community 105"
Cohesion: 0.42
Nodes (8): classifyFailure(), getCurrentCycle(), loadAssertions(), loadAuditJson(), loadEdition(), loadSheetSnapshot(), main(), summarize()

### Community 106 - "Community 106"
Cohesion: 0.42
Nodes (7): main(), parseArticleTableRow(), parseCitizenLine(), parseDashLine(), parseNeighborhood(), parseStorylineLine(), scanIntakeSections()

### Community 107 - "Community 107"
Cohesion: 0.42
Nodes (8): buildCitizenIncomes(), getCurrentCycle(), loadPreviousAudits(), loadPriorFixture(), loadSnapshot(), main(), runEngineAudit(), summarize()

### Community 108 - "Community 108"
Cohesion: 0.42
Nodes (8): enrichFromEdition(), escapeRegex(), extractCitizenContext(), extractCitizenNamesFromLog(), main(), parseEdition(), parseNamesIndex(), smartSplit()

### Community 109 - "Community 109"
Cohesion: 0.44
Nodes (8): ageOf(), cmpScore(), colLetter(), main(), makePair(), normGender(), popN(), runGates()

### Community 110 - "Community 110"
Cohesion: 0.42
Nodes (8): buildSpecBlock(), detectMediaType(), evaluatePhoto(), main(), parseArgs(), parseList(), parseResponse(), parseYesNo()

### Community 111 - "Community 111"
Cohesion: 0.56
Nodes (8): main(), output(), queryArticles(), queryCitizen(), queryCouncil(), queryInitiative(), queryNeighborhood(), queryVerify()

### Community 112 - "Community 112"
Cohesion: 0.42
Nodes (8): loadEditionsSafe(), main(), resolveCycle(), scanCherryPicking(), scanCitizenReuse(), scanOODCriteria(), scanRubricExecution(), scanRubricSignalDensity()

### Community 113 - "Community 113"
Cohesion: 0.42
Nodes (8): buildSeedIndex(), findLatestCycleWithProposals(), loadProposals(), main(), parseArgs(), renderProposalsTable(), renderTopSeedsTable(), topScoredSeeds()

### Community 114 - "Community 114"
Cohesion: 0.53
Nodes (8): apiCall(), enumerateWorldData(), findSnapshots(), getWithRetry(), listPageWithRetry(), main(), matchesSnapshot(), sleep()

### Community 115 - "Community 115"
Cohesion: 0.33
Nodes (6): batchUpdateNeighborhoodDemographics_(), ensureNeighborhoodDemographicsSchema_(), getNeighborhoodDemographic_(), getNeighborhoodDemographics_(), seedNeighborhoodDemographicsFromLedger_(), updateSingleNeighborhoodDemographics_()

### Community 116 - "Community 116"
Cohesion: 0.39
Nodes (5): buildPhotoPrompt(), extractScene(), generatePhoto(), generateWithTogether(), resolvePhotographer()

### Community 117 - "Community 117"
Cohesion: 0.46
Nodes (7): createRelationshipBondsSheet_(), createSeedBond_(), findSeedColumnIndex_(), generateSeedBondId_(), makeBondKey_(), seedRelationshipBonds_(), testBondSeeding_()

### Community 118 - "Community 118"
Cohesion: 0.46
Nodes (7): calculateTensionDrift_(), checkConditionResolution_(), determinePhase_(), gatherWorldState_(), getResolutionText_(), processArcLifecycle_(), updateArcLedger_()

### Community 119 - "Community 119"
Cohesion: 0.29
Nodes (2): bandIdx(), disposition()

### Community 120 - "Community 120"
Cohesion: 0.29
Nodes (2): bandIdx(), disposition()

### Community 121 - "Community 121"
Cohesion: 0.46
Nodes (7): apiCall(), classify(), detectCanonWrapper(), detectMastheadType(), detectWikiShape(), main(), sleep()

### Community 122 - "Community 122"
Cohesion: 0.46
Nodes (7): basenameForms(), buildBasenameMap(), findLatestInventory(), main(), parseArgs(), scanCorpus(), scanCorpusFile()

### Community 123 - "Community 123"
Cohesion: 0.46
Nodes (7): buildReport(), lintRollout(), main(), parseResearch(), parseRollout(), printSection(), runLint()

### Community 124 - "Community 124"
Cohesion: 0.46
Nodes (7): deriveOutDir(), main(), parseArgs(), runQaAndRegenLoop(), syncDropStateToManifest(), validateSpec(), writeQaSidecar()

### Community 125 - "Community 125"
Cohesion: 0.46
Nodes (7): buildReport(), ensureDir(), firstMatchSummary(), main(), runLayer3(), runLayer4(), runLayer6()

### Community 126 - "Community 126"
Cohesion: 0.46
Nodes (7): buildCitizenUsageRows(), buildQuoteLog(), buildStorylineIntakeRows(), buildStorylineTrackerRows(), extractIntakeSection(), main(), parseIntakeLines()

### Community 127 - "Community 127"
Cohesion: 0.5
Nodes (7): bold(), colorize(), dim(), green(), main(), splitCycleTaggedEntries(), yellow()

### Community 128 - "Community 128"
Cohesion: 0.5
Nodes (7): collectCycleFiles(), main(), printHuman(), resolveCycle(), scanCycle(), scanFiles(), writeReport()

### Community 129 - "Community 129"
Cohesion: 0.43
Nodes (7): countRowsAfterCycle_(), deleteRowsAfterCycle_(), previewRollbackToCycle78(), resetCycleCounter_(), revertCivicOfficeUpdates_(), revertInitiativeVotes_(), rollbackToCycle78()

### Community 130 - "Community 130"
Cohesion: 0.52
Nodes (6): appendReflection_(), colLetter_(), ensurePagePointer_(), pageTagFor(), readPage_(), recentPage_()

### Community 131 - "Community 131"
Cohesion: 0.29
Nodes (0): 

### Community 132 - "Community 132"
Cohesion: 0.57
Nodes (6): bindCanonicalHeadlines(), guessBeat(), looksLikeByline(), normalizeSectionId(), parseArticleTable(), parseEdition()

### Community 133 - "Community 133"
Cohesion: 0.52
Nodes (5): parseBlocks(), parseDateLoose(), readFileSafe(), readLast(), readSince()

### Community 134 - "Community 134"
Cohesion: 0.52
Nodes (6): calculateChicagoSentiment_(), chicagoSatelliteEngine_(), generateChicagoEvents_(), generateChicagoTravel_(), generateChicagoWeather_(), getBullsSentimentImpact_()

### Community 135 - "Community 135"
Cohesion: 0.38
Nodes (3): compactMediaEffects_(), compactNeighborhoodDynamics_(), finalizeCycleState_()

### Community 136 - "Community 136"
Cohesion: 0.52
Nodes (6): auditVoiceStatementSchema(), findDecisionFiles(), isValidOwnerForm(), main(), normalizeTrackerWrite(), summarizeSchemaAudit()

### Community 137 - "Community 137"
Cohesion: 0.52
Nodes (6): detectDrifts(), detectVerbMatch(), extractFrontmatterTags(), getChangelogEntries(), getStatusTag(), main()

### Community 138 - "Community 138"
Cohesion: 0.43
Nodes (4): copySpreadsheetInDrive(), exportAllTabsAsCsv(), getOAuth2Client(), main()

### Community 139 - "Community 139"
Cohesion: 0.57
Nodes (6): copyIfExists(), ensureDir(), generateInitiativeBriefing(), main(), readIfExists(), readJsonIfExists()

### Community 140 - "Community 140"
Cohesion: 0.62
Nodes (6): checkCivicDispatches(), checkInitiativeSpotlights(), checkNeighborhoodReports(), getStatements(), main(), readJson()

### Community 141 - "Community 141"
Cohesion: 0.57
Nodes (6): compose_(), l1_(), missedBig_(), runCombined_(), runSet_(), signFlip_()

### Community 142 - "Community 142"
Cohesion: 0.52
Nodes (6): buildMarkdown(), crawl(), getAuth(), listFolder(), main(), sleep()

### Community 143 - "Community 143"
Cohesion: 0.43
Nodes (4): buildGitTrackedSet(), main(), parseArgs(), walk()

### Community 144 - "Community 144"
Cohesion: 0.52
Nodes (6): birthYearFromName(), colIdxToLetter(), deriveRoleType(), hashName(), main(), parseLeaderName()

### Community 145 - "Community 145"
Cohesion: 0.52
Nodes (6): buildLaneJson(), main(), parseCheckLine(), parseListField(), parseStructuredTop(), resolveInput()

### Community 146 - "Community 146"
Cohesion: 0.62
Nodes (6): addDoc(), apiCall(), getDoc(), listPage(), main(), mapTags()

### Community 147 - "Community 147"
Cohesion: 0.57
Nodes (6): blank(), classifyInitiativeRow(), deriveTargetCycle(), loadSheet(), main(), parseArgCycle()

### Community 148 - "Community 148"
Cohesion: 0.48
Nodes (5): bold(), colorize(), dim(), green(), red()

### Community 149 - "Community 149"
Cohesion: 0.52
Nodes (6): countReferences(), extractFunctions(), isAllowlisted(), listEngineFiles(), main(), walk()

### Community 150 - "Community 150"
Cohesion: 0.48
Nodes (5): djb2(), main(), parseJSON(), rand01(), runGates()

### Community 151 - "Community 151"
Cohesion: 0.52
Nodes (5): hasTrackerWork(), loadRecords(), resolveInitiativeId(), validateCycle(), validateRecords()

### Community 152 - "Community 152"
Cohesion: 0.52
Nodes (5): escapeRegExpChaos_(), isArrayChaos_(), validateAllChaosConfigs_(), validateOutcome(), validateVehicleConfig()

### Community 153 - "Community 153"
Cohesion: 0.48
Nodes (5): applyDropdownValidation_(), setupChicagoFeedOnly(), setupFeedSheet_(), setupOaklandFeedOnly(), setupSportsFeedValidation()

### Community 154 - "Community 154"
Cohesion: 0.4
Nodes (2): bandIdx(), disposition()

### Community 155 - "Community 155"
Cohesion: 0.6
Nodes (5): excerptAround(), findLineNumber(), logBlock(), scan(), scanFile()

### Community 156 - "Community 156"
Cohesion: 0.6
Nodes (5): canonicalizePhase(), intensityOf(), isCanonical(), nextPhase(), normKey()

### Community 157 - "Community 157"
Cohesion: 0.4
Nodes (2): hash53_(), selectProvocation()

### Community 158 - "Community 158"
Cohesion: 0.6
Nodes (5): checkSchoolQuality_(), deriveEducationLevels_(), detectCareerMobility_(), processEducationCareer_(), updateCareerProgression_()

### Community 159 - "Community 159"
Cohesion: 0.6
Nodes (5): checkContinuity_(), checkDistribution_(), checkSensitivity_(), checkToneContradictions_(), runPrePublicationValidation_()

### Community 160 - "Community 160"
Cohesion: 0.53
Nodes (4): deriveDomainPresenceV34_(), inferDomainFromTextV34_(), normalizeDomainV34_(), saveV3Domains_()

### Community 161 - "Community 161"
Cohesion: 0.6
Nodes (5): buildHolidayNeighborhoodMods_(), ensureNeighborhoodMapSchemaAppendOnly_(), getDemographicMarkerV35_(), pulseFoldDelta_(), saveV3NeighborhoodMap_()

### Community 162 - "Community 162"
Cohesion: 0.53
Nodes (4): inferDesk(), inferErrorType(), inferReporter(), parseRheaReport()

### Community 163 - "Community 163"
Cohesion: 0.53
Nodes (4): applyUpdate(), locateRowByPopid(), main(), previewUpdate()

### Community 164 - "Community 164"
Cohesion: 0.6
Nodes (5): findLatestCycle(), main(), parseArgs(), renderDistribution(), summarizeDeck()

### Community 165 - "Community 165"
Cohesion: 0.6
Nodes (5): buildIneligibleMap(), buildLedgerPopIdSet(), extractCandidatePopIds(), main(), screenCandidates()

### Community 166 - "Community 166"
Cohesion: 0.53
Nodes (4): log(), main(), makeCtx(), mulberry32()

### Community 167 - "Community 167"
Cohesion: 0.53
Nodes (5): classifyEntry(), findLatestRefscan(), main(), matchesAny(), parseArgs()

### Community 168 - "Community 168"
Cohesion: 0.6
Nodes (5): buildTraitProfile(), colLetter(), main(), normalizeName(), simpleHash()

### Community 169 - "Community 169"
Cohesion: 0.6
Nodes (5): birthYearFromName(), colIdxToLetter(), hashName(), main(), parseCelebName()

### Community 170 - "Community 170"
Cohesion: 0.6
Nodes (5): main(), recomputeDerivedFields(), renderTxt(), resolveCycle(), validateSchema()

### Community 171 - "Community 171"
Cohesion: 0.6
Nodes (5): arg(), buildPassSection(), findNewestPassAnchor(), main(), parseRows()

### Community 172 - "Community 172"
Cohesion: 0.6
Nodes (5): extractTitle(), main(), parseCycle(), parseRolloutEntries(), renderOutput()

### Community 173 - "Community 173"
Cohesion: 0.53
Nodes (4): extractFunctions(), formatFunction(), main(), scanFile()

### Community 174 - "Community 174"
Cohesion: 0.6
Nodes (5): addMemory(), collectFiles(), deriveTitle(), main(), sleep()

### Community 175 - "Community 175"
Cohesion: 0.6
Nodes (5): archiveLifeHistory(), archiveLifeHistoryDryRun(), logCycleSummary_(), maintainLifeHistoryLog_(), runArchive_()

### Community 176 - "Community 176"
Cohesion: 0.6
Nodes (5): baseTag_(), hasTag_(), nudgesForEvent_(), nudgesForReflection_(), scale_()

### Community 177 - "Community 177"
Cohesion: 0.73
Nodes (5): ensureExportsFolder_(), exportAllCitizenData_(), exportCitizensSnapshot_(), exportCivicOfficials_(), findCol_()

### Community 178 - "Community 178"
Cohesion: 0.6
Nodes (3): checkFaithRow(), _hit(), loadFaithBlocklist()

### Community 179 - "Community 179"
Cohesion: 0.5
Nodes (2): getRetirementConvention(), renderConventionBlock()

### Community 180 - "Community 180"
Cohesion: 0.5
Nodes (2): computeHash(), normalizeEntry()

### Community 181 - "Community 181"
Cohesion: 0.7
Nodes (4): buildCitizenIndex(), citizenIndex(), citizenVoiceProvider(), loadCitizenCore()

### Community 182 - "Community 182"
Cohesion: 0.5
Nodes (2): eventArcEngine_(), getCurrentCycle_()

### Community 183 - "Community 183"
Cohesion: 0.7
Nodes (4): detectGentrificationPhase_(), generateGentrificationHooks_(), processGentrification_(), updateGentrificationPhases_()

### Community 184 - "Community 184"
Cohesion: 0.7
Nodes (4): existsInLedgerValues_(), getMaxPopIdFromValues_(), padNumber_(), processIntakeV3_()

### Community 185 - "Community 185"
Cohesion: 0.8
Nodes (4): citizenInActiveArc_(), getCitizenBonds_(), getCombinedEventBoost_(), runRelationshipEngine_()

### Community 186 - "Community 186"
Cohesion: 0.7
Nodes (4): findApprCol_(), isFailing_(), isPerforming_(), updateCivicApprovalRatings_()

### Community 187 - "Community 187"
Cohesion: 0.6
Nodes (3): applyMigrationDrift_(), createSeededRng_(), hashStringToUint32_()

### Community 188 - "Community 188"
Cohesion: 0.7
Nodes (4): findColByArray_(), generateStorylineBriefingSection_(), loadArcStatuses_(), updateStorylineStatus_()

### Community 189 - "Community 189"
Cohesion: 0.6
Nodes (3): generateAngle_(), generateHeadline_(), renderStorySeedsForUI_()

### Community 190 - "Community 190"
Cohesion: 0.4
Nodes (0): 

### Community 191 - "Community 191"
Cohesion: 0.5
Nodes (2): ensureCycleWeatherSheet_(), recordCycleWeather_()

### Community 192 - "Community 192"
Cohesion: 0.7
Nodes (4): addColumnsToSheet(), createMigrationEventsSheet(), main(), populateNeighborhoodGentrificationData()

### Community 193 - "Community 193"
Cohesion: 0.5
Nodes (2): displayTitle(), foLeaderString()

### Community 194 - "Community 194"
Cohesion: 0.4
Nodes (0): 

### Community 195 - "Community 195"
Cohesion: 0.4
Nodes (0): 

### Community 196 - "Community 196"
Cohesion: 0.7
Nodes (4): crawl(), listFolder(), main(), sleep()

### Community 197 - "Community 197"
Cohesion: 0.6
Nodes (3): buildMarkdown(), main(), sleep()

### Community 198 - "Community 198"
Cohesion: 0.8
Nodes (4): enumerate(), main(), smRequest(), smSleep()

### Community 199 - "Community 199"
Cohesion: 0.7
Nodes (4): groupBy(), main(), tally(), totalsOf()

### Community 200 - "Community 200"
Cohesion: 0.7
Nodes (4): extractArticles(), extractSections(), isAnnexMarker(), main()

### Community 201 - "Community 201"
Cohesion: 0.7
Nodes (4): computeTrend(), gradeFromValue(), main(), normalizeReporter()

### Community 202 - "Community 202"
Cohesion: 0.5
Nodes (2): parseCycleFlag(), parseFlag()

### Community 203 - "Community 203"
Cohesion: 0.7
Nodes (4): buildChecklist(), buildNonEditionChecklist(), main(), readFlag()

### Community 204 - "Community 204"
Cohesion: 0.7
Nodes (4): formatBizId(), isDuplicate(), main(), normalizeName()

### Community 205 - "Community 205"
Cohesion: 0.7
Nodes (4): columnToLetter(), getClient(), getSpreadsheetId(), main()

### Community 206 - "Community 206"
Cohesion: 0.4
Nodes (0): 

### Community 207 - "Community 207"
Cohesion: 0.4
Nodes (0): 

### Community 208 - "Community 208"
Cohesion: 0.7
Nodes (4): classifyArticle(), loadJsonSafe(), main(), resolveCycle()

### Community 209 - "Community 209"
Cohesion: 0.7
Nodes (4): cycleArg(), isBlank(), isFiniteNum(), main()

### Community 210 - "Community 210"
Cohesion: 0.6
Nodes (3): ensureRelationshipBondLedgerSchema_(), ensureRelationshipBondSchemas_(), ensureRelationshipBondsSchema_()

### Community 211 - "Community 211"
Cohesion: 0.7
Nodes (4): columnToLetter_(), exportAllHeaders(), exportAndPushToGitHub(), exportSingleSheetHeaders()

### Community 212 - "Community 212"
Cohesion: 0.5
Nodes (0): 

### Community 213 - "Community 213"
Cohesion: 0.5
Nodes (0): 

### Community 214 - "Community 214"
Cohesion: 0.67
Nodes (2): applyInitiativeImplementationEffects_(), findImplCol_()

### Community 215 - "Community 215"
Cohesion: 0.83
Nodes (3): buildOfficeLookup_(), generateCivicModeEvents_(), mulberry32CivicMode_()

### Community 216 - "Community 216"
Cohesion: 0.83
Nodes (3): buildCyclePacket_(), getCivicContextForPacket_(), getMonthName_Packet_()

### Community 217 - "Community 217"
Cohesion: 0.5
Nodes (0): 

### Community 218 - "Community 218"
Cohesion: 0.67
Nodes (2): block(), body()

### Community 219 - "Community 219"
Cohesion: 0.83
Nodes (3): addColumnsToSheet(), main(), verifyCulturalLedgerColumns()

### Community 220 - "Community 220"
Cohesion: 0.83
Nodes (3): addColumnsToSheet(), main(), populateNeighborhoodSchoolData()

### Community 221 - "Community 221"
Cohesion: 0.83
Nodes (3): addColumnsToSheet(), createSheet(), main()

### Community 222 - "Community 222"
Cohesion: 0.83
Nodes (3): getClient(), main(), parsePopId()

### Community 223 - "Community 223"
Cohesion: 0.83
Nodes (3): deriveEducation(), latestIncomeByNeighborhood(), main()

### Community 224 - "Community 224"
Cohesion: 0.83
Nodes (3): groupBy(), indexHeader(), main()

### Community 225 - "Community 225"
Cohesion: 0.83
Nodes (3): fetchJSON(), loadEditionTexts(), main()

### Community 226 - "Community 226"
Cohesion: 0.83
Nodes (3): buildEarlierCycleFingerprints(), cleanCitizenName(), main()

### Community 227 - "Community 227"
Cohesion: 0.67
Nodes (2): colLetter(), main()

### Community 228 - "Community 228"
Cohesion: 0.83
Nodes (3): allDocs(), main(), parseArgs()

### Community 229 - "Community 229"
Cohesion: 0.5
Nodes (0): 

### Community 230 - "Community 230"
Cohesion: 0.83
Nodes (3): main(), resolveTarget(), validate()

### Community 231 - "Community 231"
Cohesion: 0.83
Nodes (3): main(), safeName(), sleep()

### Community 232 - "Community 232"
Cohesion: 0.67
Nodes (2): mdRow(), mdTable()

### Community 233 - "Community 233"
Cohesion: 0.83
Nodes (3): lintText(), main(), resolveFiles()

### Community 234 - "Community 234"
Cohesion: 0.83
Nodes (3): askNext(), buildResponse(), saveResponse()

### Community 235 - "Community 235"
Cohesion: 0.5
Nodes (0): 

### Community 236 - "Community 236"
Cohesion: 0.5
Nodes (0): 

### Community 237 - "Community 237"
Cohesion: 0.83
Nodes (3): deleteSheet(), main(), removeColumnsFromSheet()

### Community 238 - "Community 238"
Cohesion: 0.83
Nodes (3): deleteSheet(), main(), removeColumnsFromSheet()

### Community 239 - "Community 239"
Cohesion: 0.5
Nodes (0): 

### Community 240 - "Community 240"
Cohesion: 0.5
Nodes (0): 

### Community 241 - "Community 241"
Cohesion: 0.83
Nodes (3): fail(), main(), pass()

### Community 242 - "Community 242"
Cohesion: 0.83
Nodes (3): chaosDecayFraction_(), chaosDecayResidualOneCycle_(), chaosResidualAfter_()

### Community 243 - "Community 243"
Cohesion: 0.83
Nodes (3): mergeFx_(), pulseForEvent_(), recordPulse_()

### Community 244 - "Community 244"
Cohesion: 0.67
Nodes (2): applyInitiativeDropdown_(), setupInitiativeTrackerValidation()

### Community 245 - "Community 245"
Cohesion: 0.5
Nodes (0): 

### Community 246 - "Community 246"
Cohesion: 1.0
Nodes (2): sanitize(), wrap()

### Community 247 - "Community 247"
Cohesion: 0.67
Nodes (0): 

### Community 248 - "Community 248"
Cohesion: 0.67
Nodes (0): 

### Community 249 - "Community 249"
Cohesion: 0.67
Nodes (0): 

### Community 250 - "Community 250"
Cohesion: 1.0
Nodes (2): applyEditionCoverageEffects_(), findCoverageCol_()

### Community 251 - "Community 251"
Cohesion: 0.67
Nodes (0): 

### Community 252 - "Community 252"
Cohesion: 1.0
Nodes (2): buildNeighborhoodDemographicModifiers_(), updateNeighborhoodDemographics_()

### Community 253 - "Community 253"
Cohesion: 1.0
Nodes (2): generateGameModeMicroEvents_(), mulberry32GameMode_()

### Community 254 - "Community 254"
Cohesion: 1.0
Nodes (2): pickWeightedSafe_(), worldEventsEngine_()

### Community 255 - "Community 255"
Cohesion: 1.0
Nodes (2): generateMediaModeEvents_(), mulberry32MediaMode_()

### Community 256 - "Community 256"
Cohesion: 1.0
Nodes (2): mulberry32_uni_(), runAsUniversePipeline_()

### Community 257 - "Community 257"
Cohesion: 0.67
Nodes (0): 

### Community 258 - "Community 258"
Cohesion: 0.67
Nodes (0): 

### Community 259 - "Community 259"
Cohesion: 1.0
Nodes (2): buildMediaPacket_(), populateMediaIntake_()

### Community 260 - "Community 260"
Cohesion: 1.0
Nodes (2): mulberry32_(), textureTriggerEngine_()

### Community 261 - "Community 261"
Cohesion: 1.0
Nodes (2): loadActiveArcsFromLedger_(), v3PreloadContext_()

### Community 262 - "Community 262"
Cohesion: 0.67
Nodes (0): 

### Community 263 - "Community 263"
Cohesion: 1.0
Nodes (2): chaosTimestampUtc_(), writeChaosCarsRow_()

### Community 264 - "Community 264"
Cohesion: 1.0
Nodes (2): addColumnsToSheet(), main()

### Community 265 - "Community 265"
Cohesion: 1.0
Nodes (2): addColumnsToSheet(), main()

### Community 266 - "Community 266"
Cohesion: 1.0
Nodes (2): columnToLetter(), main()

### Community 267 - "Community 267"
Cohesion: 1.0
Nodes (2): addColumnsToSheet(), main()

### Community 268 - "Community 268"
Cohesion: 1.0
Nodes (2): addColumnsToSheet(), main()

### Community 269 - "Community 269"
Cohesion: 0.67
Nodes (0): 

### Community 270 - "Community 270"
Cohesion: 1.0
Nodes (2): dirStats(), main()

### Community 271 - "Community 271"
Cohesion: 1.0
Nodes (2): main(), walkScripts()

### Community 272 - "Community 272"
Cohesion: 1.0
Nodes (2): loadInitiativePacket(), main()

### Community 273 - "Community 273"
Cohesion: 1.0
Nodes (2): run(), synthesize()

### Community 274 - "Community 274"
Cohesion: 1.0
Nodes (2): downloadFile(), main()

### Community 275 - "Community 275"
Cohesion: 1.0
Nodes (2): log(), main()

### Community 276 - "Community 276"
Cohesion: 1.0
Nodes (2): downloadFile(), main()

### Community 277 - "Community 277"
Cohesion: 1.0
Nodes (2): downloadFile(), main()

### Community 278 - "Community 278"
Cohesion: 1.0
Nodes (2): get(), run()

### Community 279 - "Community 279"
Cohesion: 0.67
Nodes (0): 

### Community 280 - "Community 280"
Cohesion: 1.0
Nodes (2): main(), removeColumnsFromSheet()

### Community 281 - "Community 281"
Cohesion: 1.0
Nodes (2): main(), removeColumnsFromSheet()

### Community 282 - "Community 282"
Cohesion: 1.0
Nodes (2): main(), removeColumnsFromSheet()

### Community 283 - "Community 283"
Cohesion: 1.0
Nodes (2): main(), removeColumnsFromSheet()

### Community 284 - "Community 284"
Cohesion: 1.0
Nodes (2): main(), removeColumnsFromSheet()

### Community 285 - "Community 285"
Cohesion: 1.0
Nodes (2): main(), removeColumnsFromSheet()

### Community 286 - "Community 286"
Cohesion: 1.0
Nodes (2): buildBlock(), main()

### Community 287 - "Community 287"
Cohesion: 1.0
Nodes (2): main(), updateFile()

### Community 288 - "Community 288"
Cohesion: 0.67
Nodes (0): 

### Community 289 - "Community 289"
Cohesion: 1.0
Nodes (2): getSheetHeaders(), verifyMigrations()

### Community 290 - "Community 290"
Cohesion: 0.67
Nodes (0): 

### Community 291 - "Community 291"
Cohesion: 0.67
Nodes (0): 

### Community 292 - "Community 292"
Cohesion: 0.67
Nodes (0): 

### Community 293 - "Community 293"
Cohesion: 1.0
Nodes (2): crawlAllTxtFiles(), runTextCrawler()

### Community 294 - "Community 294"
Cohesion: 0.67
Nodes (0): 

### Community 295 - "Community 295"
Cohesion: 1.0
Nodes (0): 

### Community 296 - "Community 296"
Cohesion: 1.0
Nodes (0): 

### Community 297 - "Community 297"
Cohesion: 1.0
Nodes (0): 

### Community 298 - "Community 298"
Cohesion: 1.0
Nodes (0): 

### Community 299 - "Community 299"
Cohesion: 1.0
Nodes (0): 

### Community 300 - "Community 300"
Cohesion: 1.0
Nodes (0): 

### Community 301 - "Community 301"
Cohesion: 1.0
Nodes (0): 

### Community 302 - "Community 302"
Cohesion: 1.0
Nodes (0): 

### Community 303 - "Community 303"
Cohesion: 1.0
Nodes (0): 

### Community 304 - "Community 304"
Cohesion: 1.0
Nodes (0): 

### Community 305 - "Community 305"
Cohesion: 1.0
Nodes (0): 

### Community 306 - "Community 306"
Cohesion: 1.0
Nodes (0): 

### Community 307 - "Community 307"
Cohesion: 1.0
Nodes (0): 

### Community 308 - "Community 308"
Cohesion: 1.0
Nodes (0): 

### Community 309 - "Community 309"
Cohesion: 1.0
Nodes (0): 

### Community 310 - "Community 310"
Cohesion: 1.0
Nodes (0): 

### Community 311 - "Community 311"
Cohesion: 1.0
Nodes (0): 

### Community 312 - "Community 312"
Cohesion: 1.0
Nodes (0): 

### Community 313 - "Community 313"
Cohesion: 1.0
Nodes (0): 

### Community 314 - "Community 314"
Cohesion: 1.0
Nodes (0): 

### Community 315 - "Community 315"
Cohesion: 1.0
Nodes (0): 

### Community 316 - "Community 316"
Cohesion: 1.0
Nodes (0): 

### Community 317 - "Community 317"
Cohesion: 1.0
Nodes (0): 

### Community 318 - "Community 318"
Cohesion: 1.0
Nodes (0): 

### Community 319 - "Community 319"
Cohesion: 1.0
Nodes (0): 

### Community 320 - "Community 320"
Cohesion: 1.0
Nodes (0): 

### Community 321 - "Community 321"
Cohesion: 1.0
Nodes (0): 

### Community 322 - "Community 322"
Cohesion: 1.0
Nodes (0): 

### Community 323 - "Community 323"
Cohesion: 1.0
Nodes (0): 

### Community 324 - "Community 324"
Cohesion: 1.0
Nodes (0): 

### Community 325 - "Community 325"
Cohesion: 1.0
Nodes (0): 

### Community 326 - "Community 326"
Cohesion: 1.0
Nodes (0): 

### Community 327 - "Community 327"
Cohesion: 1.0
Nodes (0): 

### Community 328 - "Community 328"
Cohesion: 1.0
Nodes (0): 

### Community 329 - "Community 329"
Cohesion: 1.0
Nodes (0): 

### Community 330 - "Community 330"
Cohesion: 1.0
Nodes (0): 

### Community 331 - "Community 331"
Cohesion: 1.0
Nodes (0): 

### Community 332 - "Community 332"
Cohesion: 1.0
Nodes (0): 

### Community 333 - "Community 333"
Cohesion: 1.0
Nodes (0): 

### Community 334 - "Community 334"
Cohesion: 1.0
Nodes (0): 

### Community 335 - "Community 335"
Cohesion: 1.0
Nodes (0): 

### Community 336 - "Community 336"
Cohesion: 1.0
Nodes (0): 

### Community 337 - "Community 337"
Cohesion: 1.0
Nodes (0): 

### Community 338 - "Community 338"
Cohesion: 1.0
Nodes (0): 

### Community 339 - "Community 339"
Cohesion: 1.0
Nodes (0): 

### Community 340 - "Community 340"
Cohesion: 1.0
Nodes (0): 

### Community 341 - "Community 341"
Cohesion: 1.0
Nodes (0): 

### Community 342 - "Community 342"
Cohesion: 1.0
Nodes (0): 

### Community 343 - "Community 343"
Cohesion: 1.0
Nodes (0): 

### Community 344 - "Community 344"
Cohesion: 1.0
Nodes (0): 

### Community 345 - "Community 345"
Cohesion: 1.0
Nodes (0): 

### Community 346 - "Community 346"
Cohesion: 1.0
Nodes (0): 

### Community 347 - "Community 347"
Cohesion: 1.0
Nodes (0): 

### Community 348 - "Community 348"
Cohesion: 1.0
Nodes (0): 

### Community 349 - "Community 349"
Cohesion: 1.0
Nodes (0): 

### Community 350 - "Community 350"
Cohesion: 1.0
Nodes (0): 

### Community 351 - "Community 351"
Cohesion: 1.0
Nodes (0): 

### Community 352 - "Community 352"
Cohesion: 1.0
Nodes (0): 

### Community 353 - "Community 353"
Cohesion: 1.0
Nodes (0): 

### Community 354 - "Community 354"
Cohesion: 1.0
Nodes (0): 

### Community 355 - "Community 355"
Cohesion: 1.0
Nodes (0): 

### Community 356 - "Community 356"
Cohesion: 1.0
Nodes (0): 

### Community 357 - "Community 357"
Cohesion: 1.0
Nodes (0): 

### Community 358 - "Community 358"
Cohesion: 1.0
Nodes (0): 

### Community 359 - "Community 359"
Cohesion: 1.0
Nodes (0): 

### Community 360 - "Community 360"
Cohesion: 1.0
Nodes (0): 

### Community 361 - "Community 361"
Cohesion: 1.0
Nodes (0): 

### Community 362 - "Community 362"
Cohesion: 1.0
Nodes (0): 

### Community 363 - "Community 363"
Cohesion: 1.0
Nodes (0): 

### Community 364 - "Community 364"
Cohesion: 1.0
Nodes (0): 

### Community 365 - "Community 365"
Cohesion: 1.0
Nodes (0): 

### Community 366 - "Community 366"
Cohesion: 1.0
Nodes (0): 

### Community 367 - "Community 367"
Cohesion: 1.0
Nodes (0): 

### Community 368 - "Community 368"
Cohesion: 1.0
Nodes (0): 

### Community 369 - "Community 369"
Cohesion: 1.0
Nodes (0): 

### Community 370 - "Community 370"
Cohesion: 1.0
Nodes (0): 

### Community 371 - "Community 371"
Cohesion: 1.0
Nodes (0): 

### Community 372 - "Community 372"
Cohesion: 1.0
Nodes (0): 

### Community 373 - "Community 373"
Cohesion: 1.0
Nodes (0): 

### Community 374 - "Community 374"
Cohesion: 1.0
Nodes (0): 

### Community 375 - "Community 375"
Cohesion: 1.0
Nodes (0): 

### Community 376 - "Community 376"
Cohesion: 1.0
Nodes (0): 

### Community 377 - "Community 377"
Cohesion: 1.0
Nodes (0): 

### Community 378 - "Community 378"
Cohesion: 1.0
Nodes (0): 

### Community 379 - "Community 379"
Cohesion: 1.0
Nodes (0): 

### Community 380 - "Community 380"
Cohesion: 1.0
Nodes (0): 

### Community 381 - "Community 381"
Cohesion: 1.0
Nodes (0): 

### Community 382 - "Community 382"
Cohesion: 1.0
Nodes (0): 

### Community 383 - "Community 383"
Cohesion: 1.0
Nodes (0): 

### Community 384 - "Community 384"
Cohesion: 1.0
Nodes (0): 

### Community 385 - "Community 385"
Cohesion: 1.0
Nodes (0): 

### Community 386 - "Community 386"
Cohesion: 1.0
Nodes (0): 

### Community 387 - "Community 387"
Cohesion: 1.0
Nodes (0): 

### Community 388 - "Community 388"
Cohesion: 1.0
Nodes (0): 

### Community 389 - "Community 389"
Cohesion: 1.0
Nodes (0): 

### Community 390 - "Community 390"
Cohesion: 1.0
Nodes (0): 

### Community 391 - "Community 391"
Cohesion: 1.0
Nodes (0): 

### Community 392 - "Community 392"
Cohesion: 1.0
Nodes (0): 

### Community 393 - "Community 393"
Cohesion: 1.0
Nodes (0): 

### Community 394 - "Community 394"
Cohesion: 1.0
Nodes (0): 

### Community 395 - "Community 395"
Cohesion: 1.0
Nodes (0): 

### Community 396 - "Community 396"
Cohesion: 1.0
Nodes (0): 

### Community 397 - "Community 397"
Cohesion: 1.0
Nodes (0): 

### Community 398 - "Community 398"
Cohesion: 1.0
Nodes (0): 

### Community 399 - "Community 399"
Cohesion: 1.0
Nodes (0): 

### Community 400 - "Community 400"
Cohesion: 1.0
Nodes (0): 

### Community 401 - "Community 401"
Cohesion: 1.0
Nodes (0): 

### Community 402 - "Community 402"
Cohesion: 1.0
Nodes (0): 

### Community 403 - "Community 403"
Cohesion: 1.0
Nodes (0): 

### Community 404 - "Community 404"
Cohesion: 1.0
Nodes (0): 

### Community 405 - "Community 405"
Cohesion: 1.0
Nodes (0): 

### Community 406 - "Community 406"
Cohesion: 1.0
Nodes (0): 

### Community 407 - "Community 407"
Cohesion: 1.0
Nodes (0): 

### Community 408 - "Community 408"
Cohesion: 1.0
Nodes (0): 

### Community 409 - "Community 409"
Cohesion: 1.0
Nodes (0): 

## Knowledge Gaps
- **Thin community `Community 295`** (2 nodes): `getCurrentCycle.js`, `getCurrentCycle()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 296`** (2 nodes): `pipelineLogger.js`, `createPipelineLog()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 297`** (2 nodes): `staleness.js`, `checkArtifactStaleness()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 298`** (2 nodes): `initSimulationLedger.js`, `initSimulationLedger_()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 299`** (2 nodes): `applySeasonWeights.js`, `applySeasonalWeights_()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 300`** (2 nodes): `calendarChaosWeights.js`, `applyChaosCategoryWeights_()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 301`** (2 nodes): `calendarStorySeeds.js`, `applySeasonalStorySeeds_()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 302`** (2 nodes): `loadNeighborhoodState.js`, `loadNeighborhoodState_()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 303`** (2 nodes): `applyDemographicDrift.js`, `applyDemographicDrift_()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 304`** (2 nodes): `deriveDemographicDrift.js`, `deriveDemographicDrift_()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 305`** (2 nodes): `finalizeWorldPopulation.js`, `finalizeWorldPopulation_()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 306`** (2 nodes): `generateCrisisBuckets.js`, `generateCrisisBuckets_()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 307`** (2 nodes): `generateCrisisSpikes.js`, `generateCrisisSpikes_()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 308`** (2 nodes): `generateMonthlyDriftReport.js`, `generateMonthlyDriftReport()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 309`** (2 nodes): `updateCityTier.js`, `updateCityTier_()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 310`** (2 nodes): `buildCityEvents.js`, `buildCityEvents_()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 311`** (2 nodes): `generateGenericCitizenMicroEvent.js`, `generateGenericCitizenMicroEvents_()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 312`** (2 nodes): `applyChaosDecay.js`, `applyChaosDecay_()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 313`** (2 nodes): `applyNamedCitizenSpotlight.js`, `applyNamedCitizenSpotlights_()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 314`** (2 nodes): `checkForPromotions.js`, `checkForPromotions_()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 315`** (2 nodes): `generateCitizensEvents.js`, `generateCitizensEvents_()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 316`** (2 nodes): `generateGenericCitizens.js`, `generateGenericCitizens_()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 317`** (2 nodes): `generateMonthlyCivicSweep.js`, `generateMonthlyCivicSweep()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 318`** (2 nodes): `runCareerEngine.js`, `runCareerEngine_()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 319`** (2 nodes): `runCivicElectionsv1.js`, `runCivicElections_()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 320`** (2 nodes): `runCivicRoleEngine.js`, `runCivicRoleEngine_()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 321`** (2 nodes): `runConductEngine.js`, `runConductEngine_()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 322`** (2 nodes): `runEducationEngine.js`, `runEducationEngine_()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 323`** (2 nodes): `runHouseholdEngine.js`, `runHouseholdEngine_()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 324`** (2 nodes): `runNeighborhoodEngine.js`, `runNeighborhoodEngine_()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 325`** (2 nodes): `applyPatternDetection.js`, `applyPatternDetection_()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 326`** (2 nodes): `applyShockMonitor.js`, `applyShockMonitor_()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 327`** (2 nodes): `computeRecurringCitizens.js`, `computeRecurringCitizens_()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 328`** (2 nodes): `filterNoiseEvents.js`, `filterNoiseEvents_()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 329`** (2 nodes): `prioritizeEvents.js`, `prioritizeEvents_()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 330`** (2 nodes): `buildEveningFamous.js`, `buildEveningFamous_()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 331`** (2 nodes): `buildEveningFood.js`, `buildEveningFood_()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 332`** (2 nodes): `buildEveningMedia.js`, `buildEveningMedia_()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 333`** (2 nodes): `buildNightLife.js`, `buildNightlife_()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 334`** (2 nodes): `cityEveningSystems.js`, `buildCityEveningSystems_()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 335`** (2 nodes): `culturalLedger.js`, `registerCulturalEntity_()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 336`** (2 nodes): `domainTracker.js`, `domainTracker_()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 337`** (2 nodes): `parseMediaIntake.js`, `parseMediaIntake_()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 338`** (2 nodes): `sportsStreaming.js`, `buildEveningSportsAndStreaming_()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 339`** (2 nodes): `storyHook.js`, `storyHookEngine_()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 340`** (2 nodes): `updateMediaSpread.js`, `updateMediaSpread_()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 341`** (2 nodes): `updateTrendTrajectory.js`, `updateTrendTrajectory_()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 342`** (2 nodes): `applyCycleRecovery.js`, `applyCycleRecovery_()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 343`** (2 nodes): `applyDomainCooldowns.js`, `applyDomainCooldowns_()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 344`** (2 nodes): `v3LedgerWriter.js`, `saveV3ArcsToLedger_()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 345`** (2 nodes): `v3StoryHookWriter.js`, `saveV3Hooks_()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 346`** (2 nodes): `v3TextureWriter.js`, `saveV3Textures_()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 347`** (2 nodes): `applyCompressionDigestSummary.js`, `applyCompressedDigestSummary_()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 348`** (2 nodes): `commitSimulationLedger.js`, `commitSimulationLedger_()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 349`** (2 nodes): `recordMediaLedger.js`, `recordMediaLedger_()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 350`** (2 nodes): `recordWorldEventsv3.js`, `recordWorldEventsv3_()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 351`** (2 nodes): `saveV3Seeds.js`, `saveV3Seeds_()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 352`** (2 nodes): `aggregateNeighborhoodEconomics.js`, `main()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 353`** (2 nodes): `applyCitizenBios.js`, `main()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 354`** (2 nodes): `auditGenericCitizens.js`, `main()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 355`** (2 nodes): `auditPhase5Headers.js`, `main()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 356`** (2 nodes): `auditRemainingHeaders.js`, `main()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 357`** (2 nodes): `auditSheetHeaders.js`, `main()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 358`** (2 nodes): `authorizeDriveWrite.js`, `main()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 359`** (2 nodes): `buildMaraPacket.js`, `main()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 360`** (2 nodes): `canon3_followup_squatters.js`, `main()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 361`** (2 nodes): `canon_check.js`, `canon()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 362`** (2 nodes): `check-youth-citizens.js`, `main()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 363`** (2 nodes): `checkCycle81Data.js`, `checkCycle81Data()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 364`** (2 nodes): `checkCycleNumber.js`, `checkCycle()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 365`** (2 nodes): `checkPostPublishStaleness.js`, `parseCycleFlag()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 366`** (2 nodes): `cleanupStorylineTracker.js`, `main()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 367`** (2 nodes): `cleanup_storyline_tracker.js`, `main()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 368`** (2 nodes): `delete-continuity-tabs.js`, `main()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 369`** (2 nodes): `engineCycleAuditTest.js`, `assert()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 370`** (2 nodes): `fetchDriveFile.js`, `main()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 371`** (2 nodes): `findAllCycle81Data.js`, `findAllCycle81()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 372`** (2 nodes): `generate.js`, `main()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 373`** (2 nodes): `linkCitizensToEmployers.js`, `main()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 374`** (2 nodes): `listDriveFolder.js`, `main()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 375`** (2 nodes): `lookupPOPIDs.js`, `main()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 376`** (2 nodes): `prepAthleteIntegration.js`, `main()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 377`** (2 nodes): `registerEchoRoster.js`, `main()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 378`** (2 nodes): `repairArcLedgerHeaders.js`, `main()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 379`** (2 nodes): `repairPhase5Headers.js`, `main()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 380`** (2 nodes): `resetCycleTo80.js`, `resetCycle()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 381`** (2 nodes): `rollbackMayoralVetoColumns.js`, `main()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 382`** (2 nodes): `rotateJournalRecent.js`, `main()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 383`** (2 nodes): `sandcastlePoC.js`, `main()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 384`** (2 nodes): `saveCivicNarratives.js`, `main()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 385`** (2 nodes): `seedHouseholds.js`, `main()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 386`** (2 nodes): `seedNeighborhoodDistrict.js`, `main()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 387`** (2 nodes): `sync.js`, `main()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 388`** (2 nodes): `test-sheets.js`, `main()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 389`** (2 nodes): `testOpenRouterDesk.js`, `read()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 390`** (2 nodes): `validateIntakeDerivation.js`, `main()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 391`** (2 nodes): `diagnoseDashboardData.js`, `diagnoseDashboardData()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 392`** (2 nodes): `ensureCultureLedger.js`, `ensureCulturalLedger_()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 393`** (2 nodes): `ensureMediaLedger.js`, `ensureMediaLedger_()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 394`** (2 nodes): `ensureWorldEventsV3Ledger.js`, `ensureWorldEventsV3Ledger_()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 395`** (2 nodes): `godWorldMenu.js`, `onOpen()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 396`** (2 nodes): `safeRand.js`, `safeRand_()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 397`** (2 nodes): `sheetNames.js`, `getSheet_()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 398`** (1 nodes): `canonNeighborhoods.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 399`** (1 nodes): `env.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 400`** (1 nodes): `db-status.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 401`** (1 nodes): `editionDiffReport.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 402`** (1 nodes): `init-db.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 403`** (1 nodes): `load-citizens.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 404`** (1 nodes): `notify-paulson-interview.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 405`** (1 nodes): `reauthorizeDrive.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 406`** (1 nodes): `renderPodcast.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 407`** (1 nodes): `reorganizeArchive.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 408`** (1 nodes): `trimStrayC100Rows_S271.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 409`** (1 nodes): `tier1EssenceEvents.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Are the 42 inferred relationships involving `main()` (e.g. with `filterByCycle()` and `allToObjects()`) actually correct?**
  _`main()` has 42 INFERRED edges - model-reasoned connections that need verification._
- **Are the 19 inferred relationships involving `main()` (e.g. with `loadJSON()` and `loadBlocklist()`) actually correct?**
  _`main()` has 19 INFERRED edges - model-reasoned connections that need verification._
- **Are the 17 inferred relationships involving `runGenerationalEngine_()` (e.g. with `initRng_()` and `getSeasonalLimits_()`) actually correct?**
  _`runGenerationalEngine_()` has 17 INFERRED edges - model-reasoned connections that need verification._
- **Are the 16 inferred relationships involving `main()` (e.g. with `parseType()` and `parseCycleFlag()`) actually correct?**
  _`main()` has 16 INFERRED edges - model-reasoned connections that need verification._
- **Are the 15 inferred relationships involving `generateMediaBriefing_()` (e.g. with `getCivicContext_()` and `getHolidayZones_()`) actually correct?**
  _`generateMediaBriefing_()` has 15 INFERRED edges - model-reasoned connections that need verification._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.07 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.09 - nodes in this community are weakly interconnected._
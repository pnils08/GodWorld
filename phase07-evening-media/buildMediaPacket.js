/**
 * ============================================================================
 * buildMediaPacket_ v2.2
 * ============================================================================
 *
 * Fully world-aware, aligned with GodWorld Calendar v1.0.
 * Produces the final newsroom packet text.
 *
 * v2.2 Enhancements:
 * - Expanded calendar context in CityPulse Snapshot
 * - Holiday with priority level
 * - First Friday indicator
 * - Creation Day indicator
 * - Sports season phase
 * - Expanded crowd map (12 neighborhoods)
 *
 * Previous features (v2.1):
 * - Economic, weather mood, bonds, arcs, media effects
 * - All standard packet sections
 * 
 * ============================================================================
 */

function buildMediaPacket_(ctx) {

  const s = ctx.summary;
  const pkt = [];

  // Helper for safe access
  const safe = (val, def) => val !== undefined && val !== null ? val : def;

  // ══════════════════════════════════════════════════════════════════════════
  // HEADER
  // ══════════════════════════════════════════════════════════════════════════
  pkt.push(`═══════════════════════════════════════════════════════`);
  pkt.push(`CYCLE ${s.cycleId} — MEDIA PACKET`);
  pkt.push(`═══════════════════════════════════════════════════════`);
  pkt.push(``);

  // ══════════════════════════════════════════════════════════════════════════
  // 1. CITYPULSE SNAPSHOT (v2.2 - expanded calendar context)
  // ══════════════════════════════════════════════════════════════════════════
  pkt.push(`1. CITYPULSE SNAPSHOT`);
  pkt.push(`───────────────────────────────────────────────────────`);
  
  const demo = s.demographicDrift || {};
  pkt.push(`Population: stable`);
  pkt.push(`Employment: ${demo.employmentRate ? (demo.employmentRate * 100).toFixed(1) + '%' : 'steady'}`);
  pkt.push(`Economy: ${demo.economy || s.economy || 'stable'}`);
  pkt.push(`Economic Mood: ${s.economicMood || 50}/100`);
  pkt.push(`Health baseline: ${demo.illnessRate ? (demo.illnessRate * 100).toFixed(2) + '% illness' : 'normal'}`);
  
  // ─────────────────────────────────────────────────────────────────────────
  // CALENDAR CONTEXT (v2.2)
  // ─────────────────────────────────────────────────────────────────────────
  pkt.push(``);
  pkt.push(`── Calendar ──`);
  pkt.push(`Season: ${s.season || '(none)'}`);
  
  // Holiday with priority
  const holiday = s.holiday || 'none';
  const holidayPriority = s.holidayPriority || 'none';
  if (holiday !== 'none') {
    pkt.push(`Holiday: ${holiday} (priority: ${holidayPriority})`);
  } else {
    pkt.push(`Holiday: none`);
  }
  
  // First Friday
  const isFirstFriday = s.isFirstFriday || false;
  pkt.push(`First Friday: ${isFirstFriday ? 'YES — arts district active' : 'no'}`);
  
  // Creation Day
  const isCreationDay = s.isCreationDay || false;
  pkt.push(`Creation Day: ${isCreationDay ? 'YES — Oakland founding celebration' : 'no'}`);
  
  // Sports Season
  const sportsSeason = s.sportsSeason || 'off-season';
  pkt.push(`Sports Season: ${sportsSeason}`);
  
  // ─────────────────────────────────────────────────────────────────────────
  // WEATHER CONTEXT
  // ─────────────────────────────────────────────────────────────────────────
  pkt.push(``);
  pkt.push(`── Weather ──`);
  const weather = s.weather || {};
  const weatherMood = s.weatherMood || {};
  pkt.push(`Conditions: ${weather.type || '(none)'} (impact ${weather.impact || '?'})`);
  pkt.push(`Weather Mood: ${weatherMood.primaryMood || 'neutral'} (comfort: ${weatherMood.comfortIndex ? weatherMood.comfortIndex.toFixed(2) : '?'})`);
  
  pkt.push(``);
  pkt.push(`Chaos Events: ${s.worldEvents ? s.worldEvents.length : 0}`);
  pkt.push(``);

  // ══════════════════════════════════════════════════════════════════════════
  // 2. DEMOGRAPHIC NOTES
  // ══════════════════════════════════════════════════════════════════════════
  pkt.push(`2. DEMOGRAPHIC NOTES`);
  pkt.push(`───────────────────────────────────────────────────────`);
  pkt.push(`Intake: ${safe(s.intakeProcessed, 0)}`);
  pkt.push(`Aged: ${safe(s.citizensUpdated, 0)}`);
  pkt.push(`Migration Drift: ${demo.migration || s.migrationDrift || 0}`);
  pkt.push(`New Citizens: ${s.citizensGenerated || 0}`);
  pkt.push(`Promotions: ${s.promotionsCount || 0}`);
  pkt.push(``);

  // ══════════════════════════════════════════════════════════════════════════
  // 3. COMMUNITY BEHAVIOR NOTES
  // ══════════════════════════════════════════════════════════════════════════
  pkt.push(`3. COMMUNITY BEHAVIOR NOTES`);
  pkt.push(`───────────────────────────────────────────────────────`);
  pkt.push(`Events Generated: ${s.eventsGenerated || 0}`);
  pkt.push(`Issues: ${s.auditIssues && s.auditIssues.length ? s.auditIssues.slice(0, 5).join('; ') : '(none)'}`);
  pkt.push(`Pattern: ${s.patternFlag || 'none'}`);
  pkt.push(`ShockFlag: ${s.shockFlag || 'none'}`);
  if (s.shockReasons && s.shockReasons.length) {
    pkt.push(`Shock Reasons: ${s.shockReasons.join(', ')}`);
  }
  pkt.push(``);

  pkt.push(`World Events:`);
  if (s.worldEvents && s.worldEvents.length) {
    s.worldEvents.slice(0, 8).forEach(ev => {
      const desc = ev.description || ev.subdomain || ev.domain || 'event';
      const sev = ev.severity || 'low';
      const neigh = ev.neighborhood || '';
      pkt.push(`  - [${ev.domain || 'GENERAL'}] ${desc} (${sev})${neigh ? ' @ ' + neigh : ''}`);
    });
    if (s.worldEvents.length > 8) {
      pkt.push(`  ... and ${s.worldEvents.length - 8} more`);
    }
  } else {
    pkt.push(`  - (none)`);
  }
  pkt.push(``);

  // ══════════════════════════════════════════════════════════════════════════
  // 4. PUBLIC SAFETY & HEALTH WATCH
  // ══════════════════════════════════════════════════════════════════════════
  pkt.push(`4. PUBLIC SAFETY & HEALTH WATCH`);
  pkt.push(`───────────────────────────────────────────────────────`);
  pkt.push(`Civic Load: ${s.civicLoad || 'stable'} (score: ${s.civicLoadScore || 0})`);
  if (s.civicLoadFactors && s.civicLoadFactors.length) {
    pkt.push(`Load Factors: ${s.civicLoadFactors.join(', ')}`);
  }
  pkt.push(`Evening Safety: ${s.eveningSafety || 'calm'}`);
  pkt.push(`City Sentiment: ${s.cityDynamics ? s.cityDynamics.sentiment : 0}`);
  pkt.push(``);

  // ══════════════════════════════════════════════════════════════════════════
  // 5. ECONOMIC SIGNALS
  // ══════════════════════════════════════════════════════════════════════════
  pkt.push(`5. ECONOMIC SIGNALS`);
  pkt.push(`───────────────────────────────────────────────────────`);
  pkt.push(`Economic Mood: ${s.economicMood || 50}/100`);
  const ripples = s.economicRipples || [];
  if (ripples.length > 0) {
    pkt.push(`Active Ripples: ${ripples.length}`);
    ripples.slice(0, 3).forEach(r => {
      pkt.push(`  - ${r.domain || 'general'}: ${r.effect || 'ripple'}`);
    });
  }
  pkt.push(``);

  // ══════════════════════════════════════════════════════════════════════════
  // 6. MEDIA LANDSCAPE
  // ══════════════════════════════════════════════════════════════════════════
  pkt.push(`6. MEDIA LANDSCAPE`);
  pkt.push(`───────────────────────────────────────────────────────`);
  const media = s.mediaEffects || {};
  pkt.push(`Coverage Intensity: ${media.coverageIntensity || 'minimal'}`);
  pkt.push(`Crisis Saturation: ${media.crisisSaturation ? (media.crisisSaturation * 100).toFixed(0) + '%' : '0%'}`);
  pkt.push(`Public Attention: ${media.publicAttention || 'normal'}`);
  pkt.push(``);

  // ══════════════════════════════════════════════════════════════════════════
  // 7. STORY SEEDS & HOOKS
  // ══════════════════════════════════════════════════════════════════════════
  pkt.push(`7. STORY SEEDS & HOOKS`);
  pkt.push(`───────────────────────────────────────────────────────`);
  const seeds = s.storySeeds || [];
  if (seeds.length > 0) {
    seeds.slice(0, 6).forEach(x => {
      if (typeof x === 'object') {
        pkt.push(`  - [${x.domain || 'GENERAL'}] ${x.seed || x.description || 'seed'}`);
      } else {
        pkt.push(`  - ${x}`);
      }
    });
    if (seeds.length > 6) pkt.push(`  ... and ${seeds.length - 6} more seeds`);
  } else {
    pkt.push(`  (no seeds)`);
  }
  
  const hooks = s.storyHooks || [];
  if (hooks.length > 0) {
    pkt.push(`Story Hooks:`);
    hooks.slice(0, 4).forEach(h => {
      pkt.push(`  - ${h.hook || h.description || 'hook'} (${h.priority || 'normal'})`);
    });
  }
  pkt.push(``);

  // ══════════════════════════════════════════════════════════════════════════
  // 8. EVENT ARCS
  // ══════════════════════════════════════════════════════════════════════════
  pkt.push(`8. EVENT ARCS`);
  pkt.push(`───────────────────────────────────────────────────────`);
  const arcs = s.eventArcs || [];
  const activeArcs = arcs.filter(a => a && a.phase !== 'resolved');
  if (activeArcs.length > 0) {
    activeArcs.slice(0, 5).forEach(a => {
      pkt.push(`  - ${a.name || a.arcId || 'arc'} [${a.phase || '?'}] tension: ${a.tension || 0}/10`);
    });
  } else {
    pkt.push(`  (no active arcs)`);
  }
  pkt.push(``);

  // ══════════════════════════════════════════════════════════════════════════
  // 9. NAMED SPOTLIGHTS
  // ══════════════════════════════════════════════════════════════════════════
  pkt.push(`9. NAMED SPOTLIGHTS`);
  pkt.push(`───────────────────────────────────────────────────────`);
  const spotlights = s.namedSpotlights || [];
  if (spotlights.length > 0) {
    spotlights.slice(0, 5).forEach(sp => {
      pkt.push(`  - ${sp.name || sp.popId} (score: ${sp.score})${sp.neighborhood ? ' @ ' + sp.neighborhood : ''}`);
    });
  } else {
    pkt.push(`  (no spotlights)`);
  }
  pkt.push(``);

  // ══════════════════════════════════════════════════════════════════════════
  // 10. BONDS & RELATIONSHIPS
  // ══════════════════════════════════════════════════════════════════════════
  pkt.push(`10. BONDS & RELATIONSHIPS`);
  pkt.push(`───────────────────────────────────────────────────────`);
  const bonds = s.newBonds || [];
  if (bonds.length > 0) {
    bonds.slice(0, 4).forEach(b => {
      pkt.push(`  - ${b.type || 'bond'}: ${b.citizen1 || '?'} ↔ ${b.citizen2 || '?'}`);
    });
  } else {
    pkt.push(`  (no new bonds)`);
  }
  pkt.push(``);

  // ══════════════════════════════════════════════════════════════════════════
  // 11. EVENING CYCLE SIGNALS (v2.2 - calendar-aware labels)
  // ══════════════════════════════════════════════════════════════════════════
  pkt.push(`11. EVENING CYCLE SIGNALS`);
  pkt.push(`───────────────────────────────────────────────────────`);
  pkt.push(`Streaming Trend: ${s.streamingTrend || '(none)'}`);
  pkt.push(`Sports: ${s.eveningSports || '(none)'}`);
  pkt.push(`Famous Sightings: ${s.famousPeople ? s.famousPeople.join(', ') : '(none)'}`);
  
  const food = s.eveningFood || {};
  pkt.push(`Restaurants: ${food.restaurants ? food.restaurants.join(', ') : '(none)'}`);
  pkt.push(`Food Trend: ${food.trend || 'normal'}`);
  
  pkt.push(`City Events: ${s.cityEvents ? s.cityEvents.join(', ') : '(none)'}`);
  
  const nightlife = s.nightlife || {};
  pkt.push(`Nightlife: ${nightlife.spots ? nightlife.spots.join(', ') : '(none)'}`);
  pkt.push(`Nightlife Volume: ${s.nightlifeVolume || 0}/10 (${nightlife.vibe || 'steady'})`);
  pkt.push(`Evening Traffic: ${s.eveningTraffic || 'light'}`);
  pkt.push(``);

  // ══════════════════════════════════════════════════════════════════════════
  // 12. CROWD MAP (v2.2 - 12 Oakland neighborhoods)
  // ══════════════════════════════════════════════════════════════════════════
  pkt.push(`12. CROWD MAP`);
  pkt.push(`───────────────────────────────────────────────────────`);
  const crowd = s.crowdMap || {};
  const hotspots = s.crowdHotspots || [];
  if (hotspots.length > 0) {
    pkt.push(`Hotspots: ${hotspots.join(', ')}`);
  }
  
  // v2.2: Sort by density for cleaner display
  const sortedCrowd = Object.entries(crowd).sort((a, b) => b[1] - a[1]);
  sortedCrowd.forEach(([neigh, val]) => {
    const bar = '█'.repeat(Math.min(val, 10));
    pkt.push(`  ${neigh.padEnd(14)} ${bar} (${val})`);
  });
  pkt.push(``);

  // ══════════════════════════════════════════════════════════════════════════
  // 13. EDITOR'S NOTES
  // ══════════════════════════════════════════════════════════════════════════
  pkt.push(`13. EDITOR'S NOTES`);
  pkt.push(`───────────────────────────────────────────────────────`);
  pkt.push(`CycleWeight: ${s.cycleWeight || 'low-signal'} (score: ${s.cycleWeightScore || 0})`);
  pkt.push(`WeightReason: ${s.cycleWeightReason || '(none)'}`);
  pkt.push(`SummaryLine: ${s.compressedLine || '(none)'}`);
  
  // v2.2: Calendar editorial hints
  if (holiday !== 'none' && holidayPriority === 'major') {
    pkt.push(`📅 MAJOR HOLIDAY — expect holiday-themed coverage`);
  }
  if (holiday !== 'none' && holidayPriority === 'oakland') {
    pkt.push(`📅 OAKLAND CELEBRATION — local pride angle recommended`);
  }
  if (isFirstFriday) {
    pkt.push(`🎨 FIRST FRIDAY — arts & culture focus`);
  }
  if (isCreationDay) {
    pkt.push(`🏛️ CREATION DAY — Oakland history & heritage angle`);
  }
  if (sportsSeason === 'championship') {
    pkt.push(`🏆 CHAMPIONSHIP SEASON — sports fever citywide`);
  }
  if (sportsSeason === 'playoffs') {
    pkt.push(`⚾ PLAYOFF SEASON — heightened sports attention`);
  }
  pkt.push(``);

  // ══════════════════════════════════════════════════════════════════════════
  // 14. CULTURAL INDEX
  // ══════════════════════════════════════════════════════════════════════════
  pkt.push(`14. CULTURAL INDEX`);
  pkt.push(`───────────────────────────────────────────────────────`);
  const sightings = s.famousSightings || [];
  if (sightings.length > 0) {
    sightings.forEach(p => {
      pkt.push(`  - ${p.name} (${p.role || 'celebrity'})${p.neighborhood ? ' @ ' + p.neighborhood : ''}`);
    });
  } else if (s.famousPeople && s.famousPeople.length > 0) {
    s.famousPeople.forEach(p => pkt.push(`  - ${p}`));
  } else {
    pkt.push(`  (none)`);
  }
  pkt.push(``);

  // ══════════════════════════════════════════════════════════════════════════
  // FINAL OUTPUT
  // ══════════════════════════════════════════════════════════════════════════
  pkt.push(`═══════════════════════════════════════════════════════`);
  pkt.push(`END OF CYCLE ${s.cycleId} MEDIA PACKET`);
  pkt.push(`═══════════════════════════════════════════════════════`);

  ctx.summary.mediaPacket = pkt.join("\n");
}


/**
 * ============================================================================
 * MEDIA PACKET REFERENCE v2.2
 * ============================================================================
 * 
 * CALENDAR CONTEXT (Section 1):
 * - Season
 * - Holiday (with priority: major/minor/oakland/cultural)
 * - First Friday: YES/no
 * - Creation Day: YES/no
 * - Sports Season: spring-training/early-season/mid-season/late-season/playoffs/championship/off-season
 * 
 * EDITOR'S HINTS (Section 13):
 * - 📅 MAJOR HOLIDAY — expect holiday-themed coverage
 * - 📅 OAKLAND CELEBRATION — local pride angle recommended
 * - 🎨 FIRST FRIDAY — arts & culture focus
 * - 🏛️ CREATION DAY — Oakland history & heritage angle
 * - 🏆 CHAMPIONSHIP SEASON — sports fever citywide
 * - ⚾ PLAYOFF SEASON — heightened sports attention
 * 
 * CROWD MAP (Section 12):
 * Now includes 12 Oakland neighborhoods, sorted by density
 * 
 * ============================================================================
 */
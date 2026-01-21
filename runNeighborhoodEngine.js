/**
 * ============================================================================
 * Neighborhood Engine v2.2
 * ============================================================================
 * 
 * Assigns Tier-3 and Tier-4 citizens to Oakland neighborhoods.
 * Logs neighborhood drift events with location-specific flavor.
 * Named citizens (UNI/MED/CIV) are excluded unless assigned manually.
 * 
 * v2.2 Enhancements:
 * - Expanded to 12 neighborhoods (added Uptown, KONO, Chinatown, Piedmont Ave)
 * - Holiday-specific neighborhood events
 * - First Friday events (Uptown, KONO, Temescal focus)
 * - Creation Day community events
 * - Holiday neighborhood awareness (Fruitvale for cultural holidays, etc.)
 * - Cultural activity and community engagement modifiers
 * - Aligned with GodWorld Calendar v1.0
 *
 * Oakland neighborhoods (12):
 * Temescal, Downtown, Fruitvale, Lake Merritt,
 * West Oakland, Laurel, Rockridge, Jack London,
 * Uptown, KONO, Chinatown, Piedmont Ave
 * 
 * ============================================================================
 */

function runNeighborhoodEngine_(ctx) {

  const ss = ctx.ss;
  const ledger = ss.getSheetByName('Simulation_Ledger');
  const logSheet = ss.getSheetByName('LifeHistory_Log');
  if (!ledger) return;

  const values = ledger.getDataRange().getValues();
  if (values.length < 2) return;

  const header = values[0];
  const rows = values.slice(1);

  const idx = name => header.indexOf(name);

  const iTier = idx('Tier');
  const iClockMode = idx('ClockMode');
  const iUNI = idx('UNI (y/n)');
  const iMED = idx('MED (y/n)');
  const iCIV = idx('CIV (y/n)');
  const iNeighborhood = idx('Neighborhood');
  const iLife = idx('LifeHistory');
  const iLastUpdated = idx('LastUpdated');
  const iPopID = idx('POPID');
  const iFirst = idx('First');
  const iLast = idx('Last');

  // ═══════════════════════════════════════════════════════════════════════════
  // OAKLAND NEIGHBORHOODS (12 total - v2.2)
  // ═══════════════════════════════════════════════════════════════════════════
  const neighborhoods = [
    "Temescal", "Downtown", "Fruitvale", "Lake Merritt",
    "West Oakland", "Laurel", "Rockridge", "Jack London",
    "Uptown", "KONO", "Chinatown", "Piedmont Ave"
  ];

  // ═══════════════════════════════════════════════════════════════════════════
  // NEIGHBORHOOD-SPECIFIC EVENT POOLS
  // ═══════════════════════════════════════════════════════════════════════════
  const neighborhoodEvents = {
    'Temescal': [
      "noticed the creative energy shifting in Temescal",
      "felt Temescal's community vibe change slightly",
      "observed new activity around Temescal's cafes",
      "sensed the neighborhood's artistic pulse"
    ],
    'Downtown': [
      "felt Downtown's urban rhythm intensify",
      "noticed shifting crowds in the city center",
      "observed changes in Downtown foot traffic",
      "sensed the business district's mood"
    ],
    'Fruitvale': [
      "felt Fruitvale's cultural energy",
      "noticed community gathering patterns shift",
      "observed the neighborhood's familiar rhythms",
      "sensed changes in the local atmosphere"
    ],
    'Lake Merritt': [
      "noticed activity patterns around the lake",
      "felt the lakeside community's mood",
      "observed joggers and families by Lake Merritt",
      "sensed the peaceful energy near the water"
    ],
    'West Oakland': [
      "noticed West Oakland's industrial rhythm",
      "felt the neighborhood's changing landscape",
      "observed development activity nearby",
      "sensed the area's evolving character"
    ],
    'Laurel': [
      "appreciated Laurel's residential calm",
      "noticed the quiet neighborhood's subtle shifts",
      "felt the local community's steady presence",
      "observed familiar faces on the street"
    ],
    'Rockridge': [
      "noticed Rockridge's upscale atmosphere",
      "felt the tree-lined streets' ambiance",
      "observed shoppers along College Ave",
      "sensed the neighborhood's refined energy"
    ],
    'Jack London': [
      "felt Jack London's waterfront energy",
      "noticed nightlife activity picking up",
      "observed the arts district's creative buzz",
      "sensed the estuary's calming presence"
    ],
    'Uptown': [
      "felt Uptown's urban arts energy",
      "noticed gallery-goers and theater crowds",
      "observed the neighborhood's creative pulse",
      "sensed the cultural district's momentum"
    ],
    'KONO': [
      "noticed KONO's artistic atmosphere",
      "felt the Koreatown-Northgate creative vibe",
      "observed murals and street art activity",
      "sensed the neighborhood's DIY spirit"
    ],
    'Chinatown': [
      "felt Chinatown's bustling energy",
      "noticed the busy morning markets",
      "observed multigenerational community activity",
      "sensed the neighborhood's cultural rhythms"
    ],
    'Piedmont Ave': [
      "noticed Piedmont Ave's leafy calm",
      "felt the neighborhood's boutique atmosphere",
      "observed afternoon strollers along the avenue",
      "sensed the area's residential tranquility"
    ]
  };

  // Generic events (fallback)
  const genericEvents = [
    "noticed small tension in the neighborhood",
    "heard more activity around the block",
    "felt area slightly quieter than usual",
    "sensed change in evening mood",
    "observed unusual foot traffic",
    "noticed shift in community energy"
  ];

  // ═══════════════════════════════════════════════════════════════════════════
  // EXTERNAL CONTEXT FROM ctx.summary
  // ═══════════════════════════════════════════════════════════════════════════
  const S = ctx.summary;
  const season = S.season;
  const holiday = S.holiday || "none";
  const holidayPriority = S.holidayPriority || "none";
  const holidayNeighborhood = S.holidayNeighborhood || null;
  const isFirstFriday = S.isFirstFriday || false;
  const isCreationDay = S.isCreationDay || false;
  const weather = S.weather || { type: "clear", impact: 1 };
  const weatherMood = S.weatherMood || {};
  const dynamics = S.cityDynamics || { 
    traffic: 1, publicSpaces: 1, sentiment: 0,
    culturalActivity: 1, communityEngagement: 1
  };
  const chaos = S.worldEvents || [];
  const econMood = S.economicMood || 50;
  const cycle = S.absoluteCycle || S.cycleId || ctx.config.cycleCount || 0;

  let globalEvents = 0;
  const EVENT_LIMIT = 6;
  
  // Track for summary
  const neighborhoodDriftEvents = [];
  let assignmentsCount = 0;

  // ═══════════════════════════════════════════════════════════════════════════
  // HOLIDAY-SPECIFIC NEIGHBORHOOD EVENTS (v2.2)
  // ═══════════════════════════════════════════════════════════════════════════
  const holidayNeighborhoodEvents = {};

  // Fruitvale holidays
  if (holiday === "CincoDeMayo" || holiday === "DiaDeMuertos") {
    holidayNeighborhoodEvents['Fruitvale'] = [
      "felt the neighborhood's cultural celebration energy",
      "noticed decorations and preparations throughout Fruitvale",
      "heard music drifting through the streets",
      "sensed the community's festive pride"
    ];
  }

  // West Oakland holidays
  if (holiday === "Juneteenth" || holiday === "MLKDay" || holiday === "BlackHistoryMonth") {
    holidayNeighborhoodEvents['West Oakland'] = [
      "felt the neighborhood's cultural significance today",
      "noticed community gathering for observances",
      "sensed historical pride in the air",
      "observed neighbors preparing for celebrations"
    ];
  }

  // Downtown/Uptown holidays
  if (holiday === "OaklandPride" || holiday === "PrideMonth") {
    holidayNeighborhoodEvents['Downtown'] = [
      "noticed rainbow flags appearing in windows",
      "felt the neighborhood's pride energy building",
      "observed parade preparations",
      "sensed community solidarity"
    ];
    holidayNeighborhoodEvents['Uptown'] = [
      "felt Uptown's pride celebration energy",
      "noticed the arts district embracing the festivities",
      "observed colorful decorations appearing"
    ];
  }

  // Jack London - Opening Day
  if (holiday === "OpeningDay") {
    holidayNeighborhoodEvents['Jack London'] = [
      "felt Opening Day excitement in the air",
      "noticed fans in green and gold heading to the waterfront",
      "observed tailgate preparations near the estuary",
      "sensed the neighborhood's baseball fever"
    ];
  }

  // Lake Merritt holidays
  if (holiday === "Independence" || holiday === "EarthDay") {
    holidayNeighborhoodEvents['Lake Merritt'] = [
      "noticed crowds gathering at the lake",
      "felt the holiday atmosphere by the water",
      "observed families setting up for celebrations",
      "sensed the community energy around the lake"
    ];
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // FIRST FRIDAY EVENTS (v2.2)
  // ═══════════════════════════════════════════════════════════════════════════
  const firstFridayEvents = {
    'Uptown': [
      "noticed First Friday crowds filling the galleries",
      "felt the monthly art walk energy in Uptown",
      "observed artists setting up on the sidewalks",
      "sensed the creative community coming alive"
    ],
    'KONO': [
      "felt KONO's First Friday buzz",
      "noticed gallery openings along the corridor",
      "observed the neighborhood's artistic energy peak",
      "sensed the monthly creative surge"
    ],
    'Temescal': [
      "noticed First Friday spillover into Temescal",
      "felt the neighborhood's evening energy rise",
      "observed art enthusiasts wandering the streets"
    ]
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // CREATION DAY EVENTS (v2.2)
  // ═══════════════════════════════════════════════════════════════════════════
  const creationDayEvents = [
    "felt something foundational in the neighborhood air",
    "sensed deep community roots today",
    "noticed neighbors reflecting on how things began",
    "felt connected to the neighborhood's origins"
  ];

  // ═══════════════════════════════════════════════════════════════════════════
  // ITERATE THROUGH CITIZENS
  // ═══════════════════════════════════════════════════════════════════════════
  for (let r = 0; r < rows.length; r++) {

    if (globalEvents >= EVENT_LIMIT) break;

    const row = rows[r];

    const tier = Number(row[iTier] || 0);
    const mode = row[iClockMode] || 'ENGINE';
    const isUNI = (row[iUNI] || '').toString().toLowerCase() === 'y';
    const isMED = (row[iMED] || '').toString().toLowerCase() === 'y';
    const isCIV = (row[iCIV] || '').toString().toLowerCase() === 'y';

    // Only Tier-3/4 ENGINE citizens qualify
    if (tier !== 3 && tier !== 4) continue;
    if (mode !== 'ENGINE') continue;
    if (isUNI || isMED || isCIV) continue;

    // ═══════════════════════════════════════════════════════════════════════
    // NEIGHBORHOOD ASSIGNMENT IF MISSING
    // ═══════════════════════════════════════════════════════════════════════
    let neighborhood = iNeighborhood >= 0 ? (row[iNeighborhood] || '').toString().trim() : '';
    
    if (!neighborhood || neighborhood === '' || neighborhood === 'Oakland, CA') {
      neighborhood = neighborhoods[Math.floor(Math.random() * neighborhoods.length)];
      if (iNeighborhood >= 0) {
        row[iNeighborhood] = neighborhood;
      }
      row[iLastUpdated] = ctx.now;
      assignmentsCount++;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // DRIFT CHANCE INFLUENCED BY CONDITIONS
    // ═══════════════════════════════════════════════════════════════════════
    let driftChance = 0.02;

    // Weather-driven drift
    if (weather.impact >= 1.3) driftChance += 0.015;
    if (weather.type === "fog") driftChance += 0.01;
    if (weather.type === "rain") driftChance += 0.01;

    // Weather mood effects
    if (weatherMood.comfortIndex && weatherMood.comfortIndex < 0.35) driftChance += 0.01;
    if (weatherMood.irritabilityFactor && weatherMood.irritabilityFactor > 0.3) driftChance += 0.01;

    // Season-driven drift
    if (season === "Winter") driftChance += 0.01;
    if (season === "Summer") driftChance += 0.005;

    // City Dynamics
    if (dynamics.sentiment <= -0.3) driftChance += 0.015;
    if (dynamics.sentiment >= 0.3) driftChance += 0.005;

    // Cultural activity boost (v2.2)
    if (dynamics.culturalActivity >= 1.4) driftChance += 0.01;

    // Community engagement boost (v2.2)
    if (dynamics.communityEngagement >= 1.3) driftChance += 0.008;

    // Economic mood
    if (econMood <= 35) driftChance += 0.01;

    // Chaos events cause drift
    if (chaos.length > 0) driftChance += 0.015;

    // Holiday priority boost (v2.2)
    if (holidayPriority === "major") driftChance += 0.012;
    else if (holidayPriority === "cultural") driftChance += 0.015;
    else if (holidayPriority === "oakland") driftChance += 0.012;
    else if (holidayPriority === "minor") driftChance += 0.005;

    // First Friday boost (v2.2)
    if (isFirstFriday) {
      if (neighborhood === "Uptown" || neighborhood === "KONO" || neighborhood === "Temescal") {
        driftChance += 0.025;  // Higher in art walk neighborhoods
      } else {
        driftChance += 0.01;
      }
    }

    // Creation Day boost (v2.2)
    if (isCreationDay) driftChance += 0.01;

    // Holiday neighborhood boost (v2.2)
    if (holidayNeighborhood && neighborhood === holidayNeighborhood) {
      driftChance += 0.02;
    }

    // Cap driftChance
    if (driftChance > 0.12) driftChance = 0.12;

    // ═══════════════════════════════════════════════════════════════════════
    // DRIFT EVENT TRIGGER
    // ═══════════════════════════════════════════════════════════════════════
    if (Math.random() < driftChance) {

      let eventPool = [...(neighborhoodEvents[neighborhood] || genericEvents)];
      let eventTag = "Neighborhood";

      // Add holiday-specific events (v2.2)
      if (holidayNeighborhoodEvents[neighborhood]) {
        eventPool = [...eventPool, ...holidayNeighborhoodEvents[neighborhood]];
      }

      // Add First Friday events (v2.2)
      if (isFirstFriday && firstFridayEvents[neighborhood]) {
        eventPool = [...eventPool, ...firstFridayEvents[neighborhood]];
      }

      // Add Creation Day events (v2.2)
      if (isCreationDay) {
        eventPool = [...eventPool, ...creationDayEvents];
      }

      // Add weather-context events
      if (weather.type === "rain") {
        eventPool.push("noticed how the rain affected neighborhood mood");
      }
      if (weather.type === "fog") {
        eventPool.push("felt the fog settle over the neighborhood");
      }
      if (weatherMood.primaryMood === 'irritable') {
        eventPool.push("sensed neighbors' frustration with the weather");
      }

      // Add economic-context events
      if (econMood <= 35) {
        eventPool.push("noticed economic concerns among neighbors");
      }
      if (econMood >= 65) {
        eventPool.push("sensed optimism in the neighborhood");
      }

      // Add chaos-context events
      if (chaos.length > 0) {
        eventPool.push("felt atmosphere influenced by recent city events");
      }

      // Add cultural activity events (v2.2)
      if (dynamics.culturalActivity >= 1.4) {
        eventPool.push("noticed increased cultural activity in the area");
      }

      // Add community engagement events (v2.2)
      if (dynamics.communityEngagement >= 1.3) {
        eventPool.push("felt neighbors more engaged with each other");
      }

      const entry = eventPool[Math.floor(Math.random() * eventPool.length)];

      // Determine event tag (v2.2)
      if (isFirstFriday && firstFridayEvents[neighborhood]?.includes(entry)) {
        eventTag = "FirstFriday";
      } else if (isCreationDay && creationDayEvents.includes(entry)) {
        eventTag = "CreationDay";
      } else if (holidayNeighborhoodEvents[neighborhood]?.includes(entry)) {
        eventTag = "Holiday";
      }

      // Stamp entry
      const stamp = Utilities.formatDate(ctx.now, Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm");
      const existing = row[iLife] ? row[iLife].toString() : "";
      const line = `${stamp} — [${eventTag}] ${entry}`;

      row[iLife] = existing ? existing + "\n" + line : line;
      row[iLastUpdated] = ctx.now;

      // Log to LifeHistory_Log
      if (logSheet) {
        logSheet.appendRow([
          ctx.now,
          row[iPopID],
          (row[iFirst] + " " + row[iLast]).trim(),
          eventTag,
          entry,
          neighborhood,
          cycle
        ]);
      }

      // Track for summary
      neighborhoodDriftEvents.push({
        citizen: (row[iFirst] + " " + row[iLast]).trim(),
        neighborhood: neighborhood,
        event: entry,
        tag: eventTag
      });

      globalEvents++;
      S.eventsGenerated = (S.eventsGenerated || 0) + 1;
    }

    rows[r] = row;
  }

  // Write all updated rows
  ledger.getRange(2, 1, rows.length, rows[0].length).setValues(rows);

  // Summary
  S.neighborhoodDriftEvents = neighborhoodDriftEvents;
  S.neighborhoodAssignments = assignmentsCount;
  ctx.summary = S;
}


/**
 * ============================================================================
 * NEIGHBORHOOD REFERENCE (12 total)
 * ============================================================================
 * 
 * Neighborhood   | Character                    | Special Events
 * ─────────────────────────────────────────────────────────────────────────
 * Temescal       | Creative, cafes              | First Friday spillover
 * Downtown       | Urban, business              | Pride, civic events
 * Fruitvale      | Cultural, Latino heritage    | CincoDeMayo, DiaDeMuertos
 * Lake Merritt   | Lakeside, families           | July 4th, Earth Day
 * West Oakland   | Industrial, evolving         | Juneteenth, MLK, BHM
 * Laurel         | Residential, calm            | —
 * Rockridge      | Upscale, tree-lined          | —
 * Jack London    | Waterfront, nightlife        | Opening Day, arts
 * Uptown         | Urban arts, galleries        | First Friday (core)
 * KONO           | DIY, street art              | First Friday (core)
 * Chinatown      | Bustling, markets            | Lunar New Year potential
 * Piedmont Ave   | Leafy, boutiques             | —
 * 
 * ============================================================================
 * 
 * EVENT TAGS (v2.2):
 * - Neighborhood: Base neighborhood events
 * - FirstFriday: Art walk events
 * - CreationDay: GodWorld founding events
 * - Holiday: Holiday-specific neighborhood events
 * 
 * ============================================================================
 */
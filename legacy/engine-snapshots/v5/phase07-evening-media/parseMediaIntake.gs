/**
 * ============================================================================
 * parseMediaIntake_ v2.3
 * ============================================================================
 *
 * v2.3 Enhancements:
 * - ES5 syntax for Google Apps Script compatibility
 * - Defensive guards for ctx
 * - for loops instead of for...of
 *
 * v2.2 Features:
 * - Calendar context passed to registerCulturalEntity_()
 * - Return object includes calendar context
 * - Tracks which holiday/season cultural mentions occurred during
 * - Aligned with GodWorld Calendar v1.0
 *
 * Extracts:
 * - Journalist name
 * - Cultural names from the "CULTURAL INDEX" block ONLY
 * - Role and neighborhood from new format
 *
 * Registers each cultural figure into:
 * - Cultural Ledger (via registerCulturalEntity_)
 *
 * Avoids:
 * - Story seeds
 * - Editor notes
 * - Random bullets from other sections
 *
 * ============================================================================
 */

function parseMediaIntake_(ctx, mediaText) {

  // Defensive guard
  if (!ctx) return { journalist: "", names: [], entries: [], calendarContext: {} };
  if (!ctx.summary) ctx.summary = {};

  var lines = mediaText.split("\n");
  var S = ctx.summary;

  // v2.2: Get calendar context
  var cal = {
    season: S.season || '',
    holiday: S.holiday || 'none',
    holidayPriority: S.holidayPriority || 'none',
    isFirstFriday: S.isFirstFriday || false,
    isCreationDay: S.isCreationDay || false,
    sportsSeason: S.sportsSeason || 'off-season',
    month: S.month || S.simMonth || 0
  };

  var journalist = "";
  var namesUsed = [];
  var culturalEntries = [];

  var inCulturalIndex = false;

  for (var li = 0; li < lines.length; li++) {
    var rawLine = lines[li];
    var line = rawLine.trim();

    // --------------------------
    // Identify the journalist
    // --------------------------
    if (line.startsWith("Journalist:")) {
      journalist = line.replace("Journalist:", "").trim();
      continue;
    }

    // --------------------------
    // Detect the Cultural Index section (now section 14)
    // --------------------------
    if (line.match(/^14\.\s*CULTURAL INDEX/i) || line.match(/^8\.\s*CULTURAL INDEX/i)) {
      inCulturalIndex = true;
      continue;
    }

    // Once a new numbered section begins or separator, exit the index
    if (inCulturalIndex && (line.match(/^\d+\./) || line.match(/^═+$/))) {
      inCulturalIndex = false;
      continue;
    }

    // Skip section dividers
    if (line.match(/^─+$/)) {
      continue;
    }

    // --------------------------
    // Extract cultural names and details
    // Format: "- Name (role) @ Neighborhood" or just "- Name"
    // --------------------------
    if (inCulturalIndex && line.indexOf("-") === 0) {
      var content = line.slice(1).trim();

      if (!content || content === '(none)') continue;

      // Parse format: "Name (role) @ Neighborhood"
      var name = content;
      var role = "";
      var neighborhood = "";

      // Extract neighborhood if present
      var atMatch = content.match(/^(.+?)\s*@\s*(.+)$/);
      if (atMatch) {
        name = atMatch[1].trim();
        neighborhood = atMatch[2].trim();
      }

      // Extract role if present
      var roleMatch = name.match(/^(.+?)\s*\(([^)]+)\)$/);
      if (roleMatch) {
        name = roleMatch[1].trim();
        role = roleMatch[2].trim();
      }

      if (name) {
        namesUsed.push(name);
        culturalEntries.push({
          name: name,
          role: role,
          neighborhood: neighborhood
        });
      }
    }
  }

  // --------------------------
  // Register each cultural entity properly (v2.2: with calendar)
  // --------------------------
  for (var ci = 0; ci < culturalEntries.length; ci++) {
    var entry = culturalEntries[ci];
    if (typeof registerCulturalEntity_ === 'function') {
      // v2.2: Pass calendar context to registration
      registerCulturalEntity_(ctx, entry.name, entry.role, journalist, entry.neighborhood, cal);
    }
  }

  // v2.2: Log with calendar context
  if (culturalEntries.length > 0) {
    Logger.log('parseMediaIntake_ v2.2: ' + journalist + ' mentioned ' + culturalEntries.length + 
      ' cultural entities | Holiday: ' + cal.holiday + ' | Season: ' + cal.season);
  }

  // v2.2: Return includes calendar context
  return {
    journalist: journalist || "",
    names: namesUsed,
    entries: culturalEntries,
    // v2.2: Calendar context for downstream use
    calendarContext: cal
  };
}


/**
 * ============================================================================
 * parseMediaIntake_ REFERENCE v2.2
 * ============================================================================
 * 
 * INPUT:
 * - ctx: Engine context with summary containing calendar
 * - mediaText: Raw Media Room output text
 * 
 * OUTPUT:
 * {
 *   journalist: "Elena Reyes",
 *   names: ["Theo Banks", "Maya Chen"],
 *   entries: [
 *     { name: "Theo Banks", role: "musician", neighborhood: "Jack London" },
 *     { name: "Maya Chen", role: "chef", neighborhood: "Temescal" }
 *   ],
 *   calendarContext: {           // v2.2 NEW
 *     season: "summer",
 *     holiday: "OaklandPride",
 *     holidayPriority: "oakland",
 *     isFirstFriday: false,
 *     isCreationDay: false,
 *     sportsSeason: "regular",
 *     month: 6
 *   }
 * }
 * 
 * CULTURAL INDEX FORMAT PARSED:
 * - Name (role) @ Neighborhood
 * - Name (role)
 * - Name @ Neighborhood
 * - Name
 * 
 * CALENDAR INTEGRATION:
 * - Passes calendar to registerCulturalEntity_() for ledger tracking
 * - Returns calendar in output for downstream processing
 * - Enables queries like "who was mentioned during Pride?"
 * 
 * ============================================================================
 */
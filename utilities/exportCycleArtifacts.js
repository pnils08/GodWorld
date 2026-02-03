/**
 * ============================================================================
 * exportCycleArtifacts.js v1.0
 * ============================================================================
 *
 * Exports two artifacts to Drive folder "exports/":
 *  - cycle-XX-summary.json   (full ctx.summary snapshot)
 *  - cycle-XX-context.json   (prompt-ready distilled context pack)
 * Updates exports/manifest.json with SHA-256 checksums + timestamps.
 *
 * DESIGN GOALS:
 * - No sheet schema changes
 * - Deterministic, idempotent exports
 * - Context pack is stable for prompt injection (OpenClaw/agents)
 *
 * @version 1.0
 * @phase utilities
 * ============================================================================
 */

var EXPORT_ARTIFACTS_VERSION = "1.0";
var EXPORTS_FOLDER_NAME = "exports";
var CONTEXT_PACK_VERSION = "1.0";

/**
 * Main: export summary + context pack + manifest.
 *
 * Call once per cycle at end of engine run.
 *
 * @param {Object} ctx Engine context
 * @param {Object=} opts { folderName, includePretty, forceWrite }
 * @return {Object} { cycleId, summaryFile, contextFile, manifestFile }
 */
function exportCycleArtifacts_(ctx, opts) {
  opts = opts || {};
  var folderName = opts.folderName || EXPORTS_FOLDER_NAME;
  var includePretty = opts.includePretty !== false; // default true
  var forceWrite = !!opts.forceWrite;

  if (!ctx || !ctx.summary) return null;

  var S = ctx.summary;
  var cycleId = Number(S.absoluteCycle || S.cycleId || (ctx.config && ctx.config.cycleCount) || 0);

  var folder = ensureFolderByName_(folderName);

  // ---- Build Summary Snapshot (full summary, safe) ----
  var summarySnapshot = normalizeSummarySnapshot_(S, ctx);

  // ---- Build Context Pack (small prompt-ready distilled) ----
  var contextPack = buildCycleContextPack_(S, ctx, cycleId);

  // ---- Filenames ----
  var cycleLabel = pad2_(cycleId);
  var summaryName = "cycle-" + cycleLabel + "-summary.json";
  var contextName = "cycle-" + cycleLabel + "-context.json";
  var manifestName = "manifest.json";

  // ---- Serialize ----
  var summaryJson = JSON.stringify(summarySnapshot, null, includePretty ? 2 : 0);
  var contextJson = JSON.stringify(contextPack, null, includePretty ? 2 : 0);

  // ---- Checksums ----
  var summarySha = "sha256:" + sha256Hex_(summaryJson);
  var contextSha = "sha256:" + sha256Hex_(contextJson);

  // ---- Write Files (idempotent unless force) ----
  var summaryFile = writeOrUpdateFile_(folder, summaryName, summaryJson, forceWrite);
  var contextFile = writeOrUpdateFile_(folder, contextName, contextJson, forceWrite);

  // ---- Update Manifest ----
  var manifest = readJsonFile_(folder, manifestName) || {};
  manifest.version = manifest.version || "1.0";
  manifest.lastUpdated = new Date().toISOString();
  manifest.latestCycle = cycleId;
  manifest.artifactsVersion = EXPORT_ARTIFACTS_VERSION;
  manifest.contextPackVersion = CONTEXT_PACK_VERSION;

  manifest.cycles = manifest.cycles || {};
  manifest.cycles[String(cycleId)] = {
    cycleId: cycleId,
    exportedAt: new Date().toISOString(),
    summary: { file: summaryName, checksum: summarySha },
    context: { file: contextName, checksum: contextSha }
  };

  // keep manifest from growing forever (optional cap)
  manifest = capManifestCycles_(manifest, 250);

  var manifestJson = JSON.stringify(manifest, null, includePretty ? 2 : 0);
  var manifestFile = writeOrUpdateFile_(folder, manifestName, manifestJson, true);

  Logger.log("exportCycleArtifacts_: cycle " + cycleId +
             " → " + summaryName + " (" + summarySha + "), " +
             contextName + " (" + contextSha + ")");

  return {
    cycleId: cycleId,
    summaryFile: summaryFile ? summaryFile.getName() : summaryName,
    contextFile: contextFile ? contextFile.getName() : contextName,
    manifestFile: manifestFile ? manifestFile.getName() : manifestName
  };
}

/**
 * Normalize summary snapshot to ensure JSON-safe output (no Dates/functions).
 */
function normalizeSummarySnapshot_(S, ctx) {
  // Clone via JSON-safe pass
  var safe = {};
  try {
    safe = JSON.parse(JSON.stringify(S));
  } catch (e) {
    // Fallback: shallow copy
    for (var k in S) safe[k] = S[k];
  }

  safe._export = {
    exportedAt: new Date().toISOString(),
    exportedBy: "exportCycleArtifacts_",
    version: EXPORT_ARTIFACTS_VERSION,
    contextPackVersion: CONTEXT_PACK_VERSION
  };

  // Helpful stable fields if missing
  if (safe.absoluteCycle == null && safe.cycleId != null) safe.absoluteCycle = safe.cycleId;
  if (safe.cycleId == null && safe.absoluteCycle != null) safe.cycleId = safe.absoluteCycle;

  return safe;
}

/**
 * Build a compact, prompt-friendly context pack consumed by OpenClaw agents.
 * Avoids huge arrays; stores only signals + keys.
 */
function buildCycleContextPack_(S, ctx, cycleId) {
  var weather = S.weather || {};
  var dynamics = S.cityDynamics || {};
  var econMood = (S.economicMood != null) ? S.economicMood : 50;

  var worldEvents = Array.isArray(S.worldEvents) ? S.worldEvents : [];
  var chaosEvents = countDomains_(worldEvents, ["CHAOS", "CRIME"]);
  var civicEvents = countDomains_(worldEvents, ["CIVIC", "POLITICS"]);

  // civic initiative outputs (if you track them)
  var votes = Array.isArray(S.votesThisCycle) ? S.votesThisCycle : [];
  var grants = Array.isArray(S.grantsThisCycle) ? S.grantsThisCycle : [];
  var initiativeEvents = Array.isArray(S.initiativeEvents) ? S.initiativeEvents : [];

  // crime summary (if present)
  var crime = S.crimeMetrics || {};
  var cityCrime = crime.cityWide || null;

  // active citizens: your citizen events engine already maintains this
  var activeCitizens = Array.isArray(S.cycleActiveCitizens) ? S.cycleActiveCitizens : [];

  // infer "key citizens" from civic votes + active citizens
  var keyCitizens = inferKeyCitizens_(votes, initiativeEvents, activeCitizens);

  // risk flags (simple + deterministic)
  var riskFlags = [];
  if (chaosEvents >= 2) riskFlags.push("high-tension");
  if (dynamics.sentiment != null && dynamics.sentiment <= -0.35) riskFlags.push("negative-sentiment");
  if (econMood <= 35) riskFlags.push("economic-stress");
  if (cityCrime && cityCrime.totalIncidents != null && cityCrime.totalIncidents > 80) riskFlags.push("high-incident-volume");

  // conflicts placeholder (you can wire real checks later)
  var conflictsDetected = false;

  return {
    version: CONTEXT_PACK_VERSION,
    cycleId: cycleId,
    generatedAt: new Date().toISOString(),

    city: {
      season: S.season || "unknown",
      weather: {
        type: weather.type || "clear",
        impact: (weather.impact != null) ? weather.impact : 1.0
      },
      sentiment: (dynamics.sentiment != null) ? dynamics.sentiment : 0,
      economicMood: econMood,
      chaosEvents: chaosEvents,
      civicEvents: civicEvents
    },

    civic: {
      votes: slimVotes_(votes),
      grants: slimGrants_(grants),
      initiatives: slimInitiativeEvents_(initiativeEvents)
    },

    safety: cityCrime ? {
      crimeCityWide: {
        avgPropertyCrime: cityCrime.avgPropertyCrime,
        avgViolentCrime: cityCrime.avgViolentCrime,
        avgResponseTime: cityCrime.avgResponseTime,
        avgClearanceRate: cityCrime.avgClearanceRate,
        totalIncidents: cityCrime.totalIncidents
      }
    } : { crimeCityWide: null },

    citizens: {
      keyCitizens: keyCitizens,          // POPIDs
      activeCitizens: activeCitizens.slice(0, 200) // cap for prompt sanity
    },

    riskFlags: riskFlags,
    continuityHints: buildContinuityHints_(S, ctx),
    conflictsDetected: conflictsDetected
  };
}

/* ------------------------------- Helpers -------------------------------- */

function slimVotes_(votes) {
  var out = [];
  for (var i = 0; i < votes.length; i++) {
    var v = votes[i] || {};
    out.push({
      name: v.name || "",
      outcome: v.outcome || "",
      voteCount: v.voteCount || "",
      swingVoters: v.swingVoters || []
    });
  }
  return out.slice(0, 25);
}

function slimGrants_(grants) {
  var out = [];
  for (var i = 0; i < grants.length; i++) {
    var g = grants[i] || {};
    out.push({
      name: g.name || "",
      outcome: g.outcome || ""
    });
  }
  return out.slice(0, 25);
}

function slimInitiativeEvents_(events) {
  var out = [];
  for (var i = 0; i < events.length; i++) {
    var e = events[i] || {};
    out.push({
      id: e.id || "",
      name: e.name || "",
      type: e.type || "",
      outcome: e.outcome || "",
      voteCount: e.voteCount || null,
      cycle: e.cycle || null
    });
  }
  return out.slice(0, 50);
}

function inferKeyCitizens_(votes, initiativeEvents, activeCitizens) {
  var seen = Object.create(null);
  var out = [];

  // 1) civic swings (names -> we can't map to POPID without a lookup, so keep activeCitizens)
  // If your system later provides name->POPID, wire it here.

  // 2) active citizens (already POPIDs)
  for (var i = 0; i < activeCitizens.length; i++) {
    var id = activeCitizens[i];
    if (!id || seen[id]) continue;
    seen[id] = true;
    out.push(id);
    if (out.length >= 25) break;
  }

  return out;
}

/**
 * Build continuity hints for OpenClaw media generation.
 * Flags citizens with ongoing storylines that should be maintained across cycles.
 *
 * Sources:
 * - Active arcs (citizens involved in multi-cycle story arcs)
 * - Recurring citizens (appeared in multiple recent cycles)
 * - Civic participants (swing voters, initiative sponsors)
 */
function buildContinuityHints_(S, ctx) {
  var hints = [];
  var seen = Object.create(null);

  // 1) Citizens involved in active arcs
  var arcs = S.eventArcs || [];
  for (var i = 0; i < arcs.length; i++) {
    var arc = arcs[i];
    if (!arc || arc.phase === 'resolved') continue;

    var involved = arc.involvedCitizens || arc.keyCitizens || [];
    for (var j = 0; j < involved.length; j++) {
      var citizen = involved[j];
      var popId = citizen.popId || citizen.POPID || citizen;
      var name = citizen.name || citizen.Name || popId;

      if (!popId || seen[popId]) continue;
      seen[popId] = true;

      hints.push({
        popId: popId,
        name: name,
        reason: 'active-arc',
        arc: arc.name || arc.title || 'Unnamed Arc',
        arcPhase: arc.phase || 'active',
        priority: arc.phase === 'peak' ? 'high' : 'medium'
      });

      if (hints.length >= 15) break;
    }
    if (hints.length >= 15) break;
  }

  // 2) Recurring active citizens (if tracking exists)
  var recurringCitizens = S.recurringCitizens || S.frequentCitizens || [];
  for (var k = 0; k < recurringCitizens.length && hints.length < 20; k++) {
    var rec = recurringCitizens[k];
    var recId = rec.popId || rec.POPID || rec;
    if (seen[recId]) continue;
    seen[recId] = true;

    hints.push({
      popId: recId,
      name: rec.name || rec.Name || recId,
      reason: 'recurring',
      appearances: rec.appearances || rec.count || 2,
      priority: 'medium'
    });
  }

  // 3) Civic participants (swing voters from this cycle's votes)
  var votes = S.votesThisCycle || [];
  for (var v = 0; v < votes.length && hints.length < 25; v++) {
    var vote = votes[v];
    var swings = vote.swingVoters || [];
    for (var s = 0; s < swings.length && hints.length < 25; s++) {
      var swing = swings[s];
      var swingId = swing.popId || swing.POPID || swing.id;
      var swingName = swing.name || swing.Name || swingId;

      if (!swingId || seen[swingId]) continue;
      seen[swingId] = true;

      hints.push({
        popId: swingId,
        name: swingName,
        reason: 'civic-participant',
        context: 'swing voter on ' + (vote.name || 'initiative'),
        priority: 'low'
      });
    }
  }

  return hints;
}

function countDomains_(events, domains) {
  if (!events || events.length === 0) return 0;
  var dset = Object.create(null);
  for (var i = 0; i < domains.length; i++) dset[String(domains[i]).toUpperCase()] = true;

  var count = 0;
  for (var j = 0; j < events.length; j++) {
    var evt = events[j] || {};
    var dom = String(evt.domain || evt._domain || "").toUpperCase();
    if (dset[dom]) count++;
  }
  return count;
}

function ensureFolderByName_(name) {
  var folders = DriveApp.getFoldersByName(name);
  if (folders.hasNext()) return folders.next();
  return DriveApp.createFolder(name);
}

function writeOrUpdateFile_(folder, filename, contents, forceWrite) {
  var files = folder.getFilesByName(filename);
  if (files.hasNext()) {
    var file = files.next();
    if (!forceWrite) {
      // If unchanged, skip write
      var current = file.getBlob().getDataAsString();
      if (current === contents) return file;
    }
    file.setContent(contents);
    return file;
  }
  return folder.createFile(filename, contents, MimeType.PLAIN_TEXT);
}

function readJsonFile_(folder, filename) {
  var files = folder.getFilesByName(filename);
  if (!files.hasNext()) return null;
  try {
    var txt = files.next().getBlob().getDataAsString();
    return JSON.parse(txt);
  } catch (e) {
    return null;
  }
}

function capManifestCycles_(manifest, maxCycles) {
  if (!manifest || !manifest.cycles) return manifest;
  var keys = Object.keys(manifest.cycles);
  if (keys.length <= maxCycles) return manifest;

  // sort numeric ascending
  keys.sort(function(a, b) { return Number(a) - Number(b); });

  var removeCount = keys.length - maxCycles;
  for (var i = 0; i < removeCount; i++) {
    delete manifest.cycles[keys[i]];
  }
  return manifest;
}

function sha256Hex_(str) {
  var digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, str, Utilities.Charset.UTF_8);
  var hex = [];
  for (var i = 0; i < digest.length; i++) {
    var b = digest[i];
    if (b < 0) b += 256;
    var h = b.toString(16);
    if (h.length === 1) h = "0" + h;
    hex.push(h);
  }
  return hex.join("");
}

function pad2_(n) {
  n = Number(n) || 0;
  if (n < 10) return "0" + n;
  if (n < 100) return String(n);
  return String(n); // allow 3+ digits naturally
}

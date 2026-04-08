/**
 * District-to-Neighborhood mapping for Oakland City Council.
 * Shared by engine phases, civic voice packets, and approval calculations.
 *
 * Source: buildCivicVoicePackets.js (S133), extracted to shared lib S137b.
 */

var DISTRICT_NEIGHBORHOODS = {
  'D1': ['West Oakland', 'Brooklyn'],
  'D2': ['Downtown', 'Chinatown', 'Jack London', 'KONO'],
  'D3': ['Fruitvale', 'San Antonio'],
  'D4': ['Glenview', 'Dimond', 'Ivy Hill'],
  'D5': ['East Oakland', 'Coliseum', 'Elmhurst'],
  'D6': ['Montclair', 'Piedmont Ave'],
  'D7': ['Temescal', 'Rockridge'],
  'D8': ['Lake Merritt', 'Adams Point', 'Grand Lake', 'Eastlake'],
  'D9': ['Laurel', 'Uptown']
};

var DISTRICT_FACTIONS = {
  'OPP': ['D1', 'D3', 'D5', 'D9'],
  'CRC': ['D6', 'D7', 'D8'],
  'IND': ['D2', 'D4']
};

var DISTRICT_HOLDERS = {
  'D1': 'Denise Carter',
  'D2': 'Leonard Tran',
  'D3': 'Rose Delgado',
  'D4': 'Ramon Vega',
  'D5': 'Janae Rivers',
  'D6': 'Elliott Crane',
  'D7': 'Warren Ashford',
  'D8': 'Nina Chen',
  'D9': 'Terrence Mobley'
};

/**
 * Get neighborhoods for a district string like "D1" or "D1,D3,D5"
 * Returns flat array of neighborhood names.
 */
function getNeighborhoodsForDistricts(districtStr) {
  if (!districtStr) return [];
  var districts = districtStr.split(/[,\s]+/).map(function(d) { return d.trim().toUpperCase(); });
  var hoods = [];
  for (var i = 0; i < districts.length; i++) {
    var d = districts[i];
    if (DISTRICT_NEIGHBORHOODS[d]) {
      hoods = hoods.concat(DISTRICT_NEIGHBORHOODS[d]);
    }
  }
  return hoods;
}

/**
 * Get the district for a neighborhood name.
 * Returns "D1"-"D9" or null if not found.
 */
function getDistrictForNeighborhood(neighborhood) {
  if (!neighborhood) return null;
  var lower = neighborhood.toLowerCase();
  for (var d in DISTRICT_NEIGHBORHOODS) {
    var hoods = DISTRICT_NEIGHBORHOODS[d];
    for (var i = 0; i < hoods.length; i++) {
      if (hoods[i].toLowerCase() === lower) return d;
    }
  }
  return null;
}

/**
 * Get all neighborhoods as a flat array.
 */
function getAllNeighborhoods() {
  var all = [];
  for (var d in DISTRICT_NEIGHBORHOODS) {
    all = all.concat(DISTRICT_NEIGHBORHOODS[d]);
  }
  return all;
}

// Google Apps Script compatibility: attach to global if not in Node
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    DISTRICT_NEIGHBORHOODS: DISTRICT_NEIGHBORHOODS,
    DISTRICT_FACTIONS: DISTRICT_FACTIONS,
    DISTRICT_HOLDERS: DISTRICT_HOLDERS,
    getNeighborhoodsForDistricts: getNeighborhoodsForDistricts,
    getDistrictForNeighborhood: getDistrictForNeighborhood,
    getAllNeighborhoods: getAllNeighborhoods
  };
}

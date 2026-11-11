// How each neighborhood is drawn. Every entry carries `q`, a phrase copied from
// docs/canon/INSTITUTIONS.md; build.js refuses to build if a phrase or a landmark
// name is no longer in that file. The numbers here are drawing choices read off
// that phrase — they are not sim data and nothing on the cycle path reads them.
//
// wall: brick | glass | stucco | concrete      tone: [hue, sat, light] of the walls
// h / w / gap: building height, width, spacing  lit: share of windows lit
// fill: box | house (what stands between the named businesses)
// trees 0..1, slope (rise per unit), water {side, kind}, neon 0..1, sky hue, fog
// set: set pieces — cranes, cityhall, oacc, saloon, station, coliseum, market,
//      fox, pergola, stadium
module.exports = {
  'West Oakland': { q: 'brick and crane, not glass', wall: 'brick', tone: [12, 0.45, 0.42], h: [7, 14], w: [10, 16], lit: 0.45, set: ['cranes'], sky: 22 },
  'Brooklyn': { q: 'residential rather than spectacle, no stadium, no anchor tenant', wall: 'glass', tone: [205, 0.2, 0.6], h: [14, 19], w: [9, 11], lit: 0.45, water: { side: -1, kind: 'estuary' }, sky: 205 },
  'Downtown': { q: 'Dense on weekdays, thinner after dark than Uptown or Jack London', wall: 'glass', tone: [215, 0.25, 0.5], h: [30, 75], w: [10, 15], gap: [0.3, 1], lit: 0.2, set: ['cityhall'], sky: 262 },
  'Chinatown': { q: 'Dense, culturally anchored, multigenerational', wall: 'stucco', tone: [18, 0.4, 0.5], h: [6, 11], w: [4.5, 6.5], gap: [0, 0.2], lit: 0.7, set: ['oacc'], sky: 345 },
  'Jack London': { q: 'Restaurants, venues, converted brick', wall: 'brick', tone: [10, 0.4, 0.4], h: [6, 11], w: [8, 12], lit: 0.7, water: { side: -1, kind: 'estuary' }, set: ['saloon'], neon: 0.6, sky: 285 },
  'Fruitvale': { q: 'new housing above the platform', wall: 'stucco', tone: [30, 0.3, 0.5], h: [5, 9], w: [6, 9], lit: 0.7, set: ['station'], sky: 32 },
  'San Antonio': { q: 'dense working core between Fruitvale and the lake', wall: 'concrete', tone: [30, 0.08, 0.5], h: [8, 13], w: [6, 8], gap: [0, 0.3], lit: 0.7, sky: 18 },
  'Dimond': { q: 'a small commercial village on the hill approach', wall: 'stucco', tone: [35, 0.25, 0.5], h: [3.5, 5.5], w: [6, 8], lit: 0.45, slope: 0.06, sky: 32 },
  'Glenview': { q: 'quiet hill-adjacent residential above the Dimond strip', fill: 'house', wall: 'stucco', tone: [40, 0.2, 0.6], h: [3.2, 4.4], w: [9, 12], lit: 0.45, trees: 0.6, slope: 0.06, sky: 205 },
  'Ivy Hill': { q: 'Residential to the point of invisibility', fill: 'house', wall: 'stucco', tone: [100, 0.1, 0.45], h: [3, 4], w: [9, 12], lit: 0.2, trees: 0.5, slope: 0.08, sky: 205 },
  'East Oakland': { q: 'the ground that has to hold while the money arrives', wall: 'stucco', tone: [35, 0.2, 0.46], h: [3.5, 6], w: [8, 13], gap: [1, 5], lit: 0.45, set: ['coliseum', 'cranes'], sky: 18 },
  'Piedmont Ave': { q: 'Clinics, specialists, small storefront retail', wall: 'stucco', tone: [45, 0.25, 0.66], h: [4, 7], w: [5, 7], lit: 0.7, trees: 0.3, sky: 345 },
  'Temescal': { q: 'a neighborhood fighting something specific and losing ground slowly', wall: 'stucco', tone: [30, 0.08, 0.38], h: [4, 8], w: [6, 9], gap: [0.5, 3], lit: 0.2, fog: 0.017, sky: 205 },
  'Rockridge': { q: 'affluent, professional, tree-lined', fill: 'house', wall: 'stucco', tone: [28, 0.3, 0.62], h: [4.4, 6], w: [11, 14], lit: 0.7, trees: 1, sky: 32 },
  'Adams Point': { q: 'Younger and renting where Lake Merritt is settled and owning', wall: 'stucco', tone: [200, 0.12, 0.52], h: [12, 18], w: [7, 9], gap: [0, 0.4], lit: 0.7, sky: 262 },
  'Grand Lake': { q: 'theater, weekend market, family retail', wall: 'stucco', tone: [38, 0.35, 0.6], h: [5, 9], w: [6, 9], lit: 0.7, set: ['market'], sky: 32 },
  'Eastlake': { q: 'where lake money thins into the flatlands', wall: 'concrete', tone: [30, 0.08, 0.46], h: [5, 8], w: [7, 10], lit: 0.45, sky: 18,
    left: { fill: 'house', wall: 'stucco', tone: [40, 0.3, 0.62], h: [4.4, 6], w: [11, 14], lit: 0.7, trees: 0.7 } },
  'Laurel': { q: 'schools, small commercial, ordinary streets', fill: 'house', wall: 'stucco', tone: [25, 0.2, 0.55], h: [3, 4], w: [8, 10], lit: 0.45, trees: 0.4, sky: 18 },
  'KONO': { q: 'Telegraph Avenue as spine', wall: 'brick', tone: [15, 0.3, 0.44], h: [6, 12], w: [6, 9], lit: 0.7, set: ['fox'], neon: 0.4, sky: 345 },
  'Lake Merritt': { q: 'historic and settled', wall: 'stucco', tone: [42, 0.3, 0.7], h: [8, 14], w: [10, 14], gap: [2, 4], lit: 0.45, trees: 0.5, water: { side: -1, kind: 'lake' }, set: ['pergola'], sky: 32 },
  'Uptown': { q: 'dense young-professional entertainment district', wall: 'brick', tone: [280, 0.15, 0.42], h: [10, 18], w: [7, 10], gap: [0, 0.5], lit: 0.7, neon: 1, sky: 300 },
  'Baylight District': { q: 'a 35,000-seat open-air waterfront stadium', wall: 'glass', tone: [190, 0.25, 0.6], h: [18, 26], w: [10, 13], lit: 0.45, water: { side: -1, kind: 'estuary' }, set: ['stadium'], sky: 205 }
};

// Names painted on set pieces. Each must appear in INSTITUTIONS.md.
module.exports.LANDMARKS = {
  cityhall: 'City Hall',
  oacc: 'Oakland Asian Cultural Center',
  saloon: "Heinold's First and Last Chance Saloon",
  fox: 'Fox Theater Oakland',
  coliseum: 'Oakland Coliseum',
  pergola: 'Lake Merritt pergola',
  station: 'Fruitvale'
};
// Shown on the station sign; the hub is INIT-003 in the file, named there as "transit hub".
module.exports.STATION_SIGN = 'Fruitvale Transit Hub';

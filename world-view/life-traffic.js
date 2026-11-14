// Moving traffic. LIFE.traffic(kit) is called once per place, after the street is built.
//
// Two travel lanes: the right lane (+LANE) runs the way the flight goes (toward -z, the gate), the left lane
// comes back toward the viewer. Vehicles enter at one end of the street and leave at the other, dissolving
// into the fog at both ends (behind the start, and well before the gate ring), and never appear inside the
// camera's view up close. Each lane is a queue: every vehicle follows the one ahead with a smooth
// car-following rule, so spacing holds and nothing overlaps.
//
// How much traffic a place gets is a drawing choice read off its hoods.js entry (building height, neon, lit
// windows, houses or blocks) and its canon line: "residential", "quiet", "invisibility" thin it, "thinner
// after dark" holds it to steady, entertainment streets and spines fill it.
//
// Buses run only where the place's ledger holds a bus operator: a Public Transit row that is not rail. The
// only words painted are that row's name, on the destination board and the stop flag.
//
// Each kind of vehicle (saloon, hatchback, tall car, van, box truck) is one shape lofted from nose to tail, with
// its glass painted into it; wheels have hubs and turn with the distance covered; the body dips on its springs
// under braking. The cars parked at the kerb (the page's k.carSpots) are the same shapes, drawn here.
//
// The week's chaos cars (the engine's Chaos_Cars rows for this street, k.H.chaos) drive in the same loop, each
// with its own shape and lights; see the README, §Chaos cars.
//
// Draw calls: one per kind of vehicle (5, and one for each kind of chaos car on the street), wheels, lamps, light glows, light on the road; with buses, bus bodies,
// bus windows, bus boards, stop poles and stop flags. Everything sits under k.ground, so it tilts with a hill.
LIFE.traffic = function (k) {
  var T = k.THREE, G = k.ground, LANE = k.LANE, ROAD = k.ROAD, ST = k.ST || {}, LAY = k.LAY || {};
  var R = (typeof rng === 'function' && typeof hash === 'function') ? rng(hash(k.H.name + '|traffic')) : Math.random;
  var cosT = Math.cos(Math.atan(k.slope || 0));
  function loc(z) { return (z - 10) / cosT; } // world z -> z along the tilted ground
  function smooth(a, b, x) { var u = Math.max(0, Math.min(1, (x - a) / (b - a))); return u * u * (3 - 2 * u); }
  var rain = k.WX === 'rain';

  // ---------- how busy the street is ----------
  var q = String(ST.q || ''), hTop = (ST.h && ST.h[1]) || 9, house = ST.fill === 'house';
  var dens = 0.15 + Math.min(hTop, 30) / 40 + (ST.neon || 0) * 0.45 + ((ST.lit != null ? ST.lit : 0.45) - 0.45) * 0.5 - (house ? 0.3 : 0);
  if (/residential|quiet|invisib/i.test(q)) dens *= 0.45;
  if (/thinner after dark/i.test(q)) dens *= 0.8;
  if (/entertainment|venues|spine/i.test(q)) dens += 0.15;
  if ((ST.lit != null ? ST.lit : 0.45) <= 0.2 && hTop < 20) dens *= 0.5; // a dim low street: few people about
  if (house && !/quiet|invisib/i.test(q)) dens = Math.max(dens, 0.12); // ordinary house streets still see a car
  dens = Math.max(0.035, Math.min(1, dens));
  var every = Math.min(48, 1.75 / Math.pow(dens, 1.15)); // mean seconds between vehicles entering a lane
  var vBase = (k.slope ? 5.6 : 7) * (rain ? 0.72 : 1);
  var heavy = (ST.set || []).indexOf('cranes') >= 0 ? 0.3 : (LAY.places || []).some(function (p) { return p.type === 'stadium' || p.type === 'arena'; }) ? 0.2 : 0.04;
  var vans = /dense|working/i.test(q) ? 0.2 : 0.1;

  // the bus operator, if the ledger has one here
  var op = null;
  (k.H.biz || []).forEach(function (b) { if (!op && b.n === 'AC Transit') op = b; });
  if (!op) (k.H.biz || []).forEach(function (b) { if (!op && /Public Transit/i.test(b.s || '') && !/BART|rail|train|ferry/i.test(b.n)) op = b; });

  // ---------- the lanes ----------
  var zTop = loc(38), zBot = loc(k.gz + 12), laneLen = zTop - zBot, FADE = 16;
  // lane 0: right (+x), heading -z, u runs from zTop; lane 1: left (-x), heading +z, u runs from zBot
  var lanes = [{ side: 1, list: [], timer: 0, busTimer: 0, stops: [] }, { side: -1, list: [], timer: R() * every, busTimer: 0, stops: [] }];
  function zOf(lane, u) { return lane.side > 0 ? zTop - u : zBot + u; }

  // Vehicle types. l, w: length and width; v: speed factor; ax: front and rear axle, ahead of and behind the
  // middle; wr: wheel size against a 0.33 m wheel; ny, ty: height of the head and tail lamps; lx: how far out they sit.
  // (front is -z)
  var TYPES = {
    sedan: { l: 4.5, w: 1.8, v: 1, ax: [1.42, 1.35], wr: 1, ny: 0.5, ty: 0.56, lx: 0.48 },
    hatch: { l: 3.9, w: 1.74, v: 1, ax: [1.22, 1.2], wr: 0.97, ny: 0.5, ty: 0.62, lx: 0.46 },
    suv: { l: 4.7, w: 1.9, v: 0.97, ax: [1.48, 1.42], wr: 1.14, ny: 0.61, ty: 0.7, lx: 0.54 },
    van: { l: 5.2, w: 1.95, v: 0.92, ax: [1.8, 1.6], wr: 1.1, ny: 0.67, ty: 0.75, lx: 0.6 },
    truck: { l: 6.6, w: 2.0, v: 0.82, ax: [2.5, 1.95], wr: 1.3, ny: 0.74, ty: 0.63, lx: 0.66 },
    bus: { l: 11.4, w: 2.5, v: 0.86, ax: [3.7, 3.7], wr: 1.5, ny: 0.75, ty: 0.79, lx: 0.97 },
    // The chaos cars (keys are the engine's: utilities/chaosCarsConfig.js). top: height, for the label; flash: the
    // lights it shows (rb red and blue, amber, hazard while stopped, serve a lit hatch); bar: where on the roof;
    // dwell: seconds at its stop; every: metres between stops for one that works its way down the street.
    cop_car: { l: 4.5, w: 1.8, v: 1.12, ax: [1.42, 1.35], wr: 1, ny: 0.5, ty: 0.56, lx: 0.48, top: 1.55, flash: 'rb', bar: [1.41, 0.45], dwell: 8 },
    fire_engine: { l: 7.6, w: 2.3, v: 0.95, ax: [2.7, 2.2], wr: 1.4, ny: 0.85, ty: 0.9, lx: 0.8, top: 2.8, flash: 'rb', bar: [2.46, -2.9], dwell: 12 },
    ambulance: { l: 5.6, w: 2.0, v: 1.05, ax: [1.9, 1.7], wr: 1.15, ny: 0.68, ty: 0.8, lx: 0.62, top: 2.6, flash: 'rb', bar: [2.5, -1.0], dwell: 10 },
    oari_van: { l: 5.2, w: 1.95, v: 0.9, ax: [1.8, 1.6], wr: 1.1, ny: 0.67, ty: 0.75, lx: 0.6, top: 2.0, flash: 'hazard', dwell: 12 },
    building_inspector: { l: 3.9, w: 1.74, v: 0.9, ax: [1.22, 1.2], wr: 0.97, ny: 0.5, ty: 0.62, lx: 0.46, top: 1.55, flash: 'hazard', dwell: 10 },
    garbage_truck: { l: 8.0, w: 2.4, v: 0.55, ax: [2.9, 2.3], wr: 1.45, ny: 0.9, ty: 0.9, lx: 0.85, top: 3.2, flash: 'amber', bar: [2.56, -3.0], dwell: 3.5, every: 24 },
    mail_truck: { l: 4.6, w: 1.9, v: 0.8, ax: [1.5, 1.4], wr: 1.05, ny: 0.62, ty: 0.7, lx: 0.6, top: 2.2, flash: 'hazard', dwell: 7 },
    ice_cream_truck: { l: 5.4, w: 2.0, v: 0.45, ax: [1.8, 1.7], wr: 1.1, ny: 0.66, ty: 0.75, lx: 0.62, top: 3.3, flash: 'serve', dwell: 12 },
    street_sweeper: { l: 4.2, w: 1.8, v: 0.32, ax: [1.3, 1.25], wr: 1.0, ny: 0.6, ty: 0.7, lx: 0.55, top: 2.2, flash: 'amber', bar: [2.15, -0.9], dwell: 0 },
    pge_truck: { l: 6.2, w: 2.1, v: 0.85, ax: [2.2, 1.8], wr: 1.25, ny: 0.74, ty: 0.7, lx: 0.68, top: 3.6, flash: 'amber', bar: [2.05, -2.3], dwell: 14 }
  };
  var COLORS = [[0, 0, 0.82], [0, 0, 0.6], [220, 0.05, 0.42], [0, 0, 0.1], [215, 0.5, 0.25], [0, 0.65, 0.33], [150, 0.35, 0.22], [35, 0.3, 0.55], [205, 0.15, 0.62], [12, 0.55, 0.42], [265, 0.25, 0.3], [48, 0.6, 0.5]];
  function pickType() { var x = R(); if (x < heavy) return 'truck'; x -= heavy; if (x < vans) return 'van'; x = R(); return x < 0.45 ? 'sedan' : x < 0.72 ? 'hatch' : 'suv'; }

  // ---------- the pool ----------
  var busN = op ? 2 : 0;
  var perLane = Math.ceil(laneLen / (vBase * every) * 1.3) + 2;
  var carN = Math.max(2, Math.min(40 - busN, perLane * 2));
  var V = [], i;
  var CHAOS = ((k.H && k.H.chaos) || []).filter(function (ev) { return TYPES[ev.v] && TYPES[ev.v].top; }); // a train or a ship is not on the road
  for (i = 0; i < carN + busN + CHAOS.length; i++) V.push({ i: i, bus: i >= carN && i < carN + busN, chaos: i >= carN + busN ? CHAOS[i - carN - busN] : null, bi: i - carN, on: false, lane: null, u: 0, v: 0, a: 0, lat: 0, latPrev: 0, yaw: 0, type: i >= carN + busN ? CHAOS[i - carN - busN].v : i >= carN ? 'bus' : 'sedan', v0: 7, fade: 0, dirty: true, stopI: 0, st: 'run', wait: 0 });

  // ---------- materials: anything solid dissolves into the fog by aFade (1 = fully there) ----------
  function fadeable(m) {
    m.onBeforeCompile = function (sh) {
      sh.vertexShader = 'attribute float aFade;\nvarying float vFade;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n\tvFade = aFade;');
      sh.fragmentShader = 'varying float vFade;\n' + sh.fragmentShader.replace('#include <fog_fragment>', '#include <fog_fragment>\n#ifdef USE_FOG\n\tgl_FragColor.rgb = mix(gl_FragColor.rgb, fogColor, 1.0 - vFade);\n#endif');
    };
    m.customProgramCacheKey = function () { return 'lifeTrafficFade'; };
    return m;
  }
  function fadeAttr(geo, n) { var a = new T.InstancedBufferAttribute(new Float32Array(n), 1); geo.setAttribute('aFade', a); return a; }
  function im(geo, mat, n, colored) {
    var m = new T.InstancedMesh(geo, mat, n); m.frustumCulled = false; m.userData.fade = fadeAttr(geo, n);
    if (colored) m.setColorAt(0, new T.Color(1, 1, 1));
    for (var j = 0; j < n; j++) m.setMatrixAt(j, ZERO);
    G.add(m); return m;
  }
  var ZERO = new T.Matrix4().makeScale(0, 0, 0);
  var N = V.length;

  // ---------- shapes ----------
  // A body is lofted through cross-sections from nose to tail, each [z, half-width low, half-width high, bottom,
  // top, corner], joined and closed at both ends, shaded smooth so the corners read as rounded. Paint takes the
  // car's own colour; glass and the underside are painted dark into the shape, so one mesh draws the whole car.
  var PAINT = [1, 1, 1], SILL = [0.5, 0.5, 0.52], GLASS = [0.05, 0.06, 0.085], SKY = [0.17, 0.2, 0.28], DARK = [0.16, 0.16, 0.18]; // glass runs from dark at the sill to a little sky at the roof
  function hull(st, top, low, xo) {
    var pos = [], col = [], idx = [], n = st.length, RN = 8, i2, j2;
    st.forEach(function (q) {
      var z = q[0], b = q[1], t = q[2], y0 = q[3], y1 = q[4], c = q[5] == null ? 0.09 : q[5];
      [[-t + c, y1], [t - c, y1], [t, y1 - c], [b, y0 + c], [b - c, y0], [-b + c, y0], [-b, y0 + c], [-t, y1 - c]].forEach(function (pt, j) {
        pos.push(pt[0] + (xo || 0), pt[1], z); var cc = j >= 3 && j <= 6 ? low : top; col.push(cc[0], cc[1], cc[2]);
      });
    });
    for (i2 = 0; i2 < n - 1; i2++) for (j2 = 0; j2 < RN; j2++) { var a = i2 * RN + j2, b2 = i2 * RN + (j2 + 1) % RN, c2 = (i2 + 1) * RN + (j2 + 1) % RN, d = (i2 + 1) * RN + j2; idx.push(a, d, c2, a, c2, b2); }
    // the two ends are faces of their own (their corners are not shared with the sides), so a flat end shades flat
    [0, n - 1].forEach(function (e) {
      var q = st[e], c0 = pos.length / 3;
      for (j2 = 0; j2 < RN; j2++) { var src = (e * RN + j2) * 3; pos.push(pos[src], pos[src + 1], pos[src + 2]); col.push(col[src], col[src + 1], col[src + 2]); }
      var ci = pos.length / 3; pos.push(xo || 0, (q[3] + q[4]) / 2, q[0]); col.push((top[0] + low[0]) / 2, (top[1] + low[1]) / 2, (top[2] + low[2]) / 2);
      for (j2 = 0; j2 < RN; j2++) { var r0 = c0 + j2, r1 = c0 + (j2 + 1) % RN; if (e) idx.push(ci, r1, r0); else idx.push(ci, r0, r1); }
    });
    var g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new T.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals();
    return g;
  }
  function mergeGeo(list) {
    var pos = [], nor = [], col = [];
    list.forEach(function (g) { var q = g.index ? g.toNonIndexed() : g; Array.prototype.push.apply(pos, q.attributes.position.array); Array.prototype.push.apply(nor, q.attributes.normal.array); Array.prototype.push.apply(col, q.attributes.color.array); if (q !== g) q.dispose(); g.dispose(); });
    var out = new T.BufferGeometry(); out.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); out.setAttribute('normal', new T.Float32BufferAttribute(nor, 3)); out.setAttribute('color', new T.Float32BufferAttribute(col, 3));
    return out;
  }
  function sedanHulls(paint) { return [ // three boxes: bonnet, cabin, boot
    hull([[-2.25, 0.68, 0.6, 0.38, 0.6, 0.06], [-2.1, 0.86, 0.8, 0.24, 0.7], [-1.25, 0.9, 0.86, 0.2, 0.83], [-0.65, 0.9, 0.87, 0.2, 0.9], [1.25, 0.9, 0.87, 0.2, 0.92], [2.05, 0.87, 0.82, 0.24, 0.88], [2.25, 0.72, 0.64, 0.4, 0.7, 0.06]], paint, SILL),
    hull([[-0.8, 0.82, 0.8, 0.84, 0.9, 0.02], [-0.08, 0.8, 0.66, 0.86, 1.36, 0.05], [0.98, 0.8, 0.66, 0.86, 1.36, 0.05], [1.62, 0.82, 0.8, 0.86, 0.93, 0.02]], SKY, GLASS),
    hull([[-0.2, 0.55, 0.55, 1.33, 1.37, 0.02], [-0.02, 0.675, 0.66, 1.33, 1.405, 0.04], [0.92, 0.675, 0.66, 1.33, 1.405, 0.04], [1.1, 0.55, 0.55, 1.33, 1.37, 0.02]], paint, paint)]; }
  function hatchHulls(paint) { return [ // two boxes: the roof runs to the back
    hull([[-1.95, 0.66, 0.58, 0.38, 0.62, 0.06], [-1.8, 0.83, 0.78, 0.24, 0.72], [-1.1, 0.87, 0.83, 0.2, 0.86], [-0.5, 0.87, 0.84, 0.2, 0.93], [1.5, 0.87, 0.84, 0.2, 0.96], [1.85, 0.85, 0.8, 0.26, 0.94], [1.95, 0.76, 0.7, 0.4, 0.8, 0.06]], paint, SILL),
    hull([[-0.68, 0.8, 0.78, 0.86, 0.93, 0.02], [0, 0.78, 0.65, 0.88, 1.42, 0.05], [1.4, 0.78, 0.65, 0.9, 1.4, 0.05], [1.86, 0.8, 0.76, 0.9, 0.98, 0.02]], SKY, GLASS),
    hull([[-0.12, 0.54, 0.54, 1.39, 1.43, 0.02], [0.06, 0.665, 0.65, 1.39, 1.465, 0.04], [1.34, 0.665, 0.65, 1.37, 1.445, 0.04], [1.5, 0.56, 0.56, 1.37, 1.41, 0.02]], paint, paint)]; }
  function vanHulls(paint) { return [ // one box: glass round the cab, a closed side behind it
    hull([[-2.6, 0.8, 0.74, 0.42, 0.9, 0.06], [-2.45, 0.94, 0.9, 0.3, 1.05], [-2.0, 0.975, 0.95, 0.27, 1.15], [2.45, 0.975, 0.95, 0.27, 1.15], [2.6, 0.9, 0.86, 0.34, 1.1, 0.06]], paint, SILL),
    hull([[-2.18, 0.92, 0.9, 1.08, 1.15, 0.02], [-1.6, 0.92, 0.8, 1.1, 1.9, 0.05], [-0.75, 0.93, 0.82, 1.1, 1.9, 0.05], [-0.7, 0.9, 0.8, 1.1, 1.85, 0.03]], SKY, GLASS),
    hull([[-0.78, 0.95, 0.84, 1.1, 1.93, 0.05], [2.42, 0.95, 0.84, 1.1, 1.93, 0.05], [2.58, 0.86, 0.8, 1.1, 1.85, 0.05]], paint, paint),
    hull([[-1.75, 0.7, 0.7, 1.87, 1.91, 0.02], [-1.55, 0.815, 0.8, 1.87, 1.95, 0.04], [-0.7, 0.845, 0.83, 1.87, 1.95, 0.04]], paint, paint)]; }
  // a cab with its glass and roof, front at z0, back at z1, floor f, belt b, roof r, half-width w
  function cabHulls(z0, z1, f, b, r, w, paint) { return [
    hull([[z0, w - 0.14, w - 0.18, f + 0.05, b - 0.3, 0.06], [z0 + 0.16, w, w - 0.02, f, b - 0.1], [z1 - 0.06, w, w - 0.02, f, b - 0.05], [z1, w - 0.07, w - 0.09, f + 0.05, b - 0.1, 0.04]], paint, SILL),
    hull([[z0 + 0.08, w - 0.04, w - 0.05, b - 0.18, b - 0.1, 0.02], [z0 + 0.42, w - 0.04, w - 0.14, b - 0.14, r - 0.06, 0.05], [z1 - 0.1, w - 0.04, w - 0.12, b - 0.14, r - 0.06, 0.05], [z1 - 0.04, w - 0.08, w - 0.14, b - 0.14, r - 0.11, 0.03]], SKY, GLASS),
    hull([[z0 + 0.3, w - 0.32, w - 0.32, r - 0.09, r - 0.04, 0.02], [z0 + 0.5, w - 0.12, w - 0.14, r - 0.09, r, 0.04], [z1 - 0.05, w - 0.11, w - 0.12, r - 0.09, r, 0.04]], paint, paint)]; }
  function rgb(h, sat, l) { var c = new T.Color().setHSL(h / 360, sat, l); return [c.r, c.g, c.b]; }
  function solid(g, c) { var q = g.index ? g.toNonIndexed() : g, a = new Float32Array(q.attributes.position.count * 3); for (var v = 0; v < a.length; v += 3) { a[v] = c[0]; a[v + 1] = c[1]; a[v + 2] = c[2]; } q.setAttribute('color', new T.BufferAttribute(a, 3)); q.deleteAttribute('uv'); if (q !== g) g.dispose(); return q; }
  var WHT = [0.86, 0.86, 0.84], GRY = [0.62, 0.62, 0.64], NAVY = rgb(225, 0.45, 0.1), ENG = rgb(3, 0.82, 0.36), ENGD = rgb(3, 0.8, 0.24), ORG = rgb(22, 0.9, 0.5), TEAL = rgb(176, 0.5, 0.3), GRN = rgb(140, 0.45, 0.22), GRND = rgb(140, 0.4, 0.14), BLU = rgb(215, 0.7, 0.36), CRM = rgb(42, 0.6, 0.86), PNK = rgb(338, 0.7, 0.72), YEL = rgb(46, 0.9, 0.52), WARMP = [1, 0.86, 0.55];
  // lights on a roof: a bar with a red end and a blue end, or one amber lamp
  function barHulls(y, z) { return [hull([[z - 0.13, 0.56, 0.56, y, y + 0.09, 0.02], [z + 0.13, 0.56, 0.56, y, y + 0.09, 0.02]], DARK, DARK), hull([[z - 0.11, 0.2, 0.2, y + 0.03, y + 0.17, 0.04], [z + 0.11, 0.2, 0.2, y + 0.03, y + 0.17, 0.04]], rgb(2, 0.9, 0.45), rgb(2, 0.9, 0.3), -0.34), hull([[z - 0.11, 0.2, 0.2, y + 0.03, y + 0.17, 0.04], [z + 0.11, 0.2, 0.2, y + 0.03, y + 0.17, 0.04]], rgb(222, 0.9, 0.5), rgb(222, 0.9, 0.32), 0.34)]; }
  function lampHulls(y, z) { return [hull([[z - 0.1, 0.1, 0.1, y, y + 0.17, 0.04], [z + 0.1, 0.1, 0.1, y, y + 0.17, 0.04]], rgb(38, 1, 0.55), rgb(38, 1, 0.4))]; }
  var SHAPES = {
    sedan: function () { return mergeGeo(sedanHulls(PAINT)); },
    hatch: function () { return mergeGeo(hatchHulls(PAINT)); },
    suv: function () { return mergeGeo([
      hull([[-2.35, 0.74, 0.68, 0.44, 0.76, 0.06], [-2.2, 0.91, 0.86, 0.3, 0.9], [-1.4, 0.95, 0.91, 0.27, 1.0], [-0.75, 0.95, 0.92, 0.27, 1.04], [1.9, 0.95, 0.92, 0.27, 1.06], [2.25, 0.93, 0.88, 0.32, 1.04], [2.35, 0.82, 0.76, 0.46, 0.9, 0.06]], PAINT, SILL),
      hull([[-0.9, 0.88, 0.86, 0.98, 1.04, 0.02], [-0.2, 0.86, 0.74, 1.0, 1.64, 0.05], [1.8, 0.86, 0.74, 1.0, 1.63, 0.05], [2.24, 0.88, 0.84, 1.0, 1.08, 0.02]], SKY, GLASS),
      hull([[-0.32, 0.6, 0.6, 1.61, 1.65, 0.02], [-0.12, 0.755, 0.74, 1.61, 1.69, 0.04], [1.74, 0.755, 0.74, 1.6, 1.68, 0.04], [1.9, 0.62, 0.62, 1.6, 1.64, 0.02]], PAINT, PAINT)]); },
    van: function () { return mergeGeo(vanHulls(PAINT)); },
    // a cab, and a box on a frame
    truck: function () { return mergeGeo([
      hull([[-3.3, 0.9, 0.9, 0.4, 0.8, 0.04], [3.25, 0.9, 0.9, 0.45, 0.8, 0.04]], DARK, DARK),
      hull([[-3.3, 0.86, 0.82, 0.45, 1.0, 0.06], [-3.15, 0.97, 0.95, 0.4, 1.25], [-1.6, 0.97, 0.95, 0.4, 1.3], [-1.52, 0.9, 0.88, 0.45, 1.25, 0.04]], PAINT, SILL),
      hull([[-3.2, 0.93, 0.92, 1.2, 1.28, 0.02], [-2.85, 0.93, 0.84, 1.24, 2.05, 0.05], [-1.7, 0.93, 0.86, 1.24, 2.05, 0.05], [-1.62, 0.9, 0.84, 1.24, 2.0, 0.03]], SKY, GLASS),
      hull([[-2.95, 0.72, 0.72, 2.02, 2.06, 0.02], [-2.78, 0.855, 0.84, 2.02, 2.1, 0.04], [-1.62, 0.875, 0.86, 2.02, 2.1, 0.04]], PAINT, PAINT),
      hull([[-1.4, 1.0, 1.0, 0.82, 3.0, 0.04], [3.3, 1.0, 1.0, 0.82, 3.0, 0.04]], PAINT, [0.8, 0.8, 0.82])]); },
    // ---- the chaos cars: liveries painted into the shape, nothing lettered ----
    cop_car: function () { return mergeGeo(sedanHulls(NAVY).concat([hull([[-0.55, 0.915, 0.885, 0.32, 0.9, 0.03], [1.15, 0.915, 0.885, 0.32, 0.92, 0.03]], WHT, WHT)], barHulls(1.405, 0.45))); },
    fire_engine: function () { return mergeGeo([
      hull([[-3.8, 1.0, 1.0, 0.45, 0.9, 0.04], [3.75, 1.0, 1.0, 0.5, 0.9, 0.04]], DARK, DARK),
      hull([[-1.85, 1.14, 1.12, 0.9, 2.5, 0.05], [3.78, 1.14, 1.12, 0.9, 2.5, 0.05]], ENG, ENGD),
      hull([[-1.8, 1.155, 1.15, 1.25, 1.5, 0.02], [3.74, 1.155, 1.15, 1.25, 1.5, 0.02]], GRY, GRY),
      hull([[-3.2, 0.05, 0.05, 2.62, 2.72, 0.01], [3.7, 0.05, 0.05, 2.62, 2.72, 0.01]], GRY, GRY, -0.42), hull([[-3.2, 0.05, 0.05, 2.62, 2.72, 0.01], [3.7, 0.05, 0.05, 2.62, 2.72, 0.01]], GRY, GRY, 0.42)
    ].concat(cabHulls(-3.8, -1.9, 0.45, 1.6, 2.46, 1.12, ENG), barHulls(2.46, -2.9))); },
    ambulance: function () { return mergeGeo([
      hull([[-1.4, 1.02, 1.0, 0.36, 2.5, 0.06], [2.78, 1.02, 1.0, 0.36, 2.5, 0.06]], WHT, [0.7, 0.7, 0.7]),
      hull([[-1.36, 1.035, 1.03, 1.0, 1.28, 0.02], [2.74, 1.035, 1.03, 1.0, 1.28, 0.02]], ORG, ORG)
    ].concat(cabHulls(-2.8, -1.42, 0.3, 1.3, 2.0, 0.99, WHT), barHulls(2.5, -1.0))); },
    oari_van: function () { return mergeGeo(vanHulls(TEAL).concat([hull([[-0.7, 0.99, 0.975, 1.2, 1.5, 0.02], [2.4, 0.99, 0.975, 1.2, 1.5, 0.02]], WHT, WHT)])); },
    building_inspector: function () { return mergeGeo(hatchHulls(WHT).concat(lampHulls(1.465, 0.7))); },
    garbage_truck: function () { return mergeGeo([
      hull([[-4.0, 1.05, 1.05, 0.5, 0.95, 0.04], [3.9, 1.05, 1.05, 0.55, 0.95, 0.04]], DARK, DARK),
      hull([[-2.2, 1.18, 1.1, 0.95, 3.0, 0.18], [2.9, 1.18, 1.1, 0.95, 3.15, 0.18]], GRN, GRND),
      hull([[2.9, 1.16, 1.05, 0.8, 3.1, 0.12], [3.6, 1.14, 1.0, 0.7, 2.4, 0.12], [4.0, 1.1, 0.95, 0.7, 1.5, 0.1]], GRND, GRND)
    ].concat(cabHulls(-4.0, -2.3, 0.5, 1.7, 2.56, 1.16, WHT), lampHulls(2.56, -3.0))); },
    mail_truck: function () { return mergeGeo([
      hull([[-2.3, 0.9, 0.86, 0.4, 1.2, 0.05], [-2.2, 0.95, 0.93, 0.34, 1.3], [-1.5, 0.95, 0.94, 0.34, 2.15, 0.06], [2.25, 0.95, 0.94, 0.34, 2.15, 0.06], [2.3, 0.9, 0.88, 0.4, 2.1, 0.05]], WHT, [0.72, 0.72, 0.72]),
      hull([[-2.16, 0.9, 0.89, 1.25, 1.33, 0.02], [-1.52, 0.9, 0.88, 1.3, 2.08, 0.04], [-0.9, 0.955, 0.945, 1.3, 1.95, 0.03], [-0.86, 0.9, 0.9, 1.3, 1.9, 0.02]], SKY, GLASS),
      hull([[-1.45, 0.96, 0.958, 0.78, 1.0, 0.02], [2.26, 0.96, 0.958, 0.78, 1.0, 0.02]], BLU, BLU),
      hull([[-1.45, 0.96, 0.958, 1.03, 1.1, 0.02], [2.26, 0.96, 0.958, 1.03, 1.1, 0.02]], ENG, ENG)]); },
    ice_cream_truck: function () { return mergeGeo([
      hull([[-1.3, 1.0, 0.94, 0.3, 2.45, 0.08], [2.62, 1.0, 0.94, 0.3, 2.45, 0.08]], CRM, SILL),
      hull([[-1.26, 1.015, 1.01, 1.15, 1.4, 0.02], [2.6, 1.015, 1.01, 1.15, 1.4, 0.02]], PNK, PNK),
      hull([[0, 0.03, 0.03, 1.5, 2.2, 0.01], [1.6, 0.03, 0.03, 1.5, 2.2, 0.01]], WARMP, WARMP, 0.985),
      hull([[-0.05, 0.22, 0.22, 2.2, 2.26, 0.01], [1.65, 0.22, 0.22, 2.2, 2.26, 0.01]], PNK, PNK, 1.17),
      solid(new T.ConeGeometry(0.27, 0.72, 8).rotateX(Math.PI).translate(0, 2.81, 0.6), rgb(32, 0.6, 0.55)),
      solid(new T.SphereGeometry(0.31, 8, 6).translate(0, 3.2, 0.6), PNK)
    ].concat(cabHulls(-2.7, -1.26, 0.3, 1.3, 2.0, 0.99, CRM))); },
    street_sweeper: function () { return mergeGeo([
      hull([[-2.1, 0.82, 0.8, 0.4, 1.1, 0.05], [-1.95, 0.88, 0.86, 0.36, 1.2], [-0.9, 0.88, 0.86, 0.36, 1.25], [2.05, 0.88, 0.84, 0.4, 1.9, 0.1], [2.1, 0.84, 0.8, 0.5, 1.8, 0.08]], YEL, SILL),
      solid(new T.CylinderGeometry(0.42, 0.42, 0.12, 10).translate(-0.75, 0.1, -1.75), [0.07, 0.07, 0.08]), solid(new T.CylinderGeometry(0.42, 0.42, 0.12, 10).translate(0.75, 0.1, -1.75), [0.07, 0.07, 0.08])
    ].concat(cabHulls(-2.0, -0.66, 0.36, 1.36, 2.15, 0.88, YEL), lampHulls(2.15, -0.9))); },
    // the utility's truck: a boom folded over the bed, a bucket at the end of it
    pge_truck: function () { return mergeGeo([
      hull([[-3.1, 0.95, 0.95, 0.42, 0.85, 0.04], [3.05, 0.95, 0.95, 0.46, 0.85, 0.04]], DARK, DARK),
      hull([[-1.1, 1.05, 1.05, 0.85, 1.6, 0.04], [3.0, 1.05, 1.05, 0.85, 1.6, 0.04]], WHT, [0.7, 0.7, 0.7]),
      hull([[-1.06, 1.062, 1.06, 1.1, 1.25, 0.02], [2.96, 1.062, 1.06, 1.1, 1.25, 0.02]], YEL, YEL),
      hull([[-0.9, 0.12, 0.12, 1.6, 1.85, 0.03], [2.5, 0.12, 0.12, 3.0, 3.25, 0.03]], YEL, YEL),
      hull([[2.45, 0.38, 0.38, 2.9, 3.55, 0.05], [3.15, 0.38, 0.38, 2.9, 3.55, 0.05]], YEL, WHT)
    ].concat(cabHulls(-3.1, -1.2, 0.42, 1.4, 2.05, 1.03, WHT), lampHulls(2.05, -2.3))); }
  };
  // a wheel: tyre, a hub whose spokes show it turning, and the dark of the arch behind it
  function wheelGeo() {
    function tint(g, fn) { var q = g.toNonIndexed(), a = q.attributes.position, c = new Float32Array(a.count * 3); for (var v = 0; v < a.count; v += 3) { var l = fn((a.getX(v) + a.getX(v + 1) + a.getX(v + 2)) / 3, (a.getY(v) + a.getY(v + 1) + a.getY(v + 2)) / 3, (a.getZ(v) + a.getZ(v + 1) + a.getZ(v + 2)) / 3, a, v); for (var e = 0; e < 9; e++) c[v * 3 + e] = l; } q.setAttribute('color', new T.BufferAttribute(c, 3)); g.dispose(); return q; }
    var tyre = tint(new T.CylinderGeometry(0.33, 0.33, 0.24, 14).rotateZ(Math.PI / 2), function () { return 0.05; });
    var hub = tint(new T.CylinderGeometry(0.21, 0.21, 0.252, 10).rotateZ(Math.PI / 2), function (x, y, z, a, v) { var cap = Math.abs(a.getX(v)) > 0.12 && Math.abs(a.getX(v + 1)) > 0.12 && Math.abs(a.getX(v + 2)) > 0.12; return !cap ? 0.3 : Math.floor((Math.atan2(y, z) + Math.PI) / (Math.PI / 5) + 0.5) % 2 ? 0.5 : 0.24; });
    var arch = tint(new T.CylinderGeometry(0.41, 0.41, 0.22, 14).rotateZ(Math.PI / 2), function () { return 0.02; });
    return mergeGeo([tyre, hub, arch]);
  }

  // where the page left room for parked cars: [side, world z]. Each gets a type and a colour of its own.
  var PARK = (k.carSpots || []).map(function (c) { var x = R(); return { s: c[0], z: c[1], type: x < 0.42 ? 'sedan' : x < 0.68 ? 'hatch' : x < 0.92 ? 'suv' : 'van' }; });
  var parkedOf = {}; PARK.forEach(function (c) { c.slot = parkedOf[c.type] = (parkedOf[c.type] || 0) + 1; });
  var paintMat = function () { return fadeable(new T.MeshPhongMaterial({ color: 0xffffff, vertexColors: true, shininess: 55, specular: 0x2a2a33 })); };
  var bodyOf = {};
  ['sedan', 'hatch', 'suv', 'van', 'truck'].concat(CHAOS.map(function (ev) { return ev.v; })).forEach(function (ty) { if (!bodyOf[ty]) bodyOf[ty] = im(SHAPES[ty](), paintMat(), N + (parkedOf[ty] || 0), true); });
  var wheelM = im(wheelGeo(), fadeable(new T.MeshLambertMaterial({ color: 0xffffff, vertexColors: true })), (N + PARK.length) * 4);
  var lampM = im(new T.BoxGeometry(1, 1, 1), fadeable(new T.MeshBasicMaterial({ color: 0xffffff })), N * 4, true);
  var HEAD = new T.Color(0xfff1cf), TAIL = new T.Color(0xc4180e), BRAKE = new T.Color(0xff5a40), C = new T.Color();

  var busM = null, winM = null, boardM = null;
  if (op) {
    var hue = typeof k.sectorHue === 'function' ? k.sectorHue(op.s) : 190;
    // the bus: one shape like the cars. A long body with rounded corners and a domed roof, the operator's colour
    // in a band along it over a dark skirt, two doors on the kerb side, a pod on the roof, mirrors out front.
    var BODY = rgb(hue, 0.06, 0.74), BAND = rgb(hue, 0.7, 0.4), SKIRT = rgb(hue, 0.1, 0.2), ROOF = rgb(hue, 0.05, 0.6), DOORT = [0.7, 0.58, 0.38];
    busM = im(mergeGeo([
      hull([[-5.7, 1.19, 1.19, 0.5, 3.1, 0.16], [-5.52, 1.25, 1.25, 0.34, 3.14, 0.12], [5.54, 1.25, 1.25, 0.34, 3.14, 0.12], [5.7, 1.2, 1.2, 0.46, 3.08, 0.14]], BODY, BODY),
      hull([[-5.5, 1.22, 1.02, 3.1, 3.34, 0.1], [5.5, 1.22, 1.02, 3.1, 3.34, 0.1]], ROOF, BODY),
      hull([[-5.54, 1.258, 1.258, 0.95, 1.32, 0.02], [5.56, 1.258, 1.258, 0.95, 1.32, 0.02]], BAND, BAND),
      hull([[-5.56, 1.262, 1.262, 0.3, 0.64, 0.03], [5.58, 1.262, 1.262, 0.3, 0.64, 0.03]], SKIRT, SKIRT),
      hull([[1.4, 0.82, 0.78, 3.32, 3.56, 0.06], [4.3, 0.82, 0.78, 3.32, 3.56, 0.06]], [0.5, 0.5, 0.52], [0.36, 0.36, 0.38]),
      hull([[-4.95, 0.014, 0.014, 0.48, 2.62, 0.004], [-3.85, 0.014, 0.014, 0.48, 2.62, 0.004]], DOORT, GLASS, 1.262), hull([[-0.35, 0.014, 0.014, 0.48, 2.62, 0.004], [0.95, 0.014, 0.014, 0.48, 2.62, 0.004]], DOORT, GLASS, 1.262),
      hull([[-5.62, 0.05, 0.05, 2.25, 2.62, 0.02], [-5.5, 0.05, 0.05, 2.25, 2.62, 0.02]], DARK, DARK, 1.42), hull([[-5.62, 0.05, 0.05, 2.25, 2.62, 0.02], [-5.5, 0.05, 0.05, 2.25, 2.62, 0.02]], DARK, DARK, -1.42)
    ]), paintMat(), busN, true);
    // lit windows: warm interior, pillars between panes, the tops of seat backs along the bottom
    var winTex = k.canvasTex(512, 64, function (g, w, h) {
      var gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#fff3d6'); gr.addColorStop(0.5, '#f4cf8e'); gr.addColorStop(1, '#c99a5c');
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
      g.fillStyle = 'rgba(60,40,30,0.55)'; for (var x = 8; x < w; x += 22) g.fillRect(x, h * 0.72, 14, h * 0.28);
      g.fillStyle = 'rgba(44,28,18,0.8)'; for (x = 8; x < w; x += 22) if ((x * 7) % 5 < 2) { g.beginPath(); g.arc(x + 7, h * 0.52, 6.5, 0, 7); g.fill(); g.fillRect(x, h * 0.6, 14, h * 0.14); } // riders
      g.fillStyle = '#1b1c24'; for (x = 0; x < w; x += 64) g.fillRect(x, 0, 7, h);
      g.fillRect(0, 0, w, 4); g.fillRect(0, h - 4, w, 4);
    });
    var wm = new T.MeshBasicMaterial({ map: winTex }); wm.userData.own = true;
    winM = im(new T.PlaneGeometry(1, 1), fadeable(wm), busN * 4);
    // the destination board carries the operator's name and nothing else
    var boardTex = k.canvasTex(512, 96, function (g, w, h) {
      g.fillStyle = '#0b0a08'; g.fillRect(0, 0, w, h);
      var size = 64; g.font = '700 ' + size + 'px "Trebuchet MS", sans-serif';
      var tw = g.measureText(op.n).width; if (tw > w - 40) { size = Math.floor(size * (w - 40) / tw); g.font = '700 ' + size + 'px "Trebuchet MS", sans-serif'; }
      g.fillStyle = '#ffb637'; g.shadowColor = '#ff9a1a'; g.shadowBlur = 10; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(op.n, w / 2, h / 2 + 3);
    });
    var bdm = new T.MeshBasicMaterial({ map: boardTex }); bdm.userData.own = true;
    boardM = im(new T.PlaneGeometry(1, 1), fadeable(bdm), busN * 3);
  }

  // the light: one glow point per lamp (head x2, tail x2, indicator x2), and light thrown on the road
  var PN = N * 6, pPos = new Float32Array(PN * 3), pCol = new Float32Array(PN * 3);
  var pg = new T.BufferGeometry(); pg.setAttribute('position', new T.BufferAttribute(pPos, 3)); pg.setAttribute('color', new T.BufferAttribute(pCol, 3));
  var pts = new T.Points(pg, new T.PointsMaterial({ map: k.glowTex, vertexColors: true, size: 1.5, transparent: true, blending: T.AdditiveBlending, depthWrite: false }));
  pts.frustumCulled = false; G.add(pts);
  var poolMat = new T.MeshBasicMaterial({ map: k.glowTex, color: 0xffffff, transparent: true, blending: T.AdditiveBlending, depthWrite: false });
  var poolM = new T.InstancedMesh(new T.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), poolMat, N * 2);
  poolM.frustumCulled = false; poolM.setColorAt(0, C.set(0)); for (i = 0; i < N * 2; i++) poolM.setMatrixAt(i, ZERO); G.add(poolM);

  // ---------- bus stops: a kerb on each side, clear of parked cars and landmark frontage ----------
  var KERB = 2.45; // how far a bus pulls over from the lane centre: its outer edge stays inside the road
  if (op) {
    var spots = k.carSpots || [];
    [[0, 0.36], [1, 0.62]].forEach(function (d) {
      var lane = lanes[d[0]], s = lane.side, best = null;
      for (var tries = 0; tries < 40 && best == null; tries++) {
        var zw = 10 - (10 - k.gz) * d[1] + (tries % 2 ? 1 : -1) * Math.ceil(tries / 2) * 2.5;
        var clear = !spots.some(function (c) { return c[0] === s && Math.abs(c[1] - zw) < 9.5; }) && !(k.held && k.held(s, zw - 7, zw + 7));
        if (clear) best = zw;
      }
      if (best == null) return;
      var zl = loc(best);
      lane.stops.push(lane.side > 0 ? zTop - zl : zl - zBot);
      lane.stopZ = zl;
    });
    // the stop: a pole at the kerb with a lit flag bearing the operator's name, and a painted bay on the road
    var parts = [], flags = [];
    lanes.forEach(function (lane) {
      if (lane.stopZ == null) return;
      var s = lane.side, zl = lane.stopZ, pz = zl - s * 4.2; // pole near where the front door stops
      var lamps = k.lampSpots || [];
      while (lamps.some(function (l) { return l[0] * s > 0 && Math.abs(loc(l[1]) - pz) < 1.4; })) pz -= s * 1.5;
      parts.push([s * (ROAD + 0.75), 1.45, pz, 0.08, 2.9, 0.08, [220, 0.05, 0.35]]);
      parts.push([s * (ROAD - 0.12), 0.012, zl, 0.16, 0.02, 12.5, [48, 0.55, 0.55]]);
      parts.push([s * (ROAD - 2.95), 0.012, zl, 0.16, 0.02, 12.5, [48, 0.55, 0.55]]);
      parts.push([s * (ROAD - 1.53), 0.012, zl - 6.2, 2.9, 0.02, 0.16, [48, 0.55, 0.55]]);
      parts.push([s * (ROAD - 1.53), 0.012, zl + 6.2, 2.9, 0.02, 0.16, [48, 0.55, 0.55]]);
      flags.push([s * (ROAD + 0.75), 2.6, pz]);
    });
    if (parts.length) {
      var O = new T.Object3D(), pm = new T.InstancedMesh(new T.BoxGeometry(1, 1, 1), new T.MeshLambertMaterial({ color: 0xffffff }), parts.length);
      parts.forEach(function (p, j) { O.position.set(p[0], p[1], p[2]); O.scale.set(p[3], p[4], p[5]); O.updateMatrix(); pm.setMatrixAt(j, O.matrix); pm.setColorAt(j, C.setHSL(p[6][0] / 360, p[6][1], p[6][2])); });
      pm.frustumCulled = false; G.add(pm);
      var fm = new T.MeshBasicMaterial({ map: boardTex, side: T.DoubleSide }), fl = new T.InstancedMesh(new T.PlaneGeometry(0.9, 0.17), fm, flags.length);
      flags.forEach(function (f, j) { O.position.set(f[0], f[1], f[2]); O.scale.set(1, 1, 1); O.rotation.set(0, 0, 0); O.updateMatrix(); fl.setMatrixAt(j, O.matrix); });
      fl.frustumCulled = false; G.add(fl);
    }
  }

  var dbg = null;
  // where the stops are, for the street module (it runs after this one): [[side, world z]]
  k.busStops = lanes.filter(function (l) { return l.stopZ != null; }).map(function (l) { return [l.side, 10 + l.stopZ * cosT]; });
  if (typeof window !== 'undefined' && window.WV_DEBUG) window.WV_TRAFFIC = dbg = { V: V, lanes: lanes, laneLen: laneLen, zTop: zTop, zBot: zBot, every: every, dens: dens, op: op && op.n };

  // ---------- the simulation ----------
  var A = 1.5, B = 2.6, S0 = 2.2, TH = rain ? 1.6 : 1.15;
  function idm(v, v0, gap, dv) {
    var ss = S0 + Math.max(0, v * TH + v * dv / (2 * Math.sqrt(A * B)));
    var s = Math.max(0.05, gap);
    return A * (1 - Math.pow(v / v0, 4) - (ss / s) * (ss / s));
  }
  function byU(p, q2) { return q2.u - p.u; }
  // is o in the lane for follower f? A bus at the kerb is not, except that once it signals to leave, traffic
  // that has not yet reached it holds back and lets it out
  function inLane(o, f) {
    if (!o.bus || o.lat < KERB - 0.12) return true;
    return o.st === 'dwell' && o.wait <= 0 && f.u < o.u - (TYPES.bus.l + TYPES[f.type].l) / 2 - 1;
  }
  var camL = new T.Vector3(), dirW = new T.Vector3(), tmp = new T.Vector3();
  var walkerX = 99, walkerZ = 0;
  function seen(lane, u) {
    // a spawn point is in plain view if it is near the camera and in front of it
    tmp.set(lane.side * LANE, 1, zOf(lane, u)); G.localToWorld(tmp);
    var dx = tmp.x - k.camera.position.x, dz = tmp.z - k.camera.position.z, d = Math.sqrt(dx * dx + dz * dz);
    if (d > 75) return false;
    k.camera.getWorldDirection(dirW);
    return (dx * dirW.x + dz * dirW.z) / Math.max(1e-3, d) > 0.2;
  }
  function spawn(lane, o, quiet) {
    var last = lane.list[lane.list.length - 1];
    var len = TYPES[o.type].l;
    if (last && last.u - TYPES[last.type].l / 2 - len / 2 < 5) return false;
    if (!quiet && seen(lane, FADE * 0.5)) return false;
    o.on = true; o.lane = lane; o.u = 0; o.lat = 0; o.latPrev = 0; o.st = 'run'; o.stopI = 0; o.wait = 0; o.dirty = true; o.pitch = 0; o.ph = R() * 6.28;
    o.v0 = vBase * TYPES[o.type].v * (0.88 + R() * 0.24);
    o.v = last ? Math.min(o.v0, last.v) : o.v0 * 0.9;
    if (o.chaos) { o.v0 = vBase * TYPES[o.type].v; o.v = Math.min(o.v, o.v0); bodyOf[o.type].setColorAt(o.i, C.set(0xffffff)); bodyOf[o.type].instanceColor.needsUpdate = true; }
    else if (!o.bus) {
      var c = COLORS[Math.floor(R() * COLORS.length)];
      bodyOf[o.type].setColorAt(o.i, C.setHSL(c[0] / 360, c[1], c[2] * (0.85 + R() * 0.3))); bodyOf[o.type].instanceColor.needsUpdate = true;
    }
    lane.list.push(o);
    if (o.chaos) chaosPlan(o);
    return true;
  }
  // ---------- the week's chaos cars ----------
  // Each is one row of the engine's Chaos_Cars for this street (k.H.chaos, from build.js). It drives the street
  // like anything else, up one side and back down the other, and stops where its row points: outside the business
  // it hit, beside the citizen it hit (wherever they are standing when it gets there), or part way down the
  // street when the row names the neighborhood. A garbage truck works its way down in short stops; a sweeper
  // crawls and does not stop. Traffic behind waits, as it would.
  var CH = V.filter(function (o) { return o.chaos; }), whoCache = {};
  function uOf(lane, zWorld) { var zl = loc(zWorld); return lane.side > 0 ? zTop - zl : zl - zBot; }
  function standing(id) { // the page's record for a citizen shown on this street (k.people is set once they are placed)
    if (whoCache[id] === undefined) { whoCache[id] = null; (k.people || []).forEach(function (q) { if (q.d && q.d.id === id) whoCache[id] = q; }); if (!k.people) whoCache[id] = undefined; }
    return whoCache[id] || null;
  }
  function chaosPlan(o) {
    var ev = o.chaos, ty = TYPES[o.type], stops = [], u, lot;
    o.follow = null; o.served = false; o.stopI = 0; o.wait = 0;
    if (ty.every) for (u = 34; u < laneLen - 30; u += ty.every) stops.push(u);
    else if (ty.dwell) {
      if (ev.b != null) lot = (LAY.parcels || []).filter(function (q) { return q.b === ev.b; })[0] || (LAY.places || []).filter(function (q) { return q.b === ev.b && q.z != null; })[0];
      if (lot) stops.push(uOf(o.lane, lot.z));
      else if (ev.p) o.follow = ev.p;
      else if (o.type === 'ice_cream_truck') stops.push(laneLen * 0.33, laneLen * 0.68);
      else stops.push(laneLen * (0.4 + R() * 0.2));
    }
    o.stops = stops.filter(function (q) { return q > o.u + 10 && q < laneLen - 22; }).sort(function (a, b) { return a - b; });
  }
  function placeChaos(o, lane, u0) { // set one down on the street as it is, clearing what stood there
    lane.list.slice().forEach(function (q) { if (q !== o && Math.abs(q.u - u0) < (TYPES[q.type].l + TYPES[o.type].l) / 2 + 7) retire(q); });
    if (o.on) retire(o);
    o.on = true; o.lane = lane; o.u = u0; o.lat = 0; o.latPrev = 0; o.st = 'run'; o.dirty = true; o.pitch = 0; o.ph = R() * 6.28;
    o.v0 = vBase * TYPES[o.type].v; o.v = o.v0 * 0.8; o.fade = smooth(0, FADE, u0) * smooth(0, FADE, laneLen - u0);
    bodyOf[o.type].setColorAt(o.i, C.set(0xffffff)); bodyOf[o.type].instanceColor.needsUpdate = true;
    lane.list.push(o); lane.list.sort(byU); chaosPlan(o); o.laneI = (lane === lanes[0] ? 1 : 0);
  }
  function free(bus) { for (var j = 0; j < V.length; j++) if (!V[j].on && V[j].bus === bus && !V[j].chaos) return V[j]; return null; }
  function retire(o) { o.on = false; o.dirty = true; var l = o.lane.list, j = l.indexOf(o); if (j >= 0) l.splice(j, 1); }

  function sim(dt, quiet) {
    var thin = k.quality() === 0 ? 1.5 : 1;
    CH.forEach(function (o) {
      if (o.on) return;
      o.next = (o.next || 0) - dt; if (o.next > 0) return;
      var ln = lanes[(o.laneI || 0) % 2]; o.type = o.chaos.v;
      if (spawn(ln, o, quiet)) o.laneI = (o.laneI || 0) + 1; else o.next = 1;
    });
    lanes.forEach(function (lane) {
      // arrivals
      lane.timer -= dt;
      if (lane.timer <= 0) {
        var o = free(false);
        if (o) { o.type = pickType(); if (spawn(lane, o, quiet)) lane.timer = every * thin * (0.35 + R() * 1.3); }
        else lane.timer = 0.5;
      }
      if (op) {
        lane.busTimer -= dt;
        if (lane.busTimer <= 0) { var b = free(true); if (b && spawn(lane, b, quiet)) lane.busTimer = 50 + R() * 30; else lane.busTimer = 1; }
      }
      // the walker standing in this lane is something to stop for
      var wu = null;
      if (Math.abs(walkerX - lane.side * LANE) < 1.7) wu = lane.side > 0 ? zTop - walkerZ : walkerZ - zBot;
      var list = lane.list; list.sort(byU);
      for (var j = 0; j < list.length; j++) {
        var o = list[j], len = TYPES[o.type].l, acc;
        // the nearest vehicle ahead that is in the lane
        var lead = null;
        for (var m = j - 1; m >= 0; m--) if (inLane(list[m], o)) { lead = list[m]; break; }
        acc = lead ? idm(o.v, o.v0, lead.u - o.u - (TYPES[lead.type].l + len) / 2, o.v - lead.v) : idm(o.v, o.v0, 1e4, 0);
        if (wu != null && wu > o.u) acc = Math.min(acc, idm(o.v, o.v0, wu - o.u - len / 2 - 1.2, o.v));
        if (o.bus) {
          var stop = lane.stops[o.stopI];
          if (o.st === 'run' && stop != null && stop - o.u < 40 && stop > o.u) o.st = 'in';
          if (o.st === 'in') {
            acc = Math.min(acc, idm(o.v, o.v0, stop - o.u + S0 + 0.05, o.v));
            o.lat = KERB * smooth(stop - 30, stop - 7, o.u);
            if (o.v < 0.08 && stop - o.u < 1.2) { o.st = 'dwell'; o.wait = 7 + R() * 4; }
          } else if (o.st === 'dwell') {
            acc = -9; o.wait -= dt;
            if (o.wait <= 0) {
              // pull out only into a gap: nothing in the lane beside or closing from behind
              var clear = true;
              for (m = 0; m < j; m++) { var c1 = list[m]; if (c1.u - o.u < (len + TYPES[c1.type].l) / 2 + 1.5) { clear = false; break; } }
              for (m = j + 1; m < list.length; m++) { var c2 = list[m]; if (c2.u > o.u - (len + TYPES[c2.type].l) / 2 - 1.5 - c2.v * 0.6) { clear = false; break; } }
              if (clear) { o.st = 'out'; o.outU = o.u; }
            }
          } else if (o.st === 'out') {
            o.lat = KERB * (1 - smooth(o.outU + 1, o.outU + 20, o.u));
            if (o.lat < 0.01) { o.lat = 0; o.st = 'run'; o.stopI++; }
          }
        }
        if (o.chaos) {
          var cst = o.stops[o.stopI], who = o.follow && !o.served ? standing(o.follow) : null;
          if (who) { cst = uOf(lane, who.z); if (cst < o.u - 1.5 || cst > laneLen - 20) { cst = null; o.served = true; } }
          if (cst != null) {
            if (cst > o.u - 0.6) {
              acc = Math.min(acc, idm(o.v, o.v0, cst - o.u + S0 + 0.05, o.v));
              if (o.v < 0.08 && cst - o.u < 1.6) { o.st = 'dwell'; o.wait += dt; acc = -9; if (o.wait >= TYPES[o.type].dwell) { o.wait = 0; o.st = 'run'; if (who) o.served = true; else o.stopI++; } }
            } else if (who) o.served = true; else o.stopI++;
          }
        }
        o.a = acc;
        o.v = Math.max(0, o.v + acc * dt); o.u += o.v * dt;
        o.fade = smooth(0, FADE, o.u) * smooth(0, FADE, laneLen - o.u);
        if (o.u >= laneLen) { retire(o); if (o.chaos) o.next = 5 + R() * 7; j--; }
      }
    });
  }

  // ---------- drawing ----------
  var EU = new T.Euler(), M = new T.Matrix4(), MB = new T.Matrix4(), MW = new T.Matrix4(), XA = new T.Vector3(1, 0, 0), P = new T.Vector3(), Q = new T.Quaternion(), S = new T.Vector3(), Y = new T.Vector3(0, 1, 0);
  var pI = 0;
  function part(mesh, idx, x, y, z, sx, sy, sz, fade) {
    M.compose(P.set(x, y, z), Q.identity(), S.set(sx, sy, sz)); M.premultiply(MB); mesh.setMatrixAt(idx, M);
    mesh.userData.fade.array[idx] = fade;
  }
  function wheel(idx, x, y, z, spin, wr, fade) {
    M.compose(P.set(x, y, z), Q.setFromAxisAngle(XA, spin), S.set(1, wr, wr)); M.premultiply(MW); wheelM.setMatrixAt(idx, M);
    wheelM.userData.fade.array[idx] = fade;
  }
  function plane(mesh, idx, x, y, z, ry, sx, sy, fade) {
    M.compose(P.set(x, y, z), Q.setFromAxisAngle(Y, ry), S.set(sx, sy, 1)); M.premultiply(MB); mesh.setMatrixAt(idx, M);
    mesh.userData.fade.array[idx] = fade;
  }
  function glowAt(x, y, z, c, f) {
    P.set(x, y, z).applyMatrix4(MB); pPos[pI * 3] = P.x; pPos[pI * 3 + 1] = P.y; pPos[pI * 3 + 2] = P.z;
    pCol[pI * 3] = c.r * f; pCol[pI * 3 + 1] = c.g * f; pCol[pI * 3 + 2] = c.b * f; pI++;
  }
  function pool(idx, x, z, sx, sz, c, f) {
    if (f <= 0.001) { poolM.setMatrixAt(idx, ZERO); return; }
    M.compose(P.set(x, 0.035, z), Q.identity(), S.set(sx, 1, sz)); M.premultiply(MW); poolM.setMatrixAt(idx, M);
    poolM.setColorAt(idx, C.copy(c).multiplyScalar(f));
  }
  var AMBER = new T.Color(1, 0.55, 0.06), BLUE = new T.Color(0.2, 0.42, 1), NONE = new T.Color(0, 0, 0), WARM = new T.Color(0xffe2b0), RED = new T.Color(0xff2a18);
  function hide(o) {
    var j, n = o.i;
    for (var ty in bodyOf) bodyOf[ty].setMatrixAt(n, ZERO);
    if (o.chaos) o.chaos.on = false;
    for (j = 0; j < 4; j++) { wheelM.setMatrixAt(n * 4 + j, ZERO); lampM.setMatrixAt(n * 4 + j, ZERO); }
    poolM.setMatrixAt(n * 2, ZERO); poolM.setMatrixAt(n * 2 + 1, ZERO);
    if (o.bus) { busM.setMatrixAt(o.bi, ZERO); for (j = 0; j < 4; j++) winM.setMatrixAt(o.bi * 4 + j, ZERO); for (j = 0; j < 3; j++) boardM.setMatrixAt(o.bi * 3 + j, ZERO); }
  }
  function draw(t) {
    var showPools = k.quality() > 0;
    poolM.visible = showPools;
    for (var bt in bodyOf) bodyOf[bt].castShadow = k.quality() > 1;
    pI = 0;
    k.camera.getWorldPosition(camL); G.worldToLocal(camL);
    for (var n = 0; n < V.length; n++) {
      var o = V[n];
      if (!o.on) { if (o.dirty) { hide(o); o.dirty = false; } continue; }
      o.dirty = true;
      var lane = o.lane, s = lane.side, ty = TYPES[o.type], z = zOf(lane, o.u), x = s * (LANE + o.lat), f = o.fade;
      // a slight turn of the nose while the bus moves across to the kerb and back
      var dl = o.lat - o.latPrev; o.latPrev = o.lat;
      var steer = o.v > 0.05 ? -Math.atan2(dl, o.v * 0.016 + 1e-4) * 0.6 : 0;
      o.yaw += (Math.max(-0.12, Math.min(0.12, steer)) - o.yaw) * 0.15;
      MW.makeRotationY((s > 0 ? 0 : Math.PI) + o.yaw); MW.setPosition(x, 0, z);
      var hl = ty.l / 2, hw = ty.w / 2, ly = ty.ny, lt = ty.ty, wr = ty.wr, wy = 0.33 * wr;
      var braking = o.a < -0.6 || o.v < 0.3;
      // the body rides on its springs: the nose dips under braking and lifts pulling away, and it stirs on the road
      var soft = o.bus || o.type === 'truck' ? 0.5 : 1;
      o.pitch = (o.pitch || 0) + (Math.max(-0.03, Math.min(0.022, o.a * 0.011)) * soft - (o.pitch || 0)) * 0.12;
      var heave = Math.sin(o.u * 0.9 + (o.ph || 0)) * 0.012 * Math.min(1, o.v / 5) * soft;
      o.kneel = (o.kneel || 0) + ((o.bus && o.st === 'dwell' ? 1 : 0) - (o.kneel || 0)) * 0.05; // a bus leans to the kerb while it stands at its stop
      MB.makeRotationFromEuler(EU.set(o.pitch + heave * 0.25, 0, -0.024 * o.kneel)); MB.setPosition(0, heave - 0.03 * o.kneel, 0); MB.premultiply(MW);
      if (!o.bus) {
        part(bodyOf[o.type], o.i, 0, 0, 0, 1, 1, 1, f);
      } else {
        part(busM, o.bi, 0, 0, 0, 1, 1, 1, f);
        var wl = ty.l - 2.4;
        plane(winM, o.bi * 4, hw + 0.012, 2.05, 0.35, Math.PI / 2, wl, 1.05, f);
        plane(winM, o.bi * 4 + 1, -hw - 0.012, 2.05, 0.35, -Math.PI / 2, wl, 1.05, f);
        plane(winM, o.bi * 4 + 2, 0, 1.95, -hl - 0.012, Math.PI, ty.w - 0.25, 1.35, f);
        plane(winM, o.bi * 4 + 3, 0, 2.2, hl + 0.012, 0, ty.w - 0.5, 0.75, f);
        plane(boardM, o.bi * 3, 0, 2.95, -hl - 0.014, Math.PI, ty.w - 0.4, 0.34, f);
        plane(boardM, o.bi * 3 + 1, 0, 2.85, hl + 0.014, 0, ty.w - 0.7, 0.28, f);
        plane(boardM, o.bi * 3 + 2, hw + 0.014, 2.85, -hl + 1.9, Math.PI / 2, 2.2, 0.32, f);
      }
      // wheels stay on the road and turn with the distance covered
      var spin = -o.u / wy, wx = hw - (o.bus ? 0.12 : 0.1); // a bus's wheels sit in its side; a car's stand a finger proud, in the dark of their arches
      wheel(o.i * 4, wx, wy, -ty.ax[0], spin, wr, f); wheel(o.i * 4 + 1, -wx, wy, -ty.ax[0], spin, wr, f);
      wheel(o.i * 4 + 2, wx, wy, ty.ax[1], spin, wr, f); wheel(o.i * 4 + 3, -wx, wy, ty.ax[1], spin, wr, f);
      // lamps
      var lx = ty.lx, tc = braking ? BRAKE : TAIL;
      part(lampM, o.i * 4, lx, ly, -hl - 0.02, 0.36, 0.17, 0.05, f); lampM.setColorAt(o.i * 4, HEAD);
      part(lampM, o.i * 4 + 1, -lx, ly, -hl - 0.02, 0.36, 0.17, 0.05, f); lampM.setColorAt(o.i * 4 + 1, HEAD);
      part(lampM, o.i * 4 + 2, lx, lt, hl + 0.02, 0.3, 0.16, 0.05, f); lampM.setColorAt(o.i * 4 + 2, tc);
      part(lampM, o.i * 4 + 3, -lx, lt, hl + 0.02, 0.3, 0.16, 0.05, f); lampM.setColorAt(o.i * 4 + 3, tc);
      // glows, brighter the more squarely a lamp faces the camera
      var fwdX = -MW.elements[8], fwdZ = -MW.elements[10];
      var cx = camL.x - x, cz = camL.z - z, cd = Math.sqrt(cx * cx + cz * cz) || 1, face = (cx * fwdX + cz * fwdZ) / cd;
      var fh = smooth(-0.25, 0.55, face) * f, ft = smooth(-0.25, 0.55, -face) * f * (braking ? 1 : 0.6);
      glowAt(lx, ly, -hl - 0.1, HEAD, fh); glowAt(-lx, ly, -hl - 0.1, HEAD, fh);
      glowAt(lx, lt, hl + 0.1, RED, ft); glowAt(-lx, lt, hl + 0.1, RED, ft);
      // indicator: kerb side while a bus pulls in or waits, road side while it pulls out
      if (o.chaos) {
        // its own lights: red and blue turn about, an amber lamp turning, hazards while it is stopped, a lit hatch
        var fl = ty.flash, ph2 = (t * 2.4 + (o.ph || 0)) % 1, stopd = o.st === 'dwell';
        if (fl === 'rb') { glowAt(-0.34, ty.bar[0] + 0.14, ty.bar[1], RED, (ph2 < 0.5 ? 2.2 : 0.1) * f); glowAt(0.34, ty.bar[0] + 0.14, ty.bar[1], BLUE, (ph2 < 0.5 ? 0.1 : 2.6) * f); }
        else if (fl === 'amber') { glowAt(0, ty.bar[0] + 0.14, ty.bar[1], AMBER, (0.35 + 0.9 * Math.pow(0.5 + 0.5 * Math.sin(t * 7 + (o.ph || 0)), 3)) * f); glowAt(0, 0, 0, NONE, 0); }
        else if (fl === 'serve') { glowAt(hw + 0.12, 1.85, 0.8, WARM, (stopd ? 1.3 : 0.7) * f); glowAt(0, 3.25, 0.6, WARM, 0.35 * f); }
        else { var hz = stopd && (t % 0.9) < 0.45 ? 1 : 0; glowAt(hw + 0.02, ly + 0.1, -hl + 0.2, hz ? AMBER : NONE, hz * f); glowAt(hw + 0.02, ly + 0.1, hl - 0.2, hz ? AMBER : NONE, hz * f); }
        tmp.set(x, ty.top, z); G.localToWorld(tmp); o.chaos.x = tmp.x; o.chaos.y = tmp.y; o.chaos.z = tmp.z; o.chaos.on = f > 0.3; o.chaos.stopped = stopd; o.chaos.side = s;
      } else {
      var ind = o.bus && (o.st === 'in' || o.st === 'dwell' || o.st === 'out') && (t % 0.8) < 0.42 ? 1 : 0, isd = o.st === 'out' || (o.st === 'dwell' && o.wait <= 1.5) ? -1 : 1;
      glowAt(isd * (hw + 0.02), ly + 0.1, -hl + 0.2, ind ? AMBER : NONE, ind * f);
      glowAt(isd * (hw + 0.02), ly + 0.1, hl - 0.2, ind ? AMBER : NONE, ind * f);
      }
      // light on the road: a pool ahead of the headlights; on a wet road a long streak each way
      if (showPools) {
        if (rain) { pool(o.i * 2, 0, -hl - 8, ty.w * 0.6, 16, WARM, 0.75 * f); pool(o.i * 2 + 1, 0, hl + 4.5, ty.w * 0.5, 9, RED, 0.6 * f * (braking ? 1.4 : 1)); }
        else { pool(o.i * 2, 0, -hl - 4.2, ty.w * 1.45, 8, WARM, 0.2 * f); poolM.setMatrixAt(o.i * 2 + 1, ZERO); }
        // an emergency vehicle throws its lights on the road round it, red then blue; a working lamp throws amber
        if (o.chaos && ty.flash === 'rb') pool(o.i * 2 + 1, 0, ty.bar[1], 13, 13, (t * 2.4 + (o.ph || 0)) % 1 < 0.5 ? RED : BLUE, 0.6 * f);
        else if (o.chaos && ty.flash === 'amber') pool(o.i * 2 + 1, 0, ty.bar[1], 9, 9, AMBER, 0.3 * Math.pow(0.5 + 0.5 * Math.sin(t * 7 + (o.ph || 0)), 3) * f);
      }
    }
    for (; pI < PN; pI++) { pCol[pI * 3] = pCol[pI * 3 + 1] = pCol[pI * 3 + 2] = 0; }
    pg.attributes.position.needsUpdate = true; pg.attributes.color.needsUpdate = true;
    Object.keys(bodyOf).map(function (ty) { return bodyOf[ty]; }).concat([wheelM, lampM, busM, winM, boardM]).forEach(function (m) { if (!m) return; m.instanceMatrix.needsUpdate = true; m.userData.fade.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; });
    poolM.instanceMatrix.needsUpdate = true; if (poolM.instanceColor) poolM.instanceColor.needsUpdate = true;
  }

  // ---------- parked cars: the same shapes at the kerb, nose the way their side of the road runs ----------
  PARK.forEach(function (c, j) {
    var ty = TYPES[c.type], mesh = bodyOf[c.type], bi = N + c.slot - 1, wi = (N + j) * 4, hw = ty.w / 2, wy = 0.33 * ty.wr, cc = COLORS[Math.floor(R() * COLORS.length)];
    MW.makeRotationY(c.s > 0 ? 0 : Math.PI); MW.setPosition(c.s * (ROAD - 1.05 + (R() - 0.5) * 0.16), 0, loc(c.z)); MB.copy(MW);
    part(mesh, bi, 0, 0, 0, 1, 1, 1, 1); mesh.setColorAt(bi, C.setHSL(cc[0] / 360, cc[1], cc[2] * (0.85 + R() * 0.3)));
    wheel(wi, hw - 0.1, wy, -ty.ax[0], R() * 6, ty.wr, 1); wheel(wi + 1, -hw + 0.1, wy, -ty.ax[0], R() * 6, ty.wr, 1);
    wheel(wi + 2, hw - 0.1, wy, ty.ax[1], R() * 6, ty.wr, 1); wheel(wi + 3, -hw + 0.1, wy, ty.ax[1], R() * 6, ty.wr, 1);
  });

  // ---------- running it ----------
  var simT = null;
  function insertBus(lane, u0) {
    var b = free(true); if (!b) return;
    lane.list.slice().forEach(function (o) { if (Math.abs(o.u - u0) < 14) retire(o); });
    b.type = 'bus'; b.on = true; b.lane = lane; b.u = u0; b.lat = 0; b.latPrev = 0; b.st = 'run'; b.stopI = 0; b.dirty = true;
    b.v0 = vBase * TYPES.bus.v * (0.92 + R() * 0.12); b.v = b.v0 * 0.8; b.fade = smooth(0, FADE, u0);
    lane.list.push(b); lane.list.sort(byU); lane.busTimer = 55 + R() * 25;
  }
  k.ticks.push(function (t, dt, cam) {
    if (cam && cam.walking) { tmp.set(cam.x, 0, cam.z); G.worldToLocal(tmp); walkerX = tmp.x; walkerZ = tmp.z; } else walkerX = 99;
    if (simT == null) {
      // fill the street as if traffic had been running a while
      var w, late = Math.min(300, Math.max(0, t || 0));
      lanes.forEach(function (lane) { lane.busTimer = 1e9; });
      for (w = 0; w < laneLen / vBase + 12; w += 0.1) sim(0.1, true);
      // the first bus starts just behind the camera, so it overtakes the flight and is caught again at its stop;
      // the other comes up from the far end toward its stop
      if (op) { insertBus(lanes[0], 6); insertBus(lanes[1], 0); }
      // the week's chaos cars: the first a little ahead of where the flight starts, the next coming the other way
      CH.forEach(function (o, j) { var ln = lanes[j % 2]; placeChaos(o, ln, Math.min(laneLen - 40, j % 2 ? laneLen - 110 - j * 16 : 50 + j * 16)); });
      // and on, if the clock starts late (look-tests with --t0)
      for (w = 0; w < late; w += 0.1) sim(0.1, true);
      simT = late;
    }
    // own clock from dt (never backwards, never a jump), so a stalled or rewound page clock can't break it
    var step = Math.min(0.1, Math.max(0, dt || 0));
    if (step > 0) { sim(step, false); simT += step; }
    if (dbg) {
      dbg.t = t; dbg.simT = simT; dbg.ticks = (dbg.ticks || 0) + 1;
      var el = document.getElementById('wv-traffic') || document.body.appendChild(Object.assign(document.createElement('pre'), { id: 'wv-traffic', hidden: true }));
      el.textContent = JSON.stringify({ t: t, simT: +simT.toFixed(2), ticks: dbg.ticks, dens: +dens.toFixed(3), every: +every.toFixed(2), laneLen: Math.round(laneLen), stops: lanes.map(function (l) { return l.stops.map(Math.round); }), lanes: lanes.map(function (l) { return l.list.map(function (o) { return (o.bus ? 'BUS:' + o.st + ':' : o.type[0]) + Math.round(o.u) + '@' + o.v.toFixed(1) + (o.lat ? '/' + o.lat.toFixed(1) : ''); }).join(' '); }) });
    }
    draw(simT);
  });
};
LIFE.traffic.parks = true; // this file draws the parked cars too (the page keeps plain ones for a build without it)

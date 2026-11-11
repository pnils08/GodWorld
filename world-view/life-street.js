// Small street life: windows that live, neon, steam and smoke, things in the sky, moths at the lamps, rain on
// the road, motion lights and shop doors, and one cat. LIFE.street(kit) is called once per place.
// Nearly all motion runs on the GPU from one clock uniform; the tick moves only the aircraft, the meteor, the
// fog banks, the porch lights and the cat. Draw calls: at most 13 per place, most places 8-10.
// Nothing here is sim data: which windows switch and when is seeded by the neighborhood name; how busy the
// windows are, whether there is neon, steam or chimney smoke, is read off the place's hoods.js entry.
(function () {
  // the page's own seeded random and wall layout, copied so a window here lands on a window in the wall texture
  function hash(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rng(seed) { var a = seed >>> 0; return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  var WALLS = { brick: { n: 2, win: [30, 38], tile: [6, 7] }, stucco: { n: 3, win: [20, 24], tile: [7, 8] }, concrete: { n: 4, win: [18, 18], tile: [8, 9] }, glass: { n: 4, win: [27, 27], tile: [8, 9] } };
  var CELLS = {};
  function cellsOf(kind, lit) { // which cells of the wall texture are lit, exactly as the page's wallPair draws them
    var key = kind + lit; if (CELLS[key]) return CELLS[key];
    var W = WALLS[kind], r = rng(hash(key)), c = [];
    for (var i = 0; i < W.n * W.n; i++) c.push(r() < lit ? 0.5 + r() * 0.5 : 0);
    return (CELLS[key] = c);
  }

  // ---------- geometry batches: many quads or points in one draw ----------
  function batch(attrs) { var b = { pos: [], uv: [], idx: [], at: {}, sz: attrs, n: 0 }; for (var a in attrs) b.at[a] = []; return b; }
  function quad(b, P, vals) { // P: four corners [x,y,z]; vals[name]: one value set for all four, or four sets
    for (var i = 0; i < 4; i++) {
      b.pos.push(P[i][0], P[i][1], P[i][2]);
      for (var a in b.sz) { var v = vals[a], n = b.sz[a], off = v.length === n * 4 ? i * n : 0; for (var j = 0; j < n; j++) b.at[a].push(v[off + j]); }
    }
    b.uv.push(0, 0, 1, 0, 1, 1, 0, 1);
    b.idx.push(b.n, b.n + 1, b.n + 2, b.n, b.n + 2, b.n + 3); b.n += 4;
  }
  function point(b, p, vals) { b.pos.push(p[0], p[1], p[2]); for (var a in b.sz) for (var j = 0; j < b.sz[a]; j++) b.at[a].push(vals[a][j]); b.n++; }
  function geoOf(T, b, points) {
    var g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(b.pos, 3));
    if (!points) { g.setAttribute('uv', new T.Float32BufferAttribute(b.uv, 2)); g.setIndex(b.idx); }
    for (var a in b.sz) g.setAttribute(a, new T.Float32BufferAttribute(b.at[a], b.sz[a]));
    return g;
  }

  // ---------- shader pieces ----------
  var HASH = 'float h1(float x){ return fract(sin(x * 12.9898 + 1.7) * 43758.5453); }\n';
  var FOG_F = '#ifdef USE_FOG\nuniform vec3 fogColor; uniform float fogDensity;\n#endif\nvarying float vD;\n' +
    'float fogF(){\n#ifdef USE_FOG\n return 1.0 - exp(-fogDensity * fogDensity * vD * vD);\n#else\n return 0.0;\n#endif\n}\n' +
    'vec3 fogMix(vec3 c){\n#ifdef USE_FOG\n return mix(c, fogColor, fogF());\n#else\n return c;\n#endif\n}\n';

  // ---------- windows ----------
  var WIN_VS = HASH +
    'attribute vec4 wa; attribute vec4 wg; attribute vec3 wc; uniform float t;\n' +
    'varying vec2 vU; varying vec3 vC; varying float vOn, vSx, vI, vOff, vAsp, vBl, vMode, vD;\n' +
    'void main(){\n' +
    ' float seed = wa.x, mode = wa.y, baked = wa.z, P = wg.x;\n' +
    ' float ph = t / P + seed * 5.0, e = floor(ph), loc = fract(ph) * P;\n' +
    ' float on = baked, I = 1.0, sx = -9.0;\n' +
    ' if (mode < 0.5) {\n' +            // a room: on or off for a while, now and then someone crosses it
    '  if (h1(e * 1.37 + seed * 91.0) < wg.y) on = 1.0 - baked;\n' +
    '  float Q = 9.0 + seed * 5.0, q = t / Q + seed * 3.1, sl = fract(q) * Q;\n' +
    '  if (on > 0.5 && sl < 4.2 && h1(floor(q) * 2.11 + seed * 57.0) < wg.z) { sx = sl / 4.2 * 1.7 - 0.35; if (h1(floor(q) + seed * 13.0) < 0.5) sx = 1.0 - sx; }\n' +
    ' } else if (mode < 1.5) {\n' +     // a television: blue, cutting between shots
    '  on = h1(e * 1.37 + seed * 91.0) < 0.85 ? 1.0 : baked;\n' +
    '  I = 0.5 + 0.38 * h1(floor(t * 2.6 + seed * 40.0)) + 0.1 * sin(t * 17.0 + seed * 20.0);\n' +
    ' } else {\n' +                    // an office floor: lights sweep on along the floor, later sweep off
    '  float lit = h1(e * 1.37 + seed * 91.0) < wg.y ? 1.0 : 0.0, d = wg.z * 0.2;\n' +
    '  on = lit * step(d, loc) * step(loc, P * 0.72 + d);\n' +
    ' }\n' +
    ' vU = uv; vC = wc; vOn = on; vSx = sx; vI = I; vOff = wa.w; vAsp = wg.w; vMode = mode; vBl = step(0.8, fract(seed * 7.31));\n' +
    ' vec4 mv = modelViewMatrix * vec4(position, 1.0); vD = -mv.z; gl_Position = projectionMatrix * mv;\n' +
    '}';
  var WIN_FS = FOG_F +
    'varying vec2 vU; varying vec3 vC; varying float vOn, vSx, vI, vOff, vAsp, vBl, vMode;\n' +
    'void main(){\n' +
    ' vec3 col;\n' +
    ' if (vOff > 2.5) {\n' +           // a house door
    '  col = vec3(0.075, 0.05, 0.035) * (0.8 + 0.2 * step(0.1, abs(vU.y - 0.55)));\n' +
    ' } else if (vOn < 0.5) {\n' +
    '  if (vOff < 0.5) discard;\n' +
    '  col = vec3(0.045, 0.05, 0.068) + vec3(0.02, 0.025, 0.04) * vU.y;\n' +
    ' } else {\n' +
    '  col = vC * vI * (0.86 + 0.14 * vU.y);\n' +
    '  if (vMode > 0.5 && vMode < 1.5) col *= 0.8 + 0.2 * smoothstep(0.0, 0.5, vU.y);\n' +
    '  if (vBl > 0.5 && vMode < 0.5) col *= 0.72 + 0.28 * step(0.32, fract(vU.y * 7.0));\n' +
    '  if (vSx > -5.0) {\n' +
    '   vec2 p = vec2((vU.x - vSx) * vAsp, vU.y);\n' +
    '   float head = length(p - vec2(0.0, 0.66)) - 0.12;\n' +
    '   float body = length((p - vec2(0.0, 0.06)) / vec2(0.27, 0.44)) - 1.0;\n' +
    '   col *= mix(0.16, 1.0, smoothstep(-0.01, 0.025, min(head, body * 0.3)));\n' +
    '  }\n' +
    ' }\n' +
    ' if (vOff > 1.5 && vOff < 2.5) {\n' + // a house window: frame and cross bars
    '  float ex = min(vU.x, 1.0 - vU.x) * vAsp, ey = min(vU.y, 1.0 - vU.y);\n' +
    '  if (min(ex, ey) < 0.07 || abs(vU.x - 0.5) * vAsp < 0.03 || abs(vU.y - 0.6) < 0.03) col = vec3(0.16, 0.15, 0.14);\n' +
    ' }\n' +
    ' gl_FragColor = vec4(fogMix(col), 1.0);\n' +
    '}';

  // ---------- neon tubes ----------
  var NEON_VS = HASH +
    'attribute float nq; attribute vec4 nn; attribute vec3 nc; uniform float t;\n' +
    'varying float vQ, vI, vD; varying vec3 vC;\n' +
    'void main(){\n' +
    ' float seed = nn.x, f = nn.y, mode = nn.z, tube = nn.w, I = 1.0;\n' +
    ' if (mode < 0.5) {\n' +           // steady, with a stutter now and then
    '  float e = floor(t / 7.0 + seed * 9.0), l = fract(t / 7.0 + seed * 9.0) * 7.0;\n' +
    '  if (h1(e + seed * 31.0) < 0.3 && l < 0.7) I = 0.15 + 0.85 * step(0.45, h1(floor(t * 24.0) + seed * 11.0));\n' +
    ' } else if (mode < 1.5) {\n' +    // a chase
    '  float d = fract(fract(t * 0.6 + seed) - f);\n' +
    '  I = 0.1 + 0.9 * smoothstep(0.4, 0.0, d);\n' +
    ' } else if (mode < 2.5) {\n' +    // one tube that buzzes and dies, then catches again
    '  if (tube > 0.5) { float P = 10.0 + seed * 7.0, l = fract(t / P + seed * 3.0) * P;\n' +
    '   if (l < 1.8) I = step(0.38, h1(floor(t * 28.0) + seed * 7.0)) * (0.55 + 0.45 * h1(floor(t * 28.0) + 3.0));\n' +
    '   else if (l < 5.5) I = 0.03; }\n' +
    ' } else {\n' +                    // two parts taking turns
    '  float on = step(0.5, fract(t * 0.55 + seed)); I = 0.07 + 0.93 * (tube > 0.5 ? on : 1.0 - on);\n' +
    ' }\n' +
    ' vQ = nq; vI = I; vC = nc;\n' +
    ' vec4 mv = modelViewMatrix * vec4(position, 1.0); vD = -mv.z; gl_Position = projectionMatrix * mv;\n' +
    '}';
  var NEON_FS = FOG_F +
    'varying float vQ, vI; varying vec3 vC;\n' +
    'void main(){\n' +
    ' float d = abs(vQ), core = smoothstep(0.3, 0.12, d), halo = exp(-d * d * 4.5) * (1.0 - d);\n' +
    ' vec3 col = (vC * (core * 1.05 + halo * 0.45) + vec3(core * 0.42)) * vI;\n' +
    ' gl_FragColor = vec4(col * (1.0 - fogF()), 1.0);\n' +
    '}';

  // ---------- puffs: grate steam, roof-vent vapour, chimney smoke ----------
  var PUFF_VS =
    'attribute vec4 pa; attribute vec3 pb; uniform float t; uniform float ps; uniform vec2 wind;\n' +
    'varying float vA, vD; varying vec3 vC;\n' +
    'void main(){\n' +
    ' float life = pa.z, age = fract(t / life + pa.x), tt = age * life;\n' +
    ' vec3 p = position + vec3(wind.x * tt + sin(age * 4.0 + pa.x * 20.0) * 0.22 * age, pb.x * tt, wind.y * tt + cos(age * 3.0 + pa.x * 17.0) * 0.18 * age);\n' +
    ' vec4 mv = modelViewMatrix * vec4(p, 1.0); vD = -mv.z;\n' +
    ' gl_PointSize = min(ps * pa.w * (0.35 + age * 1.25) / max(0.5, -mv.z), 240.0);\n' +
    ' vA = pb.y * pow(sin(3.14159 * age), 1.3) * smoothstep(1.2, 3.5, -mv.z);\n' +
    ' vC = pa.y < 1.5 ? vec3(0.8, 0.76, 0.72) : vec3(0.5, 0.5, 0.54);\n' +
    ' gl_Position = projectionMatrix * mv;\n' +
    '}';
  var PUFF_FS = FOG_F +
    'varying float vA; varying vec3 vC;\n' +
    'void main(){\n' +
    ' vec2 c = gl_PointCoord - 0.5; float r = length(c) * 2.0; if (r > 1.0) discard;\n' +
    ' float a = vA * pow(1.0 - r * r, 2.0) * (0.85 + 0.15 * sin(c.x * 9.0 + c.y * 7.0));\n' +
    ' gl_FragColor = vec4(fogMix(vC), a);\n' +
    '}';

  // ---------- moths at the lamp heads ----------
  var MOTH_VS =
    'attribute vec2 mm; uniform float t; uniform float ps; varying float vA, vD;\n' +
    'void main(){\n' +
    ' float s = mm.x, a = t * (2.0 + s * 3.0) + s * 40.0;\n' +
    ' vec3 o = vec3(cos(a) * mm.y, sin(a * 1.7 + s * 9.0) * 0.22 + sin(t * 0.9 + s * 5.0) * 0.14 - 0.12, sin(a * 1.3) * mm.y);\n' +
    ' o += 0.06 * vec3(sin(t * 23.0 + s * 70.0), cos(t * 19.0 + s * 50.0), sin(t * 29.0 + s * 30.0));\n' +
    ' vec4 mv = modelViewMatrix * vec4(position + o, 1.0); vD = -mv.z;\n' +
    ' gl_PointSize = max(1.6, ps * 0.055 / -mv.z);\n' +
    ' vA = (0.5 + 0.5 * sin(t * 38.0 + s * 90.0)) * smoothstep(42.0, 14.0, -mv.z);\n' +
    ' gl_Position = projectionMatrix * mv;\n' +
    '}';
  var MOTH_FS = 'varying float vA, vD;\nvoid main(){ float r = length(gl_PointCoord - 0.5) * 2.0; gl_FragColor = vec4(vec3(1.0, 0.88, 0.66) * vA * (1.0 - r), 1.0); }';

  // ---------- rain on the road: ripples that land somewhere new each time, and the gutters running ----------
  var WET_VS = HASH +
    'attribute vec4 ra; uniform float t; varying vec2 vU; varying float vAge, vK, vZ, vD;\n' +
    'void main(){\n' +
    ' float P = ra.y, ph = t / P + ra.x * 7.0, e = floor(ph);\n' +
    ' vec3 p = position;\n' +
    ' if (ra.z < 0.5) { p.x += (h1(e + ra.x * 31.0) - 0.5) * ra.w; p.z += (h1(e * 1.7 + ra.x * 17.0) - 0.5) * ra.w; }\n' +
    ' vU = uv * 2.0 - 1.0; vAge = fract(ph); vK = ra.z; vZ = position.z;\n' +
    ' vec4 mv = modelViewMatrix * vec4(p, 1.0); vD = -mv.z; gl_Position = projectionMatrix * mv;\n' +
    '}';
  var WET_FS = FOG_F +
    'uniform float t; varying vec2 vU; varying float vAge, vK, vZ;\n' +
    'void main(){\n' +
    ' float a;\n' +
    ' if (vK < 0.5) { float d = length(vU), r = vAge; a = (1.0 - r) * exp(-(d - r) * (d - r) * 300.0) * 0.4 + (1.0 - r) * (1.0 - r) * exp(-(d - r * 0.45) * (d - r * 0.45) * 400.0) * 0.25; }\n' +
    ' else { float z = vZ + vU.y * 2.0; float s = 0.5 + 0.5 * sin(z * 2.3 + t * 3.1 + sin(z * 0.6 + vU.x * 3.0) * 2.0); a = pow(s, 6.0) * (1.0 - abs(vU.x)) * 0.5 + 0.06; }\n' +
    ' gl_FragColor = vec4(vec3(0.55, 0.62, 0.75) * a * (1.0 - fogF()), 1.0);\n' +
    '}';

  // ---------- drips off the awnings in the rain ----------
  var DRIP_VS =
    'attribute vec3 dd; uniform float t; uniform float ps; varying float vA, vD;\n' +
    'void main(){\n' +
    ' float P = dd.y, a = fract(t / P + dd.x), hang = 0.6, drop = 0.0, sz = 0.03 + 0.02 * smoothstep(0.0, hang, a);\n' +
    ' if (a > hang) { float tt = (a - hang) * P; drop = 4.9 * tt * tt; sz = 0.045; }\n' +
    ' vec4 mv = modelViewMatrix * vec4(position - vec3(0.0, drop, 0.0), 1.0); vD = -mv.z;\n' +
    ' gl_PointSize = max(1.2, ps * sz / -mv.z);\n' +
    ' vA = step(drop, dd.z) * smoothstep(30.0, 8.0, -mv.z);\n' +
    ' gl_Position = projectionMatrix * mv;\n' +
    '}';
  var DRIP_FS = 'varying float vA, vD;\nvoid main(){ float r = length(gl_PointCoord - 0.5) * 2.0; gl_FragColor = vec4(vec3(1.0, 0.88, 0.7) * vA * (1.0 - r * r) * 0.8, 1.0); }';

  // ---------- light that comes and goes: motion lights, a shop door opening, a cat's eyes ----------
  // lw = [kind, seed, a, b]: kind 0 on from a to b (set by the tick); kind 1 a door on its own clock; kind 2 brightness a
  var ON_FN = HASH +
    'float onOf(vec4 w, float t){\n' +
    ' if (w.x < 0.5) return smoothstep(w.z, w.z + 0.25, t) * (1.0 - smoothstep(w.w, w.w + 1.2, t));\n' +
    ' if (w.x < 1.5) { float P = 13.0 + w.y * 22.0, l = fract(t / P + w.y * 3.0) * P; return smoothstep(0.0, 0.5, l) * (1.0 - smoothstep(2.6, 3.6, l)); }\n' +
    ' return w.z;\n' +
    '}\n';
  var POOL_VS = ON_FN +
    'attribute vec4 lw; attribute vec3 lc; uniform float t; varying vec2 vU; varying vec3 vC; varying float vD;\n' +
    'void main(){ vU = uv * 2.0 - 1.0; vC = lc * onOf(lw, t); vec4 mv = modelViewMatrix * vec4(position, 1.0); vD = -mv.z; gl_Position = projectionMatrix * mv; }';
  var POOL_FS = FOG_F +
    'varying vec2 vU; varying vec3 vC;\n' +
    'void main(){ float d = length(vU); float a = exp(-d * d * 3.2) * max(0.0, 1.0 - d); gl_FragColor = vec4(vC * a * (1.0 - fogF()), 1.0); }';
  var DYN_VS = ON_FN +
    'attribute vec4 lw; attribute vec3 lc; attribute float ls; uniform float t; uniform float ps; varying vec3 vC; varying float vD;\n' +
    'void main(){ vC = lc * onOf(lw, t); vec4 mv = modelViewMatrix * vec4(position, 1.0); vD = -mv.z; gl_PointSize = clamp(ps * ls / max(0.5, -mv.z), 2.5, 200.0); gl_Position = projectionMatrix * mv; }';
  var DYN_FS = FOG_F +
    'varying vec3 vC;\n' +
    'void main(){ float r = length(gl_PointCoord - 0.5) * 2.0; if (r > 1.0) discard; float a = pow(1.0 - r, 2.2); gl_FragColor = vec4(vC * a * (1.0 - fogF()), 1.0); }';

  LIFE.street = function (k) {
    var T = k.THREE, ST = k.ST || {}, LAY = k.LAY, H = k.H, WALK = k.WALK, ROAD = k.ROAD, LANE = k.LANE, WX = k.WX, yAt = k.yAt;
    if (!T || !LAY || !LAY.parcels || !k.root) return;
    var rr = rng(hash(H.name + '|street')), rt = rng(hash(H.name + '|life'));
    var sides = k.water ? [-k.water] : [-1, 1];
    var U = { t: { value: 0 }, ps: { value: 600 } };
    var heavy = []; // what is hidden when the device is struggling (quality 0)
    var col = new T.Color();
    function hsl(h, s, l) { col.setHSL(((h % 360) + 360) % 360 / 360, s, l); return [col.r, col.g, col.b]; }
    function shader(vs, fs, o) {
      o = o || {};
      var uni = T.UniformsUtils.merge([T.UniformsLib.fog]); uni.t = U.t; uni.ps = U.ps;
      for (var u in (o.uni || {})) uni[u] = o.uni[u];
      return new T.ShaderMaterial({ uniforms: uni, vertexShader: vs, fragmentShader: fs, fog: true, transparent: !o.solid, depthWrite: !!o.solid,
        blending: o.add ? T.AdditiveBlending : T.NormalBlending, side: T.DoubleSide, polygonOffset: !!o.offset, polygonOffsetFactor: -1, polygonOffsetUnits: -4 });
    }
    function add(obj, parent, isHeavy) { obj.frustumCulled = false; (parent || k.root).add(obj); if (isHeavy) heavy.push(obj); return obj; }
    function facade(X, zc, yc, w, h) { return [[X, yc - h / 2, zc - w / 2], [X, yc - h / 2, zc + w / 2], [X, yc + h / 2, zc + w / 2], [X, yc + h / 2, zc - w / 2]]; }

    // how this place lives, read off its hoods.js entry
    var lit = ST.lit != null ? ST.lit : 0.45, houses = ST.fill === 'house';
    var dense = !houses && ((ST.gap && ST.gap[1] <= 0.5) || (ST.h && ST.h[1] >= 30));
    var busy = lit >= 0.7 ? 2 : lit >= 0.45 ? 1 : 0;
    var P = {
      live: [0.3, 0.38, 0.5][busy],            // share of windows that change at all
      off: [0.24, 0.32, 0.4][busy],             // chance a lit room goes dark for a while
      per: [[55, 150], [32, 95], [18, 65]][busy], // seconds a room keeps its state
      tv: houses ? 0.14 : 0.05,
      sil: dense ? 0.3 : busy === 2 ? 0.2 : 0.12,
      office: 0.16
    };

    // ===== 1. windows: rooms going on and off, televisions, people crossing, office floors =====
    var WB = batch({ wa: 4, wg: 4, wc: 3 }), WARM = [[1, 0.835, 0.54], [1, 0.75, 0.42], [1, 0.906, 0.72]], GLASS = [[1, 0.886, 0.68], [0.81, 0.89, 1], [1, 0.945, 0.84]];
    function litCol(glass) { var c = (glass ? GLASS : WARM)[Math.floor(rr() * 3)], m = 0.55 + rr() * 0.4; return [c[0] * m, c[1] * m, c[2] * m]; }
    function period() { return P.per[0] + rr() * (P.per[1] - P.per[0]); }
    var houseList = [], shopList = [];
    LAY.parcels.forEach(function (p) {
      var s = p.s, y0 = yAt(p.z), i, j;
      if (p.k === 'h') {
        var hw = p.w - 2.5, X = s * (WALK + 2.5 - 0.04), pz = p.z + hw * 0.25;
        houseList.push({ p: p, s: s, z: pz, y0: y0, hw: hw });
        quad(WB, facade(X, pz, 1.0 + y0, 0.95, 2.0), { wa: [rr(), 0, 0, 3], wg: [99, 0, 0, 0.48], wc: [0, 0, 0] });
        var spots = [[p.z - hw * 0.07, 1.55], [p.z - hw * 0.31, 1.55]];
        if (p.h >= 4.6) spots.push([p.z - hw * 0.2, 3.55], [p.z + hw * 0.22, 3.55]);
        spots.forEach(function (q) {
          var seed = rr(), mode = rr() < P.tv ? 1 : 0, baked = rr() < p.lit ? 1 : 0;
          quad(WB, facade(X, q[0], q[1] + y0, 0.95, 1.15), { wa: [seed, mode, baked, 2], wg: [period(), baked ? P.off : P.off * p.lit / Math.max(0.2, 1 - p.lit), P.sil, 0.95 / 1.15], wc: mode ? [0.5, 0.66, 1.0] : litCol(false) });
        });
        return;
      }
      var W = WALLS[p.wall]; if (!W) return;
      if (p.b != null) shopList.push(p);
      var cells = cellsOf(p.wall, p.lit), n = W.n, ux = Math.max(1, Math.round(p.w / W.tile[0])), uy = Math.max(1, Math.round(p.h / W.tile[1]));
      var Tw = p.w / ux, Th = (p.h + 3) / uy, ww = W.win[0] / 128 * Tw * 1.06, wh = W.win[1] / 128 * Th * 1.06;
      var Xf = s * (WALK - 0.05), glass = p.wall === 'glass', office = glass && p.h >= 15, low = p.b != null ? 2.75 : 0.4;
      var fOn = P.off * p.lit / Math.max(0.2, 1 - p.lit), darkTower = office && lit <= 0.2;
      for (var tj = 0; tj < uy; tj++) for (var yi = 0; yi < n; yi++) {
        var yc = -3 + tj * Th + (1 - (yi + 0.5) / n) * Th;
        if (yc - wh / 2 < low || yc + wh / 2 > p.h - 0.15) continue;
        var isOffice = office && rr() < P.office, fseed = rr(), fper = 45 + rr() * 60, fcol = litCol(true), dir = rr() < 0.5;
        for (var tc = 0; tc < ux; tc++) for (var xi = 0; xi < n; xi++) {
          var a = (tc + (xi + 0.5) / n) / ux, zc = s > 0 ? p.z - p.w / 2 + a * p.w : p.z + p.w / 2 - a * p.w;
          var baked = cells[yi * n + xi] > 0 ? 1 : 0, ci = tc * n + xi;
          if (isOffice) {
            quad(WB, facade(Xf, zc, yc + y0, ww, wh), { wa: [fseed, 2, baked, baked], wg: [fper, 0.5, dir ? ci : ux * n - 1 - ci, ww / wh], wc: [fcol[0] * 0.95, fcol[1] * 0.98, fcol[2]] });
          } else if (darkTower) { // thinner after dark: most of the tower's lit rooms are out, a few come and go
            if (baked) quad(WB, facade(Xf, zc, yc + y0, ww, wh), { wa: [rr(), 0, 0, 1], wg: [period(), 0.2, 0, ww / wh], wc: litCol(true) });
          } else if (rr() < P.live) {
            var mode = !glass && rr() < P.tv ? 1 : 0;
            quad(WB, facade(Xf, zc, yc + y0, ww, wh), { wa: [rr(), mode, baked, baked], wg: [period(), baked ? P.off : fOn, glass ? 0 : P.sil, ww / wh], wc: mode ? [0.5, 0.66, 1.0] : litCol(glass) });
          }
        }
      }
    });
    if (WB.n) add(new T.Mesh(geoOf(T, WB), shader(WIN_VS, WIN_FS, { solid: true, offset: true })));

    // ===== 2. neon where the place has nightlife: no words, only tubes =====
    if (ST.neon > 0) {
      var NB = batch({ nq: 1, nn: 4, nc: 3 }), HUES = [320, 190, 45, 280, 0, 150, 205];
      var ring = function (out, cx, cy, r, tube) { for (var i = 0; i < 18; i++) { var a0 = i / 18 * 6.2832, a1 = (i + 1) / 18 * 6.2832; out.push([cx + Math.cos(a0) * r, cy + Math.sin(a0) * r, cx + Math.cos(a1) * r, cy + Math.sin(a1) * r, tube, i / 18]); } };
      var frame = function (out, w, h, tube) { var x = w / 2, y = h / 2; out.push([-x, -y, x, -y, tube, 0], [x, -y, x, y, tube, 0.25], [x, y, -x, y, tube, 0.5], [-x, y, -x, -y, tube, 0.75]); };
      var SHAPES = [
        function (w, h, o) { frame(o, w, h, 0); ring(o, 0, 0, Math.min(w, h) * 0.3, 1); return 3; },
        function (w, h, o) { for (var i = 0; i < 4; i++) { var cx = -w / 2 + (i + 0.5) * w / 4, c = w / 10; o.push([cx - c, h / 2, cx + c, 0, 0, i / 4], [cx + c, 0, cx - c, -h / 2, 0, i / 4]); } return 1; },
        function (w, h, o) { var r = Math.min(w, h) * 0.45; ring(o, 0, 0, r * 0.32, 0); for (var i = 0; i < 10; i++) { var a = i / 10 * 6.2832; o.push([Math.cos(a) * r * 0.45, Math.sin(a) * r * 0.45, Math.cos(a) * r, Math.sin(a) * r, 1, i / 10]); } return 2; },
        function (w, h, o) { for (var l = 0; l < 2; l++) for (var i = 0; i < 12; i++) { var x0 = -w / 2 + i / 12 * w, x1 = -w / 2 + (i + 1) / 12 * w, y = (l - 0.5) * h * 0.45; o.push([x0, y + Math.sin(i / 12 * 6.2832 * 1.5) * h * 0.18, x1, y + Math.sin((i + 1) / 12 * 6.2832 * 1.5) * h * 0.18, l, i / 12]); } return 1; },
        function (w, h, o) { var n = 6; for (var i = 0; i < n; i++) o.push([(i % 2 ? 1 : -1) * w * 0.18, -h / 2 + i / n * h, (i % 2 ? -1 : 1) * w * 0.18, -h / 2 + (i + 1) / n * h, 0, i / n]); return 0; },
        function (w, h, o) { frame(o, w, h, 0); o.push([0, h * 0.32, 0, -h * 0.3, 1, 0], [-w * 0.14, -h * 0.12, 0, -h * 0.3, 1, 0.5], [w * 0.14, -h * 0.12, 0, -h * 0.3, 1, 1]); return 2; }
      ];
      var pick = ST.neon >= 0.9 ? [0, 1, 1, 3, 3, 2, 5, 4] : ST.neon >= 0.5 ? [0, 2, 4, 4, 5, 1, 3] : [4, 4, 0, 2, 5];
      LAY.parcels.forEach(function (p) {
        if (p.k === 'h' || p.h < 6 || rr() > ST.neon * 0.6) return;
        var s = p.s, X = s * (WALK - 0.16), top = Math.min(p.h - 0.45, 8.8), base = 3.35;
        var sw = Math.min(p.w - 1.4, 2.0 + rr() * 1.8), sh = Math.min(top - base, 1.4 + rr() * 1.4); if (sh < 0.9 || sw < 1.2) return;
        var yc = base + sh / 2 + rr() * (top - base - sh) + yAt(p.z), zc = p.z + (rr() - 0.5) * (p.w - sw - 1.0);
        if (p.b != null) { var zb = p.z + p.w / 2 - 0.4; if (Math.abs(zc - zb) < sw / 2 + 0.5) zc = p.z - p.w / 2 + sw / 2 + 0.5; }
        var shape = pick[Math.floor(rr() * pick.length)], segs = [], mode = SHAPES[shape](sw, sh, segs), seed = rr();
        var hA = HUES[Math.floor(rr() * HUES.length)], hB = HUES[Math.floor(rr() * HUES.length)], cA = hsl(hA, 1, 0.56), cB = hsl(hB, 1, 0.6);
        var hwid = 0.42;
        segs.forEach(function (g) {
          var za = zc + g[0], ya = yc + g[1], zb2 = zc + g[2], yb = yc + g[3], dz = zb2 - za, dy = yb - ya, L = Math.sqrt(dz * dz + dy * dy) || 1;
          dz /= L; dy /= L; var e = hwid * 0.3, pz = -dy * hwid, py = dz * hwid;
          var A = [za - dz * e, ya - dy * e], B = [zb2 + dz * e, yb + dy * e];
          quad(NB, [[X, A[1] + py, A[0] + pz], [X, A[1] - py, A[0] - pz], [X, B[1] - py, B[0] - pz], [X, B[1] + py, B[0] + pz]],
            { nq: [1, -1, -1, 1], nn: [seed, g[5], mode, g[4]], nc: g[4] ? cB : cA });
        });
      });
      if (NB.n) add(new T.Mesh(geoOf(T, NB), shader(NEON_VS, NEON_FS, { add: true })));
    }

    // ===== 3. steam from grates and roof vents in dense places, chimney smoke over house streets =====
    var PB = batch({ pa: 4, pb: 3 }), wet = WX === 'rain' ? 1.4 : 1, chim = [];
    function emitter(x, y, z, kind, count) {
      var life = [3.2, 5, 6.5][kind], size = [2.0, 2.1, 1.4][kind], rise = [1.0, 0.75, 0.5][kind], alpha = [0.3, 0.22, 0.18][kind] * wet;
      for (var i = 0; i < count; i++) point(PB, [x + (rr() - 0.5) * 0.3, y, z + (rr() - 0.5) * 0.3], { pa: [i / count + rr() * 0.05, kind, life * (0.85 + rr() * 0.3), size * (0.8 + rr() * 0.4)], pb: [rise * (0.8 + rr() * 0.4), alpha, 0] });
    }
    if (dense) for (var gi = 0; gi < 4; gi++) { var gs = sides[gi % sides.length], gz0 = -6 - (gi + rr() * 0.7) / 4 * (k.L - 20); emitter(gs * (LANE + (rr() - 0.5) * 1.2), 0.05 + yAt(gz0), gz0, 0, 14); }
    var industrial = dense || ST.wall === 'brick' || (ST.set || []).indexOf('cranes') >= 0;
    LAY.parcels.forEach(function (p) {
      if (p.k === 'h') {
        if (rr() < 0.3) { var hw = p.w - 2.5, hx = p.s * (WALK + 2.5 + p.d / 2), cz = p.z + hw * 0.33 * (rr() < 0.5 ? 1 : -1); chim.push([hx, p.h + 1.45 + yAt(p.z), cz]); emitter(hx, p.h + 2.95 + yAt(p.z), cz, 2, 9); }
        return;
      }
      if (industrial && p.h >= 6 && rr() < 0.22) emitter(p.s * (WALK + p.d / 2 + (rr() - 0.5) * 2), p.h + 1.0 + yAt(p.z), p.z + (rr() - 0.5) * p.w * 0.5, 1, 10);
    });
    if (PB.n) {
      var wa = rr() * 6.2832, wm = 0.3 + rr() * 0.3;
      add(new T.Points(geoOf(T, PB, true), shader(PUFF_VS, PUFF_FS, { uni: { wind: { value: new T.Vector2(Math.cos(wa) * wm, Math.sin(wa) * wm) } } })), null, true);
    }
    if (chim.length) {
      var cm = new T.InstancedMesh(new T.BoxGeometry(0.5, 2.9, 0.5), k.flat([12, 0.3, 0.22]), chim.length), M = new T.Matrix4();
      chim.forEach(function (c, i) { M.makeTranslation(c[0], c[1], c[2]); cm.setMatrixAt(i, M); });
      k.root.add(cm);
    }

    // ===== 4. moths circling the lamp heads (not in rain) =====
    if (WX !== 'rain' && k.lampSpots && k.lampSpots.length) {
      var MB = batch({ mm: 2 });
      k.lampSpots.forEach(function (l) { var n = 2 + Math.floor(rr() * 3); for (var i = 0; i < n; i++) point(MB, [l[0], 4.45 + yAt(l[1]), l[1]], { mm: [rr(), 0.18 + rr() * 0.4] }); });
      add(new T.Points(geoOf(T, MB, true), shader(MOTH_VS, MOTH_FS, { add: true })), null, true);
    }

    // ===== 5. rain: ripples on the road and pavement, gutters running, drips off the awnings =====
    if (WX === 'rain') {
      var RB = batch({ ra: 4 }), cell = 1.6, z0 = 22, z1 = -k.L - 14;
      for (var rz = z0; rz > z1; rz -= cell) for (var rx = -WALK + cell / 2; rx < WALK; rx += cell) {
        if (k.water && rx * k.water > ROAD) continue;
        var py = Math.abs(rx) > ROAD + 0.2 ? 0.175 : 0.02;
        for (var rq = 0; rq < 3; rq++) { var rs = 0.13 + rr() * 0.14; quad(RB, [[rx - rs, py, rz - 10 - rs], [rx + rs, py, rz - 10 - rs], [rx + rs, py, rz - 10 + rs], [rx - rs, py, rz - 10 + rs]], { ra: [rr(), 0.6 + rr() * 0.7, 0, cell * 0.85] }); }
      }
      sides.concat(k.water ? [k.water] : []).forEach(function (s) {
        for (var gz = z0; gz > z1; gz -= 4) { var gx = s * (ROAD - 0.22); quad(RB, [[gx - 0.17, 0.025, gz - 10], [gx + 0.17, 0.025, gz - 10], [gx + 0.17, 0.025, gz - 14], [gx - 0.17, 0.025, gz - 14]], { ra: [0, 1, 1, 0] }); }
      });
      add(new T.Mesh(geoOf(T, RB), shader(WET_VS, WET_FS, { add: true })), k.ground || k.root, true);
      var DB = batch({ dd: 3 });
      shopList.forEach(function (p) {
        var x = p.s * (WALK - 1.25), y = 2.5 + yAt(p.z), n = Math.max(3, Math.round((p.w - 1.2) / 0.9));
        for (var i = 0; i < n; i++) point(DB, [x, y, p.z - (p.w - 1.2) / 2 + (i + 0.5) / n * (p.w - 1.2)], { dd: [rr(), 0.9 + rr() * 1.5, y - 0.16 - yAt(p.z)] });
      });
      if (DB.n) add(new T.Points(geoOf(T, DB, true), shader(DRIP_VS, DRIP_FS, { add: true })), null, true);
    }

    // ===== 6. motion lights on houses, shop doors opening, and the cat's eyes =====
    var LB = batch({ lw: 4, lc: 3 }), GB = batch({ lw: 4, lc: 3, ls: 1 }), porches = [];
    houseList.forEach(function (h) {
      if (rr() > 0.45) return;
      var x = h.s * (WALK + 1.3), z = h.z - 10;
      porches.push({ x: h.s * (WALK + 2.3), z: h.z, i: porches.length, on: -1, off: -1 });
      quad(LB, [[x - 1.6, 0.18, z - 1.8], [x + 1.6, 0.18, z - 1.8], [x + 1.6, 0.18, z + 1.8], [x - 1.6, 0.18, z + 1.8]], { lw: [0, 0, -9, -9], lc: [0.6, 0.46, 0.3] });
      point(GB, [h.s * (WALK + 2.42), 2.35 + h.y0, h.z], { lw: [0, 0, -9, -9], lc: [1, 0.86, 0.62], ls: [0.9] });
    });
    var porchN = porches.length;
    shopList.forEach(function (p) {
      if (rr() > 0.6) return;
      var zd = p.z + (rr() - 0.5) * Math.max(0, p.w - 3.2), x = p.s * (WALK - 1.2), seed = rr();
      quad(LB, [[x - 1.1, 0.18, zd - 10 - 0.9], [x + 1.1, 0.18, zd - 10 - 0.9], [x + 1.1, 0.18, zd - 10 + 0.9], [x - 1.1, 0.18, zd - 10 + 0.9]], { lw: [1, seed, 0, 0], lc: [0.55, 0.42, 0.26] });
      point(GB, [p.s * (WALK - 0.12), 1.2 + yAt(p.z), zd], { lw: [1, seed, 0, 0], lc: [0.9, 0.72, 0.45], ls: [1.3] });
    });
    var eyeAt = GB.n; point(GB, [0, -50, 0], { lw: [2, 0, 0, 0], lc: [0.75, 1, 0.45], ls: [0.07] }); point(GB, [0, -50, 0], { lw: [2, 0, 0, 0], lc: [0.75, 1, 0.45], ls: [0.07] });
    var poolMesh = LB.n ? add(new T.Mesh(geoOf(T, LB), shader(POOL_VS, POOL_FS, { add: true })), k.ground || k.root) : null;
    var dyn = add(new T.Points(geoOf(T, GB, true), shader(DYN_VS, DYN_FS, { add: true })));
    function setOn(i, a, b) {
      if (poolMesh) { var lw = poolMesh.geometry.attributes.lw; for (var v = 0; v < 4; v++) { lw.array[(i * 4 + v) * 4 + 2] = a; lw.array[(i * 4 + v) * 4 + 3] = b; } lw.needsUpdate = true; }
      var gw = dyn.geometry.attributes.lw; gw.array[i * 4 + 2] = a; gw.array[i * 4 + 3] = b; gw.needsUpdate = true;
    }

    // ===== 7. the cat =====
    var cat = null;
    (function () {
      var parts = [[0.16, 0.15, 0.4, 0, 0.2, 0], [0.14, 0.12, 0.12, 0, 0.31, 0.24], [0.035, 0.06, 0.03, 0.042, 0.39, 0.22], [0.035, 0.06, 0.03, -0.042, 0.39, 0.22],
        [0.04, 0.15, 0.04, 0.05, 0.075, 0.14], [0.04, 0.15, 0.04, -0.05, 0.075, 0.14], [0.04, 0.15, 0.04, 0.05, 0.075, -0.14], [0.04, 0.15, 0.04, -0.05, 0.075, -0.14],
        [0.035, 0.035, 0.3, 0, 0.33, -0.3, -0.9]];
      var pos = [], nor = [], M = new T.Matrix4(), E = new T.Euler();
      parts.forEach(function (b) { var g = new T.BoxGeometry(b[0], b[1], b[2]).toNonIndexed(); M.makeRotationFromEuler(E.set(b[6] || 0, 0, 0)); M.setPosition(b[3], b[4], b[5]); g.applyMatrix4(M); Array.prototype.push.apply(pos, g.attributes.position.array); Array.prototype.push.apply(nor, g.attributes.normal.array); g.dispose(); });
      var G = new T.BufferGeometry(); G.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); G.setAttribute('normal', new T.Float32BufferAttribute(nor, 3));
      var fur = [[28, 0.65, 0.42], [220, 0.04, 0.45], [30, 0.2, 0.34], [0, 0, 0.16]][Math.floor(rr() * 4)];
      var m = new T.Mesh(G, new T.MeshLambertMaterial({ color: new T.Color().setHSL(fur[0] / 360, fur[1], fur[2]) }));
      m.rotation.order = 'YXZ'; m.visible = false; k.root.add(m);
      cat = { m: m, state: 'wait', t0: 0, x: 0, z: 0, s: 1, yaw: 0, tx: 0, tz: 0, kind: 0, sc: 1 };
    })();
    function catGround(x, z) { var ax = Math.abs(x); return yAt(z) + (ax > ROAD + 0.05 && ax < WALK + 0.02 ? 0.16 : 0); }
    function placeCat(z, t) {
      if (z < k.gz + 14) { cat.state = 'done'; cat.m.visible = false; return; }
      var s = sides[Math.floor(rt() * sides.length)];
      for (var tries = 0; tries < 6 && k.held(s, z - 1.5, z + 1.5); tries++) z -= 6;
      cat.s = s; cat.z = z; cat.x = s * (WALK - 0.32); cat.yaw = s > 0 ? -Math.PI / 2 : Math.PI / 2;
      cat.state = 'sit'; cat.t0 = t; cat.sc = 1; cat.m.visible = true;
    }
    function bolt(t, cam) {
      var away = cam.z > cat.z ? -1 : 1, best = null, bd = 1e9;
      (k.carSpots || []).forEach(function (c) { if (c[0] !== cat.s) return; var d = (c[1] - cat.z) * away; if (d > -1 && d < 11 && d < bd) { bd = d; best = c; } });
      if (best) { cat.kind = 0; cat.tx = cat.s * (ROAD - 1.1); cat.tz = best[1]; }
      else {
        // between two lots, or along the pavement and away
        var gapZ = null, pc = LAY.parcels.filter(function (p) { return p.s === cat.s; });
        pc.forEach(function (p) { [p.z - p.w / 2 - 0.4, p.z + p.w / 2 + 0.4].forEach(function (gz) { var d = (gz - cat.z) * away; if (d > 1 && d < 12 && !pc.some(function (q) { return Math.abs(q.z - gz) < q.w / 2 + (q.k === 'h' ? -1.2 : 0.05); }) && (gapZ === null || d < (gapZ - cat.z) * away)) gapZ = gz; }); });
        if (gapZ !== null) { cat.kind = 1; cat.tx = cat.s * (WALK + 4); cat.tz = gapZ; } else { cat.kind = 2; cat.tx = cat.x; cat.tz = cat.z + away * 14; }
      }
      cat.state = 'run'; cat.t0 = t;
    }
    var EV = new T.Vector3();
    function eyes(t, cam) {
      var g = dyn.geometry.attributes, pa = g.position.array, lw = g.lw.array, b = 0;
      if (cat.m.visible && (cat.state === 'sit' || cat.state === 'hid')) {
        var fx = Math.sin(cat.yaw), fz = Math.cos(cat.yaw), dx = cam.x - cat.x, dz = cam.z - cat.z, d = Math.sqrt(dx * dx + dz * dz) || 1;
        b = Math.pow(Math.max(0, (fx * dx + fz * dz) / d), 3) * (d < 40 ? 0.95 : 0);
      }
      for (var e = 0; e < 2; e++) {
        if (b > 0) { EV.set(e ? 0.035 : -0.035, 0.32, 0.305).multiply(cat.m.scale).applyEuler(cat.m.rotation).add(cat.m.position); pa[(eyeAt + e) * 3] = EV.x; pa[(eyeAt + e) * 3 + 1] = EV.y; pa[(eyeAt + e) * 3 + 2] = EV.z; }
        lw[(eyeAt + e) * 4 + 2] = b;
      }
      g.position.needsUpdate = true; g.lw.needsUpdate = true;
    }
    function catTick(t, dt, cam) {
      if (cat.state === 'done') return;
      if (cat.state === 'wait') { placeCat(Math.min(cam.z, 10) - 26 - rt() * 12, t); }
      var dx = cam.x - cat.x, dz = cam.z - cat.z, d = Math.sqrt(dx * dx + dz * dz), m = cat.m;
      if (cat.state === 'sit') {
        var want = d < 40 ? Math.atan2(dx, dz) : (cat.s > 0 ? -Math.PI / 2 : Math.PI / 2), dy = want - cat.yaw;
        dy = Math.atan2(Math.sin(dy), Math.cos(dy)); cat.yaw += dy * Math.min(1, dt * 1.2);
        if (d < (cam.walking ? 5.5 : 15.5) && t - cat.t0 > 0.5) bolt(t, cam);
        else if (d > 60 && cam.z < cat.z) placeCat(cam.z - 45 - rt() * 25, t);
        m.position.set(cat.x, catGround(cat.x, cat.z) + 0.07, cat.z); m.rotation.set(-0.5, cat.yaw, 0); m.scale.set(1.3, 1.3, 1.3);
      } else if (cat.state === 'run') {
        var rx = cat.tx - cat.x, rz = cat.tz - cat.z, rl = Math.sqrt(rx * rx + rz * rz), st = 5.5 * dt;
        cat.yaw = Math.atan2(rx, rz);
        if (rl <= st) { cat.x = cat.tx; cat.z = cat.tz; cat.state = cat.kind === 0 ? 'hid' : 'fade'; cat.t0 = t; if (cat.kind === 0) cat.yaw = cat.s > 0 ? -Math.PI / 2 : Math.PI / 2; }
        else { cat.x += rx / rl * st; cat.z += rz / rl * st; }
        m.position.set(cat.x, catGround(cat.x, cat.z) + Math.abs(Math.sin(t * 16)) * 0.06, cat.z); m.rotation.set(0, cat.yaw, 0); m.scale.set(1.3, 1.07, 1.53);
      } else if (cat.state === 'hid') { // under a parked car: only the eyes, when you look its way
        m.position.set(cat.x, yAt(cat.z) - 0.1, cat.z); m.rotation.set(0, cat.yaw, 0); m.scale.set(1, 0.7, 1);
        if (t - cat.t0 > 20 && d > 45) placeCat(cam.z - 45 - rt() * 25, t);
      } else if (cat.state === 'fade') {
        cat.sc = Math.max(0, cat.sc - dt * 3); m.scale.setScalar(cat.sc); if (cat.sc <= 0) m.visible = false;
        if (t - cat.t0 > 15 && d > 35) placeCat(cam.z - 45 - rt() * 25, t);
      }
      eyes(t, cam);
    }

    // ===== 8. the sky: an aircraft with its lights, a meteor on clear nights, cloud when overcast, fog banks in fog =====
    var plane = null, meteor = null, clouds = null, banks = null;
    if (WX === 'clear' || WX === 'overcast') {
      var pg = new T.BufferGeometry(); pg.setAttribute('position', new T.Float32BufferAttribute(new Float32Array(15), 3)); pg.setAttribute('color', new T.Float32BufferAttribute(new Float32Array(15), 3));
      var pts = add(new T.Points(pg, new T.PointsMaterial({ map: k.glowTex, vertexColors: true, size: 9, sizeAttenuation: false, transparent: true, blending: T.AdditiveBlending, depthWrite: false, fog: false })));
      pts.visible = false; plane = { o: pts, next: 3 + rt() * 7, on: false, v: new T.Vector3() };
    }
    if (WX === 'clear') {
      var mg = new T.BufferGeometry(); mg.setAttribute('position', new T.Float32BufferAttribute(new Float32Array(6), 3)); mg.setAttribute('color', new T.Float32BufferAttribute(new Float32Array(6), 3));
      var ml = add(new T.LineSegments(mg, new T.LineBasicMaterial({ vertexColors: true, transparent: true, blending: T.AdditiveBlending, depthWrite: false, fog: false })));
      ml.visible = false; meteor = { o: ml, next: 6 + rt() * 10, t0: -1, a: new T.Vector3(), d: new T.Vector3() };
    }
    function cloudTex() {
      var tex = k.canvasTex(256, 128, function (g, w, h) {
        for (var i = 0; i < 22; i++) {
          var x = w * (0.15 + rt() * 0.7), y = h * (0.4 + (rt() - 0.5) * 0.35), r = h * (0.15 + rt() * 0.25), gr = g.createRadialGradient(x, y, 0, x, y, r);
          gr.addColorStop(0, 'rgba(255,255,255,' + (0.12 + rt() * 0.16).toFixed(2) + ')'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
        }
      });
      return tex;
    }
    var IM = new T.Matrix4(), IQ = new T.Quaternion(), IP = new T.Vector3(), IS = new T.Vector3();
    if (WX === 'overcast' || WX === 'rain') {
      var cmat = new T.MeshBasicMaterial({ map: cloudTex(), color: new T.Color().setHSL((k.warm || 22) / 360, 0.32, WX === 'rain' ? 0.26 : 0.36), transparent: true, opacity: 0.75, depthWrite: false, fog: false });
      cmat.userData.own = true;
      var cn = 14, ci = new T.InstancedMesh(new T.PlaneGeometry(1, 1), cmat, cn), cg = new T.Group();
      for (var c = 0; c < cn; c++) { var a = c / cn * 6.2832 + rt() * 0.3, R = 300 + rt() * 120, x = Math.sin(a) * R, z = Math.cos(a) * R; IQ.setFromAxisAngle(IP.set(0, 1, 0), Math.atan2(-x, -z)); IM.compose(IP.set(x, 45 + rt() * 110, z), IQ, IS.set(170 + rt() * 120, 40 + rt() * 40, 1)); ci.setMatrixAt(c, IM); }
      cg.add(ci); ci.frustumCulled = false; k.root.add(cg); heavy.push(cg); clouds = cg;
    }
    if (WX === 'fog') {
      var fmat = new T.MeshBasicMaterial({ map: cloudTex(), color: new T.Color().setHSL((k.warm || 22) / 360, 0.16, 0.5), transparent: true, opacity: 0.42, depthWrite: false, fog: true });
      fmat.userData.own = true;
      var bn = 8, bi = add(new T.InstancedMesh(new T.PlaneGeometry(1, 1), fmat, bn), null, true);
      banks = { o: bi, list: [], ready: false };
      for (var b = 0; b < bn; b++) banks.list.push({ x: (rt() - 0.5) * 24, y: 1.6 + rt() * 2.2, z: 0, v: (rt() - 0.5) * 1.2, w: 24 + rt() * 18, h: 5 + rt() * 4 });
    }
    function sky(t, dt, cam) {
      if (plane) {
        var o = plane.o;
        if (!plane.on && t > plane.next) {
          plane.on = true; plane.kind = rt() < 0.7 ? 0 : 1; o.visible = true;
          var d = plane.kind ? new T.Vector3(1, 0, 0.05) : new T.Vector3(0, -0.07, 1); d.normalize();
          plane.v.copy(d).multiplyScalar(plane.kind ? 18 : 14);
          if (plane.kind) o.position.set(cam.x - 600, 120 + rt() * 80, cam.z - 380 - rt() * 100);
          else o.position.set(cam.x + (rt() < 0.5 ? -1 : 1) * (6 + rt() * 22), 150 + rt() * 50, cam.z - 720);
          var left = new T.Vector3(0, 1, 0).cross(d), pp = o.geometry.attributes.position.array, offs = [left.clone().multiplyScalar(2.2), left.clone().multiplyScalar(-2.2), d.clone().multiplyScalar(-1.8).add(new T.Vector3(0, 0.4, 0)), new T.Vector3(0, -0.3, 0), d.clone().multiplyScalar(1.9)];
          offs.forEach(function (v, i) { pp[i * 3] = v.x; pp[i * 3 + 1] = v.y; pp[i * 3 + 2] = v.z; });
          o.geometry.attributes.position.needsUpdate = true;
        }
        if (plane.on) {
          o.position.addScaledVector(plane.v, dt);
          var cc = o.geometry.attributes.color.array, sp = (t % 1.4) / 1.4, strobe = sp < 0.04 || (sp > 0.1 && sp < 0.14) ? 1 : 0, bcn = ((t + 0.5) % 1.1) < 0.12 ? 1 : 0, dim = WX === 'overcast' ? 0.6 : 1;
          var C = [[0.9, 0.12, 0.1], [0.1, 0.9, 0.3], [strobe, strobe, strobe], [bcn * 1, bcn * 0.15, bcn * 0.1], plane.kind ? [0, 0, 0] : [1, 0.97, 0.9]];
          C.forEach(function (v, i) { cc[i * 3] = v[0] * dim; cc[i * 3 + 1] = v[1] * dim; cc[i * 3 + 2] = v[2] * dim; });
          o.geometry.attributes.color.needsUpdate = true;
          if ((plane.kind && o.position.x > cam.x + 620) || (!plane.kind && o.position.z > cam.z + 150)) { plane.on = false; o.visible = false; plane.next = t + 25 + rt() * 40; }
        }
      }
      if (meteor) {
        var ms = meteor.o;
        if (meteor.t0 < 0 && t > meteor.next) {
          meteor.t0 = t; meteor.a.set(cam.x + (rt() - 0.5) * 90, 170 + rt() * 110, cam.z - 380 - rt() * 120);
          meteor.d.set(rt() < 0.5 ? -1 : 1, -0.4 - rt() * 0.3, (rt() - 0.5) * 0.4).normalize(); ms.visible = true;
        }
        if (meteor.t0 >= 0) {
          var u = (t - meteor.t0) / 0.75;
          if (u > 1) { meteor.t0 = -1; ms.visible = false; meteor.next = t + 35 + rt() * 50; }
          else {
            var mp = ms.geometry.attributes.position.array, mc = ms.geometry.attributes.color.array, hd = u * 130, tl = Math.max(0, hd - 45), br = Math.sin(Math.PI * u);
            mp[0] = meteor.a.x + meteor.d.x * hd; mp[1] = meteor.a.y + meteor.d.y * hd; mp[2] = meteor.a.z + meteor.d.z * hd;
            mp[3] = meteor.a.x + meteor.d.x * tl; mp[4] = meteor.a.y + meteor.d.y * tl; mp[5] = meteor.a.z + meteor.d.z * tl;
            mc[0] = br; mc[1] = br; mc[2] = br * 0.92; mc[3] = mc[4] = mc[5] = 0;
            ms.geometry.attributes.position.needsUpdate = true; ms.geometry.attributes.color.needsUpdate = true;
          }
        }
      }
      if (clouds) { clouds.position.set(cam.x, 0, cam.z); clouds.rotation.y = t * 0.004; }
      if (banks && banks.o.visible) {
        banks.list.forEach(function (b, i) {
          if (!banks.ready) b.z = cam.z - 8 - i / banks.list.length * 85 - rt() * 6;
          b.x += b.v * dt; if (b.x > 16) b.x = -16; if (b.x < -16) b.x = 16;
          if (b.z > cam.z + 6) { b.z = cam.z - 85 - rt() * 15; b.x = (rt() - 0.5) * 24; }
          IM.compose(IP.set(b.x, b.y + yAt(b.z), b.z), k.camera.quaternion, IS.set(b.w, b.h, 1)); banks.o.setMatrixAt(i, IM);
        });
        banks.ready = true; banks.o.instanceMatrix.needsUpdate = true;
      }
    }

    // ===== the one tick =====
    var lastQ = -1, nextPorch = 0;
    k.ticks.push(function (t, dt, cam) {
      U.t.value = t;
      var q = k.quality();
      if (q !== lastQ) { lastQ = q; heavy.forEach(function (o) { o.visible = q > 0; }); }
      var pr = Math.min(window.devicePixelRatio || 1, q ? 2 : 1.25);
      U.ps.value = window.innerHeight * pr / (2 * Math.tan(k.camera.fov * Math.PI / 360));
      sky(t, dt, cam);
      if (porchN && t >= nextPorch) { // a motion light sees whoever comes by, the flight included
        nextPorch = t + 0.2;
        var reach = cam.walking ? 7 : 14;
        porches.forEach(function (p) {
          var dx = cam.x - p.x, dz = cam.z - p.z, near = dx * dx + dz * dz < reach * reach;
          if (near) { if (p.off < t) { p.on = t; } p.off = t + 14; setOn(p.i, p.on, p.off); }
        });
      }
      catTick(t, dt, cam);
    });
  };
})();

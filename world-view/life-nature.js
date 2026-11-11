// Trees, birds and wind-borne things. Owns LIFE.nature only.
//   trees(k, list)  draws the trees the page placed (list = [x, z, trunkHeight]) and the few this file may add
//                   where the place supports them (back gardens of house lots, the Lake Merritt shore); returns true.
//   ambient(k)      birds, drifting leaves, moths at the lamps — only what the place's hoods.js entry supports.
// Everything is instanced; nothing consumes k.r() (the page's own random stream) — this file seeds its own.
(function () {
  function hash(s) { var h = 2166136261; s = String(s); for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rng(seed) { var a = seed >>> 0; return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function pick(r, w) { var s = 0, k; for (k in w) s += w[k]; var x = r() * s; for (k in w) { x -= w[k]; if (x <= 0) return k; } return k; }

  // ---------- what grows where, read off each place's hoods.js line ----------
  // street: the species on the kerb; garden: what stands by the houses; back: share of house lots with a tree behind
  // the roof; shore: trees along the lake railing. R = canopy radius range. Places with no `trees` in hoods.js
  // never reach trees() at all.
  var GROW = {
    'Rockridge':    { street: { round: 1 }, garden: { spread: 0.5, round: 0.3, column: 0.2 }, back: 0.8, R: [1.9, 2.6] },   // "affluent, professional, tree-lined"
    'Glenview':     { street: { round: 1 }, garden: { conifer: 0.35, spread: 0.35, round: 0.3 }, back: 0.6, R: [1.6, 2.2] }, // "quiet hill-adjacent residential"
    'Ivy Hill':     { street: { round: 1 }, garden: { conifer: 0.45, spread: 0.35, column: 0.2 }, back: 0.9, R: [1.6, 2.3] }, // "Residential to the point of invisibility"
    'Laurel':       { street: { round: 1 }, garden: { round: 0.5, column: 0.25, spread: 0.25 }, back: 0.35, R: [1.4, 1.9] }, // "schools, small commercial, ordinary streets"
    'Eastlake':     { street: { round: 1 }, garden: { spread: 0.5, round: 0.5 }, back: 0.5, R: [1.5, 2.1] },                 // house side "where lake money thins"
    'Brooklyn':     { street: { small: 1 }, garden: { small: 1 }, back: 0, R: [1.1, 1.5] },                                  // "residential rather than spectacle"
    'Piedmont Ave': { street: { small: 0.7, column: 0.3 }, garden: { small: 1 }, back: 0, R: [1.0, 1.4] },                    // "small storefront retail"
    'Lake Merritt': { street: { round: 1 }, garden: { round: 1 }, back: 0, shore: { willow: 0.45, round: 0.55 }, R: [2.0, 2.7] } // "historic and settled"
  };
  var DEFGROW = { street: { round: 1 }, garden: { round: 0.6, spread: 0.4 }, back: 0.3, R: [1.4, 2.0] };

  // ---------- who lives here ----------
  // small: sparrows on eaves and lamp tops, a dusk flock overhead; pigeons: on the pavement and the cornices;
  // gulls: over the water and standing on the quay; ducks: on the lake; geese: a skein crossing the lake;
  // moths: at the lamps, where there is green or water.
  var LIVE = {
    'Rockridge':    { small: 1, moths: 1 },
    'Glenview':     { small: 1, moths: 1 },
    'Ivy Hill':     { small: 1, moths: 1 },
    'Laurel':       { small: 0.8, moths: 1 },
    'Eastlake':     { small: 0.6, pigeons: 0.5 },
    'Brooklyn':     { small: 0.5, gulls: 0.8, moths: 1 },
    'Piedmont Ave': { small: 0.6, pigeons: 0.5, moths: 1 },
    'Lake Merritt': { small: 0.5, gulls: 0.35, ducks: 1, geese: 1, moths: 1 },
    'Jack London':  { pigeons: 0.6, gulls: 1 },
    'Baylight District': { gulls: 1 },
    'Downtown':     { pigeons: 1 },
    'Uptown':       { pigeons: 0.8 },
    'Chinatown':    { pigeons: 1 },
    'KONO':         { pigeons: 0.8 },
    'San Antonio':  { pigeons: 0.8 },
    'Fruitvale':    { pigeons: 0.8 },
    'Adams Point':  { pigeons: 0.6 },
    'Grand Lake':   { pigeons: 0.7 },
    'Temescal':     { pigeons: 0.5 },
    'Dimond':       { pigeons: 0.5 },
    'West Oakland': { pigeons: 0.6 },
    'East Oakland': { pigeons: 0.5 }
  };

  var made = null; // what trees() drew for this place, for ambient() (leaves fall from real canopies)

  // ---------- shared geometry (built once, never disposed: the page disposes per-place clones) ----------
  function lobeGeo(T) {
    var g = new T.IcosahedronGeometry(1, 1), p = g.attributes.position, r = rng(11), c = [], v = new T.Vector3(), i;
    // weld-free jitter: same seed per unique vertex so the facets stay closed
    var seen = {};
    for (i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i); var key = v.x.toFixed(3) + ',' + v.y.toFixed(3) + ',' + v.z.toFixed(3);
      if (!seen[key]) seen[key] = 0.82 + r() * 0.3;
      var s = seen[key]; p.setXYZ(i, v.x * s, v.y * s * (v.y < 0 ? 0.75 : 1), v.z * s);
      var sh = 0.5 + 0.5 * Math.max(0, Math.min(1, (v.y + 1) / 1.7)); c.push(sh, sh, sh);
    }
    g.setAttribute('color', new T.Float32BufferAttribute(c, 3)); g.computeVertexNormals();
    return g;
  }
  function coneGeo(T, top, open) {
    var g = new T.CylinderGeometry(top, 1, 1, 9, 2, open).translate(0, 0.5, 0), p = g.attributes.position, r = rng(top ? 23 : 17), c = [], v = new T.Vector3(), seen = {}, i;
    for (i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i); var key = v.x.toFixed(3) + ',' + v.y.toFixed(3) + ',' + v.z.toFixed(3);
      if (!seen[key]) seen[key] = v.y < 0.01 ? 0.85 + r() * 0.3 : 1;
      var s = seen[key]; p.setXYZ(i, v.x * s, v.y < 0.01 ? -r() * 0.12 : v.y, v.z * s);
      var sh = 0.55 + 0.45 * v.y; c.push(sh, sh, sh);
    }
    g.setAttribute('color', new T.Float32BufferAttribute(c, 3)); g.computeVertexNormals();
    return g;
  }

  // a material that leans in the wind: the higher above its own ground a vertex is, the further it moves.
  // aG = ground y under the tree (per instance). Wind is a slow wave running down the street plus a small flutter.
  function swayMat(T, U, opt, stiff) {
    var m = new T.MeshLambertMaterial(opt);
    m.onBeforeCompile = function (sh) {
      sh.uniforms.uT = U.t; sh.uniforms.uA = U.a;
      sh.vertexShader = 'uniform float uT; uniform float uA; attribute float aG;\n' + sh.vertexShader.replace('#include <project_vertex>',
        'vec4 wp = vec4(transformed, 1.0);\n#ifdef USE_INSTANCING\nwp = instanceMatrix * wp;\n#endif\n' +
        'float hh = max(wp.y - aG, 0.0); float ph = uT * 0.9 + wp.z * 0.07 + wp.x * 0.03;\n' +
        'float gust = 0.6 + 0.4 * sin(uT * 0.23 + wp.z * 0.011);\n' +
        'float lean = uA * gust * hh * hh * ' + stiff.toFixed(4) + ';\n' +
        'wp.x += lean * (sin(ph) + 0.35 * sin(ph * 2.3 + 1.7));\n' +
        'wp.z += lean * 0.6 * cos(ph * 0.8 + 0.4);\n' +
        'wp.y += uA * ' + (stiff > 0.003 ? '0.03' : '0.0') + ' * sin(uT * 3.1 + wp.x * 1.3 + wp.z * 1.7) * min(hh, 1.0);\n' +
        'vec4 mvPosition = viewMatrix * modelMatrix * wp;\ngl_Position = projectionMatrix * mvPosition;');
    };
    m.customProgramCacheKey = function () { return 'nature-sway-' + stiff; };
    return m;
  }

  // ---------- trees ----------
  function trees(k, list) {
    var T = k.THREE, W = k.WALK, r = rng(hash(k.H.name + '/trees')), G = GROW[k.H.name] || DEFGROW;
    var U = { t: { value: 0 }, a: { value: 1 } };
    var trunk = [], lobe = [], cone = [], skirt = []; // each item: [x,y,z, sx,sy,sz, rx,ry,rz, hsl, groundY]
    var drawn = [];
    var signs = k.signs || [];
    function signGap(s, z) { var d = 1e9; for (var i = 0; i < signs.length; i++) if (signs[i][0] === s) d = Math.min(d, Math.abs(signs[i][1] - z)); return d; }
    var leafHue = function () { return 92 + r() * 38; };

    // one tree: species, base x/z, trunk height h, canopy radius R
    function plant(sp, x, z, h, R, place) {
      var g = k.yAt(z), s = x < 0 ? -1 : 1, ax = Math.abs(x);
      // keep the hanging signs clear: a canopy that would reach the sign band near a sign is narrowed, then lifted
      var reachIn = ax - R; // nearest x the canopy reaches
      if (reachIn < W && sp !== 'conifer') {
        var gap = signGap(s, z) - 0.45;
        if (gap < R) { if (gap >= 1.1) R = gap; else { R = Math.max(1.0, gap); h = Math.max(h, 5.6); } }
        if (sp === 'round' || sp === 'small') { var base = h - 0.45 * R; if (base < 5.4 && gap < R + 0.6) h += 5.4 - base; }
      }
      var hue = leafHue(), sat = 0.34 + r() * 0.18, lit = 0.24 + r() * 0.12, i, a;
      function L(dx, dy, dz, sx, sy, sz, dl) { lobe.push([x + dx, g + dy, z + dz, sx, sy, sz, 0, r() * 6.28, 0, [hue + (r() - 0.5) * 10, sat, Math.max(0.08, lit + (dl || 0) + (r() - 0.5) * 0.05)], g]); }
      function Tk(dx, dz, len, th, rx, rz) { trunk.push([x + dx, g, z + dz, th, len, th, rx || 0, 0, rz || 0, [24 + r() * 10, 0.25, 0.1 + r() * 0.06], g]); }
      if (sp === 'round' || sp === 'small') {
        var big = sp === 'round';
        Tk(0, 0, h + R * 0.15, big ? 1.1 : 0.8);
        L(0, h + 0.32 * R, 0, R, 0.78 * R, R, 0);
        var n = big ? 5 : 3, a0 = r() * 6.28;
        for (i = 0; i < n; i++) { a = a0 + i / n * 6.28; L(Math.cos(a) * 0.55 * R, h + (0.0 + r() * 0.22) * R, Math.sin(a) * 0.55 * R, 0.62 * R, 0.55 * R, 0.62 * R, -0.04); }
        L((r() - 0.5) * 0.3 * R, h + 0.78 * R, (r() - 0.5) * 0.3 * R, 0.6 * R, 0.5 * R, 0.6 * R, 0.05);
      } else if (sp === 'spread') {
        Tk(0, 0, h * 0.7, 1.4);
        var b0 = r() * 6.28;
        for (i = 0; i < 3; i++) { a = b0 + i * 2.1; Tk(Math.cos(a) * 0.05, Math.sin(a) * 0.05, h * 0.55, 0.8, Math.sin(a) * 0.0, 0); var tr = trunk[trunk.length - 1]; tr[1] = g + h * 0.55; tr[6] = Math.sin(a) * 0.7; tr[8] = -Math.cos(a) * 0.7; }
        L(0, h + 0.45 * R, 0, 1.15 * R, 0.5 * R, 1.15 * R, 0.03);
        var m2 = 6; for (i = 0; i < m2; i++) { a = b0 + i / m2 * 6.28; L(Math.cos(a) * 0.85 * R, h + (0.05 + r() * 0.2) * R, Math.sin(a) * 0.85 * R, 0.6 * R, 0.42 * R, 0.6 * R, -0.03); }
      } else if (sp === 'column') {
        Tk(0, 0, 1.6, 0.9);
        var ch = h + 1.6 * R, nn = 4;
        for (i = 0; i < nn; i++) { var f = (i + 0.5) / nn, w = 0.5 * R * (1 - Math.pow(Math.abs(f - 0.38) * 1.5, 2)); L((r() - 0.5) * 0.15, 1.3 + f * (ch - 1.6), (r() - 0.5) * 0.15, Math.max(0.3, w), (ch - 1.4) / nn * 0.85, Math.max(0.3, w), -0.02 + f * 0.05); }
      } else if (sp === 'conifer') {
        Tk(0, 0, 1.4, 1.0);
        var top = h + 1.8 * R, tiers = 3, hueC = 140 + r() * 25;
        for (i = 0; i < tiers; i++) { var f0 = i / tiers, y0 = 1.0 + f0 * (top - 1.0) * 0.72, rr = R * (0.95 - f0 * 0.5); cone.push([x, g + y0, z, rr, (top - y0) * (i === tiers - 1 ? 1 : 0.62), rr, 0, r() * 6.28, 0, [hueC, 0.32, 0.16 + r() * 0.06 + i * 0.02], g]); }
      } else if (sp === 'willow') {
        Tk(0, 0, h, 1.4);
        L(0, h + 0.35 * R, 0, 0.95 * R, 0.55 * R, 0.95 * R, 0.07);
        skirt.push([x, g + h - 1.15 * R + 0.2, z, R * 1.08, R * 1.5, R * 1.08, 0, r() * 6.28, 0, [hue + 16, 0.45, lit + 0.1], g]);
      }
      drawn.push({ x: x, z: z, y: g + h + R * 0.4, R: R, place: place });
    }

    // the page's own trees: on the pavement (|x| < WALK) a street tree, past it a garden tree
    list.forEach(function (t) {
      var garden = Math.abs(t[0]) > k.WALK, sp = pick(r, garden ? G.garden : G.street), R = G.R[0] + r() * (G.R[1] - G.R[0]);
      if (!garden) R *= 0.92;
      plant(sp, t[0], t[1], t[2] * (sp === 'spread' ? 1.05 : 1), R * (sp === 'column' ? 0.85 : sp === 'conifer' ? 0.95 : 1), garden ? 'garden' : 'street');
    });
    // back gardens: a tree behind some house roofs, so the skyline over the houses is canopy
    if (G.back) (k.LAY.parcels || []).forEach(function (p) {
      if (p.k !== 'h' || !(p.tr > 0) || r() > G.back * Math.min(1, p.tr * 1.4)) return;
      var bx = p.s * (W + 2.5 + p.d + 1.5 + r() * 3), bz = p.z + (r() - 0.5) * p.w * 0.6, R = (G.R[0] + r() * (G.R[1] - G.R[0])) * 1.15;
      plant(pick(r, G.garden), bx, bz, p.h + 1.5 + r() * 2.5, R, 'back');
    });
    // the Lake Merritt shore: a row along the railing, clear of the pergola terrace and anything the layout holds
    if (G.shore && k.water) {
      var ws = k.water, pz = -k.L * 0.5, hasPerg = (k.ST.set || []).indexOf('pergola') >= 0;
      for (var z = 2; z > -k.L - 10; z -= 9 + r() * 6) {
        if (hasPerg && Math.abs(z - pz) < 19) continue;
        if (k.held(ws, z - 3, z + 3)) continue;
        plant(pick(r, G.shore), ws * (W - 0.35), z, 3.4 + r() * 1.2, (G.R[0] + r() * (G.R[1] - G.R[0])) * 0.9, 'shore');
      }
    }

    var built = [];
    function inst(geo, mat, items, shadow) {
      if (!items.length) return null;
      var m = new T.InstancedMesh(geo, mat, items.length), O = new T.Object3D(), C = new T.Color(), aG = new Float32Array(items.length);
      items.forEach(function (it, i) {
        O.position.set(it[0], it[1], it[2]); O.rotation.set(it[6], it[7], it[8], 'YXZ'); O.scale.set(it[3], it[4], it[5]); O.updateMatrix();
        m.setMatrixAt(i, O.matrix); m.setColorAt(i, C.setHSL(it[9][0] / 360, it[9][1], it[9][2])); aG[i] = it[10];
      });
      geo.setAttribute('aG', new T.InstancedBufferAttribute(aG, 1));
      m.castShadow = !!shadow; m.receiveShadow = true; m.frustumCulled = false; k.root.add(m); built.push(m); return m;
    }
    inst(new T.CylinderGeometry(0.085, 0.16, 1, 6).translate(0, 0.5, 0), swayMat(T, U, { color: 0xffffff }, 0.0006), trunk, true);
    inst(lobeGeo(T), swayMat(T, U, { color: 0xffffff, vertexColors: true }, 0.0009), lobe, true);
    inst(coneGeo(T, 0, false), swayMat(T, U, { color: 0xffffff, vertexColors: true }, 0.0007), cone, true);
    inst(coneGeo(T, 0.55, true), swayMat(T, U, { color: 0xffffff, vertexColors: true, side: T.DoubleSide }, 0.0016), skirt, true);
    k.ticks.push(function (t) { U.t.value = t; U.a.value = k.quality() > 0 ? (k.WX === 'rain' ? 1.6 : 1) : 0; });
    made = { root: k.root, trees: drawn };
    return true;
  }

  // ---------- birds ----------
  // One mesh for every bird. Local frame: beak toward +z, wings along x. Wing vertices carry aWing = 1;
  // per instance aF = (inner wing angle, outer wing angle, fold 0..1) set from the CPU each frame.
  function birdGeo(T) {
    var P = [], Wg = [];
    function tri(a, b, c, w) { P.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]); Wg.push(w ? (Math.abs(a[0]) > 0.07 ? 1 : 0) : 0, w ? (Math.abs(b[0]) > 0.07 ? 1 : 0) : 0, w ? (Math.abs(c[0]) > 0.07 ? 1 : 0) : 0); }
    // body and head: six-sided spindles, stations along z as [z, half-width, half-height, centre y]
    function spindle(st) {
      for (var j = 0; j < st.length - 1; j++) for (var q = 0; q < 6; q++) {
        var a0 = q / 6 * 6.2832, a1 = (q + 1) / 6 * 6.2832, A = st[j], B = st[j + 1];
        var p00 = [Math.cos(a0) * A[1], A[3] + Math.sin(a0) * A[2], A[0]], p01 = [Math.cos(a1) * A[1], A[3] + Math.sin(a1) * A[2], A[0]];
        var p10 = [Math.cos(a0) * B[1], B[3] + Math.sin(a0) * B[2], B[0]], p11 = [Math.cos(a1) * B[1], B[3] + Math.sin(a1) * B[2], B[0]];
        if (A[1] > 0) tri(p00, p10, p01); if (B[1] > 0) tri(p01, p10, p11);
      }
    }
    spindle([[0.3, 0, 0, 0.1], [0.24, 0.1, 0.11, 0.08], [0.06, 0.14, 0.15, 0.05], [-0.14, 0.11, 0.11, 0.06], [-0.32, 0.035, 0.03, 0.07]]);
    spindle([[0.24, 0, 0, 0.15], [0.29, 0.065, 0.075, 0.17], [0.38, 0.07, 0.075, 0.18], [0.44, 0.035, 0.03, 0.17], [0.53, 0, 0, 0.16]]);
    // tail fan
    tri([0, 0.07, -0.26], [-0.11, 0.06, -0.58], [0.11, 0.06, -0.58]);
    // wings: inner panel (two triangles) from the shoulder to the wrist, outer hand (one triangle) to the tip
    [-1, 1].forEach(function (s) {
      var r0 = [s * 0.06, 0.1, 0.16], r1 = [s * 0.06, 0.1, -0.14], w0 = [s * 0.5, 0.1, 0.14], w1 = [s * 0.5, 0.1, -0.16], tip = [s * 1.0, 0.1, -0.24];
      tri(r0, w0, r1, true); tri(r1, w0, w1, true); tri(w0, tip, w1, true);
    });
    var g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(P, 3)); g.computeVertexNormals(); g.setAttribute('aWing', new T.Float32BufferAttribute(Wg, 1));
    return g;
  }
  function birdMat(T) {
    var m = new T.MeshLambertMaterial({ color: 0xffffff, side: T.DoubleSide });
    m.onBeforeCompile = function (sh) {
      sh.vertexShader = 'attribute float aWing; attribute vec3 aF;\n' + sh.vertexShader.replace('#include <begin_vertex>',
        'vec3 transformed = position;\n' +
        'if (aWing > 0.5) {\n' +
        '  float sx = sign(position.x); float d = abs(position.x) - 0.06; float fold = aF.z;\n' +
        '  float di = min(d, 0.44); float dd = max(d - 0.44, 0.0);\n' +
        '  vec2 q = vec2(cos(aF.x), sin(aF.x)) * di + vec2(cos(aF.y), sin(aF.y)) * dd;\n' +
        '  q.x *= 1.0 - 0.9 * fold; q.y *= 1.0 - fold;\n' +
        '  transformed.x = sx * (0.06 + q.x); transformed.y = position.y + q.y + fold * 0.05;\n' +
        '  transformed.z = position.z - fold * d * 0.45;\n' +
        '}');
      // pale birds (gulls) catch the last light: a little of their own colour, squared so dark birds stay silhouettes
      sh.fragmentShader = sh.fragmentShader.replace('vec3 totalEmissiveRadiance = emissive;', 'vec3 totalEmissiveRadiance = emissive;\n#ifdef USE_INSTANCING_COLOR\ntotalEmissiveRadiance += vColor * vColor * 0.3;\n#endif');
    };
    m.customProgramCacheKey = function () { return 'nature-bird'; };
    return m;
  }

  // kinds: scale, colour [h,s,l] (with jitter), flap frequency, wing beat amplitude, glide share, speed
  var KIND = {
    sparrow: { sc: 0.24, col: [28, 0.25, 0.22], hz: 13, amp: 0.95, glide: 0.15, spd: 6.5, flush: 7.5 },
    starling: { sc: 0.3, col: [250, 0.08, 0.1], hz: 11, amp: 0.9, glide: 0.2, spd: 8 },
    pigeon: { sc: 0.5, col: [222, 0.1, 0.5], hz: 8, amp: 0.9, glide: 0.25, spd: 7, flush: 4.2 },
    gull: { sc: 1.0, col: [210, 0.06, 0.82], hz: 3.2, amp: 0.6, glide: 0.75, spd: 6.5, flush: 5 },
    duck: { sc: 0.6, col: [30, 0.3, 0.26], hz: 9, amp: 0.85, glide: 0.1, spd: 8 },
    goose: { sc: 0.95, col: [30, 0.12, 0.22], hz: 3.6, amp: 0.7, glide: 0.1, spd: 9 }
  };

  function ambient(k) {
    var T = k.THREE, name = k.H.name, live = LIVE[name] || {}, r = rng(hash(name + '/life'));
    var q0 = k.quality(), share = (q0 === 0 ? 0.5 : 1) * (k.WX === 'fog' ? 0.5 : 1), rainy = k.WX === 'rain';
    var W = k.WALK, ROAD = k.ROAD, L = k.L;
    var mine = made && made.root === k.root ? made.trees : [];
    var birds = [];
    function n(x) { return Math.max(0, Math.round(x * share)); }
    function jit(c) { return [c[0] + (r() - 0.5) * 12, c[1], Math.max(0.05, c[2] + (r() - 0.5) * 0.08)]; }
    function bird(kind, o) { var K = KIND[kind], b = { kind: kind, K: K, sc: K.sc * (0.88 + r() * 0.24), col: jit(K.col), ph: r() * 6.28, fold: 1, inner: 0, outer: 0, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, yaw: r() * 6.28, pitch: 0, roll: 0, mode: 'perch', tm: 0, seed: r() }; for (var key in o) b[key] = o[key]; birds.push(b); return b; }

    // --- perched birds: they sit, look about, and lift off when the viewer comes close, then come back ---
    function percher(kind, x, y, z, face) {
      if (birds.length >= 150) return;
      var K = KIND[kind]; bird(kind, { hx: x, hy: y, hz: z, x: x, y: y, z: z, yaw: face + (r() - 0.5) * 0.8, face: face, mode: 'perch', fold: 1, flushR: Math.max(K.flush || 5, Math.abs(y - k.yAt(z) - 1.7) + 2.5) });
    }
    var lamps = k.lampSpots || [];
    if (!rainy && live.small) {
      // sparrows in twos and threes along house eaves
      var eaves = 0, maxE = n(36 * live.small);
      (k.LAY.parcels || []).forEach(function (p) {
        if (p.k !== 'h' || eaves >= maxE || r() > 0.35) return;
        var hw = p.w - 2.5, ex = p.s * (W + 2.5 - 0.07 * p.d), ey = p.h + k.yAt(p.z) + 0.02, c = 1 + Math.floor(r() * 3);
        for (var i = 0; i < c && eaves < maxE; i++, eaves++) percher('sparrow', ex, ey, p.z + (r() - 0.5) * hw * 0.9, -p.s * Math.PI / 2);
      });
      // and on lamp tops: the one perch the flight passes close enough to flush
      lamps.forEach(function (l) { if (r() < 0.22 * live.small) { var c = 1 + Math.floor(r() * 2); for (var i = 0; i < c; i++) percher('sparrow', l[0] + (r() - 0.5) * 0.15, 4.42 + k.yAt(l[1]), l[1] + (i - 0.5) * 0.18, r() * 6.28); } });
    }
    if (!rainy && live.pigeons) {
      // on cornices (not glass towers) and lamp tops
      var cor = 0, maxC = n(24 * live.pigeons);
      (k.LAY.parcels || []).forEach(function (p) {
        if (p.k === 'h' || p.wall === 'glass' || cor >= maxC || r() > 0.22) return;
        var c = 2 + Math.floor(r() * 3);
        for (var i = 0; i < c && cor < maxC; i++, cor++) percher('pigeon', p.s * (W - 0.1), p.h + 0.35 + k.yAt(p.z), p.z + (r() - 0.5) * p.w * 0.7, p.s > 0 ? -Math.PI / 2 : Math.PI / 2);
      });
      lamps.forEach(function (l) { if (r() < 0.12 * live.pigeons) percher('pigeon', l[0], 4.42 + k.yAt(l[1]), l[1], r() * 6.28); });
      // pecking on the pavement, in little groups
      var groups = n(9 * live.pigeons);
      for (var gi = 0; gi < groups; gi++) {
        var gs = r() < 0.5 ? -1 : 1, gz = 2 - r() * (L - 6), gx = gs * (ROAD + 1.4 + r() * (W - ROAD - 2.4)), gc = 3 + Math.floor(r() * 5);
        if (k.water === gs) continue;
        for (var pi = 0; pi < gc; pi++) { var b = percher('pigeon', gx + (r() - 0.5) * 1.4, 0.16 + k.yAt(gz), gz + (r() - 0.5) * 2.4, r() * 6.28); }
      }
    }
    // gulls standing on the quay edge (not on rails the water module may not draw)
    if (!rainy && live.gulls && k.water) {
      var gq = n(10 * live.gulls), qs = k.water;
      for (var qi = 0; qi < gq; qi++) { var qz = 4 - r() * (L - 8); if (k.held(qs, qz - 2, qz + 2)) continue; percher('gull', qs * (W - 0.45 - r() * 0.5), 0.16 + k.yAt(qz), qz, qs > 0 ? Math.PI / 2 : -Math.PI / 2); }
    }
    birds.forEach(function (b) { if (b.mode === 'perch') { b.ground = b.hy < 0.5; } });

    // --- gulls wheeling over the water ---
    var wheel = [];
    if (!rainy && live.gulls && k.water) {
      var gw = n(9 * live.gulls);
      for (var wi = 0; wi < gw; wi++) wheel.push(bird('gull', { mode: 'wheel', cx: k.water * (W + 5 + r() * 28), cz: 6 - r() * 60, rad: 6 + r() * 12, h: 6 + r() * 10, w: (0.18 + r() * 0.12) * (r() < 0.5 ? -1 : 1), a0: r() * 6.28, a: 0, fold: 0, y: -999 }));
    }
    // --- ducks on the lake ---
    var wy = k.waterY != null ? k.waterY : -0.55; // the water module's surface height
    if (live.ducks && k.water) {
      var dg = Math.max(2, n(5)), qs2 = k.water, pz = -L * 0.5;
      for (var di = 0; di < dg; di++) {
        var dz = 6 - r() * (L - 10), dx = qs2 * (W + 1.8 + r() * 9), dc = 2 + Math.floor(r() * 3);
        if (Math.abs(dz - pz) < 17) dz = pz + 19 * (r() < 0.5 ? -1 : 1);
        for (var dj = 0; dj < dc; dj++) bird('duck', { mode: 'swim', x: dx + (r() - 0.5) * 2.5, y: wy + 0.06, z: dz + (r() - 0.5) * 3, hx: dx, hz: dz, yaw: r() * 6.28, fold: 1 });
      }
    }
    // --- a dusk flock crossing the sky (tree and house places), a skein of geese over the lake ---
    var flock = null, skein = null;
    if (!rainy && live.small) { flock = { members: [], next: 3 + r() * 6, on: false }; var fc = n(26 * live.small + 6); for (var fi = 0; fi < fc && birds.length < 150; fi++) flock.members.push(bird('starling', { mode: 'flock', fold: 0, ox: (r() - 0.5) * 9, oy: (r() - 0.5) * 3.5, oz: (r() - 0.5) * 7, f1: 0.3 + r() * 0.5, f2: 0.2 + r() * 0.4, y: -999 })); }
    if (!rainy && live.geese && k.water) { skein = { members: [], next: 8 + r() * 10, on: false }; for (var si = 0; si < 9 && birds.length < 150; si++) skein.members.push(bird('goose', { mode: 'flock', fold: 0, slot: si, y: -999 })); }

    // --- leaves drifting where there are trees ---
    var leaves = null, LV = [];
    if (mine.length) {
      var ln = Math.round((rainy ? 14 : 36) * (q0 === 0 ? 0.5 : 1));
      var lg = new T.PlaneGeometry(0.3, 0.2);
      leaves = new T.InstancedMesh(lg, new T.MeshLambertMaterial({ color: 0xffffff, side: T.DoubleSide }), ln);
      leaves.frustumCulled = false; k.root.add(leaves);
      for (var li = 0; li < ln; li++) { LV.push({ c: null, P: 8 + r() * 4, o: r() * 12, ph: r() * 6.28, sp: 0.6 + r() * 0.6, rx: r() * 6.28, rz: r() * 6.28 }); leaves.setColorAt(li, new T.Color().setHSL((30 + r() * 60) / 360, 0.5, 0.3 + r() * 0.15)); }
    }
    // --- moths at the lamps (clear or overcast evenings, where there is green or water) ---
    var moths = null, MT = [];
    // the street module already circles moths round every lamp head; leave these off while it is loaded
    if (live.moths && !rainy && lamps.length && typeof LIFE.street !== 'function') {
      var mn = q0 === 0 ? 10 : 24, mp = new Float32Array(mn * 3);
      var mg = new T.BufferGeometry(); mg.setAttribute('position', new T.BufferAttribute(mp, 3));
      moths = new T.Points(mg, new T.PointsMaterial({ map: k.glowTex, color: 0xfff0d0, size: 0.16, transparent: true, opacity: 0.85, blending: T.AdditiveBlending, depthWrite: false }));
      moths.frustumCulled = false; k.root.add(moths);
      for (var mi = 0; mi < mn; mi++) MT.push({ lamp: -1, a: r() * 6.28, w: (2 + r() * 3) * (r() < 0.5 ? -1 : 1), rad: 0.25 + r() * 0.5, yo: r() * 0.6 - 0.2, ph: r() * 6.28 });
    }

    if (!birds.length && !leaves && !moths) return;

    // ---------- the bird mesh ----------
    var mesh = null, aF = null, NB = birds.length;
    if (NB) {
      var geo = birdGeo(T); aF = new T.InstancedBufferAttribute(new Float32Array(NB * 3), 3); aF.setUsage(T.DynamicDrawUsage); geo.setAttribute('aF', aF);
      mesh = new T.InstancedMesh(geo, birdMat(T), NB); mesh.instanceMatrix.setUsage(T.DynamicDrawUsage); mesh.frustumCulled = false;
      var C = new T.Color(); birds.forEach(function (b, i) { mesh.setColorAt(i, C.setHSL(b.col[0] / 360, b.col[1], b.col[2])); });
      k.root.add(mesh);
    }
    var M = new T.Matrix4(), E = new T.Euler(0, 0, 0, 'YXZ'), S = new T.Vector3(), HIDE = new T.Matrix4().makeScale(0, 0, 0);

    function steer(b, tx, ty, tz, spd, dt, agil) {
      var dx = tx - b.x, dy = ty - b.y, dz = tz - b.z, d = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
      var want = Math.min(spd, d * 1.2 + 0.6), ax = (dx / d * want - b.vx) * agil, ay = (dy / d * want - b.vy) * agil, az = (dz / d * want - b.vz) * agil;
      b.vx += ax * dt; b.vy += ay * dt; b.vz += az * dt;
      // bank into the turn: lateral acceleration against the heading
      var hv = Math.sqrt(b.vx * b.vx + b.vz * b.vz) || 1, lat = (ax * b.vz - az * b.vx) / hv;
      b.roll += (Math.max(-0.9, Math.min(0.9, lat * 0.12)) - b.roll) * Math.min(1, dt * 4);
      return d;
    }
    function orient(b, dt) {
      var hv = Math.sqrt(b.vx * b.vx + b.vz * b.vz);
      if (hv > 0.05) { var ty = Math.atan2(b.vx, b.vz), dy = ty - b.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); b.yaw += dy * Math.min(1, dt * 8); }
      b.pitch += (Math.max(-0.7, Math.min(0.7, -Math.atan2(b.vy, Math.max(hv, 0.3)))) - b.pitch) * Math.min(1, dt * 5);
      b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt;
    }
    function flap(b, dt, beat) { // beat 0..1 how hard; glide holds the wings out, slightly up
      b.ph += dt * b.K.hz * (0.8 + beat * 0.4) * 6.283;
      var amp = b.K.amp * beat, s = Math.sin(b.ph);
      b.inner = 0.12 + amp * s; b.outer = b.inner + amp * 0.55 * Math.sin(b.ph - 0.7) - (b.kind === 'gull' ? 0.22 * (1 - beat) : 0);
      b.fold += (0 - b.fold) * Math.min(1, dt * 10);
    }

    var last = { x: 0, z: 0 };
    k.ticks.push(function (t, dt, cam) {
      dt = Math.max(0, Math.min(dt, 0.1)); // the page's dt can come in negative after a stall
      var cx = cam.x, cy = cam.y, cz = cam.z, i, b;
      // perched, swimming, fleeing, circling, returning
      for (i = 0; i < NB; i++) {
        b = birds[i];
        if (b.mode === 'perch') {
          var ddx = b.hx - cx, ddy = b.hy - cy, ddz = b.hz - cz, dist = Math.sqrt(ddx * ddx + ddy * ddy + ddz * ddz);
          var R = b.flushR;
          if (dist < R && b.tm <= 0) {
            b.mode = 'flee'; b.tm = 1.2 + b.seed * 1.4;
            var hx = ddx, hz = ddz, hl = Math.sqrt(hx * hx + hz * hz) || 1, ang = (b.seed - 0.5) * 1.6, ca = Math.cos(ang), sa = Math.sin(ang);
            var ux = (hx * ca - hz * sa) / hl, uz = (hx * sa + hz * ca) / hl, sp = b.K.spd;
            b.vx = ux * sp * 0.7; b.vz = uz * sp * 0.7; b.vy = sp * 0.55; b.ph = b.seed * 3;
            // where it goes to wait: up and away, over the roofs
            b.ax = b.hx + ux * (8 + b.seed * 8); b.az = b.hz + uz * (8 + b.seed * 8) - 4; b.ay = b.hy + 3 + b.seed * 6;
            // wait over the street, not inside the buildings: the circle stays between the façades unless the water is that side
            var lim = W - 1.5 - (3 + b.seed * 4); if (!(k.water && b.ax * k.water > 0)) b.ax = Math.max(-lim, Math.min(lim, b.ax));
            continue;
          }
          b.tm -= dt;
          b.x = b.hx; b.y = b.hy; b.z = b.hz; b.vx = b.vy = b.vz = 0; b.roll *= 0.8; b.fold += (1 - b.fold) * Math.min(1, dt * 8);
          b.inner = 0.2; b.outer = 0.2;
          // look about; pigeons on the ground peck and shuffle
          var lk = Math.sin(t * (0.7 + b.seed) + b.seed * 20);
          if (lk > 0.93) b.yaw += dt * 3 * (b.seed > 0.5 ? 1 : -1);
          if (b.ground) { var pk = Math.max(0, Math.sin(t * (2.2 + b.seed * 1.5) + b.seed * 40)); b.pitch = pk > 0.75 ? 0.6 : -0.1; if (b.kind === 'pigeon') { b.hz += Math.cos(b.yaw) * dt * 0.08 * (pk < 0.2 ? 1 : 0); b.hx += Math.sin(b.yaw) * dt * 0.08 * (pk < 0.2 ? 1 : 0); } }
          else b.pitch = -0.28;
        } else if (b.mode === 'flee') {
          b.tm -= dt; steer(b, b.ax, b.ay, b.az, b.K.spd, dt, 2.2); flap(b, dt, 1); orient(b, dt);
          if (b.tm <= 0) { b.mode = 'circle'; b.tm = 6 + b.seed * 8; b.ca = Math.atan2(b.z - b.az, b.x - b.ax); }
        } else if (b.mode === 'circle') {
          b.tm -= dt; b.ca += dt * (0.55 + b.seed * 0.3) * (b.seed > 0.5 ? 1 : -1);
          var rad = 3 + b.seed * 4; steer(b, b.ax + Math.cos(b.ca) * rad, b.ay + Math.sin(t * 0.7 + b.seed * 9) * 0.8, b.az + Math.sin(b.ca) * rad, b.K.spd * 0.8, dt, 1.6);
          flap(b, dt, Math.sin(t * 0.9 + b.seed * 30) > 1 - 2 * (1 - b.K.glide) ? 1 : 0.15); orient(b, dt);
          var bx = b.hx - cx, by = b.hy - cy, bz = b.hz - cz;
          if (b.tm <= 0 && Math.sqrt(bx * bx + by * by + bz * bz) > b.flushR * 1.8) b.mode = 'return';
        } else if (b.mode === 'return') {
          var d = steer(b, b.hx, b.hy + 0.02, b.hz, b.K.spd * 0.7, dt, 2.6); flap(b, dt, d > 1.2 ? 0.8 : 0.55); orient(b, dt);
          var rx = b.hx - cx, ry = b.hy - cy, rz = b.hz - cz;
          if (Math.sqrt(rx * rx + ry * ry + rz * rz) < b.flushR) { b.mode = 'circle'; b.tm = 4; }
          else if (d < 0.25) { b.mode = 'perch'; b.tm = 1.5; b.yaw = b.face + (b.seed - 0.5) * 0.8; b.pitch = 0; }
        } else if (b.mode === 'wheel') {
          // gulls: big lazy circles, banked, gliding with a few beats now and then; circles move up the street ahead
          if (b.cz > cz + 20) { b.cz = cz - 30 - b.seed * 45; }
          if (b.cz < cz - 110) { b.cz = cz - 20 - b.seed * 40; }
          b.a = b.a0 + t * b.w;
          var px = b.cx + Math.cos(b.a) * b.rad, pz = b.cz + Math.sin(b.a) * b.rad * 0.8, py = b.h + Math.sin(b.a * 2 + b.seed * 5) * 1.5;
          if (b.y < -100) { b.x = px; b.y = py; b.z = pz; }
          var vx = (px - b.x) / Math.max(dt, 1e-3), vz = (pz - b.z) / Math.max(dt, 1e-3), vy = (py - b.y) / Math.max(dt, 1e-3);
          if (dt > 0) { b.vx = vx; b.vy = vy; b.vz = vz; }
          b.x = px; b.y = py; b.z = pz;
          if (Math.abs(b.vx) + Math.abs(b.vz) > 0.01) b.yaw = Math.atan2(b.vx, b.vz);
          b.pitch = 0; b.roll = -Math.sign(b.w) * 0.5;
          var beatOn = Math.sin(t * 0.8 + b.seed * 40) > 0.72; flap(b, dt, beatOn ? 1 : 0.06);
        } else if (b.mode === 'swim') {
          // drift in small circles; paddle away from a viewer at the railing
          var sx = b.x - cx, sz = b.z - cz, sd = Math.sqrt(sx * sx + sz * sz);
          var tx = b.hx + Math.cos(t * 0.05 + b.seed * 20) * 2.5, tz = b.hz + Math.sin(t * 0.06 + b.seed * 20) * 3;
          var vxs = (tx - b.x) * 0.15, vzs = (tz - b.z) * 0.15;
          if (sd < 6) { vxs += sx / (sd || 1) * 1.2; vzs += sz / (sd || 1) * 1.2; b.hx += sx / (sd || 1) * dt * 0.6; b.hz += sz / (sd || 1) * dt * 0.6; }
          if (Math.abs(b.hx) < W + 1.5) b.hx = k.water * (W + 1.5);
          b.x += vxs * dt; b.z += vzs * dt; if (Math.abs(b.x) < W + 1) b.x = k.water * (W + 1);
          if (Math.abs(vxs) + Math.abs(vzs) > 0.03) { var ty2 = Math.atan2(vxs, vzs), dy2 = Math.atan2(Math.sin(ty2 - b.yaw), Math.cos(ty2 - b.yaw)); b.yaw += dy2 * Math.min(1, dt * 1.5); }
          b.y = wy + 0.06 + Math.sin(t * 1.3 + b.seed * 9) * 0.025; b.pitch = Math.sin(t * 1.1 + b.seed * 7) * 0.04; b.roll = 0; b.fold = 1; b.inner = b.outer = 0.25;
        }
      }
      // the flock: a loose cloud that sweeps across the sky ahead, folding and stretching as it goes
      if (flock) {
        // timed from the clock, not stepped, so a still at any time shows where the flock is
        if (flock.on && (t < flock.t0 || (t - flock.t0) * flock.sp > 128)) { flock.on = false; flock.next = t + 22 + r() * 25; flock.members.forEach(function (m) { m.y = -999; }); }
        if (!flock.on && t >= flock.next) { var dir = r() < 0.5 ? -1 : 1; flock.on = true; flock.dir = dir; flock.z0 = cz - 45 - r() * 30; flock.y = ((k.ST.h && k.ST.h[1]) || 8) + 3.5 + r() * 5; flock.sp = 9 + r() * 3; flock.t0 = t - flock.next < 12 ? flock.next : t; flock.dz = (r() - 0.5) * 3; }
        if (flock.on) {
          flock.x = -flock.dir * 62 + flock.dir * flock.sp * (t - flock.t0); flock.z = flock.z0 + flock.dz * (t - flock.t0);
          var ft = t - flock.t0, wav = Math.sin(ft * 0.6);
          for (i = 0; i < flock.members.length; i++) {
            b = flock.members[i];
            var fx = flock.x + b.ox * (1 + 0.5 * wav) + Math.sin(ft * b.f1 + b.ox) * 2.2, fy = flock.y + b.oy + Math.sin(ft * b.f2 * 2 + b.oz) * 1.4 + wav * b.ox * 0.25, fz = flock.z + b.oz * (1 - 0.35 * wav) + Math.cos(ft * b.f1 * 1.3 + b.oy) * 1.8;
            if (b.y < -100) { b.x = fx - flock.dir * flock.sp * 0.05; b.y = fy; b.z = fz; }
            if (dt > 0 || b.vx === 0) { var ddt = dt || 0.05, nvx = (fx - b.x) / ddt, nvy = (fy - b.y) / ddt, nvz = (fz - b.z) / ddt, ox2 = b.vx, oz2 = b.vz; b.vx = nvx; b.vy = nvy; b.vz = nvz; var hv2 = Math.sqrt(nvx * nvx + nvz * nvz) || 1, turn = ((nvx - ox2) * nvz - (nvz - oz2) * nvx) / hv2 / ddt; b.roll += (Math.max(-0.8, Math.min(0.8, turn * 0.05)) - b.roll) * Math.min(1, ddt * 4); }
            b.x = fx; b.y = fy; b.z = fz; b.yaw = Math.atan2(b.vx, b.vz); b.pitch = Math.max(-0.5, Math.min(0.5, -Math.atan2(b.vy, Math.sqrt(b.vx * b.vx + b.vz * b.vz) || 1)));
            flap(b, dt, Math.sin(t * 1.7 + b.ox * 3) > -0.3 ? 1 : 0.1);
          }
        }
      }
      // the skein: a V of geese crossing high over the lake toward the far shore
      if (skein) {
        if (skein.on && (t < skein.t0 || (t - skein.t0) * 8.5 > 250)) { skein.on = false; skein.next = t + 35 + r() * 30; skein.members.forEach(function (m) { m.y = -999; }); }
        if (!skein.on && t >= skein.next) { skein.on = true; skein.t0 = t - skein.next < 25 ? skein.next : t; skein.z0 = cz - 40 - r() * 30; skein.y = 22 + r() * 6; skein.vx = -k.water * 8.5; skein.vz = -2 - r() * 2; }
        if (skein.on) {
          skein.x = k.water * 120 + skein.vx * (t - skein.t0); skein.z = skein.z0 + skein.vz * (t - skein.t0);
          var hy = Math.atan2(skein.vx, skein.vz), fx2 = Math.sin(hy), fz2 = Math.cos(hy);
          for (i = 0; i < skein.members.length; i++) {
            b = skein.members[i]; var side = b.slot === 0 ? 0 : (b.slot % 2 ? 1 : -1), rank = Math.ceil(b.slot / 2);
            b.x = skein.x - fx2 * rank * 1.9 + fz2 * side * rank * 1.5; b.z = skein.z - fz2 * rank * 1.9 - fx2 * side * rank * 1.5; b.y = skein.y + Math.sin(t * 0.5 + rank) * 0.2;
            b.vx = skein.vx; b.vz = skein.vz; b.vy = 0; b.yaw = hy; b.pitch = 0; b.roll = 0;
            b.ph = t * b.K.hz * 6.283 - rank * 0.9; flap(b, 0, 1);
          }
        }
      }
      // write the instances
      if (mesh) {
        var arr = aF.array;
        for (i = 0; i < NB; i++) {
          b = birds[i];
          if (b.y < -100 || (q0 > 0 && k.quality() === 0 && (i & 1))) { mesh.setMatrixAt(i, HIDE); continue; }
          E.set(b.pitch, b.yaw, b.roll, 'YXZ'); M.makeRotationFromEuler(E); M.scale(S.set(b.sc, b.sc, b.sc)); M.setPosition(b.x, b.y + (b.mode === 'perch' ? 0.12 * b.sc : 0), b.z);
          mesh.setMatrixAt(i, M); arr[i * 3] = b.inner; arr[i * 3 + 1] = b.outer; arr[i * 3 + 2] = b.fold;
        }
        mesh.instanceMatrix.needsUpdate = true; aF.needsUpdate = true;
      }
      // leaves: let go from a canopy near the viewer, tumble down, drift with the wind
      if (leaves) {
        // each leaf runs a fixed cycle on the clock: let go from a canopy near the viewer, tumble down, lie a moment
        for (i = 0; i < LV.length; i++) {
          var lf = LV[i], u = (t + lf.o) / lf.P, cyc = Math.floor(u), f = (u - cyc) * lf.P;
          if (cyc !== lf.c) {
            lf.c = cyc; lf.none = true;
            var near = []; for (var j = 0; j < mine.length; j++) { var tz = mine[j].z - cz; if (mine[j].place !== 'back' && tz < 5 && tz > -28) near.push(mine[j]); }
            if (near.length) { var tr = near[Math.floor(r() * near.length)], a = r() * 6.28; lf.x = tr.x + Math.cos(a) * tr.R * 0.7; lf.z = tr.z + Math.sin(a) * tr.R * 0.7; lf.y = tr.y - r() * tr.R * 0.6; lf.g = k.yAt(lf.z) + 0.17; lf.tf = rainy ? 2.5 : 4.5 + r() * 2.5; lf.none = false; }
          }
          if (lf.none) { leaves.setMatrixAt(i, HIDE); continue; }
          var down = Math.min(f, lf.tf), fy = lf.y - (lf.y - lf.g) * down / lf.tf, w = 2 + lf.sp;
          var fx = lf.x + 0.45 * down + 0.5 * Math.sin(down * w + lf.ph), fz = lf.z - 0.2 * down + 0.4 * Math.cos(down * w * 0.7 + lf.ph);
          if (f < lf.tf) E.set(lf.rx + down * 3 * lf.sp, down * w + lf.ph, lf.rz + down * 2); else E.set(-Math.PI / 2, lf.ph, 0);
          M.makeRotationFromEuler(E); M.setPosition(fx, fy, fz); leaves.setMatrixAt(i, M);
        }
        leaves.instanceMatrix.needsUpdate = true;
      }
      // moths: each picks a lamp near the viewer and loops around its globe
      if (moths) {
        var mp2 = moths.geometry.attributes.position.array, nearL = [];
        for (i = 0; i < lamps.length; i++) { var lz = lamps[i][1] - cz; if (lz < 4 && lz > -30) nearL.push(i); }
        for (i = 0; i < MT.length; i++) {
          var m = MT[i];
          if (m.lamp < 0 || nearL.indexOf(m.lamp) < 0) m.lamp = nearL.length ? nearL[i % nearL.length] : -1;
          if (m.lamp < 0) { mp2[i * 3 + 1] = -999; continue; }
          var lp = lamps[m.lamp]; m.a += dt * m.w;
          mp2[i * 3] = lp[0] + Math.cos(m.a) * m.rad + Math.sin(t * 7 + m.ph) * 0.08; mp2[i * 3 + 1] = 4.55 + k.yAt(lp[1]) + m.yo + Math.sin(t * 5 + m.ph) * 0.15; mp2[i * 3 + 2] = lp[1] + Math.sin(m.a) * m.rad;
        }
        moths.geometry.attributes.position.needsUpdate = true;
      }
    });
  }

  LIFE.nature = { trees: trees, ambient: ambient };
})();

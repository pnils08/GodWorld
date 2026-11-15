// Water and boats. LIFE.water.surface(kit) draws the water and its edge (returns true); LIFE.water.life(kit) adds
// what is on it. Only the four waterside streets have water (k.water = -1 | 1, k.ST.water.kind estuary | lake).
// Canon each piece rests on (docs/canon/INSTITUTIONS.md, Business_Ledger rows):
//   Baylight District  "a 180-slip marina, a ferry terminal, a 1.2-mile public promenade" — marina, ferry, promenade deck
//   Jack London        "the estuary waterfront", Port of Oakland on the ledger — a tug and barge, a pilot boat, a tug at the wharf
//   Brooklyn           "residential rather than spectacle" — one small float of moored boats; Shoreline Kayak & Paddle (ledger) — kayaks
//   Lake Merritt       "historic and settled" — still dark water, a tree-ringed far shore; Lakeside Rowing Club (ledger) — two sculls
// Nothing here paints a word. Draw calls: water 1, edge, piers and far shore 1, lit windows on piers 1, far lights 1
// (+ lake trees 1), one for each kind of vessel on the water (Baylight has ten kinds, the lake one), paddles and oars 1,
// boat and buoy lights 1, wakes 1, foam 1. Vessels are whole shapes (SHAPES), about 500 triangles a boat.
LIFE.water = (function () {
  var Y0 = -0.55, MAXL = 16, PI = Math.PI;
  // [dir x, dir z, wavelength, amplitude, speed]: the first three are the swell boats ride; all six shape the surface
  var WAVES = {
    estuary: [[0.94, 0.34, 24, 0.17, 1], [0.6, -0.8, 11, 0.075, 1], [-0.3, 0.95, 6.5, 0.04, 1], [0.99, -0.12, 3.4, 0.02, 1], [-0.7, -0.7, 2.1, 0.011, 1], [0.2, 0.98, 1.3, 0.006, 1]],
    lake: [[0.8, 0.6, 11, 0.03, 0.7], [-0.5, 0.86, 5.5, 0.012, 0.7], [0.95, -0.3, 3.0, 0.006, 0.7], [0.1, -1, 1.9, 0.004, 0.7], [-0.9, 0.4, 1.2, 0.0024, 0.7], [0.6, 0.8, 0.8, 0.0014, 0.7]]
  };
  function prep(set) { return set.map(function (w) { var l = Math.sqrt(w[0] * w[0] + w[1] * w[1]), kk = 2 * PI / w[2]; return [w[0] / l, w[1] / l, kk, w[3], Math.sqrt(9.8 * kk) * w[4]]; }); }
  // height and slope of the swell at (x, z): the same sums the shader runs, first three waves only
  function swell(W, x, z, t, o) {
    var h = 0, gx = 0, gz = 0;
    for (var i = 0; i < 3; i++) { var w = W[i], ph = w[2] * (w[0] * x + w[1] * z) + w[4] * t, c = Math.cos(ph); h += w[3] * Math.sin(ph); gx += w[3] * w[2] * w[0] * c; gz += w[3] * w[2] * w[1] * c; }
    o[0] = h; o[1] = gx; o[2] = gz; return o;
  }

  // ---------- shaders ----------
  var WATER_VS = [
    'varying vec3 vW;',
    '#include <fog_pars_vertex>',
    'void main(){',
    '  vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz;',
    '  vec4 mvPosition = viewMatrix * w; gl_Position = projectionMatrix * mvPosition;',
    '#include <fog_vertex>',
    '}'].join('\n');
  var WATER_FS = [
    'uniform float t; uniform float nL; uniform float detail; uniform float rain; uniform float sheen; uniform float thin; uniform float tint; uniform float crest;',
    'uniform vec3 low; uniform vec3 top; uniform vec3 glow; uniform vec3 deep;',
    'uniform vec4 wv[6]; uniform float ws[6];',
    'uniform vec4 lp[' + MAXL + ']; uniform vec3 lc[' + MAXL + '];',
    'varying vec3 vW;',
    '#include <fog_pars_fragment>',
    'float hs(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }',
    'vec3 skyAt(vec3 d){ float h = clamp(d.y, 0.0, 1.0); vec3 c = mix(low, top, pow(h, 0.45)); float a = max(dot(normalize(vec3(d.x, d.y * 2.2, d.z)), vec3(0.0, 0.0, -1.0)), 0.0); return c + glow * pow(a, 5.0) * 0.9; }',
    'void main(){',
    '  vec3 V = cameraPosition - vW; float dist = length(V); V /= dist;',
    '  vec2 p = vW.xz; vec2 g = vec2(0.0); float hh = 0.0;',
    // each wave fades out at a distance in proportion to its length: chop up close, long rollers far out
    '  for (int i = 0; i < 6; i++) { vec4 w = wv[i]; float ph = w.z * dot(w.xy, p) + ws[i] * t; float at = 1.0 / (1.0 + dist * w.z / 80.0); g += at * w.w * w.z * w.xy * cos(ph); hh += at * w.z * w.w * sin(ph); }',
    '  float fd = detail * exp(-dist / 38.0);',
    '  if (fd > 0.01) {',
    '    g += fd * 0.045 * vec2(cos(p.x * 9.1 + p.y * 3.3 + t * 3.1), cos(p.y * 8.3 - p.x * 2.1 + t * 2.7));',
    '    g += fd * 0.025 * vec2(cos(p.y * 14.9 + p.x * 4.1 + t * 3.6), cos(p.x * 13.3 - p.y * 5.7 - t * 4.0));',
    '  }',
    '  if (rain > 0.0 && dist < 55.0) {',
    '    for (int j = 0; j < 2; j++) {',
    '      vec2 c = p * (1.4 + float(j) * 0.9) + float(j) * 17.3; vec2 id = floor(c); vec2 f = fract(c) - 0.5;',
    '      float ph = fract(t * 1.3 + hs(id) * 7.0);',
    '      vec2 d = f - (vec2(hs(id + 3.7), hs(id + 9.1)) - 0.5) * 0.5; float r = length(d);',
    '      float ring = exp(-pow((r - ph * 0.42) * 26.0, 2.0)) * (1.0 - ph);',
    '      g += rain * (1.0 - dist / 55.0) * 0.5 * ring * d / max(r, 0.001);',
    '    }',
    '  }',
    '  vec3 n = normalize(vec3(-g.x, 1.0, -g.y));',
    '  float fres = 0.02 + 0.98 * pow(1.0 - max(dot(n, V), 0.0), 5.0);',
    '  vec3 R = reflect(-V, n); R.y = abs(R.y);',
    '  float up = 1.0 + clamp(hh * 7.0, -0.55, 0.55) * (1.0 - smoothstep(40.0, 300.0, dist));',
    // warm where you look toward the sky's glow, deep blue-green looking across or back
    '  float az = max(dot(normalize(vec3(-V.x, 0.0, -V.z) + vec3(0.0, 0.0, -0.001)), vec3(0.0, 0.0, -1.0)), 0.0);',
    '  vec3 body = mix(deep, low * 0.6, tint * (0.3 + 1.4 * az * az));',
    '  vec3 col = mix(body * up, skyAt(R) * sheen, fres);',
    '  col += vec3(0.0, 0.055, 0.05) * crest * clamp(hh * 5.0, 0.0, 1.0) * (1.0 - fres);',
    '  float dl = max(dot(R, normalize(vec3(0.0, 0.06, -1.0))), 0.0);',
    '  col += glow * (pow(dl, 260.0) * 2.6 + pow(dl, 26.0) * 0.28) * (1.0 - rain * 0.6);',
    '  for (int i = 0; i < ' + MAXL + '; i++) {',
    '    if (float(i) >= nL) break;',
    '    vec3 Lv = lp[i].xyz - vW; float ld = length(Lv); Lv /= ld;',
    '    float s = pow(max(dot(n, normalize(Lv + V)), 0.0), 110.0);',
    '    col += lc[i] * s * lp[i].w * (700.0 / (700.0 + ld * ld));',
    '  }',
    '  gl_FragColor = vec4(col, 1.0);',
    '#ifdef USE_FOG',
    '#ifdef FOG_EXP2',
    '  float fz = fogDensity * thin; float ff = 1.0 - exp(-fz * fz * fogDepth * fogDepth);',
    '#else',
    '  float ff = smoothstep(fogNear, fogFar, fogDepth);',
    '#endif',
    '  gl_FragColor.rgb = mix(gl_FragColor.rgb, fogColor, ff);',
    '#endif',
    '}'].join('\n');
  // foam behind a moving boat: additive, fades into the fog instead of turning fog-coloured
  var WAKE_VS = [
    'attribute float a; attribute vec2 u; varying float va; varying vec2 vu;',
    '#include <fog_pars_vertex>',
    'void main(){ va = a; vu = u; vec4 mvPosition = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mvPosition;',
    '#include <fog_vertex>',
    '}'].join('\n');
  var WAKE_FS = [
    'uniform float t; uniform vec3 c; varying float va; varying vec2 vu;',
    '#include <fog_pars_fragment>',
    'float hs(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }',
    'float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(hs(i), hs(i + vec2(1.0, 0.0)), f.x), mix(hs(i + vec2(0.0, 1.0)), hs(i + vec2(1.0, 1.0)), f.x), f.y); }',
    'void main(){',
    '  float e = 1.0 - abs(vu.x * 2.0 - 1.0);',
    '  float n = vn(vec2(vu.x * 5.0, vu.y * 0.9 + t * 0.4)) * 0.6 + vn(vec2(vu.x * 11.0, vu.y * 2.3 - t * 0.7)) * 0.4;',
    '  float a = va * smoothstep(0.0, 0.8, e) * smoothstep(0.3, 0.9, n + e * 0.35);',
    '  float ff = 0.0;',
    '#ifdef USE_FOG',
    '#ifdef FOG_EXP2',
    '  ff = 1.0 - exp(-fogDensity * fogDensity * fogDepth * fogDepth);',
    '#else',
    '  ff = smoothstep(fogNear, fogFar, fogDepth);',
    '#endif',
    '#endif',
    '  gl_FragColor = vec4(c * a * (1.0 - ff), 1.0);',
    '}'].join('\n');

  // ---------- small helpers ----------
  var O3 = null, C3 = null;
  // many of one shape in one draw: items are [x, y, z, sx, sy, sz, rx, ry, rz, hsl]
  function inst(k, geo, mat, items, shadow) {
    var T = k.THREE; O3 = O3 || new T.Object3D(); C3 = C3 || new T.Color();
    if (!items.length) return null;
    var m = new T.InstancedMesh(geo, mat, items.length);
    items.forEach(function (it, i) {
      O3.position.set(it[0], it[1], it[2]); O3.rotation.set(it[6] || 0, it[7] || 0, it[8] || 0, 'YXZ'); O3.scale.set(it[3], it[4], it[5]); O3.updateMatrix();
      m.setMatrixAt(i, O3.matrix); var c = it[9] || [0, 0, 0.5]; m.setColorAt(i, C3.setHSL(c[0] / 360, c[1], c[2]));
    });
    m.castShadow = !!shadow; k.root.add(m); return m;
  }
  function hexRGB(T, hex) { var c = new T.Color(hex); return [c.r, c.g, c.b]; }

  // ---------- boat shapes ----------
  // Every vessel is one shape, bow toward -z, waterline at y = 0, in metres: a hull lofted through cross-sections
  // from stem to stern (sheer, flare, a raked stem, a transom), with her houses, glass, spars and gear built on
  // and painted in. A colour is [r, g, b, paint, glass]: paint 1 takes the boat's own hull colour, glass 1 is lit
  // from inside on a boat whose lights are on (boatMat). One draw per kind of vessel on the water.
  function hsl(T, h, s, l, paint, glass) { var c = new T.Color().setHSL(h / 360, s, l); return [c.r, c.g, c.b, paint || 0, glass || 0]; }
  function shaper(T) {
    var P = [], C = [], A = [], I = [], b = {};
    function vt(x, y, z, c) { P.push(x, y, z); C.push(c[0], c[1], c[2]); A.push(c[3] || 0, c[4] || 0); return P.length / 3 - 1; }
    // a flat face of three or more corners, turned to face away from the point `inside` (both ways when there is none)
    function face(q, c, inside) {
      var ux = q[1][0] - q[0][0], uy = q[1][1] - q[0][1], uz = q[1][2] - q[0][2], vx = q[2][0] - q[0][0], vy = q[2][1] - q[0][1], vz = q[2][2] - q[0][2];
      var nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      var flip = inside ? nx * (q[0][0] - inside[0]) + ny * (q[0][1] - inside[1]) + nz * (q[0][2] - inside[2]) < 0 : false;
      function put(rev) { var i0 = P.length / 3, n; (rev ? q.slice().reverse() : q).forEach(function (p) { vt(p[0], p[1], p[2], c); }); for (n = 1; n + 1 < q.length; n++) I.push(i0, i0 + n, i0 + n + 1); }
      put(flip); if (!inside) put(true);
    }
    // st: sections from bow to stern, each [z, [[x, y, dz], ...]]: half the outline, from the centre line on top
    // round to the centre line below. bands[j] is the colour between outline points j and j + 1; a run of one
    // colour is shaded as one rounded surface. ends[0 | 1] closes the bow | stern end across the beam: true for
    // every band, or the list of bands to draw there.
    b.loft = function (st, bands, ends) {
      var n = st.length, m = bands.length, j0 = 0, i, j, sd;
      while (j0 < m) {
        var j1 = j0; while (j1 + 1 < m && bands[j1 + 1] === bands[j0]) j1++;
        for (sd = -1; sd <= 1; sd += 2) {
          var base = P.length / 3, w = j1 - j0 + 2;
          for (i = 0; i < n; i++) for (j = j0; j <= j1 + 1; j++) { var p = st[i][1][j]; vt(sd * p[0], p[1], st[i][0] + (p[2] || 0), bands[j0]); }
          for (i = 0; i < n - 1; i++) for (j = 0; j < w - 1; j++) {
            var a = base + i * w + j, lo = a + 1, d = a + w, c = d + 1;
            if (sd > 0) I.push(a, c, lo, a, d, c); else I.push(a, lo, c, a, c, d);
          }
        }
        j0 = j1 + 1;
      }
      (ends || []).forEach(function (on, e) {
        if (!on) return;
        var s = st[e ? n - 1 : 0], z = s[0];
        for (j = 0; j < m; j++) {
          var p0 = s[1][j], p1 = s[1][j + 1]; if (p0[1] - p1[1] < 1e-4 || (on !== true && on.indexOf(j) < 0)) continue;
          var tl = vt(-p0[0], p0[1], z + (p0[2] || 0), bands[j]), tr = vt(p0[0], p0[1], z + (p0[2] || 0), bands[j]), br = vt(p1[0], p1[1], z + (p1[2] || 0), bands[j]), bl = vt(-p1[0], p1[1], z + (p1[2] || 0), bands[j]);
          if (e) I.push(tl, bl, br, tl, br, tr); else I.push(tl, br, bl, tl, tr, br);
        }
      });
    };
    // a hull. o: L length over all, B beam, f freeboard amidships, d draught, rise | aft how far the sheer lifts at
    // the bow | stern, ent | run where the bow stops widening and the stern starts narrowing (0 stem .. 1 stern),
    // full how bluff the bow (1 fine .. 0.45 bluff), tr transom width as a share of the beam (0 a pointed stern),
    // fl the waterline beam at the bow as a share of the deck's (flare), rake how far the stem head overhangs,
    // rh | rw the height and thickness of the rail or bulwark, well how far the deck sits below the sheer (an
    // open boat), boot the height of the waterline stripe. c: deck, rail, side, boot, bottom.
    // Returns y(z) the deck's height and w(z) its half-width at z.
    b.hull = function (o, c) {
      var n = o.n || 11, st = [], i, L = o.L, hb = o.B / 2, ent = o.ent, run = o.run == null ? ent : o.run, rh = o.rh == null ? 0.06 : o.rh, rw = o.rw || 0.08, rake = o.rake || 0, z0 = -L / 2 + rake, zl = L - rake;
      function at(u) {
        var w = u < ent ? Math.pow(Math.sin(PI / 2 * u / ent), o.full || 0.8) : u > run ? 1 - (1 - o.tr) * Math.pow((u - run) / (1 - run), 2) : 1;
        return [Math.max(0.02, hb * w), o.f + (u < ent ? o.rise * Math.pow(1 - u / ent, 2) : u > run ? (o.aft || 0) * Math.pow((u - run) / (1 - run), 2) : 0)];
      }
      for (i = 0; i < n; i++) {
        var u = Math.pow(i / (n - 1), 1.25), q = at(u), bw = q[0], y1 = q[1], top = y1 + rh, dk = y1 - (o.well || 0), bt = o.boot || 0.14;
        var fore = Math.max(0, 1 - u / (ent * 0.7)), wl = Math.max(0.02, bw * 0.95 * (1 - (1 - o.fl) * fore * fore)), rk = rake * Math.pow(Math.max(0, 1 - u / (ent * 0.5)), 2);
        var keel = o.d * (0.3 + 0.7 * Math.min(1, u / (ent * 0.6))) * (u > run ? 1 - 0.6 * (u - run) / (1 - run) : 1), inn = Math.max(0.01, bw - rw), xb = wl + (bw - wl) * bt / top;
        var lean = function (y) { return -rk * y / top; };
        st.push([z0 + u * zl, [[0, dk + (o.crown == null ? 0.04 : o.crown) * bw, lean(dk)], [inn, dk, lean(dk)], [inn, top, lean(top)], [bw, top, lean(top)], [xb, bt, lean(bt)], [wl, 0, 0], [wl * 0.6, -keel * 0.75, rk * 0.3], [0, -keel, rk * 0.5]]]);
      }
      b.loft(st, [c.deck, c.rail, c.rail, c.side, c.boot, c.bottom, c.bottom], [null, o.tr > 0.05 ? [3, 4, 5, 6] : null]);
      function uOf(z) { return Math.max(0, Math.min(1, (z - z0) / zl)); }
      return { y: function (z) { return at(uOf(z))[1] - (o.well || 0); }, w: function (z) { return at(uOf(z))[0] - rw; }, top: function (z) { return at(uOf(z))[1] + rh; } };
    };
    // a house on deck from z0 (its front) to z1, standing on y0 with its roof at y1, w its half-width at the
    // foot. o: tw how much narrower at the roof, g0 | g1 the glass band's heights above the foot, rf | rb how far
    // the front | back leans in above the glass sill, nf the front's width as a share of the back's. c: roof, wall, glass.
    b.house = function (z0, z1, y0, y1, w, o, c) {
      var g0 = y0 + o.g0, g1 = y0 + o.g1, tw = o.tw == null ? 0.1 : o.tw;
      function sec(z, lean, f) {
        function x(y) { return (w - tw * (y - y0) / (y1 - y0)) * f; }
        function dz(y) { return lean * Math.max(0, (y - g0) / (y1 - g0)); }
        return [z, [[0, y1 + (o.crown == null ? 0.05 : o.crown), dz(y1)], [x(y1), y1, dz(y1)], [x(g1), g1, dz(g1)], [x(g0), g0, 0], [x(y0), y0, 0]]];
      }
      b.loft([sec(z0, o.rf || 0, o.nf || 1), sec(z1, -(o.rb || 0), 1)], [c.roof, c.wall, c.glass, c.wall], [true, true]);
    };
    // a bar from a to e, w across and h deep (upright, w runs fore and aft)
    b.bar = function (a, e, w, h, c) {
      var dx = e[0] - a[0], dy = e[1] - a[1], dz = e[2] - a[2], l = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1, up = Math.abs(dy) > 0.9 * l ? [1, 0, 0] : [0, 1, 0];
      dx /= l; dy /= l; dz /= l;
      var sx = dy * up[2] - dz * up[1], sy = dz * up[0] - dx * up[2], sz = dx * up[1] - dy * up[0], sl = Math.sqrt(sx * sx + sy * sy + sz * sz); sx /= sl; sy /= sl; sz /= sl;
      var tx = sy * dz - sz * dy, ty = sz * dx - sx * dz, tz = sx * dy - sy * dx;
      function cn(p, q) { return [p[0] + (sx * q[0] * w + tx * q[1] * h) / 2, p[1] + (sy * q[0] * w + ty * q[1] * h) / 2, p[2] + (sz * q[0] * w + tz * q[1] * h) / 2]; }
      var mid = [(a[0] + e[0]) / 2, (a[1] + e[1]) / 2, (a[2] + e[2]) / 2], K = [[-1, -1], [1, -1], [1, 1], [-1, 1]], A0 = K.map(function (q) { return cn(a, q); }), E0 = K.map(function (q) { return cn(e, q); });
      for (var i = 0; i < 4; i++) { var j = (i + 1) % 4; face([A0[i], A0[j], E0[j], E0[i]], c, mid); }
      face(A0, c, mid); face(E0, c, mid);
    };
    b.box = function (w, h, d, x, y, z, c) { b.bar([x, y, z - d / 2], [x, y, z + d / 2], w, h, c); };
    // a round post or stack standing on (x, y, z): radius r0 at the foot, r1 at the top
    b.cyl = function (r0, r1, h, x, y, z, c, n) {
      n = n || 8; var i0 = P.length / 3, i, a, top = [];
      for (i = 0; i < n; i++) { a = i / n * 2 * PI; vt(x + Math.cos(a) * r0, y, z + Math.sin(a) * r0, c); vt(x + Math.cos(a) * r1, y + h, z + Math.sin(a) * r1, c); top.push([x + Math.cos(a) * r1, y + h, z + Math.sin(a) * r1]); }
      for (i = 0; i < n; i++) { var p = i0 + i * 2, q = i0 + ((i + 1) % n) * 2; I.push(p, p + 1, q + 1, p, q + 1, q); }
      face(top, c, [x, y, z]);
    };
    // a thin sheet seen from both sides: a sail, a screen, a deck laid over an open hull
    b.sheet = function (pts, c) { face(pts, c, null); };
    // a stretch of deck laid over a hull from zA to zB at the height of her rail
    b.decked = function (H, zA, zB, c) {
      var pts = [], i, z;
      for (i = 0; i <= 5; i++) { z = zA + (zB - zA) * i / 5; pts.push([H.w(z) + 0.02, H.top(z) + 0.01, z]); }
      for (i = 5; i >= 0; i--) { z = zA + (zB - zA) * i / 5; pts.push([-H.w(z) - 0.02, H.top(z) + 0.01, z]); }
      for (i = 0; i < 5; i++) face([pts[i], pts[i + 1], pts[10 - i], pts[11 - i]], c, null);
    };
    b.end = function () {
      var g = new T.BufferGeometry();
      g.setAttribute('position', new T.Float32BufferAttribute(P, 3)); g.setAttribute('color', new T.Float32BufferAttribute(C, 3)); g.setAttribute('aPaint', new T.Float32BufferAttribute(A, 2));
      g.setIndex(I); g.computeVertexNormals(); P = []; C = []; A = []; I = [];
      return g;
    };
    return b;
  }
  // the paint every vessel wears: the hull colour is the boat's own, glass is lit from inside when her lights are on
  function boatMat(T, thin) {
    var m = new T.MeshLambertMaterial({ color: 0xffffff, vertexColors: true });
    m.onBeforeCompile = function (sh) {
      sh.vertexShader = 'attribute vec2 aPaint;\nattribute float aLit;\nvarying float vGlass;\n' + sh.vertexShader.replace('#include <color_vertex>', '#include <color_vertex>\n#ifdef USE_INSTANCING_COLOR\n\tvColor.xyz = color.xyz * mix(vec3(1.0), instanceColor.xyz, aPaint.x);\n#endif\n\tvGlass = aPaint.y * aLit;');
      sh.fragmentShader = 'varying float vGlass;\n' + sh.fragmentShader.replace('#include <envmap_fragment>', '\toutgoingLight += vColor * vec3(0.1, 0.11, 0.14);\n\toutgoingLight = mix(outgoingLight, vec3(1.0, 0.8, 0.46), vGlass);\n#include <envmap_fragment>');
      // (paint keeps a little of its own colour after dark: the docks' lamps are glows, not lights, and a white hull should stay pale against the water)
      // a ship a long way off thins into the fog slowly, so she still reads from the street
      if (thin) sh.fragmentShader = sh.fragmentShader.replace('#include <fog_fragment>', T.ShaderChunk.fog_fragment.replace('fogDensity * fogDensity', '(fogDensity * 0.3) * (fogDensity * 0.3)'));
    };
    m.customProgramCacheKey = function () { return thin ? 'lifeWaterBoatThin' : 'lifeWaterBoat'; };
    return m;
  }
  function paints(T) {
    return {
      SIDE: [1, 1, 1, 1, 0], WHITE: hsl(T, 45, 0.1, 0.86), CREAM: hsl(T, 42, 0.3, 0.78), DECK: hsl(T, 40, 0.12, 0.64), TEAK: hsl(T, 28, 0.45, 0.34), GREY: hsl(T, 215, 0.06, 0.45),
      BOOT: hsl(T, 220, 0.2, 0.07), RED: hsl(T, 4, 0.6, 0.28), DARK: hsl(T, 220, 0.12, 0.1), STEEL: hsl(T, 212, 0.08, 0.66), SPAR: hsl(T, 210, 0.06, 0.74), GLASS: [0.05, 0.07, 0.1, 0, 1],
      CANVAS: hsl(T, 216, 0.5, 0.28), TAN: hsl(T, 34, 0.4, 0.5), SAIL: hsl(T, 44, 0.25, 0.88), SKIN: hsl(T, 28, 0.35, 0.42), ORANGE: hsl(T, 22, 0.8, 0.5), RUST: hsl(T, 18, 0.35, 0.22), SIDE2: [0.78, 0.78, 0.78, 1, 0], JACKET: [0.07, 0.11, 0.2, 0, 0]
    };
  }
  var RED_L = 0xff3b30, GRN_L = 0x3dff6e;
  var SHAPES = {};
  // a sloop: `set` under sail, else moored with the main furled under its cover and the jib rolled on the stay
  function sloop(T, b, cover, set) {
    var c = paints(T), dk = 0.8, mz = -0.9, Hm = 11, ft = dk + 0.4, top = ft + Hm;
    var H = b.hull({ L: 9, B: 2.9, f: dk, d: 0.45, rise: 0.3, aft: 0.05, ent: 0.56, full: 0.85, tr: 0.6, fl: 0.6, rake: 0.8 }, { deck: c.DECK, rail: c.TEAK, side: c.SIDE, boot: c.BOOT, bottom: c.RED });
    b.house(-2.3, 1.0, dk, dk + 0.46, 0.92, { tw: 0.14, g0: 0.16, g1: 0.34, rf: 0.6, rb: 0.06, nf: 0.6 }, { roof: c.WHITE, wall: c.WHITE, glass: c.GLASS });
    // the cockpit: a teak sole between its coamings, the wheel's pedestal
    b.box(1.3, 0.04, 2.3, 0, dk + 0.04, 2.5, c.TEAK); [-1, 1].forEach(function (s) { b.box(0.09, 0.24, 2.3, s * 0.72, dk + 0.13, 2.5, c.WHITE); });
    b.box(0.12, 0.8, 0.12, 0, dk + 0.44, 3.0, c.STEEL); b.box(0.74, 0.08, 0.05, 0, dk + 0.84, 2.94, c.STEEL);
    // mast, spreaders, boom, backstay and shrouds
    b.bar([0, ft, mz], [0, top, mz], 0.18, 0.13, c.SPAR); b.box(1.7, 0.05, 0.09, 0, ft + Hm * 0.55, mz, c.SPAR); b.box(0.1, 0.13, 3.7, 0, ft + 1.15, mz + 1.95, c.SPAR);
    b.bar([0, top - 0.1, mz], [0, H.y(4.3) + 0.1, 4.35], 0.035, 0.035, c.DARK);
    [-1, 1].forEach(function (s) { b.bar([s * 0.85, ft + Hm * 0.55, mz], [0, top - 0.3, mz], 0.03, 0.03, c.DARK); b.bar([s * 0.85, ft + Hm * 0.55, mz], [s * 1.25, dk + 0.05, mz + 0.1], 0.03, 0.03, c.DARK); });
    var stem = [0, H.top(-4.4) + 0.08, -4.42], hound = [0, ft + Hm * 0.92, mz - 0.06];
    if (set) {
      // the mainsail with its roach, the jib, both bellied to leeward (+x)
      var tack = [0, ft + 1.3, mz + 0.12], clew = [0.5, ft + 1.3, mz + 3.6], head = [0, top - 0.25, mz + 0.12];
      b.sheet([tack, clew, [0.55, ft + Hm * 0.42, mz + 2.75], [0.38, ft + Hm * 0.72, mz + 1.55], head], c.SAIL);
      b.sheet([stem, [0.55, dk + 0.75, mz + 0.5], [0.3, ft + Hm * 0.5, mz - 0.9], hound], c.SAIL);
    } else {
      b.box(0.3, 0.3, 3.3, 0, ft + 1.37, mz + 1.95, cover);
      b.bar(stem, hound, 0.14, 0.14, c.SAIL);
    }
    return { geo: b.end(), len: 9, beam: 2.9, lights: set ? [[-1.2, 1.05, -3.3, RED_L, 0.3], [1.2, 1.05, -3.3, GRN_L, 0.3], [0, 1.1, 4.4, 0xffffff, 0.4]] : [[0, top + 0.12, mz, 0xfff4e0, 0.5]] };
  }
  SHAPES.sloop = function (T, b) { return sloop(T, b, paints(T).CANVAS); };
  SHAPES.sloopTan = function (T, b) { return sloop(T, b, paints(T).TAN); };
  SHAPES.sloopSet = function (T, b) { return sloop(T, b, null, true); };
  // a motor cruiser: `fly` with a flybridge under a hard top, else a lower express boat under a radar arch
  function cruiser(T, b, fly) {
    var c = paints(T), dk = 1.05, hw = { roof: c.WHITE, wall: c.WHITE, glass: c.GLASS }, top = dk + (fly ? 1.25 : 1.05);
    var H = b.hull({ L: 10, B: 3.4, f: dk, d: 0.5, rise: 0.5, ent: 0.42, run: 0.75, full: 0.72, tr: 0.92, fl: 0.5, rake: 1.3, rh: 0.07 }, { deck: c.DECK, rail: c.WHITE, side: c.SIDE, boot: c.BOOT, bottom: c.RED });
    b.house(-3.5, -1.7, dk, dk + 0.36, 1.0, { tw: 0.1, g0: 0.12, g1: 0.27, rf: 0.7, nf: 0.45 }, hw);
    b.house(-2.0, 2.0, dk, top, 1.42, { tw: 0.2, g0: 0.48, g1: top - dk - 0.22, rf: fly ? 1.25 : 1.7, rb: 0.12, nf: 0.86 }, hw);
    if (fly) {
      // the flybridge: its coaming, a screen, a hard top on four posts
      b.house(-0.3, 2.0, top, top + 0.42, 1.2, { tw: 0.04, g0: 0.42, g1: 0.42, rf: 0.25, crown: 0 }, { roof: c.DECK, wall: c.WHITE, glass: c.WHITE });
      b.sheet([[-1.02, top + 0.42, -0.05], [1.02, top + 0.42, -0.05], [0.92, top + 0.86, 0.22], [-0.92, top + 0.86, 0.22]], c.GLASS);
      b.box(2.5, 0.08, 2.3, 0, top + 1.95, 1.0, c.WHITE);
      [-1, 1].forEach(function (s) { b.bar([s * 1.08, top + 0.42, 0.25], [s * 1.12, top + 1.92, 0.1], 0.06, 0.06, c.STEEL); b.bar([s * 1.08, top + 0.42, 1.9], [s * 1.12, top + 1.92, 1.95], 0.06, 0.06, c.STEEL); });
    } else {
      [-1, 1].forEach(function (s) { b.bar([s * 1.36, dk + 0.1, 2.25], [s * 1.2, top + 0.7, 1.95], 0.3, 0.08, c.WHITE); });
      b.box(2.56, 0.1, 0.34, 0, top + 0.72, 1.95, c.WHITE);
    }
    // the cockpit's teak, a swim platform, the rail round the bow
    b.box(2.7, 0.04, 2.5, 0, dk + 0.04, 3.55, c.TEAK); b.box(2.9, 0.08, 0.6, 0, 0.3, 5.25, c.TEAK);
    [-1, 1].forEach(function (s) {
      var a = [s * H.w(-1.2), H.top(-1.2) + 0.55, -1.2], m = [s * H.w(-3.2), H.top(-3.2) + 0.58, -3.2], e = [0, H.top(-4.75) + 0.62, -4.8];
      b.bar(a, m, 0.045, 0.045, c.STEEL); b.bar(m, e, 0.045, 0.045, c.STEEL);
      [a, m].forEach(function (p) { b.bar([p[0], p[1] - 0.57, p[2]], p, 0.04, 0.04, c.STEEL); });
    });
    var lt = fly ? top + 2.15 : top + 0.95;
    return { geo: b.end(), len: 10, beam: 3.4, lights: [[0, lt, fly ? 1.0 : 1.95, 0xfff4e0, 0.5]] };
  }
  SHAPES.cruiser = function (T, b) { return cruiser(T, b, true); };
  SHAPES.express = function (T, b) { return cruiser(T, b, false); };
  // someone standing at a wheel or sitting at their oars: generic, not a citizen
  function crew(b, c, x, y, z, sit) {
    var s = sit ? 0 : 0.85;
    if (!sit) b.box(0.34, 0.85, 0.22, x, y + 0.43, z, c.DARK);
    b.box(0.42, 0.58, 0.26, x, y + s + 0.29, z, c.JACKET); b.box(0.21, 0.23, 0.21, x, y + s + 0.71, z, c.SKIN);
  }
  // an open launch: a decked bow, a console under a canvas top, an outboard
  SHAPES.launch = function (T, b) {
    var c = paints(T), so = 0.3;
    var H = b.hull({ L: 6.5, B: 2.4, f: 0.72, d: 0.3, rise: 0.3, ent: 0.45, run: 0.8, full: 0.75, tr: 0.94, fl: 0.55, rake: 0.7, rw: 0.12, well: 0.42 }, { deck: c.GREY, rail: c.WHITE, side: c.SIDE, boot: c.BOOT, bottom: c.RED });
    b.decked(H, -3.1, -1.3, c.WHITE);
    b.box(0.85, 0.95, 0.55, 0, so + 0.475, 0.2, c.WHITE); b.sheet([[-0.4, so + 0.95, 0], [0.4, so + 0.95, 0], [0.36, so + 1.38, 0.15], [-0.36, so + 1.38, 0.15]], c.GLASS);
    b.box(1.5, 0.07, 1.8, 0, so + 2.05, 0.5, c.CANVAS);
    [-1, 1].forEach(function (s) { [-0.25, 1.2].forEach(function (z) { b.bar([s * 0.5, so, z], [s * 0.68, so + 2.02, z], 0.05, 0.05, c.STEEL); }); });
    crew(b, c, 0, so, 0.85);
    b.box(0.42, 0.62, 0.4, 0, 0.9, 3.38, c.DARK); b.box(0.36, 0.2, 0.34, 0, 1.3, 3.38, c.GREY);
    b.bar([0, so + 2.08, 1.3], [0, so + 2.6, 1.3], 0.05, 0.05, c.STEEL);
    return { geo: b.end(), len: 6.5, beam: 2.4, lights: [[0, so + 2.7, 1.3, 0xffffff, 0.6], [-0.95, 0.98, -2.2, RED_L, 0.3], [0.95, 0.98, -2.2, GRN_L, 0.3]] };
  };
  // a harbour work boat: bulwarks, tyres down her sides, a wheelhouse forward, an open deck and a frame aft
  SHAPES.workboat = function (T, b) {
    var c = paints(T), dk = 0.85, hw = { roof: c.CREAM, wall: c.CREAM, glass: c.GLASS };
    var H = b.hull({ L: 8, B: 2.9, f: dk, d: 0.5, rise: 0.4, ent: 0.4, run: 0.8, full: 0.6, tr: 0.95, fl: 0.7, rake: 0.4, rh: 0.32, rw: 0.1 }, { deck: c.GREY, rail: c.DARK, side: c.SIDE, boot: c.BOOT, bottom: c.RED });
    b.house(-2.5, -0.3, dk, dk + 1.95, 1.05, { tw: 0.06, g0: 1.0, g1: 1.65, rf: -0.22, rb: 0.04 }, hw);
    b.box(2.3, 0.07, 2.6, 0, dk + 2.02, -1.45, c.CREAM);
    b.bar([0, dk + 2.05, -1.2], [0, dk + 3.3, -1.2], 0.07, 0.07, c.STEEL); b.box(0.7, 0.05, 0.06, 0, dk + 2.95, -1.2, c.STEEL);
    [-1, 1].forEach(function (s) {
      [-1.6, 0.4, 2.3].forEach(function (z) { b.box(0.16, 0.55, 0.55, s * (H.w(z) + 0.2), dk + 0.1, z, c.DARK); });
      b.bar([s * 1.05, dk, 3.4], [s * 0.75, dk + 2.2, 3.1], 0.09, 0.09, c.ORANGE);
    });
    b.box(1.6, 0.09, 0.09, 0, dk + 2.2, 3.1, c.ORANGE); b.box(0.8, 0.5, 0.9, 0, dk + 0.25, 1.4, c.GREY);
    return { geo: b.end(), len: 8, beam: 2.9, lights: [[0, dk + 3.42, -1.2, 0xffffff, 0.6], [-1.3, 1.25, -2.6, RED_L, 0.3], [1.3, 1.25, -2.6, GRN_L, 0.3]] };
  };
  // a harbour tug, bow up, her wheelhouse over a deckhouse, the stack behind it, tyres round her; `barge` with a deck
  // barge of boxes lashed ahead of her
  function tug(T, b, barge) {
    var c = paints(T), dk = 1.15, hw = { roof: c.WHITE, wall: c.WHITE, glass: c.GLASS };
    var H = b.hull({ L: 11, B: 4.4, f: dk, d: 0.9, rise: 0.95, aft: 0.25, ent: 0.38, run: 0.72, full: 0.5, tr: 0.72, fl: 0.8, rake: 0.5, rh: 0.45, rw: 0.12 }, { deck: c.RUST, rail: c.DARK, side: c.SIDE, boot: c.BOOT, bottom: c.RED });
    b.house(-2.7, 1.5, dk, dk + 1.5, 1.45, { tw: 0.05, g0: 0.78, g1: 1.12, rf: 0.1 }, hw);
    b.house(-2.3, 0.3, dk + 1.5, dk + 3.0, 1.15, { tw: 0.1, g0: 0.68, g1: 1.26, rf: -0.22, rb: 0.05 }, hw);
    b.box(2.7, 0.08, 3.1, 0, dk + 3.08, -1.05, c.WHITE);
    b.cyl(0.46, 0.4, 1.7, 0, dk + 1.5, 0.95, c.DARK, 10); b.cyl(0.47, 0.45, 0.4, 0, dk + 2.3, 0.95, c.SIDE, 10);
    b.bar([0, dk + 3.1, -0.9], [0, dk + 5.3, -0.9], 0.1, 0.1, c.STEEL); b.box(1.2, 0.06, 0.07, 0, dk + 4.6, -0.9, c.STEEL);
    // the towing bitts and winch aft, tyres down both sides and across the bow
    b.box(1.0, 0.7, 0.8, 0, dk + 0.35, 2.7, c.DARK); [-1, 1].forEach(function (s) { b.box(0.16, 0.8, 0.16, s * 0.5, dk + 0.4, 3.7, c.DARK); }); b.box(1.3, 0.14, 0.14, 0, dk + 0.62, 3.7, c.DARK);
    [-1, 1].forEach(function (s) { [-3.2, -1.6, 0, 1.6, 3.2, 4.6].forEach(function (z) { b.box(0.18, 0.66, 0.66, s * (H.w(z) + 0.24), H.top(z) - 0.42, z, c.DARK); }); });
    var lights = [[0, dk + 5.4, -0.9, 0xffffff, 0.6], [0, dk + 4.8, -0.9, 0xffffff, 0.6], [-2.3, 3.3, -1, RED_L, 0.5], [2.3, 3.3, -1, GRN_L, 0.5], [0, dk + 3.5, 1.8, 0xffd9a0, 1.2]];
    if (barge) {
      // the barge: a steel box with raked ends, a rubbing band, a few boxes on deck
      var bz = -6.2 - 18, cc = [hsl(T, 6, 0.55, 0.32), hsl(T, 212, 0.45, 0.3), hsl(T, 170, 0.35, 0.28), hsl(T, 28, 0.6, 0.38), hsl(T, 0, 0, 0.55)], i, j;
      var sec = function (z, lift) { return [bz + z, [[0, 1.32, 0], [4.3, 1.3, 0], [4.3, 0.9, 0], [4.34, 0.9, 0], [4.34, 0.62, 0], [4.3, 0.62, 0], [4.3, lift, 0], [0, lift, 0]]]; };
      b.loft([sec(-18, 0.75), sec(-13.5, -0.6), sec(13.5, -0.6), sec(18, 0.75)], [c.RUST, c.DARK, c.BOOT, c.BOOT, c.BOOT, c.DARK, c.RED], [true, true]);
      for (i = 0; i < 4; i++) for (j = 0; j < 2; j++) if ((i + j) % 3 !== 2) b.box(2.44, 2.55, 6.1, (j - 0.5) * 2.7, 1.3 + 1.3, bz - 12 + i * 7.4, cc[(i * 2 + j * 3) % cc.length]);
      [-1, 1].forEach(function (s) { [-16, -6, 6, 16].forEach(function (z) { b.box(0.3, 0.4, 0.3, s * 3.9, 1.5, bz + z, c.DARK); }); });
      lights.push([-4.1, 1.9, bz - 17.6, 0xffb340, 0.5], [4.1, 1.9, bz - 17.6, 0xffb340, 0.5]);
    }
    return { geo: b.end(), len: 11, beam: 4.4, lights: lights };
  }
  SHAPES.tug = function (T, b) { return tug(T, b, false); };
  SHAPES.tow = function (T, b) { return tug(T, b, true); };
  // a pilot boat: a dark hull with an orange band, an orange house, a mast with her white-over-red
  SHAPES.pilot = function (T, b) {
    var c = paints(T), dk = 1.0, hw = { roof: c.WHITE, wall: c.ORANGE, glass: c.GLASS };
    var H = b.hull({ L: 9, B: 3.2, f: dk, d: 0.6, rise: 0.5, ent: 0.45, run: 0.8, full: 0.7, tr: 0.9, fl: 0.55, rake: 0.9, rh: 0.14, rw: 0.1 }, { deck: c.GREY, rail: c.ORANGE, side: c.SIDE, boot: c.BOOT, bottom: c.RED });
    b.house(-2.2, 1.5, dk, dk + 1.75, 1.2, { tw: 0.16, g0: 0.85, g1: 1.45, rf: 0.7, rb: 0.2, nf: 0.85 }, hw);
    b.bar([0, dk + 1.8, 0.6], [0, dk + 3.4, 0.9], 0.09, 0.09, c.STEEL); b.box(1.0, 0.1, 0.16, 0, dk + 2.5, 0.75, c.WHITE);
    [-1, 1].forEach(function (s) { b.bar([s * 0.95, dk + 1.95, -1.2], [s * 0.95, dk + 1.95, 1.3], 0.04, 0.04, c.STEEL); b.bar([s * H.w(2.6), H.top(2.6) + 0.5, 1.7], [s * H.w(4.3), H.top(4.3) + 0.5, 4.3], 0.04, 0.04, c.STEEL); });
    return { geo: b.end(), len: 9, beam: 3.2, lights: [[0, dk + 3.5, 0.9, 0xffffff, 0.8], [0, dk + 3.0, 0.85, 0xff3b30, 0.8], [-1.6, 1.6, -2, RED_L, 0.3], [1.6, 1.6, -2, GRN_L, 0.3]] };
  };
  // the ferry: two decks of windows, an open deck aft of the upper one, the wheelhouse on top with its wings, two stacks
  SHAPES.ferry = function (T, b) {
    var c = paints(T), dk = 1.9, hw = { roof: c.WHITE, wall: c.WHITE, glass: c.GLASS }, band = hsl(T, 212, 0.35, 0.5), z, s;
    var H = b.hull({ L: 30, B: 9, f: dk, d: 1.2, rise: 1.0, ent: 0.3, run: 0.86, full: 0.7, tr: 0.92, fl: 0.6, rake: 2.4, rh: 0.3, rw: 0.2, boot: 0.3, n: 13 }, { deck: c.GREY, rail: band, side: c.SIDE, boot: c.WHITE, bottom: c.RED });
    b.house(-9.6, 12.6, dk, dk + 2.7, 4.0, { tw: 0, g0: 0.95, g1: 1.95, rf: 1.5, nf: 0.8, crown: 0 }, hw);
    b.house(-6.2, 7.4, dk + 2.7, dk + 5.0, 3.3, { tw: 0, g0: 0.8, g1: 1.65, rf: 1.2, nf: 0.86, crown: 0.04 }, hw);
    b.house(-7.4, -3.8, dk + 5.0, dk + 6.7, 2.1, { tw: 0.12, g0: 0.6, g1: 1.3, rf: 0.7, rb: 0.1 }, hw);
    b.box(7.0, 0.1, 1.5, 0, dk + 5.05, -5.4, c.WHITE);
    // the posts between her windows, the rail round the open deck, two stacks, the mast
    for (s = -1; s <= 1; s += 2) {
      for (z = -7.2; z < 12.5; z += 1.7) b.box(0.1, 1.04, 0.42, s * 4.02, dk + 1.45, z, c.WHITE);
      for (z = -4.4; z < 7.4; z += 1.7) b.box(0.1, 0.9, 0.42, s * 3.32, dk + 3.92, z, c.WHITE);
      b.bar([s * 3.9, dk + 3.7, 7.4], [s * 3.9, dk + 3.7, 12.5], 0.06, 0.06, c.WHITE);
      for (z = 7.6; z < 12.6; z += 1.6) b.bar([s * 3.9, dk + 2.7, z], [s * 3.9, dk + 3.7, z], 0.05, 0.05, c.WHITE);
      b.cyl(0.5, 0.42, 1.9, s * 1.7, dk + 5.0, 5.4, c.SIDE, 10); b.cyl(0.44, 0.44, 0.3, s * 1.7, dk + 6.9, 5.4, c.DARK, 10);
      for (z = 8.6; z < 12; z += 1.5) b.box(1.6, 0.42, 0.5, s * 1.6, dk + 2.92, z, band);
    }
    b.bar([-3.9, dk + 3.7, 12.5], [3.9, dk + 3.7, 12.5], 0.06, 0.06, c.WHITE);
    b.bar([0, dk + 6.75, -5.2], [0, dk + 9.4, -4.9], 0.16, 0.16, c.STEEL); b.box(2.2, 0.08, 0.1, 0, dk + 8.4, -5.0, c.STEEL); b.box(1.5, 0.14, 0.22, 0, dk + 7.5, -5.1, c.WHITE);
    return { geo: b.end(), len: 30, beam: 9, lights: [[0, dk + 9.55, -4.9, 0xffffff, 1.2], [-4.6, dk + 2.3, -8, RED_L, 0.8], [4.6, dk + 2.3, -8, GRN_L, 0.8], [0, dk + 1.5, 15.1, 0xffffff, 0.8], [0, dk + 4.6, 10, 0xffd9a0, 1.6]] };
  };
  // a sea kayak and a racing scull: needles pointed at both ends, someone sitting in each (their blades are parts that move)
  SHAPES.kayak = function (T, b) {
    var c = paints(T);
    b.hull({ L: 4.6, B: 0.68, f: 0.22, d: 0.1, rise: 0.1, aft: 0.08, ent: 0.5, full: 1, tr: 0, fl: 0.9, rake: 0.3, rh: 0.01, rw: 0.02, crown: 0.3, boot: 0.04, n: 9 }, { deck: c.SIDE2, rail: c.SIDE, side: c.SIDE, boot: c.SIDE, bottom: c.SIDE });
    b.box(0.5, 0.06, 0.85, 0, 0.33, 0.25, c.DARK); crew(b, c, 0, 0.22, 0.3, true);
    return { geo: b.end(), len: 4.6, beam: 0.68, lights: [[0, 1.12, 0.15, 0xfff6e8, 0.3]] };
  };
  SHAPES.scull = function (T, b) {
    var c = paints(T);
    b.hull({ L: 8.2, B: 0.48, f: 0.16, d: 0.08, rise: 0.03, aft: 0.02, ent: 0.5, full: 1.1, tr: 0, fl: 1, rake: 0.1, rh: 0.01, rw: 0.02, crown: 0.25, boot: 0.03, n: 9 }, { deck: c.SIDE2, rail: c.SIDE, side: c.SIDE, boot: c.SIDE, bottom: c.SIDE });
    crew(b, c, 0, 0.2, 0.3, true);
    [-1, 1].forEach(function (s) { b.bar([s * 0.2, 0.22, 0.1], [s * 0.78, 0.3, 0.1], 0.05, 0.03, c.STEEL); });
    return { geo: b.end(), len: 8.2, beam: 0.48, lights: [[0, 0.32, 4.0, 0xffffff, 0.3]] };
  };
  // a channel buoy: a float, a tapering tower, the lamp on top; all her own colour
  SHAPES.buoy = function (T, b) {
    var c = paints(T);
    b.cyl(0.78, 0.78, 0.85, 0, -0.35, 0, c.SIDE, 10); b.cyl(0.52, 0.2, 1.55, 0, 0.5, 0, c.SIDE2, 8); b.cyl(0.16, 0.16, 0.34, 0, 2.05, 0, c.DARK, 6);
    return { geo: b.end(), len: 1.56, beam: 1.56, lights: [] };
  };
  // a container ship. o: L, B, stack(bay, row) how many boxes high, light: riding high with her red bottom showing
  function shipShape(T, b, o) {
    var c = paints(T), L = o.L, B = o.B, f = 6.6, hz = L / 2 - 13, hw = { roof: c.WHITE, wall: c.WHITE, glass: c.GLASS }, i, j, bay, row;
    var cc = [hsl(T, 6, 0.55, 0.32), hsl(T, 212, 0.45, 0.3), hsl(T, 170, 0.35, 0.28), hsl(T, 28, 0.6, 0.38), hsl(T, 0, 0, 0.55), hsl(T, 140, 0.25, 0.28), hsl(T, 350, 0.45, 0.28)];
    b.hull({ L: L, B: B, f: f, d: 2, rise: 2.6, aft: 0.6, ent: 0.2, run: 0.85, full: 0.6, tr: 0.82, fl: 0.5, rake: L * 0.06, rh: 0.9, rw: 0.35, boot: o.light ? 2.4 : 0.9, n: 13 }, { deck: c.RUST, rail: c.SIDE, side: c.SIDE, boot: c.RED, bottom: c.RED });
    // the house aft: four decks of windows, the bridge across the top with its wings, the stack behind it
    for (i = 0; i < 4; i++) b.house(hz - 4.5, hz + 4.5, f + i * 2.7, f + (i + 1) * 2.7, B / 2 - 1.3, { tw: 0, g0: 1.45, g1: 1.95, crown: 0 }, hw);
    b.house(hz - 5, hz + 2, f + 10.8, f + 13.5, B / 2 + 0.9, { tw: 0, g0: 1.3, g1: 2.0, rf: 0.5, crown: 0.05 }, hw);
    b.cyl(1.9, 1.6, 5.4, 0, f + 10.8, hz + 6.2, c.SIDE, 10); b.cyl(1.66, 1.62, 0.9, 0, f + 15.4, hz + 6.2, c.DARK, 10);
    b.bar([0, f + 13.5, hz - 2], [0, f + 18, hz - 2], 0.4, 0.4, c.WHITE); b.box(5, 0.2, 0.3, 0, f + 16.6, hz - 2, c.WHITE);
    b.bar([0, f + 2.4, -L / 2 + 5], [0, f + 10, -L / 2 + 5.5], 0.4, 0.4, c.WHITE);
    var rows = Math.max(3, Math.floor((B - 2) / 2.6)), bays = Math.max(1, Math.floor((L - 44) / 13));
    for (bay = 0; bay < bays; bay++) for (row = 0; row < rows; row++) { var hh = o.stack(bay, row); for (j = 0; j < hh; j++) b.box(2.44, 2.55, 12.2, (row - (rows - 1) / 2) * 2.6, f + 1.4 + j * 2.6, -L / 2 + 20 + bay * 13, cc[(bay * 7 + row * 3 + j * 5) % cc.length]); }
    return b.end();
  }
  SHAPES.ship = function (T, b) { return { geo: shipShape(T, b, { L: 110, B: 16, stack: function (bay, row) { return 1 + (bay * 3 + row * 5) % 3; } }), len: 110, beam: 16, lights: [] }; };
  function bez(a, b, c, d, u) { var v = 1 - u; return v * v * v * a + 3 * v * v * u * b + 3 * v * u * u * c + u * u * u * d; }
  function bezD(a, b, c, d, u) { var v = 1 - u; return 3 * v * v * (b - a) + 6 * v * u * (c - b) + 3 * u * u * (d - c); }

  // ---------- the fleet: one draw per kind of vessel, their moving parts in one more, posed each frame ----------
  var HULLS = [[45, 0.08, 0.86], [45, 0.08, 0.86], [45, 0.1, 0.8], [40, 0.28, 0.74], [220, 0.5, 0.24], [160, 0.35, 0.22], [210, 0.06, 0.7], [8, 0.5, 0.32]];
  function makeFleet(k, S) {
    var T = k.THREE, F = { list: [], k: k, S: S, kinds: {}, meshes: [] }, b = shaper(T);
    // a vessel of one kind (SHAPES), `len` long: her shape and her lights are scaled to her length
    F.vessel = function (kind, len, o) {
      var M = F.kinds[kind] || (F.kinds[kind] = SHAPES[kind](T, b)), s = len ? len / M.len : 1, key;
      var v = { kind: kind, sc: s, len: M.len * s, beam: M.beam * s, hull: [0, 0, 1], glass: 0, parts: [], lights: M.lights.map(function (l) { return [l[0] * s, l[1] * s, l[2] * s].concat(l.slice(3)); }) };
      for (key in (o || {})) v[key] = o[key];
      return v;
    };
    F.add = function (v) { v.calm = v.calm == null ? 1 : v.calm; v.ph = k.r() * 6.28; F.list.push(v); return v; };
    F.build = function () {
      var np = 0, nL = 0, M = new T.Matrix4(), Q = new T.Quaternion(), E = new T.Euler(), P = new T.Vector3(), Sc = new T.Vector3(), by = {}, c = new T.Color(), mat = boatMat(T);
      F.ZERO = new T.Matrix4().makeScale(0, 0, 0);
      F.list.forEach(function (v) {
        v.pm = v.parts.map(function (p) { return part(p); });
        v.i0 = [np, nL]; np += v.parts.length; nL += v.lights.length;
        if (v.kind) (by[v.kind] = by[v.kind] || []).push(v);
      });
      function part(p) {
        var m = new T.Matrix4();
        m.compose(P.set(p[0], p[1], p[2]), Q.identity(), Sc.set(p[3], p[4], p[5]));
        return p.pivot ? { m: m, pivot: p.pivot, anim: p.anim, base: m.clone() } : { m: m };
      }
      Object.keys(by).forEach(function (kind) {
        var vs = by[kind], g = F.kinds[kind].geo, m = new T.InstancedMesh(g, mat, vs.length), lit = new Float32Array(vs.length);
        vs.forEach(function (v, i) { v.mesh = m; v.mi = i; v.ms = new T.Matrix4().makeScale(v.sc, v.sc, v.sc); lit[i] = v.glass ? 1 : 0; m.setColorAt(i, c.setHSL(v.hull[0] / 360, v.hull[1], v.hull[2])); m.setMatrixAt(i, F.ZERO); });
        g.setAttribute('aLit', new T.InstancedBufferAttribute(lit, 1));
        m.castShadow = true; m.frustumCulled = false; k.root.add(m); F.meshes.push(m);
      });
      // paddles and oars: boxes that swing
      F.tops = new T.InstancedMesh(new T.BoxGeometry(1, 1, 1), new T.MeshLambertMaterial({ color: 0xffffff }), Math.max(1, np));
      F.tops.setMatrixAt(0, F.ZERO);
      F.list.forEach(function (v) { v.parts.forEach(function (p, j) { var h = p[6]; F.tops.setColorAt(v.i0[0] + j, c.setHSL(h[0] / 360, h[1], h[2])); }); });
      F.tops.castShadow = true; F.tops.frustumCulled = false; k.root.add(F.tops);
      // boat lights: one cloud of glow points, moved with the boats
      var lp = new Float32Array(Math.max(1, nL) * 3), lc = new Float32Array(Math.max(1, nL) * 3);
      F.blinkers = [];
      F.list.forEach(function (v) { v.lights.forEach(function (l, j) { var q = (v.i0[1] + j) * 3; c.set(l[3]); lc[q] = c.r; lc[q + 1] = c.g; lc[q + 2] = c.b; if (l[5]) F.blinkers.push([q, c.r, c.g, c.b, l[5], l[6] || 0]); }); });
      var lg = new T.BufferGeometry(); lg.setAttribute('position', new T.BufferAttribute(lp, 3)); lg.setAttribute('color', new T.BufferAttribute(lc, 3));
      F.pts = new T.Points(lg, new T.PointsMaterial({ map: k.glowTex, vertexColors: true, size: 1.5, transparent: true, opacity: 0.95, blending: T.AdditiveBlending, depthWrite: false }));
      F.pts.frustumCulled = false; k.root.add(F.pts);
      F.M = M; F.Q = Q; F.E = E; F.P = P; F.Sc = Sc; F.MV = new T.Matrix4(); F.MT = new T.Matrix4(); F.MA = new T.Matrix4(); F.V3 = new T.Vector3(); F.sw = [0, 0, 0];
    };
    F.pose = function (t) {
      var W = S.W, sw = F.sw, MV = F.MV, MT = F.MT, lp = F.pts.geometry.attributes.position.array, fr = S.ferry, j;
      for (var i = 0; i < F.list.length; i++) {
        var v = F.list[i];
        if (v.go) v.go(t, v); // moving boats set x, z, yaw, spd, hide
        if (v.hide) {
          if (v.mesh) v.mesh.setMatrixAt(v.mi, F.ZERO);
          for (j = 0; j < v.pm.length; j++) F.tops.setMatrixAt(v.i0[0] + j, F.ZERO);
          for (j = 0; j < v.lights.length; j++) lp[(v.i0[1] + j) * 3 + 1] = -500;
          continue;
        }
        swell(W, v.x, v.z, t, sw);
        var cy = Math.cos(v.yaw), sy = Math.sin(v.yaw), across = sw[1] * cy - sw[2] * sy, along = -sw[1] * sy - sw[2] * cy, cm = v.calm;
        var roll = (Math.atan(across) * 1.3 + Math.sin(t * 1.7 + v.ph) * 0.012) * cm * (v.len < 15 ? 1 : 0.35) + (v.heel || 0);
        // the ferry's wash, rolling through the moored boats as she passes
        if (fr && fr !== v && !fr.hide && fr.spd > 0.4 && v.len < 15) { var dx = v.x - fr.x, dz = v.z - fr.z, dw = Math.sqrt(dx * dx + dz * dz); if (dw < 160) roll += 0.07 * Math.min(1, fr.spd / 6) * Math.exp(-dw / 60) * Math.sin(dw * 0.35 - t * 2.4); }
        var pitch = Math.atan(along) * 0.6 * cm * (v.len < 15 ? 1 : 0.4);
        F.E.set(pitch, v.yaw, roll, 'YXZ'); F.Q.setFromEuler(F.E);
        MV.compose(F.P.set(v.x, Y0 + sw[0] * cm * 0.8 + (v.lift || 0), v.z), F.Q, F.Sc.set(1, 1, 1));
        if (v.mesh) { MT.multiplyMatrices(MV, v.ms); v.mesh.setMatrixAt(v.mi, MT); }
        for (j = 0; j < v.pm.length; j++) { var pm = v.pm[j]; if (pm.anim) { anim(pm, t, v); } MT.multiplyMatrices(MV, pm.m); F.tops.setMatrixAt(v.i0[0] + j, MT); }
        for (j = 0; j < v.lights.length; j++) { var l = v.lights[j], q = (v.i0[1] + j) * 3; F.V3.set(l[0], l[1], l[2]).applyMatrix4(MV); lp[q] = F.V3.x; lp[q + 1] = F.V3.y; lp[q + 2] = F.V3.z; }
      }
      for (i = 0; i < F.meshes.length; i++) F.meshes[i].instanceMatrix.needsUpdate = true;
      F.tops.instanceMatrix.needsUpdate = true;
      F.pts.geometry.attributes.position.needsUpdate = true;
      // flashing lights (buoys, breakwater ends): light[5] = period, light[6] = offset
      if (F.blinkers.length) { var ca = F.pts.geometry.attributes.color.array; for (i = 0; i < F.blinkers.length; i++) { var bl = F.blinkers[i], on = ((t + bl[5]) % bl[4]) < 0.7 ? 1 : 0.04; ca[bl[0]] = bl[1] * on; ca[bl[0] + 1] = bl[2] * on; ca[bl[0] + 2] = bl[3] * on; } F.pts.geometry.attributes.color.needsUpdate = true; }
    };
    // a part that swings about a pivot (oars, paddles): pivot is [x, y, z] in the boat, anim(t, v) -> [rx, ry, rz]
    function anim(pm, t, v) {
      var r = pm.anim(t, v); F.E.set(r[0], r[1], r[2], 'YXZ'); F.Q.setFromEuler(F.E);
      F.MA.compose(F.P.set(pm.pivot[0], pm.pivot[1], pm.pivot[2]), F.Q, F.Sc.set(1, 1, 1));
      F.MT.compose(F.P.set(-pm.pivot[0], -pm.pivot[1], -pm.pivot[2]), F.Q.identity(), F.Sc.set(1, 1, 1));
      pm.m.multiplyMatrices(F.MA, F.MT.multiply(pm.base));
    }
    return F;
  }

  // ---------- wakes: two arms and a churned centre behind every boat under way, one draw ----------
  function makeWakes(k, F) {
    var T = k.THREE, movers = F.list.filter(function (v) { return v.wake; }), N = 54, per = N * 3 * 6, total = Math.max(1, movers.length * per);
    if (!movers.length) return null;
    var pos = new Float32Array(total * 3), al = new Float32Array(total), uv = new Float32Array(total * 2);
    var g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(pos, 3)); g.setAttribute('a', new T.BufferAttribute(al, 1)); g.setAttribute('u', new T.BufferAttribute(uv, 2));
    var mat = new T.ShaderMaterial({ uniforms: T.UniformsUtils.merge([T.UniformsLib.fog, { t: { value: 0 }, c: { value: new T.Color(0.62, 0.68, 0.74) } }]), vertexShader: WAKE_VS, fragmentShader: WAKE_FS, fog: true, transparent: true, depthWrite: false, side: T.DoubleSide, blending: T.AdditiveBlending });
    var mesh = new T.Mesh(g, mat); mesh.frustumCulled = false; k.root.add(mesh);
    movers.forEach(function (v) { v.hist = []; v.lastS = -1; });
    var vi = 0;
    function quad(ax, az, bx, bz, cx, cz, dx, dz, aa, ab, ua, ub) { // a-b one sample (left, right), c-d the next
      var y = Y0 + 0.05;
      [[ax, az, aa, 0, ua], [bx, bz, aa, 1, ua], [cx, cz, ab, 0, ub], [bx, bz, aa, 1, ua], [dx, dz, ab, 1, ub], [cx, cz, ab, 0, ub]].forEach(function (q) {
        pos[vi * 3] = q[0]; pos[vi * 3 + 1] = y; pos[vi * 3 + 2] = q[1]; al[vi] = q[2]; uv[vi * 2] = q[3]; uv[vi * 2 + 1] = q[4]; vi++;
      });
    }
    return {
      mat: mat,
      update: function (t) {
        vi = 0; mat.uniforms.t.value = t;
        movers.forEach(function (v) {
          var H = v.hist;
          if (v.hide) { H.length = 0; return; }
          if (H.length && Math.abs(H[0].x - v.x) + Math.abs(H[0].z - v.z) > 40) H.length = 0;
          if (t - v.lastS >= 0.3 || t < v.lastS) { H.unshift({ x: v.x, z: v.z, yaw: v.yaw, s: v.spd, t: t }); v.lastS = t; if (H.length > N) H.length = N; }
          var A = v.wakeAge || 12, pts = [{ x: v.x, z: v.z, yaw: v.yaw, s: v.spd, t: t }].concat(H.slice(1)), dist = 0;
          for (var i = 0; i + 1 < pts.length; i++) {
            var a = pts[i], b = pts[i + 1], ga = t - a.t, gb = t - b.t; if (gb > A) break;
            var st = function (p, g) { var sx = Math.sin(p.yaw), cz = Math.cos(p.yaw); return { x: p.x + sx * v.len * 0.48, z: p.z + cz * v.len * 0.48, px: Math.cos(p.yaw), pz: -Math.sin(p.yaw), f: Math.pow(Math.max(0, 1 - g / A), 1.6) * Math.min(1, p.s / 3.5) }; };
            var sa = st(a, ga), sb = st(b, gb), seg = Math.sqrt((sa.x - sb.x) * (sa.x - sb.x) + (sa.z - sb.z) * (sa.z - sb.z)), d0 = dist; dist += seg;
            if (sa.f < 0.01 && sb.f < 0.01) continue;
            var B = v.beam;
            // churned water straight behind
            var wa = B * 0.3 + ga * 0.55, wb = B * 0.3 + gb * 0.55;
            quad(sa.x - sa.px * wa, sa.z - sa.pz * wa, sa.x + sa.px * wa, sa.z + sa.pz * wa, sb.x - sb.px * wb, sb.z - sb.pz * wb, sb.x + sb.px * wb, sb.z + sb.pz * wb, sa.f * 0.55, sb.f * 0.55, d0, dist);
            // the two arms, opening at about 19 degrees
            [-1, 1].forEach(function (sd) {
              var oa = sd * (B * 0.45 + ga * a.s * 0.34), ob = sd * (B * 0.45 + gb * b.s * 0.34), ha = 0.35 + ga * 0.3, hb = 0.35 + gb * 0.3;
              quad(sa.x + sa.px * (oa - ha), sa.z + sa.pz * (oa - ha), sa.x + sa.px * (oa + ha), sa.z + sa.pz * (oa + ha), sb.x + sb.px * (ob - hb), sb.z + sb.pz * (ob - hb), sb.x + sb.px * (ob + hb), sb.z + sb.pz * (ob + hb), sa.f * 0.5, sb.f * 0.5, d0 * 1.7, dist * 1.7);
            });
          }
        });
        g.setDrawRange(0, vi);
        g.attributes.position.needsUpdate = g.attributes.a.needsUpdate = g.attributes.u.needsUpdate = true;
      }
    };
  }

  // ---------- foam: a lapping rim round everything that stands in the water, one draw ----------
  // Each instance is a flat quad round a footprint: fa = (half x, half z, strength, corner radius). The rim is a
  // band outside a rounded box; it laps with the swell, and a ring of wash spreads from the ferry while she moves.
  var FOAM_M = 2.4;
  var FOAM_VS = [
    'attribute vec4 fa; varying vec2 vL; varying vec4 vA; varying vec2 vP;',
    '#include <fog_pars_vertex>',
    'void main(){ vA = fa; vL = position.xz * 2.0 * (fa.xy + ' + FOAM_M.toFixed(1) + ');',
    '  vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.0); vP = w.xz;',
    '  vec4 mvPosition = viewMatrix * w; gl_Position = projectionMatrix * mvPosition;',
    '#include <fog_vertex>',
    '}'].join('\n');
  var FOAM_FS = [
    'uniform float t; uniform vec3 c; uniform vec4 wash; varying vec2 vL; varying vec4 vA; varying vec2 vP;',
    '#include <fog_pars_fragment>',
    'float hs(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }',
    'float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(hs(i), hs(i + vec2(1.0, 0.0)), f.x), mix(hs(i + vec2(0.0, 1.0)), hs(i + vec2(1.0, 1.0)), f.x), f.y); }',
    'void main(){',
    '  vec2 q = abs(vL) - vA.xy + vA.w; float d = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - vA.w;',
    '  if (d < -0.1) discard;',
    '  float w = 0.0;',
    '  if (wash.z > 0.0) { float dw = length(vP - wash.xy); w = wash.z * exp(-dw / 70.0) * max(sin(dw * 0.35 - t * 2.4), 0.0); }',
    '  float n = vn(vP * 1.2 + vec2(t * 0.25, -t * 0.2)) * 0.6 + vn(vP * 3.1 - vec2(t * 0.45, t * 0.35)) * 0.4;',
    '  float lap = 0.62 + 0.38 * sin(t * 1.25 + dot(vP, vec2(0.23, 0.15)));',
    '  float band = exp(-max(d, 0.0) * (2.6 - w));',
    '  float a = (vA.z * 1.5 + w * 0.8) * band * smoothstep(0.25, 0.8, n * lap + band * 0.45) * (1.0 - smoothstep(' + (FOAM_M * 0.6).toFixed(2) + ', ' + FOAM_M.toFixed(1) + ', d));',
    '  float ff = 0.0;',
    '#ifdef USE_FOG',
    '#ifdef FOG_EXP2',
    '  ff = 1.0 - exp(-fogDensity * fogDensity * fogDepth * fogDepth);',
    '#else',
    '  ff = smoothstep(fogNear, fogFar, fogDepth);',
    '#endif',
    '#endif',
    '  gl_FragColor = vec4(c * a * (1.0 - ff), 1.0);',
    '}'].join('\n');
  function makeFoam(k, S, F) {
    var T = k.THREE, st = S.foam, ves = F.list.filter(function (v) { return v.fo; }), n = st.length + ves.length;
    if (!n) return null;
    var geo = new T.PlaneGeometry(1, 1); geo.rotateX(-PI / 2);
    var fa = new Float32Array(n * 4); geo.setAttribute('fa', new T.InstancedBufferAttribute(fa, 4));
    var mat = new T.ShaderMaterial({ uniforms: T.UniformsUtils.merge([T.UniformsLib.fog, { t: { value: 0 }, c: { value: new T.Color(0.78, 0.84, 0.88) }, wash: { value: new T.Vector4(0, 0, 0, 0) } }]), vertexShader: FOAM_VS, fragmentShader: FOAM_FS, fog: true, transparent: true, depthWrite: false, blending: T.AdditiveBlending });
    var m = new T.InstancedMesh(geo, mat, n), O = new T.Object3D(), y = Y0 + 0.04;
    function put(i, x, z, yaw, hx, hz, str, rad) {
      O.position.set(x, y, z); O.rotation.set(0, yaw, 0); O.scale.set(2 * (hx + FOAM_M), 1, 2 * (hz + FOAM_M)); O.updateMatrix(); m.setMatrixAt(i, O.matrix);
      fa[i * 4] = hx; fa[i * 4 + 1] = hz; fa[i * 4 + 2] = str; fa[i * 4 + 3] = rad;
    }
    // static: [x, z, width x, length z, strength, corner radius]
    st.forEach(function (f, i) { put(i, f[0], f[1], 0, f[2] / 2, f[3] / 2, f[4], Math.min(f[5] || 0.2, f[2] / 2, f[3] / 2)); });
    m.frustumCulled = false; k.root.add(m);
    var o = st.length;
    return {
      mesh: m,
      update: function (t) {
        mat.uniforms.t.value = t;
        var fr = S.ferry;
        if (fr && !fr.hide && fr.spd > 0.4) mat.uniforms.wash.value.set(fr.x, fr.z, Math.min(1, fr.spd / 6), 0); else mat.uniforms.wash.value.z = 0;
        for (var i = 0; i < ves.length; i++) {
          var v = ves[i];
          if (v.hide) { O.scale.set(0, 0, 0); O.updateMatrix(); m.setMatrixAt(o + i, O.matrix); continue; }
          put(o + i, v.x, v.z, v.yaw, v.beam / 2, v.len / 2, v.fo + Math.min(0.5, (v.spd || 0) * 0.08), v.beam / 2);
        }
        m.instanceMatrix.needsUpdate = true; geo.attributes.fa.needsUpdate = true;
      }
    };
  }

  // ---------- paths ----------
  // up or down a straight lane along the street, wrapping out of sight in the fog
  function lane(x, zA, zB, speed, t0) {
    var len = Math.abs(zB - zA), dir = zB < zA ? -1 : 1;
    return function (t, v) { var d = ((t + t0) * speed) % len; v.x = x; v.z = zA + dir * d; v.yaw = dir < 0 ? 0 : PI; v.spd = speed; v.hide = false; };
  }
  // round and round a long oval, counter-clockwise from above when dir = 1
  function oval(cx, cz, rx, rz, speed, t0, dir) {
    var per = 2 * PI * Math.sqrt((rx * rx + rz * rz) / 2) / speed;
    return function (t, v) {
      var a = dir * 2 * PI * (t + t0) / per, dx = -Math.sin(a) * rx * dir, dz = Math.cos(a) * rz * dir;
      v.x = cx + Math.cos(a) * rx; v.z = cz + Math.sin(a) * rz; v.yaw = Math.atan2(-dx, -dz); v.spd = speed; v.hide = false;
    };
  }

  // ---------- the ferry: comes in from open water, berths at the terminal, waits, leaves ----------
  // Period 150 s, timed so a flight that starts at the head of the street sees it come in, sit at the
  // float as the camera passes, and pull away (t = 0 is 18 s into the approach).
  function ferryRun(sd, berth) {
    var bx = berth[0], bz = berth[1];
    var IN = [[sd * 470, -10], [sd * 190, -70], [bx, bz + 30], berth], OUT = [berth, [bx, bz - 30], [sd * 70, bz - 50], [sd * 120, bz - 58]], OUT2 = [[sd * 120, bz - 58], [sd * 170, bz - 66], [sd * 300, bz - 40], [sd * 480, bz + 10]];
    var TA = 58, TD = 26, TL = 42, PER = 150, SH = 18;
    function along(C, u) { return [bez(C[0][0], C[1][0], C[2][0], C[3][0], u), bez(C[0][1], C[1][1], C[2][1], C[3][1], u), bezD(C[0][0], C[1][0], C[2][0], C[3][0], u), bezD(C[0][1], C[1][1], C[2][1], C[3][1], u)]; }
    return function (t, v) {
      var p = ((t + SH) % PER + PER) % PER, q, u, s, dsdt;
      v.hide = false;
      if (p < TA) { u = p / TA; s = 1 - Math.pow(1 - u, 2.2); dsdt = 2.2 * Math.pow(1 - u, 1.2) / TA; q = along(IN, s); }
      else if (p < TA + TD) { q = along(IN, 1); dsdt = 0; }
      else if (p < TA + TD + TL) { u = (p - TA - TD) / TL; s = Math.pow(u, 1.8); dsdt = 1.8 * Math.pow(u, 0.8) / TL * 2; q = s < 0.5 ? along(OUT, s * 2) : along(OUT2, s * 2 - 1); }
      else { v.hide = true; v.spd = 0; return; }
      v.x = q[0]; v.z = q[1];
      var dl = Math.sqrt(q[2] * q[2] + q[3] * q[3]);
      if (dl > 1e-3) v.yaw = Math.atan2(-q[2], -q[3]);
      v.spd = dl * dsdt; v.docked = p >= TA && p < TA + TD;
    };
  }

  // ---------- the surface ----------
  function surface(k) {
    var T = k.THREE, sd = k.water, lake = !!(k.ST.water && k.ST.water.kind === 'lake'), q = k.quality(), WALK = k.WALK, L = k.L, warm = k.warm;
    var W = prep(WAVES[lake ? 'lake' : 'estuary']);
    var S = { T: T, W: W, lake: lake, stat: [], statLit: [], lightsStatic: [], foam: [], sights: [], q: q };
    k._water = S;
    var dull = k.WX === 'clear' ? 1 : 0.35;
    // the sky's own colours, so the water reflects the sky that is there
    var SK = (typeof skyMat !== 'undefined' && skyMat && skyMat.uniforms) ? skyMat.uniforms : null;
    var low = SK ? SK.low.value.clone() : new T.Color().setHSL(warm / 360, 0.5 * dull, 0.2);
    var top = SK ? SK.top.value.clone() : new T.Color().setHSL(0.62, 0.55 * dull, 0.09);
    var glow = SK ? SK.glow.value.clone() : new T.Color().setHSL(warm / 360, (warm > 180 ? 0.6 : 0.95) * dull, (warm > 180 ? 0.42 : 0.56) * (k.WX === 'clear' ? 1 : 0.5));
    var deep = new T.Color().setHSL((lake ? 212 : 188) / 360, lake ? 0.4 : 0.5, lake ? 0.035 : 0.06);
    var geo = new T.PlaneGeometry(720, L + 900, 1, 1); geo.rotateX(-PI / 2);
    var mat;
    if (q === 0) mat = new T.MeshBasicMaterial({ color: deep.clone().lerp(low, 0.35) });
    else {
      var u = T.UniformsUtils.merge([T.UniformsLib.fog, { t: { value: 0 }, nL: { value: 0 }, detail: { value: lake ? 0.45 : 1 }, rain: { value: k.WX === 'rain' ? 1 : 0 }, sheen: { value: 1 }, thin: { value: k.WX === 'fog' || k.WX === 'rain' ? 1 : lake ? 0.6 : 0.75 }, tint: { value: lake ? 0.05 : 0.25 }, crest: { value: lake ? 0.15 : 1 } }]);
      u.low = { value: low }; u.top = { value: top }; u.glow = { value: glow }; u.deep = { value: deep };
      u.wv = { value: W.map(function (w) { return new T.Vector4(w[0], w[1], w[2], w[3]); }) }; u.ws = { value: W.map(function (w) { return w[4]; }) };
      var lps = [], lcs = []; for (var i = 0; i < MAXL; i++) { lps.push(new T.Vector4(0, -100, 0, 0)); lcs.push(new T.Vector3()); }
      u.lp = { value: lps }; u.lc = { value: lcs };
      mat = new T.ShaderMaterial({ uniforms: u, vertexShader: WATER_VS, fragmentShader: WATER_FS, fog: true });
    }
    var sea = new T.Mesh(geo, mat); sea.position.set(sd * (WALK + 360), Y0, -L / 2 + 30); k.root.add(sea);
    S.sea = sea; S.mat = q === 0 ? null : mat;

    // the edge: a quay wall down to the water, and on top of it a promenade rail (Baylight), a plain rail (estuary), or a low stone coping (lake)
    var z0 = 40, z1 = -L - 50, zc = (z0 + z1) / 2, zl = z0 - z1, st = S.stat, gap = null;
    if (k.ST.set && k.ST.set.indexOf('pergola') >= 0) gap = [-L * 0.5 - 15.5, -L * 0.5 + 15.5];
    var baylight = /Baylight/.test(k.H.name), edge = baylight ? WALK + 4 : WALK;
    S.edge = edge;
    st.push([sd * (edge + 0.2), (0.16 + Y0 - 1.4) / 2, zc, 0.4, 0.16 - Y0 + 1.4, zl, 0, 0, 0, [30, 0.06, 0.3]]);
    S.foam.push([sd * (edge + 0.2), zc, 0.4, zl, lake ? 0.07 : 0.24]);
    if (gap) S.foam.push([sd * (WALK + 6), -L * 0.5, 11, 30.5, 0.12, 0.5]);
    if (baylight) {
      // the public promenade: a timber deck out over the water, glass rail on its outer edge, low lights in the deck
      st.push([sd * (WALK + 2), 0.08, zc, 4, 0.16, zl, 0, 0, 0, [28, 0.22, 0.3]]);
      st.push([sd * (edge - 0.05), 0.65, zc, 0.06, 0.9, zl, 0, 0, 0, [205, 0.12, 0.24]]);
      st.push([sd * (edge - 0.05), 1.12, zc, 0.12, 0.06, zl, 0, 0, 0, [210, 0.06, 0.6]]);
      for (var bz = 30; bz > z1 + 20; bz -= 9) k.glow(sd * (edge - 0.4), 0.35, bz, 0xffe2b8, 1.3);
      // deck planks: faint seams so it reads as a walk, not more pavement
      for (bz = 38; bz > z1; bz -= 2.4) st.push([sd * (WALK + 2), 0.165, bz, 3.9, 0.01, 0.05, 0, 0, 0, [28, 0.2, 0.22]]);
    } else if (lake) {
      [[z0, gap ? gap[1] : z1], gap ? [gap[0], z1] : null].forEach(function (s) { if (!s) return; st.push([sd * (WALK - 0.3), 0.42, (s[0] + s[1]) / 2, 0.6, 0.55, s[0] - s[1], 0, 0, 0, [40, 0.1, 0.5]]); });
    } else {
      for (var pz = 20; pz > z1; pz -= 3) st.push([sd * (WALK - 0.1), 0.6, pz, 0.12, 1.0, 0.12, 0, 0, 0, [265, 0.06, 0.34]]);
      st.push([sd * (WALK - 0.1), 1.1, zc, 0.08, 0.08, zl, 0, 0, 0, [265, 0.06, 0.42]]);
    }
    return true;
  }

  // ---------- what is on the water, per place ----------
  // a boat for a slip: a sloop or a motor cruiser, her own length and colour, the cabin lit on some
  function moored(F, r, max) {
    var sl = r() < 0.6, len = Math.min(max, 7 + r() * (sl ? 4 : 5)), kind = sl ? (r() < 0.6 ? 'sloop' : 'sloopTan') : (r() < 0.55 ? 'cruiser' : 'express');
    var v = F.vessel(kind, len, { hull: HULLS[Math.floor(r() * (sl ? HULLS.length : 4))], glass: r() < (sl ? 0.3 : 0.38) });
    if (r() < (sl ? 0.45 : 0.7)) v.lights = [];
    return v;
  }
  function baylightLife(k, S, F) {
    var sd = k.water, r = k.r, st = S.stat, lit = S.statLit, E = S.edge, q = S.q, fo = S.foam, i, j;
    var fill = q === 0 ? 0.35 : 0.85;
    // the marina: a walk along the shore, four docks out from it, slips both sides of each; open water either side
    var hx = E + 3.5, dEnd = E + 36, docks = [-44, -66, -88, -110], DECK = [30, 0.12, 0.42];
    st.push([sd * hx, Y0 + 0.3, -77, 2.4, 0.5, 80, 0, 0, 0, DECK]); fo.push([sd * hx, -77, 2.4, 80, 0.35]);
    [-52, -100].forEach(function (gz) { st.push([sd * (E + 1.2), Y0 + 0.5, gz, 2.6, 0.12, 1.4, 0, 0, sd * 0.28, [210, 0.06, 0.5]]); });
    docks.forEach(function (dz, di) {
      st.push([sd * (hx + dEnd) / 2, Y0 + 0.3, dz, dEnd - hx, 0.5, 2.0, 0, 0, 0, DECK]); fo.push([sd * (hx + dEnd) / 2, dz, dEnd - hx, 2, 0.3]);
      for (var x = hx + 2.5, n = 0; x < dEnd - 1; x += 3.8, n++) {
        [-1, 1].forEach(function (side) {
          // the short finger between two slips, and its pile
          st.push([sd * (x - 1.9), Y0 + 0.28, dz + side * 3.6, 0.7, 0.4, 5.6, 0, 0, 0, DECK]);
          if (n % 2 === 0) st.push([sd * (x - 1.9), Y0 + 0.9, dz + side * 6.3, 0.32, 2.6, 0.32, 0, 0, 0, [30, 0.15, 0.22]]);
          if ((di * 7 + n * 3 + (side > 0 ? 1 : 0)) % 10 < fill * 10) {
            var v = moored(F, r, 9.5);
            v.x = sd * x; v.z = dz + side * (1.15 + v.len / 2); v.yaw = side > 0 ? 0 : PI; v.calm = 0.85; v.fo = 0.28; F.add(v);
          }
        });
        if (n % 3 === 1) { st.push([sd * x, Y0 + 1.1, dz, 0.1, 1.2, 0.1, 0, 0, 0, [220, 0.05, 0.3]]); k.glow(sd * x, Y0 + 1.8, dz, 0xffe0b0, 1.6); S.lightsStatic.push([sd * x, Y0 + 1.8, dz, 0xffd9a0, 0.6]); }
      }
      st.push([sd * dEnd, Y0 + 1.0, dz, 0.4, 3, 0.4, 0, 0, 0, [30, 0.15, 0.22]]); fo.push([sd * dEnd, dz, 0.4, 0.4, 0.6, 0.2]);
    });
    S.sights.push({ z: -77, half: 36 }, { z: -196, half: 16 });
    // a low stone breakwater outside the marina, a flashing light on each end
    var bwx = sd * (dEnd + 9);
    st.push([bwx, Y0 + 0.45, -77, 3.2, 1.6, 94, 0, 0, 0, [30, 0.05, 0.25]]); fo.push([bwx, -77, 3.2, 94, 0.85, 1.2]);
    [[-30, 0x4cff7a, 0], [-124, 0xff4a3a, 2]].forEach(function (b) {
      st.push([bwx, 1.1, b[0], 0.5, 2.6, 0.5, 0, 0, 0, [0, 0, 0.75]]);
      F.add({ len: 1, beam: 1, parts: [], lights: [[0, 3.2, 0, b[1], 0.45, 4, b[2]]], calm: 0, x: bwx, z: b[0], yaw: 0, lift: -Y0 });
    });

    // the ferry terminal: a pier out to a float, a glazed waiting room on the pier
    var TZ = -196, fx = E + 22, berth = [sd * (fx + 2.2 + 4.6), TZ];
    st.push([sd * (E + 8), Y0 + 0.35, TZ, 16, 0.7 + 0.02, 18, 0, 0, 0, [30, 0.06, 0.4]]); fo.push([sd * (E + 8), TZ, 16, 18, 0.35]);
    st.push([sd * (E + 8), 1.55, TZ, 10, 2.8, 12, 0, 0, 0, [205, 0.2, 0.22]]);
    lit.push([sd * (E + 8), 1.7, TZ, 10.4, 1.5, 11.4, 0, 0, 0, [40, 0.75, 0.68]]);
    st.push([sd * (E + 8), 3.15, TZ, 12.5, 0.3, 14.5, 0, 0, 0, [210, 0.06, 0.62]]);
    st.push([sd * (E + 19), Y0 + 0.45, TZ, 6, 0.14, 2.4, 0, 0, sd * -0.06, [210, 0.06, 0.52]]);
    st.push([sd * (fx + 1.1), Y0 + 0.3, TZ, 2.2, 0.6, 30, 0, 0, 0, [30, 0.08, 0.36]]); fo.push([sd * (fx + 1.1), TZ, 2.2, 30, 0.5]);
    [-14, -5, 5, 14].forEach(function (oz) { st.push([sd * (fx + 2.4), Y0 + 1.2, TZ + oz, 0.5, 3.2, 0.5, 0, 0, 0, [30, 0.1, 0.2]]); });
    [-12, 0, 12].forEach(function (oz) { st.push([sd * (fx + 0.6), 0.9, TZ + oz, 0.1, 2.2, 0.1, 0, 0, 0, [220, 0.05, 0.3]]); k.glow(sd * (fx + 0.6), 2.1, TZ + oz, 0xfff0d8, 2.4); });
    k.glow(sd * (E + 8), 3.6, TZ, 0xffe6c0, 9);
    S.lightsStatic.push([sd * (E + 8), 2.2, TZ + 6, 0xffd9a0, 2.2], [sd * (fx + 0.6), 2.1, TZ - 12, 0xfff0d8, 1.2], [sd * (fx + 0.6), 2.1, TZ + 12, 0xfff0d8, 1.2]);
    // the stadium site stands out into the water beyond the gate (places.js): lap at its edge too
    fo.push([sd * 26, k.gz - 82, 162, 162, 0.45, 81]);

    // the ferry
    var fr = F.vessel('ferry', 30, { hull: [212, 0.3, 0.24], glass: 1, calm: 0.3, wake: true, wakeAge: 16, fo: 0.4 });
    fr.go = ferryRun(sd, berth);
    F.add(fr); S.ferry = fr;

    // boats under way: a launch circling near the head of the street, a sailboat heeled over further out, a work boat off the terminal
    var mb = F.vessel('launch', 6.5, { hull: HULLS[0], wake: true, wakeAge: 14, fo: 0.3 });
    mb.go = oval(sd * 130, -8, 55, 18, 6, 0, sd); F.add(mb);
    var sb = F.vessel('sloopSet', 10, { hull: HULLS[Math.floor(r() * HULLS.length)], calm: 0.8, wake: true, wakeAge: 12, fo: 0.3, heel: -0.16 });
    sb.go = oval(sd * 150, 55, 45, 25, 3.2, 20, -sd); F.add(sb);
    var wk = F.vessel('workboat', 8, { hull: [20, 0.6, 0.42], glass: 1, wake: true, wakeAge: 12, fo: 0.35 });
    wk.go = oval(sd * 145, -205, 40, 16, 4.5, 30, sd); F.add(wk);

    // the fairway out to open water, marked by pairs of buoys that ride the swell and flash slowly
    [[-311, -34, 0], [-325, -66, 1], [-192, -77, 0], [-206, -109, 1], [-106, -119, 0], [-120, -151, 1]].forEach(function (b, bi) {
      var red = b[2] === 0, h = red ? [2, 0.75, 0.42] : [140, 0.6, 0.3];
      F.add(F.vessel('buoy', 0, { hull: h, calm: 1, fo: 0.55, x: sd * -b[0], z: b[1], yaw: 0, lights: [[0, 2.65, 0, red ? 0xff3b30 : 0x3dff6e, 0.4, 4 + (bi % 3) * 0.5, bi * 0.9]] }));
    });
    // one yellow mark further out on its own
    F.add(F.vessel('buoy', 0, { hull: [48, 0.8, 0.5], calm: 1, fo: 0.55, x: sd * 240, z: 20, yaw: 0, lights: [[0, 2.6, 0, 0xffc040, 0.4, 6, 1]] }));

    // two ships riding at anchor out in the estuary, lit; shapes the fog takes, lights it leaves
    S.ships = [[sd * 215, 70, 110, 16], [sd * 225, -330, 120, 17]];
  }

  function jackLondonLife(k, S, F) {
    var sd = k.water, E = S.edge;
    // a tug pushing a deck barge up the channel between the promenade and the wharf, slowly
    var tow = F.vessel('tow', 11, { hull: [355, 0.55, 0.26], glass: 1, calm: 0.35, wake: true, wakeAge: 12, fo: 0.35 });
    tow.go = lane(sd * (E + 28), 150, -k.L - 170, 1.6, 106); F.add(tow);
    // the barge's own footprint ahead of the tug gets no rim of its own; the wharf and the berthed ship (places.js) do
    var z0 = -18, z1 = -k.L + 6, zc = (z0 + z1) / 2, zl = z0 - z1, shipZ = zc - zl * 0.08, shipL = Math.min(150, zl * 0.62);
    S.foam.push([sd * (E + 64), zc, 44, zl, 0.45], [sd * (E + 102), shipZ, 20, shipL, 0.4, 3]);
    // a pilot boat running the other way
    var pb = F.vessel('pilot', 9, { hull: [210, 0.15, 0.14], glass: 1, wake: true, wakeAge: 9, fo: 0.35 });
    pb.go = lane(sd * (E + 13), -k.L - 140, 140, 6.5, 12); F.add(pb);
    // a tug tied up at the wharf face and a work boat astern of her, their decks lit
    var tg = F.vessel('tug', 11, { hull: [355, 0.55, 0.26], glass: 1, calm: 0.5, fo: 0.25, x: sd * (E + 42 - 2.6), z: -64, yaw: PI });
    tg.lights = [tg.lights[0], tg.lights[4]]; F.add(tg);
    var wb = F.vessel('workboat', 13, { hull: [210, 0.12, 0.2], glass: 1, calm: 0.5, fo: 0.25, x: sd * (E + 42 - 2.7), z: -84, yaw: PI });
    wb.lights = wb.lights.slice(0, 1); F.add(wb);
    S.sights.push({ z: -74, half: 14 }, { v: tow, half: 10 });
  }

  function brooklynLife(k, S, F) {
    var sd = k.water, E = S.edge, r = k.r, st = S.stat, DECK = [30, 0.1, 0.4], fx = E + 6, z0 = -58, z1 = -112;
    // one quiet float with a handful of boats on it
    st.push([sd * fx, Y0 + 0.3, (z0 + z1) / 2, 2.2, 0.5, z0 - z1, 0, 0, 0, DECK]); S.foam.push([sd * fx, (z0 + z1) / 2, 2.2, z0 - z1, 0.3]);
    st.push([sd * (E + 2.5), Y0 + 0.5, z0 - 6, 5, 0.12, 1.4, 0, 0, sd * 0.2, [210, 0.06, 0.5]]);
    for (var z = z0 - 4, n = 0; z > z1 + 2; z -= 12, n++) {
      st.push([sd * (fx - 1.1), Y0 + 1.0, z, 0.32, 2.6, 0.32, 0, 0, 0, [30, 0.15, 0.22]]);
      if (n % 2 === 0) { k.glow(sd * fx, Y0 + 1.6, z - 6, 0xffe0b0, 1.6); S.lightsStatic.push([sd * fx, Y0 + 1.6, z - 6, 0xffd9a0, 0.5]); st.push([sd * fx, Y0 + 1.0, z - 6, 0.08, 1.0, 0.08, 0, 0, 0, [220, 0.05, 0.3]]); }
      if (n === 3) continue;
      var v = moored(F, r, 9); v.x = sd * (fx + 1.1 + v.beam / 2 + 0.3); v.z = z - 6; v.yaw = r() < 0.5 ? 0 : PI; v.calm = 0.75; v.fo = 0.22; F.add(v);
    }
    S.sights.push({ z: (z0 + z1) / 2, half: (z0 - z1) / 2 });
    // two kayaks out from Shoreline Kayak & Paddle, slowly, each with a small lamp
    [[sd * (E + 24), -30, 9, 34, 1.4, 0, 1], [sd * (E + 30), -140, 8, 26, 1.2, 40, -1]].forEach(function (o, i) {
      var hue = [[8, 0.75, 0.5], [48, 0.85, 0.55]][i];
      var ky = F.vessel('kayak', 4.6, { hull: hue, calm: 1, wake: true, wakeAge: 7, fo: 0.12 });
      // the paddle: a shaft and a blade at each end, swinging as one
      [[0, 2.1, 0.04, 0.04, 0.12], [-1.14, 0.42, 0.03, 0.17, 0.75], [1.14, 0.42, 0.03, 0.17, 0.75]].forEach(function (q) {
        var pad = [q[0], 0.62, 0.05, q[1], q[2], q[3], [0, 0, q[4]]]; pad.pivot = [0, 0.62, 0.05]; pad.anim = function (t, v) { var a = t * 2.4 + v.ph; return [0, Math.sin(a) * 0.35, Math.sin(a) * 0.5]; };
        ky.parts.push(pad);
      });
      ky.go = oval(o[0], o[1], o[2], o[3], o[4], o[5], o[6]); F.add(ky); S.sights.push({ v: ky, half: 8 });
    });
  }

  function lakeLife(k, S, F) {
    var sd = k.water, E = S.edge, L = k.L;
    // two sculls from Lakeside Rowing Club, gliding the length of the lake, oars sweeping
    [[sd * (E + 26), 1, 66], [sd * (E + 48), -1, 70]].forEach(function (o) {
      var sc = F.vessel('scull', 8.2, { hull: [40, 0.3, 0.74], calm: 1, wake: true, wakeAge: 9, fo: 0.06 });
      // an oar each side on its rigger: the loom and the blade, sweeping as one
      [-1, 1].forEach(function (s) {
        [[1.9, 2.9, 0.04, 0.07, 0.7], [3.15, 0.5, 0.03, 0.22, 0.85]].forEach(function (q) {
          var oar = [s * q[0], 0.3, 0.1, q[1], q[2], q[3], [40, 0.2, q[4]]]; oar.pivot = [s * 0.78, 0.3, 0.1];
          oar.anim = function (t, v) { var a = t * 2.1 + v.ph; return [0, s * Math.sin(a) * 0.55, -s * (0.12 + Math.cos(a) * 0.1)]; };
          sc.parts.push(oar);
        });
      });
      var zA = o[1] > 0 ? 160 : -L - 170, zB = o[1] > 0 ? -L - 170 : 160, len = Math.abs(zB - zA), base = 2.8;
      sc.go = function (t, v) { var a = t * 2.1 + v.ph, d = ((t + o[2]) * base + Math.sin(a) * 0.35) % len; v.x = o[0]; v.z = zA + (zB < zA ? -d : d); v.yaw = zB < zA ? 0 : PI; v.spd = base * (1 + 0.4 * Math.cos(a)); v.hide = false; };
      F.add(sc); S.sights.push({ v: sc, half: 9 });
    });
  }

  // the far shore: estuary — a low shoreline of lights a long way off; lake — trees ringing the water, buildings behind them
  function farShore(k, S, F) {
    var T = k.THREE, sd = k.water, r = k.r, st = S.stat, lake = S.lake, pts = [], i;
    var X0 = lake ? k.WALK + 135 : k.WALK + 255, zA = 260, zB = -k.L - 420, solid = k.WX !== 'fog';
    if (k.WX === 'fog') st = [];
    st.push([sd * (X0 + 40), Y0 + 0.6, (zA + zB) / 2, 80, 2.2, zA - zB, 0, 0, 0, [30, 0.05, 0.08]]);
    for (var z = zA; z > zB; z -= 8 + r() * 14) {
      var bw = 8 + r() * 18, bh = lake ? 8 + Math.pow(r(), 1.5) * 30 : 3 + Math.pow(r(), 2) * 22, bx = X0 + (lake ? 22 : 6) + r() * 25, bd = 8 + r() * 10;
      st.push([sd * bx, bh / 2, z, bd, bh, bw, 0, 0, 0, [220, 0.06, 0.1]]);
      for (i = 0; i < bh / 3; i++) if (r() < 0.45) pts.push(sd * (bx - bd / 2 - 0.3), 1 + r() * (bh - 1.5), z + (r() - 0.5) * bw, r() < 0.8 ? 0xffd28a : 0xcfe0ff);
    }
    for (z = zA; z > zB; z -= 6 + r() * 10) pts.push(sd * (X0 + 1), 1.6 + r() * 1.2, z, 0xffc070);
    // hills behind the far shore, a darker line against the sky
    if (!lake) for (z = zA + 60; z > zB - 60; z -= 90) st.push([sd * (X0 + 150 + r() * 40), 4, z, 60, 16 + r() * 22, 110, 0, r() * 0.5 - 0.25, 0, [230, 0.08, 0.07]]);
    S.nShore = pts.length / 4;
    // ships at anchor (SHAPES.ship; the fog takes the shape and leaves the lights): anchor lights fore and aft, a row of deck lights
    (S.ships || []).forEach(function (sh) {
      var x = sh[0], z = sh[1], len = sh[2], bm = sh[3];
      if (solid) F.add(F.vessel('ship', len, { hull: [215, 0.25, 0.14], glass: 1, calm: 0.15, x: x, z: z, yaw: 0 }));
      pts.push(x, 18, z - len * 0.48, 0xffffff, x, 15.5, z + len * 0.46, 0xffffff);
      for (var li = 0; li < 9; li++) pts.push(x - Math.sign(x) * bm * 0.5, 8.4, z - len * 0.45 + li * len * 0.1, 0xffe0b0);
      for (li = 0; li < 4; li++) pts.push(x - Math.sign(x) * bm * 0.47, 9 + li * 2, z + len * 0.38, 0xfff0d0);
    });
    if (lake) {
      var crowns = [];
      for (z = zA; z > zB; z -= 4 + r() * 4) { var cr = 3 + r() * 3.5; crowns.push([sd * (X0 + 3 + r() * 10), 2 + cr * 0.8 + r() * 2, z, cr * 1.2, cr, cr * 1.2, 0, r() * 3, 0, [110 + r() * 30, 0.3, 0.07 + r() * 0.04]]); }
      if (solid) inst(k, new T.IcosahedronGeometry(1, 0), new T.MeshLambertMaterial({ color: 0xffffff }), crowns);
    }
    // the lights over there stay visible after the fog has eaten the shapes
    var n = pts.length / 4, nShore = S.nShore, p = new Float32Array(n * 3), c = new Float32Array(n * 3), col = new T.Color(), dim = { clear: 0.55, overcast: 0.4, rain: 0.28, fog: 0.08 }[k.WX] || 0.5;
    for (i = 0; i < n; i++) { p[i * 3] = pts[i * 4]; p[i * 3 + 1] = pts[i * 4 + 1]; p[i * 3 + 2] = pts[i * 4 + 2]; col.set(pts[i * 4 + 3]).multiplyScalar(dim * (i >= nShore ? 1.7 : 0.5 + r() * 0.5)); c[i * 3] = col.r; c[i * 3 + 1] = col.g; c[i * 3 + 2] = col.b; }
    var g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(p, 3)); g.setAttribute('color', new T.BufferAttribute(c, 3));
    var m = new T.Points(g, new T.PointsMaterial({ map: k.glowTex, vertexColors: true, size: lake ? 1.6 : 2.6, transparent: true, blending: T.AdditiveBlending, depthWrite: false, fog: false }));
    k.root.add(m);
    if (lake) S.lightsStatic.push([sd * (X0 + 1), 2, -k.L * 0.3, 0xffc070, 1.5], [sd * (X0 + 1), 2, -k.L * 0.7, 0xffc070, 1.5]);
  }

  // ---------- the week's chaos ship: a cargo_ship row for the port on this street (k.H.chaos, from build.js) ----------
  // One container ship out in the channel beyond the wharf, doing what the row says: steaming in loaded for a
  // cargo surge, riding at anchor for a berth delay, steaming out light when the shipping thins or a carrier
  // leaves. Its place is written back on the row for the page's label and ride view. Nothing is lettered.
  // One lofted shape (shipShape) whose fog thins slowly, so the ship reads from the street. Draw calls: 2 a ship.
  function chaosShips(k) {
    var evs = ((k.H && k.H.chaos) || []).filter(function (ev) { return ev.v === 'cargo_ship'; }); if (!evs.length) return;
    var T = k.THREE, sd = k.water, L = k.L, O = new T.Object3D(), C = new T.Color();
    function thin(m) { m.onBeforeCompile = function (sh) { sh.fragmentShader = sh.fragmentShader.replace('#include <fog_fragment>', T.ShaderChunk.fog_fragment.replace('fogDensity * fogDensity', '(fogDensity * 0.3) * (fogDensity * 0.3)')); }; m.customProgramCacheKey = function () { return 'chaosShipThin'; }; return m; }
    function many(g, geo, mat, items) { var m = new T.InstancedMesh(geo, mat, items.length); items.forEach(function (it, j) { O.position.set(it[0], it[1], it[2]); O.scale.set(it[3], it[4], it[5]); O.updateMatrix(); m.setMatrixAt(j, O.matrix); if (it[6]) m.setColorAt(j, C.setHSL(it[6][0] / 360, it[6][1], it[6][2])); }); m.frustumCulled = false; g.add(m); return m; }
    evs.forEach(function (ev, n) {
      var R = (typeof rng === 'function' && typeof hash === 'function') ? rng(hash('ship' + n + ev.o)) : Math.random;
      var out = /slowdown|reroute/.test(ev.o), wait = /berth_delay/.test(ev.o), LEN = 96, BEAM = 15, g = new T.Group(), lit = [], j;
      // the ship herself: boxes stacked high coming in, a few going out and her red bottom showing
      var geo = shipShape(T, shaper(T), { L: LEN, B: BEAM, light: out, stack: function () { return out ? (R() < 0.45 ? 1 : 0) : 2 + Math.floor(R() * 3); } });
      geo.setAttribute('aLit', new T.InstancedBufferAttribute(new Float32Array([1]), 1));
      var hm = new T.InstancedMesh(geo, boatMat(T, true), 1); hm.setMatrixAt(0, new T.Matrix4()); hm.setColorAt(0, C.setHSL(215 / 360, 0.3, 0.15)); hm.frustumCulled = false; g.add(hm);
      // lit: the deck lamps down her length, her running lights
      for (j = 0; j < 6; j++) lit.push([(j % 2 ? 1 : -1) * (BEAM / 2 - 0.4), 8.6, -LEN / 2 + 8 + j * 13, 0.35, 0.35, 0.35, [48, 0.6, 0.9]]);
      lit.push([BEAM / 2, 9, -LEN / 2 + 8, 0.4, 0.4, 0.4, [120, 0.9, 0.55]], [-BEAM / 2, 9, -LEN / 2 + 8, 0.4, 0.4, 0.4, [0, 0.9, 0.55]], [0, 25, LEN / 2 - 15, 0.5, 0.5, 0.5, [0, 0, 1]]);
      var lm = thin(new T.MeshBasicMaterial({ color: 0xffffff })); many(g, new T.BoxGeometry(1, 1, 1), lm, lit);
      var X = sd * (k.WALK + 150 + n * 26), z0 = 70, z1 = -L - 60, span = z0 - z1, speed = wait ? 0 : out ? 2.2 : 2.6, start = R() * 0.5;
      g.position.set(X, Y0, -L * 0.4); k.root.add(g);
      // the bow is at -z as built: turn her round to steam out the way the flight came
      if (out) g.rotation.y = Math.PI;
      k.ticks.push(function (t) {
        var zz;
        if (wait) { zz = -L * (0.3 + n * 0.25); g.rotation.y = Math.sin(t * 0.045 + n) * 0.14; g.position.y = Y0 + Math.sin(t * 0.5) * 0.06; }
        else { var u = ((t * speed / span) + start) % 1; zz = out ? z1 + u * span : z0 - u * span; g.position.y = Y0 + Math.sin(t * 0.6) * 0.08; }
        g.position.z = zz;
        ev.x = X; ev.y = 27; ev.z = zz; ev.cy = 9; ev.rad = 34; ev.far = 320; ev.side = 1; ev.stopped = wait;
        ev.on = zz < 50 && zz > -L - 40; ev.cam = [X - sd * 78, 22, zz + (out ? -62 : 62)]; // from out over the water, off her bow
      });
    });
  }

  function life(k) {
    if (!k.water) return;
    var S = k._water; if (!S) return; // the page drew the water itself
    var T = k.THREE, F = makeFleet(k, S), name = k.H.name;
    if (/Baylight/.test(name)) baylightLife(k, S, F);
    else if (/Jack London/.test(name)) jackLondonLife(k, S, F);
    else if (S.lake) lakeLife(k, S, F);
    else brooklynLife(k, S, F);
    if (k.ST.set && k.ST.set.indexOf('pergola') >= 0) S.lightsStatic.push([k.water * (k.WALK + 6), 4.2, -k.L * 0.5, 0xffd9a0, 2.5]);
    farShore(k, S, F);
    k.sights = S.sights; // what the flight turns to look at as it passes: { z, half } a stretch of water, { v, half } a vessel under way
    chaosShips(k);
    inst(k, new T.BoxGeometry(1, 1, 1), new T.MeshLambertMaterial({ color: 0xffffff }), S.stat, true);
    inst(k, new T.BoxGeometry(1, 1, 1), new T.MeshBasicMaterial({ color: 0xffffff }), S.statLit);
    F.build();
    var wakes = makeWakes(k, F), foam = S.q === 0 ? null : makeFoam(k, S, F);

    // lights the water can mirror: street lamps on the water side, lit piers, and the boats' brightest lights
    var cands = [];
    k.lampSpots.forEach(function (l) { if (l[0] * k.water > 0) cands.push({ x: l[0], y: 4.5 + k.yAt(l[1]), z: l[1], c: hexRGB(T, 0xffd9a0), w: 1.3 }); });
    S.lightsStatic.forEach(function (l) { cands.push({ x: l[0], y: l[1], z: l[2], c: hexRGB(T, l[3]), w: l[4] }); });
    F.list.forEach(function (v) { v.lights.forEach(function (l, j) { if (l[4] >= 0.5) cands.push({ v: v, j: j, c: hexRGB(T, l[3]), w: l[4], x: 0, y: -500, z: 0 }); }); });
    var chosen = [], frame = 0, lpArr = F.pts.geometry.attributes.position.array;
    k.ticks.push(function (t, dt, cam) {
      var q = k.quality();
      F.pose(t);
      if (wakes) wakes.update(t);
      if (foam) { foam.mesh.visible = q > 0; if (q > 0) foam.update(t); }
      if (!S.mat) return;
      var u = S.mat.uniforms; u.t.value = t;
      if (q === 0) { var flatMat = new T.MeshBasicMaterial({ color: u.deep.value.clone().lerp(u.low.value, 0.35) }); S.sea.material = flatMat; S.mat.dispose(); S.mat = null; return; }
      // boat lights follow their boats
      cands.forEach(function (c) { if (c.v) { var o = (c.v.i0[1] + c.j) * 3; c.x = lpArr[o]; c.y = lpArr[o + 1]; c.z = lpArr[o + 2]; } });
      if (frame++ % 8 === 0) {
        chosen = cands.filter(function (c) { return c.y > -100 && c.z < cam.z + 25 && c.z > cam.z - 220; })
          .sort(function (a, b) { return ((a.x - cam.x) * (a.x - cam.x) + (a.z - cam.z) * (a.z - cam.z)) / a.w - ((b.x - cam.x) * (b.x - cam.x) + (b.z - cam.z) * (b.z - cam.z)) / b.w; })
          .slice(0, q > 1 ? MAXL : 8);
      }
      for (var i = 0; i < chosen.length; i++) { var c = chosen[i]; u.lp.value[i].set(c.x, c.y, c.z, c.w); u.lc.value[i].set(c.c[0], c.c[1], c.c[2]); }
      u.nL.value = chosen.length;
    });
    F.pose(0); if (wakes) wakes.update(0); if (foam) foam.update(0);
  }

  // look: the shapes on their own, for a look-test page
  return { surface: surface, life: life, look: { SHAPES: SHAPES, shaper: shaper, boatMat: boatMat } };
})();

// Water and boats. LIFE.water.surface(kit) draws the water and its edge (returns true); LIFE.water.life(kit) adds
// what is on it. Only the four waterside streets have water (k.water = -1 | 1, k.ST.water.kind estuary | lake).
// Canon each piece rests on (docs/canon/INSTITUTIONS.md, Business_Ledger rows):
//   Baylight District  "a 180-slip marina, a ferry terminal, a 1.2-mile public promenade" — marina, ferry, promenade deck
//   Jack London        "the estuary waterfront", Port of Oakland on the ledger — a tug and barge, a pilot boat, a tug at the wharf
//   Brooklyn           "residential rather than spectacle" — one small float of moored boats; Shoreline Kayak & Paddle (ledger) — kayaks
//   Lake Merritt       "historic and settled" — still dark water, a tree-ringed far shore; Lakeside Rowing Club (ledger) — two sculls
// Nothing here paints a word. Draw calls: water 1, edge and piers 1, lit windows on piers 1, far shore 1-2,
// hulls 1, topsides 1, lit windows on boats 1, boat lights 1, far lights 1, wakes 1.
LIFE.water = (function () {
  var Y0 = -0.55, MAXL = 16, PI = Math.PI;
  // [dir x, dir z, wavelength, amplitude, speed]: the first three are the swell boats ride; all six shape the surface
  var WAVES = {
    estuary: [[0.94, 0.34, 15, 0.12, 1], [0.55, -0.83, 8.5, 0.06, 1], [-0.3, 0.95, 5.2, 0.035, 1], [0.99, -0.12, 3.1, 0.018, 1], [-0.7, -0.7, 2.2, 0.011, 1], [0.2, 0.98, 1.45, 0.006, 1]],
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
    'uniform float t; uniform float nL; uniform float detail; uniform float rain; uniform float sheen; uniform float thin; uniform float tint;',
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
    '  for (int i = 0; i < 6; i++) { vec4 w = wv[i]; float ph = w.z * dot(w.xy, p) + ws[i] * t; g += w.w * w.z * w.xy * cos(ph); hh += w.z * w.w * sin(ph); }',
    '  g *= 1.0 - 0.7 * smoothstep(25.0, 200.0, dist);',
    '  float fd = detail * exp(-dist / 38.0);',
    '  if (fd > 0.01) {',
    '    g += fd * 0.035 * vec2(cos(p.x * 9.1 + p.y * 3.3 + t * 3.1), cos(p.y * 8.3 - p.x * 2.1 + t * 2.7));',
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
    '  float up = 1.0 + clamp(hh * 3.0, -0.6, 0.6) * (1.0 - smoothstep(20.0, 160.0, dist));',
    '  vec3 col = mix(mix(deep, low * 0.6, tint) * up, skyAt(R) * sheen, fres);',
    '  col += glow * pow(max(dot(R, normalize(vec3(0.0, 0.06, -1.0))), 0.0), 260.0) * 2.2 * (1.0 - rain * 0.6);',
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
    '  float a = va * smoothstep(0.0, 0.6, e) * smoothstep(0.25, 0.75, n + e * 0.3);',
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
  // a boat hull, 1 x 1 x 1: bow toward -z, waterline at 0, a little below it
  var HULL = null;
  function hullGeo(T) {
    var s = new T.Shape();
    s.moveTo(-0.5, -0.5); s.lineTo(0.5, -0.5); s.lineTo(0.5, 0.02); s.quadraticCurveTo(0.47, 0.36, 0, 0.5); s.quadraticCurveTo(-0.47, 0.36, -0.5, 0.02); s.lineTo(-0.5, -0.5);
    var g = new T.ExtrudeGeometry(s, { depth: 1, bevelEnabled: false, curveSegments: 5 });
    g.rotateX(-PI / 2);
    var p = g.attributes.position;
    for (var i = 0; i < p.count; i++) { var y = p.getY(i); if (y < 0.5) { p.setX(i, p.getX(i) * 0.55); p.setZ(i, p.getZ(i) * 0.86 + 0.04); } p.setY(i, y - 0.4); }
    g.computeVertexNormals(); return g;
  }
  function hexRGB(T, hex) { var c = new T.Color(hex); return [c.r, c.g, c.b]; }
  function bez(a, b, c, d, u) { var v = 1 - u; return v * v * v * a + 3 * v * v * u * b + 3 * v * u * u * c + u * u * u * d; }
  function bezD(a, b, c, d, u) { var v = 1 - u; return 3 * v * v * (b - a) + 6 * v * u * (c - b) + 3 * u * u * (d - c); }

  // ---------- the boats: every hull, cabin, mast and light in four draws, posed each frame ----------
  var HULLS = [[45, 0.06, 0.6], [45, 0.06, 0.6], [45, 0.06, 0.56], [40, 0.22, 0.52], [220, 0.45, 0.22], [160, 0.3, 0.2], [210, 0.05, 0.55], [8, 0.45, 0.3]];
  var LIT = [42, 0.9, 0.72];
  function sail(r, s) { // a moored sailboat, s along the slip
    var L = 7 + r() * 4, B = L * 0.32, Hm = L * 1.25 + r() * 2, top = 0.78, c = HULLS[Math.floor(r() * HULLS.length)];
    var v = { len: L, beam: B, h: 1.3, hull: c, parts: [], lit: [], lights: [] };
    v.parts.push([0, top + 0.25, 0.4, B * 0.55, 0.5, L * 0.36, [c[0], c[1] * 0.6, Math.min(0.62, c[2] + 0.08)]]);
    v.parts.push([0, top + Hm / 2, -0.7, 0.11, Hm, 0.11, [210, 0.05, 0.62]]);
    v.parts.push([0, top + 1.25, 0.7 + L * 0.15, 0.08, 0.08, L * 0.34, [210, 0.05, 0.62]]);
    v.parts.push([0, top + 0.35, 0.4 + L * 0.2, B * 0.45, 0.32, L * 0.1, [210, 0.25, 0.2]]);
    if (r() < 0.3) v.lit.push([0, top + 0.32, 0.4, B * 0.62, 0.12, L * 0.28, LIT]);
    if (r() < 0.55) v.lights.push([0, top + Hm + 0.1, -0.7, 0xfff4e0, 0.5]);
    return v;
  }
  function cruiser(r) {
    var L = 7 + r() * 5, B = L * 0.34, top = 0.96, c = HULLS[Math.floor(r() * 4)];
    var v = { len: L, beam: B, h: 1.6, hull: c, parts: [], lit: [], lights: [] };
    v.parts.push([0, top + 0.55, -0.1 * L, B * 0.8, 1.1, L * 0.5, [45, 0.05, 0.62]]);
    v.parts.push([0, top + 1.3, -0.05 * L, B * 0.6, 0.4, L * 0.24, [45, 0.05, 0.58]]);
    v.parts.push([0, top + 0.75, -0.1 * L, B * 0.82, 0.32, L * 0.46, [215, 0.3, 0.12]]);
    if (r() < 0.38) v.lit.push([0, top + 0.75, -0.1 * L, B * 0.88, 0.3, L * 0.4, LIT]);
    if (r() < 0.3) v.lights.push([0, top + 1.9, -0.05 * L, 0xfff4e0, 0.5]);
    return v;
  }
  function makeFleet(k, S) {
    var T = k.THREE, F = { list: [], k: k, S: S };
    F.add = function (v) { v.calm = v.calm == null ? 1 : v.calm; v.ph = k.r() * 6.28; F.list.push(v); return v; };
    F.build = function () {
      var nh = 0, np = 0, nl = 0, nL = 0, M = new T.Matrix4(), Q = new T.Quaternion(), E = new T.Euler(), P = new T.Vector3(), Sc = new T.Vector3();
      F.list.forEach(function (v) {
        v.hl = M.clone().compose(P.set(0, 0, 0), Q.identity(), Sc.set(v.beam, v.h, v.len));
        v.pm = v.parts.map(function (p) { return part(p); }); v.lm = v.lit.map(function (p) { return part(p); });
        v.i0 = [nh++, np, nl, nL]; np += v.parts.length; nl += v.lit.length; nL += v.lights.length;
      });
      function part(p) {
        var m = new T.Matrix4();
        if (p.pivot) { m.compose(P.set(p[0], p[1], p[2]), Q.identity(), Sc.set(p[3], p[4], p[5])); return { m: m, pivot: p.pivot, anim: p.anim, base: m.clone() }; }
        m.compose(P.set(p[0], p[1], p[2]), Q.identity(), Sc.set(p[3], p[4], p[5])); return { m: m };
      }
      HULL = HULL || hullGeo(T);
      F.hulls = new T.InstancedMesh(HULL, new T.MeshLambertMaterial({ color: 0xffffff }), Math.max(1, nh));
      F.tops = new T.InstancedMesh(new T.BoxGeometry(1, 1, 1), new T.MeshLambertMaterial({ color: 0xffffff }), Math.max(1, np));
      F.lits = new T.InstancedMesh(new T.BoxGeometry(1, 1, 1), new T.MeshBasicMaterial({ color: 0xffffff }), Math.max(1, nl));
      var c = new T.Color();
      F.list.forEach(function (v) {
        F.hulls.setColorAt(v.i0[0], c.setHSL(v.hull[0] / 360, v.hull[1], v.hull[2]));
        v.parts.forEach(function (p, j) { var h = p[6]; F.tops.setColorAt(v.i0[1] + j, c.setHSL(h[0] / 360, h[1], h[2])); });
        v.lit.forEach(function (p, j) { var h = p[6]; F.lits.setColorAt(v.i0[2] + j, c.setHSL(h[0] / 360, h[1], h[2])); });
      });
      F.hulls.castShadow = F.tops.castShadow = true;
      [F.hulls, F.tops, F.lits].forEach(function (m) { m.frustumCulled = false; k.root.add(m); });
      // boat lights: one cloud of glow points, moved with the boats
      var lp = new Float32Array(Math.max(1, nL) * 3), lc = new Float32Array(Math.max(1, nL) * 3);
      F.list.forEach(function (v) { v.lights.forEach(function (l, j) { var q = (v.i0[3] + j) * 3; c.set(l[3]); lc[q] = c.r; lc[q + 1] = c.g; lc[q + 2] = c.b; }); });
      var lg = new T.BufferGeometry(); lg.setAttribute('position', new T.BufferAttribute(lp, 3)); lg.setAttribute('color', new T.BufferAttribute(lc, 3));
      F.pts = new T.Points(lg, new T.PointsMaterial({ map: k.glowTex, vertexColors: true, size: 1.5, transparent: true, opacity: 0.95, blending: T.AdditiveBlending, depthWrite: false }));
      F.pts.frustumCulled = false; k.root.add(F.pts);
      F.M = M; F.Q = Q; F.E = E; F.P = P; F.Sc = Sc; F.MV = new T.Matrix4(); F.MT = new T.Matrix4(); F.MA = new T.Matrix4(); F.V3 = new T.Vector3(); F.ZERO = new T.Matrix4().makeScale(0, 0, 0); F.sw = [0, 0, 0];
    };
    F.pose = function (t) {
      var W = S.W, sw = F.sw, MV = F.MV, MT = F.MT, lp = F.pts.geometry.attributes.position.array;
      for (var i = 0; i < F.list.length; i++) {
        var v = F.list[i];
        if (v.go) v.go(t, v); // moving boats set x, z, yaw, spd, hide
        if (v.hide) {
          F.hulls.setMatrixAt(v.i0[0], F.ZERO);
          for (var j = 0; j < v.pm.length; j++) F.tops.setMatrixAt(v.i0[1] + j, F.ZERO);
          for (j = 0; j < v.lm.length; j++) F.lits.setMatrixAt(v.i0[2] + j, F.ZERO);
          for (j = 0; j < v.lights.length; j++) lp[(v.i0[3] + j) * 3 + 1] = -500;
          continue;
        }
        swell(W, v.x, v.z, t, sw);
        var cy = Math.cos(v.yaw), sy = Math.sin(v.yaw), across = sw[1] * cy - sw[2] * sy, along = -sw[1] * sy - sw[2] * cy, cm = v.calm;
        var roll = (Math.atan(across) * 1.3 + Math.sin(t * 1.7 + v.ph) * 0.012) * cm * (v.len < 15 ? 1 : 0.35);
        var pitch = Math.atan(along) * 0.6 * cm * (v.len < 15 ? 1 : 0.4);
        F.E.set(pitch, v.yaw, roll, 'YXZ'); F.Q.setFromEuler(F.E);
        MV.compose(F.P.set(v.x, Y0 + sw[0] * cm * 0.8 + (v.lift || 0), v.z), F.Q, F.Sc.set(1, 1, 1));
        MT.multiplyMatrices(MV, v.hl); F.hulls.setMatrixAt(v.i0[0], MT);
        for (j = 0; j < v.pm.length; j++) { var pm = v.pm[j]; if (pm.anim) { anim(pm, t, v); } MT.multiplyMatrices(MV, pm.m); F.tops.setMatrixAt(v.i0[1] + j, MT); }
        for (j = 0; j < v.lm.length; j++) { MT.multiplyMatrices(MV, v.lm[j].m); F.lits.setMatrixAt(v.i0[2] + j, MT); }
        for (j = 0; j < v.lights.length; j++) { var l = v.lights[j], q = (v.i0[3] + j) * 3; F.V3.set(l[0], l[1], l[2]).applyMatrix4(MV); lp[q] = F.V3.x; lp[q + 1] = F.V3.y; lp[q + 2] = F.V3.z; }
      }
      F.hulls.instanceMatrix.needsUpdate = F.tops.instanceMatrix.needsUpdate = F.lits.instanceMatrix.needsUpdate = true;
      F.pts.geometry.attributes.position.needsUpdate = true;
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
    var T = k.THREE, movers = F.list.filter(function (v) { return v.wake; }), N = 34, per = N * 3 * 6, total = Math.max(1, movers.length * per);
    if (!movers.length) return null;
    var pos = new Float32Array(total * 3), al = new Float32Array(total), uv = new Float32Array(total * 2);
    var g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(pos, 3)); g.setAttribute('a', new T.BufferAttribute(al, 1)); g.setAttribute('u', new T.BufferAttribute(uv, 2));
    var mat = new T.ShaderMaterial({ uniforms: T.UniformsUtils.merge([T.UniformsLib.fog, { t: { value: 0 }, c: { value: new T.Color(0.62, 0.68, 0.74) } }]), vertexShader: WAKE_VS, fragmentShader: WAKE_FS, fog: true, transparent: true, depthWrite: false, blending: T.AdditiveBlending });
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
          var A = v.wakeAge || 10, pts = [{ x: v.x, z: v.z, yaw: v.yaw, s: v.spd, t: t }].concat(H.slice(1)), dist = 0;
          for (var i = 0; i + 1 < pts.length; i++) {
            var a = pts[i], b = pts[i + 1], ga = t - a.t, gb = t - b.t; if (gb > A) break;
            var st = function (p, g) { var sx = Math.sin(p.yaw), cz = Math.cos(p.yaw); return { x: p.x + sx * v.len * 0.48, z: p.z + cz * v.len * 0.48, px: Math.cos(p.yaw), pz: -Math.sin(p.yaw), f: Math.pow(Math.max(0, 1 - g / A), 1.6) * Math.min(1, p.s / 3.5) }; };
            var sa = st(a, ga), sb = st(b, gb), seg = Math.sqrt((sa.x - sb.x) * (sa.x - sb.x) + (sa.z - sb.z) * (sa.z - sb.z)), d0 = dist; dist += seg;
            if (sa.f < 0.01 && sb.f < 0.01) continue;
            var B = v.beam;
            // churned water straight behind
            var wa = B * 0.32 + ga * 0.35, wb = B * 0.32 + gb * 0.35;
            quad(sa.x - sa.px * wa, sa.z - sa.pz * wa, sa.x + sa.px * wa, sa.z + sa.pz * wa, sb.x - sb.px * wb, sb.z - sb.pz * wb, sb.x + sb.px * wb, sb.z + sb.pz * wb, sa.f * 0.9, sb.f * 0.9, d0, dist);
            // the two arms, opening at about 19 degrees
            [-1, 1].forEach(function (sd) {
              var oa = sd * (B * 0.45 + ga * a.s * 0.34), ob = sd * (B * 0.45 + gb * b.s * 0.34), ha = 0.3 + ga * 0.14, hb = 0.3 + gb * 0.14;
              quad(sa.x + sa.px * (oa - ha), sa.z + sa.pz * (oa - ha), sa.x + sa.px * (oa + ha), sa.z + sa.pz * (oa + ha), sb.x + sb.px * (ob - hb), sb.z + sb.pz * (ob - hb), sb.x + sb.px * (ob + hb), sb.z + sb.pz * (ob + hb), sa.f * 0.75, sb.f * 0.75, d0 * 1.7, dist * 1.7);
            });
          }
        });
        g.setDrawRange(0, vi);
        g.attributes.position.needsUpdate = g.attributes.a.needsUpdate = g.attributes.u.needsUpdate = true;
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
    var S = { T: T, W: W, lake: lake, stat: [], statLit: [], lightsStatic: [], q: q };
    k._water = S;
    var dull = k.WX === 'clear' ? 1 : 0.35;
    // the sky's own colours, so the water reflects the sky that is there
    var SK = (typeof skyMat !== 'undefined' && skyMat && skyMat.uniforms) ? skyMat.uniforms : null;
    var low = SK ? SK.low.value.clone() : new T.Color().setHSL(warm / 360, 0.5 * dull, 0.2);
    var top = SK ? SK.top.value.clone() : new T.Color().setHSL(0.62, 0.55 * dull, 0.09);
    var glow = SK ? SK.glow.value.clone() : new T.Color().setHSL(warm / 360, (warm > 180 ? 0.6 : 0.95) * dull, (warm > 180 ? 0.42 : 0.56) * (k.WX === 'clear' ? 1 : 0.5));
    var deep = new T.Color().setHSL((lake ? 212 : 198) / 360, lake ? 0.4 : 0.5, lake ? 0.035 : 0.05);
    var geo = new T.PlaneGeometry(720, L + 900, 1, 1); geo.rotateX(-PI / 2);
    var mat;
    if (q === 0) mat = new T.MeshBasicMaterial({ color: deep.clone().lerp(low, 0.35) });
    else {
      var u = T.UniformsUtils.merge([T.UniformsLib.fog, { t: { value: 0 }, nL: { value: 0 }, detail: { value: lake ? 0.45 : 1 }, rain: { value: k.WX === 'rain' ? 1 : 0 }, sheen: { value: 1 }, thin: { value: k.WX === 'fog' || k.WX === 'rain' ? 1 : lake ? 0.6 : 0.75 }, tint: { value: lake ? 0.05 : 0.25 } }]);
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
    if (baylight) {
      // the public promenade: a timber deck out over the water, glass rail on its outer edge, low lights in the deck
      st.push([sd * (WALK + 2), 0.08, zc, 4, 0.16, zl, 0, 0, 0, [28, 0.22, 0.3]]);
      st.push([sd * (edge - 0.05), 0.65, zc, 0.06, 0.9, zl, 0, 0, 0, [195, 0.25, 0.42]]);
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
  function baylightLife(k, S, F) {
    var sd = k.water, r = k.r, st = S.stat, lit = S.statLit, E = S.edge, q = S.q, i, j;
    var fill = q === 0 ? 0.35 : 0.85;
    // the marina: a walk along the shore, six docks out from it, slips both sides of each
    var hx = E + 3.5, dEnd = E + 40, docks = [-18, -40, -62, -84, -106], DECK = [30, 0.12, 0.42];
    st.push([sd * hx, Y0 + 0.3, -62, 2.4, 0.5, 104, 0, 0, 0, DECK]);
    [-34, -96].forEach(function (gz) { st.push([sd * (E + 1.2), Y0 + 0.5, gz, 2.6, 0.12, 1.4, 0, 0, sd * 0.28, [210, 0.06, 0.5]]); });
    docks.forEach(function (dz, di) {
      st.push([sd * (hx + dEnd - hx) / 2 + sd * hx / 2, Y0 + 0.3, dz, dEnd - hx, 0.5, 2.0, 0, 0, 0, DECK]);
      for (var x = hx + 2.5, n = 0; x < dEnd - 1; x += 3.8, n++) {
        [-1, 1].forEach(function (side) {
          // the short finger between two slips, and its pile
          st.push([sd * (x - 1.9), Y0 + 0.28, dz + side * 3.6, 0.7, 0.4, 5.6, 0, 0, 0, DECK]);
          if (n % 2 === 0) st.push([sd * (x - 1.9), Y0 + 0.9, dz + side * 6.3, 0.32, 2.6, 0.32, 0, 0, 0, [30, 0.15, 0.22]]);
          if ((di * 7 + n * 3 + (side > 0 ? 1 : 0)) % 10 < fill * 10 && !(di === 0 && side > 0 && n < 2)) {
            var v = r() < 0.6 ? sail(r) : cruiser(r);
            v.len = Math.min(v.len, 9.5); v.x = sd * x; v.z = dz + side * (1.15 + v.len / 2); v.yaw = side > 0 ? 0 : PI; v.calm = 0.55; F.add(v);
          }
        });
        if (n % 3 === 1) { st.push([sd * x, Y0 + 1.1, dz, 0.1, 1.2, 0.1, 0, 0, 0, [220, 0.05, 0.3]]); k.glow(sd * x, Y0 + 1.8, dz, 0xffe0b0, 1.6); S.lightsStatic.push([sd * x, Y0 + 1.8, dz, 0xffd9a0, 0.6]); }
      }
      st.push([sd * dEnd, Y0 + 1.0, dz, 0.4, 3, 0.4, 0, 0, 0, [30, 0.15, 0.22]]);
    });
    // a low stone breakwater outside the marina, with a light at each end of it
    st.push([sd * (dEnd + 9), Y0 + 0.45, -64, 3.2, 1.6, 116, 0, 0, 0, [30, 0.05, 0.25]]);
    S.blink = [[sd * (dEnd + 9), 2.6, -6, 0x4cff7a], [sd * (dEnd + 9), 2.6, -122, 0xff4a3a]];
    S.blink.forEach(function (b) { st.push([b[0], 1.1, b[2], 0.5, 2.6, 0.5, 0, 0, 0, [0, 0, 0.75]]); });

    // the ferry terminal: a pier out to a float, a glazed waiting room on the pier
    var TZ = -196, fx = E + 22, berth = [sd * (fx + 2.2 + 4.6), TZ];
    st.push([sd * (E + 8), Y0 + 0.35, TZ, 16, 0.7 + 0.02, 18, 0, 0, 0, [30, 0.06, 0.4]]);
    for (i = 0; i < 4; i++) for (j = 0; j < 3; j++) st.push([sd * (E + 1 + i * 4.6), Y0 - 0.2, TZ - 8 + j * 8, 0.5, 1.2, 0.5, 0, 0, 0, [30, 0.1, 0.2]]);
    st.push([sd * (E + 8), 1.55, TZ, 10, 2.8, 12, 0, 0, 0, [205, 0.2, 0.22]]);
    lit.push([sd * (E + 8), 1.7, TZ, 10.4, 1.5, 11.4, 0, 0, 0, [40, 0.75, 0.68]]);
    st.push([sd * (E + 8), 3.15, TZ, 12.5, 0.3, 14.5, 0, 0, 0, [210, 0.06, 0.62]]);
    st.push([sd * (E + 19), Y0 + 0.45, TZ, 6, 0.14, 2.4, 0, 0, sd * -0.06, [210, 0.06, 0.52]]);
    st.push([sd * (fx + 1.1), Y0 + 0.3, TZ, 2.2, 0.6, 30, 0, 0, 0, [30, 0.08, 0.36]]);
    [-14, -5, 5, 14].forEach(function (oz) { st.push([sd * (fx + 2.4), Y0 + 1.2, TZ + oz, 0.5, 3.2, 0.5, 0, 0, 0, [30, 0.1, 0.2]]); });
    [-12, 0, 12].forEach(function (oz) { st.push([sd * (fx + 0.6), 0.9, TZ + oz, 0.1, 2.2, 0.1, 0, 0, 0, [220, 0.05, 0.3]]); k.glow(sd * (fx + 0.6), 2.1, TZ + oz, 0xfff0d8, 2.4); });
    k.glow(sd * (E + 8), 3.6, TZ, 0xffe6c0, 9);
    S.lightsStatic.push([sd * (E + 8), 2.2, TZ + 6, 0xffd9a0, 2.2], [sd * (fx + 0.6), 2.1, TZ - 12, 0xfff0d8, 1.2], [sd * (fx + 0.6), 2.1, TZ + 12, 0xfff0d8, 1.2]);

    // the ferry
    var fr = { len: 30, beam: 9, h: 2.4, hull: [212, 0.3, 0.24], parts: [], lit: [], lights: [], calm: 0.3, wake: true, wakeAge: 11 };
    fr.parts.push([0, 2.69, 1, 8, 2.5, 21, [210, 0.06, 0.6]], [0, 4.94, 2.5, 6.4, 2, 11.5, [210, 0.06, 0.62]], [0, 6.6, -1.6, 4.2, 1.4, 3.4, [210, 0.06, 0.64]],
      [0, 8.6, -1, 0.18, 3, 0.18, [220, 0.05, 0.3]], [0, 1.25, 0, 9.05, 0.22, 28, [212, 0.3, 0.5]], [0, 5.95, 2.5, 6.6, 0.12, 12, [210, 0.05, 0.6]]);
    fr.lit.push([0, 2.95, 1, 8.2, 1, 19.6, [42, 0.85, 0.72]], [0, 5.1, 2.5, 6.6, 0.75, 10.6, [42, 0.85, 0.74]], [0, 6.75, -1.6, 4.4, 0.45, 3.6, [200, 0.3, 0.4]]);
    fr.lights.push([0, 10.2, -1, 0xffffff, 1.2], [-4.6, 4.2, -8, 0xff3b30, 0.8], [4.6, 4.2, -8, 0x3dff6e, 0.8], [0, 3.4, 15.1, 0xffffff, 0.8], [0, 5.9, 9, 0xffd9a0, 1.6]);
    fr.go = ferryRun(sd, berth);
    F.add(fr); S.ferry = fr;

    // a small boat under way outside the breakwater, round and round
    var mb = { len: 6.5, beam: 2.4, h: 1.3, hull: [45, 0.08, 0.88], parts: [[0, 1.2, 0.4, 1.1, 0.8, 1.1, [215, 0.2, 0.18]], [0, 1.7, 0.1, 1.1, 0.05, 0.4, [200, 0.2, 0.6]], [0, 1.6, 2.6, 0.06, 1.6, 0.06, [0, 0, 0.6]]], lit: [], lights: [[0, 2.45, 2.6, 0xffffff, 0.6], [-0.9, 0.95, -2.2, 0xff3b30, 0.3], [0.9, 0.95, -2.2, 0x3dff6e, 0.3]], wake: true, wakeAge: 8 };
    mb.go = oval(sd * 130, -8, 55, 18, 6, 0, sd); F.add(mb);
  }

  function jackLondonLife(k, S, F) {
    var sd = k.water, E = S.edge;
    // a tug pushing a deck barge up the channel between the promenade and the wharf, slowly
    var tow = { len: 11, beam: 4.4, h: 2.4, hull: [355, 0.55, 0.26], parts: [], lit: [], lights: [], calm: 0.35, wake: true, wakeAge: 12 };
    tow.parts.push([0, 2.34, 1, 3, 1.8, 4.4, [45, 0.06, 0.85]], [0, 3.85, 0.2, 2.6, 1.2, 2.6, [45, 0.06, 0.88]], [0, 4.0, 2.6, 0.9, 1.4, 0.9, [0, 0, 0.12]], [0, 5.3, -0.3, 0.12, 2.4, 0.12, [0, 0, 0.6]], [0, 0.55, -5.6, 3.6, 1.0, 0.7, [0, 0, 0.08]]);
    tow.lit.push([0, 3.95, 0.2, 2.8, 0.45, 2.8, [42, 0.8, 0.7]]);
    // the barge ahead of her, with a few containers on deck
    var bz = -6.2 - 18, cc = [[6, 0.55, 0.32], [212, 0.45, 0.3], [170, 0.35, 0.28], [28, 0.6, 0.38], [0, 0, 0.55]];
    tow.parts.push([0, 0.35, bz, 8.6, 1.9, 36, [18, 0.32, 0.2]]);
    for (var i = 0; i < 4; i++) for (var j = 0; j < 2; j++) if ((i + j) % 3 !== 2) tow.parts.push([(j - 0.5) * 2.7, 2.6, bz - 12 + i * 7.4, 2.44, 2.55, 6.1, cc[(i * 2 + j * 3) % cc.length]]);
    tow.lights.push([0, 6.4, -0.3, 0xffffff, 0.6], [0, 5.8, -0.3, 0xffffff, 0.6], [-2.3, 3.3, 0.5, 0xff3b30, 0.5], [2.3, 3.3, 0.5, 0x3dff6e, 0.5], [-4.1, 1.6, bz - 17.6, 0xffb340, 0.5], [4.1, 1.6, bz - 17.6, 0xffb340, 0.5], [0, 4.7, 4.1, 0xffd9a0, 1.2]);
    tow.go = lane(sd * (E + 28), 150, -k.L - 170, 1.6, 106); F.add(tow);
    // a pilot boat running the other way
    var pb = { len: 9, beam: 3.2, h: 1.8, hull: [210, 0.15, 0.14], parts: [[0, 1.88, -0.6, 2.3, 1.6, 3.6, [22, 0.75, 0.5]], [0, 3.5, -0.4, 0.1, 1.6, 0.1, [0, 0, 0.6]], [0, 1.15, 0, 3.25, 0.18, 8.6, [22, 0.75, 0.5]]], lit: [[0, 2.15, -0.6, 2.45, 0.45, 3.75, [42, 0.7, 0.62]]], lights: [[0, 4.45, -0.4, 0xffffff, 0.8], [0, 3.95, -0.4, 0xff3b30, 0.8], [-1.6, 1.6, -2, 0xff3b30, 0.3], [1.6, 1.6, -2, 0x3dff6e, 0.3]], wake: true, wakeAge: 9 };
    pb.go = lane(sd * (E + 13), -k.L - 140, 140, 6.5, 12); F.add(pb);
    // a tug tied up at the wharf face, her deck lit
    var tg = { len: 11, beam: 4.4, h: 2.4, hull: [355, 0.55, 0.26], parts: tow.parts.slice(0, 5), lit: tow.lit.slice(), lights: [[0, 6.4, -0.3, 0xffffff, 0.6], [0, 4.7, 4.1, 0xffd9a0, 1.2]], calm: 0.5 };
    tg.x = sd * (E + 42 - 2.6); tg.z = -64; tg.yaw = PI; F.add(tg);
    var wb = { len: 13, beam: 4.6, h: 2.0, hull: [210, 0.12, 0.2], parts: [[0, 2.0, 3, 3.6, 1.6, 4.4, [45, 0.05, 0.8]], [0, 1.2, -3, 4.4, 0.4, 6, [30, 0.1, 0.3]]], lit: [[0, 2.2, 3, 3.75, 0.4, 4.55, [42, 0.7, 0.62]]], lights: [[0, 3.6, 3, 0xffffff, 0.5]], calm: 0.5 };
    wb.x = sd * (E + 42 - 2.7); wb.z = -84; wb.yaw = PI; F.add(wb);
  }

  function brooklynLife(k, S, F) {
    var sd = k.water, E = S.edge, r = k.r, st = S.stat, DECK = [30, 0.1, 0.4], fx = E + 6, z0 = -58, z1 = -112;
    // one quiet float with a handful of boats on it
    st.push([sd * fx, Y0 + 0.3, (z0 + z1) / 2, 2.2, 0.5, z0 - z1, 0, 0, 0, DECK]);
    st.push([sd * (E + 2.5), Y0 + 0.5, z0 - 6, 5, 0.12, 1.4, 0, 0, sd * 0.2, [210, 0.06, 0.5]]);
    for (var z = z0 - 4, n = 0; z > z1 + 2; z -= 12, n++) {
      st.push([sd * (fx - 1.1), Y0 + 1.0, z, 0.32, 2.6, 0.32, 0, 0, 0, [30, 0.15, 0.22]]);
      if (n % 2 === 0) { k.glow(sd * fx, Y0 + 1.6, z - 6, 0xffe0b0, 1.6); S.lightsStatic.push([sd * fx, Y0 + 1.6, z - 6, 0xffd9a0, 0.5]); st.push([sd * fx, Y0 + 1.0, z - 6, 0.08, 1.0, 0.08, 0, 0, 0, [220, 0.05, 0.3]]); }
      if (n === 3) continue;
      var v = r() < 0.5 ? sail(r) : cruiser(r); v.len = Math.min(v.len, 9); v.x = sd * (fx + 1.1 + v.beam / 2 + 0.3); v.z = z - 6; v.yaw = r() < 0.5 ? 0 : PI; v.calm = 0.7; F.add(v);
    }
    // two kayaks out from Shoreline Kayak & Paddle, slowly, each with a small lamp
    [[sd * (E + 24), -30, 9, 34, 1.4, 0, 1], [sd * (E + 30), -140, 8, 26, 1.2, 40, -1]].forEach(function (o, i) {
      var hue = [[8, 0.75, 0.5], [48, 0.85, 0.55]][i];
      var ky = { len: 4.6, beam: 0.68, h: 0.4, hull: hue, parts: [[0, 0.5, 0.25, 0.42, 0.6, 0.32, [210, 0.3, 0.2]], [0, 0.93, 0.25, 0.22, 0.24, 0.22, [28, 0.35, 0.42]]], lit: [], lights: [[0, 1.12, 0.15, 0xfff6e8, 0.3]], calm: 1, wake: true, wakeAge: 5 };
      var pad = [0, 0.62, 0.05, 2.3, 0.05, 0.1, [0, 0, 0.12]]; pad.pivot = [0, 0.62, 0.05]; pad.anim = function (t, v) { var a = t * 2.4 + v.ph; return [0, Math.sin(a) * 0.35, Math.sin(a) * 0.5]; };
      ky.parts.push(pad);
      ky.go = oval(o[0], o[1], o[2], o[3], o[4], o[5], o[6]); F.add(ky);
    });
  }

  function lakeLife(k, S, F) {
    var sd = k.water, E = S.edge, L = k.L;
    // two sculls from Lakeside Rowing Club, gliding the length of the lake, oars sweeping
    [[sd * (E + 26), 1, 66], [sd * (E + 48), -1, 70]].forEach(function (o) {
      var sc = { len: 8.2, beam: 0.48, h: 0.32, hull: [40, 0.3, 0.74], parts: [[0, 0.55, 0.3, 0.38, 0.55, 0.28, [210, 0.3, 0.2]], [0, 0.93, 0.3, 0.2, 0.22, 0.2, [28, 0.35, 0.42]]], lit: [], lights: [[0, 0.32, 4.0, 0xffffff, 0.3]], calm: 1, wake: true, wakeAge: 6 };
      [-1, 1].forEach(function (s) {
        var oar = [s * 1.75, 0.3, 0.1, 2.9, 0.04, 0.07, [40, 0.2, 0.7]]; oar.pivot = [s * 0.32, 0.3, 0.1];
        oar.anim = function (t, v) { var a = t * 2.1 + v.ph; return [0, s * Math.sin(a) * 0.55, -s * (0.12 + Math.cos(a) * 0.1)]; };
        sc.parts.push(oar);
      });
      var zA = o[1] > 0 ? 160 : -L - 170, zB = o[1] > 0 ? -L - 170 : 160, len = Math.abs(zB - zA), base = 2.8;
      sc.go = function (t, v) { var a = t * 2.1 + v.ph, d = ((t + o[2]) * base + Math.sin(a) * 0.35) % len; v.x = o[0]; v.z = zA + (zB < zA ? -d : d); v.yaw = zB < zA ? 0 : PI; v.spd = base * (1 + 0.4 * Math.cos(a)); v.hide = false; };
      F.add(sc);
    });
  }

  // the far shore: estuary — a low shoreline of lights a long way off; lake — trees ringing the water, buildings behind them
  function farShore(k, S) {
    var T = k.THREE, sd = k.water, r = k.r, st = S.stat, lake = S.lake, pts = [], i;
    var X0 = lake ? k.WALK + 135 : k.WALK + 320, zA = 260, zB = -k.L - 420, solid = k.WX !== 'fog';
    if (k.WX === 'fog') st = [];
    st.push([sd * (X0 + 40), Y0 + 0.6, (zA + zB) / 2, 80, 2.2, zA - zB, 0, 0, 0, [30, 0.05, 0.08]]);
    for (var z = zA; z > zB; z -= 8 + r() * 14) {
      var bw = 8 + r() * 18, bh = lake ? 8 + Math.pow(r(), 1.5) * 30 : 3 + Math.pow(r(), 2) * 22, bx = X0 + (lake ? 22 : 6) + r() * 25, bd = 8 + r() * 10;
      st.push([sd * bx, bh / 2, z, bd, bh, bw, 0, 0, 0, [220, 0.06, 0.1]]);
      for (i = 0; i < bh / 3; i++) if (r() < 0.45) pts.push(sd * (bx - bd / 2 - 0.3), 1 + r() * (bh - 1.5), z + (r() - 0.5) * bw, r() < 0.8 ? 0xffd28a : 0xcfe0ff);
    }
    for (z = zA; z > zB; z -= 6 + r() * 10) pts.push(sd * (X0 + 1), 1.6 + r() * 1.2, z, 0xffc070);
    if (lake) {
      var crowns = [];
      for (z = zA; z > zB; z -= 4 + r() * 4) { var cr = 3 + r() * 3.5; crowns.push([sd * (X0 + 3 + r() * 10), 2 + cr * 0.8 + r() * 2, z, cr * 1.2, cr, cr * 1.2, 0, r() * 3, 0, [110 + r() * 30, 0.3, 0.07 + r() * 0.04]]); }
      if (solid) inst(k, new T.IcosahedronGeometry(1, 0), new T.MeshLambertMaterial({ color: 0xffffff }), crowns);
    }
    // the lights over there stay visible after the fog has eaten the shapes
    var n = pts.length / 4, p = new Float32Array(n * 3), c = new Float32Array(n * 3), col = new T.Color(), dim = { clear: 0.55, overcast: 0.4, rain: 0.28, fog: 0.08 }[k.WX] || 0.5;
    for (i = 0; i < n; i++) { p[i * 3] = pts[i * 4]; p[i * 3 + 1] = pts[i * 4 + 1]; p[i * 3 + 2] = pts[i * 4 + 2]; col.set(pts[i * 4 + 3]).multiplyScalar(dim * (0.5 + r() * 0.5)); c[i * 3] = col.r; c[i * 3 + 1] = col.g; c[i * 3 + 2] = col.b; }
    var g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(p, 3)); g.setAttribute('color', new T.BufferAttribute(c, 3));
    var m = new T.Points(g, new T.PointsMaterial({ map: k.glowTex, vertexColors: true, size: lake ? 1.6 : 2.6, transparent: true, blending: T.AdditiveBlending, depthWrite: false, fog: false }));
    k.root.add(m);
    if (lake) S.lightsStatic.push([sd * (X0 + 1), 2, -k.L * 0.3, 0xffc070, 1.5], [sd * (X0 + 1), 2, -k.L * 0.7, 0xffc070, 1.5]);
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
    farShore(k, S);
    inst(k, new T.BoxGeometry(1, 1, 1), new T.MeshLambertMaterial({ color: 0xffffff }), S.stat, true);
    inst(k, new T.BoxGeometry(1, 1, 1), new T.MeshBasicMaterial({ color: 0xffffff }), S.statLit);
    F.build();
    var wakes = makeWakes(k, F);

    // lights the water can mirror: street lamps on the water side, lit piers, and the boats' brightest lights
    var cands = [];
    k.lampSpots.forEach(function (l) { if (l[0] * k.water > 0) cands.push({ x: l[0], y: 4.5 + k.yAt(l[1]), z: l[1], c: hexRGB(T, 0xffd9a0), w: 1.3 }); });
    S.lightsStatic.forEach(function (l) { cands.push({ x: l[0], y: l[1], z: l[2], c: hexRGB(T, l[3]), w: l[4] }); });
    F.list.forEach(function (v) { v.lights.forEach(function (l, j) { if (l[4] >= 0.5) cands.push({ v: v, j: j, c: hexRGB(T, l[3]), w: l[4], x: 0, y: -500, z: 0 }); }); });
    var blink = S.blink || [], bpts = null;
    if (blink.length) {
      var bp = new Float32Array(blink.length * 3), bc = new Float32Array(blink.length * 3);
      blink.forEach(function (b, i) { bp[i * 3] = b[0]; bp[i * 3 + 1] = b[1]; bp[i * 3 + 2] = b[2]; });
      var bg = new T.BufferGeometry(); bg.setAttribute('position', new T.BufferAttribute(bp, 3)); bg.setAttribute('color', new T.BufferAttribute(bc, 3));
      bpts = new T.Points(bg, new T.PointsMaterial({ map: k.glowTex, vertexColors: true, size: 2.2, transparent: true, blending: T.AdditiveBlending, depthWrite: false }));
      k.root.add(bpts);
    }
    var chosen = [], frame = 0, lpArr = F.pts.geometry.attributes.position.array, bcol = new T.Color();
    k.ticks.push(function (t, dt, cam) {
      var q = k.quality();
      F.pose(t);
      if (wakes) wakes.update(t);
      if (bpts) {
        var ca = bpts.geometry.attributes.color.array;
        blink.forEach(function (b, i) { var on = ((t + i * 1.3) % 4) < 0.9 ? 1 : 0.06; bcol.set(b[3]).multiplyScalar(on); ca[i * 3] = bcol.r; ca[i * 3 + 1] = bcol.g; ca[i * 3 + 2] = bcol.b; });
        bpts.geometry.attributes.color.needsUpdate = true;
      }
      if (!S.mat) return;
      var u = S.mat.uniforms; u.t.value = t;
      if (q === 0) { u.nL.value = 0; u.detail.value = 0; return; }
      // boat lights follow their boats
      cands.forEach(function (c) { if (c.v) { var o = (c.v.i0[3] + c.j) * 3; c.x = lpArr[o]; c.y = lpArr[o + 1]; c.z = lpArr[o + 2]; } });
      if (frame++ % 8 === 0) {
        chosen = cands.filter(function (c) { return c.y > -100 && c.z < cam.z + 25 && c.z > cam.z - 220; })
          .sort(function (a, b) { return ((a.x - cam.x) * (a.x - cam.x) + (a.z - cam.z) * (a.z - cam.z)) / a.w - ((b.x - cam.x) * (b.x - cam.x) + (b.z - cam.z) * (b.z - cam.z)) / b.w; })
          .slice(0, q > 1 ? MAXL : 8);
      }
      for (var i = 0; i < chosen.length; i++) { var c = chosen[i]; u.lp.value[i].set(c.x, c.y, c.z, c.w); u.lc.value[i].set(c.c[0], c.c[1], c.c[2]); }
      u.nL.value = chosen.length;
    });
    F.pose(0); if (wakes) wakes.update(0);
  }

  return { surface: surface, life: life };
})();

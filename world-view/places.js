// Places that are businesses in their own right. Inlined into the page by build.js.
// Each function draws one place: fn(kit, place, biz)
//   kit   — drawing helpers from the page: THREE, root, box, walled, blade, glow, crane, flat, yAt, r,
//           WALK (pavement edge), ROAD, L (street length), gz (gate z), water (side or 0), beacons, ticks,
//           nameTex, signTex, sectorHue, roofGeo, H (the hood: H.lay.places is every held place), ST (its style)
//   place — { type, s (side -1 | 1, 0 = spans the street), z (centre along the street), half }
//   biz   — the Business_Ledger row { n: name, s: sector, e: employees }; its name is the only text painted
// The street runs toward -z; +x is the right-hand side. Nothing here invents a name.
// Glow sizes: under 8 fade in the fog like everything else; 8 and up carry through it; over 20 is a soft haze.
var PLACES = {};
(function () {
  // ---------- helpers local to the places ----------
  function rng(seed) { var s = (seed >>> 0) || 1; return function () { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
  function seedOf(t) { var h = 2166136261; t = String(t || 'x'); for (var i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function col(T, a) { return new T.Color().setHSL(a[0] / 360, a[1], a[2]); }
  function lam(k, a, o) { var p = o || {}; p.color = col(k.THREE, a); return new k.THREE.MeshLambertMaterial(p); }
  function bas(k, a, o) { var p = o || {}; p.color = col(k.THREE, a); return new k.THREE.MeshBasicMaterial(p); }
  // fog that thins with distance less quickly, for the one landmark meant to be seen from the far end of a street
  function thin(T, m, f) {
    var c = f.toFixed(2);
    m.onBeforeCompile = function (sh) { sh.fragmentShader = sh.fragmentShader.replace('#include <fog_fragment>', T.ShaderChunk.fog_fragment.replace('fogDensity * fogDensity', '(fogDensity * ' + c + ') * (fogDensity * ' + c + ')')); };
    m.customProgramCacheKey = function () { return 'thin' + c; };
    return m;
  }
  function add(k, geo, mat, x, y, z, shadow) { var m = new k.THREE.Mesh(geo, mat); m.position.set(x, y, z); if (shadow) m.castShadow = true; k.root.add(m); return m; }
  // many boxes (or any one shape) in one draw: items are [x, y, z, sx, sy, sz, rx, ry, rz, hsl?]
  var O3 = null, C3 = null;
  function inst(k, geo, mat, items, shadow) {
    var T = k.THREE; O3 = O3 || new T.Object3D(); C3 = C3 || new T.Color();
    if (!items.length) return null;
    var m = new T.InstancedMesh(geo, mat, items.length), colored = items.some(function (it) { return it[9]; });
    items.forEach(function (it, i) {
      O3.position.set(it[0], it[1], it[2]); O3.rotation.set(it[6] || 0, it[7] || 0, it[8] || 0, 'YXZ'); O3.scale.set(it[3], it[4], it[5]); O3.updateMatrix();
      m.setMatrixAt(i, O3.matrix);
      if (colored) { var c = it[9] || [0, 0, 1]; m.setColorAt(i, C3.setHSL(c[0] / 360, c[1], c[2])); }
    });
    m.castShadow = !!shadow; k.root.add(m); return m;
  }
  function boxes(k, mat, items, shadow) { return inst(k, new k.THREE.BoxGeometry(1, 1, 1), mat, items, shadow); }
  // a straight member from a to b, t thick
  function beam(a, b, t, c) {
    var dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2], h = Math.sqrt(dx * dx + dz * dz), len = Math.sqrt(h * h + dy * dy);
    return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2, t, t, len, -Math.atan2(dy, h), Math.atan2(dx, dz), 0, c];
  }
  // a painted name on a flat board; ry turns it (0 faces +z, the way you come from)
  function plate(k, text, hue, w, x, y, z, ry) {
    var T = k.THREE, m = new T.MeshBasicMaterial({ map: k.signTex(text, hue) }); m.userData.own = true;
    var s = add(k, new T.PlaneGeometry(w, w * 0.375), m, x, y, z); s.rotation.y = ry || 0; return s;
  }
  // the name run up a tall upright, letters turned to read bottom to top
  function uprightTex(T, text, hue) {
    var c = document.createElement('canvas'); c.width = 128; c.height = 704; var g = c.getContext('2d');
    g.fillStyle = 'hsl(' + hue + ',50%,8%)'; g.fillRect(0, 0, 128, 704);
    g.strokeStyle = 'hsl(' + hue + ',95%,66%)'; g.lineWidth = 7; g.strokeRect(9, 9, 110, 686);
    g.save(); g.translate(64, 352); g.rotate(-Math.PI / 2);
    var size = 84, F = '"Bricolage Grotesque", "Trebuchet MS", sans-serif'; g.font = '800 ' + size + 'px ' + F;
    var wdt = g.measureText(text).width; if (wdt > 640) { size = Math.floor(size * 640 / wdt); g.font = '800 ' + size + 'px ' + F; }
    g.fillStyle = 'hsl(' + hue + ',100%,84%)'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.shadowColor = 'hsl(' + hue + ',100%,60%)'; g.shadowBlur = 14;
    g.fillText(text, 0, 4); g.restore();
    var t = new T.CanvasTexture(c); t.anisotropy = 4; return t;
  }
  // shared pictures (made once, never disposed)
  var TEX = {};
  function canvasTex(T, key, w, h, draw) {
    if (TEX[key]) return TEX[key];
    var c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
    var t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; t.anisotropy = 4; return (TEX[key] = t);
  }
  // rows of seats with aisles: v runs up the rake, u around the bowl
  // each place gets its own copy, since how often the rows repeat is set on the texture; the picture is shared
  function seatTex(T) { var t = seatBase(T).clone(); t.needsUpdate = true; return t; }
  function seatBase(T) {
    return canvasTex(T, 'seats', 64, 64, function (g) {
      g.fillStyle = '#9aa3ad'; g.fillRect(0, 0, 64, 64);
      for (var y = 0; y < 64; y += 8) { g.fillStyle = '#5d6672'; g.fillRect(0, y, 64, 5); g.fillStyle = '#2b2f36'; g.fillRect(0, y + 5, 64, 1.5); }
      g.fillStyle = '#c9c4ba'; g.fillRect(30, 0, 4, 64);
    });
  }
  // a concrete drum: bands, piers and openings; the emissive half lights some of the openings
  function drumTex(T, lit) {
    return canvasTex(T, 'drum' + lit, 128, 64, function (g) {
      var r = rng(91);
      g.fillStyle = lit ? '#000' : '#bdb6aa'; g.fillRect(0, 0, 128, 64);
      if (!lit) { g.fillStyle = '#8e877c'; g.fillRect(0, 22, 128, 3); g.fillRect(0, 46, 128, 3); }
      for (var i = 0; i < 4; i++) {
        var x = i * 32;
        if (!lit) { g.fillStyle = '#d6d0c4'; g.fillRect(x, 0, 5, 64); }
        [[6, 12], [30, 12]].forEach(function (o) { var on = r() < 0.5; g.fillStyle = lit ? (on ? '#ffcf8a' : '#000') : '#2a2a30'; g.fillRect(x + 10, o[0], 16, o[1]); });
      }
    });
  }
  function clapTex(T) {
    return canvasTex(T, 'clap', 32, 32, function (g) {
      g.fillStyle = '#b08a68'; g.fillRect(0, 0, 32, 32);
      for (var y = 0; y < 32; y += 4) { g.fillStyle = 'rgba(30,18,10,.45)'; g.fillRect(0, y + 3, 32, 1); g.fillStyle = 'rgba(255,240,220,.12)'; g.fillRect(0, y, 32, 1); }
    });
  }
  // a gable: triangle rise h over span sp, run len; ridge along x when alongX, else along z
  function gable(k, sp, h, len, mat, x, y, z, alongX) {
    var T = k.THREE, sh = new T.Shape(); sh.moveTo(-sp / 2, 0); sh.lineTo(sp / 2, 0); sh.lineTo(0, h); sh.lineTo(-sp / 2, 0);
    var g = new T.ExtrudeGeometry(sh, { depth: len, bevelEnabled: false }); g.translate(0, 0, -len / 2);
    if (alongX) g.rotateY(Math.PI / 2);
    return add(k, g, mat, x, y, z, true);
  }
  function heldSpans(k) { return ((k.H && k.H.lay && k.H.lay.places) || []).filter(function (q) { return q.half > 0; }); }

  // ---------- the A's new ballpark: beyond the gate, on the water, still going up ----------
  // The bowl opens toward the street, so from far off you look into it: the finished lower bowl, half the upper
  // deck poured, the other half bare rakers in scaffold, cranes over it and work lights on the decks.
  PLACES.stadium = function (k, p, b) {
    var T = k.THREE, w = k.water || -1, cx = w * 26, cz = k.gz - 82, F = 0.4, i, a;
    var M = function (a, o) { return thin(T, lam(k, a, o), F); }, MB = function (a, o) { return thin(T, bas(k, a, o), F); };
    var open = 1.75, a0 = open / 2, aL = Math.PI * 2 - open, aDone = aL * 0.56, aRest = aL - aDone;
    var at = function (r, th, y) { return [cx + r * Math.sin(th), y, cz + r * Math.cos(th)]; };
    // the site: a raised pad on the shore
    add(k, new T.CylinderGeometry(80, 81, 0.8, 48), M([215, 0.05, 0.17]), cx, 0.4, cz);
    // the field, still mostly dirt, sod going down from the infield out
    var dirt = new T.Mesh(new T.CircleGeometry(42, 40), M([24, 0.32, 0.26])); dirt.rotation.x = -Math.PI / 2; dirt.position.set(cx, 0.84, cz); k.root.add(dirt);
    var sod = new T.Mesh(new T.CircleGeometry(40, 32, Math.PI * 0.75, Math.PI * 1.1), M([110, 0.32, 0.22])); sod.rotation.x = -Math.PI / 2; sod.position.set(cx, 0.86, cz); k.root.add(sod);
    var dia = new T.Mesh(new T.PlaneGeometry(17, 17), M([26, 0.4, 0.34])); dia.rotation.set(-Math.PI / 2, 0, Math.PI / 4); dia.position.set(cx, 0.88, cz - 22); k.root.add(dia);
    // lower bowl: finished seats on a rake, a concrete back wall
    var st = seatTex(T), sm = M([0, 0, 1], { map: st, side: T.DoubleSide }); st.repeat.set(46, 9); sm.userData.own = true;
    add(k, new T.CylinderGeometry(58, 40, 14, 72, 1, true, a0, aL), sm, cx, 7.8, cz);
    add(k, new T.CylinderGeometry(59, 59, 16, 72, 1, true, a0, aL), M([30, 0.05, 0.5], { side: T.DoubleSide }), cx, 8, cz, true);
    // the main concourse, poured all the way round
    var ring = new T.Mesh(new T.RingGeometry(55, 70, 72, 1, a0 - Math.PI / 2, aL), M([30, 0.04, 0.56], { side: T.DoubleSide })); ring.rotation.x = -Math.PI / 2; ring.position.set(cx, 16, cz); k.root.add(ring);
    // upper deck: the done half has seats and a canopy; the rest is rakers
    var a1 = a0 + aL - aDone;
    var st2 = seatTex(T), sm2 = M([0, 0, 1], { map: st2, side: T.DoubleSide }); st2.repeat.set(30, 9); sm2.userData.own = true;
    add(k, new T.CylinderGeometry(76, 56, 18, 48, 1, true, a1, aDone), sm2, cx, 25.5, cz);
    var roofR = new T.Mesh(new T.RingGeometry(60, 80, 48, 1, a1 - Math.PI / 2, aDone), M([200, 0.06, 0.62], { side: T.DoubleSide })); roofR.rotation.x = -Math.PI / 2 + 0.05; roofR.position.set(cx, 40, cz); k.root.add(roofR);
    // steel and concrete frame
    var steel = [], conc = [], scaf = [];
    for (a = a0 + 0.04; a < a0 + aL; a += 0.075) {
      var done = a > a1;
      conc.push((function () { var q = at(70, a, 17); return [q[0], 8.5, q[2], 1.4, 17, 1.4]; })());
      if (done) { var q2 = at(78, a, 0); steel.push([q2[0], 20.5, q2[2], 0.7, 41, 0.7]); }
      else {
        steel.push(beam(at(56, a, 16.5), at(76, a, 34.5), 0.9));
        var q3 = at(76, a, 0); steel.push([q3[0], 25, q3[2], 1, 18, 1]);
        if (Math.round(a * 40) % 3 === 0) steel.push(beam(at(70, a, 17), at(76, a, 34), 0.5));
      }
    }
    // scaffold on the open half: standards and ledgers on the outer face
    var sa = a0 + 0.02, sb = a1;
    for (a = sa; a < sb; a += 0.05) { var sq = at(79.5, a, 0); scaf.push([sq[0], 17, sq[2], 0.25, 34, 0.25]); }
    for (var lv = 3; lv <= 33; lv += 5) for (a = sa; a < sb - 0.05; a += 0.1) scaf.push(beam(at(79.5, a, lv), at(79.5, a + 0.1, lv), 0.22));
    boxes(k, M([30, 0.05, 0.62]), conc, true);
    boxes(k, M([205, 0.12, 0.42]), steel);
    boxes(k, M([34, 0.55, 0.5]), scaf);
    // light standards on the rim, their banks not lit yet
    var std = [];
    [a0 + 0.25, a0 + aL * 0.3, a0 + aL * 0.5, a0 + aL * 0.7, a0 + aL - 0.25].forEach(function (th) {
      var q = at(84, th, 0); std.push([q[0], 31, q[2], 1.6, 62, 1.6]);
      var h = at(82.5, th, 63); std.push([h[0], 63, h[2], 12, 7, 1.2, 0.35, th, 0, [215, 0.08, 0.2]]);
    });
    std.forEach(function (s) { if (!s[9]) s[9] = [215, 0.06, 0.36]; });
    boxes(k, M([0, 0, 1]), std);
    // tower cranes over the bowl
    var cr = [], R = rng(seedOf(b && b.n) || 5);
    [[cx - w * 4, cz - 6, 92, 0.5], [cx + w * 66, cz + 10, 84, 2.6], [cx - w * 64, cz - 34, 88, -0.9], [cx + w * 10, cz - 76, 80, 1.9]].forEach(function (c) {
      var x = c[0], z = c[1], H = c[2], ang = c[3], jib = 64, cj = 20, dx = Math.sin(ang), dz = Math.cos(ang);
      cr.push([x, H / 2, z, 2.2, H, 2.2]);
      cr.push(beam([x - dx * cj, H + 1, z - dz * cj], [x + dx * jib, H + 1, z + dz * jib], 1.6));
      cr.push([x, H + 6, z, 1.4, 10, 1.4]);
      cr.push(beam([x, H + 11, z], [x + dx * jib * 0.7, H + 1.8, z + dz * jib * 0.7], 0.35));
      cr.push(beam([x, H + 11, z], [x - dx * cj, H + 1.8, z - dz * cj], 0.35));
      cr.push([x - dx * (cj - 3), H - 1.2, z - dz * (cj - 3), 4, 3.5, 4, 0, ang, 0]);
      cr.push([x + dx * 1.8, H - 2, z + dz * 1.8, 2.4, 2.4, 2.4, 0, ang, 0]);
      var tr = 18 + R() * 36, hx = x + dx * tr, hz = z + dz * tr, drop = 26 + R() * 30;
      cr.push([hx, H - drop / 2, hz, 0.12, drop, 0.12]);
      cr.push([hx, H - drop - 1, hz, 9, 1.4, 1.6, 0, ang + 1.2, 0]);
      k.beacons.push(x, H + 12, z, x + dx * jib, H + 2, z + dz * jib);
    });
    boxes(k, M([42, 0.75, 0.48]), cr);
    // work lights on the decks, a haze over the bowl, light towers on the field
    for (i = 0; i < 26; i++) { var th = a0 + 0.1 + (i / 26) * (aL - 0.2), rr = i % 2 ? 60 : 70, y = i % 2 ? 17.5 : (th > a1 ? 36 : 22), q = at(rr, th, y); k.glow(q[0], q[1], q[2], i % 3 ? 0xffe6bc : 0xcfe2ff, 9); }
    var towers = [];
    [[-24, 6], [22, -2], [-6, -30], [30, 26]].forEach(function (o) { towers.push([cx + o[0], 4, cz + o[1], 0.4, 8, 0.4, 0, 0, 0, [220, 0.05, 0.3]]); towers.push([cx + o[0], 8.4, cz + o[1], 2.6, 1.2, 0.5, 0, Math.atan2(-o[0], -o[1]), 0, [45, 0.4, 0.95]]); k.glow(cx + o[0], 8.6, cz + o[1], 0xfff3dc, 12); });
    boxes(k, MB([0, 0, 1]), towers);
    k.glow(cx, 24, cz - 10, 0xffd6a0, 120);
    if (b) { var sp = new T.SpriteMaterial({ map: k.nameTex(b.n), fog: false, transparent: true }); sp.userData.own = true; var s = new T.Sprite(sp); s.scale.set(64, 10, 1); s.position.set(cx, 62, cz - 30); k.root.add(s); }
  };

  // ---------- the Oaks' arena, beside the Baylight street: a drum going up, half its roof on ----------
  PLACES.arena = function (k, p, b) {
    var T = k.THREE, s = p.s, x = s * (k.WALK + 30), z = p.z, rad = 22, i, a;
    var conc = lam(k, [210, 0.06, 0.6]), skin = lam(k, [212, 0.1, 0.42], { side: T.DoubleSide });
    // a cleared site with the podium on it
    add(k, new T.BoxGeometry(56, 0.3, 2 * p.half - 2), lam(k, [30, 0.12, 0.2]), s * (k.WALK + 28), 0.15, z);
    add(k, new T.CylinderGeometry(rad + 2, rad + 2.5, 4, 48), conc, x, 2, z, true);
    // the lobby band on the street side, glazed and lit where it is finished
    add(k, new T.CylinderGeometry(rad + 2.55, rad + 2.55, 2.4, 40, 1, true, s > 0 ? Math.PI * 1.1 : 0.1, Math.PI * 0.8), bas(k, [38, 0.6, 0.46]), x, 2, z);
    // the upper drum: cladding on part of it, bare columns on the rest
    var clad = Math.PI * 1.15, cs = (s > 0 ? 0.75 : 1.25) * Math.PI - clad / 2; // the clad half faces away from the street
    add(k, new T.CylinderGeometry(rad, rad, 9, 48, 1, true, cs, clad), skin, x, 8.5, z, true);
    var cols = [], ribs = [];
    for (i = 0; i < 28; i++) { a = i / 28 * Math.PI * 2; cols.push([x + rad * Math.sin(a), 8.5, z + rad * Math.cos(a), 0.8, 9, 0.8]); }
    boxes(k, lam(k, [210, 0.05, 0.5]), cols, true);
    // the seating bowl inside, seen between the bare columns
    var st = seatTex(T); st.repeat.set(30, 7);
    var sb = lam(k, [210, 0.25, 0.7], { map: st, side: T.DoubleSide }); sb.userData.own = true;
    add(k, new T.CylinderGeometry(rad - 1.2, rad - 13, 9.5, 40, 1, true), sb, x, 8.75, z);
    var court = add(k, new T.PlaneGeometry(9, 16), lam(k, [30, 0.45, 0.4]), x, 4.05, z); court.rotation.x = -Math.PI / 2;
    // roof: half clad, the rest ribs from the ring beam to the crown
    var roof = new T.Mesh(new T.SphereGeometry(rad + 0.3, 32, 10, cs + Math.PI / 2, clad, 0, Math.PI / 2), skin); roof.scale.y = 0.42; roof.position.set(x, 13, z); roof.castShadow = true; k.root.add(roof);
    var arc = new T.TorusGeometry(rad, 0.2, 4, 14, Math.PI / 2);
    for (i = 0; i < 20; i++) ribs.push([x, 13, z, 1, 0.42, 1, 0, i / 20 * Math.PI * 2, 0]);
    // a torus quarter lies in its own x-y plane, from the rim (x = rad) to the crown (y = rad)
    inst(k, arc, lam(k, [32, 0.55, 0.42]), ribs);
    var rim = new T.Mesh(new T.TorusGeometry(rad, 0.5, 6, 48), lam(k, [32, 0.55, 0.38])); rim.rotation.x = Math.PI / 2; rim.position.set(x, 13, z); k.root.add(rim);
    var crown = new T.Mesh(new T.TorusGeometry(1.6, 0.3, 6, 20), lam(k, [32, 0.55, 0.38])); crown.rotation.x = Math.PI / 2; crown.position.set(x, 13 + rad * 0.42, z); k.root.add(crown);
    k.crane(x - s * 6, z - 4, 46); k.crane(x + s * 26, z + 20, 40);
    // work lights inside the open half and a haze over it
    for (i = 0; i < 10; i++) { a = cs + clad + (i / 10) * (Math.PI * 2 - clad); k.glow(x + (rad - 3) * Math.sin(a), 6 + (i % 3) * 3, z + (rad - 3) * Math.cos(a), 0xffe2b0, i % 2 ? 9 : 4); }
    k.glow(x, 14, z, 0xffcf96, 40);
    // site hoarding along the pavement, a gate in it, and the name
    var hx = s * (k.WALK + 0.25), hd = [], gateZ = z + p.half * 0.45;
    for (var hz = z - p.half + 2; hz < z + p.half - 2; hz += 2.4) if (Math.abs(hz - gateZ) > 2.4) hd.push([hx, 1.25, hz, 0.12, 2.5, 2.3, 0, 0, 0, (Math.round(hz / 2.4) % 2) ? [210, 0.1, 0.24] : [210, 0.1, 0.3]]);
    boxes(k, lam(k, [0, 0, 1]), hd, true);
    boxes(k, lam(k, [32, 0.6, 0.45]), [[hx, 1.4, gateZ - 2.4, 0.3, 2.8, 0.3], [hx, 1.4, gateZ + 2.4, 0.3, 2.8, 0.3], [hx, 2.9, gateZ, 0.3, 0.3, 5.1]]);
    k.glow(hx, 3.2, gateZ, 0xfff1d0, 2.2); k.glow(hx, 2.6, z - p.half + 3, 0xff9a4a, 1.2);
    if (b) { plate(k, b.n, k.sectorHue(b.s), 6.4, hx - s * 0.08, 1.4, z - 4, -s * Math.PI / 2); k.blade(b.n, k.sectorHue(b.s), s, 5.4, z + p.half - 1, 5); }
  };

  // ---------- the Coliseum: in use, lit for a game ----------
  PLACES.coliseum = function (k, p, b) {
    var T = k.THREE, s = p.s, sx = 0.74, rad = 40, x = s * (k.WALK + 18 + rad * sx), z = p.z, i;
    // the lot between the street and the bowl
    add(k, new T.BoxGeometry(60, 0.12, 2 * p.half), lam(k, [230, 0.06, 0.13]), s * (k.WALK + 30), 0.06, z);
    var stripes = [], cars = [], poles = [], Rr = rng(seedOf(b && b.n) || 3);
    for (i = 0; i < 10; i++) stripes.push([s * (k.WALK + 4 + (i % 2) * 7), 0.14, z - p.half + 6 + Math.floor(i / 2) * 11, 4.6, 0.02, 0.14]);
    for (i = 0; i < 16; i++) { var cz = z - p.half + 5 + Rr() * (2 * p.half - 10); cars.push([s * (k.WALK + 3 + Rr() * 13), 0.65, cz, 1.8, 1.1, 4.1, 0, Rr() < 0.5 ? 0 : Math.PI, 0, [Rr() * 360, Rr() < 0.5 ? 0.05 : 0.35, 0.18 + Rr() * 0.25]]); }
    for (i = 0; i < 4; i++) { var pz = z - p.half + 6 + i * (2 * p.half - 12) / 3; poles.push([s * (k.WALK + 11), 4.5, pz, 0.25, 9, 0.25]); k.glow(s * (k.WALK + 11), 9.1, pz, 0xffe0b0, 3.4); }
    boxes(k, bas(k, [50, 0.2, 0.55]), stripes); boxes(k, lam(k, [0, 0, 1]), cars, true); boxes(k, lam(k, [230, 0.05, 0.3]), poles);
    // the drum: banded concrete with openings, some lit; the top rows of the bowl over it
    var map = drumTex(T, 0), em = drumTex(T, 1); map.repeat.set(18, 1); em.repeat.set(18, 1);
    var wall = add(k, new T.CylinderGeometry(rad, rad, 16, 64, 1, true), lam(k, [32, 0.08, 0.72], { map: map, emissive: 0xffffff, emissiveMap: em, side: T.DoubleSide }), x, 8, z, true); wall.scale.x = sx;
    var st = seatTex(T), bm = lam(k, [210, 0.2, 0.62], { map: st, side: T.DoubleSide }), bowl = add(k, new T.CylinderGeometry(rad + 1, rad - 14, 20, 64, 1, true), bm, x, 10, z); bm.userData.own = true; st.repeat.set(60, 10); bowl.scale.x = sx;
    var cap = add(k, new T.CylinderGeometry(rad + 1.2, rad + 1.2, 1.2, 64, 1, true), lam(k, [32, 0.06, 0.6], { side: T.DoubleSide }), x, 20.3, z); cap.scale.x = sx;
    var field = add(k, new T.CircleGeometry(rad - 14, 40), lam(k, [110, 0.45, 0.3]), x, 0.4, z); field.rotation.x = -Math.PI / 2; field.scale.x = sx;
    // spiral ramps at the corners of the drum
    var ramps = [];
    [0.8, 2.35, 3.95, 5.5].forEach(function (a) { ramps.push([x + Math.sin(a) * rad * sx * 1.06, 7.5, z + Math.cos(a) * rad * 1.06, 6, 15, 6]); });
    inst(k, new T.CylinderGeometry(0.5, 0.5, 1, 16), lam(k, [32, 0.06, 0.55]), ramps, true);
    // light towers with their banks on, and the glow coming up off the field
    var tw = [], heads = [];
    [0.55, 1.6, 2.6, 3.65, 4.7, 5.75].forEach(function (a) {
      var tx = x + Math.sin(a) * (rad * sx + 4), tz = z + Math.cos(a) * (rad + 4), ry = Math.atan2(x - tx, z - tz);
      tw.push([tx, 23, tz, 1, 46, 1]);
      heads.push([tx, 46.5, tz, 7, 4.2, 0.5, 0.35, ry, 0]);
      for (var j = 0; j < 6; j++) k.glow(tx + Math.cos(ry) * ((j % 3) - 1) * 2, 45.6 + Math.floor(j / 3) * 1.8, tz - Math.sin(ry) * ((j % 3) - 1) * 2, 0xffffff, 9);
    });
    boxes(k, lam(k, [230, 0.05, 0.32]), tw); boxes(k, bas(k, [55, 0.3, 0.96]), heads);
    k.glow(x, 24, z, 0xd8f0d0, 80); k.glow(x, 10, z, 0xeaf6e0, 50);
    if (b) {
      var sm = new T.SpriteMaterial({ map: k.nameTex(b.n), fog: false, transparent: true }); sm.userData.own = true;
      var sp = new T.Sprite(sm); sp.scale.set(34, 5.3, 1); sp.position.set(x - s * 12, 36, z + rad * 0.5); k.root.add(sp);
      k.blade(b.n, 95, s, 5.2, z + p.half - 1, 4.6);
    }
  };

  // ---------- city hall: a portico on the street, a tower and dome over it ----------
  PLACES.cityhall = function (k, p, b) {
    var T = k.THREE, s = p.s, z = p.z, W = k.WALK, i, stone = [44, 0.14, 0.7];
    k.walled(20, 12, 14, s * (W + 5 + 7), z, 'stucco', 0.62, [44, 0.14, 0.66], 1);
    k.box(15, 0.8, 21, s * (W + 12), 12.4, z, [44, 0.1, 0.56]);
    k.walled(9, 24, 9, s * (W + 13), z, 'stucco', 0.55, [44, 0.12, 0.7], 0);
    k.box(10.4, 0.8, 10.4, s * (W + 13), 24.4, z, [44, 0.1, 0.56]);
    var drum = add(k, new T.CylinderGeometry(3.6, 3.8, 4, 20), lam(k, stone), s * (W + 13), 26.8, z, true);
    var dome = add(k, new T.SphereGeometry(3.9, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), lam(k, [160, 0.22, 0.42]), s * (W + 13), 28.8, z, true);
    add(k, new T.CylinderGeometry(0.5, 0.7, 2.2, 8), lam(k, stone), s * (W + 13), 33.6, z);
    // drum windows lit, a ring of light under the dome
    var dw = [];
    for (i = 0; i < 8; i++) { var a = i / 8 * Math.PI * 2; dw.push([s * (W + 13) + Math.sin(a) * 3.7, 26.8, z + Math.cos(a) * 3.7, 0.8, 2.2, 0.8, 0, a, 0]); }
    boxes(k, bas(k, [42, 0.8, 0.62]), dw);
    k.glow(s * (W + 13), 31.5, z, 0xffe9c4, 9);
    // portico: steps, columns, entablature, pediment facing the street
    for (i = 0; i < 4; i++) k.box(1.1, 0.2, 18 - i * 0.6, s * (W + 0.6 + i * 1.0), 0.1 + i * 0.2, z, [44, 0.08, 0.6]);
    var cols = [];
    for (i = 0; i < 6; i++) cols.push([s * (W + 4.2), 5.1, z - 6.5 + i * 2.6, 1, 8.6, 1]);
    inst(k, new T.CylinderGeometry(0.42, 0.48, 1, 12), lam(k, [44, 0.1, 0.8]), cols, true);
    k.box(3.2, 0.8, 15.6, s * (W + 4.6), 1.0, z, [44, 0.08, 0.62]);
    k.box(3.6, 1.6, 15.6, s * (W + 4.6), 10, z, stone);
    gable(k, 15.6, 3, 3.6, lam(k, stone), s * (W + 4.6), 10.8, z, true);
    k.box(0.2, 7, 6, s * (W + 4.95), 4.9, z, [40, 0.7, 0.42], true);
    // the frieze carries the name; uplights wash the columns
    if (b) plate(k, b.n, 45, 4, s * (W + 2.76), 10, z, -s * Math.PI / 2);
    for (i = 0; i < 6; i++) k.glow(s * (W + 3.6), 1.4, z - 6.5 + i * 2.6, 0xffd9a0, 2.2);
    [-1, 1].forEach(function (e) { var lz = z + e * 9.5; k.box(0.14, 3.6, 0.14, s * (W - 0.6), 1.8, lz, [240, 0.08, 0.16]); k.box(0.5, 0.5, 0.5, s * (W - 0.6), 3.8, lz, [45, 0.6, 0.9], true); k.glow(s * (W - 0.6), 3.8, lz, 0xfff0d0, 3); });
    if (b) k.blade(b.n, 45, s, 6, z + p.half - 0.6, 5);
  };

  // ---------- a theater: marquee with running bulbs, the name up an upright ----------
  PLACES.theater = function (k, p, b) {
    var T = k.THREE, s = p.s, z = p.z, W = k.WALK, i, hue = b ? [350, 30, 280, 12, 200][seedOf(b.n) % 5] : 350;
    k.walled(18, 15, 14, s * (W + 7), z, 'brick', 0.25, [hue === 200 ? 30 : 18, 0.3, 0.4], 1);
    k.box(14.6, 0.9, 18.6, s * (W + 7.2), 15.3, z, [20, 0.2, 0.28]);
    // a lit line under the cornice
    k.box(0.12, 0.18, 18, s * (W - 0.08), 14.3, z, [hue, 0.9, 0.7], true);
    // the entrance: lit doors and two blank poster cases
    k.box(0.1, 3, 8, s * (W - 0.05), 1.6, z + 2, [40, 0.8, 0.56], true);
    k.box(0.1, 2, 1.5, s * (W - 0.06), 1.5, z - 4.2, [hue, 0.4, 0.5], true); k.box(0.1, 2, 1.5, s * (W - 0.06), 1.5, z + 8.1, [hue, 0.4, 0.5], true);
    // marquee: a box out over the pavement, a board each way, bulbs top and bottom
    var mx = s * (W - 1.75), mz = z + 2, mL = 11, mY = 4.9;
    k.box(3.4, 2.6, mL, mx, mY, mz, [hue, 0.25, 0.14]);
    k.box(3.5, 0.08, mL + 0.1, mx, mY - 1.33, mz, [44, 0.8, 0.82], true);
    if (b) { plate(k, b.n, hue, 6.6, s * (W - 3.47), mY, mz, -s * Math.PI / 2); plate(k, b.n, hue, 3.2, mx, mY, mz + mL / 2 + 0.03, 0); }
    var bulbs = [[], []], bi = 0;
    function bulb(x, y, zz) { bulbs[bi++ % 2].push([x, y, zz, 0.16, 0.16, 0.16]); }
    for (i = 0; i <= 26; i++) { var bz = mz - mL / 2 + i * mL / 26; bulb(s * (W - 3.5), mY + 1.25, bz); bulb(s * (W - 3.5), mY - 1.25, bz); }
    for (i = 0; i <= 8; i++) { var bx = s * (W - 3.4 + i * 3.3 / 8); bulb(bx, mY + 1.25, mz + mL / 2 + 0.05); bulb(bx, mY - 1.25, mz + mL / 2 + 0.05); }
    // the upright: a fin standing out from the face, the name run up it, bulbs on its edge
    var fz = z + 7.6, fx = s * (W - 1.0), fy = 11.2, fh = 11;
    var um = new T.MeshBasicMaterial({ map: uprightTex(T, b ? b.n : '', hue), side: T.DoubleSide }); um.userData.own = true;
    add(k, new T.PlaneGeometry(1.9, fh), um, fx, fy, fz);
    k.box(2.1, 0.25, 0.3, fx, fy + fh / 2 + 0.1, fz, [hue, 0.3, 0.2]);
    for (i = 0; i <= 22; i++) bulb(s * (W - 2.0), fy - fh / 2 + i * fh / 22, fz);
    var g = new T.SphereGeometry(1, 6, 4), on = new T.MeshBasicMaterial({ color: 0xfff1b8 }), off = new T.MeshBasicMaterial({ color: 0xfff1b8 });
    inst(k, g, on, bulbs[0]); inst(k, g.clone(), off, bulbs[1]);
    k.ticks.push(function (t) { var u = Math.floor(t * 3) % 2; on.color.setHSL(0.13, 1, u ? 0.92 : 0.55); off.color.setHSL(0.13, 1, u ? 0.55 : 0.92); });
    // light spilling under the marquee onto the pavement
    for (i = 0; i < 5; i++) k.glow(s * (W - 1.8), 3.3, mz - 4 + i * 2, 0xffe9a8, 2.6);
    k.glow(fx, fy, fz + 0.4, 0xfff0d0, 9);
  };

  // ---------- a cultural center: a lit glass hall under a heavier upper block, banners out front ----------
  PLACES.cultural = function (k, p, b) {
    var T = k.THREE, s = p.s, z = p.z, W = k.WALK, i;
    k.walled(18, 5, 14, s * (W + 7.5), z, 'glass', 0.92, [200, 0.15, 0.62], 1);
    var up = add(k, new T.BoxGeometry(15.5, 7.5, 19.6), lam(k, [14, 0.42, 0.42]), s * (W + 6.4), 8.75, z, true); up.receiveShadow = true;
    k.box(16, 0.5, 20, s * (W + 6.4), 12.75, z, [14, 0.3, 0.26]);
    // vertical fins on the street face, lit slots between them
    var fins = [], slots = [];
    for (i = 0; i < 9; i++) { var fz = z - 9 + i * 2.25; fins.push([s * (W - 1.5), 8.75, fz, 0.6, 7.5, 0.35]); if (i < 8) slots.push([s * (W - 1.36), 9.2, fz + 1.12, 0.05, 4.6, 0.5]); }
    boxes(k, lam(k, [14, 0.3, 0.6]), fins, true); boxes(k, bas(k, [36, 0.85, 0.62]), slots);
    // entrance canopy with a lit soffit
    k.box(3, 0.35, 8, s * (W - 1), 4.6, z + 4, [14, 0.2, 0.3]); k.box(2.8, 0.05, 7.6, s * (W - 1), 4.4, z + 4, [40, 0.7, 0.75], true);
    for (i = 0; i < 4; i++) k.glow(s * (W - 1), 4.1, z + 1.5 + i * 1.7, 0xffe2b0, 2);
    // plain cloth banners hung toward the street, lit from below
    var hues = [350, 42, 160, 210];
    for (i = 0; i < 4; i++) { var bz = z - 8 + i * 3.4; var ban = new T.Mesh(new T.PlaneGeometry(1.1, 3.6), lam(k, [hues[i], 0.6, 0.42], { side: T.DoubleSide })); ban.position.set(s * (W - 2.4), 7.6, bz + 1.1); k.root.add(ban); k.box(1.4, 0.08, 0.08, s * (W - 2.4), 9.45, bz + 1.1, [240, 0.05, 0.2]); k.glow(s * (W - 2.4), 5.5, bz + 1.1, 0xffd9a0, 1.4); }
    if (b) k.blade(b.n, 5, s, 6, z + p.half - 0.8, 5.4);
    k.glow(s * (W - 0.4), 2, z, 0xffcf8a, 5);
  };

  // ---------- an old saloon: a small clapboard house among the bigger buildings, its porch on the pavement ----------
  PLACES.saloon = function (k, p, b) {
    var T = k.THREE, s = p.s, z = p.z, W = k.WALK, i;
    var tex = clapTex(T), wm = lam(k, [0, 0, 1], { map: tex }); tex.repeat.set(3, 2);
    add(k, new T.BoxGeometry(7, 4.2, 8.4), wm, s * (W + 3.5), 2.1, z, true);
    gable(k, 8.4, 2.4, 7.6, lam(k, [18, 0.2, 0.14]), s * (W + 3.5), 4.2, z, true);
    // porch roof and posts over the pavement, a step of planks under it
    var pr = k.box(1.9, 0.14, 8.8, s * (W - 0.9), 3.15, z, [22, 0.3, 0.18]); pr.rotation.z = s * 0.12;
    k.box(1.9, 0.2, 8.4, s * (W - 0.9), 0.26, z, [26, 0.3, 0.2]);
    boxes(k, lam(k, [26, 0.3, 0.22]), [[s * (W - 1.7), 1.6, z - 4, 0.18, 3, 0.18], [s * (W - 1.7), 1.6, z + 4, 0.18, 3, 0.18], [s * (W - 1.7), 1.6, z, 0.18, 3, 0.18]], true);
    // two warm windows with their bars, a lit door
    var win = [], bars = [];
    [-2.6, 2.6].forEach(function (o) { win.push([s * (W - 0.03), 1.9, z + o, 0.05, 1.5, 2]); bars.push([s * (W - 0.06), 1.9, z + o, 0.05, 1.55, 0.08], [s * (W - 0.06), 1.9, z + o, 0.05, 0.08, 2.05]); });
    boxes(k, bas(k, [32, 0.85, 0.55]), win); boxes(k, lam(k, [22, 0.3, 0.1]), bars);
    k.box(0.05, 2.4, 1.3, s * (W - 0.03), 1.4, z, [30, 0.8, 0.45], true);
    var barrel = new T.CylinderGeometry(0.42, 0.42, 1, 10);
    inst(k, barrel, lam(k, [24, 0.45, 0.24]), [[s * (W - 0.6), 0.86, z + 5.3, 1, 1.1, 1], [s * (W - 1.5), 0.86, z + 5.0, 1, 1.1, 1]], true);
    k.glow(s * (W - 0.3), 2.8, z - 1.2, 0xffb36a, 2.2); k.glow(s * (W - 0.3), 2.8, z + 1.2, 0xffb36a, 2.2); k.glow(s * (W - 0.4), 2.2, z, 0xff8a55, 4);
    if (b) { plate(k, b.n, 32, 5.4, s * (W - 0.02), 4.7, z, -s * Math.PI / 2); k.blade(b.n, 2, s, 5.4, z + p.half - 0.6, 5.4); }
  };

  // ---------- a house of worship: a gabled hall. No symbol on it: the name says whose it is ----------
  PLACES.faith = function (k, p, b) {
    var T = k.THREE, s = p.s, z = p.z, W = k.WALK, y0 = k.yAt(z), R = rng(seedOf(b && b.n));
    var palettes = [[38, 0.18, 0.72], [14, 0.35, 0.4], [210, 0.05, 0.62], [44, 0.22, 0.82], [26, 0.25, 0.55]], tone = palettes[Math.floor(R() * palettes.length)];
    var hw = 11 + Math.floor(R() * 2), hd = 13, hx = s * (W + 3 + hd / 2), hh = 6.8;
    var wall = lam(k, tone);
    var hall = add(k, new T.BoxGeometry(hd, hh + 1, hw), wall, hx, (hh - 1) / 2 + y0, z, true); hall.receiveShadow = true;
    gable(k, hw + 0.8, 4.4, hd + 1, lam(k, [tone[0], 0.2, 0.14]), hx, hh + y0, z, true);
    // front gable faces the street: a porch, a lit door, a tall window over it, steps
    k.box(2.4, 4.2, 4.2, s * (W + 1.8), 2.1 + y0, z, tone);
    gable(k, 4.6, 1.3, 2.6, lam(k, [tone[0], 0.2, 0.14]), s * (W + 1.8), 4.2 + y0, z, true);
    k.box(0.05, 2.6, 1.8, s * (W + 0.58), 1.3 + y0, z, [36, 0.8, 0.5], true);
    k.box(0.05, 3.4, 1.0, s * (W + 2.97), 7.8 + y0, z, [38, 0.75, 0.55], true);
    for (var st = 0; st < 3; st++) k.box(0.5, 0.18, 3.6 - st * 0.3, s * (W + 0.3 - st * 0.45), 0.09 + st * 0.18 + y0, z, [30, 0.08, 0.5]);
    // tall windows down both long sides, warm inside
    var wins = [];
    for (var i = 0; i < 4; i++) { var wx = hx - s * (hd / 2) + s * (2.2 + i * 2.9); wins.push([wx, 3.6 + y0, z + hw / 2 + 0.03, 1, 3.6, 0.05], [wx, 3.6 + y0, z - hw / 2 - 0.03, 1, 3.6, 0.05]); }
    boxes(k, bas(k, [38, 0.8, 0.52]), wins);
    // a low wall along the pavement with a gap at the steps, a lamp at the gap
    k.box(0.4, 0.8, (hw - 4.4) / 2, s * (W + 0.2), 0.4 + y0, z + hw / 2 - (hw - 4.4) / 4, [tone[0], tone[1], tone[2] * 0.8]);
    k.box(0.4, 0.8, (hw - 4.4) / 2, s * (W + 0.2), 0.4 + y0, z - hw / 2 + (hw - 4.4) / 4, [tone[0], tone[1], tone[2] * 0.8]);
    k.box(0.12, 3, 0.12, s * (W - 0.2), 1.5 + y0, z + 2.6, [240, 0.08, 0.16]); k.glow(s * (W - 0.2), 3.1 + y0, z + 2.6, 0xffe2b0, 2.4);
    k.glow(s * (W + 0.6), 2.8 + y0, z, 0xffd9a0, 4);
    if (b) k.blade(b.n, 265, s, 4.8, z + p.half - 0.6, 4.4);
  };

  // ---------- a street market: stalls on the pavement, string lights between them ----------
  PLACES.market = function (k, p, b) {
    var T = k.THREE, W = k.WALK, z0 = -k.L * 0.3, held = heldSpans(k), i, R = rng(seedOf(b && b.n));
    var free = function (s, z) { return !held.some(function (q) { return (q.s === s || q.s === 0) && Math.abs(z - q.z) < q.half + 2; }); };
    var legs = [], tables = [], crates = [], tents = [], first = null, hues = [8, 45, 190, 330, 140, 25];
    for (i = 0; i < 18; i++) {
      var s = i % 2 ? 1 : -1, z = z0 - Math.floor(i / 2) * 3.4;
      if (!free(s, z)) continue;
      if (first == null) first = [s, z];
      var x = s * (W - 1.6), hue = hues[Math.floor(R() * hues.length)];
      [[-1, -1], [-1, 1], [1, -1], [1, 1]].forEach(function (c) { legs.push([x + c[0] * 1.1, 1.15, z + c[1] * 1.3, 0.07, 2.3, 0.07]); });
      tables.push([x, 0.8, z, 2.0, 0.08, 2.4, 0, 0, 0, [30, 0.1, 0.7]]);
      tables.push([x - s * 0.95, 0.5, z, 0.04, 0.6, 2.4, 0, 0, 0, [hue, 0.5, 0.4]]);
      for (var c = 0; c < 3; c++) crates.push([x + (R() - 0.5) * 0.9, 0.98, z - 0.8 + c * 0.8, 0.6, 0.26, 0.6, 0, R() * 0.4, 0, [[100, 0.6, 0.35], [8, 0.75, 0.45], [40, 0.85, 0.5], [28, 0.8, 0.48], [280, 0.4, 0.3]][Math.floor(R() * 5)]]);
      tents.push([x, 2.75, z, 3.1, 0.9, 3.3, 0, 0, 0, [hue, 0.6, 0.55]]);
      for (var l = 0; l < 4; l++) k.glow(x - s * 1.3, 2.15, z - 1.5 + l * 0.85, 0xffe0a0, 1.2);
      k.glow(x, 1.6, z, 0xffd9a0, 2.4);
    }
    var tg = new T.CylinderGeometry(0, 0.75, 1, 4, 1); tg.rotateY(Math.PI / 4);
    boxes(k, lam(k, [0, 0, 0.25]), legs); boxes(k, lam(k, [0, 0, 1]), tables, true); boxes(k, lam(k, [0, 0, 1]), crates); inst(k, tg, lam(k, [0, 0, 1]), tents, true);
    if (b && first) k.blade(b.n, 95, first[0], 5.0, first[1] + 3, 4.2);
  };

  // ---------- the transit hub: a guideway over the street, a lit platform on it, a train that stops ----------
  PLACES.station = function (k, p, b) {
    var T = k.THREE, z = p.z, W = k.WALK, i, dy = 8.6;
    // the guideway deck and its piers
    k.box(360, 1.4, 6, 0, dy - 0.7, z, [220, 0.05, 0.36]);
    k.box(360, 0.6, 0.25, 0, dy + 0.3, z + 2.9, [220, 0.05, 0.46]); k.box(360, 0.6, 0.25, 0, dy + 0.3, z - 2.9, [220, 0.05, 0.46]);
    var piers = [];
    [-150, -110, -75, -45, -(W + 1.6), W + 1.6, 45, 75, 110, 150].forEach(function (px) { piers.push([px, (dy - 1.4) / 2, z, 1.6, dy - 1.4, 1.6]); piers.push([px, dy - 1.8, z, 2.2, 0.9, 6]); });
    boxes(k, lam(k, [220, 0.05, 0.42]), piers, true);
    // strip lights under the deck where it crosses the street
    k.box(14, 0.06, 0.4, 0, dy - 1.43, z + 2, [200, 0.3, 0.92], true); k.box(14, 0.06, 0.4, 0, dy - 1.43, z - 2, [200, 0.3, 0.92], true);
    // the station: platforms either side of the track, glass screens, an arched canopy with light under it
    var px0 = 0; // the platform sits right over the street, so a waiting train is framed by it
    k.box(44, 0.5, 2.4, px0, dy + 0.25, z + 4.1, [220, 0.06, 0.55]); k.box(44, 0.5, 2.4, px0, dy + 0.25, z - 4.1, [220, 0.06, 0.55]);
    var glass = new T.MeshLambertMaterial({ color: 0xa8d4ff, transparent: true, opacity: 0.22, side: T.DoubleSide, depthWrite: false });
    add(k, new T.PlaneGeometry(44, 2.4), glass, px0, dy + 1.7, z + 5.25);
    var cg = new T.CylinderGeometry(7, 7, 46, 18, 1, true, 0, Math.PI); cg.rotateZ(Math.PI / 2);
    var canopy = add(k, cg, lam(k, [200, 0.12, 0.6], { side: T.DoubleSide }), px0, dy + 5.6, z, true); canopy.scale.set(1, 0.42, 1);
    var cols = [];
    for (i = 0; i < 6; i++) { cols.push([px0 - 20 + i * 8, dy + 3, z + 5.1, 0.35, 5.5, 0.35], [px0 - 20 + i * 8, dy + 3, z - 5.1, 0.35, 5.5, 0.35]); }
    boxes(k, lam(k, [220, 0.05, 0.3]), cols);
    k.box(40, 0.08, 0.5, px0, dy + 5.4, z + 3.4, [195, 0.4, 0.92], true); k.box(40, 0.08, 0.5, px0, dy + 5.4, z - 3.4, [195, 0.4, 0.92], true);
    for (i = 0; i < 8; i++) { k.glow(px0 - 18 + i * 5.2, dy + 2, z + 4.1, 0xdff1ff, 2.6); k.glow(px0 - 18 + i * 5.2, dy + 2, z - 4.1, 0xdff1ff, 2.6); }
    k.glow(px0, dy + 4, z, 0xdff1ff, 12);
    // stair and lift towers down to each pavement, inside the ground the hub holds
    [-1, 1].forEach(function (s) { k.walled(3.4, dy + 2, 3.4, s * (W + 2), z + 4.4, 'glass', 0.9, [200, 0.2, 0.6], 0); k.glow(s * (W + 0.2), 2.2, z + 4.4, 0xdff1ff, 2.4); });
    // the name on the deck's face, seen as you come up the street
    if (b) { plate(k, b.n, 190, 6.4, 0, dy - 0.9, z + 3.06, 0); plate(k, b.n, 190, 6.4, 0, dy - 0.9, z - 3.06, Math.PI); }
    // the train: four cars, lit windows, a headlight each end
    var train = new T.Group(), body = lam(k, [210, 0.08, 0.66]), winM = bas(k, [45, 0.7, 0.82]), headM = bas(k, [55, 0.3, 0.97]);
    for (i = 0; i < 4; i++) {
      var cx = (i - 1.5) * 10.2, car = new T.Mesh(new T.BoxGeometry(9.8, 2.9, 2.9), body); car.position.x = cx; car.castShadow = true; train.add(car);
      [-1, 1].forEach(function (f) { var w = new T.Mesh(new T.PlaneGeometry(8.6, 0.9), winM); w.position.set(cx, 0.4, f * 1.46); if (f < 0) w.rotation.y = Math.PI; train.add(w); });
      var stripe = new T.Mesh(new T.BoxGeometry(9.82, 0.25, 2.92), bas(k, [190, 0.7, 0.45])); stripe.position.set(cx, -0.6, 0); train.add(stripe);
    }
    [-1, 1].forEach(function (e) { var h = new T.Mesh(new T.BoxGeometry(0.1, 0.4, 1.8), headM); h.position.set(e * 20.45, -0.2, 0); train.add(h); });
    train.position.set(-400, dy + 2, z); k.root.add(train);
    // it comes in slowing, waits at the platform, and goes out gathering speed
    k.ticks.push(function (t) {
      var c = t % 34, x;
      if (c < 10) { var u = c / 10; x = px0 - 200 * (1 - u) * (1 - u); }
      else if (c < 16) x = px0;
      else if (c < 26) { var v = (c - 16) / 10; x = px0 + 200 * v * v; }
      else x = 1000;
      train.visible = x < 500; train.position.x = x;
    });
  };

  // ---------- the port: a wharf out on the water, container cranes over a berthed ship ----------
  PLACES.port = function (k, p, b) {
    var T = k.THREE, sd = k.water || -1, W = k.WALK, L = k.L, R = rng(seedOf(b && b.n) || 11), i, j;
    var X = function (d) { return sd * (W + d); };
    var z0 = -18, z1 = -L + 6, zc = (z0 + z1) / 2, zl = z0 - z1;
    // the wharf
    k.box(44, 1.6, zl, X(64), 0.2, zc, [220, 0.05, 0.24]);
    k.box(0.6, 0.5, zl, X(86), 1.2, zc, [45, 0.7, 0.45]);
    // the container yard on it
    var ctr = [], cc = [[6, 0.55, 0.32], [212, 0.45, 0.3], [170, 0.35, 0.28], [28, 0.6, 0.38], [0, 0, 0.55], [140, 0.25, 0.28], [350, 0.45, 0.28]];
    for (var row = 0; row < 4; row++) for (var zz = z0 - 8; zz > z1 + 8; zz -= 13.5) {
      if (R() < 0.18) continue;
      var hgt = 1 + Math.floor(R() * 4);
      for (j = 0; j < hgt; j++) ctr.push([X(48 + row * 3), 1.0 + 1.3 + j * 2.6, zz, 2.44, 2.55, 12.2, 0, 0, 0, cc[Math.floor(R() * cc.length)]]);
    }
    // a ship at the berth, loaded
    var shipZ = zc - zl * 0.08, shipL = Math.min(150, zl * 0.62);
    k.box(20, 9, shipL, X(102), 1.5, shipZ, [215, 0.25, 0.12]);
    k.box(20.2, 1.2, shipL + 0.2, X(102), -2.4, shipZ, [0, 0.5, 0.26]);
    k.box(14, 13, 12, X(102), 12.5, shipZ + shipL / 2 - 10, [0, 0, 0.82]);
    k.box(14.2, 1, 3, X(102), 16.5, shipZ + shipL / 2 - 4.5, [210, 0.3, 0.2]);
    for (var bay = 0; bay < Math.floor((shipL - 30) / 13); bay++) for (var col2 = 0; col2 < 6; col2++) { var hh = 2 + Math.floor(R() * 3); for (j = 0; j < hh; j++) ctr.push([X(96 + col2 * 2.5), 6 + 1.3 + j * 2.6, shipZ - shipL / 2 + 12 + bay * 13, 2.44, 2.55, 12.2, 0, 0, 0, cc[Math.floor(R() * cc.length)]]); }
    boxes(k, lam(k, [0, 0, 1]), ctr, true);
    k.glow(X(102), 14, shipZ + shipL / 2 - 4, 0xfff0d0, 9); k.glow(X(102), 20, shipZ + shipL / 2 - 10, 0xffffff, 9);
    for (i = 0; i < 8; i++) k.glow(X(102), 11, shipZ - shipL / 2 + 6 + i * (shipL - 12) / 7, 0xffe2b0, 4);
    // container cranes: four legs on the wharf, a boom out over the ship (a couple raised, off shift)
    var st = [];
    for (i = 0; i < 5; i++) {
      var cz = z0 - 14 - i * (zl - 28) / 4, raised = i === 0 || i === 4, legX = [X(72), X(84)];
      legX.forEach(function (lx) { [-7, 7].forEach(function (o) { st.push([lx, 16, cz + o, 1.5, 32, 1.5]); }); st.push([lx, 2, cz, 1.2, 1.2, 15.5]); st.push([lx, 31, cz, 1.6, 1.8, 15.5]); });
      [-7, 7].forEach(function (o) { st.push([X(78), 31, cz + o, 13.5, 1.6, 1.6]); st.push(beam([X(72), 4, cz + o], [X(84), 30, cz + o], 0.6)); });
      [-1.8, 1.8].forEach(function (o) {
        st.push(beam([X(60), 36, cz + o], [X(86), 36, cz + o], 1.3));
        st.push(beam([X(80), 31, cz + o], [X(80), 52, cz + o], 1.1));
        st.push(beam([X(80), 52, cz + o], [X(60), 36.6, cz + o], 0.3));
        if (raised) { st.push(beam([X(86), 36, cz + o], [X(100), 88, cz + o], 1.3)); st.push(beam([X(80), 52, cz + o], [X(100), 88, cz + o], 0.3)); }
        else { st.push(beam([X(86), 36, cz + o], [X(140), 36, cz + o], 1.3)); st.push(beam([X(80), 52, cz + o], [X(140), 36.6, cz + o], 0.3)); st.push(beam([X(80), 52, cz + o], [X(112), 36.6, cz + o], 0.3)); }
      });
      st.push([X(64), 39, cz, 9, 5, 6, 0, 0, 0, [0, 0, 0.82]]);
      if (!raised) {
        var tx = X(96 + R() * 20), drop = 16 + R() * 14;
        st.push([tx, 34.6, cz, 3, 2, 4.4, 0, 0, 0, [0, 0, 0.8]]);
        st.push([tx, 34 - drop / 2, cz, 0.1, drop, 0.1]);
        st.push([tx, 33.4 - drop, cz, 2.6, 0.5, 12.4, 0, 0, 0, [45, 0.8, 0.45]]);
        for (j = 0; j < 3; j++) k.glow(X(96 + j * 16), 35, cz, 0xfff0d0, 9);
        k.beacons.push(X(140), 37.8, cz);
      } else k.beacons.push(X(100), 89.5, cz);
      k.beacons.push(X(80), 53.5, cz);
    }
    st.forEach(function (m) { if (!m[9]) m[9] = [208, 0.5, 0.44]; });
    boxes(k, lam(k, [0, 0, 1]), st, true);
    // high-mast lights over the yard
    var masts = [];
    for (zz = z0 - 20; zz > z1 + 10; zz -= 45) { masts.push([X(44), 15, zz, 0.6, 30, 0.6]); k.glow(X(44), 30.5, zz, 0xffd9a0, 10); }
    boxes(k, lam(k, [220, 0.05, 0.3]), masts);
    if (b) { var sm = new T.SpriteMaterial({ map: k.nameTex(b.n), fog: false, transparent: true }); sm.userData.own = true; var sp = new T.Sprite(sm); sp.scale.set(30, 4.7, 1); sp.position.set(X(70), 62, zc + zl * 0.25); k.root.add(sp); }
  };

  // ---------- the pergola: a stone colonnade on the lake shore, lit from its feet ----------
  PLACES.pergola = function (k, p, b) {
    var T = k.THREE, s = p.s, z = p.z, W = k.WALK, i, n = 10, gap = 2.7, len = (n - 1) * gap, stone = [42, 0.14, 0.74];
    // the terrace, a step down to the water
    k.box(11, 0.6, len + 6, s * (W + 6), 0.3, z, [40, 0.08, 0.5]);
    k.box(2, 0.3, len + 4, s * (W + 12.4), 0.0, z, [40, 0.08, 0.42]);
    var cols = [], caps = [], rafters = [];
    for (i = 0; i < n; i++) [W + 3, W + 9].forEach(function (cx) {
      var cz = z - len / 2 + i * gap;
      cols.push([s * cx, 2.45, cz, 1, 3.7, 1]);
      caps.push([s * cx, 4.4, cz, 0.85, 0.22, 0.85]); caps.push([s * cx, 0.75, cz, 0.85, 0.3, 0.85]);
      k.glow(s * (cx + (cx < W + 5 ? 0.6 : -0.6)), 0.9, cz, 0xffd9a0, 1.3);
    });
    inst(k, new T.CylinderGeometry(0.27, 0.31, 1, 10), lam(k, stone), cols, true);
    boxes(k, lam(k, stone), caps);
    // a beam on each row, and the slats across that make it a pergola
    k.box(1, 0.55, len + 2, s * (W + 3), 4.8, z, stone); k.box(1, 0.55, len + 2, s * (W + 9), 4.8, z, stone);
    for (i = 0; i < 2 * n; i++) rafters.push([s * (W + 6), 5.2, z - len / 2 - 0.6 + i * (len + 1.2) / (2 * n - 1), 8.2, 0.26, 0.24]);
    boxes(k, lam(k, [36, 0.16, 0.66]), rafters, true);
    // a soft warm light caught under the slats
    k.glow(s * (W + 6), 4.2, z, 0xffd9a0, 9);
    if (b && b.n) k.blade(b.n, 42, s, 4.6, z + len / 2 + 2.5, 3.4);
  };
})();

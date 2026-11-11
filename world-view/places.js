// Places that are businesses in their own right. Inlined into the page by build.js.
// Each function draws one place: fn(kit, place, biz)
//   kit   — drawing helpers from the page: THREE, root, box, walled, blade, glow, crane, flat, yAt, r,
//           WALK (pavement edge), ROAD, L (street length), gz (gate z), water (side or 0), beacons, ticks,
//           nameTex, signTex, sectorHue, roofGeo
//   place — { type, s (side -1 | 1, 0 = spans the street), z (centre along the street), half }
//   biz   — the Business_Ledger row { n: name, s: sector, e: employees }; its name is the only text painted
// The street runs toward -z; +x is the right-hand side. Nothing here invents a name.
var PLACES = {};
(function () {
  function tiers(k, x, z, rad, hgt, n, arc, rot, tone) {
    var T = k.THREE;
    for (var i = 0; i < n; i++) {
      var m = new T.Mesh(new T.CylinderGeometry(rad + (i + 1) * 7, rad + i * 7, hgt / n, 48, 1, true, rot, arc), new T.MeshLambertMaterial({ color: new T.Color().setHSL(tone[0] / 360, tone[1], tone[2] * (0.8 + i * 0.12)), side: T.DoubleSide }));
      m.position.set(x, hgt / n * (i + 0.5), z); k.root.add(m);
    }
    var wall = new T.Mesh(new T.CylinderGeometry(rad + n * 7, rad + n * 7, hgt, 48, 1, true, rot, arc), new T.MeshLambertMaterial({ color: new T.Color().setHSL(tone[0] / 360, tone[1], tone[2] * 0.7), side: T.DoubleSide }));
    wall.position.set(x, hgt / 2, z); k.root.add(wall);
  }
  function scaffold(k, x, z, rad, hgt) {
    var T = k.THREE, g = new T.CylinderGeometry(rad, rad, hgt, 22, 5, true);
    var l = new T.LineSegments(new T.WireframeGeometry(g), new T.LineBasicMaterial({ color: 0xc08a45, transparent: true, opacity: 0.55 })); g.dispose();
    l.position.set(x, hgt / 2, z); k.root.add(l);
  }
  function skySign(k, text, x, y, z, w) {
    var T = k.THREE, m = new T.SpriteMaterial({ map: k.nameTex(text), fog: false, transparent: true }); m.userData.own = true;
    var s = new T.Sprite(m); s.scale.set(w, w * 0.156, 1); s.position.set(x, y, z); k.root.add(s);
  }

  // The A's new ballpark, at the far end of the street, on the water. Still going up.
  PLACES.stadium = function (k, p, b) {
    var x = k.water ? k.water * 18 : 0, z = k.gz - 105, i;
    tiers(k, x, z, 44, 26, 3, Math.PI * 1.5, Math.PI * 0.25, [35, 0.08, 0.5]);
    scaffold(k, x, z, 70, 30);
    k.crane(x - 60, z + 50, 62); k.crane(x + 58, z + 40, 70); k.crane(x - 30, z - 60, 66); k.crane(x + 40, z - 55, 58);
    for (i = 0; i < 16; i++) k.glow(x - 60 + k.r() * 120, 4 + k.r() * 24, z - 40 + k.r() * 90, 0xffe2b0, 9);
    if (b) skySign(k, b.n, x, 44, z + 70, 60);
  };

  // The Oaks' arena, beside the street. Half its roof is on.
  PLACES.arena = function (k, p, b) {
    var T = k.THREE, x = p.s * (k.WALK + 32), z = p.z, rad = 24;
    var drum = new T.Mesh(new T.CylinderGeometry(rad, rad, 12, 40, 1, true), new T.MeshLambertMaterial({ color: new T.Color().setHSL(210 / 360, 0.1, 0.5), side: T.DoubleSide })); drum.position.set(x, 6, z); k.root.add(drum);
    var roof = new T.Mesh(new T.SphereGeometry(rad + 0.4, 28, 10, 0, Math.PI * 1.15, 0, Math.PI / 2), new T.MeshLambertMaterial({ color: new T.Color().setHSL(210 / 360, 0.12, 0.62), side: T.DoubleSide })); roof.scale.y = 0.45; roof.position.set(x, 12, z); k.root.add(roof);
    var rg = new T.SphereGeometry(rad + 0.5, 16, 6, 0, Math.PI * 2, 0, Math.PI / 2), ribs = new T.LineSegments(new T.WireframeGeometry(rg), new T.LineBasicMaterial({ color: 0xc08a45, transparent: true, opacity: 0.6 })); rg.dispose();
    ribs.scale.y = 0.45; ribs.position.set(x, 12, z); k.root.add(ribs);
    k.crane(x + p.s * 20, z + 22, 44); k.crane(x - p.s * 4, z - 30, 50);
    for (var i = 0; i < 8; i++) k.glow(x - 22 + k.r() * 44, 2 + k.r() * 10, z - 22 + k.r() * 44, 0xffe2b0, 4);
    for (i = 0; i < 12; i++) k.box(0.1, 2.2, 3.6, p.s * (k.WALK + 0.4), 1.1, z - 22 + i * 4, [28, 0.5, 0.36]); // site hoarding
    if (b) k.blade(b.n, k.sectorHue(b.s), p.s, 5.4, z + p.half - 1, 5);
  };

  // The Coliseum: the A's are still playing here, so it is lit.
  PLACES.coliseum = function (k, p, b) {
    var x = p.s * (k.WALK + 70), z = p.z;
    tiers(k, x, z, 30, 18, 2, Math.PI * 2, 0, [35, 0.06, 0.42]);
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (q) { var tx = x + q[0] * 50, tz = z + q[1] * 44; k.box(0.8, 44, 0.8, tx, 22, tz, [240, 0.05, 0.3]); for (var i = 0; i < 6; i++) k.glow(tx + (i % 3) * 1.4 - 1.4, 44 + Math.floor(i / 3) * 1.4, tz, 0xffffff, 9); });
    k.glow(x, 20, z, 0xcfe8c0, 70);
    if (b) { skySign(k, b.n, x + p.s * -14, 32, z, 34); k.blade(b.n, 95, p.s, 5.2, z + p.half - 1, 4.6); }
  };

  PLACES.cityhall = function (k, p, b) {
    var T = k.THREE, s = p.s, z = p.z, x = s * (k.WALK + 4 + 8), i;
    k.box(16, 13, 18, x, 6.5, z, [45, 0.12, 0.62]); k.box(18, 1, 20, x, 13.5, z, [45, 0.1, 0.5]);
    k.box(7, 5, 7, x, 16.5, z, [45, 0.1, 0.58]);
    var dome = new T.Mesh(new T.SphereGeometry(3.6, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), k.flat([160, 0.25, 0.45])); dome.position.set(x, 19, z); k.root.add(dome);
    for (i = 0; i < 7; i++) { var c = new T.Mesh(new T.CylinderGeometry(0.42, 0.46, 9, 10), k.flat([45, 0.1, 0.72])); c.position.set(s * (k.WALK + 3.2), 5, z - 7.8 + i * 2.6); c.castShadow = true; k.root.add(c); }
    for (i = 0; i < 3; i++) k.box(1.2, 0.18, 19 - i, s * (k.WALK + 1.2 + i * 0.9), 0.2 + i * 0.18, z, [45, 0.08, 0.55]);
    k.glow(s * (k.WALK + 2.4), 3, z - 5, 0xffe2b0, 9); k.glow(s * (k.WALK + 2.4), 3, z + 5, 0xffe2b0, 9); k.glow(x, 20, z, 0xffe9c4, 9);
    if (b) k.blade(b.n, 45, s, 6, z + p.half - 0.6, 5);
  };

  PLACES.theater = function (k, p, b) {
    var T = k.THREE, s = p.s, z = p.z, i;
    k.walled(17, 15, 14, s * (k.WALK + 7), z, 'brick', 0.2, [20, 0.35, 0.42], 1);
    k.box(4.6, 0.7, 12, s * (k.WALK - 2.3), 4.3, z, [45, 0.9, 0.55], true);
    for (i = 0; i < 13; i++) { k.glow(s * (k.WALK - 4.6), 4.0, z - 6 + i, 0xffe9a8, 1.3); k.glow(s * (k.WALK - 2.3), 4.0, z + 6.1, 0xffe9a8, 1.3); }
    k.box(0.5, 9, 1.6, s * (k.WALK - 0.5), 10.5, z + 6.4, [350, 0.8, 0.45], true); // the upright fin
    if (b) { var m = new T.MeshBasicMaterial({ map: k.signTex(b.n, 45) }); m.userData.own = true; var v = new T.Mesh(new T.PlaneGeometry(6.6, 2.5), m); v.position.set(s * (k.WALK - 3.4), 7.2, z + 6.3); k.root.add(v); }
  };

  PLACES.cultural = function (k, p, b) {
    var s = p.s, z = p.z;
    k.walled(15, 9, 12, s * (k.WALK + 6), z, 'stucco', 0.7, [5, 0.55, 0.42], 1);
    k.box(13.4, 0.5, 16.4, s * (k.WALK + 5.6), 9.4, z, [150, 0.35, 0.2]); k.box(12, 0.4, 14.6, s * (k.WALK + 5.6), 10.1, z, [150, 0.35, 0.24]);
    k.glow(s * (k.WALK - 0.4), 2, z, 0xffcf8a, 5);
    if (b) k.blade(b.n, 5, s, 6, z + p.half - 0.8, 5.4);
  };

  PLACES.saloon = function (k, p, b) {
    var s = p.s, z = p.z;
    k.box(7, 4, 8, s * (k.WALK + 3.5), 2, z, [22, 0.4, 0.2]); k.box(7.6, 0.4, 9, s * (k.WALK + 3.5), 4.2, z, [22, 0.3, 0.12]);
    k.box(1.6, 0.12, 8, s * (k.WALK - 0.8), 2.9, z, [22, 0.35, 0.16]);
    k.glow(s * (k.WALK - 0.2), 2.2, z, 0xff7a55, 5);
    if (b) k.blade(b.n, 2, s, 5.4, z + p.half - 0.6, 5.4);
  };

  // A hall with a pitched roof and lit windows. No symbol on it: the name says whose it is.
  PLACES.faith = function (k, p, b) {
    var T = k.THREE, s = p.s, z = p.z, x = s * (k.WALK + 2 + 6);
    k.walled(10, 6.5, 12, x, z, 'house', 0.7, [38, 0.18, 0.66], 1);
    var roof = new T.Mesh(k.roofGeo, k.flat([18, 0.25, 0.16])); roof.scale.set(12.8, 4.2, 10.8); roof.position.set(x, 6.5 + 2.1, z); roof.castShadow = true; k.root.add(roof);
    k.box(1.4, 3.2, 2.4, s * (k.WALK + 1.9), 1.6, z, [28, 0.4, 0.2]);
    k.glow(s * (k.WALK + 1.2), 3.4, z, 0xffd9a0, 5);
    if (b) k.blade(b.n, 265, s, 4.8, z + p.half - 0.6, 4.4);
  };

  // Stalls on the pavement; the buildings behind stay.
  PLACES.market = function (k, p, b) {
    var z0 = -k.L * 0.3;
    for (var i = 0; i < 14; i++) { var s = i % 2 ? 1 : -1, z = z0 - i * 3.2; k.box(2.4, 0.12, 2.3, s * (k.WALK - 1.4), 2.5, z, [[8, 45, 190, 320][i % 4], 0.7, 0.5]); k.box(1.9, 0.9, 1.1, s * (k.WALK - 1.2), 0.6, z, [30, 0.3, 0.3]); k.box(0.07, 2.4, 0.07, s * (k.WALK - 2.5), 1.2, z + 1, [0, 0, 0.3]); k.glow(s * (k.WALK - 1.4), 2.1, z, 0xffd9a0, 1.6); }
    if (b) k.blade(b.n, 95, 1, 5.6, z0 + 3, 4.6);
  };

  // The transit hub: a deck over the street, a platform, and a train that keeps coming through.
  PLACES.station = function (k, p, b) {
    var T = k.THREE, z = p.z, i;
    k.box(190, 0.8, 5.5, 0, 8, z, [220, 0.06, 0.34]);
    [-60, -34, -(k.WALK + 0.8), k.WALK + 0.8, 34, 60].forEach(function (px) { k.box(1.3, 8, 1.3, px, 4, z, [220, 0.06, 0.3]); });
    k.box(36, 0.3, 8, 28, 12.2, z, [200, 0.3, 0.5]); for (i = 0; i < 7; i++) k.glow(12 + i * 5.4, 11.6, z, 0xdff1ff, 2.4);
    k.box(3, 8, 3, k.WALK + 3, 4, z + 4.5, [200, 0.15, 0.4]); // stair tower
    if (b) k.blade(b.n, 190, 1, 5.8, z + p.half + 0.6, 5.6);
    var train = new T.Group();
    for (i = 0; i < 5; i++) { var car = new T.Mesh(new T.BoxGeometry(9.4, 2.7, 2.7), k.flat([210, 0.12, 0.6])); car.position.x = i * 9.9; train.add(car); [-1, 1].forEach(function (f) { var w = new T.Mesh(new T.PlaneGeometry(8.4, 0.9), k.flat([45, 0.9, 0.8], true)); w.position.set(i * 9.9, 0.35, f * 1.36); if (f < 0) w.rotation.y = Math.PI; train.add(w); }); }
    train.position.set(-200, 9.8, z); k.root.add(train);
    k.ticks.push(function (t) { train.position.x = ((t * 16) % 320) - 190; });
  };

  // The port: gantry cranes out over the water.
  PLACES.port = function (k, p, b) {
    var side = k.water || -1, i;
    for (i = 0; i < 5; i++) {
      var x = side * (k.WALK + 60 + i * 6), z = -20 - i * (k.L - 30) / 5;
      k.box(1.2, 40, 1.2, x - 6, 20, z, [205, 0.5, 0.4]); k.box(1.2, 40, 1.2, x + 6, 20, z, [205, 0.5, 0.4]);
      k.box(44, 1.6, 2, x + side * 10, 40, z, [205, 0.5, 0.4]); k.box(14, 6, 2, x, 34, z, [205, 0.45, 0.34]);
      k.beacons.push(x + side * 31, 41.5, z); k.glow(x, 30, z, 0xfff0d0, 9);
    }
  };

  PLACES.pergola = function (k, p, b) {
    var T = k.THREE, s = p.s, z = p.z;
    for (var i = 0; i < 12; i++) for (var j = 0; j < 2; j++) { var c = new T.Mesh(new T.CylinderGeometry(0.22, 0.26, 3.6, 8), k.flat([42, 0.15, 0.72])); c.position.set(s * (k.WALK + 2.5 + j * 3), 1.2, z + 10 - i * 1.8); k.root.add(c); }
    k.box(4.4, 0.3, 21, s * (k.WALK + 4), 3.15, z, [42, 0.15, 0.66]); k.box(8, 0.5, 26, s * (k.WALK + 4), -0.3, z, [265, 0.08, 0.26]);
    if (b && b.n) k.blade(b.n, 42, s, 4.6, z + 13, 3.4);
  };
})();

// The trains. LIFE.rail(kit) is called once per place, after the places are built.
//
// A street has a line when build.js gave it one: the engine's own station list
// (utilities/ensureTransitMetrics.js OAKLAND_BART_STATIONS) names the neighborhoods with a station, and each of
// those streets (waterside ones aside) gets the guideway across it. PLACES.station (the ledger has the station
// as a business) or PLACES.rail (it does not) draws the guideway and leaves
// k.railLine = { z, y: top of the deck, calls: there is a platform, so trains stop }.
//
// Service: one train at a time, turn about in each direction. It calls at a platform; it runs through a bare
// crossing.
//
// The week's chaos trains (bart_train rows in k.H.chaos) take every other run. The train comes in and holds on
// the span over the street, an amber lamp turning on its lead car, for a time scaled from the row's own delay
// (a stalled train sits dark, and longest); a clean run goes through without stopping. Where it is gets written
// back on the row for the page's label and ride view. Nothing is lettered.
//
// Draw calls: car bodies, car sides, end windows, lamps at each end (2), the amber lamp.
LIFE.rail = function (k) {
  var line = k.railLine; if (!line) return;
  var T = k.THREE, z = line.z, cy = line.y + 2;
  var R = (typeof rng === 'function' && typeof hash === 'function') ? rng(hash(k.H.name + '|rail')) : Math.random;
  var chaos = ((k.H && k.H.chaos) || []).filter(function (ev) { return ev.v === 'bart_train'; });
  var NC = 4, CL = 10.2, half = NC * CL / 2, i;

  // the side of a car: brushed metal, a coloured band, doors, and a row of windows with the light on inside
  var sideTex = k.canvasTex(512, 128, function (g, w, h) {
    var gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#c9ced6'); gr.addColorStop(0.5, '#aeb4be'); gr.addColorStop(1, '#8b919b'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(255,255,255,.08)'; for (var y = 4; y < h; y += 6) g.fillRect(0, y, w, 1);
    g.fillStyle = '#1d6f93'; g.fillRect(0, h * 0.7, w, h * 0.09);
    g.fillStyle = '#16181d'; g.fillRect(14, h * 0.2, w - 28, h * 0.36);
    g.fillStyle = '#9ba1ab'; [0.18, 0.5, 0.82].forEach(function (u) { g.fillRect(w * u - 30, h * 0.14, 60, h * 0.76); });
    g.fillStyle = '#16181d'; [0.18, 0.5, 0.82].forEach(function (u) { g.fillRect(w * u - 24, h * 0.2, 21, h * 0.4); g.fillRect(w * u + 3, h * 0.2, 21, h * 0.4); });
    g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(0, h * 0.92, w, h * 0.08);
  });
  var litTex = k.canvasTex(512, 128, function (g, w, h) {
    g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
    var gr = g.createLinearGradient(0, h * 0.2, 0, h * 0.6); gr.addColorStop(0, '#fff3d0'); gr.addColorStop(1, '#d9a85e'); g.fillStyle = gr; g.fillRect(14, h * 0.2, w - 28, h * 0.36);
    g.fillStyle = '#000'; [0.18, 0.5, 0.82].forEach(function (u) { g.fillRect(w * u - 30, h * 0.14, 60, h * 0.76); }); for (var x = 60; x < w; x += 64) g.fillRect(x, h * 0.2, 5, h * 0.36);
    g.fillStyle = gr; [0.18, 0.5, 0.82].forEach(function (u) { g.fillRect(w * u - 24, h * 0.2, 21, h * 0.4); g.fillRect(w * u + 3, h * 0.2, 21, h * 0.4); });
    // heads and shoulders of people riding
    g.fillStyle = 'rgba(40,26,14,.8)'; for (x = 26; x < w - 20; x += 17 + (x * 7 % 13)) { if (x % 5 === 0) continue; g.beginPath(); g.arc(x, h * 0.4, 5, 0, 7); g.fill(); g.fillRect(x - 7, h * 0.44, 14, h * 0.14); }
  });
  var bodyM = new T.MeshLambertMaterial({ color: 0xaab0ba });
  var sideM = new T.MeshLambertMaterial({ map: sideTex, emissive: 0xffffff, emissiveMap: litTex, side: T.DoubleSide }); sideM.userData.own = true;
  var glassM = new T.MeshBasicMaterial({ color: 0x1a2230 }), endA = new T.MeshBasicMaterial({ color: 0xffffff }), endB = new T.MeshBasicMaterial({ color: 0xffffff }), amberM = new T.MeshBasicMaterial({ color: 0xffa01e });
  var train = new T.Group(), M = new T.Matrix4(), O = new T.Object3D();
  function many(geo, mat, items, shadow) { var m = new T.InstancedMesh(geo, mat, items.length); items.forEach(function (it, j) { O.position.set(it[0], it[1], it[2]); O.rotation.set(0, it[3] || 0, 0); O.scale.set(it[4] || 1, it[5] || 1, it[6] || 1); O.updateMatrix(); m.setMatrixAt(j, O.matrix); }); m.castShadow = !!shadow; m.frustumCulled = false; train.add(m); return m; }
  var bodies = [], sides = [];
  for (i = 0; i < NC; i++) { var cx = (i - (NC - 1) / 2) * CL; bodies.push([cx, 0, 0]); sides.push([cx, 0, 1.445, 0], [cx, 0, -1.445, Math.PI]); }
  many(new T.BoxGeometry(9.8, 2.9, 2.86), bodyM, bodies, true);
  many(new T.PlaneGeometry(9.8, 2.9), sideM, sides);
  many(new T.BoxGeometry(0.1, 1.15, 2.3), glassM, [[half - 0.2 + 0.06, 0.45, 0], [-half + 0.2 - 0.06, 0.45, 0]]);
  // a pair of lamps at each end: white at the front, red at the back, whichever way it is going
  many(new T.BoxGeometry(0.1, 0.22, 0.34), endA, [[half - 0.12, -0.55, 0.95], [half - 0.12, -0.55, -0.95]]);
  many(new T.BoxGeometry(0.1, 0.22, 0.34), endB, [[-half + 0.12, -0.55, 0.95], [-half + 0.12, -0.55, -0.95]]);
  var amber = new T.Mesh(new T.BoxGeometry(0.5, 0.26, 0.5), amberM); amber.position.set(0, 1.6, 0); train.add(amber);
  train.position.set(-999, cy, z); train.visible = false; k.root.add(train);

  // ---------- running it ----------
  var run = null, n = 0;
  function next(first) {
    var ev = chaos.length && n % 2 === 0 ? chaos[(n / 2) % chaos.length] : null, dir = n % 2 ? -1 : 1, hold; n++;
    if (ev) hold = ev.o === 'clean_run' ? 0 : ev.o === 'stalled_train' ? 30 : Math.max(8, Math.min(24, (parseFloat(ev.mag) || 0.06) * 200));
    else hold = line.calls ? 6 : 0;
    run = { ev: ev, dir: dir, hold: hold, t: first ? (hold ? 7 : 6) : 0, gap: ev ? 4 : 6 + R() * 10 };
    sideM.emissiveIntensity = ev && ev.o === 'stalled_train' ? 0.16 : 1;
    endA.color.set(dir > 0 ? 0xfff6dc : 0xff2a18); endB.color.set(dir > 0 ? 0xff2a18 : 0xfff6dc);
    amber.position.x = dir * (half - 2.2); amber.visible = !!(ev && hold);
    chaos.forEach(function (c) { c.on = false; });
  }
  next(true);
  k.ticks.push(function (t, dt) {
    var r = run, x, held = false; r.t += Math.min(0.1, Math.max(0, dt || 0));
    if (r.hold) {
      // in slowing, stand over the street, out gathering speed
      if (r.t < 10) { var u = r.t / 10; x = -r.dir * 200 * (1 - u) * (1 - u); }
      else if (r.t < 10 + r.hold) { x = 0; held = true; }
      else if (r.t < 20 + r.hold) { var v = (r.t - 10 - r.hold) / 10; x = r.dir * 200 * v * v; }
      else x = 9999;
      if (r.t > 20 + r.hold + r.gap) { next(); return; }
    } else {
      x = r.dir * (-220 + 20 * r.t);
      if (r.t > 22) x = 9999;
      if (r.t > 22 + r.gap) { next(); return; }
    }
    train.visible = Math.abs(x) < 240; train.position.x = x;
    if (amber.visible) amberM.color.setHSL(0.09, 1, 0.3 + 0.35 * Math.pow(0.5 + 0.5 * Math.sin(t * 7), 3));
    if (r.ev) {
      // where it is, for the page: the label rides over the lead cars, and the ride view stands in the street below
      var ev = r.ev; ev.x = Math.max(-40, Math.min(40, x)); ev.y = cy + 2.2; ev.z = z; ev.cy = cy; ev.rad = 7; ev.far = 150; ev.stopped = held; ev.side = 1;
      ev.on = Math.abs(x) < 70; ev.cam = [-0.8, 2.3, z + 21];
    }
  });
};

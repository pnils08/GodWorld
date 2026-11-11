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
// Draw calls: car bodies, cabins, wheels, lamps, light glows, light on the road; with buses, bus bodies, bus
// windows, bus boards, stop poles and stop flags. Everything sits under k.ground, so it tilts with a hill.
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

  // body types: body box {l,w,h,y,z} and upper box {l,w,h,y,z}; z + is toward the back (front is -z)
  var TYPES = {
    sedan: { l: 4.3, w: 1.8, body: [4.3, 1.8, 0.62, 0.3, 0], top: [2.1, 1.56, 0.5, 0.92, 0.15], v: 1 },
    hatch: { l: 3.8, w: 1.72, body: [3.8, 1.72, 0.66, 0.3, 0], top: [2.0, 1.52, 0.55, 0.96, 0.55], v: 1 },
    suv: { l: 4.6, w: 1.88, body: [4.6, 1.88, 0.85, 0.32, 0], top: [2.7, 1.74, 0.62, 1.17, 0.35], v: 0.97 },
    van: { l: 5.0, w: 1.9, body: [5.0, 1.9, 0.75, 0.32, 0], top: [3.9, 1.86, 0.95, 1.07, 0.45], v: 0.92 },
    truck: { l: 6.6, w: 1.96, body: [4.6, 1.96, 2.3, 0.45, 0.95], top: [1.8, 1.92, 1.5, 0.35, -2.35], v: 0.82 },
    bus: { l: 11.4, w: 2.5, v: 0.86 }
  };
  var COLORS = [[0, 0, 0.82], [0, 0, 0.6], [220, 0.05, 0.42], [0, 0, 0.1], [215, 0.5, 0.25], [0, 0.65, 0.33], [150, 0.35, 0.22], [35, 0.3, 0.55], [205, 0.15, 0.62], [12, 0.55, 0.42], [265, 0.25, 0.3], [48, 0.6, 0.5]];
  function pickType() { var x = R(); if (x < heavy) return 'truck'; x -= heavy; if (x < vans) return 'van'; x = R(); return x < 0.45 ? 'sedan' : x < 0.72 ? 'hatch' : 'suv'; }

  // ---------- the pool ----------
  var busN = op ? 2 : 0;
  var perLane = Math.ceil(laneLen / (vBase * every) * 1.3) + 2;
  var carN = Math.max(2, Math.min(40 - busN, perLane * 2));
  var V = [], i;
  for (i = 0; i < carN + busN; i++) V.push({ i: i, bus: i >= carN, bi: i - carN, on: false, lane: null, u: 0, v: 0, a: 0, lat: 0, latPrev: 0, yaw: 0, type: i >= carN ? 'bus' : 'sedan', v0: 7, fade: 0, dirty: true, stopI: 0, st: 'run', wait: 0 });

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
  var bodyM = im(new T.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), fadeable(new T.MeshLambertMaterial({ color: 0xffffff })), N, true);
  var topM = im(new T.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), fadeable(new T.MeshLambertMaterial({ color: new T.Color().setHSL(220 / 360, 0.2, 0.09) })), N);
  var wheelM = im(new T.CylinderGeometry(0.33, 0.33, 0.26, 10).rotateZ(Math.PI / 2), fadeable(new T.MeshLambertMaterial({ color: 0x0c0c10 })), N * 4);
  var lampM = im(new T.BoxGeometry(1, 1, 1), fadeable(new T.MeshBasicMaterial({ color: 0xffffff })), N * 4, true);
  var HEAD = new T.Color(0xfff1cf), TAIL = new T.Color(0xc4180e), BRAKE = new T.Color(0xff5a40), C = new T.Color();

  var busM = null, winM = null, boardM = null;
  if (op) {
    var hue = typeof k.sectorHue === 'function' ? k.sectorHue(op.s) : 190;
    var busTex = k.canvasTex(256, 128, function (g, w, h) {
      g.fillStyle = 'hsl(' + hue + ',6%,74%)'; g.fillRect(0, 0, w, h);
      g.fillStyle = 'hsl(' + hue + ',70%,40%)'; g.fillRect(0, h * 0.74, w, h * 0.12);
      g.fillStyle = 'hsl(' + hue + ',10%,30%)'; g.fillRect(0, h * 0.92, w, h * 0.08);
    });
    var bm = new T.MeshLambertMaterial({ map: busTex }); bm.userData.own = true;
    busM = im(new T.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), fadeable(bm), busN);
    // lit windows: warm interior, pillars between panes, the tops of seat backs along the bottom
    var winTex = k.canvasTex(512, 64, function (g, w, h) {
      var gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#fff3d6'); gr.addColorStop(0.5, '#f4cf8e'); gr.addColorStop(1, '#c99a5c');
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
      g.fillStyle = 'rgba(60,40,30,0.55)'; for (var x = 8; x < w; x += 22) g.fillRect(x, h * 0.72, 14, h * 0.28);
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
    o.on = true; o.lane = lane; o.u = 0; o.lat = 0; o.latPrev = 0; o.st = 'run'; o.stopI = 0; o.wait = 0; o.dirty = true;
    o.v0 = vBase * TYPES[o.type].v * (0.88 + R() * 0.24);
    o.v = last ? Math.min(o.v0, last.v) : o.v0 * 0.9;
    if (!o.bus) {
      var c = COLORS[Math.floor(R() * COLORS.length)];
      bodyM.setColorAt(o.i, C.setHSL(c[0] / 360, c[1], c[2] * (0.85 + R() * 0.3))); bodyM.instanceColor.needsUpdate = true;
    }
    lane.list.push(o);
    return true;
  }
  function free(bus) { for (var j = 0; j < V.length; j++) if (!V[j].on && V[j].bus === bus) return V[j]; return null; }
  function retire(o) { o.on = false; o.dirty = true; var l = o.lane.list, j = l.indexOf(o); if (j >= 0) l.splice(j, 1); }

  function sim(dt, quiet) {
    var thin = k.quality() === 0 ? 1.5 : 1;
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
        o.a = acc;
        o.v = Math.max(0, o.v + acc * dt); o.u += o.v * dt;
        o.fade = smooth(0, FADE, o.u) * smooth(0, FADE, laneLen - o.u);
        if (o.u >= laneLen) { retire(o); j--; }
      }
    });
  }

  // ---------- drawing ----------
  var M = new T.Matrix4(), MB = new T.Matrix4(), P = new T.Vector3(), Q = new T.Quaternion(), S = new T.Vector3(), Y = new T.Vector3(0, 1, 0);
  var pI = 0;
  function part(mesh, idx, x, y, z, sx, sy, sz, fade) {
    M.compose(P.set(x, y, z), Q.identity(), S.set(sx, sy, sz)); M.premultiply(MB); mesh.setMatrixAt(idx, M);
    mesh.userData.fade.array[idx] = fade;
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
    M.compose(P.set(x, 0.035, z), Q.identity(), S.set(sx, 1, sz)); M.premultiply(MB); poolM.setMatrixAt(idx, M);
    poolM.setColorAt(idx, C.copy(c).multiplyScalar(f));
  }
  var AMBER = new T.Color(1, 0.55, 0.06), NONE = new T.Color(0, 0, 0), WARM = new T.Color(0xffe2b0), RED = new T.Color(0xff2a18);
  function hide(o) {
    var j, n = o.i;
    bodyM.setMatrixAt(n, ZERO); topM.setMatrixAt(n, ZERO);
    for (j = 0; j < 4; j++) { wheelM.setMatrixAt(n * 4 + j, ZERO); lampM.setMatrixAt(n * 4 + j, ZERO); }
    poolM.setMatrixAt(n * 2, ZERO); poolM.setMatrixAt(n * 2 + 1, ZERO);
    if (o.bus) { busM.setMatrixAt(o.bi, ZERO); for (j = 0; j < 4; j++) winM.setMatrixAt(o.bi * 4 + j, ZERO); for (j = 0; j < 3; j++) boardM.setMatrixAt(o.bi * 3 + j, ZERO); }
  }
  function draw(t) {
    var showPools = k.quality() > 0;
    poolM.visible = showPools;
    bodyM.castShadow = k.quality() > 1;
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
      MB.makeRotationY((s > 0 ? 0 : Math.PI) + o.yaw); MB.setPosition(x, 0, z);
      var hl = ty.l / 2, hw = ty.w / 2, ly, wy, wz, wr;
      var braking = o.a < -0.6 || o.v < 0.3;
      if (!o.bus) {
        var b = ty.body, u = ty.top;
        part(bodyM, o.i, 0, b[3], b[4], b[1], b[2], b[0], f);
        part(topM, o.i, 0, u[3], u[4], u[1], u[2], u[0], f);
        ly = b[3] + Math.min(b[2], 0.62) * 0.6; wz = hl - (o.type === 'truck' ? 1.0 : 0.85); wr = o.type === 'truck' ? 1.25 : 1;
      } else {
        part(busM, o.bi, 0, 0.32, 0, ty.w, 2.95, ty.l, f);
        var wl = ty.l - 2.4;
        plane(winM, o.bi * 4, hw + 0.012, 2.05, 0.35, Math.PI / 2, wl, 1.05, f);
        plane(winM, o.bi * 4 + 1, -hw - 0.012, 2.05, 0.35, -Math.PI / 2, wl, 1.05, f);
        plane(winM, o.bi * 4 + 2, 0, 1.95, -hl - 0.012, Math.PI, ty.w - 0.25, 1.35, f);
        plane(winM, o.bi * 4 + 3, 0, 2.2, hl + 0.012, 0, ty.w - 0.5, 0.75, f);
        plane(boardM, o.bi * 3, 0, 2.95, -hl - 0.014, Math.PI, ty.w - 0.4, 0.34, f);
        plane(boardM, o.bi * 3 + 1, 0, 2.85, hl + 0.014, 0, ty.w - 0.7, 0.28, f);
        plane(boardM, o.bi * 3 + 2, hw + 0.014, 2.85, -hl + 1.9, Math.PI / 2, 2.2, 0.32, f);
        ly = 0.75; wz = hl - 2.0; wr = 1.5;
      }
      // wheels
      wy = 0.33 * wr;
      part(wheelM, o.i * 4, hw - 0.1, wy, -wz, 1, wr, wr, f); part(wheelM, o.i * 4 + 1, -hw + 0.1, wy, -wz, 1, wr, wr, f);
      part(wheelM, o.i * 4 + 2, hw - 0.1, wy, wz, 1, wr, wr, f); part(wheelM, o.i * 4 + 3, -hw + 0.1, wy, wz, 1, wr, wr, f);
      // lamps
      var lx = hw - 0.28, tc = braking ? BRAKE : TAIL;
      part(lampM, o.i * 4, lx, ly, -hl - 0.02, 0.36, 0.17, 0.05, f); lampM.setColorAt(o.i * 4, HEAD);
      part(lampM, o.i * 4 + 1, -lx, ly, -hl - 0.02, 0.36, 0.17, 0.05, f); lampM.setColorAt(o.i * 4 + 1, HEAD);
      part(lampM, o.i * 4 + 2, lx, ly + 0.04, hl + 0.02, 0.3, 0.16, 0.05, f); lampM.setColorAt(o.i * 4 + 2, tc);
      part(lampM, o.i * 4 + 3, -lx, ly + 0.04, hl + 0.02, 0.3, 0.16, 0.05, f); lampM.setColorAt(o.i * 4 + 3, tc);
      // glows, brighter the more squarely a lamp faces the camera
      var fwdX = -MB.elements[8], fwdZ = -MB.elements[10];
      var cx = camL.x - x, cz = camL.z - z, cd = Math.sqrt(cx * cx + cz * cz) || 1, face = (cx * fwdX + cz * fwdZ) / cd;
      var fh = smooth(-0.25, 0.55, face) * f, ft = smooth(-0.25, 0.55, -face) * f * (braking ? 1 : 0.6);
      glowAt(lx, ly, -hl - 0.1, HEAD, fh); glowAt(-lx, ly, -hl - 0.1, HEAD, fh);
      glowAt(lx, ly + 0.04, hl + 0.1, RED, ft); glowAt(-lx, ly + 0.04, hl + 0.1, RED, ft);
      // indicator: kerb side while a bus pulls in or waits, road side while it pulls out
      var ind = o.bus && (o.st === 'in' || o.st === 'dwell' || o.st === 'out') && (t % 0.8) < 0.42 ? 1 : 0, isd = o.st === 'out' || (o.st === 'dwell' && o.wait <= 1.5) ? -1 : 1;
      glowAt(isd * (hw + 0.02), ly + 0.1, -hl + 0.2, ind ? AMBER : NONE, ind * f);
      glowAt(isd * (hw + 0.02), ly + 0.1, hl - 0.2, ind ? AMBER : NONE, ind * f);
      // light on the road: a pool ahead of the headlights; on a wet road a long streak each way
      if (showPools) {
        if (rain) { pool(o.i * 2, 0, -hl - 8, ty.w * 0.6, 16, WARM, 0.75 * f); pool(o.i * 2 + 1, 0, hl + 4.5, ty.w * 0.5, 9, RED, 0.6 * f * (braking ? 1.4 : 1)); }
        else { pool(o.i * 2, 0, -hl - 4.2, ty.w * 1.45, 8, WARM, 0.2 * f); poolM.setMatrixAt(o.i * 2 + 1, ZERO); }
      }
    }
    for (; pI < PN; pI++) { pCol[pI * 3] = pCol[pI * 3 + 1] = pCol[pI * 3 + 2] = 0; }
    pg.attributes.position.needsUpdate = true; pg.attributes.color.needsUpdate = true;
    [bodyM, topM, wheelM, lampM, busM, winM, boardM].forEach(function (m) { if (!m) return; m.instanceMatrix.needsUpdate = true; m.userData.fade.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; });
    poolM.instanceMatrix.needsUpdate = true; if (poolM.instanceColor) poolM.instanceColor.needsUpdate = true;
  }

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

// The people. LIFE.people(kit, list) is called once per place, after the street is built, with one record for
// every tracked citizen the page shows there. The page decides who stands where (their street, their own
// business, their household); this file draws each of them as a jointed figure and moves it.
//
// A record arrives with: d (the citizen: g sex, ab age band), s (side of the street), x, z0 (where they
// stand), amp (how far they roam from z0; 0 = they stay), sc (size), long (long hair), post (they stand
// outside their own business), lead + rank (a household: the record they keep beside, and which place beside
// it), kc (the colour of their week). From then on this file owns x, z and yaw and writes them back every
// frame: the page's cards, taps and the stand-with-someone view read x, z and sc, and set hold on whoever
// is being visited.
//
// What is read off the sim: sex and age band (size, grey hair, a senior's pace and stoop, a child's short
// quick steps), who shares a household, who runs a business on the street, and the week's weather (coats
// when it is cold, bare forearms when it is warm). Clothes, build, the way someone stands and where a walk
// turns round are drawing choices seeded by the place. None of it is a fact about a citizen.
//
// Walking is worked out from the ground up: each foot is planted where it lands and stays there while the
// body passes over it (heel down, flat, heel up, toe off), the knee is solved from hip and ankle, the hips
// rise and fall on the standing leg, and stride follows speed, so nothing slides. Phase advances with
// distance covered, not with the clock.
//
// People who know each other: k.ties is the page's list for this street, [a, b, tie], two of these records and the
// bond row the sim holds for them (t type, i intensity 0..10). The sim holds the tie, not a meeting, so what is drawn
// is how two people who know each other behave when they share a street; nothing on the page says it happened.
//   - a good tie: now and then one goes over to the other, or the two stop as they pass. They stand facing each
//     other and talk, taking turns (the one talking moves a hand), then go on. A stronger tie: more often, longer.
//   - a bad tie (rivalry, tension, sports_rival): no stopping. Each looks at the other, then away; whoever is
//     walking gives them the width of the pavement and picks up the pace; whoever is standing turns their back.
// A household walks as one body, so its tie is carried by whoever leads it. While it lasts each of the two carries
// meet = { q: the other, t: the tie, bad }, which the page's card reads.
//
// Draw calls: torsos, hips, coats, heads, hair, long hair, thighs, shins, shoes, upper arms, forearms, hands,
// ground shadows, week lights. Everything sits under k.root.
LIFE.people = function (k, list) {
  var T = k.THREE, n = list.length; if (!n) return null;
  var ROAD = k.ROAD, WALK = k.WALK;
  var seeded = typeof rng === 'function' && typeof hash === 'function';
  var R = seeded ? rng(hash(k.H.name + '|people')) : k.r;      // looks: fixed for the place
  var R2 = seeded ? rng(hash(k.H.name + '|people-walk')) : k.r; // choices made as time runs
  var temp = k.temp != null && !isNaN(k.temp) ? k.temp : 60, wet = k.WX === 'rain';
  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
  function smooth(u) { u = clamp(u, 0, 1); return u * u * (3 - 2 * u); }
  function wrap(a) { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; }

  // ---------- the body, in metres for someone 1.79 tall; a person's size scales all of it ----------
  var AH = 0.07, L1 = 0.42, L2 = 0.415, LMAX = (L1 + L2) * 0.997, HW = 0.085, HIPCAP = AH + (L1 + L2) * 0.985;
  var CH = 0.115, SH = 0.4, SW = 0.19, HD = 0.64, LA1 = 0.28, LA2 = 0.25, FB = 0.135, FHEEL = 0.06, STANCE = 0.62, HEELOFF = 0.36;

  function lathe(pts, seg, sz) { var g = new T.LatheGeometry(pts.map(function (p) { return new T.Vector2(p[0], p[1]); }), seg); if (sz) g.scale(1, 1, sz); return g; }
  // a limb hangs from its joint at the origin, rounded at both ends so a bent joint shows no gap
  function limbGeo(rT, rB, len) { return lathe([[0.001, -len - rB], [rB * 0.75, -len - rB * 0.62], [rB, -len], [rT, 0], [rT * 0.75, rT * 0.62], [0.001, rT]], 6); }
  function merge(geos) {
    var pos = [], nor = [], uv = [];
    geos.forEach(function (g) { var q = g.index ? g.toNonIndexed() : g; Array.prototype.push.apply(pos, q.attributes.position.array); Array.prototype.push.apply(nor, q.attributes.normal.array); Array.prototype.push.apply(uv, q.attributes.uv.array); if (q !== g) q.dispose(); g.dispose(); });
    var out = new T.BufferGeometry();
    out.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); out.setAttribute('normal', new T.Float32BufferAttribute(nor, 3)); out.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
    return out;
  }
  // the face is painted on the head's own skin, so it turns with the head: brows, eyes, the shadow of a nose, a mouth
  var faceTex = k.canvasTex(256, 128, function (g) {
    g.fillStyle = '#fff'; g.fillRect(0, 0, 256, 128);
    var cx = 192, ey = 60, dk = 'rgba(38,24,18,';
    g.fillStyle = dk + '.9)'; [-1, 1].forEach(function (s) { g.beginPath(); g.ellipse(cx + s * 13, ey, 4.4, 1.9, s * -0.08, 0, 7); g.fill(); });
    g.strokeStyle = dk + '.6)'; g.lineCap = 'round'; g.lineWidth = 2.4;
    [-1, 1].forEach(function (s) { g.beginPath(); g.moveTo(cx + s * 7.5, ey - 5.5); g.quadraticCurveTo(cx + s * 13, ey - 8, cx + s * 19.5, ey - 5); g.stroke(); });
    g.fillStyle = dk + '.16)'; [-1, 1].forEach(function (s) { g.beginPath(); g.ellipse(cx + s * 13, ey + 1, 7.5, 5, 0, 0, 7); g.fill(); });
    g.strokeStyle = dk + '.22)'; g.lineWidth = 3; g.beginPath(); g.moveTo(cx + 2.5, ey + 4); g.lineTo(cx + 3.5, ey + 15); g.lineTo(cx - 2.5, ey + 16.5); g.stroke();
    g.strokeStyle = dk + '.55)'; g.lineWidth = 2.2; g.beginPath(); g.moveTo(cx - 8, ey + 27); g.quadraticCurveTo(cx, ey + 29.5, cx + 8, ey + 27); g.stroke();
    var sh = g.createLinearGradient(0, 96, 0, 128); sh.addColorStop(0, 'rgba(60,40,30,0)'); sh.addColorStop(1, 'rgba(60,40,30,.3)'); g.fillStyle = sh; g.fillRect(0, 96, 256, 32);
  });
  var headGeo = new T.SphereGeometry(1, 12, 9); headGeo.scale(0.098, 0.125, 0.11);
  var neckGeo = new T.CylinderGeometry(0.045, 0.052, 0.14, 6).translate(0, -0.15, 0.012), nuv = neckGeo.attributes.uv;
  for (var q0 = 0; q0 < nuv.count; q0++) nuv.setXY(q0, 0.2, 0.6);
  var hairGeo = new T.SphereGeometry(1, 12, 6, 0, Math.PI * 2, 0, Math.PI * 0.6); hairGeo.rotateX(0.62); hairGeo.scale(0.107, 0.134, 0.121);
  var longGeo = new T.SphereGeometry(1, 8, 6); longGeo.scale(0.108, 0.18, 0.07); longGeo.translate(0, -0.1, 0.078);
  var handGeo = new T.SphereGeometry(1, 6, 4); handGeo.scale(0.03, 0.05, 0.022); handGeo.translate(0, -LA2 - 0.05, 0);

  function shoeGeo() {
    var g = new T.BoxGeometry(0.09, 0.065, 0.26, 1, 1, 3), a = g.attributes.position;
    for (var v = 0; v < a.count; v++) { var z = a.getZ(v), toe = clamp((-z - 0.02) / 0.11, 0, 1); a.setX(v, a.getX(v) * (1 - 0.3 * toe * toe)); if (a.getY(v) > 0) a.setY(v, a.getY(v) - 0.03 * toe); }
    g.computeVertexNormals(); return g.translate(0, -0.0375, -0.06);
  }
  function white() { return new T.MeshLambertMaterial({ color: 0xffffff }); }
  function im(geo, mat, count, shadow) { var m = new T.InstancedMesh(geo, mat, count); m.castShadow = !!shadow; m.frustumCulled = false; k.root.add(m); return m; }
  var headMat = new T.MeshLambertMaterial({ color: 0xffffff, map: faceTex }); headMat.userData.own = true;
  var P = {
    torso: im(lathe([[0.001, -0.06], [0.118, -0.05], [0.128, 0.06], [0.152, 0.2], [0.172, 0.32], [0.168, 0.39], [0.12, 0.445], [0.055, 0.475], [0.001, 0.48]], 10, 0.62), white(), n, true),
    hips: im(lathe([[0.001, -0.11], [0.085, -0.1], [0.132, -0.04], [0.138, 0.04], [0.122, 0.12], [0.001, 0.13]], 8, 0.7), white(), n, true),
    coat: im(lathe([[0.15, -0.25], [0.152, -0.1], [0.14, 0], [0.13, 0.05]], 10, 0.74), new T.MeshLambertMaterial({ color: 0xffffff, side: T.DoubleSide }), n, true),
    head: im(merge([headGeo, neckGeo]), headMat, n, true),
    hair: im(hairGeo, white(), n, true),
    hairLong: im(longGeo, white(), n, true),
    thigh: im(limbGeo(0.086, 0.062, L1), white(), n * 2, true),
    shin: im(limbGeo(0.061, 0.043, L2), white(), n * 2, true),
    foot: im(shoeGeo(), white(), n * 2, true),
    arm: im(limbGeo(0.054, 0.043, LA1), white(), n * 2, true),
    fore: im(limbGeo(0.043, 0.033, LA2), white(), n * 2, true),
    hand: im(handGeo, white(), n * 2, false)
  };
  var blob = im(new T.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new T.MeshBasicMaterial({ map: k.glowTex, color: 0x000000, transparent: true, opacity: 0.5, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }), n, false);
  var hp = new Float32Array(n * 3), hc = new Float32Array(n * 3);
  var hg = new T.BufferGeometry(); hg.setAttribute('position', new T.BufferAttribute(hp, 3)); hg.setAttribute('color', new T.BufferAttribute(hc, 3));
  var halos = new T.Points(hg, new T.PointsMaterial({ map: k.glowTex, vertexColors: true, size: 1.0, transparent: true, opacity: 0.9, blending: T.AdditiveBlending, depthWrite: false }));
  halos.frustumCulled = false; k.root.add(halos);

  // ---------- who each figure is to look at ----------
  var col = new T.Color(), LO = ROAD + 0.8, HI = WALK - 1.0, zMax = 8, zMin = k.gz + 14;
  var HEAD = { child: 1.38, teen: 1.1, youth: 1.03 };
  var PACE = { child: [0.95, 1.2], teen: [1.2, 1.5], youth: [1.25, 1.55], senior: [0.78, 1.04] };
  list.forEach(function (p, i) {
    var d = p.d || {}, ab = d.ab, f = d.g === 'f', old = ab === 'senior', small = ab === 'child', pr = PACE[ab] || [1.18, 1.5];
    p.i = i; p.z = p.z0; p.s = p.s < 0 ? -1 : 1;
    p.lane = clamp(Math.abs(p.x), LO, HI); p.x = p.s * p.lane; p.av = 0; p.vx = 0;
    p.cruise = (pr[0] + R() * (pr[1] - pr[0])) * (wet ? 1.08 : 1); p.v = 0; p.dir = R() < 0.5 ? -1 : 1; p.st = 0; p.tz = p.z; p.until = 0; p.held = false;
    p.ph = R(); p.turn = 0; p.seed = R() * 100; p.hy = 0; p.hyT = 0; p.hp = 0; p.hpT = 0; p.lookAt = 0;
    p.girth = (small ? 0.92 : 0.9) + R() * 0.26; p.shoulder = (f ? 0.9 : 1.02) + R() * 0.07; p.hipW = f ? 1.04 + R() * 0.07 : 0.98 + R() * 0.05;
    p.headS = HEAD[ab] || 1; p.stoop = old ? 0.08 + R() * 0.14 : R() * 0.035; p.swing = (old ? 0.55 : 0.8) + R() * 0.5; p.cap = HIPCAP - (old ? 0.012 + R() * 0.012 : R() * 0.006);
    // how the arms rest when standing: 0 at the sides, 1 hands in pockets, 2 hands behind the back
    var ar = R(); p.rest = ar < (old ? 0.3 : 0.08) ? 2 : ar < (small ? 0.12 : 0.42) ? 1 : 0;
    p.hair = d.g !== 'f' && (old ? R() < 0.3 : R() < 0.04) ? 0 : 1 + R() * (f ? 0.1 : 0.05); p.toe = 0.08 + R() * 0.1;
    // clothes
    var coat = !small && temp < 62 ? R() < (temp < 50 ? 0.8 : 0.5) : wet && R() < 0.6, skirt = !coat && f && temp > 52 && R() < 0.2, bare = !coat && temp >= 70 && R() < 0.6;
    p.coat = coat ? 1 : skirt ? 1.5 : 0;
    var skin = [0.06 + R() * 0.04, 0.42, 0.26 + R() * 0.42];
    var top = coat ? [[220, 30, 0, 200, 100, 265][Math.floor(R() * 6)] / 360, 0.08 + R() * 0.25, 0.1 + R() * 0.2] : [R(), 0.18 + R() * 0.32, R() < 0.5 ? 0.2 + R() * 0.12 : 0.42 + R() * 0.22];
    var lr = R(), leg = lr < 0.45 ? [0.6, 0.35, 0.18 + R() * 0.14] : lr < 0.7 ? [0.65, 0.06, 0.07 + R() * 0.07] : lr < 0.85 ? [0.11, 0.25, 0.34 + R() * 0.1] : [0.6, 0.04, 0.26 + R() * 0.14];
    var sk = [R(), 0.3 + R() * 0.3, 0.2 + R() * 0.25], sr = R(), shoe = sr < 0.6 ? [0.07, 0.1, 0.07 + R() * 0.07] : sr < 0.85 ? [0, 0, 0.5 + R() * 0.12] : [0.07, 0.4, 0.2];
    var grey = old ? R() < 0.85 : R() < 0.05, fair = R() < 0.12, hair = grey ? [0.07, 0.04, 0.62 + R() * 0.2] : fair ? [0.07 + R() * 0.04, 0.45, 0.28 + R() * 0.2] : [0.07, 0.4, 0.05 + R() * 0.11];
    function paint(mesh, idx, c) { col.setHSL(c[0], c[1], c[2]); mesh.setColorAt(idx, col); }
    paint(P.torso, i, top); paint(P.coat, i, skirt ? sk : top); paint(P.hips, i, skirt ? sk : coat ? top : leg);
    paint(P.head, i, skin); paint(P.hair, i, hair); paint(P.hairLong, i, hair);
    for (var sd = 0; sd < 2; sd++) {
      paint(P.thigh, i * 2 + sd, leg); paint(P.shin, i * 2 + sd, skirt && temp >= 60 ? skin : leg); paint(P.foot, i * 2 + sd, shoe);
      paint(P.arm, i * 2 + sd, top); paint(P.fore, i * 2 + sd, bare ? skin : top); paint(P.hand, i * 2 + sd, skin);
    }
    col.set(p.kc || '#f3e6cf'); hc[i * 3] = col.r; hc[i * 3 + 1] = col.g; hc[i * 3 + 2] = col.b;
  });
  // a household keeps together: the first of them leads, the others take a place beside or just behind
  var SLOT = [[0.62, 0.25], [0.3, 0.95], [0.95, 1.05], [1.25, 0.2], [0.7, 1.75], [0.1, 1.8]], groups = 0;
  list.forEach(function (p) {
    if (!p.lead) return;
    var L = p.lead, sl = SLOT[(p.rank - 1) % SLOT.length];
    L.group = L.group || ++groups; p.group = L.group; L.size = Math.max(L.size || 1, p.rank + 1);
    p.s = L.s; p.ox = -L.s * sl[0]; p.oz = sl[1]; p.amp = L.amp;
    L.cruise = Math.min(L.cruise, p.cruise) * 0.97;
  });
  list.forEach(function (p) { if (p.size) { p.lane = clamp(p.lane, LO + (p.size > 2 ? 1.25 : 0.65), HI); p.x = p.s * p.lane; } });
  // shop fronts on each side: somewhere to walk to and stop at
  var fronts = { '-1': [], '1': [] };
  ((k.LAY || {}).parcels || []).forEach(function (q) { if (q.b != null && q.k !== 'h') fronts[q.s < 0 ? -1 : 1].push(q.z); });
  function frontAt(p) { return fronts[p.s].some(function (z) { return Math.abs(z - p.z) < 3.5; }); }

  // ---------- what they do ----------
  var simT = 0, warm = false, tick = 0, camX = 0, camZ = 0;
  var dbg = window.WV_DEBUG && window.WV_DEBUG.people ? (window.__wvPeople = []) : null; // look-test: who came to a stop on top of someone, and how
  function heading(p) { return p.dir < 0 ? 0 : Math.PI; }
  // ---------- people who know each other ----------
  var BAD = { rivalry: 1, tension: 1, sports_rival: 1 }, links = [];
  function boss(p) { return p.lead || p; }
  function face(p, q) { return Math.atan2(q.x - p.x, q.z - p.z) + Math.PI; } // the way p turns to look at q
  (k.ties || []).forEach(function (tp) {
    var a = tp[0], b = tp[1], A = boss(a), B = boss(b); if (A === B || a.i == null || b.i == null) return;
    var ln = { a: a, b: b, A: A, B: B, t: tp[2], bad: !!BAD[tp[2].t], w: clamp((tp[2].i || 0) / 10, 0.15, 1), st: 0, cool: R2() * 8, until: 0, t0: 0, seeker: null, turnAt: 0, speak: 0, near: false };
    links.push(ln); (A.links = A.links || []).push(ln); (B.links = B.links || []).push(ln);
  });
  if (window.WV_DEBUG) window.__wvLinks = links;
  function other(ln, p) { return ln.A === p ? ln.B : ln.A; }
  function theirs(ln, p) { return ln.A === p ? ln.b : ln.a; } // the one of the other household the tie is with
  // where p stands to talk to q: a pace off along the street, further when a household is standing on that side
  function standoff(p, q) { var side = p.z >= q.z ? 1 : -1; return side * (0.95 + (side > 0 ? (q.size ? 1.9 : 0) : (p.size ? 1.9 : 0))); }
  function hush(p, ln) { p.link = ln; if (p.st === 1) p.tz = p.z + p.dir * 0.35; else p.until = simT + 60; } // come to a stop and wait
  function gather(ln) { ln.st = 2; ln.t0 = simT; hush(ln.A, ln); hush(ln.B, ln); }
  function begin(ln) {
    ln.st = 3; ln.t0 = simT; ln.until = simT + 6 + 14 * ln.w + R2() * 6; ln.speak = R2() < 0.5 ? 0 : 1; ln.turnAt = 0;
    ln.a.meet = { q: ln.b, t: ln.t, bad: false }; ln.b.meet = { q: ln.a, t: ln.t, bad: false };
    ln.A.eye = ln.a.eye = ln.b; ln.B.eye = ln.b.eye = ln.a; ln.A.eyeAway = ln.B.eyeAway = ln.a.eyeAway = ln.b.eyeAway = false;
  }
  function clearPair(ln) {
    [ln.A, ln.B, ln.a, ln.b].forEach(function (p) { p.eye = null; p.eyeAway = false; p.gest = 0; if (p.meet && p.meet.t === ln.t) p.meet = null; });
  }
  function endTalk(ln, cool) {
    [ln.A, ln.B].forEach(function (p) {
      if (p.link !== ln) return; p.link = null; p.meetCool = simT + 15 + R2() * 25;
      if (p.st === 0 && !p.hold) { if (p.amp) p.until = simT + 0.3 + R2() * 1.2; else settle(p, true); }
    });
    clearPair(ln); ln.st = 0; ln.seeker = null; ln.near = true; ln.cool = simT + cool;
  }
  function endShun(ln, cool) {
    [ln.A, ln.B].forEach(function (p) { p.shun = null; p.brisk = 1; if (p.st === 0 && !p.link && !p.hold) settle(p, false); });
    clearPair(ln); ln.st = 0; ln.cool = simT + cool;
  }
  function shunTick(ln, A, B, d) {
    var busy = A.hold || B.hold || (A.link && A.link.st >= 2) || (B.link && B.link.st >= 2);
    if (ln.st === 0) {
      if (busy || simT < ln.cool || d > 9 || (A.st !== 1 && B.st !== 1)) return;
      ln.st = 5; ln.t0 = simT; A.shun = B; B.shun = A; A.brisk = B.brisk = 1.25;
      ln.a.meet = { q: ln.b, t: ln.t, bad: true }; ln.b.meet = { q: ln.a, t: ln.t, bad: true };
    }
    var el = simT - ln.t0;
    if (busy || d > 11 || el > 14) { endShun(ln, 30 + R2() * 30); return; }
    ln.A.eye = ln.a.eye = ln.b; ln.B.eye = ln.b.eye = ln.a; ln.A.eyeAway = ln.B.eyeAway = ln.a.eyeAway = ln.b.eyeAway = el > 1.0;
    [A, B].forEach(function (p) {
      if (p.st !== 0 || p.link || el < 0.8) return;
      // standing: turn to the wall, and a little further, so their back is to the other
      var q = other(ln, p), wall = -p.s * Math.PI / 2, away = q.z > p.z ? 0 : Math.PI;
      p.yawT = wall + 0.5 * (wrap(away - wall) > 0 ? 1 : -1); p.until = Math.max(p.until, simT + 1.5);
    });
  }
  function meetTick() {
    for (var i = 0; i < links.length; i++) {
      var ln = links[i], A = ln.A, B = ln.B; if (A.s !== B.s) continue; // nobody crosses the road
      var d = Math.abs(A.z - B.z);
      if (ln.bad) { shunTick(ln, A, B, d); continue; }
      if (ln.st === 0) {
        // passing each other: the stronger the tie, the likelier they stop
        if (d > 4) ln.near = false;
        else if (d < 2.4 && !ln.near && Math.abs(Math.abs(A.x) - Math.abs(B.x)) < 2.2) {
          ln.near = true;
          if (simT >= ln.cool && !A.hold && !B.hold && !A.link && !B.link && (A.st === 1 || B.st === 1) && R2() < 0.35 + 0.5 * ln.w) gather(ln);
        }
        continue;
      }
      if (A.hold || B.hold || simT - ln.t0 > 80) { endTalk(ln, 20); continue; }
      if (ln.st === 1) {
        // one is on the way over; the other waits once they are in sight of each other
        var S = ln.seeker, Q = other(ln, S);
        if ((Q.link && Q.link !== ln) || S.link !== ln) { endTalk(ln, 15); continue; }
        if (S.st === 1) {
          S.tz = clamp(Q.z + standoff(S, Q), zMin, zMax); S.laneT = clamp(Math.abs(Q.x), LO, HI);
          var nd = S.tz > S.z ? 1 : -1; if (nd !== S.dir && Math.abs(S.tz - S.z) > 0.6) S.dir = nd;
        }
        if (d < 12 && !Q.link) hush(Q, ln);
      } else if (ln.st === 2) {
        if ((A.link && A.link !== ln) || (B.link && B.link !== ln)) { endTalk(ln, 15); continue; }
        if (!A.link) hush(A, ln); if (!B.link) hush(B, ln);
        if (A.st === 0 && B.st === 0 && A.v < 0.12 && B.v < 0.12) { if (d <= 3.3 + (A.size || B.size ? 2 : 0)) begin(ln); else { endTalk(ln, 20); continue; } }
      }
      if (ln.st === 3) {
        if (simT >= ln.until) { endTalk(ln, 90 + R2() * 120); continue; }
        if (simT >= ln.turnAt) { ln.speak = 1 - ln.speak; ln.turnAt = simT + 1.6 + R2() * 3.4; ln.a.gest = ln.speak === 0 ? 1 : 0; ln.b.gest = ln.speak === 1 ? 1 : 0; }
      }
      if (A.st === 0 && A.v < 0.3 && A.link === ln) A.yawT = face(A, ln.b);
      if (B.st === 0 && B.v < 0.3 && B.link === ln) B.yawT = face(B, ln.a);
    }
  }
  function settle(p, long) {
    // standing: at a window, facing the street, or looking along it
    var x = R2();
    if (p.post) p.yawT = p.s * (Math.PI / 2 + 0.25 + R2() * 0.45);
    else if (p.shop || (x < 0.4 && frontAt(p))) p.yawT = -p.s * Math.PI / 2 + (R2() - 0.5) * 0.5;
    else if (x < 0.75) p.yawT = p.s * (Math.PI / 2 + (R2() - 0.35) * 0.9);
    else p.yawT = (R2() < 0.5 ? 0 : Math.PI) + (R2() - 0.5) * 0.6;
    p.until = simT + (long ? 6 + R2() * 12 : 3 + R2() * 7);
  }
  function arrive(p, why) {
    p.st = 0; if (dbg && !p.link && !free(p, p.z, Math.abs(p.x))) dbg.push((why || 'arrived') + ' onto someone at t=' + simT.toFixed(1) + ' #' + p.i + ' z' + p.z.toFixed(2) + ' x' + Math.abs(p.x).toFixed(2) + ' tz' + p.tz.toFixed(2) + ' v' + p.v.toFixed(2));
    if (p.link) { p.until = simT + 60; if (p.link.st === 1 && p.link.seeker === p) p.link.st = 2; return; } // come to see someone, or stopped for them
    if (p.shop || R2() < 0.5) settle(p, p.shop); else p.until = simT + 0.3 + R2() * 1.2;
  }
  // is there room to stand at z, this far from the road, on this side? (nobody standing there, nobody on their way there)
  function free(p, z, lane) {
    for (var j = 0; j < n; j++) {
      var o = list[j]; if (o === p || o.s !== p.s || (p.group && o.group === p.group)) continue;
      if (p.link && (boss(o) === p.link.A || boss(o) === p.link.B)) continue; // the one they have come to stand with
      if (Math.abs(o.z - z) < 1.1 && Math.abs(Math.abs(o.x) - lane) < 0.75 && (o.st !== 1 || o.v < 0.2)) return false;
      if (!o.lead && o.st === 1 && Math.abs(o.tz - z) < 1.1 && Math.abs(o.laneT - lane) < 0.75) return false;
    }
    return true;
  }
  function depart(p) {
    var lo = Math.max(zMin, p.z0 - p.amp), hi = Math.min(zMax, p.z0 + p.amp), tz, lane, tries = 0;
    // someone they know is on the street: now and then, go over (the nearer and the closer the tie, the likelier)
    if (p.links && !p.link && !p.hold && simT >= (p.meetCool || 0) && R2() < 0.45) {
      var best = null, bs = 0;
      p.links.forEach(function (ln) {
        if (ln.bad || ln.st !== 0 || simT < ln.cool) return;
        var q = other(ln, p), dd = Math.abs(q.z - p.z); if (q.s !== p.s || q.hold || q.link || dd > 60 || dd < 2.5) return;
        var sc = ln.w / (1 + dd / 20) * (0.5 + R2()); if (sc > bs) { bs = sc; best = ln; }
      });
      if (best) {
        var bq = other(best, p); best.st = 1; best.seeker = p; best.t0 = simT; p.link = best; p.shop = false;
        p.tz = clamp(bq.z + standoff(p, bq), zMin, zMax); p.laneT = clamp(Math.abs(bq.x), LO, HI); p.dir = p.tz > p.z ? 1 : -1; p.yawT = heading(p); p.st = 1;
        return;
      }
    }
    var fr = fronts[p.s].filter(function (z) { return z > lo && z < hi && Math.abs(z - p.z) > 3; });
    p.shop = fr.length > 0 && !p.size && R2() < 0.55;
    do {
      if (p.shop) { tz = fr[Math.floor(R2() * fr.length)] + (R2() - 0.5) * 3; lane = HI - R2() * 0.5; }
      else { tz = lo + R2() * (hi - lo); lane = p.lane; }
      tz = clamp(tz, zMin, zMax);
    } while ((Math.abs(tz - p.z) < 3 || !free(p, tz, lane)) && ++tries < 10);
    p.tz = tz; p.laneT = lane; p.dir = p.tz > p.z ? 1 : -1; p.yawT = heading(p); p.st = 1;
  }
  // nobody starts on top of anybody: those who stay put are shuffled along until they have room
  list.forEach(function (p) { if (p.lead) { p.x = p.lead.x + p.ox; p.z = p.lead.z + p.oz; } });
  list.forEach(function (p) {
    if (p.lead || p.amp) return;
    for (var tries = 0; tries < 8 && !free(p, p.z, Math.abs(p.x)); tries++) { p.z0 -= 1.15; p.z = p.z0; }
    list.forEach(function (o) { if (o.lead === p) o.z = p.z + o.oz; });
  });
  list.forEach(function (p) {
    if (p.lead) return;
    p.laneT = p.lane;
    // the street is already going when you arrive: most of those who roam are mid-walk
    if (p.amp) { p.st = 0; p.until = R2() * 9; p.yaw = p.yawT = heading(p); if (R2() < 0.7) { depart(p); p.yaw = p.yawT; p.v = p.cruise; } }
    else { settle(p, true); p.yaw = p.yawT; p.until = 4 + R2() * 16; }
  });
  // the street is already going: some of those who know each other are mid-conversation when you arrive
  links.forEach(function (ln) {
    if (ln.bad || ln.A.s !== ln.B.s || ln.A.link || ln.B.link || R2() > 0.08 + 0.14 * ln.w) return;
    var M = ln.A, N = ln.B; if (!M.amp || M.post || M.size) { M = ln.B; N = ln.A; } if (!M.amp || M.post || M.size) return; // one of them has to be free to go over, alone
    var z = clamp(N.z + standoff(M, N), zMin, zMax), lane = clamp(Math.abs(N.x), LO, HI);
    M.link = N.link = ln; if (!free(M, z, lane)) { M.link = N.link = null; return; }
    M.z = z; M.x = M.s * lane; M.st = N.st = 0; M.v = N.v = 0; M.until = N.until = 60;
    begin(ln); ln.until = 3 + R2() * (6 + 14 * ln.w);
    M.yaw = M.yawT = face(M, theirs(ln, M)); N.yaw = N.yawT = face(N, theirs(ln, N));
  });
  list.forEach(function (p) { if (p.lead) { p.x = p.lead.x + p.ox; p.z = p.lead.z + p.oz; p.yaw = p.yawT = p.lead.yaw; p.dir = p.lead.dir; p.st = p.lead.st; } });

  // Making way. Each walker (or household, taken as one body as wide as it stands) looks at everyone in the
  // next few paces and picks the nearest clear line past all of them. Two people meeting head-on each give
  // half the room, the one nearer the buildings going that way and the other toward the kerb (level with each
  // other, each keeps right), so they part the same way every time. Nobody steps across a person they are
  // level with, and with no clear line a walker holds back behind whoever is in the way.
  var HALF = 0.27, GAP = 0.13, GR = [], XLO = LO - 0.2, XHI = HI + 0.35, IV = [];
  function byStart(a, b) { return a[0] - b[0]; }
  function avoid() {
    var i, j, p, o, g;
    for (i = 0; i < n; i++) { p = list[i]; if (!p.group) continue; g = GR[p.group] || (GR[p.group] = { lo: 0, hi: 0, t: -1 }); var ax = Math.abs(p.x); if (g.t !== tick) { g.t = tick; g.lo = ax - HALF; g.hi = ax + HALF; } else { if (ax - HALF < g.lo) g.lo = ax - HALF; if (ax + HALF > g.hi) g.hi = ax + HALF; } }
    for (i = 0; i < n; i++) {
      p = list[i]; if (p.lead) continue;
      if (p.st !== 1) { p.av = 0; p.vcap = 9; continue; }
      var cur = Math.abs(p.x), wR = HALF, wW = HALF; if (p.group) { g = GR[p.group]; wR = cur - g.lo; wW = g.hi - cur; }
      var floor = XLO + wR - HALF, ceil = XHI - wW + HALF, lb = floor, ub = ceil, mine = cur + (wW - wR) / 2, vcap = 9, nIv = 0;
      var pal = p.link ? other(p.link, p) : null;
      for (j = 0; j < n; j++) {
        o = list[j]; if (o === p || o.s !== p.s || (p.group && o.group === p.group)) continue;
        var dz = (o.z - p.z) * p.dir; if (dz < -0.9 || dz > (p.shun ? 10.5 : 6.5)) continue;
        // the one they are walking up to: no stepping round them, only come no closer than a pace
        if (pal && boss(o) === pal) { if (dz > 0) vcap = Math.min(vcap, (o.st === 1 ? o.v * (o.dir === p.dir ? 1 : -1) : 0) + (dz - 0.8) / 0.8); continue; }
        var ex = p.shun && boss(o) === p.shun ? 1 : 0; // someone they are on bad terms with gets a wide berth, from further off
        var oLo, oHi; if (o.group) { g = GR[o.group]; oLo = g.lo; oHi = g.hi; } else { oLo = Math.abs(o.x) - HALF; oHi = Math.abs(o.x) + HALF; }
        var theirs = (oLo + oHi) / 2;
        if (dz < 0.75) { // level with them: stay on this side of them
          if (theirs < mine) { if (oHi + 0.1 + wR > lb) lb = oHi + 0.1 + wR; } else if (oLo - 0.1 - wW < ub) ub = oLo - 0.1 - wW;
          if (dz < 0.15) continue;
        }
        var onc = o.st === 1 && o.dir !== p.dir && o.v > 0.3; if (dz > (onc ? 6.5 : 3.4) + ex * 4) continue;
        // where my own line must not be, to clear them
        var a = oLo - GAP - wW - ex, b = oHi + GAP + wR + ex;
        // bodily in my way: come no faster than leaves a pace between us (they may be walking on ahead, or toward me)
        if (oLo - wW - 0.03 < cur && oHi + wR + 0.03 > cur) vcap = Math.min(vcap, (o.st === 1 ? o.v * (o.dir === p.dir ? 1 : -1) : 0) + (dz - 0.85) / 0.8);
        if (onc) {
          var wallward = Math.abs(mine - theirs) < 0.06 ? p.s * (p.dir < 0 ? 1 : -1) > 0 : mine > theirs, half;
          if (wallward) { half = Math.max(0, b - cur) / 2; b = b > cur ? cur + half + Math.max(0, (XLO - HALF) - (oLo - half)) : b; a = -1e9; }
          else { half = Math.max(0, cur - a) / 2; a = a < cur ? cur - half - Math.max(0, (oHi + half) - (XHI + HALF)) : a; b = 1e9; }
        }
        var slot = IV[nIv] || (IV[nIv] = [0, 0, 0]); slot[0] = a; slot[1] = b; slot[2] = onc ? dz * 0.45 : dz; nIv++;
      }
      if (lb > ceil) lb = ceil; if (ub < floor) ub = floor; if (lb > ub) lb = ub = clamp(cur, floor, ceil);
      p.lb = lb; p.ub = ub;
      p.vcap = vcap;
      if (!nIv) { p.av *= 0.6; continue; }
      // the clear lines left between floor and ceil; take the one that asks the smallest step, leaning to my own lane
      // (if no one line clears everybody in sight, clear the nearer ones and weave past the rest when they come)
      IV.length = nIv; IV.sort(byStart);
      var go = null, reach, pass;
      for (pass = 0; pass < 3 && go == null; pass++) {
        reach = pass === 0 ? 1e9 : pass === 1 ? 2.2 : 1.3;
        var pos = floor, cost = 1e9, c, y, e0, e1, last = -1;
        for (j = 0; j <= nIv && pos <= ceil; j++) {
          if (j < nIv && IV[j][2] > reach) continue;
          e0 = pos; e1 = j < nIv ? Math.min(IV[j][0], ceil) : ceil;
          if (e1 >= e0) {
            y = clamp(p.laneT, e0, e1); c = Math.abs(y - cur) + 0.25 * Math.abs(y - p.laneT); if (c < cost) { cost = c; go = y; }
            y = clamp(cur, e0, e1); c = Math.abs(y - cur) + 0.25 * Math.abs(y - p.laneT); if (c < cost) { cost = c; go = y; }
          }
          if (j < nIv && IV[j][1] > pos) pos = IV[j][1];
        }
      }
      p.av = (go == null ? cur : go) - p.laneT;
    }
  }
  function sim(h) {
    var i, p;
    if (tick++ % 6 === 0) { avoid(); if (links.length) meetTick(); }
    for (i = 0; i < n; i++) {
      p = list[i]; if (p.lead) continue;
      var hold = !!p.hold, z0 = p.z, x0 = p.x;
      if (p.st === 1) {
        var rem = (p.tz - p.z) * p.dir, want = hold ? 0 : Math.max(0, Math.min(p.cruise * (p.brisk || 1), p.vcap == null ? 9 : p.vcap));
        if (Math.abs(wrap(heading(p) - p.yaw)) > 0.8) want = 0; // turn first, then go
        want = Math.min(want, Math.sqrt(Math.max(0, 3.2 * (rem - 0.02))));
        p.v += clamp(want - p.v, -2.4 * h, 1.3 * h);
        var lx = clamp(clamp(p.laneT + p.av, p.lb == null ? XLO : p.lb, p.ub == null ? XHI : p.ub), XLO, XHI), sp = Math.min(1, p.v / p.cruise + 0.35);
        // nearly there and someone has taken the spot: stop a pace short of them
        if (rem < 1.7 && rem > 0.15 && tick % 6 === 1 && !free(p, p.tz, lx)) { p.tz -= p.dir * 1.15; rem -= 1.15; }
        p.vx = clamp((lx - Math.abs(p.x)) * 3, -0.8, 0.8) * sp;
        p.x = p.s * (Math.abs(p.x) + p.vx * h); p.z += p.dir * p.v * h;
        if (!hold) p.yawT = p.v > 0.3 ? Math.atan2(-p.s * p.vx, -p.dir * p.v) : heading(p);
        if (!hold && rem < 0.08 && p.v < 0.12) arrive(p);
        else if (!hold && p.vcap <= 0.02 && p.v < 0.05) { if ((p.stuck = (p.stuck || 0) + h) > 2.5) { p.stuck = 0; arrive(p, 'gave up'); } } // the way is shut: give up and stand a while
        else p.stuck = 0;
      } else {
        p.v = Math.max(0, p.v - 2.4 * h); p.z += p.dir * p.v * h; p.vx = 0;
        if (!hold && !p.link && simT >= p.until) { if (p.amp) depart(p); else settle(p, true); }
      }
      if (hold) { p.yawT = Math.atan2(camX - p.x, camZ - p.z) + Math.PI; p.held = true; }
      else if (p.held) { p.held = false; if (p.st === 1) p.yawT = heading(p); else settle(p, false); }
      turnAndStep(p, h, Math.sqrt((p.z - z0) * (p.z - z0) + (p.x - x0) * (p.x - x0)));
    }
    for (i = 0; i < n; i++) {
      p = list[i]; if (!p.lead) continue;
      var L = p.lead, px = p.x, pz = p.z, sway = Math.sin(simT * 0.31 + p.seed) * 0.1;
      p.x = L.x + p.ox; p.z = L.z + p.oz + sway; p.v = L.v; p.dir = L.dir; p.st = L.st;
      if (p.hold) p.yawT = Math.atan2(camX - p.x, camZ - p.z) + Math.PI;
      else if (L.link && L.link.st >= 2 && L.st === 0) p.yawT = face(p, theirs(L.link, L)); // the household turns to whoever has stopped with them
      else if (L.st === 1 || L.v > 0.15 || L.shop) p.yawT = L.yawT;
      else p.yawT = Math.atan2(L.x - p.x, L.z - p.z) + Math.PI; // standing together: turn to each other
      if (!L.hold && !L.link && L.st === 0 && L.v < 0.15 && !L.shop && p.rank === 1) L.yawT = Math.atan2(p.x - L.x, p.z - L.z) + Math.PI;
      turnAndStep(p, h, Math.sqrt((p.x - px) * (p.x - px) + (p.z - pz) * (p.z - pz)));
    }
  }
  // ease the heading round, and walk the feet: phase runs on distance covered, plus small steps to turn on the spot
  function turnAndStep(p, h, moved) {
    var dy = wrap(p.yawT - p.yaw), rate = clamp(dy * 5, -3.1, 3.1);
    p.yaw = wrap(p.yaw + rate * h); p.turn += (Math.min(1, Math.abs(rate) / 1.4) - p.turn) * Math.min(1, h * 8);
    var vu = (h > 0 ? moved / h : 0) / p.sc; p.vu = p.vu == null ? vu : p.vu + (vu - p.vu) * Math.min(1, h * 10);
    p.ph += moved / p.sc / stride(p.vu) + Math.abs(rate) * h * 0.5;
    p.ph -= Math.floor(p.ph);
    // where the eyes go: at whoever they have stopped with (or, on bad terms, at them and then pointedly away);
    // otherwise mostly ahead, now and then to one side
    p.gw = (p.gw || 0) + ((p.gest || 0) - (p.gw || 0)) * Math.min(1, h * 5);
    if (p.eye && !p.hold) {
      var rel = wrap(face(p, p.eye) - p.yaw);
      p.hyT = p.eyeAway ? (rel < 0 ? 0.8 : -0.8) : clamp(rel, -1.15, 1.15);
      p.hpT = p.eyeAway ? 0.14 : p.meet && !p.meet.bad && !p.gest ? 0.06 + 0.06 * Math.sin(simT * 2.3 + p.seed) : 0;
    } else if (simT >= p.lookAt) {
      p.lookAt = simT + 1.2 + R2() * 4;
      var walking = p.vu > 0.3, x = R2();
      p.hyT = x < (walking ? 0.6 : 0.3) ? 0 : (R2() - 0.5) * (walking ? 1.1 : 1.7);
      p.hpT = x > 0.9 ? 0.18 : 0;
    }
    if (p.hold) { p.hyT = 0; p.hpT = 0; }
    p.hy += (p.hyT - p.hy) * Math.min(1, h * 4); p.hp += (p.hpT - p.hp) * Math.min(1, h * 4);
  }
  function stride(vu) { return clamp(0.3 + 0.8 * vu, 0.3, 1.7); }

  // ---------- drawing a pose ----------
  var B = new T.Matrix4(), ML = new T.Matrix4(), MO = new T.Matrix4(), e = ML.elements, ZERO = new T.Matrix4().makeScale(0, 0, 0);
  // a limb at (px,py,pz): swung forward by a about its joint, then tipped sideways by g
  function limb(mesh, idx, px, py, pz, g, a, sx, sy, sz) {
    var c = Math.cos(a), s = Math.sin(a), cg = Math.cos(g), sg = Math.sin(g);
    e[0] = cg * sx; e[1] = sg * sx; e[2] = 0; e[3] = 0;
    e[4] = -sg * c * sy; e[5] = cg * c * sy; e[6] = s * sy; e[7] = 0;
    e[8] = sg * s * sz; e[9] = -cg * s * sz; e[10] = c * sz; e[11] = 0;
    e[12] = px; e[13] = py; e[14] = pz; e[15] = 1;
    MO.multiplyMatrices(B, ML); mesh.setMatrixAt(idx, MO);
  }
  // a body part at (px,py,pz): turned by y, nodded by x, tipped by z
  function body(px, py, pz, y, x, z, sx, sy, sz) {
    var cy = Math.cos(y), sy_ = Math.sin(y), cx = Math.cos(x), sx_ = Math.sin(x), cz = Math.cos(z), sz_ = Math.sin(z);
    e[0] = (cy * cz + sy_ * sx_ * sz_) * sx; e[1] = cx * sz_ * sx; e[2] = (-sy_ * cz + cy * sx_ * sz_) * sx; e[3] = 0;
    e[4] = (-cy * sz_ + sy_ * sx_ * cz) * sy; e[5] = cx * cz * sy; e[6] = (sy_ * sz_ + cy * sx_ * cz) * sy; e[7] = 0;
    e[8] = sy_ * cx * sz; e[9] = -sx_ * sz; e[10] = cy * cx * sz; e[11] = 0;
    e[12] = px; e[13] = py; e[14] = pz; e[15] = 1;
    MO.multiplyMatrices(B, ML);
  }
  // one foot through its cycle: how far the ankle is ahead of the body's centre, how high, and the tilt of the shoe
  var FT = { f: 0, y: 0, a: 0 }, FA = { f: 0, y: 0, a: 0 }, FBk = { f: 0, y: 0, a: 0 };
  function foot(ph, Su, w, lift, out) {
    var thTo = 1.0 * w, psi = 0.3 * w, fa = 0.217 * Su;
    if (ph < STANCE) {
      var th = ph > HEELOFF ? thTo * smooth((ph - HEELOFF) / (STANCE - HEELOFF)) : 0, sn = Math.sin(th), cs = Math.cos(th);
      out.f = fa - Su * ph + FB * (1 - cs) + AH * sn; out.y = FB * sn + AH * cs; out.a = -th;
      if (ph < 0.07) { var q = (1 - ph / 0.07) * psi; out.a = q; out.y += FHEEL * Math.sin(q); }
    } else {
      var u = (ph - STANCE) / (1 - STANCE), u2 = u * u, u3 = u2 * u, D = (1 - STANCE) * -Su;
      var f0 = fa - Su * STANCE + FB * (1 - Math.cos(thTo)) + AH * Math.sin(thTo), y0 = FB * Math.sin(thTo) + AH * Math.cos(thTo), y1 = AH + FHEEL * Math.sin(psi);
      // leaves the ground still moving back with it, swings through, and is drawn back as it comes down
      out.f = (2 * u3 - 3 * u2 + 1) * f0 + (u3 - 2 * u2 + u) * D + (-2 * u3 + 3 * u2) * fa + (u3 - u2) * D;
      out.y = y0 + (y1 - y0) * smooth(u) + lift * Math.sin(Math.PI * Math.pow(u, 0.7));
      out.a = -thTo + (psi + thTo) * smooth(u * 1.12);
    }
  }
  function pose(p, t) {
    var i = p.i, sc = p.sc, gy = k.yAt(p.z) + 0.16, cyw = Math.cos(p.yaw), syw = Math.sin(p.yaw);
    var be = B.elements;
    be[0] = cyw * sc; be[1] = 0; be[2] = -syw * sc; be[3] = 0; be[4] = 0; be[5] = sc; be[6] = 0; be[7] = 0;
    be[8] = syw * sc; be[9] = 0; be[10] = cyw * sc; be[11] = 0; be[12] = p.x; be[13] = gy; be[14] = p.z; be[15] = 1;

    var vu = p.vu || 0, w = smooth(vu / 0.95), still = 1 - w, Su = stride(vu), ph = p.ph, c2 = Math.cos(ph * 6.2832), s2 = Math.sin(ph * 6.2832);
    var lift = 0.02 * Math.max(w, p.turn) + 0.055 * w + 0.03 * p.turn * still;
    var wS = Math.max(w, p.turn * 0.35);
    foot(ph, Su, wS, lift, FA); var ph2 = ph + 0.5; if (ph2 >= 1) ph2 -= 1; foot(ph2, Su, wS, lift, FBk);
    // standing weight moves from one leg to the other, slowly
    var sway = still * (0.03 * Math.sin(t * 0.37 + p.seed) + 0.012 * Math.sin(t * 0.83 + p.seed * 1.7));
    var px = 0.022 * w * Math.sin(ph * 6.2832 - 0.3) + sway;
    var yp = 0.09 * w * c2, roll = 0.04 * w * s2 + sway * 1.3, FW = 0.1 - 0.03 * w;
    // the hips ride as high as the legs allow
    var hipY = p.cap, lg, F, dx, lim;
    for (lg = 0; lg < 2; lg++) {
      var sg0 = lg ? -1 : 1, ft0 = lg ? FBk : FA;
      F = ft0.f - sg0 * HW * Math.sin(yp); dx = sg0 * FW - (px + sg0 * HW * Math.cos(yp) * p.hipW);
      lim = ft0.y + Math.sqrt(Math.max(0.04, LMAX * LMAX - F * F - dx * dx)) - sg0 * HW * Math.sin(roll);
      if (lim < hipY) hipY = lim;
    }
    var breath = Math.sin(t * 1.5 + p.seed * 3) * 0.004 * still;
    var lean = -(0.02 + 0.06 * w) - p.stoop, yc = -0.11 * w * c2, cy0 = hipY + CH + breath, gx = p.girth, gs = p.shoulder * (0.94 + gx * 0.06);

    body(px, hipY, 0, yp, 0, roll, p.hipW * (0.9 + gx * 0.1), 1, gx); P.hips.setMatrixAt(i, MO);
    body(px * 0.7, cy0, 0, yc, lean, -roll * 0.5, gs, 1, gx * (1 + breath * 3)); P.torso.setMatrixAt(i, MO);
    // a jacket hangs to the hip; a skirt (the same shape, let down) is pushed out by the stride
    if (p.coat === 1) { body(px * 0.7, cy0, 0, yc * 0.5, lean * 0.6, -roll * 0.3, gs * 1.04, 1, gx * (1.07 + 0.1 * w)); P.coat.setMatrixAt(i, MO); }
    else if (p.coat) { body(px, cy0, 0, yp * 0.5, 0, roll * 0.5, p.hipW, p.coat, gx * (0.98 + 0.6 * w)); P.coat.setMatrixAt(i, MO); }
    else P.coat.setMatrixAt(i, ZERO);
    // head: carried on the lean of the chest, looking where it likes
    var sl = Math.sin(lean), cl = Math.cos(lean), hx = px * 0.7, hyy = cy0 + HD * cl, hz = HD * sl, hs = p.headS;
    body(hx, hyy, hz, p.hy, lean * 0.35 + p.hp + p.stoop * 0.3, 0, hs, hs, hs); P.head.setMatrixAt(i, MO);
    if (p.hair) { var hr = p.hair * hs; body(hx, hyy, hz, p.hy, lean * 0.35 + p.hp + p.stoop * 0.3, 0, hr, hr, hr); P.hair.setMatrixAt(i, MO); P.hairLong.setMatrixAt(i, p.long ? MO : ZERO); }
    else { P.hair.setMatrixAt(i, ZERO); P.hairLong.setMatrixAt(i, ZERO); }

    for (lg = 0; lg < 2; lg++) {
      var sg = lg ? -1 : 1, ft = lg ? FBk : FA, li = i * 2 + lg;
      // leg: hip joint to the planted ankle, knee solved between them
      var hxj = px + sg * HW * Math.cos(yp) * p.hipW, hyj = hipY + sg * HW * Math.sin(roll), hzj = -sg * HW * Math.sin(yp);
      var ddx = sg * FW - hxj, drop = hyj - ft.y, FF = ft.f + hzj, gam = Math.atan2(ddx, drop), Dn = Math.sqrt(ddx * ddx + drop * drop);
      var dd = clamp(Math.sqrt(Dn * Dn + FF * FF), 0.3, LMAX), al = Math.atan2(FF, Dn);
      var hipA = al + Math.acos(clamp((L1 * L1 + dd * dd - L2 * L2) / (2 * L1 * dd), -1, 1));
      var knee = Math.PI - Math.acos(clamp((L1 * L1 + L2 * L2 - dd * dd) / (2 * L1 * L2), -1, 1)), shinA = hipA - knee;
      var ch = Math.cos(hipA), kx = hxj + L1 * ch * Math.sin(gam), ky = hyj - L1 * ch * Math.cos(gam), kz = hzj - L1 * Math.sin(hipA);
      limb(P.thigh, li, hxj, hyj, hzj, gam, hipA, gx, 1, gx);
      limb(P.shin, li, kx, ky, kz, gam, shinA, gx, 1, gx);
      var cs2 = Math.cos(shinA), ax = kx + L2 * cs2 * Math.sin(gam), ay = ky - L2 * cs2 * Math.cos(gam), az = kz - L2 * Math.sin(shinA);
      body(ax, ay, az, -sg * p.toe, ft.a, 0, 1, 1, 1); P.foot.setMatrixAt(li, MO);

      // arm: swings against the leg on its own side; at rest it hangs, finds a pocket, or folds behind the back
      var sw = -sg * c2 * 0.42 * w * p.swing, fwd = Math.max(0, sw);
      var a1 = sw + 0.03 * w, flex = 0.12 + 0.22 * w + 0.5 * fwd, ab = sg * (0.07 + (gx - 1) * 0.25), ab2 = ab * 0.5;
      if (still > 0.01) {
        var idle = Math.sin(t * 0.5 + p.seed + lg * 2) * 0.025, ra = idle, rf = 0.14, rb = ab, rb2 = ab * 0.5;
        if (p.rest === 1) { ra = -0.1 + idle; rf = 0.55; rb = sg * 0.1; rb2 = -sg * 0.32; }
        else if (p.rest === 2) { ra = -0.45 + idle; rf = 0.35; rb = sg * 0.06; rb2 = -sg * 0.6; }
        a1 = a1 * w + ra * still; flex = flex * w + rf * still; ab = ab * w + rb * still; ab2 = ab2 * w + rb2 * still;
      }
      // talking: one hand comes up and moves with the words
      if (p.gw > 0.01 && lg === (Math.floor(p.seed) & 1)) {
        var gq = p.gw, g1 = Math.sin(t * 2.7 + p.seed), g2 = Math.sin(t * 1.6 + p.seed * 2.3);
        a1 += (0.4 + 0.14 * g2 - a1) * gq; flex += (1.2 + 0.4 * g1 - flex) * gq; ab += (sg * 0.12 - ab) * gq; ab2 += (-sg * 0.2 - ab2) * gq;
      }
      var cyc = Math.cos(yc), syc = Math.sin(yc), shx = sg * SW * gs, shy = SH * cl, shz = SH * sl;
      var sxj = px * 0.7 + shx * cyc + shz * syc, syj = cy0 + shy, szj = -shx * syc + shz * cyc;
      limb(P.arm, li, sxj, syj, szj, ab, a1, gx, 1, gx);
      var ca = Math.cos(a1), ex = sxj + LA1 * ca * Math.sin(ab), ey = syj - LA1 * ca * Math.cos(ab), ez = szj - LA1 * Math.sin(a1);
      limb(P.fore, li, ex, ey, ez, ab2, a1 + flex, gx, 1, gx); P.hand.setMatrixAt(li, MO);
    }
    var bs = 0.95 * sc * (1 + 0.25 * w);
    MO.makeScale(bs * 0.85, 1, bs); MO.setPosition(p.x, gy + 0.012, p.z); blob.setMatrixAt(i, MO);
    hp[i * 3] = p.x; hp[i * 3 + 1] = 2.26 * sc + gy; hp[i * 3 + 2] = p.z;
  }

  var frame = 0;
  k.ticks.push(function (t, dt, cam) {
    var i, late;
    camX = cam ? cam.x : 0; camZ = cam ? cam.z : 0;
    // if the clock starts late (a look-test with --t0), run the street forward to it
    if (!warm) { warm = true; late = Math.min(300, Math.max(0, t || 0)); for (i = 0; i < late / 0.05; i++) { sim(0.05); simT += 0.05; } }
    var h = Math.min(0.1, Math.max(0, dt || 0));
    if (h > 0) { sim(h); simT += h; }
    // near figures every frame; far ones, a pixel or two high, less often
    var q = k.quality ? k.quality() : 2, first = frame === 0; frame++;
    for (i = 0; i < n; i++) {
      var p = list[i], ddx = p.x - camX, ddz = p.z - camZ, d2 = ddx * ddx + ddz * ddz;
      var every = d2 > 25600 ? 12 : d2 > 8100 ? 4 : d2 > 2500 ? 2 : 1; if (q === 0 && every < 4) every *= 2; // past 160 the fog has them
      if (first || (frame + i) % every === 0) pose(p, simT);
    }
    for (var key in P) P[key].instanceMatrix.needsUpdate = true;
    blob.instanceMatrix.needsUpdate = true; hg.attributes.position.needsUpdate = true;
  });
  return { parts: P, halos: halos };
};

// Generated sound, off until the viewer presses Sound. SOUND = { supported, start, stop, enter(info), tick(state) }.
// Everything is synthesized with the Web Audio API: no files, no samples, no speech, no tunes.
// A place's sound is read off its hoods.js entry (lit, neon, trees, fill, water, wall, fog, sky, tone) and its
// landmark types; the name's hash only picks the key and voicing inside that character, so a place sounds the
// same on every visit. All timing runs on the audio clock, so the graph renders the same on an OfflineAudioContext.
SOUND = (function () {
  var AC = typeof window !== 'undefined' ? (window.AudioContext || window.webkitAudioContext) : null;

  // ---------- small helpers ----------
  function hash(s) { var h = 2166136261; s = String(s); for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function seeded(seed) { var a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; var t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function mtof(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function pick(list) { return list[Math.floor(Math.random() * list.length)]; }
  // Fades never cancel a running ramp: each place has one gain that only ever fades in and a second, after it,
  // that only ever fades out (Chrome's cancelAndHoldAtTime was measured stepping the level by up to 0.04 here).

  var MODES = {
    ionian: [0, 2, 4, 5, 7, 9, 11], lydian: [0, 2, 4, 6, 7, 9, 11], mixolydian: [0, 2, 4, 5, 7, 9, 10],
    dorian: [0, 2, 3, 5, 7, 9, 10], aeolian: [0, 2, 3, 5, 7, 8, 10]
  };
  // chord roots as scale degrees (0-based); one is picked per place by its hash
  var PROGS = [[0, 5, 3, 4], [0, 3, 5, 4], [0, 2, 5, 3], [0, 4, 5, 3], [0, 3, 0, 4], [0, 5, 2, 3]];

  // ---------- a place -> its musical character ----------
  function profile(info) {
    info = info || {};
    var st = info.style || {}, name = String(info.name || ''), wx = info.weather || 'clear';
    var lit = st.lit != null ? +st.lit : 0.45, neon = +st.neon || 0, trees = +st.trees || 0, house = st.fill === 'house';
    var wk = st.water && st.water.kind, wall = st.wall || 'stucco', tone = st.tone || [30, 0.2, 0.5], light = +tone[2] || 0.5;
    var sky = st.sky != null ? +st.sky : 22, warmSky = sky < 60 || sky > 330;
    var hmax = st.h ? +st.h[1] || 10 : 10;
    var people = Math.max(0, +info.people || 0), crowd = clamp(Math.log(people + 1) / Math.log(111), 0, 1);
    var left = st.left || null; // a street with a different second side (Eastlake): lean toward it a little
    if (left) { trees = Math.max(trees, (+left.trees || 0) * 0.5); }
    var fogg = st.fog ? clamp((+st.fog - 0.0115) / 0.006, 0, 1) : 0; // hoods.js fog above the page's default 0.0115
    var dark = clamp((lit <= 0.2 ? 0.55 : 0) + fogg * 0.35 + (light < 0.45 ? 0.15 : 0) - neon * 0.6, 0, 1);
    var warm = clamp((house ? 0.35 : 0) + trees * 0.3 + (wk === 'lake' ? 0.45 : 0) + (warmSky ? 0.2 : 0) + (light > 0.58 ? 0.15 : 0) - dark * 0.4, 0, 1);
    var air = clamp((wk === 'estuary' ? 0.45 : 0) + (wall === 'glass' ? 0.25 : 0) + (wk === 'lake' ? 0.15 : 0) + (fogg && wk ? 0.1 : 0), 0, 1);
    var urban = ({ glass: 1, concrete: 0.85, brick: 0.8, stucco: 0.55 })[wall] || 0.6;
    urban = clamp(urban * (house ? 0.45 : 1) * (0.6 + 0.4 * clamp(hmax / 30, 0, 1)), 0, 1);
    var h = hash(name + '|' + wall + '|' + (st.fill || '') + '|' + neon + '|' + trees), r = seeded(h);
    var mode = neon >= 0.5 ? 'dorian' : neon > 0 ? 'mixolydian' : dark >= 0.5 ? 'aeolian' : air >= 0.6 ? 'lydian' : warm >= 0.45 ? 'ionian'
      : ['ionian', 'mixolydian', 'dorian', 'lydian'][h % 4];
    var root = (h >>> 4) % 12;
    var center = 50 + 4 * air + 3 * neon - 6 * dark + 2 * warm, base = root + 12 * Math.round((center - root) / 12);
    var bright = clamp(0.25 + lit * 0.6 + neon * 0.45 + air * 0.35 - dark * 0.45 + warm * 0.1, 0.05, 1);
    var p = {
      name: name, weather: wx, mode: mode, scale: MODES[mode], root: root, base: base,
      prog: PROGS[(h >>> 9) % PROGS.length],
      voices: 3 + Math.round(clamp(0.3 + warm * 0.4 + neon * 0.5 + air * 0.3 - dark * 0.7 + crowd * 0.25, 0, 1) * 2),
      wave: neon > 0 ? 'sawtooth' : dark >= 0.5 ? 'sine' : 'triangle',
      cutoff: (350 + 2400 * bright) * (wx === 'fog' ? 0.65 : wx === 'overcast' ? 0.85 : 1),
      period: 11 + 7 * dark - 4 * neon + r() * 3,
      bellEvery: Math.max(3.2, 9 - 3.5 * warm - 3 * neon + 6 * dark - air),
      width: 0.3 + 0.6 * air, detune: 4 + 10 * air,
      rev: clamp(0.22 + 0.35 * air + 0.2 * dark + (wx === 'fog' ? 0.2 : wx === 'rain' ? 0.08 : 0), 0, 0.85),
      pulse: neon, tempo: 88 + 26 * neon + Math.round(r() * 8), lfoHz: 0.03 + r() * 0.04,
      dark: dark, warm: warm, air: air, urban: urban, crowd: crowd, trees: trees,
      water: info.water ? (+info.water < 0 ? -1 : 1) : 0, waterKind: wk || (info.water ? 'estuary' : ''),
      muffle: wx === 'fog' ? 1500 : wx === 'overcast' ? 6000 : wx === 'rain' ? 9000 : 18000,
      envScale: wx === 'fog' ? 0.6 : 1,
      places: (info.places || []).map(function (q) { return typeof q === 'string' ? { type: q } : q; }).filter(function (q) { return q && q.type; }),
      seed: h
    };
    p.has = function (t) { for (var i = 0; i < p.places.length; i++) if (p.places[i].type === t) return p.places[i]; return null; };
    return p;
  }

  // ---------- the graph: built on any BaseAudioContext ----------
  function Engine(ctx, out) {
    var E = { ctx: ctx, live: 0, shots: 0, scenes: [], cur: null };
    var SR = ctx.sampleRate;
    function N(node, list) { E.live++; if (list) list.push(node); return node; }
    function kill(list) { for (var i = 0; i < list.length; i++) { try { list[i].disconnect(); } catch (e) {} E.live--; } list.length = 0; }
    function gain(v, list) { var g = N(ctx.createGain(), list); g.gain.value = v; return g; }
    function filt(type, f, q, list) { var b = N(ctx.createBiquadFilter(), list); b.type = type; b.frequency.value = f; if (q != null) b.Q.value = q; return b; }
    function osc(type, f, list) { var o = N(ctx.createOscillator(), list); o.type = type; o.frequency.value = f; return o; }
    function pan(v, list) { if (ctx.createStereoPanner) { var s = N(ctx.createStereoPanner(), list); s.pan.value = clamp(v, -1, 1); return s; } return gain(1, list); }
    function noise(buf, list) { var s = N(ctx.createBufferSource(), list); s.buffer = buf; s.loop = true; return s; }

    // noise buffers, made once
    function mkBuf(seconds, fill) { var len = Math.floor(SR * seconds), b = ctx.createBuffer(1, len, SR), d = b.getChannelData(0); fill(d, len); return b; }
    var R = seeded(1234567);
    var WHITE = mkBuf(4, function (d, n) { for (var i = 0; i < n; i++) d[i] = R() * 2 - 1; });
    var PINK = mkBuf(4, function (d, n) {
      var b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (var i = 0; i < n; i++) { var w = R() * 2 - 1; b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759; b2 = 0.969 * b2 + w * 0.153852; b3 = 0.8665 * b3 + w * 0.3104856; b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898; d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11; b6 = w * 0.115926; }
      xfade(d, n);
    });
    var BROWN = mkBuf(4, function (d, n) { var l = 0; for (var i = 0; i < n; i++) { l = (l + 0.02 * (R() * 2 - 1)) / 1.02; d[i] = l * 3.5; } xfade(d, n); });
    // sparse drops on surfaces, looped under the rain
    var DROPS = mkBuf(3.7, function (d, n) {
      for (var k = 0; k < 70; k++) {
        var at = Math.floor(R() * n), f = 1800 + R() * 3500, a = 0.15 + R() * 0.5, len = Math.floor(SR * (0.012 + R() * 0.03));
        for (var j = 0; j < len; j++) { var i = (at + j) % n; d[i] += a * Math.sin(2 * Math.PI * f * j / SR) * Math.exp(-j / (len * 0.25)); }
      }
    });
    // make a looped buffer's seam continuous: remove the mean and the end-to-start drift
    function xfade(d, n) { var m = 0, i; for (i = 0; i < n; i++) m += d[i]; m /= n; var drift = d[n - 1] - d[0]; for (i = 0; i < n; i++) d[i] -= m + drift * i / (n - 1); }

    // ---------- master: mix -> compressor -> trim -> fader -> soft limiter -> out ----------
    var master = [];
    var mix = gain(1, master);
    var comp = N(ctx.createDynamicsCompressor(), master);
    comp.threshold.value = -22; comp.knee.value = 12; comp.ratio.value = 5; comp.attack.value = 0.008; comp.release.value = 0.35;
    var trim = gain(0.6, master);
    var fader = gain(0, master);
    var clip = N(ctx.createWaveShaper(), master);
    (function () { var n = 2048, c = new Float32Array(n); for (var i = 0; i < n; i++) { var x = (i / (n - 1)) * 2 - 1; c[i] = Math.tanh(x * 1.1) * 0.85 / Math.tanh(1.1); } clip.curve = c; })();
    mix.connect(comp); comp.connect(trim); trim.connect(fader); fader.connect(clip); clip.connect(out);
    E.fader = fader;

    // shared reverb: a generated tail, nothing loaded
    var revIn = gain(1, master), conv = N(ctx.createConvolver(), master), revOut = gain(0.5, master);
    (function () {
      var len = Math.floor(SR * 3.4), ir = ctx.createBuffer(2, len, SR), rr = seeded(99);
      for (var ch = 0; ch < 2; ch++) { var d = ir.getChannelData(ch), lp = 0; for (var i = 0; i < len; i++) { var t = i / SR; lp += ((rr() * 2 - 1) - lp) * (0.55 - 0.4 * t / 3.4); d[i] = lp * Math.pow(1 - i / len, 2.2) * (t < 0.012 ? t / 0.012 : 1); } }
      conv.normalize = true; conv.buffer = ir;
    })();
    revIn.connect(conv); conv.connect(revOut); revOut.connect(mix);

    // the gate swell: an airy rising band of noise and an open fifth in the place's key
    var sw = { lvl: 0 };
    var swSrc = noise(PINK, master), swBp = filt('bandpass', 300, 1.4, master), swG = gain(0, master);
    swSrc.connect(swBp); swBp.connect(swG); swG.connect(mix); swG.connect(revIn);
    var swT = gain(0, master), swO1 = osc('sine', 220, master), swO2 = osc('sine', 330, master), swO3 = osc('triangle', 440, master), swO3g = gain(0.25, master);
    swO1.connect(swT); swO2.connect(swT); swO3.connect(swO3g); swO3g.connect(swT); swT.connect(mix); swT.connect(revIn);
    var t0 = ctx.currentTime; swSrc.start(t0); swO1.start(t0); swO2.start(t0); swO3.start(t0);

    // footsteps bus (not part of any place, so it never crossfades)
    var feet = gain(1, master); feet.connect(mix);
    var walk = { dist: 0, lx: null, lz: null, side: 1 };

    // ---------- one-shots: each its own few nodes, stopped and disconnected when done ----------
    function shot(build) {
      if (E.shots >= 28 || E.noShots) return;
      var list = [], last = build(list), done = false;
      if (!last) { kill(list); return; }
      E.shots++;
      last.onended = function () { if (done) return; done = true; kill(list); E.shots--; };
    }
    function bell(S, f, t, a, dest) {
      shot(function (L) {
        var g = gain(0, L), o1 = osc('sine', f, L), o2 = osc('sine', f * 2.756, L), g2 = gain(0.18, L), o3 = osc('triangle', f * 2, L), g3 = gain(0.08, L), dur = 3.2 + Math.random() * 2;
        var pn = pan(rnd(-0.6, 0.6) * S.p.width * 1.4, L);
        o1.connect(g); o2.connect(g2); g2.connect(g); o3.connect(g3); g3.connect(g); g.connect(pn); pn.connect(dest || S.pre); pn.connect(S.send);
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(a, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o1.start(t); o2.start(t); o3.start(t); o1.stop(t + dur + 0.05); o2.stop(t + dur + 0.05); o3.stop(t + dur + 0.05);
        return o3;
      });
    }
    function pluck(S, f, t, a) {
      shot(function (L) {
        var o = osc(S.p.pulse > 0.5 ? 'sawtooth' : 'triangle', f, L), lp = filt('lowpass', 2600, 2, L), g = gain(0, L), pn = pan(rnd(-0.5, 0.5), L), dur = 0.7;
        o.connect(lp); lp.connect(g); g.connect(pn); pn.connect(S.pre); pn.connect(S.send);
        lp.frequency.setValueAtTime(2600 * (0.6 + S.p.pulse * 0.4), t); lp.frequency.exponentialRampToValueAtTime(300, t + 0.35);
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(a, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.start(t); o.stop(t + dur + 0.03); return o;
      });
    }
    function gull(S, t) {
      var n = 1 + Math.floor(Math.random() * 3), f0 = rnd(1050, 1500), side = S.p.water || 1, pv = clamp(side * rnd(0.4, 0.9), -1, 1);
      for (var k = 0; k < n; k++) (function (tk, f) {
        shot(function (L) {
          var o = osc('triangle', f, L), bp = filt('bandpass', f * 1.3, 3, L), g = gain(0, L), pn = pan(pv, L), d = rnd(0.28, 0.45);
          o.connect(bp); bp.connect(g); g.connect(pn); pn.connect(S.pre); pn.connect(S.send);
          o.frequency.setValueAtTime(f * 0.85, tk); o.frequency.linearRampToValueAtTime(f * 1.22, tk + d * 0.25); o.frequency.linearRampToValueAtTime(f * 0.72, tk + d);
          g.gain.setValueAtTime(0, tk); g.gain.linearRampToValueAtTime(0.022 * S.p.envScale, tk + 0.04); g.gain.linearRampToValueAtTime(0.012 * S.p.envScale, tk + d * 0.6); g.gain.linearRampToValueAtTime(0, tk + d);
          o.start(tk); o.stop(tk + d + 0.03); return o;
        });
      })(t + k * rnd(0.35, 0.6), f0 * rnd(0.95, 1.05));
    }
    function clank(S, t) {
      var hits = Math.random() < 0.4 ? 2 + Math.floor(Math.random() * 2) : 1, f = rnd(260, 520), pv = rnd(-0.8, 0.8);
      for (var k = 0; k < hits; k++) (function (tk) {
        shot(function (L) {
          var g = gain(0, L), pn = pan(pv, L), parts = [1, 2.32, 4.25, 6.63], last = null, d = rnd(0.5, 0.9);
          for (var i = 0; i < parts.length; i++) { var o = osc('sine', f * parts[i], L), gg = gain(1 / (i + 1.5), L); o.connect(gg); gg.connect(g); o.start(tk); o.stop(tk + d + 0.03); last = o; }
          g.connect(pn); pn.connect(S.pre); pn.connect(S.send);
          g.gain.setValueAtTime(0, tk); g.gain.linearRampToValueAtTime(0.02 * S.p.envScale, tk + 0.003); g.gain.exponentialRampToValueAtTime(0.0001, tk + d);
          return last;
        });
      })(t + k * rnd(0.3, 0.42));
    }
    function step(t, a, wet) {
      shot(function (L) {
        var s = N(ctx.createBufferSource(), L), bp = filt('bandpass', wet ? rnd(1400, 2200) : rnd(380, 620), wet ? 0.9 : 1.3, L), g = gain(0, L), pn = pan(walk.side * 0.12, L), d = wet ? 0.16 : 0.12;
        walk.side = -walk.side;
        s.buffer = WHITE; s.connect(bp); bp.connect(g); g.connect(pn); pn.connect(feet);
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(a, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
        s.start(t, Math.random() * 3.5); s.stop(t + d + 0.02); return s;
      });
    }

    // ---------- a place's scene ----------
    function Scene(p, t) {
      var S = { p: p, nodes: [], srcs: [], voices: [], chord: 0, dead: false, ev: {} }, L = S.nodes;
      function src(node) { S.srcs.push(node); return node; }
      S.bus = gain(0, L); S.out = gain(1, L); S.bus.connect(S.out); S.out.connect(mix);
      // the reverb send is gated by its own copy of the bus fade, so nothing enters or leaves the tail abruptly
      S.wbus = gain(0, L); S.wout = gain(1, L); S.wbus.connect(S.wout); S.wout.connect(revIn);
      S.send = gain(p.rev, L); S.send.connect(S.wbus);
      S.muffle = filt('lowpass', p.muffle, 0.5, L); S.muffle.connect(S.bus); S.muffle.connect(S.send);
      S.pre = gain(p.weather === 'fog' ? 0.7 : 1, L); S.pre.connect(S.muffle); // fog: muffled and quieter

      // the bed: detuned voices -> slowly breathing lowpass -> (pulse) -> level
      S.padF = filt('lowpass', p.cutoff, 0.8, L);
      var pulseG = gain(1, L), padG = gain(1 - 0.3 * p.dark, L);
      S.padF.connect(pulseG); pulseG.connect(padG); padG.connect(S.pre);
      var lfo = src(osc('sine', p.lfoHz, L)), lfoG = gain(p.cutoff * 0.38, L); lfo.connect(lfoG); lfoG.connect(S.padF.frequency);
      if (p.pulse > 0) {
        var depth = 0.22 + 0.3 * p.pulse, pl = src(osc('sine', p.tempo / 60, L)), plG = gain(depth / 2, L);
        pulseG.gain.value = 1 - depth / 2; pl.connect(plG); plG.connect(pulseG.gain);
      }
      var vlev = 0.5 / Math.sqrt(p.voices) * (p.wave === 'sawtooth' ? 0.42 : p.wave === 'triangle' ? 0.75 : 1);
      for (var i = 0; i < p.voices; i++) {
        var v = { midi: null, lvl: vlev * (i === 0 ? 0.9 : 1) };
        v.g = gain(0, L); v.pn = pan(i === 0 ? 0 : ((i % 2 ? -1 : 1) * p.width * (0.4 + 0.6 * i / p.voices)), L);
        v.o1 = src(osc(i === 0 ? 'sine' : p.wave, 110, L)); v.o2 = src(osc(i === 0 ? 'triangle' : p.wave, 110, L));
        v.o1.detune.value = -p.detune * (0.6 + 0.4 * Math.random()); v.o2.detune.value = p.detune * (0.6 + 0.4 * Math.random());
        v.o1.connect(v.g); v.o2.connect(v.g); v.g.connect(v.pn); v.pn.connect(S.padF);
        S.voices.push(v);
      }
      S.padG = padG;

      // ---------- the street around it ----------
      var es = p.envScale;
      // city hum: low rumble by build character, a murmur by how many people are out
      var hum = src(noise(BROWN, L)), humF = filt('lowpass', 170, 0.7, L), humG = gain(0.05 * (0.25 + 0.75 * p.urban) * (0.5 + 0.5 * p.crowd) * es, L);
      hum.connect(humF); humF.connect(humG); humG.connect(S.pre);
      var mur = src(noise(PINK, L)), murF = filt('bandpass', 650, 0.9, L), murG = gain(0.012 * p.crowd * p.crowd * (0.5 + 0.5 * p.urban) * es, L);
      mur.connect(murF); murF.connect(murG); murG.connect(S.pre);
      var murL = src(osc('sine', 0.07 + Math.random() * 0.05, L)), murLg = gain(murG.gain.value * 0.45, L); murL.connect(murLg); murLg.connect(murG.gain);
      if (p.has('market')) murG.gain.value *= 1.8;

      if (p.water) {
        var lap = src(noise(PINK, L)), lapF = filt('lowpass', p.waterKind === 'lake' ? 380 : 520, 0.9, L), lapG = gain(0.05 * es, L), lapP = pan(p.water * 0.65, L);
        lap.connect(lapF); lapF.connect(lapG); lapG.connect(lapP); lapP.connect(S.pre);
        var l1 = src(osc('sine', 0.13 + Math.random() * 0.05, L)), l2 = src(osc('sine', 0.29 + Math.random() * 0.08, L)), lg1 = gain(0.025 * es, L), lg2 = gain(0.015 * es, L);
        l1.connect(lg1); lg1.connect(lapG.gain); l2.connect(lg2); lg2.connect(lapG.gain);
        var fz = src(noise(WHITE, L)), fzF = filt('bandpass', 2400, 0.8, L), fzG = gain(0.004 * es, L); fz.connect(fzF); fzF.connect(fzG); fzG.connect(lapP);
        var l3 = gain(0.003 * es, L); l2.connect(l3); l3.connect(fzG.gain);
        S.ev.gull = t + rnd(4, 12);
      }
      if (p.trees > 0) {
        var wind = src(noise(WHITE, L)), wHp = filt('highpass', 1400, 0.5, L), wBp = filt('bandpass', 3200, 0.6, L), wG = gain(0.012 * p.trees * es, L);
        wind.connect(wHp); wHp.connect(wBp); wBp.connect(wG); wG.connect(S.pre);
        var wl = src(noise(BROWN, L)), wlF = filt('lowpass', 300, 0.7, L), wlG = gain(0.012 * p.trees * es, L); wl.connect(wlF); wlF.connect(wlG); wlG.connect(S.pre);
        S.wind = { g: wG, bp: wBp, g2: wlG, lvl: 0.012 * p.trees * es }; S.ev.gust = t + rnd(1, 3);
      }
      if (p.weather === 'rain') {
        var rn = src(noise(WHITE, L)), rHp = filt('highpass', 900, 0.6, L), rLp = filt('lowpass', 6500, 0.5, L), rG = gain(0.028, L);
        rn.connect(rHp); rHp.connect(rLp); rLp.connect(rG); rG.connect(S.bus); rG.connect(S.send);
        var dr = src(noise(DROPS, L)), drG = gain(0.05, L); dr.connect(drG); drG.connect(S.bus);
        var rn2 = src(noise(PINK, L)), r2F = filt('lowpass', 700, 0.5, L), r2G = gain(0.03, L); rn2.connect(r2F); r2F.connect(r2G); r2G.connect(S.bus);
      }
      var col = p.has('coliseum');
      if (col) { // a game on: distant crowd wash, swells, and a reverberant indistinct PA
        var cr = src(noise(PINK, L)), crF = filt('bandpass', 850, 0.7, L), crG = gain(0.016 * es, L), crP = pan(col.s ? col.s * 0.5 : 0.35, L);
        cr.connect(crF); crF.connect(crG); crG.connect(crP); crP.connect(S.pre); crP.connect(S.send);
        var pa = src(noise(PINK, L)), paF = filt('bandpass', 1150, 2.5, L), paM = gain(0.5, L), paG = gain(0, L), paL = src(osc('sine', 3.7, L)), paLg = gain(0.5, L);
        paL.connect(paLg); paLg.connect(paM.gain); pa.connect(paF); paF.connect(paM); paM.connect(paG); paG.connect(crP); paG.connect(S.send);
        S.crowd = { g: crG, base: 0.016 * es, pa: paG, place: col, pn: crP }; S.ev.cheer = t + rnd(8, 18); S.ev.pa = t + rnd(5, 14);
      }
      var build = p.has('stadium') || p.has('arena');
      if (build) { // construction: a generator's low drone and the clank of work
        var g1 = src(osc('sawtooth', 47 + Math.random() * 4, L)), g2 = src(osc('sawtooth', 71 + Math.random() * 4, L)), gF = filt('lowpass', 170, 1, L), gG = gain(0.012 * es, L), gP = pan(build.s ? build.s * 0.5 : -0.3, L);
        g1.connect(gF); g2.connect(gF); gF.connect(gG); gG.connect(gP); gP.connect(S.pre);
        S.site = { g: gG, base: 0.012 * es, place: build, pn: gP }; S.ev.clank = t + rnd(1.5, 4);
      }
      var sta = p.has('station');
      if (sta) { // a train going through: rumble swept across, a thin rail squeal at its loudest
        var tr = src(noise(BROWN, L)), trF = filt('lowpass', 160, 0.9, L), trG = gain(0, L), trP = pan(-0.8, L);
        var sq = src(noise(WHITE, L)), sqF = filt('bandpass', 3300, 9, L), sqG = gain(0, L);
        var ck = src(osc('square', 3.2, L)), ckG = gain(0, L); ck.connect(ckG); ckG.connect(trG.gain);
        tr.connect(trF); trF.connect(trG); sq.connect(sqF); sqF.connect(sqG); sqG.connect(trP); trG.connect(trP); trP.connect(S.pre); trP.connect(S.send);
        S.train = { g: trG, f: trF, pn: trP, sq: sqG, ck: ckG }; S.ev.train = t + rnd(9, 18);
      }
      var port = p.has('port');
      if (port) { // a ship's horn far out on the water
        var h1 = src(osc('sawtooth', 61, L)), h2 = src(osc('sawtooth', 91.5, L)), hF = filt('lowpass', 420, 1.2, L), hG = gain(0, L), hP = pan((p.water || -1) * 0.7, L);
        h1.connect(hF); h2.connect(hF); hF.connect(hG); hG.connect(hP); hP.connect(S.pre); hP.connect(S.send); hG.connect(S.send);
        S.horn = { g: hG }; S.ev.horn = t + rnd(10, 22);
      }
      var spill = p.has('saloon') || p.has('theater');
      if (spill) { // music behind walls: a muffled kick and chord through a door (saloon), a swelling pit chord (theater)
        var sal = !!p.has('saloon'), spF = filt('lowpass', sal ? 360 : 520, 0.9, L), spG = gain((sal ? 0.06 : 0.045) * es, L), spP = pan(spill.s ? spill.s * 0.6 : 0.55, L);
        spF.connect(spG); spG.connect(spP); spP.connect(S.pre); spP.connect(S.send);
        var chG = gain(0, L), chO = [];
        for (var c = 0; c < 3; c++) { var co = src(osc(sal ? 'sawtooth' : 'triangle', 220, L)); co.detune.value = (c - 1) * 6; co.connect(chG); chO.push(co); }
        chG.connect(spF);
        S.spill = { sal: sal, g: spG, base: spG.gain.value, chord: chG, oscs: chO, place: spill, pn: spP, beat: 60 / (sal ? 104 + (p.seed % 14) : 76 + (p.seed % 8)), bar: 0 };
        if (sal) { var kk = src(osc('sine', 55, L)), kG = gain(0, L); kk.connect(kG); kG.connect(spF); S.spill.kick = kk; S.spill.kg = kG; }
        S.ev.beat = t + 0.5;
      }

      S.ev.chord = t + p.period; S.ev.bell = t + rnd(1.5, 4); S.ev.pluck = t + 1;
      for (i = 0; i < S.srcs.length; i++) { var sn = S.srcs[i]; if (sn.buffer) sn.start(t, Math.random() * (sn.buffer.duration - 0.1)); else sn.start(t); }
      return S;
    }

    // ---------- harmony ----------
    function chordTones(p, idx) {
      var deg = p.prog[idx % p.prog.length], out = [];
      for (var k = 0; k < 5; k++) { var d = deg + 2 * k, oct = Math.floor(d / 7); out.push(p.scale[d % 7] + 12 * oct); }
      return out; // semitones above the key's root: root, 3rd, 5th, 7th, 9th
    }
    function setChord(S, t, first) {
      var p = S.p, tones = chordTones(p, S.chord), tau = first ? 0.01 : 1.6;
      S.tones = tones;
      for (var i = 0; i < S.voices.length; i++) {
        var v = S.voices[i], target;
        if (i === 0) target = p.base - 12 + (tones[0] % 12);
        else {
          var pc = tones[[0, 1, 2, 4, 3][(i - 1) % 5]], lo = p.base + (p.air > 0.5 && i % 2 === 0 ? 12 : 0);
          target = lo + ((pc % 12) + 12) % 12; if (target < lo) target += 12;
          if (v.midi != null) { while (target - v.midi > 6) target -= 12; while (v.midi - target > 6) target += 12; }
          while (target < p.base - 2) target += 12; while (target > p.base + 26) target -= 12;
        }
        v.midi = target;
        var f = mtof(target);
        if (first) { v.o1.frequency.setValueAtTime(f, t); v.o2.frequency.setValueAtTime(f, t); } else { v.o1.frequency.setTargetAtTime(f, t, tau); v.o2.frequency.setTargetAtTime(f, t, tau); }
        var lv = v.lvl * (first ? 1 : rnd(0.65, 1));
        if (first) { v.g.gain.setValueAtTime(0, t); v.g.gain.linearRampToValueAtTime(lv, t + 2.5); }
        else v.g.gain.setTargetAtTime(lv, t, 2.5);
      }
      if (S.spill) { var sp = S.spill.oscs; for (var k = 0; k < sp.length; k++) sp[k].frequency.setTargetAtTime(mtof(p.base + 12 + tones[k]), t, first ? 0.005 : 0.06); }
      S.chord++;
    }
    function scaleNote(S, octs) { // a note that sits in the current chord or the pentatonic around it
      var t = S.tones || [0, 4, 7], pcs = Math.random() < 0.7 ? t.slice(0, 4) : [S.p.scale[1], S.p.scale[4]];
      return S.p.base + 12 * octs + pick(pcs);
    }

    // ---------- place changes ----------
    E.enter = function (info, quick) {
      var t = ctx.currentTime + 0.02, p = profile(info), S = Scene(p, t);
      setChord(S, t, true);
      var hurry = t - (E.lastEnter == null ? -99 : E.lastEnter) < 2; E.lastEnter = t; // skipping through places: short fades keep the node count low
      var fade = quick ? 0.6 : hurry ? 0.8 : 3.5;
      [S.bus, S.wbus].forEach(function (b) { b.gain.setValueAtTime(0, t); b.gain.linearRampToValueAtTime(1, t + fade); });
      for (var i = 0; i < E.scenes.length; i++) retire(E.scenes[i], t, E.scenes.length - i > 2 ? 0.4 : fade);
      E.scenes = E.scenes.filter(function (s) { return !s.dead; }).concat([S]);
      E.cur = S;
      // retune the swell's open fifth to the new key, and mark the arrival with a soft strum of bells
      var rf = mtof(p.base + 12);
      swO1.frequency.setTargetAtTime(rf, t, 0.8); swO2.frequency.setTargetAtTime(rf * 1.5, t, 0.8); swO3.frequency.setTargetAtTime(rf * 2, t, 0.8);
      var crossing = sw.lvl > 0.4;
      swG.gain.setTargetAtTime(0, t, 0.9); swT.gain.setTargetAtTime(0, t, 1.1); swBp.frequency.setTargetAtTime(300, t, 1.5); sw.lvl = 0; // setTarget never jumps
      if (!quick) { var tn = S.tones, n = crossing ? 4 : 2; for (var k = 0; k < n; k++) bell(S, mtof(p.base + 24 + tn[k % 4]), t + 0.25 + k * 0.17, crossing ? 0.05 : 0.03); }
      return S;
    };
    function retire(S, t, dur) {
      if (S.dead) return; S.dead = true;
      [S.out, S.wout].forEach(function (b) { b.gain.setValueAtTime(1, t); b.gain.linearRampToValueAtTime(0, t + dur); });
      var end = t + dur + 0.05;
      for (var i = 0; i < S.srcs.length; i++) { try { S.srcs[i].stop(end); } catch (e) {} }
      var first = S.srcs[0];
      first.onended = function () { if (!S.nodes.length) return; kill(S.nodes); S.srcs.length = 0; };
    }

    // ---------- every frame: only event checks and cheap param moves ----------
    var lastSwell = -1;
    E.tick = function (s) {
      s = s || {};
      var now = ctx.currentTime, S = E.cur; if (!S) return;
      var p = S.p, ev = S.ev;
      // the crossing swell, throttled to ~15 updates a second
      var g = typeof s.gate === 'number' && isFinite(s.gate) ? s.gate : 999;
      var x = 1 - clamp(g / 32, 0, 1); x = x * x * (3 - 2 * x);
      if (now - lastSwell > 0.066 && Math.abs(x - sw.lvl) > 0.004) {
        lastSwell = now; var up = x > sw.lvl; sw.lvl = x;
        swG.gain.setTargetAtTime(x * 0.06, now, up ? 0.3 : 1.2); swT.gain.setTargetAtTime(x * x * 0.035, now, up ? 0.4 : 1.2);
        swBp.frequency.setTargetAtTime(300 + 2600 * x, now, 0.3);
        S.padF.detune.setTargetAtTime(x * 900, now, 0.4);
      }
      if (now >= ev.chord) { setChord(S, ev.chord > now - 1 ? ev.chord : now, false); ev.chord = Math.max(now, ev.chord) + p.period * rnd(0.85, 1.15); }
      if (now >= ev.bell) { var f = mtof(scaleNote(S, Math.random() < 0.6 ? 2 : 3)); bell(S, f, now + 0.02, rnd(0.018, 0.034)); ev.bell = now + p.bellEvery * rnd(0.5, 1.6); }
      if (p.pulse > 0) { // a soft arpeggio on the beat grid, half the notes left out at random
        var eighth = 30 / p.tempo;
        if (ev.pluck < now) ev.pluck = now + 0.05;
        while (ev.pluck < now + 0.2) { if (Math.random() < 0.25 + 0.35 * p.pulse) pluck(S, mtof(scaleNote(S, 1 + (Math.random() < 0.4 ? 1 : 0))), ev.pluck, 0.022 + 0.01 * p.pulse); ev.pluck += eighth; }
      }
      if (ev.gull && now >= ev.gull) { gull(S, now + 0.05); ev.gull = now + (p.waterKind === 'lake' ? rnd(25, 55) : rnd(10, 28)); }
      if (S.wind && now >= ev.gust) { var k = rnd(0.35, 1.5); S.wind.g.gain.setTargetAtTime(S.wind.lvl * k, now, rnd(0.8, 2)); S.wind.g2.gain.setTargetAtTime(S.wind.lvl * k, now, 1.5); S.wind.bp.frequency.setTargetAtTime(rnd(2200, 4800), now, 1.5); ev.gust = now + rnd(2.5, 7); }
      if (S.crowd) {
        if (now >= ev.cheer) { var c = S.crowd.g.gain, b = S.crowd.base; c.setTargetAtTime(b * rnd(2.2, 3.6), now, 0.6); c.setTargetAtTime(b, now + rnd(1.8, 3.2), 1.8); ev.cheer = now + rnd(14, 38); }
        if (now >= ev.pa) { var pg = S.crowd.pa.gain, d = rnd(1.6, 3.4); pg.setTargetAtTime(0.012 * p.envScale, now, 0.15); pg.setTargetAtTime(0, now + d, 0.3); ev.pa = now + rnd(16, 40); }
      }
      if (S.site && now >= ev.clank) { clank(S, now + 0.03); ev.clank = now + rnd(2.5, 8); }
      if (S.train && now >= ev.train) {
        var T = S.train, dur = rnd(12, 16), side = Math.random() < 0.5 ? -1 : 1;
        T.pn.pan.setValueAtTime(-0.85 * side, now); T.pn.pan.linearRampToValueAtTime(0.85 * side, now + dur);
        T.g.gain.setValueAtTime(0, now); T.g.gain.linearRampToValueAtTime(0.13 * p.envScale, now + dur * 0.42); T.g.gain.linearRampToValueAtTime(0.13 * p.envScale, now + dur * 0.55); T.g.gain.linearRampToValueAtTime(0, now + dur);
        T.ck.gain.setValueAtTime(0, now); T.ck.gain.linearRampToValueAtTime(0.03 * p.envScale, now + dur * 0.45); T.ck.gain.linearRampToValueAtTime(0, now + dur);
        T.f.frequency.setValueAtTime(110, now); T.f.frequency.linearRampToValueAtTime(380, now + dur * 0.48); T.f.frequency.linearRampToValueAtTime(110, now + dur);
        T.sq.gain.setValueAtTime(0, now + dur * 0.38); T.sq.gain.linearRampToValueAtTime(0.0035 * p.envScale, now + dur * 0.48); T.sq.gain.linearRampToValueAtTime(0, now + dur * 0.62);
        ev.train = now + dur + rnd(30, 65);
      }
      if (S.horn && now >= ev.horn) {
        var H = S.horn.g.gain, hd = rnd(2.2, 3.8), lv = 0.05 * p.envScale;
        H.setValueAtTime(0, now); H.linearRampToValueAtTime(lv, now + 0.5); H.linearRampToValueAtTime(lv * 0.85, now + hd); H.linearRampToValueAtTime(0, now + hd + 1.6);
        if (Math.random() < 0.35) { var t2 = now + hd + 2.2; H.setValueAtTime(0, t2); H.linearRampToValueAtTime(lv, t2 + 0.5); H.linearRampToValueAtTime(0, t2 + hd * 0.7 + 1.4); ev.horn = t2 + rnd(55, 110); }
        else ev.horn = now + rnd(45, 100);
      }
      if (S.spill) {
        var sp = S.spill;
        if (ev.beat < now) ev.beat = now + 0.05;
        while (ev.beat < now + 0.25) {
          var bt = ev.beat, n = sp.bar % 4;
          if (sp.sal) {
            var kg = sp.kg.gain; kg.setValueAtTime(0, bt); kg.linearRampToValueAtTime(0.9, bt + 0.006); kg.linearRampToValueAtTime(0, bt + 0.24);
            sp.kick.frequency.setValueAtTime(120, bt); sp.kick.frequency.exponentialRampToValueAtTime(48, bt + 0.12);
            var ob = bt + sp.beat / 2, cg = sp.chord.gain; cg.setValueAtTime(0, ob); cg.linearRampToValueAtTime(0.16, ob + 0.01); cg.linearRampToValueAtTime(0, ob + sp.beat * 0.4);
          } else if (n === 0) {
            var tg = sp.chord.gain; tg.setValueAtTime(0, bt); tg.linearRampToValueAtTime(0.22, bt + sp.beat * 1.6); tg.linearRampToValueAtTime(0, bt + sp.beat * 3.9);
          }
          sp.bar++; ev.beat += sp.beat;
        }
      }
      // landmarks the template placed along the street (objects with z): louder as the camera passes
      if (typeof s.z === 'number' && now - (S.lastNear || 0) > 0.2) {
        S.lastNear = now;
        var near = function (pl) { if (!pl || typeof pl.z !== 'number') return 1; var d = (s.z - pl.z) / 45; return 0.35 + 0.65 * Math.exp(-d * d); };
        if (S.spill && typeof S.spill.place.z === 'number') S.spill.g.gain.setTargetAtTime(S.spill.base * near(S.spill.place), now, 0.5);
        if (S.site && typeof S.site.place.z === 'number') S.site.g.gain.setTargetAtTime(S.site.base * near(S.site.place), now, 0.5);
      }
      // footsteps in time with the walk
      if (typeof s.x === 'number' && typeof s.z === 'number') {
        if (walk.lx != null) {
          var dx = s.x - walk.lx, dz = s.z - walk.lz, dd = Math.sqrt(dx * dx + dz * dz);
          if (s.walking && s.moving && dd < 3) {
            walk.dist += dd;
            var speed = s.dt > 0 ? dd / s.dt : 2, stride = speed > 4 ? 1.05 : 0.78;
            if (walk.dist >= stride) { walk.dist -= stride; if (walk.dist > stride) walk.dist = 0; step(now + 0.01, (speed > 4 ? 0.11 : 0.08) * p.envScale, p.weather === 'rain'); }
          } else if (!s.walking || !s.moving) walk.dist = Math.min(walk.dist, 0.5);
        }
        walk.lx = s.x; walk.lz = s.z;
      }
    };
    // the master fader moves only by setTarget (continuous from wherever it is); a fade to 0 ends exactly at 0
    E.fade = function (v, dur) {
      var now = ctx.currentTime, g = fader.gain;
      g.cancelScheduledValues(now); g.setTargetAtTime(v, now, dur / 6);
      if (v === 0) g.setValueAtTime(0, now + dur);
    };
    E.stats = function () { return { live: E.live, shots: E.shots, scenes: E.scenes.filter(function (s) { return !s.dead; }).length }; };
    return E;
  }

  // ---------- the page-facing switch ----------
  var ctx = null, eng = null, on = false, pending = null, dirty = false, timer = null, hidden = false;
  function supported() { return !!AC; }
  function later(fn, ms) { if (timer) clearTimeout(timer); timer = setTimeout(function () { timer = null; fn(); }, ms); }
  function wake() {
    if (!ctx || !eng) return;
    if (timer) { clearTimeout(timer); timer = null; }
    var go = function () { if (!on || hidden) return; if (dirty && pending) { dirty = false; eng.enter(pending, !eng.cur); } eng.fade(1, 2.5); };
    try { var pr = ctx.resume(); if (pr && pr.then) pr.then(go, function () {}); else go(); } catch (e) {}
  }
  function hush(dur, then) {
    if (!ctx || !eng) return;
    try { eng.fade(0, dur); } catch (e) {}
    later(function () { if (then()) { try { ctx.suspend(); } catch (e) {} } }, dur * 1000 + 150);
  }
  var keepEl = null;
  function keepAwake(play) {
    try {
      if (typeof Audio === 'undefined') return;
      if (!keepEl) { keepEl = new Audio('data:audio/wav;base64,UklGRkQDAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YSADAACAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgA=='); keepEl.loop = true; keepEl.setAttribute('playsinline', ''); keepEl.volume = 0.01; }
      if (play) { var p = keepEl.play(); if (p && p['catch']) p['catch'](function () {}); } else keepEl.pause();
    } catch (e) {}
  }
  function start() {
    if (!AC) return;
    keepAwake(true);
    try {
      if (!ctx) { try { ctx = new AC({ latencyHint: 'playback' }); } catch (e) { ctx = new AC(); } eng = Engine(ctx, ctx.destination); }
    } catch (e) { ctx = null; eng = null; return; }
    on = true; hidden = typeof document !== 'undefined' && document.hidden;
    if (!eng.cur) dirty = true;
    if (!hidden) wake();
  }
  function stop() {
    on = false; keepAwake(false);
    hush(1.2, function () { return !on; });
  }
  function enter(info) {
    pending = info || {};
    if (on && eng && !hidden && ctx.state === 'running') { try { dirty = false; eng.enter(pending, false); } catch (e) {} }
    else dirty = true;
  }
  function tick(state) {
    if (!on || !eng || hidden || ctx.state !== 'running') return;
    try { eng.tick(state); } catch (e) {}
  }
  if (typeof document !== 'undefined' && document.addEventListener) {
    document.addEventListener('visibilitychange', function () {
      hidden = document.hidden;
      if (!on) return;
      if (hidden) hush(0.5, function () { return hidden || !on; }); else wake();
    });
  }
  return { supported: supported, start: start, stop: stop, enter: enter, tick: tick, state: function () { return !ctx ? 'failed' : ctx.state; }, _Engine: Engine, _profile: profile, _stats: function () { return eng ? eng.stats() : null; }, _ctx: function () { return ctx; } };
})();

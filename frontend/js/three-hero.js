/* ═══════════════════════════════════════════════════════════
   SiKePo three-hero.js — "The Claim Stream" (isolated module)
   three.js r170 via CDN dynamic import (jsDelivr), no bundler.
   Loaded deferred after first paint; three itself imported only
   after window load + idle so FCP is never blocked.
   Budget: ≤12k particles desktop / ≤2.5k mobile; pixelRatio ≤1.5.
   Pauses RAF when document.hidden or stage offscreen.
   prefers-reduced-motion or WebGL failure → static CSS poster.
   ═══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var STAGE = document.getElementById('hero-stage');
  var MOUNT = document.getElementById('stage-canvas');
  if (!STAGE || !MOUNT) return;

  var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var MOBILE = window.matchMedia('(max-width: 767px)').matches || (navigator.hardwareConcurrency || 8) <= 4;
  var PARTICLES = MOBILE ? 2400 : 10000;

  function webglOK() {
    try {
      var c = document.createElement('canvas');
      return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
    } catch (e) { return false; }
  }

  function boot() {
    if (REDUCED || !webglOK()) return; // poster stays visible (CSS default)
    // Dynamic import keeps three.js fully out of the critical path.
    import('https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js')
      .then(function (THREE) { init(THREE); })
      .catch(function () { /* CDN fail → poster fallback stays */ });
  }

  function init(THREE) {
    var W = function () { return MOUNT.clientWidth; };
    var H = function () { return MOUNT.clientHeight; };

    var renderer = new THREE.WebGLRenderer({ antialias: !MOBILE, alpha: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setSize(W(), H());
    renderer.domElement.style.display = 'block';
    MOUNT.appendChild(renderer.domElement);

    var scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x070B14, 0.016);
    var camera = new THREE.PerspectiveCamera(50, W() / H(), 0.1, 200);
    camera.position.set(0, 3.5, 30);
    camera.lookAt(0, 0, 0);

    var world = new THREE.Group();      // idle rotation
    var parallax = new THREE.Group();   // pointer parallax
    parallax.add(world);
    scene.add(parallax);

    /* ── Detection Core: icosahedron wireframe + inner glow ── */
    var coreGeo = new THREE.IcosahedronGeometry(2.1, 1);
    var core = new THREE.LineSegments(
      new THREE.EdgesGeometry(coreGeo),
      new THREE.LineBasicMaterial({ color: 0x00ACC1, transparent: true, opacity: 0.9 })
    );
    world.add(core);
    var coreInner = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.15, 1),
      new THREE.MeshBasicMaterial({ color: 0x0284A8, transparent: true, opacity: 0.4 })
    );
    world.add(coreInner);

    // Soft glow sprite behind the core (canvas radial gradient)
    var glowCanvas = document.createElement('canvas');
    glowCanvas.width = glowCanvas.height = 128;
    var gctx = glowCanvas.getContext('2d');
    var grad = gctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, 'rgba(0,172,193,0.55)');
    grad.addColorStop(0.4, 'rgba(0,84,120,0.18)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    gctx.fillStyle = grad;
    gctx.fillRect(0, 0, 128, 128);
    var glow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: new THREE.CanvasTexture(glowCanvas), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
    }));
    glow.scale.set(16, 16, 1);
    world.add(glow);

    /* ── Orbit rings (conceptual A1/A2/A3, HTML HUD labels them) ── */
    function ring(radius, color, opacity, tiltX, tiltZ) {
      var pts = [];
      for (var i = 0; i <= 128; i++) {
        var a = (i / 128) * Math.PI * 2;
        pts.push(new THREE.Vector3(Math.cos(a) * radius, 0, Math.sin(a) * radius));
      }
      var g = new THREE.BufferGeometry().setFromPoints(pts);
      var l = new THREE.Line(g, new THREE.LineBasicMaterial({ color: color, transparent: true, opacity: opacity }));
      l.rotation.x = tiltX; l.rotation.z = tiltZ;
      return l;
    }
    var ringA = ring(3.4, 0x00ACC1, 0.5, 0.4, 0.1);
    var ringB = ring(4.8, 0x2EE38A, 0.35, -0.55, 0.3);
    var ringC = ring(6.6, 0xFFB020, 0.28, 0.2, -0.5);
    world.add(ringA, ringB, ringC);

    /* ── Claim particles ──
       kind: 0 CLEAN (green, passes through) · 1 HOLD (amber, deflects to
       outer orbit) · 2 REJECT (red, captured into tight inner orbit). */
    var positions = new Float32Array(PARTICLES * 3);
    var colors = new Float32Array(PARTICLES * 3);
    var kinds = new Uint8Array(PARTICLES);
    var states = new Uint8Array(PARTICLES);   // 0 stream · 1 orbiting
    var px = new Float32Array(PARTICLES), py = new Float32Array(PARTICLES), pz = new Float32Array(PARTICLES);
    var vx = new Float32Array(PARTICLES), vy = new Float32Array(PARTICLES), vz = new Float32Array(PARTICLES);
    var oU = new Float32Array(PARTICLES * 3), oV = new Float32Array(PARTICLES * 3); // orbit plane basis
    var oAngle = new Float32Array(PARTICLES), oRadius = new Float32Array(PARTICLES);
    var oTargetR = new Float32Array(PARTICLES), oSpeed = new Float32Array(PARTICLES), oLife = new Float32Array(PARTICLES);

    var COL = {
      clean: new THREE.Color(0x2EE38A),
      hold: new THREE.Color(0xFFB020),
      reject: new THREE.Color(0xFF5D5D)
    };

    function randOrthonormal(i) {
      // random orbit plane basis (u, v orthonormal)
      var n = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();
      var t = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5);
      var u = t.clone().sub(n.clone().multiplyScalar(t.dot(n))).normalize();
      var v = new THREE.Vector3().crossVectors(n, u);
      oU[i * 3] = u.x; oU[i * 3 + 1] = u.y; oU[i * 3 + 2] = u.z;
      oV[i * 3] = v.x; oV[i * 3 + 1] = v.y; oV[i * 3 + 2] = v.z;
    }

    function spawn(i) {
      var r = Math.random();
      kinds[i] = r < 0.58 ? 0 : (r < 0.83 ? 1 : 2);
      states[i] = 0;
      px[i] = -42 + Math.random() * 8;
      py[i] = (Math.random() - 0.5) * 14;
      pz[i] = (Math.random() - 0.5) * 18;
      vx[i] = 7 + Math.random() * 7;
      vy[i] = -py[i] * 0.012 + (Math.random() - 0.5) * 0.15;
      vz[i] = -pz[i] * 0.012 + (Math.random() - 0.5) * 0.15;
      oLife[i] = 0;
      var c = kinds[i] === 0 ? COL.clean : kinds[i] === 1 ? COL.hold : COL.reject;
      colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
    }

    for (var i = 0; i < PARTICLES; i++) {
      spawn(i);
      // pre-scatter so the stream is full on frame one
      px[i] += Math.random() * 76;
    }

    var pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    pGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    var points = new THREE.Points(pGeo, new THREE.PointsMaterial({
      size: MOBILE ? 0.7 : 0.55, vertexColors: true, transparent: true, opacity: 0.85,
      blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true
    }));
    world.add(points);

    /* ── Simulation ── */
    var REJECT_R = 2.9, HOLD_R = 5.6;
    function step(dt) {
      for (var i = 0; i < PARTICLES; i++) {
        if (states[i] === 0) {
          px[i] += vx[i] * dt; py[i] += vy[i] * dt; pz[i] += vz[i] * dt;
          if (kinds[i] !== 0 && px[i] > -3.2) {
            // anomalous claim reaches the core → captured into orbit
            states[i] = 1;
            oRadius[i] = Math.max(2.6, Math.sqrt(px[i] * px[i] + py[i] * py[i] + pz[i] * pz[i]) * 0.6);
            oTargetR[i] = kinds[i] === 2 ? REJECT_R : HOLD_R;
            oAngle[i] = Math.atan2(pz[i], px[i]);
            oSpeed[i] = (kinds[i] === 2 ? 1.6 : 1.0) + Math.random() * 0.8;
            oLife[i] = 6 + Math.random() * 8;
            randOrthonormal(i);
          } else if (px[i] > 44) {
            spawn(i);
          }
        } else {
          oAngle[i] += oSpeed[i] * dt;
          oRadius[i] += (oTargetR[i] - oRadius[i]) * Math.min(1, dt * 2.2);
          oLife[i] -= dt;
          var ux = oU[i * 3], uy = oU[i * 3 + 1], uz = oU[i * 3 + 2];
          var wx = oV[i * 3], wy = oV[i * 3 + 1], wz = oV[i * 3 + 2];
          var c = Math.cos(oAngle[i]) * oRadius[i], s = Math.sin(oAngle[i]) * oRadius[i];
          px[i] = c * ux + s * wx;
          py[i] = c * uy + s * wy;
          pz[i] = c * uz + s * wz;
          if (oLife[i] <= 0) spawn(i);
        }
        positions[i * 3] = px[i]; positions[i * 3 + 1] = py[i]; positions[i * 3 + 2] = pz[i];
      }
      pGeo.attributes.position.needsUpdate = true;
      pGeo.attributes.color.needsUpdate = true;
    }

    /* ── Pointer parallax (subtle, ≤ ~4°) ── */
    var targetRX = 0, targetRY = 0;
    STAGE.addEventListener('pointermove', function (e) {
      var r = STAGE.getBoundingClientRect();
      targetRY = ((e.clientX - r.left) / r.width - 0.5) * 0.14;   // ±0.07 rad ≈ 4°
      targetRX = ((e.clientY - r.top) / r.height - 0.5) * 0.10;
    });
    STAGE.addEventListener('pointerleave', function () { targetRX = 0; targetRY = 0; });

    /* ── RAF lifecycle: pause when hidden / offscreen ── */
    var running = false, visible = true, inView = true, rafId = 0;
    var clock = new THREE.Clock();

    function tick() {
      rafId = 0;
      if (!running) return;
      var dt = Math.min(clock.getDelta(), 0.05);
      step(dt);
      world.rotation.y += 0.05 * dt;
      coreInner.rotation.y -= 0.4 * dt;
      coreInner.rotation.x += 0.25 * dt;
      parallax.rotation.y += (targetRY - parallax.rotation.y) * Math.min(1, dt * 3);
      parallax.rotation.x += (targetRX - parallax.rotation.x) * Math.min(1, dt * 3);
      var pulse = 1 + Math.sin(clock.elapsedTime * 2.2) * 0.06;
      glow.scale.set(16 * pulse, 16 * pulse, 1);
      renderer.render(scene, camera);
      rafId = requestAnimationFrame(tick);
    }
    function setRunning(on) {
      var should = on && visible && inView && !document.hidden;
      if (should && !running) { running = true; clock.getDelta(); rafId = requestAnimationFrame(tick); }
      else if (!should && running) { running = false; if (rafId) cancelAnimationFrame(rafId); rafId = 0; }
    }

    document.addEventListener('visibilitychange', function () { setRunning(true); });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        inView = entries[0].isIntersecting;
        setRunning(true);
      }, { threshold: 0.02 }).observe(STAGE);
    }

    /* ── Resize ── */
    var resizeT = 0;
    window.addEventListener('resize', function () {
      clearTimeout(resizeT);
      resizeT = setTimeout(function () {
        camera.aspect = W() / H();
        camera.updateProjectionMatrix();
        renderer.setSize(W(), H());
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      }, 120);
    });

    // Everything ready → swap poster for the live stage (no layout shift:
    // stage box size is fixed by CSS, canvas is absolutely positioned).
    STAGE.classList.add('stage-live');
    setRunning(true);
  }

  // Lazy: never block FCP — wait for full load, then idle.
  if (document.readyState === 'complete') {
    (window.requestIdleCallback || function (f) { setTimeout(f, 300); })(boot);
  } else {
    window.addEventListener('load', function () {
      (window.requestIdleCallback || function (f) { setTimeout(f, 300); })(boot);
    }, { once: true });
  }
})();

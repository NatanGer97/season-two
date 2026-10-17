// =====================================================================
//  Alive: gold dust that drifts and reacts to the finger, tilt parallax
//  (gyroscope, pointer fallback), haptics. Pure canvas + CSS variables.
// =====================================================================
window.Alive = (() => {
  const app = document.getElementById('app');
  const cv = document.getElementById('dust');
  const g = cv.getContext('2d');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let W = 0, H = 0, dpr = 1;
  const P = [];
  const N = reduce ? 24 : 70;
  let pointer = null; // {x, y, t}
  let tilt = { x: 0, y: 0 }, tiltTarget = { x: 0, y: 0 };
  let running = true;

  function resize() {
    const r = app.getBoundingClientRect();
    dpr = Math.min(2, devicePixelRatio || 1);
    W = r.width; H = r.height;
    cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = W + 'px'; cv.style.height = H + 'px';
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function spawn(p = {}) {
    return Object.assign({
      x: Math.random() * W, y: Math.random() * H,
      r: 0.6 + Math.random() * 1.6,
      vx: 0, vy: -(0.08 + Math.random() * 0.22),
      a: 0.25 + Math.random() * 0.55,
      ph: Math.random() * Math.PI * 2,
      life: Infinity,
    }, p);
  }
  function init() {
    resize();
    P.length = 0;
    for (let i = 0; i < N; i++) P.push(spawn());
  }

  let last = performance.now();
  function frame(now) {
    if (!running) return;
    const dt = Math.min(40, now - last) / 16.7;
    last = now;
    g.clearRect(0, 0, W, H);
    tilt.x += (tiltTarget.x - tilt.x) * 0.06;
    tilt.y += (tiltTarget.y - tilt.y) * 0.06;
    app.style.setProperty('--px', tilt.x.toFixed(3));
    app.style.setProperty('--py', tilt.y.toFixed(3));
    const t = now / 1000;
    for (let i = P.length - 1; i >= 0; i--) {
      const p = P[i];
      p.ph += 0.01 * dt;
      p.x += (p.vx + Math.sin(t * 0.6 + p.ph) * 0.12) * dt;
      p.y += p.vy * dt;
      p.vx *= 0.96; 
      if (p.life !== Infinity) {
        p.life -= dt;
        p.vy *= 0.97;
        if (p.life <= 0) { P.splice(i, 1); continue; }
      }
      if (pointer && now - pointer.t < 1500) {
        const dx = p.x - pointer.x, dy = p.y - pointer.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < 140 * 140 && d2 > 1) {
          const d = Math.sqrt(d2);
          const f = (1 - d / 140) * 0.9;
          p.vx += (dx / d) * f * dt;
          p.vy += (dy / d) * f * 0.6 * dt;
        }
      }
      if (p.y < -10) { p.y = H + 10; p.x = Math.random() * W; }
      if (p.x < -10) p.x = W + 10; else if (p.x > W + 10) p.x = -10;
      const tw = 0.6 + 0.4 * Math.sin(t * 1.3 + p.ph * 3);
      const alpha = p.life === Infinity ? p.a * tw : Math.min(1, p.life / 40) * p.a;
      g.beginPath();
      g.fillStyle = `rgba(226, 196, 150, ${alpha.toFixed(3)})`;
      g.shadowColor = 'rgba(226, 196, 150, 0.9)';
      g.shadowBlur = 6;
      g.arc(p.x + tilt.x * 18, p.y + tilt.y * 18, p.r, 0, Math.PI * 2);
      g.fill();
    }
    requestAnimationFrame(frame);
  }

  // Finger: dust flows away from it
  app.addEventListener('pointermove', (e) => {
    const r = app.getBoundingClientRect();
    pointer = { x: e.clientX - r.left, y: e.clientY - r.top, t: performance.now() };
    if (!tiltEnabled && matchMedia('(pointer: fine)').matches) {
      tiltTarget = { x: ((e.clientX - r.left) / r.width - 0.5) * 0.8, y: ((e.clientY - r.top) / r.height - 0.5) * 0.8 };
    }
  }, { passive: true });
  app.addEventListener('pointerdown', (e) => {
    const r = app.getBoundingClientRect();
    pointer = { x: e.clientX - r.left, y: e.clientY - r.top, t: performance.now() };
  }, { passive: true });

  // Tilt: gyroscope on phones. iOS needs a permission request from a tap.
  let tiltEnabled = false;
  function onOrient(e) {
    if (e.gamma == null) return;
    const gx = Math.max(-1, Math.min(1, e.gamma / 28));
    const gy = Math.max(-1, Math.min(1, (e.beta - 42) / 28));
    tiltTarget = { x: gx, y: gy };
  }
  async function enableTilt() {
    if (tiltEnabled || reduce) return;
    try {
      if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
        const res = await DeviceOrientationEvent.requestPermission();
        if (res !== 'granted') return;
      }
      addEventListener('deviceorientation', onOrient, { passive: true });
      tiltEnabled = true;
    } catch (e) {}
  }

  const canBuzz = 'vibrate' in navigator;
  const api = {
    burst(x, y, n = 36) {
      if (reduce) return;
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2;
        const s = 1.5 + Math.random() * 4;
        P.push(spawn({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 0.6, r: 0.8 + Math.random() * 1.8, a: 0.9, life: 70 + Math.random() * 60 }));
      }
    },
    burstAt(el, n) {
      const a = app.getBoundingClientRect();
      const r = el.getBoundingClientRect();
      api.burst(r.left - a.left + r.width / 2, r.top - a.top + r.height / 2, n);
    },
    enableTilt,
    tick() { if (canBuzz) try { navigator.vibrate(6); } catch (e) {} },
    thump() { if (canBuzz) try { navigator.vibrate([24, 30, 40]); } catch (e) {} },
    pause() { running = false; },
    resume() { if (!running) { running = true; last = performance.now(); requestAnimationFrame(frame); } },
  };

  init();
  addEventListener('resize', init);
  document.addEventListener('visibilitychange', () => (document.hidden ? api.pause() : api.resume()));
  if (!reduce) requestAnimationFrame(frame);
  else { for (const p of P) { g.beginPath(); g.fillStyle = `rgba(226,196,150,${p.a})`; g.arc(p.x, p.y, p.r, 0, Math.PI * 2); g.fill(); } }
  return api;
})();

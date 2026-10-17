// Interactive scene widgets.
// Each widget: (el, cfg, ctx) => optional cleanup function.
// ctx.burst(opts)  – one confetti burst
// ctx.celebrate()  – longer confetti shower

(() => {
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  // ------------------------------------------------------------- ring sizer
  function ring(el, cfg, ctx) {
    const steps = cfg.steps;
    const last = steps.length - 1;
    const R_MAX = 74;
    const R_MIN = 47;

    el.innerHTML = `
      <div class="panel ring-w">
        <svg class="ring-svg" viewBox="0 0 200 200" aria-hidden="true">
          <defs>
            <linearGradient id="ring-grad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stop-color="#f6e3b8"/><stop offset=".5" stop-color="#d9b46c"/><stop offset="1" stop-color="#b8893f"/>
            </linearGradient>
          </defs>
          <circle class="finger" cx="100" cy="100" r="40"/>
          <circle class="ring" cx="100" cy="100" r="${R_MAX}" fill="none" stroke="url(#ring-grad)" stroke-width="10"/>
          <circle class="gem" cx="100" cy="${100 - R_MAX}" r="8"/>
        </svg>
        <div class="ring-side">
          <div class="ring-top">
            <div class="ring-size"><span class="sz"></span><small>מידה</small></div>
            <div class="ring-visits"></div>
          </div>
          <div class="ring-label"></div>
          <input type="range" min="0" max="${last}" step="1" value="0" aria-label="${cfg.hint}" data-no-swipe>
          <div class="hint">${cfg.hint}</div>
        </div>
      </div>`;

    const wrap = el.querySelector('.ring-w');
    const ringEl = el.querySelector('.ring');
    const gem = el.querySelector('.gem');
    const input = el.querySelector('input');
    const sz = el.querySelector('.sz');
    const label = el.querySelector('.ring-label');
    const visits = el.querySelector('.ring-visits');
    let celebrated = false;

    function update(v, animate = true) {
      const s = steps[v];
      const r = R_MAX - (R_MAX - R_MIN) * (v / last);
      gsap.to(ringEl, { attr: { r }, duration: animate ? 0.6 : 0, ease: 'back.out(2)' });
      gsap.to(gem, { attr: { cy: 100 - r }, duration: animate ? 0.6 : 0, ease: 'back.out(2)' });
      sz.textContent = s.size;
      label.textContent = s.label;
      visits.textContent = `ביקור ${v + 1} אצל הצורף`;
      input.style.setProperty('--p', `${(v / last) * 100}%`);
      const done = v === last;
      wrap.classList.toggle('done', done);
      if (done && !celebrated) {
        celebrated = true;
        gsap.fromTo(ringEl, { attr: { 'stroke-width': 14 } }, { attr: { 'stroke-width': 10 }, duration: 0.8 });
        const r2 = ringEl.getBoundingClientRect();
        ctx.burst({
          particleCount: 70,
          spread: 70,
          origin: { x: (r2.left + r2.width / 2) / innerWidth, y: (r2.top + r2.height / 2) / innerHeight },
        });
      }
    }

    input.addEventListener('input', () => update(+input.value));
    update(0, false);
  }

  // ------------------------------------------------------------ scratch card
  function scratch(el, cfg, ctx) {
    el.innerHTML = `
      <div class="scratch" data-no-swipe>
        <div class="scratch-under"><b>${cfg.title}</b><span>${cfg.text}</span></div>
        <canvas></canvas>
      </div>`;

    const box = el.querySelector('.scratch');
    const cv = box.querySelector('canvas');
    const g = cv.getContext('2d');
    let drawing = false;
    let last = null;
    let moves = 0;
    let done = false;

    function paint() {
      const r = box.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      cv.width = Math.round(r.width * dpr);
      cv.height = Math.round(r.height * dpr);
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.globalCompositeOperation = 'source-over';
      const grad = g.createLinearGradient(0, 0, r.width, r.height);
      grad.addColorStop(0, '#f6e3b8');
      grad.addColorStop(0.45, '#d9b46c');
      grad.addColorStop(1, '#a87b35');
      g.fillStyle = grad;
      g.fillRect(0, 0, r.width, r.height);
      // sparkle texture
      g.fillStyle = 'rgba(255,255,255,.35)';
      for (let i = 0; i < 160; i++) {
        g.fillRect(Math.random() * r.width, Math.random() * r.height, 1.4, 1.4);
      }
      g.fillStyle = 'rgba(40,26,8,.75)';
      g.font = '600 19px Heebo, sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.direction = 'rtl';
      g.fillText(cfg.cover, r.width / 2, r.height / 2);
      g.globalCompositeOperation = 'destination-out';
      g.lineCap = 'round';
      g.lineJoin = 'round';
      g.lineWidth = 46;
    }

    function pos(e) {
      const r = cv.getBoundingClientRect();
      return [e.clientX - r.left, e.clientY - r.top];
    }

    function stroke(p) {
      g.beginPath();
      g.moveTo(last[0], last[1]);
      g.lineTo(p[0], p[1]);
      g.stroke();
      last = p;
      if (++moves % 12 === 0) check();
    }

    function check() {
      if (done) return;
      const d = g.getImageData(0, 0, cv.width, cv.height).data;
      let clear = 0;
      let total = 0;
      for (let i = 3; i < d.length; i += 4 * 37) {
        total++;
        if (d[i] < 30) clear++;
      }
      if (clear / total > 0.45) reveal();
    }

    function reveal() {
      done = true;
      gsap.to(cv, { opacity: 0, duration: 0.6, onComplete: () => cv.remove() });
      gsap.from(box.querySelector('.scratch-under'), { scale: 0.9, duration: 0.6, ease: 'back.out(2)' });
      const r = box.getBoundingClientRect();
      ctx.burst({ particleCount: 90, origin: { x: (r.left + r.width / 2) / innerWidth, y: (r.top + r.height / 2) / innerHeight } });
    }

    cv.addEventListener('pointerdown', (e) => {
      drawing = true;
      cv.setPointerCapture(e.pointerId);
      last = pos(e);
      stroke([last[0] + 0.1, last[1] + 0.1]);
    });
    cv.addEventListener('pointermove', (e) => drawing && stroke(pos(e)));
    const end = () => {
      if (!drawing) return;
      drawing = false;
      check();
    };
    cv.addEventListener('pointerup', end);
    cv.addEventListener('pointercancel', end);

    // wait one frame so the card has its final size
    requestAnimationFrame(paint);
  }

  // ------------------------------------------------------------ versus scale
  function versus(el, cfg, ctx) {
    const [A, B] = cfg.sides; // A = right (first in RTL), B = left
    const card = (s, i) => `
      <button class="panel vs-card empty" data-side="${i}">
        <div class="vs-name">${s.name}</div>
        <div class="vs-who">${s.who}</div>
        <ul></ul>
        <div class="vs-tap">הקישי לטיעון ←</div>
      </button>`;

    el.innerHTML = `
      <div class="vs">
        <svg class="vs-scale" viewBox="0 0 300 70" aria-hidden="true">
          <path class="stand" d="M150 18 V66 M126 66 H174"/>
          <g class="beam-g"><line class="beam" x1="45" y1="18" x2="255" y2="18"/></g>
          <g class="pan pan-l"><line x1="45" y1="18" x2="30" y2="44"/><line x1="45" y1="18" x2="60" y2="44"/><path d="M24 44 H66 Q45 60 24 44 Z"/></g>
          <g class="pan pan-r"><line x1="255" y1="18" x2="240" y2="44"/><line x1="255" y1="18" x2="270" y2="44"/><path d="M234 44 H276 Q255 60 234 44 Z"/></g>
          <circle class="pivot" cx="150" cy="18" r="5"/>
        </svg>
        <div class="vs-row">${card(A, 0)}<div class="vs-mid">VS</div>${card(B, 1)}</div>
        <div class="vs-foot"><span class="hint">${cfg.hint}</span></div>
      </div>`;

    const cards = [...el.querySelectorAll('.vs-card')];
    const foot = el.querySelector('.vs-foot');
    const beam = el.querySelector('.beam-g');
    const panL = el.querySelector('.pan-l');
    const panR = el.querySelector('.pan-r');
    const shown = [0, 0];
    let finished = false;

    function tilt(deg) {
      const rad = (deg * Math.PI) / 180;
      const dy = 105 * Math.sin(rad);
      gsap.to(beam, { rotation: deg, svgOrigin: '150 18', duration: 0.9, ease: 'elastic.out(1, 0.5)' });
      gsap.to(panR, { y: dy, duration: 0.9, ease: 'elastic.out(1, 0.5)' });
      gsap.to(panL, { y: -dy, duration: 0.9, ease: 'elastic.out(1, 0.5)' });
    }

    function addArg(i, text, bonus = false) {
      const li = document.createElement('li');
      li.textContent = text;
      if (bonus) li.className = 'bonus';
      cards[i].querySelector('ul').appendChild(li);
      gsap.from(li, { opacity: 0, x: -12, duration: 0.4, ease: 'power2.out' });
    }

    cards.forEach((c, i) => {
      c.addEventListener('click', () => {
        if (finished) return;
        const side = cfg.sides[i];
        if (shown[i] >= side.args.length) return;
        addArg(i, side.args[shown[i]++]);
        if (shown[i] >= side.args.length) c.classList.add('empty');
        else c.classList.remove('empty');
        // SVG right pan = side A (index 0)
        tilt(clamp((shown[0] - shown[1]) * 6, -14, 14));
        if (shown[0] === A.args.length && shown[1] === B.args.length) showJudge();
      });
      c.classList.remove('empty');
    });

    function showJudge() {
      foot.innerHTML = `<button class="btn">${cfg.judge}</button>`;
      gsap.from(foot.firstChild, { scale: 0.8, opacity: 0, duration: 0.4, ease: 'back.out(2)' });
      foot.firstChild.addEventListener('click', () => {
        finished = true;
        addArg(1, cfg.bonus, true);
        tilt(-16);
        foot.innerHTML = `<div class="vs-final">${cfg.result}</div>`;
        gsap.from(foot.firstChild, { scale: 2.2, opacity: 0, rotation: -14, duration: 0.6, ease: 'back.out(1.6)', delay: 0.4 });
        setTimeout(() => ctx.burst({ particleCount: 110, origin: { x: 0.35, y: 0.7 } }), 600);
      });
    }
  }

  // --------------------------------------------------------------- countdown
  function countdown(el, cfg) {
    const target = new Date(cfg.target).getTime();
    const labels = ['ימים', 'שעות', 'דקות', 'שניות'];
    el.innerHTML = `
      <div class="cd-label">${cfg.label}</div>
      <div class="cd">${labels.map((l) => `<div class="panel cd-box"><b>00</b><small>${l}</small></div>`).join('')}</div>`;
    const nums = el.querySelectorAll('.cd-box b');

    function tick() {
      const s = Math.max(0, Math.floor((target - Date.now()) / 1000));
      const v = [Math.floor(s / 86400), Math.floor((s % 86400) / 3600), Math.floor((s % 3600) / 60), s % 60];
      v.forEach((n, i) => (nums[i].textContent = String(n).padStart(2, '0')));
    }
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }

  // -------------------------------------------------------------------- poll
  function poll(el, cfg, ctx) {
    el.innerHTML = `
      <div class="poll-q">${cfg.question}</div>
      <div class="poll">${cfg.options
        .map((o, i) => `<button class="panel poll-opt" data-i="${i}"><span class="poll-bar"></span><span class="poll-txt">${o}</span><span class="poll-pct"></span></button>`)
        .join('')}</div>
      <div class="poll-note hint"></div>`;

    const box = el.querySelector('.poll');
    const opts = [...el.querySelectorAll('.poll-opt')];
    const note = el.querySelector('.poll-note');
    let voted = false;

    opts.forEach((b, i) =>
      b.addEventListener('click', () => {
        if (voted) return;
        voted = true;
        box.classList.add('voted');
        b.classList.add('chosen');
        opts.forEach((o, j) => {
          const pct = cfg.results[j];
          const counter = { v: 0 };
          gsap.to(o.querySelector('.poll-bar'), { width: `${pct}%`, duration: 1.2, ease: 'power3.out', delay: 0.15 });
          gsap.to(counter, {
            v: pct,
            duration: 1.2,
            delay: 0.15,
            ease: 'power3.out',
            onUpdate: () => (o.querySelector('.poll-pct').textContent = `${Math.round(counter.v)}%`),
          });
        });
        note.textContent = i === cfg.winner ? cfg.noteWin : cfg.noteLose;
        gsap.from(note, { opacity: 0, y: 6, duration: 0.5, delay: 1 });
        if (i === cfg.winner) setTimeout(() => ctx.burst({ particleCount: 80, origin: { y: 0.75 } }), 900);
      })
    );
  }

  // -------------------------------------------------------------------- cake
  function cake(el, cfg, ctx) {
    const n = cfg.candles || 3;
    el.innerHTML = `
      <div class="cake-w">
        <div class="cake" data-no-swipe>
          <div class="candles">${Array.from({ length: n }, (_, i) => `<button class="candle" aria-label="כיבוי נר ${i + 1}"><span class="flame"></span><span class="smoke"></span></button>`).join('')}</div>
          <div class="tier top"></div>
          <div class="tier bottom"></div>
          <div class="plate"></div>
        </div>
        <div class="cake-msg hint">${cfg.hint}</div>
        <button class="btn btn-sm mic">${cfg.mic}</button>
      </div>`;

    const candles = [...el.querySelectorAll('.candle')];
    const msg = el.querySelector('.cake-msg');
    const micBtn = el.querySelector('.mic');
    let left = n;
    let stream = null;
    let audio = null;
    let raf = 0;

    function blow(c) {
      if (!c || c.classList.contains('out')) return;
      c.classList.add('out');
      if (--left === 0) finish();
    }

    function finish() {
      stopMic();
      micBtn.remove();
      msg.className = 'wish gold-text';
      msg.textContent = cfg.wish;
      gsap.from(msg, { scale: 0.5, opacity: 0, duration: 0.8, ease: 'back.out(2)' });
      ctx.celebrate();
    }

    candles.forEach((c) => c.addEventListener('click', () => blow(c)));

    async function startMic() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch {
        micBtn.textContent = 'אין גישה למיקרופון, אפשר להקיש על הנרות';
        micBtn.disabled = true;
        return;
      }
      audio = new (window.AudioContext || window.webkitAudioContext)();
      const an = audio.createAnalyser();
      an.fftSize = 512;
      audio.createMediaStreamSource(stream).connect(an);
      const buf = new Uint8Array(an.fftSize);
      let lastBlow = 0;
      micBtn.textContent = 'נשפי חזק 🌬️';
      micBtn.disabled = true;
      const loop = (t) => {
        an.getByteTimeDomainData(buf);
        let sum = 0;
        for (const v of buf) sum += ((v - 128) / 128) ** 2;
        const rms = Math.sqrt(sum / buf.length);
        if (rms > 0.16 && t - lastBlow > 220) {
          lastBlow = t;
          blow(candles.find((c) => !c.classList.contains('out')));
        }
        if (left > 0) raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    }

    function stopMic() {
      cancelAnimationFrame(raf);
      if (stream) stream.getTracks().forEach((t) => t.stop());
      if (audio) audio.close().catch(() => {});
      stream = audio = null;
    }

    if (navigator.mediaDevices?.getUserMedia) micBtn.addEventListener('click', startMic);
    else micBtn.remove();

    return stopMic;
  }

  // ----------------------------------------------------------------- roadmap
  function roadmap(el, cfg, ctx) {
    el.innerHTML = `
      <div class="road">${cfg.steps
        .map(
          (s, i) =>
            `${i ? '<span class="road-line"></span>' : ''}<div class="road-node"><div class="road-dot">${s.emoji}</div><div class="road-label">${s.label}</div></div>`
        )
        .join('')}</div>
      <div class="road-end gold-text">${cfg.end}</div>`;

    const parts = [...el.querySelector('.road').children];
    const end = el.querySelector('.road-end');
    gsap.set(parts.filter((p) => p.classList.contains('road-node')), { opacity: 0, scale: 0.4 });
    gsap.set(parts.filter((p) => p.classList.contains('road-line')), { scaleX: 0 });
    gsap.set(end, { opacity: 0, y: 10 });

    const tl = gsap.timeline({ delay: 0.9 });
    parts.forEach((p) => {
      if (p.classList.contains('road-line')) tl.to(p, { scaleX: 1, duration: 0.6, ease: 'power2.inOut' });
      else tl.to(p, { opacity: 1, scale: 1, duration: 0.5, ease: 'back.out(2.2)' });
    });
    tl.to(end, { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out' }, '+=0.3');
    tl.call(() => ctx.burst({ particleCount: 60, spread: 100, origin: { y: 0.8 } }));
    return () => tl.kill();
  }

  window.Widgets = { ring, scratch, versus, countdown, poll, cake, roadmap };
})();

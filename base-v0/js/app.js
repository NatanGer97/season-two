(() => {
  const S = window.SCENES;
  const C = window.CONFIG;
  const MONTHS = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
  const GOLD = ['#d9b46c', '#f3dcaa', '#e7aaa2', '#ffffff', '#b8893f'];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const $ = (s) => document.querySelector(s);
  const stage = $('#stage');
  const strip = $('#strip');
  const track = $('#strip-track');
  const grid = $('#cal-grid');
  const autoBtn = $('#auto');

  let idx = -1;
  let busy = false;
  let cleanup = null;
  let introOpen = true;
  let curDate = parseDate(S[0].date);

  function parseDate(s) {
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, m - 1, d || 1);
  }

  // ---------------------------------------------------------------- confetti
  const ctx = {
    burst(opts = {}) {
      if (!window.confetti) return;
      confetti({ particleCount: 100, spread: 75, startVelocity: 38, origin: { y: 0.6 }, colors: GOLD, scalar: 0.9, zIndex: 100, ...opts });
    },
    celebrate() {
      if (!window.confetti) return;
      const end = Date.now() + 3200;
      (function frame() {
        confetti({ particleCount: 4, angle: 60, spread: 60, origin: { x: 0, y: 0.75 }, colors: GOLD, zIndex: 100 });
        confetti({ particleCount: 4, angle: 120, spread: 60, origin: { x: 1, y: 0.75 }, colors: GOLD, zIndex: 100 });
        if (Date.now() < end) requestAnimationFrame(frame);
      })();
      setTimeout(() => ctx.burst({ particleCount: 180, spread: 120, origin: { y: 0.45 } }), 400);
    },
  };

  // ---------------------------------------------------------------- calendar
  let calKey = '';
  function setDate(d) {
    $('#d-day').textContent = d.getDate();
    $('#d-month').textContent = MONTHS[d.getMonth()];
    $('#d-year').textContent = d.getFullYear();
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (key !== calKey) {
      calKey = key;
      renderGrid(d);
    }
    grid.querySelector('.today')?.classList.remove('today');
    grid.querySelector(`[data-d="${d.getDate()}"]`)?.classList.add('today');
  }

  function renderGrid(d) {
    $('#cal-month').textContent = MONTHS[d.getMonth()];
    $('#cal-year').textContent = d.getFullYear();
    const first = new Date(d.getFullYear(), d.getMonth(), 1).getDay();
    const n = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    let html = '<i></i>'.repeat(first);
    for (let i = 1; i <= n; i++) html += `<b data-d="${i}">${i}</b>`;
    grid.innerHTML = html;
  }

  function fastForward(to, dur) {
    const a = curDate.getTime();
    const b = to.getTime();
    if (a === b || dur < 0.05) {
      curDate = new Date(b);
      setDate(curDate);
      return Promise.resolve();
    }
    const p = { t: 0 };
    document.body.classList.add('ff');
    return gsap
      .to(p, {
        t: 1,
        duration: dur,
        ease: 'power2.inOut',
        onUpdate() {
          setDate(new Date(a + (b - a) * p.t));
        },
        onComplete() {
          curDate = new Date(b);
          setDate(curDate);
          document.body.classList.remove('ff');
        },
      })
      .then();
  }

  // -------------------------------------------------------------- film strip
  function buildStrip() {
    let html = '';
    S.forEach((s, i) => {
      if (i > 0) {
        const a = parseDate(S[i - 1].date).getTime();
        const b = parseDate(s.date).getTime();
        for (let k = 1; k <= 2; k++) {
          const d = new Date(a + ((b - a) * k) / 3);
          html += `<div class="frame fill">${d.getDate()}.${d.getMonth() + 1}</div>`;
        }
      }
      const d = parseDate(s.date);
      html += `<button class="frame key" data-i="${i}" aria-label="${s.title}"><span class="f-emoji">${s.emoji || '✨'}</span><span class="f-date">${d.getDate()}.${d.getMonth() + 1}</span></button>`;
    });
    track.innerHTML = html;
    track.querySelectorAll('.frame.key').forEach((f) => f.addEventListener('click', () => goTo(+f.dataset.i)));
  }

  function stripX(i) {
    const f = track.querySelector(`[data-i="${i}"]`);
    return strip.clientWidth / 2 - (f.offsetLeft + f.offsetWidth / 2);
  }

  function moveStrip(i, dur) {
    track.querySelectorAll('.frame.key').forEach((f) => {
      const n = +f.dataset.i;
      f.classList.toggle('active', n === i);
      f.classList.toggle('seen', n < i);
    });
    if (dur < 0.05) {
      gsap.set(track, { x: stripX(i) });
      return Promise.resolve();
    }
    gsap.fromTo(track, { filter: 'blur(0px)' }, { filter: 'blur(2.5px)', duration: dur / 2, yoyo: true, repeat: 1, ease: 'power1.in' });
    return gsap.to(track, { x: stripX(i), duration: dur, ease: 'power2.inOut' }).then();
  }

  // ------------------------------------------------------------------ scenes
  function sceneHTML(s) {
    const text = Array.isArray(s.text) ? s.text : s.text ? [s.text] : [];
    return `
      <article class="scene">
        <div class="media" data-anim>
          <div class="media-fallback"><span>${s.emoji || '✨'}</span></div>
          ${s.image ? `<img src="${s.image}" alt="" onerror="this.remove()">` : ''}
          <div class="media-frame"></div>
        </div>
        <div class="content">
          <div class="eyebrow" data-anim>${s.chapter} · ${s.dateLabel || ''}</div>
          <h2 data-anim>${s.title}</h2>
          ${text.map((p) => `<p data-anim>${p}</p>`).join('')}
          ${s.widget ? '<div class="widget" data-anim></div>' : ''}
        </div>
      </article>`;
  }

  function render(i) {
    const s = S[i];
    stage.innerHTML = sceneHTML(s);
    stage.scrollTop = 0;
    const w = s.widget && window.Widgets[s.widget.type];
    if (w) cleanup = w(stage.querySelector('.widget'), s.widget, ctx) || null;
  }

  function animateIn() {
    if (reduce) return Promise.resolve();
    const items = stage.querySelectorAll('[data-anim]');
    const media = stage.querySelector('.media');
    gsap.from(media, { scale: 1.06, duration: 1.2, ease: 'power3.out', clearProps: 'transform' });
    return gsap
      .from(items, { y: 28, opacity: 0, filter: 'blur(8px)', duration: 0.8, stagger: 0.08, ease: 'power3.out', clearProps: 'filter,transform,opacity' })
      .then();
  }

  function animateOut() {
    if (reduce) return Promise.resolve();
    const items = stage.querySelectorAll('[data-anim]');
    if (!items.length) return Promise.resolve();
    return gsap.to(items, { y: -18, opacity: 0, filter: 'blur(6px)', duration: 0.35, stagger: 0.03, ease: 'power2.in' }).then();
  }

  function travelTime(from, to) {
    if (reduce) return 0;
    const days = Math.abs(to - from) / 864e5;
    return Math.min(2.4, 1 + days / 220);
  }

  async function goTo(i) {
    if (busy || i < 0 || i >= S.length || i === idx) return;
    busy = true;
    clearAuto();
    $('#hint').classList.add('gone');

    if (idx >= 0) await animateOut();
    if (cleanup) {
      try { cleanup(); } catch {}
      cleanup = null;
    }
    stage.innerHTML = '';

    const to = parseDate(S[i].date);
    const dur = idx < 0 ? 0.6 : travelTime(curDate, to);
    await Promise.all([fastForward(to, dur), moveStrip(i, dur)]);

    idx = i;
    render(i);
    updateControls();
    await animateIn();
    busy = false;
    scheduleAuto();
  }

  const go = (d) => goTo(idx + d);

  function updateControls() {
    $('#count').textContent = `${idx + 1} / ${S.length}`;
    $('#prev').disabled = idx <= 0;
    $('#next').disabled = idx >= S.length - 1;
    if (idx === 0) $('#hint').classList.remove('gone');
  }

  // -------------------------------------------------------------- auto play
  let auto = false;
  let autoT = null;
  let autoTween = null;

  function clearAuto() {
    clearTimeout(autoT);
    autoTween?.kill();
    gsap.set('#auto-bar', { scaleX: 0 });
  }

  function scheduleAuto() {
    clearAuto();
    if (!auto) return;
    if (idx >= S.length - 1) return setAuto(false);
    const hold = S[idx].hold || C.autoHold;
    autoTween = gsap.fromTo('#auto-bar', { scaleX: 0 }, { scaleX: 1, duration: hold / 1000, ease: 'none' });
    autoT = setTimeout(() => go(1), hold);
  }

  function setAuto(on) {
    auto = on;
    autoBtn.classList.toggle('on', on);
    autoBtn.setAttribute('aria-label', on ? 'עצירת ניגון אוטומטי' : 'ניגון אוטומטי');
    if (on && !busy) scheduleAuto();
    if (!on) clearAuto();
  }

  autoBtn.addEventListener('click', () => setAuto(!auto));
  // Any interaction with a scene restarts its timer, so she is never cut off mid-play
  stage.addEventListener('pointerdown', () => auto && !busy && scheduleAuto());

  // -------------------------------------------------------------- navigation
  function canScroll(dir) {
    if (stage.scrollHeight <= stage.clientHeight + 2) return false;
    return dir > 0 ? stage.scrollTop + stage.clientHeight < stage.scrollHeight - 2 : stage.scrollTop > 2;
  }

  let wheelAcc = 0;
  let wheelLocked = false;
  let wheelQuiet = null;
  addEventListener(
    'wheel',
    (e) => {
      if (introOpen) return;
      const delta = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : -e.deltaX;
      if (canScroll(Math.sign(delta))) return;
      e.preventDefault();
      // trackpads keep firing inertial events; wait for a short silence before allowing the next step
      clearTimeout(wheelQuiet);
      wheelQuiet = setTimeout(() => {
        wheelLocked = false;
        wheelAcc = 0;
      }, 180);
      if (busy || wheelLocked) return;
      wheelAcc += delta;
      if (Math.abs(wheelAcc) > 40) {
        wheelLocked = true;
        go(wheelAcc > 0 ? 1 : -1);
        wheelAcc = 0;
      }
    },
    { passive: false }
  );

  let touch = null;
  addEventListener(
    'touchstart',
    (e) => {
      if (introOpen || e.touches.length > 1) return (touch = null);
      if (e.target.closest('[data-no-swipe], input, canvas')) return (touch = null);
      const t = e.touches[0];
      touch = { x: t.clientX, y: t.clientY, atTop: !canScroll(-1), atBottom: !canScroll(1) };
    },
    { passive: true }
  );
  addEventListener('touchend', (e) => {
    if (!touch) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touch.x;
    const dy = touch.y - t.clientY;
    if (Math.abs(dy) > Math.abs(dx)) {
      if (dy > 50 && touch.atBottom) go(1);
      else if (dy < -50 && touch.atTop) go(-1);
    } else if (Math.abs(dx) > 60) {
      go(dx > 0 ? 1 : -1); // RTL: drag the page to the right for the next one
    }
    touch = null;
  });

  addEventListener('keydown', (e) => {
    if (e.target.matches('input, textarea')) return;
    if (introOpen) {
      if (e.key === 'Enter' || e.key === ' ') startShow();
      return;
    }
    if (['ArrowDown', 'PageDown', ' ', 'ArrowLeft'].includes(e.key)) {
      e.preventDefault();
      go(1);
    } else if (['ArrowUp', 'PageUp', 'ArrowRight'].includes(e.key)) {
      e.preventDefault();
      go(-1);
    }
  });

  $('#prev').addEventListener('click', () => go(-1));
  $('#next').addEventListener('click', () => go(1));
  addEventListener('resize', () => idx >= 0 && gsap.set(track, { x: stripX(idx) }));

  // ------------------------------------------------------------------- intro
  const intro = $('#intro');
  let introTl = null;

  function buildIntro() {
    const inner = intro.querySelector('.intro-inner');
    inner.innerHTML = `
      ${C.intro.map((l) => `<p class="intro-line ${l.cls}"><span>${l.text}</span></p>`).join('')}
      <div class="intro-title"><small>${C.introTitle.small}</small><h1>${C.introTitle.big}</h1></div>
      <button id="start" class="btn btn-primary">${C.introButton}</button>`;
    inner.querySelector('#start').addEventListener('click', (e) => {
      e.stopPropagation();
      startShow();
    });

    const lines = [...inner.querySelectorAll('.intro-line')];
    const title = inner.querySelector('.intro-title');
    const btn = inner.querySelector('#start');
    // stack everything in one grid cell so lines replace each other in place
    [...lines, title].forEach((n) => (n.style.gridArea = '1 / 1'));
    btn.style.gridArea = '2 / 1';

    introTl = gsap.timeline({ delay: 0.6 });
    lines.forEach((l, i) => {
      introTl.fromTo(l, { opacity: 0, y: 14, filter: 'blur(10px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 1.2, ease: 'power3.out' });
      introTl.to(l, { opacity: 0, y: -10, filter: 'blur(8px)', duration: 0.7, ease: 'power2.in' }, `+=${i === lines.length - 1 ? 1.6 : 1}`);
    });
    introTl.fromTo(title, { opacity: 0, scale: 0.92, letterSpacing: '0.2em' }, { opacity: 1, scale: 1, letterSpacing: '0em', duration: 1.6, ease: 'power3.out' });
    introTl.fromTo(btn, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out' }, '-=0.6');
    introTl.to('.intro-skip', { opacity: 0, duration: 0.4 }, '<');

    // click anywhere fast-forwards the opening
    intro.addEventListener('click', () => introTl.progress() < 1 && introTl.progress(1));
  }

  function startShow() {
    if (!introOpen) return;
    introOpen = false;
    introTl?.progress(1);
    document.body.classList.add('started');
    gsap.to(intro, { opacity: 0, duration: 1, ease: 'power2.inOut', onComplete: () => intro.remove() });
    goTo(0);
  }

  // -------------------------------------------------------------------- boot
  setDate(curDate);
  buildStrip();
  buildIntro();

  // dev shortcut: index.html#3 skips the opening and jumps to scene 3
  const jump = parseInt(location.hash.slice(1), 10);
  if (!Number.isNaN(jump)) {
    introOpen = false;
    intro.remove();
    document.body.classList.add('started');
    curDate = parseDate(S[Math.max(0, Math.min(S.length - 1, jump))].date);
    goTo(Math.max(0, Math.min(S.length - 1, jump)));
  }
})();

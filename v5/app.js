// =====================================================================
//  E2E mockup flow: intro, calendar run, scene steps, ending.
//  Motion follows DESIGN.md §8: transform / opacity / clip-path only.
// =====================================================================

(() => {
  const S = window.SCENES;
  const MONTHS = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
  const TIMELINE = [[3, 'אפר׳'], [4, 'מאי'], [5, 'יוני'], [6, 'יולי'], [7, 'אוג׳'], [8, 'ספט׳'], [9, 'אוק׳']];
  const HOLIDAYS = { '2026-5-22': 'שבועות', '2026-9-12': 'ראש השנה', '2026-9-21': 'יום כיפור', '2026-9-26': 'סוכות' };
  const EASE_OUT = 'cubic-bezier(0.23, 1, 0.32, 1)';
  const EASE_IN_OUT = 'cubic-bezier(0.77, 0, 0.175, 1)';
  const EASE_DRAWER = 'cubic-bezier(0.32, 0.72, 0, 1)';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const $ = (s, r = document) => r.querySelector(s);
  const app = $('#app');
  const stage = $('#stage');
  const grid = $('#cal-grid');
  const ring = $('#cal-ring');
  const hint = $('#hint');

  const parse = (s) => {
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, m - 1, d);
  };
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const anim = (el, frames, opts) => (reduce && !opts.always ? Promise.resolve() : el.animate(frames, { fill: 'both', ...opts }).finished);

  let idx = -1;
  let step = 0;
  let busy = true;
  let cleanup = null;
  let autoNext = null;
  let cur = parse(S[0].date);
  let monthKey = '';

  // -------------------------------------------------------------- calendar
  // Calendar swatch: the episode's accent color and chapter number
  function swatch(s) {
    const [a, b] = s.placeholder.tones;
    return { c: `linear-gradient(160deg, ${a}, ${b})`, n: s.chapter.replace(/\D/g, '') };
  }

  // Event thumbnails: scenes already seen, keyed by date
  const seen = new Map();

  function renderMonth(d, dir = 0) {
    const y = d.getFullYear();
    const m = d.getMonth();
    $('#cal-month').textContent = MONTHS[m];
    $('#cal-year').textContent = y;
    const first = new Date(y, m, 1).getDay();
    const n = new Date(y, m + 1, 0).getDate();
    const prevN = new Date(y, m, 0).getDate();
    let html = '';
    for (let i = first - 1; i >= 0; i--) html += `<span class="day out">${prevN - i}</span>`;
    for (let i = 1; i <= n; i++) {
      const dow = (first + i - 1) % 7;
      const key = `${y}-${m + 1}-${i}`;
      const ev = seen.get(key);
      const hol = HOLIDAYS[key];
      html += `<span class="day${dow === 6 || hol ? ' sat' : ''}${ev ? ' event' : ''}" data-d="${i}">${
        ev ? `<i class="thumb" style="--sw:${ev.c}"><b>${ev.n}</b></i>` : ''
      }<span>${i}</span>${hol ? `<small>${hol}</small>` : ''}</span>`;
    }
    const tail = (7 - ((first + n) % 7)) % 7;
    for (let i = 1; i <= tail; i++) html += `<span class="day out">${i}</span>`;
    grid.innerHTML = html;
    $('#timeline').innerHTML = TIMELINE.map(([t, name]) => `<span class="${t === m ? 'now' : ''}">${name}</span>`).join('');
    if (dir && !reduce) {
      anim(grid, [{ opacity: 0, transform: `translateY(${dir * 18}px)` }, { opacity: 1, transform: 'none' }], { duration: 420, easing: EASE_OUT });
      anim($('#cal-month'), [{ opacity: 0, transform: `translateY(${dir * 10}px)` }, { opacity: 1, transform: 'none' }], { duration: 420, easing: EASE_OUT });
    }
  }

  function cell(day) {
    return grid.querySelector(`[data-d="${day}"]`);
  }

  function placeRing(d) {
    const c = cell(d.getDate());
    if (!c) return;
    grid.querySelector('.day.on')?.classList.remove('on');
    if (!c.classList.contains('event')) c.classList.add('on');
    ring.style.transform = `translate(${c.offsetLeft + c.offsetWidth / 2 - grid.offsetWidth}px, ${c.offsetTop + c.offsetHeight / 2}px)`;
  }

  function setDate(d, dir = 0) {
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (key !== monthKey) {
      monthKey = key;
      renderMonth(d, dir);
      flashBetween(d);
    }
    placeRing(d);
  }

  // In-between photos: 1 random cell per month flashes during the run
  let runRange = null;
  function flashBetween(d) {
    if (!runRange || reduce) return;
    const n = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    const days = [];
    for (let i = 1; i <= n; i++) {
      const t = new Date(d.getFullYear(), d.getMonth(), i).getTime();
      if (t > runRange[0] && t < runRange[1]) days.push(i);
    }
    if (!days.length) return;
    const c = cell(days[Math.floor(Math.random() * days.length)]);
    if (!c || c.classList.contains('event')) return;
    const t = document.createElement('i');
    t.className = 'thumb flash';
    t.style.setProperty('--sw', 'linear-gradient(160deg, #6B5A50, #2E2622)');
    c.prepend(t);
    t.addEventListener('animationend', () => t.remove());
  }

  // Ring glides day to day: fast at start, slow near the target (ease-out)
  function run(to, ms = 2600) {
    const a = cur.getTime();
    const b = to.getTime();
    if (a === b || reduce) {
      cur = new Date(b);
      setDate(cur);
      return Promise.resolve();
    }
    const dir = b > a ? 1 : -1;
    runRange = [Math.min(a, b), Math.max(a, b)];
    const t0 = performance.now();
    return new Promise((res) => {
      const frame = (now) => {
        const p = Math.min(1, (now - t0) / ms);
        const e = 1 - Math.pow(1 - p, 4);
        const d = new Date(a + (b - a) * e);
        d.setHours(0, 0, 0, 0);
        setDate(d, dir);
        if (p < 1) requestAnimationFrame(frame);
        else {
          cur = new Date(b);
          setDate(cur);
          runRange = null;
          res();
        }
      };
      requestAnimationFrame(frame);
    });
  }

  // ---------------------------------------------------------------- scenes
  const isDated = (s) => !s.kind;
  const stepsOf = (s) => (s.widget ? 3 : 2);

  // Photo placeholder: two flat tones, replaced by the real file when present
  const ph = (s) =>
    `<div class="ph" style="--a:${s.placeholder.tones[0]};--b:${s.placeholder.tones[1]}"><span class="photo-label">placeholder · ${s.placeholder.label}</span><img src="${s.photo}" alt="" onload="this.parentNode.classList.add('real')" onerror="this.remove()" /></div>`;

  const art = (s) => ph(s);

  function sceneEl(s) {
    const el = document.createElement('article');
    el.className = 'scene';
    el.dataset.step = '0';
    el.dataset.genre = s.genre || '';
    el.innerHTML = `
      <div class="poster">${art(s)}</div>
      <div class="panel">
        <p class="eyebrow label"><span class="chap">${s.chapter}</span><span>${s.dateLabel}</span></p>
        <h2 class="title">${s.title}</h2>
        <div class="part story">
          ${s.story.map((p) => `<p>${p}</p>`).join('')}
          ${s.hand ? `<p class="hand">${s.hand}</p>` : ''}
        </div>
        ${s.widget ? '<div class="part widget"></div>' : ''}
        <div class="steps">${Array.from({ length: stepsOf(s) }, () => '<span></span>').join('')}</div>
      </div>`;
    return el;
  }

  function cellRect(day) {
    const c = cell(day);
    const a = app.getBoundingClientRect();
    const r = c.getBoundingClientRect();
    return { top: r.top - a.top + 6, left: r.left - a.left + 6, right: a.right - r.right + 6, bottom: a.bottom - r.bottom + 6 };
  }
  const clip = (r) => `inset(${r.top}px ${r.right}px ${r.bottom}px ${r.left}px round 10px)`;

  // Photo grows out of its calendar cell, sheet rises after it
  async function openScene(i) {
    const s = S[i];
    const el = sceneEl(s);
    stage.append(el);
    setStepUI(el, 0);
    app.style.setProperty('--tint', s.tint || '#3A2330');
    const photo = $('.poster', el);
    const sheet = $('.panel', el);
    if (reduce) {
      await anim(el, [{ opacity: 0 }, { opacity: 1 }], { duration: 200, easing: EASE_OUT, always: true });
      return;
    }
    const from = clip(cellRect(cur.getDate()));
    sheet.style.transform = 'translateY(110%)';
    await anim(photo, [{ clipPath: from }, { clipPath: 'inset(0px 0px 0px 0px round 0px)' }], { duration: 1000, easing: EASE_IN_OUT });
    $('.ph', photo)?.animate([{ transform: 'scale(1.05)' }, { transform: 'scale(1)' }], { duration: 9000, easing: EASE_OUT, fill: 'both' });
    sheet.style.transform = '';
    await anim(sheet, [{ transform: 'translateY(110%)' }, { transform: 'none' }], { duration: 950, easing: EASE_DRAWER });
    staggerIn([...el.querySelectorAll('.eyebrow, .title')]);
    el.classList.add('in');
  }

  // Sheet drops, photo shrinks back into its cell, then leaves a thumbnail
  async function closeScene(i) {
    const el = $('.scene', stage);
    if (!el) return;
    const s = S[i];
    const key = `${parse(s.date).getFullYear()}-${parse(s.date).getMonth() + 1}-${parse(s.date).getDate()}`;
    seen.set(key, swatch(s));
    if (!reduce) {
      app.style.setProperty('--tint', '#2C1F26');
      await anim($('.panel', el), [{ transform: 'none' }, { transform: 'translateY(110%)' }], { duration: 520, easing: EASE_OUT });
      monthKey = '';
      setDate(cur);
      await anim($('.poster', el), [{ clipPath: 'inset(0px 0px 0px 0px round 0px)' }, { clipPath: clip(cellRect(cur.getDate())) }], { duration: 800, easing: EASE_IN_OUT });
    }
    el.remove();
    monthKey = '';
    setDate(cur);
  }

  function staggerIn(nodes) {
    if (reduce) return;
    nodes.forEach((n, k) =>
      n.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], {
        duration: 800,
        delay: 150 + k * 140,
        easing: EASE_OUT,
        fill: 'backwards',
      })
    );
  }

  function setStepUI(el, n) {
    el.querySelectorAll('.steps span').forEach((sp, k) => sp.classList.toggle('on', k === n));
  }

  // FLIP: sheet top moves when content changes; animate transform, not height
  async function setStep(n) {
    const el = $('.scene', stage);
    const s = S[idx];
    const sheet = $('.panel', el);
    const before = sheet.getBoundingClientRect().top;
    el.dataset.step = n;
    setStepUI(el, n);
    if (n === 2 && s.widget) mountWidget(el, s);
    if (n !== 2 && cleanup) {
      cleanup();
      cleanup = null;
    }
    const after = sheet.getBoundingClientRect().top;
    if (!reduce) {
      await anim(sheet, [{ transform: `translateY(${before - after}px)` }, { transform: 'none' }], { duration: 900, easing: EASE_DRAWER });
      staggerIn([...el.querySelectorAll(n === 1 ? '.story > *' : '.widget > *')]);
    }
    step = n;
    showHint(n === 2 ? '' : 'גללי להמשך');
  }

  function mountWidget(el, s) {
    const w = $('.widget', el);
    if (w.childElementCount) return;
    const ctx = {
      done(after = 4600) {
        clearTimeout(autoNext);
        showHint('גללי להמשך');
        autoNext = setTimeout(() => next(), after);
      },
      stamp: stampIn,
      sparkle,
      confetti,
    };
    const fn = window.Widgets[s.widget.type];
    cleanup = fn(w, s.widget, ctx) || null;
  }

  // ----------------------------------------------------------- stamp, sparks
  function stampIn(parent, text, pos) {
    const st = document.createElement('div');
    st.className = 'stamp';
    st.textContent = text;
    Object.assign(st.style, pos);
    parent.append(st);
    const tilt = -8 + Math.random() * 6;
    st.style.transform = `rotate(${tilt}deg)`;
    if (!reduce) {
      st.animate([{ opacity: 0, transform: `scale(1.12) rotate(${tilt}deg)` }, { opacity: 1, transform: `scale(1) rotate(${tilt}deg)` }], {
        duration: 700,
        easing: EASE_OUT,
        fill: 'both',
      });
    }
  }

  function sparkle(target, n = 14) {
    if (reduce || !target) return;
    const a = app.getBoundingClientRect();
    const r = target.getBoundingClientRect();
    for (let i = 0; i < n; i++) {
      const sp = document.createElement('i');
      sp.className = 'spark';
      sp.style.left = `${r.left - a.left + Math.random() * r.width}px`;
      sp.style.top = `${r.top - a.top + r.height * (0.3 + Math.random() * 0.6)}px`;
      app.append(sp);
      const rise = 40 + Math.random() * 60;
      sp.animate(
        [
          { opacity: 0, transform: 'translateY(0) scale(0.6)' },
          { opacity: 1, transform: `translateY(${-rise * 0.3}px) scale(1)`, offset: 0.25 },
          { opacity: 0, transform: `translateY(${-rise}px) scale(0.8)` },
        ],
        { duration: 2400 + Math.random() * 1200, delay: Math.random() * 600, easing: EASE_OUT, fill: 'both' }
      ).finished.then(() => sp.remove());
    }
  }

  // Confetti: birthday genre only. Paper pieces fall, not gold dots.
  function confetti(target, n = 40) {
    if (reduce || !target) return;
    const colors = ['#D9B98A', '#F6F1EA', '#8C6A32', '#D39A8E', '#EDE6DC'];
    const a = app.getBoundingClientRect();
    const r = target.getBoundingClientRect();
    for (let i = 0; i < n; i++) {
      const c = document.createElement('i');
      c.className = 'piece';
      c.style.background = colors[i % colors.length];
      c.style.left = `${r.left - a.left + Math.random() * r.width}px`;
      c.style.top = `${r.top - a.top + r.height * 0.4}px`;
      app.append(c);
      const dx = (Math.random() - 0.5) * 220;
      const dy = -80 - Math.random() * 160;
      const rot = (Math.random() - 0.5) * 720;
      c.animate(
        [
          { opacity: 1, transform: 'translate(0,0) rotate(0deg)' },
          { opacity: 1, transform: `translate(${dx * 0.6}px, ${dy}px) rotate(${rot * 0.5}deg)`, offset: 0.35 },
          { opacity: 0, transform: `translate(${dx}px, ${-dy * 0.4 + 160}px) rotate(${rot}deg)` },
        ],
        { duration: 2800 + Math.random() * 1400, delay: Math.random() * 400, easing: EASE_OUT, fill: 'both' }
      ).finished.then(() => c.remove());
    }
  }

  // --------------------------------------------------------- ending panels
  function panelEl(s) {
    const el = document.createElement('article');
    el.className = `end ${s.kind}`;
    if (s.kind === 'roadmap') {
      el.innerHTML = `
        <p class="label" style="color:var(--gold)">${s.chapter}</p>
        <h2 class="title">${s.title}</h2>
        <ol class="road">${s.steps.map((t, k) => `<li class="${k === 0 ? 'now' : ''}"><i class="still" style="--t:${t.tone}"></i><b>${t.label}</b><span class="label">${t.state}</span></li>`).join('')}</ol>
        <p class="title road-end">${s.end}</p>`;
    } else if (s.kind === 'credits') {
      el.innerHTML = `
        <button class="btn skip" type="button">דלגי</button>
        <dl class="roll">${s.lines.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}<div><dd style="color:var(--gold)">סוף עונה 2</dd></div></dl>`;
    } else {
      el.innerHTML = `
        <p class="label">רגע, יש עוד משהו</p>
        <div class="env" data-nogesture>
          <div class="env-back"></div>
          <div class="card"><h3>${s.gift.name}</h3><p>${s.gift.line}</p><a class="btn" href="${s.gift.href}" style="display:inline-grid;place-content:center;text-decoration:none">${s.gift.cta}</a></div>
          <div class="env-front"></div>
          <div class="env-flap"></div>
          <span class="env-seal"></span>
        </div>
        <p class="label gift-tap">הקישי לפתיחה</p>
        <button class="btn again" type="button">לצפות שוב</button>`;
    }
    return el;
  }

  async function openPanel(i) {
    const s = S[i];
    const el = panelEl(s);
    stage.append(el);
    app.style.setProperty('--tint', s.tint || '#2C1F26');
    await anim(el, [{ opacity: 0 }, { opacity: 1 }], { duration: 900, easing: EASE_OUT, always: true });

    if (s.kind === 'roadmap') {
      staggerIn([...el.querySelectorAll('.road li, .road-end')]);
      showHint('גללי להמשך');
    }
    if (s.kind === 'credits') {
      const roll = $('.roll', el);
      const dist = roll.scrollHeight + 80;
      const a = roll.animate([{ transform: 'translateY(0)' }, { transform: `translateY(${-dist}px)` }], {
        duration: reduce ? 1 : 22000,
        easing: 'linear',
        fill: 'both',
      });
      $('.skip', el).addEventListener('click', () => a.finish());
      a.finished.then(() => idx === i && next());
    }
    if (s.kind === 'gift') {
      const env = $('.env', el);
      env.addEventListener('click', () => {
        if (env.classList.contains('open')) return;
        env.classList.add('open');
        $('.gift-tap', el).style.opacity = 0;
        setTimeout(() => {
          sparkle($('.card', el), 22);
          $('.again', el).classList.add('on');
        }, 1600);
      });
      $('.again', el).addEventListener('click', () => location.reload());
    }
  }

  async function closePanel() {
    const el = $('.end', stage);
    if (!el) return;
    await anim(el, [{ opacity: 1 }, { opacity: 0 }], { duration: 600, easing: EASE_OUT, always: true });
    el.remove();
  }

  // ------------------------------------------------------------ navigation
  async function goScene(i, dir) {
    if (i < 0 || i >= S.length) return;
    busy = true;
    clearTimeout(autoNext);
    showHint('');
    if (cleanup) {
      cleanup();
      cleanup = null;
    }
    const from = S[idx];
    const to = S[i];

    if (from && isDated(from)) await closeScene(idx);
    else await closePanel();

    if (isDated(to)) {
      $('#cal-note').textContent = '';
      await run(parse(to.date));
      ring.classList.add('on');
      idx = i;
      await openScene(i);
      if (dir < 0) {
        // Back from the next scene lands on this scene's last step
        for (let n = 1; n < stepsOf(to); n++) await setStep(n);
      } else {
        step = 0;
        showHint('גללי להמשך');
      }
    } else {
      idx = i;
      step = 0;
      await openPanel(i);
    }
    busy = false;
  }

  async function next() {
    if (busy) return;
    const s = S[idx];
    if (s && isDated(s) && step < stepsOf(s) - 1) {
      busy = true;
      await setStep(step + 1);
      busy = false;
      return;
    }
    if (s && s.kind === 'gift') return;
    await goScene(idx + 1, 1);
  }

  async function prev() {
    if (busy) return;
    const s = S[idx];
    if (s && isDated(s) && step > 0) {
      busy = true;
      clearTimeout(autoNext);
      await setStep(step - 1);
      busy = false;
      return;
    }
    if (idx > 0) await goScene(idx - 1, -1);
  }

  function showHint(t) {
    hint.textContent = t;
    hint.classList.toggle('on', !!t);
  }

  // One gesture = one move. Interactive elements opt out with data-nogesture.
  let wheelAcc = 0;
  let wheelLock = 0;
  addEventListener(
    'wheel',
    (e) => {
      if (e.target.closest('[data-nogesture]')) return;
      e.preventDefault();
      const now = performance.now();
      if (now < wheelLock) return;
      wheelAcc += e.deltaY;
      if (Math.abs(wheelAcc) > 40) {
        wheelLock = now + 1200;
        wheelAcc > 0 ? next() : prev();
        wheelAcc = 0;
      }
    },
    { passive: false }
  );

  let touch = null;
  addEventListener('touchstart', (e) => {
    touch = e.target.closest('[data-nogesture]') ? null : { y: e.touches[0].clientY, t: performance.now() };
  });
  addEventListener('touchend', (e) => {
    if (!touch) return;
    const dy = touch.y - e.changedTouches[0].clientY;
    if (Math.abs(dy) > 40 && performance.now() - touch.t < 800) dy > 0 ? next() : prev();
    touch = null;
  });

  addEventListener('keydown', (e) => {
    if (['ArrowDown', 'ArrowLeft', 'PageDown', ' '].includes(e.key)) (e.preventDefault(), next());
    if (['ArrowUp', 'ArrowRight', 'PageUp'].includes(e.key)) (e.preventDefault(), prev());
  });

  // ----------------------------------------------------------------- intro
  async function intro() {
    const box = $('.intro-lines');
    box.innerHTML = window.INTRO.map((t) => `<p>${t}</p>`).join('');
    const go = $('#intro-go');
    for (const p of box.children) {
      await anim(p, [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 1200, easing: EASE_OUT, always: true });
      await wait(reduce ? 0 : 900);
    }
    await anim(go, [{ opacity: 0 }, { opacity: 1 }], { duration: 900, easing: EASE_OUT, always: true });
    go.addEventListener('click', start, { once: true });
  }

  async function start() {
    $('#intro').classList.add('gone');
    cur = parse(S[0].date);
    setDate(cur);
    $('#cal-note').textContent = S[0].note;
    await wait(1000);
    ring.classList.add('on');
    if (!reduce) await anim(ring, [{ opacity: 0, scale: 1.6 }, { opacity: 1, scale: 1 }], { duration: 1100, easing: EASE_OUT });
    await wait(1400);
    idx = 0;
    step = 0;
    await openScene(0);
    showHint('גללי להמשך');
    busy = false;
  }

  // Test hook for the e2e walkthrough
  window.__state = () => ({ idx, step, busy });

  // Debug: ?scene=3 jumps straight to a scene (for screenshots)
  const jump = new URLSearchParams(location.search).get('scene');
  const jumpStep = +(new URLSearchParams(location.search).get('step') || 0);
  setDate(cur);
  if (jump !== null) {
    $('#intro').classList.add('gone');
    const i = +jump;
    if (S[i] && isDated(S[i])) {
      for (let k = 0; k < i; k++) if (isDated(S[k])) seen.set(`${parse(S[k].date).getFullYear()}-${parse(S[k].date).getMonth() + 1}-${parse(S[k].date).getDate()}`, swatch(S[k]));
      cur = parse(S[i].date);
      monthKey = '';
      setDate(cur);
      ring.classList.add('on');
      idx = i;
      if (jump !== null && new URLSearchParams(location.search).has('cal')) {
        busy = false;
      } else {
        openScene(i).then(async () => {
          for (let n = 1; n <= jumpStep; n++) await setStep(n);
          busy = false;
        });
      }
    } else {
      idx = i;
      openPanel(i).then(() => (busy = false));
    }
  } else {
    intro();
  }
})();

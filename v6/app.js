// =====================================================================
//  v6 "alive" flow: intro, calendar (drag to travel in time), full-bleed
//  episodes with word-by-word text, punches, ending.
//  Motion: transform / opacity / clip-path, one short blur on open.
// =====================================================================

(() => {
  const S = window.SCENES;
  const MONTHS = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
  const TIMELINE = [[3, 'אפר׳'], [4, 'מאי'], [5, 'יוני'], [6, 'יולי'], [7, 'אוג׳'], [8, 'ספט׳'], [9, 'אוק׳']];
  const HOLIDAYS = { '2026-5-22': 'שבועות', '2026-9-12': 'ראש השנה', '2026-9-21': 'יום כיפור', '2026-9-26': 'סוכות' };
  const EASE_OUT = 'cubic-bezier(0.22, 1, 0.36, 1)';
  const EASE_IN_OUT = 'cubic-bezier(0.65, 0, 0.35, 1)';
  const EASE_DRAWER = 'cubic-bezier(0.32, 0.72, 0, 1)';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const params = new URLSearchParams(location.search);
  const coarse = matchMedia('(pointer: coarse)').matches || params.has('scrub');

  const $ = (s, r = document) => r.querySelector(s);
  const app = $('#app');
  const stage = $('#stage');
  const grid = $('#cal-grid');
  const ring = $('#cal-ring');
  const hint = $('#hint');
  // The gesture that moves on, in her words. The chevron always points up:
  // a swipe, or two fingers on a trackpad.
  const touchy = matchMedia('(pointer: coarse)').matches;
  const NEXT = touchy ? 'החליקי למעלה להמשך' : 'גללי להמשך';
  hint.classList.add('teach');
  const flash = $('#flash');

  const parse = (s) => {
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, m - 1, d);
  };
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const anim = (el, frames, opts) => (reduce && !opts.always ? Promise.resolve() : el.animate(frames, { fill: 'both', ...opts }).finished);
  const esc = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const words = (t) => esc(t).split(' ').map((w) => `<span class="w">${w}</span>`).join(' ');

  let idx = -1;
  let step = 0;
  let busy = true;
  let cleanup = null;
  let autoNext = null;
  let cur = parse(S[0].date);
  let monthKey = '';
  let lastDay = null;

  // -------------------------------------------------------------- calendar
  function swatch(s) {
    const [a, b] = s.placeholder.tones;
    return { c: `linear-gradient(160deg, ${a}, ${b})`, img: s.photo, n: s.chapter.replace(/\D/g, '') };
  }
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
        ev ? `<i class="thumb" style="--sw:${ev.c}"><img src="${ev.img}" alt="" onerror="this.remove()" /></i>` : ''
      }<span>${i}</span>${hol ? `<small>${hol}</small>` : ''}</span>`;
    }
    const tail = (7 - ((first + n) % 7)) % 7;
    for (let i = 1; i <= tail; i++) html += `<span class="day out">${i}</span>`;
    grid.innerHTML = html;
    $('#timeline').innerHTML = TIMELINE.map(([t, name]) => `<span class="${t === m ? 'now' : ''}">${name}</span>`).join('');
    if (dir && !reduce) {
      anim(grid, [{ opacity: 0, transform: `translateY(${dir * 22}px)` }, { opacity: 1, transform: 'none' }], { duration: 520, easing: EASE_OUT });
      anim($('#cal-month'), [{ opacity: 0, transform: `translateY(${dir * 14}px)`, filter: 'blur(6px)' }, { opacity: 1, transform: 'none', filter: 'blur(0)' }], { duration: 620, easing: EASE_OUT });
    }
  }

  const cell = (day) => grid.querySelector(`[data-d="${day}"]`);

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
    const dk = `${key}-${d.getDate()}`;
    if (lastDay !== null && dk !== lastDay) {
      Alive.tick();
      Sound.tick();
    }
    lastDay = dk;
  }

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

  // Ring glides day to day: fast first, then slows into the target
  function run(to, ms = 2400) {
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

  // Time runs by itself. On a touch screen a finger can take over mid-run:
  // touch pauses the run, dragging moves the days, release lets it continue.
  function travel(to) {
    if (!coarse || reduce) return run(to);
    const a = cur.getTime();
    const b = to.getTime();
    if (a === b) return run(to);
    const dir = b > a ? 1 : -1;
    const SPAN = 320; // px of drag for the whole trip
    runRange = [Math.min(a, b), Math.max(a, b)];
    app.classList.add('scrubbing');
    return new Promise((res) => {
      let raf = 0;
      let y0 = null;
      let base = a;
      let done = false;
      const atDay = (t) => {
        const d = new Date(Math.max(Math.min(a, b), Math.min(Math.max(a, b), t)));
        d.setHours(0, 0, 0, 0);
        return d;
      };
      const finish = () => {
        if (done) return;
        done = true;
        cancelAnimationFrame(raf);
        off();
        cur = new Date(b);
        setDate(cur);
        runRange = null;
        app.classList.remove('scrubbing');
        showHint('');
        res();
      };
      const startRun = () => {
        const from = cur.getTime();
        if (from === b) return finish();
        const ms = 700 + 1900 * Math.abs(b - from) / Math.abs(b - a);
        const t0 = performance.now();
        const frame = (now) => {
          const p = Math.min(1, (now - t0) / ms);
          const e = 1 - Math.pow(1 - p, 4);
          cur = atDay(from + (b - from) * e);
          setDate(cur, dir);
          if (p < 1) raf = requestAnimationFrame(frame);
          else finish();
        };
        raf = requestAnimationFrame(frame);
      };
      const down = (e) => {
        if (done || e.target.closest('[data-nogesture]')) return;
        cancelAnimationFrame(raf);
        y0 = e.clientY;
        base = cur.getTime();
        showHint('הזמן זז עם האצבע');
      };
      const move = (e) => {
        if (y0 === null) return;
        const dy = (y0 - e.clientY) * dir;
        cur = atDay(base + (dy / SPAN) * Math.abs(b - a) * dir);
        setDate(cur, dir);
      };
      const up = () => {
        if (y0 === null) return;
        y0 = null;
        showHint('');
        startRun();
      };
      const on = () => {
        app.addEventListener('pointerdown', down);
        app.addEventListener('pointermove', move);
        app.addEventListener('pointerup', up);
        app.addEventListener('pointercancel', up);
      };
      const off = () => {
        app.removeEventListener('pointerdown', down);
        app.removeEventListener('pointermove', move);
        app.removeEventListener('pointerup', up);
        app.removeEventListener('pointercancel', up);
      };
      on();
      startRun();
    });
  }

  // ---------------------------------------------------------------- scenes
  const isDated = (s) => !s.kind;

  // Captions file → timed lines. One cue = one line, at the cue's start.
  function parseSrt(text) {
    const out = [];
    for (const block of text.replace(/\r/g, '').trim().split(/\n\s*\n/)) {
      const ls = block.trim().split('\n');
      const m = ls[1] && ls[1].match(/(\d+):(\d+):(\d+)[,.](\d+)/);
      if (!m) continue;
      const at = +m[1] * 3600 + +m[2] * 60 + +m[3] + +m[4] / 1000;
      const raw = ls.slice(2).join(' ').trim();
      if (!raw) continue;
      out.push({ at, text: raw.replace(/\*\*/g, '').trim(), strong: raw.startsWith('**') });
    }
    return out;
  }
  for (const s of S) {
    if (!s.srt) continue;
    fetch(s.srt, { cache: 'no-cache' })
      .then((r) => (r.ok ? r.text() : Promise.reject()))
      .then((txt) => {
        const l = parseSrt(txt);
        if (l.length) s.lyrics = l;
      })
      .catch(() => {});
  }
  const stepsOf = (s) => (s.widget ? 3 : 2);

  const ph = (s) =>
    `<div class="ph"><div class="kb" style="--a:${s.placeholder.tones[0]};--b:${s.placeholder.tones[1]}"><img src="${s.photo}" alt="" onload="this.parentNode.classList.add('real')" onerror="this.remove()" /><span class="photo-label">placeholder · ${s.placeholder.label}</span></div>${
      s.photo2 ? `<div class="kb alt"><img src="${s.photo2}" alt="" onerror="this.remove()" /></div>` : ''
    }${
      s.video ? `<div class="kb vid"><video src="${s.video}" playsinline preload="auto" onerror="this.parentNode.remove()"></video></div>` : ''
    }</div>`;

  function sceneEl(s) {
    const el = document.createElement('article');
    el.className = 'scene';
    el.dataset.step = '0';
    el.innerHTML = `
      <div class="poster">${ph(s)}<div class="leak"></div><div class="scrim"></div></div>
      <div class="panel">
        <p class="eyebrow label"><span class="chap">${s.chapter}</span><span>${s.dateLabel}</span></p>
        <h2 class="title">${words(s.title)}</h2>
        <div class="part story">
          ${s.lyrics
            ? `<div class="lyrics"><div class="lyrics-run">${s.lyrics.map((l) => (typeof l === 'string' ? `<p>${esc(l)}</p>` : `<p class="${l.strong ? 'strong' : ''}">${esc(l.text)}</p>`)).join('')}</div></div>`
            : s.story.map((p) => `<p>${words(p)}</p>`).join('')}
          ${s.hand && !s.lyrics ? `<p class="hand">${esc(s.hand)}</p>` : ''}
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
    return { top: r.top - a.top + 5, left: r.left - a.left + 5, right: a.right - r.right + 5, bottom: a.bottom - r.bottom + 5 };
  }
  const clip = (r) => `inset(${r.top}px ${r.right}px ${r.bottom}px ${r.left}px round 10px)`;

  // Words arrive one by one, out of a blur
  function reveal(root, sel, base = 0, gap = 55, dur = 900) {
    const ws = [...root.querySelectorAll(sel)];
    ws.forEach((w, k) => {
      w.style.opacity = '';
      if (reduce) return (w.style.opacity = 1);
      w.animate(
        [{ opacity: 0, transform: 'translateY(10px)', filter: 'blur(7px)' }, { opacity: 1, transform: 'none', filter: 'blur(0)' }],
        { duration: dur, delay: base + k * gap, easing: EASE_OUT, fill: 'both' }
      );
    });
    return base + ws.length * gap + dur;
  }

  // Photo bursts out of its calendar cell, light sweeps across, text arrives
  async function openScene(i) {
    const s = S[i];
    const el = sceneEl(s);
    stage.append(el);
    setStepUI(el, 0);
    app.style.setProperty('--tint', s.tint || '#3A2330');
    const poster = $('.poster', el);
    const kb = $('.kb', el);
    const panel = $('.panel', el);
    if (reduce) {
      await anim(el, [{ opacity: 0 }, { opacity: 1 }], { duration: 300, easing: EASE_OUT, always: true });
      el.classList.add('in');
      reveal(panel, '.eyebrow, .title .w');
      return;
    }
    const from = clip(cellRect(cur.getDate()));
    panel.style.transform = 'translateY(110%)';
    Sound.whoosh(1.1);
    kb.animate([{ transform: 'scale(1.35)', filter: 'blur(14px) brightness(1.3)' }, { transform: 'scale(1)', filter: 'blur(0) brightness(1)' }], { duration: 1300, easing: EASE_OUT, fill: 'both' }).finished.then(() => {
      // slow breath: a single 16s drift, then rest
      kb.animate([{ transform: 'scale(1) translate(0, 0)' }, { transform: 'scale(1.09) translate(-1.5%, 1%)' }], { duration: 16000, easing: 'linear', fill: 'forwards' });
    });
    await anim(poster, [{ clipPath: from }, { clipPath: 'inset(0px 0px 0px 0px round 0px)' }], { duration: 1000, easing: EASE_IN_OUT });
    $('.leak', el).animate([{ opacity: 0, transform: 'translateX(-60%) rotate(8deg)' }, { opacity: 1, offset: 0.4 }, { opacity: 0, transform: 'translateX(60%) rotate(8deg)' }], { duration: 1500, easing: EASE_IN_OUT });
    Alive.thump();
    panel.style.transform = '';
    await anim(panel, [{ transform: 'translateY(110%)' }, { transform: 'none' }], { duration: 950, easing: EASE_DRAWER });
    el.classList.add('in');
    reveal(panel, '.eyebrow', 0, 0, 700);
    reveal(panel, '.title .w', 150, 90, 1000);
  }

  // Text drops, photo folds back into its cell, a print stays on the calendar
  async function closeScene(i) {
    const el = $('.scene', stage);
    if (!el) return;
    const s = S[i];
    const d = parse(s.date);
    seen.set(`${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`, swatch(s));
    app.style.setProperty('--tint', '#2C1F26');
    if (!reduce) {
      Sound.hush();
      await anim($('.panel', el), [{ transform: 'none', opacity: 1 }, { transform: 'translateY(60px)', opacity: 0 }], { duration: 520, easing: EASE_OUT });
      monthKey = '';
      setDate(cur);
      await anim($('.poster', el), [{ clipPath: 'inset(0px 0px 0px 0px round 0px)' }, { clipPath: clip(cellRect(cur.getDate())) }], { duration: 850, easing: EASE_IN_OUT });
    }
    el.remove();
    monthKey = '';
    setDate(cur);
  }

  function setStepUI(el, n) {
    el.querySelectorAll('.steps span').forEach((sp, k) => sp.classList.toggle('on', k === n));
  }

  // FLIP: the text layer moves when content changes; animate transform, not height
  async function setStep(n) {
    const el = $('.scene', stage);
    const s = S[idx];
    const panel = $('.panel', el);
    const before = panel.getBoundingClientRect().top;
    el.dataset.step = n;
    setStepUI(el, n);
    panel.classList.toggle('glass', n === 2);
    if (n === 2 && s.widget) mountWidget(el, s);
    if (n !== 2 && cleanup) {
      cleanup();
      cleanup = null;
    }
    const after = panel.getBoundingClientRect().top;
    Sound.step();
    if (s.lyrics) lyrics(el, s, n === 1);
    if (!reduce) {
      const move = anim(panel, [{ transform: `translateY(${before - after}px)` }, { transform: 'none' }], { duration: 900, easing: EASE_DRAWER });
      if (n === 1) {
        let base = 250;
        for (const p of el.querySelectorAll('.story > p:not(.hand)')) base = reveal(p, '.w', base, 60, 900) - 650;
        const hand = $('.story .hand', el);
        if (hand) hand.animate([{ clipPath: 'inset(0 0 0 100%)', opacity: 0.4 }, { clipPath: 'inset(0 0 0 0)', opacity: 1 }], { duration: 1100, delay: base, easing: EASE_OUT, fill: 'both' });
      } else if (n === 2) {
        [...el.querySelectorAll('.widget > *')].forEach((node, k) =>
          node.animate([{ opacity: 0, transform: 'translateY(14px)' }, { opacity: 1, transform: 'none' }], { duration: 800, delay: 300 + k * 120, easing: EASE_OUT, fill: 'backwards' })
        );
      }
      await move;
    }
    step = n;
    // No swipe cue on the widget step, nor under the avatar's gate: the wish shows it when it ends
    showHint(n === 2 || (n === 1 && s.lyrics) ? '' : NEXT);
  }

  // The avatar speaks; the wish scrolls under it like lyrics, line by line.
  // The video never starts silently: if the browser refuses sound, a button
  // waits for her tap and only then the avatar begins. Site mute = video mute.
  let lyricsStop = null;
  function lyrics(el, s, on) {
    if (lyricsStop) {
      lyricsStop();
      lyricsStop = null;
    }
    const vid = $('.kb.vid video', el);
    const box = $('.lyrics', el);
    const run = $('.lyrics-run', el);
    const lines = [...run.children];
    if (!on) {
      Sound.duck(false);
      if (vid) {
        vid.pause();
        $('.kb.vid', el).classList.remove('on');
      }
      return;
    }
    el.classList.add('speaking');
    let raf = 0;
    let gate = null;

    const begin = (v) => {
      Sound.duck(true);
      if (v) $('.kb.vid', el).classList.add('on');
      const fallback = lines.length * 2600;
      const total = v && isFinite(v.duration) && v.duration > 1 ? v.duration * 1000 : fallback;
      const t0 = performance.now();
      const per = total / lines.length;
      const starts = s.lyrics.map((l, k) => (typeof l === 'object' && l.at != null ? l.at * 1000 : k * per));
      const LEAD = 120; // light the line a breath before the voice reaches it
      let cur = -1;
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        Sound.duck(false);
        showHint(NEXT);
      };
      const tick = (now) => {
        const t = (v && !v.paused ? v.currentTime * 1000 : now - t0) + LEAD;
        let i = 0;
        for (let k = 0; k < starts.length; k++) if (t >= starts[k]) i = k;
        if (i !== cur) {
          cur = i;
          lines.forEach((l, k) => l.classList.toggle('on', k === i));
          lines.forEach((l, k) => l.classList.toggle('past', k < i));
          const y = lines[i].offsetTop - box.clientHeight * 0.38;
          run.style.transform = `translateY(${-Math.max(0, y)}px)`;
        }
        const over = v ? v.ended || (v.paused && t >= total - 50) : t >= total + 1500 + LEAD;
        if (!over) raf = requestAnimationFrame(tick);
        else finish();
      };
      raf = requestAnimationFrame(tick);
    };

    const tryPlay = (muted) => {
      vid.muted = muted;
      if (vid.ended || vid.currentTime > 0.5) vid.currentTime = 0; // the wish always starts from its first word
      return vid.play().then(() => vid);
    };

    if (!vid) begin(null);
    else {
      // Always wait for her tap: she checks the phone is not on silent, then
      // the avatar starts with its voice. Site mute is lifted by the tap.
      gate = document.createElement('div');
      gate.className = 'gate-wrap';
      gate.dataset.nogesture = '';
      gate.innerHTML = '<button class="btn gate" type="button"><i></i>הקישי כדי לשמוע את נתן</button><span class="label gate-note">ודאי שהטלפון לא על שקט</span>';
      el.append(gate);
      showHint('');
      $('.gate', gate).addEventListener('click', () => {
        gate.remove();
        gate = null;
        if (Sound.muted) {
          Sound.toggleMute();
          $('#mute').classList.remove('off');
        }
        tryPlay(false)
          .catch(() => tryPlay(true))
          .then(begin, () => begin(null));
      });
    }

    lyricsStop = () => {
      cancelAnimationFrame(raf);
      gate?.remove();
      el.classList.remove('speaking');
    };
  }

  function mountWidget(el, s) {
    const w = $('.widget', el);
    if (w.childElementCount) return;
    const ctx = {
      done(after = 4600) {
        clearTimeout(autoNext);
        showHint(NEXT);
        autoNext = setTimeout(() => next(), after);
      },
      stamp: stampIn,
      sparkle,
      confetti,
      sound: Sound,
      alive: Alive,
      // crossfade to the second photo (the derby ends in Ramla)
      swapPhoto() {
        const alt = $('.kb.alt', el);
        if (!alt) return;
        alt.animate([{ opacity: 0, transform: 'scale(1.08)' }, { opacity: 1, transform: 'scale(1)' }], { duration: reduce ? 1 : 2200, easing: EASE_OUT, fill: 'both' });
      },
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
    Sound.chime();
    Alive.thump();
    Alive.burstAt(st, 30);
    if (!reduce) {
      st.animate([{ opacity: 0, transform: `scale(1.6) rotate(${tilt}deg)`, filter: 'blur(4px)' }, { opacity: 1, transform: `scale(1) rotate(${tilt}deg)`, filter: 'blur(0)' }], {
        duration: 520,
        easing: 'cubic-bezier(0.34, 1.4, 0.64, 1)',
        fill: 'both',
      });
    }
  }

  function sparkle(target, n = 16) {
    if (reduce || !target) return;
    Sound.sparkle(Math.min(12, n));
    const a = app.getBoundingClientRect();
    const r = target.getBoundingClientRect();
    Alive.burst(r.left - a.left + r.width / 2, r.top - a.top + r.height / 2, n * 2);
    for (let i = 0; i < n; i++) {
      const sp = document.createElement('i');
      sp.className = 'spark';
      sp.style.left = `${r.left - a.left + Math.random() * r.width}px`;
      sp.style.top = `${r.top - a.top + r.height * (0.3 + Math.random() * 0.6)}px`;
      app.append(sp);
      const rise = 50 + Math.random() * 90;
      sp.animate(
        [
          { opacity: 0, transform: 'translateY(0) scale(0.6)' },
          { opacity: 1, transform: `translateY(${-rise * 0.3}px) scale(1.2)`, offset: 0.25 },
          { opacity: 0, transform: `translateY(${-rise}px) scale(0.8)` },
        ],
        { duration: 2400 + Math.random() * 1200, delay: Math.random() * 600, easing: EASE_OUT, fill: 'both' }
      ).finished.then(() => sp.remove());
    }
  }

  // Confetti fills the whole screen from the top
  function confetti(target, n = 140) {
    if (reduce) return;
    Sound.sparkle(14);
    const colors = ['#E2C496', '#F6F1EA', '#8C6A32', '#D39A8E', '#FFD98A', '#C9A0DC'];
    const a = app.getBoundingClientRect();
    for (let i = 0; i < n; i++) {
      const c = document.createElement('i');
      c.className = 'piece';
      c.style.background = colors[i % colors.length];
      c.style.left = `${Math.random() * a.width}px`;
      c.style.top = `${-20 - Math.random() * 120}px`;
      app.append(c);
      const dx = (Math.random() - 0.5) * 160;
      const dy = a.height + 60 + Math.random() * 100;
      const rot = (Math.random() - 0.5) * 1080;
      c.animate(
        [
          { opacity: 1, transform: 'translate(0,0) rotate(0deg)' },
          { opacity: 1, transform: `translate(${dx * 0.5}px, ${dy * 0.5}px) rotate(${rot * 0.5}deg)`, offset: 0.5 },
          { opacity: 0.9, transform: `translate(${dx}px, ${dy}px) rotate(${rot}deg)` },
        ],
        { duration: 3200 + Math.random() * 2600, delay: Math.random() * 1400, easing: 'cubic-bezier(0.3, 0.6, 0.6, 1)', fill: 'both' }
      ).finished.then(() => c.remove());
    }
  }

  // --------------------------------------------------------- ending panels
  function panelEl(s) {
    const el = document.createElement('article');
    el.className = `end ${s.kind}`;
    if (s.kind === 'roadmap') {
      el.innerHTML = `
        ${s.photo ? `<div class="end-ph"><img src="${s.photo}" alt="" onerror="this.parentNode.remove()" /></div>` : ''}
        <p class="label" style="color:var(--gold)">${s.chapter}</p>
        <h2 class="title">${words(s.title)}</h2>
        <ol class="road">${s.steps.map((t, k) => `<li class="${k === 0 ? 'now' : ''}"><i class="still" style="--t:${t.tone}"></i><b>${t.label}</b><span class="label">${t.state}</span></li>`).join('')}</ol>
        <p class="title road-end">${s.end}</p>`;
    } else {
      el.innerHTML = `
        <button class="btn skip" type="button" data-nogesture>דלגי</button>
        <dl class="roll">${s.lines.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}<div><dd style="color:var(--gold)">סוף עונה 2</dd></div></dl>
        <button class="btn again" type="button" data-nogesture>לצפות שוב</button>`;
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
      reveal(el, '.title .w', 0, 90, 1000);
      [...el.querySelectorAll('.road li, .road-end')].forEach((n, k) =>
        n.animate([{ opacity: 0, transform: 'translateY(16px)' }, { opacity: 1, transform: 'none' }], { duration: 900, delay: 600 + k * 260, easing: EASE_OUT, fill: 'backwards' })
      );
      showHint(NEXT);
    }
    if (s.kind === 'credits') {
      // The roll climbs until "end of season 2" rests mid-screen, then offers a replay
      const roll = $('.roll', el);
      const last = roll.lastElementChild.getBoundingClientRect();
      const box = el.getBoundingClientRect();
      const dist = last.top + last.height / 2 - (box.top + box.height / 2);
      const a = roll.animate([{ transform: 'translateY(0)' }, { transform: `translateY(${-dist}px)` }], { duration: reduce ? 1 : dist * 20, easing: 'linear', fill: 'both' });
      $('.skip', el).addEventListener('click', () => a.finish());
      a.finished.then(() => {
        if (idx !== i) return;
        $('.skip', el).style.opacity = 0;
        $('.again', el).classList.add('on');
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

    if (lyricsStop) {
      lyricsStop();
      lyricsStop = null;
      Sound.duck(false);
    }
    if (from && isDated(from)) await closeScene(idx);
    else await closePanel();

    if (isDated(to)) {
      $('#cal-note').textContent = '';
      await wait(reduce ? 0 : 350);
      await travel(parse(to.date));
      ring.classList.add('on');
      await wait(reduce ? 0 : 500);
      idx = i;
      await openScene(i);
      if (dir < 0) {
        for (let n = 1; n < stepsOf(to); n++) await setStep(n);
      } else {
        step = 0;
        showHint(NEXT);
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
    $('.hint-text', hint).textContent = t;
    hint.classList.toggle('on', !!t);
    hint.classList.toggle('plain', !!t && t !== NEXT);
  }
  // Her first gesture: she knows the way now, the pill stops glowing
  const taught = () => hint.classList.remove('teach');

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
        taught();
        wheelAcc > 0 ? next() : prev();
        wheelAcc = 0;
      }
    },
    { passive: false }
  );

  let touch = null;
  addEventListener('touchstart', (e) => {
    touch = e.target.closest('[data-nogesture]') || app.classList.contains('scrubbing') ? null : { y: e.touches[0].clientY, t: performance.now() };
  }, { passive: true });
  addEventListener('touchend', (e) => {
    if (!touch) return;
    const dy = touch.y - e.changedTouches[0].clientY;
    if (Math.abs(dy) > 40 && performance.now() - touch.t < 800) {
      taught();
      dy > 0 ? next() : prev();
    }
    touch = null;
  });

  addEventListener('keydown', (e) => {
    if (app.classList.contains('scrubbing')) return;
    if (['ArrowDown', 'ArrowLeft', 'PageDown', ' '].includes(e.key)) (e.preventDefault(), taught(), next());
    if (['ArrowUp', 'ArrowRight', 'PageUp'].includes(e.key)) (e.preventDefault(), taught(), prev());
  });

  // ------------------------------------------------------------------ mute
  const mute = $('#mute');
  mute.classList.toggle('off', Sound.muted);
  mute.addEventListener('click', () => {
    Sound.start();
    const off = Sound.toggleMute();
    mute.classList.toggle('off', off);
    document.querySelectorAll('.kb.vid video').forEach((v) => (v.muted = off));
  });

  // ----------------------------------------------------------------- intro
  async function intro() {
    const box = $('.intro-lines');
    box.innerHTML = window.INTRO.map((t, k) => `<p>${k ? words(t) : esc(t)}</p>`).join('');
    const go = $('#intro-go');
    const ringEl = $('.intro-ring');
    await wait(reduce ? 0 : 600);
    const ps = [...box.children];
    await anim(ps[0], [{ opacity: 0 }, { opacity: 1 }], { duration: 1200, easing: EASE_OUT, always: true });
    await wait(reduce ? 0 : 700);
    for (let k = 1; k < ps.length; k++) {
      ps[k].style.opacity = 1;
      if (k === ps.length - 1) ringEl.classList.add('beat');
      const t = reveal(ps[k], '.w', 0, 140, 1100);
      await wait(reduce ? 0 : t - 400);
      if (k === ps.length - 1) {
        // "and you said yes": the room lights up
        Sound.yes();
        Alive.thump();
        const a = app.getBoundingClientRect();
        Alive.burst(a.width / 2, a.height * 0.26, 60);
        flash.animate([{ opacity: 0 }, { opacity: 0.55, offset: 0.15 }, { opacity: 0 }], { duration: 1600, easing: EASE_OUT });
        ringEl.classList.remove('beat');
        ringEl.classList.add('lit');
      }
      await wait(reduce ? 0 : 900);
    }
    await anim(go, [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 900, easing: EASE_OUT, always: true });
    go.addEventListener('click', start, { once: true });
  }

  // Sound needs a real user activation (touchend / click / key), and on some
  // phones the first one is not enough. Keep trying until the context runs.
  const kick = () => {
    Sound.start();
    if (Sound.running) for (const ev of ['touchend', 'pointerup', 'click', 'keydown']) removeEventListener(ev, kick, true);
  };
  for (const ev of ['touchend', 'pointerup', 'click', 'keydown']) addEventListener(ev, kick, { capture: true, passive: true });

  async function start() {
    Sound.start();
    Alive.enableTilt();
    $('#intro').classList.add('gone');
    cur = parse(S[0].date);
    lastDay = null;
    setDate(cur);
    $('#cal-note').textContent = S[0].note;
    await wait(1100);
    ring.classList.add('on');
    if (!reduce) await anim(ring, [{ opacity: 0, scale: 1.8 }, { opacity: 1, scale: 1 }], { duration: 1200, easing: EASE_OUT });
    await wait(1400);
    idx = 0;
    step = 0;
    await openScene(0);
    showHint(NEXT);
    busy = false;
  }

  window.__state = () => ({ idx, step, busy });

  // Debug: ?scene=3&step=1 jumps straight to a scene; &cal shows only the calendar
  const jump = params.get('scene');
  const jumpStep = +(params.get('step') || 0);
  setDate(cur);
  lastDay = null;
  if (jump !== null) {
    $('#intro').classList.add('gone');
    const i = +jump;
    if (S[i] && isDated(S[i])) {
      for (let k = 0; k < i; k++) if (isDated(S[k])) {
        const d = parse(S[k].date);
        seen.set(`${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`, swatch(S[k]));
      }
      cur = parse(S[i].date);
      monthKey = '';
      setDate(cur);
      ring.classList.add('on');
      idx = i;
      if (params.has('cal')) {
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

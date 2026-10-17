// =====================================================================
//  Scene interactions ("punch", step 3). Each widget gets its mount
//  element, its config from data.js and a ctx with done/stamp/sparkle.
//  Return a cleanup function if the widget starts timers.
// =====================================================================

window.Widgets = (() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const h = (html) => {
    const t = document.createElement('template');
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  };

  // ------------------------------------------------------------- ring sizer
  function ring(el, cfg, ctx) {
    const base = cfg.stops[0].r;
    el.innerHTML = `
      <div class="gauge-head"><p class="label w-hint">${cfg.hint}</p><span class="visit label">ביקור <b>0</b>/${cfg.stops.length - 1}</span></div>
      <svg class="ring-fig" viewBox="0 0 320 150" aria-hidden="true">
        <path class="finger" d="M134 150 V40 a26 26 0 0 1 52 0 V150" />
        <circle class="band" cx="160" cy="92" r="${base}" />
        <line class="dim" x1="40" y1="92" x2="100" y2="92" /><line class="dim" x1="220" y1="92" x2="280" y2="92" />
      </svg>
      <div class="ring-meta"><span class="ring-label"></span><span class="label ring-who"></span></div>
      <input class="range" type="range" min="0" max="${cfg.stops.length - 1}" step="1" value="0" aria-label="ביקורים אצל הצורף" data-nogesture />
      <div class="ring-stops" aria-hidden="true">${cfg.stops.map(() => '<i></i>').join('')}</div>
      <p class="label ring-credit" style="margin-top:14px;opacity:0"></p>`;
    const band = el.querySelector('.band');
    const range = el.querySelector('.range');
    const label = el.querySelector('.ring-label');
    const who = el.querySelector('.ring-who');
    const credit = el.querySelector('.ring-credit');
    const visit = el.querySelector('.visit b');
    band.style.transformBox = 'fill-box';
    band.style.transformOrigin = 'center';
    band.style.transition = 'transform 800ms cubic-bezier(0.22, 1, 0.36, 1)';
    let finished = false;

    const set = (i) => {
      const s = cfg.stops[i];
      band.style.transform = `scale(${s.r / base})`;
      label.textContent = s.label;
      who.textContent = s.who;
      visit.textContent = i;
      if (i === cfg.stops.length - 1 && !finished) {
        finished = true;
        credit.textContent = cfg.credit;
        credit.style.opacity = 1;
        ctx.stamp(el, cfg.stamp, { top: '28px', left: '0' });
        ctx.sparkle(band);
        ctx.done();
      }
    };
    range.addEventListener('input', () => set(+range.value));
    set(0);
  }

  // ----------------------------------------------------------- scratch card
  function scratch(el, cfg, ctx) {
    el.innerHTML = `
      <p class="label w-hint">${cfg.hint}</p>
      <div class="scratch">${cfg.cities
        .map((c) => `<div class="tile"><span class="x">×</span><span class="label">${c}</span><canvas data-nogesture></canvas></div>`)
        .join('')}</div>
      <p class="scratch-result"></p>
      <div class="ticker" aria-hidden="true"><div class="ticker-run">${[...cfg.ticker, ...cfg.ticker].map((t) => `<span>${t}</span>`).join('')}</div></div>`;
    const result = el.querySelector('.scratch-result');
    let open = 0;

    el.querySelectorAll('.tile').forEach((tile) => {
      const cv = tile.querySelector('canvas');
      const r = tile.getBoundingClientRect();
      const dpr = devicePixelRatio || 1;
      cv.width = r.width * dpr;
      cv.height = r.height * dpr;
      const g = cv.getContext('2d');
      g.scale(dpr, dpr);
      // Frosted cover: flat silver with fine noise, no gradient
      g.fillStyle = '#D9B98A';
      g.fillRect(0, 0, r.width, r.height);
      for (let i = 0; i < 900; i++) {
        g.fillStyle = `rgba(255,255,255,${Math.random() * 0.08})`;
        g.fillRect(Math.random() * r.width, Math.random() * r.height, 1, 1);
      }
      g.fillStyle = 'rgba(35,27,31,.8)';
      g.font = '500 12px "IBM Plex Sans Hebrew", sans-serif';
      g.textAlign = 'center';
      g.fillText(tile.querySelector('.label').textContent, r.width / 2, r.height / 2 + 4);
      g.globalCompositeOperation = 'destination-out';
      g.lineCap = 'round';
      g.lineWidth = 26;

      let down = false;
      let last = null;
      let strokes = 0;
      const pos = (e) => {
        const b = cv.getBoundingClientRect();
        return [e.clientX - b.left, e.clientY - b.top];
      };
      const reveal = () => {
        if (tile.classList.contains('done')) return;
        tile.classList.add('done');
        open++;
        if (open === cfg.cities.length) {
          result.textContent = cfg.result;
          el.querySelector('.ticker').classList.add('on');
          el.closest('.scene')?.querySelector('.led')?.replaceChildren('0/3');
          ctx.stamp(el, cfg.stamp, { top: '-8px', left: '0' });
          ctx.done();
        }
      };
      cv.addEventListener('pointerdown', (e) => {
        down = true;
        last = pos(e);
        cv.setPointerCapture(e.pointerId);
      });
      cv.addEventListener('pointermove', (e) => {
        if (!down) return;
        const p = pos(e);
        g.beginPath();
        g.moveTo(...last);
        g.lineTo(...p);
        g.stroke();
        last = p;
        if (++strokes % 8 === 0 && cleared(g, cv) > 0.5) reveal();
      });
      const up = () => {
        down = false;
        if (cleared(g, cv) > 0.5) reveal();
      };
      cv.addEventListener('pointerup', up);
      cv.addEventListener('pointercancel', up);
    });
  }

  function cleared(g, cv) {
    const d = g.getImageData(0, 0, cv.width, cv.height).data;
    let n = 0;
    let t = 0;
    for (let i = 3; i < d.length; i += 64) {
      t++;
      if (d[i] === 0) n++;
    }
    return n / t;
  }

  // ----------------------------------------------------------------- scales
  function scales(el, cfg, ctx) {
    const [a, b] = cfg.sides;
    el.innerHTML = `
      <div class="board"><span class="team">${a.who}</span><span class="score"><b>0</b><em>:</em><b>0</b></span><span class="team">${b.who}</span></div>
      <p class="label w-hint" style="text-align:center;margin-top:14px">${cfg.hint}</p>
      <div class="sides">
        ${[a, b]
          .map(
            (s, i) => `<button class="side" data-side="${i}" type="button" data-nogesture>
              <h4>${s.name}</h4><span class="label">${s.who}</span><div class="args"></div>
            </button>`
          )
          .join('')}
      </div>
      <button class="btn judge" type="button" hidden data-nogesture>${cfg.judge}</button>
      <div class="final" hidden><span class="label">תוצאה סופית</span><b>${cfg.stamp}</b></div>`;
    const digits = el.closest('.scene')?.querySelectorAll('.board .score b') || [];
    const judge = el.querySelector('.judge');
    const shown = [0, 0];
    let weight = [0, 0];
    let over = false;

    // RTL: side 0 (Bat Yam) sits on the right pan
    // Scoreboard digits flip when a side scores
    const tilt = () => {
      digits.forEach((d, i) => {
        if (d.textContent == weight[i]) return;
        d.textContent = weight[i];
        if (!reduce) d.animate([{ transform: 'translateY(-40%)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 600, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' });
      });
      el.querySelectorAll('.side').forEach((b, i) => b.classList.toggle('lead', weight[i] > weight[1 - i]));
    };
    const add = (i, text, gold, w = 1) => {
      const arg = h(`<span class="arg${gold ? ' gold' : ''}"><i>${weight[i] + w}′</i>${text}</span>`);
      el.querySelector(`[data-side="${i}"] .args`).append(arg);
      if (!reduce) arg.animate([{ opacity: 0, transform: 'translateY(-6px)' }, { opacity: 1, transform: 'none' }], { duration: 600, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' });
      weight[i] += w;
      tilt();
    };

    el.querySelectorAll('.side').forEach((btn) =>
      btn.addEventListener('click', () => {
        if (over) return;
        const i = +btn.dataset.side;
        const s = cfg.sides[i];
        if (shown[i] >= s.args.length) return;
        add(i, s.args[shown[i]++]);
        if (shown[0] === a.args.length && shown[1] === b.args.length) judge.hidden = false;
      })
    );
    judge.addEventListener('click', () => {
      if (over) return;
      over = true;
      judge.hidden = true;
      cfg.bonus.forEach((t, k) => setTimeout(() => add(1, t, true, 5), 400 + k * 1100));
      setTimeout(() => {
        const fin = el.querySelector('.final');
        fin.hidden = false;
        if (!reduce) fin.animate([{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'none' }], { duration: 900, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' });
        ctx.sparkle(fin, 18);
        ctx.done(5000);
      }, 400 + cfg.bonus.length * 1100 + 600);
    });
    tilt();
  }

  // -------------------------------------------------------------- countdown
  function countdown(el, cfg, ctx) {
    const R = 54;
    const C = 2 * Math.PI * R;
    el.innerHTML = `
      <div class="count">
        <svg class="count-ring" viewBox="0 0 120 120" aria-hidden="true">
          <circle class="track" cx="60" cy="60" r="${R}" />
          <circle class="fill" cx="60" cy="60" r="${R}" stroke-dasharray="${C}" stroke-dashoffset="${C}" />
          <circle class="inner" cx="60" cy="60" r="34" />
          <text class="num" x="60" y="68" text-anchor="middle">0</text>
        </svg>
        <div><div class="count-num">0</div><p class="label">${cfg.label}</p><p class="count-sub"></p></div>
      </div>`;
    const num = el.querySelector('.count-num');
    const num2 = el.querySelector('.count-ring .num');
    const sub = el.querySelector('.count-sub');
    const fill = el.querySelector('.fill');
    const from = new Date(cfg.from).getTime();
    const to = new Date(cfg.target).getTime();

    const tick = () => {
      const left = Math.max(0, to - Date.now());
      const d = Math.floor(left / 864e5);
      const hh = Math.floor((left % 864e5) / 36e5);
      const mm = Math.floor((left % 36e5) / 6e4);
      const ss = Math.floor((left % 6e4) / 1e3);
      num.textContent = d;
      num2.textContent = d;
      sub.textContent = `${hh} שעות · ${mm} דקות · ${ss} שניות`;
    };
    tick();
    const progress = Math.min(1, Math.max(0, (Date.now() - from) / (to - from)));
    requestAnimationFrame(() => requestAnimationFrame(() => (fill.style.strokeDashoffset = C * (1 - progress))));
    const id = setInterval(tick, 1000);
    setTimeout(() => {
      if (cfg.stamp) ctx.stamp(el, cfg.stamp, { top: '-18px', right: '-14px', width: '92px', height: '92px' });
      ctx.done(6000);
    }, 1200);
    return () => clearInterval(id);
  }

  // ------------------------------------------------------------------- poll
  function poll(el, cfg, ctx) {
    el.innerHTML = `
      <p class="label w-hint">${cfg.question}</p>
      <div class="poll">${cfg.options
        .map((o, i) => `<button class="opt" type="button" data-i="${i}" data-nogesture><i class="bar"></i><span><b class="stars">${i === 0 ? '★★★★★' : '★☆☆☆☆'}</b>${o}</span><span class="pct">${i === 0 ? 100 : 0}%</span></button>`)
        .join('')}</div>
      <p class="poll-note"></p>`;
    const box = el.querySelector('.poll');
    box.querySelectorAll('.opt').forEach((btn) =>
      btn.addEventListener('click', () => {
        if (box.classList.contains('voted')) return;
        box.classList.add('voted');
        box.querySelector('[data-i="0"] .bar').style.transform = 'scaleX(1)';
        el.querySelector('.poll-note').textContent = cfg.note[+btn.dataset.i];
        if (cfg.stamp) ctx.stamp(el, cfg.stamp, { top: '-6px', left: '0' });
        ctx.done();
      })
    );
  }

  // ---------------------------------------------------------------- candles
  function candles(el, cfg, ctx) {
    const xs = Array.from({ length: cfg.count }, (_, i) => 160 + (i - (cfg.count - 1) / 2) * 44);
    el.innerHTML = `
      <p class="label w-hint" style="text-align:center">${cfg.hint}</p>
      <svg class="cake" viewBox="0 0 320 170">
        <path class="line" d="M70 100 H250 V160 H70 Z M70 122 C100 132 130 112 160 122 S220 132 250 122" />
        <path class="line" d="M40 160 H280" />
        ${xs
          .map(
            (x, i) => `<g data-i="${i}">
              <rect class="candle" x="${x - 4}" y="56" width="8" height="44" rx="1" />
              <path class="flame" d="M${x} 30 C${x + 7} 40 ${x + 6} 50 ${x} 52 C${x - 6} 50 ${x - 7} 40 ${x} 30 Z" />
              <path class="smoke" d="M${x} 48 c-6 -8 6 -14 0 -22 s6 -12 0 -18" />
              <rect class="hit" x="${x - 20}" y="20" width="40" height="84" data-nogesture />
            </g>`
          )
          .join('')}
      </svg>
      <p class="wish"></p>`;
    let out = 0;
    el.querySelectorAll('.cake g').forEach((g) =>
      g.querySelector('.hit').addEventListener('click', () => {
        const flame = g.querySelector('.flame');
        if (flame.classList.contains('out')) return;
        flame.classList.add('out');
        if (!reduce) {
          g.querySelector('.smoke').animate(
            [{ opacity: 0.7, transform: 'translateY(0)' }, { opacity: 0, transform: 'translateY(-18px)' }],
            { duration: 2000, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' }
          );
        }
        if (++out === cfg.count) {
          el.querySelector('.wish').textContent = cfg.wish;
          ctx.confetti(el.querySelector('.cake'), 48);
          ctx.sparkle(el.querySelector('.cake'), 12);
          ctx.done(7000);
        }
      })
    );
  }

  return { ring, scratch, scales, countdown, poll, candles };
})();

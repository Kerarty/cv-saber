// Эффекты: снег, твины, процедурный звук (WebAudio)
window.G = window.G || {};

// --- Твины ---
G.tweens = [];

G.tween = function (obj, props, dur, onDone, ease) {
  const from = {};
  for (const k in props) from[k] = obj[k];
  G.tweens.push({ obj, props, from, t: 0, dur, onDone, ease: ease || (x => x) });
};

G.tweensTick = function (dtMs) {
  for (let i = G.tweens.length - 1; i >= 0; i--) {
    const tw = G.tweens[i];
    // объект уничтожен вместе со сценой — выбрасываем твин
    if (tw.obj.destroyed) { G.tweens.splice(i, 1); continue; }
    tw.t += dtMs;
    const p = Math.min(1, tw.t / tw.dur);
    const e = tw.ease(p);
    for (const k in tw.props) tw.obj[k] = tw.from[k] + (tw.props[k] - tw.from[k]) * e;
    if (p >= 1) {
      G.tweens.splice(i, 1);
      if (tw.onDone) tw.onDone();
    }
  }
};

G.easeOut = p => 1 - Math.pow(1 - p, 3);
G.easeInOut = p => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2);

// --- Визуальные хелперы ---
G.viz = {
  // Градиент, устойчивый к сменам API Pixi 8.x
  gradient(x0, y0, x1, y1, stops) {
    let gr;
    try {
      gr = new PIXI.FillGradient({ start: { x: x0, y: y0 }, end: { x: x1, y: y1 } });
    } catch (e) {
      gr = new PIXI.FillGradient(x0, y0, x1, y1);
    }
    for (const [offset, color] of stops) gr.addColorStop(offset, color);
    return gr;
  },
  // Виньетка по краям экрана: 4 линейных градиента (rgba-строки — числа без альфы)
  vignette(container, alpha = 0.4) {
    const v = new PIXI.Container();
    const W = G.W, H = G.H, d = 190;
    const a = Math.round(alpha * 100) / 100;
    const solid = 'rgba(0,0,0,' + a + ')';
    const zero = 'rgba(0,0,0,0)';
    const top = new PIXI.Graphics();
    top.rect(0, 0, W, d).fill(this.gradient(0, 0, 0, d, [[0, solid], [1, zero]]));
    const bottom = new PIXI.Graphics();
    bottom.rect(0, H - d, W, d).fill(this.gradient(0, H - d, 0, H, [[0, zero], [1, solid]]));
    const left = new PIXI.Graphics();
    left.rect(0, 0, d, H).fill(this.gradient(0, 0, d, 0, [[0, solid], [1, zero]]));
    const right = new PIXI.Graphics();
    right.rect(W - d, 0, d, H).fill(this.gradient(W - d, 0, W, 0, [[0, zero], [1, solid]]));
    v.addChild(top, bottom, left, right);
    v.eventMode = 'none';
    container.addChild(v);
    return v;
  },
};

// --- Частицы: искры, пыль, конфетти ---
G.fxParticles = {
  layer: null,
  list: [],
  init(stage) {
    this.layer = new PIXI.Container();
    this.layer.eventMode = 'none';
    stage.addChild(this.layer);
  },
  burst(x, y, color, n = 10, opts = {}) {
    if (!this.layer) return;
    for (let i = 0; i < n; i++) {
      const g = new PIXI.Graphics();
      const r = (opts.size || 3) * (0.5 + Math.random());
      if (opts.square) g.rect(-r, -r, r * 2, r * 2).fill(color);
      else g.circle(0, 0, r).fill(color);
      g.x = x; g.y = y;
      const a = Math.random() * Math.PI * 2;
      const sp = (opts.speed || 90) * (0.4 + Math.random() * 0.8);
      this.layer.addChild(g);
      this.list.push({
        g,
        vx: Math.cos(a) * sp,
        vy: (opts.up ? -Math.abs(Math.sin(a)) * sp : Math.sin(a) * sp) - (opts.up ? 40 : 0),
        grav: opts.grav === undefined ? 160 : opts.grav,
        life: 0, ttl: (opts.ttl || 700) * (0.6 + Math.random() * 0.7),
      });
    }
  },
  tick(dtMs) {
    const dt = dtMs / 1000;
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i];
      p.life += dtMs;
      p.vy += p.grav * dt;
      p.g.x += p.vx * dt;
      p.g.y += p.vy * dt;
      p.g.alpha = Math.max(0, 1 - p.life / p.ttl);
      if (p.life >= p.ttl) {
        p.g.destroy();
        this.list.splice(i, 1);
      }
    }
  },
};

// --- Тряска экрана ---
G.fxShake = {
  power: 0,
  base: { x: 0, y: 0 },
  hit(p = 6) {
    this.power = Math.max(this.power, p);
  },
  tick(world, dtMs) {
    if (this.power <= 0.2) {
      if (this.power > 0) { this.power = 0; world.x = this.base.x; world.y = this.base.y; }
      return;
    }
    this.power *= Math.pow(0.92, dtMs / 16.6);
    world.x = this.base.x + (Math.random() - 0.5) * this.power;
    world.y = this.base.y + (Math.random() - 0.5) * this.power;
  },
};

// --- Снег (глобальный слой поверх сцен) ---
G.fxSnow = {
  layer: null,
  flakes: [],
  init(stage) {
    this.layer = new PIXI.Container();
    stage.addChild(this.layer);
    for (let i = 0; i < 60; i++) {
      const g = new PIXI.Graphics();
      const r = 1 + Math.random() * 1.8;
      g.circle(0, 0, r).fill({ color: G.C.snow, alpha: 0.25 + Math.random() * 0.5 });
      g.x = Math.random() * G.W;
      g.y = Math.random() * G.H;
      this.layer.addChild(g);
      this.flakes.push({ g, vy: 14 + Math.random() * 26, amp: 12 + Math.random() * 26, phase: Math.random() * Math.PI * 2 });
    }
  },
  tick(dtMs) {
    if (!this.layer) return;
    const dt = dtMs / 1000;
    for (const f of this.flakes) {
      f.phase += dt;
      f.g.y += f.vy * dt;
      f.g.x += Math.cos(f.phase) * f.amp * dt;
      if (f.g.y > G.H + 6) { f.g.y = -6; f.g.x = Math.random() * G.W; }
    }
  },
  gold() {
    // золотой снег на экране победы
    for (const f of this.flakes) f.g.tint = G.C.gold;
  },
  reset() {
    for (const f of this.flakes) f.g.tint = 0xffffff;
  },
};

// --- Звук: процедурные осцилляторы ---
G.sfx = {
  ctx: null,
  muted: (function () { try { return localStorage.getItem('cv_saber_mute') === '1'; } catch (e) { return false; } })(),
  ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) this.ctx = new AC();
    }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  },
  tone(freq, dur, type, vol, when, slideTo) {
    const ctx = this.ctx;
    if (!ctx) return;
    const t0 = ctx.currentTime + (when || 0);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type || 'square';
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    gain.gain.setValueAtTime(vol || 0.06, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  },
  play(name) {
    if (this.muted) return;
    if (!this.ensure()) return;
    switch (name) {
      case 'blip': this.tone(620, 0.07, 'square', 0.05); break;
      case 'card': this.tone(440, 0.06, 'square', 0.05); this.tone(660, 0.08, 'square', 0.05, 0.05); break;
      case 'hit': this.tone(160, 0.12, 'sawtooth', 0.09, 0, 70); break;
      case 'thud': this.tone(90, 0.2, 'sine', 0.12, 0, 45); break;
      case 'shield': this.tone(320, 0.15, 'triangle', 0.07); this.tone(480, 0.15, 'triangle', 0.06, 0.06); break;
      case 'heal': this.tone(520, 0.12, 'sine', 0.07); this.tone(780, 0.14, 'sine', 0.07, 0.08); break;
      case 'chime': this.tone(880, 0.2, 'sine', 0.07); this.tone(1320, 0.3, 'sine', 0.06, 0.1); break;
      case 'stun': this.tone(220, 0.2, 'triangle', 0.07, 0, 140); break;
      case 'boss': this.tone(70, 0.5, 'sawtooth', 0.1, 0, 50); this.tone(140, 0.4, 'square', 0.05, 0.1); break;
      case 'fanfare':
        [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.22, 'triangle', 0.08, i * 0.13));
        this.tone(1046, 0.5, 'sine', 0.07, 0.55);
        break;
    }
  },
  toggle() {
    this.muted = !this.muted;
    try { localStorage.setItem('cv_saber_mute', this.muted ? '1' : '0'); } catch (e) {}
  },
};

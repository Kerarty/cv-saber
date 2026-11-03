// Художественный слой: пергамент, дерево, nine-slice, тайлы, анимации
window.G = window.G || {};

G.art = {
  // --- базовые текстуры ---
  frame(asset, rect) {
    const t = G.TEX && G.TEX[asset];
    if (!t || !t.base) return null;
    return new PIXI.Texture({
      source: t.base.source,
      frame: new PIXI.Rectangle(rect.x, rect.y, rect.w, rect.h),
    });
  },

  tex(name, frame = 0) {
    const t = G.TEX && G.TEX[name];
    if (!t) return null;
    return t.frames[Math.min(frame, t.frames.length - 1)];
  },

  sprite(name, opts = {}) {
    const t = this.tex(name, opts.frame || 0);
    if (!t) return null;
    const sp = new PIXI.Sprite(t);
    const fh = (G.TEX[name] && G.TEX[name].fh) || t.height;
    const fw = (G.TEX[name] && G.TEX[name].fw) || t.width;
    if (opts.h) { const s = opts.h / fh; sp.scale.set(s * (opts.flip ? -1 : 1), s); }
    else if (opts.scale !== undefined) sp.scale.set(opts.scale * (opts.flip ? -1 : 1), opts.scale);
    if (opts.anchor) sp.anchor.set(opts.anchor[0], opts.anchor[1]);
    if (opts.x !== undefined) sp.x = opts.x;
    if (opts.y !== undefined) sp.y = opts.y;
    if (opts.tint !== undefined) sp.tint = opts.tint;
    if (opts.alpha !== undefined) sp.alpha = opts.alpha;
    sp.__fw = fw; sp.__fh = fh;
    return sp;
  },

  // --- nine-slice из листов Tiny Swords ---
  nine(key, w, h, opts = {}) {
    const m = G.UI9 && G.UI9[key];
    const c = new PIXI.Container();
    if (!m || !G.TEX[m.asset]) return c;
    const s = Math.min(1, w / (m.l + m.r + 6), h / (m.t + m.b + 6));
    const l = m.l * s, r = m.r * s, t = m.t * s, b = m.b * s;
    const iw = Math.max(1, w - l - r), ih = Math.max(1, h - t - b);
    const cells = m.cells;
    const mk = (idx, x, y, cw, ch, sw, sh) => {
      const tex = this.frame(m.asset, cells[idx]);
      if (!tex) return null;
      const sp = new PIXI.Sprite(tex);
      sp.x = x; sp.y = y;
      // ширина/высота ячейки: явные размеры или натуральные cw/ch
      sp.width = sw === undefined ? cw : sw;
      sp.height = sh === undefined ? ch : sh;
      c.addChild(sp);
      return sp;
    };
    // углы
    mk(0, 0, 0, l, t);
    mk(2, w - r, 0, r, t);
    mk(6, 0, h - b, l, b);
    mk(8, w - r, h - b, r, b);
    // края
    mk(1, l, 0, iw, t);
    mk(7, l, h - b, iw, b);
    mk(3, 0, t, l, ih);
    mk(5, w - r, t, r, ih);
    mk(4, l, t, iw, ih);
    if (opts.tint !== undefined) c.children.forEach(ch => { ch.tint = opts.tint; });
    if (opts.alpha !== undefined) c.alpha = opts.alpha;
    return c;
  },

  shadow(w, h, opts = {}) {
    const g = new PIXI.Graphics();
    const a = opts.alpha === undefined ? 0.45 : opts.alpha;
    g.roundRect(-w / 2 + (opts.dx || 5), -h / 2 + (opts.dy || 7), w, h, opts.r || 12)
      .fill({ color: 0x000000, alpha: a });
    return g;
  },

  // Пергаментная панель: nine-slice + тень + опциональная тёмная тонировка
  panel(w, h, opts = {}) {
    const c = new PIXI.Container();
    if (opts.shadow !== false) c.addChild(this.shadow(w, h, { alpha: opts.shadowAlpha || 0.42, r: opts.r || 12 }));
    const p = this.nine(opts.special ? 'special' : 'paper', w, h, {
      tint: opts.tint, alpha: opts.alpha === undefined ? 1 : opts.alpha,
    });
    p.x = -w / 2; p.y = -h / 2;
    c.addChild(p);
    if (opts.inner !== false) {
      const g = new PIXI.Graphics();
      g.roundRect(-w / 2 + 20, -h / 2 + 18, w - 40, h - 36, 6)
        .stroke({ width: 1, color: opts.tint ? 0x6a8a86 : 0x9a7a4a, alpha: opts.tint ? 0.25 : 0.28 });
      c.addChild(g);
    }
    return c;
  },

  // Тёмная HUD-панель: тонированный пергамент или дерево
  hud(w, h, opts = {}) {
    const c = new PIXI.Container();
    if (opts.shadow !== false) c.addChild(this.shadow(w, h, { alpha: 0.38, r: 8 }));
    const p = this.nine(opts.wood ? 'wood' : 'paper', w, h, {
      tint: opts.tint === undefined ? 0x4a5f62 : opts.tint,
    });
    p.x = -w / 2; p.y = -h / 2;
    c.addChild(p);
    const line = new PIXI.Graphics();
    line.roundRect(-w / 2 + 3, -h / 2 + 3, w - 6, h - 6, 6)
      .stroke({ width: 1.5, color: opts.trim || G.C.goldDark, alpha: 0.85 });
    c.addChild(line);
    return c;
  },

  // Деревянная плашка: тайлинг текстуры + рамка
  wood(w, h, opts = {}) {
    const c = new PIXI.Container();
    if (opts.shadow !== false) c.addChild(this.shadow(w, h, { alpha: 0.38, r: 7, dx: 4, dy: 5 }));
    const m = G.UI9 && G.UI9.wood;
    const t = m && G.TEX[m.asset] ? this.frame(m.asset, m.cells[4]) : null;
    if (t) {
      const ts = new PIXI.TilingSprite({ texture: t, width: w, height: h });
      ts.tint = opts.tint === undefined ? 0x8a6a4a : opts.tint;
      ts.x = -w / 2; ts.y = -h / 2;
      c.addChild(ts);
    } else {
      const g = new PIXI.Graphics();
      g.rect(-w / 2, -h / 2, w, h).fill(opts.tint === undefined ? G.C.wood : opts.tint);
      c.addChild(g);
    }
    const g = new PIXI.Graphics();
    g.rect(-w / 2, -h / 2, w, h).stroke({ width: 3, color: G.C.woodDark });
    g.rect(-w / 2 + 2, -h / 2 + 2, w - 4, h - 4).stroke({ width: 1, color: opts.trim || G.C.woodLight, alpha: 0.9 });
    // заклёпки по углам
    const stud = opts.stud === undefined ? G.C.goldDark : opts.stud;
    if (stud !== null) {
      for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        g.circle(sx * (w / 2 - 9), sy * (h / 2 - 9), 2.6).fill(stud);
      }
    }
    c.addChild(g);
    return c;
  },

  // Лента-заголовок (3-slice)
  ribbon(w, h, color = 'blue', opts = {}) {
    const c = new PIXI.Container();
    const m = G.UI3 && G.UI3.ribbons && G.UI3.ribbons[color];
    if (!m || !G.TEX.ui_ribbons) return c;
    const s = h / Math.max(1, m.ch);
    const l = m.l * s, r = m.r * s;
    const iw = Math.max(1, w - l - r);
    const mk = (idx, x, sw) => {
      const tex = this.frame('ui_ribbons', m.cells[idx]);
      if (!tex) return;
      const sp = new PIXI.Sprite(tex);
      sp.x = x; sp.y = 0; sp.width = sw; sp.height = h;
      if (opts.tint !== undefined) sp.tint = opts.tint;
      c.addChild(sp);
    };
    mk(0, 0, l); mk(1, l, iw); mk(2, w - r, r);
    return c;
  },

  // Полоса здоровья/прогресса: резная база + заливка
  bar(w, h, ratio, color, opts = {}) {
    const c = new PIXI.Container();
    const m = G.UI3 && G.UI3.bar;
    if (!m || !G.TEX.ui_bar_base) return c;
    const s = h / Math.max(1, m.ch);
    const l = m.l * s, r = m.r * s;
    const iw = Math.max(1, w - l - r);
    const mk = (idx, x, sw) => {
      const tex = this.frame('ui_bar_base', m.cells[idx]);
      if (!tex) return;
      const sp = new PIXI.Sprite(tex);
      sp.x = x; sp.y = 0; sp.width = sw; sp.height = h;
      c.addChild(sp);
    };
    mk(0, 0, l); mk(1, l, iw); mk(2, w - r, r);
    const pad = Math.max(2, h * 0.18);
    const fw = Math.max(0, (w - pad * 2) * Math.max(0, Math.min(1, ratio)));
    const fill = new PIXI.Graphics();
    fill.rect(pad, pad, fw, h - pad * 2).fill(color || G.C.heroGreen);
    fill.rect(pad, pad, fw, Math.max(1, (h - pad * 2) * 0.35)).fill({ color: 0xffffff, alpha: 0.16 });
    c.addChild(fill);
    return c;
  },

  // --- Мир ---
  water(w, h, opts = {}) {
    const c = new PIXI.Container();
    const t = this.tex('water_tile');
    if (t) {
      const ts = new PIXI.TilingSprite({ texture: t, width: w, height: h });
      ts.tint = opts.tint === undefined ? 0x9fc8cc : opts.tint;
      c.addChild(ts);
      c.__tile = ts;
    } else {
      const g = new PIXI.Graphics();
      g.rect(0, 0, w, h).fill(opts.tint || G.C.tealDark);
      c.addChild(g);
    }
    return c;
  },

  // Остров из 3×3 тайлов травы: углы + тайлинг краёв и центра
  island(w, h, opts = {}) {
    const c = new PIXI.Container();
    const base = G.TEX && G.TEX.terrain_island;
    if (!base) return c;
    const cell = (x, y) => this.frame('terrain_island', { x, y, w: 64, h: 64 });
    const mk = (tex, x, y, sw, sh) => {
      if (!tex) return null;
      const sp = new PIXI.Sprite(tex);
      sp.x = x; sp.y = y;
      if (sw !== undefined) sp.width = sw;
      if (sh !== undefined) sp.height = sh;
      if (opts.tint !== undefined) sp.tint = opts.tint;
      c.addChild(sp);
      return sp;
    };
    const W = Math.max(192, Math.round(w / 64) * 64);
    const H = Math.max(192, Math.round(h / 64) * 64);
    // углы
    mk(cell(0, 0), 0, 0);
    mk(cell(128, 0), W - 64, 0);
    mk(cell(0, 128), 0, H - 64);
    mk(cell(128, 128), W - 64, H - 64);
    // края и центр — тайлингом, чтобы текстура не растягивалась
    const tile = (tex, x, y, tw, th) => {
      if (!tex) return null;
      const ts = new PIXI.TilingSprite({ texture: tex, width: tw, height: th });
      ts.x = x; ts.y = y;
      if (opts.tint !== undefined) ts.tint = opts.tint;
      c.addChild(ts);
      return ts;
    };
    tile(cell(64, 0), 64, 0, W - 128, 64);
    tile(cell(64, 128), 64, H - 64, W - 128, 64);
    tile(cell(0, 64), 0, 64, 64, H - 128);
    tile(cell(128, 64), W - 64, 64, 64, H - 128);
    tile(cell(64, 64), 64, 64, W - 128, H - 128);
    c.__w = W; c.__h = H;
    return c;
  },

  // Анимированный спрайт-лист (fire/explosion/dust)
  anim(name, opts = {}) {
    const t = G.TEX && G.TEX[name];
    if (!t) return null;
    const sp = new PIXI.Sprite(t.frames[0]);
    const fw = t.fw, fh = t.fh;
    if (opts.h) { const s = opts.h / fh; sp.scale.set(s * (opts.flip ? -1 : 1), s); }
    else if (opts.scale !== undefined) sp.scale.set(opts.scale * (opts.flip ? -1 : 1), opts.scale);
    sp.anchor.set(opts.anchor ? opts.anchor[0] : 0.5, opts.anchor ? opts.anchor[1] : 0.5);
    if (opts.tint !== undefined) sp.tint = opts.tint;
    if (opts.alpha !== undefined) sp.alpha = opts.alpha;
    const a = {
      view: sp, frames: t.frames, i: 0, t: 0, fps: opts.fps || 12,
      loop: opts.loop !== false, onDone: opts.onDone || null, destroyed: false,
    };
    sp.__anim = a;
    this._anims.push(a);
    return a;
  },

  _anims: [],

  tick(dtMs) {
    for (let k = this._anims.length - 1; k >= 0; k--) {
      const a = this._anims[k];
      if (a.destroyed || a.view.destroyed) { this._anims.splice(k, 1); continue; }
      a.t += dtMs;
      const step = 1000 / a.fps;
      while (a.t > step) {
        a.t -= step;
        a.i++;
        if (a.i >= a.frames.length) {
          if (a.loop) a.i = 0;
          else {
            a.i = a.frames.length - 1;
            const cb = a.onDone; a.onDone = null;
            if (cb) cb();
            a.destroyed = true;
          }
        }
        a.view.texture = a.frames[Math.min(a.i, a.frames.length - 1)];
      }
    }
  },

  // Костёр/факел: огонь + тёплый ореол
  fire(x, y, h = 40, opts = {}) {
    const c = new PIXI.Container();
    c.x = x; c.y = y;
    const glow = new PIXI.Graphics();
    const gr = opts.glow === undefined ? 1 : opts.glow;
    if (gr > 0) {
      glow.circle(0, -h * 0.25, h * 1.2).fill({ color: 0xff9d4a, alpha: 0.05 * gr });
      glow.circle(0, -h * 0.25, h * 0.7).fill({ color: 0xffc06a, alpha: 0.07 * gr });
    }
    c.addChild(glow);
    const a = this.anim('fx_fire', { h, fps: 13, tint: opts.tint });
    if (a) { a.view.y = 0; c.addChild(a.view); }
    c.__glow = glow;
    return c;
  },

  // Тень под объектом
  blob(x, y, rx, ry, alpha = 0.28) {
    const g = new PIXI.Graphics();
    g.ellipse(x, y, rx, ry).fill({ color: 0x000000, alpha });
    return g;
  },

  // --- текст ---
  text(str, opts = {}) {
    const style = {
      fontFamily: opts.font || G.FONT_BODY,
      fontSize: opts.size || 16,
      fill: opts.fill === undefined ? G.C.text : opts.fill,
      align: opts.align || 'left',
      letterSpacing: opts.spacing || 0,
      fontWeight: opts.bold ? 'bold' : 'normal',
      wordWrap: !!opts.wrap,
      wordWrapWidth: opts.wrap || 100,
      lineHeight: opts.lineHeight || Math.round((opts.size || 16) * 1.25),
    };
    if (opts.stroke) style.stroke = { color: opts.stroke, width: opts.strokeW || 3 };
    const t = new PIXI.Text({ text: str, style });
    if (opts.anchor) t.anchor.set(opts.anchor[0], opts.anchor[1]);
    if (opts.x !== undefined) t.x = opts.x;
    if (opts.y !== undefined) t.y = opts.y;
    return t;
  },

  inkText(str, opts = {}) { return this.text(str, Object.assign({ fill: G.C.ink }, opts)); },
  paperText(str, opts = {}) { return this.text(str, Object.assign({ fill: G.C.text }, opts)); },

  // Пиксельная рамка-уголки для карточек
  corners(g, x, y, w, h, color = G.C.goldDark, len = 12) {
    const c = color;
    g.moveTo(x, y + len).lineTo(x, y).lineTo(x + len, y).stroke({ width: 2, color: c, alpha: 0.9 });
    g.moveTo(x + w - len, y).lineTo(x + w, y).lineTo(x + w, y + len).stroke({ width: 2, color: c, alpha: 0.9 });
    g.moveTo(x, y + h - len).lineTo(x, y + h).lineTo(x + len, y + h).stroke({ width: 2, color: c, alpha: 0.9 });
    g.moveTo(x + w - len, y + h).lineTo(x + w, y + h).lineTo(x + w, y + h - len).stroke({ width: 2, color: c, alpha: 0.9 });
  },
};

// UI-хелперы: кнопки, панели-свитки, подписи, переключатель языка
window.G = window.G || {};

G.ui = {
  // Кнопка: скин из Tiny Swords UI (button_gold / button_blue), тень, hover/press
  button({ label, x, y, w = 260, h = 56, primary = false, small = false, onClick }) {
    const c = new PIXI.Container();
    c.x = x; c.y = y; c.eventMode = 'static'; c.cursor = 'pointer';
    const t = new PIXI.Text({
      text: label,
      style: {
        fontFamily: primary ? G.FONT_TITLE : G.FONT_BODY,
        fontSize: small ? 16 : 22,
        fill: primary ? 0x1a1206 : G.C.text,
        letterSpacing: primary ? 2 : 0.5,
        fontWeight: 'bold',
      },
    });
    t.anchor.set(0.5);
    // кнопка растёт под текст: Ruslan Display шире системного
    w = Math.max(w, t.width + (small ? 36 : 56));
    const shadow = new PIXI.Graphics();
    shadow.roundRect(-w / 2 + 3, -h / 2 + 5, w, h, 12).fill({ color: 0x000000, alpha: 0.38 });
    // скиновые девять-слайсы: обычная и утопленная (затемнённая) версии
    const skinKey = primary ? 'button_gold' : 'button_blue';
    const hasSkin = G.art && G.art.nine && G.UI9 && G.UI9[skinKey];
    const mk = (tint, dy) => {
      if (!hasSkin) return null;
      const n = G.art.nine(skinKey, w, h, { tint });
      n.x = -w / 2; n.y = -h / 2 + dy;
      return n;
    };
    const normal = hasSkin ? mk(null, 0) : null;
    const pressed = hasSkin ? mk(0x7d7d7d, 2) : null;
    const g = new PIXI.Graphics(); // процедурный фолбэк
    const hi = new PIXI.Graphics();
    hi.roundRect(-w / 2 + 2, -h / 2 + 2, w - 4, h - 4, 11)
      .stroke({ width: 2, color: primary ? 0xffe4a8 : 0xbfe0ff, alpha: 0.9 });
    const draw = (state) => {
      // state: 0 обычная, 1 нажата, 2 hover
      if (normal) { normal.visible = state !== 1; pressed.visible = state === 1; }
      else {
        g.clear();
        const bg = primary ? (state === 2 ? 0xf5b959 : G.C.gold) : (state === 2 ? 0x243044 : G.C.panel);
        g.roundRect(-w / 2, -h / 2, w, h, 10).fill(bg);
        g.roundRect(-w / 2, -h / 2, w, h, 10).stroke({ width: 2, color: primary ? G.C.goldDark : G.C.hexBorder, alpha: 1 });
      }
      hi.visible = state === 2;
      c.y = y + (state === 1 ? 2 : 0);
      t.y = state === 1 ? 1 : 0;
      shadow.visible = state !== 1;
    };
    draw(0);
    if (normal) c.addChild(shadow, normal, pressed, t, hi);
    else c.addChild(shadow, g, t, hi);
    c.on('pointerover', () => draw(2));
    c.on('pointerout', () => draw(0));
    c.on('pointerdown', () => { G.sfx.play('blip'); draw(1); });
    c.on('pointerup', () => draw(2));
    c.on('pointerupoutside', () => draw(0));
    c.on('pointertap', () => onClick && onClick());
    c.refreshLabel = (v) => { t.text = v; };
    return c;
  },

  // Пергаментная основа панелей: nine-slice бумаги + тень (идиома гвинт-карточек)
  parchment(w, h, opts = {}) {
    const c = new PIXI.Container();
    const shadow = new PIXI.Graphics();
    shadow.roundRect(-w / 2 + (opts.sx === undefined ? 8 : opts.sx), -h / 2 + (opts.sy === undefined ? 10 : opts.sy), w, h, 16)
      .fill({ color: 0x000000, alpha: opts.shadowAlpha === undefined ? 0.5 : opts.shadowAlpha });
    c.addChild(shadow);
    const p = G.art.nine(opts.special ? 'special' : 'paper', w, h, opts.tint ? { tint: opts.tint } : {});
    p.x = -w / 2; p.y = -h / 2;
    c.addChild(p);
    return c;
  },

  // Панель-свиток: заголовок + строки + ссылка + закрытие; тень и появление с масштабом
  panel({ x, y, w = 560, title, lines, link, onClose }) {
    const c = new PIXI.Container();
    c.x = x; c.y = y; c.zIndex = 50;
    c.eventMode = 'static';
    const pad = 28;
    const lineH = 34;
    const h = pad * 2 + 44 + lines.length * 58 + (link ? 40 : 0);
    const shadow = new PIXI.Graphics();
    shadow.roundRect(-w / 2 + 6, -h / 2 + 8, w, h, 14).fill({ color: 0x000000, alpha: 0.45 });
    const g = new PIXI.Graphics();
    g.roundRect(-w / 2, -h / 2, w, h, 14).fill({ color: G.C.panel, alpha: 0.98 });
    g.roundRect(-w / 2, -h / 2, w, h, 14).stroke({ width: 2, color: G.C.gold });
    c.addChild(shadow, g);

    const tt = new PIXI.Text({
      text: title,
      style: { fontFamily: G.FONT_TITLE, fontSize: 24, fill: G.C.gold, letterSpacing: 1 },
    });
    tt.anchor.set(0.5, 0);
    tt.y = -h / 2 + pad;
    c.addChild(tt);

    let yy = -h / 2 + pad + 48;
    for (const key of lines) {
      const bullet = new PIXI.Graphics();
      bullet.circle(0, 8, 4).fill(G.C.gold);
      bullet.x = -w / 2 + pad + 4;
      bullet.y = yy + 4;
      const txt = new PIXI.Text({
        text: G.t(key),
        style: {
          fontFamily: G.FONT_BODY, fontSize: 17, fill: G.C.text,
          wordWrap: true, wordWrapWidth: w - pad * 2 - 20, lineHeight: 26,
        },
      });
      txt.x = -w / 2 + pad + 20;
      txt.y = yy;
      c.addChild(bullet, txt);
      yy += 58;
    }

    if (link) {
      const linkTxt = new PIXI.Text({
        text: '↗ ' + G.t('open_link'),
        style: { fontFamily: G.FONT_BODY, fontSize: 15, fill: G.C.heroBlue },
      });
      linkTxt.anchor.set(0.5, 0);
      linkTxt.y = yy - 10;
      linkTxt.eventMode = 'static';
      linkTxt.cursor = 'pointer';
      linkTxt.on('pointertap', () => window.open(link, '_blank'));
      c.addChild(linkTxt);
    }

    if (onClose) {
      const btn = G.ui.button({
        label: '✕', x: w / 2 - 24, y: -h / 2 + 24, w: 36, h: 36, small: true,
        onClick: onClose,
      });
      c.addChild(btn);
    }
    c.alpha = 0;
    c.scale.set(0.95);
    G.tween(c, { alpha: 1 }, 180, null, G.easeOut);
    G.tween(c.scale, { x: 1, y: 1 }, 180, null, G.easeOut);
    return c;
  },

  // Тост-сообщение сверху по центру (в G.world — переживает смену сцены)
  toast(text, dur = 1600) {
    if (G._toast) {
      G.world.removeChild(G._toast);
      G._toast.destroy({ children: true });
      G._toast = null;
    }
    const c = new PIXI.Container();
    const t = new PIXI.Text({
      text,
      style: { fontFamily: G.FONT_BODY, fontSize: 18, fill: G.C.text, fontWeight: 'bold' },
    });
    t.anchor.set(0.5);
    const padX = 26;
    const g = new PIXI.Graphics();
    g.roundRect(-t.width / 2 - padX, -22, t.width + padX * 2, 44, 10)
      .fill({ color: G.C.panelDark, alpha: 0.95 })
      .stroke({ width: 1, color: G.C.gold, alpha: 0.7 });
    c.addChild(g, t);
    c.x = G.W / 2; c.y = 84;
    G.world.addChild(c);
    G._toast = c;
    G.tween(c, { y: 72 }, 200, () => {
      setTimeout(() => {
        if (G._toast === c) {
          G.tween(c, { alpha: 0 }, 300, () => {
            if (c.parent) G.world.removeChild(c);
            c.destroy({ children: true });
            if (G._toast === c) G._toast = null;
          });
        }
      }, dur);
    });
  },

  // Переключатель языка RU | EN
  langToggle() {
    const c = new PIXI.Container();
    c.x = G.W - 64; c.y = 34;
    c.eventMode = 'static';
    c.cursor = 'pointer';
    const draw = () => {
      c.removeChildren();
      const ru = new PIXI.Text({
        text: 'RU',
        style: { fontFamily: G.FONT_BODY, fontSize: 15, fontWeight: 'bold', fill: G.lang === 'ru' ? G.C.gold : G.C.textDim },
      });
      const en = new PIXI.Text({
        text: 'EN',
        style: { fontFamily: G.FONT_BODY, fontSize: 15, fontWeight: 'bold', fill: G.lang === 'en' ? G.C.gold : G.C.textDim },
      });
      const sep = new PIXI.Text({ text: '|', style: { fontFamily: G.FONT_BODY, fontSize: 14, fill: G.C.textDim } });
      ru.anchor.set(0.5); en.anchor.set(0.5); sep.anchor.set(0.5);
      ru.x = -20; sep.x = 0; en.x = 20;
      c.addChild(ru, sep, en);
    };
    draw();
    c.on('pointertap', () => {
      G.sfx.play('blip');
      G.setLang(G.lang === 'ru' ? 'en' : 'ru');
    });
    c.refreshLang = draw;
    return c;
  },

  // Кнопка звука
  muteButton() {
    const c = new PIXI.Container();
    c.x = G.W - 22; c.y = 34;
    c.eventMode = 'static';
    c.cursor = 'pointer';
    const g = new PIXI.Graphics();
    const draw = () => {
      g.clear();
      g.circle(0, 0, 14).fill({ color: G.C.panel, alpha: 0.9 });
      g.circle(0, 0, 14).stroke({ width: 1, color: G.C.hexBorder });
      g.moveTo(-6, -3).lineTo(-2, -3).lineTo(3, -7).lineTo(3, 7).lineTo(-2, 3).lineTo(-6, 3).closePath()
        .fill({ color: G.sfx.muted ? G.C.textDim : G.C.text });
      if (G.sfx.muted) g.moveTo(6, -5).lineTo(10, 5).stroke({ width: 2, color: G.C.enemy });
      else { g.circle(7, 0, 5).stroke({ width: 1.5, color: G.C.textDim }); }
    };
    draw();
    c.addChild(g);
    c.on('pointertap', () => { G.sfx.toggle(); draw(); });
    return c;
  },

  // Карточка факта в гвинт-стиле: пергамент, иконка в круге, заголовок, стат-чип
  factCard(fact, x, y, w = 300, h = 128) {
    const L = fact[G.lang] || fact.ru;
    const cc = new PIXI.Container();
    cc.x = x; cc.y = y;
    cc.eventMode = 'static';
    cc.cursor = fact.link ? 'pointer' : 'default';
    const body = G.art.nine && G.UI9 && G.UI9.paper
      ? G.art.nine('paper', w, h)
      : new PIXI.Graphics();
    if (!G.art.nine || !G.UI9 || !G.UI9.paper) {
      body.roundRect(0, 0, w, h, 10).fill(G.C.paper);
    }
    body.x = 0; body.y = 0;
    const g = new PIXI.Graphics();
    // угловые засечки как у гвинт-карт
    const corner = (cx, cy, sx, sy) => {
      g.moveTo(cx, cy + 14 * sy).lineTo(cx, cy).lineTo(cx + 14 * sx, cy)
        .stroke({ width: 2.5, color: G.C.goldDark, alpha: 0.9 });
    };
    const draw = (hover) => {
      g.clear();
      if (hover) {
        g.roundRect(1, 1, w - 2, h - 2, 10).fill({ color: 0xfff6dd, alpha: 0.45 });
        g.roundRect(1, 1, w - 2, h - 2, 10).stroke({ width: 2, color: G.C.goldDark, alpha: 0.9 });
      }
      corner(6, 6, 1, 1); corner(w - 6, 6, -1, 1);
      corner(6, h - 6, 1, -1); corner(w - 6, h - 6, -1, -1);
    };
    draw(false);
    // иконка в тёмном круге
    const iconBg = new PIXI.Graphics();
    iconBg.circle(26, 26, 19).fill(0x2c2115);
    iconBg.circle(26, 26, 19).stroke({ width: 1.5, color: G.C.goldDark, alpha: 0.9 });
    const icon = new PIXI.Text({ text: fact.icon, style: { fontSize: 19 } });
    icon.anchor.set(0.5);
    icon.x = 26; icon.y = 26;
    // заголовок и описание — чернила по пергаменту
    const title = new PIXI.Text({
      text: L.t,
      style: { fontFamily: G.FONT_SERIF, fontSize: 15, fill: G.C.ink },
    });
    title.x = 54; title.y = 9;
    const desc = new PIXI.Text({
      text: L.d,
      style: { fontFamily: G.FONT_BODY, fontSize: 12.5, fill: G.C.inkSoft, wordWrap: true, wordWrapWidth: w - 68, lineHeight: 16 },
    });
    desc.x = 54; desc.y = 32;
    // стат-чип
    const chip = new PIXI.Container();
    const chipText = new PIXI.Text({
      text: L.s,
      style: { fontFamily: G.FONT_TITLE, fontSize: 12, fill: 0xffe4a8, letterSpacing: 0.5 },
    });
    const padX = 10;
    const chipG = new PIXI.Graphics();
    chipG.roundRect(0, 0, chipText.width + padX * 2, 22, 11)
      .fill({ color: 0x241c12, alpha: 1 })
      .stroke({ width: 1.5, color: G.C.goldDark });
    chipText.x = padX; chipText.y = 4;
    chip.addChild(chipG, chipText);
    chip.x = w - chip.width - 10; chip.y = h - 32;
    // метка ссылки
    if (fact.link) {
      const arr = new PIXI.Text({ text: '↗', style: { fontSize: 13, fill: G.C.tealDark } });
      arr.x = w - 18; arr.y = 4;
      cc.addChild(arr);
      cc.on('pointertap', () => window.open(fact.link, '_blank'));
    }
    cc.addChild(body, g, iconBg, icon, title, desc, chip);
    cc.on('pointerover', () => draw(true));
    cc.on('pointerout', () => draw(false));
    return cc;
  },

  // Панель здания: пергамент + сетка карточек фактов с каскадом
  buildingPanel({ title, facts, link, onClose }) {
    const c = new PIXI.Container();
    c.zIndex = 50;
    c.eventMode = 'static';
    const cols = 2, gap = 14;
    const cw = 300, ch = 128;
    const rows = Math.ceil(facts.length / cols);
    let w = cols * cw + (cols - 1) * gap + 48;
    const h = 86 + rows * (ch + gap) + 26;
    c.x = G.W / 2; c.y = G.H / 2 - 10;

    // заголовок с подчёркиванием-росчерком (панель подрастает под него)
    const tt = new PIXI.Text({
      text: title,
      style: { fontFamily: G.FONT_TITLE, fontSize: 21, fill: G.C.ink, letterSpacing: 1 },
    });
    if (tt.width > w - 52) w = tt.width + 92;
    tt.x = -w / 2 + 26; tt.y = -h / 2 + 20;

    const sheet = G.ui.parchment(w, h);
    const g = new PIXI.Graphics();
    const flour = new PIXI.Graphics();
    flour.moveTo(-w / 2 + 26, -h / 2 + 56).lineTo(w / 2 - 26, -h / 2 + 56)
      .stroke({ width: 2, color: G.C.goldDark, alpha: 0.55 });
    flour.moveTo(-w / 2 + 26, -h / 2 + 56).lineTo(-w / 2 + 96, -h / 2 + 56)
      .stroke({ width: 3, color: G.C.goldDark });
    G.ui.fancyFrame(g, w, h);
    const grain = G.viz.grain(w, h, 0.04);
    grain.x = -w / 2; grain.y = -h / 2;
    c.addChild(sheet, g, grain, tt, flour);

    // карточки с каскадным появлением
    facts.forEach((f, i) => {
      const col = i % cols, row = Math.floor(i / cols);
      const card = G.ui.factCard(f, -w / 2 + 24 + col * (cw + gap), -h / 2 + 70 + row * (ch + gap), cw, ch);
      card.alpha = 0;
      card.y += 16;
      setTimeout(() => { if (!card.destroyed) G.tween(card, { alpha: 1, y: card.y - 16 }, 260, null, G.easeOut); }, 120 + i * 110);
      c.addChild(card);
    });

    // общий репозиторий раздела
    if (link) {
      const linkTxt = new PIXI.Text({
        text: '↗ ' + G.t('open_link'),
        style: { fontFamily: G.FONT_BODY, fontSize: 15, fill: G.C.heroBlue },
      });
      linkTxt.anchor.set(0.5, 1);
      linkTxt.x = 0; linkTxt.y = h / 2 - 12;
      linkTxt.eventMode = 'static';
      linkTxt.cursor = 'pointer';
      linkTxt.on('pointertap', () => window.open(link, '_blank'));
      c.addChild(linkTxt);
    }
    if (onClose) {
      c.addChild(G.ui.button({ label: '✕', x: w / 2 - 26, y: -h / 2 + 26, w: 38, h: 38, small: true, onClick: onClose }));
    }
    c.alpha = 0;
    c.scale.set(0.95);
    G.tween(c, { alpha: 1 }, 200, null, G.easeOut);
    G.tween(c.scale, { x: 1, y: 1 }, 200, null, G.easeOut);
    // золотая россыпь при открытии
    G.fxParticles.burst(c.x, c.y - h / 2 + 20, G.C.gold, 12, { size: 2.5, speed: 90, ttl: 700, grav: 70 });
    G.sfx.play('chime');
    return c;
  },

  // Лист кандидата: пергамент, аватар, характеристики с анимированными полосами, чипы
  characterSheet({ onClose }) {
    const c = new PIXI.Container();
    c.zIndex = 60;
    c.eventMode = 'static';
    const w = 780, h = 620;
    c.x = G.W / 2; c.y = G.H / 2;
    const sheet = G.ui.parchment(w, h);
    const g = new PIXI.Graphics();
    G.ui.fancyFrame(g, w, h);
    const grain = G.viz.grain(w, h, 0.045);
    grain.x = -w / 2; grain.y = -h / 2;
    c.addChild(sheet, g, grain);
    // аватар: медальон со спрайтом воина Tiny Swords (фолбэк — процедурный викинг)
    const avatar = new PIXI.Container();
    avatar.x = -w / 2 + 128; avatar.y = -70;
    const R = 96;
    const halo = new PIXI.Graphics();
    halo.circle(0, 14, R + 30).fill({ color: G.C.goldDark, alpha: 0.07 });
    // мини-сцена внутри медальона: небо, звёзды, луна, трава
    const scene = new PIXI.Container();
    const sky = new PIXI.Graphics();
    sky.circle(0, 14, R).fill(G.viz.gradient(0, -R, 0, R + 14, [
      [0, 0x081120], [0.55, 0x122340], [1, 0x1b2d4e],
    ]));
    for (let i = 0; i < 9; i++) {
      const a = Math.random() * Math.PI * 2, rr = Math.random() * (R - 18);
      const sx = Math.cos(a) * rr, sy = 14 + Math.sin(a) * rr * 0.8 - 26;
      if (sy < 40) sky.circle(sx, sy, 0.7 + Math.random() * 0.9).fill({ color: 0xdfe9f2, alpha: 0.5 + Math.random() * 0.4 });
    }
    sky.circle(R * 0.42, -R * 0.42, 12).fill({ color: 0xcfe0f0, alpha: 0.12 });
    sky.circle(R * 0.42, -R * 0.42, 7.5).fill(0xdfe9f2);
    // травяной сегмент: круг ниже уровня y=70, строго внутри медальона
    const gY = 14 + R - 42;
    const halfW = Math.sqrt((R - 2) * (R - 2) - (gY - 14) * (gY - 14));
    const a0 = Math.atan2(gY - 14, halfW);
    sky.arc(0, 14, R - 2, a0, Math.PI - a0).lineTo(-halfW, gY).closePath().fill(0x2f5a46);
    sky.arc(0, 14, R - 2, a0, Math.PI - a0).lineTo(-halfW, gY).closePath()
      .stroke({ width: 2, color: 0x3f7057, alpha: 0.9 });
    // кустики на холмике
    sky.circle(-R * 0.45, gY + 12, 5).fill(0x27493a);
    sky.circle(-R * 0.32, gY + 20, 3.5).fill(0x27493a);
    sky.circle(R * 0.55, gY + 16, 4.5).fill(0x27493a);
    scene.addChild(sky);
    // процедурный викинг — фолбэк, если спрайты не загрузились
    const av = new PIXI.Graphics();
    const OUT = 0x0a0f18;
    av.circle(0, 32, 18).fill({ color: 0x000000, alpha: 0.16 });
    // плащ
    av.poly([-11, -2, 11, -2, 15, 26, -15, 26]).fill({ color: G.C.heroBlue, alpha: 0.6 });
    // кольчуга с рядами колец
    av.rect(-9, 0, 18, 24).fill(0x7a8896).stroke({ width: 2, color: OUT });
    av.moveTo(-9, 6).lineTo(9, 6).moveTo(-9, 12).lineTo(9, 12).moveTo(-9, 18).lineTo(9, 18)
      .stroke({ width: 1, color: 0x5a6876 });
    // ремень с пряжкой
    av.rect(-9, 12, 18, 3.5).fill(0x3a2a1a);
    av.rect(-2.5, 11.2, 5, 5).fill(0xd8b45a).stroke({ width: 1, color: OUT });
    // щит: обод, поле, золотой босс
    av.circle(-18, 12, 11.5).fill(0x8a5a2a).stroke({ width: 2, color: OUT });
    av.circle(-18, 12, 8).fill(0x9a6a32);
    av.circle(-18, 12, 5.5).stroke({ width: 1, color: 0x6a4520 });
    av.poly([-20.5, 12, -15.5, 12, -18, 8.5]).fill(G.C.gold);
    // голова
    av.circle(0, -8, 11.5).fill(0xe8c39e).stroke({ width: 2, color: OUT });
    // борода с двумя косами
    av.moveTo(-12, -3).arc(0, -3, 12, Math.PI * 0.1, Math.PI * 0.9).closePath().fill(0x8a5a2a);
    av.circle(-6.5, 9.5, 2.8).fill(0x8a5a2a).stroke({ width: 1, color: OUT });
    av.circle(6.5, 9.5, 2.8).fill(0x8a5a2a).stroke({ width: 1, color: OUT });
    av.circle(-6.5, 9.5, 1.2).fill(0x6a4520);
    av.circle(6.5, 9.5, 1.2).fill(0x6a4520);
    // улыбка и глаза
    av.moveTo(-3.5, -3.5).arc(0, -3.5, 3.5, Math.PI * 0.15, Math.PI * 0.85).stroke({ width: 1.5, color: 0x8a5a2a });
    av.circle(-4, -9, 1.7).fill(0x2a2018);
    av.circle(4, -9, 1.7).fill(0x2a2018);
    // шлем: купол, обод, заклёпки
    av.moveTo(-12.5, -11).arc(0, -11, 12.5, Math.PI, 0).closePath().fill(0x9aa7b5).stroke({ width: 2, color: OUT });
    av.rect(-12.5, -13.5, 25, 4.5).fill(0x8794a3).stroke({ width: 1.5, color: OUT });
    av.circle(0, -19, 1.7).fill(0xd8d8d8);
    av.circle(-6.5, -16.5, 1.2).fill(0xd8d8d8);
    av.circle(6.5, -16.5, 1.2).fill(0xd8d8d8);
    // рога: изогнутые, с полосой у основания
    av.moveTo(-12, -17).quadraticCurveTo(-25, -23, -23, -36).lineTo(-17.5, -34)
      .quadraticCurveTo(-19.5, -25, -11.5, -19.5).closePath().fill(0xd8d8d8).stroke({ width: 1.5, color: OUT });
    av.moveTo(12, -17).quadraticCurveTo(25, -23, 23, -36).lineTo(17.5, -34)
      .quadraticCurveTo(19.5, -25, 11.5, -19.5).closePath().fill(0xd8d8d8).stroke({ width: 1.5, color: OUT });
    av.moveTo(-12, -18.5).lineTo(-9, -20).stroke({ width: 2, color: 0x6a4520 });
    av.moveTo(12, -18.5).lineTo(9, -20).stroke({ width: 2, color: 0x6a4520 });
    if (G.TEX && G.TEX.hero_warrior_idle) {
      // воин стоит на травяном холмике
      const fr = G.TEX.hero_warrior_idle.frames[0];
      const sp = new PIXI.Sprite(fr);
      sp.anchor.set(0.5, 0.86);
      const sc = (R * 1.62) / 192;
      sp.scale.set(sc, sc);
      sp.x = -4; sp.y = gY + 20;
      scene.addChild(sp);
    } else {
      // процедурный фолбэк — портрет викинга в круге
      av.scale.set(2.6);
      av.x = 0; av.y = 30;
      scene.addChild(av);
    }
    avatar.addChild(scene);
    // золотые кольца поверх сцены
    const ringG = new PIXI.Graphics();
    ringG.circle(0, 14, R).stroke({ width: 3.5, color: G.C.goldDark });
    ringG.circle(0, 14, R + 10).stroke({ width: 1.5, color: G.C.goldDark, alpha: 0.45 });
    avatar.addChild(ringG);
    c.addChild(avatar);

    // имя и роль
    const name = new PIXI.Text({
      text: G.CONFIG.name,
      style: { fontFamily: G.FONT_TITLE, fontSize: 36, fill: G.C.ink, letterSpacing: 2 },
    });
    name.x = -w / 2 + 236; name.y = -h / 2 + 42;
    const role = new PIXI.Text({
      text: G.CONFIG.role[G.lang],
      style: { fontFamily: G.FONT_BODY, fontSize: 17, fill: G.C.goldDark, letterSpacing: 1 },
    });
    role.x = name.x; role.y = -h / 2 + 92;
    const lore = new PIXI.Text({
      text: G.SHEET.lore[G.lang],
      style: { fontFamily: G.FONT_BODY, fontSize: 13.5, fill: G.C.inkDim, wordWrap: true, wordWrapWidth: w - 320, lineHeight: 18 },
    });
    lore.x = name.x; lore.y = -h / 2 + 122;
    c.addChild(name, role, lore);

    // характеристики: полосы заполняются каскадом
    const sx = name.x, sy = -h / 2 + 186;
    const statsHead = new PIXI.Text({
      text: G.t('sheet_stats'),
      style: { fontFamily: G.FONT_TITLE, fontSize: 16, fill: G.C.ink, letterSpacing: 1.5 },
    });
    statsHead.x = sx; statsHead.y = sy - 6;
    c.addChild(statsHead);
    const barW = 300;
    G.SHEET.stats[G.lang].forEach(([label, val], i) => {
      const yy = sy + 46 + i * 38;
      const lt = new PIXI.Text({
        text: label,
        style: { fontFamily: G.FONT_BODY, fontSize: 13.5, fill: G.C.ink },
      });
      lt.x = sx; lt.y = yy - 17;
      const barBg = new PIXI.Graphics();
      barBg.roundRect(sx, yy, barW, 10, 5).fill(0x2c2115);
      barBg.roundRect(sx, yy, barW, 10, 5).stroke({ width: 1, color: G.C.goldDark, alpha: 0.7 });
      const barFill = new PIXI.Graphics();
      c.addChild(lt, barBg, barFill);
      setTimeout(() => {
        if (barFill.destroyed) return;
        barFill.roundRect(sx, yy, barW * val / 100, 10, 5).fill(
          G.viz.gradient(sx, 0, sx + barW, 0, [[0, 0xb07722], [1, 0xf0c05a]])
        );
        // всплеск искр на конце полосы
        G.fxParticles.burst(G.W / 2 - w / 2 + 236 + barW * val / 100, G.H / 2 - h / 2 + 190 + 26 + i * 38 + 5, G.C.gold, 5, { size: 2, speed: 60, ttl: 500, grav: 40 });
      }, 350 + i * 130);
      const valTx = new PIXI.Text({
        text: String(val),
        style: { fontFamily: G.FONT_TITLE, fontSize: 13, fill: G.C.goldDark },
      });
      valTx.x = sx + barW + 10; valTx.y = yy - 4;
      c.addChild(valTx);
    });

    // чипы специализаций
    const chipY = sy + 46 + 5 * 38 + 18;
    let cx = sx;
    for (const chipText of G.SHEET.chips[G.lang]) {
      const chip = new PIXI.Container();
      const t = new PIXI.Text({
        text: chipText,
        style: { fontFamily: G.FONT_BODY, fontSize: 12.5, fill: 0xffe4a8 },
      });
      const cg = new PIXI.Graphics();
      cg.roundRect(0, 0, t.width + 18, 26, 13).fill({ color: 0x241c12 })
        .stroke({ width: 1.5, color: G.C.goldDark });
      t.x = 9; t.y = 5;
      chip.addChild(cg, t);
      chip.x = cx; chip.y = chipY;
      c.addChild(chip);
      cx += t.width + 28;
    }

    // пропуск: всё резюме одним экраном
    const skipBtn = G.ui.button({
      label: G.t('sheet_all'), x: 0, y: chipY + 62, w: 420, h: 44, small: true, // зазор от чипов: верх кнопки на chipY+40
      onClick: () => {
        G.sfx.play('blip');
        // лист больше не нужен — резюме целиком заменяет его
        if (c.parent) c.parent.removeChild(c);
        c.destroy({ children: true });
        const fr = G.ui.fullResume({
          onClose: () => { if (fr.parent) fr.parent.removeChild(fr); fr.destroy({ children: true }); },
        });
        G.scene.addChild(fr);
      },
    });
    c.addChild(skipBtn);

    // контакты: почта кандидата, PDF, GitHub — одной строкой по центру
    // ряд контактов: собираем, меряем, центрируем
    const contactBtns = [];
    const mkContact = (label, onClick, primary) => contactBtns.push(G.ui.button({
      label, x: 0, y: chipY + 126, w: 10, h: 48, primary, small: true, onClick,
    }));
    mkContact(G.t('sheet_mail'), () => {
      const subject = encodeURIComponent('Резюме: гейм-дизайнер — ' + G.CONFIG.name);
      const pdfUrl = location.href.replace(/[^/]*$/, '') + G.CONFIG.pdf;
      const body = encodeURIComponent('Здравствуйте! Резюме (PDF): ' + pdfUrl + ' Портфолио: ' + G.CONFIG.github);
      location.href = 'mailto:' + G.CONFIG.email + '?subject=' + subject + '&body=' + body;
    }, true);
    mkContact(G.t('sheet_pdf'), () => {
      const a = document.createElement('a');
      a.href = G.CONFIG.pdf;
      a.download = 'CV_Yaroslav_Kukar.pdf';
      document.body.appendChild(a);
      a.click();
      a.remove();
    }, false);
    mkContact(G.t('sheet_github'), () => window.open(G.CONFIG.github, '_blank'), false);
    const gapC = 16;
    let totalC = contactBtns.reduce((acc, b) => acc + b.width, 0) + gapC * (contactBtns.length - 1);
    // ряд не шире пергамента: иначе кнопки пропорционально сжимаются
    const fitK = Math.min(1, (w - 56) / totalC);
    if (fitK < 1) for (const b of contactBtns) b.scale.set(fitK);
    totalC *= fitK;
    let cx2 = -totalC / 2;
    for (const b of contactBtns) { b.x = cx2 + b.width * fitK / 2; cx2 += b.width * fitK + gapC; }
    c.addChild(...contactBtns);

    if (onClose) c.addChild(G.ui.button({ label: '✕', x: w / 2 - 26, y: -h / 2 + 26, w: 38, h: 38, small: true, onClick: onClose }));
    c.alpha = 0;
    c.scale.set(0.94);
    G.tween(c, { alpha: 1 }, 220, null, G.easeOut);
    G.tween(c.scale, { x: 1, y: 1 }, 220, null, G.easeOut);
    G.fxParticles.burst(c.x, c.y - h / 2 + 30, G.C.gold, 16, { size: 2.5, speed: 110, ttl: 800, grav: 80 });
    G.sfx.play('fanfare');
    return c;
  },
  popText(x, y, text, color) {
    if (!G.scene) return;
    const t = new PIXI.Text({
      text,
      style: { fontFamily: G.FONT_TITLE, fontSize: 20, fill: color, stroke: { color: 0x000000, width: 3 } },
    });
    t.anchor.set(0.5);
    t.x = x; t.y = y;
    t.zIndex = 40;
    G.scene.addChild(t);
    G.tween(t, { y: y - 44, alpha: 0 }, 900, () => {
      if (t.destroyed) return;
      if (t.parent) t.parent.removeChild(t);
      t.destroy();
    }, G.easeOut);
  },
};


// Лента liveops-ивента: таймер до конца окна, тап — Ивент-центр
G.ui.eventBanner = function (onTap) {
  const c = new PIXI.Container();
  c.eventMode = 'static';
  c.cursor = 'pointer';
  const g = new PIXI.Graphics();
  const t = new PIXI.Text({
    text: '',
    style: { fontFamily: G.FONT_TITLE, fontSize: 15, fill: 0xffe4a8, letterSpacing: 1 },
  });
  const draw = () => {
    t.text = G.t('ev_banner', { n: G.EVENT.endsIn() });
    g.clear();
    g.roundRect(0, 0, t.width + 44, 36, 18)
      .fill({ color: 0x241c12, alpha: 0.94 })
      .stroke({ width: 1.5, color: G.C.gold, alpha: 0.95 });
  };
  draw();
  t.x = 22; t.y = 8;
  c.addChild(g, t);
  c.refresh = draw;
  if (onTap) c.on('pointertap', () => { G.sfx.play('blip'); onTap(); });
  return c;
};

// Ивент-центр: мой ивент + разбор чужого ивента — витрина liveops-мышления
G.ui.eventHub = function ({ onClose }) {
  const c = new PIXI.Container();
  c.zIndex = 55;
  c.eventMode = 'static';
  const w = 700, h = 520;
  c.x = G.W / 2; c.y = G.H / 2;
  const sheet = G.ui.parchment(w, h);
  const g = new PIXI.Graphics();
  G.ui.fancyFrame(g, w, h);
  const grain = G.viz.grain(w, h, 0.04);
  grain.x = -w / 2; grain.y = -h / 2;
  c.addChild(sheet, g, grain);

  const tt = new PIXI.Text({
    text: G.t('ev_center'),
    style: { fontFamily: G.FONT_TITLE, fontSize: 21, fill: G.C.ink, letterSpacing: 1 },
  });
  tt.x = -w / 2 + 26; tt.y = -h / 2 + 20;
  const flour = new PIXI.Graphics();
  flour.moveTo(-w / 2 + 26, -h / 2 + 56).lineTo(w / 2 - 26, -h / 2 + 56)
    .stroke({ width: 2, color: G.C.goldDark, alpha: 0.55 });
  flour.moveTo(-w / 2 + 26, -h / 2 + 56).lineTo(-w / 2 + 96, -h / 2 + 56)
    .stroke({ width: 3, color: G.C.goldDark });
  c.addChild(tt, flour);

  // живой таймер окна ивента
  const timer = new PIXI.Text({
    text: G.t('ev_left', { n: G.EVENT.endsIn() }),
    style: { fontFamily: G.FONT_TITLE, fontSize: 15, fill: G.C.goldDark },
  });
  timer.x = -w / 2 + 26; timer.y = -h / 2 + 68;
  c.addChild(timer);
  c.refreshTimer = () => { timer.text = G.t('ev_left', { n: G.EVENT.endsIn() }); };

  const head = (key, y) => {
    const t = new PIXI.Text({
      text: G.t(key),
      style: { fontFamily: G.FONT_SERIF, fontSize: 16, fill: G.C.ink },
    });
    t.x = -w / 2 + 26; t.y = y;
    c.addChild(t);
  };
  const line = (key, y) => {
    const dot = new PIXI.Graphics();
    dot.circle(-w / 2 + 32, y + 8, 3.5).fill(G.C.goldDark);
    const t = new PIXI.Text({
      text: G.t(key),
      style: { fontFamily: G.FONT_BODY, fontSize: 13, fill: G.C.inkSoft, wordWrap: true, wordWrapWidth: w - 96, lineHeight: 17 },
    });
    t.x = -w / 2 + 46; t.y = y;
    c.addChild(dot, t);
  };

  head('ev_my', -h / 2 + 104);
  line('ev_goal', -h / 2 + 132);
  line('ev_mech', -h / 2 + 172);
  line('ev_metrics', -h / 2 + 212);
  head('ev_review', -h / 2 + 258);
  line('ev_r1', -h / 2 + 286);
  line('ev_r2', -h / 2 + 326);
  line('ev_r3', -h / 2 + 366);
  line('ev_r4', -h / 2 + 406);

  const foot = new PIXI.Text({
    text: G.t('ev_footer'),
    style: { fontFamily: G.FONT_BODY, fontSize: 12, fill: G.C.inkDim, wordWrap: true, wordWrapWidth: w - 56 },
  });
  foot.x = -w / 2 + 26; foot.y = h / 2 - 46;
  c.addChild(foot);

  if (onClose) c.addChild(G.ui.button({ label: '✕', x: w / 2 - 26, y: -h / 2 + 26, w: 38, h: 38, small: true, onClick: onClose }));
  c.alpha = 0;
  c.scale.set(0.95);
  G.tween(c, { alpha: 1 }, 200, null, G.easeOut);
  G.tween(c.scale, { x: 1, y: 1 }, 200, null, G.easeOut);
  G.sfx.play('chime');
  return c;
};

// Деревянная рама с золотыми уголками для больших панелей
G.ui.fancyFrame = function (g, w, h) {
  g.roundRect(-w / 2 - 5, -h / 2 - 5, w + 10, h + 10, 15).stroke({ width: 8, color: 0x3a2d1c });
  g.roundRect(-w / 2 - 5, -h / 2 - 5, w + 10, h + 10, 15).stroke({ width: 2, color: 0x59452c });
  const br = (cx, cy, sx, sy) => {
    g.moveTo(cx + 20 * sx, cy).lineTo(cx, cy).lineTo(cx, cy + 20 * sy)
      .stroke({ width: 3, color: G.C.gold, alpha: 0.9 });
    g.circle(cx + 6 * sx, cy + 6 * sy, 2).fill(G.C.goldDark);
  };
  br(-w / 2 - 5, -h / 2 - 5, 1, 1); br(w / 2 + 5, -h / 2 - 5, -1, 1);
  br(-w / 2 - 5, h / 2 + 5, 1, -1); br(w / 2 + 5, h / 2 + 5, -1, -1);
};

// Компактная строка факта для «Резюме целиком»
G.ui.factRow = function (fact, w = 400) {
  const L = fact[G.lang] || fact.ru;
  const cc = new PIXI.Container();
  cc.eventMode = 'static';
  if (fact.link) cc.cursor = 'pointer';
  const g = new PIXI.Graphics();
  const draw = (hover) => {
    g.clear();
    const rh = cc.h || 70;
    g.roundRect(0, 0, w, rh, 8).fill(hover ? 0xfff2d0 : 0xf4e6c0);
    g.roundRect(0, 0, w, rh, 8).stroke({ width: 1.5, color: hover ? G.C.goldDark : 0xd8c49a });
    g.circle(24, 29, 14).fill(0x2c2115);
    g.circle(24, 29, 14).stroke({ width: 1, color: G.C.goldDark, alpha: 0.8 });
  };
  draw(false);
  const icon = new PIXI.Text({ text: fact.icon, style: { fontSize: 14 } });
  icon.anchor.set(0.5);
  icon.x = 24; icon.y = 35;
  const title = new PIXI.Text({
    text: L.t,
    style: { fontFamily: G.FONT_SERIF, fontSize: 13, fill: G.C.ink, wordWrap: true, wordWrapWidth: w - 190, lineHeight: 14 },
  });
  title.x = 46; title.y = 8;
  // чип статистики — на строке заголовка справа (заголовок уже не доходит до него)
  const chipText = new PIXI.Text({
    text: L.s,
    style: { fontFamily: G.FONT_TITLE, fontSize: 11, fill: 0xffe4a8 },
  });
  const chip = new PIXI.Graphics();
  chip.roundRect(w - chipText.width - 20, 6, chipText.width + 14, 21, 10)
    .fill({ color: 0x241c12 })
    .stroke({ width: 1, color: G.C.goldDark });
  chipText.x = w - chipText.width - 13; chipText.y = 17;
  // описание ниже чипа, на полную ширину строки
  const desc = new PIXI.Text({
    text: L.d,
    style: { fontFamily: G.FONT_BODY, fontSize: 11, fill: G.C.inkDim, wordWrap: true, wordWrapWidth: w - 60, lineHeight: 13 },
  });
  desc.x = 46; desc.y = 42;
  cc.addChild(g, icon, title, desc, chip, chipText);
  if (fact.link) {
    const arr = new PIXI.Text({ text: '↗', style: { fontSize: 11, fill: G.C.tealDark } });
    arr.x = w - 16; arr.y = 50;
    cc.addChild(arr);
    cc.on('pointertap', () => window.open(fact.link, '_blank'));
  }
  cc.on('pointerover', () => draw(true));
  cc.on('pointerout', () => draw(false));
  cc.h = Math.max(70, desc.y + desc.height + 8);   // высота строки подгоняется под описание
  draw(false);                                     // фон под фактическую высоту
  return cc;
};

// «Резюме целиком»: три колонки, все разделы на одном экране
G.ui.fullResume = function ({ onClose }) {
  const c = new PIXI.Container();
  c.zIndex = 70;
  c.eventMode = 'static';
  const w = 1100, h = 560;
  c.x = G.W / 2; c.y = G.H / 2;

  const sheet = G.ui.parchment(w, h);
  const g = new PIXI.Graphics();
  G.ui.fancyFrame(g, w, h);
  const grain = G.viz.grain(w, h, 0.045);
  grain.x = -w / 2; grain.y = -h / 2;
  c.addChild(sheet, g, grain);

  const head = new PIXI.Text({
    text: G.t('fr_title'),
    style: { fontFamily: G.FONT_TITLE, fontSize: 26, fill: G.C.ink, letterSpacing: 1.5 },
  });
  head.x = -w / 2 + 36; head.y = -h / 2 + 20;
  const flour = new PIXI.Graphics();
  flour.moveTo(-w / 2 + 36, -h / 2 + 58).lineTo(w / 2 - 36, -h / 2 + 58)
    .stroke({ width: 2, color: G.C.goldDark, alpha: 0.5 });
  flour.moveTo(-w / 2 + 36, -h / 2 + 58).lineTo(-w / 2 + 130, -h / 2 + 58)
    .stroke({ width: 3, color: G.C.gold });
  c.addChild(head, flour);

  // три колонки: [кузница+верфь] [камень] [тинг + контакты]
  const cols = [[G.BUILDINGS[0], G.BUILDINGS[1]], [G.BUILDINGS[2]], [G.BUILDINGS[3]]];
  const colX = [-w / 2 + 34, -w / 2 + 34 + 352, -w / 2 + 34 + 704];
  const colW = 330;
  let rowIdx = 0;
  cols.forEach((sections, ci) => {
    let y = -h / 2 + 76;
    for (const def of sections) {
      const short = G.t(def.titleKey).split('·').pop().trim();
      const st = new PIXI.Text({
        text: short,
        style: { fontFamily: G.FONT_TITLE, fontSize: 15, fill: G.C.goldDark, letterSpacing: 1 },
      });
      st.x = colX[ci]; st.y = y;
      const line = new PIXI.Graphics();
      line.moveTo(colX[ci], y + 22).lineTo(colX[ci] + colW, y + 22)
        .stroke({ width: 1.5, color: G.C.goldDark, alpha: 0.45 });
      c.addChild(st, line);
      y += 30;
      for (const f of def.facts) {
        const row = G.ui.factRow(f, colW);
        row.x = colX[ci]; row.y = y;
        row.alpha = 0;
        c.addChild(row);
        const delay = 200 + rowIdx * 45;
        setTimeout(() => { if (!row.destroyed) G.tween(row, { alpha: 1 }, 240, null, G.easeOut); }, delay);
        rowIdx++;
        y += (row.h || 70) + 6;
      }
      y += 10;
    }
    // контакты в третьей колонке
    if (ci === 2) {
      const contacts = [
        { label: G.t('sheet_mail'), primary: true, onClick: () => {
            const subject = encodeURIComponent('Резюме: гейм-дизайнер — ' + G.CONFIG.name);
            location.href = 'mailto:' + G.CONFIG.email + '?subject=' + subject;
          } },
        { label: G.t('sheet_pdf'), primary: false, onClick: () => {
            const a = document.createElement('a');
            a.href = G.CONFIG.pdf;
            a.download = 'CV_Yaroslav_Kukar.pdf';
            document.body.appendChild(a);
            a.click();
            a.remove();
          } },
        { label: G.t('sheet_github'), primary: false, onClick: () => window.open(G.CONFIG.github, '_blank') },
      ];
      for (const cinfo of contacts) {
        y += 6;
        const b = G.ui.button({ label: cinfo.label, x: colX[2] + colW / 2, y: y + 22, w: colW, h: 46, primary: cinfo.primary, small: true, onClick: cinfo.onClick });
        c.addChild(b);
        y += 52;
      }
    }
  });

  if (onClose) c.addChild(G.ui.button({ label: '✕', x: w / 2 - 26, y: -h / 2 + 26, w: 38, h: 38, small: true, onClick: onClose }));
  c.alpha = 0;
  c.scale.set(0.95);
  G.tween(c, { alpha: 1 }, 220, null, G.easeOut);
  G.tween(c.scale, { x: 1, y: 1 }, 220, null, G.easeOut);
  G.fxParticles.burst(c.x, c.y - h / 2 + 30, G.C.gold, 14, { size: 2.5, speed: 100, ttl: 800, grav: 80 });
  G.sfx.play('chime');
  return c;
};

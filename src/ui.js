// UI-хелперы: кнопки, панели-свитки, подписи, переключатель языка
window.G = window.G || {};

G.ui = {
  // Кнопка: контейнер с фоном, тенью, hover/press состояниями
  button({ label, x, y, w = 260, h = 56, primary = false, small = false, onClick }) {
    const c = new PIXI.Container();
    c.x = x; c.y = y; c.eventMode = 'static'; c.cursor = 'pointer';
    const shadow = new PIXI.Graphics();
    shadow.roundRect(-w / 2 + 3, -h / 2 + 5, w, h, 10).fill({ color: 0x000000, alpha: 0.35 });
    const g = new PIXI.Graphics();
    const draw = (state) => {
      // state: 0 обычная, 1 нажата, 2 hover
      g.clear();
      const bg = primary ? (state === 2 ? 0xf5b959 : G.C.gold) : (state === 2 ? 0x243044 : G.C.panel);
      g.roundRect(-w / 2, -h / 2, w, h, 10).fill(bg);
      g.roundRect(-w / 2, -h / 2, w, h, 10).stroke({ width: 2, color: primary ? G.C.goldDark : G.C.hexBorder, alpha: 1 });
      c.y = y + (state === 1 ? 2 : 0);
      shadow.visible = state !== 1;
    };
    draw(0);
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
    c.addChild(shadow, g, t);
    c.on('pointerover', () => draw(2));
    c.on('pointerout', () => draw(0));
    c.on('pointerdown', () => { G.sfx.play('blip'); draw(1); });
    c.on('pointerup', () => draw(2));
    c.on('pointerupoutside', () => draw(0));
    c.on('pointertap', () => onClick && onClick());
    c.refreshLabel = (v) => { t.text = v; };
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

  // Карточка факта в гвинт-стиле: иконка, заголовок, описание, стат-чип
  factCard(fact, x, y, w = 300, h = 128) {
    const L = fact[G.lang] || fact.ru;
    const cc = new PIXI.Container();
    cc.x = x; cc.y = y;
    cc.eventMode = 'static';
    cc.cursor = fact.link ? 'pointer' : 'default';
    const g = new PIXI.Graphics();
    // угловые засечки как у гвинт-карт
    const corner = (cx, cy, sx, sy) => {
      g.moveTo(cx, cy + 14 * sy).lineTo(cx, cy).lineTo(cx + 14 * sx, cy)
        .stroke({ width: 2.5, color: G.C.gold, alpha: 0.9 });
    };
    const draw = (hover) => {
      g.clear();
      g.roundRect(0, 0, w, h, 10).fill(hover ? 0x20304a : G.C.panel);
      g.roundRect(0, 0, w, h, 10).stroke({ width: 1.5, color: G.C.hexBorder });
      corner(4, 4, 1, 1); corner(w - 4, 4, -1, 1);
      corner(4, h - 4, 1, -1); corner(w - 4, h - 4, -1, -1);
    };
    draw(false);
    // иконка в тёмном круге
    const iconBg = new PIXI.Graphics();
    iconBg.circle(26, 26, 19).fill(0x141c29);
    iconBg.circle(26, 26, 19).stroke({ width: 1.5, color: G.C.goldDark, alpha: 0.7 });
    const icon = new PIXI.Text({ text: fact.icon, style: { fontSize: 19 } });
    icon.anchor.set(0.5);
    icon.x = 26; icon.y = 26;
    // заголовок и описание
    const title = new PIXI.Text({
      text: L.t,
      style: { fontFamily: G.FONT_TITLE, fontSize: 15, fill: G.C.gold, letterSpacing: 0.3 },
    });
    title.x = 54; title.y = 10;
    const desc = new PIXI.Text({
      text: L.d,
      style: { fontFamily: G.FONT_BODY, fontSize: 12.5, fill: G.C.text, wordWrap: true, wordWrapWidth: w - 68, lineHeight: 16 },
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
      const arr = new PIXI.Text({ text: '↗', style: { fontSize: 13, fill: G.C.heroBlue } });
      arr.x = w - 18; arr.y = 4;
      cc.addChild(arr);
      cc.on('pointertap', () => window.open(fact.link, '_blank'));
    }
    cc.addChild(g, iconBg, icon, title, desc, chip);
    cc.on('pointerover', () => draw(true));
    cc.on('pointerout', () => draw(false));
    return cc;
  },

  // Панель здания: заголовок + сетка карточек фактов с каскадом
  buildingPanel({ title, facts, link, onClose }) {
    const c = new PIXI.Container();
    c.zIndex = 50;
    c.eventMode = 'static';
    const cols = 2, gap = 14;
    const cw = 300, ch = 128;
    const rows = Math.ceil(facts.length / cols);
    const w = cols * cw + (cols - 1) * gap + 48;
    const h = 86 + rows * (ch + gap) + 26;
    c.x = G.W / 2; c.y = G.H / 2 - 10;

    const shadow = new PIXI.Graphics();
    shadow.roundRect(-w / 2 + 7, -h / 2 + 9, w, h, 16).fill({ color: 0x000000, alpha: 0.5 });
    const g = new PIXI.Graphics();
    g.roundRect(-w / 2, -h / 2, w, h, 16).fill({ color: 0x131b29, alpha: 0.99 });
    g.roundRect(-w / 2, -h / 2, w, h, 16).stroke({ width: 2, color: G.C.gold });
    // заголовок с подчёркиванием-росчерком
    const tt = new PIXI.Text({
      text: title,
      style: { fontFamily: G.FONT_TITLE, fontSize: 24, fill: G.C.gold, letterSpacing: 1 },
    });
    tt.x = -w / 2 + 26; tt.y = -h / 2 + 20;
    const flour = new PIXI.Graphics();
    flour.moveTo(-w / 2 + 26, -h / 2 + 56).lineTo(w / 2 - 26, -h / 2 + 56)
      .stroke({ width: 2, color: G.C.goldDark, alpha: 0.55 });
    flour.moveTo(-w / 2 + 26, -h / 2 + 56).lineTo(-w / 2 + 96, -h / 2 + 56)
      .stroke({ width: 3, color: G.C.gold });
    G.ui.fancyFrame(g, w, h);
    const grain = G.viz.grain(w, h, 0.04);
    grain.x = -w / 2; grain.y = -h / 2;
    c.addChild(shadow, g, grain, tt, flour);

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

  // Лист кандидата: аватар, характеристики с анимированными полосами, чипы, контакты
  characterSheet({ onClose }) {
    const c = new PIXI.Container();
    c.zIndex = 60;
    c.eventMode = 'static';
    const w = 780, h = 620;
    c.x = G.W / 2; c.y = G.H / 2;
    const shadow = new PIXI.Graphics();
    shadow.roundRect(-w / 2 + 8, -h / 2 + 10, w, h, 18).fill({ color: 0x000000, alpha: 0.55 });
    const g = new PIXI.Graphics();
    g.roundRect(-w / 2, -h / 2, w, h, 18).fill({ color: 0x131b29, alpha: 0.99 });
    g.roundRect(-w / 2, -h / 2, w, h, 18).stroke({ width: 2.5, color: G.C.gold });
    g.roundRect(-w / 2 + 10, -h / 2 + 10, w - 20, h - 20, 12).stroke({ width: 1, color: G.C.goldDark, alpha: 0.4 });
    c.addChild(shadow, g);
    const grain = G.viz.grain(w, h, 0.045);
    grain.x = -w / 2; grain.y = -h / 2;
    c.addChild(shadow, g, grain);
    // аватар: викинг с кольчугой, косами и щитом
    const avatar = new PIXI.Container();
    avatar.x = -w / 2 + 140; avatar.y = -30;
    const halo = new PIXI.Graphics();
    halo.circle(0, 10, 92).fill({ color: G.C.gold, alpha: 0.06 });
    halo.circle(0, 10, 72).fill({ color: G.C.gold, alpha: 0.05 });
    const av = new PIXI.Graphics();
    av.scale.set(3.1);
    const OUT = 0x0a0f18;
    av.circle(0, 32, 18).fill({ color: 0x000000, alpha: 0.3 });
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
    avatar.addChild(halo, av);
    c.addChild(avatar);

    // имя и роль
    const name = new PIXI.Text({
      text: G.CONFIG.name,
      style: { fontFamily: G.FONT_TITLE, fontSize: 36, fill: G.C.text, letterSpacing: 2 },
    });
    name.x = -w / 2 + 236; name.y = -h / 2 + 42;
    const role = new PIXI.Text({
      text: G.CONFIG.role[G.lang] + ' · playable-ads',
      style: { fontFamily: G.FONT_BODY, fontSize: 17, fill: G.C.gold, letterSpacing: 1 },
    });
    role.x = name.x; role.y = -h / 2 + 92;
    const lore = new PIXI.Text({
      text: G.SHEET.lore[G.lang],
      style: { fontFamily: G.FONT_BODY, fontSize: 13.5, fill: G.C.textDim, wordWrap: true, wordWrapWidth: w - 320, lineHeight: 18 },
    });
    lore.x = name.x; lore.y = -h / 2 + 122;
    c.addChild(name, role, lore);

    // характеристики: полосы заполняются каскадом
    const sx = name.x, sy = -h / 2 + 186;
    const statsHead = new PIXI.Text({
      text: G.t('sheet_stats'),
      style: { fontFamily: G.FONT_TITLE, fontSize: 16, fill: G.C.gold, letterSpacing: 1.5 },
    });
    statsHead.x = sx; statsHead.y = sy - 6;
    c.addChild(statsHead);
    const barW = 300;
    G.SHEET.stats[G.lang].forEach(([label, val], i) => {
      const yy = sy + 46 + i * 38;
      const lt = new PIXI.Text({
        text: label,
        style: { fontFamily: G.FONT_BODY, fontSize: 13.5, fill: G.C.text },
      });
      lt.x = sx; lt.y = yy - 17;
      const barBg = new PIXI.Graphics();
      barBg.roundRect(sx, yy, barW, 10, 5).fill(0x0d1420);
      barBg.roundRect(sx, yy, barW, 10, 5).stroke({ width: 1, color: G.C.hexBorder });
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
      label: G.t('sheet_all'), x: sx + 280, y: chipY + 44, w: 480, h: 44, small: true,
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
    const mailBtn = G.ui.button({
      label: G.t('sheet_mail'), x: -212, y: chipY + 112, w: 250, h: 48, primary: true, small: true,
      onClick: () => {
        const subject = encodeURIComponent('Резюме: гейм-дизайнер — ' + G.CONFIG.name);
        const pdfUrl = location.href.replace(/[^/]*$/, '') + G.CONFIG.pdf;
        const body = encodeURIComponent('Здравствуйте! Резюме (PDF): ' + pdfUrl + ' Портфолио: ' + G.CONFIG.github);
        location.href = 'mailto:' + G.CONFIG.email + '?subject=' + subject + '&body=' + body;
      },
    });
    const pdfBtn = G.ui.button({
      label: G.t('sheet_pdf'), x: 22, y: chipY + 112, w: 180, h: 48, small: true,
      onClick: () => {
        const a = document.createElement('a');
        a.href = G.CONFIG.pdf;
        a.download = 'CV_Yaroslav_Kukar.pdf';
        document.body.appendChild(a);
        a.click();
        a.remove();
      },
    });
    const ghBtn = G.ui.button({
      label: G.t('sheet_github'), x: 232, y: chipY + 112, w: 200, h: 48, small: true,
      onClick: () => window.open(G.CONFIG.github, '_blank'),
    });
    c.addChild(mailBtn, pdfBtn, ghBtn);

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


// Компактная строка факта для «Резюме целиком»
G.ui.factRow = function (fact, w = 400) {
  const L = fact[G.lang] || fact.ru;
  const cc = new PIXI.Container();
  cc.eventMode = 'static';
  if (fact.link) cc.cursor = 'pointer';
  const g = new PIXI.Graphics();
  const draw = (hover) => {
    g.clear();
    g.roundRect(0, 0, w, 58, 8).fill(hover ? 0x20304a : G.C.panel);
    g.roundRect(0, 0, w, 58, 8).stroke({ width: 1.5, color: hover ? G.C.gold : G.C.hexBorder });
    g.circle(24, 29, 14).fill(0x141c29);
    g.circle(24, 29, 14).stroke({ width: 1, color: G.C.goldDark, alpha: 0.6 });
  };
  draw(false);
  const icon = new PIXI.Text({ text: fact.icon, style: { fontSize: 14 } });
  icon.anchor.set(0.5);
  icon.x = 24; icon.y = 29;
  const title = new PIXI.Text({
    text: L.t,
    style: { fontFamily: G.FONT_TITLE, fontSize: 13.5, fill: G.C.gold },
  });
  title.x = 46; title.y = 8;
  const desc = new PIXI.Text({
    text: L.d,
    style: { fontFamily: G.FONT_BODY, fontSize: 11, fill: G.C.textDim, wordWrap: true, wordWrapWidth: w - 175, lineHeight: 13 },
  });
  desc.x = 46; desc.y = 27;
  const chipText = new PIXI.Text({
    text: L.s,
    style: { fontFamily: G.FONT_TITLE, fontSize: 11, fill: 0xffe4a8 },
  });
  const chip = new PIXI.Graphics();
  chip.roundRect(w - chipText.width - 20, 18, chipText.width + 14, 21, 10)
    .fill({ color: 0x241c12 })
    .stroke({ width: 1, color: G.C.goldDark });
  chipText.x = w - chipText.width - 13; chipText.y = 23;
  cc.addChild(g, icon, title, desc, chip, chipText);
  if (fact.link) {
    const arr = new PIXI.Text({ text: '↗', style: { fontSize: 11, fill: G.C.heroBlue } });
    arr.x = w - 16; arr.y = 2;
    cc.addChild(arr);
    cc.on('pointertap', () => window.open(fact.link, '_blank'));
  }
  cc.on('pointerover', () => draw(true));
  cc.on('pointerout', () => draw(false));
  return cc;
};

// «Резюме целиком»: все разделы на одном экране
G.ui.fullResume = function ({ onClose }) {
  const c = new PIXI.Container();
  c.zIndex = 70;
  c.eventMode = 'static';
  const w = 900, h = 640;
  c.x = G.W / 2; c.y = G.H / 2 - 10;

  const shadow = new PIXI.Graphics();
  shadow.roundRect(-w / 2 + 8, -h / 2 + 10, w, h, 18).fill({ color: 0x000000, alpha: 0.55 });
  const g = new PIXI.Graphics();
  g.roundRect(-w / 2, -h / 2, w, h, 18).fill({ color: 0x131b29, alpha: 0.99 });
  g.roundRect(-w / 2, -h / 2, w, h, 18).stroke({ width: 2.5, color: G.C.gold });
  g.roundRect(-w / 2 + 10, -h / 2 + 10, w - 20, h - 20, 12).stroke({ width: 1, color: G.C.goldDark, alpha: 0.4 });
  const grain = G.viz.grain(w, h, 0.045);
  grain.x = -w / 2; grain.y = -h / 2;
  c.addChild(shadow, g, grain);

  const head = new PIXI.Text({
    text: G.t('fr_title'),
    style: { fontFamily: G.FONT_TITLE, fontSize: 26, fill: G.C.gold, letterSpacing: 1.5 },
  });
  head.x = -w / 2 + 36; head.y = -h / 2 + 22;
  const flour = new PIXI.Graphics();
  flour.moveTo(-w / 2 + 36, -h / 2 + 60).lineTo(w / 2 - 36, -h / 2 + 60)
    .stroke({ width: 2, color: G.C.goldDark, alpha: 0.5 });
  flour.moveTo(-w / 2 + 36, -h / 2 + 60).lineTo(-w / 2 + 130, -h / 2 + 60)
    .stroke({ width: 3, color: G.C.gold });
  c.addChild(head, flour);

  const cols = [[G.BUILDINGS[0], G.BUILDINGS[1]], [G.BUILDINGS[2], G.BUILDINGS[3]]];
  const colX = [-w / 2 + 36, 24];
  let rowIdx = 0;
  cols.forEach((sections, ci) => {
    let y = -h / 2 + 82;
    for (const def of sections) {
      const short = G.t(def.titleKey).split('·').pop().trim();
      const st = new PIXI.Text({
        text: short,
        style: { fontFamily: G.FONT_TITLE, fontSize: 16, fill: G.C.gold, letterSpacing: 1 },
      });
      st.x = colX[ci]; st.y = y;
      const line = new PIXI.Graphics();
      line.moveTo(colX[ci], y + 24).lineTo(colX[ci] + 400, y + 24)
        .stroke({ width: 1.5, color: G.C.goldDark, alpha: 0.45 });
      c.addChild(st, line);
      y += 32;
      for (const f of def.facts) {
        const row = G.ui.factRow(f, 400);
        row.x = colX[ci]; row.y = y;
        row.alpha = 0;
        c.addChild(row);
        const delay = 200 + rowIdx * 55;
        setTimeout(() => { if (!row.destroyed) G.tween(row, { alpha: 1 }, 240, null, G.easeOut); }, delay);
        rowIdx++;
        y += 66;
      }
      y += 12;
    }
  });

  // контакты внизу
  const mailBtn = G.ui.button({
    label: G.t('sheet_mail'), x: -212, y: h / 2 - 76, w: 250, h: 48, primary: true, small: true,
    onClick: () => {
      const subject = encodeURIComponent('Резюме: гейм-дизайнер — ' + G.CONFIG.name);
      location.href = 'mailto:' + G.CONFIG.email + '?subject=' + subject;
    },
  });
  const pdfBtn = G.ui.button({
    label: G.t('sheet_pdf'), x: 22, y: h / 2 - 76, w: 180, h: 48, small: true,
    onClick: () => {
      const a = document.createElement('a');
      a.href = G.CONFIG.pdf;
      a.download = 'CV_Yaroslav_Kukar.pdf';
      document.body.appendChild(a);
      a.click();
      a.remove();
    },
  });
  const ghBtn = G.ui.button({
    label: G.t('sheet_github'), x: 232, y: h / 2 - 76, w: 200, h: 48, small: true,
    onClick: () => window.open(G.CONFIG.github, '_blank'),
  });
  c.addChild(mailBtn, pdfBtn, ghBtn);

  if (onClose) c.addChild(G.ui.button({ label: '✕', x: w / 2 - 26, y: -h / 2 + 26, w: 38, h: 38, small: true, onClick: onClose }));
  c.alpha = 0;
  c.scale.set(0.95);
  G.tween(c, { alpha: 1 }, 220, null, G.easeOut);
  G.tween(c.scale, { x: 1, y: 1 }, 220, null, G.easeOut);
  G.fxParticles.burst(c.x, c.y - h / 2 + 30, G.C.gold, 14, { size: 2.5, speed: 100, ttl: 800, grav: 80 });
  G.sfx.play('chime');
  return c;
};

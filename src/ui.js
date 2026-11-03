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
    G.tween(c, { alpha: 1, scale: 1 }, 180, null, G.easeOut);
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

  // Всплывающий текст урона/лечения
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

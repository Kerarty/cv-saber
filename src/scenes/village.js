// Деревня-хаб: постройки = разделы резюме, причал = старт волны
window.G = window.G || {};

G.scenes.village = function (params) {
  const c = new PIXI.Container();
  // «Сразу к резюме»: все постройки открыты (до их создания!)
  if (params.showAll && G.progress === 0) G.previewAll = true;

  // Небо и земля: градиент + луна
  const bg = new PIXI.Graphics();
  bg.rect(0, 0, G.W, 340).fill(G.viz.gradient(0, 0, 0, 340, [
    [0, 0x070b13], [0.6, 0x0d1420], [1, 0x16273f],
  ]));
  bg.rect(0, 340, G.W, G.H - 340).fill(0x1a2738);
  // снежная равнина с намётом холмов
  bg.ellipse(G.W / 2, 730, 940, 140).fill(0x243449);
  bg.ellipse(200, 750, 420, 110).fill(0x28394f);
  bg.ellipse(1100, 745, 380, 100).fill(0x20303f);
  c.addChild(bg);

  const aur = G.viz.aurora(c, { y: 22, alpha: 0.1, index: c.children.length - 1 });

  const moonGlow = new PIXI.Graphics();
  moonGlow.circle(180, 110, 70).fill({ color: 0xcfe0f0, alpha: 0.05 });
  moonGlow.circle(180, 110, 48).fill({ color: 0xcfe0f0, alpha: 0.07 });
  const moon = new PIXI.Graphics();
  moon.circle(180, 110, 30).fill(0xdfe9f2);
  moon.circle(170, 100, 5).fill({ color: 0xc2cfdd, alpha: 0.7 });
  moon.circle(190, 120, 4).fill({ color: 0xc2cfdd, alpha: 0.6 });
  c.addChild(moonGlow, moon);

  // закрыть открытые панели/листы — чтобы не наслаивались
  function closeOverlays() {
    for (const k of [...c.children]) {
      if (k.zIndex >= 50) { c.removeChild(k); k.destroy({ children: true }); }
    }
  }

  const stars = new PIXI.Graphics();
  for (let i = 0; i < 36; i++) {
    stars.circle(Math.random() * G.W, Math.random() * 220, Math.random() * 1.1 + 0.4)
      .fill({ color: G.C.snow, alpha: 0.2 + Math.random() * 0.4 });
  }
  c.addChild(stars);

  // Заголовок и подсказка
  const head = new PIXI.Text({
    text: G.t('village_name'),
    style: { fontFamily: G.FONT_TITLE, fontSize: 40, fill: G.C.gold, letterSpacing: 3, stroke: { color: 0x000000, width: 3 } },
  });
  head.anchor.set(0.5);
  head.x = G.W / 2; head.y = 52;
  const hint = new PIXI.Text({
    text: G.t('village_hint'),
    style: { fontFamily: G.FONT_BODY, fontSize: 16, fill: G.C.textDim },
  });
  hint.anchor.set(0.5);
  hint.x = G.W / 2; hint.y = 96;
  const tag = new PIXI.Text({
    text: G.CONFIG.name + ' · ' + G.CONFIG.role[G.lang],
    style: { fontFamily: G.FONT_BODY, fontSize: 15, fill: G.C.textDim, letterSpacing: 1 },
  });
  tag.anchor.set(0, 1);
  tag.x = 24; tag.y = G.H - 14;
  c.addChild(head, hint, tag);

  // --- Постройки ---
  const layout = [
    { id: 'forge', x: 250, y: 430, need: 0 },
    { id: 'shipyard', x: 520, y: 480, need: 1 },
    { id: 'stone', x: 780, y: 450, need: 2 },
    { id: 'thing', x: 1040, y: 470, need: 3 },
  ];
  const torches = [];

  for (const b of layout) {
    const def = G.BUILDINGS.find(x => x.id === b.id);
    const open = G.previewAll || G.progress >= b.need;
    const bld = new PIXI.Container();
    bld.x = b.x; bld.y = b.y;
    bld.eventMode = 'static';
    bld.cursor = 'pointer';

    // спрайтовое здание (Tiny Swords) или процедурный фолбэк
    const BT = { forge: 'b_barracks', shipyard: 'b_house', stone: 'b_tower', thing: 'b_monastery' };
    let sprBuilt = false;
    if (G.TEX && G.TEX[BT[b.id]]) {
      const t = G.TEX[BT[b.id]];
      const sp = new PIXI.Sprite(t.frames[0]);
      sp.anchor.set(0.5, 1);
      const sc = 170 / t.frames[0].height;
      sp.scale.set(sc, sc);
      sp.y = 42;
      sp.alpha = open ? 1 : 0.45;
      bld.addChild(sp);
      sprBuilt = true;
      // тёплый свет у открытой постройки
      if (open) {
        const glow = new PIXI.Graphics();
        glow.circle(0, 20, 60).fill({ color: G.C.gold, alpha: 0.06 });
        glow.circle(0, 20, 40).fill({ color: G.C.gold, alpha: 0.05 });
        bld.addChildAt(glow, 0);
      }
    }
    const g = new PIXI.Graphics();
    if (!sprBuilt) drawBuilding(g, b.id, open);
    else { g.ellipse(0, 44, 62, 10).fill({ color: 0x000000, alpha: 0.25 }); }

    // табличка с названием раздела — текст на деревянной подложке
    const label = new PIXI.Text({
      text: G.t(def.titleKey).split('·')[0].trim(),
      style: { fontFamily: G.FONT_BODY, fontSize: 15, fill: open ? G.C.text : G.C.textDim, fontWeight: 'bold' },
    });
    label.anchor.set(0.5, 0);
    const plate = new PIXI.Graphics();
    plate.roundRect(-label.width / 2 - 12, 70, label.width + 24, 26, 6)
      .fill({ color: 0x2c2216, alpha: 0.92 })
      .stroke({ width: 1.5, color: 0x4a3a24 });
    label.y = 74;

    // замок на закрытой
    const lock = new PIXI.Graphics();
    if (!open) {
      lock.roundRect(-9, -6, 18, 14, 3).fill(0x0d1420);
      lock.arc(0, -6, 7, Math.PI, 0).stroke({ width: 4, color: 0x0d1420 });
    }

    // факел на открытой
    let torch = null;
    if (open) {
      torch = new PIXI.Container();
      const stick = new PIXI.Graphics();
      stick.rect(-2, -26, 4, 26).fill(0x2c2216);
      const flame = new PIXI.Graphics();
      flame.circle(0, -30, 6).fill(G.C.gold);
      flame.circle(0, -31, 3).fill(0xffd98a);
      torch.addChild(stick, flame);
      torch.x = 0; torch.y = -66;
      torches.push(flame);
    }

    bld.addChild(g, plate, label, lock);
    if (torch) bld.addChild(torch);

    bld.on('pointertap', () => {
      if (!open) { G.sfx.play('thud'); G.ui.toast(G.t('village_locked', { n: b.need })); return; }
      G.sfx.play('blip');
      closeOverlays();
      const p = G.ui.buildingPanel({
        title: G.t(def.titleKey),
        facts: def.facts,
        link: def.link,
        onClose: () => {
          c.removeChild(p);
          p.destroy({ children: true });
        },
      });
      c.addChild(p);
    });

    c.addChild(bld);
  }

  // пропсы: бочки, деревья, камни
  const props = new PIXI.Graphics();
  drawBarrel(props, 590, 520);
  drawBarrel(props, 612, 542);
  drawBarrel(props, 975, 530);
  c.addChild(props);
  if (G.TEX) {
    const put = (name, x, y, hgt) => {
      const t = G.TEX[name];
      if (!t) return;
      const sp = new PIXI.Sprite(t.frames[0]);
      sp.anchor.set(0.5, 1);
      sp.scale.set(hgt / t.frames[0].height, hgt / t.frames[0].height);
      sp.x = x; sp.y = y;
      c.addChild(sp);
    };
    put('tree1', 60, 430, 150);
    put('tree1', 1200, 420, 130);
    put('rock1', 680, 560, 40);
    put('rock2', 1100, 555, 36);
    put('rock3', 320, 555, 34);
  }

  // Причал с драккаром — левый угол, вдали от кнопок
  const dock = new PIXI.Container();
  dock.x = 130; dock.y = 616;
  const pierG = new PIXI.Graphics();
  pierG.rect(-90, 8, 200, 12).fill(0x3a2d1c);
  pierG.rect(-78, 18, 10, 26).fill(0x2c2216);
  pierG.rect(56, 18, 10, 26).fill(0x2c2216);
  const ship = G.ui.drawDrakkar(0.75);
  ship.y = -14;
  dock.addChild(pierG, ship);
  c.addChild(dock);

  const nextWave = Math.min(G.progress + 1, 3);
  const isBoss = nextWave === 3;
  const raidBtn = G.ui.button({
    label: isBoss ? G.t('village_final') : G.t('village_raid') + ' · ' + G.t('village_wave', { n: nextWave }),
    x: G.W / 2 + 160, y: G.H - 46, w: 380, h: 58, primary: true,
    onClick: () => G.setScene('battle', { wave: G.progress }),
  });
  const sheetBtn = G.ui.button({
    label: G.t('village_sheet'), x: G.W / 2 - 260, y: G.H - 46, w: 300, h: 58,
    onClick: () => {
      G.sfx.play('blip');
      closeOverlays();
      const p = G.ui.characterSheet({
        onClose: () => { c.removeChild(p); p.destroy({ children: true }); },
      });
      c.addChild(p);
    },
  });
  c.addChild(raidBtn, sheetBtn);

  // вошли через «Сразу к резюме» — сразу показать лист кандидата
  if (params.showAll && !params.sheetShown) {
    setTimeout(() => {
      if (c.destroyed) return;
      // «Резюме целиком» уже открыт (например, через «Пропустить») — лист не нужен
      if (G.scene && G.scene.children.some(k => k.zIndex === 70)) return;
      const p = G.ui.characterSheet({
        onClose: () => { c.removeChild(p); p.destroy({ children: true }); },
      });
      c.addChild(p);
    }, 500);
  }

  const langT = G.ui.langToggle();
  c.addChild(langT);

  // Возвращение после победы в волне — тост о новой постройке
  if (params.unlocked) {
    const def = G.BUILDINGS[params.unlocked - 1];
    setTimeout(() => { if (!c.destroyed) G.ui.toast(G.t('village_unlocked', { n: G.t(def.titleKey).split('·')[0].trim() }), 2200); }, 400);
  }

  // Анимация: качание драккара, мерцание факелов, дым из кузницы
  let lastSmoke = 0;
  c.tick = (dtMs) => {
    aur.update();
    const t = performance.now() / 1000;
    ship.rotation = Math.sin(t * 1.4) * 0.03;
    for (let i = 0; i < torches.length; i++) {
      torches[i].alpha = 0.8 + 0.2 * Math.sin(t * (7 + i) + i * 2);
      torches[i].scale.set(1 + 0.08 * Math.sin(t * 11 + i));
    }
    // дымок из трубы кузницы
    if (t - lastSmoke > 0.6) {
      lastSmoke = t;
      G.fxParticles.burst(274, 372, 0x8a94a0, 1, { size: 3.5, speed: 8, up: true, grav: -14, ttl: 1900 });
    }
  };

  return c;
};

// Процедурные постройки деревни v2: черепица, штендеры, снег, пропсы
function drawBuilding(g, id, open) {
  const wood = open ? 0x4a3a24 : 0x33291a;
  const woodDark = open ? 0x33291a : 0x241c12;
  const roof = open ? 0x6e2f26 : 0x3a2420;
  const roofLight = open ? 0x833b30 : 0x4a2d28;
  const outline = 0x0a0f18;
  g.ellipse(0, 44, 72, 12).fill({ color: 0x000000, alpha: 0.3 });
  g.ellipse(0, 42, 58, 9).fill({ color: 0xdfe9f2, alpha: 0.14 });

  const shingles = (x0, y0, x1, y1, rows) => {
    for (let r = 1; r <= rows; r++) {
      const yy = y0 + (y1 - y0) * (r / rows);
      g.moveTo(x0, yy).lineTo(x1, yy).stroke({ width: 1.5, color: roofLight, alpha: 0.7 });
    }
  };

  switch (id) {
    case 'forge':
      g.rect(-46, -20, 92, 60).fill(wood).stroke({ width: 2, color: outline });
      g.moveTo(-46, -20).lineTo(-30, 40).moveTo(46, -20).lineTo(30, 40).moveTo(-46, 8).lineTo(46, 8)
        .stroke({ width: 3, color: woodDark });
      g.poly([-58, -20, 0, -64, 58, -20]).fill(roof).stroke({ width: 2, color: outline });
      shingles(-44, -34, 44, -34, 2);
      g.rect(18, -52, 12, 26).fill(woodDark).stroke({ width: 2, color: outline });
      g.moveTo(-46, -22).quadraticCurveTo(0, -60, 46, -22).lineTo(38, -20).quadraticCurveTo(0, -52, -38, -20)
        .closePath().fill({ color: 0xdfe9f2, alpha: 0.75 });
      if (open) {
        g.rect(-34, -6, 14, 16).fill(0xffd98a).stroke({ width: 1, color: outline });
        g.rect(24, -6, 14, 16).fill(0xffd98a).stroke({ width: 1, color: outline });
        g.rect(-14, 8, 28, 32).fill(0x1a1210);
        g.circle(0, 22, 9).fill(G.C.gold);
        g.circle(0, 22, 5).fill(0xffd98a);
        g.roundRect(-8, -16, 16, 10, 2).fill(0x241c12).stroke({ width: 1, color: G.C.goldDark });
        g.moveTo(-3, -8).lineTo(3, -8).lineTo(-1, -11).lineTo(5, -11).stroke({ width: 1.2, color: G.C.gold });
      }
      break;
    case 'shipyard':
      g.rect(-60, 18, 120, 14).fill(woodDark);
      g.moveTo(-52, 14).quadraticCurveTo(0, 44, 52, 14).lineTo(40, 8).lineTo(-40, 8).closePath()
        .fill(wood).stroke({ width: 2, color: outline });
      g.rect(-3, -52, 6, 62).fill(woodDark);
      if (open) {
        g.rect(-26, -48, 52, 30).fill({ color: 0xcfc4a6, alpha: 0.9 });
        g.rect(-14, -38, 28, 6).fill({ color: 0x8a2f2a, alpha: 0.9 });
        g.moveTo(-26, -48).lineTo(-8, -6).moveTo(26, -48).lineTo(8, -6)
          .stroke({ width: 1, color: 0x8a7a5a, alpha: 0.8 });
        g.circle(-30, -46, 3).fill(0xffd98a);
        g.circle(30, -46, 3).fill(0xffd98a);
      }
      g.rect(58, 4, 14, 14).fill(0x5a452c).stroke({ width: 1.5, color: outline });
      g.moveTo(58, 11).lineTo(72, 11).stroke({ width: 1, color: 0x3a2d1c });
      g.rect(50, -8, 12, 12).fill(0x6b5433).stroke({ width: 1.5, color: outline });
      break;
    case 'stone':
      g.poly([0, -66, 30, -30, 22, 40, -22, 40, -30, -30]).fill(open ? 0x4a5568 : 0x333c4a)
        .stroke({ width: 2, color: outline });
      g.poly([0, -52, 18, -28, 12, 26, -12, 26, -18, -28]).fill(open ? 0x39445a : 0x2a3240);
      g.moveTo(-26, -34).quadraticCurveTo(0, -52, 26, -34).lineTo(20, -30).quadraticCurveTo(0, -46, -20, -30)
        .closePath().fill({ color: 0xdfe9f2, alpha: 0.6 });
      if (open) {
        g.moveTo(-6, -34).lineTo(6, -34).lineTo(-4, -22).lineTo(8, -22).stroke({ width: 3, color: G.C.gold });
        g.moveTo(-8, -6).lineTo(6, -6).lineTo(-6, 10).lineTo(8, 10).stroke({ width: 3, color: G.C.gold });
      }
      g.circle(-34, 38, 6).fill(0x39465c).stroke({ width: 1, color: outline });
      g.circle(-40, 42, 4.5).fill(0x2a3648).stroke({ width: 1, color: outline });
      g.circle(34, 40, 5).fill(0x39465c).stroke({ width: 1, color: outline });
      break;
    case 'thing':
      g.rect(-64, -18, 128, 52).fill(wood).stroke({ width: 2, color: outline });
      g.moveTo(-64, -2).lineTo(64, -2).stroke({ width: 3, color: woodDark });
      g.poly([-74, -18, 0, -60, 74, -18]).fill(roof).stroke({ width: 2, color: outline });
      shingles(-56, -34, 56, -34, 2);
      g.rect(-8, 6, 16, 28).fill(woodDark);
      if (open) {
        g.rect(-48, -4, 12, 14).fill(0xffd98a).stroke({ width: 1, color: outline });
        g.rect(36, -4, 12, 14).fill(0xffd98a).stroke({ width: 1, color: outline });
        for (let i = -2; i <= 2; i++) g.circle(i * 24, 4, 4).fill(G.C.gold);
        g.poly([0, -54, 8, -40, -8, -40]).fill(G.C.gold);
        g.moveTo(-30, -44).lineTo(-30, -60).stroke({ width: 2, color: 0x2c2216 });
        g.poly([-30, -60, -16, -56, -30, -52]).fill(0x8a2f2a);
        g.moveTo(30, -44).lineTo(30, -60).stroke({ width: 2, color: 0x2c2216 });
        g.poly([30, -60, 44, -56, 30, -52]).fill(0x8a2f2a);
        g.rect(-28, 40, 56, 6).fill(0x5a452c).stroke({ width: 1.5, color: outline });
        g.rect(-24, 46, 5, 8).fill(0x3a2d1c);
        g.rect(19, 46, 5, 8).fill(0x3a2d1c);
      } else {
        for (let i = -2; i <= 2; i++) g.circle(i * 24, 4, 4).fill(0x2a2118);
      }
      break;
  }
}

// Бочка-пропс
function drawBarrel(g, x, y) {
  g.rect(x - 7, y - 10, 14, 20).fill(0x6b5433).stroke({ width: 1.5, color: 0x0a0f18 });
  g.rect(x - 7, y - 6, 14, 3).fill(0x4a3a24);
  g.rect(x - 7, y + 3, 14, 3).fill(0x4a3a24);
  g.ellipse(x, y - 10, 7, 2.5).fill(0x8a6d43);
}

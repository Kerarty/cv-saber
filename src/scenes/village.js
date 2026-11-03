// Деревня-хаб: постройки = разделы резюме, причал = старт волны
window.G = window.G || {};

G.scenes.village = function (params) {
  const c = new PIXI.Container();

  // Небо и земля
  const bg = new PIXI.Graphics();
  bg.rect(0, 0, G.W, 250).fill(G.C.bg);
  bg.rect(0, 250, G.W, 90).fill(0x15202f);
  bg.rect(0, 340, G.W, G.H - 340).fill(0x1a2738);
  // снежная равнина
  bg.ellipse(G.W / 2, 720, 900, 130).fill(0x243449);
  c.addChild(bg);

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
    const open = G.progress >= b.need;
    const bld = new PIXI.Container();
    bld.x = b.x; bld.y = b.y;
    bld.eventMode = 'static';
    bld.cursor = 'pointer';

    const g = new PIXI.Graphics();
    const dim = open ? 1 : 0.45;
    drawBuilding(g, b.id, open);

    // табличка с названием раздела
    const label = new PIXI.Text({
      text: G.t(def.titleKey).split('·')[0].trim(),
      style: { fontFamily: G.FONT_BODY, fontSize: 15, fill: open ? G.C.text : G.C.textDim, fontWeight: 'bold' },
    });
    label.anchor.set(0.5, 0);
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

    bld.addChild(g, label, lock);
    if (torch) bld.addChild(torch);

    bld.on('pointertap', () => {
      if (!open) { G.sfx.play('thud'); G.ui.toast(G.t('village_locked', { n: b.need })); return; }
      G.sfx.play('chime');
      const p = G.ui.panel({
        x: G.W / 2, y: 380, w: 620,
        title: G.t(def.titleKey),
        lines: def.lines,
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

  // Причал с драккаром — кнопка в бой
  const dock = new PIXI.Container();
  dock.x = 400; dock.y = 610;
  const pierG = new PIXI.Graphics();
  pierG.rect(-90, 8, 200, 12).fill(0x3a2d1c);
  pierG.rect(-78, 18, 10, 26).fill(0x2c2216);
  pierG.rect(56, 18, 10, 26).fill(0x2c2216);
  const ship = G.ui.drawDrakkar(0.85);
  ship.y = -12;
  dock.addChild(pierG, ship);
  c.addChild(dock);

  const nextWave = Math.min(G.progress + 1, 3);
  const isBoss = nextWave === 3;
  const raidBtn = G.ui.button({
    label: isBoss ? G.t('village_final') : G.t('village_raid') + ' · ' + G.t('village_wave', { n: nextWave }),
    x: G.W / 2, y: G.H - 46, w: 380, h: 58, primary: true,
    onClick: () => G.setScene('battle', { wave: G.progress }),
  });
  c.addChild(raidBtn);

  // «Сразу к резюме»: если пришли с титула — показать все постройки открытыми в этой сессии просмотра
  if (params.showAll && G.progress === 0) G.previewAll = true;

  const langT = G.ui.langToggle();
  c.addChild(langT);

  // Возвращение после победы в волне — тост о новой постройке
  if (params.unlocked) {
    const def = G.BUILDINGS[params.unlocked - 1];
    setTimeout(() => { if (!c.destroyed) G.ui.toast(G.t('village_unlocked', { n: G.t(def.titleKey).split('·')[0].trim() }), 2200); }, 400);
  }

  // Анимация: качание драккара, мерцание факелов
  c.tick = (dtMs) => {
    const t = performance.now() / 1000;
    ship.rotation = Math.sin(t * 1.4) * 0.03;
    for (let i = 0; i < torches.length; i++) {
      torches[i].alpha = 0.8 + 0.2 * Math.sin(t * (7 + i) + i * 2);
      torches[i].scale.set(1 + 0.08 * Math.sin(t * 11 + i));
    }
  };

  return c;
};

// Процедурные постройки деревни
function drawBuilding(g, id, open) {
  const wood = open ? 0x4a3a24 : 0x33291a;
  const woodDark = open ? 0x33291a : 0x241c12;
  const roof = open ? 0x6e2f26 : 0x3a2420;
  switch (id) {
    case 'forge': // кузница: дом с трубой и горном
      g.rect(-46, -20, 92, 60).fill(wood);
      g.poly([-58, -20, 0, -64, 58, -20]).fill(roof);
      g.rect(18, -52, 12, 26).fill(woodDark); // труба
      if (open) {
        g.rect(-14, 8, 28, 32).fill(0x1a1210); // горн
        g.circle(0, 22, 9).fill(G.C.gold);
        g.circle(0, 22, 5).fill(0xffd98a);
      }
      break;
    case 'shipyard': // верфь: стапель с корпусом лодки
      g.rect(-60, 18, 120, 14).fill(woodDark);
      g.moveTo(-52, 18).quadraticCurveTo(0, 52, 52, 18).lineTo(40, 14).lineTo(-40, 14).closePath().fill(wood);
      g.rect(-3, -44, 6, 58).fill(woodDark);
      if (open) g.rect(-26, -40, 52, 30).fill({ color: 0xcfc4a6, alpha: 0.9 });
      g.rect(-14, -30, 28, 6).fill({ color: 0x8a2f2a, alpha: open ? 0.9 : 0.4 });
      break;
    case 'stone': // рунический камень
      g.poly([0, -66, 30, -30, 22, 40, -22, 40, -30, -30]).fill(open ? 0x4a5568 : 0x333c4a);
      g.poly([0, -52, 18, -28, 12, 26, -12, 26, -18, -28]).fill(open ? 0x39445a : 0x2a3240);
      if (open) {
        // руны светятся
        g.moveTo(-6, -34).lineTo(6, -34).lineTo(-4, -22).lineTo(8, -22).stroke({ width: 3, color: G.C.gold });
        g.moveTo(-8, -6).lineTo(6, -6).lineTo(-6, 10).lineTo(8, 10).stroke({ width: 3, color: G.C.gold });
      }
      break;
    case 'thing': // тинг: длинный дом с резными столбами
      g.rect(-64, -18, 128, 52).fill(wood);
      g.poly([-74, -18, 0, -60, 74, -18]).fill(roof);
      g.rect(-8, 6, 16, 28).fill(woodDark);
      for (let i = -2; i <= 2; i++) g.circle(i * 24, 4, 4).fill(open ? G.C.gold : 0x2a2118);
      if (open) {
        g.poly([0, -54, 8, -40, -8, -40]).fill(G.C.gold); // резная голова дракона на коньке
      }
      break;
  }
}

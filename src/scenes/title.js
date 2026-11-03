// Титульный экран: драккар у пристани, название, кнопки
window.G = window.G || {};

G.scenes = G.scenes || {};

G.scenes.title = function () {
  const c = new PIXI.Container();

  // Небо: вертикальный градиент глубины
  const sky = new PIXI.Graphics();
  sky.rect(0, 0, G.W, 420).fill(G.viz.gradient(0, 0, 0, 420, [
    [0, 0x070b13], [0.55, 0x0d1420], [1, 0x1a2c4d],
  ]));
  c.addChild(sky);

  // Луна с гало — фокусная точка
  const moonGlow = new PIXI.Graphics();
  moonGlow.circle(1010, 140, 86).fill({ color: 0xcfe0f0, alpha: 0.06 });
  moonGlow.circle(1010, 140, 62).fill({ color: 0xcfe0f0, alpha: 0.08 });
  const moon = new PIXI.Graphics();
  moon.circle(1010, 140, 38).fill(0xdfe9f2);
  moon.circle(998, 128, 7).fill({ color: 0xc2cfdd, alpha: 0.7 });
  moon.circle(1022, 152, 5).fill({ color: 0xc2cfdd, alpha: 0.6 });
  moon.circle(1016, 122, 3.5).fill({ color: 0xc2cfdd, alpha: 0.6 });
  c.addChild(moonGlow, moon);

  // Северное сияние за звёздами
  const aur = G.viz.aurora(c, { y: 30, alpha: 0.13, index: c.children.length - 1 });

  // Звёзды: три слоя с разной фазой мерцания
  const starLayers = [];
  for (let l = 0; l < 3; l++) {
    const g = new PIXI.Graphics();
    for (let i = 0; i < 20; i++) {
      g.circle(Math.random() * G.W, Math.random() * 300, Math.random() * 1.1 + 0.4)
        .fill({ color: G.C.snow, alpha: 0.2 + Math.random() * 0.5 });
    }
    c.addChild(g);
    starLayers.push(g);
  }

  // Горы: два силуэта со снежными вершинами
  const mountains = new PIXI.Graphics();
  const caps = new PIXI.Graphics();
  const ridge = (baseY, amp, step, color, alpha, snow) => {
    const pts = [0, baseY + amp];
    const peaks = [];
    for (let x = 0; x <= G.W + step; x += step) {
      const y = baseY - Math.abs(Math.sin(x * 0.013) * amp * (0.4 + 0.6 * Math.abs(Math.sin(x * 0.004))));
      pts.push(x, y);
      if (y < baseY - amp * 0.45) peaks.push([x, y]);
    }
    pts.push(G.W, baseY + amp, G.W, G.H, 0, G.H);
    mountains.poly(pts).fill({ color, alpha });
    if (snow) {
      // шапки на самых высоких пиках
      for (const [px, py] of peaks) {
        caps.poly([px - 16, py + 14, px, py, px + 16, py + 14, px + 7, py + 9, px - 5, py + 12])
          .fill({ color: 0xdfe9f2, alpha: 0.22 });
      }
    }
  };
  ridge(360, 130, 90, 0x101a2a, 1, true);
  ridge(400, 90, 70, 0x0e1624, 1, false);
  c.addChild(mountains, caps);

  // Вода
  const water = new PIXI.Graphics();
  water.rect(0, 470, G.W, G.H - 470).fill(0x0a1019);
  c.addChild(water);
  const shimmer = new PIXI.Graphics();
  c.addChild(shimmer);

  // Драккар: плывёт слева и пришвартовывается у пирса (ниже кнопок)
  const ship = G.ui.drawDrakkar(1);
  ship.x = -120; ship.y = 585;
  c.addChild(ship);
  G.tween(ship, { x: 985 }, 5600, null, G.easeInOut);
  ship.scale.set(1.05);

  // Причал справа
  const pier = new PIXI.Graphics();
  pier.rect(G.W - 220, 560, 260, 12).fill(0x3a2d1c);
  for (let i = 0; i < 4; i++) pier.rect(G.W - 210 + i * 66, 570, 10, 46).fill(0x2c2216);
  const torch = new PIXI.Graphics();
  torch.rect(G.W - 190, 516, 8, 46).fill(0x2c2216);
  torch.circle(G.W - 186, 508, 9).fill(G.C.gold);
  torch.circle(G.W - 186, 508, 4.5).fill(0xffd98a);
  c.addChild(pier, torch);

  // Заголовок
  const title = new PIXI.Text({
    text: G.t('title_name'),
    style: { fontFamily: G.FONT_TITLE, fontSize: 92, fill: G.C.gold, letterSpacing: 6, stroke: { color: 0x000000, width: 5 } },
  });
  title.anchor.set(0.5);
  title.x = G.W / 2; title.y = 196;
  c.addChild(title);

  // Подзаголовок с декоративными штрихами по бокам
  const sub = new PIXI.Text({
    text: G.t('title_sub'),
    style: { fontFamily: G.FONT_BODY, fontSize: 22, fill: G.C.text, letterSpacing: 2 },
  });
  sub.anchor.set(0.5);
  sub.x = G.W / 2; sub.y = 252;
  c.addChild(sub);
  const rules = new PIXI.Graphics();
  const ruleY = 252;
  const ruleHalf = (G.t('title_sub').length * 6.2) + 30;
  rules.moveTo(G.W / 2 - ruleHalf - 90, ruleY).lineTo(G.W / 2 - ruleHalf, ruleY)
    .stroke({ width: 2, color: G.C.gold, alpha: 0.55 });
  rules.moveTo(G.W / 2 + ruleHalf, ruleY).lineTo(G.W / 2 + ruleHalf + 90, ruleY)
    .stroke({ width: 2, color: G.C.gold, alpha: 0.55 });
  rules.circle(G.W / 2 - ruleHalf - 12, ruleY, 2.5).fill(G.C.gold);
  rules.circle(G.W / 2 + ruleHalf + 12, ruleY, 2.5).fill(G.C.gold);
  c.addChild(rules);

  // Бейдж времени загрузки — аккуратная пилюля с рамкой
  const badge = new PIXI.Container();
  const badgeTxt = new PIXI.Text({
    text: G.t('title_load', { n: G.loadSec }),
    style: { fontFamily: G.FONT_BODY, fontSize: 13.5, fill: G.C.textDim },
  });
  badgeTxt.anchor.set(0.5);
  const badgeG = new PIXI.Graphics();
  badgeG.roundRect(-badgeTxt.width / 2 - 16, -14, badgeTxt.width + 32, 28, 14)
    .fill({ color: 0x0d1420, alpha: 0.75 })
    .stroke({ width: 1, color: G.C.hexBorder });
  badge.addChild(badgeG, badgeTxt);
  badge.x = G.W / 2; badge.y = 300;
  badge.alpha = 0;
  setTimeout(() => { if (!badge.destroyed) G.tween(badge, { alpha: 1 }, 500); }, 900);
  c.addChild(badge);

  // Кнопки
  const btnPlay = G.ui.button({
    label: G.t('title_play'), x: G.W / 2, y: 398, w: 320, h: 62, primary: true,
    onClick: () => G.setScene('village'),
  });
  const btnResume = G.ui.button({
    label: G.t('title_resume'), x: G.W / 2, y: 474, w: 320, h: 52,
    onClick: () => G.setScene('village', { showAll: true }),
  });
  // Кнопки поднимаются из воды
  [btnPlay, btnResume].forEach((b, i) => {
    b.y += 40; b.alpha = 0;
    setTimeout(() => {
      if (b.destroyed) return; // сцена уже сменилась
      G.tween(b, { y: b.y - 40, alpha: 1 }, 400);
    }, 500 + i * 150);
  });
  c.addChild(btnPlay, btnResume);

  // Подпись кандидата
  const tag = new PIXI.Text({
    text: G.t('title_tag'),
    style: { fontFamily: G.FONT_BODY, fontSize: 15, fill: G.C.textDim, letterSpacing: 1 },
  });
  tag.anchor.set(0, 1);
  tag.x = 24; tag.y = G.H - 16;
  c.addChild(tag);

  const langT = G.ui.langToggle();
  c.addChild(langT);

  // Анимация воды и покачивания
  c.tick = (dtMs) => {
    aur.update();
    const dt = dtMs / 1000;
    shimmer.clear();
    const t = performance.now() / 1000;
    for (let i = 0; i < 14; i++) {
      const y = 486 + i * 18;
      const w = 60 + ((i * 97) % 120);
      const x = ((i * 211 + t * 22 * (1 + (i % 3) * 0.4)) % (G.W + 200)) - 100;
      shimmer.rect(x, y, w, 2).fill({ color: G.C.heroBlue, alpha: 0.07 + 0.05 * Math.sin(t * 2 + i) });
    }
    // отражение луны: дрожащий столб света
    for (let i = 0; i < 9; i++) {
      const y = 490 + i * 22;
      const w = 46 - i * 3.4 + 8 * Math.sin(t * 1.7 + i);
      shimmer.rect(1010 - w / 2, y, w, 3).fill({ color: 0xdfe9f2, alpha: 0.1 - i * 0.009 });
    }
    if (ship) ship.rotation = Math.sin(t * 1.6) * 0.02;
    if (torch) torch.alpha = 0.85 + 0.15 * Math.sin(t * 9);
    // мерцание звёзд слоями
    for (let l = 0; l < starLayers.length; l++) {
      starLayers[l].alpha = 0.75 + 0.25 * Math.sin(t * (0.9 + l * 0.35) + l * 2);
    }
  };

  return c;
};

// Процедурный драккар (переиспользуется в деревне и победе)
G.ui.drawDrakkar = function (scale = 1) {
  const s = new PIXI.Container();
  const g = new PIXI.Graphics();
  // корпус
  g.moveTo(-70, 0).quadraticCurveTo(0, 34, 70, 0).lineTo(58, -8).lineTo(-58, -8).closePath().fill(0x3a2d1c);
  // нос с драконной головой
  g.moveTo(70, 0).lineTo(88, -26).lineTo(80, -12).lineTo(86, -10).lineTo(74, -2).closePath().fill(0x4a3a24);
  // щиты по борту
  for (let i = -2; i <= 2; i++) g.circle(i * 26, -2, 6).fill(i % 2 ? G.C.heroBlue : G.C.gold);
  // мачта и парус
  g.rect(-2, -78, 4, 72).fill(0x2c2216);
  g.rect(-26, -74, 52, 44).fill({ color: 0xcfc4a6, alpha: 0.95 });
  g.rect(-26, -60, 52, 7).fill({ color: 0x8a2f2a, alpha: 0.9 });
  g.rect(-26, -44, 52, 7).fill({ color: 0x8a2f2a, alpha: 0.9 });
  s.addChild(g);
  s.scale.set(scale);
  return s;
};

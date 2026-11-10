// Экран победы: кандидат принят в отряд, отчёт рейда, контакты
window.G = window.G || {};

G.scenes.victory = function () {
  const c = new PIXI.Container();
  G.fxSnow.gold();

  // Небо с зарёй — рейд удался
  const bg = new PIXI.Graphics();
  bg.rect(0, 0, G.W, G.H).fill(0x12203a);
  bg.rect(0, 240, G.W, 140).fill(0x1a2c4d);
  bg.rect(0, 380, G.W, G.H - 380).fill(0x15243c);
  c.addChild(bg);

  // северное сияние: полупрозрачные ленты
  const aurora = new PIXI.Graphics();
  for (let i = 0; i < 3; i++) {
    const yBase = 90 + i * 46;
    const pts = [];
    for (let x = 0; x <= G.W; x += 40) {
      pts.push(x, yBase + Math.sin(x * 0.006 + i * 2) * 34);
    }
    for (let x = G.W; x >= 0; x -= 40) {
      pts.push(x, pts[pts.length - 1] + 46 + Math.sin(x * 0.004 + i) * 18);
    }
    aurora.poly(pts).fill({ color: i % 2 ? 0x3d8a6e : 0x3d6e8a, alpha: 0.10 });
  }
  c.addChild(aurora);

  const stars = new PIXI.Graphics();
  for (let i = 0; i < 40; i++) {
    stars.circle(Math.random() * G.W, Math.random() * 300, Math.random() * 1.1 + 0.4)
      .fill({ color: G.C.snow, alpha: 0.2 + Math.random() * 0.4 });
  }
  c.addChild(stars);

  // Заголовок
  const title = new PIXI.Text({
    text: G.t('win_title'),
    style: { fontFamily: G.FONT_TITLE, fontSize: 58, fill: G.C.gold, letterSpacing: 4, stroke: { color: 0x000000, width: 4 } },
  });
  title.anchor.set(0.5);
  title.x = G.W / 2; title.y = 140;
  c.addChild(title);

  const sub = new PIXI.Text({
    text: G.t('win_sub'),
    style: { fontFamily: G.FONT_BODY, fontSize: 20, fill: G.C.text, letterSpacing: 1 },
  });
  sub.anchor.set(0.5);
  sub.x = G.W / 2; sub.y = 190;
  c.addChild(sub);

  // Драккар у причала
  const ship = G.ui.drawDrakkar(1);
  ship.x = G.W / 2; ship.y = 560;
  c.addChild(ship);

  // Отчёт рейда — пергамент (внизу — экономика: заработано / кошелёк)
  const panel = new PIXI.Container();
  panel.x = G.W / 2; panel.y = 356;
  const pw = 460, ph = 268;
  const sheet = G.ui.parchment(pw, ph);
  const pg = new PIXI.Graphics();
  G.ui.fancyFrame(pg, pw, ph);
  panel.addChild(sheet, pg);
  const pt = new PIXI.Text({
    text: G.t('win_report'),
    style: { fontFamily: G.FONT_TITLE, fontSize: 20, fill: G.C.ink, letterSpacing: 1 },
  });
  pt.anchor.set(0.5, 0);
  pt.y = -ph / 2 + 14;
  panel.addChild(pt);

  const rows = [
    ['win_rounds', G.stats.rounds],
    ['win_damage', G.stats.damage],
    ['win_cards', G.stats.cards],
    ['win_facts', G.stats.facts],
    ['win_earned', '🪙 ' + G.economy.earned],
    ['win_net', '🪙 ' + G.economy.gold],
  ];
  let yy = -ph / 2 + 52;
  for (const [k, v] of rows) {
    const a = new PIXI.Text({
      text: G.t(k),
      style: { fontFamily: G.FONT_BODY, fontSize: 16, fill: G.C.inkSoft },
    });
    a.x = -pw / 2 + 36; a.y = yy;
    const b = new PIXI.Text({
      text: String(v),
      style: { fontFamily: G.FONT_TITLE, fontSize: 18, fill: G.C.ink },
    });
    b.anchor.set(1, 0);
    b.x = pw / 2 - 36; b.y = yy;
    panel.addChild(a, b);
    yy += 30;
  }
  c.addChild(panel);

  // Кнопки: PDF, письмо, GitHub — ряд с центровкой по реальным ширинам
  const rowBtns = [];
  const mkBtn = (label, onClick, primary) => rowBtns.push(G.ui.button({
    label, x: 0, y: 620, w: 10, h: 56, primary, onClick,
  }));
  mkBtn(G.t('sheet_pdf'), () => {
    const a = document.createElement('a');
    a.href = G.CONFIG.pdf;
    a.download = 'CV_Yaroslav_Kukar.pdf';
    document.body.appendChild(a);
    a.click();
    a.remove();
  }, false);
  mkBtn('✉ ' + G.t('win_mail'), () => {
    const subject = encodeURIComponent('Резюме: гейм-дизайнер — ' + G.CONFIG.name);
    const pdfUrl = location.href.replace(/[^/]*$/, '') + G.CONFIG.pdf;
    const body = encodeURIComponent('Здравствуйте! Резюме (PDF): ' + pdfUrl + ' Портфолио: ' + G.CONFIG.github);
    location.href = 'mailto:' + G.CONFIG.email + '?subject=' + subject + '&body=' + body;
  }, true);
  mkBtn(G.t('win_github'), () => window.open(G.CONFIG.github, '_blank'), false);
  const gapV = 20;
  const totalV = rowBtns.reduce((acc, b) => acc + b.width, 0) + gapV * (rowBtns.length - 1);
  let vx = G.W / 2 - totalV / 2;
  for (const b of rowBtns) { b.x = vx + b.width / 2; vx += b.width + gapV; }
  c.addChild(...rowBtns);

  const again = G.ui.button({
    label: '↻', x: G.W - 40, y: 92, w: 44, h: 44, small: true,
    onClick: () => {
      G.progress = 0;
      G.stats = { rounds: 0, damage: 0, cards: 0, facts: 0 };
      G.resetEconomy();
      G.setScene('title');
    },
  });
  c.addChild(again);

  const langT = G.ui.langToggle();
  c.addChild(langT);

  c.tick = (dtMs) => {
    const t = performance.now() / 1000;
    ship.rotation = Math.sin(t * 1.3) * 0.025;
    aurora.alpha = 0.75 + 0.25 * Math.sin(t * 0.7);
    // конфетти из золотых хлопьев каждые ~1.2 сек
    if (Math.floor(t * 0.8) !== Math.floor((t - dtMs / 1000) * 0.8)) {
      G.fxParticles.burst(
        G.W * (0.2 + Math.random() * 0.6), 160,
        Math.random() > 0.5 ? G.C.gold : 0xdfe9f2, 8,
        { square: true, size: 4, speed: 60, up: true, grav: 90, ttl: 1600 }
      );
    }
  };

  G.sfx.play('fanfare');
  return c;
};

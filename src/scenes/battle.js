// Бой: гексы, отряд, фазы хода, карты-факты, волны, босс с free-aim
window.G = window.G || {};

G.scenes.battle = function (params) {
  const waveIdx = Math.min(params.wave || 0, G.WAVES.length - 1);
  const wave = G.WAVES[waveIdx];
  const c = new PIXI.Container();

  // --- Состояние боя ---
  const B = {
    round: 1,
    units: [],
    hexViews: new Map(),   // 'col,row' -> Graphics
    hiViews: [],           // подсветки
    state: 'intro',        // intro | move | moving | act | anim | enemy | over
    subphase: 'move',      // фаза игрока: move | act
    activeHero: null,
    pendingCard: null,
    hands: {},             // heroId -> [card, card]
    lastCard: null,        // {card} для Echo Loop
    bossDmg: 1,
    offerReady: false,
    over: false,
    events: [],            // итоги раунда для баннера
  };
  const waveDamage0 = G.stats.damage;
  const waveCards0 = G.stats.cards;

  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const key = (col, row) => col + ',' + row;

  // --- Фон поля: ночная вода + травяной остров Tiny Swords ---
  const bg = new PIXI.Container();
  const water = G.art.water(G.W, G.H, { tint: 0x2e5468 });
  bg.addChild(water);
  const depth = new PIXI.Graphics();
  depth.rect(0, 0, G.W, G.H).fill(G.viz.gradient(0, 0, 0, G.H, [
    [0, 'rgba(6,10,18,0.38)'], [0.35, 'rgba(6,10,18,0.08)'], [1, 'rgba(6,10,18,0.4)'],
  ]));
  bg.addChild(depth);
  c.addChild(bg);

  // остров шире поля: вокруг гексов остаётся травяная кромка под деревья
  const FIELD = { x: 100, y: 26, w: 1100, h: 590 };
  const shelf = new PIXI.Graphics();
  shelf.roundRect(FIELD.x - 10, FIELD.y - 8, FIELD.w + 20, FIELD.h + 16, 30)
    .fill({ color: 0x051019, alpha: 0.4 });
  const island = G.art.island(FIELD.w, FIELD.h);
  island.x = FIELD.x; island.y = FIELD.y;
  c.addChild(shelf, island);

  // тёмные полосы под HUD сверху и под столом карт снизу
  const hudTint = new PIXI.Graphics();
  hudTint.rect(0, 0, G.W, 60).fill({ color: 0x060a12, alpha: 0.45 });
  hudTint.rect(0, G.H - 128, G.W, 128).fill({ color: 0x060a12, alpha: 0.5 });
  c.addChild(hudTint);
  // деревянный стол, на который выходят карты способностей
  const table = G.art.wood(G.W, 128, { tint: 0x65513c, stud: null, shadow: false });
  table.x = G.W / 2; table.y = G.H - 64;
  table.eventMode = 'none';
  c.addChild(table);
  G.viz.vignette(c, 0.3);

  // --- Гексы: деликатная сетка поверх травы ---
  const hexLayer = new PIXI.Container();
  hexLayer.sortableChildren = true;
  c.addChild(hexLayer);
  for (let col = 0; col < G.HEX.cols; col++) {
    for (let row = 0; row < G.HEX.rows; row++) {
      const { x, y } = G.hexToPx(col, row);
      const g = new PIXI.Graphics();
      // лёгкая шахматная тонировка — сетка читается, трава видна
      const dark = (col + row) % 2 === 0;
      g.poly(hexPoints(x, y))
        .fill({ color: 0x0c1a26, alpha: dark ? 0.05 : 0.02 })
        .stroke({ width: 1.2, color: 0x08202e, alpha: 0.24 });
      g.eventMode = 'static';
      g.on('pointertap', () => onHexTap(col, row));
      g.on('pointerover', () => hexHover(col, row, true));
      g.on('pointerout', () => hexHover(col, row, false));
      hexLayer.addChild(g);
      B.hexViews.set(key(col, row), g);
      g.__x = x; g.__y = y; g.__hover = false;
    }
  }

  // Декор поля: камни, кусты и снежные пятна на случайных гексах
  const deco = new PIXI.Container();
  deco.zIndex = 1;
  hexLayer.addChild(deco);
  const poolC = G.hexToPx(5, 2);
  const lightPool = new PIXI.Graphics();
  for (let i = 0; i < 4; i++) {
    lightPool.circle(poolC.x, poolC.y, 240 - i * 52).fill({ color: 0xb8d4e8, alpha: 0.016 });
  }
  lightPool.eventMode = 'none';
  lightPool.zIndex = 2;
  hexLayer.addChild(lightPool);
  for (let i = 0; i < 12; i++) {
    const col = 1 + Math.floor(Math.random() * (G.HEX.cols - 2));
    const row = Math.floor(Math.random() * G.HEX.rows);
    const { x, y } = G.hexToPx(col, row);
    const kind = Math.floor(Math.random() * 4);
    const d = new PIXI.Graphics();
    if (kind === 0) { // камни: спрайт или процедурка
      if (G.TEX && G.TEX['rock' + (1 + i % 3)]) {
        const rsp = new PIXI.Sprite(G.TEX['rock' + (1 + i % 3)].frames[0]);
        rsp.anchor.set(0.5, 0.5);
        rsp.scale.set(0.55, 0.55);
        rsp.x = x; rsp.y = y + 6;
        rsp.alpha = 0.9;
        deco.addChild(rsp);
        continue;
      }
      d.poly([x - 9, y + 10, x - 4, y + 2, x + 3, y + 1, x + 9, y + 10])
        .fill(0x2a3648).stroke({ width: 1, color: 0x1a2432 });
      d.poly([x - 2, y + 3, x + 2, y + 2, x + 5, y + 8, x - 4, y + 9]).fill(0x39465c);
    } else if (kind === 1) { // анимированный куст
      const bn = 'bush' + (1 + i % 4);
      if (G.TEX && G.TEX[bn] && G.TEX[bn].frames.length > 1) {
        const bsp = new PIXI.Sprite(G.TEX[bn].frames[i % G.TEX[bn].frames.length]);
        bsp.anchor.set(0.5, 0.82);
        bsp.scale.set(0.42, 0.42);
        bsp.x = x + (i % 2 ? 8 : -7); bsp.y = y + 14;
        bsp.alpha = 0.95;
        deco.addChild(bsp);
        continue;
      }
      d.circle(x, y + 8, 8).fill(0x2c4a38);
    } else if (kind === 2) { // снег
      d.ellipse(x - 4, y + 12, 12, 3.5).fill({ color: 0xdfe9f2, alpha: 0.16 });
      d.ellipse(x + 8, y + 6, 8, 2.6).fill({ color: 0xdfe9f2, alpha: 0.12 });
    } else { // трещина
      d.moveTo(x - 10, y + 4).lineTo(x - 2, y + 9).lineTo(x + 4, y + 5).lineTo(x + 11, y + 10)
        .stroke({ width: 1, color: 0x0e1826 });
    }
    deco.addChild(d);
  }

  // Деревья и кусты по краям острова: обрамляют поле, не мешают гексам
  const edgePlants = new PIXI.Container();
  edgePlants.zIndex = 0;
  edgePlants.eventMode = 'none';
  hexLayer.addChild(edgePlants);
  const putSprite = (cont, name, fi, tx, ty, hgt, alpha = 1) => {
    const t = G.TEX[name];
    if (!t || !t.frames.length) return;
    const fr = t.frames[fi % t.frames.length];
    const sp = new PIXI.Sprite(fr);
    sp.anchor.set(0.5, 0.9);
    sp.scale.set(hgt / fr.height, hgt / fr.height);
    sp.x = tx; sp.y = ty;
    sp.alpha = alpha;
    cont.addChild(sp);
  };
  if (G.TEX) {
    // левая кромка (гексы начинаются с x=202)
    putSprite(edgePlants, 'tree1', 0, 152, 195, 130, 1);
    putSprite(edgePlants, 'bush2', 3, 172, 318, 34, 1);
    putSprite(edgePlants, 'tree3', 3, 163, 425, 112, 1);
    putSprite(edgePlants, 'rock4', 0, 168, 545, 36, 1);
    // правая кромка (гексы кончаются x=1014)
    putSprite(edgePlants, 'tree2', 1, 1062, 195, 135, 1);
    putSprite(edgePlants, 'bush4', 6, 1152, 300, 34, 1);
    putSprite(edgePlants, 'tree4', 2, 1122, 415, 118, 1);
    putSprite(edgePlants, 'tree1', 4, 1102, 565, 110, 1);
    // верхняя кромка над первым рядом гексов (их верх ~y=80)
    putSprite(edgePlants, 'bush1', 0, 350, 70, 32, 1);
    putSprite(edgePlants, 'bush3', 4, 720, 66, 30, 1);
    putSprite(edgePlants, 'bush2', 6, 980, 68, 30, 1);
  }

  // Светлячки над полем
  const flies = [];
  const flyLayer = new PIXI.Container();
  flyLayer.eventMode = 'none';
  flyLayer.zIndex = 30;
  c.addChild(flyLayer);
  for (let i = 0; i < 12; i++) {
    const fg = new PIXI.Graphics();
    fg.circle(0, 0, 1.4).fill(G.C.gold);
    flyLayer.addChild(fg);
    flies.push({ g: fg, cx: 140 + Math.random() * 1000, cy: 140 + Math.random() * 400, phase: Math.random() * 6.28 });
  }

  // hover гекса: только если он сейчас валидная цель
  function hexHover(col, row, on) {
    const g = B.hexViews.get(key(col, row));
    if (!g) return;
    g.__hover = on;
    const hl = B.hiViews.some(h => h.col === col && h.row === row);
    if (on && hl) redrawHex(g, 0x9fe0f0, 0xbfeaf5, 0.26);
    else if (hl) redrawHex(g, B.hiMode === 'attack' ? 0xc74a3c : 0x2f95b5, B.hiMode === 'attack' ? 0xffa090 : 0x9fe0f0, 0.44);
    else redrawHex(g, 0x0c1a26, 0x08202e, g.__hover ? 0.22 : undefined);
  }

  function redrawHex(g, fill, border, alpha) {
    g.clear();
    g.poly(hexPoints(g.__x, g.__y))
      .fill({ color: fill, alpha: alpha === undefined ? 0.06 : alpha })
      .stroke({ width: 1.2, color: border, alpha: 0.4 });
  }

  function hexPoints(cx, cy, scaleMul = 1) {
    const s = G.HEX.size * 0.96 * scaleMul;
    const pts = [];
    for (let i = 0; i < 6; i++) {
      const a = Math.PI / 3 * i;
      pts.push(cx + s * Math.cos(a), cy + s * Math.sin(a));
    }
    return pts;
  }

  // --- HUD сверху ---
  const waveLabel = new PIXI.Text({
    text: G.t(wave.nameKey),
    style: { fontFamily: G.FONT_TITLE, fontSize: 20, fill: G.C.gold, letterSpacing: 1 },
  });
  waveLabel.x = 24; waveLabel.y = 14;
  const roundLabel = new PIXI.Text({
    text: G.t('round_n', { n: 1 }),
    style: { fontFamily: G.FONT_BODY, fontSize: 17, fill: G.C.text },
  });
  roundLabel.anchor.set(1, 0);
  roundLabel.x = G.W - 76; roundLabel.y = 40;   // угол занят кнопкой звука
  const phaseLabel = new PIXI.Text({
    text: G.t('phase_player'),
    style: { fontFamily: G.FONT_BODY, fontSize: 17, fill: G.C.heroBlue, fontWeight: 'bold' },
  });
  phaseLabel.anchor.set(1, 0);
  phaseLabel.x = G.W - 76; phaseLabel.y = 16;
  c.addChild(waveLabel, roundLabel, phaseLabel);

  // Трекер фаз раунда: [Твой ход | Враги | Раунд]
  const phaseBar = new PIXI.Container();
  phaseBar.x = G.W / 2; phaseBar.y = 30;
  c.addChild(phaseBar);

  function drawPhaseBar() {
    phaseBar.removeChildren();
    const phases = [
      { key: 'ph_move', on: B.subphase === 'move' && B.state !== 'enemy' && B.state !== 'intro' },
      { key: 'ph_act', on: B.subphase === 'act' && B.state !== 'enemy' && B.state !== 'intro' },
      { key: 'ph_enemy', on: B.state === 'enemy' },
      { key: 'ph_round', on: false, vars: { n: B.round } },
    ];
    let px = 0;
    const widths = [116, 96, 104, 118];
    phases.forEach((ph, i) => {
      const w = widths[i];
      const t = new PIXI.Text({
        text: G.t(ph.key, ph.vars),
        style: { fontFamily: G.FONT_BODY, fontSize: 13, fontWeight: 'bold', fill: ph.on ? 0x1a1206 : G.C.textDim },
      });
      t.anchor.set(0.5);
      const g = new PIXI.Graphics();
      g.roundRect(-w / 2, -14, w, 28, 14)
        .fill({ color: ph.on ? G.C.gold : G.C.panelDark, alpha: ph.on ? 0.95 : 0.85 })
        .stroke({ width: 1.5, color: ph.on ? G.C.goldDark : G.C.hexBorder });
      const seg = new PIXI.Container();
      seg.x = px + w / 2;
      seg.addChild(g, t);
      phaseBar.addChild(seg);
      px += w + 10;
    });
    phaseBar.x = G.W / 2 - px / 2 + 60; // центрируем блок
  }

  // Пилюля текущей стадии хода игрока
  const stagePill = new PIXI.Container();
  stagePill.x = G.W / 2; stagePill.y = 588;
  c.addChild(stagePill);

  function setStage(text) {
    stagePill.removeChildren();
    if (!text || (B.state !== 'move' && B.state !== 'act')) { stagePill.visible = false; return; }
    stagePill.visible = true;
    const t = new PIXI.Text({
      text,
      style: { fontFamily: G.FONT_BODY, fontSize: 13, fill: G.C.textDim },
    });
    t.anchor.set(0.5);
    const g = new PIXI.Graphics();
    g.roundRect(-t.width / 2 - 14, -12, t.width + 28, 24, 12)
      .fill({ color: 0x0b121d, alpha: 0.9 })
      .stroke({ width: 1, color: G.C.hexBorder });
    stagePill.addChild(g, t);
  }

  // Очередь хода в стиле XCOM: кто готов, кто отработал, кто сейчас
  const init = new PIXI.Container();
  init.y = 58;
  c.addChild(init);

  const QUEUE_ICONS = {
    berserk: '⚔️', skald: '🎻', smith: '🔨', zone: '🎯',
    bug: '🐛', krynch: '☕', deadline: '⏳',
  };
  B.enemyCursor = -1;

  function queueSlots() {
    const slots = [];
    if (B.state === 'enemy' || B.state === 'intro') {
      const foes = B.units.filter(u => u.kind === 'enemy');
      if (foes.length) {
        foes.forEach((e, i) => slots.push({
          u: e,
          status: i < B.enemyCursor ? 'done' : (i === B.enemyCursor ? 'active' : 'pending'),
        }));
      } else {
        // босс: зоны не ходят, но фаза ярости видна в очереди
        B.units.filter(u => u.kind === 'zone').forEach(z => slots.push({ u: z, status: 'pending' }));
      }
    } else {
      for (const h of heroes) {
        const done = B.subphase === 'move' ? h.moved : h.acted;
        slots.push({
          u: h,
          status: !h.alive || done ? 'done' : (h === B.activeHero ? 'active' : 'pending'),
        });
      }
    }
    return slots;
  }

  function drawInitiative() {
    init.removeChildren();
    const slots = queueSlots();
    const total = slots.length * 46;
    let x = G.W / 2 - total / 2 + 23;
    for (const s of slots) {
      const slot = new PIXI.Container();
      slot.x = x; slot.y = 0;
      const g = new PIXI.Graphics();
      const isHero = s.u.kind === 'hero';
      const col = isHero ? (s.u.alive ? s.u.def.color : 0x3a3a3a) : (s.u.kind === 'zone' ? 0x2a3240 : G.C.enemy);
      if (s.status === 'active') {
        g.circle(0, 0, 19).fill({ color: G.C.gold, alpha: 0.18 });
        g.circle(0, 0, 15).fill(0x141c29);
        g.circle(0, 0, 15).stroke({ width: 2.5, color: G.C.gold });
        slot.scale.set(1.12);
      } else {
        g.circle(0, 0, 14).fill(0x141c29);
        g.circle(0, 0, 14).stroke({ width: 2, color: s.status === 'done' ? 0x2a3240 : col, alpha: s.status === 'done' ? 0.6 : 1 });
      }
      let ic = null;
      const sdef = (G.TEX && Object.keys(G.TEX).length) ? unitSpriteDef(s.u) : null;
      if (sdef && G.TEX[sdef.idle]) {
        ic = new PIXI.Sprite(G.TEX[sdef.idle].frames[0]);
        ic.anchor.set(0.5);
        const sc = 34 / G.TEX[sdef.idle].fw;
        ic.scale.set(s.status === 'done' ? -sc : sc, sc);
      } else {
        ic = new PIXI.Text({
          text: QUEUE_ICONS[s.u.id?.split('_')[0]] || QUEUE_ICONS[s.u.defKey] || '❓',
          style: { fontSize: 13 },
        });
        ic.anchor.set(0.5);
      }
      ic.alpha = s.status === 'done' ? 0.4 : 1;
      if (s.status === 'done') {
        const done = new PIXI.Text({
          text: G.t('q_done'),
          style: { fontFamily: G.FONT_TITLE, fontSize: 13, fill: 0x6a7a6a },
        });
        done.anchor.set(0.5);
        slot.addChild(g, ic, done);
      } else {
        slot.addChild(g, ic);
      }
      if (s.status === 'active') {
        const name = new PIXI.Text({
          text: unitName(s.u),
          style: {
            fontFamily: G.FONT_BODY, fontSize: 12, fill: G.C.gold, fontWeight: 'bold',
            stroke: { color: 0x0a0f18, width: 3 },
          },
        });
        name.anchor.set(0.5, 0);
        name.y = 18;
        slot.addChild(name);
      }
      init.addChild(slot);
      x += 46;
    }
    drawZoneHud();
  }

  // Чеклист зон босса: требования и их HP
  const zoneHud = new PIXI.Container();
  zoneHud.x = G.W - 190; zoneHud.y = 78;
  zoneHud.visible = false;
  c.addChild(zoneHud);

  function drawZoneHud() {
    if (!wave.boss) return;
    zoneHud.visible = true;
    zoneHud.removeChildren();
    const zones = B.units.filter(u => u.kind === 'zone');
    const w = 168, rowH = 30, h = zones.length * rowH + 34;
    const g = new PIXI.Graphics();
    g.roundRect(0, 0, w, h, 10).fill({ color: G.C.panelDark, alpha: 0.92 });
    g.roundRect(0, 0, w, h, 10).stroke({ width: 1.5, color: G.C.hexBorder });
    const head = new PIXI.Text({
      text: G.t('boss_name'),
      style: { fontFamily: G.FONT_TITLE, fontSize: 13, fill: G.C.gold },
    });
    head.x = 12; head.y = 8;
    zoneHud.addChild(g, head);
    zones.forEach((z, i) => {
      const faces = { mobile: 0x4a9db8, balance: 0xb8a24a, unity: 0x7ab55c, team: 0x9b6ab8 };
      const col = faces[z.defId];
      const y = 30 + i * rowH;
      const name = new PIXI.Text({
        text: (z.alive ? '• ' : '✓ ') + G.t(z.def.key),
        style: {
          fontFamily: G.FONT_BODY, fontSize: 13, fontWeight: 'bold',
          fill: z.alive ? G.C.text : 0x6a7a6a,
          stroke: { color: 0x0a0f18, width: 2 },
        },
      });
      name.x = 12; name.y = y;
      zoneHud.addChild(name);
      const barW = 56;
      const bar = new PIXI.Graphics();
      bar.rect(w - barW - 14, y + 2, barW, 8).fill(0x1a1210);
      bar.rect(w - barW - 14, y + 2, barW * Math.max(0, z.hp / z.maxHp), 8).fill(z.alive ? col : 0x3a4a3a);
      zoneHud.addChild(bar);
    });
  }

  // --- Нижняя панель: портрет героя, рука, пропуск ---
  const handBar = new PIXI.Container();
  handBar.y = G.H - 118;
  c.addChild(handBar);

  function showHand(hero) {
    handBar.removeChildren();
    const name = new PIXI.Text({
      text: G.t(hero.def.nameKey),
      style: { fontFamily: G.FONT_TITLE, fontSize: 18, fill: hero.def.color },
    });
    name.x = 24; name.y = -4;
    handBar.addChild(name);

    const cards = B.hands[hero.id];
    cards.forEach((card, i) => {
      const cardV = G.ui.drawCard(card, i, hero.def.color);
      cardV.x = 24 + i * 190;
      cardV.y = 16;
      cardV.on('pointertap', () => playCard(hero, card));
      handBar.addChild(cardV);
    });

    const skip = G.ui.button({
      label: G.t('skip'), x: G.W - 120, y: 42, w: 150, h: 44, small: true,
      onClick: () => { G.sfx.play('blip'); advanceAct(); },
    });
    handBar.addChild(skip);
  }

  function hideHand() { handBar.removeChildren(); }

  // --- Фазы игрока: 1) движение отряда 2) способности ---

  function startPlayerPhase() {
    B.subphase = 'move';
    B.moveIdx = 0;
    for (const h of heroes) h.moved = false;
    activateMove();
  }

  function activateMove() {
    const h = heroes.find(x => x.alive && !x.moved);
    if (!h) { startActPhase(); return; }
    B.activeHero = h;
    B.state = 'move';
    showRing(h);
    highlightCells(
      G.hexReachable(h.col, h.row, h.move, occupied(h)).concat([{ col: h.col, row: h.row }]),
      'move'
    );
    showMoveBar(h);
    setStage(G.t('st_move', { n: G.t(h.def.nameKey) }));
    drawPhaseBar();
    drawInitiative();
  }

  function advanceMove() {
    if (B.activeHero) B.activeHero.moved = true;
    hideRing(); clearHighlights(); hideHand();
    activateMove();
  }

  function startActPhase() {
    B.subphase = 'act';
    B.actIdx = 0;
    activateAct();
  }

  function activateAct() {
    const h = heroes.find(x => x.alive && !x.acted);
    if (!h) { setStage(null); enemyPhase(); return; }
    B.activeHero = h;
    B.state = 'act';
    showRing(h);
    showHand(h);
    setStage(G.t('st_act', { n: G.t(h.def.nameKey) }));
    drawPhaseBar();
    drawInitiative();
  }

  function advanceAct() {
    if (B.activeHero) B.activeHero.acted = true;
    hideHand(); hideRing(); clearHighlights();
    activateAct();
  }

  // нижняя панель движения: подсказка + пропуск
  function showMoveBar(hero) {
    handBar.removeChildren();
    const hint = new PIXI.Text({
      text: G.t('skip_move'),
      style: { fontFamily: G.FONT_BODY, fontSize: 15, fill: G.C.textDim },
    });
    hint.x = 24; hint.y = -2;
    handBar.addChild(hint);
    const skip = G.ui.button({
      label: G.t('skip_move'), x: G.W - 120, y: 42, w: 160, h: 44, small: true,
      onClick: () => { G.sfx.play('blip'); if (B.state === 'move') advanceMove(); },
    });
    handBar.addChild(skip);
  }

  // --- Юниты ---
  function makeUnit(o) {
    const u = Object.assign({
      kind: 'enemy', hp: 1, maxHp: 1, shield: 0, alive: true, stunned: false,
      acted: false, bonus: 0, move: 0, dmg: 0, bobPhase: Math.random() * 6.28,
    }, o);
    u.view = new PIXI.Container();
    u.view.eventMode = 'static';
    u.view.on('pointertap', () => onUnitTap(u));
    drawUnitView(u);
    const { x, y } = G.hexToPx(u.col, u.row);
    u.view.x = x; u.view.y = y;
    u.view.zIndex = 10;
    c.addChild(u.view);
    B.units.push(u);
    return u;
  }

  function drawUnitView(u) {
    if (!u.body) { u.body = new PIXI.Container(); u.view.addChild(u.body); }
    u.body.removeChildren();
    const sdef = (G.TEX && Object.keys(G.TEX).length) ? unitSpriteDef(u) : null;
    if (sdef && G.TEX[sdef.idle]) {
      // спрайтовый юнит
      const t = G.TEX[sdef.idle];
      const sp = new PIXI.Sprite(t.frames[0]);
      sp.anchor.set(0.5, 0.86);
      const flip = u.kind === 'enemy' ? -1 : 1;
      sp.scale.set(flip * sdef.scale, sdef.scale);
      u.sprite = sp;
      u.anim = { frames: t.frames, i: 0, t: 0, fps: 8, loop: true, onDone: null };
      u.body.addChild(sp);
    } else {
      // процедурный фолбэк
      u.sprite = null;
      const g = new PIXI.Graphics();
      const body = u.kind === 'hero' ? drawViking : (u.kind === 'zone' ? drawZoneFace : drawEnemy);
      body(g, u);
      if (u.kind === 'hero') u.body.addChild(drawWeapon(u));
      u.body.addChild(g);
    }
    // полоска HP: рамка + подложка + заливка (общая для обоих режимов)
    const bar = new PIXI.Graphics();
    const barW = 46;
    const hpRatio = Math.max(0, u.hp / u.maxHp);
    bar.rect(-barW / 2 - 1, -49, barW + 2, 8).fill(0x0a0f18);
    bar.rect(-barW / 2, -48, barW, 6).fill(0x1a1210);
    bar.rect(-barW / 2, -48, barW * hpRatio, 6)
      .fill(u.kind === 'hero' ? G.C.heroGreen : (u.kind === 'zone' ? G.C.gold : G.C.enemy));
    if (u.shield > 0) {
      bar.circle(barW / 2 + 5, -45, 8).fill(0x0a0f18);
      bar.circle(barW / 2 + 5, -45, 7).fill(G.C.gold);
      bar.circle(barW / 2 + 5, -45, 4).fill(0xffe4a8);
    }
    u.body.addChild(bar);
    // имя с обводкой
    const label = new PIXI.Text({
      text: unitName(u),
      style: {
        fontFamily: G.FONT_BODY, fontSize: 12, fill: G.C.text, fontWeight: 'bold',
        stroke: { color: 0x0a0f18, width: 3 },
      },
    });
    label.anchor.set(0.5);
    label.y = 36;
    u.body.addChild(label);
  }

  function unitName(u) {
    if (u.kind === 'hero') return G.t(u.def.nameKey);
    if (u.kind === 'zone') return G.t(u.def.key);
    return G.t(u.def.key);
  }

  const OUTLINE = 0x0a0f18;

  // Спрайты юнитов (Tiny Swords) + процедурный фолбэк
  const UNIT_SPRITE_DEF = {
    berserk: { idle: 'hero_warrior_idle', atk: 'hero_warrior_atk', scale: 0.52 },
    skald: { idle: 'hero_archer_idle', atk: 'hero_archer_shoot', scale: 0.5 },
    smith: { idle: 'hero_monk_idle', heal: 'hero_monk_heal', scale: 0.5 },
    bug: { idle: 'foe_pawn_idle', scale: 0.46 },
    krynch: { idle: 'foe_warrior_idle', atk: 'foe_warrior_atk', scale: 0.52 },
    deadline: { idle: 'foe_lancer_idle', atk: 'foe_lancer_atk', scale: 0.3 },
  };

  function unitSpriteDef(u) {
    return UNIT_SPRITE_DEF[u.kind === 'hero' ? u.id : u.defKey] || null;
  }

  function playAnim(u, name, once) {
    const d = unitSpriteDef(u);
    if (!d || !u.sprite || !G.TEX) return;
    const tex = G.TEX[d[name] || d.idle];
    if (!tex) return;
    u.anim.frames = tex.frames;
    u.anim.i = 0; u.anim.t = 0;
    u.anim.fps = once ? 13 : 8;
    u.anim.loop = !once;
    u.anim.onDone = once ? () => playAnim(u, 'idle', false) : null;
  }

  function tickAnims(dtMs) {
    for (const u of B.units) {
      if (!u.anim || !u.sprite) continue;
      u.anim.t += dtMs;
      const step = 1000 / u.anim.fps;
      while (u.anim.t > step) {
        u.anim.t -= step;
        u.anim.i++;
        if (u.anim.i >= u.anim.frames.length) {
          if (u.anim.loop) u.anim.i = 0;
          else {
            u.anim.i = u.anim.frames.length - 1;
            const cb = u.anim.onDone;
            u.anim.onDone = null;
            if (cb) cb();
          }
        }
        u.sprite.texture = u.anim.frames[Math.min(u.anim.i, u.anim.frames.length - 1)];
      }
    }
  }

  function drawViking(g, u) {
    const col = u.def.color;
    const colDark = u.def.color && (u.id === 'berserk' ? 0x3a7a92 : u.id === 'skald' ? 0x5c8f44 : 0x96803a);
    g.circle(0, 26, 17).fill({ color: 0x000000, alpha: 0.3 });
    // плащ
    g.poly([-11, -2, 11, -2, 15, 25, -15, 25]).fill({ color: col, alpha: 0.55 });
    // тело: два тона + кольчужные ряды
    g.rect(-8, 0, 16, 11).fill(col).stroke({ width: 2, color: OUTLINE });
    g.rect(-8, 11, 16, 11).fill(colDark || col).stroke({ width: 2, color: OUTLINE });
    g.moveTo(-9, 6).lineTo(9, 6).moveTo(-9, 16).lineTo(9, 16).stroke({ width: 1, color: 0x000000, alpha: 0.35 });
    // меховой воротник
    g.arc(0, 1, 10, Math.PI * 1.05, Math.PI * 1.95).fill(0xd8cfc0);
    // голова
    g.circle(0, -8, 11.5).fill(0xe8c39e).stroke({ width: 2, color: OUTLINE });
    // борода с косами
    g.moveTo(-12, -3).arc(0, -3, 12, Math.PI * 0.1, Math.PI * 0.9).closePath().fill(0x8a5a2a);
    g.circle(-6.5, 9, 2.6).fill(0x8a5a2a).stroke({ width: 1, color: OUTLINE });
    g.circle(6.5, 9, 2.6).fill(0x8a5a2a).stroke({ width: 1, color: OUTLINE });
    // глаза
    g.circle(-4, -9, 1.6).fill(0x2a2018);
    g.circle(4, -9, 1.6).fill(0x2a2018);
    // шлем: купол с бликом, обод, наносник, заклёпки
    g.moveTo(-12.5, -11).arc(0, -11, 12.5, Math.PI, 0).closePath().fill(0x9aa7b5).stroke({ width: 2, color: OUTLINE });
    g.moveTo(-9, -19).quadraticCurveTo(0, -22, 9, -19).stroke({ width: 1.5, color: 0xd8d8d8, alpha: 0.8 });
    g.rect(-12.5, -13.5, 25, 4.5).fill(0x8794a3).stroke({ width: 1.5, color: OUTLINE });
    g.rect(-1.5, -9, 3, 6).fill(0x8794a3); // наносник
    g.circle(0, -19, 1.7).fill(0xd8d8d8);
    // рога с полосами у основания
    g.moveTo(-12, -17).quadraticCurveTo(-24, -23, -22, -35).lineTo(-17, -33)
      .quadraticCurveTo(-19, -25, -11.5, -19).closePath().fill(0xd8d8d8).stroke({ width: 1.5, color: OUTLINE });
    g.moveTo(12, -17).quadraticCurveTo(24, -23, 22, -35).lineTo(17, -33)
      .quadraticCurveTo(19, -25, 11.5, -19).closePath().fill(0xd8d8d8).stroke({ width: 1.5, color: OUTLINE });
  }

  // Оружие — отдельный узел: замах при атаке
  function drawWeapon(u) {
    const wp = new PIXI.Container();
    const g = new PIXI.Graphics();
    if (u.id === 'berserk') { // топор: рукоять вниз от точки хвата
      wp.x = 13; wp.y = -7;
      g.rect(-1.75, 0, 3.5, 26).fill(0x6b4a2a).stroke({ width: 1.5, color: OUTLINE });
      g.poly([-2, 0, 13, 4, -2, 11]).fill(0xb8c4d0).stroke({ width: 1.5, color: OUTLINE });
      g.moveTo(0, 2).lineTo(9, 4.5).stroke({ width: 1, color: 0xeef4f8 });
    } else if (u.id === 'smith') { // молот
      wp.x = -15; wp.y = -9;
      g.rect(-1.75, 0, 3.5, 26).fill(0x6b4a2a).stroke({ width: 1.5, color: OUTLINE });
      g.rect(-10, -8, 20, 9).fill(0x9aa7b5).stroke({ width: 1.5, color: OUTLINE });
      g.rect(-10, -5, 20, 2).fill(0xc9d4de);
    } else if (u.id === 'skald') { // лира
      wp.x = -15; wp.y = 2;
      g.circle(0, 0, 7.5).fill(0x8a5a2a).stroke({ width: 1.5, color: OUTLINE });
      g.circle(0, 0, 3).fill(0x1a1210);
      g.moveTo(-4, -4).lineTo(4, 4).moveTo(-4, 4).lineTo(4, -4).stroke({ width: 1, color: 0xffe4a8 });
    }
    wp.addChild(g);
    wp.pivot.set(0, 0);
    u.weapon = wp;
    return wp;
  }

  function drawEnemy(g, u) {
    const col = u.def.color;
    g.circle(0, 26, 16).fill({ color: 0x000000, alpha: 0.3 });
    switch (u.defKey) {
      case 'krynch': // кринч: офисный планктон с кофе
        g.circle(0, 2, 17).fill(col).stroke({ width: 2, color: OUTLINE });
        // воротник и галстук
        g.poly([-7, 8, 0, 12, 7, 8, 0, 11]).fill(0xe8e0d0);
        g.poly([0, 11, 3.5, 16, 0, 24, -3.5, 16]).fill(0x8a2f2a);
        // очки
        g.circle(-6, -4, 4).stroke({ width: 1.5, color: 0xd8d8d8 });
        g.circle(6, -4, 4).stroke({ width: 1.5, color: 0xd8d8d8 });
        g.moveTo(-2, -4).lineTo(2, -4).stroke({ width: 1.5, color: 0xd8d8d8 });
        g.circle(-6, -4, 1.6).fill(0xffe4a8);
        g.circle(6, -4, 1.6).fill(0xffe4a8);
        g.moveTo(-6, -9).lineTo(-2, -7).stroke({ width: 1.5, color: OUTLINE });
        g.moveTo(6, -9).lineTo(2, -7).stroke({ width: 1.5, color: OUTLINE });
        g.arc(0, 5, 6, Math.PI * 0.15, Math.PI * 0.85).stroke({ width: 2, color: 0xffe4a8 });
        // стакан кофе с паром
        g.rect(15, 6, 9, 12).fill(0xe8e0d0).stroke({ width: 1.5, color: OUTLINE });
        g.rect(15, 6, 9, 3).fill(0x8a5a2a);
        g.moveTo(19, 2).quadraticCurveTo(21, 0, 19, -2).stroke({ width: 1.5, color: 0xbfc7cf });
        break;
      case 'deadline': // дедлайн: часы со стрелками и стресс-метками
        g.circle(0, 2, 17).fill(col).stroke({ width: 2, color: OUTLINE });
        g.circle(0, 2, 12).fill(0x241c12).stroke({ width: 1.5, color: 0x8a2f2a });
        g.moveTo(0, 2).lineTo(0, -6).stroke({ width: 2, color: 0xffe4a8 });   // минутная
        g.moveTo(0, 2).lineTo(6, 2).stroke({ width: 2, color: 0xffe4a8 });    // часовая
        g.circle(0, 2, 1.8).fill(0xffe4a8);
        for (let i = 0; i < 4; i++) {
          const a = Math.PI / 2 * i;
          g.moveTo(Math.cos(a) * 9, 2 + Math.sin(a) * 9).lineTo(Math.cos(a) * 11.5, 2 + Math.sin(a) * 11.5)
            .stroke({ width: 1.5, color: 0x8a2f2a });
        }
        // стресс: «!» над головой
        g.moveTo(16, -14).lineTo(18, -20).stroke({ width: 2, color: 0xffe4a8 });
        g.circle(19, -16.5, 1.2).fill(0xffe4a8);
        break;
      default: // баг: жук с панцирем
        g.ellipse(0, 2, 14, 18).fill(col).stroke({ width: 2, color: OUTLINE });
        g.ellipse(0, 2, 8, 14).fill({ color: 0x8a2f2a, alpha: 0.5 }); // панцирная полоса
        g.circle(0, -14, 8).fill(col).stroke({ width: 2, color: OUTLINE });
        g.circle(-5, -16, 2).fill(0xffe4a8);
        g.circle(5, -16, 2).fill(0xffe4a8);
        g.moveTo(-8, -22).lineTo(-4, -19).stroke({ width: 2, color: OUTLINE }); // усики
        g.moveTo(8, -22).lineTo(4, -19).stroke({ width: 2, color: OUTLINE });
        g.moveTo(0, -8).lineTo(0, 18).stroke({ width: 1.5, color: 0x7a2a22 });
        for (let i = -1; i <= 1; i++) {
          g.moveTo(-13, i * 8).lineTo(-20, i * 8 + 4).stroke({ width: 2, color: 0x5a1f1a });
          g.moveTo(13, i * 8).lineTo(20, i * 8 + 4).stroke({ width: 2, color: 0x5a1f1a });
        }
    }
  }

  function drawZoneFace(g, u) {
    const faces = { mobile: 0x4a9db8, balance: 0xb8a24a, unity: 0x7ab55c, team: 0x9b6ab8 };
    const brows = { mobile: -1, balance: 1, unity: 0, team: -2 }; // характер маски
    const col = faces[u.defId] || G.C.enemy;
    g.circle(0, 24, 18).fill({ color: 0x000000, alpha: 0.3 });
    g.roundRect(-20, -16, 40, 42, 8).fill(0x2a3240).stroke({ width: 2, color: OUTLINE });
    g.roundRect(-16, -12, 32, 34, 6).stroke({ width: 1.5, color: col, alpha: 0.5 });
    g.circle(-7, -2, 4.5).fill(0x10151f);
    g.circle(7, -2, 4.5).fill(0x10151f);
    g.circle(-7, -2, 2.5).fill(col);
    g.circle(7, -2, 2.5).fill(col);
    // брови по характеру требования
    g.moveTo(-11, -8 + brows[u.defId]).lineTo(-3, -6).stroke({ width: 2, color: col });
    g.moveTo(11, -8 + brows[u.defId]).lineTo(3, -6).stroke({ width: 2, color: col });
    g.moveTo(-8, 14).lineTo(8, 14).stroke({ width: 2.5, color: col });
  }

  // Тотем босса на фоне зон
  if (wave.boss) {
    const totem = new PIXI.Graphics();
    const base = G.hexToPx(9, 2);
    totem.roundRect(base.x - 52, base.y - 190, 104, 320, 16).fill(0x4a3a24);
    totem.roundRect(base.x - 52, base.y - 190, 104, 320, 16).stroke({ width: 2, color: 0x1a1210 });
    totem.roundRect(base.x - 42, base.y - 180, 84, 300, 12).stroke({ width: 1.5, color: 0x6b5433, alpha: 0.7 });
    for (let i = 0; i < 3; i++) {
      totem.moveTo(base.x - 52, base.y - 190 + 90 + i * 85).lineTo(base.x + 52, base.y - 190 + 90 + i * 85)
        .stroke({ width: 3, color: 0x1a1210, alpha: 0.8 });
      // резные треугольники между масками
      totem.poly([base.x - 14, base.y - 160 + i * 85, base.x + 14, base.y - 160 + i * 85, base.x, base.y - 140 + i * 85])
        .fill({ color: 0x8a2f2a, alpha: 0.7 });
    }
    totem.circle(base.x, base.y - 210, 10).fill(G.C.blood);
    totem.circle(base.x, base.y - 210, 10).stroke({ width: 2, color: 0x1a1210 });
    totem.zIndex = 1;
    c.addChild(totem);
    G.sfx.play('boss');
  }

  // --- Расстановка ---
  const heroes = [
    makeUnit({ id: 'berserk', kind: 'hero', def: G.HEROES[0], hp: G.HEROES[0].hp, maxHp: G.HEROES[0].hp, col: 2, row: 1, move: G.HEROES[0].move }),
    makeUnit({ id: 'skald', kind: 'hero', def: G.HEROES[1], hp: G.HEROES[1].hp, maxHp: G.HEROES[1].hp, col: 1, row: 2, move: G.HEROES[1].move }),
    makeUnit({ id: 'smith', kind: 'hero', def: G.HEROES[2], hp: G.HEROES[2].hp, maxHp: G.HEROES[2].hp, col: 2, row: 3, move: G.HEROES[2].move }),
  ];

  if (wave.boss) {
    for (const z of wave.zones) {
      makeUnit({ id: 'zone_' + z.id, defId: z.id, kind: 'zone', def: z, hp: z.hp, maxHp: z.hp, col: z.col, row: z.row });
    }
  } else {
    for (const e of wave.enemies) {
      const def = G.ENEMY_DEFS[e.def];
      makeUnit({ id: 'e' + e.col + '_' + e.row, defKey: e.def, kind: 'enemy', def, hp: def.hp, maxHp: def.hp, col: e.col, row: e.row, move: def.move, dmg: def.dmg });
    }
  }

  c.sortableChildren = true;

  // --- Хелперы ---
  function occupied(exclude) {
    const s = new Set();
    for (const u of B.units) {
      if (!u.alive || u === exclude) continue;
      s.add(key(u.col, u.row));
    }
    return s;
  }

  function unitAt(col, row) {
    return B.units.find(u => u.alive && u.col === col && u.row === row) || null;
  }

  function clearHighlights() {
    for (const { g } of B.hiViews) {
      if (g.parent) g.parent.removeChild(g);
      g.destroy();
    }
    B.hiViews = [];
  }

  function highlightCells(cells, mode) {
    clearHighlights();
    B.hiMode = mode;
    for (const cell of cells) {
      const g = new PIXI.Graphics();
      const { x, y } = G.hexToPx(cell.col, cell.row);
      const atk = mode === 'attack';
      g.poly(hexPoints(x, y))
        .fill({ color: atk ? 0xc74a3c : 0x2f95b5, alpha: atk ? 0.44 : 0.34 })
        .stroke({ width: 2, color: atk ? 0xffa090 : 0x9fe0f0, alpha: 0.75 });
      g.zIndex = 5;
      hexLayer.addChild(g);
      B.hiViews.push({ g, col: cell.col, row: cell.row });
    }
  }

  // Перерисовать юнита (hp/щит/состояние); усталый, поднятый лечением, собирается заново
  function refresh(u) {
    if (u.view && !u.view.destroyed && u.view.__dying && u.alive) {
      // подняли до конца анимации смерти — старый вид сжигаем, твины отваливаются сами
      if (u.view.parent) u.view.parent.removeChild(u.view);
      u.view.destroy({ children: true });
      u.view = null;
    }
    if (!u.view || u.view.destroyed) {
      if (!u.alive) return;
      u.view = new PIXI.Container();
      u.view.eventMode = 'static';
      u.view.on('pointertap', () => onUnitTap(u));
      u.body = null;
      drawUnitView(u);
      const px = G.hexToPx(u.col, u.row);
      u.view.x = px.x; u.view.y = px.y;
      u.view.zIndex = 10;
      c.addChild(u.view);
      u.view.alpha = 0;
      G.tween(u.view, { alpha: 1 }, 260, null, G.easeOut);
      return;
    }
    const { x, y } = G.hexToPx(u.col, u.row);
    u.view.x = x; u.view.y = y;
    drawUnitView(u);
  }

  function popText(x, y, text, color) {
    G.ui.popText(x, y - 30, text, color);
  }

  // Вспышка удара: расходящееся белое кольцо
  function hitFlash(x, y, color) {
    const f = new PIXI.Graphics();
    f.circle(0, 0, 7).fill({ color: 0xffffff, alpha: 0.9 });
    f.circle(0, 0, 11).stroke({ width: 3, color: color || 0xffe4a8, alpha: 0.9 });
    f.x = x; f.y = y;
    f.zIndex = 30;
    c.addChild(f);
    G.tween(f, { alpha: 0, scale: 2.4 }, 240, () => {
      if (f.parent) c.removeChild(f);
      f.destroy();
    }, G.easeOut);
  }

  // Баннер раунда по центру (+итоги прошедшего раунда)
  function roundBanner(n, summary) {
    const t = new PIXI.Text({
      text: G.t('round_n', { n }),
      style: {
        fontFamily: G.FONT_TITLE, fontSize: 46, fill: G.C.gold, letterSpacing: 4,
        stroke: { color: 0x0a0f18, width: 6 },
      },
    });
    t.anchor.set(0.5);
    t.x = G.W / 2; t.y = 300;
    t.zIndex = 70;
    t.alpha = 0;
    c.addChild(t);
    G.tween(t, { alpha: 1, y: 288 }, 260, () => {
      G.tween(t, { alpha: 0, y: 272 }, 500, () => {
        if (t.parent) c.removeChild(t);
        t.destroy();
      }, G.easeOut);
    }, G.easeOut);
    if (summary) {
      const st = new PIXI.Text({
        text: summary,
        style: {
          fontFamily: G.FONT_BODY, fontSize: 15, fill: G.C.text,
          stroke: { color: 0x0a0f18, width: 3 },
        },
      });
      st.anchor.set(0.5);
      st.x = G.W / 2; st.y = 316;
      st.zIndex = 70;
      st.alpha = 0;
      c.addChild(st);
      G.tween(st, { alpha: 1 }, 300, () => {
        G.tween(st, { alpha: 0 }, 450, () => {
          if (st.parent) c.removeChild(st);
          st.destroy();
        }, G.easeOut);
      }, G.easeOut);
    }
  }

  // Кольцо выбора под активным героем
  const ring = new PIXI.Graphics();
  ring.visible = false;
  ring.zIndex = 8;
  hexLayer.addChild(ring);
  function showRing(hero) {
    ring.clear();
    ring.poly(hexPoints(0, 0, 1.12)).stroke({ width: 3, color: G.C.gold, alpha: 0.95 });
    ring.x = G.hexToPx(hero.col, hero.row).x;
    ring.y = G.hexToPx(hero.col, hero.row).y;
    ring.visible = true;
  }
  function hideRing() { ring.visible = false; }

  // --- Урон и смерть ---
  function applyDamage(target, dmg, sourceLabel, color) {
    if (!target.alive || dmg <= 0) return 0;
    let rest = dmg;
    if (target.shield > 0) {
      const absorbed = Math.min(target.shield, rest);
      target.shield -= absorbed;
      rest -= absorbed;
      if (absorbed > 0) popText(G.hexToPx(target.col, target.row).x, G.hexToPx(target.col, target.row).y, '🛡 −' + absorbed, G.C.gold);
    }
    if (rest > 0) {
      target.hp -= rest;
      if (sourceLabel) {
        const { x, y } = G.hexToPx(target.col, target.row);
        popText(x, y, '−' + rest + ' ' + sourceLabel, color || 0xff9d8a);
      }
      if (target.kind === 'hero') G.stats.damage += rest;
    }
    refresh(target);
    if (target.kind === 'zone') drawZoneHud();
    if (target.hp <= 0) killUnit(target);
    return rest;
  }

  function killUnit(u) {
    u.alive = false;
    u.hp = 0;
    G.sfx.play(u.kind === 'hero' ? 'thud' : 'hit');
    // трупов не оставляем: юнит гаснет и уходит со сцены целиком
    if (u.view && !u.view.destroyed) {
      u.view.__dying = true;
      G.tween(u.view, { alpha: 0 }, 360, () => {
        if (!u.alive && u.view && !u.view.destroyed) {
          if (u.view.parent) u.view.parent.removeChild(u.view);
          u.view.destroy({ children: true });
          u.view = null;
        }
      });
    }
    if (u.kind === 'enemy' || u.kind === 'zone') {
      // спрайтовый взрыв
      const ex = G.art.anim('fx_explosion', {
        h: 96, fps: 15, loop: false,
        onDone: () => { if (ex.view.parent) ex.view.parent.removeChild(ex.view); ex.view.destroy(); },
      });
      if (ex) {
        ex.view.x = u.view.x; ex.view.y = u.view.y - 8;
        ex.view.zIndex = 35;
        ex.view.alpha = 0.95;
        c.addChild(ex.view);
      }
      G.fxParticles.burst(u.view.x, u.view.y, 0xffb070, 10, { size: 3, speed: 130, ttl: 560 });
      if (u.kind === 'zone') onZoneDestroyed(u);
    }
    if (u.kind === 'hero') {
      G.ui.toast(G.t(u.def.nameKey) + ' — ' + G.t('tired'), 1400);
    }
    checkBattleState();
  }

  function onZoneDestroyed(zone) {
    G.sfx.play('chime');
    G.stats.facts++;
    // награда: команда лечится на 2
    for (const h of heroes) {
      if (h.alive) { h.hp = Math.min(h.maxHp, h.hp + 2); refresh(h); }
      else { h.hp = 2; h.alive = true; refresh(h); } // поднятие усталого
    }
    const factKey = 'fact_' + zone.defId;
    const p = G.ui.panel({
      x: G.W / 2, y: 360, w: 620,
      title: G.t('boss_dead_zone') + ' ' + G.t(zone.def.key),
      lines: [factKey],
      onClose: () => { c.removeChild(p); p.destroy({ children: true }); },
    });
    c.addChild(p);
    setTimeout(() => {
      if (c.destroyed || !p.parent) return;
      c.removeChild(p); p.destroy({ children: true });
    }, 3800);
  }

  function checkBattleState() {
    if (B.over) return;
    const foes = B.units.filter(u => (u.kind === 'enemy' || u.kind === 'zone') && u.alive);
    const team = heroes.filter(h => h.alive);
    if (team.length === 0) {
      B.over = true;
      G.sfx.play('thud');
      showDefeat();
    } else if (foes.length === 0) {
      B.over = true;
      if (wave.boss) showOffer();
      else waveClear();
    }
    updateOfferVisibility();
  }

  function updateOfferVisibility() {
    if (!wave.boss || B.over) return;
    const zonesAlive = B.units.filter(u => u.kind === 'zone' && u.alive);
    if (zonesAlive.length === 0 && !B.offerReady) {
      B.offerReady = true;
      G.ui.toast(G.t('boss_all_zones'), 2200);
    }
  }

  function showDefeat() {
    hideRing();
    clearHighlights();
    const p = new PIXI.Container();
    p.zIndex = 80;
    const pw = 520, ph = 220;
    const sheet = G.ui.parchment(pw, ph);
    sheet.x = G.W / 2; sheet.y = G.H / 2;
    const g = new PIXI.Graphics();
    G.ui.fancyFrame(g, pw, ph);
    g.x = G.W / 2; g.y = G.H / 2;
    g.roundRect(G.W / 2 - pw / 2 + 3, G.H / 2 - ph / 2 + 3, pw - 6, ph - 6, 12)
      .stroke({ width: 2, color: G.C.blood, alpha: 0.85 });
    const t = new PIXI.Text({
      text: G.t('defeat_title'),
      style: { fontFamily: G.FONT_TITLE, fontSize: 30, fill: G.C.blood },
    });
    t.anchor.set(0.5); t.x = G.W / 2; t.y = G.H / 2 - 60;
    const retry = G.ui.button({
      label: G.t('defeat_retry'), x: G.W / 2, y: G.H / 2 + 40, w: 280, h: 54, primary: true,
      onClick: () => G.setScene('battle', { wave: waveIdx }),
    });
    p.addChild(sheet, g, t, retry);
    c.addChild(p);
  }

  function showOffer() {
    // все зоны пробиты — победа через подписание оффера
    const btn = G.ui.button({
      label: '✍ ' + G.t('offer_card') + ' — ' + G.t('offer_sub'),
      x: G.W / 2, y: G.H / 2 - 40, w: 480, h: 72, primary: true,
      onClick: () => {
        G.stats.rounds += B.round;
        G.stats.facts += 4;
        G.progress = 3;
        G.setScene('victory');
      },
    });
    btn.zIndex = 90;
    c.addChild(btn);
    G.tween(btn, { y: G.H / 2 - 30 }, 700, null, G.easeOut);
    G.sfx.play('fanfare');
  }

  // --- Карты ---
  function dealHands() {
    for (const h of heroes) {
      if (!h.alive) { B.hands[h.id] = []; continue; }
      const deck = G.CARDS.filter(card => card.hero === h.id);
      // перемешать и взять 2
      const sh = deck.slice();
      for (let i = sh.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [sh[i], sh[j]] = [sh[j], sh[i]];
      }
      B.hands[h.id] = sh.slice(0, 2);
    }
  }

  function playCard(hero, card) {
    if (B.state !== 'act' || B.over) return;
    let actual = card;
    if (card.echo) {
      if (!B.lastCard) { G.ui.toast(G.t('echo_empty')); return; }
      actual = Object.assign({}, B.lastCard.card, { echoOf: B.lastCard.card.id });
    }
    G.sfx.play('card');
    G.stats.cards++;
    B.pendingCard = actual;
    hideHand();

    // мгновенные эффекты
    if (actual.shieldAll) {
      for (const h of heroes) if (h.alive) { h.shield += actual.shieldAll; refresh(h); }
      G.sfx.play('shield');
      const { x, y } = G.hexToPx(hero.col, hero.row);
      popText(x, y, '🛡 ' + G.t('shield') + ' +' + actual.shieldAll, G.C.gold);
    }
    if (actual.shieldSelf) {
      hero.shield += actual.shieldSelf;
      refresh(hero);
      G.sfx.play('shield');
    }
    if (actual.bonusNext) {
      hero.bonusNext = (hero.bonusNext || 0) + actual.bonusNext;
      const { x, y } = G.hexToPx(hero.col, hero.row);
      popText(x, y, '⚔ +' + actual.bonusNext + ' →', G.C.heroGreen);
      G.sfx.play('shield');
    }

    // цели: урон или лечение
    const targets = B.units.filter(u => {
      if (!u.alive || u === hero) return false;
      const d = G.hexDist(hero.col, hero.row, u.col, u.row);
      if (actual.dmg > 0) return (u.kind === 'enemy' || u.kind === 'zone') && d <= (actual.range || 1);
      if (actual.heal) return u.kind === 'hero' && d <= (actual.range || 1) && (u.hp < u.maxHp || !u.alive);
      return false;
    });
    if (targets.length === 0) {
      // мгновенная карта без целей
      finishActCard(hero, actual);
      return;
    }
    highlightCells(targets.map(u => ({ col: u.col, row: u.row })), actual.dmg > 0 ? 'attack' : 'move');
  }

  function applyCardToTarget(hero, card, u) {
    const d = G.hexDist(hero.col, hero.row, u.col, u.row);
    if (card.dmg > 0 && (u.kind === 'enemy' || u.kind === 'zone') && d <= (card.range || 1)) {
      const dmg = card.dmg + (hero.bonusNext || 0);
      hero.bonusNext = 0;
      const short = G.SHORT[G.lang][card.echoOf || card.id] || '';
      if (hero.sprite) playAnim(hero, 'atk', true);
      else if (hero.weapon) {
        G.tween(hero.weapon, { rotation: -1.25 }, 110, () => {
          G.tween(hero.weapon, { rotation: 0.15 }, 260, null, G.easeOut);
        }, G.easeOut);
      }
      B.state = 'anim';
      hideRing();
      const hx = hero.view.x, hy = hero.view.y;
      const tx = u.view.x, ty = u.view.y;
      G.tween(hero.view, { x: hx + (tx - hx) * 0.4, y: hy + (ty - hy) * 0.4 }, 110, () => {
        G.sfx.play('hit');
        G.fxShake.hit(card.dmg >= 4 ? 7 : 4);
        hitFlash(tx, ty);
        G.fxParticles.burst(tx, ty, 0xff9d8a, card.dmg >= 4 ? 14 : 9, { size: 3, speed: 120, ttl: 520 });
        applyDamage(u, dmg, short, 0xff9d8a);
        G.tween(hero.view, { x: hx, y: hy }, 170, () => {
          if (card.stun && u.alive) {
            u.stunned = true;
            G.sfx.play('stun');
            const { x, y } = G.hexToPx(u.col, u.row);
            popText(x, y - 26, '💫', 0xffe4a8);
          }
          finishActCard(hero, card);
        }, G.easeOut);
      }, G.easeOut);
    } else if (card.heal && u.kind === 'hero' && d <= (card.range || 1)) {
      if (hero.sprite) playAnim(hero, 'heal', true);
      G.sfx.play('heal');
      u.hp = Math.min(u.maxHp, u.hp + card.heal);
      if (!u.alive) { u.alive = true; G.ui.toast(G.t(u.def.nameKey) + ' — back!', 1200); }
      const { x, y } = G.hexToPx(u.col, u.row);
      popText(x, y, '+' + card.heal, G.C.heroGreen);
      refresh(u);
      finishActCard(hero, card);
    } else {
      finishActCard(hero, card);
    }
  }

  function finishActCard(hero, card) {
    if (card) B.lastCard = { card: card.echoOf ? G.CARDS.find(x => x.id === card.echoOf) : card };
    B.pendingCard = null;
    hideHand();
    clearHighlights();
    advanceAct();
  }

  function onHexTap(col, row) {
    if (B.over || B.state === 'intro' || B.state === 'anim') return;
    if (B.state === 'move') {
      const hero = B.activeHero;
      if (!hero) return;
      const ok = (B.hiViews || []).length >= 0; // подсветка уже валидна
      const reachable = G.hexReachable(hero.col, hero.row, hero.move, occupied(hero));
      const canStay = true;
      const inRange = (col === hero.col && row === hero.row) ||
        reachable.some(c => c.col === col && c.row === row);
      if (!inRange) return;
      clearHighlights();
      if (col === hero.col && row === hero.row) {
        advanceMove();
        return;
      }
      B.state = 'moving';
      G.tween(hero.view, { x: G.hexToPx(col, row).x, y: G.hexToPx(col, row).y }, 260, () => {
        hero.col = col; hero.row = row;
        showRing(hero);
        const { x, y } = G.hexToPx(col, row);
        G.fxParticles.burst(x, y + 22, 0x8a94a0, 6, { size: 2.5, speed: 55, ttl: 420, grav: 60 });
        advanceMove();
      }, G.easeOut);
    }
  }

  function onUnitTap(u) {
    if (B.over || B.state === 'intro' || B.state === 'anim' || B.state === 'enemy') return;
    if (B.state === 'act' && B.pendingCard) {
      // выбор цели карты
      const hero = B.activeHero;
      const card = B.pendingCard;
      applyCardToTarget(hero, card, u);
      return;
    }
    if (B.state === 'move' || B.state === 'act') {
      // переключение на другого героя (если он ещё не отработал эту фазу)
      if (u.kind === 'hero' && u.alive && u !== B.activeHero) {
        const done = B.subphase === 'move' ? u.moved : u.acted;
        if (!done) {
          // вернуть текущего в очередь
          if (B.activeHero) {
            if (B.subphase === 'move') B.activeHero.moved = false;
            else B.activeHero.acted = false;
          }
          hideHand(); clearHighlights();
          B.activeHero = u;
          if (B.subphase === 'move') {
            showRing(u);
            highlightCells(
              G.hexReachable(u.col, u.row, u.move, occupied(u)).concat([{ col: u.col, row: u.row }]),
              'move'
            );
            setStage(G.t('st_move', { n: G.t(u.def.nameKey) }));
          } else {
            showRing(u);
            showHand(u);
            setStage(G.t('st_act', { n: G.t(u.def.nameKey) }));
          }
          G.sfx.play('blip');
        }
      }
    }
  }

  // --- Фаза врагов ---
  async function enemyPhase() {
    if (B.over) return;
    B.state = 'enemy';
    phaseLabel.text = G.t('phase_enemy');
    phaseLabel.style.fill = G.C.enemy;
    drawInitiative();
    await sleep(350);

    const foes = B.units.filter(u => u.kind === 'enemy');
    for (let fi = 0; fi < foes.length; fi++) {
      const e = foes[fi];
      if (c.destroyed || B.over) return;
      if (!e.alive) { B.enemyCursor = fi; drawInitiative(); continue; }
      B.enemyCursor = fi;
      drawInitiative();
      // баннер: данный враг сейчас двигается
      const banner = new PIXI.Text({
        text: G.t('enemy_move', { n: unitName(e) }),
        style: {
          fontFamily: G.FONT_TITLE, fontSize: 20, fill: G.C.enemy,
          stroke: { color: 0x0a0f18, width: 4 },
        },
      });
      banner.anchor.set(0.5);
      banner.x = G.W / 2; banner.y = 104;
      banner.zIndex = 70;
      banner.alpha = 0;
      c.addChild(banner);
      G.tween(banner, { alpha: 1 }, 180, () => {
        G.tween(banner, { alpha: 0 }, 420, () => {
          if (banner.parent) c.removeChild(banner);
          banner.destroy();
        }, G.easeOut);
      }, G.easeOut);
      showRing(e);
      if (e.stunned) {
        e.stunned = false;
        const { x, y } = G.hexToPx(e.col, e.row);
        popText(x, y, '💫', 0xffe4a8);
        hideRing();
        continue;
      }
      const def = e.def;
      if (def.healSelf) {
        e.hp = Math.min(e.maxHp, e.hp + def.healSelf);
        const { x, y } = G.hexToPx(e.col, e.row);
        popText(x, y, '+' + def.healSelf, G.C.enemy);
        refresh(e);
        await sleep(150);
      }
      let dmg = e.dmg;
      if (def.grow) {
        dmg += def.grow * Math.floor((B.round - 1) / 2);
        if (!B.events.includes('sum_deadline')) B.events.push('sum_deadline');
      }

      // ближайший живой герой
      const targets = heroes.filter(h => h.alive);
      if (targets.length === 0) break;
      targets.sort((a, b) => G.hexDist(e.col, e.row, a.col, a.row) - G.hexDist(e.col, e.row, b.col, b.row));
      const t = targets[0];
      const dist = G.hexDist(e.col, e.row, t.col, t.row);

      if (dist <= 1) {
        if (c.destroyed || B.over) return;
        attackHero(e, t, dmg);
        await sleep(320);
      } else {
        // подойти, но не вставать на клетку цели или других юнитов
        const path = G.hexPath(e.col, e.row, t.col, t.row, occupied(e));
        if (path) {
          const steps = path.slice(0, e.move)
            .filter(st => !(st.col === t.col && st.row === t.row));
          for (const step of steps) {
            if (c.destroyed || B.over) return;
            if (G.hexDist(e.col, e.row, t.col, t.row) <= 1) break; // уже рядом
            if (unitAt(step.col, step.row)) break; // путь перегорожен
            e.col = step.col; e.row = step.row;
            const { x, y } = G.hexToPx(e.col, e.row);
            G.tween(e.view, { x, y }, 140);
            await sleep(140);
          }
          refresh(e);
          if (G.hexDist(e.col, e.row, t.col, t.row) <= 1) {
            if (c.destroyed || B.over) return;
            attackHero(e, t, dmg);
            await sleep(320);
          }
        }
      }
      hideRing();
    }

    // босс: рёв — бьёт случайного героя
    if (wave.boss && !B.over) {
      const targets = heroes.filter(h => h.alive);
      if (targets.length > 0) {
        B.bossDmg = 1 + Math.floor(B.round / 2);
        if (!B.events.includes('sum_boss')) B.events.push('sum_boss');
        const t = targets[Math.floor(Math.random() * targets.length)];
        G.sfx.play('boss');
        await sleep(240);
        attackHero(null, t, B.bossDmg, G.t('boss_name'));
        await sleep(350);
      }
    }

    if (c.destroyed || B.over) return;

    // новый раунд: итоги + фазы игрока
    B.round++;
    roundLabel.text = G.t('round_n', { n: B.round });
    phaseLabel.text = G.t('phase_player');
    phaseLabel.style.fill = G.C.heroBlue;
    for (const h of heroes) { h.acted = false; if (h.alive) { h.shield = 0; refresh(h); } }
    dealHands();
    startPlayerPhase();
    drawPhaseBar();
    roundBanner(B.round, B.events.map(k => G.t(k, { n: B.bossDmg })).join(' · '));
  }

  function attackHero(source, hero, dmg, labelOverride) {
    const short = labelOverride || (source ? G.t(source.def.key).toLowerCase() : '');
    applyDamage(hero, dmg, short, 0xff6a5a);
  }

  // --- Стадия разведки: брифинг волны ---
  function waveIntro() {
    B.state = 'intro';
    setStage(null);
    drawPhaseBar();
    const ov = new PIXI.Container();
    ov.zIndex = 85;
    ov.eventMode = 'static';
    const dim = new PIXI.Graphics();
    dim.rect(0, 0, G.W, G.H).fill({ color: 0x060a12, alpha: 0.72 });
    ov.addChild(dim);
    const head = new PIXI.Text({
      text: G.t(wave.nameKey),
      style: { fontFamily: G.FONT_TITLE, fontSize: 30, fill: G.C.ink, letterSpacing: 2 },
    });
    // панель подрастает под заголовок: Ruslan Display шире системного
    const pw = Math.max(620, head.width + 84);
    const ph = wave.boss ? 300 : 262;
    const sheet = G.ui.parchment(pw, ph);
    sheet.x = G.W / 2; sheet.y = G.H / 2 - 20;
    const pg = new PIXI.Graphics();
    G.ui.fancyFrame(pg, pw, ph);
    pg.x = G.W / 2; pg.y = G.H / 2 - 20;
    ov.addChild(sheet, pg);
    head.anchor.set(0.5, 0);
    head.x = G.W / 2; head.y = G.H / 2 - ph / 2 + 4;
    const hint = new PIXI.Text({
      text: G.t(wave.hintKey),
      style: { fontFamily: G.FONT_BODY, fontSize: 15, fill: G.C.inkSoft, wordWrap: true, wordWrapWidth: pw - 80, align: 'center' },
    });
    hint.anchor.set(0.5, 0);
    hint.x = G.W / 2; hint.y = G.H / 2 - ph / 2 + 46;
    ov.addChild(head, hint);

    // ростер противника
    const roster = new PIXI.Container();
    roster.x = G.W / 2; roster.y = G.H / 2 - ph / 2 + 96;
    const foes = B.units.filter(u => u.kind === 'enemy' || u.kind === 'zone');
    const byName = new Map();
    for (const f of foes) {
      const k = unitName(f);
      const cur = byName.get(k) || { count: 0, hp: f.maxHp };
      cur.count++;
      byName.set(k, cur);
    }
    let ry = 0;
    for (const [name, info] of byName) {
      const t = new PIXI.Text({
        text: (info.count > 1 ? info.count + ' × ' : '') + name + '  —  ' + G.t('roster_hp', { n: info.hp }),
        style: { fontFamily: G.FONT_BODY, fontSize: 16, fill: G.C.ink },
      });
      t.x = -80; t.y = ry;
      const dot = new PIXI.Graphics();
      dot.circle(-96, ry + 9, 5).fill(G.C.blood);
      roster.addChild(dot, t);
      ry += 34;
    }
    ov.addChild(roster);

    const start = G.ui.button({
      label: G.t('intro_battle'), x: G.W / 2, y: G.H / 2 + ph / 2 - 58, w: 260, h: 56, primary: true,
      onClick: () => {
        G.sfx.play(wave.boss ? 'boss' : 'blip');
        c.removeChild(ov);
        ov.destroy({ children: true });
        startWave();
      },
    });
    ov.addChild(start);
    c.addChild(ov);
  }

  // вход в боевую фазу после брифинга
  function startWave() {
    startPlayerPhase();
  }

  // --- Итоги волны: панель со статистикой ---
  function waveClear() {
    G.sfx.play('chime');
    G.stats.rounds += B.round;
    G.progress = waveIdx + 1;
    hideRing();
    clearHighlights();
    const ov = new PIXI.Container();
    ov.zIndex = 85;
    ov.eventMode = 'static';
    const dim = new PIXI.Graphics();
    dim.rect(0, 0, G.W, G.H).fill({ color: 0x060a12, alpha: 0.6 });
    ov.addChild(dim);
    const pw = 480, ph = 260;
    const sheet = G.ui.parchment(pw, ph);
    sheet.x = G.W / 2; sheet.y = G.H / 2;   // панель в центре, текст уже ждёт её там
    const pg = new PIXI.Graphics();
    G.ui.fancyFrame(pg, pw, ph);
    pg.x = G.W / 2; pg.y = G.H / 2;
    ov.addChild(sheet, pg);
    const head = new PIXI.Text({
      text: G.t('wave_clear_title'),
      style: { fontFamily: G.FONT_TITLE, fontSize: 30, fill: G.C.ink, letterSpacing: 2 },
    });
    head.anchor.set(0.5, 0);
    head.x = G.W / 2; head.y = G.H / 2 - ph / 2 + 24;
    ov.addChild(head);
    const rows = [
      G.t('wc_rounds', { n: B.round }),
      G.t('wc_damage', { n: G.stats.damage - waveDamage0 }),
      G.t('wc_cards', { n: G.stats.cards - waveCards0 }),
    ];
    rows.forEach((r, i) => {
      const t = new PIXI.Text({
        text: r,
        style: { fontFamily: G.FONT_BODY, fontSize: 17, fill: G.C.ink },
      });
      t.x = G.W / 2 - 130; t.y = G.H / 2 - ph / 2 + 84 + i * 34;
      ov.addChild(t);
    });
    const cont = G.ui.button({
      label: G.t('wc_cont'), x: G.W / 2, y: G.H / 2 + ph / 2 - 52, w: 260, h: 50, primary: true,
      onClick: () => G.setScene('village', { unlocked: G.progress }),
    });
    ov.addChild(cont);
    c.addChild(ov);
  }

  // --- Старт раунда 1 ---
  phaseLabel.text = G.t('phase_player');
  dealHands();
  drawInitiative();
  waveIntro();

  c.tick = (dtMs) => {
    const t = performance.now() / 1000;
    if (ring.visible) ring.rotation += (dtMs / 1000) * 1.4;
    // вода дышит: медленный дрейф тайла
    if (water && water.__tile) {
      water.__tile.tilePosition.x = t * 7;
      water.__tile.tilePosition.y = Math.sin(t * 0.6) * 5;
    }
    tickAnims(dtMs);
    for (const u of B.units) {
      if (u.body && u.alive) u.body.y = Math.sin(t * 2.3 + u.bobPhase) * 1.2;
    }
    // светлячки
    for (const f of flies) {
      f.g.x = f.cx + Math.sin(t * 0.6 + f.phase) * 34;
      f.g.y = f.cy + Math.cos(t * 0.8 + f.phase) * 20;
      f.g.alpha = 0.22 + 0.22 * Math.sin(t * 1.8 + f.phase);
    }
  };

  // отладочный доступ для автотестов
  G.battleCtx = { B, heroes, playCard, onHexTap, onUnitTap, advanceMove, advanceAct, enemyPhase, dealHands, startWave, waveClear, showDefeat };

  return c;
};

// Иконки карт (эмодзи — нулевая цена, читаются мгновенно)
G.CARD_ICONS = {
  balance_lab: '⚖️', event_tuner: '📅', gwent_logic: '🃏',
  echo_loop: '🌀', onefile: '📄', mvp: '⚡',
  rune_sdk: '🛡️', kb472: '💾', code_review: '🔧',
};

// Карта способности v3: гвинт-пергамент, геройская кромка, иконка в круге
G.ui.drawCard = function (card, index, heroColor) {
  const cc = new PIXI.Container();
  cc.eventMode = 'static';
  cc.cursor = 'pointer';
  const w = 176, h = 100;
  const body = G.art.nine && G.UI9 && G.UI9.paper
    ? G.art.nine('paper', w, h)
    : new PIXI.Graphics();
  if (!G.art.nine || !G.UI9 || !G.UI9.paper) body.roundRect(0, 0, w, h, 10).fill(G.C.paper);
  const g = new PIXI.Graphics();
  const draw = (hover) => {
    g.clear();
    if (hover) {
      g.roundRect(1, 1, w - 2, h - 2, 10).fill({ color: 0xfff6dd, alpha: 0.42 });
      g.roundRect(1, 1, w - 2, h - 2, 10).stroke({ width: 2, color: G.C.goldDark, alpha: 1 });
    }
    // геройская кромка снизу
    g.roundRect(8, h - 9, w - 16, 4, 2).fill({ color: heroColor || G.C.goldDark, alpha: 0.9 });
  };
  draw(false);
  const icon = new PIXI.Text({
    text: G.CARD_ICONS[card.id] || '⚔️',
    style: { fontSize: 17 },
  });
  icon.anchor.set(0.5);
  const iconBg = new PIXI.Graphics();
  iconBg.circle(w - 21, 20, 15).fill(0x2c2115);
  iconBg.circle(w - 21, 20, 15).stroke({ width: 1.5, color: G.C.goldDark, alpha: 0.9 });
  icon.x = w - 21; icon.y = 20;
  const name = new PIXI.Text({
    text: G.t('c_' + card.id),
    style: { fontFamily: G.FONT_TITLE, fontSize: 13, fill: G.C.ink, letterSpacing: 0.5 },
  });
  name.x = 10; name.y = 7;
  const desc = new PIXI.Text({
    text: G.t('c_' + card.id + '_d'),
    style: {
      fontFamily: G.FONT_BODY, fontSize: 11.5, fill: G.C.ink, fontWeight: 'bold',
      wordWrap: true, wordWrapWidth: w - 26, lineHeight: 13.5,
    },
  });
  desc.x = 10; desc.y = 32;
  const fact = new PIXI.Text({
    text: G.t('c_' + card.id + '_f'),
    style: {
      fontFamily: G.FONT_BODY, fontSize: 10.5, fill: G.C.inkDim,
      wordWrap: true, wordWrapWidth: w - 26, lineHeight: 12,
    },
  });
  fact.x = 10; fact.y = 62;
  cc.addChild(body, g, iconBg, icon, name, desc, fact);
  cc.on('pointerover', () => { draw(true); cc.y = -4; });
  cc.on('pointerout', () => { draw(false); cc.y = 0; });
  return cc;
};

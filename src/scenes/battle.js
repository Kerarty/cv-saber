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
    state: 'select',       // select | moving | acting | enemy | over
    activeHero: null,
    pendingCard: null,
    hands: {},             // heroId -> [card, card]
    lastCard: null,        // {card} для Echo Loop
    bossDmg: 1,
    offerReady: false,
    over: false,
  };

  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const key = (col, row) => col + ',' + row;

  // --- Фон поля ---
  const bg = new PIXI.Graphics();
  bg.rect(0, 0, G.W, G.H).fill(0x0f1826);
  bg.rect(0, 0, G.W, 60).fill(0x0b121d);      // верхняя плашка
  bg.rect(0, G.H - 128, G.W, 128).fill(0x0b121d); // нижняя плашка карт
  c.addChild(bg);

  // --- Гексы ---
  const hexLayer = new PIXI.Container();
  hexLayer.sortableChildren = true;
  c.addChild(hexLayer);
  for (let col = 0; col < G.HEX.cols; col++) {
    for (let row = 0; row < G.HEX.rows; row++) {
      const { x, y } = G.hexToPx(col, row);
      const g = new PIXI.Graphics();
      g.poly(hexPoints(x, y)).fill(G.C.hexFill).stroke({ width: 1.5, color: G.C.hexBorder });
      g.eventMode = 'static';
      g.on('pointertap', () => onHexTap(col, row));
      hexLayer.addChild(g);
      B.hexViews.set(key(col, row), g);
      g.__x = x; g.__y = y;
    }
  }

  function hexPoints(cx, cy) {
    const s = G.HEX.size * 0.96;
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
  roundLabel.x = G.W / 2 - 40; roundLabel.y = 16;
  const phaseLabel = new PIXI.Text({
    text: G.t('phase_player'),
    style: { fontFamily: G.FONT_BODY, fontSize: 17, fill: G.C.heroBlue, fontWeight: 'bold' },
  });
  phaseLabel.anchor.set(1, 0);
  phaseLabel.x = G.W - 24; phaseLabel.y = 16;
  const hintText = new PIXI.Text({
    text: G.t(wave.hintKey),
    style: { fontFamily: G.FONT_BODY, fontSize: 13, fill: G.C.textDim },
  });
  hintText.anchor.set(1, 0);
  hintText.x = G.W - 24; hintText.y = 40;
  c.addChild(waveLabel, roundLabel, phaseLabel, hintText);

  // Лента инициативы: герои слева, враги справа
  const init = new PIXI.Container();
  init.y = 46;
  c.addChild(init);

  function drawInitiative() {
    init.removeChildren();
    let x = 24;
    for (const u of B.units) {
      if (u.kind === 'zone') continue;
      const g = new PIXI.Graphics();
      g.circle(0, 0, 6).fill(u.kind === 'hero' ? (u.alive ? u.def.color : 0x3a3a3a) : G.C.enemy);
      g.x = x;
      init.addChild(g);
      x += 16;
    }
    // маркер активной фазы
    const m = new PIXI.Graphics();
    m.poly([0, -10, 7, -18, -7, -18]).fill(G.C.gold);
    m.x = B.state === 'enemy' ? x - 8 : 24 + 0;
    m.y = 0;
    init.addChild(m);
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
      const cardV = G.ui.drawCard(card, i);
      cardV.x = 24 + i * 190;
      cardV.y = 16;
      cardV.on('pointertap', () => playCard(hero, card));
      handBar.addChild(cardV);
    });

    const skip = G.ui.button({
      label: G.t('skip'), x: G.W - 120, y: 42, w: 150, h: 44, small: true,
      onClick: () => { G.sfx.play('blip'); finishHero(hero); },
    });
    handBar.addChild(skip);
  }

  function hideHand() { handBar.removeChildren(); }

  // --- Юниты ---
  function makeUnit(o) {
    const u = Object.assign({
      kind: 'enemy', hp: 1, maxHp: 1, shield: 0, alive: true, stunned: false,
      acted: false, bonus: 0, move: 0, dmg: 0,
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
    u.view.removeChildren();
    const g = new PIXI.Graphics();
    const body = u.kind === 'hero' ? drawViking : (u.kind === 'zone' ? drawZoneFace : drawEnemy);
    body(g, u);
    // полоска HP
    const barW = 44;
    const hpRatio = Math.max(0, u.hp / u.maxHp);
    g.rect(-barW / 2, -46, barW, 6).fill(0x000000).rect(-barW / 2 + 1, -45, (barW - 2) * hpRatio, 4)
      .fill(u.kind === 'hero' ? G.C.heroGreen : (u.kind === 'zone' ? G.C.gold : G.C.enemy));
    // щит
    if (u.shield > 0) {
      g.circle(barW / 2 + 4, -43, 7).fill(G.C.gold);
      g.circle(barW / 2 + 4, -43, 4).fill(0xffe4a8);
    }
    // имя
    const label = new PIXI.Text({
      text: unitName(u),
      style: { fontFamily: G.FONT_BODY, fontSize: 11, fill: G.C.textDim, fontWeight: 'bold' },
    });
    label.anchor.set(0.5);
    label.y = 34;
    u.view.addChild(g, label);
    if (!u.alive) u.view.alpha = 0.35;
  }

  function unitName(u) {
    if (u.kind === 'hero') return G.t(u.def.nameKey);
    if (u.kind === 'zone') return G.t(u.def.key);
    return G.t(u.def.key);
  }

  function drawViking(g, u) {
    const col = u.def.color;
    g.circle(0, 26, 16).fill({ color: 0x000000, alpha: 0.25 }); // тень
    g.rect(-8, 0, 16, 22).fill(col);           // тело
    g.circle(0, -8, 11).fill(0xe8c39e);        // голова
    g.arc(0, -2, 12, Math.PI * 0.15, Math.PI * 0.85).fill(0x8a5a2a); // борода
    g.rect(-11, -22, 22, 8).fill(0x9aa7b5);    // шлем
    g.moveTo(-11, -18).lineTo(-19, -28).lineTo(-13, -19).closePath().fill(0xd8d8d8); // рог L
    g.moveTo(11, -18).lineTo(19, -28).lineTo(13, -19).closePath().fill(0xd8d8d8);    // рог R
    if (u.id === 'berserk') { // топор
      g.rect(12, -6, 3, 26).fill(0x6b4a2a);
      g.poly([15, -6, 27, -2, 15, 4]).fill(0xb8c4d0);
    } else if (u.id === 'skald') { // лира/струны
      g.circle(-13, 4, 6).fill(0x8a5a2a);
      g.circle(-13, 4, 2.5).fill(0xffe4a8);
    } else { // молот
      g.rect(-16, -8, 3, 26).fill(0x6b4a2a);
      g.rect(-24, -14, 16, 9).fill(0x9aa7b5);
    }
  }

  function drawEnemy(g, u) {
    const col = u.def.color;
    g.circle(0, 26, 15).fill({ color: 0x000000, alpha: 0.25 });
    switch (u.defKey) {
      case 'krynch': // кринч: капля с хитрой улыбкой
        g.circle(0, 2, 17).fill(col);
        g.circle(-6, -4, 3).fill(0xffe4a8);
        g.circle(6, -4, 3).fill(0xffe4a8);
        g.arc(0, 4, 8, Math.PI * 0.15, Math.PI * 0.85).stroke({ width: 2.5, color: 0xffe4a8 });
        break;
      case 'deadline': // дедлайн: песочные часы
        g.poly([-14, -14, 14, -14, 2, 0, 14, 16, -14, 16, -2, 0]).fill(col);
        g.rect(-14, -17, 28, 4).fill(0x8a2f2a);
        g.rect(-14, 15, 28, 4).fill(0x8a2f2a);
        g.circle(0, 8, 3).fill(0xffe4a8);
        break;
      default: // баг: жук
        g.ellipse(0, 2, 14, 18).fill(col);
        g.circle(0, -14, 8).fill(col);
        g.circle(-5, -16, 2).fill(0xffe4a8);
        g.circle(5, -16, 2).fill(0xffe4a8);
        g.moveTo(0, -8).lineTo(0, 18).stroke({ width: 1.5, color: 0x7a2a22 });
        for (let i = -1; i <= 1; i++) {
          g.moveTo(-13, i * 8).lineTo(-20, i * 8 + 4).stroke({ width: 2, color: 0x7a2a22 });
          g.moveTo(13, i * 8).lineTo(20, i * 8 + 4).stroke({ width: 2, color: 0x7a2a22 });
        }
    }
  }

  function drawZoneFace(g, u) {
    const faces = { mobile: 0x4a9db8, balance: 0xb8a24a, unity: 0x7ab55c, team: 0x9b6ab8 };
    const col = faces[u.defId] || G.C.enemy;
    g.circle(0, 24, 18).fill({ color: 0x000000, alpha: 0.25 });
    g.roundRect(-20, -16, 40, 42, 8).fill(0x2a3240);      // маска
    g.roundRect(-20, -16, 40, 42, 8).stroke({ width: 2, color: col });
    g.circle(-7, -2, 4).fill(col);
    g.circle(7, -2, 4).fill(col);
    g.moveTo(-8, 14).lineTo(8, 14).stroke({ width: 2.5, color: col });
  }

  // Тотем босса на фоне зон
  if (wave.boss) {
    const totem = new PIXI.Graphics();
    const base = G.hexToPx(9, 2);
    totem.roundRect(base.x - 52, base.y - 190, 104, 320, 16).fill(0x1d2735);
    totem.roundRect(base.x - 52, base.y - 190, 104, 320, 16).stroke({ width: 2, color: 0x3a2f22 });
    for (let i = 0; i < 3; i++) {
      totem.moveTo(base.x - 52, base.y - 190 + 90 + i * 85).lineTo(base.x + 52, base.y - 190 + 90 + i * 85)
        .stroke({ width: 3, color: 0x3a2f22 });
    }
    totem.circle(base.x, base.y - 210, 10).fill(G.C.enemy);
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
    for (const cell of cells) {
      const g = new PIXI.Graphics();
      const { x, y } = G.hexToPx(cell.col, cell.row);
      g.poly(hexPoints(x, y)).fill(mode === 'move' ? G.C.hexMove : G.C.hexAtk)
        .stroke({ width: 2, color: mode === 'move' ? 0x59b7c9 : 0xd0685c });
      g.zIndex = 5;
      hexLayer.addChild(g);
      B.hiViews.push({ g });
    }
  }

  // Перерисовать юнита (hp/щит/состояние)
  function refresh(u) {
    if (!u.view || u.view.destroyed) return;
    const { x, y } = G.hexToPx(u.col, u.row);
    u.view.x = x; u.view.y = y;
    drawUnitView(u);
  }

  function popText(x, y, text, color) {
    G.ui.popText(x, y - 30, text, color);
  }

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
    if (target.hp <= 0) killUnit(target);
    return rest;
  }

  function killUnit(u) {
    u.alive = false;
    u.hp = 0;
    G.sfx.play(u.kind === 'hero' ? 'thud' : 'hit');
    if (u.kind === 'enemy' || u.kind === 'zone') {
      G.tween(u.view, { alpha: 0.15 }, 400);
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

  function waveClear() {
    G.sfx.play('chime');
    G.stats.rounds += B.round;
    G.progress = waveIdx + 1;
    G.ui.toast(G.t('wave_clear'), 1800);
    setTimeout(() => { if (!c.destroyed) G.setScene('village', { unlocked: G.progress }); }, 1800);
  }

  function showDefeat() {
    const p = new PIXI.Container();
    p.zIndex = 80;
    const g = new PIXI.Graphics();
    g.roundRect(G.W / 2 - 260, G.H / 2 - 110, 520, 220, 16).fill({ color: G.C.panelDark, alpha: 0.97 })
      .roundRect(G.W / 2 - 260, G.H / 2 - 110, 520, 220, 16).stroke({ width: 2, color: G.C.enemy });
    const t = new PIXI.Text({
      text: G.t('defeat_title'),
      style: { fontFamily: G.FONT_TITLE, fontSize: 30, fill: G.C.enemy },
    });
    t.anchor.set(0.5); t.x = G.W / 2; t.y = G.H / 2 - 60;
    const retry = G.ui.button({
      label: G.t('defeat_retry'), x: G.W / 2, y: G.H / 2 + 40, w: 280, h: 54, primary: true,
      onClick: () => G.setScene('battle', { wave: waveIdx }),
    });
    p.addChild(g, t, retry);
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
    if (B.state !== 'select' || B.over) return;
    let actual = card;
    if (card.echo) {
      if (!B.lastCard) { G.ui.toast(G.t('echo_empty')); return; }
      actual = Object.assign({}, B.lastCard.card, { echoOf: B.lastCard.card.id });
    }
    G.sfx.play('card');
    G.stats.cards++;
    B.activeHero = hero;
    B.pendingCard = actual;
    hideHand();

    // мгновенные эффекты без цели
    let needMove = actual.move > 0;
    let needTarget = false;

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
    if (actual.buff) {
      hero.bonus = (hero.bonus || 0) + actual.buff;
      const { x, y } = G.hexToPx(hero.col, hero.row);
      popText(x, y, '⚔ +' + actual.buff, G.C.heroGreen);
      G.sfx.play('shield');
    }
    if (actual.heal) needTarget = true;

    if (needMove) {
      const cells = G.hexReachable(hero.col, hero.row, actual.move, occupied(hero));
      cells.push({ col: hero.col, row: hero.row }); // остаться на месте
      highlightCells(cells, 'move');
      B.state = 'moving';
    } else if (actual.dmg > 0 || needTarget) {
      enterActing();
    } else {
      finishHero(hero, actual);
    }
  }

  function enterActing() {
    const hero = B.activeHero;
    const card = B.pendingCard;
    B.state = 'acting';
    const targets = B.units.filter(u => {
      if (!u.alive || u === hero) return false;
      const d = G.hexDist(hero.col, hero.row, u.col, u.row);
      if (card.dmg > 0) return (u.kind === 'enemy' || u.kind === 'zone') && d <= (card.range || 1);
      if (card.heal) return u.kind === 'hero' && d <= (card.range || 1) && (u.hp < u.maxHp || !u.alive);
      return false;
    });
    if (targets.length === 0) {
      // целей нет — ход завершён
      finishHero(hero, card);
      return;
    }
    highlightCells(targets.map(u => ({ col: u.col, row: u.row })), card.dmg > 0 ? 'attack' : 'move');
  }

  function onHexTap(col, row) {
    if (B.over) return;
    if (B.state === 'moving') {
      const hero = B.activeHero;
      const card = B.pendingCard;
      const occ = occupied(hero);
      if (occ.has(key(col, row)) && !(col === hero.col && row === hero.row)) return;
      clearHighlights();
      const doAct = () => {
        if (card.dmg > 0 || card.heal) enterActing();
        else finishHero(hero, card);
      };
      if (col === hero.col && row === hero.row) {
        doAct();
      } else {
        B.state = 'anim';
        G.tween(hero.view, { x: G.hexToPx(col, row).x, y: G.hexToPx(col, row).y }, 260, () => {
          hero.col = col; hero.row = row;
          doAct();
        }, G.easeOut);
      }
    } else if (B.state === 'select') {
      // тап по пустому гексу — снять выбор героя
      B.activeHero = null;
      hideHand();
    }
  }

  function onUnitTap(u) {
    if (B.over) return;
    if (B.state === 'acting') {
      const hero = B.activeHero;
      const card = B.pendingCard;
      const d = G.hexDist(hero.col, hero.row, u.col, u.row);
      if (card.dmg > 0 && (u.kind === 'enemy' || u.kind === 'zone') && d <= (card.range || 1)) {
        let dmg = card.dmg + (hero.bonus || 0);
        hero.bonus = 0;
        const short = G.SHORT[G.lang][card.echoOf || card.id] || '';
        G.sfx.play('hit');
        applyDamage(u, dmg, short, 0xff9d8a);
        if (card.stun && u.alive) {
          u.stunned = true;
          G.sfx.play('stun');
          const { x, y } = G.hexToPx(u.col, u.row);
          popText(x, y - 26, '💫', 0xffe4a8);
        }
        finishHero(hero, card);
      } else if (card.heal && u.kind === 'hero' && d <= (card.range || 1)) {
        G.sfx.play('heal');
        u.hp = Math.min(u.maxHp, u.hp + card.heal);
        if (!u.alive) { u.alive = true; G.ui.toast(G.t(u.def.nameKey) + ' — back!', 1200); }
        const { x, y } = G.hexToPx(u.col, u.row);
        popText(x, y, '+' + card.heal, G.C.heroGreen);
        refresh(u);
        finishHero(hero, card);
      }
    } else if (B.state === 'select') {
      if (u.kind === 'hero' && u.alive && !u.acted) {
        B.activeHero = u;
        G.sfx.play('blip');
        showHand(u);
      }
    }
  }

  function finishHero(hero, card) {
    hero.acted = true;
    if (card) B.lastCard = { card: card.echoOf ? G.CARDS.find(x => x.id === card.echoOf) : card };
    B.activeHero = null;
    B.pendingCard = null;
    hideHand();
    clearHighlights();
    B.state = 'select';
    drawInitiative();
    const left = heroes.filter(h => h.alive && !h.acted);
    if (left.length === 0) enemyPhase();
  }

  // --- Фаза врагов ---
  async function enemyPhase() {
    if (B.over) return;
    B.state = 'enemy';
    phaseLabel.text = G.t('phase_enemy');
    phaseLabel.style.fill = G.C.enemy;
    drawInitiative();
    await sleep(500);

    for (const e of B.units.filter(u => u.kind === 'enemy')) {
      if (c.destroyed || B.over) return;
      if (!e.alive) continue;
      if (e.stunned) {
        e.stunned = false;
        const { x, y } = G.hexToPx(e.col, e.row);
        popText(x, y, '💫', 0xffe4a8);
        continue;
      }
      const def = e.def;
      if (def.healSelf) {
        e.hp = Math.min(e.maxHp, e.hp + def.healSelf);
        const { x, y } = G.hexToPx(e.col, e.row);
        popText(x, y, '+' + def.healSelf, G.C.enemy);
        refresh(e);
        await sleep(220);
      }
      let dmg = e.dmg;
      if (def.grow) dmg += def.grow * Math.floor((B.round - 1) / 2);

      // ближайший живой герой
      const targets = heroes.filter(h => h.alive);
      if (targets.length === 0) break;
      targets.sort((a, b) => G.hexDist(e.col, e.row, a.col, a.row) - G.hexDist(e.col, e.row, b.col, b.row));
      const t = targets[0];
      const dist = G.hexDist(e.col, e.row, t.col, t.row);

      if (dist <= 1) {
        if (c.destroyed || B.over) return;
        attackHero(e, t, dmg);
        await sleep(450);
      } else {
        // подойти
        const path = G.hexPath(e.col, e.row, t.col, t.row, occupied(e));
        if (path) {
          const steps = path.slice(0, e.move);
          for (const step of steps) {
            if (c.destroyed) return;
            e.col = step.col; e.row = step.row;
            const { x, y } = G.hexToPx(e.col, e.row);
            G.tween(e.view, { x, y }, 200);
            await sleep(200);
          }
          refresh(e);
          if (G.hexDist(e.col, e.row, t.col, t.row) <= 1) {
            if (c.destroyed || B.over) return;
            attackHero(e, t, dmg);
            await sleep(450);
          }
        }
      }
    }

    // босс: рёв — бьёт случайного героя
    if (wave.boss && !B.over) {
      const targets = heroes.filter(h => h.alive);
      if (targets.length > 0) {
        B.bossDmg = 1 + Math.floor(B.round / 2);
        const t = targets[Math.floor(Math.random() * targets.length)];
        G.sfx.play('boss');
        await sleep(300);
        attackHero(null, t, B.bossDmg, G.t('boss_name'));
        await sleep(500);
      }
    }

    if (c.destroyed || B.over) return;

    // новый раунд
    B.round++;
    roundLabel.text = G.t('round_n', { n: B.round });
    phaseLabel.text = G.t('phase_player');
    phaseLabel.style.fill = G.C.heroBlue;
    for (const h of heroes) { h.acted = false; if (h.alive) { h.shield = 0; refresh(h); } }
    dealHands();
    B.state = 'select';
    drawInitiative();
    // подсказка: чей герой готов
    G.ui.toast(G.t('round_n', { n: B.round }), 900);
  }

  function attackHero(source, hero, dmg, labelOverride) {
    const short = labelOverride || (source ? G.t(source.def.key).toLowerCase() : '');
    applyDamage(hero, dmg, short, 0xff6a5a);
  }

  // --- Старт раунда 1 ---
  phaseLabel.text = G.t('phase_player');
  dealHands();
  drawInitiative();

  c.tick = () => {};

  // отладочный доступ для автотестов
  G.battleCtx = { B, heroes, playCard, onHexTap, onUnitTap, finishHero, enemyPhase, dealHands };

  return c;
};

// Карта способности (общая для панели руки)
G.ui.drawCard = function (card, index) {
  const cc = new PIXI.Container();
  cc.eventMode = 'static';
  cc.cursor = 'pointer';
  const w = 176, h = 96;
  const g = new PIXI.Graphics();
  g.roundRect(0, 0, w, h, 10).fill(G.C.panel);
  g.roundRect(0, 0, w, h, 10).stroke({ width: 2, color: G.C.goldDark });
  // фактурная полоска сверху
  g.rect(0, 0, w, 18).fill({ color: 0x241c12, alpha: 1 });
  const name = new PIXI.Text({
    text: G.t('c_' + card.id),
    style: { fontFamily: G.FONT_TITLE, fontSize: 15, fill: G.C.gold, letterSpacing: 0.5 },
  });
  name.x = 10; name.y = 2;
  const desc = new PIXI.Text({
    text: G.t('c_' + card.id + '_d'),
    style: { fontFamily: G.FONT_BODY, fontSize: 13, fill: G.C.text },
  });
  desc.x = 10; desc.y = 30;
  const fact = new PIXI.Text({
    text: G.t('c_' + card.id + '_f'),
    style: { fontFamily: G.FONT_BODY, fontSize: 11, fill: G.C.textDim, wordWrap: true, wordWrapWidth: w - 20 },
  });
  fact.x = 10; fact.y = 52;
  cc.addChild(g, name, desc, fact);
  return cc;
};

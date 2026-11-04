// Бутстрап: приложение, масштабирование, менеджер сцен, главный тикер
(async function () {
  G.bootT = performance.now();

  // веб-шрифты должны загрузиться до первого PIXI.Text
  if (document.fonts && document.fonts.load) {
    try {
      await Promise.all([
        document.fonts.load('20px "Ruslan Display"'),
        document.fonts.load('20px "Yeseva One"'),
      ]);
    } catch (e) { /* без сети — останутся системные шрифты */ }
  }

  const app = new PIXI.Application();
  await app.init({
    width: G.W,
    height: G.H,
    background: G.C.bg,
    antialias: true,
    resolution: Math.min(window.devicePixelRatio || 1, 2),
    autoDensity: true,
    powerPreference: 'high-performance',
  });
  document.body.appendChild(app.canvas);
  G.app = app;

  G.world = new PIXI.Container();
  app.stage.addChild(G.world);

  // Атлас Tiny Swords: base64 -> текстуры; листы нарезаются на кадры
  G.TEX = {};
  const UNIT_SHEETS = new Set([
    'hero_warrior_idle', 'hero_warrior_atk', 'hero_warrior_run', 'hero_monk_idle', 'hero_monk_heal',
    'hero_archer_idle', 'hero_archer_shoot',
    'foe_pawn_idle', 'foe_warrior_idle', 'foe_warrior_atk', 'foe_lancer_idle', 'foe_lancer_atk',
    'tree1', 'sheep_idle',
  ]);
  const SHEET_DEFS = G.SHEETS || {};
  if (window.G.ASSET_DATA) {
    for (const [name, a] of Object.entries(G.ASSET_DATA)) {
      try {
        const base = await PIXI.Assets.load(a.src);
        // пиксель-арт должен оставаться чётким при любом масштабе
        try { base.source.scaleMode = 'nearest'; } catch (e) {}
        try { if (base.source.style) base.source.style.scaleMode = 'nearest'; } catch (e) {}
        const def = SHEET_DEFS[name];
        if (def) {
          const n = Math.max(1, def.n || Math.round(a.w / def.fw));
          G.TEX[name] = {
            frames: Array.from({ length: n }, (_, i) => new PIXI.Texture({
              source: base.source, frame: new PIXI.Rectangle(i * def.fw, 0, def.fw, def.fh),
            })),
            fw: def.fw, fh: def.fh, base,
          };
        } else if (UNIT_SHEETS.has(name)) {
          const n = Math.max(1, Math.round(a.w / a.h));
          G.TEX[name] = {
            frames: Array.from({ length: n }, (_, i) => new PIXI.Texture({
              source: base.source, frame: new PIXI.Rectangle(i * a.h, 0, a.h, a.h),
            })),
            fw: a.h, fh: a.h, base,
          };
        } else {
          G.TEX[name] = { frames: [base], fw: a.w, fh: a.h, base };
        }
      } catch (e) { /* ассет не загрузился — останется процедурный фолбэк */ }
    }
  }

  // Снег — глобальный слой поверх сцен; частицы — ещё выше
  G.fxSnow.init(app.stage);
  G.fxParticles.init(app.stage);
  // кнопка звука в мировых координатах — на широких экранах угол игры, а не окна
  G.muteBtn = G.ui.muteButton();
  G.world.addChild(G.muteBtn);

  // Letterbox-масштабирование под любой экран
  function resize() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const s = Math.min(vw / G.W, vh / G.H);
    app.renderer.resize(vw, vh);
    G.world.scale.set(s);
    G.world.x = (vw - G.W * s) / 2;
    G.world.y = (vh - G.H * s) / 2;
    G.fxShake.base = { x: G.world.x, y: G.world.y };
  }
  window.addEventListener('resize', resize);
  resize();

  // Менеджер сцен
  G.scene = null;
  G.sceneName = null;
  G.setScene = function (name, params) {
    G.battleCtx = null;
    G.fxSnow.reset();
    if (G.scene) {
      G.world.removeChild(G.scene);
      G.scene.destroy({ children: true });
      G.scene = null;
    }
    // все твины принадлежали старой сцене
    G.tweens.length = 0;
    G.sceneName = name;
    try {
      G.scene = G.scenes[name](params || {});
      G.world.addChildAt(G.scene, 0);
    } catch (e) {
      G.sceneError = (e && e.stack) || String(e);
      console.error('setScene ' + name + ' failed:', e);
    }
  };

  // Время загрузки страницы — для бейджа на титуле
  G.loadSec = 0;

  // Главный цикл
  let firstFrame = true;
  let rafSeen = performance.now();
  app.ticker.add((ticker) => {
    rafSeen = performance.now();
    if (firstFrame) {
      G.loadSec = ((performance.now() - G.bootT) / 1000).toFixed(1);
      firstFrame = false;
      G.setScene('title');
    }
    G.tweensTick(ticker.deltaMS);
    G.fxSnow.tick(ticker.deltaMS);
    G.fxParticles.tick(ticker.deltaMS);
    if (G.art && G.art.tick) G.art.tick(ticker.deltaMS);
    G.fxShake.tick(G.world, ticker.deltaMS);
    if (G.scene && G.scene.tick) G.scene.tick(ticker.deltaMS);
  });

  // Watchdog: в некоторых встроенных окнах rAF замирает, хотя вкладка видима.
  // Если кадров нет дольше 300 мс — двигаем тикер вручную, иначе превью виснет.
  setInterval(() => {
    if (performance.now() - rafSeen > 300) app.ticker.update(performance.now());
  }, 40);
})();

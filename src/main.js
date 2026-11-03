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

  // Снег — глобальный слой поверх сцен; частицы — ещё выше
  G.fxSnow.init(app.stage);
  G.fxParticles.init(app.stage);
  app.stage.addChild((G.muteBtn = G.ui.muteButton()));

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
    G.muteBtn.y = Math.max(34, 34 / s);
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
    G.fxShake.tick(G.world, ticker.deltaMS);
    if (G.scene && G.scene.tick) G.scene.tick(ticker.deltaMS);
  });

  // Watchdog: в некоторых встроенных окнах rAF замирает, хотя вкладка видима.
  // Если кадров нет дольше 300 мс — двигаем тикер вручную, иначе превью виснет.
  setInterval(() => {
    if (performance.now() - rafSeen > 300) app.ticker.update(performance.now());
  }, 40);
})();

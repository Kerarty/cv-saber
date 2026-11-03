// Данные игры: конфиг, палитра, герои, карты, волны, постройки
window.G = window.G || {};

G.CONFIG = {
  name: 'Kerarty',
  role: { ru: 'гейм-дизайнер', en: 'game designer' },
  email: 'mail@saber3d.by',
  github: 'https://github.com/Kerarty',
};

G.C = {
  bg: 0x0d1420,
  bgHigh: 0x131e30,
  hexFill: 0x16202e,
  hexBorder: 0x233246,
  hexMove: 0x2a5f6e,
  hexAtk: 0x6e2a2a,
  gold: 0xe8a33d,
  goldDark: 0xb07722,
  enemy: 0xc74a3c,
  heroBlue: 0x4a9db8,
  heroGreen: 0x7ab55c,
  heroYellow: 0xb8a24a,
  snow: 0xdfe9f2,
  text: 0xe6eef6,
  textDim: 0x8fa3b8,
  panel: 0x1b2433,
  panelDark: 0x141c29,
};

G.FONT_TITLE = 'Impact, "Arial Black", sans-serif';
G.FONT_BODY = '"Trebuchet MS", Verdana, sans-serif';

// Логическое поле 1280x720
G.W = 1280;
G.H = 720;

// --- Герои ---
G.HEROES = [
  { id: 'berserk', nameKey: 'hero_berserk', hp: 12, move: 3, color: G.C.heroBlue },
  { id: 'skald', nameKey: 'hero_skald', hp: 8, move: 4, color: G.C.heroGreen },
  { id: 'smith', nameKey: 'hero_smith', hp: 10, move: 2, color: G.C.heroYellow },
];

// --- Карты способностей (каждая = факт из портфолио) ---
G.CARDS = [
  { id: 'balance_lab', hero: 'berserk', move: 1, dmg: 5, range: 1 },
  { id: 'event_tuner', hero: 'berserk', move: 1, dmg: 3, range: 1, stun: true },
  { id: 'gwent_logic', hero: 'berserk', buff: 2 },
  { id: 'echo_loop', hero: 'skald', echo: true },
  { id: 'onefile', hero: 'skald', move: 4, dmg: 2, range: 1 },
  { id: 'mvp', hero: 'skald', move: 2, dmg: 2, range: 1 },
  { id: 'rune_sdk', hero: 'smith', shieldAll: 2 },
  { id: 'kb472', hero: 'smith', move: 1, shieldSelf: 3, dmg: 1, range: 1 },
  { id: 'code_review', hero: 'smith', heal: 3, range: 2 },
];

// --- Враги ---
G.ENEMY_DEFS = {
  bug: { key: 'e_bug', hp: 4, move: 2, dmg: 1, color: G.C.enemy },
  krynch: { key: 'e_krynch', hp: 10, move: 2, dmg: 2, healSelf: 1, color: 0x9b3a6e },
  deadline: { key: 'e_deadline', hp: 6, move: 3, dmg: 1, grow: 1, color: 0x6e5a2a },
};

// --- Волны: состав и позиции на поле ---
G.WAVES = [
  {
    id: 'wave1', nameKey: 'wave1_name', hintKey: 'hint1',
    enemies: [
      { def: 'bug', col: 8, row: 1 }, { def: 'bug', col: 9, row: 3 },
      { def: 'bug', col: 8, row: 4 }, { def: 'bug', col: 10, row: 2 },
    ],
  },
  {
    id: 'wave2', nameKey: 'wave2_name', hintKey: 'hint2',
    enemies: [
      { def: 'krynch', col: 9, row: 2 }, { def: 'deadline', col: 8, row: 1 },
      { def: 'deadline', col: 8, row: 4 },
    ],
  },
  {
    id: 'boss', nameKey: 'wave3_name', hintKey: 'hint3', boss: true,
    zones: [
      { id: 'mobile', key: 'z_mobile', hp: 8, col: 8, row: 1 },
      { id: 'balance', key: 'z_balance', hp: 10, col: 9, row: 3 },
      { id: 'unity', key: 'z_unity', hp: 8, col: 8, row: 4 },
      { id: 'team', key: 'z_team', hp: 6, col: 10, row: 2 },
    ],
  },
];

// --- Постройки деревни: разделы резюме (карточки фактов) ---
G.BUILDINGS = [
  {
    id: 'forge', titleKey: 'forge_title',
    link: 'https://github.com/Kerarty/echoloop-playble',
    facts: [
      {
        id: 'echoloop', icon: '🌀', link: 'https://github.com/Kerarty/echoloop-playble',
        ru: { t: 'echoloop-playble', d: 'Головоломка о времени: петля, эхо прошлых проходов — механика эха повторяет действия игрока', s: '8 уровней · Unity 6 + URP' },
        en: { t: 'echoloop-playble', d: 'A time puzzle: loop, echoes of past runs — the echo mechanic repeats the player’s actions', s: '8 levels · Unity 6 + URP' },
      },
      {
        id: 'urp', icon: '⚙️',
        ru: { t: 'Стек Unity', d: 'Быстро осваиваю инструменты движка: сцены, префабы, физика, URP-постобработка', s: 'Unity 6' },
        en: { t: 'Unity stack', d: 'Fast at picking up engine tools: scenes, prefabs, physics, URP post-processing', s: 'Unity 6' },
      },
    ],
  },
  {
    id: 'shipyard', titleKey: 'shipyard_title',
    link: 'https://github.com/Kerarty/playable-ad-mob-rush',
    facts: [
      {
        id: 'mobrush', icon: '🏃', link: 'https://github.com/Kerarty/playable-ad-mob-rush',
        ru: { t: 'playable-ad-mob-rush', d: 'Crowd-runner в одном HTML: процедурная графика и звук, совместимость с MRAID', s: '472 КБ' },
        en: { t: 'playable-ad-mob-rush', d: 'Crowd runner in a single HTML file: procedural art & sound, MRAID-compatible', s: '472 KB' },
      },
      {
        id: 'kitty', icon: '🐱', link: 'https://github.com/Kerarty/splash-kitty-playable-ad',
        ru: { t: 'splash-kitty', d: 'Playable-ad с физикой: PixiJS 8 + matter.js, работает офлайн', s: '684 КБ · 0 запросов' },
        en: { t: 'splash-kitty', d: 'Physics playable ad: PixiJS 8 + matter.js, works offline', s: '684 KB · 0 requests' },
      },
      {
        id: 'sdk', icon: '🧩', link: 'https://github.com/Kerarty/playble-ads',
        ru: { t: 'playble-ads SDK', d: 'Движко-независимый SDK для HTML5-плейблов с адаптерами под основные рекламные сети', s: 'MIT' },
        en: { t: 'playble-ads SDK', d: 'Engine-agnostic SDK for HTML5 playables with adapters for major ad networks', s: 'MIT' },
      },
    ],
  },
  {
    id: 'stone', titleKey: 'stone_title',
    link: 'https://github.com/Kerarty/cv-top-games',
    facts: [
      {
        id: 'balab', icon: '⚖️', link: 'https://github.com/Kerarty/cv-top-games',
        ru: { t: 'Баланс-лаборатория', d: 'Интерактивный стенд merge-автобатлера: тюнинг характеристик и проверка метрик вживую', s: 'merge-автобатлер' },
        en: { t: 'Balance lab', d: 'Interactive merge-autobattler stand: live stat tuning and metric checks', s: 'merge autobattler' },
      },
      {
        id: 'gametech', icon: '📅', link: 'https://github.com/Kerarty/cv-gametech',
        ru: { t: 'Тюнер ивентов', d: 'Liveops-конструктор: таблицы контента с формулами, экономика ивента', s: 'liveops' },
        en: { t: 'Event tuner', d: 'Liveops constructor: content tables with formulas, event economy', s: 'liveops' },
      },
      {
        id: 'lesta', icon: '🎯', link: 'https://github.com/Kerarty/cv-lesta',
        ru: { t: 'Баланс на Three.js', d: 'Игровое резюме с фокусом на балансе сражений', s: 'Three.js' },
        en: { t: 'Balance on Three.js', d: 'Game resume focused on combat balance', s: 'Three.js' },
      },
    ],
  },
  {
    id: 'thing', titleKey: 'thing_title',
    link: 'https://github.com/Kerarty',
    facts: [
      {
        id: 'cvs', icon: '🎮', link: 'https://github.com/Kerarty',
        ru: { t: 'Резюме-игры', d: 'Под каждую студию — свой жанр и сеттинг: тактика, арена, баланс-лабы', s: '12+' },
        en: { t: 'Résumé games', d: 'A genre and setting for every studio: tactics, arena, balance labs', s: '12+' },
      },
      {
        id: 'lang', icon: '🌍',
        ru: { t: 'Русский / English', d: 'Веду переговоры и пишу документацию на двух языках — это резюме переключается сверху', s: 'RU / EN' },
        en: { t: 'Russian / English', d: 'Negotiate and document in both languages — this resume switches top-right', s: 'RU / EN' },
      },
    ],
  },
];

// --- Лист кандидата: характеристики для экрана «Сразу к резюме» ---
G.SHEET = {
  stats: {
    ru: [
      ['Playable-ads', 95], ['Прототипирование', 90], ['Гейм-дизайн и баланс', 85],
      ['Веб: PixiJS · Three.js', 85], ['Unity', 70],
    ],
    en: [
      ['Playable ads', 95], ['Prototyping', 90], ['Game design & balance', 85],
      ['Web: PixiJS · Three.js', 85], ['Unity', 70],
    ],
  },
  chips: {
    ru: ['📱 мобайл', '🎯 баланс', '🧩 плейблы', '⚡ быстрые прототипы'],
    en: ['📱 mobile', '🎯 balance', '🧩 playables', '⚡ fast prototypes'],
  },
  lore: {
    ru: 'Делаю игры, которые продают: playable-ads, баланс, прототипы. Каждая постройка этой деревни — рабочий проект на GitHub.',
    en: 'I make games that sell: playable ads, balance, prototypes. Every building in this village is a real project on GitHub.',
  },
};

// --- Прогресс: сколько волн пройдено (0..3) ---
G.progress = 0;
G.stats = { rounds: 0, damage: 0, cards: 0, facts: 0 };

// --- Гекс-математика (flat-top, odd-q offset) ---
G.HEX = { size: 48, cols: 11, rows: 6, padX: 200, padY: 84 };

// Короткие подписи фактов для всплывающего урона
G.SHORT = {
  ru: {
    balance_lab: 'баланс-лаба', event_tuner: 'ивент-тюнер', gwent_logic: 'гвинт-логика',
    echo_loop: 'эхо', onefile: 'однофайловик', mvp: 'MVP',
    rune_sdk: 'рунный SDK', kb472: '472 КБ', code_review: 'код-ревью', offer: 'оффер',
  },
  en: {
    balance_lab: 'balance lab', event_tuner: 'event tuner', gwent_logic: 'gwent logic',
    echo_loop: 'echo', onefile: 'single file', mvp: 'MVP',
    rune_sdk: 'rune SDK', kb472: '472 KB', code_review: 'code review', offer: 'offer',
  },
};

G.hexToPx = function (col, row) {
  const s = G.HEX.size;
  const x = G.HEX.padX + col * 1.5 * s + s;
  const y = G.HEX.padY + Math.sqrt(3) * s * (row + 0.5 * (col & 1)) + s * 0.87;
  return { x, y };
};

G.offsetToCube = function (col, row) {
  const x = col;
  const z = row - ((col - (col & 1)) / 2);
  return { x, y: -x - z, z };
};

G.cubeToOffset = function (c) {
  const col = c.x;
  const row = c.z + ((c.x - (c.x & 1)) / 2);
  return { col, row };
};

const CUBE_DIRS = [
  { x: +1, y: -1, z: 0 }, { x: +1, y: 0, z: -1 }, { x: 0, y: +1, z: -1 },
  { x: -1, y: +1, z: 0 }, { x: -1, y: 0, z: +1 }, { x: 0, y: -1, z: +1 },
];

G.hexNeighbors = function (col, row) {
  const c = G.offsetToCube(col, row);
  const out = [];
  for (const d of CUBE_DIRS) {
    const n = G.cubeToOffset({ x: c.x + d.x, y: c.y + d.y, z: c.z + d.z });
    if (n.col >= 0 && n.col < G.HEX.cols && n.row >= 0 && n.row < G.HEX.rows) out.push(n);
  }
  return out;
};

G.hexDist = function (col1, row1, col2, row2) {
  const a = G.offsetToCube(col1, row1);
  const b = G.offsetToCube(col2, row2);
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y), Math.abs(a.z - b.z));
};

// BFS-путь до цели по свободным клеткам
G.hexPath = function (fromCol, fromRow, toCol, toRow, occupied) {
  const startKey = fromCol + ',' + fromRow;
  const targetKey = toCol + ',' + toRow;
  const queue = [{ col: fromCol, row: fromRow }];
  const came = { [startKey]: null };
  while (queue.length) {
    const cur = queue.shift();
    const key = cur.col + ',' + cur.row;
    if (key === targetKey) {
      const path = [];
      let k = key;
      while (k && k !== startKey) {
        const [c, r] = k.split(',').map(Number);
        path.unshift({ col: c, row: r });
        k = came[k];
      }
      return path;
    }
    for (const n of G.hexNeighbors(cur.col, cur.row)) {
      const nk = n.col + ',' + n.row;
      if (came[nk] !== undefined) continue;
      if (occupied.has(nk) && nk !== targetKey) continue;
      came[nk] = key;
      queue.push(n);
    }
  }
  return null;
};

// Все клетки в радиусе move, свободные от occupied
G.hexReachable = function (fromCol, fromRow, move, occupied) {
  const seen = new Map();
  const startKey = fromCol + ',' + fromRow;
  seen.set(startKey, 0);
  const frontier = [{ col: fromCol, row: fromRow, d: 0 }];
  while (frontier.length) {
    const cur = frontier.shift();
    if (cur.d >= move) continue;
    for (const n of G.hexNeighbors(cur.col, cur.row)) {
      const nk = n.col + ',' + n.row;
      if (seen.has(nk) || occupied.has(nk)) continue;
      seen.set(nk, cur.d + 1);
      frontier.push({ col: n.col, row: n.row, d: cur.d + 1 });
    }
  }
  seen.delete(startKey);
  return [...seen.keys()].map(k => {
    const [c, r] = k.split(',').map(Number);
    return { col: c, row: r };
  });
};

// Данные игры: конфиг, палитра, герои, карты, волны, постройки
window.G = window.G || {};

G.CONFIG = {
  name: 'Ярослав Кукар',
  role: { ru: 'гейм-дизайнер · экономика и монетизация', en: 'game designer · economy & monetization' },
  email: 'kukar.yar@gmail.com',   // почта кандидата — кнопка «Написать мне»
  github: 'https://github.com/Kerarty',
  pdf: 'cv.pdf',                  // резюме из docs/CV_Yaroslav.pdf (cv-highcore)
  excel: 'economy_model.xlsx',    // модель баланса и экономики — живые формулы
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
  // пергамент, чернила и дерево — новая визуальная база
  ink: 0x2a2118,
  inkSoft: 0x5a4a38,
  inkDim: 0x7a6a56,
  paper: 0xf0e2b8,
  paperDark: 0xd8c49a,
  paperShade: 0xc4ad82,
  wood: 0x4a3424,
  woodDark: 0x2c1f15,
  woodLight: 0x6b4a30,
  teal: 0x2e6f72,
  tealDark: 0x1d4b52,
  tealLight: 0x5aa0a0,
  ember: 0xff9d4a,
  emberHot: 0xffe0a0,
  blood: 0x8a2f2a,
  moss: 0x5a7a52,
};

G.FONT_TITLE = '"Ruslan Display", Impact, "Arial Black", sans-serif';
G.FONT_SERIF = '"Yeseva One", Georgia, serif';
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

// --- Карты способностей (каждая = факт из портфолио; cost — цена в ⚡) ---
G.CARDS = [
  { id: 'balance_lab', hero: 'berserk', cost: 3, dmg: 5, range: 1 },
  { id: 'event_tuner', hero: 'berserk', cost: 2, dmg: 3, range: 1, stun: true },
  { id: 'math_model', hero: 'berserk', cost: 1, bonusNext: 2 },
  { id: 'echo_loop', hero: 'skald', cost: 2, echo: true },
  { id: 'onefile', hero: 'skald', cost: 2, dmg: 3, range: 3 },
  { id: 'mvp', hero: 'skald', cost: 1, dmg: 2, range: 1 },
  { id: 'rune_sdk', hero: 'smith', cost: 2, shieldAll: 2 },
  { id: 'kb472', hero: 'smith', cost: 2, shieldSelf: 3, dmg: 1, range: 1 },
  { id: 'retention_loop', hero: 'smith', cost: 2, heal: 3, range: 2 },
];

// --- Экономика рейда: живой кейс для вакансии «экономика и монетизация» ---
// Энергия — внутрибоевая валюта раунда; золото — мета-валюта рейда
G.ECONOMY = {
  energyBase: 6,     // пул энергии команды на раунд
  energyBuy: 2,      // докупка энергии в бою
  energyPrice: 30,   // цена докупки, золото
  speedBonus: 10,    // золото за каждый раунд быстрее par
  upgrades: {
    crystal: { price: 60 },  // +1 к пулу энергии на рейд
    coat:    { price: 70 },  // +2 макс HP героям на рейд
    luck:    { price: 60 },  // 50%: ×2 золото за следующую волну
  },
};

// Состояние экономики рейда (живёт сессию; сбрасывается кнопкой «Ещё рейд»)
G.economy = { gold: 0, earned: 0, spent: 0, energy: 0, coat: 0, luck: false };
G.resetEconomy = function () {
  G.economy = { gold: 0, earned: 0, spent: 0, energy: 0, coat: 0, luck: false };
};

// Liveops-ивент «Золотой рейд»: ×2 золото, авто-продление до ближайшего воскресенья
G.EVENT = {
  enabled: true,
  mult: 2,
  key: 'golden_raid',
  until: function () {
    const now = new Date();
    const d = new Date(now);
    d.setDate(d.getDate() + ((7 - d.getDay()) % 7)); // ближайшее воскресенье
    d.setHours(23, 59, 0, 0);
    if (d <= now) d.setDate(d.getDate() + 7);        // воскресенье на исходе — продлеваем
    return d;
  },
  endsIn: function () {
    const ms = G.EVENT.until() - new Date();
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    if (h >= 24) return Math.ceil(h / 24) + ' ' + G.t('ev_days');
    return h + ' ' + G.t('ev_hours') + ' ' + m + ' ' + G.t('ev_min');
  },
};
G.goldMult = function () { return G.EVENT && G.EVENT.enabled ? G.EVENT.mult : 1; };

// --- Враги ---
G.ENEMY_DEFS = {
  bug: { key: 'e_bug', hp: 4, move: 2, dmg: 1, color: G.C.enemy },
  krynch: { key: 'e_krynch', hp: 10, move: 2, dmg: 3, healSelf: 1, color: 0x9b3a6e },
  deadline: { key: 'e_deadline', hp: 6, move: 3, dmg: 2, grow: 1, color: 0x6e5a2a },
};

// --- Волны: состав и позиции на поле; reward/par — экономика награды ---
G.WAVES = [
  {
    id: 'wave1', nameKey: 'wave1_name', hintKey: 'hint1', reward: 40, par: 3,
    enemies: [
      { def: 'bug', col: 8, row: 1 }, { def: 'bug', col: 9, row: 3 },
      { def: 'bug', col: 8, row: 4 }, { def: 'bug', col: 10, row: 2 },
    ],
  },
  {
    id: 'wave2', nameKey: 'wave2_name', hintKey: 'hint2', reward: 60, par: 4,
    enemies: [
      { def: 'krynch', col: 9, row: 2 }, { def: 'deadline', col: 8, row: 1 },
      { def: 'deadline', col: 8, row: 4 },
    ],
  },
  {
    id: 'boss', nameKey: 'wave3_name', hintKey: 'hint3', boss: true, reward: 100, par: 6,
    zones: [
      { id: 'balance', key: 'z_balance', hp: 10, col: 9, row: 3 },
      { id: 'economy', key: 'z_economy', hp: 9, col: 8, row: 1 },
      { id: 'analytics', key: 'z_analytics', hp: 9, col: 8, row: 4 },
      { id: 'monetization', key: 'z_monetization', hp: 8, col: 10, row: 2 },
    ],
  },
];

// --- Постройки деревни: разделы резюме (карточки фактов) ---
// Каждая карточка — геймдизайнерский кейс: что спроектировал, как решил, что вышло
G.BUILDINGS = [
  {
    id: 'forge', titleKey: 'forge_title',
    link: 'https://github.com/Kerarty/echoloop-playble',
    facts: [
      {
        id: 'echoloop', icon: '🌀', link: 'https://github.com/Kerarty/echoloop-playble',
        ru: { t: 'echoloop-playble', d: 'Головоломка об эхе действий: всё возвращается. 8 уровней учат петле без туториалов', s: '8 уровней · Unity 6 + URP' },
        en: { t: 'echoloop-playble', d: 'One mechanic: actions return as echoes. 8 levels teach the loop without tutorials', s: '8 levels · Unity 6 + URP' },
      },
      {
        id: 'unity', icon: '⚙️',
        ru: { t: 'Стек Unity', d: 'Проектирую фичи от схемы до плейтеста: сцены, префабы, физика, URP', s: 'Unity 6' },
        en: { t: 'Unity stack', d: 'Design from sketch to playtest: scenes, prefabs, physics, URP', s: 'Unity 6' },
      },
    ],
  },
  {
    id: 'shipyard', titleKey: 'shipyard_title',
    link: 'https://github.com/Kerarty/playable-ad-mob-rush',
    facts: [
      {
        id: 'mobrush', icon: '🏃', link: 'https://github.com/Kerarty/playable-ad-mob-rush',
        ru: { t: 'playable-ad-mob-rush', d: 'Core за 15 секунд без текста, онбординг — первым касанием. Графика и звук процедурные', s: '472 КБ · MRAID' },
        en: { t: 'playable-ad-mob-rush', d: 'Core reads in 15 seconds, onboarding is the first touch. Procedural art & sound', s: '472 KB · MRAID' },
      },
      {
        id: 'kitty', icon: '🐱', link: 'https://github.com/Kerarty/splash-kitty-playable-ad',
        ru: { t: 'splash-kitty', d: 'Физическая головоломка на matter.js: мягкий фейл и петля «ещё раз» — конверсионная механика', s: '684 КБ · 0 запросов' },
        en: { t: 'splash-kitty', d: 'A matter.js physics toy: soft fail and an "again" loop — the classic conversion mechanic', s: '684 KB · 0 requests' },
      },
      {
        id: 'sdk', icon: '🧩', link: 'https://github.com/Kerarty/playble-ads',
        ru: { t: 'playble-ads SDK', d: 'Движко-независимый SDK с адаптерами рекламных сетей — понимаю плейблы и как бизнес-модель', s: 'MIT' },
        en: { t: 'playble-ads SDK', d: 'Engine-agnostic SDK with ad-network adapters — playables as a business model', s: 'MIT' },
      },
    ],
  },
  {
    id: 'stone', titleKey: 'stone_title',
    link: 'https://github.com/Kerarty/cv-top-games',
    facts: [
      {
        id: 'balab', icon: '⚖️', link: 'https://github.com/Kerarty/cv-top-games',
        ru: { t: 'Баланс-лаба', d: 'Стенд merge-автобатлера: моделирую бои, тюню характеристики и сразу вижу исход правок', s: 'merge-автобатлер' },
        en: { t: 'Balance lab', d: 'A merge-autobattler stand: simulate fights, tune stats, see the outcome instantly', s: 'merge autobattler' },
      },
      {
        id: 'gametech', icon: '📅', link: 'https://github.com/Kerarty/cv-gametech',
        ru: { t: 'Тюнер ивентов', d: 'Конструктор liveops-ивентов: таблицы контента с формулами наград и экономика ивента', s: 'liveops' },
        en: { t: 'Event tuner', d: 'A liveops constructor: content tables with reward formulas and the event economy', s: 'liveops' },
      },
      {
        id: 'eridora', icon: '🏰',
        ru: { t: 'Варгейм «Эридора»', d: 'Настольная тактика на 4 фракции: бои, захват территорий, баланс юнитов. 15+ плейтестов', s: '15+ плейтестов' },
        en: { t: '"Eridor" wargame', d: 'Tabletop tactics for 4 factions: combat, territory control, unit balance. 15+ playtests', s: '15+ playtests' },
      },
      {
        id: 'gdd', icon: '📐',
        ru: { t: 'GDD стратегии', d: 'Концепт-документ стратегии: механики, прогрессия, баланс ресурсов — под передачу команде', s: 'полный GDD' },
        en: { t: 'Strategy GDD', d: 'Strategy concept doc: mechanics, progression, resource balance — ready for team hand-off', s: 'full GDD' },
      },
      {
        id: 'lesta', icon: '🎯', link: 'https://github.com/Kerarty/cv-lesta',
        ru: { t: 'Баланс на Three.js', d: 'Боевые характеристики на Three.js: размены, контрпики и читаемость чисел в веб-формате', s: 'Three.js' },
        en: { t: 'Balance on Three.js', d: 'Combat stats on Three.js: trades, counter-picks and number readability in the browser', s: 'Three.js' },
      },
    ],
  },
  {
    id: 'thing', titleKey: 'thing_title',
    link: 'https://github.com/Kerarty',
    facts: [
      {
        id: 'cvs', icon: '🎮', link: 'https://github.com/Kerarty',
        ru: { t: 'Резюме-игры', d: 'Под каждую студию — свой жанр. Эта: тактика про экономику F2P — энергия, золото, ивент', s: '12+' },
        en: { t: 'Résumé games', d: 'A genre for every studio. This one: F2P economy tactics — energy, gold, a live event', s: '12+' },
      },
      {
        id: 'lang', icon: '🌍',
        ru: { t: 'Русский / English', d: 'Документирую механики и веду коммуникацию на двух языках — это резюме переключается сверху', s: 'RU / EN' },
        en: { t: 'Russian / English', d: 'I document mechanics and communicate in both languages — this resume switches top-right', s: 'RU / EN' },
      },
    ],
  },
];

// --- Лист кандидата: характеристики для экрана «Сразу к резюме» ---
G.SHEET = {
  stats: {
    ru: [
      ['Баланс и экономика', 92], ['Прототипирование', 90], ['LiveOps и ивенты', 88],
      ['Монетизация и плейблы', 85], ['Unity / JS', 75],
    ],
    en: [
      ['Balance & economy', 92], ['Prototyping', 90], ['LiveOps & events', 88],
      ['Monetization & playables', 85], ['Unity / JS', 75],
    ],
  },
  chips: {
    ru: ['📱 мобайл', '💰 экономика', '📊 метрики', '🧮 Excel'],
    en: ['📱 mobile', '💰 economy', '📊 metrics', '🧮 Excel'],
  },
  lore: {
    ru: 'Проектирую баланс и экономику так, чтобы игра зарабатывала: эта резюме-игра — живой кейс с энергией, золотом и ивентом.',
    en: 'I design balance and economy that make games earn: this resume-game is a live case with energy, gold and an event.',
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
    balance_lab: 'баланс-лаба', event_tuner: 'ивент-тюнер', math_model: 'матмодель',
    echo_loop: 'эхо', onefile: 'однофайловик', mvp: 'MVP',
    rune_sdk: 'рунный SDK', kb472: '472 КБ', retention_loop: 'ретеншен', offer: 'оффер',
  },
  en: {
    balance_lab: 'balance lab', event_tuner: 'event tuner', math_model: 'math model',
    echo_loop: 'echo', onefile: 'single file', mvp: 'MVP',
    rune_sdk: 'rune SDK', kb472: '472 KB', retention_loop: 'retention', offer: 'offer',
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

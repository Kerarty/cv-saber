// Сборка одностраничника: инлайнит pixi, стили и модули игры в index.html
const fs = require('fs');
const path = require('path');

const read = f => fs.readFileSync(path.join(__dirname, f), 'utf8');
const exists = f => fs.existsSync(path.join(__dirname, f));

// Порядок важен: словари и данные → эффекты → ui → сцены → бутстрап
const ORDER = [
  'src/i18n.js',
  'src/data.js',
  'src/fx.js',
  'src/ui.js',
  'src/scenes/title.js',
  'src/scenes/village.js',
  'src/scenes/battle.js',
  'src/scenes/victory.js',
  'src/main.js',
];

let html = read('index.template.html');
const pixi = read('src/vendor/pixi.min.js');
const css = read('src/style.css');
const game = ORDER.filter(exists).map(f => `/* ==== ${f} ==== */\n` + read(f)).join('\n');

html = html.replace('/*STYLE_CSS*/', () => css);
html = html.replace('/*PIXI_JS*/', () => pixi);
html = html.replace('/*GAME_JS*/', () => game);

fs.writeFileSync(path.join(__dirname, 'index.html'), html);
console.log(`index.html собран: ${(fs.statSync(path.join(__dirname, 'index.html')).size / 1024).toFixed(0)} КБ`);

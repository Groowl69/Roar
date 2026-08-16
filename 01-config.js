/* ============================================================
   01-config.js  ·  файл 4/16
   ------------------------------------------------------------
   Данные игры: глобальные константы (раздел 11 диздока),
   области опасности (ОО), персонажи (раздел 3), навыки
   прокачки (п. 3.1), противники (раздел 3.3), фразы смерти,
   достижения. Только данные, без логики.
   ============================================================ */

/* Глобальные константы. Единицы — px, если не указано иное. */
const C = {
  arenaR: 25000,              // 1. радиус арены
  ring: 1250,                 // 5. радиус колец арены
  oo1R: 1250,
  builtR: 5000,               // сколько колец построено (первые 4 ОО)
  pR: 25,                     // 2. радиус персонажа
  fistR: 12,                  // 3. радиус кулаков
  pupilR: 2.5,                // 4. радиус зрачков
  fistSpread: 160*Math.PI/180,// угол расхождения кулаков
  baseSpeed: 125,             // 7. стоковая скорость, px/сек
  ramp: 0.2,                  // 9. время разгона, сек
  safeR: 100,                 // радиус зоны спавна
  punchDur: 0.18,             // длительность выноса кулака, сек
  punchReach: 34,             // вынос кулака вперёд
  blinkEvery: 7,              // моргание раз в 7 сек
  blinkDur: 0.16,             // длительность моргания
  enDelay: 1.5,               // задержка регена энергии после атаки
  hpDelay: 1.5,               // задержка регена HP после урона
  dayLen: 600,                // день 10 мин = 600 сек
  nightLen: 300,              // ночь 5 мин = 300 сек
  spawnDelay: 5,              // задержка спавна после входа в ОО
  respawnT: 7,                // респаун противника
  pop: 6,                     // 5–7 активных монстров
  lvlCapPerOO: 8,             // лимит уровня в рамках одной ОО
  lvlMax: 78,                 // глобальный максимум уровня
  pillarDmg: 100,             // столб света, DMG/сек
  pillarCd: 1,                // скорость атаки столба, 1 уд/сек
  pillarDur: 1.5              // длительность столба
};

/* Шрифты для canvas-отрисовки */
const FD = "Impact,'Arial Black','Segoe UI',sans-serif";
const FB = "'Segoe UI',Tahoma,Verdana,sans-serif";

/* ------------------------------------------------------------
   Области опасности. Первые 4 ОО — общие, свободный переход.
   ring0/ring1 — внутренняя/внешняя граница кольца.
   cap — лимитный уровень (дальше опыт не начисляется).
   foes — id противников (см. FOES).
   xp/xpPer/xpN — тип точек опыта, опыт за штуку, количество.
   ------------------------------------------------------------ */
const OOS = [
  {
    id: 0, name: 'Ромашковые поля',
    ring0: 0, ring1: 1250, cap: 8,
    xp: 'daisy', xpPer: 25, xpN: 25,
    foes: ['kapustnik', 'lepestok', 'koren'],
    attr: 'garden', base: '#233a26',
    dec: { stones: 1, bushes: 1, trees: 1, flowers: 1 }
  },
  {
    id: 1, name: 'Речные луга',
    ring0: 1250, ring1: 2500, cap: 15,
    xp: 'pebble', xpPer: 40, xpN: 25,
    foes: ['kamnevik', 'skol', 'kaplya', 'koren'],
    attr: 'spring', base: '#27452f',
    dec: { stones: 1, bushes: 1, trees: 1, flowers: 0 },
    water: 1
  },
  {
    id: 2, name: 'Холмы',
    ring0: 2500, ring1: 3750, cap: 22,
    xp: 'shroom', xpPer: 60, xpN: 25,
    foes: ['svinka', 'uragan', 'krot'],
    attr: null, base: '#3a452c',
    dec: { stones: 1, bushes: 0, trees: 1, flowers: 1 },
    mud: 1
  },
  {
    id: 3, name: 'Железные горы',
    ring0: 3750, ring1: 5000, cap: 29,
    xp: 'diamond', xpPer: 90, xpN: 25, mine: true,
    foes: ['almaz', 'rubin', 'izumrud', 'skolplus'],
    attr: null, base: '#3c434d',
    dec: { stones: 1, bushes: 0, trees: 0, flowers: 0 },
    mounts: 1
  }
];

/* ------------------------------------------------------------
   Персонажи (раздел 3). Герой скрыт до победы над Дьяволом.
   ------------------------------------------------------------ */
const CHARS = [
  {
    id: 'protagon', name: 'Протагон', col: '#9aa3ad', open: true,
    hp: 100, regen: 2, dmg: 10, en: 4, enReg: 1.5, agi: 0.5, spd: 125,
    uniq: 'Устойчивость — пассивное поглощение урона', lock: null
  },
  {
    id: 'vampire', name: 'Вампир', col: '#a05a6a', open: false,
    hp: 110, regen: 0, dmg: 13, en: 3, enReg: 1.7, agi: 0.5, spd: 135,
    uniq: 'Похищение здоровья · летучая мышь (Shift)',
    lock: 'Открывается за первую победу над боссом Протагоне'
  },
  {
    id: 'berserk', name: 'Берс7рк', col: '#a06a3a', open: false,
    hp: 150, regen: 2, dmg: 10, en: 4, enReg: 1.0, agi: 0.5, spd: 125,
    uniq: 'На пороге смерти — бессмертие после смерти',
    lock: 'Избежать смерти дважды за забег'
  },
  {
    id: 'object15', name: 'Объект 15', col: '#5f8a9a', open: false,
    hp: 90, regen: 1, dmg: 20, en: 0, enReg: 0, agi: 1, spd: 100,
    uniq: 'Батарея — удары без энергии, полный привод (Shift)',
    lock: 'Достижение 78 уровня'
  },
  {
    id: 'master', name: 'Мастер ближнего боя', col: '#a0904a', open: false,
    hp: 100, regen: 2, dmg: 10, en: 6, enReg: 3, agi: 0.5, spd: 125,
    uniq: 'Зона боя (Shift) — аура подавления R=200',
    lock: 'Убить 555 противников'
  }
];

/* ------------------------------------------------------------
   Навыки прокачки. Формулы п. 3.1 (базы Протагона).
   x — количество вложенных очков.
   ------------------------------------------------------------ */
const SKILLS = [
  { k: 'dmg',   n: 'DMG',            short: 'DMG', max: 99, cost: 1,
    f: function(x){ return 10 + 9.031*x + 0.969*x*x; }, fmt: 0 },
  { k: 'hp',    n: 'HP',             short: 'HP',  max: 99, cost: 1,
    f: function(x){ return 100 + 47.94*x + 2.06*x*x; }, fmt: 0 },
  { k: 'regen', n: 'Реген HP',       short: 'РЕГ', max: 99, cost: 1,
    f: function(x){ return 2 + 5*x; }, fmt: 0 },
  { k: 'en',    n: 'Энергия',        short: 'ЭН',  max: 99, cost: 1,
    f: function(x){ return 4 + x; }, fmt: 1 },
  { k: 'enreg', n: 'Восст. энергии', short: 'ВЭ',  max: 99, cost: 1,
    f: function(x){ return 1.5 + 0.5*x; }, fmt: 1 },
  { k: 'agi',   n: 'Ловкость',       short: 'ЛВК', max: 7,  cost: 1,
    f: function(x){ return 0.5 - 0.03*x; }, fmt: 2 },
  { k: 'spd',   n: 'Скорость',       short: 'СКР', max: 5,  cost: 1,
    f: function(x){ return 125 + 10*x; }, fmt: 0 },
  { k: 'res',   n: 'Устойчивость',   short: 'УСТ', max: 7,  cost: 1,
    f: function(x){ return 10*x; }, fmt: 0 },
  { k: 'life2', n: 'Вторая жизнь',   short: '2Ж',  max: 1,  cost: 3,
    f: function(x){ return x; }, fmt: 0 }
];

/* ------------------------------------------------------------
   Противники (раздел 3.3). ТТХ из диздока.
   spd: если персонаж медленнее — SPD = SPD перс − 10.
   pat: 1 преследователь · 2 патруль · 3 страж · 4 хитрый ·
        5 наблюдатель · 6 мирный.
   Доступ по id: FOES['kapustnik'] и т. п.
   ------------------------------------------------------------ */
const FOES = {
  kapustnik: {
    id: 'kapustnik', n: 'Капустник',
    dmg: 30, hp: 150, arm: 0, spd: 130, atk: 0.7, regen: 0,
    r: 20, fistR: 10, xp: 70, col: '#7cb342', pat: 1
  },
  lepestok: {
    id: 'lepestok', n: 'Лепесток',
    dmg: 15, hp: 100, arm: 0, spd: 170, atk: 0.5, regen: 1,
    r: 20, xp: 60, col: '#ffd54f', pat: 4, dodge: 0.1, ranged: 1
  },
  koren: {
    id: 'koren', n: 'Корень',
    dmg: 40, hp: 200, arm: 5, spd: 120, atk: 0.6, regen: 1,
    r: 22, xp: 80, col: '#8d6e63', pat: 1, buried: 1
  },
  kaplya: {
    id: 'kaplya', n: 'Капля',
    dmg: 100, hp: 500, arm: 0, spd: 100, atk: 1.2, regen: 5,
    r: 18, xp: 150, col: '#4fc3f7', pat: 2, water: 1, lob: 1
  },
  kamnevik: {
    id: 'kamnevik', n: 'Камневик',
    dmg: 500, hp: 8000, arm: 10, spd: 110, atk: 4.0, regen: 0,
    r: 50, fistR: 24, xp: 450, col: '#9e9e9e', pat: 1,
    mimicry: 1, summon: 'skol', summonCd: 19, miniboss: 1
  },
  skol: {
    id: 'skol', n: 'Скол',
    dmg: 25, hp: 400, arm: 15, spd: 120, atk: 2.0, regen: 0,
    r: 20, fistR: 12, xp: 150, col: '#bdbdbd', pat: 1,
    mimicry: 1, miniboss: 1
  },
  steklyanny: {
    id: 'steklyanny', n: 'Стеклянный',
    dmg: 2500, hp: 1, arm: 0, spd: 120, atk: 1.0, regen: 0,
    r: 20, fistR: 12, xp: 150, col: '#e0f7fa', pat: 1, glass: 1
  },
  svinka: {
    id: 'svinka', n: 'Свинка',
    dmg: 0, hp: 450, arm: 0, spd: 200, atk: 0, regen: 2,
    r: 16, xp: 57, col: '#f48fb1', pat: 6, peaceful: 1
  },
  uragan: {
    id: 'uragan', n: 'Ураган',
    dmg: 12, hp: 1000, arm: 0, spd: 220, atk: 0.06, regen: 0,
    r: 7, xp: 300, col: '#b0bec5', pat: 2, wind: 70
  },
  krot: {
    id: 'krot', n: 'Крот',
    dmg: 40, hp: 1000, arm: 0, spd: 150, atk: 0.4, regen: 0,
    r: 18, xp: 110, col: '#a1887f', pat: 5, watcher: 1, blind: 1
  },
  almaz: {
    id: 'almaz', n: 'Алмаз',
    dmg: 200, hp: 1900, arm: 40, spd: 120, atk: 1.1, regen: 0,
    r: 22, xp: 190, col: '#e0f7fa', pat: 1, steel: 1
  },
  rubin: {
    id: 'rubin', n: 'Рубин',
    dmg: 250, hp: 1100, arm: 15, spd: 130, atk: 1.0, regen: 0,
    r: 22, xp: 140, col: '#ef5350', pat: 1, rage: 1, heavy: 1
  },
  izumrud: {
    id: 'izumrud', n: 'Изумруд',
    dmg: 150, hp: 1000, arm: 10, spd: 140, atk: 0.6, regen: 2,
    r: 22, xp: 150, col: '#66bb6a', pat: 4, shine: 1, ranged: 1
  },
  skolplus: {
    id: 'skolplus', n: 'Скол+',
    dmg: 250, hp: 2000, arm: 25, spd: 160, atk: 1.3, regen: 0,
    r: 20, fistR: 12, xp: 150, col: '#616161', pat: 1,
    mimicry: 1, longdash: 1
  }
};

/* Фразы смерти (п. 4.6) */
const PHRASES = [
  'Эта область оказалась опаснее тебя',
  'Следи за красным индикатором сверху',
  'А теперь можно и потрогать траву',
  'Ты выбыл из эволюционной гонки',
  'Слабое звено пищевой цепи',
  'Новая попытка – очередная попытка'
];

/* Достижения */
const ACH = [
  { id: 'garden', n: 'Дивный сад',
    d: 'Найти атрибут «Райский сад» в Ромашковых полях' },
  { id: 'spring', n: 'Истоки опыта',
    d: 'Достичь «Ветхого ключа» в Речных лугах' },
  { id: 'oo2', n: 'Речные луга', d: 'Дойти до второй ОО' },
  { id: 'oo3', n: 'Холмы', d: 'Дойти до третьей ОО' },
  { id: 'oo4', n: 'Железные горы', d: 'Дойти до четвёртой ОО' }
];

/* Чекпоинт: файл 01 загружен */
__sdAdvance(1);
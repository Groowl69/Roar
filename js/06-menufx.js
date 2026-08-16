/* ============================================================
   06-menufx.js  ·  файл 9/16
   ------------------------------------------------------------
   Анимированный фон меню: тёмное поле с мягким свечением
   снизу и медленно дрейфующими вверх «спорами». Отображается
   на всех экранах, кроме игрового. Зависит от 02-utils
   (функции $ и rnd). Отрисовку вызывает главный цикл 13-boot.
   ============================================================ */

/* Канвас фона и его контекст */
const bg = $('bgFx');
const bctx = bg.getContext('2d');

/* Массив частиц-спор */
let spores = [];

/* Инициализация: подгонка размера и генерация спор */
function initBg() {
  bg.width = innerWidth;
  bg.height = innerHeight;
  spores = [];
  for (let i = 0; i < 60; i++) {
    spores.push({
      x: rnd(0, bg.width),
      y: rnd(0, bg.height),
      vy: rnd(-14, -4),        /* дрейф вверх */
      vx: rnd(-5, 5),          /* лёгкий снос по горизонтали */
      r: rnd(1, 3),            /* радиус частицы */
      a: rnd(.15, .6),         /* базовая прозрачность */
      ph: rnd(0, 6),           /* фаза мерцания */
      col: Math.random() > .3 ? '143,209,79' : '255,180,84'
    });
  }
}

/* Отрисовка одного кадра фона */
function drawBg(dt, t) {
  /* тёмная основа */
  bctx.fillStyle = '#0b120c';
  bctx.fillRect(0, 0, bg.width, bg.height);

  /* мягкое зелёное свечение снизу */
  const g = bctx.createRadialGradient(
    bg.width * .5, bg.height * 1.1, 50,
    bg.width * .5, bg.height * 1.1, bg.height);
  g.addColorStop(0, 'rgba(60,100,55,.22)');
  g.addColorStop(1, 'rgba(60,100,55,0)');
  bctx.fillStyle = g;
  bctx.fillRect(0, 0, bg.width, bg.height);

  /* споры: движение и мерцание */
  for (const s of spores) {
    s.y += s.vy * dt;
    s.x += s.vx * dt + Math.sin(t + s.ph) * .3;
    /* ушла за верхний край — вернуть снизу */
    if (s.y < -10) {
      s.y = bg.height + 10;
      s.x = rnd(0, bg.width);
    }
    const alpha = s.a * (0.6 + 0.4 * Math.sin(t * 2 + s.ph));
    bctx.fillStyle = 'rgba(' + s.col + ',' + alpha + ')';
    bctx.beginPath();
    bctx.arc(s.x, s.y, s.r, 0, 7);
    bctx.fill();
  }
}

/* Запуск при загрузке и пересоздание при изменении размера окна */
initBg();
addEventListener('resize', initBg);

/* Чекпоинт: файл 06 загружен */
__sdAdvance(6);
/* ============================================================
   02-utils.js  ·  файл 5/16
   ------------------------------------------------------------
   Утилиты общего назначения. Чистые помощники без игровой
   логики. Используются всеми остальными файлами проекта.
   Загружаются после 00-watchdog.js и 01-config.js.
   ============================================================ */

/* Сокращение для получения элемента по id */
function $(id) {
  return document.getElementById(id);
}

/* Ограничить значение v диапазоном [a, b] */
function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

/* Линейная интерполяция между a и b по t (0..1) */
function lerp(a, b, t) {
  return a + (b - a) * t;
}

/* Случайное число в диапазоне [a, b) */
function rnd(a, b) {
  return a + Math.random() * (b - a);
}

/* Случайное целое в диапазоне [a, b] включительно */
function randInt(a, b) {
  return Math.floor(rnd(a, b + 1));
}

/* Случайный элемент массива */
function choice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/* Детерминированный генератор mulberry32. Возвращает функцию,
   дающую значения от 0 до 1 по заданному зерну. Нужен там, где
   генерация должна повторяться одинаково (запечённый фон). */
function mulberry(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* Расстояние между двумя точками */
function dist(x1, y1, x2, y2) {
  return Math.hypot(x2 - x1, y2 - y1);
}

/* Угол от точки 1 к точке 2 в радианах */
function angleTo(x1, y1, x2, y2) {
  return Math.atan2(y2 - y1, x2 - x1);
}

/* Перевод радиан в градусы и обратно */
function deg(rad) { return (rad * 180) / Math.PI; }
function rad(deg) { return (deg * Math.PI) / 180; }

/* Скруглённый прямоугольник (контур). Используется для панелей HUD */
function rr(c, x, y, w, h, r) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}

/* Осветлить (p > 0) или затемнить (p < 0) HEX-цвет.
   Возвращает строку 'rgb(...)'. Используется для теней и градиентов. */
function shade(hex, p) {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  const f = function (v) {
    return clamp(Math.round(v * (1 + p)), 0, 255);
  };
  return 'rgb(' + f(r) + ',' + f(g) + ',' + f(b) + ')';
}

/* Форматирование числа с заданным числом знаков после запятой */
function fmt(v, digits) {
  return v.toFixed(digits || 0);
}

/* Чекпоинт: файл 02 загружен */
__sdAdvance(2);
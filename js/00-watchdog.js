/* ============================================================
   00-watchdog.js  ·  файл 3/16
   ------------------------------------------------------------
   Сторож загрузки. Делает три вещи:
   1) Перехватывает ошибки выполнения (window.onerror) и рисует
      красную полосу с текстом ошибки.
   2) Ведёт чекпоинты: каждый файл проекта в конце вызывает
      __sdAdvance(номер) и тем самым отмечает, что загрузился.
   3) Через 2.5 секунды проверяет, все ли файлы загрузились.
      Если нет — рисует жёлтую полосу и называет файл, который
      вероятно сломан или отсутствует.
   ============================================================ */

/* Метка последнего успешно загруженного файла.
   0 означает: загружен только этот сторож (00-watchdog.js). */
window.__sdBoot = 0;

/* Номер последнего файла проекта (13-boot.js). */
window.__sdFinal = 13;

/* Карта чекпоинтов: номер -> имя файла. Нужна, чтобы сторож
   мог назвать файл в диагностическом сообщении. */
window.__sdFiles = {
  0:  '00-watchdog.js',
  1:  '01-config.js',
  2:  '02-utils.js',
  3:  '03-save.js',
  4:  '04-sfx.js',
  5:  '05-screens.js',
  6:  '06-menufx.js',
  7:  '07-draw-hero.js',
  8:  '08-state.js',
  9:  '09-combat.js',
  10: '10-enemies.js',
  11: '11-terrain.js',
  12: '12-render.js',
  13: '13-boot.js'
};

/* Вызывается каждым файлом в конце: отмечает, что файл номер n
   загрузился. Цепочка строгая: если предыдущий файл не встал,
   следующий метку не поднимает — так сразу видно, где обрыв. */
window.__sdAdvance = function (n) {
  if (window.__sdBoot >= n - 1) window.__sdBoot = n;
};

/* Рисует диагностическую полосу вверху экрана. Если полос
   несколько, они складываются стопкой. */
function __sdBar(msg, col) {
  var top = 0;
  var list = document.querySelectorAll('.sdmsg');
  for (var i = 0; i < list.length; i++) top += list[i].offsetHeight;
  var d = document.createElement('div');
  d.className = 'sdmsg';
  d.style.cssText = 'position:fixed;left:0;right:0;z-index:9999;'
    + 'color:#fff;font:13px/1.4 monospace;padding:6px 14px;'
    + 'top:' + top + 'px;background:' + col;
  d.textContent = msg;
  document.body.appendChild(d);
}

/* Перехват ошибок выполнения в любом файле проекта. */
window.onerror = function (m, s, l) {
  __sdBar('Ошибка JS: ' + m + ' (строка ' + l + ')', '#b3261e');
};

/* Отложенная проверка полноты загрузки. К этому моменту все
   синхронные скрипты уже отработали. */
setTimeout(function () {
  if (window.__sdBoot < window.__sdFinal) {
    var done = window.__sdFiles[window.__sdBoot] || 'нет';
    var next = window.__sdFiles[window.__sdBoot + 1] || 'неизвестный файл';
    __sdBar('Загрузка не завершена. Последний готовый: ' + done
      + '. Вероятно сломан или отсутствует: ' + next
      + ' (чекпоинт ' + window.__sdBoot + ')', '#8a5a00');
  }
}, 2500);
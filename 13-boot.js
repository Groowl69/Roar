/* ============================================================
   13-boot.js  ·  файл 16/16
   ------------------------------------------------------------
   Точка сборки: главный игровой цикл, анимация меню и карусели,
   обратный отсчёт стирания слота, тосты-уведомления.
   Зависит от всех предыдущих файлов. Загружается последним.


/* ================================================================
   ГЛАВНЫЙ ЦИКЛ
   ============================================================ */
/* Синхронизация внутреннего размера canvas с размером окна */
function fitGame(){
  cv.width = innerWidth;
  cv.height = innerHeight;
}
addEventListener('resize', fitGame);
fitGame();

let last = performance.now();
function loop(now){
  const dt = Math.min(.05, (now - last)/1000);
  last = now;
  const t = now/1000;

  /* фон на всех не-игровых экранах */
  if(curScreen !== 'game') drawBg(dt, t);

  /* живой образец Протагона в главном меню */
  if(curScreen === 'menu'){
    const sc = $('specCv').getContext('2d');
    sc.clearRect(0, 0, 240, 240);
    drawHero(sc, 120, 124, {
      face: -Math.PI/2 + Math.sin(t*.6)*.25,
      look: -Math.PI/2 + Math.sin(t*.9)*.4,
      punchT: 0, punchFist: 0, punchDir: 0,
      walk: t*2.2, blink: (t % 7) < .16,
      moving: true, moveAng: Math.PI/2,
      block: false, sweat: false, flash: 0, invuln: false,
      tt: t, scale: 1.7, col: '#8d96a0'
    });
  }

  /* превью выбранного персонажа в карусели */
  if(curScreen === 'chars'){
    const cc = $('charCv').getContext('2d');
    cc.clearRect(0, 0, 180, 180);
    const ch = CHARS[selChar];
    if(ch.open){
      drawHero(cc, 90, 94, {
        face: -Math.PI/2, look: -Math.PI/2 + Math.sin(t)*.3,
        punchT: 0, punchFist: 0, punchDir: 0,
        walk: t*2, blink: (t % 7) < .16,
        moving: true, moveAng: Math.PI/2,
        block: false, sweat: false, flash: 0, invuln: false,
        tt: t, scale: 1.3, col: shade(ch.col, -.1)
      });
    }else{
      /* заблокированный персонаж — силуэт с вопросом */
      cc.fillStyle = '#1a241b';
      cc.beginPath(); cc.arc(90, 90, 46, 0, 7); cc.fill();
      cc.fillStyle = '#54645a';
      cc.font = 'bold 40px ' + FD;
      cc.textAlign = 'center';
      cc.fillText('?', 90, 104);
    }
  }

  /* игровой экран: логика + отрисовка */
  if(curScreen === 'game' && G){
    update(dt);
    draw();
  }

  /* обратный отсчёт стирания слота (п. 4.5) */
  if(wipeArm >= 0){
    wipeT -= dt;
    if(wipeT <= 0){
      wipeArm = -1;
      if(curScreen === 'settings') renderSettings();
    }
  }

  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

/* стартовый экран */
showScreen('menu');

/* чекпоинт: файл 13 (последний) загружен */
window.__sdBoot = 13;
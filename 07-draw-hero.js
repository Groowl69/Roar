/* ============================================================
   07-draw-hero.js  ·  файл 10/16
   ------------------------------------------------------------
   Отрисовка Протагона — общая функция для меню (превью, карусель)
   и игры. Реализует вид из п. 3.0 диздока: серый кружок R=25,
   чёрные глазки-зрачки R=2.5, кулачки R=12 с расхождением 160°,
   разноимённое перебирание при ходьбе, моргание, блок, пот,
   вспышка урона, неуязвимость, динамические тени кулачков.
   Зависит от: 01-config (константы C), 02-utils ($), 03-save (meta, persist).
   ============================================================ */

/* Тени живых существ: по умолчанию включены, если настройка не задана */
if (typeof meta !== 'undefined' && meta.shadows === undefined) {
  meta.shadows = true;
}

/* Привязка чекбокса «Тени живых существ» (id="shadows" в index.html).
   Дублируем здесь, чтобы настройка работала независимо от screens.js */
(function bindShadowsToggle() {
  const cb = $('shadows');
  if (!cb) return;
  cb.checked = !(typeof meta !== 'undefined' && meta.shadows === false);
  cb.addEventListener('change', function() {
    if (typeof meta !== 'undefined') {
      meta.shadows = cb.checked;
      if (typeof persist === 'function') persist();
    }
  });
})();

/* Включены ли тени живых существ (читает настройку пользователя) */
function shadowsEnabled() {
  if (typeof meta === 'undefined') return true;
  return meta.shadows !== false;
}

/* Отрисовка Протагона.
   Параметры объекта o:
     face      — угол взгляда/направления (рад)
     punchT    — оставшееся время анимации удара (сек), 0 если удара нет
     punchFist — какой кулак бьёт (0 или 1)
     punchDir  — угол направления удара (рад)
     walk      — фаза шага (накапливается при движении)
     moving    — движется ли персонаж
     moveAng   — угол направления движения (рад)
     blink     — моргает ли сейчас
     block     — держит ли блок (Shift)
     sweat     — нехватка энергии (капли пота)
     flash     — оставшееся время вспышки урона
     invuln    — неуязвимость (вторая жизнь)
     col       — цвет тела (переопределяет серый)
     scale     — масштаб (для превью в меню)
     tt        — текущее время (для анимаций) */
function drawHero(c, x, y, o) {
  const sc = o.scale || 1;
  c.save();
  c.translate(x, y);
  c.scale(sc, sc);
  const R = C.pR, FR = C.fistR;
  const shadows = shadowsEnabled();

  /* тень тела на земле */
  if (shadows) {
    c.fillStyle = 'rgba(0,0,0,.3)';
    c.beginPath();
    c.ellipse(0, R*.85, R*1.05, R*.4, 0, 0, 7);
    c.fill();
  }

  /* кольцо неуязвимости (вторая жизнь), мигает */
  if (o.invuln) {
    c.strokeStyle = 'rgba(255,220,120,' + (0.4 + 0.3*Math.sin(o.tt*10)) + ')';
    c.lineWidth = 3;
    c.beginPath();
    c.arc(0, 0, R + 9, 0, 7);
    c.stroke();
  }

  /* кулаки: позиция, тень, сам кулак */
  const spread = C.fistSpread;
  for (let f = 0; f < 2; f++) {
    let ang = o.face + (f === 0 ? -spread/2 : spread/2);
    let fdist = R + FR*.65;
    let fx = Math.cos(ang) * fdist;
    let fy = Math.sin(ang) * fdist;
    /* разноимённое перебирание кулаков при ходьбе */
    if (o.moving) {
      const bob = Math.sin(o.walk + (f ? Math.PI : 0));
      fx += Math.cos(o.moveAng) * bob * 9;
      fy += Math.sin(o.moveAng) * bob * 9;
    }
    /* блок: кулаки сдвигаются вперёд и к центру */
    if (o.block) {
      ang = o.face + (f === 0 ? -0.3 : 0.3);
      fx = Math.cos(ang) * (R + 4);
      fy = Math.sin(ang) * (R + 4);
    }
    /* удар: вынос кулака вперёд по направлению удара */
    if (o.punchT > 0 && f === o.punchFist) {
      const q = 1 - o.punchT / C.punchDur;
      const ext = Math.sin(q * Math.PI);
      fx = Math.cos(o.punchDir) * (R + FR*.6 + ext*C.punchReach);
      fy = Math.sin(o.punchDir) * (R + FR*.6 + ext*C.punchReach);
    }
    /* динамическая тень кулака на земле (движется вместе с кулаком) */
    if (shadows) {
      c.fillStyle = 'rgba(0,0,0,.25)';
      c.beginPath();
      c.ellipse(fx, R*.85, FR*.9, FR*.35, 0, 0, 7);
      c.fill();
    }
    /* сам кулак (чёрный кружок R=12) */
    c.fillStyle = '#1c2126';
    c.beginPath();
    c.arc(fx, fy, FR, 0, 7);
    c.fill();
    /* блик на кулаке */
    c.fillStyle = 'rgba(255,255,255,.12)';
    c.beginPath();
    c.arc(fx - FR*.3, fy - FR*.35, FR*.4, 0, 7);
    c.fill();
  }

  /* дуга блока (полупрозрачный щит перед персонажем) */
  if (o.block) {
    c.strokeStyle = 'rgba(140,200,230,.55)';
    c.lineWidth = 4;
    c.beginPath();
    c.arc(0, 0, R + 14, o.face - 1.1, o.face + 1.1);
    c.stroke();
  }

  /* тело: серый градиентный круг R=25 */
  const g = c.createRadialGradient(-R*.3, -R*.35, R*.15, 0, 0, R);
  g.addColorStop(0, '#c2cad2');
  g.addColorStop(1, o.col || '#8d96a0');
  c.fillStyle = g;
  c.beginPath();
  c.arc(0, 0, R, 0, 7);
  c.fill();
  c.strokeStyle = 'rgba(0,0,0,.35)';
  c.lineWidth = 2;
  c.stroke();

  /* глаза: только чёрные зрачки R=2.5 (белки убраны), моргание */
  const blink = o.blink ? 0.15 : 1;
  for (let e2 = 0; e2 < 2; e2++) {
    const ea = o.face + (e2 === 0 ? -0.45 : 0.45);
    const ex = Math.cos(ea) * R * .45;
    const ey = Math.sin(ea) * R * .45;
    c.save();
    c.translate(ex, ey);
    c.scale(1, blink);
    c.fillStyle = '#14181c';
    c.beginPath();
    c.arc(0, 0, C.pupilR, 0, 7);
    c.fill();
    c.restore();
  }

  /* капли пота при нехватке энергии (п. 4.1) */
  if (o.sweat) {
    c.fillStyle = '#7ec8e8';
    c.beginPath();
    c.arc(-R*.5, -R - 6 + Math.sin(o.tt*6)*2, 3, 0, 7);
    c.fill();
    c.beginPath();
    c.arc(R*.55, -R - 3 + Math.cos(o.tt*5)*2, 2.4, 0, 7);
    c.fill();
  }

  /* вспышка урона: красный оверлей (константа 10) */
  if (o.flash > 0) {
    c.fillStyle = 'rgba(255,70,70,' + Math.min(.7, o.flash*5) + ')';
    c.beginPath();
    c.arc(0, 0, R + 2, 0, 7);
    c.fill();
  }

  c.restore();
}

/* Чекпоинт: файл 07 загружен */
__sdAdvance(7);
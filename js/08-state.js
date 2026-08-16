/* ============================================================
   08-state.js  ·  файл 11/16
   ------------------------------------------------------------
   Состояние игры: игрок (P), мир (G), формулы прокачки,
   запуск забега и главный апдейт. Зависит от 01-config,
   02-utils, 03-save, 04-sfx, 05-screens. Генерация мира
   (initWorld) и апдейд сада/врагов живут в своих файлах.
   ============================================================ */

/* Канвас игры и его контекст */
const cv = $('game');
const ctx = cv.getContext('2d');

/* Глобальное состояние */
let G = null;            /* мир: враги, флора, точки, камера, эффекты */
let P = null; gcv = null;            /* игрок: позиция, статы, прокачка */
let keys = {};           /* зажатые клавиши */
let paused = false;      /* пауза */
let devImmortal = false; /* === РАЗРАБОТЧИК: бессмертие (удалить после тестов) === */

function ooCap(){
  return C.lvlCap;
}

/* Опыт, нужный для перехода с уровня l на уровень l+1 */
function needXp(l){ return 40 + 15*(l-1); }

/* Определение: сейчас ночь? (true/false) */
function isNight(){
  return G.dayT >= C.dayLen;
}

/* Коэффициент освещения: 1.0 = день, nightOpacity = ночь */
function getLightFactor(){
  if(G.dayT < C.dayLen) return 1.0; // полный день
  const nightProgress = (G.dayT - C.dayLen) / C.nightLen; // 0..1 в течение ночи
  // Плавный переход: сумерки в начале и конце ночи
  if(nightProgress < 0.1) return 1.0 - (1.0 - C.nightOpacity) * (nightProgress / 0.1);
  if(nightProgress > 0.9) return C.nightOpacity + (1.0 - C.nightOpacity) * ((1.0 - nightProgress) / 0.1);
  return C.nightOpacity; // полная ночь
}

/* Пересчёт характеристик игрока по вложенным очкам прокачки.
   Формулы п. 3.1 (базы Протагона). Вызывается при старте и
   при каждом улучшении навыка. */
function derive(){
  const s = P.sk;
  /* защита от NaN/undefined в очках прокачки */
  const n = function(v){ return (typeof v === 'number' && isFinite(v)) ? v : 0; };
  const oldMax = P.maxHp || 0;
  P.maxHp = Math.round(100 + 47.94*n(s.hp) + 2.06*n(s.hp)*n(s.hp));
  P.regen = 2 + 5*n(s.regen);
  P.dmg = 10 + 9.031*n(s.dmg) + 0.969*n(s.dmg)*n(s.dmg);
  P.maxEn = 4 + n(s.en);
  P.enReg = 1.5 + 0.5*n(s.enreg);
  P.agi = Math.max(.1, 0.5 - 0.03*n(s.agi));
  P.spd = 125 + 55*n(s.spd);
  P.res = 10*n(s.res);
  P.punchCost = 1 + 0.1*n(s.dmg);   /* п. 2.3: +0,1 энергии за уровень DMG */
  /* при росте максимального HP добавляем разницу к текущему */
  if(P.maxHp > oldMax) P.hp += (P.maxHp - oldMax);
  P.en = Math.min(P.en, P.maxEn);
}

/* Попытка начать забег: проверяем, разблокирован ли персонаж */
function tryStart(){
  const ch = CHARS[selChar];
  if(!ch.open){ SFX.deny(); toast('🔒 ' + ch.lock); return; }
  startRun();
}

/* Запуск забега: создаём игрока и мир, переходим на игровой экран */
function startRun(){
  P = {
    x:0, y:0, vx:0, vy:0, face:-Math.PI/2, look:-Math.PI/2,
    hp:100, maxHp:100, en:4, maxEn:4,
    sk:{dmg:0, hp:0, regen:0, en:0, enreg:0, agi:0, spd:0, res:0, life2:0},
    pts:0, lvl:1, xp:0,
    punchT:0, punchCd:0, punchFist:0, punchDir:0, punchHit:false,
    lastAtkT:-99, lastDmgT:-99, lastMoveT:-99,
    walk:0, blinkT:C.blinkEvery, blink:0,
    block:false, sweat:false, flash:0, invuln:0,
    life2Used:false, fsCount:0, lsCount:0, lsFlag:false,
    radOpen:false, radT:0, radHover:-1,
    sx:0, sy:0, moved:false, inPond:false,
  };
  derive(); P.hp = P.maxHp; P.en = P.maxEn;
  G = {
    t:0, dayT:0, cam:{x:0, y:0}, shake:0,
    curOO:0, visited:[true,false,false,false],
    ooGot:[0,0,0,0], ooData:[null,null,null,null],
    enemies:[], respawnQ:[], spawnT:C.firstSpawnDelay,
    xpPts:[], deco:[], ash:[],
    particles:[], floats:[], pillars:[],
    garden:null, gardenSeen:false,
    kills:0, dmgDealt:0, collected:0, counterT:0,
    capShown:false, over:false,
    mx:cv.width/2, my:cv.height/2, wmx:0, wmy:0, mdown:false,
    pillCd:0, hold5:0, devT:0,
  };
  /* Сброс флага первого спавна при старте забега */
  firstSpawnDone = false;
  initWorld();   /* генерация ландшафта — в 11-terrain.js */
  paused = false;
  $('pauseOv').classList.add('hidden');
  $('deathOv').classList.add('hidden');
  showScreen('game');
  toast('WASD — движение · ЛКМ — удар · Shift — блок · Q — прокачка', 6000);
}

/* Всплывающий текст в мире (урон, опыт, уровни) */
function addFloat(x, y, txt, col, big){
  G.floats.push({x:x, y:y, txt:txt, col:col, t:1.1, big:!!big});
}

/* ============================================================
   ГЛАВНЫЙ АПДЕЙТ — вызывается каждый кадр из 13-boot.js
   ============================================================ */
function update(rdt){
  if(!G || paused || G.over) return;
  const dt = Math.min(.05, rdt);
  G.t += dt;
  G.dayT = (G.dayT + dt) % (C.dayLen + C.nightLen);
  G.shake = Math.max(0, G.shake - dt*22);
  G.counterT = Math.max(0, G.counterT - dt);

  /* рестарт забега удержанием "5" (3 сек) */
  if(keys['Digit5']){
    G.hold5 = (G.hold5||0) + dt;
    if(G.hold5 >= 3){
      G.hold5 = 0; meta.restartSeen = true; persist(); startRun(); return;
    }
  }else{
    G.hold5 = 0;
  }

  /* === РАЗРАБОТЧИК: Ъ = +1 уровень / 0,07 c (удалить после тестов) === */
  if(keys['BracketRight']){
    G.devT = (G.devT||0) + dt;
    while(G.devT >= 0.07){ G.devT -= 0.07; devLevelUp(); }
  }else{
    G.devT = 0;
  }

  /* --- движение игрока --- */
  let ix = 0, iy = 0;
  if(keys['KeyW'] || keys['ArrowUp']) iy -= 1;
  if(keys['KeyS'] || keys['ArrowDown']) iy += 1;
  if(keys['KeyA'] || keys['ArrowLeft']) ix -= 1;
  if(keys['KeyD'] || keys['ArrowRight']) ix += 1;
  P.block = !!keys['ShiftLeft'] || !!keys['ShiftRight'];
  const moving = ix !== 0 || iy !== 0;
  if(moving){
    if(!P.moved){ P.moved = true; G.spawnT = C.firstSpawnDelay; }
    P.lastMoveT = G.t;
    const il = Math.hypot(ix, iy);
    ix /= il; iy /= il;
    let maxS = P.spd;
    if(P.block) maxS *= .5;              /* блок: -50% скорости */
    if(P.inPond) maxS *= .8;             /* утомление в воде */
    /* разгон за C.ramp секунд (константа 9) */
    const acc = P.spd / C.ramp;
    P.vx += ix*acc*dt;
    P.vy += iy*acc*dt;
    const v = Math.hypot(P.vx, P.vy);
    if(v > maxS){ P.vx = P.vx/v*maxS; P.vy = P.vy/v*maxS; }
    P.walk += v*dt*.09;
  }else{
    /* торможение, когда клавиши отпущены */
    const v = Math.hypot(P.vx, P.vy);
    const dec = P.spd/C.ramp*12*dt;
    if(v <= dec || v < 2){ P.vx = 0; P.vy = 0; }
    else{ P.vx -= P.vx/v*dec; P.vy -= P.vy/v*dec; }
  }
  P.x += P.vx*dt; P.y += P.vy*dt;

  /* не выходить за границу текущей ОО */
  const oo = OOS[G.curOO];
  const pd0 = Math.hypot(P.x, P.y);
  const maxR = oo.ring1 - C.pR - 14;
  const minR = (G.curOO === 0) ? 0 : oo.ring0 + C.pR + 14;
  if(pd0 > maxR){
    P.x = P.x/pd0*maxR; P.y = P.y/pd0*maxR;
    P.vx *= .4; P.vy *= .4;
  }
  if(pd0 < minR && pd0 > 0){
    P.x = P.x/pd0*minR; P.y = P.y/pd0*minR;
    P.vx *= .4; P.vy *= .4;
  }

  /* взгляд — в сторону курсора */
  G.wmx = G.mx + G.cam.x - cv.width/2;
  G.wmy = G.my + G.cam.y - cv.height/2;
  P.face = Math.atan2(G.wmy - P.y, G.wmx - P.x);
  P.look = P.face;

  /* --- таймеры персонажа --- */
  P.punchT = Math.max(0, P.punchT - dt);
  P.punchCd = Math.max(0, P.punchCd - dt);
  P.flash = Math.max(0, P.flash - dt);
  P.invuln = Math.max(0, P.invuln - dt);
  P.blinkT -= dt;
  if(P.blinkT <= 0){ P.blink = C.blinkDur; P.blinkT = C.blinkEvery; }
  P.blink = Math.max(0, P.blink - dt);

  /* удар: середина анимации выноса кулака */
  if(P.punchT > 0 && !P.punchHit &&
     (1 - P.punchT/C.punchDur) >= .45){
    P.punchHit = true;
    applyPunch();
  }
  /* серия при удержании ЛКМ */
  if(G.mdown && !P.radOpen && P.punchCd <= 0 && P.punchT <= 0) tryPunch();

  /* энергия: реген через 1.5 c после атаки; блок запрещает (п. 3.0) */
  const enOK = (G.t - P.lastAtkT) > C.enDelay && !P.block;
  if(enOK && !P.inPond) P.en = Math.min(P.maxEn, P.en + P.enReg*dt);
  else if(enOK && P.inPond) P.en = Math.min(P.maxEn, P.en + P.enReg*.8*dt);
  if(P.en >= P.maxEn - 1e-6) P.lsFlag = false;
  P.sweat = P.en < P.punchCost;

  /* HP реген через 1.5 c после последнего урона */
  if((G.t - P.lastDmgT) > C.hpDelay)
    P.hp = Math.min(P.maxHp, P.hp + P.regen*dt);

  /* радиальное меню прокачки */
  const q = !!keys['KeyQ'];
  if(q && !P.radOpen){ P.radOpen = true; P.radT = G.t; }
  if(!q) P.radOpen = false;

  /* --- подсистемы из других файлов --- */
  updateGarden(dt);     /* атрибут «Райский сад» — 11-terrain.js */
  spawnTick(dt);        /* спавн врагов — 10-enemies.js */
  updateEnemies(dt);    /* ИИ врагов — 10-enemies.js */

  /* --- точки опыта (притягиваются и собираются) --- */
  for(const p of G.xpPts){
    if(p.taken) continue;
    const d = Math.hypot(p.x - P.x, p.y - P.y);
    if(d < 60) p.pull = true;
    if(p.pull){
      p.x += (P.x - p.x)*Math.min(1, dt*7);
      p.y += (P.y - p.y)*Math.min(1, dt*7);
    }
    if(d < C.pR + 8){
      p.taken = true;
      G.collected++;
      G.counterT = 2.5;
      addXp(C.xpPer);
      addFloat(p.x, p.y-14, '+' + C.xpPer + ' XP', '#ffe9a8');
      SFX.pickup();
      for(let i=0;i<6;i++) G.particles.push({
        x:p.x, y:p.y, vx:rnd(-60,60), vy:rnd(-80,-20),
        life:.4, col:'#ffe9a8', sz:2, glow:true});
    }
  }

  /* --- декоративные цветы: топчутся и вырастают заново --- */
  for(const f of G.deco){
    if(f.state === 0 &&
       Math.hypot(f.x - P.x, f.y - P.y) < C.pR + f.r) trample(f);
    if(f.state === 1){
      f.grayT -= dt;
      if(f.grayT <= 0){
        const a = rnd(0,6.283);
        const d = Math.sqrt(Math.random())*(oo.ring1-80);
        f.x = Math.cos(a)*d; f.y = Math.sin(a)*d;
        f.col = pickFlower(Math.random);
        f.state = 0;
      }
    }
  }

  /* --- частицы и всплывающие тексты --- */
  for(const p of G.particles){
    p.life -= dt;
    if(!p.ring){ p.x += p.vx*dt; p.y += p.vy*dt; p.vy += 100*dt; }
    else p.r += (p.maxR - p.r)*dt*12;
  }
  G.particles = G.particles.filter(function(p){ return p.life > 0; });
  for(const f of G.floats){ f.t -= dt; f.y -= 26*dt; }
  G.floats = G.floats.filter(function(f){ return f.t > 0; });
  for(const a of G.ash) a.t -= dt;
  G.ash = G.ash.filter(function(a){ return a.t > 0; });

  /* --- камера следует за игроком --- */
  G.cam.x += (P.x - G.cam.x)*Math.min(1, dt*5);
  G.cam.y += (P.y - G.cam.y)*Math.min(1, dt*5);
  const cl = oo.ring1 - Math.min(cv.width, cv.height)/2 + 60;
  G.cam.x = clamp(G.cam.x, -cl, cl);
  G.cam.y = clamp(G.cam.y, -cl, cl);
}

/* Чекпоинт: файл 08 загружен */
__sdAdvance(8);
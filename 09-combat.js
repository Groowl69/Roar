/* ============================================================
   09-combat.js  ·  файл 12/16
   ------------------------------------------------------------
   Боевая система (п. 2.12), урон, смерть, вторая жизнь (п. 2.9),
   опыт и уровни, прокачка через радиальное меню (п. 4.2).
   Зависит от 01-config (C, SKILLS, OOS, PHRASES), 02-utils,
   03-save (slot, persist), 04-sfx (SFX), 08-state (G, P, cv,
   needXp, derive, startRun, addFloat).
   ============================================================ */

/* ================================================================
   БОЙ (п. 2.12)
   ============================================================ */

/* Попытка удара: проверяем энергию, запускаем анимацию выноса кулака.
   Без достаточного количества энергии удар не выполняется (п. 2.12). */
function tryPunch(){
  if(P.punchT > 0 || P.punchCd > 0) return;
  if(P.en < P.punchCost - 1e-6){ SFX.deny(); P.sweat = true; return; }
  const wasFull = P.en >= P.maxEn - 1e-6;
  P.en -= P.punchCost;
  P.lastAtkT = G.t;
  if(wasFull) P.fsCount++;            /* «первый удар» (п. 2.12) */
  if(P.en < P.punchCost - 1e-6 && !P.lsFlag){
    P.lsFlag = true; P.lsCount++;      /* «последний удар» (п. 2.12) */
  }
  if(P.en >= P.maxEn - 1e-6) P.lsFlag = false;
  P.punchT = C.punchDur;
  P.punchCd = P.agi;
  P.punchFist = 1 - P.punchFist;       /* чередуем кулаки (п. 3.0) */
  P.punchDir = Math.atan2(G.wmy - P.y, G.wmx - P.x);
  P.punchHit = false;
  SFX.punch();
}

/* Применение урона: дуга перед персонажем, легко попасть в упор.
   Вызывается из update() в момент полного выноса кулака. */
function applyPunch(){
  const reach = C.pR + C.punchReach + C.fistR + 12;
  let hitAny = false;
  for(const e of G.enemies){
    if(e.dead) continue;
    const dx = e.x - P.x, dy = e.y - P.y;
    if(Math.hypot(dx, dy) > reach + e.r) continue;
    let da = Math.atan2(dy, dx) - P.punchDir;
    while(da > Math.PI) da -= Math.PI*2;
    while(da < -Math.PI) da += Math.PI*2;
    if(Math.abs(da) < 1.05){
      damageEnemy(e, P.dmg, false);
      hitAny = true;
    }
  }
  if(hitAny) SFX.hit();
  /* искры в точке удара */
  const tipD = C.pR + C.fistR*.6 + C.punchReach;
  const tx = P.x + Math.cos(P.punchDir)*tipD,
        ty = P.y + Math.sin(P.punchDir)*tipD;
  for(let i=0;i<5;i++) G.particles.push({
    x:tx, y:ty, vx:rnd(-90,90), vy:rnd(-90,90),
    life:.22, col:'#fff', sz:2, glow:true});
}

/* Урон по противнику с учётом брони. ignoreArm — для столба света. */
function damageEnemy(e, dmg, ignoreArm){
  if(e.dead) return;
  if(!isFinite(dmg)) dmg = 10;          /* страховка от NaN */
  const real = ignoreArm ? dmg : dmg * (1 - e.arm/100);
  e.hp -= real; e.flash = .12;
  G.dmgDealt += real;
  addFloat(e.x + rnd(-8,8), e.y - e.r - 8, '' + Math.round(real), '#ffb454');
  const ka = Math.atan2(e.y - P.y, e.x - P.x);
  e.x += Math.cos(ka)*10; e.y += Math.sin(ka)*10;
  if(e.hp <= 0) killEnemy(e, false);
}

/* Смерть противника: опыт, частицы, очередь респауна.
   byPillar — испепеление столбом света (опыт не даётся, раздел 1 ОО-1). */
function killEnemy(e, byPillar){
  e.dead = true;
  if(byPillar){
    G.ash.push({x:e.x, y:e.y, t:8, r:e.r});
    for(let i=0;i<10;i++) G.particles.push({
      x:e.x, y:e.y, vx:rnd(-40,40), vy:rnd(-60,-10),
      life:.6, col:'#2a2a2e', sz:2.5});
    addFloat(e.x, e.y-16, '⚝ свет', '#e8e4da');
    SFX.poof();
    return;
  }
  G.kills++;
  addXp(e.xp);
  addFloat(e.x, e.y-16, '+' + e.xp + ' XP', '#ffd166');
  for(let i=0;i<16;i++) G.particles.push({
    x:e.x, y:e.y, vx:rnd(-130,130), vy:rnd(-130,130),
    life:rnd(.3,.6), col:e.col, sz:rnd(2,5), glow:true});
  G.particles.push({x:e.x, y:e.y, ring:true, r:6, maxR:e.r*3,
    life:.4, col:'rgba(255,255,255,'});
  G.shake = Math.max(G.shake, 3);
  SFX.poof();
  G.respawnQ.push({t:C.respawnT});
}

/* ================================================================
   ОПЫТ И УРОВНИ (п. 2.1, 2.6)
   Лимит уровня — cap текущей ОО (раздел 10).
   ============================================================ */
function addXp(v){
  const cap = OOS[G.curOO].cap;
  if(P.lvl >= cap) return;              /* лимит ОО */
  P.xp += v;
  while(P.lvl < cap && P.xp >= needXp(P.lvl)){
    P.xp -= needXp(P.lvl);
    P.lvl++; P.pts++;
    addFloat(P.x, P.y-46, 'УРОВЕНЬ ' + P.lvl + '!', '#ffb454', true);
    G.particles.push({x:P.x, y:P.y, ring:true, r:10, maxR:90,
      life:.5, col:'rgba(255,180,84,'});
    SFX.level();
    if(P.lvl >= cap && !G.capShown){
      G.capShown = true;
      toast('Лимит ' + cap + ' уровня ОО-' + (G.curOO+1) +
        '! Дальше — переход по E', 5000);
    }
  }
}

/* === РАЗРАБОТЧИК: быстрая прокачка (удалить после тестов) === */
function devLevelUp(){
  if(P.lvl >= C.lvlMax) return;
  P.lvl++; P.pts++;
  addFloat(P.x, P.y-46, 'УР. ' + P.lvl + ' [dev]', '#6fc7d8', true);
  SFX.level();
}

/* === РАЗРАБОТЧИК: переключение бессмертия (удалить после тестов) === */
function devToggleImmortal(){
  devImmortal = !devImmortal;
  toast(devImmortal ? '[dev] Бессмертие ВКЛ' : '[dev] Бессмертие ВЫКЛ');
}

/* === РАЗРАБОТЧИК: гибель всех противников в зоне видимости,
   кроме боссов (удалить после тестов) === */
function devKillVisible(){
  const halfW = cv.width/2 + 60, halfH = cv.height/2 + 60;
  let n = 0;
  for(const e of G.enemies){
    if(e.dead) continue;
    if(e.def.boss) continue;            /* не боссов */
    if(Math.abs(e.x - G.cam.x) <= halfW && Math.abs(e.y - G.cam.y) <= halfH){
      killEnemy(e, false);
      n++;
    }
  }
  if(n > 0) toast('[dev] Повержено: ' + n);
}

/* ================================================================
   УРОН ПО ИГРОКУ И СМЕРТЬ (п. 2.9)
   ============================================================ */
function hitPlayer(dmg, src){
  if(P.invuln > 0 || G.over) return;
  if(devImmortal) return;               /* === РАЗРАБОТЧИК === */
  let d = dmg;
  if(P.block) d *= .5;                  /* блок: -50% урона (п. 3.0) */
  d *= (1 - P.res/100);                 /* устойчивость (п. 3.0) */
  P.hp -= d; P.flash = .12;
  P.lastDmgT = G.t;
  G.shake = Math.max(G.shake, 4);
  const ka = Math.atan2(P.y - src.y, P.x - src.x);
  P.x += Math.cos(ka)*14; P.y += Math.sin(ka)*14;
  SFX.hurt();
  if(P.hp <= 0){
    if(!P.life2Used && P.sk.life2 > 0){
      /* Вторая жизнь: возрождение на месте смерти (п. 2.9) */
      P.life2Used = true;
      P.hp = P.maxHp; P.invuln = 3;
      addFloat(P.x, P.y-46, 'ВТОРАЯ ЖИЗНЬ!', '#7ee081', true);
      G.particles.push({x:P.x, y:P.y, ring:true, r:10, maxR:120,
        life:.6, col:'rgba(126,224,129,'});
      SFX.level();
    }else{
      die();
    }
  }
}

/* Итоговая смерть: конец забега, сохранение статистики (п. 2.2),
   экран смерти (п. 4.6). */
function die(){
  G.over = true;
  SFX.death();
  const s = slot();
  s.deaths++; s.kills += G.kills;
  s.best = Math.max(s.best, P.lvl);
  persist();
  const phrase = PHRASES[Math.floor(Math.random()*PHRASES.length)];
  const mm = Math.floor(G.t/60), ss = Math.floor(G.t%60);
  const ov = $('deathOv');
  ov.classList.remove('hidden');
  ov.innerHTML =
    '<div class="ov-title lose">КОНЕЦ ЭВОЛЮЦИИ</div>' +
    '<div class="ov-phrase">«' + phrase + '»</div>' +
    '<div class="stats-grid">' +
    '<span class="k">Убито противников</span><span class="v">' + G.kills + '</span>' +
    '<span class="k">Достигнутый уровень</span><span class="v">' + P.lvl + '</span>' +
    '<span class="k">ОО</span><span class="v">ОО-' + (G.curOO+1) +
      ' «' + OOS[G.curOO].name + '»</span>' +
    '<span class="k">Нанесено урона</span><span class="v">' +
      Math.round(G.dmgDealt) + '</span>' +
    '<span class="k">Время</span><span class="v">' + mm + ':' +
      String(ss).padStart(2,'0') + '</span></div>' +
    '<div class="row">' +
    '<button class="btn primary" id="btnRetry">↻ Заново (Space)</button>' +
    '<button class="btn" id="btnDeathMenu">В меню (Esc)</button></div>';
  $('btnRetry').onclick = restart;
  $('btnDeathMenu').onclick = function(){ showScreen('menu'); };
}

function restart(){ startRun(); }

/* ================================================================
   ПРОКАЧКА (радиальное меню, п. 4.2)
   Клик по иконке навыка при удержании Q.
   ============================================================ */
function radialClick(){
  const i = P.radHover;
  if(i < 0) return;
  const sk = SKILLS[i], lv = P.sk[sk.k];
  if(lv >= sk.max){ SFX.deny(); return; }
  if(P.pts < sk.cost){ SFX.deny(); toast('Не хватает очков прокачки'); return; }
  P.pts -= sk.cost;
  P.sk[sk.k] = (P.sk[sk.k] || 0) + 1;
  derive();
  SFX.pickup();
  addFloat(P.x, P.y-40, sk.n + ' ↑', '#7ee081');
}

/* ================================================================
   КНОПКИ ПАУЗЫ И ЭКРАНА СМЕРТИ
   ============================================================ */
$('btnResume').onclick = function(){
  paused = false; $('pauseOv').classList.add('hidden'); SFX.click();
};
$('btnPauseSet').onclick = function(){
  setBackTo = 'game'; showScreen('settings');
};
$('btnAbort').onclick = function(){
  paused = false; showScreen('menu'); G = null;
};

/* Чекпоинт: файл 09 загружен */
__sdAdvance(9);
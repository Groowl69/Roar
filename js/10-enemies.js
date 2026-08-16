/* ============================================================
   10-enemies.js  ·  файл 13/16
   ------------------------------------------------------------
   Спавн и ИИ противников. Шесть паттернов поведения (п. 2.4):
   1 прямолинейный преследователь · 2 патруль · 3 защитный страж
   4 хитрый · 5 наблюдатель · 6 мирный.
   Набор противников на ОО — из баланса (раздел 10). Данные врагов
   (FOES) определены в 01-config.js. Зависит от 02-utils, 03-save,
   04-sfx, 08-state (G, P, addXp, addFloat).
   ============================================================ */

/* Какие типы врагов спавнятся на каждой ОО (раздел 10).
   Ключи должны совпадать с ключами FOES из 01-config.js. */
const OO_SPAWN = {
  0: ['kapustnik','lepestok','koren'],                 /* Ромашковые поля */
  1: ['kamnevik','skol','kaplya','koren'],             /* Речные луга   */
  2: ['svinka','uragan','krot'],                       /* Холмы           */
  3: ['almaz','rubin','izumrud','skolplus'],           /* Железные горы  */
};

/* Веса появления типов на ОО-1 (чем больше, тем чаще).
   Для остальных ОО — равномерное распределение. */
const SPAWN_WEIGHTS = {
  kapustnik: 30, lepestok: 22, koren: 20,
  kamnevik: 8,   skol: 20,    kaplya: 18,
  svinka: 30,    uragan: 22,  krot: 20,
  almaz: 28,     rubin: 28,   izumrud: 28, skolplus: 12,
};

/* ================================================================
   СПАВН (п. 2.5)
   ============================================================ */

/* Флаг: был ли уже выполнен первый спавн на текущей ОО */
let firstSpawnDone = false;

function spawnTick(dt){
  if(!P.moved) return;                 /* монстры ждут первого движения (п. 1.6) */
  
  /* Задержка первого спавна после входа в ОО */
  if(!firstSpawnDone) {
    G.spawnT -= dt;
    if(G.spawnT <= 0) {
      firstSpawnDone = true;
      G.spawnT = C.respawnT; // сброс таймера на стандартный интервал
    }
    return;
  }
  
  /* очередь респауна */
  for(let i = G.respawnQ.length-1; i >= 0; i--){
    G.respawnQ[i].t -= dt;
    if(G.respawnQ[i].t <= 0){ G.respawnQ.splice(i,1); }
  }
  
  G.spawnT -= dt;
  if(G.spawnT > 0) return;
  
  const alive = G.enemies.filter(function(e){ return !e.dead; }).length;
  
  /* Проверка лимитов: popMin..popMax монстров */
  if(alive < C.popMax && alive >= C.popMin){
    // Шанс спавна для поддержания среднего значения
    if(Math.random() < 0.7) {
      spawnOne(pickType());
      G.spawnT = C.respawnT;
    }
  } else if(alive < C.popMin) {
    // Срочный спавн если слишком мало врагов
    spawnOne(pickType());
    G.spawnT = C.respawnT * 0.5;
  }
}

/* Выбор типа врага на текущей ОО с учётом весов */
function pickType(){
  const pool = OO_SPAWN[G.curOO] || OO_SPAWN[0];
  let total = 0;
  for(const id of pool) total += (SPAWN_WEIGHTS[id] || 10);
  let roll = Math.random() * total;
  for(const id of pool){
    roll -= (SPAWN_WEIGHTS[id] || 10);
    if(roll <= 0) return id;
  }
  return pool[0];
}

/* Создание одного противника в случайной точке текущей ОО */
function spawnOne(type){
  const def = FOES[type];
  if(!def) return;
  const oo = OOS[G.curOO];
  let x = 0, y = 0, ok = false, tries = 0;
  while(!ok && tries < 40){
    tries++;
    const a = rnd(0, 6.283);
    const d = rnd(oo.ring0 + 260, Math.max(oo.ring0 + 270, oo.ring1 - 100));
    x = Math.cos(a)*d; y = Math.sin(a)*d;
    /* не спавниться в игроке (п. 1.6) — увеличено до 400px */
    if(Math.hypot(x - P.x, y - P.y) < 400) continue;
    /* не спавниться в зоне спавна (п. 1.6) — C.safeR уже 400px */
    if(Math.hypot(x, y) < C.safeR) continue;
    /* не спавниться в воде (для Капли — наоборот, в воде) */
    const inW = G.water ? G.water.some(w => Math.hypot(x-w.x, w.y-y) < w.r) : false;
    if(def.water && !inW) continue;
    if(!def.water && inW) continue;
    ok = true;
  }
  if(!ok) return;
  const scale = 1 + 0.07*(P.lvl-1);
  G.enemies.push({
    def:def, x:x, y:y,
    hp:def.hp*scale, maxHp:def.hp*scale,
    dmg:def.dmg*(1+0.04*(P.lvl-1)),
    r:def.r, spd:def.spd, arm:def.arm||0,
    atkCd:rnd(0,.5), flash:0, dead:false,
    /* поля ИИ */
    patrolA:rnd(0,6.283), patrolR:rnd(80,160),
    homeX:x, homeY:y,
    orbitA:rnd(0,6.283), dashT:rnd(1.5,3), dashVx:0, dashVy:0,
    healT:0, seen:false, fear:0,
    windT:0, windDir: Math.random() > .5 ? 1 : -1,
  });
  /* Капля появляется только в воде и не покидает её */
}

/* ================================================================
   ИИ ПРОТИВНИКОВ (п. 2.4)
   ============================================================ */
function updateEnemies(dt){
  const list = G.enemies;
  for(const e of list){
    if(e.dead) continue;
    e.flash = Math.max(0, e.flash - dt);
    e.atkCd -= dt;
    e.fear  = Math.max(0, e.fear - dt);
    const dx = P.x - e.x, dy = P.y - e.y;
    const d = Math.hypot(dx, dy) || 1;
    const nx = dx/d, ny = dy/d;
    let mvx = 0, mvy = 0;
    const pat = e.def.pat;
    const seesP = d < 420 && e.fear <= 0;   /* зона видимости */

    /* паттерн 1: прямолинейный преследователь */
    if(pat === 1){
      if(seesP){ mvx = nx*e.spd; mvy = ny*e.spd; }
      else{ /* лёгкое блуждание */
        e.patrolA += rnd(-1,1)*dt;
        mvx = Math.cos(e.patrolA)*e.spd*.3;
        mvy = Math.sin(e.patrolA)*e.spd*.3;
      }
    }
    /* паттерн 2: патруль — ходит по кругу у дома, при виде игрока преследует */
    else if(pat === 2){
      if(seesP){
        mvx = nx*e.spd; mvy = ny*e.spd;
      }else{
        e.patrolA += dt*.8;
        const tx = e.homeX + Math.cos(e.patrolA)*e.patrolR;
        const ty = e.homeY + Math.sin(e.patrolA)*e.patrolR;
        const pd = Math.hypot(tx-e.x, ty-e.y) || 1;
        mvx = (tx-e.x)/pd*e.spd*.6;
        mvy = (ty-e.y)/pd*e.spd*.6;
      }
    }
    /* паттерн 3: защитный страж — стоит, при виде игрока преследует */
    else if(pat === 3){
      if(seesP){ mvx = nx*e.spd; mvy = ny*e.spd; }
      else{ mvx = 0; mvy = 0; }
    }
    /* паттерн 4: хитрый — при HP<20% отступает к лекарю */
    else if(pat === 4){
      if(e.hp < e.maxHp*.2){
        const healer = list.find(function(a){
          return !a.dead && a !== e && a.def.heal; });
        if(healer){
          const hx = healer.x - e.x, hy = healer.y - e.y;
          const hd = Math.hypot(hx, hy) || 1;
          if(hd > 40){ mvx = hx/hd*e.spd; mvy = hy/hd*e.spd; }
        }else{
          /* лекаря нет — убегает от игрока в сторону */
          mvx = -ny*e.spd*.8; mvy = nx*e.spd*.8;
        }
      }else if(seesP){
        mvx = nx*e.spd*.7; mvy = ny*e.spd*.7;
      }else{
        e.patrolA += rnd(-1,1)*dt;
        mvx = Math.cos(e.patrolA)*e.spd*.3;
        mvy = Math.sin(e.patrolA)*e.spd*.3;
      }
      /* лекарь держит дистанцию и лечит союзников */
      if(e.def.heal){
        if(d < 200){ mvx = -nx*e.spd; mvy = -ny*e.spd; }
        e.healT -= dt;
        if(e.healT <= 0){
          e.healT = .5;
          for(const a of list){
            if(a.dead || a === e) continue;
            if(Math.hypot(a.x-e.x, a.y-e.y) < 150 && a.hp < a.maxHp){
              a.hp = Math.min(a.maxHp, a.hp + e.def.heal*.5);
              if(Math.random() < .4) G.particles.push({
                x:a.x, y:a.y-8, vx:0, vy:-30,
                life:.5, col:'#7ee081', sz:2, glow:true});
            }
          }
        }
      }
    }
    /* паттерн 5: наблюдатель — держит дистанцию, не даёт скрытности */
    else if(pat === 5){
      e.seen = d < 420;
      if(d < 220){ mvx = -nx*e.spd; mvy = -ny*e.spd; }
      else if(d > 280){ mvx = nx*e.spd*.8; mvy = ny*e.spd*.8; }
      else{ mvx = ny*e.spd*.5; mvy = -nx*e.spd*.5; }
      /* наблюдатель блокирует скрытность игрока (п. 2.4) */
      if(e.seen && P.hidden) P.hidden = false;
    }
    /* паттерн 6: мирный — не атакует, при уроне убегает */
    else if(pat === 6){
      if(e.hp < e.maxHp){ /* получил урон — убегает */
        mvx = -nx*e.spd; mvy = -ny*e.spd;
      }else{
        e.patrolA += rnd(-.5,.5)*dt;
        mvx = Math.cos(e.patrolA)*e.spd*.4;
        mvy = Math.sin(e.patrolA)*e.spd*.4;
      }
    }

    /* страх (от эволюции «Кошмарная ниша») — отступление */
    if(e.fear > 0 && !e.def.heal){
      mvx = -nx*e.spd; mvy = -ny*e.spd;
    }

    /* Ураган: вращение вокруг себя (эффект «Смещение») */
    if(e.def.wind && d < e.def.wind + C.pR){
      e.windT += dt;
      const ang = Math.atan2(P.y - e.y, P.x - e.x) + e.windDir*dt*3;
      const pull = Math.max(30, d - 20*dt);
      P.x = e.x + Math.cos(ang)*pull;
      P.y = e.y + Math.sin(ang)*pull;
      if(e.windT > 3){ /* выброс через 3 сек */
        e.windT = 0;
        P.x = e.x + Math.cos(ang)*(e.def.wind + C.pR + 30);
        P.y = e.y + Math.sin(ang)*(e.def.wind + C.pR + 30);
      }
    }

    /* движение */
    e.x += mvx*dt; e.y += mvy*dt;

    /* не выходить за ОО */
    const cd = Math.hypot(e.x, e.y);
    const oo = OOS[G.curOO];
    if(cd < oo.ring0 + e.r) { const a2=Math.atan2(e.y,e.x);
      e.x = Math.cos(a2)*(oo.ring0+e.r); e.y = Math.sin(a2)*(oo.ring0+e.r); }
    if(cd > oo.ring1 - e.r) { const a2=Math.atan2(e.y,e.x);
      e.x = Math.cos(a2)*(oo.ring1-e.r); e.y = Math.sin(a2)*(oo.ring1-e.r); }
    /* не заходить в зону спавна (п. 1.6) */
    if(cd < C.safeR + e.r){
      e.x = e.x/cd*(C.safeR + e.r + 2);
      e.y = e.y/cd*(C.safeR + e.r + 2);
    }

    /* топтание декоративных цветов (раздел 10) */
    if(G.deco) for(const f of G.deco){
      if(f.state === 0 && Math.hypot(f.x-e.x, f.y-e.y) < e.r + f.r) trample(f);
    }

    /* атака игрока (мирные не атакуют) */
    if(pat !== 6 && d < C.pR + e.r + 5 && e.atkCd <= 0 && e.def.dmg > 0){
      e.atkCd = e.def.atk;
      hitPlayer(e.dmg, e);
    }
  }
  G.enemies = list.filter(function(e){ return !e.dead; });
}

/* Топтание декоративного цветка (становится серым, потом вырастет снова) */
function trample(f){
  f.state = 1; f.grayT = 5;
}

/* Чекпоинт: файл 10 загружен */
__sdAdvance(10);
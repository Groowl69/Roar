/* ============================================================
   11-terrain.js  ·  файл 14/16
   Генерация ландшафта четырёх первичных ОО (раздел 10 диздока):
   флора, вода, камни, атрибуты. Заполняет G.terrain и алиасы
   G.deco / G.xpPts / G.garden для 08-state.js и 10-enemies.js.
   Отрисовкой занимается 12-render.js.
   Зависит от 01-config (C), 02-utils (rnd).
   ============================================================ */

// ---------- СТРУКТУРА ДАННЫХ ЛАНДШАФТА ----------
function newTerrain(){
  return {
    oo: 0,              // индекс текущей ОО
    ring0: 0,           // внутренняя граница кольца
    ring1: C.oo1R,      // внешняя граница кольца
    rocks: [],          // камни {x,y,r,verts[]} — непроходимы
    bushes: [],         // кусты {x,y,r} — скрытность, тень ОТ
    trees: [],          // деревья {x,y,cr,tr} — крона и ствол
    flowers: [],        // декор. цветы {x,y,r,col,state,grayT,ph}
    xpPoints: [],       // точки опыта {x,y,r,taken,type,xp}
    rivers: [],         // реки {pts[],width,speed,ring}
    lakes: [],          // озёра {x,y,r}
    lilies: [],         // кувшинки {x,y,r,sunk,timer,lake}
    springs: [],        // ключи {x,y,hidden}
    puddles: [],        // лужи грязи {x,y,r} — 70% замедление
    hills: [],          // холмы {x,y,r,lvl} — уровень высоты
    bamboo: [],         // бамбук {x,y,r,hp,state,growT}
    mountains: [],      // горы {x,y,r,peak,paths[]}
    canyons: [],        // каньоны {x1,y1,x2,y2,width,isKet}
    ores: [],           // руды в камнях {x,y,r,col}
    garden: null,       // атрибут «Райский сад» (1 ОО)
    oldKey: null,       // атрибут «Ветхий ключ» (2 ОО)
    hiddenArt: null,    // атрибут «Сокрытый артефакт» (3 ОО)
    ketCanyon: null     // атрибут «Каньон Кета» (4 ОО)
  };
}

// ---------- ГЕОМЕТРИЯ: точки в кольце и проверки ----------
function randInRing(ring0, ring1){
  const a = Math.random() * 6.283;
  const d = ring0 + Math.sqrt(Math.random()) * (ring1 - ring0);
  return { x: Math.cos(a) * d, y: Math.sin(a) * d };
}
function within(x, y, cx, cy, r){
  const dx = x - cx, dy = y - cy;
  return dx*dx + dy*dy <= r*r;
}
function collidesAny(x, y, list, pad){
  pad = pad || 0;
  for(const o of list){
    if(within(x, y, o.x, o.y, (o.r || 0) + pad)) return true;
  }
  return false;
}
function distToSegment(px, py, x1, y1, x2, y2){
  const dx = x2 - x1, dy = y2 - y1;
  const len2 = dx*dx + dy*dy;
  if(len2 === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * dx + (py - y1) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const cx = x1 + t * dx, cy = y1 + t * dy;
  return Math.hypot(px - cx, py - cy);
}

// ---------- КАМНИ (все ОО) — непроходимы, неправильная форма ----------
// Rmin = 5, Rmax = 70 (раздел 10)
function makeRockVerts(x, y, r){
  const n = 7 + Math.floor(Math.random() * 4);   // 7–10 вершин
  const verts = [];
  for(let i = 0; i < n; i++){
    const a = (i / n) * 6.283;
    const rr = r * (0.6 + Math.random() * 0.4);
    verts.push({ x: x + Math.cos(a) * rr, y: y + Math.sin(a) * rr });
  }
  return verts;
}
function genRocks(g, count){
  for(let i = 0; i < count; i++){
    const p = randInRing(g.ring0 + 90, g.ring1 - 90);
    const r = rnd(5, 70);
    if(collidesAny(p.x, p.y, g.rocks, r + 20)){ i--; continue; }
    g.rocks.push({ x: p.x, y: p.y, r: r, verts: makeRockVerts(p.x, p.y, r) });
  }
}
// Камни со вкраплениями руд (4 ОО)
function genRocksWithOre(g, count){
  const oreCols = ['#ffd700','#b87333','#c0c0c0','#2ecc71',
                   '#e74c3c','#7f8c8d','#b9f2ff'];
  genRocks(g, count);
  for(const rock of g.rocks){
    if(Math.random() < 0.4){
      const col = oreCols[Math.floor(Math.random() * oreCols.length)];
      const n = 2 + Math.floor(Math.random() * 3);
      for(let k = 0; k < n; k++){
        const a = Math.random() * 6.283;
        const d = Math.random() * rock.r * 0.6;
        g.ores.push({
          x: rock.x + Math.cos(a) * d,
          y: rock.y + Math.sin(a) * d,
          r: rnd(2, 4), col: col
        });
      }
    }
  }
}

// ---------- КУСТЫ (1 и 2 ОО) — скрытность, тень ОТ. R 20–50 ----------
function genBushes(g, count){
  let placed = 0, guard = 0;
  while(placed < count && guard < 500){
    guard++;
    const p = randInRing(g.ring0 + 70, g.ring1 - 70);
    const r = rnd(20, 50);
    if(collidesAny(p.x, p.y, g.rocks, r + 10)) continue;
    if(collidesAny(p.x, p.y, g.bushes, 30)) continue;
    g.bushes.push({ x: p.x, y: p.y, r: r });
    placed++;
  }
}
// Скопление кустов: несколько кустов рядом
function genBushCluster(g){
  const p = randInRing(g.ring0 + 120, g.ring1 - 120);
  const n = 3 + Math.floor(Math.random() * 3);
  for(let i = 0; i < n; i++){
    const a = Math.random() * 6.283;
    const d = Math.random() * 60;
    const r = rnd(20, 50);
    g.bushes.push({ x: p.x + Math.cos(a)*d, y: p.y + Math.sin(a)*d, r: r });
  }
}

// ---------- ДЕРЕВЬЯ (1, 2, 3 ОО) — крона R 50–70, ствол 10–17 ----------
function genTrees(g, count){
  let placed = 0, guard = 0;
  while(placed < count && guard < 500){
    guard++;
    const p = randInRing(g.ring0 + 100, g.ring1 - 100);
    const cr = rnd(50, 70);
    const tr = rnd(10, 17);
    if(collidesAny(p.x, p.y, g.rocks, cr)) continue;
    if(collidesAny(p.x, p.y, g.trees, cr * 0.6)) continue;
    g.trees.push({ x: p.x, y: p.y, cr: cr, tr: tr });
    placed++;
  }
}

// ---------- ДЕКОРАТИВНЫЕ ЦВЕТЫ (1 ОО) — топчутся, R 5–12 ----------
function pickFlower(rfn){
  const v = rfn();
  if(v < .3) return '#ffc9d6';
  if(v < .55) return '#ffe9a8';
  if(v < .8) return '#cfe6ff';
  return '#e8d6ff';
}
function genFlowers(g, count){
  for(let i = 0; i < count; i++){
    const a = Math.random() * 6.283;
    const d = Math.sqrt(Math.random()) * (g.ring1 - 60);
    const x = Math.cos(a) * d, y = Math.sin(a) * d;
    const r = 5 + Math.random() * 7;
    if(collidesAny(x, y, g.rocks, r + 5)){ i--; continue; }
    g.flowers.push({
      x: x, y: y, r: r, col: pickFlower(Math.random),
      state: 0, grayT: 0, ph: Math.random() * 6
    });
  }
}

// ---------- ТОЧКИ ОПЫТА (все ОО) — п. 1.9 ----------
// ОО-1 ромашки (+25), ОО-2 камушки (+40), ОО-3 грибы (+60),
// ОО-4 алмазы (+90, добываются ударом)
function genXpPoints(g, count, type, xp){
  let placed = 0, guard = 0;
  while(placed < count && guard < 800){
    guard++;
    const p = randInRing(g.ring0 + 120, g.ring1 - 120);
    // не в камнях, не в воде, не в кустах
    if(collidesAny(p.x, p.y, g.rocks, 30)) continue;
    if(isInWaterXY(g, p.x, p.y)) continue;
    if(collidesAny(p.x, p.y, g.bushes, 20)) continue;
    g.xpPoints.push({ x: p.x, y: p.y, r: 10, taken: false, type: type, xp: xp });
    placed++;
  }
}

// ---------- ВОДА (2 ОО) — реки и озёра («Речные луга») ----------
function genWater(g){
  const rivers = [];
  const ringMid = (g.ring0 + g.ring1) / 2;
  // 1) Кольцевая река в центре ОО
  rivers.push({
    ring: true, r: ringMid,
    width: rnd(50, 150), speed: rnd(50, 400), pts: []
  });
  // 2) Озёра: 2–3 в пределах ОО
  const lakeCount = 2 + Math.floor(Math.random() * 2);
  for(let i = 0; i < lakeCount; i++){
    const p = randInRing(g.ring0 + 250, g.ring1 - 250);
    const r = rnd(150, 300);
    if(collidesAny(p.x, p.y, g.lakes, r + 100)){ i--; continue; }
    g.lakes.push({ x: p.x, y: p.y, r: r });
  }
  // 3) Ключи (источники рек). Один прячем за кустами (атрибут).
  const springCount = 6;
  for(let i = 0; i < springCount; i++){
    const p = randInRing(g.ring0 + 200, g.ring1 - 200);
    g.springs.push({ x: p.x, y: p.y, hidden: false });
  }
  if(g.springs.length > 0){
    const hiddenIdx = Math.floor(Math.random() * g.springs.length);
    g.springs[hiddenIdx].hidden = true;
    const hs = g.springs[hiddenIdx];
    // обсаживаем скрытый ключ кустами
    for(let k = 0; k < 3; k++){
      const a = Math.random() * 6.283;
      const d = rnd(40, 80);
      g.bushes.push({
        x: hs.x + Math.cos(a)*d, y: hs.y + Math.sin(a)*d, r: rnd(20, 50)
      });
    }
    g.oldKey = { x: hs.x, y: hs.y, visited: false };
  }
  // 4) Прочие реки: полилинии от ключей к озёрам/краю
  const n = 6 + Math.floor(Math.random() * 3);
  for(let i = 0; i < n; i++){
    const spring = g.springs[i % g.springs.length];
    let target = null;
    if(g.lakes.length > 0){
      target = g.lakes[Math.floor(Math.random() * g.lakes.length)];
    } else {
      const ta = Math.random() * 6.283;
      target = {
        x: Math.cos(ta) * (g.ring1 - 100),
        y: Math.sin(ta) * (g.ring1 - 100)
      };
    }
    const pts = makeRiverPath(spring, target);
    rivers.push({ ring: false, width: rnd(50,150), speed: rnd(50,400), pts: pts });
  }
  g.rivers = rivers;
  // 5) Кувшинки в озёрах (R 5–20, можно ходить, тонут от удара)
  for(const lake of g.lakes){
    const ln = 3 + Math.floor(Math.random() * 4);
    for(let i = 0; i < ln; i++){
      const a = Math.random() * 6.283;
      const d = Math.random() * lake.r * 0.8;
      g.lilies.push({
        x: lake.x + Math.cos(a)*d, y: lake.y + Math.sin(a)*d,
        r: rnd(5, 20), sunk: false, timer: 0, lake: lake
      });
    }
  }
}
function makeRiverPath(from, to){
  const pts = [];
  const segs = 6 + Math.floor(Math.random() * 5);
  for(let i = 0; i <= segs; i++){
    const t = i / segs;
    const x = from.x + (to.x - from.x) * t;
    const y = from.y + (to.y - from.y) * t;
    const dx = to.x - from.x, dy = to.y - from.y;
    const len = Math.hypot(dx, dy) || 1;
    const px = -dy / len, py = dx / len;
    const off = (i === 0 || i === segs) ? 0 : rnd(-60, 60);
    pts.push({ x: x + px * off, y: y + py * off });
  }
  return pts;
}
// Проверка: точка в воде (озеро или река)
function isInWaterXY(g, x, y){
  for(const l of g.lakes){ if(within(x, y, l.x, l.y, l.r)) return true; }
  for(const riv of g.rivers){
    if(riv.ring){
      const d = Math.hypot(x, y);
      if(Math.abs(d - riv.r) <= riv.width / 2) return true;
    } else {
      for(const p of riv.pts){
        if(within(x, y, p.x, p.y, riv.width / 2)) return true;
      }
    }
  }
  return false;
}

// ---------- ЛУЖИ ГРЯЗИ (3 ОО) — 70% замедление, R 70–220 ----------
function genPuddles(g, count){
  let placed = 0, guard = 0;
  while(placed < count && guard < 500){
    guard++;
    const p = randInRing(g.ring0 + 150, g.ring1 - 150);
    const r = rnd(70, 220);
    if(collidesAny(p.x, p.y, g.puddles, r + 40)) continue;
    if(collidesAny(p.x, p.y, g.rocks, r)) continue;
    g.puddles.push({ x: p.x, y: p.y, r: r });
    placed++;
  }
}

// ---------- ХОЛМЫ (3 ОО) — чередование подъёмов и низин ----------
// Уровни высоты: низина 100%, В1 125%, В2 150%, В3 175%, В4 200%
function genHills(g, count){
  let placed = 0, guard = 0;
  while(placed < count && guard < 500){
    guard++;
    const p = randInRing(g.ring0 + 200, g.ring1 - 200);
    const r = rnd(120, 260);
    const lvl = 2 + Math.floor(Math.random() * 2);   // В2 или В3
    if(collidesAny(p.x, p.y, g.hills, r * 0.5)) continue;
    g.hills.push({ x: p.x, y: p.y, r: r, lvl: lvl });
    placed++;
  }
}

// ---------- БАМБУКОВЫЙ ЛЕС (3 ОО) — «ОТ», ломается за 2–3 удара ----------
// R = 7, 50–100 стволов в радиусе 500. Только в низинах.
function genBamboo(g){
  const groves = 2 + Math.floor(Math.random() * 2);
  for(let i = 0; i < groves; i++){
    const center = randInRing(g.ring0 + 250, g.ring1 - 250);
    const n = 50 + Math.floor(Math.random() * 51);
    for(let k = 0; k < n; k++){
      const a = Math.random() * 6.283;
      const d = Math.sqrt(Math.random()) * 500;
      g.bamboo.push({
        x: center.x + Math.cos(a)*d,
        y: center.y + Math.sin(a)*d,
        r: 7, hp: 2 + Math.floor(Math.random() * 2),
        state: 0, growT: 0
      });
    }
  }
  // Атрибут «Сокрытый артефакт»: бамбуковое кольцо с артефактом
  const artCenter = randInRing(g.ring0 + 300, g.ring1 - 300);
  const ringR = 120;
  const bn = 40;
  for(let k = 0; k < bn; k++){
    const a = (k / bn) * 6.283;
    g.bamboo.push({
      x: artCenter.x + Math.cos(a)*ringR,
      y: artCenter.y + Math.sin(a)*ringR,
      r: 7, hp: 2 + Math.floor(Math.random() * 2),
      state: 0, growT: 0
    });
  }
  const roll = Math.random() * 100;
  let rarity = 'common';
  if(roll >= 99) rarity = 'ancient';
  else if(roll >= 89) rarity = 'special';
  else if(roll >= 60) rarity = 'rare';
  g.hiddenArt = {
    x: artCenter.x, y: artCenter.y, rarity: rarity,
    taken: false, spawned: false
  };
}

// ---------- ГОРЫ и КАНЬОНЫ (4 ОО, «Железные горы») ----------
function genMountains(g, count){
  let placed = 0, guard = 0;
  while(placed < count && guard < 500){
    guard++;
    const p = randInRing(g.ring0 + 300, g.ring1 - 300);
    const r = rnd(180, 380);
    if(collidesAny(p.x, p.y, g.mountains, r * 0.7)) continue;
    const pathCount = 1 + Math.floor(Math.random() * 3);
    const paths = [];
    for(let k = 0; k < pathCount; k++){
      const a = Math.random() * 6.283;
      paths.push({ angle: a, width: rnd(30, 50) });
    }
    g.mountains.push({ x: p.x, y: p.y, r: r, peak: r * 0.4, paths: paths });
    placed++;
  }
}
function genCanyons(g, count){
  for(let i = 0; i < count; i++){
    const p = randInRing(g.ring0 + 250, g.ring1 - 250);
    const len = rnd(200, 500);
    const width = rnd(30, 70);
    const angle = Math.random() * 6.283;
    const x2 = p.x + Math.cos(angle) * len;
    const y2 = p.y + Math.sin(angle) * len;
    g.canyons.push({
      x1: p.x, y1: p.y, x2: x2, y2: y2,
      width: width, isKet: false
    });
  }
  // Атрибут «Каньон Кета»: один каньон с верёвкой
  const kp = randInRing(g.ring0 + 300, g.ring1 - 300);
  const klen = rnd(300, 500);
  const kang = Math.random() * 6.283;
  g.ketCanyon = {
    x1: kp.x, y1: kp.y,
    x2: kp.x + Math.cos(kang)*klen, y2: kp.y + Math.sin(kang)*klen,
    width: rnd(40, 70), isKet: true, descended: false
  };
  g.canyons.push(g.ketCanyon);
}

// ---------- АТРИБУТ «РАЙСКИЙ САД» (1 ОО) ----------
// Кольцо цветов (60 px) вокруг мраморного круга (R 120–140),
// в центре пруд 80 px. Совместимо с G.garden из state.js/enemies.js
function genGarden(g){
  const p = randInRing(g.ring0 + 500, g.ring1 - 200);
  const marbleR = rnd(120, 140);
  const pondR = 80;
  const flowerThick = 60;
  const flowers = [];
  const fn = 90;
  for(let i = 0; i < fn; i++){
    const a = Math.random() * 6.283;
    const d = marbleR + Math.random() * flowerThick;
    flowers.push({
      x: p.x + Math.cos(a)*d, y: p.y + Math.sin(a)*d,
      r: rnd(5, 12), col: pickFlower(Math.random),
      state: 0, grayT: 0, ph: Math.random() * 6
    });
  }
  g.garden = {
    x: p.x, y: p.y,
    r2: marbleR + flowerThick,   // внешний радиус (для совместимости)
    r1: marbleR,                 // радиус мраморного круга
    marbleR: marbleR, pondR: pondR,
    flowerThick: flowerThick,
    flowers: flowers,
    visited: false,
    pillarCd: 0,
    pillars: []
  };
}

// ---------- ГЛАВНАЯ ФУНКЦИЯ ГЕНЕРАЦИИ ОО ----------
// Вызывается из 08-state.js (initFlora) и при переходе между ОО.
// Заполняет G.terrain и алиасы G.deco / G.xpPts / G.garden
function generateOO(ooIndex){
  const g = newTerrain();
  g.oo = ooIndex;
  g.ring0 = ooIndex === 0 ? 0 : C.oo1R * ooIndex;
  g.ring1 = C.oo1R * (ooIndex + 1);
  if(ooIndex === 0){
    // ОО-1 «Ромашковые поля»
    genRocks(g, 12);
    genBushes(g, 10 + Math.floor(Math.random() * 11));
    genBushCluster(g);
    genTrees(g, 14);
    genFlowers(g, 120);
    genXpPoints(g, C.xpCount, 'daisy', C.xpPer);
    genGarden(g);
  } else if(ooIndex === 1){
    // ОО-2 «Речные луга»
    genWater(g);
    genRocks(g, 16);
    genBushes(g, 10 + Math.floor(Math.random() * 11));
    genBushCluster(g);
    genTrees(g, 16);
    genXpPoints(g, C.xpCount, 'pebble', 40);
  } else if(ooIndex === 2){
    // ОО-3 «Холмы»
    genPuddles(g, 5);
    genHills(g, 6);
    genBamboo(g);
    genRocks(g, 14);
    genTrees(g, 12);
    genXpPoints(g, C.xpCount, 'shroom', 60);
  } else if(ooIndex === 3){
    // ОО-4 «Железные горы»
    genMountains(g, 4);
    genCanyons(g, 4);
    genRocksWithOre(g, 18);
    genXpPoints(g, C.xpCount, 'gem', 90);
  }
  // Сохраняем в G.terrain
  G.terrain = g;
  // Алиасы для совместимости с 08-state.js и 10-enemies.js
  G.deco = g.flowers;
  G.xpPts = g.xpPoints;
  G.garden = g.garden;
  return g;
}
// Обёртка для 08-state.js (startRun вызывает initFlora)
function initWorld(){
  return generateOO(0);
}

// ---------- ПРОВЕРКИ ЛАНДШАФТА (используются в 08-state и 12-render) ----------
function isWalkable(g, x, y){
  for(const r of g.rocks){
    if(within(x, y, r.x, r.y, r.r * 0.8)) return false;
  }
  for(const m of g.mountains){
    const d = Math.hypot(x - m.x, y - m.y);
    if(d < m.r * 0.85){
      let onPath = false;
      const ang = Math.atan2(y - m.y, x - m.x);
      for(const p of m.paths){
        let da = Math.abs(ang - p.angle);
        if(da > Math.PI) da = 6.283 - da;
        if(da < 0.4){ onPath = true; break; }
      }
      if(!onPath) return false;
    }
  }
  for(const cn of g.canyons){
    if(distToSegment(x, y, cn.x1, cn.y1, cn.x2, cn.y2) < cn.width / 2) return false;
  }
  return true;
}
function isInWater(g, x, y){ return isInWaterXY(g, x, y); }
function isInPuddle(g, x, y){
  for(const p of g.puddles){ if(within(x, y, p.x, p.y, p.r)) return true; }
  return false;
}
function isInBush(g, x, y){
  for(const b of g.bushes){ if(within(x, y, b.x, b.y, b.r * 0.8)) return true; }
  return false;
}
function isUnderTree(g, x, y){
  for(const t of g.trees){ if(within(x, y, t.x, t.y, t.cr)) return true; }
  return false;
}
function hillLevel(g, x, y){
  let lvl = 0;
  for(const h of g.hills){
    if(within(x, y, h.x, h.y, h.r)) lvl = Math.max(lvl, h.lvl);
  }
  return lvl;
}
function isInBamboo(g, x, y){
  for(const b of g.bamboo){
    if(b.state === 0 && within(x, y, b.x, b.y, b.r + 4)) return true;
  }
  return false;
}

// ---------- ЛОГИКА ЛАНДШАФТА (обновление каждый кадр из 08-state.update) ----------
function updateTerrain(dt){
  const g = G.terrain;
  if(!g) return;
  // декоративные цветы: серые → вырастают заново через 5 сек
  for(const f of g.flowers){
    if(f.state === 1){
      f.grayT -= dt;
      if(f.grayT <= 0){
        const a = rnd(0, 6.283);
        const d = Math.sqrt(Math.random()) * (g.ring1 - 80);
        f.x = Math.cos(a) * d; f.y = Math.sin(a) * d;
        f.col = pickFlower(Math.random);
        f.state = 0;
      }
    }
  }
  // кувшинки: утонувшие всплывают через 30 сек в том же озере
  for(const l of g.lilies){
    if(l.sunk){
      l.timer -= dt;
      if(l.timer <= 0){
        l.sunk = false;
        const lake = l.lake;
        const a = Math.random() * 6.283;
        const d = Math.random() * lake.r * 0.8;
        l.x = lake.x + Math.cos(a)*d;
        l.y = lake.y + Math.sin(a)*d;
      }
    }
  }
  // бамбук: сломанный растёт обратно через 60 сек
  for(const b of g.bamboo){
    if(b.state === 1){
      b.growT -= dt;
      if(b.growT <= 0){
        b.state = 0;
        b.hp = 2 + Math.floor(Math.random() * 2);
      }
    }
  }
  // столбы света в Райском саду
  if(g.garden) updateGarden(dt);
}
// Атрибут «Райский сад»: столбы света по врагам (100 DMG/сек)
function updateGarden(dt){
  const gd = G.terrain.garden;
  if(!gd) return;
  G.pillCd -= dt;
  const pd = Math.hypot(P.x - gd.x, P.y - gd.y);
  if(!G.gardenSeen && pd < gd.r2){
    G.gardenSeen = true;
    if(curAch().indexOf('garden') < 0){
      curAch().push('garden'); persist();
      achToast('Достижение: «Дивный сад»');
      SFX.ach();
    }
  }
  if(G.pillCd <= 0){
    G.pillCd = C.pillarCd;
    for(const e of G.enemies){
      if(e.dead) continue;
      if(Math.hypot(e.x - gd.x, e.y - gd.y) < gd.r2 + e.r){
        G.pillars.push({ x: e.x, y: e.y, t: C.pillarDur });
        damageEnemy(e, C.pillarDmg, true);
        if(e.hp <= 0 && !e.dead) killEnemy(e, true);
        SFX.pillar();
      }
    }
  }
  for(const p of G.pillars) p.t -= dt;
  G.pillars = G.pillars.filter(function(p){ return p.t > 0; });
  P.inPond = Math.hypot(P.x - gd.x, P.y - gd.y) < gd.pondR;
}
// Сбор точек опыта (вызывается из 08-state.update)
function updateXpPoints(dt){
  const g = G.terrain;
  if(!g) return;
  for(const p of g.xpPoints){
    if(p.taken) continue;
    if(p.type === 'gem') continue;   // алмазы добываются ударом
    const d = Math.hypot(p.x - P.x, p.y - P.y);
    if(d < 60) p.pull = true;
    if(p.pull){
      p.x += (P.x - p.x) * Math.min(1, dt * 7);
      p.y += (P.y - p.y) * Math.min(1, dt * 7);
    }
    if(d < C.pR + 12){
      p.taken = true;
      G.collected++;
      G.counterT = 2.5;
      addXp(p.xp);
      addFloat(p.x, p.y - 14, '+' + p.xp + ' XP', '#ffe9a8');
      SFX.pickup();
    }
  }
}
// Удар по алмазам/рубинам/изумрудам (вызывается из applyPunch)
function hitGems(){
  const g = G.terrain;
  if(!g || g.oo !== 3) return;
  for(const p of g.xpPoints){
    if(p.taken) continue;
    if(Math.hypot(p.x - P.x, p.y - P.y) < C.punchReach + C.fistR + 20){
      p.taken = true;
      G.collected++;
      G.counterT = 2.5;
      addXp(p.xp);
      addFloat(p.x, p.y - 14, '+' + p.xp + ' XP', '#b9f2ff');
      SFX.pickup();
    }
  }
}
// Удар по кувшинке (она тонет)
function hitLilies(){
  const g = G.terrain;
  if(!g) return;
  for(const l of g.lilies){
    if(l.sunk) continue;
    if(Math.hypot(l.x - P.x, l.y - P.y) < C.punchReach + C.fistR + l.r){
      l.sunk = true;
      l.timer = 30;
      SFX.pickup();
    }
  }
}
// Удар по бамбуку (ломается за 2–3 удара)
function hitBamboo(){
  const g = G.terrain;
  if(!g) return;
  for(const b of g.bamboo){
    if(b.state === 1) continue;
    if(Math.hypot(b.x - P.x, b.y - P.y) < C.punchReach + C.fistR + b.r){
      b.hp--;
      if(b.hp <= 0){
        b.state = 1;
        b.growT = 60;
      }
    }
  }
}
// Топтание цветов ландшафта игроком и врагами
function trampleFlowers(){
  const g = G.terrain;
  if(!g) return;
  for(const f of g.flowers){
    if(f.state === 0 && Math.hypot(f.x - P.x, f.y - P.y) < C.pR + f.r){
      f.state = 1; f.grayT = 5;
    }
  }
  for(const e of G.enemies){
    if(e.dead) continue;
    for(const f of g.flowers){
      if(f.state === 0 && Math.hypot(f.x - e.x, f.y - e.y) < e.r + f.r){
        f.state = 1; f.grayT = 5;
      }
    }
  }
}

/* ---------- запечённая земля (фон ОО) ---------- */
function bakeGround(){
  const S = 1250*2 + 200;
  gcv = document.createElement('canvas');
  gcv.width = S; gcv.height = S;
  const g = gcv.getContext('2d'), r = Math.random;
  const cx = S/2, cy = S/2;
  /* тёмная подложка за пределами ОО */
  g.fillStyle = '#131f16'; g.fillRect(0,0,S,S);
  /* зелёный круг ОО */
  const base = g.createRadialGradient(cx,cy,100,cx,cy,1250);
  base.addColorStop(0,'#28402a');
  base.addColorStop(.8,'#1e3322');
  base.addColorStop(1,'#16261a');
  g.fillStyle = base;
  g.beginPath(); g.arc(cx,cy,C.oo1R,0,7); g.fill();
  /* шум-крапинки */
  for(let i=0;i<9000;i++){
    const a = r()*6.283, d = Math.sqrt(r())*C.oo1R;
    const x = cx+Math.cos(a)*d, y = cy+Math.sin(a)*d;
    g.fillStyle = r() > .5
      ? 'rgba(110,160,85,' + (.04+r()*.07) + ')'
      : 'rgba(20,45,28,' + (.1+r()*.12) + ')';
    g.fillRect(x, y, 2+r()*3, 2+r()*3);
  }
  /* травинки */
  g.strokeStyle = 'rgba(140,190,100,.12)'; g.lineWidth = 1;
  for(let i=0;i<2400;i++){
    const a = r()*6.283, d = Math.sqrt(r())*C.oo1R;
    const x = cx+Math.cos(a)*d, y = cy+Math.sin(a)*d;
    g.beginPath(); g.moveTo(x,y);
    g.lineTo(x+rnd(-2,2), y-3-r()*4); g.stroke();
  }
  /* граница ОО */
  g.strokeStyle = '#0a130c'; g.lineWidth = 16;
  g.beginPath(); g.arc(cx,cy,C.oo1R,0,7); g.stroke();
  g.strokeStyle = 'rgba(255,180,84,.3)'; g.lineWidth = 3;
  g.setLineDash([20,16]);
  g.beginPath(); g.arc(cx,cy,C.oo1R-9,0,7); g.stroke();
  g.setLineDash([]);
  /* зона спавна */
  g.fillStyle = 'rgba(230,240,228,.05)';
  g.beginPath(); g.arc(cx,cy,C.safeR,0,7); g.fill();
  g.strokeStyle = 'rgba(230,240,228,.2)'; g.lineWidth = 2;
  g.setLineDash([6,9]);
  g.beginPath(); g.arc(cx,cy,C.safeR,0,7); g.stroke();
  g.setLineDash([]);
}

// Чекпоинт: файл 11 загружен
__sdAdvance(11);
/* ============================================================
   12-render.js  ·  файл 15/16
   ------------------------------------------------------------
   Отрисовка кадра: мир, ландшафт, враги, игрок, HUD, миникарта,
   радиальное меню прокачки. Зависит от 08-state (G, P, cv, ctx),
   11-terrain (G.terrain), 07-draw-hero (drawHero), 02-utils
   (clamp, rnd). Водоёмы рисуются в два прохода (песок → вода),
   чтобы вода всегда была поверх песка (п. 10, ОО-2).
   ============================================================ */
function ooCap(){
  return C.lvlCap;
}

/* ---------- утилиты цвета ---------- */
function shade(hex, p){
  const n = parseInt(hex.slice(1), 16);
  let r = (n>>16)&255, g = (n>>8)&255, b = n&255;
  const f = function(v){ return clamp(Math.round(v*(1+p)), 0, 255); };
  return 'rgb(' + f(r) + ',' + f(g) + ',' + f(b) + ')';
}

/* ---------- фактор ночи (п. 1.10) ---------- */
function nightFactor(){
  const t = G.dayT, day = C.dayLen, night = C.nightLen;
  if(t < day - 30) return 0;
  if(t < day) return (t - (day-30))/30;
  if(t < day + night - 30) return 1;
  return 1 - (t - (day+night-30))/30;
}

/* ---------- отрисовка цветка ---------- */
function drawFlower(c, x, y, r, col, glow, sway){
  const sx = sway || 0;
  if(glow){ c.shadowColor = '#ffe9a8'; c.shadowBlur = 6; }
  c.fillStyle = col;
  for(let i=0;i<6;i++){
    const a = i*Math.PI/3 + sx*.05;
    c.beginPath();
    c.arc(x + Math.cos(a)*r*.62 + sx*.3,
          y + Math.sin(a)*r*.62, r*.48, 0, 7);
    c.fill();
  }
  c.shadowBlur = 0;
  c.fillStyle = '#f5c542';
  c.beginPath(); c.arc(x + sx*.3, y, r*.36, 0, 7); c.fill();
}

/* ================================================================
   ВОДОЁМЫ: два прохода — сначала песок, потом вода.
   Вода всегда поверх песка (п. 10, ОО-2).
   ================================================================ */
function drawWater(c, w2sX, w2sY){
  const T = G.terrain;
  if(!T) return;
  /* --- проход 0: песок (дно и берега) --- */
  for(const l of T.lakes)
    drawWaterBody(c, w2sX, w2sY, l.x, l.y, l.r, 0, false);
  for(const riv of T.rivers){
    if(riv.ring){ drawRingWater(c, w2sX, w2sY, riv, 0); }
    else{
      for(const p of riv.pts)
        drawWaterBody(c, w2sX, w2sY, p.x, p.y, riv.width/2, 0, true);
    }
  }
  /* --- проход 1: вода поверх песка --- */
  for(const l of T.lakes)
    drawWaterBody(c, w2sX, w2sY, l.x, l.y, l.r, 1, false);
  for(const riv of T.rivers){
    if(riv.ring){ drawRingWater(c, w2sX, w2sY, riv, 1); }
    else{
      for(const p of riv.pts)
        drawWaterBody(c, w2sX, w2sY, p.x, p.y, riv.width/2, 1, true);
    }
  }
  /* кувшинки поверх воды */
  for(const li of T.lilies){
    if(li.sunk) continue;
    const sx = w2sX(li.x), sy = w2sY(li.y);
    if(sx < -40 || sx > cv.width+40 || sy < -40 || sy > cv.height+40) continue;
    c.fillStyle = '#2e7d4f';
    c.beginPath(); c.ellipse(sx, sy, li.r, li.r*.7, 0, 0, 7); c.fill();
    c.fillStyle = '#3fa06a';
    c.beginPath(); c.ellipse(sx-li.r*.2, sy-li.r*.15, li.r*.55, li.r*.4, 0, 0, 7); c.fill();
    /* вырез кувшинки */
    c.strokeStyle = 'rgba(61,125,166,.9)'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(sx, sy); c.lineTo(sx+li.r, sy); c.stroke();
  }
}
function drawWaterBody(c, w2sX, w2sY, x, y, r, pass, isRiver){
  const sx = w2sX(x), sy = w2sY(y);
  if(sx < -r-60 || sx > cv.width+r+60 ||
     sy < -r-60 || sy > cv.height+r+60) return;
  if(pass === 0){
    /* песок: берег (шире) + дно */
    c.fillStyle = '#c9b98a';
    c.beginPath(); c.arc(sx, sy, r+16, 0, 7); c.fill();
    c.fillStyle = '#d8c99a';
    c.beginPath(); c.arc(sx, sy, r+4, 0, 7); c.fill();
  }else{
    /* вода поверх песка */
    c.fillStyle = isRiver ? 'rgba(80,150,220,.88)' : 'rgba(61,125,166,.92)';
    c.beginPath(); c.arc(sx, sy, r, 0, 7); c.fill();
    c.fillStyle = 'rgba(170,225,255,.22)';
    c.beginPath(); c.arc(sx - r*0.25, sy - r*0.25, r*0.4, 0, 7); c.fill();
  }
}
function drawRingWater(c, w2sX, w2sY, riv, pass){
  const sx = w2sX(0), sy = w2sY(0);   /* центр арены */
  const halfW = riv.width/2;
  const outerR = riv.r + halfW;
  const innerR = Math.max(0, riv.r - halfW);
  if(pass === 0){
    c.fillStyle = '#c9b98a';
    c.beginPath();
    c.arc(sx, sy, outerR+16, 0, 7);
    c.arc(sx, sy, Math.max(0, innerR-16), 0, 7, true);
    c.fill('evenodd');
    c.fillStyle = '#d8c99a';
    c.beginPath();
    c.arc(sx, sy, outerR+4, 0, 7);
    c.arc(sx, sy, Math.max(0, innerR-4), 0, 7, true);
    c.fill('evenodd');
  }else{
    c.fillStyle = 'rgba(80,150,220,.88)';
    c.beginPath();
    c.arc(sx, sy, outerR, 0, 7);
    c.arc(sx, sy, innerR, 0, 7, true);
    c.fill('evenodd');
  }
}

/* ================================================================
   ЛАНДШАФТ: лужи, холмы, горы, камни, бамбук, каньоны, руды
   ================================================================ */
function drawTerrain(c, w2sX, w2sY){
  const T = G.terrain;
  if(!T) return;
  /* лужи грязи (ОО-3) */
  for(const pu of T.puddles){
    const sx = w2sX(pu.x), sy = w2sY(pu.y);
    if(sx < -pu.r-40 || sx > cv.width+pu.r+40 ||
       sy < -pu.r-40 || sy > cv.height+pu.r+40) continue;
    c.fillStyle = 'rgba(107,84,54,.85)';
    c.beginPath(); c.ellipse(sx, sy, pu.r, pu.r*.7, 0, 0, 7); c.fill();
    c.fillStyle = 'rgba(140,110,70,.6)';
    c.beginPath(); c.ellipse(sx-pu.r*.2, sy-pu.r*.15, pu.r*.5, pu.r*.3, 0, 0, 7); c.fill();
  }
  /* холмы (ОО-3) — пожелтение к вершине */
  for(const h of T.hills){
    const sx = w2sX(h.x), sy = w2sY(h.y);
    if(sx < -h.r-40 || sx > cv.width+h.r+40 ||
       sy < -h.r-40 || sy > cv.height+h.r+40) continue;
    const g = c.createRadialGradient(sx, sy, h.r*0.1, sx, sy, h.r);
    g.addColorStop(0, 'rgba(190,180,90,.5)');
    g.addColorStop(1, 'rgba(90,140,70,0)');
    c.fillStyle = g;
    c.beginPath(); c.arc(sx, sy, h.r, 0, 7); c.fill();
  }
  /* горы (ОО-4) */
  for(const m of T.mountains){
    const sx = w2sX(m.x), sy = w2sY(m.y);
    if(sx < -m.r-60 || sx > cv.width+m.r+60 ||
       sy < -m.r-60 || sy > cv.height+m.r+60) continue;
    const g = c.createRadialGradient(sx, sy-m.r*0.3, m.r*0.1, sx, sy, m.r);
    g.addColorStop(0, '#8a9099');
    g.addColorStop(1, '#4a5058');
    c.fillStyle = g;
    c.beginPath(); c.arc(sx, sy, m.r, 0, 7); c.fill();
    /* снежная вершина */
    c.fillStyle = 'rgba(240,245,250,.8)';
    c.beginPath(); c.arc(sx, sy-m.r*0.35, m.r*0.35, 0, 7); c.fill();
  }
  /* камни (неправильная форма через verts) */
  for(const rk of T.rocks){
    const sx = w2sX(rk.x), sy = w2sY(rk.y);
    if(sx < -rk.r-40 || sx > cv.width+rk.r+40 ||
       sy < -rk.r-40 || sy > cv.height+rk.r+40) continue;
    const g = c.createRadialGradient(sx-rk.r*0.3, sy-rk.r*0.3, rk.r*0.1, sx, sy, rk.r);
    g.addColorStop(0, '#8a9099');
    g.addColorStop(1, '#5a6068');
    c.fillStyle = g;
    c.beginPath();
    if(rk.verts && rk.verts.length){
      for(let i=0;i<rk.verts.length;i++){
        const vx = w2sX(rk.verts[i].x), vy = w2sY(rk.verts[i].y);
        if(i===0) c.moveTo(vx, vy); else c.lineTo(vx, vy);
      }
      c.closePath();
    }else{
      c.arc(sx, sy, rk.r, 0, 7);
    }
    c.fill();
    c.strokeStyle = 'rgba(0,0,0,.35)'; c.lineWidth = 2; c.stroke();
  }
  /* руды в камнях (ОО-4) */
  for(const ore of T.ores){
    const sx = w2sX(ore.x), sy = w2sY(ore.y);
    if(sx < -20 || sx > cv.width+20 || sy < -20 || sy > cv.height+20) continue;
    c.fillStyle = ore.col;
    c.beginPath(); c.arc(sx, sy, ore.r, 0, 7); c.fill();
    c.fillStyle = 'rgba(255,255,255,.5)';
    c.beginPath(); c.arc(sx-ore.r*0.3, sy-ore.r*0.3, ore.r*0.3, 0, 7); c.fill();
  }
  /* бамбук (ОО-3) */
  for(const b of T.bamboo){
    if(b.state !== 0) continue;
    const sx = w2sX(b.x), sy = w2sY(b.y);
    if(sx < -20 || sx > cv.width+20 || sy < -20 || sy > cv.height+20) continue;
    c.strokeStyle = '#4a8a4a'; c.lineWidth = b.r*1.2;
    c.beginPath(); c.moveTo(sx, sy+8); c.lineTo(sx, sy-14); c.stroke();
    c.fillStyle = '#5aa05a';
    c.beginPath(); c.arc(sx, sy-14, b.r, 0, 7); c.fill();
  }
  /* каньоны (ОО-4) */
  for(const cn of T.canyons){
    const x1 = w2sX(cn.x1), y1 = w2sY(cn.y1);
    const x2 = w2sX(cn.x2), y2 = w2sY(cn.y2);
    c.strokeStyle = '#2a2a2e'; c.lineWidth = cn.width;
    c.lineCap = 'round';
    c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
    c.lineCap = 'butt';
    c.strokeStyle = 'rgba(0,0,0,.5)'; c.lineWidth = cn.width*0.6;
    c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
  }
  /* ключи-источники (ОО-2) */
  for(const sp of T.springs){
    const sx = w2sX(sp.x), sy = w2sY(sp.y);
    if(sx < -40 || sx > cv.width+40 || sy < -40 || sy > cv.height+40) continue;
    const pulse = 0.5 + 0.5*Math.sin(G.t*4 + sp.x);
    c.fillStyle = 'rgba(160,220,255,' + (0.3+0.3*pulse) + ')';
    c.beginPath(); c.arc(sx, sy, 10+pulse*4, 0, 7); c.fill();
    c.fillStyle = '#a0d8ff';
    c.beginPath(); c.arc(sx, sy, 6, 0, 7); c.fill();
  }
}

/* ================================================================
   ФЛОРА И ТОЧКИ ОПЫТА
   ================================================================ */
function drawFlora(c, w2sX, w2sY){
  const T = G.terrain;
  if(!T) return;
  /* декоративные цветы */
  for(const f of T.flowers){
    const sx = w2sX(f.x), sy = w2sY(f.y);
    if(sx < -30 || sx > cv.width+30 || sy < -30 || sy > cv.height+30) continue;
    if(f.state === 1) drawFlower(c, sx, sy, f.r, '#6a726a', false, 0);
    else drawFlower(c, sx, sy, f.r, f.col, false, Math.sin(G.t*1.6+f.ph)*1.4);
  }
  /* точки опыта */
  for(const p of T.xpPoints){
    if(p.taken) continue;
    const sx = w2sX(p.x), sy = w2sY(p.y);
    if(sx < -40 || sx > cv.width+40 || sy < -40 || sy > cv.height+40) continue;
    const pulse = 0.5 + 0.5*Math.sin(G.t*3 + p.ph);
    c.fillStyle = 'rgba(255,233,168,' + (0.12 + 0.1*pulse) + ')';
    c.beginPath(); c.arc(sx, sy, 16 + pulse*4, 0, 7); c.fill();
    drawXpPoint(c, p.type, sx, sy + Math.sin(G.t*2+p.ph)*1.5, p.col);
  }
}
function drawXpPoint(c, type, x, y, col){
  if(type === 'daisy'){
    drawFlower(c, x, y, 8, col || '#ffffff', true, 0);
  }else if(type === 'pebble'){
    c.fillStyle = '#a0a8b0';
    c.beginPath(); c.ellipse(x, y, 9, 6, 0, 0, 7); c.fill();
    c.fillStyle = 'rgba(255,255,255,.5)';
    c.beginPath(); c.ellipse(x-3, y-2, 3, 2, 0, 0, 7); c.fill();
  }else if(type === 'shroom'){
    c.fillStyle = '#e8dcc8';
    c.fillRect(x-2, y-2, 4, 8);
    c.fillStyle = '#c8543d';
    c.beginPath(); c.arc(x, y-2, 8, Math.PI, 0); c.fill();
    c.fillStyle = '#fff';
    c.beginPath(); c.arc(x-3, y-5, 1.6, 0, 7); c.fill();
  }else if(type === 'gem'){
    c.fillStyle = '#7fd8e8';
    c.beginPath();
    c.moveTo(x, y-8); c.lineTo(x+7, y); c.lineTo(x, y+8); c.lineTo(x-7, y);
    c.closePath(); c.fill();
    c.fillStyle = 'rgba(255,255,255,.6)';
    c.beginPath(); c.moveTo(x, y-8); c.lineTo(x+4, y-2); c.lineTo(x-2, y-1);
    c.closePath(); c.fill();
  }
}

/* ================================================================
   ОТРИСОВКА ВРАГА
   ================================================================ */
function drawEnemy(c, e, w2sX, w2sY){
  const x = w2sX(e.x), y = w2sY(e.y);
  if(x < -60 || x > cv.width+60 || y < -60 || y > cv.height+60) return;
  const ang = Math.atan2(P.y - e.y, P.x - e.x);
  c.save(); c.translate(x, y);
  /* тень */
  c.fillStyle = 'rgba(0,0,0,.28)';
  c.beginPath(); c.ellipse(0, e.r*.8, e.r, e.r*.4, 0, 0, 7); c.fill();
  c.rotate(ang);
  /* тело */
  const g = c.createRadialGradient(-e.r*.3, -e.r*.3, e.r*.1, 0, 0, e.r);
  g.addColorStop(0, shade(e.def.col, .25));
  g.addColorStop(1, e.def.col);
  c.fillStyle = g;
  c.beginPath(); c.arc(0, 0, e.r, 0, 7); c.fill();
  c.strokeStyle = 'rgba(0,0,0,.4)'; c.lineWidth = 2; c.stroke();
  /* специфичные детали по типу */
  const id = e.def.id;
  if(id === 'kapustnik'){
    /* капустные листья */
    c.fillStyle = shade(e.def.col, -.3);
    for(let i=0;i<5;i++){
      c.save(); c.rotate(i*1.256 + G.t*0.5);
      c.beginPath(); c.ellipse(e.r*0.7, 0, e.r*0.4, e.r*0.25, 0, 0, 7);
      c.fill(); c.restore();
    }
  }else if(id === 'lepestok'){
    /* лепестки цветка */
    for(let i=0;i<6;i++){
      c.save(); c.rotate(i*1.047 + G.t*0.8);
      c.fillStyle = 'hsl(' + (i*60) + ',70%,65%)';
      c.beginPath(); c.ellipse(e.r*0.8, 0, e.r*0.5, e.r*0.3, 0, 0, 7);
      c.fill(); c.restore();
    }
    c.fillStyle = '#f5c542';
    c.beginPath(); c.arc(0, 0, e.r*0.5, 0, 7); c.fill();
  }else if(id === 'koren'){
    /* корешки */
    c.strokeStyle = shade(e.def.col, -.3); c.lineWidth = 3;
    for(let i=0;i<3;i++){
      c.beginPath();
      c.moveTo(-e.r*0.5, e.r*0.4);
      c.lineTo(-e.r*0.5 - 8, e.r*0.4 + 6 + i*3);
      c.stroke();
      c.beginPath();
      c.moveTo(e.r*0.5, e.r*0.4);
      c.lineTo(e.r*0.5 + 8, e.r*0.4 + 6 + i*3);
      c.stroke();
    }
  }else if(id === 'kaplya'){
    /* капля — блик */
    c.fillStyle = 'rgba(255,255,255,.4)';
    c.beginPath(); c.ellipse(-e.r*0.3, -e.r*0.3, e.r*0.3, e.r*0.2, 0, 0, 7); c.fill();
  }else if(id === 'svinka'){
    /* пятачок и хвостик */
    c.fillStyle = shade(e.def.col, .2);
    c.beginPath(); c.ellipse(e.r*0.6, 0, e.r*0.3, e.r*0.25, 0, 0, 7); c.fill();
    c.fillStyle = shade(e.def.col, -.2);
    c.beginPath(); c.arc(-e.r*0.7, 0, e.r*0.15, 0, 7); c.fill();
  }else if(id === 'uragan'){
    /* вихрь */
    c.strokeStyle = 'rgba(180,200,220,.5)'; c.lineWidth = 2;
    for(let i=0;i<3;i++){
      c.beginPath();
      c.arc(0, 0, e.r*0.5 + i*4, G.t*3 + i, G.t*3 + i + 4);
      c.stroke();
    }
  }else if(id === 'kamnevik' || id === 'skol' || id === 'skolplus'){
    /* серые каменные — кулаки */
    c.fillStyle = shade(e.def.col, -.2);
    c.beginPath(); c.arc(e.r*0.8, -e.r*0.5, e.r*0.3, 0, 7); c.fill();
    c.beginPath(); c.arc(e.r*0.8, e.r*0.5, e.r*0.3, 0, 7); c.fill();
  }else if(id === 'almaz' || id === 'rubin' || id === 'izumrud'){
    /* кристаллы — грани */
    c.strokeStyle = 'rgba(255,255,255,.5)'; c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(0, -e.r*0.7); c.lineTo(0, e.r*0.7); c.stroke();
    c.beginPath(); c.moveTo(-e.r*0.7, 0); c.lineTo(e.r*0.7, 0); c.stroke();
  }
  /* глаза (не для наблюдателя) */
  if(id !== 'watcher'){
    c.fillStyle = '#14181c';
    c.beginPath(); c.arc(e.r*.45, -e.r*.3, e.r*.16, 0, 7); c.fill();
    c.beginPath(); c.arc(e.r*.45, e.r*.3, e.r*.16, 0, 7); c.fill();
  }
  c.restore();
  /* наблюдатель — большой глаз вне поворота */
  if(e.def.id === 'watcher'){
    c.fillStyle = '#fff';
    c.beginPath(); c.arc(x, y, e.r*.55, 0, 7); c.fill();
    c.fillStyle = e.seen ? '#c33' : '#334';
    c.beginPath();
    c.arc(x + Math.cos(ang)*2, y + Math.sin(ang)*2, e.r*.26, 0, 7);
    c.fill();
    if(e.seen){
      c.fillStyle = '#ff5d5d'; c.font = 'bold 12px ' + FD;
      c.textAlign = 'center'; c.fillText('!', x, y - e.r - 8);
    }
  }
  /* вспышка урона */
  if(e.flash > 0){
    c.fillStyle = 'rgba(255,80,80,' + Math.min(.7, e.flash*5) + ')';
    c.beginPath(); c.arc(x, y, e.r+2, 0, 7); c.fill();
  }
  /* HP-бар */
  if(e.hp < e.maxHp){
    const w = Math.max(24, e.r*2), pct = clamp(e.hp/e.maxHp, 0, 1);
    c.fillStyle = 'rgba(0,0,0,.6)'; c.fillRect(x-w/2, y-e.r-12, w, 4);
    c.fillStyle = pct > .5 ? '#8fd14f' : pct > .25 ? '#ffb454' : '#ff5d5d';
    c.fillRect(x-w/2, y-e.r-12, w*pct, 4);
  }
  /* броня */
  if(e.def.arm > 0){
    c.fillStyle = '#c8d4e4'; c.font = 'bold 9px ' + FB; c.textAlign = 'center';
    c.fillText('⛨' + e.def.arm + '%', x, y - e.r - 16);
  }
}

/* ================================================================
   ГЛАВНАЯ ОТРИСОВКА КАДРА
   ================================================================ */
function draw(){
  if(!G) return;
  const c = ctx;
  c.save();
  if(G.shake > 0) c.translate(rnd(-G.shake, G.shake), rnd(-G.shake, G.shake));
  const w2sX = function(wx){ return wx - G.cam.x + cv.width/2; };
  const w2sY = function(wy){ return wy - G.cam.y + cv.height/2; };
  const ox = cv.width/2 - G.cam.x, oy = cv.height/2 - G.cam.y;
  /* 1. запечённая земля (фон ОО) */
  if(gcv) c.drawImage(gcv, ox - gcv.width/2, oy - gcv.height/2);
  /* 2. пепел от испепелённых */
  for(const a of G.ash){
    c.fillStyle = 'rgba(30,30,34,' + Math.min(.5, a.t*.08) + ')';
    c.beginPath();
    c.ellipse(w2sX(a.x), w2sY(a.y), a.r*1.1, a.r*.55, 0, 0, 7);
    c.fill();
  }
  /* 3. ландшафт (лужи, холмы, горы, камни, бамбук, каньоны, руды) */
  drawTerrain(c, w2sX, w2sY);
  /* 4. водоёмы (песок → вода → кувшинки) */
  drawWater(c, w2sX, w2sY);
  /* 5. Райский сад (атрибут ОО-1) */
  if(G.garden) drawGarden(c, w2sX, w2sY);
  /* 6. флора и точки опыта */
  drawFlora(c, w2sX, w2sY);
  /* 7. враги */
  for(const e of G.enemies) drawEnemy(c, e, w2sX, w2sY);
  /* 8. игрок */
  const psx = w2sX(P.x), psy = w2sY(P.y);
  P.sx = psx; P.sy = psy;
  drawHero(c, psx, psy, {
    face:P.face, look:P.look, punchT:P.punchT, punchFist:P.punchFist,
    punchDir:P.punchDir, walk:P.walk, blink:P.blink > 0,
    moving:Math.hypot(P.vx,P.vy)>5, moveAng:Math.atan2(P.vy,P.vx),
    block:P.block, sweat:P.sweat, flash:P.flash,
    invuln:P.invuln > 0, tt:G.t, col:'#8d96a0'});
  /* 9. частицы */
  for(const p of G.particles){
    if(p.ring){
      c.strokeStyle = p.col + (p.life*2) + ')';
      c.lineWidth = 3;
      c.beginPath(); c.arc(w2sX(p.x), w2sY(p.y), p.r, 0, 7); c.stroke();
      continue;
    }
    c.globalAlpha = clamp(p.life*2.4, 0, 1);
    if(p.glow){ c.shadowColor = p.col; c.shadowBlur = 8; }
    c.fillStyle = p.col;
    c.beginPath(); c.arc(w2sX(p.x), w2sY(p.y), p.sz, 0, 7); c.fill();
    c.shadowBlur = 0; c.globalAlpha = 1;
  }
  /* 10. всплывающие тексты */
  for(const f of G.floats){
    c.globalAlpha = clamp(f.t, 0, 1);
    c.font = (f.big ? 'bold 22px ' : 'bold 13px ') + FD;
    c.textAlign = 'center';
    c.strokeStyle = 'rgba(0,0,0,.8)'; c.lineWidth = 3;
    c.strokeText(f.txt, w2sX(f.x), w2sY(f.y));
    c.fillStyle = f.col;
    c.fillText(f.txt, w2sX(f.x), w2sY(f.y));
    c.globalAlpha = 1;
  }
  /* 11. ночь */
  const nf = nightFactor();
  if(nf > 0){
    c.fillStyle = 'rgba(8,12,30,' + (nf*0.45) + ')';
    c.fillRect(0, 0, cv.width, cv.height);
  }
  /* 12. красная пульсация при HP<15% */
  if(P.hp/P.maxHp < .15 && !G.over){
    const a = 0.18 + 0.14*Math.sin(G.t*6);
    const vg = c.createRadialGradient(
      cv.width/2, cv.height/2, cv.height*.3,
      cv.width/2, cv.height/2, cv.height*.75);
    vg.addColorStop(0, 'rgba(255,40,40,0)');
    vg.addColorStop(1, 'rgba(255,40,40,' + a + ')');
    c.fillStyle = vg; c.fillRect(0, 0, cv.width, cv.height);
  }
  c.restore();
  /* 13. HUD, миникарта, радиальное меню */
  drawHUD(c, nf);
  if(P.radOpen) drawRadial(c);
}

/* ---------- Райский сад ---------- */
function drawGarden(c, w2sX, w2sY){
  const gd = G.garden;
  const gx = w2sX(gd.x), gy = w2sY(gd.y);
  if(gx < -gd.r2-60 || gx > cv.width+gd.r2+60 ||
     gy < -gd.r2-60 || gy > cv.height+gd.r2+60) return;
  /* мраморный круг */
  c.fillStyle = '#c9d0c6';
  c.beginPath(); c.arc(gx, gy, gd.r2, 0, 7); c.fill();
  c.strokeStyle = '#a8b0a4'; c.lineWidth = 3; c.stroke();
  c.strokeStyle = 'rgba(255,255,255,.25)';
  c.beginPath(); c.arc(gx, gy, gd.r2-6, 0, 7); c.stroke();
  /* пруд (вода поверх мрамора) */
  const pw = 1 + Math.sin(G.t*2)*.04;
  c.fillStyle = '#3d7ca6';
  c.beginPath(); c.arc(gx, gy, C.pondR*pw, 0, 7); c.fill();
  c.strokeStyle = 'rgba(160,220,255,.5)'; c.lineWidth = 1.5;
  c.beginPath(); c.arc(gx, gy, C.pondR*pw*.7, 0, 7); c.stroke();
  /* кольцо цветов */
  for(const f of gd.flowers){
    const fx = gx + Math.cos(f.a)*f.d,
          fy = gy + Math.sin(f.a)*f.d + Math.sin(G.t*2+f.ph)*1.2;
    drawFlower(c, fx, fy, f.r, f.col, false, 0);
  }
  /* столбы света */
  for(const p of G.pillars){
    const px = w2sX(p.x), py = w2sY(p.y);
    const al = Math.min(1, p.t/0.4);
    const gr = c.createLinearGradient(px, py-260, px, py);
    gr.addColorStop(0, 'rgba(255,250,220,0)');
    gr.addColorStop(1, 'rgba(255,250,220,' + (0.55*al) + ')');
    c.fillStyle = gr;
    c.beginPath();
    c.moveTo(px-16, py-260); c.lineTo(px+16, py-260);
    c.lineTo(px+7, py); c.lineTo(px-7, py);
    c.closePath(); c.fill();
    c.fillStyle = 'rgba(255,250,210,' + (0.4*al) + ')';
    c.beginPath(); c.ellipse(px, py, 16, 6, 0, 0, 7); c.fill();
  }
}

/* ================================================================
   HUD (п. 4.1)
   ================================================================ */
function drawHUD(c, nf){
  /* HP: верхний центр */
  const bw = 320, bx = (cv.width-bw)/2, by = 16;
  c.fillStyle = 'rgba(10,16,11,.8)';
  rr(c, bx-8, by-8, bw+16, 40, 6); c.fill();
  c.fillStyle = '#2a382c'; c.fillRect(bx, by, bw, 14);
  const hpPct = clamp(P.hp/P.maxHp, 0, 1);
  c.fillStyle = hpPct > .3 ? '#d84a4a' : '#ff2e2e';
  c.fillRect(bx, by, bw*hpPct, 14);
  c.strokeStyle = '#0a0f0b'; c.lineWidth = 1;
  c.strokeRect(bx, by, bw, 14);
  c.fillStyle = '#e6efe4'; c.font = 'bold 10px ' + FB; c.textAlign = 'center';
  c.fillText(Math.ceil(P.hp) + ' / ' + P.maxHp, cv.width/2, by+11);
  /* прогресс уровня */
  c.fillStyle = '#2a382c'; c.fillRect(bx, by+18, bw, 6);
  const lvlCap = ooCap();
  const xpPct = P.lvl >= lvlCap ? 1 : P.xp/needXp(P.lvl);
  c.fillStyle = '#ffb454'; c.fillRect(bx, by+18, bw*xpPct, 6);
  c.fillStyle = '#ffb454'; c.font = 'bold 12px ' + FD; c.textAlign = 'left';
  c.fillText('УР. ' + P.lvl + (P.lvl >= lvlCap ? ' (МАКС ОО)' : ''), bx-6, by+38);
  c.fillStyle = '#8fa08f'; c.font = '10px ' + FB; c.textAlign = 'right';
  c.fillText(P.lvl >= lvlCap ? 'опыт заморожен' :
    (Math.floor(P.xp) + '/' + needXp(P.lvl) + ' XP'), bx+bw+6, by+38);
  /* энергия: нижний левый угол */
  const ew = 220, ex = 16, ey = cv.height-34;
  c.fillStyle = 'rgba(10,16,11,.8)';
  rr(c, ex-6, ey-18, ew+60, 42, 6); c.fill();
  c.fillStyle = '#3a3a22'; c.fillRect(ex, ey, ew, 12);
  c.fillStyle = P.sweat ? '#c89028' : '#e8c33d';
  c.fillRect(ex, ey, ew*clamp(P.en/P.maxEn, 0, 1), 12);
  c.strokeStyle = '#0a0f0b'; c.strokeRect(ex, ey, ew, 12);
  c.fillStyle = '#e8c33d'; c.font = 'bold 11px ' + FB; c.textAlign = 'left';
  c.fillText(P.en.toFixed(1) + ' / ' + P.maxEn + ' E', ex+ew+8, ey+11);
  c.fillStyle = '#8fa08f'; c.font = '10px ' + FB;
  c.fillText('ЭНЕРГИЯ', ex, ey-5);
  if(P.pts > 0){
    const pl = 0.7 + 0.3*Math.sin(G.t*5);
    c.fillStyle = 'rgba(255,180,84,' + pl + ')';
    c.font = 'bold 12px ' + FD;
    c.fillText('ОЧКИ ПРОКАЧКИ: ' + P.pts + '  (Q)', ex, ey-24);
  }
  /* миникарта: верхний левый */
  const full = !!keys['KeyM'];
  drawMinimap(c, full);
  /* день/ночь и погода: верхний правый */
  const isNight = G.dayT >= C.dayLen;
  const cyc = G.dayT;
  const mm = Math.floor(cyc/60), ss = Math.floor(cyc%60);
  c.fillStyle = 'rgba(10,16,11,.8)';
  rr(c, cv.width-176, 10, 166, 52, 6); c.fill();
  c.fillStyle = isNight ? '#cfd8ff' : '#ffd76a';
  c.beginPath(); c.arc(cv.width-156, 28, 8, 0, 7); c.fill();
  if(isNight){
    c.fillStyle = 'rgba(10,16,11,1)';
    c.beginPath(); c.arc(cv.width-152, 25, 7, 0, 7); c.fill();
  }
  c.fillStyle = '#e6efe4'; c.font = 'bold 12px ' + FB; c.textAlign = 'left';
  c.fillText((isNight ? 'Ночь' : 'День') + ' 1 · ' +
    String(mm).padStart(2,'0') + ':' + String(ss).padStart(2,'0'),
    cv.width-140, 32);
  c.fillStyle = '#8fa08f'; c.font = '11px ' + FB;
  c.fillText('Ясно · ОО-' + (G.terrain ? G.terrain.oo+1 : 1), cv.width-168, 52);
  /* эффекты */
  let effY = 70;
  const eff = [];
  if(P.block) eff.push(['БЛОК', '#6fc7d8']);
  if(P.invuln > 0) eff.push(['ЩИТ ' + P.invuln.toFixed(1) + 'с', '#ffd76a']);
  if(P.inPond) eff.push(['УТОМЛЕНИЕ', '#6fa8c8']);
  for(const e2 of eff){
    c.fillStyle = 'rgba(10,16,11,.8)';
    rr(c, cv.width-176, effY, 166, 20, 4); c.fill();
    c.fillStyle = e2[1]; c.font = 'bold 11px ' + FB;
    c.fillText(e2[0], cv.width-168, effY+14);
    effY += 24;
  }
  /* индикатор удержания "5" */
  if(G.hold5 > 0){
    const w = 280, bx2 = (cv.width-w)/2, by2 = cv.height/2 - 30;
    c.fillStyle = 'rgba(10,16,11,.92)';
    rr(c, bx2-16, by2-34, w+32, 78, 8); c.fill();
    c.strokeStyle = '#ffb454'; c.lineWidth = 1.5; c.stroke();
    c.textAlign = 'center';
    c.fillStyle = '#e6efe4'; c.font = 'bold 14px ' + FD;
    c.fillText(meta.restartSeen ? 'ПЕРЕЗАПУСК ЗАБЕГА…' :
      'Перезапустить забег? Прокачка сбросится', cv.width/2, by2-10);
    if(!meta.restartSeen){
      c.fillStyle = '#8fa08f'; c.font = '11px ' + FB;
      c.fillText('удерживайте [5] ещё ' + (3-G.hold5).toFixed(1) + ' c',
        cv.width/2, by2+6);
    }
    c.fillStyle = '#2a382c'; c.fillRect(bx2, by2+16, w, 10);
    c.fillStyle = '#ffb454';
    c.fillRect(bx2, by2+16, w*Math.min(1, G.hold5/3), 10);
  }
}

/* ---------- миникарта (п. 4.3) ---------- */
function drawMinimap(c, full){
  const size = full ? 480 : 140;
  const x0 = full ? (cv.width-size)/2 : 14,
        y0 = full ? (cv.height-size)/2 - 20 : 14;
  const pad = 6, sc = (size - pad*2)/(C.oo1R*2);
  c.fillStyle = 'rgba(8,12,9,.9)';
  rr(c, x0-4, y0-4, size+8, size+8 + (full?0:22), 6); c.fill();
  c.strokeStyle = '#000'; c.lineWidth = 3;
  c.strokeRect(x0-2, y0-2, size+4, size+4);
  const mcx = x0 + size/2, mcy = y0 + size/2;
  c.fillStyle = '#15231a';
  c.beginPath(); c.arc(mcx, mcy, C.oo1R*sc, 0, 7); c.fill();
  c.strokeStyle = '#3d4f3f'; c.lineWidth = 1.5; c.stroke();
  const mp = function(wx, wy){
    return {x: mcx + wx*sc, y: mcy + wy*sc};
  };
  /* сад */
  if(G.garden){
    const gm = mp(G.garden.x, G.garden.y);
    c.fillStyle = '#e8d6ff';
    c.beginPath(); c.arc(gm.x, gm.y, full?7:3, 0, 7); c.fill();
  }
  /* зона спавна */
  c.strokeStyle = 'rgba(230,240,228,.4)';
  c.beginPath(); c.arc(mcx, mcy, C.safeR*sc, 0, 7); c.stroke();
  /* точки опыта */
  c.fillStyle = '#ffe9a8';
  const xps = G.terrain ? G.terrain.xpPoints : G.xpPts;
  if(xps){
    for(const p of xps){
      if(p.taken) continue;
      const q = mp(p.x, p.y);
      c.fillRect(q.x-1, q.y-1, full?4:2, full?4:2);
    }
  }
  /* враги */
  c.fillStyle = '#ff5d5d';
  for(const e of G.enemies){
    const q = mp(e.x, e.y);
    c.beginPath(); c.arc(q.x, q.y, full?4:2.2, 0, 7); c.fill();
  }
  /* игрок */
  const pq = mp(P.x, P.y);
  c.fillStyle = '#fff';
  c.beginPath(); c.arc(pq.x, pq.y, full?5:3, 0, 7); c.fill();
  c.strokeStyle = '#fff';
  c.beginPath(); c.moveTo(pq.x, pq.y);
  c.lineTo(pq.x + Math.cos(P.face)*(full?12:7),
           pq.y + Math.sin(P.face)*(full?12:7));
  c.stroke();
  if(full){
    c.fillStyle = '#e6efe4'; c.font = 'bold 15px ' + FD; c.textAlign = 'center';
    c.fillText('ОО-' + (G.terrain ? G.terrain.oo+1 : 1) + ' · лимит ' +
      ooCap() + ' ур.', cv.width/2, y0 + size + 26);
  }else{
    const done = G.collected >= C.xpCount;
    c.fillStyle = done ? '#8fd14f' : '#e6efe4';
    c.font = 'bold 11px ' + FB; c.textAlign = 'left';
    c.fillText('Точки: ' + G.collected + '/' + C.xpCount, x0, y0 + size + 16);
  }
}

/* ---------- радиальное меню прокачки (п. 4.2) ---------- */
function drawRadial(c){
  const px = P.sx, py = P.sy;
  const t = Math.min(1, (G.t - P.radT)*6);
  const r0 = 66*t, r1 = 132*t;
  const n = SKILLS.length, seg = Math.PI*2/n;
  const a0 = -Math.PI/2 - seg/2;
  P.radHover = -1;
  const mdx = G.mx - px, mdy = G.my - py, md = Math.hypot(mdx, mdy);
  if(md >= r0-12 && md <= r1+28 && t > .9){
    let rel = Math.atan2(mdy, mdx) - a0;
    while(rel < 0) rel += Math.PI*2;
    while(rel >= Math.PI*2) rel -= Math.PI*2;
    P.radHover = Math.floor(rel/seg) % n;
  }
  for(let i=0;i<n;i++){
    const a = a0 + i*seg, hov = (i === P.radHover);
    const sk = SKILLS[i], lv = P.sk[sk.k];
    const maxed = lv >= sk.max, afford = P.pts >= sk.cost;
    c.beginPath();
    c.arc(px, py, r1, a, a+seg);
    c.arc(px, py, r0, a+seg, a, true);
    c.closePath();
    c.fillStyle = hov ? 'rgba(255,180,84,.3)' : 'rgba(10,16,11,.85)';
    c.fill();
    c.strokeStyle = hov ? '#ffb454' : (maxed ? '#3a4a3c' :
      (afford ? '#8fa08f' : '#4a5a4c'));
    c.lineWidth = hov ? 2.5 : 1.5;
    c.stroke();
    const mid = a + seg/2, lr = (r0+r1)/2;
    c.fillStyle = maxed ? '#5a6a5c' : (afford ? '#e6efe4' : '#7a8a7c');
    c.font = 'bold 13px ' + FD; c.textAlign = 'center';
    c.fillText(sk.short, px + Math.cos(mid)*lr, py + Math.sin(mid)*lr - 1);
    c.font = '10px ' + FB;
    c.fillText(lv + (sk.max < 90 ? '/' + sk.max : ''),
      px + Math.cos(mid)*lr, py + Math.sin(mid)*lr + 12);
  }
  c.fillStyle = 'rgba(10,16,11,.92)';
  c.beginPath(); c.arc(px, py, Math.max(1, r0-7), 0, 7); c.fill();
  c.strokeStyle = '#ffb454'; c.lineWidth = 1.5; c.stroke();
  c.fillStyle = '#ffb454'; c.font = 'bold 15px ' + FD; c.textAlign = 'center';
  c.fillText('ОЧКИ: ' + P.pts, px, py - 1);
  c.fillStyle = '#8fa08f'; c.font = '10px ' + FB;
  c.fillText('клик — улучшение', px, py + 13);
  if(P.radHover >= 0) drawSkillTip(c, SKILLS[P.radHover]);
}
function drawSkillTip(c, sk){
  const lv = P.sk[sk.k];
  const cur = sk.f(lv), nxt = sk.f(Math.min(sk.max, lv+1));
  const maxed = lv >= sk.max;
  const d = sk.fmt;
  const lines = [
    sk.n + '  [' + lv + (sk.max < 90 ? '/' + sk.max : '') + ']',
    maxed ? 'МАКСИМУМ' :
      'Сейчас: ' + cur.toFixed(d) + '  →  ' + nxt.toFixed(d),
    maxed ? '' : 'Цена: ' + sk.cost + ' очк.',
  ];
  let w = 0;
  c.font = '12px ' + FB;
  for(const l of lines) w = Math.max(w, c.measureText(l).width);
  const bw = w + 24, bh = 58;
  let bx = G.mx + 16, by = G.my + 12;
  bx = clamp(bx, 8, cv.width - bw - 8);
  by = clamp(by, 8, cv.height - bh - 8);
  c.fillStyle = 'rgba(10,16,11,.95)';
  rr(c, bx, by, bw, bh, 6); c.fill();
  c.strokeStyle = '#ffb454'; c.lineWidth = 1; c.stroke();
  c.textAlign = 'left';
  c.fillStyle = '#ffb454'; c.font = 'bold 12px ' + FB;
  c.fillText(lines[0], bx+12, by+18);
  c.fillStyle = '#e6efe4'; c.font = '12px ' + FB;
  c.fillText(lines[1], bx+12, by+34);
  c.fillStyle = '#8fa08f';
  c.fillText(lines[2], bx+12, by+49);
}

/* ================================================================
   ТОСТЫ
================================================================ */
let toastTimer = null;
function toast(msg, ms){
  const el = $('toast');
  el.textContent = msg;
  el.style.opacity = '1';
  if(toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(function(){ el.style.opacity = '0'; }, ms || 2600);
}
let achTimer = null;
function achToast(msg){
  const el = $('achToast');
  el.textContent = '✦ ' + msg;
  el.style.opacity = '1';
  if(achTimer) clearTimeout(achTimer);
  achTimer = setTimeout(function(){ el.style.opacity = '0'; }, 3500);
}

/* Чекпоинт: файл 12 загружен */
__sdAdvance(12);
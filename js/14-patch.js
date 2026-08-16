/* ============================================================
   14-patch.js · ОБЪЕДИНЁННАЯ заплатка (заменяет прежнюю версию)
   Содержит: ввод, запекание земли, дефолты конфига, защиту
   от NaN, имена врагов, переходы между ОО по E.
   Подключается ПОСЛЕ 13-boot.js.
   ============================================================ */

/* ---------- 1) Дефолты конфига ---------- */
if(typeof C !== 'undefined'){
  if(!isFinite(C.xpPer)) C.xpPer = 25;
  if(!isFinite(C.xpCount)) C.xpCount = 25;
  if(!isFinite(C.oo1R)) C.oo1R = 1250;
}

/* ---------- 2) Земля: запекание ---------- */
function bakeGround(){
  const R1 = C.oo1R || 1250;
  const S = R1*2 + 200;
  gcv = document.createElement('canvas');
  gcv.width = S; gcv.height = S;
  const g = gcv.getContext('2d');
  const cx = S/2, cy = S/2;
  g.fillStyle = '#0a130c';
  g.fillRect(0, 0, S, S);
  const grad = g.createRadialGradient(cx, cy, 100, cx, cy, R1);
  grad.addColorStop(0, '#28402a');
  grad.addColorStop(.8, '#1e3322');
  grad.addColorStop(1, '#16261a');
  g.fillStyle = grad;
  g.beginPath(); g.arc(cx, cy, R1, 0, 7); g.fill();
  for(let i=0;i<9000;i++){
    const a = Math.random()*6.283;
    const d = Math.sqrt(Math.random())*R1;
    const x = cx + Math.cos(a)*d, y = cy + Math.sin(a)*d;
    g.fillStyle = Math.random() > .5
      ? 'rgba(110,160,85,' + (.04 + Math.random()*.07) + ')'
      : 'rgba(20,45,28,' + (.1 + Math.random()*.12) + ')';
    g.fillRect(x, y, 2 + Math.random()*3, 2 + Math.random()*3);
  }
  g.strokeStyle = 'rgba(140,190,100,.12)';
  g.lineWidth = 1;
  for(let i=0;i<2400;i++){
    const a = Math.random()*6.283;
    const d = Math.sqrt(Math.random())*R1;
    const x = cx + Math.cos(a)*d, y = cy + Math.sin(a)*d;
    g.beginPath(); g.moveTo(x, y);
    g.lineTo(x + (Math.random()*4 - 2), y - 3 - Math.random()*4);
    g.stroke();
  }
  g.strokeStyle = '#0a130c'; g.lineWidth = 16;
  g.beginPath(); g.arc(cx, cy, R1, 0, 7); g.stroke();
  g.strokeStyle = 'rgba(255,180,84,.3)'; g.lineWidth = 3;
  g.setLineDash([20,16]);
  g.beginPath(); g.arc(cx, cy, R1-9, 0, 7); g.stroke();
  g.setLineDash([]);
  g.fillStyle = 'rgba(230,240,228,.05)';
  g.beginPath(); g.arc(cx, cy, C.safeR, 0, 7); g.fill();
  g.strokeStyle = 'rgba(230,240,228,.2)'; g.lineWidth = 2;
  g.setLineDash([6,9]);
  g.beginPath(); g.arc(cx, cy, C.safeR, 0, 7); g.stroke();
  g.setLineDash([]);
}
/* пекаём землю после каждого запуска забега */
(function(){
  const orig = window.startRun;
  if(orig){
    window.startRun = function(){
      const r = orig();
      bakeGround();
      return r;
    };
  }
  if(window.G){ bakeGround(); }
})();

/* ---------- 3) Защита addXp от NaN ---------- */
(function(){
  if(typeof window.addXp === 'function'){
    const orig = window.addXp;
    window.addXp = function(v){
      if(!isFinite(v)) v = 0;
      return orig(v);
    };
  }
})();

/* ---------- 4) Имена противников над головой ---------- */
function drawEnemyNames(){
  if(!window.G || curScreen !== 'game' || !G.enemies) return;
  const c = ctx;
  for(const e of G.enemies){
    if(e.dead) continue;
    const x = e.x - G.cam.x + cv.width/2;
    const y = e.y - G.cam.y + cv.height/2;
    if(x < -60 || x > cv.width+60 || y < -60 || y > cv.height+60) continue;
    const name = (e.def && (e.def.n || e.def.id)) || '';
    if(!name) continue;
    c.font = 'bold 11px ' + (typeof FB !== 'undefined' ? FB : 'sans-serif');
    c.textAlign = 'center';
    c.lineWidth = 3; c.strokeStyle = 'rgba(0,0,0,.75)';
    c.strokeText(name, x, y - e.r - 22);
    c.fillStyle = '#ffd9a0';
    c.fillText(name, x, y - e.r - 22);
  }
}
(function(){
  if(typeof window.draw === 'function'){
    const orig = window.draw;
    window.draw = function(){ orig(); drawEnemyNames(); };
  }
})();

/* ---------- 5) Ввод: клавиатура и мышь ---------- */
(function(){
  if(window.__oo78_input) return;
  window.__oo78_input = true;
  addEventListener('keydown', function(e){
    keys[e.code] = true;
    if(e.code === 'Tab') e.preventDefault();
    if(curScreen !== 'game' || !G) return;
    if(e.code === 'Escape' && !G.over){
      paused = !paused;
      $('pauseOv').classList.toggle('hidden', !paused);
    }
    if(e.code === 'Space' && G.over){
      e.preventDefault();
      restart();
    }
  });
  addEventListener('keyup', function(e){ keys[e.code] = false; });
  const cvEl = $('game');
  cvEl.addEventListener('mousemove', function(e){
    if(!G) return;
    const r = cvEl.getBoundingClientRect();
    G.mx = (e.clientX - r.left) * (cvEl.width / r.width);
    G.my = (e.clientY - r.top) * (cvEl.height / r.height);
  });
  cvEl.addEventListener('mousedown', function(e){
    if(!G || paused || G.over) return;
    if(e.button !== 0) return;
    G.mdown = true;
    if(P.radOpen){ radialClick(); return; }
    tryPunch();
  });
  cvEl.addEventListener('mouseup', function(){ if(G) G.mdown = false; });
  cvEl.addEventListener('contextmenu', function(e){ e.preventDefault(); });
})();

/* ---------- 6) Переход между ОО по клавише E ---------- */
function patchTryTransition(){
  if(!window.G || !window.P) return;
  const oo = G.curOO | 0;
  const pd = Math.hypot(P.x, P.y);
  const outer = C.oo1R * (oo+1);
  const inner = C.oo1R * oo;
  if(pd > outer-110 && oo < 3){ patchGoToOO(oo+1, true); }
  else if(oo > 0 && pd < inner+110){ patchGoToOO(oo-1, false); }
}
function patchGoToOO(n, outward){
  G.curOO = n;
  if(!G.visited) G.visited = [true,false,false,false];
  G.visited[n] = true;
  if(typeof generateOO === 'function') generateOO(n);
  const outer = C.oo1R*(n+1), inner = C.oo1R*n;
  const pd = Math.hypot(P.x, P.y) || 1;
  const nx = P.x/pd, ny = P.y/pd;
  if(outward){ P.x = nx*(inner+80); P.y = ny*(inner+80); }
  else { P.x = nx*(outer-80); P.y = ny*(outer-80); }
  P.vx = 0; P.vy = 0;
  G.enemies = []; G.respawnQ = []; 
  G.spawnT = C.firstSpawnDelay;
  /* Сброс флага первого спавна при перехоте в новую ОО */
  firstSpawnDone = false;
  G.cam.x = P.x; G.cam.y = P.y;
  if(typeof toast === 'function') toast('ОО-' + (n+1));
}
addEventListener('keydown', function(e){
  if(e.code !== 'KeyE') return;
  if(curScreen !== 'game' || !window.G || G.over || window.paused) return;
  patchTryTransition();
});

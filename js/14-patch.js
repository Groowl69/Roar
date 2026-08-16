/* ============================================================
   14-patch.js · заплатка: ввод + запекание земли
   Подключается ПОСЛЕ 13-boot.js. Добавляет то, что потерялось
   при пофайловой сборке: обработчики ввода и bakeGround.
   ============================================================ */

/* ---------- ЗЕМЛЯ: запекание фона ОО-1 ---------- */
function bakeGround(){
  const R1 = C.oo1R || C.ring || 1250;
  const S = R1*2 + 200;
  gcv = document.createElement('canvas');
  gcv.width = S; gcv.height = S;
  const g = gcv.getContext('2d');
  const cx = S/2, cy = S/2;
  /* тьма за пределами ОО */
  g.fillStyle = '#0a130c';
  g.fillRect(0, 0, S, S);
  /* трава ОО-1 */
  const grad = g.createRadialGradient(cx, cy, 100, cx, cy, R1);
  grad.addColorStop(0, '#28402a');
  grad.addColorStop(.8, '#1e3322');
  grad.addColorStop(1, '#16261a');
  g.fillStyle = grad;
  g.beginPath(); g.arc(cx, cy, R1, 0, 7); g.fill();
  /* крапинки */
  for(let i=0;i<9000;i++){
    const a = Math.random()*6.283;
    const d = Math.sqrt(Math.random())*R1;
    const x = cx + Math.cos(a)*d, y = cy + Math.sin(a)*d;
    g.fillStyle = Math.random() > .5
      ? 'rgba(110,160,85,' + (.04 + Math.random()*.07) + ')'
      : 'rgba(20,45,28,' + (.1 + Math.random()*.12) + ')';
    g.fillRect(x, y, 2 + Math.random()*3, 2 + Math.random()*3);
  }
  /* травинки */
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
  /* граница ОО */
  g.strokeStyle = '#0a130c'; g.lineWidth = 16;
  g.beginPath(); g.arc(cx, cy, R1, 0, 7); g.stroke();
  g.strokeStyle = 'rgba(255,180,84,.3)'; g.lineWidth = 3;
  g.setLineDash([20,16]);
  g.beginPath(); g.arc(cx, cy, R1-9, 0, 7); g.stroke();
  g.setLineDash([]);
  /* зона спавна */
  g.fillStyle = 'rgba(230,240,228,.05)';
  g.beginPath(); g.arc(cx, cy, C.safeR, 0, 7); g.fill();
  g.strokeStyle = 'rgba(230,240,228,.2)'; g.lineWidth = 2;
  g.setLineDash([6,9]);
  g.beginPath(); g.arc(cx, cy, C.safeR, 0, 7); g.stroke();
  g.setLineDash([]);
}

/* пекарём землю после каждого запуска забега */
(function(){
  const orig = window.startRun;
  if(orig){
    window.startRun = function(){
      const r = orig();
      bakeGround();
      return r;
    };
  }
  /* и для уже идущего забега — сразу */
  if(window.G){ bakeGround(); }
})();

/* ---------- ВВОД: клавиатура и мышь ---------- */
(function(){
  if(window.__oo78_input) return;   /* защита от двойной привязки */
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
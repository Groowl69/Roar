/* ============================================================
   05-screens.js  ·  файл 8/16
   ------------------------------------------------------------
   Экраны и навигация. Переключение между меню, выбором режима,
   каруселью персонажей, настройками и энциклопедией.
   Зависит от: 01-config (CHARS, ACH), 02-utils ($), 03-save
   (meta, slot, curAch), 04-sfx (SFX). Кнопки паузы/смерти
   привязываются позже в 08-state / 09-combat.
   ============================================================ */

/* Список id всех экранов для переключения */
const SCREENS = ['scr-menu', 'scr-mode', 'scr-chars',
                 'scr-settings', 'scr-ency', 'scr-game'];

/* Текущий экран и куда возвращаться из настроек */
let curScreen = 'scr-menu';
let setBackTo = 'menu';

/* Выбранный персонаж в карусели */
let selChar = 0;

/* Состояние счётчика стирания слота (крутится в 13-boot) */
let wipeArm = -1, wipeT = 0;

/* Показать экран по имени: menu/mode/chars/settings/ency/game */
function showScreen(name){
  SCREENS.forEach(function(id){ $(id).classList.add('hidden'); });
  $('scr-' + name).classList.remove('hidden');
  curScreen = name;
  if(name === 'menu') renderMenuStats();
  if(name === 'settings') renderSettings();
  if(name === 'ency') renderEncy();
  if(name === 'chars') renderCarousel();
}

/* ---------- главное меню ---------- */
function renderMenuStats(){
  const s = slot();
  $('menuStats').innerHTML =
    'Слот <b>' + (meta.slot + 1) + '</b> · Протагон<br>' +
    'Смертей: <b>' + s.deaths + '</b> · Убийств: <b>' + s.kills + '</b><br>' +
    'Рекорд уровня: <b>' + s.best + '</b> · Достижений: <b>' +
    s.ach.length + '/' + ACH.length + '</b>';
}

$('btnStart').onclick = function(){ SFX.click(); showScreen('mode'); };
$('btnSettings').onclick = function(){
  SFX.click(); setBackTo = 'menu'; showScreen('settings');
};
$('btnEncy').onclick = function(){ SFX.click(); showScreen('ency'); };

/* ---------- выбор режима ---------- */
$('btnModeBack').onclick = function(){ SFX.click(); showScreen('menu'); };
$('modeCampaign').onclick = function(){ SFX.click(); showScreen('chars'); };

/* ---------- карусель персонажей ---------- */
function renderCarousel(){
  const ch = CHARS[selChar];
  $('carName').textContent = ch.name;
  $('carUniq').textContent = ch.uniq;
  const st = $('carStats');
  st.innerHTML = '';
  const rows = [
    ['HP', ch.hp], ['Реген', ch.regen], ['DMG', ch.dmg],
    ['Энергия', ch.en], ['Восст.', ch.enReg],
    ['Ловкость', ch.agi + ' c'], ['Скорость', ch.spd]
  ];
  rows.forEach(function(r){
    const s = document.createElement('span');
    s.className = 'chip';
    s.textContent = r[0] + ': ' + r[1];
    st.appendChild(s);
  });
  const lk = $('carLock');
  if(ch.open){ lk.classList.add('hidden'); }
  else{
    lk.classList.remove('hidden');
    lk.textContent = '🔒 ' + ch.lock;
  }
  $('btnFight').disabled = !ch.open;
  const dots = $('carDots');
  dots.innerHTML = '';
  CHARS.forEach(function(c, i){
    const d = document.createElement('span');
    if(i === selChar) d.className = 'on';
    dots.appendChild(d);
  });
}
function carStep(d){
  selChar = (selChar + d + CHARS.length) % CHARS.length;
  SFX.click();
  renderCarousel();
}
$('btnCharBack').onclick = function(){ SFX.click(); showScreen('mode'); };
$('carL').onclick = function(){ carStep(-1); };
$('carR').onclick = function(){ carStep(1); };
/* tryStart объявлена в 08-state.js, вызывается по клику */
$('btnFight').onclick = function(){ tryStart(); };

/* ---------- настройки ---------- */
function renderSettings(){
  $('volM').value = meta.volM;
  $('volS').value = meta.volS;
  $('trapInd').checked = meta.trapInd;
  const list = $('slotList');
  list.innerHTML = '';
  meta.slots.forEach(function(s, i){
    const row = document.createElement('div');
    row.className = 'slot-row' + (i === meta.slot ? ' cur' : '');
    const g = document.createElement('div');
    g.className = 'grow';
    g.innerHTML = '<b>Слот ' + (i + 1) + '</b><br><small>Смертей: ' +
      s.deaths + ' · Убийств: ' + s.kills + ' · Рекорд: ' + s.best + '</small>';
    row.appendChild(g);
    if(i !== meta.slot){
      const b = document.createElement('button');
      b.className = 'btn small';
      b.textContent = 'Выбрать';
      b.onclick = function(){
        meta.slot = i; persist(); SFX.click(); renderSettings();
      };
      row.appendChild(b);
    }
    const w = document.createElement('button');
    w.className = 'wipe-btn';
    w.textContent = (wipeArm === i)
      ? 'Стереть… ' + Math.ceil(wipeT)
      : 'Стереть';
    if(wipeArm === i) w.classList.add('arm');
    w.onclick = function(){
      if(wipeArm === i){
        wipeSlot(i);
        wipeArm = -1;
        SFX.poof();
        renderSettings();
      } else {
        wipeArm = i; wipeT = 5;
        SFX.click();
        renderSettings();
      }
    };
    row.appendChild(w);
    list.appendChild(row);
  });
}
$('btnSetBack').onclick = function(){
  SFX.click();
  if(setBackTo === 'game'){ showScreen('game'); }
  else showScreen('menu');
};
$('volM').oninput = function(){ meta.volM = +this.value; persist(); };
$('volS').oninput = function(){ meta.volS = +this.value; persist(); };
$('trapInd').onchange = function(){ meta.trapInd = this.checked; persist(); };

/* ---------- энциклопедия ---------- */
function renderEncy(){
  const list = $('achList');
  list.innerHTML = '';
  ACH.forEach(function(a){
    const got = curAch().indexOf(a.id) >= 0;
    const row = document.createElement('div');
    row.className = 'ach-row' + (got ? '' : ' lock');
    row.innerHTML = '<span class="st">' + (got ? '✔' : '?') + '</span>' +
      '<div><b>' + a.n + '</b><br><small style="color:var(--dim)">' +
      (got ? a.d : 'Достижение ещё не открыто') + '</small></div>';
    list.appendChild(row);
  });
}
$('btnEncyBack').onclick = function(){ SFX.click(); showScreen('menu'); };

/* Чекпоинт: файл 05 загружен */
__sdAdvance(5);
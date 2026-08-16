/* ============================================================
   04-sfx.js  ·  файл 7/16
   ------------------------------------------------------------
   Звуковой синтезатор на Web Audio. Внешних аудиофайлов нет —
   все звуки собираются из осцилляторов и шумовых буферов.
   Громкость берётся из настроек meta (файл 03-save.js).
   ============================================================ */

const SFX = {
  ctx: null,

  /* Создать AudioContext при первом действии пользователя */
  init() {
    if (!this.ctx) {
      try {
        this.ctx = new (window.AudioContext ||
                         window.webkitAudioContext)();
      } catch (e) { /* звука нет — играем молча */ }
    }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  },

  /* Итоговая громкость с учётом настроек (0..1) */
  vol() {
    return (meta.volM / 100) * (meta.volS / 100);
  },

  /* Тон с типом волны и опциональным скольжением частоты */
  tone(f, dur, type, vol, slide) {
    if (!this.ctx) return;
    const v = vol * this.vol();
    if (v <= 0) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type || 'square';
    o.frequency.setValueAtTime(f, t);
    if (slide) {
      o.frequency.exponentialRampToValueAtTime(
        Math.max(30, f + slide), t + dur);
    }
    g.gain.setValueAtTime(v, t);
    g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(g).connect(this.ctx.destination);
    o.start(t);
    o.stop(t + dur + .02);
  },

  /* Шумовой импульс через низкочастотный фильтр (удары, шорох) */
  noise(dur, vol, freq) {
    if (!this.ctx) return;
    const v = vol * this.vol();
    if (v <= 0) return;
    const len = this.ctx.sampleRate * dur;
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    }
    const s = this.ctx.createBufferSource();
    const f = this.ctx.createBiquadFilter();
    const g = this.ctx.createGain();
    s.buffer = buf;
    f.type = 'lowpass';
    f.frequency.value = freq;
    g.gain.value = v;
    s.connect(f).connect(g).connect(this.ctx.destination);
    s.start();
  },

  /* ---------- базовые игровые звуки (из M1) ---------- */

  punch() {  /* удар игрока */
    this.noise(.08, .18, 1400);
    this.tone(180, .08, 'sine', .12, -80);
  },

  hit() {  /* попадание по противнику */
    this.tone(320, .06, 'square', .08, -120);
  },

  poof() {  /* противник повержен */
    this.noise(.2, .15, 600);
    this.tone(140, .15, 'sine', .1, -60);
  },

  pickup() {  /* подобрана точка опыта */
    this.tone(880, .07, 'square', .06);
    setTimeout(() => this.tone(1320, .1, 'square', .06), 70);
  },

  level() {  /* новый уровень */
    [523, 659, 784, 1046].forEach((f, i) =>
      setTimeout(() => this.tone(f, .22, 'triangle', .12), i * 110));
  },

  hurt() {  /* игрок получил урон */
    this.tone(150, .2, 'sawtooth', .14, -70);
  },

  deny() {  /* действие отклонено (мало энергии и т.п.) */
    this.tone(160, .14, 'sawtooth', .1, -60);
  },

  click() {  /* клик по элементу интерфейса */
    this.tone(300, .05, 'square', .07);
  },

  pillar() {  /* столб света в Райском саду */
    this.tone(1200, .5, 'sine', .07, -900);
  },

  death() {  /* гибель игрока */
    [330, 262, 196, 131].forEach((f, i) =>
      setTimeout(() => this.tone(f, .3, 'sawtooth', .1), i * 170));
  },

  ach() {  /* получено достижение */
    [659, 880, 1174].forEach((f, i) =>
      setTimeout(() => this.tone(f, .25, 'triangle', .11), i * 120));
  },

  /* ---------- звуки, добавленные для M2 ---------- */

  gate() {  /* переход между ОО */
    this.tone(440, .12, 'triangle', .1);
    setTimeout(() => this.tone(660, .15, 'triangle', .1), 100);
    setTimeout(() => this.tone(880, .2, 'triangle', .12), 200);
  },

  shoot() {  /* выстрел противника (пыльца, кристалл) */
    this.tone(500, .1, 'sine', .08, -300);
  },

  slam() {  /* тяжёлый удар (Камневик, Скол, Скол+) */
    this.noise(.3, .3, 250);
    this.tone(70, .25, 'sine', .2, -40);
  },

  splash() {  /* вход в воду */
    this.noise(.25, .2, 900);
    this.tone(300, .2, 'sine', .08, -150);
  },

  sink() {  /* кувшинка ушла под воду */
    this.tone(400, .3, 'sine', .08, -250);
  },

  mine() {  /* добыча руды / алмаза */
    this.noise(.1, .25, 2000);
    this.tone(700, .08, 'square', .07, -200);
  },

  crack() {  /* разрушение камня */
    this.noise(.15, .3, 1200);
    this.tone(250, .1, 'square', .08, -100);
  },
};

/* Аудиоконтекст создаётся по первому клику/касанию */
document.addEventListener('pointerdown', function() { SFX.init(); });

/* Чекпоинт: файл 04 загружен */
__sdAdvance(4);
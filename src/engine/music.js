/* ===================================================================
   engine/music.js   背景音乐（BGM）—— 全部用 WebAudio 现场合成，零素材、离线可玩
   -------------------------------------------------------------------
   为什么不用 mp3：
     1. 这个项目是「双击 index.html 就能玩」的纯静态游戏，音频文件一多，离线包就变重；
     2. 网上下载的曲子有版权问题（尤其是要发给别人玩的时候）；
     3. 现有的音效（engine/audio.js）本来就是合成的，音乐跟着一个套路最省事。

   一首曲子 = 4 小节的和弦进行 + 4 小节主旋律 + 一种鼓点风格（见下面 TRACKS）。
   想加/改曲子：直接改下面 TRACKS 里的数据就行（都是人看得懂的简谱式字符串）。

   对外接口（都用 Game.Music.xxx 调）：
     Game.Music.init()              第一次必须在「用户点过按钮」之后调（浏览器不许自动放声音）
     Game.Music.play('desert-escape')  切到某关的曲子（找不到就用 default）
     Game.Music.stop() / pause() / resume()
     Game.Music.setEnabled(false)   开 / 关背景音乐（存档里记着）
     Game.Music.current             现在在放哪首（测试用）
     Game.Music.tracks              曲库（看每关配了哪首；测试用）

   想换曲子 / 加新关卡的曲子 / 想知道哪几首是什么风格：看 docs/背景音乐.md
   =================================================================== */
(function () {
  const Game = window.Game;

  /* ---------------- 基本乐理小工具 ---------------- */
  const SEMI = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };

  function freq(name) {
    const m = /^([A-G]#?)(-?\d)$/.exec(name);
    if (!m) return 0;
    const midi = (parseInt(m[2], 10) + 1) * 12 + SEMI[m[1]];
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  /* 主旋律的写法：一小节 16 个十六分音符，'.' 是空拍。 */
  const R = '.';

  /* ---------------- 鼓点风格 ---------------- */
  /* 一小节 16 步：K = 大鼓，S = 小鼓，h = 闭合踩镲，t = 小嗵鼓 */
  const DRUMS = {
    pop:    'K . h . S . h . K . h . S . h h',
    soft:   'K . . . S . . . K . . h S . . .',
    rock:   'K . h K S . h . K . h K S . h h',
    exotic: 'K . . t . K t . K . . t S . t .',
    tense:  'K h h K S h h K K h h K S h h t'
  };

  /* ---------------- 曲库 ----------------
     每首：bpm / 主旋律音色 / 4 小节和弦（和弦的第一个音自动当贝斯）/ 4 小节主旋律 / 鼓点
     每个音都写全名（例 'C5'、'F#4'），读起来就是简谱。 */
  const TRACKS = {
    /* 大厅 · 方块小镇：轻快、暖暖的，像早上出门玩 */
    'hub-square': {
      name: '方块小镇',
      bpm: 100, wave: 'triangle', drum: 'pop',
      chords: [['C3', 'E3', 'G3'], ['G2', 'B2', 'D3'], ['A2', 'C3', 'E3'], ['F2', 'A2', 'C3']],
      lead: [
        'C5 . E5 . G5 . . . E5 . C5 . . . . .',
        'D5 . G5 . B5 . . . G5 . D5 . . . . .',
        'E5 . A5 . C6 . . . A5 . E5 . . . . .',
        'F5 . A5 . C6 . . . A5 . G5 . E5 . . .'
      ]
    },
    /* 第 1 关 · 谜语森林：神秘、探头探脑 */
    'riddle-forest': {
      name: '谜语森林',
      bpm: 88, wave: 'square', drum: 'soft',
      chords: [['A2', 'C3', 'E3'], ['F2', 'A2', 'C3'], ['C3', 'E3', 'G3'], ['G2', 'B2', 'D3']],
      lead: [
        'A4 . . C5 . . E5 . . C5 . A4 . . . .',
        'F4 . . A4 . . C5 . . A4 . F4 . . . .',
        'G4 . C5 . E5 . . G5 . E5 . C5 . . . .',
        'D5 . B4 . G4 . . D5 . B4 . G4 . . . .'
      ]
    },
    /* 第 2 关 · 宝箱山谷：蹦蹦跳跳、一路找过去 */
    'chest-valley': {
      name: '宝箱山谷',
      bpm: 112, wave: 'square', drum: 'pop',
      chords: [['F2', 'A2', 'C3'], ['C3', 'E3', 'G3'], ['D3', 'F3', 'A3'], ['A#2', 'D3', 'F3']],
      lead: [
        'F5 . A5 . C6 . A5 . F5 . A5 . C6 . . .',
        'E5 . G5 . C6 . G5 . E5 . G5 . C6 . . .',
        'D5 . F5 . A5 . F5 . D5 . F5 . A5 . . .',
        'A#4 . D5 . F5 . D5 . A#4 . C5 . D5 . . .'
      ]
    },
    /* 第 3 关 · 汉字教室：安安静静、专心的感觉 */
    'hanzi-classroom': {
      name: '汉字教室',
      bpm: 76, wave: 'sine', drum: 'soft',
      chords: [['D3', 'F#3', 'A3'], ['A2', 'C#3', 'E3'], ['B2', 'D3', 'F#3'], ['G2', 'B2', 'D3']],
      lead: [
        'D5 . . F#5 . . A5 . . . F#5 . . . . .',
        '. . A4 . . C#5 . . E5 . . C#5 . . . .',
        'B4 . . D5 . . F#5 . . D5 . B4 . . . .',
        'G4 . . B4 . . D5 . . B4 . G4 . . . .'
      ]
    },
    /* 第 4 关 · 圆形擂台：紧张、热血（鼓最密） */
    'arena-battle': {
      name: '圆形擂台',
      bpm: 138, wave: 'square', drum: 'tense',
      chords: [['D3', 'F3', 'A3'], ['A#2', 'D3', 'F3'], ['F2', 'A2', 'C3'], ['A2', 'C#3', 'E3']],
      lead: [
        'D5 . D5 . F5 . D5 . A4 . . . D5 . . .',
        'A#4 . A#4 . D5 . A#4 . F4 . . . A#4 . . .',
        'F5 . E5 . D5 . C5 . A4 . . . F4 . . .',
        'E5 . . . A5 . . . C#6 . . . A5 . . .'
      ]
    },
    /* 第 5 关 · 沙漠逃亡：急促、有点异域风（手鼓感） */
    'desert-escape': {
      name: '沙漠逃亡',
      bpm: 152, wave: 'square', drum: 'exotic',
      chords: [['E3', 'G3', 'B3'], ['F3', 'A3', 'C4'], ['D3', 'F#3', 'A3'], ['E3', 'G#3', 'B3']],
      lead: [
        'E5 . . G5 . A5 . B5 . A5 . G5 . E5 . .',
        'F5 . . A5 . C6 . A5 . F5 . E5 . C5 . .',
        'D5 . . F#5 . A5 . F#5 . D5 . F#5 . A5 .',
        'G#5 . B5 . E6 . B5 . G#5 . E5 . B4 . .'
      ]
    },
    /* 第 6 关 · 踩白大草原：蹦蹦跳跳、一脚一脚踩过去（脚步感） */
    'paint-the-field': {
      name: '踩白大草原',
      bpm: 126, wave: 'triangle', drum: 'pop',
      chords: [['C3', 'E3', 'G3'], ['A2', 'C3', 'E3'], ['F2', 'A2', 'C3'], ['G2', 'B2', 'D3']],
      lead: [
        'G5 . G5 . E5 . G5 . C6 . . . G5 . . .',
        'A5 . A5 . E5 . A5 . C6 . . . A5 . . .',
        'F5 . A5 . C6 . A5 . F5 . A5 . F5 . . .',
        'G5 . B5 . D6 . B5 . G5 . D5 . G5 . . .'
      ]
    },
    /* 第 7 关 · 石头迷宫：神秘、绕来绕去，带一点点紧张（小调 + 稀一点的鼓） */
    'stone-maze': {
      name: '石头迷宫',
      bpm: 124, wave: 'square', drum: 'soft',
      chords: [['D3', 'F3', 'A3'], ['A#2', 'D3', 'F3'], ['G2', 'A#2', 'D3'], ['A2', 'C#3', 'E3']],
      lead: [
        'D5 . . F5 . A5 . . F5 . D5 . . A4 . .',
        'A#4 . . D5 . F5 . . D5 . . A#4 . F4 . .',
        'G4 . A#4 . D5 . . A#4 . G4 . D4 . . . .',
        'A4 . . C#5 . E5 . . C#5 . A4 . . E4 . .'
      ]
    },
    /* 没给某关配曲子时的兜底（现在等于大厅那首） */
    /* 第 8 关 · 风扇小屋：轻快、暖洋洋的日常感（大调 + 简单的鼓 = 拧螺丝的节奏） */
    'fan-cottage': {
      name: '风扇小屋',
      bpm: 106, wave: 'triangle', drum: 'soft',
      chords: [['F2', 'A2', 'C3'], ['D3', 'F3', 'A3'], ['A#2', 'D3', 'F3'], ['C3', 'E3', 'G3']],
      lead: [
        'F5 . A5 . C6 . . . A5 . F5 . A5 . . .',
        'D5 . F5 . A5 . . . F5 . D5 . F5 . . .',
        'A#4 . D5 . F5 . . . D5 . A#4 . C5 . . .',
        'C5 . E5 . G5 . . . E5 . C5 . G4 . . .'
      ]
    },
    /* 没给某关配曲子时的兜底（现在等于大厅那首） */
    default: {
      name: '方块小镇',
      bpm: 100, wave: 'triangle', drum: 'pop',
      chords: [['C3', 'E3', 'G3'], ['G2', 'B2', 'D3'], ['A2', 'C3', 'E3'], ['F2', 'A2', 'C3']],
      lead: [
        'C5 . E5 . G5 . . . E5 . C5 . . . . .',
        'D5 . G5 . B5 . . . G5 . D5 . . . . .',
        'E5 . A5 . C6 . . . A5 . E5 . . . . .',
        'F5 . A5 . C6 . . . A5 . G5 . E5 . . .'
      ]
    }
  };

  const Music = (Game.Music = {
    ctx: null,
    master: null,
    enabled: true,
    volume: 0.35,
    current: null,          /* 现在在放哪首（曲子的 id） */
    playing: false,
    paused: false,
    tracks: TRACKS,

    /* ---------------- 起 ---------------- */
    init() {
      if (!this.ctx) {
        /* 和音效共用同一个 AudioContext（浏览器对上下文数量有限制） */
        if (Game.Sfx && Game.Sfx.ctx) this.ctx = Game.Sfx.ctx;
        else {
          const AC = window.AudioContext || window.webkitAudioContext;
          if (!AC) { this.enabled = false; return; }
          try { this.ctx = new AC(); } catch (e) { this.enabled = false; return; }
        }
      }
      if (!this.master) {
        this.master = this.ctx.createGain();
        this.master.gain.value = this.enabled ? this.volume : 0;
        this.master.connect(this.ctx.destination);
        this.noise = makeNoise(this.ctx);
      }
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return this;
    },

    setEnabled(v) {
      this.enabled = !!v;
      if (!this.enabled) {
        this.paused = false;
        this.playing = false;
        this._pauseScheduler();
      }
      if (this.enabled) {
        /* 注意：这里不能 init()（浏览器不许在用户点按钮之前出声）。
           只把 current 记着，等 main.js 在「点了开始按钮」之后调 init() + play()。 */
        if (this.current) this.play(this.current);
      }
      this._applyVolume(0.12);
      return this.enabled;
    },

    toggle() { return this.setEnabled(!this.enabled); },

    setVolume(v) {
      this.volume = Math.max(0, Math.min(1, v));
      this._applyVolume(0.12);
      return this.volume;
    },

    _applyVolume(fade) {
      if (!this.master) return;
      const target = (this.enabled && !this.paused) ? this.volume : 0;
      const now = this.ctx.currentTime;
      try {
        this.master.gain.cancelScheduledValues(now);
        this.master.gain.setValueAtTime(this.master.gain.value, now);
        this.master.gain.linearRampToValueAtTime(target, now + (fade || 0.2));
      } catch (e) { this.master.gain.value = target; }
    },

    /* ---------------- 放 / 停 ---------------- */
    play(id) {
      if (id && !TRACKS[id]) id = 'default';
      id = id || this.current || 'default';
      this.current = id;
      if (!this.enabled) return this.current;
      /* 用户还没点过按钮时不许出声：这时候建 AudioContext 会被浏览器挂起
         （Chrome 会在控制台警告）。所以这里不能顺手 init()，
         只记住 current；等用户点了开始按钮，main.js 会调 init() 再 play()。 */
      if (!this.ctx) return this.current;
      this.init();
      if (!this.ctx || !this.master) return this.current;

      /* 正在放同一首、而且没停：什么都不用做 */
      if (this.playing && !this.paused && this._trackId === id) return this.current;

      this._gen = (this._gen || 0) + 1;
      const gen = this._gen;
      this._pauseScheduler();
      this._applyVolume(0.18);                 /* 先把旧曲子淡下去 */
      const self = this;
      setTimeout(function () {
        if (gen !== self._gen) return;         /* 期间又切歌了，放弃这次 */
        self._startPattern(TRACKS[id]);
      }, 200);
      return this.current;
    },

    stop() {
      this.playing = false;
      this._gen = (this._gen || 0) + 1;
      this._pauseScheduler();
      this._applyVolume(0.15);
      return this;
    },

    pause() {
      if (!this.playing) return this;
      this.paused = true;
      this._pauseScheduler();
      this._applyVolume(0.2);
      return this;
    },

    resume() {
      if (!this.playing || !this.paused) return this;
      this.paused = false;
      this.init();
      this._startPattern(TRACKS[this.current] || TRACKS.default);
      return this;
    },

    /* ---------------- 内部：调度器 ----------------
       每 25 毫秒看一眼，把「未来 0.25 秒内」要响的音提前排给 WebAudio。
       这是 WebAudio 的标准写法：不能每帧现排，不然会抖。 */
    _startPattern(track) {
      this.track = track;
      this._trackId = this.current;
      this.step = 0;
      this.nextTime = this.ctx.currentTime + 0.08;
      this.playing = true;
      this.paused = false;
      this._applyVolume(0.25);                 /* 新曲子淡进来 */
      const self = this;
      if (this._timer) clearInterval(this._timer);
      this._timer = setInterval(function () { self._tick(); }, 25);
      this._tick();
    },

    _pauseScheduler() {
      if (this._timer) { clearInterval(this._timer); this._timer = null; }
    },

    _tick() {
      if (!this.ctx || !this.track || this.paused || !this.enabled) return;
      const stepDur = 60 / this.track.bpm / 4;      /* 十六分音符 */
      const horizon = this.ctx.currentTime + 0.25;
      while (this.nextTime < horizon) {
        this._scheduleStep(this.step, this.nextTime, stepDur);
        this.step++;
        this.nextTime += stepDur;
      }
    },

    /* 第 step 步要响什么 */
    _scheduleStep(step, t, stepDur) {
      const tr = this.track;
      const bar = Math.floor(step / 16) % 4;        /* 第几小节（4 小节循环） */
      const inBar = step % 16;                      /* 小节里的第几个十六分 */
      const chord = tr.chords[bar];

      /* 1) 贝斯：八分音符弹和弦根音，小节最后一拍走到五度，有点「走」的感觉 */
      if (inBar % 2 === 0) {
        const root = chord[0];
        const isLast = inBar >= 12;
        this._note(isLast ? trans(root, 7) : root, t, stepDur * 1.7, tr.wave, 0.16, 0.006);
      }
      /* 2) 和弦垫：每小节第一拍轻轻铺一下 */
      if (inBar === 0) {
        for (let i = 1; i < chord.length; i++) {
          this._note(chord[i], t, stepDur * 10, 'sine', 0.045, 0.05);
        }
      }
      /* 3) 主旋律 */
      const leadBar = tr.lead[bar] || tr.lead[0];
      const tok = (leadBar || '').split(/\s+/)[inBar];
      if (tok && tok !== R) this._note(tok, t, stepDur * 1.5, tr.wave, 0.13, 0.008);
      /* 4) 鼓 */
      const d = (DRUMS[tr.drum] || DRUMS.pop).split(/\s+/)[inBar];
      if (d === 'K') this._kick(t);
      else if (d === 'S') this._snare(t);
      else if (d === 'h') this._hat(t, 0.05);
      else if (d === 't') this._tom(t, 220);
    },

    /* 单个音 */
    _note(note, t, dur, wave, gain, attack) {
      const f = freq(note);
      if (!f) return;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = wave || 'triangle';
      osc.frequency.setValueAtTime(f, t);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(gain, t + (attack || 0.01));
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(g).connect(this.master);
      osc.start(t);
      osc.stop(t + dur + 0.05);
    },

    _kick(t) {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(130, t);
      osc.frequency.exponentialRampToValueAtTime(46, t + 0.11);
      g.gain.setValueAtTime(0.5, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
      osc.connect(g).connect(this.master);
      osc.start(t); osc.stop(t + 0.2);
    },

    _noiseHit(t, dur, hp, gain) {
      const src = this.ctx.createBufferSource();
      src.buffer = this.noise;
      const f = this.ctx.createBiquadFilter();
      f.type = 'highpass';
      f.frequency.value = hp;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(gain, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      src.connect(f).connect(g).connect(this.master);
      src.start(t); src.stop(t + dur + 0.02);
    },

    _snare(t) { this._noiseHit(t, 0.13, 1400, 0.16); },
    _hat(t, g) { this._noiseHit(t, 0.035, 7000, g || 0.06); },

    _tom(t, f) {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, t);
      osc.frequency.exponentialRampToValueAtTime(f * 0.6, t + 0.12);
      g.gain.setValueAtTime(0.22, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
      osc.connect(g).connect(this.master);
      osc.start(t); osc.stop(t + 0.18);
    }
  });

  /* 音名往上/往下挪几个半音（贝斯走五度用） */
  function trans(note, semi) {
    const m = /^([A-G]#?)(-?\d)$/.exec(note);
    if (!m) return note;
    const midi = (parseInt(m[2], 10) + 1) * 12 + SEMI[m[1]] + semi;
    const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    return names[((midi % 12) + 12) % 12] + (Math.floor(midi / 12) - 1);
  }

  /* 一小段白噪声，给小鼓 / 踩镲用 */
  function makeNoise(ctx) {
    const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.4), ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  /* 切到别的页签时先停掉：后台标签页的定时器会被浏览器掐到 1 秒一次，音乐会卡成电音 */
  if (typeof document !== 'undefined' && document.addEventListener) {
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) Music.pause();
      else Music.resume();
    });
  }
})();

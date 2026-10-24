/* ===================================================================
   engine/audio.js
   音效：全部用 WebAudio 现场合成，零素材。新增音效只要加一行旋律。
   =================================================================== */
(function () {
  const Game = window.Game;

  const Sfx = (Game.Sfx = {
    ctx: null,
    enabled: true,

    init() {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) { this.enabled = false; return; }
        try { this.ctx = new AC(); } catch (e) { this.enabled = false; return; }
      }
      if (this.ctx.state === 'suspended') this.ctx.resume();
    },

    setEnabled(v) {
      this.enabled = !!v;
      if (this.enabled) this.init();
    },

    /* 单个音：频率、时长、波形、音量、延迟、滑到的频率 */
    tone(freq, dur, type, gain, delay, slideTo) {
      if (!this.enabled) return;
      this.init();
      if (!this.ctx) return;
      type = type || 'sine'; gain = gain || 0.12; delay = delay || 0;
      const t0 = this.ctx.currentTime + delay;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t0);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(gain, t0 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(g).connect(this.ctx.destination);
      osc.start(t0);
      osc.stop(t0 + dur + 0.03);
    },

    seq(list, type, gain, step) {
      list.forEach((f, i) => this.tone(f, 0.2, type, gain, i * (step || 0.09)));
    },

    click() { this.tone(660, 0.08, 'square', 0.06); },
    correct() { this.seq([523, 659, 784, 1047], 'triangle', 0.11); },
    wrong() { this.tone(240, 0.18, 'sawtooth', 0.08); this.tone(170, 0.3, 'sawtooth', 0.08, 0.14); },
    pickup() { this.tone(880, 0.1, 'triangle', 0.09); this.tone(1320, 0.14, 'triangle', 0.07, 0.08); },
    chest() { this.seq([392, 523, 659], 'sine', 0.1, 0.06); },
    unlock() { this.seq([392, 494, 587, 784, 988], 'sine', 0.11, 0.1); },
    craft() { this.seq([523, 659, 880], 'square', 0.07, 0.07); },
    jump() { this.tone(520, 0.12, 'sine', 0.05, 0, 760); },
    /* 擂台关：打到人 / 把人打下去 / 擂台缩小 */
    hit() { this.tone(200, 0.12, 'square', 0.09, 0, 340); },
    knock() { this.tone(150, 0.2, 'sawtooth', 0.11, 0, 80); this.tone(340, 0.1, 'square', 0.06, 0.03); },
    shrink() { this.seq([392, 330, 262], 'sawtooth', 0.07, 0.13); },
    levelUp() { this.seq([523, 587, 659, 784, 880, 1047, 1319], 'triangle', 0.12, 0.13); }
  });
})();

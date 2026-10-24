/* ===================================================================
   方块小勇士 · core.js
   基础工具：数学 / 音效（WebAudio 合成，无需素材）/ canvas 贴图 /
             粒子系统 / 存档
   =================================================================== */
(function () {
  const Game = (window.Game = window.Game || {});

  /* ---------------- 数学小工具 ---------------- */
  Game.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  Game.lerp = (a, b, t) => a + (b - a) * t;
  Game.rand = (a, b) => a + Math.random() * (b - a);
  Game.randInt = (a, b) => Math.floor(Game.rand(a, b + 1));
  Game.pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  Game.shuffle = function (arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  };

  /* ---------------- 音效 ---------------- */
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
    win() { this.seq([523, 587, 659, 784, 880, 1047, 1319], 'triangle', 0.12, 0.13); }
  });

  /* ---------------- canvas 贴图 ---------------- */
  /* 颜色统一转成 canvas 能认的 #rrggbb 字符串（0xf6c99a → #f6c99a） */
  function css(color) {
    if (typeof color === 'number') return '#' + ('000000' + color.toString(16)).slice(-6);
    return color;
  }
  Game.css = css;

  function canvasTex(w, h, draw, repeatX, repeatY) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    if (repeatX) {
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(repeatX, repeatY || repeatX);
    }
    return t;
  }
  Game.canvasTex = canvasTex;

  const texCache = {};
  Game.tex = {
    grass() {
      return canvasTex(64, 64, (g) => {
        g.fillStyle = '#78c94b'; g.fillRect(0, 0, 64, 64);
        const shades = ['#8dd75c', '#6cb841', '#9ce069', '#84cf52'];
        for (let i = 0; i < 220; i++) {
          g.fillStyle = shades[i % shades.length];
          const s = 3 + (i % 3);
          g.fillRect(Math.floor(Math.random() * 64), Math.floor(Math.random() * 64), s, s);
        }
      }, 30, 30);
    },
    dirt() {
      return canvasTex(64, 64, (g) => {
        g.fillStyle = '#a9713f'; g.fillRect(0, 0, 64, 64);
        const shades = ['#b57c47', '#96632f', '#c08754'];
        for (let i = 0; i < 160; i++) {
          g.fillStyle = shades[i % shades.length];
          g.fillRect(Math.floor(Math.random() * 64), Math.floor(Math.random() * 64), 4, 4);
        }
      }, 10, 10);
    },
    wood() {
      return canvasTex(64, 64, (g) => {
        g.fillStyle = '#b57c47'; g.fillRect(0, 0, 64, 64);
        for (let y = 0; y < 64; y += 16) {
          g.fillStyle = y % 32 === 0 ? '#a9713f' : '#c48b53';
          g.fillRect(0, y, 64, 14);
          g.fillStyle = 'rgba(74,52,33,.25)';
          g.fillRect(0, y + 14, 64, 2);
        }
      }, 2, 2);
    },
    stone() {
      return canvasTex(64, 64, (g) => {
        g.fillStyle = '#b9bec4'; g.fillRect(0, 0, 64, 64);
        const shades = ['#c9ced4', '#a8afb7', '#d3d8dd'];
        for (let i = 0; i < 90; i++) {
          g.fillStyle = shades[i % shades.length];
          const s = 6 + (i % 4) * 3;
          g.fillRect(Math.floor(Math.random() * 64), Math.floor(Math.random() * 64), s, s);
        }
        g.strokeStyle = 'rgba(90,98,106,.35)'; g.lineWidth = 2;
        g.strokeRect(1, 1, 62, 62);
      }, 1, 1);
    },
    /* 广场石板路：平整的方砖 + 砖缝 */
    paving() {
      return canvasTex(256, 256, (g) => {
        g.fillStyle = '#a9b0b7'; g.fillRect(0, 0, 256, 256);
        for (let y = 0; y < 4; y++) {
          for (let x = 0; x < 4; x++) {
            g.fillStyle = (x + y) % 2 ? '#d3d8dd' : '#c8ced4';
            g.fillRect(x * 64 + 4, y * 64 + 4, 56, 56);
          }
        }
      }, 1, 1);
    },
    /* 小勇士的脸：眼睛 + 腮红 + 笑容 */
    face(skin, hair) {
      skin = skin || '#f6c99a'; hair = hair || '#5a3a22';
      return canvasTex(64, 64, (g) => {
        g.fillStyle = css(skin); g.fillRect(0, 0, 64, 64);
        g.fillStyle = css(hair); g.fillRect(0, 0, 64, 15);
        g.fillRect(0, 15, 6, 10); g.fillRect(58, 15, 6, 10);
        // 眼睛
        g.fillStyle = '#fff';
        g.beginPath(); g.ellipse(20, 32, 8, 9, 0, 0, 7); g.fill();
        g.beginPath(); g.ellipse(44, 32, 8, 9, 0, 0, 7); g.fill();
        g.fillStyle = '#3a2a1c';
        g.beginPath(); g.arc(21, 33, 4.6, 0, 7); g.fill();
        g.beginPath(); g.arc(45, 33, 4.6, 0, 7); g.fill();
        g.fillStyle = '#fff';
        g.beginPath(); g.arc(19, 31, 1.8, 0, 7); g.fill();
        g.beginPath(); g.arc(43, 31, 1.8, 0, 7); g.fill();
        // 腮红
        g.fillStyle = 'rgba(255,140,140,.45)';
        g.beginPath(); g.ellipse(11, 45, 6, 4, 0, 0, 7); g.fill();
        g.beginPath(); g.ellipse(53, 45, 6, 4, 0, 0, 7); g.fill();
        // 笑容
        g.strokeStyle = '#3a2a1c'; g.lineWidth = 3; g.lineCap = 'round';
        g.beginPath(); g.arc(32, 42, 11, 0.18 * Math.PI, 0.82 * Math.PI); g.stroke();
      });
    },
    /* 悬浮文字牌（中文昵称 / 提示） */
    label(text, opts) {
      opts = opts || {};
      const pad = 14, fontSize = opts.fontSize || 40;
      const c = document.createElement('canvas');
      const ctx = c.getContext('2d');
      ctx.font = '700 ' + fontSize + 'px "Yuanti SC","PingFang SC",sans-serif';
      const w = Math.ceil(ctx.measureText(text).width) + pad * 2;
      c.width = w; c.height = fontSize + pad * 2;
      const g = c.getContext('2d');
      g.font = '700 ' + fontSize + 'px "Yuanti SC","PingFang SC",sans-serif';
      g.textAlign = 'center'; g.textBaseline = 'middle';
      const r = 14;
      g.fillStyle = opts.bg || 'rgba(255,246,224,.94)';
      g.strokeStyle = opts.border || '#4a3421';
      g.lineWidth = 6;
      g.beginPath();
      g.moveTo(r, 3); g.lineTo(c.width - r, 3);
      g.quadraticCurveTo(c.width - 3, 3, c.width - 3, r);
      g.lineTo(c.width - 3, c.height - r);
      g.quadraticCurveTo(c.width - 3, c.height - 3, c.width - r, c.height - 3);
      g.lineTo(r, c.height - 3);
      g.quadraticCurveTo(3, c.height - 3, 3, c.height - r);
      g.lineTo(3, r);
      g.quadraticCurveTo(3, 3, r, 3);
      g.closePath(); g.fill(); g.stroke();
      g.fillStyle = opts.color || '#4a3421';
      g.fillText(text, c.width / 2, c.height / 2 + 2);
      return c;
    }
  };

  /* 生成一块文字牌子（Sprite，永远面向相机） */
  Game.makeLabelSprite = function (text, worldHeight, opts) {
    const canvas = Game.tex.label(text, opts);
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    const mat = new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false });
    const sp = new THREE.Sprite(mat);
    const h = worldHeight || 0.6;
    sp.scale.set((canvas.width / canvas.height) * h, h, 1);
    return sp;
  };

  /* ---------------- 粒子（用一组小方块洒星星） ---------------- */
  Game.Particles = class Particles {
    constructor(scene) {
      this.group = new THREE.Group();
      scene.add(this.group);
      this.pool = [];
      const geo = new THREE.BoxGeometry(0.16, 0.16, 0.16);
      for (let i = 0; i < 90; i++) {
        const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ transparent: true }));
        m.visible = false;
        this.group.add(m);
        this.pool.push({ mesh: m, life: 0, max: 1, vel: new THREE.Vector3() });
      }
    }
    burst(pos, color, count, spread) {
      count = count || 14; spread = spread || 1;
      let used = 0;
      for (const p of this.pool) {
        if (p.life > 0) continue;
        p.mesh.visible = true;
        p.mesh.position.set(
          pos.x + Game.rand(-0.35, 0.35),
          pos.y + Game.rand(0, 0.5),
          pos.z + Game.rand(-0.35, 0.35)
        );
        p.mesh.material.color.set(color);
        p.mesh.material.opacity = 1;
        p.mesh.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
        p.vel.set(Game.rand(-spread, spread), Game.rand(2.2, 4.6), Game.rand(-spread, spread));
        p.max = p.life = Game.rand(0.8, 1.4);
        if (++used >= count) break;
      }
    }
    update(dt) {
      for (const p of this.pool) {
        if (p.life <= 0) continue;
        p.life -= dt;
        if (p.life <= 0) { p.mesh.visible = false; continue; }
        p.vel.y -= 9 * dt;
        p.mesh.position.addScaledVector(p.vel, dt);
        p.mesh.rotation.x += dt * 6;
        p.mesh.rotation.y += dt * 4;
        p.mesh.material.opacity = Math.max(0, p.life / p.max);
      }
    }
  };

  /* ---------------- 存档 ---------------- */
  const SAVE_KEY = 'block-hero-save-v1';
  Game.defaultSave = () => ({
    riddles: [],          // 已答对的谜语序号
    chests: [],           // 已打开的宝箱 id
    items: {},            // { 装备id: 数量 }
    coins: 0,
    level1Done: false,
    legendary: false
  });
  Game.loadSave = function () {
    const base = Game.defaultSave();
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return base;
      const d = JSON.parse(raw);
      return Object.assign(base, d);
    } catch (e) { return base; }
  };
  Game.saveGame = function (data) {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(data)); } catch (e) { /* 隐私模式忽略 */ }
  };
  Game.clearSave = function () {
    try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* ignore */ }
  };
})();

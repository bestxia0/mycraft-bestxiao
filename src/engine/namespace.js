/* ===================================================================
   engine/namespace.js
   全局命名空间 + 基础工具（数学 / 颜色 / 事件总线 / 日志）
   约定：所有模块都挂在 window.Game 下，不使用 ES Module，
        这样双击 index.html 就能跑（file:// 也能用）。
   =================================================================== */
(function () {
  const Game = (window.Game = window.Game || {});

  Game.version = '2.4.0';

  /* ---------------- 数学 ---------------- */
  const M = (Game.M = {
    clamp: (v, a, b) => (v < a ? a : v > b ? b : v),
    lerp: (a, b, t) => a + (b - a) * t,
    rand: (a, b) => a + Math.random() * (b - a),
    randInt: (a, b) => Math.floor(a + Math.random() * (b - a + 1)),
    pick: (arr) => arr[Math.floor(Math.random() * arr.length)],
    shuffle(arr) {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const t = arr[i]; arr[i] = arr[j]; arr[j] = t;
      }
      return arr;
    },
    dist2d(ax, az, bx, bz) { return Math.hypot(ax - bx, az - bz); },
    /* 颜色统一转成 canvas 能认的 #rrggbb（0xf6c99a → #f6c99a） */
    css(color) {
      if (typeof color === 'number') return '#' + ('000000' + color.toString(16)).slice(-6);
      return color;
    }
  });
  Game.clamp = M.clamp;      // 兼容简写
  Game.lerp = M.lerp;
  Game.rand = M.rand;
  Game.pick = M.pick;
  Game.shuffle = M.shuffle;
  Game.css = M.css;
  Game.Math = M;             // 也可以写 Game.Math.clamp(...)

  /* ---------------- 极简事件总线 ---------------- */
  Game.Events = {
    _map: {},
    on(name, fn) {
      (this._map[name] = this._map[name] || []).push(fn);
      return () => this.off(name, fn);
    },
    off(name, fn) {
      const list = this._map[name];
      if (!list) return;
      const i = list.indexOf(fn);
      if (i >= 0) list.splice(i, 1);
    },
    emit(name, payload) {
      const list = this._map[name];
      if (!list) return;
      for (let i = 0; i < list.length; i++) {
        try { list[i](payload); } catch (e) { console.error('[Game.Events] ' + name, e); }
      }
    }
  };

  /* ---------------- 日志 ---------------- */
  Game.log = {
    info() { console.log('%c[方块小勇士]', 'color:#4aa3ff', ...arguments); },
    warn() { console.warn('[方块小勇士]', ...arguments); },
    error() { console.error('[方块小勇士]', ...arguments); }
  };

  /* 引擎里到处都要用的常量 */
  Game.CONST = {
    GRAVITY: 24,
    JUMP_V: 9.2,
    WALK_SPEED: 6.2,
    STEP_UP: 0.78,      // 能自动迈上去的最大高度（台阶）
    ACTOR_HEIGHT: 1.8,
    ACTOR_RADIUS: 0.34
  };
})();

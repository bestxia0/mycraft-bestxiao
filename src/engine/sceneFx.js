/* ===================================================================
   engine/sceneFx.js
   两个小工具：
     Game.Queue  演出队列 —— 把「等一下 → 做件事 → 等画面变化」串成一条线
     Game.Fx     镜头特效 —— 震屏 / 闪白 / 慢动作
   -------------------------------------------------------------------
   关卡作者用法举例（通关时先白闪一下、再停 0.4 秒、再弹面板）：

     ctx.queue.wait(0.2).call(() => ctx.fx.flash('#ffffff', 0.5))
              .wait(0.5).call(() => ctx.complete({...})).start();
   =================================================================== */
(function () {
  const Game = window.Game;

  /* ============================================================
     演出队列
     ============================================================ */
  const Cue = (Game.Cue = {
    list: [],
    add(q) { this.list.push(q); return q; },
    update(dt) {
      for (let i = this.list.length - 1; i >= 0; i--) {
        const q = this.list[i];
        q.update(dt);
        if (!q.running) this.list.splice(i, 1);
      }
    },
    clear() { this.list.length = 0; }
  });

  Game.Queue = class Queue {
    constructor(tag) {
      this.tag = tag || '';
      this.steps = [];
      this.i = 0;
      this.timer = 0;
      this.running = false;
      this.onDone = null;
    }
    /* 等 seconds 秒 */
    wait(seconds) { this.steps.push({ type: 'wait', s: seconds || 0 }); return this; }
    /* 立刻做一件事 */
    call(fn) { this.steps.push({ type: 'call', fn: fn }); return this; }
    /* 一直等到 fn() 返回 true（可选超时保护） */
    until(fn, timeout) { this.steps.push({ type: 'until', fn: fn, timeout: timeout || 5 }); return this; }
    start(onDone) {
      this.i = 0; this.timer = 0; this.running = true;
      this.onDone = onDone || null;
      Cue.add(this);
      return this;
    }
    cancel() { this.running = false; }
    update(dt) {
      if (!this.running) return;
      let guard = 0;
      while (this.running && guard++ < 64) {
        const step = this.steps[this.i];
        if (!step) { this._finish(); return; }
        if (step.type === 'wait') {
          this.timer += dt;
          if (this.timer >= step.s) { this.timer = 0; this.i++; continue; }
          return;
        }
        if (step.type === 'call') {
          this.i++;
          try { step.fn(); } catch (e) { Game.log.error('演出队列出错：', e); }
          dt = 0;                       // 同一帧里继续跑后面的步骤
          continue;
        }
        if (step.type === 'until') {
          this.timer += dt;
          let ok = false;
          try { ok = !!step.fn(); } catch (e) { ok = true; }
          if (ok || this.timer >= step.timeout) { this.timer = 0; this.i++; continue; }
          return;
        }
        this.i++;
      }
    }
    _finish() {
      this.running = false;
      if (this.onDone) {
        const fn = this.onDone;
        this.onDone = null;
        try { fn(); } catch (e) { Game.log.error('演出结束回调出错：', e); }
      }
    }
  };

  /* ============================================================
     镜头特效
     ============================================================ */
  const Fx = (Game.Fx = {
    camera: null,
    shakeAmount: 0,
    shakeTime: 0,
    timeScale: 1,
    _slowT: 0,
    _flashEl: null,

    init(camera) { this.camera = camera; },

    /* 震屏：amount 强度（0.1 轻微 / 0.5 很猛），dur 秒 */
    shake(amount, dur) {
      this.shakeAmount = Math.max(this.shakeAmount, amount || 0.2);
      this.shakeTime = Math.max(this.shakeTime, dur || 0.35);
    },

    /* 慢动作：factor 0.3 = 慢到三成速度，dur 秒后恢复 */
    slowmo(factor, dur) {
      this.timeScale = factor || 0.35;
      this._slowT = dur || 0.8;
    },

    /* 全屏闪一下（颜色可以是 '#fff7cc'） */
    flash(color, dur) {
      if (!this._flashEl) {
        const el = document.createElement('div');
        el.id = 'fxFlash';
        el.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:60;' +
          'opacity:0;transition:opacity .18s ease';
        document.body.appendChild(el);
        this._flashEl = el;
      }
      const el = this._flashEl;
      el.style.background = color || '#ffffff';
      el.style.transition = 'opacity .06s ease';
      el.style.opacity = '0.85';
      setTimeout(() => {
        el.style.transition = 'opacity ' + ((dur || 0.5) * 1000) + 'ms ease';
        el.style.opacity = '0';
      }, 70);
    },

    update(dt) {
      /* 慢动作计时 */
      if (this._slowT > 0) {
        this._slowT -= dt / Math.max(0.05, this.timeScale);
        if (this._slowT <= 0) { this._slowT = 0; this.timeScale = 1; }
      }
      /* 震屏：直接改相机的位置（在相机算完之后调用） */
      if (this.shakeTime > 0 && this.camera) {
        this.shakeTime -= dt;
        const k = Math.max(0, this.shakeTime) * this.shakeAmount * 2.2;
        this.camera.position.x += Math.sin(performance.now() * 0.07) * k;
        this.camera.position.y += Math.sin(performance.now() * 0.11) * k;
        this.camera.position.z += Math.cos(performance.now() * 0.09) * k;
        if (this.shakeTime <= 0) { this.shakeAmount = 0; }
      }
    },

    reset() {
      this.shakeAmount = 0; this.shakeTime = 0;
      this.timeScale = 1; this._slowT = 0;
    }
  });
})();

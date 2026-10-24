/* ===================================================================
   engine/interactions.js
   交互系统：走近物件 → 屏幕下方出现「按 E …」 → 按 E 触发
   还支持「踩进一块区域就触发」的自动触发器（zone）
   -------------------------------------------------------------------
   关卡作者一般不用直接 new，用 ctx 上的两个方法就够了：

     ctx.interact({ label:'按 E 读谜语', pos:{x:0,z:6}, radius:3.2, onUse(ctx){...} })
     ctx.zone({ x:0, z:-24, r:4, once:true, onEnter(ctx){...} })

   可选字段：
     enabled : 函数，返回 false 时暂时不能用（例如大门没开）
     hidePrompt : true 表示触发时不要显示「按 E」提示
   =================================================================== */
(function () {
  const Game = window.Game;

  Game.Interactions = class Interactions {
    constructor(ctx) {
      this.ctx = ctx;
      this.items = [];
      this.zones = [];
      this.nearest = null;
      this.insideZones = [];
    }

    /* 登记一个可交互物件 */
    add(def) {
      const it = Object.assign({
        id: 'it' + (this.items.length + 1),
        radius: 3,
        enabled: null,
        hidePrompt: false
      }, def);
      if (!it.pos) it.pos = { x: 0, z: 0 };
      this.items.push(it);
      return it;
    }

    remove(it) {
      const i = this.items.indexOf(it);
      if (i >= 0) this.items.splice(i, 1);
      if (this.nearest === it) this.nearest = null;
    }

    clear() {
      this.items.length = 0;
      this.zones.length = 0;
      this.insideZones.length = 0;
      this.nearest = null;
    }

    /* 登记一块「踩进去就触发」的区域 */
    zone(def) {
      const z = Object.assign({ r: 4, once: false, enabled: null, triggered: false }, def);
      this.zones.push(z);
      return z;
    }

    enabledOf(def) {
      return !def.enabled || !!def.enabled(this.ctx);
    }

    update() {
      const p = this.ctx.player.pos;
      /* 找最近的那个 */
      let best = null, bestD = Infinity;
      for (let i = 0; i < this.items.length; i++) {
        const it = this.items[i];
        if (it.consumed) continue;
        if (!this.enabledOf(it)) continue;
        const d = Math.hypot(it.pos.x - p.x, it.pos.z - p.z);
        if (d < it.radius && d < bestD) { bestD = d; best = it; }
      }
      this.nearest = best;

      /* 区域触发 */
      for (let i = 0; i < this.zones.length; i++) {
        const z = this.zones[i];
        const inside = Math.hypot(z.x - p.x, z.z - p.z) <= z.r;
        const was = this.insideZones.indexOf(z) >= 0;
        if (inside && !was) {
          this.insideZones.push(z);
          if (this.enabledOf(z) && (!z.once || !z.triggered)) {
            z.triggered = true;
            if (z.onEnter) z.onEnter(this.ctx);
          }
        } else if (!inside && was) {
          this.insideZones.splice(this.insideZones.indexOf(z), 1);
          if (z.onExit) z.onExit(this.ctx);
        }
      }
    }

    /* 按 E：触发最近的那个 */
    use() {
      const it = this.nearest;
      if (!it) return false;
      if (it.once) it.consumed = true;
      if (it.onUse) it.onUse(this.ctx);
      return true;
    }

    /* 给 HUD 用的提示文字 */
    promptText() {
      const it = this.nearest;
      if (!it || it.hidePrompt) return null;
      return it.label || '按 E 交互';
    }
  };
})();

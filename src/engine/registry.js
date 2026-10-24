/* ===================================================================
   engine/registry.js
   关卡注册表：所有关卡用 Game.Levels.register({...}) 自己登记进来
   -------------------------------------------------------------------
   ★ 新增关卡只要两步 ★
     1) 复制 src/levels/_TEMPLATE/ 成 src/levels/你的关卡名/
     2) 在 src/levels/index.js 的清单里加一行

   一个关卡定义（def）长这样：
     {
       id: 'riddle-forest',        // 唯一 id，存档按它分区（定下来就别改！）
       order: 10,                  // 关卡顺序，数字小的排在前面
       name: '谜语森林',
       subtitle: '第 1 关',
       icon: '🌳',
       isHub: false,               // 只有中央广场是 true
       bounds: {minX,maxX,minZ,maxZ},   // 地图边界
       spawn: {x:0,z:0},           // 进入关卡时玩家站哪
       camera: {yaw:0,pitch:0.34,dist:7.4},
       hint: '进入关卡时显示的一句提示',
       unlock(save) { return ... },     // 可选：自定义解锁条件
       build(ctx) {},              // 搭地图（必填）
       update(dt, time, ctx) {},   // 每帧逻辑（可选）
       objective(ctx) { return { text:'现在要做什么', target:{x,z}, progress:{...} } }
     }
   =================================================================== */
(function () {
  const Game = window.Game;

  const Levels = (Game.Levels = {
    _defs: [],
    _byId: {},

    register(def) {
      if (!def || !def.id) { Game.log.error('关卡缺少 id，注册失败：', def); return null; }
      if (this._byId[def.id]) { Game.log.warn('关卡 id 重复，后面的覆盖前面的：' + def.id); }

      const d = Object.assign({
        order: 100,
        name: def.id,
        subtitle: '',
        icon: '🎮',
        isHub: false,
        bounds: { minX: -40, maxX: 40, minZ: -30, maxZ: 30 },
        spawn: { x: 0, z: 0 },
        camera: { yaw: 0, pitch: 0.34, dist: 7.4 },
        hint: '',
        groundSize: 0                // 0 = 按 bounds 自动算
      }, def);

      if (typeof d.build !== 'function') {
        Game.log.error('关卡 ' + d.id + ' 没有 build(ctx) 函数，没法搭地图');
        return null;
      }
      if (!d.objective) d.objective = function () { return { text: '自由探索' }; };

      this._defs.push(d);
      this._byId[d.id] = d;
      Game.log.info('已登记关卡：' + d.subtitle + ' ' + d.name + '（' + d.id + '）');
      return d;
    },

    /* 所有关卡，按 order 从小到大 */
    list() {
      return this._defs.slice().sort((a, b) => (a.order - b.order) || a.id.localeCompare(b.id));
    },

    get(id) { return this._byId[id] || null; },

    /* 中央广场（家） */
    hub() {
      const found = this.list().filter((d) => d.isHub);
      return found.length ? found[0] : null;
    },

    /* 真正的「关卡」（不含广场） */
    playable() {
      return this.list().filter((d) => !d.isHub);
    },

    index(id) {
      const p = this.playable();
      for (let i = 0; i < p.length; i++) if (p[i].id === id) return i;
      return -1;
    },

    next(id) {
      const p = this.playable();
      const i = this.index(id);
      return (i >= 0 && i + 1 < p.length) ? p[i + 1] : null;
    },

    prev(id) {
      const p = this.playable();
      const i = this.index(id);
      return (i > 0) ? p[i - 1] : null;
    },

    /* 这一关能不能进 */
    isUnlocked(id, save) {
      const def = this.get(id);
      if (!def) return false;
      if (def.isHub || def.alwaysUnlocked) return true;
      if (typeof def.unlock === 'function') return !!def.unlock(save, this);
      const prev = this.prev(id);
      if (!prev) return true;                       // 第一关默认开着
      return !!save.isLevelDone(prev.id);           // 其他关卡：上一关通关就开
    },

    /* 'locked' | 'open' | 'done' */
    statusOf(id, save) {
      if (!this.isUnlocked(id, save)) return 'locked';
      if (!this.get(id).isHub && save.isLevelDone(id)) return 'done';
      return 'open';
    },

    /* 玩家一共通关了几关 */
    doneCount(save) {
      return this.playable().filter((d) => save.isLevelDone(d.id)).length;
    },

    /* 当前应该去挑战的关卡（第一个没通关又解锁的） */
    currentTarget(save) {
      const p = this.playable();
      for (let i = 0; i < p.length; i++) {
        if (!save.isLevelDone(p[i].id) && this.isUnlocked(p[i].id, save)) return p[i];
      }
      return p.length ? p[p.length - 1] : null;
    }
  });
})();

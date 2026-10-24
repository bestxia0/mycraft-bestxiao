/* ===================================================================
   engine/director.js
   「闯关导演」：负责切换关卡、搭地图、驱动每帧逻辑、通关结算
   -------------------------------------------------------------------
   ★ 引擎层文件，关卡作者不用改这里 ★

   关卡靠 ctx 上的这些能力跟导演打交道：
     ctx.interact({...})      登记一个「按 E」的交互
     ctx.zone({...})          登记一块「走进去就触发」的区域
     ctx.entity(obj)          让一个道具会动（obj.animate(dt,time)）
     ctx.say([...])           让 NPC 说话
     ctx.panel({...})         弹面板
     ctx.toast('...')         飘一条提示
     ctx.complete({...})      本关通关（自动存档 + 解锁下一关）
     ctx.go('level-id')       直接跳到某个关卡
     ctx.returnPortal(x, z)   放一个「回广场」的传送门
   =================================================================== */
(function () {
  const Game = window.Game;

  const Director = (Game.Director = {
    scene: null,
    camera: null,
    player: null,
    save: null,
    particles: null,
    env: null,
    root: null,
    fx: null,
    guideArrow: null,
    cache: {},            // levelId -> ctx
    active: null,
    state: 'idle',        // idle（开始界面 / 只转镜头） | play | paused
    busy: false,          // 过场动画期间不让玩家乱动
    idleSpin: false,
    objective: null,
    _objTimer: 0,

    /* ---------------- 初始化 ---------------- */
    init(opts) {
      this.scene = opts.scene;
      this.camera = opts.camera;
      this.player = opts.player;
      this.save = opts.save;
      this.particles = opts.particles;
      this.env = opts.env;
      this.fx = opts.fx;

      this.root = new THREE.Group();
      this.root.name = 'levels';
      this.scene.add(this.root);

      this.guideArrow = Game.makeGuideArrow();
      this.scene.add(this.guideArrow);
      return this;
    },

    /* ---------------- 造一个关卡的运行上下文 ---------------- */
    context(def) {
      if (this.cache[def.id]) return this.cache[def.id];
      const self = this;
      const group = new THREE.Group();
      group.name = 'level:' + def.id;
      group.visible = false;
      this.root.add(group);

      const blocks = Game.Blocks.create(group);
      const helpers = blocks.helpers;

      const ctx = {
        id: def.id,
        def: def,
        director: self,
        scene: group,                 // 关卡里的东西都加到自己的 group，切关卡整体隐藏
        group: group,
        blocks: blocks,
        helpers: helpers,
        colliders: blocks.colliders,
        bounds: def.bounds,
        spawn: def.spawn,
        player: self.player,
        particles: self.particles,
        fx: self.fx,
        ui: Game.UI,
        sfx: Game.Sfx,
        save: self.save.level(def.id),
        entities: [],
        log: Game.log,

        /* 每一个演出队列都是新的 */
        queue: function () { return new Game.Queue(def.id); },

        /* 登记会动的道具 */
        entity: function (obj) { ctx.entities.push(obj); return obj; },
        addUpdater: function (fn) { helpers.addUpdater(fn); return fn; },

        /* 交互 / 触发区 */
        interact: function (d) { return ctx.interactions.add(d); },
        zone: function (d) { return ctx.interactions.zone(d); },

        /* 「哪里算地面」——擂台关用：返回 null 的地方就是空的，人掉下去
           ctx.setGround(function (x, z) { return 用好坏 ? 0 : null; }) */
        setGround: function (fn) { ctx.groundAt = fn; return fn; },
        groundAt: null,

        /* 界面 */
        toast: function (html, kind, ms, key) { Game.UI.toast(html, kind, ms, key); },
        say: function (lines, o) { return Game.Dialogue.show(lines, o); },
        panel: function (o) { return Game.UI.panel(o); },

        /* 数据 */
        addCoins: function (n) { return self.save.addCoins(n); },
        grantItem: function (id, n) { return self.grantItem(id, n); },
        inventory: function () { return self.save.inventory(); },
        itemCount: function () { return self.itemCount(); },

        /* 关卡流程 */
        complete: function (o) { return self.complete(o); },
        go: function (id, o) { return self.go(id, o); },
        goHub: function () { return self.goHub(ctx.id); },
        setDone: function (v) { ctx.save.setDone(v); },

        /* 放一个传送门 */
        portal: function (x, z, o) { return self._makePortal(ctx, x, z, o); },
        returnPortal: function (x, z, o) { return self._makeReturnPortal(ctx, x, z, o); }
      };
      ctx.interactions = new Game.Interactions(ctx);

      /* 地图边界：关卡可以只写一半，剩下的自动兜底 */
      ctx.bounds = Object.assign({ minX: -40, maxX: 40, minZ: -30, maxZ: 30 }, def.bounds || {});
      def.bounds = ctx.bounds;

      this.cache[def.id] = ctx;
      Game.log.info('正在搭建关卡：' + def.name);
      try {
        def.build(ctx);
      } catch (e) {
        Game.log.error('关卡 ' + def.id + ' 搭地图时出错：', e);
      }
      return ctx;
    },

    /* ---------------- 传送门小工具 ---------------- */
    _makePortal(ctx, x, z, o) {
      o = o || {};
      const p = Game.makePortal({
        x: x, z: z,
        y: o.y === undefined ? 3.3 : o.y,
        label: o.label || '传送门',
        color: o.color === undefined ? 0x9b6bff : o.color,
        rotationY: o.rotationY,
        locked: o.locked,
        labelBg: o.labelBg,
        r: o.r,
        labelHeight: o.labelHeight
      });
      ctx.group.add(p.group);
      ctx.entity(p);
      ctx.helpers.addSolid(x, 0, z, 2.6, 0.5, 2.6);   // 底座可以站上去
      ctx.helpers.block(x, z, 3.0);                    // 装饰物别长在传送门上
      if (o.label) p.setLabel(o.label, o.labelBg);
      return p;
    },

    _makeReturnPortal(ctx, x, z, o) {
      o = o || {};
      const p = this._makePortal(ctx, x, z, {
        y: o.y, r: o.r, rotationY: o.rotationY,
        color: 0xffb03a,
        label: o.label || '⬅ 回广场',
        labelBg: 'rgba(255,224,150,.96)',
        locked: false
      });
      ctx.interact({
        kind: 'hub-portal',
        label: o.prompt || '按 E 回广场 🏠',
        pos: { x: x, z: z },
        radius: o.radius || 3.4,
        onUse: function () { Director.goHub(ctx.id); }
      });
      return p;
    },

    /* ---------------- 进入某个关卡 ---------------- */
    go(id, opts) {
      opts = opts || {};
      const def = Game.Levels.get(id);
      if (!def) { Game.log.error('找不到关卡：' + id); return null; }

      /* 没解锁就不让进 */
      if (!def.isHub && !Game.Levels.isUnlocked(id, this.save)) {
        const prev = Game.Levels.prev(id);
        Game.UI.toast('🔒 这一关还没开呢，先通关【' +
          (prev ? prev.name : '前面的关卡') + '】吧！', 'bad', 3200);
        Game.Sfx.wrong();
        return null;
      }

      const ctx = this.context(def);
      const prevCtx = this.active;
      if (prevCtx && prevCtx !== ctx) prevCtx.group.visible = false;
      ctx.group.visible = true;
      this.active = ctx;

      /* 找落点：从哪来，就站在对应的传送门旁边 */
      let spawn = def.spawn || { x: 0, z: 0 };
      if (opts.from && typeof def.spawnFor === 'function') {
        spawn = def.spawnFor(opts.from, this.save) || spawn;
      }
      this.player.teleport(spawn.x, spawn.z, spawn.y || 0, def.camera);
      this.player.clearQueue();
      /* 关卡写了 noJump:true 就不能跳（第 7 关迷宫：跳也过不去墙，干脆关掉）。
         没写的关卡照样能跳，老关卡行为不变。 */
      this.player.jumpEnabled = !def.noJump;
      Game.UI.hintBar(this.player.jumpEnabled);

      this.env.setTheme(def.theme);
      this.state = 'play';
      this.busy = false;
      this._objTimer = 0;

      const title = def.subtitle ? (def.subtitle + ' · ' + def.name) : def.name;
      Game.UI.zone(title);
      Game.UI.prompt(null);
      Game.UI.battle(null);            // 上一关的擂台计时条先收起来
      this._refreshObjective(true);

      if (def.hint) Game.UI.toast(def.hint, 'gold', 4200, 'level-hint');
      if (def.onEnter) def.onEnter(ctx, opts);
      /* 换关卡就换背景音乐（每关一首；没配就放 default，见 docs/背景音乐.md）。
         用户还没点过按钮时 Music.play() 只记账不出声，等点了开始按钮才真的响。 */
      if (Game.Music) Game.Music.play(def.id);
      Game.Events.emit('level:enter', def.id);
      Game.log.info('进入关卡：' + title);
      return ctx;
    },

    goHub(fromId) {
      const hub = Game.Levels.hub();
      if (!hub) { Game.log.error('没有登记中央广场（isHub:true 的关卡）'); return null; }
      return this.go(hub.id, { from: fromId });
    },

    /* ---------------- 通关结算 ---------------- */
    complete(o) {
      o = o || {};
      const ctx = this.active;
      if (!ctx || ctx.def.isHub) return;
      const def = ctx.def;
      const firstTime = !ctx.save.done;
      ctx.save.setDone(true);
      if (o.coins) this.save.addCoins(o.coins);
      Game.Sfx.levelUp();
      this.fx.flash('#fff7cc', 0.5);
      this.busy = true;
      this.player.clearQueue();

      const next = Game.Levels.next(def.id);
      const nextOpen = next && Game.Levels.isUnlocked(next.id, this.save);
      const actions = [];
      if (nextOpen) {
        actions.push({
          label: '去' + next.subtitle + ' ' + next.name + ' →',
          primary: true,
          onClick: (p) => { p.close(); this.go(next.id, { from: def.id }); }
        });
      }
      actions.push({
        label: nextOpen ? '先回广场逛逛' : '回广场 🏠',
        primary: !nextOpen,
        kind: nextOpen ? 'ghost' : '',
        onClick: (p) => { p.close(); this.goHub(def.id); }
      });

      const self = this;
      Game.UI.panel({
        chip: (o.chip || '🎊 关卡通过'),
        title: o.title || '太棒啦！',
        closable: false,
        html: o.html || ('<p class="ui-text">你完成了【' + def.name + '】！</p>'),
        actions: actions,
        onClose: function () {
          self.busy = false;
          if (!nextOpen) Game.UI.toast('🏠 广场上的新传送门已经亮起来啦！', 'gold', 3600);
        }
      });
      Game.Events.emit('level:complete', { id: def.id, firstTime: firstTime });
      return true;
    },

    /* ---------------- 背包（全局，所有关卡共用） ---------------- */
    inventory() { return this.save.inventory(); },
    itemCount() {
      const inv = this.inventory();
      let n = 0;
      for (const k in inv) n += inv[k];
      return n;
    },
    grantItem(itemId, n) {
      const inv = this.inventory();
      inv[itemId] = (inv[itemId] || 0) + (n || 1);
      this.save.commit();
      Game.UI.stats({ coins: this.save.game().coins, items: this.itemCount() });
      return inv[itemId];
    },
    takeItems(ids) {
      const inv = this.inventory();
      (ids || []).forEach(function (id) {
        inv[id] = (inv[id] || 0) - 1;
        if (inv[id] <= 0) delete inv[id];
      });
      this.save.commit();
      Game.UI.stats({ coins: this.save.game().coins, items: this.itemCount() });
    },
    countByRarity(map) {
      const inv = this.inventory();
      const out = {};
      for (const k in inv) {
        const r = map(k);
        out[r] = (out[r] || 0) + inv[k];
      }
      return out;
    },

    /* ---------------- 每帧 ---------------- */
    update(dt, time) {
      Game.Cue.update(dt);
      const ctx = this.active;
      if (!ctx) return;

      const modalOpen = Game.UI.anyOpen() || Game.Dialogue.isOpen();
      const playing = this.state === 'play' && !this.busy;
      this.player.inputEnabled = playing && !modalOpen;

      if (this.state === 'idle') {
        /* 开始界面：镜头自己慢慢转 */
        if (this.idleSpin) this.player.cam.yaw += dt * 0.12;
        this.player.updateCamera(dt * 0.6);
      } else if (this.state === 'play') {
        this.player.update(dt, {
          colliders: ctx.colliders,
          bounds: ctx.bounds,
          floor: 0,
          floorAt: ctx.groundAt            // 关卡没设就是 null = 到处都是平地
        });
      } else {
        this.player.updateCamera(dt * 0.3);
      }

      /* 交互 & 按键分发 */
      if (playing && !modalOpen) {
        ctx.interactions.update();
        Game.UI.prompt(ctx.interactions.promptText());
        if (this.player.input.actQueued) {
          this.player.input.actQueued = false;
          ctx.interactions.use();
        }
      } else {
        Game.UI.prompt(null);
        this.player.clearQueue();
      }

      /* 关卡自己的逻辑 + 道具动画 */
      if (ctx.def.update) ctx.def.update(dt, time, ctx);
      ctx.blocks.update(dt, time);
      for (let i = 0; i < ctx.entities.length; i++) {
        const e = ctx.entities[i];
        if (e && e.animate) e.animate(dt, time);
      }
      Game.Dialogue.update(dt);

      /* 任务条（每 0.2 秒刷新一次就够） */
      this._objTimer -= dt;
      if (this._objTimer <= 0) this._refreshObjective();

      this._updateGuide(time, modalOpen);
      this.env.update(this.player.pos);
      Game.Fx.update(dt);
    },

    _refreshObjective(force) {
      const ctx = this.active;
      if (!ctx) return;
      let obj = { text: '' };
      try {
        obj = ctx.def.objective(ctx) || { text: '' };
      } catch (e) {
        Game.log.error('关卡 ' + ctx.id + ' 的 objective() 出错：', e);
      }
      this.objective = obj;
      Game.UI.objective({
        title: ctx.def.subtitle ? '当前任务 · ' + ctx.def.name : '当前任务',
        text: obj.text,
        progress: obj.progress
      });
      this._objTimer = 0.2;
      if (force) Game.UI.stats({ coins: this.save.game().coins, items: this.itemCount() });
    },

    _updateGuide(time, modalOpen) {
      const ctx = this.active;
      const obj = this.objective;
      const arrow = this.guideArrow;
      /* 关卡写了 noGuide:true 就不显示箭头（比如第 2 关：宝箱要自己去找） */
      if (!ctx || ctx.def.noGuide || !obj || !obj.target ||
          this.state !== 'play' || modalOpen) {
        arrow.visible = false;
        return;
      }
      const p = this.player.pos;
      const tx = obj.target.x, tz = obj.target.z;
      const dx = tx - p.x, dz = tz - p.z;
      const far = Math.hypot(dx, dz) > 4.5;
      arrow.visible = far;
      if (!far) return;
      arrow.position.set(p.x, p.y + 3.1 + Math.sin(time * 3) * 0.08, p.z);
      arrow.rotation.y = Math.atan2(dx, dz);
    },

    /* ---------------- 状态切换 ---------------- */
    showStart() {
      const hub = Game.Levels.hub();
      this.state = 'idle';
      this.idleSpin = true;
      if (hub) {
        this.go(hub.id, { silent: true });
        this.player.teleport(hub.spawn.x, hub.spawn.z, 0, { yaw: 0.6, pitch: 0.3, dist: 9 });
      }
      this.state = 'idle';
      Game.UI.showHUD(false);
      return this;
    },
    begin() {
      this.state = 'play';
      this.idleSpin = false;
      Game.UI.showHUD(true);
      this.player.setCam(this.active && this.active.def.camera);
      this._refreshObjective(true);
    },
    pause() {
      if (this.state !== 'play') return;
      this.state = 'paused';
      this.player.input.keys = {};
      if (Game.Music) Game.Music.pause();
      if (document.pointerLockElement) document.exitPointerLock();
    },
    resume() {
      if (Game.UI.anyOpen() || Game.Dialogue.isOpen()) return;
      this.state = 'play';
      this.player.clearQueue();
      if (Game.Music) Game.Music.resume();
    },

    /* 换档案 / 清空进度后重新搭地图 */
    rebuild(levelId) {
      const self = this;
      const keepId = levelId || (this.active && this.active.id);
      Object.keys(this.cache).forEach(function (id) {
        const ctx = self.cache[id];
        ctx.interactions.clear();
        self.root.remove(ctx.group);
        delete self.cache[id];
      });
      this.active = null;
      Game.Cue.clear();
      this.guideArrow.visible = false;
      if (keepId) {
        const wasIdle = this.state === 'idle';
        this.go(keepId);
        if (wasIdle) { this.state = 'idle'; Game.UI.showHUD(false); }
      }
    },

    /* 调试用：现在在哪一关、玩家在哪、目标是什么 */
    snapshot() {
      const ctx = this.active;
      const p = this.player.pos;
      return {
        level: ctx ? ctx.id : null,
        name: ctx ? ctx.def.name : null,
        state: this.state,
        pos: [+p.x.toFixed(2), +p.y.toFixed(2), +p.z.toFixed(2)],
        objective: this.objective && this.objective.text,
        coins: this.save.game().coins,
        items: this.itemCount(),
        modal: Game.UI.anyOpen()
      };
    }
  });
})();

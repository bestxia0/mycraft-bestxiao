/* ===================================================================
   levels/_TEMPLATE/level.js   ★ 新关卡模板：复制整个文件夹就能开始 ★
   -------------------------------------------------------------------
   怎么做：
     1. 把 _TEMPLATE 文件夹复制一份，改名成你的关卡（英文小写 + 短横线）
     2. 把下面 id / order / name / subtitle / icon 改成你的
     3. 在 src/levels/index.js 的清单里加一行
     4. 刷新浏览器，广场上就会多出一座通往这里的传送门

   规则：
     · id 一旦定下来就别再改（存档按 id 分区，改了小朋友的进度会丢）
     · order 决定关卡顺序：上一关通关，下一关才会解锁
     · build(ctx) 里搭地图；用 ctx.helpers 里的积木函数，不要直接碰 three.js
     · 想要自定义解锁条件，就写 unlock(save) { return true/false }
   =================================================================== */
(function () {
  const Game = window.Game;

  Game.Levels.register({
    id: 'my-new-level',            // ← 唯一 id（英文小写 + 短横线）
    order: 50,                     // ← 数字越小越靠前（当前最大是 40，新关卡往上加）
    name: '我的新关卡',             // ← 关卡名（显示在传送门和任务条上）
    subtitle: '第 5 关',            // ← 第几关
    icon: '🧩',                    // ← 传送门上显示的小图标

    /* 地图范围（出门就走不出去），玩家会被这圈看不见的墙挡住 */
    bounds: { minX: -24, maxX: 24, minZ: -24, maxZ: 24 },
    /* 进入关卡时玩家站的位置 */
    spawn: { x: 0, z: 14 },
    /* 进入关卡时的镜头（yaw 水平朝向 / pitch 俯仰 / dist 远近） */
    camera: { yaw: 0, pitch: 0.34, dist: 8 },
    /* 可选：换天气 */
    // theme: { skyTop: 0x2b3a67, skyBottom: 0x6b8cff, fog: 0x8fa7ff, fogNear: 40, fogFar: 140 },
    /* 进入关卡时飘一条提示 */
    hint: '🧩 欢迎来到新关卡，试试看吧！',

    /* ============ 1. 搭地图（只会在第一次进入时跑一次） ============ */
    build(ctx) {
      const h = ctx.helpers;            // 积木工具箱
      const B = ctx.bounds;             // 地图边界
      const save = ctx.save;            // 这一关自己的存档槽

      /* 自己关卡里的变量，挂到 ctx.data 上 */
      const rt = (ctx.data = { boxes: [] });

      /* --- 地面 + 边界墙 --- */
      h.addGround(B.maxX - B.minX + 12, B.maxZ - B.minZ + 12);
      h.addBounds(B);
      h.addClouds(10);
      h.block(0, 14, 6);                        // 出生点附近别长树（很关键！）

      /* --- 回广场的传送门（★每个关卡都要有一个★） ---
         位置讲究：镜头站在玩家<b>身后</b> dist 距离处，
         所以传送门不能摆在出生点正后方，否则一进关镜头就糊在门框上。
         正确做法 = 放在出生点「侧面」，离出生点 5~8 格。 */
      ctx.returnPortal(-7, 14, { rotationY: Math.PI * 0.5, r: 1.6 });
      h.block(-7, 14, 3.5);

      /* --- 摆几个可以交互的箱子 --- */
      [-6, 0, 6].forEach(function (x, i) {
        const chest = Game.makeChest(i, x, 0, 4);
        ctx.scene.add(chest.group);
        ctx.entity(chest);                        // 交给导演每帧 animate()
        h.addSolid(x, 0, 4, 1.1, 0.62, 0.85).noStep = true;

        const opened = save.has('opened', i);
        if (opened) chest.setOpened();

        ctx.interact({
          label: '按 E 打开箱子 🎁',
          pos: { x: x, z: 4 },
          radius: 2.5,
          enabled: function () { return !chest.opened; },
          onUse: function () {
            chest.open();
            save.pushUnique('opened', i);          // 存进存档，下次进来还是开着的
            ctx.addCoins(5);
            ctx.toast('🎁 +5 🪙 金币', 'good');
            ctx.particles.burst(chest.group.position.clone().setY(1), 0xfff3b0, 16, 1);
            Game.Sfx.chest();
            ctx.director._refreshObjective();
          }
        });
      });

      /* --- 装饰物：树 / 花（scatter 会自动避开上面 block 过的地方） --- */
      const rect = [B.minX + 3, B.maxX - 3, B.minZ + 3, B.maxZ - 3];
      h.scatter(14, rect, function (x, z) { h.makeTree(x, z, Game.rand(0.8, 1.2)); }, 3);
      h.scatter(16, rect, function (x, z) { h.makeFlower(x, z, Game.pick([0xff6b6b, 0xffd447])); }, 1.2);
    },

    /* ============ 2. 每帧逻辑（可选） ============ */
    update(dt, time, ctx) {
      /* 例：让某样东西慢慢转
         ctx.data.something.rotation.y += dt; */
    },

    /* ============ 3. 任务条 + 头顶箭头指向哪 ============ */
    objective(ctx) {
      const total = 3;
      const opened = ctx.save.list('opened').length;
      if (opened < total) {
        return {
          text: '打开箱子吧，还剩 ' + (total - opened) + ' 个',
          target: { x: 0, z: 4 },                       // 头顶箭头指向这里
          progress: { label: '箱子', value: opened, max: total }
        };
      }
      return { text: '都打开啦！回到传送门回广场吧 🏠', target: { x: -7, z: 14 } };
    },

    /* ============ 4. 通关 ============
       想做「走到出口就通关」，在 build 里加：
         ctx.zone({ x:0, z:-20, r:4, once:true, onEnter(){ ctx.complete({...}) } });
       想改解锁条件，就加：
         unlock(save) { return save.isLevelDone('chest-valley'); }
    */
  });
})();

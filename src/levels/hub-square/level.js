/* ===================================================================
   levels/hub-square/level.js
   方块小镇 · 广场（家）：所有关卡的出发点
   -------------------------------------------------------------------
   这个关卡很特别：广场上的传送门是「自动生成」的 ——
   你只要在 src/levels/index.js 里加一个新关卡，广场上就会自己多一座门，
   不用改这个文件！栏位不够时会自动把圈圈放大。

   小镇很大（108 × 90），四周都是给小朋友随便玩的地方：
     · 中间：大石板广场 —— 村长爷爷、告示牌、散步的小羊
     · 东边「跳跳乐」：三级石台一级一级往上跳，最上面有金杯 🏆（+30 金币）
     · 西边「小迷宫」：木头栅栏围的一圈一圈的迷宫，最里面藏着一个宝箱（+25 金币）
     · 南边「许愿池」：小池塘，投 10 枚金币许一个愿 💰
     · 南边「小花园」：一大片花圃，可以带小羊来玩 🌷
     · 东边「工具台」：能借到一个充电器 🔌（第 8 关风扇小屋要给风扇通电用）
     · 全镇散落着 8 枚闪光金币，每进一次小镇都会重新出现 🪙

   ★ 想挪动这些地方：改下面那几个常量（坐标表）就行，不用碰玩法代码 ★
   =================================================================== */
(function () {
  const Game = window.Game;

  /* ---------------- 小镇布局表（改坐标就改这里） ---------------- */
  const PLAZA = { w: 40, d: 24 };                  // 中间石板广场（宽 / 深）
  const ROAD = { x: 0, z: 25, w: 10, d: 26 };      // 出生点通向广场的小路
  const JUMP_TOWER = [                             // 东边「跳跳乐」三级石台
    { x: 30, z: 4, w: 6, d: 6, h: 1.0 },
    { x: 38, z: 4, w: 6, d: 6, h: 2.0 },
    { x: 46, z: 4, w: 6, d: 6, h: 3.0 }
  ];
  const MAZE = {                                   // 西边「小迷宫」
    out: { minX: -50, maxX: -33, minZ: -16, maxZ: 4, gapA: -9, gapB: -3 },  // 东边留门
    inn: { minX: -46, maxX: -37, minZ: -12, maxZ: 0, gapA: -8, gapB: -4 }   // 西边留门
  };
  const MAZE_PRIZE = { x: -41.5, z: -6 };          // 迷宫正中心的宝箱
  const POOL = { x: -26, z: 38, r: 5 };            // 南边「许愿池」
  const GARDEN = { x: 26, z: 38 };                 // 南边「小花园」
  const TOOLBOX = { x: 15, z: -8 };                // 东边「工具台」：借充电器（第 8 关用）
  const ELDER = { x: -11, z: 15 };                 // 村长爷爷
  const SIGN = { x: 11, z: 15 };                   // 玩法说明木牌
  const COIN_SPOTS = [                             // 8 枚闪光金币
    { x: -18, z: 22 }, { x: 16, z: 26 }, { x: -34, z: 24 }, { x: 34, z: 24 },
    { x: -48, z: -8 }, { x: 45, z: 14 }, { x: -6, z: 40 }, { x: 12, z: 40 }
  ];
  const WISHES = [
    '✨ 希望每天都开开心心！',
    '🌈 希望明天是个大晴天！',
    '🍀 希望和小伙伴一起玩得开心！',
    '📚 希望能认识好多好多字！',
    '🏆 希望变成最厉害的小勇士！'
  ];

  Game.Levels.register({
    id: 'hub-square',
    order: 0,
    isHub: true,
    name: '方块小镇 · 广场',
    subtitle: '',
    icon: '🏠',
    bounds: { minX: -54, maxX: 54, minZ: -44, maxZ: 46 },
    spawn: { x: 0, z: 33 },
    camera: { yaw: 0, pitch: 0.36, dist: 13 },
    hint: '🏠 欢迎来到方块小镇！广场那头的传送门通往各个关卡，走过去按 E 就能进去玩～',

    /* 每次回小镇：把捡过的金币重新摆出来 */
    onEnter(ctx) {
      const rt = ctx.data;
      if (!rt || !rt.coins) return;
      rt.coins.forEach(function (c) {
        c.taken = false;
        c.mesh.visible = true;
        if (c.zone) c.zone.triggered = false;
      });
      rt.coinCount = 0;
    },

    /* 从别的关卡回来时，站在它对应的传送门前面 */
    spawnFor(fromId) {
      const rt = this._rt;
      if (!rt) return null;
      for (let i = 0; i < rt.portals.length; i++) {
        const p = rt.portals[i];
        if (p.levelId !== fromId) continue;
        const len = Math.hypot(p.x, p.z) || 1;
        return { x: p.x - (p.x / len) * 5.2, z: p.z - (p.z / len) * 5.2 };
      }
      return null;
    },

    build(ctx) {
      const h = ctx.helpers;
      const B = ctx.bounds;
      const save = ctx.save;
      const rt = (ctx.data = { portals: [], sheep: [], coins: [], coinCount: 0, npc: null, lastStatus: {} });
      this._rt = rt;                                  // 给 spawnFor 用

      /* ---------------- 地面 + 石板广场 + 小路 ---------------- */
      h.addGround(B.maxX - B.minX + 12, B.maxZ - B.minZ + 12);
      const pave = Game.Textures.paving();
      pave.repeat.set(5, 3);
      h.addPatch(0, 0, PLAZA.w, PLAZA.d, pave);       // 石板广场
      h.block(0, 0, 24);                              // 广场中心不放树
      h.addPatch(ROAD.x, ROAD.z, ROAD.w, ROAD.d, 0xc9a06a);   // 出生点 → 广场的小路
      h.block(0, 33, 9);                              // 出生点周围别长树

      /* ---------------- 结界：看不见的墙 ---------------- */
      h.addBounds(B);

      /* ---------------- 云 ---------------- */
      h.addClouds(18);

      /* ---------------- 通往每个关卡的传送门（自动生成） ---------------- */
      /* 所有传送门摆成「半圈扇形」，都在出生点的正前方 ——
         这样一进广场就能一眼看到所有关卡，关卡变多了也不会跑到背后去。 */
      const levels = Game.Levels.playable();
      const ringR = Math.min(44, 16 + levels.length * 2.4);
      levels.forEach(function (def, i) {
        const angle = -Math.PI + ((i + 0.5) / levels.length) * Math.PI;   // 从西边扇到东边
        const px = Math.cos(angle) * ringR;
        const pz = Math.sin(angle) * ringR * 0.72;     // z 压扁一点，广场是横的
        const portal = ctx.portal(px, pz, {
          label: portalLabel(def, 'locked'),
          locked: true,
          rotationY: Math.atan2(0 - px, 0 - pz),       // 门面朝向广场中心
          r: 2.1
        });
        rt.portals.push({
          levelId: def.id, def: def, portal: portal, item: null, x: px, z: pz, status: null
        });
      });

      /* 每个门的交互入口（提示文字会根据解锁状态变） */
      rt.portals.forEach(function (p) {
        p.item = ctx.interact({
          kind: 'hub-portal',
          label: '按 E 进入 ' + p.def.name,
          pos: { x: p.x, z: p.z },
          radius: 3.4,
          onUse: function () { enterPortal(ctx, p); }
        });
      });

      /* ---------------- 小土路：从广场通到每一座门 ---------------- */
      rt.portals.forEach(function (p) {
        const steps = 6;
        for (let i = 1; i <= steps; i++) {
          const t = i / steps;
          const px = p.x * t * 0.92, pz = p.z * t * 0.92;
          if (Math.abs(px) < 18.5 && Math.abs(pz) < 11) continue;   // 别铺到广场石板上
          h.addPatch(px, pz, 3.6, 3.6, 0xc9a06a, Game.rand(-0.25, 0.25));
        }
      });

      /* ---------------- 东边「跳跳乐」 ---------------- */
      buildJumpTower(ctx, h);

      /* ---------------- 西边「小迷宫」 ---------------- */
      buildMaze(ctx, h);

      /* ---------------- 南边「许愿池」+「小花园」 ---------------- */
      buildWishPool(ctx, h);
      buildGarden(ctx, h);

      /* ---------------- 东边「工具台」：借充电器（第 8 关风扇小屋要用） ---------------- */
      buildToolBench(ctx, h);

      /* ---------------- 8 枚闪光金币 ---------------- */
      COIN_SPOTS.forEach(function (p, i) { buildCoin(ctx, p, i); });

      /* ---------------- 村长爷爷 ---------------- */
      const npc = Game.makeNPC('elder', { name: '村长爷爷 👴' });
      npc.group.position.set(ELDER.x, 0, ELDER.z);
      npc.group.rotation.y = Math.atan2(0 - ELDER.x, 0 - ELDER.z);
      ctx.scene.add(npc.group);
      ctx.entity(npc);
      h.addSolid(ELDER.x, 0, ELDER.z, 0.7, 1.8, 0.5);
      h.block(ELDER.x, ELDER.z, 3);
      rt.npc = npc;
      ctx.interact({
        kind: 'npc',
        label: '按 E 和村长爷爷说话 👴',
        pos: { x: ELDER.x, z: ELDER.z },
        radius: 3.2,
        onUse: function () { ctx.say(villageLines(ctx), { name: '村长爷爷', emoji: '👴' }); }
      });

      /* ---------------- 告示牌（玩法说明） ---------------- */
      h.makeSign('方块小镇 · 广场', SIGN.x, 2.2, SIGN.z, { rotationY: -Math.PI * 0.22 });
      h.block(SIGN.x, SIGN.z, 2.6);
      ctx.interact({
        kind: 'sign',
        label: '按 E 看玩法说明 📖',
        pos: { x: SIGN.x, z: SIGN.z },
        radius: 3.0,
        onUse: function () { showHelp(ctx); }
      });

      /* ---------------- 小羊（散步的小动物） ---------------- */
      [[14, -14, 5], [18, -9, 4], [-15, -13, 4], [22, 30, 5], [-18, 30, 4]].forEach(function (s) {
        const sheep = Game.makeSheep(s[0], s[1], s[2]);
        ctx.scene.add(sheep.group);
        ctx.entity(sheep);
        rt.sheep.push(sheep);
      });

      /* ---------------- 装饰：树 / 花 / 蘑菇 / 石头 ---------------- */
      const rect = [B.minX + 3, B.maxX - 3, B.minZ + 3, B.maxZ - 3];
      h.scatter(34, rect, function (x, z) { h.makeTree(x, z, Game.rand(0.85, 1.15)); }, 3.2);
      h.scatter(40, rect, function (x, z) {
        h.makeFlower(x, z, Game.pick([0xff6b6b, 0xffd447, 0x9b6bff, 0xff9fd1, 0xffffff]));
      }, 1.3);
      h.scatter(14, rect, function (x, z) { h.makeMushroom(x, z, Game.pick([0xff6b6b, 0x9b6bff])); }, 1.6);
      h.scatter(12, rect, function (x, z) { h.makeRock(x, z, Game.rand(0.9, 1.8)); }, 2.6);

      refreshPortals(ctx);
    },

    update(dt, time, ctx) {
      refreshPortals(ctx);
    },

    objective(ctx) {
      const rt = ctx.data || { portals: [], coinCount: 0 };
      /* 第 8 关：风扇已经装进小屋、却还缺充电器？任务条直接把小朋友领到工具台 */
      const gsave = ctx.director.save;
      if (!gsave.flag('hasCharger') && gsave.level('fan-cottage').flag('fanMounted')) {
        return {
          text: '🔌 风扇小屋还缺一个充电器，广场东边的工具台上就能借到！',
          target: { x: TOOLBOX.x, z: TOOLBOX.z }
        };
      }
      const target = Game.Levels.currentTarget(ctx.director.save);
      const total = Game.Levels.playable().length;
      const done = Game.Levels.doneCount(ctx.director.save);
      const coins = rt.coinCount || 0;
      if (!target || done >= total) {
        return {
          text: '自由探索方块小镇吧～ 东边有跳跳乐，西边有小迷宫，南边有许愿池！',
          progress: { label: '金币', value: coins, max: COIN_SPOTS.length }
        };
      }
      const p = rt.portals.filter(function (x) { return x.levelId === target.id; })[0];
      const targetDone = ctx.director.save.isLevelDone(target.id);
      return {
        text: targetDone
          ? '所有关卡都通关啦！🎉 可以再玩一次【' + target.name + '】'
          : '去广场上的【' + target.name + '】传送门，进入' +
            (target.subtitle ? target.subtitle + ' ' : '') + '挑战吧！',
        target: p ? { x: p.x, z: p.z } : null,
        progress: {
          label: '关卡',
          value: done,
          max: total
        }
      };
    }
  });

  /* ================= 东边：跳跳乐 ================= */
  function buildJumpTower(ctx, h) {
    const rt = ctx.data;
    JUMP_TOWER.forEach(function (p) {
      h.addPlatform(p.x, p.z, p.w, p.d, p.h);
      h.block(p.x, p.z, 4.5);
    });
    /* 第一级台阶脚下的小土坡，方便小朋友起步 */
    h.addPatch(27, 4, 8, 10, 0xd8cba8);

    const top = JUMP_TOWER[JUMP_TOWER.length - 1];
    const cup = Game.makeLabelSprite('🏆 金杯', 0.75, {
      fontSize: 48, bg: 'rgba(255,236,160,.96)'
    });
    cup.position.set(top.x, top.h + 1.9, top.z);
    ctx.scene.add(cup);
    /* 让金杯上下浮动 */
    ctx.entity({
      animate: function (dt, time) {
        cup.position.y = top.h + 1.9 + Math.sin(time * 2) * 0.12;
      }
    });

    const opened = ctx.save.flag('trophy');
    if (opened) {
      Game.setLabelText(cup, '✅ 金杯已拿到', { fontSize: 48, bg: 'rgba(190,255,200,.96)' });
    }
    ctx.interact({
      kind: 'trophy',
      label: '按 E 拿下金杯 🏆',
      pos: { x: top.x, z: top.z },
      radius: 2.8,
      enabled: function () { return !ctx.save.flag('trophy'); },
      onUse: function () { takeTrophy(ctx); }
    });
    rt.cup = cup;
  }

  function takeTrophy(ctx) {
    if (ctx.save.flag('trophy')) return;
    ctx.save.setFlag('trophy', true);
    ctx.addCoins(30);
    const top = JUMP_TOWER[JUMP_TOWER.length - 1];
    ctx.particles.burst(new THREE.Vector3(top.x, top.h + 1.6, top.z), 0xffd447, 28, 1.4);
    Game.Sfx.levelUp();
    ctx.fx.flash('#fff7cc', 0.4);
    Game.setLabelText(ctx.data.cup, '✅ 金杯已拿到', { fontSize: 48, bg: 'rgba(190,255,200,.96)' });
    ctx.toast('🏆 你爬到了最顶上！+30 🪙 金币', 'gold', 3600);
    Game.UI.stats({ coins: ctx.director.save.game().coins, items: ctx.itemCount() });
  }

  /* ================= 西边：小迷宫 ================= */
  function buildMaze(ctx, h) {
    const o = MAZE.out, n = MAZE.inn;
    /* 外圈：东边留一个门（要绕半圈才能到内圈的门） */
    h.addFenceLine(o.minX, o.minZ, o.maxX, o.minZ);
    h.addFenceLine(o.minX, o.maxZ, o.maxX, o.maxZ);
    h.addFenceLine(o.minX, o.minZ, o.minX, o.maxZ);
    h.addFenceLine(o.maxX, o.minZ, o.maxX, o.gapA);
    h.addFenceLine(o.maxX, o.gapB, o.maxX, o.maxZ);
    /* 内圈：西边留一个门 */
    h.addFenceLine(n.minX, n.minZ, n.maxX, n.minZ);
    h.addFenceLine(n.minX, n.maxZ, n.maxX, n.maxZ);
    h.addFenceLine(n.maxX, n.minZ, n.maxX, n.maxZ);
    h.addFenceLine(n.minX, n.minZ, n.minX, n.gapA);
    h.addFenceLine(n.minX, n.gapB, n.minX, n.maxZ);
    h.block((o.minX + o.maxX) / 2, (o.minZ + o.maxZ) / 2, 14);
    h.block((o.minX + o.maxX) / 2, o.minZ + 2, 9);
    h.block((o.minX + o.maxX) / 2, o.maxZ - 2, 9);

    /* 迷宫正中心：宝箱（每份存档只能拿一次） */
    const chest = Game.makeChest(90, MAZE_PRIZE.x, 0, MAZE_PRIZE.z);
    ctx.scene.add(chest.group);
    ctx.entity(chest);
    h.addSolid(MAZE_PRIZE.x, 0, MAZE_PRIZE.z, 1.1, 0.62, 0.85).noStep = true;
    if (ctx.save.flag('mazePrize')) chest.setOpened();
    ctx.interact({
      kind: 'chest',
      label: '按 E 打开迷宫深处的宝箱 🎁',
      pos: { x: MAZE_PRIZE.x, z: MAZE_PRIZE.z },
      radius: 2.6,
      enabled: function () { return !ctx.save.flag('mazePrize'); },
      onUse: function () {
        if (!chest.open()) return;
        ctx.save.setFlag('mazePrize', true);
        ctx.addCoins(25);
        ctx.particles.burst(
          new THREE.Vector3(MAZE_PRIZE.x, 1, MAZE_PRIZE.z), 0xfff3b0, 22, 1.2);
        Game.Sfx.chest();
        ctx.toast('🎁 找到迷宫里的宝箱！+25 🪙 金币', 'gold', 3400);
        Game.UI.stats({ coins: ctx.director.save.game().coins, items: ctx.itemCount() });
      }
    });
    ctx.data.mazeChest = chest;
  }

  /* ================= 南边：许愿池 ================= */
  function buildWishPool(ctx, h) {
    /* 水面（圆形，浅水可以直接走进去） */
    const water = new THREE.Mesh(
      new THREE.CircleGeometry(POOL.r, 48),
      new THREE.MeshLambertMaterial({ color: 0x63c8ff, emissive: 0x1e4f6a })
    );
    water.rotation.x = -Math.PI / 2;
    water.position.set(POOL.x, 0.06, POOL.z);
    water.receiveShadow = true;
    ctx.scene.add(water);
    h.addRing(POOL.x, POOL.z, POOL.r + 0.5, 1.0, 0xb9bec4);   // 石头池边

    /* 池子中间的小石柱 + 飘着的钱袋 */
    h.addBox(POOL.x, 0, POOL.z, 1.0, 1.4, 1.0, Game.mat(0xb9bec4));
    const bag = Game.makeLabelSprite('💰', 0.9, {
      fontSize: 56, bg: 'rgba(0,0,0,0)', border: 'rgba(0,0,0,0)'
    });
    bag.position.set(POOL.x, 2.2, POOL.z);
    ctx.scene.add(bag);
    ctx.entity({
      animate: function (dt, time) { bag.position.y = 2.2 + Math.sin(time * 2.2) * 0.15; }
    });
    h.block(POOL.x, POOL.z, POOL.r + 3);

    ctx.interact({
      kind: 'wish',
      label: '按 E 投 10 金币许个愿 💰',
      pos: { x: POOL.x, z: POOL.z },
      radius: POOL.r + 2,
      onUse: function () { wish(ctx); }
    });
  }

  function wish(ctx) {
    if (ctx.director.save.game().coins < 10) {
      Game.Sfx.wrong();
      ctx.toast('🪙 金币不够啦，先去捡几枚金币吧（要 10 枚）', 'bad', 3200);
      return;
    }
    ctx.addCoins(-10);
    ctx.particles.burst(new THREE.Vector3(POOL.x, 1.4, POOL.z), 0x9fe4ff, 24, 1.3);
    Game.Sfx.unlock();
    ctx.panel({
      chip: '💰 许愿池',
      title: '愿望说出来就会实现哦～',
      html: '<div class="big-emoji">🌟</div>' +
        '<p class="riddle-q">' + Game.pick(WISHES) + '</p>' +
        '<p class="ui-text">（金币 -10，现在还剩 ' + ctx.director.save.game().coins + ' 枚）</p>',
      actions: [{ label: '好耶！', primary: true, onClick: function (p) { p.close(); } }]
    });
    Game.UI.stats({ coins: ctx.director.save.game().coins, items: ctx.itemCount() });
  }

  /* ================= 南边：小花园 ================= */
  function buildGarden(ctx, h) {
    const G = GARDEN;
    h.addPatch(G.x, G.z, 18, 14, 0x8fd06a);
    const rect = [G.x - 8, G.x + 8, G.z - 6, G.z + 6];
    h.scatter(26, rect, function (x, z) {
      h.makeFlower(x, z, Game.pick([0xff6b6b, 0xffd447, 0x9b6bff, 0xff9fd1, 0xffffff]));
    }, 1.2);
    h.block(G.x, G.z, 12);
    const sign = Game.makeLabelSprite('小花园 🌷', 0.65, {
      fontSize: 44, bg: 'rgba(190,255,200,.96)'
    });
    sign.position.set(G.x, 2.0, G.z - 7.5);
    ctx.scene.add(sign);
  }

  /* ================= 闪光金币 ================= */
  /* ================= 东边：工具台（借充电器，第 8 关风扇小屋要用） ================= */
  function buildToolBench(ctx, h) {
    const B = TOOLBOX;
    const woodMat = new THREE.MeshLambertMaterial({ map: Game.Textures.wood(), color: 0xd8b98a });

    /* 一张工作台：台面 + 台板（都能走上去，不会绊住小朋友） */
    h.addBox(B.x, 0, B.z, 3.2, 0.85, 1.8, woodMat);
    h.addBox(B.x, 0.85, B.z, 3.4, 0.12, 2.0, woodMat);

    /* 台面上摆着的充电器（拿走以后就藏起来） */
    const charger = Game.makeCharger({ x: B.x, y: 0.97, z: B.z });
    ctx.scene.add(charger.group);
    ctx.entity({
      animate: function (dt, time) {
        charger.label.position.y = 1.05 + Math.sin(time * 2.4) * 0.1;
      }
    });

    /* 牌子：远远就能看见「这里能借充电器」 */
    const sign = Game.makeLabelSprite('🔌 工具台 · 借充电器', 0.7, {
      fontSize: 44, bg: 'rgba(255,236,160,.96)'
    });
    sign.position.set(B.x, 2.9, B.z);
    ctx.scene.add(sign);
    h.makeSign('🔌 工具台', B.x, 2.0, B.z + 2.8);
    h.block(B.x, B.z, 4.5);

    const taken = ctx.director.save.flag('hasCharger');
    charger.group.visible = !taken;

    ctx.interact({
      kind: 'tool-bench',
      label: '按 E 借一个充电器 🔌',
      pos: { x: B.x, z: B.z },
      radius: 3.0,
      onUse: function () { borrowCharger(ctx, charger); }
    });
  }

  /* 借充电器：写进「全局开关」，回风扇小屋就能插上电 */
  function borrowCharger(ctx, charger) {
    const save = ctx.director.save;
    if (save.flag('hasCharger')) {
      Game.Sfx.click();
      ctx.toast('🔌 充电器你已经借走啦，回去把它插上吧！', 'gold', 3000, 'charger');
      return;
    }
    save.setFlag('hasCharger', true);
    charger.group.visible = false;
    charger.taken = true;
    Game.Sfx.chest();
    ctx.particles.burst(new THREE.Vector3(TOOLBOX.x, 1.2, TOOLBOX.z), 0x9fd8ff, 20, 1.2);
    ctx.toast('🔌 借到充电器啦！回去装到风扇上就能通电 ⚡', 'gold', 4200, 'charger');
    ctx.director._refreshObjective();
  }

  /* ================= 闪光金币 ================= */
  function buildCoin(ctx, p, i) {
    const rt = ctx.data;
    const group = new THREE.Group();
    const coin = new THREE.Mesh(
      new THREE.CylinderGeometry(0.42, 0.42, 0.12, 18),
      new THREE.MeshLambertMaterial({ color: 0xffd447, emissive: 0x6a4f00 })
    );
    coin.rotation.x = Math.PI / 2;      // 立起来，像一枚真的硬币
    coin.castShadow = true;
    coin.position.y = 0.5;
    group.add(coin);
    const star = Game.makeLabelSprite('✨', 0.55, {
      fontSize: 48, bg: 'rgba(0,0,0,0)', border: 'rgba(0,0,0,0)'
    });
    star.position.y = 1.35;
    group.add(star);
    group.position.set(p.x, 0, p.z);
    ctx.scene.add(group);

    const data = { group: group, mesh: group, taken: false, zone: null };
    data.zone = ctx.zone({
      x: p.x, z: p.z, r: 1.9, once: true,
      onEnter: function () { takeCoin(ctx, data, i); }
    });
    ctx.entity({
      animate: function (dt, time) {
        if (data.taken) return;
        coin.rotation.y += dt * 2.4;
        coin.position.y = 0.5 + Math.sin(time * 2.6 + i) * 0.12;
        star.position.y = 1.35 + Math.sin(time * 2.6 + i) * 0.12;
      }
    });
    rt.coins.push(data);
  }

  function takeCoin(ctx, data, i) {
    if (data.taken) return;
    data.taken = true;
    data.mesh.visible = false;
    const rt = ctx.data;
    rt.coinCount = (rt.coinCount || 0) + 1;
    ctx.addCoins(3);
    ctx.particles.burst(new THREE.Vector3(data.group.position.x, 0.8, data.group.position.z),
      0xffd447, 16, 1.1);
    Game.Sfx.pickup();
    ctx.toast('🪙 捡到一枚金币！(' + rt.coinCount + ' / ' + COIN_SPOTS.length + ')', 'good', 2200);
    Game.UI.stats({ coins: ctx.director.save.game().coins, items: ctx.itemCount() });
    ctx.director._refreshObjective();
  }

  /* ================= 下面是这个关卡自己的小工具函数 ================= */

  function portalLabel(def, status) {
    const name = (def.subtitle ? def.subtitle + ' · ' : '') + def.name;
    if (status === 'locked') return def.icon + ' ' + name + ' 🔒';
    if (status === 'done') return '✅ ' + name;
    return def.icon + ' ' + name;
  }

  /* 根据存档里的进度，刷新每一座门的样子和提示文字 */
  function refreshPortals(ctx) {
    const rt = ctx.data;
    if (!rt || !rt.portals) return;
    rt.portals.forEach(function (p) {
      const status = Game.Levels.statusOf(p.levelId, ctx.director.save);
      if (p.status === status) return;
      p.status = status;
      if (status === 'locked') {
        p.portal.setUnlocked(false).setLabel(portalLabel(p.def, 'locked'));
        if (p.item) p.item.label = '按 E 看看 ' + p.def.name + ' 🔒';
      } else if (status === 'done') {
        p.portal.setUnlocked(true, 0x4dc45a)
          .setLabel(portalLabel(p.def, 'done'), 'rgba(190,255,200,.96)');
        if (p.item) p.item.label = '按 E 再玩一次 ' + p.def.name + ' 🔁';
      } else {
        p.portal.setUnlocked(true).setLabel(portalLabel(p.def, 'open'));
        if (p.item) {
          p.item.label = '按 E 进入' + (p.def.subtitle ? p.def.subtitle + ' ' : ' ') +
            p.def.name + ' 🚪';
        }
      }
    });
  }

  /* 走到门前按 E */
  function enterPortal(ctx, p) {
    const status = Game.Levels.statusOf(p.levelId, ctx.director.save);
    if (status === 'locked') {
      const prev = Game.Levels.prev(p.levelId);
      ctx.toast('🔒 【' + p.def.name + '】还没开呢，先通关【' +
        (prev ? prev.name : '前面的关卡') + '】吧！', 'bad', 3400);
      Game.Sfx.wrong();
      return;
    }
    Game.Sfx.unlock();
    ctx.fx.flash('#e6d4ff', 0.45);
    ctx.go(p.levelId, { from: 'hub-square' });
  }

  /* 村长说的话（跟着进度变） */
  function villageLines(ctx) {
    const save = ctx.director.save;
    const list = Game.Levels.playable();
    const done = Game.Levels.doneCount(save);
    const target = Game.Levels.currentTarget(save);
    const rt = ctx.data || {};
    const lines = [];
    if (done === 0) {
      lines.push('欢迎你，小勇士！这里是方块小镇的中央广场。');
      lines.push('广场那头立着一排传送门，每一座门后面都是一个新世界。');
    } else if (done < list.length) {
      lines.push('真棒！你一共通关了 ' + done + ' 个关卡，太厉害啦！');
    } else {
      lines.push('所有关卡都被你打通了！你已经是方块小镇最强的小勇士啦～');
    }
    if (target && done < list.length) {
      lines.push('现在去【' + target.name + '】看看吧，' +
        (target.subtitle ? target.subtitle + ' ' : '') + '就等着你了！');
    }
    lines.push('小镇变大了好多，够你玩很久啦：东边可以玩「跳跳乐」往上跳，');
    lines.push('西边「小迷宫」里面藏着一个宝箱，南边「许愿池」能许愿，');
    lines.push('南边还有一片「小花园」，地上散着 8 枚金币，快去找一找吧！');
    if (!save.flag('hasCharger') && save.level('fan-cottage').flag('fanMounted')) {
      lines.push('风扇小屋的电还没通上吧？东边工具台上有个充电器，借走就能用啦！');
    }
    if (rt.coinCount) lines.push('你已经捡到 ' + rt.coinCount + ' 枚金币啦，加油！');
    return lines;
  }

  function showHelp(ctx) {
    const rows = Game.Levels.playable().map(function (d) {
      const st = Game.Levels.statusOf(d.id, ctx.director.save);
      const tag = st === 'done' ? '✅ 已通关' : (st === 'locked' ? '🔒 还没开' : '🚪 可以进');
      return '<li>' + d.icon + ' <b>' + (d.subtitle || '') + ' ' + d.name + '</b> —— ' + tag + '</li>';
    }).join('');
    ctx.panel({
      chip: '📖 玩法说明',
      title: '方块小镇 · 广场',
      wide: true,
      html:
        '<p class="ui-text">用 <b>W A S D</b>（或方向键）走路，<b>空格</b> 跳跃，' +
        '<b>鼠标拖拽</b> 转视角，<b>E</b> 说话 / 开门，<b>F</b> 挥武器，<b>Esc</b> 暂停。<br>' +
        '手机上是：左下角摇杆走路，右下角「跳」「打」「E」。</p>' +
        '<h3 class="ui-sub">小镇里可以玩的地方</h3><ul class="ui-list">' +
        '<li>🧱 东边 <b>跳跳乐</b>：三级石台一级一级往上跳，最上面有金杯 🏆（+30 🪙）</li>' +
        '<li>🌀 西边 <b>小迷宫</b>：栅栏围了两圈，走到最里面开宝箱 🎁（+25 🪙）</li>' +
        '<li>💰 南边 <b>许愿池</b>：站到池子边按 E，投 10 枚金币许一个愿</li>' +
        '<li>🌷 南边 <b>小花园</b>：一大片花圃，小羊也会去那里散步</li>' +
        '<li>🔌 东边 <b>工具台</b>：能借到<b>充电器</b>（第 8 关风扇小屋给风扇通电要用）</li>' +
        '<li>🪙 镇上散着 <b>8 枚金币</b>，走过去就能捡（每进小镇都会重新出现）</li>' +
        '</ul>' +
        '<h3 class="ui-sub">小镇里的关卡</h3><ul class="ui-list">' + rows + '</ul>' +
        '<p class="ui-text">走到传送门前按 <b>E</b> 就能进去。通关一个关卡，' +
        '下一关的传送门就会亮起来。</p>',
      actions: [{ label: '知道啦', primary: true, onClick: function (p) { p.close(); } }]
    });
  }
})();

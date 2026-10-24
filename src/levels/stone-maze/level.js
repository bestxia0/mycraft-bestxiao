/* ===================================================================
   levels/stone-maze/level.js   第 7 关 · 石头迷宫
   -------------------------------------------------------------------
   小朋友 2026-10-24 口述（原文见
     transcripts/2026-10-24-第七关石头迷宫-口述.md）：
     "设计一个比较大的迷宫，不能跳跃，保证一定有出口，有多套迷宫随机。
      中间有随机怪物出现。需要攻击，杀死后可获得一定金币和装备。
      有时间要求走到出口。中间可以有金币出现。"

   玩法：
     · 10×10 迷宫格、一格 3 步 = 21×21 格 / 63×63 步（「比较大的迷宫」）
     · 每次进关**换一套新的迷宫**（随机种子；算法保证一定连通 → 出口一定走得到）
     · **不能跳跃**（noJump）—— 墙高 3 步，跳也过不去
     · 迷宫里有小怪兽（按 F 打，打死掉金币 + 有概率掉装备）和金币
     · 3 分钟倒计时；时间到还没走出去 → 自动回小镇重来（和沙漠 / 踩白一个规矩）
     · 出口在东北角或西北角（每次随机一座，有绿色光柱，隔着墙也能看见方向）
     · 剩最后 45 秒才给头顶箭头指出口（E2 提案：怕小朋友在里面绕到没脾气）
   =================================================================== */
(function () {
  const Game = window.Game;
  const M = Game.Maze;                  // props.js 先加载，里面是迷宫 + 怪兽 + 金币

  /* ---------------- 参数表（要调手感就改这里） ---------------- */
  const COLS = 10, ROWS = 10;      // 迷宫格数（10×10 个格子）
  const CELL = 3;                  // 一格 3 步 → 21×21 格、63×63 步
  const TIME_LIMIT = 180;          // 秒：走到出口的限时（3 分钟）
  const HINT_AT = 45;              // 剩多少秒开始给「出口箭头」（E2 提案）
  const MONSTERS = 8;              // 迷宫里有几只小怪兽
  const MONSTER_HP = 4;            // 一只怪兽要打几下（空手 1 下 1 血）
  const MONSTER_MIN_DIST = 8;      // 怪兽离入口至少隔这么多格（别堵在门口）
  const MONSTER_GAP = 4;           // 怪兽之间至少隔这么远（步）
  const COINS = 18;                // 场上金币个数
  const COIN_VALUE = 3;            // 一枚金币值几枚金币（跟广场一个价）
  const MONSTER_COINS = [3, 6];    // 打死一只怪兽掉多少金币
  const DROP_CHANCE = 0.6;         // 打死怪兽掉装备的概率
  const ATTACK_RANGE = 3.4;        // 按 F 能打到多远
  const ATTACK_COOL = 0.34;        // 两下之间最短间隔
  const BITE_RANGE = 1.7;          // 怪兽贴到这么近就咬人
  const BITE_CD = 1.6;             // 咬完要缓一会儿
  const SEE_RANGE = 9;             // 多少步以内、又能一眼看到 → 怪兽开始追
  const WANDER_SPEED = 1.9;        // 怪兽溜达速度
  const CHASE_SPEED = 3.4;         // 怪兽追人速度（比走路慢，跑得掉）
  const PICKUP_R = 1.7;            // 走到多近自动捡金币
  const EXIT_R = 2.4;              // 走到多近算出出口
  const COIN_CLEAR = 50;           // 通关奖励

  const BOUNDS = { minX: -46, maxX: 46, minZ: -46, maxZ: 46 };
  const SPAWN = { x: -27, z: 34 };                 // 出生点：迷宫西南角的门外
  /* 出口的两个候选位置（迷宫格 → 网格格）：东北角 / 西北角。每次进关随机一座。 */
  const EXITS = [
    { gx: (COLS - 1) * 2 + 1, gz: 1 },             // 东北角
    { gx: 1, gz: 1 }                              // 西北角
  ];

  function fmtTime(s) {
    s = Math.max(0, Math.round(s));
    return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  }

  /* 手里的武器有多厉害（背包里最稀有的那件；空手 = 1） */
  function weaponDamage(ctx) {
    const inv = ctx.inventory();
    let best = 0;
    for (const k in inv) {
      const r = Game.itemInfo(k).rarity;
      if (r > best) best = r;
    }
    return [1, 1, 2, 3, 4][best] || 1;
  }
  function bestWeaponRarity(ctx) {
    const inv = ctx.inventory();
    let best = 0;
    for (const k in inv) {
      const r = Game.itemInfo(k).rarity;
      if (r > best) best = r;
    }
    return best;
  }
  /* 打死怪兽掉什么装备：越稀有的越难掉（普通 60% / 稀有 30% / 史诗 10%） */
  function rollDrop(rand) {
    const r = rand();
    const rarity = r < 0.6 ? 1 : (r < 0.9 ? 2 : 3);
    const pool = Game.itemsOfRarity(rarity);
    const list = pool.length ? pool : Game.itemsOfRarity(1);
    return list[(rand() * list.length) | 0];
  }

  Game.Levels.register({
    id: 'stone-maze',             // ★发布后不许改★（存档按 id 分区）
    order: 70,
    name: '石头迷宫',
    subtitle: '第 7 关',
    icon: '🧭',

    noJump: true,                 // 小朋友说的「不能跳跃」
    bounds: BOUNDS,
    spawn: SPAWN,
    camera: { yaw: 0, pitch: 0.44, dist: 11 },
    theme: {
      skyTop: 0x6fb6ff, skyBottom: 0xd6ecff, fog: 0xdceeff, fogNear: 62, fogFar: 175
    },
    hint: '🧭 走出迷宫就通关！这一关不能跳（跳也翻不过墙），路上有金币，' +
      '小怪兽按 F 打掉会掉金币和装备～',

    /* ================= 1. 搭地图（只跑一次） ================= */
    build(ctx) {
      const h = ctx.helpers;
      const B = ctx.bounds;
      const rt = (ctx.data = {
        maze: null, seed: 0, wallGroup: null, wallBoxes: null, wallCount: 0,
        dyn: null, monsters: [], coins: [], exits: [], exit: null, exitPos: null,
        timeLeft: TIME_LIMIT, timerOn: false, won: false, leaving: false,
        kills: 0, bites: 0, coinCount: 0, droppedCount: 0,
        attackCool: 0, hintShown: false, colliderBase: 0, rng: null
      });

      /* ---- 草地 + 边界墙 + 云 ---- */
      h.addGround(B.maxX - B.minX + 16, B.maxZ - B.minZ + 16);
      h.addBounds(B);
      h.addClouds(12);

      /* ---- 迷宫范围里的石头地板（贴一层铺装，跟外墙区分开） ---- */
      const size = (COLS * 2 + 1) * CELL;
      const paving = new THREE.Mesh(
        new THREE.PlaneGeometry(size, size),
        new THREE.MeshLambertMaterial({ map: Game.Textures.paving() })
      );
      paving.rotation.x = -Math.PI / 2;
      paving.position.y = 0.04;
      paving.receiveShadow = true;
      ctx.scene.add(paving);

      /* ---- 出生点：回广场的传送门放「侧面」（不能挡镜头） ---- */
      ctx.returnPortal(SPAWN.x - 8, SPAWN.z - 3, { rotationY: Math.PI * 0.5, r: 1.8 });
      h.block(SPAWN.x - 8, SPAWN.z - 3, 4);
      h.block(SPAWN.x, SPAWN.z, 6);

      /* ---- 木牌：把玩法写清楚 ---- */
      h.makeSign('🧭 走出迷宫就通关', SPAWN.x + 9, 2.6, SPAWN.z - 4, { rotationY: 0.4, w: 5.4 });
      h.makeSign('👹 按 F 打怪兽 → 掉金币和装备', SPAWN.x - 1, 2.6, SPAWN.z - 8, { rotationY: -0.3, w: 6.2 });
      h.block(SPAWN.x + 9, SPAWN.z - 4, 3.5);
      h.block(SPAWN.x - 1, SPAWN.z - 8, 3.5);

      /* ---- 迷宫外面的装饰（不会长到迷宫里面去） ---- */
      const rim = [
        [B.minX + 4, B.maxX - 4, 36, B.maxZ - 4],
        [B.minX + 4, -38, -30, 30],
        [38, B.maxX - 4, -30, 30],
        [B.minX + 4, B.maxX - 4, B.minZ + 4, -36]
      ];
      rim.forEach(function (r) {
        h.scatter(6, r, function (x, z) { h.makeTree(x, z, Game.rand(0.9, 1.4)); }, 4);
        h.scatter(9, r, function (x, z) { h.makeFlower(x, z, Game.pick([0xff6b6b, 0xffd447, 0xc08bff])); }, 1.4);
        h.scatter(5, r, function (x, z) { h.makeRock(x, z, Game.rand(0.7, 1.5)); }, 4);
      });

      /* ---- 墙 / 怪兽 / 金币都挂在两个 Group 上，重新进关时整个清掉重造 ---- */
      rt.wallGroup = new THREE.Group();
      rt.wallGroup.name = 'maze-walls';
      ctx.scene.add(rt.wallGroup);
      rt.dyn = new THREE.Group();
      rt.dyn.name = 'maze-dyn';
      ctx.scene.add(rt.dyn);

      /* ---- 两个候选出口：都先造好、都藏起来，进关时随机亮一个 ---- */
      EXITS.forEach(function (e) {
        const w = { x: (e.gx - COLS) * CELL, z: (e.gz - ROWS) * CELL };
        const portal = ctx.portal(w.x, w.z, {
          label: '🚪 出口', color: 0x4dc45a, r: 1.7,
          rotationY: Math.atan2(-w.x, -w.z), labelBg: 'rgba(214,255,214,.96)'
        });
        portal.group.visible = false;
        /* 绿色光柱：隔着迷宫墙也能看到「出口在那一头」 */
        const beam = new THREE.Mesh(
          new THREE.BoxGeometry(1.5, 12, 1.5),
          new THREE.MeshBasicMaterial({
            color: 0x9dffb0, transparent: true, opacity: 0.18, depthWrite: false
          })
        );
        beam.position.y = 5;
        portal.group.add(beam);
        rt.exits.push({ cell: e, portal: portal, beam: beam, pos: w });
      });

      /* 记下「到这儿为止的碰撞盒数量」：这个位置之前的（地面 / 边界 / 回城门 / 出口）
         每次进关都留着，之后的（迷宫墙）每次进关整批换掉。 */
      rt.colliderBase = ctx.colliders.length;
    },

    /* ================= 2. 每次进关：换一套新迷宫 ================= */
    onEnter(ctx) {
      const rt = ctx.data;
      const maze = M;

      /* 上一次的墙：网格清掉、碰撞盒整批剪掉（只留下出生点那一批） */
      ctx.colliders.length = rt.colliderBase;
      maze.clearGroup(rt.wallGroup);

      /* 换一套新迷宫：随机一颗种子（同一颗种子 = 同一座迷宫，测试靠这个） */
      rt.seed = (Math.random() * 1e9) | 0;
      rt.rng = maze.mulberry32((rt.seed ^ 0x9e3779b9) >>> 0);
      rt.maze = maze.generate({ cols: COLS, rows: ROWS, seed: rt.seed });

      const built = maze.buildWalls(ctx, rt.maze, CELL);
      rt.wallGroup.add(built.group);
      rt.wallBoxes = built.boxes;
      rt.wallCount = built.meshCount;

      /* 出口：两个候选里随机亮一个 */
      const ei = (rt.rng() * rt.exits.length) | 0;
      rt.exits.forEach(function (e, i) {
        e.portal.group.visible = (i === ei);
        e.portal.setUnlocked(true, 0x4dc45a);
      });
      rt.exit = rt.exits[ei];
      rt.exitPos = rt.exit.pos;

      /* ---- 清掉上一次的怪兽 / 金币 ---- */
      maze.clearGroup(rt.dyn);
      rt.monsters = [];
      rt.coins = [];

      const used = {};                       // 已经被占掉的格子（怪兽/金币不要叠在一起）
      const takeCell = function (minDist, preferDeadEnd) {
        for (let tries = 0; tries < 400; tries++) {
          const gx = 1 + ((rt.rng() * (rt.maze.gw - 2)) | 0);
          const gz = 1 + ((rt.rng() * (rt.maze.gh - 2)) | 0);
          if (rt.maze.isWall(gx, gz)) continue;
          const key = gx + ',' + gz;
          if (used[key]) continue;
          if (rt.maze.dist[gz * rt.maze.gw + gx] < minDist) continue;
          /* 出口那一格留给出口 */
          if (gx === rt.exit.cell.gx && gz === rt.exit.cell.gz) continue;
          if (preferDeadEnd && !rt.maze.deadEnd(gx, gz)) continue;
          used[key] = 1;
          return { gx: gx, gz: gz };
        }
        return null;
      };

      /* ---- 小怪兽：随机撒在离入口至少 8 格的走廊里 ---- */
      const monsterPos = [];
      for (let i = 0; i < MONSTERS; i++) {
        let cell = null;
        for (let tries = 0; tries < 60 && !cell; tries++) {
          const c = takeCell(MONSTER_MIN_DIST, false);
          if (!c) break;
          const w = rt.maze.gridToWorld(c.gx, c.gz, CELL);
          const far = monsterPos.every(function (q) {
            return Math.hypot(q.x - w.x, q.z - w.z) >= MONSTER_GAP;
          });
          if (far) cell = { c: c, w: w };
        }
        if (!cell) continue;
        monsterPos.push(cell.w);
        const mon = maze.makeMonster({
          x: cell.w.x, z: cell.w.z, kind: i % maze.KINDS.length, hp: MONSTER_HP
        });
        mon.cell = { gx: cell.c.gx, gz: cell.c.gz };
        mon.from = null;
        /* 随便挑一个能走的方向当第一个目标格 */
        const first = pickNeighbor(rt, mon.cell, null, rt.rng);
        mon.next = first;
        const fw = rt.maze.gridToWorld(first.gx, first.gz, CELL);
        mon.tx = fw.x; mon.tz = fw.z;
        rt.dyn.add(mon.group);
        rt.monsters.push(mon);
      }

      /* ---- 金币：撒在走廊里，其中一部分专门放在死胡同（奖励探索） ---- */
      for (let i = 0; i < COINS; i++) {
        const wantDeadEnd = i % 3 === 0;
        let c = takeCell(4, wantDeadEnd) || takeCell(4, false);
        if (!c) continue;
        const w = rt.maze.gridToWorld(c.gx, c.gz, CELL);
        const coin = maze.makeCoin({ x: w.x, z: w.z, value: COIN_VALUE, phase: i });
        rt.dyn.add(coin.group);
        rt.coins.push(coin);
      }

      /* ---- 状态复位 ---- */
      rt.timeLeft = TIME_LIMIT;
      rt.timerOn = true;               // 一进迷宫就开始算 3 分钟
      rt.won = false;
      rt.leaving = false;
      rt.kills = 0;
      rt.bites = 0;
      rt.coinCount = 0;
      rt.droppedCount = 0;
      rt.attackCool = 0;
      rt.hintShown = false;

      /* 手里拿着背包里最好的那件武器（和擂台关一个规矩） */
      const best = bestWeaponRarity(ctx);
      if (best > 0) ctx.player.setTier(best - 1);

      ctx.player.teleport(SPAWN.x, SPAWN.z, 0, ctx.def.camera);
      Game.UI.battle({ time: rt.timeLeft });
      ctx.director._refreshObjective();
    },

    /* ================= 3. 每帧逻辑 ================= */
    update(dt, time, ctx) {
      const rt = ctx.data;
      if (!rt || rt.won || rt.leaving) return;
      const pl = ctx.player;
      const p = pl.pos;

      /* ---------- 3 分钟倒计时 ---------- */
      if (rt.timerOn) {
        rt.timeLeft -= dt;
        if (rt.timeLeft <= 0) {
          rt.timeLeft = 0;
          fail(ctx);
          return;
        }
        Game.UI.battle({ time: rt.timeLeft });
        /* 剩最后 45 秒：提醒一次「箭头开始指路」 */
        if (!rt.hintShown && rt.timeLeft <= HINT_AT) {
          rt.hintShown = true;
          Game.Sfx.click();
          ctx.toast('🕐 时间不多了！头顶的箭头开始指向出口 ➡', 'gold', 4200, 'maze-hint');
        }
      }
      if (rt.attackCool > 0) rt.attackCool -= dt;

      /* ---------- 按 F 打怪兽 ---------- */
      if (pl.consumeAttack() && rt.attackCool <= 0) {
        rt.attackCool = ATTACK_COOL;
        pl.swing();
        attackMonsters(ctx);
      }

      /* ---------- 金币：走过去自动捡 ---------- */
      rt.coins.forEach(function (c) {
        if (c.taken) return;
        const g = c.group.position;
        if (Math.hypot(g.x - p.x, g.z - p.z) < PICKUP_R) takeCoin(ctx, c);
        else c.animate(dt, time);
      });

      /* ---------- 小怪兽 ---------- */
      rt.monsters.forEach(function (m) {
        if (!m.alive) return;
        updateMonster(ctx, m, dt, time);
        m.animate(dt, time);
      });

      /* ---------- 走到出口 = 通关 ---------- */
      if (Math.hypot(rt.exitPos.x - p.x, rt.exitPos.z - p.z) < EXIT_R) win(ctx);
    },

    /* ================= 4. 任务条 + 出口箭头 ================= */
    objective(ctx) {
      const rt = ctx.data || {};
      if (rt.won) {
        return { text: '🏁 你走出迷宫啦！', target: null };
      }
      const alive = (rt.monsters || []).filter(function (m) { return m.alive; }).length;
      const late = rt.timeLeft !== undefined && rt.timeLeft <= HINT_AT;
      return {
        text: (late ? '🕐 时间不多了，跟上箭头！' : '🧭 找到迷宫出口！（这一关不能跳）') +
          ' 还剩 ' + fmtTime(rt.timeLeft || 0) +
          ' · 怪兽 ' + ((rt.monsters || []).length - alive) + '/' + (rt.monsters || []).length +
          ' · 金币 ' + (rt.coinCount || 0),
        target: late ? rt.exitPos : null,
        progress: { label: '🪙 捡到的金币', value: rt.coinCount || 0, max: COINS }
      };
    }
  });

  /* ================= 怪兽：挑下一格 ================= */
  function pickNeighbor(rt, cell, avoid, rand) {
    const maze = rt.maze;
    const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    const open = [];
    for (let k = 0; k < 4; k++) {
      const gx = cell.gx + DIRS[k][0], gz = cell.gz + DIRS[k][1];
      if (maze.isWall(gx, gz)) continue;
      if (avoid && gx === avoid.gx && gz === avoid.gz) continue;
      open.push({ gx: gx, gz: gz });
    }
    const list = open.length ? open : [{ gx: cell.gx, gz: cell.gz }];
    return list[(rand() * list.length) | 0];
  }

  /* ================= 怪兽：每帧（溜达 / 追人 / 咬人） ================= */
  function updateMonster(ctx, m, dt, time) {
    const rt = ctx.data;
    const maze = rt.maze;
    const p = ctx.player.pos;
    const g = m.group.position;
    const d = Math.hypot(p.x - g.x, p.z - g.z);
    const pc = maze.worldToGrid(p.x, p.z, CELL);
    const canSee = d < SEE_RANGE && !maze.isWall(pc.gx, pc.gz) &&
      maze.lineOfSight(m.cell, pc);
    m.alert = canSee;
    m.speedNow = canSee ? CHASE_SPEED : WANDER_SPEED;

    /* 走到目标格中心了 → 挑下一格 */
    let dx = m.tx - g.x, dz = m.tz - g.z;
    let dd = Math.hypot(dx, dz);
    if (dd < 0.2) {
      m.cell = { gx: m.next.gx, gz: m.next.gz };
      let next = null;
      if (canSee) {
        /* 追人：四个方向里挑一个离小朋友更近的 */
        next = chaseNeighbor(rt, m.cell, pc);
      }
      if (!next) next = pickNeighbor(rt, m.cell, m.from, rt.rng);
      m.from = m.cell;
      m.next = next;
      const w = maze.gridToWorld(next.gx, next.gz, CELL);
      m.tx = w.x; m.tz = w.z;
      dx = m.tx - g.x; dz = m.tz - g.z; dd = Math.hypot(dx, dz) || 1;
    }
    if (dd > 0.05) {
      const step = Math.min(dd, m.speedNow * dt);
      g.x += (dx / dd) * step;
      g.z += (dz / dd) * step;
      m.group.rotation.y = Math.atan2(dx, dz);
    }

    /* 咬人：贴到 1.7 步内就推小朋友一把（不会掉血、不会失败） */
    if (m.biteCd > 0) m.biteCd -= dt;
    if (d < BITE_RANGE && m.biteCd <= 0) {
      m.biteCd = BITE_CD;
      rt.bites++;
      ctx.player.knockback(p.x - g.x, p.z - g.z, 8, 3.2, 0.3);
      Game.Sfx.wrong();
      ctx.toast('👹 被小怪兽咬了一口！按 F 打它 🪄', 'bad', 1800, 'maze-bite');
    }
  }

  function chaseNeighbor(rt, cell, target) {
    const maze = rt.maze;
    const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    let best = null, bestD = Infinity;
    for (let k = 0; k < 4; k++) {
      const gx = cell.gx + DIRS[k][0], gz = cell.gz + DIRS[k][1];
      if (maze.isWall(gx, gz)) continue;
      const dd = Math.abs(gx - target.gx) + Math.abs(gz - target.gz);
      if (dd < bestD) { bestD = dd; best = { gx: gx, gz: gz }; }
    }
    return best;
  }

  /* ================= 打怪兽 ================= */
  function attackMonsters(ctx) {
    const rt = ctx.data;
    const p = ctx.player.pos;
    const dir = ctx.player.faceDir();
    const dmg = weaponDamage(ctx);
    let hit = 0, nearest = null, nearestD = Infinity;
    rt.monsters.forEach(function (m) {
      if (!m.alive) return;
      const g = m.group.position;
      const dx = g.x - p.x, dz = g.z - p.z;
      const d = Math.hypot(dx, dz);
      if (d > ATTACK_RANGE) return;
      if (d < nearestD) { nearestD = d; nearest = m; }
      const dot = d < 0.001 ? 1 : (dx / d) * dir.x + (dz / d) * dir.z;
      if (dot < 0.15) return;                    // 不在挥武器的方向
      hurtMonster(ctx, m, dmg, dx, dz);
      hit++;
    });
    /* 小朋友有时候会背对着怪兽按键，也帮他打最近的那一只 */
    if (!hit && nearest && nearestD <= ATTACK_RANGE) {
      const g = nearest.group.position;
      hurtMonster(ctx, nearest, dmg, g.x - p.x, g.z - p.z);
      hit++;
    }
    if (!hit) Game.Sfx.click();
  }

  function hurtMonster(ctx, m, dmg, dx, dz) {
    const rt = ctx.data;
    const g = m.group.position;
    m.damage(dmg);
    Game.Sfx.hit();
    ctx.fx.shake(0.08, 0.16);
    ctx.particles.burst(new THREE.Vector3(g.x, 1.2, g.z), 0xfff1c9, 8, 0.7);
    if (m.hp > 0) return;
    /* ---- 打死了：掉金币 + 有概率掉装备 ---- */
    m.alive = false;
    rt.kills++;
    const coins = MONSTER_COINS[0] +
      ((rt.rng() * (MONSTER_COINS[1] - MONSTER_COINS[0] + 1)) | 0);
    ctx.addCoins(coins);
    ctx.particles.burst(new THREE.Vector3(g.x, 1.2, g.z), m.kind.body, 26, 1.4);
    Game.Sfx.chest();
    let extra = '';
    if (rt.rng() < DROP_CHANCE) {
      const id = rollDrop(rt.rng);
      ctx.grantItem(id, 1);
      const info = Game.itemInfo(id);
      rt.droppedCount++;
      extra = '，掉了「' + info.emoji + ' ' + info.name + '」';
    }
    ctx.toast('💥 打倒一只' + m.kind.name.replace(/^\S+\s*/, '') + '！+ ' + coins + ' 🪙' + extra,
      'good', 2600, 'maze-kill');
    rt.dyn.remove(m.group);
    ctx.director._refreshObjective();
  }

  /* ================= 捡金币 ================= */
  function takeCoin(ctx, c) {
    const rt = ctx.data;
    if (c.taken) return;
    c.taken = true;
    rt.coinCount++;
    ctx.addCoins(c.value);
    Game.Sfx.pickup();
    const g = c.group.position;
    ctx.particles.burst(new THREE.Vector3(g.x, 0.7, g.z), 0xffd447, 10, 0.8);
    rt.dyn.remove(c.group);
    ctx.director._refreshObjective();
  }

  /* ================= 时间到 → 自动回小镇重来 ================= */
  function fail(ctx) {
    const rt = ctx.data;
    if (rt.leaving || rt.won) return;
    rt.leaving = true;
    rt.timerOn = false;
    Game.UI.battle(null);
    Game.Sfx.wrong();
    ctx.save.set('attempts', (ctx.save.get('attempts', 0)) + 1);
    ctx.toast('⏰ 时间到啦！还没走出迷宫 —— 先回小镇歇一会儿，下次换一座新迷宫再试～',
      'bad', 3400, 'maze-fail');
    setTimeout(function () {
      if (Game.Director.active === ctx && !rt.won) ctx.goHub();
    }, 1700);
  }

  /* ================= 走出迷宫 ================= */
  function win(ctx) {
    const rt = ctx.data;
    if (rt.won || rt.leaving) return;
    rt.won = true;
    rt.timerOn = false;
    Game.UI.battle(null);
    Game.Sfx.unlock();
    ctx.fx.flash('#d8ffe0', 0.6);
    ctx.particles.burst(new THREE.Vector3(rt.exitPos.x, 2, rt.exitPos.z), 0x9dffb0, 34, 1.8);

    const used = Math.round(TIME_LIMIT - Math.max(0, rt.timeLeft));
    const oldBest = ctx.save.get('best', 0);
    const best = (!oldBest || used < oldBest) ? used : oldBest;
    ctx.save.set('best', best);
    ctx.save.set('cleared', (ctx.save.get('cleared', 0)) + 1);
    ctx.save.addNumber('kills', rt.kills);
    ctx.save.addNumber('coins', rt.coinCount);

    ctx.complete({
      chip: '🧭 走出迷宫',
      title: '你从石头迷宫里走出来了！',
      coins: COIN_CLEAR,
      html: '<p class="ui-text">迷宫是 <b>' + rt.maze.cols + ' × ' + rt.maze.rows + '</b> 格的，' +
        '这一座的编号 <b>#' + rt.maze.seed + '</b>，你用时 <b>' + fmtTime(used) + '</b>，' +
        '还剩 <b>' + fmtTime(Math.max(0, rt.timeLeft)) + '</b>。</p>' +
        '<p class="ui-text">👹 打倒怪兽 <b>' + rt.kills + '</b> 只' +
        '（掉了 <b>' + rt.droppedCount + '</b> 件装备）　🪙 捡到 <b>' + rt.coinCount + '</b> 枚金币　' +
        '🦷 被咬 <b>' + rt.bites + '</b> 口</p>' +
        '<p class="ui-text">🥇 最快一次：<b>' + fmtTime(best) + '</b>　🪙 奖励 <b>' + COIN_CLEAR + '</b> 金币</p>' +
        '<p class="ui-text">（每次进来都是**另一座迷宫**，再玩一次看能不能更快～）</p>'
    });
  }
})();

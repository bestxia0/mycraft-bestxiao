/* ===================================================================
   levels/desert-escape/level.js   第 5 关 · 沙漠逃亡（骑小马跑出沙漠）
   -------------------------------------------------------------------
   这关来自小朋友的口述（原话见 levels/L06-沙漠逃亡.md）：
     · 一大片沙漠，里面有小马 —— 按 F 打它一下，就骑上去了
     · 骑着马用 W A S D 跑，要逃出这片沙漠
     · 2 分钟时间里跑不出去 → 自动送回小镇，重新来这一关
     · 头顶的箭头只给「大概方向」，不是完全正确的方向
     · 沙漠里还有小龙卷风、仙人掌，和一些能打的动物（小蛇）

   玩法（一局大概 2 分钟，第一次没跑成再来一次，加起来约 5 分钟）：
     1. 进关先在身边找一匹小马 → 走到跟前按 F 骑上去
     2. 头顶箭头指着「大概方向」，照着跑；看到小龙卷风绕着走
     3. 仙人掌挡路（撞上会被扎一下），小蛇会咬人（按 F 能把它打飞）
     4. 跑到西北边的绿洲大门口 = 逃出沙漠 🏝

   想调难度：改下面「参数表」里的数字就行（都很直白）。
   =================================================================== */
(function () {
  const Game = window.Game;

  /* ---------------- 参数表（调手感只改这一段） ---------------- */
  const TIME_LIMIT = 120;        // 秒：小朋友说的「2 分钟」
  const FROM_MOUNT = false;      // false = 一进沙漠就开始倒计时（原话就是这么说的）
  const HORSE_SPEED = 12;        // 骑马速度（走路是 6.2，马快一倍）
  const SPRINT_MUL = 1.7;        // 骑马按 F 冲刺时的速度倍率
  const SPRINT_TIME = 1.5;       // 冲刺持续秒数
  const SPRINT_CD = 4.5;         // 冲刺冷却秒数
  const HORSE_MAX = 12;          // 场上最多几匹马
  const HORSE_EVERY = 16;        // 每多少秒随机跑来一匹新马
  const LABEL_NEAR = 45;         // 马离多远之内才挂「按 F 骑上去」的牌子（远了不挂，免得满屏标签）
  const ARROW_OFF = 0.32;        // 箭头最多偏多少弧度（≈18°）—— 只给大概方向
  const RIDE_Y = 1.6;            // 骑马时玩家抬多高（坐在马鞍上）
  const WIND_R = 5.5;            // 小龙卷风的吸力半径
  const SNAKE_BITE = 1.5;        // 小蛇咬人的距离
  const HIT_HORSE = 3.6;         // 按 F 能打到马的距离
  const HIT_SNAKE = 3.0;         // 按 F 能打到蛇的距离
  const HIT_CACTUS = 3.0;        // 按 F 能打碎仙人掌的距离
  const TOUCH_CAC = 1.7;         // 贴到仙人掌多远会被扎
  const COIN_ESCAPE = 30;        // 逃出去给多少金币
  const COIN_SNAKE = 2;          // 打飞一条蛇
  const COIN_CACTUS = 1;         // 打碎一棵仙人掌

  const BOUNDS = { minX: -150, maxX: 150, minZ: -150, maxZ: 150 };
  const SPAWN = { x: 0, z: 128 };            // 出生点：沙漠南边（小镇门口）
  const EXIT = { x: -120, z: -128, r: 9 };   // 出口：西北边的绿洲（直线约 280 步）

  function fmtTime(s) {
    const t = Math.max(0, Math.ceil(s));
    return Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0');
  }

  /* ---------------- 小工具：找最近的马 ---------------- */
  function nearestHorse(rt, x, z, maxD) {
    let best = null, bestD = maxD === undefined ? Infinity : maxD;
    (rt.horses || []).forEach(function (h) {
      const d = Math.hypot(h.group.position.x - x, h.group.position.z - z);
      if (d < bestD) { bestD = d; best = h; }
    });
    return best;
  }

  /* ---------------- 小工具：骑马时躲开仙人掌 ---------------- */
  function avoidCacti(rt, x, z) {
    (rt.cacti || []).forEach(function (c) {
      const dx = x - c.x, dz = z - c.z;
      const d = Math.hypot(dx, dz);
      const need = c.r + 0.9;
      if (d < need && d > 0.001) {
        x = c.x + (dx / d) * need;
        z = c.z + (dz / d) * need;
      }
    });
    return { x: x, z: z };
  }

  /* ---------------- 小工具：找一个空地方放马 ---------------- */
  function randomSpot(ctx, minD, maxD) {
    const rt = ctx.data;
    const p = ctx.player.pos;
    for (let i = 0; i < 20; i++) {
      const a = Game.rand(0, Math.PI * 2);
      const d = Game.rand(minD, maxD);
      const x = Game.clamp(p.x + Math.cos(a) * d, BOUNDS.minX + 6, BOUNDS.maxX - 6);
      const z = Game.clamp(p.z + Math.sin(a) * d, BOUNDS.minZ + 6, BOUNDS.maxZ - 6);
      if (Math.hypot(x - EXIT.x, z - EXIT.z) < EXIT.r + 6) continue;
      let bad = false;
      rt.cacti.forEach(function (c) { if (Math.hypot(c.x - x, c.z - z) < 4) bad = true; });
      if (bad) continue;
      return { x: x, z: z };
    }
    return null;
  }

  Game.Levels.register({
    id: 'desert-escape',        // ★ 定下来就别改了（存档按 id 分区）★
    order: 50,
    name: '沙漠逃亡',
    subtitle: '第 5 关',
    icon: '🐎',
    bounds: BOUNDS,
    spawn: SPAWN,
    camera: { yaw: 0, pitch: 0.34, dist: 10 },
    theme: {
      skyTop: 0x3d86d6, skyBottom: 0xf7d79b, fog: 0xeed7a4,
      fogNear: 18, fogFar: 132, sun: 0xfff0c0, ambient: 0.86
    },
    hint: '🌵 沙漠好热！找一匹小马按 F 骑上去，2 分钟里跑出去～',

    /* ================= 1. 搭地图（只跑一次） ================= */
    build(ctx) {
      const h = ctx.helpers;
      const B = ctx.bounds;
      const D = Game.Desert;
      const rt = (ctx.data = {
        horses: [], snakes: [], cacti: [], winds: [],
        ride: null, timeLeft: TIME_LIMIT, timerOn: false,
        arrow: { x: EXIT.x, z: EXIT.z }, won: false, leaving: false,
        windCd: 0, sprintT: 0, sprintCd: 0, horseTimer: HORSE_EVERY,
        touchCd: 0, snakesHit: 0, mounts: 0, elapsed: 0, zone: null, dismountItem: null
      });

      /* ---- 沙地 + 边界 + 云 ----
         h.addGround 用的是草地贴图（染成黄色会变军绿），所以下面垫一层当「地基」，
         真正的沙地在 props.js 里自己画贴图铺上去（y 高一点点，不会打架）。 */
      const GW = B.maxX - B.minX, GD = B.maxZ - B.minZ;
      h.addGround(GW + 14, GD + 14, 0xffffff);
      D.addSand(ctx.scene, GW + 36, GD + 36, 0.05);
      h.addBounds(B);
      h.addClouds(12, 8);
      h.block(SPAWN.x, SPAWN.z, 18);      // 出生点附近别长仙人掌
      h.block(EXIT.x, EXIT.z, 20);        // 绿洲门口也别长

      /* ---- 出生点：回广场的传送门（放侧面，不能挡镜头） ---- */
      ctx.returnPortal(SPAWN.x - 9, SPAWN.z - 2, { rotationY: Math.PI * 0.5, r: 1.8 });
      h.makeSign('沙漠 · 出口在西北边', SPAWN.x + 6, 2.4, SPAWN.z - 5, { rotationY: 0.5 });
      h.block(SPAWN.x + 6, SPAWN.z - 5, 3);

      /* ---- 出口：西北边的绿洲（水池 + 树 + 石拱门） ---- */
      const pool = { x: EXIT.x + 20, z: EXIT.z + 16 };
      D.addFlat(ctx.scene, pool.x, pool.z, 34, 22, 0x63c8ff, 0.09);        // 绿洲水池
      D.addFlat(ctx.scene, EXIT.x, EXIT.z + 7, 24, 15, 0xb6dc94, 0.12);    // 门口一小片草地
      h.makeArch(EXIT.x, 3.7, EXIT.z, { r: 3.2, color: 0xd9c69a, coreColor: 0x9fe8ff, rotationY: 0 });
      [[-11, 2], [11, -1], [-4, 13], [9, 12], [1, -11]].forEach(function (t) {
        const tx = pool.x + t[0], tz = pool.z + t[1];
        h.makeTree(tx, tz, Game.rand(1.05, 1.35));
        h.block(tx, tz, 3.5);
      });
      const exitLabel = Game.makeLabelSprite('🏝 沙漠出口', 1.1, { fontSize: 54 });
      exitLabel.position.set(EXIT.x, 8.6, EXIT.z);
      ctx.scene.add(exitLabel);
      rt.zone = ctx.zone({
        x: EXIT.x, z: EXIT.z, r: EXIT.r, once: true,
        onEnter: function () { win(ctx); }
      });

      /* ---- 仙人掌（挡路 + 能打碎） ---- */
      const rect = [B.minX + 6, B.maxX - 6, B.minZ + 6, B.maxZ - 6];
      h.scatter(58, rect, function (x, z) {
        const s = Game.rand(0.85, 1.5);
        const green = Game.mat(Game.pick([0x2f9e46, 0x3fae52, 0x218a38]));
        const trunk = h.addBox(x, 0, z, 0.9 * s, 2.6 * s, 0.9 * s, green, { noStep: true });
        h.addBox(x, 2.6 * s, z, 0.34, 0.2 * s, 0.34, Game.mat(0xffc93c));   // 顶上小黄花
        if (Math.random() < 0.6) {
          h.addBox(x + 0.9 * s, 1.5 * s, z, 0.7 * s, 0.5 * s, 0.7 * s, green, { collide: false });
        }
        rt.cacti.push({ x: x, z: z, r: 0.85 * s, solid: trunk, alive: true, s: s, green: green });
      }, 4.5);

      /* ---- 三棵超大仙人掌：半路的地标（远处也能看见） ---- */
      [[-42, 26], [-86, -30], [30, -60]].forEach(function (p) {
        const base = h.addBox(p[0], 0, p[1], 2.4, 13, 2.4, Game.mat(0x218a38), { noStep: true });
        h.scatter(3, [p[0] - 6, p[0] + 6, p[1] - 6, p[1] + 6], function (x, z) {
          h.addBox(x, 0, z, 1.2, Game.rand(3, 6), 1.2, Game.mat(0x2f9e46), { noStep: true });
        }, 1);
        rt.cacti.push({ x: p[0], z: p[1], r: 1.7, solid: base, alive: true, s: 2, green: Game.mat(0x218a38) });
        h.block(p[0], p[1], 9);
      });

      /* ---- 沙漠装饰：石头 / 沙丘 / 枯草 / 木牌 ---- */
      h.scatter(26, rect, function (x, z) { h.makeRock(x, z, Game.rand(0.8, 2.2)); }, 4);
      h.scatter(34, rect, function (x, z) {
        /* 沙丘：颜色和高度都随机一点点，叠在一起也不会闪 */
        D.addFlat(ctx.scene, x, z, Game.rand(7, 15), Game.rand(6, 12),
          Game.pick([0xe3cd99, 0xdcc48c, 0xeadaae]), 0.06 + Math.random() * 0.015, Game.rand(0, 3));
      }, 0.5);
      h.scatter(26, rect, function (x, z) {
        h.addBox(x, 0, z, 0.16, Game.rand(0.5, 1.0), 0.16, Game.mat(0xc8b071), { collide: false });
      }, 2.5);
      h.makeSign('前面好热，快跑！', -20, 2.2, 40, { rotationY: -0.6, w: 3.6 });
      h.makeSign('小马跑得比你快 🐎', 34, 2.2, -12, { rotationY: 0.9, w: 4.0 });
      h.block(-20, 40, 3.5);
      h.block(34, -12, 3.5);

      /* ---- 小龙卷风（4 个，会自己游走） ---- */
      [[-30, 60], [24, 34], [-58, -10], [-6, -46]].forEach(function (p) {
        const tw = D.makeTornado({ x: p[0], z: p[1], r: Game.rand(3.0, 3.9) });
        ctx.scene.add(tw.group);
        rt.winds.push(tw);
      });

      /* ---- 小蛇（会咬人，按 F 能打飞） ---- */
      h.scatter(16, rect, function (x, z) {
        const s = D.makeSnake({ x: x, z: z });
        ctx.scene.add(s.group);
        s.home.set(x, 0, z);
        rt.snakes.push(s);
      }, 5);

      /* ---- 一开始的马：出生点旁边就有一匹（不然小朋友找不到） ---- */
      const startSpots = [
        [SPAWN.x + 5, SPAWN.z - 6], [SPAWN.x - 4, SPAWN.z - 14], [SPAWN.x + 12, SPAWN.z - 2],
        [SPAWN.x - 14, SPAWN.z - 20], [SPAWN.x + 8, SPAWN.z - 30], [SPAWN.x - 6, SPAWN.z - 40],
        [SPAWN.x + 20, SPAWN.z - 48], [SPAWN.x - 18, SPAWN.z - 56]
      ];
      startSpots.forEach(function (p) {
        const horse = D.makeHorse({ x: p[0], z: p[1], heading: Math.PI });
        ctx.scene.add(horse.group);
        h.block(p[0], p[1], 3.5);
        rt.horses.push(horse);
      });

      /* ---- 「按 E 下马」的交互（骑马时才出现） ---- */
      rt.dismountItem = ctx.interact({
        kind: 'dismount',
        label: '按 E 下马 🐴',
        pos: { x: 9999, z: 9999 },
        radius: 3.6,
        enabled: function () { return !!ctx.data.ride; },
        onUse: function () { dismount(ctx); }
      });
    },

    /* ================= 2. 每次进关（都当成一次全新挑战） ================= */
    onEnter(ctx) {
      const rt = ctx.data;
      rt.ride = null;
      rt.won = false;
      rt.leaving = false;
      rt.timeLeft = TIME_LIMIT;
      rt.timerOn = true;               // 一进沙漠就开始倒计时
      rt.windCd = 0;
      rt.sprintT = 0;
      rt.sprintCd = 0;
      rt.touchCd = 0;
      rt.horseTimer = HORSE_EVERY;
      rt.elapsed = 0;
      rt.arrow.x = EXIT.x;
      rt.arrow.z = EXIT.z;
      if (rt.zone) rt.zone.triggered = false;     // 出口还能再触发（失败重来时用）

      rt.horses.forEach(function (h) {
        h.ridden = false;
        h.speedNow = 0;
        h.label.visible = true;
        h.group.position.set(h.home.x, 0, h.home.z);
        h.target.set(h.home.x, 0, h.home.z);
        h.wait = Game.rand(0.5, 3);
      });
      rt.snakes.forEach(function (s) {
        s.biteCd = 0;
        s.vel.x = 0; s.vel.z = 0;
        s.group.position.set(s.home.x, 0, s.home.z);
      });

      ctx.player.teleport(SPAWN.x, SPAWN.z, 0, ctx.def.camera);
      /* 顶部大倒计时（引擎的计时条）。只传时间：
         血条和「对手 N」不传就自动藏起来 —— 沙漠关只要一个倒计时。 */
      Game.UI.battle({ time: rt.timeLeft });
      ctx.toast('🐎 旁边就有一匹小马，走到跟前按 F 骑上去！', 'gold', 4200, 'desert-go');
    },

    /* ================= 3. 每帧逻辑 ================= */
    update(dt, time, ctx) {
      const rt = ctx.data;
      if (!rt || rt.won) return;
      const pl = ctx.player;
      const p = pl.pos;
      const D = Game.Desert;

      /* ---------- 倒计时 ---------- */
      if (!rt.leaving && rt.timerOn) {
        rt.timeLeft -= dt;
        if (rt.timeLeft <= 0) {
          rt.timeLeft = 0;
          fail(ctx);
          return;
        }
        Game.UI.battle({ time: rt.timeLeft });
      }
      rt.elapsed += dt;
      if (rt.touchCd > 0) rt.touchCd -= dt;

      /* ---------- 头顶箭头：只给「大概方向」（会左右晃） ---------- */
      const ex = EXIT.x - p.x, ez = EXIT.z - p.z;
      const distExit = Math.hypot(ex, ez) || 1;
      const base = Math.atan2(ex, ez);
      const wob = ARROW_OFF * (Math.sin(time * 0.55) * 0.7 + Math.sin(time * 2.3 + 1.1) * 0.3);
      const ang = base + wob;
      rt.arrow.x = p.x + Math.sin(ang) * distExit;
      rt.arrow.z = p.z + Math.cos(ang) * distExit;

      /* ---------- 骑马 ---------- */
      const key = pl.input.keys;
      if (rt.ride) {
        const horse = rt.ride;
        let mx = 0, mz = 0;
        if (pl.inputEnabled) {
          if (key.KeyW || key.ArrowUp) mz += 1;
          if (key.KeyS || key.ArrowDown) mz -= 1;
          if (key.KeyA || key.ArrowLeft) mx -= 1;
          if (key.KeyD || key.ArrowRight) mx += 1;
        }
        /* 和走路同一套规则：W 是「镜头前方」 */
        const fx = -Math.sin(pl.cam.yaw), fz = -Math.cos(pl.cam.yaw);
        const rx = -fz, rz = fx;
        let wx = fx * mz + rx * mx, wz = fz * mz + rz * mx;
        const L = Math.hypot(wx, wz);
        if (L > 0.001) { wx /= L; wz /= L; }

        /* 骑马时按 F = 让小马冲刺一下 */
        if (rt.sprintCd > 0) rt.sprintCd -= dt;
        if (rt.sprintT > 0) rt.sprintT -= dt;
        if (pl.consumeAttack()) {
          pl.swing();
          if (rt.sprintCd <= 0) {
            rt.sprintT = SPRINT_TIME;
            rt.sprintCd = SPRINT_CD;
            Game.Sfx.jump();
            ctx.toast('💨 小马跑起来啦！', 'good', 1200, 'desert-sprint');
          }
        }

        const speed = HORSE_SPEED * (rt.sprintT > 0 ? SPRINT_MUL : 1);
        const moved = avoidCacti(rt,
          horse.group.position.x + wx * speed * dt,
          horse.group.position.z + wz * speed * dt);
        const hx = Game.clamp(moved.x, BOUNDS.minX + 2.5, BOUNDS.maxX - 2.5);
        const hz = Game.clamp(moved.z, BOUNDS.minZ + 2.5, BOUNDS.maxZ - 2.5);
        horse.group.position.x = hx;
        horse.group.position.z = hz;
        horse.speedNow = L > 0.001 ? speed : 0;
        if (L > 0.001) horse.setHeading(Math.atan2(wx, wz));

        /* 把玩家「钉」在马背上（玩家自己的走路这一帧就不算了） */
        const b = pl.body;
        b.pos.set(hx, RIDE_Y, hz);
        b.vel.set(0, 0, 0);
        b.moving = false;
        b.grounded = true;
        pl.model.group.position.set(hx, RIDE_Y, hz);
        pl.model.group.rotation.y = horse.heading;
        pl.updateCamera(dt);

        rt.dismountItem.pos.x = hx;
        rt.dismountItem.pos.z = hz;
      } else {
        /* ---------- 没骑马：按 F 打「马 / 蛇 / 仙人掌」 ---------- */
        if (pl.consumeAttack()) {
          pl.swing();
          const horse = nearestHorse(rt, p.x, p.z, HIT_HORSE);
          if (horse) {
            mount(ctx, horse);
          } else {
            const snake = hitNearest(rt.snakes, p.x, p.z, HIT_SNAKE);
            if (snake) {
              const dx = snake.group.position.x - p.x, dz = snake.group.position.z - p.z;
              const dd = Math.hypot(dx, dz) || 1;
              snake.vel.x = (dx / dd) * 16;
              snake.vel.z = (dz / dd) * 16;
              snake.biteCd = 3.5;
              rt.snakesHit++;
              ctx.addCoins(COIN_SNAKE);
              ctx.particles.burst(snake.group.position.clone().setY(0.5), 0x9bd35f, 12, 0.9);
              Game.Sfx.hit();
              ctx.toast('🐍 砰！把小蛇打飞啦（+' + COIN_SNAKE + ' 🪙）', 'good', 1600, 'desert-snake-hit');
            } else {
              const cac = hitCactus(rt, p.x, p.z, HIT_CACTUS);
              if (cac) smashCactus(ctx, cac);
            }
          }
        }

        /* ---------- 仙人掌扎人 ---------- */
        rt.cacti.forEach(function (c) {
          if (!c.alive || rt.touchCd > 0) return;
          if (Math.hypot(c.x - p.x, c.z - p.z) < TOUCH_CAC) {
            rt.touchCd = 1.4;
            pl.knockback(p.x - c.x, p.z - c.z, 6, 3.2, 0.28);
            Game.Sfx.wrong();
            ctx.toast('🌵 哎哟！仙人掌扎人（绕开走就好）', 'bad', 1600, 'desert-cactus');
          }
        });

        /* ---------- 小蛇咬人（骑着马就咬不到你） ---------- */
        rt.snakes.forEach(function (s) {
          if (s.biteCd > 0) return;
          const sx = s.group.position.x, sz = s.group.position.z;
          if (Math.hypot(sx - p.x, sz - p.z) < SNAKE_BITE) {
            s.biteCd = 3;
            pl.knockback(p.x - sx, p.z - sz, 9, 3.6, 0.45);
            ctx.fx.shake(0.12, 0.3);
            Game.Sfx.wrong();
            ctx.toast('🐍 嘶——被小蛇咬了一口（不怕，不疼）', 'bad', 1800, 'desert-bite');
          }
        });
      }

      /* ---------- 小龙卷风：自己游走 + 卷人 ---------- */
      rt.winds.forEach(function (w) {
        w.dir += w.turn * dt;
        w.x += Math.sin(w.dir) * w.speed * dt;
        w.z += Math.cos(w.dir) * w.speed * dt;
        const m = 14;
        if (w.x < BOUNDS.minX + m || w.x > BOUNDS.maxX - m ||
            w.z < BOUNDS.minZ + m || w.z > BOUNDS.maxZ - m) {
          w.dir += Math.PI * 0.75;
          w.x = Game.clamp(w.x, BOUNDS.minX + m, BOUNDS.maxX - m);
          w.z = Game.clamp(w.z, BOUNDS.minZ + m, BOUNDS.maxZ - m);
        }
        w.animate(dt, time);
      });
      if (rt.windCd > 0) rt.windCd -= dt;
      if (rt.windCd <= 0) {
        for (let i = 0; i < rt.winds.length; i++) {
          const w = rt.winds[i];
          if (Math.hypot(w.x - pl.pos.x, w.z - pl.pos.z) < WIND_R) {
            blowAway(ctx, w);
            break;
          }
        }
      }

      /* ---------- 小马：有人骑的听人指挥，没人骑的自己溜达 ---------- */
      rt.horses.forEach(function (horse) {
        if (horse === rt.ride) { horse.animate(dt, time); return; }
        const hx0 = horse.group.position.x, hz0 = horse.group.position.z;
        /* 远处的马不用挂「按 F 骑上去」的牌子，不然满屏都是小标签 */
        horse.label.visible = Math.hypot(hx0 - p.x, hz0 - p.z) < LABEL_NEAR;
        const dx = horse.target.x - hx0, dz = horse.target.z - hz0;
        const dd = Math.hypot(dx, dz);
        if (dd < 0.5) {
          horse.speedNow = 0;
          horse.wait -= dt;
          if (horse.wait <= 0) {
            horse.wait = Game.rand(2.5, 6);
            const a = Game.rand(0, Math.PI * 2), rr = Game.rand(1.5, 10);
            horse.target.set(
              Game.clamp(horse.home.x + Math.cos(a) * rr, BOUNDS.minX + 4, BOUNDS.maxX - 4), 0,
              Game.clamp(horse.home.z + Math.sin(a) * rr, BOUNDS.minZ + 4, BOUNDS.maxZ - 4));
          }
        } else {
          horse.speedNow = 2.2;
          horse.group.position.x += (dx / dd) * horse.speedNow * dt;
          horse.group.position.z += (dz / dd) * horse.speedNow * dt;
          horse.setHeading(Math.atan2(dx, dz));
        }
        horse.animate(dt, time);
      });

      /* ---------- 小蛇：扭一扭 + 被打飞后滑一段 ---------- */
      rt.snakes.forEach(function (s) { s.biteCd = Math.max(0, s.biteCd - dt); s.animate(dt, time); });

      /* ---------- 随机跑来新的小马（小朋友原话：马会随机生成） ---------- */
      rt.horseTimer -= dt;
      if (rt.horseTimer <= 0) {
        rt.horseTimer = HORSE_EVERY;
        if (rt.horses.length < HORSE_MAX) {
          const spot = randomSpot(ctx, 16, 40);
          if (spot) {
            const horse = D.makeHorse({ x: spot.x, z: spot.z });
            ctx.scene.add(horse.group);
            horse.home.set(spot.x, 0, spot.z);
            horse.target.set(spot.x, 0, spot.z);
            rt.horses.push(horse);
            ctx.particles.burst(new THREE.Vector3(spot.x, 0.8, spot.z), 0xe8d6a8, 22, 1.2);
            Game.Sfx.pickup();
            ctx.toast('🐎 一匹小马跑过来啦！', 'good', 1800, 'desert-horse');
          }
        }
      }
    },

    /* ================= 4. 任务条 + 箭头指向 ================= */
    objective(ctx) {
      const rt = ctx.data || {};
      const p = ctx.player.pos;
      const d = Math.hypot(EXIT.x - p.x, EXIT.z - p.z);
      if (rt.won) {
        return { text: '🏝 你跑出沙漠啦！', target: { x: EXIT.x, z: EXIT.z } };
      }
      if (!rt.ride) {
        const horse = nearestHorse(rt, p.x, p.z, Infinity);
        const dh = horse ? Math.round(Math.hypot(
          horse.group.position.x - p.x, horse.group.position.z - p.z)) : 0;
        return {
          text: '🐎 找一匹小马（最近的约 ' + dh + ' 步），走到跟前按 F 骑上去！',
          target: horse ? { x: horse.group.position.x, z: horse.group.position.z }
                        : { x: EXIT.x, z: EXIT.z }
        };
      }
      const hint = d < 55 ? '出口就在前面啦！' : (d < 150 ? '还要跑一会儿' : '出口还很远');
      return {
        text: '⏰ 剩 ' + fmtTime(rt.timeLeft) + ' · 骑着小马往外跑（' + hint + '）',
        target: rt.arrow,
        progress: { label: '🐎 骑马', value: rt.mounts, max: 1 }
      };
    }
  });

  /* ================= 动作：骑上马 ================= */
  function mount(ctx, horse) {
    const rt = ctx.data;
    const pl = ctx.player;
    rt.ride = horse;
    rt.mounts++;
    horse.ridden = true;
    horse.speedNow = 0;
    horse.label.visible = false;
    pl.body.pos.set(horse.group.position.x, RIDE_Y, horse.group.position.z);
    pl.model.group.position.copy(pl.body.pos);
    pl.snapCamera();
    ctx.particles.burst(
      new THREE.Vector3(horse.group.position.x, 1.5, horse.group.position.z), 0xffe9b0, 18, 1.1);
    Game.Sfx.chest();
    ctx.toast('🐎 骑上小马啦！按 W 让它跑，按 F 冲刺，按 E 下马～', 'good', 4200, 'desert-mount');
    ctx.director._refreshObjective();
  }

  /* ================= 动作：下马 ================= */
  function dismount(ctx, quiet) {
    const rt = ctx.data;
    if (!rt.ride) return;
    const horse = rt.ride;
    horse.ridden = false;
    horse.speedNow = 0;
    horse.label.visible = true;
    rt.ride = null;
    rt.dismountItem.pos.x = 9999;
    rt.dismountItem.pos.z = 9999;
    if (!quiet) {
      Game.Sfx.pickup();
      ctx.toast('🐴 下马啦（再按 F 还能骑上去）', 'good', 2200, 'desert-dismount');
    }
    ctx.director._refreshObjective();
  }

  /* ================= 动作：被打飞的小蛇 / 打碎的仙人掌 ================= */
  function hitNearest(list, x, z, maxD) {
    let best = null, bestD = maxD;
    list.forEach(function (o) {
      const d = Math.hypot(o.group.position.x - x, o.group.position.z - z);
      if (d < bestD) { bestD = d; best = o; }
    });
    return best;
  }

  function hitCactus(rt, x, z, maxD) {
    let best = null, bestD = maxD;
    rt.cacti.forEach(function (c) {
      if (!c.alive) return;
      const d = Math.hypot(c.x - x, c.z - z);
      if (d < bestD) { bestD = d; best = c; }
    });
    return best;
  }

  function smashCactus(ctx, c) {
    c.alive = false;
    c.solid.enabled = false;              // 碰撞盒关掉，路就通了
    c.solid.visible = false;
    ctx.addCoins(COIN_CACTUS);
    ctx.particles.burst(new THREE.Vector3(c.x, 1.2, c.z), 0x8bd35f, 18, 1.1);
    Game.Sfx.hit();
    ctx.toast('🌵 咔嚓！仙人掌被打开啦（+' + COIN_CACTUS + ' 🪙）', 'good', 1600, 'desert-smash');
  }

  /* ================= 动作：被小龙卷风卷到 ================= */
  function blowAway(ctx, w) {
    const rt = ctx.data;
    const pl = ctx.player;
    rt.windCd = 2.0;
    const dx = pl.pos.x - w.x, dz = pl.pos.z - w.z;
    if (rt.ride) {
      const horse = rt.ride;
      dismount(ctx, true);
      const a = Game.rand(0, Math.PI * 2);
      horse.group.position.x = Game.clamp(horse.group.position.x + Math.cos(a) * 8,
        BOUNDS.minX + 4, BOUNDS.maxX - 4);
      horse.group.position.z = Game.clamp(horse.group.position.z + Math.sin(a) * 8,
        BOUNDS.minZ + 4, BOUNDS.maxZ - 4);
      horse.home.set(horse.group.position.x, 0, horse.group.position.z);
      pl.knockback(-dx, -dz, 15, 6.5, 0.9);
      ctx.toast('🌪 被小龙卷风卷下马啦！再找匹马骑上去～', 'bad', 2600, 'desert-wind');
    } else {
      pl.knockback(-dx, -dz, 11, 5.0, 0.6);
      ctx.toast('🌪 被风吹起来转了一圈！', 'bad', 2000, 'desert-wind');
    }
    ctx.particles.burst(new THREE.Vector3(pl.pos.x, 1.2, pl.pos.z), 0xe8dcb8, 26, 1.4);
    ctx.fx.shake(0.25, 0.45);
    Game.Sfx.knock();
  }

  /* ================= 动作：时间到 → 自动回小镇重来 ================= */
  function fail(ctx) {
    const rt = ctx.data;
    if (rt.leaving || rt.won) return;
    rt.leaving = true;
    Game.UI.battle(null);
    Game.Sfx.wrong();
    ctx.save.set('attempts', (ctx.save.get('attempts', 0)) + 1);
    ctx.toast('⏰ 时间到啦！小马跑累了，我们先回小镇歇一会儿，再来一次～', 'bad', 3400, 'desert-fail');
    setTimeout(function () {
      if (Game.Director.active === ctx && !rt.won) ctx.goHub();
    }, 1700);
  }

  /* ================= 动作：逃出沙漠 ================= */
  function win(ctx) {
    const rt = ctx.data;
    if (rt.won || rt.leaving) return;
    rt.won = true;
    dismount(ctx, true);
    Game.UI.battle(null);
    Game.Sfx.unlock();
    ctx.fx.flash('#fff7cc', 0.6);
    ctx.particles.burst(new THREE.Vector3(EXIT.x, 2, EXIT.z), 0xffe9b0, 30, 1.6);

    const used = Math.round(TIME_LIMIT - Math.max(0, rt.timeLeft));
    const oldBest = ctx.save.get('best', 0);
    const best = (!oldBest || used < oldBest) ? used : oldBest;
    ctx.save.set('best', best);
    ctx.save.set('escaped', (ctx.save.get('escaped', 0)) + 1);

    ctx.complete({
      chip: '🏝 逃出沙漠',
      title: '你骑着马跑出来啦！',
      coins: COIN_ESCAPE,
      html: '<p class="ui-text">你在 <b>' + fmtTime(used) + '</b> 里跑出了沙漠，' +
        '还剩下 <b>' + fmtTime(Math.max(0, rt.timeLeft)) + '</b>。</p>' +
        '<p class="ui-text">🐎 骑马次数：<b>' + rt.mounts + '</b>　' +
        '🐍 打飞小蛇：<b>' + rt.snakesHit + '</b>　' +
        '🥇 最快一次：<b>' + fmtTime(best) + '</b></p>' +
        '<p class="ui-text">🪙 奖励 <b>' + COIN_ESCAPE + '</b> 金币</p>'
    });
  }
})();

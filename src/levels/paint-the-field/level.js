/* ===================================================================
   levels/paint-the-field/level.js   第 6 关 · 踩白大草原（把绿色踩成白色）
   -------------------------------------------------------------------
   小朋友 2026-10-24 口述（家长转述，原文见
     transcripts/2026-10-24-第六关把绿色踩成白色-口述.md）：
     "地板全都是绿色的，我们要把绿色踩成白色，需要在倒计时结束前，把所有绿色踩成白色。
      如果你没有踩完，那么就等于你没有通关；但是你踩完之后还需要找到正确的传送门
      才能进入下一关。总共时间为 6 分钟。区域大一些，也是有小马的。
      我们骑的那只马踩的地方等于我们踩的地方范围很大"

   玩法：
     · 一整片 30×30 = 900 块绿地板（60×60 步），踩过的格子变白
     · 走路：一次踩白脚下 1 块；骑马：一次 3×3 = 9 块（小朋友说的「范围很大」）
     · 6 分钟倒计时；时间到还没踩完 → 自动回小镇重来（和沙漠那关一个规矩）
     · 全踩白之后：场地外面一圈 6 座传送门里只有 1 座是对的 → 进去才通关
     · 回广场的传送门在出生点侧面（红线：每关都要能回去）
   =================================================================== */
(function () {
  const Game = window.Game;
  const P = Game.Paint;                 // props.js 先加载，里面是地板 + 小马

  /* ---------------- 参数表（要调手感就改这里） ---------------- */
  const TIME_LIMIT = 360;        // 秒：小朋友说的「总共 6 分钟」
  const N = 30;                  // 地板 30 × 30 格
  const TILE = 2;                // 一格 2 步 → 整片 60 × 60 步（「区域大一些」）
  const BRUSH_FOOT = 0;          // 走路：只踩白脚下这一格
  const BRUSH_HORSE = 1;         // 骑马：3 × 3 = 9 格
  const HORSE_SPEED = 12;        // 骑马速度（走路是 6.2）
  const RIDE_Y = 1.6;            // 骑马时玩家抬多高（坐在马鞍上）
  const HIT_HORSE = 3.6;         // 按 F 能骑到马的距离
  const LABEL_NEAR = 45;         // 马离多远之内才挂「按 F 骑上去」的牌子
  const PORTALS = 6;             // 场地外面一圈有几座传送门（只有 1 座是对的）
  const PORTAL_RING = 36;        // 这一圈传送门离场地中心多远
  const PORTAL_R = 2.9;          // 走进多近算「进了门」
  const PORTAL_CD = 1.4;         // 进错门之后的冷却（免得同一句话刷屏）
  const COIN_CLEAR = 40;         // 通关金币
  const ARROW_EVERY = 0.4;       // 头顶箭头多久重新找一次「最近的绿地」

  const BOUNDS = { minX: -44, maxX: 44, minZ: -44, maxZ: 44 };
  const SPAWN = { x: 0, z: 38 };            // 出生点：场地南边外面（一进关就能看见整片草地）
  const FIELD = { x: 0, z: 0 };             // 场地中心

  function fmtTime(s) {
    s = Math.max(0, Math.round(s));
    return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  }

  function nearestHorse(rt, x, z, maxD) {
    let best = null, bestD = maxD === undefined ? Infinity : maxD;
    (rt.horses || []).forEach(function (h) {
      const d = Math.hypot(h.group.position.x - x, h.group.position.z - z);
      if (d < bestD) { bestD = d; best = h; }
    });
    return best;
  }

  Game.Levels.register({
    id: 'paint-the-field',        // ★发布后不许改★（存档按 id 分区）
    order: 60,
    name: '踩白大草原',
    subtitle: '第 6 关',
    icon: '🎨',

    bounds: BOUNDS,
    spawn: SPAWN,
    camera: { yaw: 0, pitch: 0.42, dist: 10 },   // 一进关就俯视整片草地
    theme: {
      skyTop: 0x4fa8ff, skyBottom: 0xbfe8ff, fog: 0xcdeeff, fogNear: 60, fogFar: 170
    },
    hint: '🎨 把绿色的地板都踩成白色！骑上小马一次能踩白一大片～',

    /* ================= 1. 搭地图（只跑一次） ================= */
    build(ctx) {
      const h = ctx.helpers;
      const B = ctx.bounds;
      const rt = (ctx.data = {
        field: null, horses: [], portals: [], correct: 0,
        arrow: { x: FIELD.x, z: FIELD.z }, arrowCd: 0,
        ride: null, dismountItem: null,
        timeLeft: TIME_LIMIT, timerOn: false, elapsed: 0,
        allPainted: false, won: false, leaving: false,
        portalCd: 0, wrongDoors: 0, mounts: 0
      });

      /* ---- 底色草地 + 边界墙 + 云 ---- */
      h.addGround(B.maxX - B.minX + 16, B.maxZ - B.minZ + 16);
      h.addBounds(B);
      h.addClouds(14);

      /* ---- ★会变白的地板★（一整片，画在 canvas 贴图上） ---- */
      rt.field = P.makeField({ n: N, tile: TILE, cx: FIELD.x, cz: FIELD.z });
      ctx.scene.add(rt.field.mesh);

      /* ---- 出生点：回广场的传送门放「侧面」（不能挡镜头） ---- */
      ctx.returnPortal(SPAWN.x - 9, SPAWN.z - 3, { rotationY: Math.PI * 0.5, r: 1.8 });
      h.block(SPAWN.x - 9, SPAWN.z - 3, 4);
      h.block(SPAWN.x, SPAWN.z, 10);

      /* ---- 木牌：把玩法写清楚（小朋友自己看） ---- */
      h.makeSign('🎨 把绿色踩成白色', SPAWN.x + 8, 2.6, SPAWN.z - 6, { rotationY: 0.5, w: 5 });
      h.makeSign('🐎 骑马一次踩白 3×3 块', -33, 2.6, 24, { rotationY: -0.9, w: 5.4 });
      h.block(SPAWN.x + 8, SPAWN.z - 6, 3.5);
      h.block(-33, 24, 3.5);

      /* ---- 草地外面一圈的装饰（不铺在场地里，免得挡路） ---- */
      const rim = [
        [B.minX + 3, B.maxX - 3, B.minZ + 3, -N * TILE / 2 - 2],   // 北边一条
        [B.minX + 3, B.maxX - 3, N * TILE / 2 + 2, B.maxZ - 3],    // 南边一条
        [B.minX + 3, -N * TILE / 2 - 2, -N * TILE / 2, N * TILE / 2],  // 西边一条
        [N * TILE / 2 + 2, B.maxX - 3, -N * TILE / 2, N * TILE / 2]    // 东边一条
      ];
      rim.forEach(function (r) {
        h.scatter(7, r, function (x, z) { h.makeTree(x, z, Game.rand(0.85, 1.3)); }, 4);
        h.scatter(12, r, function (x, z) {
          h.makeFlower(x, z, Game.pick([0xff6b6b, 0xffd447, 0xff9ad5]));
        }, 1.4);
        h.scatter(4, r, function (x, z) { h.makeRock(x, z, Game.rand(0.7, 1.6)); }, 4);
      });

      /* ---- 小马：出生点旁边就有 2 匹（不然小朋友找不到） ---- */
      [[SPAWN.x - 6, SPAWN.z - 5], [SPAWN.x + 7, SPAWN.z - 6],
       [-20, 30], [21, 31], [-31, 8], [31, -8], [-13, -33], [15, -33]
      ].forEach(function (p, i) {
        const horse = P.makeHorse({
          x: p[0], z: p[1],
          heading: i < 2 ? Math.PI : Game.rand(0, Math.PI * 2)
        });
        ctx.scene.add(horse.group);
        horse.home.set(p[0], 0, p[1]);
        horse.target.set(p[0], 0, p[1]);
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

      /* ---- 场地外面一圈「不知道通向哪里」的传送门（只有 1 座是对的） ----
         全踩白了才会亮；走错门只是被弹开 + 提示，不惩罚。 */
      for (let i = 0; i < PORTALS; i++) {
        const a = (i / PORTALS) * Math.PI * 2 + 0.26;
        const px = Math.round(Math.cos(a) * PORTAL_RING);
        const pz = Math.round(Math.sin(a) * PORTAL_RING);
        const portal = ctx.portal(px, pz, {
          label: '❓ 先踩白所有绿地板',
          locked: true,
          rotationY: Math.atan2(FIELD.x - px, FIELD.z - pz),
          r: 1.7
        });
        const rec = { i: i, x: px, z: pz, portal: portal, zone: null };
        rec.zone = ctx.zone({
          x: px, z: pz, r: PORTAL_R,
          enabled: function () {
            const d = ctx.data;
            return !d.won && !d.leaving && d.portalCd <= 0;
          },
          onEnter: function () { enterMystery(ctx, rec); }
        });
        rt.portals.push(rec);
      }
    },

    /* ================= 2. 每次进关（都是一次全新挑战） ================= */
    onEnter(ctx) {
      const rt = ctx.data;
      rt.ride = null;
      rt.won = false;
      rt.leaving = false;
      rt.allPainted = false;
      rt.timeLeft = TIME_LIMIT;
      rt.timerOn = true;               // 一进关就开始算 6 分钟
      rt.elapsed = 0;
      rt.portalCd = 0;
      rt.arrowCd = 0;
      rt.mounts = 0;
      rt.wrongDoors = 0;
      rt.arrow.x = FIELD.x;
      rt.arrow.z = FIELD.z;
      rt.field.reset();                // 地板重新全绿
      /* 出生点在地板外面；记一下「上一帧在哪」，
         免得一进关就从上次待的地方往出生点画一条长白线 */
      rt.lastPaint = { x: SPAWN.x, z: SPAWN.z };

      rt.horses.forEach(function (h) {
        h.ridden = false;
        h.speedNow = 0;
        h.label.visible = true;
        h.group.position.set(h.home.x, 0, h.home.z);
        h.group.rotation.y = h.heading;
        h.target.set(h.home.x, 0, h.home.z);
        h.wait = Game.rand(0.5, 3);
      });

      /* 这一局哪座门是对的：每次进关随机（小朋友要自己找） */
      rt.correct = Game.M.randInt(0, PORTALS - 1);
      rt.portals.forEach(function (p) {
        p.portal.setUnlocked(false).setLabel('❓ 先踩白所有绿地板');
        p.zone.triggered = false;
      });

      ctx.player.teleport(SPAWN.x, SPAWN.z, 0, ctx.def.camera);
      Game.UI.battle({ time: rt.timeLeft });
      /* 进关那句提示由引擎按 def.hint 自动弹（见 director.js），这里不要再弹一条，
         免得屏幕上叠两个黄气泡（key 都是 level-hint 那个位置）。 */
      ctx.director._refreshObjective();
    },

    /* ================= 3. 每帧逻辑 ================= */
    update(dt, time, ctx) {
      const rt = ctx.data;
      if (!rt || rt.won || rt.leaving) return;
      const pl = ctx.player;
      const p = pl.pos;
      const field = rt.field;

      /* ---------- 倒计时（全踩白之后就停了，找门不再计时） ---------- */
      if (rt.timerOn) {
        rt.timeLeft -= dt;
        if (rt.timeLeft <= 0) {
          rt.timeLeft = 0;
          fail(ctx);
          return;
        }
        Game.UI.battle({ time: rt.timeLeft });
      }
      rt.elapsed += dt;
      if (rt.portalCd > 0) rt.portalCd -= dt;

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

        const moved = {
          x: horse.group.position.x + wx * HORSE_SPEED * dt,
          z: horse.group.position.z + wz * HORSE_SPEED * dt
        };
        const hx = Game.clamp(moved.x, BOUNDS.minX + 3, BOUNDS.maxX - 3);
        const hz = Game.clamp(moved.z, BOUNDS.minZ + 3, BOUNDS.maxZ - 3);
        horse.group.position.x = hx;
        horse.group.position.z = hz;
        horse.speedNow = L > 0.001 ? HORSE_SPEED : 0;
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
        /* ---------- 没骑马：按 F 骑上最近的马 ---------- */
        rt.dismountItem.pos.x = 9999;
        rt.dismountItem.pos.z = 9999;
        if (pl.consumeAttack()) {
          pl.swing();
          const horse = nearestHorse(rt, p.x, p.z, HIT_HORSE);
          if (horse) mount(ctx, horse);
          else ctx.toast('🐎 旁边没有小马，走到小马跟前再按 F', 'bad', 1600, 'paint-nohorse');
        }
      }

      /* ---------- ★踩地板★（骑马时范围大得多） ----------
         沿着「上一帧 → 这一帧」这条线补几个采样点：
         骑马一秒能跑 12 步，万一哪一帧卡了，也不会漏掉中间的地板。 */
      const brush = rt.ride ? BRUSH_HORSE : BRUSH_FOOT;
      const last = rt.lastPaint || { x: p.x, z: p.z };
      const segLen = Math.hypot(p.x - last.x, p.z - last.z);
      let hit = 0;
      if (segLen > TILE * 4) {
        /* 一瞬间挪出去很远 = 传送 / 重生：只踩脚下这一块，
           千万别沿着「上一帧 → 这一帧」画一条长长的白线 */
        hit += field.paint(p.x, p.z, brush);
      } else {
        const steps = Math.min(8, Math.max(1, Math.floor(segLen / (TILE * 0.5))));
        for (let s = 1; s <= steps; s++) {
          hit += field.paint(last.x + (p.x - last.x) * s / steps,
            last.z + (p.z - last.z) * s / steps, brush);
        }
      }
      rt.lastPaint = { x: p.x, z: p.z };
      field.flush();
      if (hit) {
        /* 踩到新地板时轻轻「响一下」，小朋友能感觉到自己踩到了东西 */
        ctx.particles.burst(new THREE.Vector3(p.x, 0.25, p.z), 0xffffff, 5, 0.5);
      }
      if (!rt.allPainted && field.painted >= field.total) allPainted(ctx);

      /* ---------- 头顶箭头：指着「离你最近的那片绿地」 ---------- */
      rt.arrowCd -= dt;
      if (rt.arrowCd <= 0) {
        rt.arrowCd = ARROW_EVERY;
        const near = field.nearestGreen(p.x, p.z);
        if (near) { rt.arrow.x = near.x; rt.arrow.z = near.z; }
      }

      /* ---------- 小马：没人骑的自己溜达两步（不会踩白地板） ---------- */
      rt.horses.forEach(function (horse) {
        if (horse === rt.ride) { horse.animate(dt, time); return; }
        const hx = horse.group.position.x, hz = horse.group.position.z;
        horse.label.visible = Math.hypot(hx - p.x, hz - p.z) < LABEL_NEAR;
        const dx = horse.target.x - hx, dz = horse.target.z - hz;
        const dd = Math.hypot(dx, dz);
        if (dd < 0.5) {
          horse.speedNow = 0;
          horse.wait -= dt;
          if (horse.wait <= 0) {
            horse.wait = Game.rand(3, 7);
            const a = Game.rand(0, Math.PI * 2), rr = Game.rand(1.5, 6);
            horse.target.set(
              Game.clamp(horse.home.x + Math.cos(a) * rr, BOUNDS.minX + 4, BOUNDS.maxX - 4), 0,
              Game.clamp(horse.home.z + Math.sin(a) * rr, BOUNDS.minZ + 4, BOUNDS.maxZ - 4));
          }
        } else {
          horse.speedNow = 1.8;
          horse.group.position.x += (dx / dd) * horse.speedNow * dt;
          horse.group.position.z += (dz / dd) * horse.speedNow * dt;
          horse.setHeading(Math.atan2(dx, dz));
        }
        horse.animate(dt, time);
      });
    },

    /* ================= 4. 任务条 + 箭头指向 ================= */
    objective(ctx) {
      const rt = ctx.data || {};
      const field = rt.field;
      if (rt.won) {
        return { text: '🏁 你找到正确的传送门啦！', target: null };
      }
      if (field && !rt.allPainted) {
        return {
          text: '👣 把绿色踩成白色！还剩 ' + (field.total - field.painted) + ' 块' +
            (rt.ride ? '（骑马一次 3×3 块，跑起来！）' : '（骑上小马会快很多）'),
          target: rt.arrow,
          progress: { label: '✅ 踩白', value: field.painted, max: field.total }
        };
      }
      /* 全踩白之后：箭头收起来 —— 找门这件事不能直接给答案 */
      return {
        text: '🎉 全踩白啦（用时 ' + fmtTime(TIME_LIMIT - rt.timeLeft) + '）！' +
          '外面那一圈 6 座传送门里，只有 1 座是通往下一关的 →',
        target: null,
        progress: { label: '✅ 踩白', value: field ? field.painted : 0, max: field ? field.total : 0 }
      };
    }
  });

  /* ================= 动作：骑上马 / 下马 ================= */
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
    ctx.toast('🐎 骑上小马啦！现在一次能踩白 3×3 块，按 W 跑，按 E 下马～',
      'good', 4200, 'paint-mount');
    ctx.director._refreshObjective();
  }

  function dismount(ctx, quiet) {
    const rt = ctx.data;
    if (!rt.ride) return;
    const horse = rt.ride;
    horse.ridden = false;
    horse.speedNow = 0;
    horse.label.visible = true;
    horse.home.set(horse.group.position.x, 0, horse.group.position.z);
    horse.target.set(horse.group.position.x, 0, horse.group.position.z);
    rt.ride = null;
    rt.dismountItem.pos.x = 9999;
    rt.dismountItem.pos.z = 9999;
    if (!quiet) {
      Game.Sfx.pickup();
      ctx.toast('🐴 下马啦（按 F 还能再骑上去）', 'good', 2200, 'paint-dismount');
    }
    ctx.director._refreshObjective();
  }

  /* ================= 动作：全部踩白 ================= */
  function allPainted(ctx) {
    const rt = ctx.data;
    if (rt.allPainted || rt.won || rt.leaving) return;
    rt.allPainted = true;
    rt.timerOn = false;                 // 地板踩完了，找门不再计时
    Game.UI.battle(null);
    Game.Sfx.levelUp();
    ctx.fx.flash('#ffffff', 0.5);
    ctx.particles.burst(new THREE.Vector3(ctx.player.pos.x, 1.4, ctx.player.pos.z),
      0xffffff, 34, 1.6);
    rt.portals.forEach(function (p) {
      p.portal.setUnlocked(true, 0x4dc45a).setLabel('❓ 不知道通向哪里…');
    });
    ctx.toast('🎉 全踩白啦！用时 ' + fmtTime(TIME_LIMIT - rt.timeLeft) +
      ' —— 现在去找那扇「正确的传送门」（只有 1 扇是对的）', 'gold', 5200, 'paint-done');
    ctx.director._refreshObjective();
  }

  /* ================= 动作：走进那圈神秘传送门 ================= */
  function enterMystery(ctx, rec) {
    const rt = ctx.data;
    const pl = ctx.player;

    /* 还没踩完：门是暗的，先被弹开 */
    if (!rt.allPainted) {
      rt.portalCd = PORTAL_CD;
      pl.knockback(pl.pos.x - rec.x, pl.pos.z - rec.z, 9, 3.6, 0.35);
      Game.Sfx.wrong();
      ctx.toast('🔒 先把地板都踩白，这扇门才会亮哦（还剩 ' +
        (rt.field.total - rt.field.painted) + ' 块）', 'bad', 2000, 'paint-portal-locked');
      return;
    }

    /* 踩完了：只有 1 座是对的 */
    if (rec.i === rt.correct) {
      win(ctx);
      return;
    }
    rt.wrongDoors++;
    rt.portalCd = PORTAL_CD;
    ctx.save.addNumber('wrongDoors', 1);
    pl.knockback(pl.pos.x - rec.x, pl.pos.z - rec.z, 10, 4, 0.4);
    ctx.fx.shake(0.14, 0.3);
    Game.Sfx.wrong();
    ctx.toast('❓ 这扇门不通往下一关…再去试试别的（已经试了 ' + rt.wrongDoors + ' 扇）',
      'bad', 2400, 'paint-portal-wrong');
  }

  /* ================= 动作：时间到 → 自动回小镇重来 ================= */
  function fail(ctx) {
    const rt = ctx.data;
    if (rt.leaving || rt.won) return;
    rt.leaving = true;
    Game.UI.battle(null);
    Game.Sfx.wrong();
    ctx.save.set('attempts', (ctx.save.get('attempts', 0)) + 1);
    const left = rt.field.total - rt.field.painted;
    ctx.toast('⏰ 时间到啦！还剩 ' + left + ' 块没踩白 —— 我们先回小镇歇一会儿，再来一次～',
      'bad', 3400, 'paint-fail');
    setTimeout(function () {
      if (Game.Director.active === ctx && !rt.won) ctx.goHub();
    }, 1700);
  }

  /* ================= 动作：找到正确的传送门 ================= */
  function win(ctx) {
    const rt = ctx.data;
    if (rt.won || rt.leaving) return;
    rt.won = true;
    dismount(ctx, true);
    Game.UI.battle(null);
    Game.Sfx.unlock();
    ctx.fx.flash('#fff7cc', 0.6);
    ctx.particles.burst(
      new THREE.Vector3(rt.portals[rt.correct].x, 2, rt.portals[rt.correct].z),
      0xffe9b0, 30, 1.6);

    const used = Math.round(TIME_LIMIT - Math.max(0, rt.timeLeft));
    const oldBest = ctx.save.get('best', 0);
    const best = (!oldBest || used < oldBest) ? used : oldBest;
    ctx.save.set('best', best);
    ctx.save.set('cleared', (ctx.save.get('cleared', 0)) + 1);

    ctx.complete({
      chip: '🎨 全踩白 + 找到门',
      title: '整片草地都被你踩成白色啦！',
      coins: COIN_CLEAR,
      html: '<p class="ui-text">你把 <b>' + rt.field.total + '</b> 块绿地板全踩白了，' +
        '用时 <b>' + fmtTime(used) + '</b>，还剩 <b>' + fmtTime(Math.max(0, rt.timeLeft)) + '</b>。</p>' +
        '<p class="ui-text">🚪 找门试了 <b>' + (rt.wrongDoors + 1) + '</b> 扇（走错 ' +
        '<b>' + rt.wrongDoors + '</b> 扇）　🐎 骑马 <b>' + rt.mounts + '</b> 次　' +
        '🥇 最快一次：<b>' + fmtTime(best) + '</b></p>' +
        '<p class="ui-text">🪙 奖励 <b>' + COIN_CLEAR + '</b> 金币</p>' +
        '<p class="ui-text">（第 7 关还没做出来，先把你送回小镇～）</p>'
    });
  }
})();

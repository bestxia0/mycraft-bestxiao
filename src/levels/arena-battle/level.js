/* ===================================================================
   levels/arena-battle/level.js
   第 4 关 · 圆形擂台（小朋友版「大乱斗」）
   -------------------------------------------------------------------
   玩法：
     · 一个大大的圆形擂台（一开始半径 52），擂台四周是空的，掉下去就输了
     · 6 个人机对手，喜欢互相追着打，也会追着你打（谁近打谁）
     · 按 F 挥手里的武器打人 —— 武器越好，打人越疼、把人打得越远
       （武器就是第 2 关「宝箱山谷」里用宝箱装备炼造出来的那些）
     · ★打中别人，自己也会被弹开★（双方都会退开一步），不会被黏住一直打
     · 被打中的人会僵直 0.85 秒 —— 小朋友能连着揍几拳，手感更痛快
     · 血都加厚了（自己 400 / 对手 300），一场能打到后面几轮缩圈
     · 人机之间互相打得慢（一下只掉 2 滴血），所以擂台上一直有人，不会几分钟就散场
     · 每 3 分钟擂台缩小一次，一共缩小 3 次：52 → 40 → 29 → 20
     · 自己被打下去 / 掉下去 → 回小镇休息，再从传送门进来重来一次
     · 把 6 个对手全部打下去 = 通关 🏆
     · 一共 9 分钟；时间到了还有人站着，就再加 5 分钟 ⏱

   想调难度：改下面这几个常量就行（都很直白）。
   想加/减对手：改 BOTS 数组（加一行就是一个新对手，颜色名字自己定）。
   =================================================================== */
(function () {
  const Game = window.Game;

  /* ---------------- 参数表 ---------------- */
  const RING_R0 = 52;                       // 擂台初始半径
  const RING_STEPS = [40, 29, 20];          // 每次缩小后的半径（共 3 次）
  const SHRINK_EVERY = 180;                 // 每 3 分钟缩一次（秒）
  const SHRINK_TIME = 4;                    // 缩小过程的过渡秒数
  const LIMIT = 540;                        // 一场总共 9 分钟（秒）
  const EXTEND = 300;                       // 时间到还有人站着 → +5 分钟
  const MAX_EXTEND = 3;                     // 最多延时几次（防止没完没了）
  const PLAYER_HP = 400;                    // 自己的血量（打久一点，能撑到后面几轮缩圈）
  const BOT_HP = 300;                       // 每个对手的血量（够厚，人机互殴不会几分钟就打光）
  const BOT_SPEED = 4.6;                    // 对手走路速度（比自己慢一点）
  const BOT_RANGE = 3.0;                    // 对手能打到你的距离
  const BOT_SEE = 46;                       // 对手能「看见」多远（越大越好斗）
  const PLAYER_RANGE = 3.4;                 // 你能打到对手的距离
  const ATTACK_COOL = 0.42;                 // 自己两次挥剑之间的间隔
  const BOT_DMG = 5;                        // 对手打你一下掉多少血
  const BOT_DMG_BOT = 2;                    // 对手互殴一下掉多少血（打得慢，大家才打得久）
  const BOT_KNOCK = 10;                     // 对手互殴把人打飞多远
  const RECOIL = 0.35;                      // ★打中别人以后，自己也会被弹开（反弹力 = 击退 × 这个比例）★
  const BOT_RECOIL = 5.5;                   // 对手打中以后自己的反弹力
  const HIT_STUN = 0.85;                    // ★被打中的对手僵直多久（久一点，小朋友能连着揍几拳）★
  const PAD = { x: 0, z: 62, r: 6 };         // 回广场的小平台
  const WALK = { halfW: 2.6, z1: 46, z2: 58 };   // 擂台 → 小平台的走道

  /* 手里的武器越厉害，打得越狠、把人打得越远（rarity 1~4） */
  const WEAPON = {
    1: { dmg: 12, knock: 14, up: 5.4 },
    2: { dmg: 16, knock: 16, up: 6.0 },
    3: { dmg: 22, knock: 19, up: 6.6 },
    4: { dmg: 28, knock: 23, up: 7.4 }
  };

  /* 6 个人机对手（换名字 / 换颜色 / 加人就改这里，hint 里的数字会自动跟着变） */
  const BOTS = [
    { name: '红队小勇士', shirt: 0xff6b6b, pants: 0xbf2f2f, angle: 0.5, bg: 'rgba(255,214,214,.95)' },
    { name: '蓝队小勇士', shirt: 0x4aa3ff, pants: 0x2f5fbf, angle: 1.6, bg: 'rgba(210,232,255,.95)' },
    { name: '绿队小勇士', shirt: 0x5fd35f, pants: 0x338a33, angle: 2.7, bg: 'rgba(214,255,214,.95)' },
    { name: '黄队小勇士', shirt: 0xffd447, pants: 0xc79b1e, angle: 3.8, bg: 'rgba(255,240,190,.95)' },
    { name: '紫队小勇士', shirt: 0xb07bff, pants: 0x6f3fbf, angle: 4.9, bg: 'rgba(232,214,255,.95)' },
    { name: '橙队小勇士', shirt: 0xffa53f, pants: 0xbf6a1e, angle: 6.0, bg: 'rgba(255,230,200,.95)' }
  ];

  Game.Levels.register({
    id: 'arena-battle',
    order: 40,
    name: '圆形擂台',
    subtitle: '第 4 关',
    icon: '⚔️',
    bounds: { minX: -78, maxX: 78, minZ: -78, maxZ: 78 },
    spawn: { x: 0, z: 40 },
    camera: { yaw: 0, pitch: 0.34, dist: 11 },
    theme: {
      skyTop: 0x2f4f8f, skyBottom: 0xffdca8, fog: 0xf2ddc4,
      fogNear: 130, fogFar: 330, sun: 0xffe6b0, ambient: 0.82
    },
    hint: '⚔️ 按 F 挥武器，把 ' + BOTS.length +
      ' 个对手从擂台上打下去！擂台每 3 分钟缩小一次～',

    /* ---------------- 搭擂台 ---------------- */
    build(ctx) {
      const h = ctx.helpers;
      const rt = (ctx.data = {
        bots: [], ring: RING_R0, ringTarget: RING_R0, shrinkFrom: RING_R0, shrinkT: 1,
        shrinkCount: 0, nextShrink: SHRINK_EVERY, dangerShown: false,
        t: 0, limit: LIMIT, extend: 0, hp: PLAYER_HP, weapon: null,
        playerCool: 0, hitT: 0, running: false, over: false, won: false
      });

      /* 掉下去以后看到的深渊（只是个装饰面，没有碰撞） */
      const abyss = new THREE.Mesh(
        new THREE.CircleGeometry(240, 48),
        new THREE.MeshLambertMaterial({ color: 0x24406e })
      );
      abyss.rotation.x = -Math.PI / 2;
      abyss.position.y = -26;
      ctx.scene.add(abyss);

      /* 擂台本体：上面的草地圆盘 + 下面的石头柱 */
      const rockMat = new THREE.MeshLambertMaterial({ map: Game.Textures.stone(), color: 0xb58f66 });
      rt.disc = h.addDisc(0, 0, RING_R0);
      rt.island = h.addCylinder(0, -6.05, 0, RING_R0, RING_R0 * 0.82, 6, rockMat);

      /* 擂台边缘的两圈线（金色 = 边，红色 = 危险） */
      const ringGeo = new THREE.RingGeometry(0.955, 1, 128);
      rt.edge = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({
        color: 0xffd447, transparent: true, opacity: 0.9,
        side: THREE.DoubleSide, depthWrite: false
      }));
      rt.edge.rotation.x = -Math.PI / 2;
      rt.edge.position.y = 0.07;
      ctx.scene.add(rt.edge);

      rt.warn = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({
        color: 0xff6b6b, transparent: true, opacity: 0.55,
        side: THREE.DoubleSide, depthWrite: false
      }));
      rt.warn.rotation.x = -Math.PI / 2;
      rt.warn.position.y = 0.08;
      ctx.scene.add(rt.warn);

      /* 擂台外面飘着的大石头（纯装饰，没有碰撞） */
      [[62, 5, 2.2], [-66, -3, 1.8], [24, 70, 2.6], [-30, -68, 2.0],
        [70, 40, 1.6], [-58, 52, 2.4]].forEach(function (p) {
        h.addBox(p[0], -p[2] / 2, p[1], p[2] * 6, p[2], p[2] * 5,
          new THREE.MeshLambertMaterial({ map: Game.Textures.stone(), color: 0xa88a68 }),
          { collide: false });
      });
      h.addClouds(16);

      /* ---------------- 回广场：走道 + 小平台 ---------------- */
      h.addBox(0, 0, (WALK.z1 + WALK.z2) / 2, WALK.halfW * 2, 0.35, WALK.z2 - WALK.z1 + 1,
        new THREE.MeshLambertMaterial({ map: Game.Textures.paving() }));
      h.addDisc(PAD.x, PAD.z, PAD.r);
      h.addCylinder(PAD.x, -4.05, PAD.z, PAD.r, PAD.r * 0.85, 4, rockMat);
      ctx.returnPortal(PAD.x, PAD.z, { rotationY: Math.PI, r: 1.6, label: '⬅ 回广场' });

      /* ---------------- 6 个人机对手 ---------------- */
      BOTS.forEach(function (def) {
        const bot = Game.makeBot({
          name: def.name, shirt: def.shirt, pants: def.pants, hp: BOT_HP, labelBg: def.bg
        });
        bot.body = Game.Physics.createBody(0, 0, 0);
        bot.homeAngle = def.angle;
        bot.stunT = 0;
        bot.cool = 0;
        bot.falling = false;
        bot.fallV = 0;
        ctx.scene.add(bot.group);
        rt.bots.push(bot);
      });

      /* ★ 关键：告诉引擎「哪里算地面」——
         擂台圈里 = 0，走道和小平台 = 有地，其他 = null（空的，会掉下去） */
      ctx.setGround(function (x, z) {
        if (Math.abs(x) <= WALK.halfW && z >= WALK.z1 && z <= WALK.z2) return 0.35;
        if (Math.hypot(x - PAD.x, z - PAD.z) <= PAD.r) return 0;
        if (Math.hypot(x, z) <= rt.ring) return 0;
        return null;
      });

      updateRingVisual(rt);
    },

    /* 每次进这一关（含再玩一次）都重新开始一场 */
    onEnter(ctx) { startMatch(ctx); },

    /* ---------------- 每帧 ---------------- */
    update(dt, time, ctx) {
      const rt = ctx.data;
      if (!rt) return;
      updateRingVisual(rt);

      /* 已经分出胜负：只让被打下去的人继续往下掉 */
      if (rt.over) {
        rt.bots.forEach(function (b) { if (b.falling) updateFalling(b, dt); });
        return;
      }

      rt.t += dt;
      if (rt.playerCool > 0) rt.playerCool -= dt;
      if (rt.hitT > 0) rt.hitT -= dt;

      shrinkTick(ctx, dt);

      /* 快缩圈了，先喊一嗓子 */
      if (!rt.dangerShown && rt.shrinkCount < RING_STEPS.length &&
          rt.nextShrink - rt.t <= 6 && rt.shrinkT >= 1) {
        rt.dangerShown = true;
        Game.Sfx.shrink();
        ctx.toast('⚠️ 擂台马上要缩小啦，快往中间跑！', 'bad', 3400, 'arena-warn');
      }

      /* 时间到了 */
      if (rt.t >= rt.limit) timeUp(ctx);

      /* 自己按 F 打人 */
      if (ctx.player.consumeAttack() && rt.playerCool <= 0) playerAttack(ctx);

      /* 自己掉下去了 */
      if (ctx.player.pos.y < -8) { playerOut(ctx, 'fall'); return; }

      /* 对手行动 */
      rt.bots.forEach(function (bot) { updateBot(ctx, bot, dt, time); });

      /* 全都打下去了 = 通关 */
      if (aliveCount(rt) === 0) { win(ctx, false); return; }

      /* 擂台 HUD（倒计时 / 血条 / 还剩几个对手） */
      Game.UI.battle({
        time: Math.max(0, rt.limit - rt.t),
        hp: rt.hp, hpMax: PLAYER_HP,
        alive: aliveCount(rt), total: rt.bots.length
      });
    },

    /* ---------------- 任务条 ---------------- */
    objective(ctx) {
      const rt = ctx.data;
      if (!rt) return { text: '准备上台…' };
      const alive = aliveCount(rt);
      const total = rt.bots.length;
      const next = nearestBot(ctx, rt);
      if (alive > 0) {
        const w = rt.weapon;
        return {
          text: '按 F 挥' + (w && w.rarity > 1 ? '【' + w.name + '】' : '武器') +
            '把对手打下擂台！还剩 ' + alive + ' 个',
          target: next ? { x: next.body.pos.x, z: next.body.pos.z } : null,
          progress: { label: '对手', value: total - alive, max: total }
        };
      }
      return {
        text: '所有对手都打下去了！你赢啦 🏆',
        progress: { label: '对手', value: total, max: total }
      };
    }
  });

  /* ================= 下面都是这个关卡自己的函数 ================= */

  /* 开一场新的比赛（进关卡 / 再来一次都走这里） */
  function startMatch(ctx) {
    const rt = ctx.data;
    rt.ring = RING_R0;
    rt.ringTarget = RING_R0;
    rt.shrinkFrom = RING_R0;
    rt.shrinkT = 1;
    rt.shrinkCount = 0;
    rt.nextShrink = SHRINK_EVERY;
    rt.dangerShown = false;
    rt.t = 0;
    rt.limit = LIMIT;
    rt.extend = 0;
    rt.hp = PLAYER_HP;
    rt.playerCool = 0;
    rt.hitT = 0;
    rt.over = false;
    rt.running = true;
    rt.won = false;

    applyWeapon(ctx);
    ctx.player.teleport(ctx.def.spawn.x, ctx.def.spawn.z, 0, ctx.def.camera);

    rt.bots.forEach(function (bot) {
      const a = bot.homeAngle;
      bot.body.pos.set(Math.cos(a) * 30, 0, Math.sin(a) * 30);
      bot.body.vel.set(0, 0, 0);
      bot.body.grounded = true;
      bot.hp = BOT_HP;
      bot.alive = true;
      bot.falling = false;
      bot.fallV = 0;
      bot.stunT = 0;
      bot.cool = Game.rand(0.8, 1.8);
      bot.group.visible = true;
      bot.group.rotation.set(0, 0, 0);
      bot.group.position.copy(bot.body.pos);
      bot.setHp(BOT_HP);
      bot.setLabel(bot.name);
      bot.showBar(true);
    });

    updateRingVisual(rt);
    Game.UI.battle({
      time: rt.limit, hp: rt.hp, hpMax: PLAYER_HP,
      alive: rt.bots.length, total: rt.bots.length
    });
    ctx.toast('⚔️ 按 F 打！把对手打下擂台 🏟️', 'gold', 3600, 'arena-start');
  }

  /* 手里的武器（背包里最厉害的那件）+ 手上的剑跟着变 */
  function applyWeapon(ctx) {
    const rt = ctx.data;
    const inv = ctx.inventory();
    let best = null;
    for (const k in inv) {
      const info = Game.itemInfo(k);
      if (!best || info.rarity > best.rarity) {
        best = { id: k, name: info.name, emoji: info.emoji, rarity: info.rarity };
      }
    }
    rt.weapon = best || { name: '空手', emoji: '✊', rarity: 1 };
    const w = WEAPON[rt.weapon.rarity] || WEAPON[1];
    rt.weapon.dmg = w.dmg;
    rt.weapon.knock = w.knock;
    rt.weapon.up = w.up;
    ctx.player.setTier(rt.weapon.rarity - 1);
    return rt.weapon;
  }

  /* 擂台边缘跟着半径一起变 */
  function updateRingVisual(rt) {
    const R = rt.ring;
    if (rt.disc) rt.disc.scale.set(R, R, 1);
    if (rt.edge) rt.edge.scale.set(R, R, 1);
    if (rt.warn) rt.warn.scale.set(R + 0.05, R + 0.05, 1);
    if (rt.island) {
      const k = R / RING_R0;
      rt.island.scale.set(k, 1, k);
    }
  }

  function aliveCount(rt) {
    let n = 0;
    rt.bots.forEach(function (b) { if (b.alive) n++; });
    return n;
  }

  function nearestBot(ctx, rt) {
    const p = ctx.player.pos;
    let best = null, bestD = Infinity;
    rt.bots.forEach(function (b) {
      if (!b.alive) return;
      const d = Math.hypot(b.body.pos.x - p.x, b.body.pos.z - p.z);
      if (d < bestD) { bestD = d; best = b; }
    });
    return best;
  }

  /* ---------------- 缩圈 ---------------- */
  function shrinkTick(ctx, dt) {
    const rt = ctx.data;
    if (rt.shrinkT < 1) {
      rt.shrinkT = Math.min(1, rt.shrinkT + dt / SHRINK_TIME);
      const e = rt.shrinkT * rt.shrinkT * (3 - 2 * rt.shrinkT);   // 平滑一点
      rt.ring = Game.lerp(rt.shrinkFrom, rt.ringTarget, e);
      return;
    }
    if (rt.shrinkCount < RING_STEPS.length && rt.t >= rt.nextShrink) scheduleShrink(ctx);
  }

  function scheduleShrink(ctx) {
    const rt = ctx.data;
    rt.shrinkFrom = rt.ring;
    rt.ringTarget = RING_STEPS[rt.shrinkCount];
    rt.shrinkCount++;
    rt.shrinkT = 0;
    rt.nextShrink = SHRINK_EVERY * (rt.shrinkCount + 1);
    rt.dangerShown = false;
    Game.Sfx.shrink();
    ctx.fx.shake(0.25, 0.5);
    ctx.toast('⚠️ 擂台缩小啦！第 ' + rt.shrinkCount + ' 次，半径 ' +
      Math.round(rt.ringTarget) + '，快往中间跑！', 'bad', 3600, 'arena-warn');
  }

  /* ---------------- 时间到 ---------------- */
  function timeUp(ctx) {
    const rt = ctx.data;
    if (aliveCount(rt) === 0) return;
    rt.extend++;
    if (rt.extend > MAX_EXTEND) { win(ctx, true); return; }
    rt.limit += EXTEND;
    Game.Sfx.unlock();
    ctx.toast('⏰ 时间到！还有 ' + aliveCount(rt) + ' 个对手站着，再加 5 分钟 ⏱',
      'gold', 4600, 'arena-time');
  }

  /* ---------------- 自己攻击 ---------------- */
  function playerAttack(ctx) {
    const rt = ctx.data;
    rt.playerCool = ATTACK_COOL;
    ctx.player.swing();
    const w = rt.weapon;
    const p = ctx.player.pos;
    const dir = ctx.player.faceDir();

    let hit = 0, nearest = null, nearestD = Infinity;
    rt.bots.forEach(function (bot) {
      if (!bot.alive) return;
      const dx = bot.body.pos.x - p.x, dz = bot.body.pos.z - p.z;
      const d = Math.hypot(dx, dz);
      if (d > 4.2) return;
      if (d < nearestD) { nearestD = d; nearest = bot; }
      if (d > PLAYER_RANGE) return;
      const dot = d < 0.001 ? 1 : (dx / d) * dir.x + (dz / d) * dir.z;
      if (dot < 0.15) return;                    // 不在挥剑的方向上
      hitBot(ctx, bot, w, dx, dz);
      hit++;
    });
    /* 小朋友有时候会背对着人按键，这时候也帮他打最近的对手一下 */
    if (!hit && nearest && nearestD <= PLAYER_RANGE) {
      hitBot(ctx, nearest, w, nearest.body.pos.x - p.x, nearest.body.pos.z - p.z);
      hit++;
    }
    if (!hit) Game.Sfx.click();
  }

  function hitBot(ctx, bot, w, dx, dz) {
    bot.damage(w.dmg);
    /* 血量越低，被打飞得越远（好打好玩） */
    const weak = 1 + (1 - Math.max(0, bot.hp) / bot.hpMax) * 0.5;
    knockBot(bot, dx, dz, w.knock * weak, w.up * weak, HIT_STUN);
    /* ★双方都会被弹开★：打中别人，自己也要往后退一点 */
    ctx.player.knockback(-dx, -dz, w.knock * RECOIL, 0.8, 0.14);
    Game.Sfx.hit();
    ctx.fx.shake(0.1, 0.18);
    ctx.particles.burst(
      new THREE.Vector3(bot.body.pos.x, bot.body.pos.y + 1.1, bot.body.pos.z),
      bot.hp <= 0 ? 0xff6b6b : 0xffe9b0, 12, 0.9);
    if (bot.hp <= 0) eliminateBot(ctx, bot, 'hp');
  }

  function knockBot(bot, dx, dz, power, up, stun) {
    const len = Math.hypot(dx, dz) || 1;
    bot.body.vel.x = (dx / len) * power;
    bot.body.vel.z = (dz / len) * power;
    bot.body.vel.y = up;
    bot.body.grounded = false;
    bot.stunT = Math.max(bot.stunT, stun || 0.5);
  }

  /* ---------------- 对手行动 ---------------- */
  function updateBot(ctx, bot, dt, time) {
    const rt = ctx.data;
    if (!bot.alive) { updateFalling(bot, dt); return; }
    if (bot.stunT > 0) bot.stunT -= dt;

    const pos = bot.body.pos;
    const target = pickTarget(ctx, rt, bot);
    const a = bot.homeAngle;
    let wx = 0, wz = 0;

    if (Math.hypot(pos.x, pos.z) > rt.ring - 2.5) {
      /* 快掉下去了：先往中间跑（命比打架重要） */
      wx = Math.cos(a) * 8 - pos.x;
      wz = Math.sin(a) * 8 - pos.z;
    } else if (target && target.dist > BOT_RANGE * 0.9) {
      wx = target.x - pos.x;
      wz = target.z - pos.z;
    } else if (!target) {
      /* 附近没人：往擂台中间凑（凑着凑着就打起来了） */
      wx = Math.cos(a) * 10 - pos.x;
      wz = Math.sin(a) * 10 - pos.z;
    }
    const len = Math.hypot(wx, wz);
    if (len > 0.001) { wx /= len; wz /= len; }
    if (len > 0.01) bot.group.rotation.y = Math.atan2(wx, wz);

    Game.Physics.step(bot.body, dt, {
      colliders: ctx.colliders,
      bounds: ctx.bounds,
      wishX: wx, wishZ: wz,
      floor: 0,
      floorAt: ctx.groundAt,
      holdMomentum: bot.stunT > 0,
      speed: BOT_SPEED,
      drag: 0.06
    });
    bot.group.position.copy(bot.body.pos);
    bot.animate(dt, len > 0.1, bot.body.grounded, time);

    /* 追到身边就出手 */
    bot.cool -= dt;
    if (target && target.dist <= BOT_RANGE && bot.stunT <= 0 && bot.cool <= 0) {
      /* ★好斗一点★：出手更勤快，擂台上一直在打架 */
      bot.cool = Game.rand(0.8, 1.25);
      bot.swing();
      botAttack(ctx, bot, target);
    }

    if (bot.body.pos.y < -8) eliminateBot(ctx, bot, 'fall');
  }

  /* 对手找目标：谁近打谁（所以他们会互相打起来）
     为了「尽量攻击对方」：离得差不多近的时候优先打别的人机，别一直盯着小朋友 */
  function pickTarget(ctx, rt, bot) {
    const pos = bot.body.pos;
    let best = null, bestScore = Infinity;
    if (!rt.over) {
      const p = ctx.player.pos;
      const d = Math.hypot(p.x - pos.x, p.z - pos.z);
      if (d < BOT_SEE) {
        best = { isPlayer: true, x: p.x, z: p.z, dist: d };
        bestScore = d * 1.25;             // 玩家要「更近一点」才会被盯上
      }
    }
    rt.bots.forEach(function (o) {
      if (o === bot || !o.alive) return;
      const d = Math.hypot(o.body.pos.x - pos.x, o.body.pos.z - pos.z);
      if (d < BOT_SEE && d < bestScore) {
        best = { isPlayer: false, bot: o, x: o.body.pos.x, z: o.body.pos.z, dist: d };
        bestScore = d;
      }
    });
    return best;
  }

  function botAttack(ctx, bot, target) {
    const b = bot.body.pos;
    if (target.isPlayer) {
      const rt = ctx.data;
      if (rt.over) return;
      rt.hp = Math.max(0, rt.hp - BOT_DMG);
      ctx.player.knockback(ctx.player.pos.x - b.x, ctx.player.pos.z - b.z, 8, 4.2, 0.5);
      /* 对手打中你，它自己也会被弹开 → 大家「打一拳分开」 */
      knockBot(bot, b.x - ctx.player.pos.x, b.z - ctx.player.pos.z, BOT_RECOIL, 1.8, 0.22);
      Game.Sfx.hit();
      ctx.fx.shake(0.16, 0.26);
      ctx.particles.burst(
        new THREE.Vector3(ctx.player.pos.x, ctx.player.pos.y + 1.1, ctx.player.pos.z),
        0xff9b9b, 12, 0.9);
      if (rt.hp <= 0) playerOut(ctx, 'hp');
      return;
    }
    const o = target.bot;
    if (!o || !o.alive) return;
    o.damage(BOT_DMG_BOT);
    knockBot(o, o.body.pos.x - b.x, o.body.pos.z - b.z, BOT_KNOCK, 4.8, 0.45);
    /* 互殴也是「双方弹开」：谁先出手谁自己也会被推开一点 */
    knockBot(bot, b.x - o.body.pos.x, b.z - o.body.pos.z, BOT_RECOIL, 1.8, 0.22);
    Game.Sfx.hit();
    ctx.particles.burst(
      new THREE.Vector3(o.body.pos.x, o.body.pos.y + 1.1, o.body.pos.z),
      0xffd0d0, 10, 0.8);
    if (o.hp <= 0) eliminateBot(ctx, o, 'hp');
  }

  /* ---------------- 被打下去 / 掉下去 ---------------- */
  function eliminateBot(ctx, bot, why) {
    if (!bot.alive) return;
    bot.alive = false;
    bot.falling = true;
    bot.fallV = why === 'fall' ? 6 : 2;
    bot.showBar(false);
    bot.setLabel('💫 ' + bot.name, 'rgba(230,230,230,.9)');
    Game.Sfx.knock();
    ctx.particles.burst(
      new THREE.Vector3(bot.body.pos.x, bot.body.pos.y + 1.2, bot.body.pos.z),
      0xffd447, 22, 1.3);
    const left = aliveCount(ctx.data);
    if (left > 0) {
      ctx.toast('💥 把「' + bot.name + '」打下去了！还剩 ' + left + ' 个 🏟️',
        'good', 2800, 'arena-ko');
    } else {
      ctx.toast('🏆 所有对手都下去啦！', 'gold', 3200, 'arena-ko');
    }
    ctx.director._refreshObjective();
  }

  function updateFalling(bot, dt) {
    bot.fallV = (bot.fallV || 0) + 26 * dt;
    bot.group.position.y -= bot.fallV * dt;
    bot.group.rotation.z += dt * 3.2;
    bot.group.rotation.x += dt * 1.4;
    if (bot.group.position.y < -16) bot.group.visible = false;
  }

  function playerOut(ctx, why) {
    const rt = ctx.data;
    if (rt.over) return;
    rt.over = true;
    rt.running = false;
    Game.UI.battle(null);
    Game.Sfx.knock();
    ctx.fx.flash('#ff9d9d', 0.5);
    ctx.fx.shake(0.4, 0.7);
    ctx.player.clearQueue();
    ctx.player.teleport(0, 0, 0);          // 回到擂台中间，别一直往下掉（镜头留在擂台上）
    const left = aliveCount(rt);
    ctx.panel({
      chip: '💥 你被打下去了',
      title: '别灰心，再来一次！',
      closable: false,
      html: '<div class="big-emoji">💫</div>' +
        '<p class="ui-text">' +
        (why === 'hp' ? '你的勇气用光啦～' : '你掉到擂台下面去啦～') +
        '台下还有 <b>' + left + '</b> 个对手站着。</p>' +
        '<p class="ui-text">回小镇休息一下，再从<b>第 4 关 · 圆形擂台</b>的传送门进来重来一次吧！</p>',
      actions: [
        { label: '回小镇 🏠', primary: true, onClick: function (p) { p.close(); ctx.goHub(); } },
        { label: '马上再来一次 🔁', kind: 'ghost', onClick: function (p) { p.close(); ctx.go('arena-battle'); } }
      ]
    });
  }

  function win(ctx, byTime) {
    const rt = ctx.data;
    if (rt.over) return;
    rt.over = true;
    rt.running = false;
    rt.won = true;
    Game.UI.battle(null);
    Game.Sfx.levelUp();
    ctx.fx.flash('#fff7cc', 0.5);
    ctx.player.clearQueue();
    const w = rt.weapon || { name: '空手' };
    ctx.complete({
      chip: '🏆 第 4 关 通过',
      title: '擂台之王！',
      html: '<div class="start-arts">⚔️ 🏆 👑</div>' +
        '<h2>所有对手都被你打下去了！</h2>' +
        '<p>你拿着【' + w.name + '】把 <b>' + rt.bots.length + ' 个对手</b>全部打下了擂台。' +
        (byTime ? '<br>（时间到了，台上剩下的对手也算你赢啦～）' : '') + '</p>' +
        '<p>擂台最后缩到半径 <b>' + Math.round(rt.ring) + '</b>，你站到了最后！</p>' +
        '<p>剩下的血量：<b>' + Math.round(rt.hp) + ' / ' + PLAYER_HP + '</b> ❤️</p>',
      coins: 150
    });
  }
})();

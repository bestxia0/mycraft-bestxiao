/* ===================================================================
   levels/fan-cottage/level.js   第 8 关 · 风扇小屋
   -------------------------------------------------------------------
   小朋友 2026-10-24 口述（原文见
     transcripts/2026-10-24-第八关风扇小屋-口述.md）：
     "我们要把风扇装进旁边的小房子里面。但是我们有一个充电器，万一找不到的话，
      就可以回主世界去找一下。如果找到了，就回到那个地方去。如果你还是找不到，
      还是可以重新去找一下下。找到以后，就要直接装到房间里去充电。要是没装的话，
      你就过不了关。这是一个小的，我们可以用缩小能力，进去看看里面的样子。
      前面又有一个白色的空调位置。但如果你把它装进去了，也没找到空调充电器，
      那就不用找它了，万一它本来就是有电的呢？那个房间有一个门。也有窗户。"

   玩法：
     · 院子里有一栋小房子（有门有窗），门洞只有 1.2 步高
       → 大个子（1.8 步）钻不进去，要用「变小」能力（按 R）才能进屋看看
     · 风扇被风刮到**小屋后面**去了，得绕过去找（头顶箭头故意不指，自己找）
     · 把风扇搬进屋里，装在地上的蓝圈（风扇位）上 → 可是没有电
     · 充电器**不在这一关**：回主世界（广场东边的工具台）借一个，再从传送门回来插上
       → 来回跑几趟都欢迎（小朋友说的「还是可以重新去找一下下」）
     · 通电 → 风扇转起来 = 通关；▲空调位会**自己亮**（小朋友说的「万一它本来就有电呢」）
     · 不装风扇 = 过不了关（小朋友明确要求的硬规则）
   =================================================================== */
(function () {
  const Game = window.Game;
  const P = Game.FanCottage;            // props.js 先加载，里面是小房子 + 风扇

  /* ---------------- 参数表（要调手感就改这里） ---------------- */
  const BOUNDS = { minX: -26, maxX: 26, minZ: -26, maxZ: 26 };
  const SPAWN = { x: 0, z: 16 };                 // 出生点：院子南边，一进关就看见小屋
  const HOUSE = { x: 0, z: -8 };                 // 小屋（外框 12 × 10）
  const RETURN = { x: -8, z: 16 };               // 回广场的传送门（★每关都要有★，在出生点侧面）
  const FAN_HIDE = { x: 3.4, z: -15.8 };         // 风扇被风刮到屋后去了（要绕过去找）
  const FAN_R = 2.4;                             // 站多近能抱起风扇
  const DOOR_R = 2.6;                            // 站多近能按 E 变小 / 进门
  const SPOT_R = 2.0;                            // 站多近能装风扇 / 插电
  const AC_R = 1.5;                              // 空调位（贴墙，半径小一点）
  const COIN_CLEAR = 60;                         // 通关金币
  const FAN_SPIN = 9;                            // 通电后风扇每秒转多少（弧度）
  const HINT_FAN = '🌀 听说风扇被风刮到小屋后面去了，绕过去找一找～';

  Game.Levels.register({
    id: 'fan-cottage',              // ★发布后不许改★（存档按 id 分区）
    order: 80,
    name: '风扇小屋',
    subtitle: '第 8 关',
    icon: '🌀',
    shrink: true,                   // ★ 这一关能用「变小」能力（按 R / 手机上的「小」）★

    bounds: BOUNDS,
    spawn: SPAWN,
    camera: { yaw: 0, pitch: 0.34, dist: 9 },
    theme: {
      skyTop: 0x59b3ff, skyBottom: 0xdff2ff, fog: 0xd6ecff, fogNear: 60, fogFar: 170
    },
    hint: '🌀 把风扇装进小屋里，再给它通上电！门太小啦，按 R 变小就能钻进去～',

    /* 每次进关都会跑（build 只跑一次）：把上一局的痕迹收拾干净 */
    onEnter(ctx) {
      const rt = ctx.data, save = ctx.save;
      /* 上一次已经通电通关了？那这次进来就重新摆一遍（可以再玩一次） */
      if (save.flag('powered')) {
        save.setFlag('powered', false);
        save.setFlag('fanMounted', false);
        save.setFlag('fanFound', false);
      }
      rt.seconds = 0;               // 这一局花了多少秒（通电时记进存档）
      rt.insideOnce = false;        // 「进屋啦」那句提示每次进关都能再说一次
      rt.enterCount = (rt.enterCount || 0) + 1;
      save.set('visits', rt.enterCount);
      applyState(ctx);
      /* 刚把状态重置过，任务条马上跟着更新（导演的自动刷新要等 0.2 秒） */
      ctx.director._refreshObjective();
    },

    /* ============ 搭地图（只跑一次） ============ */
    build(ctx) {
      const h = ctx.helpers;
      const B = ctx.bounds;
      const save = ctx.save;
      const rt = (ctx.data = {
        seconds: 0, insideOnce: false, enterCount: 0,
        house: null, fan: null, cable: null, powered: false, acLit: false,
        labels: {}
      });

      /* ---------------- 地面 + 结界 + 云 ---------------- */
      h.addGround(B.maxX - B.minX + 14, B.maxZ - B.minZ + 14);
      h.addBounds(B);
      h.addClouds(14);

      /* ---------------- 小房子（门 + 窗 + 门洞只有 1.2 步高） ---------------- */
      const house = (rt.house = P.makeHouse(ctx, HOUSE));
      h.block(HOUSE.x, HOUSE.z, 9.5);          // 房子和它周围一圈不长树

      /* ---------------- 屋后那台风扇（要绕过去才看得到） ---------------- */
      const fan = (rt.fan = P.makeFan(ctx, {
        x: FAN_HIDE.x, z: FAN_HIDE.z, rotationY: Math.PI * 0.15
      }));
      ctx.scene.add(fan.group);
      ctx.entity(fan);
      /* 屋后堆两个木箱，把风扇藏在箱子旁边（不挡路，绕过去就能看见） */
      const crateMat = new THREE.MeshLambertMaterial({ map: Game.Textures.wood(), color: 0xd8b98a });
      h.addBox(FAN_HIDE.x + 1.6, 0, FAN_HIDE.z + 0.4, 1.4, 1.3, 1.4, crateMat);
      h.addBox(FAN_HIDE.x + 2.9, 0, FAN_HIDE.z + 0.9, 1.1, 1.0, 1.1, crateMat);
      h.block(FAN_HIDE.x + 1.2, FAN_HIDE.z, 3.4);

      /* ---------------- 门口 → 出生点的小路（给小朋友指个方向） ---------------- */
      for (let z = -1; z <= 15; z += 2.2) {
        h.addPatch(0, z, 2.6, 2.6, 0xd8cba8, Game.rand(-0.12, 0.12));
      }
      /* 绕到屋后的那条小路（土路绕小屋西边过去） */
      for (let i = 0; i < 6; i++) {
        h.addPatch(-7.6 - Math.sin(i) * 0.4, -4 - i * 2.4, 2.4, 2.4, 0xd8cba8, Game.rand(-0.2, 0.2));
      }

      /* ---------------- 回广场的传送门 ---------------- */
      ctx.returnPortal(RETURN.x, RETURN.z, { rotationY: Math.PI * 0.5, r: 1.7, label: '⬅ 回小镇' });
      h.block(RETURN.x, RETURN.z, 4);

      /* ---------------- 木牌：给小朋友看得懂的提示 ---------------- */
      /* 牌子的位置讲究：不能摆在出生点镜头的正后方（镜头在玩家 +z 一侧，摆了会糊满半个屏幕），
         所以放在**身前**的右手边 —— 一进关就看得见，又不会挡住房子的视线 */
      h.makeSign('🌀 风扇小屋', 5.4, 2.2, 11.6, { rotationY: -0.55 });
      h.block(5.4, 11.6, 3);
      h.makeSign('门太小了 · 按 R 变小', 3.2, 2.0, -1.2, { rotationY: -0.5 });
      h.block(3.2, -1.2, 2.8);
      h.makeSign('🌀 风扇被风刮到屋后去了…', 8.6, 2.0, -8, { rotationY: -1.2 });
      h.block(8.6, -8, 3);
      h.block(SPAWN.x, SPAWN.z, 7);            // 出生点周围别长树（很关键！）

      /* ---------------- 四个能按 E 的地方 ---------------- */
      /* 1) 屋后的风扇 */
      rt.fanPick = ctx.interact({
        kind: 'fan-pick',
        label: '按 E 抱起风扇 🌀',
        pos: { x: FAN_HIDE.x, z: FAN_HIDE.z },
        radius: FAN_R,
        enabled: function () { return !ctx.save.flag('fanFound'); },
        onUse: function () { pickFan(ctx); }
      });

      /* 2) 门口：变小 / 进门 */
      rt.doorPick = ctx.interact({
        kind: 'cottage-door',
        label: '按 E 变小，钻进小屋 🌀',
        pos: { x: house.door.x, z: house.door.z },
        radius: DOOR_R,
        onUse: function () { useDoor(ctx); }
      });

      /* 3) 屋里的风扇位：装风扇 / 插充电器 / 通电 */
      rt.spotPick = ctx.interact({
        kind: 'fan-spot',
        label: '按 E 把风扇装在这里 🌀',
        pos: { x: house.fanSpot.x, z: house.fanSpot.z },
        radius: SPOT_R,
        onUse: function () { useFanSpot(ctx); }
      });

      /* 4) 空调位（彩蛋：通电后它自己就亮了） */
      rt.acPick = ctx.interact({
        kind: 'ac-spot',
        label: '❄ 白色的空调位',
        pos: { x: house.acSpot.x, z: house.acSpot.z },
        radius: AC_R,
        onUse: function () { useAcSpot(ctx); }
      });

      /* ---------------- 院子里的树 / 花 / 蘑菇 / 石头 ---------------- */
      const rect = [B.minX + 3, B.maxX - 3, B.minZ + 3, B.maxZ - 3];
      h.scatter(22, rect, function (x, z) { h.makeTree(x, z, Game.rand(0.8, 1.2)); }, 3.2);
      h.scatter(34, rect, function (x, z) {
        h.makeFlower(x, z, Game.pick([0xff6b6b, 0xffd447, 0x9b6bff, 0xff9fd1, 0xffffff]));
      }, 1.3);
      h.scatter(10, rect, function (x, z) { h.makeMushroom(x, z, Game.pick([0xff6b6b, 0x9b6bff])); }, 1.6);
      h.scatter(12, rect, function (x, z) { h.makeRock(x, z, Game.rand(0.9, 1.7)); }, 2.6);

      applyState(ctx);                        // 按存档把风扇 / 通电的样子摆好
      refreshLabels(ctx);
      Game.log.info('风扇小屋搭好了：门洞 ' + P.DOOR_W + '×' + P.DOOR_H + ' 步，风扇藏在 ('
        + FAN_HIDE.x + ', ' + FAN_HIDE.z + ')');
    },

    /* ============ 每帧 ============ */
    update(dt, time, ctx) {
      const rt = ctx.data, save = ctx.save;
      if (!save.flag('powered')) rt.seconds += dt;
      /* 进屋那一刻给一句提示（每次进关都能再说一次） */
      if (!rt.insideOnce && rt.house.inside(ctx.player.pos.x, ctx.player.pos.z)) {
        rt.insideOnce = true;
        ctx.toast('🏠 进屋啦！地上那个蓝圈就是风扇的位置 🌀', 'good', 3600, 'inside');
      }
      refreshLabels(ctx);
    },

    /* ============ 任务条 ============ */
    objective(ctx) {
      const rt = ctx.data, save = ctx.save;
      const hasCharger = ctx.director.save.flag('hasCharger');
      const step = (save.flag('fanFound') ? 1 : 0)
        + (save.flag('fanMounted') ? 1 : 0)
        + (save.flag('powered') ? 1 : 0);
      const progress = { label: '进度', value: step, max: 3 };

      if (save.flag('powered')) {
        return { text: '⚡ 风扇转起来啦，空调也自己亮了！可以回小镇啦 🏠',
          target: RETURN, progress: progress };
      }
      if (!save.flag('fanFound')) {
        /* 故意不给头顶箭头：这一关的重点就是「找」（小朋友说的「万一找不到」） */
        return { text: HINT_FAN, progress: progress };
      }
      if (!save.flag('fanMounted')) {
        return {
          text: '🌀 风扇拿到手啦！走到小屋门口 → 按 R 变小 → 进屋放到蓝圈上',
          target: rt.house.door, progress: progress
        };
      }
      if (!hasCharger) {
        return {
          text: '🔌 风扇装好了，可是没有电！回广场东边的工具台借一个充电器',
          target: RETURN, progress: progress
        };
      }
      return {
        text: '⚡ 充电器到手啦！变小进屋，到风扇位按 E 插上电',
        target: rt.house.fanSpot, progress: progress
      };
    }
  });

  /* ================= 下面都是这个关卡自己的小工具函数 ================= */

  /* 按存档把「风扇在哪 / 通没通电」摆成对的样子（每次状态一变就调一次） */
  function applyState(ctx) {
    const rt = ctx.data, house = rt.house, save = ctx.save;
    const fanFound = save.flag('fanFound');
    const mounted = save.flag('fanMounted');
    const powered = save.flag('powered');
    rt.powered = powered;

    /* 风扇：没找到 → 立在屋后；找到但没装 → 收起来（在手上）；装好了 → 站在屋里的蓝圈上 */
    rt.fan.group.visible = fanFound && mounted;
    if (mounted) {
      rt.fan.group.position.set(house.fanSpot.x, 0, house.fanSpot.z);
      rt.fan.group.rotation.y = -Math.PI * 0.5;      // 风扇头朝着屋子中间
    }
    rt.fan.setSpinning(powered ? FAN_SPIN : 0);

    /* 通电以后：吊灯亮 + 空调位自己亮 + 从风扇拉一根线到插座 */
    if (powered) {
      if (house.powerOn() && !rt.cable) {
        rt.cable = P.makeCable(ctx, house.fanSpot,
          { x: house.socket.x, z: house.socket.z });
      }
      rt.acLit = true;
    } else if (rt.cable) {
      rt.cable.visible = false;
    }
  }

  /* 屏幕下方的「按 E …」提示会跟着进度变 */
  function refreshLabels(ctx) {
    const rt = ctx.data, save = ctx.save;
    if (!rt || !rt.spotPick) return;
    const hasCharger = ctx.director.save.flag('hasCharger');
    const small = ctx.player.small;

    setLabel(rt.doorPick, small ? '🚪 门很小，你已经能进去啦' : '按 E 变小，钻进小屋 🌀');

    let spot;
    if (save.flag('powered')) spot = '✅ 风扇转起来啦 ⚡';
    else if (!save.flag('fanFound')) spot = '🌀 这是放风扇的地方（先去小屋后面找风扇）';
    else if (!save.flag('fanMounted')) spot = '按 E 把风扇装在这里 🌀';
    else if (!hasCharger) spot = '🔌 风扇装好了，可是没有电（回广场借充电器）';
    else spot = '按 E 插上充电器，通电！⚡';
    setLabel(rt.spotPick, spot);

    setLabel(rt.acPick, save.flag('powered')
      ? '❄ 空调位自己亮了！'
      : '❄ 白色的空调位（还没有电）');
  }

  function setLabel(item, text) {
    if (item.label !== text) item.label = text;
  }

  /* 抱起屋后的风扇 */
  function pickFan(ctx) {
    const save = ctx.save;
    if (save.flag('fanFound')) return;
    save.setFlag('fanFound', true);
    applyState(ctx);
    refreshLabels(ctx);
    Game.Sfx.pickup();
    ctx.particles.burst(new THREE.Vector3(FAN_HIDE.x, 1, FAN_HIDE.z), 0x9fd8ff, 18, 1.1);
    ctx.toast('🌀 抱起风扇啦！搬到小屋里去装好吧（门太小，要按 R 变小）', 'gold', 4200, 'fan');
    ctx.director._refreshObjective();
  }

  /* 门口：变小 + 鼓励进去看看 */
  function useDoor(ctx) {
    const p = ctx.player;
    if (p.small) {
      ctx.toast('🚪 门很小，你已经能钻进去啦～（走进去看看）', 'good', 2600, 'door');
      Game.Sfx.click();
      return;
    }
    p.toggleShrink(true);
    ctx.toast('🌀 唰——变小啦！走进去看看小屋里面吧（再按 R 可以变回来）', 'gold', 4400, 'door');
    ctx.director._refreshObjective();
  }

  /* 风扇位：装风扇 → 插充电器 → 通电通关 */
  function useFanSpot(ctx) {
    const rt = ctx.data, save = ctx.save, flags = ctx.director.save;
    const house = rt.house;

    if (save.flag('powered')) {
      ctx.toast('🌀 风扇转得好欢～ 小屋已经通电啦', 'good', 2400, 'spot');
      return;
    }
    if (!save.flag('fanFound')) {
      Game.Sfx.wrong();
      ctx.toast('🌀 这里该放一台风扇… 去小屋周围找一找吧！', 'bad', 3600, 'need-fan');
      return;
    }
    if (!save.flag('fanMounted')) {
      save.setFlag('fanMounted', true);
      applyState(ctx);
      refreshLabels(ctx);
      Game.Sfx.craft();
      ctx.particles.burst(new THREE.Vector3(house.fanSpot.x, 1, house.fanSpot.z), 0x9fd8ff, 20, 1.2);
      ctx.toast('🌀 风扇装好啦！可是没有电… 得找一个充电器 🔌', 'gold', 4600, 'need-power');
      ctx.director._refreshObjective();
      return;
    }
    if (!flags.flag('hasCharger')) {
      Game.Sfx.wrong();
      ctx.toast('🔌 风扇还等着电呢… 回小镇东边的工具台借一个充电器吧！', 'bad', 4000, 'need-charger');
      return;
    }

    /* --- 通电！小朋友的规则：装好 + 有电 = 过关 --- */
    save.setFlag('powered', true);
    save.set('timeUsed', Math.round(rt.seconds));
    save.addNumber('poweredCount', 1);
    applyState(ctx);
    refreshLabels(ctx);
    Game.Sfx.correct();
    ctx.particles.burst(new THREE.Vector3(house.fanSpot.x, 1.4, house.fanSpot.z), 0xffd447, 26, 1.4);
    ctx.toast('⚡ 通电啦！风扇转起来了～ 空调位好像也自己亮了？ ❄', 'good', 3000, 'powered');
    ctx.complete({
      chip: '🌀 小屋通电啦',
      title: '风扇转起来了！',
      coins: COIN_CLEAR,
      html: '<p class="ui-text">你把风扇装进小屋里，还跑到广场借来充电器，' +
        '一插上电，风扇就“呼——”地转起来啦！</p>' +
        '<p class="ui-text">▲ 墙上的白色空调位也自己亮了 —— ' +
        '原来它本来就是有电的呀，不用再找空调充电器啦 😄</p>' +
        '<p class="ui-text">这一关花了 <b>' + Math.round(rt.seconds) + ' 秒</b>，' +
        '奖励 <b>+' + COIN_CLEAR + ' 🪙</b>。</p>'
    });
  }

  /* 空调位：通电前是「空位」，通电后自己亮（彩蛋，不影响通关） */
  function useAcSpot(ctx) {
    if (ctx.save.flag('powered')) {
      Game.Sfx.pickup();
      ctx.toast('❄ 空调位自己亮了！它本来就有电，不用找空调充电器 😄', 'good', 3600, 'ac');
      return;
    }
    Game.Sfx.click();
    ctx.toast('❄ 这是白色的空调位，还没有电… 先把风扇装好通上电吧', 'gold', 3200, 'ac');
  }
})();

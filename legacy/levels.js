/* ===================================================================
   方块小勇士 · levels.js
   关卡数据 + 关卡逻辑
     第 1 关 谜语森林：读 6 座谜语石碑，答对全部谜语才能通过大门
     第 2 关 宝箱山谷：收集宝箱里的武器装备，去铁匠铺兑换更强的装备
   =================================================================== */
(function () {
  const Game = window.Game;

  /* ---------------- 装备表 ---------------- */
  Game.RARITY = {
    1: { name: '普通', cls: 'rar1', color: 0xdfe6ec },
    2: { name: '稀有', cls: 'rar2', color: 0xa7d3ff },
    3: { name: '史诗', cls: 'rar3', color: 0xc9a6ff },
    4: { name: '传说', cls: 'rar4', color: 0xffd447 }
  };

  Game.ITEMS = {
    wood_sword:    { name: '木剑', emoji: '🗡️', rarity: 1 },
    wood_shield:   { name: '木盾', emoji: '🛡️', rarity: 1 },
    leather_cap:   { name: '皮帽', emoji: '🧢', rarity: 1 },
    leather_boots: { name: '皮靴', emoji: '👢', rarity: 1 },
    stone_hammer:  { name: '石锤', emoji: '🔨', rarity: 1 },
    cloth_armor:   { name: '布衣', emoji: '👕', rarity: 1 },
    iron_sword:    { name: '铁剑', emoji: '⚔️', rarity: 2 },
    iron_shield:   { name: '铁盾', emoji: '🛡️', rarity: 2 },
    iron_helm:     { name: '铁盔', emoji: '⛑️', rarity: 2 },
    long_bow:      { name: '长弓', emoji: '🏹', rarity: 2 },
    gold_sword:    { name: '金剑', emoji: '🌟', rarity: 3 },
    gold_helm:     { name: '金盔', emoji: '👑', rarity: 3 },
    diamond_sword: { name: '钻石勇者之剑', emoji: '💎', rarity: 4 }
  };

  Game.itemsOfRarity = function (r) {
    return Object.keys(Game.ITEMS).filter((k) => Game.ITEMS[k].rarity === r);
  };

  /* 12 个宝箱里的装备（会打乱顺序放进宝箱）：
     6 件普通 + 4 件稀有 + 2 件史诗
     正好够锻造成 1 件传说装备（通关条件） */
  Game.CHEST_LOOT = [
    'wood_sword', 'wood_shield', 'leather_cap', 'leather_boots', 'stone_hammer', 'cloth_armor',
    'iron_sword', 'iron_shield', 'iron_helm', 'long_bow',
    'gold_sword', 'gold_helm'
  ];

  /* ---------------- 锻造配方 ---------------- */
  Game.RECIPES = [
    { from: 1, need: 5, to: 2, text: '5 件普通装备 → 1 件稀有装备' },
    { from: 2, need: 3, to: 3, text: '3 件稀有装备 → 1 件史诗装备' },
    { from: 3, need: 3, to: 4, text: '3 件史诗装备 → 1 件传说装备（钻石勇者之剑）' }
  ];

  /* ---------------- 谜语（第 1 关，共 6 题） ---------------- */
  Game.RIDDLES = [
    {
      emoji: '🍉',
      q: '一个娃娃白又胖，肚里藏着黑籽瓤；夏天解渴人人爱，绿皮红肉圆又圆。',
      a: '西瓜', options: ['苹果', '西瓜', '南瓜'],
      hint: '它穿着一件绿条纹的外衣，切开以后里面是红红的。'
    },
    {
      emoji: '🐰',
      q: '耳朵长，尾巴短，红眼睛，三瓣嘴；爱吃萝卜爱吃菜，蹦蹦跳跳真可爱。',
      a: '小兔子', options: ['小猫咪', '小兔子', '小老虎'],
      hint: '它走路是一蹦一蹦的，最喜欢啃胡萝卜。'
    },
    {
      emoji: '🥚',
      q: '一个小房子，四面没有窗；里面住着白宝宝，煮熟了大家抢着尝。',
      a: '鸡蛋', options: ['鸡蛋', '石头', '雪球'],
      hint: '鸡妈妈会生下它，它的壳白白的、圆圆的。'
    },
    {
      emoji: '☀️',
      q: '白天挂在天上，红红脸蛋暖洋洋；晚上它就下班，月亮出来接班。',
      a: '太阳', options: ['灯笼', '太阳', '大西瓜'],
      hint: '它一出来，天就亮了，还能把衣服晒干。'
    },
    {
      emoji: '🐝',
      q: '身穿黄衣裳，飞来又飞去；采花蜜做香甜糖，嗡嗡唱着小歌曲。',
      a: '蜜蜂', options: ['蝴蝶', '蜜蜂', '麻雀'],
      hint: '它会嗡嗡嗡地飞，还会酿出甜甜的蜂蜜。'
    },
    {
      emoji: '🌙',
      q: '有时挂在树梢，有时落在山腰；弯弯像小船，圆圆像玉盘。',
      a: '月亮', options: ['月亮', '太阳', '镜子'],
      hint: '晚上抬头就能看到它，它会一会儿变圆、一会儿变弯。'
    }
  ];

  /* ============================================================
     构建两个关卡
     ============================================================ */
  Game.buildLevels = function (opts) {
    const scene = opts.scene;
    const world = opts.world;
    const save = opts.save;
    const particles = opts.particles;
    const onChange = opts.onChange || function () {};
    const helpers = world.helpers;
    const addSolid = helpers.addSolid;
    const L = Game.LAYOUT;

    /* 宝箱随机配方（存在存档里，重开一局才会变） */
    if (!save.loot || save.loot.length !== Game.CHEST_LOOT.length) {
      save.loot = Game.shuffle(Game.CHEST_LOOT.slice());
    }

    const state = {
      riddles: save.riddles.slice(),
      chests: save.chests.slice(),
      items: Object.assign({}, save.items),
      coins: save.coins || 0,
      level1Done: !!save.level1Done,
      legendary: !!save.legendary
    };

    function persist() {
      save.riddles = state.riddles.slice();
      save.chests = state.chests.slice();
      save.items = Object.assign({}, state.items);
      save.coins = state.coins;
      save.level1Done = state.level1Done;
      save.legendary = state.legendary;
      onChange();
    }

    /* ---------------- 村民 ---------------- */
    const elder = Game.makeNPC('elder');
    elder.group.position.set(-7, 0, 7);
    scene.add(elder.group);
    addSolid(-7, 0, 7, 0.7, 1.8, 0.5);

    const smithPos = new THREE.Vector3(L.forge[0], 0.3, L.forge[1] + 2.4);
    const smith = Game.makeNPC('smith');
    smith.group.position.copy(smithPos);
    smith.group.rotation.y = 0;
    scene.add(smith.group);

    const forge = Game.makeForge(L.forge[0], L.forge[1]);
    scene.add(forge.group);
    // 铁匠铺的地台（0.3 高，玩家会自动迈上去）
    addSolid(L.forge[0], 0, L.forge[1], 7, 0.3, 7);
    // 铁匠铺四角柱子的碰撞
    [[-3, -3], [3, -3], [-3, 3], [3, 3]].forEach((p) => {
      addSolid(L.forge[0] + p[0], 0.3, L.forge[1] + p[1], 0.45, 3.4, 0.45);
    });

    /* ---------------- 小羊 ---------------- */
    const sheep = [
      Game.makeSheep(9, -7, 4.5),
      Game.makeSheep(11, -3, 4),
      Game.makeSheep(6, -11, 3.5)
    ];
    sheep.forEach((s) => scene.add(s.group));

    /* ---------------- 第 1 关：谜语石碑 ---------------- */
    const stones = [];
    const stonePos = L.stoneSpots;
    Game.RIDDLES.forEach((r, i) => {
      const st = Game.makeRiddleStone(i, stonePos[i][0], stonePos[i][1]);
      scene.add(st.group);
      addSolid(stonePos[i][0], 0, stonePos[i][1], 1.5, 2.6, 1.5);
      if (state.riddles.indexOf(i) >= 0) st.setSolved();
      stones.push(st);
    });

    /* ---------------- 第 2 关：宝箱 ---------------- */
    const chestSpots = L.chestSpots;
    const chests = [];
    chestSpots.forEach((p, i) => {
      const ch = Game.makeChest(i, p[0], p[1], p[2]);
      scene.add(ch.group);
      // 宝箱是「墙」不是台阶：不要让小朋友顺脚爬上去
      addSolid(p[0], p[1], p[2], 1.1, 0.62, 0.85).noStep = true;
      if (state.chests.indexOf(i) >= 0) { ch.opened = true; ch.openT = 1; ch.star.visible = false; }
      chests.push(ch);
    });

    /* ---------------- 可交互目标列表 ---------------- */
    const interactables = [];
    stones.forEach((st, i) => {
      interactables.push({
        kind: 'riddle', ref: st, index: i,
        pos: new THREE.Vector3(stonePos[i][0], 0, stonePos[i][1]),
        radius: 3.2, label: '按 E 读谜语'
      });
    });
    chests.forEach((ch) => {
      interactables.push({
        kind: 'chest', ref: ch, index: ch.id,
        pos: ch.group.position.clone(),
        radius: 2.4, label: '按 E 打开宝箱'
      });
    });
    interactables.push({
      kind: 'forge', ref: smith,
      pos: smithPos.clone(),
      radius: 3.8, label: '按 E 找铁匠锻造'
    });
    interactables.push({
      kind: 'elder', ref: elder,
      pos: new THREE.Vector3(-7, 0, 7),
      radius: 3.2, label: '按 E 和村长说话'
    });
    interactables.push({
      kind: 'portal', ref: null,
      pos: new THREE.Vector3(L.portal[0], 0, L.portal[1]),
      radius: 3.6, label: '按 E 进入第 3 关'
    });

    /* ---------------- 装备背包操作 ---------------- */
    function addItem(id, n) {
      n = n || 1;
      state.items[id] = (state.items[id] || 0) + n;
    }
    function removeItems(ids) {
      ids.forEach((id) => {
        state.items[id] -= 1;
        if (state.items[id] <= 0) delete state.items[id];
      });
    }
    function itemCount() {
      let n = 0;
      for (const k in state.items) n += state.items[k];
      return n;
    }
    function countByRarity() {
      const c = { 1: 0, 2: 0, 3: 0, 4: 0 };
      for (const k in state.items) c[Game.ITEMS[k].rarity] += state.items[k];
      return c;
    }
    /* 挑出若干件指定稀有度的装备（优先消耗名字靠前的） */
    function pickItemsOfRarity(r, n) {
      const out = [];
      const pool = Game.itemsOfRarity(r);
      for (const id of pool) {
        let have = state.items[id] || 0;
        while (have > 0 && out.length < n) { out.push(id); have--; }
        if (out.length >= n) break;
      }
      return out.length >= n ? out : null;
    }

    /* ---------------- 关卡逻辑 ---------------- */
    const api = {
      state: state,
      stones: stones,
      chests: chests,
      interactables: interactables,
      forgePos: smithPos.clone(),
      itemCount: itemCount,
      countByRarity: countByRarity,

      /* 读谜语石碑 */
      solveRiddle: function (index) {
        if (state.riddles.indexOf(index) >= 0) return;
        state.riddles.push(index);
        stones[index].setSolved();
        state.coins += 10;
        particles.burst(new THREE.Vector3().copy(stones[index].group.position).setY(3.2), 0x7dff9b, 22, 1.3);
        Game.Sfx.correct();
        if (state.riddles.length >= Game.RIDDLES.length && !state.level1Done) {
          state.level1Done = true;
          state.coins += 50;
          world.doors.gate2.open_();
          helpers.setGateSign('第 2 关 · 宝箱山谷 已开启 ➡');
          Game.Sfx.unlock();
        }
        persist();
      },

      /* 开宝箱：返回获得的装备 id */
      openChest: function (index) {
        const ch = chests[index];
        if (!ch.open()) return null;
        state.chests.push(index);
        const itemId = save.loot[index];
        addItem(itemId, 1);
        state.coins += 5;
        const p = new THREE.Vector3().copy(ch.group.position).add(new THREE.Vector3(0, 0.9, 0));
        particles.burst(p, Game.ITEMS[itemId].rarity >= 3 ? 0xffd447 : 0xfff3b0, 18, 1.2);
        persist();
        return itemId;
      },

      /* 能不能锻造 */
      canCraft: function (recipe) {
        return (state.items[recipe.to] !== undefined ? true : true) &&
          countByRarity()[recipe.from] >= recipe.need;
      },

      /* 执行锻造：返回新装备 id */
      craft: function (recipe) {
        const take = pickItemsOfRarity(recipe.from, recipe.need);
        if (!take) return null;
        removeItems(take);
        let newId;
        if (recipe.to === 4) {
          newId = 'diamond_sword';
        } else {
          newId = Game.pick(Game.itemsOfRarity(recipe.to));
        }
        addItem(newId, 1);
        if (recipe.to === 4) state.legendary = true;
        persist();
        return newId;
      },

      /* 当前建议的目标（给引导箭头 / 任务文字用） */
      objective: function () {
        if (!state.level1Done) {
          const left = [];
          stones.forEach((s, i) => { if (state.riddles.indexOf(i) < 0) left.push(i); });
          if (left.length) return { kind: 'riddle', index: left[0], text: '去西边的【谜语森林】读石碑，还差 ' + left.length + ' 个谜语' };
          return { kind: 'gate', text: '谜语全部解开啦，穿过东边大门去第 2 关' };
        }
        if (!state.legendary) {
          const left = [];
          chests.forEach((c, i) => { if (state.chests.indexOf(i) < 0) left.push(i); });
          if (left.length) return { kind: 'chest', index: left[0], text: '在【宝箱山谷】找宝箱，还剩 ' + left.length + ' 个没打开' };
          return { kind: 'forge', text: '装备都收集齐了，去【铁匠铺】锻造成【钻石勇者之剑】' };
        }
        return { kind: 'portal', text: '传说装备到手！去东边传送门看看第 3 关吧' };
      },

      /* 玩家手里剑的等级：0 石 / 1 铁 / 2 金 / 3 钻石 */
      bladeTier: function () {
        if (state.legendary) return 3;
        const c = countByRarity();
        if (c[3] > 0) return 2;
        if (c[2] > 0) return 1;
        return 0;
      },

      update: function (dt, time) {
        stones.forEach((s) => s.animate(dt, time));
        chests.forEach((c) => c.animate(dt, time));
        elder.animate(dt, time);
        smith.animate(dt, time);
        forge.animate(dt, time);
        sheep.forEach((s) => s.animate(dt, time));
      },

      /* 村长说的话（根据进度变） */
      elderLine: function () {
        if (!state.level1Done) {
          return '欢迎你，小勇士！西边的谜语森林里立着 6 块石碑，回答出上面的谜语，通往第 2 关的大门才会打开哦。';
        }
        if (!state.legendary) {
          return '真棒！宝箱山谷里藏着好多武器和装备，把箱子里面的都收集起来，去找铁匠大叔换更厉害的装备吧！';
        }
        return '传说装备都被你打造出来啦！你已经是方块小镇最强的小勇士啦，去传送门那边看看吧～';
      }
    };
    return api;
  };
})();

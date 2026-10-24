/* ===================================================================
   levels/chest-valley/level.js
   第 2 关 · 宝箱山谷
   -------------------------------------------------------------------
   玩法：山谷里散落着 20 个宝箱（有的放在石台上，要走台阶跳上去），
         ★宝箱要自己去找★（这一关不显示头顶的指引箭头，noGuide: true）
         每个宝箱按 E 之后要先答对一道「常识题」才会打开（+5 金币 / 个），
         把武器和装备全部收集起来。
         然后去【铁匠铺】找铁匠大叔，把装备锻造成更厉害的：
           任意 5 件普通 → 1 件稀有
           任意 3 件稀有 → 1 件史诗
           任意 3 件史诗 → 1 件传说（钻石勇者之剑）
         锻造出传说装备后，北边的出口就会打开，走过去按 E 通关。
         ★ 这里炼造出来的武器，到了第 4 关「圆形擂台」就能打人啦 ★

   ★ 想改装备和配方：改 src/content/items.js ★
   ★ 想改常识题：改 src/content/banks/commonsense/*.js（加分类改 banks/index.js）★
   =================================================================== */
(function () {
  const Game = window.Game;

  /* 宝箱位置（x, y, z，y 是宝箱底部的高度，放在石台上的要写上去） */
  const CHEST_SPOTS = [
    [-30, 0, -30], [-20, 0, -34], [-10, 0, -28], [4, 0, -32], [16, 0, -30], [30, 0, -26],
    [-34, 0, -12], [-24, 1.86, -6], [8, 0, -14], [22, 0.9, -8], [34, 0, -2],
    [-30, 0.9, 14], [-18, 0, 8], [-4, 0, 16], [12, 1.8, 10], [26, 0, 18],
    [-32, 0, 30], [-16, 0, 32], [6, 0, 30], [22, 0, 32]
  ];
  /* 可以跳上去的石台 */
  const PLATFORMS = [
    { x: -24, z: -6, w: 3.2, d: 3.2, h: 1.86 },
    { x: 12, z: 10, w: 3.4, d: 3.4, h: 1.8 },
    { x: -30, z: 14, w: 3.0, d: 3.0, h: 0.9 },
    { x: 22, z: -8, w: 3.0, d: 3.0, h: 0.9 }
  ];
  /* 上台子的台阶 */
  const STAIRS = [
    { x: -24, z: -10, steps: 3, size: 1.4, stepH: 0.62, dir: 'z+' },
    { x: 12, z: 14, steps: 3, size: 1.4, stepH: 0.6, dir: 'z-' },
    { x: -30, z: 16, steps: 1, size: 1.6, stepH: 0.45, dir: 'z-' },
    { x: 22, z: -6, steps: 1, size: 1.6, stepH: 0.45, dir: 'z-' }
  ];
  const FORGE = [-6, -20];      // 铁匠铺中心
  const EXIT = [0, 34];         // 出口传送门

  Game.Levels.register({
    id: 'chest-valley',
    order: 20,
    name: '宝箱山谷',
    subtitle: '第 2 关',
    icon: '🎁',
    bounds: { minX: -40, maxX: 40, minZ: -40, maxZ: 40 },
    spawn: { x: -20.5, z: -24.5 },
    camera: { yaw: Math.PI * 1.22, pitch: 0.32, dist: 9 },
    theme: { fog: 0xe4f0ff, fogNear: 60, fogFar: 185 },
    /* ★宝箱要自己去找★：这一关不显示头顶的指引箭头（noGuide） */
    noGuide: true,
    hint: '🎁 在山谷里找宝箱，每个宝箱要先答对一道常识题才能打开哦！',

    build(ctx) {
      const h = ctx.helpers;
      const B = ctx.bounds;
      const save = ctx.save;
      const rt = (ctx.data = { chests: [], loot: [], forge: null, smith: null, exit: null, exitOpen: false });

      /* 宝箱里的装备：第一次进来洗一次牌，之后固定存进存档 */
      let loot = save.get('loot', null);
      if (!loot || loot.length !== CHEST_SPOTS.length) {
        loot = Game.shuffle(Game.CHEST_LOOT.slice());
        save.set('loot', loot);
      }
      rt.loot = loot;
      const opened = save.list('chests');

      /* ---------------- 地面 ---------------- */
      h.addGround(B.maxX - B.minX + 14, B.maxZ - B.minZ + 14);
      h.addBounds(B);
      h.addClouds(12);
      h.addPatch(-21, -24, 12, 16, 0xc9a06a);
      h.addPatch(0, 34, 14, 10, 0xd8cba8);
      h.addPatch(FORGE[0], FORGE[1] + 1, 16, 14, 0xd8cba8);

      /* 关键位置不许长东西 */
      CHEST_SPOTS.forEach(function (p) { h.block(p[0], p[2], 2.6); });
      PLATFORMS.forEach(function (p) { h.block(p.x, p.z, Math.max(p.w, p.d) * 0.85); });
      STAIRS.forEach(function (p) { h.block(p.x, p.z, 3.0); });
      h.block(FORGE[0], FORGE[1], 6.0);
      h.block(EXIT[0], EXIT[1], 4.5);
      h.block(-20.5, -24, 7);                                    // 出生点 + 门前
      h.block(-24, -17.4, 4);                                    // 回广场的门

      /* ---------------- 回广场的传送门 ---------------- */
      /* 放在出生点「侧面」：一进关看得见它，又不会挡住镜头（很重要！） */
      ctx.returnPortal(-24, -17.4, { rotationY: Math.PI * 0.22, r: 1.6 });

      /* ---------------- 20 个宝箱 ---------------- */
      CHEST_SPOTS.forEach(function (p, i) {
        const chest = Game.makeChest(i, p[0], p[1], p[2]);
        ctx.scene.add(chest.group);
        ctx.entity(chest);
        /* 宝箱是「墙」不是台阶：不要让小朋友顺脚爬到箱子上去 */
        h.addSolid(p[0], p[1], p[2], 1.1, 0.62, 0.85).noStep = true;
        if (opened.indexOf(i) >= 0) chest.setOpened();
        rt.chests.push(chest);

        ctx.interact({
          kind: 'chest',
          label: '按 E 答题开宝箱 🎁',
          pos: { x: p[0], z: p[2] },
          radius: 2.4,
          enabled: function () { return !chest.opened; },
          onUse: function () { openChest(ctx, i); }
        });
      });

      /* ---------------- 石台 + 台阶 ---------------- */
      PLATFORMS.forEach(function (p) { h.addPlatform(p.x, p.z, p.w, p.d, p.h); });
      STAIRS.forEach(function (s) { h.addStairs(s.x, s.z, s.steps, s.size, s.stepH, s.dir); });

      /* ---------------- 铁匠铺 ---------------- */
      const forge = Game.makeForge(FORGE[0], FORGE[1]);
      ctx.scene.add(forge.group);
      ctx.entity(forge);
      h.addSolid(FORGE[0], 0, FORGE[1], 7, 0.3, 7);            // 地台（会自动迈上去）
      [[-3, -3], [3, -3], [-3, 3], [3, 3]].forEach(function (p) {
        h.addSolid(FORGE[0] + p[0], 0.3, FORGE[1] + p[1], 0.45, 3.4, 0.45);
      });
      const smith = Game.makeNPC('smith');
      smith.group.position.set(FORGE[0], 0.3, FORGE[1] + 2.4);
      ctx.scene.add(smith.group);
      ctx.entity(smith);
      rt.forge = forge;
      rt.smith = smith;
      ctx.interact({
        kind: 'forge',
        label: '按 E 找铁匠大叔锻造 🔨',
        pos: { x: FORGE[0], z: FORGE[1] + 2.4 },
        radius: 3.8,
        onUse: function () { openForge(ctx); }
      });

      /* ---------------- 出口 ---------------- */
      const exit = ctx.portal(EXIT[0], EXIT[1], {
        label: '🏆 出口 🔒',
        locked: true,
        color: 0xffd447,
        r: 2.3
      });
      rt.exit = exit;
      ctx.interact({
        kind: 'exit',
        label: '按 E 出发 🏆',
        pos: { x: EXIT[0], z: EXIT[1] },
        radius: 3.6,
        onUse: function () { useExit(ctx); }
      });

      /* ---------------- 山谷装饰 ---------------- */
      const rect = [B.minX + 3, B.maxX - 3, B.minZ + 3, B.maxZ - 3];
      h.scatter(58, rect, function (x, z) { h.makeTree(x, z, Game.rand(0.8, 1.1)); }, 3.0);
      h.scatter(44, rect, function (x, z) {
        h.makeFlower(x, z, Game.pick([0xff6b6b, 0xffd447, 0x9b6bff, 0xffffff]));
      }, 1.3);
      h.scatter(22, rect, function (x, z) { h.makeMushroom(x, z, Game.pick([0xff6b6b, 0x9b6bff])); }, 1.6);
      h.scatter(34, rect, function (x, z) { h.makeRock(x, z, Game.rand(1.0, 2.2)); }, 2.6);

      refreshExit(ctx);
      refreshBlade(ctx);
    },

    update(dt, time, ctx) {
      /* 出口传送门是 ctx.portal(...) 登记的，导演会每帧帮它 animate()，
         所以这里只需要做本关自己的逻辑。 */
    },

    objective(ctx) {
      const rt = ctx.data || { chests: [] };
      const total = CHEST_SPOTS.length;
      const opened = ctx.save.list('chests');
      const legendary = ctx.save.flag('legendary');
      if (!legendary) {
        const left = [];
        rt.chests.forEach(function (c, i) { if (opened.indexOf(i) < 0) left.push(i); });
        if (left.length) {
          const c = rt.chests[left[0]];
          return {
            text: '在山谷里找宝箱，把武器和装备都收集起来（还剩 ' + left.length + ' 个）',
            target: c ? { x: c.group.position.x, z: c.group.position.z } : null,
            progress: { label: '宝箱', value: opened.length, max: total }
          };
        }
        return {
          text: '装备都收集齐了！去【铁匠铺】找铁匠大叔锻造更厉害的装备 🔨',
          target: { x: FORGE[0], z: FORGE[1] + 2.4 },
          progress: { label: '宝箱', value: opened.length, max: total }
        };
      }
      return {
        text: '传说装备到手！去北边的出口出发吧 🏆',
        target: { x: EXIT[0], z: EXIT[1] },
        progress: { label: '宝箱', value: opened.length, max: total }
      };
    }
  });

  /* ================= 这个关卡自己的函数 ================= */

  /* 按 E 找宝箱：先答一道常识题，答对了才开箱 */
  function openChest(ctx, i) {
    const chest = ctx.data.chests[i];
    if (!chest || chest.opened) return;
    /* 随机抽一道「没考过」的常识题（4 个分类混着抽） */
    const q = Game.pickCommonsense(1, { exclude: ctx.save.list('quizKeys') })[0];
    if (!q) { openChestNow(ctx, i); return; }        // 题库空了就别拦着小朋友

    Game.Quiz.ask(ctx, {
      chip: '🎁 宝箱问题 · ' + (q.label || '常识'),
      title: '答对才能打开宝箱',
      question: q.q,
      answer: q.a,
      options: q.options,
      hint: q.hint,
      rightText: '答对啦！宝箱打开了 🎉',
      onCorrect: function (panel) {
        ctx.save.pushUnique('quizKeys', q.key);      // 记下来，下次不会再出这道
        openChestNow(ctx, i);
        setTimeout(function () { panel.close(); }, 900);
      }
    });
  }

  /* 真正的开箱：拿到一件装备 + 5 金币 */
  function openChestNow(ctx, i) {
    const chest = ctx.data.chests[i];
    if (!chest || !chest.open()) return;
    ctx.save.pushUnique('chests', i);
    const itemId = ctx.data.loot[i];
    const info = Game.itemInfo(itemId);
    ctx.grantItem(itemId, 1);
    ctx.addCoins(5);
    ctx.particles.burst(
      new THREE.Vector3(chest.group.position.x, chest.group.position.y + 0.9, chest.group.position.z),
      info.rarity >= 3 ? 0xffd447 : 0xfff3b0, 18, 1.2);
    Game.Sfx.chest();
    Game.UI.toast(
      '<div style="font-size:24px">' + info.emoji + ' ' + info.name +
      '　<span style="font-size:13px">【' + Game.RARITY[info.rarity].name + '】</span></div>' +
      '<div style="font-size:13px">+5 🪙 金币</div>',
      info.rarity >= 3 ? 'gold' : 'good', 2800);
    refreshBlade(ctx);
    ctx.director._refreshObjective();
    Game.UI.stats({ coins: ctx.director.save.game().coins, items: ctx.itemCount() });
  }

  /* 手里的剑跟着最好的装备升级 */
  function refreshBlade(ctx) {
    ctx.player.setTier(bladeTier(ctx));
  }

  function countByRarity(ctx) {
    const inv = ctx.inventory();
    const out = { 1: 0, 2: 0, 3: 0, 4: 0 };
    for (const k in inv) out[Game.itemInfo(k).rarity] += inv[k];
    return out;
  }

  function bladeTier(ctx) {
    if (ctx.save.flag('legendary')) return 3;
    const c = countByRarity(ctx);
    if (c[3] > 0) return 2;
    if (c[2] > 0) return 1;
    return 0;
  }

  /* 挑出 n 件指定稀有度的装备（返回要消耗的 id 列表） */
  function pickItemsOfRarity(ctx, rarity, n) {
    const inv = ctx.inventory();
    const out = [];
    const pool = Game.itemsOfRarity(rarity);
    for (let i = 0; i < pool.length && out.length < n; i++) {
      let have = inv[pool[i]] || 0;
      while (have > 0 && out.length < n) { out.push(pool[i]); have--; }
    }
    return out.length >= n ? out : null;
  }

  /* ---------------- 铁匠铺面板 ---------------- */
  function openForge(ctx) {
    const legendary = ctx.save.flag('legendary');
    const panel = ctx.panel({
      chip: '🔥 铁匠铺 · 锻造台',
      wide: true,
      html: '<p class="forge-say" id="forgeSay"></p>' +
        '<div class="inv-grid" id="forgeInv"></div>' +
        '<div class="recipes" id="forgeRecipes"></div>' +
        '<p class="tip" id="forgeTip"></p>',
      actions: [{ label: '离开铁匠铺', kind: 'ghost', onClick: function (p) { p.close(); } }]
    });
    render(panel);
    Game.Sfx.click();
    return panel;

    function render(p) {
      const root = p.body;
      root.querySelector('#forgeSay').textContent = legendary
        ? '哇！钻石勇者之剑！你已经是真正的小勇士啦！'
        : '把收集来的武器和装备给我，我能帮你打造更厉害的！';
      root.querySelector('#forgeTip').textContent =
        '锻造配方：任意 5 件普通 → 1 件稀有 ｜ 任意 3 件稀有 → 1 件史诗 ｜ ' +
        '任意 3 件史诗 → 1 件传说';

      /* 背包 */
      const inv = ctx.inventory();
      const ids = Object.keys(inv).sort(function (a, b) {
        return Game.itemInfo(b).rarity - Game.itemInfo(a).rarity;
      });
      const invBox = root.querySelector('#forgeInv');
      invBox.innerHTML = '';
      if (!ids.length) {
        invBox.innerHTML = '<div class="inv-empty">背包里还没有装备，先去山谷里开宝箱吧！🎁</div>';
      } else {
        ids.forEach(function (id) {
          const it = Game.itemInfo(id);
          const d = document.createElement('div');
          d.className = 'inv-item rar' + it.rarity;
          d.innerHTML = '<span>' + it.emoji + '</span><span>' + it.name +
            '</span><span class="cnt">' + inv[id] + '</span>';
          invBox.appendChild(d);
        });
      }

      /* 配方 */
      const byRar = countByRarity(ctx);
      const box = root.querySelector('#forgeRecipes');
      box.innerHTML = '';
      Game.RECIPES.forEach(function (recipe) {
        const have = byRar[recipe.from] || 0;
        const can = have >= recipe.need;
        const row = document.createElement('div');
        row.className = 'recipe';
        row.innerHTML = '<div class="info">' + recipe.text +
          '<small>' + Game.RARITY[recipe.from].name + '装备：' + have + ' / ' + recipe.need +
          (can ? ' ✅ 可以锻造！' : '（还差 ' + (recipe.need - have) + ' 件）') + '</small></div>';
        const btn = document.createElement('button');
        btn.className = 'btn' + (can ? ' primary' : ' ghost');
        btn.textContent = can ? '锻造 🔨' : '材料不足';
        btn.disabled = !can;
        btn.addEventListener('click', function () { doCraft(recipe); });
        row.appendChild(btn);
        box.appendChild(row);
      });
    }

    function doCraft(recipe) {
      const take = pickItemsOfRarity(ctx, recipe.from, recipe.need);
      if (!take) return;
      ctx.director.takeItems(take);

      let newId;
      if (recipe.to === 4) {
        newId = 'diamond_sword';
        ctx.save.setFlag('legendary', true);
      } else {
        newId = Game.pick(Game.itemsOfRarity(recipe.to));
      }
      ctx.grantItem(newId, 1);
      Game.Sfx.craft();
      ctx.particles.burst(new THREE.Vector3(FORGE[0], 1.4, FORGE[1]), 0xffd447, 26, 1.6);
      refreshBlade(ctx);
      refreshExit(ctx, true);
      const info = Game.itemInfo(newId);
      render(panel);
      ctx.director._refreshObjective();

      if (recipe.to === 4) {
        Game.Fx.flash('#fff7cc', 0.5);
        Game.Fx.shake(0.25, 0.5);
        panel.close();
        ctx.panel({
          chip: '🏆 传说装备诞生',
          closable: false,
          html: '<div class="reward-card rar4"><div class="emoji">💎</div>' +
            '<div class="name">钻石勇者之剑</div><div class="rar">【传说装备】</div></div>' +
            '<p class="ui-text">你用手里的装备锻造出了传说之剑！<br>' +
            '北边的<b>出口传送门</b>已经亮起来了，走过去按 E 出发吧 🏆</p>',
          actions: [{ label: '太好啦！', primary: true, onClick: function (p) { p.close(); } }]
        });
      } else {
        Game.UI.reward({
          emoji: info.emoji, name: info.name,
          sub: '【' + Game.RARITY[info.rarity].name + '装备】锻造成功！',
          rarity: info.rarity
        });
      }
    }
  }

  /* 出口解锁的样子 */
  function refreshExit(ctx, force) {
    const rt = ctx.data;
    if (!rt || !rt.exit) return;
    const ready = ctx.save.flag('legendary');
    if (rt.exitOpen === ready && !force) return;
    rt.exitOpen = ready;
    if (ready) {
      rt.exit.setUnlocked(true, 0xffd447).setLabel('🏆 出口 · 可以出发啦', 'rgba(255,236,160,.96)');
    } else {
      rt.exit.setUnlocked(false).setLabel('🏆 出口 🔒', 'rgba(255,236,235,.96)');
    }
  }

  function useExit(ctx) {
    if (!ctx.save.flag('legendary')) {
      ctx.toast('🔒 出口还没开呢，先收集装备、锻造出传说之剑吧！', 'bad', 3400);
      Game.Sfx.wrong();
      return;
    }
    const opened = ctx.save.list('chests').length;
    ctx.complete({
      chip: '🏆 第 2 关 通过',
      title: '传说装备诞生！',
      html: '<h2>宝箱山谷全部完成！</h2>' +
        '<div class="start-arts">💎 🗡️ 🎁</div>' +
        '<p>你打开了 <b>' + opened + ' / ' + CHEST_SPOTS.length + '</b> 个宝箱，' +
        '并且用收集来的装备锻造出了 <b>传说 · 钻石勇者之剑</b>！</p>' +
        '<p>回到广场，下一关的传送门已经亮起来啦～</p>'
    });
  }
})();

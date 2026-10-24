/* ===================================================================
   levels/riddle-forest/level.js
   第 1 关 · 谜语森林
   -------------------------------------------------------------------
   玩法：森林里立着 6 座水晶石碑，走过去按 E 读谜语、三选一。
         答对水晶变绿（+10 金币）；答错会给提示，可以再想。
         这一轮 6 个全解开 -> 北边的大门打开（+50 金币），穿过大门就通关。
   出题：★每次进关都会从题库里随机抽 6 条★（没答过的优先），
         所以同一个小朋友每次玩的题目都不一样。
   谜语内容在 src/content/banks/riddles/*.js 里改（分类文件），
   加一个新分类只改 src/content/banks/index.js，不用改这个文件。
   =================================================================== */
(function () {
  const Game = window.Game;

  const STONE_SPOTS = [        // 6 座石碑围成一个圈
    [7.8, 4.5], [0, 9], [-7.8, 4.5],
    [-7.8, -4.5], [0, -9], [7.8, -4.5]
  ];
  const GATE_Z = 16;           // 出口大门的位置
  const EXIT_Z = 21;           // 走到这里就算通关

  const ROUND_SIZE = STONE_SPOTS.length;   // 一轮出几道题
  /* 想只从某几个分类里抽题，就在这里写分类 id，例如 ['animals', 'characters']。
     留空 / 不写 = 从全部题库里抽。 */
  const RIDDLE_CATS = [];

  Game.Levels.register({
    id: 'riddle-forest',
    order: 10,
    name: '谜语森林',
    subtitle: '第 1 关',
    icon: '🌳',
    bounds: { minX: -32, maxX: 32, minZ: -30, maxZ: 30 },
    spawn: { x: 0, z: -22 },
    camera: { yaw: Math.PI, pitch: 0.32, dist: 8 },
    theme: { fog: 0xd6f2ff, fogNear: 55, fogFar: 170 },
    hint: '🌳 森林里的石碑上写着谜语，走过去按 E 读一读吧！每题都不一样哦～',

    build(ctx) {
      const h = ctx.helpers;
      const B = ctx.bounds;
      const save = ctx.save;
      const rt = (ctx.data = { stones: [], round: [], gateOpen: false, doorT: 0 });

      /* ---------------- 抽这一轮的题 ---------------- */
      /* solvedKeys：答过的谜语 id（形如 'animals:rabbit'），存着就不会重复出题 */
      const solvedKeys = save.list('solvedKeys');
      const legacy = save.list('solved');        // 旧版存档记的是石碑序号
      /* 老存档的 key 是 'animals:rabbit'（没有题库前缀），先统一成新格式 */
      const fixedKeys = Game.normalizeQuestionKeys(solvedKeys);
      if (fixedKeys.join(',') !== solvedKeys.join(',')) save.set('solvedKeys', fixedKeys);
      if (!fixedKeys.length && legacy.length >= ROUND_SIZE) {
        /* 旧存档早就答完一轮了：直接当成已通过，别再让他重做一遍 */
        rt.legacyDone = true;
      }
      rt.round = rt.legacyDone ? [] : Game.pickRiddles(ROUND_SIZE, {
        exclude: fixedKeys, cats: RIDDLE_CATS
      });
      if (!rt.round.length && !rt.legacyDone) {
        Game.log.warn('谜语题库是空的：检查 src/content/banks/index.js');
      }

      /* ---------------- 地面 + 中间的林间空地 ---------------- */
      h.addGround(B.maxX - B.minX + 14, B.maxZ - B.minZ + 14);
      const dirt = Game.Textures.dirt();
      dirt.repeat.set(5, 5);
      h.addPatch(0, 0, 22, 22, dirt);
      h.addPatch(-1, -21, 15, 14, dirt);                   // 出生点 + 回广场门脚下
      h.addBounds(B);
      h.addClouds(12);

      /* 别在关键位置长树 */
      h.block(0, 0, 13);                                   // 石碑围成的空地
      STONE_SPOTS.forEach(function (p) { h.block(p[0], p[1], 3.0); });
      h.block(0, -23, 7);                                  // 出生点 + 回广场的门
      h.block(0, GATE_Z, 9);                               // 大门附近
      h.block(-13, -14, 4); h.block(13, -14, 4);           // 两条打听小路

      /* ---------------- 回广场的传送门 ---------------- */
      /* 放在出生点左边一点点：一进关就能看见它，又不会挡住镜头（很重要！） */
      ctx.returnPortal(-6.5, -22.5, { rotationY: 0, r: 1.6, label: '⬅ 回广场' });

      /* ---------------- 6 座谜语石碑（题是随机抽的） ---------------- */
      STONE_SPOTS.forEach(function (p, i) {
        const r = rt.round[i] || null;                     // 这一轮第 i 道题
        const done = !r || solvedKeys.indexOf(r.key) >= 0;
        const stone = Game.makeStonePillar(i, p[0], p[1], { label: '谜语 ' + (i + 1) + ' ❓' });
        ctx.scene.add(stone.group);
        ctx.entity(stone);
        h.addSolid(p[0], 0, p[1], 1.5, 2.6, 1.5);
        if (done) stone.setSolved('⭐ 已解开');
        rt.stones.push(stone);

        if (!r) return;                                    // 没题（旧存档 / 题库空了）
        ctx.interact({
          kind: 'riddle',
          label: '按 E 读谜语 ❓',
          pos: { x: p[0], z: p[1] },
          radius: 3.2,
          onUse: function () { openRiddle(ctx, i); }
        });
      });

      /* ---------------- 出口大门（谜语全解开才会打开） ---------------- */
      buildGate(ctx, h);

      /* ---------------- 中间的木牌：换一批新谜语 ---------------- */
      h.makeSign('🎲 换一批新谜语', 0, 1.6, 0, {
        rotationY: 0, fontSize: 52, fontWorldHeight: 0.9, w: 5.2, h: 1.9
      });
      ctx.interact({
        kind: 'riddle-batch',
        label: '按 E 换一批新谜语 🎲',
        pos: { x: 0, z: 0 },
        radius: 3.0,
        enabled: function () { return roundDone(ctx); },
        onUse: function () { newRound(ctx, false); }
      });

      /* ---------------- 森林装饰 ---------------- */
      const rect = [B.minX + 3, B.maxX - 3, B.minZ + 3, B.maxZ - 3];
      h.scatter(58, rect, function (x, z) { h.makeTree(x, z, Game.rand(0.8, 1.2)); }, 3.0);
      h.scatter(34, rect, function (x, z) {
        h.makeFlower(x, z, Game.pick([0xff6b6b, 0xffd447, 0x9b6bff, 0xff9fd1, 0xffffff]));
      }, 1.2);
      h.scatter(20, rect, function (x, z) {
        h.makeMushroom(x, z, Game.pick([0xff6b6b, 0xff9fd1, 0x9b6bff]));
      }, 1.5);
      h.scatter(16, rect, function (x, z) { h.makeRock(x, z, Game.rand(0.9, 1.9)); }, 2.4);

      /* ---------------- 这一轮的题已经答完过 -> 直接开门 ---------------- */
      if (rt.legacyDone || roundDone(ctx)) {
        setGate(ctx, true, true);
      }
    },

    update(dt, time, ctx) {
      const rt = ctx.data;
      if (!rt) return;
      /* 大门缓缓降下 */
      if (rt.gateOpen && rt.doorT < 1) {
        rt.doorT = Math.min(1, rt.doorT + dt / 1.6);
        const y = -4.4 * rt.doorT;
        rt.door.position.y = y;
        rt.gateCollider.enabled = rt.doorT < 0.55;
        rt.gateCollider.maxY = Math.max(0.01, 4.0 + y);
        if (rt.doorT >= 1) Game.Fx.shake(0.12, 0.3);
      }
    },

    /* 每次进关：如果上一轮已经答完，就自动换成新的一批谜语 */
    onEnter(ctx) {
      const rt = ctx.data;
      if (!rt || !rt.round.length) return;
      if (roundDone(ctx)) newRound(ctx, true);
    },

    objective(ctx) {
      const rt = ctx.data || {};
      const total = ROUND_SIZE;
      const round = rt.round || [];
      const solved = ctx.save.list('solvedKeys');
      const doneCount = round.filter(function (r) { return solved.indexOf(r.key) >= 0; }).length;

      if (round.length && doneCount < round.length) {
        let next = null;
        rt.stones.forEach(function (s, i) {
          const r = round[i];
          if (!next && r && solved.indexOf(r.key) < 0) next = s;
        });
        return {
          text: '读一读森林里的谜语石碑，这一轮还差 ' + (round.length - doneCount) + ' 个谜语没解开',
          target: next ? { x: next.group.position.x, z: next.group.position.z } : null,
          progress: { label: '谜语', value: doneCount, max: total }
        };
      }
      return {
        text: '谜语全解开啦！穿过北边的大门往前走 🚪',
        target: { x: 0, z: EXIT_Z },
        progress: { label: '谜语', value: total, max: total }
      };
    }
  });

  /* ================= 这个关卡自己的函数 ================= */

  /* 出口大门：两根柱子 + 会往下降的木栅栏 */
  function buildGate(ctx, h) {
    const rt = ctx.data;
    const woodMat = new THREE.MeshLambertMaterial({ map: Game.Textures.wood() });
    const stoneMat = new THREE.MeshLambertMaterial({ map: Game.Textures.stone() });

    /* 左右两段栅栏，中间留出门洞 */
    h.addFenceLine(ctx.bounds.minX + 2, GATE_Z, -3.6, GATE_Z);
    h.addFenceLine(3.6, GATE_Z, ctx.bounds.maxX - 2, GATE_Z);
    h.addBox(-3.6, 0, GATE_Z, 1.4, 4.2, 1.4, stoneMat);
    h.addBox(3.6, 0, GATE_Z, 1.4, 4.2, 1.4, stoneMat);

    const door = new THREE.Group();
    for (let i = -2; i <= 2; i++) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.3, 4.0, 0.3), woodMat);
      bar.position.set(i * 1.2, 2.0, 0);
      bar.castShadow = true;
      door.add(bar);
    }
    [3.4, 1.0].forEach(function (y) {
      const cross = new THREE.Mesh(new THREE.BoxGeometry(6.4, 0.25, 0.25), woodMat);
      cross.position.set(0, y, 0);
      door.add(cross);
    });
    door.position.set(0, 0, GATE_Z);
    ctx.scene.add(door);
    const gateCollider = h.addSolid(0, 0, GATE_Z, 6.6, 4.0, 0.8);

    const sign = Game.makeLabelSprite('🔒 先解开全部谜语', 0.55, {
      fontSize: 44, bg: 'rgba(255,226,226,.96)'
    });
    sign.position.set(0, 5.9, GATE_Z);
    ctx.scene.add(sign);

    rt.door = door;
    rt.gateCollider = gateCollider;
    rt.gateSign = sign;

    /* 走过大门 = 通关 */
    ctx.zone({
      x: 0, z: EXIT_Z, r: 5, once: true,
      enabled: function () { return rt.gateOpen; },
      onEnter: function () {
        const learned = ctx.save.list('solvedKeys').length;
        ctx.complete({
          chip: '🎊 第 1 关 通过',
          title: '谜语全解开啦！',
          html: '<h2>你真是个小机灵鬼！</h2>' +
            '<p>这一轮的 ' + ROUND_SIZE + ' 个谜语你全答对了，' +
            '获得了 <b>智慧钥匙 🔑</b> 和 <b>60 枚金币</b>。</p>' +
            '<p>到现在为止，你一共猜出过 <b>' + learned + '</b> 个不同的谜语啦！</p>' +
            '<p>下次再来森林，石碑上会换上<b>新的一批谜语</b>哦～</p>' +
            '<div class="start-arts">🔑 🌳 🚪</div>',
          coins: 0
        });
      }
    });
  }

  function setGate(ctx, open, instant) {
    const rt = ctx.data;
    rt.gateOpen = !!open;
    if (!open) return;
    if (instant) {
      rt.doorT = 1;
      rt.door.position.y = -4.4;
      rt.gateCollider.enabled = false;
      rt.gateCollider.maxY = 0.01;
    }
    Game.setLabelText(rt.gateSign, '➡ 往前走吧！', {
      fontSize: 44, bg: 'rgba(190,255,200,.96)'
    });
  }

  /* 这一轮的 6 道题是不是都答完了 */
  function roundDone(ctx) {
    const rt = ctx.data;
    if (!rt || !rt.round.length) return false;
    const solved = ctx.save.list('solvedKeys');
    return rt.round.every(function (r) { return solved.indexOf(r.key) >= 0; });
  }

  /* 把大门重新关上（换新一批题的时候用） */
  function closeGate(ctx) {
    const rt = ctx.data;
    rt.gateOpen = false;
    rt.doorT = 0;
    rt.door.position.y = 0;
    rt.gateCollider.enabled = true;
    rt.gateCollider.maxY = 4.0;
    Game.setLabelText(rt.gateSign, '🔒 先解开全部谜语', {
      fontSize: 44, bg: 'rgba(255,226,226,.96)'
    });
  }

  /* ★换一批新谜语★：从题库里再随机抽 6 道（没答过的优先） */
  function newRound(ctx, auto) {
    const rt = ctx.data;
    if (!Game.RIDDLES.length) {
      ctx.toast('题库是空的，去 src/content/banks 里加点谜语吧～', 'bad', 4000);
      return false;
    }
    const round = Game.pickRiddles(ROUND_SIZE, {
      exclude: ctx.save.list('solvedKeys'), cats: RIDDLE_CATS
    });
    const same = round.length === rt.round.length && round.every(function (r, i) {
      return rt.round[i] && rt.round[i].key === r.key;
    });

    rt.round = round;
    rt.legacyDone = false;
    /* 石碑复位，重新挂牌子 */
    rt.stones.forEach(function (stone, i) {
      stone.reset('谜语 ' + (i + 1) + ' ❓');
    });
    closeGate(ctx);
    ctx.director._refreshObjective();

    if (auto) {
      ctx.toast('🎲 石碑换上了<b>新的一批谜语</b>，接着猜吧！', 'gold', 4000, 'riddle-batch');
      Game.Sfx.unlock();
    } else if (same) {
      ctx.toast('题库里的谜语都答过一遍啦～ 再猜猜这几道吧 🎲', 'gold', 4000, 'riddle-batch');
    } else {
      ctx.toast('🎲 换好啦！6 道新谜语已经刻到石碑上了', 'gold', 3200, 'riddle-batch');
      Game.Sfx.click();
    }
    return true;
  }

  /* 打开一座石碑的谜语面板 */
  function openRiddle(ctx, i) {
    const rt = ctx.data;
    const r = rt.round[i];
    if (!r) return;
    const solved = ctx.save.list('solvedKeys').indexOf(r.key) >= 0;

    Game.Quiz.ask(ctx, {
      chip: '❓ 谜语 ' + (i + 1) + ' / ' + ROUND_SIZE + ' · ' + (r.label || ''),
      question: r.q,
      answer: r.a,
      options: r.options,
      hint: r.hint,
      /* 注意：这里故意不放图案（emoji）—— 图案会把答案泄露了 😄 */
      preHTML: solved ? '<div class="big-emoji">⭐</div>' : '',
      rightText: '答对啦！你真是个小机灵鬼 🎉',
      locked: solved ? { text: '这块石碑已经解开啦～' } : null,
      onCorrect: function (panel) {
        solveRiddle(ctx, r);
        setTimeout(function () { panel.close(); }, 850);
      }
    });
  }

  function solveRiddle(ctx, r) {
    const rt = ctx.data;
    if (ctx.save.list('solvedKeys').indexOf(r.key) >= 0) return;
    ctx.save.pushUnique('solvedKeys', r.key);
    const i = rt.round.indexOf(r);
    const stone = rt.stones[i];
    if (stone) stone.setSolved('⭐ 已解开');
    ctx.addCoins(10);
    if (stone) {
      const pos = new THREE.Vector3().copy(stone.group.position).setY(3.2);
      ctx.particles.burst(pos, 0x7dff9b, 22, 1.3);
    }
    Game.Sfx.correct();
    ctx.director._refreshObjective();

    const solved = ctx.save.list('solvedKeys');
    const allDone = rt.round.length && rt.round.every(function (x) { return solved.indexOf(x.key) >= 0; });
    if (allDone && !rt.gateOpen) {
      setGate(ctx, true, false);
      ctx.addCoins(50);
      Game.Sfx.unlock();
      ctx.fx.flash('#c9ffd8', 0.4);
      ctx.toast('🔑 大门打开啦！+60 🪙 金币', 'gold', 4200);
      ctx.director._refreshObjective();
    } else {
      ctx.toast('✅ 答对啦！+10 🪙 金币', 'good', 2400);
    }
    Game.UI.stats({ coins: ctx.director.save.game().coins, items: ctx.itemCount() });
  }
})();

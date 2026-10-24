/* ===================================================================
   levels/hanzi-classroom/level.js
   汉字教室（学习关卡示范）
   -------------------------------------------------------------------
   玩法：教室里摆着 5 张字卡桌，走过去按 E「认字」：
         先看大字 + 拼音 + 意思 + 组词，然后做一道小测验。
         答对 +5 金币，字卡变成绿色「✅ 学会了」。
         5 张全部学会 → 通关。
   每次进来会自动挑 5 个「还没学过」的汉字，所以可以一直玩下去。
   ★ 跟老师说话，老师就会马上给你换一批新字（可以一直学下去）★

   ★ 想加汉字：改 src/content/hanzi.js（纯数据，不用碰代码）★
   ★ 想做古诗 / 拼音 / 口算教室：复制这个文件夹，改改玩法就行 ★
   =================================================================== */
(function () {
  const Game = window.Game;

  const CARD_COUNT = 5;
  const CARD_X = [-8, -4, 0, 4, 8];     // 5 张字卡桌的横向位置
  const CARD_Z = 2;

  /* 找出某个汉字的数据（未知字符就退回第一个，保证不会报错） */
  function hanziOf(ch) {
    return Game.HANZI.filter(function (x) { return x.char === ch; })[0] || Game.HANZI[0];
  }

  Game.Levels.register({
    id: 'hanzi-classroom',
    order: 30,
    name: '汉字教室',
    subtitle: '第 3 关',
    icon: '📚',
    bounds: { minX: -22, maxX: 22, minZ: -22, maxZ: 22 },
    spawn: { x: 0, z: 14 },
    camera: { yaw: 0, pitch: 0.34, dist: 8.4 },
    theme: { fog: 0xf2f8ff, fogNear: 55, fogFar: 160 },
    hint: '📚 走到字卡桌前按 E，认一认上面的汉字吧！',

    build(ctx) {
      const h = ctx.helpers;
      const B = ctx.bounds;
      const save = ctx.save;
      const rt = (ctx.data = { cards: [], teacher: null, board: null });

      /* 挑 5 个还没学过的汉字（学过的会留到下一轮再复习） */
      const learned = save.list('learned');
      let picked = save.get('picked', null);
      if (!picked || !picked.length || picked.some(function (ch) { return learned.indexOf(ch) >= 0; })) {
        picked = Game.pickHanzi(CARD_COUNT, learned).map(function (x) { return x.char; });
        save.set('picked', picked);
      }
      rt.picked = picked;

      /* ---------------- 地面 + 木地板 ---------------- */
      h.addGround(B.maxX - B.minX + 12, B.maxZ - B.minZ + 12);
      const wood = Game.Textures.wood();
      wood.repeat.set(8, 7);
      h.addPatch(0, 0, 26, 22, wood);
      h.addBounds(B);
      h.addClouds(10);

      /* ---------------- 黑板 ---------------- */
      const board = h.addBox(0, 2.6, -14, 12, 4.2, 0.5,
        new THREE.MeshLambertMaterial({ color: 0x2f4034, emissive: 0x0d1a12 }));
      h.addBox(-5.6, 0, -14, 0.5, 2.6, 0.5, Game.mat(0x8a5a2b));
      h.addBox(5.6, 0, -14, 0.5, 2.6, 0.5, Game.mat(0x8a5a2b));
      const boardLabel = Game.makeLabelSprite('汉字教室 · 认字啦', 0.7, {
        fontSize: 52, bg: 'rgba(255,255,255,.92)'
      });
      boardLabel.position.set(0, 5.6, -13.6);
      ctx.scene.add(boardLabel);
      rt.board = board;
      rt.boardLabel = boardLabel;
      h.block(0, -14, 8);

      /* ---------------- 老师 ---------------- */
      const teacher = Game.makeNPC('teacher', { name: '老师 👩‍🏫' });
      teacher.group.position.set(0, 0, -10.5);
      teacher.group.rotation.y = Math.PI;      // 面朝学生（南）
      ctx.scene.add(teacher.group);
      ctx.entity(teacher);
      h.addSolid(0, 0, -10.5, 0.7, 1.8, 0.5);
      rt.teacher = teacher;
      ctx.interact({
        kind: 'npc',
        label: '按 E 和老师说话 👩‍🏫',
        pos: { x: 0, z: -10.5 },
        radius: 3.0,
        onUse: function () { talkToTeacher(ctx); }
      });

      /* ---------------- 5 张字卡桌 ---------------- */
      picked.forEach(function (ch, i) {
        const info = hanziOf(ch);
        const card = makeCard(ctx, CARD_X[i], CARD_Z, info);
        rt.cards.push(card);
        if (learned.indexOf(ch) >= 0) setCardLearned(card);
        card.item = ctx.interact({
          kind: 'hanzi',
          label: card.learned ? '按 E 再读一遍 📖' : '按 E 认字 ✏️',
          pos: { x: CARD_X[i], z: CARD_Z },
          radius: 2.8,
          onUse: function () { openLesson(ctx, i); }
        });
      });

      /* ---------------- 回广场 ---------------- */
      ctx.returnPortal(-11, 18, {
        rotationY: Math.atan2(11, -18), r: 1.6, label: '⬅ 回广场'
      });

      /* ---------------- 装饰 ---------------- */
      const rect = [B.minX + 3, B.maxX - 3, B.minZ + 3, B.maxZ - 3];
      h.block(0, 0, 17);                       // 教室中间不放东西
      h.scatter(16, rect, function (x, z) { h.makeTree(x, z, Game.rand(0.8, 1.1)); }, 3.0);
      h.scatter(20, rect, function (x, z) {
        h.makeFlower(x, z, Game.pick([0xff6b6b, 0xffd447, 0x9b6bff, 0xffffff]));
      }, 1.3);
      /* 教室四角的小盆栽 */
      [[-11, -8], [11, -8], [-11, 10], [11, 10]].forEach(function (p) {
        h.makeFlower(p[0], p[1], 0x4fbf9a);
      });
    },

    objective(ctx) {
      const rt = ctx.data || { cards: [] };
      const learned = ctx.save.list('learned');
      const left = rt.cards.filter(function (c) { return learned.indexOf(c.char) < 0; });
      if (left.length) {
        const next = left[0];
        return {
          text: '走到字卡桌前按 E 认字，还剩 ' + left.length + ' 个字没学',
          target: { x: next.x, z: next.z },
          progress: { label: '认字', value: rt.cards.length - left.length, max: rt.cards.length }
        };
      }
      return {
        text: '这一轮的字都学会啦！去和老师说一声吧 👩‍🏫',
        target: { x: 0, z: -10.5 },
        progress: { label: '认字', value: rt.cards.length, max: rt.cards.length }
      };
    }
  });

  /* ================= 字卡桌 ================= */
  function makeCard(ctx, x, z, info) {
    const h = ctx.helpers;
    const g = new THREE.Group();
    const woodMat = new THREE.MeshLambertMaterial({ map: Game.Textures.wood() });

    /* 桌子：桌板 + 四条腿 */
    const top = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.18, 1.3), woodMat);
    top.position.y = 1.0;
    top.castShadow = top.receiveShadow = true;
    g.add(top);
    [[-0.9, -0.5], [0.9, -0.5], [-0.9, 0.5], [0.9, 0.5]].forEach(function (p) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.0, 0.16), woodMat);
      leg.position.set(p[0], 0.5, p[1]);
      leg.castShadow = true;
      g.add(leg);
    });
    h.addSolid(x, 0, z, 2.1, 1.0, 1.3);

    /* 字卡（永远面向小朋友，不用歪头看） */
    const text = info.char + '  ' + info.pinyin;
    const card = Game.makeLabelSprite(text, 1.0, {
      fontSize: 64, bg: 'rgba(255,250,240,.97)', border: '#4a3421'
    });
    card.position.set(0, 1.85, 0);
    g.add(card);

    /* 卡座 */
    const stand = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.22, 0.16), Game.mat(0x8a5a2b));
    stand.position.set(0, 1.18, 0.1);
    g.add(stand);

    g.position.set(x, 0, z);
    ctx.scene.add(g);
    ctx.entity({
      animate: function (dt, time) {
        card.position.y = 1.85 + Math.sin(time * 2 + x) * 0.05;
      }
    });
    h.block(x, z, 2.2);

    return { char: info.char, info: info, group: g, card: card, x: x, z: z, learned: false };
  }

  function setCardLearned(card) {
    card.learned = true;
    Game.setLabelText(card.card, '✅ ' + card.char + ' ' + card.info.pinyin, {
      fontSize: 64, bg: 'rgba(190,255,200,.97)', border: '#1f7a35'
    });
  }

  /* ================= 认字面板 ================= */
  function openLesson(ctx, i) {
    const card = ctx.data.cards[i];
    if (!card) return;
    const info = card.info;
    const known = card.learned;
    let feedback = null;

    const panel = ctx.panel({
      chip: '📚 认字 · ' + info.char,
      wide: false,
      html:
        '<div class="hanzi-head">' +
          '<div class="hanzi-char">' + info.char + '</div>' +
          '<div class="hanzi-side">' +
            '<div class="hanzi-pinyin">' + info.pinyin + ' ' + info.emoji + '</div>' +
            '<div class="hanzi-mean">' + info.mean + '</div>' +
            '<div class="hanzi-words">组词：' + info.words.join(' · ') + '</div>' +
          '</div>' +
        '</div>' +
        '<p class="ui-text" style="margin:14px 0 6px">' +
          (known ? '这个字你已经认识啦，再读一遍吧～' : '读一读，然后回答小测验：') + '</p>' +
        '<p class="riddle-q">' + info.quiz.q + '</p>' +
        '<div class="feedback"></div>',
      actions: [{
        label: known ? '关上字卡' : '再读一遍',
        kind: 'ghost',
        onClick: function (p) { p.close(); }
      }],
      onMount: function (root) {
        feedback = root.querySelector('.feedback');
        const box = Game.UI.optionButtons(Game.shuffle(info.quiz.options.slice()),
          function (opt, btn) {
            if (opt === info.quiz.a) {
              Game.Sfx.correct();
              Game.UI.lockOptions(box, info.quiz.a);
              feedback.textContent = known ? '又答对啦！👍' : '答对啦！你真棒 🎉 +5 🪙 金币';
              if (!known) learn(ctx, i);
              setTimeout(function () { panel.close(); }, 950);
            } else {
              Game.Sfx.wrong();
              btn.classList.add('wrong');
              btn.disabled = true;
              feedback.textContent = '再读一读：' + info.char + ' ' + info.pinyin +
                '（' + info.mean + '）';
            }
          });
        root.appendChild(box);
        if (known) Game.UI.lockOptions(box, info.quiz.a);
      }
    });
    Game.Sfx.click();
  }

  /* 学会一个字 */
  function learn(ctx, i) {
    const card = ctx.data.cards[i];
    if (!card || card.learned) return;
    ctx.save.pushUnique('learned', card.char);
    setCardLearned(card);
    ctx.addCoins(5);
    ctx.particles.burst(
      new THREE.Vector3(card.x, 2.2, card.z), 0x7dff9b, 20, 1.2);
    Game.UI.stats({ coins: ctx.director.save.game().coins, items: ctx.itemCount() });
    ctx.director._refreshObjective();

    const all = ctx.data.cards.every(function (c) { return c.learned; });
    if (all) {
      Game.Sfx.levelUp();
      setTimeout(function () {
        ctx.complete({
          chip: '📚 汉字教室 · 学完啦',
          title: '这 5 个字都认识啦！',
          html: '<h2>小小学问家！</h2>' +
            '<div class="start-arts">📚 ✏️ 🌟</div>' +
            '<p>你已经认识了 ' + ctx.save.list('learned').length + ' 个汉字！</p>' +
            '<p>下一次进教室，老师会给你 <b>新的 5 个字</b> 哦～</p>'
        });
      }, 1100);
    }
  }

  /* ================= 老师说的话 ================= */
  /* 和老师说话 → 老师说完就给你换一批新字（可以一直学下去） */
  function talkToTeacher(ctx) {
    const rt = ctx.data;
    const left = rt.cards.filter(function (c) { return !c.learned; }).length;
    const lines = teacherLines(ctx);
    if (left > 0) {
      lines.push('这 ' + left + ' 个字先放在桌上，等你想学的时候再来读～');
    }
    lines.push('老师再给你拿 5 个新字来，摆在桌子上啦，去认认看吧！');
    ctx.say(lines, {
      name: '老师', emoji: '👩‍🏫',
      onDone: function () { newBatch(ctx); }
    });
  }

  /* 换一批新字：直接改桌上 5 张字卡的内容（不用重建地图） */
  function newBatch(ctx) {
    const rt = ctx.data;
    const learned = ctx.save.list('learned');
    const picked = Game.pickHanzi(CARD_COUNT, learned).map(function (x) { return x.char; });
    ctx.save.set('picked', picked);
    rt.picked = picked;
    picked.forEach(function (ch, i) {
      const card = rt.cards[i];
      const info = hanziOf(ch);
      card.char = ch;
      card.info = info;
      card.learned = false;
      Game.setLabelText(card.card, ch + '  ' + info.pinyin, {
        fontSize: 64, bg: 'rgba(255,250,240,.97)', border: '#4a3421'
      });
      if (card.item) card.item.label = '按 E 认字 ✏️';
      /* 新一批字还没学过：如果这个名字以前学过，直接标成绿的 */
      if (learned.indexOf(ch) >= 0) setCardLearned(card);
    });
    ctx.particles.burst(new THREE.Vector3(0, 2.4, CARD_Z), 0x9b6bff, 24, 1.4);
    Game.Sfx.unlock();
    ctx.toast('📚 老师换了一批新字，去认认看吧！', 'gold', 3600);
    ctx.director._refreshObjective();
  }

  function teacherLines(ctx) {
    const rt = ctx.data;
    const learnedNow = rt.cards.filter(function (c) { return c.learned; }).length;
    const all = ctx.save.list('learned').length;
    const lines = [];
    if (learnedNow === 0) {
      lines.push('同学们好！欢迎来到汉字教室～');
      lines.push('走到字卡桌前，按 E 就能看字卡，认完还要做一道小测验哦。');
    } else if (learnedNow < rt.cards.length) {
      lines.push('真不错！你已经认识 ' + learnedNow + ' 个字啦，还有 ' +
        (rt.cards.length - learnedNow) + ' 个等着你。');
    } else {
      lines.push('哇！这一轮的字你全都学会了，太厉害啦！');
    }
    lines.push('你现在一共认识 ' + all + ' 个汉字了，每天认几个，很快就会认好多好多字～');
    return lines;
  }
})();

/* ===================================================================
   engine/entities.js
   通用「角色与道具」模型工厂（方块风格，全部用 canvas 贴图 + 方块拼出来）
   -------------------------------------------------------------------
   关卡作者可以直接用：
     Game.makeNPC('elder', { name:'村长爷爷', emoji:'👴' })
     Game.makeChest(3, x, y, z)
     Game.makeStonePillar('谜语 1 ❓', x, z)
     Game.makePortal({ x: 0, z: -20, label: '回广场', color: 0x9b6bff })
     Game.makeSheep(x, z, 4)
     Game.makeGuideArrow()
     Game.makeCharger({ x: 0, z: 0 })      充电器（第 8 关的任务道具）
   每个工厂都会返回一个 { group, ..., animate(dt,time) } 的小对象，
   group 要自己 scene.add(...)，animate 要交给 ctx.entity(obj) 让它每帧动起来。
   =================================================================== */
(function () {
  const Game = window.Game;
  const C = Game.COLORS;

  /* ============================================================
     小勇士（玩家模型）：方块小人，会摆手摆脚走路，手里拿着一把剑
     opts 可以换颜色（做人机对手时用）：{ shirt, pants, skin }
     ============================================================ */
  Game.makePlayerModel = function (opts) {
    opts = opts || {};
    const group = new THREE.Group();
    const skinColor = opts.skin || C.skin;
    const faceTex = Game.Textures.face(skinColor, 0x6b4423);

    const skinMat = Game.mat(skinColor);
    const shirtMat = Game.mat(opts.shirt || 0x4aa3ff);
    const pantsMat = Game.mat(opts.pants || 0x2f5fbf);
    const shoeMat = Game.mat(0x5a3a22);

    const headMats = [
      skinMat, skinMat, skinMat, skinMat,
      new THREE.MeshLambertMaterial({ map: faceTex }),
      skinMat
    ];
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.62, 0.62), headMats);
    head.castShadow = head.receiveShadow = true;

    const body = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.62, 0.4), shirtMat);
    body.castShadow = body.receiveShadow = true;
    body.position.y = 0.55 + 0.31;

    head.position.y = 1.17 + 0.31;
    group.add(body, head);

    /* 用枢轴让手脚从关节处摆动 */
    function limb(w, h, d, material, pivotX, pivotY) {
      const pivot = new THREE.Group();
      pivot.position.set(pivotX, pivotY, 0);
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
      m.position.y = -h / 2;
      m.castShadow = m.receiveShadow = true;
      pivot.add(m);
      group.add(pivot);
      return pivot;
    }
    const legL = limb(0.26, 0.55, 0.28, pantsMat, -0.17, 0.56);
    const legR = limb(0.26, 0.55, 0.28, pantsMat, 0.17, 0.56);
    const footL = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.12, 0.34), shoeMat);
    footL.position.set(0, -0.55, 0.03);
    footL.castShadow = true;
    legL.add(footL);
    const footR = footL.clone();
    legR.add(footR);

    const armL = limb(0.2, 0.58, 0.22, shirtMat, -0.44, 1.16);
    const armR = limb(0.2, 0.58, 0.22, shirtMat, 0.44, 1.16);
    const handL = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.2, 0.24), skinMat);
    handL.position.y = -0.6;
    handL.castShadow = true;
    armL.add(handL);
    const handR = handL.clone();
    armR.add(handR);

    /* 背上的小背包 */
    const bag = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.44, 0.28), Game.mat(0xffb03a));
    bag.position.set(0, 0.95, -0.32);
    bag.castShadow = true;
    group.add(bag);

    /* 手里的剑（跟着装备等级换颜色） */
    const sword = new THREE.Group();
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.26, 0.1), Game.mat(0x6b4423));
    grip.position.y = 0.05;
    const guard = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.08, 0.12), Game.mat(0xd8b45c));
    guard.position.y = 0.2;
    const blade = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.85, 0.16), Game.mat(0xcfd8e0, { emissive: 0x1a1f24 }));
    blade.position.y = 0.66;
    blade.castShadow = true;
    sword.add(grip, guard, blade);
    sword.position.set(0.02, -0.55, 0.16);
    sword.rotation.x = -0.35;
    armR.add(sword);

    const P = {
      group: group,
      head: head,
      sword: sword,
      blade: blade,
      legL: legL, legR: legR, armL: armL, armR: armR,
      walkT: 0,
      swingT: 0,                 // >0 表示正在挥武器（秒）
      /* 挥一下武器：擂台关按 F 时调用 */
      swing: function () { P.swingT = 0.3; return P; },
      /* tier: 0 石 / 1 铁 / 2 金 / 3 钻石 */
      setTier: function (tier) {
        const colors = [0xcfd8e0, 0xdcdcdc, 0xffd447, 0x7ef0ff];
        const emissive = [0x1a1f24, 0x2b2b2b, 0x8a6a00, 0x1e6f8a];
        tier = Game.Math.clamp(tier | 0, 0, 3);
        blade.material = Game.mat(colors[tier], { emissive: emissive[tier] });
        blade.scale.set(1 + tier * 0.12, 1 + tier * 0.22, 1 + tier * 0.1);
      },
      animate: function (dt, moving, grounded, time) {
        if (moving && grounded) P.walkT += dt * 11;
        const s = Math.sin(P.walkT);
        const target = moving && grounded ? 0.85 : 0;
        P.legL.rotation.x = Game.lerp(P.legL.rotation.x, s * target, 0.35);
        P.legR.rotation.x = Game.lerp(P.legR.rotation.x, -s * target, 0.35);
        P.armL.rotation.x = Game.lerp(P.armL.rotation.x, -s * target * 0.8, 0.35);
        P.armR.rotation.x = Game.lerp(P.armR.rotation.x, s * target * 0.8 - 0.3, 0.35);
        P.armR.rotation.z = Game.lerp(P.armR.rotation.z, 0, 0.3);
        if (P.swingT > 0) {
          /* 举手 → 劈下来 → 收回 */
          P.swingT = Math.max(0, P.swingT - dt);
          const t = 1 - P.swingT / 0.3;
          const a = Math.sin(t * Math.PI);
          P.armR.rotation.x = 1.1 - a * 3.0;
          P.armR.rotation.z = -a * 0.55;
        }
        if (!moving) {
          head.rotation.z = Math.sin(time * 1.4) * 0.03;   // 待机时轻轻呼吸/歪头
          body.scale.y = 1 + Math.sin(time * 2.2) * 0.01;
        } else {
          head.rotation.z = 0;
          body.scale.y = 1;
        }
      }
    };
    P.setTier(0);
    return P;
  };

  /* ============================================================
     人机对手（擂台关用）：彩色小勇士 + 头顶名字 + 血条
     const bot = Game.makeBot({ name:'红队长', shirt:0xff6b6b, hp:100 })
     bot.setHp(60) / bot.damage(20) / bot.swing() / bot.setLabel('...')
     ============================================================ */
  Game.makeBot = function (opts) {
    opts = opts || {};
    const hpMax = opts.hp || 100;
    const group = new THREE.Group();
    const model = Game.makePlayerModel({ shirt: opts.shirt, pants: opts.pants, skin: opts.skin });
    group.add(model.group);

    const label = Game.makeLabelSprite(opts.name || '小对手', 0.44, {
      fontSize: 44, bg: opts.labelBg || 'rgba(255,255,255,.92)'
    });
    label.position.set(0, 2.8, 0);
    group.add(label);

    const barW = 1.7, barH = 0.17;
    const barBg = new THREE.Mesh(new THREE.BoxGeometry(barW, barH, 0.06), Game.mat(0x2b2f3a));
    barBg.position.set(0, 2.42, 0);
    const barFill = new THREE.Mesh(new THREE.BoxGeometry(barW - 0.08, barH - 0.05, 0.09), Game.mat(0x6bff8f));
    barFill.position.set(0, 2.42, 0.01);
    group.add(barBg, barFill);

    const B = {
      group: group,
      model: model,
      hpMax: hpMax,
      hp: hpMax,
      alive: true,
      name: opts.name || '小对手',
      swing: function () { model.swing(); return B; },
      setLabel: function (text, bg) {
        Game.setLabelText(label, text, { fontSize: 44, bg: bg || 'rgba(255,255,255,.92)' });
        return B;
      },
      showBar: function (v) { barBg.visible = barFill.visible = v !== false; return B; },
      setHp: function (v) {
        B.hp = Game.clamp(v, 0, hpMax);
        const r = B.hp / hpMax;
        barFill.scale.x = Math.max(0.001, r);
        barFill.position.x = -(barW - 0.08) * (1 - r) / 2;
        barFill.material = Game.mat(r > 0.5 ? 0x6bff8f : (r > 0.25 ? 0xffd447 : 0xff6b6b));
        return B;
      },
      damage: function (n) { B.setHp(B.hp - n); return B; },
      animate: function (dt, moving, grounded, time) {
        model.animate(dt, moving, grounded, time);
      }
    };
    B.setHp(hpMax);
    return B;
  };

  /* ============================================================
     引导箭头：飘在玩家头顶，指向当前目标
     ============================================================ */
  Game.makeGuideArrow = function () {
    const g = new THREE.Group();
    const cone = new THREE.Mesh(
      new THREE.ConeGeometry(0.28, 0.7, 4),
      new THREE.MeshBasicMaterial({ color: 0xffd447 })
    );
    cone.rotation.x = Math.PI / 2;
    cone.position.z = 0.28;
    g.add(cone);
    g.visible = false;
    return g;
  };

  /* ============================================================
     村民 NPC：村长爷爷 / 铁匠大叔 / 老师
     kind: 'elder' | 'smith' | 'teacher'
     ============================================================ */
  const NPC_PRESET = {
    elder:   { name: '村长爷爷 👴', cloth: 0x7a5bbf, hair: 0xffffff, hat: 'straw',  tool: 'staff' },
    smith:   { name: '铁匠大叔 🔨', cloth: 0x8a5a2b, hair: 0x3a2a1c, hat: 'bandana', tool: 'hammer' },
    teacher: { name: '老师 👩‍🏫',   cloth: 0x4fbf9a, hair: 0x3a2a1c, hat: 'none',    tool: 'pointer' }
  };

  Game.makeNPC = function (kind, opts) {
    opts = opts || {};
    const preset = NPC_PRESET[kind] || NPC_PRESET.elder;
    const group = new THREE.Group();
    const skinMat = Game.mat(C.skin);
    const clothMat = Game.mat(opts.cloth || preset.cloth);
    const hairColor = opts.hair || preset.hair;
    const hat = opts.hat || preset.hat;
    const tool = opts.tool || preset.tool;

    const faceTex = Game.Textures.face(C.skin, hairColor);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.66, 0.66), [
      skinMat, skinMat, skinMat, skinMat,
      new THREE.MeshLambertMaterial({ map: faceTex }),
      skinMat
    ]);
    head.position.y = 1.5;
    head.castShadow = head.receiveShadow = true;
    group.add(head);

    /* 胡子（只有村长有） */
    if (kind === 'elder') {
      const beard = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.34, 0.2), Game.mat(hairColor));
      beard.position.set(0, 1.24, 0.3);
      beard.castShadow = true;
      group.add(beard);
    }

    const body = new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.86, 0.44), clothMat);
    body.position.y = 1.02;
    body.castShadow = body.receiveShadow = true;
    group.add(body);

    if (kind === 'smith') {
      const apron = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.7, 0.1), Game.mat(0x4a3421));
      apron.position.set(0, 0.95, 0.26);
      group.add(apron);
    }
    if (hat === 'bandana') {
      const bandana = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.18, 0.7), Game.mat(0xd94f4f));
      bandana.position.y = 1.78;
      group.add(bandana);
    } else if (hat === 'straw') {
      const brim = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.08, 1.0), Game.mat(0xe8c86b));
      brim.position.y = 1.84;
      const top = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.3, 0.5), Game.mat(0xe8c86b));
      top.position.y = 2.0;
      group.add(brim, top);
    } else if (hat === 'bow') {
      const bow = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.24, 0.3), Game.mat(0xff6b9d));
      bow.position.set(-0.3, 1.86, 0);
      group.add(bow);
    }

    function npcLimb(w, h, d, material, x, y) {
      const p = new THREE.Group();
      p.position.set(x, y, 0);
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
      m.position.y = -h / 2;
      m.castShadow = true;
      p.add(m);
      group.add(p);
      return p;
    }
    npcLimb(0.28, 0.6, 0.3, Game.mat(0x4a3421), -0.2, 0.6);
    npcLimb(0.28, 0.6, 0.3, Game.mat(0x4a3421), 0.2, 0.6);
    const armL = npcLimb(0.22, 0.7, 0.24, clothMat, -0.5, 1.4);
    const armR = npcLimb(0.22, 0.7, 0.24, clothMat, 0.5, 1.4);

    if (tool === 'staff') {
      const staff = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.8, 0.1), Game.mat(0x8a5a2b));
      staff.position.set(0.02, -0.75, 0.18);
      staff.castShadow = true;
      armR.add(staff);
    } else if (tool === 'hammer') {
      const handle = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.7, 0.1), Game.mat(0x6b4423));
      handle.position.set(0.02, -0.62, 0.12);
      const headM = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.24, 0.24), Game.mat(0x8b96a3));
      headM.position.set(0.02, -0.3, 0.12);
      headM.castShadow = true;
      armR.add(handle, headM);
    } else if (tool === 'pointer') {
      const stick = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.2, 0.06), Game.mat(0x8a5a2b));
      stick.position.set(0.02, -0.7, 0.1);
      stick.rotation.z = 0.25;
      armR.add(stick);
    }

    const nameSprite = Game.makeLabelSprite(opts.name || preset.name, 0.5, {
      fontSize: 44,
      bg: opts.bg || 'rgba(255,246,224,.96)'
    });
    nameSprite.position.y = 2.5;
    group.add(nameSprite);

    return {
      group: group,
      name: nameSprite,
      animate: function (dt, time) {
        head.rotation.z = Math.sin(time * 1.3) * 0.05;
        armL.rotation.x = Math.sin(time * 1.6) * 0.12;
        armR.rotation.x = -0.15 + Math.sin(time * 1.6 + 1) * 0.12;
        group.position.y = Math.sin(time * 1.8) * 0.04;
      }
    };
  };

  /* ============================================================
     宝箱：木头 + 金边，打开时盖子向后翻
     ============================================================ */
  Game.makeChest = function (id, x, y, z, opts) {
    opts = opts || {};
    const group = new THREE.Group();
    const chestTex = Game.Textures.wood();
    chestTex.repeat.set(1.2, 1.2);
    const wood = new THREE.MeshLambertMaterial({ map: chestTex, color: 0xe8b877 });
    const woodDark = new THREE.MeshLambertMaterial({ map: chestTex, color: 0xc79355 });
    const gold = Game.mat(0xffc93c);
    const baseH = 0.62;

    const box = new THREE.Mesh(new THREE.BoxGeometry(1.05, baseH, 0.78), wood);
    box.position.y = baseH / 2;
    box.castShadow = box.receiveShadow = true;
    group.add(box);

    const trim1 = new THREE.Mesh(new THREE.BoxGeometry(1.11, 0.16, 0.84), gold);
    trim1.position.y = baseH - 0.05;
    const trim2 = new THREE.Mesh(new THREE.BoxGeometry(1.11, 0.16, 0.84), gold);
    trim2.position.y = 0.08;
    group.add(trim1, trim2);
    const lock = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.28, 0.12), gold);
    lock.position.set(0, baseH - 0.12, 0.42);
    group.add(lock);

    /* 盖子（枢轴在后方上沿） */
    const lidPivot = new THREE.Group();
    lidPivot.position.set(0, baseH, -0.39);
    const lid = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.26, 0.82), woodDark);
    lid.position.set(0, 0.1, 0.39);
    lid.castShadow = true;
    const lidTrim = new THREE.Mesh(new THREE.BoxGeometry(1.09, 0.1, 0.86), gold);
    lidTrim.position.set(0, 0.24, 0.39);
    lidPivot.add(lid, lidTrim);
    group.add(lidPivot);

    group.position.set(x, y, z);
    group.rotation.y = Game.rand(-0.35, 0.35);

    /* 未打开时头顶飘一颗小星星 */
    const star = Game.makeLabelSprite(opts.star || '✨', 0.6, {
      fontSize: 56, bg: 'rgba(255,246,224,0)', border: 'rgba(0,0,0,0)'
    });
    star.position.y = 1.62;
    group.add(star);

    return {
      id: id,
      group: group,
      star: star,
      opened: false,
      openT: 0,
      open: function () {
        if (this.opened) return false;
        this.opened = true;
        this.star.visible = false;
        return true;
      },
      setOpened: function () {
        this.opened = true;
        this.openT = 1;
        this.star.visible = false;
        lidPivot.rotation.x = -1.85;
      },
      animate: function (dt, time) {
        if (this.opened) {
          if (this.openT < 1) {
            this.openT = Math.min(1, this.openT + dt * 3.2);
            lidPivot.rotation.x = -1.85 * this.openT;
          }
        } else {
          const s = 1 + Math.sin(time * 2.4) * 0.02;
          box.scale.set(1, s, 1);
          star.position.y = 1.62 + Math.sin(time * 2.6) * 0.12;
        }
      }
    };
  };

  /* ============================================================
     石碑：水晶柱，解开后水晶变绿（谜语 / 汉字 都能用）
     ============================================================ */
  Game.makeStonePillar = function (index, x, z, opts) {
    opts = opts || {};
    const group = new THREE.Group();
    const stoneMat = new THREE.MeshLambertMaterial({ map: Game.Textures.stone() });

    const base = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.4, 1.5), stoneMat);
    base.position.y = 0.2;
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.95, 2.0, 0.95), stoneMat);
    pillar.position.y = 1.4;
    const cap = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.25, 1.25), stoneMat);
    cap.position.y = 2.52;
    [base, pillar, cap].forEach(function (m) { m.castShadow = m.receiveShadow = true; group.add(m); });

    const crystalMat = new THREE.MeshLambertMaterial({
      color: opts.color === undefined ? 0x7ef0ff : opts.color,
      emissive: opts.emissive === undefined ? 0x1e6f8a : opts.emissive
    });
    const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.42), crystalMat);
    crystal.position.y = 3.15;
    crystal.castShadow = true;
    group.add(crystal);

    const label = Game.makeLabelSprite(opts.label || ('编号 ' + (index + 1)), 0.48, { fontSize: 44 });
    label.position.y = 4.0;
    group.add(label);

    group.position.set(x, 0, z);

    return {
      index: index,
      group: group,
      crystal: crystal,
      label: label,
      solved: false,
      baseY: 3.15,
      /* 换一块头顶的牌子（会替换掉原来那块） */
      setLabel: function (text, bg) {
        if (this.label) group.remove(this.label);
        const sprite = Game.makeLabelSprite(text, 0.48, {
          fontSize: 44, bg: bg || 'rgba(255,255,255,.92)'
        });
        sprite.position.y = 4.0;
        group.add(sprite);
        this.label = sprite;
        return this;
      },
      setSolved: function (text) {
        this.solved = true;
        crystal.material = new THREE.MeshLambertMaterial({ color: 0x7dff9b, emissive: 0x1f7a35 });
        this.setLabel(text || '⭐ 已完成', 'rgba(180,255,190,.96)');
        return this;
      },
      /* 复位成「还没解开」的样子（谜语森林换一批新题时用） */
      reset: function (text) {
        this.solved = false;
        crystal.material = new THREE.MeshLambertMaterial({
          color: opts.color === undefined ? 0x7ef0ff : opts.color,
          emissive: opts.emissive === undefined ? 0x1e6f8a : opts.emissive
        });
        this.setLabel(text || ('编号 ' + (index + 1)));
        return this;
      },
      animate: function (dt, time) {
        crystal.rotation.y += dt * (this.solved ? 2.2 : 0.9);
        crystal.position.y = this.baseY + Math.sin(time * 2 + index) * 0.12;
      }
    };
  };

  /* ============================================================
     铁匠铺：小房子 + 熔炉 + 铁砧 + 招牌（带碰撞盒，交给关卡登记）
     ============================================================ */
  Game.makeForge = function (x, z) {
    const group = new THREE.Group();
    const stoneMat = new THREE.MeshLambertMaterial({ map: Game.Textures.stone() });
    const woodMat = new THREE.MeshLambertMaterial({ map: Game.Textures.wood() });

    const floor = new THREE.Mesh(new THREE.BoxGeometry(7, 0.3, 7), stoneMat);
    floor.position.y = 0.15;
    floor.receiveShadow = true;
    group.add(floor);

    [[-3, -3], [3, -3], [-3, 3], [3, 3]].forEach(function (p) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.4, 3.4, 0.4), woodMat);
      post.position.set(p[0], 2.0, p[1]);
      post.castShadow = true;
      group.add(post);
    });
    const roof = new THREE.Mesh(new THREE.BoxGeometry(7.6, 0.5, 7.6), Game.mat(0xd94f4f));
    roof.position.y = 3.8;
    roof.castShadow = true;
    group.add(roof);

    const furnace = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.5, 1.3), stoneMat);
    furnace.position.set(-2.1, 1.05, -1.9);
    furnace.castShadow = true;
    group.add(furnace);
    const fire = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.5, 0.2),
      new THREE.MeshBasicMaterial({ color: 0xff8a2b }));
    fire.position.set(-2.1, 0.95, -1.25);
    group.add(fire);
    const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 0.9), stoneMat);
    chimney.position.set(-2.1, 2.2, -1.9);
    group.add(chimney);

    const anvilBase = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.6, 0.8), Game.mat(0x6b6f75));
    anvilBase.position.set(1.9, 0.6, -1.4);
    const anvilTop = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.4, 0.8), Game.mat(0x8b96a3));
    anvilTop.position.set(1.9, 1.1, -1.4);
    anvilTop.castShadow = true;
    group.add(anvilBase, anvilTop);

    const oreMat = new THREE.MeshLambertMaterial({ color: 0x7ef0ff, emissive: 0x1e6f8a });
    [[2.6, 0.45, 1.6], [2.1, 0.45, 2.2], [3.1, 0.45, 2.1]].forEach(function (p, i) {
      const ore = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.45, 0.45),
        i % 2 ? oreMat : Game.mat(0xffc93c));
      ore.position.set(p[0], p[1], p[2]);
      ore.castShadow = true;
      group.add(ore);
    });

    const sign = Game.makeLabelSprite('铁匠铺 🔥 按 E 锻造', 0.62, {
      fontSize: 44, bg: 'rgba(255,212,71,.96)'
    });
    sign.position.set(0, 4.6, 0);
    group.add(sign);

    group.position.set(x, 0, z);

    return {
      group: group,
      sign: sign,
      fire: fire,
      animate: function (dt, time) {
        fire.scale.set(1, 0.85 + Math.sin(time * 7) * 0.18, 1);
        sign.position.y = 4.6 + Math.sin(time * 1.6) * 0.08;
      }
    };
  };

  /* ============================================================
     传送门（石拱门 + 发光圆面）
       const p = Game.makePortal({ x, z, label:'第 2 关 · 宝箱山谷', locked:true })
       scene.add(p.group)
       p.setUnlocked(true)     // 变紫色 + 旋转发光
       p.setLabel('✅ 已通关')
       p.animate(dt, time)
     ============================================================ */
  Game.makePortal = function (opts) {
    opts = opts || {};
    const group = new THREE.Group();
    const r = opts.r || 2.3;
    const baseColor = opts.color === undefined ? 0x9b6bff : opts.color;

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(r, opts.tube || 0.42, 8, 20), Game.mat(0x8b96a3));
    ring.castShadow = true;
    group.add(ring);

    const coreMat = new THREE.MeshLambertMaterial({
      color: 0x5b6472, transparent: true, opacity: 0.8
    });
    const core = new THREE.Mesh(new THREE.CircleGeometry(r - 0.2, 24), coreMat);
    core.position.z = -0.02;
    group.add(core);

    const pedestal = new THREE.Mesh(
      new THREE.BoxGeometry(r * 1.5, 0.5, r * 1.5),
      new THREE.MeshLambertMaterial({ map: Game.Textures.stone() }));
    pedestal.position.y = -r - 0.4;
    pedestal.receiveShadow = true;
    group.add(pedestal);

    group.position.set(opts.x || 0, opts.y === undefined ? 3.3 : opts.y, opts.z || 0);
    if (opts.rotationY !== undefined) group.rotation.y = opts.rotationY;

    const sign = Game.makeLabelSprite(opts.label || '传送门', opts.labelHeight || 0.68, {
      fontSize: 44, bg: opts.labelBg || 'rgba(255,246,224,.94)'
    });
    sign.position.set(0, r + 3.0, 0);
    group.add(sign);

    const api = {
      group: group,
      ring: ring,
      core: core,
      coreMat: coreMat,
      sign: sign,
      unlocked: !opts.locked,
      setUnlocked: function (v, color) {
        this.unlocked = !!v;
        /* 没指定颜色 = 用默认的紫色 + 紫色自发光；指定了颜色就不加紫光 */
        const custom = color !== undefined || opts.color !== undefined;
        const tint = color === undefined ? baseColor : color;
        const glow = opts.emissive !== undefined ? opts.emissive : (custom ? 0x000000 : 0x4b1f9e);
        if (this.unlocked) {
          ring.material = Game.mat(tint, { emissive: glow });
          coreMat.color.set(tint);
          coreMat.emissive = new THREE.Color(glow);
          coreMat.opacity = 0.95;
        } else {
          ring.material = Game.mat(0x8b96a3);
          coreMat.color.set(0x5b6472);
          coreMat.emissive = new THREE.Color(0x000000);
          coreMat.opacity = 0.8;
        }
        return this;
      },
      setLabel: function (text, bg) {
        Game.setLabelText(sign, text, { fontSize: 44, bg: bg || 'rgba(255,246,224,.94)' });
        return this;
      },
      animate: function (dt, time) {
        if (!this.unlocked) return;
        ring.rotation.z += dt * 0.5;
        coreMat.opacity = 0.7 + Math.sin(time * 3) * 0.25;
        sign.position.y = r + 3.0 + Math.sin(time * 1.8) * 0.09;
      }
    };
    if (api.unlocked) api.setUnlocked(true, baseColor);
    return api;
  };

  /* ============================================================
     充电器（第 8 关 · 风扇小屋的任务道具）
     ------------------------------------------------------------
     一个白色小方块 + 两根插脚 + 一根线，头顶挂一块牌子，方便小朋友看见。
     广场的工具台和风扇小屋里都用它（引擎层的通用道具，哪一关都能调）。
     ============================================================ */
  Game.makeCharger = function (opts) {
    opts = opts || {};
    const group = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.42, 0.34), Game.mat(0xf7fbff));
    body.position.y = 0.21;
    body.castShadow = body.receiveShadow = true;
    group.add(body);
    [-0.12, 0.12].forEach(function (dx) {
      const foot = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.22, 0.08), Game.mat(0xcfd6de));
      foot.position.set(dx, 0.5, 0.04);
      foot.castShadow = true;
      group.add(foot);
    });
    const cord = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.09, 0.9), Game.mat(0x3a3f47));
    cord.position.set(0, 0.06, -0.5);
    group.add(cord);
    const label = Game.makeLabelSprite(opts.label || '🔌 充电器', 0.42, {
      fontSize: 42, bg: opts.labelBg || 'rgba(255,246,224,.94)'
    });
    label.position.set(0, 1.05, 0);
    group.add(label);
    group.position.set(opts.x || 0, opts.y || 0, opts.z || 0);
    if (opts.rotationY) group.rotation.y = opts.rotationY;
    return { group: group, label: label, taken: false };
  };

  /* ============================================================
     小动物：方块小羊（在广场上溜达，纯装饰）
     ============================================================ */
  Game.makeSheep = function (x, z, homeR) {
    homeR = homeR || 4;
    const group = new THREE.Group();
    const wool = Game.mat(0xfdf6ec, { emissive: 0x2a2620 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.6, 0.7), wool);
    body.position.y = 0.72;
    body.castShadow = body.receiveShadow = true;
    group.add(body);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 0.42), Game.mat(0xf0d6c0));
    head.position.set(0, 0.98, 0.5);
    head.castShadow = true;
    group.add(head);
    const hair = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.3, 0.3), wool);
    hair.position.set(0, 1.16, 0.42);
    group.add(hair);
    [[-0.28, 0.26], [0.28, 0.26], [-0.28, -0.24], [0.28, -0.24]].forEach(function (p) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.45, 0.2), Game.mat(0x4a3421));
      leg.position.set(p[0], 0.22, p[1]);
      leg.castShadow = true;
      group.add(leg);
    });
    group.position.set(x, 0, z);

    return {
      group: group,
      home: new THREE.Vector3(x, 0, z),
      target: new THREE.Vector3(x, 0, z),
      wait: Game.rand(1, 4),
      animate: function (dt, time) {
        const g = this.group;
        const dx = this.target.x - g.position.x, dz = this.target.z - g.position.z;
        const dist = Math.hypot(dx, dz);
        if (dist < 0.3) {
          this.wait -= dt;
          if (this.wait <= 0) {
            this.wait = Game.rand(2, 6);
            const a = Game.rand(0, Math.PI * 2);
            const rr = Game.rand(1, homeR);
            this.target.set(this.home.x + Math.cos(a) * rr, 0, this.home.z + Math.sin(a) * rr);
          }
        } else {
          g.position.x += (dx / dist) * 1.3 * dt;
          g.position.z += (dz / dist) * 1.3 * dt;
          g.rotation.y = Math.atan2(dx, dz);
        }
        g.children.forEach(function (c, i) {
          if (c.geometry && c.position.y < 0.5 && c.position.y > 0.1) {
            c.position.y = 0.22 + Math.max(0, Math.sin(time * 6 + i)) * 0.06;
          }
        });
      }
    };
  };
})();

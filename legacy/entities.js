/* ===================================================================
   方块小勇士 · entities.js
   角色与可交互物件：小勇士、村长、铁匠、宝箱、谜语石碑、铁匠铺、
                   第 3 关传送门引导箭头、小动物
   =================================================================== */
(function () {
  const Game = window.Game;
  const C = Game.COLORS;
  const mat = Game.mat;

  /* ============================================================
     小勇士：方块小人，会摆手摆脚走路，手里拿着一把剑
     ============================================================ */
  Game.makePlayer = function () {
    const group = new THREE.Group();
    const faceTex = Game.tex.face(C.skin, 0x6b4423);

    const skinMat = mat(C.skin);
    const shirtMat = mat(0x4aa3ff);
    const pantsMat = mat(0x2f5fbf);
    const shoeMat = mat(0x5a3a22);

    // 头
    const headMats = [
      skinMat, skinMat, skinMat, skinMat,
      new THREE.MeshLambertMaterial({ map: faceTex }),
      skinMat
    ];
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.62, 0.62), headMats);
    head.castShadow = head.receiveShadow = true;

    // 身体
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.62, 0.4), shirtMat);
    body.castShadow = body.receiveShadow = true;
    body.position.y = 0.55 + 0.31;

    head.position.y = 1.17 + 0.31;
    group.add(body, head);

    // 腿（用枢轴让脚从大腿根摆动）
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
    // 小手
    const handL = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.2, 0.24), skinMat);
    handL.position.y = -0.6;
    handL.castShadow = true;
    armL.add(handL);
    const handR = handL.clone();
    armR.add(handR);

    // 背上的小背包
    const bag = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.44, 0.28), mat(0xffb03a));
    bag.position.set(0, 0.95, -0.32);
    bag.castShadow = true;
    group.add(bag);

    // 手里的剑（随装备升级换颜色）
    const sword = new THREE.Group();
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.26, 0.1), mat(0x6b4423));
    grip.position.y = 0.05;
    const guard = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.08, 0.12), mat(0xd8b45c));
    guard.position.y = 0.2;
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.85, 0.16), mat(0xcfd8e0, { emissive: 0x1a1f24 }));
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
      /* tier: 0 石 1 铁 2 金 3 钻石 */
      setTier: function (tier) {
        const colors = [0xcfd8e0, 0xdcdcdc, 0xffd447, 0x7ef0ff];
        const emissive = [0x1a1f24, 0x2b2b2b, 0x8a6a00, 0x1e6f8a];
        blade.material = mat(colors[tier] || 0xcfd8e0, { emissive: emissive[tier] || 0x1a1f24 });
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
        // 待机时轻轻呼吸
        if (!moving) {
          group.position.y += Math.sin(time * 2.2) * 0.0015;
          head.rotation.z = Math.sin(time * 1.4) * 0.03;
        } else {
          head.rotation.z = 0;
        }
      }
    };
    P.setTier(0);
    return P;
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
     村民 NPC：村长爷爷 / 铁匠大叔
     ============================================================ */
  Game.makeNPC = function (type) {
    const group = new THREE.Group();
    const isSmith = type === 'smith';
    const skinMat = mat(C.skin);
    const clothMat = mat(isSmith ? 0x8a5a2b : 0x7a5bbf);
    const hairColor = isSmith ? 0x3a2a1c : 0xffffff;

    const faceTex = Game.tex.face(C.skin, hairColor);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.66, 0.66), [
      skinMat, skinMat, skinMat, skinMat,
      new THREE.MeshLambertMaterial({ map: faceTex }),
      skinMat
    ]);
    head.position.y = 1.5;
    head.castShadow = head.receiveShadow = true;
    group.add(head);

    // 胡子
    const beard = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.34, 0.2), mat(hairColor));
    beard.position.set(0, 1.24, 0.3);
    beard.castShadow = true;
    group.add(beard);

    const body = new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.86, 0.44), clothMat);
    body.position.y = 1.02;
    body.castShadow = body.receiveShadow = true;
    group.add(body);

    if (isSmith) {
      // 皮围裙
      const apron = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.7, 0.1), mat(0x4a3421));
      apron.position.set(0, 0.95, 0.26);
      group.add(apron);
      // 红头巾
      const bandana = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.18, 0.7), mat(0xd94f4f));
      bandana.position.y = 1.78;
      group.add(bandana);
    } else {
      // 草帽
      const brim = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.08, 1.0), mat(0xe8c86b));
      brim.position.y = 1.84;
      const top = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.3, 0.5), mat(0xe8c86b));
      top.position.y = 2.0;
      group.add(brim, top);
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
    const legL = npcLimb(0.28, 0.6, 0.3, mat(0x4a3421), -0.2, 0.6);
    const legR = npcLimb(0.28, 0.6, 0.3, mat(0x4a3421), 0.2, 0.6);
    const armL = npcLimb(0.22, 0.7, 0.24, clothMat, -0.5, 1.4);
    const armR = npcLimb(0.22, 0.7, 0.24, clothMat, 0.5, 1.4);

    if (!isSmith) {
      // 拐杖
      const staff = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.8, 0.1), mat(0x8a5a2b));
      staff.position.set(0.02, -0.75, 0.18);
      staff.castShadow = true;
      armR.add(staff);
    } else {
      // 锤子
      const handle = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.7, 0.1), mat(0x6b4423));
      handle.position.set(0.02, -0.62, 0.12);
      const headM = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.24, 0.24), mat(0x8b96a3));
      headM.position.set(0.02, -0.3, 0.12);
      headM.castShadow = true;
      armR.add(handle, headM);
    }

    const name = Game.makeLabelSprite(isSmith ? '铁匠大叔 🔨' : '村长爷爷 👴', 0.5,
      { fontSize: 44, bg: isSmith ? 'rgba(255,212,71,.96)' : 'rgba(190,220,255,.96)' });
    name.position.y = 2.5;
    group.add(name);

    return {
      group: group,
      name: name,
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
  Game.makeChest = function (id, x, y, z) {
    const group = new THREE.Group();
    const chestTex = Game.tex.wood();
    chestTex.repeat.set(1.2, 1.2);
    const wood = new THREE.MeshLambertMaterial({ map: chestTex, color: 0xe8b877 });
    const woodDark = new THREE.MeshLambertMaterial({ map: chestTex, color: 0xc79355 });
    const gold = mat(0xffc93c);
    const baseH = 0.62;

    const box = new THREE.Mesh(new THREE.BoxGeometry(1.05, baseH, 0.78), wood);
    box.position.y = baseH / 2;
    box.castShadow = box.receiveShadow = true;
    group.add(box);

    // 金边装饰
    const trim1 = new THREE.Mesh(new THREE.BoxGeometry(1.11, 0.16, 0.84), gold);
    trim1.position.y = baseH - 0.05;
    const trim2 = new THREE.Mesh(new THREE.BoxGeometry(1.11, 0.16, 0.84), gold);
    trim2.position.y = 0.08;
    group.add(trim1, trim2);
    const lock = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.28, 0.12), gold);
    lock.position.set(0, baseH - 0.12, 0.42);
    group.add(lock);

    // 盖子（枢轴在后方上沿）
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

    // 未开封时头顶飘一颗小星星
    const star = Game.makeLabelSprite('✨', 0.6, { fontSize: 56, bg: 'rgba(255,246,224,0)', border: 'rgba(0,0,0,0)' });
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
     谜语石碑：水晶柱，答对后水晶变绿
     ============================================================ */
  Game.makeRiddleStone = function (index, x, z) {
    const group = new THREE.Group();
    const stoneMat = new THREE.MeshLambertMaterial({ map: Game.tex.stone() });

    const base = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.4, 1.5), stoneMat);
    base.position.y = 0.2;
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.95, 2.0, 0.95), stoneMat);
    pillar.position.y = 1.4;
    const cap = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.25, 1.25), stoneMat);
    cap.position.y = 2.52;
    [base, pillar, cap].forEach((m) => { m.castShadow = m.receiveShadow = true; group.add(m); });

    const crystalMat = new THREE.MeshLambertMaterial({ color: 0x7ef0ff, emissive: 0x1e6f8a });
    const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.42), crystalMat);
    crystal.position.y = 3.15;
    crystal.castShadow = true;
    group.add(crystal);

    const label = Game.makeLabelSprite('谜语 ' + (index + 1) + ' ❓', 0.48, { fontSize: 44 });
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
      setSolved: function () {
        this.solved = true;
        crystal.material = new THREE.MeshLambertMaterial({ color: 0x7dff9b, emissive: 0x1f7a35 });
        group.remove(label);
        const star = Game.makeLabelSprite('⭐ 已解开', 0.48, { fontSize: 44, bg: 'rgba(180,255,190,.96)' });
        star.position.y = 4.0;
        group.add(star);
      },
      animate: function (dt, time) {
        crystal.rotation.y += dt * (this.solved ? 2.2 : 0.9);
        crystal.position.y = this.baseY + Math.sin(time * 2 + index) * 0.12;
      }
    };
  };

  /* ============================================================
     铁匠铺：小房子 + 熔炉 + 铁砧 + 招牌
     ============================================================ */
  Game.makeForge = function (x, z) {
    const group = new THREE.Group();
    const stoneMat = new THREE.MeshLambertMaterial({ map: Game.tex.stone() });
    const woodMat = new THREE.MeshLambertMaterial({ map: Game.tex.wood() });

    // 地基
    const floor = new THREE.Mesh(new THREE.BoxGeometry(7, 0.3, 7), stoneMat);
    floor.position.y = 0.15;
    floor.receiveShadow = true;
    group.add(floor);

    // 四角柱子
    [[-3, -3], [3, -3], [-3, 3], [3, 3]].forEach((p) => {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.4, 3.4, 0.4), woodMat);
      post.position.set(p[0], 1.7 + 0.3, p[1]);
      post.castShadow = true;
      group.add(post);
    });
    // 屋顶
    const roof = new THREE.Mesh(new THREE.BoxGeometry(7.6, 0.5, 7.6), mat(0xd94f4f));
    roof.position.y = 3.8;
    roof.castShadow = true;
    group.add(roof);

    // 熔炉
    const furnace = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.5, 1.3), stoneMat);
    furnace.position.set(-2.1, 1.05, -1.9);
    furnace.castShadow = true;
    group.add(furnace);
    const fire = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.5, 0.2), new THREE.MeshBasicMaterial({ color: 0xff8a2b }));
    fire.position.set(-2.1, 0.95, -1.25);
    group.add(fire);
    const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 0.9), stoneMat);
    chimney.position.set(-2.1, 2.2, -1.9);
    group.add(chimney);

    // 铁砧
    const anvilBase = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.6, 0.8), mat(0x6b6f75));
    anvilBase.position.set(1.9, 0.6, -1.4);
    const anvilTop = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.4, 0.8), mat(0x8b96a3));
    anvilTop.position.set(1.9, 1.1, -1.4);
    anvilTop.castShadow = true;
    group.add(anvilBase, anvilTop);

    // 展示架上的“矿石”
    const oreMat = new THREE.MeshLambertMaterial({ color: 0x7ef0ff, emissive: 0x1e6f8a });
    [[2.6, 0.45, 1.6], [2.1, 0.45, 2.2], [3.1, 0.45, 2.1]].forEach((p, i) => {
      const ore = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.45, 0.45), i % 2 ? oreMat : mat(0xffc93c));
      ore.position.set(p[0], p[1], p[2]);
      ore.castShadow = true;
      group.add(ore);
    });

    const sign = Game.makeLabelSprite('铁匠铺 🔥 按 E 锻造', 0.62, { fontSize: 44, bg: 'rgba(255,212,71,.96)' });
    sign.position.set(0, 4.6, 0);
    group.add(sign);

    group.position.set(x, 0, z);

    return {
      group: group,
      sign: sign,
      fire: fire,
      animate: function (dt, time) {
        const s = 0.85 + Math.sin(time * 7) * 0.18;
        fire.scale.set(1, s, 1);
        sign.position.y = 4.6 + Math.sin(time * 1.6) * 0.08;
      }
    };
  };

  /* ============================================================
     小动物：方块小羊（广场上溜达，纯装饰）
     ============================================================ */
  Game.makeSheep = function (x, z, homeR) {
    const group = new THREE.Group();
    const wool = mat(0xfdf6ec, { emissive: 0x2a2620 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.6, 0.7), wool);
    body.position.y = 0.72;
    body.castShadow = body.receiveShadow = true;
    group.add(body);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 0.42), mat(0xf0d6c0));
    head.position.set(0, 0.98, 0.5);
    head.castShadow = true;
    group.add(head);
    const hair = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.3, 0.3), wool);
    hair.position.set(0, 1.16, 0.42);
    group.add(hair);
    [[-0.28, 0.26], [0.28, 0.26], [-0.28, -0.24], [0.28, -0.24]].forEach((p) => {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.45, 0.2), mat(0x4a3421));
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
        const d = new THREE.Vector2(this.target.x - g.position.x, this.target.z - g.position.z);
        const dist = d.length();
        if (dist < 0.3) {
          this.wait -= dt;
          if (this.wait <= 0) {
            this.wait = Game.rand(2, 6);
            const a = Game.rand(0, Math.PI * 2);
            const r = Game.rand(1, homeR);
            this.target.set(this.home.x + Math.cos(a) * r, 0, this.home.z + Math.sin(a) * r);
          }
        } else {
          d.normalize();
          g.position.x += d.x * 1.3 * dt;
          g.position.z += d.y * 1.3 * dt;
          g.rotation.y = Math.atan2(d.x, d.y);
        }
        g.children.forEach((c, i) => {
          if (c.geometry && c.position.y < 0.5 && c.position.y > 0.1) {
            c.position.y = 0.22 + Math.max(0, Math.sin(time * 6 + i)) * 0.06;
          }
        });
      }
    };
  };
})();

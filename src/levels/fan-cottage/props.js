/* ===================================================================
   levels/fan-cottage/props.js   第 8 关自己的方块道具
   -------------------------------------------------------------------
   小朋友 2026-10-24 口述（原文见
     transcripts/2026-10-24-第八关风扇小屋-口述.md）：
     "我们要把风扇装进旁边的小房子里面…这是一个小的，我们可以用缩小能力，
      进去看看里面的样子。前面又有一个白色的空调位置…那个房间有一个门。也有窗户。"

   两个工厂（关卡在 build() 里调用）：
     P.makeHouse(ctx, { x, z })  —— 一栋带门、窗、屋顶的小房子（连屋里的风扇位、
                                    插座、空调位、吊灯都一起做好）
     P.makeFan(ctx, { x, z })    —— 方块小风扇（装好后通电会转）
     P.makeCable(ctx, a, b)      —— 通电以后从风扇拉到插座的那根线

   房子的尺寸（单位：步）：
     外墙 12 × 10 · 墙厚 0.6 · 墙高 3.4 · 屋顶再挑出 1.2
     门在南面：宽 2.4、高 1.2   ← 关键：比小朋友（1.8 步高）矮，
                                  大个子进不去，变小（0.61 步）才钻得进去
   =================================================================== */
(function () {
  const Game = window.Game;
  const P = (Game.FanCottage = Game.FanCottage || {});

  P.WALL_T = 0.6;        // 墙厚
  P.WALL_H = 3.4;        // 墙高
  P.DOOR_W = 2.4;        // 门洞宽
  P.DOOR_H = 1.2;        // 门洞高（★ 大个子钻不进去就是这个数 ★）

  /* ============================================================
     小房子
     ------------------------------------------------------------
     返回的对象里带着关卡要用的几个位置：
       door     门口（南面外侧，站着按 E 就能变小）
       fanSpot  屋里的风扇位（地上一个蓝圈 + 旁边墙上插座）
       acSpot   东墙内侧的「空调位」
       inside(x, z)  某个坐标在不在屋子里（判断小朋友进没进屋）
       powerOn()     通电！吊灯亮 + 空调位自己亮起来（小朋友说的「它本来就有电」）
     ============================================================ */
  P.makeHouse = function (ctx, o) {
    o = o || {};
    const h = ctx.helpers;
    const cx = o.x || 0, cz = o.z || 0;
    const w = o.w || 12, d = o.d || 10;
    const T = P.WALL_T, H = P.WALL_H, DW = P.DOOR_W, DH = P.DOOR_H;
    const hw = w / 2, hd = d / 2;

    /* 墙用木头贴图 + 淡黄色，看起来像搭起来的小木屋 */
    const wallMat = new THREE.MeshLambertMaterial({ map: Game.Textures.wood(), color: 0xf6e6c4 });
    const roofMat = Game.mat(0xd9685a);
    const whiteMat = Game.mat(0xf7fbff);
    const glassMat = new THREE.MeshLambertMaterial({
      color: 0x9fd8ff, transparent: true, opacity: 0.85
    });

    /* ---- 三面实墙（北 / 西 / 东） ---- */
    h.addBox(cx, 0, cz - hd + T / 2, w, H, T, wallMat);                  // 北墙
    h.addBox(cx - hw + T / 2, 0, cz, T, H, d - T * 2, wallMat);          // 西墙
    h.addBox(cx + hw - T / 2, 0, cz, T, H, d - T * 2, wallMat);          // 东墙

    /* ---- 南墙：左右两段 + 上面的门楣（中间留一个 2.4 × 1.2 的门洞） ---- */
    const sz = cz + hd - T / 2;                 // 南墙的中线
    const sideW = (w - DW) / 2;                 // 门洞两边各留多宽
    h.addBox(cx - DW / 2 - sideW / 2, 0, sz, sideW, H, T, wallMat);
    h.addBox(cx + DW / 2 + sideW / 2, 0, sz, sideW, H, T, wallMat);
    h.addBox(cx, DH, sz, DW, H - DH, T, wallMat);   // 门楣：从 1.2 到 3.4 都是实的

    /* ---- 屋顶（挑出 1.2 = 屋檐）+ 屋脊 + 小烟囱 ----
       ★ 屋顶不投影（cast:false）★：屋顶正好把整间屋子罩在阴影里，屋里会黑得看不清。
         不投影 = 阳光照进屋里，小朋友变小钻进去也能看清（外面看起来一模一样）。 */
    h.addBox(cx, H, cz, w + 1.2, 0.5, d + 1.2, roofMat, { cast: false });
    h.addBox(cx, H + 0.5, cz, 1.4, 0.45, d + 0.8, roofMat, { cast: false });
    h.addBox(cx + hw - 2.4, H + 0.5, cz - hd + 2.6, 1.0, 1.2, 1.0, Game.mat(0xcfd6de));

    /* ---- 窗户：南面两扇 + 东面一扇（贴着墙面，纯装饰） ---- */
    [cx - 3.6, cx + 3.6].forEach(function (wx) {
      h.addBox(wx, 1.5, sz + 0.05, 1.5, 1.2, 0.1, whiteMat, { collide: false });
      h.addBox(wx, 1.62, sz + 0.14, 1.2, 0.96, 0.08, glassMat, { collide: false });
      h.addBox(wx, 2.06, sz + 0.16, 0.1, 1.2, 0.06, whiteMat, { collide: false });   // 窗框竖条
    });
    h.addBox(cx + hw + 0.05, 1.5, cz - 2.6, 0.1, 1.2, 1.5, whiteMat, { collide: false });
    h.addBox(cx + hw + 0.14, 1.62, cz - 2.6, 0.08, 0.96, 1.2, glassMat, { collide: false });

    /* ---- 开门的那扇门板（敞开着靠在左边，好看 + 一眼看出「这里有门」） ---- */
    const doorMat = new THREE.MeshLambertMaterial({ map: Game.Textures.wood(), color: 0xc98f5a });
    h.addBox(cx - DW / 2 - 0.07, 0, sz + 1.1, 0.12, DH, DW * 0.92, doorMat, { collide: false });

    /* ---- 屋里的木地板 + 一块小地毯（屋里别空荡荡的） ---- */
    h.addPatch(cx, cz, w - T * 2 - 0.2, d - T * 2 - 0.2, 0xd8b98a);
    h.addPatch(cx + 0.6, cz + 1.6, 4.0, 2.6, 0xb6e0c0, 0.02);
    h.addPatch(cx + 0.6, cz + 1.6, 2.9, 1.7, 0xffe08a, 0.03);

    /* ---- 屋里的家具：一张小桌子 + 两把小凳子 + 墙上的小架子 ---- */
    const woodMat = new THREE.MeshLambertMaterial({ map: Game.Textures.wood(), color: 0xd0a878 });
    h.addBox(cx + 3.4, 0.9, cz - 2.2, 1.8, 0.16, 1.8, woodMat);           // 桌面
    [[-0.7, -0.7], [0.7, -0.7], [-0.7, 0.7], [0.7, 0.7]].forEach(function (o2) {
      h.addBox(cx + 3.4 + o2[0], 0, cz - 2.2 + o2[1], 0.16, 0.9, 0.16, woodMat);
    });
    h.addBox(cx + 3.4, 1.06, cz - 2.2, 0.5, 0.4, 0.5, Game.mat(0xffd447));  // 桌上一个黄盒子
    h.addBox(cx + 1.6, 0.1, cz + 2.4, 0.9, 0.5, 0.9, woodMat);            // 小凳子
    h.addBox(cx - 2.6, 1.4, cz - 4.4, 2.2, 0.16, 0.5, woodMat);            // 墙上小架子

    /* ---- 风扇位：屋里西边地上的蓝圈 + 墙上插座 ---- */
    const fanSpot = { x: cx - hw + 1.9, z: cz };
    h.addRing(fanSpot.x, fanSpot.z, 1.15, 0.2, 0x4aa3ff, { opacity: 0.7 });
    const socket = P.makeSocket(ctx, cx - hw + T + 0.09, 1.0, cz + 1.8);

    /* ---- 空调位：东墙内侧一块白色空位（小朋友说的「白色的空调位置」） ---- */
    /* 挂得矮一点：小朋友变小以后镜头也跟着低了，太高会看不见 */
    const acSpot = { x: cx + hw - T - 0.2, z: cz };
    const acMat = new THREE.MeshLambertMaterial({ color: 0xf7fbff });
    h.addBox(acSpot.x, 0.75, acSpot.z, 0.34, 1.3, 2.6, acMat, { collide: false });
    h.addBox(acSpot.x - 0.2, 0.95, acSpot.z, 0.08, 0.16, 2.2, Game.mat(0xcfd6de), { collide: false });
    const acLabel = Game.makeLabelSprite('白色空调位', 0.5, {
      fontSize: 40, bg: 'rgba(255,255,255,.94)'
    });
    acLabel.position.set(acSpot.x - 0.6, 2.45, acSpot.z);
    ctx.scene.add(acLabel);
    /* 通电以后从空调里冒出来的冷气片（一开始藏起来） */
    const acCold = h.addBox(acSpot.x - 0.55, 0.15, acSpot.z, 0.06, 0.9, 2.3,
      new THREE.MeshLambertMaterial({ color: 0x9fd8ff, transparent: true, opacity: 0.55 }),
      { collide: false });
    acCold.visible = false;

    /* ---- 屋顶的吊灯（通电以后亮起来） ---- */
    const lampMat = new THREE.MeshLambertMaterial({ color: 0xd8dee6 });
    const lamp = h.addBox(cx, H - 0.42, cz, 0.5, 0.3, 0.5, lampMat, { collide: false });
    /* 屋里这盏灯常亮一点点（不然钻进去黑乎乎的），通电以后变亮变暖 */
    const light = new THREE.PointLight(0xffe6a8, 0.55, 20);
    light.position.set(cx, H - 0.6, cz);
    ctx.scene.add(light);

    return {
      cx: cx, cz: cz, w: w, d: d, hw: hw, hd: hd,
      door: { x: cx, z: cz + hd + 1.6 },          // 门口（南面外侧）
      fanSpot: fanSpot,
      socket: socket,
      acSpot: acSpot,
      acLabel: acLabel,
      acCold: acCold,
      lamp: lamp,
      light: light,
      powered: false,

      /* 某个坐标在不在屋子里（用来判断小朋友有没有钻进去） */
      inside: function (x, z) {
        return Math.abs(x - cx) < hw - T && Math.abs(z - cz) < hd - T;
      },

      /* 通电：吊灯亮起来 + 空调位自己就亮了（小朋友说「万一它本来就是有电的呢」） */
      powerOn: function () {
        if (this.powered) return false;
        this.powered = true;
        lampMat.color.set(0xfff2c0);
        lampMat.emissive.set(0xffcf6b);
        acMat.color.set(0xe8f6ff);
        acMat.emissive.set(0x6fb8ff);
        acCold.visible = true;
        light.intensity = 2.0;
        Game.setLabelText(acLabel, '❄ 空调位 · 自己亮了', { fontSize: 40, bg: 'rgba(214,240,255,.96)' });
        return true;
      }
    };
  };

  /* ============================================================
     墙上的插座（白面板 + 两个小黑孔）
     ============================================================ */
  P.makeSocket = function (ctx, x, y, z) {
    const h = ctx.helpers;
    const white = Game.mat(0xf7fbff);
    const dark = Game.mat(0x3a3f47);
    h.addBox(x, y - 0.35, z, 0.18, 0.7, 0.7, white, { collide: false });
    h.addBox(x + 0.11, y + 0.04, z - 0.12, 0.1, 0.12, 0.12, dark, { collide: false });
    h.addBox(x + 0.11, y + 0.04, z + 0.12, 0.1, 0.12, 0.12, dark, { collide: false });
    return { x: x, y: y, z: z };
  };

  /* ============================================================
     方块小风扇（~1 步高）
       底座 + 杆子 + 头 + 四片叶片 + 前面的铁丝罩
     返回 { group, blades, spinSpeed, animate(dt, time) }
     —— 叶片转不转由 spinSpeed 决定（通电以后才有值）
     ============================================================ */
  P.makeFan = function (ctx, o) {
    o = o || {};
    const s = o.scale || 1;
    const group = new THREE.Group();
    const bodyMat = Game.mat(0xdfe8f2);
    const darkMat = Game.mat(0x5b6472);
    const bladeMat = Game.mat(0x4aa3ff);

    const base = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.14, 0.72), bodyMat);
    base.position.y = 0.07;
    const pole = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.5, 0.16), bodyMat);
    pole.position.y = 0.14 + 0.25;
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.66, 0.4), bodyMat);
    head.position.y = 0.98;
    [base, pole, head].forEach(function (m) { m.castShadow = m.receiveShadow = true; group.add(m); });

    /* 四片叶片挂在一个组里，绕 z 轴转（风扇是朝 ±z 的） */
    const blades = new THREE.Group();
    blades.position.set(0, 0.98, 0.24);
    for (let i = 0; i < 4; i++) {
      const holder = new THREE.Group();
      holder.rotation.z = (i / 4) * Math.PI * 2;
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.5, 0.06), bladeMat);
      b.position.y = 0.25;
      b.castShadow = true;
      holder.add(b);
      blades.add(holder);
    }
    group.add(blades);
    /* 中间的轴帽 */
    const hub = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.14), darkMat);
    hub.position.set(0, 0.98, 0.26);
    group.add(hub);
    /* 前面的铁丝罩 */
    const cage = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.035, 6, 20), darkMat);
    cage.position.set(0, 0.98, 0.3);
    group.add(cage);

    group.position.set(o.x || 0, o.y || 0, o.z || 0);
    if (o.rotationY) group.rotation.y = o.rotationY;
    group.scale.setScalar(s);

    const api = {
      group: group,
      blades: blades,
      spinSpeed: 0,                  // 每秒转多少弧度（0 = 不转）
      setSpinning: function (speed) { this.spinSpeed = speed || 0; return this; },
      animate: function (dt) {
        if (this.spinSpeed) this.blades.rotation.z += this.spinSpeed * dt;
      }
    };
    return api;
  };

  /* ============================================================
     一根线（通电以后从风扇拉到插座）：躺在地上的一条细方块
     ============================================================ */
  P.makeCable = function (ctx, a, b, y) {
    const dx = b.x - a.x, dz = b.z - a.z;
    const len = Math.hypot(dx, dz);
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, len), Game.mat(0x3a3f47));
    m.position.set((a.x + b.x) / 2, y === undefined ? 0.07 : y, (a.z + b.z) / 2);
    m.rotation.y = Math.atan2(dx, dz);
    ctx.scene.add(m);
    return m;
  };
})();

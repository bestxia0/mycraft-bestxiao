/* ===================================================================
   levels/desert-escape/props.js   第 5 关自己的方块道具
   -------------------------------------------------------------------
   为什么放在关卡文件夹里、不放进 engine/entities.js：
     engine 里只放「所有关卡共用」的模型（小勇士 / 宝箱 / 村子 NPC…），
     小马、小蛇、小龙卷风只有沙漠这一关用，所以留在关卡自己的文件夹里。

   三个工厂都会返回一个 { group, animate(dt, time) } 的小对象：
     group    → 由关卡自己 ctx.scene.add(...)
     animate  → 由关卡在 update() 里每帧调用（不用 ctx.entity，因为它要传自制参数）
   =================================================================== */
(function () {
  const Game = window.Game;
  const D = (Game.Desert = Game.Desert || {});

  /* ============================================================
     沙地 —— 引擎的 h.addGround 用的是草地贴图（染成黄色会变军绿），
     沙漠要有沙子，所以这里自己画一张沙子贴图，铺一块大平面。
     y 给 0.05（比引擎草地高一点点），免得两个平面打架闪。
     ============================================================ */
  D.sandTex = function (repeat) {
    return Game.Textures.canvas(64, 64, function (g) {
      g.fillStyle = '#eed9a4';
      g.fillRect(0, 0, 64, 64);
      const shades = ['#f7e8c0', '#e2ca90', '#f2ddab', '#d9be83', '#fbeecb'];
      for (let i = 0; i < 300; i++) {
        g.fillStyle = shades[i % shades.length];
        g.fillRect(Math.floor(Math.random() * 64), Math.floor(Math.random() * 64),
          2 + (i % 3), 2 + ((i + 1) % 2));
      }
    }, repeat, repeat);
  };

  D.addSand = function (scene, w, d, y, tint) {
    const tex = D.sandTex(Math.max(6, Math.round(w / 5)));
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(w, d),
      new THREE.MeshLambertMaterial({ map: tex, color: tint === undefined ? 0xffffff : tint })
    );
    m.rotation.x = -Math.PI / 2;
    m.position.y = y === undefined ? 0.05 : y;
    m.receiveShadow = true;
    scene.add(m);
    return m;
  };

  /* 扁平的贴片（沙丘 / 水池 / 绿洲草地）：y 自己传，叠层不会打架 */
  D.addFlat = function (scene, x, z, w, d, color, y, rot) {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(w, d),
      new THREE.MeshLambertMaterial({ color: color })
    );
    m.rotation.x = -Math.PI / 2;
    if (rot) m.rotation.z = rot;
    m.position.set(x, y === undefined ? 0.07 : y, z);
    m.receiveShadow = true;
    scene.add(m);
    return m;
  };

  /* ============================================================
     小马 —— 方块马：四条腿用枢轴摆，鬃毛尾巴会晃
     opts: { x, z, coat(毛色), mane(鬃毛色), heading(朝向) }
     ============================================================ */
  D.makeHorse = function (opts) {
    opts = opts || {};
    const hx = opts.x || 0, hz = opts.z || 0;
    const coat = opts.coat || Game.pick([0xb9793f, 0x9a6a33, 0xe8d5b5, 0x7a4a24]);
    const coatMat = Game.mat(coat);
    const legMat = Game.mat(0x4a3421);
    const hoofMat = Game.mat(0x2f2318);
    const maneMat = Game.mat(opts.mane || 0x5a3a22);
    const saddleMat = Game.mat(0xd94f4f);

    const group = new THREE.Group();

    /* --- 四条腿：一个枢轴当「关节」，摆动时整条腿绕着关节转 --- */
    const legs = [];
    function makeLeg(x, z) {
      const pivot = new THREE.Group();
      pivot.position.set(x, 0.88, z);
      const shin = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.8, 0.22), legMat);
      shin.position.y = -0.4;
      shin.castShadow = true;
      const hoof = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.16, 0.3), hoofMat);
      hoof.position.y = -0.8;
      hoof.castShadow = true;
      pivot.add(shin, hoof);
      group.add(pivot);
      legs.push(pivot);
      return pivot;
    }
    makeLeg(-0.33, 0.6);
    makeLeg(0.33, 0.6);
    makeLeg(-0.33, -0.62);
    makeLeg(0.33, -0.62);

    /* --- 身体 --- */
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.84, 1.9), coatMat);
    body.position.set(0, 1.3, 0);
    body.castShadow = body.receiveShadow = true;
    group.add(body);

    /* --- 脖子 + 头 + 鼻子 + 耳朵 --- */
    const neck = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.82, 0.54), coatMat);
    neck.position.set(0, 1.94, 0.76);
    neck.castShadow = true;
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.46, 0.9), coatMat);
    head.position.set(0, 2.26, 1.16);
    head.castShadow = true;
    const nose = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.2, 0.24), Game.mat(0xf0e2d0));
    nose.position.set(0, 2.12, 1.58);
    const earA = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.24, 0.1), coatMat);
    earA.position.set(-0.16, 2.58, 0.92);
    const earB = earA.clone();
    earB.position.x = 0.16;
    group.add(neck, head, nose, earA, earB);

    /* --- 鬃毛 + 尾巴 + 马鞍 + 马镫 --- */
    const mane = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.34, 1.0), maneMat);
    mane.position.set(0, 2.3, 0.66);
    mane.castShadow = true;
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.8, 0.18), maneMat);
    tail.position.set(0, 1.42, -1.02);
    tail.castShadow = true;
    const saddle = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.16, 0.9), saddleMat);
    saddle.position.set(0, 1.74, -0.04);
    const stirrupA = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.34, 0.1), Game.mat(0xf5e6c8));
    stirrupA.position.set(-0.48, 1.58, -0.04);
    const stirrupB = stirrupA.clone();
    stirrupB.position.x = 0.48;
    group.add(mane, tail, saddle, stirrupA, stirrupB);

    /* --- 头顶小牌子：还没有人骑的时候提示「按 F 骑上去」 --- */
    const label = Game.makeLabelSprite('按 F 骑上去', 0.4, {
      fontSize: 38, bg: 'rgba(255,246,224,.94)'
    });
    label.position.set(0, 3.15, 0);
    group.add(label);

    group.position.set(hx, 0, hz);
    group.rotation.y = opts.heading === undefined ? Game.rand(0, Math.PI * 2) : opts.heading;

    const horse = {
      group: group,
      label: label,
      legs: legs,
      tail: tail,
      mane: mane,
      home: new THREE.Vector3(hx, 0, hz),
      heading: group.rotation.y,
      ridden: false,
      gait: 0,        // 走路相位：关卡每帧往里加，腿就摆起来
      speedNow: 0,    // 关卡报「现在跑多快」，摆腿快慢跟着它
      wait: Game.rand(0.5, 3),
      target: new THREE.Vector3(hx, 0, hz)
    };

    horse.setHeading = function (a) {
      horse.heading = a;
      group.rotation.y = a;
    };

    /* 每帧：摆腿 + 晃鬃毛 + 甩尾巴（速度越快摆得越大） */
    horse.animate = function (dt, time) {
      const sp = horse.speedNow;
      horse.gait += dt * (1.6 + sp * 1.4);
      const amp = Game.clamp(0.12 + sp * 0.12, 0.12, 0.75);
      for (let i = 0; i < legs.length; i++) {
        legs[i].rotation.x = Math.sin(horse.gait + i * 1.6) * amp;
      }
      mane.rotation.z = Math.sin(time * 4) * 0.05;
      tail.rotation.x = Math.sin(time * 2.4) * 0.18 - 0.1;
      group.position.y = Math.abs(Math.sin(horse.gait * 1.1)) * 0.06 * Game.clamp(sp, 0, 1);
    };

    return horse;
  };

  /* ============================================================
     小蛇 —— 会左右扭的三节小蛇（沙漠里的小捣蛋）
     opts: { x, z, color }
     ============================================================ */
  D.makeSnake = function (opts) {
    opts = opts || {};
    const color = opts.color || Game.pick([0x69b34c, 0x9bbf3c, 0xc9a227]);
    const group = new THREE.Group();
    const segs = [];

    for (let i = 0; i < 4; i++) {
      const s = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, 0.3, 0.34),
        Game.mat(i % 2 ? color : 0x3f7a2e)
      );
      s.position.set(0, 0.17, -i * 0.32);
      s.castShadow = true;
      group.add(s);
      segs.push(s);
    }
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.34, 0.44), Game.mat(color));
    head.position.set(0, 0.18, 0.36);
    head.castShadow = true;
    group.add(head);
    segs.push(head);

    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x2a2a2a });
    [-0.11, 0.11].forEach(function (ex) {
      const e = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.06), eyeMat);
      e.position.set(ex, 0.3, 0.58);
      group.add(e);
    });

    group.position.set(opts.x || 0, 0, opts.z || 0);

    const snake = {
      group: group,
      segs: segs,
      home: new THREE.Vector3(opts.x || 0, 0, opts.z || 0),
      vel: { x: 0, z: 0 },     // 被打飞的惯性
      biteCd: 0,
      phase: Game.rand(0, 6)
    };

    snake.animate = function (dt, time) {
      for (let i = 0; i < segs.length; i++) {
        segs[i].position.x = Math.sin(time * 5 - i * 0.9 + snake.phase) * 0.13;
      }
      const sp = Math.hypot(snake.vel.x, snake.vel.z);
      if (sp > 0.05) {
        group.position.x += snake.vel.x * dt;
        group.position.z += snake.vel.z * dt;
        snake.vel.x *= Math.pow(0.12, dt);
        snake.vel.z *= Math.pow(0.12, dt);
        group.rotation.z = Math.sin(time * 20) * 0.25;
      } else {
        group.rotation.z = 0;
      }
    };

    return snake;
  };

  /* ============================================================
     小龙卷风 —— 上大下小的沙柱 + 绕着转的沙圈（自己会转，位置由关卡驱动）
     opts: { x, z, r }
     ============================================================ */
  D.makeTornado = function (opts) {
    opts = opts || {};
    const rTop = opts.r || 3.4, rBot = rTop * 0.34, hgt = 9.6;
    const group = new THREE.Group();

    /* 颜色比沙地深一档 —— 太浅的话在沙子上几乎看不见，小朋友就躲不开了 */
    const skinMat = new THREE.MeshLambertMaterial({
      color: 0xc9a875, transparent: true, opacity: 0.66, depthWrite: false
    });
    const innerMat = new THREE.MeshLambertMaterial({
      color: 0xa88a58, transparent: true, opacity: 0.6, depthWrite: false
    });
    const funnel = new THREE.Mesh(
      new THREE.CylinderGeometry(rTop, rBot, hgt, 20, 1, true), skinMat);
    funnel.position.y = hgt / 2;
    const inner = new THREE.Mesh(
      new THREE.CylinderGeometry(rTop * 0.72, rBot * 0.6, hgt * 0.92, 14, 1, true), innerMat);
    inner.position.y = hgt / 2 + 0.2;
    group.add(funnel, inner);

    /* 绕着沙柱转的沙圈 + 三条沙带：这样才看得出它在转 */
    const pivot = new THREE.Group();
    pivot.position.y = 1.1;
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(rTop * 0.82, 0.22, 6, 18),
      new THREE.MeshLambertMaterial({ color: 0xe0c489, transparent: true, opacity: 0.9 })
    );
    ring.rotation.x = Math.PI / 2;
    pivot.add(ring);
    const bandMat = new THREE.MeshLambertMaterial({ color: 0xb99a63, transparent: true, opacity: 0.8 });
    for (let i = 0; i < 3; i++) {
      const band = new THREE.Mesh(new THREE.BoxGeometry(0.3, 7.6, 0.3), bandMat);
      const a = (i / 3) * Math.PI * 2;
      band.position.set(Math.cos(a) * rTop * 0.7, 3.4, Math.sin(a) * rTop * 0.7);
      pivot.add(band);
    }
    group.add(pivot);

    /* 地上的沙环：标出「走到这里会被卷到」的范围 */
    const foot = new THREE.Mesh(
      new THREE.RingGeometry(rBot * 1.6, rBot * 1.6 + 0.5, 24),
      new THREE.MeshBasicMaterial({
        color: 0x9a6f33, transparent: true, opacity: 0.55, side: THREE.DoubleSide
      })
    );
    foot.rotation.x = -Math.PI / 2;
    foot.position.y = 0.07;
    group.add(foot);

    group.position.set(opts.x || 0, 0, opts.z || 0);

    const tw = {
      group: group,
      pivot: pivot,
      r: rTop,
      x: opts.x || 0,
      z: opts.z || 0,
      dir: Game.rand(0, Math.PI * 2),
      speed: Game.rand(3.2, 5.2),
      turn: Game.rand(-0.35, 0.35)
    };

    tw.animate = function (dt, time) {
      pivot.rotation.y += dt * 3.2;
      const s = 1 + Math.sin(time * 1.7) * 0.04;
      group.scale.set(s, 1, s);
      group.position.x = tw.x;
      group.position.z = tw.z;
    };

    return tw;
  };
})();

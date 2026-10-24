/* ===================================================================
   levels/paint-the-field/props.js   第 6 关自己的方块道具
   -------------------------------------------------------------------
   两个工厂（关卡自己在 build() 里调用）：
     P.makeField(opts)  —— 一整片「踩着会变白」的绿方块地板
     P.makeHorse(opts)  —— 方块小马（和沙漠那关长得像，但这里自己写一份：
                            关卡之间不许互相依赖）
   =================================================================== */
(function () {
  const Game = window.Game;
  const P = (Game.Paint = Game.Paint || {});

  /* ============================================================
     会变白的地板
     ------------------------------------------------------------
     为什么画在 canvas 贴图上、不摆几百个方块 Mesh：
       30×30 = 900 块地板，900 个 Mesh 会让手机 / 老电脑掉帧；
       画成一张 canvas 贴图 = 只有 1 个 Mesh，踩白一块只要 fillRect 一笔。
     一格 = canvas 上 8×8 像素，NearestFilter 让每块看起来还是「方块」。

     坐标系（和引擎一致）：y 朝上，地面 y=0，-z 是北。
     世界坐标 → 第几格：
       i = (x + 半边长) / 格子边长     （i 是 x 方向）
       j = (z + 半边长) / 格子边长     （j 是 z 方向，也是 canvas 的行号）
     ============================================================ */
  P.PX = 8;                                          // 一格在地图上占几个像素
  P.GREENS = ['#5fbf3f', '#6ccb4a', '#57b23a', '#74d556', '#4fa832'];
  P.WHITES = ['#f7fbff', '#ffffff', '#eef5ff', '#fbfdff', '#e9f1fa'];

  P.makeField = function (opts) {
    opts = opts || {};
    const n = opts.n || 30;                    // 多少格 × 多少格
    const tile = opts.tile || 2;               // 一格在世界里多宽（步）
    const size = n * tile;                     // 整片地板边长
    const half = size / 2;
    const px = P.PX;

    const canvas = document.createElement('canvas');
    canvas.width = n * px;
    canvas.height = n * px;
    const g = canvas.getContext('2d');

    const white = new Uint8Array(n * n);       // 0 = 还是绿的，1 = 已经踩白
    const shade = new Uint8Array(n * n);       // 每块深浅略有不同，看起来才像方块
    for (let k = 0; k < n * n; k++) shade[k] = (Math.random() * P.GREENS.length) | 0;

    const tex = new THREE.CanvasTexture(canvas);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    tex.generateMipmaps = false;
    tex.colorSpace = THREE.SRGBColorSpace;

    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(size, size),
      new THREE.MeshLambertMaterial({ map: tex })
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(opts.cx || 0, opts.y === undefined ? 0.06 : opts.y, opts.cz || 0);
    mesh.receiveShadow = true;

    const field = {
      n: n, tile: tile, size: size, half: half,
      mesh: mesh, texture: tex, canvas: canvas,
      total: n * n, painted: 0, dirty: true,

      /* 画一块（绿 / 白） */
      drawTile(i, j) {
        const k = j * n + i;
        g.fillStyle = white[k] ? P.WHITES[shade[k]] : P.GREENS[shade[k]];
        g.fillRect(i * px, j * px, px, px);
        /* 每块描一圈更深的边 —— 让整片看起来是「一格一格」的方块 */
        g.fillStyle = white[k] ? 'rgba(190,205,220,.55)' : 'rgba(40,120,50,.35)';
        g.fillRect(i * px, j * px, px, 1);
        g.fillRect(i * px, j * px, 1, px);
      },

      /* 世界坐标 → 第几格；在地板外面返回 null */
      cellAt(x, z) {
        const i = Math.floor((x + half) / tile);
        const j = Math.floor((z + half) / tile);
        if (i < 0 || j < 0 || i >= n || j >= n) return null;
        return { i: i, j: j };
      },

      isGreen(i, j) { return !white[j * n + i]; },

      /* 踩一脚：把 (x,z) 周围 (2r+1)² 格刷白，返回「这次新刷白了几格」 */
      paint(x, z, r) {
        r = r || 0;
        const c = field.cellAt(x, z);
        if (!c) return 0;
        let hit = 0;
        for (let j = c.j - r; j <= c.j + r; j++) {
          for (let i = c.i - r; i <= c.i + r; i++) {
            if (i < 0 || j < 0 || i >= n || j >= n) continue;
            const k = j * n + i;
            if (white[k]) continue;
            white[k] = 1;
            field.painted++;
            field.drawTile(i, j);
            hit++;
          }
        }
        if (hit) field.dirty = true;
        return hit;
      },

      /* 离 (x,z) 最近的、还是绿的那一格中心（给头顶箭头用）；都白了返回 null */
      nearestGreen(x, z) {
        let best = null, bestD = Infinity;
        for (let j = 0; j < n; j++) {
          for (let i = 0; i < n; i++) {
            if (white[j * n + i]) continue;
            const cx = -half + (i + 0.5) * tile;
            const cz = -half + (j + 0.5) * tile;
            const d = Math.hypot(cx - x, cz - z);
            if (d < bestD) { bestD = d; best = { x: cx, z: cz }; }
          }
        }
        return best;
      },

      /* 整片恢复成绿的（重新进关时用） */
      reset() {
        white.fill(0);
        field.painted = 0;
        for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) field.drawTile(i, j);
        field.dirty = true;
      },

      /* 把这一帧改了的地方推给显卡（每帧最多一次，不然会很卡） */
      flush() {
        if (!field.dirty) return;
        field.dirty = false;
        tex.needsUpdate = true;
      }
    };

    field.reset();
    return field;
  };

  /* ============================================================
     方块小马（毛色随机；骑马时腿摆得快一点）
     opts: { x, z, heading, coat }
     返回 { group, label, animate(dt,time), setHeading(a), home, target, ridden, speedNow }
     ============================================================ */
  P.makeHorse = function (opts) {
    opts = opts || {};
    const hx = opts.x || 0, hz = opts.z || 0;
    const coat = opts.coat || Game.pick([0xf2e6d0, 0xd9b98a, 0xb9793f, 0xf7f2e6, 0x9a6a33]);
    const coatMat = Game.mat(coat);
    const legMat = Game.mat(0x4a3421);
    const hoofMat = Game.mat(0x2f2318);
    const maneMat = Game.mat(opts.mane || 0x5a3a22);
    const saddleMat = Game.mat(0x4aa3ff);

    const group = new THREE.Group();

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
    }
    makeLeg(-0.33, 0.6);
    makeLeg(0.33, 0.6);
    makeLeg(-0.33, -0.62);
    makeLeg(0.33, -0.62);

    const body = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.84, 1.9), coatMat);
    body.position.set(0, 1.3, 0);
    body.castShadow = body.receiveShadow = true;
    group.add(body);

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

    /* 头顶小牌子：还没人骑的时候提示「按 F 骑上去」 */
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
      home: new THREE.Vector3(hx, 0, hz),
      target: new THREE.Vector3(hx, 0, hz),
      heading: group.rotation.y,
      ridden: false,
      gait: 0,
      speedNow: 0,
      wait: Game.rand(0.5, 3)
    };

    horse.setHeading = function (a) {
      horse.heading = a;
      group.rotation.y = a;
    };

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
})();

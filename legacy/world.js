/* ===================================================================
   方块小勇士 · world.js
   卡通方块世界：天空、光照、草地、树、石头、栅栏、大门、第 3 关传送门
   同时维护碰撞盒（colliders），供玩家移动使用
   =================================================================== */
(function () {
  const Game = window.Game;

  /* ---------------- 关卡布局（world 与 levels 共用） ---------------- */
  Game.LAYOUT = {
    spawn: [0, 0, 4],
    gateX: 16,                        // 第 2 关大门所在的位置
    portal: [54, 0],                  // 第 3 关传送门
    forge: [32, -20],                 // 铁匠铺中心
    forestCenter: [-38, 0],           // 谜语森林中心
    forestZone: [-58, -18, -30, 30],  // 森林范围 x0 x1 z0 z1
    valleyZone: [19, 58, -30, 30],    // 山谷范围
    /* 6 座谜语石碑 */
    stoneSpots: [
      [-30.2, 4.5], [-38, 9], [-45.8, 4.5],
      [-45.8, -4.5], [-38, -9], [-30.2, -4.5]
    ],
    /* 12 个宝箱：[x, y, z] */
    chestSpots: [
      [20, 0, -22], [26, 0, -26], [30, 0, -12], [24, 0, 8],
      [44, 1.8, 10.5], [36, 0, 4], [42, 0, -8], [52, 0, 18],
      [23, 0.9, -18], [50, 0.9, -6], [56, 0, 6], [44, 0, 24]
    ],
    /* 可以跳上去的平台 */
    platforms: [
      { x: 22, z: -8.5, w: 3.2, d: 3.2, h: 1.86 },
      { x: 44, z: 10.5, w: 3.4, d: 3.4, h: 1.8 },
      { x: 23, z: -18, w: 3.0, d: 3.0, h: 0.9 },
      { x: 50, z: -6, w: 3.0, d: 3.0, h: 0.9 }
    ],
    /* 上平台的台阶 */
    stairs: [
      { x: 22, z: -12, steps: 3, size: 1.4, stepH: 0.62, dir: 'z+' },
      { x: 44, z: 14, steps: 3, size: 1.4, stepH: 0.6, dir: 'z-' },
      { x: 23, z: -16.0, steps: 1, size: 1.6, stepH: 0.45, dir: 'z-' },
      { x: 50, z: -4.0, steps: 1, size: 1.6, stepH: 0.45, dir: 'z-' }
    ],
    /* 树的位置（手动摆放，避免挡住宝箱和房子） */
    forestTrees: [
      [-22, -22], [-30, -24], [-40, -21], [-50, -25], [-26, 20], [-36, 25],
      [-46, 20], [-54, 24], [-24, 9], [-24, -10], [-35, 12], [-44, -12],
      [-52, 9], [-56, -8], [-20, 0], [-30, 0], [-46, 0], [-58, 0]
    ],
    valleyTrees: [
      [21, -30], [28, -30], [37, -30], [48, -30], [56, -30],
      [22, 30], [33, 30], [45, 30], [56, 30],
      [58, -18], [58, 14], [19.5, 20], [19.5, -27]
    ]
  };

  /* ---------------- 材质缓存 ---------------- */
  const matCache = {};
  function mat(color, opts) {
    const key = color + JSON.stringify(opts || {});
    if (!matCache[key]) {
      matCache[key] = new THREE.MeshLambertMaterial(Object.assign({ color: color }, opts || {}));
    }
    return matCache[key];
  }
  Game.mat = mat;

  Game.COLORS = {
    grass: 0x7ed957, grassDark: 0x5fb341, dirt: 0xa9713f,
    stone: 0xb9bec4, stoneDark: 0x8f979f, wood: 0xb57c47, woodDark: 0x8a5a2b,
    leaf: 0x4fbf4a, leafDark: 0x3da03c, leafLight: 0x6ad35f,
    cloud: 0xffffff, skin: 0xf6c99a, hair: 0x5a3a22,
    blue: 0x4aa3ff, red: 0xff6b6b, gold: 0xffd447, purple: 0x9b6bff,
    water: 0x63c8ff, sand: 0xf1dfae, black: 0x3a2a1c
  };

  /* ============================================================
     构建世界
     ============================================================ */
  Game.buildWorld = function (scene) {
    const C = Game.COLORS;
    const L = Game.LAYOUT;
    const W = { colliders: [], animated: [], doors: {}, helpers: {} };

    /* ---------------- 天空 + 光照 ---------------- */
    const skyGeo = new THREE.SphereGeometry(320, 24, 16);
    const skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: {
        top: { value: new THREE.Color(0x3fa9f5) },
        bottom: { value: new THREE.Color(0xe8f7ff) }
      },
      vertexShader:
        'varying vec3 vPos; void main(){ vPos = position;' +
        ' gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader:
        'uniform vec3 top; uniform vec3 bottom; varying vec3 vPos;' +
        'void main(){ float h = clamp(vPos.y / 320.0 * 0.5 + 0.5, 0.0, 1.0);' +
        ' gl_FragColor = vec4(mix(bottom, top, pow(h, 0.75)), 1.0); }'
    });
    const sky = new THREE.Mesh(skyGeo, skyMat);
    scene.add(sky);
    W.sky = sky;

    scene.fog = new THREE.Fog(0xcfeeff, 75, 200);

    const hemi = new THREE.HemisphereLight(0xffffff, 0xb8e08a, 0.85);
    hemi.position.set(0, 40, 0);
    scene.add(hemi);

    const sun = new THREE.DirectionalLight(0xfff2cc, 1.1);
    sun.position.set(28, 46, 20);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    const sc = sun.shadow.camera;
    sc.left = -32; sc.right = 32; sc.top = 32; sc.bottom = -32; sc.near = 1; sc.far = 150;
    sun.shadow.bias = -0.0009;
    scene.add(sun);
    scene.add(sun.target);
    W.sun = sun;

    // 卡通大太阳
    const sunDisc = new THREE.Mesh(
      new THREE.CircleGeometry(13, 32),
      new THREE.MeshBasicMaterial({ color: 0xfff3b0, fog: false, transparent: true, opacity: 0.85 })
    );
    sunDisc.position.set(110, 110, -150);
    sunDisc.lookAt(0, 6, 0);
    scene.add(sunDisc);

    /* ---------------- 占位表：装饰物不要长在建筑和宝箱上 ---------------- */
    const blocked = [];
    function block(x, z, r) { blocked.push({ x: x, z: z, r: r }); }
    function isFree(x, z, pad) {
      for (let i = 0; i < blocked.length; i++) {
        const b = blocked[i];
        if (Math.hypot(b.x - x, b.z - z) < b.r + pad) return false;
      }
      return true;
    }
    function scatter(count, rect, fn, pad) {
      pad = pad === undefined ? 1.2 : pad;
      let placed = 0, tries = 0;
      while (placed < count && tries < count * 60) {
        tries++;
        const x = Game.rand(rect[0], rect[1]);
        const z = Game.rand(rect[2], rect[3]);
        if (!isFree(x, z, pad)) continue;
        fn(x, z);
        placed++;
      }
    }

    /* 预留位置 */
    L.chestSpots.forEach((p) => block(p[0], p[2], 2.6));
    L.stoneSpots.forEach((p) => block(p[0], p[1], 3.0));
    L.forestTrees.forEach((p) => block(p[0], p[1], 2.0));
    L.valleyTrees.forEach((p) => block(p[0], p[1], 2.0));
    L.platforms.forEach((p) => block(p.x, p.z, Math.max(p.w, p.d) * 0.8));
    L.stairs.forEach((p) => block(p.x, p.z, 3.0));
    block(L.forge[0], L.forge[1], 5.5);        // 铁匠铺
    block(L.portal[0], L.portal[1], 4.0);      // 传送门
    for (let z = -33; z <= 33; z += 3) block(L.gateX, z, 2.2);  // 大门与栅栏
    block(7.5, 11, 2.4);                        // 广场告示牌
    block(0, 0, 6);                            // 出生点留空

    /* ---------------- 工具：加方块 / 加碰撞盒 ---------------- */
    function addSolid(x, y, z, w, h, d, enabled) {
      const box = {
        minX: x - w / 2, maxX: x + w / 2,
        minY: y, maxY: y + h,
        minZ: z - d / 2, maxZ: z + d / 2,
        enabled: enabled !== false
      };
      W.colliders.push(box);
      return box;
    }
    W.helpers.addSolid = addSolid;

    function addBox(x, y, z, w, h, d, material, opts) {
      opts = opts || {};
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
      m.position.set(x, y + h / 2, z);
      m.castShadow = opts.cast !== false;
      m.receiveShadow = opts.receive !== false;
      scene.add(m);
      if (opts.collide !== false) addSolid(x, y, z, w, h, d);
      return m;
    }
    W.helpers.addBox = addBox;
    W.helpers.mat = mat;
    W.helpers.isFree = isFree;
    W.helpers.scatter = scatter;

    /* ---------------- 地面 ---------------- */
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(150, 80),
      new THREE.MeshLambertMaterial({ map: Game.tex.grass() })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // 广场石板
    const plazaTex = Game.tex.paving();
    plazaTex.repeat.set(2, 1);
    const plazaMat = new THREE.MeshLambertMaterial({ map: plazaTex });
    for (let i = 0; i < 5; i++) {
      const p = new THREE.Mesh(new THREE.PlaneGeometry(9, 5), plazaMat);
      p.rotation.x = -Math.PI / 2;
      p.position.set(0, 0.02, -8 + i * 4);
      p.receiveShadow = true;
      scene.add(p);
    }
    // 通往第 1 关的土路
    for (let i = 0; i < 9; i++) {
      const p = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 4.2), new THREE.MeshLambertMaterial({ color: 0xc9a06a }));
      p.rotation.x = -Math.PI / 2;
      p.rotation.z = Game.rand(-0.2, 0.2);
      p.position.set(-13 - i * 4, 0.03, Math.sin(i * 0.8) * 3);
      p.receiveShadow = true;
      scene.add(p);
    }
    // 通往第 2 关的土路
    for (let i = 0; i < 10; i++) {
      const p = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 4.2), new THREE.MeshLambertMaterial({ color: 0xc9a06a }));
      p.rotation.x = -Math.PI / 2;
      p.rotation.z = Game.rand(-0.2, 0.2);
      p.position.set(18 + i * 4, 0.03, Math.sin(i * 0.7) * 2);
      p.receiveShadow = true;
      scene.add(p);
    }

    /* ---------------- 云 ---------------- */
    const cloudMat = new THREE.MeshLambertMaterial({ color: C.cloud, fog: false });
    for (let i = 0; i < 14; i++) {
      const g = new THREE.Group();
      const n = Game.randInt(2, 4);
      for (let j = 0; j < n; j++) {
        const b = new THREE.Mesh(
          new THREE.BoxGeometry(Game.rand(4, 8), Game.rand(2, 3.2), Game.rand(4, 7)), cloudMat);
        b.position.set(Game.rand(-4, 4), Game.rand(-0.6, 0.6), Game.rand(-3, 3));
        g.add(b);
      }
      g.position.set(Game.rand(-75, 75), Game.rand(26, 40), Game.rand(-55, 55));
      scene.add(g);
      W.animated.push({ obj: g, speed: Game.rand(0.25, 0.7), kind: 'cloud' });
    }

    /* ---------------- 树 ---------------- */
    const woodTexMat = new THREE.MeshLambertMaterial({ map: Game.tex.wood() });
    function makeTree(x, z, s) {
      s = s || 1;
      const g = new THREE.Group();
      const trunkH = 3.1 * s;
      const trunk = new THREE.Mesh(new THREE.BoxGeometry(0.9 * s, trunkH, 0.9 * s), woodTexMat);
      trunk.position.y = trunkH / 2;
      trunk.castShadow = trunk.receiveShadow = true;
      g.add(trunk);
      const leafMats = [mat(C.leaf), mat(C.leafDark), mat(C.leafLight)];
      const layers = [
        [3.5 * s, 1.5 * s, 3.5 * s, trunkH + 0.75 * s, 0],
        [2.8 * s, 1.3 * s, 2.8 * s, trunkH + 1.9 * s, 1],
        [1.8 * s, 1.1 * s, 1.8 * s, trunkH + 2.9 * s, 2]
      ];
      layers.forEach(function (ly) {
        const b = new THREE.Mesh(new THREE.BoxGeometry(ly[0], ly[1], ly[2]), leafMats[ly[4]]);
        b.position.y = ly[3];
        b.castShadow = b.receiveShadow = true;
        g.add(b);
      });
      g.position.set(x, 0, z);
      g.rotation.y = Game.rand(0, Math.PI);
      scene.add(g);
      addSolid(x, 0, z, 0.9 * s, trunkH, 0.9 * s);
      return g;
    }
    W.helpers.makeTree = makeTree;

    /* ---------------- 石头 / 蘑菇 / 花 ---------------- */
    const stoneTxMat = new THREE.MeshLambertMaterial({ map: Game.tex.stone() });
    function makeRock(x, z, size) {
      size = size || 1;
      const m = new THREE.Mesh(new THREE.BoxGeometry(size, size * 0.8, size * 0.9), stoneTxMat);
      m.position.set(x, size * 0.4 - 0.05, z);
      m.rotation.y = Game.rand(0, Math.PI);
      m.castShadow = m.receiveShadow = true;
      scene.add(m);
      addSolid(x, 0, z, size * 0.85, size * 0.75, size * 0.8);
      return m;
    }
    W.helpers.makeRock = makeRock;

    function makeMushroom(x, z, color) {
      const g = new THREE.Group();
      const stem = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.4, 0.22), mat(0xfdf3e0));
      stem.position.y = 0.2;
      const cap = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.35, 0.55), mat(color || C.red));
      cap.position.y = 0.55;
      const dot = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.1, 0.18), mat(0xffffff));
      dot.position.set(0.1, 0.74, 0.1);
      [stem, cap, dot].forEach(function (m) { m.castShadow = true; g.add(m); });
      g.position.set(x, 0, z);
      scene.add(g);
      return g;
    }
    W.helpers.makeMushroom = makeMushroom;

    function makeFlower(x, z, color) {
      const g = new THREE.Group();
      const stem = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.5, 0.1), mat(0x4fbf4a));
      stem.position.y = 0.25;
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.32, 0.32), mat(color));
      head.position.y = 0.6;
      const mid = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.14), mat(0xfff3b0));
      mid.position.y = 0.62;
      g.add(stem, head, mid);
      g.position.set(x, 0, z);
      scene.add(g);
      return g;
    }
    W.helpers.makeFlower = makeFlower;

    /* ---------------- 栅栏 ---------------- */
    function addFenceLine(x1, z1, x2, z2) {
      const dx = x2 - x1, dz = z2 - z1;
      const len = Math.hypot(dx, dz);
      if (len < 0.01) return;
      const seg = 2.6;
      const n = Math.max(1, Math.round(len / seg));
      const ux = dx / len, uz = dz / len;
      const angle = Math.atan2(dx, dz);
      for (let i = 0; i < n; i++) {
        const t = (i + 0.5) / n;
        const x = x1 + dx * t, z = z1 + dz * t;
        const g = new THREE.Group();
        const rail1 = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.18, seg + 0.1), woodTexMat);
        rail1.position.y = 1.0;
        const rail2 = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.18, seg + 0.1), woodTexMat);
        rail2.position.y = 0.6;
        const post1 = new THREE.Mesh(new THREE.BoxGeometry(0.24, 1.5, 0.24), woodTexMat);
        post1.position.set(0, 0.75, -seg / 2);
        const post2 = new THREE.Mesh(new THREE.BoxGeometry(0.24, 1.5, 0.24), woodTexMat);
        post2.position.set(0, 0.75, seg / 2);
        [rail1, rail2, post1, post2].forEach(function (m) { m.castShadow = m.receiveShadow = true; g.add(m); });
        g.position.set(x, 0, z);
        g.rotation.y = angle;
        scene.add(g);
        addSolid(x, 0, z, ux === 0 ? 0.35 : seg, 1.5, uz === 0 ? 0.35 : seg);
      }
    }
    W.helpers.addFenceLine = addFenceLine;

    /* ---------------- 平台 / 台阶 ---------------- */
    function addPlatform(x, z, w, d, topY) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, topY, d), stoneTxMat);
      m.position.set(x, topY / 2, z);
      m.castShadow = m.receiveShadow = true;
      scene.add(m);
      addSolid(x, 0, z, w, topY, d);
      return m;
    }
    W.helpers.addPlatform = addPlatform;

    function addStairs(x, z, steps, size, stepH, dir) {
      for (let i = 0; i < steps; i++) {
        const h = stepH * (i + 1);
        const sign = dir.charAt(1) === '+' ? 1 : -1;
        const offX = dir.charAt(0) === 'x' ? (i + 0.5) * size * sign : 0;
        const offZ = dir.charAt(0) === 'z' ? (i + 0.5) * size * sign : 0;
        const m = new THREE.Mesh(new THREE.BoxGeometry(size, h, size), stoneTxMat);
        m.position.set(x + offX, h / 2, z + offZ);
        m.castShadow = m.receiveShadow = true;
        scene.add(m);
        addSolid(x + offX, 0, z + offZ, size, h, size);
      }
    }
    W.helpers.addStairs = addStairs;

    /* ---------------- 广场告示牌 ---------------- */
    (function makeBoard() {
      const g = new THREE.Group();
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.3, 2.2, 0.3), woodTexMat);
      post.position.y = 1.1;
      const board = new THREE.Mesh(new THREE.BoxGeometry(3.4, 1.8, 0.25), woodTexMat);
      board.position.y = 2.6;
      const label = Game.makeLabelSprite('方块小镇 · 广场', 0.55, { fontSize: 44 });
      label.position.set(0, 4.0, 0);
      [post, board].forEach(function (m) { m.castShadow = true; g.add(m); });
      g.add(label);
      g.position.set(7.5, 0, 11);
      scene.add(g);
      addSolid(7.5, 0, 11, 0.4, 2.2, 0.4);
    })();

    /* ---------------- 世界边界（看不见的墙） ---------------- */
    addSolid(-62, 0, 0, 1, 8, 80);
    addSolid(62, 0, 0, 1, 8, 80);
    addSolid(0, 0, -34, 126, 8, 1);
    addSolid(0, 0, 34, 126, 8, 1);

    /* ---------------- 谜语森林（第 1 关） ---------------- */
    L.forestTrees.forEach(function (p) { makeTree(p[0], p[1], Game.rand(0.85, 1.15)); });
    scatter(30, [L.forestZone[0], L.forestZone[1], L.forestZone[2], L.forestZone[3]],
      function (x, z) { makeFlower(x, z, Game.pick([0xff6b6b, 0xffd447, 0x9b6bff, 0xff9fd1, 0xffffff])); }, 1.4);
    scatter(14, [L.forestZone[0], L.forestZone[1], L.forestZone[2], L.forestZone[3]],
      function (x, z) { makeMushroom(x, z, Game.pick([C.red, 0xff9fd1, 0x9b6bff])); }, 1.6);
    scatter(12, [L.forestZone[0], L.forestZone[1], L.forestZone[2], L.forestZone[3]],
      function (x, z) { makeRock(x, z, Game.rand(0.9, 1.9)); }, 2.4);

    /* ---------------- 第 2 关大门 ---------------- */
    addFenceLine(L.gateX, -33, L.gateX, -3);
    addFenceLine(L.gateX, 3, L.gateX, 33);
    addBox(L.gateX, 0, -3.6, 1.5, 4.2, 1.5, stoneTxMat);
    addBox(L.gateX, 0, 3.6, 1.5, 4.2, 1.5, stoneTxMat);

    const doorGroup = new THREE.Group();
    for (let i = -2; i <= 2; i++) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.3, 4.0, 0.3), woodTexMat);
      bar.position.set(0, 2.0, i * 1.2);
      bar.castShadow = true;
      doorGroup.add(bar);
    }
    [3.4, 1.0].forEach(function (y) {
      const cross = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.25, 6.4), woodTexMat);
      cross.position.set(0, y, 0);
      doorGroup.add(cross);
    });
    doorGroup.position.set(L.gateX, 0, 0);
    scene.add(doorGroup);
    const gateCollider = addSolid(L.gateX, 0, 0, 0.8, 4.0, 6.6);
    W.doors.gate2 = {
      group: doorGroup, collider: gateCollider, open: false, t: 0,
      open_: function () { this.open = true; }
    };

    const gateSign = Game.makeLabelSprite('第 2 关 · 宝箱山谷 🔒', 0.7, { fontSize: 44 });
    gateSign.position.set(L.gateX - 0.8, 5.3, 0);
    scene.add(gateSign);
    W.helpers.gateSign = gateSign;
    W.helpers.setGateSign = function (text, bg) {
      const canvas = Game.tex.label(text, { fontSize: 44, bg: bg || 'rgba(255,246,224,.94)' });
      const t = new THREE.CanvasTexture(canvas);
      t.colorSpace = THREE.SRGBColorSpace;
      gateSign.material.map.dispose();
      gateSign.material.map = t;
      gateSign.material.needsUpdate = true;
      gateSign.scale.set((canvas.width / canvas.height) * 0.7, 0.7, 1);
    };

    /* ---------------- 宝箱山谷（第 2 关） ---------------- */
    L.valleyTrees.forEach(function (p) { makeTree(p[0], p[1], Game.rand(0.8, 1.1)); });
    L.platforms.forEach(function (p) { addPlatform(p.x, p.z, p.w, p.d, p.h); });
    L.stairs.forEach(function (s) { addStairs(s.x, s.z, s.steps, s.size, s.stepH, s.dir); });

    scatter(26, [L.valleyZone[0], L.valleyZone[1], L.valleyZone[2], L.valleyZone[3]],
      function (x, z) { makeRock(x, z, Game.rand(1.0, 2.2)); }, 2.6);
    scatter(20, [L.valleyZone[0], L.valleyZone[1], L.valleyZone[2], L.valleyZone[3]],
      function (x, z) { makeFlower(x, z, Game.pick([0xff6b6b, 0xffd447, 0x9b6bff, 0xffffff])); }, 1.4);
    scatter(10, [L.valleyZone[0], L.valleyZone[1], L.valleyZone[2], L.valleyZone[3]],
      function (x, z) { makeMushroom(x, z, Game.pick([C.red, 0x9b6bff])); }, 1.6);
    // 广场边上的小花
    scatter(14, [-14, 14, -14, 14],
      function (x, z) { makeFlower(x, z, Game.pick([0xff6b6b, 0xffd447, 0xffffff])); }, 1.0);

    /* ---------------- 第 3 关传送门 ---------------- */
    const portal = new THREE.Group();
    const ringMat = mat(0x8b96a3);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(2.3, 0.42, 8, 20), ringMat);
    ring.castShadow = true;
    portal.add(ring);
    const coreMat = new THREE.MeshLambertMaterial({ color: 0x5b6472, transparent: true, opacity: 0.8 });
    const core = new THREE.Mesh(new THREE.CircleGeometry(2.05, 24), coreMat);
    core.position.z = -0.02;
    portal.add(core);
    const base = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.5, 3.4), stoneTxMat);
    base.position.y = -2.78;
    base.receiveShadow = true;
    portal.add(base);
    portal.position.set(L.portal[0], 3.3, L.portal[1]);
    portal.rotation.y = -Math.PI / 2;
    scene.add(portal);
    addSolid(L.portal[0], 0, L.portal[1], 2.6, 0.5, 2.6);

    const portalSign = Game.makeLabelSprite('第 3 关 · 敬请期待', 0.68, { fontSize: 44 });
    portalSign.position.set(L.portal[0], 7.0, L.portal[1]);
    scene.add(portalSign);

    W.helpers.portal = { group: portal, core: core, ring: ring, coreMat: coreMat, unlocked: false };
    W.helpers.setPortalUnlocked = function () {
      W.helpers.portal.unlocked = true;
      ring.material = mat(0x9b6bff, { emissive: 0x4b1f9e });
      coreMat.color.set(0x9b6bff);
      coreMat.emissive = new THREE.Color(0x5b2fd0);
      coreMat.opacity = 0.95;
    };

    /* ---------------- 每帧动画 ---------------- */
    W.update = function (dt, time) {
      for (let i = 0; i < W.animated.length; i++) {
        const a = W.animated[i];
        if (a.kind === 'cloud') {
          a.obj.position.x += a.speed * dt;
          if (a.obj.position.x > 80) a.obj.position.x = -80;
        }
      }
      const gd = W.doors.gate2;
      if (gd.open && gd.t < 1) {
        gd.t = Math.min(1, gd.t + dt / 1.6);
        const y = -4.4 * gd.t;
        gd.group.position.y = y;
        gd.collider.enabled = gd.t < 0.55;
        gd.collider.maxY = Math.max(0.01, 4.0 + y);
      }
      const p = W.helpers.portal;
      if (p.unlocked) {
        p.ring.rotation.z += dt * 0.5;
        p.coreMat.opacity = 0.7 + Math.sin(time * 3) * 0.25;
      }
    };

    return W;
  };
})();

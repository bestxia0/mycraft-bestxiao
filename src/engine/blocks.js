/* ===================================================================
   engine/blocks.js
   「方块」建造工具箱：所有地形/道具都由这些小积木拼出来
     · 每个实体都会自动登记一个 AABB 碰撞盒（不要碰撞就传 collide:false）
     · addFenceWithGaps 可以给围墙留出大门的缺口
   关卡作者只要拿这里的函数拼地图，不用碰 three.js 细节。
   =================================================================== */
(function () {
  const Game = window.Game;
  const C = (Game.COLORS = {
    grass: 0x7ed957, grassDark: 0x5fb341, dirt: 0xa9713f,
    stone: 0xb9bec4, stoneDark: 0x8f979f, wood: 0xb57c47, woodDark: 0x8a5a2b,
    leaf: 0x4fbf4a, leafDark: 0x3da03c, leafLight: 0x6ad35f,
    cloud: 0xffffff, skin: 0xf6c99a, hair: 0x5a3a22,
    blue: 0x4aa3ff, red: 0xff6b6b, gold: 0xffd447, purple: 0x9b6bff,
    water: 0x63c8ff, sand: 0xf1dfae, black: 0x3a2a1c, paper: 0xfff6e0
  });

  const matCache = {};
  function mat(color, opts) {
    const key = color + JSON.stringify(opts || {});
    if (!matCache[key]) {
      matCache[key] = new THREE.MeshLambertMaterial(Object.assign({ color: color }, opts || {}));
    }
    return matCache[key];
  }
  Game.mat = mat;

  Game.Blocks = {
    /* 建一个「世界」容器：碰撞体清单 + 建造函数 */
    create(scene) {
      const W = {
        scene,
        colliders: [],
        animated: [],
        helpers: {},
        _updaters: []
      };

      function addSolid(x, y, z, w, h, d, enabled) {
        const box = {
          minX: x - w / 2, maxX: x + w / 2,
          minY: y, maxY: y + h,
          minZ: z - d / 2, maxZ: z + d / 2,
          enabled: enabled !== false,
          noStep: false
        };
        W.colliders.push(box);
        return box;
      }
      const h = W.helpers;
      h.mat = mat;
      h.addSolid = addSolid;

      /* 长方体（底部在 y） */
      h.addBox = function (x, y, z, w, hh, d, material, opts) {
        opts = opts || {};
        const m = new THREE.Mesh(new THREE.BoxGeometry(w, hh, d), material);
        m.position.set(x, y + hh / 2, z);
        m.castShadow = opts.cast !== false;
        m.receiveShadow = opts.receive !== false;
        if (opts.rotationY) m.rotation.y = opts.rotationY;
        scene.add(m);
        if (opts.collide !== false) addSolid(x, y, z, w, hh, d).noStep = !!opts.noStep;
        return m;
      };

      /* 地面（一整块草地）：addGround(宽, 深) 或 addGround(边长) */
      h.addGround = function (w, d, color) {
        if (typeof d !== 'number') { color = d; d = w; }   // 只传一个数字 = 正方形
        w = w || 130;
        d = d || w;
        const tex = Game.Textures.grass();
        tex.repeat.set(Math.max(4, Math.round(w / 3.8)), Math.max(4, Math.round(d / 3.8)));
        const g = new THREE.Mesh(
          new THREE.PlaneGeometry(w, d),
          new THREE.MeshLambertMaterial({ map: tex, color: color || 0xffffff })
        );
        g.rotation.x = -Math.PI / 2;
        g.receiveShadow = true;
        scene.add(g);
        return g;
      };

      /* 圆形地面（擂台关用）：addDisc(圆心x, 圆心z, 半径) → 返回那个圆盘
         圆盘没有碰撞盒，靠关卡自己的 floorAt 决定"哪里算地面" */
      h.addDisc = function (cx, cz, r, opts) {
        opts = opts || {};
        const tex = Game.Textures.grass();
        tex.repeat.set(Math.max(3, Math.round(r / 2.6)), Math.max(3, Math.round(r / 2.6)));
        const top = new THREE.Mesh(
          new THREE.CircleGeometry(1, opts.segments || 72),
          new THREE.MeshLambertMaterial({ map: tex, color: opts.color || 0xffffff })
        );
        top.rotation.x = -Math.PI / 2;
        top.scale.set(r, r, 1);
        top.position.set(cx, opts.y === undefined ? 0 : opts.y, cz);
        top.receiveShadow = true;
        scene.add(top);
        return top;
      };

      /* 圆柱体（做浮空岛的下半部分 / 水井 / 柱子）：底面在 cy */
      h.addCylinder = function (cx, cy, cz, rTop, rBot, height, color, segments) {
        const m = new THREE.Mesh(
          new THREE.CylinderGeometry(rTop, rBot, height, segments || 48),
          typeof color === 'number' || color === undefined ? Game.mat(color === undefined ? 0x8a6a4a : color) : color
        );
        m.position.set(cx, cy + height / 2, cz);
        m.castShadow = m.receiveShadow = true;
        scene.add(m);
        return m;
      };

      /* 地上的圆圈线（标出擂台边缘、结界范围） */
      h.addRing = function (cx, cz, r, width, color, opts) {
        opts = opts || {};
        const m = new THREE.Mesh(
          new THREE.RingGeometry(r - (width || 0.6), r, opts.segments || 72),
          new THREE.MeshBasicMaterial({
            color: color === undefined ? 0xffd447 : color,
            transparent: true, opacity: opts.opacity === undefined ? 0.85 : opts.opacity,
            side: THREE.DoubleSide, depthWrite: false
          })
        );
        m.rotation.x = -Math.PI / 2;
        m.position.set(cx, opts.y === undefined ? 0.06 : opts.y, cz);
        scene.add(m);
        return m;
      };

      /* 地图边界（看不见的墙），防止走出世界 */
      h.addBoundaryWalls = function (half) {
        half = half || 56;
        addSolid(-half, 0, 0, 1.2, 10, half * 2);
        addSolid(half, 0, 0, 1.2, 10, half * 2);
        addSolid(0, 0, -half, half * 2, 10, 1.2);
        addSolid(0, 0, half, half * 2, 10, 1.2);
      };

      /* 按一块矩形区域围一圈看不见的墙：addBounds({minX,maxX,minZ,maxZ}) */
      h.addBounds = function (r) {
        const cx = (r.minX + r.maxX) / 2, cz = (r.minZ + r.maxZ) / 2;
        const w = r.maxX - r.minX, d = r.maxZ - r.minZ;
        addSolid(r.minX, 0, cz, 1.2, 12, d + 2.4);
        addSolid(r.maxX, 0, cz, 1.2, 12, d + 2.4);
        addSolid(cx, 0, r.minZ, w + 2.4, 12, 1.2);
        addSolid(cx, 0, r.maxZ, w + 2.4, 12, 1.2);
      };

      /* 飘动的云 */
      h.addClouds = function (count, height) {
        const cloudMat = new THREE.MeshLambertMaterial({ color: C.cloud, fog: false });
        for (let i = 0; i < (count || 16); i++) {
          const g = new THREE.Group();
          const n = Game.Math.randInt(2, 4);
          for (let j = 0; j < n; j++) {
            const b = new THREE.Mesh(
              new THREE.BoxGeometry(Game.rand(4, 8), Game.rand(2, 3.2), Game.rand(4, 7)), cloudMat);
            b.position.set(Game.rand(-4, 4), Game.rand(-0.6, 0.6), Game.rand(-3, 3));
            g.add(b);
          }
          g.position.set(Game.rand(-60, 60), Game.rand(26, 40) + (height || 0), Game.rand(-60, 60));
          scene.add(g);
          W.animated.push({ obj: g, speed: Game.rand(0.25, 0.7), kind: 'cloud' });
        }
      };

      /* 一棵方块树 */
      h.makeTree = function (x, z, s) {
        s = s || 1;
        const g = new THREE.Group();
        const trunkH = 3.1 * s;
        const trunk = new THREE.Mesh(
          new THREE.BoxGeometry(0.9 * s, trunkH, 0.9 * s),
          new THREE.MeshLambertMaterial({ map: Game.Textures.wood() })
        );
        trunk.position.y = trunkH / 2;
        trunk.castShadow = trunk.receiveShadow = true;
        g.add(trunk);
        const leafMats = [mat(C.leaf), mat(C.leafDark), mat(C.leafLight)];
        [[3.5, 1.5, 3.5, 0.75, 0], [2.8, 1.3, 2.8, 1.9, 1], [1.8, 1.1, 1.8, 2.9, 2]]
          .forEach((ly) => {
            const b = new THREE.Mesh(
              new THREE.BoxGeometry(ly[0] * s, ly[1] * s, ly[2] * s), leafMats[ly[4]]);
            b.position.y = trunkH + ly[3] * s;
            b.castShadow = b.receiveShadow = true;
            g.add(b);
          });
        g.position.set(x, 0, z);
        g.rotation.y = Game.rand(0, Math.PI);
        scene.add(g);
        addSolid(x, 0, z, 0.9 * s, trunkH, 0.9 * s);
        return g;
      };

      /* 石头 */
      h.makeRock = function (x, z, size) {
        size = size || 1;
        const m = new THREE.Mesh(
          new THREE.BoxGeometry(size, size * 0.8, size * 0.9),
          new THREE.MeshLambertMaterial({ map: Game.Textures.stone(), color: 0xffffff })
        );
        m.position.set(x, size * 0.4 - 0.05, z);
        m.rotation.y = Game.rand(0, Math.PI);
        m.castShadow = m.receiveShadow = true;
        scene.add(m);
        addSolid(x, 0, z, size * 0.85, size * 0.75, size * 0.8);
        return m;
      };

      /* 蘑菇 / 小花（纯装饰，没有碰撞） */
      h.makeMushroom = function (x, z, color) {
        const g = new THREE.Group();
        const stem = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.4, 0.22), mat(0xfdf3e0));
        stem.position.y = 0.2;
        const cap = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.35, 0.55), mat(color || C.red));
        cap.position.y = 0.55;
        const dot = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.1, 0.18), mat(0xffffff));
        dot.position.set(0.1, 0.74, 0.1);
        [stem, cap, dot].forEach((m) => { m.castShadow = true; g.add(m); });
        g.position.set(x, 0, z);
        scene.add(g);
        return g;
      };

      h.makeFlower = function (x, z, color) {
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
      };

      /* 栅栏（沿一条直线摆放，带碰撞） */
      h.addFenceLine = function (x1, z1, x2, z2, opts) {
        opts = opts || {};
        const woodMat = new THREE.MeshLambertMaterial({ map: Game.Textures.wood() });
        const dx = x2 - x1, dz = z2 - z1;
        const len = Math.hypot(dx, dz);
        if (len < 0.2) return;
        const seg = opts.seg || 2.6;
        const n = Math.max(1, Math.round(len / seg));
        const ux = dx / len, uz = dz / len;
        const angle = Math.atan2(dx, dz);
        for (let i = 0; i < n; i++) {
          const t = (i + 0.5) / n;
          const x = x1 + dx * t, z = z1 + dz * t;
          const g = new THREE.Group();
          const rail1 = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.18, seg + 0.1), woodMat);
          rail1.position.y = 1.0;
          const rail2 = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.18, seg + 0.1), woodMat);
          rail2.position.y = 0.6;
          const post1 = new THREE.Mesh(new THREE.BoxGeometry(0.24, 1.5, 0.24), woodMat);
          post1.position.set(0, 0.75, -seg / 2);
          const post2 = new THREE.Mesh(new THREE.BoxGeometry(0.24, 1.5, 0.24), woodMat);
          post2.position.set(0, 0.75, seg / 2);
          [rail1, rail2, post1, post2].forEach((m) => { m.castShadow = m.receiveShadow = true; g.add(m); });
          g.position.set(x, 0, z);
          g.rotation.y = angle;
          scene.add(g);
          addSolid(x, 0, z, ux === 0 ? 0.35 : seg, 1.5, uz === 0 ? 0.35 : seg);
        }
      };

      /* 带缺口的栅栏：gaps = [{ at: 坐标, width: 宽度 }]（沿线的方向） */
      h.addFenceWithGaps = function (x1, z1, x2, z2, gaps) {
        const horizontal = Math.abs(x2 - x1) > Math.abs(z2 - z1);
        const start = horizontal ? Math.min(x1, x2) : Math.min(z1, z2);
        const end = horizontal ? Math.max(x1, x2) : Math.max(z1, z2);
        const cuts = (gaps || []).slice().sort((a, b) => a.at - b.at);
        let cur = start;
        cuts.forEach((gap) => {
          const gs = gap.at - (gap.width || 6) / 2;
          const ge = gap.at + (gap.width || 6) / 2;
          if (gs > cur) {
            if (horizontal) h.addFenceLine(cur, z1, gs, z2);
            else h.addFenceLine(x1, cur, x2, ge === gs ? z2 : gs);
          }
          cur = Math.max(cur, ge);
        });
        if (cur < end) {
          if (horizontal) h.addFenceLine(cur, z1, end, z2);
          else h.addFenceLine(x1, cur, x2, end);
        }
      };

      /* 台阶（dir: 'z+' 'z-' 'x+' 'x-'，从起点往那个方向逐级升高） */
      h.addStairs = function (x, z, steps, size, stepH, dir, material) {
        const m = material || new THREE.MeshLambertMaterial({ map: Game.Textures.stone() });
        const sign = dir.charAt(1) === '+' ? 1 : -1;
        for (let i = 0; i < steps; i++) {
          const hh = stepH * (i + 1);
          const offX = dir.charAt(0) === 'x' ? (i + 0.5) * size * sign : 0;
          const offZ = dir.charAt(0) === 'z' ? (i + 0.5) * size * sign : 0;
          const box = new THREE.Mesh(new THREE.BoxGeometry(size, hh, size), m);
          box.position.set(x + offX, hh / 2, z + offZ);
          box.castShadow = box.receiveShadow = true;
          scene.add(box);
          addSolid(x + offX, 0, z + offZ, size, hh, size);
        }
      };

      /* 高台（顶部在 topY） */
      h.addPlatform = function (x, z, w, d, topY, material) {
        const m = material || new THREE.MeshLambertMaterial({ map: Game.Textures.stone() });
        const box = new THREE.Mesh(new THREE.BoxGeometry(w, topY, d), m);
        box.position.set(x, topY / 2, z);
        box.castShadow = box.receiveShadow = true;
        scene.add(box);
        addSolid(x, 0, z, w, topY, d);
        return box;
      };

      /* 地上一块贴片（土路 / 石板），纯装饰 */
      h.addPatch = function (x, z, w, d, colorOrTex, rotation) {
        const material = (typeof colorOrTex === 'string' || colorOrTex && colorOrTex.isTexture)
          ? new THREE.MeshLambertMaterial({ map: colorOrTex })
          : new THREE.MeshLambertMaterial({ color: colorOrTex === undefined ? 0xc9a06a : colorOrTex });
        const p = new THREE.Mesh(new THREE.PlaneGeometry(w, d), material);
        p.rotation.x = -Math.PI / 2;
        if (rotation) p.rotation.z = rotation;
        p.position.set(x, 0.03, z);
        p.receiveShadow = true;
        scene.add(p);
        return p;
      };

      /* 路牌 / 木牌（带文字） */
      h.makeSign = function (text, x, y, z, opts) {
        opts = opts || {};
        const g = new THREE.Group();
        const woodMat = new THREE.MeshLambertMaterial({ map: Game.Textures.wood() });
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.3, y || 2.2, 0.3), woodMat);
        post.position.y = (y || 2.2) / 2;
        post.castShadow = true;
        g.add(post);
        const board = new THREE.Mesh(new THREE.BoxGeometry(opts.w || 3.4, opts.h || 1.6, 0.25), woodMat);
        board.position.y = (y || 2.2) + (opts.h || 1.6) / 2;
        board.castShadow = true;
        g.add(board);
        const label = Game.makeLabelSprite(text, opts.fontWorldHeight || 0.55, { fontSize: opts.fontSize || 44 });
        label.position.set(0, (y || 2.2) + (opts.h || 1.6) + 0.8, 0);
        g.add(label);
        g.position.set(x, 0, z);
        g.rotation.y = opts.rotationY || 0;
        scene.add(g);
        addSolid(x, 0, z, 0.45, y || 2.2, 0.45);
        g.userData.label = label;
        return g;
      };

      /* 石头拱门（可当传送门 / 大门框），返回 group 和内部圆环 */
      h.makeArch = function (x, y, z, opts) {
        opts = opts || {};
        const g = new THREE.Group();
        const color = opts.color || 0x8b96a3;
        const ring = new THREE.Mesh(
          new THREE.TorusGeometry(opts.r || 2.3, opts.tube || 0.42, 8, 20), mat(color));
        ring.castShadow = true;
        g.add(ring);
        const coreMat = new THREE.MeshLambertMaterial({
          color: opts.coreColor === undefined ? 0x5b6472 : opts.coreColor,
          transparent: true, opacity: 0.8
        });
        const core = new THREE.Mesh(new THREE.CircleGeometry((opts.r || 2.3) - 0.2, 24), coreMat);
        core.position.z = -0.02;
        g.add(core);
        const base = new THREE.Mesh(
          new THREE.BoxGeometry((opts.r || 2.3) * 1.5, 0.5, (opts.r || 2.3) * 1.5),
          new THREE.MeshLambertMaterial({ map: Game.Textures.stone() }));
        base.position.y = -(opts.r || 2.3) - 0.4;
        base.receiveShadow = true;
        g.add(base);
        g.position.set(x, y || 3.3, z);
        g.rotation.y = opts.rotationY || 0;
        scene.add(g);
        addSolid(x, 0, z, 2.6, 0.5, 2.6);
        return { group: g, ring, core, coreMat };
      };

      /* 在矩形范围内撒装饰物，自动避开已经登记的「禁区」 */
      const blocked = [];
      h.block = function (x, z, r) { blocked.push({ x, z, r }); };
      h.isFree = function (x, z, pad) {
        for (let i = 0; i < blocked.length; i++) {
          const b = blocked[i];
          if (Math.hypot(b.x - x, b.z - z) < b.r + (pad || 0)) return false;
        }
        return true;
      };
      h.scatter = function (count, rect, fn, pad) {
        pad = pad === undefined ? 1.2 : pad;
        let placed = 0, tries = 0;
        while (placed < count && tries < count * 60) {
          tries++;
          const x = Game.rand(rect[0], rect[1]);
          const z = Game.rand(rect[2], rect[3]);
          if (!h.isFree(x, z, pad)) continue;
          fn(x, z);
          placed++;
        }
      };

      /* 每帧动画（云等） */
      h.addUpdater = function (fn) { W._updaters.push(fn); };
      W.update = function (dt, time) {
        for (let i = 0; i < W.animated.length; i++) {
          const a = W.animated[i];
          if (a.kind === 'cloud') {
            a.obj.position.x += a.speed * dt;
            if (a.obj.position.x > 70) a.obj.position.x = -70;
          }
        }
        for (let i = 0; i < W._updaters.length; i++) W._updaters[i](dt, time);
      };

      return W;
    }
  };
})();

/* ===================================================================
   levels/stone-maze/props.js   第 7 关自己的方块道具
   -------------------------------------------------------------------
   四件私货（都挂在 Game.Maze 上）：
     M.mulberry32(seed)                 可复现的随机数（同一颗种子 = 同一座迷宫）
     M.generate(opts)                   造一座迷宫（一定连通，所以出口一定走得到）
     M.buildWalls(ctx, maze, cell)      把墙摆进场景（同一行连成一条，省 Mesh）
     M.makeMonster(o) / M.makeCoin(o)   小怪兽 / 金币

   坐标系和引擎一致：y 朝上，地面 y=0，-z 是「北」。
   =================================================================== */
(function () {
  const Game = window.Game;
  const M = (Game.Maze = Game.Maze || {});

  /* ============================================================
     可复现的随机数（mulberry32）
     为什么要自己写一个：测试要能「同一个种子 = 同一座迷宫」，
     这样脚本才能反复验证同一张地图；Game.rand() 是引擎全局的，没法复现。
     ============================================================ */
  M.mulberry32 = function (seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  /* ============================================================
     造迷宫：深度优先（递归回溯）
     ------------------------------------------------------------
     这个算法造出来的是「完美迷宫」：
       · 任意两格之间都有且只有一条路 → 出口一定走得到（保证有出口）
       · 路很绕、死胡同多，走起来才像迷宫
     之后再做一点「编织」（braid）：随机打通一部分死胡同，
     迷宫就有了回路 —— 不容易一条道走到黑，看着也更活。

     网格表示：gw × gh 个格子，1 = 墙、0 = 能走
       cols / rows 是「迷宫格」数，真正的格子数 = cols*2+1 × rows*2+1
       迷宫格 (c, r) 对应网格格 (c*2+1, r*2+1)
     高度用 Uint8Array 存，21×21 = 441 个字节，随便重造。
     ============================================================ */
  M.generate = function (opts) {
    opts = opts || {};
    const cols = opts.cols || 10, rows = opts.rows || 10;
    const seed = opts.seed === undefined ? ((Math.random() * 1e9) | 0) : (opts.seed | 0);
    const rng = M.mulberry32(seed);
    const braid = opts.braid === undefined ? 0.25 : opts.braid;   // 打通多少死胡同（0~1）

    const gw = cols * 2 + 1, gh = rows * 2 + 1;
    const grid = new Uint8Array(gw * gh);
    grid.fill(1);
    const ix = function (gx, gz) { return gz * gw + gx; };
    const cx = function (c) { return c * 2 + 1; };
    const cz = function (r) { return r * 2 + 1; };
    const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

    /* 从西南角这一格开始挖（门口就开在南边墙上，小朋友从外面走进来） */
    const startCell = { c: 0, r: rows - 1 };
    const seen = new Uint8Array(cols * rows);
    seen[startCell.r * cols + startCell.c] = 1;
    grid[ix(cx(startCell.c), cz(startCell.r))] = 0;
    const stack = [[startCell.c, startCell.r]];

    while (stack.length) {
      const cur = stack[stack.length - 1];
      const c = cur[0], r = cur[1];
      /* 四个方向随机洗一下，挑一个还没去过的邻居挖过去 */
      const order = [0, 1, 2, 3];
      for (let i = 3; i > 0; i--) {
        const j = (rng() * (i + 1)) | 0;
        const t = order[i]; order[i] = order[j]; order[j] = t;
      }
      let moved = false;
      for (let k = 0; k < 4; k++) {
        const d = DIRS[order[k]];
        const nc = c + d[0], nr = r + d[1];
        if (nc < 0 || nr < 0 || nc >= cols || nr >= rows) continue;
        if (seen[nr * cols + nc]) continue;
        seen[nr * cols + nc] = 1;
        grid[ix(cx(c) + d[0], cz(r) + d[1])] = 0;   // 打通中间那面墙
        grid[ix(cx(nc), cz(nr))] = 0;
        stack.push([nc, nr]);
        moved = true;
        break;
      }
      if (!moved) stack.pop();
    }

    /* ---- 编织：随机打通一部分死胡同（只动迷宫内部的墙，不碰外圈） ---- */
    if (braid > 0) {
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const gx = cx(c), gz = cz(r);
          let open = 0;
          for (let k = 0; k < 4; k++) {
            const d = DIRS[k];
            if (!grid[ix(gx + d[0], gz + d[1])]) open++;
          }
          if (open !== 1) continue;                 // 只处理死胡同
          /* 能打通的墙：另一头也必须是一个迷宫格（绝不碰外圈围墙） */
          const cands = [];
          for (let k = 0; k < 4; k++) {
            const d = DIRS[k];
            const nc = c + d[0], nr = r + d[1];
            if (nc < 0 || nr < 0 || nc >= cols || nr >= rows) continue;
            if (grid[ix(gx + d[0], gz + d[1])]) cands.push(d);
          }
          if (!cands.length) continue;
          if (rng() >= braid) continue;
          /* 打通一面墙 → 这一格就不是死胡同了，顺带多出一条回路 */
          const pick = cands[(rng() * cands.length) | 0];
          grid[ix(gx + pick[0], gz + pick[1])] = 0;
        }
      }
    }

    /* 南边门口：把围墙打开一格（小朋友从这里进来） */
    const entrance = { gx: cx(startCell.c), gz: gh - 1 };
    grid[ix(entrance.gx, entrance.gz)] = 0;

    const maze = {
      seed: seed, cols: cols, rows: rows, gw: gw, gh: gh, grid: grid,
      entrance: entrance,
      start: { gx: cx(startCell.c), gz: cz(startCell.r) },
      isWall: function (gx, gz) {
        if (gx < 0 || gz < 0 || gx >= gw || gz >= gh) return true;
        return grid[gz * gw + gx] === 1;
      },
      isOpen: function (gx, gz) { return !maze.isWall(gx, gz); },
      cellToGrid: function (c, r) { return { gx: cx(c), gz: cz(r) }; },
      /* 这一格是不是死胡同（只有一个方向能走） */
      deadEnd: function (gx, gz) {
        if (maze.isWall(gx, gz)) return false;
        let n = 0;
        for (let k = 0; k < 4; k++) if (!maze.isWall(gx + DIRS[k][0], gz + DIRS[k][1])) n++;
        return n === 1;
      },
      openCells: function () {
        const out = [];
        for (let gz = 0; gz < gh; gz++) {
          for (let gx = 0; gx < gw; gx++) if (!maze.isWall(gx, gz)) out.push({ gx: gx, gz: gz });
        }
        return out;
      },
      /* 从某格开始走一遍（BFS）：dist = 每格到它的最短步数，-1 表示走不到 */
      bfs: function (from) {
        const dist = new Int32Array(gw * gh).fill(-1);
        const parent = new Int32Array(gw * gh).fill(-1);
        const q = [from.gx + from.gz * gw];
        dist[from.gz * gw + from.gx] = 0;
        let head = 0;
        while (head < q.length) {
          const id = q[head++];
          const gx = id % gw, gz = (id - gx) / gw;
          for (let k = 0; k < 4; k++) {
            const nx = gx + DIRS[k][0], nz = gz + DIRS[k][1];
            if (maze.isWall(nx, nz)) continue;
            const nid = nz * gw + nx;
            if (dist[nid] >= 0) continue;
            dist[nid] = dist[id] + 1;
            parent[nid] = id;
            q.push(nid);
          }
        }
        return { dist: dist, parent: parent, reached: q.length };
      },
      /* 世界坐标 → 在哪一格 */
      worldToGrid: function (x, z, cell) {
        return {
          gx: Math.round(x / cell + (gw - 1) / 2),
          gz: Math.round(z / cell + (gh - 1) / 2)
        };
      },
      /* 某格中心的世界坐标 */
      gridToWorld: function (gx, gz, cell) {
        return {
          x: (gx - (gw - 1) / 2) * cell,
          z: (gz - (gh - 1) / 2) * cell
        };
      },
      /* 两格之间能不能「一眼看过去」（走直线、中间没有墙）—— 小怪兽用来发现小朋友 */
      lineOfSight: function (a, b) {
        let gx = a.gx, gz = a.gz;
        const dx = Math.abs(b.gx - gx), dz = Math.abs(b.gz - gz);
        const sx = gx < b.gx ? 1 : -1, sz = gz < b.gz ? 1 : -1;
        let err = dx - dz, guard = 0;
        while (guard++ < 200) {
          if (gx === b.gx && gz === b.gz) return true;
          if (maze.isWall(gx, gz)) return false;
          const e2 = err * 2;
          if (e2 > -dz) { err -= dz; gx += sx; }
          if (e2 < dx) { err += dx; gz += sz; }
        }
        return false;
      }
    };
    /* 先算一遍「从入口出发的距离」，关卡用它来挑位置（怪兽 / 金币别贴着门口） */
    const b0 = maze.bfs(maze.entrance);
    maze.dist = b0.dist;
    maze.reached = b0.reached;
    maze.openCount = maze.openCells().length;
    return maze;
  };

  /* ============================================================
     把墙摆进场景
     ------------------------------------------------------------
     一格墙 = 一个 Mesh 会很浪费（21×21 里有 200 多格是墙），
     所以把**同一行里连着的墙**合成一条长条（BoxGeometry 缩放），
     21 行的迷宫大概只剩 90 多条；碰撞盒也少，跑起来更稳。
     墙高 3 步：跳也跳不过去、也迈不上去（引擎的自动迈步只认 0.6 左右）。
     ------------------------------------------------------------
     返回 { group, meshCount, boxes }：
       group  → 关卡自己 ctx.scene.add()（重新进关时要整个清掉重造）
       boxes  → 这一批碰撞盒，重新进关时用来整批关掉
     ============================================================ */
  const WALL_H = 3;
  M.WALL_H = WALL_H;

  M._wallMat = function () {
    if (!M._wallMatCache) {
      M._wallMatCache = new THREE.MeshLambertMaterial({ map: Game.Textures.stone() });
    }
    return M._wallMatCache;
  };
  M._unitBox = function () {
    if (!M._unitBoxCache) M._unitBoxCache = new THREE.BoxGeometry(1, 1, 1);
    return M._unitBoxCache;
  };

  M.buildWalls = function (ctx, maze, cell, y) {
    const h = ctx.helpers;
    const group = new THREE.Group();
    group.name = 'maze-walls';
    const boxes = [];
    let meshCount = 0;
    const y0 = y === undefined ? 0 : y;
    const geo = M._unitBox(), mat = M._wallMat();
    for (let gz = 0; gz < maze.gh; gz++) {
      let gx = 0;
      while (gx < maze.gw) {
        if (maze.grid[gz * maze.gw + gx] !== 1) { gx++; continue; }
        let run = 1;
        while (gx + run < maze.gw && maze.grid[gz * maze.gw + gx + run] === 1) run++;
        const w = maze.gridToWorld(gx + (run - 1) / 2, gz, cell);
        const px = w.x, pz = w.z;
        const sx = run * cell, sz = cell;
        const m = new THREE.Mesh(geo, mat);
        m.position.set(px, y0 + WALL_H / 2, pz);
        m.scale.set(sx, WALL_H, sz);
        m.castShadow = m.receiveShadow = true;
        group.add(m);
        meshCount++;
        /* 碰撞盒（自己留着，重新进关时整批 enabled = false） */
        boxes.push(h.addSolid(px, y0, pz, sx, WALL_H, sz));
        gx += run;
      }
    }
    return { group: group, meshCount: meshCount, boxes: boxes };
  };

  /* ============================================================
     小怪兽 —— 方块小怪兽：身体 + 两只角 + 两只大眼睛 + 血条 + 名牌
       const m = M.makeMonster({ x, z, kind, hp })
       m.damage(2) / m.setHp(v) / m.hitFlash() / m.animate(dt, time)
     ============================================================ */
  const KINDS = [
    { name: '👹 红怪兽', body: 0xe0554f, dark: 0x8e2b28, horn: 0xffe3a8 },
    { name: '👺 紫怪兽', body: 0x8f6bd6, dark: 0x5b3f96, horn: 0xffe3a8 },
    { name: '🟢 绿怪兽', body: 0x5fbf5a, dark: 0x2f7a33, horn: 0xfff0b8 },
    { name: '🟣 蓝怪兽', body: 0x4f9fe0, dark: 0x2b5f96, horn: 0xffe3a8 }
  ];
  M.KINDS = KINDS;

  M.makeMonster = function (opts) {
    opts = opts || {};
    const kind = KINDS[(opts.kind || 0) % KINDS.length];
    const hpMax = opts.hp || 4;
    const bodyMat = Game.mat(kind.body);
    const darkMat = Game.mat(kind.dark);
    const eyeMat = Game.mat(0xffffff);
    const pupilMat = Game.mat(0x1d1f26);
    const hornMat = Game.mat(kind.horn);
    const geo = M._unitBox();

    const group = new THREE.Group();
    group.position.set(opts.x || 0, 0, opts.z || 0);

    /* 身体 */
    const body = new THREE.Mesh(geo, bodyMat);
    body.scale.set(1.15, 1.0, 1.05);
    body.position.y = 1.0;
    body.castShadow = body.receiveShadow = true;
    group.add(body);

    /* 两只脚（会一前一后地摆） */
    const feet = [];
    [-0.34, 0.34].forEach(function (fx) {
      const pivot = new THREE.Group();
      pivot.position.set(fx, 0.5, 0);
      const foot = new THREE.Mesh(geo, darkMat);
      foot.scale.set(0.42, 0.5, 0.62);
      foot.position.y = -0.25;
      foot.castShadow = true;
      pivot.add(foot);
      group.add(pivot);
      feet.push(pivot);
    });

    /* 两只大眼睛（小朋友一眼就知道那是怪兽） */
    [-0.28, 0.28].forEach(function (ex) {
      const white = new THREE.Mesh(geo, eyeMat);
      white.scale.set(0.3, 0.34, 0.16);
      white.position.set(ex, 1.22, 0.5);
      const pupil = new THREE.Mesh(geo, pupilMat);
      pupil.scale.set(0.14, 0.18, 0.1);
      pupil.position.set(ex, 1.2, 0.6);
      group.add(white, pupil);
    });

    /* 两只角 + 一张锯齿嘴 */
    [-0.4, 0.4].forEach(function (hx) {
      const horn = new THREE.Mesh(geo, hornMat);
      horn.scale.set(0.16, 0.4, 0.16);
      horn.position.set(hx, 1.68, 0.1);
      horn.rotation.z = hx < 0 ? 0.28 : -0.28;
      horn.castShadow = true;
      group.add(horn);
    });
    [-0.22, 0, 0.22].forEach(function (tx) {
      const tooth = new THREE.Mesh(geo, eyeMat);
      tooth.scale.set(0.12, 0.18, 0.1);
      tooth.position.set(tx, 0.78, 0.55);
      group.add(tooth);
    });

    /* 血条（和小人机对手一个样子）+ 名牌 */
    const barW = 1.5, barH = 0.15;
    const barBg = new THREE.Mesh(geo, Game.mat(0x2b2f3a));
    barBg.scale.set(barW, barH, 0.06);
    barBg.position.set(0, 2.28, 0);
    const barFillMat = Game.mat(0x6bff8f);
    const barFill = new THREE.Mesh(geo, barFillMat);
    barFill.scale.set(barW - 0.08, barH - 0.05, 0.09);
    barFill.position.set(0, 2.28, 0.01);
    group.add(barBg, barFill);

    const label = Game.makeLabelSprite(kind.name, 0.42, {
      fontSize: 42, bg: 'rgba(255,236,236,.94)'
    });
    label.position.set(0, 2.72, 0);
    label.userData.ownTexture = true;      // 重新进关时要把它这张贴图释放掉
    group.add(label);

    const mon = {
      group: group,
      label: label,
      body: body,
      feet: feet,
      kind: kind,
      hpMax: hpMax,
      hp: hpMax,
      alive: true,
      flash: 0,
      gait: 0,
      speedNow: 0,
      cell: { gx: 0, gz: 0 },
      next: { gx: 0, gz: 0 },
      tx: opts.x || 0,
      tz: opts.z || 0,
      biteCd: 0,
      alert: false,
      setHp: function (v) {
        mon.hp = Game.clamp(v, 0, hpMax);
        const r = mon.hp / hpMax;
        barFill.scale.x = Math.max(0.001, (barW - 0.08) * r);
        barFill.position.x = -(barW - 0.08) * (1 - r) / 2;
        barFill.material = Game.mat(r > 0.5 ? 0x6bff8f : (r > 0.25 ? 0xffd447 : 0xff6b6b));
        return mon;
      },
      damage: function (n) {
        mon.setHp(mon.hp - n);
        mon.flash = 0.14;
        return mon;
      },
      hitFlash: function () { mon.flash = 0.14; return mon; },
      animate: function (dt, time) {
        mon.gait += dt * (2 + mon.speedNow * 1.6);
        body.position.y = 1.0 + Math.abs(Math.sin(mon.gait)) * 0.06;
        for (let i = 0; i < feet.length; i++) {
          feet[i].rotation.x = Math.sin(mon.gait + i * Math.PI) * 0.45;
        }
        if (mon.flash > 0) {
          mon.flash -= dt;
          /* 被打到的那一下闪一下白，再变回原来的颜色 */
          body.material = mon.flash > 0.07 ? Game.mat(0xfff0f4) : bodyMat;
        }
      }
    };
    mon.setHp(hpMax);
    return mon;
  };

  /* ============================================================
     金币 —— 会转的金色圆柱 + 一颗会闪的星星
     （星星的贴图在所有金币之间共用，不会一枚金币一张贴图）
     ============================================================ */
  M._coinMat = function () {
    if (!M._coinMatCache) {
      M._coinMatCache = new THREE.MeshLambertMaterial({ color: 0xffd447, emissive: 0x6a4f00 });
    }
    return M._coinMatCache;
  };
  M._coinGeo = function () {
    if (!M._coinGeoCache) M._coinGeoCache = new THREE.CylinderGeometry(0.36, 0.36, 0.12, 16);
    return M._coinGeoCache;
  };
  M._starMat = function () {
    if (!M._starMatCache) {
      const s = Game.makeLabelSprite('✨', 0.5, {
        fontSize: 46, bg: 'rgba(0,0,0,0)', border: 'rgba(0,0,0,0)'
      });
      s.material.userData.shared = true;
      M._starMatCache = s.material;
    }
    return M._starMatCache;
  };

  M.makeCoin = function (opts) {
    opts = opts || {};
    const group = new THREE.Group();
    group.position.set(opts.x || 0, 0, opts.z || 0);
    const coin = new THREE.Mesh(M._coinGeo(), M._coinMat());
    coin.rotation.x = Math.PI / 2;
    coin.position.y = 0.5;
    coin.castShadow = true;
    group.add(coin);
    const star = new THREE.Sprite(M._starMat());
    star.scale.set(0.5, 0.5, 1);
    star.position.y = 1.25;
    group.add(star);
    const c = {
      group: group, mesh: coin, star: star, taken: false,
      value: opts.value || 3,
      phase: (opts.phase || 0),
      animate: function (dt, time) {
        if (c.taken) return;
        group.rotation.y += dt * 2.2;
        coin.position.y = 0.5 + Math.sin(time * 2.6 + c.phase) * 0.11;
        star.position.y = 1.25 + Math.sin(time * 2.6 + c.phase) * 0.11;
      }
    };
    return c;
  };

  /* ============================================================
     把一个 Group 整个清空
     —— 重新进关时墙 / 怪兽 / 金币都靠它清掉；
        怪兽名牌的贴图（自己画的）顺手释放，共用的贴图（金币星星）不碰。
     ============================================================ */
  M.clearGroup = function (group) {
    if (!group) return;
    for (let i = group.children.length - 1; i >= 0; i--) {
      const child = group.children[i];
      if (child.material && child.material.map && child.userData &&
          child.userData.ownTexture && !(child.material.userData && child.material.userData.shared)) {
        child.material.map.dispose();
      }
      group.remove(child);
    }
  };
})();

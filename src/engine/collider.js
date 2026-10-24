/* ===================================================================
   engine/collider.js
   物理引擎：AABB 碰撞 + 走路 / 跳跃 / 自动上台阶
   -------------------------------------------------------------------
   ★ 引擎层文件，关卡作者不用改这里 ★

   想调「手感」请改 engine/namespace.js 里的 Game.CONST：
     GRAVITY     重力（越小越飘）
     JUMP_V      跳跃初速（越大跳越高）
     WALK_SPEED  走路速度
     STEP_UP     不用跳就能迈上去的最大高度（台阶高度要小于它）
   =================================================================== */
(function () {
  const Game = window.Game;
  const C = Game.CONST;

  const Physics = (Game.Physics = {
    /* ---------------- 造一个「人」的身体 ----------------
       body.pos 是「脚底」的位置（脚下的中心点） */
    createBody(x, y, z, opts) {
      opts = opts || {};
      return {
        pos: new THREE.Vector3(x || 0, y || 0, z || 0),
        vel: new THREE.Vector3(),
        hx: opts.hx || C.ACTOR_RADIUS,   // 碰撞箱半宽（x）
        hz: opts.hz || C.ACTOR_RADIUS,   // 碰撞箱半深（z）
        h: opts.h || C.ACTOR_HEIGHT,     // 身高
        grounded: true,
        moving: false,
        jumped: false
      };
    },

    /* 身体和某个碰撞盒是否重叠 */
    overlaps(b, c) {
      return b.pos.x - b.hx < c.maxX && b.pos.x + b.hx > c.minX &&
        b.pos.y < c.maxY && b.pos.y + b.h > c.minY &&
        b.pos.z - b.hz < c.maxZ && b.pos.z + b.hz > c.minZ;
    },

    /* 沿一个轴把身体推出碰撞盒（axis: 'x' | 'y' | 'z'） */
    resolveAxis(b, axis, dir, colliders, stepUp) {
      let hit = false;
      for (let i = 0; i < colliders.length; i++) {
        const c = colliders[i];
        if (c.enabled === false) continue;
        if (!Physics.overlaps(b, c)) continue;

        /* 站在地上往前走时，比脚底高一点点的小障碍自动迈上去（台阶） */
        if (axis !== 'y' && b.grounded && !c.noStep) {
          const step = c.maxY - b.pos.y;
          if (step > 0.04 && step <= stepUp) { b.pos.y = c.maxY + 0.01; continue; }
        }

        if (axis === 'x') {
          b.pos.x = dir > 0 ? c.minX - b.hx - 0.002 : c.maxX + b.hx + 0.002;
          b.vel.x = 0;
        } else if (axis === 'z') {
          b.pos.z = dir > 0 ? c.minZ - b.hz - 0.002 : c.maxZ + b.hz + 0.002;
          b.vel.z = 0;
        } else if (dir < 0) {          // 从上面踩住
          b.pos.y = c.maxY + 0.002;
          b.vel.y = 0;
          b.grounded = true;
        } else {                        // 从下面顶到头
          b.pos.y = c.minY - b.h - 0.002;
          b.vel.y = 0;
        }
        hit = true;
      }
      return hit;
    },

    /* ---------------- 走一步 ----------------
       opts = {
         colliders : [ ... ]      当前关卡所有碰撞盒
         bounds    : {minX,maxX,minZ,maxZ}  可选的「看不见的墙」
         wishX/wishZ : 本帧想往哪走（已按相机方向算好，范围 -1..1）
         jump      : true 表示这一帧按了跳跃
         floor     : 地面高度，默认 0
         floorAt   : 函数 (x,z) => 高度 | null
                     ★擂台关用★：返回 null 表示「这里没有地」，人就会掉下去
         holdMomentum : true 时不吃方向键，保留当前速度慢慢衰减（被击飞用）
         speed / gravity / jumpV / stepUp : 临时覆盖常量
       } */
    step(b, dt, opts) {
      const colliders = opts.colliders || [];
      const stepUp = opts.stepUp == null ? C.STEP_UP : opts.stepUp;
      const gravity = opts.gravity == null ? C.GRAVITY : opts.gravity;
      const speed = opts.speed == null ? C.WALK_SPEED : opts.speed;
      const jumpV = opts.jumpV == null ? C.JUMP_V : opts.jumpV;

      /* 把「想走的方向」限制成长度 1，斜着走就不会更快 */
      let wx = opts.wishX || 0, wz = opts.wishZ || 0;
      const len = Math.hypot(wx, wz);
      if (len > 1) { wx /= len; wz /= len; }

      if (opts.holdMomentum) {
        /* 被击飞：方向键暂时管不了，速度自己慢慢停下来（每秒衰减到 8%） */
        b.moving = false;
        const damp = Math.pow(opts.drag == null ? 0.08 : opts.drag, dt);
        b.vel.x *= damp;
        b.vel.z *= damp;
      } else {
        b.moving = len > 0.001;
        b.vel.x = wx * speed;
        b.vel.z = wz * speed;
      }

      b.jumped = false;
      if (opts.jump && b.grounded) {
        b.vel.y = jumpV;
        b.grounded = false;
        b.jumped = true;
      }

      /* 1) 水平移动 + 撞墙 */
      b.pos.x += b.vel.x * dt;
      if (b.vel.x !== 0) Physics.resolveAxis(b, 'x', Math.sign(b.vel.x), colliders, stepUp);
      b.pos.z += b.vel.z * dt;
      if (b.vel.z !== 0) Physics.resolveAxis(b, 'z', Math.sign(b.vel.z), colliders, stepUp);

      /* 这一帧脚下到底有没有地？（擂台会缩圈，圈外就是空的） */
      let floor = opts.floor == null ? 0 : opts.floor;
      if (typeof opts.floorAt === 'function') {
        const f = opts.floorAt(b.pos.x, b.pos.z);
        floor = (f === null || f === undefined || !isFinite(f)) ? null : f;
      }

      /* 2) 重力 + 落地 */
      b.grounded = false;
      b.vel.y -= gravity * dt;
      b.pos.y += b.vel.y * dt;
      Physics.resolveAxis(b, 'y', Math.sign(b.vel.y), colliders, stepUp);
      if (floor !== null && b.pos.y <= floor) { b.pos.y = floor; b.vel.y = 0; b.grounded = true; }
      if (b.pos.y > 80 && floor !== null) { b.pos.y = floor; b.vel.y = 0; }   // 掉出世界就救回来

      /* 3) 地图边界保护 */
      const bd = opts.bounds;
      if (bd) {
        b.pos.x = Game.Math.clamp(b.pos.x, bd.minX, bd.maxX);
        b.pos.z = Game.Math.clamp(b.pos.z, bd.minZ, bd.maxZ);
      }
      return b;
    }
  });
})();

/* ===================================================================
   engine/player.js
   玩家控制器：键盘 / 鼠标 / 触屏输入 + 走路跳跃 + 第三人称相机
   -------------------------------------------------------------------
   ★ 引擎层文件，关卡作者不用改这里 ★

   关卡想动玩家时，用 ctx.player（就是这里的实例）：
     ctx.player.pos                 玩家的 Vector3 位置（脚底）
     ctx.player.teleport(x, z)      把玩家挪过去
     ctx.player.setTier(0..3)       换手里的剑（0 石 / 1 铁 / 2 金 / 3 钻石）
     ctx.player.setCam({yaw,pitch,dist})  调镜头
     ctx.player.consumeAttack()     这一帧有没有按 F（擂台关用）
     ctx.player.swing()             挥一下武器（动画）
     ctx.player.knockback(dx,dz,power,up,stun)  把玩家击飞一段
     ctx.player.stunT               被击飞的僵直剩余秒数
   =================================================================== */
(function () {
  const Game = window.Game;

  const MIN_PITCH = -0.15, MAX_PITCH = 1.15;
  const MIN_DIST = 4.5, MAX_DIST = 14;

  Game.Player = class Player {
    constructor(opts) {
      const scene = opts.scene;
      this.scene = scene;
      this.camera = opts.camera;
      this.canvas = opts.canvas;

      /* 模型 */
      this.model = Game.makePlayerModel();
      scene.add(this.model.group);

      /* 物理身体 */
      this.body = Game.Physics.createBody(0, 0, 0);

      /* 相机参数（yaw 水平角 / pitch 俯仰角 / dist 距离） */
      this.cam = { yaw: 0, pitch: 0.34, dist: 7.4 };

      /* 输入状态 */
      this.input = {
        keys: {},
        touchMove: { x: 0, y: 0 },
        jumpQueued: false,
        actQueued: false,
        attackQueued: false
      };
      this.inputEnabled = true;     // 弹窗打开时置 false，玩家就站着不动
      this.jumpEnabled = true;      // 关卡可以关掉跳跃（写 noJump:true，第 7 关迷宫用）
      this.lockRotation = false;    // 开场镜头自动转圈时锁住手动转视角
      this.stunT = 0;               // 被击飞的僵直时间（期间方向键失效）
      this.touchDevice = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;

      this._bindKeyboard();
      this._bindMouse();
      this._bindTouch();
    }

    get pos() { return this.body.pos; }
    get grounded() { return this.body.grounded; }
    get moving() { return this.body.moving; }

    /* ---------------- 键盘 ---------------- */
    _bindKeyboard() {
      const input = this.input;
      window.addEventListener('keydown', (e) => {
        if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].indexOf(e.code) >= 0) {
          e.preventDefault();
        }
        input.keys[e.code] = true;
        if (!this.inputEnabled) return;
        if (e.code === 'Space' && this.jumpEnabled) input.jumpQueued = true;
        if (e.code === 'KeyE' || e.code === 'Enter') input.actQueued = true;
        if (e.code === 'KeyF') input.attackQueued = true;      // 擂台关：打！
      });
      window.addEventListener('keyup', (e) => { input.keys[e.code] = false; });
      window.addEventListener('blur', () => { input.keys = {}; });
    }

    /* ---------------- 鼠标拖拽 / 滚轮 ---------------- */
    _bindMouse() {
      const cam = this.cam;
      let dragging = false, lastX = 0, lastY = 0;

      this.canvas.addEventListener('mousedown', (e) => {
        dragging = true; lastX = e.clientX; lastY = e.clientY;
      });
      window.addEventListener('mouseup', () => { dragging = false; });
      window.addEventListener('mousemove', (e) => {
        if (this.lockRotation) return;
        if (document.pointerLockElement === this.canvas) {
          this.rotate(e.movementX, e.movementY);
        } else if (dragging) {
          this.rotate(e.clientX - lastX, e.clientY - lastY);
          lastX = e.clientX; lastY = e.clientY;
        }
      });
      this.canvas.addEventListener('dblclick', () => {
        if (this.canvas.requestPointerLock) {
          try { this.canvas.requestPointerLock(); } catch (err) { /* 忽略 */ }
        }
      });
      window.addEventListener('wheel', (e) => {
        cam.dist = Game.clamp(cam.dist + Math.sign(e.deltaY) * 0.6, MIN_DIST, MAX_DIST);
      }, { passive: true });
    }

    rotate(dx, dy) {
      const sens = this.lockRotation ? 0 : 0.0042;
      this.cam.yaw -= dx * sens;
      this.cam.pitch = Game.clamp(this.cam.pitch + dy * sens, MIN_PITCH, MAX_PITCH);
    }

    /* ---------------- 触屏（左摇杆 + 右侧滑动 + 两个按钮） ---------------- */
    _bindTouch() {
      if (!this.touchDevice) return;
      const $ = (id) => document.getElementById(id);
      const layer = $('touchLayer');
      if (!layer) return;
      layer.classList.remove('hidden');

      const stickZone = $('stickZone'), knob = $('stickKnob');
      let stickId = null, center = { x: 0, y: 0 };
      const R = 52;
      stickZone.addEventListener('pointerdown', (e) => {
        stickId = e.pointerId;
        const r = stickZone.getBoundingClientRect();
        center = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
        stickZone.setPointerCapture(e.pointerId);
        e.preventDefault();
      });
      stickZone.addEventListener('pointermove', (e) => {
        if (e.pointerId !== stickId) return;
        const dx = e.clientX - center.x, dy = e.clientY - center.y;
        const len = Math.hypot(dx, dy) || 1;
        const k = Math.min(1, len / R);
        const nx = (dx / len) * k, ny = (dy / len) * k;
        knob.style.transform = 'translate(' + nx * R + 'px,' + ny * R + 'px)';
        this.input.touchMove.x = nx;
        this.input.touchMove.y = -ny;
      });
      const endStick = (e) => {
        if (e.pointerId !== stickId) return;
        stickId = null;
        this.input.touchMove.x = 0; this.input.touchMove.y = 0;
        knob.style.transform = '';
      };
      stickZone.addEventListener('pointerup', endStick);
      stickZone.addEventListener('pointercancel', endStick);

      const lookZone = $('lookZone');
      let lookId = null, last = { x: 0, y: 0 };
      lookZone.addEventListener('pointerdown', (e) => {
        lookId = e.pointerId; last = { x: e.clientX, y: e.clientY };
        lookZone.setPointerCapture(e.pointerId);
        e.preventDefault();
      });
      lookZone.addEventListener('pointermove', (e) => {
        if (e.pointerId !== lookId) return;
        this.rotate((e.clientX - last.x) * 1.4, (e.clientY - last.y) * 1.4);
        last = { x: e.clientX, y: e.clientY };
      });
      const endLook = (e) => { if (e.pointerId === lookId) lookId = null; };
      lookZone.addEventListener('pointerup', endLook);
      lookZone.addEventListener('pointercancel', endLook);

      $('btnJump').addEventListener('pointerdown', (e) => {
        e.preventDefault();
        if (this.inputEnabled && this.jumpEnabled) this.input.jumpQueued = true;
      });
      $('btnAct').addEventListener('pointerdown', (e) => {
        e.preventDefault();
        if (this.inputEnabled) this.input.actQueued = true;
      });
      const btnAtk = $('btnAtk');
      if (btnAtk) {
        btnAtk.addEventListener('pointerdown', (e) => {
          e.preventDefault();
          if (this.inputEnabled) this.input.attackQueued = true;
        });
      }
      const hint = $('hintBar');
      if (hint) hint.style.display = 'none';    // 手机上按钮已经很清楚，不占地方
    }

    /* ---------------- 每帧：走路 + 相机 ---------------- */
    update(dt, world) {
      world = world || {};
      const input = this.input;
      const cam = this.cam;
      const body = this.body;

      if (this.stunT > 0) this.stunT = Math.max(0, this.stunT - dt);
      const stunned = this.stunT > 0;         // 被击飞中：方向键管不了

      let mx = 0, mz = 0;
      if (this.inputEnabled && !stunned) {
        if (input.keys.KeyW || input.keys.ArrowUp) mz += 1;
        if (input.keys.KeyS || input.keys.ArrowDown) mz -= 1;
        if (input.keys.KeyA || input.keys.ArrowLeft) mx -= 1;
        if (input.keys.KeyD || input.keys.ArrowRight) mx += 1;
        mx += input.touchMove.x;
        mz += input.touchMove.y;
      }

      /* 把「前后左右」换算成世界方向：前 = 镜头看的方向 */
      const fx = -Math.sin(cam.yaw), fz = -Math.cos(cam.yaw);
      const rx = -fz, rz = fx;
      const wishX = fx * mz + rx * mx;
      const wishZ = fz * mz + rz * mx;

      const jump = this.inputEnabled && !stunned && this.jumpEnabled && input.jumpQueued;
      input.jumpQueued = false;

      Game.Physics.step(body, dt, {
        colliders: world.colliders || [],
        bounds: world.bounds,
        wishX: wishX,
        wishZ: wishZ,
        jump: jump,
        floor: world.floor || 0,
        floorAt: world.floorAt || null,
        holdMomentum: stunned,
        speed: world.speed
      });
      if (body.jumped) Game.Sfx.jump();

      const g = this.model.group;
      g.position.set(body.pos.x, body.pos.y, body.pos.z);
      if (body.moving) g.rotation.y = Math.atan2(wishX, wishZ);

      this.updateCamera(dt);
    }

    /* 只更新相机（开场动画、弹窗时也能用） */
    updateCamera(dt) {
      const cam = this.cam, p = this.body.pos, camera = this.camera;
      const cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch);
      const tx = p.x + Math.sin(cam.yaw) * cp * cam.dist;
      const tz = p.z + Math.cos(cam.yaw) * cp * cam.dist;
      const ty = Math.max(p.y + 1.5 + sp * cam.dist, 1.2);
      const k = Math.min(1, dt * 9);
      camera.position.x = Game.lerp(camera.position.x, tx, k);
      camera.position.y = Game.lerp(camera.position.y, ty, k);
      camera.position.z = Game.lerp(camera.position.z, tz, k);
      camera.lookAt(p.x, p.y + 1.35, p.z);
    }

    /* 立刻把相机贴到目标位置（传送后不要拉丝） */
    snapCamera() {
      const cam = this.cam, p = this.body.pos, camera = this.camera;
      const cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch);
      camera.position.set(
        p.x + Math.sin(cam.yaw) * cp * cam.dist,
        Math.max(p.y + 1.5 + sp * cam.dist, 1.2),
        p.z + Math.cos(cam.yaw) * cp * cam.dist
      );
      camera.lookAt(p.x, p.y + 1.35, p.z);
    }

    /* ---------------- 给关卡用的工具 ---------------- */
    teleport(x, z, y, camOpts) {
      this.body.pos.set(x, y || 0, z);
      this.body.vel.set(0, 0, 0);
      this.body.grounded = true;
      this.model.group.position.copy(this.body.pos);
      if (camOpts) this.setCam(camOpts);
      this.snapCamera();
      return this;
    }

    setCam(o) {
      if (!o) return this;
      if (o.yaw !== undefined) this.cam.yaw = o.yaw;
      if (o.pitch !== undefined) this.cam.pitch = Game.clamp(o.pitch, MIN_PITCH, MAX_PITCH);
      if (o.dist !== undefined) this.cam.dist = Game.clamp(o.dist, MIN_DIST, MAX_DIST);
      return this;
    }

    setTier(tier) { this.model.setTier(tier); return this; }

    /* ---------------- 战斗（擂台关用） ---------------- */
    /* 这一帧按了「攻击」吗？（取走就清掉，一个按键只打一下） */
    consumeAttack() {
      const v = this.input.attackQueued;
      this.input.attackQueued = false;
      return v;
    }

    /* 挥一下手里的武器（纯动画） */
    swing() { if (this.model.swing) this.model.swing(); return this; }

    /* 被击飞：dx/dz 是方向，power 是水平速度，up 是往上弹多高，stun 是僵直秒数 */
    knockback(dx, dz, power, up, stun) {
      const len = Math.hypot(dx, dz) || 1;
      this.body.vel.x = (dx / len) * power;
      this.body.vel.z = (dz / len) * power;
      this.body.vel.y = up === undefined ? 4.2 : up;
      this.body.grounded = false;
      this.stunT = Math.max(this.stunT, stun === undefined ? 0.45 : stun);
      return this;
    }

    /* 玩家站在哪个方向（攻击时朝着对面挥剑） */
    faceDir() {
      const y = this.model.group.rotation.y;
      return { x: Math.sin(y), z: Math.cos(y) };
    }

    /* 朝向某个点（等着看目标时用） */
    faceTo(x, z) {
      this.model.group.rotation.y = Math.atan2(x - this.body.pos.x, z - this.body.pos.z);
      return this;
    }

    animate(dt, time) {
      this.model.animate(dt, this.body.moving, this.body.grounded, time);
    }

    /* 丢掉还没消费的按键（弹窗关闭后防止「卡住一直走」） */
    clearQueue() {
      this.input.actQueued = false;
      this.input.jumpQueued = false;
      this.input.attackQueued = false;
    }
  };
})();

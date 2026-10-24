/* ===================================================================
   engine/particles.js
   粒子：一小坨会往上飘、慢慢消失的方块，用来做收集/答对的反馈
   =================================================================== */
(function () {
  const Game = window.Game;

  Game.Particles = class Particles {
    constructor(scene) {
      this.group = new THREE.Group();
      scene.add(this.group);
      this.pool = [];
      const geo = new THREE.BoxGeometry(0.16, 0.16, 0.16);
      for (let i = 0; i < 120; i++) {
        const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ transparent: true }));
        m.visible = false;
        this.group.add(m);
        this.pool.push({ mesh: m, life: 0, max: 1, vel: new THREE.Vector3() });
      }
    }

    burst(pos, color, count, spread) {
      count = count || 14; spread = spread || 1;
      let used = 0;
      for (const p of this.pool) {
        if (p.life > 0) continue;
        p.mesh.visible = true;
        p.mesh.position.set(
          pos.x + Game.rand(-0.35, 0.35),
          pos.y + Game.rand(0, 0.5),
          pos.z + Game.rand(-0.35, 0.35)
        );
        p.mesh.material.color.set(color);
        p.mesh.material.opacity = 1;
        p.mesh.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
        p.vel.set(Game.rand(-spread, spread), Game.rand(2.2, 4.6), Game.rand(-spread, spread));
        p.max = p.life = Game.rand(0.8, 1.4);
        if (++used >= count) break;
      }
    }

    update(dt) {
      for (const p of this.pool) {
        if (p.life <= 0) continue;
        p.life -= dt;
        if (p.life <= 0) { p.mesh.visible = false; continue; }
        p.vel.y -= 9 * dt;
        p.mesh.position.addScaledVector(p.vel, dt);
        p.mesh.rotation.x += dt * 6;
        p.mesh.rotation.y += dt * 4;
        p.mesh.material.opacity = Math.max(0, p.life / p.max);
      }
    }
  };
})();

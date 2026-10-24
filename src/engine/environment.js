/* ===================================================================
   engine/environment.js
   全局环境：天空、雾、太阳光、云影
   -------------------------------------------------------------------
   关卡可以给自己的地图换一套天气（在关卡定义里写 theme）：

     theme: {
       skyTop: 0x3fa9f5, skyBottom: 0xe8f7ff,
       fog: 0xcfeeff, fogNear: 75, fogFar: 200,
       sun: 0xfff2cc, ambient: 0.85
     }
   不写就用默认的大晴天。
   =================================================================== */
(function () {
  const Game = window.Game;

  const DEFAULT_THEME = {
    skyTop: 0x3fa9f5,
    skyBottom: 0xe8f7ff,
    fog: 0xcfeeff,
    fogNear: 75,
    fogFar: 200,
    sun: 0xfff2cc,
    ambient: 0.85
  };

  Game.Environment = {
    create(scene, theme) {
      const env = Object.create(this);
      env.scene = scene;

      /* 天空球：上蓝下白的渐变（自定义 shader，跟雾无关） */
      const geo = new THREE.SphereGeometry(320, 24, 16);
      const mat = new THREE.ShaderMaterial({
        side: THREE.BackSide, depthWrite: false, fog: false,
        uniforms: {
          top: { value: new THREE.Color(DEFAULT_THEME.skyTop) },
          bottom: { value: new THREE.Color(DEFAULT_THEME.skyBottom) }
        },
        vertexShader:
          'varying vec3 vPos; void main(){ vPos = position;' +
          ' gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
        fragmentShader:
          'uniform vec3 top; uniform vec3 bottom; varying vec3 vPos;' +
          'void main(){ float h = clamp(vPos.y / 320.0 * 0.5 + 0.5, 0.0, 1.0);' +
          ' gl_FragColor = vec4(mix(bottom, top, pow(h, 0.75)), 1.0); }'
      });
      env.sky = new THREE.Mesh(geo, mat);
      env.skyMat = mat;
      scene.add(env.sky);

      scene.fog = new THREE.Fog(DEFAULT_THEME.fog, DEFAULT_THEME.fogNear, DEFAULT_THEME.fogFar);

      env.hemi = new THREE.HemisphereLight(0xffffff, 0xb8e08a, DEFAULT_THEME.ambient);
      env.hemi.position.set(0, 40, 0);
      scene.add(env.hemi);

      env.sun = new THREE.DirectionalLight(DEFAULT_THEME.sun, 1.1);
      env.sun.position.set(28, 46, 20);
      env.sun.castShadow = true;
      env.sun.shadow.mapSize.set(2048, 2048);
      const sc = env.sun.shadow.camera;
      sc.left = -32; sc.right = 32; sc.top = 32; sc.bottom = -32; sc.near = 1; sc.far = 150;
      env.sun.shadow.bias = -0.0009;
      scene.add(env.sun);
      scene.add(env.sun.target);

      /* 卡通大太阳（画在天上的一个圆） */
      env.sunDisc = new THREE.Mesh(
        new THREE.CircleGeometry(13, 32),
        new THREE.MeshBasicMaterial({
          color: 0xfff3b0, fog: false, transparent: true, opacity: 0.85
        })
      );
      env.sunDisc.position.set(110, 110, -150);
      env.sunDisc.lookAt(0, 6, 0);
      scene.add(env.sunDisc);

      env.setTheme(theme);
      return env;
    },

    setTheme(theme) {
      if (theme === this._theme && this.scene.fog) return this;
      const t = Object.assign({}, DEFAULT_THEME, theme || {});
      this._theme = theme;
      this.skyMat.uniforms.top.value.set(t.skyTop);
      this.skyMat.uniforms.bottom.value.set(t.skyBottom);
      this.scene.fog.color.set(t.fog);
      this.scene.fog.near = t.fogNear;
      this.scene.fog.far = t.fogFar;
      this.hemi.intensity = t.ambient;
      this.sun.color.set(t.sun);
      this.sunDisc.visible = t.sunDisc !== false;
      return this;
    },

    /* 太阳和天空跟着玩家走，阴影才一直清楚 */
    update(playerPos) {
      const p = playerPos;
      this.sun.position.set(p.x + 30, 48, p.z + 22);
      this.sun.target.position.set(p.x, 0, p.z);
      this.sun.target.updateMatrixWorld();
      this.sky.position.set(p.x, 0, p.z);
    }
  };
})();

/* ===================================================================
   engine/textures.js
   canvas 手绘贴图（不需要任何图片素材）
   grass / dirt / wood / stone / paving / face / label
   =================================================================== */
(function () {
  const Game = window.Game;
  const css = Game.css;

  function canvasTex(w, h, draw, repeatX, repeatY) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    if (repeatX) {
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(repeatX, repeatY || repeatX);
    }
    return t;
  }

  const tex = (Game.Textures = {
    canvas: canvasTex,

    grass() {
      return canvasTex(64, 64, (g) => {
        g.fillStyle = '#78c94b'; g.fillRect(0, 0, 64, 64);
        const shades = ['#8dd75c', '#6cb841', '#9ce069', '#84cf52'];
        for (let i = 0; i < 220; i++) {
          g.fillStyle = shades[i % shades.length];
          const s = 3 + (i % 3);
          g.fillRect(Math.floor(Math.random() * 64), Math.floor(Math.random() * 64), s, s);
        }
      }, 34, 34);
    },

    dirt() {
      return canvasTex(64, 64, (g) => {
        g.fillStyle = '#a9713f'; g.fillRect(0, 0, 64, 64);
        const shades = ['#b57c47', '#96632f', '#c08754'];
        for (let i = 0; i < 160; i++) {
          g.fillStyle = shades[i % shades.length];
          g.fillRect(Math.floor(Math.random() * 64), Math.floor(Math.random() * 64), 4, 4);
        }
      }, 1, 1);
    },

    wood() {
      return canvasTex(64, 64, (g) => {
        g.fillStyle = '#b57c47'; g.fillRect(0, 0, 64, 64);
        for (let y = 0; y < 64; y += 16) {
          g.fillStyle = y % 32 === 0 ? '#a9713f' : '#c48b53';
          g.fillRect(0, y, 64, 14);
          g.fillStyle = 'rgba(74,52,33,.25)';
          g.fillRect(0, y + 14, 64, 2);
        }
      }, 2, 2);
    },

    stone() {
      return canvasTex(64, 64, (g) => {
        g.fillStyle = '#b9bec4'; g.fillRect(0, 0, 64, 64);
        const shades = ['#c9ced4', '#a8afb7', '#d3d8dd'];
        for (let i = 0; i < 90; i++) {
          g.fillStyle = shades[i % shades.length];
          const s = 6 + (i % 4) * 3;
          g.fillRect(Math.floor(Math.random() * 64), Math.floor(Math.random() * 64), s, s);
        }
        g.strokeStyle = 'rgba(90,98,106,.35)'; g.lineWidth = 2;
        g.strokeRect(1, 1, 62, 62);
      }, 1, 1);
    },

    /* 广场方砖 */
    paving() {
      return canvasTex(256, 256, (g) => {
        g.fillStyle = '#a9b0b7'; g.fillRect(0, 0, 256, 256);
        for (let y = 0; y < 4; y++) {
          for (let x = 0; x < 4; x++) {
            g.fillStyle = (x + y) % 2 ? '#d3d8dd' : '#c8ced4';
            g.fillRect(x * 64 + 4, y * 64 + 4, 56, 56);
          }
        }
      }, 1, 1);
    },

    /* 方块小人 / 村民的脸 */
    face(skin, hair) {
      skin = skin || '#f6c99a'; hair = hair || '#5a3a22';
      return canvasTex(64, 64, (g) => {
        g.fillStyle = css(skin); g.fillRect(0, 0, 64, 64);
        g.fillStyle = css(hair); g.fillRect(0, 0, 64, 15);
        g.fillRect(0, 15, 6, 10); g.fillRect(58, 15, 6, 10);
        g.fillStyle = '#fff';
        g.beginPath(); g.ellipse(20, 32, 8, 9, 0, 0, 7); g.fill();
        g.beginPath(); g.ellipse(44, 32, 8, 9, 0, 0, 7); g.fill();
        g.fillStyle = '#3a2a1c';
        g.beginPath(); g.arc(21, 33, 4.6, 0, 7); g.fill();
        g.beginPath(); g.arc(45, 33, 4.6, 0, 7); g.fill();
        g.fillStyle = '#fff';
        g.beginPath(); g.arc(19, 31, 1.8, 0, 7); g.fill();
        g.beginPath(); g.arc(43, 31, 1.8, 0, 7); g.fill();
        g.fillStyle = 'rgba(255,140,140,.45)';
        g.beginPath(); g.ellipse(11, 45, 6, 4, 0, 0, 7); g.fill();
        g.beginPath(); g.ellipse(53, 45, 6, 4, 0, 0, 7); g.fill();
        g.strokeStyle = '#3a2a1c'; g.lineWidth = 3; g.lineCap = 'round';
        g.beginPath(); g.arc(32, 42, 11, 0.18 * Math.PI, 0.82 * Math.PI); g.stroke();
      });
    },

    /* 汉字 / 拼音卡片用的白纸 */
    paper(accent) {
      return canvasTex(128, 128, (g) => {
        g.fillStyle = '#fffaf0'; g.fillRect(0, 0, 128, 128);
        g.strokeStyle = css(accent || '#e2c9a0'); g.lineWidth = 6;
        g.strokeRect(6, 6, 116, 116);
        g.strokeStyle = 'rgba(190,160,120,.45)'; g.lineWidth = 2;
        g.beginPath(); g.moveTo(64, 14); g.lineTo(64, 114); g.stroke();
        g.beginPath(); g.moveTo(14, 64); g.lineTo(114, 64); g.stroke();
      });
    },

    /* 文字牌子（给 canvas 用，返回 canvas 元素） */
    labelCanvas(text, opts) {
      opts = opts || {};
      const pad = 14, fontSize = opts.fontSize || 40;
      const c = document.createElement('canvas');
      let g = c.getContext('2d');
      g.font = '700 ' + fontSize + 'px "Yuanti SC","PingFang SC",sans-serif';
      const w = Math.ceil(g.measureText(text).width) + pad * 2;
      c.width = w; c.height = fontSize + pad * 2;
      g = c.getContext('2d');
      g.font = '700 ' + fontSize + 'px "Yuanti SC","PingFang SC",sans-serif';
      g.textAlign = 'center'; g.textBaseline = 'middle';
      const r = 14;
      g.fillStyle = opts.bg || 'rgba(255,246,224,.94)';
      g.strokeStyle = opts.border || '#4a3421';
      g.lineWidth = 6;
      g.beginPath();
      g.moveTo(r, 3); g.lineTo(c.width - r, 3);
      g.quadraticCurveTo(c.width - 3, 3, c.width - 3, r);
      g.lineTo(c.width - 3, c.height - r);
      g.quadraticCurveTo(c.width - 3, c.height - 3, c.width - r, c.height - 3);
      g.lineTo(r, c.height - 3);
      g.quadraticCurveTo(3, c.height - 3, 3, c.height - r);
      g.lineTo(3, r);
      g.quadraticCurveTo(3, 3, r, 3);
      g.closePath(); g.fill(); g.stroke();
      g.fillStyle = opts.color || '#4a3421';
      g.fillText(text, c.width / 2, c.height / 2 + 2);
      return c;
    }
  });

  /* 生成一块永远面向相机的文字牌（Sprite） */
  Game.makeLabelSprite = function (text, worldHeight, opts) {
    const canvas = tex.labelCanvas(text, opts);
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({
      map: t, transparent: true, depthWrite: false
    }));
    const h = worldHeight || 0.6;
    sp.scale.set((canvas.width / canvas.height) * h, h, 1);
    sp.userData.text = text;
    sp.userData.height = h;
    return sp;
  };

  /* 换掉牌子上的文字 */
  Game.setLabelText = function (sprite, text, opts) {
    const canvas = tex.labelCanvas(text, opts);
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    if (sprite.material.map) sprite.material.map.dispose();
    sprite.material.map = t;
    sprite.material.needsUpdate = true;
    const h = sprite.userData.height || 0.6;
    sprite.scale.set((canvas.width / canvas.height) * h, h, 1);
    sprite.userData.text = text;
  };
})();

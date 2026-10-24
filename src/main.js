/* ===================================================================
   main.js
   启动器：加载关卡脚本 → 建 3D 世界 → 接上界面 → 跑主循环
   -------------------------------------------------------------------
   这里只做「装配」。玩法逻辑都在 src/levels/ 里，引擎能力都在 src/engine/ 里。
   新增关卡不需要改这个文件，只要改 src/levels/index.js。
   =================================================================== */
(function () {
  const Game = window.Game;
  const $ = (id) => document.getElementById(id);
  const UI = Game.UI;

  /* 启动时必须存在的引擎模块（少一个就在启动画面报错，方便排查） */
  const REQUIRED = [
    'Math', 'Events', 'log', 'CONST', 'Textures', 'Sfx', 'Particles', 'Save',
    'Blocks', 'Physics', 'Player', 'Environment', 'Fx', 'Queue', 'Cue', 'UI',
    'Interactions', 'Dialogue', 'Levels', 'Director'
  ];

  let renderer, scene, camera;
  let player, director, env, particles;
  let clock = null;

  /* ---------------- 启动画面 ---------------- */
  function bootMsg(text) { const el = $('bootMsg'); if (el) el.textContent = text; }
  function bootProgress(p) { const el = $('bootFill'); if (el) el.style.width = Math.round(p * 100) + '%'; }
  function bootError(text) {
    bootMsg('😢 ' + text);
    const tip = $('bootTip');
    if (tip) {
      tip.innerHTML = '如果一直这样，请按 F12 打开控制台看看红色报错，' +
        '或者用下面的命令重新打开：<br><code>cd 本文件夹 &amp;&amp; python3 -m http.server 8777</code>';
    }
    Game.log.error(text);
  }

  /* ---------------- 把关卡脚本一个个加载进来 ---------------- */
  function loadScripts(list, onProgress) {
    return new Promise(function (resolve, reject) {
      let i = 0;
      (function next() {
        if (i >= list.length) return resolve();
        const path = 'src/' + list[i++];
        const s = document.createElement('script');
        s.src = path;
        s.onload = function () { onProgress(i / list.length); next(); };
        s.onerror = function () { reject(new Error('文件加载失败：' + path + '（检查清单里的路径写对了吗）')); };
        document.body.appendChild(s);
      })();
    });
  }

  /* ---------------- 装配游戏 ---------------- */
  function initGame() {
    /* 渲染器 */
    try {
      renderer = new THREE.WebGLRenderer({ canvas: $('scene'), antialias: true });
    } catch (e) {
      bootError('你的浏览器好像不支持 3D 显示，换一个最新的 Chrome / Safari 试试吧～');
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    if ('outputColorSpace' in renderer) renderer.outputColorSpace = THREE.SRGBColorSpace;

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.1, 600);

    /* 界面 */
    UI.init();
    Game.Dialogue.init();

    /* 存档 */
    Game.Save.init();
    applyProfile({ silent: true });

    /* 世界 */
    env = Game.Environment.create(scene);
    particles = new Game.Particles(scene);
    Game.Fx.init(camera);

    player = new Game.Player({ scene: scene, camera: camera, canvas: $('scene') });
    director = Game.Director.init({
      scene: scene, camera: camera, player: player, save: Game.Save,
      particles: particles, env: env, fx: Game.Fx
    });

    director.showStart();
    bindUI();
    bindKeys();

    /* 收尾：关掉启动画面，显示开始界面 */
    $('bootScreen').classList.add('hidden');
    $('startScreen').classList.remove('hidden');
    renderProfiles();
    refreshSoundBtn();
    refreshMusicBtn();
    updatePauseInfo();

    clock = new THREE.Clock();
    requestAnimationFrame(frame);

    setupDebug();
    Game.log.info('方块小勇士 v' + Game.version + ' 启动完成，共 ' +
      Game.Levels.playable().length + ' 个关卡');
  }

  /* ---------------- 档案（小朋友） ---------------- */
  function applyProfile(opts) {
    opts = opts || {};
    const prof = Game.Save.profile();
    Game.Sfx.setEnabled(prof.settings.sound !== false);
    /* 背景音乐跟着存档里的设置走（换小朋友 / 导入存档都会走这里） */
    if (Game.Music) Game.Music.setEnabled(prof.settings.music !== false);
    UI.stats({ coins: Game.Save.game().coins, items: director ? director.itemCount() : null });
    if (prof.settings.sound !== false) Game.Sfx.init();
    if (!opts.silent) {
      UI.toast('👋 现在玩的是 <b>' + prof.name + '</b> 的存档', 'gold', 3000);
    }
  }

  function switchProfile(id) {
    if (Game.Save.profile().id === id) return;
    Game.Save.switchProfile(id);
    director.rebuild();
    applyProfile();
    renderProfiles();
    updatePauseInfo();
  }

  function renderProfiles() {
    const box = $('profileChips');
    if (!box) return;
    box.innerHTML = '';
    const activeId = Game.Save.profile().id;
    Game.Save.profiles().forEach(function (p) {
      const done = Game.Levels.playable().filter(function (d) {
        // 每个档案的通关数
        const slot = p.levels[d.id];
        return !!(slot && slot.done);
      }).length;
      const learned = (p.levels['hanzi-classroom'] &&
        p.levels['hanzi-classroom'].data && p.levels['hanzi-classroom'].data.learned || []).length;
      const chip = UI.h('button', {
        class: 'profile-chip' + (p.id === activeId ? ' active' : ''),
        onclick: function () { switchProfile(p.id); }
      }, UI.h('span', { class: 'pf-name', text: p.name }),
        UI.h('span', { class: 'pf-sub', text: '🚩 ' + done + ' 关' + (learned ? ' · 📚 ' + learned + ' 字' : '') }));
      box.appendChild(chip);
    });
  }

  /* 新建档案（带输入框的小弹窗） */
  function openNewProfilePanel() {
    const input = UI.h('input', {
      class: 'ui-input', type: 'text', maxlength: '8',
      placeholder: '小朋友的名字（比如：朵朵）'
    });
    const panel = UI.panel({
      chip: '👧 新建档案',
      title: '这是谁在玩呀？',
      closable: true,
      body: UI.h('div', {}, UI.h('p', { class: 'ui-text', text: '每个小朋友都有自己的进度、金币和认字记录，互不影响。' }), input),
      actions: [
        {
          label: '创建', primary: true, onClick: function (p) {
            const name = (input.value || '').trim() || ('小朋友' + (Game.Save.profiles().length + 1));
            Game.Save.createProfile(name);
            p.close();
            director.rebuild();
            applyProfile();
            renderProfiles();
            updatePauseInfo();
            UI.toast('👋 新档案 <b>' + name + '</b> 建好啦，从头开始冒险吧！', 'good', 3600);
          }
        },
        { label: '算了', kind: 'ghost', onClick: function (p) { p.close(); } }
      ],
      onMount: function () { setTimeout(function () { input.focus(); }, 60); }
    });
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') panel.close(); });
    return panel;
  }

  /* 档案管理面板（暂停菜单里用） */
  function openProfilesPanel() {
    const list = UI.h('div', { class: 'profile-list' });
    function render() {
      list.innerHTML = '';
      const activeId = Game.Save.profile().id;
      Game.Save.profiles().forEach(function (p) {
        const row = UI.h('div', { class: 'profile-row-item' + (p.id === activeId ? ' active' : '') },
          UI.h('span', { class: 'pf-name', text: p.name + (p.id === activeId ? '（正在玩）' : '') }),
          UI.h('span', { class: 'pf-actions' },
            UI.h('button', {
              class: 'btn small ' + (p.id === activeId ? 'ghost' : 'primary'),
              disabled: p.id === activeId,
              onclick: function () {
                switchProfile(p.id);
                row.classList.add('active');
                render();
              }
            }, p.id === activeId ? '当前' : '换成他玩'),
            UI.h('button', {
              class: 'btn small danger',
              disabled: Game.Save.profiles().length <= 1,
              onclick: function () {
                UI.confirm({
                  chip: '⚠️ 删除档案',
                  title: '删除「' + p.name + '」的进度？',
                  text: '删除以后，这个小朋友的金币、装备和认字记录都会没有了，不能恢复哦。',
                  okLabel: '删除', danger: true,
                  onOk: function () {
                    Game.Save.deleteProfile(p.id);
                    director.rebuild();
                    applyProfile();
                    renderProfiles();
                    render();
                    updatePauseInfo();
                  }
                });
              }
            }, '删除')
          )
        );
        list.appendChild(row);
      });
    }
    render();
    const panel = UI.panel({
      chip: '👨‍👩‍👧 小朋友档案',
      title: '谁在玩？',
      body: list,
      actions: [
        { label: '＋ 新建档案', primary: true, onClick: function (p) { p.close(); openNewProfilePanel(); } },
        { label: '关掉', kind: 'ghost', onClick: function (p) { p.close(); } }
      ]
    });
    return panel;
  }

  /* ---------------- 声音 / 导出 / 导入 / 重置 ---------------- */
  function soundOn() { return Game.Save.profile().settings.sound !== false; }
  function refreshSoundBtn() {
    const b = $('soundBtn');
    if (b) b.textContent = soundOn() ? '🔊 声音：开' : '🔇 声音：关';
  }
  function toggleSound() {
    const prof = Game.Save.profile();
    prof.settings.sound = !soundOn();
    Game.Sfx.setEnabled(prof.settings.sound);
    Game.Save.flush();
    refreshSoundBtn();
    if (prof.settings.sound) Game.Sfx.click();
  }

  /* ---------------- 背景音乐（v2.5.0） ----------------
     曲库在 src/engine/music.js，每关一首（没配就放 default），看 docs/背景音乐.md。 */
  function musicOn() { return Game.Save.profile().settings.music !== false; }
  function refreshMusicBtn() {
    const a = $('musicBtn');
    if (a) a.textContent = musicOn() ? '🎵 音乐：开' : '🎵 音乐：关';
    const b = $('pauseMusicBtn');
    if (b) b.textContent = '🎵 背景音乐：' + (musicOn() ? '开' : '关');
  }
  /* 用户点过按钮之后才能出声：先 init()（建 AudioContext）再 play() */
  function startMusic() {
    if (!Game.Music) return;
    Game.Music.init();
    Game.Music.play();
  }
  function toggleMusic() {
    const prof = Game.Save.profile();
    prof.settings.music = !musicOn();
    Game.Music.setEnabled(prof.settings.music);
    if (prof.settings.music) startMusic();
    Game.Save.flush();
    refreshMusicBtn();
    if (prof.settings.music) Game.Sfx.click();
  }

  function importSave() {
    $('importFile').click();
  }
  function onImportFile(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function () {
      const res = Game.Save.importJSON(String(reader.result));
      if (!res.ok) { UI.toast('😢 ' + res.msg, 'bad', 4000); return; }
      director.rebuild();
      applyProfile({ silent: true });
      renderProfiles();
      updatePauseInfo();
      UI.toast('📥 存档导入成功！', 'good', 3200);
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  function resetGame() {
    UI.confirm({
      chip: '⚠️ 重新开始',
      title: '清空「' + Game.Save.profile().name + '」的进度？',
      text: '金币、装备、关卡进度和认字记录都会清空，从第 1 关重新开始。',
      okLabel: '清空重来', danger: true,
      onOk: function () {
        Game.Save.resetProfile();
        director.rebuild();
        applyProfile({ silent: true });
        renderProfiles();
        updatePauseInfo();
        UI.toast('🌱 新的冒险开始啦！', 'good', 3000);
      }
    });
  }

  /* ---------------- 暂停菜单 ---------------- */
  function openPause() {
    updatePauseInfo();
    $('pauseModal').classList.remove('hidden');
    director.pause();
  }
  function closePause() {
    $('pauseModal').classList.add('hidden');
    director.resume();
  }
  function updatePauseInfo() {
    const el = $('pauseInfo');
    if (!el) return;
    const ctx = director.active;
    const done = Game.Levels.doneCount(Game.Save);
    el.innerHTML =
      '<div>👤 小朋友：<b>' + Game.Save.profile().name + '</b></div>' +
      '<div>📍 现在在：<b>' + (ctx ? (ctx.def.subtitle ? ctx.def.subtitle + ' · ' : '') + ctx.def.name : '—') + '</b></div>' +
      '<div>🪙 金币：<b>' + Game.Save.game().coins + '</b>' +
      '　🚩 已通关：<b>' + done + ' / ' + Game.Levels.playable().length + '</b></div>';
  }

  /* ---------------- 关卡一览 ---------------- */
  function openLevelsPanel(fromStart) {
    const rows = UI.h('div', { class: 'level-list' });
    Game.Levels.playable().forEach(function (d) {
      const st = Game.Levels.statusOf(d.id, Game.Save);
      const tag = st === 'done' ? '✅ 已通关' : (st === 'locked' ? '🔒 还没开' : '🚪 可以进');
      rows.appendChild(UI.h('div', { class: 'level-row-item' },
        UI.h('span', { class: 'lv-icon', text: d.icon }),
        UI.h('span', { class: 'lv-text' },
          UI.h('b', { text: (d.subtitle ? d.subtitle + ' · ' : '') + d.name }),
          UI.h('small', { text: (d.hint || '').replace(/^[^\u4e00-\u9fa5A-Za-z]*/, '') || '新关卡' })),
        UI.h('span', { class: 'lv-tag' + (st === 'locked' ? ' locked' : ''), text: tag }),
        UI.h('button', {
          class: 'btn small ' + (st === 'locked' ? 'ghost' : 'primary'),
          text: st === 'locked' ? '未解锁' : (st === 'done' ? '再玩一次' : '进去玩'),
          onclick: function () {
            if (st === 'locked') {
              const prev = Game.Levels.prev(d.id);
              UI.toast('🔒 先通关【' + (prev ? prev.name : '前面的关卡') + '】吧！', 'bad', 3000);
              return;
            }
            UI.closeAll();
            gotoLevel(d.id, fromStart);
          }
        })));
    });
    UI.panel({
      chip: '🗺 关卡一览',
      title: '方块小镇的冒险地图',
      wide: true,
      body: rows,
      actions: [{ label: '知道啦', primary: true, onClick: function (p) { p.close(); } }]
    });
  }

  function gotoLevel(id, fromStart) {
    if (fromStart) {
      $('startScreen').classList.add('hidden');
      director.begin();
      startMusic();     /* 从「关卡一览」直接进来也要有音乐（点击 = 用户手势） */
    }
    director.go(id, { from: Game.Levels.hub() && Game.Levels.hub().id });
    updatePauseInfo();
  }

  /* ---------------- 事件绑定 ---------------- */
  function bindUI() {
    $('startBtn').addEventListener('click', function () {
      $('startScreen').classList.add('hidden');
      director.begin();
      Game.Sfx.init();
      Game.Sfx.levelUp();
      startMusic();
      const save = Game.Save;
      if (Game.Levels.doneCount(save) || save.game().coins) {
        UI.toast('🌟 进度已恢复，继续冒险吧！', 'gold', 2800);
      } else {
        /* 用 'level-hint' 这个 key：会顶掉广场自己那条提示，屏幕上只有一条，不打架 */
        UI.toast('👉 广场上的蓝色传送门就是第 1 关【谜语森林】，走进按 E 吧！', 'gold', 4600, 'level-hint');
      }
      if (player.touchDevice) {
        setTimeout(function () {
          UI.toast('👈 左边摇杆走路 ｜ 右边滑动转视角 ｜ 右下角是 跳 和 E', 'good', 5200);
        }, 900);
      }
    });

    $('newProfileBtn').addEventListener('click', openNewProfilePanel);
    $('soundBtn').addEventListener('click', toggleSound);
    $('musicBtn').addEventListener('click', toggleMusic);
    $('exportBtn').addEventListener('click', function () { Game.Save.download(); });
    $('importBtn').addEventListener('click', importSave);
    $('levelsBtn').addEventListener('click', function () { openLevelsPanel(true); });
    $('importFile').addEventListener('change', onImportFile);

    $('pauseBtn').addEventListener('click', openPause);
    $('resumeBtn').addEventListener('click', closePause);
    $('pauseClose').addEventListener('click', closePause);
    $('hubBtn').addEventListener('click', function () {
      closePause();
      director.goHub();
      updatePauseInfo();
    });
    $('switchBtn').addEventListener('click', openProfilesPanel);
    $('pauseMusicBtn').addEventListener('click', toggleMusic);
    $('pauseResetBtn').addEventListener('click', resetGame);
    $('pauseHelpBtn').addEventListener('click', function () {
      UI.message({
        chip: '⌨️ 操作说明',
        html: '<p class="ui-text"><b>W A S D</b> / 方向键 移动<br>' +
          '<b>空格</b> 跳跃<br><b>鼠标拖拽</b> 转视角，<b>滚轮</b> 缩放，双击锁定鼠标<br>' +
          '<b>E</b> 交互（说话 / 读石碑 / 开宝箱 / 进传送门）<br>' +
          '<b>F</b> 挥武器（第 4 关「圆形擂台」里打对手用，武器越好打得越狠）<br>' +
          '<b>🎵 背景音乐</b> 在暂停菜单里开 / 关（开始界面也有一个按钮）<br>' +
          '<b>Esc</b> 暂停菜单</p>' +
          '<p class="ui-text">头上有个黄色箭头，它一直指着你现在该去的地方 👆</p>'
      });
    });
  }

  function bindKeys() {
    window.addEventListener('keydown', function (e) {
      if (e.code === 'Escape') {
        if (Game.Dialogue.isOpen()) { Game.Dialogue.close(); return; }
        if (UI.anyOpen()) { UI.closeTop(); return; }
        if (director.state === 'paused') closePause();
        else if (director.state === 'play') openPause();
        return;
      }
      /* 对话框：E / 空格 / 回车 都是「继续」 */
      if (Game.Dialogue.isOpen() &&
        (e.code === 'KeyE' || e.code === 'Space' || e.code === 'Enter')) {
        e.preventDefault();
        Game.Dialogue.next();
      }
    });

    window.addEventListener('resize', function () {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  /* ---------------- 主循环 ---------------- */
  function frame() {
    requestAnimationFrame(frame);
    const raw = Math.min(clock.getDelta(), 0.05);
    const time = clock.getElapsedTime();
    const dt = raw * Game.Fx.timeScale;      // 慢动作靠这里

    director.update(dt, time);
    particles.update(dt);
    player.animate(dt, time);
    renderer.render(scene, camera);
  }

  /* ---------------- 调试小工具（浏览器控制台，给大人用） ----------------
     Game.debug.go('riddle-forest')     直接跳到某关
     Game.debug.hub()                   回广场
     Game.debug.teleport(0, -20)        把玩家挪过去
     Game.debug.state()                 现在在哪 / 目标是什么
     Game.debug.ctx('chest-valley')     拿到某关的运行上下文（可以看数据）
     --------------------------------------------------------------------- */
  function setupDebug() {
    Game.debug = {
      version: Game.version,
      game: Game,
      director: director,
      player: player,
      save: Game.Save,
      levels: Game.Levels,
      go: function (id) { return director.go(id); },
      hub: function () { return director.goHub(); },
      goHub: function () { return director.goHub(); },
      teleport: function (x, z, y) {
        player.teleport(x, z, y);
        return player.pos.toArray();
      },
      pos: function () { return player.pos.toArray().map(function (v) { return +v.toFixed(2); }); },
      state: function () { return director.snapshot(); },
      ctx: function (id) {
        const def = Game.Levels.get(id);
        return def ? director.context(def) : null;
      },
      /* 走到最近的可交互物旁边并触发它（自动测试用） */
      use: function () { return director.active && director.active.interactions.use(); },
      nearest: function () {
        const it = director.active && director.active.interactions.nearest;
        return it ? { label: it.label, kind: it.kind, pos: it.pos } : null;
      },
      coins: function (n) { return Game.Save.addCoins(n === undefined ? 100 : n); },
      /* 题库 / 谜语（调试用） */
      riddles: function () { return Game.riddleStats(); },
      commonsense: function () { return Game.commonsenseStats(); },
      banks: function () { return Object.keys(Game.BANK_DATA).map(function (b) { return Game.bankStats(b); }); },
      pick: function (n, opts) { return Game.pickQuestions(n === undefined ? 6 : n, opts); },
      /* 当前这一轮石碑上的题目（进第 1 关之后用） */
      round: function () {
        const ctx = director.active;
        const round = ctx && ctx.data && ctx.data.round;
        return round ? round.map(function (r) { return r.key + ' ' + r.a; }) : null;
      },
      unlockAll: function () {
        Game.Levels.playable().forEach(function (d) { Game.Save.level(d.id).setDone(true); });
        director.rebuild();
        return true;
      }
    };
  }

  /* ---------------- 走起 ---------------- */
  (function boot() {
    const missing = REQUIRED.filter(function (k) { return !Game[k]; });
    if (missing.length) {
      bootError('缺少引擎模块：' + missing.join('、') + '（检查 index.html 的 script 顺序）');
      return;
    }
    const manifest = Game.LEVELS || [];
    if (!manifest.length) {
      bootError('src/levels/index.js 里的关卡清单是空的');
      return;
    }
    /* 先加载题库（谜语等外部数据），再加载关卡脚本 */
    const bankFiles = (Game.BANKS || []).slice();
    const files = bankFiles.slice();
    manifest.forEach(function (entry) {
      (entry.files || []).forEach(function (f) { files.push(f); });
    });
    bootMsg('正在加载 ' + manifest.length + ' 个关卡' +
      (bankFiles.length ? ' + ' + bankFiles.length + ' 个题库文件' : '') + '…');
    loadScripts(files, bootProgress).then(function () {
      if (!Game.Levels.hub()) {
        bootError('关卡清单里少了一个 isHub: true 的中央广场');
        return;
      }
      if (!Game.RIDDLES || !Game.RIDDLES.length) {
        Game.log.warn('题库是空的：检查 src/content/banks/index.js 里的清单');
      }
      bootMsg('正在搭建 3D 世界…');
      bootProgress(1);
      initGame();
    }).catch(function (err) {
      bootError(err.message || String(err));
    });
  })();
})();

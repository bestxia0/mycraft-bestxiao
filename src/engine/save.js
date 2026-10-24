/* ===================================================================
   engine/save.js
   存档系统（v3）
     · 支持多个小朋友的存档（profile），各有自己的名字和进度
     · 关卡数据按 levelId 分区保存，关卡自己决定存什么
     · 版本号 + 迁移函数（老存档会自动升级，不会丢进度）
     · 导出 / 导入 JSON，方便备份和换电脑
   -------------------------------------------------------------------
   等级数据用法（在关卡里）：
     ctx.save.get('solved', [])      读
     ctx.save.set('solved', list)    写
     ctx.save.pushUnique('chests', 3) 往数组里加不重复的值
     ctx.save.flag('done')           读布尔
     ctx.save.setFlag('opened', true)
   =================================================================== */
(function () {
  const Game = window.Game;
  const STORAGE_KEY = 'block-hero.saves.v3';
  const LEGACY_KEY = 'block-hero-save-v1';
  const SCHEMA_VERSION = 3;

  function now() { return Date.now(); }
  function uid(prefix) {
    return (prefix || 'p') + Math.random().toString(36).slice(2, 8) + now().toString(36).slice(-3);
  }

  function emptyProfile(name) {
    return {
      id: uid('p'),
      name: name || '小朋友',
      createdAt: now(),
      updatedAt: now(),
      global: { coins: 0, flags: {} },
      inventory: { items: {} },
      levels: {},                 // { levelId: { done, data:{}, updatedAt } }
      settings: { sound: true, music: true }
    };
  }

  function emptyRoot() {
    const p = emptyProfile('小朋友');
    return {
      version: SCHEMA_VERSION,
      activeProfile: p.id,
      profiles: { [p.id]: p }
    };
  }

  /* ---------------- 旧存档迁移 ---------------- */
  /* v1：{ riddles, chests, items, coins, level1Done, legendary } */
  function migrateFromV1() {
    let raw = null;
    try { raw = JSON.parse(localStorage.getItem(LEGACY_KEY) || 'null'); } catch (e) { raw = null; }
    if (!raw) return null;
    const root = emptyRoot();
    const prof = root.profiles[root.activeProfile];
    prof.name = '小朋友（旧存档）';
    prof.global.coins = raw.coins || 0;
    prof.inventory.items = raw.items || {};
    prof.levels['riddle-forest'] = {
      done: !!raw.level1Done,
      data: { solved: raw.riddles || [] },
      updatedAt: now()
    };
    prof.levels['chest-valley'] = {
      done: !!raw.legendary,
      data: {
        chests: raw.chests || [],
        loot: raw.loot || null,
        legendary: !!raw.legendary
      },
      updatedAt: now()
    };
    return root;
  }

  /* ---------------- 存档管理器 ---------------- */
  const Save = (Game.Save = {
    root: null,
    _timer: null,
    _profileListeners: [],

    init() {
      let data = null;
      try { data = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); } catch (e) { data = null; }
      if (!data) data = migrateFromV1() || emptyRoot();
      this.root = this._migrate(data);
      if (!this.root.profiles[this.root.activeProfile]) {
        this.root.activeProfile = Object.keys(this.root.profiles)[0];
      }
      this.flush();
      Game.Events.emit('save:ready', this.root);
      return this.root;
    },

    /* 以后存档结构升级，就在这里加一个 if (data.version < N) ... */
    _migrate(data) {
      if (!data.version) data.version = SCHEMA_VERSION;
      if (data.version < 3) {
        // 极老的存档：尽量保留能保留的
        const merged = emptyRoot();
        merged.profiles[merged.activeProfile].global.coins = data.coins || 0;
        merged.profiles[merged.activeProfile].inventory.items = data.items || {};
        data = merged;
      }
      data.version = SCHEMA_VERSION;
      Object.keys(data.profiles).forEach((id) => {
        const p = data.profiles[id];
        p.global = p.global || { coins: 0, flags: {} };
        p.global.flags = p.global.flags || {};
        p.inventory = p.inventory || { items: {} };
        p.inventory.items = p.inventory.items || {};
        p.levels = p.levels || {};
        p.settings = p.settings || {};
        if (p.settings.sound === undefined) p.settings.sound = true;
        if (p.settings.music === undefined) p.settings.music = true;   // v2.5.0 新增：背景音乐开关
      });
      return data;
    },

    /* ---------------- 当前档案 ---------------- */
    profile() { return this.root.profiles[this.root.activeProfile]; },

    profiles() {
      const list = Object.keys(this.root.profiles).map((id) => this.root.profiles[id]);
      return list.sort((a, b) => a.createdAt - b.createdAt);
    },

    createProfile(name) {
      const p = emptyProfile(name || ('小朋友' + (this.profiles().length + 1)));
      this.root.profiles[p.id] = p;
      this.root.activeProfile = p.id;
      this.flush();
      Game.Events.emit('save:profile', p);
      return p;
    },

    switchProfile(id) {
      if (!this.root.profiles[id]) return false;
      this.root.activeProfile = id;
      this.flush();
      Game.Events.emit('save:profile', this.profile());
      return true;
    },

    renameProfile(id, name) {
      const p = this.root.profiles[id] || this.profile();
      p.name = name;
      this.flush();
    },

    deleteProfile(id) {
      if (Object.keys(this.root.profiles).length <= 1) return false;
      delete this.root.profiles[id];
      if (this.root.activeProfile === id) {
        this.root.activeProfile = Object.keys(this.root.profiles)[0];
      }
      this.flush();
      Game.Events.emit('save:profile', this.profile());
      return true;
    },

    /* 清空当前档案的进度（保留档案本身） */
    resetProfile() {
      const keepName = this.profile().name;
      const fresh = emptyProfile(keepName);
      fresh.id = this.root.activeProfile;
      this.root.profiles[this.root.activeProfile] = fresh;
      this.flush();
      Game.Events.emit('save:reset', fresh);
    },

    /* ---------------- 全局数据（金币等） ---------------- */
    game() {
      const g = this.profile().global;
      g.flags = g.flags || {};
      return g;
    },

    addCoins(n) {
      this.game().coins += n;
      this.commit();
      Game.Events.emit('save:coins', this.game().coins);
      return this.game().coins;
    },

    /* ---------------- 背包 ---------------- */
    inventory() {
      const inv = this.profile().inventory;
      inv.items = inv.items || {};
      return inv.items;
    },

    /* ---------------- 关卡分区 ---------------- */
    level(id) {
      const prof = this.profile();
      if (!prof.levels[id]) prof.levels[id] = { done: false, data: {}, updatedAt: now() };
      const slot = prof.levels[id];
      slot.data = slot.data || {};
      const self = this;
      return {
        id,
        raw: slot,
        get done() { return !!slot.done; },
        setDone(v) { slot.done = !!v; slot.updatedAt = now(); self.commit(); },
        get(key, def) { return slot.data[key] === undefined ? def : slot.data[key]; },
        set(key, value) { slot.data[key] = value; slot.updatedAt = now(); self.commit(); },
        flag(key) { return !!slot.data[key]; },
        setFlag(key, v) { slot.data[key] = !!v; slot.updatedAt = now(); self.commit(); },
        list(key) { return slot.data[key] || (slot.data[key] = []); },
        pushUnique(key, value) {
          const arr = slot.data[key] || (slot.data[key] = []);
          if (arr.indexOf(value) < 0) { arr.push(value); self.commit(); return true; }
          return false;
        },
        has(key, value) { return (slot.data[key] || []).indexOf(value) >= 0; },
        addNumber(key, n, def) {
          const cur = slot.data[key] === undefined ? (def || 0) : slot.data[key];
          slot.data[key] = cur + n;
          self.commit();
          return slot.data[key];
        },
        reset() { slot.data = {}; slot.done = false; slot.updatedAt = now(); self.commit(); }
      };
    },

    /* 是否所有关卡都完成（不给 unlock 规则用，留给外部判断） */
    isLevelDone(id) {
      const slot = this.profile().levels[id];
      return !!(slot && slot.done);
    },

    /* ---------------- 保存 ---------------- */
    commit() {
      this.profile().updatedAt = now();
      if (this._timer) return;
      this._timer = setTimeout(() => {
        this._timer = null;
        this.flush();
      }, 260);
    },

    flush() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.root));
      } catch (e) {
        Game.log.warn('存档写入失败（可能是浏览器隐私模式）：', e && e.name);
      }
    },

    /* ---------------- 导入 / 导出 ---------------- */
    exportJSON() {
      return JSON.stringify(this.root, null, 2);
    },

    importJSON(text) {
      let data;
      try { data = JSON.parse(text); } catch (e) { return { ok: false, msg: '文件内容不是有效的存档' }; }
      if (!data || !data.profiles) return { ok: false, msg: '这不是方块小勇士的存档文件' };
      this.root = this._migrate(data);
      if (!this.root.profiles[this.root.activeProfile]) {
        this.root.activeProfile = Object.keys(this.root.profiles)[0];
      }
      this.flush();
      Game.Events.emit('save:profile', this.profile());
      return { ok: true, msg: '导入成功' };
    },

    /* 下载存档文件（浏览器里点一下就能备份） */
    download() {
      const name = '方块小勇士存档-' + this.profile().name + '.json';
      const blob = new Blob([this.exportJSON()], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = name;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    }
  });
})();

/* ===================================================================
   engine/ui.js
   界面系统：HUD 任务条 / 金币 / 进度 + 提示气泡 + 通用弹窗
   -------------------------------------------------------------------
   ★ 关卡作者用这里的几个方法就够了 ★

     ctx.toast('🍎 找到 1 个宝箱！', 'good')      // 右上角飘一条
     const p = ctx.panel({                        // 弹一个面板
       chip: '🧩 拼图', title: '把方块放回原位',
       html: '<p>提示文字</p>',
       actions: [{ label:'我知道了', primary:true, onClick(close){ close(); } }]
     });
     p.setHTML('<p>换掉里面的内容</p>')           // 面板不关，只换内容
     p.close()

   想完全自己做界面（像谜语那样的选项按钮），就用 onMount 拿到 DOM：
     ctx.panel({ chip:'❓ 谜语', onMount(root, panel){ ... root.appendChild(...) } })
   =================================================================== */
(function () {
  const Game = window.Game;
  const $ = (id) => document.getElementById(id);

  /* 生成 DOM 的小工具：UI.h('button', {class:'btn', onclick:fn}, '文字') */
  function h(tag, attrs) {
    const el = document.createElement(tag);
    attrs = attrs || {};
    Object.keys(attrs).forEach(function (k) {
      const v = attrs[k];
      if (v === null || v === undefined || v === false) return;
      if (k === 'class') el.className = v;
      else if (k === 'html') el.innerHTML = v;
      else if (k === 'text') el.textContent = v;
      else if (k === 'style') el.style.cssText = v;
      else if (k.slice(0, 2) === 'on' && typeof v === 'function') el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v);
    });
    for (let i = 2; i < arguments.length; i++) {
      const child = arguments[i];
      if (child === null || child === undefined) continue;
      el.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
    }
    return el;
  }

  const UI = (Game.UI = {
    h: h,
    D: {},
    panelStack: [],
    _objCache: { text: '', progress: '' },
    _zoneCache: '',
    _battleCache: '',
    _battleAliveCache: '',

    init() {
      const D = this.D = {
        hud: $('hud'),
        questTitle: $('questTitle'),
        questText: $('questText'),
        coinCount: $('coinCount'),
        itemStat: $('itemStat'),
        itemCount: $('itemCount'),
        progressStat: $('progressStat'),
        progressText: $('progressText'),
        battleHud: $('battleHud'),
        battleTime: $('battleTime'),
        battleHp: $('battleHp'),
        battleAlive: $('battleAlive'),
        zoneTag: $('zoneTag'),
        prompt: $('prompt'),
        toasts: $('toasts'),
        modalRoot: $('modalRoot')
      };
      return this;
    },

    /* ---------------- HUD ---------------- */
    showHUD(v) {
      if (this.D.hud) this.D.hud.classList.toggle('hidden', !v);
    },

    /* 任务条：{ text, progress:{icon,label,value,max} } */
    objective(o) {
      o = o || {};
      const text = o.text || '';
      /* 避免同一句话反复写 DOM（每帧都会调用） */
      if (text !== this._objCache.text && this.D.questText) {
        this._objCache.text = text;
        this.D.questText.textContent = text;
      }
      if (this.D.questTitle && o.title && this.D.questTitle.textContent !== o.title) {
        this.D.questTitle.textContent = o.title;
      }
      const pr = o.progress;
      const key = pr ? (pr.label + ':' + pr.value + '/' + pr.max) : '';
      if (key !== this._objCache.progress && this.D.progressStat) {
        this._objCache.progress = key;
        if (pr) {
          this.D.progressStat.classList.remove('hidden');
          this.D.progressText.textContent = pr.label + ' ' + pr.value + ' / ' + pr.max;
        } else {
          this.D.progressStat.classList.add('hidden');
        }
      }
    },

    stats(s) {
      s = s || {};
      if (this.D.coinCount && s.coins !== undefined) this.D.coinCount.textContent = s.coins;
      if (this.D.itemStat) {
        if (s.items === undefined || s.items === null) {
          this.D.itemStat.classList.add('hidden');
        } else {
          this.D.itemStat.classList.remove('hidden');
          this.D.itemCount.textContent = s.items;
        }
      }
    },

    zone(text) {
      if (!this.D.zoneTag || text === this._zoneCache) return;
      this._zoneCache = text;
      const el = this.D.zoneTag;
      el.textContent = text;
      el.style.opacity = '0';
      setTimeout(function () { el.style.opacity = '1'; }, 60);
    },

    /* 顶部大计时条（擂台关 / 沙漠关都用）：
         Game.UI.battle({ time: 512, hp: 80, hpMax: 100, alive: 3, total: 4 })  擂台关
         Game.UI.battle({ time: 120 })                                          只显示倒计时
         Game.UI.battle(null)                                                   隐藏
       血条只有传了 hpMax 才显示；「对手 N」只有传了 alive 才显示
       （不传 = 藏起来，免得上一关的「对手 4」留在屏幕上）。 */
    battle(o) {
      const D = this.D;
      if (!D.battleHud) return;
      /* 开着计时条的时候，把「第 4 关 · 圆形擂台」那条标签藏起来，两个都在顶部中间会打架 */
      if (D.hud) D.hud.classList.toggle('battle-on', !!o);
      if (!o) { D.battleHud.classList.add('hidden'); return; }
      D.battleHud.classList.remove('hidden');

      const t = Math.max(0, Math.ceil(o.time || 0));
      const mm = String(Math.floor(t / 60)).padStart(2, '0');
      const ss = String(t % 60).padStart(2, '0');
      const text = mm + ':' + ss;
      if (text !== this._battleCache) {
        this._battleCache = text;
        D.battleTime.textContent = text;
        D.battleTime.classList.toggle('urgent', t <= 30);
      }
      const bar = D.battleHud.querySelector('.battle-bar');
      if (bar) bar.classList.toggle('hidden', !o.hpMax);
      if (D.battleHp && o.hpMax) {
        const r = Game.clamp((o.hp || 0) / o.hpMax, 0, 1);
        D.battleHp.style.width = Math.round(r * 100) + '%';
        D.battleHp.style.background = r > 0.5 ? '#5ddc73' : (r > 0.25 ? '#ffd447' : '#ff6b6b');
      }
      const hasAlive = o.alive !== undefined && o.alive !== null;
      if (D.battleAlive) D.battleAlive.classList.toggle('hidden', !hasAlive);
      if (D.battleAlive && hasAlive) {
        const label = '对手 ' + o.alive + (o.total ? ' / ' + o.total : '');
        if (label !== this._battleAliveCache) {
          this._battleAliveCache = label;
          D.battleAlive.textContent = label;
        }
      }
    },

    /* 屏幕下方的「按 E …」提示 */
    prompt(text) {
      const el = this.D.prompt;
      if (!el) return;
      if (!text) { el.classList.add('hidden'); return; }
      el.classList.remove('hidden');
      el.innerHTML = text.replace(/\bE\b/, '<b>E</b>');
    },

    /* ---------------- 提示气泡 ---------------- */
    /* kind: good / bad / gold / 空;  key: 同类提示用同一个 key，新的会顶掉旧的（不会叠一堆） */
    toast(html, kind, ms, key) {
      if (!this.D.toasts) return;
      if (key) {
        const old = this.D.toasts.querySelector('.toast[data-key="' + key + '"]');
        if (old) old.remove();
      }
      const box = h('div', {
        class: 'toast' + (kind ? ' ' + kind : ''),
        'data-key': key || null,
        html: html
      });
      this.D.toasts.appendChild(box);
      setTimeout(function () {
        box.style.transition = 'opacity .3s';
        box.style.opacity = '0';
        setTimeout(function () { box.remove(); }, 320);
      }, ms || 2600);
      while (this.D.toasts.children.length > 6) this.D.toasts.firstChild.remove();
    },

    /* ---------------- 通用弹窗 ----------------
       opts = {
         chip, title, html, body(DOM), wide, closable, actions:[{label,kind,primary,onClick}],
         onMount(rootEl, panel), onClose(panel)
       } */
    panel(opts) {
      opts = opts || {};
      const root = this.D.modalRoot;
      if (!root) { Game.log.warn('页面缺少 #modalRoot，弹窗打不开'); return null; }
      const overlay = h('div', { class: 'layer overlay' });
      const box = h('div', { class: 'panel modal-panel' + (opts.wide ? ' wide' : '') });
      overlay.appendChild(box);

      const head = h('div', { class: 'panel-head' });
      head.appendChild(h('span', { class: 'chip', html: opts.chip || '' }));
      box.appendChild(head);

      if (opts.closable !== false) {
        head.appendChild(h('button', { class: 'icon-btn', text: '✕' }));
      }
      if (opts.title) box.appendChild(h('h2', { class: 'panel-title', text: opts.title }));

      const bodyEl = h('div', { class: 'ui-body' });
      box.appendChild(bodyEl);
      const foot = h('div', { class: 'modal-foot ' + (opts.actions && opts.actions.length > 1 ? 'column' : 'center') });
      box.appendChild(foot);
      if (!opts.actions || !opts.actions.length) foot.style.display = 'none';

      const self = this;
      let closed = false;

      const panel = {
        overlay: overlay,
        box: box,
        body: bodyEl,
        foot: foot,
        id: opts.id || ('panel' + (this.panelStack.length + 1)),
        setHTML(html) { bodyEl.innerHTML = html; return panel; },
        append(child) { bodyEl.appendChild(child); return panel; },
        setTitle(t) {
          let el = box.querySelector('.panel-title');
          if (!el) { el = h('h2', { class: 'panel-title' }); box.insertBefore(el, bodyEl); }
          el.textContent = t;
          return panel;
        },
        setChip(t) {
          const c = box.querySelector('.chip');
          if (c) c.innerHTML = t;
          return panel;
        },
        setActions(list) {
          foot.innerHTML = '';
          (list || []).forEach(function (a) {
            const btn = h('button', {
              class: 'btn' + (a.primary ? ' primary' : '') + (a.kind ? ' ' + a.kind : '') +
                (a.small ? ' small' : '')
            }, a.label || '确定');
            btn.disabled = !!a.disabled;
            btn.addEventListener('click', function () {
              Game.Sfx.click();
              if (a.onClick) a.onClick(panel);
              else panel.close();
            });
            foot.appendChild(btn);
          });
          foot.style.display = (list && list.length) ? '' : 'none';
          return panel;
        },
        close() {
          if (closed) return;
          closed = true;
          overlay.remove();
          const i = self.panelStack.indexOf(panel);
          if (i >= 0) self.panelStack.splice(i, 1);
          if (opts.onClose) opts.onClose(panel);
        }
      };

      if (opts.html) bodyEl.innerHTML = opts.html;
      if (opts.body) bodyEl.appendChild(opts.body);
      if (opts.actions) panel.setActions(opts.actions);
      const closeBtn = head.querySelector('.icon-btn');
      if (closeBtn) closeBtn.addEventListener('click', function () { Game.Sfx.click(); panel.close(); });

      root.appendChild(overlay);
      this.panelStack.push(panel);
      if (opts.onMount) opts.onMount(bodyEl, panel);
      return panel;
    },

    /* 有没有弹窗挡着（挡着就暂停玩家操作） */
    anyOpen() { return this.panelStack.length > 0; },
    topPanel() { return this.panelStack[this.panelStack.length - 1] || null; },

    closeTop() {
      const p = this.topPanel();
      if (p && p.closable !== false) { p.close(); return true; }
      if (p) { p.close(); return true; }
      return false;
    },

    closeAll() {
      while (this.panelStack.length) this.panelStack[this.panelStack.length - 1].close();
    },

    /* ---------------- 常用面板 ---------------- */
    /* 关卡通关结算 */
    levelResult(o) {
      o = o || {};
      return this.panel({
        chip: o.chip || '🎊 关卡通过',
        title: o.title || '太棒啦！',
        closable: false,
        html: o.html || '',
        actions: o.actions || [{ label: '回广场', primary: true, onClick: (p) => p.close() }]
      });
    },

    /* 收到一件装备 / 一个奖励 */
    reward(o) {
      o = o || {};
      const rarity = o.rarity || 1;
      return this.panel({
        chip: o.chip || '✨ 收获',
        closable: false,
        html: '<div class="reward-card rar' + rarity + '">' +
          '<div class="emoji">' + (o.emoji || '🎁') + '</div>' +
          '<div class="name">' + (o.name || '神秘奖励') + '</div>' +
          '<div class="rar">' + (o.sub || '') + '</div></div>',
        actions: [{ label: o.okLabel || '收下啦', primary: true, onClick: (p) => p.close() }]
      });
    },

    /* 简单的确认框 */
    confirm(o) {
      o = o || {};
      return this.panel({
        chip: o.chip || '❓ 请确认',
        title: o.title || '',
        html: '<p class="ui-text">' + (o.text || '') + '</p>',
        actions: [
          { label: o.okLabel || '确定', primary: !o.danger, kind: o.danger ? 'danger' : '', onClick: function (p) { p.close(); if (o.onOk) o.onOk(); } },
          { label: o.cancelLabel || '先不要', kind: 'ghost', onClick: (p) => p.close() }
        ]
      });
    },

    /* 一段文字说明 */
    message(o) {
      o = o || {};
      return this.panel({
        chip: o.chip || '💬 提示',
        title: o.title || '',
        html: o.html || ('<p class="ui-text">' + (o.text || '') + '</p>'),
        actions: [{ label: o.okLabel || '知道啦', primary: true, onClick: (p) => p.close() }]
      });
    },

    /* 选项按钮组（谜语、汉字测验都用得上）
       返回一个 <div class="options">，点某个选项会回调 onPick(text, button) */
    optionButtons(options, onPick) {
      const box = h('div', { class: 'options' });
      (options || []).forEach(function (opt) {
        const b = h('button', { class: 'option', text: opt });
        b.addEventListener('click', function () { onPick(opt, b); });
        box.appendChild(b);
      });
      return box;
    },

    /* 把一个按钮组变成「只能点一次 + 标出对错」的样子 */
    lockOptions(box, correct) {
      Array.prototype.forEach.call(box.children, function (c) {
        c.disabled = true;
        if (correct !== undefined && c.textContent === correct) c.classList.add('right');
      });
    }
  });
})();

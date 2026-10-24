/* ===================================================================
   engine/dialogue.js
   NPC 对话框：一句一句打字机效果显示，按 E / 空格 / 点一下 继续
   -------------------------------------------------------------------
   关卡作者用法：
     ctx.say(['第一句话', '第二句话'], { name:'村长爷爷', emoji:'👴' })
     ctx.say('只有一句也可以')
   =================================================================== */
(function () {
  const Game = window.Game;

  const Dialogue = (Game.Dialogue = {
    el: null,
    nameEl: null,
    textEl: null,
    tipEl: null,
    lines: [],
    index: 0,
    shown: '',
    full: '',
    typing: false,
    _acc: 0,
    open: false,
    onDone: null,

    init() {
      this.el = document.getElementById('dialogueBar');
      if (!this.el) return;
      this.nameEl = document.getElementById('dlgName');
      this.textEl = document.getElementById('dlgText');
      this.tipEl = document.getElementById('dlgTip');
      this.el.addEventListener('click', () => this.next());
    },

    isOpen() { return this.open; },

    show(lines, opts) {
      opts = opts || {};
      this.lines = (typeof lines === 'string') ? [lines] : (lines || []).slice();
      if (!this.lines.length) return this;
      this.index = 0;
      this.onDone = opts.onDone || null;
      if (this.nameEl) {
        this.nameEl.textContent = (opts.emoji ? opts.emoji + ' ' : '') + (opts.name || '');
        this.nameEl.style.display = (opts.name || opts.emoji) ? '' : 'none';
      }
      this.open = true;
      this.el.classList.remove('hidden');
      this._showLine(this.lines[0]);
      return this;
    },

    _showLine(text) {
      this.full = text || '';
      this.shown = '';
      this.typing = true;
      this._acc = 0;
      if (this.textEl) this.textEl.textContent = '';
      if (this.tipEl) this.tipEl.textContent = '';
      Game.Sfx.click();
    },

    /* 按一下：正在打字就直接出全句；已经出完就翻下一句 */
    next() {
      if (!this.open) return;
      if (this.typing) {
        this.typing = false;
        this.shown = this.full;
        if (this.textEl) this.textEl.textContent = this.shown;
        if (this.tipEl) this.tipEl.textContent = '▶ 按 E 继续';
        return;
      }
      this.index++;
      if (this.index >= this.lines.length) { this.close(); return; }
      this._showLine(this.lines[this.index]);
    },

    close() {
      this.open = false;
      if (this.el) this.el.classList.add('hidden');
      const fn = this.onDone;
      this.onDone = null;
      if (fn) fn();
    },

    update(dt) {
      if (!this.open || !this.typing) return;
      this._acc += dt;
      const perChar = 0.032;
      while (this._acc >= perChar && this.shown.length < this.full.length) {
        this._acc -= perChar;
        this.shown = this.full.slice(0, this.shown.length + 1);
        if (this.textEl) this.textEl.textContent = this.shown;
      }
      if (this.shown.length >= this.full.length) {
        this.typing = false;
        if (this.tipEl) this.tipEl.textContent = '▶ 按 E 继续';
      }
    }
  });
})();

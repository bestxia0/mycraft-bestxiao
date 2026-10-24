/* ===================================================================
   engine/quiz.js
   Game.Quiz —— ★通用「三选一答题弹窗」★（谜语石碑、宝箱问题、以后的测验都用它）
   -------------------------------------------------------------------
   ★ 引擎层文件，关卡作者不用改这里 ★
   关卡里这样用：
     Game.Quiz.ask(ctx, {
       chip: '🎁 宝箱问题 · 生活常识',
       title: '答对才能打开宝箱',            // 可选
       question: '吃饭前应该先做什么？',
       answer: '洗手',
       options: ['洗手', '看电视', '跑步'],   // 必须包含 answer，顺序会自动打乱
       hint: '手上有很多看不见的细菌。',        // 可选（不写就没有「提示」按钮）
       rightText: '答对啦！宝箱打开了 🎉',     // 可选
       wrongText: '再想一想～',                // 可选
       preHTML: '<div class="big-emoji">⭐</div>',      // 可选，显示在题目上方
       locked: { text: '这题已经答过啦～' },           // 可选：锁住选项并标出答案
       onCorrect: function (panel) { ... }            // 答对了做什么
     });
     返回 panel（可以 panel.close()）
   注意：★别往里塞图案（emoji 图片）★ —— 图案会把答案泄露了。
   =================================================================== */
(function () {
  const Game = window.Game;

  Game.Quiz = {
    ask(ctx, opts) {
      opts = opts || {};
      let feedback = null;
      const actions = opts.actions || (
        opts.hint === false ? [] : [{ label: '💡 给我提示', kind: 'ghost', small: true }]
      );

      const panel = ctx.panel({
        chip: opts.chip || '❓ 小问题',
        title: opts.title || '',
        wide: !!opts.wide,
        html: (opts.preHTML || '') +
          '<p class="riddle-q">' + opts.question + '</p>' +
          '<div class="feedback"></div>',
        actions: actions,
        onMount(root) {
          feedback = root.querySelector('.feedback');
          const options = Game.shuffle((opts.options || []).slice());
          const box = Game.UI.optionButtons(options, function (opt, btn) {
            if (opt === opts.answer) {
              Game.Sfx.correct();
              Game.UI.lockOptions(box, opts.answer);
              if (feedback) feedback.textContent = opts.rightText || '答对啦！真棒 🎉';
              if (opts.onCorrect) opts.onCorrect(panel, box);
            } else {
              Game.Sfx.wrong();
              btn.classList.add('wrong');
              btn.disabled = true;
              if (feedback) {
                feedback.textContent = (opts.wrongText || '再想一想～') +
                  (opts.hint ? ' 提示：' + opts.hint : '');
              }
            }
          });
          root.appendChild(box);
          if (opts.locked) {
            Game.UI.lockOptions(box, opts.answer);
            if (feedback) feedback.textContent = opts.locked.text || '这题已经答过啦～';
          }
        }
      });

      if (opts.hint) {
        const hintBtn = panel.foot.querySelector('button');
        if (hintBtn) {
          hintBtn.addEventListener('click', function () {
            if (feedback) feedback.textContent = '提示：' + opts.hint;
          });
        }
      }
      Game.Sfx.click();
      return panel;
    }
  };
})();

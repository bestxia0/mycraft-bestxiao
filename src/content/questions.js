/* ===================================================================
   content/questions.js
   题库「总管理」：收集分类题库 -> 汇总成一个大题库 -> 随机抽题。
   -------------------------------------------------------------------
   题库分几个「大类（bank）」：
     bank 'riddle'       谜语题库 —— 第 1 关 · 谜语森林（猜谜语）
     bank 'commonsense'  常识题库 —— 第 2 关 · 宝箱山谷（开宝箱要先答对一题）
   以后还会有 'math'（口算）/ 'poem'（古诗）/ 'english'（英语）… 加一个大类零成本。

   ★ 题目本体不写在这个文件里 ★，每条题都放在「分类文件」里：
       src/content/banks/riddles/animals.js          谜语 · 动物
       src/content/banks/commonsense/life.js         常识 · 生活
   文件清单在 src/content/banks/index.js 里（加分类只改那一行，不用碰 index.html）。

   分类文件里每条题目的格式：
     { id:'xigua', q:'题目…', a:'正确答案',
       options:['干扰项','正确答案','干扰项'], hint:'答错时的提示', emoji:'🍉' }

     id       ★每条都要有，且不能重复★（英文小写 + 短横线）。
              存档按 id 记「这道题答过了」，所以在文件里调换顺序、
              中间插新题，都不会打乱小朋友的进度。
     options  3 个选项，必须包含 a（打开时的顺序会自动打乱）
     hint     答错时给的一句话提示（不能说破答案）
     emoji    只给「题目卡片 / 奖励图」留着，★答题面板上不显示★
              （图案会把答案泄露了），可以留空。
   =================================================================== */
(function () {
  const Game = window.Game;

  const RIDDLE = 'riddle';
  const COMMON = 'commonsense';

  Game.BANK_DATA = {};     // bankId -> { id, label, cats:{cat:{...}}, items:[...] }
  Game.RIDDLES = [];       // 兼容：谜语题库的扁平列表（老代码可以直接用）

  /* ---------------- 登记题库 ---------------- */
  function makeBank(bankId, label) {
    const bank = Game.BANK_DATA[bankId] ||
      (Game.BANK_DATA[bankId] = { id: bankId, label: label || bankId, cats: {}, items: [] });
    if (label) bank.label = label;
    if (bankId === RIDDLE) bank.items = Game.RIDDLES;   // 谜语题库和老数组共用一份
    return bank;
  }

  /* 分类文件用这个登记自己：
       Game.registerQuestions('commonsense', 'life', '生活常识', [ ... ])
     谜语题库有个短一点的写法（老文件都在用）：Game.registerRiddles('animals', '动物', [ ... ]) */
  Game.registerBank = function (bankId, cat, label, list) {
    if (!bankId || !cat || !list || !list.length) {
      Game.log.error('registerQuestions 参数不对，需要 (题库id, 分类id, 分类名, 题目数组)');
      return null;
    }
    const bank = makeBank(bankId, null);
    const box = bank.cats[cat] ||
      (bank.cats[cat] = { cat: cat, label: label || cat, items: [] });
    if (label) box.label = label;

    list.forEach(function (r, i) {
      let id = String(r.id || '').trim();
      if (!id) {
        id = cat + '-' + (i + 1);
        Game.log.warn('题目「' + String(r.q || '').slice(0, 12) + '…」没写 id，' +
          '临时用了 ' + id + '（建议补一个英文 id）');
      }
      const key = bankId + ':' + cat + ':' + id;
      if (Game.questionByKey(key)) {
        Game.log.warn('题目 id 重复：「' + key + '」，后一条被忽略了');
        return;
      }
      const options = (r.options || []).slice();
      if (options.indexOf(r.a) < 0) options.push(r.a);   // 保险：正确答案必须在选项里
      const item = {
        key: key, bank: bankId, cat: cat, label: box.label, id: id,
        q: r.q, a: r.a, options: options,
        hint: r.hint || '再读一遍题目，慢慢想一想～',
        emoji: r.emoji || ''
      };
      box.items.push(item);
      bank.items.push(item);
    });
    return box;
  };
  Game.registerQuestions = Game.registerBank;
  Game.registerRiddles = function (cat, label, list) {
    return Game.registerBank(RIDDLE, cat, label, list);
  };

  /* ---------------- 查询 ---------------- */
  Game.bankOf = function (bankId) { return makeBank(bankId, null); };
  Game.bankItems = function (bankId) { return Game.bankOf(bankId).items; };
  Game.bankCats = function (bankId) {
    const bank = Game.bankOf(bankId);
    return Object.keys(bank.cats).map(function (c) {
      const b = bank.cats[c];
      return { cat: c, label: b.label, count: b.items.length };
    });
  };
  Game.bankStats = function (bankId) {
    const bank = Game.bankOf(bankId);
    return { bank: bankId, label: bank.label, total: bank.items.length, cats: Game.bankCats(bankId) };
  };

  Game.questionByKey = function (key) {
    const banks = Object.keys(Game.BANK_DATA);
    for (let b = 0; b < banks.length; b++) {
      const items = Game.BANK_DATA[banks[b]].items;
      for (let i = 0; i < items.length; i++) if (items[i].key === key) return items[i];
    }
    return null;
  };
  Game.riddleByKey = Game.questionByKey;      // 老名字，留着兼容

  /* ---------------- 抽题 ---------------- */
  /* ★随机抽题★ —— 优先抽「还没答过」的，不够了再从答过的里补
       Game.pickQuestions(6, { bank:'commonsense', exclude: [...], cats:['life'] })
     opts.bank     题库大类（默认 'riddle'）
     opts.exclude  已经答过的 key（就是小朋友的进度）
     opts.cats     只从这几个分类里抽（不写 = 该题库存部分类） */
  Game.pickQuestions = function (n, opts) {
    opts = opts || {};
    const bankId = opts.bank || RIDDLE;
    const exclude = opts.exclude || [];
    const cats = (opts.cats && opts.cats.length) ? opts.cats : null;
    const fresh = [], done = [];
    Game.bankItems(bankId).forEach(function (r) {
      if (cats && cats.indexOf(r.cat) < 0) return;
      (exclude.indexOf(r.key) >= 0 ? done : fresh).push(r);
    });
    const out = Game.shuffle(fresh).slice(0, n);
    if (out.length < n) {
      Game.shuffle(done).slice(0, n - out.length).forEach(function (r) { out.push(r); });
    }
    return out;
  };
  /* 谜语 / 常识的短写法 */
  Game.pickRiddles = function (n, opts) { return Game.pickQuestions(n, opts); };
  Game.pickCommonsense = function (n, opts) {
    opts = opts || {};
    const o = { bank: COMMON, exclude: opts.exclude, cats: opts.cats };
    return Game.pickQuestions(n, o);
  };

  /* 洗牌后的选项（同一道题每次打开顺序不一样，防止背位置） */
  Game.riddleOptions = function (question) {
    return Game.shuffle(question.options.slice());
  };

  /* 老代码用的统计（= 谜语题库） */
  Game.riddleStats = function () { return Game.bankStats(RIDDLE); };
  Game.commonsenseStats = function () { return Game.bankStats(COMMON); };

  /* 老存档兼容：以前的谜语 key 是 'animals:rabbit'（没有题库前缀），
     这里统一补成 'riddle:animals:rabbit'，老存档的进度不会白玩。 */
  Game.normalizeQuestionKeys = function (list) {
    return (list || []).map(function (k) {
      k = String(k);
      if (k.indexOf(RIDDLE + ':') === 0 || k.indexOf(COMMON + ':') === 0) return k;
      return k.indexOf(':') >= 0 ? RIDDLE + ':' + k : k;
    });
  };
})();

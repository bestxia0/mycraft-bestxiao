/* ===================================================================
   content/hanzi.js
   汉字学习库（纯数据）。给「汉字教室」这类学习关卡用。
   -------------------------------------------------------------------
   想加汉字：往 Game.HANZI 里加一条。字段说明：
     char   汉字本身
     pinyin 拼音（带声调）
     mean   一句话意思（念给小朋友听）
     words  组词（2~3 个）
     emoji  用来帮助记忆的小图标
     quiz   小测验：{ q 题目, options 选项, a 正确答案 }
   =================================================================== */
(function () {
  const Game = window.Game;

  Game.HANZI = [
    {
      char: '日', pinyin: 'rì', mean: '太阳，也表示一天', words: ['日子', '生日', '日出'],
      emoji: '☀️',
      quiz: { q: '「日」的意思是什么？', options: ['太阳', '月亮', '水'], a: '太阳' }
    },
    {
      char: '月', pinyin: 'yuè', mean: '月亮，也表示月份', words: ['月亮', '月光', '八月'],
      emoji: '🌙',
      quiz: { q: '「月」指的是天上的什么？', options: ['月亮', '星星', '云朵'], a: '月亮' }
    },
    {
      char: '水', pinyin: 'shuǐ', mean: '每天都要喝的、会流动的东西', words: ['水果', '喝水', '河水'],
      emoji: '💧',
      quiz: { q: '下面哪个词里面有「水」？', options: ['喝水', '唱歌', '跑步'], a: '喝水' }
    },
    {
      char: '火', pinyin: 'huǒ', mean: '热热的、会发光的东西', words: ['火车', '火苗', '火光'],
      emoji: '🔥',
      quiz: { q: '「火」给你的感觉是怎样的？', options: ['热热的', '凉凉的', '软软的'], a: '热热的' }
    },
    {
      char: '山', pinyin: 'shān', mean: '高高的、像大石头堆起来的山峰', words: ['大山', '高山', '山上'],
      emoji: '⛰️',
      quiz: { q: '「山」是什么样子的？', options: ['高高的', '扁扁的', '圆圆的'], a: '高高的' }
    },
    {
      char: '木', pinyin: 'mù', mean: '树，也可以表示木头', words: ['木头', '树木', '木板'],
      emoji: '🪵',
      quiz: { q: '「木」和下面哪个有关系？', options: ['大树', '白云', '小鸟'], a: '大树' }
    },
    {
      char: '人', pinyin: 'rén', mean: '就是你和我这样的，会走路会说话', words: ['大人', '人们', '家人'],
      emoji: '🧑',
      quiz: { q: '「人」表示什么？', options: ['人', '花', '石头'], a: '人' }
    },
    {
      char: '口', pinyin: 'kǒu', mean: '嘴巴，也可以数「一家人」', words: ['开口', '门口', '人口'],
      emoji: '👄',
      quiz: { q: '「口」一开始说的是身体的哪里？', options: ['嘴巴', '耳朵', '鼻子'], a: '嘴巴' }
    },
    {
      char: '手', pinyin: 'shǒu', mean: '用来拿东西、写字的那两只', words: ['小手', '帮手', '手工'],
      emoji: '✋',
      quiz: { q: '我们用「手」来做什么？', options: ['拿东西', '听声音', '闻味道'], a: '拿东西' }
    },
    {
      char: '大', pinyin: 'dà', mean: '个头很大，和小相反', words: ['大人', '大小', '大声'],
      emoji: '🐘',
      quiz: { q: '「大」的反义词是哪个？', options: ['小', '高', '多'], a: '小' }
    },
    {
      char: '小', pinyin: 'xiǎo', mean: '个头很小，和大相反', words: ['小心', '小鸟', '大小'],
      emoji: '🐤',
      quiz: { q: '「小」的反义词是哪个？', options: ['大', '长', '远'], a: '大' }
    },
    {
      char: '上', pinyin: 'shàng', mean: '在高处、往高处去', words: ['上面', '上学', '上山'],
      emoji: '⬆️',
      quiz: { q: '「上」表示哪个方向？', options: ['往上', '往下', '往左'], a: '往上' }
    },
    {
      char: '下', pinyin: 'xià', mean: '在低处、往低处去', words: ['下面', '下雨', '下山'],
      emoji: '⬇️',
      quiz: { q: '「下」表示哪个方向？', options: ['往下', '往上', '往后'], a: '往下' }
    },
    {
      char: '天', pinyin: 'tiān', mean: '头顶上那一片，也表示一天', words: ['天空', '白天', '今天'],
      emoji: '🌤️',
      quiz: { q: '「天」在什么地方？', options: ['头顶上', '脚底下', '口袋裡'], a: '头顶上' }
    },
    {
      char: '花', pinyin: 'huā', mean: '开在树上、香香的，很好看', words: ['花朵', '小花', '花园'],
      emoji: '🌸',
      quiz: { q: '「花」长在哪里？', options: ['植物上', '石头上', '云上'], a: '植物上' }
    },
    {
      char: '鸟', pinyin: 'niǎo', mean: '有翅膀、会飞的小动物', words: ['小鸟', '鸟窝', '鸟类'],
      emoji: '🐦',
      quiz: { q: '「鸟」会做什么？', options: ['飞', '游泳', '打洞'], a: '飞' }
    }
  ];

  /* 挑 n 个字：优先挑「还没学过」的；都学完过就从头再来一遍 */
  Game.pickHanzi = function (n, learned) {
    learned = learned || [];
    const fresh = [], old = [];
    Game.HANZI.forEach(function (h) {
      (learned.indexOf(h.char) >= 0 ? old : fresh).push(h);
    });
    const out = Game.shuffle(fresh).slice(0, n);
    if (out.length < n) {
      Game.shuffle(old).slice(0, n - out.length).forEach(function (h) { out.push(h); });
    }
    return out;
  };
})();

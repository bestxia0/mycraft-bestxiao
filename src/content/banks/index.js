/* ===================================================================
   content/banks/index.js  ★★★ 题库清单 —— 加分类只改这个文件 ★★★
   -------------------------------------------------------------------
   这里只列「题库文件」的路径。启动时 main.js 会按顺序把它们加载进来，
   每个文件里都用 Game.registerRiddles(分类id, 分类名, [谜语...]) 登记自己。

   想加一个新分类（比如「交通工具」）：
     1. 复制 src/content/banks/riddles/animals.js，改名成 vehicles.js
     2. 把里面的 'animals' / '动物' 改成 'vehicles' / '交通工具'，
        再换上新的谜语（每条记得有唯一的 id）
     3. 在下面 BANKS 数组里加一行：
          'content/banks/riddles/vehicles.js',
     4. 刷新浏览器就能抽到新谜语了 🎉

   路径都是相对 src/ 的路径；加载顺序不影响抽题（抽题时会随机洗牌）。
   以后别的学科也能这么干，例如：
     'content/banks/math/plus.js'     数学 · 加法口算
     'content/banks/poems/tang.js'    古诗 · 唐诗
   =================================================================== */
window.Game = window.Game || {};
window.Game.BANKS = [
  /* ---- 第 1 关 · 谜语森林用的谜语题库（分类一个文件） ---- */
  'content/banks/riddles/animals.js',      // 动物
  'content/banks/riddles/plants.js',       // 花草树木
  'content/banks/riddles/nature.js',       // 天气与自然
  'content/banks/riddles/food.js',         // 吃的喝的
  'content/banks/riddles/things.js',       // 生活用品
  'content/banks/riddles/body.js',         // 身体与穿着
  'content/banks/riddles/characters.js',   // 汉字字谜

  /* ---- 第 2 关 · 宝箱山谷用的常识题库（开宝箱前要答对一题） ---- */
  'content/banks/commonsense/life.js',       // 生活常识
  'content/banks/commonsense/safety.js',     // 安全常识（过马路、火警…）
  'content/banks/commonsense/nature.js',     // 自然常识（季节、太阳、植物…）
  'content/banks/commonsense/society.js'     // 节日与习俗

  /* ↓↓↓ 以后新的题库文件写在这里，注意上一行末尾要加逗号 ↓↓↓ */
];

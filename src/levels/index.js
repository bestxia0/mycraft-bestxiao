/* ===================================================================
   levels/index.js  ★★★ 新增关卡只要改这个文件 ★★★
   -------------------------------------------------------------------
   这里只有一张「关卡清单」。启动时 main.js 会按顺序把每个文件加载进来，
   每个文件里都用 Game.Levels.register({...}) 把自己登记成关卡。

   加一个新关卡的步骤（大约 5 分钟）：
     1. 复制 src/levels/_TEMPLATE/ 整个文件夹，
        改名为 src/levels/my-new-level/
     2. 把 level.js 里的 id / name / order 改成你的
     3. 在下面 LEVELS 数组里加一行（files 里可以写多个文件）
     4. 刷新浏览器 —— 广场上会自动多出一座传送门 🎉

   files 的路径都是相对 src/ 的路径。
   一个关卡如果想要自己的数据文件，可以这样写：
     { id:'poem-hall', files:['levels/poem-hall/poems.js', 'levels/poem-hall/level.js'] }
   =================================================================== */
window.Game = window.Game || {};
window.Game.LEVELS = [
  { id: 'hub-square',      files: ['levels/hub-square/level.js'] },
  { id: 'riddle-forest',   files: ['levels/riddle-forest/level.js'] },
  { id: 'chest-valley',    files: ['levels/chest-valley/level.js'] },
  { id: 'hanzi-classroom', files: ['levels/hanzi-classroom/level.js'] },
  { id: 'arena-battle',    files: ['levels/arena-battle/level.js'] },
  { id: 'desert-escape',   files: ['levels/desert-escape/props.js', 'levels/desert-escape/level.js'] }

  /* ↓↓↓ 以后新加的关卡写在这里，注意上一行末尾要加逗号 ↓↓↓ */
];

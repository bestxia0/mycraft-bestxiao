# 变更记录 · mycraft-bestxiao

> 每个「对小朋友有影响」的改动都要在这里记一笔（谁做的、影响了哪些关卡）。
> 判断标准：小朋友能看到 / 能玩到 的东西变了，就得写。
> 只记日期和事实，不写感想。详细过程看任务卡（`program/tasks/`）。

---

## v2.4.0 · 2026-10-24

**主题**：新增第 5 关 · 沙漠逃亡（小朋友 2026-10-24 口述的一个全新场景）

### 新增：第 5 关 · 沙漠逃亡（`desert-escape`，游戏内第 5 个可玩关卡）
- 小朋友原话存在 `transcripts/2026-10-24-第五关沙漠逃亡-口述.md`：
  沙漠里骑马逃出去、2 分钟、超时自动送回小镇重来、头上的箭头只给**大概**方向，
  路上有小龙卷风 / 仙人掌 / 能打的动物（蛇）。
- 进关：从广场的 🐎 传送门进；出生点在沙漠南边，**旁边就有一匹小马**（按 F 骑上去），
  出生点侧面有回广场的传送门、背后有一块「出口在西北边」的木牌。
- 骑马：马速 `HORSE_SPEED 12`（走路 6.2）；骑马时按 **F = 冲刺**（1.7 倍 / 1.5 秒 / 冷却 4.5 秒）、
  按 **E 下马**；不骑马时按 F 是「打最近的马 / 小蛇 / 仙人掌」。
- 倒计时 **120 秒**，一进沙漠就开始算（不是骑上马才开始）；剩 30 秒顶部计时条变红闪；
  时间到 → 音效 + 提示气泡 → **1.7 秒后自动回广场**，**不弹失败面板**（小朋友原话就是「自动传送回小镇」）。
- 头顶箭头 ⚠️ **只给大概方向**：`ARROW_OFF = ±0.32 弧度`，实测偏 **0.3°~15.9°**，**不是**精确指向。
- 出口：西北边的**绿洲石拱门**（出生点直线约 283 步，骑马直线约 24 秒）；
  进去 → 🏝 通关面板（用时 / 骑马次数 / 打飞小蛇 / 最快一次 / 30 🪙）。
- 路障：4 个会自己游走的**小龙卷风**（骑着马会被卷下马、马被挪开 8 步）、
  散落的**仙人掌**（贴上去被扎，按 F 能打碎、碰撞盒关掉路就通了、掉 1 🪙）、
  **小蛇**（贴上去被咬，按 F 打飞、掉 2 🪙）。
- **马会随机生成**：8 匹起步，每 16 秒在玩家 16~40 步外补 1 匹（上限 12 匹）。
- 小朋友**不掉血、不会失败**：被打到只是弹开 + 僵直一下，最坏是被卷下马（再找一匹骑）。
- 关卡私货放 `src/levels/desert-escape/props.js`（方块马 / 小蛇 / 小龙卷风 / 沙子贴图），
  引擎不掺和 —— 这是「关卡自己的道具放关卡文件夹」的第一个例子。

### 引擎（`src/engine/`）
- `ui.js` 的 `Game.UI.battle()` 支持**只显示倒计时**：不传 `hpMax` 就不画血条、
  不传 `alive` 就不显示「对手 N」（以前会把上一关擂台的「对手 4」留在屏幕顶上）。
  擂台关的调用一个字没改，**老关卡行为不变**。
- `namespace.js` 版本号 → **2.4.0**。

### 文档 / 脚本
- 新增设计卡 `levels/L06-沙漠逃亡.md`（状态：可玩）；口述原文归档到 `transcripts/`。
- `levels/README.md` 加 L06 行，并记录**「第五关」编号冲突**（猜谜语 vs 沙漠，等小朋友拍板）。
- 新增 `scripts/test-desert.sh`（第 5 关专项验收，14 段）与
  `scripts/shot-level.sh`（给任意一关拍预览图：`zsh scripts/with-server.sh zsh scripts/shot-level.sh <id>`）。
- `scripts/smoke.sh` 的关卡列表加上 `desert-escape`；`README.md` / `AGENTS.md` 的版本与关卡数同步。

### 验证
- `zsh scripts/check.sh` → 42 个 JS 文件语法全通过。
- `zsh scripts/test-desert.sh` → 14 段全绿（骑马 / 冲刺 / 箭头偏差 / 龙卷风卷下马 / 仙人掌 / 小蛇 /
  马随机生成 / 超时自动回城 / 绿洲通关 / 再进关重置）。
- `zsh scripts/smoke.sh` → 广场 + 5 个关卡都能进、传送门都在、零报错。

---

## v2.3.0 · 2026-10-24

**主题**：项目迁移 + 答题体系 + 第 4 关手感与节奏

### 项目结构（影响所有人）
- 项目搬到 `/Users/xiao/workspace/mycraft-bestxiao`（三层结构 `engine/` `content/` `levels/` 不变）。
- 新增 `agents/`（7 个角色提示词）、`program/`（看板 / 任务卡 / 决策 / 变更记录）、
  `scripts/`（`check.sh` / `regress-all.sh` / `test-arena.sh` 等可复跑验证）、`docs/COORDINATION.md`。
- `AGENTS.md` 重写：第 0 节速览、第 3 节「多 Agent 并行协作机制」、第 11 节验证流程（脚本化）。

### 引擎（`src/engine/`）
- **新增 `engine/quiz.js`：`Game.Quiz.ask(ctx, {...})`** —— 通用三选一答题弹窗
  （chip / title / question / answer / options / hint / rightText / wrongText / locked / onCorrect）。
  题目数据里的 `emoji` 不显示（**防止图案泄露答案**）。
- `director.js` 的 `_updateGuide()` 支持关卡字段 **`noGuide: true`** → 这一关不画头顶指引箭头。
- `namespace.js` 版本号 → `2.3.0`。
- `index.html` 增加 `<script src="src/engine/quiz.js">`；`content/riddles.js` 换成 `content/questions.js`。

### 内容（`src/content/`）
- `riddles.js` → **`questions.js`**：题库改成「多题库（bank）」架构 ——
  `Game.registerBank / registerQuestions(bankId,cat,label,list)`（谜语短写法 `registerRiddles(cat,label,list)`）、
  `Game.pickQuestions(n,{bank,exclude,cats})` / `pickRiddles` / `pickCommonsense`、
  `Game.bankStats / bankCats / bankItems / bankOf`、`Game.normalizeQuestionKeys`（老存档兼容）。
- 题目 key 从 `分类:id` 改成 **`题库:分类:id`**（`riddle:animals:rabbit` / `commonsense:safety:red-light`）。
- **新增常识题库（38 条 / 4 个分类）**：`banks/commonsense/`
  `life.js` 生活常识 10 · `safety.js` 安全常识 10 · `nature.js` 自然常识 10（分类 id `nature-w`）·
  `society.js` 节日与习俗 8（分类 id `festival`）。

### 第 1 关 · 谜语森林
- 石碑答题改走 `Game.Quiz.ask`（行为不变：无图案、答错给提示、答对 +10 🪙）。
- 老存档里的谜语 key 会自动补成新格式，**进度不丢**。

### 第 2 关 · 宝箱山谷
- **不再显示头顶指引箭头**（`noGuide: true`）：宝箱要小朋友自己找。
- **每个宝箱按 E 后要先答对一道常识题才会打开**（题目从 4 个分类里随机抽，答过的不再重复出）；
  答对才给装备 + 5 🪙；交互提示改成「按 E 答题开宝箱 🎁」。

### 第 4 关 · 圆形擂台
- 对手 **4 → 6 个**（新增紫队 / 橙队小勇士），HUD「还剩 N 个对手」自动跟着变。
- **双方攻击后都会被弹开**：打中别人自己后退（`RECOIL = 0.35`），对手打人自己也被弹开（`BOT_RECOIL = 5.5`）。
- 被打中的人**僵直 0.5 → 0.85 秒**（`HIT_STUN`），能连着揍几拳；武器击退力上调（14 / 16 / 19 / 23）。
- 血量：自己 **100 → 400**，对手 **60 → 300**；对手打你一下 7 → 5；
  **人机互殴一下只掉 2 滴血**（`BOT_DMG_BOT`），所以擂台上一直有人，不会几分钟就散场。
- AI 更爱打别的对手（`pickTarget` 改成打分制：其他对手距离在玩家的 1.25 倍以内就优先打对手），
  视野 `BOT_SEE` 34 → 46，出手间隔 0.8~1.25 秒。
- 实测节奏（`scripts/test-arena.sh`）：站桩不动约 4~5 分钟才被打下去；一局能走到第 2~3 次缩圈；
  空手 6 拳能把一个对手从中心推到台下；6 个对手全清约 30 秒（一直追着打的情况）。

---

## v2.2.0 · 2026-10-23

- 谜语 9 条 → **65 条**，拆成 7 个分类文件放进 `src/content/banks/riddles/`
  （动物 / 花草树木 / 天气与自然 / 吃的喝的 / 生活用品 / 身体与穿着 / 汉字字谜）。
- 新增 `src/content/banks/index.js` 题库清单，由 `main.js` 动态加载（**加分类不用改 `index.html`**）。
- `riddles.js` 改成「总管理」；第 1 关改成**每轮随机抽 6 道、没答过的优先**，
  答完一轮后重新进关自动换一批；中央多了「🎲 换一批新谜语」木牌；
  存档从「石碑序号」改成「谜语 id（`solvedKeys`）」并兼容老存档。
- `Game.debug` 新增 `riddles` / `pick` / `round`。

## v2.1.0 · 2026-10-23

- 广场从「一条街」扩建成**小镇**（东边跳跳乐 / 西边小迷宫 / 南边许愿池 + 小花园 + 8 枚金币 + 能爬的城墙）。
- 第 1 关谜语面板**去掉图案提示**；第 2 关范围扩大、宝箱 12 → **20**；
  第 3 关跟老师说完话会**自动换一批新汉字**（可以一直学）。
- **新增第 4 关 · 圆形擂台**（缩圈 + 人机混战 + `F` 攻击 + 用炼造的武器 + 掉下去回小镇重来）。
- 引擎新增 `ctx.setGround`、`ctx.player.consumeAttack / swing / knockback / faceDir / stunT`、
  `Game.makeBot`、`Game.UI.battle`、`h.addDisc / addCylinder / addRing`、`Sfx.hit / knock`。

## v2.0.0 · 2026-10-22

- 引擎 / 内容 / 玩法三层分离；关卡自注册 + 清单动态加载；广场传送门自动生成（扇形排布）。
- 存档 v3（多档案 + 分关卡分区 + 导入导出 + 自动迁移）；新增汉字教室（学习系统示范）与 `_TEMPLATE` 模板。
- 旧单层代码移入 `legacy/`。

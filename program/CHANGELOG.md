# 变更记录 · mycraft-bestxiao

> 每个「对小朋友有影响」的改动都要在这里记一笔（谁做的、影响了哪些关卡）。
> 判断标准：小朋友能看到 / 能玩到 的东西变了，就得写。
> 只记日期和事实，不写感想。详细过程看任务卡（`program/tasks/`）。

---

## v2.8.0 · 2026-10-24

**主题**：新增**第 8 关 · 风扇小屋**（把风扇装进屋里 + 通上电），并给引擎加了两个新能力：
**缩小能力**（按 `R` 变小，才钻得进 1.2 步高的小门）和**跨关卡的全局开关**（任务道具可以去别的关卡拿）

### 为什么
- 用户转述小朋友 2026-10-24 的口述（原文见 `transcripts/2026-10-24-第八关风扇小屋-口述.md`）：
  「第8关。我们要把风扇装进旁边的小房子里面。但是我们有一个充电器，万一找不到的话，
  就可以回主世界去找一下……找到以后，就要直接装到房间里去充电。要是没装的话，你就过不了关。
  这是一个小的，我们可以用缩小能力，进去看看里面的样子。前面又有一个白色的空调位置……
  那就不用找它了，万一它本来就是有电的呢？那个房间有一个门。也有窗户。」
- 这一关其实就是 `levels/_ideas/` 里的两个老点子（**找风扇装进小房子** + **给小房子装空调**），
  这次小朋友讲全了（装进房间 / 回主世界找充电器 / 装不上过不了关 / 缩小能力进屋）→ 两个点子都标「已落地」。
- 另外两个「引擎级」的新东西都是这一关逼出来的：
  ① 门太小 → 要有**缩小能力**；② 充电器在**别的关卡**（广场）→ 要有能跨关卡共享的**全局开关**。

### 新增：第 8 关 · 风扇小屋（`src/levels/fan-cottage/`）
- **一栋有门有窗的小木屋**（12 × 10 步、墙高 3.4 步、屋檐挑出 1.2 步）：南面是门 + 两扇窗，
  东面一扇窗；屋里有木地板、小地毯、小桌子、小凳子、墙上小架子，
  **西边地上的蓝圈（风扇位）+ 墙上插座**、**东边墙上白色的空调位**、屋顶一盏吊灯。
- **门洞只有 2.4 × 1.2 步高**（★这一关的关键数值★）：大个子 1.8 步高 → **撞在门口进不去**
  （脚本实测停在 z≈-2.66）；**按 `R` 变小**（0.61 步）→ 从门洞直接走进屋（z≈-10.1）。
- **风扇被风刮到小屋后面**：绕过去按 `E` 抱起来（屋后堆着两个木箱 + 一块牌子提示）；
  **没找到风扇之前不给头顶箭头**（这一关的重点就是「找」），任务条只给一句话。
- **充电器不在这一关**：要**回主世界**（中央广场**东边的工具台**）按 `E` 借 ——
  小朋友说的「回主世界去找一下」「还是可以重新去找一下下」被实现成「随时能来回跑、跑几趟都行」
  （风扇装好之后回广场，风扇**还留在屋里**）。
- **装进风扇位 → 通电**：抱到风扇 → 到门口按 `E`/`R` 变小 → 进屋到蓝圈按 `E` 装上 →
  回广场借充电器 → 再进屋按 `E` 插上 → **风扇转起来 + 拉一根电线 + 吊灯亮 + `ctx.complete()`**，
  通关 +60 🪙，记「这一局花了多少秒 / 通了多少次电」。
- **不装就过不了关**（小朋友明确要求的硬规则）：三次按 `E` 的提示各不相同
  （「先去找风扇」/「装好了可是没有电」/「回工具台借充电器」），缺一样都不通关。
- **空调位自己亮**（小朋友说的「万一它本来就是有电的呢」）：风扇一通上电，墙上的空调位
  自己变色 + 冒冷气片 + 牌子换成「❄ 空调位 · 自己亮了」，**不用**单独找空调充电器 —— 是彩蛋，不影响通关。
- **没有倒计时**（这一关考「找 + 搬 + 装」，不催）：整条走完纯走路 184 步 ≈ 31 秒，
  加上找东西 / 来回几趟，玩起来大约 3~5 分钟（对得上家长说的「5 分钟左右」）。
- 再进关能重玩（上一局通过电 → 全部重置，风扇回到屋后）。

### 引擎（向后兼容，只加开关和零件）
- `src/engine/player.js`：新增**缩小能力** —— `player.small` / `setSmall(v)` / `toggleShrink(force)`、
  `eyeHeight()` / `camMin()` / `camMax()` / `setShrinkEnabled(v)`；键盘 **`R`**（只在开关打开时才算）、
  触屏新增「小」按钮；变小以后**碰撞盒高 1.8 → 0.6、半径 0.34 → 0.16、模型缩到 34%、
  镜头拉近到 3 步、看的高度降到 0.5、走路 3.4 / 起跳 6.6**（都不影响没开这个开关的关卡）。
- `src/engine/director.js`：`go()` 里按关卡字段 **`shrink`** 调用 `setShrinkEnabled()`（进关先复位成大个子），
  并把「能不能跳 / 能不能变小」一起交给底部操作说明。
- `src/engine/ui.js`：`hintBar()` 改成收对象 `{ jump, shrink }`（**老写法 `hintBar(true/false)` 照样能用**），
  新增两条带「R 变小」的操作说明文案。
- `src/engine/save.js`：新增**全局开关** `Game.Save.flag(key)` / `setFlag(key, v)`
  （存在 `profile().global.flags`，**所有关卡共用**，用来承载「充电器」这种跨关卡任务道具；
  老存档载入时自动补 `global.flags = {}`，不会丢进度）。
- `src/engine/entities.js`：新增 `Game.makeCharger({x,y,z,label})` —— 白色小方块 + 两根插脚 + 线 + 牌子
  （广场工具台和风扇小屋里都用它）。
- `index.html` + `src/style.css`：触屏层加一个「小」按钮（`#btnSmall`，只有能变小的关卡才显示）。

### 广场：东边多了「工具台」（借充电器）
- `src/levels/hub-square/level.js`：新增 `TOOLBOX = { x: 15, z: -8 }` —— 一张工作台 + 台上放着的充电器
  + 「🔌 工具台 · 借充电器」的牌子；按 `E` 借走（写全局开关 `hasCharger`）。
- 广场的任务条：**风扇装好但还缺充电器**时，把小朋友直接领到工具台
  （「🔌 风扇小屋还缺一个充电器，广场东边的工具台上就能借到！」+ 头顶箭头指向工具台）；
  和村长爷爷说话时也会多一句提醒。

### 背景音乐：第 8 关专属曲子《风扇小屋》
- `src/engine/music.js` 的 `TRACKS` 加一首（key = 关卡 id `fan-cottage`）：
  **106 bpm / 三角波 / soft 鼓点**，大调、日常、暖暖的「在家里干活」的感觉。

### 改了哪些文件
- 新增：`src/levels/fan-cottage/props.js`、`src/levels/fan-cottage/level.js`、`scripts/test-cottage.sh`
- 新增文档：`levels/L08-风扇小屋.md`、`transcripts/2026-10-24-第八关风扇小屋-口述.md`、
  `program/tasks/TC-0009-fan-cottage.md`
- 引擎：`src/engine/player.js`（缩小能力）、`src/engine/director.js`（`shrink` 开关）、
  `src/engine/save.js`（全局开关）、`src/engine/entities.js`（充电器）、`src/engine/ui.js`（操作说明）、
  `src/engine/music.js`（一首新曲子）、`src/engine/namespace.js`（版本号 2.8.0）、
  `index.html` + `src/style.css`（触屏「小」按钮）
- 关卡：`src/levels/index.js` 加一行；`src/levels/hub-square/level.js`（东边工具台 + 任务条 + 村长台词）
- 脚本：`scripts/smoke.sh`、`scripts/test-errors.sh`、`scripts/test-music.sh` 的关卡列表加上这一关；
  `scripts/shots.sh` 加一张 `preview-9-cottage.png`
- 文档：本文件、`program/DECISIONS.md`（D-012）、`program/BOARD.md`、`program/ROADMAP.md`、
  `README.md`、`AGENTS.md`、`docs/背景音乐.md`、`docs/关卡设计规范.md`、`levels/README.md`、
  `levels/_ideas/README.md`、`levels/_ideas/2026-10-23-找风扇装进小房子.md`、
  `levels/_ideas/2026-10-23-给小房子装空调.md`（两个老点子标「已落地」）

### 验证（全绿）
- `zsh scripts/check.sh` → 49 个 JS 文件语法全通过。
- `zsh scripts/with-server.sh zsh scripts/test-cottage.sh` → 0/A~K 全绿
  （登记 / 一进关的屋子与任务条（**不给箭头**）/
  **缩小能力**（身高 1.8 → 0.6、碰撞盒半径 0.34 → 0.16、模型缩放 0.34、镜头 9 → 3、
  走到 6.2 → 3.4 步每秒、再按 R 变回来）/ **广场里按 R 无效**（广场没写 `shrink:true`）/
  **门太小**（大个子朝门走 2 秒停在 z=-2.66 进不去、变小以后走到 z=-10.14 进屋）/
  屋后抱风扇 + 门口按 E 变小 / **没风扇装不上、装上没电不通关** /
  回广场工具台借充电器（任务条 + 箭头指向工具台）/ 变小插电 → **通电通关 +60 币 + 拉电线 + 吊灯亮 +
  空调位自己亮** / 通关后再进重摆一遍 / 来回跑几趟（风扇还装着、回来又是大个子）/
  传送门回广场 / 时间预算 184 步 ≈ 31 秒）·`errors: []`
- `zsh scripts/with-server.sh zsh scripts/regress-all.sh` → 老 4 关全流程通过
  （回广场时门列表 `fan-cottage` 是 `locked`，解锁链正常）。
- `zsh scripts/with-server.sh zsh scripts/test-desert.sh` / `test-paint.sh` / `test-arena.sh` /
  `test-maze.sh` → 第 5/6/4/7 关专项全绿（缩小能力与全局开关的引擎改动没有影响老关卡）。
- `zsh scripts/with-server.sh zsh scripts/test-music.sh` → 每关都有曲子，第 8 关是《风扇小屋 106bpm/triangle/soft ✓》。
- `zsh scripts/with-server.sh zsh scripts/smoke.sh` → 广场 + 8 关逐关进出，任务条正常。
- `zsh scripts/with-server.sh zsh scripts/test-errors.sh` → `errors: []`、`warns: []`。

## v2.7.0 · 2026-10-24

**主题**：新增**第 7 关 · 石头迷宫**（随机关卡 + 不能跳跃 + 按 F 打怪兽掉装备），并给它配了专属背景音乐

### 为什么
- 用户转述小朋友 2026-10-24 的口述（原文见 `transcripts/2026-10-24-第七关石头迷宫-口述.md`）：
  「设计一个比较大的迷宫， 不能跳跃，保证一定有出口， 有多套迷宫随机。
  中中间有随机怪物出现。 需要攻击，杀死后可获得一定金币和装备。 有时间要求走到出口。
  中间可以有金币出现。」（家长给了编号：第 7 关 迷宫）
- 这是全游戏**第一关不能跳**、也是第一关**每次进去地图都不一样**的关卡。

### 新增：第 7 关 · 石头迷宫（`src/levels/stone-maze/`）
- **一座比较大的随机迷宫**：10 × 10 个迷宫格 = **21 × 21 格 / 63 × 63 步**。
  算法用深度优先（递归回溯）挖出来，是「**完美迷宫**」—— 任意两格之间都有且只有一条路，
  所以**出口一定走得到**（脚本拿 30 颗种子验证过连通性：`reached === openCount`）；
  之后再随机打通 25% 的死胡同（braid），走起来不至于一条道走到黑。
- **每次进关都是一座新迷宫**：`onEnter` 抽一颗新随机种子（`mulberry32` 可复现：
  同一颗种子 = 同一座迷宫，测试就靠这个）。出口在**东北角 / 西北角**随机一座，
  门上有 12 步高的绿色光柱，**隔着迷宫墙也看得到出口在哪个方向**。
- **不能跳跃**（小朋友明确要求）：引擎新增关卡字段 **`noJump: true`** ——
  按 `空格` 不再跳（墙 3 步高，跳也翻不过去），屏幕下方的操作说明同步变成
  「……（这一关不能跳）」。**没写 `noJump` 的关卡行为完全不变**（老关卡照样能跳，回归脚本验证过）。
- **中间有随机怪兽和金币**：8 只方块小怪兽随机撒在离入口 ≥ 8 格的走廊里
  （溜达 / 9 步内一眼看到就追 / 贴到 1.7 步咬一口 —— **只推人不掉血**）；
  **按 `F` 打**（4 血），打死**必掉 3~6 🪙**，**60% 掉一件装备**
  （普通 60% / 稀有 30% / 史诗 10%），拿越好的装备打越疼（空手 1 → 传说 4）。
  场上 18 枚金币，**1/3 故意放在死胡同里**（愿意绕路就有奖励）。
- **3 分钟倒计时**（一进关就开算）；时间到还没走出来 → **不弹失败面板**，
  1.7 秒后自动回小镇重来（和第 5、6 关一个规矩），并记一次 `attempts`。
- **不给全程答案**：前 135 秒**不给**出口箭头（迷宫要自己走才有意思），
  **只剩最后 45 秒**箭头才出现兜底（怕小朋友绕到没脾气）；见 `program/DECISIONS.md` D-011。
- 通关奖励 50 🪙，记「最快一次用时 / 通关次数 / 累计打怪 / 累计捡币」；再进关全部重置。

### 引擎（向后兼容，只加开关）
- `src/engine/player.js`：新增 `player.jumpEnabled`（默认 `true`），
  键盘 `空格`、触屏「跳」按钮、起跳判定三处都加了这个开关 —— **不写就还是能跳**。
- `src/engine/director.js`：`go()` 里按关卡字段 `noJump` 设置 `player.jumpEnabled`，
  并同步屏幕下方那条操作说明。
- `src/engine/ui.js`：新增 `Game.UI.hintBar(jumpEnabled)` 与两条操作说明文案。

### 背景音乐：第 7 关专属曲子《石头迷宫》
- `src/engine/music.js` 的 `TRACKS` 加一首（key = 关卡 id `stone-maze`）：
  **124 bpm / 方波 / soft 鼓点**，小调 + 稀一点的鼓 = 神秘、绕来绕去、带一点点紧张。

### 改了哪些文件
- 新增：`src/levels/stone-maze/props.js`、`src/levels/stone-maze/level.js`、`scripts/test-maze.sh`
- 新增文档：`levels/L07-石头迷宫.md`、`transcripts/2026-10-24-第七关石头迷宫-口述.md`、
  `program/tasks/TC-0008-stone-maze.md`
- 引擎：`src/engine/player.js`、`src/engine/director.js`、`src/engine/ui.js`（`noJump` 开关）、
  `src/engine/music.js`（一首新曲子）、`src/engine/namespace.js`（版本号 2.7.0）
- 清单：`src/levels/index.js` 加一行
- 脚本：`scripts/smoke.sh`、`scripts/test-errors.sh`、`scripts/test-music.sh` 的关卡列表加上这一关；
  `scripts/shots.sh` 加一张 `preview-8-maze.png`
- 文档：本文件、`program/DECISIONS.md`（D-011）、`program/BOARD.md`、`program/ROADMAP.md`、
  `README.md`、`AGENTS.md`、`docs/背景音乐.md`、`levels/README.md`、
  `levels/_ideas/README.md`（顺手把「把绿色踩成白色」的漂移状态改成已落地）

### 验证（全绿）
- `zsh scripts/check.sh` → 47 个 JS 文件语法全通过。
- `zsh scripts/with-server.sh zsh scripts/test-maze.sh` → 0/A~O 全绿
  （登记 / 21 × 21 + 3 分钟 + 只有 1 座出口亮 / **30 颗种子都连通 + 出口走得到 + 外圈不漏** /
  同种子同迷宫 / 每次进关换新迷宫 / **不能跳跃**（迷宫跳不起来、广场照样跳、底部说明跟着变、
  E2 朝墙走 2 秒只挪了 1.2 步且 y 还是 0 —— 既翻不过去也爬不上去）/
  一只 4 下打死 + 掉 3~6 金币 / 3 座迷宫打 24 只掉 11~14 件装备（设计值 60%，小样本会浮动）+
  拿史诗装备一下一只 /
  走过去自动捡金币 / 怪兽会追人会咬人（只推人不掉血、不失败）/ **剩 45 秒才给箭头** /
  藏起来的出口走上去不算通关 / 走到出口通关 + 50 金币 + 存档 / 时间到自动回小镇 + attempts+1 /
  再进关金币怪兽都回来 / 时间预算）。
- `zsh scripts/with-server.sh zsh scripts/regress-all.sh` → 老 4 关全流程通过
  （回广场时门列表 `stone-maze` 是 `locked`，解锁链正常）。
- `zsh scripts/with-server.sh zsh scripts/test-paint.sh`、`test-desert.sh`、`test-arena.sh` → 各关专项全绿
  （跳跃开关与底部说明的引擎改动没有影响老关卡）。
- `zsh scripts/with-server.sh zsh scripts/test-music.sh` → 每关都有曲子，第 7 关是《石头迷宫 124bpm/square/soft ✓》。
- `zsh scripts/with-server.sh zsh scripts/smoke.sh` → 广场 + 7 关逐关进出，任务条正常。
- `zsh scripts/with-server.sh zsh scripts/test-errors.sh` → `errors: []`、`warns: []`。

## v2.6.0 · 2026-10-24

**主题**：新增**第 6 关 · 踩白大草原**（把绿色踩成白色），并给它配了专属背景音乐

### 为什么
- 用户转述小朋友 2026-10-24 的口述（原文见 `transcripts/2026-10-24-第六关把绿色踩成白色-口述.md`）：
  「地板全都是绿色的，我们要把绿色踩成白色……在倒计时结束前，把所有绿色踩成白色。……
  你踩完之后还需要找到正确的传送门才能进入下一关。总共时间为 6 分钟。区域大一些，也是有小马的。
  我们骑的那只马踩的地方等于我们踩的地方范围很大」。
- 这条玩法其实就是 `levels/_ideas/2026-10-23-把绿色踩成白色.md` 那个点子（当时叫「第三关的第二关」），
  这次小朋友讲全了（倒计时 / 找门 / 骑马 / 区域大）→ 落成正式关卡，点子卡标注「已落地」。

### 新增：第 6 关 · 踩白大草原（`src/levels/paint-the-field/`）
- **一整片会变色的草地**：30 × 30 格、一格 2 步 = **900 块**（60 × 60 步），踩过的格子由绿变白。
- **不是 900 个方块 Mesh，而是一张 canvas 贴图**（一格 8 × 8 像素 + `NearestFilter`）：
  只有 1 个 Mesh，踩白一次就是 `fillRect` 一笔 —— 手机 / 老电脑不会掉帧。
  关卡私货放在 `props.js`（`Game.Paint.makeField()` 地板 + `Game.Paint.makeHorse()` 方块小马）。
- **走路踩 1 块，骑马踩 3 × 3 = 9 块**（小朋友说的「骑马踩的地方……范围很大」）。
  骑马沿用第 5 关的套路：走到小马跟前按 `F` 骑上去，`W A S D` 跑，按 `E` 下马。
- **6 分钟倒计时**（一进关就开始）；**踩不完 = 没通关** → 不弹失败面板，1.7 秒后自动回小镇重来
  （和第 5 关同一个规矩），并记一次 `attempts`。
- **全踩白只是前半段**：踩完才停表，草原外面那一圈 **6 座传送门**才亮起来（变绿、牌子换成
  「❓ 不知道通向哪里…」）；**只有 1 座是对的，每次进关重新随机** —— 走错只被弹开 + 提示
  「这扇门不通往下一关……已经试了 N 扇」，不扣金币、不结束。
- **不预置答案**：全踩白之后头顶箭头**收起来**（只指着「最近的绿地」，踩完就没有目标了），
  不指向正确的门（和 D-004 / 第 1 关谜语面板不放图案是同一条理念）。
- 头顶箭头指向「离你最近的那一块绿地」，小朋友不用满场乱找还剩哪里没踩。
- 通关奖励 40 🪙，记「最快一次用时 / 通关次数」；再进关全部重置（地板回绿、门重新锁、马回家）。

### 背景音乐：第 6 关专属曲子《踩白大草原》
- `src/engine/music.js` 的 `TRACKS` 加一首（key = 关卡 id `paint-the-field`）：
  **126 bpm / 三角波 / pop 鼓点**，蹦蹦跳跳的脚步感。没配之前这一关会兜底放 `default`。

### 改了哪些文件
- 新增：`src/levels/paint-the-field/props.js`、`src/levels/paint-the-field/level.js`、`scripts/test-paint.sh`
- 新增文档：`levels/L06-踩白大草原.md`、`transcripts/2026-10-24-第六关把绿色踩成白色-口述.md`、
  `program/tasks/TC-0007-paint-the-field.md`
- 引擎（只加数据）：`src/engine/music.js`（一首新曲子）、`src/engine/namespace.js`（版本号 2.6.0）
- 清单：`src/levels/index.js` 加一行
- 脚本：`scripts/smoke.sh`、`scripts/test-errors.sh`、`scripts/test-music.sh` 的关卡列表加上这一关
- 文档：本文件、`program/DECISIONS.md`（D-010）、`program/BOARD.md`、`program/ROADMAP.md`、
  `README.md`、`AGENTS.md`、`docs/背景音乐.md`、`levels/README.md`、
  `levels/_ideas/2026-10-23-把绿色踩成白色.md`（标注已落地）

### 验证（全绿）
- `zsh scripts/check.sh` → 45 个 JS 文件语法全通过。
- `zsh scripts/with-server.sh zsh scripts/test-paint.sh` → A~L 全绿
  （登记 / 900 块 + 6 分钟 / 走路 1 块 / 骑马 9 块 / 骑马 2 秒 45 块 vs 走路 7 块 /
  射线反推格子号一致 / 全踩白停表 + 6 门全亮 / 走错门弹开 + 计数 / 走对门通关 + 40 金币 /
  没踩完走门被拦住 / 时间到自动回小镇 + attempts+1 / 再进关全部重置 / 时间预算）。
- `zsh scripts/with-server.sh zsh scripts/regress-all.sh` → 老 4 关全流程通过。
- `zsh scripts/with-server.sh zsh scripts/test-desert.sh` → 第 5 关专项全绿（骑马那套没被动过）。
- `zsh scripts/with-server.sh zsh scripts/test-music.sh` → A~J 全绿（第 6 关现在有自己的曲子）。
- `zsh scripts/with-server.sh zsh scripts/smoke.sh` → 广场 + 6 关都能进，任务条都正常。
- `zsh scripts/with-server.sh zsh scripts/test-errors.sh` → `errors: []`、`warns: []`。

---

## v2.5.0 · 2026-10-24

**主题**：加**背景音乐**（每关一首，设置里能开 / 关）

### 为什么
- 用户要求：「增加个背景音乐，你找几个比较合适的背景音乐。然后游戏设置里面可以开启背景音乐，
  也可以关闭背景音乐。加游戏的趣味性」。

### 新增：引擎层 `src/engine/music.js`（`Game.Music`）
- 和音效（`Game.Sfx`）同一个套路：**用 WebAudio 现场合成，零素材、零联网、零版权问题**，
  和「双击 `index.html` 就能玩」的离线要求不冲突。
- 一首曲子 = 4 小节和弦 + 4 小节主旋律 + 一种鼓点循环（约 10 秒一循环），
  数据就是几行「简谱字符串」，家长 / 小朋友想改随时改。
- **每关一首**，曲子 `id` = 关卡 `id`，切关卡自动换曲（关卡代码一个字都不用改）：

  | 曲子 | 用在哪 | 速度 / 音色 / 鼓点 | 感觉 |
  | --- | --- | --- | --- |
  | 方块小镇 | 广场 | 100 / triangle / pop | 轻快、暖暖的 |
  | 谜语森林 | 第 1 关 | 88 / square / soft | 有点神秘 |
  | 宝箱山谷 | 第 2 关 | 112 / square / pop | 蹦蹦跳跳 |
  | 汉字教室 | 第 3 关 | 76 / sine / soft | 安静、专心 |
  | 圆形擂台 | 第 4 关 | 138 / square / tense | 紧张热血 |
  | 沙漠逃亡 | 第 5 关 | 152 / square / exotic | 急促 + 手鼓感 |
  | default | 兜底（新关卡还没配曲子时） | 100 / triangle / pop | 不出戏 |

- 对外接口：`init()` / `play(id)` / `stop()` / `pause()` / `resume()` / `setEnabled()` /
  `toggle()` / `setVolume()` / `current` / `playing` / `tracks`。

### 游戏里怎么开 / 关
- **开始界面**：`🎵 音乐：开 / 关` 按钮（`#musicBtn`，在「声音」旁边）。
- **暂停菜单（Esc）**：`🎵 背景音乐：开 / 关` 按钮（`#pauseMusicBtn`）；
  操作说明里也加了一行提示。
- 开关存在**每个小朋友的存档**里（`settings.music`，默认开），换档案 / 导入存档会一起跟过去；
  老存档（v2.4.x 及以前）载入时自动补上这个字段，**进度一个都不丢**。
- 浏览器不许在小朋友点按钮之前自动出声 → 点「开始冒险」（或从关卡一览点「进去玩」）之后才响
  （`Music.play()` 在此之前只记住该放哪首）。切到别的页签会自动暂停，回来继续；
  打开暂停菜单音乐会暂停，点「继续玩」接着放。

### 改了哪些文件
- 新增：`src/engine/music.js`、`scripts/test-music.sh`、`docs/背景音乐.md`
- 引擎：`index.html`（引入 `music.js` + 两个按钮）、`src/engine/save.js`（`settings.music` + 迁移）、
  `src/engine/director.js`（切关换曲 / 暂停续播）、`src/main.js`（开关按钮 + 首次点击才出声）
- 文档：本文件、`program/DECISIONS.md`（D-009）、`README.md`、`AGENTS.md`、`docs/工作流程.md`、
  `levels/README.md` 与 6 张关卡卡（每关写明用哪首曲子）

### 验证（全绿）
- `zsh scripts/check.sh` → 43 个 JS 文件语法全通过。
- `zsh scripts/with-server.sh zsh scripts/test-music.sh` → A~J 全绿
  （未点按钮不出声 / 每关都有曲子 / 切关换曲 / 兜底 default / 暂停菜单暂停恢复 /
  关掉真的不响且调度器已清 / 存档字段与老存档迁移 / 切页签暂停恢复 / 音量接口）。
- `zsh scripts/with-server.sh zsh scripts/regress-all.sh` → 老 4 关全流程通过。
- `zsh scripts/with-server.sh zsh scripts/test-desert.sh` → 第 5 关专项 14 段全绿。
- `zsh scripts/with-server.sh zsh scripts/test-errors.sh` → `errors: []`、`warns: []`。

---

## v2.4.1 · 2026-10-24

**主题**：把 `levels/` 关卡说明重新对齐游戏源码（**玩法一行没改**）

### 为什么
- 用户指出：`levels/` 里的关卡顺序和描述跟游戏里对不上。**以后一律以源码为准**
  （`src/levels/index.js` 是唯一事实源），见 `program/DECISIONS.md` D-008。

### 改了哪些
- `levels/` 重排成「**一张卡对一关**」，卡号 = 游戏内顺序：
  `L00` 方块小镇广场 / `L01` 谜语森林 / `L02` 宝箱山谷 / `L03` 汉字教室 /
  `L04` 圆形擂台 / `L05` 沙漠逃亡（原 `L06`）。
- 2026-10-23 那批**还没做进游戏的点子**（找风扇 / 把绿色踩成白色 / 装空调 / 第四关待定 / 猜谜语）
  挪到 `levels/_ideas/`，**不再占用 `L01`–`L05` 卡号**。
  其中「猜谜语」标注为**已落地** → 就是游戏里的第 1 关 · 谜语森林。
- `levels/README.md` 重写：总表带上代码 `id` / `order` / 验收脚本，写明编号规则和「一关一机制」判重。
- `levels/answers/README.md`：说明谜语森林的答案在题库文件里，以及「不预置答案」在游戏里怎么落地。
- 规范与流程同步：`docs/关卡设计规范.md`（命名规则 = 游戏内顺序、示例换成真实关卡、
  机制词典拆成「已实现 / 还没实现的点子」两张表）、`docs/工作流程.md`（步骤 4 / 步骤 8 门禁 / 常见分支）、
  `AGENTS.md` 第 3.9 节硬规矩新增第 6 条。
- `transcripts/2026-10-24-第五关沙漠逃亡-口述.md`：**追加**一条「编号已定案」的说明
  （原文一个字没改，遵守「只增不改」）。
- 代码里唯一的变化：`src/levels/desert-escape/level.js` 顶部注释里的卡号 `L06` → `L05`（**只是注释**）。

### 验证
- `zsh scripts/check.sh` → 42 个 JS 文件语法全通过。
- 玩法零改动（没碰任何逻辑），`levels/README.md` 的总表逐行对着 `src/levels/index.js` 核过。

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
- 新增设计卡 `levels/L05-沙漠逃亡.md`（提交时叫 `L06`，v2.4.1 按源码重排成 `L05`；状态：可玩）；
  口述原文归档到 `transcripts/`。
- `levels/README.md` 记录**「第五关」编号冲突**（猜谜语 vs 沙漠，等小朋友拍板；v2.4.1 已按源码定案）。
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

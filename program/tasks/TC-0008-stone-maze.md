# TC-0008 · 第 7 关 · 石头迷宫（随机迷宫 + 不能跳跃 + 打怪掉装备）

| 字段 | 值 |
| --- | --- |
| 卡号 | TC-0008 |
| 状态 | **done**（C3 做完 + C2 的 `noJump` 小改 → 脚本全绿，等小朋友试玩） |
| 角色 | C3 关卡开发（+ C2 引擎：`noJump` 开关） |
| 优先级 | P0 |
| 依赖 | 无（设计卡 `levels/L07-石头迷宫.md` 与代码同天落地） |
| 创建 / 完成 | 2026-10-24 / 2026-10-24 |

---

## TASK（协调官写）

**要做什么**（用户转述的小朋友口述原话）：
「第 7 关 迷宫。设计一个比较大的迷宫， 不能跳跃，保证一定有出口， 有多套迷宫随机。
中中间有随机怪物出现。 需要攻击，杀死后可获得一定金币和装备。 有时间要求走到出口。
中间可以有金币出现。」

**验收标准**：
- [x] 关卡在广场传送门里有入口，`id = stone-maze`，游戏内第 7 个可玩关卡（`order 70`，第 6 关通关后解锁）
- [x] **比较大的迷宫**：21 × 21 格 / 63 × 63 步（10 × 10 迷宫格、一格 3 步）
- [x] **保证一定有出口**：深度优先完美迷宫，脚本用 **30 颗种子**验证 `reached === openCount`、
      两个候选出口 `dist >= 0`、外圈围墙不漏
- [x] **有多套迷宫随机**：每次进关换新种子；同一颗种子 = 同一座迷宫（可复现）
- [x] **不能跳跃**：按 `空格` 不跳（墙 3 步高）；底部操作说明变「（这一关不能跳）」；
      **老关卡照样能跳**（回归脚本验证）；朝墙走 2 秒只挪 1.2 步、`y` 还是 0（爬不上墙）
- [x] **中间有随机怪物**：8 只随机位置（离入口 ≥ 8 格、彼此 ≥ 4 步）、会溜达 / 会追 / 会咬（只推人不掉血）
- [x] **打死获得金币和装备**：必掉 3~6 🪙 + 60% 掉一件装备；拿越好武器打越疼
- [x] **中间有金币**：18 枚，其中 1/3 在死胡同；走过去自动捡（+3 🪙）
- [x] **有时间要求走到出口**：180 秒倒计时；时间到 → 自动回小镇重来，不弹失败面板，`attempts + 1`
- [x] 出口只有 1 座亮着（东北角 / 西北角随机），有绿色光柱隔墙可见；**前 135 秒不给箭头**
- [x] 走到出口 → 通关面板（用时 / 迷宫编号 / 打怪 / 掉装备 / 捡币 / 被咬几口 / 最快一次）+ 50 🪙
- [x] 再进一次关能重新玩（新迷宫 / 倒计时 180 / 金币怪兽都回来）
- [x] `zsh scripts/check.sh` + `zsh scripts/test-maze.sh` + `zsh scripts/regress-all.sh` +
      `zsh scripts/test-paint.sh` + `zsh scripts/test-desert.sh` + `zsh scripts/test-arena.sh` +
      `zsh scripts/test-music.sh` + `zsh scripts/smoke.sh` + `zsh scripts/test-errors.sh` 全过

**允许改的文件**：
- `src/levels/stone-maze/**`
- `src/levels/index.js`（只加一行清单）
- `src/engine/player.js`、`src/engine/director.js`、`src/engine/ui.js`（**只加 `noJump` 开关**，向后兼容）
- `src/engine/music.js`（只加一首曲子数据）、`src/engine/namespace.js`（版本号）
- `scripts/test-maze.sh`、`scripts/smoke.sh`、`scripts/test-errors.sh`、`scripts/test-music.sh`、
  `scripts/shots.sh`（自己的验证脚本）

**不许改的**：`src/content/**`、`index.html`

**玩法设计**（家长 / 小朋友）：见 `levels/L07-石头迷宫.md`（场景 / 道具 / 动作 / 目标 / 规则 / 参数表）。

---

## RECEIPT（执行者写完交回执）

**改了哪些文件**：
- 新增 `src/levels/stone-maze/props.js`：`Game.Maze` —— `mulberry32()`（可复现随机数）、
  `generate()`（深度优先完美迷宫 + 25% 打通死胡同，导出 `isWall/deadEnd/bfs/dist/reached/
  gridToWorld/worldToGrid/lineOfSight`）、`buildWalls()`（**同一行连续的墙合并成一条长条**）、
  `makeMonster()`（方块小怪兽 + 血条 + 名牌）、`makeCoin()`、`clearGroup()`
- 新增 `src/levels/stone-maze/level.js`（关卡主逻辑 + 顶部参数表）
- `src/levels/index.js` 加一行：`{ id:'stone-maze', files:[...props.js, level.js] }`
- **引擎（向后兼容）**：`src/engine/player.js` 加 `jumpEnabled`（默认 true，键盘 / 触屏 / 起跳三处判断）、
  `src/engine/director.js` 的 `go()` 按 `noJump` 设置它并同步底部说明、
  `src/engine/ui.js` 加 `hintBar()` 与两条文案
- `src/engine/music.js`：`TRACKS` 加一首《石头迷宫》（key = `stone-maze`，124 bpm / 方波 / soft）
- `src/engine/namespace.js`：`Game.version` → `2.7.0`
- 新增 `scripts/test-maze.sh`；`scripts/smoke.sh`、`scripts/test-errors.sh`、`scripts/test-music.sh`
  的关卡列表加上这一关；`scripts/shots.sh` 加 `preview-8-maze.png`
- 新增 `levels/L07-石头迷宫.md`、`transcripts/2026-10-24-第七关石头迷宫-口述.md`
- `levels/README.md`、`levels/_ideas/README.md`（顺手修「把绿色踩成白色」的漂移状态）
- `program/CHANGELOG.md`（v2.7.0）、`program/DECISIONS.md`（D-011）、`program/ROADMAP.md`、
  `program/BOARD.md`、`README.md`、`AGENTS.md`、`docs/背景音乐.md`

**怎么验证的**（命令 + 关键输出）：

```bash
cd /Users/xiao/workspace/mycraft-bestxiao
zsh scripts/check.sh                                    # OK：47 个 JS 文件语法检查全部通过
zsh scripts/with-server.sh zsh scripts/test-maze.sh
zsh scripts/with-server.sh zsh scripts/regress-all.sh
zsh scripts/with-server.sh zsh scripts/test-paint.sh
zsh scripts/with-server.sh zsh scripts/test-desert.sh
zsh scripts/with-server.sh zsh scripts/test-arena.sh
zsh scripts/with-server.sh zsh scripts/test-music.sh
zsh scripts/with-server.sh zsh scripts/smoke.sh
zsh scripts/with-server.sh zsh scripts/test-errors.sh
```

`test-maze.sh` 关键输出（0/A~O 全绿）：
- 登记：`{id:"stone-maze",名字:"石头迷宫",第几关:"第 7 关",order:70,不能跳跃:true,在关卡清单第几位:7,一共几关:7}`
- 进关：`{迷宫:"21×21 格",世界范围:"63×63 步",能走的格子:205,墙图元:"126 条（合并过的）",
  倒计时:180,亮着的出口:1,怪兽:8,金币:18}`
- **连通性**：`{试了:"30 颗种子",连通性有问题:[],出口走不到:[],外圈漏水:[]}`
- 复现性：`{同一个种子指纹一样:true,不同种子指纹不一样:true}`；进 6 次：`{不同的编号:6,不同的迷宫:6}`
- **不能跳跃**：`{广场里还能跳:true,广场里跳到的高度:1.62,迷宫里的跳跃被关掉了:true,迷宫里跳到的高度:0,
  迷宫底部说明:true}`
- **朝墙走**：`{墙高:3,能自动迈上去的高度:0.78,朝墙走了几步:1.2,爬上去的高度:0,还在原来的格子里:true}`
- 打怪兽：`{血条满格:4,打一下剩:3,一共打了几下:4,这只倒下了:true,这一只掉的金币:4}`
- 掉装备：`{逛了几座迷宫:3,打死:"24 只",掉了:"11 件装备",实测掉率:"46%",设计掉率:"60%"}`
  （24 只的小样本，允许上下浮动；拿史诗装备时 `一下打完:true`）
- 捡金币：`{捡到几枚:1,加了金币:3,这枚收下了:true,还挂在场上吗:false,这枚在死胡同里:true}`
- 怪兽追人咬人：`{发现小朋友:true,追到最近的:"0 步",被咬:"2 口",整个人被推开过:true,
  关卡失败了吗:false,通关了吗:false}`
- **45 秒才给箭头**：`{一开始不给箭头:true,剩44秒开始给箭头:true,箭头指着出口:true}`
- 藏起来的出口：`{这扇门亮着没:false,通关了吗:false,还在继续吗:true}`
- 通关：`{通关了:true,面板:"🧭 走出迷宫",奖励金币:50,通关次数:1,这一关算通关了吗:"done"}`
- 时间到：`{时间到:true,正在离开:true,重来了几次:1}` → 2.6 秒后 `{现在在:"hub-square"}`
- 再进关：`{两次的迷宫编号不同:true,倒计时:180,金币:18,怪兽:8,通关状态清了:true}`
- 时间预算：`{这一座的最短路:"121 格 = 363 步 ≈ 59 秒",限时:"180 秒",留的余量:"还有 121 秒"}`

其它脚本：
- `regress-all.sh` → 老 4 关全流程通过；回广场时门列表
  `[[riddle-forest,done],[chest-valley,done],[hanzi-classroom,done],[arena-battle,done],
  [desert-escape,open],[paint-the-field,locked],[stone-maze,locked]]`（解锁链正常）。
- `test-paint.sh` → 第 6 关 A~L 全绿；`test-desert.sh` → 第 5 关全绿；
  `test-arena.sh` → 第 4 关全绿（跳跃开关 / 底部说明的引擎改动没有影响老关卡）。
- `test-music.sh` → 每关都有曲子，第 7 关是《石头迷宫 124bpm/square/soft ✓》。
- `smoke.sh` → 广场 + 7 关逐关进出，第 7 关任务条
  `「🧭 找到迷宫出口！（这一关不能跳） 还剩 2:58 · 怪兽 0/8 · 金币 0」`。
- `test-errors.sh` → `errors: []`、`warns: []`。

**遗留问题 / 下次再做**：
- **等小朋友试玩**：3 分钟 / 63 × 63 步 / 8 只怪兽 / 45 秒才给箭头 —— 四个数值都是**猜**的
  （见设计卡「待确认」）。
- 掉装备 60% 会让全局背包变多，**间接影响第 4 关的武器强度**（第 8 关之后要留意整体平衡）。
- 「迷宫里找钥匙（打倒怪兽掉钥匙 → 开锁门）」这条点子只做了一半（现在只有"走出迷宫"）。
- `scripts/regress-all.sh` 还是只回归老 4 关；第 5~7 关各有专项脚本，
  要不要串进一条「一条命令跑全部」的总回归，下次决定。
- 迷宫墙是「同一行合并成长条」，21 行约 110~130 条 Mesh + 同样数量的碰撞盒；
  迷宫再大就要换画法（贴图 / 实例化）。

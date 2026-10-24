# TC-0009 · 第 8 关 · 风扇小屋（缩小能力 + 跨关卡借充电器 + 通电通关）

| 字段 | 值 |
| --- | --- |
| 卡号 | TC-0009 |
| 状态 | **done**（C3 做完 + C2 的 `shrink` / 全局开关小改 → 脚本全绿，等小朋友试玩） |
| 角色 | C3 关卡开发（+ C2 引擎：缩小能力、全局开关、充电器道具） |
| 优先级 | P0 |
| 依赖 | 无（设计卡 `levels/L08-风扇小屋.md` 与代码同天落地） |
| 创建 / 完成 | 2026-10-24 / 2026-10-24 |

---

## TASK（协调官写）

**要做什么**（用户转述的小朋友口述原话）：
「第8关。我们要把风扇装进旁边的小房子里面。但是我们有一个充电器，万一找不到的话，
就可以回主世界去找一下。如果找到了，就回到那个地方去。如果你还是找不到，还是可以重新去找一下下。
找到以后，就要直接装到房间里去充电。要是没装的话，你就过不了关。
这是一个小的，我们可以用缩小能力，进去看看里面的样子。
前面又有一个白色的空调位置。但如果你把它装进去了，也没找到空调充电器，那就不用找它了，
万一它本来就是有电的呢？那个房间有一个门。也有窗户。」

**验收标准**：
- [x] 关卡在广场传送门里有入口，`id = fan-cottage`，游戏内第 8 个可玩关卡（`order 80`，第 7 关通关后解锁）
- [x] **一栋有门有窗的小房子**（12 × 10 步外墙、墙高 3.4、屋檐挑出 1.2；南面门 + 两扇窗、东面一扇窗）
- [x] **缩小能力**：按 `R`（手机点「小」）变小 / 变回来 —— 身高 1.8 → 0.6、碰撞盒半径 0.34 → 0.16、
      模型缩放 0.34、镜头 9 → 3、走路 6.2 → 3.4 步每秒；**没写 `shrink` 的关卡按 R 无效**
- [x] **门太小**：门洞 2.4 × 1.2 步 —— 大个子朝门走 2 秒**停在门口进不去**（z≈-2.66）、
      变小以后**直接走进屋**（z≈-10.1）
- [x] **风扇要自己找**：藏在小屋**后面**（旁边两个木箱 + 牌子）；**没找到之前不给头顶箭头**
- [x] **充电器回主世界找**：广场**东边工具台**按 `E` 借（写全局开关 `hasCharger`）；
      **来回跑几趟都行**（风扇装好之后回广场，风扇还留在屋里）
- [x] **装进房间**：屋里地上的蓝圈（风扇位）按 `E` 装上 → 「可是没有电…」
- [x] **充电通电 = 通关**：插上充电器 → 风扇转起来 + 拉电线 + 吊灯亮 + 通关面板 + 60 🪙
- [x] **不装就过不了关**（小朋友的硬规则）：没风扇 / 没装 / 没通电，三种情况都**不通关**，
      提示各不相同
- [x] **空调位自己亮**（彩蛋）：通电那一刻空调位变色 + 冒冷气片 + 牌子换字，**不用**找空调充电器
- [x] 再进一次关能重新玩（上一局通过电 → 全部重置、风扇回屋后、进场是大个子）
- [x] 有 `ctx.returnPortal(...)`（回小镇的传送门，放在出生点侧面，不在镜头正后方）
- [x] `zsh scripts/check.sh` + `zsh scripts/test-cottage.sh` + `zsh scripts/regress-all.sh` +
      `zsh scripts/test-desert.sh` + `zsh scripts/test-paint.sh` + `zsh scripts/test-arena.sh` +
      `zsh scripts/test-maze.sh` + `zsh scripts/test-music.sh` + `zsh scripts/smoke.sh` +
      `zsh scripts/test-errors.sh` 全过

**允许改的文件**：
- `src/levels/fan-cottage/**`、`src/levels/hub-square/level.js`（加「工具台」小节 + 任务条那一句）
- `src/levels/index.js`（只加一行清单）
- `src/engine/player.js`、`src/engine/director.js`、`src/engine/ui.js`、`src/engine/entities.js`、
  `src/engine/save.js`（**只加 `shrink` / 全局开关 / 充电器道具**，向后兼容）
- `src/engine/music.js`（只加一首曲子数据）、`src/engine/namespace.js`（版本号）
- `index.html`、`src/style.css`（只加触屏「小」按钮）
- `scripts/test-cottage.sh`、`scripts/smoke.sh`、`scripts/test-errors.sh`、`scripts/test-music.sh`、
  `scripts/shots.sh`（自己的验证脚本）

**不许改的**：`src/content/**`

**玩法设计**（家长 / 小朋友）：见 `levels/L08-风扇小屋.md`（场景 / 道具 / 动作 / 目标 / 规则 / 参数表）。

**上游点子**：`levels/_ideas/2026-10-23-找风扇装进小房子.md` + `2026-10-23-给小房子装空调.md`
（这一关把两个老点子一起落地了，卡里都标了「已落地」）。

---

## RECEIPT（执行者写完交回执）

**改了哪些文件**：
- 新增 `src/levels/fan-cottage/props.js`：`Game.FanCottage` —— `makeHouse()`（三面墙 + 南墙留门洞 +
  屋顶 + 窗 + 开的门板 + 木地板 + 地毯 + 桌椅 + 墙架 + 风扇位蓝圈 + 插座 + 空调位 + 吊灯，
  返回 `door / fanSpot / socket / acSpot / inside() / powerOn()`）、`makeSocket()`、`makeFan()`
  （底座 + 杆 + 头 + 四叶片 + 铁丝罩，通电会转）、`makeCable()`
- 新增 `src/levels/fan-cottage/level.js`（关卡主逻辑 + 顶部参数表 + 四个 `ctx.interact`）
- `src/levels/index.js` 加一行：`{ id:'fan-cottage', files:['levels/fan-cottage/props.js','levels/fan-cottage/level.js'] }`
- `src/levels/hub-square/level.js`：新增 `TOOLBOX`（东边工具台，借充电器）、`buildToolBench()`、
  `borrowCharger()`、`objective()` 里的充电器分支、村长台词多一句
- **引擎（向后兼容）**：`src/engine/player.js` 加缩小能力（`setShrinkEnabled/toggleShrink/setSmall/
  eyeHeight/camMin/camMax` + 键盘 `R` + 触屏「小」）；`src/engine/director.js` 的 `go()` 按 `shrink` 设置；
  `src/engine/ui.js` 的 `hintBar({jump,shrink})`（老写法兼容）；`src/engine/save.js` 加
  `flag()/setFlag()`；`src/engine/entities.js` 加 `Game.makeCharger()`；`index.html` + `src/style.css`
  加「小」按钮
- `src/engine/music.js`：`TRACKS` 加一首《风扇小屋》（key = `fan-cottage`，106 bpm / 三角波 / soft）
- `src/engine/namespace.js`：`Game.version` → `2.8.0`
- 新增 `scripts/test-cottage.sh`；`scripts/smoke.sh`、`scripts/test-errors.sh`、`scripts/test-music.sh`
  的关卡列表加上这一关；`scripts/shots.sh` 加 `preview-9-cottage.png`
- 新增 `levels/L08-风扇小屋.md`、`transcripts/2026-10-24-第八关风扇小屋-口述.md`
- `levels/README.md`、`levels/_ideas/README.md`、`levels/_ideas/2026-10-23-找风扇装进小房子.md`、
  `levels/_ideas/2026-10-23-给小房子装空调.md`
- `program/CHANGELOG.md`（v2.8.0）、`program/DECISIONS.md`（D-012）、`program/ROADMAP.md`、
  `program/BOARD.md`、`README.md`、`AGENTS.md`、`docs/背景音乐.md`、`docs/关卡设计规范.md`

**怎么验证的**（命令 + 关键输出）：

```bash
cd /Users/xiao/workspace/mycraft-bestxiao
zsh scripts/check.sh                                      # OK：49 个 JS 文件语法检查全部通过
zsh scripts/with-server.sh zsh scripts/test-cottage.sh
zsh scripts/with-server.sh zsh scripts/regress-all.sh
zsh scripts/with-server.sh zsh scripts/test-desert.sh
zsh scripts/with-server.sh zsh scripts/test-paint.sh
zsh scripts/with-server.sh zsh scripts/test-arena.sh
zsh scripts/with-server.sh zsh scripts/test-maze.sh
zsh scripts/with-server.sh zsh scripts/test-music.sh
zsh scripts/with-server.sh zsh scripts/smoke.sh
zsh scripts/with-server.sh zsh scripts/test-errors.sh
```

`test-cottage.sh` 关键输出（0/A~K 全绿）：
- 登记：`{id:"fan-cottage",名字:"风扇小屋",第几关:"第 8 关",order:80,能变小:true,
  在关卡清单第几位:8,一共几关:8,门洞:"2.4×1.2 步",大个子身高:1.8}`
- 进关：`{房子:"外框 12×10，中心 (0, -8)",风扇藏在小屋后面:{x:3.4,z:-15.8},
  风扇位:{x:-4.1,z:-8},空调位:{x:5.2,z:-8},屋里通电了吗:false,能变小:true,现在是小人吗:false,
  任务条:"🌀 听说风扇被风刮到小屋后面去了，绕过去找一找～",给了头顶箭头吗:false}`
- **缩小能力**：`{大个子:{身高:1.8,碰撞盒半径:0.34,模型缩放:1,镜头距离:9,一秒走了:6.2},
  变小以后:{变小了:true,身高:0.6,碰撞盒半径:0.16,模型缩放:0.34,镜头距离:3,一秒走了:3.4,
  镜头看着的高度:0.5,变小了才钻得进门洞:true},变回来:{又变回来了:true,身高:1.8}}`
- **广场里按 R 无效**：`{广场能变小:false,按R变成小人了吗:false,底部说明里有变小两个字:false}`
- **门太小**：`{门洞高:1.2,大个子身高:1.8,大个子走完停在哪:[0,0,-2.66],大个子进屋了吗:false,
  变小以后走完在哪:[0,0,-10.14],变小以后进屋了吗:true}`
- 找风扇 + 门口变小：`{拿到风扇了吗:true,屋后还立着吗:false,
  提示:"🌀 唰——变小啦！走进去看看小屋里面吧（再按 R 可以变回来）"}`
- **不装就过不了关**：`{①没风扇就按:{装上了没:false,通关了:false},
  ②装上风扇:{装上了:true,通电了吗:false,通关了:false,提示:"🌀 风扇装好啦！可是没有电…"},
  ③没充电器再按:{还是没通电:false,通关了:false}}`
- **回主世界借充电器**：`{现在在哪:"hub-square",任务条:"🔌 风扇小屋还缺一个充电器，广场东边的工具台上就能借到！",
  头顶箭头指向工具台吗:true}` → `{全局开关:true}`
- **通电通关**：`{通电了:true,通关了:true,结算面板:"🌀 小屋通电啦",面板里讲到空调:true,
  风扇转起来了吗:true,电线拉出来了吗:true,吊灯亮了:true,空调位自己亮了:true,奖励金币:60}`
- 再进关重摆：`{风扇回到屋后了吗:true,存档里的 powered 清了吗:true}`
- 来回跑几趟：`{跑一趟广场再回来:{回来以后风扇还装着吗:true,回来是大个子吗:true,
  拿到充电器了吗:true},第二次也通电通关了:true}`
- 回广场传送门：`{按E回广场以后在哪:"hub-square",传送门离出生点:8}`
- 时间预算：`{总步数:184,纯走路秒数:31,设计目标:"5 分钟左右"}`

其它脚本：
- `regress-all.sh` → 老 4 关全流程通过；回广场时门列表
  `[...,[stone-maze,done],[fan-cottage,locked]]`（解锁链正常）。
- `test-desert.sh` / `test-paint.sh` / `test-arena.sh` / `test-maze.sh` → 第 5/6/4/7 关专项全绿
  （缩小能力、全局开关的引擎改动没有影响老关卡）。
- `test-music.sh` → 每关都有曲子，第 8 关是《风扇小屋 106bpm/triangle/soft ✓》。
- `smoke.sh` → 广场 + 8 关逐关进出，第 8 关任务条
  `「🌀 听说风扇被风刮到小屋后面去了，绕过去找一找～」`。
- `test-errors.sh` → `errors: []`、`warns: []`。

**遗留问题 / 下次再做**：
- **等小朋友试玩**：门洞 1.2 步 / 缩小倍率 0.34 / 风扇藏屋后 / **不限时** —— 四个都是**猜**的
  （见设计卡「待确认」）。
- **全局开关只有 `hasCharger` 一个**：以后跨关卡任务道具多了要升级结构（见 D-012 第 ③ 条），
  现在**不提前抽象**。
- **空调位只是彩蛋**：走近按 `E` 会说一句「它本来就有电」，但**没有**真正的制冷效果
  （要不要做「屋里变凉」的视觉，等小朋友试玩后决定）。
- **屋顶不投影**（`cast:false`）是「让屋里别太黑」的取巧做法：外面看着一样，
  但技术上意味着阳光能穿过屋顶照进屋里。如果以后做「夜晚 / 室内光」的系统，要把这条记起来。
- `scripts/regress-all.sh` 还是只回归老 4 关；第 5~8 关各有专项脚本，
  要不要串一条「一条命令跑全部」的总回归，下次决定。
- `work/` 里的临时探针脚本（`work/probe*.sh`）不进版本库，随用随删。

---

## QA（测试角色写，等小朋友试玩后补）

| 项 | 结论 |
| --- | --- |
| 脚本全绿 | ✅ 10 个脚本全过（见上） |
| 小朋友试玩 | ⬜ 还没试 |
| 结论 | ⬜ 待定 |

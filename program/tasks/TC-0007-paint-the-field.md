# TC-0007 · 第 6 关 · 踩白大草原（把绿色踩成白色）

| 字段 | 值 |
| --- | --- |
| 卡号 | TC-0007 |
| 状态 | **done**（C3 做完 → C5 脚本全绿，等小朋友试玩） |
| 角色 | C3 关卡开发 |
| 优先级 | P0 |
| 依赖 | 无（设计卡 `levels/L06-踩白大草原.md` 与代码同天落地） |
| 创建 / 完成 | 2026-10-24 / 2026-10-24 |

---

## TASK（协调官写）

**要做什么**（用户转述的小朋友口述原话）：
「地板全都是绿色的，我们要把绿色踩成白色，需要在倒计时结束前，把所有绿色踩成白色。
如果你没有踩完，那么就等于你没有通关；但是你踩完之后还需要找到正确的传送门才能进入下一关。
总共时间为6分钟。区域大一些，也是有小马的。我们骑的那只马踩的地方等于我们踩的地方范围很大」

**验收标准**：
- [x] 关卡在广场传送门里有入口，`id = paint-the-field`，游戏内第 6 个可玩关卡（`order 60`，第 5 关通关后解锁）
- [x] 进关就是一整片 **900 块**绿地板（60 × 60 步），踩过的格子变白
- [x] 走路一次踩白 **1 块**；骑马一次 **3 × 3 = 9 块**（小朋友说的「范围很大」）
- [x] 按 F 骑上最近的马、WASD 控制、按 E 下马；骑马 12 步/秒 > 走路 6.2 步/秒
- [x] 踩白的位置和脚下**真的对齐**（用射线打地板反推格子号做过校验）
- [x] **6 分钟倒计时**（一进关就开算）；全踩白后**停表**
- [x] **踩不完 = 没通关**：时间到 → **自动回小镇**，不弹失败面板，`attempts + 1`
- [x] 全踩白之后外圈 **6 座传送门**才亮；**只有 1 座对**，每次进关重新随机
- [x] 走错门：只弹开 + 提示「已经试了 N 扇」，不扣金币、不结束
- [x] 走对门：通关面板（用时 / 试了几扇 / 骑马几次 / 最快一次）+ 40 🪙
- [x] **不给答案**：全踩白之后头顶箭头收起来，不指向正确的门
- [x] 再进一次关能重新玩（地板回绿 / 倒计时 360 / 门重新锁 / 马回家 / 正确的门重新随机）
- [x] `zsh scripts/check.sh` + `zsh scripts/test-paint.sh` + `zsh scripts/regress-all.sh` + `zsh scripts/smoke.sh` + `zsh scripts/test-errors.sh` 全过

**允许改的文件**：
- `src/levels/paint-the-field/**`
- `src/levels/index.js`（只加一行清单）
- `scripts/test-paint.sh`、`scripts/smoke.sh`、`scripts/test-errors.sh`、`scripts/test-music.sh`（自己的验证脚本）

**不许改的**：`src/content/**`、`index.html`（要改先发 CHANGE 卡）

**玩法设计**（家长 / 小朋友）：见 `levels/L06-踩白大草原.md`（场景 / 道具 / 动作 / 目标 / 规则 / 参数表）。

---

## RECEIPT（执行者写完交回执）

**改了哪些文件**：
- 新增 `src/levels/paint-the-field/props.js`：`Game.Paint.makeField()`（canvas 贴图地板，900 块绿/白）
  + `Game.Paint.makeHorse()`（方块小马：腿会摆、有鞍和「按 F 骑上去」的牌子）—— 关卡私货，不依赖第 5 关
- 新增 `src/levels/paint-the-field/level.js`（关卡主逻辑 + 顶部参数表）
- `src/levels/index.js` 加一行：`{ id:'paint-the-field', files:['levels/paint-the-field/props.js','levels/paint-the-field/level.js'] }`
- `src/engine/music.js`：`TRACKS` 加一首《踩白大草原》（key = `paint-the-field`，126 bpm / 三角波 / pop）
- `src/engine/namespace.js`：`Game.version` → `2.6.0`
- 新增 `scripts/test-paint.sh`；`scripts/smoke.sh`、`scripts/test-errors.sh`、`scripts/test-music.sh` 的关卡列表加上这一关
- 新增 `levels/L06-踩白大草原.md`、`transcripts/2026-10-24-第六关把绿色踩成白色-口述.md`
- `levels/README.md`、`levels/_ideas/2026-10-23-把绿色踩成白色.md`（标注已落地）
- `program/CHANGELOG.md`（v2.6.0）、`program/DECISIONS.md`（D-010）、`program/ROADMAP.md`、`program/BOARD.md`、`README.md`、`AGENTS.md`、`docs/背景音乐.md`

**怎么验证的**（命令 + 关键输出）：

```bash
cd /Users/xiao/workspace/mycraft-bestxiao
zsh scripts/check.sh                                    # OK：45 个 JS 文件语法检查全部通过
zsh scripts/with-server.sh zsh scripts/test-paint.sh
zsh scripts/with-server.sh zsh scripts/regress-all.sh
zsh scripts/with-server.sh zsh scripts/test-desert.sh
zsh scripts/with-server.sh zsh scripts/test-music.sh
zsh scripts/with-server.sh zsh scripts/smoke.sh
zsh scripts/with-server.sh zsh scripts/test-errors.sh
```

`test-paint.sh` 关键输出（A~L 全绿）：
- 登记：`{清单里有:true,名字:"踩白大草原",第几关:"第 6 关",id:"paint-the-field",order:60,解锁:true}`
- 进关：`{总块数:900,场地边长:60,格子边长:2,倒计时:360,门有几扇:6,最近的马:"8 步",出生点在地板外面:true}`
- 走路一脚：`{踩白了几块:1}`；骑马一脚：`{骑上了:true,这次踩白:9,马背高度:1.6}`
- 同样跑 2 秒：走路 `7 块` / 骑马 `跑了 24 步、踩白 45 块`
- **对齐校验**：`{关卡认为的格子:[9,18],射线算出的格子:[9,18],一致:true,这块白了吗:true}`
- 全踩白：`{全白:true,踩白块数:900,倒计时还在走:false,门都亮了:true}`
- 走错门：`{走错次数:1,通关了没:false,被弹开:true,门已经亮了:true}`
- 走对门：`{通关了:true,面板:"🎨 全踩白 + 找到门",金币:40}`
- 没踩完走门：`{通关了没:false,门还锁着:true,被拦住:true,还剩几块:900}`
- 时间到：`{时间到:true,正在离开:true,尝试次数:1}` → 2.6 秒后 `{现在在:"hub-square"}`
- 再进关：`{倒计时:360,踩白块数:0,全白:false,门锁着:true,马在不在家:true,马牌回来:true}`
- 时间预算：`{走路扫一遍:"30 趟 × 60 步 = 1800 步 ≈ 290 秒",骑马扫一遍:"10 趟 × 60 步 = 600 步 ≈ 50 秒",限时秒:360}`

其它脚本：
- `regress-all.sh` → 老 4 关全流程通过；回广场时门列表是
  `[[riddle-forest,done],[chest-valley,done],[hanzi-classroom,done],[arena-battle,done],[desert-escape,open],[paint-the-field,locked]]`
  （顺序、解锁关系都对）。
- `test-desert.sh` → 第 5 关 14 段全绿（骑马那套没被动过）。
- `test-music.sh` → 每关都有曲子，第 6 关是《踩白大草原 126bpm/triangle/pop ✓》。
- `smoke.sh` → 广场 + 6 关逐关进出，任务条正常。
- `test-errors.sh` → `errors: []`、`warns: []`。

**遗留问题 / 下次再做**：
- **等小朋友试玩**：900 块 / 6 分钟够不够？6 座门里找 1 座会不会烦？（见设计卡「待确认」）
- 白地板在阳光下有点偏灰，要不要调更亮（`props.js` 的 `P.WHITES`）。
- `scripts/regress-all.sh` 还是只回归老 4 关；第 5、6 关各有自己的专项脚本，要不要串进回归，下次决定。
- 首次给这一关配的背景音乐是「蹦蹦跳跳」的，小朋友要是觉得不好听，改 `TRACKS` 里的数据即可。

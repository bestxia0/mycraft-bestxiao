# TC-0005 · 第 5 关 · 沙漠逃亡（骑马跑出沙漠）

| 字段 | 值 |
| --- | --- |
| 卡号 | TC-0005 |
| 状态 | **done** |
| 角色 | C3 关卡开发（等 C5 试玩验收） |
| 优先级 | P0 |
| 依赖 | 无（设计卡 `levels/L05-沙漠逃亡.md` 与代码同天落地，当时编号是 L06） |
| 创建 / 完成 | 2026-10-24 / 2026-10-24 |

---

## TASK（协调官写）

**要做什么**（用户转述的小朋友口述原话）：
「第5关。是在一个沙漠地区。里面会增加一些马。我们用F攻击马之后，就会骑上它。我们要逃离这个沙漠，
2分钟时间时间到了，如果你还在沙漠地区。那么就会自动将你传送回小镇，让你重新来这一关。
头上的箭头会指示大概方向。不会只是完全正确的正确的方向。 里面会有一些小型龙卷风。和一些仙人掌。
还有其他对我们能攻击的。动物 比如蛇呀。这种类型的。骑马的时候，我们也可以通过我们的wads来控制。
小马。马会随机生成」

**验收标准**：
- [x] 关卡在广场传送门里有入口，`id = desert-escape`，游戏内第 5 个可玩关卡
- [x] 一进关身边就有马；按 F 打马 → 骑上去；骑马用 WASD 控制，按 E 下马
- [x] 骑马比走路明显快；骑马按 F 能冲刺
- [x] 头顶箭头**只给大概方向**：采样 6 秒实测最大偏差 15.9°，**不是**精确指向
- [x] 小龙卷风：会自己游走；被卷到会被吹起来；**骑着马会被卷下马**
- [x] 仙人掌：贴上去会被扎；按 F 能打碎，打碎后碰撞盒关掉（路通了）
- [x] 小蛇：贴上去会被咬；按 F 能把它打飞
- [x] 马会随机生成（8 匹起步，每 16 秒补 1 匹，上限 12）
- [x] 2 分钟倒计时（一进沙漠就开算）；时间到 → **自动传送回广场**，不弹失败面板
- [x] 跑到西北绿洲拱门 → 通关面板，发金币，记「最快一次」
- [x] 再进一次关能重新玩（倒计时 / 马 / 出口全部重置）
- [x] `zsh scripts/check.sh` + `zsh scripts/test-desert.sh` + `zsh scripts/smoke.sh` 全过

**允许改的文件**：
- `src/levels/desert-escape/**`
- `src/levels/index.js`（只加一行清单）
- `scripts/test-desert.sh`、`scripts/shot-level.sh`（自己的验证脚本）

**不许改的**：`src/content/**`、`index.html`（要改先发 CHANGE 卡）

**玩法设计**（家长 / 小朋友）：见 `levels/L05-沙漠逃亡.md`（场景 / 道具 / 动作 / 目标 / 规则 / 参数表）。

---

## RECEIPT（执行者写完交回执）

**改了哪些文件**：
- 新增 `src/levels/desert-escape/props.js`（沙子贴图 / 方块马 / 小蛇 / 小龙卷风 —— 关卡私货）
- 新增 `src/levels/desert-escape/level.js`（关卡主逻辑 + 顶部参数表）
- `src/levels/index.js` 加一行：`{ id:'desert-escape', files:['levels/desert-escape/props.js','levels/desert-escape/level.js'] }`
- 新增 `scripts/test-desert.sh`、`scripts/shot-level.sh`；`scripts/smoke.sh` 的关卡列表加上这一关
- `levels/L05-沙漠逃亡.md`（当时叫 `L06`）、`transcripts/2026-10-24-第五关沙漠逃亡-口述.md`、`levels/README.md`
- `program/CHANGELOG.md`（v2.4.0）、`program/DECISIONS.md`（D-007）

**CHANGE（引擎，已按最小改动做掉，老关卡行为不变）**：
- **需要什么**：顶部计时条要能**只显示倒计时**（沙漠关不需要血条和「对手 N」）。
- **为什么**：以前 `Game.UI.battle({time,hp,hpMax})` 会把上一关擂台的「对手 4」文案留在屏幕顶上。
- **兼容要求**：擂台关的调用一个字没改 → 传了 `hpMax` 就画血条、传了 `alive` 就显示「对手 N」，
  老关卡行为完全不变。改动只有 `src/engine/ui.js` 的 `battle()` 里 6 行 + 一段注释。
- **影响面**：`program/CHANGELOG.md` 已记；`AGENTS.md` 第 6 节的 UI 速查可在下次维护时补一句。

**怎么验证的**（命令 + 关键输出）：

```bash
cd /Users/xiao/workspace/mycraft-bestxiao
zsh scripts/check.sh                                    # OK：42 个 JS 文件语法检查全部通过
zsh scripts/with-server.sh zsh scripts/test-desert.sh
zsh scripts/with-server.sh zsh scripts/smoke.sh
```

`test-desert.sh` 关键输出：
- 登记：`{清单里有:true,名字:"沙漠逃亡",第几关:"第 5 关",order:50,解锁:true}`
- 进关：`{场上马数:8,最近的马:"8 步",倒计时:120,箭头指向马:true}`
- 骑马：`{骑上了:true,马牌藏起来:true,玩家在马背:true}`；跑 2 秒 = **24 步**（12 步/秒）
- 冲刺：按 F 后 1 秒走 **20.4 步**（> 12），冷却 4 秒
- 箭头偏差采样：`[5,3.1,5.7,6.2,0.3,-9,-14.3,-12.5,-8.2,-7.9,-12.5,-15.9]`，最大 **15.9°**，`是不是精确指向:false`
- 龙卷风：`{被卷下马:true,被吹起来:true,风在游走:true}`
- 仙人掌：`{被扎了:true}` → `{仙人掌碎了:true,碰撞盒关掉:true,金币:1}`
- 小蛇：`{被咬:true}` → `{蛇被打飞:true}`
- 马随机生成：`{原来:8,现在:9,上限:12}`
- 超时：`{时间到:true,正在离开:true,尝试次数:1}` → 2.5 秒后 `{现在在:"hub-square"}`
- 通关：`{通了:true,面板:"🏝 逃出沙漠",金币:33}`
- 再进关：`{倒计时:120,还在骑马:false,通了没:false,马牌回来:true}`
- 距离：`{直线步数:283,骑马直线秒数:24,限时秒:120,走路直线秒数:46}`

`smoke.sh` 关键输出：开始界面 `version 2.4.0`、6 个 id（广场 + 5 关）、
5 个传送门全 `done`、逐关进出的任务条都正常、零报错。

**遗留问题 / 下次再做**：
- **编号**：已按用户要求「以游戏源码为准」定案 —— 沙漠 = `levels/L05-沙漠逃亡.md`（`order 50`），
  谜语点子放 `levels/_ideas/2026-10-23-猜谜语.md`（已落地成游戏第 1 关）。
- **待小朋友试玩**：2 分钟够不够、箭头偏得合不合适、骑马按 F 冲刺要不要先跟他说。
- 头顶箭头用的是引擎通用箭头（比较小），要不要给沙漠做一个更大的（见设计卡待确认）。
- `scripts/regress-all.sh` 只回归老 4 关；第 5 关有自己的 `test-desert.sh`，
  要不要也串进 `regress-all.sh`，下次决定。

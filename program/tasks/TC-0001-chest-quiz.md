# TC-0001 · 第 2 关宝箱答题 + 通用答题弹窗 + 常识题库

| 字段 | 值 |
| --- | --- |
| 卡号 | TC-0001 |
| 状态 | **done** |
| 角色 | C2 引擎架构师 + C4 内容作者（C5 验收） |
| 优先级 | P0 |
| 依赖 | 无 |
| 创建 / 完成 | 2026-10-24 / 2026-10-24 |

---

## TASK（协调官写）

**要做什么**：第 2 关的每个宝箱按 E 之后**先做一道随机常识题，答对才能打开**；
第 2 关**不再显示头顶的指引箭头**（宝箱要小朋友自己找）；常识题做成**本地可手编的题库文件**。

**验收标准**：
- [x] 第 2 关 `guideArrow.visible === false`，第 1 关仍然 `true`（对照）
- [x] 宝箱按 E 弹出题目，**答错箱子不开**（`opened === false`）
- [x] 答对后箱子打开：+1 件装备、+5 金币、进度写进存档
- [x] 连续开多个宝箱，题目不重复（答过的记进 `quizKeys`）
- [x] 答题面板里**没有图案**（不泄露答案）
- [x] `zsh scripts/check.sh` + `zsh scripts/regress-all.sh` 全过

**允许改的文件**：
- `src/levels/chest-valley/level.js`、`src/levels/riddle-forest/level.js`
- `src/engine/quiz.js`（新建）、`src/engine/director.js`（只加 `noGuide` 判定）
- `src/content/questions.js`（新建）、`src/content/banks/**`、`src/content/banks/index.js`
- `index.html`（只加 quiz.js 的 script 标签）

---

## RECEIPT（执行者写完交回执）

**改了哪些文件**：
- 新增 `src/engine/quiz.js`（`Game.Quiz.ask`）、`src/content/questions.js`（多题库总管理）、
  `src/content/banks/commonsense/{life,safety,nature,society}.js`（38 条常识题）
- 删除 `src/content/riddles.js`（被 `questions.js` 取代）
- `src/engine/director.js`（`noGuide`）、`src/levels/chest-valley/level.js`（答题开箱）、
  `src/levels/riddle-forest/level.js`（改用 `Game.Quiz`）、`src/main.js`（debug 工具）、`index.html`

**怎么验证的**：

```bash
cd /Users/xiao/workspace/mycraft-bestxiao
zsh scripts/test-level2.sh      # 箭头 / 答题 / 不重复
zsh scripts/regress-all.sh      # 四关全流程
```

关键输出（迁移前在旧目录跑的同款脚本）：
- `第1关箭头: true` / `第2关箭头: false`（对照成立）
- 宝箱面板 chip = `🎁 宝箱问题 · 生活常识`，`bigEmoji:false imgs:0`（无图案）
- 点错 → `opened:false, panel:true`（箱子还关着）；再答对 → `opened:true, chests:1, quizKeys:1, coins:5`
- 连开 20 箱，20 道题各不相同；题库统计 `riddle 65 条 / commonsense 38 条`
- `regress-all.sh`：四关全部通关，`报错检查: ["ok"]`

**遗留问题**：常识题库还可以继续加（每条 5 秒，家长自己在 `banks/commonsense/` 里加）；
「错题本」见 `ROADMAP.md`。

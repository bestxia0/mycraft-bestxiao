# TC-0004 · 新增题库大类「口算」（math）

| 字段 | 值 |
| --- | --- |
| 卡号 | TC-0004 |
| 状态 | todo |
| 角色 | C4 内容作者（**待认领**） |
| 优先级 | P1 |
| 依赖 | 无 |
| 创建 | 2026-10-24 |
| 开始 / 结束 | — / — |

---

## TASK（协调官写）

**要做什么**：加一个题库大类 `math`（口算），先做 1 个分类 `add`（20 以内加法）共 30 条；
让**任何关卡**都能用 `Game.pickQuestions(1, { bank: 'math' })` 抽到题。
（本卡只加数据，不做关卡；做成关卡用另一张卡。）

**验收标准**：
- [ ] `Game.bankStats('math').total === 30`，分类 `add` 计数正确
- [ ] `Game.pickQuestions(5, { bank: 'math' })` 能抽到 5 道不重复的题
- [ ] 题目 key 形如 `math:add:7-plus-8`
- [ ] **老题库不受影响**：`Game.bankStats('riddle').total === 65`、`commonsense === 38`
- [ ] `zsh scripts/check.sh` 全绿；`zsh scripts/regress-all.sh` 四关仍全过

**允许改的文件**：
- `src/content/banks/math/**`（新文件夹）
- `src/content/banks/index.js`（**只准追加一行**）

**不许改的**：`src/engine/**`、`src/levels/**`、`src/content/questions.js`（抽题接口已经够用）

**出题要求**（C1 补）：
- 每条三选一：`a` 是正确答案，两个干扰项要「像但不对」（±1 / ±10 之类）；
- `hint` 要教方法，不许直接说答案（例：「先把 7 凑成 10，再加剩下的」）；
- `id` 用 `7-plus-8` 这种一眼看懂的英文短横线格式。

---

## RECEIPT（执行者写完交回执）

（还没人认领）

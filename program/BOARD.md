# 任务看板 · mycraft-bestxiao

> **唯一事实源。** 想知道「谁在做什么、做到哪了」，只看这个文件。
> 规则见 `AGENTS.md` 第 3 节；任务卡在 `program/tasks/`。
> 看板状态只有协调官（C0）能改；执行者只改自己那张卡的 `claimed` / `doing` / `review`。

**更新时间**：2026-10-24 · **协调官**：C0（待指派）

---

## 一、进行中（doing / review / qa）

| 卡号 | 标题 | 角色 | 状态 | 允许改的文件 | 更新 |
| --- | --- | --- | --- | --- | --- |
| — | （当前没有进行中的卡） | — | — | — | — |

---

## 二、待认领（todo）

| 卡号 | 标题 | 建议角色 | 依赖 | 备注 |
| --- | --- | --- | --- | --- |
| TC-0003 | 第 5 关 · 打地鼠庭院（示例卡，可照抄） | C3 关卡开发 | 无 | 见 `program/tasks/TC-0003-mole-garden.md` |
| TC-0004 | 口算题库大类 `math`（示例卡） | C4 内容作者 | 无 | 见 `program/tasks/TC-0004-math-bank.md` |

---

## 三、阻塞（blocked）

| 卡号 | 卡在哪 | 等谁 / 等什么 | 已经做完的部分 |
| --- | --- | --- | --- |
| — | — | — | — |

---

## 四、已完成（done，最近的排前面）

| 卡号 | 标题 | 角色 | 完成时间 | 证据 |
| --- | --- | --- | --- | --- |
| TC-0007 | 第 6 关 · 踩白大草原（把绿色踩成白色） | C3 关卡开发 → 等 C5 试玩 | 2026-10-24 | `zsh scripts/test-paint.sh`（A~L 全绿）+ `check.sh`（45 个文件）+ `regress-all.sh` + `test-desert.sh` + `test-music.sh` + `smoke.sh` + `test-errors.sh`（errors: []）见卡内 RECEIPT |
| TC-0006 | 背景音乐（每关一首 + 设置里能开 / 关） | C2 引擎架构师 | 2026-10-24 | `zsh scripts/test-music.sh`（A~J 全绿）+ `regress-all.sh` + `test-desert.sh` + `test-errors.sh`（errors: []）见卡内 RECEIPT |
| TC-0005 | 第 5 关 · 沙漠逃亡（骑马 + 2 分钟限时逃离） | C3 关卡开发 → 等 C5 试玩 | 2026-10-24 | `zsh scripts/test-desert.sh`（14 段全绿）+ `smoke.sh`（见卡内 RECEIPT） |
| TC-0002 | 第 4 关擂台手感与节奏 | C3 关卡开发 → C5 | 2026-10-24 | `zsh scripts/test-arena.sh`（见卡内 RECEIPT） |
| TC-0001 | 第 2 关宝箱答题 + 通用答题弹窗 + 常识题库 | C2 / C4 → C5 | 2026-10-24 | `zsh scripts/test-level2.sh` + `scripts/regress-all.sh` |

---

## 五、热点文件当前占用（同一时间只能一个人）

| 文件 | 现在谁在用 | 说明 |
| --- | --- | --- |
| `src/levels/index.js` | 空闲 | 加关卡清单行时登记，合并由 C0 做（TC-0007 的第 6 关 `paint-the-field` 那一行已合并） |
| `src/content/banks/index.js` | 空闲 | 加题库分类时登记 |
| `index.html` | 空闲 | 只有 C2 能动 |

---

## 六、维护约定

1. 新卡：复制 `program/tasks/_TEMPLATE.md` → 命名 `TC-00NN-短名字.md` → 在「二、待认领」加一行。
2. 开工：执行者把卡里状态改 `doing`，并在这里把行挪到「一、进行中」。
3. 交活：卡里写 RECEIPT（命令 + 关键输出）→ 状态 `review` → 通知 C5。
4. 测过：C5 在卡里写 QA 结论 → C0 把行挪到「四、已完成」并归档。
5. 卡住了：写 BLOCK → 状态 `blocked` → 挪到「三、阻塞」，不要闷着干等。

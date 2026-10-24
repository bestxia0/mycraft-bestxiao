# AGENTS.md · mycraft-bestxiao（方块小勇士）

> 这是本项目**唯一的 AI 入口文档**。
> **动手前必读第 0、1、2 节；要和别人（或别的 Agent）一起并行开工，再补第 3 节。**
>
> 一句话目标：这是给「**家长 + 小朋友每天加 1~2 个关卡**」做的 3D 卡通闯关游戏，
> 所以代码必须**极易扩展、极易验证**，宁可笨一点，也不要聪明。

当前版本 **v2.5.0** · 纯静态（双击 `index.html` 就能玩）· 1 个小镇广场 + 5 个关卡 ·
2 个题库大类（谜语 65 条 / 常识 38 条）· 每关一首背景音乐（能开能关）

---

## 0. 五分钟速览

### 0.1 我要做的事 → 去哪看

| 我想做的 | 看哪节 | 一句话 |
| --- | --- | --- |
| 加一个新关卡 | 第 4 节 | 复制 `src/levels/_TEMPLATE/` → 改 3 个字段 → 清单加一行 |
| 改谜语 / 常识 / 汉字 / 装备 | 第 8 节 | 只改 `src/content/` 里的数据文件，不碰逻辑 |
| 给某关换背景音乐 / 加新曲子 | `docs/背景音乐.md` | 只改 `src/engine/music.js` 里 `TRACKS` 的数据（key = 关卡 id） |
| 给关卡加一种全新的玩法能力 | 第 3.4 节 CHANGE 卡 | 提给引擎架构师（C2），不要自己动 `src/engine/` |
| 和其他 Agent 并行干活 | **第 3 节** | 领任务卡 → 只动自己名下的文件 → 写回执 |
| 改完怎么验证 | 第 11 节 | `zsh scripts/check.sh` + `zsh scripts/regress-all.sh` |
| 找以前的决定 / 版本历史 | `program/DECISIONS.md` · `program/CHANGELOG.md` | 写进文件才算数，聊天里说过的都不算 |
| 跟小朋友一起口述新关卡 | `docs/工作流程.md` · `docs/关卡设计规范.md` | 口述 → 转写 → **设计卡（`levels/`）** → 就绪后才开发 |
| 读小朋友的原话（不许改写） | `transcripts/` | 只增不改，是最原始的证据（E0） |

### 0.2 怎么跑起来

```bash
cd /Users/xiao/workspace/mycraft-bestxiao
zsh scripts/serve.sh          # 起本地服务器（默认 8777 端口）
# 或者直接双击 index.html（file:// 也能玩，没有联网、没有依赖）
```

### 0.3 目录速查

```text
mycraft-bestxiao/
├── AGENTS.md          本文件（AI 入口）
├── README.md          给家长看的说明书
├── index.html         页面骨架（只有加「引擎/内容新文件」时才改）
├── vendor/three.min.js  3D 引擎（本地，离线可用）
├── src/               ★游戏本体★（引擎 / 内容 / 玩法 三层，见第 2 节）
├── legacy/            第一版旧代码备份（不加载、不参考）
├── agents/            ★各角色提示词★（开新会话时贴进去，见第 3.2 节）
├── program/           ★协作的活文件★（看板 / 任务卡 / 决策 / 变更记录）
├── scripts/           ★可复跑的验证脚本★（检查 / 回归 / 专项 / 截图）
├── levels/            ★关卡设计卡★（L00–L05 = 游戏内真实关卡，卡号跟源码走；点子放 _ideas/。见 3.9 节）
├── transcripts/       小朋友口述的转写稿（只增不改，E0 证据）
├── docs/              COORDINATION.md（协作细则）/ 工作流程.md / 关卡设计规范.md /
│                      背景音乐.md（曲库 + 开关）/ preview/ 预览图
└── work/              临时产物（截图、日志，可随时删，不进版本库）
```

---

## 1. 红线（违反 = 白干）

1. **不许引入构建工具、打包器、ES Module、npm 依赖。**
   游戏必须能**双击 `index.html` 用 `file://` 打开就跑**。
   所有代码都是普通 `<script>` + `window.Game` 全局命名空间，禁止 `import` / `export`。
2. **不许联网。** 3D 引擎是本地 `vendor/three.min.js`，任何时候都要能离线运行。
3. **新增关卡只能改 2 个地方**：`src/levels/<新关卡>/`（新文件夹）+ `src/levels/index.js`（加一行）。
   **不要**去改 `index.html`（关卡脚本由 `main.js` 按清单动态加载）。
   **新增题库分类也只能改 2 个地方**：`src/content/banks/<分类>.js`（新文件）+ `src/content/banks/index.js`（加一行）。
4. **关卡 `id`、题目 `id`、存档 key 一旦发布就不能改。**
   存档按 `id` 分区，改 id = 小朋友进度丢失。
5. **引擎层 `src/engine/` 与内容层 `src/content/` 视为稳定 API。**
   加关卡时只在 `src/levels/` 里写；确实要动引擎（新增通用玩法能力）时必须向后兼容
   （老关卡照常跑），并在 `program/CHANGELOG.md` 记一笔。
6. **每个关卡都必须有 `ctx.returnPortal(...)`**，否则小朋友回不了广场。
7. **回广场传送门不要放在出生点镜头的正后方**，否则镜头会卡在门框里（见第 10 节坑 1）。
8. 注释、界面文案、`AGENTS.md` / `README.md` / `program/**` 一律用**简体中文**。
9. 改完必须跑第 11 节的验证流程，**没验证过不要说「好了」**（要贴命令和输出）。
10. **不许偷偷改存档结构**：换结构要升 `SCHEMA_VERSION` 并写迁移分支（见第 9 节）。
11. **热点文件同一时间只能一个人在改**：`src/levels/index.js`、`src/content/banks/index.js`、
    `index.html`（见第 3.3 节）。并行开工时先跟协调官（C0）约，别硬改。

---

## 2. 项目结构地图

三层结构，依赖方向永远是 **关卡 → 引擎 / 内容**，反过来绝对不行。

```text
src/
├── style.css           卡通风格 UI 样式（新 UI 组件在这里加样式）
├── main.js             启动器：读题库清单 + 关卡清单 → 动态注入脚本 → 装配 → 主循环 + Game.debug
│
├── engine/             ★引擎层★ 通用能力，关卡作者不用改
│   ├── namespace.js    Game 命名空间、数学/随机工具、日志、常量、版本号
│   ├── textures.js     canvas 生成的贴图 + 3D 文字标牌（makeLabelSprite）
│   ├── audio.js        Game.Sfx —— WebAudio 合成音效（correct/wrong/chest/craft/hit/knock/shrink…）
│   ├── music.js        Game.Music —— ★背景音乐★：每关一首，现场合成（曲库 + 开关，见 docs/背景音乐.md）
│   ├── particles.js    粒子爆发
│   ├── save.js         Game.Save —— 多档案 + 分关卡存档 + 导入导出 + 版本迁移
│   ├── blocks.js       Game.Blocks —— ★积木工具箱★（地形、碰撞盒、scatter 铺装饰）
│   ├── collider.js     Game.Physics —— AABB 碰撞与台阶自动迈步
│   ├── entities.js     ★现成道具★ 小勇士模型/宝箱/石碑/锻造炉/NPC/传送门/小羊/指引箭头/人机对手
│   ├── player.js       Game.Player —— 输入、走跳、第三人称镜头、knockback、teleport
│   ├── environment.js  天空、光照、雾；支持每关 setTheme() 换天气
│   ├── sceneFx.js      Game.Cue（演出队列）/ Queue / Fx（震屏、慢动作、闪白）
│   ├── ui.js           Game.UI —— HUD、toast、★动态弹窗 panel()★、选项按钮、奖励卡、战斗 HUD
│   ├── quiz.js         ★Game.Quiz★ —— 通用「三选一答题弹窗」（谜语 / 宝箱 / 以后的测验都用它）
│   ├── interactions.js 走近提示 + 按 E 触发 + zone 区域触发器
│   ├── dialogue.js     NPC 打字机对话框
│   ├── registry.js     Game.Levels —— 关卡注册表、解锁规则、下一关
│   └── director.js     Game.Director —— ★闯关导演★：造 ctx、切关卡、通关结算、头顶指引箭头
│
├── content/            ★内容数据★ 纯数据，不含逻辑，改这里不用碰代码
│   ├── items.js        Game.ITEMS / RARITY / RECIPES / CHEST_LOOT（装备、稀有度、锻造配方）
│   ├── questions.js    题库「总管理」：多题库（bank）+ 随机抽题（不含题目本体）
│   ├── hanzi.js        Game.HANZI（汉字库）+ Game.pickHanzi()
│   └── banks/          ★分类题库★（家长可以手动编辑，越加越多）
│       ├── index.js    ★★ 题库清单 —— 加分类只改这个文件 ★★
│       ├── riddles/    谜语分类：animals / plants / nature / food / things / body / characters
│       └── commonsense/ 常识分类：life 生活 / safety 安全 / nature-w 自然 / festival 节日
│
└── levels/             ★玩法层★ 一个关卡一个文件夹
    ├── index.js        ★★ 关卡清单 —— 新增关卡唯一要改的文件 ★★
    ├── _TEMPLATE/      新关卡模板（复制它）
    ├── hub-square/     方块小镇 · 广场（isHub:true，传送门自动生成）
    ├── riddle-forest/  第 1 关 · 谜语森林（问答类示范）
    ├── chest-valley/   第 2 关 · 宝箱山谷（收集 + 答题 + 锻造，noGuide 示范）
    ├── hanzi-classroom/第 3 关 · 汉字教室（学习系统示范）
    ├── arena-battle/   第 4 关 · 圆形擂台（缩圈 + 人机混战，战斗类示范）
    └── desert-escape/  第 5 关 · 沙漠逃亡（骑马 + 2 分钟限时；props.js 放关卡私货）
```

### 各层职责一句话

| 层 | 负责 | 不负责 |
| --- | --- | --- |
| `engine/` | 「怎么跑」：3D、物理、UI、存档、答题弹窗、交互、传送门 | 具体玩法规则 |
| `content/` | 「有什么」：数据表 | 任何逻辑 |
| `levels/` | 「玩什么」：搭地图、判定通关、每帧逻辑 | 重复造轮子（用引擎能力） |
| `main.js` | 启动、装配、调试工具 | 玩法 |

---

## 3. 多 Agent 并行协作机制 ★

**要解决的问题**：小朋友每天都想要新关卡，而「加一关」本来**可以并行**
（一关一个文件夹），但文档、清单、引擎零件是**共享的**。
所以这里用「一张看板 + 一叠任务卡 + 文件所有权」把并行变安全。

### 3.1 三个原则（记住这三条就够）

1. **一份事实源**：任务状态只看 `program/BOARD.md`，决定只看 `program/DECISIONS.md`，
   版本历史只看 `program/CHANGELOG.md`。**写进文件才算数**，聊天里说过的不算。
2. **一个文件一个写者**：任何时刻一个文件只有一个 Agent 在写（见 3.3）。
   要改别人名下的文件 = 发一张 CHANGE 卡，**不许直接改**。
3. **协调官不动手**：协调官（C0）只拆卡、派卡、改看板、收口，**一行代码都不写**（硬红线）。

### 3.2 角色与默认编制

| 代号 | 角色 | 只负责 | 可以写 | 绝对不碰 |
| --- | --- | --- | --- | --- |
| **C0** | 协调官 Coordinator | 拆卡 / 派卡 / 看板 / 仲裁 / 合并热点文件 | `program/**` | `src/**` |
| **C1** | 关卡策划 Designer | 玩法、数值、文案、通关条件 | 任务卡的「设计」段 | `src/**` |
| **C2** | 引擎架构师 Architect | 通用玩法能力（新零件、新 API） | `src/engine/**`、`index.html`、`src/main.js`、`src/style.css` | 具体关卡逻辑 |
| **C3** | 关卡开发 LevelDev | 一个关卡文件夹 | `src/levels/<关卡id>/**` | `src/engine/**`、`src/content/**` |
| **C4** | 内容作者 Content | 题库 / 装备 / 汉字 | `src/content/**` | `src/engine/**`、`src/levels/**` |
| **C5** | 测试 QA | 复跑脚本、写报告、判是否 done | `scripts/**`、`program/qa/**`、`work/**` | 产品代码（发现 bug 交回执，不自己修） |
| **C6** | 文档 Docs | README / AGENTS / docs | `AGENTS.md`、`README.md`、`docs/**` | `src/**` |

角色提示词在 `agents/`（`00-coordinator.md` … `60-docs.md`），
开新会话时把对应文件**整段贴进第一句**，见 3.7。

### 3.3 文件所有权矩阵（并行安全边界）

| 文件 / 目录 | 写者 | 并行说明 |
| --- | --- | --- |
| `src/levels/<关卡id>/**` | 该卡的 C3，**一人一关** | 天然并行：两人同时做两关永远不会冲突 ✅ |
| `src/levels/index.js` | C3 只准追加一行，**合并由 C0 串行做** | ⚠️ 热点文件 |
| `src/content/banks/**` | C4，**一个分类文件一人** | 天然并行 ✅ |
| `src/content/banks/index.js` | C4 只准追加一行，C0 串行合并 | ⚠️ 热点文件 |
| `src/engine/**` | 只有 C2 | 其他角色提 CHANGE 卡 |
| `src/content/questions.js`、`items.js`、`hanzi.js` | 只有 C4 | 改完必须让 C5 复跑题库回归 |
| `index.html`、`src/main.js`、`src/style.css` | 只有 C2 | 加引擎/内容新文件才动 |
| `program/**` | C0（任务卡里本人的小节归本人写） | 看板状态只有 C0 能改 |
| `scripts/**` | C5 | 新增脚本要写进本节表格 + 第 11 节 |
| `AGENTS.md`、`README.md`、`docs/**` | C6 | 改结构 / API 时必须同步 |
| `work/**` | 谁都可以 | 临时文件，不进版本库 |

**一句话判据**：如果你要写的文件不在「你可以写」这一列里 → 停手，发卡。

### 3.4 四种消息（任务卡里的固定小节，照抄模板）

| 类型 | 谁发 | 必须写什么 |
| --- | --- | --- |
| **TASK** | C0 → 执行者 | 做什么 / 验收标准（可测）/ 允许改的文件 / 不许改的 / 依赖哪张卡 / 期限 |
| **RECEIPT** | 执行者 → C0 | 改了哪些文件 / **怎么验证的（贴命令 + 关键输出）** / 遗留问题 |
| **BLOCK** | 执行者 → C0 | 卡在哪（等谁、等什么决定）/ 需要什么 / 我先做了哪部分 |
| **CHANGE** | 任意 → C2 / C4 | 我需要什么新能力 / 为什么 / 兼容要求（老关卡必须照常跑）/ 影响面 |

模板：`program/tasks/_TEMPLATE.md`；填好的样例：`program/tasks/TC-0001-chest-quiz.md`

### 3.5 状态机

```text
todo → claimed → doing → review → qa → done        （旁支：blocked / dropped）
```

- `claimed` 必须填「谁」，`doing` 必须填开始时间，`done` 必须贴验证证据。
- **写完最多推到 `review`**；只有 C5（测试）能推到 `done`（自己给自己判分不算）。
- 看板状态只有 C0 能改（执行者只改自己那张卡的 `claimed` / `doing` / `review`）。
- 阻塞先写 `BLOCK` 再标 `blocked`，不要闷着干等。

### 3.6 一天怎么编排（家长 + Agent 的现实节奏）

| 时间 | 谁 | 干什么 |
| --- | --- | --- |
| 早上 5 分钟 | C1 关卡策划 + 小朋友 | 说清楚「今天这两个关卡想玩什么」，写成设计段 |
| 早上 | C0 协调官 | 拆成 2~3 张执行卡，派给 C3 / C4 / C2，更新看板 |
| 白天 | C3 / C4 / C2 | 各做各的文件夹；C2 顺手做大家都要用的新零件 |
| 收尾 | C5 测试 | `scripts/check.sh` → `scripts/regress-all.sh` → 新关专项脚本 |
| 收尾 | C0 | 证据齐全就推 done 并归档；有问题退回 doing 并写 BLOCK |
| 晚上 | C6 文档 | README「今天新增」+ `program/CHANGELOG.md` |

### 3.7 并行会话怎么起（Codex / Claude 都适用）

1. 读 `agents/README.md` 挑角色，把 `agents/<角色>.md` **整段**贴进新会话第一条消息。
2. 每条会话第二句固定模板：

   ```text
   我是 <角色代号>。先读 AGENTS.md 第 1、2、3 节，再读 program/BOARD.md 和我的任务卡；
   然后按任务卡的 TASK 段开工；只动「允许改的文件」；干完写 RECEIPT 并把卡推到 review。
   ```

3. **物理隔离**：每个 Agent 一个 git 分支或独立 worktree（见 `docs/COORDINATION.md` 第 4 节），
   合并由 C0 负责（热点文件尤其如此）。
4. 干完：回执写进卡里 + 看板推到 `review`，然后**停手等 C5**。

### 3.8 验收门（DoD，每张卡都要过）

- [ ] `zsh scripts/check.sh` 全绿（所有 JS 语法检查通过）
- [ ] 相关专项脚本跑过并贴输出（新关卡至少要有「进关 → 通关 → 结算 → 回广场」闭环证据）
- [ ] 老关卡没被搞坏：`zsh scripts/regress-all.sh` 四关全过
- [ ] 改动只落在自己名下的文件里（越界 = 退回）
- [ ] 文档同步：`program/CHANGELOG.md` +（改结构时）`AGENTS.md` / `README.md`
- [ ] **提交 + 打 tag**：`git commit` + `git tag -a v<x.y.z>`，版本号三处一致（见 11.1.1）

### 3.9 和「关卡设计卡」系统怎么接（★必读★）

本项目有**两套并行但互补**的文件，别搞混：

| 名字 | 是什么 | 谁写 | 权威文档 |
| --- | --- | --- | --- |
| `levels/`（仓库根） | **关卡设计卡**：小朋友口述 → 场景 / 道具 / 动作 / 目标 / 规则 | 家长（C1）+ 小朋友 | `docs/关卡设计规范.md` |
| `transcripts/` | 小朋友口述的**逐字转写**（只增不改） | 家长 | `docs/工作流程.md` 步骤 1~2 |
| `src/levels/` | **代码**：一个关卡一个文件夹 | C3 | 本文件第 2、4、6 节 |
| `program/tasks/` | **实现任务卡**：谁在哪天做哪一关 | C0 | 本文件第 3.4 节 |
| `levels/answers/` | 谜底答案（**不许预置进关卡**） | 家长 | `docs/关卡设计规范.md` |

**流程是串联的，两套系统在「开发」这一步握手**：

```text
小朋友口述 → transcripts/（E0 原话）
      ↓ 结构化（场景/道具/动作/目标/规则）
levels/L0N-xxx.md 设计卡（草稿 → 待确认 → 就绪）
      ↓ 设计卡状态到「就绪」← 这是开发的前置门禁
program/tasks/TC-00NN-*.md 实现任务卡 ← C0 开卡（TASK 段要引用设计卡路径）
      ↓ C3 开发
src/levels/<关卡id>/** 代码 + scripts/test-<关卡>.sh
      ↓ C5 跑脚本 + 小朋友试玩
设计卡状态 → 可玩 → 已验收；程序/CHANGELOG.md 记一笔
```

**硬规矩（防止两边打架）**：

1. **设计卡没到「就绪」不开 C3 卡**：没想清楚玩法就写代码 = 返工。
2. **证据分级**：设计卡和任务卡里都必须标来源 —— `E0` 小朋友原话 / `E1` 基于原话的整理 /
   `E2` 实现者的提议。**E2 不得当成小朋友的设定**（要写「[待确认] / [提案]」）。
3. **谜题类关卡不预置答案**：答案只在小朋友答错后才给（`levels/answers/` 也别抄进代码里）。
   已有先例：第 1 关的谜语面板**不放图案**（D-004 / 第 10 节坑 14）。
4. **一个关卡只有一个关卡 id**：设计卡里「游戏内顺序」定下来后，`src/levels/` 的 `id` 就跟着定，
   发布后不许改（存档按 id 分区）。
5. 设计卡是**人写的**，C3 不要擅自改设计卡的玩法段；要改就回给 C1 / 家长确认（走 BLOCK 或 CHANGE）。
6. **卡号 = 游戏内顺序**：`levels/L0X-*.md` 的序号必须和 `src/levels/index.js` 里的清单顺序 / `order`
   对得上（源码是唯一事实源）。小朋友口述里的编号只写进转写稿和卡里的「小朋友口中的第几关」，
   **不拿来当卡号**；还没做进游戏的点子放 `levels/_ideas/`，不占卡号。

---

## 4. 每天加 1~2 个关卡：标准流程

假设今天要做「第 5 关 · 打地鼠庭院」。

```bash
cd /Users/xiao/workspace/mycraft-bestxiao
cp -R src/levels/_TEMPLATE src/levels/mole-garden     # 1. 复制模板
```

2. 改 `src/levels/mole-garden/level.js`：
   `id: 'mole-garden'`（英文小写 + 短横线，**永不再改**）、`order: 50`、
   `name: '打地鼠庭院'`、`subtitle: '第 5 关'`、`icon: '🔨'`，
   然后在 `build(ctx)` 里搭地图、写玩法。
3. 改 `src/levels/index.js`，清单里加一行（**注意上一行要补逗号**）：

```js
  { id: 'mole-garden', files: ['levels/mole-garden/level.js'] }
```

4. 刷新浏览器：广场上会**自动多出一座传送门**（按 `order` 排在最后、默认锁着）。
5. 跑第 11 节的验证流程（`scripts/check.sh` + 新关专项脚本 + `scripts/regress-all.sh`）。

**关卡需要自己的数据文件时**（推荐数据与逻辑分离）：

```js
{ id: 'poem-hall', files: ['levels/poem-hall/poems.js', 'levels/poem-hall/level.js'] }
```

`files` 里的路径都相对 `src/`，按数组顺序加载，所以数据文件写在前面。

---

## 5. 新关卡检查清单

写完一关，逐条对：

- [ ] `id` 唯一、英文小写 + 短横线；`order` 比上一关大
- [ ] `bounds` 四个方向都有值（走不出去）
- [ ] `spawn` 在 `bounds` 里面，且**脚下有地**（`h.addGround` 铺够大）
- [ ] `camera` 的 `yaw` 让小朋友**一进关就看见要玩的东西**
- [ ] 有 `ctx.returnPortal(x, z, {...})`，且**不在出生点镜头正后方**，离出生点 ≥ 4.5 格
- [ ] 出生点、传送门、关键道具位置都 `h.block(x, z, r)` 过（别长树 / 石头）
- [ ] `objective(ctx)` 会随进度变文字，`target` 指向「现在该去的地方」
- [ ] 有明确的通关条件，调用 `ctx.complete({...})`（文案写清楚奖励）
- [ ] 进度写进了 `ctx.save`（关掉网页再进来不会白玩）
- [ ] 界面文案友好、有 emoji、给小朋友看得懂
- [ ] `zsh scripts/check.sh` 通过 + 浏览器实跑一遍

---

## 6. `ctx` API 速查（关卡里最常用的）

`build(ctx)` 里的 `ctx` 是关卡跟引擎对话的唯一接口。

### 6.1 地图与几何

| 调用 | 作用 |
| --- | --- |
| `ctx.bounds` | `{minX,maxX,minZ,maxZ}`，地图边界 |
| `ctx.scene` | **本关卡自己的 `THREE.Group`**，3D 物件必须 `ctx.scene.add(...)`（切关卡时整体隐藏） |
| `ctx.helpers` | 积木工具箱，见第 7 节 |
| `ctx.colliders` | 碰撞盒数组（`ctx.helpers.addSolid` 会往里加） |
| `ctx.spawn` | 出生点 `{x,z}` |
| `ctx.player` | 玩家对象（`ctx.player.teleport(x, z)` 等），见 6.6 |
| `ctx.data` | **本关卡自己的运行时数据**，习惯写成 `const rt = (ctx.data = {...})` |
| `ctx.setGround(fn)` | ★擂台关用的★「哪里才有地」：`fn(x, z)` 返回地面高度，返回 `null` = 悬空（会掉下去）。不调用就是全平地 |

### 6.2 交互与触发

```js
// 走近 → 屏幕下方出现「按 E …」→ 按 E 触发
ctx.interact({
  kind: 'chest',                 // 可选，调试用
  label: '按 E 打开宝箱 🎁',      // 提示文字
  pos: { x: 0, z: 4 },           // 位置（只算 x/z 平面距离）
  radius: 2.5,                   // 触发半径
  enabled: () => !chest.opened,  // 可选：false 时暂时不能按
  onUse(ctx) { /* ... */ }
});

// 踩进一块圆形区域就触发（过门、通关、陷阱…）
ctx.zone({
  x: 0, z: -20, r: 5,
  once: true,                    // 只触发一次
  enabled: () => rt.gateOpen,    // 可选
  onEnter(ctx) { ctx.complete({ ... }); },
  onExit(ctx) {}                 // 可选
});
```

### 6.3 界面

| 调用 | 说明 |
| --- | --- |
| `ctx.toast('🎁 +5 🪙', 'good', 2800)` | 飘一条提示；`kind`：`good` / `bad` / `gold`；第 4 个参数是 `key`（同 key 的新提示会顶掉旧的） |
| `ctx.say(['第一句', '第二句'], { name:'村长爷爷', emoji:'👴' })` | NPC 打字机对话 |
| `ctx.panel({ chip, title, html, wide, actions:[{label,kind,primary,onClick}] })` | 弹面板，返回 `panel`（有 `panel.close()` / `panel.setHTML()` / `panel.body` / `panel.foot`） |
| `Game.Quiz.ask(ctx, {...})` | ★通用答题弹窗★（见 6.5），谜语 / 宝箱 / 以后的测验都用它 |
| `Game.UI.optionButtons(options, (opt, btn) => {})` | 生成三选一按钮组（自己写答题面板时才用） |
| `Game.UI.lockOptions(box, right)` | 锁定选项并标出正确答案 |
| `Game.UI.reward({ emoji, name, sub, rarity })` | 弹「✨ 收获」奖励卡（锻造成功那种） |
| `Game.UI.stats({ coins, items })` | 刷新右上角数字 |
| `Game.UI.confirm({ ... })` | 二次确认弹窗 |
| `Game.UI.battle({ time, hp, hpMax, alive, total })` | ★战斗 HUD★（顶部倒计时 + 血条 + 「还剩 N 个对手」）；传 `null` 隐藏 |

弹窗内容一般用 `onMount(root, panel)` 自己拼 DOM；样式统一放 `src/style.css`。

### 6.4 流程与存档

| 调用 | 说明 |
| --- | --- |
| `ctx.complete({ chip, title, html, coins })` | **本关通关**：自动存 `done`、发金币、弹结算面板（下一关按钮由导演自动拼） |
| `ctx.go('level-id', { from })` | 跳到别的关卡 |
| `ctx.goHub()` | 回中央广场 |
| `ctx.setDone(true)` | 直接标记通关（少用） |
| `ctx.save` | **本关的存档槽**，见第 9 节 |
| `ctx.addCoins(10)` | 加金币（全局，所有关卡共用） |
| `ctx.grantItem('iron_sword', 1)` | 往背包加装备（全局） |
| `ctx.inventory()` / `ctx.itemCount()` | 读背包 / 装备总件数 |
| `ctx.director.takeItems([...ids])` | 消耗背包里的装备 |
| `ctx.director._refreshObjective()` | 立刻刷新任务条（改了进度后调用） |

### 6.5 答题弹窗 `Game.Quiz.ask`（v2.3.0 新增 ★）

谜语森林的每座石碑、宝箱山谷的每个宝箱都用它。**它负责界面和判分，你负责给题、给奖励。**

```js
const q = Game.pickCommonsense(1, { exclude: ctx.save.list('quizKeys') })[0];

Game.Quiz.ask(ctx, {
  chip: '🎁 宝箱问题 · ' + q.label,     // 顶部小标签
  title: '答对才能打开宝箱',            // 可选
  question: q.q,                        // ★题目（只放文字，别塞图案）★
  answer: q.a,
  options: q.options,                   // 3 个，打开时自动打乱
  hint: q.hint,                         // 可选，不写就没有「提示」按钮
  rightText: '答对啦！宝箱打开了 🎉',     // 可选
  wrongText: '再想一想～',               // 可选
  locked: { text: '这题已经答过啦～' },   // 可选：锁住选项并标出答案（复习用）
  onCorrect(panel) {                    // 答对了做什么
    ctx.save.pushUnique('quizKeys', q.key);
    openChestNow(ctx, i);
    setTimeout(() => panel.close(), 900);
  }
});

// 自定义按钮（不写就是「💡 给我提示」）
actions: [{ label: '💡 给我提示', kind: 'ghost', small: true }]
```

> ⚠️ **别往答题面板里放 emoji / 图案**：会把答案泄露了（第 1 关就是这么改的）。
> 题目数据里的 `emoji` 字段是留给「题目卡片 / 奖励图」的，`Quiz` 不会显示它。

### 6.6 战斗类关卡（第 4 关擂台的现成零件）

默认按 `F` 就是「挥武器」，引擎已经把输入接好了，关卡只要读一下就行。

```js
// —— 玩家 ——
ctx.player.consumeAttack()        // 这一帧按了 F 吗？（读过就清掉，别一帧读两次）
ctx.player.swing()                // 播一次挥武器动画（不管有没有打中）
ctx.player.knockback(dx, dz, power, up, stun)   // 把玩家击飞：水平冲量 / 上抛 / 僵直秒数
ctx.player.stunT                  // 被击飞的僵直剩余秒数（>0 时方向键失效）
ctx.player.faceDir()              // 玩家现在朝向的单位向量 {x, z}（判定「面前」用）
ctx.player.faceTo(x, z)           // 让玩家转身面向某个点
ctx.player.clearQueue()           // 清掉缓冲的输入 + 攻击标记（换局 / 结算时调）
ctx.player.setTier(0..3)          // 手里的剑：0 石 / 1 铁 / 2 金 / 3 钻石（炼造出来的武器）

// —— 人机对手 —— 一个彩色小勇士 + 头顶名字 + 血条
const bot = Game.makeBot({ name: '红队长', shirt: 0xff6b6b, pants: 0x2f4f8f, hp: 300 });
ctx.scene.add(bot.group);                      // 一定要自己 add 到场景
bot.body = Game.Physics.createBody(x, 0, z);   // 自己给它一个物理身体
bot.animate(dt, 是否在动, bot.body.grounded, time);   // 每帧播动作（★别用 ctx.entity，它只传 2 个参数）
bot.damage(20) / bot.setHp(300) / bot.setLabel('💫 红队长') / bot.showBar(false) / bot.swing()
bot.alive = false                              // 掉下台后自己标记，别再更新它
```

### 6.7 关卡定义里的其它字段

```js
theme: { skyTop, skyBottom, fog, fogNear, fogFar }   // 换天气（可选）
noGuide: true                                        // ★不显示头顶的指引箭头★（第 2 关：宝箱要自己找）
unlock(save) { return save.isLevelDone('前一关的id'); }   // 自定义解锁条件（可选）
alwaysUnlocked: true                                 // 永远开着（可选）
onEnter(ctx, opts) {}                                // 每次进入关卡时（可选）
update(dt, time, ctx) {}                             // 每帧逻辑（可选）
```

> ⚠️ `update` 是**在玩家物理之后**才被调用的，所以里面**不要**再手动调 `ctx.player.update(...)`，
> 否则玩家会一帧走两步（飞一样快）。人机对手（`Game.makeBot`）要自己在这里更新。
>
> ⚠️ `build()` 一个关卡只会跑一次（导演按 id 缓存）；每次进关都会跑的是 `onEnter(ctx)`。

### 6.8 传送门与演出

```js
// 普通传送门（紫色的，通往某处）；返回对象有 setUnlocked(bool, color) / setLabel(text, bg)
ctx.portal(x, z, {
  label: '传送门', color: 0x9b6bff, locked: false,
  rotationY: 0,                    // 门面朝向（0 = 面朝 ±z）
  r: 2.1, y: 3.3, labelBg: 'rgba(...)'
});

ctx.returnPortal(x, z, { label: '⬅ 回广场', r: 1.6, rotationY: 0 });
// ★每个关卡都要有一个★（自动挂上「按 E 回广场」）

ctx.entity(obj)                    // 让 obj.animate(dt, time) 每帧被调用
ctx.addUpdater(fn)                 // 更底层：每帧 fn(dt)
ctx.particles.burst(new THREE.Vector3(x, y, z), 0xffd447, 20, 1.2);
ctx.fx.shake(0.2, 0.4);            // 震屏
ctx.fx.flash('#fff7cc', 0.5);      // 闪白
Game.Sfx.correct() / wrong() / chest() / craft() / unlock() / levelUp() / click() / hit() / knock() / shrink()
```

---

## 7. `ctx.helpers` 积木清单

**搭地图只用这里的函数，不要直接 `new THREE.Mesh`**（要做特殊造型时用 `ctx.scene.add`）。

| 函数 | 说明 |
| --- | --- |
| `h.addGround(w, d, color?)` | 铺一整块草地（比 bounds 大一圈） |
| `h.addPatch(x, z, w, d, colorOrTex?, rot?)` | 铺一块地砖 / 土路 / 木地板（可传 `Game.Textures.paving()` 等） |
| `h.addBounds(bounds)` | 四周的隐形结界墙（一般直接 `h.addBounds(ctx.bounds)`） |
| `h.addSolid(x, y, z, w, h, d)` | 一个碰撞盒；返回的 box 可以 `.noStep = true`（不许爬上去） |
| `h.addBox(x, y, z, w, h, d, mat, opts?)` | 长方体（`y` 是底面） |
| `h.addPlatform(x, z, w, d, topY)` | 可以跳上去的石台 |
| `h.addStairs(x, z, steps, size, stepH, dir)` | 台阶（`dir`：`'z+'` / `'z-'` / `'x+'` / `'x-'`） |
| `h.addDisc(cx, cz, r, opts?)` | ★圆形地面★（擂台、圆形广场用）；**没有碰撞盒**，靠关卡自己的 `ctx.setGround` 决定哪里算地面 |
| `h.addCylinder(cx, cy, cz, rTop, rBot, h, color, seg?)` | 圆柱 / 圆台（擂台下面的岛体、柱子） |
| `h.addRing(cx, cz, r, width, color, opts?)` | ★圆环★（擂台缩圈的红圈、许愿池池边）；改 `scale` 就能缩放 |
| `h.addFenceLine(x1, z1, x2, z2, opts?)` | 一段栅栏（带碰撞） |
| `h.addFenceWithGaps(x1, z1, x2, z2, gaps)` | 带缺口的栅栏（做大门洞） |
| `h.addClouds(n, height?)` | 天上的云（装饰） |
| `h.makeTree(x, z, s?)` / `h.makeRock` / `h.makeMushroom` / `h.makeFlower` | 装饰小物件 |
| `h.makeSign(text, x, y, z, opts?)` / `h.makeArch(...)` | 木牌 / 拱门 |
| `h.block(x, z, r)` | ★**登记「这里不许长装饰」**（树、石头会自动避开） |
| `h.scatter(n, rect, fn, pad?)` | 在矩形里撒 n 个装饰：`h.scatter(20, rect, (x, z) => h.makeTree(x, z), 3)` |
| `h.addUpdater(fn)` | 每帧回调（一般用 `ctx.entity` 更简单） |
| `h.mat(color)` / `Game.mat(color)` | 取一个共享材质（别每次 new Material） |

坐标系约定：**y 轴向上，地面 y=0，`-z` 是「北」**。
镜头 `yaw = 0` 表示朝 `-z` 看；`camera.dist` 是镜头离玩家的距离。

---

## 8. 内容数据（`src/content/`）

数据改动**不应该**碰关卡代码，反之亦然。

| 文件 | 内容 | 会被谁用 |
| --- | --- | --- |
| `items.js` | `Game.ITEMS`（id → 名字 / emoji / 稀有度 1~4）、`Game.RARITY`、`Game.RECIPES`、`Game.CHEST_LOOT` | 宝箱山谷、背包 HUD、第 4 关武器 |
| `hanzi.js` | `Game.HANZI`：`{char, pinyin, mean, words:[], emoji, quiz:{q, a, options:[]}}` + `Game.pickHanzi(n, learned)` | 汉字教室，以及以后所有「学习」类关卡 |
| `questions.js` | 题库**总管理**（不含题目本体）：多题库 bank + 随机抽题 | 谜语森林、宝箱山谷、以后所有「问答」类关卡 |
| `banks/` | ★**分类题库**★（家长可以手动编辑的纯数据文件）+ `banks/index.js` 清单 | 由 `main.js` 按清单动态加载 |

新做一类学习关卡（拼音 / 古诗 / 口算 / 英语单词）时：
**在 `content/banks/` 里加一个分类数据文件，然后复制 `hanzi-classroom/` 改玩法**，
不要新写一套引擎。

### 8.1 题库：多题库（bank）· 分类放 · 随机抽

**为什么这么分**：题目会越加越多，全塞进一个文件就没人愿意编辑了。
所以「一条题目」放**分类文件**，「怎么抽题」放 `questions.js`，「加载哪些文件」放 `banks/index.js`。

```text
src/content/banks/
├── index.js                  题库清单（Game.BANKS = ['content/banks/riddles/animals.js', ...]）
├── riddles/                  题库大类 'riddle'（猜谜语 · 第 1 关用）
│   ├── animals.js            分类 'animals' / 动物
│   ├── plants.js             'plants' / 花草树木
│   ├── nature.js             'nature' / 天气与自然
│   ├── food.js               'food' / 吃的喝的
│   ├── things.js             'things' / 生活用品
│   ├── body.js               'body' / 身体与穿着
│   └── characters.js         'characters' / 汉字字谜
└── commonsense/              题库大类 'commonsense'（生活常识 · 第 2 关宝箱用）
    ├── life.js               'life' / 生活常识
    ├── safety.js             'safety' / 安全常识
    ├── nature.js             'nature-w' / 自然常识
    └── society.js            'festival' / 节日与习俗
```

**题目 key 的格式是 `题库:分类:题目id`**（例：`commonsense:safety:red-light`），
存档按 key 记进度，所以在文件里调换顺序、中间插新题，都不会打乱小朋友的进度。

**加一条谜语**：打开对应的分类文件，按格式往后加一条就行。

```js
{
  id: 'pingpong',            // ★唯一、英文小写；存档按它记进度，别随便改
  emoji: '🏓',               // 只给以后的卡片用，答题面板不显示（会泄露答案）
  q: '圆圆一张小桌子，两人对着打小球；一左一右来回打，谁也不许用手接。',
  a: '乒乓球',
  options: ['羽毛球', '乒乓球', '篮球'],   // 必须包含 a（打开时顺序会打乱）
  hint: '它是我们国家的国球，要在桌子上打。'
}
```

**加一条常识题**：打开 `banks/commonsense/life.js`，格式一样，只是登记函数多一个参数：

```js
Game.registerQuestions('commonsense', 'life', '生活常识', [
  { id: 'wash-hands', q: '吃饭前应该先做什么？', a: '洗手',
    options: ['洗手', '看电视', '跑步'], hint: '手上有很多看不见的细菌。' }
]);
```

**加一个新分类 / 新题库大类**：

- 谜语新分类：复制 `animals.js` → 改第一行分类 id 和名字 → `banks/index.js` 加一行。
- 新题库大类（例：口算）：新分类文件里用 `Game.registerQuestions('math', 'add', '加法', [...])`，
  再到 `banks/index.js` 加一行，然后用 `Game.pickQuestions(n, { bank: 'math' })` 抽题。
- （**不用**改 `index.html` —— 题库文件跟关卡一样是动态加载的。）

**关卡里怎么用**：

```js
// 第 1 关：随机抽 6 道谜语（优先没答过的，抽不够就退回全部）
const round = Game.pickRiddles(6, { exclude: ctx.save.list('solvedKeys') });
// 第 2 关：随机抽 1 道常识题（4 个分类混着抽）
const q = Game.pickCommonsense(1, { exclude: ctx.save.list('quizKeys') })[0];

Game.pickQuestions(6, { bank: 'commonsense', cats: ['safety'], exclude: [...] });  // 完整写法
q.key        // 'commonsense:safety:red-light'（稳定不变）
q.label      // '安全常识'（可以显示在面板上）
q.cat        // 'safety'

ctx.save.pushUnique('solvedKeys', r.key);   // 答对了记下来，下次不再重复出
Game.bankStats('commonsense')   // { bank, label, total, cats:[{cat,label,count}] }
Game.normalizeQuestionKeys(list)  // 老存档兼容：'animals:rabbit' → 'riddle:animals:rabbit'
```

石板（`Game.makeStonePillar`）换题目时用 `stone.reset('谜语 1 ❓')` 复位、`stone.setSolved('⭐ 已解开')` 标记完成。

---

## 9. 存档规范

存档是 **v3：多档案（profile）+ 分关卡分区**，存在浏览器 localStorage
（key `block-hero.saves.v3`），`file://` 下也能用，老版本存档会自动迁移。

```js
ctx.save.get('picked', [])        // 读，第二个参数是默认值
ctx.save.set('picked', ['月'])     // 写
ctx.save.list('solved')           // 读数组（不存在就建一个空数组）
ctx.save.pushUnique('solved', 3)  // 往数组里塞不重复的值
ctx.save.has('solved', 3)         // 数组里有没有
ctx.save.flag('legendary')        // 读布尔
ctx.save.setFlag('legendary', true)
ctx.save.addNumber('count', 1)    // 数字累加
ctx.save.reset()                  // 只清空本关卡的数据
ctx.save.setDone(true)            // 标通关（一般用 ctx.complete 代替）
```

**规则**

1. 每个关卡**只用自己 `ctx.save`**（已经在 `levelId` 分区里了），键名用自己的语义。
2. **写盘由存档层负责**（`set` / `pushUnique` 会自动 debounce 保存），不要自己碰 localStorage。
3. 全局的只有三样：金币、背包、profile。要加新的全局字段，
   在 `save.js` 的 `emptyProfile()` / `game()` 里加，并写迁移。
4. **永远不要改 `id`**：`profiles[p].levels[<id>]` 就是小朋友的进度所在。
5. 换存档结构要升 `SCHEMA_VERSION` 并在 `_migrate()` 里加迁移分支；
   严禁直接改 storage key 让老存档凭空消失。
6. 换题库 key 规则时必须写兼容函数（v2.3.0 的 `Game.normalizeQuestionKeys` 就是例子）。

---

## 10. 常见坑（都是踩过的）

1. **镜头卡在传送门里**：出生点镜头在玩家身后 `dist` 处，
   回广场门若正好落在「镜头 → 玩家」这条线上，就会糊满屏幕。
   → 把回广场门**放在出生点侧面**（例：谜语森林 `spawn (0, -22)`，门在 `(-6.5, -22.5)`）。
2. **出生点一进关就弹出「按 E」**：交互半径默认 3.4，回广场门离出生点要 **≥ 4.5 格**。
3. **装饰长在路中间**：忘了 `h.block(x, z, r)`。出生点、传送门、宝箱、NPC 都要 block。
4. **物件看不见 / 切关卡后残留**：忘了 `ctx.scene.add(...)`，
   或者 `h.addSolid` 的 `y` 用了中心而不是底面。
5. **同一个提示叠好几层**：`ctx.toast` 用第 4 个参数 `key`（如 `'level-hint'`）。
6. **进度没存住**：只改了 `ctx.data`（内存），忘了写 `ctx.save`。
7. **别用 `rm -rf`**：这个环境禁止破坏性删除；挪文件用 `mv`，删内容用补丁工具。
8. **`src/levels/index.js` 忘了逗号** → 清单解析失败，广场一个门都没有（看控制台报错）。
9. 新增**关卡**不用改 `index.html`；只有新增**引擎 / 内容**文件才要在 `index.html` 加 `<script>`（顺序不能乱）。
10. **题库文件忘了写进 `src/content/banks/index.js`** → 题目条数变少（启动时会 `console.warn` 提示题库为空）。
11. **题目 `id` 重复** → 后一条会被忽略（控制台有 warn）。改了 `id` 等于把小朋友在那道题上的进度清零。
12. **`build()` 一个关卡只会跑一次**（导演按 id 缓存关卡）；每次进关都会跑的是 `onEnter(ctx)`。
    谜语森林就是靠 `onEnter` 判断「上一轮答完了 → 换一批新题」。
13. **`ctx.setGround` 是闭包捕获 `rt.ring` 的**（擂台关）：缩圈时地面判定会自动跟着缩，
    所以改缩圈只用改 `rt.ring`，不用重设地面函数 —— 反过来，**别把 `setGround` 写在会重复调用的地方**。
14. **答题面板不许放图案**：`Quiz` 只放文字；题目数据里的 `emoji` 不会显示（第 1 关的谜语就踩过）。
15. **战斗数值改了要重跑专项脚本**：`zsh scripts/test-arena.sh`（血量 / 弹开 / 缩圈 / 通关 / 被打下去）。
16. **背景音乐提前响不了是正常的**：浏览器不许在小朋友点按钮之前出声，
    所以 `Music.play()` 在 `Music.init()` 之前只记 `current`、不出声
    （别为了「一打开就有音乐」把 `init()` 挪到启动流程里 —— Chrome 会警告一整天）。
    另外后台标签页的定时器会被掐到 1 秒一次，音乐会卡成电音，
    所以切页签要自动 `pause()`（已经做了）。改了音乐相关的东西 → 跑 `scripts/test-music.sh`。

---

## 11. 验证与工具

### 11.1 三条命令（改完必跑）

```bash
cd /Users/xiao/workspace/mycraft-bestxiao
zsh scripts/check.sh            # 1) 所有 JS 语法检查（node --check）
zsh scripts/regress-all.sh      # 2) 四关全流程回归：谜语 → 宝箱答题+锻造 → 汉字换批 → 擂台
zsh scripts/test-arena.sh       # 3) 第 4 关专项（血量 / 弹开 / 缩圈 / 加时 / 通关 / 被打下去）
```

| 脚本 | 用途 |
| --- | --- |
| `scripts/serve.sh [端口]` | 起本地静态服务器（默认 8777） |
| `scripts/check.sh` | `node --check` 全部 `src/**/*.js` |
| `scripts/smoke.sh` | 冒烟：开页面 → 开始游戏 → 逐关进一遍，看有没有报错 |
| `scripts/test-level2.sh` | 第 1/2 关专项：**不显示头顶箭头**、宝箱先答题、答错不开箱、题目不重复 |
| `scripts/test-arena.sh` | 第 4 关专项（见上） |
| `scripts/test-desert.sh` | 第 5 关专项：骑马 / 冲刺 / 箭头只给大概方向 / 龙卷风卷下马 / 仙人掌 / 小蛇 / 马随机生成 / 超时自动回城 / 绿洲通关 |
| `scripts/test-music.sh` | 背景音乐专项：每关都有曲子 / 切关换曲 / 没点按钮不出声 / 关掉真的不响 / 暂停与切页签 / 存档字段与老存档迁移（见 `docs/背景音乐.md`） |
| `scripts/test-errors.sh` | 跑五张地图 + 开面板，收集 `console.error` / 未捕获异常 |
| `scripts/shots.sh` | 重拍 `docs/preview/*.png` 预览图 |
| `scripts/shot-level.sh <id>` | 给**任意一关**拍一张预览图：`zsh scripts/with-server.sh zsh scripts/shot-level.sh desert-escape` |
| `scripts/with-server.sh <命令>` | 临时起一个本地服务器，跑完自动关掉（脚本都要它才能跑） |

这些脚本用 `playwright-cli` 驱动本机 Chrome，需要能弹出浏览器窗口。
截图和日志写在 `work/`（不进版本库）。

### 11.1.1 测试通过就提交 + 打版本号（★用户定的规则，必做★）

**测试全绿之后必须提交一次本地 git，并给这个版本打一个 tag。** 没验证过就提交 = 把坏版本钉进历史。

```bash
cd /Users/xiao/workspace/mycraft-bestxiao
zsh scripts/check.sh                    # 1) 先跑绿
zsh scripts/regress-all.sh              # 2) 老关卡没被搞坏（新关再加自己的专项脚本）
git add -A
git commit -m "feat(lv5): 第 5 关 · 沙漠逃亡"
git tag -a v2.4.0 -m "v2.4.0 · 第 5 关沙漠逃亡"
```

- 一个「对小朋友有影响」的改动 = **一笔提交 + 一个 tag**。
- 版本号必须**三处一致**：`src/engine/namespace.js` 的 `Game.version`、
  `program/CHANGELOG.md` 的标题、git tag（`v<主>.<次>.<修>`）。
- 新关卡 / 新玩法 = 次版本号 +1；只修 bug = 修号 +1。
- **只提交本地，不要 `git push`**（除非用户明确说要推）。
- 提交信息前缀：`feat:` 新玩法 / `fix:` 修 bug / `docs:` 只改文档 / `chore:` 脚本与结构。

> ⚠️ **浏览器窗口在后台时 rAF 会被节流**：`sleep 20` 秒游戏里可能只走了 1 秒。
> 测「时间相关」的玩法（缩圈、加时、AI 打斗）要用页面内**手动步进**：
> 见 `scripts/test-arena.sh` 里的 `window.__run(秒数, {pin:true})` 写法。
> 另外：**站桩不动会被 6 个对手推下台**，所以测血量 / 缩圈时要把玩家「钉」在擂台中间再跑。

### 11.2 手工验证（浏览器里）

1. 打开页面，按 `F12` 看控制台**没有红色报错**（只有 `favicon.ico 404` 和 three.js 的 UMD 弃用警告是正常的）。
2. 走完该关的完整闭环：**进去 → 玩到通关 → 结算面板 → 下一关 / 回广场**。
3. 存档：刷新页面后进度还在（金币、已通关、已答题）。

### 11.3 调试小工具（控制台里用，`Game.debug.*`）

```js
Game.debug.go('chest-valley')   // 直接跳到某关
Game.debug.goHub()              // 回广场
Game.debug.teleport(x, z)       // 把玩家挪过去
Game.debug.state()              // 现在在哪 / 目标 / 金币 / 是否开着弹窗
Game.debug.nearest()            // 最近的可交互物（找 bug 很好用）
Game.debug.use()                // 触发最近的可交互物（相当于按 E）
Game.debug.pos()                // 玩家坐标
Game.debug.ctx('chest-valley')  // 拿到某关的运行上下文（可以看 / 改数据）
Game.debug.unlockAll()          // 解锁全部关卡（测试用）
Game.debug.coins(100)           // 加金币
Game.debug.banks()              // 题库统计：每个大类多少条、每个分类多少条
Game.debug.riddles()            // 谜语题库统计
Game.debug.commonsense()        // 常识题库统计
Game.debug.pick(6, {bank:'commonsense'})   // 随机抽题看看
Game.debug.round()              // 当前这一轮石碑上的题目（进第 1 关后用）
Game.debug.player / .director / .save / .levels
Game.Save.exportJSON()          // 导出存档
```

---

## 12. 接下来要建设的东西（路线图）

详细排期和「关卡点子池」在 `program/ROADMAP.md`（协调官维护）。

| 方向 | 现状 | 下一步建议 |
| --- | --- | --- |
| **关卡数量** | 小镇广场 + 4 关 | 每天加 1~2 关；广场传送门扇形排布，会自动容纳更多门 |
| **学习系统** | 汉字教室（认字 + 小测验 + 换一批） | 拼音 / 古诗 / 口算 / 英语：数据放 `content/banks/`，复制 `hanzi-classroom/` 改玩法；再加「学习进度」页 |
| **题库** | 多题库（谜语 65 / 常识 38）+ 随机抽且优先没答过的 | 「错题本」、按年龄分难度、家长在 `banks/` 里继续加 |
| **存档** | 多档案 + 分关卡 + 导入导出 + 迁移 | 备份到文件 / 云端、成就与统计页 |
| **装备系统** | 稀有度 1~4 + 锻造配方；第 4 关按稀有度决定伤害 / 击退 / 僵直 | 装备属性影响移动 / 跳跃；装备栏与手动换武器 |
| **战斗玩法** | 第 4 关：6 人机混战 + 双方弹开 + 每 3 分钟缩圈（3 次）+ 9 分钟加时 | 更多战斗关（守城堡、打 boss、本地双人对战）、观战镜头 |
| **世界感** | 每关可换天气（`theme`）+ **每关一首背景音乐**（v2.5.0，`Game.Music`，能开能关） | 昼夜循环、更多曲子 / 音效包、过场动画（`Game.Cue` / `Game.Queue`） |
| **协作** | 看板 + 任务卡 + 文件所有权（v2.3.0） | 每张卡一个 git 分支 / worktree；QA 报告自动汇总 |

### 关卡点子池（随时挑一个做）

- **探索类**：迷宫里找钥匙、跳平台收集星星、挖矿找宝石
- **答题类**：谜语（已做，65 条随机）、常识（已做，38 条）、拼音、古诗接龙、口算闯关、英语单词
- **收集类**：宝箱（已做，20 个 + 答题）、捡水果、抓小动物
- **操作类**：打地鼠、躲滚石、按颜色踩方块、追小羊、跳跳乐（广场已有雏形）
- **战斗类**：圆形擂台缩圈混战（已做）、擂台守关、打 boss、看谁先把对手打下去
- **学习类**：汉字（已做）、田字格描红、看图识物、数数

---

## 13. 变更记录

> 详细版（含每张任务卡）在 `program/CHANGELOG.md`。

- **v2.5.0**（背景音乐）：新增引擎 `engine/music.js`（`Game.Music`）——
  **每关一首现场合成的原创曲子**（曲子 id = 关卡 id，切关自动换曲，没配就放 `default`），
  开始界面 + 暂停菜单各有 `🎵 音乐：开 / 关` 按钮，开关存在档案里（`settings.music`，默认开，
  老存档自动补字段）；新增 `scripts/test-music.sh` 与 `docs/背景音乐.md`（含曲库表 / 怎么改曲子）。
  坑：浏览器不许在用户点按钮之前出声，所以 `Music.play()` 在 `init()` 之前**只记账不出声**。
- **v2.3.0**（迁移 + 答题体系 + 擂台手感）：
  项目搬到 `/Users/xiao/workspace/mycraft-bestxiao`，并加上**多 Agent 并行协作机制**
  （与「关卡设计卡」系统桥接见第 3.9 节：`levels/` 设计卡 → `program/tasks/` 实现卡 → `src/levels/` 代码）
  （`agents/` 角色提示词 + `program/` 看板/任务卡/决策 + `scripts/` 可复跑验证 + 本节第 3 节）。
  第 2 关：**不再显示头顶指引箭头**（新增关卡字段 `noGuide: true`），
  **每个宝箱要先答对一道常识题才能打开**；
  新增引擎 `engine/quiz.js`（`Game.Quiz.ask` 通用答题弹窗），第 1 关石碑也改用它；
  `content/riddles.js` → **`content/questions.js`**（多题库 bank 架构：`registerQuestions` /
  `pickQuestions(n,{bank,exclude,cats})` / `bankStats`），题目 key 变成 `题库:分类:id`
  并加了老存档兼容 `normalizeQuestionKeys`；新增**常识题库 38 条**（生活 / 安全 / 自然 / 节日）
  放在 `content/banks/commonsense/`。
  第 4 关：对手 4 → **6 个**，**双方攻击后都会被弹开**（`RECOIL` / `BOT_RECOIL`），
  被打中僵直 0.5 → **0.85 秒**，血量 100/60 → **400/300**，人机互殴一下只掉 2 滴血
  （`BOT_DMG_BOT`），AI 更爱打别的对手（`pickTarget` 打分制）—— 一场能打到后面几轮缩圈。
- **v2.2.0**（题库系统）：谜语 9 条 → **65 条**，拆成 **7 个分类文件**放进
  `src/content/banks/riddles/`；新增 `src/content/banks/index.js` 题库清单，由 `main.js` 动态加载；
  第 1 关改成**每轮随机抽 6 道、没答过的优先**，答完一轮后重新进关自动换一批新谜语；
  存档从「石碑序号」改成「谜语 id（`solvedKeys`）」并兼容老存档。
- **v2.1.0**（内容扩充）：广场从「一条街」扩建成**小镇**；第 1 关谜语面板**去掉图案提示**；
  第 2 关范围扩大、宝箱 12 → **20**；第 3 关跟老师说完话会**自动换一批新汉字**；
  **新增第 4 关 · 圆形擂台**；引擎新增 `ctx.setGround`、`ctx.player.consumeAttack/swing/knockback/faceDir/stunT`、
  `Game.makeBot`、`Game.UI.battle`、`h.addDisc/addCylinder/addRing`、`Sfx.hit/knock`。
- **v2.0.0**（框架重构）：引擎 / 内容 / 玩法三层分离；关卡自注册 + 清单动态加载；
  广场传送门自动生成；存档 v3（多档案 + 分关卡分区 + 导入导出 + 自动迁移）；
  新增汉字教室与 `_TEMPLATE` 模板；旧单层代码移入 `legacy/`。

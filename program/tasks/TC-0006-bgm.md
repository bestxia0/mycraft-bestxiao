# TC-0006 · 背景音乐（每关一首 + 设置里能开 / 关）

| 字段 | 值 |
| --- | --- |
| 卡号 | TC-0006 |
| 状态 | **done**（C2 做完 → C5 复跑全绿；小朋友试听还没做） |
| 角色 | C2 引擎架构师 |
| 优先级 | P1 |
| 依赖 | 无 |
| 创建 / 完成 | 2026-10-24 / 2026-10-24 |

---

## TASK（协调官写）

**要做什么**（用户原话）：
「增加个背景音乐，你找几个比较合适的背景音乐。然后游戏设置里面可以开启背景音乐，
也可以关闭背景音乐。加游戏的趣味性」

**验收标准**：
- [x] 每一关（含广场）都有**配得上这关场景**的背景音乐，一进关自动换上那一关的曲子
- [x] 没配曲子的关卡兜底放 `default`，不报错
- [x] **开始界面**和**暂停菜单**里都能开 / 关背景音乐
- [x] 开关存进档案（`settings.music`，默认开）：换小朋友 / 导入存档会跟着切；
      老存档（没有这个字段）载入时自动补上，**进度一个都不丢**
- [x] 不许在小朋友点按钮之前出声（浏览器规矩）；切页签自动暂停、回来继续；
      暂停菜单会暂停音乐
- [x] `zsh scripts/check.sh` + `scripts/test-music.sh` + `scripts/regress-all.sh`
      + `scripts/test-desert.sh` + `scripts/test-errors.sh` 全过
- [x] 不改老关卡的玩法（只动引擎 + 开关按钮）

**允许改的文件**：
- `src/engine/music.js`（新增）、`src/engine/save.js`、`src/engine/director.js`、`src/main.js`、`index.html`
- `scripts/test-music.sh`（新增）
- `docs/背景音乐.md`（新增）、`README.md`、`AGENTS.md`、`program/**`、`levels/**`（文档同步）

**不许改的**：`src/levels/**` 的玩法代码、`src/content/**`（音乐是引擎能力，关卡不用自己写音乐）

**关键决定**：**不用 mp3**，曲子全部用 WebAudio 现场合成（理由见 `program/DECISIONS.md` D-009）。

---

## RECEIPT（执行者写完交回执）

**改了哪些文件**：
- 新增 `src/engine/music.js`（`Game.Music`：曲库 `TRACKS` + 调度器 + 开关 / 音量接口）
- `index.html`（`music.js` 的 `<script>` + `#musicBtn` + `#pauseMusicBtn`）
- `src/engine/save.js`（`settings.music` + 老存档迁移）、`src/engine/director.js`（切关换曲 / 暂停续播）、
  `src/main.js`（开关按钮 / 首次点击才 `init()`）
- 新增 `scripts/test-music.sh`、`docs/背景音乐.md`
- 文档同步：`program/CHANGELOG.md`（v2.5.0）、`program/DECISIONS.md`（D-009）、`README.md`、
  `AGENTS.md`、`docs/工作流程.md`、`levels/README.md` + 6 张关卡卡各加一行「背景音乐」

**怎么验证的**（命令 + 关键输出）：

```bash
cd /Users/xiao/workspace/mycraft-bestxiao
zsh scripts/check.sh
# 输出：OK：43 个 JS 文件语法检查全部通过

zsh scripts/with-server.sh zsh scripts/test-music.sh
# A 还没点按钮：建了ctx没=false、在响没=false
# B 每关都有曲子（hub-square / riddle-forest / chest-valley / hanzi-classroom / arena-battle / desert-escape + default）
# C 点开始后：在响没=true、调度器活、ctx状态=running
# D 六次切关，每次「正好是这一关的曲子=true」
# E play('还没做的关卡') → default（不报错）
# F 暂停菜单：暂停没=true → 点继续玩 → 暂停没=false、在响没=true
# G 关掉：开关=false、在响没=false、调度器=null、存档记 false；打开后恢复在响
# H 切页签：暂停没=true / 回来 false
# I 导出存档带 music；删掉字段再导入 → 自动补 true（重开页面也一样）
# J 音量接口：0.5 / 上限夹到 1 / 恢复 0.35

zsh scripts/with-server.sh zsh scripts/regress-all.sh   # 老 4 关全流程通过
zsh scripts/with-server.sh zsh scripts/test-desert.sh   # 第 5 关专项 14 段全绿
zsh scripts/with-server.sh zsh scripts/test-errors.sh   # errors: []  warns: []
```

**遗留问题 / 下次再做**：
- 只有「开 / 关」，**没有音量滑杆**（接口 `Game.Music.setVolume()` 已经有了，界面没做）。
- 每关只有一首曲子；「最后 30 秒换更紧张的曲子」这类切换还没做（可以在关卡里调 `Game.Music.play()`）。
- 曲子好不好听要**小朋友试听**才算数（本卡只到「能响、能开关、不报错」）。

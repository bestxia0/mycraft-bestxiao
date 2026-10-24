# legacy/ 旧版本备份（不要参考、不要修改）

这里的 4 个文件是**第一版**「方块小勇士」的源码（单层结构，没有关卡框架）。
新版已经把它们的职责拆到了 `src/engine/`、`src/content/`、`src/levels/` 三处。

`index.html` **不会加载** 这里的任何文件，它们不会影响游戏。
留着只是为了万一想翻翻旧代码。写新东西请一律看 `src/` 和根目录的 `AGENTS.md`。

| 旧文件 | 现在应该去哪 |
| --- | --- |
| `core.js` | `src/engine/`（textures / audio / particles / save / namespace） |
| `world.js` | `src/engine/blocks.js` + `src/engine/entities.js` + 各关卡的 `build(ctx)` |
| `entities.js` | `src/engine/entities.js` |
| `levels.js` | `src/levels/<关卡>/level.js` + `src/content/`（谜语 / 装备 / 汉字数据） |

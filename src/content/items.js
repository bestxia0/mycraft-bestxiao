/* ===================================================================
   content/items.js
   装备表 + 锻造配方（纯数据，跟代码分开，改这里不用碰逻辑）
   -------------------------------------------------------------------
   稀有度 rarity：1 普通 / 2 稀有 / 3 史诗 / 4 传说
   想加新装备：往 Game.ITEMS 里加一行，再把它写进某个宝箱里就行。
   =================================================================== */
(function () {
  const Game = window.Game;

  Game.RARITY = {
    1: { name: '普通', cls: 'rar1', color: 0xdfe6ec },
    2: { name: '稀有', cls: 'rar2', color: 0xa7d3ff },
    3: { name: '史诗', cls: 'rar3', color: 0xc9a6ff },
    4: { name: '传说', cls: 'rar4', color: 0xffd447 }
  };

  Game.ITEMS = {
    wood_sword:    { name: '木剑', emoji: '🗡️', rarity: 1 },
    wood_shield:   { name: '木盾', emoji: '🛡️', rarity: 1 },
    leather_cap:   { name: '皮帽', emoji: '🧢', rarity: 1 },
    leather_boots: { name: '皮靴', emoji: '👢', rarity: 1 },
    stone_hammer:  { name: '石锤', emoji: '🔨', rarity: 1 },
    cloth_armor:   { name: '布衣', emoji: '👕', rarity: 1 },
    iron_sword:    { name: '铁剑', emoji: '⚔️', rarity: 2 },
    iron_shield:   { name: '铁盾', emoji: '🛡️', rarity: 2 },
    iron_helm:     { name: '铁盔', emoji: '⛑️', rarity: 2 },
    long_bow:      { name: '长弓', emoji: '🏹', rarity: 2 },
    gold_sword:    { name: '金剑', emoji: '🌟', rarity: 3 },
    gold_helm:     { name: '金盔', emoji: '👑', rarity: 3 },
    diamond_sword: { name: '钻石勇者之剑', emoji: '💎', rarity: 4 }
  };

  Game.itemsOfRarity = function (r) {
    return Object.keys(Game.ITEMS).filter(function (k) { return Game.ITEMS[k].rarity === r; });
  };

  Game.itemInfo = function (id) {
    return Game.ITEMS[id] || { name: id, emoji: '❔', rarity: 1 };
  };

  /* 宝箱里的装备（打乱后放进宝箱）：10 普通 + 6 稀有 + 4 史诗
     条数要和关卡的宝箱数量一致（现在宝箱山谷有 20 个宝箱） */
  Game.CHEST_LOOT = [
    'wood_sword', 'wood_shield', 'leather_cap', 'leather_boots', 'stone_hammer', 'cloth_armor',
    'wood_sword', 'wood_shield', 'leather_cap', 'stone_hammer',
    'iron_sword', 'iron_shield', 'iron_helm', 'long_bow', 'iron_sword', 'iron_shield',
    'gold_sword', 'gold_helm', 'gold_sword', 'gold_helm'
  ];

  /* 锻造配方 */
  Game.RECIPES = [
    { from: 1, need: 5, to: 2, text: '5 件普通装备 → 1 件稀有装备' },
    { from: 2, need: 3, to: 3, text: '3 件稀有装备 → 1 件史诗装备' },
    { from: 3, need: 3, to: 4, text: '3 件史诗装备 → 1 件传说装备（钻石勇者之剑）' }
  ];
})();

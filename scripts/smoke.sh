#!/bin/zsh
# 冒烟：开页面 → 开始 → 逐关进一遍 + 回广场，看有没有报错、门都在不在
set -u
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
PORT="${PORT:-8777}"
PW="playwright-cli"
ev() { $PW --raw eval "$1" 2>&1 | tail -2 }

$PW open --browser=chrome "http://127.0.0.1:$PORT/index.html" >/dev/null 2>&1
sleep 1.5
echo "开始界面: $(ev "JSON.stringify({version:Game.version,levels:Game.Levels.list().map(d=>d.id)})")"
$PW click "#startBtn" >/dev/null 2>&1
sleep 1.5
ev "(()=>{Game.debug.unlockAll();return 'ok'})()" >/dev/null
sleep 0.5
echo "广场: $(ev "JSON.stringify(Game.debug.state())")"
echo "门: $(ev "(()=>{const a=Game.debug.director.active;return JSON.stringify(((a.data||{}).portals||[]).map(p=>[p.levelId,p.status]))})()")"
for L in riddle-forest chest-valley hanzi-classroom arena-battle desert-escape paint-the-field stone-maze hub-square; do
  echo "进 $L: $(ev "(()=>{Game.debug.go('$L');return Game.debug.state().name})()")"
  sleep 1.2
  echo "   任务条: $(ev "String(Game.debug.director.objective && Game.debug.director.objective.text)")"
done
echo "存档导出: $(ev "(()=>{return '字符数='+Game.debug.save.exportJSON().length})()")"
echo DONE

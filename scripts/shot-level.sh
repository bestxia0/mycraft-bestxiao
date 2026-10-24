#!/bin/zsh
# 给任意一关拍一张预览图（配 with-server.sh 用）。
# 用法：zsh scripts/with-server.sh zsh scripts/shot-level.sh <关卡id> [输出png] [x,z=先把玩家挪过去]
# 例：  zsh scripts/with-server.sh zsh scripts/shot-level.sh desert-escape
set -u
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
PORT="${PORT:-8777}"
PW="playwright-cli"
L="${1:?用法: zsh scripts/shot-level.sh <关卡id> [输出png]}"
OUT="${2:-$ROOT/work/level-$L.png}"
AT="${3:-}"
ev() { $PW --raw eval "$1" 2>&1 | tail -2 }

$PW open --browser=chrome "http://127.0.0.1:$PORT/index.html" >/dev/null 2>&1
sleep 2
$PW click "#startBtn" >/dev/null 2>&1
sleep 1.2
ev "(()=>{Game.debug.unlockAll();return Game.Levels.list().map(d=>d.id).join(',')})()"
ev "(()=>{Game.debug.go('$L');return Game.debug.state().name})()"
if [ -n "$AT" ]; then
  ev "(()=>{var a='$AT'.split(',');Game.debug.teleport(+a[0],+a[1]);return 'at $AT'})()"
fi
sleep 2.2
echo "任务条: $(ev "String(Game.debug.director.objective && Game.debug.director.objective.text)")"
echo "顶部计时条: $(ev "(()=>{const e=document.getElementById('battleHud');if(e.classList.contains('hidden'))return '（没显示）';
  const bar=e.querySelector('.battle-bar');return e.innerText.replace(/\n/g,' | ')+' 〔血条'+(bar.classList.contains('hidden')?'藏起来':'显示中')+'〕'})()")"
$PW screenshot --filename="$OUT" >/dev/null 2>&1
echo "已保存：$OUT"

#!/bin/zsh
# 重拍交付用预览图（docs/preview/*.png）：
#   开始界面 / 广场 / 谜语 / 宝箱 / 汉字 / 擂台 / 沙漠 / 踩白大草原
set -u
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
PORT="${PORT:-8777}"
PW="playwright-cli"
OUT="$ROOT/docs/preview"
ev() { $PW --raw eval "$1" 2>&1 | tail -2 }
shot() { $PW screenshot --filename=$1 >/dev/null 2>&1 }

$PW open --browser=chrome "http://127.0.0.1:$PORT/index.html" >/dev/null 2>&1
sleep 2.5
shot "$OUT/preview-0-start.png"
$PW click "#startBtn" >/dev/null 2>&1
sleep 1.2
ev "(()=>{Game.Save.resetProfile();Game.debug.director.rebuild('hub-square');return 'ok'})()" >/dev/null
sleep 1.6
shot "$OUT/preview-1-plaza.png"

ev "(()=>{Game.debug.go('riddle-forest');return 'ok'})()" >/dev/null
sleep 1.5
ev "(()=>{const p=Game.debug.director.active.data.stones[0].group.position;Game.debug.teleport(p.x,p.z);return 'ok'})()" >/dev/null
sleep 0.6
ev "(()=>{Game.debug.use();return 'ok'})()" >/dev/null
sleep 1
shot "$OUT/preview-2-riddle.png"
echo "谜语面板里有图案吗: $(ev "(()=>{const b=document.querySelector('#modalRoot .modal-panel');if(!b)return 'NO-PANEL';return JSON.stringify({bigEmoji:b.querySelector('.big-emoji')?b.querySelector('.big-emoji').textContent:null})})()")"
ev "(()=>{Game.UI.closeAll();return 'ok'})()" >/dev/null

ev "(()=>{Game.debug.unlockAll();Game.debug.go('chest-valley');return 'ok'})()" >/dev/null
sleep 1.6
shot "$OUT/preview-3-valley.png"
ev "(()=>{Game.debug.go('hanzi-classroom');return 'ok'})()" >/dev/null
sleep 1.6
shot "$OUT/preview-4-classroom.png"
ev "(()=>{Game.debug.go('arena-battle');return 'ok'})()" >/dev/null
sleep 2
shot "$OUT/preview-5-arena.png"
ev "(()=>{Game.debug.go('desert-escape');return 'ok'})()" >/dev/null
sleep 2
shot "$OUT/preview-6-desert.png"
ev "(()=>{Game.debug.go('paint-the-field');return 'ok'})()" >/dev/null
sleep 2
shot "$OUT/preview-7-paint.png"
echo DONE

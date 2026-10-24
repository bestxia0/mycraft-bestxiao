#!/bin/zsh
# 第 1/2 关专项：不显示头顶指引箭头 / 宝箱先答题 / 答错不开箱 / 题目不重复 / 题库统计
set -u
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
PORT="${PORT:-8777}"
PW="playwright-cli"
ev() { $PW --raw eval "$1" 2>&1 | tail -2 }
shot() { $PW screenshot --filename=$1 >/dev/null 2>&1 }

$PW open --browser=chrome "http://127.0.0.1:$PORT/index.html" >/dev/null 2>&1
$PW click "#startBtn" >/dev/null 2>&1
sleep 1
ev "(()=>{Game.Save.resetProfile();Game.debug.unlockAll();return 'ok'})()" >/dev/null
sleep 0.6
echo "题库: $(ev "JSON.stringify(Game.debug.banks().map(b=>[b.bank,b.total,b.cats.length]))")"

echo ""
echo "===== A. 第 2 关：不显示头顶指引箭头 ====="
ev "(()=>{Game.debug.go('riddle-forest');return 'ok'})()" >/dev/null
sleep 1.4
echo "  第 1 关（对照，应为 true）: $(ev "String(Game.debug.director.guideArrow.visible)")"
ev "(()=>{Game.debug.go('chest-valley');return 'ok'})()" >/dev/null
sleep 1.4
echo "  第 2 关（应为 false）: $(ev "String(Game.debug.director.guideArrow.visible)")"
echo "  noGuide 标记: $(ev "String(!!Game.debug.director.active.def.noGuide)")"

echo ""
echo "===== B. 宝箱先答题，答错不开箱，答对才开 ====="
echo "  走到 0 号宝箱: $(ev "(()=>{const p=Game.debug.director.active.data.chests[0].group.position;Game.debug.teleport(p.x,p.z+2);return 'moved'})()")"
sleep 0.5
ev "Game.debug.use()" >/dev/null
sleep 0.7
echo "  面板 chip: $(ev "(()=>{const p=document.querySelector('#modalRoot .modal-panel');return p?(p.querySelector('.chip')||{}).textContent:'NO-PANEL'})()")"
echo "  题目: $(ev "(()=>{const q=document.querySelector('#modalRoot .riddle-q');return q?q.textContent:'NO-Q'})()")"
echo "  有没有图案（应为 false / 0）: $(ev "(()=>{const p=document.querySelector('#modalRoot .modal-panel');return JSON.stringify({bigEmoji:!!p.querySelector('.big-emoji'),imgs:p.querySelectorAll('img').length})})()")"
shot work/l2-chest-quiz.png
echo "  先点错的: $(ev "(()=>{const cs=[...document.querySelectorAll('#modalRoot .option')];const t=cs&&cs.length?cs[0]:null;if(!t)return 'MISS';t.click();return '点了 '+t.textContent})()")"
sleep 0.5
echo "  错题反馈: $(ev "(()=>{const f=document.querySelector('#modalRoot .feedback');return f?f.textContent:'NO'})()")"
echo "  箱子还是关着的? $(ev "(()=>{const c=Game.debug.director.active.data.chests[0];return JSON.stringify({opened:c.opened,count:Game.debug.save.level('chest-valley').list('chests').length})})()")"
echo "  点对的: $(ev "(()=>{const b=[...document.querySelectorAll('#modalRoot .option')].find(x=>!x.disabled);if(!b)return 'MISS';b.click();return '点了 '+b.textContent})()")"
sleep 1.4
echo "  开箱结果: $(ev "(()=>{const c=Game.debug.director.active.data.chests[0];const s=Game.debug.save;return JSON.stringify({opened:c.opened,chests:s.level('chest-valley').list('chests').length,quizKeys:s.level('chest-valley').list('quizKeys').length,items:Object.keys(s.inventory()).length,coins:s.game().coins})})()")"
echo "  面板还在吗: $(ev "String(Game.UI.anyOpen())")"
ev "Game.UI.closeAll()" >/dev/null
sleep 0.3

echo ""
echo "===== C. 连开 4 箱：题目不重复 ====="
for i in 1 2 3 4; do
  ev "(()=>{const p=Game.debug.director.active.data.chests[$i].group.position;Game.debug.teleport(p.x,p.z+1.4);return 'moved'})()" >/dev/null
  sleep 0.35
  ev "Game.debug.use()" >/dev/null
  sleep 0.45
  echo "    第$i 箱题目: $(ev "(()=>{const q=document.querySelector('#modalRoot .riddle-q');return q?q.textContent.slice(0,18)+'…':'NO-Q'})()")"
  ev "(()=>{const b=[...document.querySelectorAll('#modalRoot .option')].find(x=>!x.disabled);if(b)b.click();return 1})()" >/dev/null
  sleep 1.3
done
echo "  已答过: $(ev "(()=>{const l=Game.debug.save.level('chest-valley').list('quizKeys');return JSON.stringify({条数:l.length,去重后:new Set(l).size})})()")"
echo "  背包: $(ev "(()=>{const s=Game.debug.save;return JSON.stringify({chests:s.level('chest-valley').list('chests').length,coins:s.game().coins})})()")"
shot work/l2-valley.png
echo DONE

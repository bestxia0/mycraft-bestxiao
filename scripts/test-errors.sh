#!/bin/zsh
# 运行时错误钩子：跑一圈各关卡 + 开答题面板，看有没有 console.error / 未捕获异常
set -u
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
PORT="${PORT:-8777}"
PW="playwright-cli"
ev() { $PW --raw eval "$1" 2>&1 | tail -2 }

$PW open --browser=chrome "http://127.0.0.1:$PORT/index.html" >/dev/null 2>&1
$PW click "#startBtn" >/dev/null 2>&1
sleep 1

echo "装钩子: $(ev "(()=>{window.__errs=[];const ce=console.error;console.error=function(){window.__errs.push([...arguments].map(String).join(' '));ce.apply(console,arguments)};window.__warns=[];const cw=console.warn;console.warn=function(){window.__warns.push([...arguments].map(String).join(' '));cw.apply(console,arguments)};window.addEventListener('error',e=>window.__errs.push('onerror: '+e.message));return 'ok'})()")"
echo "清档+重建所有关卡: $(ev "(()=>{Game.Save.resetProfile();Game.debug.unlockAll();Game.debug.director.rebuild();return 'ok'})()")"
sleep 1.5
echo "题库: $(ev "JSON.stringify(Game.debug.banks().map(b=>[b.bank,b.total,b.cats.length]))")"

for L in riddle-forest chest-valley hanzi-classroom arena-battle hub-square; do
  echo "进 $L: $(ev "(()=>{Game.debug.go('$L');return Game.debug.state().name})()")"
  sleep 1.4
done

echo "第 1 关开面板: $(ev "(()=>{Game.debug.go('riddle-forest');return 'ok'})()")"
sleep 1.2
ev "(()=>{const p=Game.debug.director.active.data.stones[0].group.position;Game.debug.teleport(p.x,p.z+2.2);return 'moved'})()" >/dev/null
sleep 0.4
ev "Game.debug.use()" >/dev/null
sleep 0.6
echo "  点提示: $(ev "(()=>{const b=[...document.querySelectorAll('#modalRoot button')].find(x=>/提示/.test(x.textContent));if(!b)return 'MISS';b.click();return 'ok'})()")"
sleep 0.3
echo "  点错选项: $(ev "(()=>{const rt=Game.debug.director.active.data;const a=rt.round[0].a;const b=[...document.querySelectorAll('#modalRoot button')].find(x=>x.textContent.trim()!==a&&x.className.indexOf('option')>=0);if(!b)return 'MISS';b.click();return 'ok'})()")"
sleep 0.4
echo "  关闭: $(ev "(()=>{Game.UI.closeAll();return 'ok'})()")"
sleep 0.4

echo "=== 运行期间捕获到的错误 ==="
echo "errors: $(ev "JSON.stringify(window.__errs)")"
echo "warns : $(ev "JSON.stringify(window.__warns)")"
echo DONE

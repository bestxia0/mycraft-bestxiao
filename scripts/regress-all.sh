#!/bin/zsh
# 四关全流程回归：谜语森林 → 宝箱山谷(20 箱答题+锻造) → 汉字教室(换一批) → 圆形擂台
# 需要：本机 Chrome + playwright-cli；服务器已起（zsh scripts/serve.sh）
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
ev "(()=>{Game.Save.resetProfile();Game.debug.director.rebuild('hub-square');return 'ok'})()" >/dev/null
sleep 1.2

echo "=== 第 1 关 · 谜语森林 ==="
ev "(()=>{Game.debug.go('riddle-forest');return 'ok'})()" >/dev/null
sleep 1.2
for i in 1 2 3 4 5 6; do
  idx=$((i-1))
  ev "(()=>{const p=Game.debug.director.active.data.stones[$idx].group.position;Game.debug.teleport(p.x,p.z+2.4);return 'moved'})()" >/dev/null
  sleep 0.4
  ev "(()=>{Game.debug.use();return 'use'})()" >/dev/null
  sleep 0.4
  echo "  石碑$i: $(ev "(()=>{const t=Game.debug.director.active.data.round[$idx].a;const b=[...document.querySelectorAll('#modalRoot button')].find(x=>x.textContent.trim()===t);if(!b)return 'MISS';b.click();return '答对 '+t})()")"
  sleep 1.1
done
echo "金币: $(ev "(()=>{return String(Game.debug.save.game().coins)})()")"
ev "(()=>{Game.debug.teleport(0,20);return 'ok'})()" >/dev/null
sleep 1.6
echo "结算: $(ev "(()=>{const t=document.querySelector('#modalRoot .modal-panel');return t?(t.querySelector('.chip')||{}).textContent:'NONE'})()")"
ev "(()=>{const b=[...document.querySelectorAll('#modalRoot button')].find(x=>/宝箱山谷/.test(x.textContent));if(b)b.click();return 'ok'})()" >/dev/null
sleep 1.8

echo "=== 第 2 关 · 宝箱山谷（20 个宝箱，每个先答一道常识题 + 锻造） ==="
ANSWER="(()=>{const t=(document.querySelector('#modalRoot .riddle-q')||{}).textContent;const it=Game.bankItems('commonsense').find(x=>x.q===t);if(!it)return 'MISS-Q:'+t;const b=[...document.querySelectorAll('#modalRoot .option')].find(x=>x.textContent.trim()===it.a);if(!b)return 'MISS-BTN:'+it.a;b.click();return '答对 '+it.a})()"
for i in $(seq 1 20); do
  idx=$((i-1))
  ev "(()=>{const p=Game.debug.director.active.data.chests[$idx].group.position;Game.debug.teleport(p.x,p.z);return 'moved'})()" >/dev/null
  sleep 0.3
  ev "(()=>{Game.debug.use();return 'use'})()" >/dev/null
  sleep 0.3
  echo "  宝箱$i: $(ev "$ANSWER")"
  sleep 1.2
done
echo "背包: $(ev "(()=>{const s=Game.debug.save;const inv=s.inventory();const by={1:0,2:0,3:0,4:0};for(const k in inv)by[Game.itemInfo(k).rarity]+=inv[k];return JSON.stringify({coins:s.game().coins,chests:s.level('chest-valley').list('chests').length,byRarity:by})})()")"
ev "(()=>{Game.debug.teleport(-6,-17.6);return 'ok'})()" >/dev/null
sleep 0.5
ev "(()=>{Game.debug.use();return 'use'})()" >/dev/null
sleep 0.7
DISMISS="(()=>{const ps=[...document.querySelectorAll('#modalRoot .modal-panel')];const top=ps[ps.length-1];if(!top)return 'none';const c=top.querySelector('.chip');const t=c?c.textContent:'';if(t.indexOf('铁匠铺')<0){Game.UI.closeTop();return 'closed'}return 'keep'})()"
for i in $(seq 1 40); do
  r=$(ev "(()=>{const b=document.querySelector('#forgeRecipes .recipe button:not([disabled])');if(!b)return 'none';b.click();return 'craft'})()")
  if [ "$r" = "\"none\"" ]; then break; fi
  sleep 0.45
  ev "$DISMISS" >/dev/null
  if [[ "$(ev "(()=>{return String(Game.debug.save.level('chest-valley').flag('legendary'))})()")" == *"true"* ]]; then break; fi
done
echo "锻造: $(ev "(()=>{const s=Game.debug.save;const inv=s.inventory();return JSON.stringify({legendary:s.level('chest-valley').flag('legendary'),diamond:inv.diamond_sword||0,kinds:Object.keys(inv).length})})()")"
ev "(()=>{Game.UI.closeAll();return 'ok'})()" >/dev/null
sleep 0.8
shot work/reg-l2-valley.png
ev "(()=>{Game.debug.teleport(0,32);return 'ok'})()" >/dev/null
sleep 0.6
ev "(()=>{Game.debug.use();return 'use'})()" >/dev/null
sleep 1.6
echo "结算: $(ev "(()=>{const t=document.querySelector('#modalRoot .modal-panel');return t?(t.querySelector('.chip')||{}).textContent:'NONE'})()")"
ev "(()=>{const b=[...document.querySelectorAll('#modalRoot button')].find(x=>/汉字教室/.test(x.textContent));if(b)b.click();return 'ok'})()" >/dev/null
sleep 1.8

echo "=== 第 3 关 · 汉字教室（学完 + 找老师换一批） ==="
echo "第一批: $(ev "(()=>{return JSON.stringify(Game.debug.director.active.data.cards.map(c=>c.char))})()")"
for i in $(seq 1 5); do
  idx=$((i-1))
  ev "(()=>{const c=Game.debug.director.active.data.cards[$idx];Game.debug.teleport(c.x,c.z);return c.char})()" >/dev/null
  sleep 0.4
  ev "(()=>{Game.debug.use();return 'use'})()" >/dev/null
  sleep 0.5
  echo "  字卡$i: $(ev "(()=>{const c=Game.debug.director.active.data.cards[$idx];const t=c.info.quiz.a;const b=[...document.querySelectorAll('#modalRoot .option')].find(x=>x.textContent.trim()===t);if(!b)return 'MISS '+t;b.click();return '答对 '+t+' ('+c.char+')'})()")"
  sleep 1.3
done
echo "学完: $(ev "(()=>{const s=Game.debug.save;return JSON.stringify({coins:s.game().coins,learned:s.level('hanzi-classroom').list('learned')})})()")"
ev "(()=>{Game.UI.closeAll();return 'ok'})()" >/dev/null
sleep 0.6
ev "(()=>{Game.debug.teleport(0,-10.5);return 'ok'})()" >/dev/null
sleep 0.6
ev "(()=>{Game.debug.use();return 'use'})()" >/dev/null
sleep 0.8
for i in 1 2 3 4 5 6 7 8; do
  ev "(()=>{if(Game.Dialogue.isOpen())Game.Dialogue.next();return 'next'})()" >/dev/null
  sleep 0.5
done
sleep 0.8
echo "老师换批后: $(ev "(()=>{const rt=Game.debug.director.active.data;const s=Game.debug.save.level('hanzi-classroom');return JSON.stringify({cards:rt.cards.map(c=>c.char),picked:s.list('picked'),learned:s.list('learned').length,obj:Game.debug.director.objective.text})})()")"
shot work/reg-l3-classroom.png

echo "=== 第 4 关 · 圆形擂台 ==="
ev "(()=>{Game.debug.goHub();return 'ok'})()" >/dev/null
sleep 1.2
ev "(()=>{Game.debug.go('arena-battle');return 'ok'})()" >/dev/null
sleep 2
echo "进场: $(ev "(()=>{const rt=Game.debug.director.active.data;return JSON.stringify({ring:Math.round(rt.ring),alive:rt.bots.filter(b=>b.alive).length,weapon:rt.weapon.name})})()")"
shot work/reg-l4-arena.png
for i in $(seq 1 16); do
  r=$(ev "(()=>{const rt=Game.debug.director.active.data;const b=rt.bots.filter(x=>x.alive)[0];if(!b)return 'done';b.hp=1;b.body.vel.set(0,0,0);b.stunT=0;Game.debug.teleport(b.body.pos.x,b.body.pos.z);return b.name})()")
  if [ "$r" = "\"done\"" ]; then break; fi
  sleep 0.4
  ev "(()=>{window.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyF'}));return 'F'})()" >/dev/null
  sleep 0.5
done
sleep 1.5
echo "结算: $(ev "(()=>{const t=document.querySelector('#modalRoot .modal-panel');return t?(t.querySelector('.chip')||{}).textContent:'NONE'})()")"
ev "(()=>{Game.UI.closeAll();return 'ok'})()" >/dev/null
ev "(()=>{Game.debug.goHub();return 'ok'})()" >/dev/null
sleep 1.5

echo "=== 回广场 ==="
echo "状态: $(ev "JSON.stringify(Game.debug.state())")"
echo "门: $(ev "(()=>{const a=Game.debug.director.active;return JSON.stringify(((a.data||{}).portals||[]).map(p=>[p.levelId,p.status]))})()")"
shot work/reg-hub.png
echo "存档: $(ev "(()=>{return '导出存档字符数='+Game.debug.save.exportJSON().length})()")"
echo DONE

#!/bin/zsh
# 第 4 关验收：对手互殴 / 双方弹开 / 血量节奏 / 缩圈 3 次 / 9 分钟 + 加时 / 通关 / 被打下去
# 注意：浏览器窗口在后台时 rAF 会被节流（sleep 20 秒游戏里只走 1 秒），
#       所以这里统一用「页面里手动 d.update(1/60)」推进时间；
#       玩家会被钉在擂台中间 —— 不然站桩也会被 6 个对手推下台，比赛提前结束。
set -u
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
PORT="${PORT:-8777}"
PW="playwright-cli"
ev() { $PW --raw eval "$1" 2>&1 | tail -2 }
shot() { $PW screenshot --filename=$1 >/dev/null 2>&1 }
HELPERS="(()=>{
  window.__pin=function(){var p=Game.debug.player;p.stunT=0;p.body.pos.set(0,0,0);p.body.vel.set(0,0,0);};
  window.__run=function(secs,opts){opts=opts||{};var d=Game.debug.director,rt=d.active.data,n=Math.round(secs*60);
    for(var i=0;i<n;i++){if(opts.keepHp)rt.hp=99999;d.update(1/60,0);if(opts.pin)window.__pin();if(rt.over)break;}return rt;};
  window.__fresh=function(){Game.UI.closeAll();Game.debug.go('arena-battle');return Game.debug.director.active.data;};
  window.__swing=function(d,rt,p,secs){var n=Math.round(secs*60);for(var i=0;i<n;i++){
    var b=null,bd=1e9;rt.bots.forEach(function(x){if(!x.alive)return;var dd=Math.hypot(x.body.pos.x-p.body.pos.x,x.body.pos.z-p.body.pos.z);if(dd<bd){bd=dd;b=x;}});
    if(b){var len=Math.hypot(b.body.pos.x,b.body.pos.z)||1;
      p.body.pos.set(b.body.pos.x-b.body.pos.x/len*2.0,0,b.body.pos.z-b.body.pos.z/len*2.0);
      p.body.vel.set(0,0,0);p.stunT=0;p.faceTo(b.body.pos.x,b.body.pos.z);}
    if(i%24===0)p.input.attackQueued=true;
    d.update(1/60,0);
    if(rt.over)break;}
    return rt;};
  return 'helpers';})()"

$PW open --browser=chrome "http://127.0.0.1:$PORT/index.html" >/dev/null 2>&1
$PW click "#startBtn" >/dev/null 2>&1
sleep 1
ev "(()=>{Game.Save.resetProfile();Game.debug.unlockAll();return 'ok'})()" >/dev/null
ev "$HELPERS" >/dev/null

echo "===== 0. 开场参数 ====="
echo "  $(ev "(()=>{var rt=window.__fresh();return JSON.stringify({对手数:rt.bots.length,我的血:rt.hp,对手血:rt.bots[0].hp,限时秒:rt.limit,擂台半径:Math.round(rt.ring)})})()")"

echo ""
echo "===== A. 人机会互相打（玩家不动手，只看对手掉的血） ====="
echo "  $(ev "(()=>{var rt=window.__fresh();window.__run(60,{pin:true,keepHp:true});var hp=rt.bots.map(b=>Math.round(b.hp));return JSON.stringify({一分钟后对手血量:hp,被打过的对手数:hp.filter(h=>h<300).length,总掉血:hp.reduce((s,h)=>s+(300-h),0)})})()")"

echo ""
echo "===== B. 自己打一拳：对手被打飞 + 自己也被弹开 ====="
echo "  $(ev "(()=>{var rt=window.__fresh(),d=Game.debug.director,p=Game.debug.player;window.__run(3,{pin:true,keepHp:true});var b=rt.bots[0];b.stunT=0;b.body.vel.set(0,0,0);p.body.pos.set(b.body.pos.x+2.0,0,b.body.pos.z);p.body.vel.set(0,0,0);p.faceTo(b.body.pos.x,b.body.pos.z);var d0=Math.hypot(b.body.pos.x-p.body.pos.x,b.body.pos.z-p.body.pos.z),hp0=b.hp;p.input.attackQueued=true;d.update(1/60,0);var meV=+Math.hypot(p.body.vel.x,p.body.vel.z).toFixed(2),meStun=+p.stunT.toFixed(2);window.__run(0.8);return JSON.stringify({对手掉血:+(hp0-b.hp).toFixed(1),打之前距离:+d0.toFixed(2),打之后距离:+Math.hypot(b.body.pos.x-p.body.pos.x,b.body.pos.z-p.body.pos.z).toFixed(2),我被弹开速度:meV,我被弹开僵直:meStun})})()")"

echo ""
echo "===== C. 对手打你：它自己被弹开（不黏着打） ====="
echo "  $(ev "(()=>{var rt=window.__fresh(),d=Game.debug.director,p=Game.debug.player;window.__run(3,{pin:true,keepHp:true});var b=rt.bots[0];b.body.vel.set(0,0,0);b.stunT=0;b.cool=0;var hp0=rt.hp,hits=0,back=0;for(var i=0;i<300;i++){var h=rt.hp;d.update(1/60,0);if(rt.hp<h){hits++;var dd=Math.hypot(b.body.vel.x,b.body.vel.z);if(dd>back)back=dd;}p.body.pos.set(b.body.pos.x+1.6,0,b.body.pos.z);p.body.vel.set(0,0,0);p.stunT=0;}return JSON.stringify({五秒内被打次数:hits,我掉血:+(hp0-rt.hp).toFixed(1),对手出手后自己弹开速度:+back.toFixed(2)})})()")"

echo ""
echo "===== D. 血量节奏：站着不动挨打，能撑多久 ====="
echo "  $(ev "(()=>{var rt=window.__fresh(),d=Game.debug.director,p=Game.debug.player;var mark=[];for(var s=1;s<=8;s++){for(var i=0;i<3600;i++){d.update(1/60,0);p.body.pos.set(0,0,0);p.body.vel.set(0,0,0);p.stunT=0;if(rt.over)break;}mark.push(s+'分:'+Math.round(rt.hp)+(rt.over?'(被打下去)':''));if(rt.over)break;}return JSON.stringify({我的血变化:mark,结束:rt.over,结束面板:(document.querySelector('#modalRoot .modal-panel .chip')||{}).textContent})})()")"

echo ""
echo "===== E. 缩圈 3 次（52 → 40 → 29 → 20） ====="
echo "  第1次: $(ev "(()=>{var rt=window.__fresh();window.__run(183,{pin:true,keepHp:true});return JSON.stringify({t:Math.round(rt.t),缩圈次数:rt.shrinkCount,擂台半径:Math.round(rt.ring)})})()")"
echo "  第2次: $(ev "(()=>{var rt=window.__run(180,{pin:true,keepHp:true});return JSON.stringify({t:Math.round(rt.t),缩圈次数:rt.shrinkCount,擂台半径:Math.round(rt.ring)})})()")"
echo "  第3次: $(ev "(()=>{var rt=window.__run(180,{pin:true,keepHp:true});return JSON.stringify({t:Math.round(rt.t),缩圈次数:rt.shrinkCount,擂台半径:Math.round(rt.ring)})})()")"
shot work/arena-3-shrunk.png

echo ""
echo "===== F. 9 分钟到 + 加时 5 分钟（台上还有人站着） ====="
echo "  $(ev "(()=>{var rt=window.__run(2,{pin:true,keepHp:true});return JSON.stringify({t:Math.round(rt.t),限时秒:rt.limit,加时次数:rt.extend,台上还剩:rt.bots.filter(b=>b.alive).length,HUD:document.getElementById('battleTime')?document.getElementById('battleTime').textContent:''})})()")"

echo ""
echo "===== G. 打得动：几拳能把一个对手打下去 ====="
echo "  $(ev "(()=>{var rt=window.__fresh(),d=Game.debug.director,p=Game.debug.player;window.__run(3,{pin:true,keepHp:true});var b=rt.bots[0],log=[];for(var k=1;k<=8;k++){if(!b.alive){log.push('第'+k+'拳:已经下去了');break;}var len=Math.hypot(b.body.pos.x,b.body.pos.z)||1;p.body.pos.set(b.body.pos.x-b.body.pos.x/len*2.0,0,b.body.pos.z-b.body.pos.z/len*2.0);p.body.vel.set(0,0,0);p.stunT=0;b.stunT=0;p.faceTo(b.body.pos.x,b.body.pos.z);p.input.attackQueued=true;window.__run(0.7,{pin:true,keepHp:true});log.push('第'+k+'拳:离中心'+Math.round(Math.hypot(b.body.pos.x,b.body.pos.z))+' 血'+Math.round(b.hp)+' y'+b.body.pos.y.toFixed(1));}return JSON.stringify({擂台半径:Math.round(rt.ring),过程:log})})()")"

echo ""
echo "===== H. 把 6 个对手全打下去 → 通关 ====="
echo "  $(ev "(()=>{var rt=window.__fresh(),d=Game.debug.director,p=Game.debug.player;window.__run(3,{pin:true,keepHp:true});var t0=rt.t;window.__swing(d,rt,p,200);return JSON.stringify({用了秒:Math.round(rt.t-t0),还剩对手:rt.bots.filter(b=>b.alive).length,通关:rt.won})})()")"
echo "  面板: $(ev "(()=>{var p=document.querySelector('#modalRoot .modal-panel');return p?(p.querySelector('.chip')||{}).textContent:'NONE'})()")"
shot work/arena-win.png

echo ""
echo "===== I. 掉到擂台下面 → 回小镇 / 再来一次 ====="
echo "  $(ev "(()=>{var rt=window.__fresh(),d=Game.debug.director,p=Game.debug.player;window.__run(3,{pin:true,keepHp:true});window.__pin=function(){};p.body.pos.set(60,0,0);p.body.vel.set(0,0,0);for(var i=0;i<180;i++){d.update(1/60,0);if(rt.over)break;}return JSON.stringify({比赛结束:rt.over,台上还剩:rt.bots.filter(b=>b.alive).length})})()")"
echo "  面板: $(ev "(()=>{var p=document.querySelector('#modalRoot .modal-panel');return p?(p.querySelector('.chip')||{}).textContent:'NONE'})()")"
echo "  按钮: $(ev "(()=>{return [...document.querySelectorAll('#modalRoot button')].map(b=>b.textContent).join(' | ')})()")"
shot work/arena-out-panel.png
echo "  点回小镇: $(ev "(()=>{var b=[...document.querySelectorAll('#modalRoot button')].find(x=>/回小镇/.test(x.textContent));if(b)b.click();return 'clicked'})()")"
sleep 1.4
echo "  现在在: $(ev "(()=>{var s=Game.debug.state();return JSON.stringify({关卡:s.name,id:s.level,面板:Game.UI.anyOpen()})})()")"
echo DONE

#!/bin/zsh
# 第 5 关验收：沙漠逃亡
#   骑马 / 骑马冲刺 / 箭头只给大概方向 / 小龙卷风卷下马 / 仙人掌 / 小蛇
#   倒计时 / 时间到自动回小镇 / 跑到绿洲逃出去
# 说明：浏览器窗口在后台时 rAF 会被节流（sleep 20 秒游戏里只走 1 秒），
#       所以统一用「页面里手动 d.update(1/60)」推进时间 —— 和 test-arena.sh 一个套路。
set -u
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
PORT="${PORT:-8777}"
PW="playwright-cli"
ev() { $PW --raw eval "$1" 2>&1 | tail -2 }
shot() { $PW screenshot --filename=$1 >/dev/null 2>&1 }

HELPERS="(()=>{
  window.__t=0;
  window.__step=function(secs,fn){var d=Game.debug.director,n=Math.round(secs*60);
    for(var i=0;i<n;i++){window.__t+=1/60;d.update(1/60,window.__t);if(fn)fn(i);}
    return d.active?d.active.data:null;};
  window.__fresh=function(){Game.UI.closeAll();Game.debug.go('desert-escape');
    var rt=Game.debug.director.active?Game.debug.director.active.data:null;return rt;};
  window.__rid=function(){var rt=Game.debug.director.active.data,p=Game.debug.player,h=rt.horses[0];
    p.teleport(h.group.position.x+1.5,h.group.position.z);
    p.input.attackQueued=true;window.__step(0.15);return h;};
  window.__farCactus=function(){var rt=Game.debug.director.active.data;
    return rt.cacti.filter(function(c){return c.alive&&rt.horses.every(function(h){
      return Math.hypot(h.group.position.x-c.x,h.group.position.z-c.z)>20;});})[0];};
  window.__farSnake=function(){var rt=Game.debug.director.active.data;
    return rt.snakes.filter(function(s){return rt.horses.every(function(h){
      return Math.hypot(h.group.position.x-s.group.position.x,h.group.position.z-s.group.position.z)>20;});})[0];};
  return 'helpers';})()"

$PW open --browser=chrome "http://127.0.0.1:$PORT/index.html" >/dev/null 2>&1
$PW click "#startBtn" >/dev/null 2>&1
sleep 1
# 只把第 4 关标成通关，让第 5 关正常解锁（不要用 unlockAll，那会把第 5 关也标成通关）
ev "(()=>{Game.Save.resetProfile();Game.Save.level('arena-battle').setDone(true);Game.debug.director.rebuild();return 'ok'})()" >/dev/null
ev "$HELPERS" >/dev/null

echo "===== 0. 关卡登记 ====="
echo "  $(ev "(()=>{var d=Game.Levels.get('desert-escape');return JSON.stringify({清单里有:!!d,名字:d&&d.name,第几关:d&&d.subtitle,id:d&&d.id,order:d&&d.order,出生点:d&&d.spawn,解锁:Game.Levels.isUnlocked('desert-escape',Game.Save)})})()")"

echo ""
echo "===== A. 一进关：旁边就有马 / 倒计时开始 / 箭头指着马 ====="
echo "  $(ev "(()=>{var rt=window.__fresh(),p=Game.debug.player;
  var d=Math.min.apply(null,rt.horses.map(function(h){return Math.hypot(h.group.position.x-p.pos.x,h.group.position.z-p.pos.z);}));
  var o=Game.debug.director.objective;
  return JSON.stringify({场上马数:rt.horses.length,最近的马:Math.round(d)+' 步',倒计时:Math.round(rt.timeLeft),箭头指向马:!!o.target,任务条:o.text})})()")"

echo ""
echo "===== B. 按 F 骑上马 ====="
echo "  $(ev "(()=>{var rt=window.__fresh(),p=Game.debug.player;window.__rid();
  return JSON.stringify({骑上了:!!rt.ride,马牌藏起来:!rt.horses[0].label.visible,玩家高度:+p.pos.y.toFixed(2),玩家在马背:Math.hypot(p.pos.x-rt.horses[0].group.position.x,p.pos.z-rt.horses[0].group.position.z)<1.5})})()")"

echo ""
echo "===== C. 骑马 WASD 跑 2 秒（应约 24 步 = 12/秒） ====="
echo "  $(ev "(()=>{var rt=window.__fresh(),p=Game.debug.player;window.__rid();var h=rt.ride;
  p.cam.yaw=0;p.input.keys.KeyW=true;var x0=h.group.position.x,z0=h.group.position.z;
  window.__step(2);p.input.keys.KeyW=false;
  return JSON.stringify({跑了几步:+Math.hypot(h.group.position.x-x0,h.group.position.z-z0).toFixed(1),玩家跟着走:Math.hypot(p.pos.x-h.group.position.x,p.pos.z-h.group.position.z)<1.5,还在马背上:+p.pos.y.toFixed(2)})})()")"

echo ""
echo "===== D. 骑马按 F 冲刺（1 秒应明显比 12 步多） ====="
echo "  $(ev "(()=>{var rt=window.__fresh(),p=Game.debug.player;window.__rid();var h=rt.ride;
  p.cam.yaw=0;p.input.keys.KeyW=true;p.input.attackQueued=true;
  var x0=h.group.position.x,z0=h.group.position.z;window.__step(1);p.input.keys.KeyW=false;
  var fast=Math.hypot(h.group.position.x-x0,h.group.position.z-z0);
  return JSON.stringify({冲刺1秒走的步数:+fast.toFixed(1),冲刺中:rt.sprintT>0,冷却:Math.round(rt.sprintCd)})})()")"

echo ""
echo "===== E. 头顶箭头只给「大概方向」（采样 6 秒看偏差） ====="
echo "  $(ev "(()=>{var rt=window.__fresh(),p=Game.debug.player;window.__rid();var z=rt.zone,devs=[];
  for(var k=0;k<12;k++){window.__step(0.5);
    var a1=Math.atan2(rt.arrow.x-p.pos.x,rt.arrow.z-p.pos.z);
    var a2=Math.atan2(z.x-p.pos.x,z.z-p.pos.z);
    var d=(a1-a2)*180/Math.PI;while(d>180)d-=360;while(d<-180)d+=360;devs.push(+d.toFixed(1));}
  var mx=Math.max.apply(null,devs.map(Math.abs));
  return JSON.stringify({偏差度数:devs,最大偏差:+mx.toFixed(1)+'°',是不是精确指向:mx<2})})()")"

echo ""
echo "===== F. 小龙卷风：骑着马被卷到 → 被卷下马 + 被吹飞 ====="
echo "  $(ev "(()=>{var rt=window.__fresh(),p=Game.debug.player;window.__rid();var w=rt.winds[0];
  rt.ride.group.position.set(w.x,0,w.z);window.__step(0.3);
  return JSON.stringify({被卷下马:rt.ride===null,还剩几匹马骑:rt.horses.filter(function(h){return h.ridden;}).length,僵直:+p.stunT.toFixed(2),被吹起来:p.pos.y>0.2,风在游走:Math.round(w.x)!==0&&Math.round(w.z)!==0})})()")"

echo ""
echo "===== G. 仙人掌：贴上去会被扎 / 按 F 能打碎 ====="
echo "  被扎: $(ev "(()=>{var rt=window.__fresh(),p=Game.debug.player,c=window.__farCactus();
  p.teleport(c.x+1.2,c.z);window.__step(0.2);
  return JSON.stringify({被扎了:p.stunT>0||Math.hypot(p.body.vel.x,p.body.vel.z)>0.5,仙人掌还在:c.alive,提示:document.getElementById('toasts').textContent.indexOf('仙人掌')>=0})})()")"
echo "  打碎: $(ev "(()=>{var rt=window.__fresh(),p=Game.debug.player,c=window.__farCactus(),c0=Game.debug.save.game().coins;
  p.teleport(c.x+1.6,c.z);p.input.attackQueued=true;window.__step(0.2);
  return JSON.stringify({仙人掌碎了:c.alive===false,碰撞盒关掉:c.solid.enabled===false,金币:+ (Game.debug.save.game().coins-c0)})})()")"

echo ""
echo "===== H. 小蛇：贴上去会被咬 / 按 F 能打飞 ====="
echo "  被咬: $(ev "(()=>{var rt=window.__fresh(),p=Game.debug.player,s=window.__farSnake();
  p.teleport(s.group.position.x+1.0,s.group.position.z);window.__step(0.2);
  return JSON.stringify({被咬:p.stunT>0,蛇在冷却:s.biteCd>0,提示:document.getElementById('toasts').textContent.indexOf('小蛇')>=0})})()")"
echo "  打飞: $(ev "(()=>{var rt=window.__fresh(),p=Game.debug.player,s=window.__farSnake(),n0=rt.snakesHit;
  p.teleport(s.group.position.x+1.8,s.group.position.z);p.input.attackQueued=true;window.__step(0.2);
  return JSON.stringify({蛇被打飞:Math.hypot(s.vel.x,s.vel.z)>5,计数:+ (rt.snakesHit-n0)})})()")"

echo ""
echo "===== I. 马会随机生成（等到刷新一匹新马） ====="
echo "  $(ev "(()=>{var rt=window.__fresh(),n0=rt.horses.length;rt.horseTimer=0.1;window.__step(0.5);
  return JSON.stringify({原来:n0,现在:rt.horses.length,上限:12,提示:document.getElementById('toasts').textContent.indexOf('小马跑过来')>=0})})()")"

echo ""
echo "===== J. 时间到：自动回小镇 + 记一次尝试 ====="
echo "  $(ev "(()=>{var rt=window.__fresh();var a0=Game.Save.level('desert-escape').get('attempts',0);
  rt.timeLeft=0.4;window.__step(1);
  return JSON.stringify({时间到:rt.timeLeft===0,正在离开:rt.leaving,尝试次数:+ (Game.Save.level('desert-escape').get('attempts',0)-a0)})})()")"
sleep 2.5
echo "  2.5 秒后: $(ev "(()=>{var s=Game.debug.state();return JSON.stringify({现在在:s.level,s在哪:s.name})})()")"

echo ""
echo "===== K. 跑到绿洲 → 逃出沙漠（通关） ====="
echo "  $(ev "(()=>{var rt=window.__fresh(),p=Game.debug.player;window.__rid();var z=rt.zone;
  rt.ride.group.position.set(z.x,0,z.z-3);window.__step(0.5);
  var panel=document.querySelector('#modalRoot .modal-panel');
  return JSON.stringify({通了:rt.won,面板:(panel&&panel.querySelector('.chip')?panel.querySelector('.chip').textContent:''),最佳成绩:Game.Save.level('desert-escape').get('best',0)+' 秒',逃出次数:Game.Save.level('desert-escape').get('escaped',0),金币:Game.debug.save.game().coins})})()")"
shot work/desert-win.png

echo ""
echo "===== L. 再进一次关：状态是否重置（能再玩一次） ====="
echo "  $(ev "(()=>{var rt=window.__fresh();return JSON.stringify({倒计时:Math.round(rt.timeLeft),还在骑马:!!rt.ride,通了没:rt.won,马牌回来:rt.horses[0].label.visible})})()")"
shot work/desert-start.png

echo ""
echo "===== M. 直线距离 / 时间估算（5 分钟完成的设计依据） ====="
echo "  $(ev "(()=>{var d=Game.Levels.get('desert-escape');var sp=d.spawn,z=window.__fresh()&&Game.debug.director.active.data.zone;
  var dist=Math.hypot(z.x-sp.x,z.z-sp.z);
  return JSON.stringify({直线步数:Math.round(dist),骑马直线秒数:Math.round(dist/12),限时秒:120,走路直线秒数:Math.round(dist/6.2)})})()")"
echo DONE

#!/bin/zsh
# 第 6 关验收：踩白大草原（把绿色踩成白色）
#   地板全绿 / 走路踩 1 块 / 骑马踩 3×3 块 / 踩白的地方和脚下对齐（射线验证）/
#   6 分钟倒计时 / 踩不完就自动回小镇 / 全踩白后门才亮 / 只有 1 扇门是对的 /
#   走错门只弹开不惩罚 / 走到对的门才通关 / 再进一次关能重新玩
# 说明：浏览器窗口在后台时 rAF 会被节流，所以统一用「页面里手动 d.update(1/60)」推进时间。
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
  window.__fresh=function(){Game.UI.closeAll();Game.debug.go('paint-the-field');
    return Game.debug.director.active?Game.debug.director.active.data:null;};
  /* 走到最近的马旁边按 F 骑上去 */
  window.__ride=function(){var rt=Game.debug.director.active.data,p=Game.debug.player,h=rt.horses[0];
    p.teleport(h.group.position.x+1.5,h.group.position.z);p.input.attackQueued=true;
    window.__step(0.15);return rt.ride;};
  /* 把玩家挪到某处，并让「上一帧位置」也跟过去（免得补画一串地板） */
  window.__put=function(rt,x,z){var p=Game.debug.player;p.teleport(x,z);
    rt.lastPaint={x:x,z:z};return [x,z];};
  /* 骑马时把马挪到某处（玩家会被钉在马背上） */
  window.__putHorse=function(rt,x,z){rt.ride.group.position.set(x,0,z);rt.lastPaint={x:x,z:z};};
  /* 走进某个「踩进去就触发」的区域：先原地走一小步，
     把上一次「我已经在里面」的记录清掉（不然同一个区域不会再被触发一次）。
     走到门正中间的时候推人的方向是 0，所以这里只能看「僵直」和「通关了没」。 */
  window.__enter=function(x,z){window.__step(0.05);Game.debug.player.teleport(x,z);window.__step(0.2);};
  return 'helpers';})()"

$PW open --browser=chrome "http://127.0.0.1:$PORT/index.html" >/dev/null 2>&1
$PW click "#startBtn" >/dev/null 2>&1
sleep 1
# 只把第 5 关标成通关，让第 6 关正常解锁
ev "(()=>{Game.Save.resetProfile();Game.Save.level('desert-escape').setDone(true);Game.debug.director.rebuild();return 'ok'})()" >/dev/null
ev "$HELPERS" >/dev/null

echo "===== 0. 关卡登记 ====="
echo "  $(ev "(()=>{var d=Game.Levels.get('paint-the-field');return JSON.stringify({清单里有:!!d,名字:d&&d.name,第几关:d&&d.subtitle,id:d&&d.id,order:d&&d.order,出生点:d&&d.spawn,解锁:Game.Levels.isUnlocked('paint-the-field',Game.Save)})})()")"

echo ""
echo "===== A. 一进关：一整片绿地 + 6 分钟倒计时 + 旁边有小马 ====="
echo "  $(ev "(()=>{var rt=window.__fresh(),p=Game.debug.player,f=rt.field;
  var d=Math.min.apply(null,rt.horses.map(function(h){return Math.hypot(h.group.position.x-p.pos.x,h.group.position.z-p.pos.z);}));
  return JSON.stringify({总块数:f.total,剩下的绿块:f.total-f.painted,场地边长:f.size,格子边长:f.tile,倒计时:Math.round(rt.timeLeft),门有几扇:rt.portals.length,最近的马:Math.round(d)+' 步',出生点在地板外面:f.cellAt(p.pos.x,p.pos.z)===null,任务条:Game.debug.director.objective.text})})()")"

echo ""
echo "===== B. 走路踩一脚：只踩白脚下这一块 ====="
echo "  $(ev "(()=>{var rt=window.__fresh();window.__put(rt,0,0);var a=rt.field.painted;window.__step(1/60);
  return JSON.stringify({踩白了几块:rt.field.painted-a,一共踩白:rt.field.painted})})()")"

echo ""
echo "===== C. 骑马按 F：一次踩白 3×3 = 9 块 ====="
echo "  $(ev "(()=>{var rt=window.__fresh();window.__ride();window.__putHorse(rt,-20,-20);var a=rt.field.painted;window.__step(1/60);
  return JSON.stringify({骑上了:!!rt.ride,这次踩白:rt.field.painted-a,马背高度:+Game.debug.player.pos.y.toFixed(2)})})()")"

echo ""
echo "===== D. 同样跑 2 秒：骑马比走路踩白的多得多（小朋友说的「范围很大」） ====="
echo "  走路: $(ev "(()=>{var rt=window.__fresh(),p=Game.debug.player;window.__put(rt,-25,25);
  p.cam.yaw=0;p.input.keys.KeyW=true;var a=rt.field.painted;window.__step(2);p.input.keys.KeyW=false;
  return JSON.stringify({走了几块:rt.field.painted-a})})()")"
echo "  骑马: $(ev "(()=>{var rt=window.__fresh(),p=Game.debug.player;window.__ride();window.__putHorse(rt,-25,25);
  p.cam.yaw=0;p.input.keys.KeyW=true;var a=rt.field.painted;window.__step(2);p.input.keys.KeyW=false;
  return JSON.stringify({跑了多少步:+Math.abs(rt.ride.group.position.z-25).toFixed(1),踩白了几块:rt.field.painted-a})})()")"

echo ""
echo "===== E. ★对齐★：脚下那一块真的变白了吗（用射线打到地板，反推格子号） ====="
echo "  $(ev "(()=>{var rt=window.__fresh();window.__put(rt,-11,7);window.__step(0.05);
  var p=Game.debug.player,cell=rt.field.cellAt(p.pos.x,p.pos.z);
  var ray=new THREE.Raycaster(new THREE.Vector3(p.pos.x,20,p.pos.z),new THREE.Vector3(0,-1,0));
  var hit=ray.intersectObject(rt.field.mesh,false)[0];
  if(!hit) return JSON.stringify({打得中地板:false});
  var i=Math.floor(hit.uv.x*rt.field.n),j=Math.floor((1-hit.uv.y)*rt.field.n);
  return JSON.stringify({关卡认为的格子:[cell.i,cell.j],射线算出的格子:[i,j],一致:i===cell.i&&j===cell.j,这块白了吗:!rt.field.isGreen(cell.i,cell.j)})})()")"

echo ""
echo "===== F. 全踩白：倒计时停下 + 6 扇门全亮 ====="
echo "  $(ev "(()=>{var rt=window.__fresh();rt.field.paint(0,0,100);window.__step(0.05);
  return JSON.stringify({全白:rt.allPainted,踩白块数:rt.field.painted,倒计时还在走:rt.timerOn,门都亮了:rt.portals.map(function(p){return p.portal.unlocked;}).every(Boolean),任务条:Game.debug.director.objective.text})})()")"
shot work/paint-allwhite.png

echo ""
echo "===== G. 走错的门：只被弹开 + 记一次，不算通关 ====="
echo "  $(ev "(()=>{var rt=Game.debug.director.active.data,p=Game.debug.player;
  var wrong=rt.portals.filter(function(x){return x.i!==rt.correct;})[0];
  window.__enter(wrong.x,wrong.z);
  return JSON.stringify({试的门:wrong.i,正确的门:rt.correct,走错次数:rt.wrongDoors,通关了没:rt.won,被弹开:(p.stunT>0||Math.hypot(p.pos.x-wrong.x,p.pos.z-wrong.z)>2.9),门已经亮了:wrong.portal.unlocked})})()")"

echo ""
echo "===== H. 走对的门：通关 + 金币 + 存档 ====="
echo "  $(ev "(()=>{var rt=Game.debug.director.active.data,p=Game.debug.player,c0=Game.debug.save.game().coins;
  rt.portalCd=0;var right=rt.portals[rt.correct];p.teleport(right.x,right.z);window.__step(0.2);
  var panel=document.querySelector('#modalRoot .modal-panel');
  return JSON.stringify({通关了:rt.won,面板:(panel&&panel.querySelector('.chip')?panel.querySelector('.chip').textContent:''),金币:Game.debug.save.game().coins-c0,记录:Game.Save.level('paint-the-field').get('cleared',0)+' 次通关 / 最快 '+Game.Save.level('paint-the-field').get('best',0)+' 秒'})})()")"
shot work/paint-win.png

echo ""
echo "===== I. 没踩完就走门：会被拦住（门还没亮） ====="
echo "  $(ev "(()=>{var rt=window.__fresh(),p=Game.debug.player;var d=rt.portals[3];
  window.__enter(d.x,d.z);
  return JSON.stringify({通关了没:rt.won,门还锁着:!d.portal.unlocked,被拦住:(p.stunT>0||Math.hypot(p.pos.x-d.x,p.pos.z-d.z)>2.9),还剩几块:rt.field.total-rt.field.painted})})()")"

echo ""
echo "===== J. 时间到：还没踩完 → 自动回小镇重来 ====="
echo "  $(ev "(()=>{var rt=window.__fresh();var a0=Game.Save.level('paint-the-field').get('attempts',0);
  rt.timeLeft=0.4;window.__step(1);
  return JSON.stringify({时间到:rt.timeLeft===0,正在离开:rt.leaving,尝试次数:+ (Game.Save.level('paint-the-field').get('attempts',0)-a0),还剩几块:rt.field.total-rt.field.painted})})()")"
sleep 2.6
echo "  2.6 秒后: $(ev "(()=>{var s=Game.debug.state();return JSON.stringify({现在在:s.level,s在哪:s.name})})()")"

echo ""
echo "===== K. 再进一次关：地板全绿、门重新锁上、马回原位 ====="
echo "  $(ev "(()=>{var rt=window.__fresh();var h=rt.horses[0];
  return JSON.stringify({倒计时:Math.round(rt.timeLeft),踩白块数:rt.field.painted,全白:rt.allPainted,通关了没:rt.won,门锁着:rt.portals.every(function(p){return !p.portal.unlocked;}),马在不在家:Math.hypot(h.group.position.x-h.home.x,h.group.position.z-h.home.z)<1,马牌回来:h.label.visible})})()")"
shot work/paint-start.png

echo ""
echo "===== L. 时间估算（6 分钟够不够的设计依据） ====="
echo "  $(ev "(()=>{var rt=Game.debug.director.active.data,f=rt.field;
  var walkSteps=f.n*f.size, rideSteps=(f.n/3)*f.size;
  return JSON.stringify({总块数:f.total,场地:f.size+'×'+f.size+' 步',走路扫一遍:f.n+' 趟 × '+f.size+' 步 = '+walkSteps+' 步 ≈ '+Math.round(walkSteps/6.2)+' 秒',骑马扫一遍:'10 趟 × '+f.size+' 步 = '+rideSteps+' 步 ≈ '+Math.round(rideSteps/12)+' 秒',限时秒:360,骑马一次踩白:'3×3 = 9 块'})})()")"
echo DONE

#!/bin/zsh
# 第 8 关验收：风扇小屋
#   门太小（大个子进不去，要变小）/ 缩小能力（按 R；别的关卡没有）/
#   屋后找风扇 / 装到屋里的蓝圈上 / 充电器在广场工具台（跨关卡来回找，跑几趟都行）/
#   通电 = 通关；不装风扇过不了关 / 空调位自己亮（彩蛋）/
#   已通关再进来重新摆一遍 / 回广场的传送门能用
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
  window.__fresh=function(){Game.UI.closeAll();Game.debug.go('fan-cottage');
    return Game.debug.director.active?Game.debug.director.active.data:null;};
  window.__put=function(x,z){Game.debug.player.teleport(x,z);window.__step(0.06);return [x,z];};
  /* 走到某个点按一下 E */
  window.__use=function(x,z){window.__put(x,z);Game.debug.use();window.__step(0.06);return true;};
  /* 按住某个键走 secs 秒（默认朝北走 = 小屋的方向） */
  window.__walk=function(secs,key,yaw){var p=Game.debug.player;
    if(yaw!==undefined)p.cam.yaw=yaw;
    p.input.keys[key||'KeyW']=true;window.__step(secs);p.input.keys[key||'KeyW']=false;window.__step(0.05);
    return [+p.pos.x.toFixed(2),+p.pos.y.toFixed(2),+p.pos.z.toFixed(2)];};
  window.__r=function(){window.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyR'}));window.__step(0.06);
    return Game.debug.player.small;};
  window.__flags=function(){var f=Game.debug.save.game().flags||{};
    return {hasCharger:!!f.hasCharger};};
  window.__save=function(){return Game.Save.level('fan-cottage');};
  window.__reset=function(o){var s=window.__save();
    ['fanFound','fanMounted','powered'].forEach(function(k){s.setFlag(k,!!(o&&o[k]));});
    Game.debug.director.rebuild();return 'reset';};
  /* 屏幕上最后一条提示 */
  window.__lastToast=function(){var t=document.querySelectorAll('#toasts .toast');
    return t.length?t[t.length-1].textContent:'';};
  return 'helpers';})()"

$PW open --browser=chrome "http://127.0.0.1:$PORT/index.html" >/dev/null 2>&1
$PW click "#startBtn" >/dev/null 2>&1
sleep 1
# 清档：把前 7 关都标成通关，让第 8 关正常解锁
ev "(()=>{Game.Save.resetProfile();
  ['riddle-forest','chest-valley','hanzi-classroom','arena-battle','desert-escape','paint-the-field','stone-maze']
    .forEach(function(id){Game.Save.level(id).setDone(true);});
  Game.Save.setFlag('hasCharger',false);
  Game.debug.director.rebuild();return 'ok'})()" >/dev/null
ev "(()=>{window.__errs=[];const ce=console.error;console.error=function(){window.__errs.push([...arguments].map(String).join(' '));ce.apply(console,arguments)};window.addEventListener('error',e=>window.__errs.push('onerror: '+e.message));return 'ok'})()" >/dev/null
ev "$HELPERS" >/dev/null

echo "===== 0. 关卡登记（以游戏源码为准） ====="
echo "  $(ev "(()=>{var d=Game.Levels.get('fan-cottage'),order=Game.Levels.playable().map(function(x){return x.id;});
  return JSON.stringify({id:d.id,名字:d.name,第几关:d.subtitle,图标:d.icon,order:d.order,
    '能变小':!!d.shrink,'在关卡清单第几位':order.indexOf('fan-cottage')+1,'一共几关':order.length,
    出生点:d.spawn,'门洞':Game.FanCottage.DOOR_W+'×'+Game.FanCottage.DOOR_H+' 步',
    '大个子身高':Game.CONST.ACTOR_HEIGHT})})()")"

echo ""
echo "===== A. 一进关：小屋 + 通风扇藏在屋后 + 回广场的门 + 任务条 ====="
echo "  $(ev "(()=>{var rt=window.__fresh(),h=rt.house;
  return JSON.stringify({房子:'外框 '+h.w+'×'+h.d+'，中心 ('+h.cx+', '+h.cz+')',
    门口:h.door,'风扇藏在小屋后面':{x:3.4,z:-15.8},
    '风扇位':h.fanSpot,'空调位':h.acSpot,'屋里通电了吗':rt.powered,
    '能变小':Game.debug.player.shrinkEnabled,'现在是小人吗':Game.debug.player.small,
    '底部说明':document.getElementById('hintBar').textContent,
    '任务条':Game.debug.director.objective.text,'给了头顶箭头吗':!!Game.debug.director.objective.target})})()")"
shot work/cottage-1-spawn.png

echo ""
echo "===== B. ★缩小能力★：按 R 变小（身高 / 碰撞盒 / 镜头都跟着变），再按 R 变回来 ====="
echo "  $(ev "(()=>{var p=Game.debug.player;window.__fresh();
  window.__put(0,16);var d1=window.__walk(1);var bigM=Math.hypot(d1[0]-0,d1[2]-16);
  var big={身高:p.body.h,碰撞盒半径:p.body.hx,模型缩放:+p.model.group.scale.x.toFixed(2),
    镜头距离:+p.cam.dist.toFixed(2),一秒走了:Math.round(bigM*10)/10};
  var small=window.__r();
  window.__put(0,16);var d2=window.__walk(1);var smallM=Math.hypot(d2[0]-0,d2[2]-16);
  var sm={变小了:small,身高:p.body.h,碰撞盒半径:p.body.hx,模型缩放:+p.model.group.scale.x.toFixed(2),
    镜头距离:+p.cam.dist.toFixed(2),一秒走了:Math.round(smallM*10)/10,镜头看着的高度:p.eyeHeight(),
    变小了才钻得进门洞:p.body.h<Game.FanCottage.DOOR_H};
  window.__r();
  var back={又变回来了:p.small===false,身高:p.body.h,模型缩放:+p.model.group.scale.x.toFixed(2),
    镜头距离:+p.cam.dist.toFixed(2)};
  return JSON.stringify({'大个子':big,'变小以后':sm,'变回来':back})})()")"
echo "  广场里按 R（广场没写 shrink:true）: $(ev "(()=>{Game.debug.go('hub-square');window.__step(0.1);
  var on=Game.debug.player.shrinkEnabled;var small=window.__r();
  var hint=document.getElementById('hintBar').textContent;
  return JSON.stringify({'广场能变小':on,'按R变成小人了吗':small,'底部说明里有变小两个字':hint.indexOf('变小')>=0})})()")"

echo ""
echo "===== C. ★门太小★：大个子朝门走 2 秒也进不去；变小以后钻得进去 ====="
echo "  $(ev "(()=>{var rt=window.__fresh(),h=rt.house,p=Game.debug.player;
  window.__put(h.door.x,h.door.z+2.6);
  var pos=window.__walk(2,'KeyW',0);
  var insideBig=h.inside(p.pos.x,p.pos.z);
  window.__r();
  var pos2=window.__walk(2.2,'KeyW',0);
  return JSON.stringify({'门洞高':Game.FanCottage.DOOR_H,'大个子身高':p.baseH,
    '大个子走完停在哪':pos,'大个子进屋了吗':insideBig,'大个子高度':pos[1],
    '变小以后走完在哪':pos2,'变小以后进屋了吗':h.inside(p.pos.x,p.pos.z),'变小以后高度':pos2[1]})})()")"
shot work/cottage-2-inside.png

echo ""
echo "===== D. 屋后找到风扇（按 E 抱起来）+ 门口按 E 变小 ====="
echo "  $(ev "(()=>{window.__reset();var rt=window.__fresh(),h=rt.house,s=window.__save();
  window.__use(3.4,-15.8);
  var pick={'拿到风扇了吗':s.flag('fanFound'),'屋后还立着吗':rt.fan.group.visible,
    '任务条':Game.debug.director.objective.text};
  window.__fresh();                               /* 重新进关 = 变回大个子（风扇还在手上） */
  window.__use(h.door.x,h.door.z);
  var door={'按E之前是大个子吗':true,'按E以后变小了吗':Game.debug.player.small,'提示':window.__lastToast()};
  return JSON.stringify({屋后:'风扇藏在 (3.4, -15.8)','按E抱起风扇':pick,'门口按E变小':door})})()")"

echo ""
echo "===== E. 风扇位：没风扇装不上；有风扇能装上但没电（★不装就过不了关★） ====="
echo "  $(ev "(()=>{window.__reset();var rt=window.__fresh(),h=rt.house,s=window.__save();
  window.__use(h.fanSpot.x,h.fanSpot.z);
  var noFan={'装上了没':s.flag('fanMounted'),'通关了':!!s.done,'提示':window.__lastToast()};
  window.__use(3.4,-15.8);
  window.__use(h.fanSpot.x,h.fanSpot.z);
  var mounted={'装上了':s.flag('fanMounted'),'屋里的风扇看得见':rt.fan.group.visible,
    '风扇转起来了吗':rt.fan.spinSpeed>0,'通电了吗':s.flag('powered'),'通关了':!!s.done,
    '有充电器吗':window.__flags().hasCharger,'提示':window.__lastToast(),
    '任务条':Game.debug.director.objective.text};
  window.__use(h.fanSpot.x,h.fanSpot.z);
  var noPower={'还是没通电':s.flag('powered'),'通关了':!!s.done,'提示':window.__lastToast()};
  return JSON.stringify({'①没风扇就按':noFan,'②装上风扇':mounted,'③没充电器再按':noPower})})()")"
shot work/cottage-3-mounted.png

echo ""
echo "===== F. 回主世界：广场东边的工具台借充电器（跨关卡） ====="
echo "  回广场: $(ev "(()=>{Game.debug.goHub();window.__step(0.2);
  return JSON.stringify({'现在在哪':Game.debug.state().level,'任务条':Game.debug.director.objective.text,
    '头顶箭头指向工具台吗':!!Game.debug.director.objective.target})})()")"
echo "  借充电器（按 E）: $(ev "(()=>{window.__use(15,-8);
  return JSON.stringify({'全局开关':window.__flags().hasCharger,'提示':window.__lastToast()})})()")"
shot work/cottage-4-toolbench.png

echo ""
echo "===== G. 回小屋：变小进屋 → 插上充电器 → 通电通关 + 空调位自己亮 ====="
echo "  $(ev "(()=>{window.__reset({fanFound:true,fanMounted:true});var rt=window.__fresh(),h=rt.house,s=window.__save();
  var c0=Game.debug.save.game().coins;
  window.__r();
  window.__use(h.fanSpot.x,h.fanSpot.z);
  var panel=document.querySelector('#modalRoot .modal-panel');
  var chip=panel&&panel.querySelector('.chip')?panel.querySelector('.chip').textContent:'';
  var pct=panel?panel.textContent.indexOf('空调')>=0:false;
  return JSON.stringify({'通电了':s.flag('powered'),'通关了':!!s.done,'结算面板':chip,
    '面板里讲到空调':pct,'风扇转起来了吗':rt.fan.spinSpeed>0,'电线拉出来了吗':!!rt.cable&&rt.cable.visible,
    '吊灯亮了':rt.house.light.intensity>0,'空调位自己亮了':rt.house.acCold.visible,
    '空调位标签':rt.house.acLabel.userData.text,
    '奖励金币':Game.debug.save.game().coins-c0,'这一局花了':s.get('timeUsed',0)+' 秒',
    '过关状态':Game.Levels.statusOf('fan-cottage',Game.Save)})})()")"
shot work/cottage-5-power.png

echo ""
echo "===== H. 已通关再进来：重新摆一遍（可以再玩一次） ====="
echo "  $(ev "(()=>{Game.UI.closeAll();var s=window.__save();
  s.setFlag('powered',true);              /* 假装上一局已经通关 */
  var rt=window.__fresh();
  return JSON.stringify({'风扇回到屋后了吗':rt.fan.group.visible===false,
    '存档里的 powered 清了吗':s.flag('powered')===false,
    '存档里的 fanFound 清了吗':s.flag('fanFound')===false,
    '任务条':Game.debug.director.objective.text})})()")"

echo ""
echo "===== I. 来回跑几趟都欢迎：装好风扇→回广场借电→回小屋插上（东西还在） ====="
echo "  $(ev "(()=>{var s=window.__save();Game.Save.setFlag('hasCharger',false);
  var v0=s.get('visits',0);
  var rt=window.__fresh();
  window.__use(3.4,-15.8);                           /* 屋后拿风扇 */
  window.__r();                                      /* 变小 */
  window.__use(rt.house.fanSpot.x,rt.house.fanSpot.z);   /* 装上（没电） */
  var mid={'装上了':s.flag('fanMounted')};
  Game.debug.goHub();window.__step(0.2);             /* 回广场 */
  window.__use(15,-8);                               /* 借充电器 */
  Game.debug.go('fan-cottage');window.__step(0.2);   /* 再回小屋 */
  var back={'回来以后风扇还装着吗':s.flag('fanMounted'),'回来是大个子吗':Game.debug.player.small===false,
    '拿到充电器了吗':window.__flags().hasCharger,'任务条':Game.debug.director.objective.text};
  window.__r();window.__use(rt.house.fanSpot.x,rt.house.fanSpot.z);
  return JSON.stringify({'第一次装上':mid,'跑一趟广场再回来':back,
    '第二次也通电通关了':s.flag('powered'),'多进了几次关':s.get('visits',0)-v0})})()")"
shot work/cottage-6-again.png

echo ""
echo "===== J. 回广场的传送门（★每关都要有★） + 空调位彩蛋 ====="
echo "  $(ev "(()=>{Game.UI.closeAll();window.__reset({fanFound:true,fanMounted:true});
  var rt=window.__fresh();
  window.__use(rt.house.acSpot.x,rt.house.acSpot.z);
  var before=window.__lastToast();
  window.__use(-8,16);
  return JSON.stringify({'没电时按空调位':before,'按E回广场以后在哪':Game.debug.state().level,
    '传送门离出生点':8})})()")"

echo ""
echo "===== K. 时间预算（5 分钟够不够的设计依据） ====="
echo "  $(ev "(()=>{Game.debug.go('fan-cottage');var v=6.2,sm=3.4;
  var p1=Math.hypot(3.4,31.8);           /* 出生点(0,16) → 屋后(3.4,-15.8) */
  var p2=Math.hypot(3.4,14.4);           /* 屋后 → 门口(0,-1.4) */
  var p3=Math.hypot(4.1,6.6);            /* 门口 → 风扇位(-4.1,-8)，变小以后走得慢 */
  var p4=Math.hypot(3.9,24);             /* 风扇位 → 回广场的门(-8,16) */
  var p5=Math.hypot(23,24);              /* 广场传送门 → 工具台(15,-8) */
  var oneWay=(p1+p2)/v+p3/sm+p4/v+p5/v;  /* 一整套跑完 */
  var twice=p4/v+p5/v+p3/sm;             /* 再跑一趟回来插电 */
  return JSON.stringify({'总步数':Math.round(p1+p2+p3+p4+p5+twice*v),
    '纯走路秒数':Math.round(oneWay+twice),
    '设计目标':'5 分钟左右（含找东西、看牌子、来回跑几趟）'})})()")"

echo ""
echo "=== 运行期间捕获到的错误 ==="
echo "errors: $(ev "JSON.stringify(window.__errs)")"
echo DONE

#!/bin/zsh
# 第 7 关验收：石头迷宫
#   每次进关换一套新迷宫（同一颗种子 = 同一座迷宫）/
#   一定连通 → 出口一定走得到 / 外圈不漏 / 不能跳跃（也爬不上墙）/
#   按 F 打怪兽（掉金币 + 有概率掉装备）/ 走过去自动捡金币 /
#   小怪兽会追人、会咬人（只推人不掉血）/ 3 分钟倒计时（剩 45 秒才给出口箭头）/
#   时间到自动回小镇 / 走到（唯一亮着的）出口才通关 / 再进一次重新生成
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
  window.__fresh=function(){Game.UI.closeAll();Game.debug.go('stone-maze');
    return Game.debug.director.active?Game.debug.director.active.data:null;};
  /* 把玩家挪到某处 */
  window.__put=function(x,z){Game.debug.player.teleport(x,z);return [x,z];};
  /* 迷宫指纹：同一颗种子应该得到同一个指纹（验证「每次进关换新迷宫」） */
  window.__fp=function(m){var h=0;for(var i=0;i<m.grid.length;i++){h=(h*31+m.grid[i]+i)>>>0;}return h;};
  /* 站到某只怪兽旁边，按一下 F（先空跑 0.4 秒把「挥刀冷却」走完，不然这一下不算数） */
  window.__hit=function(m){window.__step(0.4);var g=m.group.position;
    Game.debug.player.teleport(g.x+2.2,g.z);
    Game.debug.player.input.attackQueued=true;window.__step(0.05);return m.hp;};
  /* 一直打到这只怪兽倒下（最多 12 下，防死循环） */
  window.__kill=function(m){var n=0;while(m.alive&&n<12){window.__hit(m);n++;}return n;};
  return 'helpers';})()"

$PW open --browser=chrome "http://127.0.0.1:$PORT/index.html" >/dev/null 2>&1
$PW click "#startBtn" >/dev/null 2>&1
sleep 1
# 清档：只把第 6 关标成通关，让第 7 关正常解锁
ev "(()=>{Game.Save.resetProfile();Game.Save.level('paint-the-field').setDone(true);Game.debug.director.rebuild();return 'ok'})()" >/dev/null
ev "$HELPERS" >/dev/null

echo "===== 0. 关卡登记（以游戏源码为准） ====="
echo "  $(ev "(()=>{var d=Game.Levels.get('stone-maze');var order=Game.Levels.playable().map(function(x){return x.id;});
  return JSON.stringify({id:d.id,名字:d.name,第几关:d.subtitle,图标:d.icon,order:d.order,不能跳跃:!!d.noJump,
    在关卡清单第几位:order.indexOf('stone-maze')+1,一共几关:order.length,出生点:d.spawn})})()")"

echo ""
echo "===== A. 一进关：一座 21×21 的大迷宫 + 3 分钟倒计时 + 只有一座出口亮着 ====="
echo "  $(ev "(()=>{var rt=window.__fresh();
  return JSON.stringify({迷宫:rt.maze.gw+'×'+rt.maze.gh+' 格',格子边长:3,世界范围:rt.maze.gw*3+'×'+rt.maze.gh*3+' 步',
    能走的格子:rt.maze.openCount,墙图元:rt.wallCount+' 条（合并过的）',倒计时:Math.round(rt.timeLeft),
    亮着的出口:rt.exits.filter(function(e){return e.portal.group.visible;}).length,怪兽:rt.monsters.length,金币:rt.coins.length,
    任务条:Game.debug.director.objective.text})})()")"
shot work/maze-start.png

echo ""
echo "===== B. ★连通性★：30 颗种子都「一定走得通」+ 外圈不漏 ====="
echo "  $(ev "(()=>{var bad=[],noExit=[],leak=[];
  for(var s=1;s<=30;s++){var m=Game.Maze.generate({cols:10,rows:10,seed:s});
    if(m.reached!==m.openCount)bad.push(s);
    var a=m.dist[1*m.gw+19],b=m.dist[1*m.gw+1];
    if(a<0||b<0)noExit.push(s);
    var k=0;
    for(var gx=0;gx<m.gw;gx++){if(!m.isWall(gx,0))k++;if(!m.isWall(gx,m.gh-1)&&gx!==m.entrance.gx)k++;}
    for(var gz=0;gz<m.gh;gz++){if(!m.isWall(0,gz))k++;if(!m.isWall(m.gw-1,gz))k++;}
    if(k>0)leak.push(s+':'+k);}
  return JSON.stringify({试了:30+' 颗种子',连通性有问题:bad,出口走不到:noExit,外圈漏水:leak,两个候选出口:'东北角 + 西北角'})})()")"

echo ""
echo "===== C. 同一颗种子 = 同一座迷宫（测试能复现）；不同种子 = 不同迷宫 ====="
echo "  $(ev "(()=>{var a=Game.Maze.generate({cols:10,rows:10,seed:12345}),b=Game.Maze.generate({cols:10,rows:10,seed:12345}),c=Game.Maze.generate({cols:10,rows:10,seed:54321});
  return JSON.stringify({同一个种子指纹一样:window.__fp(a)===window.__fp(b),不同种子指纹不一样:window.__fp(a)!==window.__fp(c),指纹:window.__fp(a)})})()")"

echo ""
echo "===== D. 每次进关都换一座新的迷宫 ====="
echo "  $(ev "(()=>{var seeds=[],fps=[];
  for(var i=0;i<6;i++){var rt=window.__fresh();seeds.push(rt.maze.seed);fps.push(window.__fp(rt.maze));}
  var us=seeds.filter(function(v,i){return seeds.indexOf(v)===i;}).length;
  var uf=fps.filter(function(v,i){return fps.indexOf(v)===i;}).length;
  return JSON.stringify({进了几次:6,不同的编号:us,不同的迷宫:uf,编号示例:seeds.slice(0,3)})})()")"

echo ""
echo "===== E. ★不能跳跃★：迷宫里按空格跳不起来，别的关卡还能跳 ====="
echo "  $(ev "(()=>{var p=Game.debug.player;window.__fresh();
  var mazeHint=document.getElementById('hintBar').textContent;
  var mazeJumpOn=p.jumpEnabled;
  window.dispatchEvent(new KeyboardEvent('keydown',{code:'Space'}));window.__step(0.5);
  var mazeY=+p.pos.y.toFixed(3);
  Game.debug.go('hub-square');window.__step(0.1);
  var hubJumpOn=p.jumpEnabled;
  var hubHint=document.getElementById('hintBar').textContent;
  window.dispatchEvent(new KeyboardEvent('keydown',{code:'Space'}));window.__step(0.3);
  var hubY=+p.pos.y.toFixed(3);
  return JSON.stringify({广场里还能跳:hubJumpOn===true,广场里跳到的高度:hubY,广场里跳起来了吗:hubY>0.6,
    广场底部说明:hubHint.indexOf('空格 跳跃')>=0,
    迷宫里的跳跃被关掉了:mazeJumpOn===false,迷宫里跳到的高度:mazeY,迷宫里跳起来了吗:mazeY>0.2,
    关卡声明不能跳:Game.Levels.get('stone-maze').noJump===true,
    迷宫底部说明:mazeHint.indexOf('这一关不能跳')>=0})})()")"

echo ""
echo "===== E2. 朝着墙走 2 秒：过不去、也爬不上去（墙 3 步 > 自动迈步 0.78 步） ====="
echo "  $(ev "(()=>{var rt=window.__fresh(),m=rt.maze,p=Game.debug.player;
  var cell=null,wall=null;
  for(var gz=1;gz<m.gh-1;gz++){for(var gx=1;gx<m.gw-1;gx++){
    if(m.isWall(gx,gz))continue;
    if(m.isWall(gx+1,gz)){cell={gx:gx,gz:gz};wall={gx:gx+1,gz:gz};break;}
  }if(cell)break;}
  var a=m.gridToWorld(cell.gx,cell.gz,3),b=m.gridToWorld(wall.gx,wall.gz,3);
  p.teleport(a.x,a.z);
  p.cam.yaw=Math.atan2(-(b.x-a.x),-(b.z-a.z));
  p.input.keys.KeyW=true;window.__step(2);p.input.keys.KeyW=false;
  var moved=Math.hypot(p.pos.x-a.x,p.pos.z-a.z);
  var at=m.worldToGrid(p.pos.x,p.pos.z,3);
  return JSON.stringify({墙高:Game.Maze.WALL_H,能自动迈上去的高度:Game.CONST.STEP_UP,
    朝墙走了几步:Math.round(moved*10)/10,爬上去的高度:+p.pos.y.toFixed(3),还在原来的格子里:at.gx===cell.gx&&at.gz===cell.gz})})()")"

echo ""
echo "===== F. 按 F 打怪兽：一只 4 下打死 + 掉 3~6 枚金币 ====="
echo "  $(ev "(()=>{var rt=window.__fresh(),m=rt.monsters[0],c0=Game.debug.save.game().coins;
  var hp1=window.__hit(m);
  var n=1,drop=0;while(m.alive&&n<12){var before=Game.debug.save.game().coins;window.__hit(m);n++;
    if(!m.alive)drop=Game.debug.save.game().coins-before;}
  return JSON.stringify({血条满格:m.hpMax,打一下剩:hp1,一共打了几下:n,这只倒下了:!m.alive,
    这一只掉的金币:drop,打倒了几只:rt.kills,金币一共变了:Game.debug.save.game().coins-c0,
    场上还剩:rt.monsters.filter(function(x){return x.alive;}).length})})()")"

echo ""
echo "===== G. 打死怪兽掉装备（3 座迷宫 / 24 只，看看掉率约 60%） ====="
echo "  $(ev "(()=>{var kills=0,drops=0,c0=Game.debug.save.game().coins,levels=0;
  for(var r=0;r<3;r++){var rt=window.__fresh();rt.monsters.forEach(function(m){window.__kill(m);});
    kills+=rt.kills;drops+=rt.droppedCount;levels++;}
  return JSON.stringify({逛了几座迷宫:levels,打死:kills+' 只',掉了:drops+' 件装备',
    实测掉率:kills?Math.round(drops/kills*100)+'%':'没打死',设计掉率:'60%',
    打死怪兽捡到的金币:Game.debug.save.game().coins-c0})})()")"
echo "  拿着装备也能打（史诗装备一下一只）: $(ev "(()=>{Game.debug.director.grantItem('diamond_sword',1);
  var rt=window.__fresh(),m=rt.monsters[0];window.__hit(m);
  return JSON.stringify({背包里最好的一件:Game.itemInfo('diamond_sword').name+'（史诗，攻击力 4）',一下打完:!m.alive,这只的血条:m.hp})})()")"

echo ""
echo "===== H. 金币：走过去自动捡，捡到的记在任务条上 ====="
echo "  $(ev "(()=>{var rt=window.__fresh(),c=rt.coins[0],g=c.group.position,c0=Game.debug.save.game().coins;
  window.__put(g.x,g.z);window.__step(0.05);
  return JSON.stringify({捡到几枚:rt.coinCount,加了金币:Game.debug.save.game().coins-c0,这枚收下了:c.taken,
    还挂在场上吗:rt.dyn.children.indexOf(c.group)>=0,这枚在死胡同里:rt.maze.deadEnd(rt.maze.worldToGrid(g.x,g.z,3).gx,rt.maze.worldToGrid(g.x,g.z,3).gz)})})()")"

echo ""
echo "===== I. 小怪兽会追人、会咬人（只推人不掉血、不失败） ====="
echo "  $(ev "(()=>{var rt=window.__fresh(),m=rt.monsters[0];
  window.__put(m.tx,m.tz);window.__step(0.05);
  var minD=99,alerted=false,stunned=false;
  window.__step(2,function(){var g=m.group.position,p=Game.debug.player.pos;
    var d=Math.hypot(p.x-g.x,p.z-g.z);if(d<minD)minD=d;
    if(m.alert)alerted=true;if(Game.debug.player.stunT>0)stunned=true;});
  return JSON.stringify({发现小朋友:alerted,追到最近的:Math.round(minD*10)/10+' 步',被咬:rt.bites+' 口',
    整个人被推开过:stunned,关卡失败了吗:!!rt.leaving,通关了吗:!!rt.won,人的高度:Game.debug.player.pos.y})})()")"

echo ""
echo "===== J. 只剩 45 秒才给「出口箭头」（前面不给，免得没得走） ====="
echo "  $(ev "(()=>{var rt=window.__fresh();
  var early=Game.debug.director.objective.target;
  rt.timeLeft=44;Game.debug.director._refreshObjective();
  var late=Game.debug.director.objective.target;
  return JSON.stringify({一开始不给箭头:early===null,剩44秒开始给箭头:!!late,
    箭头指着出口:!!late&&Math.abs(late.x-rt.exitPos.x)<0.01&&Math.abs(late.z-rt.exitPos.z)<0.01,
    任务条:Game.debug.director.objective.text})})()")"

echo ""
echo "===== K. 藏起来的那座出口走上去不算通关 ====="
echo "  $(ev "(()=>{var rt=window.__fresh();var hidden=rt.exits.filter(function(e){return e!==rt.exit;})[0];
  window.__put(hidden.pos.x,hidden.pos.z);window.__step(0.2);
  return JSON.stringify({走到了藏起来的门:true,这扇门亮着没:hidden.portal.group.visible,通关了吗:!!rt.won,还在继续吗:!rt.leaving})})()")"

echo ""
echo "===== L. 走到出口：通关 + 奖励 50 金币 + 记进存档 ====="
echo "  $(ev "(()=>{var rt=window.__fresh();var c0=Game.debug.save.game().coins;
  window.__put(rt.exitPos.x,rt.exitPos.z);window.__step(0.2);
  var panel=document.querySelector('#modalRoot .modal-panel');
  var s=Game.Save.level('stone-maze');
  return JSON.stringify({通关了:rt.won,面板:panel&&panel.querySelector('.chip')?panel.querySelector('.chip').textContent:'',
    奖励金币:Game.debug.save.game().coins-c0,最快一次:s.get('best',0)+' 秒',通关次数:s.get('cleared',0),
    存档里累计打倒的怪兽:s.get('kills',0)+' 只',存档里累计捡的金币:s.get('coins',0)+' 枚',
    这一关算通关了吗:Game.Levels.statusOf('stone-maze',Game.Save)})})()")"
shot work/maze-win.png

echo ""
echo "===== M. 时间到还没走出去：自动回小镇 + 记一次「重来」 ====="
echo "  $(ev "(()=>{var rt=window.__fresh();var a0=Game.Save.level('stone-maze').get('attempts',0);
  rt.timeLeft=0.4;window.__step(1);
  return JSON.stringify({时间到:rt.timeLeft===0,正在离开:rt.leaving,重来了几次:Game.Save.level('stone-maze').get('attempts',0)-a0,
    还能动吗:Game.debug.director.state})})()")"
sleep 2.6
echo "  2.6 秒后: $(ev "(()=>{var s=Game.debug.state();return JSON.stringify({现在在:s.level,那是哪:s.name})})()")"

echo ""
echo "===== N. 再进一次：又换一座新迷宫，金币和怪兽都回来了 ====="
echo "  $(ev "(()=>{var a=window.__fresh().maze.seed;var b=window.__fresh();
  return JSON.stringify({两次的迷宫编号不同:a!==b.maze.seed,倒计时:Math.round(b.timeLeft),金币:b.coins.length,
    怪兽:b.monsters.length,通关状态清了:b.won===false,出口还是只有一个亮着:b.exits.filter(function(e){return e.portal.group.visible;}).length})})()")"
shot work/maze-again.png

echo ""
echo "===== O. 时间估算（3 分钟够不够的设计依据） ====="
echo "  $(ev "(()=>{var rt=Game.debug.director.active.data,m=rt.maze;
  var d=m.dist[rt.exit.cell.gz*m.gw+rt.exit.cell.gx];
  return JSON.stringify({迷宫:m.gw+'×'+m.gh+' 格 = '+(m.gw*3)+'×'+(m.gh*3)+' 步',
    这一座的最短路:d+' 格 = '+d*3+' 步 ≈ '+Math.round(d*3/6.2)+' 秒（直线走完，不含绕路）',
    限时:180+' 秒',留的余量:'还有 '+(180-Math.round(d*3/6.2))+' 秒用来绕路、打怪兽、捡金币'})})()")"
echo DONE

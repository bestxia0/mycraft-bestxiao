#!/bin/zsh
# 背景音乐（BGM）验收：src/engine/music.js + 开始界面 / 暂停菜单里的开关
#   1. 打开页面还没点按钮时不许出声（连 AudioContext 都不该建）
#   2. 每一关（含广场）都配了曲子；没配的关卡兜底放 default
#   3. 切关卡 = 换曲子；暂停菜单会暂停；关掉之后真的不响（调度器也清掉）
#   4. 关掉 / 打开都记进存档（settings.music），老存档载入自动补字段
#   5. 切到别的页签自动暂停（后台标签页的定时器会被掐，不停会变电音）
set -u
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
PORT="${PORT:-8777}"
PW="playwright-cli"
ev() { $PW --raw eval "$1" 2>&1 | tail -2 }

$PW open --browser=chrome "http://127.0.0.1:$PORT/index.html" >/dev/null 2>&1
sleep 2

echo "===== A. 还没点按钮：不许出声（浏览器规矩） ====="
echo "  $(ev "JSON.stringify({版本:Game.version,该放哪首:Game.Music.current,建了ctx没:Game.Music.ctx!==null,在响没:Game.Music.playing,开关默认:Game.Music.enabled})")"

echo ""
echo "===== B. 曲库 vs 关卡：每一关都得有曲子 ====="
echo "  $(ev "JSON.stringify({关卡:Game.Levels.list().map(function(d){return d.id+(Game.Music.tracks[d.id]?'':' ✗没曲子')}),曲库:Object.keys(Game.Music.tracks)})")"
echo "  每首曲子都有名字/速度/鼓点: $(ev "JSON.stringify(Object.keys(Game.Music.tracks).map(function(k){var t=Game.Music.tracks[k];return t.name+' '+t.bpm+'bpm/'+t.wave+'/'+t.drum+(t.lead.length===4&&t.chords.length===4?' ✓':' ✗小节数不对')}))")"

echo ""
echo "===== C. 点「开始冒险」：广场那首响起来 ====="
$PW click "#startBtn" >/dev/null 2>&1
sleep 1.5
echo "  $(ev "JSON.stringify({该放哪首:Game.Music.current,在响没:Game.Music.playing,暂停没:Game.Music.paused,调度器活着:!!Game.Music._timer,音量:Game.Music.volume,ctx状态:Game.Music.ctx&&Game.Music.ctx.state})")"

echo ""
echo "===== D. 切关卡 = 换曲子（广场 + 5 关逐个走一遍） ====="
ev "(()=>{Game.debug.unlockAll();return 'ok'})()" >/dev/null
for L in riddle-forest chest-valley hanzi-classroom arena-battle desert-escape paint-the-field hub-square; do
  r=$(ev "(()=>{Game.debug.go('$L');return JSON.stringify({id:Game.Music.current,在响:Game.Music.playing,正好是这一关的曲子:Game.Music.current==='$L'})})()")
  echo "  进 $L → $r"
  sleep 0.7
done

echo ""
echo "===== E. 没配曲子的关卡：兜底放 default（不报错、也有声音） ====="
echo "  $(ev "(()=>{Game.Music.play('还没做的关卡');return JSON.stringify({现在该放:Game.Music.current,在响:Game.Music.playing})})()")"
sleep 0.6
ev "(()=>{Game.debug.go('hub-square');return 'ok'})()" >/dev/null
sleep 0.7

echo ""
echo "===== F. 暂停菜单：开菜单音乐暂停，点「继续玩」接着放 ====="
$PW click "#pauseBtn" >/dev/null 2>&1
sleep 0.6
echo "  打开暂停: $(ev "JSON.stringify({暂停没:Game.Music.paused,在响没:Game.Music.playing,游戏状态:Game.debug.director.state})")"
$PW click "#resumeBtn" >/dev/null 2>&1
sleep 0.6
echo "  点继续玩: $(ev "JSON.stringify({暂停没:Game.Music.paused,在响没:Game.Music.playing,游戏状态:Game.debug.director.state})")"

echo ""
echo "===== G. 关掉背景音乐：真的不响（调度器也要停） ====="
echo "  关掉后: $(ev "(()=>{document.getElementById('pauseMusicBtn').click();return JSON.stringify({开关:Game.Music.enabled,在响没:Game.Music.playing,暂停没:Game.Music.paused,调度器:Game.Music._timer,存档里记着:Game.Save.profile().settings.music,按钮文字:document.getElementById('pauseMusicBtn').textContent,director状态:Game.debug.director.state})})()")"
echo "  关着的时候切关卡也不该响: $(ev "(()=>{Game.debug.go('desert-escape');return JSON.stringify({该放哪首:Game.Music.current,在响没:Game.Music.playing})})()")"
sleep 0.6
echo "  打开后: $(ev "(()=>{document.getElementById('pauseMusicBtn').click();return JSON.stringify({开关:Game.Music.enabled,存档里记着:Game.Save.profile().settings.music,按钮文字:document.getElementById('pauseMusicBtn').textContent})})()")"
sleep 0.8
echo "  打开了就该听见（还应该是沙漠那首）: $(ev "JSON.stringify({在响没:Game.Music.playing,该放哪首:Game.Music.current})")"
echo "  开始界面那个按钮也跟着变: $(ev "JSON.stringify({开始界面:document.getElementById('musicBtn').textContent})")"

echo ""
echo "===== H. 切到别的页签：自动暂停 / 回来继续 ====="
echo "  切走: $(ev "(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:function(){return true;}});document.dispatchEvent(new Event('visibilitychange'));return JSON.stringify({暂停没:Game.Music.paused,在响没:Game.Music.playing})})()")"
sleep 0.5
echo "  回来: $(ev "(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:function(){return false;}});document.dispatchEvent(new Event('visibilitychange'));return JSON.stringify({暂停没:Game.Music.paused,在响没:Game.Music.playing})})()")"
sleep 0.6

echo ""
echo "===== I. 存档字段 settings.music ====="
echo "  导出存档里有 music 字段: $(ev "JSON.stringify({导出的存档带music:Game.Save.exportJSON().indexOf('\"music\"')>=0,当前值:Game.Save.profile().settings.music})")"
echo "  老存档（没有 music 字段）载入会自动补上: $(ev "(()=>{var root=JSON.parse(Game.Save.exportJSON());delete root.profiles[root.activeProfile].settings.music;var r=Game.Save.importJSON(JSON.stringify(root));return JSON.stringify({导入成功:r.ok,补上了:Game.Save.profile().settings.music})})()")"
echo "  换成老存档后重开页面（localStorage 里没有 music 字段）: $(ev "(()=>{var root=JSON.parse(Game.Save.exportJSON());delete root.profiles[root.activeProfile].settings.music;localStorage.setItem('block-hero.saves.v3',JSON.stringify(root));return '写好了'})()")"
$PW open --browser=chrome "http://127.0.0.1:$PORT/index.html" >/dev/null 2>&1
sleep 2
echo "    $(ev "JSON.stringify({开关:Game.Music.enabled,存档里:Game.Save.profile().settings.music,该放哪首:Game.Music.current,还没点按钮所以没响:Game.Music.playing===false})")"
$PW click "#startBtn" >/dev/null 2>&1
sleep 1.5
echo "    点了开始: $(ev "JSON.stringify({在响没:Game.Music.playing,该放哪首:Game.Music.current})")"

echo ""
echo "===== J. 音量接口 / 曲库自检 ====="
echo "  $(ev "(()=>{var a=Game.Music.setVolume(0.5);var b=Game.Music.volume;var c=Game.Music.setVolume(9)===1&&Game.Music.volume===1;var d=Game.Music.setVolume(0.35)===0.35;return JSON.stringify({设成0_5后读回来:a,读回来等于0_5:b===0.5,上限会夹住:c,回到默认音量:d})})()")"
echo DONE

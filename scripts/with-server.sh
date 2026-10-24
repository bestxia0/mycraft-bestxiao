#!/bin/zsh
# 起一个临时本地服务器，跑完你给的命令就把它关掉。
# 用法：zsh scripts/with-server.sh zsh scripts/regress-all.sh
set -u
cd "$(dirname "$0")/.."
PORT="${PORT:-8777}"
python3 -m http.server "$PORT" --bind 127.0.0.1 > work/http.log 2>&1 &
SRV=$!
# 等服务器起来
for i in 1 2 3 4 5 6 7 8 9 10; do
  if curl -s -o /dev/null -m 2 "http://127.0.0.1:$PORT/index.html"; then break; fi
  sleep 0.4
done
echo "[with-server] http://127.0.0.1:$PORT/ （日志 work/http.log）"
PORT=$PORT "$@"
RC=$?
kill $SRV 2>/dev/null
echo "[with-server] 已关闭服务器（退出码 $RC）"
exit $RC

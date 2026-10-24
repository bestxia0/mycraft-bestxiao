#!/bin/zsh
# 起本地静态服务器（默认 8777 端口）。用法：zsh scripts/serve.sh [端口]
set -u
cd "$(dirname "$0")/.."
PORT="${1:-8777}"
echo "服务目录：$(pwd)"
echo "打开：http://127.0.0.1:$PORT/"
exec python3 -m http.server "$PORT"

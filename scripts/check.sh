#!/bin/zsh
# 全部 JS 语法检查（node --check）。有错就退出码非 0。
set -u
cd "$(dirname "$0")/.."
fail=0
n=0
while IFS= read -r f; do
  n=$((n+1))
  if ! node --check "$f" >/dev/null 2>&1; then
    echo "FAIL $f"
    node --check "$f"
    fail=1
  fi
done < <(find src -name "*.js" | sort)
if [ "$fail" = "0" ]; then
  echo "OK：$n 个 JS 文件语法检查全部通过"
else
  echo "有文件没通过，见上面输出"
fi
exit $fail

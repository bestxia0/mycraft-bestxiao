#!/usr/bin/env bash
# 按模板新建一张关卡设计卡
#
# 用法：./scripts/new-level.sh <序号> <短名>
# 例：  ./scripts/new-level.sh 06 给小房子装窗户
#
# 只做两件事：生成 levels/L<序号>-<短名>.md；把要粘到关卡总表的表格行打印出来。
# 不自动改 levels/README.md（总表是人工维护的，避免脚本写坏表格）。
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"

if [ "$#" -lt 2 ]; then
  cat >&2 <<'USAGE'
用法：./scripts/new-level.sh <序号> <短名>
例：  ./scripts/new-level.sh 06 给小房子装窗户

序号用口述顺序（两位以内数字，如 1 或 06）。
USAGE
  exit 1
fi

num="$1"
name="$2"

case "$num" in
  ''|*[!0-9]*) echo "序号必须是数字，收到：$num" >&2; exit 1 ;;
esac

# 去掉短名里的空格，避免文件路径带空格
name="${name// /-}"

id="$(printf 'L%02d' "$num" 2>/dev/null || printf 'L%s' "$num")"
file="$root/levels/${id}-${name}.md"
today="$(date +%F)"

if [ -e "$file" ]; then
  echo "已存在，未覆盖：$file" >&2
  exit 1
fi

cat > "$file" <<EOF
# ${id} · ${name}

- 状态：草稿
- 小朋友口中的第几关：待填
- 游戏内顺序：待确认
- 更新：${today}

## 原话（E0）

> 把小朋友的原话逐字贴在这里，不改错别字、不加修饰。

## 场景

## 道具

| 道具 | 作用 | 从哪来 |
|------|------|--------|
|  |  |  |

## 动作

1.

## 目标（怎么算过关）

## 规则（硬约束）

- 卡住了必须有出路（允许绕路 / 替代路径）：
- 不惩罚失败、不弹出正确答案。

## 机制映射（给实现用）

| 玩法 | 实现手段 | 触发 / 变化 / 反馈 |
|------|----------|--------------------|
|  |  |  |

## 待确认（E2）

- [ ]

## 试玩记录

| 日期 | 结果 | 卡在哪 | 小朋友原话 |
|------|------|--------|-----------|
| | | | |

## 变更日志

| 日期 | 改了什么 | 为什么 |
|------|----------|--------|
| ${today} | 建卡 |  |
EOF

echo "已创建：$file"
echo
echo "把下面这行粘到 levels/README.md 的总表里："
echo "| ${id} | ${name} | 待填 | 待填 | 待填 | 草稿 | [${id}](${id}-${name}.md) |"

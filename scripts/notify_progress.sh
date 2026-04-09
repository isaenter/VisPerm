#!/bin/bash
# VisPerm 开发进度 Telegram 通知脚本
# 用法: ./notify_progress.sh "消息内容"

TOKEN="8500067210:AAH7kzmkhjUd67oiGg-IrlGfj-meRNaUTOE"
CHAT_ID="6882679834"

MESSAGE="${1:-📢 VisPerm 开发进度更新}"

curl -s -X POST "https://api.telegram.org/bot${TOKEN}/sendMessage" \
  -H "Content-Type: application/json" \
  -d "{
    \"chat_id\": \"${CHAT_ID}\",
    \"text\": \"${MESSAGE}\\n\\n⏰ $(date '+%Y-%m-%d %H:%M:%S')\"
  }" | python3 -m json.tool > /dev/null 2>&1

if [ $? -eq 0 ]; then
    echo "✅ 通知已发送"
else
    echo "❌ 通知发送失败"
fi

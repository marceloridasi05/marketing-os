#!/bin/bash
# Start both API and Client dev servers for Marketing OS
# Usage: ./start.sh

DIR="$(cd "$(dirname "$0")" && pwd)"

echo "🛑 Killing existing processes..."
lsof -ti :3001 | xargs kill -9 2>/dev/null
lsof -ti :5173 | xargs kill -9 2>/dev/null
sleep 1

echo "🚀 Starting API server (port 3001)..."
cd "$DIR/server" && nohup npx tsx watch src/index.ts > /tmp/mos-api.log 2>&1 &
API_PID=$!

echo "🚀 Starting Client dev server (port 5173)..."
cd "$DIR/client" && nohup npx vite --host > /tmp/mos-client.log 2>&1 &
CLIENT_PID=$!

sleep 3

# Verify
API_OK=$(curl -s http://localhost:3001/api/health 2>/dev/null | grep -c "ok")
CLIENT_OK=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5173/ 2>/dev/null)

if [ "$API_OK" = "1" ] && [ "$CLIENT_OK" = "200" ]; then
  echo ""
  echo "✅ Brick Marketing Flight Control Center rodando!"
  echo "   🌐 App: http://localhost:5173/"
  echo "   🔌 API: http://localhost:3001/"
  echo "   📋 API PID: $API_PID | Client PID: $CLIENT_PID"
  echo "   📄 Logs: /tmp/mos-api.log | /tmp/mos-client.log"
else
  echo "❌ Erro ao iniciar. Verifique os logs:"
  echo "   cat /tmp/mos-api.log"
  echo "   cat /tmp/mos-client.log"
fi

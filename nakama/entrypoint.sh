#!/bin/sh
set -e

if [ -z "$DATABASE_URL" ]; then
  echo "ERROR: DATABASE_URL not set!"
  exit 1
fi

echo "▶ Running Nakama DB migrations..."
/nakama/nakama migrate up --database.address "$DATABASE_URL"

echo "▶ Starting Nakama server..."
exec /nakama/nakama \
  --database.address "$DATABASE_URL" \
  --logger.level INFO \
  --runtime.js_entrypoint "tictactoe.js" \
  --socket.server_key "defaultkey" \
  --runtime.http_key "defaulthttpkey" \
  --console.port 7351 \
  --console.username "admin" \
  --console.password "password"

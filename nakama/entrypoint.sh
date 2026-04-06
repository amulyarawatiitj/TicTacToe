#!/bin/sh
set -e

echo "▶ Running Nakama DB migrations..."
/nakama/nakama migrate up --database.address "$DATABASE_URL"

echo "▶ Starting Nakama server..."
exec /nakama/nakama \
  --database.address          "$DATABASE_URL" \
  --socket.server_key         "${SERVER_KEY:-defaultkey}" \
  --runtime.http_key          "${HTTP_KEY:-defaulthttpkey}" \
  --logger.level              INFO \
  --session.token_expiry_sec  7200 \
  --console.port              7351 \
  --console.username          "${CONSOLE_USER:-admin}" \
  --console.password          "${CONSOLE_PASS:-password}"

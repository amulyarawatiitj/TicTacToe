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
  --socket.server_key "defaultkey" \
  --runtime.http_key "defaulthttpkey" \
  --session.token_expiry_sec 7200 \
  --session.http_cors_allowed_origins "https://tic-tac-toe-flax-one-36.vercel.app,http://localhost:3000" \
  --session.http_cors_max_age 3600 \
  --console.port 7351 \
  --console.username "admin" \
  --console.password "password"

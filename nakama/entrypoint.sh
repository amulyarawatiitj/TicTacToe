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
  --config /etc/nakama/nakama.yml \
  --database.address "$DATABASE_URL"

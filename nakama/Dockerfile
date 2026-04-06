# Build context = repo root (Railway default)
# ── Stage 1: Compile TypeScript module ───────────────────────
FROM node:20-alpine AS builder
WORKDIR /app
COPY nakama/package.json nakama/tsconfig.json ./
RUN npm install
COPY nakama/modules/ ./modules/
RUN npm run build
# → /app/build/tictactoe.js

# ── Stage 2: Run Nakama ───────────────────────────────────────
FROM registry.heroiclabs.com/heroiclabs/nakama:3.22.0
COPY --from=builder /app/build/tictactoe.js /nakama/data/modules/tictactoe.js
COPY nakama/nakama.yml /etc/nakama/nakama.yml
COPY nakama/entrypoint.sh /entrypoint.sh
EXPOSE 7349 7350 7351
ENTRYPOINT ["/bin/sh", "/entrypoint.sh"]

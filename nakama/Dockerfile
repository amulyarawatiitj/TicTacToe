# ── Stage 1: Build TypeScript module ─────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json tsconfig.json ./
RUN npm install
COPY modules/ ./modules/
RUN npm run build
# → /app/build/tictactoe.js

# ── Stage 2: Run Nakama ───────────────────────────────────────
FROM registry.heroiclabs.com/heroiclabs/nakama:3.22.0

# Copy compiled module into Nakama's module directory
COPY --from=builder /app/build/tictactoe.js /nakama/data/modules/tictactoe.js

# Copy startup script
COPY entrypoint.sh /entrypoint.sh

EXPOSE 7349 7350 7351

ENTRYPOINT ["/bin/sh", "/entrypoint.sh"]

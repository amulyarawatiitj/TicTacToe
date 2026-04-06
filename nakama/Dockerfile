# Build context = repo root (Railway default)
# ── Stage 1: Copy pre-built JavaScript module ───────────────────
FROM alpine:latest AS builder
COPY nakama/build/tictactoe.js /tictactoe.js
# → /tictactoe.js

# ── Stage 2: Run Nakama ───────────────────────────────────────
FROM registry.heroiclabs.com/heroiclabs/nakama:3.22.0
COPY --from=builder /tictactoe.js /nakama/data/modules/tictactoe.js
COPY nakama/entrypoint.sh /entrypoint.sh
EXPOSE 7349 7350 7351
ENTRYPOINT ["/bin/sh", "/entrypoint.sh"]

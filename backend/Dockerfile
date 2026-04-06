FROM node:18-alpine AS builder

WORKDIR /build

# Copy package files
COPY backend/package*.json ./
RUN npm ci

# Copy source
COPY backend/src ./src

# Build
RUN npm run build

# Final stage
FROM heroiclabs/nakama:3.22.0

# Install curl for health checks (Debian-based image)
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*

# Copy built module
COPY --from=builder /build/build/tictactoe.js /nakama/data/modules/tictactoe.js

# Copy config
COPY backend/nakama.yml /etc/nakama/nakama.yml

# Health check
HEALTHCHECK --interval=10s --timeout=5s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:7350/ || exit 1

# Run Nakama
CMD ["nakama", "--config", "/etc/nakama/nakama.yml"]

#!/bin/bash
set -e

echo "🎮 Tic-Tac-Toe - Development Setup"
echo "=================================="

# Check Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed"
    exit 1
fi

echo "✓ Docker & Docker Compose found"

# Build backend module
echo ""
echo "📦 Building backend module..."
cd backend

if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed"
    exit 1
fi

npm install --silent
npm run build
echo "✓ Backend module built"

cd ..

# Start services
echo ""
echo "🚀 Starting services with Docker Compose..."
docker-compose up -d

echo ""
echo "⏳ Waiting for services to be healthy..."
sleep 10

# Check services
echo ""
echo "✓ Backend: http://localhost:7350"
echo "✓ Frontend: Run 'cd frontend && npm install && npm run dev'"

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Open another terminal"
echo "2. cd frontend"
echo "3. npm install"
echo "4. npm run dev"
echo ""
echo "Then open http://localhost:3000 in your browser"

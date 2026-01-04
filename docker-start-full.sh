#!/bin/bash

# ProjectHub Full Stack Docker Setup
# Starts both backend and frontend

set -e

echo "🚀 ProjectHub Full Stack Setup"
echo "==============================="
echo ""

# Check Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker not installed!"
    echo "Install: https://docker.com or https://orbstack.dev"
    exit 1
fi

echo "✅ Docker is installed"

# Check .env
if [ ! -f .env ]; then
    echo ""
    echo "📝 Creating .env..."
    cp .env.docker .env
    echo "✅ Created .env"
    echo ""
    echo "⚠️  IMPORTANT: Edit .env and add:"
    echo "   - OPENROUTER_API_KEY"
    echo "   - HUGGING_FACE_API_KEY"
    echo "   - JWT_SECRET"
    echo "   - JWT_REFRESH_SECRET"
    echo "   - NEXTAUTH_SECRET"
    echo ""
    read -p "Press Enter after updating .env..."
fi

echo ""
echo "🏗️  Building images (this may take a few minutes)..."
docker-compose -f docker-compose.full.yml build

echo ""
echo "🚀 Starting all services..."
docker-compose -f docker-compose.full.yml up -d

echo ""
echo "⏳ Waiting for services..."
sleep 15

echo ""
echo "🏥 Checking health..."
docker-compose -f docker-compose.full.yml ps

echo ""
echo "✅ ProjectHub is running!"
echo ""
echo "📍 Access Points:"
echo "   Frontend:  http://localhost:3001"
echo "   Backend:   http://localhost:3000"
echo "   API Docs:  http://localhost:3000/api"
echo ""
echo "📊 Services:"
echo "   PostgreSQL: localhost:5432"
echo "   Redis:      localhost:6379"
echo "   Qdrant:     http://localhost:6333"
echo ""
echo "📋 Useful Commands:"
echo "   Logs:     docker-compose -f docker-compose.full.yml logs -f"
echo "   Stop:     docker-compose -f docker-compose.full.yml down"
echo "   Restart:  docker-compose -f docker-compose.full.yml restart"
echo ""

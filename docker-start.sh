#!/bin/bash

# ProjectHub Docker Quick Start Script
# This script helps you set up and run ProjectHub with Docker

set -e

echo "🚀 ProjectHub Docker Setup"
echo "=========================="
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed!"
    echo "Please install Docker Desktop or OrbStack first:"
    echo "  - Docker Desktop: https://www.docker.com/products/docker-desktop"
    echo "  - OrbStack (Mac): https://orbstack.dev"
    exit 1
fi

echo "✅ Docker is installed"

# Check if .env exists
if [ ! -f .env ]; then
    echo ""
    echo "📝 Creating .env file from template..."
    cp .env.docker .env
    echo "✅ Created .env file"
    echo ""
    echo "⚠️  IMPORTANT: Edit .env and add your API keys:"
    echo "   - OPENROUTER_API_KEY (required)"
    echo "   - HUGGING_FACE_API_KEY (required)"
    echo "   - JWT_SECRET (required)"
    echo "   - JWT_REFRESH_SECRET (required)"
    echo ""
    read -p "Press Enter after you've updated .env, or Ctrl+C to exit..."
fi

echo ""
echo "🏗️  Building Docker images..."
docker-compose build

echo ""
echo "🚀 Starting services..."
docker-compose up -d

echo ""
echo "⏳ Waiting for services to be healthy..."
sleep 10

# Check health
echo ""
echo "🏥 Checking service health..."
docker-compose ps

echo ""
echo "✅ ProjectHub is running!"
echo ""
echo "📍 Services:"
echo "   Backend API: http://localhost:3000"
echo "   PostgreSQL:  localhost:5432"
echo "   Redis:       localhost:6379"
echo "   Qdrant:      http://localhost:6333"
echo ""
echo "📊 Useful commands:"
echo "   View logs:        docker-compose logs -f"
echo "   Stop services:    docker-compose down"
echo "   Restart backend:  docker-compose restart backend"
echo ""
echo "🧪 Test it:"
echo "   curl http://localhost:3000/health"
echo ""

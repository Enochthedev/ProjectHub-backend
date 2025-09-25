#!/bin/bash

# Fast production build script for Render deployment
set -e

echo "🚀 Starting optimized build..."

# Install all dependencies including devDependencies for build
echo "📦 Installing dependencies (including dev for build)..."
npm ci --include=dev --prefer-offline --no-audit --progress=false

# Build with optimizations
echo "🔨 Building application..."
NODE_ENV=production npm run build --silent

# Run migrations during build (when we have more memory)
echo "🗄️ Running database migrations..."
npm run migration:run:prod || echo "⚠️ Migrations failed, will retry on startup"

# Clean up devDependencies after build to save space
echo "🧹 Cleaning up dev dependencies..."
npm prune --production

echo "✅ Build completed successfully!"
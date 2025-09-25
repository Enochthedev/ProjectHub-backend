#!/bin/bash

# Fast production build script for Render deployment
set -e

echo "🚀 Starting optimized build..."

# Install dependencies with optimizations
echo "📦 Installing dependencies (optimized)..."
npm ci --prefer-offline --no-audit --progress=false

# Build with optimizations
echo "🔨 Building application..."
NODE_ENV=production npm run build --silent

echo "✅ Build completed successfully!"
echo "🗄️ Migrations will run on app startup"
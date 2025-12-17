#!/bin/bash

# Site Crawler - Electron Build Script
# Builds standalone executables for macOS, Windows, and Linux

set -e

echo "🖥️  Site Crawler - Electron Build"
echo "=================================="
echo ""

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js 18+ is required (found v$(node -v))"
    exit 1
fi

echo "✓ Node.js $(node -v) detected"
echo ""

# Step 1: Install dependencies
echo "📦 Step 1: Installing dependencies..."
npm install --silent
echo "✓ Dependencies installed"
echo ""

# Step 2: Build Vue app
echo "🔨 Step 2: Building Vue app..."
npm run build
echo "✓ Vue app built"
echo ""

# Step 3: Install proxy dependencies
echo "📦 Step 3: Installing proxy server dependencies..."
cd proxy-server
npm install --silent --production
cd ..
echo "✓ Proxy dependencies installed"
echo ""

# Step 4: Build Electron app
echo "🏗️  Step 4: Building Electron application..."

# Detect platform
PLATFORM=$(uname -s)

if [ "$PLATFORM" = "Darwin" ]; then
    echo "📱 Building for macOS..."
    npm run electron-build -- --mac
    echo "✓ macOS build complete"
    echo "  Output: dist/*.dmg and dist/*.zip"
elif [ "$PLATFORM" = "Linux" ]; then
    echo "🐧 Building for Linux..."
    npm run electron-build -- --linux
    echo "✓ Linux build complete"
    echo "  Output: dist/*.AppImage and dist/*.deb"
else
    # Windows or other
    echo "🪟 Building for Windows..."
    npm run electron-build -- --win
    echo "✓ Windows build complete"
    echo "  Output: dist/*.exe"
fi

echo ""
echo "✅ Electron Build Complete!"
echo ""
echo "📁 Executables location: ./dist"
echo ""
ls -lh dist/*.{exe,dmg,AppImage,deb} 2>/dev/null || echo "Checking build outputs..."
echo ""
echo "🚀 Share the executable with users!"
echo ""

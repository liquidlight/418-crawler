#!/bin/bash

# Site Crawler - Build and Package Script
# This script builds the production bundle and creates a distributable package

set -e

echo "🏗️  Site Crawler Build & Package Script"
echo "======================================"
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

# Step 2: Build the Vue app
echo "🔨 Step 2: Building Vue app..."
npm run build
echo "✓ Vue app built successfully"
echo ""

# Step 3: Create package
echo "📦 Step 3: Creating distribution package..."
npm run package
echo "✓ Package created successfully"
echo ""

# Step 4: Install proxy dependencies
echo "📦 Step 4: Installing proxy server dependencies..."
cd site-crawler-package/proxy-server
npm install --silent --production
cd ../..
echo "✓ Proxy server dependencies installed"
echo ""

# Step 5: Create archive (optional)
if command -v zip &> /dev/null; then
    echo "📦 Step 5: Creating ZIP archive..."
    ZIP_NAME="site-crawler-$(date +%Y%m%d-%H%M%S).zip"
    zip -r -q "$ZIP_NAME" site-crawler-package/
    echo "✓ Archive created: $ZIP_NAME"
    echo ""
    ls -lh "$ZIP_NAME"
else
    echo "ℹ️  ZIP utility not found, skipping archive creation"
    echo "   You can manually create an archive with:"
    echo "   zip -r site-crawler.zip site-crawler-package/"
    echo ""
fi

echo ""
echo "✅ Build Complete!"
echo ""
echo "📁 Package location: ./site-crawler-package/"
echo ""
echo "🚀 To run locally:"
echo "   cd site-crawler-package"
echo "   npm install"
echo "   npm start"
echo ""
echo "🌐 Then open: http://localhost:5173"
echo ""

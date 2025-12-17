#!/bin/bash

# Site Crawler Development Server Startup Script
# Starts both the CORS proxy server and the Vue dev server

set -e

echo "🚀 Starting Site Crawler Development Environment..."
echo ""

# Check if node_modules exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing main dependencies..."
    npm install
fi

if [ ! -d "proxy-server/node_modules" ]; then
    echo "📦 Installing proxy server dependencies..."
    cd proxy-server
    npm install
    cd ..
fi

echo ""
echo "✅ All dependencies installed"
echo ""
echo "🌐 Starting services..."
echo "   - CORS Proxy Server: http://localhost:8080"
echo "   - Dev Server: http://localhost:5173"
echo ""

# Function to check if proxy is available
check_proxy() {
    curl -s http://localhost:8080/health > /dev/null 2>&1
}

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Shutting down services..."
    kill $PROXY_PID 2>/dev/null || true
    kill $DEV_PID 2>/dev/null || true
    exit 0
}

# Function to find an available port starting from a given port
find_available_port() {
    local port=$1
    while lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; do
        port=$((port + 1))
    done
    echo $port
}

# Set trap to cleanup on Ctrl+C
trap cleanup SIGINT SIGTERM

# Find an available port for the proxy (starting from 8080)
PROXY_PORT=$(find_available_port 8080)

if [ $PROXY_PORT -ne 8080 ]; then
    echo "⚠️  Port 8080 is in use"
    echo "   Using port $PROXY_PORT instead"
fi

# Start proxy server in background
echo "Starting CORS proxy server on port $PROXY_PORT..."
PROXY_PORT=$PROXY_PORT npm run proxy &
PROXY_PID=$!

# Wait for proxy to be ready
echo "Waiting for proxy server to start..."
MAX_ATTEMPTS=30
ATTEMPT=0
while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
    if curl -s http://localhost:$PROXY_PORT/health > /dev/null 2>&1; then
        echo "✅ Proxy server is ready (http://localhost:$PROXY_PORT)"
        break
    fi
    ATTEMPT=$((ATTEMPT + 1))
    sleep 0.5
done

if [ $ATTEMPT -eq $MAX_ATTEMPTS ]; then
    echo "❌ Error: Proxy server failed to start"
    echo "   - Check if port $PROXY_PORT is available"
    echo "   - Check proxy-server/server.js for errors"
    kill $PROXY_PID 2>/dev/null || true
    exit 1
fi

echo ""
echo "Starting Vue dev server..."
PROXY_PORT=$PROXY_PORT npm run dev &
DEV_PID=$!

echo ""
echo "✅ All services started successfully!"
echo ""
echo "🌐 Open your browser: http://localhost:5173"
echo "🌐 Proxy server: http://localhost:$PROXY_PORT"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Wait for both processes
wait

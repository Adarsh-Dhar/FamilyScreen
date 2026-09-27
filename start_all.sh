#!/bin/bash

# Fire TV Sports Companion - Start All Apps
# This script starts the TV app and API server

set -e

echo "🚀 Fire TV Sports Companion - Starting All Apps"
echo "=============================================="
echo ""

# Function to check if a process is running on a port
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# Check if API server is already running
if check_port 8080; then
    echo "✅ API server is already running on port 8080"
else
    echo "📡 Starting API server..."
    cd artifacts/api-server
    pnpm start &
    API_PID=$!
    cd ../..
    
    # Wait for API server to start
    echo "⏳ Waiting for API server to start..."
    for i in {1..30}; do
        if check_port 8080; then
            echo "✅ API server started successfully"
            break
        fi
        sleep 1
    done
    
    if ! check_port 8080; then
        echo "❌ Failed to start API server"
        exit 1
    fi
fi

# Try to start Vega virtual device
echo "📺 Attempting to start Vega virtual device..."
VEGA_PID=""

# Check if vega command is available
if command -v vega &> /dev/null; then
    echo "🔧 Vega command found, attempting to start virtual device..."
    
    # Clean up any stale instances first
    vega virtual-device stop > /dev/null 2>&1 || true
    rm -rf /Users/adarsh/vega/sdk/vega-sdk/main/0.24.12112/vvd/instances/* > /dev/null 2>&1 || true
    
    # Try to start the virtual device with timeout and capture output
    echo "⏳ Starting virtual device (this may take 1-2 minutes)..."
    timeout 90 vega virtual-device start > /tmp/vega-start.log 2>&1 &
    VEGA_START_PID=$!
    
    # Wait for virtual device to start
    for i in {1..90}; do
        if vega device list 2>/dev/null | grep -q "vega"; then
            echo "✅ Vega virtual device started successfully"
            VEGA_PID="running"
            break
        fi
        sleep 1
    done
    
    # Check if virtual device started successfully
    if [ -z "$VEGA_PID" ]; then
        echo "⚠️  Vega virtual device failed to start within timeout"
        echo "💡 Check logs at /tmp/vega-start.log for details"
        kill $VEGA_START_PID > /dev/null 2>&1 || true
    fi
else
    echo "⚠️  Vega command not found, skipping Vega virtual device"
    echo "💡 To use Vega virtual device, install the Vega SDK"
fi

# Build Vega TV app
echo "📦 Building Vega TV app..."
cd vega-app
pnpm run build:debug
cd ..

# Launch Vega TV app if device is running
if [ ! -z "$VEGA_PID" ]; then
    echo "🚀 Launching Vega TV app..."
    cd vega-app
    
    # Find the built vpkg file
    VPKG_FILE=$(find build/private/kepler -name "*.vpkg" | head -n 1)
    
    if [ -n "$VPKG_FILE" ]; then
        echo "📦 Using package: $VPKG_FILE"
        vega run-app "$VPKG_FILE" > /dev/null 2>&1 &
        TV_PID=$!
        echo "✅ Vega TV app launched"
    else
        echo "⚠️  No vpkg file found, app not launched"
        TV_PID=""
    fi
    
    cd ..
else
    echo "⚠️  Vega TV app not launched (virtual device not available)"
    echo "💡 Vega TV app built successfully for future deployment"
    TV_PID=""
fi

echo ""
echo "🎉 Development environment started successfully!"
echo ""
echo "📋 Running Services:"
echo "   • API Server: http://localhost:8080"
if [ ! -z "$VEGA_PID" ]; then
    echo "   • Vega TV App: Running on virtual device"
else
    echo "   • Vega TV App: Built and ready (virtual device not started)"
fi
echo ""
echo "🎯 Development Mode:"
if [ ! -z "$VEGA_PID" ]; then
    echo "   • Vega TV app is running on virtual device"
else
    echo "   • Vega TV app is built but not running"
fi
echo "   • API server is running and ready for requests"
echo ""
echo "🛑 To stop all apps, press Ctrl+C or run: pnpm run stop:all"
echo ""

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Stopping all apps..."
    
    if [ ! -z "$TV_PID" ]; then
        kill $TV_PID 2>/dev/null || true
        echo "✅ Vega TV app stopped"
    fi
    
    # Stop virtual device
    vega virtual-device stop > /dev/null 2>&1 || true
    echo "✅ Virtual device stopped"
    
    if [ ! -z "$API_PID" ]; then
        kill $API_PID 2>/dev/null || true
        echo "✅ API server stopped"
    fi
    
    echo "👋 All apps stopped"
    exit 0
}

# Trap Ctrl+C
trap cleanup SIGINT SIGTERM

# Keep script running
echo "Press Ctrl+C to stop all apps..."
wait

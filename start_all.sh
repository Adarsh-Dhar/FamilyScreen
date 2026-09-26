#!/bin/bash

# Fire TV Discovery Demo - Start All Apps
# This script starts the TV app, web app, and API server

set -e

echo "🚀 Fire TV Discovery Demo - Starting All Apps"
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

# Function to get local IP address
get_local_ip() {
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        ipconfig getifaddr en0
    else
        # Linux
        hostname -I | awk '{print $1}'
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

# Get local IP for web app configuration
LOCAL_IP=$(get_local_ip)
echo "🌐 Local IP address: $LOCAL_IP"

# Update web app API URL
echo "📝 Updating web app API URL..."
sed -i.bak "s|const API_BASE_URL = 'http://.*:8080'|const API_BASE_URL = 'http://$LOCAL_IP:8080'|g" apps/family-screen-mobile/web/src/App.jsx
rm -f apps/family-screen-mobile/web/src/App.jsx.bak

# Try to start Vega virtual device
echo "📺 Attempting to start Vega virtual device..."
VEGA_PID=""
USE_ANDROID_EMULATOR=false

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
            USE_ANDROID_EMULATOR=false
            break
        fi
        sleep 1
    done
    
    # Check if virtual device started successfully
    if [ -z "$VEGA_PID" ]; then
        echo "⚠️  Vega virtual device failed to start within timeout"
        echo "💡 Check logs at /tmp/vega-start.log for details"
        echo "💡 Falling back to web app only"
        USE_ANDROID_EMULATOR=true
        kill $VEGA_START_PID > /dev/null 2>&1 || true
    fi
else
    echo "⚠️  Vega command not found, skipping Vega virtual device"
    echo "💡 To use Vega virtual device, install the Vega SDK"
    USE_ANDROID_EMULATOR=true
fi

# Build Vega TV app (optional, for future compatibility)
echo "📦 Building Vega TV app (for future compatibility)..."
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
    echo "💡 You can test the web app with the API server directly"
    TV_PID=""
fi

# Start web app
echo "🌐 Starting web app..."
cd apps/family-screen-mobile/web
npm run dev &
WEB_PID=$!
cd ../../..

# Wait a moment for web app to start
sleep 3

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
echo "   • Web App: http://localhost:5173"
echo ""
echo "🎯 Development Mode:"
if [ ! -z "$VEGA_PID" ]; then
    echo "   • Vega TV app is running on virtual device"
    echo "   • TV pairing is available in this mode"
else
    echo "   • Vega TV app is built but not running"
    echo "   • TV pairing is not available in this mode"
fi
echo "   • Web app is running and can connect to the API server"
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
    kepler virtual-device stop > /dev/null 2>&1 || true
    echo "✅ Virtual device stopped"
    
    if [ ! -z "$WEB_PID" ]; then
        kill $WEB_PID 2>/dev/null || true
        echo "✅ Web app stopped"
    fi
    
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

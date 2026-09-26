#!/bin/bash

# Fire TV Discovery Demo - Start TV App Only
# This script starts the TV app with Vega virtual device

set -e

echo "🚀 Fire TV Discovery Demo - Starting TV App Only"
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

# Get local IP for mobile app configuration
LOCAL_IP=$(get_local_ip)
echo "🌐 Local IP address: $LOCAL_IP"

# Try to start TV device
echo "📺 Attempting to start TV device..."
TV_DEVICE_PID=""

# Add Vega to PATH
export PATH=/Users/adarsh/vega/bin:$PATH

# Check if vega command is available
if command -v vega &> /dev/null; then
    echo "🔧 Vega command found, attempting to start virtual device..."
    
    # Clean up any stale instances first
    vega virtual-device stop > /dev/null 2>&1 || true
    rm -rf /Users/adarsh/vega/vvd/instances/* > /dev/null 2>&1 || true
    
    # Try to start the virtual device in foreground to see errors
    echo "⏳ Starting virtual device (this may take 1-2 minutes)..."
    vega virtual-device start > /tmp/vega-start.log 2>&1 &
    VEGA_START_PID=$!
    
    # Wait for virtual device to start
    for i in {1..90}; do
        if vega device list 2>/dev/null | grep -q "vega"; then
            echo "✅ Vega virtual device started successfully"
            TV_DEVICE_PID="vega"
            break
        fi
        # Check if the process is still running
        if ! kill -0 $VEGA_START_PID 2>/dev/null; then
            echo "⚠️  Vega virtual device process died"
            break
        fi
        sleep 1
    done
    
    # Check if virtual device started successfully
    if [ -z "$TV_DEVICE_PID" ]; then
        echo "⚠️  Vega virtual device failed to start within timeout"
        echo "💡 Check logs at /tmp/vega-start.log for details"
        echo "💡 Check Vega device logs at: /Users/adarsh/vega/vvd/virtual_device.log"
        kill $VEGA_START_PID > /dev/null 2>&1 || true
        # Kill any remaining Vega processes
        pkill -f "vega" > /dev/null 2>&1 || true
        echo "💡 Vega virtual device has compatibility issues with your macOS version (26.3)"
        echo "� The Vega SDK requires macOS 12-15 for full compatibility"
        echo "❌ TV app cannot run without Vega virtual device"
        echo "💡 For now, please use the web app: pnpm run web"
        exit 1
    fi
else
    echo "❌ Vega command not found"
    echo "� To use Vega virtual device, install the Vega SDK"
    echo "❌ TV app cannot run without Vega virtual device"
    echo "💡 For now, please use the web app: pnpm run web"
    exit 1
fi

# Build TV app
echo "📦 Building TV app..."
if [ "$TV_DEVICE_PID" = "vega" ]; then
    # Build Vega TV app
    cd vega-app
    pnpm run build:debug
    cd ..
    
    # Launch Vega TV app if device is running
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
fi

echo ""
echo "🎉 TV App environment started successfully!"
echo ""
echo "📋 Running Services:"
echo "   • API Server: http://localhost:8080"
if [ "$TV_DEVICE_PID" = "vega" ]; then
    echo "   • Vega TV App: Running on Vega virtual device"
fi
echo ""
echo "🎯 TV Mode:"
if [ "$TV_DEVICE_PID" = "vega" ]; then
    echo "   • Vega TV app is running on virtual device"
    echo "   • TV pairing is available in this mode"
fi
echo ""
echo "🛑 To stop all apps, press Ctrl+C or run: pnpm run stop:tv"
echo ""

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Stopping TV app..."
    
    if [ ! -z "$TV_PID" ]; then
        kill $TV_PID 2>/dev/null || true
        echo "✅ Vega TV app stopped"
    fi
    
    # Stop TV device based on type
    if [ "$TV_DEVICE_PID" = "vega" ]; then
        # Stop Vega virtual device
        if command -v vega &> /dev/null; then
            vega virtual-device stop > /dev/null 2>&1 || true
            sleep 2
            # Force kill any remaining Vega processes
            pkill -f "vega" > /dev/null 2>&1 || true
            echo "✅ Vega virtual device stopped"
        else
            echo "⚠️  Vega command not found"
        fi
    fi
    
    if [ ! -z "$API_PID" ]; then
        kill $API_PID 2>/dev/null || true
        echo "✅ API server stopped"
    fi
    
    echo "👋 TV app stopped"
    exit 0
}

# Trap Ctrl+C
trap cleanup SIGINT SIGTERM

# Keep script running
echo "Press Ctrl+C to stop the TV app..."
wait

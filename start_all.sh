#!/bin/bash

# Fire TV Discovery Demo - Start All Apps
# This script starts the TV app, mobile app, and API server

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

# Get local IP for mobile app configuration
LOCAL_IP=$(get_local_ip)
echo "🌐 Local IP address: $LOCAL_IP"

# Update mobile app API URL
echo "📝 Updating mobile app API URL..."
sed -i.bak "s|const API_BASE_URL = 'http://.*:8080'|const API_BASE_URL = 'http://$LOCAL_IP:8080'|g" apps/family-screen-mobile/App.tsx
rm -f apps/family-screen-mobile/App.tsx.bak

# Start Vega virtual device
echo "📺 Starting Vega virtual device..."
export AT_SERVER_DISABLED=true
kepler virtual-device start > /dev/null 2>&1 &
VEGA_PID=$!

# Wait for virtual device to be ready
echo "⏳ Waiting for virtual device to start..."
sleep 10

# Start port forwarding for Vega device
echo "🔗 Setting up port forwarding..."
if ! vega device start-port-forwarding --port 8080 --forward false > /dev/null 2>&1; then
    echo "⚠️  Port forwarding setup failed, but continuing..."
fi

# Build and run Vega TV app
echo "📦 Building Vega TV app..."
cd vega-app
pnpm run build > /dev/null 2>&1

echo "🚀 Installing and running Vega TV app..."
export AT_SERVER_DISABLED=true
vega run-app build/private/kepler/@amazon-devices/familyscreenvega/undefined/vega/aarch64/Release/@amazon-devices/familyscreenvega_aarch64.vpkg > /dev/null 2>&1 &
TV_PID=$!
cd ..

echo "✅ Vega TV app started"

# Check if Android device is connected
echo "📱 Checking for Android devices..."
if adb devices | grep -v "List of devices" | grep -q "device"; then
    echo "✅ Android device found"
    
    # Build and run mobile app
    echo "📦 Building mobile app..."
    cd apps/family-screen-mobile
    pnpm run android > /dev/null 2>&1 &
    MOBILE_PID=$!
    cd ..
    
    echo "✅ Mobile app started"
else
    echo "⚠️  No Android device found"
    echo "💡 To start the mobile app manually:"
    echo "   cd apps/family-screen-mobile"
    echo "   pnpm run android"
fi

echo ""
echo "🎉 All apps started successfully!"
echo ""
echo "📋 Running Services:"
echo "   • API Server: http://localhost:8080"
echo "   • Vega TV App: Running on virtual device"
echo "   • Mobile App: Running on Android device (if connected)"
echo ""
echo "🔗 To pair the apps:"
echo "   1. Note the 6-digit code on the TV"
echo "   2. Enter it in the mobile app"
echo "   3. Click 'Pair TV'"
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
    
    if [ ! -z "$MOBILE_PID" ]; then
        kill $MOBILE_PID 2>/dev/null || true
        echo "✅ Mobile app stopped"
    fi
    
    if [ ! -z "$API_PID" ]; then
        kill $API_PID 2>/dev/null || true
        echo "✅ API server stopped"
    fi
    
    # Stop virtual device
    kepler virtual-device stop > /dev/null 2>&1 || true
    echo "✅ Virtual device stopped"
    
    echo "👋 All apps stopped"
    exit 0
}

# Trap Ctrl+C
trap cleanup SIGINT SIGTERM

# Keep script running
echo "Press Ctrl+C to stop all apps..."
wait

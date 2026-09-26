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

# Function to get Android SDK path
get_android_sdk_path() {
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        echo "$HOME/Library/Android/sdk"
    else
        # Linux
        echo "$HOME/Android/Sdk"
    fi
}

# Function to create local.properties if it doesn't exist
ensure_local_properties() {
    local android_dir="apps/family-screen-mobile/android"
    local local_props="$android_dir/local.properties"
    
    if [ ! -f "$local_props" ]; then
        echo "📝 Creating local.properties..."
        local sdk_path=$(get_android_sdk_path)
        
        if [ -d "$sdk_path" ]; then
            echo "sdk.dir=$sdk_path" > "$local_props"
            echo "✅ Created local.properties with SDK path: $sdk_path"
        else
            echo "⚠️  Android SDK not found at $sdk_path"
            echo "💡 Please set ANDROID_HOME environment variable or install Android SDK"
            return 1
        fi
    else
        echo "✅ local.properties already exists"
    fi
    
    return 0
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

# Try to start TV device (fallback to Android TV emulator)
echo "📺 Attempting to start TV device..."
TV_DEVICE_PID=""

# Check if vega command is available
if command -v vega &> /dev/null; then
    echo "🔧 Vega command found, attempting to start virtual device..."
    
    # Clean up any stale instances first
    vega virtual-device stop > /dev/null 2>&1 || true
    rm -rf /Users/adarsh/vega/sdk/vega-sdk/main/0.24.12112/vvd/instances/* > /dev/null 2>&1 || true
    
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
        echo "💡 Check Vega device logs at: /Users/adarsh/vega/sdk/vega-sdk/main/0.24.12112/vvd/virtual_device.log"
        kill $VEGA_START_PID > /dev/null 2>&1 || true
        # Kill any remaining Vega processes
        pkill -f "vega" > /dev/null 2>&1 || true
        echo "💡 Vega virtual device has compatibility issues with your macOS version (26.3)"
        echo "� The Vega SDK requires macOS 12-15 for full compatibility"
        echo "❌ TV app cannot run without Vega virtual device"
        echo "💡 For now, please use the phone app: pnpm run phone"
        exit 1
    fi
else
    echo "❌ Vega command not found"
    echo "� To use Vega virtual device, install the Vega SDK"
    echo "❌ TV app cannot run without Vega virtual device"
    echo "💡 For now, please use the phone app: pnpm run phone"
    exit 1
fi

# If Vega failed, try Android TV emulator
if [ -z "$TV_DEVICE_PID" ]; then
    echo "📺 Starting Android TV emulator instead..."
    
    # Set up Android environment
    export ANDROID_HOME=$(get_android_sdk_path)
    export PATH=$PATH:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator
    echo "📋 Android SDK path: $ANDROID_HOME"
    
    # Check for TV emulators
    if command -v emulator &> /dev/null; then
        TV_EMULATORS=$(emulator -list-avds | grep -i television)
        
        if [ -n "$TV_EMULATORS" ]; then
            TV_EMULATOR=$(echo "$TV_EMULATORS" | head -n 1)
            echo "� Selected TV emulator: $TV_EMULATOR"
            
            # Start TV emulator
            emulator -avd "$TV_EMULATOR" -no-snapshot-load &
            TV_DEVICE_PID=$!
            
            # Wait for TV emulator to boot
            echo "⏳ Waiting for TV emulator to boot (this may take 2-3 minutes)..."
            for i in {1..180}; do
                if adb devices | grep -v "List of devices" | grep -q "device"; then
                    echo "✅ TV emulator is ready"
                    break
                fi
                # Check if emulator process is still running
                if ! kill -0 $TV_DEVICE_PID 2>/dev/null; then
                    echo "❌ TV emulator process died during startup"
                    exit 1
                fi
                sleep 1
            done
        else
            echo "❌ No TV emulators found"
            echo "💡 Please create a TV emulator in Android Studio (e.g., Television_4K)"
            exit 1
        fi
    else
        echo "❌ Android emulator command not found"
        exit 1
    fi
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
else
    echo "📦 Using Android TV emulator - Vega app build skipped"
    echo "💡 The Vega TV app is built but cannot run on Android TV emulator"
    echo "💡 TV app requires Vega virtual device for proper testing"
    TV_PID=""
fi

echo ""
echo "🎉 TV App environment started successfully!"
echo ""
echo "📋 Running Services:"
echo "   • API Server: http://localhost:8080"
if [ "$TV_DEVICE_PID" = "vega" ]; then
    echo "   • Vega TV App: Running on Vega virtual device"
else
    echo "   • TV Device: Running on Android TV emulator"
fi
echo ""
echo "🎯 TV Mode:"
if [ "$TV_DEVICE_PID" = "vega" ]; then
    echo "   • Vega TV app is running on virtual device"
    echo "   • TV pairing is available in this mode"
else
    echo "   • Android TV emulator is running"
    echo "   • Vega TV app cannot run on Android TV emulator"
    echo "   • Use Vega virtual device for full TV app testing"
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
    else
        # Stop Android TV emulator
        if command -v adb &> /dev/null; then
            adb emu kill > /dev/null 2>&1 || true
            sleep 2
            pkill -f "emulator" > /dev/null 2>&1 || true
            echo "✅ Android TV emulator stopped"
        else
            echo "⚠️  ADB command not found"
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
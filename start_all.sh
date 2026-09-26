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

# Function to start Android emulator
start_android_emulator() {
    echo "📱 Checking for Android devices..."
    
    # First check if any device is already connected
    if adb devices | grep -v "List of devices" | grep -q "device"; then
        echo "✅ Android device found"
        return 0
    fi
    
    # No device found, try to start an emulator
    echo "⚠️  No Android device found, attempting to start emulator..."
    
    # Set ANDROID_HOME if not set
    if [ -z "$ANDROID_HOME" ]; then
        export ANDROID_HOME=$(get_android_sdk_path)
        export PATH=$PATH:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator
        echo "📋 Set ANDROID_HOME to: $ANDROID_HOME"
    fi
    
    # Check if emulator command exists
    if ! command -v emulator &> /dev/null; then
        # Try direct path if not in PATH
        if [ -f "$ANDROID_HOME/emulator/emulator" ]; then
            export PATH=$PATH:$ANDROID_HOME/emulator
            echo "📋 Added emulator to PATH"
        else
            echo "❌ Android emulator command not found at $ANDROID_HOME/emulator/emulator"
            echo "💡 Please install Android SDK or set ANDROID_HOME correctly"
            return 1
        fi
    fi
    
    # List available emulators
    echo "📋 Available Android emulators:"
    "$ANDROID_HOME/emulator/emulator" -list-avds
    
    # Try to start the first available emulator
    FIRST_EMULATOR=$("$ANDROID_HOME/emulator/emulator" -list-avds | head -n 1)
    
    if [ -z "$FIRST_EMULATOR" ]; then
        echo "❌ No Android emulators found. Please create one in Android Studio."
        return 1
    fi
    
    echo "🚀 Starting emulator: $FIRST_EMULATOR"
    # Use the full path to emulator to avoid PATH issues
    "$ANDROID_HOME/emulator/emulator" -avd "$FIRST_EMULATOR" -no-snapshot-load > /dev/null 2>&1 &
    EMULATOR_PID=$!
    
    # Wait for emulator to boot
    echo "⏳ Waiting for emulator to boot (this may take 1-2 minutes)..."
    for i in {1..120}; do
        if adb devices | grep -v "List of devices" | grep -q "device"; then
            echo "✅ Emulator is ready"
            return 0
        fi
        sleep 1
    done
    
    echo "❌ Emulator failed to start within timeout"
    return 1
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

# Update mobile app API URL
echo "📝 Updating mobile app API URL..."
sed -i.bak "s|const API_BASE_URL = 'http://.*:8080'|const API_BASE_URL = 'http://$LOCAL_IP:8080'|g" apps/family-screen-mobile/App.tsx
rm -f apps/family-screen-mobile/App.tsx.bak

# Skip Vega virtual device due to compatibility issues
echo "📺 Skipping Vega virtual device (incompatible with this macOS system)"
echo "💡 The Vega SDK virtual device has fundamental compatibility issues on macOS."
echo "💡 Focusing on mobile app development with API server integration."
VEGA_PID=""
USE_ANDROID_EMULATOR=true

# Skip port forwarding since Vega device is not available
echo "🔗 Skipping port forwarding (Vega device not available)"

# Build Vega TV app (optional, for future compatibility)
echo "📦 Building Vega TV app (for future compatibility)..."
cd vega-app
pnpm run build:debug
cd ..

echo "⚠️  Skipping Vega TV app launch (virtual device incompatible with this macOS system)"
echo "💡 Vega TV app built successfully for future deployment"
echo "💡 You can test the mobile app with the API server directly"
TV_PID=""
MOBILE_PID=""

# Set up Android environment before starting emulator
export ANDROID_HOME=$(get_android_sdk_path)
export PATH=$PATH:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator
echo "📋 Android SDK path: $ANDROID_HOME"

# Start Android device/emulator
if start_android_emulator; then
    # Ensure local.properties exists
    if ensure_local_properties; then
        # Get the first available device
        FIRST_DEVICE=$(adb devices | grep -v "List of devices" | grep "device" | head -n 1 | awk '{print $1}')
        
        if [ -z "$FIRST_DEVICE" ]; then
            echo "❌ No Android device available"
            return 1
        fi
        
        echo "📱 Using device: $FIRST_DEVICE"
        echo "📦 Mobile app setup complete"
        echo "⚠️  Mobile app build skipped due to React Native configuration issues"
        echo "💡 To build and run the mobile app manually:"
        echo "   cd apps/family-screen-mobile"
        echo "   pnpm run android:build"
        echo "   pnpm run android:install"
        echo "   Or open in Android Studio and run the app"
    else
        echo "❌ Failed to setup Android environment"
    fi
else
    echo "⚠️  No Android device available - mobile app not started"
    echo "💡 To start the mobile app manually:"
    echo "   cd apps/family-screen-mobile"
    echo "   pnpm run android"
fi

echo ""
echo "🎉 Development environment started successfully!"
echo ""
echo "📋 Running Services:"
echo "   • API Server: http://localhost:8080"
echo "   • Vega TV App: Built and ready (virtual device unavailable on this macOS)"
echo "   • Mobile App: Available for manual build and installation"
echo ""
echo "🎯 Development Mode:"
echo "   • Vega TV app is built but cannot run due to macOS compatibility issues"
echo "   • Mobile app requires manual build due to React Native configuration issues"
echo "   • The mobile app can connect directly to the API server"
echo "   • TV pairing is not available in this mode"
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
    
    if [ ! -z "$MOBILE_PID" ]; then
        kill $MOBILE_PID 2>/dev/null || true
        echo "✅ Mobile app stopped"
    fi
    
    if [ ! -z "$API_PID" ]; then
        kill $API_PID 2>/dev/null || true
        echo "✅ API server stopped"
    fi
    
    if [ ! -z "$EMULATOR_PID" ]; then
        kill $EMULATOR_PID 2>/dev/null || true
        echo "✅ Android emulator stopped"
    else
        # Also try to stop any running emulators gracefully
        adb emu kill > /dev/null 2>&1 || true
    fi
    
    echo "👋 All apps stopped"
    exit 0
}

# Trap Ctrl+C
trap cleanup SIGINT SIGTERM

# Keep script running
echo "Press Ctrl+C to stop all apps..."
wait

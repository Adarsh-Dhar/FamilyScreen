#!/bin/bash

# Fire TV Discovery Demo - Stop Phone App Only
# This script stops the mobile app and Android emulator

echo "🛑 Fire TV Discovery Demo - Stopping Phone App Only"
echo "=============================================="
echo ""

# Stop mobile app processes
echo "📱 Stopping mobile app processes..."
pkill -f "react-native" > /dev/null 2>&1 && echo "✅ Mobile app stopped" || echo "⚠️  No mobile app processes running"

# Stop mobile app on Android device
echo "📱 Stopping mobile app on Android device..."
if command -v adb &> /dev/null; then
    adb shell am force-stop com.familyscreen.mobile > /dev/null 2>&1 && echo "✅ Mobile app stopped on device" || echo "⚠️  Could not stop mobile app on device"
else
    echo "⚠️  ADB command not found"
fi

# Stop Gradle processes
echo "🔨 Stopping Gradle processes..."
pkill -f "gradle" > /dev/null 2>&1 && echo "✅ Gradle processes stopped" || echo "⚠️  No Gradle processes running"

# Stop Metro bundler
echo "⛛️  Stopping Metro bundler..."
pkill -f "metro" > /dev/null 2>&1 && echo "✅ Metro bundler stopped" || echo "⚠️  Metro bundler was not running"

# Stop Android emulator
echo "📱 Stopping Android emulator..."
if command -v adb &> /dev/null; then
    # Try graceful shutdown first
    adb emu kill > /dev/null 2>&1 || true
    sleep 2
    # Force kill if still running
    pkill -f "emulator" > /dev/null 2>&1 || true
    echo "✅ Android emulator stopped"
else
    echo "⚠️  ADB command not found"
fi

# Stop API server if it's running
echo "📡 Stopping API server..."
if lsof -Pi :8080 -sTCP:LISTEN -t >/dev/null 2>&1; then
    pkill -f "node.*api-server" > /dev/null 2>&1
    echo "✅ API server stopped"
else
    echo "⚠️  API server was not running"
fi

echo ""
echo "🎉 Phone app stopped successfully!"
echo ""
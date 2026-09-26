#!/bin/bash

# Fire TV Discovery Demo - Stop All Apps
# This script stops the TV app, mobile app, API server, and virtual device

echo "🛑 Fire TV Discovery Demo - Stopping All Apps"
echo "=============================================="
echo ""

# Stop Vega virtual device
echo "📺 Stopping Vega virtual device..."
kepler virtual-device stop > /dev/null 2>&1 && echo "✅ Virtual device stopped" || echo "⚠️  Virtual device was not running"

# Kill processes on port 8080 (API server)
echo "📡 Stopping API server..."
lsof -ti:8080 | xargs kill -9 2>/dev/null && echo "✅ API server stopped" || echo "⚠️  API server was not running"

# Kill Android build processes
echo "📱 Stopping mobile app processes..."
pkill -f "react-native run-android" 2>/dev/null && echo "✅ Mobile app processes stopped" || echo "⚠️  No mobile app processes running"

# Kill gradle processes
echo "🔨 Stopping Gradle processes..."
pkill -f gradle 2>/dev/null && echo "✅ Gradle processes stopped" || echo "⚠️  No Gradle processes running"

# Kill node processes related to metro
echo "⚛️  Stopping Metro bundler..."
pkill -f "react-native start" 2>/dev/null && echo "✅ Metro bundler stopped" || echo "⚠️  Metro bundler was not running"

# Clean up Vega virtual device instances
echo "🧹 Cleaning up Vega virtual device instances..."
rm -rf /Users/adarsh/vega/sdk/vega-sdk/main/0.24.12112/vvd/instances/* 2>/dev/null && echo "✅ Vega instances cleaned up" || echo "⚠️  No Vega instances to clean"

echo ""
echo "🎉 All apps stopped successfully!"
echo ""

#!/bin/bash

# Fire TV Discovery Demo - Stop TV App Only
# This script stops the TV app and Vega virtual device

echo "🛑 Fire TV Discovery Demo - Stopping TV App Only"
echo "=============================================="
echo ""

# Stop Vega virtual device
echo "📺 Stopping Vega virtual device..."
if command -v vega &> /dev/null; then
    vega virtual-device stop > /dev/null 2>&1 || echo "⚠️  Virtual device was not running"
    echo "✅ Virtual device stopped"
else
    echo "⚠️  Vega command not found"
fi

# Stop TV app processes
echo "📺 Stopping TV app processes..."
pkill -f "vega run-app" > /dev/null 2>&1 && echo "✅ TV app stopped" || echo "⚠️  No TV app processes running"

# Stop API server if it's running
echo "📡 Stopping API server..."
if lsof -Pi :8080 -sTCP:LISTEN -t >/dev/null 2>&1; then
    pkill -f "node.*api-server" > /dev/null 2>&1
    echo "✅ API server stopped"
else
    echo "⚠️  API server was not running"
fi

echo ""
echo "🎉 TV app stopped successfully!"
echo ""
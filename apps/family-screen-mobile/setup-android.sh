#!/bin/bash

# Family Screen Mobile App - Android Setup Script
# This script helps set up the Android development environment

echo "🔧 Family Screen Mobile App - Android Setup"
echo "=========================================="
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js (>= 18) first."
    exit 1
fi

echo "✅ Node.js version: $(node --version)"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed."
    exit 1
fi

echo "✅ npm version: $(npm --version)"

# Check if Android SDK is installed
if [ -z "$ANDROID_HOME" ]; then
    echo "⚠️  ANDROID_HOME is not set."
    echo "Please install Android Studio and set up your Android SDK."
    echo ""
    echo "After installing Android Studio, add this to your ~/.zshrc or ~/.bash_profile:"
    echo 'export ANDROID_HOME=$HOME/Library/Android/sdk'
    echo 'export PATH=$PATH:$ANDROID_HOME/emulator'
    echo 'export PATH=$PATH:$ANDROID_HOME/platform-tools'
    echo 'export PATH=$PATH:$ANDROID_HOME/tools'
    echo 'export PATH=$PATH:$ANDROID_HOME/tools/bin'
    echo ""
    echo "Then restart your terminal and run this script again."
    exit 1
fi

echo "✅ ANDROID_HOME: $ANDROID_HOME"

# Check if adb is available
if ! command -v adb &> /dev/null; then
    echo "⚠️  adb not found in PATH. Adding platform-tools to PATH..."
    export PATH=$PATH:$ANDROID_HOME/platform-tools
fi

echo "✅ adb version: $(adb version | head -n 1)"

# Check for connected devices
echo ""
echo "📱 Checking for connected Android devices..."
DEVICES=$(adb devices | grep -v "List of devices" | grep -v "^$")
if [ -z "$DEVICES" ]; then
    echo "⚠️  No Android devices found."
    echo ""
    echo "To connect your phone:"
    echo "1. Enable USB Debugging on your Android phone"
    echo "2. Connect via USB cable"
    echo "3. Accept the debugging prompt on your phone"
    echo ""
    echo "Or start an Android emulator from Android Studio."
    echo ""
    echo "After connecting, run 'adb devices' to verify."
else
    echo "✅ Found connected devices:"
    echo "$DEVICES"
fi

echo ""
echo "🎯 Next Steps:"
echo "1. Update API_BASE_URL in App.tsx with your computer's IP address"
echo "2. Make sure the API server is running on port 8080"
echo "3. Run: npm run android"
echo ""
echo "📖 For detailed instructions, see README.md"

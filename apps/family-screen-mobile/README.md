# Family Screen Mobile App

This is the mobile phone companion app for the Family Screen TV app. It allows parents to pair their phone with the TV and manage child profiles.

## Prerequisites

- Node.js (>= 18)
- Android Studio with Android SDK
- A physical Android device or Android emulator
- Java Development Kit (JDK) 17 or higher

## Setup Instructions

### 1. Install Dependencies

```bash
cd apps/family-screen-mobile
npm install
```

### 2. Configure API URL

Update the `API_BASE_URL` in `App.tsx` to point to your backend API server:

```typescript
const API_BASE_URL = 'http://YOUR_API_SERVER_IP:8080';
```

For local development, use your computer's local network IP (e.g., `http://192.168.0.101:8080`).

### 3. Set Up Android Development Environment

#### Install Android Studio
1. Download and install [Android Studio](https://developer.android.com/studio)
2. Open Android Studio and go to SDK Manager
3. Install:
   - Android SDK Platform-Tools
   - Android SDK Build-Tools
   - Android 14 (API level 34) or higher
   - Android Emulator (if you want to use an emulator)

#### Configure Environment Variables
Add these to your `~/.bash_profile` or `~/.zshrc`:

```bash
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/tools
export PATH=$PATH:$ANDROID_HOME/tools/bin
```

### 4. Enable USB Debugging on Your Phone

1. Go to Settings > About Phone
2. Tap "Build Number" 7 times to enable Developer Options
3. Go to Settings > Developer Options
4. Enable "USB Debugging"
5. Connect your phone via USB
6. Accept the debugging prompt on your phone

### 5. Run the App

#### On Physical Device:
```bash
npm run android
```

#### On Android Emulator:
1. Open Android Studio
2. Start an emulator (Tools > Device Manager > Create Device)
3. Run:
```bash
npm run android
```

## App Features

- **TV Pairing**: Enter the 6-digit pairing code displayed on your TV
- **Profile Management**: View and manage child profiles
- **Network Configuration**: Works with your local API server

## Troubleshooting

### Device Not Detected
```bash
adb devices
```
If no devices are listed, check USB debugging is enabled and try a different USB cable.

### Metro Server Issues
Clear Metro cache:
```bash
npm start -- --reset-cache
```

### Build Errors
Clean build:
```bash
cd android
./gradlew clean
cd ..
npm run android
```

## Network Configuration

The mobile app needs to communicate with your backend API server. Make sure:

1. Your phone and computer are on the same network
2. Your computer's firewall allows connections on port 8080
3. The API server is running (from `artifacts/api-server`)

## Testing the Pairing Flow

1. Start the TV app on your Vega virtual device
2. Note the 6-digit pairing code displayed
3. Start the mobile app on your phone
4. Enter the pairing code in the mobile app
5. Click "Pair TV"
6. The TV should confirm the pairing and show the browse screen

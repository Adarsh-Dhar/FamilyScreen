# Family Screen Mobile App - Project Summary

## What Was Created

A completely separate React Native mobile phone app for pairing with the TV app. This is distinct from the Vega TV app and designed to run on Android phones.

## Project Structure

```
apps/family-screen-mobile/
├── App.tsx                          # Main mobile app component
├── index.js                         # React Native entry point
├── app.json                         # App configuration
├── package.json                     # Dependencies
├── tsconfig.json                    # TypeScript configuration
├── metro.config.js                 # Metro bundler configuration
├── android/                         # Android native code
│   ├── app/
│   │   ├── build.gradle            # App build configuration
│   │   └── src/main/
│   │       ├── AndroidManifest.xml
│   │       ├── java/com/familyscreen/mobile/
│   │       │   ├── MainActivity.java
│   │       │   └── MainApplication.java
│   │       └── res/
│   │           └── values/
│   │               ├── strings.xml
│   │               └── styles.xml
│   ├── build.gradle                # Project build configuration
│   ├── settings.gradle              # Gradle settings
│   └── gradle.properties           # Gradle properties
├── README.md                        # Detailed setup instructions
├── QUICKSTART.md                   # Quick start guide
└── setup-android.sh                 # Android environment setup script
```

## Key Features

### Mobile App Functionality
- **TV Pairing**: Enter 6-digit pairing code from TV
- **Profile Management**: View child profiles after pairing
- **Network Communication**: Connects to the same backend API as the TV app
- **User-Friendly UI**: Clean interface designed for mobile screens

### Technical Details
- **Framework**: React Native 0.76.1
- **Language**: TypeScript
- **Platform**: Android (with iOS-ready structure)
- **Network**: HTTP API calls to backend server
- **State Management**: React hooks (useState)

## Differences from Vega TV App

| Aspect | Vega TV App | Mobile Phone App |
|--------|-------------|------------------|
| **Platform** | Vega/Fire TV virtual device | Android phones |
| **Framework** | React Native + Vega SDK | React Native standard |
| **Build System** | Vega .vpkg packages | Android APK |
| **UI Design** | TV-optimized (large text, remote control) | Mobile-optimized (touch interface) |
| **Purpose** | Display pairing code, browse content | Enter pairing code, manage profiles |
| **Network** | Uses Vega-specific network (10.0.2.2) | Uses standard network (192.168.x.x) |
| **Deployment** | Vega virtual device | Physical phone or emulator |

## Setup Instructions

### Prerequisites
1. Node.js (>= 18)
2. Android Studio with Android SDK
3. Physical Android device or Android emulator
4. Java Development Kit (JDK) 17+

### Quick Setup
```bash
cd apps/family-screen-mobile
npm install
./setup-android.sh
```

### Configuration
Update `API_BASE_URL` in `App.tsx` to your computer's IP:
```typescript
const API_BASE_URL = 'http://192.168.0.101:8080'; // Change this
```

### Running the App
```bash
npm run android
```

## Pairing Flow

1. **Start TV App**: Run the Vega TV app on virtual device
2. **Get Code**: Note the 6-digit pairing code displayed on TV
3. **Start Mobile App**: Run this app on your Android phone
4. **Enter Code**: Type the TV code in the mobile app
5. **Pair**: Click "Pair TV" button
6. **Confirmation**: TV app confirms pairing and shows browse screen
7. **Profiles**: Mobile app can now manage child profiles

## Network Requirements

- **Same Network**: Phone and computer must be on same WiFi network
- **API Server**: Backend must be running on port 8080
- **Firewall**: Computer firewall must allow port 8080 connections
- **IP Address**: Use computer's local network IP (not localhost)

## Troubleshooting

### Device Not Detected
```bash
adb devices
```
Enable USB debugging on phone and check USB connection.

### Network Connection Failed
- Verify phone and computer are on same network
- Check API server is running: `lsof -i :8080`
- Test connection from phone browser to `http://YOUR_IP:8080`

### Build Errors
```bash
cd android
./gradlew clean
cd ..
npm run android
```

## Files Created

1. **App.tsx** - Main mobile app with pairing logic
2. **Android Project** - Complete Android native setup
3. **Configuration Files** - TypeScript, Metro, Gradle configs
4. **Documentation** - README, QUICKSTART, setup script
5. **Package.json** - Dependencies and scripts

## Next Steps

1. Install Android Studio if not already installed
2. Set up Android SDK and environment variables
3. Enable USB debugging on your Android phone
4. Update API_BASE_URL in App.tsx
5. Run `npm run android` to build and install
6. Test the pairing flow with the TV app

## Support

For detailed setup instructions, see:
- `README.md` - Complete setup guide
- `QUICKSTART.md` - Fast track instructions
- `setup-android.sh` - Automated environment check

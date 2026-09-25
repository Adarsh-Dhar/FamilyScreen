# Fire TV Discovery Demo - Project Structure

## Current App Structure

The project now contains exactly two apps:

### 1. Vega TV App (`vega-app/`)
- **Purpose**: Fire TV app for virtual device deployment
- **Framework**: React Native + Vega SDK
- **Build**: Vega .vpkg packages
- **Features**: Pairing screen, browse screen, profile selection, search
- **Network**: Uses Vega-specific network (10.0.2.2:8080)

### 2. Mobile Phone App (`apps/family-screen-mobile/`)
- **Purpose**: Android phone app for TV pairing and profile management
- **Framework**: React Native standard
- **Build**: Android APK
- **Features**: TV pairing code entry, profile management
- **Network**: Uses standard network (192.168.x.x:8080)

## Backend API Server

Located in `artifacts/api-server/`
- Runs on port 8080
- Provides pairing, profile, and search endpoints
- Shared by both TV and mobile apps

## Removed Duplicate Projects

The following duplicate projects have been removed:
- ❌ `apps/family-screen-tv/` - Superseded by `vega-app/`
- ❌ `apps/family-screen-parent/` - Superseded by `apps/family-screen-mobile/`
- ❌ `run_android_apps.sh` - Old script, no longer needed

## Complete Directory Structure

```
Fire-TV-Discovery-Demo/
├── vega-app/                          # Vega TV app (for Fire TV virtual device)
│   ├── src/
│   │   ├── App.tsx                   # Main TV app state machine
│   │   ├── screens/                  # TV screens (PairScreen, BrowseScreen, etc.)
│   │   ├── api.ts                    # API integration
│   │   ├── config.ts                 # Network configuration
│   │   ├── storage.ts                # AsyncStorage utilities
│   │   ├── theme.ts                  # Theme colors
│   │   └── types.ts                  # TypeScript types
│   ├── build/                        # Vega build outputs
│   ├── manifest.toml                 # Vega package manifest
│   └── package.json                  # Dependencies
│
├── apps/
│   └── family-screen-mobile/         # Mobile phone app (for Android phones)
│       ├── App.tsx                   # Mobile pairing UI
│       ├── android/                  # Android native code
│       │   ├── app/
│       │   │   ├── build.gradle
│       │   │   └── src/main/
│       │   │       ├── AndroidManifest.xml
│       │   │       └── java/com/familyscreen/mobile/
│       │   │           ├── MainActivity.java
│       │   │           └── MainApplication.java
│       │   ├── build.gradle
│       │   └── settings.gradle
│       ├── README.md                 # Setup instructions
│       ├── QUICKSTART.md            # Quick start guide
│       ├── PROJECT_SUMMARY.md       # Project overview
│       └── setup-android.sh         # Android setup script
│
├── artifacts/
│   └── api-server/                   # Backend API server
│       ├── src/
│       │   ├── app.ts
│       │   ├── index.ts
│       │   └── routes/
│       │       ├── family.ts
│       │       └── health.ts
│       └── dist/                     # Compiled server
│
├── lib/                              # Shared libraries
├── scripts/                          # Utility scripts
├── node_modules/                     # Root dependencies
├── package.json                      # Root package config
└── pnpm-workspace.yaml              # PNPM workspace config
```

## How the Apps Work Together

### Pairing Flow
1. **TV App** (`vega-app/`) starts and displays a 6-digit pairing code
2. **Mobile App** (`apps/family-screen-mobile/`) starts on user's phone
3. User enters the TV code in the mobile app
4. Mobile app sends confirmation to backend API
5. TV app polls API and receives confirmation
6. TV app transitions to browse screen
7. Mobile app can now manage child profiles

### Network Architecture
- **Backend API**: Runs on host machine (port 8080)
- **TV App**: Connects via Vega network (10.0.2.2:8080)
- **Mobile App**: Connects via local network (192.168.x.x:8080)
- **All three components**: Share the same backend API

## Development Commands

### TV App (Vega)
```bash
cd vega-app
npm run build                    # Build Vega packages
export AT_SERVER_DISABLED=true && kepler virtual-device start
vega run-app build/aarch64-release/familyscreenvega_aarch64.vpkg
```

### Mobile App (Android)
```bash
cd apps/family-screen-mobile
npm install                     # Install dependencies
./setup-android.sh              # Check Android setup
npm run android                 # Build and run on device
```

### Backend API
```bash
cd artifacts/api-server
npm start                       # Start API server on port 8080
```

## Summary

The project now has a clean structure with:
- ✅ **One TV app** for Vega virtual device deployment
- ✅ **One mobile app** for Android phone deployment
- ✅ **One backend API** serving both apps
- ✅ **No duplicate projects**
- ✅ **Clear separation of concerns**

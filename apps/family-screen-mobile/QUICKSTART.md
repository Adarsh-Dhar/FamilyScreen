# Quick Start Guide for Family Screen Mobile App

## Fast Track Setup

### 1. Install Dependencies
```bash
cd apps/family-screen-mobile
npm install
```

### 2. Find Your Computer's IP Address
```bash
# On macOS
ipconfig getifaddr en0

# On Linux
hostname -I

# On Windows
ipconfig
```
Use the IP address that looks like `192.168.x.x`

### 3. Update API URL in App.tsx
Open `App.tsx` and change line 15:
```typescript
const API_BASE_URL = 'http://YOUR_IP_ADDRESS:8080';
```

### 4. Make Sure API Server is Running
```bash
cd ../artifacts/api-server
npm start
```

### 5. Enable USB Debugging on Your Android Phone
1. Settings > About Phone > Tap "Build Number" 7 times
2. Settings > Developer Options > Enable "USB Debugging"
3. Connect phone via USB and accept debugging prompt

### 6. Run the App
```bash
cd apps/family-screen-mobile
npm run android
```

## Testing the Pairing

1. Start your Vega TV app (it should show a 6-digit code)
2. Start this mobile app on your phone
3. Enter the TV code in the mobile app
4. Click "Pair TV"
5. The TV should confirm and show the browse screen

## Need Help?

- Check that your phone and computer are on the same WiFi network
- Make sure the API server is running on port 8080
- Verify USB debugging is enabled on your phone
- Try `adb devices` to see if your phone is connected

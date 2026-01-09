# Building the Cow Connect Collector App (APK)

## Prerequisites
1. Install EAS CLI globally:
   ```bash
   npm install -g eas-cli
   ```

2. Login to your Expo account:
   ```bash
   eas login
   ```

## Building the APK

### Method 1: Build APK (Recommended for Testing)
This creates an APK file you can directly install on your phone.

```bash
cd collectors-mobile-app
eas build --platform android --profile preview
```

**What happens:**
- EAS will build your app in the cloud
- Takes about 10-20 minutes
- Downloads a `.apk` file when done
- You can install this APK directly on any Android phone

### Method 2: Build AAB (For Play Store)
If you want to publish to Google Play Store:

```bash
eas build --platform android --profile production
```

This creates an `.aab` (Android App Bundle) file for Play Store submission.

## Installing the APK on Your Phone

### Option A: Direct Download
1. After build completes, you'll get a download link
2. Open the link on your phone
3. Download the APK
4. Tap to install (you may need to allow "Install from Unknown Sources")

### Option B: Transfer via USB
1. Download the APK to your computer
2. Connect your phone via USB
3. Copy the APK to your phone
4. Use a file manager to find and install it

### Option C: Share via Link
1. The build page has a QR code
2. Scan it with your phone camera
3. Download and install

## Important Notes

### First Time Setup
- You'll be prompted to create an Android keystore
- Choose "Generate new keystore" when asked
- EAS will manage this for you

### Permissions
The app will request:
- ✅ Camera (for collection photos)
- ✅ Location (for GPS tracking)
- ✅ Internet (for syncing)

### Build Profiles Explained

**Preview** (APK):
- Quick to build
- Easy to share and test
- Can be installed without Play Store
- ✅ Use this for testing with collectors

**Production** (AAB):
- Optimized for Play Store
- Smaller download size
- Requires Play Store to distribute

## Checking Build Status

Visit: https://expo.dev/accounts/[your-account]/projects/collectors-mobile-app/builds

Or run:
```bash
eas build:list
```

## Troubleshooting

**"Google Play Services for AR required"**:
- This error only appears in Expo Go
- Building an APK fixes this
- The standalone app doesn't need Expo Go

**Build Failed**:
- Check your internet connection
- Ensure all dependencies are installed
- Run `npm install` before building

**Can't Install APK**:
- Enable "Install from Unknown Sources" in Android settings
- Settings → Security → Unknown Sources → Enable

## Quick Command Reference

```bash
# Install EAS CLI
npm install -g eas-cli

# Login
eas login

# Build APK for testing
eas build --platform android --profile preview

# Check build status
eas build:list

# Update app configuration
eas build:configure
```

## Next Steps

1. Run the build command
2. Wait for completion (~15-20 min)
3. Download the APK
4. Install on your phone
5. Test the app

The app will work exactly like a normal Android app - no Expo Go needed!

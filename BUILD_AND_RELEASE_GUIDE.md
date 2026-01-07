# How to Build and Release the Android App

This guide explains how to build the APK for the Cow Connect Collector App and publish it to your Web Portal.

## Prerequisites
- Node.js and npm (already installed)
- **EAS CLI** (`npm install -g eas-cli`)
- **Expo Account** (run `eas login`)
- **Android Studio** (for local builds) OR use Expo Cloud Build (free tier available).

## Step 1: Build the APK

### Option A: Cloud Build (Easiest, no Android Studio needed)
1. Open a terminal in `collectors-mobile-app`:
   ```bash
   cd collectors-mobile-app
   ```
2. Run the build command:
   ```bash
   eas build -p android --profile preview
   ```
3. Follow the prompts. It will upload your code to Expo and build it.
4. Once finished, it will give you a **Download URL** for the APK. Download it.

### Option B: Local Build (Faster if you have Android Studio)
1. Open a terminal in `collectors-mobile-app`:
   ```bash
   cd collectors-mobile-app
   ```
2. Run the build command:
   ```bash
   eas build -p android --profile preview --local
   ```
3. The APK will be generated in your folder.

## Step 2: Publish to Web Portal

1. Rename the downloaded/generated file to **`app-release.apk`**.
2. Move this file to the **public** folder of your Web App:
   ```
   C:\Users\PC\OneDrive\Desktop\dairy new\cow-connect-app\public\app-release.apk
   ```
   *(Note: create the `public` folder if it doesn't exist, though it should for a Vite/React app).*

3. Re-deploy your Web App (e.g., to Vercel/Netlify).
   *   The "Download Android APK" button in the Collectors Portal is already configured to point to `/app-release.apk`.

## Checklist
- [x] App Icon Updated (New "Cow Circuit" design)
- [x] `app.json` Configured (Package name: `com.dairyfarmers.collectors`)
- [x] Web Portal Button Added

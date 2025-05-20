# Converting HammadGenie to an Android APK

This guide explains how to convert the HammadGenie web app into an Android APK file that can be installed on Android devices.

## Prerequisites

1. Node.js and npm installed
2. Android Studio installed
3. Java Development Kit (JDK) installed
4. Basic knowledge of command line

## Method 1: Using Bubblewrap (Recommended)

Bubblewrap is Google's official tool for creating Trusted Web Activities (TWAs), which is the modern way to package web apps as Android apps.

### Step 1: Install Bubblewrap

```bash
npm install -g @bubblewrap/cli
```

### Step 2: Initialize the TWA project

First, deploy your PWA to a hosting service (like Netlify, Vercel, or Firebase). Then:

```bash
bubblewrap init --manifest=https://your-deployed-app-url/manifest.json
```

### Step 3: Build the APK

```bash
bubblewrap build
```

This will generate an APK file that you can install on Android devices.

## Method 2: Using PWA2APK (Easier but less customizable)

PWA2APK is an online service that can convert your PWA to an APK without requiring any development tools.

1. Go to [PWA2APK](https://pwa2apk.com/) or a similar service
2. Enter your deployed PWA URL
3. Customize app details (name, icons, etc.)
4. Generate and download the APK

## Method 3: Using Capacitor (More advanced)

For more control and native features:

### Step 1: Install Capacitor

```bash
npm install @capacitor/core @capacitor/android
npx cap init HammadGenie com.hammad.hammadgenie
```

### Step 2: Add Android platform

```bash
npx cap add android
```

### Step 3: Build and open in Android Studio

```bash
npx cap open android
```

Then build the APK from Android Studio.

## Testing the APK

1. Transfer the APK to an Android device
2. Enable "Install from Unknown Sources" in settings
3. Install the APK
4. Test all functionality

## Publishing to Google Play Store

1. Create a developer account on Google Play Console
2. Create a new app
3. Upload the signed APK or App Bundle
4. Fill in store listing details
5. Set pricing and distribution
6. Submit for review

## Notes

- The app will require internet connection for most functionality
- Make sure your web app works well on mobile before converting
- Test thoroughly on different Android versions and devices

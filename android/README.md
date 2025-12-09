# Bill Manager Pro - Native Android App

This directory contains the native Android app version of Bill Manager Pro, which wraps the web application in a WebView for native Android distribution.

## Prerequisites

- **Android Studio** (Latest version recommended)
- **JDK 8 or higher**
- **Android SDK** with API Level 24+ (Android 7.0)

## Project Structure

```
android/
├── app/
│   ├── src/main/
│   │   ├── java/com/billmanager/pro/
│   │   │   └── MainActivity.java          # Main app activity
│   │   ├── res/                           # Android resources
│   │   │   ├── layout/
│   │   │   │   └── activity_main.xml     # Main layout with WebView
│   │   │   ├── values/
│   │   │   │   ├── strings.xml           # App name and strings
│   │   │   │   ├── colors.xml            # Color definitions
│   │   │   │   └── themes.xml            # App theme
│   │   │   └── mipmap-*/                 # App icons
│   │   ├── assets/                        # Web app files (HTML/CSS/JS)
│   │   └── AndroidManifest.xml            # App manifest
│   └── build.gradle                       # App build configuration
├── build.gradle                           # Project build configuration
├── settings.gradle                        # Project settings
└── gradle.properties                      # Gradle properties
```

## Features

✅ **Native Android App**
- Runs as a standalone Android application
- No browser UI - full immersive experience
- Can be distributed on Google Play Store or as APK

✅ **Full Web App Functionality**
- All features from the web version work
- IndexedDB support for local storage
- JavaScript enabled with all APIs
- Offline-first design

✅ **Android Integration**
- Hardware back button support
- Notification channel support
- Vibration support
- Proper permission handling
- Adaptive icons

✅ **Performance**
- WebView optimized for performance
- DOM storage enabled
- Database caching enabled
- File access from local assets

## Setup Instructions

### Option 1: Using Android Studio (Recommended)

1. **Open Android Studio**

2. **Import Project**
   - File → Open
   - Navigate to `c:\justeat\Bill-Manager-Pro\android`
   - Click OK

3. **Wait for Gradle Sync**
   - Android Studio will automatically download dependencies
   - This may take a few minutes on first setup

4. **Connect Android Device or Setup Emulator**
   - **Physical Device:**
     - Enable USB Debugging on your device
     - Connect via USB
   - **Emulator:**
     - Tools → Device Manager
     - Create a new virtual device (Pixel 6 recommended)

5. **Run the App**
   - Click the green "Run" button (▶)
   - Select your device/emulator
   - The app will build and install automatically

### Option 2: Using Command Line

1. **Navigate to Android Directory**
   ```powershell
   cd c:\justeat\Bill-Manager-Pro\android
   ```

2. **Build Debug APK**
   ```powershell
   .\gradlew assembleDebug
   ```

3. **Install on Connected Device**
   ```powershell
   .\gradlew installDebug
   ```

4. **Build Release APK (for distribution)**
   ```powershell
   .\gradlew assembleRelease
   ```

## Building Release APK

### For Testing (Debug Build)

```powershell
cd c:\justeat\Bill-Manager-Pro\android
.\gradlew assembleDebug
```

The APK will be at: `app/build/outputs/apk/debug/app-debug.apk`

### For Production (Release Build)

1. **Generate Keystore (First time only)**
   ```powershell
   keytool -genkey -v -keystore billmanager.keystore -alias billmanager -keyalg RSA -keysize 2048 -validity 10000
   ```

2. **Create `keystore.properties` in android folder**
   ```properties
   storePassword=YOUR_STORE_PASSWORD
   keyPassword=YOUR_KEY_PASSWORD
   keyAlias=billmanager
   storeFile=../billmanager.keystore
   ```

3. **Update `app/build.gradle`**
   Add before `android` block:
   ```gradle
   def keystorePropertiesFile = rootProject.file("keystore.properties")
   def keystoreProperties = new Properties()
   keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
   ```
   
   Add inside `android` block:
   ```gradle
   signingConfigs {
       release {
           keyAlias keystoreProperties['keyAlias']
           keyPassword keystoreProperties['keyPassword']
           storeFile file(keystoreProperties['storeFile'])
           storePassword keystoreProperties['storePassword']
       }
   }
   
   buildTypes {
       release {
           signingConfig signingConfigs.release
           minifyEnabled false
           proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
       }
   }
   ```

4. **Build Signed Release APK**
   ```powershell
   .\gradlew assembleRelease
   ```

The signed APK will be at: `app/build/outputs/apk/release/app-release.apk`

## Installing APK on Device

### Via USB (ADB)
```powershell
adb install app/build/outputs/apk/debug/app-debug.apk
```

### Via File Transfer
1. Copy the APK to your phone
2. Open the APK file on your phone
3. Allow installation from unknown sources if prompted
4. Install the app

## Updating Web Content

After making changes to HTML/CSS/JS files:

1. **Copy updated files to assets**
   ```powershell
   Copy-Item -Path "c:\justeat\Bill-Manager-Pro\*.html" -Destination "c:\justeat\Bill-Manager-Pro\android\app\src\main\assets\" -Force
   Copy-Item -Path "c:\justeat\Bill-Manager-Pro\*.js" -Destination "c:\justeat\Bill-Manager-Pro\android\app\src\main\assets\" -Force
   Copy-Item -Path "c:\justeat\Bill-Manager-Pro\*.css" -Destination "c:\justeat\Bill-Manager-Pro\android\app\src\main\assets\" -Force
   ```

2. **Rebuild and install**
   ```powershell
   cd android
   .\gradlew installDebug
   ```

## Customization

### App Name
Edit: `app/src/main/res/values/strings.xml`
```xml
<string name="app_name">Bill Manager Pro</string>
```

### App Colors
Edit: `app/src/main/res/values/colors.xml`

### Package Name
To change `com.billmanager.pro`:
1. Update in `app/build.gradle` → `applicationId`
2. Update in `AndroidManifest.xml` → `package`
3. Refactor Java package in Android Studio

### App Icons
Replace files in:
- `app/src/main/res/mipmap-mdpi/` (48x48)
- `app/src/main/res/mipmap-hdpi/` (72x72)
- `app/src/main/res/mipmap-xhdpi/` (96x96)
- `app/src/main/res/mipmap-xxhdpi/` (144x144)
- `app/src/main/res/mipmap-xxxhdpi/` (192x192)

## Troubleshooting

### Gradle Sync Failed
- Check internet connection
- File → Invalidate Caches / Restart
- Update Gradle in `gradle/wrapper/gradle-wrapper.properties`

### App Crashes on Launch
- Check Logcat in Android Studio
- Verify all files are in assets folder
- Check WebView console for JavaScript errors

### IndexedDB Not Working
- Verify `setDomStorageEnabled(true)` in MainActivity
- Check Android version (API 24+)
- Clear app data and reinstall

### Permissions Denied
- Check AndroidManifest.xml for required permissions
- Request runtime permissions in MainActivity
- Check device settings

## Publishing to Google Play Store

1. **Build signed release APK** (see above)
2. **Create Google Play Developer account** ($25 one-time fee)
3. **Create new app in Play Console**
4. **Upload APK/AAB**
5. **Fill in store listing**
   - Title: Bill Manager Pro
   - Description: Manage your bills and payments efficiently
   - Category: Finance
   - Screenshots: Required (phone and tablet)
6. **Set pricing** (Free/Paid)
7. **Submit for review**

## Version Updates

To release a new version:

1. Update `versionCode` and `versionName` in `app/build.gradle`
   ```gradle
   versionCode 2
   versionName "1.1"
   ```

2. Build new release APK

3. Upload to Play Store

## Support

- **Package Name:** com.billmanager.pro
- **Min SDK:** 24 (Android 7.0)
- **Target SDK:** 34 (Android 14)
- **Build Tools:** Gradle 8.1.0

## Notes

- The app loads web content from `file:///android_asset/index.html`
- All web files must be in the `assets` folder
- IndexedDB data is stored in app's private storage
- Data persists across app updates
- Hardware back button navigates within WebView
- Notifications require Android 13+ permission

Enjoy your native Android app! 📱

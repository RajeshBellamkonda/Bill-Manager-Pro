# Quick Start - Build Android App

## Prerequisites
1. Install Android Studio: https://developer.android.com/studio
2. Install JDK 8 or higher

## Steps

### 1. Open Project in Android Studio
```
File → Open → Select "c:\justeat\Bill-Manager-Pro\android"
```

### 2. Wait for Gradle Sync
Android Studio will download dependencies automatically.

### 3. Build APK

**For Testing (Debug):**
```powershell
cd c:\justeat\Bill-Manager-Pro\android
.\gradlew assembleDebug
```
APK location: `app/build/outputs/apk/debug/app-debug.apk`

**For Release:**
```powershell
.\gradlew assembleRelease
```
APK location: `app/build/outputs/apk/release/app-release.apk`

### 4. Install on Device

**Using Android Studio:**
- Connect device or start emulator
- Click Run (▶) button

**Using Command Line:**
```powershell
adb install app/build/outputs/apk/debug/app-debug.apk
```

**Manual Install:**
- Copy APK to phone
- Open APK file and install
- Enable "Install from Unknown Sources" if prompted

## Update Web Files

After editing HTML/CSS/JS:
```powershell
cd c:\justeat\Bill-Manager-Pro
Copy-Item *.html,*.js,*.css android\app\src\main\assets\ -Force
cd android
.\gradlew installDebug
```

That's it! Your Android app is ready! 📱

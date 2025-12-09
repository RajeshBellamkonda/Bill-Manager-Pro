# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.

# Keep WebView JavaScript interfaces
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Keep WebView
-keep class android.webkit.** { *; }

# Keep all app classes
-keep class com.rayhanacafe.app.** { *; }

# Keep JavascriptInterface methods — R8 must not remove or rename these
# (called by name from JavaScript via window.AndroidStorage)
-keepclassmembers class com.rayhanacafe.app.MainActivity$RhStorage {
    @android.webkit.JavascriptInterface <methods>;
}

# Keep all @JavascriptInterface annotated methods across the app
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Keep WebView client classes
-keep class android.webkit.** { *; }

# Keep Activity lifecycle methods
-keep public class * extends android.app.Activity

# Suppress warnings for unused platform classes
-dontwarn java.lang.invoke.**

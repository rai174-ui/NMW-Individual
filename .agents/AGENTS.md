# APK Build Rule
Whenever an Android APK is built for this project (e.g., app-debug.apk), ALWAYS copy it to the root project directory `C:\Users\ABC\projects\NMW-Individual` so that it is easily accessible to the user.

# Version Increment Rule
Before building a release Android AAB or APK for uploading to the Play Console, ALWAYS increment the "versionCode" and "versionName" in "artifacts/nutrimyway/android/app/build.gradle" to avoid version conflicts.

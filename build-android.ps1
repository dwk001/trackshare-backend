# TrackShare Android Build Script
Write-Host "🔨 Building TrackShare Android APK..." -ForegroundColor Green
Write-Host ""

# Check if Android SDK is available
if (Test-Path "$env:ANDROID_HOME") {
    Write-Host "✅ Android SDK found at: $env:ANDROID_HOME" -ForegroundColor Green
} else {
    Write-Host "❌ Android SDK not found. Please install Android Studio or set ANDROID_HOME" -ForegroundColor Red
    Write-Host "📱 You can still test the backend API manually" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "🌐 Test your backend at: https://trackshare-backend.vercel.app" -ForegroundColor Cyan
    Write-Host "🔍 Health check: https://trackshare-backend.vercel.app/health" -ForegroundColor Cyan
    exit 1
}

# Try to build with Android SDK tools
$gradlePath = "$env:ANDROID_HOME\gradle\gradle-8.4\bin\gradle.bat"
if (Test-Path $gradlePath) {
    Write-Host "🚀 Building with Gradle..." -ForegroundColor Yellow
    & $gradlePath assembleDebug
} else {
    Write-Host "❌ Gradle not found in Android SDK" -ForegroundColor Red
    Write-Host "💡 Please use Android Studio to build the project" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "📋 Manual build steps:" -ForegroundColor Cyan
    Write-Host "1. Open Android Studio" -ForegroundColor White
    Write-Host "2. Open the TrackShare project" -ForegroundColor White
    Write-Host "3. Build → Make Project" -ForegroundColor White
    Write-Host "4. Build → Build Bundle(s) / APK(s) → Build APK(s)" -ForegroundColor White
}

Write-Host ""
Write-Host "🎯 Next steps:" -ForegroundColor Green
Write-Host "1. Install the APK on your Android device" -ForegroundColor White
Write-Host "2. Test sharing a track from Spotify/Apple Music/YouTube Music" -ForegroundColor White
Write-Host "3. Verify the TrackShare app opens and resolves the track" -ForegroundColor White
Write-Host "4. Check that the shared link works" -ForegroundColor White


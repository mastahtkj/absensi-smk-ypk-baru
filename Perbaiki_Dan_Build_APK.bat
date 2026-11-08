@echo off
title Perbaiki & Build APK Flutter SMK YPK
color 0A

echo ===================================================
echo   PERBAIKI SISTEM ANDROID & BUILD APK FLUTTER
echo ===================================================
echo.

cd /d "%~dp0flutter_app"
echo Masuk ke direktori: %cd%
echo.

:: 1. Deteksi Otomatis Lokasi Android SDK di Laptop
echo [*] Memeriksa lokasi Android SDK di komputer Anda...
set "FOUND_SDK="

if exist "%LOCALAPPDATA%\Android\Sdk\platform-tools" (
    set "FOUND_SDK=%LOCALAPPDATA%\Android\Sdk"
) else if exist "C:\Android\Sdk\platform-tools" (
    set "FOUND_SDK=C:\Android\Sdk"
) else if exist "D:\Android\Sdk\platform-tools" (
    set "FOUND_SDK=D:\Android\Sdk"
) else if exist "%ProgramFiles(x86)%\Android\android-sdk\platform-tools" (
    set "FOUND_SDK=%ProgramFiles(x86)%\Android\android-sdk"
)

if defined FOUND_SDK (
    echo [OK] Android SDK terdeteksi di: %FOUND_SDK%
    call flutter config --android-sdk "%FOUND_SDK%" >nul 2>&1
    
    :: Tuliskan sdk.dir ke local.properties dengan format escape backslash
    powershell -Command "$sdk = '%FOUND_SDK%'.Replace('\', '\\'); $prop = 'android/local.properties'; if (Test-Path $prop) { $txt = Get-Content $prop; if (-not ($txt -match 'sdk\.dir')) { Add-Content $prop \"sdk.dir=$sdk\" } } else { Set-Content $prop \"sdk.dir=$sdk\" }"
) else (
    echo [PERHATIAN] Android SDK belum terdeteksi otomatis di folder standar.
)

echo.
echo [Langkah 1/3] Menyiapkan izin GPS Geofencing dan Internet ke AndroidManifest...
powershell -Command "$p = 'android/app/src/main/AndroidManifest.xml'; if (Test-Path $p) { $content = Get-Content $p -Raw; if (-not ($content -like '*ACCESS_FINE_LOCATION*')) { $perms = @('    <uses-permission android:name=\"android.permission.INTERNET\"/>', '    <uses-permission android:name=\"android.permission.ACCESS_FINE_LOCATION\"/>', '    <uses-permission android:name=\"android.permission.ACCESS_COARSE_LOCATION\"/>', '    <uses-permission android:name=\"android.permission.CAMERA\"/>') -join [Environment]::NewLine; $newContent = $content -replace '<application', ($perms + [Environment]::NewLine + '    <application'); Set-Content $p $newContent -Encoding UTF8; Write-Host 'Izin GPS dan Internet berhasil disisipkan.' -ForegroundColor Green } }"

echo.
echo [Langkah 2/3] Mengambil dependensi aplikasi (flutter pub get)...
call flutter pub get

echo.
echo [Langkah 3/3] Membangun file APK Release (flutter build apk --release)...
call flutter build apk --release

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ===================================================
    echo   BUILD SUKSES! FILE APK BERHASIL DIBUAT!
    echo ===================================================
    echo Lokasi file APK siap pasang di HP:
    echo flutter_app\build\app\outputs\flutter-apk\app-release.apk
    echo.
    explorer "%~dp0flutter_app\build\app\outputs\flutter-apk"
) else (
    echo.
    echo ===================================================
    echo  PANDUAN JIKA ANDROID SDK BELUM TERPASANG:
    echo ===================================================
    echo Jika muncul pesan "No Android SDK found":
    echo 1. Pastikan Anda sudah menginstal Android Studio di laptop.
    echo 2. Buka Android Studio -^> More Actions -^> SDK Manager.
    echo 3. Pastikan "Android SDK Command-line Tools" dan "Android SDK Platform" sudah dicentang/diinstal.
    echo.
)

pause

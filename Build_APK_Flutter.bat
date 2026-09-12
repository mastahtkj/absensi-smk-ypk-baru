@echo off
title Build APK Flutter SMK YPK Medan
color 0A

echo ===================================================
echo     MEMBANGUN FILE APK FLUTTER (RELEASE)
echo ===================================================
echo.

cd /d "%~dp0flutter_app"
echo Posisi direktori: %cd%
echo.

:: Deteksi Otomatis Android SDK
set "FOUND_SDK="
if exist "%LOCALAPPDATA%\Android\Sdk\platform-tools" (
    set "FOUND_SDK=%LOCALAPPDATA%\Android\Sdk"
) else if exist "C:\Android\Sdk\platform-tools" (
    set "FOUND_SDK=C:\Android\Sdk"
) else if exist "D:\Android\Sdk\platform-tools" (
    set "FOUND_SDK=D:\Android\Sdk"
)

if defined FOUND_SDK (
    call flutter config --android-sdk "%FOUND_SDK%" >nul 2>&1
    powershell -Command "$sdk = '%FOUND_SDK%'.Replace('\', '\\'); $prop = 'android/local.properties'; if (Test-Path $prop) { $txt = Get-Content $prop; if (-not ($txt -match 'sdk\.dir')) { Add-Content $prop \"sdk.dir=$sdk\" } }"
)

echo [1/2] Mengambil paket dependensi (flutter pub get)...
call flutter pub get

echo.
echo [2/2] Mengompilasi file APK Release (flutter build apk --release)...
call flutter build apk --release

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ===================================================
    echo  BERHASIL! FILE APK SUDAH SIAP!
    echo  Lokasi file:
    echo  flutter_app\build\app\outputs\flutter-apk\app-release.apk
    echo ===================================================
    echo.
    explorer "%~dp0flutter_app\build\app\outputs\flutter-apk"
) else (
    echo.
    echo [ERROR] Gagal mengompilasi APK.
)

pause

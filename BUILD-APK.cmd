@echo off
REM ===================================================================
REM  BUILD APK - SMK YPK SUPER APP (Trusted Web Activity)
REM  Pakai toolchain di %USERPROFILE%\.apk-toolchain
REM  Jalankan:  BUILD-APK.cmd
REM
REM  PENTING: nomor versi (versionCode) otomatis naik +1 setiap build.
REM  Android TIDAK bisa memasang APK dengan versionCode yang sama/lebih kecil
REM  => itu alasan lama "harus uninstall APK lama" supaya update masuk.
REM ===================================================================
setlocal

set TC=%USERPROFILE%\.apk-toolchain
for /d %%i in ("%TC%\jdk\*") do set JDK=%%i

set JAVA_HOME=%JDK%
set ANDROID_HOME=%TC%\sdk
set ANDROID_SDK_ROOT=%TC%\sdk
set PATH=%JAVA_HOME%\bin;%TC%\sdk\bin;%TC%\sdk\cmdline-tools\latest\bin;%PATH%
set NODE_PATH=%TC%\bw-build\node_modules
set BUBBLEWRAP_KEYSTORE_PASSWORD=smkypk2026
set BUBBLEWRAP_KEY_PASSWORD=smkypk2026

cd /d "%~dp0android-twa"

echo [0/4] Sinkronkan twa-manifest.json...
copy /Y "%~dp0twa-manifest.json" "twa-manifest.json" > nul

echo [1/4] Naikkan nomor versi APK otomatis (versionCode +1)...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\bump-apk-version.ps1"
if errorlevel 1 (
  echo [GAGAL] Tidak bisa menaikkan nomor versi APK.
  exit /b 1
)

echo [2/4] Build APK via Bubblewrap...
echo n | "%TC%\node\node-v22.20.0-win-x64\node.exe" ^
  "%TC%\bw-build\node_modules\@bubblewrap\cli\bin\bubblewrap.js" ^
  build --manifest=twa-manifest.json

if not exist app-release-signed.apk (
  echo [GAGAL] app-release-signed.apk tidak terbentuk.
  exit /b 1
)

echo [3/4] Salin ke public\apk\...
if not exist "%~dp0public\apk" mkdir "%~dp0public\apk"
copy /Y app-release-signed.apk "%~dp0public\apk\SMK_YPK_SUPER_APP.apk" > nul

echo [4/4] Tulis public\apk\version.json...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\write-apk-version.ps1"

echo.
echo Selesai!
echo.
echo APK   : %~dp0public\apk\SMK_YPK_SUPER_APP.apk
echo Unduh : https://absensi-smk-ypk-baru.vercel.app/apk/SMK_YPK_SUPER_APP.apk
echo.
echo Catatan: NOTIFIKASI "update aplikasi tersedia" muncul otomatis
echo di HP saat versi web baru ter-deploy. Tidak perlu uninstall APK.
echo.
pause
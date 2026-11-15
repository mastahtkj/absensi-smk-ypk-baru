@echo off
REM ===================================================================
REM  UPDATE APLIKASI - SMK YPK SUPER APP
REM
REM  Jalankan script ini SETELAH kode di folder app/ diubah.
REM  Script akan: build APK -> salin ke public\apk -> commit -> push
REM  Vercel lalu otomatis deploy (web + APK baru).
REM
REM  Jalankan:  UPDATE-APP.cmd
REM ===================================================================
setlocal
set TC=%USERPROFILE%\.apk-toolchain
set NODE=%TC%\node\node-v22.20.0-win-x64\node.exe
set NPM=%TC%\node\node-v22.20.0-win-x64\node_modules\npm\bin\npm-cli.js

cd /d "%~dp0"

echo [1/4] Build APK...
call "%~dp0BUILD-APK.cmd" < nul
if not exist "%~dp0public\apk\SMK_YPK_SUPER_APP.apk" (
  echo [GAGAL] APK tidak terbentuk.
  pause
  exit /b 1
)

echo.
echo [2/4] Commit perubahan...
git -c safe.directory=%CD% add -A
git -c safe.directory=%CD% -c core.safecrlf=false commit -m "chore: update aplikasi (%DATE% %TIME%)"

echo.
echo [3/4] Push ke GitHub (Vercel auto-deploy)...
git -c safe.directory=%CD% push origin main

echo.
echo [4/4] Selesai!
echo.
echo Web  : https://absensi-smk-ypk-baru.vercel.app
echo APK  : https://absensi-smk-ypk-baru.vercel.app/apk/SMK_YPK_SUPER_APP.apk
echo.
echo Tunggu ~2 menit untuk deploy Vercel, lalu buka APK di HP.
pause
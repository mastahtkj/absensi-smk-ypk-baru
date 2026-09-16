@echo off
cd /d "%~dp0"
title Deploy Langsung ke Vercel (Production)
color 0B

:: Tambahkan path umum Node.js dan npm/npx ke environment PATH
set "PATH=%PATH%;C:\Program Files\nodejs;C:\Program Files (x86)\nodejs;%LOCALAPPDATA%\Programs\nodejs;%APPDATA%\npm;%USERPROFILE%\AppData\Roaming\npm;C:\nvm4w\nodejs"

echo ===================================================
echo    DEPLOY CEPAT LANGSUNG KE VERCEL (PRODUCTION)
echo ===================================================
echo Direktori: %~dp0
echo.

:: Deteksi lokasi npx
set "NPX_CMD=npx"
where npx >nul 2>&1
if %errorlevel% equ 0 goto :run_npx

if exist "C:\Program Files\nodejs\npx.cmd" set "NPX_CMD=C:\Program Files\nodejs\npx.cmd" & goto :run_npx
if exist "C:\Program Files (x86)\nodejs\npx.cmd" set "NPX_CMD=C:\Program Files (x86)\nodejs\npx.cmd" & goto :run_npx
if exist "%APPDATA%\npm\npx.cmd" set "NPX_CMD=%APPDATA%\npm\npx.cmd" & goto :run_npx
if exist "%LOCALAPPDATA%\Programs\nodejs\npx.cmd" set "NPX_CMD=%LOCALAPPDATA%\Programs\nodejs\npx.cmd" & goto :run_npx

:: Jika npx sama sekali tidak ditemukan
color 0C
echo ===================================================
echo [PERHATIAN] Node.js / npx tidak terdeteksi di sistem ini.
echo Silakan gunakan file 'upload.bat' untuk mengunggah ke GitHub,
echo lalu Vercel akan otomatis melakukan build.
echo ===================================================
echo.
pause
exit /b

:run_npx
echo [*] Node.js / NPX terdeteksi: %NPX_CMD%

:: 1. Pastikan sinkronisasi file master lengkap
echo [*] Menyinkronkan file master terbaru (app, src/app, public)...
if exist "app\page.js" (
    copy /y "app\page.js" "page.js" >nul 2>&1
    if not exist "src\app" mkdir "src\app" >nul 2>&1
    copy /y "app\page.js" "src\app\page.js" >nul 2>&1
)
if exist "app\components" (
    if not exist "src\app\components" mkdir "src\app\components" >nul 2>&1
    xcopy /y /e /i "app\components\*" "src\app\components\" >nul 2>&1
)
:: Salin video banner profil sekolah resmi ke folder public
if not exist "public" mkdir "public" >nul 2>&1
set "VID_COPIED="
if exist "C:\Users\HOME RAY\Downloads\WhatsApp Video 2026-09-16 at 9.05.19 AM.mp4" (
    copy /y "C:\Users\HOME RAY\Downloads\WhatsApp Video 2026-09-16 at 9.05.19 AM.mp4" "public\banner-video-1.mp4" >nul 2>&1
    set "VID_COPIED=1"
    echo [*] Video banner profil resmi disalin ke public\banner-video-1.mp4
)
if not defined VID_COPIED (
    for /f "delims=" %%v in ('dir /b /s /o-d "C:\Users\HOME RAY\Downloads\*WhatsApp Video 2026-09-16*.mp4" 2^>nul') do (
        copy /y "%%v" "public\banner-video-1.mp4" >nul 2>&1
        set "VID_COPIED=1"
        echo [*] Video banner disalin dari: %%v
        goto :video_done_vercel
    )
)
if not defined VID_COPIED (
    for /f "delims=" %%v in ('dir /b /s /o-d "C:\Users\HOME RAY\Downloads\*WhatsApp Video*.mp4" 2^>nul') do (
        copy /y "%%v" "public\banner-video-1.mp4" >nul 2>&1
        set "VID_COPIED=1"
        echo [*] Video banner disalin dari: %%v
        goto :video_done_vercel
    )
)
:video_done_vercel

echo.
echo [*] Memulai proses Build dan Deploy langsung ke Vercel Production...
echo [*] Jika diminta login, ikuti instruksi di layar.
echo.
call "%NPX_CMD%" vercel --prod --yes

if %errorlevel% equ 0 (
    color 0A
    echo.
    echo ===================================================
    echo  BERHASIL! Aplikasi Anda telah LIVE di Vercel Production!
    echo ===================================================
) else (
    color 0C
    echo.
    echo ===================================================
    echo  Terjadi kendala saat deploy ke Vercel.
    echo ===================================================
)

echo.
pause

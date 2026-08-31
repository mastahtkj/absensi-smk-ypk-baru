@echo off
cd /d "%~dp0"
title Upload ke GitHub - Presensi Digital SMK YPK
color 0A

echo ===================================================
echo     PROSES UPLOAD KE GITHUB OTOMATIS
echo ===================================================
echo Repo: https://github.com/mastahtkj/absensi-smk-ypk-baru
echo.

:: 0. Deteksi Lokasi Git
set "GIT_CMD=git"
git --version >nul 2>&1
if %errorlevel% equ 0 goto :run_git

if exist "C:\Program Files\Git\cmd\git.exe" set "GIT_CMD=C:\Program Files\Git\cmd\git.exe" & goto :run_git
if exist "C:\Program Files\Git\bin\git.exe" set "GIT_CMD=C:\Program Files\Git\bin\git.exe" & goto :run_git
if exist "%LOCALAPPDATA%\Programs\Git\cmd\git.exe" set "GIT_CMD=%LOCALAPPDATA%\Programs\Git\cmd\git.exe" & goto :run_git
if exist "%LOCALAPPDATA%\Programs\Git\bin\git.exe" set "GIT_CMD=%LOCALAPPDATA%\Programs\Git\bin\git.exe" & goto :run_git
if exist "C:\Program Files (x86)\Git\cmd\git.exe" set "GIT_CMD=C:\Program Files (x86)\Git\cmd\git.exe" & goto :run_git
if exist "C:\Program Files (x86)\Git\bin\git.exe" set "GIT_CMD=C:\Program Files (x86)\Git\bin\git.exe" & goto :run_git
if exist "%ProgramData%\chocolatey\bin\git.exe" set "GIT_CMD=%ProgramData%\chocolatey\bin\git.exe" & goto :run_git
if exist "%USERPROFILE%\scoop\shims\git.exe" set "GIT_CMD=%USERPROFILE%\scoop\shims\git.exe" & goto :run_git

:: Cari installer Git di folder saat ini jika ada
for %%F in ("Git-*.exe") do (
    color 0E
    echo [INFO] Git belum terpasang di Windows.
    echo [*] Menemukan file installer: %%F
    echo [*] Membuka installer Git... Silakan klik 'Next' sampai selesai!
    echo.
    start /wait "" "%%F"
    echo.
    echo [*] Memeriksa kembali instalasi Git...
    if exist "C:\Program Files\Git\cmd\git.exe" set "GIT_CMD=C:\Program Files\Git\cmd\git.exe" & color 0A & goto :run_git
    if exist "%LOCALAPPDATA%\Programs\Git\cmd\git.exe" set "GIT_CMD=%LOCALAPPDATA%\Programs\Git\cmd\git.exe" & color 0A & goto :run_git
)

color 0C
echo ===================================================
echo [ERROR] Git belum terinstall di laptop/komputer Anda!
echo ===================================================
echo Silakan double click file installer 'Git-2.55.0.5-64-bit.exe'
echo yang ada di folder ini, lalu klik Next sampai Finish.
echo Setelah itu, jalankan kembali 'upload.bat'.
echo.
pause
exit /b

:run_git
echo [*] Menggunakan Git: %GIT_CMD%
"%GIT_CMD%" config --global user.name "SMK YPK Medan"
"%GIT_CMD%" config --global user.email "smkypkmedan@gmail.com"
"%GIT_CMD%" config --global --add safe.directory "*"
"%GIT_CMD%" config gc.auto 0
"%GIT_CMD%" config core.autocrlf false

:: Bersihkan file lock jika ada proses Git yang terhenti mendadak sebelumnya
if exist ".git\index.lock" del /f /q ".git\index.lock" >nul 2>&1
if exist ".git\refs\heads\main.lock" del /f /q ".git\refs\heads\main.lock" >nul 2>&1

:: 1. Sinkronkan file master dari app ke folder pendukung (src/app, public, dan root)
echo [*] Sinkronisasi seluruh file master (app, src/app, public)...
if exist "app\page.js" (
    copy /y "app\page.js" "page.js" >nul 2>&1
    if not exist "src\app" mkdir "src\app" >nul 2>&1
    copy /y "app\page.js" "src\app\page.js" >nul 2>&1
)
if exist "app\components" (
    if not exist "src\app\components" mkdir "src\app\components" >nul 2>&1
    xcopy /y /e /i "app\components\*" "src\app\components\" >nul 2>&1
)
if exist "app\layout.js" (
    if not exist "src\app" mkdir "src\app" >nul 2>&1
    copy /y "app\layout.js" "src\app\layout.js" >nul 2>&1
)
if exist "app\api\rfid-tap\route.js" (
    copy /y "app\api\rfid-tap\route.js" "route.js" >nul 2>&1
)
if exist "manifest.json" (
    if not exist "public" mkdir "public" >nul 2>&1
    copy /y "manifest.json" "public\manifest.json" >nul 2>&1
)
if exist "logo.png" (
    if not exist "public" mkdir "public" >nul 2>&1
    copy /y "logo.png" "public\logo.png" >nul 2>&1
)

:: Sinkronkan gambar roster scan resmi ke folder public agar terbaca di Vercel
echo [*] Sinkronisasi gambar scan roster guru dan kelas ke folder public...
if not exist "public\roster-guru" mkdir "public\roster-guru" >nul 2>&1
copy /y "Roster Guru*.jpg" "public\roster-guru\" >nul 2>&1
copy /y "Roster Guru*.jpg" "public\" >nul 2>&1
if not exist "public\roster-kelas" mkdir "public\roster-kelas" >nul 2>&1
copy /y "Roster Kelas*.jpg" "public\roster-kelas\" >nul 2>&1
copy /y "Roster Kelas*.jpg" "public\" >nul 2>&1

:: Hapus file sampah jika ada
if exist "main'" del "main'" >nul 2>&1

:: Inisialisasi Git jika belum ada
if not exist ".git" "%GIT_CMD%" init

:: Pastikan file installer besar tidak masuk ke commit
"%GIT_CMD%" rm --cached *.exe >nul 2>&1

"%GIT_CMD%" remote remove origin >nul 2>&1
"%GIT_CMD%" remote add origin https://github.com/mastahtkj/absensi-smk-ypk-baru.git

echo.
echo [*] Menambahkan SEMUA file terbaru ke Git...
"%GIT_CMD%" add -A

echo.
echo [*] Menyimpan commit pembaruan...
"%GIT_CMD%" commit -m "Update Sistem SuperApp SMK YPK: Fix Vercel Build, Sinkronisasi CBT, Layout, Roster & API Routes"

echo.
echo [*] Menetapkan branch main...
"%GIT_CMD%" branch -M main

echo.
echo [*] Mengirim (push) seluruh kode ke GitHub...
"%GIT_CMD%" push -u origin main --force

if %errorlevel% neq 0 (
    color 0C
    echo.
    echo ===================================================
    echo [GAGAL UPLOAD KE GITHUB]
    echo ===================================================
    echo Kemungkinan penyebab:
    echo 1. Anda belum login ke akun GitHub 'mastahtkj' di browser/Git Credential
    echo 2. Perlu Personal Access Token (PAT) GitHub
    echo 3. Koneksi internet terputus
    echo ===================================================
    echo.
    echo Apakah Anda memiliki GitHub Personal Access Token (PAT)?
    set /p "GHTOKEN=Masukkan Token GitHub (atau tekan Enter untuk batal): "
    if defined GHTOKEN (
        echo [*] Mencoba push ulang dengan Personal Access Token...
        "%GIT_CMD%" remote set-url origin https://%GHTOKEN%@github.com/mastahtkj/absensi-smk-ypk-baru.git
        "%GIT_CMD%" push -u origin main --force
        if %errorlevel% equ 0 (
            color 0A
            echo.
            echo ===================================================
            echo [BERHASIL!] Kode berhasil terupload ke GitHub!
            echo ===================================================
            goto :finish_upload
        )
    )
    echo.
    pause
    exit /b
)

:finish_upload
color 0A
echo.
echo ===================================================
echo  STATUS COMMIT TERAKHIR:
echo ===================================================
"%GIT_CMD%" log -1 --stat
echo.
echo ===================================================
echo  SELESAI! Seluruh kode terbaru telah terupload ke GitHub!
echo  Tunggu 1-2 menit hingga deployment Vercel selesai.
echo ===================================================
echo.
pause

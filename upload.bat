@echo off
cd /d "%~dp0"
title Upload ke GitHub - Presensi Digital SMK YPK
color 0A

echo =================================================== > upload_log.txt 2>&1
echo LOG PROSES UPLOAD GITHUB [%DATE% %TIME%] >> upload_log.txt 2>&1
echo Direktori: %~dp0 >> upload_log.txt 2>&1

echo ===================================================
echo     PROSES UPLOAD KE GITHUB OTOMATIS
echo ===================================================
echo Repo: https://github.com/mastahtkj/absensi-smk-ypk-baru
echo.

set "PATH=%PATH%;C:\Program Files\Git\cmd;C:\Program Files\Git\bin;C:\Program Files (x86)\Git\cmd;C:\Program Files (x86)\Git\bin;%LOCALAPPDATA%\Programs\Git\cmd;%LOCALAPPDATA%\Programs\Git\bin;%USERPROFILE%\scoop\shims;C:\ProgramData\chocolatey\bin"

:: 0. Deteksi Lokasi Git
set "GIT_CMD=git"
for /f "delims=" %%i in ('where git 2^>nul') do (
    set "GIT_CMD=%%i"
    goto :run_git
)
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
echo =================================================== > upload_log.txt 2>&1
echo LOG UPLOAD GITHUB [%DATE% %TIME%] >> upload_log.txt 2>&1
echo Menggunakan Git: %GIT_CMD% >> upload_log.txt 2>&1
"%GIT_CMD%" --version >> upload_log.txt 2>&1
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
if exist "flutter_app\android\gradle\wrapper\gradle-wrapper.jar" (
    if not exist "android\gradle\wrapper" mkdir "android\gradle\wrapper" >nul 2>&1
    copy /y "flutter_app\android\gradle\wrapper\gradle-wrapper.jar" "android\gradle\wrapper\gradle-wrapper.jar" >nul 2>&1
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

:: Periksa apakah ada token GitHub yang tersimpan di file .git_token
set "REMOTE_URL=https://github.com/mastahtkj/absensi-smk-ypk-baru.git"
if exist ".git_token" (
    set /p SAVED_TOKEN=<".git_token"
    if defined SAVED_TOKEN (
        set "REMOTE_URL=https://%SAVED_TOKEN%@github.com/mastahtkj/absensi-smk-ypk-baru.git"
    )
)

"%GIT_CMD%" remote remove origin >nul 2>&1
"%GIT_CMD%" remote add origin %REMOTE_URL%

echo.
echo [*] Menambahkan SEMUA file terbaru ke Git...
"%GIT_CMD%" add -A

echo.
echo [*] Menyimpan commit pembaruan dengan penanda waktu...
set "COMMIT_TIME=%DATE% %TIME%"
"%GIT_CMD%" commit -m "Update SuperApp SMK YPK: Fix Lonceng Merah, Gambar Mading & Pengumuman - %COMMIT_TIME%" 2>&1 | powershell -Command "$input | Tee-Object -Append -FilePath 'upload_log.txt'"
if %errorlevel% neq 0 (
    "%GIT_CMD%" commit --allow-empty -m "Trigger Vercel Build - %COMMIT_TIME%" >> upload_log.txt 2>&1
)

echo.
echo [*] Menetapkan branch main...
"%GIT_CMD%" branch -M main >> upload_log.txt 2>&1

echo.
echo [*] Mengirim (push) ke GitHub branch 'main'...
"%GIT_CMD%" push -u origin main --force 2>&1 | powershell -Command "$input | Tee-Object -Append -FilePath 'upload_log.txt'"

if %errorlevel% neq 0 (
    color 0C
    echo.
    echo ===================================================
    echo [GAGAL UPLOAD KE GITHUB]
    echo ===================================================
    echo Kemungkinan penyebab:
    echo 1. Anda belum login ke akun GitHub 'mastahtkj'
    echo 2. Perlu Personal Access Token (PAT) GitHub
    echo 3. Token sebelumnya kadaluarsa atau koneksi terputus
    echo ===================================================
    echo.
    echo Panduan Buat Token GitHub (hanya 1 menit):
    echo - Buka https://github.com/settings/tokens
    echo - Klik 'Generate new token (classic)', centang 'repo', klik 'Generate token'
    echo - Salin token (ghp_xxxx...) lalu tempel di bawah:
    echo.
    set /p "GHTOKEN=Masukkan Token GitHub Anda (atau tekan Enter untuk batal): "
    if defined GHTOKEN (
        echo %GHTOKEN%>.git_token
        echo [*] Mencoba push ulang dengan Personal Access Token...
        "%GIT_CMD%" remote set-url origin https://%GHTOKEN%@github.com/mastahtkj/absensi-smk-ypk-baru.git
        "%GIT_CMD%" push -u origin main --force 2>&1 | powershell -Command "$input | Tee-Object -Append -FilePath 'upload_log.txt'"
        if %errorlevel% neq 0 (
            color 0C
            echo.
            echo [GAGAL] Token tidak valid atau akun GitHub tidak memiliki izin push ke repo ini.
            pause
            exit /b
        )
    ) else (
        echo.
        echo Upload dibatalkan.
        pause
        exit /b
    )
)

:: PUSH JUGA KE BRANCH 'master' AGAR VERCEL OTOMATIS TER-TRIGGER JIKA MENGGUNAKAN MASTER
echo.
echo [*] Mengirim (push) ke GitHub branch 'master' (sinkronisasi Vercel)...
"%GIT_CMD%" push origin main:master --force 2>&1 | powershell -Command "$input | Tee-Object -Append -FilePath 'upload_log.txt'"

:finish_upload
color 0A
echo.
echo ===================================================
echo  STATUS COMMIT TERAKHIR:
echo ===================================================
"%GIT_CMD%" log -1 --stat
echo.
echo ===================================================
echo  BERHASIL! Seluruh kode terbaru telah terupload ke GitHub!
echo ===================================================
echo  Kode sudah terkirim ke branch 'main' dan 'master'.
echo.
echo  PANDUAN VERCEL:
echo  1. Buka dashboard Vercel Anda di browser.
echo  2. Masuk ke proyek Anda -> Tab 'Deployments'.
echo  3. Anda akan melihat deployment baru sedang diproses.
echo  4. Jika belum bergerak otomatis, klik tombol '...' di samping
echo     deployment terakhir, lalu klik 'Redeploy'.
echo ===================================================
echo.
pause

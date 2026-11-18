@echo off
title SMK YPK MEDAN - SERVER AI PRESENSI INSIGHTFACE + OPENCV 5.1
color 0A
cls
echo ===============================================================================
echo   SMK YPK MEDAN - SERVER AI PRESENSI INSIGHTFACE ARCFACE + OPENCV 5.1
echo ===============================================================================
echo.
echo [1/3] Menyiapkan lingkungan Python...

set "PYTHON_EXE="
if exist "C:\Users\ACER-ENTERPRICE\AppData\Local\Programs\Python\Python311\python.exe" (
    set "PYTHON_EXE=C:\Users\ACER-ENTERPRICE\AppData\Local\Programs\Python\Python311\python.exe"
) else (
    where python >nul 2>nul
    if %errorlevel% equ 0 (
        set "PYTHON_EXE=python"
    )
)

if "%PYTHON_EXE%"=="" (
    echo [ERROR] Python 3.11 tidak ditemukan!
    pause
    exit /b 1
)

echo [2/3] Menggunakan Python: %PYTHON_EXE%
echo [3/3] Menjalankan Server REST API AI InsightFace + OpenCV pada port 5000...
echo.
echo ===============================================================================
echo  Server AI ini otomatis terhubung dengan:
echo  1. Menu "Scanner Wajah AI" di Dashboard Admin Master SMK YPK Medan
echo  2. Terminal Kiosk Kamera Presensi 60 FPS
echo ===============================================================================
echo.

"%PYTHON_EXE%" scripts\insightface_opencv_server.py

echo.
pause

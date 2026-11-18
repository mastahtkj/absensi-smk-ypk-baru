@echo off
title SMK YPK MEDAN - TERMINAL PRESENSI PYTHON INSIGHTFACE + OPENCV 5.1
color 0A
cls
echo ===============================================================================
echo   SMK YPK MEDAN - TERMINAL PRESENSI PYTHON INSIGHTFACE + OPENCV 5.1 (60 FPS)
echo ===============================================================================
echo.

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

echo Menggunakan Python: %PYTHON_EXE%
echo Menjalankan Terminal Presensi InsightFace ArcFace + OpenCV 60 FPS...
echo.

"%PYTHON_EXE%" scripts\terminal_presensi_insightface.py

echo.
pause

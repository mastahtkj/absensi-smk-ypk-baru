@echo off
title SMK YPK MEDAN - Pendaftaran Wajah InsightFace + OpenCV 5.1
color 0b
cls
echo ===============================================================================
echo   SMK YPK MEDAN - SISTEM PENDAFTARAN BIOMETRIK WAJAH INSIGHTFACE + OPENCV
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
echo Membuka Antarmuka Pendaftaran Wajah InsightFace ArcFace...
echo.

"%PYTHON_EXE%" scripts\pendaftaran_wajah_insightface.py

echo.
pause

@echo off
title SMK YPK MEDAN - Pendaftaran Wajah InsightFace + OpenCV
color 0b
cls
echo ===============================================================================
echo   SMK YPK MEDAN - SISTEM PENDAFTARAN BIOMETRIK WAJAH INSIGHTFACE + OPENCV
echo ===============================================================================
echo.
echo Sedang memeriksa Python dan modul InsightFace...

where python >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Python belum terpasang di komputer ini!
    echo Silakan install Python 3.10 atau 3.11 dari https://www.python.org/
    echo dan centang "Add python.exe to PATH" saat menginstall.
    pause
    exit /b 1
)

echo Memeriksa pustaka Python...
python -c "import cv2, insightface, requests" >nul 2>nul
if %errorlevel% neq 0 (
    echo Mengunduh dan memasang modul OpenCV + InsightFace...
    pip install -r scripts\requirements_insightface.txt
)

echo Membuka Antarmuka Pendaftaran Wajah...
python scripts\pendaftaran_wajah_insightface.py

echo.
pause

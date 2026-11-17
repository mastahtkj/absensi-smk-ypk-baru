@echo off
title SMK YPK MEDAN - TERMINAL PRESENSI PYTHON INSIGHTFACE + OPENCV
color 0A
cls
echo =====================================================================
echo    SMK YPK MEDAN - TERMINAL PRESENSI PYTHON INSIGHTFACE + OPENCV
echo =====================================================================
echo.
echo Memeriksa instalasi Python di komputer...
where python >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [PERINGATAN] Python belum terpasang di komputer ini!
    echo.
    echo Silakan unduh Python 3.10 atau 3.11 dari: https://www.python.org/downloads/
    echo Pastikan centang "Add Python to PATH" saat instalasi.
    echo.
    pause
    exit /b 1
)

echo Menginstal / memeriksa modul OpenCV dan InsightFace...
pip install -r scripts\requirements_insightface.txt

echo.
echo Menjalankan Terminal Presensi InsightFace ArcFace 60 FPS...
python scripts\terminal_presensi_insightface.py
pause

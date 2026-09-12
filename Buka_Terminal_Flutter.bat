@echo off
title Terminal Flutter SMK YPK Medan
color 0B

echo ===================================================
echo     MEMBUKA TERMINAL FLUTTER SMK YPK MEDAN
echo ===================================================
echo.
cd /d "%~dp0flutter_app"
echo Posisi direktori saat ini: %cd%
echo.
echo Menjalankan PowerShell di folder flutter_app...
powershell -NoExit -Command "Write-Host 'Anda sudah berada di folder flutter_app.' -ForegroundColor Green; Write-Host 'Silakan ketik perintah: flutter pub get / flutter run' -ForegroundColor Cyan"

@echo off
title Menjalankan Flutter SMK YPK Medan
color 0E

echo ===================================================
echo     MENJALANKAN APLIKASI FLUTTER DI HP / EMULATOR
echo ===================================================
echo.

cd /d "%~dp0flutter_app"
echo Posisi direktori: %cd%
echo.

echo Mengambil dependensi...
call flutter pub get

echo.
echo Menjalankan aplikasi ke perangkat yang terhubung...
echo (Pastikan HP Android sudah dicolok dan USB Debugging aktif)
echo.
call flutter run

pause

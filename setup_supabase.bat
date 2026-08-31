@echo off
title Hubungkan Project ke Supabase (Setup 1x)
color 0E

echo ===================================================
echo     SETUP KONEKSI SUPABASE KE LAPTOP (CUKUP 1X)
echo ===================================================
echo Project ID : wpyfwkcevgdhkazeesdq
echo.

echo [Langkah 1/2] Menginisialisasi folder Supabase...
npx supabase init

echo.
echo [Langkah 2/2] Login ke Akun Supabase Anda...
echo (Browser akan otomatis terbuka, klik tombol "Authorize" / "Izinkan")
npx supabase login

echo.
echo Menghubungkan folder ini ke project Supabase Anda...
npx supabase link --project-ref wpyfwkcevgdhkazeesdq

echo.
echo ===================================================
echo  SETUP SELESAI!
echo  Mulai sekarang untuk update database, cukup klik file:
echo  update_db.bat
echo ===================================================
echo.
pause

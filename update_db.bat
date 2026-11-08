@echo off
title Update Database Supabase Otomatis
color 0B

echo ===================================================
echo     UPDATE DATABASE SUPABASE OTOMATIS
echo ===================================================
echo Project ID : wpyfwkcevgdhkazeesdq
echo Supabase URL: https://wpyfwkcevgdhkazeesdq.supabase.co
echo.

:: Cek apakah folder supabase sudah ada
if not exist "supabase" (
    echo [*] Menyiapkan struktur folder Supabase...
    npx supabase init
)

echo [*] Mengirim perubahan SQL / Migration ke Cloud Supabase...
npx supabase db push

if %errorlevel% equ 0 (
    echo.
    echo ===================================================
    echo  BERHASIL! Database Supabase Anda telah diperbarui!
    echo ===================================================
) else (
    echo.
    echo ===================================================
    echo  PERHATIAN: Jika gagal karena belum login/link,
    echo  jalankan langkah ini di Terminal:
    echo  1. npx supabase login
    echo  2. npx supabase link --project-ref wpyfwkcevgdhkazeesdq
    echo ===================================================
)

echo.
pause

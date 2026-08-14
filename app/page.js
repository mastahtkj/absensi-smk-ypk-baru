'use client';

import { useState, useEffect } from 'react';

export default function DashboardPage() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Ambil data guru yang sedang login dari localStorage / Session
    const savedUser = localStorage.getItem('user_guru');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  if (!user) return <p>Loading data...</p>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-2">Selamat Datang, {user.nama}</h1>
      <p className="mb-4">Role Anda: <span className="font-semibold text-blue-600">{user.role}</span></p>

      <hr className="my-4" />

      <h2 className="text-xl font-bold mb-3">Menu Fitur:</h2>

      <div className="flex gap-4">
        {/* ======================================================= */}
        {/* FITUR BISA DIAKSES OLEH SEMUA (ADMIN & GURU)            */}
        {/* ======================================================= */}
        <button 
          onClick={() => alert("Membuka menu Edit Absensi")}
          className="bg-green-500 text-white px-4 py-2 rounded">
          Edit Status Absensi (Hadir/Sakit/Izin)
        </button>

        {/* ======================================================= */}
        {/* FITUR KHUSUS ADMIN (HANYA GURU 1, 2, 3, 8, 28)           */}
        {/* ======================================================= */}
        {user.role === 'admin' && (
          <>
            <button 
              onClick={() => alert("Membuka Kelola Siswa")}
              className="bg-blue-600 text-white px-4 py-2 rounded">
              Tambah / Edit Data Siswa
            </button>

            <button 
              onClick={() => alert("Membuka Kelola Guru")}
              className="bg-purple-600 text-white px-4 py-2 rounded">
              Kelola Data Guru & Akun
            </button>

            <button 
              onClick={() => alert("Membuka Setting RFID")}
              className="bg-orange-500 text-white px-4 py-2 rounded">
              Setting Kartu RFID
            </button>
          </>
        )}
      </div>
    </div>
  );
}

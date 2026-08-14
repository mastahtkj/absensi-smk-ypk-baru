import { NextResponse } from 'next/server';

// Data Pengujian Akun Admin Iqbal
const TESTING_ACCOUNT = {
  nama: "Iqbal",
  role: "Admin",
  rfidUid: "1A2B3C4D", // Ganti dengan UID Kartu RFID Iqbal untuk test
};

export async function POST(request) {
  try {
    const body = await request.json();
    const { uid, deviceId } = body;

    // Cek apakah UID yang melakukan Tap adalah Kartu Test Iqbal (Admin)
    if (uid === TESTING_ACCOUNT.rfidUid) {
      const timeNow = new Date().toLocaleTimeString('id-ID');
      
      console.log(`[TEST ALAT RFID SUCCESS] Admin: ${TESTING_ACCOUNT.nama} | UID: ${uid}`);

      return NextResponse.json({
        status: 'success',
        isTest: true,
        message: `Pengujian alat berhasil oleh ${TESTING_ACCOUNT.nama}`,
        data: {
          user: TESTING_ACCOUNT.nama,
          uid: uid,
          time: timeNow,
          deviceId: deviceId || 'ESP32_MAIN_GATE'
        }
      });
    }

    // Jika Siswa Biasa (Proses Absensi Normal)
    return NextResponse.json({
      status: 'success',
      isTest: false,
      message: 'Presensi siswa berhasil dicatat.'
    });

  } catch (error) {
    return NextResponse.json(
      { status: 'error', message: error.message },
      { status: 500 }
    );
  }
}

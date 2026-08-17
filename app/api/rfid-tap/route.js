import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const KIRIMI_USER_CODE = process.env.KIRIMI_USER_CODE || process.env.NEXT_PUBLIC_KIRIMI_USER_CODE;
const KIRIMI_SECRET_KEY = process.env.KIRIMI_SECRET_KEY || process.env.NEXT_PUBLIC_KIRIMI_SECRET_KEY;
const KIRIMI_DEVICE_ID = process.env.KIRIMI_DEVICE_ID || process.env.NEXT_PUBLIC_KIRIMI_DEVICE_ID;

async function sendKirimiWA(phone, message) {
  if (!KIRIMI_USER_CODE || !KIRIMI_SECRET_KEY || !KIRIMI_DEVICE_ID) {
    console.error('⚠️ Variabel Kirimi.id belum diatur di Vercel');
    return false;
  }

  let formattedPhone = phone.toString().replace(/[^0-9]/g, '');
  if (formattedPhone.startsWith('0')) formattedPhone = '62' + formattedPhone.slice(1);
  else if (formattedPhone.startsWith('8')) formattedPhone = '62' + formattedPhone;

  try {
    const res = await fetch('https://dash.kirimi.id/api/v2/send-message', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Code': KIRIMI_USER_CODE,
        'Secret-Key': KIRIMI_SECRET_KEY,
        'Device-Id': KIRIMI_DEVICE_ID
      },
      body: JSON.stringify({
        device: KIRIMI_DEVICE_ID,
        phone: formattedPhone,
        message: message
      })
    });

    const resText = await res.text();
    console.log("Respon Kirimi:", resText);
    return res.ok || resText.includes('success') || resText.includes('true');
  } catch (err) {
    console.error('Error pengiriman Kirimi API:', err);
    return false;
  }
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const rawUid = body.uid || body.rfid_uid;

    if (!rawUid) {
      return NextResponse.json({ success: false, message: 'UID RFID tidak valid' }, { status: 400 });
    }

    const cleanUid = rawUid.toString().trim().toUpperCase();

    // Update real-time modal pendaftaran kartu di frontend
    await supabase.from('latest_scan').upsert({ id: 1, uid: cleanUid, updated_at: new Date().toISOString() });

    let namaUser = 'Tidak Dikenal';
    let kelasUser = 'Umum';
    let noWaTarget = null;
    let targetRole = 'Orang Tua / Wali';
    let isGuruOrAdmin = false;

    // Cek Guru terlebih dahulu
    const { data: guru } = await supabase.from('guru').select('nama, no_wa, role').eq('rfid_uid', cleanUid).maybeSingle();

    if (guru) {
      namaUser = guru.nama;
      kelasUser = guru.role === 'admin' ? "MASTER'K" : 'Guru / Staff';
      noWaTarget = guru.no_wa;
      targetRole = 'Guru / Staff';
      isGuruOrAdmin = true;
    } else {
      // Jika bukan Guru, Cek Siswa
      const { data: siswa } = await supabase.from('rfid_cards').select('nama, kelas, no_wa, no_hp_ortu').eq('rfid_uid', cleanUid).maybeSingle();
      if (siswa) {
        namaUser = siswa.nama;
        kelasUser = siswa.kelas;
        noWaTarget = siswa.no_hp_ortu || siswa.no_wa;
      }
    }

    const now = new Date();
    const jakartaTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Jakarta" }));
    const hours = jakartaTime.getHours();
    const minutes = jakartaTime.getMinutes();
    const totalMinutes = hours * 60 + minutes;

    let statusPresensi = 'Hadir';

    // Logika Jam untuk Siswa (Bebas jam untuk Guru/Admin)
    if (!isGuruOrAdmin) {
      const limitEnd = 7 * 60 + 25; // 07:25 (lewat dari ini dinyatakan telat)
      if (totalMinutes > limitEnd) {
        statusPresensi = 'Telat';
      } else {
        statusPresensi = 'Hadir';
      }
    }

    const { data: absensiLog, error: absensiErr } = await supabase
      .from('absensi')
      .insert({
        rfid_uid: cleanUid,
        nama: namaUser,
        kelas: kelasUser,
        status: statusPresensi,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    let waSentStatus = false;

    if (noWaTarget) {
      const waktuTap = jakartaTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
      const pesanWA = `*PRESENSI DIGITAL SMK YPK MEDAN*\n\n` +
        `Yth. Bapak/Ibu ${targetRole},\n` +
        `Pemberitahuan presensi kehadiran:\n\n` +
        `👤 *Nama:* ${namaUser}\n` +
        `🏫 *Kelas/Jabatan:* ${kelasUser}\n` +
        `⏰ *Waktu Tap:* ${waktuTap} WIB\n` +
        `📌 *Status Presensi:* ${statusPresensi}\n\n` +
        `Terima kasih. Pesan ini dikirim otomatis oleh sistem presensi RFID sekolah.`;

      waSentStatus = await sendKirimiWA(noWaTarget, pesanWA);

      if (waSentStatus && absensiLog?.id) {
        await supabase.from('absensi').update({ wa_sent: true }).eq('id', absensiLog.id);
      }
    }

    return NextResponse.json({
      success: true,
      data: { uid: cleanUid, nama: namaUser, kelas: kelasUser, status: statusPresensi, wa_sent: waSentStatus }
    });

  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
import { createClient } from '@supabase/supabase-js';

// Pastikan menambahkan variabel ini di Environment Variables Vercel
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const KIRIMI_API_KEY = process.env.KIRIMI_API_KEY; // Token dari dashboard Kirimi.id

export async function POST(req) {
    try {
        const body = await req.json();
        const rfid_uid = body.rfid_uid;
        const deviceTimeStatus = body.status; // Menerima status waktu dari Arduino

        if (!rfid_uid) {
            return new Response(JSON.stringify({ error: "UID tidak terdeteksi" }), { status: 400 });
        }

        let nama = "TIDAK DIKENAL";
        let kelas = "-";
        let finalStatus = "Hadir";
        let phoneTarget = null;
        let isGuru = false;
        let isKnown = false;

        // 1. Cek Apakah Kartu adalah Guru
        const { data: guru } = await supabase.from('guru').select('*').eq('rfid_uid', rfid_uid).single();
        
        if (guru) {
            isKnown = true;
            isGuru = true;
            nama = guru.nama;
            kelas = "Guru / Staff";
            finalStatus = "Hadir"; // GURU BEBAS JAM ABSEN, SELALU HADIR
            phoneTarget = guru.no_wa;
        } else {
            // 2. Cek Apakah Kartu adalah Siswa
            const { data: siswa } = await supabase.from('rfid_cards').select('*').eq('rfid_uid', rfid_uid).single();
            if (siswa) {
                isKnown = true;
                nama = siswa.nama;
                kelas = siswa.kelas;
                finalStatus = deviceTimeStatus; // Mengikuti jam dari Arduino (06:45 - 07:25)
                phoneTarget = siswa.no_hp_ortu;
            }
        }

        // 3. Update Latest Scan di Dashboard Admin
        await supabase.from('latest_scan').update({ uid: rfid_uid, updated_at: new Date().toISOString() }).eq('id', 1);

        if (!isKnown) {
            // Jika UID tidak terdaftar di database manapun
            return new Response(JSON.stringify({ error: "Kartu Tidak Terdaftar" }), { status: 404 });
        }

        // 4. Insert Riwayat Absensi ke Supabase
        const { data: absensiRecord, error: dbError } = await supabase.from('absensi').insert({
            rfid_uid: rfid_uid,
            nama: nama,
            kelas: kelas,
            status: finalStatus,
            wa_sent: false
        }).select().single();

        if (dbError) throw dbError;

        // 5. Eksekusi Notifikasi WA via KIRIMI.ID
        if (phoneTarget && phoneTarget !== "" && phoneTarget !== "-") {
            const waktuWIB = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
            const message = `*ABSENSI DIGITAL SMK YPK MEDAN*\n----------------------------------------\nNama   : ${nama}\nKelas  : ${kelas}\nStatus : *${finalStatus.toUpperCase()}*\nWaktu  : ${waktuWIB} WIB\n----------------------------------------\n_Pesan Otomatis Dari Server Smk Ypk._`;

            try {
                // Endpoint standar Kirimi.id untuk kirim pesan text
                const waRes = await fetch('[https://wa.kirimi.id/api/send](https://wa.kirimi.id/api/send)', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${KIRIMI_API_KEY}`
                    },
                    body: JSON.stringify({
                        receiver: phoneTarget,
                        message: message
                    })
                });

                if (waRes.ok) {
                    // Update status WA jika berhasil terkirim
                    await supabase.from('absensi').update({ wa_sent: true }).eq('id', absensiRecord.id);
                }
            } catch (waError) {
                console.error("Gagal mengirim WA via Kirimi.id", waError);
            }
        }

        // 6. Return response sukses ke Arduino IDE
        return new Response(JSON.stringify({
            success: true,
            nama: nama,
            kelas: kelas,
            status: finalStatus
        }), { status: 200, headers: { "Content-Type": "application/json" } });

    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
}

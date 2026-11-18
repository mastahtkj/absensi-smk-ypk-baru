import { NextResponse } from 'next/server';
import { supabaseServer } from '../../lib/supabaseServer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DEFAULT_WELCOME_MESSAGE = {
  id: 'MSG-INIT-WELCOME',
  nama: 'MUHAMMAD IQBAL RANGKUTI,S.KOM., Gr.',
  role: 'master',
  pesan: 'Selamat datang di Ruang Koordinasi & Chat SMK YPK Medan. Silakan gunakan ruang ini untuk koordinasi KBM dan kedinasan.',
  waktu: '07:30 WIB',
  timestamp: Date.now() - 3600000,
  kategori: 'Guru & Admin',
  senderId: 'GURU-29',
  userKelas: '👑 Master Admin',
  fotoUrl: '/guru/04_muhammad_iqbal_rangkuti_kajur_tjkt.jpg',
};

// Ambil pesan chat tersimpan dari database (tb_guru id_guru 29)
async function getStoredChatMessages() {
  try {
    const { data, error } = await supabaseServer
      .from('tb_guru')
      .select('biodata')
      .eq('id_guru', 29)
      .maybeSingle();

    if (error || !data) return [DEFAULT_WELCOME_MESSAGE];

    const bio = data.biodata || {};
    const messages = Array.isArray(bio.school_chat_messages) && bio.school_chat_messages.length > 0
      ? bio.school_chat_messages
      : [DEFAULT_WELCOME_MESSAGE];

    return messages;
  } catch (e) {
    console.warn('Error reading chat messages from db:', e);
    return [DEFAULT_WELCOME_MESSAGE];
  }
}

// Simpan pesan chat ke database
async function saveChatMessages(messages) {
  try {
    const { data: guruData } = await supabaseServer
      .from('tb_guru')
      .select('biodata')
      .eq('id_guru', 29)
      .maybeSingle();

    const currentBio = guruData?.biodata || {};
    // Simpan maksimal 200 pesan terakhir agar efisien
    const trimmed = messages.slice(-200);

    const { error } = await supabaseServer
      .from('tb_guru')
      .update({
        biodata: {
          ...currentBio,
          school_chat_messages: trimmed,
          school_chat_updated_at: new Date().toISOString(),
        },
      })
      .eq('id_guru', 29);

    if (error) {
      console.warn('Error saving chat messages to db:', error);
      return false;
    }
    return true;
  } catch (e) {
    console.warn('Error saving chat messages to db:', e);
    return false;
  }
}

export async function GET() {
  try {
    const messages = await getStoredChatMessages();
    return NextResponse.json({
      success: true,
      messages,
      total: messages.length,
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, message: err.message, messages: [DEFAULT_WELCOME_MESSAGE] },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const newMsg = body.message;

    if (!newMsg || !newMsg.pesan || !String(newMsg.pesan).trim()) {
      return NextResponse.json(
        { success: false, message: 'Isi pesan tidak boleh kosong.' },
        { status: 400 }
      );
    }

    const currentMessages = await getStoredChatMessages();

    // Cek apakah pesan dengan ID ini sudah ada untuk mencegah duplikasi
    const exists = currentMessages.some((m) => m.id === newMsg.id);
    let updatedList = currentMessages;

    if (!exists) {
      const sanitizedMsg = {
        id: newMsg.id || `MSG-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        nama: String(newMsg.nama || 'Pengguna').trim(),
        role: String(newMsg.role || 'guru').trim(),
        pesan: String(newMsg.pesan).trim(),
        waktu: newMsg.waktu || new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' }) + ' WIB',
        timestamp: newMsg.timestamp || Date.now(),
        kategori: newMsg.kategori || 'Guru & Admin',
        senderId: String(newMsg.senderId || '').trim(),
        userKelas: String(newMsg.userKelas || 'SMK YPK').trim(),
        fotoUrl: newMsg.fotoUrl || '',
      };

      updatedList = [...currentMessages, sanitizedMsg];
      await saveChatMessages(updatedList);
    }

    return NextResponse.json({
      success: true,
      message: newMsg,
      total: updatedList.length,
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request) {
  try {
    const body = await request.json();
    const { action, messageId, requesterRole, requesterId } = body;

    const currentMessages = await getStoredChatMessages();

    if (action === 'recall' && messageId) {
      // Tarik pesan tertentu
      const updatedList = currentMessages.map((m) => {
        if (m.id === messageId) {
          // Hanya pengirim atau admin/master yang boleh menarik pesan
          if (m.senderId === requesterId || requesterRole === 'master' || requesterRole === 'admin') {
            return {
              ...m,
              isRecalled: true,
              pesan: '🚫 Pesan ini telah ditarik oleh pengirim.',
            };
          }
        }
        return m;
      });

      await saveChatMessages(updatedList);
      return NextResponse.json({ success: true, messages: updatedList });
    }

    if (action === 'clear') {
      // Hanya master admin yang boleh membersihkan seluruh pesan
      if (requesterRole === 'master' || requesterRole === 'admin' || requesterId === 'GURU-29' || requesterId === '29') {
        const cleared = [DEFAULT_WELCOME_MESSAGE];
        await saveChatMessages(cleared);
        return NextResponse.json({ success: true, messages: cleared });
      }
      return NextResponse.json({ success: false, message: 'Tidak memiliki izin membersihkan chat.' }, { status: 403 });
    }

    return NextResponse.json({ success: false, message: 'Aksi tidak valid.' }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

const { createClient } = require('@supabase/supabase-js');
const { OFFICIAL_SMK_YPK_TEACHERS } = require('../app/data/guruData.js');

const SUPABASE_URL = 'https://wpyfwkcevgdhkazeesdq.supabase.co';
const SUPABASE_KEY = 'sb_publishable_m_6VQvv9JT7FimMwws341w_NA_tukF6';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function syncTeachersToSupabase() {
  console.log(`Syncing ${OFFICIAL_SMK_YPK_TEACHERS.length} teachers to Supabase tb_guru...`);

  // Fetch existing teachers
  const { data: existingGuru, error: fetchErr } = await supabase.from('tb_guru').select('*');
  if (fetchErr) {
    console.error('Fetch tb_guru error:', fetchErr);
    return;
  }

  const existingMap = new Map();
  (existingGuru || []).forEach(g => {
    existingMap.set(g.id_guru, g);
    if (g.nama_guru) existingMap.set(g.nama_guru.trim().toLowerCase(), g);
  });

  let synced = 0;
  for (const t of OFFICIAL_SMK_YPK_TEACHERS) {
    const rawId = t.rawId;
    const existing = existingMap.get(rawId) || existingMap.get(t.nama.trim().toLowerCase());

    const record = {
      id_guru: rawId,
      nip: t.nip || '-',
      nama_guru: t.nama,
      username: existing?.username || t.nama.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 20),
      inisial: t.inisial || 'GR',
      mapel: t.mapel || t.jabatan || 'Guru',
      foto_url: t.foto_url,
      role: t.role || 'Guru',
      biodata: {
        ...(existing?.biodata || {}),
        nama: t.nama,
        inisial: t.inisial,
        jabatan: t.jabatan,
        mapel: t.mapel,
        foto_url: t.foto_url,
        bio: t.bio
      }
    };

    // Keep face descriptor if already enrolled
    if (existing?.face_descriptor) {
      record.face_descriptor = existing.face_descriptor;
    }

    const { error: upsertErr } = await supabase.from('tb_guru').upsert(record, { onConflict: 'id_guru' });
    if (upsertErr) {
      console.error(`Failed to upsert teacher ${t.nama}:`, upsertErr.message);
    } else {
      synced++;
    }
  }

  console.log(`Successfully synced ${synced}/${OFFICIAL_SMK_YPK_TEACHERS.length} teachers to tb_guru!`);
}

syncTeachersToSupabase();

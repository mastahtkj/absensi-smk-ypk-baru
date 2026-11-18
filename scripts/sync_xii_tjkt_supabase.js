const { createClient } = require('@supabase/supabase-js');
const { OFFICIAL_SMK_YPK_STUDENTS } = require('../app/data/siswaData.js');

const SUPABASE_URL = 'https://wpyfwkcevgdhkazeesdq.supabase.co';
const SUPABASE_KEY = 'sb_publishable_m_6VQvv9JT7FimMwws341w_NA_tukF6';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function syncToSupabase() {
  console.log(`Reading OFFICIAL_SMK_YPK_STUDENTS: ${OFFICIAL_SMK_YPK_STUDENTS.length} total students.`);
  
  // 1. Check current count in Supabase
  const { count: beforeCount } = await supabase.from('tb_siswa').select('*', { count: 'exact', head: true });
  console.log(`Current tb_siswa in Supabase: ${beforeCount} rows.`);

  // 2. Filter XII TJKT students
  const xiiTjkt = OFFICIAL_SMK_YPK_STUDENTS.filter(s => s.kelas === 'XII TJKT');
  console.log(`Found ${xiiTjkt.length} XII TJKT students to sync.`);

  // 3. Upsert all OFFICIAL_SMK_YPK_STUDENTS to make sure ALL 240 are in Supabase!
  const batchSize = 25;
  let inserted = 0;

  for (let i = 0; i < OFFICIAL_SMK_YPK_STUDENTS.length; i += batchSize) {
    const chunk = OFFICIAL_SMK_YPK_STUDENTS.slice(i, i + batchSize);
    const rows = chunk.map(s => ({
      id_siswa: s.rawId || s.id,
      nama_siswa: s.nama || s.nama_siswa,
      username: s.username,
      password: s.password,
      kelas: s.kelas,
      jurusan: s.jurusan,
      role: s.role || 'Siswa',
      biodata: s.biodata || {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    const { error } = await supabase
      .from('tb_siswa')
      .upsert(rows, { onConflict: 'id_siswa', ignoreDuplicates: false });

    if (error) {
      console.error(`Batch ${i} upsert error:`, error.message);
      // Try insert if upsert fails
      const { error: insErr } = await supabase.from('tb_siswa').insert(rows);
      if (insErr) console.error(`Batch ${i} insert fallback error:`, insErr.message);
    } else {
      inserted += rows.length;
      console.log(`✓ Upserted ${inserted} / ${OFFICIAL_SMK_YPK_STUDENTS.length} students.`);
    }
  }

  // 4. Verify count in Supabase
  const { count: afterCount, error: cntErr } = await supabase.from('tb_siswa').select('*', { count: 'exact', head: true });
  console.log(`\nFinal tb_siswa count in Supabase: ${afterCount} rows! (Error: ${cntErr ? cntErr.message : 'none'})`);

  // Verify XII TJKT specifically in Supabase
  const { data: xiiData, error: xiiErr } = await supabase
    .from('tb_siswa')
    .select('id_siswa, nama_siswa, username, kelas')
    .eq('kelas', 'XII TJKT');

  console.log(`XII TJKT in Supabase: ${xiiData ? xiiData.length : 0} rows found.`);
  if (xiiData && xiiData.length > 0) {
    console.log(`First student: ${xiiData[0].nama_siswa} (${xiiData[0].username})`);
    console.log(`Last student: ${xiiData[xiiData.length - 1].nama_siswa} (${xiiData[xiiData.length - 1].username})`);
  }
}

syncToSupabase().catch(err => {
  console.error('Fatal sync error:', err);
});

const { createClient } = require('../node_modules/@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = 'https://wpyfwkcevgdhkazeesdq.supabase.co';
const supabaseKey = 'sb_publishable_m_6VQvv9JT7FimMwws341w_NA_tukF6';

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspect() {
  const { data: students, error } = await supabase
    .from('students')
    .select('id, nisn, name, class_name, face_descriptor, photo_url')
    .limit(3000);
  
  if (error) {
    console.error('Error fetching students:', error);
    return;
  }
  console.log('Total in students table:', students.length);

  const nameMap = new Map();
  students.forEach(s => {
    const key = (s.name || '').trim().toLowerCase();
    if (!nameMap.has(key)) nameMap.set(key, []);
    nameMap.get(key).push(s);
  });

  let dups = 0;
  for (const [name, list] of nameMap.entries()) {
    if (list.length > 1) {
      dups++;
      if (dups <= 15) {
        console.log(`[DUP ${dups}] "${name}" (${list.length} entries):`);
        list.forEach(item => {
          console.log(`   id: ${item.id}, nisn: "${item.nisn}", class: "${item.class_name}", hasDescriptor: ${!!item.face_descriptor}`);
        });
      }
    }
  }
  console.log('Total names with duplicates:', dups);

  // Check tb_siswa
  const { data: siswaData, error: errSiswa } = await supabase.from('tb_siswa').select('id_siswa, nis, nisn, nama_siswa, kelas').limit(1000);
  const { data: guruData, error: errGuru } = await supabase.from('tb_guru').select('id_guru, nip, nama_guru').limit(500);

  console.log('tb_siswa count:', siswaData ? siswaData.length : 0);
  console.log('tb_guru count:', guruData ? guruData.length : 0);
  console.log('Sum tb_siswa + tb_guru:', (siswaData?.length || 0) + (guruData?.length || 0));
}

inspect();

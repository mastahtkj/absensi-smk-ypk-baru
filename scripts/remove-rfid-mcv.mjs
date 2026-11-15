// =============================================================
//  Hapus sisa kolom RFID dari MasterControlView
// =============================================================
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.argv[2] || '.');
const p = path.join(root, 'app', 'components', 'MasterControlView.js');
let src = fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n');
const report = [];

function rep(label, from, to) {
  if (!src.includes(from)) {
    report.push(`LEWAT : ${label}`);
    return;
  }
  src = src.split(from).join(to);
  report.push(`DIUBAH: ${label}`);
}

rep(
  'state newStudentRfid',
  "  const [newStudentRfid, setNewStudentRfid] = useState('');\n",
  ''
);

rep(
  'setNewStudentRfid reset',
  "        setNewStudentRfid('');\n",
  ''
);

rep(
  'currentRfid (edit siswa)',
  "    const currentRfid = (student.rfid && student.rfid !== '-') ? student.rfid : (student.rfid_uid || student.uid_rfid || '');\n",
  ''
);

rep(
  'rfid list guru',
  "        rfid: g.rfid_uid || g.uid_rfid || '-',\n",
  ''
);

rep(
  'rfid list siswa',
  "        rfid: s.rfid_uid || s.uid_rfid || '-',\n",
  ''
);

rep(
  'pencarian rfid',
  "        const rMatch = String(u.rfid || '').toLowerCase().includes(q);\n",
  ''
);

rep(
  'return pencarian rfid',
  '          return nMatch || rMatch || kMatch;',
  '          return nMatch || kMatch;'
);

rep(
  'judul tombol edit',
  'title={u.isGuru ? "Edit Data Guru (Nama, Inisial, Mapel, NIP, RFID)" : "Edit Data Siswa (Nama, Kelas, RFID)"}',
  'title={u.isGuru ? "Edit Data Guru (Nama, Inisial, Mapel, NIP)" : "Edit Data Siswa (Nama, Kelas)"}'
);

rep(
  'info kartu RFID (guru)',
  '\u{1F4F8} <b>Sistem Presensi AI Face Active</b> (Kartu RFID telah digantikan sepenuhnya dengan Biometrik Wajah AI).',
  '\u{1F4F8} <b>Sistem Presensi AI Face Active</b> (sistem RFID kartu sudah dihapus sepenuhnya; presensi memakai Biometrik Wajah AI).'
);

fs.writeFileSync(p, src, 'utf8');

console.log('=== Laporan RFID MasterControlView ===');
report.forEach((r) => console.log(' - ' + r));
const sisa = (src.match(/[Rr]fid/g) || []).length;
console.log(`\nSisa referensi rfid: ${sisa}`);
report.forEach(() => {});
console.log('Daftar sisa:');
(src.match(/.*[Rr]fid.*/g) || []).slice(0, 20).forEach((l) => console.log('   > ' + l.trim()));
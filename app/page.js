// Gantilah fungsi useMemo filteredData pada page.js Anda dengan kode ini:
const filteredData = useMemo(() => {
  let list = [...siswaList];

  // 1. Filter Tingkat
  if (filterTingkat !== 'Semua Tingkat') {
    if (filterTingkat === 'Kelas X') list = list.filter((s) => REGEX_KELAS_X.test(s.kelas || ''));
    else if (filterTingkat === 'Kelas XI') list = list.filter((s) => REGEX_KELAS_XI.test(s.kelas || ''));
    else if (filterTingkat === 'Kelas XII') list = list.filter((s) => REGEX_KELAS_XII.test(s.kelas || ''));
    else if (filterTingkat === 'Guru / Staff') list = list.filter((s) => s.isGuru || s.kelas === 'Guru / Staff');
  }

  // 2. Filter Jurusan (Diperbaiki agar mencakup singkatan dan nama lengkap)
  if (filterJurusan !== 'Semua Jurusan') {
    if (filterJurusan === 'Guru / Staff') {
      list = list.filter((s) => s.isGuru || s.kelas === 'Guru / Staff');
    } else {
      // Mapping nama jurusan lengkap ke kata kunci pencarian
      let keywords = [];
      if (filterJurusan.includes('Jaringan') || filterJurusan.includes('Komputer')) keywords = ['tjkt', 'tkj', 'jaringan', 'komputer'];
      else if (filterJurusan.includes('Akuntansi')) keywords = ['akl', 'akuntansi'];
      else if (filterJurusan.includes('Perkantoran') || filterJurusan.includes('Manajemen')) keywords = ['mplb', 'otkp', 'perkantoran'];
      else if (filterJurusan.includes('Pemasaran')) keywords = ['pemasaran', 'bdp'];

      list = list.filter((s) => {
        const strJurusan = (s.jurusan || '').toLowerCase();
        const strKelas = (s.kelas || '').toLowerCase();
        return keywords.some((kw) => strJurusan.includes(kw) || strKelas.includes(kw));
      });
    }
  }

  // 3. Pencarian Nama/Kelas
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    list = list.filter((s) => 
      (s.nama || '').toLowerCase().includes(q) || 
      (s.kelas || '').toLowerCase().includes(q)
    );
  }

  return list;
}, [siswaList, filterTingkat, filterJurusan, searchQuery]);

class UserModel {
  final dynamic id;
  final String uidRfid;
  final String nama;
  final String username;
  final String role;
  final String? kelas;
  final String? jurusan;
  final String? inisial;
  final Map<String, dynamic>? biodata;

  UserModel({
    required this.id,
    required this.uidRfid,
    required this.nama,
    required this.username,
    required this.role,
    this.kelas,
    this.jurusan,
    this.inisial,
    this.biodata,
  });

  bool get isSiswa => role.toLowerCase().contains('siswa') && !isAdmin;
  bool get isGuru => role.toLowerCase().contains('guru');
  bool get isAdmin =>
      role.toLowerCase().contains('admin') ||
      username.toLowerCase() == 'admin' ||
      username.toLowerCase() == 'iqbal';

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['id_siswa'] ?? json['id_guru'] ?? json['id'] ?? 0,
      uidRfid: (json['uid_rfid'] ?? json['rfid_uid'] ?? json['rfid'] ?? '').toString().trim(),
      nama: (json['nama_siswa'] ?? json['nama_guru'] ?? json['nama'] ?? '').toString().trim(),
      username: (json['username'] ?? json['nama_siswa'] ?? json['nama_guru'] ?? '').toString().trim(),
      role: (json['role'] ?? 'Siswa').toString().trim(),
      kelas: json['kelas']?.toString(),
      jurusan: json['jurusan']?.toString(),
      inisial: json['inisial']?.toString(),
      biodata: json['biodata'] is Map<String, dynamic> ? json['biodata'] : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'uid_rfid': uidRfid,
      'nama': nama,
      'username': username,
      'role': role,
      'kelas': kelas,
      'jurusan': jurusan,
      'inisial': inisial,
      'biodata': biodata,
    };
  }
}

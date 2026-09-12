class InvalModel {
  final int id;
  final String tanggal;
  final String namaGuruUtama;
  final String namaGuruInval;
  final String kelas;
  final String? mapel;
  final String? jamKe;
  final String? materiNama;
  final String? statusInval;

  InvalModel({
    required this.id,
    required this.tanggal,
    required this.namaGuruUtama,
    required this.namaGuruInval,
    required this.kelas,
    this.mapel,
    this.jamKe,
    this.materiNama,
    this.statusInval,
  });

  factory InvalModel.fromJson(Map<String, dynamic> json) {
    return InvalModel(
      id: json['id'] is int ? json['id'] : int.tryParse(json['id'].toString()) ?? 0,
      tanggal: json['tanggal']?.toString() ?? '',
      namaGuruUtama: (json['nama_guru_utama'] ?? '').toString(),
      namaGuruInval: (json['nama_guru_inval'] ?? '').toString(),
      kelas: (json['kelas'] ?? '').toString(),
      mapel: json['mapel']?.toString(),
      jamKe: json['jam_ke']?.toString(),
      materiNama: json['materi_nama']?.toString(),
      statusInval: json['status_inval']?.toString() ?? 'Ditugaskan',
    );
  }
}

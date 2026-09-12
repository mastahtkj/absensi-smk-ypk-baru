class AttendanceModel {
  final int id;
  final String? rfidUid;
  final String nama;
  final String? kelas;
  final String status;
  final DateTime createdAt;
  final String? updatedBy;
  final DateTime? updatedAt;

  AttendanceModel({
    required this.id,
    this.rfidUid,
    required this.nama,
    this.kelas,
    required this.status,
    required this.createdAt,
    this.updatedBy,
    this.updatedAt,
  });

  bool get isHadir => status.toLowerCase() == 'hadir';
  bool get isTelat => status.toLowerCase().contains('telat') || status.toLowerCase().contains('terlambat');
  bool get isIzin => status.toLowerCase() == 'izin';
  bool get isSakit => status.toLowerCase() == 'sakit';
  bool get isAlfa => status.toLowerCase() == 'alfa' || status.toLowerCase() == 'alpha';

  factory AttendanceModel.fromJson(Map<String, dynamic> json) {
    return AttendanceModel(
      id: json['id'] is int ? json['id'] : int.tryParse(json['id'].toString()) ?? 0,
      rfidUid: json['rfid_uid']?.toString(),
      nama: (json['nama'] ?? 'Tanpa Nama').toString(),
      kelas: json['kelas']?.toString(),
      status: (json['status'] ?? 'Hadir').toString(),
      createdAt: json['created_at'] != null
          ? DateTime.tryParse(json['created_at'].toString())?.toLocal() ?? DateTime.now()
          : DateTime.now(),
      updatedBy: json['updated_by']?.toString(),
      updatedAt: json['updated_at'] != null
          ? DateTime.tryParse(json['updated_at'].toString())?.toLocal()
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'rfid_uid': rfidUid,
      'nama': nama,
      'kelas': kelas,
      'status': status,
      'created_at': createdAt.toIso8601String(),
      'updated_by': updatedBy,
      'updated_at': updatedAt?.toIso8601String(),
    };
  }
}

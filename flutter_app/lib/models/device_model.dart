class DeviceModel {
  final int id;
  final int? idSiswa;
  final String? uidRfid;
  final String namaSiswa;
  final String deviceId;
  final String deviceName;
  final DateTime lastLogin;

  DeviceModel({
    required this.id,
    this.idSiswa,
    this.uidRfid,
    required this.namaSiswa,
    required this.deviceId,
    required this.deviceName,
    required this.lastLogin,
  });

  factory DeviceModel.fromJson(Map<String, dynamic> json) {
    return DeviceModel(
      id: json['id'] is int ? json['id'] : int.tryParse(json['id'].toString()) ?? 0,
      idSiswa: json['id_siswa'] is int ? json['id_siswa'] : int.tryParse(json['id_siswa']?.toString() ?? ''),
      uidRfid: json['uid_rfid']?.toString(),
      namaSiswa: (json['nama_siswa'] ?? 'Siswa').toString(),
      deviceId: (json['device_id'] ?? '').toString(),
      deviceName: (json['device_name'] ?? 'Perangkat Siswa').toString(),
      lastLogin: json['last_login'] != null
          ? DateTime.tryParse(json['last_login'].toString())?.toLocal() ?? DateTime.now()
          : DateTime.now(),
    );
  }
}

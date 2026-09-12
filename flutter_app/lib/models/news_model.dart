class NewsModel {
  final String id;
  final String judul;
  final String kategori;
  final String? ringkasan;
  final String? konten;
  final String? gambarUrl;
  final String penulis;
  final String? tanggal;
  final String targetAudience;
  final String? badgeColor;
  final DateTime createdAt;

  NewsModel({
    required this.id,
    required this.judul,
    required this.kategori,
    this.ringkasan,
    this.konten,
    this.gambarUrl,
    required this.penulis,
    this.tanggal,
    required this.targetAudience,
    this.badgeColor,
    required this.createdAt,
  });

  factory NewsModel.fromJson(Map<String, dynamic> json) {
    return NewsModel(
      id: json['id']?.toString() ?? '',
      judul: (json['judul'] ?? 'Pengumuman').toString(),
      kategori: (json['kategori'] ?? 'Penting').toString(),
      ringkasan: json['ringkasan']?.toString(),
      konten: json['konten']?.toString(),
      gambarUrl: json['gambar_url']?.toString(),
      penulis: (json['penulis'] ?? 'SMK YPK MEDAN').toString(),
      tanggal: json['tanggal']?.toString(),
      targetAudience: (json['target_audience'] ?? 'Semua').toString(),
      badgeColor: json['badge_color']?.toString() ?? '#2563eb',
      createdAt: json['created_at'] != null
          ? DateTime.tryParse(json['created_at'].toString()) ?? DateTime.now()
          : DateTime.now(),
    );
  }
}

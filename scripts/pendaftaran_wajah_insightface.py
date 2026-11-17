#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
=============================================================================
📸 DAFTAR WAJAH BIOMETRIK PYTHON (INSIGHTFACE + OPENCV) - SMK YPK MEDAN
=============================================================================
Skrip Mandiri untuk PC Terminal Sekolah / Admin SMK YPK Medan.
Merekam sampel wajah siswa & guru menggunakan OpenCV + Model ArcFace InsightFace.
Vektor embedding langsung disinkronkan ke Cloud Database Supabase SMK YPK.
=============================================================================
"""

import sys
import os
import time
import json
import base64
import requests

try:
    import cv2
    import numpy as np
except ImportError:
    print("\n❌ Modul opencv-python atau numpy belum terpasang!")
    print("👉 Pasang dengan perintah: pip install -r scripts/requirements_insightface.txt\n")
    sys.exit(1)

try:
    import insightface
    from insightface.app import FaceAnalysis
except ImportError:
    print("\n⚠️ Modul insightface belum terpasang.")
    print("👉 Pasang dengan: pip install insightface onnxruntime\n")

# KONFIGURASI SUPABASE CLOUD (SMK YPK MEDAN)
SUPABASE_URL = os.environ.get('NEXT_PUBLIC_SUPABASE_URL', 'https://wpyfwkcevgdhkazeesdq.supabase.co')
SUPABASE_KEY = os.environ.get('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'sb_publishable_m_6VQvv9JT7FimMwws341w_NA_tukF6')

HEADERS = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
}

def compress_image_to_base64(frame, max_width=400):
    """Kompres frame OpenCV ke string base64 JPEG untuk disimpan di Supabase"""
    h, w = frame.shape[:2]
    if w > max_width:
        scale = max_width / float(w)
        frame = cv2.resize(frame, (max_width, int(h * scale)), interpolation=cv2.INTER_AREA)
    _, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
    b64_str = base64.b64encode(buffer).decode('utf-8')
    return f"data:image/jpeg;base64,{b64_str}"

def search_user_in_supabase(query_str):
    """Cari siswa atau guru di Supabase berdasarkan nama, username, atau ID"""
    query_clean = query_str.strip()
    results = []
    
    # 1. Cari Siswa
    try:
        url = f"{SUPABASE_URL}/rest/v1/tb_siswa?select=id_siswa,nama_siswa,username,kelas,jurusan,face_descriptor&or=(nama_siswa.ilike.*{query_clean}*,username.ilike.*{query_clean}*)&limit=10"
        res = requests.get(url, headers=HEADERS, timeout=8)
        if res.status_code == 200:
            for item in res.json():
                results.append({
                    'role': 'Siswa',
                    'id': f"SISWA-{item['id_siswa']}",
                    'rawId': item['id_siswa'],
                    'nama': item['nama_siswa'],
                    'username': item.get('username') or '-',
                    'kelas': item.get('kelas') or '-',
                    'jurusan': item.get('jurusan') or '-',
                    'has_face': bool(item.get('face_descriptor'))
                })
    except Exception as e:
        print(f"⚠️ Error search tb_siswa: {e}")

    # 2. Cari Guru
    try:
        url = f"{SUPABASE_URL}/rest/v1/tb_guru?select=id_guru,nama_guru,username,face_descriptor&or=(nama_guru.ilike.*{query_clean}*,username.ilike.*{query_clean}*)&limit=10"
        res = requests.get(url, headers=HEADERS, timeout=8)
        if res.status_code == 200:
            for item in res.json():
                results.append({
                    'role': 'Guru',
                    'id': f"GURU-{item['id_guru']}",
                    'rawId': item['id_guru'],
                    'nama': item['nama_guru'],
                    'username': item.get('username') or '-',
                    'kelas': 'Guru Mapel',
                    'jurusan': '-',
                    'has_face': bool(item.get('face_descriptor'))
                })
    except Exception as e:
        print(f"⚠️ Error search tb_guru: {e}")

    return results

def save_biometric_to_supabase(user, descriptor_list, photo_b64):
    """Menyimpan vektor biometrik ke Supabase Cloud"""
    table = 'tb_guru' if user['role'] == 'Guru' else 'tb_siswa'
    id_col = 'id_guru' if user['role'] == 'Guru' else 'id_siswa'
    raw_id = user['rawId']

    payload = {
        'face_descriptor': descriptor_list,
        'biodata': {
            'face_descriptor': descriptor_list,
            'face_photo_url': photo_b64,
            'face_registered_at': datetime.datetime.now().isoformat(),
            'method': 'insightface_arcface_opencv_python'
        }
    }

    try:
        url = f"{SUPABASE_URL}/rest/v1/{table}?{id_col}=eq.{raw_id}"
        patch_headers = {**HEADERS, 'Prefer': 'return=representation'}
        res = requests.patch(url, headers=patch_headers, json=payload, timeout=12)
        if res.status_code in (200, 204):
            return True, "Berhasil menyimpan ke Cloud Database Supabase"
        else:
            return False, f"HTTP {res.status_code}: {res.text}"
    except Exception as e:
        return False, str(e)

def main():
    print("=" * 70)
    print("📸 PENDAFTARAN BIOMETRIK WAJAH INSIGHTFACE & OPENCV - SMK YPK MEDAN")
    print("=" * 70)

    # 1. Pilih Akun yang akan didaftarkan
    while True:
        keyword = input("\n🔎 Masukkan Nama / Username Siswa atau Guru yang ingin didaftarkan (atau 'q' untuk keluar): ").strip()
        if keyword.lower() == 'q':
            sys.exit(0)
        if len(keyword) < 2:
            print("❌ Masukkan minimal 2 huruf untuk pencarian.")
            continue

        print(f"⏳ Mencari data '{keyword}' di database sekolah...")
        results = search_user_in_supabase(keyword)
        if not results:
            print(f"❌ Tidak ditemukan akun yang cocok dengan '{keyword}'. Coba kata kunci lain.")
            continue

        print(f"\n📋 Ditemukan {len(results)} akun:")
        for idx, u in enumerate(results, 1):
            face_status = "✅ Sudah Ada Wajah" if u['has_face'] else "❌ Belum Ada Wajah"
            print(f"  [{idx}] {u['role']}: {u['nama']} (Kelas: {u['kelas']}, User: {u['username']}) - {face_status}")

        pilih = input(f"\n👉 Pilih nomor akun (1-{len(results)}) atau 0 untuk batal: ").strip()
        if pilih == '0' or not pilih.isdigit():
            continue

        chosen_idx = int(pilih) - 1
        if 0 <= chosen_idx < len(results):
            selected_user = results[chosen_idx]
            break

    print(f"\n🎯 Akun Terpilih: {selected_user['role']} {selected_user['nama']} ({selected_user['kelas']})")

    # 2. Inisialisasi Model InsightFace
    print("\n⏳ Memuat Model InsightFace ArcFace (buffalo_sc)...")
    app = FaceAnalysis(name='buffalo_sc', root='~/.insightface', providers=['CPUExecutionProvider'])
    app.prepare(ctx_id=0, det_size=(320, 320))
    print("✅ Model InsightFace & OpenCV Siap!")

    # 3. Buka Kamera Webcam
    print("\n🎥 Membuka Webcam Logitech / Kamera PC...")
    cap = cv2.VideoCapture(0, cv2.CAP_DSHOW)
    if not cap.isOpened():
        cap = cv2.VideoCapture(0)

    if not cap.isOpened():
        print("❌ Gagal membuka kamera. Pastikan webcam tercolok dan tidak dipakai aplikasi lain.")
        return

    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)

    print("\n💡 PETUNJUK PEREKAMAN:")
    print(" - Arahkan wajah lurus ke kamera")
    print(" - Tekan tombol [SPASI] untuk merekam & mendaftarkan wajah")
    print(" - Tekan tombol [ESC] atau [Q] untuk membatalkan")

    captured_descriptor = None
    captured_frame = None

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        display_frame = frame.copy()
        h, w = display_frame.shape[:2]

        # Deteksi wajah menggunakan InsightFace
        faces = app.get(frame)

        # Gambar UI Panduan
        cv2.putText(display_frame, f"DAFTAR WAJAH: {selected_user['nama']} ({selected_user['role']})", (20, 40),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.75, (0, 255, 255), 2)
        cv2.putText(display_frame, "Tekan [SPASI] untuk Kunci Wajah | [ESC] Batal", (20, 75),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (200, 200, 200), 1)

        if len(faces) == 1:
            face = faces[0]
            bbox = face.bbox.astype(int)
            cv2.rectangle(display_frame, (bbox[0], bbox[1]), (bbox[2], bbox[3]), (0, 255, 0), 2)
            cv2.putText(display_frame, "SIAP DIREKAM (Tekan SPASI)", (bbox[0], bbox[1] - 10),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.65, (0, 255, 0), 2)
        elif len(faces) > 1:
            cv2.putText(display_frame, "PERINGATAN: Terlalu banyak wajah! Harus 1 orang saja.", (20, 110),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.65, (0, 0, 255), 2)
        else:
            cv2.putText(display_frame, "Mencari wajah di kamera...", (20, 110),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.65, (0, 165, 255), 2)

        cv2.imshow("SMK YPK MEDAN - Perekaman Wajah AI InsightFace", display_frame)
        key = cv2.waitKey(1) & 0xFF

        if key in (27, ord('q'), ord('Q')):
            print("⛔ Dibatalkan oleh pengguna.")
            break

        if key == 32:  # Tombol SPASI
            if len(faces) == 1:
                face = faces[0]
                norm_embedding = (face.embedding / np.linalg.norm(face.embedding)).tolist()
                captured_descriptor = norm_embedding
                captured_frame = frame
                print("\n📸 Wajah berhasil dikunci dengan akurasi ArcFace!")
                break
            else:
                print("⚠️ Posisikan tepat 1 wajah di depan kamera sebelum menekan SPASI.")

    cap.release()
    cv2.destroyAllWindows()

    if captured_descriptor and captured_frame is not None:
        print("\n⏳ Mengompres foto wajah...")
        photo_b64 = compress_image_to_base64(captured_frame)

        print("☁️ Mengunggah biometrik wajah ke Cloud Database Supabase SMK YPK...")
        ok, msg = save_biometric_to_supabase(selected_user, captured_descriptor, photo_b64)
        if ok:
            print("\n" + "=" * 70)
            print(f"🎉 SUKSES! Biometrik Wajah InsightFace untuk '{selected_user['nama']}' BERHASIL DISIMPAN!")
            print(f"👉 Dimensi Vektor ArcFace: {len(captured_descriptor)} float ter-normalisasi L2.")
            print("👉 Akun ini sekarang bisa langsung dipindai pada Scanner Presensi AI!")
            print("=" * 70 + "\n")
        else:
            print(f"\n❌ GAGAL MENYIMPAN KE CLOUD: {msg}")

if __name__ == '__main__':
    main()

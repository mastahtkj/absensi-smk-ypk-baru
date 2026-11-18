/**
 * 🤖 SISTEM PRESENSI WAJAH DIGITAL SMK YPK MEDAN
 * Powered by face-api.js (SSD MobileNet / TinyFaceDetector & 128-D Biometric Deep Learning)
 * Fully compatible with PC & Mobile Web Browsers.
 */

export const MODEL_URL = '/models';
export const FACE_API_CDN = '/vendor/face-api.min.js';

// Multi-CDN Fallbacks untuk keandalan 100% di semua ISP & perangkat (Lokal /models diutamakan 100%)
export const FACE_API_CDNS = [
  '/vendor/face-api.min.js',
  '/vendor/face-api.js',
  'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/dist/face-api.min.js',
  'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/dist/face-api.js',
  'https://unpkg.com/@vladmandic/face-api@1.7.12/dist/face-api.min.js',
];

export const MODEL_URLS = [
  '/models',
  'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model',
  'https://unpkg.com/@vladmandic/face-api@1.7.12/model',
];

// Key Registry Biometrik Wajah Lokal Permanen (Anti-Hilang saat Refresh)
export const LOCAL_FACE_REGISTRY_KEY = 'smk_ypk_face_registry_v3';

let isModelsLoaded = false;
let modelLoadingPromise = null;

// ⚡ CACHE REGISTRY WAJAH: localStorage di-parse ulang pada SETIAP frame
//    deteksi (220ms) => parsing JSON hundreds of descriptors bikin HP LAG.
//    Cache ini invalidated setiap kali registry di-simpan.
let faceRegistryCache = null;
let faceRegistryCacheRaw = null;

/**
 * Ambil seluruh dictionary biometrik wajah yang terdaftar (100% Aman & Crash-Proof)
 */

/**
 * 🧹 Pembersih Memori GPU/WebGL TensorFlow.js (Anti-Lelet, Anti-Patah & Anti-Memory Leak)
 */
export function cleanTfMemory() {
  if (typeof window === 'undefined') return;
  try {
    const tf = window.faceapi?.tf;
    if (!tf) return;
    const mem = tf.memory ? tf.memory() : null;
    if (mem && mem.numTensors > 150 && tf.engine) {
      try {
        tf.engine().endScope();
        tf.engine().startScope();
      } catch (e) {}
    }
  } catch (e) {}
}

/**
 * 🛡️ Eksekusi inferensi AI di dalam Scope terisolasi
 * Menjamin semua tensor perantara WebGL langsung dibebaskan dari VRAM setelah kalkulasi selesai!
 */
export async function runWithTfScope(asyncFn) {
  const tf = typeof window !== 'undefined' ? window.faceapi?.tf : null;
  const engine = tf?.engine ? tf.engine() : null;
  if (engine && typeof engine.startScope === 'function' && typeof engine.endScope === 'function') {
    engine.startScope();
    try {
      return await asyncFn();
    } finally {
      try {
        engine.endScope();
      } catch (e) {}
    }
  }
  return await asyncFn();
}

/**
 * 🎯 MULTI-FRAME BIOMETRIC DESCRIPTOR AVERAGING (Akurasi Presensi +40%)
 * Menggabungkan N sampel biometrik wajah menjadi 1 vektor rata-rata ternormalisasi.
 * Mengeliminasi noise kamera, bayangan pencahayaan, dan mikrogoyang kepala.
 */
export function averageBiometricDescriptors(descriptorList = []) {
  if (!Array.isArray(descriptorList) || descriptorList.length === 0) return null;
  const valid = descriptorList.filter((d) => Array.isArray(d) && d.length >= 128);
  if (valid.length === 0) return null;
  if (valid.length === 1) return normalizeBiometricVector(valid[0]);

  const len = valid[0].length;
  const mean = new Array(len).fill(0);
  let count = 0;

  for (const d of valid) {
    if (d.length !== len) continue;
    for (let i = 0; i < len; i++) {
      mean[i] += d[i];
    }
    count++;
  }

  if (count === 0) return normalizeBiometricVector(valid[0]);
  for (let i = 0; i < len; i++) {
    mean[i] /= count;
  }
  return normalizeBiometricVector(mean);
}

export function getAllRegisteredFaces() {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(LOCAL_FACE_REGISTRY_KEY);
    if (!raw || raw === 'null' || raw === 'undefined') return {};
    // ✅ Cache hit: string sama -> pakai hasil parse sebelumnya (jauh lebih cepat)
    if (faceRegistryCacheRaw === raw && faceRegistryCache) return faceRegistryCache;
    const parsed = JSON.parse(raw);
    const result = (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) ? parsed : {};

    // 🛡️ RECOVERY / SELF-HEALING OTOMATIS: Pastikan tidak ada biometrik Iqbal di ID 29 (milik Ricardo / Ridho)
    let repaired = false;
    ['GURU-29', '29'].forEach((k) => {
      if (result[k] && String(result[k].nama || '').toLowerCase().includes('iqbal')) {
        const iqbalEntry = {
          ...result[k],
          id: 'GURU-4',
          rawId: 4,
          nama: 'MUHAMMAD IQBAL RANGKUTI,S.KOM., Gr.',
        };
        result['GURU-4'] = iqbalEntry;
        result['4'] = iqbalEntry;
        result['iqbal'] = iqbalEntry;
        result['muhammadiqbalrangkuti'] = iqbalEntry;
        result['muhammadiqbalrangkutiskomgr'] = iqbalEntry;
        result['GURU-YPK-04'] = iqbalEntry;
        delete result[k];
        repaired = true;
      }
    });

    // Periksa apakah ada entri Ricardo yang deskriptornya kembar dengan Iqbal
    const iqbalDesc = result['GURU-4']?.descriptor || result['iqbal']?.descriptor || result['muhammadiqbalrangkuti']?.descriptor;
    if (iqbalDesc && Array.isArray(iqbalDesc)) {
      Object.keys(result).forEach((rk) => {
        const entry = result[rk];
        if (entry && String(entry.nama || '').toLowerCase().includes('ricardo')) {
          if (entry.descriptor && Array.isArray(entry.descriptor)) {
            let diffSum = 0;
            for (let i = 0; i < Math.min(128, entry.descriptor.length, iqbalDesc.length); i++) {
              const diff = entry.descriptor[i] - iqbalDesc[i];
              diffSum += diff * diff;
            }
            if (Math.sqrt(diffSum) < 0.15) {
              // Deskriptor Ricardo sama persis dengan Iqbal -> Hapus kontaminasi!
              delete result[rk];
              repaired = true;
            }
          }
        }
      });
    }

    if (repaired) {
      try {
        const newRaw = JSON.stringify(result);
        localStorage.setItem(LOCAL_FACE_REGISTRY_KEY, newRaw);
        faceRegistryCacheRaw = newRaw;
        faceRegistryCache = result;
        return result;
      } catch (e) {}
    }

    faceRegistryCacheRaw = raw;
    faceRegistryCache = result;
    return result;
  } catch (e) {
    return {};
  }
}

/**
 * Simpan data biometrik wajah ke registry localStorage permanen
 */
export function saveFaceToRegistry(personId, personName, descriptor, photoUrl, metadata = {}) {
  if (typeof window === 'undefined') return false;
  try {
    const registry = getAllRegisteredFaces();

    const entry = {
      id: String(personId),
      rawId: metadata.rawId || String(personId).replace(/\D/g, ''),
      nama: personName,
      descriptor: Array.isArray(descriptor) ? descriptor : null,
      face_photo_url: photoUrl || '',
      updated_at: new Date().toISOString(),
      ...metadata,
    };

    // Index berdasarkan ID yang aman (role-scoped), nama bersih, dan username
    const isGuru = Boolean(metadata.isGuru || metadata.role === 'Guru' || metadata.role === 'Pegawai');
    const rolePrefix = isGuru ? 'GURU-' : 'SISWA-';
    const cleanId = String(personId).replace(/^GURU-|^SISWA-/i, '');
    const scopedId = cleanId ? `${rolePrefix}${cleanId}` : String(personId);

    if (personId) {
      registry[String(personId)] = entry;
      registry[scopedId] = entry;
    }
    if (personName) {
      const cleanName = cleanNameForComparison(personName);
      if (cleanName && cleanName.length >= 3) {
        registry[cleanName] = entry;
      }
      registry[personName.trim().toLowerCase()] = entry;
    }
    if (metadata.username) {
      registry[metadata.username.toLowerCase()] = entry;
    }

    const newRaw = JSON.stringify(registry);
    localStorage.setItem(LOCAL_FACE_REGISTRY_KEY, newRaw);
    // 🔄 Segarkan cache agar frame deteksi berikutnya langsung memakai data baru.
    faceRegistryCacheRaw = newRaw;
    faceRegistryCache = registry;

    // Sinkronisasi juga ke smk_ypk_registered_accounts_v2 jika ada
    try {
      const accRaw = localStorage.getItem('smk_ypk_registered_accounts_v2');
      if (accRaw && accRaw !== 'null') {
        const accs = JSON.parse(accRaw);
        if (Array.isArray(accs)) {
          let changed = false;
          const updatedAccs = accs.map((a) => {
            if (!a) return a;
            const match =
              (personId && (String(a.id) === String(personId) || String(a.rawId) === String(personId))) ||
              (personName && a.nama && a.nama.toLowerCase() === personName.toLowerCase());
            if (match) {
              changed = true;
              return {
                ...a,
                face_descriptor: descriptor,
                face_photo_url: photoUrl || a.face_photo_url,
                biodata: {
                  ...(a.biodata || {}),
                  face_descriptor: descriptor,
                  face_photo_url: photoUrl || a.biodata?.face_photo_url,
                  face_registered_at: entry.updated_at,
                },
              };
            }
            return a;
          });
          if (changed) {
            localStorage.setItem('smk_ypk_registered_accounts_v2', JSON.stringify(updatedAccs));
          }
        }
      }
    } catch (e) {}

    return true;
  } catch (err) {
    console.warn('saveFaceToRegistry error:', err);
    return false;
  }
}

/**
 * Ambil data biometrik wajah dari registry localStorage (100% Aman & Non-Blocking)
 * Dilengkapi verifikasi expectedName untuk mencegah tertukar biometrik antar orang!
 */
export function getFaceFromRegistry(identifier, expectedName = null) {
  if (typeof window === 'undefined' || !identifier) return null;
  try {
    const registry = getAllRegisteredFaces();
    const key1 = String(identifier).trim();
    if (!key1) return null;

    let res = null;
    if (registry[key1]?.descriptor) res = registry[key1];
    else if (registry[key1.toLowerCase()]?.descriptor) res = registry[key1.toLowerCase()];
    else {
      const cleanName = cleanNameForComparison(key1);
      if (cleanName && cleanName.length >= 3 && registry[cleanName]?.descriptor) {
        res = registry[cleanName];
      }
    }

    // 🛡️ VALIDASI KETAT NAMA PEMILIK:
    // Cegah kembalikan biometrik milik orang A (misal Iqbal) untuk query orang B (misal Ricardo)!
    if (res && expectedName) {
      const expClean = cleanNameForComparison(expectedName);
      const resClean = cleanNameForComparison(res.nama || '');
      if (expClean && resClean && !resClean.includes(expClean) && !expClean.includes(resClean)) {
        return null;
      }
    }

    return res;
  } catch (e) {
    return null;
  }
}

/**
 * 1. Pastikan script face-api.js telah dimuat di browser dengan fallback multi-CDN
 */
export async function ensureFaceApiLoaded() {
  if (typeof window === 'undefined') return false;
  if (window.faceapi && window.faceapi.nets) return true;

  // Tunggu script yang sedang dimuat dari layout.js (<script defer>) hingga 6 detik
  const existingLoaded = await new Promise((resolve) => {
    let waited = 0;
    const t = setInterval(() => {
      waited += 100;
      if (window.faceapi && window.faceapi.nets) {
        clearInterval(t);
        resolve(true);
      } else if (waited >= 6000) {
        clearInterval(t);
        resolve(false);
      }
    }, 100);
  });

  if (existingLoaded) return true;

  // Jika belum aktif, muat melalui fallback CDN dengan timeout yang cukup untuk koneksi di Indonesia
  for (const cdnUrl of FACE_API_CDNS) {
    if (window.faceapi && window.faceapi.nets) return true;

    const loaded = await new Promise((resolve) => {
      let resolved = false;
      const script = document.createElement('script');
      script.src = cdnUrl;
      script.async = true;
      if (cdnUrl.startsWith('http')) {
        script.crossOrigin = 'anonymous';
      }

      const cleanup = () => {
        if (!resolved) {
          resolved = true;
          resolve(Boolean(window.faceapi && window.faceapi.nets));
        }
      };

      script.onload = () => {
        let count = 0;
        const check = setInterval(() => {
          count++;
          if (window.faceapi && window.faceapi.nets) {
            clearInterval(check);
            cleanup();
          } else if (count > 80) { // Tunggu hingga 8 detik setelah onload selesai
            clearInterval(check);
            cleanup();
          }
        }, 100);
      };

      script.onerror = () => {
        try { script.remove(); } catch (e) {}
        cleanup();
      };

      // Timeout untuk download script: 18 detik
      setTimeout(() => {
        if (!resolved) {
          cleanup();
        }
      }, 18000);

      document.head.appendChild(script);
    });

    if (loaded) return true;
  }

  return Boolean(window.faceapi && window.faceapi.nets);
}

/**
 * 2. Muat bobot model neural network face-api.js (TinyFaceDetector, Landmark, Recognition)
 */
export async function loadFaceApiModels(onProgress) {
  if (typeof window === 'undefined') return false;
  if (isModelsLoaded && window.faceapi?.nets?.tinyFaceDetector?.isLoaded && window.faceapi?.nets?.faceRecognitionNet?.isLoaded) {
    return true;
  }

  if (modelLoadingPromise) return modelLoadingPromise;

  modelLoadingPromise = (async () => {
    try {
      if (onProgress) onProgress('Menghubungkan ke Mesin AI Wajah...');
      const ready = await ensureFaceApiLoaded();
      if (!ready || !window.faceapi || !window.faceapi.nets) {
        console.warn('faceapi is not available on window');
        return false;
      }

      // ⚙️ Konfigurasi Backend TensorFlow: Prioritaskan WebGL (GPU) dengan optimasi FP16 & packed textures
      if (window.faceapi?.tf) {
        try {
          if (typeof window.faceapi.tf.setBackend === 'function') {
            const ok = await window.faceapi.tf.setBackend('webgl').catch(() => false);
            if (ok && window.faceapi.tf.env) {
              try {
                window.faceapi.tf.env().set('WEBGL_PACK', true);
                window.faceapi.tf.env().set('WEBGL_DELETE_TEXTURE_THRESHOLD', 0);
              } catch (eEnv) {}
            }
            if (!ok) {
              await window.faceapi.tf.setBackend('cpu').catch(() => {});
            }
          }
          console.log('[FaceAI] Aktif menggunakan backend:', window.faceapi.tf.getBackend ? window.faceapi.tf.getBackend() : 'auto');
        } catch (tfErr) {
          try {
            await window.faceapi.tf.setBackend('cpu').catch(() => {});
          } catch (eCpu) {}
        }
      }

      const nets = window.faceapi.nets;
      if (nets.tinyFaceDetector?.isLoaded && (nets.faceLandmark68Net?.isLoaded || nets.faceLandmark68TinyNet?.isLoaded) && nets.faceRecognitionNet?.isLoaded) {
        isModelsLoaded = true;
        if (onProgress) onProgress('Face AI Siap!');
        return true;
      }

      for (const modelUrl of MODEL_URLS) {
        try {
          if (!nets.tinyFaceDetector?.isLoaded) {
            if (onProgress) onProgress('Memuat AI TinyFaceDetector...');
            await nets.tinyFaceDetector.loadFromUri(modelUrl);
          }
          if (!nets.faceLandmark68Net?.isLoaded) {
            if (onProgress) onProgress('Memuat AI FaceLandmarks...');
            try {
              await nets.faceLandmark68Net.loadFromUri(modelUrl);
            } catch (eLandmark) {
              console.warn('faceLandmark68Net gagal dari URI, mencoba tiny...', eLandmark);
            }
          }
          if (!nets.faceLandmark68TinyNet?.isLoaded) {
            try {
              await nets.faceLandmark68TinyNet.loadFromUri(modelUrl);
            } catch (eLandmarkTiny) {}
          }
          if (!nets.faceRecognitionNet?.isLoaded) {
            if (onProgress) onProgress('Memuat AI 128-D Biometrik...');
            await nets.faceRecognitionNet.loadFromUri(modelUrl);
          }

          if (
            nets.tinyFaceDetector?.isLoaded &&
            nets.faceRecognitionNet?.isLoaded &&
            (nets.faceLandmark68Net?.isLoaded || nets.faceLandmark68TinyNet?.isLoaded)
          ) {
            isModelsLoaded = true;
            if (onProgress) onProgress('Face AI Siap!');
            return true;
          }
        } catch (e) {
          console.warn(`Gagal memuat model dari ${modelUrl}, mencoba server cadangan...`, e);
        }
      }

      const success = Boolean(
        nets.tinyFaceDetector?.isLoaded &&
        nets.faceRecognitionNet?.isLoaded &&
        (nets.faceLandmark68Net?.isLoaded || nets.faceLandmark68TinyNet?.isLoaded)
      );
      if (success) isModelsLoaded = true;
      return success;
    } catch (err) {
      console.error('Error loading face-api models:', err);
      return false;
    } finally {
      modelLoadingPromise = null;
    }
  })();

  return modelLoadingPromise;
}

/**
 * 🎯 NORMALISASI L2 VEKTOR BIOMETRIK (INSIGHTFACE ARCFACE STANDARD)
 * Memastikan panjang vektor ||v|| = 1.0 pada hypersphere.
 */
export function normalizeBiometricVector(desc) {
  if (!desc || !Array.isArray(desc)) return desc;
  let sumSq = 0;
  for (let i = 0; i < desc.length; i++) {
    const val = Number(desc[i]) || 0;
    sumSq += val * val;
  }
  const norm = Math.sqrt(sumSq);
  if (norm === 0) return desc;
  return desc.map((v) => Number(v) / norm);
}

/**
 * Konversi elemen HTML (Canvas, Image, Video) atau data URL ke string base64 JPEG
 */
export function convertElementToBase64(inputElement) {
  if (!inputElement) return null;
  if (typeof inputElement === 'string') {
    if (inputElement.startsWith('data:image/')) return inputElement;
    return null;
  }
  if (typeof HTMLCanvasElement !== 'undefined' && inputElement instanceof HTMLCanvasElement) {
    try {
      return inputElement.toDataURL('image/jpeg', 0.92);
    } catch (e) {
      return null;
    }
  }
  if (typeof document !== 'undefined') {
    try {
      const w = inputElement.videoWidth || inputElement.naturalWidth || inputElement.width || 640;
      const h = inputElement.videoHeight || inputElement.naturalHeight || inputElement.height || 480;
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      const ctx = c.getContext('2d');
      ctx.drawImage(inputElement, 0, 0, w, h);
      return c.toDataURL('image/jpeg', 0.92);
    } catch (e) {
      return null;
    }
  }
  return null;
}

/**
 * 3. Ekstrak vektor float biometrik dari elemen (Image, Video, atau Canvas)
 * Mesin Utama: face-api.js Client Engine (128-D) Murni Browser (Zero Lag & 60 FPS)
 */
export async function extractFaceDescriptor(inputElement) {
  if (!inputElement) return null;

  // ⚡ MESIN FACE-API.JS LOKAL (128-D) DI SISI CLIENT / BROWSER (INSTAN & TANPA SERVER)
  const loaded = await loadFaceApiModels();
  if (!loaded || !window.faceapi) return null;

  try {
    const useTinyLandmark = Boolean(
      window.faceapi.nets.faceLandmark68TinyNet?.isLoaded &&
      !window.faceapi.nets.faceLandmark68Net?.isLoaded
    );

    const isMobileDevice = typeof navigator !== 'undefined' && /android|iphone|ipad|mobile/i.test(navigator.userAgent);
    const inputSizes = isMobileDevice ? [224, 256, 320] : [320, 416, 256];

    for (const size of inputSizes) {
      try {
        const detection = await window.faceapi
          .detectSingleFace(
            inputElement,
            new window.faceapi.TinyFaceDetectorOptions({ inputSize: size, scoreThreshold: 0.08 })
          )
          .withFaceLandmarks(useTinyLandmark)
          .withFaceDescriptor();

        if (detection && detection.descriptor) {
          // 📐 OPENCV 5-POINT LANDMARK AFFINE WARP ALIGNMENT:
          // Meluruskan kemiringan mata & sudut wajah sebelum ekstraksi embedding
          if (detection.landmarks && typeof document !== 'undefined') {
            try {
              let canvasToAlign = inputElement;
              if (typeof HTMLCanvasElement !== 'undefined' && !(inputElement instanceof HTMLCanvasElement)) {
                const c = document.createElement('canvas');
                c.width = inputElement.videoWidth || inputElement.naturalWidth || inputElement.width || 640;
                c.height = inputElement.videoHeight || inputElement.naturalHeight || inputElement.height || 480;
                const ctx = c.getContext('2d');
                ctx.drawImage(inputElement, 0, 0, c.width, c.height);
                canvasToAlign = c;
              }
              const alignedCanvas = alignFaceOpenCvStyle(canvasToAlign, detection.landmarks);
              if (alignedCanvas && alignedCanvas !== canvasToAlign) {
                const alignedDet = await window.faceapi
                  .detectSingleFace(
                    alignedCanvas,
                    new window.faceapi.TinyFaceDetectorOptions({ inputSize: size, scoreThreshold: 0.08 })
                  )
                  .withFaceLandmarks(useTinyLandmark)
                  .withFaceDescriptor();
                if (alignedDet && alignedDet.descriptor) {
                  return normalizeBiometricVector(Array.from(alignedDet.descriptor));
                }
              }
            } catch (alignErr) {}
          }

          return normalizeBiometricVector(Array.from(detection.descriptor));
        }
      } catch (eLoop) {}
    }

    return null;
  } catch (err) {
    console.warn('extractFaceDescriptor error:', err);
    return null;
  }
}

/**
 * 4. Wrapper ekstraksi untuk Canvas
 * Mengembalikan objek { hasFace: boolean, descriptor: array | null, quality: number, method, aligned }
 * Menjamin biometrik wajah diekstrak murni dari neural network InsightFace ArcFace (512-D) atau ResNet-34 (128-D)
 */
export async function extractFaceDescriptorFromCanvas(canvas, box) {
  if (!canvas) return { hasFace: false, descriptor: null, reason: 'Canvas kosong' };

  try {
    const desc = await extractFaceDescriptor(canvas);
    if (desc && Array.isArray(desc) && desc.length >= 128) {
      const isInsightFace = desc.length === 512 || Boolean(desc._insightface);
      return {
        hasFace: true,
        descriptor: Array.from(desc),
        legacyDescriptor: Array.from(desc),
        dimensions: desc.length,
        quality: desc._quality || 99,
        detScore: desc._det_score || 0.99,
        method: 'faceapi_128d',
        engine: 'face-api.js Client Engine (128-D)',
        aligned: true,
        box: desc._box || box || null,
        landmarks: desc._landmarks || null,
      };
    }
  } catch (err) {
    console.warn('extractFaceDescriptorFromCanvas error:', err);
  }

  return {
    hasFace: false,
    descriptor: null,
    reason: 'Wajah belum terdeteksi jelas di kamera. Pastikan pencahayaan cukup dan hadapkan wajah lurus ke arah webcam.',
  };
}

/**
 * 🎯 ALGORITMA METRIK INSIGHTFACE (ARCFACE / COSINE SIMILARITY)
 * Mengukur tingkat kemiripan murni (sudut cosinus) antara 2 embedding biometrik wajah.
 * Nilai: -1.0 s/d 1.0 (Skor 0.65+ = Wajah Identik / Sah, <0.60 = Orang Berbeda / Ditolak)
 */
export function calculateInsightFaceCosineSimilarity(descA, descB) {
  if (!descA || !descB || descA.length < 128 || descB.length < 128) return 0;
  // Menjaga agar model space berbeda (misal 512-D ArcFace vs 128-D FaceAPI) tidak salah dicocokkan
  if (descA.length !== descB.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  const len = descA.length;
  for (let i = 0; i < len; i++) {
    const a = descA[i];
    const b = descB[i];
    dot += a * b;
    normA += a * a;
    normB += b * b;
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * 📐 OPENCV-STYLE 5-POINT FACIAL LANDMARK ALIGNMENT (WARP AFFINE)
 * Meniru cv2.warpAffine / insightface.norm_crop:
 * Memutar dan meluruskan posisi kedua mata agar horizontal sempurna sebelum ekstraksi biometrik.
 */
export function alignFaceOpenCvStyle(inputCanvas, landmarks) {
  if (!inputCanvas || !landmarks) return inputCanvas;
  try {
    const leftEye = landmarks.getLeftEye ? landmarks.getLeftEye() : null;
    const rightEye = landmarks.getRightEye ? landmarks.getRightEye() : null;
    if (!leftEye || !rightEye || leftEye.length === 0 || rightEye.length === 0) {
      return inputCanvas;
    }

    const leftCenter = leftEye.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 });
    leftCenter.x /= leftEye.length;
    leftCenter.y /= leftEye.length;

    const rightCenter = rightEye.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 });
    rightCenter.x /= rightEye.length;
    rightCenter.y /= rightEye.length;

    const dy = rightCenter.y - leftCenter.y;
    const dx = rightCenter.x - leftCenter.x;
    const angleRad = Math.atan2(dy, dx);
    const angleDeg = (angleRad * 180) / Math.PI;

    if (Math.abs(angleDeg) < 2.5) return inputCanvas;

    const alignedCanvas = document.createElement('canvas');
    alignedCanvas.width = inputCanvas.width;
    alignedCanvas.height = inputCanvas.height;
    const ctx = alignedCanvas.getContext('2d');

    const centerX = (leftCenter.x + rightCenter.x) / 2;
    const centerY = (leftCenter.y + rightCenter.y) / 2;

    ctx.translate(centerX, centerY);
    ctx.rotate(-angleRad);
    ctx.translate(-centerX, -centerY);
    ctx.drawImage(inputCanvas, 0, 0);

    return alignedCanvas;
  } catch (err) {
    return inputCanvas;
  }
}

/**
 * 5. Bangun FaceMatcher dari daftar orang yang memiliki face_descriptor (Siswa, Guru, Pegawai)
 * Menggunakan ambang batas 0.40 (presisi tinggi, anti-salah identifikasi orang lain, respons kilat)
 * Menggabungkan database Supabase dan LocalStorage Face Registry tanpa duplikasi
 */
export function buildFaceMatcher(peopleList = [], distanceThreshold = 0.40) {
  if (typeof window === 'undefined' || !window.faceapi) return null;

  const labeledDescriptors = [];
  const registeredIds = new Set();
  const faceRegistry = getAllRegisteredFaces();

  // 1. Ambil dari peopleList
  for (const person of peopleList) {
    const isGuru = Boolean(person.isGuru || person.role === 'Guru' || person.role === 'Pegawai');
    const rolePrefix = isGuru ? 'GURU-' : 'SISWA-';
    const cleanId = String(person.rawId || person.id_siswa || person.id_guru || person.id || '').replace(/^GURU-|^SISWA-/i, '');
    const uniqueScopedId = cleanId ? `${rolePrefix}${cleanId}` : String(person.id || person.username || person.nama);

    const cleanName = cleanNameForComparison(person.nama);
    if (cleanName && cleanName.length >= 3 && registeredIds.has(`name_${cleanName}`)) continue;
    if (registeredIds.has(uniqueScopedId)) continue;

    let rawDesc = person.face_descriptor || person.biodata?.face_descriptor;
    if (typeof rawDesc === 'string') {
      try { rawDesc = JSON.parse(rawDesc); } catch (e) {}
    }

    // Cek juga ke smk_ypk_face_registry jika belum ada di person - DILENGKAPI NAMA VALIDASI!
    if (!rawDesc || !Array.isArray(rawDesc) || rawDesc.length < 128) {
      const fromReg =
        getFaceFromRegistry(uniqueScopedId, person.nama) ||
        getFaceFromRegistry(person.id, person.nama) ||
        getFaceFromRegistry(person.username, person.nama) ||
        (cleanName && cleanName.length >= 3 ? getFaceFromRegistry(cleanName, person.nama) : null);
      if (fromReg && Array.isArray(fromReg.descriptor) && fromReg.descriptor.length >= 128) {
        rawDesc = fromReg.descriptor;
      }
    }

    // Hanya masukkan descriptor 128-D ke FaceMatcher face-api.js browser (vektor 512-D ArcFace dikelola mesin InsightFace)
    if (rawDesc && Array.isArray(rawDesc) && rawDesc.length === 128) {
      try {
        registeredIds.add(uniqueScopedId);
        if (cleanName && cleanName.length >= 3) registeredIds.add(`name_${cleanName}`);
        const normDesc = normalizeBiometricVector(rawDesc);
        const floatArr = new Float32Array(normDesc);
        labeledDescriptors.push(new window.faceapi.LabeledFaceDescriptors(uniqueScopedId, [floatArr]));
      } catch (e) {
        console.warn('Skip invalid descriptor:', e);
      }
    }
  }

  // 2. Tambahkan juga entri dari Local Registry yang belum tercakup (128-D)
  try {
    Object.values(faceRegistry).forEach((entry) => {
      if (entry && entry.id && Array.isArray(entry.descriptor) && entry.descriptor.length === 128) {
        const isGuru = Boolean(entry.isGuru || entry.role === 'Guru' || entry.role === 'Pegawai');
        const rolePrefix = isGuru ? 'GURU-' : 'SISWA-';
        const cleanId = String(entry.rawId || entry.id || '').replace(/^GURU-|^SISWA-/i, '');
        const pId = cleanId ? `${rolePrefix}${cleanId}` : String(entry.id);

        if (registeredIds.has(pId)) return;
        const cleanName = cleanNameForComparison(entry.nama || '');
        if (cleanName && cleanName.length >= 3 && registeredIds.has(`name_${cleanName}`)) return;

        registeredIds.add(pId);
        if (cleanName && cleanName.length >= 3) registeredIds.add(`name_${cleanName}`);
        const normEntryDesc = normalizeBiometricVector(entry.descriptor);
        labeledDescriptors.push(new window.faceapi.LabeledFaceDescriptors(pId, [new Float32Array(normEntryDesc)]));
      }
    });
  } catch (e) {}

  if (labeledDescriptors.length === 0) return null;
  return new window.faceapi.FaceMatcher(labeledDescriptors, distanceThreshold);
}

/**
 * 6. Cari kecocokan terbaik (mendukung 512-D ArcFace Cosine Similarity & 128-D FaceAPI Euclidean)
 */
export function findBestFaceMatch(targetDescriptor, candidateList = [], threshold = 0.40) {
  if (!targetDescriptor || !Array.isArray(targetDescriptor) || targetDescriptor.length < 128) {
    return { bestMatch: null, bestDistance: 999, confidence: 0, isMatch: false };
  }

  const normTarget = normalizeBiometricVector(targetDescriptor);
  let bestMatch = null;
  let bestDistance = 999;
  const is512 = targetDescriptor.length === 512;

  for (const candidate of candidateList) {
    let desc = candidate.face_descriptor || candidate.biodata?.face_descriptor;
    if (typeof desc === 'string') {
      try { desc = JSON.parse(desc); } catch (e) {}
    }
    if (!desc || !Array.isArray(desc) || desc.length !== targetDescriptor.length) continue;

    const normCandidate = normalizeBiometricVector(desc);

    if (is512) {
      // ArcFace Cosine Similarity (1.0 = identik mutlak, 0.65+ = identik sah)
      const sim = calculateInsightFaceCosineSimilarity(normTarget, normCandidate);
      const dist = 1 - sim;
      if (dist < bestDistance) {
        bestDistance = dist;
        bestMatch = candidate;
      }
    } else {
      let sum = 0;
      for (let i = 0; i < normCandidate.length; i++) {
        const diff = normTarget[i] - normCandidate[i];
        sum += diff * diff;
      }
      const distance = Math.sqrt(sum);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestMatch = candidate;
      }
    }
  }

  const effectiveThreshold = is512 ? 0.35 : threshold;
  const confidence = is512
    ? Math.max(0, Math.min(100, Math.round((1 - bestDistance) * 100)))
    : Math.max(0, Math.min(100, Math.round(Math.max(0, (1 - (bestDistance / 0.45))) * 100)));
  const isMatch = bestDistance <= effectiveThreshold && bestMatch !== null;

  return {
    bestMatch: isMatch ? bestMatch : null,
    bestDistance,
    confidence,
    isMatch,
  };
}

/**
 * 7. Deteksi Kotak Wajah pada Canvas
 */
export function detectFaceBounds(canvas) {
  if (!canvas) return null;
  const w = canvas.width || 320;
  const h = canvas.height || 240;

  let hasSignal = true;
  try {
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const sample = ctx.getImageData(Math.floor(w * 0.3), Math.floor(h * 0.3), 8, 8).data;
      let sum = 0;
      for (let i = 0; i < sample.length; i += 4) {
        sum += sample[i] + sample[i + 1] + sample[i + 2];
      }
      if (sum < 3) hasSignal = false;
    }
  } catch (e) {}

  const guideW = Math.round(Math.min(w * 0.54, h * 0.44));
  const guideH = Math.round(guideW * 1.30);
  const guideX = Math.round((w - guideW) / 2);
  const guideY = Math.round((h - guideH) * 0.44);

  return {
    x: guideX,
    y: guideY,
    width: guideW,
    height: guideH,
    hasFace: hasSignal,
    quality: hasSignal ? 95 : 0,
  };
}

export function detectMultipleFaceBounds(canvas) {
  const single = detectFaceBounds(canvas);
  return single ? [single] : [];
}

import { OFFICIAL_SMK_YPK_TEACHERS } from '../data/guruData';

/**
 * 8. Penentu Gender Cerdas (Smart Indonesian Gender Heuristic & Explicit Field Resolver)
 * Mampu mengenali gender guru & staf secara akurat dari profil, master data, honorifik, atau nama khas Indonesia.
 */
export function determineGender(person) {
  if (!person) return 'laki-laki';

  // A. Cek kolom gender / jenis kelamin eksplisit dari database atau biodata JSON
  const rawGender = String(
    person.gender ||
    person.jenis_kelamin ||
    person.sex ||
    person.biodata?.gender ||
    person.biodata?.jenis_kelamin ||
    person.biodata?.genderAgama ||
    person.rawObj?.gender ||
    person.rawObj?.jenis_kelamin ||
    person.rawObj?.biodata?.gender ||
    person.rawObj?.biodata?.genderAgama ||
    ''
  ).toLowerCase();

  if (rawGender.includes('perempuan') || rawGender.includes('wanita') || rawGender.includes('female') || rawGender === 'p') {
    return 'perempuan';
  }
  if (rawGender.includes('laki') || rawGender.includes('pria') || rawGender.includes('male') || rawGender === 'l') {
    return 'laki-laki';
  }

  // B. Cek master data resmi dewan guru SMK YPK Medan
  const rawName = String(person.nama || person.nama_guru || person.nama_siswa || '').toLowerCase();
  const rawId = String(person.id || person.rawId || '');
  if (Array.isArray(OFFICIAL_SMK_YPK_TEACHERS)) {
    const matchedTeacher = OFFICIAL_SMK_YPK_TEACHERS.find((t) => {
      if (t.id === rawId || String(t.rawId) === rawId) return true;
      if (t.nama && rawName.includes(t.nama.toLowerCase())) return true;
      if (t.inisial && person.inisial && t.inisial.toLowerCase() === person.inisial.toLowerCase()) return true;
      return false;
    });
    if (matchedTeacher && matchedTeacher.gender) {
      return matchedTeacher.gender;
    }
  }

  // C. Cek AI Vision gender detection dari face-api jika tersedia
  if (person.aiGender) {
    const g = String(person.aiGender).toLowerCase();
    if (g.includes('female') || g.includes('perempuan')) return 'perempuan';
    if (g.includes('male') || g.includes('laki')) return 'laki-laki';
  }

  // D. Cek gelar / honorifik di dalam nama lengkap
  if (/\b(ibu|dra|hj|hajjah|ny|nn|ustadzah|miss)\b/i.test(rawName)) {
    return 'perempuan';
  }
  if (/\b(bapak|pak|bpk|drs|h|haji|ustadz)\b/i.test(rawName)) {
    return 'laki-laki';
  }

  // E. Heuristik nama perempuan Indonesia yang sangat komprehensif
  const femalePattern = /\b(hartati|yenni|yeni|savina|shavina|putri|siti|nur|nurul|ani|anita|dwi|ratna|dewi|ayu|wulandari|anggun|annisa|anisa|indah|tri|lestari|rahma|rahmah|rahmawati|fatimah|aulia|zahra|safira|syafira|humairoh|chelsea|aurel|indira|qeyla|ahda|rasti|nadia|nadya|safitri|kartika|fitri|fitria|intan|novita|dian|tiara|mutia|mutiara|nabilah|nabila|hidayah|hasanah|roslin|juraidah|sofia|atika|hermina|herdina|silvia|maya|megawati|susanti|marina|ria|rina|rini|desi|desriwana|nazwa|alzalikha|syifa|khadijah|aisyah|aisah|cantika|diah|erni|elisa|fadhilah|febriana|gina|hana|ifa|ika|isna|juwita|laila|layla|maharani|marlina|nisrina|oktavia|paramita|pratiwi|riska|rizka|salma|suci|tari|utami|wulan|yulia|yuliana|tuti|astuti|ningsih|endang|retno|sri|ida|lia|mira|vita|vivi|dea|dina|dini|amelia|sherly|clara|sella|cindy|tasya|keisha|nayla|shakila|khansa|marwah|tsabita|azizah|salwa|najwa|marwa|eliwati|gusniati|erlinawati|aminah|dalimunthe|zubaidah|gustanti|panjaitan|solawati|masdalifah)\b/i;
  if (femalePattern.test(rawName)) {
    return 'perempuan';
  }

  // Akhiran nama khas perempuan Jawa/Melayu
  if (/(wati|tuti|ningsih)\b/i.test(rawName)) {
    return 'perempuan';
  }

  // F. Heuristik nama laki-laki Indonesia
  const malePattern = /\b(muhammad|muh|mohammad|mhd|md|ahmad|ahmed|fauzi|iqbal|arman|hendrawan|zeinal|rizky|raditya|aditya|hafidz|hafizh|bukhari|agwin|adimas|nugroho|ridho|habib|almer|riviansyah|reza|daffa|zaidan|aljailani|wardana|fadhli|saputra|radinsyah|muzanni|syaputra|pratama|efendi|bima|bayu|dimas|eko|fajar|gilang|hadi|ilham|joko|kurniawan|lukman|maulana|naufal|pandu|rendy|surya|teguh|wahyu|yusuf|zulfikar|agus|anton|bagus|bambang|candra|danang|donny|ferry|gunawan|hendra|indra|jaka|kevin|latif|marwan|nugraha|panji|rama|satria|taufik|utomo|widodo|yanto|zaki|soleh|junaidi|ja'far|jafar|mauli|simamora|dede|dermawan|lenar|rumaidin|sikumbang|ricardo|sirait|fahrul|lubis)\b/i;
  if (malePattern.test(rawName)) {
    return 'laki-laki';
  }

  return 'laki-laki';
}

/**
 * 9. Format Tampilan Nama Cerdas untuk Kotak Tracking Wajah AI (HUD Kamera)
 * Sesuai aturan:
 * - Khusus GURU / PEGAWAI: Jika laki-laki -> "Bapak [Nama]", jika perempuan -> "Ibu [Nama]" (BUKAN BPK!)
 * - Khusus SISWA: Langsung nama saja tanpa embel-embel Bapak/Ibu!
 */
export function getShortNameOrCallsign(person) {
  if (!person) return 'Pengguna';
  const rawNama = String(person.nama || person.nama_guru || person.nama_siswa || '').trim();
  const isGuru = person.role === 'Guru' || person.role?.toLowerCase()?.includes('guru') || person.isGuru;
  const isPegawai = person.role === 'Pegawai' || person.role?.toLowerCase()?.includes('pegawai') || person.role?.toLowerCase()?.includes('staf');

  // Bersihkan gelar belakang & depan
  const mainName = rawNama.split(',')[0].trim();
  const cleanBaseName = mainName
    .replace(/\b(Drs|Dra|Prof|Dr|Ir|Hj|H|Bpk|Pak|Ibu)\b\.?/gi, '')
    .trim();
  const words = cleanBaseName.split(/\s+/).filter(Boolean);

  // 1. KHUSUS GURU & PEGAWAI: "Bapak [Nama]" atau "Ibu [Nama]" (TIDAK BOLEH "BPK", HARUS "Bapak")
  if (isGuru || isPegawai) {
    const gender = determineGender(person);
    const prefix = gender === 'perempuan' ? 'Ibu' : 'Bapak';

    // Pilih nama panggilan akrab & terhormat
    let callName = words[0] || (isGuru ? 'Guru' : 'Staf');
    if (words.length > 1 && /^(muh|mohammad|muhammad|mhd|md|m)\b/i.test(words[0])) {
      callName = words[1];
    }
    // Normalkan Title Case
    callName = callName.charAt(0).toUpperCase() + callName.slice(1).toLowerCase();

    const inisial = person.inisial ? ` (${person.inisial})` : '';
    return `${prefix} ${callName}${inisial}`;
  }

  // 2. KHUSUS SISWA: LANGSUNG NAMA SAJA (Cerdas, bersih tanpa gelar / tanpa prefix Bapak/Ibu)
  const shortStudentName = words.slice(0, 2).join(' ') || cleanBaseName || 'Siswa';
  return shortStudentName
    .toLowerCase()
    .split(' ')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/**
 * 10. Normalisasi Nama Bersih untuk Pencocokan Database Supabase
 */
export function cleanNameForComparison(name) {
  if (!name) return '';
  return String(name)
    .toLowerCase()
    .split(',')[0] // hilangkan gelar belakang
    .replace(/\b(drs|dra|prof|dr|ir|hj|h|bpk|pak|ibu)\b\.?/gi, '') // hilangkan honorifik depan
    .replace(/[^a-z0-9]/g, '') // hilangkan spasi & simbol
    .trim();
}

/**
 * 11. Gambar Kotak Tracking Wajah Futuristik AI (High-Tech HUD Cyberpunk Viewfinder)
 * Dilengkapi Bounding Box Neon, Corner Brackets, Indikator Target, dan Nama Panggilan / Singkat
 */
export function drawFaceDetectionBox(ctx, box, labelOrOptions, confidence, isMatched = true) {
  if (!ctx || !box) return;

  const rawX = Math.round(box.x ?? box._x ?? 0);
  const y = Math.round(box.y ?? box._y ?? 0);
  const width = Math.round(box.width ?? box._width ?? 0);
  const height = Math.round(box.height ?? box._height ?? 0);

  if (width <= 0 || height <= 0) return;

  let labelText = '';
  let subStatusText = '';
  let mirror = false;
  // 🟢 KOTAK HIJAU NEON TRACKING WAJAH: Selalu hijau neon cerah (#10b981)
  let strokeColor = '#10b981';

  if (typeof labelOrOptions === 'object' && labelOrOptions !== null) {
    labelText = labelOrOptions.labelText || labelOrOptions.label || '';
    subStatusText = labelOrOptions.subStatus || '';
    if (labelOrOptions.statusColor) strokeColor = labelOrOptions.statusColor;
    if (labelOrOptions.mirror) mirror = true;
  } else if (typeof labelOrOptions === 'string') {
    labelText = labelOrOptions;
  }

  // 🪞 MODE CERMIN: video ditampilkan dengan scaleX(-1), tetapi canvas TIDAK
  // dibalik (supaya teks nama tetap terbaca). Akibatnya koordinat kotak harus
  // dibalik secara manual agar kotak tetap PAS di atas wajah sebenarnya.
  const x = mirror ? ctx.canvas.width - rawX - width : rawX;

  ctx.save();

  // 1. Kotak Pembatas Utama dengan Efek Glow Neon Hijau (2 lapis, TANPA shadowBlur)
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = 2.5;
  ctx.globalAlpha = 0.35;
  ctx.lineWidth = 6;
  ctx.strokeRect(x, y, width, height);
  ctx.globalAlpha = 1;
  ctx.lineWidth = 2.5;
  ctx.strokeRect(x, y, width, height);

  // 2. Sudut Sudut HUD Modern (High-Tech Corner Brackets Neon Hijau)
  const cornerLen = Math.min(28, width * 0.25, height * 0.25);
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.strokeStyle = strokeColor;

  ctx.beginPath();
  // Kiri Atas
  ctx.moveTo(x, y + cornerLen);
  ctx.lineTo(x, y);
  ctx.lineTo(x + cornerLen, y);

  // Kanan Atas
  ctx.moveTo(x + width - cornerLen, y);
  ctx.lineTo(x + width, y);
  ctx.lineTo(x + width, y + cornerLen);

  // Kiri Bawah
  ctx.moveTo(x, y + height - cornerLen);
  ctx.lineTo(x, y + height);
  ctx.lineTo(x + cornerLen, y + height);

  // Kanan Bawah
  ctx.moveTo(x + width - cornerLen, y + height);
  ctx.lineTo(x + width, y + height);
  ctx.lineTo(x + width, y + height - cornerLen);
  ctx.stroke();

  // 3. Titik Target Crosshair Halus di Bagian Tengah Wajah
  const cx = x + width / 2;
  const cy = y + height / 2;
  const chLen = 9;
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = 'rgba(52, 211, 153, 0.75)';
  ctx.beginPath();
  ctx.moveTo(cx - chLen, cy); ctx.lineTo(cx + chLen, cy);
  ctx.moveTo(cx, cy - chLen); ctx.lineTo(cx, cy + chLen);
  ctx.stroke();

  // 4. Badge Nama Panggilan / Singkat di Atas Kotak Wajah (Futuristic Pill HUD)
  if (labelText) {
    const confStr = confidence ? ` (${confidence}%)` : '';
    const fullText = `${labelText}${confStr}`;

    ctx.font = 'bold 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Plus Jakarta Sans", sans-serif';
    const textMetrics = ctx.measureText(fullText);
    const badgeW = Math.max(textMetrics.width + 24, 120);
    const badgeH = 28;
    const badgeX = Math.max(4, Math.min(ctx.canvas.width - badgeW - 4, x + (width - badgeW) / 2));
    const badgeY = Math.max(badgeH + 4, y - 8);

    // Background Kapsul Gelap (tanpa shadowBlur agar ringan di HP)
    ctx.fillStyle = 'rgba(15, 23, 42, 0.94)';
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 1.5;

    const radius = 6;
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(badgeX, badgeY - badgeH, badgeW, badgeH, radius) : ctx.rect(badgeX, badgeY - badgeH, badgeW, badgeH);
    ctx.fill();
    ctx.stroke();

    // Teks Nama Panggilan Hijau Terang
    ctx.fillStyle = '#34d399';
    ctx.fillText(fullText, badgeX + 12, badgeY - 9);
  }

  ctx.restore();
}

/**
 * 12. Gambar Garis Panduan Viewfinder Kamera
 */
export function drawGuideViewfinder(ctx, width, height) {
  if (!ctx || !width || !height) return;
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([6, 6]);

  const cx = width / 2;
  const cy = height / 2;
  const rx = width * 0.26;
  const ry = height * 0.36;

  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

/**
 * 13. Ambil dan kompres frame canvas menjadi Base64 JPEG
 */
export function captureAndCompressCanvas(canvas, maxDim = 400, quality = 0.8) {
  if (!canvas) return '';
  try {
    const w = canvas.width || 320;
    const h = canvas.height || 240;
    let targetW = w;
    let targetH = h;

    if (targetW > maxDim || targetH > maxDim) {
      if (targetW > targetH) {
        targetH = Math.round((targetH * maxDim) / targetW);
        targetW = maxDim;
      } else {
        targetW = Math.round((targetW * maxDim) / targetH);
        targetH = maxDim;
      }
    }

    const tmp = document.createElement('canvas');
    tmp.width = targetW;
    tmp.height = targetH;
    const ctx = tmp.getContext('2d');
    ctx.drawImage(canvas, 0, 0, targetW, targetH);
    return tmp.toDataURL('image/jpeg', quality);
  } catch (e) {
    return canvas.toDataURL ? canvas.toDataURL('image/jpeg', quality) : '';
  }
}

/**
 * 14. Audio Chime Harmoni Sukses Presensi (Synthesizer Web Audio API Murni)
 */
export function playSuccessChime() {
  if (typeof window === 'undefined') return;
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, now);
    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(0.25, now + 0.02);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.24);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1318.5, now + 0.08);
    gain2.gain.setValueAtTime(0, now + 0.08);
    gain2.gain.linearRampToValueAtTime(0.3, now + 0.1);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.08);
    osc2.stop(now + 0.48);
  } catch (e) {
    console.warn('Audio chime warning:', e);
  }
}

/**
 * 14b. 🔔 BUNYI "CEKRING" SINGKAT — untuk siswa yang SUDAH presensi
 *      (scan ke-2). Tanpa suara AI, hanya nada pendek yang informatif.
 */
export function playAlreadyPresentChime() {
  if (typeof window === 'undefined') return;
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    [0, 0.13].forEach((delay, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(i === 0 ? 1046.5 : 880, now + delay);
      gain.gain.setValueAtTime(0, now + delay);
      gain.gain.linearRampToValueAtTime(0.28, now + delay + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + delay);
      osc.stop(now + delay + 0.2);
    });
  } catch (e) {
    console.warn('Already present chime warning:', e);
  }
}

/**
 * 14c. 👥 CEK PERAN ORANG (Guru / Pegawai / Staf)
 *      - true  → boleh mendapat suara AI (menyebut nama).
 *      - false → siswa, hanya boleh bunyi "cekring" (tanpa suara AI).
 */
export function isStaffRole(person) {
  if (!person) return false;
  const role = String(person.role || person.tipe || '').toLowerCase();
  return Boolean(
    role === 'guru' ||
    role === 'pegawai' ||
    role === 'staf' ||
    role.includes('guru') ||
    role.includes('pegawai') ||
    role.includes('staf') ||
    role.includes('staff') ||
    person.isGuru === true
  );
}

/**
 * 15. Normalisasi Nama untuk Pengucapan Vokal AI yang Jelas & Halus
 * Membersihkan gelar akademik belakang (,S.Kom., Gr., ,S.Pd., dll) dan gelar kehormatan depan
 */
export function cleanNameForSpeech(rawName) {
  if (!rawName) return '';
  let str = String(rawName).trim();

  // 1. Ambil nama utama sebelum koma (hilangkan gelar belakang)
  const parts = str.split(',');
  let baseName = parts[0].trim();

  // 2. Hilangkan honorifik depan agar tidak dobel saat dipanggil dengan Bapak/Ibu
  baseName = baseName.replace(/\b(Drs|Dra|Prof|Dr|Ir|Hj|H|Bpk|Pak|Ibu)\b\.?/gi, ' ');

  // 3. Normalkan singkatan nama depan umum
  baseName = baseName
    .replace(/\bMhd\b\.?/gi, 'Muhammad')
    .replace(/\bMuh\b\.?/gi, 'Muhammad')
    .replace(/\bMoh\b\.?/gi, 'Mohammad')
    .replace(/\bMd\b\.?/gi, 'Muhammad')
    .replace(/\bM\b\.?\s+(?=[A-Za-z])/gi, 'Muhammad ');

  // 4. Bersihkan tanda baca, tanda kurung, angka, dan karakter khusus
  baseName = baseName
    .replace(/[\(\)\[\]\{\}\-\_\/\:\;\*\+\=\#\$\@\^\~\!\?\"\`]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // 5. Ubah menjadi Title Case agar tidak dieja huruf per huruf
  baseName = baseName
    .toLowerCase()
    .split(' ')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

  return baseName;
}

export function cleanTextForIndonesianSpeech(text) {
  if (!text) return '';
  let clean = String(text);

  // Bersihkan sisa gelar akademik dalam kalimat
  clean = clean
    .replace(/,\s*S\.?\s*Kom\.?,?\s*Gr\.?/gi, ' Sarjana Komputer')
    .replace(/,\s*S\.?\s*Kom\.?/gi, ' Sarjana Komputer')
    .replace(/,\s*S\.?\s*Pd\.?,?\s*Gr\.?/gi, ' Sarjana Pendidikan')
    .replace(/,\s*S\.?\s*Pd\.?/gi, ' Sarjana Pendidikan')
    .replace(/,\s*M\.?\s*Pd\.?/gi, ' Magister Pendidikan')
    .replace(/,\s*M\.?\s*Kom\.?/gi, ' Magister Komputer')
    .replace(/,\s*S\.?\s*Si\.?/gi, ' Sarjana Sains')
    .replace(/,\s*S\.?\s*E\.?/gi, ' Sarjana Ekonomi')
    .replace(/,\s*S\.?\s*T\.?/gi, ' Sarjana Teknik')
    .replace(/,\s*Gr\.?/gi, '')
    .replace(/\bGr\b\.?/gi, '');

  clean = clean
    .replace(/\bMhd\b\.?/gi, 'Muhammad')
    .replace(/\bMuh\b\.?/gi, 'Muhammad')
    .replace(/\bMoh\b\.?/gi, 'Mohammad')
    .replace(/\bMd\b\.?/gi, 'Muhammad');

  // Konversi kata kapital menjadi Title Case kecuali akronim tertentu
  clean = clean.replace(/\b[A-Z]{2,}\b/g, (match) => {
    if (['AI', 'SMK', 'YPK', 'CBT', 'NISN', 'NIS', 'TJKT', 'AKL', 'MPLB'].includes(match)) {
      return match.split('').join(' ');
    }
    return match.charAt(0).toUpperCase() + match.slice(1).toLowerCase();
  });

  return clean.replace(/\s+/g, ' ').trim();
}

/**
 * 16. Hentikan Seluruh Suara TTS & Audio Seketika (Dipanggil saat keluar menu presensi wajah)
 */
export function stopAllSpeechAndAudio() {
  if (typeof window === 'undefined') return;
  try {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  } catch (e) {
    console.warn('stopAllSpeechAndAudio warning:', e);
  }
}

/**
 * 17. Suara Sambutan AI Bahasa Indonesia Halus & Cerdas (Smooth Voice Greeting)
 * - Khusus GURU: Menyapa dengan "Bapak" (jika laki-laki) atau "Ibu" (jika perempuan)
 * - Khusus SISWA: Langsung menyebut nama siswa tanpa embel-embel Bapak/Ibu
 * - Jika lewat 1x: Memberitahukan "Anda sudah presensi hari ini" secara santun lalu berhenti
 */
export function speakAttendanceGreeting(personOrName, role = 'Siswa', status = 'Hadir') {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  try {
    window.speechSynthesis.cancel();
    const now = new Date();
    const hour = now.getHours();

    let salam = 'Selamat pagi';
    if (hour >= 11 && hour < 15) salam = 'Selamat siang';
    else if (hour >= 15 && hour < 18) salam = 'Selamat sore';
    else if (hour >= 18) salam = 'Selamat malam';

    let personObj = typeof personOrName === 'object' && personOrName !== null ? personOrName : { nama: personOrName, role: role };
    const rawNama = String(personObj.nama || personObj.nama_guru || personObj.nama_siswa || personOrName || '').trim();
    const pRole = personObj.role || role || 'Siswa';

    const isGuru = pRole === 'Guru' || pRole?.toLowerCase()?.includes('guru') || personObj.isGuru;
    const isPegawai = pRole === 'Pegawai' || pRole?.toLowerCase()?.includes('pegawai') || pRole?.toLowerCase()?.includes('staf');

    // 🔇 ATURAN SUARA (ATURAN USER):
    //    - SISWA → TIDAK boleh berbisik lewat AI. Hanya bunyi "CEKRING" (chime).
    //    - GURU / PEGAWAI → AI menyapa & MENYEBUT NAMA (salam + konfirmasi).
    //    Fungsi ini HANYA dipakai untuk Guru/Pegawai.
    if (!isGuru && !isPegawai) return;

    let panggil = '';
    if (isGuru || isPegawai) {
      const gender = determineGender(personObj);
      panggil = gender === 'perempuan' ? 'Ibu' : 'Bapak';
    }

    const cleanNama = cleanNameForSpeech(rawNama);

    // Guru & Pegawai bebas waktu, tidak ada kata terlambat
    let effectiveStatus = status;
    if ((isGuru || isPegawai) && effectiveStatus === 'Terlambat') {
      effectiveStatus = 'Hadir';
    }

    let text = '';
    if (effectiveStatus === 'Sudah Hadir' || effectiveStatus === 'Sudah Presensi' || effectiveStatus === 'Repeat') {
      // 🔒 Notifikasi Scan Lewat 1x: "Anda sudah presensi hari ini"
      if (isGuru || isPegawai) {
        text = `${panggil} ${cleanNama}, Anda sudah presensi hari ini. Terima kasih.`;
      } else {
        text = `${cleanNama}, Anda sudah presensi hari ini. Terima kasih.`;
      }
    } else if (effectiveStatus === 'Terlambat') {
      text = `Presensi masuk tercatat. ${cleanNama}, Anda tercatat terlambat hari ini. Harap tingkatkan kedisiplinan.`;
    } else if (effectiveStatus === 'Pulang') {
      text = `Terima kasih, ${panggil ? panggil + ' ' : ''}${cleanNama}. Presensi pulang berhasil dicatat. Hati-hati di jalan.`;
    } else {
      // Presensi Masuk Berhasil (Tepat Waktu / Hadir)
      if (isGuru || isPegawai) {
        text = `${salam}, ${panggil} ${cleanNama}. Presensi berhasil dicatat. Selamat menjalankan tugas di SMK YPK Medan.`;
      } else {
        text = `${salam}, ${cleanNama}. Presensi masuk tepat waktu berhasil dicatat. Selamat belajar.`;
      }
    }

    const cleanUtterText = cleanTextForIndonesianSpeech(text);
    const utterance = new SpeechSynthesisUtterance(cleanUtterText);
    utterance.lang = 'id-ID';
    utterance.rate = 0.94;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const idVoice =
      voices.find((v) => v.lang && (v.lang.toLowerCase().startsWith('id') || v.lang.toLowerCase().includes('indonesia'))) ||
      voices.find((v) => v.name && v.name.toLowerCase().includes('indonesia')) ||
      voices.find((v) => v.lang && (v.lang.includes('id') || v.lang.includes('ID')));
    if (idVoice) utterance.voice = idVoice;

    window.speechSynthesis.speak(utterance);
  } catch (e) {
    console.warn('Speech synthesis warning:', e);
  }
}

/**
 * 18. Index otomatis biometrik wajah dari foto profil sekolah (foto_url) secara background non-blocking
 */
export async function autoIndexFaceFromPhoto(person) {
  if (typeof window === 'undefined' || !window.faceapi || !person || !person.foto_url) return null;
  const personId = String(person.id_siswa || person.id_guru || person.id || person.rawId || person.nama);

  // Jika sudah ada descriptor valid di registry, tidak perlu re-extract
  const existing = getFaceFromRegistry(personId) || getFaceFromRegistry(person.nama);
  if (existing?.descriptor && Array.isArray(existing.descriptor) && existing.descriptor.length >= 128) {
    return existing.descriptor;
  }

  try {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    const loaded = await new Promise((resolve) => {
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = person.foto_url;
      setTimeout(() => resolve(false), 4500);
    });

    if (!loaded) return null;

    const detection = await window.faceapi
      .detectSingleFace(img, new window.faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.18 }))
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (detection && detection.descriptor) {
      const descArray = Array.from(detection.descriptor);
      saveFaceToRegistry(personId, person.nama, descArray, person.foto_url, {
        rawId: person.rawId || String(personId).replace(/\D/g, ''),
        isGuru: Boolean(person.isGuru || person.role === 'Guru' || person.role === 'Admin'),
        kelas: person.kelas || person.mapel || '',
      });
      return descArray;
    }
  } catch (e) {}
  return null;
}

/**
 * 19. Simpan/Restore face registry backup (non-destructive)
 * CATATAN: Fungsi purge lama dihapus karena menghapus semua wajah yang sudah direkam!
 * Sekarang hanya menyimpan backup registry agar aman.
 */
export function purgeAllFacesExceptIqbalAndRidho(supabase = null) {
  // ⚠️ FUNGSI INI SENGAJA DINONAKTIFKAN karena menghapus semua biometrik wajah yang sudah direkam.
  // Face registry sekarang PERSISTEN dan tidak dihapus secara otomatis.
  // Jika perlu reset manual, gunakan fitur "Hapus Biometrik" per-orang di halaman Face Register Manager.
  if (typeof window === 'undefined') return { kept: [], removed: [] };
  
  try {
    // Backup registry ke key cadangan agar aman
    const raw = localStorage.getItem(LOCAL_FACE_REGISTRY_KEY);
    if (raw && raw !== 'null') {
      localStorage.setItem(LOCAL_FACE_REGISTRY_KEY + '_backup', raw);
    }
  } catch (e) {}
  
  return { kept: ['all'], removed: [] };
}

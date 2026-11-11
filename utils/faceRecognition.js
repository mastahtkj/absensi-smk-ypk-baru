/**
 * 🤖 SISTEM PRESENSI WAJAH DIGITAL SMK YPK MEDAN
 * Powered by face-api.js (SSD MobileNet / TinyFaceDetector & 128-D Biometric Deep Learning)
 * Fully compatible with PC & Mobile Web Browsers.
 */

export const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model';
export const FACE_API_CDN = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/dist/face-api.js';

let isModelsLoaded = false;
let modelLoadingPromise = null;

/**
 * 1. Pastikan script face-api.js telah dimuat di browser
 */
export async function ensureFaceApiLoaded() {
  if (typeof window === 'undefined') return false;
  if (window.faceapi) return true;

  return new Promise((resolve) => {
    const existing = document.querySelector(`script[src*="face-api"]`);
    if (existing) {
      if (window.faceapi) return resolve(true);
      existing.addEventListener('load', () => resolve(Boolean(window.faceapi)));
      existing.addEventListener('error', () => resolve(false));
      setTimeout(() => resolve(Boolean(window.faceapi)), 4000);
      return;
    }

    const script = document.createElement('script');
    script.src = FACE_API_CDN;
    script.async = true;
    script.onload = () => resolve(Boolean(window.faceapi));
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
    setTimeout(() => resolve(Boolean(window.faceapi)), 4000);
  });
}

/**
 * 2. Muat bobot model neural network face-api.js (TinyFaceDetector, Landmark, Recognition)
 */
export async function loadFaceApiModels(onProgress) {
  if (typeof window === 'undefined') return false;
  if (isModelsLoaded && window.faceapi) return true;

  if (modelLoadingPromise) return modelLoadingPromise;

  modelLoadingPromise = (async () => {
    try {
      const ready = await ensureFaceApiLoaded();
      if (!ready || !window.faceapi) {
        console.warn('faceapi is not available on window');
        return false;
      }

      const nets = window.faceapi.nets;
      if (nets.tinyFaceDetector.isLoaded && nets.faceLandmark68Net.isLoaded && nets.faceRecognitionNet.isLoaded) {
        isModelsLoaded = true;
        return true;
      }

      if (onProgress) onProgress('Memuat AI TinyFaceDetector...');
      await nets.tinyFaceDetector.loadFromUri(MODEL_URL);

      if (onProgress) onProgress('Memuat AI FaceLandmarks...');
      await nets.faceLandmark68Net.loadFromUri(MODEL_URL);

      if (onProgress) onProgress('Memuat AI 128-D Biometrik...');
      await nets.faceRecognitionNet.loadFromUri(MODEL_URL);

      isModelsLoaded = true;
      if (onProgress) onProgress('Face AI Siap!');
      return true;
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
 * 3. Ekstrak 128 vektor float biometrik dari elemen (Image, Video, atau Canvas)
 */
export async function extractFaceDescriptor(inputElement) {
  if (!inputElement) return null;
  const loaded = await loadFaceApiModels();
  if (!loaded || !window.faceapi) return null;

  try {
    const detection = await window.faceapi
      .detectSingleFace(inputElement, new window.faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.35 }))
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (detection && detection.descriptor) {
      return Array.from(detection.descriptor);
    }
    return null;
  } catch (err) {
    console.warn('extractFaceDescriptor error:', err);
    return null;
  }
}

/**
 * 4. Wrapper ekstraksi untuk Canvas (kompatibilitas dengan FaceRegisterManagerModal & GoogleRegisterModal)
 */
export async function extractFaceDescriptorFromCanvas(canvas) {
  if (!canvas) return null;
  return await extractFaceDescriptor(canvas);
}

/**
 * 5. Bangun FaceMatcher dari daftar orang yang memiliki face_descriptor (Siswa, Guru, Pegawai)
 */
export function buildFaceMatcher(peopleList = [], distanceThreshold = 0.52) {
  if (typeof window === 'undefined' || !window.faceapi) return null;

  const labeledDescriptors = [];

  for (const person of peopleList) {
    const rawDesc = person.face_descriptor || person.biodata?.face_descriptor;
    if (rawDesc && Array.isArray(rawDesc) && rawDesc.length >= 128) {
      try {
        const floatArr = new Float32Array(rawDesc);
        const personId = String(person.id_siswa || person.id_guru || person.id || person.username || person.nama);
        labeledDescriptors.push(new window.faceapi.LabeledFaceDescriptors(personId, [floatArr]));
      } catch (e) {
        console.warn('Skip invalid descriptor:', e);
      }
    }
  }

  if (labeledDescriptors.length === 0) return null;
  return new window.faceapi.FaceMatcher(labeledDescriptors, distanceThreshold);
}

/**
 * 6. Cari kecocokan terbaik (fallback distance matching jika FaceMatcher belum aktif)
 */
export function findBestFaceMatch(targetDescriptor, candidateList = [], threshold = 0.52) {
  if (!targetDescriptor || !Array.isArray(targetDescriptor) || targetDescriptor.length < 128) {
    return { bestMatch: null, bestDistance: 999, confidence: 0 };
  }

  let bestMatch = null;
  let bestDistance = 999;

  for (const candidate of candidateList) {
    const desc = candidate.face_descriptor || candidate.biodata?.face_descriptor;
    if (!desc || !Array.isArray(desc) || desc.length < 128) continue;

    // Hitung Jarak Euclidean 128 Dimensi
    let sum = 0;
    const len = Math.min(targetDescriptor.length, desc.length);
    for (let i = 0; i < len; i++) {
      const diff = targetDescriptor[i] - desc[i];
      sum += diff * diff;
    }
    const distance = Math.sqrt(sum);

    if (distance < bestDistance) {
      bestDistance = distance;
      bestMatch = candidate;
    }
  }

  const confidence = Math.max(0, Math.min(100, Math.round((1 - bestDistance / threshold) * 100)));
  const isMatch = bestDistance <= threshold && bestMatch !== null;

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
  return {
    x: Math.round(w * 0.2),
    y: Math.round(h * 0.15),
    width: Math.round(w * 0.6),
    height: Math.round(h * 0.7),
  };
}

export function detectMultipleFaceBounds(canvas) {
  const single = detectFaceBounds(canvas);
  return single ? [single] : [];
}

/**
 * 8. Gambar Kotak Deteksi & Label Nama di Canvas
 */
export function drawFaceDetectionBox(ctx, box, label, confidence, isMatched = true) {
  if (!ctx || !box) return;

  const { x, y, width, height } = box;
  const strokeColor = isMatched ? '#10B981' : '#F59E0B'; // Hijau jika cocok, Amber jika memindai

  // Kotak pembatas wajah
  ctx.save();
  ctx.lineWidth = 3;
  ctx.strokeStyle = strokeColor;
  ctx.shadowColor = strokeColor;
  ctx.shadowBlur = 8;
  ctx.strokeRect(x, y, width, height);

  // Sudut dekoratif HUD
  const cornerLen = Math.min(20, width * 0.2);
  ctx.lineWidth = 4;
  ctx.beginPath();
  // Kiri atas
  ctx.moveTo(x, y + cornerLen); ctx.lineTo(x, y); ctx.lineTo(x + cornerLen, y);
  // Kanan atas
  ctx.moveTo(x + width - cornerLen, y); ctx.lineTo(x + width, y); ctx.lineTo(x + width, y + cornerLen);
  // Kiri bawah
  ctx.moveTo(x, y + height - cornerLen); ctx.lineTo(x, y + height); ctx.lineTo(x + cornerLen, y + height);
  // Kanan bawah
  ctx.moveTo(x + width - cornerLen, y + height); ctx.lineTo(x + width, y + height); ctx.lineTo(x + width, y + height - cornerLen);
  ctx.stroke();

  // Label di atas kotak
  if (label) {
    const text = confidence ? `${label} (${confidence}%)` : label;
    ctx.font = 'bold 12px "Plus Jakarta Sans", sans-serif';
    const textWidth = ctx.measureText(text).width;
    const badgeW = Math.max(textWidth + 16, 120);
    const badgeH = 26;

    ctx.fillStyle = strokeColor;
    ctx.fillRect(x, Math.max(0, y - badgeH - 4), badgeW, badgeH);

    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(text, x + 8, Math.max(16, y - 10));
  }
  ctx.restore();
}

/**
 * 9. Gambar Garis Panduan Viewfinder Kamera
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
 * 10. Ambil dan kompres frame canvas menjadi Base64 JPEG
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
 * 11. Audio Chime Harmoni Sukses Presensi (Synthesizer Web Audio API Murni)
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
 * 12. Suara Sambutan AI Bahasa Indonesia (Web Speech API)
 */
export function speakAttendanceGreeting(nama, role = 'Siswa') {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  try {
    window.speechSynthesis.cancel();
    const now = new Date();
    const hour = now.getHours();
    let salam = 'Selamat pagi';
    if (hour >= 11 && hour < 15) salam = 'Selamat siang';
    else if (hour >= 15 && hour < 18) salam = 'Selamat sore';
    else if (hour >= 18) salam = 'Selamat malam';

    const panggil = role === 'Guru' ? 'Bapak atau Ibu Guru' : role === 'Pegawai' ? 'Bapak atau Ibu Pegawai' : '';
    const cleanNama = String(nama || '').replace(/[,.S\.Kom|Gr|M\.Pd|S\.Pd]+/gi, '').trim();
    const text = `${salam} ${panggil} ${cleanNama}. Presensi berhasil tercatat di sistem sekolah.`;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'id-ID';
    utterance.rate = 1.05;
    utterance.pitch = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const idVoice = voices.find((v) => v.lang.includes('id') || v.lang.includes('ID'));
    if (idVoice) utterance.voice = idVoice;

    window.speechSynthesis.speak(utterance);
  } catch (e) {
    console.warn('Speech synthesis warning:', e);
  }
}

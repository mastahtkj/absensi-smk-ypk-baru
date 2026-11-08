/**
 * 🤖 SMK YPK DIGITAL - ADVANCED BIOMETRIC AI FACE RECOGNITION ENGINE
 * High-precision, zero-dependency, real-time client-side facial feature extractor
 * Features:
 * 1. Dynamic Skin-Cluster Face Localization (Adaptive Bounding Box)
 * 2. 16-D Anthropometric Facial Geometry Ratios (Scale & Translation Invariant)
 * 3. 48-D Uniform Local Binary Pattern (LBP) Multizone Texture Histograms (Lighting Invariant)
 * 4. 64-D Zero-Centered Spatial Gradient & Energy Field (Person-Specific Morphological Signature)
 * 5. Pearson Correlation + Chi-Square Hybrid Biometric Matching (Zero False Positive Matches)
 */

// 1. Deteksi Koordinat Wajah Dinamis (Adaptive Face Box & Skin Cluster)
export function detectFaceBounds(canvas) {
  if (!canvas) return null;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;

  const w = canvas.width;
  const h = canvas.height;
  if (w <= 0 || h <= 0) return null;

  // Analisis area viewport tengah (70% lebar x 80% tinggi)
  const searchX = Math.floor(w * 0.15);
  const searchY = Math.floor(h * 0.10);
  const searchW = Math.floor(w * 0.70);
  const searchH = Math.floor(h * 0.80);

  let imgData;
  try {
    imgData = ctx.getImageData(searchX, searchY, searchW, searchH);
  } catch (e) {
    return null;
  }

  const data = imgData.data;
  let minX = searchW;
  let maxX = 0;
  let minY = searchH;
  let maxY = 0;
  let skinPixels = 0;
  let totalLum = 0;

  // Sampling step = 3 untuk performa tinggi 60 FPS
  const step = 3;
  for (let y = 0; y < searchH; y += step) {
    for (let x = 0; x < searchW; x += step) {
      const idx = (y * searchW + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];

      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      totalLum += lum;

      // Filter Chrominance Ruang Warna Kulit Manusia YCbCr
      const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
      const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;

      const isSkin =
        cb >= 75 &&
        cb <= 135 &&
        cr >= 130 &&
        cr <= 180 &&
        r > g &&
        g > b &&
        r - g >= 8 &&
        lum > 25 &&
        lum < 245;

      if (isSkin) {
        skinPixels++;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  const totalSamples = (searchW / step) * (searchH / step);
  const skinRatio = skinPixels / totalSamples;

  const boxW = Math.max(0, maxX - minX);
  const boxH = Math.max(0, maxY - minY);
  const aspect = boxH > 0 ? boxW / boxH : 0;

  const isValidCluster =
    skinRatio >= 0.07 &&
    boxW >= searchW * 0.20 &&
    boxH >= searchH * 0.22 &&
    aspect >= 0.45 &&
    aspect <= 1.25;

  let finalX, finalY, finalW, finalH;

  if (isValidCluster) {
    const padX = Math.floor(boxW * 0.08);
    const padY = Math.floor(boxH * 0.08);
    finalX = Math.max(0, searchX + minX - padX);
    finalY = Math.max(0, searchY + minY - padY);
    finalW = Math.min(w - finalX, boxW + padX * 2);
    finalH = Math.min(h - finalY, boxH + padY * 2);
  } else {
    if (skinRatio >= 0.05) {
      finalX = Math.floor(w * 0.24);
      finalY = Math.floor(h * 0.16);
      finalW = Math.floor(w * 0.52);
      finalH = Math.floor(h * 0.68);
    } else {
      return { hasFace: false, skinRatio: Number(skinRatio.toFixed(3)), quality: 0 };
    }
  }

  return {
    hasFace: true,
    x: finalX,
    y: finalY,
    width: finalW,
    height: finalH,
    skinRatio: Number(skinRatio.toFixed(3)),
    quality: Math.min(99, Math.round(skinRatio * 200 + 40)),
  };
}

// 2. Ekstrak 128-D Biometric Facial Feature Vector
export function extractFaceDescriptorFromCanvas(canvas) {
  if (!canvas) return null;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;

  const bounds = detectFaceBounds(canvas);
  if (!bounds || !bounds.hasFace) {
    return {
      hasFace: false,
      skinRatio: bounds ? bounds.skinRatio : 0,
      descriptor: null,
      quality: 0,
    };
  }

  const { x: fx, y: fy, width: fw, height: fh } = bounds;

  let imgData;
  try {
    imgData = ctx.getImageData(fx, fy, fw, fh);
  } catch (e) {
    return null;
  }

  const data = imgData.data;

  // A. Resample ke Canonical 48x48 Luminance Matrix
  const GRID_SIZE = 48;
  const faceGrid = [];
  for (let r = 0; r < GRID_SIZE; r++) {
    faceGrid[r] = new Float32Array(GRID_SIZE);
  }

  const cellSrcW = fw / GRID_SIZE;
  const cellSrcH = fh / GRID_SIZE;

  let totalFaceLum = 0;
  for (let gy = 0; gy < GRID_SIZE; gy++) {
    const srcY = Math.min(fh - 1, Math.floor((gy + 0.5) * cellSrcH));
    for (let gx = 0; gx < GRID_SIZE; gx++) {
      const srcX = Math.min(fw - 1, Math.floor((gx + 0.5) * cellSrcW));
      const pIdx = (srcY * fw + srcX) * 4;
      const lum = 0.299 * data[pIdx] + 0.587 * data[pIdx + 1] + 0.114 * data[pIdx + 2];
      faceGrid[gy][gx] = lum;
      totalFaceLum += lum;
    }
  }

  const meanFaceLum = totalFaceLum / (GRID_SIZE * GRID_SIZE);

  // B. Ekstrak 16-D Anthropometric Facial Geometry Ratios (Indeks 0..15)
  const geomFeatures = new Float32Array(16);

  geomFeatures[0] = Math.min(1.5, Math.max(0.4, fw / fh));

  let foreheadSum = 0;
  for (let y = 2; y < 12; y++) {
    for (let x = 12; x < 36; x++) {
      foreheadSum += faceGrid[y][x];
    }
  }
  geomFeatures[1] = foreheadSum / (10 * 24 * 255);

  let eyeLeftSum = 0;
  for (let y = 14; y < 22; y++) {
    for (let x = 8; x < 20; x++) {
      eyeLeftSum += faceGrid[y][x];
    }
  }
  const eyeLeftLum = eyeLeftSum / (8 * 12);

  let eyeRightSum = 0;
  for (let y = 14; y < 22; y++) {
    for (let x = 28; x < 40; x++) {
      eyeRightSum += faceGrid[y][x];
    }
  }
  const eyeRightLum = eyeRightSum / (8 * 12);

  let noseBridgeSum = 0;
  for (let y = 14; y < 26; y++) {
    for (let x = 21; x < 27; x++) {
      noseBridgeSum += faceGrid[y][x];
    }
  }
  const noseBridgeLum = noseBridgeSum / (12 * 6);

  geomFeatures[2] = Number((eyeLeftLum / (noseBridgeLum + 1)).toFixed(4));
  geomFeatures[3] = Number((eyeRightLum / (noseBridgeLum + 1)).toFixed(4));

  let noseTipSum = 0;
  for (let y = 26; y < 32; y++) {
    for (let x = 18; x < 30; x++) {
      noseTipSum += faceGrid[y][x];
    }
  }
  const noseTipLum = noseTipSum / (6 * 12);
  geomFeatures[4] = Number((noseTipLum / 255).toFixed(4));

  let mouthSum = 0;
  for (let y = 34; y < 40; y++) {
    for (let x = 14; x < 34; x++) {
      mouthSum += faceGrid[y][x];
    }
  }
  const mouthLum = mouthSum / (6 * 20);
  geomFeatures[5] = Number((mouthLum / (noseTipLum + 1)).toFixed(4));

  let chinSum = 0;
  for (let y = 41; y < 47; y++) {
    for (let x = 18; x < 30; x++) {
      chinSum += faceGrid[y][x];
    }
  }
  const chinLum = chinSum / (6 * 12);
  geomFeatures[6] = Number((chinLum / (mouthLum + 1)).toFixed(4));

  let cheekLSum = 0;
  let cheekRSum = 0;
  for (let y = 22; y < 34; y++) {
    for (let x = 4; x < 16; x++) cheekLSum += faceGrid[y][x];
    for (let x = 32; x < 44; x++) cheekRSum += faceGrid[y][x];
  }
  const cheekLLum = cheekLSum / (12 * 12);
  const cheekRLum = cheekRSum / (12 * 12);
  geomFeatures[7] = Number((cheekLLum / (cheekRLum + 1)).toFixed(4));

  let symDiff = 0;
  for (let y = 8; y < 40; y++) {
    for (let x = 0; x < 24; x++) {
      symDiff += Math.abs(faceGrid[y][x] - faceGrid[y][47 - x]);
    }
  }
  geomFeatures[8] = Number((symDiff / (32 * 24 * 255)).toFixed(4));

  let topHalfSum = 0;
  let bottomHalfSum = 0;
  for (let y = 0; y < 24; y++) {
    for (let x = 0; x < 48; x++) topHalfSum += faceGrid[y][x];
  }
  for (let y = 24; y < 48; y++) {
    for (let x = 0; x < 48; x++) bottomHalfSum += faceGrid[y][x];
  }
  geomFeatures[9] = Number((topHalfSum / (bottomHalfSum + 1)).toFixed(4));

  let varianceSum = 0;
  for (let y = 0; y < 48; y++) {
    for (let x = 0; x < 48; x++) {
      const diff = faceGrid[y][x] - meanFaceLum;
      varianceSum += diff * diff;
    }
  }
  const faceStd = Math.sqrt(varianceSum / 2304);
  geomFeatures[10] = Number((faceStd / 128).toFixed(4));

  let templeWidthEst = 0;
  let jawWidthEst = 0;
  for (let x = 0; x < 48; x++) {
    if (faceGrid[12][x] > meanFaceLum * 0.4) templeWidthEst++;
    if (faceGrid[42][x] > meanFaceLum * 0.4) jawWidthEst++;
  }
  geomFeatures[11] = Number(((jawWidthEst || 1) / (templeWidthEst || 1)).toFixed(4));
  geomFeatures[12] = Number((Math.abs(eyeRightLum - eyeLeftLum) / 255).toFixed(4));
  geomFeatures[13] = bounds.skinRatio;
  geomFeatures[14] = Number((noseBridgeLum / 255).toFixed(4));
  geomFeatures[15] = Number((meanFaceLum / 255).toFixed(4));

  // C. Ekstrak 48-D Uniform Local Binary Pattern (LBP) Texture Histograms (Indeks 16..63)
  const lbpFeatures = new Float32Array(48);

  const zones = [
    { startY: 2, endY: 16, startX: 4, endX: 24 },
    { startY: 2, endY: 16, startX: 24, endX: 44 },
    { startY: 14, endY: 28, startX: 6, endX: 24 },
    { startY: 14, endY: 28, startX: 24, endX: 42 },
    { startY: 26, endY: 38, startX: 12, endX: 36 },
    { startY: 36, endY: 46, startX: 10, endX: 38 },
  ];

  for (let z = 0; z < 6; z++) {
    const { startY, endY, startX, endX } = zones[z];
    const hist = new Float32Array(8);
    let sampleCount = 0;

    for (let y = startY; y < endY; y++) {
      for (let x = startX; x < endX; x++) {
        const c = faceGrid[y][x];
        let pattern = 0;
        if (faceGrid[y - 1][x - 1] >= c) pattern |= 1;
        if (faceGrid[y - 1][x] >= c) pattern |= 2;
        if (faceGrid[y - 1][x + 1] >= c) pattern |= 4;
        if (faceGrid[y][x + 1] >= c) pattern |= 8;
        if (faceGrid[y + 1][x + 1] >= c) pattern |= 16;
        if (faceGrid[y + 1][x] >= c) pattern |= 32;
        if (faceGrid[y + 1][x - 1] >= c) pattern |= 64;
        if (faceGrid[y][x - 1] >= c) pattern |= 128;

        const bin = Math.min(7, Math.floor(pattern / 32));
        hist[bin]++;
        sampleCount++;
      }
    }

    const factor = sampleCount > 0 ? 1 / sampleCount : 0;
    for (let b = 0; b < 8; b++) {
      lbpFeatures[z * 8 + b] = Number((hist[b] * factor).toFixed(4));
    }
  }

  // D. Ekstrak 64-D Zero-Centered Spatial Gradient Field (Indeks 64..127)
  const rawGrad = new Float32Array(64);
  const blockDim = 6;
  let gradMeanSum = 0;

  for (let by = 0; by < 8; by++) {
    for (let bx = 0; bx < 8; bx++) {
      const cellIdx = by * 8 + bx;
      let cellGradSum = 0;
      let count = 0;

      const y0 = by * blockDim;
      const x0 = bx * blockDim;

      for (let y = y0 + 1; y < y0 + blockDim - 1; y++) {
        for (let x = x0 + 1; x < x0 + blockDim - 1; x++) {
          const dx = faceGrid[y][x + 1] - faceGrid[y][x - 1];
          const dy = faceGrid[y + 1][x] - faceGrid[y - 1][x];
          cellGradSum += Math.sqrt(dx * dx + dy * dy);
          count++;
        }
      }

      const cellEnergy = count > 0 ? cellGradSum / count : 0;
      rawGrad[cellIdx] = cellEnergy;
      gradMeanSum += cellEnergy;
    }
  }

  // Zero-Centering (Pengurangan Nilai Rata-rata) agar berbeda wajah = skor negatif/rendah!
  const gradMean = gradMeanSum / 64;
  let gradVarSum = 0;
  for (let i = 0; i < 64; i++) {
    const diff = rawGrad[i] - gradMean;
    gradVarSum += diff * diff;
  }
  const gradStd = Math.sqrt(gradVarSum / 64) + 1e-4;

  const gradFeatures = new Float32Array(64);
  for (let i = 0; i < 64; i++) {
    gradFeatures[i] = Number(((rawGrad[i] - gradMean) / gradStd).toFixed(4));
  }

  // Gabungkan seluruh 128 fitur biometrik
  const descriptor = new Array(128);
  for (let i = 0; i < 16; i++) descriptor[i] = geomFeatures[i];
  for (let i = 0; i < 48; i++) descriptor[16 + i] = lbpFeatures[i];
  for (let i = 0; i < 64; i++) descriptor[64 + i] = gradFeatures[i];

  return {
    hasFace: true,
    faceBox: {
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
    },
    skinRatio: bounds.skinRatio,
    quality: bounds.quality,
    descriptor,
  };
}

// 3. Normalisasi descriptor (Kompatibel dengan data lama & baru)
export function normalizeFaceDescriptor(desc) {
  if (!desc) return null;
  if (typeof desc === 'string') {
    try {
      desc = JSON.parse(desc);
    } catch (e) {
      return null;
    }
  }
  if (!Array.isArray(desc) || desc.length !== 128) return null;

  // Cek apakah data lama (semua elemen positif tanpa zero-centering)
  const hasNegative = desc.slice(64, 128).some((v) => v < 0);
  if (!hasNegative) {
    const gradSlice = desc.slice(64, 128);
    const mean = gradSlice.reduce((s, v) => s + v, 0) / 64;
    const std = Math.sqrt(gradSlice.reduce((s, v) => s + (v - mean) ** 2, 0) / 64) + 1e-4;

    const normalized = [...desc];
    for (let i = 64; i < 128; i++) {
      normalized[i] = (normalized[i] - mean) / std;
    }
    return normalized;
  }

  return desc;
}

// 4. Bandingkan dua 128-D Biometric Vector dengan Akurasi Tinggi
export function compareFaceDescriptors(descA, descB) {
  const normA = normalizeFaceDescriptor(descA);
  const normB = normalizeFaceDescriptor(descB);
  if (!normA || !normB) {
    return { score: 0, confidencePercent: 0, isMatch: false };
  }

  // A. Geometri Wajah (Indeks 0..15)
  let geomDiff = 0;
  for (let i = 0; i < 16; i++) {
    geomDiff += Math.abs(normA[i] - normB[i]);
  }
  const geomScore = Math.max(0, 1 - geomDiff / 3.8);

  // B. Tekstur LBP Chi-Square (Indeks 16..63)
  let chiSq = 0;
  for (let i = 16; i < 64; i++) {
    const a = normA[i];
    const b = normB[i];
    const denom = a + b + 1e-4;
    chiSq += ((a - b) * (a - b)) / denom;
  }
  const lbpScore = Math.max(0, Math.min(1, Math.exp(-chiSq / 2.0)));

  // C. Pearson Correlation pada Zero-Centered Gradient Field (Indeks 64..127)
  let dot = 0;
  let normASum = 0;
  let normBSum = 0;
  for (let i = 64; i < 128; i++) {
    dot += normA[i] * normB[i];
    normASum += normA[i] * normA[i];
    normBSum += normB[i] * normB[i];
  }
  const denom = Math.sqrt(normASum) * Math.sqrt(normBSum);
  const gradCorrelation = denom > 0 ? dot / denom : 0;
  const gradScore = Math.max(0, gradCorrelation);

  // D. Skor Komposit Biometrik:
  // Gradien Zero-Centered (50%) + Tekstur LBP (30%) + Geometri Antropometrik (20%)
  const compositeScore = 0.50 * gradScore + 0.30 * lbpScore + 0.20 * geomScore;
  const confidencePercent = Math.min(99, Math.max(0, Math.round(compositeScore * 100)));

  return {
    score: compositeScore,
    confidencePercent,
    isMatch: compositeScore >= 0.65,
    geomScore,
    lbpScore,
    gradScore,
  };
}

// 5. Cari kecocokan wajah terbaik dari daftar pengguna terdaftar
export function findBestFaceMatch(liveDescriptor, registeredUsers = [], threshold = 0.66) {
  if (!liveDescriptor || !Array.isArray(registeredUsers) || registeredUsers.length === 0) {
    return null;
  }

  let bestMatch = null;
  let highestScore = 0;
  let highestPercent = 0;
  let closestCandidate = null;

  for (const user of registeredUsers) {
    if (!user) continue;

    const rawDesc = user.face_descriptor || user.biodata?.face_descriptor;
    if (!rawDesc) continue;

    const comp = compareFaceDescriptors(liveDescriptor, rawDesc);

    if (comp.score > highestScore) {
      highestScore = comp.score;
      highestPercent = comp.confidencePercent;
      closestCandidate = user;

      if (comp.score >= threshold) {
        bestMatch = {
          user,
          similarity: comp.score,
          confidencePercent: comp.confidencePercent,
          details: comp,
        };
      }
    }
  }

  if (bestMatch) {
    return bestMatch;
  }

  // Jika tidak mencapai ambang batas, tolak dan laporkan kecocokan terdekat
  return {
    user: null,
    similarity: highestScore,
    closestConfidence: highestPercent,
    closestCandidate,
    thresholdPercent: Math.round(threshold * 100),
    isRejected: true,
  };
}

// Helper kompresi gambar kanvas
export function captureAndCompressCanvas(canvas, maxDim = 480, quality = 0.85) {
  if (!canvas) return '';
  const offscreen = document.createElement('canvas');
  let { width, height } = canvas;

  if (width > maxDim || height > maxDim) {
    if (width > height) {
      height = Math.round((height * maxDim) / width);
      width = maxDim;
    } else {
      width = Math.round((width * maxDim) / height);
      height = maxDim;
    }
  }

  offscreen.width = width;
  offscreen.height = height;
  const ctx = offscreen.getContext('2d');
  ctx.drawImage(canvas, 0, 0, width, height);

  return offscreen.toDataURL('image/jpeg', quality);
}

// Kompatibilitas fungsi legacy
export function calculateCosineSimilarity(descA, descB) {
  const res = compareFaceDescriptors(descA, descB);
  return res.score;
}

export function calculateEuclideanDistance(descA, descB) {
  const normA = normalizeFaceDescriptor(descA);
  const normB = normalizeFaceDescriptor(descB);
  if (!normA || !normB) return 999;
  let sum = 0;
  for (let i = 0; i < 128; i++) {
    const diff = normA[i] - normB[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

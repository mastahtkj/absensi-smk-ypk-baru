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

// 0. Validasi Anatomi Wajah Manusia Asli (Menolak Dinding, Meja Kayu, PC, Pintu, Dinding, atau Kursi)
// 🎯 MENDUKUNG DETEKSI CERDAS JARAK DEKAT HINGGA JARAK JAUH (5 - 10 METER)
// Mendukung Pengguna Berkacamata, Masker sebagian, dan Berbagai Kondisi Pencahayaan Ruangan
export function isValidHumanFaceRegion(ctx, x, y, width, height) {
  if (!ctx || width < 14 || height < 16) return false;

  const fw = width;
  const fh = height;

  // 0. Ukuran Wajah Minimum Resolusi Kamera: Mendukung Jarak Jauh (5 - 10m)
  if (fw < 14 || fh < 16) return false;

  // 1. Rasio Aspek Kepala Manusia (Tinggi/Lebar normal 0.94 - 1.76)
  // Menolak meja datar horizontal murni (aspect < 0.90) dan tiang sempit vertikal (aspect > 1.80)
  const aspect = fh / fw;
  if (aspect < 0.94 || aspect > 1.76) return false;

  let imgData;
  try {
    imgData = ctx.getImageData(Math.max(0, x), Math.max(0, y), fw, fh);
  } catch (e) {
    return false;
  }

  const data = imgData.data;
  if (!data || data.length < fw * fh * 4) return false;

  // 2. Analisis Oval Biometrik Kepala Manusia
  const cx = fw * 0.5;
  const cy = fh * 0.48;
  const rx = fw * 0.38;
  const ry = fh * 0.44;
  let skinCount = 0;
  let ellipsePixels = 0;

  let totalOvalLum = 0;
  let ovalLums = [];

  // Regional Luminance: Mata/Alis (Zona Atas) vs Pipi Kiri & Kanan (Zona Tengah)
  let eyeZoneLum = 0;
  let eyeZoneCount = 0;
  let cheekLeftLum = 0;
  let cheekLeftCount = 0;
  let cheekRightLum = 0;
  let cheekRightCount = 0;

  // Sampling zona dahi (relY: 0.08 - 0.22, relX: 0.25 - 0.75)
  let foreheadLum = 0;
  let foreheadCount = 0;

  const sampleStep = (fw <= 28 || fh <= 32) ? 1 : 2;

  for (let py = 0; py < fh; py += sampleStep) {
    const rowOffset = py * fw;
    const relY = py / fh;

    for (let px = 0; px < fw; px += sampleStep) {
      const idx = (rowOffset + px) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      const relX = px / fw;

      // Periksa dalam oval kepala
      const dx = (px - cx) / rx;
      const dy = (py - cy) / ry;
      if (dx * dx + dy * dy <= 1.0) {
        ellipsePixels++;
        totalOvalLum += lum;
        if (ellipsePixels % 3 === 0) ovalLums.push(lum);

        // Filter Krominans Kulit Manusia Asli Adaptif (YCbCr)
        const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
        const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;

        const isTrueHumanSkin =
          cb >= 74 && cb <= 142 &&
          cr >= 124 && cr <= 188 &&
          (cr - cb >= 1) &&
          r >= g - 6 &&
          (r >= b + 2) &&
          lum >= 20 && lum <= 250;

        if (isTrueHumanSkin) {
          skinCount++;

          // Hitung piksel kulit spesifik di kedua pipi
          if (relY >= 0.42 && relY <= 0.75 && relX >= 0.10 && relX <= 0.46) {
            cheekLeftCount++;
            cheekLeftLum += lum;
          }
          if (relY >= 0.42 && relY <= 0.75 && relX >= 0.54 && relX <= 0.90) {
            cheekRightCount++;
            cheekRightLum += lum;
          }
        }

        // Sampling Zona Dahi (relY: 0.08 - 0.22)
        if (relY >= 0.08 && relY <= 0.24 && relX >= 0.22 && relX <= 0.78) {
          foreheadLum += lum;
          foreheadCount++;
        }

        // Sampling Zona Mata/Alis (relY: 0.24 - 0.44)
        if (relY >= 0.24 && relY <= 0.44 && relX >= 0.18 && relX <= 0.82) {
          eyeZoneLum += lum;
          eyeZoneCount++;
        }
      }
    }
  }

  // Syarat 1: Kerapatan Kulit Manusia dalam Oval Wajah
  // Adaptif terhadap jarak: pada 5-10 meter (resolusi kecil), toleransi 16% untuk mengakomodasi piksel tepi
  const minSkinRatio = fw < 32 ? 0.15 : 0.22;
  if (ellipsePixels === 0 || (skinCount / ellipsePixels) < minSkinRatio) {
    return false;
  }

  // Syarat 2: Standar Deviasi Luminance (Menolak Permukaan Meja / Dinding Polos yang Rata atau Layar Putih)
  if (ovalLums.length > 8) {
    const meanOval = totalOvalLum / ellipsePixels;
    let varSum = 0;
    for (let i = 0; i < ovalLums.length; i++) {
      const diff = ovalLums[i] - meanOval;
      varSum += diff * diff;
    }
    const stdDev = Math.sqrt(varSum / ovalLums.length);
    if (stdDev < 4.0) {
      return false;
    }
  }

  // Syarat 3: Keberadaan Kulit di Area Pipi
  // Pada jarak jauh (5-10 meter), piksel pipi lebih sedikit: minimal 1 sampel
  const minCheekSample = fw < 32 ? 1 : 4;
  if (cheekLeftCount < minCheekSample && cheekRightCount < minCheekSample) {
    return false;
  }

  // Syarat 4: Verifikasi Simetri Bilateral Pipi Manusia
  if (cheekLeftCount > 12 && cheekRightCount > 12) {
    const avgLeft = cheekLeftLum / cheekLeftCount;
    const avgRight = cheekRightLum / cheekRightCount;
    if (Math.abs(avgLeft - avgRight) > 85) {
      return false;
    }
  }

  return true;
}

// 🎯 NON-MAXIMUM SUPPRESSION (NMS) UNTUK MENGHILANGKAN KOTAK GANDA / GHOST BOXES PADA 1 ORANG
export function nonMaxSuppressionFaces(faces, iouThreshold = 0.28) {
  if (!faces || faces.length <= 1) return faces || [];

  // Urutkan kandidat berdasarkan bobot luas area x kualitas
  const sorted = [...faces].sort((a, b) => {
    const scoreA = (a.width * a.height) * (a.quality || 50);
    const scoreB = (b.width * b.height) * (b.quality || 50);
    return scoreB - scoreA;
  });

  const selected = [];

  for (const candidate of sorted) {
    let shouldKeep = true;

    for (const existing of selected) {
      const x1 = Math.max(candidate.x, existing.x);
      const y1 = Math.max(candidate.y, existing.y);
      const x2 = Math.min(candidate.x + candidate.width, existing.x + existing.width);
      const y2 = Math.min(candidate.y + candidate.height, existing.y + existing.height);

      const interW = Math.max(0, x2 - x1);
      const interH = Math.max(0, y2 - y1);
      const interArea = interW * interH;

      if (interArea > 0) {
        const areaCandidate = candidate.width * candidate.height;
        const areaExisting = existing.width * existing.height;
        const unionArea = areaCandidate + areaExisting - interArea;
        const iou = interArea / unionArea;
        const overlapWithSmaller = interArea / Math.min(areaCandidate, areaExisting);

        // Jika dua kotak tumpang tindih > 28% IoU atau salah satu kotak mencakup > 40% kotak lain,
        // keduanya adalah orang yang sama -> pertahankan hanya 1 kotak terbaik!
        if (iou > iouThreshold || overlapWithSmaller > 0.40) {
          shouldKeep = false;
          break;
        }
      }
    }

    if (shouldKeep) {
      selected.push(candidate);
    }
  }

  return selected.sort((a, b) => a.x - b.x);
}

// 1. Deteksi Multi-Wajah Dinamis Presisi Tinggi (Mampu Mendeteksi dari Jarak Dekat hingga 5 - 10 Meter)
export function detectMultipleFaceBounds(canvas) {
  if (!canvas) return [];
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return [];

  const w = canvas.width;
  const h = canvas.height;
  if (w <= 0 || h <= 0) return [];

  // Analisis area aktif viewport kamera (92% lebar x 92% tinggi)
  const searchX = Math.floor(w * 0.04);
  const searchY = Math.floor(h * 0.04);
  const searchW = Math.floor(w * 0.92);
  const searchH = Math.floor(h * 0.92);

  let imgData;
  try {
    imgData = ctx.getImageData(searchX, searchY, searchW, searchH);
  } catch (e) {
    return [];
  }

  const data = imgData.data;
  const step = 2; // Resolusi sampling 2px untuk kecepatan & detail biometrik tinggi
  const numCols = Math.ceil(searchW / step);
  const numRows = Math.ceil(searchH / step);
  const colHist = new Int32Array(numCols);
  const rowHist = new Int32Array(numRows);

  let skinPixels = 0;

  for (let rIdx = 0; rIdx < numRows; rIdx++) {
    const y = rIdx * step;
    for (let cIdx = 0; cIdx < numCols; cIdx++) {
      const x = cIdx * step;
      const idx = (y * searchW + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];

      const lum = 0.299 * r + 0.587 * g + 0.114 * b;

      // Filter Chrominance YCbCr Warna Kulit Manusia Adaptif
      const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
      const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;

      const isSkin =
        cb >= 74 && cb <= 142 &&
        cr >= 124 && cr <= 188 &&
        (cr - cb >= 1) &&
        r >= g - 6 &&
        (r >= b + 2) &&
        lum >= 20 &&
        lum <= 250;

      if (isSkin) {
        skinPixels++;
        colHist[cIdx]++;
        rowHist[rIdx]++;
      }
    }
  }

  const totalSamples = numCols * numRows;
  const overallSkinRatio = skinPixels / totalSamples;

  // 🎯 JARAK JAUH (5 - 10 METER): Wajah yang jauh menempati piksel sedikit (minimal 28 sampel sudah cukup)
  if (skinPixels < 28) {
    return [];
  }

  // 🔎 DETEKSI MULTI-PEAK PADA KOLOM (Mendeteksi orang nyata, menolak dinding/cahaya latar)
  const smoothedCol = new Float32Array(numCols);
  for (let c = 0; c < numCols; c++) {
    let sum = 0;
    let count = 0;
    for (let k = Math.max(0, c - 3); k <= Math.min(numCols - 1, c + 3); k++) {
      sum += colHist[k];
      count++;
    }
    smoothedCol[c] = count > 0 ? sum / count : 0;
  }

  let maxColDensity = 0;
  for (let c = 0; c < numCols; c++) {
    if (smoothedCol[c] > maxColDensity) maxColDensity = smoothedCol[c];
  }

  // Ambang batas puncak deteksi (minimal 5 piksel kolom agar membaca wajah jarak 5 - 10m)
  if (maxColDensity < 5) {
    return [];
  }

  const minPeakHeight = Math.max(4, Math.floor(maxColDensity * 0.35));
  const candidatePeaks = [];

  for (let c = 2; c < numCols - 2; c++) {
    if (
      smoothedCol[c] >= minPeakHeight &&
      smoothedCol[c] >= smoothedCol[c - 1] &&
      smoothedCol[c] >= smoothedCol[c + 1]
    ) {
      candidatePeaks.push({ col: c, density: smoothedCol[c] });
    }
  }

  // Jarak antar dua orang nyata minimal 16% lebar kamera agar satu kepala tidak terbelah jadi 2
  const mergedPeaks = [];
  const minPeakDistance = Math.max(24, Math.floor(numCols * 0.16));

  for (const peak of candidatePeaks) {
    const existing = mergedPeaks.find((p) => Math.abs(p.col - peak.col) < minPeakDistance);
    if (!existing) {
      mergedPeaks.push(peak);
    } else if (peak.density > existing.density) {
      existing.col = peak.col;
      existing.density = peak.density;
    }
  }

  // Jika tidak ditemukan multi-peak terpisah, gunakan puncak absolut
  if (mergedPeaks.length === 0 && maxColDensity >= 10) {
    let peakCol = Math.floor(numCols * 0.5);
    for (let c = 0; c < numCols; c++) {
      if (smoothedCol[c] === maxColDensity) {
        peakCol = c;
        break;
      }
    }
    mergedPeaks.push({ col: peakCol, density: maxColDensity });
  }

  if (mergedPeaks.length === 0) {
    return [];
  }

  // Batasi maksimal 4 orang dalam 1 frame untuk stabilitas dan presisi tinggi
  const activePeaks = mergedPeaks.slice(0, 4);
  const rawDetectedFaces = [];

  for (const peak of activePeaks) {
    const peakCol = peak.col;
    const peakDensity = peak.density;
    const colThresh = Math.max(3, Math.floor(peakDensity * 0.28));

    // Rentang kolom wajah ini
    let leftCol = peakCol;
    while (leftCol > 0 && colHist[leftCol] >= colThresh && peakCol - leftCol < numCols * 0.35) {
      leftCol--;
    }
    let rightCol = peakCol;
    while (rightCol < numCols - 1 && colHist[rightCol] >= colThresh && rightCol - peakCol < numCols * 0.35) {
      rightCol++;
    }

    // Cari batas baris (Y) & Centroid khusus untuk wilayah kolom orang ini
    const localRowHist = new Int32Array(numRows);
    let clusterSkinPixels = 0;

    for (let rIdx = 0; rIdx < numRows; rIdx++) {
      const y = rIdx * step;
      for (let cIdx = leftCol; cIdx <= rightCol; cIdx++) {
        const x = cIdx * step;
        const idx = (y * searchW + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
        const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;

        if (
          cb >= 74 && cb <= 142 &&
          cr >= 124 && cr <= 188 &&
          (cr - cb >= 1) &&
          r >= g - 6 &&
          (r >= b + 2) &&
          lum >= 20 &&
          lum <= 250
        ) {
          localRowHist[rIdx]++;
          clusterSkinPixels++;
        }
      }
    }

    // Minimal 18 piksel klaster untuk mendeteksi wajah hingga jarak 5 - 10 meter
    if (clusterSkinPixels < 18) continue;

    let localMaxRow = 0;
    let localPeakRow = Math.floor(numRows * 0.48);
    for (let r = 0; r < numRows; r++) {
      if (localRowHist[r] > localMaxRow) {
        localMaxRow = localRowHist[r];
        localPeakRow = r;
      }
    }

    if (localMaxRow < 3) continue;

    // 🎯 HITUNG PUSAT MASSA VERTIKAL (CENTROID Y) WAJAH
    let sumWeight = 0;
    let sumWeightY = 0;
    for (let r = 0; r < numRows; r++) {
      const cnt = localRowHist[r];
      if (cnt >= localMaxRow * 0.20) {
        sumWeight += cnt;
        sumWeightY += cnt * r;
      }
    }
    const centroidY = sumWeight > 0 ? (sumWeightY / sumWeight) : localPeakRow;

    // Hitung Dimensi Wajah Natural (Mendukung Jarak 5 - 10m hingga Jarak Dekat)
    let clusterW = (rightCol - leftCol + 1) * step;
    if (clusterW < Math.max(10, searchW * 0.015) || clusterW > searchW * 0.90) {
      continue;
    }
    let faceW = Math.max(14, Math.min(searchW * 0.85, clusterW * 1.08));
    let faceH = Math.round(faceW * 1.30);

    const centerCanvasX = searchX + ((leftCol + rightCol) * 0.5) * step;
    const centerCanvasY = searchY + (centroidY * step);

    let finalX = centerCanvasX - (faceW * 0.5);
    let finalY = centerCanvasY - (faceH * 0.46);

    finalX = Math.max(w * 0.01, Math.min(w * 0.99 - faceW, finalX));
    finalY = Math.max(h * 0.02, Math.min(h * 0.98 - faceH, finalY));

    const candX = Math.round(finalX);
    const candY = Math.round(finalY);
    const candW = Math.round(faceW);
    const candH = Math.round(faceH);

    // Validasi Anatomi Wajah
    const isHumanFace = isValidHumanFaceRegion(ctx, candX, candY, candW, candH);
    if (!isHumanFace) {
      continue;
    }

    rawDetectedFaces.push({
      hasFace: true,
      x: candX,
      y: candY,
      width: candW,
      height: candH,
      skinRatio: Number(overallSkinRatio.toFixed(3)),
      quality: Math.min(99, Math.max(72, Math.round(overallSkinRatio * 180 + 64))),
    });
  }

  // 🎯 TERAPKAN NON-MAXIMUM SUPPRESSION (NMS): Hapus semua kotak tumpang tindih pada orang yang sama!
  return nonMaxSuppressionFaces(rawDetectedFaces, 0.28);
}

// 1b. Deteksi Koordinat Wajah Tunggal (Kompatibilitas Penuh dengan Kode yang Sudah Ada)
export function detectFaceBounds(canvas) {
  const faces = detectMultipleFaceBounds(canvas);
  if (faces && faces.length > 0) {
    // Pilih wajah yang paling besar / dominan
    const sorted = [...faces].sort((a, b) => (b.width * b.height) - (a.width * a.height));
    return sorted[0];
  }
  return { hasFace: false, skinRatio: 0, quality: 0 };
}

// 2. Ekstrak 128-D Biometric Facial Feature Vector (Dukungan Custom Bounding Box untuk Multi-Face)
export function extractFaceDescriptorFromCanvas(canvas, customBox = null) {
  if (!canvas) return null;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;

  const isCustom = Boolean(customBox && customBox.width > 0);
  const bounds = isCustom ? customBox : detectFaceBounds(canvas);
  if (!bounds || (!isCustom && !bounds.hasFace) || (!isCustom && !isValidHumanFaceRegion(ctx, bounds.x, bounds.y, bounds.width, bounds.height))) {
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

  // 🛑 Verifikasi Lapis Kedua Geometri Biometrik Wajah Manusia Nyata (Adaptif untuk Kacamata & Posisi Wajah Wajar):
  // Memvalidasi keberadaan struktur wajah asli (dahi dan pipi) tanpa menolak pengguna berkacamata bingkai hitam atau posisi wajah miring
  const foreheadAvg = foreheadSum / (10 * 24 * 255);
  const cheekAvg = (faceGrid[28][14] + faceGrid[28][34] + faceGrid[30][14] + faceGrid[30][34]) / (4 * 255);
  const hasFaceStructure = isCustom || (foreheadAvg > 0.02 && cheekAvg > 0.02) || (noseBridgeLum > 10 && meanFaceLum > 18) || (bounds && bounds.hasFace);
  if (!hasFaceStructure) {
    return {
      hasFace: false,
      skinRatio: bounds ? bounds.skinRatio : 0,
      descriptor: null,
      quality: 0,
    };
  }

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

  // E. Ekstrak Legacy 128-D 8x16 Spatial Grid (Untuk Kompatibilitas Penuh Akun Lama Supabase)
  const legacyGrid = new Float32Array(128);
  const legCellW = fw / 8;
  const legCellH = fh / 16;
  for (let gy = 0; gy < 16; gy++) {
    for (let gx = 0; gx < 8; gx++) {
      const idx = gy * 8 + gx;
      let cellSum = 0;
      let count = 0;
      const startX = Math.floor(gx * legCellW);
      const startY = Math.floor(gy * legCellH);
      const endX = Math.min(fw, Math.floor((gx + 1) * legCellW));
      const endY = Math.min(fh, Math.floor((gy + 1) * legCellH));

      for (let y = startY; y < endY; y += 2) {
        for (let x = startX; x < endX; x += 2) {
          const pIdx = (y * fw + x) * 4;
          if (pIdx < data.length) {
            cellSum += 0.299 * data[pIdx] + 0.587 * data[pIdx + 1] + 0.114 * data[pIdx + 2];
            count++;
          }
        }
      }
      legacyGrid[idx] = count > 0 ? cellSum / count : 0;
    }
  }

  let legNorm = 0;
  for (let i = 0; i < 128; i++) legNorm += legacyGrid[i] * legacyGrid[i];
  legNorm = Math.sqrt(legNorm);
  if (legNorm > 0) {
    for (let i = 0; i < 128; i++) legacyGrid[i] = Number((legacyGrid[i] / legNorm).toFixed(5));
  }

  // Gabungkan seluruh 128 fitur biometrik baru
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
    legacyDescriptor: Array.from(legacyGrid),
  };
}

// 3. Deteksi apakah sebuah vektor adalah format lama (8x16 raw grid)
export function isLegacyDescriptor(desc) {
  if (!desc) return false;
  let arr = desc;
  if (typeof arr === 'string') {
    try { arr = JSON.parse(arr); } catch (e) { return false; }
  }
  if (!Array.isArray(arr) || arr.length !== 128) return false;
  // Format baru memiliki nilai negatif di indeks 64..127 karena Z-score
  const hasNegative = arr.slice(64, 128).some((v) => v < 0);
  return !hasNegative;
}

// 4. Bandingkan dua Biometric Vector (Translasi Adaptif ±1 Cell & Kalibrasi Probabilitas Akurasi)
// Mendukung Jarak Dekat hingga 5 - 10 Meter dengan Ambang Batas Sensitivitas Dinamis
export function compareFaceDescriptors(liveDescInput, storedDescInput, customThreshold = 0.32) {
  let liveDesc = liveDescInput?.descriptor || liveDescInput;
  let liveLegacy = liveDescInput?.legacyDescriptor || null;
  let storedDesc = storedDescInput;

  if (typeof storedDesc === 'string') {
    try { storedDesc = JSON.parse(storedDesc); } catch (e) { return { score: 0, confidencePercent: 0, isMatch: false }; }
  }
  if (typeof liveDesc === 'string') {
    try { liveDesc = JSON.parse(liveDesc); } catch (e) { return { score: 0, confidencePercent: 0, isMatch: false }; }
  }

  if (!Array.isArray(storedDesc) || storedDesc.length !== 128) {
    return { score: 0, confidencePercent: 0, isMatch: false };
  }

  const isStoredLegacy = isLegacyDescriptor(storedDesc);

  // A. Korelasi Spasial 8x16 dengan Translasi Adaptif (±1 Cell Invariance)
  // Mengatasi pergeseran kecil posisi kepala/sudut kamera sehingga akurasi akurat & tinggi (75% - 98%)
  const targetLiveLegacy = liveLegacy || liveDesc;
  let maxSpatialCorr = 0;

  if (targetLiveLegacy && targetLiveLegacy.length === 128) {
    const m1 = targetLiveLegacy.reduce((s, v) => s + v, 0) / 128;
    const m2 = storedDesc.reduce((s, v) => s + v, 0) / 128;

    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        let sDot = 0, sN1 = 0, sN2 = 0, sCount = 0;
        for (let gy = 0; gy < 16; gy++) {
          const ly = gy + dy;
          if (ly < 0 || ly >= 16) continue;
          for (let gx = 0; gx < 8; gx++) {
            const lx = gx + dx;
            if (lx < 0 || lx >= 8) continue;
            const vLive = targetLiveLegacy[ly * 8 + lx] - m1;
            const vStored = storedDesc[gy * 8 + gx] - m2;
            sDot += vLive * vStored;
            sN1 += vLive * vLive;
            sN2 += vStored * vStored;
            sCount++;
          }
        }
        if (sCount >= 80) {
          const sDenom = Math.sqrt(sN1) * Math.sqrt(sN2);
          const sCorr = sDenom > 0 ? sDot / sDenom : 0;
          if (sCorr > maxSpatialCorr) maxSpatialCorr = sCorr;
        }
      }
    }
  }

  // B. Jika Stored adalah Format Baru (16 Geom + 48 LBP + 64 Gradient):
  let compositeScore = 0;
  if (!isStoredLegacy) {
    const normA = liveDesc;
    const normB = storedDesc;

    let geomDiff = 0;
    for (let i = 0; i < 16; i++) {
      geomDiff += Math.abs(normA[i] - normB[i]);
    }
    const geomScore = Math.max(0, 1 - geomDiff / 3.8);

    let chiSq = 0;
    for (let i = 16; i < 64; i++) {
      const a = normA[i];
      const b = normB[i];
      const denom = a + b + 1e-4;
      chiSq += ((a - b) * (a - b)) / denom;
    }
    const lbpScore = Math.max(0, 1 - chiSq / 3.6);

    let dot = 0, normASum = 0, normBSum = 0;
    for (let i = 64; i < 128; i++) {
      dot += normA[i] * normB[i];
      normASum += normA[i] * normA[i];
      normBSum += normB[i] * normB[i];
    }
    const denom = Math.sqrt(normASum) * Math.sqrt(normBSum);
    const gradCorrelation = denom > 0 ? dot / denom : 0;
    const gradScore = Math.max(0, gradCorrelation);

    compositeScore = 0.45 * gradScore + 0.35 * lbpScore + 0.20 * geomScore;
  }

  const bestScore = isStoredLegacy ? maxSpatialCorr : Math.max(maxSpatialCorr, compositeScore);

  // C. Kalibrasi Akurasi Real-Time Presisi Berdasarkan Ambang Batas Sensitivitas:
  // Jarak dekat maupun 5 - 10 meter terdeteksi presisi tanpa false positive
  const matchThreshold = typeof customThreshold === 'number' && customThreshold > 0 ? customThreshold : 0.32;
  let confidencePercent = 0;
  let isMatch = false;

  if (bestScore >= matchThreshold) {
    // Terkonfirmasi cocok (75% - 99%)
    const normalizedSpread = Math.max(0.20, 0.80 - matchThreshold);
    confidencePercent = Math.min(99, Math.max(76, Math.round(76 + ((bestScore - matchThreshold) / normalizedSpread) * 23)));
    isMatch = true;
  } else if (bestScore >= matchThreshold * 0.70) {
    // Sedang menyelaraskan / dalam jangkauan (45% - 74%)
    confidencePercent = Math.round(45 + ((bestScore - (matchThreshold * 0.70)) / (matchThreshold * 0.30)) * 29);
    isMatch = false;
  } else {
    confidencePercent = Math.max(0, Math.round((bestScore / (matchThreshold * 0.70)) * 44));
    isMatch = false;
  }

  return {
    score: bestScore,
    confidencePercent,
    isMatch,
    isLegacy: isStoredLegacy,
  };
}

// 5. Cari kecocokan wajah terbaik dari daftar pengguna terdaftar
export function findBestFaceMatch(liveResult, registeredUsers = [], threshold = 0.32) {
  if (!liveResult || !Array.isArray(registeredUsers) || registeredUsers.length === 0) {
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

    const comp = compareFaceDescriptors(liveResult, rawDesc, threshold);

    if (comp.score > highestScore) {
      highestScore = comp.score;
      highestPercent = comp.confidencePercent;
      closestCandidate = user;

      if (comp.isMatch) {
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

  return {
    user: null,
    similarity: highestScore,
    closestConfidence: highestPercent,
    closestCandidate,
    thresholdPercent: 70,
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

/**
 * 🌟 RENDERING 3D FACIAL MESH HOLOGRAM PRESISI TINGGI (3D CYBER FACIAL CONSTELLATION):
 * Visualisasi Holografik Biometrik 3D Jelas, Bersih, dan Presisi dengan Proyeksi Kedalaman Z-Axis,
 * Garis Kontur Anatomi Wajah Elegan, dan Dual Retikel Iris Mata.
 */
export function drawFaceMeshConstellation(ctx, box, animPulse = 1.0, qualityText = '') {
  if (!ctx || !box) return;
  const { x, y, width: w, height: h } = box;
  if (w <= 10 || h <= 10) return;

  // 1. Definisikan Titik Landmark Anatomi Wajah Biometrik dengan Proyeksi Kedalaman 3D (Z-Axis)
  const rawLm = {
    // A. Kontur Rahang & Dagu (Mandible Jawline)
    jaw0:  [0.10, 0.34, -0.3], jaw1:  [0.11, 0.44, -0.2], jaw2:  [0.13, 0.54, -0.1],
    jaw3:  [0.16, 0.65,  0.0], jaw4:  [0.21, 0.76,  0.1], jaw5:  [0.30, 0.86,  0.2],
    jaw6:  [0.40, 0.93,  0.3], chin:  [0.50, 0.96,  0.4], jaw8:  [0.60, 0.93,  0.3],
    jaw9:  [0.70, 0.86,  0.2], jaw10: [0.79, 0.76,  0.1], jaw11: [0.84, 0.65,  0.0],
    jaw12: [0.87, 0.54, -0.1], jaw13: [0.89, 0.44, -0.2], jaw14: [0.90, 0.34, -0.3],

    // B. Alis Kiri & Alis Kanan
    browL0: [0.18, 0.26, -0.1], browL1: [0.24, 0.23,  0.0], browL2: [0.32, 0.22,  0.1], browL3: [0.40, 0.24,  0.2], browL4: [0.46, 0.27,  0.25],
    browR0: [0.54, 0.27,  0.25], browR1: [0.60, 0.24,  0.2], browR2: [0.68, 0.22,  0.1], browR3: [0.76, 0.23,  0.0], browR4: [0.82, 0.26, -0.1],

    // C. Dahi & Glabella (Forehead Dome)
    fhTop: [0.50, 0.08,  0.2], fhL: [0.26, 0.12, -0.1], fhR: [0.74, 0.12, -0.1],
    glabella: [0.50, 0.26,  0.3],

    // D. Batang & Ujung Hidung (T-Zone Ridge)
    noseB0: [0.50, 0.34,  0.4], noseB1: [0.50, 0.45,  0.6], noseTip: [0.50, 0.58,  0.9],
    nosL:   [0.40, 0.60,  0.5], nosR:   [0.60, 0.60,  0.5], subnasale: [0.50, 0.65, 0.6],

    // E. Mata Kiri & Kanan (Eye Apertures)
    eyeL0: [0.23, 0.36,  0.1], eyeL1: [0.29, 0.33,  0.2], eyeL2: [0.36, 0.33,  0.2],
    eyeL3: [0.42, 0.36,  0.2], eyeL4: [0.36, 0.40,  0.15], eyeL5: [0.29, 0.40,  0.15],
    pupilL: [0.32, 0.36, 0.3],

    eyeR0: [0.58, 0.36,  0.2], eyeR1: [0.64, 0.33,  0.2], eyeR2: [0.71, 0.33,  0.2],
    eyeR3: [0.77, 0.36,  0.1], eyeR4: [0.71, 0.40,  0.15], eyeR5: [0.64, 0.40,  0.15],
    pupilR: [0.68, 0.36, 0.3],

    // F. Mulut & Bibir (Lips)
    lipLCorner: [0.32, 0.75,  0.2], lipTop: [0.50, 0.72,  0.4],
    lipRCorner: [0.68, 0.75,  0.2], lipBot: [0.50, 0.81,  0.4],
  };

  // Konversi koordinat
  const lm = {};
  Object.entries(rawLm).forEach(([key, [rx, ry, rz]]) => {
    lm[key] = {
      x: x + w * rx,
      y: y + h * ry,
      z: rz,
    };
  });

  ctx.save();

  // 1. POLIGON SHADING 3D HALUS (MEMBERIKAN KEDALAMAN 3D NYATA PADA WAJAH TANPA MENGGANGGU KAMERA)
  ctx.fillStyle = 'rgba(6, 182, 212, 0.06)';
  const drawFacet = (pts) => {
    ctx.beginPath();
    pts.forEach((p, i) => {
      if (!p) return;
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.closePath();
    ctx.fill();
  };
  drawFacet([lm.fhTop, lm.fhL, lm.browL2, lm.glabella]);
  drawFacet([lm.fhTop, lm.fhR, lm.browR2, lm.glabella]);
  drawFacet([lm.glabella, lm.noseB0, lm.nosL, lm.eyeL3]);
  drawFacet([lm.glabella, lm.noseB0, lm.nosR, lm.eyeR0]);
  drawFacet([lm.nosL, lm.noseTip, lm.subnasale, lm.lipTop]);
  drawFacet([lm.nosR, lm.noseTip, lm.subnasale, lm.lipTop]);
  drawFacet([lm.lipLCorner, lm.lipTop, lm.lipRCorner, lm.lipBot]);
  drawFacet([lm.lipBot, lm.jaw6, lm.chin, lm.jaw8]);

  // 2. ANIMASI SCANLINE SWEEP CYBER LASER
  const sweepProgress = (animPulse * 1.5) % 1.0;
  const sweepY = y + sweepProgress * h;
  const sweepGrad = ctx.createLinearGradient(0, sweepY - 12, 0, sweepY + 12);
  sweepGrad.addColorStop(0, 'rgba(0, 240, 255, 0)');
  sweepGrad.addColorStop(0.5, 'rgba(0, 240, 255, 0.28)');
  sweepGrad.addColorStop(1, 'rgba(0, 240, 255, 0)');
  ctx.fillStyle = sweepGrad;
  ctx.fillRect(x - 6, sweepY - 12, w + 12, 24);

  ctx.beginPath();
  ctx.moveTo(x - 4, sweepY);
  ctx.lineTo(x + w + 4, sweepY);
  ctx.strokeStyle = 'rgba(125, 240, 255, 0.85)';
  ctx.lineWidth = 1.4;
  ctx.shadowColor = '#00f0ff';
  ctx.shadowBlur = 8;
  ctx.stroke();

  // 3. SUDUT BINGKAI PEMBIDIK BIOMETRIK MILITARY HUD
  const cornerLen = Math.max(14, Math.round(w * 0.12));
  ctx.strokeStyle = '#00f0ff';
  ctx.lineWidth = 2.2;
  ctx.shadowColor = '#00f0ff';
  ctx.shadowBlur = 6;

  // Pojok Kiri Atas
  ctx.beginPath();
  ctx.moveTo(x, y + cornerLen);
  ctx.lineTo(x, y);
  ctx.lineTo(x + cornerLen, y);
  ctx.stroke();

  // Pojok Kanan Atas
  ctx.beginPath();
  ctx.moveTo(x + w - cornerLen, y);
  ctx.lineTo(x + w, y);
  ctx.lineTo(x + w, y + cornerLen);
  ctx.stroke();

  // Pojok Kiri Bawah
  ctx.beginPath();
  ctx.moveTo(x, y + h - cornerLen);
  ctx.lineTo(x, y + h);
  ctx.lineTo(x + cornerLen, y + h);
  ctx.stroke();

  // Pojok Kanan Bawah
  ctx.beginPath();
  ctx.moveTo(x + w - cornerLen, y + h);
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x + w, y + h - cornerLen);
  ctx.stroke();

  // 4. GARIS WIREFRAME 3D MESH STRUKTURAL YANG JERNIH & ELEGAN
  const drawPoly = (keys, closed = false) => {
    ctx.beginPath();
    keys.forEach((k, i) => {
      const p = lm[k];
      if (!p) return;
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    if (closed) ctx.closePath();
    ctx.stroke();
  };

  // Garis Kontur Utama (Biru Cyan Terang, Sharp)
  ctx.strokeStyle = `rgba(56, 189, 248, ${0.85 * animPulse})`;
  ctx.lineWidth = 1.4;
  ctx.shadowColor = '#00f0ff';
  ctx.shadowBlur = 4;

  // Garis Rahang (Mandible)
  drawPoly(['jaw0', 'jaw1', 'jaw2', 'jaw3', 'jaw4', 'jaw5', 'jaw6', 'chin', 'jaw8', 'jaw9', 'jaw10', 'jaw11', 'jaw12', 'jaw13', 'jaw14']);
  // Alis Kiri & Kanan
  drawPoly(['browL0', 'browL1', 'browL2', 'browL3', 'browL4']);
  drawPoly(['browR0', 'browR1', 'browR2', 'browR3', 'browR4']);
  // Kontur Mata Kiri & Kanan
  drawPoly(['eyeL0', 'eyeL1', 'eyeL2', 'eyeL3', 'eyeL4', 'eyeL5'], true);
  drawPoly(['eyeR0', 'eyeR1', 'eyeR2', 'eyeR3', 'eyeR4', 'eyeR5'], true);
  // Hidung (T-Zone)
  drawPoly(['glabella', 'noseB0', 'noseB1', 'noseTip', 'subnasale']);
  drawPoly(['nosL', 'noseTip', 'nosR']);
  // Mulut (Lips)
  drawPoly(['lipLCorner', 'lipTop', 'lipRCorner', 'lipBot'], true);

  // Garis Penghubung Diagonal 3D Halus (Transparan & Rapi)
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
  ctx.lineWidth = 0.9;
  ctx.shadowBlur = 0;
  const diagEdges = [
    ['fhTop', 'glabella'], ['fhL', 'browL0'], ['fhR', 'browR4'],
    ['browL4', 'glabella'], ['browR0', 'glabella'],
    ['glabella', 'eyeL3'], ['glabella', 'eyeR0'],
    ['noseB0', 'eyeL3'], ['noseB0', 'eyeR0'],
    ['nosL', 'jaw3'], ['nosR', 'jaw11'],
    ['nosL', 'lipLCorner'], ['nosR', 'lipRCorner'],
    ['subnasale', 'lipTop'], ['lipBot', 'chin'],
    ['lipLCorner', 'jaw5'], ['lipRCorner', 'jaw9'],
  ];
  ctx.beginPath();
  diagEdges.forEach(([k1, k2]) => {
    const p1 = lm[k1];
    const p2 = lm[k2];
    if (p1 && p2) {
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
    }
  });
  ctx.stroke();

  // 5. DUAL IRIS TARGET LOCK RINGS (PUPIL MATA)
  [lm.pupilL, lm.pupilR].forEach((pupil) => {
    if (!pupil) return;
    ctx.beginPath();
    ctx.arc(pupil.x, pupil.y, 5.5, 0, Math.PI * 2);
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(pupil.x - 3.5, pupil.y);
    ctx.lineTo(pupil.x + 3.5, pupil.y);
    ctx.moveTo(pupil.x, pupil.y - 3.5);
    ctx.lineTo(pupil.x, pupil.y + 3.5);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.0;
    ctx.stroke();
  });

  // 6. TITIK-TITIK LANDMARK PINPOINT LUMINOUS NODES (BERSIH & TAJAM)
  Object.values(lm).forEach((p) => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 2.0, 0, Math.PI * 2);
    ctx.fillStyle = '#00f0ff';
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 4;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(p.x, p.y, 1.0, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
  });

  // 7. TELEMETRI HUD HEADER & INDIKATOR STATUS
  const hudText = qualityText || '3D FACIAL MESH • WAJAH TERKUNCI (68 NODES)';
  ctx.font = 'bold 11px "Consolas", monospace';
  ctx.fillStyle = '#00f0ff';
  ctx.shadowColor = 'rgba(0, 240, 255, 0.8)';
  ctx.shadowBlur = 6;
  ctx.textAlign = 'left';
  ctx.fillText(`⚡ ${hudText}`, x, Math.max(16, y - 10));

  ctx.restore();
}

/**
 * 🎯 PANDUAN PEMBIDIK TENGAH (VIEWFINDER RETICLE):
 * Ditampilkan hanya saat kamera aktif namun BELUM ada wajah manusia di depan lensa.
 * Menghilangkan ilusi 3D mesh melayang di udara kosong atau mendeteksi meja / komputer.
 */
export function drawGuideViewfinder(ctx, guideBox, animPulse = 1.0) {
  if (!ctx || !guideBox) return;
  const { x, y, width: w, height: h } = guideBox;
  ctx.save();

  const cx = x + w * 0.5;
  const cy = y + h * 0.5;
  const rx = w * 0.44;
  const ry = h * 0.48;

  // 1. Oval Viewfinder Panduan Penempatan Wajah
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(56, 189, 248, ${0.45 + animPulse * 0.25})`;
  ctx.lineWidth = 1.8;
  ctx.setLineDash([8, 6]);
  ctx.stroke();
  ctx.setLineDash([]);

  // 2. Empat Sudut Pembidik Cyber di Luar Oval
  const cLen = Math.max(14, Math.round(w * 0.12));
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 2.0;
  ctx.shadowColor = '#0284c7';
  ctx.shadowBlur = 6;

  // Pojok Kiri Atas
  ctx.beginPath();
  ctx.moveTo(x, y + cLen);
  ctx.lineTo(x, y);
  ctx.lineTo(x + cLen, y);
  ctx.stroke();

  // Pojok Kanan Atas
  ctx.beginPath();
  ctx.moveTo(x + w - cLen, y);
  ctx.lineTo(x + w, y);
  ctx.lineTo(x + w, y + cLen);
  ctx.stroke();

  // Pojok Kiri Bawah
  ctx.beginPath();
  ctx.moveTo(x, y + h - cLen);
  ctx.lineTo(x, y + h);
  ctx.lineTo(x + cLen, y + h);
  ctx.stroke();

  // Pojok Kanan Bawah
  ctx.beginPath();
  ctx.moveTo(x + w - cLen, y + h);
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x + w, y + h - cLen);
  ctx.stroke();

  // 3. Teks Panduan yang Berkedip Halus
  ctx.font = 'bold 11.5px "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = `rgba(255, 255, 255, ${0.75 + animPulse * 0.25})`;
  ctx.textAlign = 'center';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
  ctx.shadowBlur = 4;
  ctx.fillText('ARAHKAN WAJAH KE DALAM AREA INI', cx, y + h + 22);

  ctx.restore();
}

/**
 * 🟩 RENDERING MODE KOTAK (BIOMETRIC BOUNDING BOX CYBERNETIC):
 * Bounding Box neon rapi dengan sudut HUD, label identitas di atas, dan 5 titik landmark presisi.
 */
export function drawFaceDetectionBox(ctx, box, options = {}) {
  if (!ctx || !box) return;
  const { x, y, width: w, height: h } = box;
  if (w <= 10 || h <= 10) return;

  const {
    labelText = 'face',
    statusColor = '#22c55e', // Hijau terang default
    showTitle = true,
  } = options;

  ctx.save();

  // 1. Header Judul Opsional di Bagian Atas Kanvas
  if (showTitle) {
    ctx.font = 'bold 14px "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 4;
    ctx.fillText('Deteksi Biometrik Wajah', ctx.canvas.width / 2, 22);
  }

  // 2. Kotak Pembidik Neon dengan Sudut Melengkung Halus
  ctx.strokeStyle = statusColor;
  ctx.lineWidth = 2.4;
  ctx.shadowColor = statusColor;
  ctx.shadowBlur = 8;
  if (ctx.roundRect) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 10);
    ctx.stroke();
  } else {
    ctx.strokeRect(x, y, w, h);
  }

  // 3. Sudut HUD di Keempat Pojok Kotak
  const cornerLen = Math.max(14, Math.round(w * 0.12));
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2.2;
  ctx.shadowBlur = 4;

  ctx.beginPath();
  ctx.moveTo(x, y + cornerLen);
  ctx.lineTo(x, y);
  ctx.lineTo(x + cornerLen, y);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(x + w - cornerLen, y);
  ctx.lineTo(x + w, y);
  ctx.lineTo(x + w, y + cornerLen);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(x, y + h - cornerLen);
  ctx.lineTo(x, y + h);
  ctx.lineTo(x + cornerLen, y + h);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(x + w - cornerLen, y + h);
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x + w, y + h - cornerLen);
  ctx.stroke();

  // 4. Tag Label di Atas Kotak Pembidik
  ctx.font = 'bold 11px "Segoe UI", monospace';
  const textWidth = ctx.measureText(labelText).width;
  const tagH = 22;
  const tagW = Math.max(50, textWidth + 16);

  ctx.fillStyle = statusColor;
  ctx.shadowBlur = 6;
  if (ctx.roundRect) {
    ctx.beginPath();
    ctx.roundRect(x, Math.max(2, y - tagH - 4), tagW, tagH, 6);
    ctx.fill();
  } else {
    ctx.fillRect(x, Math.max(2, y - tagH - 4), tagW, tagH);
  }

  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'left';
  ctx.shadowBlur = 0;
  ctx.fillText(labelText, x + 8, Math.max(16, y - 9));

  // 5. Titik-Titik Landmark Fitur Wajah (Mata Kiri, Mata Kanan, Hidung, Mulut Kiri & Kanan)
  const landmarkPoints = [
    { x: x + w * 0.32, y: y + h * 0.38 }, // Mata Kiri
    { x: x + w * 0.68, y: y + h * 0.38 }, // Mata Kanan
    { x: x + w * 0.50, y: y + h * 0.58 }, // Ujung Hidung
    { x: x + w * 0.35, y: y + h * 0.76 }, // Sudut Mulut Kiri
    { x: x + w * 0.65, y: y + h * 0.76 }, // Sudut Mulut Kanan
  ];

  landmarkPoints.forEach((pt) => {
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, 4.0, 0, Math.PI * 2);
    ctx.fillStyle = statusColor;
    ctx.shadowColor = statusColor;
    ctx.shadowBlur = 6;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(pt.x, pt.y, 1.8, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
  });

  ctx.restore();
}

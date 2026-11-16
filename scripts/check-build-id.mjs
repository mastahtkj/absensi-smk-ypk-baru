// Diagnosa: apakah BUILD ID di dalam bundle client sama dengan BUILD ID server?
//
// ✅ FIXED (v2.0.0): BUILD ID sekarang dihitung dari CONTENT-HASH source code
//    di next.config.js, bukan `Date.now()`. Artinya:
//    - Nilai PASTI SAMA antara build CLIENT & build SERVER (Next.js 14
//      mengevaluasi next.config.js per worker build).
//    - BUILD ID berubah hanya bila source code benar-benar berubah.
//    - Dialog "Muat Ulang Sekarang" tidak lagi muncul terus-menerus.
//
// Cara pakai: node scripts/check-build-id.mjs
import fs from 'node:fs';

const BASE = 'https://absensi-smk-ypk-baru.vercel.app';

const api = await (await fetch(`${BASE}/api/app-version`, { cache: 'no-store' })).json();
console.log('SERVER buildId  :', api.buildId);
console.log('SERVER buildTime:', api.buildTime);

const html = await (await fetch(`${BASE}/`, { cache: 'no-store' })).text();
const scripts = [...new Set([...html.matchAll(/\/_next\/static\/[^"']+?\.js/g)].map((m) => m[0]))];
console.log('script tags     :', scripts.length);

let updateChunk = null;
let clientId = null;

for (const s of scripts) {
  let js = '';
  try {
    js = await (await fetch(BASE + s)).text();
  } catch (e) {
    continue;
  }
  if (js.includes('Versi Baru Tersedia')) {
    updateChunk = s;
    console.log('UPDATE-MANAGER  :', s);
    // BUILD ID sekarang format hex 16 karakter (sha256 slice).
    const ids = [...new Set(js.match(/[a-f0-9]{16}/g) || [])];
    console.log('  id di bundle  :', ids.slice(0, 20).join(', '));
    if (js.includes(api.buildId)) clientId = api.buildId;
  }
}

console.log('');
console.log('id server ada di bundle client? :', clientId ? 'YA (' + clientId + ')' : 'TIDAK');
console.log('update-manager chunk ditemukan? :', updateChunk ? 'YA' : 'TIDAK');
console.log('versi aplikasi server          :', api.appVersion);
console.log('build server                    :', api.buildServer);
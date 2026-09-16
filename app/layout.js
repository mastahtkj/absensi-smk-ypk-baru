import fs from 'fs';
import path from 'path';

function ensureBannerVideoSync() {
  try {
    const pubDir = path.join(process.cwd(), 'public');
    const targetPath = path.join(pubDir, 'banner-video-1.mp4');
    if (!fs.existsSync(targetPath)) {
      const candidates = [
        'C:\\Users\\HOME RAY\\Downloads\\WhatsApp Video 2026-09-16 at 9.05.19 AM.mp4',
        path.join(process.cwd(), 'banner-video-1.mp4'),
      ];
      for (const src of candidates) {
        if (fs.existsSync(src)) {
          if (!fs.existsSync(pubDir)) fs.mkdirSync(pubDir, { recursive: true });
          fs.copyFileSync(src, targetPath);
          break;
        }
      }
    }
  } catch (e) {}
}

ensureBannerVideoSync();

export const metadata = {
  title: 'SMK YPK SUPER APP - Aplikasi Sekolah Digital',
  description: 'Aplikasi Sekolah Digital Terpadu SMK YPK Medan (Presensi RFID, CBT Anti-Cheat, Bahan Ajar & ID Card)',
  manifest: '/manifest.json',
  themeColor: '#1e40af',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'SMK YPK SUPER APP',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#1e40af',
};

export default function RootLayout({ children }) {
  ensureBannerVideoSync();
  return (
    <html lang="id">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/logo.png" />
        <link rel="apple-touch-icon" href="/logo.png" />
        <meta name="theme-color" content="#1e40af" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="SMK YPK SUPER APP" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').catch(function(err) {});
                });
              }
            `,
          }}
        />
      </head>
      <body
        style={{
          margin: 0,
          padding: 0,
          backgroundColor: '#f8fafc',
          WebkitFontSmoothing: 'antialiased',
          MozOsxFontSmoothing: 'grayscale',
          textRendering: 'optimizeLegibility',
          touchAction: 'manipulation',
        }}
      >
        {children}
      </body>
    </html>
  );
}

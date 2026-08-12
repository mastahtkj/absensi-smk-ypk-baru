export const metadata = {
  title: 'Absensi SMK YPK Medan',
  description: 'Sistem Absensi Realtime',
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body style={{ margin: 0, padding: 0 }}>{children}</body>
    </html>
  );
}

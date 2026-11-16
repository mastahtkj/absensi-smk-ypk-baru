import fs from 'fs';
import path from 'path';

export async function GET() {
  const filePath = path.join(process.cwd(), 'public', 'icon-192.png');
  let png;
  try {
    png = fs.readFileSync(filePath);
  } catch (e) {
    png = fs.readFileSync(path.join(process.cwd(), 'public', 'logo.png'));
  }

  return new Response(png, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}

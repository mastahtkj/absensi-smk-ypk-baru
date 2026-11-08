import zlib from 'zlib';

const crcTable = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    if (c & 1) c = 0xedb88320 ^ (c >>> 1);
    else c = c >>> 1;
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function createChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const len = data.length;
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(len, 0);

  const crcBuf = Buffer.alloc(4);
  const toCrc = Buffer.concat([typeBuf, data]);
  crcBuf.writeUInt32BE(crc32(toCrc), 0);

  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function generatePng(size) {
  const width = size;
  const height = size;
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8;
  ihdrData[9] = 6;
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;
  const ihdrChunk = createChunk('IHDR', ihdrData);

  const rowBytes = width * 4;
  const rawData = Buffer.alloc((rowBytes + 1) * height);
  const cx = width / 2;
  const cy = height / 2;
  const outerR = width * 0.46;
  const innerR = width * 0.40;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * (rowBytes + 1);
    rawData[rowOffset] = 0;

    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= innerR) {
        if (dy > -height * 0.15 && dy < -height * 0.05 && Math.abs(dx) < width * 0.2) {
          rawData[pxOffset] = 0xfe; rawData[pxOffset + 1] = 0xf0; rawData[pxOffset + 2] = 0x8a; rawData[pxOffset + 3] = 0xff;
        } else if (dy >= -height * 0.02 && dy <= height * 0.08 && Math.abs(dx) < width * 0.22) {
          rawData[pxOffset] = 0xff; rawData[pxOffset + 1] = 0xff; rawData[pxOffset + 2] = 0xff; rawData[pxOffset + 3] = 0xff;
        } else if (dy > height * 0.11 && dy < height * 0.2 && Math.abs(dx) < width * 0.16) {
          rawData[pxOffset] = 0x16; rawData[pxOffset + 1] = 0xa3; rawData[pxOffset + 2] = 0x4a; rawData[pxOffset + 3] = 0xff;
        } else {
          rawData[pxOffset] = 0x1e; rawData[pxOffset + 1] = 0x40; rawData[pxOffset + 2] = 0xaf; rawData[pxOffset + 3] = 0xff;
        }
      } else if (dist <= outerR) {
        rawData[pxOffset] = 0xf5; rawData[pxOffset + 1] = 0x9e; rawData[pxOffset + 2] = 0x0b; rawData[pxOffset + 3] = 0xff;
      } else {
        rawData[pxOffset] = 0x00; rawData[pxOffset + 1] = 0x00; rawData[pxOffset + 2] = 0x00; rawData[pxOffset + 3] = 0x00;
      }
    }
  }

  const compressed = zlib.deflateSync(rawData);
  const idatChunk = createChunk('IDAT', compressed);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

export async function GET() {
  const png = generatePng(192);
  return new Response(png, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}

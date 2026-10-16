// Generates valid placeholder PNG icons for the PWA using only Node built-ins.
// Draws a dark background with a centered accent "K" glyph block.
// Output: public/icons/icon-192.png, icon-512.png, icon-maskable-512.png
import { createWriteStream } from 'node:fs';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '..', 'public', 'icons');
mkdirSync(outDir, { recursive: true });

const BG = [0x0b, 0x0f, 0x14]; // #0b0f14
const ACCENT = [0x28, 0xe0, 0xa8]; // #28e0a8

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

// Simple blocky "K" rendered on a grid, scaled to the icon size.
function pixelInGlyph(nx, ny) {
  // nx, ny in [0,1). Define the "K" within the central region.
  const gx = (nx - 0.3) / 0.4; // map 0.30..0.70 -> 0..1
  const gy = (ny - 0.25) / 0.5; // map 0.25..0.75 -> 0..1
  if (gx < 0 || gx > 1 || gy < 0 || gy > 1) return false;
  // Vertical stem
  if (gx < 0.22) return true;
  // Upper diagonal: from stem (gy small) going right-up
  if (gy <= 0.5) {
    const line = 1 - gy * 2; // gy 0 -> 1 ; gy 0.5 -> 0
    if (Math.abs(gx - line) < 0.18) return true;
  } else {
    // Lower diagonal: going right-down
    const line = (gy - 0.5) * 2; // gy 0.5 -> 0 ; gy 1 -> 1
    if (Math.abs(gx - line) < 0.18) return true;
  }
  return false;
}

function makePng(size) {
  const bytesPerPixel = 3;
  const rowLen = size * bytesPerPixel + 1; // +1 filter byte per row
  const raw = Buffer.alloc(rowLen * size);
  for (let y = 0; y < size; y++) {
    raw[y * rowLen] = 0; // filter type 0
    for (let x = 0; x < size; x++) {
      const nx = x / size;
      const ny = y / size;
      const color = pixelInGlyph(nx, ny) ? ACCENT : BG;
      const off = y * rowLen + 1 + x * bytesPerPixel;
      raw[off] = color[0];
      raw[off + 1] = color[1];
      raw[off + 2] = color[2];
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type RGB
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace
  const idat = deflateSync(raw);
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function write(name, size) {
  const png = makePng(size);
  const stream = createWriteStream(join(outDir, name));
  stream.write(png);
  stream.end();
  return new Promise((res) => stream.on('finish', res));
}

await Promise.all([
  write('icon-192.png', 192),
  write('icon-512.png', 512),
  write('icon-maskable-512.png', 512),
]);
console.log('Icons generated in', outDir);

/**
 * Node.js 組み込みモジュールのみでポケボール PNG アイコンを生成する
 * 外部パッケージ不要
 */
import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, '..', 'public');

// ===== CRC32 =====
function crc32(buf) {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c;
  }
  let crc = 0xffffffff;
  for (const b of buf) crc = table[(crc ^ b) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

// ===== PNG チャンク =====
function pngChunk(type, data) {
  const t = Buffer.from(type, 'ascii');
  const len = Buffer.allocUnsafe(4);
  len.writeUInt32BE(data.length, 0);
  const crc = Buffer.allocUnsafe(4);
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
  return Buffer.concat([len, t, data, crc]);
}

// ===== ポケボール描画 =====
function makePokeball(size) {
  const cx = size / 2;
  const cy = size / 2;
  const R  = size * 0.46;       // 外周
  const bw = Math.max(2, size * 0.035); // 外枠幅
  const bh = size * 0.065;      // 中央バンド高さ
  const br = size * 0.11;       // ボタン半径
  const bi = size * 0.07;       // ボタン内径

  // RGB raw データ (filter byte 付き)
  const raw = Buffer.alloc(size * (3 * size + 1), 0);

  for (let y = 0; y < size; y++) {
    raw[y * (3 * size + 1)] = 0; // filter: None
    for (let x = 0; x < size; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      let r = 0x16, g = 0x16, b = 0x28; // 背景色（アプリ bg）

      if (dist <= R) {
        if (dist >= R - bw) {
          // 外枠
          r = g = b = 0x20;
        } else if (dist <= br && Math.abs(dy) <= bh + bw) {
          // ボタン
          if (dist <= bi) {
            r = g = b = 0xff; // 白内部
          } else {
            r = g = b = 0x28; // ボタン枠
          }
        } else if (Math.abs(dy) <= bh) {
          // 中央バンド
          r = g = b = 0xff;
        } else if (dy < 0) {
          // 上半分（赤）
          r = 0xd0; g = 0x20; b = 0x20;
        } else {
          // 下半分（白）
          r = g = b = 0xee;
        }
      }

      const i = y * (3 * size + 1) + 1 + x * 3;
      raw[i]     = r;
      raw[i + 1] = g;
      raw[i + 2] = b;
    }
  }

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.allocUnsafe(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  const idat = deflateSync(raw, { level: 6 });

  return Buffer.concat([
    sig,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', idat),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

for (const size of [192, 512]) {
  const path = join(publicDir, `icon-${size}.png`);
  writeFileSync(path, makePokeball(size));
  console.log(`✓ ${path}`);
}
console.log('Icons generated!');

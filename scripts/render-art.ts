// Renders a review sheet for every character with a `look`: each emotion at 1× and enlarged,
// on the card colour of its rarity. For people and for the critic model (docs/character-art.md).
//
//   npm run art:render -- [out-dir] [character-id ...]
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { deflateSync } from 'node:zlib';
import { renderLook, type Sprite } from '../src/art/render.ts';
import { parseHex, type RGB } from '../src/art/color.ts';
import { loadOrDie } from './content-files.ts';

const SCALE = 5;
const GAP = 8;
const CARD: Record<number, string> = { 3: '#bfe2ff', 4: '#ffe89a', 5: '#ffc4de' };

const CRC = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c;
});
function crc32(buf: Uint8Array): number {
  let c = 0xffffffff;
  for (const b of buf) c = CRC[(c ^ b) & 255]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

export function encodePng({ w, h, rgba }: Sprite): Buffer {
  const chunk = (type: string, data: Uint8Array) => {
    const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const out = Buffer.alloc(body.length + 8);
    out.writeUInt32BE(data.length, 0);
    body.copy(out, 4);
    out.writeUInt32BE(crc32(body), body.length + 4);
    return out;
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr.set([8, 6, 0, 0, 0], 8); // 8-bit RGBA
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) Buffer.from(rgba.buffer, rgba.byteOffset + y * w * 4, w * 4).copy(raw, y * (w * 4 + 1) + 1);
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', new Uint8Array()),
  ]);
}

function sheet(sprites: Sprite[], bg: RGB): Sprite {
  const { w, h } = sprites[0]!;
  const W = GAP + sprites.length * (w * SCALE + GAP) + w + GAP;
  const H = GAP + h * SCALE + GAP;
  const rgba = new Uint8ClampedArray(W * H * 4);
  for (let i = 0; i < W * H; i++) rgba.set([...bg, 255], i * 4);
  const blit = (s: Sprite, ox: number, oy: number, k: number) => {
    for (let y = 0; y < s.h * k; y++)
      for (let x = 0; x < s.w * k; x++) {
        const src = (Math.floor(y / k) * s.w + Math.floor(x / k)) * 4;
        if (s.rgba[src + 3]) rgba.set(s.rgba.subarray(src, src + 4), ((oy + y) * W + ox + x) * 4);
      }
  };
  sprites.forEach((s, i) => blit(s, GAP + i * (w * SCALE + GAP), GAP, SCALE));
  sprites.forEach((s, i) => blit(s, GAP + sprites.length * (w * SCALE + GAP), GAP + i * (h + GAP), 1));
  return { w: W, h: H, rgba };
}

const [outDir = 'dist/art', ...only] = process.argv.slice(2);
const content = loadOrDie();
mkdirSync(outDir, { recursive: true });
for (const ch of Object.values(content.characters)) {
  if (!ch.look || (only.length && !only.includes(ch.id))) continue;
  const emotions = [undefined, ...Object.keys(ch.look.emotions)];
  const sprites = emotions.map((e) => renderLook(ch.look!, content.parts, e));
  const file = join(outDir, `${ch.id}.png`);
  writeFileSync(file, encodePng(sheet(sprites, parseHex(CARD[ch.rarity] ?? '#dddddd'))));
  for (const [e, s] of emotions.map((e, i) => [e ?? 'base', sprites[i]!] as const)) writeFileSync(join(outDir, `${ch.id}.${e}.png`), encodePng(s));
  console.log(`${file}: ${emotions.map((e) => e ?? 'base').join(', ')}`);
}

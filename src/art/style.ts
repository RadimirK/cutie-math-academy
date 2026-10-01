// The house style. Fixed by people, never by the designer model: this is what keeps every
// character of the cast looking like one game.
import { mix, parseHex, ramp, rgbToOklch, oklchToRgb, toHex, type RampSpec, type RGB } from './color.ts';
import type { Look, Material, Slot } from './schema.ts';

/** The whole standing figure is drawn on this canvas; every frame is a window onto it. */
export const SIZE = { w: 128, h: 256 };
/** Head centre and radius in pixels at `look.head = 1`: the unit of head space. */
export const HEAD = { cx: 64, cy: 36, r: 22 };

/**
 * full: the standing figure (scenes, lobby, banners). bust: 3:4 like the collection cards,
 * with some air above the head.
 */
export const FRAMES = {
  full: { x: 0, y: 0, w: 128, h: 256 },
  bust: { x: 16, y: -14, w: 96, h: 128 },
} as const;
export type Frame = keyof typeof FRAMES;

/** Parts used when a look leaves the slot out. */
export const DEFAULT_PARTS: Partial<Record<Slot, string>> = { body: 'basic', head: 'oval', mouth: 'simple' };

/** Light comes from the top left: shadows gather on the bottom right of every volume. */
export const SHADOW_DIR: [number, number] = [1, 1];

/** Upper layers darken what lies under them, shifted by `offset` pixels. */
export const CAST_SHADOWS: { from: Slot[]; onto: Slot[]; offset: [number, number] }[] = [
  { from: ['hair_front'], onto: ['head', 'body', 'outfit'], offset: [1, 2] },
  { from: ['head'], onto: ['body'], offset: [0, 2] },
  { from: ['hair_front', 'head'], onto: ['hair_back'], offset: [1, 1] },
];

const SKIN_RAMP: RampSpec = { steps: [-0.3, -0.08, 0, 0.04, 0.08], hueShift: 40 };
const EYES_RAMP: RampSpec = { steps: [-0.38, -0.16, 0, 0.1, 0.22], hueShift: 50 };

/** Five tones (outline, shadow, base, light, highlight) for every material. */
export function palette(p: Look['palette']): Record<Material, RGB[]> {
  const [L, C, h] = rgbToOklch(parseHex(p.hair));
  const line = p.line ?? toHex(mix(oklchToRgb([Math.min(L, 0.32) * 0.75, Math.min(C, 0.06), h]), [36, 24, 44], 0.35));
  const [sL, sC, sh] = rgbToOklch(parseHex(p.skin));
  const mouth = toHex(oklchToRgb([sL - 0.3, Math.max(sC, 0.08) + 0.04, (sh + 345) % 360]));
  const flat = (hex: string): RGB[] => Array(5).fill(parseHex(hex));
  return {
    skin: ramp(p.skin, SKIN_RAMP),
    hair: ramp(p.hair),
    eyes: ramp(p.eyes, EYES_RAMP),
    eye_white: [parseHex('#5a5470'), parseHex('#cfd2ea'), parseHex('#f8f8ff'), parseHex('#ffffff'), parseHex('#ffffff')],
    cloth: ramp(p.cloth),
    cloth2: ramp(p.cloth2 ?? '#f2f4fa'),
    skirt: ramp(p.skirt ?? p.cloth),
    legwear: ramp(p.legwear ?? '#2f2c3c'),
    shoes: ramp(p.shoes ?? '#5b4039'),
    accent: ramp(p.accent ?? '#d9475b'),
    line: ramp(line, { steps: [-0.1, -0.05, 0, 0.12, 0.25], hueShift: 20 }),
    mouth: ramp(mouth, { steps: [-0.2, -0.1, 0, 0.15, 0.3], hueShift: 20 }),
    blush: ramp(p.blush ?? '#ff8fa3', { steps: [-0.15, -0.05, 0, 0.05, 0.1], hueShift: 10 }),
    metal: ramp(p.metal ?? '#4b4f6b'),
    shine: flat('#ffffff'),
  };
}

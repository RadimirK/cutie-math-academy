// The house style. Fixed by people, never by the designer model: this is what keeps every
// character of the cast looking like one game.
import { mix, parseHex, ramp, rgbToOklch, oklchToRgb, toHex, type RampSpec, type RGB } from './color.ts';
import type { Look, Material, Overrides, SceneryMaterial, Slot } from './schema.ts';

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
export const DEFAULT_PARTS: Partial<Record<Slot, string>> = { body: 'basic', head: 'oval', eyes: 'soft', brows: 'thin', mouth: 'simple' };

/**
 * The face and body rig: params every part of these slots must have, with at least these
 * options. Emotions and animations are written against it, so they work with any part.
 */
export const RIG: Partial<Record<Slot, Record<string, string[] | 'number'>>> = {
  body: { pose: ['down', 'chin', 'hip'], left: ['down', 'raise'] },
  eyes: { shape: ['open', 'half', 'closed', 'joy', 'wide'], look_x: 'number', look_y: 'number' },
  brows: { mood: ['calm', 'raised', 'worried', 'angry', 'stern'] },
  mouth: { shape: ['neutral', 'smile', 'flat', 'open', 'o', 'frown', 'wavy', 'smirk', 'pout'] },
};

/**
 * The house emotions. A character's `look.emotions` adds to them or changes them; the base
 * look (no emotion) is calm and neutral.
 */
export const EMOTIONS: Record<string, Overrides> = {
  /** friendly, explaining */
  smile: { eyes: { shape: 'open' }, brows: { mood: 'calm' }, mouth: { shape: 'smile' } },
  /** joy, praise for a solved problem */
  happy: { eyes: { shape: 'joy' }, brows: { mood: 'raised' }, mouth: { shape: 'open' }, cheeks: { part: 'blush' } },
  /** pondering a question: eyes wide awake and looking up, not half shut (that reads as boredom) */
  thinking: {
    body: { pose: 'chin' },
    eyes: { shape: 'open', look_x: -1, look_y: -1 },
    brows: { mood: 'raised' },
    mouth: { shape: 'neutral' },
    fx: { part: 'marks', kind: 'dots' },
  },
  /** an unexpected answer, a twist */
  surprised: { eyes: { shape: 'wide' }, brows: { mood: 'raised' }, mouth: { shape: 'o' } },
  /** a compliment, affection scenes */
  embarrassed: {
    eyes: { shape: 'open', look_x: -1, look_y: 1 },
    brows: { mood: 'worried' },
    mouth: { shape: 'wavy' },
    cheeks: { part: 'blush' },
    fx: { part: 'marks', kind: 'sweat' },
  },
  /** a wrong answer, a setback */
  sad: { eyes: { shape: 'half', look_y: 1 }, brows: { mood: 'worried' }, mouth: { shape: 'frown' } },
  /** sulking or scolding */
  angry: { eyes: { shape: 'open' }, brows: { mood: 'angry' }, mouth: { shape: 'pout' }, fx: { part: 'marks', kind: 'anger' } },
  /** "told you so" */
  smug: { body: { pose: 'hip' }, eyes: { shape: 'half' }, brows: { mood: 'calm' }, mouth: { shape: 'smirk' } },
  /** lost the thread */
  confused: { eyes: { shape: 'open', look_x: 1 }, brows: { mood: 'worried' }, mouth: { shape: 'wavy' }, fx: { part: 'marks', kind: 'question' } },
  /** a strict definition, an important point */
  serious: { eyes: { shape: 'open' }, brows: { mood: 'stern' }, mouth: { shape: 'flat' } },
  /** explaining a point, finger raised */
  explain: { body: { left: 'raise' }, eyes: { shape: 'open' }, brows: { mood: 'raised' }, mouth: { shape: 'open' } },
};

/**
 * Animations are sequences of frames; a frame is overrides on top of the current emotion,
 * shown for `ms` milliseconds, and may also change body measurements (`globals`, e.g. a
 * breathing chest). A frame without `set` is the emotion itself. `when` limits an animation
 * to states it makes sense in (no blinking with eyes shut tight).
 */
export interface Animation {
  loop: boolean;
  when?: Partial<Record<Slot, Record<string, string[]>>>;
  frames: { ms: number; set?: Overrides; globals?: Partial<Record<'shoulders' | 'chest', number>> }[];
}

export const ANIMATIONS: Record<string, Animation> = {
  blink: {
    loop: false,
    when: { eyes: { shape: ['open', 'half', 'wide'] } },
    frames: [
      { ms: 40, set: { eyes: { shape: 'half' } } },
      { ms: 80, set: { eyes: { shape: 'closed' } } },
      { ms: 40, set: { eyes: { shape: 'half' } } },
    ],
  },
  talk: {
    loop: true,
    frames: [
      { ms: 110, set: { mouth: { shape: 'open' } } },
      { ms: 90, set: { mouth: { shape: 'o' } } },
      { ms: 110 },
    ],
  },
};

/** Light comes from the top left: shadows gather on the bottom right of every volume. */
export const SHADOW_DIR: [number, number] = [1, 1];

/** Where a cast shadow falls relative to its caster, in pixels: down and a little right. */
export const CAST_OFFSET: [number, number] = [1, 2];

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

/**
 * The background canvas. At the stage height (72vh for 256 px of the figure) one of its
 * pixels is about as big as one of the heroine's, so the scene reads as one picture.
 */
export const SCENE = { w: 640, h: 360 };

/** Colours of the scenery materials a background's palette leaves out. */
export const SCENERY_COLORS: Record<SceneryMaterial, string> = {
  wall: '#efe2cb',
  trim: '#b98a64',
  floor: '#b47b4f',
  ceiling: '#f7f2e8',
  wood: '#b8794a',
  dark_wood: '#6e4632',
  board: '#2f5b4c',
  chalk: '#eef1e6',
  glass: '#cfe9f5',
  sky: '#8ecbf0',
  cloud: '#ffffff',
  metal: '#8e95a6',
  paper: '#f8f4ea',
  fabric: '#c8d6ee',
  plant: '#5ca85c',
  blossom: '#f6b9cf',
  pot: '#c96f4c',
  haze: '#b8c7df',
  cork: '#c99a62',
  lamp: '#fff4cf',
  book1: '#b8473f',
  book2: '#3f6fae',
  book3: '#4f8f58',
  book4: '#d9a441',
  book5: '#7a4f9a',
  accent: '#e0485e',
  shine: '#ffffff',
};

/** Large calm surfaces: walls, floors and sky shade more gently than objects. */
const SURFACE_RAMP: RampSpec = { steps: [-0.28, -0.07, 0, 0.04, 0.08], hueShift: 40 };
const SURFACES: SceneryMaterial[] = ['wall', 'ceiling', 'floor', 'sky', 'trim'];

/** Five tones of every scenery material. */
export function sceneryPalette(p: Partial<Record<SceneryMaterial, string>>): Record<SceneryMaterial, RGB[]> {
  const out = {} as Record<SceneryMaterial, RGB[]>;
  for (const [m, def] of Object.entries(SCENERY_COLORS) as [SceneryMaterial, string][]) {
    const hex = p[m] ?? def;
    out[m] = m === 'shine' ? Array(5).fill(parseHex(hex)) : ramp(hex, SURFACES.includes(m) ? SURFACE_RAMP : undefined);
  }
  return out;
}

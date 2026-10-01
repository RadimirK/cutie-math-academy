import { describe, expect, it } from 'vitest';
import { evalExpr } from './expr.ts';
import { animationFrames, lookIssues, partIssues, renderFigure, renderLook, resolveLook, rigIssues, type PartLibrary } from './render.ts';
import { FRAMES } from './style.ts';
import { LookSchema, PartSchema } from './schema.ts';

const lib: PartLibrary = {
  head: {
    oval: PartSchema.parse({
      id: 'oval', desc: 'face', material: 'skin', shade: 'flat',
      params: { size: { range: [0.5, 1.2], default: 1 } },
      shapes: [{ ellipse: { at: [0, 0], r: '$size' } }],
    }),
  },
  eyes: {
    dots: PartSchema.parse({
      id: 'dots', desc: 'eyes', material: 'eyes', shade: 'none', outline: false,
      params: { shape: { options: ['open', 'shut'], default: 'open' } },
      shapes: [
        { stamp: { at: [-0.4, 0.2], rows: ['EE', 'EE'], key: { E: 'eyes' } }, mirror: true, when: { shape: 'open' } },
        { stamp: { at: [-0.4, 0.2], rows: ['LL'], key: { L: 'line' } }, mirror: true, when: { shape: 'shut' } },
      ],
    }),
  },
};
const look = LookSchema.parse({
  palette: { skin: '#f7dccb', hair: '#3d4f8a', eyes: '#4f8fc9', cloth: '#34405f' },
  parts: { head: { part: 'oval' }, eyes: { part: 'dots' }, body: { part: 'none' }, brows: { part: 'none' }, mouth: { part: 'none' } },
  emotions: { sleepy: { eyes: { shape: 'shut' } } },
});

const pixels = (s: { rgba: Uint8ClampedArray }) => Array.from(s.rgba);

describe('expr', () => {
  it('evaluates arithmetic over params', () => {
    expect(evalExpr('-$a * (2 + 1) / 3 - 0.5', { a: 2 })).toBe(-2.5);
    expect(evalExpr(0.25, {})).toBe(0.25);
  });
  it('rejects unknown params and junk', () => {
    expect(() => evalExpr('$b + 1', { a: 1 })).toThrow('$b');
    expect(() => evalExpr('1 +', {})).toThrow();
    expect(() => evalExpr('2 ^ 3', {})).toThrow();
  });
});

describe('renderLook', () => {
  it('is deterministic and mirror-symmetric for a symmetric look', () => {
    const a = renderLook(look, lib);
    expect(pixels(a)).toEqual(pixels(renderLook(look, lib)));
    for (let y = 0; y < a.h; y++)
      for (let x = 0; x < a.w; x++) expect(a.rgba[(y * a.w + x) * 4 + 3]).toBe(a.rgba[(y * a.w + (a.w - 1 - x)) * 4 + 3]);
  });
  it('applies emotion overrides', () => {
    expect(pixels(renderLook(look, lib, { emotion: 'sleepy' }))).not.toEqual(pixels(renderLook(look, lib)));
    // an emotion nobody defines is the base look
    expect(pixels(renderLook(look, lib, { emotion: 'nonexistent' }))).toEqual(pixels(renderLook(look, lib)));
  });
  it('a param changes the picture', () => {
    const small = { ...look, parts: { ...look.parts, head: { part: 'oval', size: 0.6 } } };
    const opaque = (s: { rgba: Uint8ClampedArray }) => pixels(s).filter((_, i) => i % 4 === 3 && _ > 0).length;
    expect(opaque(renderLook(small, lib))).toBeLessThan(opaque(renderLook(look, lib)));
  });
});

describe('emotions and animations', () => {
  const face = PartSchema.parse({
    id: 'face', desc: 'eyes', material: 'eyes', shade: 'none',
    params: {
      shape: { options: ['open', 'half', 'closed', 'joy', 'wide'], default: 'open' },
      look_x: { range: [-1, 1], default: 0, int: true },
      look_y: { range: [-1, 1], default: 0, int: true },
    },
    shapes: [{ stamp: { at: [-0.4, 0.2], rows: ['E'], key: { E: 'eyes' } }, mirror: true }],
  });
  const rigged = { ...lib, eyes: { face } };
  const eyes = (l: typeof look, emotion?: string) => resolveLook(l, rigged, { emotion }).find((p) => p.slot === 'eyes')!;
  const base = LookSchema.parse({ ...look, parts: { ...look.parts, eyes: { part: 'face' } } });

  it('applies the house preset, and the character changes it', () => {
    expect(eyes(base, 'surprised').enums.shape).toBe('wide');
    const own = { ...base, emotions: { surprised: { eyes: { look_x: 1 } } } };
    expect(eyes(own, 'surprised')).toMatchObject({ enums: { shape: 'wide' }, nums: { look_x: 1 } });
  });
  it('a preset does not fill a slot the look leaves empty', () => {
    expect(resolveLook(base, rigged, { emotion: 'smile' }).some((p) => p.slot === 'brows' || p.slot === 'mouth')).toBe(false);
  });
  it('blinks only with open eyes', () => {
    expect(animationFrames(base, rigged, 'blink').length).toBeGreaterThan(1);
    const squint = { ...base, emotions: { squint: { eyes: { shape: 'joy' } } } };
    expect(animationFrames(squint, rigged, 'blink', 'squint')).toEqual([]);
    const shut = animationFrames(base, rigged, 'blink').map((f) => resolveLook(base, rigged, { overlay: f.overlay }).find((p) => p.slot === 'eyes')!.enums.shape);
    expect(shut).toContain('closed');
  });
  it('checks parts against the rig', () => {
    expect(rigIssues('eyes', face)).toEqual([]);
    expect(rigIssues('eyes', lib.eyes!.dots!).join('\n')).toContain('look_x');
  });
  it('draws shapes by numeric conditions', () => {
    const p = PartSchema.parse({
      id: 'b', desc: 'b', material: 'skin',
      shapes: [{ ellipse: { at: [0, 2], r: 0.5 }, when: { chest: { min: 0.5 } } }],
    });
    const l = LookSchema.parse({ ...look, parts: { ...look.parts, body: { part: 'b' } } });
    const opaque = (s: { rgba: Uint8ClampedArray }) => pixels(s).filter((v, i) => i % 4 === 3 && v > 0).length;
    const lb = { ...lib, body: { b: p } };
    expect(opaque(renderFigure({ ...l, chest: 0.8 }, lb))).toBeGreaterThan(opaque(renderFigure({ ...l, chest: 0.2 }, lb)));
    // a frame of an animation can change a body measurement too
    expect(pixels(renderFigure({ ...l, chest: 0.2 }, lb, { globals: { chest: 0.8 } }))).toEqual(pixels(renderFigure({ ...l, chest: 0.8 }, lb)));
  });
});

describe('frames and clipping', () => {
  const body = PartSchema.parse({
    id: 'stick', desc: 'body', material: 'skin',
    shapes: [{ poly: [[-0.3, 2], [0.3, 2], [0.3, 8], [-0.3, 8]], name: 'legs' }],
  });
  const socks = PartSchema.parse({
    id: 'socks', desc: 'socks', material: 'legwear',
    shapes: [{ poly: [[-3, 6], [3, 6], [3, 9], [-3, 9]], clip: 'legs' }],
  });
  const dressed = LookSchema.parse({ ...look, parts: { ...look.parts, body: { part: 'stick' }, legwear: { part: 'socks' } } });
  const parts = { ...lib, body: { stick: body }, legwear: { socks } };

  it('clips clothes to the named body shape', () => {
    const naked = renderFigure({ ...dressed, parts: { ...dressed.parts, legwear: { part: 'none' } } }, parts);
    const alpha = (s: { rgba: Uint8ClampedArray }) => pixels(s).filter((_, i) => i % 4 === 3);
    // a 6-unit-wide rectangle clipped to a thin body adds no pixels to the silhouette
    expect(alpha(renderFigure(dressed, parts))).toEqual(alpha(naked));
    expect(pixels(renderFigure(dressed, parts))).not.toEqual(pixels(naked));
  });
  it('a frame is a window onto the figure', () => {
    const full = renderLook(dressed, parts, {}, 'full');
    expect([full.w, full.h]).toEqual([FRAMES.full.w, FRAMES.full.h]);
    const bust = renderLook(dressed, parts, {}, 'bust');
    const { x, y } = FRAMES.bust;
    const at = (s: { w: number; rgba: Uint8ClampedArray }, px: number, py: number) => Array.from(s.rgba.subarray((py * s.w + px) * 4, (py * s.w + px) * 4 + 4));
    expect(at(bust, 48, 60)).toEqual(at(full, 48 + x, 60 + y));
  });
  it('reports a clip to a missing name', () => {
    expect(() => renderFigure({ ...dressed, parts: { ...dressed.parts, body: { part: 'none' } } }, parts)).toThrow('name: legs');
  });
});

describe('validation', () => {
  it('reports unknown parts, params and out-of-range values', () => {
    const bad = LookSchema.parse({
      ...look,
      parts: { ...look.parts, head: { part: 'oval', size: 3 }, hair_front: { part: 'bob' } },
      emotions: { sleepy: { eyes: { shape: 'wink' } } },
    });
    const issues = lookIssues(bad, lib).join('\n');
    expect(issues).toContain('вне диапазона');
    expect(issues).toContain('нет детали bob');
    expect(issues).toContain('wink');
  });
  it('checks expressions and conditions of a part', () => {
    const part = PartSchema.parse({
      id: 'p', desc: 'd', material: 'hair',
      params: { mode: { options: ['a', 'b'], default: 'a' } },
      shapes: [
        { ellipse: { at: ['$missing', 0], r: 1 } },
        { poly: [[0, 0], [1, 0], [0, 1]], when: { mode: 'c' } },
        { stamp: { at: [0, 0], rows: ['xy'], key: { x: 'hair' } } },
      ],
    });
    const issues = partIssues(part).join('\n');
    expect(issues).toContain('$missing');
    expect(issues).toContain('нет варианта c');
    expect(issues).toContain('«y»');
  });
});

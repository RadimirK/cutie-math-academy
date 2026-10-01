import { describe, expect, it } from 'vitest';
import { evalExpr } from './expr.ts';
import { lookIssues, partIssues, renderFigure, renderLook, type PartLibrary } from './render.ts';
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
  parts: { head: { part: 'oval' }, eyes: { part: 'dots' }, body: { part: 'none' }, mouth: { part: 'none' } },
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
    expect(pixels(renderLook(look, lib, 'sleepy'))).not.toEqual(pixels(renderLook(look, lib)));
    // an emotion the look does not define is the base look
    expect(pixels(renderLook(look, lib, 'angry'))).toEqual(pixels(renderLook(look, lib)));
  });
  it('a param changes the picture', () => {
    const small = { ...look, parts: { ...look.parts, head: { part: 'oval', size: 0.6 } } };
    const opaque = (s: { rgba: Uint8ClampedArray }) => pixels(s).filter((_, i) => i % 4 === 3 && _ > 0).length;
    expect(opaque(renderLook(small, lib))).toBeLessThan(opaque(renderLook(look, lib)));
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
    const full = renderLook(dressed, parts, undefined, 'full');
    expect([full.w, full.h]).toEqual([FRAMES.full.w, FRAMES.full.h]);
    const bust = renderLook(dressed, parts, undefined, 'bust');
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

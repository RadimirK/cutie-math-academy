import { describe, expect, it } from 'vitest';
import { evalExpr } from './expr.ts';
import { backdropIssues, propIssues, renderBackdrop, type PropLibrary } from './scenery.ts';
import { BackdropSchema, PropSchema } from './schema.ts';
import { SCENE } from './style.ts';

const props: PropLibrary = {
  wall: PropSchema.parse({ id: 'wall', desc: 'wall', material: 'wall', outline: false, shapes: [{ poly: [[0, 0], [640, 0], [640, 360], [0, 360]] }] }),
  dots: PropSchema.parse({
    id: 'dots', desc: 'a row of dots', material: 'book1', outline: false,
    params: { n: { range: [1, 10], default: 3, int: true } },
    shapes: [{ poly: [[0, '$i % 2'], [1, '$i % 2'], [1, '$i % 2 + 1'], [0, '$i % 2 + 1']], repeat: { count: '$n', step: [4, 0] }, cycle: ['book1', 'book2'] }],
  }),
  pair: PropSchema.parse({
    id: 'pair', desc: 'mirrored pixel', material: 'book3', outline: false,
    shapes: [{ stamp: { at: [-3, 0], rows: ['p'], key: { p: 'book3' } }, mirror: true }],
  }),
};
const scene = (list: unknown[]) => BackdropSchema.parse({ id: 'test', name: 'test', props: [{ prop: 'wall', at: [0, 0] }, ...list] });
const px = (s: { w: number; rgba: Uint8ClampedArray }, x: number, y: number) => Array.from(s.rgba.subarray((y * s.w + x) * 4, (y * s.w + x) * 4 + 3));

describe('expr %', () => {
  it('is the mathematical remainder', () => {
    expect(evalExpr('7 % 3', {})).toBe(1);
    expect(evalExpr('-1 % 3', {})).toBe(2);
    expect(evalExpr('($i * 7) % 5', { i: 2 })).toBe(4);
  });
});

describe('scenery', () => {
  it('draws on the scene canvas, deterministically', () => {
    const b = scene([{ prop: 'dots', at: [100, 100] }]);
    const a = renderBackdrop(b, props);
    expect([a.w, a.h]).toEqual([SCENE.w, SCENE.h]);
    expect(Array.from(a.rgba)).toEqual(Array.from(renderBackdrop(b, props).rgba));
  });
  it('repeats a shape with $i, cycling materials', () => {
    const s = renderBackdrop(scene([{ prop: 'dots', at: [100, 100], n: 4 }]), props);
    const wall = px(s, 0, 0);
    // copies at x = 100, 104, 108, 112; odd copies one pixel lower; colours alternate
    const at = [px(s, 100, 100), px(s, 104, 101), px(s, 108, 100), px(s, 112, 101)];
    for (const c of at) expect(c).not.toEqual(wall);
    expect(at[0]).toEqual(at[2]);
    expect(at[0]).not.toEqual(at[1]);
    expect(px(s, 116, 100)).toEqual(wall);
  });
  it('mirrors about the prop, not the canvas', () => {
    const s = renderBackdrop(scene([{ prop: 'pair', at: [200, 50] }]), props);
    const wall = px(s, 0, 0);
    expect(px(s, 197, 50)).not.toEqual(wall);
    expect(px(s, 202, 50)).not.toEqual(wall);
  });
  it('reports unknown props and params out of range', () => {
    expect(backdropIssues(scene([{ prop: 'sofa', at: [0, 0] }]), props).join()).toContain('нет предмета sofa');
    expect(backdropIssues(scene([{ prop: 'dots', at: [0, 0], n: 50 }]), props).join()).toContain('вне диапазона');
    expect(backdropIssues(scene([{ prop: 'dots', at: [0, 0], size: 2 }]), props).join()).toContain('нет параметра size');
  });
  it('checks props: $i only inside repeat, cycle needs repeat', () => {
    const bad = PropSchema.parse({ id: 'bad', desc: 'bad', material: 'wall', shapes: [{ poly: [[0, 0], ['$i', 0], [0, 1]], cycle: ['wall'] }] });
    const issues = propIssues(bad).join('\n');
    expect(issues).toContain('$i');
    expect(issues).toContain('cycle без repeat');
    expect(propIssues(props.dots!)).toEqual([]);
  });
});

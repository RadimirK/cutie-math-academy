import { describe, expect, it } from 'vitest';
import { compileSeqExpr, lastOutside, parseFigure, vennRegions, vennShaded } from './core.ts';

describe('venn', () => {
  const shade = (expr: string, sets = ['A', 'B', 'C']) => [...vennShaded({ type: 'venn', sets, shade: expr, elements: {}, universe: 'U' })].sort();
  it('names regions by their sets', () => {
    expect(vennRegions(['A', 'B'])).toEqual(['0', 'A', 'B', 'AB']);
  });
  it('evaluates set expressions with the usual precedence', () => {
    expect(shade('A - B', ['A', 'B'])).toEqual(['A']);
    expect(shade('A ^ B', ['A', 'B'])).toEqual(['A', 'B']);
    expect(shade('~(A | B)', ['A', 'B'])).toEqual(['0']);
    expect(shade('A | B & C')).toEqual(shade('A | (B & C)'));
    expect(shade('A - B - C')).toEqual(['A']);
    expect(shade('A & B & C')).toEqual(['ABC']);
  });
  it('reports bad expressions and regions', () => {
    expect(parseFigure({ type: 'venn', sets: ['A', 'B'], shade: 'A | C' })).toMatchObject({ ok: false });
    expect(parseFigure({ type: 'venn', sets: ['A', 'B'], shade: 'A |' })).toMatchObject({ ok: false });
    expect(parseFigure({ type: 'venn', sets: ['A', 'B'], shade: ['BA'] })).toMatchObject({ ok: false });
    expect(parseFigure({ type: 'venn', sets: ['A', 'B'], elements: { AB: '3 4' } })).toMatchObject({ ok: true, props: { elements: { AB: ['3', '4'] } } });
  });
});

describe('sequence expressions', () => {
  const at = (src: string, n: number) => compileSeqExpr(src)(n);
  it('computes the usual formulas', () => {
    expect(at('(-1)^n/n', 3)).toBeCloseTo(-1 / 3);
    expect(at('1 + 2^-n', 2)).toBeCloseTo(1.25);
    expect(at('-n^2', 3)).toBe(-9);
    expect(at('2n + 1', 4)).toBe(9);
    expect(at('sin(pi*n/2)', 1)).toBeCloseTo(1);
    expect(at('(n+1)**2', 1)).toBe(4);
  });
  it('rejects garbage', () => {
    expect(() => compileSeqExpr('n +')).toThrow();
    expect(() => compileSeqExpr('foo(n)')).toThrow();
    expect(parseFigure({ type: 'sequence', expr: '1/(n-1)' })).toMatchObject({ ok: false });
  });
  it('finds the last term outside the strip', () => {
    expect(lastOutside([1, 0.5, 0.25, 0.125], 0, 0.3)).toBe(2);
    expect(lastOutside([0.1, 0.1], 0, 0.3)).toBe(0);
  });
});

describe('relation and cube', () => {
  it('reads edges from a string', () => {
    expect(parseFigure({ type: 'relation', nodes: '1 2 3', edges: '1>2 3>3' })).toMatchObject({ ok: true, props: { nodes: ['1', '2', '3'], edges: [['1', '2'], ['3', '3']] } });
    expect(parseFigure({ type: 'relation', nodes: [1, 2], edges: '1>4' })).toMatchObject({ ok: false });
  });
  it('resolves mapping arrows column by column', () => {
    const sets = [
      { name: 'A', elements: '1 2' },
      { name: 'B', elements: 'a b' },
      { name: 'A', elements: '1 2' },
    ];
    expect(parseFigure({ type: 'mapping', sets, maps: ['1>a 2>b', 'a>1 b>2'], through: '1>1' })).toMatchObject({
      ok: true,
      props: { maps: [[['1', 'a'], ['2', 'b']], [['a', '1'], ['b', '2']]], through: [['1', '1']] },
    });
    expect(parseFigure({ type: 'mapping', sets, maps: ['a>1'] })).toMatchObject({ ok: false });
    expect(parseFigure({ type: 'mapping', sets, through: '1>a' })).toMatchObject({ ok: false });
    expect(parseFigure({ type: 'mapping', sets, maps: ['1>a', 'a>1', '1>a'] })).toMatchObject({ ok: false });
  });
  it('checks the cube dimension', () => {
    expect(parseFigure({ type: 'cube', values: '00010111', highlight: '011 101' })).toMatchObject({ ok: true });
    expect(parseFigure({ type: 'cube', values: '010' })).toMatchObject({ ok: false });
    expect(parseFigure({ type: 'cube', values: '0001', highlight: '011' })).toMatchObject({ ok: false });
  });
});

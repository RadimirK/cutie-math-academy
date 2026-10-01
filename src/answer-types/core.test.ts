import { describe, expect, it } from 'vitest';
import { answerTypes, matrixShape, parseRational, prepareInstance } from './core.ts';

describe('number quickCheck', () => {
  const q = answerTypes.number!.quickCheck!;
  it('compares rationals exactly', () => {
    expect(q('(-3)/(2)', '-3/2', {})).toEqual({ ok: true });
    expect(q('0.5', '1/2', {})).toEqual({ ok: true });
    expect(q('1.5', '3/2', {})).toEqual({ ok: true });
    expect(q('0.333', '1/3', {})).toEqual({ ok: false });
    expect(q('3/(-4)', '-3/4', {})).toEqual({ ok: true });
  });
  it('handles special values', () => {
    expect(q('(-oo)', '-oo', {})).toEqual({ ok: true });
    expect(q('oo', '-oo', {})).toEqual({ ok: false });
    expect(q('DNE', '0', {})).toEqual({ ok: false });
  });
  it('defers anything else to Python', () => {
    expect(q('E**6', 'exp(6)', {})).toBeNull();
    expect(q('1/2', '1/(1 + 1)', {})).toBeNull();
    expect(q('(1+2)/3', '1', {})).toBeNull();
  });
  it('parseRational rejects operators', () => {
    expect(parseRational('1-2')).toBeNull();
    expect(parseRational('3/2/2')).toBeNull();
    expect(parseRational('1/0')).toBeNull();
  });
});

describe('matrixShape', () => {
  it('reads the grid size', () => {
    expect(matrixShape('[[1, -2], [0, 1]]')).toEqual([2, 2]);
    expect(matrixShape('[[1, 2, 3], [4, 5, 6]]')).toEqual([2, 3]);
    expect(matrixShape('[[f(1, 2), 3]]')).toEqual([1, 2]);
    expect(matrixShape('[[1], [2, 3]]')).toBeNull();
  });
});

describe('choice prepare', () => {
  const inst = (config: Record<string, unknown>) => ({ statement: 's', answer: '5', params: {}, config });
  const options = (config: Record<string, unknown>, seed = 1) => prepareInstance('choice', inst(config), seed).config.options as string[];
  it('samples count - 1 distractors around the answer, deterministically', () => {
    const cfg = { distractors: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], count: 6 };
    const a = options(cfg);
    expect(a).toHaveLength(6);
    expect(a).toContain('5');
    expect(new Set(a).size).toBe(6);
    expect(options(cfg)).toEqual(a);
    const seen = new Set(Array.from({ length: 30 }, (_, s) => options(cfg, s).join()));
    expect(seen.size).toBeGreaterThan(20);
  });
  it('uses the whole pool when it is small, dropping copies of the answer', () => {
    expect(options({ distractors: ['5', '6', '6'] }).sort()).toEqual(['5', '6']);
  });
  it('keeps the order of plain options unless asked to shuffle', () => {
    expect(options({ options: ['Да', 'Нет'] })).toEqual(['Да', 'Нет']);
    const orders = new Set(Array.from({ length: 20 }, (_, s) => options({ options: ['a', 'b', 'c', '5'], shuffle: true }, s).join()));
    expect(orders.size).toBeGreaterThan(5);
  });
});

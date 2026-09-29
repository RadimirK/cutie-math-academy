import { describe, expect, it } from 'vitest';
import { answerTypes, matrixShape, parseRational } from './core.ts';

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

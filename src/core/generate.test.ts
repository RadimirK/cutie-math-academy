import { describe, expect, it } from 'vitest';
import type { Template } from '../content/schema.ts';
import { instantiateDeclarative, sampleParams, substitute } from './generate.ts';
import { splitmix32 } from './rng.ts';

describe('splitmix32', () => {
  it('is pinned: changing it would change every issued problem', () => {
    const r = splitmix32(42);
    expect([r(), r(), r()]).toEqual([551831576, 144025891, 322543647]);
  });
});

describe('substitute', () => {
  it('fills placeholders and filters', () => {
    expect(substitute('\\frac{<<a>>}{x} <<b|signed>> <<c|paren>>', { a: 3, b: -2, c: -5 })).toBe('\\frac{3}{x} - 2 (-5)');
    expect(substitute('<<b|signed>>', { b: 4 })).toBe('+ 4');
  });
  it('rejects unknown params and filters', () => {
    expect(() => substitute('<<z>>', {})).toThrow('неизвестный параметр');
    expect(() => substitute('<<a|nope>>', { a: 1 })).toThrow('неизвестный фильтр');
  });
});

describe('sampleParams', () => {
  const params = {
    a: { type: 'int' as const, range: [-3, 3] as [number, number], exclude: [0] },
    v: { type: 'pick' as const, values: [{ tex: 'x', ans: 1 }, { tex: 'y', ans: 2 }] },
  };
  it('is deterministic and honours exclude', () => {
    for (let seed = 0; seed < 200; seed++) {
      const p = sampleParams(params, seed);
      expect(p).toEqual(sampleParams(params, seed));
      expect(p.a).not.toBe(0);
      expect(p.a as number).toBeGreaterThanOrEqual(-3);
      expect(['x', 'y']).toContain(p['v.tex']);
    }
  });
});

describe('instantiateDeclarative', () => {
  it('substitutes statement, answer and config', () => {
    const t = {
      id: 't', version: 1, difficulty: 1, starred: false, answer_type: 'choice',
      params: { a: { type: 'int', range: [5, 5], exclude: [] } },
      config: { options: ['<<a>>', 'нет'] },
      statement: '$<<a>>$', answer: '<<a>>',
    } as Template;
    expect(instantiateDeclarative(t, 1)).toEqual({ statement: '$5$', answer: '5', config: { options: ['5', 'нет'] }, params: { a: 5 } });
  });
});

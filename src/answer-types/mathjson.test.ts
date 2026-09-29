import { ComputeEngine } from '@cortex-js/compute-engine';
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ConvertError, mathJsonToSympy, normalizeLatex } from './mathjson.ts';

const ce = new ComputeEngine();
const convert = (latex: string) => mathJsonToSympy(ce.parse(normalizeLatex(latex)).json as never);

// [latex typed by a player, reference answer in sympy syntax it must be equivalent to]
const CASES: [string, string, 'number' | 'expression'][] = [
  ['\\frac{3}{4}', '3/4', 'number'],
  ['-\\frac{3}{2}', '-3/2', 'number'],
  ['0,5', '1/2', 'number'],
  ['e^{6}', 'exp(6)', 'number'],
  ['\\sqrt{8}', '2*sqrt(2)', 'number'],
  ['\\sqrt[3]{-8}', '-2', 'number'],
  ['\\infty', 'oo', 'number'],
  ['-\\infty', '-oo', 'number'],
  ['\\log_2 8', '3', 'number'],
  ['e^{6x}', 'exp(6*x)', 'expression'],
  ['\\exp(-3x)', 'exp(-3*x)', 'expression'],
  ['\\frac{1}{2}x^2-x', 'x**2/2 - x', 'expression'],
  ['\\sin^2 x+\\cos^2x', '1', 'expression'],
  ['\\ln|x|', 'log(Abs(x))', 'expression'],
  ['(x+1)(x-1)', 'x**2 - 1', 'expression'],
  ['\\operatorname{arctg} x', 'atan(x)', 'expression'],
  ['x!', 'factorial(x)', 'expression'],
  // Zhegalkin polynomials: juxtaposed letters are a product, + stands for ⊕.
  ['xyz+xz+x+z+1', 'x*y*z + x*z + x + z + 1', 'expression'],
  ['yx+y', 'x*y + y', 'expression'],
];

describe('mathJsonToSympy', () => {
  it('rejects malformed input', () => {
    expect(() => convert('\\frac{')).toThrow('проверь скобки');
    expect(() => convert('1,2,3')).toThrow(ConvertError);
    expect(() => mathJsonToSympy(['Add', 1, { str: 'x' }] as never)).toThrow(ConvertError);
  });

  it('produces answers the Python checkers accept', () => {
    const root = join(import.meta.dirname, '../..');
    const python = process.env.PYTHON ?? (existsSync(join(root, '.venv/bin/python')) ? join(root, '.venv/bin/python') : 'python3');
    const items = CASES.map(([latex, correct, type]) => ({ latex, type, correct, user: convert(latex) }));
    const code = `
import json, sys
from cutemath.checks import check
items = json.load(sys.stdin)
print(json.dumps([check(i['type'], i['user'], i['correct'], {'variables': ['x']}) for i in items]))
`;
    const r = spawnSync(python, ['-c', code], { input: JSON.stringify(items), env: { ...process.env, PYTHONPATH: join(root, 'python') }, encoding: 'utf8' });
    expect(r.stderr).toBe('');
    const results = JSON.parse(r.stdout) as unknown[];
    items.forEach((item, i) => expect({ ...item, result: results[i] }).toEqual({ ...item, result: { ok: true } }));
  });
});

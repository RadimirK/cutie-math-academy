// UI-free part of the answer-type plugins: config schemas and TS-side checkers.
// Imported by CI scripts, so no React here. Input components live in ./ui.tsx.
//
// All answers cross module boundaries as strings in sympy syntax (the Input component
// serializes, the checker parses). Types with check: 'python' are checked by
// python/cutemath/checks.py, in the Pyodide worker in the browser and in CPython in CI.
import { z } from 'zod';

export type CheckResult = { ok: true } | { ok: false } | { parseError: string };

export interface AnswerTypeCore<Cfg = unknown> {
  id: string;
  configSchema: z.ZodType<Cfg>;
  check: 'python' | ((user: string, correct: string, cfg: Cfg) => CheckResult);
  /** A certainly-wrong answer for the self-test. Python-checked types get it from cutemath.wrong(). */
  mutate?: (correct: string, cfg: Cfg) => string;
  /**
   * Optional fast path in TS for easy cases (returns null to defer to `check`), so simple
   * answers do not wait for Pyodide to load. Must agree with `check` whenever it answers.
   */
  quickCheck?: (user: string, correct: string, cfg: Cfg) => CheckResult | null;
  /** Extra consistency checks of an instance (e.g. the answer is among the options). */
  validateInstance?: (answer: string, cfg: Cfg) => string | null;
}

const expression: AnswerTypeCore<{ variables?: string[] }> = {
  id: 'expression',
  configSchema: z.strictObject({ variables: z.array(z.string()).optional() }),
  check: 'python',
};

/** Exact value of a plain rational literal like "-3/4", "(-3)/(4)" or "0.5"; null otherwise. */
export function parseRational(s: string): { n: bigint; d: bigint } | null {
  const m = /^(-?)(\d+)(?:\.(\d+))?(?:\/(-?)(\d+))?$/.exec(s.replace(/[\s()]/g, ''));
  if (!m) return null;
  const frac = m[3] ?? '';
  let n = BigInt(m[2]! + frac) * (m[1] ? -1n : 1n);
  let d = 10n ** BigInt(frac.length);
  if (m[5] !== undefined) {
    const den = BigInt(m[5]);
    if (den === 0n) return null;
    d *= den;
    if (m[4]) n = -n;
  }
  return { n, d };
}

const SPECIAL = new Set(['oo', '-oo', '(-oo)', 'zoo', 'DNE']);
const norm = (s: string) => s.replace(/\s/g, '').replace(/^\((-oo)\)$/, '$1');

const number: AnswerTypeCore<Record<string, never>> = {
  id: 'number',
  configSchema: z.strictObject({}),
  check: 'python',
  quickCheck: (user, correct) => {
    const u = norm(user);
    const c = norm(correct);
    if (SPECIAL.has(u) && SPECIAL.has(c)) return { ok: u === c };
    const a = parseRational(u);
    const b = parseRational(c);
    if (a && b) return { ok: a.n * b.d === b.n * a.d };
    if ((a && SPECIAL.has(c)) || (b && SPECIAL.has(u))) return { ok: false };
    return null;
  },
};

/** Rows × columns of a matrix answer like "[[1, 2], [3, 4]]" (used to size the input grid). */
export function matrixShape(answer: string): [number, number] | null {
  const rows: number[] = [];
  let depth = 0;
  let cells = 0;
  for (const ch of answer) {
    if (ch === '[' || ch === '(') {
      depth++;
      if (depth === 2 && ch === '[') cells = 1;
    } else if (ch === ']' || ch === ')') {
      if (depth === 2 && ch === ']') rows.push(cells);
      depth--;
    } else if (ch === ',' && depth === 2) cells++;
  }
  if (!rows.length || rows.some((r) => r !== rows[0])) return null;
  return [rows.length, rows[0]!];
}

const matrix: AnswerTypeCore<Record<string, never>> = {
  id: 'matrix',
  configSchema: z.strictObject({}),
  check: 'python',
};

type ChoiceCfg = { options: string[] };
const choice: AnswerTypeCore<ChoiceCfg> = {
  id: 'choice',
  configSchema: z.strictObject({ options: z.array(z.string().min(1)).min(2) }),
  check: (user, correct) => (user.trim() === correct.trim() ? { ok: true } : { ok: false }),
  mutate: (correct, cfg) => cfg.options.find((o) => o !== correct) ?? `${correct}?`,
  validateInstance: (answer, cfg) => {
    if (!cfg.options.includes(answer)) return `ответ «${answer}» не входит в options`;
    if (new Set(cfg.options).size !== cfg.options.length) return 'options повторяются';
    return null;
  },
};

export const answerTypes: Record<string, AnswerTypeCore<any>> = Object.fromEntries(
  [expression, number, matrix, choice].map((t) => [t.id, t]),
);

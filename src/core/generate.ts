// Instantiation of declarative templates: (template, seed) -> concrete problem.
// Templates with a Python generator are instantiated by the Pyodide worker instead.
import type { Param, Template } from '../content/schema.ts';
import { pickIndex, splitmix32, type Rng } from './rng.ts';

export type ParamValue = string | number;

export interface ProblemInstance {
  statement: string;
  /** Reference answer, serialized the way the answer type expects. */
  answer: string;
  config: Record<string, unknown>;
  params: Record<string, ParamValue>;
  /** Figure spec (see src/figures/core.ts) shown under the statement. */
  figure?: unknown;
}

export function sampleParam(p: Param, rng: Rng): Sampled {
  switch (p.type) {
    case 'int': {
      const [lo, hi] = p.range;
      const excluded = new Set(p.exclude);
      const candidates: number[] = [];
      for (let v = lo; v <= hi; v++) if (!excluded.has(v)) candidates.push(v);
      if (candidates.length === 0) throw new Error(`пустой диапазон [${lo}, ${hi}]`);
      return candidates[pickIndex(rng, candidates.length)]!;
    }
    case 'pick':
      return p.values[pickIndex(rng, p.values.length)]!;
  }
}

type Sampled = ParamValue | Record<string, ParamValue>;

/**
 * Params are sampled in declaration order, so reordering `params` in YAML changes problems.
 * Record values of `pick` params are flattened to `name.field` keys.
 */
export function sampleParams(params: Record<string, Param>, seed: number): Record<string, ParamValue> {
  const rng = splitmix32(seed);
  const out: Record<string, ParamValue> = {};
  for (const [name, p] of Object.entries(params)) {
    const v = sampleParam(p, rng);
    if (typeof v === 'object') for (const [k, x] of Object.entries(v)) out[`${name}.${k}`] = x;
    else out[name] = v;
  }
  return out;
}

const PLACEHOLDER = /<<\s*([a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*)?)\s*(?:\|\s*([a-z]+)\s*)?>>/g;

const FILTERS: Record<string, (v: ParamValue) => string> = {
  /** `x <<b|signed>>` -> `x + 3` / `x - 3` */
  signed: (v) => (typeof v === 'number' && v < 0 ? `- ${-v}` : `+ ${v}`),
  /** wraps negative numbers in parentheses: `(-3)` */
  paren: (v) => (typeof v === 'number' && v < 0 ? `(${v})` : String(v)),
};
export const FILTER_NAMES = Object.keys(FILTERS);

export function placeholders(text: string): { name: string; filter?: string }[] {
  return [...text.matchAll(PLACEHOLDER)].map((m) => ({ name: m[1]!, filter: m[2] }));
}

export function substitute(text: string, values: Record<string, ParamValue>): string {
  return text.replace(PLACEHOLDER, (_, name: string, filter?: string) => {
    if (!(name in values)) throw new Error(`неизвестный параметр <<${name}>>`);
    const v = values[name]!;
    if (filter === undefined) return String(v);
    const f = FILTERS[filter];
    if (!f) throw new Error(`неизвестный фильтр |${filter}`);
    return f(v);
  });
}

function substituteDeep(value: unknown, values: Record<string, ParamValue>): unknown {
  if (typeof value === 'string') return substitute(value, values);
  if (Array.isArray(value)) return value.map((v) => substituteDeep(v, values));
  if (value && typeof value === 'object')
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, substituteDeep(v, values)]));
  return value;
}

export function instantiateDeclarative(t: Template, seed: number): ProblemInstance {
  if (t.generator) throw new Error(`${t.id}: шаблон с генератором инстанцируется в Python`);
  const params = sampleParams(t.params, seed);
  return {
    statement: substitute(t.statement!, params),
    answer: substitute(t.answer!, params),
    config: substituteDeep(t.config, params) as Record<string, unknown>,
    params,
    ...(t.figure && { figure: substituteDeep(t.figure, params) }),
  };
}

// UI-free part of the figure plugins: prop schemas and the maths the views need.
// Figures are pictures on the scene board and in problem statements. A figure spec is
// `{type, ...props}`; the plugin with that id validates the props. Imported by CI scripts,
// so no React here. Views live in ./Figure.tsx.
import { z } from 'zod';

export interface FigureTypeCore<P = unknown> {
  id: string;
  schema: z.ZodType<P, any>;
}

/** A node or element label: numbers from YAML and generators become strings. */
const Label = z.union([z.string().min(1), z.number()]).transform(String);

/** A list written as an array, as a string separated by spaces or commas (for <<params>>), or as one number. */
function listOf<T extends z.ZodType>(item: T) {
  return z.preprocess(
    (v) => (typeof v === 'string' ? v.split(/[\s,]+/).filter(Boolean) : typeof v === 'number' ? [v] : v),
    z.array(item),
  );
}

const Num = z.coerce.number().refine(Number.isFinite, 'нужно конечное число');

// ---------- venn ----------

/**
 * A region of a Venn diagram is named by the sets it lies in, in the order of `sets`
 * (`A`, `AB`, `ABC`), or `0` for the part of the universe outside every set.
 */
export function vennRegions(sets: string[]): string[] {
  const out: string[] = [];
  for (let mask = 0; mask < 1 << sets.length; mask++) out.push(regionKey(sets, mask));
  return out;
}

function regionKey(sets: string[], mask: number): string {
  return sets.filter((_, i) => mask & (1 << i)).join('') || '0';
}

/**
 * Parses a set expression over one-letter set names: `~` complement, `&` intersection,
 * `|` union, `-` difference, `^` symmetric difference. `~` binds tightest, then `&`;
 * `|`, `-` and `^` share the lowest level and associate to the left.
 * Returns the predicate "a region with these memberships lies in the set".
 */
export function parseSetExpr(src: string, names: string[]): (has: (name: string) => boolean) => boolean {
  type Pred = (has: (name: string) => boolean) => boolean;
  const tokens = src.match(/[A-Z]|[~&|^()-]|\S/g) ?? [];
  let i = 0;
  const fail = (msg: string): never => {
    throw new Error(`выражение «${src}»: ${msg}`);
  };
  const expr = (): Pred => {
    let left = term();
    while (tokens[i] === '|' || tokens[i] === '-' || tokens[i] === '^') {
      const op = tokens[i++];
      const a = left;
      const b = term();
      left = op === '|' ? (h) => a(h) || b(h) : op === '-' ? (h) => a(h) && !b(h) : (h) => a(h) !== b(h);
    }
    return left;
  };
  const term = (): Pred => {
    let left = factor();
    while (tokens[i] === '&') {
      i++;
      const a = left;
      const b = factor();
      left = (h) => a(h) && b(h);
    }
    return left;
  };
  const factor = (): Pred => {
    const t = tokens[i++];
    if (t === '~') {
      const a = factor();
      return (h) => !a(h);
    }
    if (t === '(') {
      const a = expr();
      if (tokens[i++] !== ')') fail('нет закрывающей скобки');
      return a;
    }
    if (t && /^[A-Z]$/.test(t)) {
      if (!names.includes(t)) fail(`нет множества ${t}`);
      return (h) => h(t);
    }
    return fail(t ? `неожиданный символ «${t}»` : 'выражение оборвалось');
  };
  const result = expr();
  if (i < tokens.length) fail(`лишний символ «${tokens[i]}»`);
  return result;
}

const SetName = z.string().regex(/^[A-Z]$/, 'имя множества — одна заглавная латинская буква');

const venn = {
  id: 'venn',
  schema: z
    .strictObject({
      type: z.literal('venn'),
      sets: z.array(SetName).min(2).max(3),
      /** Shaded part: a set expression like `A & ~B`, or a list of region names. */
      shade: z.union([z.string(), z.array(z.string())]).optional(),
      /** Elements written into regions: region name -> elements. */
      elements: z.record(z.string(), listOf(Label)).default({}),
      universe: z.string().default('U'),
    })
    .superRefine((p, ctx) => {
      if (new Set(p.sets).size !== p.sets.length) ctx.addIssue({ code: 'custom', path: ['sets'], message: 'имена множеств повторяются' });
      const regions = vennRegions(p.sets);
      const keys = [...Object.keys(p.elements), ...(Array.isArray(p.shade) ? p.shade : [])];
      for (const k of keys) if (!regions.includes(k)) ctx.addIssue({ code: 'custom', message: `нет области ${k} (есть: ${regions.join(', ')})` });
      if (typeof p.shade === 'string')
        try {
          parseSetExpr(p.shade, p.sets);
        } catch (e) {
          ctx.addIssue({ code: 'custom', path: ['shade'], message: (e as Error).message });
        }
    }),
} satisfies FigureTypeCore;

export type VennProps = z.output<typeof venn.schema>;

/** Names of the shaded regions. */
export function vennShaded(p: VennProps): Set<string> {
  if (p.shade === undefined) return new Set();
  if (Array.isArray(p.shade)) return new Set(p.shade);
  const pred = parseSetExpr(p.shade, p.sets);
  const out = new Set<string>();
  for (let mask = 0; mask < 1 << p.sets.length; mask++)
    if (pred((name) => !!(mask & (1 << p.sets.indexOf(name))))) out.add(regionKey(p.sets, mask));
  return out;
}

// ---------- relation ----------

/** Edges as `[["1", "2"], ...]` or as a string `"1>2 2>3 3>3"`. */
const Edges = z.preprocess(
  (v) => (typeof v === 'string' ? v.split(/[\s,]+/).filter(Boolean).map((e) => e.split('>')) : v),
  z.array(z.tuple([Label, Label])),
);

const relation = {
  id: 'relation',
  schema: z
    .strictObject({
      type: z.literal('relation'),
      nodes: listOf(Label).pipe(z.array(z.string()).min(1).max(8)),
      edges: Edges.default([]),
    })
    .superRefine((p, ctx) => {
      if (new Set(p.nodes).size !== p.nodes.length) ctx.addIssue({ code: 'custom', path: ['nodes'], message: 'вершины повторяются' });
      for (const [a, b] of p.edges)
        for (const x of [a, b]) if (!p.nodes.includes(x)) ctx.addIssue({ code: 'custom', path: ['edges'], message: `нет вершины ${x}` });
    }),
} satisfies FigureTypeCore;

export type RelationProps = z.output<typeof relation.schema>;

// ---------- cube ----------

const Bits = z.string().regex(/^[01]+$/, 'строка из 0 и 1');

const cube = {
  id: 'cube',
  schema: z
    .strictObject({
      type: z.literal('cube'),
      /** Truth vector in lexicographic order of argument sets, as everywhere in the course. */
      values: Bits.optional(),
      /** Dimension, if no values are given. */
      n: z.coerce.number().int().min(1).max(4).optional(),
      /** Argument sets to circle (e.g. the minimal ones). */
      highlight: listOf(Bits).default([]),
    })
    .superRefine((p, ctx) => {
      const n = cubeDim(p);
      if (n === null) return ctx.addIssue({ code: 'custom', message: 'нужно values длины 2, 4, 8 или 16, либо n от 1 до 4' });
      for (const h of p.highlight) if (h.length !== n) ctx.addIssue({ code: 'custom', path: ['highlight'], message: `набор ${h} не из $B^${n}$` });
    }),
} satisfies FigureTypeCore;

export type CubeProps = z.output<typeof cube.schema>;

export function cubeDim(p: { values?: string; n?: number }): number | null {
  if (p.values) {
    const n = Math.log2(p.values.length);
    return Number.isInteger(n) && n >= 1 && n <= 4 && (p.n === undefined || p.n === n) ? n : null;
  }
  return p.n ?? null;
}

// ---------- sequence ----------

/**
 * Compiles an expression in `n` like `(-1)^n/n`, `1 + 2^-n` or `sin(pi*n/2)`.
 * Supports + - * / ^ (or **), implicit multiplication (`2n`), constants pi and e,
 * and the functions sin cos tan sqrt exp ln abs floor.
 */
export function compileSeqExpr(src: string): (n: number) => number {
  type F = (n: number) => number;
  const FUNCS: Record<string, (x: number) => number> = {
    sin: Math.sin, cos: Math.cos, tan: Math.tan, sqrt: Math.sqrt, exp: Math.exp, ln: Math.log, abs: Math.abs, floor: Math.floor,
  };
  const tokens = src.replace(/\*\*/g, '^').match(/\d+(?:\.\d+)?|[a-z]+|[-+*/^()]|\S/g) ?? [];
  let i = 0;
  const fail = (msg: string): never => {
    throw new Error(`выражение «${src}»: ${msg}`);
  };
  const startsAtom = (t?: string) => !!t && (t === '(' || /^[\da-z]/.test(t));
  const expr = (): F => {
    let left = term();
    while (tokens[i] === '+' || tokens[i] === '-') {
      const op = tokens[i++];
      const a = left;
      const b = term();
      left = op === '+' ? (n) => a(n) + b(n) : (n) => a(n) - b(n);
    }
    return left;
  };
  const term = (): F => {
    let left = unary();
    for (;;) {
      const t = tokens[i];
      if (t === '*' || t === '/') i++;
      else if (!startsAtom(t)) return left;
      const a = left;
      const b = unary();
      left = t === '/' ? (n) => a(n) / b(n) : (n) => a(n) * b(n);
    }
  };
  const unary = (): F => {
    if (tokens[i] === '-') {
      i++;
      const a = unary();
      return (n) => -a(n);
    }
    if (tokens[i] === '+') i++;
    return power();
  };
  const power = (): F => {
    const base = atom();
    if (tokens[i] !== '^') return base;
    i++;
    const exp = unary(); // right-associative, allows 2^-n
    return (n) => base(n) ** exp(n);
  };
  const atom = (): F => {
    const t = tokens[i++];
    if (t === undefined) return fail('выражение оборвалось');
    if (/^\d/.test(t)) {
      const v = Number(t);
      return () => v;
    }
    if (t === 'n') return (n) => n;
    if (t === 'pi') return () => Math.PI;
    if (t === 'e') return () => Math.E;
    if (t === '(') {
      const a = expr();
      if (tokens[i++] !== ')') fail('нет закрывающей скобки');
      return a;
    }
    const f = FUNCS[t];
    if (f) {
      if (tokens[i++] !== '(') fail(`после ${t} нужна скобка`);
      const a = expr();
      if (tokens[i++] !== ')') fail('нет закрывающей скобки');
      return (n) => f(a(n));
    }
    return fail(`неизвестное «${t}»`);
  };
  const result = expr();
  if (i < tokens.length) fail(`лишний символ «${tokens[i]}»`);
  return result;
}

const sequence = {
  id: 'sequence',
  schema: z
    .strictObject({
      type: z.literal('sequence'),
      /** Formula in n (see compileSeqExpr), or explicit values x_1, x_2, ... */
      expr: z.string().optional(),
      values: z.array(Num).min(2).max(60).optional(),
      /** How many terms to plot when `expr` is given. */
      count: z.coerce.number().int().min(2).max(60).default(20),
      label: z.string().default('x'),
      /** Draws the line y = limit and, with eps, the ε-strip around it. */
      limit: Num.optional(),
      eps: Num.pipe(z.number().positive()).optional(),
      /**
       * A slider for ε; terms outside the strip turn red and N, after which all plotted terms
       * stay inside, is marked. Without it the picture gives no hints (fit for problems).
       */
      interactive: z.boolean().default(false),
    })
    .superRefine((p, ctx) => {
      if ((p.expr === undefined) === (p.values === undefined)) return ctx.addIssue({ code: 'custom', message: 'нужно ровно одно из expr и values' });
      if (p.interactive && p.limit === undefined) ctx.addIssue({ code: 'custom', path: ['interactive'], message: 'ползунку ε нужен limit' });
      if (p.expr !== undefined)
        try {
          if (!sequenceValues(p).every(Number.isFinite)) ctx.addIssue({ code: 'custom', path: ['expr'], message: 'не все члены конечны' });
        } catch (e) {
          ctx.addIssue({ code: 'custom', path: ['expr'], message: (e as Error).message });
        }
    }),
} satisfies FigureTypeCore;

export type SequenceProps = z.output<typeof sequence.schema>;

export function sequenceValues(p: { expr?: string; values?: number[]; count: number }): number[] {
  if (p.values) return p.values;
  const f = compileSeqExpr(p.expr!);
  return Array.from({ length: p.count }, (_, k) => f(k + 1));
}

/** The last plotted index n with |x_n - limit| >= eps (0 if every term is in the strip). */
export function lastOutside(values: number[], limit: number, eps: number): number {
  for (let k = values.length - 1; k >= 0; k--) if (Math.abs(values[k]! - limit) >= eps) return k + 1;
  return 0;
}

// ---------- registry ----------

export const figureTypes: Record<string, FigureTypeCore<any>> = Object.fromEntries([venn, relation, cube, sequence].map((f) => [f.id, f]));

/** Validates a figure spec against its plugin. Returns the parsed props or an error message. */
export function parseFigure(spec: unknown): { ok: true; type: string; props: any } | { ok: false; error: string } {
  const type = (spec as { type?: unknown } | null)?.type;
  const plugin = typeof type === 'string' ? figureTypes[type] : undefined;
  if (!plugin) return { ok: false, error: `неизвестный рисунок ${String(type)} (есть: ${Object.keys(figureTypes).join(', ')})` };
  const r = plugin.schema.safeParse(spec);
  if (!r.success) return { ok: false, error: r.error.issues.map((i) => `${i.path.join('.') || type}: ${i.message}`).join('; ') };
  return { ok: true, type: plugin.id, props: r.data };
}

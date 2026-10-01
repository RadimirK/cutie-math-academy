// Arithmetic over part parameters: numbers, `$name`, + - * / %, unary minus, parentheses.
// `%` is the mathematical remainder (never negative for a positive divisor): with the index
// `$i` of a repeated shape it varies copies, `'($i * 7) % 3'` gives 0, 1, 2, 0, 1, …
// Parts write coordinates as `0.4` or `"$length + 0.1"`; this is the whole language.

export type Expr = number | string;

const TOKEN = /\s*(?:(\d+(?:\.\d*)?|\.\d+)|\$([a-z_][a-z0-9_]*)|([-+*/%()]))/y;

/** Names of the `$params` an expression refers to. */
export function exprVars(e: Expr): string[] {
  return typeof e === 'number' ? [] : [...e.matchAll(/\$([a-z_][a-z0-9_]*)/g)].map((m) => m[1]!);
}

export function evalExpr(e: Expr, vars: Record<string, number>): number {
  if (typeof e === 'number') return e;
  const tokens: (number | string)[] = [];
  TOKEN.lastIndex = 0;
  while (TOKEN.lastIndex < e.length) {
    const start = TOKEN.lastIndex;
    const m = TOKEN.exec(e);
    if (!m) {
      if (/^\s*$/.test(e.slice(start))) break;
      throw new Error(`выражение «${e}»: непонятный символ на позиции ${start}`);
    }
    if (m[1] !== undefined) tokens.push(Number(m[1]));
    else if (m[2] !== undefined) {
      const v = vars[m[2]];
      if (v === undefined) throw new Error(`выражение «${e}»: нет числового параметра $${m[2]}`);
      tokens.push(v);
    } else tokens.push(m[3]!);
  }
  let i = 0;
  const fail = (msg: string): never => {
    throw new Error(`выражение «${e}»: ${msg}`);
  };
  const atom = (): number => {
    const t = tokens[i++];
    if (typeof t === 'number') return t;
    if (t === '-') return -atom();
    if (t === '+') return atom();
    if (t === '(') {
      const v = sum();
      if (tokens[i++] !== ')') fail('нет закрывающей скобки');
      return v;
    }
    return fail(t === undefined ? 'неожиданный конец' : `неожиданное «${t}»`);
  };
  const product = (): number => {
    let v = atom();
    while (tokens[i] === '*' || tokens[i] === '/' || tokens[i] === '%') {
      const op = tokens[i++];
      const b = atom();
      v = op === '*' ? v * b : op === '/' ? v / b : ((v % b) + b) % b;
    }
    return v;
  };
  const sum = (): number => {
    let v = product();
    while (tokens[i] === '+' || tokens[i] === '-') v = tokens[i++] === '+' ? v + product() : v - product();
    return v;
  };
  const v = sum();
  if (i !== tokens.length) fail(`лишнее «${tokens[i]}»`);
  if (!Number.isFinite(v)) fail('результат не конечен');
  return v;
}

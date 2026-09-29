// MathJSON (from MathLive / Compute Engine) -> sympy syntax, the answer format of the checkers.
// sympy's own LaTeX parser is deliberately not used (docs/design.md, «Проверка выражений»).

export class ConvertError extends Error {}

type Json = number | string | { num: string } | { sym: string } | { str: string } | Json[];

const CONSTANTS: Record<string, string> = {
  ExponentialE: 'E',
  Pi: 'pi',
  ImaginaryUnit: 'I',
  PositiveInfinity: 'oo',
  NegativeInfinity: '(-oo)',
  ComplexInfinity: 'zoo',
  Half: '(1/2)',
};

const FUNCTIONS: Record<string, string> = {
  Sqrt: 'sqrt', Exp: 'exp', Ln: 'log', Abs: 'Abs', Factorial: 'factorial',
  Sin: 'sin', Cos: 'cos', Tan: 'tan', Cot: 'cot', Sec: 'sec', Csc: 'csc',
  Arcsin: 'asin', Arccos: 'acos', Arctan: 'atan', Arccot: 'acot',
  Sinh: 'sinh', Cosh: 'cosh', Tanh: 'tanh', Floor: 'floor', Ceil: 'ceiling',
};

const IDENT = /^[A-Za-z][A-Za-z0-9_]*$/;

function num(v: number | string): string {
  const s = String(v);
  if (!/^-?\d+(\.\d+)?(e[+-]?\d+)?$/i.test(s)) throw new ConvertError(`непонятное число ${s}`);
  return s.startsWith('-') ? `(${s})` : s;
}

function symbol(name: string): string {
  if (name in CONSTANTS) return CONSTANTS[name]!;
  if (name === 'Nothing') throw new ConvertError('пустой ответ');
  if (!IDENT.test(name)) throw new ConvertError(`непонятный символ «${name}»`);
  return name;
}

export function mathJsonToSympy(json: Json): string {
  if (typeof json === 'number') {
    if (!Number.isFinite(json)) throw new ConvertError('непонятное число');
    return num(json);
  }
  if (typeof json === 'string') return symbol(json);
  if (!Array.isArray(json)) {
    if ('num' in json) return num(json.num.replace(/\.\.\.$/, ''));
    if ('sym' in json) return symbol(json.sym);
    throw new ConvertError('текст вместо формулы');
  }
  const [head, ...args] = json;
  if (typeof head !== 'string') throw new ConvertError('непонятная запись');
  if (head === 'Error') throw new ConvertError('в записи ошибка: проверь скобки и дроби');
  const a = args.map((x) => mathJsonToSympy(x));
  const need = (n: number) => {
    if (a.length !== n) throw new ConvertError(`у ${head} должно быть ${n} аргумента`);
  };
  switch (head) {
    case 'Add':
      return `(${a.join(' + ')})`;
    case 'Subtract':
      need(2);
      return `(${a[0]} - ${a[1]})`;
    case 'Negate':
      need(1);
      return `(-${a[0]})`;
    case 'Multiply':
      return `(${a.join('*')})`;
    case 'Divide':
    case 'Rational':
      need(2);
      return `(${a[0]}/${a[1]})`;
    case 'Power':
      need(2);
      return `(${a[0]}**${a[1]})`;
    case 'Square':
      need(1);
      return `(${a[0]}**2)`;
    case 'Root':
      need(2);
      return `real_root(${a[0]}, ${a[1]})`;
    case 'Log':
      if (a.length === 1) return `log(${a[0]}, 10)`;
      need(2);
      return `log(${a[0]}, ${a[1]})`;
    case 'Lg':
      need(1);
      return `log(${a[0]}, 10)`;
    case 'Lb':
      need(1);
      return `log(${a[0]}, 2)`;
    case 'Binomial':
      need(2);
      return `binomial(${a[0]}, ${a[1]})`;
    case 'Delimiter':
      return `(${a[0] ?? ''})`;
    default:
      if (head in FUNCTIONS) {
        need(1);
        return `${FUNCTIONS[head]}(${a[0]})`;
      }
      throw new ConvertError(head === 'Tuple' || head === 'Sequence' ? 'лишняя запятая' : `не знаю операцию ${head}`);
  }
}

/** Russian decimal comma: 3,5 -> 3.5 (MathLive emits it as `3{,}5` or `3,5`). */
export function normalizeLatex(latex: string): string {
  return latex.replace(/(\d)\s*(?:\{,\}|,)\s*(?=\d)/g, '$1.');
}

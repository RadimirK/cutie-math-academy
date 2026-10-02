import sympy

x = sympy.Symbol('x')


def generate(rng):
    if rng.random() < 0.5:
        a = [[rng.randint(-4, 4) for _ in range(3)] for _ in range(2)]
        names = 'xyz'

        def row(r):
            return sympy.latex(sum(c * sympy.Symbol(v) for c, v in zip(r, names)))

        return {
            'statement': (
                f'Найдите матрицу отображения $L\\colon \\mathbb{{R}}^3 \\to \\mathbb{{R}}^2$, '
                f'$L(x, y, z) = ({row(a[0])},\\ {row(a[1])})$, в стандартных базисах.'
            ),
            'answer': a,
        }
    n = rng.randint(2, 3)
    shift = rng.randint(2, 4)
    # T(p) = p'(x) + shift * p(x) on polynomials of degree <= n, basis 1, x, ..., x^n
    cols = []
    for j in range(n + 1):
        img = sympy.expand(sympy.diff(x ** j, x) + shift * x ** j)
        cols.append([img.coeff(x, i) for i in range(n + 1)])
    m = [[cols[j][i] for j in range(n + 1)] for i in range(n + 1)]
    basis = ', '.join(['1', 'x'] + [f'x^{k}' for k in range(2, n + 1)])
    return {
        'statement': (
            f'На пространстве многочленов степени не выше ${n}$ задан оператор $T(p) = p\' + {shift}p$. '
            f'Найдите его матрицу в базисе ${basis}$.'
        ),
        'answer': m,
    }

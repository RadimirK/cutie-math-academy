import sympy

I = sympy.I


def generate(rng):
    pyth = [(3, 4), (4, 3), (5, 12), (12, 5), (6, 8), (8, 6), (1, 1), (2, 1), (1, 2), (1, 3)]
    (a, b), (c, d) = rng.sample(pyth, 2)
    sa, sc = rng.choice([1, -1]), rng.choice([1, -1])
    z, w = sa * a + b * I, c + sc * d * I
    k = rng.randint(1, 3)
    expr = f'({sympy.latex(z)})({sympy.latex(w)})' + (f'^{{{k}}}' if k > 1 else '')
    return {
        'statement': f'Найдите $\\left|{expr}\\right|$.',
        'answer': sympy.simplify(sympy.Abs(z) * sympy.Abs(w) ** k),
    }

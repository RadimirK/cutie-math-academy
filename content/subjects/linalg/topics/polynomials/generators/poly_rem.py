import sympy

x = sympy.Symbol('x')


def generate(rng):
    f = sum(rng.randint(-4, 4) * x ** k for k in range(4)) + rng.choice([1, 2, -1]) * x ** 4
    g = x ** 2 + rng.randint(-3, 3) * x + rng.choice([-3, -2, -1, 1, 2, 3])
    r = sympy.rem(f, g, x)
    return {
        'statement': (
            f'Найдите остаток от деления $f(x) = {sympy.latex(sympy.expand(f))}$ '
            f'на $g(x) = {sympy.latex(g)}$ над $\\mathbb{{Q}}$.'
        ),
        'answer': sympy.expand(r),
        'config': {'variables': ['x']},
    }

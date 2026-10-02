import sympy
from sympy import Matrix

from cutemath.tex import matrix_tex

x = sympy.Symbol('x')


def generate(rng):
    n = rng.choice([2, 2, 3])
    a = Matrix(n, n, lambda i, j: rng.randint(-3, 3) if (i <= j or rng.random() < 0.4) else 0)
    return {
        'statement': f'Найдите характеристический многочлен $\\chi_A(x) = \\det(xE - A)$ для $$A = {matrix_tex(a)}.$$',
        'answer': sympy.expand((x * sympy.eye(n) - a).det()),
        'config': {'variables': ['x']},
    }

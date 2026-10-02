import sympy
from sympy import Matrix


def generate(rng):
    while True:
        a = Matrix(2, 2, lambda i, j: rng.randint(-6, 6))
        if a.det() != 0 and abs(a.det()) <= 60:
            break
    s, t = sympy.symbols('a b')
    rel = ',\\ '.join(f'{sympy.latex(a[0, j] * s + a[1, j] * t)} = 0' for j in range(2))
    return {
        'statement': (
            f'Абелева группа задана образующими $a, b$ и соотношениями ${rel}$. '
            'Сколько в ней элементов?'
        ),
        'answer': abs(a.det()),
    }

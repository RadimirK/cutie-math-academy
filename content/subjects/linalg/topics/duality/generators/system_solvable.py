import sympy
from sympy import Matrix


def generate(rng):
    while True:
        a = Matrix(3, 2, lambda i, j: rng.randint(-2, 2)) * Matrix(2, 3, lambda i, j: rng.randint(-2, 2))
        if a.rank() == 2:
            break
    if rng.random() < 0.5:
        b = a * Matrix(3, 1, lambda i, j: rng.randint(-2, 2))
    else:
        b = Matrix(3, 1, lambda i, j: rng.randint(-4, 4))
    xs = sympy.symbols('x y z')
    eqs = ' \\\\ '.join(f'{sympy.latex(sum(a[i, j] * xs[j] for j in range(3)))} = {b[i]}' for i in range(3))
    solvable = a.rank() == a.row_join(b).rank()
    return {
        'statement': f'Совместна ли система $$\\begin{{cases}} {eqs} \\end{{cases}}$$',
        'answer': 'Да' if solvable else 'Нет',
        'config': {'options': ['Да', 'Нет']},
    }

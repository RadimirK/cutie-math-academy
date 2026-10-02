import sympy
from sympy import Matrix


def generate(rng):
    while True:
        a = Matrix(3, 3, lambda i, j: rng.randint(-3, 3))
        if a.det() != 0:
            break
    b = Matrix(3, 1, lambda i, j: rng.randint(-5, 5))
    xs = sympy.symbols('x y z')
    eqs = ' \\\\ '.join(f'{sympy.latex(sum(a[i, j] * xs[j] for j in range(3)))} = {b[i]}' for i in range(3))
    k = rng.randrange(3)
    sol = a.LUsolve(b)
    return {
        'statement': f'Решите систему $$\\begin{{cases}} {eqs} \\end{{cases}}$$ В ответе укажите ${sympy.latex(xs[k])}$.',
        'answer': sympy.nsimplify(sol[k]),
    }

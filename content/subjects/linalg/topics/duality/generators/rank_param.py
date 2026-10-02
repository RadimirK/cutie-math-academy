import sympy
from sympy import Matrix


def generate(rng):
    x, y = sympy.symbols('x y')
    p, q = rng.choice([1, 2, 3, -1, -2]), rng.choice([1, 2, 3, -1, -3])
    k = rng.choice([2, 3, -2, -1, 4])
    r = rng.randint(-5, 5)
    c = sympy.Symbol('c')
    return {
        'statement': (
            f'При каком $c$ система $$\\begin{{cases}} {sympy.latex(p * x + q * y)} = {r} \\\\ '
            f'{sympy.latex(k * p * x + k * q * y)} = c \\end{{cases}}$$ совместна?'
        ),
        'answer': k * r,
    }

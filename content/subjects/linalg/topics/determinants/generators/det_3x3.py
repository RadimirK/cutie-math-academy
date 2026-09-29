from sympy import Matrix

from cutemath.tex import matrix_tex


def generate(rng):
    m = Matrix(3, 3, lambda i, j: rng.randint(-4, 4))
    return {
        'statement': f'Вычислите определитель\n$$\\det {matrix_tex(m)}$$',
        'answer': str(m.det()),
    }

from sympy import Matrix

from cutemath.tex import matrix_tex


def generate(rng):
    a = Matrix(2, 2, lambda i, j: rng.randint(-4, 4))
    p, q = a.trace(), -a.det()
    which = rng.choice(['p', 'q'])
    return {
        'statement': f'Для $A = {matrix_tex(a)}$ найдите числа $p, q$, такие что $A^2 = pA + qE$. В ответе укажите ${which}$.',
        'answer': p if which == 'p' else q,
    }

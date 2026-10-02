from math import gcd

from sympy import Matrix

from cutemath.tex import matrix_tex


def generate(rng):
    while True:
        a = Matrix(2, 2, lambda i, j: rng.randint(-12, 12))
        det = abs(a.det())
        if det:
            break
    d1 = 0
    for t in a:
        d1 = gcd(d1, int(t))
    d2 = det // d1
    if rng.random() < 0.5:
        return {
            'statement': f'Нормальная форма Смита матрицы $${matrix_tex(a)}$$ над $\\mathbb{{Z}}$ — $\\operatorname{{diag}}(d_1, d_2)$, $d_1 \\mid d_2$, $d_i > 0$. Найдите $d_2$.',
            'answer': d2,
        }
    return {
        'statement': f'Нормальная форма Смита матрицы $${matrix_tex(a)}$$ над $\\mathbb{{Z}}$ — $\\operatorname{{diag}}(d_1, d_2)$, $d_1 \\mid d_2$, $d_i > 0$. Найдите $d_1$.',
        'answer': d1,
    }

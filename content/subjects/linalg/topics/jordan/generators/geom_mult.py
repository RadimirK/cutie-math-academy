from sympy import Matrix, eye, zeros

from cutemath.tex import matrix_tex


def generate(rng):
    lam = rng.randint(-2, 3)
    sizes = rng.choice([[3], [2, 1], [1, 1, 1]])
    j = zeros(3, 3)
    pos = 0
    for s in sizes:
        for i in range(s):
            j[pos + i, pos + i] = lam
            if i + 1 < s:
                j[pos + i, pos + i + 1] = 1
        pos += s
    while True:
        c = Matrix(3, 3, lambda r, s: rng.randint(-1, 1)) + eye(3)
        if abs(c.det()) == 1:
            break
    a = c * j * c.inv()
    return {
        'statement': (
            f'Единственное собственное значение матрицы $$A = {matrix_tex(a)}$$ равно ${lam}$. '
            'Сколько клеток в её жордановой форме?'
        ),
        'answer': 3 - (a - lam * eye(3)).rank(),
    }

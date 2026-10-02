from sympy import Matrix

from cutemath.tex import matrix_tex


def generate(rng):
    m, n = rng.randint(2, 3), rng.randint(3, 5)
    r = rng.randint(1, m)
    a = Matrix(m, r, lambda i, j: rng.randint(-2, 2)) * Matrix(r, n, lambda i, j: rng.randint(-2, 2))
    return {
        'statement': (
            f'Линейное отображение $L\\colon \\mathbb{{R}}^{n} \\to \\mathbb{{R}}^{m}$ задано матрицей '
            f'$${matrix_tex(a)}$$ Найдите $\\dim \\ker L$.'
        ),
        'answer': n - a.rank(),
    }

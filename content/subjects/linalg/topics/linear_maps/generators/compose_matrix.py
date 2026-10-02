from sympy import Matrix

from cutemath.tex import matrix_tex


def generate(rng):
    L = Matrix(3, 2, lambda i, j: rng.randint(-3, 3))
    T = Matrix(2, 3, lambda i, j: rng.randint(-3, 3))
    return {
        'statement': (
            f'$L\\colon \\mathbb{{R}}^2 \\to \\mathbb{{R}}^3$ и $T\\colon \\mathbb{{R}}^3 \\to \\mathbb{{R}}^2$ имеют матрицы '
            f'$$[L] = {matrix_tex(L)}, \\qquad [T] = {matrix_tex(T)}.$$ Найдите матрицу $T \\circ L$.'
        ),
        'answer': (T * L).tolist(),
    }

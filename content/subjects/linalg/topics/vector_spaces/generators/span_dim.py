from sympy import Matrix

from cutemath.tex import matrix_tex


def generate(rng):
    r = rng.randint(1, 3)
    basis = Matrix(r, 4, lambda i, j: rng.randint(-2, 2))
    k = rng.randint(r + 1, 4)
    coef = Matrix(k, r, lambda i, j: rng.randint(-2, 2))
    vs = coef * basis
    vecs = ', '.join('(' + ', '.join(str(vs[i, j]) for j in range(4)) + ')' for i in range(k))
    return {
        'statement': f'Найдите размерность линейной оболочки векторов ${vecs}$ в $\\mathbb{{Q}}^4$.',
        'answer': vs.rank(),
    }

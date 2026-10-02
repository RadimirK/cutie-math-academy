from sympy import Matrix


def _vecs(m):
    return ', '.join('(' + ', '.join(str(m[i, j]) for j in range(m.cols)) + ')' for i in range(m.rows))


def generate(rng):
    while True:
        du, dw = rng.randint(2, 3), rng.randint(2, 3)
        k = rng.randint(0, min(du, dw) - 1)
        c = Matrix(k, 4, lambda i, j: rng.randint(-2, 2))
        u = Matrix.vstack(c, Matrix(du - k, 4, lambda i, j: rng.randint(-2, 2)))
        w = Matrix.vstack(c, Matrix(dw - k, 4, lambda i, j: rng.randint(-2, 2)))
        if u.rank() == du and w.rank() == dw:
            break
    du, dw = u.rank(), w.rank()
    ans = du + dw - Matrix.vstack(u, w).rank()
    return {
        'statement': (
            f'$U = \\langle {_vecs(u)} \\rangle$, $W = \\langle {_vecs(w)} \\rangle$ — подпространства $\\mathbb{{Q}}^4$. '
            'Найдите $\\dim(U \\cap W)$.'
        ),
        'answer': ans,
    }

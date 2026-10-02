from sympy import Matrix


def generate(rng):
    n = rng.randint(3, 5)
    r = rng.randint(1, n - 1)
    k = rng.randint(r, r + 1)
    vs = Matrix(k, r, lambda i, j: rng.randint(-2, 2)) * Matrix(r, n, lambda i, j: rng.randint(-2, 2))
    vecs = ', '.join('(' + ', '.join(str(vs[i, j]) for j in range(n)) + ')' for i in range(k))
    return {
        'statement': (
            f'$W = \\langle {vecs} \\rangle \\subseteq \\mathbb{{R}}^{n}$. '
            f'Найдите размерность аннулятора $\\operatorname{{Ann}} W \\subseteq (\\mathbb{{R}}^{n})^*$.'
        ),
        'answer': n - vs.rank(),
    }

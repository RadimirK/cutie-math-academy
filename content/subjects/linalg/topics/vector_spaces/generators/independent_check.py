from sympy import Matrix


def generate(rng):
    if rng.random() < 0.5:
        m = Matrix(3, 3, lambda i, j: rng.randint(-3, 3))
    else:
        u = Matrix(1, 3, lambda i, j: rng.randint(-3, 3))
        v = Matrix(1, 3, lambda i, j: rng.randint(-3, 3))
        a, b = rng.choice([-2, -1, 1, 2]), rng.choice([-2, -1, 1, 2])
        rows = [u, v, a * u + b * v]
        rng.shuffle(rows)
        m = Matrix.vstack(*rows)
    vecs = ', '.join('(' + ', '.join(str(m[i, j]) for j in range(3)) + ')' for i in range(3))
    return {
        'statement': f'Линейно независимы ли векторы ${vecs}$ в $\\mathbb{{Q}}^3$?',
        'answer': 'Да' if m.det() != 0 else 'Нет',
        'config': {'options': ['Да', 'Нет']},
    }

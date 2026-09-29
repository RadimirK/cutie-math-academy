# Целочисленная матрица 2×2 или 3×3 с определителем ±1, поэтому обратная тоже целая.
from sympy import eye

from cutemath.tex import matrix_tex


def generate(rng):
    n = rng.choice([2, 3])
    lower, upper = eye(n), eye(n)
    for i in range(n):
        for j in range(i):
            lower[i, j] = rng.randint(-2, 2)
            upper[j, i] = rng.randint(-2, 2)
    m = upper * lower
    if rng.random() < 0.5:
        m[0, :] *= -1
    return {
        'statement': f'Найдите обратную матрицу к\n$$A = {matrix_tex(m)}$$',
        'answer': m.inv().tolist(),
    }

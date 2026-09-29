# Матрица с определителем ±1: произведение нижне- и верхнетреугольной матриц с единицами
# на диагонали, умноженное на ±1 в одной строке. Элементы получаются большими, но
# определитель легко считается методом Гаусса.
from sympy import Matrix, eye

from cutemath.tex import matrix_tex


def generate(rng):
    n = 3
    lower, upper = eye(n), eye(n)
    for i in range(n):
        for j in range(i):
            lower[i, j] = rng.randint(-3, 3)
            upper[j, i] = rng.randint(-3, 3)
    sign = rng.choice([1, -1])
    m = lower * upper
    m[rng.randrange(n), :] *= sign
    return {
        'statement': f'Вычислите определитель\n$$\\det {matrix_tex(m)}$$',
        'answer': str(m.det()),
    }

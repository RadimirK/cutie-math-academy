from sympy import Matrix

from cutemath.tex import matrix_tex


def generate(rng):
    a = Matrix(2, 2, lambda i, j: rng.randint(-3, 3))
    t = rng.choice([-2, -1, 1, 2])
    c = Matrix([[1, t], [0, 1]]) * Matrix([[1, 0], [rng.choice([-1, 1, 2]), 1]])
    e1 = f'({c[0, 0]}, {c[1, 0]})'
    e2 = f'({c[0, 1]}, {c[1, 1]})'
    return {
        'statement': (
            f'Оператор на $\\mathbb{{R}}^2$ имеет в стандартном базисе матрицу $A = {matrix_tex(a)}$. '
            f"Найдите его матрицу в базисе $e_1' = {e1}$, $e_2' = {e2}$."
        ),
        'answer': (c.inv() * a * c).tolist(),
    }

from sympy import Matrix

from cutemath.tex import matrix_tex


def generate(rng):
    a = Matrix(3, 3, lambda i, j: rng.randint(-2, 3))
    return {
        'statement': f'Найдите присоединённую матрицу $A^\\vee$ для $$A = {matrix_tex(a)}.$$',
        'answer': a.adjugate().tolist(),
    }

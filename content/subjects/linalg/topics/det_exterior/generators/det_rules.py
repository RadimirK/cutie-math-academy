import sympy


def generate(rng):
    n = rng.randint(2, 5)
    a = rng.choice([-3, -2, -1, 2, 3, 4, 5])
    b = rng.choice([-2, -1, 2, 3])
    k = rng.choice([-2, -1, 2, 3])
    m = rng.randint(2, 4)
    kinds = [
        (f'\\det({k}A)', k ** n * a),
        (f'\\det(AB)', a * b),
        (f'\\det(A^{{-1}})', sympy.Rational(1, a)),
        (f'\\det(A^{m})', a ** m),
        (f'\\det(A^T B^2)', a * b * b),
        (f'\\det({k}A^{{-1}} B)', sympy.Rational(k ** n * b, a)),
    ]
    what, ans = rng.choice(kinds)
    return {
        'statement': f'$A$ и $B$ — матрицы ${n} \\times {n}$, $\\det A = {a}$, $\\det B = {b}$. Найдите ${what}$.',
        'answer': ans,
    }

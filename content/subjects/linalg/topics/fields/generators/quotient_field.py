import sympy

x = sympy.Symbol('x')


def generate(rng):
    p = rng.choice([2, 3, 5])
    deg = rng.choice([2, 3])
    coeffs = [1] + [rng.randrange(p) for _ in range(deg)]
    if coeffs[-1] == 0:
        coeffs[-1] = 1
    f = sum(c * x ** (deg - i) for i, c in enumerate(coeffs))
    has_root = any(f.subs(x, t) % p == 0 for t in range(p))
    return {
        'statement': f'Является ли кольцо $(\\mathbb{{Z}}/{p}\\mathbb{{Z}})[x] / ({sympy.latex(f)})$ полем?',
        'answer': 'Нет' if has_root else 'Да',
        'config': {'options': ['Да', 'Нет']},
    }

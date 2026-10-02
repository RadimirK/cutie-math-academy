from math import gcd


def generate(rng):
    a, b = rng.randint(4, 60), rng.randint(4, 60)
    kind = rng.randrange(3)
    if kind == 0:
        expr, d = f'({a}) + ({b})', gcd(a, b)
    elif kind == 1:
        expr, d = f'({a}) \\cap ({b})', a * b // gcd(a, b)
    else:
        expr, d = f'({a}) \\cdot ({b})', a * b
    return {
        'statement': f'В кольце $\\mathbb{{Z}}$ идеал ${expr}$ равен $(d)$ для некоторого $d > 0$. Найдите $d$.',
        'answer': d,
    }

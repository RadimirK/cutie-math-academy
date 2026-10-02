from math import gcd


def generate(rng):
    d = rng.randint(1, 12)
    while True:
        p, q, r = (rng.randint(2, 40) for _ in range(3))
        if gcd(gcd(p, q), r) == 1 and gcd(p, q) > 1:
            break
    a, b, c = d * p, d * q, d * r
    return {
        'statement': (
            f'Идеал $({a}, {b}, {c}) = \\{{{a}x + {b}y + {c}z \\mid x, y, z \\in \\mathbb{{Z}}\\}}$ '
            'в $\\mathbb{Z}$ главный: он равен $(d)$ для некоторого $d > 0$. Найдите $d$.'
        ),
        'answer': d,
    }

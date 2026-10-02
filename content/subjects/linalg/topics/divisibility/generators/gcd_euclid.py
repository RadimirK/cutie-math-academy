from math import gcd


def generate(rng):
    d = rng.randint(2, 40)
    while True:
        p, q = rng.randint(5, 80), rng.randint(5, 80)
        if p != q and gcd(p, q) == 1:
            break
    a, b = d * p, d * q
    return {'statement': f'Найдите $\\gcd({a}, {b})$.', 'answer': gcd(a, b)}

from math import gcd


def generate(rng):
    while True:
        a, b = rng.randint(20, 300), rng.randint(20, 300)
        d = gcd(a, b)
        if a != b and b // d > 2:
            break
    x = next(x for x in range(1, b + 1) if (d - a * x) % b == 0)
    return {
        'statement': (
            f'$d = \\gcd({a}, {b})$. Найдите наименьшее натуральное $x$, '
            f'для которого найдётся целое $y$ с ${a}x + {b}y = d$.'
        ),
        'answer': x,
    }

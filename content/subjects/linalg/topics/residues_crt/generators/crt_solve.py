from math import gcd


def generate(rng):
    while True:
        m, n = rng.randint(3, 25), rng.randint(3, 25)
        if m != n and gcd(m, n) == 1:
            break
    r, s = rng.randrange(m), rng.randrange(n)
    x = next(x for x in range(m * n) if x % m == r and x % n == s)
    return {
        'statement': (
            f'Найдите наименьшее неотрицательное $x$, такое что '
            f'$x \\equiv {r} \\pmod{{{m}}}$ и $x \\equiv {s} \\pmod{{{n}}}$.'
        ),
        'answer': x,
    }

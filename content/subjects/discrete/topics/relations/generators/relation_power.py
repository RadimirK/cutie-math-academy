from itertools import product


def pairs_tex(r):
    return '\\{' + ', '.join(f'\\langle {a}, {b} \\rangle' for a, b in sorted(r)) + '\\}'


def compose(r, s):
    return {(a, b) for (a, c) in r for (c2, b) in s if c == c2}


def generate(rng):
    base = list(product(range(1, 6), repeat=2))
    r = set(rng.sample(base, rng.randint(5, 8)))
    k = rng.choice([2, 2, 3])
    power = r
    for _ in range(k - 1):
        power = compose(power, r)
    return {
        'statement': f'На $\\{{1, 2, 3, 4, 5\\}}$ задано отношение $$R = {pairs_tex(r)}.$$ Сколько пар в отношении $R^{k}$?',
        'answer': len(power),
    }

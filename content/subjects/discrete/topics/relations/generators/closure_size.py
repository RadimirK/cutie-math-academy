from itertools import product


def pairs_tex(r):
    return '\\{' + ', '.join(f'\\langle {a}, {b} \\rangle' for a, b in sorted(r)) + '\\}'


def closure(r, elems):
    c = set(r)
    for k in elems:  # Floyd–Warshall
        for i in elems:
            for j in elems:
                if (i, k) in c and (k, j) in c:
                    c.add((i, j))
    return c


def generate(rng):
    elems = range(1, 6)
    r = set(rng.sample(list(product(elems, repeat=2)), rng.randint(4, 6)))
    star = rng.random() < 0.3
    c = closure(r, elems)
    if star:
        c |= {(x, x) for x in elems}
    name = 'R^*' if star else 'R^+'
    return {
        'statement': f'На $\\{{1, 2, 3, 4, 5\\}}$ задано отношение $$R = {pairs_tex(r)}.$$ Сколько пар в ${name}$?',
        'answer': len(c),
    }

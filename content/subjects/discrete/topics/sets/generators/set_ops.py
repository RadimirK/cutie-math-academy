OPS = [
    ('\\cup', lambda a, b: a | b),
    ('\\cap', lambda a, b: a & b),
    ('\\setminus', lambda a, b: a - b),
    ('\\oplus', lambda a, b: a ^ b),
]


def set_tex(s):
    return '\\{' + ', '.join(str(x) for x in sorted(s)) + '\\}'


def generate(rng):
    universe = list(range(1, 13))
    a = set(rng.sample(universe, rng.randint(4, 7)))
    b = set(rng.sample(universe, rng.randint(4, 7)))
    op, fn = rng.choice(OPS)
    return {
        'statement': (
            f'Пусть $A = {set_tex(a)}$ и $B = {set_tex(b)}$.\n'
            f'Сколько элементов в множестве $A {op} B$?'
        ),
        'answer': len(fn(a, b)),
    }

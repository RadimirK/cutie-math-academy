# Each expression: (LaTeX, function of three sets).
EXPRS = [
    ('(A \\cup B) \\setminus C', lambda a, b, c: (a | b) - c),
    ('A \\cap (B \\cup C)', lambda a, b, c: a & (b | c)),
    ('(A \\setminus B) \\cup (B \\setminus C)', lambda a, b, c: (a - b) | (b - c)),
    ('A \\oplus B \\oplus C', lambda a, b, c: a ^ b ^ c),
    ('(A \\cap B) \\oplus C', lambda a, b, c: (a & b) ^ c),
    ('A \\setminus (B \\setminus C)', lambda a, b, c: a - (b - c)),
    ('(A \\oplus B) \\cap C', lambda a, b, c: (a ^ b) & c),
]


def set_tex(s):
    return '\\{' + ', '.join(str(x) for x in sorted(s)) + '\\}'


def generate(rng):
    universe = list(range(1, 13))
    a, b, c = (set(rng.sample(universe, rng.randint(4, 7))) for _ in range(3))
    tex, fn = rng.choice(EXPRS)
    return {
        'statement': (
            f'Пусть $A = {set_tex(a)}$, $B = {set_tex(b)}$, $C = {set_tex(c)}$.\n'
            f'Сколько элементов в множестве $${tex}$$'
        ),
        'answer': len(fn(a, b, c)),
    }

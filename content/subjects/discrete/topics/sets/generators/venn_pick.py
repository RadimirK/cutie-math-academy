from itertools import product

# (LaTeX, membership of a region in the set, given its membership in A, B, C).
EXPRS = [
    ('A \\cup B', lambda a, b, c: a or b),
    ('A \\cap B', lambda a, b, c: a and b),
    ('A \\setminus B', lambda a, b, c: a and not b),
    ('A \\oplus B', lambda a, b, c: a != b),
    ('A \\cap B \\cap C', lambda a, b, c: a and b and c),
    ('A \\oplus B \\oplus C', lambda a, b, c: a ^ b ^ c),
    ('(A \\cup B) \\setminus C', lambda a, b, c: (a or b) and not c),
    ('A \\cap (B \\cup C)', lambda a, b, c: a and (b or c)),
    ('(A \\cap B) \\cup C', lambda a, b, c: (a and b) or c),
    ('(A \\cup B) \\cap C', lambda a, b, c: (a or b) and c),
    ('A \\setminus (B \\cup C)', lambda a, b, c: a and not (b or c)),
    ('(A \\cap B) \\setminus C', lambda a, b, c: a and b and not c),
    ('(A \\oplus B) \\cap C', lambda a, b, c: (a != b) and c),
    ('(A \\cap B) \\oplus C', lambda a, b, c: (a and b) != c),
    ('A \\setminus (B \\setminus C)', lambda a, b, c: a and not (b and not c)),
    ('(A \\setminus B) \\cup (B \\setminus C)', lambda a, b, c: (a and not b) or (b and not c)),
    ('\\overline{A \\cup B \\cup C}', lambda a, b, c: not (a or b or c)),
    ('\\overline{A} \\cap (B \\cup C)', lambda a, b, c: not a and (b or c)),
    ('C \\setminus (A \\cap B)', lambda a, b, c: c and not (a and b)),
    ('(A \\oplus B) \\setminus C', lambda a, b, c: (a != b) and not c),
]


def region(a, b, c):
    return ''.join(name for name, x in zip('ABC', (a, b, c)) if x) or '0'


def shaded(fn):
    return sorted(region(*m) for m in product((0, 1), repeat=3) if fn(*m))


# Every option must shade its own picture, or two options would both be right.
assert len({tuple(shaded(fn)) for _, fn in EXPRS}) == len(EXPRS)


def generate(rng):
    tex, fn = rng.choice(EXPRS)
    return {
        'statement': 'Какое множество закрашено на диаграмме?',
        'answer': f'${tex}$',
        'config': {'distractors': [f'${t}$' for t, _ in EXPRS if t != tex], 'count': 8},
        'figure': {'type': 'venn', 'sets': ['A', 'B', 'C'], 'shade': shaded(fn)},
    }

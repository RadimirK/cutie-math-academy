KINDS = [
    ('отношений', lambda n: n * n),
    ('рефлексивных отношений', lambda n: n * n - n),
    ('антирефлексивных отношений', lambda n: n * n - n),
    ('симметричных отношений', lambda n: n * (n + 1) // 2),
    ('рефлексивных и симметричных отношений', lambda n: n * (n - 1) // 2),
]


def generate(rng):
    n = rng.randint(2, 5)
    what, free_pairs = rng.choice(KINDS)
    return {
        'statement': f'Сколько существует {what} на множестве из ${n}$ элементов?',
        'answer': 2 ** free_pairs(n),
    }

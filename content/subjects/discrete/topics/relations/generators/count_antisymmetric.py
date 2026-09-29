def generate(rng):
    n = rng.randint(2, 5)
    reflexive = rng.random() < 0.5
    what = 'рефлексивных антисимметричных' if reflexive else 'антисимметричных'
    # Each unordered pair {x, y}, x != y: none, only <x, y>, or only <y, x>.
    answer = 3 ** (n * (n - 1) // 2) * (1 if reflexive else 2 ** n)
    return {
        'statement': f'Сколько существует {what} отношений на множестве из ${n}$ элементов?',
        'answer': answer,
    }

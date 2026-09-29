def generate(rng):
    kind = rng.randrange(4)
    if kind == 0:
        n, m = rng.randint(2, 9), rng.randint(2, 9)
        return {'statement': f'Пусть $|A| = {n}$, $|B| = {m}$. Сколько элементов в $A \\times B$?', 'answer': n * m}
    if kind == 1:
        k, n = rng.randint(2, 5), rng.randint(2, 4)
        return {'statement': f'Пусть $|A| = {k}$. Сколько элементов в $A^{{{n}}}$?', 'answer': k ** n}
    if kind == 2:
        k = rng.randint(2, 9)
        return {'statement': f'Пусть $|A| = {k}$. Сколько элементов в $A^0$?', 'answer': 1}
    n, m = rng.randint(2, 4), rng.randint(1, 3)
    return {
        'statement': f'Пусть $|A| = {n}$, $|B| = {m}$. Сколько элементов в $A \\times 2^B$?',
        'answer': n * 2 ** m,
    }

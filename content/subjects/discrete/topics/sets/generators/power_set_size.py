def generate(rng):
    kind = rng.randrange(4)
    if kind == 0:
        n = rng.randint(3, 10)
        return {'statement': f'Пусть $|A| = {n}$. Сколько элементов в $2^A$?', 'answer': 2 ** n}
    if kind == 1:
        n, m = rng.randint(2, 4), rng.randint(2, 3)
        return {
            'statement': f'Пусть $|A| = {n}$, $|B| = {m}$. Сколько элементов в $2^{{A \\times B}}$?',
            'answer': 2 ** (n * m),
        }
    if kind == 2:
        n = rng.randint(1, 3)
        return {'statement': f'Пусть $|A| = {n}$. Сколько элементов в $2^{{2^A}}$?', 'answer': 2 ** (2 ** n)}
    n = rng.randint(3, 9)
    return {
        'statement': (
            f'Пусть $A = \\{{1, 2, \\ldots, {n}\\}}$. Сколько существует подмножеств $S \\subseteq A$, '
            'таких что $1 \\in S$?'
        ),
        'answer': 2 ** (n - 1),
    }

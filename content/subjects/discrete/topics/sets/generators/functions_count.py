from math import factorial


def generate(rng):
    kind = rng.randrange(4)
    if kind == 0:
        m, n = rng.randint(2, 5), rng.randint(2, 4)
        return {
            'statement': f'Пусть $|X| = {m}$, $|Y| = {n}$. Сколько существует функций $f \\colon X \\to Y$?',
            'answer': n ** m,
        }
    if kind == 1:
        m = rng.randint(2, 4)
        n = rng.randint(m, 6)
        return {
            'statement': f'Пусть $|X| = {m}$, $|Y| = {n}$. Сколько существует инъекций $f \\colon X \\to Y$?',
            'answer': factorial(n) // factorial(n - m),
        }
    if kind == 2:
        n = rng.randint(3, 6)
        return {
            'statement': f'Пусть $|X| = |Y| = {n}$. Сколько существует биекций $f \\colon X \\to Y$?',
            'answer': factorial(n),
        }
    m, n = rng.randint(2, 5), rng.randint(2, 4)
    return {
        'statement': (
            f'Пусть $X = \\{{x_1, \\ldots, x_{m}\\}}$, $Y = \\{{y_1, \\ldots, y_{n}\\}}$. '
            'Сколько существует функций $f \\colon X \\to Y$, таких что $f(x_1) = y_1$?'
        ),
        'answer': n ** (m - 1),
    }

from cutemath.boolean import is_monotone, vector_str

N = 3
VECTORS = [tuple((m >> (2 ** N - 1 - i)) & 1 for i in range(2 ** N)) for m in range(2 ** 2 ** N)]
MONOTONE = [v for v in VECTORS if is_monotone(v, N) and 0 < sum(v) < 2 ** N]


def generate(rng):
    v = rng.choice(MONOTONE)
    if rng.random() < 0.5:
        # A near miss: one value of a monotone function flipped, so a single edge goes wrong.
        while True:
            i = rng.randrange(2 ** N)
            w = v[:i] + (1 - v[i],) + v[i + 1:]
            if not is_monotone(w, N) and 0 < sum(w) < 2 ** N:
                v = w
                break
    return {
        'statement': 'На диаграмме булева куба закрашены наборы, на которых $f(x, y, z) = 1$. Монотонна ли $f$?',
        'answer': 'Да' if is_monotone(v, N) else 'Нет',
        'config': {'options': ['Да', 'Нет']},
        'figure': {'type': 'cube', 'values': vector_str(v)},
    }

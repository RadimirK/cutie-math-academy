from cutemath.boolean import essential_count, points, random_vector, vector_str


def generate(rng):
    n = rng.choice([3, 3, 4])
    k = rng.randint(1, n)
    keep = sorted(rng.sample(range(n), k))
    # A random function of the kept variables that depends on all of them.
    while True:
        g = random_vector(rng, k)
        v = tuple(g[int(''.join(str(p[i]) for i in keep), 2)] for p in points(n))
        if essential_count(v, n) == k:
            break
    args = 'x, y, z' if n == 3 else 'x, y, z, t'
    order = '000, 001, \\ldots, 111' if n == 3 else '0000, 0001, \\ldots, 1111'
    return {
        'statement': (
            f'Функция $f({args})$ задана вектором значений ${vector_str(v)}$ (наборы в порядке ${order}$). '
            'От скольких переменных она зависит существенно?'
        ),
        'answer': k,
    }

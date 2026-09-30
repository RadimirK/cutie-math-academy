def generate(rng):
    a = rng.randint(1, 5)
    n = rng.randint(4, 9)
    if rng.random() < 0.5:
        c = rng.randint(1, 5)
        value = a
        for _ in range(n - 1):
            value = 2 * value + c
        rule = f'T(n) = 2T(n - 1) + {c}'
    else:
        value = a
        for k in range(2, n + 1):
            value = value + k
        rule = 'T(n) = T(n - 1) + n'
    return {
        'statement': f'Последовательность задана так: $T(1) = {a}$, $${rule} \\quad (n \\ge 2).$$ Найдите $T({n})$.',
        'answer': value,
    }

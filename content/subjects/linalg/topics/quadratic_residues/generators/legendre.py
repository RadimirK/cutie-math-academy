def generate(rng):
    p = rng.choice([11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89, 97])
    a = rng.randint(2, p - 1)
    if rng.random() < 0.3:
        a = -rng.randint(1, 10)
    is_square = any((t * t - a) % p == 0 for t in range(1, p))
    return {
        'statement': f'Вычислите символ Лежандра $\\left(\\frac{{{a}}}{{{p}}}\\right)$. Ответ: $1$ или $-1$.',
        'answer': 1 if is_square else -1,
    }

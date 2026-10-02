def _order(a, p):
    return next(d for d in range(1, p) if pow(a, d, p) == 1)


def generate(rng):
    p = rng.choice([7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73])
    orders = [_order(a, p) for a in range(1, p)]
    if rng.random() < 0.5:
        return {
            'statement': f'Сколько образующих у циклической группы $(\\mathbb{{Z}}/{p}\\mathbb{{Z}})^\\times$?',
            'answer': orders.count(p - 1),
        }
    divisors = [d for d in range(2, p - 1) if (p - 1) % d == 0]
    d = rng.choice(divisors)
    return {
        'statement': f'Сколько элементов порядка ${d}$ в группе $(\\mathbb{{Z}}/{p}\\mathbb{{Z}})^\\times$?',
        'answer': orders.count(d),
    }

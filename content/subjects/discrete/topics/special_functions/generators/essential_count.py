from math import comb


def essential(n):
    """Functions of n variables that depend essentially on all of them."""
    e = []
    for m in range(n + 1):
        e.append(2 ** 2 ** m - sum(comb(m, k) * e[k] for k in range(m)))
    return e[n]


def generate(rng):
    if rng.random() < 0.5:
        n = rng.randint(2, 3)
        return {
            'statement': f'Сколько существует булевых функций от ${n}$ переменных, существенно зависящих от всех ${n}$ переменных?',
            'answer': essential(n),
        }
    n = rng.randint(2, 4)
    k = rng.randint(1, min(n - 1, 2))
    return {
        'statement': f'Сколько существует булевых функций от ${n}$ переменных, существенно зависящих ровно от ${k}$ из них?',
        'answer': comb(n, k) * essential(k),
    }

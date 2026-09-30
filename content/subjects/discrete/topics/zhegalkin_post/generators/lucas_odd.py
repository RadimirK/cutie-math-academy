from math import comb


def generate(rng):
    n = rng.randint(10, 300)
    if rng.random() < 0.5:
        return {
            'statement': f'Для скольких $k$ от $0$ до ${n}$ число $\\binom{{{n}}}{{k}}$ нечётно?',
            'answer': 2 ** bin(n).count('1'),
        }
    # Pick k so that the answer is odd about half of the time.
    if rng.random() < 0.5:
        k = n & rng.randrange(n + 1)
    else:
        k = rng.randrange(n + 1)
    return {
        'statement': f'Найдите остаток от деления $\\binom{{{n}}}{{{k}}}$ на $2$.',
        'answer': comb(n, k) % 2,
    }

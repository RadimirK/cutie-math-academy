from math import gcd


def generate(rng):
    n = rng.randint(6, 40)
    return {
        'statement': f'Сколько обратимых элементов в кольце $\\mathbb{{Z}}/{n}\\mathbb{{Z}}$?',
        'answer': sum(1 for x in range(1, n) if gcd(x, n) == 1),
    }

from math import gcd


def generate(rng):
    m, n = rng.randint(2, 20), rng.randint(2, 20)
    return {
        'statement': f'Изоморфна ли группа $\\mathbb{{Z}}/{m} \\oplus \\mathbb{{Z}}/{n}$ циклической группе $\\mathbb{{Z}}/{m * n}$?',
        'answer': 'Да' if gcd(m, n) == 1 else 'Нет',
        'config': {'options': ['Да', 'Нет']},
    }

from math import gcd


def generate(rng):
    n = rng.randint(11, 120)
    while True:
        a = rng.randint(2, n - 1)
        if gcd(a, n) == 1:
            break
    return {
        'statement': f'Найдите $[{a}]^{{-1}}$ в $\\mathbb{{Z}}/{n}\\mathbb{{Z}}$. Ответ — представитель от $1$ до ${n - 1}$.',
        'answer': pow(a, -1, n),
    }
